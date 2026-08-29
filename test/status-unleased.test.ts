import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { deriveDriveState, deriveView, formatOwnerCell, statusRowFromView } from "../src/commands/status.ts";
import type { Entity } from "../src/entities.ts";
import { closeAllStores, openStore } from "../src/store/connection.ts";
import { ensureHarness, insertAgent } from "../src/store/agent-rows.ts";
import { acquireLease } from "../src/store/lease-rows.ts";
import { processStartToken } from "../src/process-identity.ts";
import { serializeIdentity } from "../src/backends/identity.ts";
import { rmSync } from "node:fs";

const dirs: string[] = [];
afterEach(() => {
  closeAllStores();
  while (dirs.length > 0) rmSync(dirs.pop()!, { recursive: true, force: true });
});

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-status-unleased-"));
  dirs.push(dir);
  ensureHarness(dir, "pi", "Pi", 1);
  const db = openStore(dir);
  db.query("INSERT INTO hosts(id,name,os,created_at) VALUES ('host','host','linux',1)").run();
  insertAgent(dir, { id: "worker", harnessId: "pi", cwd: "/tmp", name: "worker", createdAt: 1 });
  insertAgent(dir, { id: "live", harnessId: "pi", cwd: "/tmp", name: "live", createdAt: 1 });
  insertAgent(dir, { id: "dead", harnessId: "pi", cwd: "/tmp", name: "dead", createdAt: 1 });
  const token = processStartToken(process.pid);
  if (!token) throw new Error("test process has no start token");
  db.query("INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES (?,?,?,?,?)")
    .run("live", 1, "host", process.pid, token);
  return dir;
}

function entity(): Entity {
  const key = serializeIdentity({ backend: "headless", workspace: "local", id: "worker" });
  return {
    key, paneId: null, managed: true, name: "worker", tabLabel: null, agent: "pi", focused: false,
    backendStatus: null, backend: "headless", presence: {
      key, dir: "/tmp", alive: true, result: null, status: { schema: 1, state: "idle" },
    }, sessionPath: null, presenceOnly: false, workspace: "local",
  };
}

describe("status owner rendering", () => {
  test("leased by a live holder shows that holder", () => {
    const dir = fixture();
    acquireLease(dir, "worker", "live", 2);
    const drive = deriveDriveState(entity().key, { directory: dir, currentOrchId: "caller" });
    const row = statusRowFromView(deriveView(entity(), new Map()), {}, "caller", dir);
    expect(drive.owner).toBe("live");
    expect(formatOwnerCell(row)).toBe("live");
    expect(JSON.stringify(row)).toContain('"owner":"live"');
  });

  test("a dead holder is shown as unleased with the holder gone", () => {
    const dir = fixture();
    acquireLease(dir, "worker", "dead", 2);
    const drive = deriveDriveState(entity().key, { directory: dir, currentOrchId: "caller" });
    const row = statusRowFromView(deriveView(entity(), new Map()), {}, "caller", dir);
    expect(drive.owner).toBe("no orch driving it (holder gone)");
    expect(formatOwnerCell(row)).toBe("no orch driving it (holder gone)");
    expect(JSON.stringify(row)).toContain('"owner":"no orch driving it (holder gone)"');
  });

  test("an agent never leased shows no orch driving it", () => {
    const dir = fixture();
    const drive = deriveDriveState(entity().key, { directory: dir, currentOrchId: "caller" });
    const row = statusRowFromView(deriveView(entity(), new Map()), {}, "caller", dir);
    expect(drive.owner).toBe("no orch driving it");
    expect(formatOwnerCell(row)).toBe("no orch driving it");
    expect(JSON.stringify(row)).toContain('"owner":"no orch driving it"');
  });
});
