import { describe, expect, test } from "bun:test";
import { needsFirstRunSetup, readOrchVersion } from "../src/commands/index.ts";

describe("commands/index", () => {
  test("does not gate help or noninteractive commands", () => {
    expect(needsFirstRunSetup("help")).toBe(false);
    expect(needsFirstRunSetup("status")).toBe(false);
  });
  test("reads a package version string", () => expect(readOrchVersion()).toMatch(/^\d+\.\d+\.\d+/));
});
