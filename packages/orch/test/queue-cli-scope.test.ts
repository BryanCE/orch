import type { OrchDir } from "../src/types/core.ts";
import type { Services } from "../src/types/services.ts";
import type { RpcServer } from "../src/types/daemon.ts";
import { afterEach, describe, expect, test } from "bun:test";

import { scopeFromFlags } from "../src/commands/queue.ts";
import { addTask, listTasks, history } from "../src/queue.ts";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { sql } from "drizzle-orm";
import { servedServices } from "./helpers/daemon-state.ts";
import { errorMessage } from "../src/util.ts";

const dirs: OrchDir[] = [];
const servers: RpcServer[] = [];

afterEach(async () => { while (servers.length) await servers.pop()!.close(); closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });

async function fixture(): Promise<Services> {
  const dir = tempOrchDir("orch-queue-cli-");
  dirs.push(dir);
  const db = orm(dir);
  db.run(sql`INSERT INTO harnesses(id,name) VALUES ('pi','Pi')`);
  for (const [id, root, parent, name] of [
    ["orch-a", "orch-a", null, "alpha"],
    ["a1", "orch-a", "orch-a", "worker"],
    ["orch-b", "orch-b", null, "beta"],
    ["b1", "orch-b", "orch-b", "worker"],
  ] as const) {
    db.run(sql`INSERT INTO agents(id,spawned_by,root_agent_id,harness_id,cwd,name,created_at) VALUES (${id},${parent},${root},${"pi"},${"/repo"},${name},1)`);
  }
  db.run(sql`INSERT INTO spaces(id,name,created_by,created_at) VALUES ('space-1','One','orch-a',1)`);
  return servedServices({ orchDir: dir, settings: { defaults: { adapter: "pi", backend: "headless" } } }, servers);
}

describe("Cq2: all three scopes are choosable at enqueue", () => {
  test("--agent, --pack and --space each select exactly one typed scope", async () => {
    const services = await fixture();
    expect(await scopeFromFlags(services, { agent: "a1" })).toEqual({ agentId: "a1" });
    // A pack is named by its root agent, so naming any member names the pack.
    expect(await scopeFromFlags(services, { pack: "a1" })).toEqual({ packId: "orch-a" });
    expect(await scopeFromFlags(services, { pack: "orch-b" })).toEqual({ packId: "orch-b" });
    expect(await scopeFromFlags(services, { space: "space-1" })).toEqual({ spaceId: "space-1" });
    // No flag is the enqueuer's own pack, which the facade fills in.
    expect(await scopeFromFlags(services, {})).toEqual({});
  });

  test("a name resolves to one id, and an ambiguous name asks for the id", async () => {
    const services = await fixture();
    expect(await scopeFromFlags(services, { agent: "alpha" })).toEqual({ agentId: "orch-a" });
    expect(await scopeFromFlags(services, { agent: "worker" }).then(() => null, (error: unknown) => errorMessage(error))).toMatch(/Ambiguous agent/);
    expect(await scopeFromFlags(services, { agent: "nobody" }).then(() => null, (error: unknown) => errorMessage(error))).toMatch(/Unknown agent/);
  });

  test("two scope flags at once are refused", async () => {
    const services = await fixture();
    expect(await scopeFromFlags(services, { agent: "a1", pack: "orch-a" }).then(() => null, (error: unknown) => errorMessage(error))).toMatch(/exactly one/);
    expect(await scopeFromFlags(services, { pack: "orch-a", space: "space-1" }).then(() => null, (error: unknown) => errorMessage(error))).toMatch(/exactly one/);
  });
});

describe("Cq9: reading the queue is open", () => {
  test("listing and history carry no caller and hide no other pack's work", async () => {
    const services = await fixture();
    const mine = addTask(services.orchDir, "mine", {}, "orch-a");
    const theirs = addTask(services.orchDir, "theirs", {}, "orch-b");
    expect(listTasks(services.orchDir).map((task) => task.id).sort()).toEqual([mine.id, theirs.id].sort());
    expect(history(services.orchDir)).toEqual([]);
  });
});
