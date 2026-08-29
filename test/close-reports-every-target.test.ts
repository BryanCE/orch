import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmdClose } from "../src/commands/lifecycle.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { recordSpawned, spawnedRecords } from "../src/presence/store.ts";
import { openStore } from "../src/store/connection.ts";
import { isRecord } from "../src/util.ts";
import { FakePanedBackend, fakePane, withRegisteredBackend } from "./helpers/backend.ts";
import { seedSpace } from "./helpers/space.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

/**
 * TASKS/11-usage-bugs.md U2 — `orch close --all` left rows it had just failed to
 * close, said so only in prose, and exited success:
 *
 *     Could not close w7:p2B; process or pane remains registered.
 *
 * `TASKS/07-port-seam.md`, "Multi-target commands": a multi-target command
 * records `outcome: "done" | "error"` PER TARGET plus the real error text. A
 * caller parsing `--json` could not see any of this — the payload carried only
 * the successes — so a script could not tell a full sweep from a half one.
 *
 * The second half of the bug was U1's: the rows that "failed" had panes the
 * plexer no longer had, so orch asked a dead handle to close, took the throw as
 * a failure, and kept a row alive that nothing could ever close.
 */

const dirs: string[] = [];
const oldDir = process.env.ORCH_DIR;
const oldKey = process.env.ORCH_AGENT_KEY;
const originalWrite = process.stdout.write.bind(process.stdout);

afterEach(() => {
  process.stdout.write = originalWrite;
  // `cmdClose` signals a partial sweep with `process.exitCode` (never
  // `process.exit`, which would truncate the buffered JSON). That is
  // process-wide state, so a test that provokes it must put it back or every
  // later test in this runner inherits the failure.
  process.exitCode = 0;
  if (oldDir === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = oldDir;
  if (oldKey === undefined) delete process.env.ORCH_AGENT_KEY; else process.env.ORCH_AGENT_KEY = oldKey;
  while (dirs.length) removeTempDir(dirs.pop()!);
});

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-close-report-"));
  dirs.push(dir);
  writeSettingsFixture(dir, {
    enabled: { adapters: ["pi"], backends: ["headless"] },
    defaults: { adapter: "pi", backend: "headless" },
  });
  process.env.ORCH_DIR = dir;
  delete process.env.ORCH_AGENT_KEY;
  openStore(dir);
  seedSpace(dir, "space00001");
  return dir;
}

function seedAgent(dir: string, key: string, handle: string, pid: number): void {
  recordSpawned(key, { adapter: "pi", backend: "headless", space: "space00001", handle });
  const agentDir = join(dir, "agents", key);
  mkdirSync(agentDir, { recursive: true });
  writeFileSync(join(agentDir, "status.json"), JSON.stringify({
    schema: PRESENCE_SCHEMA, key, paneId: handle, pid, agent: "pi", state: "working",
  }));
}

function capture(action: () => void): Record<string, unknown> {
  let output = "";
  process.stdout.write = (chunk: string | Uint8Array) => { output += chunk.toString(); return true; };
  try { action(); } finally { process.stdout.write = originalWrite; }
  const parsed: unknown = JSON.parse(output.trim().split("\n").at(-1) ?? "{}");
  if (!isRecord(parsed)) throw new Error(`expected a JSON object, got ${output}`);
  return parsed;
}

describe("close reports an outcome for every target it was given (U2)", () => {
  test("--json carries a per-target outcome, not just the successes", () => {
    const dir = fixture();
    seedAgent(dir, "closeagt01", "w7:p2A", 999_999_99);
    seedAgent(dir, "closeagt02", "w7:p2B", 999_999_99);
    const backend = new FakePanedBackend({ id: "headless", panes: [fakePane("w7:p2A"), fakePane("w7:p2B")] });

    const payload = withRegisteredBackend(backend, () => capture(() => { cmdClose(["--all", "--json"]); }));

    const results = payload.results;
    expect(Array.isArray(results)).toBe(true);
    // Every target it was handed appears, each saying what happened to it -
    // that is the whole difference between a full sweep and a half one.
    const outcomes = Array.isArray(results)
      ? results.flatMap((row): { target: string; outcome: string }[] =>
        isRecord(row) && typeof row.target === "string" && typeof row.outcome === "string"
          ? [{ target: row.target, outcome: row.outcome }]
          : [])
      : [];
    expect(outcomes.map((row) => row.outcome)).toEqual(["done", "done"]);
    expect(outcomes.map((row) => row.target).sort()).toEqual(["closeagt01", "closeagt02"]);
  });

  test("a failed target reports outcome error WITH the real error text", () => {
    const dir = fixture();
    seedAgent(dir, "stuckagt01", "w7:p2C", 999_999_99);
    // A plexer that lists the pane and refuses to close it: the close is asked
    // for, fails, and the row survives - exactly the reported case.
    const backend = new FakePanedBackend({ id: "headless", panes: [fakePane("w7:p2C")] });
    backend.paneHost.close = (): never => { throw new Error("herdr refused: pane is busy"); };

    const payload = withRegisteredBackend(backend, () => capture(() => { cmdClose(["--all", "--json"]); }));

    const results: unknown[] = Array.isArray(payload.results) ? payload.results : [];
    const first: unknown = results[0];
    expect(isRecord(first) && first.outcome).toBe("error");
    // Prose on stderr is not something a caller can act on. The reason travels
    // with the outcome.
    expect(isRecord(first) && typeof first.error === "string" && first.error).toContain("herdr refused: pane is busy");
    expect(spawnedRecords().has("stuckagt01")).toBe(true);
  });

  test("a pane the plexer no longer has is CLOSED, not failed", () => {
    const dir = fixture();
    seedAgent(dir, "goneagt001", "w7:p2D", 999_999_99);
    // U1's root cause reaching close: the recorded handle names no pane. There
    // is nothing to close, so asking the plexer to close it and calling the
    // throw a failure leaves a row nothing can ever close.
    const backend = new FakePanedBackend({ id: "headless", panes: [] });

    const payload = withRegisteredBackend(backend, () => capture(() => { cmdClose(["--all", "--json"]); }));

    const results: unknown[] = Array.isArray(payload.results) ? payload.results : [];
    expect(results.map((row: unknown) => (isRecord(row) ? row.outcome : null))).toEqual(["done"]);
    expect(spawnedRecords().has("goneagt001")).toBe(false);
  });

  test("the exit code still reflects whether every target closed", () => {
    const dir = fixture();
    seedAgent(dir, "closeagt01", "w7:p2A", 999_999_99);
    const backend = new FakePanedBackend({ id: "headless", panes: [fakePane("w7:p2A")] });

    const payload = withRegisteredBackend(backend, () => capture(() => { cmdClose(["--all", "--json"]); }));

    expect(payload).toMatchObject({ requested: 1, ok: 1 });
  });
});
