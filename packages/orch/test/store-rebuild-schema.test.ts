import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { sql } from "drizzle-orm";

import { numberField, row, stringField } from "./helpers/rows.ts";
type Db = ReturnType<typeof orm>;

const dirs: string[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });
function db() { const d = mkdtempSync(join(tmpdir(), "orch-schema-")); dirs.push(d); return orm(d); }
function base(d: ReturnType<typeof orm>) {
  d.run(sql`INSERT INTO harnesses(id,name) VALUES (${"pi"},${"Pi"})`);
  d.run(sql`INSERT INTO hosts(id,name,os,created_at) VALUES (${"h"},${"Host"},${"linux"},${1})`);
  d.run(sql`INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES (${"a"},${"a"},${"pi"},${"/"},${"A"},${1})`);
}

// This is the complete current sqlite_master inventory.
// Keep it independent of src/db/schema.ts: a missing or superseded object must
// make this test fail rather than being silently excluded as a legacy name.
const expectedInventory = new Set([
  ...["outbox", "catalogues", "events", "runs", "harnesses", "plexers", "hosts", "host_plexers", "spaces", "agents", "agent_worktrees", "agent_endings", "agent_processes", "agent_plexers", "agent_handles", "agent_spaces", "agent_tunings", "agent_leases", "space_plexers", "pack_plexers", "tasks", "task_cancellations", "task_attempts", "pack_intakes", "grant_requests", "grant_request_params", "grant_approvals", "grant_denials", "grant_spends", "__drizzle_migrations"].map(name => `table:${name}`),
  ...["outbox_pending", "runs_agent_started", "one_install", "one_live_process", "one_handle", "one_space", "one_tuning", "one_lease", "one_space_home", "one_pack_home", "one_intake", "one_open_attempt", "agents_by_pack", "agents_by_spawner", "leases_by_orch", "tasks_by_agent", "tasks_by_pack", "tasks_by_space", "tasks_by_enqueuer", "attempts_running", "grants_by_action", "one_agent_per_session"].map(name => `index:${name}`),
  `view:task_states`,
  `view:grant_states`,
  // No triggers. Every interval table's "one live row" rule is the
  // `uniqueIndex(...).where(until IS NULL)` above, which drizzle-kit emits
  // natively; the `<table>_no_overlap` triggers only duplicated it.
]);

function addDeps(d: ReturnType<typeof orm>) {
  d.run(sql`INSERT INTO plexers(id,name) VALUES (${"px"},${"Plexer"})`);
  d.run(sql`INSERT INTO spaces(id,name,created_at) VALUES (${"s"},${"Space"},${1})`);
  d.run(sql`INSERT INTO agents(id,spawned_by,root_agent_id,harness_id,cwd,name,created_at) VALUES (${"b"},${"a"},${"a"},${"pi"},${"/"},${"B"},${1})`);
}

describe("rebuild schema", () => {
  test("rebuild DDL inventory is exact", () => {
    const d = db();
    const rows = d.all(sql`SELECT type,name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'`);
    expect(new Set(rows.map((row) => `${stringField(row, "type")}:${stringField(row, "name")}`))).toEqual(expectedInventory);
  });

  test("the store opens migrated, with foreign keys enabled", () => {
    const d = db();
    expect(numberField(row(d, sql`SELECT COUNT(*) AS applied FROM __drizzle_migrations`), "applied")).toBeGreaterThan(0);
    expect(row(d, sql`PRAGMA foreign_keys`)).toEqual({ foreign_keys: 1 });
  });

  test("all ten partial unique indexes allow only one open row", () => {
    const cases = [
      ["host_plexers", (d: Db) => { d.run(sql`INSERT INTO host_plexers(host_id,plexer_id,since,version) VALUES (${"h"},${"px"},${1},${"v"})`); return () => d.run(sql`INSERT INTO host_plexers(host_id,plexer_id,since,version) VALUES (${"h"},${"px"},${2},${"v"})`); }],
      ["agent_processes", (d: Db) => { d.run(sql`INSERT INTO agent_processes(agent_id,since,host_id,pid) VALUES (${"a"},${1},${"h"},${1})`); return () => d.run(sql`INSERT INTO agent_processes(agent_id,since,host_id,pid) VALUES (${"a"},${2},${"h"},${2})`); }],
      ["agent_handles", (d: Db) => { d.run(sql`INSERT INTO agent_handles(agent_id,since,handle) VALUES (${"a"},${1},${"h"})`); return () => d.run(sql`INSERT INTO agent_handles(agent_id,since,handle) VALUES (${"a"},${2},${"h"})`); }],
      ["agent_spaces", (d: Db) => { d.run(sql`INSERT INTO agent_spaces(agent_id,since,space_id) VALUES (${"a"},${1},${"s"})`); return () => d.run(sql`INSERT INTO agent_spaces(agent_id,since,space_id) VALUES (${"a"},${2},${"s"})`); }],
      ["agent_tunings", (d: Db) => { d.run(sql`INSERT INTO agent_tunings(agent_id,since,model) VALUES (${"a"},${1},${"m"})`); return () => d.run(sql`INSERT INTO agent_tunings(agent_id,since,model) VALUES (${"a"},${2},${"m"})`); }],
      ["agent_leases", (d: Db) => { d.run(sql`INSERT INTO agent_leases(id,agent_id,orch_id,since) VALUES (${1},${"a"},${"b"},${1})`); return () => d.run(sql`INSERT INTO agent_leases(id,agent_id,orch_id,since) VALUES (${2},${"a"},${"b"},${2})`); }],
      ["space_plexers", (d: Db) => { d.run(sql`INSERT INTO space_plexers(space_id,since,plexer_id,handle) VALUES (${"s"},${1},${"px"},${"h"})`); return () => d.run(sql`INSERT INTO space_plexers(space_id,since,plexer_id,handle) VALUES (${"s"},${2},${"px"},${"h"})`); }],
      ["pack_plexers", (d: Db) => { d.run(sql`INSERT INTO pack_plexers(pack_id,since,plexer_id,handle) VALUES (${"a"},${1},${"px"},${"h"})`); return () => d.run(sql`INSERT INTO pack_plexers(pack_id,since,plexer_id,handle) VALUES (${"a"},${2},${"px"},${"h"})`); }],
      ["pack_intakes", (d: Db) => { d.run(sql`INSERT INTO pack_intakes(pack_id,space_id,since) VALUES (${"a"},${"s"},${1})`); return () => d.run(sql`INSERT INTO pack_intakes(pack_id,space_id,since) VALUES (${"a"},${"s"},${2})`); }],
      ["task_attempts", (d: Db) => { d.run(sql`INSERT INTO tasks VALUES (${"t"},${"T"},${"{}"},${"a"},${"a"},${null},${null},${1})`); d.run(sql`INSERT INTO task_attempts(task_id,since,agent_id,dispatch_id) VALUES (${"t"},${1},${"a"},${"d"})`); return () => d.run(sql`INSERT INTO task_attempts(task_id,since,agent_id,dispatch_id) VALUES (${"t"},${2},${"a"},${"e"})`); }],
    ] as const;
    for (const [, insert] of cases) { const d = db(); base(d); addDeps(d); expect(() => insert(d)()).toThrow(); }
  });

  test("enforces foreign keys and agent checks", () => {
    const d = db(); base(d);
    expect(() => d.run(sql`INSERT INTO agent_processes(agent_id,since,host_id,pid) VALUES (${"missing"},${1},${"h"},${1})`)).toThrow();
    expect(() => d.run(sql`INSERT INTO agents(id,spawned_by,root_agent_id,harness_id,cwd,name,created_at) VALUES (${"x"},${"x"},${"x"},${"pi"},${"/"},${"X"},${1})`)).toThrow();
    expect(() => d.run(sql`INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES (${"y"},${"a"},${"pi"},${"/"},${"Y"},${1})`)).toThrow();
  });
  test("requires exactly one task scope", () => {
    const d = db(); base(d); d.run(sql`INSERT INTO spaces(id,name,created_at) VALUES (${"s"},${"S"},${1})`);
    const task = (agent: string | null, pack: string | null) => () =>
      d.run(sql`INSERT INTO tasks(id,text,opts,enqueued_by,scope_agent_id,scope_pack_id,scope_space_id,created_at) VALUES (${"z"},${"z"},${"{}"},${"a"},${agent},${pack},${null},${1})`);
    expect(task(null, null)).toThrow();
    expect(task("a", "a")).toThrow();
  });
  test("allows one open attempt only", () => {
    const d = db(); base(d); d.run(sql`INSERT INTO tasks VALUES (${"t"},${"T"},${"{}"},${"a"},${"a"},${null},${null},${1})`);
    const attempt = (since: number, dispatch: string) => d.run(sql`INSERT INTO task_attempts(task_id,since,agent_id,dispatch_id) VALUES (${"t"},${since},${"a"},${dispatch})`);
    attempt(1, "d1"); expect(() => attempt(2, "d2")).toThrow();
  });
  test("enforces lease checks and one lease", () => {
    const d = db(); base(d); d.run(sql`INSERT INTO agents(id,spawned_by,root_agent_id,harness_id,cwd,name,created_at) VALUES (${"b"},${"a"},${"a"},${"pi"},${"/"},${"B"},${1})`);
    const lease = (id: number, since: number) => d.run(sql`INSERT INTO agent_leases(id,agent_id,orch_id,since) VALUES (${id},${"a"},${"b"},${since})`);
    lease(1, 1); expect(() => lease(2, 2)).toThrow();
    expect(() => d.run(sql`INSERT INTO agent_leases(id,agent_id,orch_id,since) VALUES (${3},${"b"},${"b"},${1})`)).toThrow();
    expect(() => d.run(sql`INSERT INTO agent_leases(id,agent_id,orch_id,since,until) VALUES (${4},${"b"},${"a"},${1},${2})`)).toThrow();
  });
  test("remaining documented CHECKs and cascades are enforced", () => {
    const d = db(); base(d); addDeps(d);
    expect(() => d.run(sql`INSERT INTO hosts(id,name,os,created_at) VALUES (${"bad"},${"Bad"},${"plan9"},${1})`)).toThrow();
    expect(() => d.run(sql`INSERT INTO host_plexers(host_id,plexer_id,since,until,version) VALUES (${"h"},${"px"},${5},${5},${"v"})`)).toThrow();
    expect(() => d.run(sql`INSERT INTO agent_leases(id,agent_id,orch_id,since,until,release_reason) VALUES (${9},${"a"},${"b"},${1},${2},${"bogus"})`)).toThrow();
    expect(() => d.run(sql`INSERT INTO agent_leases(id,agent_id,orch_id,since,until) VALUES (${10},${"a"},${"b"},${1},${2})`)).toThrow();
    d.run(sql`INSERT INTO agent_endings(agent_id,ended_at,closed_by) VALUES (${"b"},${2},${"a"})`);
    d.run(sql`DELETE FROM agents WHERE id = ${"b"}`);
    // Count, not the row: an empty `.get()` is undefined under node:sqlite and
    // null under bun:sqlite, and the cascade is what this asserts either way.
    expect(row(d, sql`SELECT COUNT(*) AS rows FROM agent_endings WHERE agent_id='b'`)).toEqual({ rows: 0 });
    d.run(sql`INSERT INTO tasks VALUES (${"t"},${"T"},${"{}"},${"a"},${"a"},${null},${null},${1})`);
    let since = 10;
    const bad = (outcome: string | null,result: string | null,error: string | null) => () => d.run(sql`INSERT INTO task_attempts(task_id,since,until,agent_id,dispatch_id,outcome,result,error) VALUES (${"t"},${since++},${100},${"a"},${"x"},${outcome},${result},${error})`);
    expect(bad("other",null,null)).toThrow();
    expect(bad("failed","result",null)).toThrow();
    expect(bad("done","result",null)).not.toThrow();
    expect(bad(null,null,"err")).toThrow();
  });

  test("task_states derives queued claimed and outcomes", () => {
    const d = db(); base(d); 
    for (const [id, scope] of [["q", "a"], ["c", "a"], ["d", "a"], ["f", "a"], ["x", "a"]]) d.run(sql`INSERT INTO tasks VALUES (${id},${id},${"{}"},${"a"},${scope},${null},${null},${1})`);
    d.run(sql`INSERT INTO task_attempts(task_id,since,agent_id,dispatch_id) VALUES (${"c"},${1},${"a"},${"c"})`);
    d.run(sql`INSERT INTO task_attempts(task_id,since,until,agent_id,dispatch_id,outcome,result) VALUES (${"d"},${1},${2},${"a"},${"d"},${"done"},${"ok"})`);
    d.run(sql`INSERT INTO task_attempts(task_id,since,until,agent_id,dispatch_id,outcome,error) VALUES (${"f"},${1},${2},${"a"},${"f"},${"failed"},${"bad"})`);
    d.run(sql`INSERT INTO task_cancellations(task_id,cancelled_at,cancelled_by) VALUES (${"x"},${2},${"a"})`);
    expect(d.all(sql`SELECT task_id,state FROM task_states ORDER BY task_id`)).toEqual([{task_id:"c",state:"claimed"},{task_id:"d",state:"done"},{task_id:"f",state:"failed"},{task_id:"q",state:"queued"},{task_id:"x",state:"cancelled"}]);
  });
});
