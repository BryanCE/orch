import { describe, expect, test } from "bun:test";
import { parseSpawnFlags, workerPrompt } from "../src/commands/spawn.ts";
import { piAdapter } from "../src/adapters/pi.ts";
import { ompAdapter } from "../src/adapters/omp.ts";

describe("commands/spawn", () => {
  test("parses spawn flags and rejects no implicit adapter assumptions", () => expect(parseSpawnFlags(["2", "--agent", "claude", "--backend", "headless", "--json"])).toMatchObject({ positional: ["2"], adapterFlag: "claude", backendFlag: "headless", json: true }));
  test("each pi flavor launches its own binary and preserves raw prompt", () => {
    expect(piAdapter.interactiveCmd({})).toBe("pi");
    expect(piAdapter.headlessCmd("go", {})[0]).toBe("pif");
    expect(ompAdapter.interactiveCmd({})).toBe("omp");
    expect(ompAdapter.headlessCmd("go", {})[0]).toBe("omp");
    expect(workerPrompt("hello", true, undefined)).toBe("hello");
  });
});
