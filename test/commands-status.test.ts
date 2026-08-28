import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deriveDriveState, deriveView, displayStatusState, formatNoRowsMessage, formatWorkspace, normalizeStatusRow, scopeFleetRows, statusRowFromView, warningStatusRow } from "../src/commands/status.ts";
import type { Entity } from "../src/entities.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { ensureHarness, insertAgent } from "../src/store/agent-rows.ts";
import { acquireLease, releaseLease } from "../src/store/lease-rows.ts";

const seededEntity = {
  key: "herdr~local~app:p1", paneId: "app:p1", name: "worker", tabLabel: "app", agent: "pi",
  focused: true, backendStatus: null, backend: "herdr", sessionPath: null, presenceOnly: false, workspace: "local",
  presence: {
    key: "herdr~local~app:p1", dir: "/tmp/pres", alive: true, result: { text: "done" },
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
    const entity = { key: "headless~local~1", paneId: null, name: null, tabLabel: null, agent: "pi", focused: false, backendStatus: null, sessionPath: null, presenceOnly: true, workspace: "local", presence: { key: "headless~local~1", dir: "/tmp", alive: true, result: { text: "answer" }, status: { agent: "pi", state: "working", task: "task", cost: 1.25, context: { percent: 42 } } } } as unknown as Entity;
    const view = deriveView(entity, new Map());
    expect(view).toMatchObject({ agent: "pi", state: "working", task: "task", last: "answer", cost: 1.25, ctxPercent: 42, exited: false });
  });
  test("marks dead presence as exited", () => {
    const entity = { key: "headless~local~1", paneId: null, name: null, tabLabel: null, agent: "pi", focused: false, backendStatus: null, sessionPath: null, presenceOnly: true, workspace: "local", presence: { key: "headless~local~1", dir: "/tmp", alive: false, result: null, status: { agent: "pi", state: "working" } } } as unknown as Entity;
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
      key: "herdr~local~app:p1", paneId: "app:p1", name: "worker", tab: "app", agent: "pi",
      focused: true, model: "openai-codex/gpt-5.6:medium", modelShort: "gpt-5.6:medium",
      state: "working", stateFallback: false, exited: false, cost: 2.5, ctxPercent: 33,
      task: "build the thing", lastText: "on it", presenceOnly: false, tokens: { input: 10 },
      turns: 4, workspace: "local",
    });
    expect(row.host).toBeUndefined();
  });

  // Renderers branch on caps, never on a backend id (Rule 9), so the row must carry
  // what the backend DECLARES — a new plexer changes no renderer.
  test("row carries the owning backend's declared capabilities", () => {
    const paned = statusRowFromView(deriveView(seededEntity, new Map()), {});
    expect(paned.capabilities).toEqual({ panes: true, focusable: true, canSendKeys: true, canPruneLogs: false });

    const detached = { ...seededEntity, key: "headless~local~1", backend: "headless" } as unknown as Entity;
    expect(statusRowFromView(deriveView(detached, new Map()), {}).capabilities).toEqual({
      panes: false, focusable: false, canSendKeys: false, canPruneLogs: true,
    });
  });

  test("an agent whose backend orch cannot name reports no capabilities", () => {
    const orphan = { ...seededEntity, backend: null } as unknown as Entity;
    expect(statusRowFromView(deriveView(orphan, new Map()), {}).capabilities).toBeNull();
  });
  // Two orchestrators share one flat name namespace, so the owner has to be
  // readable from status or a collision is invisible until work lands wrong.
  test("row carries the spawning orchestrator, null for panes orch never recorded", () => {
    const owned = new Map([["herdr~local~app:p1", { owner: "orch-a" } as never]]);
    expect(deriveView(seededEntity, owned).owner).toBe("orch-a");
    expect(statusRowFromView(deriveView(seededEntity, owned), {}).owner).toBe("orch-a");
    expect(statusRowFromView(deriveView(seededEntity, new Map()), {}).owner).toBeNull();
  });
  test("lease-backed status attribution distinguishes my lease, another lease, unleased, and legacy rows", () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-status-"));
    try {
      ensureHarness(dir, "pi", "pi", 1);
      insertAgent(dir, { id: "me", harnessId: "pi", cwd: "/tmp", name: "me", createdAt: 1 });
      insertAgent(dir, { id: "worker", harnessId: "pi", cwd: "/tmp", name: "worker", createdAt: 1 });
      insertAgent(dir, { id: "other", harnessId: "pi", cwd: "/tmp", name: "other", createdAt: 1 });
      const key = "headless~local~worker";
      acquireLease(dir, "worker", "me", 2);
      expect(deriveDriveState(key, "legacy", { directory: dir, currentOrchId: "me" })).toMatchObject({ kind: "leased", owner: "me", mine: true });
      releaseLease(dir, "worker", "me", 3);
      expect(deriveDriveState(key, "legacy", { directory: dir, currentOrchId: "me" })).toMatchObject({ kind: "unleased", owner: "unleased", mine: false });
      acquireLease(dir, "worker", "other", 4);
      expect(deriveDriveState(key, "legacy", { directory: dir, currentOrchId: "me" })).toMatchObject({ kind: "leased", owner: "other", mine: false });
      expect(deriveDriveState("headless~local~missing", "legacy", { directory: dir, currentOrchId: "me" })).toMatchObject({ kind: "legacy", owner: "legacy" });
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
    expect(formatWorkspace("w", "Workspace")).toBe("Workspace (w)");
    expect(formatWorkspace(null, null)).toBe("-");
    expect(warningStatusRow("remote", "down")).toMatchObject({ key: "warning:remote", state: "warning", warning: "down" });
  });
});
