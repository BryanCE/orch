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
import { closeAllStores, openStore } from "../src/store/connection.ts";
import { checkWall, sameSpace, scopeToSpace, spaceName, spaceOf } from "../src/policy/space.ts";

/**
 * TASKS/02-scope.md A1 — the space an agent is in is ENVIRONMENT, composed onto
 * its own timeline. It is never a segment of an identity key, and an agent that
 * is in no space has NO `agent_spaces` row: `null` is the answer, and "local" is
 * a place nobody ever opened.
 */

const originalOrchDir = process.env.ORCH_DIR;
const fixtureDirs: string[] = [];

afterEach(() => {
  closeAllStores();
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
  while (fixtureDirs.length) removeTempDir(fixtureDirs.pop()!);
});

function storeDir(prefix: string): string {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  fixtureDirs.push(directory);
  ensureHarness(directory, "pi", "pi", 1);
  return directory;
}

function ensureSpaceRow(directory: string, spaceId: string): void {
  openStore(directory).query("INSERT OR IGNORE INTO spaces (id, name, created_at) VALUES (?, ?, 1)")
    .run(spaceId, spaceId);
}

/** Place one agent: identity is minted, and each environment axis it actually
 *  has gets its own row. An axis with no row is genuinely absent. */
function placeAgent(
  directory: string,
  options: { plexer?: string; space?: string; handle?: string } = {},
): string {
  const id = mintAgentId();
  insertAgent(directory, { id, spawnedBy: null, harnessId: "pi", cwd: directory, name: id, createdAt: 1 });
  if (options.plexer !== undefined) {
    ensurePlexer(directory, options.plexer, options.plexer, 1);
    setAgentPlexer(directory, id, options.plexer);
  }
  if (options.space !== undefined) {
    ensureSpaceRow(directory, options.space);
    setSpace(directory, id, 1, options.space);
  }
  if (options.handle !== undefined) setHandle(directory, id, 1, options.handle);
  return id;
}

function identityFixture(): { actorKey: string; targetKey: string } {
  const orchDir = storeDir("orch-space-policy-");
  const keys: string[] = [];
  for (const handle of ["actor-handle", "target-handle"]) {
    const id = placeAgent(orchDir, { plexer: "headless", space: "reported-space", handle });
    const directory = presenceAgentDir(id, orchDir);
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, "status.json"), JSON.stringify({
      schema: PRESENCE_SCHEMA, key: id, paneId: handle, pid: process.pid, agent: "pi", state: "idle",
    }));
    keys.push(id);
  }
  process.env.ORCH_DIR = orchDir;
  return { actorKey: keys[0]!, targetKey: keys[1]! };
}

describe("space policy", () => {
  test("reads the space from the environment satellite, and absence is null", () => {
    const dir = storeDir("orch-space-registry-");
    const inWD = placeAgent(dir, { plexer: "herdr", space: "wD", handle: "p2" });
    const inMain = placeAgent(dir, { plexer: "tmux", space: "main", handle: "%255" });
    // No space row at all: a detached agent is in no space, and "local" is not one.
    const nowhere = placeAgent(dir, { plexer: "headless", handle: "1234" });

    expect(spaceOf(dir, inWD)).toBe("wD");
    expect(spaceOf(dir, inMain)).toBe("main");
    expect(spaceOf(dir, nowhere)).toBeNull();
    expect(agentView(dir, nowhere)?.environment.space).toBeNull();
    // A plexer coordinate names no agent orch minted.
    expect(spaceOf(dir, "wD:p1")).toBeNull();
    expect(spaceOf(dir, "session-123")).toBeNull();
    expect(spaceOf(dir, null)).toBeNull();
    expect(spaceOf(dir, undefined)).toBeNull();
  });

  test("resolves space names through records and functions", () => {
    expect(spaceName("wD", { wD: "Design" })).toBe("Design");
    expect(spaceName("wC", (id) => id === "wC" ? "Code" : undefined)).toBe("Code");
    expect(spaceName("wX", { wD: "Design" })).toBe("wX");
    expect(spaceName(null, {})).toBeNull();
  });

  test("compares agents by the space each is composed into", () => {
    const dir = storeDir("orch-space-compare-");
    const first = placeAgent(dir, { plexer: "herdr", space: "wD", handle: "p0" });
    const second = placeAgent(dir, { plexer: "herdr", space: "wD", handle: "p2" });
    const one = placeAgent(dir, { plexer: "herdr", space: "w1", handle: "p1" });
    const two = placeAgent(dir, { plexer: "herdr", space: "w2", handle: "p2" });
    expect(sameSpace(spaceOf(dir, first), spaceOf(dir, second))).toBe(true);
    expect(sameSpace(spaceOf(dir, one), spaceOf(dir, two))).toBe(false);
    expect(sameSpace(null, "w8")).toBe(false);
  });

  test("enforces the space wall across every plexer alike", () => {
    const dir = storeDir("orch-space-wall-");
    const wdFirst = placeAgent(dir, { plexer: "herdr", space: "wD", handle: "p0" });
    const wdSecond = placeAgent(dir, { plexer: "herdr", space: "wD", handle: "p2" });
    const w1 = placeAgent(dir, { plexer: "herdr", space: "w1", handle: "p1" });
    const w2 = placeAgent(dir, { plexer: "herdr", space: "w2", handle: "p2" });
    // Same space, different plexers: the wall is about the SPACE, never the plexer.
    const headless = placeAgent(dir, { plexer: "headless", space: "shared", handle: "1" });
    const tmux = placeAgent(dir, { plexer: "tmux", space: "shared", handle: "%5" });

    expect(checkWall(dir, wdFirst, wdSecond, { crossSpace: false }).allowed).toBe(true);
    expect(checkWall(dir, w1, w2, { crossSpace: false }).allowed).toBe(false);
    expect(checkWall(dir, w1, w2, { crossSpace: true }).allowed).toBe(true);
    expect(checkWall(dir, null, w2, { crossSpace: false }).allowed).toBe(true);
    expect(checkWall(dir, headless, tmux, { crossSpace: false }).allowed).toBe(true);
  });

  test("scopes agents to the current space", () => {
    const dir = storeDir("orch-space-scope-");
    const w1 = placeAgent(dir, { plexer: "herdr", space: "w1", handle: "p1" });
    const w2 = placeAgent(dir, { plexer: "tmux", space: "w2", handle: "%5" });
    const items = [w1, w2, "session-123"];
    expect(scopeToSpace(dir, items, (item) => item, "w1", { all: false })).toEqual([w1]);
  });

  test("a null current space leaves items unscoped", () => {
    const dir = storeDir("orch-space-scope-null-");
    const items = ["herdr~w1~p1", "herdr~w2~p2", "session-123"];
    expect(scopeToSpace(dir, items, (item) => item, null, { all: false })).toBe(items);
  });

  test("2.7 status displays the composed space, not text sliced from a key", () => {
    const { actorKey } = identityFixture();
    const entity = buildEntities().find((candidate) => candidate.key === actorKey)!;

    expect(entitySpace(entity)).toBe("reported-space");
    expect(actorKey).not.toContain("reported-space");
  });

  test("6.6 structured identity drives status and policy, not serialized key text", () => {
    const { actorKey, targetKey } = identityFixture();
    const entities = buildEntities();
    const actor = entities.find((entity) => entity.key === actorKey)!;
    const target = entities.find((entity) => entity.key === targetKey)!;
    const actorSpace = entitySpace(actor);
    const targetSpace = entitySpace(target);

    expect(actorSpace).toBe("reported-space");
    expect(targetSpace).toBe("reported-space");
    // The space appears NOWHERE in either identity: that is the whole of A1.
    expect(actorKey).not.toContain(actorSpace!);
    expect(targetKey).not.toContain(targetSpace!);
    expect(sameSpace(actorSpace, targetSpace)).toBe(true);
    expect(checkWall(process.env.ORCH_DIR!, actorKey, targetKey, { crossSpace: false }).allowed).toBe(true);
  });
});
