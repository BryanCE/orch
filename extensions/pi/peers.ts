// Peer discovery: everything this agent knows about the OTHER agents sharing
// $ORCH_DIR/agents/. Reads sibling presence directories, resolves a target key,
// appends to a peer's inbox — and registers the pi surface built on top of that
// (`/peers`, `/tell`, `orch_agents`, `orch_send`, `orch_read`).
//
// The counterpart module presence.ts owns THIS agent's own record; the split is
// by subject, not by mechanism. All filesystem access goes through the shared
// presence writer (src/presence/writer.ts) per CLAUDE.md Rule 10.
import * as fs from "node:fs";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { checkWall, scopeToWorkspace, workspaceOf } from "../../src/policy/workspace.ts";
import { INBOX_FILE, RESULT_FILE } from "../../src/presence/schema.ts";
import { presenceAgentDir, presenceFile, presenceRoot, readStatus } from "../../src/presence/writer.ts";
import { isRecord, optionalString, pidAlive, readJsonFile, truncate, type JsonRecord } from "../../src/util.ts";
// Type-only: erased at compile time, so it creates no runtime edge back to
// presence.ts (which imports this module's peer operations).
import type { PiPresence } from "./presence.ts";

export interface Peer {
  key: string;
  dir: string;
  status: JsonRecord;
}

export interface PeerSummary {
  key: string;
  workspace: string | null;
  state: string;
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
    return scopeToWorkspace(peers, (peer) => peer.key, workspaceOf(ownKey), { all: allWorkspaces });
  } catch {
    return [];
  }
}

export function resolvePeer(target: string, ownKey: string, allWorkspaces = false): PeerResolution {
  const peers = livePeers(ownKey, true);
  const exact = peers.find((peer) => peer.key === target);
  const matches = exact ? [exact] : peers.filter((peer) => peer.key.endsWith(target));
  const firstMatch = matches[0];
  if (matches.length === 1 && firstMatch) {
    const wall = checkWall(ownKey, firstMatch.key, { crossWorkspace: allWorkspaces });
    if (!wall.allowed) return { error: `error: ${wall.reason}` };
  }
  const scopedMatches = scopeToWorkspace(matches, (peer) => peer.key, workspaceOf(ownKey), { all: allWorkspaces });
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

export function peerSummaries(ownKey: string, allWorkspaces = false): PeerSummary[] {
  return livePeers(ownKey, allWorkspaces).map((peer) => ({
    key: peer.key,
    workspace: workspaceOf(peer.key),
    state: optionalString(peer.status.state) ?? "unknown",
    model: peerModel(peer.status),
    task: optionalString(peer.status.task),
    lastText: truncate(typeof peer.status.lastText === "string" ? peer.status.lastText : "", 120),
    cost: typeof peer.status.cost === "number" ? peer.status.cost : undefined,
    updatedAt: optionalString(peer.status.updatedAt),
  }));
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
  appendPeerInbox(resolved.peer.dir, `[from ${ownKey}] ${text}`);
  return `sent to ${resolved.peer.key}`;
}

export function formatPeerLines(peers: PeerSummary[]): string {
  return peers
    .map((peer) => `${peer.key} ${peer.state} ${peer.model ?? "-"} ${truncate(String(peer.task ?? ""), 40)}`)
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
export function registerPeerTools(pi: ExtensionAPI, presence: PiPresence): void {
  pi.registerCommand("peers", {
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

  pi.registerCommand("tell", {
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

  pi.registerTool({
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
    async execute(_toolCallId, params: OrchAgentsParams, _signal, _onUpdate, ctx: ExtensionContext) {
      return executeTool(
        () => JSON.stringify(peerSummaries(
          presence.ownPresenceKey(ctx),
          params.all_workspaces === true || params.allWorkspaces === true,
        )),
        "error: unable to list peer agents",
      );
    },
  });

  pi.registerTool({
    name: "orch_send",
    label: "Send to Orchestrator Agent",
    description: "Send a coordination message to a live peer agent.",
    promptSnippet: "Send a finding or request to a live orchestrator peer agent",
    promptGuidelines: ["Use orch_send to hand findings, requests, or coordination notes to another agent."],
    parameters: Type.Object({
      target: Type.String({ description: "Peer key or unique key suffix" }),
      text: Type.String({ description: "Message to send" }),
      cross_workspace: Type.Optional(Type.Boolean({ description: "Allow sending across workspaces" })),
      // Keep the original spelling for existing callers.
      allWorkspaces: Type.Optional(Type.Boolean({ description: "Allow sending across workspaces" })),
    }),
    async execute(_toolCallId, params: OrchSendParams, _signal, _onUpdate, ctx: ExtensionContext) {
      const crossWorkspace = params.cross_workspace === true || params.allWorkspaces === true;
      return executeTool(
        () => sendPeerMessage(params.target, params.text, presence.ownPresenceKey(ctx), crossWorkspace),
        "error: unable to send peer message",
      );
    },
  });

  pi.registerTool({
    name: "orch_read",
    label: "Read Orchestrator Agent",
    description: "Read a live peer agent's latest result or status text.",
    promptSnippet: "Read a live orchestrator peer agent's latest result or status",
    promptGuidelines: ["Use orch_read to inspect a peer agent's latest result or status text."],
    parameters: Type.Object({
      target: Type.String({ description: "Peer key or unique key suffix" }),
      cross_workspace: Type.Optional(Type.Boolean({ description: "Allow reading across workspaces" })),
      // Keep the original spelling for existing callers.
      allWorkspaces: Type.Optional(Type.Boolean({ description: "Allow reading across workspaces" })),
    }),
    async execute(_toolCallId, params: OrchReadParams, _signal, _onUpdate, ctx: ExtensionContext) {
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
          workspace: workspaceOf(resolved.peer.key),
          state: optionalString(resolved.peer.status.state) ?? "unknown",
          model: peerModel(resolved.peer.status),
          text,
        });
      }, "error: unable to read peer agent");
    },
  });
}
