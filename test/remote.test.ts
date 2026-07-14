import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseTarget, formatTarget } from "../src/entities.ts";
import { runRemote, type RemoteResult } from "../src/remote.ts";

const directories: string[] = [];
function fixture(): { bin: string; record: string } {
  const directory = mkdtempSync(join(tmpdir(), "orch-remote-"));
  directories.push(directory);
  const record = join(directory, "ssh-args.log");
  const script = join(directory, "ssh-fake.js");
  writeFileSync(script, `const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(record)}, args.join(" ") + "\\n");
switch (args[2]) {
  case "slow.example": setTimeout(() => {}, 2000); break;
  case "dead.example": process.stderr.write("connection refused\\n"); process.exit(255);
  case "bryan@gpu1":
    if (args[4] === "questions") process.stdout.write("not json\\n");
    else process.stdout.write(JSON.stringify({ host: "gpu1", ok: true }) + "\\n");
    break;
  default: process.stdout.write(JSON.stringify({ host: "gpu1", ok: true }) + "\\n");
}`);
  if (process.platform === "win32") {
    const bin = join(directory, "ssh-fake.cmd");
    writeFileSync(bin, `@echo off\r\n"${process.execPath}" "${script}" %*\r\n`);
    return { bin, record };
  }
  const bin = join(directory, "ssh-fake");
  writeFileSync(bin, `#!/usr/bin/env bun\n${fsRead(script)}\n`);
  chmodSync(bin, 0o755);
  return { bin, record };
}

function fsRead(file: string): string {
  return readFileSync(file, "utf8");
}

function recorded(record: string): string {
  expect(existsSync(record)).toBe(true);
  const lines = readFileSync(record, "utf8").trim().split("\n");
  expect(lines.length).toBeGreaterThan(0);
  return lines[lines.length - 1];
}

function failure(result: RemoteResult) {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("expected remote failure");
  return result.failure;
}

afterEach(() => {
  while (directories.length) rmSync(directories.pop()!, { recursive: true, force: true });
});

describe("remote SSH executor", () => {
  test("runs BatchMode SSH and parses JSON", () => {
    const { bin, record } = fixture();
    const result = runRemote("gpu1", { dest: "bryan@gpu1" }, ["status"], { timeoutMs: 3000, sshBin: bin });
    expect(result).toEqual({ ok: true, value: { host: "gpu1", ok: true } });
    expect(recorded(record)).toBe("-o BatchMode=yes bryan@gpu1 orch status --json");
  });

  test("returns a typed timeout failure", () => {
    const { bin, record } = fixture();
    const result = runRemote("slow", { dest: "slow.example", timeout_ms: 500 }, ["status"], { sshBin: bin });
    expect(failure(result)).toMatchObject({ kind: "timeout", host: "slow" });
    expect(recorded(record)).toContain("slow.example orch status --json");
  });

  test("returns a dead-host failure", () => {
    const { bin, record } = fixture();
    const result = runRemote("dead", { dest: "dead.example" }, ["status"], { sshBin: bin });
    expect(failure(result)).toMatchObject({ kind: "dead-host", host: "dead" });
    expect(recorded(record)).toContain("dead.example orch status --json");
  });

  test("returns a non-JSON failure", () => {
    const { bin, record } = fixture();
    const result = runRemote("gpu1", { dest: "bryan@gpu1" }, ["questions"], { sshBin: bin });
    expect(failure(result)).toMatchObject({ kind: "non-json", host: "gpu1" });
    expect(recorded(record)).toContain("bryan@gpu1 orch questions --json");
  });
});

describe("host-prefixed targets", () => {
  const hosts = { gpu1: { dest: "bryan@gpu1" }, lab: { dest: "lab.example" } };

  test("round-trips local and host-prefixed grammar", () => {
    for (const target of ["w6:p3", "pi-2", "gpu1/w6:p3", "lab/pi-2"]) {
      const parsed = parseTarget(target, hosts);
      expect(formatTarget(parsed)).toBe(target);
    }
  });

  test("reports unknown host and configured names", () => {
    expect(() => parseTarget("missing/pi-2", hosts)).toThrow("Unknown host \"missing\". Configured hosts: gpu1, lab");
  });
});
