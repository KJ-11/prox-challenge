import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { extname, join } from "node:path";
import { performance } from "node:perf_hooks";
import * as jsYaml from "js-yaml";
import { runAgent } from "../lib/agent/loop.js";
import type { ServerEvent } from "../lib/agent/events.js";

/* ---------- env ---------- */

function loadDotEnv() {
  if (!existsSync(".env")) return;
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

/* ---------- question schema ---------- */

interface EvalQuestion {
  id: string;
  question: string;
  image?: string;
  context?: string;
  category?: string;
  expected_modality?: "artifact" | "prose" | "clarification";
  expected_artifact_type?: string;
  expected_tools?: string[];
  must_cite_pages?: number[];
  must_mention?: string[];
  must_not_mention?: string[];
}

function loadQuestions(path: string): EvalQuestion[] {
  const raw = readFileSync(path, "utf8");
  const parsed = jsYaml.load(raw);
  if (!Array.isArray(parsed)) throw new Error("questions.yaml must be a list");
  return parsed as EvalQuestion[];
}

/* ---------- image support ---------- */

const IMAGE_MEDIA_TYPES: Record<string, "image/png" | "image/jpeg" | "image/webp" | "image/gif"> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function userMessageFor(q: EvalQuestion) {
  const content: Array<
    | { type: "text"; text: string }
    | {
        type: "image";
        source: {
          type: "base64";
          media_type: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
          data: string;
        };
      }
  > = [];
  if (q.image) {
    const ext = extname(q.image).toLowerCase();
    const mediaType = IMAGE_MEDIA_TYPES[ext] ?? "image/png";
    const data = readFileSync(q.image).toString("base64");
    content.push({
      type: "image",
      source: { type: "base64", media_type: mediaType, data },
    });
  }
  content.push({ type: "text", text: q.question });
  return { role: "user" as const, content };
}

/* ---------- per-question execution ---------- */

interface CollectedToolCall {
  id: string;
  name: string;
  args: string;
  completed: boolean;
}

interface QuestionResult {
  id: string;
  text: string;
  toolCalls: CollectedToolCall[];
  artifacts: Array<{ type: string; params: unknown }>;
  clarifications: Array<{ question: string; options: Array<{ label: string; value: string }> }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens: number;
    cache_creation_input_tokens: number;
  };
  stopReason: string;
  errorMessage?: string;
  ttftMs: number | null;
  totalMs: number;
}

async function runQuestion(q: EvalQuestion): Promise<QuestionResult> {
  const start = performance.now();
  let firstEventMs: number | null = null;
  const textChunks: string[] = [];
  const toolCallMap = new Map<string, CollectedToolCall>();
  const artifacts: QuestionResult["artifacts"] = [];
  const clarifications: QuestionResult["clarifications"] = [];
  const usage = {
    input_tokens: 0,
    output_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
  };
  let stopReason = "unknown";
  let errorMessage: string | undefined;

  const userMsg = userMessageFor(q);

  try {
    for await (const event of runAgent({ messages: [userMsg] as Parameters<typeof runAgent>[0]["messages"] })) {
      if (firstEventMs === null) firstEventMs = performance.now() - start;
      applyToResult(event, {
        textChunks,
        toolCallMap,
        artifacts,
        clarifications,
        usage,
      });
      if (event.type === "done") stopReason = event.stop_reason;
      if (event.type === "error") errorMessage = event.message;
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  return {
    id: q.id,
    text: textChunks.join(""),
    toolCalls: Array.from(toolCallMap.values()),
    artifacts,
    clarifications,
    usage,
    stopReason,
    errorMessage,
    ttftMs: firstEventMs,
    totalMs: performance.now() - start,
  };
}

function applyToResult(
  event: ServerEvent,
  sink: {
    textChunks: string[];
    toolCallMap: Map<string, CollectedToolCall>;
    artifacts: QuestionResult["artifacts"];
    clarifications: QuestionResult["clarifications"];
    usage: QuestionResult["usage"];
  },
) {
  switch (event.type) {
    case "text_delta":
      sink.textChunks.push(event.text);
      break;
    case "tool_call_start":
      sink.toolCallMap.set(event.id, {
        id: event.id,
        name: event.name,
        args: "",
        completed: false,
      });
      break;
    case "tool_call_args_delta": {
      const tc = sink.toolCallMap.get(event.id);
      if (tc) tc.args += event.delta;
      break;
    }
    case "tool_call_result": {
      const tc = sink.toolCallMap.get(event.id);
      if (tc) tc.completed = true;
      break;
    }
    case "artifact":
      sink.artifacts.push({ type: event.artifact_type, params: event.params });
      break;
    case "clarification":
      sink.clarifications.push({
        question: event.question,
        options: event.options,
      });
      break;
    case "usage":
      sink.usage.input_tokens += event.input_tokens;
      sink.usage.output_tokens += event.output_tokens;
      sink.usage.cache_read_input_tokens += event.cache_read_input_tokens ?? 0;
      sink.usage.cache_creation_input_tokens +=
        event.cache_creation_input_tokens ?? 0;
      break;
  }
}

/* ---------- auto-checks ---------- */

interface Checks {
  modality_match: boolean | null;
  artifact_type_match: boolean | null;
  tools_match: boolean | null;
  pages_cited: boolean | null;
  must_mention_hits: Array<{ phrase: string; hit: boolean }>;
  must_not_mention_violations: string[];
}

function checkQuestion(q: EvalQuestion, r: QuestionResult): Checks {
  const lowerText = r.text.toLowerCase();
  const artifactTypes = new Set(r.artifacts.map((a) => a.type));
  const toolNames = new Set(r.toolCalls.map((t) => t.name));

  const modality_match = (() => {
    if (!q.expected_modality) return null;
    if (q.expected_modality === "artifact") return r.artifacts.length > 0;
    if (q.expected_modality === "clarification") return r.clarifications.length > 0;
    if (q.expected_modality === "prose") return r.artifacts.length === 0 && r.clarifications.length === 0;
    return null;
  })();

  const artifact_type_match = q.expected_artifact_type
    ? artifactTypes.has(q.expected_artifact_type)
    : null;

  const tools_match = q.expected_tools
    ? q.expected_tools.every((t) => toolNames.has(t))
    : null;

  const pages_cited = q.must_cite_pages
    ? (() => {
        // At least one of the expected pages is cited in the text
        // (artifacts also render their own source footers).
        return q.must_cite_pages.some((p) => {
          const patterns = [
            new RegExp(`\\bp\\.?\\s*${p}\\b`, "i"),
            new RegExp(`\\bpage\\s*${p}\\b`, "i"),
          ];
          return patterns.some((rx) => rx.test(r.text));
        });
      })()
    : null;

  const must_mention_hits = (q.must_mention ?? []).map((phrase) => ({
    phrase,
    hit: lowerText.includes(phrase.toLowerCase()),
  }));

  const must_not_mention_violations = (q.must_not_mention ?? []).filter((phrase) =>
    lowerText.includes(phrase.toLowerCase()),
  );

  return {
    modality_match,
    artifact_type_match,
    tools_match,
    pages_cited,
    must_mention_hits,
    must_not_mention_violations,
  };
}

/* ---------- markdown rendering ---------- */

function renderBadge(label: string, pass: boolean | null): string {
  if (pass === null) return "";
  return pass ? `✅ ${label}` : `❌ ${label}`;
}

function renderQuestionSection(
  q: EvalQuestion,
  r: QuestionResult,
  c: Checks,
  index: number,
): string {
  const header = `### ${index + 1}. ${q.id}`;
  const badges = [
    renderBadge(
      `modality=${q.expected_modality ?? "—"}`,
      c.modality_match,
    ),
    renderBadge(
      `artifact=${q.expected_artifact_type ?? "—"}`,
      c.artifact_type_match,
    ),
    renderBadge(
      `tools=[${(q.expected_tools ?? []).join(",")}]`,
      c.tools_match,
    ),
    renderBadge(
      `pages=[${(q.must_cite_pages ?? []).join(",")}]`,
      c.pages_cited,
    ),
    r.errorMessage ? `❌ ERROR` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const mustMentionLines = c.must_mention_hits.length
    ? "- must_mention: " +
      c.must_mention_hits
        .map((h) => `${h.hit ? "✓" : "✗"} \`${h.phrase}\``)
        .join(", ")
    : "";
  const mustNotMentionLines = c.must_not_mention_violations.length
    ? `- ❌ must_not_mention violations: ${c.must_not_mention_violations.join(", ")}`
    : "";

  const toolCallsSection =
    r.toolCalls.length > 0
      ? r.toolCalls
          .map((tc) => `  - \`${tc.name}(${truncate(tc.args, 160)})\``)
          .join("\n")
      : "  (none)";

  const artifactsSection =
    r.artifacts.length > 0
      ? r.artifacts
          .map(
            (a) =>
              `  - **${a.type}** · ${truncate(JSON.stringify(a.params), 160)}`,
          )
          .join("\n")
      : "  (none)";

  const clarificationSection =
    r.clarifications.length > 0
      ? r.clarifications
          .map(
            (cl) =>
              `  - "${cl.question}" → [${cl.options.map((o) => o.label).join(", ")}]`,
          )
          .join("\n")
      : "  (none)";

  const context = q.context ? `> ${q.context}\n` : "";
  const imageLine = q.image ? `\n**Image:** \`${q.image}\`\n` : "";

  return `
${header}

**Question:** ${q.question}${imageLine}

${context}${badges}

${mustMentionLines}
${mustNotMentionLines}

**Text response:**
${indent(r.text || "(empty)", "> ")}

**Tool calls:**
${toolCallsSection}

**Artifacts:**
${artifactsSection}

**Clarifications:**
${clarificationSection}

**Stats:** ttft ${r.ttftMs !== null ? r.ttftMs.toFixed(0) : "?"}ms · total ${r.totalMs.toFixed(0)}ms · input ${r.usage.input_tokens} · output ${r.usage.output_tokens} · cache read ${r.usage.cache_read_input_tokens} · cache write ${r.usage.cache_creation_input_tokens} · stop=${r.stopReason}${r.errorMessage ? ` · error=${r.errorMessage}` : ""}
`;
}

function indent(s: string, prefix: string): string {
  return s
    .split("\n")
    .map((line) => prefix + line)
    .join("\n");
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "…";
}

function renderSummary(
  results: Array<{ q: EvalQuestion; r: QuestionResult; c: Checks }>,
): string {
  const total = results.length;
  const failures: string[] = [];
  let modalityPass = 0;
  let artifactPass = 0;
  let toolsPass = 0;
  let pagesPass = 0;
  let modalityN = 0;
  let artifactN = 0;
  let toolsN = 0;
  let pagesN = 0;
  let mustMentionMisses = 0;
  let mustNotViolations = 0;
  let errors = 0;
  let totalInput = 0;
  let totalOutput = 0;
  let totalCacheRead = 0;
  let totalCacheWrite = 0;
  let ttfts: number[] = [];
  let totals: number[] = [];

  for (const { q, r, c } of results) {
    if (c.modality_match !== null) {
      modalityN++;
      if (c.modality_match) modalityPass++;
      else failures.push(`${q.id}: modality (wanted ${q.expected_modality})`);
    }
    if (c.artifact_type_match !== null) {
      artifactN++;
      if (c.artifact_type_match) artifactPass++;
      else failures.push(`${q.id}: artifact type`);
    }
    if (c.tools_match !== null) {
      toolsN++;
      if (c.tools_match) toolsPass++;
      else failures.push(`${q.id}: tools`);
    }
    if (c.pages_cited !== null) {
      pagesN++;
      if (c.pages_cited) pagesPass++;
      else failures.push(`${q.id}: pages cited`);
    }
    const missedMentions = c.must_mention_hits.filter((h) => !h.hit).length;
    mustMentionMisses += missedMentions;
    if (missedMentions > 0) failures.push(`${q.id}: missed mentions (${missedMentions})`);
    if (c.must_not_mention_violations.length > 0) {
      mustNotViolations += c.must_not_mention_violations.length;
      failures.push(`${q.id}: must_not_mention violation`);
    }
    if (r.errorMessage) {
      errors++;
      failures.push(`${q.id}: ERROR — ${r.errorMessage}`);
    }
    totalInput += r.usage.input_tokens;
    totalOutput += r.usage.output_tokens;
    totalCacheRead += r.usage.cache_read_input_tokens;
    totalCacheWrite += r.usage.cache_creation_input_tokens;
    if (r.ttftMs !== null) ttfts.push(r.ttftMs);
    totals.push(r.totalMs);
  }

  const avg = (xs: number[]) =>
    xs.length === 0 ? "—" : Math.round(xs.reduce((a, b) => a + b, 0) / xs.length).toString();

  return `
## Summary

- **Total questions:** ${total}
- **Modality match:** ${modalityPass}/${modalityN}
- **Artifact type match:** ${artifactPass}/${artifactN}
- **Tools match:** ${toolsPass}/${toolsN}
- **Pages cited:** ${pagesPass}/${pagesN}
- **Must-mention misses:** ${mustMentionMisses}
- **Must-not-mention violations:** ${mustNotViolations}
- **Errors:** ${errors}

**Timing:** avg TTFT ${avg(ttfts)}ms · avg total ${avg(totals)}ms
**Tokens:** input ${totalInput.toLocaleString()} · output ${totalOutput.toLocaleString()} · cache read ${totalCacheRead.toLocaleString()} · cache write ${totalCacheWrite.toLocaleString()}

${failures.length === 0 ? "🎉 No failures against the auto-checks." : "### Failures\n\n" + failures.map((f) => `- ${f}`).join("\n")}
`;
}

/* ---------- main ---------- */

async function main() {
  loadDotEnv();
  const args = process.argv.slice(2);
  const only = args.find((a) => a.startsWith("--only="))?.slice("--only=".length);
  const onlyIds = only ? new Set(only.split(",")) : null;

  const questions = loadQuestions("evals/questions.yaml").filter(
    (q) => !onlyIds || onlyIds.has(q.id),
  );

  process.stderr.write(`running ${questions.length} evals…\n\n`);

  const results: Array<{ q: EvalQuestion; r: QuestionResult; c: Checks }> = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const prefix = `[${i + 1}/${questions.length}] ${q.id}`;
    process.stderr.write(`${prefix}…`);
    const r = await runQuestion(q);
    const c = checkQuestion(q, r);
    results.push({ q, r, c });
    const ok =
      c.modality_match !== false &&
      c.artifact_type_match !== false &&
      c.tools_match !== false &&
      c.pages_cited !== false &&
      c.must_mention_hits.every((h) => h.hit) &&
      c.must_not_mention_violations.length === 0 &&
      !r.errorMessage;
    process.stderr.write(
      ` ${ok ? "✓" : "✗"} (${r.totalMs.toFixed(0)}ms · artifacts=${r.artifacts.length} · tools=${r.toolCalls.length})\n`,
    );
  }

  const timestamp = new Date().toISOString();
  const body = `# Eval run · ${timestamp}

Generated by \`npm run eval\`. Model: \`claude-opus-4-7\`.

${renderSummary(results)}

---

## Per-question detail

${results.map((x, i) => renderQuestionSection(x.q, x.r, x.c, i)).join("\n---\n")}
`;

  mkdirSync("evals", { recursive: true });
  writeFileSync(join("evals", "results.md"), body);
  process.stderr.write(`\nwrote evals/results.md\n`);
}

main().catch((err) => {
  process.stderr.write(`\nfatal: ${err instanceof Error ? err.stack : err}\n`);
  process.exit(1);
});
