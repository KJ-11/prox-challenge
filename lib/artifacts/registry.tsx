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
import {
  SettingsConfigurator,
  SettingsConfiguratorParamsSchema,
} from "./SettingsConfigurator";
import {
  TroubleshootingTree,
  TroubleshootingTreeParamsSchema,
} from "./TroubleshootingTree";
import {
  ProceduralWalkthrough,
  ProceduralWalkthroughParamsSchema,
} from "./ProceduralWalkthrough";
import {
  ComponentHighlight,
  ComponentHighlightParamsSchema,
} from "./ComponentHighlight";
import {
  SelectionChartInteractive,
  SelectionChartInteractiveParamsSchema,
} from "./SelectionChartInteractive";

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
  settings_configurator: {
    component: (p) => (
      <SettingsConfigurator
        {...(p as z.infer<typeof SettingsConfiguratorParamsSchema>)}
      />
    ),
    schema: SettingsConfiguratorParamsSchema,
    label: "Settings configurator",
  },
  troubleshooting_tree: {
    component: (p) => (
      <TroubleshootingTree
        {...(p as z.infer<typeof TroubleshootingTreeParamsSchema>)}
      />
    ),
    schema: TroubleshootingTreeParamsSchema,
    label: "Troubleshooting tree",
  },
  procedural_walkthrough: {
    component: (p) => (
      <ProceduralWalkthrough
        {...(p as z.infer<typeof ProceduralWalkthroughParamsSchema>)}
      />
    ),
    schema: ProceduralWalkthroughParamsSchema,
    label: "Procedural walkthrough",
  },
  component_highlight: {
    component: (p) => (
      <ComponentHighlight
        {...(p as z.infer<typeof ComponentHighlightParamsSchema>)}
      />
    ),
    schema: ComponentHighlightParamsSchema,
    label: "Component highlight",
  },
  selection_chart_interactive: {
    component: (p) => (
      <SelectionChartInteractive
        {...(p as z.infer<typeof SelectionChartInteractiveParamsSchema>)}
      />
    ),
    schema: SelectionChartInteractiveParamsSchema,
    label: "Interactive selection chart",
  },
};

export function renderArtifact(
  artifactType: string,
  params: unknown,
): ReactNode {
  const entry = REGISTRY[artifactType];
  if (!entry) {
    return <Unknown artifactType={artifactType} params={params} />;
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
  return REGISTRY[artifactType]?.label ?? artifactType;
}

function Unknown({
  artifactType,
  params,
}: {
  artifactType: string;
  params: unknown;
}): React.JSX.Element {
  return (
    <div className="rounded-lg border border-dashed border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-muted)] p-4 text-xs text-[color:var(--color-muted)]">
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded-sm bg-[color:var(--color-surface)] px-1.5 py-0.5 font-mono text-[10px] uppercase text-[color:var(--color-muted)]">
          unknown type
        </span>
        <span className="font-semibold text-[color:var(--color-foreground)]">
          {artifactType}
        </span>
      </div>
      <p>
        The agent emitted an artifact type that isn't in the registry.
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
