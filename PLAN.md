# Build plan

Phase-by-phase execution. Each phase has a clear "done" bar. We don't move on until the current phase meets it.

Current phase: **0 — setup**

---

## Phase 0 — Project setup

- [ ] Next.js 15 app initialized with TypeScript strict, Tailwind, shadcn/ui base
- [ ] Anthropic SDK (`@anthropic-ai/sdk` or `@anthropic-ai/claude-agent-sdk`) installed
- [ ] `.env.example` with `ANTHROPIC_API_KEY=`
- [ ] `package.json` scripts: `dev`, `build`, `start`, `extract`, `eval`
- [ ] `.gitignore` for `.env`, `node_modules`, `.next`, any API-output scratch dirs
- [ ] README placeholder (will rewrite at Phase 10)
- [ ] Model pinned as `claude-opus-4-7` in a single const, imported everywhere

**Done when:** `npm run dev` serves a blank page, `npm run build` succeeds.

---

## Phase 1 — Knowledge pipeline

The most load-bearing phase. Everything else sits on this.

- [ ] `scripts/extract_knowledge.ts` — orchestrator
- [ ] Render each PDF page to a PNG (pdfjs or `pdf-to-png-converter`)
- [ ] For each page: Claude vision call → structured JSON extraction
  - Prose sections with breadcrumbs
  - Figures detected (bbox, caption, depicts tags)
  - Tables detected → typed transcription
- [ ] Crop figures from page PNGs using bboxes → `knowledge/figures/`
- [ ] Assemble:
  - [ ] `knowledge/corpus.json` — prose chunks, section-level, with `{id, breadcrumb, page, content, related_figure_ids, related_structured}`
  - [ ] `knowledge/figures/catalog.json` — `{id, page, caption, depicts[], keywords[], file}`
  - [ ] `knowledge/pages/*.png` — full-page fallback images
  - [ ] `knowledge/structured/duty_cycle.json`
  - [ ] `knowledge/structured/specs.json` (per-process specs from p7)
  - [ ] `knowledge/structured/polarity.json`
  - [ ] `knowledge/structured/wire_compatibility.json`
  - [ ] `knowledge/structured/selection_chart.json` (door-sticker decision tree)
  - [ ] `knowledge/structured/troubleshooting.json` (MIG/Flux + TIG/Stick tables from p42-44)
  - [ ] `knowledge/structured/weld_diagnosis.json` (17 labeled entries with visual_signature, fix, photo ref)
  - [ ] `knowledge/structured/parts_list.json` (61 numbered parts)
  - [ ] `knowledge/structured/safety_symbols.json` (symbology table from p6)
- [ ] Zod schemas for each structured table in `lib/knowledge/schemas.ts`
- [ ] **Manual verification pass** — eyeball every structured JSON for correctness, especially duty_cycle, polarity, weld_diagnosis. Hand-fix anything wrong.

**Done when:** all `knowledge/` files exist, hand-verified, and a quick smoke test loads all of them without schema errors.

---

## Phase 2 — Agent skeleton

- [ ] `lib/agent/model.ts` — exports pinned model id + client
- [ ] `lib/agent/tools.ts` — Zod input schemas for all 7 tools
- [ ] `lib/agent/system-prompt.ts` — builds system prompt with:
  - Role + user model + calibration rule
  - Core rendering principle
  - Decision checklist
  - Full catalog (chunk breadcrumbs, figure captions, table schemas, weld diagnosis entries)
  - Clarification policy
  - Citation rule
  - Safety rule
  - Tone rule
  - 2-3 few-shot "wrong vs right" examples per key template
- [ ] `lib/agent/loop.ts` — runs the two-turn loop with tool use + streaming
- [ ] Tool implementations:
  - [ ] `load_chunks` (returns text blocks)
  - [ ] `load_figures` (returns image content blocks)
  - [ ] `lookup_structured` (returns JSON)
  - [ ] `ask_clarification` (no-op — surfaces to frontend as a message block)
  - [ ] `render_artifact` (validates params with zod, returns artifact_id)
  - [ ] `diagnose_weld_photo` (single vision call with user photo + 17 catalog photos)
- [ ] `app/api/chat/route.ts` — streaming POST endpoint; accepts `{messages, images}`, streams SSE of text + tool-call + artifact events

**Done when:** can `curl` the chat endpoint with "what's the duty cycle for MIG at 200A on 240V" and see streamed text + a `render_artifact` tool call with correct params.

---

## Phase 3 — First two artifacts

Highest-leverage templates first.

- [ ] Master SVG of front panel (based on p8) with labeled node IDs — used by both templates and future component_highlight
- [ ] `lib/artifacts/PolarityDiagram.tsx`
  - Props: `{process, highlight?, compare_with?}`
  - Renders front panel SVG with cables + labels
  - Color-coded (match manual convention)
  - Compare mode: two panels side-by-side
- [ ] `lib/artifacts/DutyCycleMatrix.tsx`
  - Props: `{process?, voltage?, highlight_amps?}`
  - Full matrix table, highlighted cell
  - Clock viz animated (matches manual style on p19/29)
  - Hover any cell → shows its clock
- [ ] Artifact card wrapper (title, body, footer with "Source: page X, figure Y")
- [ ] Test round-trip: agent → tool call → artifact renders with correct data

**Done when:** the two README example questions ("duty cycle for MIG at 200A" and "polarity for TIG, which socket for ground") produce correctly-rendered artifacts via the full agent loop.

---

## Phase 4 — Frontend shell

- [ ] Layout: chat column (max 760px) + sources sidebar (~320px), header
- [ ] Home screen: hero + 6 suggested-question cards
- [ ] Chat UI:
  - [ ] Message list with streaming text + inline artifacts
  - [ ] User messages (with optional image thumbnails)
  - [ ] Input: auto-growing textarea, image upload (click + drag + paste), multi-image
  - [ ] Send button, Enter to send, Shift+Enter newline
  - [ ] Voice mic button (disabled — UI scaffolding for Phase 11)
- [ ] Streaming UX: tool-call indicators ("Looking up duty cycle matrix…"), artifact fade-in
- [ ] Sources sidebar: pages referenced, figures surfaced, tables queried, sticky to focused message, mobile drawer
- [ ] Reasoning toggle in header, localStorage-persisted
- [ ] Dark mode via next-themes, system default
- [ ] Keyboard shortcuts: ⌘K focus input, ⌘/ toggle reasoning, ⌘Enter send
- [ ] Message actions: copy, regenerate
- [ ] Clarification chips rendered inline, click → send value as next message
- [ ] Inline citations as clickable page-number chips → scroll sidebar
- [ ] Mobile-responsive throughout (test on real phone)
- [ ] Accessibility: keyboard nav, ARIA on artifacts, WCAG AA contrast

**Done when:** the full chat loop works end-to-end in browser, including image upload, streaming, artifacts inline, sources sidebar, reasoning toggle. Looks clean on desktop and mobile.

---

## Phase 5 — Weld diagnosis flow

- [ ] `diagnose_weld_photo` tool: vision call with user photo + 17 catalog photos + visual_signature labels → returns `{top_match, runner_up, confidence, fix_steps}`
- [ ] `lib/artifacts/WeldComparison.tsx`
  - Props: `{user_image_url, catalog_id, runner_up_id?}`
  - Side-by-side layout with labels + fix steps
  - "Not my issue?" button emits follow-up clarification
- [ ] End-to-end test: upload a weld photo from `evals/fixtures/`, get correct diagnosis

**Done when:** uploading any of the 17 reference photos returns a confident correct match and renders side-by-side.

---

## Phase 6 — Remaining artifacts

Build in priority order. Each must reach demo quality before moving on.

- [ ] `SettingsConfigurator` — LCD-styled, editable inputs, computed outputs
- [ ] `TroubleshootingTree` — collapsible decision tree, "I tried this" branch hooks
- [ ] `ProceduralWalkthrough` — step carousel, topic-parameterized
- [ ] `ComponentHighlight` — arrow/glow overlay on a figure
- [ ] `SelectionChartInteractive` — interactive door sticker

**Done when:** all 8 templates work through the full agent loop, each for at least 2 test queries.

---

## Phase 7 — Evals

- [ ] Write `evals/questions.yaml` (~25-30 questions across categories)
- [ ] `evals/fixtures/` with reference weld photos
- [ ] `scripts/run_evals.ts` — runs each question, dumps markdown report with answer, artifact types, tool calls, citations, timing
- [ ] First full run + manual grading → `evals/results.md`
- [ ] Iterate until all questions hit ≥2/3 on every rubric dimension (correctness, modality, completeness, grounding, tone)

**Done when:** `evals/results.md` shows no failures on the 3 README questions and overall score ≥85% across the rubric.

---

## Phase 8 — Polish

- [ ] Demo Mode: pre-recorded answers for the 6 suggested questions when no API key is set
- [ ] Error states: API error banners, upload rejection, timeout handling
- [ ] Mobile polish — real-phone testing pass
- [ ] Accessibility audit
- [ ] Performance: warmup request on page load, prompt caching verified
- [ ] Cross-browser: Chrome, Safari, Firefox, mobile Safari
- [ ] All artifact footers have source attribution
- [ ] Remove all console.logs, dead code

**Done when:** cold load → first suggested question → full answer with artifact looks crisp on desktop Chrome, desktop Safari, and iPhone Safari.

---

## Phase 9 — Deploy

- [ ] Vercel project linked
- [ ] Env vars in Vercel dashboard
- [ ] Custom subdomain chosen
- [ ] Hosted deploy verified — run all 6 suggested questions
- [ ] Fluid compute confirmed working for long streaming responses

**Done when:** hosted URL works for all demo flows, loads quickly from a cold start.

---

## Phase 10 — README

(Video cut from scope — deferred to TODO.md. Evaluators read the README and
run the hosted demo.)

- [ ] README rewrite:
  - TL;DR with hosted link
  - Run-in-2-minutes
  - Screenshots of signature artifacts (4-5)
  - Design decisions (condensed)
  - Architecture diagram (Excalidraw PNG)
  - Knowledge pipeline explanation
  - Agent loop + tools
  - Artifact system
  - Evals section with reproduction steps
  - What's next (link to TODO.md)
  - Credits

**Done when:** a stranger can read the README, clone, run, and see working demos in under 5 minutes.

---

## Phase 11 — Voice (CUT)

Deferred to TODO.md. Not in this submission.

---

## Submission

- [ ] Final eval pass clean
- [ ] `TODO.md` honest and up to date
- [ ] Hosted deploy working
- [ ] README polished
- [ ] Fork pushed to GitHub
- [ ] Submit fork URL to useprox.com/join/challenge
