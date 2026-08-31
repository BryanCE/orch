import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { appendAck } from "../src/presence/inbox.ts";
import { ensurePresenceAgentDir } from "../src/presence/writer.ts";
import { drainOutbox } from "../src/daemon/outbox.ts";
import { insertOutboxMessage, outboxMessageOpen, outboxMessageUnsent, selectPendingOutbox } from "../src/store/outbox-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import type { OutboxDelivery } from "../src/types/daemon.ts";

const dirs: string[] = [];

afterEach(() => {
  while (dirs.length > 0) removeTempDir(dirs.pop()!);
});

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-outbox-ack-"));
  dirs.push(dir);
  return dir;
}

describe("outbox ack fallback", () => {
  test("consumes a fake agent ack from ack.jsonl on the next drain", async () => {
    const orchDir = fixture();
    const key = "agent-acking";
    const id = "message-acking";
    insertOutboxMessage(orchDir, { id, target: key, payload: { text: "hello" } });
    let now = 0;
    const deliveries: string[] = [];
    const deps = {
      now: () => now,
      deliver: (target: string) => {
        deliveries.push(target);
        return Promise.resolve<OutboxDelivery>("failed");
      },
    };

    // The initial append is not acknowledged by the delivery boolean. The fake
    // agent consumes the inbox and writes the transport-neutral marker instead.
    expect(await drainOutbox(orchDir, deps)).toEqual({ delivered: 0, retried: 1, awaiting: 0 });
    const presence = ensurePresenceAgentDir(key, orchDir);
    expect(presence).toBeDefined();
    appendAck(presence!, id, key);

    now = 501;
    expect(await drainOutbox(orchDir, deps)).toEqual({ delivered: 1, retried: 0, awaiting: 0 });
    expect(deliveries).toEqual([key]);
    expect(outboxMessageOpen(orchDir, id)).toBe(false);
    expect(selectPendingOutbox(orchDir, now)).toEqual([]);
  });

  test("keeps an unacknowledged delivery pending for retry", async () => {
    const orchDir = fixture();
    const id = "message-unacked";
    insertOutboxMessage(orchDir, { id, target: "agent-not-acking", payload: { text: "hello" } });
    let now = 0;
    const deps = { now: () => now, deliver: () => Promise.resolve<OutboxDelivery>("failed") };

    expect(await drainOutbox(orchDir, deps)).toEqual({ delivered: 0, retried: 1, awaiting: 0 });
    now = 501;
    expect(await drainOutbox(orchDir, deps)).toEqual({ delivered: 0, retried: 1, awaiting: 0 });
    expect(outboxMessageOpen(orchDir, id)).toBe(true);
  });

  // ack.jsonl is agent-append / daemon-consume: the
  // daemon reads it to mark the matching outbox row delivered EXACTLY ONCE.
  // A duplicate marker is the realistic failure — an agent that retried its post,
  // or a crash between the append and the drain — and counting it twice would
  // report deliveries that never happened.
  test("a duplicated ack marker is counted once, not twice", async () => {
    const orchDir = fixture();
    const key = "agent-double-ack";
    const id = "message-double-ack";
    insertOutboxMessage(orchDir, { id, target: key, payload: { text: "hello" } });
    let now = 0;
    const deps = { now: () => now, deliver: () => Promise.resolve<OutboxDelivery>("failed") };

    expect(await drainOutbox(orchDir, deps)).toEqual({ delivered: 0, retried: 1, awaiting: 0 });
    const presence = ensurePresenceAgentDir(key, orchDir);
    expect(presence).toBeDefined();
    appendAck(presence!, id, key);
    appendAck(presence!, id, key);

    now = 501;
    expect(await drainOutbox(orchDir, deps)).toEqual({ delivered: 1, retried: 0, awaiting: 0 });
    expect(outboxMessageOpen(orchDir, id)).toBe(false);
  });

  // An ack naming another agent's key must not settle this agent's row: the key
  // is what binds a marker to its delivery, and honouring a mismatched one would
  // let any agent close out any dispatch.
  test("an ack whose key does not match the agent dir is ignored", async () => {
    const orchDir = fixture();
    const key = "agent-owner";
    const id = "message-owned";
    insertOutboxMessage(orchDir, { id, target: key, payload: { text: "hello" } });
    let now = 0;
    const deps = { now: () => now, deliver: () => Promise.resolve<OutboxDelivery>("failed") };

    expect(await drainOutbox(orchDir, deps)).toEqual({ delivered: 0, retried: 1, awaiting: 0 });
    const presence = ensurePresenceAgentDir(key, orchDir);
    expect(presence).toBeDefined();
    appendAck(presence!, id, "some-other-agent");

    now = 501;
    expect(await drainOutbox(orchDir, deps)).toEqual({ delivered: 0, retried: 1, awaiting: 0 });
    expect(outboxMessageOpen(orchDir, id)).toBe(true);
  });


  // L7's whole point: writing the inbox line is a HANDOFF TO THE CHANNEL, not a
  // read by the agent. Settling the row on the write makes `outboxMessagePending`
  // false before the ack can ever arrive, which is what made the ack reader dead
  // code in the daemon. Only the agent's own marker settles an inbox delivery.
  test("an inbox write is queued, not delivered: only the agent's ack settles the row", async () => {
    const orchDir = fixture();
    const key = "agent-queued";
    const id = "message-queued";
    insertOutboxMessage(orchDir, { id, target: key, payload: { text: "hello" } });
    let now = 0;
    const deps = { now: () => now, deliver: () => Promise.resolve<OutboxDelivery>("queued") };

    expect(await drainOutbox(orchDir, deps)).toEqual({ delivered: 0, retried: 0, awaiting: 1 });
    expect(outboxMessageOpen(orchDir, id)).toBe(true);

    const presence = ensurePresenceAgentDir(key, orchDir);
    expect(presence).toBeDefined();
    appendAck(presence!, id, key);

    now = 501;
    expect(await drainOutbox(orchDir, deps)).toEqual({ delivered: 1, retried: 0, awaiting: 0 });
    expect(outboxMessageOpen(orchDir, id)).toBe(false);
  });

  // The other half of the same rule. A pane keystroke and a boundary answer have
  // no reader that will ever append a marker, so waiting for one would retry a
  // delivered message forever. That channel settles on the write, and says so.
  test("a channel that can never ack settles the row on the write itself", async () => {
    const orchDir = fixture();
    const id = "message-terminal";
    insertOutboxMessage(orchDir, { id, target: "agent-keystrokes", payload: { text: "hello" } });
    const deps = { now: () => 0, deliver: () => Promise.resolve<OutboxDelivery>("acked") };

    expect(await drainOutbox(orchDir, deps)).toEqual({ delivered: 1, retried: 0, awaiting: 0 });
    expect(outboxMessageOpen(orchDir, id)).toBe(false);
  });


  // The RPC fails a write that was never handed to a channel, and only that.
  // Before this split, "still pending" meant both "no channel took it" and
  // "the agent has not read it yet", so every inbox dispatch came back to the
  // caller as `write <id> was not applied or acknowledged`.
  test("a queued write is handed off, so it is open but no longer unsent", async () => {
    const orchDir = fixture();
    const id = "message-open";
    insertOutboxMessage(orchDir, { id, target: "agent-open", payload: { text: "hello" } });
    const deps = { now: () => 0, deliver: () => Promise.resolve<OutboxDelivery>("queued") };

    expect(outboxMessageUnsent(orchDir, id)).toBe(true);
    await drainOutbox(orchDir, deps);
    expect(outboxMessageUnsent(orchDir, id)).toBe(false);
    expect(outboxMessageOpen(orchDir, id)).toBe(true);
  });

  test("a write no channel would take stays unsent", async () => {
    const orchDir = fixture();
    const id = "message-unsent";
    insertOutboxMessage(orchDir, { id, target: "agent-unsent", payload: { text: "hello" } });
    const deps = { now: () => 0, deliver: () => Promise.resolve<OutboxDelivery>("failed") };

    await drainOutbox(orchDir, deps);
    expect(outboxMessageUnsent(orchDir, id)).toBe(true);
  });

});
