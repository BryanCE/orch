import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseSession } from "../src/session.ts";

describe("parseSession", () => {
  test("returns an empty view for null and missing paths", () => {
    const empty = parseSession(null);
    expect(empty.exists).toBe(false);
    expect(empty.path).toBe("");
    expect(empty.entries).toEqual([]);
    const missing = parseSession("/missing/session.jsonl");
    expect(missing.exists).toBe(false);
    expect(missing.path).toBe("/missing/session.jsonl");
    expect(missing.entries).toEqual([]);
  });

  test("handles model, thinking, user, assistant, tool, and unknown entries", () => {
    const root = mkdtempSync(join(tmpdir(), "orch-session-"));
    const file = join(root, "session.jsonl");
    const lines = [
      { type: "model_change", modelId: "gpt-5", provider: "openai" },
      { type: "thinking_level_change", thinkingLevel: "high" },
      { type: "message", message: { role: "user", content: [{ type: "text", text: "build this" }] } },
      { type: "message", message: { role: "assistant", model: "assistant-model", provider: "assistant-provider", content: [{ type: "text", text: "done" }], usage: { input: 2, output: 3, cacheRead: 4, cacheWrite: 5, cost: { total: 0.25 } } } },
      { type: "message", message: { role: "toolResult", toolName: "bash", content: "output", isError: true } },
      { type: "other", message: { role: "system", content: "ignored" } },
      { type: "message", message: { role: "assistant", content: [{ type: "toolCall", name: "bash", arguments: { command: "pwd" } }] } },
      { type: "message", message: { role: "assistant", content: "final" , usage: { cost: 0.5 } } },
      { malformed: true },
    ];
    writeFileSync(file, lines.map((line) => JSON.stringify(line)).join("\n") + "\nnot-json\n\n");
    try {
      const parsed = parseSession(file);
      expect(parsed.exists).toBe(true);
      expect(parsed.model).toBe("gpt-5");
      expect(parsed.provider).toBe("assistant-provider");
      expect(parsed.thinking).toBe("high");
      expect(parsed.task).toBe("build this");
      expect(parsed.lastAssistant).toBe("final");
      expect(parsed.turns).toBe(3);
      expect(parsed.cost).toBeCloseTo(0.75);
      expect(parsed.tokens).toEqual({ input: 2, output: 3, cacheRead: 4, cacheWrite: 5 });
      expect(parsed.entries).toHaveLength(8);
    } finally {
      removeTempDir(root);
    }
  });

  test("joins text blocks and ignores non-text blocks", () => {
    const root = mkdtempSync(join(tmpdir(), "orch-session-blocks-"));
    const file = join(root, "session.jsonl");
    writeFileSync(file, JSON.stringify({ type: "message", message: { role: "assistant", content: [{ type: "text", text: "one" }, { type: "toolCall", name: "ls" }, { type: "text", text: "two" }] } }) + "\n");
    try {
      expect(parseSession(file).lastAssistant).toBe("one\ntwo");
    } finally {
      removeTempDir(root);
    }
  });
});
