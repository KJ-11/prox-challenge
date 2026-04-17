"use client";

import { useState } from "react";
import {
  Loader2,
  AlertCircle,
  StopCircle,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import type {
  AssistantBlock,
  AssistantMessage as AssistantMessageType,
} from "@/lib/chat/types";
import { cn } from "@/lib/utils";
import { artifactLabel } from "@/lib/artifacts/registry";
import { ArtifactRender } from "./ArtifactRender";

export interface AssistantMessageProps {
  message: AssistantMessageType;
  reasoningOn: boolean;
  onClarificationSelect?: (blockIndex: number, value: string) => void;
  onFocus?: () => void;
  focused?: boolean;
  onRegenerate?: () => void;
  canRegenerate?: boolean;
}

export function AssistantMessage({
  message,
  reasoningOn,
  onClarificationSelect,
  onFocus,
  focused,
  onRegenerate,
  canRegenerate,
}: AssistantMessageProps): React.JSX.Element {
  const { mainBlocks, activeToolCall } = partitionBlocks(message);
  const doneOrErrored =
    message.status === "done" ||
    message.status === "stopped" ||
    message.status === "error";

  return (
    <div
      className={cn(
        "group/message flex flex-col gap-2 rounded-lg transition-colors",
        focused ? "bg-[color:var(--color-surface-muted)]/40" : undefined,
      )}
      onMouseEnter={onFocus}
      onClick={onFocus}
    >
      {activeToolCall && message.status === "streaming" && (
        <ToolCallIndicator name={activeToolCall.name} />
      )}

      {reasoningOn && <ReasoningBlock message={message} />}

      <div className="space-y-1">
        {mainBlocks.map((block, i) => (
          <BlockRenderer
            key={i}
            block={block}
            blockIndex={i}
            onClarificationSelect={onClarificationSelect}
            reasoningOn={reasoningOn}
          />
        ))}
      </div>

      {message.status === "error" && message.error && (
        <div className="mt-1 flex items-start gap-2 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] p-2 text-xs text-[color:var(--color-muted)]">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--color-positive)]" />
          <span>{message.error}</span>
        </div>
      )}

      {message.status === "stopped" && (
        <div className="mt-1 flex items-center gap-1.5 text-xs text-[color:var(--color-muted)]">
          <StopCircle className="h-3.5 w-3.5" />
          <span>Stopped.</span>
        </div>
      )}

      {doneOrErrored && (
        <MessageActions
          message={message}
          onRegenerate={onRegenerate}
          canRegenerate={canRegenerate}
        />
      )}
    </div>
  );
}

function MessageActions({
  message,
  onRegenerate,
  canRegenerate,
}: {
  message: AssistantMessageType;
  onRegenerate?: () => void;
  canRegenerate?: boolean;
}): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const copyText = async () => {
    const text = collectPlainText(message);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard blocked — silently ignore
    }
  };
  return (
    <div className="mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover/message:opacity-100 focus-within:opacity-100">
      <button
        type="button"
        onClick={copyText}
        className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-[color:var(--color-muted)] transition-colors hover:bg-[color:var(--color-surface-muted)] hover:text-[color:var(--color-foreground)]"
        aria-label="Copy answer"
        title="Copy answer"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            Copy
          </>
        )}
      </button>
      {canRegenerate && (
        <button
          type="button"
          onClick={onRegenerate}
          className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-[color:var(--color-muted)] transition-colors hover:bg-[color:var(--color-surface-muted)] hover:text-[color:var(--color-foreground)]"
          aria-label="Regenerate answer"
          title="Regenerate"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Regenerate
        </button>
      )}
    </div>
  );
}

function collectPlainText(message: AssistantMessageType): string {
  return message.blocks
    .filter((b): b is Extract<AssistantBlock, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("")
    .replace(/\s*\[artifact:[0-9a-f-]+\]\s*/g, " ")
    .trim();
}

function partitionBlocks(message: AssistantMessageType): {
  mainBlocks: AssistantBlock[];
  activeToolCall: Extract<AssistantBlock, { type: "tool_call" }> | null;
} {
  // Main blocks = text, artifact, clarification — everything the user sees.
  // Tool_call blocks drive a small live indicator but are not part of the
  // primary content flow (unless reasoning is toggled on, in which case
  // ReasoningBlock shows them).
  const main: AssistantBlock[] = [];
  let activeToolCall:
    | Extract<AssistantBlock, { type: "tool_call" }>
    | null = null;
  for (const b of message.blocks) {
    if (b.type === "tool_call") {
      if (b.status === "running") activeToolCall = b;
      continue;
    }
    main.push(b);
  }
  return { mainBlocks: main, activeToolCall };
}

function BlockRenderer({
  block,
  blockIndex,
  onClarificationSelect,
  reasoningOn,
}: {
  block: AssistantBlock;
  blockIndex: number;
  onClarificationSelect?: (blockIndex: number, value: string) => void;
  reasoningOn: boolean;
}): React.JSX.Element | null {
  switch (block.type) {
    case "text":
      return <TextRenderer text={block.text} />;
    case "artifact":
      return (
        <ArtifactRender
          artifactType={block.artifact_type}
          params={block.params}
        />
      );
    case "clarification":
      return (
        <ClarificationBlock
          block={block}
          onSelect={(v) => onClarificationSelect?.(blockIndex, v)}
        />
      );
    case "tool_call":
      // Only rendered when reasoning is on (via ReasoningBlock above).
      return reasoningOn ? null : null;
  }
}

function TextRenderer({ text }: { text: string }): React.JSX.Element {
  // Strip [artifact:<uuid>] placeholders — the artifact renders as its own
  // block; the text pointer is for the model's own cross-referencing.
  const stripped = text.replace(/\s*\[artifact:[0-9a-f-]+\]\s*/g, " ");
  return (
    <div className="max-w-none whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--color-foreground)]">
      {renderRichText(stripped)}
    </div>
  );
}

/**
 * Lightweight inline rendering: **bold**, *italic*, `code`, and page-number
 * citation chips ("page 13", "pp. 35-40"). Keeps newlines intact via
 * whitespace-pre-wrap on the container.
 */
function renderRichText(text: string): React.ReactNode[] {
  // Single regex matches any of the inline patterns. Order matters only for
  // named groups — alternation is left-to-right first-match.
  const pattern =
    /(\*\*([^*\n]+)\*\*)|(\*([^*\n]+)\*)|(`([^`\n]+)`)|\b(pages?|pp\.?)\s+(\d+(?:\s*[-–]\s*\d+)?)/g;
  const out: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      out.push(
        <strong key={key++} className="font-semibold">
          {match[2]}
        </strong>,
      );
    } else if (match[3]) {
      out.push(
        <em key={key++} className="italic">
          {match[4]}
        </em>,
      );
    } else if (match[5]) {
      out.push(
        <code
          key={key++}
          className="rounded-sm bg-[color:var(--color-surface-muted)] px-1 py-[1px] font-mono text-[12px]"
        >
          {match[6]}
        </code>,
      );
    } else {
      out.push(
        <span
          key={key++}
          className="mx-0.5 inline-flex items-baseline rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-1.5 py-0 font-mono text-[11px] text-[color:var(--color-muted)]"
        >
          {match[0]}
        </span>,
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) out.push(text.slice(lastIndex));
  return out;
}

function ToolCallIndicator({ name }: { name: string }): React.JSX.Element {
  const label = toolCallLabel(name);
  return (
    <div className="flex items-center gap-2 text-xs text-[color:var(--color-muted)]">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      <span>{label}…</span>
    </div>
  );
}

function toolCallLabel(name: string): string {
  switch (name) {
    case "load_chunks":
      return "Loading manual sections";
    case "load_figures":
      return "Pulling figures";
    case "lookup_structured":
      return "Querying structured table";
    case "diagnose_weld_photo":
      return "Analyzing weld photo";
    case "render_artifact":
      return "Rendering artifact";
    case "ask_clarification":
      return "Preparing clarification";
    default:
      return `Running ${name}`;
  }
}

function ClarificationBlock({
  block,
  onSelect,
}: {
  block: Extract<AssistantBlock, { type: "clarification" }>;
  onSelect: (value: string) => void;
}): React.JSX.Element {
  return (
    <div className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] p-3">
      <p className="mb-2 text-sm font-medium">{block.question}</p>
      <div className="flex flex-wrap gap-2">
        {block.options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={!!block.answered}
            onClick={() => onSelect(opt.value)}
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              block.answered === opt.value
                ? "border-[color:var(--color-brand)] bg-[color:var(--color-brand-soft)] text-[color:var(--color-brand-strong)]"
                : block.answered
                  ? "border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-muted)]"
                  : "border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-foreground)] hover:border-[color:var(--color-brand)] hover:bg-[color:var(--color-brand-soft)]",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ReasoningBlock({
  message,
}: {
  message: AssistantMessageType;
}): React.JSX.Element | null {
  const toolCalls = message.blocks.filter(
    (b): b is Extract<AssistantBlock, { type: "tool_call" }> =>
      b.type === "tool_call",
  );
  const artifacts = message.blocks.filter(
    (b): b is Extract<AssistantBlock, { type: "artifact" }> =>
      b.type === "artifact",
  );
  if (toolCalls.length === 0 && artifacts.length === 0) return null;

  return (
    <details className="rounded-md border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)]/60 px-3 py-2 text-xs text-[color:var(--color-muted)]">
      <summary className="cursor-pointer select-none font-mono text-[10px] uppercase tracking-widest">
        Reasoning · {toolCalls.length} tool
        {toolCalls.length === 1 ? "" : "s"} · {artifacts.length} artifact
        {artifacts.length === 1 ? "" : "s"}
      </summary>
      <ol className="mt-2 space-y-1.5 font-mono text-[11px]">
        {toolCalls.map((tc, i) => (
          <li key={i} className="flex items-baseline gap-2">
            <span
              className={cn(
                "inline-block h-1.5 w-1.5 rounded-full",
                tc.status === "done"
                  ? "bg-[color:var(--color-brand)]"
                  : tc.status === "error"
                    ? "bg-[color:var(--color-positive)]"
                    : "animate-pulse bg-[color:var(--color-muted)]",
              )}
            />
            <span className="font-semibold text-[color:var(--color-foreground)]">
              {tc.name}
            </span>
            <code className="truncate text-[color:var(--color-muted)]">
              {tc.args || "(building args…)"}
            </code>
          </li>
        ))}
        {artifacts.map((a, i) => (
          <li key={`a-${i}`} className="flex items-baseline gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--color-brand-strong)]" />
            <span className="font-semibold text-[color:var(--color-foreground)]">
              render_artifact
            </span>
            <span>→ {artifactLabel(a.artifact_type)}</span>
          </li>
        ))}
      </ol>
      {(message.usage.input_tokens > 0 ||
        message.usage.output_tokens > 0) && (
        <div className="mt-2 grid grid-cols-2 gap-x-4 border-t border-[color:var(--color-border)] pt-2 text-[10px]">
          <span>input: {message.usage.input_tokens.toLocaleString()}</span>
          <span>output: {message.usage.output_tokens.toLocaleString()}</span>
          <span>
            cache read: {message.usage.cache_read_input_tokens.toLocaleString()}
          </span>
          <span>
            cache write:{" "}
            {message.usage.cache_creation_input_tokens.toLocaleString()}
          </span>
        </div>
      )}
    </details>
  );
}
