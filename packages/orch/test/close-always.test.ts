import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { cmdAbort, cmdClose } from "../src/commands/lifecycle/close.ts";
import { spawnedRecords } from "../src/presence/store.ts";
import { agentView } from "../src/store/agent-view.ts";
import { orm } from "../src/store/connection.ts";
import { processIsAlive, processStartToken } from "../src/process-identity.ts";
import { checkWall } from "../src/policy/space.ts";
import { FakePanedBackend, fakePane, withRegisteredBackend } from "./helpers/backend.ts";
import { seedSpace } from "./helpers/space.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { placeAgent, seedAgent } from "./helpers/agent.ts";
import { withExitCode } from "./helpers/exit-code.ts";
import { sql } from "drizzle-orm";

/**
 * Identity is a minted id and NOTHING else, so
 * every fixture below addresses its agent by a minted-shaped id. The plexer,
 * the space and the pane handle are ENVIRONMENT: they are stated as
 * `recordSpawned` options, land in their own satellites, and are read back
 * through the composer — never spelled into the key and never parsed out of it.
 */
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
  const db = orm(dir);
  db.run(sql`INSERT OR IGNORE INTO harnesses(id,name,enabled_at) VALUES ('pi','pi',NULL)`);
  db.run(sql`INSERT OR IGNORE INTO hosts(id,name,os,created_at) VALUES ('test-host','test-host','linux',1)`);
  db.run(sql`INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES (${key},${key},${"pi"},${dir},${key},${1})`);
  db.run(sql`INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES (${key},${1},${"test-host"},${pid},${startToken})`);
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
  test("closes a foreign-space target by name, key, or pane id", () => {
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
      });
      writeStatus(dir, key, handle, 99999999);
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
    withExitCode(() => withRegisteredBackend(backend, () => {
      cmdClose(["worker-name", "panekey001", "pane-id", "--json"]);
    }));

    expect(backend.closed).toEqual(["pane-name", "pane-key", "pane-id"]);
    for (const [key] of records) {
      expect(spawnedRecords().has(key)).toBe(false);
      expect(existsSync(join(dir, "agents", key))).toBe(false);
    }
  });

  test("a successful backend close retains a pane that is still listed", () => {
    const dir = makeDir();
    const key = "survives01";
    const handle = "pane-survives";
    const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60000)"], { detached: true });
    children.push(child);
    const pid = child.pid!;
    recordProcess(dir, key, pid, processStartToken(pid)!);
    seedSpace(dir, "foreign-space");
    placeAgent(key, { adapter: "pi", backend: "headless", space: "foreign-space", handle, owner: "caller" });
    writeStatus(dir, key, handle, pid);
    // The pane host is never asked to close here — the recorded process is
    // signalled instead — so the inventory keeps listing the pane afterwards,
    // and a pane that is still listed must fail the close.
    const backend = new FakePanedBackend({ panes: [fakePane(handle, { space: "foreign-space" })] });
    const oldExit = process.exit.bind(process);
    const replacementExit: (code?: string | number | null) => void = (code) => {
      process.exitCode = typeof code === "number" ? code : 0;
    };
    Object.defineProperty(process, "exit", { value: replacementExit });
    try {
      withExitCode(() => {
        withRegisteredBackend(backend, () => { cmdClose([key, "--json"]); });
        expect(process.exitCode).toBe(1);
        expect(spawnedRecords().has(key)).toBe(true);
        expect(existsSync(join(dir, "agents", key))).toBe(true);
      });
    } finally {
      Object.defineProperty(process, "exit", { value: oldExit });
    }
  });

  test("a failed signal retains the registry and presence and reports failure", () => {
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
    placeAgent(key, { adapter: "pi", backend: "headless", space: "foreign-space", handle, owner: "other" });
    writeStatus(dir, key, handle, pid);

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
      withExitCode(() => {
        cmdClose([key, "--json"]);
        expect(process.exitCode).toBe(1);
        expect(spawnedRecords().has(key)).toBe(true);
        expect(existsSync(join(dir, "agents", key))).toBe(true);
      });
    } finally {
      process.kill = originalKill;
      Object.defineProperty(process, "exit", { value: originalExit });
    }
  });

  test("presence pid without a recorded process closes the pane without signalling and reaps", () => {
    const dir = makeDir();
    const key = "presence01";
    const handle = "pane-presence-only";
    const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60000)"], { detached: true });
    children.push(child);
    const pid = child.pid!;
    seedSpace(dir, "foreign-space");
    seedAgent(key, { adapter: "pi", backend: "headless", space: "foreign-space", handle, owner: "caller" });
    writeStatus(dir, key, handle, pid);

    const backend = new FakePanedBackend({ panes: [fakePane(handle, { space: "foreign-space" })] });
    withExitCode(() => {
      withRegisteredBackend(backend, () => { cmdClose([key, "--json"]); });
    });

    expect(backend.closed).toEqual([handle]);
    expect(processIsAlive(pid)).toBe(true);
    expect(spawnedRecords().has(key)).toBe(false);
    expect(existsSync(join(dir, "agents", key))).toBe(false);
  });

  test("close ignores owner and spawnedBy gates", () => {
    const dir = makeDir();
    const key = "owned00001";
    const handle = "pane-owned";
    seedSpace(dir, "foreign-space");
    seedAgent(key, {
      adapter: "pi", backend: "headless", space: "foreign-space", handle,
      owner: "other", spawnedBy: "other-session",
    });
    // Foreign space, foreign holder — and close is still not gated (Rule 11).
    expect(agentView(dir, key)?.environment.space).toBe("foreign-space");
    expect(agentView(dir, key)?.heldBy?.orchId).toBe("other");
    const backend = new FakePanedBackend({ panes: [fakePane(handle, { space: "foreign-space" })] });
    withExitCode(() => withRegisteredBackend(backend, () => { cmdClose([key, "--json"]); }));
    expect(backend.closed).toEqual([handle]);
    expect(spawnedRecords().has(key)).toBe(false);
  });

  test("abort ignores owner gate", () => {
    const dir = makeDir();
    const key = "abort00001";
    const handle = "pane-abort";
    seedSpace(dir, "foreign-space");
    seedAgent(key, {
      adapter: "pi", backend: "headless", space: "foreign-space", handle,
      owner: "other", spawnedBy: "other-session",
    });
    expect(agentView(dir, key)?.heldBy?.orchId).toBe("other");
    cmdAbort([key, "--json"]);
    expect(spawnedRecords().has(key)).toBe(true);
  });

  test("duplicate close targets count once", () => {
    const dir = makeDir();
    const key = "duplicate1";
    seedSpace(dir, "foreign-space");
    seedAgent(key, { adapter: "pi", backend: "headless", space: "foreign-space", handle: "pane-duplicate", owner: "caller" });
    const oldExitCode = process.exitCode;
    const originalExit = process.exit.bind(process);
    const replacementExit: (code?: string | number | null) => void = (code) => {
      process.exitCode = typeof code === "number" ? code : 0;
    };
    Object.defineProperty(process, "exit", { value: replacementExit });
    try {
      withExitCode(() => {
        cmdClose([key, key, "--json"]);
        expect(process.exitCode).toBe(oldExitCode);
        expect(spawnedRecords().has(key)).toBe(false);
      });
    } finally {
      Object.defineProperty(process, "exit", { value: originalExit });
    }
  });

  test("dead pane-less close is a successful no-op that reaps registry and presence", () => {
    const dir = makeDir();
    const key = "deadpane01";
    const handle = "99999999";
    seedSpace(dir, "foreign-space");
    seedAgent(key, { adapter: "pi", backend: "headless", space: "foreign-space", handle, owner: "caller" });
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

  test("steer remains blocked by the space wall", () => {
    const dir = makeDir();
    const operator = "operator01";
    const foreign = "spacebpane";
    seedSpace(dir, "space-a");
    seedSpace(dir, "space-b");
    seedAgent(operator, { adapter: "pi", backend: "headless", space: "space-a", handle: "operator" });
    seedAgent(foreign, { adapter: "pi", backend: "headless", space: "space-b", handle: "pane" });
    const decision = checkWall(dir, operator, foreign, { crossSpace: false });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("space wall");
  });
});
