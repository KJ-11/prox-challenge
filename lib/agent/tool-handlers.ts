import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  loadKnowledge,
  filterRows,
  type StructuredTableName,
} from "../knowledge/loader";
import type { ServerEvent } from "./events";
import {
  LoadChunksInput,
  LoadFiguresInput,
  LookupStructuredInput,
  RenderArtifactInput,
  AskClarificationInput,
} from "./tools";

/**
 * Return shape for a tool handler. Matches what the Anthropic SDK's
 * `toolRunner` expects to receive back from a tool — either a string or an
 * array of content blocks (text/image) to put into the tool_result.
 */
type ToolResultContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | {
          type: "image";
          source: {
            type: "base64";
            media_type: "image/png" | "image/jpeg" | "image/webp";
            data: string;
          };
        }
    >;

type ToolHandler = (input: unknown) => Promise<ToolResultContent>;

/** State shared across all handlers for a single request. */
export interface HandlerContext {
  emit: (event: ServerEvent) => void;
  /**
   * When ask_clarification is called, the loop treats this turn as ended.
   * The handler sets this flag and the loop stops after the current tool's
   * result is delivered back to the model.
   */
  turnEnded: { value: boolean };
}

export function makeHandlerContext(
  emit: (event: ServerEvent) => void,
): HandlerContext {
  return { emit, turnEnded: { value: false } };
}

/* ---------- individual handlers ---------- */

async function handleLoadChunks(input: unknown): Promise<ToolResultContent> {
  const { ids } = LoadChunksInput.parse(input);
  const { corpus } = loadKnowledge();
  const byId = new Map(corpus.map((c) => [c.id, c]));
  const blocks: string[] = [];
  const missing: string[] = [];
  for (const id of ids) {
    const chunk = byId.get(id);
    if (!chunk) {
      missing.push(id);
      continue;
    }
    blocks.push(
      [
        `### ${chunk.breadcrumb.join(" > ")}`,
        `Source: ${chunk.source_document}, page ${chunk.page} (id: ${chunk.id})`,
        "",
        chunk.content,
      ].join("\n"),
    );
  }
  if (missing.length > 0) {
    blocks.push(
      `\n_(not found: ${missing.join(", ")} — check the CHUNKS catalog for valid IDs)_`,
    );
  }
  return blocks.join("\n\n---\n\n");
}

async function handleLoadFigures(input: unknown): Promise<ToolResultContent> {
  const { ids } = LoadFiguresInput.parse(input);
  const { figures } = loadKnowledge();
  const byId = new Map(figures.map((f) => [f.id, f]));
  const content: ToolResultContent = [];
  const missing: string[] = [];
  for (const id of ids) {
    const fig = byId.get(id);
    if (!fig) {
      missing.push(id);
      continue;
    }
    const path = join(process.cwd(), fig.page_image_ref);
    if (!existsSync(path)) {
      missing.push(`${id} (file missing: ${fig.page_image_ref})`);
      continue;
    }
    const base64 = readFileSync(path).toString("base64");
    content.push({
      type: "text",
      text: `Figure ${fig.id} — ${fig.caption} (page ${fig.page}, ${fig.source_document})`,
    });
    content.push({
      type: "image",
      source: { type: "base64", media_type: "image/png", data: base64 },
    });
  }
  if (missing.length > 0) {
    content.push({
      type: "text",
      text: `\n(not found: ${missing.join(", ")} — check the FIGURES catalog for valid IDs)`,
    });
  }
  if (content.length === 0) {
    return "No figures resolved. Check the FIGURES catalog for valid IDs.";
  }
  return content;
}

async function handleLookupStructured(
  input: unknown,
): Promise<ToolResultContent> {
  const { table, filters } = LookupStructuredInput.parse(input);
  const kb = loadKnowledge();
  const raw = kb.structured[table as StructuredTableName];
  const filtered = filterRows(table as StructuredTableName, raw, filters);
  const count = Array.isArray(filtered) ? filtered.length : 1;
  const header =
    count === 0
      ? `No rows in ${table} match ${JSON.stringify(filters ?? {})}.`
      : `Returning ${count} ${count === 1 ? "entry" : "rows"} from ${table}.`;
  return `${header}\n\n${JSON.stringify(filtered, null, 2)}`;
}

function makeRenderArtifactHandler(ctx: HandlerContext): ToolHandler {
  return async (input) => {
    const { type, params } = RenderArtifactInput.parse(input);
    const artifact_id = randomUUID();
    ctx.emit({
      type: "artifact",
      artifact_id,
      artifact_type: type,
      params,
    });
    return JSON.stringify({ artifact_id, artifact_type: type });
  };
}

function makeAskClarificationHandler(ctx: HandlerContext): ToolHandler {
  return async (input) => {
    const parsed = AskClarificationInput.parse(input);
    ctx.emit({
      type: "clarification",
      question: parsed.question,
      options: parsed.options,
      allow_free_text: parsed.allow_free_text,
    });
    ctx.turnEnded.value = true;
    return JSON.stringify({ clarification_sent: true, ended: true });
  };
}

/* ---------- dispatcher ---------- */

export function makeHandlers(ctx: HandlerContext): Record<string, ToolHandler> {
  return {
    load_chunks: handleLoadChunks,
    load_figures: handleLoadFigures,
    lookup_structured: handleLookupStructured,
    render_artifact: makeRenderArtifactHandler(ctx),
    ask_clarification: makeAskClarificationHandler(ctx),
  };
}
