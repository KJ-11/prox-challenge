import {
  loadKnowledge,
  STRUCTURED_FILTER_KEYS,
  STRUCTURED_TABLE_NAMES,
  type StructuredTableName,
} from "../knowledge/loader";

const STRUCTURED_DESCRIPTIONS: Record<StructuredTableName, string> = {
  duty_cycle:
    "Rated duty cycles per process × voltage. Includes current range, rated % @ amperage, minutes welding vs resting, continuous-amperage threshold.",
  specs:
    "Full electrical and material specs per process: power input options, input→output amperage, welding current range, max OCV, weldable materials, wire capacity.",
  polarity:
    "Cable-to-socket mapping per process with DCEP/DCEN label, ground_clamp_socket, work_cable_name, work_cable_socket, and safety notes.",
  wire_compatibility:
    "Solid-core vs flux-cored wire sizes, groove types (V-groove vs knurled), compatible materials, and shielding-gas requirements.",
  selection_chart:
    "Door-sticker 'How To Choose A Welder' decision chart: 6 decision questions × 4 process columns (flux_cored, mig, stick, tig) with thickness ranges, materials, applications, cleanliness, skill-level fit.",
  troubleshooting:
    "Symptom → causes → solutions for MIG/Flux (process_family='wire') and TIG/Stick (process_family='tig_stick').",
  weld_diagnosis:
    "Labeled reference catalog of 35 weld-appearance examples from the owner's manual. Each entry has visual_signature, fix_summary, fix_details, and page_image_ref. Used to match user-uploaded weld photos.",
  parts_list:
    "61 numbered replacement parts from the exploded assembly diagram (page 46–47).",
  safety_symbols:
    "18 symbology entries from page 6 mapping icons (e.g. pacemaker hazard, arc ray hazard) to their meanings.",
};

function bulletList(lines: string[]): string {
  return lines.map((l) => `- ${l}`).join("\n");
}

function renderChunks(): string {
  const { corpus } = loadKnowledge();
  const lines = corpus.map(
    (c) =>
      `${c.id} | ${c.breadcrumb.join(" > ")} | p${c.page} (${c.source_document})`,
  );
  return bulletList(lines);
}

function renderFigures(): string {
  const { figures } = loadKnowledge();
  const lines = figures.map(
    (f) => `${f.id} | p${f.page} (${f.source_document}) | ${f.caption}`,
  );
  return bulletList(lines);
}

function renderStructuredIndex(): string {
  const kb = loadKnowledge();
  const lines = STRUCTURED_TABLE_NAMES.map((name) => {
    const data = kb.structured[name];
    const count = Array.isArray(data) ? data.length : 1;
    const keys = STRUCTURED_FILTER_KEYS[name];
    const keysHint =
      keys.length > 0
        ? ` — filter keys: ${keys.join(", ")}`
        : " — pass no filters (single object)";
    const shape = Array.isArray(data) ? `${count} rows` : "1 object";
    return `${name} (${shape})${keysHint}\n    ${STRUCTURED_DESCRIPTIONS[name]}`;
  });
  return bulletList(lines);
}

function renderWeldDiagnosisCatalog(): string {
  const { structured } = loadKnowledge();
  const lines = structured.weld_diagnosis.map(
    (e) => `${e.id} | ${e.process_family}/${e.view}/${e.category} | ${e.label}`,
  );
  return bulletList(lines);
}

/**
 * One big text block containing every ID/caption the agent can refer to.
 * This is what lives under cache_control in the system prompt.
 */
export function renderCatalog(): string {
  return [
    "# Knowledge catalog",
    "",
    "The agent picks IDs from the lists below when calling load_chunks, load_figures, lookup_structured, or render_artifact. Do not invent IDs.",
    "",
    "## CHUNKS",
    renderChunks(),
    "",
    "## FIGURES",
    renderFigures(),
    "",
    "## STRUCTURED TABLES",
    renderStructuredIndex(),
    "",
    "## WELD DIAGNOSIS CATALOG (from structured/weld_diagnosis.json)",
    renderWeldDiagnosisCatalog(),
  ].join("\n");
}
