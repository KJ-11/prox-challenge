import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  CorpusSchema,
  FigureCatalogSchema,
  DutyCycleSchema,
  SpecsSchema,
  PolaritySchema,
  WireCompatibilitySchema,
  SelectionChartSchema,
  TroubleshootingSchema,
  WeldDiagnosisSchema,
  PartsListSchema,
  SafetySymbolsSchema,
  type Corpus,
  type FigureCatalog,
  type DutyCycle,
  type Specs,
  type Polarity,
  type WireCompatibility,
  type SelectionChart,
  type Troubleshooting,
  type WeldDiagnosis,
  type PartsList,
  type SafetySymbols,
} from "./schemas";

const KNOWLEDGE_DIR = join(process.cwd(), "knowledge");

export const STRUCTURED_TABLE_NAMES = [
  "duty_cycle",
  "specs",
  "polarity",
  "wire_compatibility",
  "selection_chart",
  "troubleshooting",
  "weld_diagnosis",
  "parts_list",
  "safety_symbols",
] as const;

export type StructuredTableName = (typeof STRUCTURED_TABLE_NAMES)[number];

export interface KnowledgeBase {
  corpus: Corpus;
  figures: FigureCatalog;
  structured: {
    duty_cycle: DutyCycle;
    specs: Specs;
    polarity: Polarity;
    wire_compatibility: WireCompatibility;
    selection_chart: SelectionChart;
    troubleshooting: Troubleshooting;
    weld_diagnosis: WeldDiagnosis;
    parts_list: PartsList;
    safety_symbols: SafetySymbols;
  };
}

function readJson<T>(path: string, schema: {
  parse: (data: unknown) => T;
}): T {
  if (!existsSync(path)) {
    throw new Error(
      `knowledge file missing: ${path}. Run \`npm run extract\` to rebuild.`,
    );
  }
  const raw = JSON.parse(readFileSync(path, "utf8"));
  return schema.parse(raw);
}

let _kb: KnowledgeBase | null = null;

export function loadKnowledge(): KnowledgeBase {
  if (_kb) return _kb;
  const structured = {
    duty_cycle: readJson(
      join(KNOWLEDGE_DIR, "structured", "duty_cycle.json"),
      DutyCycleSchema,
    ),
    specs: readJson(
      join(KNOWLEDGE_DIR, "structured", "specs.json"),
      SpecsSchema,
    ),
    polarity: readJson(
      join(KNOWLEDGE_DIR, "structured", "polarity.json"),
      PolaritySchema,
    ),
    wire_compatibility: readJson(
      join(KNOWLEDGE_DIR, "structured", "wire_compatibility.json"),
      WireCompatibilitySchema,
    ),
    selection_chart: readJson(
      join(KNOWLEDGE_DIR, "structured", "selection_chart.json"),
      SelectionChartSchema,
    ),
    troubleshooting: readJson(
      join(KNOWLEDGE_DIR, "structured", "troubleshooting.json"),
      TroubleshootingSchema,
    ),
    weld_diagnosis: readJson(
      join(KNOWLEDGE_DIR, "structured", "weld_diagnosis.json"),
      WeldDiagnosisSchema,
    ),
    parts_list: readJson(
      join(KNOWLEDGE_DIR, "structured", "parts_list.json"),
      PartsListSchema,
    ),
    safety_symbols: readJson(
      join(KNOWLEDGE_DIR, "structured", "safety_symbols.json"),
      SafetySymbolsSchema,
    ),
  };
  _kb = {
    corpus: readJson(join(KNOWLEDGE_DIR, "corpus.json"), CorpusSchema),
    figures: readJson(
      join(KNOWLEDGE_DIR, "figures", "catalog.json"),
      FigureCatalogSchema,
    ),
    structured,
  };
  return _kb;
}

/** Tables with a well-known primary key used by lookup_structured filters. */
export const STRUCTURED_FILTER_KEYS: Record<StructuredTableName, string[]> = {
  duty_cycle: ["process", "voltage"],
  specs: ["process"],
  polarity: ["process", "label"],
  wire_compatibility: [],
  selection_chart: [],
  troubleshooting: ["id", "process_family", "problem"],
  weld_diagnosis: ["id", "process_family", "category", "view"],
  parts_list: ["number"],
  safety_symbols: ["id"],
};

/**
 * Apply a shallow equality filter across a table. Returns the rows as-is for
 * object-shaped tables (wire_compatibility, selection_chart) when filters are
 * empty or not applicable.
 */
export function filterRows(
  table: StructuredTableName,
  data: unknown,
  filters: Record<string, unknown> | undefined,
): unknown {
  if (!filters || Object.keys(filters).length === 0) return data;
  if (!Array.isArray(data)) return data;
  return data.filter((row) => {
    if (!row || typeof row !== "object") return false;
    return Object.entries(filters).every(
      ([k, v]) => (row as Record<string, unknown>)[k] === v,
    );
  });
}
