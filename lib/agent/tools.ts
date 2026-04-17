import { z } from "zod";
import { STRUCTURED_TABLE_NAMES } from "../knowledge/loader";
import { ARTIFACT_TYPES } from "./system-prompt";

/* ---------- tool input schemas ---------- */

export const LoadChunksInput = z.object({
  ids: z
    .array(z.string())
    .min(1)
    .describe("Chunk IDs from the CHUNKS section of the catalog."),
});
export type LoadChunksInput = z.infer<typeof LoadChunksInput>;

export const LoadFiguresInput = z.object({
  ids: z
    .array(z.string())
    .min(1)
    .describe("Figure IDs from the FIGURES section of the catalog."),
});
export type LoadFiguresInput = z.infer<typeof LoadFiguresInput>;

export const LookupStructuredInput = z.object({
  table: z
    .enum(STRUCTURED_TABLE_NAMES)
    .describe("Which structured table to query."),
  filters: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      "Shallow equality filters against row keys. Example: {process:'mig', voltage:'240V'}. Omit to return the whole table.",
    ),
});
export type LookupStructuredInput = z.infer<typeof LookupStructuredInput>;

export const DiagnoseWeldPhotoInput = z.object({
  image_ref: z
    .string()
    .describe(
      "Reference to the user-uploaded image (e.g. an object URL from the browser or a filename the client already provided).",
    ),
  context: z
    .string()
    .optional()
    .describe("Any context the user shared alongside the photo."),
});
export type DiagnoseWeldPhotoInput = z.infer<typeof DiagnoseWeldPhotoInput>;

export const RenderArtifactInput = z.object({
  type: z
    .enum(ARTIFACT_TYPES)
    .describe("Which pre-built artifact template to render."),
  params: z
    .record(z.string(), z.unknown())
    .describe(
      "Template-specific parameters. See the render_artifact hints in the system prompt for each type's required params.",
    ),
});
export type RenderArtifactInput = z.infer<typeof RenderArtifactInput>;

export const AskClarificationInput = z.object({
  question: z.string().min(1),
  options: z
    .array(
      z.object({
        label: z.string().min(1),
        value: z.string().min(1),
      }),
    )
    .min(2)
    .max(6)
    .describe("2–6 clickable chips the user can pick from."),
  allow_free_text: z
    .boolean()
    .optional()
    .describe('If true, the UI also shows an "Other…" text input.'),
});
export type AskClarificationInput = z.infer<typeof AskClarificationInput>;

/* ---------- tool descriptors for the Anthropic SDK ---------- */

type AnthropicTool = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { target: "draft-7" }) as Record<
    string,
    unknown
  >;
  // Anthropic tools require `type: "object"` at the top level.
  if (json.type !== "object") {
    return {
      type: "object",
      properties: { value: json },
      required: ["value"],
      additionalProperties: false,
    };
  }
  return json;
}

export const TOOL_DEFS: AnthropicTool[] = [
  {
    name: "load_chunks",
    description:
      "Batch-load one or more prose chunks from the manual by their IDs (see CHUNKS in the catalog). Use this when you need procedural content, safety info, or technique prose. Prefer calling once with multiple IDs over multiple single-ID calls.",
    input_schema: toJsonSchema(LoadChunksInput),
  },
  {
    name: "load_figures",
    description:
      "Batch-load one or more manual figures (see FIGURES in the catalog). Returned as image content you can see and cite. Prefer this over describing a figure in prose.",
    input_schema: toJsonSchema(LoadFiguresInput),
  },
  {
    name: "lookup_structured",
    description:
      "Query a structured knowledge table by name with optional shallow filters. Available tables: duty_cycle, specs, polarity, wire_compatibility, selection_chart, troubleshooting, weld_diagnosis, parts_list, safety_symbols. See STRUCTURED TABLES in the catalog for each table's filter keys.",
    input_schema: toJsonSchema(LookupStructuredInput),
  },
  {
    name: "diagnose_weld_photo",
    description:
      "Analyze a user-uploaded weld photo and match it against the manual's weld diagnosis catalog. Returns the top match, runner-up, confidence, and fix. Only use when the user has attached a weld photo.",
    input_schema: toJsonSchema(DiagnoseWeldPhotoInput),
  },
  {
    name: "render_artifact",
    description:
      "Render one of the pre-built visual artifact templates inline. Use this aggressively — any answer involving a diagram, matrix, procedure, or visual interpretation should call render_artifact. Returns { artifact_id } which you then reference inline in your text with [artifact:<id>].",
    input_schema: toJsonSchema(RenderArtifactInput),
  },
  {
    name: "ask_clarification",
    description:
      "Ask the user a structured multi-choice clarification when a single required dimension (process / material / thickness / etc.) is missing. Renders as clickable chips. Calling this tool ENDS the current turn — do not write additional text after it.",
    input_schema: toJsonSchema(AskClarificationInput),
  },
];

export const TOOL_NAMES = TOOL_DEFS.map((t) => t.name) as ReadonlyArray<string>;
