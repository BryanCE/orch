import { afterEach, describe, expect, test } from "bun:test";
import { RPC_PARAMS } from "../src/daemon/client/protocol.ts";
import { adapterCommand } from "../src/commands/spawn/models.ts";
import { spawnOneIntoTab } from "../src/commands/spawn/placement.ts";
import { HeadlessBackend } from "../src/backends/headless/index.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import { PiAdapter, piAdapter } from "../src/adapters/pi.ts";
import { SETTINGS_DEFAULTS } from "../src/settings/schema.ts";
import { seedSpace } from "./helpers/space.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { FakePanedBackend } from "./helpers/backend.ts";
import { servedServices } from "./helpers/daemon-state.ts";
import type { Backend, BackendSpawnOpts } from "../src/types/backend.ts";
import type { AgentAdapter, SpawnOpts } from "../src/types/adapter.ts";
import type { ThinkingLevel } from "../src/types/policy.ts";
import type { OrchSettings } from "../src/types/settings.ts";
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

/** The spawn writes through orchd: serve the real handler table on this dir. */
function spawningServices(dir: OrchDir): Promise<Services> {
  return servedServices({ orchDir: dir, settings: null }, servers);
}

afterEach(async () => {
  while (servers.length) await servers.pop()!.close();
  while (dirs.length) removeTempDir(dirs.pop()!);
  if (oldOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = oldOrchDir;
});

const QUICKLIST = ["anthropic/claude-sonnet-4.5", "openai/gpt-5.6"];
const HEADLESS_BASE = { key: "agent-a", adapter: "pi", model: "openai/gpt-5.6", thinking: "medium", prompt: "go" };

const settings = (preferred: string[]): OrchSettings => ({
  ...SETTINGS_DEFAULTS,
  runtime: "node",
  enabled: { adapters: ["pi"], backends: ["headless"] },
  locked_commands: [],
  defaults: { ...SETTINGS_DEFAULTS.defaults, models: {} },
  fleet: { worker_peer_tools: false, max_agents_per_pack: 10, max_agents_per_tab: 4, max_depth: 1, cross_space: false, max_agents_per_space: {} },
  models: { allowed: {}, preferred: { pi: preferred } },
  workers: { inherit_extensions: false, exclude_extensions: [], builtin_tools: true, allow_tools: [], verify_commands: [] },
  queue: { max_retries: 1, dispatch_concurrency: 4 },
  daemon: { tcp_port: 3716, idle_shutdown_minutes: 30, outbox_drain_ms: 1000, work_tick_ms: 5_000, liveness_poll_ms: 5_000, report_timeout_ms: 500, bridge_reconnect_ms: 1000, outbox_max_attempts: 120 },
  timeouts: { dispatch_ack_ms: 10_000, wait_ms: 300_000, adapter_command_ms: 60_000, notify_ms: 3_000, spawn_attach_ms: 60_000, spawn_attach_poll_ms: 500 },
  notify: [],
  hosts: {},
  spaces: {},
  tiling: { first_split: "rows" },
  skills: { install: true, store: "~/.agents/skills", link: ["~/.claude/skills"] },
});

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

    await spawnOneIntoTab(await spawningServices(directory), {
      backend,
      adapter: piAdapter,
      adapterId: "pi",
      name: "quick-1",
      cwd: "/tmp",
      space: "wsA",
      group: "tab1",
      model: "openai/gpt-5.6",
      thinking: "medium",
      preferredModels: QUICKLIST,
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
      await spawnOneIntoTab(services, {
        backend,
        adapter: piAdapter,
        adapterId: "pi",
        name,
        cwd: "/tmp",
        space: "wsA",
        group: "tab1",
        model,
        thinking,
        preferredModels: QUICKLIST,
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

    await spawnOneIntoTab(await spawningServices(directory), {
      backend,
      adapter: piAdapter,
      adapterId: "pi",
      name: "quick-2",
      cwd: "/tmp",
      space: "wsA",
      group: "tab1",
      model: "openai/gpt-5.6",
      thinking: "medium",
      preferredModels: [],
    });

    expect(seen()?.preferredModels).toEqual([]);
  });

  test("the previewed command is the command a launch runs", () => {
    const previewed = adapterCommand("pi", settings(QUICKLIST), { model: "openai/gpt-5.6", preferredModels: QUICKLIST });
    expect(previewed).toContain("--model openai/gpt-5.6");
    expect(previewed).toContain(`--models '${QUICKLIST.join(",")}'`);

    expect(adapterCommand("pi", settings([]), { model: "openai/gpt-5.6", preferredModels: [] })).not.toContain("--models");
  });

  test("a headless launch forwards the quicklist into the adapter's own options", () => {
    const directory = makeTempOrchDir();
    let captured: SpawnOpts | undefined;
    class CapturingPiAdapter extends PiAdapter {
      override readonly workerLaunch = {
        restrictedInteractiveCmd: (opts: SpawnOpts): string => super.restrictedInteractiveCmd(opts),
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
    new HeadlessBackend().spawn(adapter, {
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

describe("orchd rules on the quicklist it is sent", () => {
  test("accepts an absent value and an array of specs", () => {
    expect(RPC_PARAMS["spawn-headless"].safeParse(HEADLESS_BASE).success).toBe(true);
    const parsed = RPC_PARAMS["spawn-headless"].safeParse({ ...HEADLESS_BASE, preferredModels: QUICKLIST });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.preferredModels).toEqual(QUICKLIST);
  });

  test("refuses a joined string or a blank entry instead of coercing it", () => {
    expect(RPC_PARAMS["spawn-headless"].safeParse({ ...HEADLESS_BASE, preferredModels: QUICKLIST.join(",") }).success).toBe(false);
    expect(RPC_PARAMS["spawn-headless"].safeParse({ ...HEADLESS_BASE, preferredModels: [""] }).success).toBe(false);
    expect(RPC_PARAMS["spawn-headless"].safeParse({ ...HEADLESS_BASE, preferredModels: [1] }).success).toBe(false);
  });
});
