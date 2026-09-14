import { afterEach, describe, expect, test } from "bun:test";

import { checkDeclaredVsReality } from "../src/doctor/declared-vs-reality.ts";
import { setTuning } from "../src/store/interval-rows.ts";
import { closeAllStores } from "../src/store/connection.ts";
import type { DeclaredVsRealityDependencies } from "../src/types/doctor.ts";
import type { AgentStatusRow } from "../src/store/status-rows.ts";
import type { OrchDir } from "../src/types/core.ts";
import { seedAgent } from "./helpers/agent.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

const directories: OrchDir[] = [];

function fixture(status: AgentStatusRow | null): { directory: OrchDir; dependencies: DeclaredVsRealityDependencies } {
  const directory = tempOrchDir("orch-doctor-tuning-");
  directories.push(directory);
  seedAgent("agent-1", { name: "worker", model: "openai/model-a" }, directory);
  setTuning(directory, "agent-1", Date.now() + 1, { model: "openai/model-a", thinking: "high" });
  return {
    directory,
    dependencies: {
      processAlive: () => true,
      plexerInventory: () => [],
      agentStatus: (_orchDir, id) => id === "agent-1" ? status ?? undefined : undefined,
    },
  };
}

function status(provider: string, id: string, thinking: string): AgentStatusRow {
  return {
    agentId: "agent-1",
    state: "working",
    lastError: null,
    modelProvider: provider,
    modelId: id,
    thinking,
    task: null,
    dispatchId: null,
    lastText: null,
    currentFile: null,
    filesTouched: null,
    tokensIn: null,
    tokensOut: null,
    cacheRead: null,
    cacheWrite: null,
    cost: null,
    contextTokens: null,
    contextPercent: null,
    turns: null,
    sessionPath: null,
    sessionId: null,
    project: null,
    extensionHash: null,
    startedAt: null,
    finishedAt: null,
    updatedAt: Date.now(),
    blockedMessage: null,
  };
}

afterEach(() => {
  closeAllStores();
  while (directories.length) removeTempDir(directories.pop()!);
});

describe("doctor declared tuning versus reality", () => {
  test("matching model and effort produces no finding", () => {
    const { directory, dependencies } = fixture(status("openai", "model-a", "high"));

    const result = checkDeclaredVsReality(directory, dependencies);

    expect(result.status).toBe("ok");
    expect(result.detail).not.toContain("agent agent-1");
  });

  test("different effort reports both ladder specs", () => {
    const { directory, dependencies } = fixture(status("openai", "model-a", "medium"));

    const result = checkDeclaredVsReality(directory, dependencies);

    expect(result.status).toBe("warn");
    expect(result.detail).toContain("agent agent-1 (worker): declared openai/model-a:high, running openai/model-a:medium");
  });

  test("different model reports both ladder specs", () => {
    const { directory, dependencies } = fixture(status("anthropic", "model-b", "high"));

    const result = checkDeclaredVsReality(directory, dependencies);

    expect(result.status).toBe("warn");
    expect(result.detail).toContain("agent agent-1 (worker): declared openai/model-a:high, running anthropic/model-b:high");
  });

  test("missing status produces no tuning finding", () => {
    const { directory, dependencies } = fixture(null);

    const result = checkDeclaredVsReality(directory, dependencies);

    expect(result.status).toBe("ok");
    expect(result.detail).not.toContain("agent agent-1");
  });
});
