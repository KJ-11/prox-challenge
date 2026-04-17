"use client";

import Image from "next/image";
import { z } from "zod";
import { ArrowUpRight } from "lucide-react";
import { ArtifactCard } from "./ArtifactCard";
import { FrontPanel, type PanelAnchor } from "./FrontPanel";
import { lookupFigure, toKnowledgeUrl } from "./data";

/* ---------- params ---------- */

export const ComponentHighlightParamsSchema = z.object({
  figure_id: z
    .string()
    .describe('Figure ID from the FIGURES catalog — e.g. "front-panel-controls".'),
  part_name: z
    .string()
    .describe(
      'Free-form name of the part to highlight — e.g. "feed tensioner", "positive socket", "power switch".',
    ),
});

export type ComponentHighlightParams = z.infer<
  typeof ComponentHighlightParamsSchema
>;

/* ---------- anchor mapping ---------- */

/** Map user-friendly part names to FrontPanel SVG anchors. */
const ANCHOR_ALIASES: Array<{ anchor: PanelAnchor; keywords: string[] }> = [
  { anchor: "lcd", keywords: ["lcd", "display", "screen"] },
  {
    anchor: "home_button",
    keywords: ["home button", "home"],
  },
  {
    anchor: "back_button",
    keywords: ["back button", "back"],
  },
  { anchor: "left_knob", keywords: ["left knob", "wire feed knob"] },
  {
    anchor: "main_knob",
    keywords: ["main knob", "main control", "control knob", "center knob"],
  },
  {
    anchor: "right_knob",
    keywords: ["right knob", "voltage knob"],
  },
  { anchor: "power_switch", keywords: ["power switch", "power button", "on off", "on/off"] },
  {
    anchor: "mig_gun_socket",
    keywords: [
      "mig gun socket",
      "spool gun socket",
      "gun cable socket",
      "mig gun connector",
      "gun socket",
    ],
  },
  {
    anchor: "spool_gun_gas_outlet",
    keywords: ["spool gun gas", "gas outlet", "spool gas"],
  },
  {
    anchor: "negative_socket",
    keywords: ["negative socket", "negative", "minus socket", "− socket", "- socket"],
  },
  {
    anchor: "wire_feed_power_cable",
    keywords: [
      "wire feed power cable",
      "wire feed cable",
      "wfs cable",
      "wire feed power",
    ],
  },
  {
    anchor: "positive_socket",
    keywords: ["positive socket", "positive", "plus socket", "+ socket"],
  },
  { anchor: "storage_compartment", keywords: ["storage", "compartment"] },
  { anchor: "vulcan_logo", keywords: ["vulcan logo", "logo", "brand"] },
];

function matchFrontPanelAnchor(partName: string): PanelAnchor | null {
  const lower = partName.toLowerCase().trim();
  for (const { anchor, keywords } of ANCHOR_ALIASES) {
    if (keywords.some((k) => lower.includes(k))) return anchor;
  }
  return null;
}

/** Heuristic: if the figure id or keywords mention "front panel", use the SVG. */
function isFrontPanelFigure(figureId: string): boolean {
  return /front[-_ ]?panel/i.test(figureId);
}

/* ---------- artifact ---------- */

export function ComponentHighlight(
  params: ComponentHighlightParams,
): React.JSX.Element {
  const parsed = ComponentHighlightParamsSchema.parse(params);
  const figure = lookupFigure(parsed.figure_id);

  if (!figure) {
    return (
      <ArtifactCard
        title="Component location"
        subtitle={`Unknown figure "${parsed.figure_id}"`}
      >
        <p className="text-sm text-[color:var(--color-muted)]">
          No figure with that id in the catalog. The agent should pick an id
          from the FIGURES section of the catalog.
        </p>
      </ArtifactCard>
    );
  }

  const anchor = isFrontPanelFigure(figure.id)
    ? matchFrontPanelAnchor(parsed.part_name)
    : null;

  return (
    <ArtifactCard
      title={parsed.part_name}
      subtitle={`Located on: ${figure.caption}`}
      sources={[
        {
          label: figure.caption,
          page: figure.page,
          document: figure.source_document,
        },
      ]}
    >
      {anchor ? (
        <div className="mx-auto w-full max-w-[380px]">
          <FrontPanel highlightAnchors={[anchor]} />
        </div>
      ) : (
        <div className="relative">
          <div className="relative mx-auto aspect-[3/4] w-full max-w-[420px] overflow-hidden rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)]">
            <Image
              src={toKnowledgeUrl(figure.page_image_ref)}
              alt={`${figure.caption} showing ${parsed.part_name}`}
              fill
              sizes="420px"
              className="object-contain p-2"
            />
          </div>
          <span className="mx-auto mt-2 inline-flex items-center gap-1 rounded-full border border-[color:var(--color-brand)] bg-[color:var(--color-brand-soft)] px-2.5 py-1 text-[11px] font-mono font-semibold text-[color:var(--color-brand-strong)]">
            <ArrowUpRight className="h-3 w-3" />
            Find on page: {parsed.part_name}
          </span>
        </div>
      )}

      {figure.depicts.length > 0 && (
        <p className="mt-3 text-xs text-[color:var(--color-muted)]">
          Other labeled parts on this figure:{" "}
          {figure.depicts
            .filter((d) => d.toLowerCase() !== parsed.part_name.toLowerCase())
            .slice(0, 6)
            .join(", ")}
          .
        </p>
      )}
    </ArtifactCard>
  );
}
