import type { OrchDir } from "../src/types/core.ts";
import { orchDirAt } from "../src/services.ts";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { join } from "node:path";
import { formatAge, cmdQuestions, cmdResult, cmdTail, cmdSession } from "../src/commands/results.ts";
import { presenceAgentDir, writeResult } from "../src/presence/writer.ts";
import { seedLiveProcess } from "./helpers/agent.ts";
import { startRpcServer } from "../src/daemon/rpc/server.ts";
import { DaemonAbsentError } from "../src/daemon/rpc/wire.ts";
import { stubRpcHandlers } from "./helpers/rpc-handlers.ts";
import type { PendingQuestionView } from "../src/types/daemon.ts";
import { ensureHarness, insertAgent } from "../src/store/agent-rows.ts";
import { orm } from "../src/store/connection.ts";
import { setSpace } from "../src/store/interval-rows.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { testServices } from "./helpers/services.ts";
import { isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";
import { HARNESS_SESSION_ENV } from "../src/adapters/session-env.ts";
import { isRecord } from "../src/util.ts";
import { sql } from "drizzle-orm";

/** Target resolution loads settings.json (host lookup) and die()s — killing the whole
 *  test process — when it is absent, so every command-invoking test seeds one. */
const SETTINGS_FIXTURE = {
  enabled: { adapters: ["pi", "claude"], backends: ["headless"] },
  defaults: { adapter: "pi", backend: "headless" },
};

const HARNESS_ENV_VARS = [...new Set(Object.values(HARNESS_SESSION_ENV).flatMap((vars) => Object.values(vars)))];
let savedHarnessEnv: [string, string | undefined][] = [];

beforeEach(() => {
  isolateOrchEnv();
  savedHarnessEnv = HARNESS_ENV_VARS.map((name): [string, string | undefined] => [name, process.env[name]]);
  for (const name of HARNESS_ENV_VARS) delete process.env[name];
});

afterEach(() => {
  for (const [name, value] of savedHarnessEnv) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  savedHarnessEnv = [];
  restoreOrchEnv();
});

function seedSettings(root: OrchDir): void {
  writeSettingsFixture(root, SETTINGS_FIXTURE);
}

/** A1: an agent key IS its minted id - no plexer, no space, no handle inside it.
 *  Environment is seeded onto that id as its own satellite. */
function testTarget(id: string): { key: string; space: string } {
  return { key: id, space: "test" };
}

/** A registered agent in no space, alive through this runner's process. */
function seedLiveAgent(root: OrchDir, key: string, harnessId = "pi"): void {
  ensureHarness(root, harnessId, harnessId, 1);
  insertAgent(root, { id: key, name: key, spawnedBy: null, harnessId, cwd: root, createdAt: 1 });
  seedLiveProcess(root, key);
}

function seedAgent(root: OrchDir, key: string, space: string, harnessId = "pi"): void {
  seedLiveAgent(root, key, harnessId);
  orm(root).run(sql`INSERT OR IGNORE INTO spaces (id, name, created_at) VALUES (${space}, ${space}, ${1})`);
  setSpace(root, key, 1, space);
}

interface JsonResultEntry { target: string; source: string; result: unknown }

function isJsonResultEntry(value: unknown): value is JsonResultEntry {
  return isRecord(value) && typeof value.target === "string" && typeof value.source === "string" && "result" in value;
}

function isJsonResultArray(value: unknown): value is JsonResultEntry[] {
  return Array.isArray(value) && value.every(isJsonResultEntry);
}

function captureStdout(run: () => void): string {
  const output: string[] = [];
  // eslint-disable-next-line typescript/unbound-method
  const originalWrite = process.stdout.write;
  process.stdout.write = ((chunk: string | Uint8Array) => { output.push(String(chunk)); return true; });
  try { run(); } finally { process.stdout.write = originalWrite; }
  return output.join("");
}

async function captureStdoutAsync(run: () => Promise<void>): Promise<string> {
  const output: string[] = [];
  // eslint-disable-next-line typescript/unbound-method
  const originalWrite = process.stdout.write;
  process.stdout.write = ((chunk: string | Uint8Array) => { output.push(String(chunk)); return true; });
  try { await run(); } finally { process.stdout.write = originalWrite; }
  return output.join("");
}

async function withQuestionsServer(root: OrchDir, questions: PendingQuestionView[], run: () => Promise<void>): Promise<void> {
  const server = await startRpcServer(root, stubRpcHandlers({ questions: () => ({ questions }) }));
  try { await run(); } finally { await server.close(); }
}

describe("commands/results", () => {
  test.serial("renders daemon questions with the existing JSON shape", async () => {
    const root = tempOrchDir("orch-command-questions-");
    const old: OrchDir | undefined = process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR);
    const key = "questionag";
    process.env.ORCH_DIR = root;
    seedSettings(root);
    seedLiveAgent(root, key);
    const askedAt = Date.parse("2026-09-11T00:00:00.000Z");
    try {
      const output = await captureStdoutAsync(() => withQuestionsServer(root, [{ questionId: "q1", agentId: key, key, name: "question-agent", question: "need input", askedAt }], async () => {
        await cmdQuestions(testServices({ orchDir: root, settings: SETTINGS_FIXTURE }), ["--local", "--all", "--json"]);
      }));
      const parsed: unknown = JSON.parse(output);
      expect(parsed).toEqual([expect.objectContaining({ key, name: "question-agent", space: "-", id: "q1", question: "need input", ts: "2026-09-11T00:00:00.000Z" })]);
      expect(parsed).not.toHaveProperty("host");
      expect(parsed).not.toHaveProperty("workspace");
    } finally {
      if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old;
      removeTempDir(root);
    }
  });

  test.serial("renders exactly the pending questions returned by the daemon", async () => {
    const root = tempOrchDir("orch-command-questions-filter-");
    const old: OrchDir | undefined = process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR);
    process.env.ORCH_DIR = root;
    seedSettings(root);
    try {
      const output = await captureStdoutAsync(async () => {
        await withQuestionsServer(root, [
          { questionId: "live-id", agentId: "liveques01", key: "liveques01", name: null, question: "live", askedAt: Date.parse("2026-09-11T00:00:00.000Z") },
        ], async () => { await cmdQuestions(testServices({ orchDir: root, settings: SETTINGS_FIXTURE }), ["--local", "--all", "--json"]); });
      });
      const parsed: unknown = JSON.parse(output);
      expect(parsed).toEqual([expect.objectContaining({ key: "liveques01", id: "live-id", question: "live" })]);
    } finally {
      if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old;
      removeTempDir(root);
    }
  });

  test.serial("surfaces a missing daemon instead of returning an empty list", async () => {
    const root = tempOrchDir("orch-command-questions-down-");
    const old: OrchDir | undefined = process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR);
    process.env.ORCH_DIR = root;
    seedSettings(root);
    try {
      const error = await cmdQuestions(testServices({ orchDir: root, settings: SETTINGS_FIXTURE }), ["--local", "--json"]).then(() => undefined, (failure: unknown) => failure);
      expect(error).toBeInstanceOf(DaemonAbsentError);
    } finally {
      if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old;
      removeTempDir(root);
    }
  });
  test.serial("formats invalid and recent timestamps", () => {
    expect(formatAge("not-a-date")).toBe("?");
    expect(formatAge(new Date().toISOString())).toBe("0s");
  });
  test.serial("routes a seeded results.jsonl through the command module", () => {
    const root = tempOrchDir("orch-command-result-");
    const old: OrchDir | undefined = process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR);
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
    try { cmdResult(testServices({ orchDir: root, settings: SETTINGS_FIXTURE }), [key]); } finally { process.stdout.write = originalWrite; if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old; removeTempDir(root); }
    expect(output.join("")).toBe("finished\n");
  });
  test.serial("keeps every settled dispatch and reports the newest", () => {
    const root = tempOrchDir("orch-command-result-history-");
    const old: OrchDir | undefined = process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR);
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
      expect(captureStdout(() => cmdResult(testServices({ orchDir: root, settings: SETTINGS_FIXTURE }), [key]))).toBe("second dispatch\n");
    } finally {
      if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old;
      removeTempDir(root);
    }
  });
  test.serial("falls back to adapter session text when results.jsonl is absent", () => {
    const root = tempOrchDir("orch-command-result-fallback-");
    const old: OrchDir | undefined = process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR);
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
      expect(captureStdout(() => cmdResult(testServices({ orchDir: root, settings: SETTINGS_FIXTURE }), [key]))).toContain("(no results.jsonl - falling back to adapter-extracted session text)\nsession final\n");
    } finally {
      if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old;
      removeTempDir(root);
    }
  });
  test.serial("uses results.jsonl even when the presence status has no agent", () => {
    const root = tempOrchDir("orch-command-result-no-agent-");
    const old: OrchDir | undefined = process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR);
    const { key, space } = testTarget("resultaa44");
    process.env.ORCH_DIR = root;
    seedSettings(root);
    const dir = presenceAgentDir(key, root);
    mkdirSync(dir, { recursive: true });
    seedAgent(root, key, space);
    writeFileSync(join(dir, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: process.pid, state: "done" }));
    writeFileSync(join(dir, "results.jsonl"), `${JSON.stringify({ text: "finished without agent" })}\n`);
    try {
      expect(captureStdout(() => cmdResult(testServices({ orchDir: root, settings: SETTINGS_FIXTURE }), [key]))).toBe("finished without agent\n");
    } finally {
      if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old;
      removeTempDir(root);
    }
  });

  test.serial("renders several target results under headers", () => {
    const root = tempOrchDir("orch-command-result-many-");
    const old: OrchDir | undefined = process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR);
    process.env.ORCH_DIR = root;
    seedSettings(root);
    const targets = ["resultmny1", "resultmny2"];
    try {
      for (const [index, key] of targets.entries()) {
        const dir = presenceAgentDir(key, root);
        mkdirSync(dir, { recursive: true });
        seedAgent(root, key, "test");
        writeFileSync(join(dir, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: process.pid, agent: "pi", state: "done" }));
        writeFileSync(join(dir, "results.jsonl"), JSON.stringify({ text: `result-${index}` }) + "\n");
      }
      const output = captureStdout(() => cmdResult(testServices({ orchDir: root, settings: SETTINGS_FIXTURE }), targets));
      expect(output).toBe("== resultmny1\nresult-0\n== resultmny2\nresult-1\n");
    } finally {
      if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old;
      removeTempDir(root);
    }
  });

  test.serial("renders several target results as a JSON array", () => {
    const root = tempOrchDir("orch-command-result-many-json-");
    const old: OrchDir | undefined = process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR);
    process.env.ORCH_DIR = root;
    seedSettings(root);
    const first = "resultjsn1";
    const second = "resultjsn2";
    const targets = [first, second];
    try {
      for (const [index, key] of targets.entries()) {
        const dir = presenceAgentDir(key, root);
        mkdirSync(dir, { recursive: true });
        seedAgent(root, key, "test");
        writeFileSync(join(dir, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: process.pid, agent: "pi", state: "done" }));
        writeFileSync(join(dir, "results.jsonl"), JSON.stringify({ text: `json-${index}` }) + "\n");
      }
      const parsed: unknown = JSON.parse(captureStdout(() => cmdResult(testServices({ orchDir: root, settings: SETTINGS_FIXTURE }), [...targets, "--json"])));
      if (!isJsonResultArray(parsed)) throw new Error("result output was not an array of result entries");
      expect(parsed).toHaveLength(2);
      expect(parsed.map((entry) => ({ target: entry.target, source: entry.source, result: entry.result }))).toEqual([
        { target: first, source: "presence", result: { text: "json-0" } },
        { target: second, source: "presence", result: { text: "json-1" } },
      ]);
    } finally {
      if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old;
      removeTempDir(root);
    }
  });

  test.serial("continues after a missing target and sets exit code", () => {
    const root = tempOrchDir("orch-command-result-missing-");
    const old: OrchDir | undefined = process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR);
    process.env.ORCH_DIR = root;
    seedSettings(root);
    const known = "resultkn01";
    const missing = "resultms01";
    const dir = presenceAgentDir(known, root);
    mkdirSync(dir, { recursive: true });
    seedAgent(root, known, "test");
    writeFileSync(join(dir, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key: known, pid: process.pid, agent: "pi", state: "done" }));
    writeFileSync(join(dir, "results.jsonl"), JSON.stringify({ text: "known-result" }) + "\n");
    process.exitCode = 0;
    try {
      const output = captureStdout(() => cmdResult(testServices({ orchDir: root, settings: SETTINGS_FIXTURE }), [known, missing]));
      expect(output).toContain("== resultkn01\nknown-result\n");
      expect(output).toContain(`== ${missing}\nerror:`);
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = 0;
      if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old;
      removeTempDir(root);
    }
  });

  test.serial("orch tail resolves a non-pi target through that adapter's session view", () => {
    const root = tempOrchDir("orch-command-tail-");
    const old: OrchDir | undefined = process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR);
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
    try { joined = captureStdout(() => cmdTail(testServices({ orchDir: root, settings: SETTINGS_FIXTURE }), [key])); } finally { if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old; removeTempDir(root); }
    expect(joined).toContain("claude final");
    expect(joined).not.toContain("earlier turn");
  });

  function seedPiSession(): { root: OrchDir; key: string; restore: () => void } {
    const root = tempOrchDir("orch-command-pitail-");
    const old: OrchDir | undefined = process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR);
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
    const { root, key, restore } = seedPiSession();
    let joined = "";
    try { joined = captureStdout(() => cmdTail(testServices({ orchDir: root, settings: SETTINGS_FIXTURE }), [key])); } finally { restore(); }
    expect(joined).toContain("user      | first task");
    expect(joined).toContain("assistant | working on it");
    expect(joined).toContain("assistant | [tools] bash(ls -la)");
    expect(joined).toContain("tool      | bash -> file listing");
    expect(joined).toContain("assistant | final answer");
  });

  test.serial("orch tail -n keeps last-N rendered entries for a pi session", () => {
    const { root, key, restore } = seedPiSession();
    let joined = "";
    try { joined = captureStdout(() => cmdTail(testServices({ orchDir: root, settings: SETTINGS_FIXTURE }), [key, "-n", "1"])); } finally { restore(); }
    expect(joined).toContain("final answer");
    expect(joined).not.toContain("first task");
    expect(joined).not.toContain("working on it");
  });

  test.serial("orch session reports the pi entry count", () => {
    const { root, key, restore } = seedPiSession();
    let joined = "";
    try { joined = captureStdout(() => cmdSession(testServices({ orchDir: root, settings: SETTINGS_FIXTURE }), [key])); } finally { restore(); }
    expect(joined).toContain("entries: 5");
  });

  test.serial("orch session shows zero entries for an adapter view without them", () => {
    const root = tempOrchDir("orch-command-session-");
    const old: OrchDir | undefined = process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR);
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
    try { joined = captureStdout(() => cmdSession(testServices({ orchDir: root, settings: SETTINGS_FIXTURE }), [key])); } finally { if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old; removeTempDir(root); }
    expect(joined).toContain("entries: 0");
  });
});
