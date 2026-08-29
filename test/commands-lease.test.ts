import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ensureHarness, ensureHost, insertAgent } from "../src/store/agent-rows.ts";
import { acquireLease, currentLease } from "../src/store/lease-rows.ts";
import { openStore } from "../src/store/connection.ts";
import { governWrite } from "../src/daemon/orchd.ts";
import { presenceAgentDir } from "../src/presence/store.ts";
import { processStartToken } from "../src/process-identity.ts";
import { reapAgent, adoptAgent, detachAgent, cmdReap } from "../src/commands/lease.ts";
import { cmdAbort, cmdClose } from "../src/commands/lifecycle.ts";
import { headlessBackend } from "../src/backends/headless/index.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { recordSpawned, spawnedRecords } from "../src/presence/store.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const dirs: string[] = [];
const oldOrchDir = process.env.ORCH_DIR;
afterEach(() => {
  while (dirs.length) removeTempDir(dirs.pop()!);
  if (oldOrchDir === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = oldOrchDir;
});

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-lease-command-"));
  dirs.push(dir);
  ensureHarness(dir, "pi", "pi", 1);
  ensureHost(dir, "host", "host", "linux", 1);
  return dir;
}
function agent(dir: string, id: string, name = id, spawnedBy: string | null = null): void {
  insertAgent(dir, { id, name, spawnedBy, harnessId: "pi", cwd: dir, createdAt: 1 });
}

function liveHolder(dir: string, id = "foreign-orch"): void {
  agent(dir, id);
  const token = processStartToken(process.pid);
  if (!token) throw new Error("test process has no start token");
  openStore(dir).query("INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES (?,?,?,?,?)")
    .run(id, 1, "host", process.pid, token);
}

// Command tests exercise the pure command operations so they do not need to boot a daemon.
describe("lease commands", () => {
  test("detach releases the lease and is a no-op when already unleased", () => {
    const dir = fixture();
    agent(dir, "orch"); agent(dir, "new-orch"); agent(dir, "worker", "worker");
    acquireLease(dir, "worker", "orch", 2);
    expect(detachAgent(dir, "worker", "orch", 3)).toMatchObject({ released: true, name: "worker" });
    expect(currentLease(dir, "worker")).toBeNull();
    expect(adoptAgent(dir, "worker", "new-orch", 4)).toMatchObject({ adopted: true, name: "worker" });
    expect(currentLease(dir, "worker")?.orchId).toBe("new-orch");
    // Rule 11: a lease excludes only while its holder is ALIVE. "new-orch" has no
    // process, so its lease is a stale row and detach clears it. Refusing here is
    // what stranded a fleet: every driving verb is gated on the lease, so detach
    // is the only way out and must never be blocked by the thing it exists to clear.
    expect(detachAgent(dir, "worker", "orch", 5)).toMatchObject({ released: true });
    expect(currentLease(dir, "worker")).toBeNull();
  });

  test("a LIVE foreign holder still excludes everyone else", () => {
    const dir = fixture();
    agent(dir, "orch"); agent(dir, "worker", "worker");
    liveHolder(dir, "live-orch");
    acquireLease(dir, "worker", "live-orch", 2);
    expect(() => detachAgent(dir, "worker", "orch", 3)).toThrow(/leased by live orch/);
    expect(currentLease(dir, "worker")?.orchId).toBe("live-orch");
  });

  test("adopt takes an unleased agent and a dead holder", () => {
    const dir = fixture();
    agent(dir, "new-orch"); agent(dir, "old-orch"); agent(dir, "worker", "worker");
    acquireLease(dir, "worker", "old-orch", 2);
    expect(adoptAgent(dir, "worker", "new-orch", 3)).toMatchObject({ adopted: true, name: "worker" });
    expect(currentLease(dir, "worker")?.orchId).toBe("new-orch");
    expect((openStore(dir).query("SELECT release_reason FROM agent_leases WHERE orch_id = ?").get("old-orch") as { release_reason: string }).release_reason).toBe("adopted");
  });

  test("adopt refuses a holder with a live recorded process", () => {
    const dir = fixture();
    agent(dir, "new-orch"); agent(dir, "old-orch"); agent(dir, "worker", "worker");
    openStore(dir).query("INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES (?,?,?,?,?)")
      .run("old-orch", 1, "host", process.pid, processStartToken(process.pid));
    acquireLease(dir, "worker", "old-orch", 2);
    expect(() => adoptAgent(dir, "worker", "new-orch", 3)).toThrow("worker is leased by live orch old-orch.");
  });

  test("reap refuses when a live descendant exists, regardless of lease", () => {
    const dir = fixture();
    agent(dir, "root"); agent(dir, "root-holder"); agent(dir, "child", "live-child", "root");
    acquireLease(dir, "root", "root-holder", 2);
    expect(() => reapAgent(dir, "root", 3)).toThrow(/live-child/);
  });

  test("reap refuses while the recorded process is alive", () => {
    const dir = fixture();
    agent(dir, "worker", "worker");
    openStore(dir).query("INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES (?,?,?,?,?)").run("worker", 2, "host", process.pid, processStartToken(process.pid));
    expect(() => reapAgent(dir, "worker", 3)).toThrow(/close first/);
  });

  test("reap is never lease-gated and removes the record and presence", () => {
    const dir = fixture();
    agent(dir, "worker", "worker"); agent(dir, "other-orch");
    acquireLease(dir, "worker", "other-orch", 2);
    const dirPath = presenceAgentDir("worker", dir);
    mkdirSync(dirPath, { recursive: true });
    writeFileSync(join(dirPath, "status.json"), "{}\n");
    expect(reapAgent(dir, "worker", 3)).toMatchObject({ reaped: true, name: "worker" });
    expect(openStore(dir).query("SELECT id FROM agents WHERE id = ?").get("worker")).toBeNull();
  });

  test("abort proceeds with a foreign live-holder lease", () => {
    const dir = fixture();
    process.env.ORCH_DIR = dir;
    const key = "headless~workspace~abort-worker";
    agent(dir, key, "abort-worker");
    liveHolder(dir);
    acquireLease(dir, key, "foreign-orch", 2);
    recordSpawned(key, { backend: "headless", space: "space", handle: "abort-handle" });
    const dirPath = presenceAgentDir(key, dir);
    mkdirSync(dirPath, { recursive: true });
    writeFileSync(join(dirPath, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, state: "idle" }));

    // Rule 11: `abort`/`close`/`reap` are NEVER gated — the human must always be
    // able to kill from CLI or web, whether or not a live foreign orch holds the
    // lease. Abort must therefore PROCEED here and must not steal the lease.
    // Headless composes no paneInput (TASKS/07: "Headless has channel, capture and
    // process roles and no pane roles"), so this asserts the refusal is absent,
    // not that any keystroke was sent.
    expect(headlessBackend.paneInput).toBeNull();
    expect(() => { cmdAbort([key, "--json"]); }).not.toThrow();
    expect(currentLease(dir, key)?.orchId).toBe("foreign-orch");
  });

  test("close proceeds with a foreign live-holder lease", () => {
    const dir = fixture();
    process.env.ORCH_DIR = dir;
    const key = "headless~workspace~close-worker";
    agent(dir, key, "close-worker");
    liveHolder(dir);
    acquireLease(dir, key, "foreign-orch", 2);
    recordSpawned(key, { backend: "headless", space: "space", handle: "close-handle" });
    const dirPath = presenceAgentDir(key, dir);
    mkdirSync(dirPath, { recursive: true });
    writeFileSync(join(dirPath, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, state: "idle" }));

    cmdClose([key, "--json"]);

    expect(spawnedRecords().has(key)).toBe(false);
    expect(openStore(dir).query("SELECT id FROM agents WHERE id = ?").get(key)).toBeDefined();
    expect(currentLease(dir, key)?.orchId).toBe("foreign-orch");
  });

  test("reap proceeds with a foreign live-holder lease", () => {
    const dir = fixture();
    process.env.ORCH_DIR = dir;
    const key = "headless~workspace~reap-worker";
    agent(dir, key, "reap-worker");
    liveHolder(dir);
    acquireLease(dir, key, "foreign-orch", 2);

    void cmdReap([key, "--json"]);

    expect(openStore(dir).query("SELECT id FROM agents WHERE id = ?").get(key)).toBeNull();
  });

  test("reset driving verb refuses a foreign live-holder lease", () => {
    const dir = fixture();
    const key = "reset-worker";
    agent(dir, key);
    liveHolder(dir);
    acquireLease(dir, key, "foreign-orch", 2);

    // governWrite is the daemon gate used by reset (and dispatch/steer/model).
    expect(() => governWrite(dir, key, { target: key, actor: "caller-orch", text: "reset" })).toThrow(/foreign-orch/);
  });
});
