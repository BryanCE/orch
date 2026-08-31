import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { insertAgent, renameAgent, setWorktree } from "../src/store/agent-rows.ts";
import { setAgentPlexer, setHandle, setSpace, setTuning } from "../src/store/interval-rows.ts";
import { acquireLease, releaseLease } from "../src/store/lease-rows.ts";
import { ENVIRONMENT_AXES, agentView, agentViews, environmentOf, liveAgentViews } from "../src/store/agent-view.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { sql } from "drizzle-orm";

/**
 * Environment is a composition, never a table — and adding an axis that can
 * change is one table plus one line in the composer, zero consumer changes.
 */

function store(): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-agent-view-"));
  const db = orm(directory);
  db.run(sql`INSERT INTO harnesses (id, name) VALUES ('pi', 'pi') ON CONFLICT DO NOTHING`);
  db.run(sql`INSERT INTO plexers (id, name) VALUES ('herdr', 'herdr') ON CONFLICT DO NOTHING`);
  db.run(sql`INSERT INTO spaces (id, name, created_at) VALUES ('s1', 'server', 1) ON CONFLICT DO NOTHING`);
  return directory;
}

function withStore(body: (directory: string) => void): void {
  const directory = store();
  try {
    body(directory);
  } finally {
    closeAllStores();
    removeTempDir(directory);
  }
}

describe("the agent composer", () => {
  test("an agent with no environment rows has every axis absent, not defaulted", () => {
    withStore((directory) => {
      insertAgent(directory, { id: "a1", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "solo", createdAt: 10 });
      // A capless agent is one with no shortcut, never one orch cannot talk to:
      // absence is the answer, and "local" is not a place (Rule 11).
      expect(environmentOf(directory, "a1")).toEqual({
        plexer: null, handle: null, space: null, worktree: null, branch: null,
      });
    });
  });

  test("each axis composes independently, and moving one leaves identity untouched", () => {
    withStore((directory) => {
      insertAgent(directory, { id: "a1", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "worker", createdAt: 10 });
      setAgentPlexer(directory, "a1", "herdr");
      setHandle(directory, "a1", 20, "w1:p1");
      setSpace(directory, "a1", 20, "s1");
      setWorktree(directory, "a1", "/repo/.wt/a1", "feat/a1");

      expect(environmentOf(directory, "a1")).toEqual({
        plexer: "herdr", handle: "w1:p1", space: "s1", worktree: "/repo/.wt/a1", branch: "feat/a1",
      });

      // The pane moved. The agent did not become a different agent — which is
      // precisely what the old `spawned` table could not express, because its
      // primary key WAS the pane.
      setHandle(directory, "a1", 30, "w2:p9");
      const moved = agentView(directory, "a1");
      expect(moved?.id).toBe("a1");
      expect(moved?.environment.handle).toBe("w2:p9");
      expect(moved?.environment.space).toBe("s1");
    });
  });

  test("tuning is not environment: it survives a move", () => {
    withStore((directory) => {
      insertAgent(directory, { id: "a1", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "worker", createdAt: 10 });
      setTuning(directory, "a1", 20, { model: "openai-codex/gpt-5.6-luna", thinking: "high" });
      setHandle(directory, "a1", 20, "w1:p1");
      setHandle(directory, "a1", 30, "w2:p9");
      expect(agentView(directory, "a1")?.tuning).toEqual({ model: "openai-codex/gpt-5.6-luna", thinking: "high" });
    });
  });

  test("ownership reads as a live lease, and a released one is not ownership", () => {
    withStore((directory) => {
      insertAgent(directory, { id: "orch", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "orch", createdAt: 1 });
      insertAgent(directory, { id: "a1", spawnedBy: "orch", harnessId: "pi", cwd: "/repo", name: "worker", createdAt: 10 });
      acquireLease(directory, "a1", "orch", 50);
      expect(agentView(directory, "a1")?.heldBy).toEqual({ orchId: "orch", since: 50 });

      releaseLease(directory, "a1", "orch", 60);
      // Losing a holder costs a driver, never a life: the agent is still here.
      const detached = agentView(directory, "a1");
      expect(detached?.heldBy).toBeNull();
      expect(detached?.endedAt).toBeNull();
    });
  });

  test("provenance is on the view and is not the same fact as ownership", () => {
    withStore((directory) => {
      insertAgent(directory, { id: "orch", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "orch", createdAt: 1 });
      insertAgent(directory, { id: "a1", spawnedBy: "orch", harnessId: "pi", cwd: "/repo", name: "worker", createdAt: 10 });
      const view = agentView(directory, "a1");
      expect(view?.spawnedBy).toBe("orch");
      expect(view?.heldBy).toBeNull();
    });
  });

  test("provenance carries the spawner's name, read as a join and never stored twice", () => {
    withStore((directory) => {
      insertAgent(directory, { id: "orch", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "release-orch", createdAt: 1 });
      insertAgent(directory, { id: "a1", spawnedBy: "orch", harnessId: "pi", cwd: "/repo", name: "worker", createdAt: 10 });

      const view = agentView(directory, "a1");
      expect(view?.spawnedBy).toBe("orch");
      expect(view?.spawnedByName).toBe("release-orch");

      // Renaming the spawner changes what its children report, because the name
      // is READ from the spawner's row rather than copied onto each child. A
      // stored copy would still say "release-orch" here, which is exactly the
      // denormalization A1 forbids.
      renameAgent(directory, "orch", "hotfix-orch");
      expect(agentView(directory, "a1")?.spawnedByName).toBe("hotfix-orch");
    });
  });

  test("an agent with no spawner reports no spawner name", () => {
    withStore((directory) => {
      insertAgent(directory, { id: "root", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "root", createdAt: 1 });
      const view = agentView(directory, "root");
      expect(view?.spawnedBy).toBeNull();
      expect(view?.spawnedByName).toBeNull();
    });
  });

  test("agentViews is oldest-first and liveAgentViews drops ended agents", () => {
    withStore((directory) => {
      insertAgent(directory, { id: "a1", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "first", createdAt: 10 });
      insertAgent(directory, { id: "a2", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "second", createdAt: 20 });
      orm(directory).run(sql`INSERT INTO agent_endings (agent_id, ended_at, closed_by) VALUES ('a1', 99, NULL)`);
      expect(agentViews(directory).map((view) => view.id)).toEqual(["a1", "a2"]);
      expect(liveAgentViews(directory).map((view) => view.id)).toEqual(["a2"]);
    });
  });

  /**
   * A15 — "Adding an axis that can change is one table plus ONE LINE in the
   * composer, zero consumer changes."
   *
   * The line is the {@link ENVIRONMENT_AXES} entry. If any second construct in
   * the composer also names every axis — a hand-written `AgentEnvironment`
   * interface, or the seeded object literal `environmentOf` folds into — then
   * adding an axis costs two edits and a forgotten one silently composes as
   * absent. The shape must be DERIVED from the axis list, so that the list is
   * the only place the set of axes is written down.
   */
  test("the axis list is the only place every axis is enumerated", () => {
    const source = readFileSync(new URL("../src/store/agent-view.ts", import.meta.url), "utf8");
    const withoutAxisList = source.replace(/export const ENVIRONMENT_AXES[\s\S]*?\n\][^\n]*;\n/, "");
    const alsoEnumerated = ENVIRONMENT_AXES.filter(
      (axis) => new RegExp(`\\b${axis.key}\\b`).test(withoutAxisList),
    ).map((axis) => axis.key);
    // A single reader naming its own axis is fine; naming them ALL is the
    // second enumeration A15 forbids.
    expect(alsoEnumerated).not.toEqual(ENVIRONMENT_AXES.map((axis) => axis.key));
  });

  test("the composed shape is exactly the axis list, with nothing extra and nothing missing", () => {
    withStore((directory) => {
      insertAgent(directory, { id: "a1", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "solo", createdAt: 10 });
      expect(Object.keys(environmentOf(directory, "a1")).sort())
        .toEqual(ENVIRONMENT_AXES.map((axis) => axis.key).sort());
    });
  });

  test("an unknown agent is null, never an empty shell", () => {
    withStore((directory) => expect(agentView(directory, "nobody")).toBeNull());
  });
});
