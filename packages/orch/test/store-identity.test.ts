import { placeHere } from "../src/process-place.ts";
import { hostIdentity } from "../src/hosts/identity.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { closeAllStores } from "../src/store/connection.ts";
import { agentById, getOrCreateSessionAgent, insertAgent, isLiveAgentIdentity } from "../src/store/agent-rows.ts";
import { OPERATOR_HARNESS_ID } from "../src/identity/operator.ts";
import { agentLocation, currentProcess } from "../src/store/interval-rows.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

import type { OrchDir } from "../src/types/core.ts";
const tempDirs: OrchDir[] = [];

afterEach(() => {
  closeAllStores();
  while (tempDirs.length > 0) removeTempDir(tempDirs.pop()!);
});

function fixture(): OrchDir {
  const orchDir = tempOrchDir("orch-store-identity-");
  tempDirs.push(orchDir);
  return orchDir;
}

describe("hello agent identity rows", () => {
  test("reuses the live agent for the same session process and mints for another", () => {
    const orchDir = fixture();
    const first = getOrCreateSessionAgent(orchDir, {
      pid: 42, startToken: "start-a", harnessId: "pi", cwd: "/repo", label: "first", host: hostIdentity(), now: 1_000,
    });
    const same = getOrCreateSessionAgent(orchDir, {
      pid: 42, startToken: "start-a", harnessId: "pi", cwd: "/repo", label: "renamed", host: hostIdentity(), now: 2_000,
    });
    const other = getOrCreateSessionAgent(orchDir, {
      pid: 43, startToken: "start-b", harnessId: "pi", cwd: "/repo", label: "other", host: hostIdentity(), now: 3_000,
    });

    expect(same.id).toBe(first.id);
    expect(same.label).toBe("renamed");
    expect(other.id).not.toBe(first.id);
  });

  test("first sight creates a named root agent and open process row", () => {
    const orchDir = fixture();
    const identity = getOrCreateSessionAgent(orchDir, {
      pid: 42, startToken: "start-a", harnessId: "pi", cwd: "/repo", label: "lead", host: hostIdentity(), now: 1_000,
    });

    expect(agentById(orchDir, identity.id)).toMatchObject({
      id: identity.id, spawnedBy: null, rootAgentId: identity.id, harnessId: "pi",
      name: `pi-${identity.id.slice(0, 8)}`, label: "lead",
    });
    // Where it runs is its location: this host, in the directory it registered from.
    expect(agentLocation(orchDir, identity.id)).toMatchObject({ host: hostIdentity().id, cwd: "/repo", since: 1_000 });
    expect(currentProcess(orchDir, placeHere(orchDir, identity.id))).toMatchObject({ pid: 42, startToken: "start-a", host: hostIdentity().id });
    expect(isLiveAgentIdentity(orchDir, identity)).toBe(true);
    expect(isLiveAgentIdentity(orchDir, { id: "missing", label: "lead", kind: "session" })).toBe(false);
  });

  test("each path that makes a row stores its kind", () => {
    const orchDir = fixture();
    const terminal = getOrCreateSessionAgent(orchDir, {
      pid: 41, startToken: "start-t", harnessId: OPERATOR_HARNESS_ID, cwd: "/repo", label: "shell", host: hostIdentity(), now: 1_000,
    });
    const session = getOrCreateSessionAgent(orchDir, {
      pid: 42, startToken: "start-s", harnessId: "pi", cwd: "/repo", label: "pi", host: hostIdentity(), now: 1_000,
    });
    insertAgent(orchDir, { host: hostIdentity(), id: "spawned001", spawnedBy: session.id, harnessId: "pi", cwd: "/repo", name: "worker", createdAt: 2_000 });

    expect(agentById(orchDir, terminal.id)?.kind).toBe("operator");
    expect(agentById(orchDir, session.id)?.kind).toBe("session");
    expect(agentById(orchDir, "spawned001")?.kind).toBe("agent");
  });
});
