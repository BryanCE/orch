import * as fs from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
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
  const ran = Bun.spawnSync([process.execPath, "-e", script], {
    env: { ...process.env, ORCH_DIR: orchDir },
    stdout: "pipe",
    stderr: "pipe",
  });
  if (!ran.success) throw new Error(`presence read failed: ${ran.stderr.toString()}`);
  return JSON.parse(ran.stdout.toString()) as Record<string, PresenceStatus>;
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
  test("reads a spawned identity without placement fields in status", () => {
    const key = "tmux~workspace-a~%255";
    writeStatus(key, { schema: PRESENCE_SCHEMA, key, agent: "pi", pid: process.pid, state: "working" });
    expect(readStatuses()[key]!).toMatchObject({ schema: PRESENCE_SCHEMA, key, agent: "pi", state: "working" });
  });

  test("orch status JSON exposes the agent status fields", () => {
    const key = "headless~workspace-a~ag7k2m9x1p";
    writeStatus(key, { schema: PRESENCE_SCHEMA, key, agent: "pi", pid: process.pid, state: "idle" });
    process.env.ORCH_DIR = orchDir;

    expect(readStatuses()).toEqual(expect.objectContaining({
      [key]: expect.objectContaining({ key, agent: "pi" }) as PresenceStatus,
    }) as Record<string, PresenceStatus>);
    expect(parseIdentity(key)).toEqual({ backend: "headless", workspace: "workspace-a", id: "ag7k2m9x1p" });
  });

  test("status and list report the same agent identity", () => {
    const key = "headless~workspace-a~ag7k2m9x1p";
    writeStatus(key, { schema: PRESENCE_SCHEMA, key, agent: "pi", pid: process.pid, state: "idle" });
    process.env.ORCH_DIR = orchDir;

    const status = readStatuses()[key]!;
    const listed = buildEntities().find((entity) => entity.key === key)!;
    expect({ key: status.key, agent: status.agent }).toEqual({
      key: listed.key, agent: listed.agent ?? undefined,
    });
    expect(parseIdentity(status.key!)).toMatchObject({ backend: "headless", workspace: "workspace-a", id: "ag7k2m9x1p" });
  });

  test("mixed pi and Claude status rows carry the same status field set", () => {
    const piKey = "headless~workspace-a~ag7k2m9x1p";
    const claudeKey = "headless~workspace-b~zq4n8b3t7v";
    writeStatus(piKey, { schema: PRESENCE_SCHEMA, key: piKey, agent: "pi", pid: process.pid, state: "idle" });
    writeStatus(claudeKey, { schema: PRESENCE_SCHEMA, key: claudeKey, agent: "claude", pid: process.pid, state: "idle" });
    process.env.ORCH_DIR = orchDir;

    const rows = Object.values(readStatuses()).filter((row) => row.key === piKey || row.key === claudeKey);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => Object.keys(row).sort())).toEqual([
      ["agent", "key", "pid", "schema", "state"],
      ["agent", "key", "pid", "schema", "state"],
    ]);
    expect(rows.map((row) => row.agent).sort()).toEqual(["claude", "pi"]);
    // The id is minted, so it matches neither the pane handle nor the name.
    for (const row of rows) {
      const identity = parseIdentity(row.key!);
      expect(identity.id).not.toBe(row.key);
    }
  });

  test("rejects a status record that carries no schema stamp", () => {
    writeStatus("unstamped", { pid: process.pid, state: "idle" });

    expect(readStatuses().unstamped).toBeUndefined();
  });

  test("rejects a status record stamped with a non-current schema", () => {
    writeStatus("wrong-stamp", { schema: PRESENCE_SCHEMA + 1, agent: "pi", pid: process.pid, state: "idle" });

    expect(readStatuses()["wrong-stamp"]).toBeUndefined();
  });

  test("rejects a current-schema record carrying placement fields", () => {
    writeStatus("placement-copy", { schema: PRESENCE_SCHEMA, agent: "pi", space: "wrong", pid: process.pid, state: "idle" });

    expect(readStatuses()["placement-copy"]).toBeUndefined();
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
