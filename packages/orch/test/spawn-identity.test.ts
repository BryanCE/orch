import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnOneIntoTab } from "../src/commands/spawn/placement.ts";
import { mintAgentId, parseIdentity } from "../src/backends/identity.ts";
import { normalizeControlTarget } from "../src/control/normalize-target.ts";
import { spawnedRecords } from "../src/presence/store.ts";
import { agentById, ensureHarness } from "../src/store/agent-rows.ts";
import { registerSpawnedAgent } from "../src/store/spawn-registration.ts";
import { setSpace } from "../src/store/interval-rows.ts";
import { agentView } from "../src/store/agent-view.ts";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { piAdapter } from "../src/adapters/pi.ts";
import { FakePanedBackend } from "./helpers/backend.ts";
import { seedStatus } from "./helpers/presence.ts";
import { seedSpace } from "./helpers/space.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import type { BackendHandle, BackendSpawnOpts } from "../src/types/backend.ts";
import type { AgentAdapter } from "../src/types/adapter.ts";
import { sql } from "drizzle-orm";
import { isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";

const dirs: string[] = [];

beforeEach(() => {
  isolateOrchEnv();
  // These tests drive the spawning orchestrator, not an already spawned worker.
  // Each child identity is minted and passed through the spawn spec itself.
});

function tempOrchDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-spawn-identity-"));
  dirs.push(dir);
  process.env.ORCH_DIR = dir;
  return dir;
}

afterEach(() => {
  closeAllStores();
  while (dirs.length) removeTempDir(dirs.pop()!);
  restoreOrchEnv();
});

/**
 * A paned environment that records the key it would stamp as launch env
 * (real herdr/tmux put `opts.key` into the launch env verbatim) and returns a
 * pane-native handle distinct from that key.
 *
 * Rule 13: this extends the shared COMPLETE `Backend` fixture rather than
 * casting a two-field object through `unknown`. The cast used to hide that the
 * fake declared none of the pane roles `spawnOneIntoTab` reads.
 */
class KeyRecordingBackend extends FakePanedBackend {
  /** The key the launch was handed, or undefined before the first spawn. */
  envKey: string | undefined;

  constructor(private readonly paneHandle: string) {
    super({ id: "herdr" });
  }

  override spawn(_adapter: AgentAdapter, opts: BackendSpawnOpts): BackendHandle {
    this.envKey = opts.key;
    return this.paneHandle;
  }
}

function fakePaneBackend(paneHandle: string): { backend: KeyRecordingBackend; envKey: () => string | undefined } {
  const backend = new KeyRecordingBackend(paneHandle);
  return { backend, envKey: () => backend.envKey };
}

describe("one key per pane spawn (12.1)", () => {
  test("identity is an opaque minted id — never the name, never the pane handle", () => {
    seedSpace(tempOrchDir(), "wsA");
    const { backend, envKey } = fakePaneBackend("%5");

    const agent = spawnOneIntoTab({
      backend,
      adapter: piAdapter,
      adapterId: "pi",
      name: "audit-1",
      cwd: "/tmp",
      space: "wsA",
      group: "tab1",
      model: "openai/gpt-5.6",
      preferredModels: [],
    });

    // The key passed via launch env IS the identity key returned to the caller.
    expect(envKey()).toBe(agent.key);

    // A1: identity is the minted id and NOTHING else — no plexer, no space, no
    // handle, and never the human name. Environment is composed separately.
    const identity = parseIdentity(agent.key);
    expect(identity).toEqual({ id: agent.key });
    expect(identity.id).not.toBe("audit-1");
    expect(identity.id).not.toBe("%5");

    const view = spawnedRecords().get(identity.id);
    expect(view).toBeDefined();
    // The agent is keyed on the minted id; the plexer, the space and the pane
    // handle are environment axes composed onto it, not parts of its key.
    expect(view!.id).toBe(agent.key);
    expect(view!.environment.space).toBe("wsA");
    expect(view!.environment.plexer).toBe("herdr");
    expect(view!.environment.handle).toBe("%5");
    expect(agentById(process.env.ORCH_DIR!, identity.id)?.name).toBe("audit-1");
  });

  test("a name freed by a dead agent is reusable, and the two agents differ in identity", () => {
    seedSpace(tempOrchDir(), "wsC");
    const spawnAudit = () => spawnOneIntoTab({
      backend: fakePaneBackend("%9").backend,
      adapter: piAdapter,
      adapterId: "pi",
      name: "audit-1",
      cwd: "/tmp",
      space: "wsC",
      group: "tab1",
      model: "openai/gpt-5.6",
      preferredModels: [],
    });

    // No presence is ever stamped, so the first agent is not alive: its name is
    // free immediately. Under name-as-identity this collided forever.
    const first = spawnAudit();
    const second = spawnAudit();

    expect(second.key).not.toBe(first.key);
    expect(agentById(process.env.ORCH_DIR!, parseIdentity(second.key).id)?.name).toBe("audit-1");
  });

  test("a spawned agent resolves to exactly one control-target candidate", () => {
    const dir = tempOrchDir();
    seedSpace(dir, "wsB");
    const { backend } = fakePaneBackend("%7");

    const agent = spawnOneIntoTab({
      backend,
      adapter: piAdapter,
      adapterId: "pi",
      name: "audit-2",
      cwd: "/tmp",
      space: "wsB",
      group: "tab1",
      model: "openai/gpt-5.6",
      preferredModels: [],
    });

    // The agent's bridge stamps its presence under the same key, carrying the
    // pane handle/paneId — the only join between key and backend handle.
    seedStatus(dir, agent.key, {
      key: agent.key,
      backend: "herdr",
      workspace: "wsB",
      handle: "%7",
      paneId: "%7",
      pid: process.pid,
    });

    // Both spellings (the pane id and the key itself) resolve to the one key.
    // A second re-minted identity would make these ambiguous and throw.
    expect(normalizeControlTarget("%7")).toBe(agent.key);
    expect(normalizeControlTarget(agent.key)).toBe(agent.key);
  });
});

/** A registry fixture: one harness, and the user-created space a spawn may be
 *  placed into. A7 — a space is user-created and optional, never minted from a
 *  path — so the row exists before any agent can be put in it. */
function registryFixture(space?: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-spawn-space-"));
  dirs.push(dir);
  ensureHarness(dir, "pi", "pi", 1);
  if (space !== undefined) {
    orm(dir).run(sql`INSERT INTO spaces (id, name, created_by, created_at) VALUES (${space}, ${space}, NULL, ${1})`);
  }
  return dir;
}

function spaceRows(dir: string, agentId: string): unknown[] {
  return orm(dir).all(sql`SELECT space_id, since, until FROM agent_spaces WHERE agent_id = ${agentId}`);
}

describe("A1: spawn registration records the space as an environment axis", () => {
  test("a spawn into a space writes agent_spaces, and the composer reads it back", () => {
    const dir = registryFixture("wsA");
    const key = mintAgentId();

    registerSpawnedAgent(dir, {
      key, harnessId: "pi", backendId: "herdr", pane: true, handle: "%42",
      cwd: "/repo", name: "worker-1", space: "wsA", model: "openai/gpt-5", spawner: null, now: 10,
    });

    // The space is its own open interval, not a column beside the plexer.
    expect(spaceRows(dir, key)).toEqual([{ space_id: "wsA", since: 10, until: null }]);
    // And it comes back through the ONE composed read, beside the plexer it is
    // independent of. Nothing parses either of them out of `key`.
    expect(agentView(dir, key)?.environment).toEqual({
      plexer: "herdr", handle: "%42", space: "wsA", worktree: null, branch: null,
    });
  });

  test("a spawn stating no space records NO ROW — a missing axis is a missing row", () => {
    const dir = registryFixture();
    const key = mintAgentId();

    registerSpawnedAgent(dir, {
      // States no plexer and no space: a capless agent is in no plexer, and that
      // is an ANSWER, not a gap for a second writer to close.
      key, harnessId: "pi", pane: false,
      cwd: "/repo", name: "detached-1", model: "openai/gpt-5", spawner: null, now: 10,
    });

    // Not a NULL column, not the invented place called "local": no row at all.
    expect(spaceRows(dir, key)).toEqual([]);
    expect(agentView(dir, key)?.environment).toEqual({
      plexer: null, handle: null, space: null, worktree: null, branch: null,
    });
  });

  test("moving an agent to another space closes the old interval and keeps its identity", () => {
    const dir = registryFixture("wsA");
    orm(dir).run(sql`INSERT INTO spaces (id, name, created_by, created_at) VALUES ('wsB', 'wsB', NULL, 1)`);
    const key = mintAgentId();

    registerSpawnedAgent(dir, {
      key, harnessId: "pi", backendId: "herdr", pane: true, handle: "%42",
      cwd: "/repo", name: "worker-1", space: "wsA", model: "openai/gpt-5", spawner: null, now: 10,
    });
    setSpace(dir, key, 20, "wsB");

    // The whole point of splitting the axis out of the key: the agent MOVED and
    // is still the same agent, with the move recorded as history.
    expect(spaceRows(dir, key)).toEqual([
      { space_id: "wsA", since: 10, until: 20 },
      { space_id: "wsB", since: 20, until: null },
    ]);
    expect(agentView(dir, key)?.id).toBe(key);
    expect(agentView(dir, key)?.environment.space).toBe("wsB");
  });
});
