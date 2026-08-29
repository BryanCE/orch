import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scopeFromFlags } from "../src/commands/queue.ts";
import { addTask, listTasks, history } from "../src/queue.ts";
import { closeAllStores, openStore } from "../src/store/connection.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const dirs: string[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-queue-cli-"));
  dirs.push(dir);
  const db = openStore(dir);
  db.query("INSERT INTO harnesses(id,name) VALUES ('pi','Pi')").run();
  for (const [id, root, parent, name] of [
    ["orch-a", "orch-a", null, "alpha"],
    ["a1", "orch-a", "orch-a", "worker"],
    ["orch-b", "orch-b", null, "beta"],
    ["b1", "orch-b", "orch-b", "worker"],
  ] as const) {
    db.query("INSERT INTO agents(id,spawned_by,root_agent_id,harness_id,cwd,name,created_at) VALUES (?,?,?,?,?,?,1)")
      .run(id, parent, root, "pi", "/repo", name);
  }
  db.query("INSERT INTO spaces(id,name,created_by,created_at) VALUES ('space-1','One','orch-a',1)").run();
  return dir;
}

describe("Cq2: all three scopes are choosable at enqueue", () => {
  test("--agent, --pack and --space each select exactly one typed scope", () => {
    const dir = fixture();
    expect(scopeFromFlags(dir, { agent: "a1" })).toEqual({ agentId: "a1" });
    // A pack is named by its root agent, so naming any member names the pack.
    expect(scopeFromFlags(dir, { pack: "a1" })).toEqual({ packId: "orch-a" });
    expect(scopeFromFlags(dir, { pack: "orch-b" })).toEqual({ packId: "orch-b" });
    expect(scopeFromFlags(dir, { space: "space-1" })).toEqual({ spaceId: "space-1" });
    // No flag is the enqueuer's own pack, which the facade fills in.
    expect(scopeFromFlags(dir, {})).toEqual({});
  });

  test("a name resolves to one id, and an ambiguous name asks for the id", () => {
    const dir = fixture();
    expect(scopeFromFlags(dir, { agent: "alpha" })).toEqual({ agentId: "orch-a" });
    expect(() => scopeFromFlags(dir, { agent: "worker" })).toThrow(/Ambiguous agent/);
    expect(() => scopeFromFlags(dir, { agent: "nobody" })).toThrow(/Unknown agent/);
  });

  test("two scope flags at once are refused", () => {
    const dir = fixture();
    expect(() => scopeFromFlags(dir, { agent: "a1", pack: "orch-a" })).toThrow(/exactly one/);
    expect(() => scopeFromFlags(dir, { pack: "orch-a", space: "space-1" })).toThrow(/exactly one/);
  });
});

describe("Cq9: reading the queue is open", () => {
  test("listing and history carry no caller and hide no other pack's work", () => {
    const dir = fixture();
    const mine = addTask(dir, "mine", {}, "orch-a");
    const theirs = addTask(dir, "theirs", {}, "orch-b");
    expect(listTasks(dir).map((task) => task.id).sort()).toEqual([mine.id, theirs.id].sort());
    expect(history(dir)).toEqual([]);
  });
});
