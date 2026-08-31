import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getTableColumns, is, sql } from "drizzle-orm";
import { SQLiteTable } from "drizzle-orm/sqlite-core";
import { closeAllStores, orm, ormForRead } from "../src/store/connection.ts";
import * as schema from "../src/db/schema.ts";
import { agentEndings } from "../src/db/schema.ts";
import { insertAgent } from "../src/store/agent-rows.ts";
import { acquireLease } from "../src/store/lease-rows.ts";
import { agentView, agentViews, liveAgentViews } from "../src/store/agent-view.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

/**
 * Work survives its spawner, always. No lifetime, no flag, no decision at spawn.
 *
 * Rule 11 states the same thing from the other side: losing a holder costs a
 * DRIVER, never a life. So there is nothing to decide at spawn — no `--detached`,
 * no lifetime column, no fate-sharing — because there is only one answer and the
 * agent already has it. A flag would imply the other answer exists.
 */

const dirs: string[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });

function fixture(): string {
  const d = mkdtempSync(join(tmpdir(), "orch-survives-spawner-"));
  dirs.push(d);
  orm(d).run(sql`INSERT INTO harnesses(id,name) VALUES (${"pi"},${"Pi"})`);
  return d;
}

describe("work survives its spawner, always (D1)", () => {
  test("ending the spawner leaves the child live, unended and still listed", () => {
    const d = fixture();
    insertAgent(d, { id: "orch", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "orch", createdAt: 1 });
    insertAgent(d, { id: "child", spawnedBy: "orch", harnessId: "pi", cwd: "/repo", name: "child", createdAt: 2 });
    acquireLease(d, "child", "orch", 3);

    // The spawner ends. Nothing about that is a statement about the child.
    orm(d).run(sql`INSERT INTO agent_endings (agent_id, ended_at, closed_by) VALUES (${"orch"},${10},${null})`);

    expect(agentView(d, "child")?.endedAt).toBeNull();
    expect(liveAgentViews(d).map((v) => v.id)).toContain("child");
    // Provenance is immutable: the child still records who spawned it, even
    // though that agent is gone. A dead spawner is not an erased one.
    expect(agentView(d, "child")?.spawnedBy).toBe("orch");
  });

  test("a grandchild is untouched when the middle agent ends", () => {
    const d = fixture();
    insertAgent(d, { id: "orch", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "orch", createdAt: 1 });
    insertAgent(d, { id: "mid", spawnedBy: "orch", harnessId: "pi", cwd: "/repo", name: "mid", createdAt: 2 });
    insertAgent(d, { id: "grand", spawnedBy: "mid", harnessId: "pi", cwd: "/repo", name: "grand", createdAt: 3 });

    orm(d).run(sql`INSERT INTO agent_endings (agent_id, ended_at, closed_by) VALUES (${"mid"},${10},${null})`);

    expect(agentView(d, "grand")?.endedAt).toBeNull();
    expect(liveAgentViews(d).map((v) => v.id).sort()).toEqual(["grand", "orch"]);
  });

  test("the store has no lifetime column and no fate-sharing flag anywhere", () => {
    // Read the SCHEMA, which is already typed, rather than PRAGMA rows that come
    // back as `unknown` and have to be narrowed by hand.
    const banned = /^(lifetime|detached|ephemeral|transient|fate|persist|survives?)$/i;
    const offenders: string[] = [];
    for (const [table, definition] of Object.entries(schema)) {
      if (!is(definition, SQLiteTable)) continue;
      for (const column of Object.keys(getTableColumns(definition))) {
        if (banned.test(column)) offenders.push(`${table}.${column}`);
      }
    }
    // A lifetime column is the stored form of the decision D1 says is never made.
    expect(offenders).toEqual([]);
  });

  test("spawn offers no flag that decides whether work outlives its spawner", () => {
    // The CLI is where such a decision would have to be OFFERED. If no flag
    // exists, no caller can ask for the other behaviour, which is what makes
    // "always" true rather than merely default.
    const spawnDir = new URL("../src/commands/spawn/", import.meta.url);
    const source = readdirSync(spawnDir)
      .filter((name) => name.endsWith(".ts"))
      .map((name) => readFileSync(new URL(name, spawnDir), "utf8"))
      .join("\n");
    for (const flag of ["--detached", "--detach", "--lifetime", "--ephemeral", "--transient", "--kill-with-parent", "--fate"]) {
      expect(source).not.toContain(flag);
    }
  });

  test("closing the spawner never writes an ending for anything it spawned", () => {
    const d = fixture();
    insertAgent(d, { id: "orch", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "orch", createdAt: 1 });
    insertAgent(d, { id: "a", spawnedBy: "orch", harnessId: "pi", cwd: "/repo", name: "a", createdAt: 2 });
    insertAgent(d, { id: "b", spawnedBy: "orch", harnessId: "pi", cwd: "/repo", name: "b", createdAt: 3 });
    orm(d).run(sql`INSERT INTO agent_endings (agent_id, ended_at, closed_by) VALUES (${"orch"},${10},${null})`);

    const endings = ormForRead(d)?.select({ agentId: agentEndings.agentId }).from(agentEndings).all() ?? [];
    expect(endings.map((row) => row.agentId)).toEqual(["orch"]);
    // And the record survives too: every agent is still there to be adopted.
    expect(agentViews(d).map((v) => v.id).sort()).toEqual(["a", "b", "orch"]);
  });
});
