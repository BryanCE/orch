import type { OrchDir } from "../src/types/core.ts";
import { orchDirAt } from "../src/services.ts";
import { describe, expect, test } from "bun:test";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { HARNESS_SESSION_ENV } from "../src/adapters/session-env.ts";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { cmdClean, liveWorktreeOwner } from "../src/commands/clean.ts";
import { claimAgent } from "../src/store/agent-rows.ts";
import { insertOutboxMessage, selectOutboxMessage } from "../src/store/outbox-rows.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { CommandRefusal } from "../src/refusal.ts";
import { ensurePresenceAgentDir } from "../src/presence/history.ts";
import { seedStatus } from "./helpers/presence.ts";
import { loadPresence } from "../src/presence/store.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { seedAgent, seedLiveProcess } from "./helpers/agent.ts";
import { isolateHarnessSession } from "./helpers/env.ts";
import { testServices } from "./helpers/services.ts";
import { servedServices } from "./helpers/daemon-state.ts";
import type { RpcServer } from "../src/types/daemon.ts";

const servers: RpcServer[] = [];

/** Capture what a refusal wrote, and put the real stream back afterwards. */

describe("commands/clean", () => {
  test("the forced sweep reaps dead agent dirs but preserves live processes", async () => {
    const root: OrchDir = tempOrchDir("orch-command-clean-");
    const old: OrchDir | undefined = process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR); process.env.ORCH_DIR = root;
    try {
      seedStatus(root, "deadagent1", {});
      ensurePresenceAgentDir("deadagent1", root);
      seedAgent("liveagent1", {}, root);
      seedLiveProcess(root, "liveagent1");
      seedStatus(root, "liveagent1", {});
      ensurePresenceAgentDir("liveagent1", root);
      await cmdClean(await servedServices({ orchDir: root, settings: { defaults: { adapter: "pi", backend: "headless" } } }, servers), ["--force", "--json"]);
      expect(existsSync(join(root, "agents", "deadagent1"))).toBe(false);
      expect(existsSync(join(root, "agents", "liveagent1"))).toBe(true);
      expect(loadPresence(root).has("deadagent1")).toBe(false);
      expect(loadPresence(root).has("liveagent1")).toBe(true);
    } finally { while (servers.length) await servers.pop()!.close(); closeAllStores(); if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old; removeTempDir(root); }
  });

  test("bare clean keeps ended agents as history and closes their queued writes", async () => {
    const root = tempOrchDir("orch-command-clean-bare-");
    const old: OrchDir | undefined = process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR); process.env.ORCH_DIR = root;
    try {
      seedStatus(root, "deadagent1", {});
      ensurePresenceAgentDir("deadagent1", root);
      seedAgent("liveagent1", {}, root);
      seedLiveProcess(root, "liveagent1");
      seedStatus(root, "liveagent1", {});
      ensurePresenceAgentDir("liveagent1", root);
      seedStatus(root, "herdr~wF~p9", {});
      ensurePresenceAgentDir("herdr~wF~p9", root);
      insertOutboxMessage(root, { id: "to-dead", target: "deadagent1", payload: { action: "dispatch", text: "x" } });
      insertOutboxMessage(root, { id: "to-reaped", target: "reapedagent", payload: { action: "dispatch", text: "x" } });
      insertOutboxMessage(root, { id: "to-live", target: "liveagent1", payload: { action: "dispatch", text: "x" } });

      await cmdClean(await servedServices({ orchDir: root, settings: { defaults: { adapter: "pi", backend: "headless" } } }, servers), ["--json"]);

      expect(existsSync(join(root, "agents", "deadagent1"))).toBe(true);
      expect(existsSync(join(root, "agents", "liveagent1"))).toBe(true);
      expect(existsSync(join(root, "agents", "herdr~wF~p9"))).toBe(false);
      expect(selectOutboxMessage(root, "to-dead")?.state).toBe("undeliverable");
      expect(selectOutboxMessage(root, "to-reaped")?.state).toBe("undeliverable");
      expect(selectOutboxMessage(root, "to-live")?.state).toBe("pending");
    } finally { while (servers.length) await servers.pop()!.close(); closeAllStores(); if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old; removeTempDir(root); }
  });

  test("--force reaps the ended agent and closes its queued writes", async () => {
    const root = tempOrchDir("orch-command-clean-force-");
    const old: OrchDir | undefined = process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR); process.env.ORCH_DIR = root;
    try {
      seedStatus(root, "deadagent1", {});
      ensurePresenceAgentDir("deadagent1", root);
      insertOutboxMessage(root, { id: "to-dead", target: "deadagent1", payload: { action: "dispatch", text: "x" } });

      await cmdClean(await servedServices({ orchDir: root, settings: { defaults: { adapter: "pi", backend: "headless" } } }, servers), ["--force", "--json"]);

      expect(existsSync(join(root, "agents", "deadagent1"))).toBe(false);
      expect(selectOutboxMessage(root, "to-dead")?.state).toBe("undeliverable");
    } finally { while (servers.length) await servers.pop()!.close(); closeAllStores(); if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old; removeTempDir(root); }
  });
});

describe("worktree ownership reads the composed environment", () => {
  test("a live agent's worktree is protected and a dead one's is not", async () => {
    const root = tempOrchDir("orch-clean-worktree-owner-");
    try {
      const live = [join(root, "wt-live")].map((worktreePath) => resolve(worktreePath));
      expect(liveWorktreeOwner(join(root, "wt-live"), live)).toBe(true);
      expect(liveWorktreeOwner(join(root, "wt-dead"), live)).toBe(false);
      expect(liveWorktreeOwner(join(root, "wt-nobody"), live)).toBe(false);
    } finally {
      while (servers.length) await servers.pop()!.close();
      removeTempDir(root);
    }
  });
});

describe("orch clean is destructive maintenance", () => {
  test("a spawned agent is refused the sweep, and the dirs it does not own survive", async () => {
    const root = tempOrchDir("orch-clean-slave-");
    const oldDir: OrchDir | undefined = process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR);
    const oldKey = process.env[LAUNCH_ENV];
    const oldExit = process.exit.bind(process);
    const oldMarker = process.env[HARNESS_SESSION_ENV.pi.marker];
    const oldSessionId = process.env[HARNESS_SESSION_ENV.pi.sessionId];
    const agentId = "agent00001";
    const sessionId = "clean-session";
    process.env.ORCH_DIR = root;
    process.env[LAUNCH_ENV] = agentId;
    process.env[HARNESS_SESSION_ENV.pi.marker] = "1";
    process.env[HARNESS_SESSION_ENV.pi.sessionId] = sessionId;
    const restoreHarnessSession = isolateHarnessSession("pi");
    process.exit = (code?: number): never => { throw new Error(`exit ${code ?? 0}`); };
    try {
      seedAgent(agentId, { adapter: "pi" }, root);
      expect(claimAgent(root, agentId, sessionId, 1)).toEqual({ kind: "stamped" });
      seedStatus(root, "deadagent1", {});
      ensurePresenceAgentDir("deadagent1", root);
      // A refusal is a thrown value carrying its reason, not a process exit and
      // not a stderr side effect (src/refusal.ts): the CLI boundary renders it.
      // Asserting the reason on the thrown value is stronger than either.
      const refusal = await cmdClean(testServices({ orchDir: root, settings: null }), []).then(() => null, (error: unknown) => error);
      expect(refusal).toBeInstanceOf(CommandRefusal);
      expect(String(refusal)).toMatch(/operator-only/i);
      expect(existsSync(join(root, "agents", "deadagent1"))).toBe(true);
    } finally {
      restoreHarnessSession();
      process.exit = oldExit;
      if (oldDir === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = oldDir;
      if (oldKey === undefined) delete process.env[LAUNCH_ENV]; else process.env[LAUNCH_ENV] = oldKey;
      if (oldMarker === undefined) delete process.env[HARNESS_SESSION_ENV.pi.marker]; else process.env[HARNESS_SESSION_ENV.pi.marker] = oldMarker;
      if (oldSessionId === undefined) delete process.env[HARNESS_SESSION_ENV.pi.sessionId]; else process.env[HARNESS_SESSION_ENV.pi.sessionId] = oldSessionId;
      while (servers.length) await servers.pop()!.close();
      removeTempDir(root);
    }
  });
});
