import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ensureHarness, ensureHost, getOrCreateSessionAgent, insertAgent, packMembers } from "../src/store/agent-rows.ts";
import { acquireLease, adoptLease, currentLease, leaseHistory, openLeaseId, releaseLease } from "../src/store/lease-rows.ts";
import { openStore } from "../src/store/connection.ts";
import { deriveLeasePayload, governWrite } from "../src/daemon/orchd.ts";
import { presenceAgentDir } from "../src/presence/store.ts";
import { processStartToken } from "../src/process-identity.ts";
import { adoptAgent, detachAgent, leasedAgents, renameTarget, resolveTarget } from "../src/commands/lease.ts";
import { resolveSpawnNames } from "../src/commands/spawn.ts";
import { checkOwnerWrite, setOwner } from "../src/store/ownership-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const dirs: string[] = [];
const oldOrchDir = process.env.ORCH_DIR;
afterEach(() => {
  while (dirs.length) removeTempDir(dirs.pop()!);
  if (oldOrchDir === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = oldOrchDir;
});

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-lease-authority-"));
  dirs.push(dir);
  ensureHarness(dir, "pi", "pi", 1);
  ensureHost(dir, "host", "host", "linux", 1);
  return dir;
}

function agent(dir: string, id: string, name = id, spawnedBy: string | null = null): void {
  insertAgent(dir, { id, name, spawnedBy, harnessId: "pi", cwd: dir, createdAt: 1 });
}

/** An agent whose recorded process instance is this test process: provably alive. */
function live(dir: string, id: string, name = id): void {
  agent(dir, id, name);
  const token = processStartToken(process.pid);
  if (!token) throw new Error("test process has no start token");
  openStore(dir).query("INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES (?,?,?,?,?)")
    .run(id, 1, "host", process.pid, token);
}

/** An agent with a recorded process that is provably NOT this process instance. */
function dead(dir: string, id: string, name = id): void {
  agent(dir, id, name);
  openStore(dir).query("INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES (?,?,?,?,?)")
    .run(id, 1, "host", process.pid, "not-this-process-instance");
}

// C3 - An orch can never touch another orch's agents: not their panes, not their
// model, nothing. The gate is mutual exclusion against a LIVE holder only.
describe("C3 foreign agents are untouchable", () => {
  test("every driving verb is refused while a live foreign orch holds the lease", () => {
    const dir = fixture();
    live(dir, "orch-a");
    agent(dir, "caller-orch");
    agent(dir, "worker", "worker");
    acquireLease(dir, "worker", "orch-a", 2);
    // dispatch / steer / model / reset all reach the same daemon gate.
    expect(() => governWrite(dir, "worker", { target: "worker", actor: "caller-orch", text: "x" }))
      .toThrow(/orch-a/);
    // The lease commands answer with the same rule, without a daemon.
    expect(() => detachAgent(dir, "worker", "caller-orch")).toThrow(/leased by live orch orch-a/);
    expect(() => adoptAgent(dir, "worker", "caller-orch")).toThrow(/leased by live orch orch-a/);
    expect(() => renameTarget(dir, "worker", "caller-orch", "hijacked")).toThrow(/leased by live orch orch-a/);
    expect(resolveTarget(dir, "worker").name).toBe("worker");
  });

  test("a DEAD foreign holder is not a collision", () => {
    const dir = fixture();
    dead(dir, "zombie-orch");
    agent(dir, "caller-orch");
    agent(dir, "worker", "worker");
    acquireLease(dir, "worker", "zombie-orch", 2);
    expect(() => governWrite(dir, "worker", { target: "worker", actor: "caller-orch", text: "x" })).not.toThrow();
    expect(adoptAgent(dir, "worker", "caller-orch")).toMatchObject({ adopted: true });
  });

  test("a dead ownership row is not a collision either", () => {
    const dir = fixture();
    dead(dir, "zombie-orch");
    agent(dir, "worker", "worker");
    setOwner(dir, "worker", "zombie-orch");
    expect(checkOwnerWrite(dir, "worker", "caller-orch")).toEqual({ ok: true });
    // A live one still excludes, and an owner orch has no known liveness at all.
    live(dir, "live-orch");
    setOwner(dir, "worker", "live-orch");
    expect(checkOwnerWrite(dir, "worker", "caller-orch")).toEqual({ ok: false, reason: "agent is owned by live-orch" });
    setOwner(dir, "worker", "unknown-orch");
    expect(checkOwnerWrite(dir, "worker", "caller-orch")).toEqual({ ok: false, reason: "agent is owned by unknown-orch" });
  });
});

// C4 - `--steal` is the deliberate override for taking from a LIVE orch.
describe("C4 steal", () => {
  test("adopt refuses a live holder, and --steal takes it", () => {
    const dir = fixture();
    live(dir, "live-orch");
    agent(dir, "new-orch");
    agent(dir, "worker", "worker");
    acquireLease(dir, "worker", "live-orch", 2);
    expect(() => adoptAgent(dir, "worker", "new-orch")).toThrow(/leased by live orch/);
    expect(adoptAgent(dir, "worker", "new-orch", { steal: true, now: 3 })).toMatchObject({ adopted: true });
    expect(currentLease(dir, "worker")?.orchId).toBe("new-orch");
    const prior = openStore(dir)
      .query("SELECT release_reason AS reason FROM agent_leases WHERE orch_id = ?").get("live-orch");
    expect(prior).toMatchObject({ reason: "adopted" });
  });

  test("detach refuses a live holder, and --steal releases it", () => {
    const dir = fixture();
    live(dir, "live-orch");
    agent(dir, "caller-orch");
    agent(dir, "worker", "worker");
    acquireLease(dir, "worker", "live-orch", 2);
    expect(() => detachAgent(dir, "worker", "caller-orch")).toThrow(/leased by live orch/);
    expect(detachAgent(dir, "worker", "caller-orch", { steal: true, now: 3 })).toMatchObject({ released: true });
    expect(currentLease(dir, "worker")).toBeNull();
  });
});

// C4a - agent_leases.id is the fencing token: monotonic, so a woken zombie orch
// carrying a stale one can never clobber the adopter.
describe("C4a fencing token", () => {
  test("lease ids are monotonic across handoff and adoption", () => {
    const dir = fixture();
    agent(dir, "o1"); agent(dir, "o2"); agent(dir, "worker", "worker");
    const first = acquireLease(dir, "worker", "o1", 10);
    const second = adoptLease(dir, "worker", "o2", 20);
    const third = adoptLease(dir, "worker", "o1", 30);
    expect(second).toBeGreaterThan(first);
    expect(third).toBeGreaterThan(second);
    expect(openLeaseId(dir, "worker")).toBe(third);
  });

  test("a stale fence cannot release the current holder's lease", () => {
    const dir = fixture();
    agent(dir, "zombie"); agent(dir, "adopter"); agent(dir, "worker", "worker");
    const stale = acquireLease(dir, "worker", "zombie", 10);
    adoptLease(dir, "worker", "adopter", 20);
    const current = adoptLease(dir, "worker", "zombie", 30);
    expect(stale).not.toBe(current);
    // The zombie wakes holding lease #1 and tries to act on what it believes is
    // still its lease. Same holder id, different lease: the fence refuses it.
    expect(() => releaseLease(dir, "worker", "zombie", 40, stale)).toThrow("stale_fence");
    expect(openLeaseId(dir, "worker")).toBe(current);
    expect(() => releaseLease(dir, "worker", "zombie", 40, current)).not.toThrow();
  });

  test("openLeaseId is null when nothing is leased", () => {
    const dir = fixture();
    agent(dir, "worker", "worker");
    expect(openLeaseId(dir, "worker")).toBeNull();
  });
});

// C4b - reads are never gated.
describe("C4b reads are never gated", () => {
  test("status and events read straight through a live foreign lease", () => {
    const dir = fixture();
    live(dir, "live-orch");
    agent(dir, "worker", "worker");
    acquireLease(dir, "worker", "live-orch", 2);
    expect(deriveLeasePayload(dir, "worker")).toEqual({
      lease: { holderId: "live-orch", holderName: "live-orch", holderAlive: true },
      leaseKnown: true,
    });
    expect(resolveTarget(dir, "worker").id).toBe("worker");
    expect(currentLease(dir, "worker")?.orchId).toBe("live-orch");
  });
});

// C4c / C4d - names need no uniqueness, and resolving one is a first-class
// operation rather than a per-command lookup.
describe("C4c/C4d name resolution", () => {
  test("duplicate names are legal and an ambiguous target asks for the id", () => {
    const dir = fixture();
    agent(dir, "id-one", "api");
    agent(dir, "id-two", "api");
    expect(resolveTarget(dir, "id-one").id).toBe("id-one");
    let message = "";
    try { resolveTarget(dir, "api"); } catch (error: unknown) { message = error instanceof Error ? error.message : String(error); }
    expect(message).toContain("id-one");
    expect(message).toContain("id-two");
    expect(message).toMatch(/which id/i);
  });

  test("a unique name resolves, and an unknown target is a lookup miss", () => {
    const dir = fixture();
    agent(dir, "abc123", "solo");
    expect(resolveTarget(dir, "solo").id).toBe("abc123");
    expect(() => resolveTarget(dir, "nobody")).toThrow(/No agent matches/);
  });
});

// C4e - spawning requires a name; a self-registering session mints its own.
describe("C4e naming at creation", () => {
  test("a nameless spawn is refused", () => {
    expect(() => resolveSpawnNames([])).toThrow(/must be named at creation/);
  });

  test("a self-registering session gets <harness>-<first 8 of its id>", () => {
    const dir = fixture();
    const identity = getOrCreateSessionAgent(dir, {
      pid: process.pid, startToken: "token-a", sessionToken: "session-a", harnessId: "pi",
      cwd: dir, label: "pi session", hostId: "host", hostName: "host", hostOs: "linux", now: 5,
    });
    const row = resolveTarget(dir, identity.id);
    expect(row.name).toBe(`pi-${identity.id.slice(0, 8)}`);
  });
});

// C4f - an agent may rename ITSELF with no lease in force; renaming another is driving.
describe("C4f self-rename", () => {
  test("an agent renames itself whether or not a lease is in force", () => {
    const dir = fixture();
    live(dir, "live-orch");
    agent(dir, "self", "before");
    expect(renameTarget(dir, "self", "self", "after")).toMatchObject({ id: "self", name: "after" });
    acquireLease(dir, "self", "live-orch", 2);
    expect(renameTarget(dir, "self", "self", "after-two")).toMatchObject({ name: "after-two" });
    expect(resolveTarget(dir, "self").name).toBe("after-two");
  });

  test("renaming another agent is driving and obeys the lease", () => {
    const dir = fixture();
    live(dir, "live-orch");
    agent(dir, "holder-orch");
    agent(dir, "worker", "worker");
    acquireLease(dir, "worker", "live-orch", 2);
    expect(() => renameTarget(dir, "worker", "holder-orch", "taken")).toThrow(/leased by live orch/);
    expect(renameTarget(dir, "worker", "live-orch", "taken")).toMatchObject({ name: "taken" });
  });

  test("an invalid name is refused", () => {
    const dir = fixture();
    agent(dir, "self", "before");
    expect(() => renameTarget(dir, "self", "self", "Not A Name")).toThrow(/invalid agent name/);
  });
});

// C5 - a transfer must not disturb the agent: no reset, no re-attach, no context loss.
describe("C5 a transfer does not disturb the agent", () => {
  test("adoption writes lease rows and touches nothing else", () => {
    const dir = fixture();
    process.env.ORCH_DIR = dir;
    dead(dir, "old-orch");
    agent(dir, "new-orch");
    agent(dir, "worker", "worker");
    openStore(dir).query("INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES (?,?,?,?,?)")
      .run("worker", 1, "host", 424242, "worker-token");
    const statusPath = join(presenceAgentDir("worker", dir), "status.json");
    mkdirSync(presenceAgentDir("worker", dir), { recursive: true });
    writeFileSync(statusPath, JSON.stringify({ state: "working", task: "keep me" }));
    acquireLease(dir, "worker", "old-orch", 2);

    const before = {
      agent: openStore(dir).query("SELECT * FROM agents WHERE id = ?").get("worker"),
      process: openStore(dir).query("SELECT * FROM agent_processes WHERE agent_id = ?").get("worker"),
      status: readFileSync(statusPath, "utf8"),
    };
    expect(adoptAgent(dir, "worker", "new-orch", { now: 3 })).toMatchObject({ adopted: true });
    expect({
      agent: openStore(dir).query("SELECT * FROM agents WHERE id = ?").get("worker"),
      process: openStore(dir).query("SELECT * FROM agent_processes WHERE agent_id = ?").get("worker"),
      status: readFileSync(statusPath, "utf8"),
    }).toEqual(before);
  });
});

// C7 - live views group by lease; history groups by provenance.
describe("C7 live by lease, history by provenance", () => {
  test("adoption moves the live view and leaves provenance untouched", () => {
    const dir = fixture();
    dead(dir, "born-orch");
    agent(dir, "adopter-orch");
    agent(dir, "worker", "worker", "born-orch");

    acquireLease(dir, "worker", "born-orch", 2);
    expect(leasedAgents(dir, "born-orch").map((row) => row.id)).toEqual(["worker"]);
    expect(leasedAgents(dir, "adopter-orch")).toEqual([]);

    adoptAgent(dir, "worker", "adopter-orch", { now: 3 });

    // Live view followed the lease...
    expect(leasedAgents(dir, "adopter-orch").map((row) => row.id)).toEqual(["worker"]);
    expect(leasedAgents(dir, "born-orch")).toEqual([]);
    // ...and the pack, which is provenance, did not move.
    expect(resolveTarget(dir, "worker").spawnedBy).toBe("born-orch");
    expect(packMembers(dir, "born-orch").map((row) => row.id).sort()).toEqual(["born-orch", "worker"]);
    // History is the full lease trail, not just what is open now.
    expect(leaseHistory(dir, "worker").map((lease) => [lease.orchId, lease.releaseReason]))
      .toEqual([["born-orch", "adopted"], ["adopter-orch", null]]);
  });
});
