import { describe, expect, test } from "bun:test";
import { readAssignFlag, readValueFlag, resolveActiveDefault, resolveProviderSet } from "../src/commands/setup.ts";

describe("commands/setup", () => {
  test("reads value and assignment flags", () => {
    expect(readValueFlag(["--agent", "pi"], "--agent")).toBe("pi");
    expect(readAssignFlag(["--agent=claude"], "--agent")).toBe("claude");
    expect(readValueFlag([], "--agent")).toBeUndefined();
  });
  test("resolves noninteractive provider sets and defaults", async () => {
    expect(await resolveProviderSet("adapter", "--agent", "pi,claude", ["pi", "claude"], false, () => Promise.resolve(null))).toEqual(["pi", "claude"]);
    expect(await resolveActiveDefault(["pi", "claude"], false, false, () => Promise.resolve(null))).toBe("pi");
  });
});
