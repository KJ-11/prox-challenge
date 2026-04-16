import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CorpusSchema,
  FigureCatalogSchema,
  type Corpus,
  type FigureCatalog,
} from "../../lib/knowledge/schemas.js";
import { extractFromPdf } from "./claude-extract.js";

const OWNER_MANUAL = "files/owner-manual.pdf";
const QUICK_START = "files/quick-start-guide.pdf";
const SELECTION_CHART = "files/selection-chart.pdf";
const CACHE_DIR = join("knowledge", ".cache");

function cachedOrExtract<T>(
  cacheKey: string,
  schema: { safeParse: (data: unknown) => { success: boolean; data?: T } },
  force: boolean,
  fetch: () => Promise<T>,
): Promise<T> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const path = join(CACHE_DIR, `${cacheKey}.json`);
  if (!force && existsSync(path)) {
    const parsed = schema.safeParse(JSON.parse(readFileSync(path, "utf8")));
    if (parsed.success && parsed.data !== undefined) {
      process.stderr.write(`      cache hit: ${cacheKey}\n`);
      return Promise.resolve(parsed.data);
    }
  }
  return fetch().then((data) => {
    writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
    return data;
  });
}

function writeJson(name: string, data: unknown): string {
  mkdirSync("knowledge", { recursive: true });
  const path = join("knowledge", `${name}.json`);
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
  return path;
}

/* ---------- prose chunks ---------- */

const CHUNK_INSTRUCTIONS = `For each chunk emit:
- id: stable kebab-case slug, e.g., "safety-electrical" or "mig-polarity-dcep-setup"
- breadcrumb: path from top-level section to the chunk, e.g., ["MIG / Flux-Cored Wire Welding", "DCEP Setup (Solid Core)"]
- page: page number where the section begins
- content: the prose content, lightly cleaned. Preserve numbered lists as "1. ...\\n2. ..." etc. Skip the boilerplate safety WARNING banners that repeat across sections — include warnings only when they introduce substantive new content.
- related_figure_ids: leave empty arrays for now (filled in later)
- related_structured: list any structured tables (from the catalog below) that this chunk connects to

Available structured table ids (for related_structured):
- "duty_cycle", "specs", "polarity", "wire_compatibility", "selection_chart",
  "troubleshooting", "weld_diagnosis", "parts_list", "safety_symbols"

Chunk at section-level granularity — each distinct subheading in the manual becomes one chunk. Do not split below paragraph level; do not merge across top-level sections.

DO include: procedures (numbered steps), technique descriptions (push/drag angles, CTWD), settings-flow descriptions, safety sections, LCD screen walkthroughs.

DO NOT include: the structured tables already captured separately (duty cycle matrix, troubleshooting tables, parts list, spec tables, symbology table, selection chart). One brief prose chunk about "what duty cycle means" is fine; the matrix itself is not prose.`;

async function extractOwnerManualSection(
  cacheKey: string,
  label: string,
  extraPrompt: string,
  force: boolean,
): Promise<Corpus> {
  return cachedOrExtract(cacheKey, CorpusSchema, force, async () => {
    process.stderr.write(`    extracting chunks: ${label}…\n`);
    const section = await extractFromPdf({
      pdfPath: OWNER_MANUAL,
      toolName: "record_chunks",
      toolDescription: "Record section-level prose chunks from the owner's manual.",
      schema: CorpusSchema,
      prompt: `${extraPrompt}\n\n${CHUNK_INSTRUCTIONS}\n\nSet source_document to "owner_manual" for every chunk.`,
      maxTokens: 16000,
    });
    for (const chunk of section) chunk.source_document = "owner_manual";
    return section;
  });
}

export async function extractOwnerManualCorpus(force: boolean): Promise<Corpus> {
  const ranges: Array<[string, string, string]> = [
    [
      "corpus_owner_1",
      "safety, specs, controls, MIG spool installation & setup",
      "Extract section-level prose chunks from pages 2-17 of the owner's manual. " +
        "Covers Safety (general, fume, arc ray, electrical, fire, welder use, maintenance, cylinder safety, grounding, extension cords), Specifications intro prose, Controls (front panel + interior), and MIG/Flux-Cored wire welding setup (spool installation, feed roller, gun cable connector, DCEN flux polarity setup, DCEP solid polarity setup, gas cylinder setup, wire threading, spool gun).",
    ],
    [
      "corpus_owner_2",
      "MIG technique, duty cycle prose, TIG setup, Stick setup",
      "Extract section-level prose chunks from pages 18-33 of the owner's manual. " +
        "Covers: Basic Wire Welding intro, Duty Cycle prose explanation, Setting Up The Weld, LCD Settings screens (polarity, diameter/thickness, auto weld, optional settings: run-in WFS, inductance, spot timer, save/recall), Gas Shielded operation, Basic Wire Welding Technique (stringer vs weave, push/drag angle, CTWD), TIG Setup (cable connect, shielding gas, tungsten sharpening, torch assembly), Stick Setup, Basic TIG/Stick intro, TIG duty cycle prose, TIG Welding procedure, Stick Welding procedure.",
    ],
    [
      "corpus_owner_3",
      "welding tips prose, maintenance, troubleshooting intro, wiring, parts",
      "Extract section-level prose chunks from pages 34-48 of the owner's manual. " +
        "Covers: Strike Test, Cleaning the Weld, Wire Weld Penetration prose, prose intros that frame the weld diagnosis photos (Porosity, Spatter, Wavy Bead, Burn-Through, Bend at Joint, etc.) — the headings + possible causes/solutions listed under each defect; same for Stick welds; Maintenance (inspection, MIG gun nozzle & contact tip cleaning, LCD screen cover replacement); Troubleshooting intro; any prose accompanying the Wiring Schematic; Parts List intro. " +
        "For each weld-defect prose section (e.g., 'Wire Weld — Porosity'), include the 'Possible Causes and Solutions' numbered list as part of the chunk content.",
    ],
  ];

  const chunks: Corpus = [];
  for (const [cacheKey, label, prompt] of ranges) {
    const section = await extractOwnerManualSection(cacheKey, label, prompt, force);
    chunks.push(...section);
  }
  return chunks;
}

export async function extractQuickStartCorpus(force: boolean): Promise<Corpus> {
  return cachedOrExtract("corpus_quickstart", CorpusSchema, force, async () => {
    process.stderr.write("    extracting chunks: quick start guide…\n");
    const chunks = await extractFromPdf({
      pdfPath: QUICK_START,
      toolName: "record_chunks",
      toolDescription: "Record section-level prose chunks from the quick-start guide.",
      schema: CorpusSchema,
      prompt:
        `Extract section-level prose chunks from the 2-page Quick Start Guide.\n\n` +
        `Expected chunks: (1) the numbered 6-step wire-welding overview on page 1, (2) Stick Cable Setup, (3) MIG Cable Setup, (4) Flux Cable Setup, (5) TIG Cable Setup on page 2.\n\n${CHUNK_INSTRUCTIONS}\n\nSet source_document to "quick_start" for every chunk.`,
      maxTokens: 4000,
    });
    for (const chunk of chunks) chunk.source_document = "quick_start";
    return chunks;
  });
}

export async function extractSelectionChartCorpus(force: boolean): Promise<Corpus> {
  return cachedOrExtract("corpus_selection", CorpusSchema, force, async () => {
    process.stderr.write("    extracting chunks: selection chart…\n");
    const chunks = await extractFromPdf({
      pdfPath: SELECTION_CHART,
      toolName: "record_chunks",
      toolDescription: "Record prose chunks from the Selection Chart.",
      schema: CorpusSchema,
      prompt:
        `The Selection Chart is the sticker from the inside of the welder door. It's primarily a decision chart (captured in structured/selection_chart.json), but pull out any prose callouts as chunks — e.g., the "Duty Cycle Example" callout text, the "IMPORTANT! Identify your input voltage" callout, the MIG vs Flux-Cored comparison checklist.\n\n${CHUNK_INSTRUCTIONS}\n\nSet source_document to "selection_chart" for every chunk.`,
      maxTokens: 3000,
    });
    for (const chunk of chunks) chunk.source_document = "selection_chart";
    return chunks;
  });
}

/* ---------- figure catalog ---------- */

const FIGURE_INSTRUCTIONS = `For every figure emit:
- id: stable kebab-case slug, e.g., "front-panel-controls" or "dcen-flux-polarity-setup"
- page: page where it appears
- caption: short phrase describing the figure (from the manual's caption or a natural one you write)
- depicts: tags for what's shown, e.g., ["front panel", "LCD display", "power switch", "polarity sockets"]
- keywords: search terms that should retrieve this figure (generous — include synonyms and paraphrases welders would use)
- page_image_ref: set to the path pattern "knowledge/pages/{source_document}/p{pageNumber:03d}.png" — e.g., for page 8 of the owner manual, "knowledge/pages/owner_manual/p008.png"
- crop_ref: leave empty for now

Include only figures that are referentially valuable — distinct diagrams, labeled photos, schematics. Skip purely decorative icons and repeating safety symbols (those live in structured/safety_symbols.json).`;

export async function extractOwnerManualFigures(force: boolean): Promise<FigureCatalog> {
  return cachedOrExtract("figures_owner", FigureCatalogSchema, force, async () => {
    process.stderr.write("    extracting figures: owner manual…\n");
    const figures = await extractFromPdf({
      pdfPath: OWNER_MANUAL,
      toolName: "record_figures",
      toolDescription: "Record the catalog of figures in the owner's manual.",
      schema: FigureCatalogSchema,
      prompt: `Enumerate every substantive figure in the owner's manual. Expected figures include (but are not limited to):

- page 8: Front Panel Controls diagram (labeled: Home/Back buttons, LCD Display, Control Knob, Left/Right knobs, Power Switch, MIG Gun/Spool Gun socket, Spool Gun Gas Outlet, Negative Socket, Positive Socket, Wire Feed Power Cable, Storage Compartment)
- page 9: Interior Controls diagram (Wire Spool, Spool Knob, Wire Feed Mechanism, Feed Tensioner, Idler Arm, Feed Roller Knob, Cold Wire Feed Switch, Wire Inlet Liner, Foot Pedal Socket, Wire Feed Control Socket)
- page 10: 1-2 lb wire spool loading illustration
- page 11: 10-12 lb wire spool loading + Feed Tensioner loosening
- page 12: Feed Roller Knob / groove sizing diagram (V-groove 0.025/0.030-0.035 solid; knurled 0.045/0.030-0.035 flux)
- page 13: DCEN Flux-Cored polarity setup
- page 14: DCEP Solid-Core polarity setup + shielding gas cylinder mounting
- page 15: wire threading through feed guides and tensioner
- page 16: power cord plug + Cold Wire Feed Switch location
- page 17: Optional Spool Gun Setup diagram
- page 19: Duty Cycle clock visualizations (120V 40% @ 100A and 240V 25% @ 200A)
- page 20: LCD screen mockups (Process select, Diameter/Thickness, Auto Weld showing amps/voltage)
- page 21: LCD Optional Settings screens (Run-In WFS, Inductance, Spot Timer, Recall, Save)
- page 22: Stringer vs weave bead; Push angle vs Drag angle; CTWD
- page 23: Warning Screen on LCD; settle gun on concrete; storage unplug sequence
- page 24: TIG Setup cable connections with foot pedal
- page 25: TIG shielding gas cylinder setup
- page 26: Tungsten Electrode sharpening + TIG Torch assembly (collet, collet body, ceramic nozzle, back cap)
- page 27: Stick Setup cable connections
- page 29: TIG and Stick duty cycle clocks
- page 30: TIG Settings LCD mockups
- page 32: Stick Settings LCD mockup (electrode type, diameter, thickness, Hot Start/Arc Force)
- page 33: Stick Optional Settings (Hot Start, Arc Force, Save/Recall)
- page 34: Strike Test diagrams (GOOD WELD bends; POOR WELD snaps); Chipping Hammer / Wire Brush
- page 35: Wire Weld Diagnosis — Workpiece Heat Control / Penetration (Inadequate/Proper/Excess); Example Wire Weld Diagrams (6 labeled beads)
- page 36: Wire Weld penetration profiles (excess/proper/inadequate); Bend at Joint; Coat of Slag; Weld Not Adhering
- page 37: Wire Weld photos — Porosity, Excessive Spatter, Crooked/Wavy Bead, Burn-Through
- page 38: Stick Weld Diagnosis — Penetration; Example Stick Weld Diagrams (7 labeled beads)
- page 39: Stick Weld Penetration profiles; Bend at Joint
- page 40: Stick Weld photos — Coat of Slag, Porosity, Crooked/Wavy Bead, Excessive Spatter, Burn-Through
- page 41: MIG Gun Nozzle & Contact Tip; LCD Screen Cover replacement
- page 45: Wiring Schematic (full circuit diagram)
- page 47: Parts Assembly Diagram (exploded view, 61 numbered parts)

Aim for 35-50 figures. Tag them richly so a welder's question retrieves the right visual.

${FIGURE_INSTRUCTIONS}\n\nSet source_document to "owner_manual" for every figure.`,
      maxTokens: 16000,
    });
    for (const fig of figures) fig.source_document = "owner_manual";
    return figures;
  });
}

export async function extractQuickStartFigures(force: boolean): Promise<FigureCatalog> {
  return cachedOrExtract("figures_quickstart", FigureCatalogSchema, force, async () => {
    process.stderr.write("    extracting figures: quick start…\n");
    const figures = await extractFromPdf({
      pdfPath: QUICK_START,
      toolName: "record_figures",
      toolDescription: "Record figures in the Quick Start Guide.",
      schema: FigureCatalogSchema,
      prompt: `Enumerate every substantive figure in the 2-page Quick Start Guide.

Expected figures on page 1:
- 2lb Spool Loading diagram
- Wire Spool / Feed Guides / Feed Mechanism
- Contact Tip / Nozzle MIG gun
- Cold wire feed + cord plug sequence
- Feed tensioner clockwise tighten + wire bend test
- Nozzle/tip replacement
- Holding gun clear + plug sequence + LCD settings

Expected figures on page 2:
- Stick Cable Setup (ground clamp → negative, electrode holder → positive)
- MIG Cable Setup (ground → negative, wire feed power → positive, gun cable, wire feed control)
- Flux Cable Setup (callout — follow MIG but reverse polarity)
- TIG Cable Setup (ground → positive, torch → negative, gas line, foot pedal)

${FIGURE_INSTRUCTIONS}\n\nSet source_document to "quick_start" for every figure.`,
      maxTokens: 6000,
    });
    for (const fig of figures) fig.source_document = "quick_start";
    return figures;
  });
}

export async function extractSelectionChartFigures(
  force: boolean,
): Promise<FigureCatalog> {
  return cachedOrExtract("figures_selection", FigureCatalogSchema, force, async () => {
    process.stderr.write("    extracting figures: selection chart…\n");
    const figures = await extractFromPdf({
      pdfPath: SELECTION_CHART,
      toolName: "record_figures",
      toolDescription: "Record figures in the Selection Chart.",
      schema: FigureCatalogSchema,
      prompt: `Enumerate substantive visual content on the single-page Selection Chart (the door sticker).

Typical figures/visuals:
- The overall "HOW TO CHOOSE A WELDER" decision matrix itself
- The "Duty Cycle Example" clock illustration (165A @ 30% Duty Cycle, 3 min welding / 7 min resting)
- Weld-bead appearance thumbnails under each process column
- The MIG vs Flux-Cored comparison checklist (blue table on right)

${FIGURE_INSTRUCTIONS}\n\nSet source_document to "selection_chart" for every figure.`,
      maxTokens: 3000,
    });
    for (const fig of figures) fig.source_document = "selection_chart";
    return figures;
  });
}

/* ---------- orchestrator ---------- */

export async function extractCorpusAndFigures(
  force: boolean,
): Promise<{ corpus: Corpus; figures: FigureCatalog }> {
  process.stderr.write("  extracting prose corpus…\n");
  const ownerChunks = await extractOwnerManualCorpus(force);
  const quickChunks = await extractQuickStartCorpus(force);
  const selectionChunks = await extractSelectionChartCorpus(force);
  const corpus = [...ownerChunks, ...quickChunks, ...selectionChunks];
  writeJson("corpus", corpus);
  process.stderr.write(`    ✓ corpus (${corpus.length} chunks)\n`);

  process.stderr.write("  extracting figure catalog…\n");
  const ownerFigs = await extractOwnerManualFigures(force);
  const quickFigs = await extractQuickStartFigures(force);
  const selFigs = await extractSelectionChartFigures(force);
  const figures = [...ownerFigs, ...quickFigs, ...selFigs];
  mkdirSync(join("knowledge", "figures"), { recursive: true });
  writeFileSync(
    join("knowledge", "figures", "catalog.json"),
    JSON.stringify(figures, null, 2) + "\n",
  );
  process.stderr.write(`    ✓ figure catalog (${figures.length} figures)\n`);

  return { corpus, figures };
}
