import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores, openStore } from "../src/store/connection.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

type Db = ReturnType<typeof openStore>;
interface TableColumn { name: string; type: string; notnull: number }

const dirs: string[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });
function db() { const d = mkdtempSync(join(tmpdir(), "orch-schema-")); dirs.push(d); return openStore(d); }
function base(d: ReturnType<typeof openStore>) {
  d.query("INSERT INTO harnesses(id,name) VALUES (?,?)").run("pi", "Pi");
  d.query("INSERT INTO hosts(id,name,os,created_at) VALUES (?,?,?,?)").run("h", "Host", "linux", 1);
  d.query("INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES (?,?,?,?,?,?)").run("a", "a", "pi", "/", "A", 1);
}

const rebuildTables = ["harnesses", "plexers", "hosts", "host_plexers", "spaces", "agents", "agent_worktrees", "agent_endings", "agent_processes", "agent_plexers", "agent_handles", "agent_spaces", "agent_tunings", "agent_leases", "space_plexers", "pack_plexers", "tasks", "task_cancellations", "task_attempts", "pack_intakes"];
const uniqueIndexes = ["one_install", "one_live_process", "one_handle", "one_space", "one_tuning", "one_lease", "one_space_home", "one_pack_home", "one_intake", "one_open_attempt"];
const plainIndexes = ["agents_by_pack", "agents_by_spawner", "leases_by_orch", "tasks_by_agent", "tasks_by_pack", "tasks_by_space", "tasks_by_enqueuer", "attempts_running"];
const overlapTriggers = ["agent_handles", "agent_processes", "agent_spaces", "agent_tunings", "agent_leases", "space_plexers", "pack_plexers", "host_plexers", "task_attempts", "pack_intakes"].map(n => `${n}_no_overlap`);

function addDeps(d: ReturnType<typeof openStore>) {
  d.query("INSERT INTO plexers(id,name) VALUES (?,?)").run("px", "Plexer");
  d.query("INSERT INTO spaces(id,name,created_at) VALUES (?,?,?)").run("s", "Space", 1);
  d.query("INSERT INTO agents(id,spawned_by,root_agent_id,harness_id,cwd,name,created_at) VALUES (?,?,?,?,?,?,?)").run("b", "a", "a", "pi", "/", "B", 1);
}

describe("rebuild schema", () => {
  test("rebuild DDL inventory is exact", () => {
    const d = db();
    const legacy = new Set(["queue", "ownership", "outbox", "spawned", "catalogues", "events", "runs"]);
    const legacyIndexes = new Set(["queue_state_created", "queue_agent_key", "outbox_pending", "runs_agent_started"]);
    const rows = d.query("SELECT type,name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'").all() as {type:string,name:string}[];
    expect(new Set(rows.filter(r => r.type === "table" && !legacy.has(r.name)).map(r => r.name))).toEqual(new Set(rebuildTables));
    expect(new Set(rows.filter(r => r.type === "index" && !legacyIndexes.has(r.name)).map(r => r.name))).toEqual(new Set([...uniqueIndexes, ...plainIndexes]));
    expect(new Set(rows.filter(r => r.type === "trigger").map(r => r.name))).toEqual(new Set(overlapTriggers));
    expect(rows.some(r => r.type === "view" && r.name === "task_states")).toBe(true);
  });

  test("schema stamp and foreign keys are enabled", () => {
    const d = db();
    expect(d.query("PRAGMA user_version").get()).toEqual({ user_version: 6 });
    expect(d.query("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: 1 });
  });

  test("documented column declarations are exact", () => {
    const d = db();
    const expected: Record<string, [string,string,number][]> = {
      agents: [["id","TEXT",1],["spawned_by","TEXT",0],["root_agent_id","TEXT",1],["harness_id","TEXT",1],["cwd","TEXT",1],["name","TEXT",1],["label","TEXT",0],["created_at","INTEGER",1]],
      agent_leases: [["id","INTEGER",1],["agent_id","TEXT",1],["orch_id","TEXT",1],["since","INTEGER",1],["until","INTEGER",0],["release_reason","TEXT",0]],
      tasks: [["id","TEXT",1],["text","TEXT",1],["opts","TEXT",1],["enqueued_by","TEXT",1],["scope_agent_id","TEXT",0],["scope_pack_id","TEXT",0],["scope_space_id","TEXT",0],["created_at","INTEGER",1]],
      task_attempts: [["task_id","TEXT",1],["since","INTEGER",1],["until","INTEGER",0],["agent_id","TEXT",1],["dispatch_id","TEXT",1],["outcome","TEXT",0],["result","TEXT",0],["error","TEXT",0]],
    };
    for (const [table, cols] of Object.entries(expected)) {
      expect((d.query(`PRAGMA table_info(${table})`).all() as TableColumn[]).map(c => [c.name,c.type,c.notnull])).toEqual(cols);
    }
  });
  test("all satellite overlap triggers use documented keys", () => {
    const cases = [
      ["agent_processes", "agent_id", (d: Db) => d.query("INSERT INTO agent_processes(agent_id,since,until,host_id,pid) VALUES (?,?,?,?,?)").run("a", 1, 5, "h", 1), (d: Db) => d.query("INSERT INTO agent_processes(agent_id,since,until,host_id,pid) VALUES (?,?,?,?,?)").run("a", 4, 6, "h", 2)],
      ["agent_spaces", "agent_id", (d: Db) => d.query("INSERT INTO agent_spaces(agent_id,since,until,space_id) VALUES (?,?,?,?)").run("a", 1, 5, "s"), (d: Db) => d.query("INSERT INTO agent_spaces(agent_id,since,until,space_id) VALUES (?,?,?,?)").run("a", 4, 6, "s")],
      ["agent_tunings", "agent_id", (d: Db) => d.query("INSERT INTO agent_tunings(agent_id,since,until,model) VALUES (?,?,?,?)").run("a", 1, 5, "m"), (d: Db) => d.query("INSERT INTO agent_tunings(agent_id,since,until,model) VALUES (?,?,?,?)").run("a", 4, 6, "m")],
      ["agent_handles", "agent_id", (d: Db) => d.query("INSERT INTO agent_handles(agent_id,since,until,handle) VALUES (?,?,?,?)").run("a", 1, 5, "h1"), (d: Db) => d.query("INSERT INTO agent_handles(agent_id,since,until,handle) VALUES (?,?,?,?)").run("a", 4, 6, "h2")],
      ["agent_leases", "agent_id", (d: Db) => d.query("INSERT INTO agent_leases(id,agent_id,orch_id,since,until,release_reason) VALUES (?,?,?,?,?,?)").run(1,"a","b",1,5,"released"), (d: Db) => d.query("INSERT INTO agent_leases(id,agent_id,orch_id,since,until,release_reason) VALUES (?,?,?,?,?,?)").run(2,"a","b",4,6,"released")],
      ["space_plexers", "space_id", (d: Db) => d.query("INSERT INTO space_plexers(space_id,since,until,plexer_id,handle) VALUES (?,?,?,?,?)").run("s",1,5,"px","h1"), (d: Db) => d.query("INSERT INTO space_plexers(space_id,since,until,plexer_id,handle) VALUES (?,?,?,?,?)").run("s",4,6,"px","h2")],
      ["pack_plexers", "pack_id", (d: Db) => d.query("INSERT INTO pack_plexers(pack_id,since,until,plexer_id,handle) VALUES (?,?,?,?,?)").run("a",1,5,"px","h1"), (d: Db) => d.query("INSERT INTO pack_plexers(pack_id,since,until,plexer_id,handle) VALUES (?,?,?,?,?)").run("a",4,6,"px","h2")],
      ["host_plexers", "host_id+plexer_id", (d: Db) => d.query("INSERT INTO host_plexers(host_id,plexer_id,since,until,version) VALUES (?,?,?,?,?)").run("h","px",1,5,"v1"), (d: Db) => d.query("INSERT INTO host_plexers(host_id,plexer_id,since,until,version) VALUES (?,?,?,?,?)").run("h","px",4,6,"v2")],
      ["task_attempts", "task_id", (d: Db) => d.query("INSERT INTO task_attempts(task_id,since,until,agent_id,dispatch_id,outcome) VALUES (?,?,?,?,?,?)").run("t",1,5,"a","d1","done"), (d: Db) => d.query("INSERT INTO task_attempts(task_id,since,until,agent_id,dispatch_id,outcome) VALUES (?,?,?,?,?,?)").run("t",4,6,"a","d2","done")],
      ["pack_intakes", "pack_id+space_id", (d: Db) => d.query("INSERT INTO pack_intakes(pack_id,space_id,since,until) VALUES (?,?,?,?)").run("a","s",1,5), (d: Db) => d.query("INSERT INTO pack_intakes(pack_id,space_id,since,until) VALUES (?,?,?,?)").run("a","s",4,6)],
    ] as const;
    for (const [, , first, second] of cases) { const d = db(); base(d); addDeps(d); if (["task_attempts"].includes(cases.find(c => c[2] === first)?.[0] as string)) d.query("INSERT INTO tasks VALUES (?,?,?,?,?,?,?,?)").run("t","T","{}","a","a",null,null,1); first(d); expect(() => second(d)).toThrow("overlapping interval"); }
  });

  test("all ten partial unique indexes allow only one open row", () => {
    const cases = [
      ["host_plexers", (d: Db) => { d.query("INSERT INTO host_plexers(host_id,plexer_id,since,version) VALUES (?,?,?,?)").run("h","px",1,"v"); return () => d.query("INSERT INTO host_plexers(host_id,plexer_id,since,version) VALUES (?,?,?,?)").run("h","px",2,"v"); }],
      ["agent_processes", (d: Db) => { d.query("INSERT INTO agent_processes(agent_id,since,host_id,pid) VALUES (?,?,?,?)").run("a",1,"h",1); return () => d.query("INSERT INTO agent_processes(agent_id,since,host_id,pid) VALUES (?,?,?,?)").run("a",2,"h",2); }],
      ["agent_handles", (d: Db) => { d.query("INSERT INTO agent_handles(agent_id,since,handle) VALUES (?,?,?)").run("a",1,"h"); return () => d.query("INSERT INTO agent_handles(agent_id,since,handle) VALUES (?,?,?)").run("a",2,"h"); }],
      ["agent_spaces", (d: Db) => { d.query("INSERT INTO agent_spaces(agent_id,since,space_id) VALUES (?,?,?)").run("a",1,"s"); return () => d.query("INSERT INTO agent_spaces(agent_id,since,space_id) VALUES (?,?,?)").run("a",2,"s"); }],
      ["agent_tunings", (d: Db) => { d.query("INSERT INTO agent_tunings(agent_id,since,model) VALUES (?,?,?)").run("a",1,"m"); return () => d.query("INSERT INTO agent_tunings(agent_id,since,model) VALUES (?,?,?)").run("a",2,"m"); }],
      ["agent_leases", (d: Db) => { d.query("INSERT INTO agent_leases(id,agent_id,orch_id,since) VALUES (?,?,?,?)").run(1,"a","b",1); return () => d.query("INSERT INTO agent_leases(id,agent_id,orch_id,since) VALUES (?,?,?,?)").run(2,"a","b",2); }],
      ["space_plexers", (d: Db) => { d.query("INSERT INTO space_plexers(space_id,since,plexer_id,handle) VALUES (?,?,?,?)").run("s",1,"px","h"); return () => d.query("INSERT INTO space_plexers(space_id,since,plexer_id,handle) VALUES (?,?,?,?)").run("s",2,"px","h"); }],
      ["pack_plexers", (d: Db) => { d.query("INSERT INTO pack_plexers(pack_id,since,plexer_id,handle) VALUES (?,?,?,?)").run("a",1,"px","h"); return () => d.query("INSERT INTO pack_plexers(pack_id,since,plexer_id,handle) VALUES (?,?,?,?)").run("a",2,"px","h"); }],
      ["pack_intakes", (d: Db) => { d.query("INSERT INTO pack_intakes(pack_id,space_id,since) VALUES (?,?,?)").run("a","s",1); return () => d.query("INSERT INTO pack_intakes(pack_id,space_id,since) VALUES (?,?,?)").run("a","s",2); }],
      ["task_attempts", (d: Db) => { d.query("INSERT INTO tasks VALUES (?,?,?,?,?,?,?,?)").run("t","T","{}","a","a",null,null,1); d.query("INSERT INTO task_attempts(task_id,since,agent_id,dispatch_id) VALUES (?,?,?,?)").run("t",1,"a","d"); return () => d.query("INSERT INTO task_attempts(task_id,since,agent_id,dispatch_id) VALUES (?,?,?,?)").run("t",2,"a","e"); }],
    ] as const;
    for (const [, insert] of cases) { const d = db(); base(d); addDeps(d); expect(() => insert(d)()).toThrow(); }
  });

  test("enforces foreign keys and agent checks", () => {
    const d = db(); base(d);
    expect(() => d.query("INSERT INTO agent_processes(agent_id,since,host_id,pid) VALUES (?,?,?,?)").run("missing", 1, "h", 1)).toThrow();
    expect(() => d.query("INSERT INTO agents(id,spawned_by,root_agent_id,harness_id,cwd,name,created_at) VALUES (?,?,?,?,?,?,?)").run("x", "x", "x", "pi", "/", "X", 1)).toThrow();
    expect(() => d.query("INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES (?,?,?,?,?,?)").run("y", "a", "pi", "/", "Y", 1)).toThrow();
  });
  test("requires exactly one task scope", () => {
    const d = db(); base(d); d.query("INSERT INTO spaces(id,name,created_at) VALUES (?,?,?)").run("s", "S", 1);
    const sql = "INSERT INTO tasks(id,text,opts,enqueued_by,scope_agent_id,scope_pack_id,scope_space_id,created_at) VALUES (?,?,?,?,?,?,?,?)";
    expect(() => d.query(sql).run("z", "z", "{}", "a", null, null, null, 1)).toThrow();
    expect(() => d.query(sql).run("z", "z", "{}", "a", "a", "a", null, 1)).toThrow();
  });
  test("allows one open attempt only", () => {
    const d = db(); base(d); d.query("INSERT INTO tasks VALUES (?,?,?,?,?,?,?,?)").run("t", "T", "{}", "a", "a", null, null, 1);
    const sql = "INSERT INTO task_attempts(task_id,since,agent_id,dispatch_id) VALUES (?,?,?,?)";
    d.query(sql).run("t", 1, "a", "d1"); expect(() => d.query(sql).run("t", 2, "a", "d2")).toThrow();
  });
  test("enforces lease checks and one lease", () => {
    const d = db(); base(d); d.query("INSERT INTO agents(id,spawned_by,root_agent_id,harness_id,cwd,name,created_at) VALUES (?,?,?,?,?,?,?)").run("b", "a", "a", "pi", "/", "B", 1);
    const sql = "INSERT INTO agent_leases(id,agent_id,orch_id,since) VALUES (?,?,?,?)";
    d.query(sql).run(1, "a", "b", 1); expect(() => d.query(sql).run(2, "a", "b", 2)).toThrow();
    expect(() => d.query("INSERT INTO agent_leases(id,agent_id,orch_id,since) VALUES (?,?,?,?)").run(3, "b", "b", 1)).toThrow();
    expect(() => d.query("INSERT INTO agent_leases(id,agent_id,orch_id,since,until) VALUES (?,?,?,?,?)").run(4, "b", "a", 1, 2)).toThrow();
  });
  test("rejects overlapping closed intervals", () => {
    const d = db(); base(d); d.query("INSERT INTO agent_handles(agent_id,since,until,handle) VALUES (?,?,?,?)").run("a", 1, 5, "h");
    expect(() => d.query("INSERT INTO agent_handles(agent_id,since,until,handle) VALUES (?,?,?,?)").run("a", 4, 6, "i")).toThrow("overlapping interval");
  });
  test("STRICT rejects text in integer instant", () => { const d = db(); expect(() => d.query("INSERT INTO hosts(id,name,os,created_at) VALUES (?,?,?,?)").run("h", "H", "linux", "x")).toThrow(); });
  test("remaining documented CHECKs and cascades are enforced", () => {
    const d = db(); base(d); addDeps(d);
    expect(() => d.query("INSERT INTO hosts(id,name,os,created_at) VALUES (?,?,?,?)").run("bad","Bad","plan9",1)).toThrow();
    expect(() => d.query("INSERT INTO host_plexers(host_id,plexer_id,since,until,version) VALUES (?,?,?,?,?)").run("h","px",5,5,"v")).toThrow();
    expect(() => d.query("INSERT INTO agent_leases(id,agent_id,orch_id,since,until,release_reason) VALUES (?,?,?,?,?,?)").run(9,"a","b",1,2,"bogus")).toThrow();
    expect(() => d.query("INSERT INTO agent_leases(id,agent_id,orch_id,since,until) VALUES (?,?,?,?,?)").run(10,"a","b",1,2)).toThrow();
    d.query("INSERT INTO agent_endings(agent_id,ended_at,closed_by) VALUES (?,?,?)").run("b",2,"a");
    d.query("DELETE FROM agents WHERE id = ?").run("b");
    expect(d.query("SELECT 1 FROM agent_endings WHERE agent_id='b'").get()).toBeNull();
    d.query("INSERT INTO tasks VALUES (?,?,?,?,?,?,?,?)").run("t","T","{}","a", "a", null, null, 1);
    let since = 10;
    const bad = (outcome: string | null,result: string | null,error: string | null) => () => d.query("INSERT INTO task_attempts(task_id,since,until,agent_id,dispatch_id,outcome,result,error) VALUES (?,?,?,?,?,?,?,?)").run("t",since++,100,"a","x",outcome,result,error);
    expect(bad("other",null,null)).toThrow();
    expect(bad("failed","result",null)).toThrow();
    expect(bad("done","result",null)).not.toThrow();
    expect(bad(null,null,"err")).toThrow();
  });

  test("task_states derives queued claimed and outcomes", () => {
    const d = db(); base(d); const task = "INSERT INTO tasks VALUES (?,?,?,?,?,?,?,?)";
    for (const [id, scope] of [["q", "a"], ["c", "a"], ["d", "a"], ["f", "a"], ["x", "a"]]) d.query(task).run(id, id, "{}", "a", scope, null, null, 1);
    d.query("INSERT INTO task_attempts(task_id,since,agent_id,dispatch_id) VALUES (?,?,?,?)").run("c", 1, "a", "c");
    d.query("INSERT INTO task_attempts(task_id,since,until,agent_id,dispatch_id,outcome,result) VALUES (?,?,?,?,?,?,?)").run("d", 1, 2, "a", "d", "done", "ok");
    d.query("INSERT INTO task_attempts(task_id,since,until,agent_id,dispatch_id,outcome,error) VALUES (?,?,?,?,?,?,?)").run("f", 1, 2, "a", "f", "failed", "bad");
    d.query("INSERT INTO task_cancellations(task_id,cancelled_at,cancelled_by) VALUES (?,?,?)").run("x", 2, "a");
    expect(d.query("SELECT task_id,state FROM task_states ORDER BY task_id").all()).toEqual([{task_id:"c",state:"claimed"},{task_id:"d",state:"done"},{task_id:"f",state:"failed"},{task_id:"q",state:"queued"},{task_id:"x",state:"cancelled"}]);
  });
});
