import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { emitAndNotify } from "../src/daemon/events.ts";
import { runWorkLoop } from "../src/daemon/work-loop.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { seedStatus } from "./helpers/presence.ts";
import type { NotifyEvent } from "../src/types/notify.ts";

const directories: string[] = [];

function tempOrchDir(): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-event-identity-"));
  directories.push(directory);
  return directory;
}

function transition(key: string, oldState: string, newState: string): NotifyEvent {
  return { key, agent: "worker", tab: null, model: null, oldState, newState, ts: new Date().toISOString() };
}

afterEach(() => {
  while (directories.length > 0) removeTempDir(directories.pop()!);
});

describe("published event identity", () => {
  test("stamps a per-agent ordinal so a redelivery is recognizable", () => {
    const published: unknown[] = [];
    const emit = (value: unknown): void => { published.push(value); };
    emitAndNotify(emit, [], transition("seqaagent1", "idle", "working"));
    emitAndNotify(emit, [], transition("seqaagent1", "working", "done"));
    emitAndNotify(emit, [], transition("seqbagent1", "idle", "working"));

    expect(published.map((event) => {
      if (typeof event !== "object" || event === null || Array.isArray(event)) return undefined;
      const seq = Reflect.get(event, "seq");
      return typeof seq === "number" ? seq : undefined;
    })).toEqual([1, 2, 1]);
  });
});

describe("the work loop is not a second presence-transition source", () => {
  test("an agent state change publishes nothing from the queue loop", async () => {
    const orchDir = tempOrchDir();
    const key = "loopagent1";
    const previous = process.env.ORCH_DIR;
    process.env.ORCH_DIR = orchDir;
    seedStatus(orchDir, key, { state: "idle", label: "Loop agent", pid: process.pid });
    const published: NotifyEvent[] = [];
    const controller = new AbortController();
    try {
      const loop = runWorkLoop({
        orchDir,
        pollIntervalMs: 10,
        continuous: true,
        signal: controller.signal,
        onEvent: (event) => published.push(event),
      });
      // Exactly the transition that used to be derived twice — once here and once
      // in the presence watch — for every agent in the fleet.
      seedStatus(orchDir, key, { state: "working", label: "Loop agent", pid: process.pid });
      await new Promise((resolve) => setTimeout(resolve, 120));
      controller.abort();
      await loop;
    } finally {
      if (previous === undefined) delete process.env.ORCH_DIR;
      else process.env.ORCH_DIR = previous;
    }
    expect(published).toEqual([]);
  });
});
