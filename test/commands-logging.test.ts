import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { cmdNotify } from "../src/commands/events.ts";
import { cmdLogs } from "../src/commands/logs.ts";
import { isLogRecord } from "../src/log.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";

const dirs: string[] = [];
const oldDir = process.env.ORCH_DIR;

afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
  if (oldDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = oldDir;
});

describe("command logging", () => {
  test("readable logs include both dispatch and agent correlation", () => {
    const directory = mkdtempSync(join(tmpdir(), "orch-command-logs-"));
    dirs.push(directory);
    process.env.ORCH_DIR = directory;
    writeSettingsFixture(directory, { notify: [] });
    const events = ["dispatch.accepted", "dispatch.queued", "dispatch.delivering", "dispatch.delivered"] as const;
    writeFileSync(join(directory, "orchd.log"), `${events.map((event, index) => JSON.stringify({
      at: 1_700_000_000_000 + index,
      level: "info",
      event,
      correlationId: "dispatch-7",
      agentId: "agent-1",
      fields: { target: "headless~local~agent-1" },
    })).join("\n")}\n`);
    const oldStdout = process.stdout.write.bind(process.stdout);
    let stdout = "";
    process.stdout.write = (chunk: string | Uint8Array) => { stdout += chunk.toString(); return true; };
    try {
      cmdLogs(["--dispatch", "dispatch-7"]);
    } finally {
      process.stdout.write = oldStdout;
    }
    const lines = stdout.trim().split("\n");
    expect(lines).toHaveLength(events.length);
    expect(lines.every((line) => line.includes("dispatch-7"))).toBe(true);
    expect(lines.every((line) => line.includes("agent=agent-1"))).toBe(true);
    for (const event of events) expect(stdout).toContain(event);
  });

  test("notify test records the diagnosis and keeps user output on stdout", async () => {
    const directory = mkdtempSync(join(tmpdir(), "orch-command-logging-"));
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
      await cmdNotify(["test"]);
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
