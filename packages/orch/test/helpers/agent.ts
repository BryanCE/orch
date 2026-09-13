import { ensureOrchAgent, registerSpawnedAgent } from "../../src/store/spawn-registration.ts";
import { currentHostOs, ensureHost, ensurePlexer } from "../../src/store/agent-rows.ts";
import { recordProcess, setAgentPlexer, setHandle, setSpace } from "../../src/store/interval-rows.ts";
import { adoptLease, currentLease } from "../../src/store/lease-rows.ts";
import type { RecordedProcess } from "../../src/types/backend.ts";
import type { AgentFacts } from "../../src/types/presence.ts";

/** The test runner: the one pid a fixture can count on being alive. */
export function runnerProcess(): RecordedProcess {
  return { pid: process.pid, startToken: null };
}

/** A pid no process holds, so a seeded record reads as a dead one. */
export const DEAD_PID = 2147483646;

/** Seed one agent through the same writer production uses. It has no live process; seedLiveProcess states one. */
export function seedAgent(key: string, facts: AgentFacts = {}, directory: string): void {
  registerSpawnedAgent(directory, {
    key,
    harnessId: facts.adapter ?? "pi",
    ...(facts.backend === undefined ? {} : { backendId: facts.backend }),
    placed: false,
    ...(facts.handle === undefined ? {} : { handle: facts.handle }),
    ...(facts.space === undefined ? {} : { space: facts.space }),
    cwd: facts.cwd ?? process.cwd(),
    name: facts.name ?? key,
    model: facts.model ?? "",
    spawner: facts.spawnedBy ?? null,
    ...(facts.owner === undefined ? {} : { owner: facts.owner }),
    ...(facts.worktree !== undefined && facts.branch !== undefined
      ? { worktree: { path: facts.worktree, branch: facts.branch } }
      : {}),
    process: { pid: DEAD_PID, startToken: null },
  });
}

/**
 * Record the test runner as an ALREADY-REGISTERED agent's process, so the
 * agent reads as alive to the daemon and the presence store. For a fixture that
 * inserted its row directly instead of through `seedAgent`.
 */
export function seedLiveProcess(directory: string, agentId: string, now = Date.now()): void {
  const host = "test-host";
  ensureHost(directory, host, host, currentHostOs(), now);
  recordProcess(directory, agentId, now, { hostId: host, ...runnerProcess() });
}

/**
 * Move an agent that ALREADY EXISTS onto new environment axes.
 *
 * Registration is a one-shot: it mints the row. Changing where an agent sits, or
 * who holds it, is a new interval on the axis that owns it — which is why this
 * calls the same per-axis writers `orch move` and `orch adopt` do, and never
 * re-registers. Conflating the two is what a second "record" writer did, and it
 * is what let a fixture assert a record shape no spawn ever produces (2.1).
 */
export function placeAgent(key: string, facts: AgentFacts = {}, directory: string): void {
  const now = Date.now();
  if (facts.backend !== undefined) {
    ensurePlexer(directory, facts.backend, facts.backend, now);
    setAgentPlexer(directory, key, facts.backend);
  }
  if (facts.space !== undefined) setSpace(directory, key, now, facts.space);
  if (facts.handle !== undefined) setHandle(directory, key, now, facts.handle);
  if (facts.owner !== undefined && facts.owner !== key && currentLease(directory, key)?.orchId !== facts.owner) {
    ensureOrchAgent(directory, facts.owner, facts.adapter ?? "pi", now);
    adoptLease(directory, key, facts.owner, now);
  }
}
