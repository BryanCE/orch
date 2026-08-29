import * as fs from "node:fs";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { computeCodeHash } from "../src/daemon/lifecycle.ts";
import { runDoctor } from "../src/doctor/runner.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

interface CliResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

const directories: string[] = [];
const binPath = path.join(import.meta.dir, "../bin/orch.ts");
const enabledDaemonHash = computeCodeHash(path.join(import.meta.dir, "../dist/daemon/orchd.js"));

function makeOrchDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "orch-skew-guard-"));
  directories.push(directory);
  writeSettingsFixture(directory, {
    enabled: { adapters: ["pi"], backends: [] },
    defaults: { adapter: "pi" },
  });
  return directory;
}

function seedAgent(orchDir: string): void {
  const agentDir = path.join(orchDir, "agents", "agentalpha");
  fs.mkdirSync(agentDir, { recursive: true });
  fs.writeFileSync(path.join(agentDir, "status.json"), JSON.stringify({
    schema: PRESENCE_SCHEMA,
    agent: "pi",
    paneId: "agentalpha",
    pid: process.pid,
    state: "working",
  }));
}

function seedDaemonLock(orchDir: string, codeHash: string): void {
  fs.writeFileSync(path.join(orchDir, "orchd.lock"), JSON.stringify({
    pid: process.pid,
    codeHash,
    startedAt: new Date().toISOString(),
  }));
}

function runCli(orchDir: string, args: string[]): CliResult {
  const result = Bun.spawnSync([process.execPath, binPath, ...args], {
    env: { ...process.env, ORCH_DIR: orchDir },
    stdout: "pipe",
    stderr: "pipe",
    timeout: 15_000,
  });
  return { status: result.exitCode, stdout: result.stdout.toString(), stderr: result.stderr.toString() };
}

function output(result: CliResult): string {
  return `${result.stdout}\n${result.stderr}`;
}

afterEach(() => {
  while (directories.length) removeTempDir(directories.pop()!);
});

describe("CLI daemon skew guard", () => {
  test("refuses mutating commands and names both hashes plus the reload remedy", () => {
    const orchDir = makeOrchDir();
    seedAgent(orchDir);
    const staleHash = "stale-daemon-hash";
    seedDaemonLock(orchDir, staleHash);

    const result = runCli(orchDir, ["dispatch", "agentalpha", "hello"]);
    const text = output(result);

    expect(result.status).not.toBe(0);
    expect(text).toContain(staleHash);
    expect(text).toContain(enabledDaemonHash);
    expect(text).toContain("orch daemon reload");
  }, 15_000);

  test("allows read-only commands while the daemon is skewed", () => {
    const orchDir = makeOrchDir();
    seedAgent(orchDir);
    seedDaemonLock(orchDir, "stale-daemon-hash");

    const result = runCli(orchDir, ["status", "--offline", "--json", "--all", "--all-panes"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("agentalpha");
    expect(output(result)).not.toContain("orch daemon reload");
  }, 15_000);

  test("--stale-ok overrides refusal for a mutating command", () => {
    const orchDir = makeOrchDir();
    seedAgent(orchDir);
    seedDaemonLock(orchDir, "stale-daemon-hash");

    const result = runCli(orchDir, ["dispatch", "agentalpha", "hello", "--stale-ok"]);
    const text = output(result);

    expect(result.status).not.toBe(0);
    expect(text).not.toContain("orch daemon reload");
    // Past the skew guard it reaches the lock, which names this live process —
    // unprovable as a daemon, so orch refuses to signal it instead of killing us.
    expect(text).toContain("cannot verify is its daemon");
  }, 15_000);

  test("doctor reports skew as a warning without making skew itself a failure", async () => {
    const orchDir = makeOrchDir();
    const staleHash = "stale-daemon-hash";
    seedDaemonLock(orchDir, staleHash);

    const results = await runDoctor(orchDir);
    const skew = results.find((result) => result.id === "orchd-staleness");

    expect(skew?.status).toBe("warn");
    expect(skew?.detail).toContain(staleHash);
    expect(skew?.detail).toContain(enabledDaemonHash);
    expect(skew?.detail).toContain("orch daemon reload");
    // runDoctor probes the daemon endpoints; on a loaded machine that dial
    // budget alone can pass bun's default 5s.
  }, 20_000);

  test("does not treat an absent daemon as skew and auto-starts a fresh daemon", () => {
    const orchDir = makeOrchDir();
    seedAgent(orchDir);

    const result = runCli(orchDir, ["dispatch", "agentalpha", "hello"]);
    const text = output(result);
    runCli(orchDir, ["daemon", "stop"]);

    expect(text).not.toContain("orch daemon reload");
    expect(text).not.toContain("stale-daemon-hash");
  }, 15_000);
});
