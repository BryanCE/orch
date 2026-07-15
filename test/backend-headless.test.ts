import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { AgentAdapter } from "../src/adapters/adapter.ts";

const originalOrchDir = process.env.ORCH_DIR;
const testOrchDir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-backend-headless-"));

const { HeadlessBackend } = await import("../src/backends/headless.ts");
const backend = new HeadlessBackend();
const handles: { pid: number; key: string }[] = [];

const fakeAdapter = {
  id: "fake",
  headlessCmd(_prompt: string, opts: { key?: string; orchDir?: string }): string[] {
    const key = opts.key!;
    const directory = opts.orchDir!;
    const statusDir = path.join(directory, "agents", key);
    const statusFile = path.join(statusDir, "status.json");
    const script = [
      "const fs = require(\"node:fs\");",
      `fs.mkdirSync(${JSON.stringify(statusDir)}, { recursive: true });`,
      `fs.writeFileSync(${JSON.stringify(statusFile)}, JSON.stringify({ pid: process.pid, state: \"working\" }));`,
      "setTimeout(() => {}, 5000);",
    ].join(" ");
    return [process.execPath, "-e", script];
  },
};

async function waitFor(check: () => boolean): Promise<void> {
  const deadline = Date.now() + 2000;
  while (!check() && Date.now() < deadline) await Bun.sleep(20);
  expect(check()).toBe(true);
}

function restoreOrchDir(): void {
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
}

beforeEach(() => {
  process.env.ORCH_DIR = testOrchDir;
});

afterEach(() => {
  for (const handle of handles.splice(0)) {
    try { process.kill(handle.pid, "SIGKILL"); } catch {}
  }
  restoreOrchDir();
});

afterAll(() => {
  fs.rmSync(testOrchDir, { recursive: true, force: true });
  restoreOrchDir();
});

describe("HeadlessBackend", () => {
  test("spawns a detached process and records its handle", async () => {
    expect(backend.caps).toEqual({ panes: false, focusable: false });
    const handle = backend.spawn(fakeAdapter as unknown as AgentAdapter, { key: "fake-1", prompt: "sleep" });
    handles.push(handle);

    await waitFor(() => fs.existsSync(path.join(testOrchDir, "agents", "fake-1", "status.json")));
    const record = JSON.parse(fs.readFileSync(path.join(testOrchDir, "spawned.jsonl"), "utf8").trim()) as {
      backend: string;
      handle: { pid: number; key: string };
      adapter: string;
    };
    expect(record).toEqual({ backend: "headless", handle: { pid: handle.pid, key: "fake-1" }, adapter: "fake" });
    expect(backend.list()).toContainEqual({ pid: handle.pid, key: "fake-1", alive: true });
  });

  test("closes only when registry and presence pid/key both match", async () => {
    const handle = backend.spawn(fakeAdapter as unknown as AgentAdapter, { key: "fake-2" });
    handles.push(handle);
    await waitFor(() => fs.existsSync(path.join(testOrchDir, "agents", "fake-2", "status.json")));

    expect(backend.close({ pid: handle.pid, key: "wrong-key" })).toBe(false);
    expect(backend.close({ pid: process.pid, key: "fake-2" })).toBe(false);
    expect(backend.list()).toContainEqual({ pid: handle.pid, key: "fake-2", alive: true });

    expect(backend.close(handle)).toBe(true);
    await waitFor(() => !backend.list().some((entry) => entry.pid === handle.pid && entry.alive));
  });

  test("signals a matching recorded handle through the injected killer", () => {
    const calls: { pid: number; signal: string }[] = [];
    const hermetic = new HeadlessBackend({
      pidAlive: () => true,
      killer: (pid, signal) => calls.push({ pid, signal }),
    });
    const handle = { pid: 41001, key: "hermetic-match" };
    fs.mkdirSync(path.join(testOrchDir, "agents", handle.key), { recursive: true });
    fs.writeFileSync(path.join(testOrchDir, "agents", handle.key, "status.json"), JSON.stringify({ pid: handle.pid }));
    fs.writeFileSync(path.join(testOrchDir, "spawned.jsonl"), JSON.stringify({ backend: "headless", handle, adapter: "fake" }) + "\n", { flag: "a" });

    expect(hermetic.close(handle)).toBe(true);
    expect(calls).toEqual([{ pid: handle.pid, signal: "SIGTERM" }]);
  });

  test("refuses when presence pid is missing or key does not match the recorded handle", () => {
    const calls: number[] = [];
    const hermetic = new HeadlessBackend({ pidAlive: () => true, killer: (pid) => calls.push(pid) });
    const recorded = { pid: 41002, key: "hermetic-recorded" };
    fs.writeFileSync(path.join(testOrchDir, "spawned.jsonl"), JSON.stringify({ backend: "headless", handle: recorded, adapter: "fake" }) + "\n", { flag: "a" });

    fs.mkdirSync(path.join(testOrchDir, "agents", recorded.key), { recursive: true });
    expect(hermetic.close(recorded)).toBe(false);
    fs.writeFileSync(path.join(testOrchDir, "agents", recorded.key, "status.json"), JSON.stringify({ pid: recorded.pid }));
    expect(hermetic.close({ pid: recorded.pid, key: "hermetic-wrong" })).toBe(false);
    expect(calls).toEqual([]);
  });

  test("never signals an unrecorded pid", () => {
    const calls: number[] = [];
    const hermetic = new HeadlessBackend({ pidAlive: () => true, killer: (pid) => calls.push(pid) });
    const handle = { pid: 41003, key: "hermetic-unrecorded" };
    fs.mkdirSync(path.join(testOrchDir, "agents", handle.key), { recursive: true });
    fs.writeFileSync(path.join(testOrchDir, "agents", handle.key, "status.json"), JSON.stringify({ pid: handle.pid }));

    expect(hermetic.close(handle)).toBe(false);
    expect(calls).toEqual([]);
  });
});
