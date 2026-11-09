import { placeHere } from "../../src/process-place.ts";
import type { OrchDir } from "../../src/types/core.ts";
import { registerSpawnedAgent } from "../../src/store/spawn-registration.ts";
import { agentById, ensureHarness, ensureHost, ensurePlexer, getOrCreateSessionAgent, insertAgent } from "../../src/store/agent-rows.ts";
import { hostIdentity } from "../../src/host.ts";
import { OPERATOR_HARNESS_ID } from "../../src/identity/operator.ts";
import { sessionProcessPid } from "../../src/identity/credential.ts";
import { processStartToken } from "../../src/process-identity.ts";
import { recordProcess, setAgentPlexer, setHandle, setSpace } from "../../src/store/interval-rows.ts";
import { adoptLease, currentLease } from "../../src/store/lease-rows.ts";
import type { LocalProcess } from "../../src/types/backend.ts";
import { observedHere } from "../../src/local-process.ts";
import type { AgentFacts } from "../../src/types/presence.ts";

/** The test runner: the one pid a fixture can count on being alive. */
export function runnerProcess(): LocalProcess {
  return observedHere(process.pid, null);
}

/** A pid no process holds, so a seeded record reads as a dead one. */
export const DEAD_PID = 2147483646;

/** A registered orchestrator row, as `register-session` mints one: an agent with
 *  no process of its own yet. A fixture's holder must exist before it holds. */
export function seedOrch(directory: OrchDir, id: string, harnessId = "pi", now = Date.now()): void {
  if (agentById(directory, id)) return;
  ensureHarness(directory, harnessId, harnessId, now);
  insertAgent(directory, { host: hostIdentity(), id, harnessId, cwd: process.cwd(), name: id, createdAt: now });
}

/** Register the test runner as an operator orch, the way `register-session` does
 *  for a plain shell: its parent process, no session token. Returns the id
 *  `selfId()` then resolves to. The caller isolates harness markers first. */
export function seedOperator(directory: OrchDir, now = Date.now()): string {
  const pid = sessionProcessPid(null);
  const startToken = processStartToken(pid);
  if (startToken === undefined) throw new Error(`no start token for the runner's parent pid ${pid}`);
  return getOrCreateSessionAgent(directory, {
    pid, startToken, sessionToken: null, harnessId: OPERATOR_HARNESS_ID, cwd: process.cwd(),
    label: `${OPERATOR_HARNESS_ID} session ${pid}`, host: hostIdentity(), now,
  }).id;
}

/** Seed one agent through the same writer production uses. It has no live process; seedLiveProcess states one. */
export function seedAgent(key: string, facts: AgentFacts = {}, directory: OrchDir): void {
  if (facts.owner !== undefined && facts.owner !== key) seedOrch(directory, facts.owner, facts.adapter ?? "pi");
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
      ? { worktree: { path: facts.worktree, branch: facts.branch, base: "main", provider: "git" } }
      : {}),
    process: { host: hostIdentity().id, pid: DEAD_PID, startToken: null },
  });
}

/**
 * Record the test runner as an ALREADY-REGISTERED agent's process, so the
 * agent reads as alive to the daemon and the presence store. For a fixture that
 * inserted its row directly instead of through `seedAgent`.
 */
export function seedLiveProcess(directory: OrchDir, agentId: string, now = Date.now()): void {
  // The runner runs on this machine, so its process is recorded on this machine's host.
  const host = hostIdentity();
  ensureHost(directory, host, now);
  recordProcess(directory, placeHere(directory, agentId), now, {  ...runnerProcess() });
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
export function placeAgent(key: string, facts: AgentFacts = {}, directory: OrchDir): void {
  const now = Date.now();
  if (facts.backend !== undefined) {
    ensurePlexer(directory, facts.backend, facts.backend, now);
    setAgentPlexer(directory, placeHere(directory, key), facts.backend);
  }
  if (facts.space !== undefined) setSpace(directory, key, now, facts.space);
  if (facts.handle !== undefined) setHandle(directory, placeHere(directory, key), now, facts.handle);
  if (facts.owner !== undefined && facts.owner !== key && currentLease(directory, key)?.orchId !== facts.owner) {
    seedOrch(directory, facts.owner, facts.adapter ?? "pi", now);
    adoptLease(directory, key, facts.owner, now);
  }
}
