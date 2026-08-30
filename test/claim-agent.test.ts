import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { agentById, claimAgent, ensureHarness, insertAgent, reclaimAgent } from "../src/store/agent-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { row } from "./helpers/rows.ts";

const dirs: string[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });
function fixture() { const d = mkdtempSync(join(tmpdir(), "orch-claim-agent-")); dirs.push(d); return d; }
function seed(d: string) { ensureHarness(d, "pi", "Pi"); }
function agent(d: string, id: string) { return insertAgent(d, { id, spawnedBy: null, harnessId: "pi", cwd: "/repo", name: id, createdAt: 2_000 }); }
function claimedRow(d: string, id: string) {
  return row(orm(d), sql`SELECT claimed_at, session_token FROM agents WHERE id = ${id}`);
}

describe("claim agent", () => {
  test("unclaimed + A → stamped", () => {
    const d = fixture(); seed(d); agent(d, "A");
    expect(claimAgent(d, "A", "A", 3_000)).toEqual({ kind: "stamped" });
    expect(claimedRow(d, "A")).toEqual({ claimed_at: 3_000, session_token: "A" });
  });

  test("claimed A, claim A → unchanged", () => {
    const d = fixture(); seed(d); agent(d, "A");
    expect(claimAgent(d, "A", "A", 3_000)).toEqual({ kind: "stamped" });
    expect(claimAgent(d, "A", "A", 4_000)).toEqual({ kind: "unchanged" });
    expect(claimedRow(d, "A")).toEqual({ claimed_at: 3_000, session_token: "A" });
  });

  test("claimed A, reclaimAgent(id) then B → stamped with B", () => {
    const d = fixture(); seed(d); agent(d, "A");
    expect(claimAgent(d, "A", "A", 3_000)).toEqual({ kind: "stamped" });
    reclaimAgent(d, "A");
    expect(claimedRow(d, "A")).toEqual({ claimed_at: null, session_token: null });
    expect(claimAgent(d, "A", "B", 4_000)).toEqual({ kind: "stamped" });
    expect(agentById(d, "A")).toMatchObject({ claimedAt: 4_000, sessionToken: "B" });
  });

  test("claimed A, plain claim B → refused claimed-by-other, row unchanged", () => {
    const d = fixture(); seed(d); agent(d, "A");
    expect(claimAgent(d, "A", "A", 3_000)).toEqual({ kind: "stamped" });
    expect(claimAgent(d, "A", "B", 4_000)).toEqual({ kind: "refused", reason: "claimed-by-other" });
    expect(claimedRow(d, "A")).toEqual({ claimed_at: 3_000, session_token: "A" });
  });

  test("unknown id → refused unknown-agent", () => {
    const d = fixture(); seed(d);
    expect(claimAgent(d, "missing", "A", 3_000)).toEqual({ kind: "refused", reason: "unknown-agent" });
  });
});
