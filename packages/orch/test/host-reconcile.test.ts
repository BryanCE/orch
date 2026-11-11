import { afterEach, describe, expect, test } from "bun:test";
import { reconcileHostAgents } from "../src/daemon/server/host-events.ts";
import { agentView } from "../src/store/agent-view.ts";
import { ensureHost } from "../src/store/agent-rows.ts";
import { selectAgentStatus } from "../src/store/status-rows.ts";
import { registerHostedAgent } from "../src/store/spawn-registration.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { mintAgentId } from "../src/shared/agent-id.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { DaemonState } from "../src/daemon/server/state.ts";
import type { LinkedHost } from "../src/types/process.ts";
import { idleDaemonState } from "./helpers/daemon-state.ts";
import { testHost } from "./helpers/host.ts";
import { testDaemonServices } from "./helpers/services.ts";
import { statusRowFixture } from "./helpers/status-row.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

/**
 * As a host's link comes up without a place to resume from, this orchd reads what that host's
 * orchd holds now of the agents it was asked to run, and brings its own references level.
 * Events only carry what the far orchd still keeps; its rows are the state itself.
 */

const FAR = testHost("far-host-id", "far");
const BOX: LinkedHost = { id: FAR.id, name: "box" };
const dirs: OrchDir[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });

/** This orchd, holding the reference of one agent it asked the far host to run. */
function fixture(): { state: DaemonState; key: string } {
  const orchDir = tempOrchDir("orch-host-reconcile-");
  dirs.push(orchDir);
  const state = idleDaemonState(testDaemonServices({ orchDir, settings: {} }), orchDir);
  const key = mintAgentId();
  ensureHost(orchDir, FAR, 1);
  registerHostedAgent(orchDir, { key, harnessId: "pi", cwd: "/far/repo", name: "far-worker", model: "", spawner: null, host: FAR, now: 1 });
  return { state, key };
}

describe("reloading the state of this host's agents on a linked host", () => {
  test("an agent the far orchd no longer holds ends here, saying which host let go of it", () => {
    const { state, key } = fixture();
    reconcileHostAgents(state, BOX, [], 100);

    expect(agentView(state.directory, key)?.endedAt).not.toBeNull();
    expect(selectAgentStatus(state.directory, key)).toMatchObject({ state: "exited", lastError: "box no longer holds this agent" });
  });

  test("an agent the far orchd holds as ended ends here, with why it ended there", () => {
    const { state, key } = fixture();
    reconcileHostAgents(state, BOX, [statusRowFixture({ key, agentId: key, state: "exited", exited: true, alive: false, endReason: "its harness crashed" })], 100);

    expect(agentView(state.directory, key)?.endedAt).not.toBeNull();
    expect(selectAgentStatus(state.directory, key)).toMatchObject({ state: "exited", lastError: "its harness crashed" });
  });

  test("a running agent takes the state the far orchd holds now, with what a monitor prints for it", () => {
    const { state, key } = fixture();
    reconcileHostAgents(state, BOX, [statusRowFixture({ key, agentId: key, state: "done", exited: false, alive: true, task: "fix the settings", lastText: "done: settings.json, verify clean", dispatchId: "d1" })], 100);

    expect(agentView(state.directory, key)?.endedAt).toBeNull();
    expect(selectAgentStatus(state.directory, key)).toMatchObject({ state: "done", task: "fix the settings", lastText: "done: settings.json, verify clean", dispatchId: "d1" });
  });

  test("an agent this host asked for after the state was read is left alone: it is not in it", () => {
    const { state, key } = fixture();
    // The reference was made at 1; the far orchd's rows were asked for before that.
    reconcileHostAgents(state, BOX, [], 1);

    expect(agentView(state.directory, key)?.endedAt).toBeNull();
    expect(selectAgentStatus(state.directory, key)).toBeUndefined();
  });

  test("an agent on another host is not this host's to answer for", () => {
    const { state, key } = fixture();
    reconcileHostAgents(state, { id: testHost("third-host-id").id, name: "third" }, [], 100);

    expect(agentView(state.directory, key)?.endedAt).toBeNull();
  });
});
