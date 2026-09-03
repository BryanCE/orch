import { describe, expect, test } from "bun:test";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { formatAge, isQuestionPayload, questionText, cmdQuestions, cmdResult, cmdTail, cmdSession } from "../src/commands/results.ts";
import { presenceAgentDir, writeResult } from "../src/presence/writer.ts";
import { seedStatus } from "./helpers/presence.ts";
import { ensureHarness, insertAgent } from "../src/store/agent-rows.ts";
import { orm } from "../src/store/connection.ts";
import { setSpace } from "../src/store/interval-rows.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { sql } from "drizzle-orm";

/** Target resolution loads settings.json (host lookup) and die()s — killing the whole
 *  test process — when it is absent, so every command-invoking test seeds one. */
function seedSettings(root: string): void {
  writeSettingsFixture(root, {
    enabled: { adapters: ["pi", "claude"], backends: ["headless"] },
    defaults: { adapter: "pi", backend: "headless" },
  });
}

/** A1: an agent key IS its minted id - no plexer, no space, no handle inside it.
 *  Environment is seeded onto that id as its own satellite. */
function testTarget(id: string): { key: string; space: string } {
  return { key: id, space: "test" };
}

function seedAgent(root: string, key: string, space: string, harnessId = "pi"): void {
  ensureHarness(root, harnessId, harnessId, 1);
  insertAgent(root, { id: key, name: key, spawnedBy: null, harnessId, cwd: root, createdAt: 1 });
  orm(root).run(sql`INSERT OR IGNORE INTO spaces (id, name, created_at) VALUES (${space}, ${space}, ${1})`);
  setSpace(root, key, 1, space);
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
  test.serial("renders missing space and host as absent instead of inventing local", () => {
    const root = mkdtempSync(join(tmpdir(), "orch-command-questions-"));
    const old = process.env.ORCH_DIR;
    const key = "questionag";
    process.env.ORCH_DIR = root;
    seedSettings(root);
    const dir = seedStatus(root, key, { agent: "pi", pid: process.pid, state: "blocked", label: "question-agent" });
    writeFileSync(join(dir, "question.json"), JSON.stringify({ question: "need input", ts: new Date().toISOString() }));
    try {
      const output = captureStdout(() => { void cmdQuestions(["--local", "--all", "--json"]); });
      const parsed: unknown = JSON.parse(output);
      expect(parsed).toEqual([expect.objectContaining({ key, space: "-" })]);
      expect(output).not.toContain("local");
      expect(output).not.toContain("workspace");
      expect(parsed).not.toHaveProperty("host");
      expect(parsed).not.toHaveProperty("workspace");
    } finally {
      if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old;
      removeTempDir(root);
    }
  });

  test.serial("validates and extracts question payloads", () => {
    expect(isQuestionPayload({ question: "why?" })).toBe(true);
    expect(questionText({ question: "why?" })).toBe("why?");
    expect(isQuestionPayload({ question: 1 })).toBe(false);
    expect(questionText(null)).toBe("");
  });
  test.serial("formats invalid and recent timestamps", () => {
    expect(formatAge("not-a-date")).toBe("?");
    expect(formatAge(new Date().toISOString())).toBe("0s");
  });
  test.serial("routes a seeded results.jsonl through the command module", () => {
    const root = mkdtempSync(join(tmpdir(), "orch-command-result-"));
    const old = process.env.ORCH_DIR;
    const { key, space } = testTarget("resultaa42");
    process.env.ORCH_DIR = root;
    seedSettings(root);
    const dir = presenceAgentDir(key, root);
    mkdirSync(dir, { recursive: true });
    seedAgent(root, key, space);
    writeFileSync(join(dir, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: process.pid, agent: "pi", state: "done" }));
    writeFileSync(join(dir, "results.jsonl"), `${JSON.stringify({ text: "finished" })}\n`);
    const output: string[] = [];
    // eslint-disable-next-line typescript/unbound-method
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: string | Uint8Array) => { output.push(String(chunk)); return true; });
    try { cmdResult([key]); } finally { process.stdout.write = originalWrite; if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old; removeTempDir(root); }
    expect(output.join("")).toBe("finished\n");
  });
  test.serial("keeps every settled dispatch and reports the newest", () => {
    const root = mkdtempSync(join(tmpdir(), "orch-command-result-history-"));
    const old = process.env.ORCH_DIR;
    const { key, space } = testTarget("resultaa45");
    process.env.ORCH_DIR = root;
    seedSettings(root);
    const dir = presenceAgentDir(key, root);
    mkdirSync(dir, { recursive: true });
    seedAgent(root, key, space);
    writeFileSync(join(dir, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: process.pid, agent: "pi", state: "done" }));
    writeResult(dir, { text: "first dispatch" });
    writeResult(dir, { text: "second dispatch" });
    try {
      expect(readFileSync(join(dir, "results.jsonl"), "utf8").trimEnd().split("\n")).toHaveLength(2);
      expect(captureStdout(() => cmdResult([key]))).toBe("second dispatch\n");
    } finally {
      if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old;
      removeTempDir(root);
    }
  });
  test.serial("falls back to adapter session text when results.jsonl is absent", () => {
    const root = mkdtempSync(join(tmpdir(), "orch-command-result-fallback-"));
    const old = process.env.ORCH_DIR;
    const { key, space } = testTarget("resultaa43");
    process.env.ORCH_DIR = root;
    seedSettings(root);
    const dir = presenceAgentDir(key, root);
    mkdirSync(dir, { recursive: true });
    const session = join(dir, "session.jsonl");
    writeFileSync(session, JSON.stringify({ type: "message", message: { role: "assistant", content: "session final" } }) + "\n");
    seedAgent(root, key, space, "pi");
    writeFileSync(join(dir, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: process.pid, state: "done", sessionPath: session }));
    try {
      expect(captureStdout(() => cmdResult([key]))).toContain("(no results.jsonl - falling back to adapter-extracted session text)\nsession final\n");
    } finally {
      if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old;
      removeTempDir(root);
    }
  });
  test.serial("uses results.jsonl even when the presence status has no agent", () => {
    const root = mkdtempSync(join(tmpdir(), "orch-command-result-no-agent-"));
    const old = process.env.ORCH_DIR;
    const { key, space } = testTarget("resultaa44");
    process.env.ORCH_DIR = root;
    seedSettings(root);
    const dir = presenceAgentDir(key, root);
    mkdirSync(dir, { recursive: true });
    seedAgent(root, key, space);
    writeFileSync(join(dir, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: process.pid, state: "done" }));
    writeFileSync(join(dir, "results.jsonl"), `${JSON.stringify({ text: "finished without agent" })}\n`);
    try {
      expect(captureStdout(() => cmdResult([key]))).toBe("finished without agent\n");
    } finally {
      if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old;
      removeTempDir(root);
    }
  });

  test.serial("orch tail resolves a non-pi target through that adapter's session view", () => {
    const root = mkdtempSync(join(tmpdir(), "orch-command-tail-"));
    const old = process.env.ORCH_DIR;
    const { key, space } = testTarget("tailaaa515");
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
    seedAgent(root, key, space, "claude");
    writeFileSync(join(dir, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: process.pid, agent: "claude", state: "done", sessionPath: transcript }));
    let joined = "";
    try { joined = captureStdout(() => cmdTail([key])); } finally { if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old; removeTempDir(root); }
    expect(joined).toContain("claude final");
    expect(joined).not.toContain("earlier turn");
  });

  function seedPiSession(): { root: string; key: string; restore: () => void } {
    const root = mkdtempSync(join(tmpdir(), "orch-command-pitail-"));
    const old = process.env.ORCH_DIR;
    const { key, space } = testTarget("pitailaa70");
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
    seedAgent(root, key, space);
    writeFileSync(join(dir, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: process.pid, agent: "pi", state: "done", sessionPath: session }));
    return { root, key, restore: () => { if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old; removeTempDir(root); } };
  }

  test.serial("orch tail renders pi's per-turn entries with role rows and a tool-call summary", () => {
    const { key, restore } = seedPiSession();
    let joined = "";
    try { joined = captureStdout(() => cmdTail([key])); } finally { restore(); }
    expect(joined).toContain("user      | first task");
    expect(joined).toContain("assistant | working on it");
    expect(joined).toContain("assistant | [tools] bash(ls -la)");
    expect(joined).toContain("tool      | bash -> file listing");
    expect(joined).toContain("assistant | final answer");
  });

  test.serial("orch tail -n keeps last-N rendered entries for a pi session", () => {
    const { key, restore } = seedPiSession();
    let joined = "";
    try { joined = captureStdout(() => cmdTail([key, "-n", "1"])); } finally { restore(); }
    expect(joined).toContain("final answer");
    expect(joined).not.toContain("first task");
    expect(joined).not.toContain("working on it");
  });

  test.serial("orch session reports the pi entry count", () => {
    const { key, restore } = seedPiSession();
    let joined = "";
    try { joined = captureStdout(() => cmdSession([key])); } finally { restore(); }
    expect(joined).toContain("entries: 5");
  });

  test.serial("orch session shows zero entries for an adapter view without them", () => {
    const root = mkdtempSync(join(tmpdir(), "orch-command-session-"));
    const old = process.env.ORCH_DIR;
    const { key, space } = testTarget("sessionn80");
    process.env.ORCH_DIR = root;
    seedSettings(root);
    const dir = presenceAgentDir(key, root);
    mkdirSync(dir, { recursive: true });
    const transcript = join(dir, "session.jsonl");
    writeFileSync(transcript, JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "claude only" }] } }) + "\n");
    seedAgent(root, key, space, "claude");
    writeFileSync(join(dir, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: process.pid, agent: "claude", state: "done", sessionPath: transcript }));
    let joined = "";
    try { joined = captureStdout(() => cmdSession([key])); } finally { if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old; removeTempDir(root); }
    expect(joined).toContain("entries: 0");
  });
});
