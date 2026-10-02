import { afterEach, describe, expect, test } from "bun:test";
import { closeAllStores } from "../src/store/connection.ts";
import { ensureHarness, getOrCreateSessionAgent, insertAgent } from "../src/store/agent-rows.ts";
import { acquireLease } from "../src/store/lease-rows.ts";
import { processStartToken } from "../src/process-identity.ts";
import { orphanAgents } from "../src/policy/orphan.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

import type { OrchDir } from "../src/types/core.ts";
const directories: OrchDir[] = [];

afterEach(() => {
  closeAllStores();
  while (directories.length > 0) removeTempDir(directories.pop()!);
});

function sessionRow(orchDir: OrchDir, pid: number, startToken: string, sessionToken: string | null): string {
  return getOrCreateSessionAgent(orchDir, {
    pid, startToken, sessionToken, harnessId: "pi", cwd: "/repo", label: "session",
    hostId: "host", hostName: "host", hostOs: "linux", now: 2,
  }).id;
}

describe("orphan agents", () => {
  test("lists spawned agents with no live holder, never a root", () => {
    const orchDir = tempOrchDir("orch-orphan-agents-");
    directories.push(orchDir);
    ensureHarness(orchDir, "pi", "pi");
    const startToken = processStartToken(process.pid);
    if (startToken === undefined) throw new Error("no start token for the test process");
    const live = sessionRow(orchDir, process.pid, startToken, "live-session");
    const dead = sessionRow(orchDir, 999_999_999, "gone", "dead-session");
    insertAgent(orchDir, { id: "unheld", spawnedBy: live, harnessId: "pi", cwd: "/repo", name: "unheld", createdAt: 3 });
    insertAgent(orchDir, { id: "held", spawnedBy: live, harnessId: "pi", cwd: "/repo", name: "held", createdAt: 3 });
    acquireLease(orchDir, "held", live, 4);
    insertAgent(orchDir, { id: "stranded", spawnedBy: dead, harnessId: "pi", cwd: "/repo", name: "stranded", createdAt: 3 });
    acquireLease(orchDir, "stranded", dead, 4);

    expect(orphanAgents(orchDir)).toEqual([
      { id: "stranded", name: "stranded" },
      { id: "unheld", name: "unheld" },
    ]);
  });
});
