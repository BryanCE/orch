import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { removeDeadAgentDirs } from "../src/commands/clean.ts";
import { seedStatus } from "./helpers/presence.ts";

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
    } finally { if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old; rmSync(root, { recursive: true, force: true }); }
  });
});
