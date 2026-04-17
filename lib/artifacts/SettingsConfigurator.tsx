"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { ArtifactCard } from "./ArtifactCard";
import { cn } from "@/lib/utils";

/* ---------- params ---------- */

export const SettingsConfiguratorParamsSchema = z.object({
  process: z.enum(["mig", "flux_cored", "tig", "stick"]).default("mig"),
  material: z
    .enum(["mild_steel", "stainless_steel", "aluminum", "chrome_moly"])
    .default("mild_steel"),
  thickness: z
    .string()
    .describe('e.g. "1/8\\"", "14 ga", "3/16\\"" — free-form accepted; preset list below')
    .default('1/8"'),
  wire_size: z.string().optional(),
});

export type SettingsConfiguratorParams = z.infer<
  typeof SettingsConfiguratorParamsSchema
>;

/* ---------- option sets ---------- */

type Process = NonNullable<SettingsConfiguratorParams["process"]>;
type Material = NonNullable<SettingsConfiguratorParams["material"]>;

const PROCESS_LABELS: Record<Process, string> = {
  mig: "MIG / GMAW",
  flux_cored: "Flux-cored / FCAW",
  tig: "TIG / GTAW",
  stick: "Stick / SMAW",
};

const MATERIAL_LABELS: Record<Material, string> = {
  mild_steel: "Mild steel",
  stainless_steel: "Stainless steel",
  aluminum: "Aluminum",
  chrome_moly: "Chrome moly",
};

const MATERIALS_PER_PROCESS: Record<Process, Material[]> = {
  mig: ["mild_steel", "stainless_steel", "aluminum"],
  flux_cored: ["mild_steel", "stainless_steel"],
  tig: ["mild_steel", "stainless_steel", "chrome_moly", "aluminum"],
  stick: ["mild_steel", "stainless_steel"],
};

const THICKNESS_PRESETS = [
  "24 ga",
  "22 ga",
  "18 ga",
  "16 ga",
  "14 ga",
  "12 ga",
  "11 ga",
  '1/8"',
  '3/16"',
  '1/4"',
  '3/8"',
  '1/2"',
];

const WIRE_SIZES: Record<Process, string[]> = {
  mig: ['0.025"', '0.030"', '0.035"'],
  flux_cored: ['0.030"', '0.035"', '0.045"'],
  tig: ['1/16"', '3/32"', '1/8"'],
  stick: ['3/32"', '1/8"', '5/32"'],
};

/* ---------- thickness → inches ---------- */

function thicknessToInches(t: string): number {
  const trimmed = t.trim();
  // fraction "1/8" or "3/16"
  const fracMatch = trimmed.match(/^(\d+)\s*\/\s*(\d+)/);
  if (fracMatch) return parseInt(fracMatch[1], 10) / parseInt(fracMatch[2], 10);
  // decimal inches
  const decMatch = trimmed.match(/^([\d.]+)\s*(?:"|in|")?$/);
  if (decMatch && !trimmed.toLowerCase().includes("ga")) {
    return parseFloat(decMatch[1]);
  }
  // gauge (approximations for sheet-metal gauge in mild steel)
  const gaMatch = trimmed.match(/^(\d+)\s*ga/i);
  if (gaMatch) {
    const ga = parseInt(gaMatch[1], 10);
    const gaugeTable: Record<number, number> = {
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
    return gaugeTable[ga] ?? 0.06;
  }
  return 0.125;
}

/* ---------- recommendation engine ---------- */

interface Recommendation {
  primaryValue: string;
  primaryLabel: string;
  secondaryValue?: string;
  secondaryLabel?: string;
  gas?: string;
  scfh?: string;
  notes: string[];
  cautions?: string[];
}

function recommend(params: SettingsConfiguratorParams): Recommendation {
  const inches = thicknessToInches(params.thickness);
  const process = params.process ?? "mig";
  const material = params.material ?? "mild_steel";

  switch (process) {
    case "mig":
      return recommendMig(inches, material, params.wire_size);
    case "flux_cored":
      return recommendFlux(inches, params.wire_size);
    case "tig":
      return recommendTig(inches, material, params.wire_size);
    case "stick":
      return recommendStick(inches, params.wire_size);
  }
}

function recommendMig(
  inches: number,
  material: Material,
  wireSize: string | undefined,
): Recommendation {
  const voltage = clamp(13 + Math.log(Math.max(inches, 0.02) / 0.02) * 2.2, 14, 24);
  const wfs = Math.round(clamp(120 + inches * 1400, 140, 500));
  const gas =
    material === "aluminum"
      ? "100% Argon"
      : material === "stainless_steel"
        ? "Stainless Tri-Mix (He/Ar/CO₂)"
        : "C25 (75% Ar / 25% CO₂)";
  const scfh = inches < 0.1 ? "20 SCFH" : inches < 0.2 ? "25 SCFH" : "30 SCFH";
  const suggestedWire = inches < 0.06 ? '0.025"' : inches < 0.15 ? '0.030"' : '0.035"';
  const notes: string[] = [];
  const cautions: string[] = [];
  if (material === "aluminum") {
    cautions.push(
      "Aluminum MIG needs the optional Spool Gun + 100% Argon. The main MIG gun with steel-rated liner will not feed soft aluminum reliably.",
    );
  }
  if (inches > 0.25) {
    cautions.push(
      "Over 1/4\" typically wants multiple passes with a root + fill. Bevel the joint before welding.",
    );
  }
  notes.push(`Wire: ${wireSize ?? suggestedWire} solid core.`);
  notes.push("Polarity: DCEP — ground clamp to (−), wire feed cable to (+).");
  notes.push("Push angle 0-15° toward direction of travel. Keep CTWD ≤ 1/2\".");
  return {
    primaryValue: `${voltage.toFixed(1)} V`,
    primaryLabel: "Voltage",
    secondaryValue: `${wfs} IPM`,
    secondaryLabel: "Wire feed speed",
    gas,
    scfh,
    notes,
    cautions,
  };
}

function recommendFlux(
  inches: number,
  wireSize: string | undefined,
): Recommendation {
  const voltage = clamp(14 + Math.log(Math.max(inches, 0.02) / 0.02) * 2.0, 15, 23);
  const wfs = Math.round(clamp(110 + inches * 1200, 130, 420));
  const suggestedWire = inches < 0.1 ? '0.030"' : inches < 0.2 ? '0.035"' : '0.045"';
  return {
    primaryValue: `${voltage.toFixed(1)} V`,
    primaryLabel: "Voltage",
    secondaryValue: `${wfs} IPM`,
    secondaryLabel: "Wire feed speed",
    gas: "None (self-shielded)",
    scfh: "—",
    notes: [
      `Wire: ${wireSize ?? suggestedWire} flux-cored, knurled feed roller.`,
      "Polarity: DCEN — ground clamp to (+), wire feed cable to (−). REVERSED from MIG.",
      "Drag angle 0-15° away from direction of travel. The slag trails the puddle.",
      "Clean slag with chipping hammer + wire brush between passes.",
    ],
  };
}

function recommendTig(
  inches: number,
  material: Material,
  wireSize: string | undefined,
): Recommendation {
  const amps = Math.round(clamp(inches * 1000, 15, 175));
  const tungsten = inches < 0.06 ? '1/16"' : inches < 0.125 ? '3/32"' : '1/8"';
  return {
    primaryValue: `${amps} A`,
    primaryLabel: "Amperage",
    gas: material === "aluminum" ? "100% Argon (AC TIG)" : "100% Argon",
    scfh: "10-25 SCFH",
    notes: [
      `Tungsten: ${wireSize ?? tungsten}, ${material === "aluminum" ? "pure or zirconiated (balled tip for AC)" : "2% thoriated or lanthanated, sharpened to a point"}.`,
      material === "aluminum"
        ? "Aluminum needs AC TIG — clean anodized skin before welding."
        : "DC TIG: ground clamp to (+), torch to (−).",
      "Foot pedal controls amperage in real time. Rule of thumb: ~1 A per thousandth of material thickness.",
    ],
    cautions:
      material === "aluminum"
        ? ["AC TIG on aluminum is more demanding — practice on scrap first."]
        : undefined,
  };
}

function recommendStick(
  inches: number,
  electrodeSize: string | undefined,
): Recommendation {
  const el = electrodeSize ?? (inches < 0.1 ? '3/32"' : '1/8"');
  const amps = (() => {
    if (el === '3/32"') return inches < 0.125 ? 75 : 90;
    if (el === '1/8"') return inches < 0.25 ? 110 : 135;
    return 160;
  })();
  return {
    primaryValue: `${amps} A`,
    primaryLabel: "Amperage",
    gas: "None",
    scfh: "—",
    notes: [
      `Electrode: ${el}. E7018 low-hydrogen is a good default on mild steel.`,
      "Polarity: DCEP for E7018/E6013/E6011. DCEN for E6012.",
      "Arc length ≈ diameter of the electrode (e.g. 1/8\" arc for a 1/8\" electrode).",
      "Travel at 4-6 IPM. Chip slag between passes.",
    ],
    cautions: ["Some electrodes use reversed polarity — check the manufacturer's stamp."],
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/* ---------- artifact ---------- */

export function SettingsConfigurator(
  params: SettingsConfiguratorParams = {} as SettingsConfiguratorParams,
): React.JSX.Element {
  const parsed = SettingsConfiguratorParamsSchema.parse(params);
  const [state, setState] = useState<SettingsConfiguratorParams>(parsed);
  const rec = useMemo(() => recommend(state), [state]);

  const availableMaterials = MATERIALS_PER_PROCESS[state.process ?? "mig"];
  const availableWireSizes = WIRE_SIZES[state.process ?? "mig"];

  const update = <K extends keyof SettingsConfiguratorParams>(
    key: K,
    value: SettingsConfiguratorParams[K],
  ) => {
    setState((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "process") {
        // Reset incompatible material / wire size when process changes.
        const mats = MATERIALS_PER_PROCESS[value as Process];
        if (!mats.includes(next.material ?? "mild_steel")) {
          next.material = mats[0];
        }
        next.wire_size = undefined;
      }
      return next;
    });
  };

  return (
    <ArtifactCard
      title="Settings configurator"
      subtitle={`Synergic-style recommendation for ${PROCESS_LABELS[state.process ?? "mig"]}`}
      badge={state.process?.toUpperCase().replace("_", " ")}
      sources={[
        { label: "Settings flow", page: 20, document: "owner_manual" },
        { label: "Selection chart", page: 1, document: "selection_chart" },
      ]}
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* INPUTS */}
        <div className="space-y-3">
          <SelectField
            label="Process"
            value={state.process ?? "mig"}
            options={(Object.keys(PROCESS_LABELS) as Process[]).map((p) => ({
              value: p,
              label: PROCESS_LABELS[p],
            }))}
            onChange={(v) => update("process", v as Process)}
          />
          <SelectField
            label="Material"
            value={state.material ?? "mild_steel"}
            options={availableMaterials.map((m) => ({
              value: m,
              label: MATERIAL_LABELS[m],
            }))}
            onChange={(v) => update("material", v as Material)}
          />
          <SelectField
            label="Thickness"
            value={state.thickness ?? '1/8"'}
            options={THICKNESS_PRESETS.map((t) => ({ value: t, label: t }))}
            onChange={(v) => update("thickness", v)}
          />
          <SelectField
            label={
              state.process === "stick"
                ? "Electrode diameter"
                : state.process === "tig"
                  ? "Tungsten diameter"
                  : "Wire size"
            }
            value={state.wire_size ?? ""}
            options={[
              { value: "", label: "Auto" },
              ...availableWireSizes.map((w) => ({ value: w, label: w })),
            ]}
            onChange={(v) => update("wire_size", v || undefined)}
          />
        </div>

        {/* LCD-STYLED OUTPUT */}
        <LcdScreen rec={rec} process={state.process ?? "mig"} />
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <ul className="space-y-1 text-[color:var(--color-foreground)]">
          {rec.notes.map((n, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[color:var(--color-brand)]" />
              <span>{n}</span>
            </li>
          ))}
        </ul>
        {rec.cautions && rec.cautions.length > 0 && (
          <div className="rounded-md border border-[color:var(--color-brand)]/40 bg-[color:var(--color-brand-soft)] p-2 text-xs text-[color:var(--color-brand-strong)]">
            {rec.cautions.map((c, i) => (
              <p key={i} className="flex items-start gap-1.5">
                <span>⚠</span>
                <span>{c}</span>
              </p>
            ))}
          </div>
        )}
        <p className="text-[10px] text-[color:var(--color-muted)]">
          Approximate starting values. The welder's Auto Weld mode computes
          exact synergic settings from the material + diameter you select on
          the LCD (see page 20).
        </p>
      </div>
    </ArtifactCard>
  );
}

function SelectField({
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

function LcdScreen({
  rec,
  process,
}: {
  rec: Recommendation;
  process: Process;
}): React.JSX.Element {
  return (
    <div className="flex flex-col items-stretch gap-0 rounded-lg border border-[color:var(--color-border-strong)] bg-[#0a0f0c] p-4 text-[#c8ffc8] shadow-inner">
      <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-widest text-[#c8ffc8]/60">
        <span>Auto Weld</span>
        <span>{PROCESS_LABELS[process]}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <LcdField label={rec.primaryLabel} value={rec.primaryValue} big />
        {rec.secondaryValue && rec.secondaryLabel && (
          <LcdField label={rec.secondaryLabel} value={rec.secondaryValue} big />
        )}
      </div>
      {(rec.gas || rec.scfh) && (
        <div
          className={cn(
            "mt-3 grid gap-2 border-t border-[#c8ffc8]/15 pt-3 font-mono text-xs",
            rec.gas && rec.scfh ? "grid-cols-2" : "grid-cols-1",
          )}
        >
          {rec.gas && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#c8ffc8]/60">
                Gas
              </div>
              <div className="text-sm">{rec.gas}</div>
            </div>
          )}
          {rec.scfh && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#c8ffc8]/60">
                Flow
              </div>
              <div className="text-sm">{rec.scfh}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LcdField({
  label,
  value,
  big,
}: {
  label: string;
  value: string;
  big?: boolean;
}): React.JSX.Element {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-[#c8ffc8]/60">
        {label}
      </div>
      <div
        className={cn(
          "font-mono tabular-nums text-[#c8ffc8]",
          big ? "mt-0.5 text-2xl" : "mt-0.5 text-base",
        )}
      >
        {value}
      </div>
    </div>
  );
}
