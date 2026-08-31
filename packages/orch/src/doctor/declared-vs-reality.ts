import { existsSync } from "node:fs";
import { join } from "node:path";
import { getBackend } from "../backends/registry.ts";
import { processInstanceMatches, processIsAlive } from "../process-identity.ts";
import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import { orm } from "../store/connection.ts";
import { agentEndings, agentHandles, agentLeases, agentPlexers, agentProcesses, agents } from "../db/schema.ts";
import { currentProcess } from "../store/interval-rows.ts";
import type { CheckResult, DeclaredVsRealityDependencies, PlexerInventoryEntry } from "../types/doctor.ts";

function defaultProcessAlive(pid: number, startToken: string | null): boolean {
  if (startToken === null) return processIsAlive(pid);
  return processInstanceMatches(pid, startToken);
}

const DEFAULT_DEPENDENCIES: DeclaredVsRealityDependencies = {
  processAlive: defaultProcessAlive,
  plexerInventory: defaultInventory,
};

/** The doctor asks through injected `processAlive` so a check can be run against
 *  a stated reality, which is the whole point of comparing declared to real. */
function recordedProcessAlive(orchDir: string, agentId: string, dependencies: DeclaredVsRealityDependencies): boolean {
  const row = currentProcess(orchDir, agentId);
  return row !== undefined && dependencies.processAlive(row.pid, row.startToken);
}

function defaultInventory(plexerId: string): readonly PlexerInventoryEntry[] {
  const backend = getBackend(plexerId);
  if (!backend?.paneInventory) return [];
  try {
    return backend.paneInventory.list().map((target) => ({ handle: target.handle }));
  } catch {
    return [];
  }
}

function leaseFindings(orchDir: string, dependencies: DeclaredVsRealityDependencies): string[] {
  const rows = orm(orchDir).select({ agentId: agentLeases.agentId, holderId: agentLeases.orchId })
    .from(agentLeases).where(isNull(agentLeases.until)).orderBy(asc(agentLeases.id)).all();
  return rows.flatMap(({ agentId, holderId }) => recordedProcessAlive(orchDir, holderId, dependencies) ? [] : [
    `lease row agent=${agentId} holder=${holderId}: recorded holder process is not alive; real process is absent or dead. Fix: release or adopt the lease deliberately, then renew it with a live holder`,
  ]);
}

function environmentFindings(orchDir: string, dependencies: DeclaredVsRealityDependencies): string[] {
  const rows = orm(orchDir).select({ agentId: agentPlexers.agentId, plexerId: agentPlexers.plexerId, handle: agentHandles.handle })
    .from(agentPlexers)
    .innerJoin(agentHandles, and(eq(agentHandles.agentId, agentPlexers.agentId), isNull(agentHandles.until)))
    .leftJoin(agentEndings, eq(agentEndings.agentId, agentPlexers.agentId))
    .where(isNull(agentEndings.agentId)).orderBy(asc(agentPlexers.agentId)).all();
  return rows.flatMap(({ agentId, plexerId, handle }) => {
    const reality = dependencies.plexerInventory(plexerId);
    // A null inventory is "this plexer could not be asked", which is not evidence
    // the handle is gone — declaring a mismatch there would invent one.
    if (reality === null || reality.some((entry) => String(entry.handle) === handle)) return [];
    return [`environment row agent=${agentId}: recorded plexer=${plexerId} handle=${handle}, but the real plexer has no such handle. Fix: inspect the plexer and record the agent's current environment or close the ended agent`];
  });
}

function orphanFindings(orchDir: string, dependencies: DeclaredVsRealityDependencies): string[] {
  const rows = orm(orchDir).select({ agentId: agents.id, spawnerId: agents.spawnedBy })
    .from(agents)
    .innerJoin(agentProcesses, and(eq(agentProcesses.agentId, agents.id), isNull(agentProcesses.until)))
    .leftJoin(agentEndings, eq(agentEndings.agentId, agents.id))
    .leftJoin(agentLeases, and(eq(agentLeases.agentId, agents.id), isNull(agentLeases.until)))
    .where(and(isNull(agentEndings.agentId), isNull(agentLeases.agentId), isNotNull(agents.spawnedBy)))
    .orderBy(asc(agents.id)).all();
  return rows.flatMap(({ agentId, spawnerId }) => {
    if (spawnerId === null) return [];
    if (!recordedProcessAlive(orchDir, agentId, dependencies)) return [];
    if (recordedProcessAlive(orchDir, spawnerId, dependencies)) return [];
    return [`orphan row agent=${agentId} spawner=${spawnerId}: recorded agent is live with no lease, but the real spawner process is not alive. Fix: adopt the agent deliberately or close it; do not wait for an automatic reap`];
  });
}

export function checkDeclaredVsReality(orchDir: string, dependencies: DeclaredVsRealityDependencies = DEFAULT_DEPENDENCIES): CheckResult {
  if (!existsSync(join(orchDir, "orch.db"))) {
    return { id: "declared-vs-reality", label: "Declared vs reality", status: "ok", detail: "no store to compare" };
  }
  const findings = [...leaseFindings(orchDir, dependencies), ...environmentFindings(orchDir, dependencies), ...orphanFindings(orchDir, dependencies)];
  if (!findings.length) return { id: "declared-vs-reality", label: "Declared vs reality", status: "ok", detail: "no declared-vs-reality mismatches" };
  return { id: "declared-vs-reality", label: "Declared vs reality", status: "warn", detail: findings.join("\n    ") };
}
