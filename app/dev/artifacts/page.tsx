import {
  PolarityDiagram,
  type PolarityDiagramParams,
} from "@/lib/artifacts/PolarityDiagram";
import {
  DutyCycleMatrix,
  type DutyCycleMatrixParams,
} from "@/lib/artifacts/DutyCycleMatrix";
import {
  SettingsConfigurator,
  type SettingsConfiguratorParams,
} from "@/lib/artifacts/SettingsConfigurator";
import {
  TroubleshootingTree,
  type TroubleshootingTreeParams,
} from "@/lib/artifacts/TroubleshootingTree";
import {
  ProceduralWalkthrough,
  type ProceduralWalkthroughParams,
} from "@/lib/artifacts/ProceduralWalkthrough";
import {
  ComponentHighlight,
  type ComponentHighlightParams,
} from "@/lib/artifacts/ComponentHighlight";
import {
  SelectionChartInteractive,
  type SelectionChartInteractiveParams,
} from "@/lib/artifacts/SelectionChartInteractive";
import {
  WeldComparison,
  type WeldComparisonParams,
} from "@/lib/artifacts/WeldComparison";

export const metadata = {
  title: "Artifact playground · dev",
  description:
    "Visual regression surface for artifact templates. Not linked from production UI.",
};

interface Variant<TParams> {
  label: string;
  params: TParams;
  note?: string;
}

const POLARITY_VARIANTS: Variant<PolarityDiagramParams>[] = [
  {
    label: "MIG (solid core, gas shielded)",
    params: { process: "mig" },
  },
  {
    label: "Flux-cored (gasless)",
    params: { process: "flux_cored" },
  },
  {
    label: "TIG with socket highlight",
    params: { process: "tig", highlight: "negative_socket" },
  },
  {
    label: "Compare: MIG ↔ Flux-cored",
    params: { process: "mig", compare_with: "flux_cored" },
  },
];

const DUTY_VARIANTS: Variant<DutyCycleMatrixParams>[] = [
  { label: "Full matrix, no highlight", params: {} },
  {
    label: "MIG at 200A on 240V",
    params: { process: "mig", voltage: "240V", highlight_amps: 200 },
  },
  {
    label: "TIG at 125A on 120V",
    params: { process: "tig", voltage: "120V", highlight_amps: 125 },
  },
];

const SETTINGS_VARIANTS: Variant<SettingsConfiguratorParams>[] = [
  {
    label: "MIG 1/8\" mild steel",
    params: {
      process: "mig",
      material: "mild_steel",
      thickness: '1/8"',
    },
  },
  {
    label: "Flux-cored 1/4\" mild steel",
    params: {
      process: "flux_cored",
      material: "mild_steel",
      thickness: '1/4"',
    },
  },
  {
    label: "TIG 0.062\" stainless",
    params: {
      process: "tig",
      material: "stainless_steel",
      thickness: "16 ga",
    },
  },
  {
    label: "MIG aluminum (will show spool-gun caution)",
    params: {
      process: "mig",
      material: "aluminum",
      thickness: "14 ga",
    },
  },
];

const TROUBLESHOOT_VARIANTS: Variant<TroubleshootingTreeParams>[] = [
  { label: "Porosity on flux-cored", params: { symptom: "porosity", process: "flux_cored" } },
  { label: "Bird nest on MIG", params: { symptom: "bird nest", process: "mig" } },
  { label: "Weak arc on stick", params: { symptom: "weak arc", process: "stick" } },
];

const PROCEDURAL_VARIANTS: Variant<ProceduralWalkthroughParams>[] = [
  { label: "MIG cable setup", params: { topic: "cable_mig" } },
  { label: "Flux-cored cable setup", params: { topic: "cable_flux" } },
  { label: "TIG cable setup", params: { topic: "cable_tig" } },
  { label: "Tungsten sharpening", params: { topic: "tungsten_sharpen" } },
  { label: "Feed tension", params: { topic: "feed_tension_set" } },
];

const HIGHLIGHT_VARIANTS: Variant<ComponentHighlightParams>[] = [
  {
    label: "Positive socket on front panel",
    params: { figure_id: "front-panel-controls", part_name: "positive socket" },
  },
  {
    label: "Power switch on front panel",
    params: { figure_id: "front-panel-controls", part_name: "power switch" },
  },
  {
    label: "Feed tensioner (non-panel figure)",
    params: { figure_id: "interior-controls", part_name: "feed tensioner" },
  },
];

const SELECTION_VARIANTS: Variant<SelectionChartInteractiveParams>[] = [
  { label: "No prefilled filters", params: {} },
  {
    label: "Prefilled: aluminum, 3/8\", no gas",
    params: {
      prefilled: {
        material: "aluminum",
        thickness_inches: 0.375,
        gas_available: false,
      },
    },
  },
];

const WELD_VARIANTS: Variant<WeldComparisonParams>[] = [
  {
    label: "Porosity (top match) + spatter runner-up",
    params: {
      catalog_id: "wire_porosity",
      runner_up_id: "wire_excessive_spatter",
    },
    note: "user_image_url auto-injected in the real chat; shows placeholder here.",
  },
  {
    label: "Stick current too high",
    params: { catalog_id: "stick_current_too_high" },
  },
];

function Section<T>({
  title,
  variants,
  render,
}: {
  title: string;
  variants: Variant<T>[];
  render: (params: T) => React.JSX.Element;
}): React.JSX.Element {
  return (
    <section className="space-y-6">
      <div className="border-b border-[color:var(--color-border)] pb-2">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="grid grid-cols-1 gap-8">
        {variants.map((v, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="text-sm font-semibold">{v.label}</h3>
              <code className="font-mono text-[11px] text-[color:var(--color-muted)]">
                {JSON.stringify(v.params)}
              </code>
            </div>
            {v.note && (
              <p className="text-xs text-[color:var(--color-muted)]">{v.note}</p>
            )}
            {render(v.params)}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ArtifactsPlaygroundPage(): React.JSX.Element {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10 space-y-16">
      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-widest text-[color:var(--color-muted)]">
          /dev/artifacts
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Artifact playground
        </h1>
        <p className="max-w-2xl text-sm text-[color:var(--color-muted)]">
          Every artifact template with seeded variants. Must render crisply in
          both light and dark modes and match the params an agent would emit.
        </p>
      </header>

      <Section
        title="PolarityDiagram"
        variants={POLARITY_VARIANTS}
        render={(p) => <PolarityDiagram {...p} />}
      />
      <Section
        title="DutyCycleMatrix"
        variants={DUTY_VARIANTS}
        render={(p) => <DutyCycleMatrix {...p} />}
      />
      <Section
        title="SettingsConfigurator"
        variants={SETTINGS_VARIANTS}
        render={(p) => <SettingsConfigurator {...p} />}
      />
      <Section
        title="TroubleshootingTree"
        variants={TROUBLESHOOT_VARIANTS}
        render={(p) => <TroubleshootingTree {...p} />}
      />
      <Section
        title="ProceduralWalkthrough"
        variants={PROCEDURAL_VARIANTS}
        render={(p) => <ProceduralWalkthrough {...p} />}
      />
      <Section
        title="ComponentHighlight"
        variants={HIGHLIGHT_VARIANTS}
        render={(p) => <ComponentHighlight {...p} />}
      />
      <Section
        title="SelectionChartInteractive"
        variants={SELECTION_VARIANTS}
        render={(p) => <SelectionChartInteractive {...p} />}
      />
      <Section
        title="WeldComparison"
        variants={WELD_VARIANTS}
        render={(p) => <WeldComparison {...p} />}
      />
    </main>
  );
}
