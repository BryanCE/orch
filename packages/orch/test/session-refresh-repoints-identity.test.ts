import type { OrchDir } from "../src/types/core.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";


import { closeAllStores } from "../src/store/connection.ts";
import { agentById, endAgent, getOrCreateSessionAgent, insertAgent } from "../src/store/agent-rows.ts";
import { currentProcess } from "../src/store/interval-rows.ts";
import { acquireLease, currentLease } from "../src/store/lease-rows.ts";
import { daemonRuntimeFiles } from "../src/daemon/client/runtime-files.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

const tempDirs: OrchDir[] = [];

afterEach(() => {
  closeAllStores();
  while (tempDirs.length > 0) removeTempDir(tempDirs.pop()!);
});

function fixture(): OrchDir {
  const orchDir = tempOrchDir("orch-session-refresh-");
  tempDirs.push(orchDir);
  return orchDir;
}

function session(orchDir: OrchDir, pid: number, startToken: string, sessionToken: string, label: string, now: number) {
  return getOrCreateSessionAgent(orchDir, {
    pid, startToken, sessionToken, harnessId: "pi", cwd: "/repo", label,
    hostId: "host", hostName: "Host", hostOs: "linux", now,
  });
}

describe("session refresh identity continuity", () => {
  test("same process with a new token repoints the existing agent and preserves its lease", () => {
    const orchDir = fixture();
    const first = session(orchDir, 42, "start-a", "session-a", "first", 1_000);
    const holder = insertAgent(orchDir, { id: "holder", harnessId: "pi", cwd: "/repo", name: "holder", createdAt: 900 });
    acquireLease(orchDir, first.id, holder.id, 1_100);
    const leaseBefore = currentLease(orchDir, first.id);

    const refreshed = session(orchDir, 42, "start-a", "session-b", "refreshed", 2_000);

    expect(refreshed.id).toBe(first.id);
    expect(agentById(orchDir, first.id)).toMatchObject({ label: "refreshed", sessionToken: "session-b" });
    expect(currentProcess(orchDir, first.id)).toMatchObject({ pid: 42, startToken: "start-a", since: 1_000, until: null });
    expect(currentLease(orchDir, first.id)).toEqual(leaseBefore);

    const log = readFileSync(daemonRuntimeFiles(orchDir).log, "utf8");
    expect(log).toContain('"event":"session.repointed"');
    expect(log).toContain(`"agentId":"${first.id}"`);
    expect(log).toContain('"harnessId":"pi"');
    expect(log).not.toContain("session-a");
    expect(log).not.toContain("session-b");
  });

  test("same token with a new process keeps the agent and repoints its process interval", () => {
    const orchDir = fixture();
    const first = session(orchDir, 42, "start-a", "session-a", "first", 1_000);

    const resumed = session(orchDir, 43, "start-b", "session-a", "resumed", 2_000);

    expect(resumed.id).toBe(first.id);
    expect(currentProcess(orchDir, first.id)).toMatchObject({ pid: 43, startToken: "start-b", since: 2_000, until: null });
  });

  test("a new token and a new process mint a new agent", () => {
    const orchDir = fixture();
    const first = session(orchDir, 42, "start-a", "session-a", "first", 1_000);

    const unrelated = session(orchDir, 43, "start-b", "session-b", "unrelated", 2_000);

    expect(unrelated.id).not.toBe(first.id);
    expect(agentById(orchDir, first.id)).toMatchObject({ sessionToken: "session-a" });
  });

  test("a process anchored by an ended agent mints instead of repointing", () => {
    const orchDir = fixture();
    const first = session(orchDir, 42, "start-a", "session-a", "first", 1_000);
    endAgent(orchDir, first.id, 1_500, null);

    const replacement = session(orchDir, 42, "start-a", "session-b", "replacement", 2_000);

    expect(replacement.id).not.toBe(first.id);
    expect(agentById(orchDir, first.id)?.sessionToken).toBe("session-a");
    expect(agentById(orchDir, replacement.id)).toMatchObject({ sessionToken: "session-b" });
  });
});
