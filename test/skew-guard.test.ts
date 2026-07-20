import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
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
const installedDaemonHash = computeCodeHash(path.join(import.meta.dir, "../dist/daemon/orchd.js"));

function makeOrchDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "orch-skew-guard-"));
  directories.push(directory);
  writeSettingsFixture(directory, {
    installed: { adapters: ["pi"], backends: [] },
    defaults: { adapter: "pi" },
  });
  return directory;
}

function seedAgent(orchDir: string): void {
  const agentDir = path.join(orchDir, "agents", "agent-alpha");
  fs.mkdirSync(agentDir, { recursive: true });
  fs.writeFileSync(path.join(agentDir, "status.json"), JSON.stringify({
    schema: 2,
    agent: "pi",
    paneId: "agent-alpha",
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
  const result = spawnSync(process.execPath, [binPath, ...args], {
    env: { ...process.env, ORCH_DIR: orchDir },
    encoding: "utf8",
    timeout: 15_000,
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
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

    const result = runCli(orchDir, ["dispatch", "agent-alpha", "hello"]);
    const text = output(result);

    expect(result.status).not.toBe(0);
    expect(text).toContain(staleHash);
    expect(text).toContain(installedDaemonHash);
    expect(text).toContain("orch daemon reload");
  }, 15_000);

  test("allows read-only commands while the daemon is skewed", () => {
    const orchDir = makeOrchDir();
    seedAgent(orchDir);
    seedDaemonLock(orchDir, "stale-daemon-hash");

    const result = runCli(orchDir, ["status", "--offline", "--json", "--all"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("agent-alpha");
    expect(output(result)).not.toContain("orch daemon reload");
  }, 15_000);

  test("--stale-ok overrides refusal for a mutating command", () => {
    const orchDir = makeOrchDir();
    seedAgent(orchDir);
    seedDaemonLock(orchDir, "stale-daemon-hash");

    const result = runCli(orchDir, ["dispatch", "agent-alpha", "hello", "--stale-ok"]);
    const text = output(result);

    expect(result.status).not.toBe(0);
    expect(text).not.toContain("orch daemon reload");
    expect(text).toContain("orch daemon unavailable");
  }, 15_000);

  test("doctor reports skew as a warning without making skew itself a failure", async () => {
    const orchDir = makeOrchDir();
    const staleHash = "stale-daemon-hash";
    seedDaemonLock(orchDir, staleHash);

    const results = await runDoctor(orchDir);
    const skew = results.find((result) => result.id === "orchd-staleness");

    expect(skew?.status).toBe("warn");
    expect(skew?.detail).toContain(staleHash);
    expect(skew?.detail).toContain(installedDaemonHash);
    expect(skew?.detail).toContain("orch daemon reload");
  });

  test("does not treat an absent daemon as skew and auto-starts a fresh daemon", () => {
    const orchDir = makeOrchDir();
    seedAgent(orchDir);

    const result = runCli(orchDir, ["dispatch", "agent-alpha", "hello"]);
    const text = output(result);
    runCli(orchDir, ["daemon", "stop"]);

    expect(text).not.toContain("orch daemon reload");
    expect(text).not.toContain("stale-daemon-hash");
  }, 15_000);
});
