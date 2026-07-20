import { describe, expect, test } from "bun:test";
import { readAssignFlag, readValueFlag, reconcileRuntimeToEntrypoint, resolveActiveDefault, resolveProviderSet, resolveRuntime } from "../src/commands/setup.ts";

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

  describe("reconcileRuntimeToEntrypoint (11.1)", () => {
    const nodeEntrypoint = () => ({ path: "/usr/local/bin/orch", runtime: "node" as const });

    test("a consistent selection records silently and never prompts", async () => {
      let asked = false;
      const result = await reconcileRuntimeToEntrypoint("node", true, nodeEntrypoint, () => { asked = true; return Promise.resolve(true); });
      expect(result).toBe("node");
      expect(asked).toBe(false);
    });

    test("no installed entrypoint leaves the selection untouched", async () => {
      const result = await reconcileRuntimeToEntrypoint("bun", true, () => null, () => Promise.resolve(true));
      expect(result).toBe("bun");
    });

    test("a mismatch records nothing without confirmation — the consistent value wins", async () => {
      const result = await reconcileRuntimeToEntrypoint("bun", true, nodeEntrypoint, () => Promise.resolve(false));
      expect(result).toBe("node");
    });

    test("a mismatch records the selection only on explicit confirmation", async () => {
      const result = await reconcileRuntimeToEntrypoint("bun", true, nodeEntrypoint, () => Promise.resolve(true));
      expect(result).toBe("bun");
    });

    test("non-interactive never prompts and records the consistent value", async () => {
      let asked = false;
      const result = await reconcileRuntimeToEntrypoint("bun", false, nodeEntrypoint, () => { asked = true; return Promise.resolve(true); });
      expect(result).toBe("node");
      expect(asked).toBe(false);
    });
  });
});
