import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores, openStore } from "../src/store/connection.ts";
import { closeThenOpen, currentHandle, currentProcess, currentSpace, currentTuning, endProcess, recordProcess, setAgentPlexer, setHandle, setSpace, setTuning, clearSpace } from "../src/store/interval-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const dirs: string[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });
function fixture() { const d = mkdtempSync(join(tmpdir(), "orch-interval-")); dirs.push(d); const db = openStore(d); db.query("INSERT INTO harnesses (id,name,enabled_at) VALUES ('pi','pi',NULL)").run(); db.query("INSERT INTO plexers (id,name,enabled_at) VALUES ('herdr','herdr',NULL)").run(); db.query("INSERT INTO hosts (id,name,os,created_at) VALUES ('h','host','linux',0)").run(); db.query("INSERT INTO spaces (id,name,created_by,created_at) VALUES ('s','space',NULL,0)").run(); db.query("INSERT INTO agents (id,spawned_by,root_agent_id,harness_id,cwd,name,label,created_at) VALUES ('a',NULL,'a','pi','/','a',NULL,0)").run(); return db; }

describe("interval satellites", () => {
  test("closeThenOpen is atomic", () => { const db = fixture(); setHandle(db, "a", 10, "one"); expect(() => closeThenOpen(db, "agent_handles", "a", 20, { handle: null })).toThrow(); expect(currentHandle(db, "a")).toEqual({ agent_id: "a", since: 0 + 10, until: null, handle: "one" }); });
  test("only one open interval is allowed", () => { const db = fixture(); db.query("INSERT INTO agent_spaces VALUES ('a',1,NULL,'s')").run(); expect(() => db.query("INSERT INTO agent_spaces VALUES ('a',2,NULL,'s')").run()).toThrow(); });
  test("closed process intervals cannot overlap", () => {
    const db = fixture();
    db.query("INSERT INTO agent_processes (agent_id, since, until, host_id, pid, start_token) VALUES ('a', 10, 20, 'h', 1, NULL)").run();
    expect(() => db.query("INSERT INTO agent_processes (agent_id, since, until, host_id, pid, start_token) VALUES ('a', 15, 25, 'h', 2, NULL)").run()).toThrow("overlapping interval");
  });
  test("closed space intervals cannot overlap", () => {
    const db = fixture();
    db.query("INSERT INTO agent_spaces (agent_id, since, until, space_id) VALUES ('a', 10, 20, 's')").run();
    expect(() => db.query("INSERT INTO agent_spaces (agent_id, since, until, space_id) VALUES ('a', 15, 25, 's')").run()).toThrow("overlapping interval");
  });
  test("half-open adjacency is legal", () => { const db = fixture(); setHandle(db, "a", 10, "one"); setHandle(db, "a", 20, "two"); expect(currentHandle(db, "a")?.handle).toBe("two"); });
  test("clearSpace closes without opening", () => { const db = fixture(); setSpace(db, "a", 10, "s"); clearSpace(db, "a", 20); expect(currentSpace(db, "a")).toBeNull(); expect(db.query("SELECT until FROM agent_spaces").get()).toEqual({ until: 20 }); });
  test("agent plexer is immutable one-shot", () => { const db = fixture(); setAgentPlexer(db, "a", "herdr"); expect(() => setAgentPlexer(db, "a", "herdr")).toThrow(); });
  test("process restart history closes at the successor since", () => {
    const db = fixture();
    recordProcess(db, "a", 10, { hostId: "h", pid: 7, startToken: "first" });
    recordProcess(db, "a", 25, { hostId: "h", pid: 8, startToken: "second" });
    expect(db.query("SELECT agent_id, since, until, host_id, pid, start_token FROM agent_processes ORDER BY since").all()).toEqual([
      { agent_id: "a", since: 10, until: 25, host_id: "h", pid: 7, start_token: "first" },
      { agent_id: "a", since: 25, until: null, host_id: "h", pid: 8, start_token: "second" },
    ]);
  });
  test("process rows carry host and process identity", () => { const db = fixture(); recordProcess(db, "a", 10, { hostId: "h", pid: 7, startToken: "tok" }); expect(currentProcess(db, "a")).toMatchObject({ host_id: "h", pid: 7, start_token: "tok" }); endProcess(db, "a", 20); expect(currentProcess(db, "a")).toBeNull(); });
  test("nullable process start_token round-trips as null", () => {
    const db = fixture();
    recordProcess(db, "a", 10, { hostId: "h", pid: 7 });
    expect(currentProcess(db, "a")?.start_token).toBeNull();
    expect(db.query("SELECT start_token FROM agent_processes WHERE agent_id = 'a'").get()).toEqual({ start_token: null });
  });
  test("space move history closes at the successor since", () => {
    const db = fixture();
    db.query("INSERT INTO spaces (id, name, created_by, created_at) VALUES ('s2', 'space 2', NULL, 0)").run();
    setSpace(db, "a", 11, "s");
    setSpace(db, "a", 42, "s2");
    expect(db.query("SELECT agent_id, since, until, space_id FROM agent_spaces ORDER BY since").all()).toEqual([
      { agent_id: "a", since: 11, until: 42, space_id: "s" },
      { agent_id: "a", since: 42, until: null, space_id: "s2" },
    ]);
  });
  test("tuning change history closes at the successor since", () => {
    const db = fixture();
    setTuning(db, "a", 15, { model: "m1", thinking: null });
    setTuning(db, "a", 30, { model: "m2", thinking: "high" });
    expect(db.query("SELECT agent_id, since, until, model, thinking FROM agent_tunings ORDER BY since").all()).toEqual([
      { agent_id: "a", since: 15, until: 30, model: "m1", thinking: null },
      { agent_id: "a", since: 30, until: null, model: "m2", thinking: "high" },
    ]);
  });
  test("handle history preserves each renumbered handle", () => {
    const db = fixture();
    setHandle(db, "a", 10, "pane-1");
    setHandle(db, "a", 20, "pane-2");
    expect(db.query("SELECT agent_id, since, until, handle FROM agent_handles ORDER BY since").all()).toEqual([
      { agent_id: "a", since: 10, until: 20, handle: "pane-1" },
      { agent_id: "a", since: 20, until: null, handle: "pane-2" },
    ]);
  });
  test("interval instants are stored as INTEGER values", () => {
    const db = fixture();
    recordProcess(db, "a", 1, { hostId: "h", pid: 1 });
    recordProcess(db, "a", 2, { hostId: "h", pid: 2 });
    setHandle(db, "a", 3, "one");
    setHandle(db, "a", 4, "two");
    setSpace(db, "a", 5, "s");
    setSpace(db, "a", 6, "s");
    setTuning(db, "a", 7, { model: "m1" });
    setTuning(db, "a", 8, { model: "m2" });
    for (const table of ["agent_processes", "agent_handles", "agent_spaces", "agent_tunings"]) {
      expect(db.query(`SELECT typeof(since) AS since_type, typeof(until) AS until_type FROM ${table} ORDER BY since`).all()).toEqual([
        { since_type: "integer", until_type: "integer" },
        { since_type: "integer", until_type: "null" },
      ]);
    }
  });
  test("process wrapper rolls back predecessor close when successor fails", () => {
    const db = fixture();
    recordProcess(db, "a", 10, { hostId: "h", pid: 7, startToken: "tok" });
    expect(() => recordProcess(db, "a", 20, { hostId: "missing", pid: 8, startToken: "new" })).toThrow();
    expect(db.query("SELECT since, until, pid FROM agent_processes WHERE agent_id = 'a'").all()).toEqual([{ since: 10, until: null, pid: 7 }]);
  });
  test("space wrapper rolls back predecessor close when successor fails", () => {
    const db = fixture();
    setSpace(db, "a", 10, "s");
    expect(() => setSpace(db, "a", 20, "missing")).toThrow();
    expect(db.query("SELECT since, until, space_id FROM agent_spaces WHERE agent_id = 'a'").all()).toEqual([{ since: 10, until: null, space_id: "s" }]);
  });
  test("tuning carries model and nullable thinking", () => { const db = fixture(); setTuning(db, "a", 10, { model: "m", thinking: null }); expect(currentTuning(db, "a")).toMatchObject({ model: "m", thinking: null }); });
});
