import { ensureOrchAgent, registerSpawnedAgent } from "../../src/store/spawn-registration.ts";
import { currentHostOs, ensureHost, ensurePlexer } from "../../src/store/agent-rows.ts";
import { recordProcess, setAgentPlexer, setHandle, setSpace } from "../../src/store/interval-rows.ts";
import { adoptLease, currentLease } from "../../src/store/lease-rows.ts";
import { orchDir } from "../../src/presence/writer.ts";
import type { AgentFacts } from "../../src/types/presence.ts";

/**
 * Seed one agent through the SAME writer production uses.
 *
 * The fixtures used to reach for a second writer (`recordSpawned`), which is
 * how a test could pass against a record
 * shape no spawn ever produces. There is one writer, so there is one way to
 * seed: this maps the fixture's stated facts onto `SpawnRegistration` and
 * states nothing the caller did not.
 */
export function seedAgent(key: string, facts: AgentFacts = {}, directory = orchDir()): void {
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
    // The test runner is the one process a fixture can prove alive.
    process: { pid: process.pid },
  });
}

/**
 * Record the test runner as an ALREADY-REGISTERED agent's process, so the
 * agent reads as alive to the daemon and the presence store. For a fixture that
 * inserted its row directly instead of through `seedAgent`.
 */
export function seedLiveProcess(directory: string, agentId: string, now = 1): void {
  const host = "test-host";
  ensureHost(directory, host, host, currentHostOs(), now);
  recordProcess(directory, agentId, now, { hostId: host, pid: process.pid });
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
export function placeAgent(key: string, facts: AgentFacts = {}, directory = orchDir()): void {
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
