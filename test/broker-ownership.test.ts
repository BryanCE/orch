import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkWall } from "../src/policy/space.ts";
import { orm } from "../src/store/connection.ts";
import { ensureHarness, insertAgent } from "../src/store/agent-rows.ts";
import { setSpace } from "../src/store/interval-rows.ts";
import { adoptLease, acquireLease, currentLease, leaseHistory } from "../src/store/lease-rows.ts";
import { agentView } from "../src/store/agent-view.ts";
import { sql } from "drizzle-orm";

const tempDirs: string[] = [];

function makeOrchDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-broker-ownership-"));
  tempDirs.push(dir);
  ensureHarness(dir, "pi", "pi", 1);
  return dir;
}

function agent(dir: string, id: string): void {
  insertAgent(dir, { id, name: id, spawnedBy: null, harnessId: "pi", cwd: dir, createdAt: 1 });
}

function placeIn(dir: string, id: string, space: string): void {
  orm(dir).run(sql`INSERT OR IGNORE INTO spaces (id, name, created_at) VALUES (${space}, ${space}, ${1})`);
  setSpace(dir, id, 1, space);
}

afterEach(() => {
  while (tempDirs.length > 0) removeTempDir(tempDirs.pop()!);
});

describe("broker ownership and space governance", () => {
  // A1: ownership is a LEASE and there is no second id space beside it. The one
  // place the holder is read back is the composer, and adopting moves it there
  // without touching identity or provenance.
  test("the composed holder is the only ownership record, and adoption moves it", () => {
    const orchDir = makeOrchDir();
    agent(orchDir, "orchaaaaa1");
    agent(orchDir, "orchbbbbb1");
    agent(orchDir, "workeraaa1");

    expect(agentView(orchDir, "workeraaa1")?.heldBy).toBeNull();
    acquireLease(orchDir, "workeraaa1", "orchaaaaa1", 2);
    expect(agentView(orchDir, "workeraaa1")?.heldBy).toEqual({ orchId: "orchaaaaa1", since: 2 });

    adoptLease(orchDir, "workeraaa1", "orchbbbbb1", 3);
    expect(agentView(orchDir, "workeraaa1")?.heldBy).toEqual({ orchId: "orchbbbbb1", since: 3 });
    expect(currentLease(orchDir, "workeraaa1")?.orchId).toBe("orchbbbbb1");
    // A holding that ended is history, never a second live owner.
    expect(leaseHistory(orchDir, "workeraaa1").map((lease) => [lease.orchId, lease.releaseReason]))
      .toEqual([["orchaaaaa1", "adopted"], ["orchbbbbb1", null]]);
    // Identity and provenance did not move with the holding.
    expect(agentView(orchDir, "workeraaa1")?.spawnedBy).toBeNull();
  });

  // The wall reads each agent's space through the composer. An agent with no
  // space row is unplaced, and an unplaced agent is eligible by policy.
  test("refuses cross-space writes unless explicitly overridden", () => {
    const orchDir = makeOrchDir();
    for (const id of ["spaceaone1", "spaceathr1", "spacebtwo1", "unplacedd1"]) agent(orchDir, id);
    placeIn(orchDir, "spaceaone1", "w1");
    placeIn(orchDir, "spaceathr1", "w1");
    placeIn(orchDir, "spacebtwo1", "w2");
    expect(checkWall(orchDir, "spaceaone1", "spaceathr1", { crossSpace: false })).toEqual({ allowed: true });

    const refused = checkWall(orchDir, "spaceaone1", "spacebtwo1", { crossSpace: false });
    expect(refused.allowed).toBe(false);
    expect(refused.reason).toContain("w1");
    expect(refused.reason).toContain("w2");

    expect(checkWall(orchDir, "spaceaone1", "spacebtwo1", { crossSpace: true })).toEqual({ allowed: true });
    expect(checkWall(orchDir, "spaceaone1", "unplacedd1", { crossSpace: false })).toEqual({ allowed: true });
  });

  // Environment is mutable and identity is not: moving an agent to another space
  // changes which side of the wall it is on, and nothing else about it.
  test("moving an agent between spaces moves the wall, not its identity", () => {
    const orchDir = makeOrchDir();
    agent(orchDir, "spaceaone1");
    agent(orchDir, "moveraaaa1");
    placeIn(orchDir, "spaceaone1", "w1");
    placeIn(orchDir, "moveraaaa1", "w2");
    expect(checkWall(orchDir, "spaceaone1", "moveraaaa1", { crossSpace: false }).allowed).toBe(false);

    setSpace(orchDir, "moveraaaa1", 5, "w1");
    expect(checkWall(orchDir, "spaceaone1", "moveraaaa1", { crossSpace: false })).toEqual({ allowed: true });
    expect(agentView(orchDir, "moveraaaa1")?.id).toBe("moveraaaa1");
    expect(agentView(orchDir, "moveraaaa1")?.environment.space).toBe("w1");
  });
});
