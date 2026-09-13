import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { deliverControl } from "../src/control/dispatch.ts";
import { attachBridge, detachBridge, type BridgeLink } from "../src/control/bridge-links.ts";
import type { BridgeDelivery } from "../src/control/bridge-message.ts";

import { seedStatus } from "./helpers/presence.ts";
import { seedAgent, seedLiveProcess } from "./helpers/agent.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { testServices } from "./helpers/services.ts";

const dirs: string[] = [];
const links: { readonly key: string; readonly link: BridgeLink }[] = [];
const previousDir = process.env.ORCH_DIR;

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-channel-first-"));
  dirs.push(dir);
  process.env.ORCH_DIR = dir;
  writeSettingsFixture(dir, { defaults: { adapter: "pi", backend: "headless" } });
  return dir;
}

function fakeLink(directory: string, key: string): BridgeDelivery[] {
  const deliveries: BridgeDelivery[] = [];
  const link: BridgeLink = { push: (delivery) => deliveries.push(delivery) };
  attachBridge(directory, key, link);
  links.push({ key, link });
  return deliveries;
}

afterEach(() => {
  for (const { key, link } of links.splice(0)) detachBridge(dirs[0]!, key, link);
  while (dirs.length) removeTempDir(dirs.pop()!);
  if (previousDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = previousDir;
});

// Delivery travels over the agent's attached link. A pane is only an optional
// environment shortcut, never the condition for a dispatch to reach an agent.
describe("work reaches an agent through its link", () => {
  test("a headless agent receives a dispatch through the link", async () => {
    const directory = tempDir();
    const target = "detached01";
    seedAgent(target, { adapter: "pi" }, directory);
    seedLiveProcess(directory, target);
    seedStatus(directory, target, { agent: "pi", state: "idle" });
    const deliveries = fakeLink(directory, target);

    const outcome = await deliverControl(directory, testServices({ orchDir: directory, settings: { defaults: { adapter: "pi", backend: "headless" } } }).settings.current(), target, { kind: "run", text: "do the work", id: "dispatch-1" });

    expect(outcome).toEqual({ outcome: "invoke", ack: "expected" });
    expect(deliveries).toEqual([{ id: "dispatch-1", message: { action: "dispatch", text: "do the work" } }]);
  });

  test("a capless adapter still gets the not-placed boundary answer", async () => {
    const directory = tempDir();
    const target = "detached02";
    seedAgent(target, { adapter: "claude" }, directory);
    seedLiveProcess(directory, target);
    seedStatus(directory, target, { agent: "claude", state: "idle" });

    const outcome = await deliverControl(directory, testServices({ orchDir: directory, settings: { defaults: { adapter: "pi", backend: "headless" } } }).settings.current(), target, { kind: "run", text: "do the work", id: "dispatch-2" });

    expect(outcome).toEqual({
      outcome: "answer",
      reason: "not-placed",
      text: `${target} is placed nowhere; run does not apply.`,
    });
  });
});
