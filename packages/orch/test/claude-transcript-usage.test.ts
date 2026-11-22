import { describe, expect, test } from "bun:test";
import { transcriptUsage } from "../extensions/claude/transcript-usage.ts";

function assistantLine(id: string, usage: Record<string, number>): string {
  return JSON.stringify({ type: "assistant", message: { id, role: "assistant", model: "claude-opus-5-5", content: [{ type: "text", text: "x" }], usage } });
}

describe("Claude transcript usage", () => {
  test("sums each assistant message once, from its last line", () => {
    const raw = [
      JSON.stringify({ type: "user", message: { role: "user", content: "go" } }),
      assistantLine("msg-1", { input_tokens: 3, output_tokens: 1, cache_read_input_tokens: 100, cache_creation_input_tokens: 50 }),
      assistantLine("msg-1", { input_tokens: 3, output_tokens: 40, cache_read_input_tokens: 100, cache_creation_input_tokens: 50 }),
      "not json",
      assistantLine("msg-2", { input_tokens: 2, output_tokens: 10, cache_read_input_tokens: 150, cache_creation_input_tokens: 0 }),
    ].join("\n");
    expect(transcriptUsage(raw)).toEqual({ tokens: { input: 5, output: 50, cacheRead: 250, cacheWrite: 50 }, turns: 2 });
  });

  test("a missing count reads as zero", () => {
    expect(transcriptUsage(assistantLine("msg-1", { output_tokens: 4 }))).toEqual({ tokens: { input: 0, output: 4, cacheRead: 0, cacheWrite: 0 }, turns: 1 });
  });

  test("a transcript with no usage gives none", () => {
    expect(transcriptUsage(undefined)).toBeUndefined();
    expect(transcriptUsage("")).toBeUndefined();
    expect(transcriptUsage(JSON.stringify({ type: "user", message: { role: "user", content: "go" } }))).toBeUndefined();
  });
});
