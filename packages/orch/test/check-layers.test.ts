import { expect, test } from "bun:test";
import { clientReach, importGraph, layerOf, loadLine, ratchet, violations } from "../scripts/check-layers.ts";

test("the CLI is client, orchd's modules are server, the rest is shared", () => {
  expect(layerOf("src/commands/spawn/index.ts")).toBe("client");
  expect(layerOf("src/cli/parse.ts")).toBe("client");
  expect(layerOf("bin/orch.ts")).toBe("client");
  expect(layerOf("src/store/agent-rows.ts")).toBe("server");
  expect(layerOf("src/backends/herdr/index.ts")).toBe("server");
  expect(layerOf("src/daemon/server/rpc.ts")).toBe("server");
  expect(layerOf("src/local-process.ts")).toBe("server");
  expect(layerOf("node:child_process")).toBe("server");
  expect(layerOf("src/types/core.ts")).toBe("shared");
  expect(layerOf("src/daemon/client/wire.ts")).toBe("shared");
});

test("a client or shared module loading server code is a violation; server loading server is not", () => {
  const graph = new Map<string, string[]>([
    ["src/commands/dispatch.ts", ["src/util.ts", "src/store/agent-rows.ts"]],
    ["src/util.ts", ["src/backends/registry.ts"]],
    ["src/store/agent-rows.ts", ["src/store/connection.ts"]],
  ]);
  expect(violations(graph).map(loadLine)).toEqual([
    "src/commands/dispatch.ts -> src/store/agent-rows.ts",
    "src/util.ts -> src/backends/registry.ts",
  ]);
});

test("a client module reaching server code through shared modules is traced with its chain", () => {
  const graph = new Map<string, string[]>([
    ["src/commands/status.ts", ["src/format.ts"]],
    ["src/format.ts", ["src/policy/caller.ts"]],
    ["src/policy/caller.ts", ["src/store/agent-rows.ts"]],
  ]);
  expect(clientReach(graph).map((violation) => violation.chain)).toEqual([
    ["src/commands/status.ts", "src/format.ts", "src/policy/caller.ts", "src/store/agent-rows.ts"],
  ]);
});

test("the baseline only shrinks: a new load fails, and so does an entry the code no longer has", () => {
  expect(ratchet(["a -> s", "b -> s"], ["a -> s", "c -> s"])).toEqual({ added: ["b -> s"], stale: ["c -> s"] });
  expect(ratchet(["a -> s"], ["a -> s"])).toEqual({ added: [], stale: [] });
});

test("the real tree is scanned: the graph holds the CLI and orchd entry points", () => {
  const graph = importGraph();
  expect(graph.has("bin/orch.ts")).toBe(true);
  expect(graph.has("src/daemon/server/orchd.ts")).toBe(true);
  expect(graph.get("src/commands/index.ts")?.length ?? 0).toBeGreaterThan(0);
});
