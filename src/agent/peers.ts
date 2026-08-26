// Peer discovery: everything this agent knows about the OTHER agents sharing
// $ORCH_DIR/agents/. Reads sibling presence directories, resolves a target key,
// appends to a peer's inbox — and registers the pi surface built on top of that
// (`/peers`, `/tell`, `orch_agents`, `orch_send`, `orch_read`).
//
// The counterpart module presence.ts owns THIS agent's own record; the split is
// by subject, not by mechanism. All filesystem access goes through the shared
// presence writer (src/presence/writer.ts) per CLAUDE.md Rule 10.
import * as fs from "node:fs";
import type { HarnessApi, HarnessContext } from "./harness.ts";
import { Type } from "typebox";
import { tryParseIdentity } from "../backends/identity.ts";
import { checkWall, scopeToWorkspace, workspaceOf } from "../policy/workspace.ts";
import { recipientFromStatus, recipientLabel } from "../recipient.ts";
import { INBOX_FILE, RESULT_FILE } from "../presence/schema.ts";
import { presenceAgentDir, presenceFile, presenceRoot, readStatus } from "../presence/writer.ts";
import { orchDir } from "../presence/store.ts";
import { isRecord, optionalString, pidAlive, projectRoot, readJsonFile, truncate, type JsonRecord } from "../util.ts";
// Type-only: erased at compile time, so it creates no runtime edge back to
// presence.ts (which imports this module's peer operations).
import type { AgentPresence } from "./presence.ts";

export interface Peer {
  key: string;
  dir: string;
  status: JsonRecord;
}

export interface PeerSummary {
  key: string;
  /** Display name stamped at launch (or by the plexer); the human spelling of this peer. */
  name?: string;
  /** Harness this peer runs (pi, claude, codex, omp). */
  harness?: string;
  workspace: string | null;
  state: string;
  /** True on the row that is the CALLER's own spawner — the reply target. */
  isSpawner?: true;
  /** Who spawned this peer, so the whole fleet graph is readable from any seat. */
  spawnedBy?: string;
  spawnedByLabel?: string;
  worktree?: string;
  branch?: string;
  model?: string;
  task?: string;
  lastText: string;
  cost?: number;
  updatedAt?: string;
}

interface PeerResolutionError {
  error: string;
}

interface PeerResolutionPeer {
  peer: Peer;
}

export type PeerResolution = PeerResolutionError | PeerResolutionPeer;

export function peerModel(status: unknown): string | undefined {
  if (!isRecord(status) || !isRecord(status.model)) return undefined;
  const provider = optionalString(status.model.provider);
  const id = optionalString(status.model.id);
  if (!provider || !id) return undefined;
  const thinking = optionalString(status.thinking) ?? "";
  return `${provider}/${id}:${thinking}`;
}

/** Only a human's own session may lift the fleet wall. A spawned agent's view
 * and reach never widen past the fleet it belongs to — no flag changes that. */
function callerMayCrossFleets(): boolean {
  return tryParseIdentity(process.env.ORCH_AGENT_KEY) === null;
}

/** The fleet wall: same workspace AND same project, unless explicitly unscoped.
 * One machine runs many projects against one $ORCH_DIR, and a shared plexer
 * session gives them all one workspace — the project is what separates fleets. */
function scopeToFleet(peers: Peer[], ownKey: string, allRequested: boolean): Peer[] {
  const all = allRequested && callerMayCrossFleets();
  const sameWorkspacePeers = scopeToWorkspace(orchDir(), peers, (peer) => peer.key, workspaceOf(orchDir(), ownKey), { all });
  if (all) return sameWorkspacePeers;
  return sameWorkspacePeers.filter((peer) => optionalString(peer.status.project) === projectRoot());
}

// src/backends/identity.ts is the single escaping authority: every serialized
// identity key segment is already percent-escaped on all platforms, so the
// presence directory name IS the key — no remapping (see src/presence/store.ts).
function livePeers(ownKey: string, allWorkspaces = false): Peer[] {
  try {
    const peers = fs.readdirSync(presenceRoot(), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== ownKey)
      .map((entry) => {
        const dir = presenceAgentDir(entry.name);
        return { key: entry.name, dir, status: readStatus(dir) };
      })
      .filter((peer) => pidAlive(peer.status.pid));
    return scopeToFleet(peers, ownKey, allWorkspaces);
  } catch {
    return [];
  }
}

/** The caller's own orchestrator, resolved by the address its launch stamped.
 *  The fleet wall never applies here: the spawner handed this worker its own
 *  address at launch, and replying to it is the one always-valid cross-scope edge. */
function resolveSpawnerPeer(): PeerResolution {
  const key = optionalString(process.env.ORCH_SPAWNER);
  const label = optionalString(process.env.ORCH_SPAWNER_LABEL);
  if (!key) return { error: `error: no spawner address recorded for this agent${label ? ` (spawned by ${label})` : ""}` };
  const dir = presenceAgentDir(key);
  const status = readStatus(dir);
  if (!pidAlive(status.pid)) {
    return { error: `error: spawner ${label ?? key} (${key}) has no live presence inbox to reply to` };
  }
  return { peer: { key, dir, status } };
}

export function resolvePeer(target: string, ownKey: string, allRequested = false): PeerResolution {
  // The stamped spawner address bypasses fleet scoping in BOTH spellings: the
  // alias and the literal key an agent read from its own status.
  if (target === "spawner" || (target.length > 0 && target === optionalString(process.env.ORCH_SPAWNER))) {
    return resolveSpawnerPeer();
  }
  // A spawned agent's flag never lifts the wall; only a human session's does.
  const allWorkspaces = allRequested && callerMayCrossFleets();
  const peers = livePeers(ownKey, true);
  const exact = peers.find((peer) => peer.key === target);
  // Names are addresses too: `orch_send sweep-2 ...` must work exactly like the key.
  const matches = exact
    ? [exact]
    : peers.filter((peer) => peer.key.endsWith(target) || optionalString(peer.status.label) === target);
  const firstMatch = matches[0];
  if (matches.length === 1 && firstMatch) {
    const wall = checkWall(orchDir(), ownKey, firstMatch.key, { crossWorkspace: allWorkspaces });
    if (!wall.allowed) return { error: `error: ${wall.reason}` };
  }
  const scopedMatches = scopeToFleet(matches, ownKey, allWorkspaces);
  const firstScopedMatch = scopedMatches[0];
  if (scopedMatches.length === 1 && firstScopedMatch) return { peer: firstScopedMatch };
  if (scopedMatches.length > 1) {
    return { error: `error: ambiguous target. Candidates: ${scopedMatches.map((peer) => peer.key).join(", ")}` };
  }
  if (matches.length > 1) {
    return { error: `error: ambiguous target. Candidates: ${matches.map((peer) => peer.key).join(", ")}` };
  }
  const candidates = livePeers(ownKey, allWorkspaces);
  return { error: `error: target not found. Candidates: ${candidates.map((peer) => peer.key).join(", ")}` };
}

function summarizePeer(peer: Peer, spawnerKey: string | undefined): PeerSummary {
  return {
    key: peer.key,
    name: optionalString(peer.status.label),
    harness: optionalString(peer.status.agent),
    workspace: workspaceOf(orchDir(), peer.key),
    state: optionalString(peer.status.state) ?? "unknown",
    isSpawner: peer.key === spawnerKey ? true : undefined,
    spawnedBy: optionalString(peer.status.spawnedBy),
    spawnedByLabel: optionalString(peer.status.spawnedByLabel),
    worktree: optionalString(peer.status.worktree),
    branch: optionalString(peer.status.branch),
    model: peerModel(peer.status),
    task: optionalString(peer.status.task),
    lastText: truncate(typeof peer.status.lastText === "string" ? peer.status.lastText : "", 120),
    cost: typeof peer.status.cost === "number" ? peer.status.cost : undefined,
    updatedAt: optionalString(peer.status.updatedAt),
  };
}

/** The caller's spawner as a listable row, when fleet scoping hid it. A worker
 *  must always see who orchestrates it, whatever workspace shape that session has. */
function hiddenSpawnerSummary(rows: PeerSummary[], spawnerKey: string | undefined): PeerSummary | null {
  if (!spawnerKey || rows.some((row) => row.key === spawnerKey)) return null;
  const resolved = resolveSpawnerPeer();
  if ("error" in resolved) return null;
  return summarizePeer(resolved.peer, spawnerKey);
}

export function peerSummaries(ownKey: string, allWorkspaces = false): PeerSummary[] {
  const spawnerKey = optionalString(process.env.ORCH_SPAWNER);
  const rows = livePeers(ownKey, allWorkspaces).map((peer) => summarizePeer(peer, spawnerKey));
  const spawner = hiddenSpawnerSummary(rows, spawnerKey);
  return spawner ? [spawner, ...rows] : rows;
}

/** Append one line to a peer's inbox. The only writer into another agent's
 * presence directory, so both the steer path and the handoff path share it. */
export function appendPeerInbox(peerDir: string, text: string): void {
  fs.appendFileSync(
    presenceFile(peerDir, INBOX_FILE),
    `${JSON.stringify({ text, ts: new Date().toISOString() })}\n`,
  );
}

export function sendPeerMessage(target: string, text: string, ownKey: string, allWorkspaces = false): string {
  const resolved = resolvePeer(target, ownKey, allWorkspaces);
  if ("error" in resolved) return resolved.error;
  // The receiver learns the sender's NAME with the key beside it as the reply
  // address — both sides of every message carry full identity.
  const ownName = optionalString(readStatus(presenceAgentDir(ownKey)).label);
  appendPeerInbox(resolved.peer.dir, `[from ${ownName ? `${ownName} (${ownKey})` : ownKey}] ${text}`);
  // The sender knows a peer by its name and harness, not by the transport key that routed there.
  return `sent to ${recipientLabel(recipientFromStatus(resolved.peer.key, workspaceOf(orchDir(), resolved.peer.key) ?? "workspace", resolved.peer.status))}`;
}

export function formatPeerLines(peers: PeerSummary[]): string {
  return peers
    .map((peer) => `${peer.name ?? peer.key}${peer.branch ? ` [${peer.branch}]` : ""} ${peer.state} ${peer.model ?? "-"} ${truncate(String(peer.task ?? ""), 40)}`)
    .join("\n");
}

export interface BridgeToolResult {
  content: [{ type: "text"; text: string }];
  details: undefined;
}

export function toolResult(text: string): BridgeToolResult {
  return { content: [{ type: "text", text }], details: undefined };
}

export async function executeTool(action: () => string | Promise<string>, error: string): Promise<BridgeToolResult> {
  try {
    return toolResult(await action());
  } catch {
    return toolResult(error);
  }
}

interface OrchSendParams {
  target: string;
  text: string;
  cross_workspace?: boolean;
  allWorkspaces?: boolean;
}

interface OrchReadParams {
  target: string;
  cross_workspace?: boolean;
  allWorkspaces?: boolean;
}

interface OrchAgentsParams {
  all_workspaces?: boolean;
  allWorkspaces?: boolean;
}

/** Registers the commands and tools through which this agent reaches its peers. */
export function registerPeerTools(harness: HarnessApi, presence: AgentPresence): void {
  harness.registerCommand("peers", {
    description: "List live orch peer agents",
    handler: (_args, ctx) => {
      try {
        const peers = peerSummaries(presence.ownPresenceKey(ctx));
        ctx.ui.notify(peers.length ? formatPeerLines(peers) : "no live peers", "info");
      } catch {
        ctx.ui.notify("no live peers", "info");
      }
      return Promise.resolve();
    },
  });

  harness.registerCommand("tell", {
    description: "Send a message to a peer agent: /tell <target> <message>",
    handler: (args, ctx) => {
      try {
        const [target, ...message] = String(args ?? "").trim().split(/\s+/);
        const text = message.join(" ");
        if (!target || !text) {
          ctx.ui.notify("error: usage /tell <target> <message>", "error");
          return Promise.resolve();
        }
        const result = sendPeerMessage(target, text, presence.ownPresenceKey(ctx));
        ctx.ui.notify(result, result.startsWith("sent to ") ? "info" : "error");
      } catch {
        ctx.ui.notify("error: unable to send peer message", "error");
      }
      return Promise.resolve();
    },
  });

  harness.registerTool({
    name: "orch_agents",
    label: "Orchestrator Agents",
    description: "List live peer agents managed by the orchestrator.",
    promptSnippet: "Discover live orchestrator peer agents and their compact status",
    promptGuidelines: ["Use orch_agents to discover live peer agents before sending or reading peer messages."],
    parameters: Type.Object({
      all_workspaces: Type.Optional(Type.Boolean({ description: "Include agents in every workspace" })),
      // Keep the original camelCase spelling for existing callers.
      allWorkspaces: Type.Optional(Type.Boolean({ description: "Include agents in every workspace" })),
    }),
    async execute(_toolCallId, params: OrchAgentsParams, _signal, _onUpdate, ctx: HarnessContext) {
      return executeTool(
        () => JSON.stringify(peerSummaries(
          presence.ownPresenceKey(ctx),
          params.all_workspaces === true || params.allWorkspaces === true,
        )),
        "error: unable to list peer agents",
      );
    },
  });

  harness.registerTool({
    name: "orch_send",
    label: "Send to Orchestrator Agent",
    description: "Send a coordination message to a live peer agent.",
    promptSnippet: "Send a finding or request to a live orchestrator peer agent",
    promptGuidelines: ["Use orch_send to hand findings, requests, or coordination notes to another agent. Target \"spawner\" reaches the session that spawned you."],
    parameters: Type.Object({
      target: Type.String({ description: "Peer name, key, unique key suffix, or \"spawner\" (the session that spawned this agent)" }),
      text: Type.String({ description: "Message to send" }),
      cross_workspace: Type.Optional(Type.Boolean({ description: "Allow sending across workspaces" })),
      // Keep the original spelling for existing callers.
      allWorkspaces: Type.Optional(Type.Boolean({ description: "Allow sending across workspaces" })),
    }),
    async execute(_toolCallId, params: OrchSendParams, _signal, _onUpdate, ctx: HarnessContext) {
      const crossWorkspace = params.cross_workspace === true || params.allWorkspaces === true;
      return executeTool(
        () => sendPeerMessage(params.target, params.text, presence.ownPresenceKey(ctx), crossWorkspace),
        "error: unable to send peer message",
      );
    },
  });

  harness.registerTool({
    name: "orch_read",
    label: "Read Orchestrator Agent",
    description: "Read a live peer agent's latest result or status text.",
    promptSnippet: "Read a live orchestrator peer agent's latest result or status",
    promptGuidelines: ["Use orch_read to inspect a peer agent's latest result or status text."],
    parameters: Type.Object({
      target: Type.String({ description: "Peer name, key, unique key suffix, or \"spawner\"" }),
      cross_workspace: Type.Optional(Type.Boolean({ description: "Allow reading across workspaces" })),
      // Keep the original spelling for existing callers.
      allWorkspaces: Type.Optional(Type.Boolean({ description: "Allow reading across workspaces" })),
    }),
    async execute(_toolCallId, params: OrchReadParams, _signal, _onUpdate, ctx: HarnessContext) {
      const crossWorkspace = params.cross_workspace === true || params.allWorkspaces === true;
      return executeTool(() => {
        const ownKey = presence.ownPresenceKey(ctx);
        const resolved = resolvePeer(params.target, ownKey, crossWorkspace);
        if ("error" in resolved) return resolved.error;
        const result = readJsonFile(presenceFile(resolved.peer.dir, RESULT_FILE));
        const resultRecord = isRecord(result) ? result : {};
        const text = typeof resultRecord.text === "string"
          ? resultRecord.text
          : typeof resolved.peer.status.lastText === "string" ? resolved.peer.status.lastText : "";
        return JSON.stringify({
          key: resolved.peer.key,
          workspace: workspaceOf(orchDir(), resolved.peer.key),
          state: optionalString(resolved.peer.status.state) ?? "unknown",
          model: peerModel(resolved.peer.status),
          text,
        });
      }, "error: unable to read peer agent");
    },
  });
}
