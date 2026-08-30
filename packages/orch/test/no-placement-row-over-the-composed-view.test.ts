import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { mintAgentId } from "../src/backends/identity.ts";
import { checkWall, spaceOf } from "../src/policy/space.ts";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { placeAgent, seedAgent } from "./helpers/agent.ts";
import { seedSpace } from "./helpers/space.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

/**
 * TASKS/10-review-findings.md 2.1, final deletion — "Delete … `agent/registry.ts`".
 *
 * `placementOf` reassembled the composed {@link AgentView} back into a flat
 * `Placement` row: key, agentId, backend, space, handle, cwd, worktree, branch.
 * That is the wide row 2.1 exists to delete, wearing a lookup's hat. Every one
 * of its four callers read exactly ONE field off it, so the flattening bought
 * nothing and cost the property A15 is for: adding an environment axis is one
 * satellite plus one entry in `ENVIRONMENT_AXES` and NO consumer changes —
 * which is only true while consumers read `AgentView.environment` as a whole,
 * never a hand-copied projection of it that has to grow a field to keep up.
 */
const oldOrchDir = process.env.ORCH_DIR;
const dirs: string[] = [];

function tempOrchDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-no-placement-"));
  dirs.push(dir);
  process.env.ORCH_DIR = dir;
  orm(dir);
  return dir;
}

afterEach(() => {
  closeAllStores();
  while (dirs.length) removeTempDir(dirs.pop()!);
  if (oldOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = oldOrchDir;
});

describe("no Placement row is reassembled over the composed view (2.1)", () => {
  test("there is no second lookup module projecting the environment into a flat row", () => {
    // Asserted on the FILE, not through `import()`: a specifier for a module that
    // does not exist is a typecheck error, so the proof of a deletion cannot be
    // written as one without reintroducing the name it is proving gone.
    expect(fs.existsSync(path.join(import.meta.dir, "..", "src", "agent", "registry.ts"))).toBe(false);
  });

  test("the space wall reads the OPEN space interval, so a moved agent is walled by where it IS", () => {
    const dir = tempOrchDir();
    seedSpace(dir, "spaceOne");
    seedSpace(dir, "spaceTwo");
    const actor = mintAgentId();
    const target = mintAgentId();
    seedAgent(actor, { space: "spaceOne" }, dir);
    seedAgent(target, { space: "spaceOne" }, dir);
    expect(checkWall(dir, actor, target, { crossSpace: false }).allowed).toBe(true);

    // A MOVE is a new interval on the axis that owns it, never a re-registration.
    placeAgent(target, { space: "spaceTwo" }, dir);
    expect(spaceOf(dir, target)).toBe("spaceTwo");
    expect(checkWall(dir, actor, target, { crossSpace: false }).allowed).toBe(false);
  });

  test("a string that names no registered agent is in no space rather than an error", () => {
    const dir = tempOrchDir();
    expect(spaceOf(dir, "not-an-agent-key")).toBeNull();
    expect(spaceOf(dir, mintAgentId())).toBeNull();
  });
});
