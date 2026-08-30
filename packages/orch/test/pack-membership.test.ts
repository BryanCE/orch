import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { getOrCreateSessionAgent, insertAgent, packMembers } from "../src/store/agent-rows.ts";
import { acquireLease } from "../src/store/lease-rows.ts";
import { setSpace } from "../src/store/interval-rows.ts";
import { agentView, agentViews } from "../src/store/agent-view.ts";
import { roleOf } from "../src/policy/vocabulary.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { seedSpace } from "./helpers/space.ts";
import { sql } from "drizzle-orm";

/**
 * TASKS/02-scope.md A10 — "A pack starts at ONE member — a registered session is
 * an orch of a pack of one. Membership is the PROVENANCE ROOT, so every agent is
 * in exactly one pack at any depth."
 */

function withStore(body: (directory: string) => void): void {
  const directory = mkdtempSync(join(tmpdir(), "orch-pack-"));
  const db = orm(directory);
  db.run(sql`INSERT INTO harnesses (id, name) VALUES ('pi', 'pi') ON CONFLICT DO NOTHING`);
  db.run(sql`INSERT INTO harnesses (id, name) VALUES ('claude', 'claude') ON CONFLICT DO NOTHING`);
  try {
    body(directory);
  } finally {
    closeAllStores();
    removeTempDir(directory);
  }
}

/** `id` spawned by `spawnedBy`; the root is never passed in, only derived. */
function spawn(directory: string, id: string, spawnedBy: string | null, at: number): void {
  insertAgent(directory, { id, spawnedBy, harnessId: "pi", cwd: "/repo", name: id, createdAt: at });
}

describe("a pack is the provenance root", () => {
  test("a registered session is an orch of a pack of one", () => {
    withStore((directory) => {
      const session = getOrCreateSessionAgent(directory, {
        pid: 4242, startToken: "tok", sessionToken: "sess-1", harnessId: "claude",
        cwd: "/w", label: "claude session", hostId: "h", hostName: "h", hostOs: "linux", now: 1,
      });

      // Rule 11: an orch IS an agent. A session that has registered is the root
      // of its own pack before it has spawned anything at all — a pack of one,
      // not a pack of zero waiting to become real.
      const view = agentView(directory, session.id)!;
      expect(view.rootAgentId).toBe(session.id);
      expect(view.spawnedBy).toBeNull();
      expect(roleOf(view)).toBe("orch");
      expect(packMembers(directory, session.id).map((member) => member.id)).toEqual([session.id]);
    });
  });

  test("membership is inherited from the spawner at any depth, never re-rooted", () => {
    withStore((directory) => {
      spawn(directory, "root", null, 1);
      spawn(directory, "child", "root", 2);
      spawn(directory, "grandchild", "child", 3);
      spawn(directory, "great", "grandchild", 4);

      // A9 caps SPAWNING at depth 2; the model itself stays recursive, so the
      // pack must still answer correctly however deep a tree actually is.
      for (const id of ["root", "child", "grandchild", "great"]) {
        expect(agentView(directory, id)?.rootAgentId).toBe("root");
      }
      expect(packMembers(directory, "root").map((member) => member.id).sort())
        .toEqual(["child", "grandchild", "great", "root"]);
      expect(roleOf(agentView(directory, "root")!)).toBe("orch");
      expect(roleOf(agentView(directory, "grandchild")!)).toBe("slave");
    });
  });

  test("every agent is in exactly one pack, and two packs never share a member", () => {
    withStore((directory) => {
      spawn(directory, "orchA", null, 1);
      spawn(directory, "orchB", null, 2);
      spawn(directory, "a1", "orchA", 3);
      spawn(directory, "b1", "orchB", 4);
      spawn(directory, "b2", "b1", 5);

      const packA = new Set(packMembers(directory, "orchA").map((member) => member.id));
      const packB = new Set(packMembers(directory, "orchB").map((member) => member.id));
      expect([...packA].sort()).toEqual(["a1", "orchA"]);
      expect([...packB].sort()).toEqual(["b1", "b2", "orchB"]);

      // Exactly one: every agent that exists is in some pack, and in no two.
      const everyone = agentViews(directory).map((view) => view.id);
      for (const id of everyone) {
        const packs = everyone.filter((root) => packMembers(directory, root).some((m) => m.id === id));
        expect(packs.map((root) => agentView(directory, root)!.rootAgentId)).toEqual([
          agentView(directory, id)!.rootAgentId,
        ]);
      }
      expect(packA.size + packB.size).toBe(everyone.length);
    });
  });

  test("a pack of one grows without re-rooting, and the root stays the orch", () => {
    withStore((directory) => {
      spawn(directory, "solo", null, 1);
      expect(packMembers(directory, "solo").map((member) => member.id)).toEqual(["solo"]);

      spawn(directory, "hired", "solo", 2);
      expect(packMembers(directory, "solo").map((member) => member.id).sort()).toEqual(["hired", "solo"]);
      expect(agentView(directory, "solo")?.rootAgentId).toBe("solo");
      expect(roleOf(agentView(directory, "solo")!)).toBe("orch");
    });
  });

  test("a lease or a move never changes which pack an agent is in", () => {
    withStore((directory) => {
      seedSpace(directory, "server");
      spawn(directory, "orchA", null, 1);
      spawn(directory, "orchB", null, 2);
      spawn(directory, "worker", "orchA", 3);

      // Ownership is a lease and environment is mutable; provenance is neither.
      // A worker adopted by another orch is still a member of the pack that
      // spawned it — that is what makes membership survive a handoff.
      acquireLease(directory, "worker", "orchB", 10);
      setSpace(directory, "worker", 11, "server");

      expect(agentView(directory, "worker")?.rootAgentId).toBe("orchA");
      expect(agentView(directory, "worker")?.heldBy?.orchId).toBe("orchB");
      expect(packMembers(directory, "orchA").map((member) => member.id).sort()).toEqual(["orchA", "worker"]);
      expect(packMembers(directory, "orchB").map((member) => member.id)).toEqual(["orchB"]);
    });
  });

  test("an agent cannot be spawned by someone who does not exist", () => {
    withStore((directory) => {
      // A pack is a tree. A dangling spawner would be a second root hiding
      // inside one, and the row would belong to no pack at all.
      expect(() => spawn(directory, "orphan", "nobody", 1)).toThrow(/unknown spawner/);
    });
  });
});
