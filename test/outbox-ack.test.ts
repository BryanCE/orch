import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { appendAck } from "../src/presence/inbox.ts";
import { ensurePresenceAgentDir } from "../src/presence/writer.ts";
import { drainOutbox } from "../src/daemon/outbox.ts";
import { insertOutboxMessage, outboxMessagePending, selectPendingOutbox } from "../src/store/outbox-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

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
        return Promise.resolve(false);
      },
    };

    // The initial append is not acknowledged by the delivery boolean. The fake
    // agent consumes the inbox and writes the transport-neutral marker instead.
    expect(await drainOutbox(orchDir, deps)).toEqual({ delivered: 0, retried: 1 });
    const presence = ensurePresenceAgentDir(key, orchDir);
    expect(presence).toBeDefined();
    appendAck(presence!, id, key);

    now = 501;
    expect(await drainOutbox(orchDir, deps)).toEqual({ delivered: 1, retried: 0 });
    expect(deliveries).toEqual([key]);
    expect(outboxMessagePending(orchDir, id)).toBe(false);
    expect(selectPendingOutbox(orchDir, now)).toEqual([]);
  });

  test("keeps an unacknowledged delivery pending for retry", async () => {
    const orchDir = fixture();
    const id = "message-unacked";
    insertOutboxMessage(orchDir, { id, target: "agent-not-acking", payload: { text: "hello" } });
    let now = 0;
    const deps = { now: () => now, deliver: () => Promise.resolve(false) };

    expect(await drainOutbox(orchDir, deps)).toEqual({ delivered: 0, retried: 1 });
    now = 501;
    expect(await drainOutbox(orchDir, deps)).toEqual({ delivered: 0, retried: 1 });
    expect(outboxMessagePending(orchDir, id)).toBe(true);
  });
});
