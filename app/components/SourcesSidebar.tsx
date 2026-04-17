"use client";

import Image from "next/image";
import { FileText, ImageIcon, Table as TableIcon } from "lucide-react";
import type {
  AssistantMessage,
  ChatMessage,
  ChatMessageId,
  CollectedSources,
} from "@/lib/chat/types";
import { lookupChunk, lookupFigure, toKnowledgeUrl } from "@/lib/artifacts/data";
import { cn } from "@/lib/utils";

export interface SourcesSidebarProps {
  messages: ChatMessage[];
  focusedMessageId: ChatMessageId | null;
}

export function SourcesSidebar({
  messages,
  focusedMessageId,
}: SourcesSidebarProps): React.JSX.Element {
  const focused = findFocusedAssistant(messages, focusedMessageId);

  if (!focused) {
    return <EmptyState />;
  }

  const { pages, figures, tables } = enrichSources(focused.sources);
  const empty =
    pages.length === 0 && figures.length === 0 && tables.length === 0;

  return (
    <div className="space-y-5 text-xs">
      <header className="space-y-0.5">
        <h2 className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-muted)]">
          Sources for this answer
        </h2>
        {empty && (
          <p className="text-[color:var(--color-muted)]">
            Agent answered from the cached catalog — no explicit lookups.
          </p>
        )}
      </header>

      {pages.length > 0 && <Section icon={<FileText className="h-3.5 w-3.5" />} label="Pages cited">
        <ul className="space-y-2">
          {pages.map((p) => (
            <li
              key={p.key}
              className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[color:var(--color-foreground)]">
                  {p.breadcrumb}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-[color:var(--color-muted)]">
                  p{p.page}
                </span>
              </div>
              {p.preview && (
                <p className="mt-1 line-clamp-3 text-[color:var(--color-muted)]">
                  {p.preview}
                </p>
              )}
            </li>
          ))}
        </ul>
      </Section>}

      {figures.length > 0 && <Section icon={<ImageIcon className="h-3.5 w-3.5" />} label="Figures">
        <ul className="grid grid-cols-2 gap-2">
          {figures.map((f) => (
            <li
              key={f.id}
              className="overflow-hidden rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)]"
            >
              <div className="relative aspect-square bg-[color:var(--color-surface-muted)]">
                <Image
                  src={toKnowledgeUrl(f.page_image_ref)}
                  alt={f.caption}
                  fill
                  sizes="140px"
                  className="object-contain p-1"
                />
              </div>
              <div className="space-y-0.5 p-1.5">
                <p className="line-clamp-2 text-[10px] font-medium leading-tight">
                  {f.caption}
                </p>
                <p className="font-mono text-[10px] text-[color:var(--color-muted)]">
                  p{f.page}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Section>}

      {tables.length > 0 && <Section icon={<TableIcon className="h-3.5 w-3.5" />} label="Tables queried">
        <ul className="space-y-1.5">
          {tables.map((t, i) => (
            <li
              key={i}
              className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-2"
            >
              <div className="font-mono text-[11px] font-semibold text-[color:var(--color-foreground)]">
                {t.name}
              </div>
              {t.filtersText && (
                <div className="mt-0.5 font-mono text-[10px] text-[color:var(--color-muted)]">
                  {t.filtersText}
                </div>
              )}
            </li>
          ))}
        </ul>
      </Section>}

      <Section icon={null} label="Tokens">
        <UsageBadge message={focused} />
      </Section>
    </div>
  );
}

function Section({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5 text-[color:var(--color-muted)]">
        {icon}
        <span className="font-mono text-[10px] uppercase tracking-widest">
          {label}
        </span>
      </div>
      {children}
    </section>
  );
}

function EmptyState(): React.JSX.Element {
  return (
    <div className="space-y-2 text-xs text-[color:var(--color-muted)]">
      <h2 className="font-mono text-[10px] uppercase tracking-widest">
        Sources
      </h2>
      <p>
        48-page owner's manual · 93 figures · 9 structured tables · 35 labeled
        weld references indexed.
      </p>
      <p>Ask a question — the catalog will populate here per answer.</p>
    </div>
  );
}

/* ---------- data prep ---------- */

interface PageEntry {
  key: string;
  page: number;
  breadcrumb: string;
  preview?: string;
}

interface FigureEntry {
  id: string;
  caption: string;
  page: number;
  page_image_ref: string;
}

interface TableEntry {
  name: string;
  filtersText?: string;
}

function enrichSources(src: CollectedSources): {
  pages: PageEntry[];
  figures: FigureEntry[];
  tables: TableEntry[];
} {
  const pages: PageEntry[] = [];
  const seenPageKeys = new Set<string>();

  for (const id of src.chunks) {
    const chunk = lookupChunk(id);
    if (!chunk) continue;
    const key = `chunk:${chunk.id}`;
    if (seenPageKeys.has(key)) continue;
    seenPageKeys.add(key);
    pages.push({
      key,
      page: chunk.page,
      breadcrumb: chunk.breadcrumb.join(" › "),
      preview: chunk.content.slice(0, 160),
    });
  }

  const figures: FigureEntry[] = [];
  for (const id of src.figures) {
    const f = lookupFigure(id);
    if (!f) continue;
    figures.push({
      id: f.id,
      caption: f.caption,
      page: f.page,
      page_image_ref: f.page_image_ref,
    });
  }

  const tables: TableEntry[] = src.tables.map((t) => ({
    name: t.name,
    filtersText: t.filters ? formatFilters(t.filters) : undefined,
  }));

  return { pages, figures, tables };
}

function formatFilters(filters: Record<string, unknown>): string {
  return Object.entries(filters)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join(" · ");
}

function findFocusedAssistant(
  messages: ChatMessage[],
  focusedId: ChatMessageId | null,
): AssistantMessage | null {
  if (!focusedId) {
    // Default to the last assistant message.
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "assistant") return m;
    }
    return null;
  }
  const m = messages.find((x) => x.id === focusedId);
  return m && m.role === "assistant" ? m : null;
}

function UsageBadge({ message }: { message: AssistantMessage }): React.JSX.Element | null {
  if (
    message.usage.input_tokens === 0 &&
    message.usage.output_tokens === 0
  ) {
    return null;
  }
  const cacheHit = message.usage.cache_read_input_tokens > 0;
  return (
    <div
      className={cn(
        "rounded-md border p-2 font-mono text-[10px]",
        cacheHit
          ? "border-[color:var(--color-brand)]/40 bg-[color:var(--color-brand-soft)]/50 text-[color:var(--color-brand-strong)]"
          : "border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-muted)]",
      )}
    >
      <div className="flex justify-between">
        <span>input</span>
        <span>{message.usage.input_tokens.toLocaleString()}</span>
      </div>
      <div className="flex justify-between">
        <span>output</span>
        <span>{message.usage.output_tokens.toLocaleString()}</span>
      </div>
      <div className="flex justify-between">
        <span>cache read</span>
        <span>{message.usage.cache_read_input_tokens.toLocaleString()}</span>
      </div>
      <div className="flex justify-between">
        <span>cache write</span>
        <span>{message.usage.cache_creation_input_tokens.toLocaleString()}</span>
      </div>
    </div>
  );
}
