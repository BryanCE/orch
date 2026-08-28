import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deriveLeasePayload } from "../src/daemon/orchd.ts";
import { serializeIdentity } from "../src/backends/identity.ts";
import { openStore, closeAllStores } from "../src/store/connection.ts";
import { acquireLease } from "../src/store/lease-rows.ts";
import { processStartToken } from "../src/process-identity.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const dirs: string[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-daemon-status-lease-"));
  dirs.push(dir);
  const db = openStore(dir);
  db.query("INSERT INTO harnesses(id,name) VALUES ('pi','Pi')").run();
  db.query("INSERT INTO hosts(id,name,os,created_at) VALUES ('host','host','linux',1)").run();
  for (const [id, name] of [["worker", "Worker"], ["orch", "Lead"]]) {
    db.query("INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES (?,?,?,?,?,?)")
      .run(id, id, "pi", "/tmp", name, 1);
  }
  const token = processStartToken(process.pid);
  db.query("INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES (?,?,?,?,?)")
    .run("orch", 1, "host", process.pid, token ?? null);
  return dir;
}

describe("daemon status lease payload", () => {
  test("reports the current holder and its liveness", () => {
    const dir = fixture();
    acquireLease(dir, "worker", "orch", 2);
    expect(deriveLeasePayload(dir, serializeIdentity({ backend: "headless", workspace: "local", id: "worker" }))).toEqual({
      lease: { holderId: "orch", holderName: "Lead", holderAlive: true },
      leaseKnown: true,
    });
  });

  test("distinguishes a known unleased agent from an unknown key", () => {
    const dir = fixture();
    expect(deriveLeasePayload(dir, serializeIdentity({ backend: "headless", workspace: "local", id: "worker" }))).toEqual({ lease: null, leaseKnown: true });
    expect(deriveLeasePayload(dir, "missing-key")).toEqual({ lease: null, leaseKnown: false });
  });
});
