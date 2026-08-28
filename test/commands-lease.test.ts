import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ensureHarness, ensureHost, insertAgent } from "../src/store/agent-rows.ts";
import { acquireLease, currentLease } from "../src/store/lease-rows.ts";
import { openStore } from "../src/store/connection.ts";
import { presenceAgentDir } from "../src/presence/store.ts";
import { processStartToken } from "../src/process-identity.ts";
import { reapAgent, adoptAgent, detachAgent } from "../src/commands/lease.ts";
import { cmdAbort, cmdClose } from "../src/commands/lifecycle.ts";
import { headlessBackend } from "../src/backends/headless/index.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { recordSpawned } from "../src/presence/store.ts";
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
    expect(() => detachAgent(dir, "worker", "orch", 5)).toThrow(/leased by/);
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
    expect(() => adoptAgent(dir, "worker", "new-orch", 3)).toThrow(/worker is leased by live orch old-orch/);
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

  test("abort and close proceed with a foreign normalized lease", () => {
    const dir = fixture();
    process.env.ORCH_DIR = dir;
    const abortKey = "headless~workspace~abort-worker";
    const closeKey = "headless~workspace~close-worker";
    agent(dir, abortKey, "abort-worker"); agent(dir, closeKey, "close-worker"); agent(dir, "foreign-orch");
    acquireLease(dir, abortKey, "foreign-orch", 2);
    acquireLease(dir, closeKey, "foreign-orch", 2);
    for (const [key, handle] of [[abortKey, "abort-handle"], [closeKey, "close-handle"]] as const) {
      recordSpawned(key, { backend: "headless", workspace: "workspace", handle, name: handle });
      const dirPath = presenceAgentDir(key, dir);
      mkdirSync(dirPath, { recursive: true });
      writeFileSync(join(dirPath, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, state: "idle" }));
    }
    const backend = headlessBackend as Omit<typeof headlessBackend, "canSendKeys"> & { canSendKeys: boolean };
    const oldCanSendKeys = backend.canSendKeys;
    const oldSendKeys = backend.sendKeys.bind(backend);
    const oldClose = backend.close.bind(backend);
    let sends = 0;
    let closes = 0;
    backend.canSendKeys = true;
    backend.sendKeys = () => { sends++; return true; };
    backend.close = () => { closes++; return true; };
    try {
      cmdAbort([abortKey, "--json"]);
      cmdClose([closeKey, "--json"]);
    } finally {
      backend.canSendKeys = oldCanSendKeys;
      backend.sendKeys = oldSendKeys;
      backend.close = oldClose;
    }
    expect(sends).toBe(2);
    expect(closes).toBe(1);
    expect(currentLease(dir, abortKey)?.orchId).toBe("foreign-orch");
    expect(currentLease(dir, closeKey)?.orchId).toBe("foreign-orch");
  });
});
