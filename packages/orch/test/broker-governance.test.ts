import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { governWrite } from "../src/daemon/orchd.ts";
import { insertOutboxMessage, selectPendingOutbox } from "../src/store/outbox-rows.ts";
import { withTransaction, orm } from "../src/store/connection.ts";
import { ensureHarness, ensureHost, insertAgent } from "../src/store/agent-rows.ts";
import { setSpace } from "../src/store/interval-rows.ts";
import { acquireLease, currentLease } from "../src/store/lease-rows.ts";
import { processStartToken } from "../src/process-identity.ts";
import { sql } from "drizzle-orm";

const dirs: string[] = [];
function freshDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-gov-"));
  dirs.push(dir);
  ensureHarness(dir, "pi", "pi", 1);
  ensureHost(dir, "host", "host", "linux", 1);
  return dir;
}

/** Identity and nothing else: a minted id, with no environment welded into it. */
function agent(dir: string, id: string): void {
  insertAgent(dir, { id, name: id, spawnedBy: null, harnessId: "pi", cwd: dir, createdAt: 1 });
}

/** An orch whose recorded process instance is this test process: provably alive. */
function liveOrch(dir: string, id: string): void {
  agent(dir, id);
  const token = processStartToken(process.pid);
  if (!token) throw new Error("test process has no start token");
  orm(dir).run(sql`INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES (${id},${1},${"host"},${process.pid},${token})`);
}

/** An orch with a recorded process that is provably NOT this process instance. */
function deadOrch(dir: string, id: string): void {
  agent(dir, id);
  orm(dir).run(sql`INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES (${id},${1},${"host"},${process.pid},${"not-this-process-instance"})`);
}

/** Environment is a satellite of the identity, on its own timeline. */
function placeIn(dir: string, id: string, space: string): void {
  orm(dir).run(sql`INSERT OR IGNORE INTO spaces (id, name, created_at) VALUES (${space}, ${space}, ${1})`);
  setSpace(dir, id, 1, space);
}

afterEach(() => {
  for (const dir of dirs.splice(0)) removeTempDir(dir);
});

// A1: ownership is the lease and nothing else. There is no second `ownership`
// id space beside `agent_leases`, so every gate below reads the one lease.
describe("daemon governWrite enforcement", () => {
  test("an unscoped actor is refused while a live orch holds the lease", () => {
    const dir = freshDir();
    liveOrch(dir, "holderaaa1");
    agent(dir, "targetaaa1");
    acquireLease(dir, "targetaaa1", "holderaaa1", 2);
    // No actor field => the caller holds nothing, so a live holder excludes it.
    expect(() => governWrite(dir, "targetaaa1", { target: "targetaaa1", text: "hi" })).toThrow(/leased by holderaaa1/);
  });

  test("an unscoped actor may write to an unleased target", () => {
    const dir = freshDir();
    agent(dir, "targetaaa1");
    expect(() => governWrite(dir, "targetaaa1", { target: "targetaaa1", text: "hi" })).not.toThrow();
  });

  test("the lease holder may write to its own agent", () => {
    const dir = freshDir();
    liveOrch(dir, "holderaaa1");
    agent(dir, "targetaaa1");
    acquireLease(dir, "targetaaa1", "holderaaa1", 2);
    expect(() => governWrite(dir, "targetaaa1", { actor: "holderaaa1", text: "hi" })).not.toThrow();
  });

  test("a foreign live holder in the same space is refused and named", () => {
    const dir = freshDir();
    liveOrch(dir, "holderaaa1");
    agent(dir, "actoraaaa1");
    agent(dir, "targetaaa1");
    acquireLease(dir, "targetaaa1", "holderaaa1", 2);
    expect(() => governWrite(dir, "targetaaa1", { actor: "actoraaaa1", text: "hi" })).toThrow(/leased by holderaaa1/);
  });

  // Rule 11: a dead holder is not a collision. Gating on one strands a whole
  // fleet with nothing left able to drive it.
  test("a dead holder is not a collision", () => {
    const dir = freshDir();
    deadOrch(dir, "deadorcha1");
    agent(dir, "actoraaaa1");
    agent(dir, "targetaaa1");
    acquireLease(dir, "targetaaa1", "deadorcha1", 2);
    expect(() => governWrite(dir, "targetaaa1", { actor: "actoraaaa1", text: "hi" })).not.toThrow();
  });

  // C4: taking an agent from a LIVE orch is a deliberate, named act with its own
  // verb. A driving verb never transfers a holding as a side effect, so the
  // refusal points at the verb that does.
  test("--steal on a driving verb does not take a live holder's lease", () => {
    const dir = freshDir();
    liveOrch(dir, "holderaaa1");
    agent(dir, "actoraaaa1");
    agent(dir, "targetaaa1");
    acquireLease(dir, "targetaaa1", "holderaaa1", 2);
    expect(() => governWrite(dir, "targetaaa1", { actor: "actoraaaa1", text: "hi", steal: true }))
      .toThrow(/orch adopt targetaaa1 --steal/);
    expect(currentLease(dir, "targetaaa1")?.orchId).toBe("holderaaa1");
  });

  test("a cross-space write is refused by the wall before the lease", () => {
    const dir = freshDir();
    liveOrch(dir, "holderaaa1");
    agent(dir, "actoraaaa1");
    agent(dir, "targetaaa1");
    placeIn(dir, "targetaaa1", "wB");
    placeIn(dir, "actoraaaa1", "wA");
    acquireLease(dir, "targetaaa1", "holderaaa1", 2);
    expect(() => governWrite(dir, "targetaaa1", { actor: "actoraaaa1", text: "hi" })).toThrow(/space wall/);
  });

  test("--cross-space clears the wall but the lease still applies", () => {
    const dir = freshDir();
    liveOrch(dir, "holderaaa1");
    agent(dir, "actoraaaa1");
    agent(dir, "targetaaa1");
    placeIn(dir, "targetaaa1", "wB");
    placeIn(dir, "actoraaaa1", "wA");
    acquireLease(dir, "targetaaa1", "holderaaa1", 2);
    expect(() => governWrite(dir, "targetaaa1", { actor: "actoraaaa1", text: "hi", crossSpace: true }))
      .toThrow(/leased by holderaaa1/);
  });

  // The human operator of a space keeps control of every fleet keyed into it,
  // whichever orch spawned them; a spawned agent's actor token is its own id,
  // never `operator`, so this lane grants an agent nothing.
  test("the space operator writes to a same-space leased agent without taking the lease", () => {
    const dir = freshDir();
    liveOrch(dir, "holderaaa1");
    agent(dir, "operatora1");
    agent(dir, "targetaaa1");
    placeIn(dir, "targetaaa1", "wA");
    placeIn(dir, "operatora1", "wA");
    acquireLease(dir, "targetaaa1", "holderaaa1", 2);
    expect(() => governWrite(dir, "targetaaa1", {
      actor: "operatora1",
      actorSpace: "wA",
      actorIsOperator: true,
      text: "hi",
    })).not.toThrow();
    // Supremacy is control, not theft: the holder keeps its holding.
    expect(currentLease(dir, "targetaaa1")?.orchId).toBe("holderaaa1");
  });

  test("a foreign space's operator still hits the wall", () => {
    const dir = freshDir();
    liveOrch(dir, "holderaaa1");
    agent(dir, "operatora1");
    agent(dir, "targetbbb1");
    placeIn(dir, "targetbbb1", "wB");
    placeIn(dir, "operatora1", "wA");
    acquireLease(dir, "targetbbb1", "holderaaa1", 2);
    expect(() => governWrite(dir, "targetbbb1", {
      actor: "operatora1",
      actorSpace: "wA",
      actorIsOperator: true,
      text: "hi",
    })).toThrow(/space wall/);
  });

  // Governance is a DECISION, not a write. With ownership collapsed onto the
  // lease there is nothing left for it to mutate, so a refused enqueue can leave
  // no half-applied transfer behind.
  test("a refused enqueue leaves the lease exactly as it was", () => {
    const dir = freshDir();
    liveOrch(dir, "holderaaa1");
    agent(dir, "targetaaa1");
    acquireLease(dir, "targetaaa1", "holderaaa1", 2);
    const params = { actor: "holderaaa1", target: "targetaaa1", text: "hi" };
    orm(dir).run(sql.raw("CREATE TRIGGER reject_outbox BEFORE INSERT ON outbox BEGIN SELECT RAISE(ABORT, 'enqueue failed'); END"));

    expect(() => withTransaction(dir, () => {
      governWrite(dir, "targetaaa1", params);
      insertOutboxMessage(dir, { id: "failed", target: "targetaaa1", payload: { action: "dispatch", text: "hi" } });
    })).toThrow();
    expect(currentLease(dir, "targetaaa1")?.orchId).toBe("holderaaa1");
    expect(selectPendingOutbox(dir, 0)).toEqual([]);
  });

  test("a granted write and its enqueue commit together", () => {
    const dir = freshDir();
    liveOrch(dir, "holderaaa1");
    agent(dir, "targetaaa1");
    acquireLease(dir, "targetaaa1", "holderaaa1", 2);
    const params = { actor: "holderaaa1", target: "targetaaa1", text: "hi" };

    withTransaction(dir, () => {
      governWrite(dir, "targetaaa1", params);
      insertOutboxMessage(dir, { id: "accepted", target: "targetaaa1", payload: { action: "dispatch", text: "hi" } });
    });
    expect(selectPendingOutbox(dir, 0).map((message) => message.id)).toEqual(["accepted"]);
  });

  test("an unleased target is writable by any same-space actor", () => {
    const dir = freshDir();
    agent(dir, "actoraaaa1");
    agent(dir, "targetaaa1");
    placeIn(dir, "targetaaa1", "wA");
    placeIn(dir, "actoraaaa1", "wA");
    expect(() => governWrite(dir, "targetaaa1", { actor: "actoraaaa1", text: "hi" })).not.toThrow();
  });
});
