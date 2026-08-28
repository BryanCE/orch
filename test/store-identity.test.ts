import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores } from "../src/store/connection.ts";
import { agentById, getOrCreateSessionAgent, isLiveAgentIdentity } from "../src/store/agent-rows.ts";
import { currentProcess } from "../src/store/interval-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const tempDirs: string[] = [];

afterEach(() => {
  closeAllStores();
  while (tempDirs.length > 0) removeTempDir(tempDirs.pop()!);
});

function fixture(): string {
  const orchDir = mkdtempSync(join(tmpdir(), "orch-store-identity-"));
  tempDirs.push(orchDir);
  return orchDir;
}

describe("hello agent identity rows", () => {
  test("reuses the live agent for the same session process and mints for another", () => {
    const orchDir = fixture();
    const first = getOrCreateSessionAgent(orchDir, {
      pid: 42, startToken: "start-a", harnessId: "pi", cwd: "/repo", label: "first", hostId: "host", hostName: "Host", hostOs: "linux", now: 1_000,
    });
    const same = getOrCreateSessionAgent(orchDir, {
      pid: 42, startToken: "start-a", harnessId: "pi", cwd: "/repo", label: "renamed", hostId: "host", hostName: "Host", hostOs: "linux", now: 2_000,
    });
    const other = getOrCreateSessionAgent(orchDir, {
      pid: 43, startToken: "start-b", harnessId: "pi", cwd: "/repo", label: "other", hostId: "host", hostName: "Host", hostOs: "linux", now: 3_000,
    });

    expect(same.id).toBe(first.id);
    expect(same.label).toBe("renamed");
    expect(other.id).not.toBe(first.id);
  });

  test("first sight creates a named root agent and open process row", () => {
    const orchDir = fixture();
    const identity = getOrCreateSessionAgent(orchDir, {
      pid: 42, startToken: "start-a", harnessId: "pi", cwd: "/repo", label: "lead", hostId: "host", hostName: "Host", hostOs: "linux", now: 1_000,
    });

    expect(agentById(orchDir, identity.id)).toMatchObject({
      id: identity.id, spawnedBy: null, rootAgentId: identity.id, harnessId: "pi", cwd: "/repo",
      name: `pi-${identity.id.slice(0, 8)}`, label: "lead",
    });
    expect(currentProcess(orchDir, identity.id)).toMatchObject({ pid: 42, start_token: "start-a", host_id: "host", until: null });
    expect(isLiveAgentIdentity(orchDir, identity)).toBe(true);
    expect(isLiveAgentIdentity(orchDir, { id: "missing", label: "lead", kind: "session" })).toBe(false);
  });
});
