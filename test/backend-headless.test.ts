import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { AgentAdapter } from "../src/adapters/adapter.ts";
import { codexAdapter } from "../src/adapters/codex.ts";
import { seedStatus } from "./helpers/presence.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { insertSpawnedRecord, selectSpawnedRecords } from "../src/store/spawned-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const originalOrchDir = process.env.ORCH_DIR;
const testOrchDir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-backend-headless-"));

const { HeadlessBackend } = await import("../src/backends/headless/index.ts");
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
      `fs.writeFileSync(${JSON.stringify(statusFile)}, JSON.stringify({ schema: ${PRESENCE_SCHEMA}, pid: process.pid, state: \"working\", key: process.env.ORCH_AGENT_KEY }));`,
      "setTimeout(() => {}, 5000);",
    ].join(" ");
    return [process.execPath, "-e", script];
  },
};

const codexLogAdapter = {
  id: "codex",
  headlessCmd(_prompt: string, opts: { key?: string; orchDir?: string }): string[] {
    const statusDir = path.join(opts.orchDir!, "agents", opts.key!);
    const script = [
      "const fs = require(\"node:fs\");",
      `fs.mkdirSync(${JSON.stringify(statusDir)}, { recursive: true });`,
      `fs.writeFileSync(${JSON.stringify(path.join(statusDir, "status.json"))}, JSON.stringify({ schema: ${PRESENCE_SCHEMA}, pid: process.pid, sessionPath: process.env.ORCH_AGENT_LOG }));`,
      "console.log(JSON.stringify({ item: { type: 'agent_message', text: 'headless tail' } }));",
      "console.log(JSON.stringify({ type: 'agent-turn-complete' }));",
    ].join(" ");
    return [process.execPath, "-e", script];
  },
};

// Generous deadline: these tests launch real detached OS processes, and child
// startup can take seconds on a loaded machine — a short deadline makes the
// suite flaky under parallel load without catching anything real.
async function waitFor(check: () => boolean): Promise<void> {
  const deadline = Date.now() + 15000;
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
  removeTempDir(testOrchDir);
  restoreOrchDir();
});

describe("HeadlessBackend", () => {
  test("workspaceNames is empty — headless has no name concept", () => {
    expect(backend.workspaceNames()).toEqual(new Map());
  });

  test("refuses to spawn with no prompt — a headless agent runs its prompt and exits", () => {
    for (const prompt of [undefined, "", "   "]) {
      expect(() => backend.spawn(fakeAdapter as unknown as AgentAdapter, { key: "fake-promptless", prompt }))
        .toThrow(/no prompt/);
    }
    expect(backend.list().some((entry) => entry.key === "fake-promptless")).toBe(false);
  });

  test("spawns a detached process and records its handle", async () => {
    expect(backend.caps).toEqual({ panes: false, focusable: false, canSendKeys: false, canPruneLogs: true });
    const handle = backend.spawn(fakeAdapter as unknown as AgentAdapter, { key: "fake-1", prompt: "sleep" });
    handles.push(handle);

    await waitFor(() => fs.existsSync(path.join(testOrchDir, "agents", "fake-1", "status.json")));
    const record = selectSpawnedRecords(testOrchDir).find((entry) => entry.pane === "fake-1");
    expect(record?.backend).toBe("headless");
    expect(JSON.parse(record?.handle ?? "null")).toEqual({ pid: handle.pid, key: "fake-1" });
    expect(record?.cwd).toBeUndefined();
    expect(fs.existsSync(path.join(testOrchDir, "logs"))).toBe(true);
    expect(fs.existsSync(path.join(testOrchDir, "logs", "fake-1.log"))).toBe(true);
    expect(backend.list()).toContainEqual({ pid: handle.pid, key: "fake-1", alive: true });
    expect((JSON.parse(fs.readFileSync(path.join(testOrchDir, "agents", "fake-1", "status.json"), "utf8")) as { key: string }).key).toBe("fake-1");
  }, 30000);

  test("completes a headless dispatch round-trip and leaves a readable result", async () => {
    const adapter = {
      ...fakeAdapter,
      headlessCmd: (_prompt: string, opts: { key?: string; orchDir?: string }) => {
        const dir = path.join(opts.orchDir!, "agents", opts.key!);
        return [process.execPath, "-e", [
          "const fs=require('node:fs');",
          `fs.mkdirSync(${JSON.stringify(dir)}, {recursive:true});`,
          `const status=${JSON.stringify(path.join(dir, "status.json"))}; const result=${JSON.stringify(path.join(dir, "result.json"))};`,
          "fs.writeFileSync(status, JSON.stringify({pid:process.pid,state:'working'}));",
          "setTimeout(()=>{fs.writeFileSync(result, JSON.stringify({text:'headless result'})); fs.writeFileSync(status, JSON.stringify({pid:process.pid,state:'done'}));}, 30);",
        ].join(" ")];
      },
    };
    const handle = backend.spawn(adapter as unknown as AgentAdapter, { key: "round-trip", prompt: "dispatch" });
    handles.push(handle);
    const dir = path.join(testOrchDir, "agents", "round-trip");
    await waitFor(() => fs.existsSync(path.join(dir, "status.json")));
    await waitFor(() => (JSON.parse(fs.readFileSync(path.join(dir, "status.json"), "utf8")) as { state: string }).state === "done");
    expect(JSON.parse(fs.readFileSync(path.join(dir, "result.json"), "utf8"))).toEqual({ text: "headless result" });
  }, 30000);

  test("records and mirrors the headless log for Codex session-tail parsing", async () => {
    const handle = backend.spawn(codexLogAdapter as unknown as AgentAdapter, { key: "codex-tail", prompt: "tail" });
    handles.push(handle);
    const statusPath = path.join(testOrchDir, "agents", "codex-tail", "status.json");
    await waitFor(() => fs.existsSync(statusPath));
    const status = JSON.parse(fs.readFileSync(statusPath, "utf8")) as { sessionPath: string };
    expect(status.sessionPath).toMatch(/logs[\\/]/);
    expect(fs.existsSync(status.sessionPath)).toBe(true);
    await waitFor(() => fs.existsSync(status.sessionPath) && fs.readFileSync(status.sessionPath, "utf8").includes("headless tail"));
    expect(codexAdapter.readSessionView({ sessionPath: status.sessionPath })).toEqual({ state: "idle", lastText: "headless tail" });
    expect(codexAdapter.readSessionView({})).toBeUndefined();
  }, 30000);

  test("closes only when registry and presence pid/key both match", async () => {
    const handle = backend.spawn(fakeAdapter as unknown as AgentAdapter, { key: "fake-2", prompt: "sleep" });
    handles.push(handle);
    await waitFor(() => fs.existsSync(path.join(testOrchDir, "agents", "fake-2", "status.json")));

    expect(backend.close({ pid: handle.pid, key: "wrong-key" })).toBe(false);
    expect(backend.close({ pid: process.pid, key: "fake-2" })).toBe(false);
    expect(backend.list()).toContainEqual({ pid: handle.pid, key: "fake-2", alive: true });

    expect(backend.close(handle)).toBe(true);
    await waitFor(() => !backend.list().some((entry) => entry.pid === handle.pid && entry.alive));
  }, 30000);

  test("signals a matching recorded handle through the injected killer", () => {
    const calls: { pid: number; signal: string }[] = [];
    const hermetic = new HeadlessBackend({
      pidAlive: () => true,
      killer: (pid, signal) => calls.push({ pid, signal }),
    });
    const handle = { pid: 41001, key: "hermetic-match" };
    fs.mkdirSync(path.join(testOrchDir, "agents", handle.key), { recursive: true });
    seedStatus(testOrchDir, handle.key, { pid: handle.pid });
    insertSpawnedRecord(testOrchDir, { pane: handle.key, backend: "headless", handle: JSON.stringify(handle), adapter: "codex" });

    expect(hermetic.close(handle)).toBe(true);
    expect(calls).toEqual([{ pid: handle.pid, signal: "SIGTERM" }]);
  });

  test("refuses when presence pid is missing or key does not match the recorded handle", () => {
    const calls: number[] = [];
    const hermetic = new HeadlessBackend({ pidAlive: () => true, killer: (pid) => calls.push(pid) });
    const recorded = { pid: 41002, key: "hermetic-recorded" };
    insertSpawnedRecord(testOrchDir, { pane: recorded.key, backend: "headless", handle: JSON.stringify(recorded), adapter: "codex" });

    fs.mkdirSync(path.join(testOrchDir, "agents", recorded.key), { recursive: true });
    expect(hermetic.close(recorded)).toBe(false);
    seedStatus(testOrchDir, recorded.key, { pid: recorded.pid });
    expect(hermetic.close({ pid: recorded.pid, key: "hermetic-wrong" })).toBe(false);
    expect(calls).toEqual([]);
  });

  test("never signals an unrecorded pid", () => {
    const calls: number[] = [];
    const hermetic = new HeadlessBackend({ pidAlive: () => true, killer: (pid) => calls.push(pid) });
    const handle = { pid: 41003, key: "hermetic-unrecorded" };
    fs.mkdirSync(path.join(testOrchDir, "agents", handle.key), { recursive: true });
    seedStatus(testOrchDir, handle.key, { pid: handle.pid });

    expect(hermetic.close(handle)).toBe(false);
    expect(calls).toEqual([]);
  });
});
