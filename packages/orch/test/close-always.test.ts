import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { cmdAbort, cmdClose } from "../src/commands/lifecycle/close.ts";
import { recordAgentStatus, spawnedRecords } from "../src/presence/store.ts";
import { agentView } from "../src/store/agent-view.ts";
import { orm } from "../src/store/connection.ts";
import { processIsAlive, processStartToken } from "../src/process-identity.ts";
import { checkWall } from "../src/policy/space.ts";
import { FakePanedBackend, fakePane, withRegisteredBackendAsync } from "../test/helpers/backend.ts";
import { seedSpace } from "../test/helpers/space.ts";
import { writeSettingsFixture } from "../test/helpers/settings.ts";
import { removeTempDir, tempOrchDir } from "../test/helpers/tempdir.ts";
import { placeAgent, seedAgent } from "../test/helpers/agent.ts";
import { withExitCodeAsync } from "../test/helpers/exit-code.ts";
import { servedServices } from "../test/helpers/daemon-state.ts";
import { sql } from "drizzle-orm";

import type { OrchDir } from "../src/types/core.ts";
import type { RpcServer } from "../src/types/daemon.ts";
/**
 * Identity is a minted id and NOTHING else, so
 * every fixture below addresses its agent by a minted-shaped id. The plexer,
 * the space and the pane handle are ENVIRONMENT: they are stated as
 * `recordSpawned` options, land in their own satellites, and are read back
 * through the composer — never spelled into the key and never parsed out of it.
 */
const dirs: OrchDir[] = [];
const servers: RpcServer[] = [];
const children: ChildProcess[] = [];
const oldDir = process.env.ORCH_DIR;
const testSettings = {
  enabled: { adapters: ["pi"], backends: ["headless"] },
  defaults: { adapter: "pi", backend: "headless" },
};

function makeDir(): OrchDir {
  const dir = tempOrchDir("orch-close-always-");
  dirs.push(dir);
  writeSettingsFixture(dir, testSettings);
  process.env.ORCH_DIR = dir;
  return dir;
}

/** `orch close` in-process, its writes served by orchd on `dir`; `backend` is
 *  the paned environment registered for the call. */
async function closeInProcess(dir: OrchDir, args: string[], backend?: FakePanedBackend): Promise<void> {
  const services = await servedServices({ orchDir: dir, settings: testSettings }, servers);
  if (backend) await withRegisteredBackendAsync(backend, () => cmdClose(services, args));
  else await cmdClose(services, args);
}

/** A working agent as orchd records one: the status row, plus the history
 *  directory orchd opens on the first report. Close ends the row and leaves the history. */
function writeStatus(dir: OrchDir, key: string): void {
  recordAgentStatus(dir, key, { state: "working" }, Date.now());
  mkdirSync(join(dir, "agents", key), { recursive: true });
}

function recordProcess(dir: OrchDir, key: string, pid: number, startToken: string): void {
  const db = orm(dir);
  db.run(sql`INSERT OR IGNORE INTO harnesses(id,name,enabled_at) VALUES ('pi','pi',NULL)`);
  db.run(sql`INSERT OR IGNORE INTO hosts(id,name,os,created_at) VALUES ('test-host','test-host','linux',1)`);
  db.run(sql`INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES (${key},${key},${"pi"},${dir},${key},${1})`);
  db.run(sql`INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES (${key},${1},${"test-host"},${pid},${startToken})`);
}

afterEach(async () => {
  while (servers.length) await servers.pop()!.close();
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
});

describe("close always works", () => {
  test("closes a foreign-space target by name, key, or pane id", async () => {
    const dir = makeDir();
    const records = [
      ["panename01", "pane-name", "worker-name"],
      ["panekey001", "pane-key", null],
      ["paneid0001", "pane-id", null],
    ] as const;
    seedSpace(dir, "foreign-space");
    for (const [key, handle, name] of records) {
      seedAgent(key, {
        adapter: "pi", backend: "headless", space: "foreign-space", handle, owner: "caller",
        ...(name === null ? {} : { name }),
      }, dir);
      writeStatus(dir, key);
    }
    // The space is not in the key any more, so it is asserted where it now
    // lives: the environment satellite, read through the composer.
    for (const [key] of records) expect(agentView(dir, key)?.environment.space).toBe("foreign-space");

    // A paned environment is COMPOSED, never switched on: this provider owns a
    // pane host and a pane inventory, which headless does not. Registration is
    // the seam; the shipped headless provider is never mutated.
    const backend = new FakePanedBackend({
      panes: records.map(([, handle, name]) => fakePane(handle, { space: "foreign-space", name })),
    });
    await withExitCodeAsync(() => closeInProcess(dir, ["worker-name", "panekey001", "pane-id", "--json"], backend));

    expect(backend.closed).toEqual(["pane-name", "pane-key", "pane-id"]);
    for (const [key] of records) {
      expect(spawnedRecords(dir).has(key)).toBe(false);
      expect(existsSync(join(dir, "agents", key))).toBe(true);
    }
  });

  test("a successful backend close retains a pane that is still listed", async () => {
    const dir = makeDir();
    const key = "survives01";
    const handle = "pane-survives";
    const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60000)"], { detached: true });
    children.push(child);
    const pid = child.pid!;
    recordProcess(dir, key, pid, processStartToken(pid)!);
    seedSpace(dir, "foreign-space");
    placeAgent(key, { adapter: "pi", backend: "headless", space: "foreign-space", handle, owner: "caller" }, dir);
    writeStatus(dir, key);
    // The pane host is asked to close and reports success, but its inventory
    // still lists the pane afterwards: a pane that is still listed must fail
    // the close, whatever the host said.
    const backend = new FakePanedBackend({ panes: [fakePane(handle, { space: "foreign-space" })], closeLeavesPane: true });
    const oldExit = process.exit.bind(process);
    const replacementExit: (code?: string | number | null) => void = (code) => {
      process.exitCode = typeof code === "number" ? code : 0;
    };
    Object.defineProperty(process, "exit", { value: replacementExit });
    try {
      await withExitCodeAsync(async () => {
        await closeInProcess(dir, [key, "--json"], backend);
        expect(process.exitCode).toBe(1);
        expect(spawnedRecords(dir).has(key)).toBe(true);
        expect(existsSync(join(dir, "agents", key))).toBe(true);
      });
    } finally {
      Object.defineProperty(process, "exit", { value: oldExit });
    }
  });

  test("a failed signal retains the registry and presence and reports failure", async () => {
    const dir = makeDir();
    const key = "signalfai1";
    const handle = "pane-signal-failed";
    const pid = process.pid;
    const startToken = processStartToken(pid)!;
    const db = orm(dir);
    db.run(sql`INSERT OR IGNORE INTO harnesses(id,name,enabled_at) VALUES ('pi','pi',NULL)`);
    db.run(sql`INSERT OR IGNORE INTO hosts(id,name,os,created_at) VALUES ('test-host','test-host','linux',1)`);
    db.run(sql`INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES (${key},${key},${"pi"},${dir},${key},${1})`);
    db.run(sql`INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES (${key},${1},${"test-host"},${pid},${startToken})`);
    seedSpace(dir, "foreign-space");
    placeAgent(key, { adapter: "pi", backend: "headless", space: "foreign-space", handle, owner: "other" }, dir);
    writeStatus(dir, key);

    const originalKill = process.kill.bind(process);
    const originalExit = process.exit.bind(process);
    process.kill = (target: number, signal?: NodeJS.Signals | 0) => {
      if (target === pid && signal === "SIGTERM") throw new Error("signal denied");
      return originalKill(target, signal);
    };
    const replacementExit: (code?: string | number | null) => void = (code) => {
      process.exitCode = typeof code === "number" ? code : 0;
    };
    Object.defineProperty(process, "exit", { value: replacementExit });
    try {
      await withExitCodeAsync(async () => {
        await closeInProcess(dir, [key, "--json"]);
        expect(process.exitCode).toBe(1);
        expect(spawnedRecords(dir).has(key)).toBe(true);
        expect(existsSync(join(dir, "agents", key))).toBe(true);
      });
    } finally {
      process.kill = originalKill;
      Object.defineProperty(process, "exit", { value: originalExit });
    }
  });

  test("presence pid without a recorded process closes the pane without signalling and ends the row", async () => {
    const dir = makeDir();
    const key = "presence01";
    const handle = "pane-presence-only";
    const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60000)"], { detached: true });
    children.push(child);
    const pid = child.pid!;
    seedSpace(dir, "foreign-space");
    seedAgent(key, { adapter: "pi", backend: "headless", space: "foreign-space", handle, owner: "caller" }, dir);
    writeStatus(dir, key);

    const backend = new FakePanedBackend({ panes: [fakePane(handle, { space: "foreign-space" })] });
    await withExitCodeAsync(() => closeInProcess(dir, [key, "--json"], backend));

    expect(backend.closed).toEqual([handle]);
    expect(processIsAlive(pid)).toBe(true);
    expect(spawnedRecords(dir).has(key)).toBe(false);
    expect(existsSync(join(dir, "agents", key))).toBe(true);
  });

  test("close ignores owner and spawnedBy gates", async () => {
    const dir = makeDir();
    const key = "owned00001";
    const handle = "pane-owned";
    seedSpace(dir, "foreign-space");
    seedAgent(key, {
      adapter: "pi", backend: "headless", space: "foreign-space", handle,
      owner: "other", spawnedBy: "other-session",
    }, dir);
    // Foreign space, foreign holder — and close is still not gated (Rule 11).
    expect(agentView(dir, key)?.environment.space).toBe("foreign-space");
    expect(agentView(dir, key)?.heldBy?.orchId).toBe("other");
    const backend = new FakePanedBackend({ panes: [fakePane(handle, { space: "foreign-space" })] });
    await withExitCodeAsync(() => closeInProcess(dir, [key, "--json"], backend));
    expect(backend.closed).toEqual([handle]);
    expect(spawnedRecords(dir).has(key)).toBe(false);
  });

  test("abort ignores owner gate", async () => {
    const dir = makeDir();
    const key = "abort00001";
    const handle = "pane-abort";
    seedSpace(dir, "foreign-space");
    seedAgent(key, {
      adapter: "pi", backend: "headless", space: "foreign-space", handle,
      owner: "other", spawnedBy: "other-session",
    }, dir);
    expect(agentView(dir, key)?.heldBy?.orchId).toBe("other");
    const services = await servedServices({ orchDir: dir, settings: testSettings }, servers);
    await cmdAbort(services, [key, "--json"]);
    expect(spawnedRecords(dir).has(key)).toBe(true);
  });

  test("duplicate close targets count once", async () => {
    const dir = makeDir();
    const key = "duplicate1";
    seedSpace(dir, "foreign-space");
    seedAgent(key, { adapter: "pi", backend: "headless", space: "foreign-space", handle: "pane-duplicate", owner: "caller" }, dir);
    const oldExitCode = process.exitCode;
    const originalExit = process.exit.bind(process);
    const replacementExit: (code?: string | number | null) => void = (code) => {
      process.exitCode = typeof code === "number" ? code : 0;
    };
    Object.defineProperty(process, "exit", { value: replacementExit });
    try {
      await withExitCodeAsync(async () => {
        await closeInProcess(dir, [key, key, "--json"]);
        expect(process.exitCode).toBe(oldExitCode);
        expect(spawnedRecords(dir).has(key)).toBe(false);
      });
    } finally {
      Object.defineProperty(process, "exit", { value: originalExit });
    }
  });

  test("dead pane-less close is a successful no-op that ends the row and leaves presence to reap", async () => {
    const dir = makeDir();
    const key = "deadpane01";
    const handle = "99999999";
    seedSpace(dir, "foreign-space");
    seedAgent(key, { adapter: "pi", backend: "headless", space: "foreign-space", handle, owner: "caller" }, dir);
    const agentDir = join(dir, "agents", key);
    mkdirSync(agentDir, { recursive: true });
    recordAgentStatus(dir, key, { state: "done" }, Date.now());

    const oldExitCode = process.exitCode;
    await withExitCodeAsync(async () => {
      await closeInProcess(dir, [key, "--json"]);
      expect(process.exitCode).toBe(oldExitCode);
    });
    expect(spawnedRecords(dir).has(key)).toBe(false);
    expect(existsSync(agentDir)).toBe(true);
  });

  test("steer remains blocked by the space wall", () => {
    const dir = makeDir();
    const operator = "operator01";
    const foreign = "spacebpane";
    seedSpace(dir, "space-a");
    seedSpace(dir, "space-b");
    seedAgent(operator, { adapter: "pi", backend: "headless", space: "space-a", handle: "operator" }, dir);
    seedAgent(foreign, { adapter: "pi", backend: "headless", space: "space-b", handle: "pane" }, dir);
    const decision = checkWall(dir, operator, foreign, { crossSpace: false });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("space wall");
  });
});
