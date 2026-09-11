import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { deliverWrite } from "../src/daemon/orchd.ts";
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
import { seedAgent } from "./helpers/agent.ts";

const dirs: string[] = [];
const links: { readonly key: string; readonly link: BridgeLink }[] = [];
const saved = process.env.ORCH_DIR;

function tempOrchDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-port-seam-"));
  dirs.push(dir);
  process.env.ORCH_DIR = dir;
  return dir;
}

afterEach(() => {
  for (const { key, link } of links.splice(0)) detachBridge(key, link);
  for (const dir of dirs.splice(0)) removeTempDir(dir);
  if (saved === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = saved;
});

describe("orch bridge links and capture roles", () => {
  test("headless delivery reaches the link and the ack settles its outbox row", async () => {
    const orchDir = tempOrchDir();
    const key = "workeragt1";
    seedAgent(key, { adapter: "pi" }, orchDir);
    seedStatus(orchDir, key, { key, agent: "pi", state: "working" });
    const deliveries: BridgeDelivery[] = [];
    const link: BridgeLink = { push: (delivery) => deliveries.push(delivery) };
    attachBridge(key, link);
    links.push({ key, link });
    const id = "dispatch-1";
    insertOutboxMessage(orchDir, { id, target: key, payload: { action: "dispatch", text: "hello" } });

    const deps: OutboxDeps = { deliver: deliverWrite, maxAttempts: 3, now: () => 0 };
    await deliverOutboxMessage(orchDir, id, deps);

    expect(deliveries).toEqual([{ id, message: { action: "dispatch", text: "hello" } }]);
    expect(outboxMessageState(orchDir, id)).toBe("awaiting");
    markOutboxDelivered(orchDir, id);
    expect(outboxMessageState(orchDir, id)).toBe("delivered");
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
