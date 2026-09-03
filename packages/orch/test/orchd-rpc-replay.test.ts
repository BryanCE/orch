import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendEvent, deleteEventsBefore } from "../src/store/event-rows.ts";
import { REPLAY_WINDOW, ReplayBuffer } from "../src/daemon/rpc/replay.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const dirs: string[] = [];

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-replay-"));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  while (dirs.length > 0) removeTempDir(dirs.pop()!);
});

describe("orchd RPC replay buffer", () => {
  test("assigns monotonic sequence numbers and replays after a sequence", () => {
    const buffer = new ReplayBuffer(fixture());
    expect(buffer.push("one")).toEqual({ event: "one", seq: 1 });
    expect(buffer.push("two")).toEqual({ event: "two", seq: 2 });
    expect(buffer.push("three")).toEqual({ event: "three", seq: 3 });
    expect(buffer.since(1)).toMatchObject({
      gap: false,
      events: [
        { event: "two", seq: 2 },
        { event: "three", seq: 3 },
      ],
    });
    expect(buffer.since(0).events).toHaveLength(3);
  });

  test("replays from inside the surviving range without a gap", () => {
    const dir = fixture();
    appendEvent(dir, Date.parse("2024-01-01T00:00:00.000Z"), "one");
    appendEvent(dir, Date.parse("2024-01-02T00:00:00.000Z"), "two");
    appendEvent(dir, Date.parse("2024-01-03T00:00:00.000Z"), "three");
    deleteEventsBefore(dir, Date.parse("2024-01-02T00:00:00.000Z"));
    const buffer = new ReplayBuffer(dir);
    // Sequence 1 is immediately before the retained range, so no event is missing.
    expect(buffer.since(1)).toEqual({
      events: [{ event: "two", seq: 2 }, { event: "three", seq: 3 }],
      gap: false,
      oldestSeq: 2,
    });
    expect(buffer.since(2)).toEqual({ events: [{ event: "three", seq: 3 }], gap: false, oldestSeq: 2 });
  });

  test("reports a gap when the requested sequence predates retained history", () => {
    const dir = fixture();
    appendEvent(dir, Date.parse("2024-01-01T00:00:00.000Z"), "one");
    appendEvent(dir, Date.parse("2024-01-02T00:00:00.000Z"), "two");
    appendEvent(dir, Date.parse("2024-01-03T00:00:00.000Z"), "three");
    deleteEventsBefore(dir, Date.parse("2024-01-02T00:00:00.000Z"));
    const replay = new ReplayBuffer(dir).since(0);
    expect(replay).toEqual({
      events: [{ event: "two", seq: 2 }, { event: "three", seq: 3 }],
      gap: true,
      oldestSeq: 2,
    });
  });

  test("empty history has no gap or oldest sequence", () => {
    const replay = new ReplayBuffer(fixture()).since(0);
    expect(replay).toEqual({ events: [], gap: false });
  });

  test("limits replay size without pruning durable events", () => {
    const buffer = new ReplayBuffer(fixture());
    for (let seq = 1; seq <= REPLAY_WINDOW + 2; seq++) buffer.push(seq);

    const replay = buffer.since(0);
    expect(replay.gap).toBe(false);
    expect(replay.oldestSeq).toBe(1);
    expect(replay.events[0]).toEqual({ event: 1, seq: 1 });
    expect(replay.events).toHaveLength(REPLAY_WINDOW);
    // The limit applies to this reply only; the rows beyond it remain replayable.
    expect(buffer.since(REPLAY_WINDOW).events[0]).toEqual({ event: REPLAY_WINDOW + 1, seq: REPLAY_WINDOW + 1 });
  }, 10_000);
});
