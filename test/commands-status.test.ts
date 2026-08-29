import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deriveView, displayStatusState, formatNoRowsMessage, formatSpace, normalizeStatusRow, scopeFleetRows, statusRowFromView, warningStatusRow } from "../src/commands/status.ts";
import { deriveDriveState } from "../src/agent/drive-state.ts";
import type { Entity } from "../src/entities.ts";
import { closeAllStores, openStore } from "../src/store/connection.ts";
import { ensureHarness, insertAgent } from "../src/store/agent-rows.ts";
import { acquireLease, releaseLease } from "../src/store/lease-rows.ts";
import { processStartToken } from "../src/process-identity.ts";
import type { AgentView } from "../src/store/agent-view.ts";

/** A complete AgentView, so a fixture never has to lie to the compiler. */
function agentViewFixture(id: string, holder: string | null): AgentView {
  return {
    id, name: "worker", label: null, harnessId: "pi", cwd: "/repo", createdAt: 1,
    spawnedBy: null, spawnedByName: null, rootAgentId: id,
    heldBy: holder === null ? null : { orchId: holder, since: 5 },
    environment: { plexer: "herdr", handle: "app:p1", space: "local", worktree: null, branch: null },
    tuning: { model: null, thinking: null },
    endedAt: null,
  };
}

const seededEntity = {
  key: "appagent01", paneId: "app:p1", name: "worker", tabLabel: "app", agent: "pi",
  focused: true, backendStatus: null, backend: "herdr", sessionPath: null, presenceOnly: false, space: "local",
  presence: {
    key: "appagent01", dir: "/tmp/pres", alive: true, result: { text: "done" },
    status: {
      schema: 1, agent: "pi", state: "working", task: "build the thing", lastText: "on it",
      cost: 2.5, context: { percent: 33 }, model: { provider: "openai-codex", id: "gpt-5.6" },
      thinking: "medium", tokens: { input: 10 }, turns: 4,
    },
  },
} as unknown as Entity;

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
    const row = { key: "dead", state: "working", alive: false, exited: false } as never;
    expect(normalizeStatusRow(row)).toMatchObject({ state: "exited" });
  });
  test("default status reads span every workspace", () => {
    const row = (key: string, workspace: string) => ({
      key, workspace, managed: true, presenceOnly: false, alive: true, exited: false,
    } as never);
    expect(scopeFleetRows([row("a", "w1"), row("b", "w2")], { all: false, allPanes: false }).map((r) => r.key)).toEqual(["a", "b"]);
  });
  test("derives view fields from seeded presence", () => {
    const entity = { key: "hless00001", paneId: null, name: null, tabLabel: null, agent: "pi", focused: false, backendStatus: null, sessionPath: null, presenceOnly: true, workspace: "local", presence: { key: "hless00001", dir: "/tmp", alive: true, result: { text: "answer" }, status: { agent: "pi", state: "working", task: "task", cost: 1.25, context: { percent: 42 } } } } as unknown as Entity;
    const view = deriveView(entity, new Map());
    expect(view).toMatchObject({ agent: "pi", state: "working", task: "task", last: "answer", cost: 1.25, ctxPercent: 42, exited: false });
  });
  test("marks dead presence as exited", () => {
    const entity = { key: "hless00001", paneId: null, name: null, tabLabel: null, agent: "pi", focused: false, backendStatus: null, sessionPath: null, presenceOnly: true, workspace: "local", presence: { key: "hless00001", dir: "/tmp", alive: false, result: null, status: { agent: "pi", state: "working" } } } as unknown as Entity;
    const view = deriveView(entity, new Map());
    expect(view).toMatchObject({ state: "exited", exited: true });
    // The shared row is consumed by both table and JSON renderers.
    expect(statusRowFromView(view, {})).toMatchObject({ state: "exited", alive: false });
  });
  test("asking presence is surfaced as a question while still reporting live state", () => {
    const entity = { ...seededEntity, presence: { ...seededEntity.presence, status: { ...seededEntity.presence?.status, state: "working", asking: { question: "Need approval" }, task: "ignored task" } } } as unknown as Entity;
    const view = deriveView(entity, new Map());
    expect(view).toMatchObject({ state: "asking", exited: false, task: "Q: Need approval" });
    expect(statusRowFromView(view, {})).toMatchObject({ state: "asking", task: "Q: Need approval", alive: true });
  });
  test("shared status row carries presence-derived fields", () => {
    const view = deriveView(seededEntity, new Map());
    const row = statusRowFromView(view, {});
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
    const paned = statusRowFromView(deriveView(seededEntity, new Map()), {});
    expect(paned.capabilities).toEqual({ spaceHome: true, identity: true, handleLookup: false, logPruning: false });

    const detached: Entity = { ...seededEntity, key: "hless00001", backend: "headless" };
    expect(statusRowFromView(deriveView(detached, new Map()), {}).capabilities).toEqual({ spaceHome: false, identity: false, handleLookup: true, logPruning: true });
  });

  test("an agent whose backend orch cannot name reports no capabilities", () => {
    const orphan: Entity = { ...seededEntity, backend: null };
    expect(statusRowFromView(deriveView(orphan, new Map()), {}).capabilities).toBeNull();
  });
  // Provenance remains visible on the internal view, while the status OWNER
  // column answers the current driving lease and never falls back to provenance.
  test("status owner ignores spawning provenance when no lease exists", () => {
    // Keyed by the MINTED ID, never by the pane-bearing presence key: the key
    // welds environment onto identity, and the store is keyed by the id alone.
    const owned = new Map([["appagent01", agentViewFixture("appagent01", "orch-a")]]);
    expect(deriveView(seededEntity, owned).owner).toBe("orch-a");
    expect(statusRowFromView(deriveView(seededEntity, owned), {}).owner).toBe("no orch driving it");
    expect(statusRowFromView(deriveView(seededEntity, new Map()), {}).owner).toBe("no orch driving it");
  });
  test("lease-backed status attribution distinguishes my lease, another lease, and unleased rows", () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-status-"));
    try {
      ensureHarness(dir, "pi", "pi", 1);
      insertAgent(dir, { id: "me", harnessId: "pi", cwd: "/tmp", name: "me", createdAt: 1 });
      insertAgent(dir, { id: "worker0001", harnessId: "pi", cwd: "/tmp", name: "worker", createdAt: 1 });
      insertAgent(dir, { id: "other", harnessId: "pi", cwd: "/tmp", name: "other", createdAt: 1 });
      const key = "worker0001";
      const db = openStore(dir);
      db.query("INSERT INTO hosts(id,name,os,created_at) VALUES ('host','host','linux',1)").run();
      const token = processStartToken(process.pid);
      if (!token) throw new Error("test process has no start token");
      db.query("INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES (?,?,?,?,?)")
        .run("me", 1, "host", process.pid, token);
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
    const view = deriveView(seededEntity, new Map());
    const jsonRow = statusRowFromView(view, {}); // cmdStatusLocal json branch shape
    const localRow = { ...statusRowFromView(view, {}), host: "local" }; // localStatusRows table shape
    expect(localRow).toEqual({ ...jsonRow, host: "local" });
    expect(jsonRow.host).toBeUndefined();
  });
  test("formats workspace labels and warnings", () => {
    expect(formatSpace("w", "Workspace")).toBe("Workspace (w)");
    expect(formatSpace(null, null)).toBe("-");
    expect(warningStatusRow("remote", "down")).toMatchObject({ key: "warning:remote", state: "warning", warning: "down" });
  });
});
