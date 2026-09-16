import type { OrchDir } from "../src/types/core.ts";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ensureHarness, ensureHost, insertAgent } from "../src/store/agent-rows.ts";
import { acquireLease, currentLease } from "../src/store/lease-rows.ts";
import { orm } from "../src/store/connection.ts";
import { governWrite } from "../src/daemon/server/handlers/write.ts";
import { presenceAgentDir } from "../src/presence/history.ts";
import { processStartToken } from "../src/process-identity.ts";
import { reapAgent, adoptAgent, detachAgent } from "../src/daemon/server/handlers/lease.ts";
import { cmdReap } from "../src/commands/lease.ts";
import { cmdAbort, cmdClose } from "../src/commands/lifecycle/close.ts";
import { headlessBackend } from "../src/backends/headless/index.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { spawnedRecords } from "../src/presence/store.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { seedSpace } from "./helpers/space.ts";
import { placeAgent } from "./helpers/agent.ts";
import { sql } from "drizzle-orm";

import { row } from "./helpers/rows.ts";
import { withExitCodeAsync } from "./helpers/exit-code.ts";
import { testServices } from "./helpers/services.ts";
import { idleDaemonState, servedServices } from "./helpers/daemon-state.ts";
import { isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";
import type { RpcServer } from "../src/types/daemon.ts";
const dirs: OrchDir[] = [];
const servers: RpcServer[] = [];
const SETTINGS = { defaults: { adapter: "pi", backend: "headless" } };
beforeEach(() => isolateOrchEnv());
afterEach(async () => {
  while (servers.length) await servers.pop()!.close();
  while (dirs.length) removeTempDir(dirs.pop()!);
  restoreOrchEnv();
});

function services(dir: OrchDir) {
  return testServices({ orchDir: dir, settings: SETTINGS });
}

function daemonState(dir: OrchDir) {
  return idleDaemonState(services(dir), dir);
}

function fixture(): OrchDir {
  const dir = tempOrchDir("orch-lease-command-");
  dirs.push(dir);
  ensureHarness(dir, "pi", "pi", 1);
  ensureHost(dir, "host", "host", "linux", 1);
  return dir;
}
function agent(dir: OrchDir, id: string, name = id, spawnedBy: string | null = null): void {
  insertAgent(dir, { id, name, spawnedBy, harnessId: "pi", cwd: dir, createdAt: 1 });
}

function liveHolder(dir: OrchDir, id = "foreign-orch"): void {
  agent(dir, id);
  const token = processStartToken(process.pid);
  if (!token) throw new Error("test process has no start token");
  orm(dir).run(sql`INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES (${id},${1},${"host"},${process.pid},${token})`);
}

// Command tests exercise the pure command operations so they do not need to boot a daemon.
describe("lease commands", () => {
  test("detach releases the lease and is a no-op when already unleased", () => {
    const dir = fixture();
    agent(dir, "orch"); agent(dir, "new-orch"); agent(dir, "worker", "worker");
    acquireLease(dir, "worker", "orch", 2);
    expect(detachAgent(dir, "worker", "orch", { now: 3 })).toMatchObject({ released: true, name: "worker" });
    expect(currentLease(dir, "worker")).toBeNull();
    expect(adoptAgent(dir, "worker", "new-orch", { now: 4 })).toMatchObject({ adopted: true, name: "worker" });
    expect(currentLease(dir, "worker")?.orchId).toBe("new-orch");
    // Rule 11: a lease excludes only while its holder is ALIVE. "new-orch" has no
    // process, so its lease is a stale row and detach clears it. Refusing here is
    // what stranded a fleet: every driving verb is gated on the lease, so detach
    // is the only way out and must never be blocked by the thing it exists to clear.
    expect(detachAgent(dir, "worker", "orch", { now: 5 })).toMatchObject({ released: true });
    expect(currentLease(dir, "worker")).toBeNull();
  });

  test("a LIVE foreign holder still excludes everyone else", () => {
    const dir = fixture();
    agent(dir, "orch"); agent(dir, "worker", "worker");
    liveHolder(dir, "live-orch");
    acquireLease(dir, "worker", "live-orch", 2);
    expect(() => detachAgent(dir, "worker", "orch", { now: 3 })).toThrow(/leased by live orch/);
    expect(currentLease(dir, "worker")?.orchId).toBe("live-orch");
  });

  test("adopt takes an unleased agent and a dead holder", () => {
    const dir = fixture();
    agent(dir, "new-orch"); agent(dir, "old-orch"); agent(dir, "worker", "worker");
    acquireLease(dir, "worker", "old-orch", 2);
    expect(adoptAgent(dir, "worker", "new-orch", { now: 3 })).toMatchObject({ adopted: true, name: "worker" });
    expect(currentLease(dir, "worker")?.orchId).toBe("new-orch");
    expect(row(orm(dir), sql`SELECT release_reason FROM agent_leases WHERE orch_id = ${"old-orch"}`))
      .toMatchObject({ release_reason: "adopted" });
  });

  test("adopt refuses a holder with a live recorded process", () => {
    const dir = fixture();
    agent(dir, "new-orch"); agent(dir, "old-orch"); agent(dir, "worker", "worker");
    orm(dir).run(sql`INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES (${"old-orch"},${1},${"host"},${process.pid},${processStartToken(process.pid)})`);
    acquireLease(dir, "worker", "old-orch", 2);
    expect(() => adoptAgent(dir, "worker", "new-orch", { now: 3 })).toThrow("worker is leased by live orch old-orch.");
  });

  test("reap refuses when a live descendant exists, regardless of lease", () => {
    const dir = fixture();
    agent(dir, "root"); agent(dir, "root-holder"); agent(dir, "child", "live-child", "root");
    acquireLease(dir, "root", "root-holder", 2);
    expect(() => reapAgent(dir, "root")).toThrow(/live-child/);
  });

  test("reap refuses while the recorded process is alive", () => {
    const dir = fixture();
    agent(dir, "worker", "worker");
    orm(dir).run(sql`INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES (${"worker"},${2},${"host"},${process.pid},${processStartToken(process.pid)})`);
    expect(() => reapAgent(dir, "worker")).toThrow(/close first/);
  });

  test("reap is never lease-gated and removes the record and presence", () => {
    const dir = fixture();
    agent(dir, "worker", "worker"); agent(dir, "other-orch");
    acquireLease(dir, "worker", "other-orch", 2);
    const dirPath = presenceAgentDir("worker", dir);
    mkdirSync(dirPath, { recursive: true });
    writeFileSync(join(dirPath, "status.json"), "{}\n");
    expect(reapAgent(dir, "worker")).toMatchObject({ name: "worker" });
    expect(row(orm(dir), sql`SELECT id FROM agents WHERE id = ${"worker"}`)).toBeUndefined();
  });

  test("abort proceeds with a foreign live-holder lease", () => {
    const dir = fixture();
    process.env.ORCH_DIR = dir;
    const key = mintAgentId();
    agent(dir, key, "abort-worker");
    liveHolder(dir);
    acquireLease(dir, key, "foreign-orch", 2);
    seedSpace(dir, "space");
    placeAgent(key, { backend: "headless", space: "space", handle: "abort-handle" }, dir);
    const dirPath = presenceAgentDir(key, dir);
    mkdirSync(dirPath, { recursive: true });
    writeFileSync(join(dirPath, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, state: "idle" }));

    // Rule 11: `abort`/`close`/`reap` are NEVER gated — the human must always be
    // able to kill from CLI or web, whether or not a live foreign orch holds the
    // lease. Abort must therefore PROCEED here and must not steal the lease.
    // Headless composes no agentInput: it has channel, capture and process roles
    // and no pane roles, so this asserts the refusal is absent,
    // not that any keystroke was sent.
    expect(headlessBackend.agentInput).toBeNull();
    expect(() => { cmdAbort(services(dir), [key, "--json"]); }).not.toThrow();
    expect(currentLease(dir, key)?.orchId).toBe("foreign-orch");
  });

  test("close proceeds with a foreign live-holder lease", async () => {
    const dir = fixture();
    process.env.ORCH_DIR = dir;
    const key = mintAgentId();
    agent(dir, key, "close-worker");
    liveHolder(dir);
    acquireLease(dir, key, "foreign-orch", 2);
    seedSpace(dir, "space");
    placeAgent(key, { backend: "headless", space: "space", handle: "close-handle" }, dir);
    const dirPath = presenceAgentDir(key, dir);
    mkdirSync(dirPath, { recursive: true });
    writeFileSync(join(dirPath, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, state: "idle" }));
    const served = await servedServices({ orchDir: dir, settings: SETTINGS }, servers);

    await withExitCodeAsync(() => cmdClose(served, [key, "--json"]));

    expect(spawnedRecords(dir).has(key)).toBe(false);
    expect(row(orm(dir), sql`SELECT id FROM agents WHERE id = ${key}`)).toBeDefined();
    expect(currentLease(dir, key)?.orchId).toBe("foreign-orch");
  });

  test("reap proceeds with a foreign live-holder lease", async () => {
    const dir = fixture();
    process.env.ORCH_DIR = dir;
    const key = mintAgentId();
    agent(dir, key, "reap-worker");
    liveHolder(dir);
    acquireLease(dir, key, "foreign-orch", 2);
    const served = await servedServices({ orchDir: dir, settings: SETTINGS }, servers);

    await cmdReap(served, [key, "--json"]);

    expect(row(orm(dir), sql`SELECT id FROM agents WHERE id = ${key}`)).toBeUndefined();
  });

  test("reset driving verb refuses a foreign live-holder lease", () => {
    const dir = fixture();
    const key = "reset-worker";
    agent(dir, key);
    liveHolder(dir);
    acquireLease(dir, key, "foreign-orch", 2);

    // governWrite is the daemon gate used by reset (and dispatch/steer/model).
    expect(() => governWrite(daemonState(dir), key, { actor: "caller-orch" })).toThrow(/foreign-orch/);
  });
});
