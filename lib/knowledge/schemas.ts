import { z } from "zod";

/* ---------- shared enums ---------- */

export const ProcessSchema = z.enum(["mig", "flux_cored", "tig", "stick"]);
export type Process = z.infer<typeof ProcessSchema>;

export const VoltageSchema = z.enum(["120V", "240V"]);
export type Voltage = z.infer<typeof VoltageSchema>;

export const SocketSchema = z.enum([
  "positive",
  "negative",
  "wire_feed_cable",
  "mig_gun_socket",
  "spool_gun_gas_outlet",
]);
export type Socket = z.infer<typeof SocketSchema>;

/* ---------- duty cycle (pages 7, 19, 29) ---------- */

export const DutyCycleRowSchema = z.object({
  process: ProcessSchema,
  voltage: VoltageSchema,
  current_range_amps: z.object({ min: z.number(), max: z.number() }),
  rated_duty_cycle: z.object({
    percent: z.number(),
    at_amperage: z.number(),
    minutes_welding_per_10: z.number(),
    minutes_resting_per_10: z.number(),
  }),
  continuous_amperage: z.number().describe("Amps sustainable at 100% duty cycle"),
  current_input_at_output: z
    .object({ amps: z.number(), at_output_amps: z.number() })
    .optional(),
});
export const DutyCycleSchema = z.array(DutyCycleRowSchema);
export type DutyCycle = z.infer<typeof DutyCycleSchema>;

/* ---------- specs (page 7) ---------- */

export const ProcessSpecsSchema = z.object({
  process: ProcessSchema,
  power_input: z.array(
    z.object({ voltage: VoltageSchema, hz: z.number().default(60) }),
  ),
  current_input_at_output: z.array(
    z.object({
      voltage: VoltageSchema,
      input_amps: z.number(),
      output_amps: z.number(),
    }),
  ),
  welding_current_range: z.array(
    z.object({
      voltage: VoltageSchema,
      min_amps: z.number(),
      max_amps: z.number(),
    }),
  ),
  max_ocv_vdc: z.number(),
  weldable_materials: z.array(z.string()),
  welding_wire_capacity: z
    .object({
      solid_core_inches: z.array(z.string()).optional(),
      flux_cored_inches: z.array(z.string()).optional(),
    })
    .optional(),
  wire_speed_ipm: z.object({ min: z.number(), max: z.number() }).optional(),
  wire_spool_capacity_lb: z.number().optional(),
});
export const SpecsSchema = z.array(ProcessSpecsSchema);
export type Specs = z.infer<typeof SpecsSchema>;

/* ---------- polarity (pages 13, 14, 24, 27) ---------- */

export const PolarityEntrySchema = z.object({
  process: ProcessSchema,
  label: z.string().describe('e.g., "DCEN" or "DCEP"'),
  label_full: z.string().describe('e.g., "Direct Current Electrode Negative"'),
  ground_clamp_socket: z.enum(["positive", "negative"]),
  work_cable_name: z
    .string()
    .describe('e.g., "MIG gun / wire feed power", "TIG torch", "electrode holder"'),
  work_cable_socket: z.enum(["positive", "negative"]),
  notes: z.string().optional(),
  source_pages: z.array(z.number()),
});
export const PolaritySchema = z.array(PolarityEntrySchema);
export type Polarity = z.infer<typeof PolaritySchema>;

/* ---------- wire compatibility (pages 7, 12) ---------- */

export const WireCompatibilitySchema = z.object({
  solid_core: z.object({
    sizes_inches: z.array(z.string()),
    groove_type: z.literal("V-groove"),
    materials: z.array(z.string()),
    shielding_gas_required: z.boolean(),
  }),
  flux_cored: z.object({
    sizes_inches: z.array(z.string()),
    groove_type: z.literal("knurled"),
    materials: z.array(z.string()),
    shielding_gas_required: z.boolean(),
  }),
  feed_roller_markings: z
    .array(
      z.object({
        groove_side: z.enum(["V-groove", "knurled"]),
        label: z.string(),
        fits_sizes_inches: z.array(z.string()),
      }),
    )
    .describe("From the feed roller diagram on page 12"),
});
export type WireCompatibility = z.infer<typeof WireCompatibilitySchema>;

/* ---------- selection chart (the door sticker) ---------- */

export const ProcessColumnSchema = z.object({
  process: ProcessSchema,
  shielding_gas_required: z.boolean(),
  materials: z.array(z.string()),
  thickness_range: z.string().describe('e.g., "18 Gauge to 5/16\\""'),
  typical_applications: z.array(z.string()),
  cleanliness: z.string().describe('e.g., "more spatter", "clean / minimal spatter"'),
  advantages: z.array(z.string()),
  skill_level_best_fit: z.array(z.enum(["low", "moderate", "high"])),
});

export const SelectionChartSchema = z.object({
  decision_questions: z.array(
    z.object({
      step: z.number(),
      question: z.string(),
      affects: z.string().describe("which field it filters on"),
    }),
  ),
  process_columns: z.array(ProcessColumnSchema),
  duty_cycle_example: z
    .object({
      amps: z.number(),
      duty_cycle_percent: z.number(),
      minutes_welding: z.number(),
      minutes_resting: z.number(),
    })
    .optional(),
});
export type SelectionChart = z.infer<typeof SelectionChartSchema>;

/* ---------- troubleshooting (pages 42-44) ---------- */

export const TroubleshootingEntrySchema = z.object({
  id: z.string(),
  process_family: z.enum(["wire", "tig_stick"]),
  problem: z.string(),
  causes: z.array(
    z.object({
      cause: z.string(),
      solution: z.string(),
      linked_figure_id: z.string().optional(),
      linked_chunk_id: z.string().optional(),
    }),
  ),
  source_page: z.number(),
});
export const TroubleshootingSchema = z.array(TroubleshootingEntrySchema);
export type Troubleshooting = z.infer<typeof TroubleshootingSchema>;

/* ---------- weld diagnosis catalog (pages 35-40) ---------- */

export const WeldDiagnosisEntrySchema = z.object({
  id: z.string().describe('slug, e.g., "wire_voltage_too_low"'),
  process_family: z.enum(["wire", "stick"]),
  category: z.enum([
    "baseline",
    "heat_control",
    "travel_speed",
    "arc_length",
    "polarity_or_ctwd",
    "porosity",
    "spatter",
    "wavy_bead",
    "burn_through",
    "slag",
    "penetration",
    "bend",
    "adhesion",
  ]),
  view: z.enum(["top", "profile", "strike_test"]),
  label: z.string().describe('display name, e.g., "Voltage Too Low or Wire Feed Too Slow"'),
  visual_signature: z
    .string()
    .describe(
      "Textual description of what this defect LOOKS like — used for embedding-free matching",
    ),
  fix_summary: z.string(),
  fix_details: z.array(z.string()),
  source_page: z.number(),
  page_image_ref: z
    .string()
    .describe("Path under knowledge/pages/ that contains this photo"),
  crop_bbox_normalized: z
    .object({ x1: z.number(), y1: z.number(), x2: z.number(), y2: z.number() })
    .optional()
    .describe("Normalized [0,1] bbox within the page image, if we've cropped"),
  individual_photo_ref: z
    .string()
    .optional()
    .describe("Path to an individually-cropped photo, if we have one"),
});
export const WeldDiagnosisSchema = z.array(WeldDiagnosisEntrySchema);
export type WeldDiagnosis = z.infer<typeof WeldDiagnosisSchema>;

/* ---------- parts list (pages 46-47) ---------- */

export const PartEntrySchema = z.object({
  number: z.number(),
  description: z.string(),
  qty: z.number(),
});
export const PartsListSchema = z.array(PartEntrySchema);
export type PartsList = z.infer<typeof PartsListSchema>;

/* ---------- safety symbols (page 6) ---------- */

export const SafetySymbolSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  icon_hint: z
    .string()
    .describe("Lucide icon name we can use as a stand-in (or 'custom')"),
});
export const SafetySymbolsSchema = z.array(SafetySymbolSchema);
export type SafetySymbols = z.infer<typeof SafetySymbolsSchema>;

/* ---------- prose corpus ---------- */

export const ChunkSchema = z.object({
  id: z.string().describe("stable slug id"),
  source_document: z.enum(["owner_manual", "quick_start", "selection_chart"]),
  breadcrumb: z.array(z.string()),
  page: z.number(),
  content: z.string(),
  related_figure_ids: z.array(z.string()).default([]),
  related_structured: z.array(z.string()).default([]),
});
export const CorpusSchema = z.array(ChunkSchema);
export type Chunk = z.infer<typeof ChunkSchema>;
export type Corpus = z.infer<typeof CorpusSchema>;

/* ---------- figure catalog ---------- */

export const FigureEntrySchema = z.object({
  id: z.string(),
  source_document: z.enum(["owner_manual", "quick_start", "selection_chart"]),
  page: z.number(),
  caption: z.string(),
  depicts: z.array(z.string()).describe("Tags for what the figure shows"),
  keywords: z.array(z.string()),
  page_image_ref: z.string(),
  crop_ref: z.string().optional(),
});
export const FigureCatalogSchema = z.array(FigureEntrySchema);
export type FigureEntry = z.infer<typeof FigureEntrySchema>;
export type FigureCatalog = z.infer<typeof FigureCatalogSchema>;
