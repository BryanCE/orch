import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deriveLeasePayload } from "../src/daemon/orchd.ts";
import { serializeIdentity } from "../src/backends/identity.ts";
import { orm, closeAllStores } from "../src/store/connection.ts";
import { acquireLease } from "../src/store/lease-rows.ts";
import { processStartToken } from "../src/process-identity.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { sql } from "drizzle-orm";

const dirs: string[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-daemon-status-lease-"));
  dirs.push(dir);
  const db = orm(dir);
  db.run(sql`INSERT INTO harnesses(id,name) VALUES ('pi','Pi')`);
  db.run(sql`INSERT INTO hosts(id,name,os,created_at) VALUES ('host','host','linux',1)`);
  for (const [id, name] of [[WORKER_ID, "Worker"], ["orch", "Lead"]]) {
    db.run(sql`INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES (${id},${id},${"pi"},${"/tmp"},${name},${1})`);
  }
  const token = processStartToken(process.pid);
  db.run(sql`INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES (${"orch"},${1},${"host"},${process.pid},${token ?? null})`);
  return dir;
}

/** A1: the agent a lease payload is asked about is named by its minted id — the
 *  old fixture asked with `headless~local~worker`, a key that carried where the
 *  agent sat inside the one fact that identifies it. */
const WORKER_ID = "worker0001";

describe("daemon status lease payload", () => {
  test("reports the current holder and its liveness", () => {
    const dir = fixture();
    acquireLease(dir, WORKER_ID, "orch", 2);
    expect(deriveLeasePayload(dir, serializeIdentity({ id: WORKER_ID }))).toEqual({
      lease: { holderId: "orch", holderName: "Lead", holderAlive: true },
      leaseKnown: true,
    });
  });

  test("distinguishes a known unleased agent from an unknown key", () => {
    const dir = fixture();
    expect(deriveLeasePayload(dir, serializeIdentity({ id: WORKER_ID }))).toEqual({ lease: null, leaseKnown: true });
    expect(deriveLeasePayload(dir, "missingkey0")).toEqual({ lease: null, leaseKnown: false });
  });
});
