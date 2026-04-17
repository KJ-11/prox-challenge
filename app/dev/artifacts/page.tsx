import {
  PolarityDiagram,
  type PolarityDiagramParams,
} from "@/lib/artifacts/PolarityDiagram";
import {
  DutyCycleMatrix,
  type DutyCycleMatrixParams,
} from "@/lib/artifacts/DutyCycleMatrix";

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
    note: "DCEP — ground to NEG, wire feed power to POS, MIG gun into gun socket.",
  },
  {
    label: "Flux-cored (gasless)",
    params: { process: "flux_cored" },
    note: "DCEN — reversed from MIG. Ground to POS, wire feed power to NEG.",
  },
  {
    label: "TIG",
    params: { process: "tig", highlight: "negative_socket" },
    note: "DCEN — torch directly into NEG, highlight animation on the socket.",
  },
  {
    label: "Stick",
    params: { process: "stick" },
    note: "DCEP default — electrode holder to POS, ground to NEG.",
  },
  {
    label: "Compare: MIG ↔ Flux-cored",
    params: { process: "mig", compare_with: "flux_cored" },
    note: "Side-by-side to show the polarity flip.",
  },
];

const DUTY_VARIANTS: Variant<DutyCycleMatrixParams>[] = [
  {
    label: "Full matrix, no highlight",
    params: {},
    note: "Hover any cell to see its clock.",
  },
  {
    label: "MIG at 200A on 240V",
    params: { process: "mig", voltage: "240V", highlight_amps: 200 },
    note: "Exact match for the README example question.",
  },
  {
    label: "TIG at 125A on 120V",
    params: { process: "tig", voltage: "120V", highlight_amps: 125 },
    note: "Lower-voltage branch of the TIG row.",
  },
  {
    label: "Stick at 175A, voltage inferred from range",
    params: { process: "stick", highlight_amps: 175 },
    note: "No explicit voltage — the component resolves to 240V via the current range.",
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
          Visual regression surface for every artifact template. Each variant
          below is what the agent would emit for a representative question;
          they must render crisply in both light and dark modes.
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
    </main>
  );
}
