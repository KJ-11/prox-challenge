"use client";

import { useState } from "react";
import { z } from "zod";
import { ChevronRight } from "lucide-react";
import { ArtifactCard } from "./ArtifactCard";
import { troubleshootingData } from "./data";
import type { Troubleshooting } from "@/lib/knowledge/schemas";
import { cn } from "@/lib/utils";

/* ---------- params ---------- */

export const TroubleshootingTreeParamsSchema = z.object({
  symptom: z
    .string()
    .describe('Free-form symptom keyword: "porosity", "bird nest", "wire stops", etc.'),
  process: z
    .enum(["mig", "flux_cored", "tig", "stick"])
    .describe("The process being used; maps to wire (mig/flux_cored) vs tig_stick."),
});

export type TroubleshootingTreeParams = z.infer<
  typeof TroubleshootingTreeParamsSchema
>;

type Entry = Troubleshooting[number];
type Process = TroubleshootingTreeParams["process"];

/* ---------- matching ---------- */

const PROCESS_FAMILY_MAP: Record<Process, "wire" | "tig_stick"> = {
  mig: "wire",
  flux_cored: "wire",
  tig: "tig_stick",
  stick: "tig_stick",
};

const SYMPTOM_ALIASES: Record<string, string[]> = {
  porosity: ["porosity"],
  spatter: ["spatter"],
  "bird nest": ["bird", "nest", "bird's nest"],
  "wire does not feed": ["wire feed motor", "does not feed"],
  "wire stops": ["wire stops"],
  "arc not stable": ["arc not stable"],
  "weak arc": ["weak arc"],
  "welder off": ["does not function"],
  "lcd dark": ["lcd display does not"],
  "arc does not ignite": ["arc does not ignite"],
};

function normalizeSymptom(s: string): string[] {
  const lower = s.toLowerCase().trim();
  for (const [key, aliases] of Object.entries(SYMPTOM_ALIASES)) {
    if (lower === key || aliases.some((a) => lower.includes(a))) return aliases;
  }
  return [lower];
}

function findMatchingEntries(params: TroubleshootingTreeParams): Entry[] {
  const family = PROCESS_FAMILY_MAP[params.process];
  const needles = normalizeSymptom(params.symptom);
  const matches = troubleshootingData.filter((e) => {
    if (e.process_family !== family) return false;
    const haystack = `${e.problem} ${e.id}`.toLowerCase();
    return needles.some((n) => haystack.includes(n));
  });
  if (matches.length > 0) return matches;
  // Fallback: also search across both families.
  return troubleshootingData.filter((e) => {
    const haystack = `${e.problem} ${e.id}`.toLowerCase();
    return needles.some((n) => haystack.includes(n));
  });
}

/* ---------- artifact ---------- */

const PROCESS_LABELS: Record<Process, string> = {
  mig: "MIG",
  flux_cored: "Flux-cored",
  tig: "TIG",
  stick: "Stick",
};

export function TroubleshootingTree(
  params: TroubleshootingTreeParams,
): React.JSX.Element {
  const parsed = TroubleshootingTreeParamsSchema.parse(params);
  const entries = findMatchingEntries(parsed);

  if (entries.length === 0) {
    return (
      <ArtifactCard
        title="Troubleshooting"
        subtitle={`No match for "${parsed.symptom}" on ${PROCESS_LABELS[parsed.process]}`}
      >
        <p className="text-sm text-[color:var(--color-muted)]">
          The structured troubleshooting table doesn't have a direct match for
          this symptom. Check the owner's manual pp. 42-44 for the full table
          or rephrase the symptom.
        </p>
      </ArtifactCard>
    );
  }

  const pages = Array.from(new Set(entries.map((e) => e.source_page)));

  return (
    <ArtifactCard
      title="Troubleshooting decision tree"
      subtitle={`${PROCESS_LABELS[parsed.process]} · "${parsed.symptom}"`}
      badge={`${entries.reduce((n, e) => n + e.causes.length, 0)} causes`}
      sources={pages.map((p) => ({
        label: "Troubleshooting",
        page: p,
        document: "owner_manual" as const,
      }))}
    >
      <div className="space-y-4">
        {entries.map((entry) => (
          <EntryTree key={entry.id} entry={entry} />
        ))}
      </div>
    </ArtifactCard>
  );
}

function EntryTree({ entry }: { entry: Entry }): React.JSX.Element {
  return (
    <section>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="inline-flex h-5 items-center rounded-md bg-[color:var(--color-brand)] px-1.5 text-[10px] font-mono font-semibold uppercase tracking-wide text-white">
          Symptom
        </span>
        <h4 className="text-sm font-semibold text-[color:var(--color-foreground)]">
          {entry.problem}
        </h4>
        <span className="ml-auto font-mono text-[10px] text-[color:var(--color-muted)]">
          p{entry.source_page}
        </span>
      </div>
      <ol className="space-y-2">
        {entry.causes.map((c, i) => (
          <CauseNode
            key={i}
            index={i + 1}
            cause={c.cause}
            solution={c.solution}
          />
        ))}
      </ol>
    </section>
  );
}

function CauseNode({
  index,
  cause,
  solution,
}: {
  index: number;
  cause: string;
  solution: string;
}): React.JSX.Element {
  const [open, setOpen] = useState(index === 1);
  return (
    <li className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <button
        type="button"
        onClick={() => setOpen((x) => !x)}
        className="flex w-full items-start gap-2 px-3 py-2 text-left"
      >
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-brand-soft)] font-mono text-[10px] font-semibold text-[color:var(--color-brand-strong)]">
          {index}
        </span>
        <span className="flex-1 text-sm font-medium text-[color:var(--color-foreground)]">
          {cause}
        </span>
        <ChevronRight
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-muted)] transition-transform",
            open && "rotate-90",
          )}
        />
      </button>
      {open && (
        <div className="border-t border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-3 py-2 pl-10">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-muted)]">
            Fix
          </div>
          <p className="text-sm text-[color:var(--color-foreground)]">{solution}</p>
        </div>
      )}
    </li>
  );
}
