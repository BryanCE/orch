import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { spawnOneIntoTab } from "../src/commands/spawn.ts";
import { cmdClose } from "../src/commands/lifecycle.ts";
import { headlessBackend } from "../src/backends/headless/index.ts";
import { spawnedRecords, recordSpawned } from "../src/presence/store.ts";
import type { Backend } from "../src/backends/backend.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";

const binPath = join(import.meta.dir, "..", "bin", "orch.ts");
const dirs: string[] = [];
const children: ChildProcess[] = [];
const oldDir = process.env.ORCH_DIR;
const oldOwner = process.env.ORCH_OWNER;
const oldPane = process.env.HERDR_PANE_ID;

function makeDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-owner-scope-"));
  dirs.push(dir);
  writeSettingsFixture(dir, {
    installed: { adapters: ["pi"], backends: ["headless"] },
    defaults: { adapter: "pi", backend: "headless" },
  });
  process.env.ORCH_DIR = dir;
  return dir;
}

function runCli(dir: string, args: string[], owner: string): { status: number | null; output: string } {
  const result = spawnSync(process.execPath, [binPath, ...args], {
    env: { ...process.env, ORCH_DIR: dir, ORCH_OWNER: owner },
    encoding: "utf8",
    timeout: 15_000,
  });
  return { status: result.status, output: `${result.stdout}\n${result.stderr}` };
}

afterEach(() => {
  for (const child of children.splice(0)) {
    if (child.pid) { try { process.kill(child.pid, "SIGTERM"); } catch {} }
  }
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
  if (oldDir === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = oldDir;
  if (oldOwner === undefined) delete process.env.ORCH_OWNER; else process.env.ORCH_OWNER = oldOwner;
  if (oldPane === undefined) delete process.env.HERDR_PANE_ID; else process.env.HERDR_PANE_ID = oldPane;
});

describe("fleet ownership scoping", () => {
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
      model: null,
    });

    expect(spawnedRecords().get(agent.key)?.owner).toBe("orch-owner");
  });

  test("close --all leaves foreign-owned records untouched", () => {
    makeDir();
    process.env.ORCH_OWNER = "caller";
    recordSpawned("headless~local~mine", { backend: "headless", handle: "mine", owner: "caller" });
    recordSpawned("headless~local~foreign", { backend: "headless", handle: "foreign", owner: "other" });

    const closed: string[] = [];
    const backend = headlessBackend as Backend & { inventory: () => Array<{ handle: string }> };
    const originalInventory = backend.inventory;
    const originalClose = backend.close;
    backend.inventory = () => [{ handle: "mine" }, { handle: "foreign" }];
    backend.close = ((handle: string) => { closed.push(handle); return true; }) as typeof backend.close;
    try {
      cmdClose(["--all", "--json"]);
    } finally {
      backend.inventory = originalInventory;
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
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: 2, key, backend: "headless", workspace: "local", handle: String(pid), pid, agent: "pi", state: "working" }));
    writeFileSync(join(dir, "spawned.jsonl"), JSON.stringify({ backend: "headless", adapter: "pi", handle: { pid, key } }) + "\n");
    recordSpawned(key, { backend: "headless", adapter: "pi", handle: String(pid), owner: "other-orchestrator" });

    const result = runCli(dir, ["close", key], "caller-orchestrator");
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("other-orchestrator");
  }, 15_000);

  test("--force allows an explicit foreign target", () => {
    const dir = makeDir();
    const key = "headless~local~forced";
    const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60000)"], { detached: true });
    children.push(child);
    const pid = child.pid!;
    mkdirSync(join(dir, "agents", key), { recursive: true });
    writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: 2, key, backend: "headless", workspace: "local", handle: String(pid), pid, agent: "pi", state: "working" }));
    writeFileSync(join(dir, "spawned.jsonl"), JSON.stringify({ backend: "headless", adapter: "pi", handle: { pid, key } }) + "\n");
    recordSpawned(key, { backend: "headless", adapter: "pi", handle: String(pid), owner: "other-orchestrator" });

    const result = runCli(dir, ["close", key, "--force"], "caller-orchestrator");
    expect(result.status).toBe(0);
  }, 15_000);
});
