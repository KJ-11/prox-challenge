"use client";

import { useState } from "react";
import { z } from "zod";
import { ArtifactCard } from "./ArtifactCard";
import { dutyCycleData } from "./data";
import { cn } from "@/lib/utils";

/* ---------- params ---------- */

export const DutyCycleMatrixParamsSchema = z.object({
  process: z.enum(["mig", "flux_cored", "tig", "stick"]).optional(),
  voltage: z.enum(["120V", "240V"]).optional(),
  highlight_amps: z.number().optional(),
});

export type DutyCycleMatrixParams = z.infer<
  typeof DutyCycleMatrixParamsSchema
>;

type Process = "mig" | "tig" | "stick";
type Voltage = "120V" | "240V";

const PROCESSES: Process[] = ["mig", "tig", "stick"];
const VOLTAGES: Voltage[] = ["120V", "240V"];

const PROCESS_LABEL: Record<Process, string> = {
  mig: "MIG / Flux-cored",
  tig: "TIG",
  stick: "Stick",
};

/* ---------- helpers ---------- */

type Row = (typeof dutyCycleData)[number];

function resolveProcess(p: DutyCycleMatrixParams["process"]): Process | null {
  if (!p) return null;
  // flux_cored shares MIG's row in specs (per page 7); we present them together.
  if (p === "flux_cored") return "mig";
  return p as Process;
}

function findRow(process: Process, voltage: Voltage): Row | undefined {
  return dutyCycleData.find(
    (r) => r.process === process && r.voltage === voltage,
  );
}

function findHighlightCell(
  params: DutyCycleMatrixParams,
): { process: Process; voltage: Voltage; row: Row } | null {
  const resolvedProcess = resolveProcess(params.process);
  if (!resolvedProcess) return null;
  if (params.voltage) {
    const row = findRow(resolvedProcess, params.voltage);
    if (row) return { process: resolvedProcess, voltage: params.voltage, row };
  }
  // If amps given but no voltage, guess the voltage whose range contains the amps.
  if (typeof params.highlight_amps === "number") {
    for (const v of VOLTAGES) {
      const row = findRow(resolvedProcess, v);
      if (!row) continue;
      const { min, max } = row.current_range_amps;
      if (params.highlight_amps >= min && params.highlight_amps <= max) {
        return { process: resolvedProcess, voltage: v, row };
      }
    }
  }
  // Default to the 240V row for the process if it exists.
  const fallback = findRow(resolvedProcess, "240V");
  return fallback
    ? { process: resolvedProcess, voltage: "240V", row: fallback }
    : null;
}

/* ---------- clock viz ---------- */

function DutyClock({
  weldingMinutes,
  restingMinutes,
  sizePx = 120,
}: {
  weldingMinutes: number;
  restingMinutes: number;
  sizePx?: number;
}): React.JSX.Element {
  const total = weldingMinutes + restingMinutes;
  const weldingFrac = weldingMinutes / total;
  const r = 40;
  const cx = 50;
  const cy = 50;
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + 2 * Math.PI * weldingFrac;
  const largeArc = weldingFrac > 0.5 ? 1 : 0;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const weldingPath = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  return (
    <svg
      viewBox="0 0 100 100"
      width={sizePx}
      height={sizePx}
      role="img"
      aria-label={`${weldingMinutes} min welding, ${restingMinutes} min resting per 10 min`}
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="var(--color-surface-muted)"
        stroke="var(--color-border-strong)"
        strokeWidth="1"
      />
      <path d={weldingPath} fill="var(--color-brand)" />
      {/* tick marks for each minute */}
      {Array.from({ length: total }).map((_, i) => {
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / total;
        const x = cx + (r + 2) * Math.cos(angle);
        const y = cy + (r + 2) * Math.sin(angle);
        const x2 = cx + (r + 6) * Math.cos(angle);
        const y2 = cy + (r + 6) * Math.sin(angle);
        return (
          <line
            key={i}
            x1={x}
            y1={y}
            x2={x2}
            y2={y2}
            stroke="var(--color-muted)"
            strokeWidth="0.8"
          />
        );
      })}
      <circle cx={cx} cy={cy} r="2" fill="var(--color-foreground)" />
      <text
        x={cx}
        y={cy - 15}
        textAnchor="middle"
        fontSize="7"
        fontFamily="var(--font-mono)"
        fill="var(--color-foreground)"
      >
        WELD
      </text>
      <text
        x={cx}
        y={cy + 18}
        textAnchor="middle"
        fontSize="7"
        fontFamily="var(--font-mono)"
        fill="var(--color-muted)"
      >
        REST
      </text>
    </svg>
  );
}

/* ---------- cell ---------- */

function Cell({
  row,
  highlighted,
  hovered,
  onHover,
  onLeave,
}: {
  row: Row;
  highlighted: boolean;
  hovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}): React.JSX.Element {
  return (
    <td
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onFocus={onHover}
      onBlur={onLeave}
      tabIndex={0}
      className={cn(
        "relative px-3 py-3 align-top transition-colors cursor-default outline-none",
        "border border-[color:var(--color-border)]",
        highlighted
          ? "bg-[color:var(--color-brand-soft)] ring-2 ring-[color:var(--color-brand)] ring-inset"
          : hovered
            ? "bg-[color:var(--color-surface-muted)]"
            : "bg-[color:var(--color-surface)]",
      )}
    >
      <div className="flex flex-col gap-1 text-xs">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wide text-[color:var(--color-muted)]">
            Range
          </span>
          <span className="font-mono text-sm font-semibold text-[color:var(--color-foreground)]">
            {row.current_range_amps.min}–{row.current_range_amps.max}A
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wide text-[color:var(--color-muted)]">
            Rated
          </span>
          <span className="font-mono text-sm font-semibold text-[color:var(--color-brand-strong)]">
            {row.rated_duty_cycle.percent}% @ {row.rated_duty_cycle.at_amperage}A
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wide text-[color:var(--color-muted)]">
            100%
          </span>
          <span className="font-mono text-sm text-[color:var(--color-foreground)]">
            {row.continuous_amperage}A
          </span>
        </div>
      </div>
    </td>
  );
}

/* ---------- artifact ---------- */

export function DutyCycleMatrix(
  params: DutyCycleMatrixParams = {},
): React.JSX.Element {
  const parsed = DutyCycleMatrixParamsSchema.parse(params);
  const [hovered, setHovered] = useState<{
    process: Process;
    voltage: Voltage;
  } | null>(null);

  const highlight = findHighlightCell(parsed);
  const activeCell = hovered
    ? {
        process: hovered.process,
        voltage: hovered.voltage,
        row: findRow(hovered.process, hovered.voltage)!,
      }
    : highlight;

  const subtitle = parsed.highlight_amps
    ? `Showing ${parsed.highlight_amps}A ${parsed.voltage ?? ""}`.trim()
    : parsed.process
      ? `Filtered by ${PROCESS_LABEL[resolveProcess(parsed.process) ?? "mig"]}`
      : "All processes · both input voltages";

  return (
    <ArtifactCard
      title="Duty cycle matrix"
      subtitle={subtitle}
      sources={[
        { label: "Specifications", page: 7, document: "owner_manual" },
        { label: "Duty Cycle", page: 19, document: "owner_manual" },
        { label: "Duty Cycle (TIG/Stick)", page: 29, document: "owner_manual" },
      ]}
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_auto] md:items-start">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wide text-[color:var(--color-muted)]" />
              {VOLTAGES.map((v) => (
                <th
                  key={v}
                  className="border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-3 py-2 text-left font-mono text-xs font-semibold text-[color:var(--color-foreground)]"
                >
                  {v} input
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PROCESSES.map((p) => (
              <tr key={p}>
                <th
                  scope="row"
                  className="border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-3 py-3 text-left text-xs font-semibold text-[color:var(--color-foreground)]"
                >
                  {PROCESS_LABEL[p]}
                </th>
                {VOLTAGES.map((v) => {
                  const row = findRow(p, v);
                  if (!row) {
                    return (
                      <td
                        key={v}
                        className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-3 text-xs text-[color:var(--color-muted)]"
                      >
                        —
                      </td>
                    );
                  }
                  const isHighlighted =
                    !!highlight &&
                    highlight.process === p &&
                    highlight.voltage === v;
                  const isHovered =
                    !!hovered &&
                    hovered.process === p &&
                    hovered.voltage === v;
                  return (
                    <Cell
                      key={v}
                      row={row}
                      highlighted={isHighlighted}
                      hovered={isHovered}
                      onHover={() => setHovered({ process: p, voltage: v })}
                      onLeave={() => setHovered(null)}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <aside className="flex flex-col items-center gap-2 md:min-w-[180px]">
          {activeCell ? (
            <>
              <DutyClock
                weldingMinutes={activeCell.row.rated_duty_cycle.minutes_welding_per_10}
                restingMinutes={activeCell.row.rated_duty_cycle.minutes_resting_per_10}
              />
              <div className="text-center text-xs">
                <div className="font-mono font-semibold text-[color:var(--color-foreground)]">
                  {activeCell.row.rated_duty_cycle.percent}% duty @{" "}
                  {activeCell.row.rated_duty_cycle.at_amperage}A
                </div>
                <div className="text-[color:var(--color-muted)]">
                  {activeCell.row.rated_duty_cycle.minutes_welding_per_10} min
                  welding /{" "}
                  {activeCell.row.rated_duty_cycle.minutes_resting_per_10} min
                  resting per 10-min window
                </div>
                <div className="mt-1 text-[color:var(--color-muted)]">
                  Continuous: {activeCell.row.continuous_amperage}A
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-[color:var(--color-muted)]">
              Hover any cell to see its duty cycle clock.
            </p>
          )}
        </aside>
      </div>
    </ArtifactCard>
  );
}
