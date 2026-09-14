import { afterEach, describe, expect, test } from "bun:test";
import { orchDirAt } from "../src/services.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { buildEntities } from "../src/entities/inventory.ts";
import { entitySpace } from "../src/entities/space.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import { ensureHarness, ensurePlexer, insertAgent } from "../src/store/agent-rows.ts";
import { setAgentPlexer, setHandle, setSpace } from "../src/store/interval-rows.ts";
import { mergeAgentStatus } from "../src/store/status-rows.ts";
import { agentView } from "../src/store/agent-view.ts";
import { closeAllStores, orm } from "../src/store/connection.ts";
import type { Entity, OrchDir } from "../src/types/core.ts";
import { sql } from "drizzle-orm";
import { testServices } from "./helpers/services.ts";

/**
 * Commands read the space from the environment satellite
 * the agent actually has, never from text inside its key. An identity is a bare
 * minted id, so there is no key text left to slice.
 */

const directories: OrchDir[] = [];
const originalOrchDir: OrchDir | undefined = process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR);

afterEach(() => {
  closeAllStores();
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
  while (directories.length) removeTempDir(directories.pop()!);
});

/** Seed one placed agent: minted identity, plus one row per environment axis. */
function writeAgent(orchDir: OrchDir, agent: string, space: string, handle: string): string {
  const id = mintAgentId();
  ensureHarness(orchDir, agent, agent, 1);
  ensurePlexer(orchDir, "headless", "headless", 1);
  orm(orchDir).run(sql`INSERT OR IGNORE INTO spaces (id, name, created_at) VALUES (${space}, ${space}, 1)`);
  insertAgent(orchDir, { id, spawnedBy: null, harnessId: agent, cwd: orchDir, name: id, createdAt: 1 });
  setAgentPlexer(orchDir, id, "headless");
  setSpace(orchDir, id, 1, space);
  setHandle(orchDir, id, 1, handle);
  mergeAgentStatus(orchDir, id, { state: "idle" }, Date.now());
  return id;
}

function presenceFixture(): { orchDir: OrchDir; key: string } {
  const orchDir = tempOrchDir("orch-command-space-");
  directories.push(orchDir);
  return { orchDir, key: writeAgent(orchDir, "pi", "reported-space", "999999") };
}

describe("command space fields", () => {
  test("status and wall entities use the composed space, and it is nowhere in the key", () => {
    const { orchDir, key } = presenceFixture();
    process.env.ORCH_DIR = orchDir;

    const current = buildEntities(orchDir, testServices({ orchDir, settings: { defaults: { adapter: "pi", backend: "headless" } } }).settings.current()).find((candidate) => candidate.key === key)!;
    expect(current).toMatchObject({ key, paneId: "999999", agent: "pi", space: "reported-space" });
    expect(entitySpace(orchDir, current)).toBe("reported-space");
    expect(key).not.toContain("reported-space");
    expect(agentView(orchDir, key)?.environment.space).toBe("reported-space");
  }, 30_000);

  test("skipBackends keeps the authoritative presence entity shape", () => {
    const { orchDir, key } = presenceFixture();
    process.env.ORCH_DIR = orchDir;

    const entities = buildEntities(orchDir, testServices({ orchDir, settings: { defaults: { adapter: "pi", backend: "headless" } } }).settings.current(), { skipBackends: true });
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

    const entities: Entity[] = buildEntities(orchDir, testServices({ orchDir, settings: { defaults: { adapter: "pi", backend: "headless" } } }).settings.current());
    const piEntity = entities.find((entity) => entity.key === key);
    const claudeEntity = entities.find((entity) => entity.key === claudeKey);
    expect(piEntity?.key).toBe(key);
    expect(piEntity?.agent).toBe("pi");
    expect(piEntity?.space).toBe("reported-space");
    expect(claudeEntity?.key).toBe(claudeKey);
    expect(claudeEntity?.agent).toBe("claude");
    expect(claudeEntity?.space).toBe("reported-claude");
  }, 30_000);
});
