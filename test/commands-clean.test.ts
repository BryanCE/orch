import { describe, expect, test } from "bun:test";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmdClean, removeDeadAgentDirs } from "../src/commands/clean.ts";
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

describe("orch clean is destructive maintenance", () => {
  test("a spawned agent is refused the sweep, and the dirs it does not own survive", () => {
    const root = mkdtempSync(join(tmpdir(), "orch-clean-slave-"));
    const oldDir = process.env.ORCH_DIR;
    const oldKey = process.env.ORCH_AGENT_KEY;
    const oldExit = process.exit.bind(process);
    process.env.ORCH_DIR = root;
    process.env.ORCH_AGENT_KEY = "herdr~w1~agent-1";
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
