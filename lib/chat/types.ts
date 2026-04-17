import type { ServerEvent } from "@/lib/agent/events";

export type ChatMessageId = string;

/* ---------- user messages ---------- */

export interface UserTextBlock {
  type: "text";
  text: string;
}

export interface UserImageBlock {
  type: "image";
  source: {
    type: "base64";
    media_type: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
    data: string;
  };
}

export type UserContentBlock = UserTextBlock | UserImageBlock;

export interface UserMessage {
  id: ChatMessageId;
  role: "user";
  content: UserContentBlock[];
  /** Client-side object URLs for thumbnail display — not serialized to the API. */
  imagePreviewUrls: string[];
}

/* ---------- assistant messages ---------- */

export interface AssistantTextBlock {
  type: "text";
  text: string;
}

export interface AssistantArtifactBlock {
  type: "artifact";
  artifact_id: string;
  artifact_type: string;
  params: unknown;
}

export interface AssistantClarificationBlock {
  type: "clarification";
  question: string;
  options: Array<{ label: string; value: string }>;
  allow_free_text?: boolean;
  answered?: string;
}

export interface AssistantToolCallBlock {
  type: "tool_call";
  tool_id: string;
  name: string;
  status: "running" | "done" | "error";
  /** Accumulated JSON string of the tool arguments (may be partial while streaming). */
  args: string;
}

export type AssistantBlock =
  | AssistantTextBlock
  | AssistantArtifactBlock
  | AssistantClarificationBlock
  | AssistantToolCallBlock;

export interface CollectedSources {
  chunks: string[];
  figures: string[];
  tables: Array<{ name: string; filters?: Record<string, unknown> }>;
  artifactPages: Array<{ label: string; pages: number[] }>;
}

export interface UsageTotals {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
}

export interface AssistantMessage {
  id: ChatMessageId;
  role: "assistant";
  blocks: AssistantBlock[];
  sources: CollectedSources;
  usage: UsageTotals;
  status: "streaming" | "done" | "error" | "stopped";
  error?: string;
  stopReason?: string;
}

export type ChatMessage = UserMessage | AssistantMessage;

/** Extracted for convenience — stream events from the server. */
export type { ServerEvent };

/* ---------- helpers ---------- */

export function emptySources(): CollectedSources {
  return { chunks: [], figures: [], tables: [], artifactPages: [] };
}

export function emptyUsage(): UsageTotals {
  return {
    input_tokens: 0,
    output_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
  };
}
