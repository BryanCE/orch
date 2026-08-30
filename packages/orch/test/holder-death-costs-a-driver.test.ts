import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { insertAgent } from "../src/store/agent-rows.ts";
import { acquireLease, currentLease, leaseHistory, leasesByOrch } from "../src/store/lease-rows.ts";
import { agentView, liveAgentViews } from "../src/store/agent-view.ts";
import { detachAgent } from "../src/commands/lease.ts";
import { insertAttempt, enqueueTask, settleAttempt, taskState } from "../src/store/task-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { sql } from "drizzle-orm";

/**
 * TASKS/02-scope.md D2 — "Holder death costs a **driver**, not a life: finish
 * the task, receive no new work, lease closes `expired`."
 *
 * The three clauses of TASKS/01-agent-model.md:384. A dead holder is not a
 * collision (Rule 11), so clearing its lease is never refused — every driving
 * verb is gated on that same lease, and refusing to clear it would strand the
 * agent permanently. What the death must NOT do is end the agent or lose the
 * work already in flight.
 */

const dirs: string[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });

function fixture(): string {
  const d = mkdtempSync(join(tmpdir(), "orch-holder-death-"));
  dirs.push(d);
  const db = orm(d);
  db.run(sql`INSERT INTO harnesses(id,name) VALUES (${"pi"},${"Pi"})`);
  db.run(sql`INSERT INTO hosts(id,name,os,created_at) VALUES (${"h"},${"h"},${"linux"},${1})`);
  insertAgent(d, { id: "orch", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "orch", createdAt: 1 });
  insertAgent(d, { id: "worker", spawnedBy: "orch", harnessId: "pi", cwd: "/repo", name: "worker", createdAt: 2 });
  return d;
}

/** A holder with no live process behind it — the death this row is about. */
function killHolder(dir: string): void {
  orm(dir).run(sql`INSERT INTO agent_endings (agent_id, ended_at, closed_by) VALUES (${"orch"},${20},${null})`);
}

describe("holder death costs a driver, not a life (D2)", () => {
  test("the task in flight finishes and its result survives the holder", () => {
    const d = fixture();
    acquireLease(d, "worker", "orch", 5);
    enqueueTask(d, { id: "t1", text: "in flight", opts: {}, enqueuedBy: "orch", scopePackId: "orch", createdAt: 6 });
    insertAttempt(d, "t1", "worker", "d1", 7);

    killHolder(d);

    // Clause 1: it finishes what it is doing, and the result is kept. Nothing
    // about the holder's death reaches into the attempt.
    settleAttempt(d, "t1", 7, 30, "done", { result: { ok: true } });
    expect(taskState(d, "t1")).toBe("done");
  });

  test("the lease closes `expired` — not `released`, because no caller held it", () => {
    const d = fixture();
    acquireLease(d, "worker", "orch", 5);
    killHolder(d);

    // Clause 3. `detachAgent` by a different orch is the path that clears a dead
    // holder's lease; a dead holder is not a collision, so it is never refused.
    detachAgent(d, "worker", "adopter", { now: 40 });

    expect(currentLease(d, "worker")).toBeNull();
    const closed = leaseHistory(d, "worker").at(-1);
    expect(closed?.releaseReason).toBe("expired");
    expect(closed?.until).toBe(40);
  });

  test("the agent stays alive, unleased and adoptable — nothing closes it", () => {
    const d = fixture();
    acquireLease(d, "worker", "orch", 5);
    killHolder(d);
    detachAgent(d, "worker", "adopter", { now: 40 });

    // Clauses 4 and 5. Losing a driver is not an ending, and no sweep may make
    // it one: the agent is still live, still listed, and now unheld.
    const view = agentView(d, "worker");
    expect(view?.endedAt).toBeNull();
    expect(view?.heldBy).toBeNull();
    expect(liveAgentViews(d).map((v) => v.id)).toContain("worker");
  });

  test("it receives no new work: the death hands the agent to nobody", () => {
    const d = fixture();
    insertAgent(d, { id: "grandparent", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "grandparent", createdAt: 0 });
    acquireLease(d, "worker", "orch", 5);
    killHolder(d);
    detachAgent(d, "worker", "adopter", { now: 40 });

    // Clause 2. Work reaches an agent through a driver, and there is now no
    // driver: no lease is minted for anyone, least of all the spawner's own
    // spawner. Adoption is a later, deliberate act by a live orch (D5).
    expect(currentLease(d, "worker")).toBeNull();
    expect(leaseHistory(d, "worker").filter((lease) => lease.until === null)).toEqual([]);
    expect(leasesByOrch(d, "grandparent")).toEqual([]);
    expect(leasesByOrch(d, "adopter")).toEqual([]);
  });

  test("expiry is recorded once and does not erase who held it", () => {
    const d = fixture();
    acquireLease(d, "worker", "orch", 5);
    killHolder(d);
    detachAgent(d, "worker", "adopter", { now: 40 });

    // History is the record of ownership over time. Expiring a lease closes the
    // row; it never deletes it, or the fleet loses who was driving and when.
    const history = leaseHistory(d, "worker");
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ orchId: "orch", since: 5, until: 40, releaseReason: "expired" });
  });

  test("clearing a dead holder's lease is never refused, and is idempotent", () => {
    const d = fixture();
    acquireLease(d, "worker", "orch", 5);
    killHolder(d);

    expect(detachAgent(d, "worker", "adopter", { now: 40 }).released).toBe(true);
    // Already unleased: a friendly no-op, never an error. An agent must never be
    // strandable by asking twice.
    expect(detachAgent(d, "worker", "adopter", { now: 41 }).released).toBe(false);
    expect(leaseHistory(d, "worker")).toHaveLength(1);
  });
});
