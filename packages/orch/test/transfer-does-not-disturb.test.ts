import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { ensureHarness, ensureHost, ensurePlexer, insertAgent } from "../src/store/agent-rows.ts";
import { setAgentPlexer, setHandle, setSpace, setTuning } from "../src/store/interval-rows.ts";
import { acquireLease, adoptLease, handoffLease, leaseHistory, releaseLease } from "../src/store/lease-rows.ts";
import { agentView } from "../src/store/agent-view.ts";
import { inboxPath } from "../src/presence/inbox.ts";
import { seedStatus } from "./helpers/presence.ts";
import { seedSpace } from "./helpers/space.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { sql } from "drizzle-orm";

/**
 * TASKS/02-scope.md C5 — "A transfer must not disturb the agent — no reset, no
 * re-attach, no CONTEXT LOSS."
 *
 * Ownership is a lease and nothing else (A1), so handing one over is a write to
 * `agent_leases` and to nothing else. The failure this forbids is the tempting
 * one: re-attaching or resetting the agent "so the new holder gets a clean
 * session" throws away the very work the transfer existed to preserve.
 */

const dirs: string[] = [];
const saved = process.env.ORCH_DIR;

afterEach(() => {
  closeAllStores();
  if (saved === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = saved;
  while (dirs.length) removeTempDir(dirs.pop()!);
});

/** A fully placed, working agent: every axis set, a live process, presence on disk. */
function workingAgent(): { directory: string; worker: string; before: ReturnType<typeof agentView> } {
  const directory = mkdtempSync(join(tmpdir(), "orch-transfer-"));
  dirs.push(directory);
  process.env.ORCH_DIR = directory;
  orm(directory);
  ensureHarness(directory, "pi", "pi", 1);
  ensurePlexer(directory, "herdr", "herdr", 1);
  ensureHost(directory, "h", "h", "linux", 1);
  seedSpace(directory, "server");

  for (const id of ["orch-a", "orch-b"]) {
    insertAgent(directory, { id, spawnedBy: null, harnessId: "pi", cwd: "/repo", name: id, createdAt: 1 });
  }
  insertAgent(directory, { id: "worker", spawnedBy: "orch-a", harnessId: "pi", cwd: "/repo", name: "worker", createdAt: 2 });
  setAgentPlexer(directory, "worker", "herdr");
  setHandle(directory, "worker", 10, "wF:p3");
  setSpace(directory, "worker", 10, "server");
  setTuning(directory, "worker", 10, { model: "openai-codex/gpt-5.6-luna", thinking: "high" });
  orm(directory)
    .run(sql`INSERT INTO agent_processes (agent_id, since, until, host_id, pid, start_token) VALUES (${"worker"},${10},NULL,${"h"},${process.pid},${"tok"})`);
  seedStatus(directory, "worker", { key: "worker", agent: "pi", pid: process.pid, state: "working", sessionPath: "/s/session-1" });
  acquireLease(directory, "worker", "orch-a", 20);

  return { directory, worker: "worker", before: agentView(directory, "worker") };
}

function processInterval(directory: string): unknown {
  return orm(directory)
    .all(sql`SELECT since, until, pid, start_token FROM agent_processes WHERE agent_id = 'worker'`);
}

function statusBytes(directory: string): string {
  return readFileSync(join(directory, "agents", "worker", "status.json"), "utf8");
}

describe("a transfer touches the lease and nothing else", () => {
  test("a handoff changes the holder and leaves every other fact identical", () => {
    const { directory, before } = workingAgent();

    handoffLease(directory, "worker", "orch-a", "orch-b", 30);

    const after = agentView(directory, "worker");
    expect(after?.heldBy).toEqual({ orchId: "orch-b", since: 30 });
    // Environment, tuning, provenance and identity are untouched: a transfer
    // moves the driver, not the agent.
    expect(after?.environment).toEqual(before!.environment);
    expect(after?.tuning).toEqual(before!.tuning);
    expect(after?.spawnedBy).toBe(before!.spawnedBy);
    expect(after?.rootAgentId).toBe(before!.rootAgentId);
    expect(after?.endedAt).toBeNull();
  });

  test("the agent's process is not restarted or re-attached", () => {
    const { directory } = workingAgent();
    const processBefore = processInterval(directory);

    handoffLease(directory, "worker", "orch-a", "orch-b", 30);

    // A new process interval, or a closed one, would mean the agent was
    // relaunched — the context loss C5 forbids, written down in the store.
    expect(processInterval(directory)).toEqual(processBefore);
  });

  test("no reset, steer or re-attach is delivered to the agent", () => {
    const { directory } = workingAgent();
    const statusBefore = statusBytes(directory);

    handoffLease(directory, "worker", "orch-a", "orch-b", 30);

    // Nothing was said to the agent at all: its inbox was never even created,
    // and its presence status is byte-identical.
    expect(existsSync(inboxPath(join(directory, "agents", "worker")))).toBe(false);
    expect(statusBytes(directory)).toBe(statusBefore);
  });

  test("adoption of an unheld agent disturbs it no more than a handoff does", () => {
    const { directory, before } = workingAgent();
    // Released through the real API: a closed lease must carry a release
    // reason (`agent_leases_closed_has_reason`), so a hand-written UPDATE here
    // would be testing a state the store cannot hold.
    releaseLease(directory, "worker", "orch-a", 25);
    const processBefore = processInterval(directory);
    const statusBefore = statusBytes(directory);

    adoptLease(directory, "worker", "orch-b", 30);

    const after = agentView(directory, "worker");
    expect(after?.heldBy?.orchId).toBe("orch-b");
    expect(after?.environment).toEqual(before!.environment);
    expect(processInterval(directory)).toEqual(processBefore);
    expect(statusBytes(directory)).toBe(statusBefore);
  });

  test("the holding that ended is kept as history, not erased by the transfer", () => {
    const { directory } = workingAgent();
    handoffLease(directory, "worker", "orch-a", "orch-b", 30);

    // C1: expiry transfers nothing, and a release is history. A transfer that
    // deleted the previous holding would make the fencing token (C4a) meaningless.
    const history = leaseHistory(directory, "worker");
    expect(history.map((lease) => lease.orchId)).toEqual(["orch-a", "orch-b"]);
    expect(history[0]?.until).toBe(30);
  });
});
