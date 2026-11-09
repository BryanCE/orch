import { afterEach, describe, expect, test } from "bun:test";
import { mintAgentId } from "../src/shared/agent-id.ts";
import { hostIdentity } from "../src/hosts/identity.ts";
import { registerSpawnedAgent } from "../src/store/spawn-registration.ts";
import { agentById, originOf } from "../src/store/agent-rows.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { testHost } from "./helpers/host.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { AgentOrigin } from "../src/types/host.ts";
import type { SpawnRegistration } from "../src/types/store.ts";

const dirs: OrchDir[] = [];

afterEach(() => {
  closeAllStores();
  while (dirs.length) removeTempDir(dirs.pop()!);
});

function freshDir(): OrchDir {
  const dir = tempOrchDir("orch-agent-origin-");
  dirs.push(dir);
  return dir;
}

function spawned(key: string, spawner: string | null, origin?: AgentOrigin): SpawnRegistration {
  return {
    key, harnessId: "pi", placed: false, cwd: "/tmp", name: key, model: "openai/gpt-5.6",
    spawner, process: { host: hostIdentity().id, pid: process.pid, startToken: `origin-${key}` }, 
    ...(origin === undefined ? {} : { origin }),
  };
}

describe("agent origin", () => {
  test("a spawn another host asked for carries that host and its spawner, and names no spawner here", () => {
    const dir = freshDir();
    const origin: AgentOrigin = { askedBy: testHost("origin-host").id, spawner: mintAgentId() };
    const key = mintAgentId();

    registerSpawnedAgent(dir, spawned(key, null, origin));

    expect(originOf(dir, key)).toEqual(origin);
    expect(agentById(dir, key)?.spawnedBy ?? null).toBeNull();
  });

  test("everything that agent spawns here carries the same origin", () => {
    const dir = freshDir();
    const origin: AgentOrigin = { askedBy: testHost("origin-host").id, spawner: mintAgentId() };
    const parent = mintAgentId();
    const child = mintAgentId();
    const grandchild = mintAgentId();

    registerSpawnedAgent(dir, spawned(parent, null, origin));
    registerSpawnedAgent(dir, spawned(child, parent));
    registerSpawnedAgent(dir, spawned(grandchild, child));

    expect(originOf(dir, child)).toEqual(origin);
    expect(originOf(dir, grandchild)).toEqual(origin);
  });

  test("a spawn asked for on this host has no origin", () => {
    const dir = freshDir();
    const parent = mintAgentId();
    const child = mintAgentId();

    registerSpawnedAgent(dir, spawned(parent, null));
    registerSpawnedAgent(dir, spawned(child, parent));

    expect(originOf(dir, parent)).toBeNull();
    expect(originOf(dir, child)).toBeNull();
  });
});
