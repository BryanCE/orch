import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { applyFixes, runDoctor } from "../src/doctor/runner.ts";
import { checkDeclaredVsReality } from "../src/doctor/declared-vs-reality.ts";
import { orm, closeAllStores } from "../src/store/connection.ts";
import { acquireLease } from "../src/store/lease-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { sql } from "drizzle-orm";

import { row } from "./helpers/rows.ts";
const directories: string[] = [];
function fixture(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-doctor-reality-"));
  directories.push(dir);
  const db = orm(dir);
  db.run(sql`INSERT INTO harnesses(id,name) VALUES ('pi','Pi')`);
  db.run(sql`INSERT INTO hosts(id,name,os,created_at) VALUES ('host','Host','linux',1)`);
  return dir;
}
function agent(dir: string, id: string, spawnedBy: string | null = null): void {
  orm(dir).run(sql`INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,spawned_by,created_at) VALUES (${id},${spawnedBy ?? id},${"pi"},${dir},${id},${spawnedBy},${1})`);
}
function recordProcess(dir: string, id: string, pid: number, token: string | null): void {
  orm(dir).run(sql`INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES (${id},${1},${"host"},${pid},${token})`);
}

const testDependencies = {
  processAlive: (pid: number) => pid === process.pid,
  plexerInventory: () => [],
};

afterEach(() => {
  closeAllStores();
  while (directories.length) removeTempDir(directories.pop()!);
});

describe("doctor declared-vs-reality", () => {
  test("reports a lease whose recorded holder process is dead", () => {
    const dir = fixture();
    agent(dir, "holder");
    agent(dir, "worker");
    recordProcess(dir, "holder", 99999999, "dead-start");
    acquireLease(dir, "worker", "holder", 2);

    const result = checkDeclaredVsReality(dir, testDependencies);
    expect(result.status).toBe("warn");
    expect(result.detail).toContain("worker");
    expect(result.detail).toContain("holder");
    expect(result.detail).toContain("recorded");
    expect(result.detail).toContain("Fix");
  });

  test("reports an environment handle missing from its plexer", () => {
    const dir = fixture();
    agent(dir, "worker");
    orm(dir).run(sql`INSERT INTO plexers(id,name) VALUES ('fake','Fake')`);
    orm(dir).run(sql`INSERT INTO agent_plexers(agent_id,plexer_id) VALUES ('worker','fake')`);
    orm(dir).run(sql`INSERT INTO agent_handles(agent_id,since,handle) VALUES ('worker',1,'gone')`);

    const result = checkDeclaredVsReality(dir, {
      processAlive: testDependencies.processAlive,
      plexerInventory: () => [{ handle: "still-here" }],
    });
    expect(result.status).toBe("warn");
    expect(result.detail).toContain("worker");
    expect(result.detail).toContain("fake");
    expect(result.detail).toContain("gone");
    expect(result.detail).toContain("recorded");
    expect(result.detail).toContain("Fix");
  });

  test("reports a live agent with no lease and no live spawner", () => {
    const dir = fixture();
    agent(dir, "spawner");
    agent(dir, "worker", "spawner");
    recordProcess(dir, "spawner", 99999999, "dead-start");
    recordProcess(dir, "worker", process.pid, null);

    const result = checkDeclaredVsReality(dir, {
      plexerInventory: () => [],
      processAlive: (pid) => pid === process.pid,
    });
    expect(result.status).toBe("warn");
    expect(result.detail).toContain("worker");
    expect(result.detail).toContain("spawner");
    expect(result.detail).toContain("no lease");
    expect(result.detail).toContain("Fix");
  });

  test("surfaces a missing task scope row as unrunnable", async () => {
    const dir = fixture();
    agent(dir, "enqueuer");
    agent(dir, "target");
    orm(dir).run(sql`INSERT INTO tasks(id,text,opts,enqueued_by,scope_agent_id,created_at) VALUES ('missing-scope','do it','{}','enqueuer','target',1)`);
    orm(dir).run(sql.raw("PRAGMA foreign_keys = OFF"));
    orm(dir).run(sql`DELETE FROM agents WHERE id='target'`);
    orm(dir).run(sql.raw("PRAGMA foreign_keys = ON"));

    const results = await runDoctor(dir, { yes: true, sshRunner: () => ({ ok: true, stdout: "", stderr: "", code: 0 }) });
    const result = results.find((entry) => entry.id === "unrunnable-tasks");
    expect(result?.status).toBe("warn");
    expect(result?.detail).toContain("missing-scope");
    expect(result?.detail).toContain("no longer exists");
  });

  test("doctor -y does not delete an unrunnable task", async () => {
    const dir = fixture();
    agent(dir, "enqueuer");
    orm(dir).run(sql.raw("PRAGMA foreign_keys = OFF"));
    orm(dir).run(sql`INSERT INTO tasks(id,text,opts,enqueued_by,scope_agent_id,created_at) VALUES ('missing-scope','do it','{}','enqueuer','gone',1)`);
    orm(dir).run(sql.raw("PRAGMA foreign_keys = ON"));
    const results = await runDoctor(dir, { yes: true, sshRunner: () => ({ ok: true, stdout: "", stderr: "", code: 0 }) });
    applyFixes(results);
    expect(row(orm(dir), sql`SELECT COUNT(*) AS count FROM tasks WHERE id='missing-scope'`)).toEqual({ count: 1 });
  });
});
