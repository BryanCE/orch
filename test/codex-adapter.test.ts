import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, describe, expect, test } from "bun:test";
import {
  CODEX_STATE_FALLBACK_MARKER,
  CODEX_TURN_COMPLETE,
  CodexAdapter,
  codexAdapter,
  codexStateFallback,
} from "../src/adapters/codex.ts";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-adapter-codex-"));

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("CodexAdapter", () => {
  test("uses the codex launch shapes and declares honest capabilities", () => {
    const adapter = new CodexAdapter();

    expect(codexAdapter.id).toBe("codex");
    expect(adapter.caps).toEqual({ steer: "resume", ask: false, setModel: false, sessionTail: true });
    expect(adapter.stateFallback).toBe(true);
    expect(CODEX_STATE_FALLBACK_MARKER).toBe("stateFallback");

    expect(adapter.interactiveCmd({})).toBe("codex");
    expect(adapter.interactiveCmd({ model: "gpt-5" })).toBe("codex --model 'gpt-5'");
    expect(adapter.headlessCmd("fix tests", { model: "gpt-5" })).toEqual([
      "codex",
      "exec",
      "--json",
      "--model",
      "gpt-5",
      "fix tests",
    ]);
  });

  test("detects a completed notify turn and marks ambiguous output as fallback", () => {
    const adapter = new CodexAdapter();
    const notify = JSON.stringify({ type: CODEX_TURN_COMPLETE });

    expect(adapter.detectState({ output: notify, exitCode: 0 })).toBe("done");
    expect(codexStateFallback({ output: notify })).toBe(false);

    const ambiguous = "codex is processing your request";
    expect(adapter.detectState({ output: ambiguous })).toBe("working");
    expect(codexStateFallback({ output: ambiguous })).toBe(true);
    expect(adapter.stateFallback).toBe(true);
  });

  test("extracts layered result text from notify, output file, and assistant output", () => {
    const adapter = new CodexAdapter();
    expect(adapter.extractResult({
      output: JSON.stringify({ type: CODEX_TURN_COMPLETE, "last-assistant-message": "notify result" }),
    })).toBe("notify result");

    const outputPath = path.join(tempDir, "last-message.txt");
    fs.writeFileSync(outputPath, "output file result");
    expect(adapter.extractResult({ output: "not json", outputLastMessagePath: outputPath })).toBe("output file result");

    expect(adapter.extractResult({
      output: JSON.stringify({ item: { type: "agent_message", text: "assistant result" } }),
    })).toBe("assistant result");
  });
});
