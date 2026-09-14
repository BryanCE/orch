import type { OrchDir } from "../src/types/core.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { insertAgent } from "../src/store/agent-rows.ts";
import { agentView } from "../src/store/agent-view.ts";
import { reapDeadAgentRecords } from "../src/presence/store.ts";
import { seedLiveProcess } from "./helpers/agent.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { sql } from "drizzle-orm";

/**
 * Reap must walk the provenance tree, refusing to delete an agent with
 * descendants.
 *
 * `agents.spawned_by` deliberately has NO `ON DELETE CASCADE`: provenance is
 * immutable history, and a cascade would silently erase a whole subtree because
 * somebody reaped one row at the top. So the tree is walked and the reap is
 * refused while anything below it is still live. The daemon runs this on its
 * liveness tick; an agent is dead once its process is gone.
 */

const dirs: OrchDir[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });

function fixture(): OrchDir {
  const d = tempOrchDir("orch-reap-provenance-");
  dirs.push(d);
  orm(d).run(sql`INSERT INTO harnesses(id,name) VALUES (${"pi"},${"Pi"})`);
  insertAgent(d, { id: "orch", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "orch", createdAt: 1 });
  insertAgent(d, { id: "child", spawnedBy: "orch", harnessId: "pi", cwd: "/repo", name: "child", createdAt: 2 });
  insertAgent(d, { id: "grand", spawnedBy: "child", harnessId: "pi", cwd: "/repo", name: "grand", createdAt: 3 });
  return d;
}

describe("reap walks the provenance tree (H3)", () => {
  test("a dead agent with a live descendant is NOT reaped", () => {
    const d = fixture();
    // Only the middle of the chain runs. Its parent is dead, and so is its child.
    seedLiveProcess(d, "child");

    expect(reapDeadAgentRecords(d)).toEqual(["grand"]);

    // Reaping the root would orphan the live child, so the sweep leaves it alone.
    expect(agentView(d, "orch")).not.toBeNull();
    expect(agentView(d, "child")).not.toBeNull();
  });

  test("the tree is reaped from the LEAF up", () => {
    const d = fixture();

    // Nothing runs. The leaf has no descendants, so it goes first, then its
    // parent has none either, and the root goes last.
    expect(reapDeadAgentRecords(d)).toEqual(["grand", "child", "orch"]);
    expect(agentView(d, "grand")).toBeNull();
    expect(agentView(d, "child")).toBeNull();
    expect(agentView(d, "orch")).toBeNull();
  });

  test("a LIVE descendant blocks the reap of every ancestor", () => {
    const d = fixture();
    // `grand` is still working; its parent and grandparent are gone.
    seedLiveProcess(d, "grand");

    expect(reapDeadAgentRecords(d)).toEqual([]);
    expect(reapDeadAgentRecords(d)).toEqual([]);

    // Nothing in the chain may go while the leaf is alive: deleting `child`
    // would erase the grandchild's provenance while the grandchild still runs.
    expect(agentView(d, "grand")).not.toBeNull();
    expect(agentView(d, "child")).not.toBeNull();
    expect(agentView(d, "orch")).not.toBeNull();
  });

  test("provenance has no ON DELETE CASCADE, so no reap can erase a subtree", () => {
    const d = fixture();
    // A cascade would make this delete take `child` and `grand` with it. It must
    // fail on the foreign key instead — the tree is walked, never collapsed.
    expect(() => orm(d).run(sql`DELETE FROM agents WHERE id = 'orch'`)).toThrow();
    expect(agentView(d, "child")).not.toBeNull();
    expect(agentView(d, "grand")).not.toBeNull();
  });
});
