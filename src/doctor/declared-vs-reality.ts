import { existsSync } from "node:fs";
import { join } from "node:path";
import { getBackend } from "../backends/registry.ts";
import { processInstanceMatches, processIsAlive } from "../process-identity.ts";
import { openStore } from "../store/connection.ts";
import { isRecord } from "../util.ts";
import type { CheckResult, DeclaredVsRealityDependencies, PlexerInventoryEntry } from "../types/doctor.ts";

interface ProcessRow {
  readonly pid: number;
  readonly startToken: string | null;
}

function processRow(value: unknown): ProcessRow | null {
  if (!isRecord(value) || typeof value.pid !== "number" || !Number.isInteger(value.pid)
    || (value.start_token !== null && typeof value.start_token !== "string")) return null;
  return { pid: value.pid, startToken: value.start_token };
}

function currentProcess(orchDir: string, agentId: string): ProcessRow | null {
  return processRow(openStore(orchDir).query(
    "SELECT pid,start_token FROM agent_processes WHERE agent_id=? AND until IS NULL",
  ).get(agentId));
}

function defaultProcessAlive(pid: number, startToken: string | null): boolean {
  if (startToken === null) return processIsAlive(pid);
  return processInstanceMatches(pid, startToken);
}

const DEFAULT_DEPENDENCIES: DeclaredVsRealityDependencies = {
  processAlive: defaultProcessAlive,
  plexerInventory: defaultInventory,
};

function recordedProcessAlive(row: ProcessRow | null, dependencies: DeclaredVsRealityDependencies): boolean {
  if (!row) return false;
  return dependencies.processAlive(row.pid, row.startToken);
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

function stringValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function leaseFindings(orchDir: string, dependencies: DeclaredVsRealityDependencies): string[] {
  const rows = openStore(orchDir).query(
    "SELECT agent_id,orch_id FROM agent_leases WHERE until IS NULL ORDER BY id",
  ).all();
  const findings: string[] = [];
  for (const row of rows) {
    if (!isRecord(row)) continue;
    const agentId = stringValue(row.agent_id);
    const holderId = stringValue(row.orch_id);
    if (!agentId || !holderId) continue;
    if (recordedProcessAlive(currentProcess(orchDir, holderId), dependencies)) continue;
    findings.push(
      `lease row agent=${agentId} holder=${holderId}: recorded holder process is not alive; real process is absent or dead. Fix: release or adopt the lease deliberately, then renew it with a live holder`,
    );
  }
  return findings;
}

function environmentFindings(orchDir: string, dependencies: DeclaredVsRealityDependencies): string[] {
  const rows = openStore(orchDir).query(`
    SELECT p.agent_id, p.plexer_id, h.handle
    FROM agent_plexers p
    JOIN agent_handles h ON h.agent_id=p.agent_id AND h.until IS NULL
    LEFT JOIN agent_endings e ON e.agent_id=p.agent_id
    WHERE e.agent_id IS NULL
    ORDER BY p.agent_id
  `).all();
  const findings: string[] = [];
  const inventory = dependencies.plexerInventory;
  for (const row of rows) {
    if (!isRecord(row)) continue;
    const agentId = stringValue(row.agent_id);
    const plexerId = stringValue(row.plexer_id);
    const handle = stringValue(row.handle);
    if (!agentId || !plexerId || handle === null) continue;
    const reality = inventory(plexerId);
    if (reality === null) continue;
    const exists = reality.some((entry) => String(entry.handle) === handle);
    if (exists) continue;
    findings.push(
      `environment row agent=${agentId}: recorded plexer=${plexerId} handle=${handle}, but the real plexer has no such handle. Fix: inspect the plexer and record the agent's current environment or close the ended agent`,
    );
  }
  return findings;
}

function orphanFindings(orchDir: string, dependencies: DeclaredVsRealityDependencies): string[] {
  const rows = openStore(orchDir).query(`
    SELECT a.id, a.spawned_by, p.pid, p.start_token
    FROM agents a
    JOIN agent_processes p ON p.agent_id=a.id AND p.until IS NULL
    LEFT JOIN agent_endings e ON e.agent_id=a.id
    LEFT JOIN agent_leases l ON l.agent_id=a.id AND l.until IS NULL
    WHERE e.agent_id IS NULL AND l.agent_id IS NULL AND a.spawned_by IS NOT NULL
    ORDER BY a.id
  `).all();
  const findings: string[] = [];
  for (const row of rows) {
    if (!isRecord(row)) continue;
    const agentId = stringValue(row.id);
    const spawnerId = stringValue(row.spawned_by);
    if (!agentId || !spawnerId) continue;
    const pid = typeof row.pid === "number" && Number.isInteger(row.pid) ? row.pid : null;
    const startToken = row.start_token === null || typeof row.start_token === "string" ? row.start_token : null;
    const agentAlive = pid !== null && recordedProcessAlive({ pid, startToken }, dependencies);
    if (!agentAlive || recordedProcessAlive(currentProcess(orchDir, spawnerId), dependencies)) continue;
    findings.push(
      `orphan row agent=${agentId} spawner=${spawnerId}: recorded agent is live with no lease, but the real spawner process is not alive. Fix: adopt the agent deliberately or close it; do not wait for an automatic reap`,
    );
  }
  return findings;
}

export function checkDeclaredVsReality(orchDir: string, dependencies: DeclaredVsRealityDependencies = DEFAULT_DEPENDENCIES): CheckResult {
  if (!existsSync(join(orchDir, "orch.db"))) {
    return { id: "declared-vs-reality", label: "Declared vs reality", status: "ok", detail: "no store to compare" };
  }
  const findings = [...leaseFindings(orchDir, dependencies), ...environmentFindings(orchDir, dependencies), ...orphanFindings(orchDir, dependencies)];
  if (!findings.length) return { id: "declared-vs-reality", label: "Declared vs reality", status: "ok", detail: "no declared-vs-reality mismatches" };
  return { id: "declared-vs-reality", label: "Declared vs reality", status: "warn", detail: findings.join("\n    ") };
}
