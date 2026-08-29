import { afterEach, describe, expect, test } from "bun:test";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildEntities, entitySpace, type Entity } from "../src/entities.ts";
import { insertSpawnedRecord } from "../src/store/spawned-rows.ts";
import { presenceAgentDir } from "../src/presence/store.ts";

const directories: string[] = [];
const originalOrchDir = process.env.ORCH_DIR;

afterEach(() => {
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
  while (directories.length) removeTempDir(directories.pop()!);
});

function presenceFixture(): { orchDir: string; key: string } {
  const orchDir = mkdtempSync(join(tmpdir(), "orch-command-space-"));
  directories.push(orchDir);
  const key = "headless~key-workspace~999999";
  const directory = presenceAgentDir(key, orchDir);
  mkdirSync(directory, { recursive: true });
  insertSpawnedRecord(orchDir, { pane: key, backend: "headless", space: "reported-space", handle: "999999" });
  writeFileSync(join(directory, "status.json"), JSON.stringify({
    schema: PRESENCE_SCHEMA,
    key,
    paneId: "999999",
    pid: process.pid,
    agent: "pi",
    state: "idle",
  }));
  return { orchDir, key };
}

function writePresence(orchDir: string, key: string, agent: string, space: string, handle: string): void {
  const directory = presenceAgentDir(key, orchDir);
  mkdirSync(directory, { recursive: true });
  insertSpawnedRecord(orchDir, { pane: key, backend: "headless", space, handle });
  writeFileSync(join(directory, "status.json"), JSON.stringify({
    schema: PRESENCE_SCHEMA, key, paneId: handle,
    pid: process.pid, agent, state: "idle",
  }));
}

describe("command space fields", () => {
  test("status and wall entities use the persisted space instead of serialized-key text", () => {
    const { orchDir, key } = presenceFixture();
    process.env.ORCH_DIR = orchDir;

    const entity = buildEntities().find((candidate) => candidate.key === key);
    expect(entitySpace(entity!)).toBe("reported-space");

    const current = buildEntities().find((candidate) => candidate.key === key)!;
    expect(current).toMatchObject({ key, paneId: "999999", agent: "pi", space: "reported-space" });
    expect(entitySpace(current)).toBe("reported-space");
    expect(entitySpace(current)).not.toBe("key-workspace");
  }, 30_000);

  test("skipBackends keeps the authoritative presence entity shape", () => {
    const { orchDir, key } = presenceFixture();
    process.env.ORCH_DIR = orchDir;

    const entities = buildEntities({ skipBackends: true });
    expect(entities).toHaveLength(1);
    const entity = entities[0];
    expect(entity?.key).toBe(key);
    expect(entity?.paneId).toBe("999999");
    expect(entity?.presenceOnly).toBe(true);
    expect(entity?.backend).toBe("headless");
    expect(entity?.space).toBe("reported-space");
  });

  test("status reports a mixed pi and Claude fleet with the same identity fields", () => {
    const { orchDir } = presenceFixture();
    const claudeKey = "headless~other-key~1000000";
    writePresence(orchDir, claudeKey, "claude", "reported-claude", "1000000");
    process.env.ORCH_DIR = orchDir;

    const entities: Entity[] = buildEntities();
    const expected: Partial<Entity>[] = [
      expect.objectContaining({ key: "headless~key-workspace~999999", agent: "pi", space: "reported-space" }) as Partial<Entity>,
      expect.objectContaining({ key: claudeKey, agent: "claude", space: "reported-claude" }) as Partial<Entity>,
    ];
    expect(entities).toEqual(expect.arrayContaining(expected) as unknown as Entity[]);
  }, 30_000);
});
