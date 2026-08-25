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
  // Dispatch resolves the adapter before probing the daemon; without an
  // enabled default it dies on "no harness selected" instead of the
  // daemon-absent failure these tests assert.
  writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: [] }, defaults: { adapter: "pi" } });
  return directory;
}

/** Above every real pid on Linux and macOS, so the seeded bridge reads as gone. */
const DEAD_PID = 0x7fffffff;

/** A presence record whose bridge is no longer running. The lock in these tests names a LIVE
 *  pid on purpose; the agent must not, or pi's inbox delivery succeeds and there is no
 *  delivery verdict left to assert. */
function seedAgent(orchDir: string, pid = DEAD_PID): void {
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
  // The lock names THIS process: a live pid orch never started, in a record orch
  // never wrote. Reaching the assertions at all is the regression guard — orch
  // used to SIGTERM this pid as a "wedged daemon", killing the test runner.
  test("an unprovable foreign lock is never signalled; dispatch starts a fresh daemon and fails on delivery", () => {
    const orchDir = makeOrchDir();
    seedAgent(orchDir);
    writeFileSync(join(orchDir, "orchd.lock"), JSON.stringify({ pid: process.pid }));

    const result = runCli(orchDir, ["dispatch", "agent-alpha", "hello"]);

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain("was not applied or acknowledged");
  }, 15_000);

  test("status --offline reads seeded presence files without a daemon", () => {
    const orchDir = makeOrchDir();
    // A live pid here: a dead one renders as "exited", which is a different assertion.
    seedAgent(orchDir, process.pid);

    const result = runCli(orchDir, ["status", "--offline", "--json", "--all", "--all-panes"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("agent-alpha");
    expect(result.stdout).toContain("working");
  }, 15_000);

  test("dispatch failure is a delivery verdict, never herdr-not-found", () => {
    const orchDir = makeOrchDir();
    seedAgent(orchDir);
    writeFileSync(join(orchDir, "orchd.lock"), JSON.stringify({ pid: process.pid }));

    const result = runCli(orchDir, ["dispatch", "agent-alpha", "hello"]);
    const output = `${result.stdout}\n${result.stderr}`;

    expect(result.status).not.toBe(0);
    expect(output).toContain("was not applied or acknowledged");
    expect(output.toLowerCase()).not.toContain("herdr");
  }, 15_000);
});
