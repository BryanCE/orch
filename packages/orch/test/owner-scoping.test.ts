import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnOneIntoTab } from "../src/commands/spawn/placement.ts";
import { cmdClose } from "../src/commands/lifecycle/close.ts";
import { commandHandlers } from "../src/commands/index.ts";
import { CommandRefusal } from "../src/refusal.ts";
import { processStartToken } from "../src/process-identity.ts";
import { recordAgentStatus, spawnedRecords } from "../src/presence/store.ts";
import { claimAgent } from "../src/store/agent-rows.ts";
import { upsertRun } from "../src/store/run-rows.ts";
import { orm } from "../src/store/connection.ts";
import { selfId } from "../src/identity/self.ts";
import { writeSettingsFixture } from "../test/helpers/settings.ts";
import { removeTempDir, tempOrchDir } from "../test/helpers/tempdir.ts";
import { FakePanedBackend, fakePane, withRegisteredBackendAsync } from "../test/helpers/backend.ts";
import { fakeAdapter } from "../test/helpers/adapter.ts";
import { seedSpace } from "../test/helpers/space.ts";
import { placeAgent, seedAgent, seedLiveProcess, seedOperator } from "../test/helpers/agent.ts";
import { seedStatus } from "../test/helpers/presence.ts";
import { peerView } from "../src/daemon/server/peer-view.ts";
import { sql } from "drizzle-orm";
import { isolateOrchEnv, restoreOrchEnv } from "../test/helpers/env.ts";
import { withExitCodeAsync } from "../test/helpers/exit-code.ts";
import { captureStdout } from "../test/helpers/stdout.ts";
import { servedServices } from "../test/helpers/daemon-state.ts";
import { testServices } from "../test/helpers/services.ts";

import type { OrchDir } from "../src/types/core.ts";
import type { RpcServer } from "../src/types/daemon.ts";
import type { Services } from "../src/types/services.ts";
const fixtureSettings = {
  enabled: { adapters: ["pi"], backends: ["headless"] },
  defaults: { adapter: "pi", backend: "headless" },
};
const dirs: OrchDir[] = [];
const servers: RpcServer[] = [];
/** Dirs {@link runVerb} already serves: one orchd per dir, however many runs. */
const servedDirs = new Set<OrchDir>();
const children: ChildProcess[] = [];
/** Processes started as nobody's child (see {@link spawnOrphanSleeper}), killed after each test. */
const orphans: number[] = [];

/**
 * A live process that is NOT this test's child. Close signals the target and
 * reads it back before this event loop reaps anything, so a direct child would
 * linger as a zombie that orch reads as still running after SIGTERM.
 */
function spawnOrphanSleeper(): number {
  const launcher = "const child = require('node:child_process').spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], { detached: true, stdio: 'ignore' }); child.unref(); console.log(child.pid);";
  const pid = Number(execFileSync(process.execPath, ["-e", launcher], { encoding: "utf8" }).trim());
  orphans.push(pid);
  return pid;
}
const oldDir = process.env.ORCH_DIR;
const oldPane = process.env.HERDR_PANE_ID;
const oldTab = process.env.HERDR_TAB_ID;
const oldWorkspace = process.env.HERDR_WORKSPACE_ID;
const oldTmuxPane = process.env.TMUX_PANE;
delete process.env.HERDR_PANE_ID;
delete process.env.HERDR_TAB_ID;
delete process.env.HERDR_WORKSPACE_ID;

beforeEach(() => {
  isolateOrchEnv();
});

function makeDir(): OrchDir {
  const dir = tempOrchDir("orch-owner-scope-");
  dirs.push(dir);
  writeSettingsFixture(dir, fixtureSettings);
  process.env.ORCH_DIR = dir;
  return dir;
}

/** An in-process command writes through orchd: serve the real handler table on this dir. */
function commandServices(dir: OrchDir): Promise<Services> {
  return servedServices({ orchDir: dir, settings: fixtureSettings }, servers);
}

function recordProcess(dir: OrchDir, key: string, pid: number, startToken: string): void {
  const db = orm(dir);
  db.run(sql`INSERT OR IGNORE INTO harnesses(id,name,enabled_at) VALUES ('pi','pi',NULL)`);
  db.run(sql`INSERT OR IGNORE INTO hosts(id,name,os,created_at) VALUES ('test-host','test-host','linux',1)`);
  db.run(sql`INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES (${key},${key},${"pi"},${dir},${key},${1})`);
  db.run(sql`INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES (${key},${1},${"test-host"},${pid},${startToken})`);
}

/** What the CLI boundary would print for one verb: its stdout and exit code, or
 *  the refusal it raised as status 1. The command runs in-process against orchd
 *  served on `dir`. The caller is an UNREGISTERED operator unless `extraEnv` hands
 *  it a launch credential: `isolateOrchEnv` cleared every marker the terminal this
 *  suite runs in could have passed down (a session caller is walled by its lease). */
async function runVerb(dir: OrchDir, [verb, ...args]: string[], extraEnv: Record<string, string> = {}): Promise<{ status: number; output: string }> {
  if (verb === undefined) throw new Error("runVerb needs a verb");
  const handler = commandHandlers[verb];
  if (handler === undefined) throw new Error(`no command named ${verb}`);
  const services = servedDirs.has(dir) ? testServices({ orchDir: dir, settings: fixtureSettings }) : await commandServices(dir);
  servedDirs.add(dir);
  const saved = Object.fromEntries(Object.keys(extraEnv).map((name) => [name, process.env[name]]));
  Object.assign(process.env, extraEnv);
  let status = 0;
  try {
    const output = await captureStdout(async () => {
      await handler(services, args);
      if (typeof process.exitCode === "number") status = process.exitCode;
    });
    return { status, output };
  } catch (error: unknown) {
    if (error instanceof CommandRefusal) return { status: 1, output: error.message };
    throw error;
  } finally {
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

afterAll(() => {
  if (oldPane === undefined) delete process.env.HERDR_PANE_ID; else process.env.HERDR_PANE_ID = oldPane;
  if (oldTab === undefined) delete process.env.HERDR_TAB_ID; else process.env.HERDR_TAB_ID = oldTab;
  if (oldWorkspace === undefined) delete process.env.HERDR_WORKSPACE_ID; else process.env.HERDR_WORKSPACE_ID = oldWorkspace;
});

afterEach(async () => {
  while (servers.length) await servers.pop()!.close();
  servedDirs.clear();
  for (const pid of orphans.splice(0)) { try { process.kill(pid, "SIGKILL"); } catch {} }
  const spawned = children.splice(0);
  for (const child of spawned) {
    if (child.pid) { try { process.kill(child.pid, "SIGTERM"); } catch {} }
  }
  await Promise.all(spawned.map((child) => child.exitCode !== null
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
      // The timer bounds a child that ignores SIGTERM; clearing it on close is what
      // keeps a child that exited at once from holding the loop open for two seconds.
      const bound = setTimeout(resolve, 2_000);
      child.once("close", () => { clearTimeout(bound); resolve(); });
    })));
  while (dirs.length) removeTempDir(dirs.pop()!);
  if (oldDir === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = oldDir;
  delete process.env.HERDR_PANE_ID;
  delete process.env.HERDR_TAB_ID;
  delete process.env.HERDR_WORKSPACE_ID;
  if (oldTmuxPane === undefined) delete process.env.TMUX_PANE; else process.env.TMUX_PANE = oldTmuxPane;
  restoreOrchEnv();
});

describe("fleet ownership scoping", () => {
  test("fleet visibility follows provenance depth, not caller environment", () => {
    const dir = makeDir();
    const root = "root000001";
    const child = "child00001";
    const grandchild = "grand00001";
    const foreignRoot = "other00001";
    seedSpace(dir, "space-root");
    seedSpace(dir, "space-child");
    seedAgent(root, { adapter: "pi", backend: "headless", space: "space-root" }, dir);
    seedAgent(child, { adapter: "pi", backend: "headless", space: "space-child", spawnedBy: root }, dir);
    seedAgent(grandchild, { adapter: "pi", backend: "headless", space: "space-child", spawnedBy: child }, dir);
    seedAgent(foreignRoot, { adapter: "pi", backend: "headless", space: "space-root" }, dir);
    // Liveness is the store's process row, never the pid a status file claims.
    for (const key of [root, child, grandchild, foreignRoot]) seedLiveProcess(dir, key);
    seedStatus(dir, root, { state: "working", project: "/other/project" });
    seedStatus(dir, child, { state: "working", project: process.cwd() });
    seedStatus(dir, grandchild, { state: "working", project: process.cwd() });
    seedStatus(dir, foreignRoot, { state: "working", project: "/other/project" });
    // Identity is injected through ownKey; no launch credential is set.
    delete process.env[LAUNCH_ENV];

    // A root may cross fleets. A non-root sees its descendants and its ancestors
    // (the reply path to its spawner), never a foreign fleet.
    expect(peerView(dir, root, [child, grandchild, foreignRoot], true).visible).toEqual([child, grandchild, foreignRoot]);
    expect(peerView(dir, child, [root, grandchild, foreignRoot], true).visible).toEqual([root, grandchild]);
    expect(peerView(dir, grandchild, [root, child, foreignRoot], true).visible).toEqual([root, child]);
  });

  test("owner token is this process's own registered id, and nothing before it registers", () => {
    const dir = makeDir();
    expect(selfId(dir)).toBeUndefined();
    // The stamped owner must equal the daemon write actor, or an orchestrator
    // cannot control the agents it spawned. It is never the raw backend pane id.
    const orchId = seedOperator(dir);
    expect(selfId(dir)).toBe(orchId);
  });

  test("spawn stamps the caller's registered id as the holder on its record", async () => {
    const dir = makeDir();
    const orchId = seedOperator(dir);
    seedSpace(dir, "local");
    delete process.env.HERDR_PANE_ID;
    const backend = new FakePanedBackend({ id: "headless" });

    const agent = await spawnOneIntoTab(await commandServices(dir), {
      backend,
      adapter: fakeAdapter(),
      adapterId: "pi",
      name: "worker-1",
      cwd: dir,
      space: "local",
      group: "tab-1",
      model: "openai/gpt-5.6",
      thinking: "medium",
      preferredModels: [],
      spawner: { key: orchId, label: "operator" }, owner: orchId,
    });

    expect(spawnedRecords(dir).get(agent.key)?.heldBy?.orchId).toBe(orchId);
  });

  test("close --all works from an unregistered shell", async () => {
    const dir = makeDir();
    delete process.env.HERDR_PANE_ID;
    delete process.env.TMUX_PANE;
    seedSpace(dir, "local");
    seedAgent("kunowned01", { adapter: "pi", backend: "headless", space: "local", handle: "unowned", owner: "other" }, dir);
    const result = await runVerb(dir, ["close", "--all", "--json"]);
    expect(result.status).toBe(0);
    expect(spawnedRecords(dir).has("kunowned01")).toBe(false);
  });

  test("close --all closes all managed records regardless of owner", async () => {
    const dir = makeDir();
    seedSpace(dir, "local");
    seedAgent("klmine0001", { adapter: "pi", backend: "headless", space: "local", handle: "mine", owner: "caller" }, dir);
    seedAgent("klforeign1", { adapter: "pi", backend: "headless", space: "local", handle: "foreign", owner: "other" }, dir);
    const services = await commandServices(dir);

    // `user-pane` is listed but never orch-spawned: `close --all` sweeps only
    // panes orch owns records for, never the user's own.
    const backend = new FakePanedBackend({ panes: ["mine", "foreign", "user-pane"].map((handle) => fakePane(handle, { space: "local" })) });
    await withExitCodeAsync(() => withRegisteredBackendAsync(backend, () => cmdClose(services, ["--all", "--json"])));

    // Sweep order is not part of the contract.
    expect([...backend.closed].sort()).toEqual(["foreign", "mine"]);
  });

  test("driving verbs remain gated against a live foreign holder", async () => {
    const commands: readonly (readonly [string, string?])[] = [
      ["dispatch", "hello"],
      ["steer", "hello"],
      ["model", "openai/gpt-5.6"],
      ["reset"],
    ];
    for (const [verb, arg] of commands) {
      const dir = makeDir();
      const key = `kfrgn${verb.slice(0, 5).padEnd(5, "x")}`;
      mkdirSync(join(dir, "agents", key), { recursive: true });
      writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({
        schema: PRESENCE_SCHEMA, key, pid: process.pid, startToken: processStartToken(process.pid), agent: "pi", state: "working",
      }));
      seedSpace(dir, "local");
      seedAgent(key, { backend: "headless", adapter: "pi", space: "local", handle: key, owner: "other-orchestrator" }, dir);
      const result = await runVerb(dir, [verb, key, ...(arg ? [arg] : [])]);
      expect(result.status).not.toBe(0);
      expect(result.output).toContain("other-orchestrator");
      await servers.pop()!.close();
      servedDirs.delete(dir);
      removeTempDir(dirs.pop()!);
    }
  });

  // Reading is control too: agent names are one flat namespace across sessions,
  // so an unscoped `orch result` hands a foreign orchestrator's work product back
  // as if this session had produced it.
  test("result refuses a foreign-owned agent and names its owner", async () => {
    const dir = makeDir();
    const key = "kfrgnresu1";
    seedSpace(dir, "local");
    seedAgent(key, { backend: "headless", adapter: "pi", space: "local", handle: key, owner: "other-orchestrator" }, dir);
    recordAgentStatus(dir, key, { state: "done" }, Date.now());
    upsertRun(dir, { dispatchId: "d-foreign", agentKey: key, state: "done", startedAt: Date.now(), result: "other session's answer" });

    const refused = await runVerb(dir, ["result", key]);
    expect(refused.status).not.toBe(0);
    expect(refused.output).toContain("other-orchestrator");
    expect(refused.output).not.toContain("other session's answer");

    const forced = await runVerb(dir, ["result", key, "--force"]);
    expect(forced.output).toContain("other session's answer");
  });

  // Other pane mutations remain gated; ending is intentionally ungated.
  test("pane mutations refuse a foreign-owned agent and name its owner", async () => {
    const dir = makeDir();
    const key = "kfrgnpane1";
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: process.pid, agent: "pi", state: "working" }));
    seedSpace(dir, "local");
    seedAgent(key, { backend: "headless", adapter: "pi", space: "local", handle: key, owner: "other-orchestrator" }, dir);

    const mutations = [
      ["rename", key, "hijacked"],
      ["keys", key, "Escape"],
      ["focus", key],
      ["move", key, "--new-tab"],
    ];
    for (const args of mutations) {
      const result = await runVerb(dir, args);
      expect(result.status).not.toBe(0);
      expect(result.output).toContain("other-orchestrator");
    }
  });

  test("close has no force option and remains unconditional without it", async () => {
    const dir = makeDir();
    const key = "kforced001";
    const pid = spawnOrphanSleeper();
    const startToken = processStartToken(pid)!;
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid, agent: "pi", state: "working" }));
    recordProcess(dir, key, pid, startToken);
    seedSpace(dir, "local");
    placeAgent(key, { backend: "headless", adapter: "pi", space: "local", handle: JSON.stringify({ pid, key }), owner: "other-orchestrator" }, dir);

    const refused = await runVerb(dir, ["close", key, "--force"]);
    expect(refused.status).not.toBe(0);
    expect(refused.output).toContain("usage: orch close");
    expect(spawnedRecords(dir).has(key)).toBe(true);

    const result = await runVerb(dir, ["close", key]);
    expect(result.status).toBe(0);
    expect(spawnedRecords(dir).has(key)).toBe(false);
  });

  test("close cleans up a mismatched recorded process without signalling", async () => {
    const dir = makeDir();
    const key = "kmismatch1";
    const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60000)"], { detached: true });
    children.push(child);
    const pid = child.pid!;
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid, agent: "pi", state: "working" }));
    recordProcess(dir, key, pid, "not-this-process-instance");
    seedSpace(dir, "local");
    placeAgent(key, { backend: "headless", adapter: "pi", space: "local", handle: JSON.stringify({ pid, key }), owner: "other-orchestrator" }, dir);

    // A paned environment is COMPOSED, not faked onto the headless singleton:
    // E13 made the roles a provider composes the capability, so there is no
    // `capabilities` flag to flip and no shared object to mutate.
    const handle = JSON.stringify({ pid, key });
    const backend = new FakePanedBackend({ panes: [fakePane(handle)] });
    const services = await commandServices(dir);
    await withExitCodeAsync(() => withRegisteredBackendAsync(backend, () => cmdClose(services, [key, "--json"])));

    expect(backend.closed).toEqual([handle]);
    expect(child.exitCode).toBeNull();
    expect(spawnedRecords(dir).has(key)).toBe(false);
    expect(existsSync(join(dir, "agents", key))).toBe(true);
  }, 15_000);
});

// One agent ran `close --all` under the shared workspace-operator token and
// killed every fleet in the workspace. A spawned agent now acts as ITSELF —
// its own minted key — and no flag widens that to anyone else's agents.
describe("a spawned agent touches only what it spawned", () => {
  const agentKey = "kwfworkera";

  // Identity is a minted id and NOTHING else. A launch key carries no
  // plexer and no space, so there is nothing left to mistake for identity.
  test("a spawned agent acts as its own minted id, not its launch key", () => {
    const dir = makeDir();
    process.env[LAUNCH_ENV] = agentKey;
    try {
      expect(selfId(dir)).toBe(agentKey);
    } finally {
      delete process.env[LAUNCH_ENV];
    }
  });

  test("--cross-space from a spawned agent is refused", async () => {
    const dir = makeDir();
    const key = "kwbvictim1";
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: 99999999, agent: "pi", state: "working" }));
    seedSpace(dir, "wB");
    const rootKey = "kwfroot001";
    const sessionToken = "owner-scope-session";
    seedAgent(rootKey, { adapter: "pi", backend: "headless" }, dir);
    seedAgent(agentKey, { adapter: "pi", backend: "headless", spawnedBy: rootKey }, dir);
    expect(claimAgent(dir, agentKey, sessionToken, 1_000)).toEqual({ kind: "stamped" });
    seedAgent(key, { backend: "headless", adapter: "pi", space: "wB", handle: key }, dir);

    const result = await runVerb(dir, ["dispatch", key, "hi", "--cross-space"], {
      [LAUNCH_ENV]: agentKey,
      PI_CODING_AGENT: "1",
      PI_SESSION_ID: sessionToken,
    });
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("operator-only");
  });

  test("close --all from an AGENT sweeps only its own subtree", async () => {
    const dir = makeDir();
    seedSpace(dir, "wF");
    // An agent's sweep reaches only what it owns: what it spawned or adopted.
    seedAgent(agentKey, { adapter: "pi", backend: "headless", space: "wF", handle: agentKey }, dir);
    seedAgent("kwfmine001", { adapter: "pi", backend: "headless", space: "wF", handle: "mine", spawnedBy: agentKey }, dir);
    seedAgent("kwftheirs1", { adapter: "pi", backend: "headless", space: "wF", handle: "theirs", spawnedBy: "kwfoperato" }, dir);

    const result = await runVerb(dir, ["close", "--all", "--json"], { [LAUNCH_ENV]: agentKey });
    expect(result.status).toBe(0);
    expect(spawnedRecords(dir).has("kwfmine001")).toBe(false);
    // Another orch's slave survives a sibling's sweep. A `--all` that reached it
    // would let any agent on the machine wipe every other fleet.
    expect(spawnedRecords(dir).has("kwftheirs1")).toBe(true);
  });

  test("close --all from the HUMAN sweeps every managed spawn, whoever spawned it", async () => {
    const dir = makeDir();
    seedSpace(dir, "wF");
    seedAgent(agentKey, { adapter: "pi", backend: "headless", space: "wF", handle: agentKey }, dir);
    seedAgent("kwfmine001", { adapter: "pi", backend: "headless", space: "wF", handle: "mine", spawnedBy: agentKey }, dir);
    seedAgent("kwftheirs1", { adapter: "pi", backend: "headless", space: "wF", handle: "theirs", spawnedBy: "kwfoperato" }, dir);

    // No [LAUNCH_ENV]: the caller is a person at a terminal. Rule 11 - the
    // human must ALWAYS be able to stop a runaway agent, so nothing gates this.
    const result = await runVerb(dir, ["close", "--all", "--json"]);
    expect(result.status).toBe(0);
    expect(spawnedRecords(dir).has("kwfmine001")).toBe(false);
    expect(spawnedRecords(dir).has("kwftheirs1")).toBe(false);
  });

  test("close from a spawned agent is REFUSED when the target is not its own", async () => {
    const dir = makeDir();
    const key = "kwfvictim1";
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: 99999999, agent: "pi", state: "working" }));
    seedSpace(dir, "wF");
    seedAgent(key, { backend: "headless", adapter: "pi", space: "wF", handle: key, spawnedBy: "kwfoperato" }, dir);

    const result = await runVerb(dir, ["close", key], { [LAUNCH_ENV]: agentKey });
    // An agent may not close what it neither spawned nor adopted; the refusal says who to ask.
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("not yours to close");
    expect(spawnedRecords(dir).has(key)).toBe(true);
  });

  test("close from a spawned agent SUCCEEDS on a slave it spawned itself", async () => {
    const dir = makeDir();
    const key = "kwfownslav";
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: 99999999, agent: "pi", state: "working" }));
    seedSpace(dir, "wF");
    seedAgent(agentKey, { backend: "headless", adapter: "pi", space: "wF", handle: agentKey }, dir);
    seedAgent(key, { backend: "headless", adapter: "pi", space: "wF", handle: key, spawnedBy: agentKey }, dir);

    const result = await runVerb(dir, ["close", key], { [LAUNCH_ENV]: agentKey });
    expect({ status: result.status, output: result.output }).toMatchObject({ status: 0 });
    expect(spawnedRecords(dir).has(key)).toBe(false);
  });

  test("the workspace operator keeps control of an agent-owned fleet", async () => {
    const dir = makeDir();
    const key = "kwfworkerb";
    mkdirSync(join(dir, "agents", key), { recursive: true });
    // A dead pid: close must reap the record, never signal a live process here.
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: 99999999, agent: "pi", state: "working" }));
    seedSpace(dir, "wF");
    seedAgent(key, { backend: "headless", adapter: "pi", space: "wF", handle: key, owner: agentKey }, dir);

    const result = await runVerb(dir, ["close", key]);
    // Assert on the pair so a non-zero exit prints what orch actually said.
    expect({ status: result.status, output: result.output }).toMatchObject({ status: 0 });
    expect(spawnedRecords(dir).has(key)).toBe(false);
  });
});
