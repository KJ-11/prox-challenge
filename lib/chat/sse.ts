import type { ServerEvent } from "@/lib/agent/events";

/**
 * Async iterator that yields ServerEvents from an SSE response body.
 * Handles partial chunks by buffering until `\n\n` boundary.
 */
export async function* readSseEvents(
  response: Response,
): AsyncGenerator<ServerEvent> {
  if (!response.body) {
    throw new Error("response has no body");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const event = parseFrame(frame);
        if (event) yield event;
      }
    }

    // Handle any final trailing frame without double newline.
    if (buffer.trim().length > 0) {
      const event = parseFrame(buffer);
      if (event) yield event;
    }
  } finally {
    reader.releaseLock();
  }
}

function parseFrame(frame: string): ServerEvent | null {
  const lines = frame.split("\n");
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trim());
    }
  }
  if (dataLines.length === 0) return null;
  const payload = dataLines.join("\n");
  try {
    return JSON.parse(payload) as ServerEvent;
  } catch {
    return null;
  }
}
