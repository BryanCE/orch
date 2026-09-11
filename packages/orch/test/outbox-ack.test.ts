import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BridgeDetachedError } from "../src/control/bridge-links.ts";
import { AgentGoneError } from "../src/control/agent-gone.ts";
import { drainOutbox, deliverOutboxMessage, redeliverOpenRows } from "../src/daemon/outbox.ts";
import { outbox } from "../src/db/schema.ts";
import { insertOutboxMessage, markOutboxDelivered, markOutboxUndeliverable, bumpOutboxAttempt, outboxMessageState, selectOpenOutboxForTarget, selectOutboxMessage } from "../src/store/outbox-rows.ts";
import { orm } from "../src/store/connection.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import type { BridgeMessage } from "../src/control/bridge-message.ts";
import { isLogRecord } from "../src/log.ts";
import type { OutboxDelivery, OutboxDeps } from "../src/types/daemon.ts";
import type { LogRecord } from "../src/types/core.ts";

const dirs: string[] = [];
const previousLogLevel = process.env.ORCH_LOG_LEVEL;

const message = (text: string): BridgeMessage => ({ action: "dispatch", text });

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-outbox-ack-"));
  dirs.push(dir);
  process.env.ORCH_LOG_LEVEL = "debug";
  return dir;
}

function deps(
  maxAttempts: number,
  deliver: (target: string, payload: unknown, id: string) => Promise<OutboxDelivery>,
): OutboxDeps {
  return { maxAttempts, now: () => 0, deliver };
}

afterEach(() => {
  if (previousLogLevel === undefined) delete process.env.ORCH_LOG_LEVEL;
  else process.env.ORCH_LOG_LEVEL = previousLogLevel;
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir !== undefined) removeTempDir(dir);
  }
});

describe("socket outbox acknowledgements", () => {
  test("an ack settles an awaiting row and later delivery skips it", async () => {
    const dir = fixture();
    const id = "acknowledged";
    insertOutboxMessage(dir, { id, target: "agent", payload: message("hello") });
    const calls: string[] = [];
    const deliveryDeps = deps(3, (_target, _payload, deliveryId) => {
      calls.push(deliveryId);
      return Promise.resolve<OutboxDelivery>("queued");
    });

    expect(await drainOutbox(dir, deliveryDeps)).toEqual({ retried: 0, awaiting: 1 });
    expect(outboxMessageState(dir, id)).toBe("awaiting");
    markOutboxDelivered(dir, id);
    expect(outboxMessageState(dir, id)).toBe("delivered");
    await deliverOutboxMessage(dir, id, deps(3, () => {
      calls.push("unexpected");
      return Promise.resolve<OutboxDelivery>("acked");
    }));

    expect(calls).toEqual([id]);
  });

  test("a detached bridge retries a pending row and logs the reason", async () => {
    const dir = fixture();
    const id = "detached";
    insertOutboxMessage(dir, { id, target: "agent", payload: message("hello") });
    const result = await drainOutbox(dir, deps(3, (target) =>
      Promise.reject(new BridgeDetachedError(target))));

    expect(result).toEqual({ retried: 1, awaiting: 0 });
    const row = selectOutboxMessage(dir, id);
    expect(row?.state).toBe("pending");
    expect(row?.attempts).toBe(1);
    const log = selectLog(dir, "retry.attempt");
    expect(log?.fields).toMatchObject({ reason: "bridge-detached" });
  });

  test("a gone agent settles its row as undeliverable on the first attempt", async () => {
    const dir = fixture();
    const id = "gone";
    insertOutboxMessage(dir, { id, target: "agent", payload: message("hello") });
    await drainOutbox(dir, deps(3, (target) =>
      Promise.reject(new AgentGoneError(target, "ended"))));

    expect(outboxMessageState(dir, id)).toBe("undeliverable");
    expect(selectOutboxMessage(dir, id)?.attempts).toBe(0);
  });

  test("failed delivery at the cap settles, while one attempt earlier retries", async () => {
    const dir = fixture();
    insertOutboxMessage(dir, { id: "at-cap", target: "agent", payload: message("cap") });
    insertOutboxMessage(dir, { id: "before-cap", target: "agent", payload: message("retry") });
    bumpOutboxAttempt(dir, "at-cap", 0);
    bumpOutboxAttempt(dir, "at-cap", 0);
    bumpOutboxAttempt(dir, "before-cap", 0);

    const result = await drainOutbox(dir, deps(3, () => Promise.resolve<OutboxDelivery>("failed")));

    expect(result).toEqual({ retried: 1, awaiting: 0 });
    expect(outboxMessageState(dir, "at-cap")).toBe("undeliverable");
    expect(outboxMessageState(dir, "before-cap")).toBe("pending");
    expect(selectOutboxMessage(dir, "before-cap")?.attempts).toBe(2);
    const log = selectLog(dir, "dispatch.undeliverable");
    expect(log?.fields).toMatchObject({ target: "agent", attempts: 3, reason: "attempts-exhausted" });
  });

  test("redelivery covers every open row for one target, regardless of nextAttemptAt", async () => {
    const dir = fixture();
    insertOutboxMessage(dir, { id: "old", target: "target", payload: message("old") });
    insertOutboxMessage(dir, { id: "new", target: "target", payload: message("new") });
    insertOutboxMessage(dir, { id: "other", target: "other", payload: message("other") });
    bumpOutboxAttempt(dir, "old", 999_999);
    bumpOutboxAttempt(dir, "new", 999_999);
    bumpOutboxAttempt(dir, "other", 999_999);
    const delivered: string[] = [];

    await redeliverOpenRows(dir, "target", deps(10, (_target, _payload, id) => {
      delivered.push(id);
      return Promise.resolve<OutboxDelivery>("failed");
    }));

    expect(delivered).toEqual(["old", "new"]);
    expect(selectOpenOutboxForTarget(dir, "target").map((row) => row.id)).toEqual(["old", "new"]);
    expect(delivered.every((id) => id === "old" || id === "new")).toBe(true);
    expect(selectOpenOutboxForTarget(dir, "other").map((row) => row.id)).toEqual(["other"]);
    expect(selectOutboxMessage(dir, "old")?.id).toBe("old");
  });

  test("open-row selection excludes settled rows", () => {
    const dir = fixture();
    insertOutboxMessage(dir, { id: "pending", target: "agent", payload: message("pending") });
    insertOutboxMessage(dir, { id: "delivered", target: "agent", payload: message("delivered") });
    insertOutboxMessage(dir, { id: "gone", target: "agent", payload: message("gone") });
    markOutboxDelivered(dir, "delivered");
    markOutboxUndeliverable(dir, "gone");

    expect(selectOpenOutboxForTarget(dir, "agent").map((row) => row.id)).toEqual(["pending"]);
  });

  test("malformed stored payloads are rejected", () => {
    const dir = fixture();
    insertOutboxMessage(dir, { id: "malformed", target: "agent", payload: message("hello") });
    orm(dir).update(outbox).set({ payload: JSON.stringify({ action: "unknown", text: "hello" }) }).run();

    expect(() => selectOutboxMessage(dir, "malformed")).toThrow("invalid outbox payload for malformed");
  });
});

function selectLog(dir: string, event: string): LogRecord | undefined {
  const contents = readFileSync(join(dir, "orchd.log"), "utf8").trim();
  if (contents.length === 0) return undefined;
  return contents.split("\n")
    .map((line) => {
      const value: unknown = JSON.parse(line);
      return isLogRecord(value) ? value : undefined;
    })
    .find((record) => record?.event === event);
}
