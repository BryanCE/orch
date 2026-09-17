import type { OrchDir } from "../src/types/core.ts";
import { orchDirAt } from "../src/services.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { join } from "node:path";
import { cmdNotify } from "../src/commands/events.ts";
import { cmdLogs, parseLogOptions } from "../src/commands/logs.ts";
import { createLogger, isLogRecord } from "../src/log.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { testServices } from "./helpers/services.ts";

const dirs: OrchDir[] = [];
const oldDir: OrchDir | undefined = process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR);

afterEach(() => {
  while (dirs.length) removeTempDir(dirs.pop()!);
  if (oldDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = oldDir;
});

function captureStdout(run: () => void): string {
  const oldStdout = process.stdout.write.bind(process.stdout);
  let stdout = "";
  process.stdout.write = (chunk: string | Uint8Array) => { stdout += chunk.toString(); return true; };
  try {
    run();
  } finally {
    process.stdout.write = oldStdout;
  }
  return stdout;
}

/** Seed both sinks through the real logger, so a change to the record shape
 *  breaks the reader test instead of leaving it agreeing with a stale fixture. */
function seedLogs(directory: OrchDir): void {
  const daemon = createLogger({ file: join(directory, "orch.log"), level: "trace", now: () => 1_700_000_000_000 , proc: "cli"});
  daemon.forCorrelation("dispatch-7").forAgent("agentaaa01").info("dispatch.accepted", { target: "agentaaa01" });
  const later = createLogger({ file: join(directory, "orch.log"), level: "trace", now: () => 1_700_000_005_000 , proc: "cli"});
  later.forCorrelation("dispatch-7").forAgent("agentaaa01").error("dispatch.failed", { error: "no channel accepted the write" });
  later.forCorrelation("dispatch-9").forAgent("agentbbb02").info("dispatch.accepted", { target: "agentbbb02" });
  const cli = createLogger({ file: join(directory, "orch.log"), level: "trace", now: () => 1_700_000_002_000 , proc: "cli"});
  cli.forCorrelation("dispatch-7").forAgent("agentaaa01").info("dispatch.cli-accepted", { target: "agentaaa01" });
}

function fixture(): OrchDir {
  const directory = tempOrchDir("orch-command-logs-");
  dirs.push(directory);
  process.env.ORCH_DIR = directory;
  writeSettingsFixture(directory, { notify: [] });
  return directory;
}

describe("orch logs", () => {
  test("--dispatch selects one dispatch across both sinks, oldest first", () => {
    const directory = fixture();
    seedLogs(directory);
    const lines = captureStdout(() => { cmdLogs(testServices({ orchDir: directory, settings: { notify: [] } }), ["--dispatch", "dispatch-7"]); }).trim().split("\n");
    expect(lines.map((line) => line.split(" ")[2])).toEqual([
      "dispatch.accepted",
      "dispatch.cli-accepted",
      "dispatch.failed",
    ]);
    expect(lines.every((line) => line.includes("dispatch-7"))).toBe(true);
    expect(lines.every((line) => line.includes("agent=agentaaa01"))).toBe(true);
  });

  test("--agent selects one agent's records", () => {
    const directory = fixture();
    seedLogs(directory);
    const lines = captureStdout(() => { cmdLogs(testServices({ orchDir: directory, settings: { notify: [] } }), ["--agent", "agentbbb02"]); }).trim().split("\n");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("dispatch-9");
  });

  test("--level selects one severity", () => {
    const directory = fixture();
    seedLogs(directory);
    const lines = captureStdout(() => { cmdLogs(testServices({ orchDir: directory, settings: { notify: [] } }), ["--level", "error"]); }).trim().split("\n");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("dispatch.failed");
    expect(lines[0]).toContain("no channel accepted the write");
  });

  test("--since drops everything older than the instant given", () => {
    const directory = fixture();
    seedLogs(directory);
    const lines = captureStdout(() => { cmdLogs(testServices({ orchDir: directory, settings: { notify: [] } }), ["--since", "1700000002000"]); }).trim().split("\n");
    expect(lines.map((line) => line.split(" ")[2])).toEqual([
      "dispatch.cli-accepted",
      "dispatch.failed",
      "dispatch.accepted",
    ]);
  });

  test("--since 0 keeps every record instead of being read as a missing value", () => {
    expect(parseLogOptions(["--since", "0"]).since).toBe(0);
    const directory = fixture();
    seedLogs(directory);
    const lines = captureStdout(() => { cmdLogs(testServices({ orchDir: directory, settings: { notify: [] } }), ["--since", "0"]); }).trim().split("\n");
    expect(lines).toHaveLength(4);
  });

  test("renders a readable line: instant, level, event, correlation, agent, fields", () => {
    const directory = fixture();
    seedLogs(directory);
    const lines = captureStdout(() => { cmdLogs(testServices({ orchDir: directory, settings: { notify: [] } }), ["--dispatch", "dispatch-9"]); }).trim().split("\n");
    expect(lines[0]).toBe(
      `${new Date(1_700_000_005_000).toISOString()} info dispatch.accepted [dispatch-9] [agent=agentbbb02] {"target":"agentbbb02"}`,
    );
  });

  test("--json emits the records themselves", () => {
    const directory = fixture();
    seedLogs(directory);
    const lines = captureStdout(() => { cmdLogs(testServices({ orchDir: directory, settings: { notify: [] } }), ["--dispatch", "dispatch-9", "--json"]); }).trim().split("\n");
    const parsed: unknown = JSON.parse(lines[0]!);
    expect(isLogRecord(parsed)).toBe(true);
    expect(parsed).toEqual({
      proc: "cli",
      pid: process.pid,
      at: 1_700_000_005_000,
      level: "info",
      event: "dispatch.accepted",
      correlationId: "dispatch-9",
      agentId: "agentbbb02",
      fields: { target: "agentbbb02" },
    });
  });
});

describe("command logging", () => {
  test("notify test records the diagnosis and keeps user output on stdout", async () => {
    const directory = tempOrchDir("orch-command-logging-");
    dirs.push(directory);
    process.env.ORCH_DIR = directory;
    writeSettingsFixture(directory, { notify: [] });
    const oldStdout = process.stdout.write.bind(process.stdout);
    const oldStderr = process.stderr.write.bind(process.stderr);
    let stdout = "";
    let stderr = "";
    process.stdout.write = (chunk: string | Uint8Array) => { stdout += chunk.toString(); return true; };
    process.stderr.write = (chunk: string | Uint8Array) => { stderr += chunk.toString(); return true; };
    const oldExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      await cmdNotify(testServices({ orchDir: directory, settings: { notify: [] } }), ["test"]);
    } finally {
      process.stdout.write = oldStdout;
      process.stderr.write = oldStderr;
      process.exitCode = oldExitCode ?? 0;
    }
    expect(stdout).toContain("notify test: no sinks configured");
    expect(stderr).toBe("");
    const file = join(directory, "orch.log");
    expect(existsSync(file)).toBe(true);
    const parsed: unknown[] = [];
    for (const line of readFileSync(file, "utf8").trim().split("\n")) {
      const value: unknown = JSON.parse(line);
      parsed.push(value);
    }
    const records = parsed.filter(isLogRecord);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ level: "error", event: "notify.test.no-sinks", fields: { sinkCount: 0 } });
  });
});
