import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { drainOutbox } from "../src/daemon/outbox.ts";
import { insertOutboxMessage, selectPendingOutbox } from "../src/store/sqlite.ts";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) removeTempDir(tempDirs.pop()!);
});

function fixture(): string {
  const orchDir = mkdtempSync(join(tmpdir(), "orch-outbox-replay-"));
  tempDirs.push(orchDir);
  return orchDir;
}

describe("outbox restart replay", () => {
  test("replays failed messages after restart without duplicates", async () => {
    const orchDir = fixture();
    insertOutboxMessage(orchDir, {
      id: "one",
      target: "message:one",
      payload: { messageId: "one", text: "first" },
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    insertOutboxMessage(orchDir, {
      id: "two",
      target: "message:two",
      payload: { messageId: "two", text: "second" },
      createdAt: "2026-01-01T00:00:01.000Z",
    });

    let now = 1_000;
    const calls: string[] = [];
    const deliveredIds: string[] = [];
    const crashedDaemon = {
      deliver: (target: string) => {
        calls.push(target);
        return Promise.resolve(false);
      },
      now: () => now,
    };

    expect(await drainOutbox(orchDir, crashedDaemon)).toEqual({ delivered: 0, retried: 2 });
    expect(selectPendingOutbox(orchDir, now)).toHaveLength(0);

    // A restarted daemon scans the same persisted SQLite outbox after backoff.
    now = 2_001;
    const restartedDaemon = {
      deliver: (target: string) => {
        calls.push(target);
        deliveredIds.push(target);
        return Promise.resolve(true);
      },
      now: () => now,
    };
    expect(await drainOutbox(orchDir, restartedDaemon)).toEqual({ delivered: 2, retried: 0 });
    expect(deliveredIds).toEqual(["message:one", "message:two"]);

    expect(await drainOutbox(orchDir, restartedDaemon)).toEqual({ delivered: 0, retried: 0 });
    expect(selectPendingOutbox(orchDir, now)).toEqual([]);
    expect(new Set(deliveredIds).size).toBe(deliveredIds.length);
    expect(calls).toEqual(["message:one", "message:two", "message:one", "message:two"]);
  });
});
