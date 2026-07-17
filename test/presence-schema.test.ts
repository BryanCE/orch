import * as fs from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import { execFileSync } from "node:child_process";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { buildEntities } from "../src/entities.ts";
import { parseIdentity } from "../src/backends/identity.ts";
import { recordSpawned, spawnedRecords } from "../src/store.ts";

const orchDir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-presence-schema-"));
const storePath = path.join(import.meta.dir, "../src/store.ts");

interface PresenceStatus {
  schema?: number;
  key?: string;
  backend?: string;
  workspace?: string;
  handle?: string;
  agent?: string;
  pid?: number;
  state?: string;
}

function readStatuses(): Record<string, PresenceStatus> {
  const script = `
    const store = await import(${JSON.stringify(storePath)});
    const statuses = {};
    for (const [key, entry] of store.loadPresence()) statuses[key] = store.statusForPresence(entry);
    console.log(JSON.stringify(statuses));
  `;
  return JSON.parse(execFileSync(process.execPath, ["-e", script], {
    env: { ...process.env, ORCH_DIR: orchDir },
    encoding: "utf8",
  })) as Record<string, PresenceStatus>;
}

function writeStatus(key: string, status: object): void {
  const directory = path.join(orchDir, "agents", key);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "status.json"), JSON.stringify(status));
}

const originalOrchDir = process.env.ORCH_DIR;

afterEach(() => {
  removeTempDir(path.join(orchDir, "agents"));
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
});

afterAll(() => {
  removeTempDir(orchDir);
});

describe("presence status schema", () => {
  test("reads a spawned namespaced identity with backend, workspace, handle, and adapter", () => {
    const key = "tmux~workspace-a~%255";
    writeStatus(key, {
      schema: 2, key, backend: "tmux", workspace: "workspace-a", handle: "%5",
      agent: "pi", pid: process.pid, state: "working",
    });

    expect(readStatuses()[key]!).toMatchObject({
      schema: 2, key, backend: "tmux", workspace: "workspace-a", handle: "%5", agent: "pi", state: "working",
    });
  });

  test("orch status JSON exposes the complete spawned identity fields", () => {
    const key = "headless~workspace-a~1234";
    writeStatus(key, {
      schema: 2, key, backend: "headless", workspace: "workspace-a", handle: "1234",
      agent: "pi", pid: process.pid, state: "idle",
    });
    process.env.ORCH_DIR = orchDir;

    expect(readStatuses()).toEqual(expect.objectContaining({
      [key]: expect.objectContaining({ key, backend: "headless", workspace: "workspace-a", handle: "1234", agent: "pi" }) as PresenceStatus,
    }) as Record<string, PresenceStatus>);
    expect(parseIdentity(key)).toEqual({ backend: "headless", workspace: "workspace-a", handle: "1234" });
  });

  test("status and list report the same agent identity", () => {
    const key = "headless~workspace-a~1234";
    writeStatus(key, {
      schema: 2, key, backend: "headless", workspace: "workspace-a", handle: "1234",
      agent: "pi", pid: process.pid, state: "idle",
    });
    process.env.ORCH_DIR = orchDir;

    const status = readStatuses()[key]!;
    const listed = buildEntities().find((entity) => entity.key === key)!;
    expect({ key: status.key, workspace: status.workspace, agent: status.agent }).toEqual({
      key: listed.key, workspace: listed.workspace ?? undefined, agent: listed.agent ?? undefined,
    });
    expect(parseIdentity(status.key!)).toMatchObject({ backend: "headless", workspace: status.workspace, handle: "1234" });
  });

  test("mixed pi and Claude status rows carry the same identity field set", () => {
    const piKey = "headless~workspace-a~1234";
    const claudeKey = "headless~workspace-b~5678";
    writeStatus(piKey, {
      schema: 2, key: piKey, backend: "headless", workspace: "workspace-a", handle: "1234",
      agent: "pi", pid: process.pid, state: "idle",
    });
    writeStatus(claudeKey, {
      schema: 2, key: claudeKey, backend: "headless", workspace: "workspace-b", handle: "5678",
      agent: "claude", pid: process.pid, state: "idle",
    });
    process.env.ORCH_DIR = orchDir;

    const rows = Object.values(readStatuses()).filter((row) => row.key === piKey || row.key === claudeKey);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => Object.keys(row).sort())).toEqual([
      ["agent", "backend", "handle", "key", "pid", "schema", "state", "workspace"],
      ["agent", "backend", "handle", "key", "pid", "schema", "state", "workspace"],
    ]);
    expect(rows.map((row) => row.agent).sort()).toEqual(["claude", "pi"]);
    for (const row of rows) expect(parseIdentity(row.key!)).toMatchObject({ backend: row.backend, workspace: row.workspace, handle: row.handle });
  });

  test("keeps schema-1 status records valid without adding fields", () => {
    writeStatus("legacy", { pid: process.pid, state: "idle" });

    expect(readStatuses().legacy!).toEqual({ pid: process.pid, state: "idle" });
    expect(readStatuses().legacy!.agent).toBeUndefined();
  });

  test("loads a mixed directory of schema-1 and schema-2 records", () => {
    writeStatus("legacy", { pid: process.pid, state: "idle" });
    writeStatus("current", { schema: 2, agent: "pi", pid: process.pid, state: "done" });

    const statuses = readStatuses();
    expect(Object.keys(statuses)).toHaveLength(2);
    expect(statuses.legacy!.agent).toBeUndefined();
    expect(statuses.current!).toMatchObject({ schema: 2, agent: "pi" });
  });

  test("persists the complete spawned identity record", () => {
    process.env.ORCH_DIR = orchDir;
    recordSpawned("tmux~workspace-a~%255", {
      backend: "tmux",
      handle: "%5",
      adapter: "claude",
      cwd: "/work/project",
    });

    expect(spawnedRecords().get("tmux~workspace-a~%255")).toMatchObject({
      pane: "tmux~workspace-a~%255",
      backend: "tmux",
      handle: "%5",
      adapter: "claude",
      cwd: "/work/project",
    });
  });
});
