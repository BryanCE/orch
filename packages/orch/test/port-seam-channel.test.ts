import { tempOrchDir as makeTempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { deliverWrite } from "../src/daemon/server/handlers/write.ts";
import { orchDirAt } from "../src/services.ts";
import { attachBridge, detachBridge, type BridgeLink } from "../src/control/bridge-links.ts";
import type { BridgeDelivery } from "../src/control/bridge-message.ts";
import { createCaptureRole } from "../src/presence/roles.ts";
import { recordAgentStatus } from "../src/presence/store.ts";
import { upsertRun } from "../src/store/run-rows.ts";
import { insertOutboxMessage, markOutboxDelivered, outboxMessageState } from "../src/store/outbox-rows.ts";
import { deliverOutboxMessage } from "../src/daemon/server/outbox.ts";
import type { OutboxDeps } from "../src/types/daemon.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { seedStatus } from "./helpers/presence.ts";
import { placeAgent, seedAgent, seedLiveProcess } from "./helpers/agent.ts";
import { FakePanedBackend, fakePane, withRegisteredBackend } from "./helpers/backend.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { testServices } from "./helpers/services.ts";
import { idleDaemonState } from "./helpers/daemon-state.ts";

const dirs: OrchDir[] = [];
const links: { readonly key: string; readonly link: BridgeLink }[] = [];
const saved = process.env.ORCH_DIR;

function outboxDeps(orchDir: OrchDir, settings: Record<string, unknown> = {}): OutboxDeps {
  const services = testServices({ orchDir, settings });
  return {
    deliver: (target, payload, id) => deliverWrite(idleDaemonState(services, orchDir), target, payload, id),
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

  /** root0 spawned orch1, orch1 spawned w1. Both orch1 and w1 are live, spawned, bridge
   *  detached, so a prompt landing queues for the bridge and an events landing settles. */
  function seedMailPack(orchDir: OrchDir): void {
    writeSettingsFixture(orchDir);
    seedAgent("root0", {}, orchDir);
    seedAgent("orch1", { spawnedBy: "root0" }, orchDir);
    seedAgent("w1", { spawnedBy: "orch1" }, orchDir);
    seedLiveProcess(orchDir, "orch1");
    seedLiveProcess(orchDir, "w1");
  }

  test("worker mail to its spawner under mail.to_spawner prompt waits for the spawner's bridge", async () => {
    const orchDir = tempOrchDir();
    seedMailPack(orchDir);
    const id = "mail-up-prompt";
    insertOutboxMessage(orchDir, { id, target: "orch1", payload: { action: "mail", from: "w1", text: "[from w1] done" } });

    await deliverOutboxMessage(orchDir, id, outboxDeps(orchDir, { mail: { to_spawner: "prompt", to_worker: "events" } }));

    expect(outboxMessageState(orchDir, id)).toBe("pending");
  });

  test("worker mail to its spawner under mail.to_spawner events settles on the spawner's stream", async () => {
    const orchDir = tempOrchDir();
    seedMailPack(orchDir);
    const id = "mail-up-events";
    insertOutboxMessage(orchDir, { id, target: "orch1", payload: { action: "mail", from: "w1", text: "[from w1] done" } });

    await deliverOutboxMessage(orchDir, id, outboxDeps(orchDir, { mail: { to_spawner: "events", to_worker: "prompt" } }));

    expect(outboxMessageState(orchDir, id)).toBe("delivered");
  });

  test("worker mail to a spawner whose pane the human is in settles on the stream under prompt-unless-focused", async () => {
    const orchDir = tempOrchDir();
    seedMailPack(orchDir);
    placeAgent("orch1", { backend: "headless", handle: "pane-orch1" }, orchDir);
    const backend = new FakePanedBackend({ panes: [fakePane("pane-orch1", { focused: true })] });
    const id = "mail-up-focused";
    insertOutboxMessage(orchDir, { id, target: "orch1", payload: { action: "mail", from: "w1", text: "[from w1] done" } });

    await withRegisteredBackend(backend, () => deliverOutboxMessage(orchDir, id, outboxDeps(orchDir, { mail: { to_spawner: "prompt-unless-focused", to_worker: "events" } })));

    expect(outboxMessageState(orchDir, id)).toBe("delivered");
  });

  test("worker mail to a spawner whose pane the human is in still waits for the bridge under prompt", async () => {
    const orchDir = tempOrchDir();
    seedMailPack(orchDir);
    placeAgent("orch1", { backend: "headless", handle: "pane-orch1" }, orchDir);
    const backend = new FakePanedBackend({ panes: [fakePane("pane-orch1", { focused: true })] });
    const id = "mail-up-focused-prompt";
    insertOutboxMessage(orchDir, { id, target: "orch1", payload: { action: "mail", from: "w1", text: "[from w1] done" } });

    await withRegisteredBackend(backend, () => deliverOutboxMessage(orchDir, id, outboxDeps(orchDir, { mail: { to_spawner: "prompt", to_worker: "events" } })));

    expect(outboxMessageState(orchDir, id)).toBe("pending");
  });

  test("worker mail to a spawner whose pane is unfocused waits for the bridge under prompt-unless-focused", async () => {
    const orchDir = tempOrchDir();
    seedMailPack(orchDir);
    placeAgent("orch1", { backend: "headless", handle: "pane-orch1" }, orchDir);
    const backend = new FakePanedBackend({ panes: [fakePane("pane-orch1", { focused: false })] });
    const id = "mail-up-unfocused";
    insertOutboxMessage(orchDir, { id, target: "orch1", payload: { action: "mail", from: "w1", text: "[from w1] done" } });

    await withRegisteredBackend(backend, () => deliverOutboxMessage(orchDir, id, outboxDeps(orchDir, { mail: { to_spawner: "prompt-unless-focused", to_worker: "events" } })));

    expect(outboxMessageState(orchDir, id)).toBe("pending");
  });

  test("spawner mail to its worker follows mail.to_worker, not mail.to_spawner", async () => {
    const orchDir = tempOrchDir();
    seedMailPack(orchDir);
    const id = "mail-down-prompt";
    insertOutboxMessage(orchDir, { id, target: "w1", payload: { action: "mail", from: "orch1", text: "[from orch1] look again" } });

    await deliverOutboxMessage(orchDir, id, outboxDeps(orchDir, { mail: { to_spawner: "events", to_worker: "prompt" } }));

    expect(outboxMessageState(orchDir, id)).toBe("pending");
  });

  test("spawner mail to its worker under mail.to_worker events settles on the worker's stream", async () => {
    const orchDir = tempOrchDir();
    seedMailPack(orchDir);
    const id = "mail-down-events";
    insertOutboxMessage(orchDir, { id, target: "w1", payload: { action: "mail", from: "orch1", text: "[from orch1] look again" } });

    await deliverOutboxMessage(orchDir, id, outboxDeps(orchDir, { mail: { to_spawner: "prompt", to_worker: "events" } }));

    expect(outboxMessageState(orchDir, id)).toBe("delivered");
  });

  test("events mail to a dead recipient is undeliverable", async () => {
    const orchDir = tempOrchDir();
    writeSettingsFixture(orchDir);
    seedAgent("orch1", {}, orchDir);
    seedAgent("w1", { spawnedBy: "orch1" }, orchDir);
    const id = "mail-up-dead";
    insertOutboxMessage(orchDir, { id, target: "orch1", payload: { action: "mail", from: "w1", text: "[from w1] done" } });

    await deliverOutboxMessage(orchDir, id, outboxDeps(orchDir, { mail: { to_spawner: "events", to_worker: "events" } }));

    expect(outboxMessageState(orchDir, id)).toBe("undeliverable");
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

  test("capture reads status and result from the store", () => {
    const orchDir = tempOrchDir();
    const key = "capturedg1";
    seedAgent(key, { adapter: "codex" }, orchDir);
    recordAgentStatus(orchDir, key, { state: "done" }, Date.now());
    upsertRun(orchDir, { dispatchId: "run-1", agentKey: key, state: "done", startedAt: Date.now(), result: "captured result" });

    const captured = createCaptureRole(orchDir).read(key, { source: "all" });
    expect(captured.status).toMatchObject({ agentId: key, state: "done" });
    expect(captured.result).toBe("captured result");
  });
});
