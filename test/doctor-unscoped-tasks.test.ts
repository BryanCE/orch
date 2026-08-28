import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { addTask } from "../src/queue.ts";
import { checkUnscopedTasks } from "../src/doctor/presence.ts";
import { openStore, closeAllStores } from "../src/store/connection.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const directories: string[] = [];
function fixture(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-task-scope-doctor-")); directories.push(dir);
  const db = openStore(dir);
  db.query("INSERT INTO harnesses(id,name) VALUES ('pi','Pi')").run();
  db.query("INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES ('a','a','pi','/tmp','a',1)").run();
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
    expect(() => openStore(dir).query(
      "INSERT INTO tasks(id,text,opts,enqueued_by,created_at) VALUES ('bad','x','{}','a',1)",
    ).run()).toThrow();
    expect(checkUnscopedTasks(dir).status).toBe("ok");
  });
});
