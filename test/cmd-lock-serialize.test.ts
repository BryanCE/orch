import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { acquireCommandLock, readCommandLock, releaseCommandLock } from "../src/control/cmd-lock.ts";
import { processInstanceMatches } from "../src/process-identity.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";

interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
}

const binPath = resolve(import.meta.dir, "../bin/orch.ts");
const roots: string[] = [];

function tempOrchDir(): string {
  const root = mkdtempSync(join(tmpdir(), "orch-cmd-lock-serialize-"));
  roots.push(root);
  writeSettingsFixture(root, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
  return root;
}

async function runCli(root: string, args: string[]): Promise<CliResult> {
  const child = Bun.spawn([process.execPath, binPath, ...args], {
    env: { ...process.env, ORCH_DIR: root },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [code, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  return { code, stdout, stderr };
}

async function waitForLock(root: string, timeoutMs = 2_000): Promise<NonNullable<ReturnType<typeof readCommandLock>>> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const lock = readCommandLock(root);
    if (lock) return lock;
    await new Promise<void>((resolvePromise) => setTimeout(resolvePromise, 10));
  }
  throw new Error("timed out waiting for command lock");
}

afterEach(() => {
  for (const root of roots.splice(0)) removeTempDir(root);
});

describe("command lock serialization", () => {
  test("serializes two real CLI acquirers without overlapping their commands", async () => {
    const root = tempOrchDir();
    const timestamps = join(root, "timestamps.jsonl");
    const script = [
      "const fs = require('node:fs');",
      `const file = ${JSON.stringify(timestamps)};`,
      "const label = process.argv[1];",
      "fs.appendFileSync(file, JSON.stringify({ label, phase: 'start', at: Date.now() }) + '\\n');",
      "setTimeout(() => fs.appendFileSync(file, JSON.stringify({ label, phase: 'end', at: Date.now() }) + '\\n'), 220);",
    ].join(" ");
    const args = ["lock", "run", "--timeout", "5000", "--", process.execPath, "-e", script];
    const [first, second] = await Promise.all([
      runCli(root, [...args, "first"]),
      runCli(root, [...args, "second"]),
    ]);
    expect(first.code).toBe(0);
    expect(second.code).toBe(0);

    const events = readFileSync(timestamps, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { label: string; phase: string; at: number });
    expect(events).toHaveLength(4);
    const starts = events.filter((event) => event.phase === "start");
    const ends = events.filter((event) => event.phase === "end");
    expect(starts).toHaveLength(2);
    expect(ends).toHaveLength(2);
    for (const label of ["first", "second"]) {
      const start = starts.find((event) => event.label === label);
      const end = ends.find((event) => event.label === label);
      expect(start).toBeDefined();
      expect(end).toBeDefined();
      expect(end?.at).toBeGreaterThan(start?.at ?? 0);
    }
    const firstStart = starts.find((event) => event.label === "first");
    const firstEnd = ends.find((event) => event.label === "first");
    const secondStart = starts.find((event) => event.label === "second");
    const secondEnd = ends.find((event) => event.label === "second");
    if (!firstStart || !firstEnd || !secondStart || !secondEnd) throw new Error("missing timestamp event");
    const [earlierEnd, laterStart] = firstStart.at < secondStart.at
      ? [firstEnd.at, secondStart.at]
      : [secondEnd.at, firstStart.at];
    expect(earlierEnd).toBeLessThan(laterStart);
  }, 10_000);

  test("evicts a lock whose process instance token no longer matches", async () => {
    const root = tempOrchDir();
    writeFileSync(join(root, "cmd-lock.json"), JSON.stringify({
      pid: process.pid,
      start_token: "not-the-current-instance",
      holder: "stale-holder",
      acquired_at: Date.now(),
    }));
    const started = Date.now();
    const lock = await acquireCommandLock(root, { holder: "new-holder", timeoutMs: 1_000, pollMs: 500 });
    expect(Date.now() - started).toBeLessThan(500);
    expect(lock.holder).toBe("new-holder");
    expect(readCommandLock(root)?.start_token).toBe(lock.start_token);
    expect(releaseCommandLock(root, lock.pid, lock.start_token)).toBe(true);
  });

  test("does not evict a lock held by a live foreign process", async () => {
    const root = tempOrchDir();
    const holder = Bun.spawn([
      process.execPath,
      binPath,
      "lock",
      "run",
      "--timeout",
      "5000",
      "--",
      process.execPath,
      "-e",
      "setTimeout(() => {}, 1200)",
    ], { env: { ...process.env, ORCH_DIR: root }, stdout: "pipe", stderr: "pipe" });
    try {
      const held = await waitForLock(root);
      expect(held.pid).not.toBe(process.pid);
      expect(processInstanceMatches(held.pid, held.start_token)).toBe(true);
      const started = Date.now();
      let failure: unknown;
      try {
        await acquireCommandLock(root, { holder: "waiter", timeoutMs: 150, pollMs: 100 });
      } catch (error: unknown) {
        failure = error;
      }
      if (!(failure instanceof Error)) throw new Error("expected lock acquisition to time out");
      expect(failure.message).toMatch(/timed out/);
      expect(Date.now() - started).toBeGreaterThanOrEqual(100);
      const stillHeld = readCommandLock(root);
      expect(stillHeld?.pid).toBe(held.pid);
      expect(stillHeld?.start_token).toBe(held.start_token);
      expect(processInstanceMatches(held.pid, held.start_token)).toBe(true);
    } finally {
      await holder.exited;
    }
    expect(readCommandLock(root)).toBeNull();
  }, 10_000);

  test("release refuses a different process instance token", async () => {
    const root = tempOrchDir();
    const lock = await acquireCommandLock(root, { holder: "owner" });
    expect(releaseCommandLock(root, lock.pid, `${lock.start_token}-different`)).toBe(false);
    expect(readCommandLock(root)?.holder).toBe("owner");
    expect(releaseCommandLock(root, lock.pid, lock.start_token)).toBe(true);
    expect(readCommandLock(root)).toBeNull();
  });
});
