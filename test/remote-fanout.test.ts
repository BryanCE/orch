import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runRemoteAsync, type RemoteResult } from "../src/remote.ts";

const directories: string[] = [];

function fixture(): { bin: string; record: string } {
  const directory = mkdtempSync(join(tmpdir(), "orch-remote-fanout-"));
  directories.push(directory);
  const record = join(directory, "ssh-args.log");
  const script = join(directory, "ssh-fake.js");
  writeFileSync(script, `const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(record)}, args.join(" ") + "\\n");
switch (args[2]) {
  case "good.example": process.stdout.write(JSON.stringify({ host: "good", ok: true }) + "\\n"); break;
  case "dead.example": process.stderr.write("connection refused\\n"); process.exit(255);
  case "slow.example": setTimeout(() => {}, 2000); break;
  case "text.example": process.stdout.write("not json\\n"); break;
  default: process.stdout.write(JSON.stringify({ host: "unknown" }) + "\\n");
}`);
  if (process.platform === "win32") {
    const bin = join(directory, "ssh-fake.cmd");
    writeFileSync(bin, `@echo off\r\n"${process.execPath}" "${script}" %*\r\n`);
    return { bin, record };
  }
  const bin = join(directory, "ssh-fake");
  writeFileSync(bin, `#!/usr/bin/env bun\n${readFileSync(script, "utf8")}\n`);
  chmodSync(bin, 0o755);
  return { bin, record };
}

function recorded(record: string): string[] {
  expect(existsSync(record)).toBe(true);
  return readFileSync(record, "utf8").trim().split("\\n");
}

function failure(result: RemoteResult) {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("expected remote failure");
  return result.failure;
}

afterEach(() => {
  while (directories.length) rmSync(directories.pop()!, { recursive: true, force: true });
});

describe("async remote fan-out", () => {
  test("parses valid JSON from a host", async () => {
    const { bin: sshBin } = fixture();
    const result = await runRemoteAsync("good", { dest: "good.example" }, ["status"], { sshBin });
    expect(result).toEqual({ ok: true, value: { host: "good", ok: true } });
  });

  test("returns a typed dead-host failure", async () => {
    const { bin: sshBin } = fixture();
    const result = await runRemoteAsync("dead", { dest: "dead.example" }, ["status"], { sshBin });
    expect(failure(result)).toMatchObject({ kind: "dead-host", host: "dead" });
  });

  test("returns a typed timeout failure", async () => {
    const { bin: sshBin } = fixture();
    const result = await runRemoteAsync("slow", { dest: "slow.example", timeout_ms: 500 }, ["status"], { sshBin });
    expect(failure(result)).toMatchObject({ kind: "timeout", host: "slow" });
  });

  test("returns a typed non-JSON failure", async () => {
    const { bin: sshBin } = fixture();
    const result = await runRemoteAsync("text", { dest: "text.example" }, ["status"], { sshBin });
    expect(failure(result)).toMatchObject({ kind: "non-json", host: "text" });
  });

  test("fans out and keeps per-host failures without throwing", async () => {
    const { bin: sshBin, record } = fixture();
    const hosts = {
      good: { dest: "good.example" },
      dead: { dest: "dead.example" },
      slow: { dest: "slow.example", timeout_ms: 500 },
      text: { dest: "text.example" },
    };
    const results = await Promise.all(
      Object.entries(hosts).map(async ([name, host]) => [name, await runRemoteAsync(name, host, ["status"], { sshBin })] as const),
    );
    const byHost = Object.fromEntries(results);

    expect(byHost.good).toEqual({ ok: true, value: { host: "good", ok: true } });
    expect(failure(byHost.dead!)).toMatchObject({ kind: "dead-host", host: "dead" });
    expect(failure(byHost.slow!)).toMatchObject({ kind: "timeout", host: "slow" });
    expect(failure(byHost.text!)).toMatchObject({ kind: "non-json", host: "text" });
    expect(recorded(record).length).toBeGreaterThan(0);
  });
});
