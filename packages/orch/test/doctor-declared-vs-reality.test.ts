import { afterEach, describe, expect, test } from "bun:test";
import { applyFixes } from "../src/daemon/server/doctor/runner.ts";
import { describeBackendEnvironments } from "../src/daemon/server/doctor/backends.ts";
import { checkDeclaredVsReality } from "../src/daemon/server/doctor/declared-vs-reality.ts";
import { orm, closeAllStores } from "../src/store/connection.ts";
import { acquireLease } from "../src/store/lease-rows.ts";
import { runTestDoctor } from "./helpers/doctor.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { sql } from "drizzle-orm";

import { row } from "./helpers/rows.ts";
import { FakePanedBackend, withRegisteredBackend } from "./helpers/backend.ts";
import type { HostedProcess } from "../src/types/process.ts";
import type { OrchDir } from "../src/types/core.ts";
import { seedAgentRow, seedProcessInstance } from "./helpers/agent.ts";
const directories: OrchDir[] = [];
function fixture(): OrchDir {
  const dir = tempOrchDir("orch-doctor-reality-");
  directories.push(dir);
  const db = orm(dir);
  db.run(sql`INSERT INTO harnesses(id,name) VALUES ('pi','Pi')`);
  return dir;
}
function agent(dir: OrchDir, id: string, spawnedBy: string | null = null): void {
  seedAgentRow(dir, { id, spawnedBy, cwd: dir, createdAt: 1 });
}

const testDependencies = {
  processAlive: (_orchDir: OrchDir, recorded: HostedProcess) => recorded.pid === process.pid,
  plexerInventory: () => [],
  agentStatus: () => undefined,
};

afterEach(() => {
  closeAllStores();
  while (directories.length) removeTempDir(directories.pop()!);
});

describe("doctor declared-vs-reality", () => {
  test("describes composed and absent backend roles", () => {
    const result = withRegisteredBackend(new FakePanedBackend(), () => describeBackendEnvironments(["headless"]));
    const description = result.backends?.find((backend) => backend.id === "headless");
    expect(description).toBeDefined();
    expect(description?.roles).toContain("placement");
    expect(description?.roles).not.toContain("agentInput");
  });

  test("reports a lease whose recorded holder process is dead", () => {
    const dir = fixture();
    agent(dir, "holder");
    agent(dir, "worker");
    seedProcessInstance(dir, "holder", 1, { pid: 99999999, startToken: "dead-start" });
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
      ...testDependencies,
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
    seedProcessInstance(dir, "spawner", 1, { pid: 99999999, startToken: "dead-start" });
    seedProcessInstance(dir, "worker", 1, { pid: process.pid, startToken: null });

    const result = checkDeclaredVsReality(dir, testDependencies);
    expect(result.status).toBe("warn");
    expect(result.detail).toContain("worker");
    expect(result.detail).toContain("spawner");
    expect(result.detail).toContain("no lease");
    expect(result.detail).toContain("Fix");
  });

  // These spawn a real CLI, whose startup on Windows outruns the 5s default.
  test("surfaces a missing task scope row as unrunnable", async () => {
    const dir = fixture();
    agent(dir, "enqueuer");
    agent(dir, "target");
    orm(dir).run(sql`INSERT INTO tasks(id,text,opts,enqueued_by,scope_agent_id,created_at) VALUES ('missing-scope','do it','{}','enqueuer','target',1)`);
    orm(dir).run(sql.raw("PRAGMA foreign_keys = OFF"));
    orm(dir).run(sql`DELETE FROM agents WHERE id='target'`);
    orm(dir).run(sql.raw("PRAGMA foreign_keys = ON"));

    const results = await runTestDoctor(dir);
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
    const results = await runTestDoctor(dir);
    applyFixes(results);
    expect(row(orm(dir), sql`SELECT COUNT(*) AS count FROM tasks WHERE id='missing-scope'`)).toEqual({ count: 1 });
  });
});
