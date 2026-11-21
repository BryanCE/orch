import { afterEach, describe, expect, test } from "bun:test";
import { hostIdentity } from "../src/hosts/identity.ts";
import { agentHosts, agents, harnesses } from "../src/db/schema.ts";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { ensureHost } from "../src/store/agent-rows.ts";
import { readOnlyOf, setReadOnly } from "../src/store/read-only-rows.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";

const dirs: OrchDir[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });

function fixture(): OrchDir {
  const dir = tempOrchDir("orch-read-only-");
  dirs.push(dir);
  const db = orm(dir);
  db.insert(harnesses).values({ id: "pi", name: "pi", enabledAt: null }).run();
  ensureHost(dir, hostIdentity(), 0);
  db.insert(agents).values({ id: "a", spawnedBy: null, rootAgentId: "a", harnessId: "pi", name: "a", label: null, kind: "session", createdAt: 0 }).run();
  db.insert(agentHosts).values({ agentId: "a", since: 0, until: null, hostId: hostIdentity().id, cwd: "/" }).run();
  return dir;
}

describe("read-only agents", () => {
  test("an agent with no row", () => {
    expect(readOnlyOf(fixture(), "a")).toBeNull();
  });

  test("reads the recorded output directory", () => {
    const dir = fixture();
    setReadOnly(dir, "a", 5, { out: "/repo/out" });
    expect(readOnlyOf(dir, "a")).toEqual({ out: "/repo/out" });
  });

  test("records no output directory", () => {
    const dir = fixture();
    setReadOnly(dir, "a", 5, { out: null });
    expect(readOnlyOf(dir, "a")).toEqual({ out: null });
  });

  test("a read-only record is one-shot", () => {
    const dir = fixture();
    setReadOnly(dir, "a", 5, { out: "/repo/out" });
    expect(() => setReadOnly(dir, "a", 6, { out: "/repo/other" })).toThrow();
  });
});
