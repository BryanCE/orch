import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores, openStore } from "../src/store/connection.ts";
import { insertAgent } from "../src/store/agent-rows.ts";
import { agentView } from "../src/store/agent-view.ts";
import { sweepExpiredRows } from "../src/daemon/retention.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import type { OrchConfig } from "../src/types/config.ts";

/**
 * TASKS/02-scope.md H3 — "Reap must walk the provenance tree — refusing to
 * delete an agent with descendants."
 *
 * `agents.spawned_by` deliberately has NO `ON DELETE CASCADE`: provenance is
 * immutable history, and a cascade would silently erase a whole subtree because
 * somebody reaped one row at the top. So the tree is walked and the reap is
 * refused while anything below it is still live.
 */

const dirs: string[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });

function fixture(): string {
  const d = mkdtempSync(join(tmpdir(), "orch-reap-provenance-"));
  dirs.push(d);
  openStore(d).query("INSERT INTO harnesses(id,name) VALUES (?,?)").run("pi", "Pi");
  insertAgent(d, { id: "orch", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "orch", createdAt: 1 });
  insertAgent(d, { id: "child", spawnedBy: "orch", harnessId: "pi", cwd: "/repo", name: "child", createdAt: 2 });
  insertAgent(d, { id: "grand", spawnedBy: "child", harnessId: "pi", cwd: "/repo", name: "grand", createdAt: 3 });
  return d;
}

function end(dir: string, id: string, at: number): void {
  openStore(dir).query("INSERT INTO agent_endings (agent_id, ended_at, closed_by) VALUES (?,?,?)").run(id, at, null);
}

/** Every window at zero so nothing survives the sweep by luck. */
function retention(): OrchConfig {
  return {
    retention: { ended_agents_days: 0, queue_days: 0, events_days: 0, runs_days: 0, outbox_days: 0, logs_days: 0 },
    queue: { max_retries: 1 },
  } as OrchConfig;
}

const FAR_FUTURE = new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000);

describe("reap walks the provenance tree (H3)", () => {
  test("an ended agent with a still-present descendant is NOT reaped", () => {
    const d = fixture();
    // Only the top of the chain ended. Its child and grandchild are still rows.
    end(d, "orch", 10);

    sweepExpiredRows(d, retention(), FAR_FUTURE);

    // Reaping it would orphan the subtree, so the sweep leaves it alone.
    expect(agentView(d, "orch")?.endedAt).toBe(10);
    expect(agentView(d, "child")).not.toBeNull();
  });

  test("the tree is reaped from the LEAF up, one sweep per level", () => {
    const d = fixture();
    end(d, "orch", 10);
    end(d, "child", 11);
    end(d, "grand", 12);

    // The leaf has no descendants, so it goes first.
    sweepExpiredRows(d, retention(), FAR_FUTURE);
    expect(agentView(d, "grand")).toBeNull();
    expect(agentView(d, "child")).not.toBeNull();

    // With the leaf gone, its parent now has none either.
    sweepExpiredRows(d, retention(), FAR_FUTURE);
    expect(agentView(d, "child")).toBeNull();

    sweepExpiredRows(d, retention(), FAR_FUTURE);
    expect(agentView(d, "orch")).toBeNull();
  });

  test("a LIVE descendant blocks the reap even when the parent ended long ago", () => {
    const d = fixture();
    end(d, "orch", 10);
    end(d, "child", 11);
    // `grand` never ended — it is still working.

    sweepExpiredRows(d, retention(), FAR_FUTURE);
    sweepExpiredRows(d, retention(), FAR_FUTURE);

    // Nothing in the chain may go while the leaf is alive: deleting `child`
    // would erase the grandchild's provenance while the grandchild still runs.
    expect(agentView(d, "grand")?.endedAt).toBeNull();
    expect(agentView(d, "child")).not.toBeNull();
    expect(agentView(d, "orch")).not.toBeNull();
  });

  test("provenance has no ON DELETE CASCADE, so no reap can erase a subtree", () => {
    const d = fixture();
    // A cascade would make this delete take `child` and `grand` with it. It must
    // fail on the foreign key instead — the tree is walked, never collapsed.
    expect(() => openStore(d).query("DELETE FROM agents WHERE id = 'orch'").run()).toThrow();
    expect(agentView(d, "child")).not.toBeNull();
    expect(agentView(d, "grand")).not.toBeNull();
  });
});
