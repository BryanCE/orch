import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { cmdRuns, renderRuns } from "../src/commands/runs.ts";
import { cmdResult } from "../src/commands/results.ts";
import { upsertRun } from "../src/store/run-rows.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { ensureHarness, insertAgent } from "../src/store/agent-rows.ts";
import { orm } from "../src/store/connection.ts";
import { setHandle, setSpace } from "../src/store/interval-rows.ts";
import { presenceAgentDir } from "../src/presence/writer.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { sql } from "drizzle-orm";

function capture(run: () => void): { stdout: string; stderr: string } {
  const out: string[] = [];
  const err: string[] = [];
  const stdout = process.stdout.write.bind(process.stdout);
  const stderr = process.stderr.write.bind(process.stderr);
  process.stdout.write = ((chunk: string | Uint8Array) => { out.push(String(chunk)); return true; });
  process.stderr.write = ((chunk: string | Uint8Array) => { err.push(String(chunk)); return true; });
  try { run(); } finally { process.stdout.write = stdout; process.stderr.write = stderr; }
  return { stdout: out.join(""), stderr: err.join("") };
}

/** Seed one agent the way A1 stores it: a minted id in `agents`, with its space
 *  and pane handle as environment satellites of that id - never a wide row keyed
 *  by the pane. */
function seedPresence(root: string, key: string): void {
  const dir = presenceAgentDir(key, root);
  mkdirSync(dir, { recursive: true });
  ensureHarness(root, "pi", "pi", 1);
  insertAgent(root, { id: key, name: key, spawnedBy: null, harnessId: "pi", cwd: root, createdAt: 1 });
  orm(root).run(sql`INSERT OR IGNORE INTO spaces (id, name, created_at) VALUES (${"runs"}, ${"runs"}, ${1})`);
  setSpace(root, key, 1, "runs");
  setHandle(root, key, 1, key);
  writeFileSync(join(dir, "status.json"), JSON.stringify({
    schema: PRESENCE_SCHEMA, key, pid: process.pid, agent: "pi", state: "done",
  }));
}

describe("commands/runs", () => {
  test("lists newest first and honors -n", () => {
    const root = mkdtempSync(join(tmpdir(), "orch-runs-"));
    const old = process.env.ORCH_DIR;
    process.env.ORCH_DIR = root;
    try {
      writeSettingsFixture(root, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
      seedPresence(root, "runsoneaaa");
      upsertRun(root, { dispatchId: "old", agentKey: "runsoneaaa", state: "done", startedAt: Date.parse("2026-01-01T00:00:00Z"), task: "old task" });
      upsertRun(root, { dispatchId: "new", agentKey: "runsoneaaa", state: "done", startedAt: Date.parse("2026-01-02T00:00:00Z"), task: "new task" });
      const output = capture(() => cmdRuns(["-n", "1"])).stdout;
      expect(output).toContain("new task");
      expect(output).not.toContain("old task");
    } finally { closeAllStores(); if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old; removeTempDir(root); }
  });

  test("target filter and json preserve RunRecord rows", () => {
    const root = mkdtempSync(join(tmpdir(), "orch-runs-target-"));
    const old = process.env.ORCH_DIR;
    process.env.ORCH_DIR = root;
    try {
      writeSettingsFixture(root, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
      seedPresence(root, "runsoneaaa");
      seedPresence(root, "runstwoaaa");
      upsertRun(root, { dispatchId: "one", agentKey: "runsoneaaa", state: "done", startedAt: Date.parse("2026-01-01T00:00:00Z") });
      upsertRun(root, { dispatchId: "two", agentKey: "runstwoaaa", state: "done", startedAt: Date.parse("2026-01-02T00:00:00Z") });
      const output = capture(() => cmdRuns(["runsoneaaa", "--json"])).stdout;
      expect(JSON.parse(output)).toEqual([expect.objectContaining({ dispatchId: "one", agentKey: "runsoneaaa" })]);
    } finally { closeAllStores(); if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old; removeTempDir(root); }
  });

  test("running rows render as running, not zero duration", () => {
    expect(renderRuns([{ dispatchId: "x", agentKey: "agent", state: "working", startedAt: Date.parse("2026-01-01T00:00:00Z"), task: "task" }])).toContain("running");
  });

  test("result falls back to durable run history after presence reap", () => {
    const root = mkdtempSync(join(tmpdir(), "orch-result-history-"));
    const old = process.env.ORCH_DIR;
    process.env.ORCH_DIR = root;
    try {
      writeSettingsFixture(root, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
      const key = "runsgoneaa";
      upsertRun(root, { dispatchId: "history", agentKey: key, state: "done", startedAt: Date.parse("2026-01-01T00:00:00Z"), result: { text: "from history" } });
      const output = capture(() => cmdResult([key]));
      expect(output.stdout).toContain("(result from run history)\n");
      expect(output.stdout).toContain("from history\n");
    } finally { closeAllStores(); if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old; removeTempDir(root); }
  });
});
