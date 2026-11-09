import { afterEach, expect, test } from "bun:test";
import { applyHostEvent } from "../src/daemon/server/host-events.ts";
import { registerSpawnedAgent } from "../src/store/spawn-registration.ts";
import { bindHostName } from "../src/store/host-rows.ts";
import { presenceEntry } from "../src/presence/store.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import { idleDaemonState } from "./helpers/daemon-state.ts";
import { testServices } from "./helpers/services.ts";
import { testHost } from "./helpers/host.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { NotifyEvent } from "../src/types/notify.ts";
import type { RpcServer } from "../src/types/daemon.ts";

/** A server that only records what orchd publishes on it. */
function recordingServer(published: NotifyEvent[]): RpcServer {
  return {
    close: () => Promise.resolve(),
    emit: (event) => { published.push(event); },
    subscriberCount: () => 0,
    attachedBridgeCount: () => 0,
    peerCount: () => 0,
    transport: "unix",
    socketPath: "",
    portFile: "",
  };
}

const FAR = testHost("far-host-id", "far-machine");
const dirs: OrchDir[] = [];
afterEach(() => {
  closeAllStores();
  while (dirs.length) removeTempDir(dirs.pop()!);
});

test("an event from a linked host lands on this host's row for the agent and is published naming the host", () => {
  const orchDir = tempOrchDir("orch-host-events-");
  dirs.push(orchDir);
  bindHostName(orchDir, "far", FAR, Date.now());
  const key = mintAgentId();
  registerSpawnedAgent(orchDir, {
    key, harnessId: "pi", backendId: "headless", placed: false, cwd: "/home/far", name: "far-agent", model: "m",
    spawner: null, process: { pid: 424242, startToken: "t" }, host: FAR,
  });
  const state = idleDaemonState(testServices({ orchDir }), orchDir);
  const published: NotifyEvent[] = [];
  state.server = recordingServer(published);

  applyHostEvent(state, { id: FAR.id, name: "far" }, {
    type: "transition", key, ts: new Date().toISOString(), agent: "far-agent", tab: null, model: null, oldState: "idle", newState: "working",
  });

  expect(presenceEntry(orchDir, key)?.status?.state).toBe("working");
  expect(published.map((event) => [event.key, event.host, event.newState])).toEqual([[key, "far", "working"]]);
});
