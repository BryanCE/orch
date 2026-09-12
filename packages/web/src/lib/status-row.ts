import type { DaemonStatusRow } from "@orch/types/daemon.ts";
import { isAgentState } from "@orch/agent-state.ts";
import { isRecord } from "@orch/util.ts";

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isCapabilities(value: unknown): boolean {
  return value === null || (isRecord(value) && typeof value.spaceHome === "boolean" && typeof value.identity === "boolean"
    && typeof value.handleLookup === "boolean" && typeof value.logPruning === "boolean");
}

function isLease(value: unknown): boolean {
  return value === null || (isRecord(value) && typeof value.holderId === "string" && typeof value.holderName === "string"
    && typeof value.holderAlive === "boolean");
}

/** Verify one complete status row received across the daemon RPC boundary. */
export function isDaemonStatusRow(value: unknown): value is DaemonStatusRow {
  if (!isRecord(value)) return false;
  return typeof value.key === "string"
    && (value.agentId === undefined || isNullableString(value.agentId))
    && isNullableString(value.paneId)
    && typeof value.managed === "boolean"
    && isNullableString(value.name)
    && isNullableString(value.tab)
    && isNullableString(value.agent)
    && isNullableString(value.owner)
    && isNullableString(value.spawnedBy)
    && isNullableString(value.spawnedByLabel)
    && isNullableString(value.worktree)
    && isNullableString(value.branch)
    && isNullableString(value.cwd)
    && typeof value.focused === "boolean"
    && typeof value.model === "string"
    && typeof value.modelShort === "string"
    && isAgentState(value.state)
    && typeof value.stateFallback === "boolean"
    && (value.staleExtension === undefined || typeof value.staleExtension === "boolean")
    && typeof value.exited === "boolean"
    && typeof value.alive === "boolean"
    && typeof value.cost === "number"
    && (value.ctxPercent === null || typeof value.ctxPercent === "number")
    && isNullableString(value.task)
    && isNullableString(value.dispatchId)
    && isNullableString(value.lastText)
    && isNullableString(value.backendStatus)
    && isNullableString(value.backend)
    && isCapabilities(value.capabilities)
    && isNullableString(value.sessionPath)
    && isNullableString(value.presenceDir)
    && typeof value.presenceOnly === "boolean"
    && (value.bridgeAttached === null || typeof value.bridgeAttached === "boolean")
    && isLease(value.lease)
    && typeof value.leaseKnown === "boolean"
    && (value.spaceId === undefined || isNullableString(value.spaceId))
    && (value.spaceName === undefined || isNullableString(value.spaceName))
    && (value.rootAgentId === undefined || isNullableString(value.rootAgentId))
    && (value.rootAgentName === undefined || isNullableString(value.rootAgentName))
    && (value.host === undefined || typeof value.host === "string")
    && (value.warning === undefined || typeof value.warning === "string");
}

/** Keep only complete daemon status rows; malformed rows are not repaired. */
export function daemonStatusRows(value: unknown): DaemonStatusRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isDaemonStatusRow);
}
