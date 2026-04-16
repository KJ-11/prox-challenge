import { existsSync, readFileSync } from "node:fs";
import { renderAllDocuments } from "./lib/render-pages.js";
import { extractAllStructured } from "./lib/extract-structured.js";
import { extractCorpusAndFigures } from "./lib/extract-corpus.js";

function loadDotEnv() {
  const envPath = ".env";
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
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

interface CliArgs {
  force: boolean;
  only: string[] | null;
  stages: Set<"render" | "structured" | "corpus">;
}

function parseArgs(argv: string[]): CliArgs {
  const force = argv.includes("--force");
  const onlyArg = argv.find((a) => a.startsWith("--only="));
  const only = onlyArg ? onlyArg.slice("--only=".length).split(",") : null;
  const stagesArg = argv.find((a) => a.startsWith("--stages="));
  const stages = new Set(
    stagesArg
      ? (stagesArg.slice("--stages=".length).split(",") as Array<
          "render" | "structured" | "corpus"
        >)
      : (["render", "structured", "corpus"] as const),
  );
  return { force, only, stages };
}

async function main() {
  loadDotEnv();
  const args = parseArgs(process.argv.slice(2));

  process.stderr.write(
    `extract_knowledge  force=${args.force} stages=[${Array.from(args.stages).join(",")}]${args.only ? ` only=${args.only.join(",")}` : ""}\n\n`,
  );

  if (args.stages.has("render")) {
    process.stderr.write("1) rendering PDFs to page PNGs\n");
    await renderAllDocuments({ force: args.force });
    process.stderr.write("\n");
  }

  if (args.stages.has("structured")) {
    process.stderr.write("2) extracting structured tables\n");
    await extractAllStructured(args.force, {
      only: args.only ?? undefined,
    });
    process.stderr.write("\n");
  }

  if (args.stages.has("corpus")) {
    process.stderr.write("3) extracting prose corpus + figure catalog\n");
    await extractCorpusAndFigures(args.force);
    process.stderr.write("\n");
  }

  process.stderr.write("done.\n");
}

main().catch((err) => {
  process.stderr.write(`\nfatal: ${(err as Error).stack ?? err}\n`);
  process.exit(1);
});
