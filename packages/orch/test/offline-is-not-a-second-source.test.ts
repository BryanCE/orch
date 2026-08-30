import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fleetStatusRows } from "../src/commands/status.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

/**
 * TASKS/02-scope.md M8 — the DESIGN question was whether `orch status --offline`
 * is "a second reader of a second source", to be demoted to a doctor affordance
 * or deleted.
 *
 * RULING: it is neither, so it stays a status flag. There is exactly ONE reader
 * — `fleetStatusRows` → `buildEntities` — and exactly one source: orch's store
 * and the presence directories. `--offline` sets `skipBackends`, which drops the
 * two things that mean ASKING SOMEONE ELSE (the daemon over RPC, and each plexer
 * for its pane inventory). Same reader, same source, one fewer question.
 *
 * The failure this row was written against is real and is what these tests pin:
 * if `--offline` ever grows its own row builder, the two paths can disagree
 * about the same agent, and the flag becomes a second truth rather than a
 * narrower view of the one.
 */

const dirs: string[] = [];
const oldDir = process.env.ORCH_DIR;

afterEach(() => {
  if (oldDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = oldDir;
  while (dirs.length) removeTempDir(dirs.pop()!);
});

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-offline-"));
  dirs.push(dir);
  process.env.ORCH_DIR = dir;
  return dir;
}

function seedPresence(root: string, key: string, pid: number, state: string): void {
  const dir = join(root, "agents", key);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid, agent: "pi", state }));
}

const NO_SPACES: Parameters<typeof fleetStatusRows>[0] = {};

describe("--offline is a narrower view of ONE source, not a second one (M8)", () => {
  test("offline and online read the same agents from the same presence files", () => {
    const root = fixture();
    seedPresence(root, "liveagent1", process.pid, "working");
    seedPresence(root, "deadagent1", 999_999_99, "done");

    const offline = fleetStatusRows(NO_SPACES, { offline: true, bundleHashes: () => new Set(), orchId: () => null });
    const online = fleetStatusRows(NO_SPACES, { bundleHashes: () => new Set(), orchId: () => null });

    // Every agent orch itself recorded appears in BOTH: offline drops no agent
    // of orch's, it only stops asking a plexer about panes.
    expect(offline.map((row) => row.key).sort()).toEqual(["deadagent1", "liveagent1"]);
    const onlineKeys = new Set(online.map((row) => row.key));
    for (const row of offline) expect(onlineKeys.has(row.key)).toBe(true);
    // Online may hold MORE - a live plexer on this machine reports the human's
    // own panes too. That extra is the answer to a question offline never asks;
    // it is not a second source disagreeing about the same agent.
    expect(online.length).toBeGreaterThanOrEqual(offline.length);
  });

  test("offline reports the SAME state the agent reported, never a second opinion", () => {
    const root = fixture();
    seedPresence(root, "liveagent1", process.pid, "working");

    const [row] = fleetStatusRows(NO_SPACES, { offline: true, bundleHashes: () => new Set(), orchId: () => null });

    // `state` is what the AGENT says about itself and is the only field that
    // answers "is the work finished". Offline reads that same field; it does not
    // derive a state of its own from anything else on disk.
    expect(row?.state).toBe("working");
    expect(row?.alive).toBe(true);
    // Nothing was asked of a plexer, so no plexer answered about the pane.
    expect(row?.backendStatus).toBeNull();
  });

  test("there is exactly ONE row builder, and --offline only narrows what it asks", () => {
    // The row this test defends: a second reader would let `--offline` and plain
    // `status` disagree about the same agent. Enforced statically, because the
    // divergence would otherwise appear only on a machine with a live plexer.
    const source = readFileSync(join(import.meta.dir, "..", "src", "commands", "status.ts"), "utf8");
    const offlineBranch = /if\s*\(offline\)\s*\{[\s\S]*?\n\s{2}\}/.exec(source)?.[0] ?? "";

    expect(offlineBranch).toContain("fleetStatusRows");
    // The whole of the offline path is that one call plus the shared snapshot.
    expect(offlineBranch).not.toContain("loadPresence");
    expect(offlineBranch).not.toContain("readdirSync");
    expect(offlineBranch).not.toContain("orm");
  });

  test("offline is the one path that never dials or starts the daemon", () => {
    const source = readFileSync(join(import.meta.dir, "..", "src", "commands", "status.ts"), "utf8");

    // This is what the flag is FOR, and the reason it stays a status flag rather
    // than moving to doctor: a person on a machine with no daemon still gets the
    // fleet, and orch does not start one behind their back to answer.
    expect(source).toContain("if (!options.offline) await ensureDaemonOrWarn");
  });
});
