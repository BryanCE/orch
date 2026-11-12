import { placeHere } from "../../src/process-place.ts";
import type { OrchDir } from "../../src/types/core.ts";
import { registerSpawnedAgent } from "../../src/store/spawn-registration.ts";
import { agentById, ensureHarness, ensureHost, ensurePlexer, getOrCreateSessionAgent, insertAgent } from "../../src/store/agent-rows.ts";
import { hostIdentity } from "../../src/hosts/identity.ts";
import { OPERATOR_HARNESS_ID } from "../../src/identity/operator.ts";
import { sessionProcessPid } from "../../src/identity/credential.ts";
import { processStartToken } from "../../src/process-identity.ts";
import { recordProcess, setAgentPlexer, setHandle, setSpace } from "../../src/store/interval-rows.ts";
import { adoptLease, currentLease } from "../../src/store/lease-rows.ts";
import type { LocalProcess } from "../../src/types/backend.ts";
import { observedHere } from "../../src/local-process.ts";
import type { AgentFacts } from "../../src/types/presence.ts";
import type { CallerKind } from "../../src/types/policy.ts";
import type { ProcessInstance } from "../../src/types/process.ts";
import { orm } from "../../src/store/connection.ts";
import { agents } from "../../src/db/schema.ts";
import { refreshAgent } from "../../src/store/agent-view.ts";
import { eq } from "drizzle-orm";

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

/** One agent row with the fixture's own id, kind and spawner, written by `insertAgent` on
 *  this host, so it carries the open `agent_hosts` row every agent has. No process, no lease. */
export interface AgentRowFixture {
  readonly id: string;
  readonly spawnedBy?: string | null;
  readonly name?: string;
  readonly harnessId?: string;
  readonly cwd?: string;
  readonly createdAt?: number;
  readonly kind?: CallerKind;
}

export function seedAgentRow(directory: OrchDir, fixture: AgentRowFixture): void {
  const harnessId = fixture.harnessId ?? "pi";
  const createdAt = fixture.createdAt ?? Date.now();
  ensureHarness(directory, harnessId, harnessId, createdAt);
  insertAgent(directory, {
    host: hostIdentity(), id: fixture.id, spawnedBy: fixture.spawnedBy ?? null, harnessId,
    cwd: fixture.cwd ?? process.cwd(), name: fixture.name ?? fixture.id, createdAt,
  });
  if (fixture.kind === undefined || fixture.kind === "agent") return;
  orm(directory).update(agents).set({ kind: fixture.kind }).where(eq(agents.id, fixture.id)).run();
  refreshAgent(directory, fixture.id);
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
    form: "tui",
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

/** Record a process instance for an ALREADY-REGISTERED agent on this host. By default it is
 *  this test process, start token included, so the record provably names a live instance. */
export function seedProcessInstance(directory: OrchDir, agentId: string, since: number, instance: ProcessInstance = runnerInstance()): void {
  recordProcess(directory, placeHere(directory, agentId), since, instance);
}

/** This test process as a process instance. A given `startToken` names another instance of
 *  the same pid: a record that reads as dead. */
export function runnerInstance(startToken: string = runnerStartToken()): ProcessInstance {
  return { pid: process.pid, startToken };
}

function runnerStartToken(): string {
  const token = processStartToken(process.pid);
  if (token === undefined) throw new Error("test process has no start token");
  return token;
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
