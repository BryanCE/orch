import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { agentIdBySessionToken, getOrCreateSessionAgent } from "../src/store/agent-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const dirs: string[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });
function store(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-actor-"));
  dirs.push(dir);
  orm(dir);
  return dir;
}

function register(dir: string, sessionToken: string | null, pid: number) {
  return getOrCreateSessionAgent(dir, {
    pid, startToken: `tok-${pid}`, sessionToken, harnessId: "claude", cwd: "/w",
    label: "claude session", hostId: "h", hostName: "h", hostOs: "linux", now: 1,
  });
}

describe("a driving session's write-actor is the agent orch registered for it", () => {
  test("the session token resolves to the id hello minted, so the actor equals its own lease holder", () => {
    const dir = store();
    const identity = register(dir, "session-abc", 4242);
    expect(agentIdBySessionToken(dir, "session-abc")).toBe(identity.id);
  });

  test("a token orch has never seen resolves to nothing rather than a fabricated id", () => {
    expect(agentIdBySessionToken(store(), "never-registered")).toBeNull();
  });

  test("one session keeps ONE id across calls, whatever pid the shell reports", () => {
    const dir = store();
    const first = register(dir, "session-abc", 111);
    const second = register(dir, "session-abc", 222);
    expect(second.id).toBe(first.id);
    expect(agentIdBySessionToken(dir, "session-abc")).toBe(first.id);
  });
});
