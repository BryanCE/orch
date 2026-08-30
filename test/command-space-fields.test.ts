import { afterEach, describe, expect, test } from "bun:test";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildEntities, entitySpace } from "../src/entities.ts";
import { presenceAgentDir } from "../src/presence/store.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import { ensureHarness, ensurePlexer, insertAgent } from "../src/store/agent-rows.ts";
import { setAgentPlexer, setHandle, setSpace } from "../src/store/interval-rows.ts";
import { agentView } from "../src/store/agent-view.ts";
import { closeAllStores, orm } from "../src/store/connection.ts";
import type { Entity } from "../src/types/core.ts";
import { sql } from "drizzle-orm";

/**
 * TASKS/02-scope.md A1 — commands read the space from the environment satellite
 * the agent actually has, never from text inside its key. An identity is a bare
 * minted id, so there is no key text left to slice.
 */

const directories: string[] = [];
const originalOrchDir = process.env.ORCH_DIR;

afterEach(() => {
  closeAllStores();
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
  while (directories.length) removeTempDir(directories.pop()!);
});

/** Seed one placed agent: minted identity, plus one row per environment axis. */
function writeAgent(orchDir: string, agent: string, space: string, handle: string): string {
  const id = mintAgentId();
  ensureHarness(orchDir, "pi", "pi", 1);
  ensurePlexer(orchDir, "headless", "headless", 1);
  orm(orchDir).run(sql`INSERT OR IGNORE INTO spaces (id, name, created_at) VALUES (${space}, ${space}, 1)`);
  insertAgent(orchDir, { id, spawnedBy: null, harnessId: "pi", cwd: orchDir, name: id, createdAt: 1 });
  setAgentPlexer(orchDir, id, "headless");
  setSpace(orchDir, id, 1, space);
  setHandle(orchDir, id, 1, handle);
  const directory = presenceAgentDir(id, orchDir);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "status.json"), JSON.stringify({
    schema: PRESENCE_SCHEMA, key: id, paneId: handle, pid: process.pid, agent, state: "idle",
  }));
  return id;
}

function presenceFixture(): { orchDir: string; key: string } {
  const orchDir = mkdtempSync(join(tmpdir(), "orch-command-space-"));
  directories.push(orchDir);
  return { orchDir, key: writeAgent(orchDir, "pi", "reported-space", "999999") };
}

describe("command space fields", () => {
  test("status and wall entities use the composed space, and it is nowhere in the key", () => {
    const { orchDir, key } = presenceFixture();
    process.env.ORCH_DIR = orchDir;

    const current = buildEntities().find((candidate) => candidate.key === key)!;
    expect(current).toMatchObject({ key, paneId: "999999", agent: "pi", space: "reported-space" });
    expect(entitySpace(current)).toBe("reported-space");
    expect(key).not.toContain("reported-space");
    expect(agentView(orchDir, key)?.environment.space).toBe("reported-space");
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
    const { orchDir, key } = presenceFixture();
    const claudeKey = writeAgent(orchDir, "claude", "reported-claude", "1000000");
    process.env.ORCH_DIR = orchDir;

    const entities: Entity[] = buildEntities();
    const expected: Partial<Entity>[] = [
      expect.objectContaining({ key, agent: "pi", space: "reported-space" }),
      expect.objectContaining({ key: claudeKey, agent: "claude", space: "reported-claude" }),
    ];
    expect(entities).toEqual(expect.arrayContaining(expected));
  }, 30_000);
});
