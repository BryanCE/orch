import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { allAdapters } from "../src/adapters/registry.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnOneIntoTab } from "../src/commands/spawn/placement.ts";
import { cmdClose } from "../src/commands/lifecycle/close.ts";
import { processStartToken } from "../src/process-identity.ts";
import { spawnedRecords } from "../src/presence/store.ts";
import { claimAgent } from "../src/store/agent-rows.ts";
import { orm } from "../src/store/connection.ts";
import { callerOwnerToken } from "../src/commands/target.ts";
import { selfId } from "../src/identity/self.ts";
import { writeSettingsFixture } from "../test/helpers/settings.ts";
import { removeTempDir, tempOrchDir } from "../test/helpers/tempdir.ts";
import { FakePanedBackend, fakePane, withRegisteredBackend } from "../test/helpers/backend.ts";
import { fakeAdapter } from "../test/helpers/adapter.ts";
import { seedSpace } from "../test/helpers/space.ts";
import { placeAgent, seedAgent, seedLiveProcess } from "../test/helpers/agent.ts";
import { seedStatus } from "../test/helpers/presence.ts";
import { peerView } from "../src/daemon/peer-view.ts";
import { sql } from "drizzle-orm";
import { isolateOrchEnv, restoreOrchEnv } from "../test/helpers/env.ts";
import { withExitCode } from "../test/helpers/exit-code.ts";
import { testServices } from "../test/helpers/services.ts";

import type { OrchDir } from "../src/types/core.ts";
const fixtureSettings = {
  enabled: { adapters: ["pi"], backends: ["headless"] },
  defaults: { adapter: "pi", backend: "headless" },
};
const binPath = join(import.meta.dir, "..", "bin", "orch.ts");
const dirs: OrchDir[] = [];
const children: ChildProcess[] = [];
/** Processes started as nobody's child (see {@link spawnOrphanSleeper}), killed after each test. */
const orphans: number[] = [];
/** Every env name a harness uses to mark the shell it runs in as a driving session. */
const SESSION_ENV = allAdapters()
  .flatMap((adapter) => [adapter.sessionEnvMarker, adapter.sessionIdEnv, adapter.sessionPidEnv])
  .filter((name): name is string => name !== undefined);

/**
 * A live process that is NOT this test's child. `runCli` blocks in spawnSync
 * while orch signals the target, so a direct child could not be reaped and
 * would linger as a zombie that orch reads as still running after SIGTERM.
 */
function spawnOrphanSleeper(): number {
  const launcher = "const child = require('node:child_process').spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], { detached: true, stdio: 'ignore' }); child.unref(); console.log(child.pid);";
  const pid = Number(execFileSync(process.execPath, ["-e", launcher], { encoding: "utf8" }).trim());
  orphans.push(pid);
  return pid;
}
const oldDir = process.env.ORCH_DIR;
const oldOwner = process.env.ORCH_OWNER;
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

function recordProcess(dir: OrchDir, key: string, pid: number, startToken: string): void {
  const db = orm(dir);
  db.run(sql`INSERT OR IGNORE INTO harnesses(id,name,enabled_at) VALUES ('pi','pi',NULL)`);
  db.run(sql`INSERT OR IGNORE INTO hosts(id,name,os,created_at) VALUES ('test-host','test-host','linux',1)`);
  db.run(sql`INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES (${key},${key},${"pi"},${dir},${key},${1})`);
  db.run(sql`INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES (${key},${1},${"test-host"},${pid},${startToken})`);
}

function runCli(dir: OrchDir, args: string[], owner?: string, extraEnv?: Record<string, string>): { status: number | null; output: string } {
  const env: Record<string, string | undefined> = { ...process.env, ORCH_DIR: dir };
  if (owner === undefined) delete env.ORCH_OWNER;
  else env.ORCH_OWNER = owner;
  // The caller is an operator unless a test explicitly makes it a spawned agent:
  // no launch credential, and no harness session marker inherited from the
  // terminal this suite runs in (a session caller is walled by its lease).
  delete env[LAUNCH_ENV];
  for (const name of SESSION_ENV) delete env[name];
  Object.assign(env, extraEnv);
  const result = Bun.spawnSync([process.execPath, binPath, ...args], {
    env,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 15_000,
  });
  return { status: result.exitCode, output: `${result.stdout.toString()}\n${result.stderr.toString()}` };
}

afterAll(() => {
  if (oldPane === undefined) delete process.env.HERDR_PANE_ID; else process.env.HERDR_PANE_ID = oldPane;
  if (oldTab === undefined) delete process.env.HERDR_TAB_ID; else process.env.HERDR_TAB_ID = oldTab;
  if (oldWorkspace === undefined) delete process.env.HERDR_WORKSPACE_ID; else process.env.HERDR_WORKSPACE_ID = oldWorkspace;
});

afterEach(async () => {
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
  if (oldOwner === undefined) delete process.env.ORCH_OWNER; else process.env.ORCH_OWNER = oldOwner;
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

    expect(peerView(dir, root, [child, grandchild, foreignRoot], true).visible).toEqual([child, grandchild, foreignRoot]);
    expect(peerView(dir, child, [root, grandchild, foreignRoot], true).visible).toEqual([grandchild]);
    expect(peerView(dir, grandchild, [root, child, foreignRoot], true).visible).toEqual([]);
  });

  test("owner token uses ORCH_OWNER, else this process's own minted id", () => {
    const dir = makeDir();
    process.env.ORCH_OWNER = "override";
    expect(callerOwnerToken(dir)).toBe("override");
    // The stamped owner must equal the daemon write actor, or an orchestrator
    // cannot control the agents it spawned. It is never the raw backend pane id.
    delete process.env.ORCH_OWNER;
    expect(callerOwnerToken(dir)).toBe(selfId(dir));
  });

  test("spawn stamps the owner token from ORCH_OWNER on its record", () => {
    const dir = makeDir();
    process.env.ORCH_OWNER = "orch-owner";
    seedSpace(dir, "local");
    delete process.env.HERDR_PANE_ID;
    const backend = new FakePanedBackend({ id: "headless" });

    const agent = spawnOneIntoTab(dir, {
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
    });

    expect(spawnedRecords(dir).get(agent.key)?.heldBy?.orchId).toBe("orch-owner");
  });

  test("close --all works without an owner token", () => {
    const dir = makeDir();
    delete process.env.ORCH_OWNER;
    delete process.env.HERDR_PANE_ID;
    delete process.env.TMUX_PANE;
    seedSpace(dir, "local");
    seedAgent("kunowned01", { adapter: "pi", backend: "headless", space: "local", handle: "unowned", owner: "other" }, dir);
    const result = runCli(dir, ["close", "--all", "--json"], undefined);
    expect(result.status).toBe(0);
    expect(spawnedRecords(dir).has("kunowned01")).toBe(false);
  });

  test("close --all closes all managed records regardless of owner", () => {
    const dir = makeDir();
    process.env.ORCH_OWNER = "caller";
    seedSpace(dir, "local");
    seedAgent("klmine0001", { adapter: "pi", backend: "headless", space: "local", handle: "mine", owner: "caller" }, dir);
    seedAgent("klforeign1", { adapter: "pi", backend: "headless", space: "local", handle: "foreign", owner: "other" }, dir);

    // `user-pane` is listed but never orch-spawned: `close --all` sweeps only
    // panes orch owns records for, never the user's own.
    const backend = new FakePanedBackend({ panes: ["mine", "foreign", "user-pane"].map((handle) => fakePane(handle, { space: "local" })) });
    withExitCode(() => withRegisteredBackend(backend, () => { cmdClose(testServices({ orchDir: dir, settings: fixtureSettings }), ["--all", "--json"]); }));

    // Sweep order is not part of the contract.
    expect([...backend.closed].sort()).toEqual(["foreign", "mine"]);
  });

  test("driving verbs remain gated against a live foreign holder", () => {
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
      const result = runCli(dir, [verb, key, ...(arg ? [arg] : [])], "caller-orchestrator");
      expect(result.status).not.toBe(0);
      expect(result.output).toContain("other-orchestrator");
      removeTempDir(dirs.pop()!);
    }
    // One real CLI spawn per driving verb; the default 5s covers none of them
    // on a host that starts processes slowly.
  }, 30_000);

  // Reading is control too: agent names are one flat namespace across sessions,
  // so an unscoped `orch result` hands a foreign orchestrator's work product back
  // as if this session had produced it.
  test("result refuses a foreign-owned agent and names its owner", () => {
    const dir = makeDir();
    const key = "kfrgnresu1";
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: process.pid, agent: "pi", state: "done" }));
    writeFileSync(join(dir, "agents", key, "results.jsonl"), `${JSON.stringify({ text: "other session's answer" })}\n`);
    seedSpace(dir, "local");
    seedAgent(key, { backend: "headless", adapter: "pi", space: "local", handle: key, owner: "other-orchestrator" }, dir);

    const refused = runCli(dir, ["result", key], "caller-orchestrator");
    expect(refused.status).not.toBe(0);
    expect(refused.output).toContain("other-orchestrator");
    expect(refused.output).not.toContain("other session's answer");

    const forced = runCli(dir, ["result", key, "--force"], "caller-orchestrator");
    expect(forced.output).toContain("other session's answer");
  }, 15_000);

  // Other pane mutations remain gated; ending is intentionally ungated.
  test("pane mutations refuse a foreign-owned agent and name its owner", () => {
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
      const result = runCli(dir, args, "caller-orchestrator");
      expect(result.status).not.toBe(0);
      expect(result.output).toContain("other-orchestrator");
    }
  }, 30_000);

  test("close has no force option and remains unconditional without it", () => {
    const dir = makeDir();
    const key = "kforced001";
    const pid = spawnOrphanSleeper();
    const startToken = processStartToken(pid)!;
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid, agent: "pi", state: "working" }));
    recordProcess(dir, key, pid, startToken);
    seedSpace(dir, "local");
    placeAgent(key, { backend: "headless", adapter: "pi", space: "local", handle: JSON.stringify({ pid, key }), owner: "other-orchestrator" }, dir);

    const refused = runCli(dir, ["close", key, "--force"], "caller-orchestrator");
    expect(refused.status).not.toBe(0);
    expect(refused.output).toContain("usage: orch close");
    expect(spawnedRecords(dir).has(key)).toBe(true);

    const result = runCli(dir, ["close", key], "caller-orchestrator");
    expect(result.status).toBe(0);
    expect(spawnedRecords(dir).has(key)).toBe(false);
  }, 15_000);

  test("close cleans up a mismatched recorded process without signalling", () => {
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
    withExitCode(() => withRegisteredBackend(backend, () => { cmdClose(testServices({ orchDir: dir, settings: fixtureSettings }), [key, "--json"]); }));

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

  test("--cross-space from a spawned agent is refused", () => {
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

    const result = runCli(dir, ["dispatch", key, "hi", "--cross-space"], undefined, {
      [LAUNCH_ENV]: agentKey,
      PI_CODING_AGENT: "1",
      PI_SESSION_ID: sessionToken,
    });
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("operator-only");
  }, 15_000);

  test("close --all from an AGENT sweeps only its own subtree", () => {
    const dir = makeDir();
    seedSpace(dir, "wF");
    // An agent's sweep reaches only what it owns: what it spawned or adopted.
    seedAgent(agentKey, { adapter: "pi", backend: "headless", space: "wF", handle: agentKey }, dir);
    seedAgent("kwfmine001", { adapter: "pi", backend: "headless", space: "wF", handle: "mine", spawnedBy: agentKey }, dir);
    seedAgent("kwftheirs1", { adapter: "pi", backend: "headless", space: "wF", handle: "theirs", spawnedBy: "kwfoperato" }, dir);

    const result = runCli(dir, ["close", "--all", "--json"], undefined, { [LAUNCH_ENV]: agentKey });
    expect(result.status).toBe(0);
    expect(spawnedRecords(dir).has("kwfmine001")).toBe(false);
    // Another orch's slave survives a sibling's sweep. A `--all` that reached it
    // would let any agent on the machine wipe every other fleet.
    expect(spawnedRecords(dir).has("kwftheirs1")).toBe(true);
  }, 15_000);

  test("close --all from the HUMAN sweeps every managed spawn, whoever spawned it", () => {
    const dir = makeDir();
    seedSpace(dir, "wF");
    seedAgent(agentKey, { adapter: "pi", backend: "headless", space: "wF", handle: agentKey }, dir);
    seedAgent("kwfmine001", { adapter: "pi", backend: "headless", space: "wF", handle: "mine", spawnedBy: agentKey }, dir);
    seedAgent("kwftheirs1", { adapter: "pi", backend: "headless", space: "wF", handle: "theirs", spawnedBy: "kwfoperato" }, dir);

    // No [LAUNCH_ENV]: the caller is a person at a terminal. Rule 11 - the
    // human must ALWAYS be able to stop a runaway agent, so nothing gates this.
    const result = runCli(dir, ["close", "--all", "--json"]);
    expect(result.status).toBe(0);
    expect(spawnedRecords(dir).has("kwfmine001")).toBe(false);
    expect(spawnedRecords(dir).has("kwftheirs1")).toBe(false);
  }, 15_000);

  test("close from a spawned agent is REFUSED when the target is not its own", () => {
    const dir = makeDir();
    const key = "kwfvictim1";
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: 99999999, agent: "pi", state: "working" }));
    seedSpace(dir, "wF");
    seedAgent(key, { backend: "headless", adapter: "pi", space: "wF", handle: key, spawnedBy: "kwfoperato" }, dir);

    const result = runCli(dir, ["close", key], undefined, { [LAUNCH_ENV]: agentKey });
    // An agent may not close what it neither spawned nor adopted; the refusal says who to ask.
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("not yours to close");
    expect(spawnedRecords(dir).has(key)).toBe(true);
  }, 15_000);

  test("close from a spawned agent SUCCEEDS on a slave it spawned itself", () => {
    const dir = makeDir();
    const key = "kwfownslav";
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: 99999999, agent: "pi", state: "working" }));
    seedSpace(dir, "wF");
    seedAgent(agentKey, { backend: "headless", adapter: "pi", space: "wF", handle: agentKey }, dir);
    seedAgent(key, { backend: "headless", adapter: "pi", space: "wF", handle: key, spawnedBy: agentKey }, dir);

    const result = runCli(dir, ["close", key], undefined, { [LAUNCH_ENV]: agentKey });
    expect({ status: result.status, output: result.output }).toMatchObject({ status: 0 });
    expect(spawnedRecords(dir).has(key)).toBe(false);
  }, 15_000);

  test("the workspace operator keeps control of an agent-owned fleet", () => {
    const dir = makeDir();
    const key = "kwfworkerb";
    mkdirSync(join(dir, "agents", key), { recursive: true });
    // A dead pid: close must reap the record, never signal a live process here.
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: 99999999, agent: "pi", state: "working" }));
    seedSpace(dir, "wF");
    seedAgent(key, { backend: "headless", adapter: "pi", space: "wF", handle: key, owner: agentKey }, dir);

    const result = runCli(dir, ["close", key], "kwfoperato");
    // Assert on the pair so a non-zero exit prints what orch actually said.
    expect({ status: result.status, output: result.output }).toMatchObject({ status: 0 });
    expect(spawnedRecords(dir).has(key)).toBe(false);
  }, 15_000);
});
