// Claude's transcript usage vocabulary: the token counts of every model call in a session.
// Claude writes one JSONL line per content block, each repeating its message's usage, so a
// message counts once, by id, with its last line's figures. Claude records no cost here.
import { isRecord } from "orch/core/util.ts";
import { visitJsonlValues } from "orch/core/shared/transcript.ts";

export interface TranscriptUsage {
  tokens: { input: number; output: number; cacheRead: number; cacheWrite: number };
  /** Model calls the session made: one per assistant message. */
  turns: number;
}

type Tokens = TranscriptUsage["tokens"];

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function messageUsage(value: unknown): { id: string; tokens: Tokens } | undefined {
  if (!isRecord(value) || value.type !== "assistant" || !isRecord(value.message)) return undefined;
  const { id, usage } = value.message;
  if (typeof id !== "string" || !isRecord(usage)) return undefined;
  return {
    id,
    tokens: {
      input: count(usage.input_tokens),
      output: count(usage.output_tokens),
      cacheRead: count(usage.cache_read_input_tokens),
      cacheWrite: count(usage.cache_creation_input_tokens),
    },
  };
}

/** Session totals from a Claude transcript, or undefined when no line carries usage. */
export function transcriptUsage(raw: string | undefined): TranscriptUsage | undefined {
  if (!raw?.trim()) return undefined;
  const messages = new Map<string, Tokens>();
  visitJsonlValues(raw, (value) => {
    const usage = messageUsage(value);
    if (usage !== undefined) messages.set(usage.id, usage.tokens);
  });
  if (messages.size === 0) return undefined;
  const tokens: Tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  for (const message of messages.values()) {
    tokens.input += message.input;
    tokens.output += message.output;
    tokens.cacheRead += message.cacheRead;
    tokens.cacheWrite += message.cacheWrite;
  }
  return { tokens, turns: messages.size };
}
