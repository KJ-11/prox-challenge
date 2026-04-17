"use client";

import type { ReactNode } from "react";
import { z } from "zod";
import {
  PolarityDiagram,
  PolarityDiagramParamsSchema,
} from "./PolarityDiagram";
import {
  DutyCycleMatrix,
  DutyCycleMatrixParamsSchema,
} from "./DutyCycleMatrix";
import {
  WeldComparison,
  WeldComparisonParamsSchema,
} from "./WeldComparison";

interface Entry {
  component: (params: unknown) => React.JSX.Element;
  schema: z.ZodType;
  label: string;
}

const REGISTRY: Record<string, Entry> = {
  polarity_diagram: {
    component: (p) => (
      <PolarityDiagram {...(p as z.infer<typeof PolarityDiagramParamsSchema>)} />
    ),
    schema: PolarityDiagramParamsSchema,
    label: "Polarity diagram",
  },
  duty_cycle_matrix: {
    component: (p) => (
      <DutyCycleMatrix
        {...(p as z.infer<typeof DutyCycleMatrixParamsSchema>)}
      />
    ),
    schema: DutyCycleMatrixParamsSchema,
    label: "Duty cycle matrix",
  },
  weld_comparison: {
    component: (p) => (
      <WeldComparison
        {...(p as z.infer<typeof WeldComparisonParamsSchema>)}
      />
    ),
    schema: WeldComparisonParamsSchema,
    label: "Weld photo comparison",
  },
};

const PLANNED_LABELS: Record<string, string> = {
  settings_configurator: "Settings configurator",
  troubleshooting_tree: "Troubleshooting tree",
  component_highlight: "Component highlight",
  selection_chart_interactive: "Interactive selection chart",
  procedural_walkthrough: "Procedural walkthrough",
};

export function renderArtifact(
  artifactType: string,
  params: unknown,
): ReactNode {
  const entry = REGISTRY[artifactType];
  if (!entry) {
    return (
      <ComingSoon
        artifactType={artifactType}
        params={params}
        label={PLANNED_LABELS[artifactType]}
      />
    );
  }
  const parsed = entry.schema.safeParse(params);
  if (!parsed.success) {
    return (
      <ArtifactError
        artifactType={artifactType}
        message={parsed.error.message}
        params={params}
      />
    );
  }
  return entry.component(parsed.data);
}

export function artifactLabel(artifactType: string): string {
  return (
    REGISTRY[artifactType]?.label ??
    PLANNED_LABELS[artifactType] ??
    artifactType
  );
}

function ComingSoon({
  artifactType,
  params,
  label,
}: {
  artifactType: string;
  params: unknown;
  label?: string;
}): React.JSX.Element {
  return (
    <div className="rounded-lg border border-dashed border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-muted)] p-4 text-xs text-[color:var(--color-muted)]">
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded-sm bg-[color:var(--color-brand-soft)] px-1.5 py-0.5 font-mono text-[10px] uppercase text-[color:var(--color-brand-strong)]">
          coming soon
        </span>
        <span className="font-semibold text-[color:var(--color-foreground)]">
          {label ?? artifactType}
        </span>
      </div>
      <p>
        The agent requested this artifact template, which isn't built yet. The
        params it emitted are preserved below for reference.
      </p>
      <pre className="mt-2 overflow-auto rounded bg-[color:var(--color-surface)] p-2 font-mono text-[10px] text-[color:var(--color-foreground)]/80">
        {JSON.stringify(params, null, 2)}
      </pre>
    </div>
  );
}

function ArtifactError({
  artifactType,
  message,
  params,
}: {
  artifactType: string;
  message: string;
  params: unknown;
}): React.JSX.Element {
  return (
    <div className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] p-4 text-xs">
      <div className="mb-1 font-semibold text-[color:var(--color-foreground)]">
        Artifact params invalid ({artifactType})
      </div>
      <p className="text-[color:var(--color-muted)]">{message}</p>
      <pre className="mt-2 overflow-auto rounded bg-[color:var(--color-surface)] p-2 font-mono text-[10px] text-[color:var(--color-foreground)]/80">
        {JSON.stringify(params, null, 2)}
      </pre>
    </div>
  );
}
