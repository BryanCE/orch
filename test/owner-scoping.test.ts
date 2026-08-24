import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { spawnOneIntoTab } from "../src/commands/spawn.ts";
import { cmdClose } from "../src/commands/lifecycle.ts";
import { headlessBackend } from "../src/backends/headless/index.ts";
import { spawnedRecords, recordSpawned } from "../src/presence/store.ts";
import type { Backend, BackendTarget } from "../src/backends/backend.ts";
import { callerOwnerToken } from "../src/commands/target.ts";
import { selfActor } from "../src/entities.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const binPath = join(import.meta.dir, "..", "bin", "orch.ts");
const dirs: string[] = [];
const children: ChildProcess[] = [];
const oldDir = process.env.ORCH_DIR;
const oldOwner = process.env.ORCH_OWNER;
const oldPane = process.env.HERDR_PANE_ID;
const oldTmuxPane = process.env.TMUX_PANE;

function makeDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-owner-scope-"));
  dirs.push(dir);
  writeSettingsFixture(dir, {
    enabled: { adapters: ["pi"], backends: ["headless"] },
    defaults: { adapter: "pi", backend: "headless" },
  });
  process.env.ORCH_DIR = dir;
  return dir;
}

function runCli(dir: string, args: string[], owner?: string, extraEnv?: Record<string, string>): { status: number | null; output: string } {
  const env: Record<string, string | undefined> = { ...process.env, ORCH_DIR: dir };
  if (owner === undefined) delete env.ORCH_OWNER;
  else env.ORCH_OWNER = owner;
  // The caller is an operator unless a test explicitly makes it a spawned agent.
  delete env.ORCH_AGENT_KEY;
  Object.assign(env, extraEnv);
  const result = spawnSync(process.execPath, [binPath, ...args], {
    env,
    encoding: "utf8",
    timeout: 15_000,
  });
  return { status: result.status, output: `${result.stdout}\n${result.stderr}` };
}

afterEach(async () => {
  const spawned = children.splice(0);
  for (const child of spawned) {
    if (child.pid) { try { process.kill(child.pid, "SIGTERM"); } catch {} }
  }
  await Promise.all(spawned.map((child) => child.exitCode !== null
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
      child.once("close", () => resolve());
      setTimeout(resolve, 2_000);
    })));
  while (dirs.length) removeTempDir(dirs.pop()!);
  if (oldDir === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = oldDir;
  if (oldOwner === undefined) delete process.env.ORCH_OWNER; else process.env.ORCH_OWNER = oldOwner;
  if (oldPane === undefined) delete process.env.HERDR_PANE_ID; else process.env.HERDR_PANE_ID = oldPane;
  if (oldTmuxPane === undefined) delete process.env.TMUX_PANE; else process.env.TMUX_PANE = oldTmuxPane;
});

describe("fleet ownership scoping", () => {
  test("owner token uses ORCH_OWNER, else the write actor (selfActor)", () => {
    process.env.ORCH_OWNER = "override";
    expect(callerOwnerToken()).toBe("override");
    // The stamped owner must equal the daemon write actor, or an orchestrator
    // cannot control the agents it spawned. It is never the raw backend pane id.
    delete process.env.ORCH_OWNER;
    expect(callerOwnerToken()).toBe(selfActor() ?? undefined);
  });

  test("spawn stamps the owner token from ORCH_OWNER on its record", () => {
    const dir = makeDir();
    process.env.ORCH_OWNER = "orch-owner";
    delete process.env.HERDR_PANE_ID;
    const backend = {
      id: "headless",
      spawn: () => "native-handle",
    } as unknown as Backend;

    const agent = spawnOneIntoTab({
      backend,
      adapter: {} as never,
      adapterId: "pi",
      name: "worker-1",
      cwd: dir,
      workspace: "local",
      group: "tab-1",
      model: "openai/gpt-5.6",
      preferredModels: [],
    });

    expect(spawnedRecords().get(agent.key)?.owner).toBe("orch-owner");
  });

  test("headless bulk operations refuse without an owner token", () => {
    const dir = makeDir();
    delete process.env.ORCH_OWNER;
    delete process.env.HERDR_PANE_ID;
    delete process.env.TMUX_PANE;
    const result = runCli(dir, ["close", "--all"], undefined);
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("set ORCH_OWNER to identify this orchestrator");
  });

  test("close --all leaves foreign-owned records untouched", () => {
    makeDir();
    process.env.ORCH_OWNER = "caller";
    recordSpawned("headless~local~mine", { backend: "headless", handle: "mine", owner: "caller" });
    recordSpawned("headless~local~foreign", { backend: "headless", handle: "foreign", owner: "other" });

    const closed: string[] = [];
    const backend = headlessBackend as Backend;
    // inventory is an OPTIONAL port capability headless does not implement — bind only if present.
    const originalInventory = backend.inventory?.bind(backend);
    const originalClose = backend.close.bind(backend);
    backend.inventory = () => [{ handle: "mine" }, { handle: "foreign" }] as BackendTarget[];
    backend.close = (handle) => { closed.push(String(handle)); return true; };
    try {
      cmdClose(["--all", "--json"]);
    } finally {
      if (originalInventory) backend.inventory = originalInventory;
      else delete backend.inventory;
      backend.close = originalClose;
    }

    expect(closed).toEqual(["mine"]);
  });

  test("explicit foreign target fails and names its owner", () => {
    const dir = makeDir();
    const key = "headless~local~foreign";
    const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60000)"], { detached: true });
    children.push(child);
    const pid = child.pid!;
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, backend: "headless", workspace: "local", handle: String(pid), pid, agent: "pi", state: "working" }));
    writeFileSync(join(dir, "spawned.jsonl"), JSON.stringify({ backend: "headless", adapter: "pi", handle: { pid, key } }) + "\n");
    recordSpawned(key, { backend: "headless", adapter: "pi", handle: String(pid), owner: "other-orchestrator" });

    const result = runCli(dir, ["close", key], "caller-orchestrator");
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("other-orchestrator");
  }, 15_000);

  // Reading is control too: agent names are one flat namespace across sessions,
  // so an unscoped `orch result` hands a foreign orchestrator's work product back
  // as if this session had produced it.
  test("result refuses a foreign-owned agent and names its owner", () => {
    const dir = makeDir();
    const key = "headless~local~foreign-result";
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, backend: "headless", workspace: "local", handle: key, pid: process.pid, agent: "pi", state: "done" }));
    writeFileSync(join(dir, "agents", key, "result.json"), JSON.stringify({ text: "other session's answer" }));
    recordSpawned(key, { backend: "headless", adapter: "pi", handle: key, owner: "other-orchestrator" });

    const refused = runCli(dir, ["result", key], "caller-orchestrator");
    expect(refused.status).not.toBe(0);
    expect(refused.output).toContain("other-orchestrator");
    expect(refused.output).not.toContain("other session's answer");

    const forced = runCli(dir, ["result", key, "--force"], "caller-orchestrator");
    expect(forced.output).toContain("other session's answer");
  }, 15_000);

  // Pane control is control too: rename, abort, keys, focus, and move all mutate
  // an agent another orchestrator is driving, so each refuses a foreign owner.
  test("pane mutations refuse a foreign-owned agent and name its owner", () => {
    const dir = makeDir();
    const key = "headless~local~foreign-pane";
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, backend: "headless", workspace: "local", handle: key, pid: process.pid, agent: "pi", state: "working" }));
    recordSpawned(key, { backend: "headless", adapter: "pi", handle: key, owner: "other-orchestrator" });

    const mutations = [
      ["rename", key, "hijacked"],
      ["abort", key],
      ["keys", key, "Escape"],
      ["focus", key],
      ["move", key, "--new-tab"],
    ];
    for (const args of mutations) {
      const result = runCli(dir, args, "caller-orchestrator");
      expect(result.status).not.toBe(0);
      expect(result.output).toContain("other-orchestrator");
    }
  }, 30_000);

  test("--force allows an explicit foreign target", () => {
    const dir = makeDir();
    const key = "headless~local~forced";
    const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60000)"], { detached: true });
    children.push(child);
    const pid = child.pid!;
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, backend: "headless", workspace: "local", handle: String(pid), pid, agent: "pi", state: "working" }));
    writeFileSync(join(dir, "spawned.jsonl"), JSON.stringify({ backend: "headless", adapter: "pi", handle: { pid, key } }) + "\n");
    recordSpawned(key, { backend: "headless", adapter: "pi", handle: String(pid), owner: "other-orchestrator" });

    const result = runCli(dir, ["close", key, "--force"], "caller-orchestrator");
    expect(result.status).toBe(0);
  }, 15_000);
});

// One agent ran `close --all` under the shared workspace-operator token and
// killed every fleet in the workspace. A spawned agent now acts as ITSELF —
// its own minted key — and no flag widens that to anyone else's agents.
describe("a spawned agent touches only what it spawned", () => {
  const agentKey = "headless~wF~worker-a";

  test("selfActor is the agent's own key inside a spawned agent", () => {
    process.env.ORCH_AGENT_KEY = agentKey;
    try {
      expect(selfActor()).toBe(agentKey);
    } finally {
      delete process.env.ORCH_AGENT_KEY;
    }
  });

  test("--cross-workspace from a spawned agent is refused", () => {
    const dir = makeDir();
    const key = "headless~wB~victim";
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, backend: "headless", workspace: "wB", handle: key, pid: 99999999, agent: "pi", state: "working" }));
    recordSpawned(key, { backend: "headless", adapter: "pi", handle: key });

    const result = runCli(dir, ["dispatch", key, "hi", "--cross-workspace"], undefined, { ORCH_AGENT_KEY: agentKey });
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("operator-only");
  }, 15_000);

  test("close --all sweeps only the caller's own spawns", () => {
    const dir = makeDir();
    recordSpawned("headless~wF~mine", { backend: "headless", handle: "mine", owner: agentKey });
    recordSpawned("headless~wF~theirs", { backend: "headless", handle: "theirs", owner: "herdr~wF~operator" });

    const result = runCli(dir, ["close", "--all", "--json"], undefined, { ORCH_AGENT_KEY: agentKey });
    expect(result.status).toBe(0);
    expect(spawnedRecords().has("headless~wF~mine")).toBe(false);
    expect(spawnedRecords().has("headless~wF~theirs")).toBe(true);
  }, 15_000);

  test("--force from a spawned agent is refused outright", () => {
    const dir = makeDir();
    const key = "headless~wF~victim";
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, backend: "headless", workspace: "wF", handle: key, pid: process.pid, agent: "pi", state: "working" }));
    recordSpawned(key, { backend: "headless", adapter: "pi", handle: key, owner: "herdr~wF~operator" });

    const result = runCli(dir, ["close", key, "--force"], undefined, { ORCH_AGENT_KEY: agentKey });
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("operator-only");
    expect(spawnedRecords().has(key)).toBe(true);
  }, 15_000);

  test("the workspace operator keeps control of an agent-owned fleet", () => {
    const dir = makeDir();
    const key = "herdr~wF~worker-b";
    mkdirSync(join(dir, "agents", key), { recursive: true });
    // A dead pid: close must reap the record, never signal a live process here.
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, backend: "herdr", workspace: "wF", handle: key, pid: 99999999, agent: "pi", state: "working" }));
    recordSpawned(key, { backend: "herdr", adapter: "pi", handle: key, owner: agentKey });

    const result = runCli(dir, ["close", key], "herdr~wF~operator");
    expect(result.status).toBe(0);
    expect(spawnedRecords().has(key)).toBe(false);
  }, 15_000);
});
