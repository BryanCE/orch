import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  insertOutboxMessage,
  selectPendingOutbox,
} from "../src/store/sqlite.ts";
import { drainOutbox } from "../src/daemon/outbox.ts";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

function fixture(): string {
  const orchDir = mkdtempSync(join(tmpdir(), "orch-outbox-"));
  tempDirs.push(orchDir);
  return orchDir;
}

describe("outbox delivery", () => {
  test("selects pending messages and delivers each message once", async () => {
    const orchDir = fixture();
    insertOutboxMessage(orchDir, { id: "one", target: "agent:one", payload: { text: "a" }, createdAt: "2026-01-01T00:00:00.000Z" });
    insertOutboxMessage(orchDir, { id: "two", target: "agent:two", payload: { text: "b" }, createdAt: "2026-01-01T00:00:01.000Z" });
    expect(selectPendingOutbox(orchDir, 0).map((message) => message.id)).toEqual(["one", "two"]);

    const delivered: string[] = [];
    const deps = { deliver: (target: string) => { delivered.push(target); return Promise.resolve(true); }, now: () => 0 };
    expect(await drainOutbox(orchDir, deps)).toEqual({ delivered: 2, retried: 0 });
    expect(await drainOutbox(orchDir, deps)).toEqual({ delivered: 0, retried: 0 });
    expect(delivered).toEqual(["agent:one", "agent:two"]);
  });

  test("keeps failed messages pending until their backoff expires", async () => {
    const orchDir = fixture();
    insertOutboxMessage(orchDir, { id: "retry", target: "agent:retry", payload: "payload", createdAt: "2026-01-01T00:00:00.000Z" });
    let now = 1_000;
    const deps = { deliver: () => Promise.resolve(false), now: () => now };

    expect(await drainOutbox(orchDir, deps)).toEqual({ delivered: 0, retried: 1 });
    const pending = selectPendingOutbox(orchDir, now);
    expect(pending).toHaveLength(0);
    const afterFailure = selectPendingOutbox(orchDir, 1_501)[0];
    expect(afterFailure?.attempts).toBe(1);
    expect(afterFailure?.nextAttemptAt).toBe(1_500);
    now = 1_501;
    expect(await drainOutbox(orchDir, deps)).toEqual({ delivered: 0, retried: 1 });
  });
});
