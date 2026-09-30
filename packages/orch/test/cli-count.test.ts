import { describe, expect, test } from "bun:test";
import { readCount } from "../src/cli/count.ts";
import { parseCommand } from "../src/commands/registry.ts";

describe("readCount", () => {
  test("no -n is no count", () => expect(readCount(parseCommand("runs", []))).toBeUndefined());
  test("a whole number is the count", () => expect(readCount(parseCommand("tail", ["agent", "-n", "7"]))).toBe(7));
  test("peek reads the same grammar", () => expect(readCount(parseCommand("peek", ["agent", "-n", "0"]))).toBe(0));
  for (const given of ["abc", "1.5", "2e3", "99999999999999999999"]) {
    test(`refuses "${given}" with the usage line`, () => {
      expect(() => readCount(parseCommand("runs", ["-n", given]))).toThrow(`-n needs a whole number, got "${given}"\nusage: orch runs`);
    });
  }
});
