# Deferred work

What we consciously cut from MVP and why. Some of this would ship with more time; some is noted as real ambition for the role itself.

## Cut from MVP, would revisit with time

### `render_custom_artifact` — generative artifact fallback

Tool that lets the agent emit custom HTML/SVG when no pre-built template fits. Adds surface area: sandbox hardening, prompt-engineering for reliable code, broken-output handling.

Current fallback when no template fits: the agent inlines 1-2 manual figures + writes concise prose. Worse than a bespoke artifact, but not broken.

Revisit if: we have time and the 8 templates leave visible gaps during eval.

### Voice — upgrade path beyond Web Speech API

MVP voice (if built in Phase 11) uses the browser-native Web Speech API. It has no API-key cost but sounds robotic and inconsistent across browsers.

Real ambition (from the job description): "expressive voice AI that can pass the Turing test." The path there:

- **Mode A+**: premium TTS via ElevenLabs or OpenAI TTS (opt-in second API key for hosted demo)
- **Mode B**: realtime continuous voice via OpenAI Realtime API — feels like a phone call in-browser
- **Mode C**: phone-based via Twilio SIP with a real phone number

All require additional infrastructure and at least one additional API key.

### Shareable conversation URLs

Each conversation (or even each artifact state) addressable by URL so reviewers can link directly to a demo moment. Adds backend state (Postgres/Redis) and complicates deployment.

### Conversation history / multiple threads

Sidebar of past conversations, localStorage or backend. Single-session is fine for the demo.

### LLM-as-judge evaluation

Have Claude grade Claude's answers against the rubric. Faster iteration than manual grading, but self-grading bias makes it unreliable for the final submission grade. Use for CI later, not now.

### Compare-runs regression tracking

Eval runner that diffs current vs previous run, flags regressions per question. Nice for long-term development; overkill for one-shot submission.

### Real user weld photo fixtures

`evals/fixtures/` currently uses the reference photos from the manual itself (pp. 35, 38) for deterministic testing. Real photos from welding forums would test robustness on out-of-distribution inputs. Decided to skip for MVP — deterministic tests are enough signal.

### CI for evals

Requires API key in GitHub Actions secrets and hits rate limits on PR-heavy days. Run evals locally for now.

### Per-artifact shareable state URLs

Each interactive artifact (settings configurator, selection chart) addressable at `/artifact/duty-cycle-mig-240v-200a` so evaluators can link to specific states. Nice polish, low priority.

### Analytics / telemetry

No PostHog or similar. Not needed for a demo submission.

### Per-entry crops on weld_diagnosis catalog

Each of the 35 `weld_diagnosis` entries points to a full page PNG
(`page_image_ref`). The schema has a `crop_bbox_normalized` field but it's
unpopulated. `WeldComparison` renders the full page with a prominent label
chip and `visual_signature` description, which works but is noisier than a
tight per-entry crop would be.

Fix: programmatically crop the 6-wide wire grid on p35 and 7-wide stick
grid on p38 into equal columns; hand-crop the singletons on pp. 36-37,
39-40. Populate `crop_bbox_normalized` in `weld_diagnosis.json`.
`WeldComparison` already respects the field if present.

## Known limitations we're not fixing in MVP

- Visual diagnosis catalog is limited to the 17 conditions labeled in the manual. Real welds exhibit combinations and edge cases beyond these.
- Structured tables are a snapshot. If Harbor Freight revises the manual, we'd need to re-extract — there's no live sync.
- Web Speech API TTS (if voice ships) is robotic compared to what's possible with hosted TTS.
- Evaluation can't be fully automated without grading bias.

## What we won't build, ever

Items that conflict with the design principles and aren't coming back:

- Embeddings / vector DBs. Claude-as-retriever is the design.
- Second required API key at runtime. Single-key setup is non-negotiable.
- Moving model aliases. We pin `claude-opus-4-7`.
- Runtime PDF extraction. Knowledge is pre-built and committed.
