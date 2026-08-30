import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { insertAgent, endAgent, agentById, liveAgents, packMembers, childrenOf, ensureHarness, ensurePlexer, ensureHost, setWorktree, worktreeOf, renameAgent } from "../src/store/agent-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { sql } from "drizzle-orm";

import { numberField, row, stringField } from "./helpers/rows.ts";
const dirs: string[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });
function fixture() { const d = mkdtempSync(join(tmpdir(), "orch-agent-rows-")); dirs.push(d); return d; }
function seed(d: string) { ensureHarness(d, "pi", "Pi"); ensurePlexer(d, "headless", "Headless"); ensureHost(d, "host", "Test Host", "linux", 1_000); }
function agent(d: string, id: string, spawnedBy: string | null = null) { return insertAgent(d, { id, spawnedBy, harnessId: "pi", cwd: "/repo", name: id, createdAt: 2_000 }); }

describe("agent store rows", () => {
  test("insertAgent writes both NULL; agentById reads both back", () => {
    const d = fixture();
    seed(d);
    insertAgent(d, { id: "A", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "A", createdAt: 1 });
    expect(row(orm(d), sql`SELECT claimed_at, session_token FROM agents WHERE id = ${"A"}`)).toEqual({ claimed_at: null, session_token: null });
    expect(agentById(d, "A")).toMatchObject({ claimedAt: null, sessionToken: null });
  });
  test("insertAgent materializes the provenance root", () => { const d = fixture(); seed(d); expect(agent(d, "A").rootAgentId).toBe("A"); agent(d, "B", "A"); expect(agent(d, "C", "B").rootAgentId).toBe("A"); });
  test("endAgent records who closed it, nullable for death", () => { const d = fixture(); seed(d); agent(d, "A"); agent(d, "B"); endAgent(d, "A", 3_000, null); endAgent(d, "B", 4_000, "A"); expect(agentById(d, "A")?.ending).toEqual({ endedAt: 3_000, closedBy: null }); expect(agentById(d, "B")?.ending).toEqual({ endedAt: 4_000, closedBy: "A" }); });
  test("liveAgents excludes agents with an ending", () => { const d = fixture(); seed(d); agent(d, "A"); agent(d, "B"); endAgent(d, "B", 3_000, null); expect(liveAgents(d).map(a => a.id)).toEqual(["A"]); });
  test("packMembers selects the materialized root", () => { const d = fixture(); seed(d); agent(d, "A"); agent(d, "B", "A"); agent(d, "C", "B"); expect(packMembers(d, "A").map(a => a.id)).toEqual(["A", "B", "C"]); });
  test("unknown harness is rejected by the foreign key", () => { const d = fixture(); expect(() => insertAgent(d, { id: "A", spawnedBy: null, harnessId: "missing", cwd: "/repo", name: "A", createdAt: 1 })).toThrow(); });
  test("unknown spawnedBy is rejected by the foreign key", () => { const d = fixture(); expect(() => insertAgent(d, { id: "A", spawnedBy: "missing", harnessId: "pi", cwd: "/repo", name: "A", createdAt: 1 })).toThrow(); });
  test("label maps both null and a value", () => { const d = fixture(); seed(d); expect(insertAgent(d, { id: "A", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "A", label: null, createdAt: 1 }).label).toBeNull(); expect(insertAgent(d, { id: "B", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "B", label: "friendly", createdAt: 2 }).label).toBe("friendly"); });
  test("created_at is an INTEGER epoch millisecond", () => { const d = fixture(); seed(d); insertAgent(d, { id: "A", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "A", createdAt: 1_234_567_890_123 }); const found = row(orm(d), sql`SELECT created_at, typeof(created_at) AS type FROM agents WHERE id = ${"A"}`); expect(numberField(found, "created_at")).toBe(1_234_567_890_123); expect(Number.isInteger(numberField(found, "created_at"))).toBe(true); expect(stringField(found, "type")).toBe("integer"); });
  test("worktreeOf distinguishes repo agents from worktree agents", () => { const d = fixture(); seed(d); agent(d, "repo"); agent(d, "tree"); expect(worktreeOf(d, "repo")).toBeNull(); setWorktree(d, "tree", "/repo-tree", "feature/tree"); expect(worktreeOf(d, "tree")).toEqual({ path: "/repo-tree", branch: "feature/tree" }); const found = row(orm(d), sql`SELECT path, branch, path IS NOT NULL AS path_present, branch IS NOT NULL AS branch_present FROM agent_worktrees WHERE agent_id = ${"tree"}`); expect(stringField(found, "path")).toBe("/repo-tree"); expect(stringField(found, "branch")).toBe("feature/tree"); expect(numberField(found, "path_present")).toBe(1); expect(numberField(found, "branch_present")).toBe(1); });
  test("renameAgent is id-keyed and leaves identity history unchanged", () => { const d = fixture(); seed(d); insertAgent(d, { id: "A", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "shared", label: "a", createdAt: 1 }); insertAgent(d, { id: "B", spawnedBy: "A", harnessId: "pi", cwd: "/repo", name: "shared", label: "b", createdAt: 2 }); expect(agentById(d, "A")?.name).toBe("shared"); expect(agentById(d, "B")?.name).toBe("shared"); const before = orm(d).all(sql`SELECT id, spawned_by, root_agent_id, harness_id, cwd, label, created_at FROM agents ORDER BY id`); expect(renameAgent(d, "B", "renamed")).toBe(true); expect(agentById(d, "A")?.name).toBe("shared"); expect(agentById(d, "B")?.name).toBe("renamed"); expect(orm(d).all(sql`SELECT id, spawned_by, root_agent_id, harness_id, cwd, label, created_at FROM agents ORDER BY id`)).toEqual(before); });
  test("lookup ensure operations are insert-or-ignore", () => { const d = fixture(); ensureHarness(d, "pi", "Pi", 10); ensureHarness(d, "pi", "Changed", 20); ensurePlexer(d, "headless", "Headless", 10); ensurePlexer(d, "headless", "Changed", 20); ensureHost(d, "h", "Host", "linux", 10); ensureHost(d, "h", "Changed", "linux", 20); expect(agentById(d, "none")).toBeNull(); });
  test("childrenOf returns direct descendants", () => { const d = fixture(); seed(d); agent(d, "A"); agent(d, "B", "A"); agent(d, "C", "A"); agent(d, "D", "B"); expect(childrenOf(d, "A").map(a => a.id)).toEqual(["B", "C"]); });
});
