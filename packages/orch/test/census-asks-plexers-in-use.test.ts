import { afterEach, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { buildEntities } from "../src/entities/inventory.ts";
import { ensureHarness, ensurePlexer, insertAgent } from "../src/store/agent-rows.ts";
import { orm } from "../src/store/connection.ts";
import { setHandle } from "../src/store/interval-rows.ts";
import type { BackendTarget, PlacementInventoryRole } from "../src/types/backend.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { OrchSettings } from "../src/types/settings.ts";
import { FakePanedBackend, withRegisteredBackend } from "./helpers/backend.ts";
import { testServices } from "./helpers/services.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

/**
 * An enabled plexer that is not the default and holds no live agent has nothing
 * to answer for. Asking it anyway cost a failed `tmux list-panes` on every fleet
 * read for a human who never runs tmux.
 */

const SETTINGS = {
  enabled: { adapters: ["pi"], backends: ["headless", "tmux"] },
  defaults: { adapter: "pi", backend: "headless" },
};

const dirs: OrchDir[] = [];
const oldDir = process.env.ORCH_DIR;

afterEach(() => {
  if (oldDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = oldDir;
  while (dirs.length) removeTempDir(dirs.pop()!);
});

/** A plexer that counts each time orch asks it for its panes. */
class CountedPlexer extends FakePanedBackend {
  asked = 0;
  override readonly placementInventory: PlacementInventoryRole = {
    current: () => null,
    list: (): readonly BackendTarget[] => { this.asked += 1; return []; },
    coordinateOf: () => null,
  };
}

function fixture(): { dir: OrchDir; settings: OrchSettings } {
  const dir = tempOrchDir("orch-census-in-use-");
  dirs.push(dir);
  process.env.ORCH_DIR = dir;
  writeSettingsFixture(dir, SETTINGS);
  orm(dir);
  return { dir, settings: testServices({ orchDir: dir, settings: SETTINGS }).settings.current() };
}

function seedAgentInTmux(dir: OrchDir, id: string): void {
  ensureHarness(dir, "pi", "pi", 1);
  ensurePlexer(dir, "tmux", "tmux");
  insertAgent(dir, { id, harnessId: "pi", cwd: "/work", name: id, createdAt: 1 });
  orm(dir).run(sql`INSERT INTO agent_plexers (agent_id, plexer_id) VALUES (${id}, ${"tmux"})`);
  setHandle(dir, id, 10, "%1");
}

function askedOnRead(dir: OrchDir, settings: OrchSettings): number {
  const tmux = new CountedPlexer({ id: "tmux" });
  withRegisteredBackend(new FakePanedBackend({ id: "headless" }), () =>
    withRegisteredBackend(tmux, () => buildEntities(dir, settings)));
  return tmux.asked;
}

describe("the census asks only the plexers in use", () => {
  test("an enabled plexer that is not the default and holds no agent is never asked", () => {
    const { dir, settings } = fixture();
    expect(askedOnRead(dir, settings)).toBe(0);
  });

  test("a plexer a live agent sits in is asked for its panes", () => {
    const { dir, settings } = fixture();
    seedAgentInTmux(dir, "tmuxagent1");
    expect(askedOnRead(dir, settings)).toBe(1);
  });
});
