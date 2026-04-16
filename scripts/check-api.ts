import { existsSync, readFileSync } from "node:fs";
import { anthropic, MODEL_ID } from "../lib/agent/model.js";

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

async function main() {
  loadDotEnv();
  process.stderr.write("testing haiku (cheap)…\n");
  try {
    const r1 = await anthropic().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 20,
      messages: [{ role: "user", content: "say OK" }],
    });
    const txt = r1.content.find((b) => b.type === "text");
    process.stderr.write(`  haiku OK: ${txt && txt.type === "text" ? txt.text : ""}\n`);
  } catch (err) {
    process.stderr.write(`  haiku FAILED: ${(err as Error).message}\n`);
    return;
  }
  process.stderr.write(`testing ${MODEL_ID} (opus — expensive)…\n`);
  try {
    const r2 = await anthropic().messages.create({
      model: MODEL_ID,
      max_tokens: 20,
      messages: [{ role: "user", content: "say OK" }],
    });
    const txt = r2.content.find((b) => b.type === "text");
    process.stderr.write(`  opus OK: ${txt && txt.type === "text" ? txt.text : ""}\n`);
  } catch (err) {
    process.stderr.write(`  opus FAILED: ${(err as Error).message}\n`);
  }
}

main();
