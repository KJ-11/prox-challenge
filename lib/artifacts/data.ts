import dutyCycleRaw from "@/knowledge/structured/duty_cycle.json";
import polarityRaw from "@/knowledge/structured/polarity.json";
import specsRaw from "@/knowledge/structured/specs.json";
import selectionChartRaw from "@/knowledge/structured/selection_chart.json";
import weldDiagnosisRaw from "@/knowledge/structured/weld_diagnosis.json";
import {
  DutyCycleSchema,
  PolaritySchema,
  SpecsSchema,
  SelectionChartSchema,
  WeldDiagnosisSchema,
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
