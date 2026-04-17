import { readFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";

export const runtime = "nodejs";

const KNOWLEDGE_ROOT = resolve(process.cwd(), "knowledge");

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".json": "application/json",
};

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await ctx.params;
  const joined = path.join("/");

  // Prevent path traversal: resolve against the knowledge root and reject
  // anything that escapes it.
  const candidate = resolve(KNOWLEDGE_ROOT, joined);
  if (!candidate.startsWith(KNOWLEDGE_ROOT + "/") && candidate !== KNOWLEDGE_ROOT) {
    return new Response("forbidden", { status: 403 });
  }
  if (!existsSync(candidate)) {
    return new Response("not found", { status: 404 });
  }

  const ext = extname(candidate).toLowerCase();
  const contentType = MIME[ext] ?? "application/octet-stream";
  const body = readFileSync(candidate);
  return new Response(body as unknown as BodyInit, {
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=604800, immutable",
    },
  });
}
