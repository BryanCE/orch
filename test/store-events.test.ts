import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores } from "../src/store/connection.ts";
import {
  appendEvent,
  deleteEventsBefore,
  oldestEventSeq,
  selectEventsSince,
} from "../src/store/event-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const tempDirs: string[] = [];

afterEach(() => {
  closeAllStores();
  while (tempDirs.length > 0) removeTempDir(tempDirs.pop()!);
});

function fixture(): string {
  const orchDir = mkdtempSync(join(tmpdir(), "orch-store-events-"));
  tempDirs.push(orchDir);
  return orchDir;
}

describe("event store rows", () => {
  test("appendEvent assigns increasing sequence numbers and round-trips payload", () => {
    const orchDir = fixture();
    const first = appendEvent(orchDir, "2026-01-01T00:00:00.000Z", { kind: "started", count: 1 });
    const second = appendEvent(orchDir, "2026-01-01T00:00:01.000Z", ["finished", true]);

    expect(first).toEqual({ seq: 1, ts: "2026-01-01T00:00:00.000Z", event: { kind: "started", count: 1 } });
    expect(second).toEqual({ seq: 2, ts: "2026-01-01T00:00:01.000Z", event: ["finished", true] });
  });

  test("appendEvent keeps sequence numbers across store reopen", () => {
    const orchDir = fixture();
    appendEvent(orchDir, "2026-01-01T00:00:00.000Z", { n: 1 });
    appendEvent(orchDir, "2026-01-01T00:00:01.000Z", { n: 2 });
    appendEvent(orchDir, "2026-01-01T00:00:02.000Z", { n: 3 });
    closeAllStores();

    expect(appendEvent(orchDir, "2026-01-01T00:00:03.000Z", { n: 4 }).seq).toBe(4);
  });

  test("pruned sequence numbers are never reused", () => {
    const orchDir = fixture();
    for (let i = 1; i <= 5; i += 1) {
      appendEvent(orchDir, `2026-01-01T00:00:0${i}.000Z`, { n: i });
    }

    expect(deleteEventsBefore(orchDir, "2026-01-01T00:00:04.000Z")).toBe(3);
    expect(appendEvent(orchDir, "2026-01-01T00:00:06.000Z", { n: 6 }).seq).toBe(6);
  });

  test("selectEventsSince filters by sequence, orders ascending, and honours limit", () => {
    const orchDir = fixture();
    for (let i = 1; i <= 5; i += 1) {
      appendEvent(orchDir, `2026-01-01T00:00:0${i}.000Z`, { n: i });
    }

    expect(selectEventsSince(orchDir, 2, 2).map((row) => row.seq)).toEqual([3, 4]);
    expect(selectEventsSince(orchDir, 4, 10).map((row) => row.seq)).toEqual([5]);
  });

  test("oldestEventSeq reports undefined when empty and the surviving lowest sequence after pruning", () => {
    const orchDir = fixture();
    expect(oldestEventSeq(orchDir)).toBeUndefined();
    for (let i = 1; i <= 5; i += 1) {
      appendEvent(orchDir, `2026-01-01T00:00:0${i}.000Z`, { n: i });
    }

    expect(deleteEventsBefore(orchDir, "2026-01-01T00:00:04.000Z")).toBe(3);
    expect(oldestEventSeq(orchDir)).toBe(4);
  });
});
