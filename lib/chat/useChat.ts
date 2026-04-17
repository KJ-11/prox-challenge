"use client";

import { useCallback, useRef, useState } from "react";
import type { ServerEvent } from "@/lib/agent/events";
import { readSseEvents } from "./sse";
import {
  emptySources,
  emptyUsage,
  type AssistantBlock,
  type AssistantMessage,
  type ChatMessage,
  type ChatMessageId,
  type UserContentBlock,
  type UserMessage,
} from "./types";

function uid(): ChatMessageId {
  return (globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`) as ChatMessageId;
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function supportedMediaType(file: File): UserContentBlock["type"] extends "image"
  ? "image/png"
  : never;
function supportedMediaType(
  file: File,
):
  | "image/png"
  | "image/jpeg"
  | "image/webp"
  | "image/gif"
  | null {
  const t = file.type.toLowerCase();
  if (t === "image/png") return "image/png";
  if (t === "image/jpeg" || t === "image/jpg") return "image/jpeg";
  if (t === "image/webp") return "image/webp";
  if (t === "image/gif") return "image/gif";
  return null;
}

/** Convert our rich chat history into the shape /api/chat expects. */
function toApiMessages(messages: ChatMessage[]): Array<{
  role: "user" | "assistant";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | {
            type: "image";
            source: {
              type: "base64";
              media_type: string;
              data: string;
            };
          }
      >;
}> {
  return messages
    .map((m) => {
      if (m.role === "user") {
        return {
          role: "user" as const,
          content: m.content.map((b) => {
            if (b.type === "text") return { type: "text" as const, text: b.text };
            return {
              type: "image" as const,
              source: { ...b.source },
            };
          }),
        };
      }
      // Assistant: collapse to text content. We strip [artifact:<uuid>] refs
      // so previous artifact pointers don't confuse the next turn.
      const text = m.blocks
        .filter((b): b is Extract<AssistantBlock, { type: "text" }> => b.type === "text")
        .map((b) => b.text)
        .join("")
        .replace(/\[artifact:[0-9a-f-]+\]/g, "")
        .trim();
      if (!text) return null;
      return {
        role: "assistant" as const,
        content: text,
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);
}

export interface UseChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  focusedMessageId: ChatMessageId | null;
  send: (text: string, imageFiles?: File[]) => Promise<void>;
  stop: () => void;
  setFocus: (id: ChatMessageId | null) => void;
  clear: () => void;
  answerClarification: (
    assistantId: ChatMessageId,
    blockIndex: number,
    value: string,
  ) => Promise<void>;
  regenerate: (assistantId: ChatMessageId) => Promise<void>;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedMessageId, setFocusedMessageId] =
    useState<ChatMessageId | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === "assistant" && last.status === "streaming") {
        const next = [...prev];
        next[next.length - 1] = { ...last, status: "stopped" };
        return next;
      }
      return prev;
    });
    setIsStreaming(false);
  }, []);

  const runStream = useCallback(
    async (
      history: ChatMessage[],
      assistantId: ChatMessageId,
    ): Promise<void> => {
      setIsStreaming(true);
      setError(null);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: toApiMessages(history) }),
          signal: controller.signal,
        });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(
            `chat request failed (${response.status}): ${text.slice(0, 200)}`,
          );
        }

        for await (const event of readSseEvents(response)) {
          applyEvent(setMessages, assistantId, event);
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId && m.role === "assistant"
              ? { ...m, status: "error", error: msg }
              : m,
          ),
        );
      } finally {
        abortRef.current = null;
        setIsStreaming(false);
      }
    },
    [],
  );

  const send = useCallback(
    async (text: string, imageFiles?: File[]): Promise<void> => {
      const trimmed = text.trim();
      if (!trimmed && (!imageFiles || imageFiles.length === 0)) return;
      if (isStreaming) return;

      const content: UserContentBlock[] = [];
      const previewUrls: string[] = [];
      if (imageFiles) {
        for (const file of imageFiles) {
          const mediaType = supportedMediaType(file);
          if (!mediaType) continue;
          const data = await fileToBase64(file);
          content.push({
            type: "image",
            source: { type: "base64", media_type: mediaType, data },
          });
          previewUrls.push(URL.createObjectURL(file));
        }
      }
      if (trimmed) content.push({ type: "text", text: trimmed });

      const userMessage: UserMessage = {
        id: uid(),
        role: "user",
        content,
        imagePreviewUrls: previewUrls,
      };
      const assistantMessage: AssistantMessage = {
        id: uid(),
        role: "assistant",
        blocks: [],
        sources: emptySources(),
        usage: emptyUsage(),
        status: "streaming",
      };

      const nextMessages = [...messages, userMessage, assistantMessage];
      setMessages(nextMessages);
      setFocusedMessageId(assistantMessage.id);
      await runStream(nextMessages, assistantMessage.id);
    },
    [isStreaming, messages, runStream],
  );

  const clear = useCallback(() => {
    stop();
    setMessages([]);
    setError(null);
    setFocusedMessageId(null);
  }, [stop]);

  const setFocus = useCallback((id: ChatMessageId | null) => {
    setFocusedMessageId(id);
  }, []);

  const answerClarification = useCallback(
    async (
      assistantId: ChatMessageId,
      blockIndex: number,
      value: string,
    ): Promise<void> => {
      // Mark the clarification as answered, then send the value as a new user turn.
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== assistantId || m.role !== "assistant") return m;
          const blocks = m.blocks.map((b, i) =>
            i === blockIndex && b.type === "clarification"
              ? { ...b, answered: value }
              : b,
          );
          return { ...m, blocks };
        }),
      );
      await send(value);
    },
    [send],
  );

  const regenerate = useCallback(
    async (assistantId: ChatMessageId): Promise<void> => {
      if (isStreaming) return;
      const idx = messages.findIndex((m) => m.id === assistantId);
      if (idx < 0) return;
      const truncated = messages.slice(0, idx);
      const replacement: AssistantMessage = {
        id: uid(),
        role: "assistant",
        blocks: [],
        sources: emptySources(),
        usage: emptyUsage(),
        status: "streaming",
      };
      const next = [...truncated, replacement];
      setMessages(next);
      setFocusedMessageId(replacement.id);
      await runStream(next, replacement.id);
    },
    [isStreaming, messages, runStream],
  );

  return {
    messages,
    isStreaming,
    error,
    focusedMessageId,
    send,
    stop,
    setFocus,
    clear,
    answerClarification,
    regenerate,
  };
}

/* ---------- reducer: apply a ServerEvent to the assistant message ---------- */

function applyEvent(
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  assistantId: ChatMessageId,
  event: ServerEvent,
): void {
  setMessages((prev) =>
    prev.map((m) => {
      if (m.id !== assistantId || m.role !== "assistant") return m;
      return reduceAssistant(m, event);
    }),
  );
}

function reduceAssistant(
  m: AssistantMessage,
  event: ServerEvent,
): AssistantMessage {
  switch (event.type) {
    case "text_delta":
      return appendText(m, event.text);
    case "tool_call_start":
      return pushBlock(m, {
        type: "tool_call",
        tool_id: event.id,
        name: event.name,
        status: "running",
        args: "",
      });
    case "tool_call_args_delta":
      return updateToolCall(m, event.id, (b) => ({ ...b, args: b.args + event.delta }));
    case "tool_call_result":
      return recordSourcesFromToolCall(
        updateToolCall(m, event.id, (b) => ({
          ...b,
          status: event.ok ? "done" : "error",
        })),
        event.id,
      );
    case "artifact":
      return pushBlock(m, {
        type: "artifact",
        artifact_id: event.artifact_id,
        artifact_type: event.artifact_type,
        params: event.params,
      });
    case "clarification":
      return pushBlock(m, {
        type: "clarification",
        question: event.question,
        options: event.options,
        allow_free_text: event.allow_free_text,
      });
    case "usage":
      return {
        ...m,
        usage: {
          input_tokens: m.usage.input_tokens + event.input_tokens,
          output_tokens: m.usage.output_tokens + event.output_tokens,
          cache_read_input_tokens:
            m.usage.cache_read_input_tokens +
            (event.cache_read_input_tokens ?? 0),
          cache_creation_input_tokens:
            m.usage.cache_creation_input_tokens +
            (event.cache_creation_input_tokens ?? 0),
        },
      };
    case "error":
      return { ...m, status: "error", error: event.message };
    case "done":
      return {
        ...m,
        status: m.status === "error" || m.status === "stopped" ? m.status : "done",
        stopReason: event.stop_reason,
      };
    default:
      return m;
  }
}

function appendText(m: AssistantMessage, text: string): AssistantMessage {
  const last = m.blocks[m.blocks.length - 1];
  if (last && last.type === "text") {
    const blocks = [...m.blocks];
    blocks[blocks.length - 1] = { ...last, text: last.text + text };
    return { ...m, blocks };
  }
  return { ...m, blocks: [...m.blocks, { type: "text", text }] };
}

function pushBlock(m: AssistantMessage, block: AssistantBlock): AssistantMessage {
  return { ...m, blocks: [...m.blocks, block] };
}

function updateToolCall(
  m: AssistantMessage,
  toolId: string,
  mutator: (b: Extract<AssistantBlock, { type: "tool_call" }>) => Extract<
    AssistantBlock,
    { type: "tool_call" }
  >,
): AssistantMessage {
  const blocks = m.blocks.map((b) =>
    b.type === "tool_call" && b.tool_id === toolId ? mutator(b) : b,
  );
  return { ...m, blocks };
}

function recordSourcesFromToolCall(
  m: AssistantMessage,
  toolId: string,
): AssistantMessage {
  const block = m.blocks.find(
    (b): b is Extract<AssistantBlock, { type: "tool_call" }> =>
      b.type === "tool_call" && b.tool_id === toolId,
  );
  if (!block) return m;
  let args: Record<string, unknown> | null = null;
  try {
    args = JSON.parse(block.args) as Record<string, unknown>;
  } catch {
    return m;
  }

  const nextSources = { ...m.sources };
  if (block.name === "load_chunks" && Array.isArray(args?.ids)) {
    const ids = (args.ids as unknown[]).filter(
      (x): x is string => typeof x === "string",
    );
    nextSources.chunks = Array.from(new Set([...m.sources.chunks, ...ids]));
  } else if (block.name === "load_figures" && Array.isArray(args?.ids)) {
    const ids = (args.ids as unknown[]).filter(
      (x): x is string => typeof x === "string",
    );
    nextSources.figures = Array.from(new Set([...m.sources.figures, ...ids]));
  } else if (
    block.name === "lookup_structured" &&
    typeof args?.table === "string"
  ) {
    nextSources.tables = [
      ...m.sources.tables,
      {
        name: args.table,
        filters:
          typeof args.filters === "object" && args.filters !== null
            ? (args.filters as Record<string, unknown>)
            : undefined,
      },
    ];
  }
  return { ...m, sources: nextSources };
}
