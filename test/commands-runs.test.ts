import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { cmdRuns, renderRuns } from "../src/commands/runs.ts";
import { cmdResult } from "../src/commands/results.ts";
import { upsertRun } from "../src/store/run-rows.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { insertSpawnedRecord } from "../src/store/spawned-rows.ts";
import { presenceAgentDir } from "../src/presence/store.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";

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

function seedPresence(root: string, key: string): void {
  const dir = presenceAgentDir(key, root);
  mkdirSync(dir, { recursive: true });
  insertSpawnedRecord(root, { pane: key, backend: "headless", workspace: "runs", handle: key });
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
      seedPresence(root, "headless~runs~one");
      upsertRun(root, { dispatchId: "old", agentKey: "headless~runs~one", state: "done", startedAt: Date.parse("2026-01-01T00:00:00Z"), task: "old task" });
      upsertRun(root, { dispatchId: "new", agentKey: "headless~runs~one", state: "done", startedAt: Date.parse("2026-01-02T00:00:00Z"), task: "new task" });
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
      seedPresence(root, "headless~runs~one");
      seedPresence(root, "headless~runs~two");
      upsertRun(root, { dispatchId: "one", agentKey: "headless~runs~one", state: "done", startedAt: Date.parse("2026-01-01T00:00:00Z") });
      upsertRun(root, { dispatchId: "two", agentKey: "headless~runs~two", state: "done", startedAt: Date.parse("2026-01-02T00:00:00Z") });
      const output = capture(() => cmdRuns(["headless~runs~one", "--json"])).stdout;
      expect(JSON.parse(output)).toEqual([expect.objectContaining({ dispatchId: "one", agentKey: "headless~runs~one" })]);
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
      const key = "headless~runs~gone";
      upsertRun(root, { dispatchId: "history", agentKey: key, state: "done", startedAt: Date.parse("2026-01-01T00:00:00Z"), result: { text: "from history" } });
      const output = capture(() => cmdResult([key]));
      expect(output.stdout).toBe("from history\n");
      expect(output.stderr).toContain("run history");
    } finally { closeAllStores(); if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old; removeTempDir(root); }
  });
});
