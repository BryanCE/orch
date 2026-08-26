import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { removeTempDir } from "./helpers/tempdir.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";

interface CliResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

const tempDirs: string[] = [];
const binPath = join(import.meta.dir, "..", "bin", "orch.ts");
const controlledPath = mkdtempSync(join(tmpdir(), "orch-routing-path-"));

function makeOrchDir(): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-broker-routing-"));
  tempDirs.push(directory);
  writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: [] }, defaults: { adapter: "pi" } });
  return directory;
}

function seedAgent(orchDir: string, pid: number): void {
  const agentDir = join(orchDir, "agents", "agent-alpha");
  mkdirSync(agentDir, { recursive: true });
  writeFileSync(
    join(agentDir, "status.json"),
    JSON.stringify({ schema: PRESENCE_SCHEMA, agent: "pi", paneId: "agent-alpha", pid, state: "working" }),
  );
}

function runCli(orchDir: string, args: string[]): CliResult {
  const result = Bun.spawnSync([process.execPath, binPath, ...args], {
    env: { ...process.env, ORCH_DIR: orchDir, PATH: controlledPath },
    stdout: "pipe",
    stderr: "pipe",
    timeout: 15_000,
  });
  return { status: result.exitCode, stdout: result.stdout.toString(), stderr: result.stderr.toString() };
}

afterEach(() => {
  while (tempDirs.length > 0) removeTempDir(tempDirs.pop()!);
});

afterAll(() => {
  rmSync(controlledPath, { recursive: true, force: true });
});

describe("broker CLI routing", () => {
  // Every test here runs the CLI with an empty PATH against a throwaway ORCH_DIR, so
  // nothing in this file may take a path that auto-starts a detached orchd: the daemon
  // outlives the temp dir it was pointed at and spins forever once that dir is deleted.
  test("status --offline reads seeded presence files without a daemon", () => {
    const orchDir = makeOrchDir();
    // A live pid here: a dead one renders as "exited", which is a different assertion.
    seedAgent(orchDir, process.pid);

    const result = runCli(orchDir, ["status", "--offline", "--json", "--all", "--all-panes"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("agent-alpha");
    expect(result.stdout).toContain("working");
  }, 15_000);
});
