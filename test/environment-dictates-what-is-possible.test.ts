import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openStore } from "../src/store/connection.ts";
import { agentView } from "../src/store/agent-view.ts";
import { ensureHarness, ensureHost, ensureHostPlexer, ensurePlexer, hostPlexers, insertAgent } from "../src/store/agent-rows.ts";
import { setHandle, setSpace } from "../src/store/interval-rows.ts";
import { seedSpace } from "./helpers/space.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { isRecord } from "../src/util.ts";

/**
 * TASKS/02-scope.md E15 — what is possible changes when WHAT IS THERE changes:
 * a move (a new environment record) or an upgrade (a new `host_plexers` row).
 * Neither is a negotiation at the moment of acting.
 *
 * E13 already proved orch never probes for a method. This row is the other half:
 * the thing that DOES change what an agent can do is a recorded fact about where
 * it is, written when it moves — not asked for when orch goes to act, and never
 * stored as a capability of its own. A capability row would be a third place the
 * truth lives, and the one that goes stale.
 */

const dirs: string[] = [];
afterEach(() => { while (dirs.length) removeTempDir(dirs.pop()!); });

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-possible-"));
  dirs.push(dir);
  openStore(dir);
  return dir;
}

function seedAgent(dir: string, id: string): string {
  ensureHarness(dir, "pi", "pi", 1);
  insertAgent(dir, { id, harnessId: "pi", cwd: "/work", name: id, createdAt: 1 });
  return id;
}

function openIntervals(dir: string, table: string, agentId: string): number {
  const row = openStore(dir).query(`SELECT COUNT(*) AS n FROM ${table} WHERE agent_id = ? AND until IS NULL`).get(agentId);
  return isRecord(row) && typeof row.n === "number" ? row.n : -1;
}

describe("the environment dictates what is possible, and nothing negotiates it (E15)", () => {
  test("a MOVE is a new environment record, and what is possible follows it at once", () => {
    const dir = fixture();
    const agent = seedAgent(dir, "moveagent1");

    // No handle: this agent has no pane. That absence is the answer orch gives
    // to `orch zoom` (E14) - it is not a capability orch looked up anywhere.
    expect(agentView(dir, agent)?.environment.handle).toBeNull();

    setHandle(dir, agent, 10, "w1:p1");
    expect(agentView(dir, agent)?.environment.handle).toBe("w1:p1");

    // The move is the record. Nothing was asked of the plexer, and nothing was
    // written about what the agent may now do.
    setHandle(dir, agent, 20, "w2:p7");
    expect(agentView(dir, agent)?.environment.handle).toBe("w2:p7");
    expect(openIntervals(dir, "agent_handles", agent)).toBe(1);
  });

  test("a move closes the interval it left, so history says WHERE it was and WHEN", () => {
    const dir = fixture();
    const agent = seedAgent(dir, "moveagent2");
    setHandle(dir, agent, 10, "w1:p1");
    setHandle(dir, agent, 20, "w2:p7");

    const rows = openStore(dir)
      .query("SELECT handle, since, until FROM agent_handles WHERE agent_id = ? ORDER BY since")
      .all(agent)
      .flatMap((value): { handle: string; since: number; until: number | null }[] => {
        if (!isRecord(value) || typeof value.handle !== "string" || typeof value.since !== "number") return [];
        return [{ handle: value.handle, since: value.since, until: typeof value.until === "number" ? value.until : null }];
      });

    expect(rows).toEqual([
      { handle: "w1:p1", since: 10, until: 20 },
      { handle: "w2:p7", since: 20, until: null },
    ]);
  });

  test("moving one axis leaves every other axis exactly where it was", () => {
    const dir = fixture();
    const agent = seedAgent(dir, "moveagent3");
    seedSpace(dir, "space00001");
    setSpace(dir, agent, 5, "space00001");
    setHandle(dir, agent, 10, "w1:p1");

    setHandle(dir, agent, 20, "w2:p7");

    // A14/A15: the axes are independent satellites, so a move is a move - never
    // a rewrite of the agent that would take its other facts with it.
    const environment = agentView(dir, agent)?.environment;
    expect(environment?.handle).toBe("w2:p7");
    expect(environment?.space).toBe("space00001");
  });

  test("an UPGRADE is a NEW host_plexers row, not an overwrite of the old one", () => {
    const dir = fixture();
    ensureHost(dir, "host0001", "host0001", "linux", 1);
    ensurePlexer(dir, "herdr", "herdr");
    ensureHostPlexer(dir, "host0001", "herdr", "0.9.0", 10);

    ensureHostPlexer(dir, "host0001", "herdr", "1.0.0", 20);

    const rows = hostPlexers(dir, "host0001", "herdr");
    expect(rows).toEqual([
      { hostId: "host0001", plexerId: "herdr", since: 10, until: 20, version: "0.9.0" },
      { hostId: "host0001", plexerId: "herdr", since: 20, until: null, version: "1.0.0" },
    ]);
  });

  test("re-declaring the SAME version is not an upgrade and opens no second row", () => {
    const dir = fixture();
    ensureHost(dir, "host0002", "host0002", "linux", 1);
    ensurePlexer(dir, "herdr", "herdr");
    ensureHostPlexer(dir, "host0002", "herdr", "1.0.0", 10);

    ensureHostPlexer(dir, "host0002", "herdr", "1.0.0", 20);

    // `one_install` admits exactly one open row. A hello that re-states what is
    // already true must not churn the interval, or every registration would read
    // as a fresh install.
    expect(hostPlexers(dir, "host0002", "herdr")).toEqual([
      { hostId: "host0002", plexerId: "herdr", since: 10, until: null, version: "1.0.0" },
    ]);
  });

  test("nothing anywhere records what an agent CAN do", () => {
    const dir = fixture();
    const names = openStore(dir)
      .query("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .flatMap((value): string[] => (isRecord(value) && typeof value.name === "string" ? [value.name] : []));

    // E13: no capability rows, nothing declared to orch by a plexer, nothing
    // negotiated. What is possible is READ from where the thing is, every time.
    for (const table of names) {
      expect(table).not.toMatch(/capabilit|negotiat|supports|feature/i);
    }
  });
});
