import type { OrchDir } from "../src/types/core.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { insertAgent } from "../src/store/agent-rows.ts";
import { acquireLease } from "../src/store/lease-rows.ts";
import { callerAuthority, refuseClose } from "../src/policy/close-authority.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { sql } from "drizzle-orm";

/** A human may end anything. An agent may end what it owns: itself, what it spawned, what it adopted. */

const dirs: OrchDir[] = [];
afterEach(() => {
  closeAllStores();
  while (dirs.length) removeTempDir(dirs.pop()!);
});

function fixture(): OrchDir {
  // Authority is passed explicitly; this fixture models a human/agent caller.
  const d = tempOrchDir("orch-close-authority-");
  dirs.push(d);
  orm(d).run(sql`INSERT INTO harnesses(id,name) VALUES (${"pi"},${"Pi"})`);
  insertAgent(d, { id: "orchA", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "orchA", createdAt: 1 });
  insertAgent(d, { id: "slaveA", spawnedBy: "orchA", harnessId: "pi", cwd: "/repo", name: "slaveA", createdAt: 2 });
  insertAgent(d, { id: "grandA", spawnedBy: "slaveA", harnessId: "pi", cwd: "/repo", name: "grandA", createdAt: 3 });
  insertAgent(d, { id: "orchB", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "orchB", createdAt: 4 });
  insertAgent(d, { id: "slaveB", spawnedBy: "orchB", harnessId: "pi", cwd: "/repo", name: "slaveB", createdAt: 5 });
  return d;
}

describe("who may end an agent (D7)", () => {
  test("the human may close anything", () => {
    const d = fixture();
    const human = callerAuthority(null);
    expect(human).toEqual({ kind: "human" });
    for (const id of ["orchA", "slaveA", "grandA", "orchB", "slaveB"]) {
      expect(refuseClose(d, human, id)).toBeNull();
    }
  });

  test("an orch may close the slaves it owns, at any depth", () => {
    const d = fixture();
    const orchA = callerAuthority({ id: "orchA" });
    expect(refuseClose(d, orchA, "slaveA")).toBeNull();
    // A grandchild is still inside orchA's provenance subtree.
    expect(refuseClose(d, orchA, "grandA")).toBeNull();
  });

  test("an agent may NOT close another orch's slaves, and is told whose it is", () => {
    const d = fixture();
    const refusal = refuseClose(d, callerAuthority({ id: "orchA" }), "slaveB");
    expect(refusal).toContain("cannot close slaveB");
    expect(refusal).toContain("orchB");
  });

  test("an agent may not close a peer orch either", () => {
    const d = fixture();
    expect(refuseClose(d, callerAuthority({ id: "orchA" }), "orchB")).toContain("not yours to close");
  });

  test("an agent may always close itself — acting on yourself is not driving a fleet", () => {
    const d = fixture();
    expect(refuseClose(d, callerAuthority({ id: "slaveA" }), "slaveA")).toBeNull();
  });

  test("adopting grants the right to end, and the spawner keeps it", () => {
    const d = fixture();
    acquireLease(d, "slaveA", "orchB", 10);
    expect(refuseClose(d, callerAuthority({ id: "orchB" }), "slaveA")).toBeNull();
    expect(refuseClose(d, callerAuthority({ id: "orchA" }), "slaveA")).toBeNull();
  });

  test("a provenance cycle terminates instead of hanging", () => {
    const d = fixture();
    orm(d).run(sql`UPDATE agents SET spawned_by='grandA' WHERE id='orchA'`);
    expect(() => refuseClose(d, callerAuthority({ id: "orchB" }), "grandA")).not.toThrow();
  });
});
