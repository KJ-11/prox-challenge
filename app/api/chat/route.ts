import { z } from "zod";
import { runAgent } from "@/lib/agent/loop";
import { encodeSse, type ServerEvent } from "@/lib/agent/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------- request validation ---------- */

const TextBlock = z.object({
  type: z.literal("text"),
  text: z.string(),
});

const ImageBlock = z.object({
  type: z.literal("image"),
  source: z.union([
    z.object({
      type: z.literal("base64"),
      media_type: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif"]),
      data: z.string(),
    }),
    z.object({ type: z.literal("url"), url: z.string().url() }),
  ]),
});

const ContentBlock = z.union([TextBlock, ImageBlock]);

const Message = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.union([z.string(), z.array(ContentBlock).min(1)]),
});

const RequestBody = z.object({
  messages: z.array(Message).min(1),
});

/* ---------- handler ---------- */

export async function POST(request: Request): Promise<Response> {
  let parsed;
  try {
    parsed = RequestBody.parse(await request.json());
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "invalid request body",
        detail: err instanceof Error ? err.message : String(err),
      }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of runAgent({
          messages: parsed.messages as Parameters<typeof runAgent>[0]["messages"],
          signal: request.signal,
        })) {
          controller.enqueue(encodeSse(event as ServerEvent));
        }
      } catch (err) {
        controller.enqueue(
          encodeSse({
            type: "error",
            message: err instanceof Error ? err.message : String(err),
          }),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
