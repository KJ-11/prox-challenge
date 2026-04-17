import dutyCycleRaw from "@/knowledge/structured/duty_cycle.json";
import polarityRaw from "@/knowledge/structured/polarity.json";
import specsRaw from "@/knowledge/structured/specs.json";
import selectionChartRaw from "@/knowledge/structured/selection_chart.json";
import weldDiagnosisRaw from "@/knowledge/structured/weld_diagnosis.json";
import troubleshootingRaw from "@/knowledge/structured/troubleshooting.json";
import corpusRaw from "@/knowledge/corpus.json";
import figureCatalogRaw from "@/knowledge/figures/catalog.json";
import {
  DutyCycleSchema,
  PolaritySchema,
  SpecsSchema,
  SelectionChartSchema,
  WeldDiagnosisSchema,
  TroubleshootingSchema,
  CorpusSchema,
  FigureCatalogSchema,
} from "@/lib/knowledge/schemas";

/**
 * Static structured data bundled with the client. Parsed once at module load
 * so malformed JSON fails at build time, not at render time.
 */
export const dutyCycleData = DutyCycleSchema.parse(dutyCycleRaw);
export const polarityData = PolaritySchema.parse(polarityRaw);
export const specsData = SpecsSchema.parse(specsRaw);
export const selectionChartData = SelectionChartSchema.parse(selectionChartRaw);
export const weldDiagnosisData = WeldDiagnosisSchema.parse(weldDiagnosisRaw);
export const troubleshootingData =
  TroubleshootingSchema.parse(troubleshootingRaw);
export const corpusData = CorpusSchema.parse(corpusRaw);
export const figureCatalogData = FigureCatalogSchema.parse(figureCatalogRaw);

/* ---------- lookup helpers for the sources sidebar ---------- */

const CHUNKS_BY_ID = new Map(corpusData.map((c) => [c.id, c]));
const FIGURES_BY_ID = new Map(figureCatalogData.map((f) => [f.id, f]));
const WELD_BY_ID = new Map(weldDiagnosisData.map((w) => [w.id, w]));

export function lookupChunk(id: string) {
  return CHUNKS_BY_ID.get(id);
}
export function lookupFigure(id: string) {
  return FIGURES_BY_ID.get(id);
}
export function lookupWeldEntry(id: string) {
  return WELD_BY_ID.get(id);
}

/** Convert "knowledge/pages/.../p008.png" into "/api/knowledge/pages/.../p008.png". */
export function toKnowledgeUrl(ref: string): string {
  const cleaned = ref.replace(/^knowledge\//, "");
  return `/api/knowledge/${cleaned}`;
}
