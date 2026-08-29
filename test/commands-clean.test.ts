import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { removeDeadAgentDirs } from "../src/commands/clean.ts";
import { seedStatus } from "./helpers/presence.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const binPath = join(import.meta.dir, "../bin/orch.ts");

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
    try {
      writeSettingsFixture(root, { enabled: { adapters: ["pi"], backends: [] }, defaults: { adapter: "pi" } });
      seedStatus(root, "dead", { pid: 999999 });

      const result = spawnSync(process.execPath, [binPath, "clean"], {
        env: { ...process.env, ORCH_DIR: root, ORCH_AGENT_KEY: "herdr~w1~agent-1" },
        encoding: "utf8",
        timeout: 30_000,
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(/operator-only/i);
      expect(existsSync(join(root, "agents", "dead"))).toBe(true);
    } finally {
      removeTempDir(root);
    }
  });
});
