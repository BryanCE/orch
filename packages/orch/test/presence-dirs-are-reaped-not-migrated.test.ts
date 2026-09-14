import type { OrchDir } from "../src/types/core.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

import { join } from "node:path";
import { loadPresence, reapExpiredPresenceDirs } from "../src/presence/store.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { ensurePresenceAgentDir } from "../src/presence/history.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { seedAgent, seedLiveProcess } from "./helpers/agent.ts";
import { seedStatus } from "./helpers/presence.ts";

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

const dirs: OrchDir[] = [];
afterEach(() => { while (dirs.length) removeTempDir(dirs.pop()!); });

function fixture(): OrchDir {
  const dir = tempOrchDir("orch-presence-reap-");
  dirs.push(dir);
  return dir;
}

/** Write a presence directory under whatever name is given. */
function seedDir(root: OrchDir, name: string): string {
  const dir = join(root, "agents", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key: name, agent: "pi", state: "working" }));
  return dir;
}

/** A presence directory for an agent orch registered, whose recorded process is this runner. */
function seedLiveDir(root: OrchDir, name: string): string {
  seedAgent(name, {}, root);
  seedLiveProcess(root, name);
  return seedDir(root, name);
}

describe("a presence dir in the old shape is reaped, never migrated (J4)", () => {
  test("a composite-named dir is not presence, whatever its file claims", () => {
    const root = fixture();
    seedDir(root, "headless~local~worker");
    seedLiveDir(root, "liveagent1");

    const presence = loadPresence(root);

    // The live minted agent is presence. The composite-named one is not - it
    // names no agent, so there is nothing for it to be the presence OF.
    expect([...presence.keys()]).toEqual(["liveagent1"]);
  });

  test("the sweep REMOVES it rather than leaving it for a migration that never comes", () => {
    const root = fixture();
    const stale = seedDir(root, "headless~local~worker");
    const live = seedLiveDir(root, "liveagent1");

    reapExpiredPresenceDirs(root, new Date());

    expect(existsSync(stale)).toBe(false);
    // A live agent in the current shape is untouched: the sweep reaps what is
    // malformed and what is dead, never what is working.
    expect(existsSync(live)).toBe(true);
  });

  test("nothing renames, rewrites or re-keys the old directory", () => {
    const root = fixture();
    seedDir(root, "herdr~wF~p9");

    reapExpiredPresenceDirs(root, new Date());

    // Reaped, not migrated: no directory of any name is left behind carrying
    // what it held, and its contents are not re-filed under a minted id.
    expect(existsSync(join(root, "agents", "herdr~wF~p9"))).toBe(false);
    expect([...loadPresence(root).keys()]).toEqual([]);
  });

  test("a dead dir in the CURRENT shape is still reaped the ordinary way", () => {
    const root = fixture();
    seedStatus(root, "deadagent1", { state: "done" });
    const dead = ensurePresenceAgentDir("deadagent1", root);
    if (dead === undefined) throw new Error("no history dir");

    const removed = reapExpiredPresenceDirs(root, new Date());

    expect(existsSync(dead)).toBe(false);
    expect(removed).toEqual(["deadagent1"]);
  });
});
