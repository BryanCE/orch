import { describe, expect, test } from "bun:test";
import { launchesPi, parseSpawnFlags, workerPrompt } from "../src/commands/spawn.ts";

describe("commands/spawn", () => {
  test("parses spawn flags and rejects no implicit adapter assumptions", () => expect(parseSpawnFlags(["2", "--agent", "claude", "--backend", "headless", "--json"])).toMatchObject({ positional: ["2"], adapterFlag: "claude", backendFlag: "headless", json: true }));
  test("identifies pi launchers and preserves raw prompt", () => {
    expect(launchesPi("pi --foo")).toBe(true);
    expect(launchesPi("claude")).toBe(false);
    expect(workerPrompt("hello", true, undefined)).toBe("hello");
  });
});
