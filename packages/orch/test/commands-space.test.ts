import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { cmdSpace, runSpace } from "../src/commands/space.ts";
import { helpTopic } from "../src/commands/help.ts";
import { orm } from "../src/store/connection.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { isRecord } from "../src/util.ts";
import type { CreateHomeRequest, CreatedHome, PlexerHome, SpaceHomeRole } from "../src/types/backend.ts";
import type { SpaceEnvironment } from "../src/types/command.ts";
import { sql } from "drizzle-orm";

import { row } from "./helpers/rows.ts";
const originalDir = process.env.ORCH_DIR;
const originalWrite = process.stdout.write.bind(process.stdout);
const dirs: string[] = [];

afterEach(() => {
  process.stdout.write = originalWrite;
  if (originalDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalDir;
  while (dirs.length) removeTempDir(dirs.pop()!);
});

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-space-command-"));
  dirs.push(dir);
  return dir;
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
      return { coordinate, rootHandle: `${coordinate}:p1` };
    },
    rename: (coordinate: string, label: string): void => { homes.set(coordinate, label); calls.push({ method: "rename", args: [coordinate, label] }); },
    close: (coordinate: string): void => { homes.delete(coordinate); calls.push({ method: "close", args: [coordinate] }); },
    focus: (coordinate: string): void => { calls.push({ method: "focus", args: [coordinate] }); },
  };
}

function capture(action: () => void): string {
  let output = "";
  process.stdout.write = (chunk: string | Uint8Array) => { output += chunk.toString(); return true; };
  try { action(); } finally { process.stdout.write = originalWrite; }
  return output;
}

function json(output: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(output);
  if (!isRecord(parsed)) throw new Error(`expected a JSON object, got ${output}`);
  return parsed;
}

function homeless(directory: string): SpaceEnvironment {
  return { directory, plexerId: "headless", spaceHome: null, actorId: null };
}

function homed(directory: string, calls: HomeCall[]): SpaceEnvironment {
  return { directory, plexerId: "herdr", spaceHome: fakeSpaceHome(calls), actorId: null };
}

function liveHome(directory: string, spaceId: string): { plexer_id: string; handle: string } | null {
  const found = row(orm(directory), sql`SELECT plexer_id, handle FROM space_plexers WHERE space_id = ${spaceId} AND until IS NULL`);
  if (!isRecord(found) || typeof found.plexer_id !== "string" || typeof found.handle !== "string") return null;
  return { plexer_id: found.plexer_id, handle: found.handle };
}

function spaceIdOf(directory: string, name: string): string {
  const found = row(orm(directory), sql`SELECT id FROM spaces WHERE name = ${name}`);
  if (!isRecord(found) || typeof found.id !== "string") throw new Error(`no space named ${name}`);
  return found.id;
}

describe("orch space — orch's own grouping", () => {
  test("a space is created, listed, renamed and deleted with no space-home role", () => {
    const dir = tempDir();
    capture(() => runSpace(homeless(dir), ["create", "Release"]));
    expect(json(capture(() => runSpace(homeless(dir), ["list", "--json"])))).toMatchObject({
      spaces: [{ name: "Release", home: false }],
    });
    capture(() => runSpace(homeless(dir), ["rename", "Release", "Ship"]));
    expect(json(capture(() => runSpace(homeless(dir), ["list", "--json"])))).toMatchObject({ spaces: [{ name: "Ship" }] });
    capture(() => runSpace(homeless(dir), ["delete", "Ship"]));
    expect(json(capture(() => runSpace(homeless(dir), ["list", "--json"])))).toMatchObject({ spaces: [] });
  });

  test("create refuses a name already in use", () => {
    const dir = tempDir();
    capture(() => runSpace(homeless(dir), ["create", "Release"]));
    expect(() => capture(() => runSpace(homeless(dir), ["create", "Release"]))).toThrow(/Release/);
  });

  test("delete refuses a space that still holds agents", () => {
    const dir = tempDir();
    capture(() => runSpace(homeless(dir), ["create", "Release"]));
    const id = spaceIdOf(dir, "Release");
    const db = orm(dir);
    db.run(sql`INSERT INTO harnesses (id,name,enabled_at) VALUES ('pi','pi',NULL)`);
    db.run(sql`INSERT INTO agents (id,spawned_by,root_agent_id,harness_id,cwd,name,label,created_at) VALUES ('a',NULL,'a','pi','/','a',NULL,0)`);
    db.run(sql`INSERT INTO agent_spaces (agent_id, since, until, space_id) VALUES ('a', 1, NULL, ${id})`);
    expect(() => capture(() => runSpace(homeless(dir), ["delete", "Release"]))).toThrow(/not empty|still/i);
  });
});

describe("orch space — the plexer's home", () => {
  test("create makes a home and records only its coordinate", () => {
    const dir = tempDir();
    const calls: HomeCall[] = [];
    const output = capture(() => runSpace(homed(dir, calls), ["create", "Release", "--json"]));
    // E8: "allowable, but never unmarked". orch marks every home it opens so a
    // fleet is visibly separate from the human's own panes; a home labelled with
    // a bare name is indistinguishable from one a person made.
    expect(calls).toMatchObject([{ method: "create", args: ["space", expect.any(String), "orch/Release"] }]);
    const id = spaceIdOf(dir, "Release");
    expect(liveHome(dir, id)).toEqual({ plexer_id: "herdr", handle: "hc-1" });
    expect(output).not.toContain("hc-1");
  });

  test("list reports that a space has a home without naming the coordinate", () => {
    const dir = tempDir();
    const calls: HomeCall[] = [];
    capture(() => runSpace(homed(dir, calls), ["create", "Release"]));
    const output = capture(() => runSpace(homed(dir, calls), ["list", "--json"]));
    expect(json(output)).toMatchObject({ spaces: [{ name: "Release", home: true }] });
    expect(output).not.toContain("hc-1");
  });

  test("rename renames orch's space and its home", () => {
    const dir = tempDir();
    const calls: HomeCall[] = [];
    capture(() => runSpace(homed(dir, calls), ["create", "Release"]));
    capture(() => runSpace(homed(dir, calls), ["rename", "Release", "Ship"]));
    expect(calls.at(-1)).toEqual({ method: "rename", args: ["hc-1", "orch/Ship"] });
    expect(spaceIdOf(dir, "Ship")).toBeString();
  });

  test("delete closes the home and drops its coordinate", () => {
    const dir = tempDir();
    const calls: HomeCall[] = [];
    capture(() => runSpace(homed(dir, calls), ["create", "Release"]));
    const id = spaceIdOf(dir, "Release");
    capture(() => runSpace(homed(dir, calls), ["delete", "Release"]));
    expect(calls.at(-1)).toEqual({ method: "close", args: ["hc-1"] });
    expect(liveHome(dir, id)).toBeNull();
  });

  test("focus focuses the recorded coordinate", () => {
    const dir = tempDir();
    const calls: HomeCall[] = [];
    capture(() => runSpace(homed(dir, calls), ["create", "Release"]));
    capture(() => runSpace(homed(dir, calls), ["focus", "Release"]));
    expect(calls.at(-1)).toEqual({ method: "focus", args: ["hc-1"] });
  });

  test("a home made in another plexer is not this environment's to focus", () => {
    const dir = tempDir();
    capture(() => runSpace(homed(dir, []), ["create", "Release"]));
    const answer = json(capture(() => runSpace({ directory: dir, plexerId: "tmux", spaceHome: fakeSpaceHome([]), actorId: null }, ["focus", "Release", "--json"])));
    expect(answer).toMatchObject({ outcome: "answer", reason: "no-environment-role" });
  });
});

describe("orch space — absence is an answer", () => {
  test("focus with no space-home role names the space and what is missing", () => {
    const dir = tempDir();
    capture(() => runSpace(homeless(dir), ["create", "Release"]));
    // E14: an absence is an ANSWER, so it RETURNS - it does not throw, and
    // `cmdSpace` is the only thing that turns a throw into a non-zero exit.
    // Asserted on the call, not on `process.exitCode`: that is process-global
    // state and bun shares the process across test files, so any other suite
    // running a command that sets one races this assertion.
    let answer: Record<string, unknown> = {};
    expect(() => { answer = json(capture(() => runSpace(homeless(dir), ["focus", "Release", "--json"]))); }).not.toThrow();
    expect(answer).toMatchObject({ outcome: "answer", reason: "no-environment-role" });
    expect(String(answer.text)).toContain("Release");
    expect(String(answer.text)).toContain("focus");
  });

  test("the plain-text answer names the space too", () => {
    const dir = tempDir();
    capture(() => runSpace(homeless(dir), ["create", "Release"]));
    expect(capture(() => runSpace(homeless(dir), ["focus", "Release"]))).toContain("Release");
  });
});

describe("orch space — vocabulary and wiring", () => {
  test("cmdSpace lists through the resolved environment", () => {
    const dir = tempDir();
    process.env.ORCH_DIR = dir;
    writeSettingsFixture(dir, { defaults: { adapter: "pi", backend: "headless" } });
    expect(json(capture(() => cmdSpace(["list", "--json"])))).toMatchObject({ spaces: [] });
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

  test("no space output ever says workspace", () => {
    const dir = tempDir();
    const calls: HomeCall[] = [];
    const created = capture(() => runSpace(homed(dir, calls), ["create", "Release", "--json"]));
    const listed = capture(() => runSpace(homeless(dir), ["list", "--json"]));
    const answered = capture(() => runSpace(homeless(dir), ["focus", "Release", "--json"]));
    expect((created + listed + answered).toLowerCase()).not.toContain("workspace");
  });
});
