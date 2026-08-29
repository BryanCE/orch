import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { insertAgent } from "../src/store/agent-rows.ts";
import { acquireLease, currentLease, expireLease, leasesByOrch } from "../src/store/lease-rows.ts";
import { agentView, liveAgentViews } from "../src/store/agent-view.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { sql } from "drizzle-orm";

/**
 * TASKS/02-scope.md D5 — "Nested spawn: a grandchild becomes unleased, never
 * falls to the grandparent."
 *
 * Provenance and ownership are two facts on two timelines (Rule 11). The
 * grandparent is in the grandchild's PROVENANCE chain, and that is exactly why
 * it must not inherit the lease: inheritance would make provenance grant
 * ownership, welding the two facts the model keeps apart. Unleased is the
 * correct resting state — a live orch adopts deliberately (D2/D3).
 */

const dirs: string[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });

function fixture(): string {
  const d = mkdtempSync(join(tmpdir(), "orch-nested-spawn-"));
  dirs.push(d);
  orm(d).run(sql`INSERT INTO harnesses(id,name) VALUES (${"pi"},${"Pi"})`);
  insertAgent(d, { id: "grandparent", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "grandparent", createdAt: 1 });
  insertAgent(d, { id: "mid", spawnedBy: "grandparent", harnessId: "pi", cwd: "/repo", name: "mid", createdAt: 2 });
  insertAgent(d, { id: "grand", spawnedBy: "mid", harnessId: "pi", cwd: "/repo", name: "grand", createdAt: 3 });
  return d;
}

describe("a grandchild becomes unleased, never falls to the grandparent (D5)", () => {
  test("the middle agent's death leaves the grandchild unleased, held by nobody", () => {
    const d = fixture();
    acquireLease(d, "grand", "mid", 10);
    orm(d).run(sql`INSERT INTO agent_endings (agent_id, ended_at, closed_by) VALUES (${"mid"},${20},${null})`);

    expireLease(d, "grand", 30);

    expect(currentLease(d, "grand")).toBeNull();
    // The grandparent is in the provenance chain and gains NOTHING from it.
    expect(leasesByOrch(d, "grandparent")).toEqual([]);
  });

  test("the grandchild stays alive and adoptable, and keeps its own provenance", () => {
    const d = fixture();
    acquireLease(d, "grand", "mid", 10);
    orm(d).run(sql`INSERT INTO agent_endings (agent_id, ended_at, closed_by) VALUES (${"mid"},${20},${null})`);
    expireLease(d, "grand", 30);

    const view = agentView(d, "grand");
    expect(view?.endedAt).toBeNull();
    expect(view?.heldBy).toBeNull();
    // Provenance is immutable: still spawned by `mid`, whose root is the
    // grandparent's pack. Being unleased changed neither fact.
    expect(view?.spawnedBy).toBe("mid");
    expect(view?.rootAgentId).toBe("grandparent");
    expect(liveAgentViews(d).map((v) => v.id)).toContain("grand");
  });

  test("the grandparent holding the middle agent does not extend to the grandchild", () => {
    const d = fixture();
    acquireLease(d, "mid", "grandparent", 5);
    acquireLease(d, "grand", "mid", 10);

    // Two leases, two agents. Holding `mid` is not holding what `mid` holds:
    // a lease covers one agent and never a subtree.
    expect(leasesByOrch(d, "grandparent").map((l) => l.agentId)).toEqual(["mid"]);
    expect(currentLease(d, "grand")?.orchId).toBe("mid");
  });
});
