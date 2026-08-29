import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLogger, isLogRecord } from "../src/log.ts";
import { LOG_LEVELS } from "../src/types/core.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import type { LogRecord } from "../src/types/core.ts";

const dirs: string[] = [];
function temp(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-log-"));
  dirs.push(dir);
  return dir;
}
afterEach(() => { for (const dir of dirs.splice(0)) removeTempDir(dir); });

function linesOf(file: string): LogRecord[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split("\n").filter((line) => line.length > 0)
    .map((line): unknown => JSON.parse(line))
    .filter(isLogRecord);
}

describe("the one log record shape", () => {
  test("writes one JSONL record per call, with an epoch-millis instant", () => {
    const dir = temp();
    const file = join(dir, "orchd.log");
    const log = createLogger({ file, level: "info" });
    log.info("daemon.started", { pid: 42 });

    const records = linesOf(file);
    expect(records).toHaveLength(1);
    expect(records[0]!.event).toBe("daemon.started");
    expect(records[0]!.level).toBe("info");
    // Rule 11: instants are INTEGER epoch millis, never TEXT.
    expect(typeof records[0]!.at).toBe("number");
    expect(records[0]!.fields).toEqual({ pid: 42 });
  });

  test("a record below the configured level is not written at all", () => {
    const dir = temp();
    const file = join(dir, "orchd.log");
    const log = createLogger({ file, level: "warn" });
    log.debug("lease.checked", { holder: "a" });
    log.info("dispatch.accepted", {});
    log.warn("bridge.reconnecting", {});
    log.error("dispatch.failed", {});

    expect(linesOf(file).map((r) => r.event)).toEqual(["bridge.reconnecting", "dispatch.failed"]);
  });

  test("a correlation id rides every record of one dispatch, so one grep finds its whole life", () => {
    const dir = temp();
    const file = join(dir, "orchd.log");
    const log = createLogger({ file, level: "info" });
    const dispatch = log.forCorrelation("d-123");
    dispatch.info("dispatch.accepted", {});
    dispatch.info("dispatch.delivered", {});
    log.info("unrelated.event", {});

    const mine = linesOf(file).filter((r) => r.correlationId === "d-123");
    expect(mine.map((r) => r.event)).toEqual(["dispatch.accepted", "dispatch.delivered"]);
  });

  test("agentId carries orch's minted id; a plexer handle is a field, never the identity", () => {
    const dir = temp();
    const file = join(dir, "orchd.log");
    const log = createLogger({ file, level: "info" });
    log.info("agent.spawned", { handle: "w7:p2E" }, { agentId: "5vlv1jey2z" });

    const record = linesOf(file)[0]!;
    expect(record.agentId).toBe("5vlv1jey2z");
    expect(record.fields).toEqual({ handle: "w7:p2E" });
  });

  test("every level is orderable, lowest to highest", () => {
    expect([...LOG_LEVELS]).toEqual(["error", "warn", "info", "debug", "trace"]);
  });

  test("a malformed line is rejected by the guard rather than trusted", () => {
    expect(isLogRecord({ at: "2026-01-01", level: "info", event: "x" })).toBe(false);
    expect(isLogRecord({ at: 1, level: "shout", event: "x" })).toBe(false);
    expect(isLogRecord({ at: 1, level: "info" })).toBe(false);
    expect(isLogRecord([])).toBe(false);
    expect(isLogRecord({ at: 1, level: "info", event: "x" })).toBe(true);
  });
});
