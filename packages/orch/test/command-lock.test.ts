import { afterEach, describe, expect, test } from "bun:test";
import { lockCommand, unlockCommand } from "../src/daemon/server/handlers/command-lock.ts";
import { processStartToken } from "../src/process-identity.ts";
import { hostOs } from "../src/host.ts";
import { ensureHost } from "../src/store/agent-rows.ts";
import { approveGrantRequest } from "../src/store/grant-rows.ts";
import { selectCommandLocks, takeCommandLocks } from "../src/store/command-lock-rows.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { ParamsOf } from "../src/daemon/client/protocol.ts";

const dirs: OrchDir[] = [];
const SETTINGS = { locked_commands: ["bun test"], gated_commands: ["git push"] };
const LIVE = { pid: process.pid, startToken: processStartToken(process.pid) ?? null };

afterEach(() => {
  while (dirs.length) removeTempDir(dirs.pop()!);
});

function tempDir(): OrchDir {
  const dir = tempOrchDir("orch-command-lock-");
  dirs.push(dir);
  return dir;
}

function request(command: string, pid: number, startToken: string | null = "caller", held: string[] = []): ParamsOf<"command-lock"> {
  return { command, cwd: "/repo", pid, startToken, agent: null, held };
}

describe("command-lock", () => {
  test("a free pattern runs and holds the lock until unlock", () => {
    const dir = tempDir();
    expect(lockCommand(dir, SETTINGS, request("bun test a.ts", LIVE.pid, LIVE.startToken))).toEqual({ verdict: "run", patterns: ["bun test"] });
    expect(selectCommandLocks(dir, ["bun test"])).toHaveLength(1);
    unlockCommand(dir, LIVE);
    expect(selectCommandLocks(dir, ["bun test"])).toHaveLength(0);
  });

  test("a second process waits while a live process holds the pattern", () => {
    const dir = tempDir();
    lockCommand(dir, SETTINGS, request("bun test", LIVE.pid, LIVE.startToken));
    expect(lockCommand(dir, SETTINGS, request("cd x && bun test", 2))).toMatchObject({ verdict: "wait", pattern: "bun test", holder: `pid ${LIVE.pid}` });
  });

  test("a lock whose holder is gone is replaced", () => {
    const dir = tempDir();
    takeCommandLocks(dir, [{ pattern: "bun test", pid: 999_999, startToken: "gone", agentId: null, command: "bun test", acquiredAt: 1 }], []);
    expect(lockCommand(dir, SETTINGS, request("bun test", 2))).toEqual({ verdict: "run", patterns: ["bun test"] });
    expect(selectCommandLocks(dir, ["bun test"])[0]?.pid).toBe(2);
  });

  test("a pattern an ancestor holds never waits", () => {
    const dir = tempDir();
    lockCommand(dir, SETTINGS, request("bun test", LIVE.pid, LIVE.startToken));
    expect(lockCommand(dir, SETTINGS, request("bun test", 2, "caller", ["bun test"]))).toEqual({ verdict: "run", patterns: [] });
  });

  test("a gated command is refused until a human approves it, and the approval is spent once", () => {
    const dir = tempDir();
    const refused = lockCommand(dir, SETTINGS, request("git push", 2));
    if (refused.verdict !== "refused") throw new Error("expected a refusal");
    expect(lockCommand(dir, SETTINGS, request("git push", 2))).toEqual(refused);
    ensureHost(dir, "host", "host", hostOs(), Date.now());
    approveGrantRequest(dir, refused.requestId, "host");
    expect(lockCommand(dir, SETTINGS, request("git push", 2))).toEqual({ verdict: "run", patterns: [] });
    expect(lockCommand(dir, SETTINGS, request("git push", 2)).verdict).toBe("refused");
  });
});
