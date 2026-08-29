import { describe, expect, test } from "bun:test";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmdClean, liveWorktreeOwner, removeDeadAgentDirs } from "../src/commands/clean.ts";
import { ensureHarness, insertAgent, setWorktree } from "../src/store/agent-rows.ts";
import { agentViewIndex, presenceById } from "../src/commands/target.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { CommandRefusal } from "../src/refusal.ts";
import { seedStatus } from "./helpers/presence.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

/** Capture what a refusal wrote, and put the real stream back afterwards. */

describe("commands/clean", () => {
  test("reaps dead agent dirs but preserves live pids", () => {
    const root = mkdtempSync(join(tmpdir(), "orch-command-clean-"));
    const old = process.env.ORCH_DIR; process.env.ORCH_DIR = root;
    try {
      seedStatus(root, "dead", { pid: 999999 });
      seedStatus(root, "live", { pid: process.pid });
      expect(removeDeadAgentDirs(true)).toEqual(["dead (pid 999999)"]);
      expect(existsSync(join(root, "agents", "dead"))).toBe(false);
      expect(existsSync(join(root, "agents", "live"))).toBe(true);
    } finally { if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old; removeTempDir(root); }
  });
});

describe("worktree ownership reads the composed environment", () => {
  // TASKS/02-scope.md A1: the worktree is an ENVIRONMENT axis of an agent, and
  // liveness is presence keyed by the agent's minted id — not a column on a wide
  // row keyed by a pane.
  test("a live agent's worktree is protected and a dead one's is not", () => {
    const root = mkdtempSync(join(tmpdir(), "orch-clean-worktree-owner-"));
    const old = process.env.ORCH_DIR; process.env.ORCH_DIR = root;
    try {
      ensureHarness(root, "pi", "pi", 1);
      insertAgent(root, { id: "live000001", harnessId: "pi", cwd: "/repo", name: "keeper", createdAt: 1 });
      insertAgent(root, { id: "dead000001", harnessId: "pi", cwd: "/repo", name: "goner", createdAt: 2 });
      setWorktree(root, "live000001", join(root, "wt-live"), "orch/keeper");
      setWorktree(root, "dead000001", join(root, "wt-dead"), "orch/goner");
      seedStatus(root, "live000001", { key: "live000001", pid: process.pid });
      seedStatus(root, "dead000001", { key: "dead000001", pid: 999999 });

      const views = [...agentViewIndex(root).values()];
      const presence = presenceById();
      expect(liveWorktreeOwner(join(root, "wt-live"), views, presence)).toBe(true);
      expect(liveWorktreeOwner(join(root, "wt-dead"), views, presence)).toBe(false);
      expect(liveWorktreeOwner(join(root, "wt-nobody"), views, presence)).toBe(false);
    } finally {
      closeAllStores();
      if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old;
      removeTempDir(root);
    }
  });
});

describe("orch clean is destructive maintenance", () => {
  test("a spawned agent is refused the sweep, and the dirs it does not own survive", () => {
    const root = mkdtempSync(join(tmpdir(), "orch-clean-slave-"));
    const oldDir = process.env.ORCH_DIR;
    const oldKey = process.env.ORCH_AGENT_KEY;
    const oldExit = process.exit.bind(process);
    process.env.ORCH_DIR = root;
    process.env.ORCH_AGENT_KEY = "agent00001";
    process.exit = (code?: number): never => { throw new Error(`exit ${code ?? 0}`); };
    try {
      seedStatus(root, "dead", { pid: 999999 });
      // A refusal is a thrown value carrying its reason, not a process exit and
      // not a stderr side effect (src/refusal.ts): the CLI boundary renders it.
      // Asserting the reason on the thrown value is stronger than either.
      expect(() => cmdClean([])).toThrow(CommandRefusal);
      expect(() => cmdClean([])).toThrow(/operator-only/i);
      expect(existsSync(join(root, "agents", "dead"))).toBe(true);
    } finally {
      process.exit = oldExit;
      if (oldDir === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = oldDir;
      if (oldKey === undefined) delete process.env.ORCH_AGENT_KEY; else process.env.ORCH_AGENT_KEY = oldKey;
      removeTempDir(root);
    }
  });
});
