import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { cmdClose } from "../src/commands/lifecycle.ts";
import { headlessBackend } from "../src/backends/headless/index.ts";
import { recordSpawned, spawnedRecords } from "../src/presence/store.ts";
import { checkWall } from "../src/policy/workspace.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const binPath = join(import.meta.dir, "..", "bin", "orch.ts");
const dirs: string[] = [];
const oldDir = process.env.ORCH_DIR;
const oldOwner = process.env.ORCH_OWNER;

function makeDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-close-always-"));
  dirs.push(dir);
  writeSettingsFixture(dir, {
    installed: { adapters: ["pi"], backends: ["headless"] },
    defaults: { adapter: "pi", backend: "headless" },
  });
  process.env.ORCH_DIR = dir;
  process.env.ORCH_OWNER = "caller";
  return dir;
}

function runCli(dir: string, args: string[]): { status: number | null; output: string } {
  const result = spawnSync(process.execPath, [binPath, ...args], {
    env: { ...process.env, ORCH_DIR: dir, ORCH_OWNER: "caller" },
    encoding: "utf8",
    timeout: 15_000,
  });
  return { status: result.status, output: `${result.stdout}\n${result.stderr}` };
}

function writeStatus(dir: string, key: string, handle: string, pid: number, workspace: string): void {
  const agentDir = join(dir, "agents", key);
  mkdirSync(agentDir, { recursive: true });
  writeFileSync(join(agentDir, "status.json"), JSON.stringify({
    schema: 2, key, backend: "headless", workspace, handle, paneId: handle,
    pid, agent: "pi", state: "working",
  }));
}

afterEach(() => {
  while (dirs.length) removeTempDir(dirs.pop()!);
  if (oldDir === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = oldDir;
  if (oldOwner === undefined) delete process.env.ORCH_OWNER; else process.env.ORCH_OWNER = oldOwner;
});

describe("close always works", () => {
  test("closes a foreign-workspace target by name, key, or pane id", () => {
    const dir = makeDir();
    const records = [
      ["headless~foreign~pane-name", "pane-name", "worker-name"],
      ["headless~foreign~pane-key", "pane-key", null],
      ["headless~foreign~pane-id", "pane-id", null],
    ] as const;
    for (const [key, handle] of records) {
      recordSpawned(key, { backend: "headless", handle, owner: "caller" });
      writeStatus(dir, key, handle, process.pid, "foreign-workspace");
    }

    const backend = headlessBackend as typeof headlessBackend & {
      inventory?: () => { handle: string; workspace: string; name: string | null }[];
    };
    // inventory is an OPTIONAL port capability headless does not implement — bind only if present.
    const oldInventory = backend.inventory?.bind(backend);
    const oldClose = backend.close.bind(backend);
    const closed: string[] = [];
    backend.inventory = () => records.map(([, handle, name]) => ({ handle, workspace: "foreign-workspace", name }));
    backend.close = (handle) => { closed.push(typeof handle === "string" ? handle : handle.key); return true; };
    try {
      cmdClose(["worker-name", "headless~foreign~pane-key", "pane-id", "--json"]);
    } finally {
      if (oldInventory) backend.inventory = oldInventory;
      else delete backend.inventory;
      backend.close = oldClose;
    }

    expect(closed).toEqual(["pane-name", "pane-key", "pane-id"]);
    for (const [key] of records) {
      expect(spawnedRecords().has(key)).toBe(false);
      expect(existsSync(join(dir, "agents", key))).toBe(false);
    }
  });

  test("dead pane-less close is a successful no-op that reaps registry and presence", () => {
    const dir = makeDir();
    const key = "headless~foreign~dead-pane";
    const handle = "99999999";
    recordSpawned(key, { backend: "headless", handle, owner: "caller" });
    const agentDir = join(dir, "agents", key);
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(join(agentDir, "status.json"), JSON.stringify({
      schema: 2, key, backend: "headless", workspace: "foreign-workspace",
      handle, pid: 99999999, agent: "pi", state: "done",
    }));

    const result = runCli(dir, ["close", key, "--json"]);

    expect(result.status).toBe(0);
    expect(spawnedRecords().has(key)).toBe(false);
    expect(existsSync(agentDir)).toBe(false);
  }, 15_000);

  test("steer remains blocked by the workspace wall", () => {
    const decision = checkWall("headless~workspace-a~operator", "headless~workspace-b~pane", { crossWorkspace: false });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("workspace wall");
  });
});
