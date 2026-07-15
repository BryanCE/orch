import { describe, expect, test } from "bun:test";
import { REPLAY_WINDOW, ReplayBuffer } from "../src/daemon/rpc";

describe("orchd RPC replay buffer", () => {
  test("assigns monotonic sequence numbers and replays after a sequence", () => {
    const buffer = new ReplayBuffer();
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

  test("drops the oldest events and reports a replay gap", () => {
    const buffer = new ReplayBuffer();
    for (let seq = 1; seq <= REPLAY_WINDOW + 2; seq++) buffer.push(seq);

    const replay = buffer.since(1);
    expect(replay.gap).toBe(true);
    expect(replay.oldestSeq).toBe(3);
    expect(replay.events[0]).toEqual({ event: 3, seq: 3 });
    expect(replay.events).toHaveLength(REPLAY_WINDOW);
  });
});
