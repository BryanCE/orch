import type { OrchDir } from "../src/types/core.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { closeAllStores } from "../src/store/connection.ts";
import { endAgent } from "../src/store/agent-rows.ts";
import { agentView } from "../src/store/agent-view.ts";
import { adoptLease } from "../src/store/lease-rows.ts";
import { registerHostedAgent } from "../src/store/spawn-registration.ts";
import { endDeadAgents, reapDeadAgentRecords } from "../src/presence/store.ts";
import { seedAgentRow, seedLiveProcess } from "./helpers/agent.ts";
import { testHost } from "./helpers/host.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

/**
 * An agent whose process is gone is ended once it owns nothing still running.
 *
 * Its rows can outlast it: `agents.spawned_by` and `agent_endings.closed_by` have no
 * cascade, and the row of an agent another host ran stays until a reap. So deleting rows
 * cannot be what says an orch is gone. The ending is. One that still owns a running agent
 * stays open, so the same session coming back finds its fleet.
 */

const dirs: OrchDir[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });

const NOW = 1_000;

function fixture(): OrchDir {
  const d = tempOrchDir("orch-dead-agents-end-");
  dirs.push(d);
  seedAgentRow(d, { id: "orch", kind: "session", createdAt: 1 });
  return d;
}

/** An agent `orch` asked another host to run: its row here is the reference. */
function seedFarAgent(d: OrchDir, key: string): void {
  registerHostedAgent(d, { key, harnessId: "pi", cwd: "/far/repo", name: key, model: "", spawner: "orch", host: testHost("far-host-id", "far"), now: 2 });
}

describe("a dead agent that owns nothing running is ended", () => {
  test("a dead orch pinned by the row of an agent that ended on another host is ended, and its rows stay", () => {
    const d = fixture();
    seedFarAgent(d, "far");
    endAgent(d, "far", 3, null);

    expect(endDeadAgents(d, NOW)).toEqual(["orch"]);
    expect(agentView(d, "orch")?.endedAt).toBe(NOW);
    // The far agent's row is that host's to follow, so it stays, and the orch's row with it.
    expect(reapDeadAgentRecords(d)).toEqual([]);
    expect(agentView(d, "orch")).not.toBeNull();
    // Ended once: a later pass has nothing left to end.
    expect(endDeadAgents(d, NOW + 1)).toEqual([]);
    expect(agentView(d, "orch")?.endedAt).toBe(NOW);
  });

  test("a dead orch pinned by the ending of an agent it closed is ended", () => {
    const d = fixture();
    seedAgentRow(d, { id: "closer", kind: "operator", createdAt: 2 });
    seedFarAgent(d, "far");
    endAgent(d, "far", 3, "closer");

    expect(endDeadAgents(d, NOW).sort()).toEqual(["closer", "orch"]);
    expect(agentView(d, "closer")?.endedAt).toBe(NOW);
  });

  test("a dead tree with nothing running ends whole in one pass", () => {
    const d = fixture();
    seedAgentRow(d, { id: "child", spawnedBy: "orch", createdAt: 2 });
    seedAgentRow(d, { id: "grand", spawnedBy: "child", createdAt: 3 });

    expect(endDeadAgents(d, NOW).sort()).toEqual(["child", "grand", "orch"]);
  });

  test("a dead orch with an agent still running under it stays open", () => {
    const d = fixture();
    seedAgentRow(d, { id: "child", spawnedBy: "orch", createdAt: 2 });
    seedAgentRow(d, { id: "grand", spawnedBy: "child", createdAt: 3 });
    seedLiveProcess(d, "grand");

    expect(endDeadAgents(d, NOW)).toEqual([]);
    expect(agentView(d, "orch")?.endedAt).toBeNull();
    expect(agentView(d, "child")?.endedAt).toBeNull();
    expect(agentView(d, "grand")?.endedAt).toBeNull();
  });

  test("a dead orch with an agent still running on another host stays open", () => {
    const d = fixture();
    seedFarAgent(d, "far");

    expect(endDeadAgents(d, NOW)).toEqual([]);
    expect(agentView(d, "orch")?.endedAt).toBeNull();
  });

  test("a dead orch that holds a running agent it adopted stays open", () => {
    const d = fixture();
    seedAgentRow(d, { id: "other", kind: "session", createdAt: 2 });
    seedAgentRow(d, { id: "worker", spawnedBy: "other", createdAt: 3 });
    seedLiveProcess(d, "other");
    seedLiveProcess(d, "worker");
    adoptLease(d, "worker", "orch", 4);

    expect(endDeadAgents(d, NOW)).toEqual([]);
    expect(agentView(d, "orch")?.endedAt).toBeNull();
  });

  test("a running agent is never ended", () => {
    const d = fixture();
    seedLiveProcess(d, "orch");

    expect(endDeadAgents(d, NOW)).toEqual([]);
    expect(agentView(d, "orch")?.endedAt).toBeNull();
  });
});
