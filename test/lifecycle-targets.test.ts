import { describe, expect, test } from "bun:test";
import { registryTargetMatches } from "../src/commands/target.ts";

describe("lifecycle target resolution", () => {
  test("matches a stale bare pane row by its handle without parsing pane as an identity", () => {
    expect(registryTargetMatches({ pane: "w7:pJ", handle: "w7:pW", name: "lease-hardening" }, "lease-hardening")).toBe(true);
    expect(registryTargetMatches({ pane: "w7:pN", handle: "w7:pN" }, "w7:pN")).toBe(true);
  });

});
