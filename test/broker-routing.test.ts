import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";

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
  return directory;
}

function seedAgent(orchDir: string): void {
  const agentDir = join(orchDir, "agents", "agent-alpha");
  mkdirSync(agentDir, { recursive: true });
  writeFileSync(
    join(agentDir, "status.json"),
    JSON.stringify({ schema: 2, agent: "pi", paneId: "agent-alpha", pid: process.pid, state: "working" }),
  );
}

function runCli(orchDir: string, args: string[]): CliResult {
  const result = spawnSync(process.execPath, [binPath, ...args], {
    env: { ...process.env, ORCH_DIR: orchDir, PATH: controlledPath },
    encoding: "utf8",
    timeout: 15_000,
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

afterEach(() => {
  while (tempDirs.length > 0) rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

describe("broker CLI routing", () => {
  test("write refuses when the daemon socket is unavailable", () => {
    const orchDir = makeOrchDir();
    seedAgent(orchDir);
    writeFileSync(join(orchDir, "orchd.lock"), JSON.stringify({ pid: process.pid }));

    const result = runCli(orchDir, ["dispatch", "agent-alpha", "hello"]);

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain("orch daemon start");
  }, 15_000);

  test("status --offline reads seeded presence files without a daemon", () => {
    const orchDir = makeOrchDir();
    seedAgent(orchDir);

    const result = runCli(orchDir, ["status", "--offline", "--json", "--all"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("agent-alpha");
    expect(result.stdout).toContain("working");
  }, 15_000);

  test("dispatch failure is daemon-absent, not herdr-not-found", () => {
    const orchDir = makeOrchDir();
    seedAgent(orchDir);
    writeFileSync(join(orchDir, "orchd.lock"), JSON.stringify({ pid: process.pid }));

    const result = runCli(orchDir, ["dispatch", "agent-alpha", "hello"]);
    const output = `${result.stdout}\n${result.stderr}`;

    expect(result.status).not.toBe(0);
    expect(output).toContain("orch daemon start");
    expect(output.toLowerCase()).not.toContain("herdr");
    expect(existsSync(join(orchDir, "orchd.sock"))).toBe(false);
  }, 15_000);
});

rmSync(controlledPath, { recursive: true, force: true });
