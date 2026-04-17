"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SuggestedQuestion {
  prompt: string;
  label: string;
  description: string;
}

export const SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  {
    prompt: "What's the duty cycle for MIG welding at 200A on 240V?",
    label: "Duty cycle · MIG 200A",
    description: "Read the matrix and see the welding/resting clock.",
  },
  {
    prompt: "I'm switching from MIG to flux-cored — what changes?",
    label: "MIG ↔ Flux-cored",
    description: "See the polarity flip in a side-by-side diagram.",
  },
  {
    prompt: "What settings should I use for 1/8 inch mild steel MIG?",
    label: "Settings · 1/8\" steel",
    description: "Get recommended wire feed, voltage, and gas.",
  },
  {
    prompt: "I'm getting porosity in my flux-cored welds. What should I check?",
    label: "Troubleshoot porosity",
    description: "Flux-cored-specific causes in order of likelihood.",
  },
  {
    prompt: "Can I weld 3/8 inch aluminum with this machine?",
    label: "Compatibility · aluminum",
    description: "Navigate the selection chart with real constraints.",
  },
  {
    prompt: "How do I set up TIG welding from scratch?",
    label: "TIG setup walkthrough",
    description: "Step-by-step from cables to torch assembly.",
  },
];

export interface HomeScreenProps {
  onSelect: (prompt: string) => void;
}

export function HomeScreen({ onSelect }: HomeScreenProps): React.JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center px-4 py-8 md:py-12">
      <Hero />
      <div className="mt-10 grid w-full max-w-3xl grid-cols-1 gap-3 md:grid-cols-2">
        {SUGGESTED_QUESTIONS.map((q) => (
          <QuestionCard key={q.label} q={q} onSelect={onSelect} />
        ))}
      </div>
      <p className="mt-10 max-w-md text-center text-xs text-[color:var(--color-muted)]">
        Every answer cites the relevant manual page and renders visuals when
        the question calls for one — never prose where a diagram will do.
      </p>
    </div>
  );
}

function Hero(): React.JSX.Element {
  return (
    <div className="flex w-full max-w-2xl flex-col items-center text-center">
      <div className="relative h-32 w-32 overflow-hidden rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] md:h-40 md:w-40">
        <Image
          src="/product.webp"
          alt="Vulcan OmniPro 220 multiprocess welder"
          width={320}
          height={320}
          className="h-full w-full object-contain p-2"
          priority
        />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight md:text-3xl">
        Ask the Vulcan OmniPro 220 anything
      </h1>
      <p className="mt-2 max-w-md text-sm text-[color:var(--color-muted)] md:text-base">
        Multimodal technical expert for Harbor Freight's 220A multiprocess
        welder. Pick a prompt to see how it answers — or type your own.
      </p>
    </div>
  );
}

function QuestionCard({
  q,
  onSelect,
}: {
  q: SuggestedQuestion;
  onSelect: (prompt: string) => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onSelect(q.prompt)}
      className={cn(
        "group flex min-h-[96px] flex-col items-start gap-1.5 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 text-left transition-all",
        "hover:border-[color:var(--color-brand)] hover:bg-[color:var(--color-brand-soft)]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]",
      )}
    >
      <div className="flex w-full items-start justify-between gap-3">
        <span className="text-sm font-semibold tracking-tight text-[color:var(--color-foreground)]">
          {q.label}
        </span>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-[color:var(--color-muted)] transition-colors group-hover:text-[color:var(--color-brand)]" />
      </div>
      <p className="text-xs text-[color:var(--color-muted)]">{q.description}</p>
      <p className="mt-auto line-clamp-2 font-mono text-[11px] leading-relaxed text-[color:var(--color-foreground)]/70">
        {q.prompt}
      </p>
    </button>
  );
}
