"use client";

import Image from "next/image";
import { z } from "zod";
import { ImageOff } from "lucide-react";
import { ArtifactCard } from "./ArtifactCard";
import { lookupWeldEntry, toKnowledgeUrl } from "./data";
import type { WeldDiagnosis } from "@/lib/knowledge/schemas";

/* ---------- params ---------- */

export const WeldComparisonParamsSchema = z.object({
  catalog_id: z.string().describe("id of the best-matching weld_diagnosis entry"),
  runner_up_id: z.string().optional(),
  user_image_url: z
    .string()
    .optional()
    .describe(
      "Populated client-side from the most recent user-uploaded image; agent does not set this.",
    ),
});

export type WeldComparisonParams = z.infer<typeof WeldComparisonParamsSchema>;

type CatalogEntry = WeldDiagnosis[number];

/* ---------- artifact ---------- */

export function WeldComparison(params: WeldComparisonParams): React.JSX.Element {
  const parsed = WeldComparisonParamsSchema.parse(params);
  const top = lookupWeldEntry(parsed.catalog_id);
  const runnerUp = parsed.runner_up_id
    ? lookupWeldEntry(parsed.runner_up_id)
    : undefined;

  if (!top) {
    return (
      <ArtifactCard title="Weld diagnosis" subtitle="Unknown catalog entry">
        <p className="text-sm text-[color:var(--color-muted)]">
          No catalog entry found for id <code>{parsed.catalog_id}</code>. Check
          the WELD DIAGNOSIS CATALOG in the system prompt.
        </p>
      </ArtifactCard>
    );
  }

  const sources = [
    { label: top.label, page: top.source_page, document: "owner_manual" as const },
  ];
  if (runnerUp) {
    sources.push({
      label: runnerUp.label,
      page: runnerUp.source_page,
      document: "owner_manual" as const,
    });
  }

  return (
    <ArtifactCard
      title="Weld photo diagnosis"
      subtitle={`Matched against the manual's labeled reference catalog`}
      badge={`${top.process_family}/${top.view}`}
      sources={sources}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Pane
          title="Your weld"
          subtitle="What you shared"
          imageUrl={parsed.user_image_url}
          placeholder={
            parsed.user_image_url
              ? null
              : "No image attached in this turn. Upload a photo of the defect to compare."
          }
        />
        <Pane
          title={top.label}
          subtitle={`Manual reference · page ${top.source_page}`}
          imageUrl={toKnowledgeUrl(top.page_image_ref)}
          highlight
        />
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
            What to look for in the reference
          </h4>
          <p className="mt-1 text-[color:var(--color-foreground)]">
            {top.visual_signature}
          </p>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
            Fix
          </h4>
          <p className="mt-1 font-medium text-[color:var(--color-foreground)]">
            {top.fix_summary}
          </p>
          {top.fix_details.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[color:var(--color-foreground)]">
              {top.fix_details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
        </div>

        {runnerUp && <RunnerUp entry={runnerUp} />}
      </div>
    </ArtifactCard>
  );
}

function Pane({
  title,
  subtitle,
  imageUrl,
  placeholder,
  highlight,
}: {
  title: string;
  subtitle: string;
  imageUrl?: string;
  placeholder?: string | null;
  highlight?: boolean;
}): React.JSX.Element {
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold tracking-tight text-[color:var(--color-foreground)]">
          {title}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-muted)]">
          {subtitle}
        </span>
      </figcaption>
      <div
        className={`relative aspect-square overflow-hidden rounded-md border ${
          highlight
            ? "border-[color:var(--color-brand)]"
            : "border-[color:var(--color-border)]"
        } bg-[color:var(--color-surface-muted)]`}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            unoptimized={imageUrl.startsWith("blob:") || imageUrl.startsWith("data:")}
            sizes="(max-width: 768px) 100vw, 360px"
            className="object-contain p-2"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-xs text-[color:var(--color-muted)]">
            <ImageOff className="h-6 w-6" />
            <p>{placeholder}</p>
          </div>
        )}
      </div>
    </figure>
  );
}

function RunnerUp({ entry }: { entry: CatalogEntry }): React.JSX.Element {
  return (
    <details className="rounded-md border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)]/60 p-3">
      <summary className="cursor-pointer select-none text-xs font-semibold text-[color:var(--color-muted)]">
        Not quite right? Runner-up: {entry.label} (p{entry.source_page})
      </summary>
      <div className="mt-2 space-y-2 text-xs text-[color:var(--color-foreground)]">
        <p className="text-[color:var(--color-muted)]">{entry.visual_signature}</p>
        <p className="font-medium">{entry.fix_summary}</p>
      </div>
    </details>
  );
}
