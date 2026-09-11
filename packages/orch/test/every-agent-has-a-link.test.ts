import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { attachBridge, detachBridge, type BridgeLink } from "../src/control/bridge-links.ts";
import type { BridgeDelivery } from "../src/control/bridge-message.ts";
import { deliverControl } from "../src/control/dispatch.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { seedAgent } from "./helpers/agent.ts";
import { seedStatus } from "./helpers/presence.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const dirs: string[] = [];
const links: { readonly key: string; readonly link: BridgeLink }[] = [];
const saved = process.env.ORCH_DIR;

function storeDir(): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-agent-link-"));
  dirs.push(directory);
  process.env.ORCH_DIR = directory;
  orm(directory);
  return directory;
}

function agent(directory: string, facts: Parameters<typeof seedAgent>[1] = {}): { key: string; deliveries: BridgeDelivery[] } {
  const key = mintAgentId();
  seedAgent(key, { adapter: "pi", ...facts }, directory);
  seedStatus(directory, key, { key, agent: "pi", pid: process.pid, state: "idle" });
  const deliveries: BridgeDelivery[] = [];
  const link: BridgeLink = { push: (delivery) => deliveries.push(delivery) };
  attachBridge(key, link);
  links.push({ key, link });
  return { key, deliveries };
}

afterEach(() => {
  for (const { key, link } of links.splice(0)) detachBridge(key, link);
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
      await deliverControl(target.key, { kind: "run", text: "go", id: `dispatch-${target.key}` });
      expect(target.deliveries).toEqual([{
        id: `dispatch-${target.key}`,
        message: { action: "dispatch", text: "go" },
      }]);
    }
  });

  test("an agent with no handle is still addressable through its link", async () => {
    const directory = storeDir();
    const target = agent(directory);

    expect((await deliverControl(target.key, { kind: "steer", text: "adjust", id: "steer-1" }))).toEqual({
      outcome: "invoke",
      ack: "expected",
    });
    expect(target.deliveries).toEqual([{
      id: "steer-1",
      message: { action: "steer", text: "adjust" },
    }]);
  });
});
