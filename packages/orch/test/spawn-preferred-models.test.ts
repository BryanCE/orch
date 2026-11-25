import { testLaunch } from "./helpers/launch.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { RPC_PARAMS } from "../src/daemon/client/protocol.ts";
import { launchArgv } from "../src/daemon/server/spawn/models.ts";
import { spawnOneIntoTab } from "../src/daemon/server/spawn/placement.ts";
import { HeadlessBackend } from "../src/backends/headless/index.ts";
import { mintAgentId } from "../src/shared/agent-id.ts";
import { PiAdapter, piAdapter } from "../src/adapters/pi.ts";
import { seedSpace } from "./helpers/space.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { FakePanedBackend } from "./helpers/backend.ts";
import { servedServices } from "./helpers/daemon-state.ts";
import type { Backend, BackendSpawnOpts } from "../src/types/backend.ts";
import type { AgentAdapter, SpawnOpts } from "../src/types/adapter.ts";
import type { ThinkingLevel } from "../src/types/policy.ts";
import type { RpcServer } from "../src/types/daemon.ts";
import type { Services } from "../src/types/services.ts";

import type { OrchDir } from "../src/types/core.ts";
// Every launch route must hand the SAME per-harness quicklist to the adapter that builds the
// command. A route that drops it launches an agent whose model picker is empty while every
// other route's is full — the kind of difference nobody notices until they cycle models.

const oldOrchDir = process.env.ORCH_DIR;
const dirs: OrchDir[] = [];
const servers: RpcServer[] = [];

function makeTempOrchDir(): OrchDir {
  const dir = tempOrchDir("orch-preferred-models-");
  dirs.push(dir);
  process.env.ORCH_DIR = dir;
  return dir;
}

/** The spawn reads the fleet and writes through orchd: serve the real handler table on this dir. */
function spawningServices(dir: OrchDir): Promise<Services> {
  return servedServices({ orchDir: dir, settings: {} }, servers);
}

afterEach(async () => {
  while (servers.length) await servers.pop()!.close();
  while (dirs.length) removeTempDir(dirs.pop()!);
  if (oldOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = oldOrchDir;
});

const QUICKLIST = ["anthropic/claude-sonnet-4.5", "openai/gpt-5.6"];
const HEADLESS_BASE = { form: null, key: "agent-a", name: "agent-a", spawner: null, adapter: "pi", model: "openai/gpt-5.6", thinking: "medium", prompt: "go", project: "/repo", readOnly: null };


/** A pane backend that records the launch options it was handed. */
class CapturingPaneBackend extends FakePanedBackend {
  private captured: BackendSpawnOpts[] = [];

  constructor() {
    super({ id: "herdr" });
  }

  override spawn(_adapter: AgentAdapter, opts: BackendSpawnOpts): string {
    this.captured.push(opts);
    return `%${this.captured.length + 6}`;
  }

  seen(): BackendSpawnOpts | undefined {
    return this.captured.at(-1);
  }

  allSeen(): readonly BackendSpawnOpts[] {
    return this.captured;
  }
}

function capturingPaneBackend(): { backend: Backend; seen: () => BackendSpawnOpts | undefined; allSeen: () => readonly BackendSpawnOpts[] } {
  const backend = new CapturingPaneBackend();
  return { backend, seen: () => backend.seen(), allSeen: () => backend.allSeen() };
}

describe("the preferred quicklist reaches every launch route", () => {
  test("a pane spawn hands the exact array to the backend", async () => {
    // A space is user-created and never minted by a spawn (TASKS A7).
    const directory = makeTempOrchDir();
    seedSpace(directory, "wsA");
    const { backend, seen } = capturingPaneBackend();

    await spawnOneIntoTab(await spawningServices(directory), { project: "/fleet/project", form: "tui",
      prepareTerminal: () => Promise.resolve(null), lane: null,
      backend,
      adapter: piAdapter,
      adapterId: "pi",
      name: "quick-1",
      spawner: null, owner: undefined,
      cwd: "/tmp",
      space: "wsA",
      group: "tab1",
      model: "openai/gpt-5.6",
      thinking: "medium",
      launch: testLaunch(QUICKLIST),
    });

    expect(seen()?.preferredModels).toEqual(QUICKLIST);
  });

  test("two created agents retain their own model tuning", async () => {
    const directory = makeTempOrchDir();
    seedSpace(directory, "wsA");
    const { backend, allSeen } = capturingPaneBackend();
    const services = await spawningServices(directory);

    const agents = [["quick-a", "openai/gpt-5.6", "medium"], ["quick-b", "anthropic/claude-sonnet-4.5", "high"]] satisfies readonly (readonly [string, string, ThinkingLevel])[];
    for (const [name, model, thinking] of agents) {
      await spawnOneIntoTab(services, { project: "/fleet/project", form: "tui",
        prepareTerminal: () => Promise.resolve(null), lane: null,
        backend,
        adapter: piAdapter,
        adapterId: "pi",
        name,
        spawner: null, owner: undefined,
        cwd: "/tmp",
        space: "wsA",
        group: "tab1",
        model,
        thinking,
        launch: testLaunch(QUICKLIST),
      });
    }

    expect(allSeen().map((opts) => ({ model: opts.model, thinking: opts.thinking }))).toEqual([
      { model: "openai/gpt-5.6", thinking: "medium" },
      { model: "anthropic/claude-sonnet-4.5", thinking: "high" },
    ]);
  });

  test("an unconfigured quicklist stays empty rather than becoming a default one", async () => {
    const directory = makeTempOrchDir();
    seedSpace(directory, "wsA");
    const { backend, seen } = capturingPaneBackend();

    await spawnOneIntoTab(await spawningServices(directory), { project: "/fleet/project", form: "tui",
      prepareTerminal: () => Promise.resolve(null), lane: null,
      backend,
      adapter: piAdapter,
      adapterId: "pi",
      name: "quick-2",
      spawner: null, owner: undefined,
      cwd: "/tmp",
      space: "wsA",
      group: "tab1",
      model: "openai/gpt-5.6",
      thinking: "medium",
      launch: testLaunch(),
    });

    expect(seen()?.preferredModels).toEqual([]);
  });

  test("a restart's argv carries the model and the quicklist", () => {
    const directory = makeTempOrchDir();
    const argv = launchArgv(piAdapter, testLaunch(QUICKLIST), { model: "openai/gpt-5.6" }, directory);
    expect(argv.join(" ")).toContain("--model openai/gpt-5.6");
    expect(argv.join(" ")).toContain(`--models ${QUICKLIST.join(",")}`);

    expect(launchArgv(piAdapter, testLaunch(), { model: "openai/gpt-5.6" }, directory)).not.toContain("--models");
  });

  test("a headless launch forwards the quicklist into the adapter's own options", () => {
    const directory = makeTempOrchDir();
    let captured: SpawnOpts | undefined;
    class CapturingPiAdapter extends PiAdapter {
      override readonly workerLaunch = {
        restrictedInteractiveArgv: (opts: SpawnOpts): readonly string[] => super.restrictedInteractiveArgv(opts),
        restrictedHeadlessCmd: (_prompt: string, opts: SpawnOpts): string[] => {
          captured = opts;
          return [process.execPath, "-e", ""];
        },
      };
    }
    const adapter: AgentAdapter = new CapturingPiAdapter();

    // The key a real spawn hands a backend is the minted id alone — registration parses it
    // through the one identity boundary, and a `<plexer>~<space>~<name>` key welds environment
    // into identity, which Rule 11 forbids.
    new HeadlessBackend().spawn(adapter, { project: "/fleet/project", form: "oneshot",
      key: mintAgentId(),
      cwd: directory,
      orchDir: directory,
      prompt: "go",
      model: "openai/gpt-5.6",
      preferredModels: QUICKLIST,
    });

    expect(captured?.preferredModels).toEqual(QUICKLIST);
  });
});

  describe("orchd takes only the read-only request on a spawn-headless", () => {
    test("accepts no request, and a request with or without an out directory", () => {
      expect(RPC_PARAMS["spawn-headless"].safeParse(HEADLESS_BASE).success).toBe(true);
      expect(RPC_PARAMS["spawn-headless"].safeParse({ ...HEADLESS_BASE, readOnly: { out: null } }).success).toBe(true);
      expect(RPC_PARAMS["spawn-headless"].safeParse({ ...HEADLESS_BASE, readOnly: { out: "/repo/out" } }).success).toBe(true);
    });

    test("refuses an absent request, a blank out directory, and a value that is not a request", () => {
      const absent = Object.fromEntries(Object.entries(HEADLESS_BASE).filter(([name]) => name !== "readOnly"));
      expect(RPC_PARAMS["spawn-headless"].safeParse(absent).success).toBe(false);
      expect(RPC_PARAMS["spawn-headless"].safeParse({ ...HEADLESS_BASE, readOnly: { out: "" } }).success).toBe(false);
      expect(RPC_PARAMS["spawn-headless"].safeParse({ ...HEADLESS_BASE, readOnly: true }).success).toBe(false);
    });

    test("a policy the asking host sends is dropped: the launching host builds its own", () => {
      const parsed = RPC_PARAMS["spawn-headless"].safeParse({ ...HEADLESS_BASE, preferredModels: QUICKLIST, env: { A: "1" } });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect("preferredModels" in parsed.data).toBe(false);
        expect("env" in parsed.data).toBe(false);
      }
    });
  });
  