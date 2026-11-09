import { afterEach, expect, test } from "bun:test";
import { applyHostEvent } from "../src/daemon/server/host-events.ts";
import { registerHostedAgent } from "../src/store/spawn-registration.ts";
import { bindHostName } from "../src/store/host-rows.ts";
import { presenceEntry } from "../src/presence/store.ts";
import { agentView } from "../src/store/agent-view.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import { idleDaemonState } from "./helpers/daemon-state.ts";
import { testServices } from "./helpers/services.ts";
import { testHost } from "./helpers/host.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { DaemonState } from "../src/daemon/server/state.ts";
import type { NotifyEvent } from "../src/types/notify.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { RpcServer } from "../src/types/daemon.ts";

/** A server that only records what orchd publishes on it. */
function recordingServer(published: NotifyEvent[]): RpcServer {
  return {
    close: () => Promise.resolve(),
    emit: (event) => { published.push(event); },
    subscriberCount: () => 0,
    attachedBridgeCount: () => 0,
    transport: "unix",
    socketPath: "",
    portFile: "",
  };
}

const FAR = testHost("far-host-id", "far-machine");
const FAR_LINK = { id: FAR.id, name: "far" };
const dirs: OrchDir[] = [];
afterEach(() => {
  closeAllStores();
  while (dirs.length) removeTempDir(dirs.pop()!);
});

/** An orchd that asked the far host to run one agent, and what it publishes. */
function followingFarAgent(): { state: DaemonState; orchDir: OrchDir; key: string; published: NotifyEvent[] } {
  const orchDir = tempOrchDir("orch-host-events-");
  dirs.push(orchDir);
  bindHostName(orchDir, "far", FAR, Date.now());
  const key = mintAgentId();
  registerHostedAgent(orchDir, { key, harnessId: "pi", cwd: "/home/far", name: "far-agent", model: "m", spawner: null, host: FAR });
  const state = idleDaemonState(testServices({ orchDir }), orchDir);
  const published: NotifyEvent[] = [];
  state.server = recordingServer(published);
  return { state, orchDir, key, published };
}

function transition(key: string, newState: "working" | "exited"): NotifyEvent {
  return { type: "transition", key, ts: new Date().toISOString(), agent: "far-agent", tab: null, model: null, oldState: "idle", newState };
}

test("an event from a linked host lands on this host's row for the agent and is published naming the host", () => {
  const { state, orchDir, key, published } = followingFarAgent();
  applyHostEvent(state, FAR_LINK, transition(key, "working"));
  expect(presenceEntry(orchDir, key)?.status?.state).toBe("working");
  expect(agentView(orchDir, key)?.endedAt).toBeNull();
  expect(published.map((event) => [event.key, event.host, event.newState])).toEqual([[key, "far", "working"]]);
});

test("a far closed event ends the agent here", () => {
  const { state, orchDir, key } = followingFarAgent();
  const closed: NotifyEvent = { type: "closed", key, ts: new Date().toISOString(), agent: "far-agent", tab: null, model: null, oldState: "working", newState: "closed" };
  applyHostEvent(state, FAR_LINK, closed);
  const endedAt = agentView(orchDir, key)?.endedAt;
  expect(endedAt).not.toBeNull();
  expect(presenceEntry(orchDir, key)?.liveness).toBe("dead");
  // A replayed ending changes nothing.
  expect(() => { applyHostEvent(state, FAR_LINK, closed); }).not.toThrow();
  expect(agentView(orchDir, key)?.endedAt).toBe(endedAt);
});

test("a far agent whose process exited ends here", () => {
  const { state, orchDir, key } = followingFarAgent();
  applyHostEvent(state, FAR_LINK, transition(key, "exited"));
  expect(agentView(orchDir, key)?.endedAt).not.toBeNull();
});

test("an event about an agent from a host that does not run it changes nothing here", () => {
  const { state, orchDir, key } = followingFarAgent();
  applyHostEvent(state, { id: testHost("other-host-id").id, name: "other" }, transition(key, "exited"));
  expect(agentView(orchDir, key)?.endedAt).toBeNull();
  expect(presenceEntry(orchDir, key)?.status).toBeNull();
});
