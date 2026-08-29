import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { addTask } from "../src/queue.ts";
import { checkUnscopedTasks, checkUnrunnableTasks } from "../src/doctor/presence.ts";
import { orm, closeAllStores } from "../src/store/connection.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { sql } from "drizzle-orm";

import { row } from "./helpers/rows.ts";
const directories: string[] = [];
function fixture(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-task-scope-doctor-")); directories.push(dir);
  const db = orm(dir);
  db.run(sql`INSERT INTO harnesses(id,name) VALUES ('pi','Pi')`);
  db.run(sql`INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES ('a','a','pi','/tmp','a',1)`);
  return dir;
}
afterEach(() => { closeAllStores(); while (directories.length) removeTempDir(directories.pop()!); });

describe("doctor task scopes", () => {
  test("a facade-enqueued task has exactly one typed scope", () => {
    const dir = fixture();
    addTask(dir, "scoped", {}, "a");
    expect(checkUnscopedTasks(dir)).toMatchObject({ status: "ok", detail: "no unscoped tasks" });
  });

  test("the database rejects an unscoped task instead of keeping a legacy queue row", () => {
    const dir = fixture();
    expect(() => orm(dir).run(sql`INSERT INTO tasks(id,text,opts,enqueued_by,created_at) VALUES ('bad','x','{}','a',1)`)).toThrow();
    expect(checkUnscopedTasks(dir).status).toBe("ok");
  });

  test("doctor lists unrunnable tasks and deliberate resolutions without deleting", () => {
    const dir = fixture();
    addTask(dir, "orphan", {}, "a", { agentId: "a" });
    orm(dir).run(sql`INSERT INTO agent_endings(agent_id,ended_at,closed_by) VALUES ('a',2,NULL)`);
    const result = checkUnrunnableTasks(dir);
    expect(result.status).toBe("warn");
    expect(result.detail).toContain("unrunnable");
    expect(result.detail).toContain("take it on");
    expect(result.detail).toContain("leave it");
    expect(result.detail).toContain("reap it");
    expect(row(orm(dir), sql`SELECT COUNT(*) AS count FROM tasks`)).toEqual({ count: 1 });
  });
});
