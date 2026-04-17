"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { z } from "zod";
import { ArtifactCard } from "./ArtifactCard";
import { toKnowledgeUrl } from "./data";
import { cn } from "@/lib/utils";

/* ---------- params ---------- */

const TOPICS = [
  "cable_mig",
  "cable_flux",
  "cable_tig",
  "cable_stick",
  "spool_load_2lb",
  "spool_load_10lb",
  "tungsten_sharpen",
  "nozzle_clean",
  "feed_tension_set",
] as const;

export type ProceduralWalkthroughTopic = (typeof TOPICS)[number];

export const ProceduralWalkthroughParamsSchema = z.object({
  topic: z.enum(TOPICS),
});

export type ProceduralWalkthroughParams = z.infer<
  typeof ProceduralWalkthroughParamsSchema
>;

/* ---------- step data ---------- */

interface Step {
  title: string;
  body: string;
  page: number;
  page_image_ref: string;
  bullets?: string[];
}

interface Procedure {
  title: string;
  subtitle: string;
  badge: string;
  document: "owner_manual" | "quick_start" | "selection_chart";
  steps: Step[];
}

const OM = (p: number) => `knowledge/pages/owner_manual/p${String(p).padStart(3, "0")}.png`;
const QS = (p: number) => `knowledge/pages/quick_start/p${String(p).padStart(3, "0")}.png`;

const PROCEDURES: Record<ProceduralWalkthroughTopic, Procedure> = {
  cable_mig: {
    title: "MIG cable setup",
    subtitle: "Solid-core wire with shielding gas — DCEP polarity",
    badge: "DCEP",
    document: "owner_manual",
    steps: [
      {
        title: "Plug ground clamp into the negative (−) socket",
        body: "Twist clockwise all the way to lock. Ground clamp goes to the workpiece or a grounded metal bench.",
        page: 14,
        page_image_ref: OM(14),
      },
      {
        title: "Plug the wire feed power cable into the positive (+) socket",
        body: "This is DCEP — Direct Current Electrode Positive. Reversed from flux-cored.",
        page: 14,
        page_image_ref: OM(14),
      },
      {
        title: "Connect the MIG gun cable to the gun socket",
        body: "Large round socket above the output sockets. Push the connector fully in and tighten the knob inside the welder on the wire feed mechanism.",
        page: 13,
        page_image_ref: OM(13),
      },
      {
        title: "Connect the wire feed control cable",
        body: "Small round socket inside the welder behind the door. Plug fits in one specific orientation.",
        page: 13,
        page_image_ref: OM(13),
      },
    ],
  },
  cable_flux: {
    title: "Flux-cored cable setup",
    subtitle: "Self-shielded, gasless wire — DCEN polarity (reversed from MIG)",
    badge: "DCEN",
    document: "owner_manual",
    steps: [
      {
        title: "Plug ground clamp into the POSITIVE (+) socket",
        body: "This is the opposite of MIG. If you ran solid wire last and leave it plugged into negative, your flux-cored welds will be full of porosity.",
        page: 13,
        page_image_ref: OM(13),
      },
      {
        title: "Plug the wire feed power cable into the NEGATIVE (−) socket",
        body: "Twist clockwise to lock.",
        page: 13,
        page_image_ref: OM(13),
      },
      {
        title: "Connect the MIG gun cable to the gun socket",
        body: "Same gun as MIG — the switch is purely polarity + feed roller + wire type.",
        page: 13,
        page_image_ref: OM(13),
      },
      {
        title: "Flip the feed roller to the knurled groove",
        body: "The knurled side (labeled 0.030/0.035 or 0.045) grips the softer flux-cored tube without crushing it. The V-groove side is for solid wire only.",
        page: 12,
        page_image_ref: OM(12),
      },
      {
        title: "No shielding gas — skip the regulator",
        body: "Close any gas cylinder if one is attached. The flux core self-shields the arc.",
        page: 13,
        page_image_ref: OM(13),
      },
    ],
  },
  cable_tig: {
    title: "TIG cable setup",
    subtitle: "DC TIG, ground → positive, torch → negative",
    badge: "DCEN",
    document: "owner_manual",
    steps: [
      {
        title: "Plug ground clamp into POSITIVE (+)",
        body: "TIG runs DCEN for steel and stainless — electrode (torch) is negative.",
        page: 24,
        page_image_ref: OM(24),
      },
      {
        title: "Plug the TIG torch cable into NEGATIVE (−)",
        body: "Twist clockwise to lock. The torch cable is separate from any MIG gun — you can remove the MIG gun entirely for TIG.",
        page: 24,
        page_image_ref: OM(24),
      },
      {
        title: "Connect 100% Argon shielding gas",
        body: "Thread the regulator onto the cylinder, gas hose from regulator outlet to the TIG torch's built-in gas fitting.",
        page: 25,
        page_image_ref: OM(25),
      },
      {
        title: "Connect the foot pedal inside the welder",
        body: "Small aviation-style connector; thread collar clockwise until tight. Pedal controls amperage in real time.",
        page: 24,
        page_image_ref: OM(24),
      },
    ],
  },
  cable_stick: {
    title: "Stick cable setup",
    subtitle: "Shielded Metal Arc — electrode holder → positive (for most rods)",
    badge: "DCEP",
    document: "owner_manual",
    steps: [
      {
        title: "Plug ground clamp into NEGATIVE (−)",
        body: "Twist clockwise to lock.",
        page: 27,
        page_image_ref: OM(27),
      },
      {
        title: "Plug electrode holder cable into POSITIVE (+)",
        body: "Default DCEP setup for E7018, E6013, and most common mild-steel rods. A few electrodes (E6012) run DCEN — always check the electrode manufacturer's stamp.",
        page: 27,
        page_image_ref: OM(27),
      },
    ],
  },
  spool_load_2lb: {
    title: "Load a 2-lb wire spool",
    subtitle: "Default MIG gun spool — for consumer sizes",
    badge: "2 LB",
    document: "owner_manual",
    steps: [
      {
        title: "Turn off the welder and unplug",
        body: "Always. The feed mechanism is at welding voltage when energized.",
        page: 10,
        page_image_ref: OM(10),
      },
      {
        title: "Open the door and remove the wingnut + spacer",
        body: "Set aside. If replacing a spool, remove the old one and pull any remaining wire from the liner.",
        page: 10,
        page_image_ref: OM(10),
      },
      {
        title: "Place the spool over the spindle",
        body: "The spool must unwind CLOCKWISE when viewed from the door side. Wrong direction causes birdnests and feed failures.",
        page: 10,
        page_image_ref: OM(10),
      },
      {
        title: "Replace spacer, tighten wingnut",
        body: "Tighten until the spool cannot spin freely by hand. Too loose lets the wire unravel inside the cabinet.",
        page: 10,
        page_image_ref: OM(10),
      },
    ],
  },
  spool_load_10lb: {
    title: "Load a 10–12 lb wire spool",
    subtitle: "Requires the included spool adapter and knob",
    badge: "10-12 LB",
    document: "owner_manual",
    steps: [
      {
        title: "Turn off the welder and unplug",
        body: "Same as 2-lb loading.",
        page: 11,
        page_image_ref: OM(11),
      },
      {
        title: "Install the 10–12 lb spool adapter over the spindle",
        body: "Line up the adapter's pin with the hole on the spindle.",
        page: 11,
        page_image_ref: OM(11),
      },
      {
        title: "Place the larger spool over the adapter",
        body: "Line up the spool's hole with the adapter's pin. Wire must unwind CLOCKWISE.",
        page: 11,
        page_image_ref: OM(11),
      },
      {
        title: "Replace spacer and wingnut",
        body: "Tighten the wingnut as before.",
        page: 11,
        page_image_ref: OM(11),
      },
      {
        title: "Screw the spool knob into the adapter",
        body: "Keeps the spool captive under the larger moment arm of a heavier roll.",
        page: 11,
        page_image_ref: OM(11),
      },
    ],
  },
  tungsten_sharpen: {
    title: "Sharpen a tungsten electrode",
    subtitle: "Pointed tip for DC TIG on steel; balled tip for AC on aluminum",
    badge: "TIG",
    document: "owner_manual",
    steps: [
      {
        title: "Shut off the welder and let the electrode cool",
        body: "Tungsten is still hot for a while after welding.",
        page: 26,
        page_image_ref: OM(26),
      },
      {
        title: "Remove the back cap and pull the electrode from the FRONT of the torch",
        body: "Pulling it from the rear drags the tungsten through the collet, which damages the collet and burrs the electrode.",
        page: 26,
        page_image_ref: OM(26),
      },
      {
        title: "If the tip is contaminated, snap off the bad section",
        body: "Grip with pliers above the damage and break it cleanly.",
        page: 26,
        page_image_ref: OM(26),
      },
      {
        title: "Grind PARALLEL to the electrode's length",
        body: "Use a dedicated fine-grit wheel reserved for tungsten (other contamination will contaminate your welds). Perpendicular grinding creates striations that destabilize the arc.",
        page: 26,
        page_image_ref: OM(26),
      },
      {
        title: "Target a conical tip 2.5× the electrode's diameter long",
        body: "So a 3/32\" electrode gets a cone about 0.25\" long.",
        page: 26,
        page_image_ref: OM(26),
      },
      {
        title: "Reinsert with 1/8\"–1/4\" protruding past the ceramic nozzle",
        body: "Too short risks arcing to the nozzle; too long makes gas coverage bad.",
        page: 26,
        page_image_ref: OM(26),
      },
    ],
  },
  nozzle_clean: {
    title: "Clean the MIG gun nozzle & contact tip",
    subtitle: "Do this before weld quality degrades",
    badge: "MIG",
    document: "owner_manual",
    steps: [
      {
        title: "Ensure the gun is cool and the welder is unplugged",
        body: "Then pull the nozzle straight off the end of the gun.",
        page: 41,
        page_image_ref: OM(41),
      },
      {
        title: "Wire-brush the inside of the nozzle",
        body: "Remove built-up spatter. A damaged or deformed nozzle will distort the gas shield.",
        page: 41,
        page_image_ref: OM(41),
      },
      {
        title: "Unscrew the contact tip counterclockwise",
        body: "Slide it off the welding wire.",
        page: 41,
        page_image_ref: OM(41),
      },
      {
        title: "Clean the tip",
        body: "Wire-brush the outside; run a tip-cleaner file through the hole. The hole must be even and circular — any oblong or bulged shape means replace the tip.",
        page: 41,
        page_image_ref: OM(41),
      },
      {
        title: "Reinstall: tip first, then nozzle",
        body: "Thread the contact tip back on, replace the nozzle, cut the wire to ~1/2\" stickout.",
        page: 41,
        page_image_ref: OM(41),
      },
    ],
  },
  feed_tension_set: {
    title: "Set wire-feed tension",
    subtitle: "Right tension feeds cleanly; wrong tension birdnests or crushes",
    badge: "SETUP",
    document: "owner_manual",
    steps: [
      {
        title: "Loosen the feed tensioner knob",
        body: "Turn counterclockwise until the idler arm can swing freely.",
        page: 15,
        page_image_ref: OM(15),
      },
      {
        title: "Thread wire through the inlet liner and feed guides",
        body: "At least 12\" of wire. Cut the end square first — burrs or crimps will jam.",
        page: 15,
        page_image_ref: OM(15),
      },
      {
        title: "Close the idler arm; swing the tensioner up to latch",
        body: "Then you can release the wire — it's held by the tensioner.",
        page: 15,
        page_image_ref: OM(15),
      },
      {
        title: "Set starting tension",
        body: "3-5 for solid wire, 2-3 for flux-cored. Flux-cored is softer — too much tension crushes it.",
        page: 15,
        page_image_ref: OM(15),
      },
      {
        title: "Trigger-test against a wood block",
        body: "Wire should bend under feed pressure 2-3\" from the block. If it stops, tension is too low. If it pushes through straight into the wood, it's also OK but on the high side.",
        page: 17,
        page_image_ref: OM(17),
      },
    ],
  },
};

/* ---------- artifact ---------- */

export function ProceduralWalkthrough(
  params: ProceduralWalkthroughParams,
): React.JSX.Element {
  const parsed = ProceduralWalkthroughParamsSchema.parse(params);
  const procedure = PROCEDURES[parsed.topic];
  const [index, setIndex] = useState(0);
  const total = procedure.steps.length;
  const step = procedure.steps[index];

  const go = (delta: number) => {
    setIndex((i) => Math.max(0, Math.min(total - 1, i + delta)));
  };

  return (
    <ArtifactCard
      title={procedure.title}
      subtitle={procedure.subtitle}
      badge={procedure.badge}
      sources={Array.from(new Set(procedure.steps.map((s) => s.page))).map(
        (p) => ({
          label: procedure.title,
          page: p,
          document: procedure.document,
        }),
      )}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-muted)]">
              Step {index + 1} of {total}
            </span>
            <span className="font-mono text-[10px] text-[color:var(--color-muted)]">
              page {step.page}
            </span>
          </div>
          <h4 className="text-base font-semibold text-[color:var(--color-foreground)]">
            {step.title}
          </h4>
          <p className="text-sm text-[color:var(--color-foreground)]">
            {step.body}
          </p>
          {step.bullets && step.bullets.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-sm text-[color:var(--color-foreground)]">
              {step.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between border-t border-[color:var(--color-border)] pt-3">
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={index === 0}
              className="inline-flex items-center gap-1 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-2 py-1 text-xs font-medium text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <StepDots total={total} index={index} onClick={setIndex} />
            <button
              type="button"
              onClick={() => go(1)}
              disabled={index >= total - 1}
              className="inline-flex items-center gap-1 rounded-md bg-[color:var(--color-brand)] px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-[color:var(--color-brand-strong)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <figure className="md:w-[260px]">
          <div className="relative aspect-[3/4] overflow-hidden rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)]">
            <Image
              src={toKnowledgeUrl(step.page_image_ref)}
              alt={`Manual page ${step.page}`}
              fill
              sizes="260px"
              className="object-contain p-2"
            />
          </div>
          <figcaption className="mt-1 text-center font-mono text-[10px] text-[color:var(--color-muted)]">
            {procedure.document === "quick_start"
              ? "Quick Start Guide"
              : "Owner's Manual"}{" "}
            · page {step.page}
          </figcaption>
        </figure>
      </div>
    </ArtifactCard>
  );
}

function StepDots({
  total,
  index,
  onClick,
}: {
  total: number;
  index: number;
  onClick: (i: number) => void;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onClick(i)}
          aria-label={`Go to step ${i + 1}`}
          className={cn(
            "h-1.5 rounded-full transition-all",
            i === index
              ? "w-5 bg-[color:var(--color-brand)]"
              : "w-1.5 bg-[color:var(--color-border-strong)] hover:bg-[color:var(--color-muted)]",
          )}
        />
      ))}
    </div>
  );
}
