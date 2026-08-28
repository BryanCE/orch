import { spawn, type ChildProcess } from "node:child_process";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { spawnOneIntoTab } from "../src/commands/spawn.ts";
import { cmdClose } from "../src/commands/lifecycle.ts";
import { processStartToken } from "../src/process-identity.ts";
import { headlessBackend } from "../src/backends/headless/index.ts";
import { spawnedRecords, recordSpawned } from "../src/presence/store.ts";
import { insertSpawnedRecord } from "../src/store/spawned-rows.ts";
import { openStore } from "../src/store/connection.ts";
import type { Backend, BackendTarget } from "../src/backends/backend.ts";
import { callerOwnerToken } from "../src/commands/target.ts";
import { selfActor } from "../src/entities.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const binPath = join(import.meta.dir, "..", "bin", "orch.ts");
const dirs: string[] = [];
const children: ChildProcess[] = [];
const oldDir = process.env.ORCH_DIR;
const oldOwner = process.env.ORCH_OWNER;
const oldPane = process.env.HERDR_PANE_ID;
const oldTmuxPane = process.env.TMUX_PANE;

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
  if (oldPane === undefined) delete process.env.HERDR_PANE_ID; else process.env.HERDR_PANE_ID = oldPane;
  if (oldTmuxPane === undefined) delete process.env.TMUX_PANE; else process.env.TMUX_PANE = oldTmuxPane;
});

describe("fleet ownership scoping", () => {
  test("owner token uses ORCH_OWNER, else the write actor (selfActor)", () => {
    process.env.ORCH_OWNER = "override";
    expect(callerOwnerToken()).toBe("override");
    // The stamped owner must equal the daemon write actor, or an orchestrator
    // cannot control the agents it spawned. It is never the raw backend pane id.
    delete process.env.ORCH_OWNER;
    expect(callerOwnerToken()).toBe(selfActor() ?? undefined);
  });

  test("spawn stamps the owner token from ORCH_OWNER on its record", () => {
    const dir = makeDir();
    process.env.ORCH_OWNER = "orch-owner";
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
      workspace: "local",
      group: "tab-1",
      model: "openai/gpt-5.6",
      preferredModels: [],
    });

    expect(spawnedRecords().get(agent.key)?.owner).toBe("orch-owner");
  });

  test("close --all works without an owner token", () => {
    const dir = makeDir();
    delete process.env.ORCH_OWNER;
    delete process.env.HERDR_PANE_ID;
    delete process.env.TMUX_PANE;
    recordSpawned("headless~local~unowned", { backend: "headless", workspace: "local", handle: "unowned", owner: "other" });
    const result = runCli(dir, ["close", "--all", "--json"], undefined);
    expect(result.status).toBe(0);
    expect(spawnedRecords().has("headless~local~unowned")).toBe(false);
  });

  test("close --all closes all managed records regardless of owner", () => {
    makeDir();
    process.env.ORCH_OWNER = "caller";
    recordSpawned("headless~local~mine", { backend: "headless", workspace: "local", handle: "mine", owner: "caller" });
    recordSpawned("headless~local~foreign", { backend: "headless", workspace: "local", handle: "foreign", owner: "other" });

    const closed: string[] = [];
    const backend = headlessBackend as Backend & { capabilities: { panes: boolean } };
    // Exercise the in-process backend seam explicitly; headless normally has no pane capability.
    const originalPanes = backend.capabilities.panes;
    const originalInventory = backend.inventory?.bind(backend);
    const originalClose = backend.close.bind(backend);
    // The inventory also contains an unmanaged user pane; --all must ignore it.
    backend.capabilities.panes = true;
    backend.inventory = () => ["mine", "foreign", "user-pane"]
      .filter((handle) => !closed.includes(handle))
      .map((handle) => ({ handle })) as BackendTarget[];
    backend.close = (handle) => { closed.push(String(handle)); return true; };
    try {
      cmdClose(["--all", "--json"]);
    } finally {
      backend.capabilities.panes = originalPanes;
      if (originalInventory) backend.inventory = originalInventory;
      else delete backend.inventory;
      backend.close = originalClose;
    }

    expect(closed).toEqual(["mine", "foreign"]);
  });

  test("explicit foreign target closes successfully", () => {
    const dir = makeDir();
    const key = "headless~local~foreign";
    const signalPath = join(dir, "sigterm.txt");
    const child = spawn(process.execPath, ["-e", `process.on(\"SIGTERM\", () => { require(\"node:fs\").writeFileSync(${JSON.stringify(signalPath)}, \"term\"); process.exit(0); }); setTimeout(() => {}, 60000)`], { detached: true });
    children.push(child);
    const pid = child.pid!;
    const startToken = processStartToken(pid)!;
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid, agent: "pi", state: "working" }));
    recordProcess(dir, key, pid, startToken);
    insertSpawnedRecord(dir, { pane: key, backend: "headless", adapter: "pi", handle: JSON.stringify({ pid, key }) });
    recordSpawned(key, { backend: "headless", adapter: "pi", workspace: "local", handle: JSON.stringify({ pid, key }), owner: "other-orchestrator" });

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
      const key = `headless~local~foreign-${verb}`;
      mkdirSync(join(dir, "agents", key), { recursive: true });
      writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({
        schema: PRESENCE_SCHEMA, key, pid: process.pid, startToken: processStartToken(process.pid), agent: "pi", state: "working",
      }));
      recordSpawned(key, { backend: "headless", adapter: "pi", workspace: "local", handle: key, owner: "other-orchestrator" });
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
    const key = "headless~local~foreign-result";
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: process.pid, agent: "pi", state: "done" }));
    writeFileSync(join(dir, "agents", key, "result.json"), JSON.stringify({ text: "other session's answer" }));
    recordSpawned(key, { backend: "headless", adapter: "pi", workspace: "local", handle: key, owner: "other-orchestrator" });

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
    const key = "headless~local~foreign-pane";
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: process.pid, agent: "pi", state: "working" }));
    recordSpawned(key, { backend: "headless", adapter: "pi", workspace: "local", handle: key, owner: "other-orchestrator" });

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
    const key = "headless~local~forced";
    const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60000)"], { detached: true });
    children.push(child);
    const pid = child.pid!;
    const startToken = processStartToken(pid)!;
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid, agent: "pi", state: "working" }));
    recordProcess(dir, key, pid, startToken);
    insertSpawnedRecord(dir, { pane: key, backend: "headless", adapter: "pi", handle: JSON.stringify({ pid, key }) });
    recordSpawned(key, { backend: "headless", adapter: "pi", workspace: "local", handle: JSON.stringify({ pid, key }), owner: "other-orchestrator" });

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
    const key = "headless~local~mismatched";
    const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60000)"], { detached: true });
    children.push(child);
    const pid = child.pid!;
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid, agent: "pi", state: "working" }));
    recordProcess(dir, key, pid, "not-this-process-instance");
    recordSpawned(key, { backend: "headless", adapter: "pi", workspace: "local", handle: JSON.stringify({ pid, key }), owner: "other-orchestrator" });

    const backend = headlessBackend as typeof headlessBackend & { capabilities: { panes: boolean } };
    const oldPanes = backend.capabilities.panes;
    const oldClose = backend.close.bind(backend);
    let paneClosed = false;
    backend.capabilities.panes = true;
    backend.close = () => { paneClosed = true; return true; };
    try {
      cmdClose([key, "--json"]);
    } finally {
      backend.capabilities.panes = oldPanes;
      backend.close = oldClose;
    }

    expect(paneClosed).toBe(true);
    expect(child.exitCode).toBeNull();
    expect(spawnedRecords().has(key)).toBe(false);
    expect(existsSync(join(dir, "agents", key))).toBe(false);
  }, 15_000);
});

// One agent ran `close --all` under the shared workspace-operator token and
// killed every fleet in the workspace. A spawned agent now acts as ITSELF —
// its own minted key — and no flag widens that to anyone else's agents.
describe("a spawned agent touches only what it spawned", () => {
  const agentKey = "headless~wF~worker-a";

  test("selfActor is the agent's own key inside a spawned agent", () => {
    process.env.ORCH_AGENT_KEY = agentKey;
    try {
      expect(selfActor()).toBe(agentKey);
    } finally {
      delete process.env.ORCH_AGENT_KEY;
    }
  });

  test("--cross-workspace from a spawned agent is refused", () => {
    const dir = makeDir();
    const key = "headless~wB~victim";
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: 99999999, agent: "pi", state: "working" }));
    recordSpawned(key, { backend: "headless", adapter: "pi", workspace: "wB", handle: key });

    const result = runCli(dir, ["dispatch", key, "hi", "--cross-workspace"], undefined, { ORCH_AGENT_KEY: agentKey });
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("operator-only");
  }, 15_000);

  test("close --all sweeps every managed spawn", () => {
    const dir = makeDir();
    recordSpawned("headless~wF~mine", { backend: "headless", workspace: "wF", handle: "mine", owner: agentKey });
    recordSpawned("headless~wF~theirs", { backend: "headless", workspace: "wF", handle: "theirs", owner: "herdr~wF~operator" });

    const result = runCli(dir, ["close", "--all", "--json"], undefined, { ORCH_AGENT_KEY: agentKey });
    expect(result.status).toBe(0);
    expect(spawnedRecords().has("headless~wF~mine")).toBe(false);
    expect(spawnedRecords().has("headless~wF~theirs")).toBe(false);
  }, 15_000);

  test("close from a spawned agent is unconditional", () => {
    const dir = makeDir();
    const key = "headless~wF~victim";
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: 99999999, agent: "pi", state: "working" }));
    recordSpawned(key, { backend: "headless", adapter: "pi", workspace: "wF", handle: key, owner: "herdr~wF~operator" });

    const result = runCli(dir, ["close", key], undefined, { ORCH_AGENT_KEY: agentKey });
    expect(result.status).toBe(0);
    expect(spawnedRecords().has(key)).toBe(false);
  }, 15_000);

  test("the workspace operator keeps control of an agent-owned fleet", () => {
    const dir = makeDir();
    const key = "herdr~wF~worker-b";
    mkdirSync(join(dir, "agents", key), { recursive: true });
    // A dead pid: close must reap the record, never signal a live process here.
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: 99999999, agent: "pi", state: "working" }));
    recordSpawned(key, { backend: "herdr", adapter: "pi", workspace: "wF", handle: key, owner: agentKey });

    const result = runCli(dir, ["close", key], "herdr~wF~operator");
    // Assert on the pair so a non-zero exit prints what orch actually said.
    expect({ status: result.status, output: result.output }).toMatchObject({ status: 0 });
    expect(spawnedRecords().has(key)).toBe(false);
  }, 15_000);
});
