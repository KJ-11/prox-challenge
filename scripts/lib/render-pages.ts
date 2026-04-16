import { pdfToPng } from "pdf-to-png-converter";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";

const DPI = 150;
const VIEWPORT_SCALE = DPI / 72;

export type DocumentId = "owner_manual" | "quick_start" | "selection_chart";

export const DOCUMENTS: Record<DocumentId, string> = {
  owner_manual: "files/owner-manual.pdf",
  quick_start: "files/quick-start-guide.pdf",
  selection_chart: "files/selection-chart.pdf",
};

export interface RenderedPage {
  document: DocumentId;
  pageNumber: number;
  file: string;
}

function outDir(doc: DocumentId): string {
  return join("knowledge", "pages", doc);
}

function pagePath(doc: DocumentId, pageNumber: number): string {
  return join(outDir(doc), `p${String(pageNumber).padStart(3, "0")}.png`);
}

export async function renderDocument(
  doc: DocumentId,
  opts: { force?: boolean } = {},
): Promise<RenderedPage[]> {
  const pdfPath = DOCUMENTS[doc];
  const dir = outDir(doc);
  mkdirSync(dir, { recursive: true });

  const pages = await pdfToPng(pdfPath, {
    viewportScale: VIEWPORT_SCALE,
    outputFolder: undefined,
  });

  const results: RenderedPage[] = [];
  for (const p of pages) {
    const pageNumber = p.pageNumber;
    const outPath = pagePath(doc, pageNumber);
    if (!opts.force && existsSync(outPath)) {
      results.push({ document: doc, pageNumber, file: outPath });
      continue;
    }
    if (!p.content) {
      throw new Error(`empty render for ${doc} page ${pageNumber}`);
    }
    writeFileSync(outPath, p.content);
    results.push({ document: doc, pageNumber, file: outPath });
  }
  return results;
}

export async function renderAllDocuments(
  opts: { force?: boolean } = {},
): Promise<Record<DocumentId, RenderedPage[]>> {
  const out: Partial<Record<DocumentId, RenderedPage[]>> = {};
  for (const doc of Object.keys(DOCUMENTS) as DocumentId[]) {
    const label = basename(DOCUMENTS[doc]);
    process.stderr.write(`  rendering ${label}…`);
    const pages = await renderDocument(doc, opts);
    process.stderr.write(` ${pages.length} pages\n`);
    out[doc] = pages;
  }
  return out as Record<DocumentId, RenderedPage[]>;
}
