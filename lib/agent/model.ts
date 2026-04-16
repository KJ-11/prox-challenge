import Anthropic from "@anthropic-ai/sdk";

export const MODEL_ID = "claude-opus-4-7" as const;

let _client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.",
    );
  }
  _client = new Anthropic({ apiKey });
  return _client;
}
