import { afterEach, describe, expect, test } from "bun:test";
import { hostIdentity } from "../src/hosts/identity.ts";
import { agentHosts, agents, harnesses } from "../src/db/schema.ts";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { ensureHost } from "../src/store/agent-rows.ts";
import { laneOf, setLane } from "../src/store/lane-rows.ts";
import { lane } from "./helpers/lane.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";

const dirs: OrchDir[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });

function fixture(): OrchDir {
  const dir = tempOrchDir("orch-lane-");
  dirs.push(dir);
  const db = orm(dir);
  db.insert(harnesses).values({ id: "pi", name: "pi", enabledAt: null }).run();
  ensureHost(dir, hostIdentity(), 0);
  db.insert(agents).values({ id: "a", spawnedBy: null, rootAgentId: "a", harnessId: "pi", name: "a", label: null, kind: "session", createdAt: 0 }).run();
  db.insert(agentHosts).values({ agentId: "a", since: 0, until: null, hostId: hostIdentity().id, cwd: "/" }).run();
  return dir;
}

describe("agent lanes", () => {
  test("an agent with no row is in no lane", () => {
    expect(laneOf(fixture(), "a")).toBeNull();
  });

  test("reads the recorded lane", () => {
    const dir = fixture();
    setLane(dir, "a", 5, lane("hard"));
    expect(laneOf(dir, "a")).toBe(lane("hard"));
  });

  test("a lane is set once", () => {
    const dir = fixture();
    setLane(dir, "a", 5, lane("hard"));
    expect(() => setLane(dir, "a", 6, lane("easy"))).toThrow();
  });
});
