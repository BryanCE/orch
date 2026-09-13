import { tempOrchDir as makeTempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";
import * as fs from "node:fs";
import { afterEach, describe, expect, test } from "bun:test";
import { deliverWrite } from "../src/daemon/orchd.ts";
import { orchDirAt } from "../src/services.ts";
import { attachBridge, detachBridge, type BridgeLink } from "../src/control/bridge-links.ts";
import type { BridgeDelivery } from "../src/control/bridge-message.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { presenceAgentDir, writeResult, writeStatus } from "../src/presence/writer.ts";
import { createCaptureRole } from "../src/presence/roles.ts";
import { insertOutboxMessage, markOutboxDelivered, outboxMessageState } from "../src/store/outbox-rows.ts";
import { deliverOutboxMessage } from "../src/daemon/outbox.ts";
import type { OutboxDeps } from "../src/types/daemon.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { seedStatus } from "./helpers/presence.ts";
import { seedAgent, seedLiveProcess } from "./helpers/agent.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { testServices } from "./helpers/services.ts";

const dirs: OrchDir[] = [];
const links: { readonly key: string; readonly link: BridgeLink }[] = [];
const saved = process.env.ORCH_DIR;

function outboxDeps(orchDir: OrchDir): OutboxDeps {
  const services = testServices({ orchDir, settings: {} });
  return {
    deliver: (target, payload, id) => deliverWrite({ services, directory: orchDir, workController: new AbortController(), server: undefined, workLoop: undefined, workLoopRunning: false, outboxDrain: undefined, presenceWatch: undefined, settingsWatch: undefined, lastActivityAt: 0, logger: undefined, fatalLogged: false }, target, payload, id),
    maxAttempts: 3,
    now: () => 0,
  };
}

function tempOrchDir(): OrchDir {
  const dir = makeTempOrchDir("orch-port-seam-");
  dirs.push(dir);
  process.env.ORCH_DIR = dir;
  return dir;
}

afterEach(() => {
  for (const { key, link } of links.splice(0)) detachBridge(orchDirAt(process.env.ORCH_DIR ?? "."), key, link);
  for (const dir of dirs.splice(0)) removeTempDir(dir);
  if (saved === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = saved;
});

describe("orch bridge links and capture roles", () => {
  test("headless delivery reaches the link and the ack settles its outbox row", async () => {
    const orchDir = tempOrchDir();
    const key = "workeragt1";
    seedAgent(key, { adapter: "pi" }, orchDir);
    seedLiveProcess(orchDir, key);
    seedStatus(orchDir, key, { key, agent: "pi", state: "working" });
    const deliveries: BridgeDelivery[] = [];
    const link: BridgeLink = { push: (delivery) => deliveries.push(delivery) };
    attachBridge(orchDir, key, link);
    links.push({ key, link });
    const id = "dispatch-1";
    insertOutboxMessage(orchDir, { id, target: key, payload: { action: "dispatch", text: "hello" } });

    await deliverOutboxMessage(orchDir, id, outboxDeps(orchDir));

    expect(deliveries).toEqual([{ id, message: { action: "dispatch", text: "hello" } }]);
    expect(outboxMessageState(orchDir, id)).toBe("awaiting");
    markOutboxDelivered(orchDir, id);
    expect(outboxMessageState(orchDir, id)).toBe("delivered");
  });

  test("live session delivery settles mail without a bridge or pane route", async () => {
    const orchDir = tempOrchDir();
    const key = "sessionagt1";
    writeSettingsFixture(orchDir);
    seedAgent(key, {}, orchDir);
    seedLiveProcess(orchDir, key);
    const id = "steer-session-1";
    insertOutboxMessage(orchDir, { id, target: key, payload: { action: "steer", text: "[from w (wkey)] hi" } });

    await deliverOutboxMessage(orchDir, id, outboxDeps(orchDir));

    expect(outboxMessageState(orchDir, id)).toBe("delivered");
  });

  test("a spawned agent whose bridge is detached stays queued for that bridge", async () => {
    const orchDir = tempOrchDir();
    const key = "spawnedagt1";
    writeSettingsFixture(orchDir);
    seedAgent("orch1", {}, orchDir);
    seedAgent(key, { spawnedBy: "orch1" }, orchDir);
    seedLiveProcess(orchDir, key);
    const id = "steer-spawned-1";
    insertOutboxMessage(orchDir, { id, target: key, payload: { action: "steer", text: "[from w (wkey)] hi" } });

    await deliverOutboxMessage(orchDir, id, outboxDeps(orchDir));

    expect(outboxMessageState(orchDir, id)).toBe("pending");
  });

  test("dead session without a bridge or pane route is undeliverable", async () => {
    const orchDir = tempOrchDir();
    const key = "sessionagt2";
    writeSettingsFixture(orchDir);
    seedAgent(key, {}, orchDir);
    const id = "steer-session-2";
    insertOutboxMessage(orchDir, { id, target: key, payload: { action: "steer", text: "[from w (wkey)] hi" } });

    await deliverOutboxMessage(orchDir, id, outboxDeps(orchDir));

    expect(outboxMessageState(orchDir, id)).toBe("undeliverable");
  });

  test("capture reads status and result from the orch presence record", () => {
    const orchDir = tempOrchDir();
    const key = "capturedg1";
    const agentDir = presenceAgentDir(key, orchDir);
    fs.mkdirSync(agentDir, { recursive: true });
    writeStatus(agentDir, { schema: PRESENCE_SCHEMA, key, agent: "codex", pid: process.pid, state: "done" });
    writeResult(agentDir, { schema: PRESENCE_SCHEMA, key, text: "captured result" });

    const captured = createCaptureRole(orchDir).read(key, { source: "all" });
    expect(captured.status).toMatchObject({ key, state: "done" });
    expect(captured.result).toEqual({ schema: PRESENCE_SCHEMA, key, text: "captured result" });
  });
});
