import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { removeTempDir } from "./helpers/tempdir.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { cmdStatus, parseStatusOptions, scopeFleetRows } from "../src/commands/status.ts";
import { cmdNew } from "../src/commands/lifecycle/reset.ts";
import { cmdRuns } from "../src/commands/runs.ts";
import { upsertRun } from "../src/store/run-rows.ts";
import { resolveTarget } from "../src/entities.ts";
import { ensureHarness, insertAgent } from "../src/store/agent-rows.ts";
import { acquireLease } from "../src/store/lease-rows.ts";
import { orm } from "../src/store/connection.ts";
import { agents } from "../src/db/schema.ts";
import { eq } from "drizzle-orm";
import type { StatusRow } from "../src/types/command.ts";
import type { CallerScope } from "../src/commands/status.ts";

function row(key: string, ownerId: string | null, spaceId = "space"): StatusRow {
  return {
    key, agentId: key, paneId: null, managed: true, name: key, tab: null, agent: "pi",
    owner: ownerId, ownerId, spawnedBy: "different-provenance", spawnedByLabel: null,
    worktree: null, branch: null, cwd: null, focused: false, model: "pi/model", modelShort: "model",
    state: "working", stateFallback: false, exited: false, alive: true, cost: 0, ctxPercent: null,
    task: null, dispatchId: null, lastText: null, backendStatus: null, backend: null, capabilities: null,
    sessionPath: null, presenceDir: null, presenceOnly: true, bridgeAttached: null, tokens: null, turns: null,
    spaceId,
  };
}

const session: CallerScope = { id: "session-a", ceiling: "space", kind: "session" };

describe("session agent visibility", () => {
  test("shows only agents held by the current session, not its provenance children", () => {
    const rows = [row("held-1", "session-a"), row("held-2", "session-a"), row("foreign", "session-b")];
    expect(scopeFleetRows(rows, { spaceWide: false, allPanes: false, caller: session }).map((item) => item.key)).toEqual(["held-1", "held-2"]);
  });

  test("an operator sees every agent in every space", () => {
    const operator: CallerScope = { id: null, ceiling: null, kind: "operator" };
    const rows = [row("held-1", "session-a"), row("held-2", "session-a"), row("foreign", "other-space")];
    expect(scopeFleetRows(rows, { spaceWide: false, allPanes: false, caller: operator }).map((item) => item.key)).toEqual(["held-1", "held-2", "foreign"]);
  });

  test.serial("a session cannot reset a foreign-held agent", async () => {
    const root = mkdtempSync(join(tmpdir(), "orch-session-reset-"));
    const oldDir = process.env.ORCH_DIR;
    const oldMarker = process.env.PI_CODING_AGENT;
    const oldSession = process.env.PI_SESSION_ID;
    process.env.ORCH_DIR = root;
    process.env.PI_CODING_AGENT = "1";
    process.env.PI_SESSION_ID = "session-token";
    writeSettingsFixture(root, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    ensureHarness(root, "pi", "pi", 1);
    insertAgent(root, { id: "sessionaaa", name: "session", spawnedBy: null, harnessId: "pi", cwd: root, createdAt: 1 });
    insertAgent(root, { id: "foreignaaa", name: "foreign", spawnedBy: null, harnessId: "pi", cwd: root, createdAt: 2 });
    insertAgent(root, { id: "holderaaa", name: "holder", spawnedBy: null, harnessId: "pi", cwd: root, createdAt: 3 });
    orm(root).update(agents).set({ sessionToken: "session-token" }).where(eq(agents.id, "sessionaaa")).run();
    acquireLease(root, "foreignaaa", "holderaaa", 4);
    try {
      let failure: unknown;
      try { await cmdNew(["foreign"]); } catch (error: unknown) { failure = error; }
      expect(failure instanceof Error ? failure.message : String(failure)).toBe("No target matches \"foreign\". Run 'orch panes' to list.");
    } finally {
      if (oldDir === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = oldDir;
      if (oldMarker === undefined) delete process.env.PI_CODING_AGENT; else process.env.PI_CODING_AGENT = oldMarker;
      if (oldSession === undefined) delete process.env.PI_SESSION_ID; else process.env.PI_SESSION_ID = oldSession;
      removeTempDir(root);
    }
  });

  test.serial("a session cannot read runs by the exact key of a foreign-held agent", () => {
    const root = mkdtempSync(join(tmpdir(), "orch-session-runs-"));
    const oldDir = process.env.ORCH_DIR;
    const oldMarker = process.env.PI_CODING_AGENT;
    const oldSession = process.env.PI_SESSION_ID;
    process.env.ORCH_DIR = root;
    process.env.PI_CODING_AGENT = "1";
    process.env.PI_SESSION_ID = "session-token";
    writeSettingsFixture(root, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    ensureHarness(root, "pi", "pi", 1);
    insertAgent(root, { id: "sessionaaa", name: "session", spawnedBy: null, harnessId: "pi", cwd: root, createdAt: 1 });
    insertAgent(root, { id: "foreignaaa", name: "foreign", spawnedBy: null, harnessId: "pi", cwd: root, createdAt: 2 });
    insertAgent(root, { id: "holderaaa", name: "holder", spawnedBy: null, harnessId: "pi", cwd: root, createdAt: 3 });
    orm(root).update(agents).set({ sessionToken: "session-token" }).where(eq(agents.id, "sessionaaa")).run();
    acquireLease(root, "foreignaaa", "holderaaa", 4);
    upsertRun(root, { dispatchId: "foreign-run", agentKey: "foreignaaa", state: "done", startedAt: 5 });
    try {
      expect(() => cmdRuns(["foreignaaa", "--json"])).toThrow("No target matches \"foreignaaa\". Run 'orch panes' to list.");
    } finally {
      if (oldDir === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = oldDir;
      if (oldMarker === undefined) delete process.env.PI_CODING_AGENT; else process.env.PI_CODING_AGENT = oldMarker;
      if (oldSession === undefined) delete process.env.PI_SESSION_ID; else process.env.PI_SESSION_ID = oldSession;
      removeTempDir(root);
    }
  });

  test.serial("a session cannot widen status with --space-wide", async () => {
    const oldMarker = process.env.PI_CODING_AGENT;
    const oldSession = process.env.PI_SESSION_ID;
    process.env.PI_CODING_AGENT = "1";
    delete process.env.PI_SESSION_ID;
    try {
      let failure: unknown;
      try {
        await cmdStatus(parseStatusOptions(["--offline", "--space-wide"]));
      } catch (error: unknown) {
        failure = error;
      }
      expect(failure instanceof Error ? failure.message : String(failure)).toBe(
        "--space-wide is operator-only: a driving session may only touch agents it holds.",
      );
    } finally {
      if (oldMarker === undefined) delete process.env.PI_CODING_AGENT; else process.env.PI_CODING_AGENT = oldMarker;
      if (oldSession === undefined) delete process.env.PI_SESSION_ID; else process.env.PI_SESSION_ID = oldSession;
    }
  });

  test.serial("a session cannot resolve a foreign target, even when it shares provenance", () => {
    const root = mkdtempSync(join(tmpdir(), "orch-session-visibility-"));
    const oldDir = process.env.ORCH_DIR;
    const oldMarker = process.env.PI_CODING_AGENT;
    const oldSession = process.env.PI_SESSION_ID;
    process.env.ORCH_DIR = root;
    process.env.PI_CODING_AGENT = "1";
    process.env.PI_SESSION_ID = "session-token";
    writeSettingsFixture(root, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    ensureHarness(root, "pi", "pi", 1);
    insertAgent(root, { id: "sesshold1a", name: "session", spawnedBy: null, harnessId: "pi", cwd: root, createdAt: 1 });
    insertAgent(root, { id: "heldagent1", name: "held-one", spawnedBy: "sesshold1a", harnessId: "pi", cwd: root, createdAt: 2 });
    insertAgent(root, { id: "foreigntag1", name: "foreign", spawnedBy: "sesshold1a", harnessId: "pi", cwd: root, createdAt: 3 });
    insertAgent(root, { id: "otherhold1a", name: "other", spawnedBy: null, harnessId: "pi", cwd: root, createdAt: 4 });
    orm(root).update(agents).set({ sessionToken: "session-token" }).where(eq(agents.id, "sesshold1a")).run();
    acquireLease(root, "heldagent1", "sesshold1a", 4);
    acquireLease(root, "foreigntag1", "otherhold1a", 5);
    try {
      expect(resolveTarget("held-one").key).toBe("heldagent1");
      expect(() => resolveTarget("foreign")).toThrow("No target matches \"foreign\". Run 'orch panes' to list.");
    } finally {
      if (oldDir === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = oldDir;
      if (oldMarker === undefined) delete process.env.PI_CODING_AGENT; else process.env.PI_CODING_AGENT = oldMarker;
      if (oldSession === undefined) delete process.env.PI_SESSION_ID; else process.env.PI_SESSION_ID = oldSession;
      removeTempDir(root);
    }
  });
});
