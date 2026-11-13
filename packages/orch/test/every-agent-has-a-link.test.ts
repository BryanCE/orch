import { placeHere } from "../src/process-place.ts";
import { afterEach, describe, expect, test } from "bun:test";

import { attachLink, detachLink, type AgentLink } from "../src/control/agent-links.ts";
import type { BridgeDelivery } from "../src/shared/bridge-message.ts";
import { deliverControl } from "../src/control/dispatch.ts";
import { mintAgentId } from "../src/shared/agent-id.ts";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { seedAgent, seedLiveProcess } from "./helpers/agent.ts";
import { seedStatus } from "./helpers/presence.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { testDaemonServices } from "./helpers/services.ts";
import type { OrchDir } from "../src/types/core.ts";

const dirs: OrchDir[] = [];
const links: { readonly key: string; readonly link: AgentLink }[] = [];
const saved = process.env.ORCH_DIR;

function storeDir(): OrchDir {
  const directory = tempOrchDir("orch-agent-link-");
  dirs.push(directory);
  process.env.ORCH_DIR = directory;
  orm(directory);
  return directory;
}

function agent(directory: OrchDir, facts: Parameters<typeof seedAgent>[1] = {}): { key: string; deliveries: BridgeDelivery[] } {
  const key = mintAgentId();
  seedAgent(key, { adapter: "pi", ...facts }, directory);
  seedLiveProcess(directory, key);
  seedStatus(directory, key, { key, agent: "pi", pid: process.pid, state: "idle" });
  const deliveries: BridgeDelivery[] = [];
  const link: AgentLink = { takes: ["dispatch", "steer", "answer", "model"], abort: null, reset: null, push: (delivery) => deliveries.push(delivery), close: () => undefined };
  attachLink(directory, key, link);
  links.push({ key, link });
  return { key, deliveries };
}

afterEach(() => {
  for (const { key, link } of links.splice(0)) detachLink(dirs[0]!, key, link);
  closeAllStores();
  if (saved === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = saved;
  while (dirs.length) removeTempDir(dirs.pop()!);
});

/** Every agent is addressed by its link. Environment handles only add a shortcut. */
describe("every agent has an attached link", () => {
  test("agents in placed, headless, and handleless environments receive the same push", async () => {
    const directory = storeDir();
    const placed = agent(directory, { backend: "tmux", handle: "%5" });
    const headless = agent(directory, { backend: "headless" });
    const handleless = agent(directory);

    for (const target of [placed, headless, handleless]) {
      await deliverControl(directory, testDaemonServices({ orchDir: directory, settings: { defaults: { adapter: "pi", backend: "headless" } } }).settings.current(), testDaemonServices({ orchDir: directory }).models, placeHere(directory, target.key), { kind: "run", text: "go", id: `dispatch-${target.key}` });
      expect(target.deliveries).toEqual([{
        id: `dispatch-${target.key}`,
        message: { action: "dispatch", text: "go" },
      }]);
    }
  });

  test("an agent with no handle is still addressable through its link", async () => {
    const directory = storeDir();
    const target = agent(directory);

    expect((await deliverControl(directory, testDaemonServices({ orchDir: directory, settings: { defaults: { adapter: "pi", backend: "headless" } } }).settings.current(), testDaemonServices({ orchDir: directory }).models, placeHere(directory, target.key), { kind: "steer", text: "adjust", id: "steer-1" }))).toEqual({
      outcome: "invoke",
      ack: "expected",
    });
    expect(target.deliveries).toEqual([{
      id: "steer-1",
      message: { action: "steer", text: "adjust" },
    }]);
  });
});
