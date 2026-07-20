import { describe, expect, test } from "bun:test";
import { readAssignFlag, readValueFlag, resolveActiveDefault, resolveProviderSet, resolveRuntime } from "../src/commands/setup.ts";

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
  test("resolves the runtime from the flag or the no-preference value, never from PATH", async () => {
    expect(await resolveRuntime("deno", false)).toBe("deno");
    expect(await resolveRuntime("bun", false)).toBe("bun");
    // No flag and nothing to prompt on expresses no preference, which records node.
    expect(await resolveRuntime(undefined, false)).toBe("node");
    // Interactive defers entirely to the selection; bun is never chosen on the operator's behalf.
    expect(await resolveRuntime(undefined, true, () => Promise.resolve(null))).toBeNull();
    expect(await resolveRuntime(undefined, true, () => Promise.resolve("bun"))).toBe("bun");
  });
});
