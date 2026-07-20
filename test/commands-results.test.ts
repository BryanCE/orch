import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { formatAge, isQuestionPayload, questionText, cmdResult, cmdTail, cmdSession } from "../src/commands/results.ts";
import { presenceAgentDir } from "../src/presence/store.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";

/** Target resolution loads settings.json (host lookup) and die()s — killing the whole
 *  test process — when it is absent, so every command-invoking test seeds one. */
function seedSettings(root: string): void {
  writeSettingsFixture(root, {
    installed: { adapters: ["pi", "claude"], backends: ["headless"] },
    defaults: { adapter: "pi", backend: "headless" },
  });
}

function captureStdout(run: () => void): string {
  const output: string[] = [];
  // eslint-disable-next-line typescript/unbound-method
  const originalWrite = process.stdout.write;
  process.stdout.write = ((chunk: string | Uint8Array) => { output.push(String(chunk)); return true; });
  try { run(); } finally { process.stdout.write = originalWrite; }
  return output.join("");
}

describe("commands/results", () => {
  test("validates and extracts question payloads", () => {
    expect(isQuestionPayload({ question: "why?" })).toBe(true);
    expect(questionText({ question: "why?" })).toBe("why?");
    expect(isQuestionPayload({ question: 1 })).toBe(false);
    expect(questionText(null)).toBe("");
  });
  test("formats invalid and recent timestamps", () => {
    expect(formatAge("not-a-date")).toBe("?");
    expect(formatAge(new Date().toISOString())).toBe("0s");
  });
  test("routes a seeded result.json through the command module", () => {
    const root = mkdtempSync(join(tmpdir(), "orch-command-result-"));
    const old = process.env.ORCH_DIR;
    const key = "headless~wD~4242";
    process.env.ORCH_DIR = root;
    seedSettings(root);
    const dir = presenceAgentDir(key, root);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "status.json"), JSON.stringify({ schema: 2, key, backend: "headless", workspace: "wD", handle: "4242", pid: process.pid, agent: "pi", state: "done" }));
    writeFileSync(join(dir, "result.json"), JSON.stringify({ text: "finished" }));
    const output: string[] = [];
    // eslint-disable-next-line typescript/unbound-method
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: string | Uint8Array) => { output.push(String(chunk)); return true; });
    try { cmdResult([key]); } finally { process.stdout.write = originalWrite; if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old; removeTempDir(root); }
    expect(output.join("")).toBe("finished\n");
  });
  test("orch tail resolves a non-pi target through that adapter's session view", () => {
    const root = mkdtempSync(join(tmpdir(), "orch-command-tail-"));
    const old = process.env.ORCH_DIR;
    const key = "headless~wT~5150";
    process.env.ORCH_DIR = root;
    seedSettings(root);
    const dir = presenceAgentDir(key, root);
    mkdirSync(dir, { recursive: true });
    // A claude-format transcript: pi's parseSession would not produce this text.
    const transcript = join(dir, "session.jsonl");
    writeFileSync(transcript, [
      JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "earlier turn" }] } }),
      JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "" }, { type: "text", text: "claude final" }] } }),
    ].join("\n") + "\n");
    writeFileSync(join(dir, "status.json"), JSON.stringify({ schema: 2, key, backend: "headless", workspace: "wT", handle: "5150", pid: process.pid, agent: "claude", state: "done", sessionPath: transcript }));
    let joined = "";
    try { joined = captureStdout(() => cmdTail([key])); } finally { if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old; removeTempDir(root); }
    expect(joined).toContain("claude final");
    expect(joined).not.toContain("earlier turn");
  });

  function seedPiSession(): { root: string; key: string; restore: () => void } {
    const root = mkdtempSync(join(tmpdir(), "orch-command-pitail-"));
    const old = process.env.ORCH_DIR;
    const key = "headless~wP~7000";
    process.env.ORCH_DIR = root;
    seedSettings(root);
    const dir = presenceAgentDir(key, root);
    mkdirSync(dir, { recursive: true });
    const session = join(dir, "session.jsonl");
    // pi's OWN session format: SessionEntry JSONL. A claude/codex parser would not produce these rows.
    writeFileSync(session, [
      JSON.stringify({ type: "message", timestamp: "2026-07-20T10:00:00Z", message: { role: "user", content: "first task" } }),
      JSON.stringify({ type: "message", timestamp: "2026-07-20T10:00:01Z", message: { role: "assistant", content: [{ type: "text", text: "working on it" }] } }),
      JSON.stringify({ type: "message", timestamp: "2026-07-20T10:00:02Z", message: { role: "assistant", content: [{ type: "toolCall", name: "bash", arguments: { command: "ls -la" } }] } }),
      JSON.stringify({ type: "message", timestamp: "2026-07-20T10:00:03Z", message: { role: "toolResult", toolName: "bash", content: "file listing", isError: false } }),
      JSON.stringify({ type: "message", timestamp: "2026-07-20T10:00:04Z", message: { role: "assistant", content: [{ type: "text", text: "final answer" }] } }),
    ].join("\n") + "\n");
    writeFileSync(join(dir, "status.json"), JSON.stringify({ schema: 2, key, backend: "headless", workspace: "wP", handle: "7000", pid: process.pid, agent: "pi", state: "done", sessionPath: session }));
    return { root, key, restore: () => { if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old; removeTempDir(root); } };
  }

  test("orch tail renders pi's per-turn entries with role rows and a tool-call summary", () => {
    const { key, restore } = seedPiSession();
    let joined = "";
    try { joined = captureStdout(() => cmdTail([key])); } finally { restore(); }
    expect(joined).toContain("user      │ first task");
    expect(joined).toContain("assistant │ working on it");
    expect(joined).toContain("assistant │ ⚙ bash(ls -la)");
    expect(joined).toContain("tool      │ bash → file listing");
    expect(joined).toContain("assistant │ final answer");
  });

  test("orch tail -n keeps last-N rendered entries for a pi session", () => {
    const { key, restore } = seedPiSession();
    let joined = "";
    try { joined = captureStdout(() => cmdTail([key, "-n", "1"])); } finally { restore(); }
    expect(joined).toContain("final answer");
    expect(joined).not.toContain("first task");
    expect(joined).not.toContain("working on it");
  });

  test("orch session reports the pi entry count", () => {
    const { key, restore } = seedPiSession();
    let joined = "";
    try { joined = captureStdout(() => cmdSession([key])); } finally { restore(); }
    expect(joined).toContain("entries: 5");
  });

  test("orch session shows zero entries for an adapter view without them", () => {
    const root = mkdtempSync(join(tmpdir(), "orch-command-session-"));
    const old = process.env.ORCH_DIR;
    const key = "headless~wS~8000";
    process.env.ORCH_DIR = root;
    seedSettings(root);
    const dir = presenceAgentDir(key, root);
    mkdirSync(dir, { recursive: true });
    const transcript = join(dir, "session.jsonl");
    writeFileSync(transcript, JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "claude only" }] } }) + "\n");
    writeFileSync(join(dir, "status.json"), JSON.stringify({ schema: 2, key, backend: "headless", workspace: "wS", handle: "8000", pid: process.pid, agent: "claude", state: "done", sessionPath: transcript }));
    let joined = "";
    try { joined = captureStdout(() => cmdSession([key])); } finally { if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old; removeTempDir(root); }
    expect(joined).toContain("entries: 0");
  });
});
