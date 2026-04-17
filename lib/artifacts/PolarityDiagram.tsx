import { z } from "zod";
import { ArtifactCard } from "./ArtifactCard";
import {
  FrontPanel,
  ANCHORS,
  type PanelAnchor,
  PANEL_VIEWBOX,
} from "./FrontPanel";

/* ---------- data model ---------- */

export const PolarityDiagramParamsSchema = z.object({
  process: z.enum(["mig", "flux_cored", "tig", "stick"]),
  highlight: z
    .enum([
      "positive_socket",
      "negative_socket",
      "mig_gun_socket",
      "wire_feed_power_cable",
      "spool_gun_gas_outlet",
    ])
    .optional(),
  compare_with: z
    .enum(["mig", "flux_cored", "tig", "stick"])
    .optional(),
});

export type PolarityDiagramParams = z.infer<
  typeof PolarityDiagramParamsSchema
>;

type Process = PolarityDiagramParams["process"];

interface Cable {
  id: string;
  label: string;
  /** Where the external termination (clamp, gun, torch) sits around the panel. */
  origin: "left" | "right" | "lower_left" | "lower_right";
  /** Anchor on the panel the cable plugs into. */
  target: PanelAnchor;
  /** Color role — drives stroke color. */
  role: "ground" | "work" | "wire_feed";
}

const PROCESS_LABELS: Record<Process, string> = {
  mig: "MIG (solid core, gas shielded)",
  flux_cored: "Flux-Cored (gasless)",
  tig: "TIG",
  stick: "Stick",
};

const POLARITY_LABEL: Record<Process, { short: string; full: string }> = {
  mig: { short: "DCEP", full: "Direct Current Electrode Positive" },
  flux_cored: { short: "DCEN", full: "Direct Current Electrode Negative" },
  tig: { short: "DCEN", full: "Direct Current Electrode Negative" },
  stick: { short: "DCEP", full: "Direct Current Electrode Positive" },
};

const SOURCE_PAGE: Record<Process, number> = {
  mig: 14,
  flux_cored: 13,
  tig: 24,
  stick: 27,
};

function cablesForProcess(process: Process): Cable[] {
  switch (process) {
    case "mig":
      return [
        {
          id: "ground",
          label: "Ground clamp",
          origin: "left",
          target: "negative_socket",
          role: "ground",
        },
        {
          id: "wfs",
          label: "Wire Feed Power",
          origin: "lower_right",
          target: "positive_socket",
          role: "wire_feed",
        },
        {
          id: "gun",
          label: "MIG gun",
          origin: "lower_left",
          target: "mig_gun_socket",
          role: "work",
        },
      ];
    case "flux_cored":
      return [
        {
          id: "ground",
          label: "Ground clamp",
          origin: "left",
          target: "positive_socket",
          role: "ground",
        },
        {
          id: "wfs",
          label: "Wire Feed Power",
          origin: "lower_left",
          target: "negative_socket",
          role: "wire_feed",
        },
        {
          id: "gun",
          label: "MIG gun",
          origin: "lower_right",
          target: "mig_gun_socket",
          role: "work",
        },
      ];
    case "tig":
      return [
        {
          id: "ground",
          label: "Ground clamp",
          origin: "left",
          target: "positive_socket",
          role: "ground",
        },
        {
          id: "torch",
          label: "TIG torch",
          origin: "lower_right",
          target: "negative_socket",
          role: "work",
        },
      ];
    case "stick":
      return [
        {
          id: "ground",
          label: "Ground clamp",
          origin: "left",
          target: "negative_socket",
          role: "ground",
        },
        {
          id: "holder",
          label: "Electrode holder",
          origin: "lower_right",
          target: "positive_socket",
          role: "work",
        },
      ];
  }
}

/* ---------- cable path geometry ---------- */

const EXTERIOR_ANCHORS: Record<
  Cable["origin"],
  { x: number; y: number; labelAnchor: "start" | "end" | "middle" }
> = {
  left: { x: -45, y: 345, labelAnchor: "end" },
  right: { x: PANEL_VIEWBOX.width + 45, y: 345, labelAnchor: "start" },
  lower_left: {
    x: 40,
    y: PANEL_VIEWBOX.height + 20,
    labelAnchor: "middle",
  },
  lower_right: {
    x: PANEL_VIEWBOX.width - 40,
    y: PANEL_VIEWBOX.height + 20,
    labelAnchor: "middle",
  },
};

const ROLE_STROKE: Record<Cable["role"], string> = {
  ground: "var(--color-negative)",
  work: "var(--color-brand)",
  wire_feed: "var(--color-positive)",
};

function cablePath(c: Cable): string {
  const from = EXTERIOR_ANCHORS[c.origin];
  const to = ANCHORS[c.target];
  // Simple cubic bezier with a control point biased toward the exterior.
  const cx1 = (from.x + to.x) / 2;
  const cy1 =
    c.origin === "left" || c.origin === "right"
      ? from.y
      : (from.y + to.y) / 2;
  const cx2 = (from.x + to.x) / 2;
  const cy2 =
    c.origin === "left" || c.origin === "right"
      ? to.y
      : (from.y + to.y) / 2;
  return `M ${from.x} ${from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${to.x} ${to.y}`;
}

function terminalShape(c: Cable): React.JSX.Element {
  const from = EXTERIOR_ANCHORS[c.origin];
  const stroke = ROLE_STROKE[c.role];
  return (
    <g>
      {/* clamp / gun blob at exterior end */}
      <circle cx={from.x} cy={from.y} r="6" fill={stroke} />
      {/* small connector at plug end */}
      <circle
        cx={ANCHORS[c.target].x}
        cy={ANCHORS[c.target].y}
        r="3.5"
        fill={stroke}
      />
    </g>
  );
}

/* ---------- the artifact ---------- */

interface SinglePanelProps {
  process: Process;
  highlight?: PolarityDiagramParams["highlight"];
}

function SinglePanel({ process, highlight }: SinglePanelProps): React.JSX.Element {
  const cables = cablesForProcess(process);
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold tracking-tight">
          {PROCESS_LABELS[process]}
        </span>
        <span className="rounded-sm border border-[color:var(--color-brand)] bg-[color:var(--color-brand-soft)] px-1.5 py-[1px] text-[10px] font-mono font-semibold text-[color:var(--color-brand-strong)]">
          {POLARITY_LABEL[process].short}
        </span>
      </div>

      <div className="relative mx-auto w-full max-w-[440px]">
        <svg
          viewBox={`-140 0 ${PANEL_VIEWBOX.width + 280} ${PANEL_VIEWBOX.height + 55}`}
          className="w-full h-auto"
          role="img"
          aria-label={`Polarity setup for ${PROCESS_LABELS[process]}`}
        >
          {/* FrontPanel rendered inline via a nested <svg> using its viewBox */}
          <g>
            <foreignObject x="0" y="0" width="320" height="400">
              <FrontPanel
                highlightAnchors={
                  highlight ? ([highlight] as PanelAnchor[]) : undefined
                }
              />
            </foreignObject>
          </g>

          {/* cables */}
          {cables.map((c) => (
            <g key={c.id}>
              <path
                d={cablePath(c)}
                fill="none"
                stroke={ROLE_STROKE[c.role]}
                strokeWidth="3"
                strokeLinecap="round"
              />
              {terminalShape(c)}
              <CableLabel cable={c} />
            </g>
          ))}
        </svg>
      </div>

      <ConnectionLegend cables={cables} />
    </div>
  );
}

function CableLabel({ cable }: { cable: Cable }): React.JSX.Element {
  const from = EXTERIOR_ANCHORS[cable.origin];
  const textAnchor = from.labelAnchor;
  const offsetX =
    cable.origin === "left"
      ? -12
      : cable.origin === "right"
        ? 12
        : 0;
  const offsetY =
    cable.origin === "lower_left" || cable.origin === "lower_right" ? 18 : -10;
  return (
    <text
      x={from.x + offsetX}
      y={from.y + offsetY}
      textAnchor={textAnchor}
      fontSize="10"
      fontWeight="600"
      fontFamily="var(--font-sans)"
      fill="var(--color-foreground)"
    >
      {cable.label}
    </text>
  );
}

function ConnectionLegend({ cables }: { cables: Cable[] }): React.JSX.Element {
  const socketLabel: Record<PanelAnchor, string> = {
    positive_socket: "Positive (+)",
    negative_socket: "Negative (−)",
    mig_gun_socket: "MIG gun socket",
    wire_feed_power_cable: "Wire feed power cable",
    spool_gun_gas_outlet: "Spool gun gas outlet",
    lcd: "LCD",
    home_button: "Home",
    back_button: "Back",
    left_knob: "Left knob",
    main_knob: "Main knob",
    right_knob: "Right knob",
    vulcan_logo: "Logo",
    power_switch: "Power",
    storage_compartment: "Storage",
  };
  return (
    <ul className="w-full space-y-1 text-xs">
      {cables.map((c) => (
        <li key={c.id} className="flex items-center gap-2">
          <span
            className="inline-block h-0.5 w-5 rounded-sm"
            style={{ backgroundColor: ROLE_STROKE[c.role] }}
          />
          <span className="font-medium">{c.label}</span>
          <span className="text-[color:var(--color-muted)]">→</span>
          <span className="font-mono text-[color:var(--color-foreground)]">
            {socketLabel[c.target]}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PolarityDiagram(
  params: PolarityDiagramParams,
): React.JSX.Element {
  const parsed = PolarityDiagramParamsSchema.parse(params);
  const processes: Process[] = parsed.compare_with
    ? [parsed.process, parsed.compare_with]
    : [parsed.process];

  const title = parsed.compare_with
    ? `Polarity: ${PROCESS_LABELS[parsed.process].split(" ")[0]} vs ${PROCESS_LABELS[parsed.compare_with].split(" ")[0]}`
    : `Polarity setup — ${PROCESS_LABELS[parsed.process]}`;

  const pages = processes.map((p) => SOURCE_PAGE[p]);
  const uniquePages = Array.from(new Set(pages));

  return (
    <ArtifactCard
      title={title}
      subtitle="Cable-to-socket mapping"
      badge={parsed.compare_with ? undefined : POLARITY_LABEL[parsed.process].short}
      sources={uniquePages.map((page) => ({
        label: "Polarity setup",
        page,
        document: "owner_manual" as const,
      }))}
    >
      <div
        className={
          processes.length > 1
            ? "grid grid-cols-1 md:grid-cols-2 gap-6"
            : "flex justify-center"
        }
      >
        {processes.map((p, i) => (
          <SinglePanel
            key={i}
            process={p}
            highlight={i === 0 ? parsed.highlight : undefined}
          />
        ))}
      </div>
    </ArtifactCard>
  );
}
