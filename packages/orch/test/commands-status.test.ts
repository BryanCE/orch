import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { displayStatusState, formatNoRowsMessage, formatSpace, normalizeStatusRow, scopeFleetRows, statusRowFromEntity, warningStatusRow } from "../src/commands/status.ts";
import { deriveDriveState } from "../src/agent/drive-state.ts";
import { computeFleetCapacity, formatCapacityLine } from "../src/policy/capacity.ts";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { ensureHarness, insertAgent } from "../src/store/agent-rows.ts";
import { acquireLease, releaseLease } from "../src/store/lease-rows.ts";
import { processStartToken } from "../src/process-identity.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import type { Entity } from "../src/types/core.ts";
import type { StatusRow } from "../src/types/command.ts";
import { presenceEntryFixture } from "./helpers/presence.ts";
import { agentViewFixture } from "./helpers/views.ts";
import { sql } from "drizzle-orm";

/** A complete Entity, so a fixture never has to lie to the compiler. */
function entityFixture(overrides: Partial<Entity> = {}): Entity {
  return {
    key: "appagent01", paneId: "app:p1", managed: true, name: "worker", tabLabel: "app", agent: "pi",
    focused: true, backendStatus: null, backend: "herdr", sessionPath: null, presenceOnly: false, space: "local",
    presence: presenceEntryFixture({
      key: "appagent01", dir: "/tmp/pres",
      status: {
        schema: PRESENCE_SCHEMA, agent: "pi", state: "working", task: "build the thing", lastText: "on it",
        cost: 2.5, context: { percent: 33 }, model: { provider: "openai-codex", id: "gpt-5.6" },
        thinking: "medium", tokens: { input: 10 }, turns: 4,
      },
    }),
    ...overrides,
  };
}

function statusRowFixture(overrides: Partial<StatusRow> = {}): StatusRow {
  return {
    key: "row", paneId: null, managed: true, name: null, tab: null, agent: null, owner: null,
    spawnedBy: null, spawnedByLabel: null, worktree: null, branch: null, cwd: null, focused: false,
    model: "-", modelShort: "-", state: "unknown", stateFallback: false, exited: false, alive: true,
    cost: 0, ctxPercent: null, task: null, dispatchId: null, lastText: null, backendStatus: null,
    backend: null, capabilities: null, sessionPath: null, presenceDir: null, presenceOnly: false,
    tokens: null, turns: null,
    ...overrides,
  };
}

const seededEntity = entityFixture();

describe("commands/status", () => {
  test("zero-row message reports gathered counts and backend response", () => {
    expect(formatNoRowsMessage({ agentsSeen: 3, alive: 1, backendAnswered: true })).toBe(
      "No panes found (agent records seen: 3; alive: 1; backend answered: yes).\n",
    );
  });

  test("dead rows never display stale live state", () => {
    expect(displayStatusState({ state: "working", alive: false, exited: false })).toBe("exited");
    expect(displayStatusState({ state: "working", alive: true, exited: false })).toBe("working");
  });
  test("shared row boundary normalizes stale state for every renderer", () => {
    const row = statusRowFixture({ key: "dead", state: "working", alive: false, exited: false });
    expect(normalizeStatusRow(row)).toMatchObject({ state: "exited" });
  });
  test("default status reads span every workspace", () => {
    const row = (key: string, spaceId: string): StatusRow => statusRowFixture({ key, spaceId });
    expect(scopeFleetRows([row("a", "w1"), row("b", "w2")], { all: false, allPanes: false }).map((r) => r.key)).toEqual(["a", "b"]);
  });
  test("derives status row fields from seeded presence", () => {
    const entity = entityFixture({
      key: "hless00001", paneId: null, name: null, tabLabel: null, focused: false,
      presenceOnly: true, space: "local",
      presence: {
        key: "hless00001", dir: "/tmp", alive: true, result: { text: "answer" },
        status: { schema: PRESENCE_SCHEMA, agent: "pi", state: "working", task: "task", cost: 1.25, context: { percent: 42 } },
      },
    });
    const row = statusRowFromEntity(entity, new Map());
    expect(row).toMatchObject({ agent: "pi", state: "working", task: "task", lastText: "answer", cost: 1.25, ctxPercent: 42, exited: false });
  });
  test("marks dead presence as exited", () => {
    const entity = entityFixture({
      key: "hless00001", paneId: null, name: null, tabLabel: null, focused: false,
      presenceOnly: true, space: "local",
      presence: {
        key: "hless00001", dir: "/tmp", alive: false, result: null,
        status: { schema: PRESENCE_SCHEMA, agent: "pi", state: "working" },
      },
    });
    const row = statusRowFromEntity(entity, new Map());
    expect(row).toMatchObject({ state: "exited", exited: true });
    // The shared row is consumed by both table and JSON renderers.
    expect(row).toMatchObject({ state: "exited", alive: false });
  });
  test("asking presence is surfaced as a question while still reporting live state", () => {
    const entity = entityFixture({
      presence: presenceEntryFixture({
        status: {
          schema: PRESENCE_SCHEMA, agent: "pi", state: "working", asking: { question: "Need approval", id: "q1", ts: "now" },
          task: "ignored task",
        },
      }),
    });
    const row = statusRowFromEntity(entity, new Map());
    expect(row).toMatchObject({ state: "asking", exited: false, task: "Q: Need approval", alive: true });
  });
  test("shared status row carries presence-derived fields", () => {
    const row = statusRowFromEntity(seededEntity, new Map());
    expect(row).toMatchObject({
      key: "appagent01", paneId: "app:p1", name: "worker", tab: "app", agent: "pi",
      focused: true, model: "openai-codex/gpt-5.6:medium", modelShort: "gpt-5.6:medium",
      state: "working", stateFallback: false, exited: false, cost: 2.5, ctxPercent: 33,
      task: "build the thing", lastText: "on it", presenceOnly: false, tokens: { input: 10 },
      turns: 4, spaceId: "local",
    });
    expect(row.host).toBeUndefined();
  });

  // Renderers branch on caps, never on a backend id (Rule 9), so the row must carry
  // what the backend DECLARES — a new plexer changes no renderer.
  test("row carries the owning backend's declared capabilities", () => {
    const paned = statusRowFromEntity(seededEntity, new Map());
    expect(paned.capabilities).toEqual({ spaceHome: true, identity: true, handleLookup: false, logPruning: false });

    const detached: Entity = { ...seededEntity, key: "hless00001", backend: "headless" };
    expect(statusRowFromEntity(detached, new Map()).capabilities).toEqual({ spaceHome: false, identity: false, handleLookup: true, logPruning: true });
  });

  test("an agent whose backend orch cannot name reports no capabilities", () => {
    const orphan: Entity = { ...seededEntity, backend: null };
    expect(statusRowFromEntity(orphan, new Map()).capabilities).toBeNull();
  });
  // The status OWNER column answers the current driving lease and never falls
  // back to spawning provenance.
  test("status owner ignores spawning provenance when no lease exists", () => {
    // Keyed by the MINTED ID, never by the pane-bearing presence key: the key
    // welds environment onto identity, and the store is keyed by the id alone.
    const owned = new Map([["appagent01", agentViewFixture("appagent01", { heldBy: { orchId: "orch-a", since: 5 } })]]);
    expect(statusRowFromEntity(seededEntity, owned).owner).toBe("no orch driving it");
    expect(statusRowFromEntity(seededEntity, new Map()).owner).toBe("no orch driving it");
  });
  test("lease-backed status attribution distinguishes my lease, another lease, and unleased rows", () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-status-"));
    try {
      ensureHarness(dir, "pi", "pi", 1);
      insertAgent(dir, { id: "me", harnessId: "pi", cwd: "/tmp", name: "me", createdAt: 1 });
      insertAgent(dir, { id: "worker0001", harnessId: "pi", cwd: "/tmp", name: "worker", createdAt: 1 });
      insertAgent(dir, { id: "other", harnessId: "pi", cwd: "/tmp", name: "other", createdAt: 1 });
      const key = "worker0001";
      const db = orm(dir);
      db.run(sql`INSERT INTO hosts(id,name,os,created_at) VALUES ('host','host','linux',1)`);
      const token = processStartToken(process.pid);
      if (!token) throw new Error("test process has no start token");
      db.run(sql`INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES (${"me"},${1},${"host"},${process.pid},${token})`);
      acquireLease(dir, "worker0001", "me", 2);
      expect(deriveDriveState(key, { directory: dir, currentOrchId: "me" })).toMatchObject({ kind: "leased", owner: "me", mine: true });
      releaseLease(dir, "worker0001", "me", 3);
      expect(deriveDriveState(key, { directory: dir, currentOrchId: "me" })).toMatchObject({ kind: "unleased", owner: "no orch driving it", mine: false });
      acquireLease(dir, "worker0001", "other", 4);
      expect(deriveDriveState(key, { directory: dir, currentOrchId: "me" })).toMatchObject({ kind: "unleased", owner: "no orch driving it (holder gone)", mine: false });
    } finally {
      closeAllStores();
      rmSync(dir, { recursive: true, force: true });
    }
  });
  test("json branch and local table branch derive identical rows apart from host", () => {
    const jsonRow = statusRowFromEntity(seededEntity, new Map()); // cmdStatusLocal json branch shape
    const localRow = { ...statusRowFromEntity(seededEntity, new Map()), host: "local" }; // localStatusRows table shape
    expect(localRow).toEqual({ ...jsonRow, host: "local" });
    expect(jsonRow.host).toBeUndefined();
  });
  test("capacity footer uses configured caps and groups holders by root", () => {
    const root = agentViewFixture("root", { name: "root", rootAgentId: "root", environment: { space: "main" } });
    const child = agentViewFixture("child", { name: "child", rootAgentId: "root", spawnedBy: "root", environment: { space: "main" } });
    const other = agentViewFixture("other", { name: "other", rootAgentId: "other", environment: { space: "main" } });
    const views = new Map([root, child, other].map((view) => [view.id, view]));
    const presence = new Map([root, child, other].map((view) => [view.id, presenceEntryFixture({ key: view.id, alive: true, dir: "/tmp" })]));
    const capacity = computeFleetCapacity(views, presence, {
      fleet: { max_agents_per_pack: 10, max_depth: 3, max_agents_per_space: { main: 6 }, max_agents_total: 10, worker_peer_tools: false, cross_space: false },
      spaces: { main: "main" },
    });
    expect(capacity.pack.holders).toEqual([
      { id: "other", name: "other", count: 1 },
      { id: "root", name: "root", count: 2 },
    ]);
    expect(formatCapacityLine(capacity, "root")).toBe("pack 3/10 (you 2, other 1) - space main 3/6 - machine 3/10");
  });

  test("formats workspace labels and warnings", () => {
    expect(formatSpace("w", "Workspace")).toBe("Workspace (w)");
    expect(formatSpace(null, null)).toBe("-");
    expect(warningStatusRow("remote", "down")).toMatchObject({ key: "warning:remote", state: "warning", warning: "down" });
  });
});
