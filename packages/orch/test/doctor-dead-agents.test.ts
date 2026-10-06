import { afterEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { basename } from "node:path";
import { runTestDoctor } from "./helpers/doctor.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { seedAgent, seedLiveProcess } from "./helpers/agent.ts";
import { recordAgentStatus } from "../src/presence/store.ts";
import { ensurePresenceAgentDir, presenceAgentDir } from "../src/presence/history.ts";
import { closeAllStores } from "../src/store/connection.ts";
import type { CheckResult } from "../src/types/doctor.ts";

import type { OrchDir } from "../src/types/core.ts";
const directories: OrchDir[] = [];

function tempDir(): OrchDir {
  const directory = tempOrchDir("orch-dead-");
  directories.push(directory);
  return directory;
}

function seedDeadAgent(orchDir: OrchDir, key: string, facts: { name: string; cwd: string; updatedAt?: number }): void {
  seedAgent(key, { adapter: "pi", cwd: facts.cwd, name: facts.name }, orchDir);
  recordAgentStatus(orchDir, key, { state: "done", project: basename(facts.cwd) }, facts.updatedAt ?? Date.now());
}

function deadResult(results: CheckResult[]): CheckResult {
  const result = results.find((entry) => entry.id === "dead-agents");
  if (!result) throw new Error("missing dead-agents result");
  return result;
}

afterEach(() => {
  closeAllStores();
  while (directories.length) removeTempDir(directories.pop()!);
});

const DEAD_KEY = "d3adagnt01";
const LIVE_KEY = "l1veagnt02";

describe("doctor dead agent rows", () => {
  test("describes a dead agent by name and project, not a bare key", async () => {
    const directory = tempDir();
    seedDeadAgent(directory, DEAD_KEY, {
      name: "docs-2",
      cwd: "/home/bryan/Documents/orch",
      updatedAt: Date.now() - 3_600_000,
    });
    const result = deadResult(await runTestDoctor(directory));
    expect(result.status).toBe("warn");
    expect(result.detail).toContain("docs-2");
    expect(result.detail).toContain("project orch");
    expect(result.detail).not.toContain(DEAD_KEY);
  });

  test("offers no fix and never touches the agent's history", async () => {
    const directory = tempDir();
    seedDeadAgent(directory, DEAD_KEY, { name: "docs-2", cwd: "/x/orch" });
    ensurePresenceAgentDir(DEAD_KEY, directory);
    const result = deadResult(await runTestDoctor(directory));
    expect(result.fix).toBeUndefined();
    expect(existsSync(presenceAgentDir(DEAD_KEY, directory))).toBe(true);
  });

  test("a live agent is not reported", async () => {
    const directory = tempDir();
    // Liveness is the store's process row, never a status file claim.
    seedDeadAgent(directory, LIVE_KEY, { name: "alive", cwd: "/x/orch" });
    seedLiveProcess(directory, LIVE_KEY);
    const result = deadResult(await runTestDoctor(directory));
    expect(result.status).toBe("ok");
  });
});
