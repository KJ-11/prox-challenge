import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODEL_ID } from "./model";
import { buildSystemPrompt } from "./system-prompt";
import { TOOL_DEFS } from "./tools";
import {
  makeHandlers,
  makeHandlerContext,
  type HandlerContext,
} from "./tool-handlers";
import type { ServerEvent } from "./events";

const DEFAULT_MAX_TOKENS = 4096;
const MAX_ITERATIONS = 8;

type BetaMessageParam =
  Anthropic.Beta.Messages.BetaMessageParam;
type BetaRawMessageStreamEvent =
  Anthropic.Beta.Messages.BetaRawMessageStreamEvent;

export interface RunAgentParams {
  messages: BetaMessageParam[];
  signal?: AbortSignal;
}

/* ---------- build runnable tools ---------- */

function makeRunnableTools(ctx: HandlerContext) {
  const handlers = makeHandlers(ctx);
  return TOOL_DEFS.map((def) => ({
    name: def.name,
    description: def.description,
    input_schema: def.input_schema as { type: "object" } & Record<
      string,
      unknown
    >,
    parse(raw: unknown) {
      return raw;
    },
    async run(input: unknown) {
      const handler = handlers[def.name];
      if (!handler) throw new Error(`no handler for ${def.name}`);
      return handler(input);
    },
  }));
}

/* ---------- raw stream event → ServerEvent mapping ---------- */

interface StreamState {
  activeTool: { id: string; name: string } | null;
}

function mapStreamEvent(
  ev: BetaRawMessageStreamEvent,
  state: StreamState,
): ServerEvent[] {
  const out: ServerEvent[] = [];

  switch (ev.type) {
    case "content_block_start": {
      const block = ev.content_block;
      if (block.type === "tool_use") {
        state.activeTool = { id: block.id, name: block.name };
        out.push({ type: "tool_call_start", id: block.id, name: block.name });
      }
      break;
    }
    case "content_block_delta": {
      const delta = ev.delta;
      if (delta.type === "text_delta") {
        if (delta.text) out.push({ type: "text_delta", text: delta.text });
      } else if (delta.type === "input_json_delta") {
        if (state.activeTool) {
          out.push({
            type: "tool_call_args_delta",
            id: state.activeTool.id,
            delta: delta.partial_json ?? "",
          });
        }
      }
      break;
    }
    case "content_block_stop": {
      if (state.activeTool) {
        out.push({
          type: "tool_call_result",
          id: state.activeTool.id,
          ok: true,
        });
        state.activeTool = null;
      }
      break;
    }
    case "message_delta": {
      // Usage deltas arrive on message_delta in some shapes; the final call to
      // finalMessage() returns the canonical usage object, handled after the
      // stream ends.
      break;
    }
    default:
      break;
  }

  return out;
}

/* ---------- the generator ---------- */

export async function* runAgent(
  params: RunAgentParams,
): AsyncGenerator<ServerEvent> {
  const queue: ServerEvent[] = [];
  const ctx = makeHandlerContext((e) => queue.push(e));
  const tools = makeRunnableTools(ctx);

  const runner = anthropic().beta.messages.toolRunner(
    {
      model: MODEL_ID,
      max_tokens: DEFAULT_MAX_TOKENS,
      system: buildSystemPrompt(),
      tools,
      messages: params.messages,
      stream: true,
      max_iterations: MAX_ITERATIONS,
    },
    { signal: params.signal },
  );

  const state: StreamState = { activeTool: null };

  function* drainQueue(): Generator<ServerEvent> {
    while (queue.length > 0) {
      const next = queue.shift();
      if (next) yield next;
    }
  }

  let stopReason: string | null = null;

  try {
    for await (const messageStream of runner) {
      for await (const rawEvent of messageStream) {
        yield* drainQueue();
        for (const mapped of mapStreamEvent(rawEvent, state)) {
          yield mapped;
        }
      }
      yield* drainQueue();

      const finalMessage = await messageStream.finalMessage();
      if (finalMessage.usage) {
        yield {
          type: "usage",
          input_tokens: finalMessage.usage.input_tokens,
          output_tokens: finalMessage.usage.output_tokens,
          cache_read_input_tokens:
            finalMessage.usage.cache_read_input_tokens ?? undefined,
          cache_creation_input_tokens:
            finalMessage.usage.cache_creation_input_tokens ?? undefined,
        };
      }
      stopReason = finalMessage.stop_reason ?? null;

      if (ctx.turnEnded.value) {
        // ask_clarification was invoked; do not continue the loop.
        break;
      }
    }
  } catch (err) {
    yield {
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  } finally {
    yield* drainQueue();
    yield { type: "done", stop_reason: stopReason ?? "unknown" };
  }
}
