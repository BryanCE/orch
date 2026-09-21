import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mintAgentId } from "../src/backends/identity.ts";
import { createOrcaHud } from "../src/backends/orca/hud.ts";
import { registerSpawnedAgent } from "../src/store/spawn-registration.ts";
import { removeTempDir, tempOrchDir as makeTempOrchDir } from "./helpers/tempdir.ts";
import { isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";
import type { OrchDir } from "../src/types/core.ts";

interface WrittenFrame {
  readonly tty: string;
  readonly frame: string;
}

describe("the orca OSC pane HUD", () => {
  const directories: OrchDir[] = [];

  function tempOrchDir(): OrchDir {
    const directory = makeTempOrchDir("orch-orca-hud-");
    directories.push(directory);
    process.env.ORCH_DIR = directory;
    return directory;
  }

  function seedPaneAgent(root: OrchDir, plexer: string, handle: string): string {
    const key = mintAgentId();
    registerSpawnedAgent(root, {
      key,
      harnessId: "pi",
      backendId: plexer,
      placed: true,
      handle,
      cwd: root,
      name: "recon",
      model: "test",
      spawner: null,
      process: { pid: process.pid, startToken: "orca-hud-fixture" },
    });
    return key;
  }

  beforeEach(() => {
    isolateOrchEnv();
  });

  afterEach(() => {
    restoreOrchEnv();
    while (directories.length > 0) removeTempDir(directories.pop()!);
  });

  test("is inactive without an id or outside an orca pane", () => {
    const root = tempOrchDir();
    const key = seedPaneAgent(root, "tmux", "term-1");
    const hud = createOrcaHud({ shellPidOf: () => 42, ttyOf: () => "/dev/pts/7", writeTty: () => undefined });
    expect(hud.hudActive(null, root)).toBe(false);
    expect(hud.hudActive(key, root)).toBe(false);
  });

  test("writes working state and suppresses unchanged frames", () => {
    const root = tempOrchDir();
    const key = seedPaneAgent(root, "orca", "term-1");
    const writes: WrittenFrame[] = [];
    const hud = createOrcaHud({
      shellPidOf: () => 42,
      ttyOf: () => "/dev/pts/7",
      writeTty: (tty, frame) => writes.push({ tty, frame }),
    });
    const report = hud.createPaneStatusReporter(key, "term-1", root);
    const snapshot = { state: "working", task: "fix cli", cost: 0 };
    report(snapshot);
    report(snapshot);
    expect(writes).toEqual([{ tty: "/dev/pts/7", frame: "\x1b]9999;{\"state\":\"working\",\"prompt\":\"fix cli\"}\x07" }]);
  });

  test("maps asking to waiting and idle to done", () => {
    const root = tempOrchDir();
    const key = seedPaneAgent(root, "orca", "term-1");
    const writes: WrittenFrame[] = [];
    const hud = createOrcaHud({ shellPidOf: () => 42, ttyOf: () => "/dev/pts/7", writeTty: (tty, frame) => writes.push({ tty, frame }) });
    const report = hud.createPaneStatusReporter(key, "term-1", root);
    report({ state: "asking", cost: 0 });
    report({ state: "idle", cost: 0 });
    expect(writes.map(({ frame }) => frame)).toEqual([
      "\x1b]9999;{\"state\":\"waiting\",\"prompt\":\"\"}\x07",
      "\x1b]9999;{\"state\":\"done\",\"prompt\":\"\"}\x07",
    ]);
  });

  test("ignores unknown states", () => {
    const root = tempOrchDir();
    const key = seedPaneAgent(root, "orca", "term-1");
    const writes: WrittenFrame[] = [];
    const hud = createOrcaHud({ shellPidOf: () => 42, ttyOf: () => "/dev/pts/7", writeTty: (tty, frame) => writes.push({ tty, frame }) });
    hud.createPaneStatusReporter(key, "term-1", root)({ state: "unknown-state", cost: 0 });
    expect(writes).toHaveLength(0);
  });

  test("re-resolves the tty after a write failure", () => {
    const root = tempOrchDir();
    const key = seedPaneAgent(root, "orca", "term-1");
    let ttyReads = 0;
    let failOnce = true;
    const writes: WrittenFrame[] = [];
    const hud = createOrcaHud({
      shellPidOf: () => 42,
      ttyOf: () => {
        ttyReads += 1;
        return "/dev/pts/7";
      },
      writeTty: (tty, frame) => {
        if (failOnce) {
          failOnce = false;
          throw new Error("gone");
        }
        writes.push({ tty, frame });
      },
    });
    const report = hud.createPaneStatusReporter(key, "term-1", root);
    report({ state: "working", task: "fix cli", cost: 0 });
    report({ state: "working", task: "fix cli", cost: 0 });
    expect(ttyReads).toBe(2);
    expect(writes).toHaveLength(1);
  });

  test("retries a pane whose shell is not up yet", () => {
    const root = tempOrchDir();
    const key = seedPaneAgent(root, "orca", "term-1");
    let shellReads = 0;
    const writes: WrittenFrame[] = [];
    const hud = createOrcaHud({
      shellPidOf: () => {
        shellReads += 1;
        return shellReads === 1 ? null : 42;
      },
      ttyOf: () => "/dev/pts/7",
      writeTty: (tty, frame) => writes.push({ tty, frame }),
    });
    const report = hud.createPaneStatusReporter(key, "term-1", root);
    report({ state: "working", task: "first", cost: 0 });
    report({ state: "working", task: "second", cost: 0 });
    expect(shellReads).toBe(2);
    expect(writes).toEqual([{ tty: "/dev/pts/7", frame: "\x1b]9999;{\"state\":\"working\",\"prompt\":\"second\"}\x07" }]);
  });

  test("does not report to a different pane", () => {
    const root = tempOrchDir();
    const key = seedPaneAgent(root, "orca", "term-1");
    const writes: WrittenFrame[] = [];
    const hud = createOrcaHud({ shellPidOf: () => 42, ttyOf: () => "/dev/pts/7", writeTty: (tty, frame) => writes.push({ tty, frame }) });
    hud.createPaneStatusReporter(key, "term-2", root)({ state: "working", task: "fix cli", cost: 0 });
    expect(writes).toHaveLength(0);
  });
});
