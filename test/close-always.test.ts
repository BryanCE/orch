import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { cmdAbort, cmdClose } from "../src/commands/lifecycle.ts";
import { headlessBackend } from "../src/backends/headless/index.ts";
import { recordSpawned, spawnedRecords } from "../src/presence/store.ts";
import { openStore } from "../src/store/connection.ts";
import { processIsAlive, processStartToken } from "../src/process-identity.ts";
import { checkWall } from "../src/policy/workspace.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const binPath = join(import.meta.dir, "..", "bin", "orch.ts");
const dirs: string[] = [];
const children: ChildProcess[] = [];
const oldDir = process.env.ORCH_DIR;
const oldOwner = process.env.ORCH_OWNER;

function makeDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-close-always-"));
  dirs.push(dir);
  writeSettingsFixture(dir, {
    enabled: { adapters: ["pi"], backends: ["headless"] },
    defaults: { adapter: "pi", backend: "headless" },
  });
  process.env.ORCH_DIR = dir;
  process.env.ORCH_OWNER = "caller";
  return dir;
}

function runCli(dir: string, args: string[]): { status: number | null; output: string } {
  const result = Bun.spawnSync([process.execPath, binPath, ...args], {
    env: { ...process.env, ORCH_DIR: dir, ORCH_OWNER: "caller" },
    stdout: "pipe",
    stderr: "pipe",
    timeout: 15_000,
  });
  return { status: result.exitCode, output: `${result.stdout.toString()}\n${result.stderr.toString()}` };
}

function writeStatus(dir: string, key: string, handle: string, pid: number): void {
  const agentDir = join(dir, "agents", key);
  mkdirSync(agentDir, { recursive: true });
  writeFileSync(join(agentDir, "status.json"), JSON.stringify({
    schema: PRESENCE_SCHEMA, key, paneId: handle,
    pid, agent: "pi", state: "working",
  }));
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

afterEach(async () => {
  const spawned = children.splice(0);
  for (const child of spawned) {
    if (child.pid) { try { process.kill(child.pid, "SIGTERM"); } catch {} }
  }
  await Promise.all(spawned.map((child) => child.exitCode !== null
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
      const bound = setTimeout(resolve, 2_000);
      child.once("close", () => { clearTimeout(bound); resolve(); });
    })));
  while (dirs.length) removeTempDir(dirs.pop()!);
  if (oldDir === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = oldDir;
  if (oldOwner === undefined) delete process.env.ORCH_OWNER; else process.env.ORCH_OWNER = oldOwner;
});

describe("close always works", () => {
  test("closes a foreign-workspace target by name, key, or pane id", () => {
    const dir = makeDir();
    const records = [
      ["headless~foreign~pane-name", "pane-name", "worker-name"],
      ["headless~foreign~pane-key", "pane-key", null],
      ["headless~foreign~pane-id", "pane-id", null],
    ] as const;
    for (const [key, handle] of records) {
      recordSpawned(key, { backend: "headless", workspace: "foreign-workspace", handle, owner: "caller" });
      writeStatus(dir, key, handle, 99999999);
    }

    const backend = headlessBackend as typeof headlessBackend & {
      capabilities: { panes: boolean };
      inventory?: () => { handle: string; workspace: string; name: string | null }[];
    };
    // Exercise the in-process backend seam explicitly; headless normally has no pane capability.
    const oldPanes = backend.capabilities.panes;
    const oldInventory = backend.inventory?.bind(backend);
    const oldClose = backend.close.bind(backend);
    const closed: string[] = [];
    backend.capabilities.panes = true;
    backend.inventory = () => records
      .filter(([, handle]) => !closed.includes(handle))
      .map(([, handle, name]) => ({ handle, workspace: "foreign-workspace", name }));
    backend.close = (handle) => { closed.push(typeof handle === "string" ? handle : handle.key); return true; };
    try {
      cmdClose(["worker-name", "headless~foreign~pane-key", "pane-id", "--json"]);
    } finally {
      backend.capabilities.panes = oldPanes;
      if (oldInventory) backend.inventory = oldInventory;
      else delete backend.inventory;
      backend.close = oldClose;
    }

    expect(closed).toEqual(["pane-name", "pane-key", "pane-id"]);
    for (const [key] of records) {
      expect(spawnedRecords().has(key)).toBe(false);
      expect(existsSync(join(dir, "agents", key))).toBe(false);
    }
  });

  test("a successful backend close retains a pane that is still listed", () => {
    const dir = makeDir();
    const key = "headless~foreign~pane-survives";
    const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60000)"], { detached: true });
    children.push(child);
    const pid = child.pid!;
    recordProcess(dir, key, pid, processStartToken(pid)!);
    recordSpawned(key, { backend: "headless", workspace: "foreign-workspace", handle: key, owner: "caller" });
    writeStatus(dir, key, key, pid);
    const backend = headlessBackend as typeof headlessBackend & {
      capabilities: { panes: boolean };
      inventory?: () => { handle: string }[];
    };
    const oldPanes = backend.capabilities.panes;
    const oldInventory = backend.inventory?.bind(backend);
    const oldClose = backend.close.bind(backend);
    const oldExit = process.exit;
    const oldExitCode = process.exitCode;
    backend.capabilities.panes = true;
    backend.inventory = () => [{ handle: key }];
    backend.close = () => true;
    process.exit = ((code?: number) => { process.exitCode = code ?? 0; }) as typeof process.exit;
    try {
      cmdClose([key, "--json"]);
      expect(process.exitCode).toBe(1);
      expect(spawnedRecords().has(key)).toBe(true);
      expect(existsSync(join(dir, "agents", key))).toBe(true);
    } finally {
      process.exit = oldExit;
      process.exitCode = oldExitCode;
      backend.capabilities.panes = oldPanes;
      if (oldInventory) backend.inventory = oldInventory;
      else delete backend.inventory;
      backend.close = oldClose;
    }
  });

  test("a failed signal retains the registry and presence and reports failure", () => {
    const dir = makeDir();
    const key = "headless~foreign~signal-failed";
    const pid = process.pid;
    const startToken = processStartToken(pid)!;
    const db = openStore(dir);
    db.query("INSERT OR IGNORE INTO harnesses(id,name,enabled_at) VALUES ('pi','pi',NULL)").run();
    db.query("INSERT OR IGNORE INTO hosts(id,name,os,created_at) VALUES ('test-host','test-host','linux',1)").run();
    db.query("INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES (?,?,?,?,?,?)")
      .run(key, key, "pi", dir, key, 1);
    db.query("INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES (?,?,?,?,?)")
      .run(key, 1, "test-host", pid, startToken);
    recordSpawned(key, { backend: "headless", workspace: "foreign-workspace", handle: key, owner: "other" });
    writeStatus(dir, key, key, pid);

    const originalKill = process.kill.bind(process);
    const originalExit = process.exit;
    const oldExitCode = process.exitCode;
    process.kill = ((target: number, signal?: NodeJS.Signals | 0) => {
      if (target === pid && signal === "SIGTERM") throw new Error("signal denied");
      return originalKill(target, signal as 0 | NodeJS.Signals | undefined);
    }) as typeof process.kill;
    process.exit = ((code?: number) => { process.exitCode = code ?? 0; }) as typeof process.exit;
    try {
      cmdClose([key, "--json"]);
      expect(process.exitCode).toBe(1);
      expect(spawnedRecords().has(key)).toBe(true);
      expect(existsSync(join(dir, "agents", key))).toBe(true);
    } finally {
      process.kill = originalKill;
      process.exit = originalExit;
      process.exitCode = oldExitCode;
    }
  });

  test("presence pid without a recorded process closes the pane without signalling and reaps", () => {
    const dir = makeDir();
    const key = "headless~foreign~presence-only";
    const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60000)"], { detached: true });
    children.push(child);
    const pid = child.pid!;
    recordSpawned(key, { backend: "headless", workspace: "foreign-workspace", handle: key, owner: "caller" });
    writeStatus(dir, key, key, pid);

    const backend = headlessBackend as typeof headlessBackend & { capabilities: { panes: boolean } };
    const oldPanes = backend.capabilities.panes;
    const oldClose = backend.close.bind(backend);
    let paneClosed = false;
    const oldExitCode = process.exitCode;
    backend.capabilities.panes = true;
    backend.close = () => { paneClosed = true; return true; };
    try { cmdClose([key, "--json"]); } finally {
      process.exitCode = oldExitCode;
      backend.capabilities.panes = oldPanes;
      backend.close = oldClose;
    }

    expect(paneClosed).toBe(true);
    expect(processIsAlive(pid)).toBe(true);
    expect(spawnedRecords().has(key)).toBe(false);
    expect(existsSync(join(dir, "agents", key))).toBe(false);
  });

  test("close ignores owner and spawnedBy gates", () => {
    makeDir();
    const key = "headless~foreign~owned";
    recordSpawned(key, { backend: "headless", workspace: "foreign-workspace", handle: key, owner: "other", spawnedBy: "other-session" });
    const backend = headlessBackend as typeof headlessBackend & { capabilities: { panes: boolean } };
    const oldPanes = backend.capabilities.panes;
    const oldClose = backend.close.bind(backend);
    let closed = false;
    backend.capabilities.panes = true;
    backend.close = () => { closed = true; return true; };
    try { cmdClose([key, "--json"]); } finally {
      backend.capabilities.panes = oldPanes;
      backend.close = oldClose;
    }
    expect(closed).toBe(true);
    expect(spawnedRecords().has(key)).toBe(false);
  });

  test("abort ignores owner gate", () => {
    makeDir();
    const key = "headless~foreign~abort";
    recordSpawned(key, { backend: "headless", workspace: "foreign-workspace", handle: key, owner: "other", spawnedBy: "other-session" });
    const backend = headlessBackend as Omit<typeof headlessBackend, "canSendKeys"> & { canSendKeys: boolean };
    const oldCan = backend.canSendKeys;
    const oldSend = backend.sendKeys.bind(backend);
    let sends = 0;
    backend.canSendKeys = true;
    backend.sendKeys = () => { sends++; return true; };
    try { cmdAbort([key, "--json"]); } finally { backend.canSendKeys = oldCan; backend.sendKeys = oldSend; }
    expect(sends).toBe(2);
  });

  test("duplicate close targets count once", () => {
    const dir = makeDir();
    const key = "headless~foreign~duplicate";
    recordSpawned(key, { backend: "headless", workspace: "foreign-workspace", handle: key, owner: "caller" });
    const oldExitCode = process.exitCode;
    const originalExit = process.exit;
    process.exit = ((code?: number) => { process.exitCode = code ?? 0; }) as typeof process.exit;
    try {
      cmdClose([key, key, "--json"]);
      expect(process.exitCode).toBe(oldExitCode);
      expect(spawnedRecords().has(key)).toBe(false);
    } finally {
      process.exit = originalExit;
      process.exitCode = oldExitCode;
    }
  });

  test("dead pane-less close is a successful no-op that reaps registry and presence", () => {
    const dir = makeDir();
    const key = "headless~foreign~dead-pane";
    const handle = "99999999";
    recordSpawned(key, { backend: "headless", workspace: "foreign-workspace", handle, owner: "caller" });
    const agentDir = join(dir, "agents", key);
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(join(agentDir, "status.json"), JSON.stringify({
      schema: PRESENCE_SCHEMA, key, pid: 99999999, agent: "pi", state: "done",
    }));

    const result = runCli(dir, ["close", key, "--json"]);

    expect(result.status).toBe(0);
    expect(spawnedRecords().has(key)).toBe(false);
    expect(existsSync(agentDir)).toBe(false);
  }, 15_000);

  test("steer remains blocked by the workspace wall", () => {
    const dir = makeDir();
    recordSpawned("headless~workspace-a~operator", { backend: "headless", workspace: "workspace-a", handle: "operator" });
    recordSpawned("headless~workspace-b~pane", { backend: "headless", workspace: "workspace-b", handle: "pane" });
    const decision = checkWall(dir, "headless~workspace-a~operator", "headless~workspace-b~pane", { crossWorkspace: false });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("workspace wall");
  });
});
