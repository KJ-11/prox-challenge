import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  DutyCycleSchema,
  SpecsSchema,
  PolaritySchema,
  WireCompatibilitySchema,
  SelectionChartSchema,
  TroubleshootingSchema,
  WeldDiagnosisSchema,
  PartsListSchema,
  SafetySymbolsSchema,
} from "../../lib/knowledge/schemas.js";
import { extractFromPdf } from "./claude-extract.js";

const STRUCTURED_DIR = join("knowledge", "structured");
const OWNER_MANUAL = "files/owner-manual.pdf";
const SELECTION_CHART = "files/selection-chart.pdf";

function writeJson(name: string, data: unknown): string {
  mkdirSync(STRUCTURED_DIR, { recursive: true });
  const path = join(STRUCTURED_DIR, `${name}.json`);
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
  return path;
}

function shouldSkip(name: string, force: boolean): boolean {
  return !force && existsSync(join(STRUCTURED_DIR, `${name}.json`));
}

/* ---------- 1. duty cycle ---------- */

export async function extractDutyCycle(force: boolean): Promise<void> {
  const name = "duty_cycle";
  if (shouldSkip(name, force)) return;
  const data = await extractFromPdf({
    pdfPath: OWNER_MANUAL,
    toolName: "record_duty_cycle",
    toolDescription:
      "Record the full duty cycle matrix for the OmniPro 220 across MIG, TIG, and Stick at both 120V and 240V inputs.",
    schema: DutyCycleSchema,
    prompt: `Extract the complete duty cycle matrix for the Vulcan OmniPro 220.

Source pages: the Specifications table on page 7 (which lists 'Rated Duty Cycles' per process × voltage), and the "Duty Cycle (Duration of Use)" sections on page 19 (MIG/Flux) and page 29 (TIG/Stick).

For each of the six rows — (MIG, 120V), (MIG, 240V), (TIG, 120V), (TIG, 240V), (Stick, 120V), (Stick, 240V) — populate:
- current_range_amps (min, max) from the Welding Current Range row
- rated_duty_cycle.percent and .at_amperage (the headline rated cycle, e.g., "25% @ 200A")
- minutes_welding_per_10 and minutes_resting_per_10 (e.g., 2.5 / 7.5 for 25% duty cycle — derive from percent if not explicit)
- continuous_amperage: the amperage sustainable at 100% duty cycle (e.g., 115A at 240V MIG)
- current_input_at_output if listed (e.g., "25.5A at 200A" on page 7)

Use lowercase process enum: "mig", "tig", "stick". Use "120V" or "240V" for voltage.`,
  });
  writeJson(name, data);
  process.stderr.write(`    ✓ ${name} (${data.length} rows)\n`);
}

/* ---------- 2. specs ---------- */

export async function extractSpecs(force: boolean): Promise<void> {
  const name = "specs";
  if (shouldSkip(name, force)) return;
  const data = await extractFromPdf({
    pdfPath: OWNER_MANUAL,
    toolName: "record_specs",
    toolDescription: "Record the full specifications for each welding process.",
    schema: SpecsSchema,
    prompt: `Extract the complete Specifications tables from page 7 of the owner's manual.

There are three tables: MIG, TIG, Stick. For each process, record every row of its table:
- power_input: array with each voltage (120V/240V) supported
- current_input_at_output: e.g., MIG 120V is "20.8A at 100A" meaning input_amps=20.8, output_amps=100
- welding_current_range: min/max amps per voltage
- max_ocv_vdc: a single number (Maximum OCV row — typically 86VDC)
- weldable_materials: list of materials (e.g., "Mild Steel", "Stainless Steel", "Aluminum (with optional Spool Gun)" for MIG; "Mild Steel, Stainless Steel, Chrome Moly" for TIG; etc.)
- welding_wire_capacity (MIG only): solid_core_inches and flux_cored_inches arrays
- wire_speed_ipm (MIG only): min/max
- wire_spool_capacity_lb (MIG only): single number

Use lowercase process enum. Flatten "Aluminum (with optional Spool Gun)" into just "Aluminum" but note the spool gun requirement in the MIG entry if there's a natural field; otherwise just include it verbatim as a material string.

There are only three processes in the spec table (MIG, TIG, Stick) — flux_cored is not a separate row on page 7; it shares MIG's numbers. Do NOT invent a flux_cored row.`,
  });
  writeJson(name, data);
  process.stderr.write(`    ✓ ${name} (${data.length} processes)\n`);
}

/* ---------- 3. polarity ---------- */

export async function extractPolarity(force: boolean): Promise<void> {
  const name = "polarity";
  if (shouldSkip(name, force)) return;
  const data = await extractFromPdf({
    pdfPath: OWNER_MANUAL,
    toolName: "record_polarity",
    toolDescription:
      "Record the cable polarity setup for each of the four welding processes.",
    schema: PolaritySchema,
    prompt: `Extract polarity setup for each of the four welding processes.

Source pages:
- Page 13: DCEN setup for Flux-Cored (gasless) — ground clamp → POSITIVE, wire feed power → NEGATIVE
- Page 14: DCEP setup for Solid-core MIG (gas shielded) — ground clamp → NEGATIVE, wire feed power → POSITIVE
- Page 24: TIG — ground clamp → POSITIVE, TIG torch → NEGATIVE (DCEN)
- Page 27: Stick — ground clamp → NEGATIVE, electrode holder → POSITIVE (DCEP for most electrodes)

Emit four entries with process enums: "mig", "flux_cored", "tig", "stick".

For each:
- label: "DCEP" or "DCEN"
- label_full: "Direct Current Electrode Positive" or "Direct Current Electrode Negative"
- ground_clamp_socket: "positive" or "negative"
- work_cable_name: descriptive — "MIG gun / wire feed power" for mig, "Wire feed power" for flux_cored, "TIG torch" for tig, "Electrode holder" for stick
- work_cable_socket: matching socket
- notes: any process-specific caveats (e.g., Stick polarity may be reversed for certain electrode types)
- source_pages: all pages that describe this setup`,
  });
  writeJson(name, data);
  process.stderr.write(`    ✓ ${name} (${data.length} entries)\n`);
}

/* ---------- 4. wire compatibility ---------- */

export async function extractWireCompatibility(force: boolean): Promise<void> {
  const name = "wire_compatibility";
  if (shouldSkip(name, force)) return;
  const data = await extractFromPdf({
    pdfPath: OWNER_MANUAL,
    toolName: "record_wire_compatibility",
    toolDescription: "Record wire size compatibility and feed roller mapping.",
    schema: WireCompatibilitySchema,
    prompt: `Extract wire compatibility from pages 7 (Specifications) and 12 (Feed Roller Instructions).

From page 7 MIG specs:
- solid_core sizes: 0.025", 0.030", 0.035"
- flux_cored sizes: 0.030", 0.035", 0.045"

From page 12 feed roller diagram:
- V-groove side: labeled "0.030/0.035 groove" and "0.025 groove" — fits solid core wire
- Knurled side: labeled "0.045 groove" and "0.030/0.035 groove" — fits flux-cored wire

Materials:
- solid_core works with mild steel, stainless steel, and aluminum (aluminum needs optional Spool Gun)
- flux_cored works with mild steel, stainless steel

shielding_gas_required: true for solid_core, false for flux_cored.`,
  });
  writeJson(name, data);
  process.stderr.write(`    ✓ ${name}\n`);
}

/* ---------- 5. selection chart ---------- */

export async function extractSelectionChart(force: boolean): Promise<void> {
  const name = "selection_chart";
  if (shouldSkip(name, force)) return;
  const data = await extractFromPdf({
    pdfPath: SELECTION_CHART,
    toolName: "record_selection_chart",
    toolDescription:
      "Record the 'How to Choose a Welder' decision chart (the sticker on the inside of the welder door).",
    schema: SelectionChartSchema,
    prompt: `Extract the complete 'How to Choose a Welder' selection chart from the provided single-page PDF (this is the door sticker).

It has 6 decision rows across 4 process columns:
1. What is your skill level? (low / moderate / high per column)
2. Will you need shielding gas? (yes / no per column)
3. What type of material will you be welding?
4. What is your material thickness? (e.g., "18 Gauge to 5/16\\"" for Flux-Cored, "22 Gauge to 3/8\\"" for MIG, "10 Gauge to 1/2\\"" for Stick, "24 Gauge to 3/16\\"" for TIG)
5. Typical applications (bullet list per column)
6. How clean do you need your weld? (more spatter / clean / etc.)

And then a "Use This Welding Process" row naming each process.

The four process columns (left to right): FLUX-CORED/FCAW, MIG/GMAW, STICK/SMAW, TIG/GTAW.

Emit process_columns as an array of 4 entries using enums: "flux_cored", "mig", "stick", "tig".

Emit decision_questions as 6 entries (one per row), each with step number, question text, and which field it affects (e.g., "skill_level_best_fit", "shielding_gas_required", "materials", "thickness_range", "typical_applications", "cleanliness").

If the chart includes a "Duty Cycle Example" callout (e.g., "165A @ 30% Duty Cycle, 3 minutes welding, 7 minutes resting"), capture it too.`,
  });
  writeJson(name, data);
  process.stderr.write(`    ✓ ${name}\n`);
}

/* ---------- 6. troubleshooting ---------- */

export async function extractTroubleshooting(force: boolean): Promise<void> {
  const name = "troubleshooting";
  if (shouldSkip(name, force)) return;
  const data = await extractFromPdf({
    pdfPath: OWNER_MANUAL,
    toolName: "record_troubleshooting",
    toolDescription:
      "Record the complete troubleshooting tables for MIG/Flux-Cored and TIG/Stick.",
    schema: TroubleshootingSchema,
    prompt: `Extract the complete troubleshooting tables.

Page 42-43 (MIG/Flux-Cored Welding — process_family: "wire"):
- Wire Feed Motor Runs but Wire Does Not Feed Properly
- Wire Creates a Bird's Nest During Operation
- Wire Stops During Welding
- Welding Arc Not Stable
- Weak Arc Strength
- Welder Does Not Function When Switched On
- LCD Display Does Not Light When Welder is Switched On
- Wire Feeds, but Arc Does Not Ignite
- Porosity in the Weld Metal

Page 44 (TIG/Stick Welding — process_family: "tig_stick"):
- Welder Does Not Function When Switched On
- LCD Display Does Not Light When Welder is Switched On
- Weak Arc Strength
- Welding Arc Not Stable

For each problem, list every cause → solution pair from the Possible Causes and Likely Solutions columns. Assign a stable slug id like "wire_porosity" or "tig_stick_weak_arc".

source_page: the page the entry appears on.`,
  });
  writeJson(name, data);
  process.stderr.write(`    ✓ ${name} (${data.length} problems)\n`);
}

/* ---------- 7. weld diagnosis catalog ---------- */

export async function extractWeldDiagnosis(force: boolean): Promise<void> {
  const name = "weld_diagnosis";
  if (shouldSkip(name, force)) return;
  const data = await extractFromPdf({
    pdfPath: OWNER_MANUAL,
    toolName: "record_weld_diagnosis",
    toolDescription:
      "Record every labeled weld reference from the Welding Tips section.",
    schema: WeldDiagnosisSchema,
    prompt: `Extract every labeled weld example/reference from the Welding Tips section of the owner's manual (pages 34-40).

Required entries (minimum):

From page 35 (Example Wire Weld Diagrams): 6 side-by-side top-view labeled beads
- Good Weld
- Voltage Too Low or Wire Feed Too Slow
- Voltage Too High or Wire Feed Too Fast
- Travel Speed Too Fast
- Travel Speed Too Slow
- CTWD Too Long or Wrong Polarity

From page 35 (Wire Weld Diagnosis — Workpiece Heat Control / Weld Penetration): 3 profile-view diagrams
- Inadequate Penetration
- Proper Penetration
- Excess Penetration or Burn-Through

From page 36 (Wire Weld): profile and top views
- Bend at Joint
- Coat of Slag Over Weld
- Weld Not Adhering Properly

From page 37 (Wire Weld): 4 top-view labeled photos
- Porosity
- Excessive Spatter
- Crooked/Wavy Bead
- Burn-Through

From page 38 (Example Stick Weld Diagrams): 7 side-by-side top-view labeled beads
- Good Weld
- Current Too Low
- Current Too High
- Weld Speed Too Fast
- Weld Speed Too Slow
- Arc Length Too Short
- Arc Length Too Long

From page 38 (Stick Weld Diagnosis — Penetration): 3 profile-view
- Inadequate Penetration
- Proper Penetration
- Excess Penetration or Burn-Through

From page 39 (Stick Weld):
- Bend at Joint
- Weld Not Adhering Properly

From page 40 (Stick Weld):
- Coat of Slag Over Weld
- Porosity
- Crooked/Wavy Bead
- Excessive Spatter
- Burn-Through

From page 34 (Strike Test): strike test profile
- Good Weld (strike test — bends)
- Poor Weld (strike test — snaps)

For each entry provide:
- id: stable slug like "wire_voltage_too_low" or "stick_current_too_high"
- process_family: "wire" or "stick"
- category: one of the enum values (baseline for "Good Weld", heat_control for penetration ones, travel_speed, arc_length, polarity_or_ctwd, porosity, spatter, wavy_bead, burn_through, slag, penetration, bend, adhesion)
- view: "top", "profile", or "strike_test"
- label: the display label as in the manual
- visual_signature: detailed textual description of what the bead LOOKS like (size, color, texture, surface features). This will be used for matching user-uploaded weld photos.
- fix_summary: one-line fix, as displayed in the manual
- fix_details: bullet list of the corrective actions from the manual
- source_page: page number
- page_image_ref: the path "knowledge/pages/owner_manual/p035.png" (or p036, p037, p038, p039, p040, p034 accordingly)
- Do not include crop_bbox_normalized or individual_photo_ref — leave those fields off.`,
    maxTokens: 16000,
  });
  writeJson(name, data);
  process.stderr.write(`    ✓ ${name} (${data.length} entries)\n`);
}

/* ---------- 8. parts list ---------- */

export async function extractPartsList(force: boolean): Promise<void> {
  const name = "parts_list";
  if (shouldSkip(name, force)) return;
  const data = await extractFromPdf({
    pdfPath: OWNER_MANUAL,
    toolName: "record_parts_list",
    toolDescription: "Record the complete parts list from page 46.",
    schema: PartsListSchema,
    prompt: `Extract every row of the Parts List on page 46 of the owner's manual.

There are 61 numbered parts in two columns (Part / Description / Qty). Capture all of them in order.`,
    maxTokens: 8000,
  });
  writeJson(name, data);
  process.stderr.write(`    ✓ ${name} (${data.length} parts)\n`);
}

/* ---------- 9. safety symbols ---------- */

export async function extractSafetySymbols(force: boolean): Promise<void> {
  const name = "safety_symbols";
  if (shouldSkip(name, force)) return;
  const data = await extractFromPdf({
    pdfPath: OWNER_MANUAL,
    toolName: "record_safety_symbols",
    toolDescription: "Record the symbology table from page 6.",
    schema: SafetySymbolsSchema,
    prompt: `Extract every symbol from the Symbology table on page 6 of the owner's manual.

Each entry in the table has an icon on the left and a label/description on the right. Capture all of them. Example rows: Wire Feed (Speed), Workpiece Ground Cable, Torch Cable, Overheat Shutdown Indicator, Cooling Fan, Housing Ground Point, VAC, A, OCV, KVA, IPM, AWG, Electric Shock Hazard, Inhalation Hazard, Read manual before setup/use, Fire Hazard, Arc Ray Hazard, Pacemaker Hazard.

For each:
- id: slug (e.g., "electric_shock_hazard", "wire_feed_speed")
- label: display name from the table
- description: the full text under that row
- icon_hint: the closest Lucide icon name ("flame", "zap", "skull", "triangle-alert", "fan", "wind", "gauge", or "custom" if nothing fits)`,
  });
  writeJson(name, data);
  process.stderr.write(`    ✓ ${name} (${data.length} symbols)\n`);
}

/* ---------- orchestrator ---------- */

export async function extractAllStructured(
  force: boolean,
  options: { only?: string[] } = {},
): Promise<void> {
  const all: Array<[string, (f: boolean) => Promise<void>]> = [
    ["specs", extractSpecs],
    ["duty_cycle", extractDutyCycle],
    ["polarity", extractPolarity],
    ["wire_compatibility", extractWireCompatibility],
    ["selection_chart", extractSelectionChart],
    ["troubleshooting", extractTroubleshooting],
    ["weld_diagnosis", extractWeldDiagnosis],
    ["parts_list", extractPartsList],
    ["safety_symbols", extractSafetySymbols],
  ];
  const filter = options.only ? new Set(options.only) : null;
  for (const [name, fn] of all) {
    if (filter && !filter.has(name)) continue;
    try {
      await fn(force);
    } catch (err) {
      process.stderr.write(`    ✗ ${name}: ${(err as Error).message}\n`);
    }
  }
}
