import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { adapterCommand, spawnOneIntoTab } from "../src/commands/spawn.ts";
import { optionalModelSpecs } from "../src/daemon/orchd.ts";
import { HeadlessBackend } from "../src/backends/headless/index.ts";
import { mintAgentId, serializeIdentity } from "../src/backends/identity.ts";
import { piAdapter } from "../src/adapters/pi.ts";
import { SETTINGS_DEFAULTS, type OrchConfig } from "../src/config.ts";
import type { AgentAdapter, SpawnOpts } from "../src/adapters/adapter.ts";
import { seedSpace } from "./helpers/space.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import type { Backend } from "../src/types/backend.ts";

// Every launch route must hand the SAME per-harness quicklist to the adapter that builds the
// command. A route that drops it launches an agent whose model picker is empty while every
// other route's is full — the kind of difference nobody notices until they cycle models.

const oldOrchDir = process.env.ORCH_DIR;
const dirs: string[] = [];

function tempOrchDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-preferred-models-"));
  dirs.push(dir);
  process.env.ORCH_DIR = dir;
  return dir;
}

afterEach(() => {
  while (dirs.length) removeTempDir(dirs.pop()!);
  if (oldOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = oldOrchDir;
});

const QUICKLIST = ["anthropic/claude-sonnet-4.5", "openai/gpt-5.6"];

const config = (preferred: string[]): OrchConfig => ({
  ...SETTINGS_DEFAULTS,
  runtime: "node",
  enabled: { adapters: ["pi"], backends: ["headless"] },
  locked_commands: [],
  defaults: { models: {}, worktree: false },
  fleet: { worker_peer_tools: false, spawn_cap: 8, cross_space: false, space_caps: {} },
  models: { allowed: {}, preferred: { pi: preferred } },
  workers: { inherit_extensions: false, exclude_extensions: [], builtin_tools: true, allow_tools: [] },
  queue: { max_retries: 1 },
  daemon: { tcp_port: 3716, idle_shutdown_minutes: 30 },
  timeouts: { dispatch_ack_ms: 10_000, wait_ms: 300_000, adapter_command_ms: 60_000, notify_ms: 3_000 },
  notify: [],
  hosts: {},
  spaces: {},
  tiling: { first_split: "rows" },
  skills: { install: true, roots: ["~/.claude/skills", "~/.agents/skills"] },
});

/** A pane backend that records the launch options it was handed. */
function capturingPaneBackend(): { backend: Backend; seen: () => { preferredModels?: readonly string[] } | undefined } {
  let captured: { preferredModels?: readonly string[] } | undefined;
  const backend = {
    id: "herdr",
    spawn(_adapter: unknown, opts: { preferredModels?: readonly string[] }) {
      captured = opts;
      return "%7";
    },
  } as unknown as Backend;
  return { backend, seen: () => captured };
}

describe("the preferred quicklist reaches every launch route", () => {
  test("a pane spawn hands the exact array to the backend", () => {
    // A space is user-created and never minted by a spawn (TASKS A7).
    seedSpace(tempOrchDir(), "wsA");
    const { backend, seen } = capturingPaneBackend();

    spawnOneIntoTab({
      backend,
      adapter: piAdapter,
      adapterId: "pi",
      name: "quick-1",
      cwd: "/tmp",
      space: "wsA",
      group: "tab1",
      model: "openai/gpt-5.6",
      preferredModels: QUICKLIST,
    });

    expect(seen()?.preferredModels).toEqual(QUICKLIST);
  });

  test("an unconfigured quicklist stays empty rather than becoming a default one", () => {
    seedSpace(tempOrchDir(), "wsA");
    const { backend, seen } = capturingPaneBackend();

    spawnOneIntoTab({
      backend,
      adapter: piAdapter,
      adapterId: "pi",
      name: "quick-2",
      cwd: "/tmp",
      space: "wsA",
      group: "tab1",
      model: "openai/gpt-5.6",
      preferredModels: [],
    });

    expect(seen()?.preferredModels).toEqual([]);
  });

  test("the previewed command is the command a launch runs", () => {
    const previewed = adapterCommand("pi", config(QUICKLIST), { model: "openai/gpt-5.6", preferredModels: QUICKLIST });
    expect(previewed).toContain("--model openai/gpt-5.6");
    expect(previewed).toContain(`--models '${QUICKLIST.join(",")}'`);

    expect(adapterCommand("pi", config([]), { model: "openai/gpt-5.6", preferredModels: [] })).not.toContain("--models");
  });

  test("a headless launch forwards the quicklist into the adapter's own options", () => {
    const directory = tempOrchDir();
    let captured: SpawnOpts | undefined;
    const adapter = {
      id: "fake",
      headlessCmd(_prompt: string, opts: SpawnOpts): string[] {
        captured = opts;
        return [process.execPath, "-e", ""];
      },
    } as unknown as AgentAdapter;

    // The key a real spawn hands a backend is the minted id alone — registration parses it
    // through the one identity boundary, and a `<plexer>~<space>~<name>` key welds environment
    // into identity, which Rule 11 / TASKS/01-agent-model.md forbids.
    new HeadlessBackend().spawn(adapter, {
      key: serializeIdentity({ id: mintAgentId() }),
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
    expect(optionalModelSpecs(undefined, "preferredModels")).toBeUndefined();
    expect(optionalModelSpecs(QUICKLIST, "preferredModels")).toEqual(QUICKLIST);
  });

  test("refuses a joined string or a blank entry instead of coercing it", () => {
    // A joined string would reach the harness as one model id no registry lists.
    expect(() => optionalModelSpecs(QUICKLIST.join(","), "preferredModels")).toThrow(/array of non-empty model specs/);
    expect(() => optionalModelSpecs([""], "preferredModels")).toThrow(/array of non-empty model specs/);
    expect(() => optionalModelSpecs([1], "preferredModels")).toThrow(/array of non-empty model specs/);
  });
});
