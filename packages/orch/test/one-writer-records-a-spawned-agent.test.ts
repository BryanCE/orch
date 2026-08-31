import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { spawnOneIntoTab } from "../src/commands/spawn/placement.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import { registerSpawnedAgent } from "../src/store/spawn-registration.ts";
import { agentView } from "../src/store/agent-view.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { piAdapter } from "../src/adapters/pi.ts";
import { FakePanedBackend } from "./helpers/backend.ts";
import { seedSpace } from "./helpers/space.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

/**
 * `registerSpawnedAgent` is the only write.
 *
 * The spawn path called `registerSpawnedAgent` AND `recordSpawned`, and the two
 * had already divided the record between them: registration wrote the harness,
 * plexer, handle and model, while `recordSpawned` supplied the space and the
 * owner's lease. Two writers of one record is the "which record is authoritative"
 * class of bug (1.1, 1.2), and it is only fixed when the second writer is GONE —
 * which means the first must be sufficient on its own.
 */
const oldOrchDir = process.env.ORCH_DIR;
const oldOwner = process.env.ORCH_OWNER;
const dirs: string[] = [];

function tempOrchDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-one-writer-"));
  dirs.push(dir);
  process.env.ORCH_DIR = dir;
  return dir;
}

afterEach(() => {
  closeAllStores();
  while (dirs.length) removeTempDir(dirs.pop()!);
  if (oldOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = oldOrchDir;
  if (oldOwner === undefined) delete process.env.ORCH_OWNER;
  else process.env.ORCH_OWNER = oldOwner;
});

describe("one writer records a spawned agent (2.1)", () => {
  test("registerSpawnedAgent alone writes the COMPLETE record — space and lease included", () => {
    const dir = tempOrchDir();
    seedSpace(dir, "wsOne");
    const key = mintAgentId();
    const owner = mintAgentId();

    registerSpawnedAgent(dir, {
      key, harnessId: "pi", backendId: "herdr", pane: true, handle: "%3",
      cwd: "/tmp", name: "solo-1", model: "openai/gpt-5.6", space: "wsOne",
      spawner: null, owner,
    });

    const view = agentView(dir, key);
    expect(view?.environment.space).toBe("wsOne");
    expect(view?.environment.plexer).toBe("herdr");
    expect(view?.environment.handle).toBe("%3");
    expect(view?.heldBy?.orchId).toBe(owner);
  });

  test("a spawn leaves NOTHING for a second writer to fill in", () => {
    const dir = tempOrchDir();
    seedSpace(dir, "wsTwo");
    const owner = mintAgentId();
    process.env.ORCH_OWNER = owner;

    const agent = spawnOneIntoTab({
      backend: new FakePanedBackend({ id: "herdr" }),
      adapter: piAdapter,
      adapterId: "pi",
      name: "solo-2",
      cwd: "/tmp",
      space: "wsTwo",
      group: "tab1",
      model: "openai/gpt-5.6",
      preferredModels: [],
    });

    const view = agentView(dir, agent.key);
    expect(view?.environment.space).toBe("wsTwo");
    expect(view?.heldBy?.orchId).toBe(owner);
  });

  // A7: a space is optional. Rule 11: NULL means not-applicable, never a sentinel
  // string. 2026-08-29: `placeSpawn` turned "no space" into `""`, registration then
  // demanded a space named "" and every spawn from a human's pane failed with
  // `no space named ""`. The plexer coordinate rides in its OWN field (E10) and
  // is what the pane host receives; orch's space is never handed to the plexer.
  test("a spawn into NO space records no space and hands the plexer only its coordinate", () => {
    const dir = tempOrchDir();
    process.env.ORCH_OWNER = mintAgentId();
    const backend = new FakePanedBackend({ id: "herdr" });

    const agent = spawnOneIntoTab({
      backend,
      adapter: piAdapter,
      adapterId: "pi",
      name: "solo-3",
      cwd: "/tmp",
      space: null,
      workspace: "w7",
      group: "tab1",
      model: "openai/gpt-5.6",
      preferredModels: [],
      placement: { split: "right", targetPane: "fake-pane-0" },
    });

    const view = agentView(dir, agent.key);
    expect(view).toBeDefined();
    expect(view?.environment.space).toBeNull();
    expect(backend.opened.map((request) => request.workspace)).toEqual(["w7"]);
  });

  test("the presence store no longer offers a second way to record an agent", async () => {
    const store: Record<string, unknown> = await import("../src/presence/store.ts");
    expect("recordSpawned" in store).toBe(false);
  });
});
