import { readFileSync } from "node:fs";
import { z } from "zod";
import { anthropic, MODEL_ID } from "../../lib/agent/model.js";

interface ExtractOptions<T> {
  pdfPath: string;
  prompt: string;
  toolName: string;
  toolDescription: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
}

const MAX_ATTEMPTS = 4;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: string; status?: number; message?: string; code?: string };
  if (e.status && e.status >= 500 && e.status < 600) return true;
  if (e.status === 408 || e.status === 429) return true;
  const msg = (e.message ?? "").toLowerCase();
  if (msg.includes("connection") || msg.includes("timeout") || msg.includes("socket"))
    return true;
  if (e.code === "ECONNRESET" || e.code === "ETIMEDOUT" || e.code === "ECONNREFUSED")
    return true;
  return false;
}

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === MAX_ATTEMPTS || !isRetryable(err)) throw err;
      const delay = 1500 * 2 ** (attempt - 1);
      process.stderr.write(
        `      ${label}: attempt ${attempt} failed (${(err as Error).message}); retrying in ${delay}ms\n`,
      );
      await sleep(delay);
    }
  }
  throw lastError;
}

export async function extractFromPdf<T>(opts: ExtractOptions<T>): Promise<T> {
  const pdfB64 = readFileSync(opts.pdfPath).toString("base64");
  const inputSchema = z.toJSONSchema(opts.schema, {
    target: "draft-7",
  }) as Record<string, unknown>;

  const toolInputSchema =
    (inputSchema as { type?: string }).type === "array"
      ? {
          type: "object" as const,
          properties: { items: inputSchema },
          required: ["items"],
          additionalProperties: false,
        }
      : inputSchema;

  const result = await withRetry(opts.toolName, () =>
    anthropic().messages.create({
      model: MODEL_ID,
      max_tokens: opts.maxTokens ?? 8000,
      tool_choice: { type: "tool", name: opts.toolName },
      tools: [
        {
          name: opts.toolName,
          description: opts.toolDescription,
          // biome-ignore lint/suspicious/noExplicitAny: Anthropic SDK takes a loose input_schema type
          input_schema: toolInputSchema as any,
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfB64,
              },
            },
            { type: "text", text: opts.prompt },
          ],
        },
      ],
    }),
  );

  const toolUseBlock = result.content.find((b) => b.type === "tool_use");
  if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
    throw new Error(
      `No tool_use in response for ${opts.toolName}. stop_reason=${result.stop_reason}`,
    );
  }

  const raw = toolUseBlock.input as unknown;
  const unwrapped =
    (inputSchema as { type?: string }).type === "array"
      ? (raw as { items: unknown }).items
      : raw;

  const parsed = opts.schema.safeParse(unwrapped);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 8)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Schema validation failed for ${opts.toolName}:\n${issues}\n\nRaw input (truncated):\n${JSON.stringify(unwrapped).slice(0, 1500)}`,
    );
  }
  return parsed.data;
}
