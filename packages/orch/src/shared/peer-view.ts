import { isRecord } from "../json.ts";
import type { DriveState } from "../types/agent.ts";
import type { PeerView } from "../types/daemon.ts";

function isDriveState(value: unknown): value is DriveState {
  return isRecord(value)
    && (value.kind === "leased" || value.kind === "unleased")
    && typeof value.owner === "string"
    && typeof value.mine === "boolean";
}

export function isPeerView(value: unknown): value is PeerView {
  if (!isRecord(value) || (value.peers !== undefined && !Array.isArray(value.peers)) || !Array.isArray(value.visible) || !isRecord(value.spaces) || !isRecord(value.drive)) return false;
  return (value.peers === undefined || value.peers.every((peer) => isRecord(peer)
    && typeof peer.key === "string"
    && typeof peer.name === "string"
    && typeof peer.harness === "string"
    && (peer.spawnedBy === null || typeof peer.spawnedBy === "string")
    && (peer.spawnedByName === null || typeof peer.spawnedByName === "string")
    && (peer.worktree === null || typeof peer.worktree === "string")
    && (peer.branch === null || typeof peer.branch === "string")
    && (peer.status === null || isRecord(peer.status))
    && (peer.result === null || typeof peer.result === "string")))
    && value.visible.every((key) => typeof key === "string")
    && Object.values(value.spaces).every((space) => space === null || typeof space === "string")
    && Object.values(value.drive).every(isDriveState);
}
