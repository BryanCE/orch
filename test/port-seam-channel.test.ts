import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { appendAck, drainInbox } from "../src/presence/inbox.ts";
import { presenceAgentDir, writeResult, writeStatus } from "../src/presence/writer.ts";
import { createAgentChannelRole, createCaptureRole } from "../src/presence/roles.ts";
import { insertOutboxMessage, outboxMessagePending } from "../src/store/outbox-rows.ts";
import { consumeOutboxAcks } from "../src/daemon/outbox.ts";
import { closeAllStores } from "../src/store/connection.ts";

const dirs: string[] = [];
function tempOrchDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-port-seam-"));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  // Windows keeps the store file locked while a connection is open, so the temp
  // dir is only removable once every cached connection has been closed.
  closeAllStores();
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("orch channel and capture roles", () => {
  test("headless delivery reaches the inbox and is acknowledged without a screen", () => {
    const orchDir = tempOrchDir();
    const key = "headless~temp~worker";
    const agentDir = presenceAgentDir(key, orchDir);
    fs.mkdirSync(agentDir, { recursive: true });
    writeStatus(agentDir, { schema: PRESENCE_SCHEMA, key, agent: "pi", pid: process.pid, state: "working" });
    const id = "dispatch-1";
    insertOutboxMessage(orchDir, { id, target: key, payload: { action: "dispatch", text: "hello" } });

    const receipt = createAgentChannelRole(orchDir).deliver(key, { id, text: "hello" });
    expect(receipt).toMatchObject({ id, accepted: true });
    const inbox = drainInbox(agentDir);
    expect(JSON.parse(inbox[0]!)).toMatchObject({ id, text: "hello" });
    expect(inbox[1]).toBe("");

    // This is the bridge side of inbox -> bridge -> ack. No pane or plexer is involved.
    appendAck(agentDir, id, key);
    expect(consumeOutboxAcks(orchDir)).toBe(1);
    expect(outboxMessagePending(orchDir, id)).toBe(false);
  });

  test("capture reads status and result from the orch presence record", () => {
    const orchDir = tempOrchDir();
    const key = "headless~temp~captured";
    const agentDir = presenceAgentDir(key, orchDir);
    fs.mkdirSync(agentDir, { recursive: true });
    writeStatus(agentDir, { schema: PRESENCE_SCHEMA, key, agent: "codex", pid: process.pid, state: "done" });
    writeResult(agentDir, { schema: PRESENCE_SCHEMA, key, text: "captured result" });

    const captured = createCaptureRole(orchDir).read(key, { source: "all" });
    expect(captured.status).toMatchObject({ key, state: "done" });
    expect(captured.result).toEqual({ schema: PRESENCE_SCHEMA, key, text: "captured result" });
  });
});
