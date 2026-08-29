import { spawn, type ChildProcess } from "node:child_process";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { spawnOneIntoTab } from "../src/commands/spawn.ts";
import { cmdClose } from "../src/commands/lifecycle.ts";
import { processStartToken } from "../src/process-identity.ts";
import { spawnedRecords } from "../src/presence/store.ts";
import { openStore } from "../src/store/connection.ts";
import { callerOwnerToken } from "../src/commands/target.ts";
import { selfId } from "../src/identity/self.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { FakePanedBackend, fakePane, withRegisteredBackend } from "./helpers/backend.ts";
import { seedSpace } from "./helpers/space.ts";
import type { Backend } from "../src/types/backend.ts";
import { placeAgent, seedAgent } from "./helpers/agent.ts";

const binPath = join(import.meta.dir, "..", "bin", "orch.ts");
const dirs: string[] = [];
const children: ChildProcess[] = [];
const oldDir = process.env.ORCH_DIR;
const oldOwner = process.env.ORCH_OWNER;
const oldPane = process.env.HERDR_PANE_ID;
const oldTab = process.env.HERDR_TAB_ID;
const oldWorkspace = process.env.HERDR_WORKSPACE_ID;
const oldTmuxPane = process.env.TMUX_PANE;
delete process.env.HERDR_PANE_ID;
delete process.env.HERDR_TAB_ID;
delete process.env.HERDR_WORKSPACE_ID;

function makeDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-owner-scope-"));
  dirs.push(dir);
  writeSettingsFixture(dir, {
    enabled: { adapters: ["pi"], backends: ["headless"] },
    defaults: { adapter: "pi", backend: "headless" },
  });
  process.env.ORCH_DIR = dir;
  return dir;
}

function recordProcess(dir: string, key: string, pid: number, startToken: string): void {
  const db = openStore(dir);
  db.query("INSERT OR IGNORE INTO harnesses(id,name,enabled_at) VALUES ('pi','pi',NULL)").run();
  db.query("INSERT OR IGNORE INTO hosts(id,name,os,created_at) VALUES ('test-host','test-host','linux',1)").run();
  db.query("INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES (?,?,?,?,?,?)")
    .run(key, key, "pi", dir, key, 1);
  db.query("INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES (?,?,?,?,?)")
    .run(key, 1, "test-host", pid, startToken);
}

function runCli(dir: string, args: string[], owner?: string, extraEnv?: Record<string, string>): { status: number | null; output: string } {
  const env: Record<string, string | undefined> = { ...process.env, ORCH_DIR: dir };
  if (owner === undefined) delete env.ORCH_OWNER;
  else env.ORCH_OWNER = owner;
  // The caller is an operator unless a test explicitly makes it a spawned agent.
  delete env.ORCH_AGENT_KEY;
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
});

describe("fleet ownership scoping", () => {
  test("owner token uses ORCH_OWNER, else this process's own minted id", () => {
    process.env.ORCH_OWNER = "override";
    expect(callerOwnerToken()).toBe("override");
    // The stamped owner must equal the daemon write actor, or an orchestrator
    // cannot control the agents it spawned. It is never the raw backend pane id.
    delete process.env.ORCH_OWNER;
    expect(callerOwnerToken()).toBe(selfId());
  });

  test("spawn stamps the owner token from ORCH_OWNER on its record", () => {
    const dir = makeDir();
    process.env.ORCH_OWNER = "orch-owner";
    seedSpace(dir, "local");
    delete process.env.HERDR_PANE_ID;
    const backend = {
      id: "headless",
      spawn: () => "native-handle",
    } as unknown as Backend;

    const agent = spawnOneIntoTab({
      backend,
      adapter: {} as never,
      adapterId: "pi",
      name: "worker-1",
      cwd: dir,
      space: "local",
      group: "tab-1",
      model: "openai/gpt-5.6",
      preferredModels: [],
    });

    expect(spawnedRecords().get(agent.key)?.heldBy?.orchId).toBe("orch-owner");
  });

  test("close --all works without an owner token", () => {
    const dir = makeDir();
    delete process.env.ORCH_OWNER;
    delete process.env.HERDR_PANE_ID;
    delete process.env.TMUX_PANE;
    seedSpace(dir, "local");
    seedAgent("kunowned01", { adapter: "pi", backend: "headless", space: "local", handle: "unowned", owner: "other" });
    const result = runCli(dir, ["close", "--all", "--json"], undefined);
    expect(result.status).toBe(0);
    expect(spawnedRecords().has("kunowned01")).toBe(false);
  });

  test("close --all closes all managed records regardless of owner", () => {
    const dir = makeDir();
    process.env.ORCH_OWNER = "caller";
    seedSpace(dir, "local");
    seedAgent("klmine0001", { adapter: "pi", backend: "headless", space: "local", handle: "mine", owner: "caller" });
    seedAgent("klforeign1", { adapter: "pi", backend: "headless", space: "local", handle: "foreign", owner: "other" });

    // `user-pane` is listed but never orch-spawned: `close --all` sweeps only
    // panes orch owns records for, never the user's own.
    const backend = new FakePanedBackend({ panes: ["mine", "foreign", "user-pane"].map((handle) => fakePane(handle, { space: "local" })) });
    withRegisteredBackend(backend, () => { cmdClose(["--all", "--json"]); });

    // Sweep order is not part of the contract.
    expect([...backend.closed].sort()).toEqual(["foreign", "mine"]);
  });

  test("explicit foreign target closes successfully", () => {
    const dir = makeDir();
    const key = "klforeign1";
    const signalPath = join(dir, "sigterm.txt");
    const child = spawn(process.execPath, ["-e", `process.on(\"SIGTERM\", () => { require(\"node:fs\").writeFileSync(${JSON.stringify(signalPath)}, \"term\"); process.exit(0); }); setTimeout(() => {}, 60000)`], { detached: true });
    children.push(child);
    const pid = child.pid!;
    const startToken = processStartToken(pid)!;
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid, agent: "pi", state: "working" }));
    recordProcess(dir, key, pid, startToken);
    seedSpace(dir, "local");
    placeAgent(key, { backend: "headless", adapter: "pi", space: "local", handle: JSON.stringify({ pid, key }), owner: "other-orchestrator" });

    const result = runCli(dir, ["close", key], "caller-orchestrator");
    expect({ status: result.status, output: result.output }).toMatchObject({ status: 0 });
    expect(existsSync(signalPath)).toBe(true);
    expect(spawnedRecords().has(key)).toBe(false);
    expect(existsSync(join(dir, "agents", key))).toBe(false);
  }, 15_000);

  test("driving verbs remain gated against a live foreign holder", () => {
    const commands = [
      ["dispatch", "hello"],
      ["steer", "hello"],
      ["model", "openai/gpt-5.6"],
      ["reset"],
    ] as const;
    for (const [verb, arg] of commands) {
      const dir = makeDir();
      const key = `kfrgn${verb.slice(0, 5).padEnd(5, "x")}`;
      mkdirSync(join(dir, "agents", key), { recursive: true });
      writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({
        schema: PRESENCE_SCHEMA, key, pid: process.pid, startToken: processStartToken(process.pid), agent: "pi", state: "working",
      }));
      seedSpace(dir, "local");
      seedAgent(key, { backend: "headless", adapter: "pi", space: "local", handle: key, owner: "other-orchestrator" });
      const result = runCli(dir, [verb, key, ...(arg ? [arg] : [])], "caller-orchestrator");
      expect(result.status).not.toBe(0);
      expect(result.output).toContain("other-orchestrator");
      removeTempDir(dirs.pop()!);
    }
  });

  // Reading is control too: agent names are one flat namespace across sessions,
  // so an unscoped `orch result` hands a foreign orchestrator's work product back
  // as if this session had produced it.
  test("result refuses a foreign-owned agent and names its owner", () => {
    const dir = makeDir();
    const key = "kfrgnresu1";
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: process.pid, agent: "pi", state: "done" }));
    writeFileSync(join(dir, "agents", key, "result.json"), JSON.stringify({ text: "other session's answer" }));
    seedSpace(dir, "local");
    seedAgent(key, { backend: "headless", adapter: "pi", space: "local", handle: key, owner: "other-orchestrator" });

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
    seedAgent(key, { backend: "headless", adapter: "pi", space: "local", handle: key, owner: "other-orchestrator" });

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
    const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60000)"], { detached: true });
    children.push(child);
    const pid = child.pid!;
    const startToken = processStartToken(pid)!;
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid, agent: "pi", state: "working" }));
    recordProcess(dir, key, pid, startToken);
    seedSpace(dir, "local");
    placeAgent(key, { backend: "headless", adapter: "pi", space: "local", handle: JSON.stringify({ pid, key }), owner: "other-orchestrator" });

    const refused = runCli(dir, ["close", key, "--force"], "caller-orchestrator");
    expect(refused.status).not.toBe(0);
    expect(refused.output).toContain("usage: orch close");
    expect(spawnedRecords().has(key)).toBe(true);

    const result = runCli(dir, ["close", key], "caller-orchestrator");
    expect(result.status).toBe(0);
    expect(spawnedRecords().has(key)).toBe(false);
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
    placeAgent(key, { backend: "headless", adapter: "pi", space: "local", handle: JSON.stringify({ pid, key }), owner: "other-orchestrator" });

    // A paned environment is COMPOSED, not faked onto the headless singleton:
    // E13 made the roles a provider composes the capability, so there is no
    // `capabilities` flag to flip and no shared object to mutate.
    const handle = JSON.stringify({ pid, key });
    const backend = new FakePanedBackend({ panes: [fakePane(handle)] });
    withRegisteredBackend(backend, () => { cmdClose([key, "--json"]); });

    expect(backend.closed).toEqual([handle]);
    expect(child.exitCode).toBeNull();
    expect(spawnedRecords().has(key)).toBe(false);
    expect(existsSync(join(dir, "agents", key))).toBe(false);
  }, 15_000);
});

// One agent ran `close --all` under the shared workspace-operator token and
// killed every fleet in the workspace. A spawned agent now acts as ITSELF —
// its own minted key — and no flag widens that to anyone else's agents.
describe("a spawned agent touches only what it spawned", () => {
  const agentKey = "kwfworkera";

  // TASKS/01: identity is a minted id and NOTHING else. A launch key carries no
  // plexer and no space, so there is nothing left to mistake for identity.
  test("a spawned agent acts as its own minted id, not its launch key", () => {
    process.env.ORCH_AGENT_KEY = agentKey;
    try {
      expect(selfId()).toBe(agentKey);
    } finally {
      delete process.env.ORCH_AGENT_KEY;
    }
  });

  test("--cross-space from a spawned agent is refused", () => {
    const dir = makeDir();
    const key = "kwbvictim1";
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: 99999999, agent: "pi", state: "working" }));
    seedSpace(dir, "wB");
    seedAgent(key, { backend: "headless", adapter: "pi", space: "wB", handle: key });

    const result = runCli(dir, ["dispatch", key, "hi", "--cross-space"], undefined, { ORCH_AGENT_KEY: agentKey });
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("operator-only");
  }, 15_000);

  test("close --all from an AGENT sweeps only its own subtree", () => {
    const dir = makeDir();
    seedSpace(dir, "wF");
    // The caller is an agent, so ownership is the PROVENANCE chain: user -> orch
    // -> the slaves it owns. `owner` here is the LEASE, which answers who is
    // DRIVING and is deliberately not what ending is gated on - a lease can be
    // adopted, and adopting a driver must never hand over the right to end.
    // Provenance needs a spawner that EXISTS: `recordSpawned` drops a
    // `spawnedBy` naming no agent rather than inventing the row it points at.
    seedAgent(agentKey, { adapter: "pi", backend: "headless", space: "wF", handle: agentKey });
    seedAgent("kwfmine001", { adapter: "pi", backend: "headless", space: "wF", handle: "mine", spawnedBy: agentKey });
    seedAgent("kwftheirs1", { adapter: "pi", backend: "headless", space: "wF", handle: "theirs", spawnedBy: "kwfoperato" });

    const result = runCli(dir, ["close", "--all", "--json"], undefined, { ORCH_AGENT_KEY: agentKey });
    expect(result.status).toBe(0);
    expect(spawnedRecords().has("kwfmine001")).toBe(false);
    // Another orch's slave survives a sibling's sweep. A `--all` that reached it
    // would let any agent on the machine wipe every other fleet.
    expect(spawnedRecords().has("kwftheirs1")).toBe(true);
  }, 15_000);

  test("close --all from the HUMAN sweeps every managed spawn, whoever spawned it", () => {
    const dir = makeDir();
    seedSpace(dir, "wF");
    seedAgent(agentKey, { adapter: "pi", backend: "headless", space: "wF", handle: agentKey });
    seedAgent("kwfmine001", { adapter: "pi", backend: "headless", space: "wF", handle: "mine", spawnedBy: agentKey });
    seedAgent("kwftheirs1", { adapter: "pi", backend: "headless", space: "wF", handle: "theirs", spawnedBy: "kwfoperato" });

    // No ORCH_AGENT_KEY: the caller is a person at a terminal. Rule 11 - the
    // human must ALWAYS be able to stop a runaway agent, so nothing gates this.
    const result = runCli(dir, ["close", "--all", "--json"]);
    expect(result.status).toBe(0);
    expect(spawnedRecords().has("kwfmine001")).toBe(false);
    expect(spawnedRecords().has("kwftheirs1")).toBe(false);
  }, 15_000);

  test("close from a spawned agent is REFUSED when the target is not its own", () => {
    const dir = makeDir();
    const key = "kwfvictim1";
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: 99999999, agent: "pi", state: "working" }));
    seedSpace(dir, "wF");
    seedAgent(key, { backend: "headless", adapter: "pi", space: "wF", handle: key, spawnedBy: "kwfoperato" });

    const result = runCli(dir, ["close", key], undefined, { ORCH_AGENT_KEY: agentKey });
    // An agent reaches only its own provenance subtree. The refusal has to say
    // whose it is and who to ask, or the agent has nothing to do but retry.
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("not yours to close");
    expect(spawnedRecords().has(key)).toBe(true);
  }, 15_000);

  test("close from a spawned agent SUCCEEDS on a slave it spawned itself", () => {
    const dir = makeDir();
    const key = "kwfownslav";
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: 99999999, agent: "pi", state: "working" }));
    seedSpace(dir, "wF");
    seedAgent(agentKey, { backend: "headless", adapter: "pi", space: "wF", handle: agentKey });
    seedAgent(key, { backend: "headless", adapter: "pi", space: "wF", handle: key, spawnedBy: agentKey });

    const result = runCli(dir, ["close", key], undefined, { ORCH_AGENT_KEY: agentKey });
    expect({ status: result.status, output: result.output }).toMatchObject({ status: 0 });
    expect(spawnedRecords().has(key)).toBe(false);
  }, 15_000);

  test("the workspace operator keeps control of an agent-owned fleet", () => {
    const dir = makeDir();
    const key = "kwfworkerb";
    mkdirSync(join(dir, "agents", key), { recursive: true });
    // A dead pid: close must reap the record, never signal a live process here.
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: 99999999, agent: "pi", state: "working" }));
    seedSpace(dir, "wF");
    seedAgent(key, { backend: "herdr", adapter: "pi", space: "wF", handle: key, owner: agentKey });

    const result = runCli(dir, ["close", key], "kwfoperato");
    // Assert on the pair so a non-zero exit prints what orch actually said.
    expect({ status: result.status, output: result.output }).toMatchObject({ status: 0 });
    expect(spawnedRecords().has(key)).toBe(false);
  }, 15_000);
});
