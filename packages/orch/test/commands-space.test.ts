import type { OrchDir } from "../src/types/core.ts";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cmdSpace, runSpace } from "../src/commands/space.ts";
import { helpTopic } from "../src/commands/index.ts";
import { orm } from "../src/store/connection.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { errorMessage, isRecord } from "../src/util.ts";
import type { CreateHomeRequest, CreatedHome, PlexerHome, SpaceHomeRole } from "../src/types/backend.ts";
import type { SpaceEnvironment } from "../src/types/command.ts";
import type { RpcServer } from "../src/types/daemon.ts";
import type { Services } from "../src/types/services.ts";
import { sql } from "drizzle-orm";

import { row } from "./helpers/rows.ts";
import { servedServices } from "./helpers/daemon-state.ts";
import { isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";
import { captureStdout } from "./helpers/stdout.ts";
const dirs: OrchDir[] = [];
const servers: RpcServer[] = [];
const SETTINGS = { defaults: { adapter: "pi", backend: "headless" } };

beforeEach(() => isolateOrchEnv());
afterEach(async () => {
  while (servers.length) await servers.pop()!.close();
  while (dirs.length) removeTempDir(dirs.pop()!);
  restoreOrchEnv();
});

/** A fresh store with the real orchd handler table served on its socket. */
async function served(): Promise<Services> {
  const dir = tempOrchDir("orch-space-command-");
  dirs.push(dir);
  process.env.ORCH_DIR = dir;
  return servedServices({ orchDir: dir, settings: SETTINGS }, servers);
}

interface HomeCall { readonly method: string; readonly args: readonly string[] }

function fakeSpaceHome(calls: HomeCall[]): SpaceHomeRole {
  const homes = new Map<string, string | null>();
  let next = 0;
  return {
    list: (): readonly PlexerHome[] => [...homes].map(([coordinate, label]) => ({ coordinate, label })),
    create: (subject: { kind: "space" | "pack"; id: string }, request: CreateHomeRequest): CreatedHome => {
      next += 1;
      const coordinate = `hc-${next}`;
      homes.set(coordinate, request.label ?? null);
      calls.push({ method: "create", args: [subject.kind, subject.id, request.label ?? ""] });
      return { coordinate, rootGroup: `${coordinate}:t1`, rootHandle: `${coordinate}:p1` };
    },
    rename: (coordinate: string, label: string): void => { homes.set(coordinate, label); calls.push({ method: "rename", args: [coordinate, label] }); },
    close: (coordinate: string): void => { homes.delete(coordinate); calls.push({ method: "close", args: [coordinate] }); },
    focus: (coordinate: string): void => { calls.push({ method: "focus", args: [coordinate] }); },
  };
}

function space(env: SpaceEnvironment, args: string[]): Promise<string> {
  return captureStdout(() => runSpace(env, args));
}

/** The refusal text a run throws, or null when it does not throw. */
function refusal(env: SpaceEnvironment, args: string[]): Promise<string | null> {
  return space(env, args).then(() => null, (error: unknown) => errorMessage(error));
}

function json(output: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(output);
  if (!isRecord(parsed)) throw new Error(`expected a JSON object, got ${output}`);
  return parsed;
}

function homeless(services: Services): SpaceEnvironment {
  return { services, plexerId: "headless", spaceHome: null };
}

function homed(services: Services, calls: HomeCall[]): SpaceEnvironment {
  return { services, plexerId: "herdr", spaceHome: fakeSpaceHome(calls) };
}

function liveHome(directory: OrchDir, spaceId: string): { plexer_id: string; handle: string } | null {
  const found = row(orm(directory), sql`SELECT plexer_id, handle FROM space_plexers WHERE space_id = ${spaceId} AND until IS NULL`);
  if (!isRecord(found) || typeof found.plexer_id !== "string" || typeof found.handle !== "string") return null;
  return { plexer_id: found.plexer_id, handle: found.handle };
}

function spaceIdOf(directory: OrchDir, name: string): string {
  const found = row(orm(directory), sql`SELECT id FROM spaces WHERE name = ${name}`);
  if (!isRecord(found) || typeof found.id !== "string") throw new Error(`no space named ${name}`);
  return found.id;
}

describe("orch space — orch's own grouping", () => {
  test("a space is created, listed, renamed and deleted with no space-home role", async () => {
    const env = homeless(await served());
    await space(env, ["create", "Release"]);
    expect(json(await space(env, ["list", "--json"]))).toMatchObject({ spaces: [{ name: "Release", home: false }] });
    await space(env, ["rename", "Release", "Ship"]);
    expect(json(await space(env, ["list", "--json"]))).toMatchObject({ spaces: [{ name: "Ship" }] });
    await space(env, ["delete", "Ship"]);
    expect(json(await space(env, ["list", "--json"]))).toMatchObject({ spaces: [] });
  });

  test("create refuses a name already in use", async () => {
    const env = homeless(await served());
    await space(env, ["create", "Release"]);
    expect(await refusal(env, ["create", "Release"])).toMatch(/Release/);
  });

  test("delete refuses a space that still holds agents", async () => {
    const env = homeless(await served());
    const dir = env.services.orchDir;
    await space(env, ["create", "Release"]);
    const id = spaceIdOf(dir, "Release");
    const db = orm(dir);
    db.run(sql`INSERT INTO harnesses (id,name,enabled_at) VALUES ('pi','pi',NULL)`);
    db.run(sql`INSERT INTO agents (id,spawned_by,root_agent_id,harness_id,cwd,name,label,created_at) VALUES ('a',NULL,'a','pi','/','a',NULL,0)`);
    db.run(sql`INSERT INTO agent_spaces (agent_id, since, until, space_id) VALUES ('a', 1, NULL, ${id})`);
    expect(await refusal(env, ["delete", "Release"])).toMatch(/not empty|still/i);
  });
});

describe("orch space — the plexer's home", () => {
  test("create makes a home and records only its coordinate", async () => {
    const calls: HomeCall[] = [];
    const env = homed(await served(), calls);
    const output = await space(env, ["create", "Release", "--json"]);
    // E8: "allowable, but never unmarked". orch marks every home it opens so a
    // fleet is visibly separate from the human's own panes; a home labelled with
    // a bare name is indistinguishable from one a person made.
    expect(calls).toMatchObject([{ method: "create", args: ["space", expect.any(String), "orch/Release"] }]);
    const id = spaceIdOf(env.services.orchDir, "Release");
    expect(liveHome(env.services.orchDir, id)).toEqual({ plexer_id: "herdr", handle: "hc-1" });
    expect(output).not.toContain("hc-1");
  });

  test("list reports that a space has a home without naming the coordinate", async () => {
    const env = homed(await served(), []);
    await space(env, ["create", "Release"]);
    const output = await space(env, ["list", "--json"]);
    expect(json(output)).toMatchObject({ spaces: [{ name: "Release", home: true }] });
    expect(output).not.toContain("hc-1");
  });

  test("rename renames orch's space and its home", async () => {
    const calls: HomeCall[] = [];
    const env = homed(await served(), calls);
    await space(env, ["create", "Release"]);
    await space(env, ["rename", "Release", "Ship"]);
    expect(calls.at(-1)).toEqual({ method: "rename", args: ["hc-1", "orch/Ship"] });
    expect(spaceIdOf(env.services.orchDir, "Ship")).toBeString();
  });

  test("delete closes the home and drops its coordinate", async () => {
    const calls: HomeCall[] = [];
    const env = homed(await served(), calls);
    await space(env, ["create", "Release"]);
    const id = spaceIdOf(env.services.orchDir, "Release");
    await space(env, ["delete", "Release"]);
    expect(calls.at(-1)).toEqual({ method: "close", args: ["hc-1"] });
    expect(liveHome(env.services.orchDir, id)).toBeNull();
  });

  test("focus focuses the recorded coordinate", async () => {
    const calls: HomeCall[] = [];
    const env = homed(await served(), calls);
    await space(env, ["create", "Release"]);
    await space(env, ["focus", "Release"]);
    expect(calls.at(-1)).toEqual({ method: "focus", args: ["hc-1"] });
  });

  test("a home made in another plexer is not this environment's to focus", async () => {
    const services = await served();
    await space(homed(services, []), ["create", "Release"]);
    const answer = json(await space({ services, plexerId: "tmux", spaceHome: fakeSpaceHome([]) }, ["focus", "Release", "--json"]));
    expect(answer).toMatchObject({ outcome: "answer", reason: "no-environment-role" });
  });
});

describe("orch space — absence is an answer", () => {
  test("focus with no space-home role names the space and what is missing", async () => {
    const env = homeless(await served());
    await space(env, ["create", "Release"]);
    // E14: an absence is an ANSWER, so it RETURNS - it does not throw, and
    // `cmdSpace` is the only thing that turns a throw into a non-zero exit.
    expect(await refusal(env, ["focus", "Release", "--json"])).toBeNull();
    const answer = json(await space(env, ["focus", "Release", "--json"]));
    expect(answer).toMatchObject({ outcome: "answer", reason: "no-environment-role" });
    expect(String(answer.text)).toContain("Release");
    expect(String(answer.text)).toContain("focus");
  });

  test("the plain-text answer names the space too", async () => {
    const env = homeless(await served());
    await space(env, ["create", "Release"]);
    expect(await space(env, ["focus", "Release"])).toContain("Release");
  });
});

describe("orch space — vocabulary and wiring", () => {
  test("cmdSpace lists through the resolved environment", async () => {
    const services = await served();
    expect(json(await captureStdout(() => cmdSpace(services, ["list", "--json"])))).toMatchObject({ spaces: [] });
  });

  test("orch ws is gone", () => {
    expect(helpTopic("ws")).toBeNull();
  });

  test("space help never says workspace and offers create/rename/delete", () => {
    const topic = helpTopic("space");
    expect(topic).not.toBeNull();
    expect(topic!.toLowerCase()).not.toContain("workspace");
    expect(topic).toContain("orch space create");
    expect(topic).toContain("orch space rename");
    expect(topic).toContain("orch space delete");
  });

  test("no space output ever says workspace", async () => {
    const services = await served();
    const created = await space(homed(services, []), ["create", "Release", "--json"]);
    const listed = await space(homeless(services), ["list", "--json"]);
    const answered = await space(homeless(services), ["focus", "Release", "--json"]);
    expect((created + listed + answered).toLowerCase()).not.toContain("workspace");
  });
});
