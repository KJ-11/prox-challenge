export type ClarificationOption = { label: string; value: string };

export type ServerEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_call_start"; id: string; name: string }
  | { type: "tool_call_args_delta"; id: string; delta: string }
  | {
      type: "tool_call_result";
      id: string;
      ok: boolean;
      summary?: string;
    }
  | {
      type: "artifact";
      artifact_id: string;
      artifact_type: string;
      params: unknown;
    }
  | {
      type: "clarification";
      question: string;
      options: ClarificationOption[];
      allow_free_text?: boolean;
    }
  | {
      type: "usage";
      input_tokens: number;
      output_tokens: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    }
  | { type: "error"; message: string }
  | { type: "done"; stop_reason: string };

const ENCODER = new TextEncoder();

/** Encode a single SSE frame as `data: <json>\n\n`. */
export function encodeSse(event: ServerEvent): Uint8Array {
  return ENCODER.encode(`data: ${JSON.stringify(event)}\n\n`);
}
