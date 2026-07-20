import * as fs from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import { execFileSync } from "node:child_process";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { buildEntities } from "../src/entities.ts";
import { parseIdentity } from "../src/backends/identity.ts";
import { recordSpawned, spawnedRecords } from "../src/presence/store.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";

const orchDir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-presence-schema-"));
const storePath = path.join(import.meta.dir, "../src/presence/store.ts");

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

/** The live status view: every presence dir the store enumerates, minus the ones
 *  whose status.json is not stamped with the current schema. Malformed dirs stay
 *  on disk for `orch doctor` to name and `orch clean` to reap; they simply never
 *  read as a live status. */
function readStatuses(): Record<string, PresenceStatus> {
  const script = `
    const store = await import(${JSON.stringify(storePath)});
    const statuses = {};
    for (const [key, entry] of store.loadPresence()) {
      const status = store.statusForPresence(entry);
      if (status) statuses[key] = status;
    }
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
      schema: PRESENCE_SCHEMA, key, backend: "tmux", workspace: "workspace-a", handle: "%5",
      agent: "pi", pid: process.pid, state: "working",
    });

    expect(readStatuses()[key]!).toMatchObject({
      schema: PRESENCE_SCHEMA, key, backend: "tmux", workspace: "workspace-a", handle: "%5", agent: "pi", state: "working",
    });
  });

  test("orch status JSON exposes the complete spawned identity fields", () => {
    const key = "headless~workspace-a~1234";
    writeStatus(key, {
      schema: PRESENCE_SCHEMA, key, backend: "headless", workspace: "workspace-a", handle: "1234",
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
      schema: PRESENCE_SCHEMA, key, backend: "headless", workspace: "workspace-a", handle: "1234",
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
      schema: PRESENCE_SCHEMA, key: piKey, backend: "headless", workspace: "workspace-a", handle: "1234",
      agent: "pi", pid: process.pid, state: "idle",
    });
    writeStatus(claudeKey, {
      schema: PRESENCE_SCHEMA, key: claudeKey, backend: "headless", workspace: "workspace-b", handle: "5678",
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

  test("rejects a status record that carries no schema stamp", () => {
    writeStatus("unstamped", { pid: process.pid, state: "idle" });

    expect(readStatuses().unstamped).toBeUndefined();
  });

  test("rejects a status record stamped with a non-current schema", () => {
    writeStatus("wrong-stamp", { schema: PRESENCE_SCHEMA + 1, agent: "pi", pid: process.pid, state: "idle" });

    expect(readStatuses()["wrong-stamp"]).toBeUndefined();
  });

  test("a malformed record is skipped without hiding the valid records beside it", () => {
    writeStatus("unstamped", { pid: process.pid, state: "idle" });
    writeStatus("current", { schema: PRESENCE_SCHEMA, agent: "pi", pid: process.pid, state: "done" });

    const statuses = readStatuses();
    expect(Object.keys(statuses)).toEqual(["current"]);
    expect(statuses.current!).toMatchObject({ schema: PRESENCE_SCHEMA, agent: "pi" });
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
