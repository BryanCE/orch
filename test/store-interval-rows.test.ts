import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { asc, eq, sql } from "drizzle-orm";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { agentHandles, agentProcesses, agentSpaces, agentTunings, agents, harnesses, hosts, plexers, spaces } from "../src/db/schema.ts";
import { clearSpace, currentHandle, currentProcess, currentSpace, currentTuning, endProcess, recordProcess, setAgentPlexer, setHandle, setSpace, setTuning } from "../src/store/interval-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const dirs: string[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-interval-"));
  dirs.push(dir);
  const db = orm(dir);
  db.insert(harnesses).values({ id: "pi", name: "pi", enabledAt: null }).run();
  db.insert(plexers).values({ id: "herdr", name: "herdr", enabledAt: null }).run();
  db.insert(hosts).values({ id: "h", name: "host", os: "linux", createdAt: 0 }).run();
  db.insert(spaces).values({ id: "s", name: "space", createdBy: null, createdAt: 0 }).run();
  db.insert(agents).values({ id: "a", spawnedBy: null, rootAgentId: "a", harnessId: "pi", cwd: "/", name: "a", label: null, createdAt: 0 }).run();
  return dir;
}

/** `typeof(column)` per row, in `since` order — the storage class, not the JS type. */
function instantTypes(dir: string, table: string): unknown[] {
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
    setHandle(dir, "a", 10, "one");
    setHandle(dir, "a", 20, "two");
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
    setAgentPlexer(dir, "a", "herdr");
    expect(() => setAgentPlexer(dir, "a", "herdr")).toThrow();
  });

  test("process restart history closes at the successor since", () => {
    const dir = fixture();
    recordProcess(dir, "a", 10, { hostId: "h", pid: 7, startToken: "first" });
    recordProcess(dir, "a", 25, { hostId: "h", pid: 8, startToken: "second" });
    expect(orm(dir).select().from(agentProcesses).orderBy(asc(agentProcesses.since)).all()).toEqual([
      { agentId: "a", since: 10, until: 25, hostId: "h", pid: 7, startToken: "first" },
      { agentId: "a", since: 25, until: null, hostId: "h", pid: 8, startToken: "second" },
    ]);
  });

  test("process rows carry host and process identity", () => {
    const dir = fixture();
    recordProcess(dir, "a", 10, { hostId: "h", pid: 7, startToken: "tok" });
    expect(currentProcess(dir, "a")).toMatchObject({ hostId: "h", pid: 7, startToken: "tok" });
    endProcess(dir, "a", 20);
    expect(currentProcess(dir, "a")).toBeUndefined();
  });

  test("nullable process start_token round-trips as null", () => {
    const dir = fixture();
    recordProcess(dir, "a", 10, { hostId: "h", pid: 7 });
    expect(currentProcess(dir, "a")?.startToken).toBeNull();
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
    setHandle(dir, "a", 10, "pane-1");
    setHandle(dir, "a", 20, "pane-2");
    expect(orm(dir).select().from(agentHandles).orderBy(asc(agentHandles.since)).all()).toEqual([
      { agentId: "a", since: 10, until: 20, handle: "pane-1" },
      { agentId: "a", since: 20, until: null, handle: "pane-2" },
    ]);
  });

  test("interval instants are stored as INTEGER values", () => {
    const dir = fixture();
    recordProcess(dir, "a", 1, { hostId: "h", pid: 1 });
    recordProcess(dir, "a", 2, { hostId: "h", pid: 2 });
    setHandle(dir, "a", 3, "one");
    setHandle(dir, "a", 4, "two");
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
    recordProcess(dir, "a", 10, { hostId: "h", pid: 7, startToken: "tok" });
    expect(() => recordProcess(dir, "a", 20, { hostId: "missing", pid: 8, startToken: "new" })).toThrow();
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
