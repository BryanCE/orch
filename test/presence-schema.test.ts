import * as fs from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { buildEntities } from "../src/entities.ts";
import { mintAgentId, parseIdentity } from "../src/backends/identity.ts";
import { spawnedRecords } from "../src/presence/store.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { seedAgent } from "./helpers/agent.ts";
import { isRecord } from "../src/util.ts";

const orchDir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-presence-schema-"));
const storePath = path.join(import.meta.dir, "../src/presence/store.ts");

interface PresenceStatus {
  schema?: number;
  key?: string;
  agent?: string;
  pid?: number;
  state?: string;
}

function isPresenceStatus(value: unknown): value is PresenceStatus {
  if (!isRecord(value)) return false;
  return (value.schema === undefined || typeof value.schema === "number")
    && (value.key === undefined || typeof value.key === "string")
    && (value.agent === undefined || typeof value.agent === "string")
    && (value.pid === undefined || typeof value.pid === "number")
    && (value.state === undefined || typeof value.state === "string");
}

function parsePresenceStatuses(value: unknown): Record<string, PresenceStatus> {
  if (!isRecord(value)) throw new Error("presence statuses are not an object");
  const statuses: Record<string, PresenceStatus> = {};
  for (const [key, status] of Object.entries(value)) {
    if (!isPresenceStatus(status)) throw new Error(`invalid status ${key}`);
    statuses[key] = status;
  }
  return statuses;
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
  return parsePresenceStatuses(JSON.parse(ran.stdout.toString()));
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

/** A1: a presence directory is named by the agent's minted id and nothing else.
 *  These fixtures used to spell `tmux~workspace-a~%255` — the plexer, that
 *  plexer's own grouping, and a pane handle, all welded into the one fact that
 *  may never change. Where an agent sits is read through the composer instead. */
describe("presence status schema", () => {
  test("reads a spawned identity without placement fields in status", () => {
    const key = mintAgentId();
    writeStatus(key, { schema: PRESENCE_SCHEMA, key, agent: "pi", pid: process.pid, state: "working" });
    expect(readStatuses()[key]!).toMatchObject({ schema: PRESENCE_SCHEMA, key, agent: "pi", state: "working" });
  });

  test("orch status JSON exposes the agent status fields", () => {
    const key = mintAgentId();
    writeStatus(key, { schema: PRESENCE_SCHEMA, key, agent: "pi", pid: process.pid, state: "idle" });
    process.env.ORCH_DIR = orchDir;

    expect(readStatuses()).toEqual(expect.objectContaining({
      [key]: expect.objectContaining({ key, agent: "pi" }),
    }));
    expect(parseIdentity(key)).toEqual({ id: key });
  });

  test("status and list report the same agent identity", () => {
    const key = mintAgentId();
    writeStatus(key, { schema: PRESENCE_SCHEMA, key, agent: "pi", pid: process.pid, state: "idle" });
    process.env.ORCH_DIR = orchDir;

    const status = readStatuses()[key]!;
    const listed = buildEntities().find((entity) => entity.key === key)!;
    expect({ key: status.key, agent: status.agent }).toEqual({
      key: listed.key, agent: listed.agent ?? undefined,
    });
    expect(parseIdentity(status.key!)).toEqual({ id: key });
  });

  test("mixed pi and Claude status rows carry the same status field set", () => {
    const piKey = mintAgentId();
    const claudeKey = mintAgentId();
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
    // The key IS the minted id: there is no segment to strip, so two agents in
    // different spaces are told apart by their ids and by nothing else.
    for (const row of rows) expect(parseIdentity(row.key!)).toEqual({ id: row.key! });
  });

  test("rejects a status record that carries no schema stamp", () => {
    writeStatus("unstamped1", { pid: process.pid, state: "idle" });

    expect(readStatuses().unstamped).toBeUndefined();
  });

  test("rejects a status record stamped with a non-current schema", () => {
    writeStatus("wrongstamp", { schema: PRESENCE_SCHEMA + 1, agent: "pi", pid: process.pid, state: "idle" });

    expect(readStatuses().wrongstamp).toBeUndefined();
  });

  test("rejects a current-schema record carrying placement fields", () => {
    writeStatus("placemntcp", { schema: PRESENCE_SCHEMA, agent: "pi", space: "wrong", pid: process.pid, state: "idle" });

    expect(readStatuses().placemntcp).toBeUndefined();
  });

  test("a malformed record is skipped without hiding the valid records beside it", () => {
    writeStatus("unstamped1", { pid: process.pid, state: "idle" });
    writeStatus("currentag1", { schema: PRESENCE_SCHEMA, agent: "pi", pid: process.pid, state: "done" });

    const statuses = readStatuses();
    expect(Object.keys(statuses)).toEqual(["currentag1"]);
    expect(statuses.currentag1!).toMatchObject({ schema: PRESENCE_SCHEMA, agent: "pi" });
  });

  test("the four facts are recorded apart and composed back onto the minted id", () => {
    process.env.ORCH_DIR = orchDir;
    const key = mintAgentId();
    seedAgent(key, {
      backend: "tmux",
      handle: "%5",
      adapter: "claude",
      cwd: "/work/project",
    });

    // Identity is the id; the harness and cwd are hub columns; the plexer and
    // its pane handle are ENVIRONMENT, each on its own table and read back
    // through the composer. Nothing reassembles them into a flat row.
    expect(spawnedRecords().get(key)).toMatchObject({
      id: key,
      harnessId: "claude",
      cwd: "/work/project",
      environment: { plexer: "tmux", handle: "%5", space: null },
    });
  });
});
