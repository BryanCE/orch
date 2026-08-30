import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { acquireLease, adoptLease, currentLease, expireLease, handoffLease, leasesByOrch, releaseLease } from "../src/store/lease-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { sql } from "drizzle-orm";

import { row, numberField } from "./helpers/rows.ts";
import { isRecord } from "../src/util.ts";
interface LeaseHistoryRow {
  since: number;
  until: number | null;
  release_reason: string | null;
}

interface LeaseRow extends LeaseHistoryRow {
  id: number;
  agent_id: string;
  orch_id: string;
}

function isLeaseHistoryRow(value: unknown): value is LeaseHistoryRow {
  if (!isRecord(value)) return false;
  return typeof value.since === "number"
    && (typeof value.until === "number" || value.until === null)
    && (typeof value.release_reason === "string" || value.release_reason === null);
}

function isLeaseRow(value: unknown): value is LeaseRow {
  if (!isLeaseHistoryRow(value) || !isRecord(value)) return false;
  return typeof value.id === "number" && typeof value.agent_id === "string" && typeof value.orch_id === "string";
}

function leaseHistoryRows(values: unknown[]): LeaseHistoryRow[] {
  if (!values.every(isLeaseHistoryRow)) throw new Error("malformed lease history row");
  return values;
}

function leaseRows(values: unknown[]): LeaseRow[] {
  if (!values.every(isLeaseRow)) throw new Error("malformed lease row");
  return values;
}

const dirs: string[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "orch-store-leases-")); dirs.push(dir);
  const db = orm(dir);
  db.run(sql`INSERT INTO harnesses(id,name) VALUES ('pi','Pi')`);
  for (const id of ["a", "b", "o1", "o2"]) db.run(sql`INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES (${id},${id},${"pi"},${"/tmp"},${id},${1})`);
  return dir;
}

describe("agent lease rows", () => {
  test("fencing ids are monotonic across agents and never reused after reap", () => {
    const d = fixture();
    const first = acquireLease(d, "a", "o1", 10);
    releaseLease(d, "a", "o1", 11);
    orm(d).run(sql`DELETE FROM agents WHERE id = ${"a"}`);
    const successor = acquireLease(d, "b", "o2", 12);
    expect(successor).toBeGreaterThan(first);
  });
  test("a second open lease is rejected", () => { const d=fixture(); acquireLease(d,"a","o1",10); expect(() => acquireLease(d,"a","o2",11)).toThrow("one_lease"); });
  test("release and expiry close rows with matching reason and exact until", () => {
    const d = fixture();
    acquireLease(d, "a", "o1", 10);
    releaseLease(d, "a", "o1", 20);
    expect(currentLease(d, "a")).toBeNull();
    acquireLease(d, "a", "o1", 30);
    expireLease(d, "a", 40);
    const rows = leaseHistoryRows(orm(d).all(sql`SELECT since,until,release_reason FROM agent_leases ORDER BY id`));
    expect(rows.map((x) => [x.since, x.until, x.release_reason])).toEqual([[10, 20, "released"], [30, 40, "expired"]]);
  });
  test("handoff closes current and inserts a newer row without changing prior facts", () => {
    const d = fixture();
    const prior = acquireLease(d, "a", "o1", 10);
    const id = handoffLease(d, "a", "o1", "o2", 20);
    const rows = leaseRows(orm(d).all(sql`SELECT id,agent_id,orch_id,since,until,release_reason FROM agent_leases ORDER BY id`));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ id: prior, agent_id: "a", orch_id: "o1", since: 10, until: 20, release_reason: "handoff" });
    expect(id).toBeGreaterThan(prior);
    expect(rows[1]).toEqual({ id, agent_id: "a", orch_id: "o2", since: 20, until: null, release_reason: null });
  });
  test("adoption closes prior and inserts a strictly newer adopter row", () => {
    const d = fixture();
    const prior = acquireLease(d, "a", "o1", 10);
    const id = adoptLease(d, "a", "o2", 20);
    const rows = leaseRows(orm(d).all(sql`SELECT id,agent_id,orch_id,since,until,release_reason FROM agent_leases ORDER BY id`));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ id: prior, agent_id: "a", orch_id: "o1", since: 10, until: 20, release_reason: "adopted" });
    expect(id).toBeGreaterThan(prior);
    expect(rows[1]).toEqual({ id, agent_id: "a", orch_id: "o2", since: 20, until: null, release_reason: null });
  });
  test("adoption with no open lease is plain acquire and leaves closed history untouched", () => {
    const d = fixture();
    const prior = acquireLease(d, "a", "o1", 10);
    releaseLease(d, "a", "o1", 15);
    const id = adoptLease(d, "a", "o2", 20);
    const rows = leaseRows(orm(d).all(sql`SELECT id,agent_id,orch_id,since,until,release_reason FROM agent_leases ORDER BY id`));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ id: prior, agent_id: "a", orch_id: "o1", since: 10, until: 15, release_reason: "released" });
    expect(rows[1]).toEqual({ id, agent_id: "a", orch_id: "o2", since: 20, until: null, release_reason: null });
  });
  test("handoff rolls back close when successor insert fails", () => {
    const d = fixture();
    const id = acquireLease(d, "a", "o1", 10);
    expect(() => handoffLease(d, "a", "o1", "a", 20)).toThrow();
    const rows = leaseRows(orm(d).all(sql`SELECT id,agent_id,orch_id,since,until,release_reason FROM agent_leases`));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ id, agent_id: "a", orch_id: "o1", since: 10, until: null, release_reason: null });
  });
  test("wrong-holder release and handoff are rejected", () => {
    const d = fixture();
    acquireLease(d, "a", "o1", 10);
    expect(() => releaseLease(d, "a", "o2", 20)).toThrow("lease_holder");
    expect(() => handoffLease(d, "a", "o2", "o1", 20)).toThrow("lease_holder");
    expect(currentLease(d, "a")?.orchId).toBe("o1");
  });
  test("an agent cannot lease itself", () => { const d=fixture(); expect(() => acquireLease(d,"a","a",1)).toThrow(); });
  test("expiry inserts nothing new", () => { const d=fixture(); const id=acquireLease(d,"a","o1",10); expireLease(d,"a",20); expect(numberField(row(orm(d), sql`SELECT COUNT(*) AS n FROM agent_leases`), "n")).toBe(1); expect(id).toBe(1); });
  test("reads return only open rows", () => { const d=fixture(); acquireLease(d,"a","o1",1); releaseLease(d,"a","o1",2); acquireLease(d,"b","o1",3); expect(currentLease(d,"a")).toBeNull(); expect(leasesByOrch(d,"o1").map(x=>x.agentId)).toEqual(["b"]); });
});
