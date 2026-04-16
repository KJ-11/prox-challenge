# CLAUDE.md

Context for Claude working in this repository. Read this first.

## What this is

Fork of the Prox founding-engineer challenge (`prox-technologies/prox-challenge`). We're building a multimodal reasoning agent for the **Vulcan OmniPro 220** multiprocess welder, using the Claude Agent SDK. The submission is judged on:

1. **Technical accuracy** across cross-referenced manual content (duty cycles, polarity, compatibility)
2. **Multimodal response quality** — the agent must *render* diagrams/matrices/flowcharts, not describe them in prose
3. **Presentation** — frontend, hosting, README clarity, video walkthrough

Source materials are in `files/` (48-page owner's manual, quick-start guide, selection chart).

## Core design principles (non-negotiable)

1. **Visual-first answers.** If an answer involves a diagram, matrix, multi-step procedure, or visual interpretation, the agent MUST render it via `render_artifact`. Prose describing a diagram is a failure mode.
2. **Single API key.** Setup must be `clone → cp .env → npm install → npm run dev`. Evaluators supply one `ANTHROPIC_API_KEY`. No second key for embeddings, TTS, etc.
3. **Pre-built knowledge, committed to repo.** Don't extract PDFs at runtime. Everything in `knowledge/` ships in the repo so setup is under 2 minutes.
4. **Claude-as-retriever, not embeddings.** The full catalog (~130 items: chunk breadcrumbs, figure captions, structured table schemas) lives in the cached system prompt. The agent picks IDs directly via tool calls. No vector DB.
5. **Pre-built artifact templates, not generative.** 8 React components with typed params. No iframes, no sandboxes. Generative fallback deferred to `TODO.md`.
6. **User model is variable.** Agent calibrates tone/depth from the user's vocabulary and question style. Don't assume "garage hobbyist."
7. **Model pinned.** Use `claude-opus-4-7` explicitly, not a moving default.

## Architecture at a glance

```
knowledge/          ← pre-extracted, committed
  corpus.json       ← prose chunks with breadcrumbs
  figures/          ← cropped PNGs + catalog.json
  pages/            ← full-page PNGs (fallback)
  structured/       ← duty_cycle.json, polarity.json, etc.

lib/
  agent/            ← Agent SDK config, tool defs, system prompt builder
  artifacts/        ← 8 pre-built React templates
  knowledge/        ← loaders

app/
  api/chat/         ← streaming agent endpoint
  page.tsx          ← chat UI + home screen
  components/

scripts/
  extract_knowledge.ts   ← one-time PDF → knowledge/
  run_evals.ts           ← run agent on evals/questions.yaml

evals/
  questions.yaml         ← ~25-30 annotated test cases
  fixtures/              ← weld photos for vision tests
  results.md             ← graded output
```

## Agent loop

```
user message (+ optional image)
  ↓
Claude turn 1: decide — clarify? load knowledge? analyze photo?
  → batch tool calls in parallel (load_chunks, load_figures, lookup_structured, diagnose_weld_photo)
  ↓
tool results
  ↓
Claude turn 2: pick answer form
  → if visual: render_artifact(type, params) → artifact_id
  → stream text referencing artifact inline: "Here's the setup: [artifact:a1]"
  ↓
frontend renders text + React artifacts inline, in order
```

## Tools (7 total)

| Tool | Purpose |
|---|---|
| `load_chunks(ids[])` | Batch prose load by ID |
| `load_figures(ids[])` | Batch figure load as image content blocks |
| `lookup_structured(table, filters?)` | Query JSON tables |
| `diagnose_weld_photo(image_ref, context?)` | Match user weld photo against 17-entry catalog |
| `render_artifact(type, params)` | Render one of 8 pre-built templates |
| `ask_clarification(question, options[])` | Structured multi-choice follow-up |
| (no search tool — agent picks IDs from cached catalog) | |

## Artifact templates (8)

1. `polarity_diagram` — SVG front panel with cables per process
2. `duty_cycle_matrix` — highlighted cell + clock viz
3. `settings_configurator` — LCD-mockup with computed values
4. `troubleshooting_tree` — decision tree with linked figures
5. `component_highlight` — arrow/glow overlay on a figure
6. `weld_comparison` — user photo ↔ catalog match side-by-side
7. `selection_chart_interactive` — interactive door sticker
8. `procedural_walkthrough` — step carousel for any multi-step procedure (cable setup, spool loading, tungsten sharpening, etc.)

## Commands

```bash
npm install              # deps
npm run dev              # local dev on :3000
npm run build            # production build
npm run start            # production server

npm run extract          # one-time: PDFs → knowledge/ (DO NOT run unless knowledge/ is missing or PDFs changed)
npm run eval             # run agent against evals/questions.yaml, write evals/results.md
```

## Conventions

- **TypeScript strict.** No `any` without comment explaining why.
- **Zod** for all tool input schemas and artifact params.
- **Tailwind + shadcn/ui** for styling. Dark mode via `next-themes`.
- **Next.js App Router** (not pages).
- **Streaming** everywhere possible — user should see tokens within 1s.
- **No `console.log` in committed code.** Use a real logger if needed, or remove.
- **File names**: kebab-case for files, PascalCase for React components, camelCase for functions.
- **One component per file** in `lib/artifacts/` and `app/components/`.

## What NOT to do

- Do NOT add embeddings, vector DBs, or second API keys.
- Do NOT create a generative/custom artifact fallback (deferred — see `TODO.md`).
- Do NOT extract PDFs at runtime. Extraction is one-time.
- Do NOT describe a diagram in prose when an artifact template exists. This is the whole point.
- Do NOT ship without running `npm run eval` and reviewing the results.
- Do NOT commit `.env`. `.env.example` only.
- Do NOT use moving model aliases. Pin `claude-opus-4-7`.
- Do NOT add features beyond the 10 pillars without discussing first.

## Pointers

- **Build plan + current phase**: `PLAN.md`
- **Deferred / cut work**: `TODO.md`
- **Original challenge**: `README.md` (will be rewritten before submission)
- **Source PDFs**: `files/`
- **Test set**: `evals/questions.yaml`
