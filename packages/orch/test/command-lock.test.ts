import { afterEach, describe, expect, test } from "bun:test";
import { lockCommand, unlockCommand } from "../src/daemon/server/handlers/command-lock.ts";
import { acceptStatusReport } from "../src/daemon/server/status-report.ts";
import { processStartToken } from "../src/process-identity.ts";
import { hostOs } from "../src/host.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import { ensureHost } from "../src/store/agent-rows.ts";
import { approveGrantRequest } from "../src/store/grant-rows.ts";
import { selectAgentStatus } from "../src/store/status-rows.ts";
import { selectCommandLocks, takeCommandLocks } from "../src/store/command-lock-rows.ts";
import { seedAgent, seedOrch } from "./helpers/agent.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { NotifyEvent } from "../src/types/notify.ts";
import type { Role } from "../src/types/policy.ts";
import type { ParamsOf, ResultOf } from "../src/daemon/client/protocol.ts";

const dirs: OrchDir[] = [];
const DENIED: Role[] = ["slave"];
const EVERY_AGENT: Role[] = ["orch", "slave"];
const SETTINGS = { locked_commands: { commands: ["bun test"], applies_to: EVERY_AGENT }, gated_commands: ["git push"], denied_commands: { commands: ["bun check"], applies_to: DENIED }, timeouts: { lock_wait_ms: 180_000 } };
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
  return { command, cwd: "/repo", pid, startToken, agent: null, held, waitingSince: Date.now() };
}

function lock(dir: OrchDir, params: ParamsOf<"command-lock">, events: NotifyEvent[] = []): ResultOf<"command-lock"> {
  return lockCommand(dir, SETTINGS, params, (event) => events.push(event));
}

/** A working agent whose next locked command waits on the live runner's lock. */
function waitingAgent(dir: OrchDir): string {
  const agent = mintAgentId();
  seedAgent(agent, { name: "waiter" }, dir);
  acceptStatusReport(dir, agent, { state: "working" }, () => undefined);
  lock(dir, request("bun test", LIVE.pid, LIVE.startToken));
  return agent;
}

describe("command-lock", () => {
  test("a free pattern runs and holds the lock until unlock", () => {
    const dir = tempDir();
    expect(lock(dir, request("bun test a.ts", LIVE.pid, LIVE.startToken))).toEqual({ verdict: "run", patterns: ["bun test"] });
    expect(selectCommandLocks(dir, ["bun test"])).toHaveLength(1);
    unlockCommand(dir, LIVE);
    expect(selectCommandLocks(dir, ["bun test"])).toHaveLength(0);
  });

  test("a second process waits while a live process holds the pattern", () => {
    const dir = tempDir();
    lock(dir, request("bun test", LIVE.pid, LIVE.startToken));
    expect(lock(dir, request("cd x && bun test", 2))).toMatchObject({ verdict: "wait", pattern: "bun test", holder: `pid ${LIVE.pid}` });
  });

  test("a lock whose holder is gone is replaced", () => {
    const dir = tempDir();
    takeCommandLocks(dir, [{ pattern: "bun test", pid: 999_999, startToken: "gone", agentId: null, command: "bun test", acquiredAt: 1 }], []);
    expect(lock(dir, request("bun test", 2))).toEqual({ verdict: "run", patterns: ["bun test"] });
    expect(selectCommandLocks(dir, ["bun test"])[0]?.pid).toBe(2);
  });

  test("a pattern an ancestor holds never waits", () => {
    const dir = tempDir();
    lock(dir, request("bun test", LIVE.pid, LIVE.startToken));
    expect(lock(dir, request("bun test", 2, "caller", ["bun test"]))).toEqual({ verdict: "run", patterns: [] });
  });

  test("a gated command is refused until a human approves it, and the approval is spent once", () => {
    const dir = tempDir();
    const refused = lock(dir, request("git push", 2));
    if (refused.verdict !== "refused") throw new Error("expected a refusal");
    expect(lock(dir, request("git push", 2))).toEqual(refused);
    ensureHost(dir, "host", "host", hostOs(), Date.now());
    approveGrantRequest(dir, refused.requestId, "host");
    expect(lock(dir, request("git push", 2))).toEqual({ verdict: "run", patterns: [] });
    expect(lock(dir, request("git push", 2)).verdict).toBe("refused");
  });

  test("a denied command is refused for a worker, with no grant, only as the whole command", () => {
    const dir = tempDir();
    const orchestrator = mintAgentId();
    const worker = mintAgentId();
    seedOrch(dir, orchestrator);
    seedAgent(worker, { spawnedBy: orchestrator }, dir);
    expect(lock(dir, { ...request("bun check", 2), agent: worker })).toEqual({ verdict: "denied", pattern: "bun check" });
    expect(lock(dir, { ...request("cd x && bun check 2>&1 | tail -5", 2), agent: worker })).toEqual({ verdict: "denied", pattern: "bun check" });
    expect(lock(dir, { ...request("bun check src/a.ts", 2), agent: worker })).toEqual({ verdict: "run", patterns: [] });
  });

  test("denied_commands.applies_to picks who is refused; the human never is", () => {
    const dir = tempDir();
    const orchestrator = mintAgentId();
    seedOrch(dir, orchestrator);
    expect(lock(dir, { ...request("bun check", 2), agent: orchestrator })).toEqual({ verdict: "run", patterns: [] });
    expect(lock(dir, request("bun check", 2))).toEqual({ verdict: "run", patterns: [] });
    const both = { ...SETTINGS, denied_commands: { commands: ["bun check"], applies_to: EVERY_AGENT } };
    expect(lockCommand(dir, both, { ...request("bun check", 2), agent: orchestrator }, () => undefined)).toEqual({ verdict: "denied", pattern: "bun check" });
    expect(lockCommand(dir, both, request("bun check", 2), () => undefined)).toEqual({ verdict: "run", patterns: [] });
  });

  test("locked_commands.applies_to picks who waits; the human's own orch lock always does", () => {
    const dir = tempDir();
    const orchestrator = mintAgentId();
    seedOrch(dir, orchestrator);
    const workersOnly = { ...SETTINGS, locked_commands: { commands: ["bun test"], applies_to: DENIED } };
    lock(dir, request("bun test", LIVE.pid, LIVE.startToken));
    expect(lockCommand(dir, workersOnly, { ...request("bun test", 2), agent: orchestrator }, () => undefined)).toEqual({ verdict: "run", patterns: [] });
    expect(lockCommand(dir, workersOnly, request("bun test", 2), () => undefined)).toMatchObject({ verdict: "wait", pattern: "bun test" });
  });

  test("a waiting agent is marked waiting once, with the holder named", () => {
    const dir = tempDir();
    const agent = waitingAgent(dir);
    const events: NotifyEvent[] = [];
    lock(dir, { ...request("bun test", 2), agent }, events);
    lock(dir, { ...request("bun test", 2), agent }, events);
    expect(selectAgentStatus(dir, agent)?.state).toBe("waiting");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ oldState: "working", newState: "waiting", reason: `waiting for "bun test", held by pid ${LIVE.pid}` });
  });

  test("a harness report of working keeps waiting; any other state replaces it", () => {
    const dir = tempDir();
    const agent = waitingAgent(dir);
    lock(dir, { ...request("bun test", 2), agent });
    acceptStatusReport(dir, agent, { state: "working" }, () => undefined);
    expect(selectAgentStatus(dir, agent)?.state).toBe("waiting");
    acceptStatusReport(dir, agent, { state: "aborted" }, () => undefined);
    expect(selectAgentStatus(dir, agent)?.state).toBe("aborted");
  });

  test("the agent goes back to working when it gets the lock", () => {
    const dir = tempDir();
    const agent = waitingAgent(dir);
    lock(dir, { ...request("bun test", 2), agent });
    unlockCommand(dir, LIVE);
    const events: NotifyEvent[] = [];
    expect(lock(dir, { ...request("bun test", 2), agent }, events).verdict).toBe("run");
    expect(selectAgentStatus(dir, agent)?.state).toBe("working");
    expect(events[0]).toMatchObject({ oldState: "waiting", newState: "working" });
    expect(events[0]?.type === "transition" ? events[0].reason : undefined).toStartWith('got "bun test" after');
  });

  test("a wait past timeouts.lock_wait_ms gives up, runs nothing, and says so", () => {
    const dir = tempDir();
    const agent = waitingAgent(dir);
    lock(dir, { ...request("bun test", 2), agent });
    const events: NotifyEvent[] = [];
    const verdict = lock(dir, { ...request("bun test", 2), agent, waitingSince: Date.now() - 200_000 }, events);
    expect(verdict).toMatchObject({ verdict: "gave-up", pattern: "bun test", holder: `pid ${LIVE.pid}` });
    expect(selectCommandLocks(dir, ["bun test"])[0]?.pid).toBe(LIVE.pid);
    expect(selectAgentStatus(dir, agent)?.state).toBe("working");
    expect(events[0]).toMatchObject({ oldState: "waiting", newState: "working" });
    expect(events[0]?.type === "transition" ? events[0].reason : undefined).toStartWith('gave up on "bun test" after 200s');
  });
});
