import { describe, expect, test } from "bun:test";
import { needsFirstRunSetup, readOrchVersion } from "../src/commands/index.ts";
import { announceUnleasedAgents, type HelloResponse } from "../src/daemon/rpc.ts";

describe("commands/index", () => {
  test("does not gate help or noninteractive commands", () => {
    expect(needsFirstRunSetup("help")).toBe(false);
    expect(needsFirstRunSetup("status")).toBe(false);
  });
  test("reads a package version string", () => expect(readOrchVersion()).toMatch(/^\d+\.\d+\.\d+/));
  test("announces unleased agents once per session", () => {
    const output: string[] = [];
    const identity = { id: `seam-${Date.now()}-${Math.random()}`, label: "session", kind: "session", unleased: [{ id: "worker", name: "worker" }] } as HelloResponse;
    announceUnleasedAgents("/tmp/commands-index-seam", identity, (text) => output.push(text));
    announceUnleasedAgents("/tmp/commands-index-seam", identity, (text) => output.push(text));
    expect(output).toEqual(["1 unleased agent(s) exist - orch adopt worker to take one, orch status to see them.\n"]);
  });
});
