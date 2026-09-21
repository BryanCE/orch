import type { OrchDir } from "../src/types/core.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { mintAgentId } from "../src/backends/identity.ts";
import { closeAgent } from "../src/daemon/server/handlers/lifecycle.ts";
import { agentView } from "../src/store/agent-view.ts";
import { seedAgent } from "./helpers/agent.ts";
import { idleDaemonState } from "./helpers/daemon-state.ts";
import { testServices } from "./helpers/services.ts";
import { removeTempDir, tempOrchDir as mintTempOrchDir } from "./helpers/tempdir.ts";

const directories: OrchDir[] = [];

function tempOrchDir(): OrchDir {
  const directory = mintTempOrchDir("orch-close-gone-");
  directories.push(directory);
  return directory;
}

afterEach(() => {
  while (directories.length) removeTempDir(directories.pop()!);
});

describe("agent-closed on an agent that is already gone", () => {
  test("a key the store never held is a no-op success", () => {
    const directory = tempOrchDir();
    const state = idleDaemonState(testServices({ orchDir: directory, settings: {} }), directory);
    expect(closeAgent(state, { key: mintAgentId() })).toEqual({ ok: true });
  });

  test("a second close of an ended agent changes nothing", () => {
    const directory = tempOrchDir();
    const state = idleDaemonState(testServices({ orchDir: directory, settings: {} }), directory);
    const key = mintAgentId();
    seedAgent(key, { adapter: "pi" }, directory);
    expect(closeAgent(state, { key })).toEqual({ ok: true });
    const endedAt = agentView(directory, key)?.endedAt;
    expect(endedAt).not.toBeNull();
    expect(closeAgent(state, { key })).toEqual({ ok: true });
    expect(agentView(directory, key)?.endedAt).toBe(endedAt);
  });
});
