import { describe, expect, test } from "bun:test";
import { phaseClock } from "../src/daemon/server/phase-clock.ts";

describe("phase clock", () => {
  test("names the milliseconds each phase spent, from one lap to the next", () => {
    const instants = [0, 4, 1_504.4, 1_510];
    const clock = phaseClock(() => instants.shift() ?? 0);
    clock.lap("index");
    clock.lap("entities");
    clock.lap("rows");
    expect(clock.phases()).toEqual({ index: 4, entities: 1_500, rows: 6 });
  });
});
