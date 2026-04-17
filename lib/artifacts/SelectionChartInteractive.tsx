"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { Check, X } from "lucide-react";
import { ArtifactCard } from "./ArtifactCard";
import { selectionChartData } from "./data";
import type { SelectionChart } from "@/lib/knowledge/schemas";
import { cn } from "@/lib/utils";

/* ---------- params ---------- */

export const SelectionChartInteractiveParamsSchema = z.object({
  prefilled: z
    .object({
      material: z
        .enum([
          "mild_steel",
          "stainless_steel",
          "aluminum",
          "chrome_moly",
        ])
        .optional(),
      thickness_inches: z.number().optional(),
      gas_available: z.boolean().optional(),
    })
    .optional(),
});

export type SelectionChartInteractiveParams = z.infer<
  typeof SelectionChartInteractiveParamsSchema
>;

type Column = SelectionChart["process_columns"][number];
type Process = Column["process"];

/* ---------- thickness-range parser ---------- */

const GAUGE_TO_INCH: Record<number, number> = {
  10: 0.135,
  11: 0.12,
  12: 0.105,
  14: 0.0747,
  16: 0.0598,
  18: 0.0478,
  20: 0.0359,
  22: 0.0299,
  24: 0.0239,
  26: 0.0179,
};

function tokenToInches(tok: string): number | null {
  const trimmed = tok.trim().replace(/"/g, "");
  // gauge
  const ga = trimmed.match(/^(\d+)\s*(?:Gauge|ga)/i);
  if (ga) return GAUGE_TO_INCH[parseInt(ga[1], 10)] ?? null;
  // fraction like "5/16"
  const frac = trimmed.match(/^(\d+)\s*\/\s*(\d+)/);
  if (frac) return parseInt(frac[1], 10) / parseInt(frac[2], 10);
  // decimal
  const num = parseFloat(trimmed);
  if (!isNaN(num)) return num;
  return null;
}

function rangeToInches(
  range: string,
): { min: number; max: number } | null {
  const parts = range.split(/\s+to\s+/i);
  if (parts.length !== 2) return null;
  const min = tokenToInches(parts[0]);
  const max = tokenToInches(parts[1]);
  if (min === null || max === null) return null;
  return { min: Math.min(min, max), max: Math.max(min, max) };
}

/* ---------- matching ---------- */

interface Filters {
  material: "any" | "mild_steel" | "stainless_steel" | "aluminum" | "chrome_moly";
  thickness_inches: number | null;
  gas_available: "any" | true | false;
}

const MATERIAL_LOWER_MAP: Record<string, string[]> = {
  mild_steel: ["mild steel", "steel"],
  stainless_steel: ["stainless"],
  aluminum: ["aluminum"],
  chrome_moly: ["chrome moly"],
};

function columnMatches(col: Column, f: Filters): {
  matches: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  let ok = true;

  if (f.gas_available === false && col.shielding_gas_required) {
    reasons.push("Needs shielding gas");
    ok = false;
  }

  if (f.material !== "any") {
    const keywords = MATERIAL_LOWER_MAP[f.material] ?? [];
    const matchesMaterial = col.materials.some((m) =>
      keywords.some((k) => m.toLowerCase().includes(k)),
    );
    if (!matchesMaterial) {
      reasons.push("Material not supported");
      ok = false;
    }
  }

  if (f.thickness_inches !== null) {
    const range = rangeToInches(col.thickness_range);
    if (range) {
      if (
        f.thickness_inches < range.min * 0.75 ||
        f.thickness_inches > range.max * 1.05
      ) {
        reasons.push("Outside thickness range");
        ok = false;
      }
    }
  }

  return { matches: ok, reasons };
}

/* ---------- artifact ---------- */

const PROCESS_LABELS: Record<Process, string> = {
  flux_cored: "Flux-cored",
  mig: "MIG",
  stick: "Stick",
  tig: "TIG",
};

const PROCESS_BADGE: Record<Process, string> = {
  flux_cored: "FCAW",
  mig: "GMAW",
  stick: "SMAW",
  tig: "GTAW",
};

export function SelectionChartInteractive(
  params: SelectionChartInteractiveParams = {},
): React.JSX.Element {
  const parsed = SelectionChartInteractiveParamsSchema.parse(params);
  const [filters, setFilters] = useState<Filters>({
    material: parsed.prefilled?.material ?? "any",
    thickness_inches: parsed.prefilled?.thickness_inches ?? null,
    gas_available:
      parsed.prefilled?.gas_available === undefined
        ? "any"
        : parsed.prefilled.gas_available,
  });

  const columns = selectionChartData.process_columns;

  const results = useMemo(
    () => columns.map((col) => ({ col, ...columnMatches(col, filters) })),
    [columns, filters],
  );

  return (
    <ArtifactCard
      title="Process selection chart"
      subtitle="The door-sticker decision tree — filter by what you have and see which processes fit."
      sources={[
        {
          label: "How To Choose A Welder",
          page: 1,
          document: "selection_chart",
        },
      ]}
    >
      <div className="space-y-4">
        {/* filters */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <FilterField
            label="Material"
            value={filters.material}
            options={[
              { value: "any", label: "Any" },
              { value: "mild_steel", label: "Mild steel" },
              { value: "stainless_steel", label: "Stainless steel" },
              { value: "aluminum", label: "Aluminum" },
              { value: "chrome_moly", label: "Chrome moly" },
            ]}
            onChange={(v) =>
              setFilters((f) => ({ ...f, material: v as Filters["material"] }))
            }
          />
          <FilterField
            label="Thickness"
            value={thicknessValue(filters.thickness_inches)}
            options={[
              { value: "any", label: "Any" },
              { value: "24ga", label: "24 ga" },
              { value: "18ga", label: "18 ga" },
              { value: "1/8", label: '1/8"' },
              { value: "1/4", label: '1/4"' },
              { value: "3/8", label: '3/8"' },
              { value: "1/2", label: '1/2"' },
            ]}
            onChange={(v) =>
              setFilters((f) => ({
                ...f,
                thickness_inches: parseThicknessOption(v),
              }))
            }
          />
          <FilterField
            label="Shielding gas"
            value={
              filters.gas_available === "any"
                ? "any"
                : filters.gas_available
                  ? "yes"
                  : "no"
            }
            options={[
              { value: "any", label: "Either" },
              { value: "yes", label: "I have a gas cylinder" },
              { value: "no", label: "No gas cylinder" },
            ]}
            onChange={(v) =>
              setFilters((f) => ({
                ...f,
                gas_available:
                  v === "any" ? "any" : v === "yes" ? true : false,
              }))
            }
          />
        </div>

        {/* columns */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {results.map(({ col, matches, reasons }) => (
            <ColumnCard
              key={col.process}
              col={col}
              matches={matches}
              reasons={reasons}
            />
          ))}
        </div>

        {selectionChartData.duty_cycle_example && (
          <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] p-3 text-xs text-[color:var(--color-muted)]">
            <strong className="font-mono uppercase tracking-widest text-[10px] text-[color:var(--color-foreground)]">
              Duty cycle example:
            </strong>{" "}
            {selectionChartData.duty_cycle_example.amps}A @{" "}
            {selectionChartData.duty_cycle_example.duty_cycle_percent}% —{" "}
            {selectionChartData.duty_cycle_example.minutes_welding} min
            welding, {selectionChartData.duty_cycle_example.minutes_resting}{" "}
            min resting in any 10-minute window.
          </div>
        )}
      </div>
    </ArtifactCard>
  );
}

function ColumnCard({
  col,
  matches,
  reasons,
}: {
  col: Column;
  matches: boolean;
  reasons: string[];
}): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-3 transition-all",
        matches
          ? "border-[color:var(--color-brand)] bg-[color:var(--color-brand-soft)]/50"
          : "border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] opacity-60",
      )}
    >
      <header className="flex items-baseline justify-between">
        <h4 className="text-sm font-semibold tracking-tight text-[color:var(--color-foreground)]">
          {PROCESS_LABELS[col.process]}
        </h4>
        <span className="rounded-sm bg-[color:var(--color-surface)] px-1 py-0.5 font-mono text-[9px] font-semibold text-[color:var(--color-muted)]">
          {PROCESS_BADGE[col.process]}
        </span>
      </header>
      <div
        className={cn(
          "-mx-3 -mb-3 rounded-b-lg border-t px-3 py-1.5 text-[10px] font-mono font-semibold uppercase tracking-widest",
          matches
            ? "border-[color:var(--color-brand)]/30 bg-[color:var(--color-brand)]/10 text-[color:var(--color-brand-strong)]"
            : "border-[color:var(--color-border)] text-[color:var(--color-muted)]",
        )}
      >
        {matches ? (
          <span className="inline-flex items-center gap-1">
            <Check className="h-3 w-3" />
            Good fit
          </span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <X className="h-3 w-3" />
            {reasons[0] ?? "No fit"}
          </span>
        )}
      </div>
      <Row label="Gas needed?" value={col.shielding_gas_required ? "Yes" : "No"} />
      <Row label="Materials" value={col.materials.join(", ")} />
      <Row label="Thickness" value={col.thickness_range} />
      <Row label="Cleanliness" value={col.cleanliness} />
      {col.advantages.length > 0 && (
        <details className="mt-1">
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-muted)]">
            Advantages
          </summary>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-[color:var(--color-foreground)]">
            {col.advantages.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="text-xs">
      <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-muted)]">
        {label}
      </span>
      <span className="ml-1.5 text-[color:var(--color-foreground)]">{value}</span>
    </div>
  );
}

function FilterField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}): React.JSX.Element {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-muted)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full appearance-none rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-sm text-[color:var(--color-foreground)] focus:border-[color:var(--color-brand)] focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function thicknessValue(t: number | null): string {
  if (t === null) return "any";
  if (Math.abs(t - 0.0239) < 0.001) return "24ga";
  if (Math.abs(t - 0.0478) < 0.001) return "18ga";
  if (Math.abs(t - 0.125) < 0.001) return "1/8";
  if (Math.abs(t - 0.25) < 0.001) return "1/4";
  if (Math.abs(t - 0.375) < 0.001) return "3/8";
  if (Math.abs(t - 0.5) < 0.001) return "1/2";
  return "any";
}

function parseThicknessOption(v: string): number | null {
  if (v === "any") return null;
  if (v === "24ga") return 0.0239;
  if (v === "18ga") return 0.0478;
  if (v === "1/8") return 0.125;
  if (v === "1/4") return 0.25;
  if (v === "3/8") return 0.375;
  if (v === "1/2") return 0.5;
  return null;
}
