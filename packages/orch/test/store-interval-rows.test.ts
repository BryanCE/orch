import { hostIdentity } from "../src/hosts/identity.ts";
import { placeHere } from "../src/process-place.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { asc, eq, sql } from "drizzle-orm";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { agentForms, agentHandles, agentProcesses, agentSpaces, agentTunings, agents, agentHosts, harnesses, plexers, spaces } from "../src/db/schema.ts";
import { clearSpace, currentHandle, currentProcess, currentSpace, currentTuning, endProcess, recordProcess, setAgentPlexer, setForm, setHandle, setSpace, setTuning } from "../src/store/interval-rows.ts";
import { agentView } from "../src/store/agent-view.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

import type { OrchDir } from "../src/types/core.ts";
import { ensureHost } from "../src/store/agent-rows.ts";
const dirs: OrchDir[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });

function fixture(): OrchDir {
  const dir = tempOrchDir("orch-interval-");
  dirs.push(dir);
  const db = orm(dir);
  db.insert(harnesses).values({ id: "pi", name: "pi", enabledAt: null }).run();
  db.insert(plexers).values({ id: "herdr", name: "herdr", enabledAt: null }).run();
  ensureHost(dir, hostIdentity(), 0);
  db.insert(spaces).values({ id: "s", name: "space", createdBy: null, createdAt: 0 }).run();
  db.insert(agents).values({ id: "a", spawnedBy: null, rootAgentId: "a", harnessId: "pi", name: "a", label: null, kind: "session", createdAt: 0 }).run();
  db.insert(agentHosts).values({ agentId: "a", since: 0, until: null, hostId: hostIdentity().id, cwd: "/" }).run();
  return dir;
}

/** `typeof(column)` per row, in `since` order — the storage class, not the JS type. */
function instantTypes(dir: OrchDir, table: string): unknown[] {
  return orm(dir).all(sql.raw(`SELECT typeof(since) AS since_type, typeof(until) AS until_type FROM ${table} ORDER BY since`));
}

describe("interval satellites", () => {
  test("only one open interval is allowed", () => {
    const dir = fixture();
    setSpace(dir, "a", 1, "s");
    expect(() => orm(dir).insert(agentSpaces).values({ agentId: "a", since: 2, until: null, spaceId: "s" }).run()).toThrow();
  });

  test("half-open adjacency is legal", () => {
    const dir = fixture();
    setHandle(dir, placeHere(dir, "a"), 10, "one");
    setHandle(dir, placeHere(dir, "a"), 20, "two");
    expect(currentHandle(dir, "a")?.handle).toBe("two");
  });

  test("clearSpace closes without opening", () => {
    const dir = fixture();
    setSpace(dir, "a", 10, "s");
    clearSpace(dir, "a", 20);
    expect(currentSpace(dir, "a")).toBeUndefined();
    expect(orm(dir).select({ until: agentSpaces.until }).from(agentSpaces).all()).toEqual([{ until: 20 }]);
  });

  test("agent plexer is immutable one-shot", () => {
    const dir = fixture();
    setAgentPlexer(dir, placeHere(dir, "a"), "herdr");
    expect(() => setAgentPlexer(dir, placeHere(dir, "a"), "herdr")).toThrow();
  });

  test("form changes keep interval history and agents without forms have none", () => {
    const dir = fixture();
    expect(agentView(dir, "a")?.form).toBeNull();
    setForm(dir, "a", 1000, "acp");
    setForm(dir, "a", 2000, "tui");
    expect(orm(dir).select().from(agentForms).orderBy(asc(agentForms.since)).all()).toEqual([
      { agentId: "a", since: 1000, until: 2000, form: "acp" },
      { agentId: "a", since: 2000, until: null, form: "tui" },
    ]);
    expect(agentView(dir, "a")?.form).toBe("tui");
  });

  test("process restart history closes at the successor since", () => {
    const dir = fixture();
    recordProcess(dir, placeHere(dir, "a"), 10, {  pid: 7, startToken: "first" });
    recordProcess(dir, placeHere(dir, "a"), 25, {  pid: 8, startToken: "second" });
    expect(orm(dir).select().from(agentProcesses).orderBy(asc(agentProcesses.since)).all()).toEqual([
      { agentId: "a", since: 10, until: 25, pid: 7, startToken: "first" },
      { agentId: "a", since: 25, until: null, pid: 8, startToken: "second" },
    ]);
  });

  test("process rows carry host and process identity", () => {
    const dir = fixture();
    recordProcess(dir, placeHere(dir, "a"), 10, {  pid: 7, startToken: "tok" });
    expect(currentProcess(dir, placeHere(dir, "a"))).toMatchObject({ host: hostIdentity().id, pid: 7, startToken: "tok" });
    endProcess(dir, placeHere(dir, "a"), 20);
    expect(currentProcess(dir, placeHere(dir, "a"))).toBeUndefined();
  });

  test("process start_token round-trips", () => {
    const dir = fixture();
    recordProcess(dir, placeHere(dir, "a"), 10, {  pid: 7, startToken: "round-trip" });
    expect(currentProcess(dir, placeHere(dir, "a"))?.startToken).toBe("round-trip");
  });

  test("space move history closes at the successor since", () => {
    const dir = fixture();
    orm(dir).insert(spaces).values({ id: "s2", name: "space 2", createdBy: null, createdAt: 0 }).run();
    setSpace(dir, "a", 11, "s");
    setSpace(dir, "a", 42, "s2");
    expect(orm(dir).select().from(agentSpaces).orderBy(asc(agentSpaces.since)).all()).toEqual([
      { agentId: "a", since: 11, until: 42, spaceId: "s" },
      { agentId: "a", since: 42, until: null, spaceId: "s2" },
    ]);
  });

  test("tuning change history closes at the successor since", () => {
    const dir = fixture();
    setTuning(dir, "a", 15, { model: "m1", thinking: null });
    setTuning(dir, "a", 30, { model: "m2", thinking: "high" });
    expect(orm(dir).select().from(agentTunings).orderBy(asc(agentTunings.since)).all()).toEqual([
      { agentId: "a", since: 15, until: 30, model: "m1", thinking: null },
      { agentId: "a", since: 30, until: null, model: "m2", thinking: "high" },
    ]);
  });

  test("handle history preserves each renumbered handle", () => {
    const dir = fixture();
    setHandle(dir, placeHere(dir, "a"), 10, "pane-1");
    setHandle(dir, placeHere(dir, "a"), 20, "pane-2");
    expect(orm(dir).select().from(agentHandles).orderBy(asc(agentHandles.since)).all()).toEqual([
      { agentId: "a", since: 10, until: 20, handle: "pane-1" },
      { agentId: "a", since: 20, until: null, handle: "pane-2" },
    ]);
  });

  test("interval instants are stored as INTEGER values", () => {
    const dir = fixture();
    recordProcess(dir, placeHere(dir, "a"), 1, {  pid: 1, startToken: "first-instance" });
    recordProcess(dir, placeHere(dir, "a"), 2, {  pid: 2, startToken: "relaunch" });
    setHandle(dir, placeHere(dir, "a"), 3, "one");
    setHandle(dir, placeHere(dir, "a"), 4, "two");
    setSpace(dir, "a", 5, "s");
    setSpace(dir, "a", 6, "s");
    setTuning(dir, "a", 7, { model: "m1" });
    setTuning(dir, "a", 8, { model: "m2" });
    for (const table of ["agent_processes", "agent_handles", "agent_spaces", "agent_tunings"]) {
      expect(instantTypes(dir, table)).toEqual([
        { since_type: "integer", until_type: "integer" },
        { since_type: "integer", until_type: "null" },
      ]);
    }
  });

  test("process wrapper rolls back predecessor close when successor fails", () => {
    const dir = fixture();
    recordProcess(dir, placeHere(dir, "a"), 10, {  pid: 7, startToken: "tok" });
    orm(dir).run(sql.raw("CREATE TRIGGER refuse_pid_8 BEFORE INSERT ON agent_processes WHEN NEW.pid = 8 BEGIN SELECT RAISE(ABORT, 'refused'); END"));
    expect(() => recordProcess(dir, placeHere(dir, "a"), 20, {  pid: 8, startToken: "new" })).toThrow();
    expect(orm(dir).select({ since: agentProcesses.since, until: agentProcesses.until, pid: agentProcesses.pid })
      .from(agentProcesses).where(eq(agentProcesses.agentId, "a")).all()).toEqual([{ since: 10, until: null, pid: 7 }]);
  });

  test("space wrapper rolls back predecessor close when successor fails", () => {
    const dir = fixture();
    setSpace(dir, "a", 10, "s");
    expect(() => setSpace(dir, "a", 20, "missing")).toThrow();
    expect(orm(dir).select({ since: agentSpaces.since, until: agentSpaces.until, spaceId: agentSpaces.spaceId })
      .from(agentSpaces).where(eq(agentSpaces.agentId, "a")).all()).toEqual([{ since: 10, until: null, spaceId: "s" }]);
  });

  test("tuning carries model and nullable thinking", () => {
    const dir = fixture();
    setTuning(dir, "a", 10, { model: "m", thinking: null });
    expect(currentTuning(dir, "a")).toMatchObject({ model: "m", thinking: null });
  });
});
