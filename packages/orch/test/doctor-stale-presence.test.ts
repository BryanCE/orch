import { afterEach, describe, expect, test } from "bun:test";
import { basename } from "node:path";
import { runTestDoctor } from "./helpers/doctor.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { seedAgent, seedLiveProcess } from "./helpers/agent.ts";
import { recordAgentStatus } from "../src/presence/store.ts";
import { ensurePresenceAgentDir } from "../src/presence/history.ts";
import { closeAllStores } from "../src/store/connection.ts";
import type { CheckResult } from "../src/types/doctor.ts";

import type { OrchDir } from "../src/types/core.ts";
const directories: OrchDir[] = [];

function tempDir(): OrchDir {
  const directory = tempOrchDir("orch-stale-");
  directories.push(directory);
  return directory;
}

function seedDeadAgent(orchDir: OrchDir, key: string, facts: { name: string; cwd: string; updatedAt?: number }): void {
  seedAgent(key, { adapter: "pi", cwd: facts.cwd, name: facts.name }, orchDir);
  recordAgentStatus(orchDir, key, { state: "done", project: basename(facts.cwd) }, facts.updatedAt ?? Date.now());
}

function staleResult(results: CheckResult[]): CheckResult {
  const result = results.find((entry) => entry.id === "stale-presence");
  if (!result) throw new Error("missing stale-presence result");
  return result;
}

afterEach(() => {
  closeAllStores();
  while (directories.length) removeTempDir(directories.pop()!);
});

/** A1: a presence directory is named by the agent's minted id — 10 lowercase
 *  alphanumerics, no plexer and no pane handle welded in. */
const DEAD_KEY = "d3adagnt01";
const LIVE_KEY = "l1veagnt02";

describe("doctor stale presence safety", () => {
  test("describes a dead agent by name and project, not a bare key", async () => {
    const directory = tempDir();
    seedDeadAgent(directory, DEAD_KEY, {
      name: "docs-2",
      cwd: "/home/bryan/Documents/orch",
      updatedAt: Date.now() - 3_600_000,
    });
    const result = staleResult(await runTestDoctor(directory));
    expect(result.status).toBe("warn");
    expect(result.detail).toContain("docs-2");
    expect(result.detail).toContain("project orch");
    expect(result.detail).toContain(DEAD_KEY);
  });

  test("the removal fix is marked destructive so UIs never pre-select it", async () => {
    const directory = tempDir();
    seedDeadAgent(directory, DEAD_KEY, { name: "docs-2", cwd: "/x/orch" });
    const result = staleResult(await runTestDoctor(directory));
    expect(result.fix?.destructive).toBe(true);
    expect(result.fix?.description).toContain("docs-2");
  });

  test("no dead agents leaves nothing to remove", async () => {
    const directory = tempDir();
    // Liveness is the store's process row, never a status file claim.
    seedDeadAgent(directory, LIVE_KEY, { name: "alive", cwd: "/x/orch" });
    seedLiveProcess(directory, LIVE_KEY);
    const result = staleResult(await runTestDoctor(directory));
    expect(result.status).toBe("ok");
    expect(result.fix).toBeUndefined();
  });

  test("flags malformed presence directory names", async () => {
    const directory = tempDir();
    ensurePresenceAgentDir("not-a-minted-id", directory);
    const result = staleResult(await runTestDoctor(directory));
    expect(result.status).toBe("fail");
    expect(result.detail).toContain("1 malformed agent dir");
    expect(result.detail).toContain("not-a-minted-id");
  });
});
