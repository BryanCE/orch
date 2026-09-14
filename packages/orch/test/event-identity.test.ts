import { afterEach, describe, expect, test } from "bun:test";

import { emitAndNotify } from "../src/daemon/server/events.ts";
import { runWorkLoop } from "../src/daemon/server/work-loop.ts";
import { removeTempDir, tempOrchDir as makeTempOrchDir } from "./helpers/tempdir.ts";
import { seedStatus } from "./helpers/presence.ts";
import type { NotifyEvent } from "../src/types/notify.ts";
import { testServices } from "./helpers/services.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import type { OrchDir } from "../src/types/core.ts";

const directories: OrchDir[] = [];

function tempOrchDir(): OrchDir {
  const directory = makeTempOrchDir("orch-event-identity-");
  directories.push(directory);
  return directory;
}

type TransitionOldState = Extract<NotifyEvent, { type: "transition" }>["oldState"];
type TransitionNewState = Extract<NotifyEvent, { type: "transition" }>["newState"];

function transition(key: string, oldState: TransitionOldState, newState: TransitionNewState): NotifyEvent {
  return { type: "transition", key, agent: "worker", tab: null, model: null, oldState, newState, ts: new Date().toISOString() };
}

afterEach(() => {
  while (directories.length > 0) removeTempDir(directories.pop()!);
});

describe("published event identity", () => {
  test("stamps a per-agent ordinal so a redelivery is recognizable", () => {
    const published: unknown[] = [];
    const emit = (value: unknown): void => { published.push(value); };
    const settings = testServices({ orchDir: tempOrchDir(), settings: null }).settings;
    emitAndNotify(emit, [], transition("seqaagent1", "idle", "working"), undefined, settings);
    emitAndNotify(emit, [], transition("seqaagent1", "working", "done"), undefined, settings);
    emitAndNotify(emit, [], transition("seqbagent1", "idle", "working"), undefined, settings);

    expect(published.map((event) => {
      if (typeof event !== "object" || event === null || Array.isArray(event)) return undefined;
      const seq: unknown = Reflect.get(event, "seq");
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
    writeSettingsFixture(orchDir, { defaults: { adapter: "pi", backend: "headless" } });
    seedStatus(orchDir, key, { state: "idle", label: "Loop agent" });
    const published: NotifyEvent[] = [];
    const controller = new AbortController();
    try {
      const loop = runWorkLoop({
        orchDir,
        pollIntervalMs: 10,
        continuous: true,
        settings: testServices({ orchDir, settings: { defaults: { adapter: "pi", backend: "headless" } } }).settings,
        models: testServices({ orchDir }).models,
        signal: controller.signal,
        onEvent: (event) => published.push(event),
      });
      // Exactly the transition that used to be derived twice — once here and once
      // in the presence watch — for every agent in the fleet.
      seedStatus(orchDir, key, { state: "working", label: "Loop agent" });
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
