import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { formatOwnerCell, statusRowFromEntity } from "../src/commands/status.ts";
import { deriveDriveState } from "../src/agent/drive-state.ts";
import { orm } from "../src/store/connection.ts";
import { ensureHarness, insertAgent } from "../src/store/agent-rows.ts";
import { acquireLease } from "../src/store/lease-rows.ts";
import { processStartToken } from "../src/process-identity.ts";
import { serializeIdentity } from "../src/backends/identity.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import type { Entity } from "../src/types/core.ts";
import { sql } from "drizzle-orm";

const dirs: string[] = [];
afterEach(() => {
  while (dirs.length > 0) removeTempDir(dirs.pop()!);
});

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-status-unleased-"));
  dirs.push(dir);
  ensureHarness(dir, "pi", "Pi", 1);
  const db = orm(dir);
  db.run(sql`INSERT INTO hosts(id,name,os,created_at) VALUES ('host','host','linux',1)`);
  insertAgent(dir, { id: WORKER_ID, harnessId: "pi", cwd: "/tmp", name: "worker", createdAt: 1 });
  insertAgent(dir, { id: "live", harnessId: "pi", cwd: "/tmp", name: "live", createdAt: 1 });
  insertAgent(dir, { id: "dead", harnessId: "pi", cwd: "/tmp", name: "dead", createdAt: 1 });
  const token = processStartToken(process.pid);
  if (!token) throw new Error("test process has no start token");
  db.run(sql`INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES (${"live"},${1},${"host"},${process.pid},${token})`);
  return dir;
}

/** A1: the worker's key IS its minted id. The old fixture spelled it
 *  `headless~local~worker`, which welded a plexer and an invented place called
 *  "local" into the one fact that may never change. */
const WORKER_ID = "worker0001";

function entity(): Entity {
  const key = serializeIdentity({ id: WORKER_ID });
  return {
    key, paneId: null, managed: true, name: "worker", tabLabel: null, agent: "pi", focused: false,
    // A detached agent is in no plexer and no space: that is a missing row, not
    // a place named "local".
    backendStatus: null, backend: null, presence: {
      key, dir: "/tmp", alive: true, result: null, status: { schema: 1, state: "idle" },
    }, sessionPath: null, presenceOnly: false, space: null,
  };
}

describe("status owner rendering", () => {
  test("leased by a live holder shows that holder", () => {
    const dir = fixture();
    acquireLease(dir, WORKER_ID, "live", 2);
    const drive = deriveDriveState(entity().key, { directory: dir, currentOrchId: "caller" });
    const row = statusRowFromEntity(entity(), new Map(), undefined, {}, "caller", dir);
    expect(drive.owner).toBe("live");
    expect(formatOwnerCell(row)).toBe("live");
    expect(JSON.stringify(row)).toContain('"owner":"live"');
  });

  test("a dead holder is shown as unleased with the holder gone", () => {
    const dir = fixture();
    acquireLease(dir, WORKER_ID, "dead", 2);
    const drive = deriveDriveState(entity().key, { directory: dir, currentOrchId: "caller" });
    const row = statusRowFromEntity(entity(), new Map(), undefined, {}, "caller", dir);
    expect(drive.owner).toBe("no orch driving it (holder gone)");
    expect(formatOwnerCell(row)).toBe("no orch driving it (holder gone)");
    expect(JSON.stringify(row)).toContain('"owner":"no orch driving it (holder gone)"');
  });

  test("an agent never leased shows no orch driving it", () => {
    const dir = fixture();
    const drive = deriveDriveState(entity().key, { directory: dir, currentOrchId: "caller" });
    const row = statusRowFromEntity(entity(), new Map(), undefined, {}, "caller", dir);
    expect(drive.owner).toBe("no orch driving it");
    expect(formatOwnerCell(row)).toBe("no orch driving it");
    expect(JSON.stringify(row)).toContain('"owner":"no orch driving it"');
  });
});
