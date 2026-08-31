import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadPresence, reapDeadPresenceDirs } from "../src/presence/store.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

/**
 * Presence directory names change; existing dirs are REAPED, not migrated.
 *
 * Rule 8: pre-publish there is exactly ONE current shape, and a record in an old
 * one is malformed — reap it or error, never accept two shapes at once. A
 * presence directory is named by the agent's minted id and nothing else (A1), so
 * a directory named `headless~local~worker` names no agent orch has: there is
 * nothing to key its four facts on, and inventing one would fork the agent.
 *
 * Rule 11's "Why" is this exact failure: seven stale presence dirs with no
 * nameable owner. A dir whose name orch cannot parse must never survive on the
 * strength of a live pid in the file it holds - that pid is the only reason
 * those seven lasted.
 */

const dirs: string[] = [];
afterEach(() => { while (dirs.length) removeTempDir(dirs.pop()!); });

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-presence-reap-"));
  dirs.push(dir);
  return dir;
}

/** Write a presence directory under whatever name is given, live or dead. */
function seedDir(root: string, name: string, pid: number): string {
  const dir = join(root, "agents", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key: name, pid, agent: "pi", state: "working" }));
  return dir;
}

describe("a presence dir in the old shape is reaped, never migrated (J4)", () => {
  test("a composite-named dir is not presence, even with a LIVE pid", () => {
    const root = fixture();
    seedDir(root, "headless~local~worker", process.pid);
    seedDir(root, "liveagent1", process.pid);

    const presence = loadPresence(root);

    // The live minted agent is presence. The composite-named one is not - it
    // names no agent, so there is nothing for it to be the presence OF.
    expect([...presence.keys()]).toEqual(["liveagent1"]);
  });

  test("the sweep REMOVES it rather than leaving it for a migration that never comes", () => {
    const root = fixture();
    const stale = seedDir(root, "headless~local~worker", process.pid);
    const live = seedDir(root, "liveagent1", process.pid);

    reapDeadPresenceDirs(root);

    expect(existsSync(stale)).toBe(false);
    // A live agent in the current shape is untouched: the sweep reaps what is
    // malformed and what is dead, never what is working.
    expect(existsSync(live)).toBe(true);
  });

  test("nothing renames, rewrites or re-keys the old directory", () => {
    const root = fixture();
    seedDir(root, "herdr~wF~p9", 999_999_99);

    reapDeadPresenceDirs(root);

    // Reaped, not migrated: no directory of any name is left behind carrying
    // what it held, and its contents are not re-filed under a minted id.
    expect(existsSync(join(root, "agents", "herdr~wF~p9"))).toBe(false);
    expect([...loadPresence(root).keys()]).toEqual([]);
  });

  test("a dead dir in the CURRENT shape is still reaped the ordinary way", () => {
    const root = fixture();
    const dead = seedDir(root, "deadagent1", 999_999_99);

    const result = reapDeadPresenceDirs(root);

    expect(existsSync(dead)).toBe(false);
    expect(result.removed.map((entry) => entry.key)).toEqual(["deadagent1"]);
  });
});
