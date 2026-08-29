import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores } from "../src/store/connection.ts";
import { deleteRunsBefore, selectRuns, upsertRun, type RunRecord } from "../src/store/run-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const tempDirs: string[] = [];

afterEach(() => {
  closeAllStores();
  while (tempDirs.length > 0) removeTempDir(tempDirs.pop()!);
});

function fixture(): string {
  const orchDir = mkdtempSync(join(tmpdir(), "orch-runs-"));
  tempDirs.push(orchDir);
  return orchDir;
}

function fullRun(overrides: Partial<RunRecord> = {}): RunRecord {
  return {
    dispatchId: "dispatch-1",
    agentKey: "agent-1",
    adapter: "pi",
    model: "model-1",
    space: "workspace-1",
    task: "do the work",
    state: "completed",
    startedAt: Date.parse("2026-01-01T00:00:00.000Z"),
    finishedAt: Date.parse("2026-01-01T00:01:00.000Z"),
    tokensIn: 101,
    tokensOut: 202,
    cacheRead: 303,
    cacheWrite: 404,
    cost: 1.25,
    turns: 7,
    result: { ok: true, files: ["a.ts"], nested: { count: 2 } },
    lastError: "",
    ...overrides,
  };
}

describe("run rows", () => {
  test("round-trips every field, including a structured result", () => {
    const orchDir = fixture();
    const run = fullRun();
    upsertRun(orchDir, run);
    expect(selectRuns(orchDir)).toEqual([run]);
  });

  test("upsert updates a row while preserving its original start time", () => {
    const orchDir = fixture();
    upsertRun(orchDir, fullRun());
    const newer = fullRun({
      agentKey: "agent-2",
      state: "failed",
      startedAt: Date.parse("2026-01-02T00:00:00.000Z"),
      finishedAt: Date.parse("2026-01-02T00:02:00.000Z"),
      result: { ok: false },
      lastError: "nope",
    });
    upsertRun(orchDir, newer);
    expect(selectRuns(orchDir)).toEqual([{ ...newer, startedAt: Date.parse("2026-01-01T00:00:00.000Z") }]);
  });

  test("orders by started time, filters by agent, and honours limit", () => {
    const orchDir = fixture();
    upsertRun(orchDir, fullRun({ dispatchId: "old", agentKey: "same", startedAt: Date.parse("2026-01-01T00:00:00.000Z") }));
    upsertRun(orchDir, fullRun({ dispatchId: "new", agentKey: "same", startedAt: Date.parse("2026-01-03T00:00:00.000Z") }));
    upsertRun(orchDir, fullRun({ dispatchId: "other", agentKey: "other", startedAt: Date.parse("2026-01-02T00:00:00.000Z") }));
    expect(selectRuns(orchDir).map((run) => run.dispatchId)).toEqual(["new", "other", "old"]);
    expect(selectRuns(orchDir, { agentKey: "same", limit: 1 }).map((run) => run.dispatchId)).toEqual(["new"]);
  });

  test("omits absent optional fields instead of returning null", () => {
    const orchDir = fixture();
    const run: RunRecord = { dispatchId: "minimal", agentKey: "agent", state: "running", startedAt: Date.parse("2026-01-01T00:00:00.000Z") };
    upsertRun(orchDir, run);
    const selected = selectRuns(orchDir)[0]!;
    expect(selected).toEqual(run);
    for (const field of ["adapter", "model", "workspace", "task", "finishedAt", "tokensIn", "tokensOut", "cacheRead", "cacheWrite", "cost", "turns", "result", "lastError"]) {
      expect(Object.hasOwn(selected, field)).toBe(false);
    }
  });

  test("deletes only rows older than the cutoff and returns the count", () => {
    const orchDir = fixture();
    upsertRun(orchDir, fullRun({ dispatchId: "old-1", startedAt: Date.parse("2026-01-01T00:00:00.000Z") }));
    upsertRun(orchDir, fullRun({ dispatchId: "old-2", startedAt: Date.parse("2026-01-02T00:00:00.000Z") }));
    upsertRun(orchDir, fullRun({ dispatchId: "new", startedAt: Date.parse("2026-01-03T00:00:00.000Z") }));
    expect(deleteRunsBefore(orchDir, Date.parse("2026-01-02T00:00:00.000Z"))).toBe(1);
    expect(selectRuns(orchDir).map((run) => run.dispatchId)).toEqual(["new", "old-2"]);
  });

  test("stays readable after the agent presence directory is deleted", () => {
    const orchDir = fixture();
    const agentDir = join(orchDir, "agents", "agent-gone");
    mkdirSync(agentDir, { recursive: true });
    const run = fullRun({ agentKey: "agent-gone" });
    upsertRun(orchDir, run);
    rmSync(agentDir, { recursive: true, force: true });
    closeAllStores();
    expect(selectRuns(orchDir)).toEqual([run]);
  });
});
