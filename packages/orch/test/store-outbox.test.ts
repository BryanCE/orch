import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores } from "../src/store/connection.ts";
import { bumpOutboxAttempt, deleteDeliveredBefore, insertOutboxMessage, markOutboxDelivered, outboxMessageUnsent, selectPendingOutbox } from "../src/store/outbox-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const tempDirs: string[] = [];

afterEach(() => {
  closeAllStores();
  while (tempDirs.length > 0) removeTempDir(tempDirs.pop()!);
});

function fixture(): string {
  const orchDir = mkdtempSync(join(tmpdir(), "orch-store-outbox-"));
  tempDirs.push(orchDir);
  return orchDir;
}

describe("outbox store rows", () => {
  test("inserts pending messages and orders them by creation time", () => {
    const orchDir = fixture();
    insertOutboxMessage(orchDir, { id: "later", target: "agent-b", payload: { n: 2 }, createdAt: Date.parse("2026-01-02T00:00:00.000Z") });
    insertOutboxMessage(orchDir, { id: "earlier", target: "agent-a", payload: [1, true], createdAt: Date.parse("2026-01-01T00:00:00.000Z") });

    expect(selectPendingOutbox(orchDir, 0)).toEqual([
      { id: "earlier", target: "agent-a", payload: [1, true], state: "pending", attempts: 0, createdAt: Date.parse("2026-01-01T00:00:00.000Z"), nextAttemptAt: 0 },
      { id: "later", target: "agent-b", payload: { n: 2 }, state: "pending", attempts: 0, createdAt: Date.parse("2026-01-02T00:00:00.000Z"), nextAttemptAt: 0 },
    ]);
  });

  test("reports one message's pending state", () => {
    const orchDir = fixture();
    insertOutboxMessage(orchDir, { id: "delivered", target: "agent-a", payload: "a" });
    insertOutboxMessage(orchDir, { id: "pending", target: "agent-b", payload: "b" });
    markOutboxDelivered(orchDir, "delivered");

    expect(outboxMessageUnsent(orchDir, "delivered")).toBe(false);
    expect(outboxMessageUnsent(orchDir, "pending")).toBe(true);
    expect(outboxMessageUnsent(orchDir, "missing")).toBe(false);
  });

  test("bumps attempts and hides a message until its next attempt time", () => {
    const orchDir = fixture();
    insertOutboxMessage(orchDir, { id: "retry", target: "agent-a", payload: {} });

    bumpOutboxAttempt(orchDir, "retry", 5000);

    expect(selectPendingOutbox(orchDir, 4999)).toEqual([]);
    const pending = selectPendingOutbox(orchDir, 5000)[0];
    expect(pending?.id).toBe("retry");
    expect(pending?.attempts).toBe(1);
    expect(pending?.nextAttemptAt).toBe(5000);
  });

  test("deletes delivered messages older than the cutoff", () => {
    const orchDir = fixture();
    insertOutboxMessage(orchDir, { id: "old", target: "agent-a", payload: {}, createdAt: Date.parse("2026-01-01T00:00:00.000Z") });
    insertOutboxMessage(orchDir, { id: "new", target: "agent-a", payload: {}, createdAt: Date.parse("2026-01-02T00:00:00.000Z") });
    markOutboxDelivered(orchDir, "old");
    markOutboxDelivered(orchDir, "new");

    expect(deleteDeliveredBefore(orchDir, Date.parse("2026-01-02T00:00:00.000Z"))).toBe(1);
    expect(outboxMessageUnsent(orchDir, "old")).toBe(false);
    expect(selectPendingOutbox(orchDir, 0)).toEqual([]);
  });
});
