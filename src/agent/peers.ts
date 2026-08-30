// Peer discovery: everything this agent knows about the OTHER agents sharing
// $ORCH_DIR/agents/. Reads sibling presence directories, resolves a target key,
// appends to a peer's inbox — and registers the pi surface built on top of that
// (`/peers`, `/tell`, `orch_agents`, `orch_send`, `orch_read`).
//
// The counterpart module presence.ts owns THIS agent's own record; the split is
// by subject, not by mechanism. All filesystem access goes through the shared
// presence writer (src/presence/writer.ts) per CLAUDE.md Rule 10.
import * as fs from "node:fs";
import { Type } from "typebox";
import { isAgentId } from "../backends/identity.ts";
import { deriveDriveState } from "./drive-state.ts";
import { callerKind } from "../policy/caller.ts";
import { checkWall, scopeToSpace, spaceOf } from "../policy/space.ts";
import { term } from "../policy/vocabulary.ts";
import { recipientFromStatus, recipientLabel } from "../recipient.ts";
import { INBOX_FILE, RESULT_FILE } from "../presence/schema.ts";
import { presenceAgentDir, presenceFile, presenceRoot, readStatus } from "../presence/writer.ts";
import { orchDir } from "../presence/store.ts";
import { isRecord, optionalString, pidAlive, projectRoot, readJsonFile, truncate } from "../util.ts";
// Type-only: erased at compile time, so it creates no runtime edge back to
// presence.ts (which imports this module's peer operations).
import type { AgentPresence, BridgeToolResult, HarnessApi, HarnessContext, Peer, PeerResolution, PeerSummary } from "../types/agent.ts";

function peerModel(status: unknown): string | undefined {
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
  return callerKind() === "human";
}

/** The fleet wall: same space AND same project, unless explicitly unscoped.
 * One machine runs many projects against one $ORCH_DIR, and a shared plexer
 * session gives them all one space — the project is what separates fleets. */
function scopeToFleet(peers: Peer[], ownKey: string, allRequested: boolean): Peer[] {
  const all = allRequested && callerMayCrossFleets();
  const sameSpacePeers = scopeToSpace(orchDir(), peers, (peer) => peer.key, spaceOf(orchDir(), ownKey), { all });
  if (all) return sameSpacePeers;
  return sameSpacePeers.filter((peer) => optionalString(peer.status.project) === projectRoot());
}

// A key is one minted id: lowercase alphanumerics, nothing a filesystem has to
// escape and nothing to split apart. So the presence directory name IS the key,
// with no encoding step either way (see src/presence/store.ts).
function livePeers(ownKey: string, allSpaces = false): Peer[] {
  try {
    const peers = fs.readdirSync(presenceRoot(), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== ownKey)
      .map((entry) => {
        const dir = presenceAgentDir(entry.name);
        return { key: entry.name, dir, status: readStatus(dir) };
      })
      .filter((peer) => pidAlive(peer.status.pid));
    return scopeToFleet(peers, ownKey, allSpaces);
  } catch {
    return [];
  }
}

/**
 * L6: what to do when the spawner cannot be reached.
 *
 * A bare refusal is a dead end, and a worker handed a dead end improvises. It
 * did, live: two of four research agents spent their whole turn relaying
 * `orch_send` to each other and returned chatter instead of their report. The
 * refusal has to carry the answer, and the answer is never another agent — a
 * sibling has no more access to the spawner than the caller does, so a relay
 * costs a turn and delivers nothing.
 */
const UNREACHABLE_SPAWNER_ADVICE =
  " Write your result and END the turn - it is collected from your result file."
  + " Do NOT route your report through another agent; a sibling cannot reach it either.";

/** The caller's own orchestrator, resolved by the address its launch stamped.
 *  The fleet wall never applies here: the spawner handed this worker its own
 *  address at launch, and replying to it is the one always-valid cross-scope edge. */
function resolveSpawnerPeer(): PeerResolution {
  const key = optionalString(process.env.ORCH_SPAWNER);
  const label = optionalString(process.env.ORCH_SPAWNER_LABEL);
  if (!key) return { error: `error: no spawner address recorded for this agent${label ? ` (spawned by ${label})` : ""}.${UNREACHABLE_SPAWNER_ADVICE}` };
  const dir = presenceAgentDir(key);
  const status = readStatus(dir);
  if (!pidAlive(status.pid)) {
    return { error: `error: spawner ${label ?? key} (${key}) has no live presence inbox to reply to.${UNREACHABLE_SPAWNER_ADVICE}` };
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
  const allSpaces = allRequested && callerMayCrossFleets();
  const peers = livePeers(ownKey, true);
  const exact = peers.find((peer) => peer.key === target);
  // Names are addresses too: `orch_send sweep-2 ...` must work exactly like the key.
  const matches = exact
    ? [exact]
    : peers.filter((peer) => peer.key.endsWith(target) || optionalString(peer.status.label) === target);
  const firstMatch = matches[0];
  if (matches.length === 1 && firstMatch) {
    const wall = checkWall(orchDir(), ownKey, firstMatch.key, { crossSpace: allSpaces });
    if (!wall.allowed) return { error: `error: ${wall.reason}` };
  }
  const scopedMatches = scopeToFleet(matches, ownKey, allSpaces);
  const firstScopedMatch = scopedMatches[0];
  if (scopedMatches.length === 1 && firstScopedMatch) return { peer: firstScopedMatch };
  if (scopedMatches.length > 1) {
    return { error: `error: ambiguous target. Candidates: ${scopedMatches.map((peer) => peer.key).join(", ")}` };
  }
  if (matches.length > 1) {
    return { error: `error: ambiguous target. Candidates: ${matches.map((peer) => peer.key).join(", ")}` };
  }
  const candidates = livePeers(ownKey, allSpaces);
  return { error: `error: target not found. Candidates: ${candidates.map((peer) => peer.key).join(", ")}` };
}

function summarizePeer(peer: Peer, spawnerKey: string | undefined, callerOrchId: string | null): PeerSummary {
  return {
    key: peer.key,
    name: optionalString(peer.status.label),
    harness: optionalString(peer.status.agent),
    space: spaceOf(orchDir(), peer.key),
    state: optionalString(peer.status.state) ?? "unknown",
    drive: deriveDriveState(peer.key, { directory: orchDir(), currentOrchId: callerOrchId }),
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
 *  must always see who orchestrates it, whatever space shape that session has. */
function hiddenSpawnerSummary(rows: PeerSummary[], spawnerKey: string | undefined, callerOrchId: string | null): PeerSummary | null {
  if (!spawnerKey || rows.some((row) => row.key === spawnerKey)) return null;
  const resolved = resolveSpawnerPeer();
  if ("error" in resolved) return null;
  return summarizePeer(resolved.peer, spawnerKey, callerOrchId);
}

/** The caller's own agents.id, so "held by you" is answered by the lease table
 *  rather than by an environment the caller happens to sit in. The key IS that
 *  id — there is no segment to pull out of it — and a key that is not one
 *  addresses no agent, so the caller holds nothing. */
function callerAgentId(ownKey: string): string | null {
  return isAgentId(ownKey) ? ownKey : null;
}

export function peerSummaries(ownKey: string, allSpaces = false): PeerSummary[] {
  const spawnerKey = optionalString(process.env.ORCH_SPAWNER);
  const orchId = callerAgentId(ownKey);
  const rows = livePeers(ownKey, allSpaces).map((peer) => summarizePeer(peer, spawnerKey, orchId));
  const spawner = hiddenSpawnerSummary(rows, spawnerKey, orchId);
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

export function sendPeerMessage(target: string, text: string, ownKey: string, allSpaces = false): string {
  const resolved = resolvePeer(target, ownKey, allSpaces);
  if ("error" in resolved) return resolved.error;
  // The receiver learns the sender's NAME with the key beside it as the reply
  // address — both sides of every message carry full identity.
  const ownName = optionalString(readStatus(presenceAgentDir(ownKey)).label);
  appendPeerInbox(resolved.peer.dir, `[from ${ownName ? `${ownName} (${ownKey})` : ownKey}] ${text}`);
  // The sender knows a peer by its name and harness, not by the transport key that routed there.
  return `sent to ${recipientLabel(recipientFromStatus(resolved.peer.key, spaceOf(orchDir(), resolved.peer.key) ?? "", resolved.peer.status))}`;
}

/** Header of the orphan bucket. G9 wants unleased agents SEPARATED from live
 *  work, not merely labelled, and D8 wants the adoption offer said out loud. */
const UNLEASED_HEADING = "unleased (no orch driving these; `orch adopt` takes them):";

function peerLine(peer: PeerSummary): string {
  return `${peer.name ?? peer.key}${peer.branch ? ` [${peer.branch}]` : ""} ${peer.state} ${peer.model ?? "-"} ${truncate(String(peer.task ?? ""), 40)}`;
}

/** Who is driving, in the caller's own terms — never "yours" unless the caller
 *  holds the lease, and a dead holder reads as gone rather than as a driver. */
function driveSuffix(peer: PeerSummary): string {
  if (peer.drive.kind === "leased") return peer.drive.mine ? "held by you" : `held by ${peer.drive.owner}`;
  return peer.drive.owner;
}

/** The compact listing an agent reads. Two buckets, never one: live work first,
 *  then everything no live orch is driving. */
export function formatPeerLines(peers: PeerSummary[]): string {
  const driven = peers.filter((peer) => peer.drive.kind === "leased");
  const unleased = peers.filter((peer) => peer.drive.kind !== "leased");
  const sections: string[] = [];
  if (driven.length > 0) sections.push(driven.map((peer) => `${peerLine(peer)} — ${driveSuffix(peer)}`).join("\n"));
  if (unleased.length > 0) {
    sections.push([UNLEASED_HEADING, ...unleased.map((peer) => `${peerLine(peer)} — ${driveSuffix(peer)}`)].join("\n"));
  }
  return sections.join("\n\n");
}

export function toolResult(text: string): BridgeToolResult {
  return { content: [{ type: "text", text }], details: undefined };
}

async function executeTool(action: () => string | Promise<string>, error: string): Promise<BridgeToolResult> {
  try {
    return toolResult(await action());
  } catch {
    return toolResult(error);
  }
}

interface OrchSendParams {
  target: string;
  text: string;
  cross_spaces?: boolean;
  allSpaces?: boolean;
}

interface OrchReadParams {
  target: string;
  cross_spaces?: boolean;
  allSpaces?: boolean;
}

interface OrchAgentsParams {
  all_spaces?: boolean;
  allSpaces?: boolean;
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
    label: `${term("orch")} Agents`,
    description: `List live peer agents managed by the ${term("orch")}.`,
    promptSnippet: `Discover live ${term("orch")} peer agents and their compact status`,
    promptGuidelines: ["Use orch_agents to discover live peer agents before sending or reading peer messages."],
    parameters: Type.Object({
      all_spaces: Type.Optional(Type.Boolean({ description: "Include agents in every space" })),
      allSpaces: Type.Optional(Type.Boolean({ description: "Include agents in every space" })),
    }),
    async execute(_toolCallId, params: OrchAgentsParams, _signal, _onUpdate, ctx: HarnessContext) {
      return executeTool(
        () => JSON.stringify(peerSummaries(
          presence.ownPresenceKey(ctx),
          params.all_spaces === true || params.allSpaces === true,
        )),
        "error: unable to list peer agents",
      );
    },
  });

  harness.registerTool({
    name: "orch_send",
    label: `Send to ${term("orch")} Agent`,
    description: "Send a coordination message to a live peer agent.",
    promptSnippet: `Send a finding or request to a live ${term("orch")} peer agent`,
    promptGuidelines: ["Use orch_send to hand findings, requests, or coordination notes to another agent. Target \"spawner\" reaches the session that spawned you."],
    parameters: Type.Object({
      target: Type.String({ description: "Peer name, key, unique key suffix, or \"spawner\" (the session that spawned this agent)" }),
      text: Type.String({ description: "Message to send" }),
      cross_spaces: Type.Optional(Type.Boolean({ description: "Allow sending across spaces" })),
      allSpaces: Type.Optional(Type.Boolean({ description: "Allow sending across spaces" })),
    }),
    async execute(_toolCallId, params: OrchSendParams, _signal, _onUpdate, ctx: HarnessContext) {
      const crossSpace = params.cross_spaces === true || params.allSpaces === true;
      return executeTool(
        () => sendPeerMessage(params.target, params.text, presence.ownPresenceKey(ctx), crossSpace),
        "error: unable to send peer message",
      );
    },
  });

  harness.registerTool({
    name: "orch_read",
    label: `Read ${term("orch")} Agent`,
    description: "Read a live peer agent's latest result or status text.",
    promptSnippet: `Read a live ${term("orch")} peer agent's latest result or status`,
    promptGuidelines: ["Use orch_read to inspect a peer agent's latest result or status text."],
    parameters: Type.Object({
      target: Type.String({ description: "Peer name, key, unique key suffix, or \"spawner\"" }),
      cross_spaces: Type.Optional(Type.Boolean({ description: "Allow reading across spaces" })),
      allSpaces: Type.Optional(Type.Boolean({ description: "Allow reading across spaces" })),
    }),
    async execute(_toolCallId, params: OrchReadParams, _signal, _onUpdate, ctx: HarnessContext) {
      const crossSpace = params.cross_spaces === true || params.allSpaces === true;
      return executeTool(() => {
        const ownKey = presence.ownPresenceKey(ctx);
        const resolved = resolvePeer(params.target, ownKey, crossSpace);
        if ("error" in resolved) return resolved.error;
        const result = readJsonFile(presenceFile(resolved.peer.dir, RESULT_FILE));
        const resultRecord = isRecord(result) ? result : {};
        const text = typeof resultRecord.text === "string"
          ? resultRecord.text
          : typeof resolved.peer.status.lastText === "string" ? resolved.peer.status.lastText : "";
        return JSON.stringify({
          key: resolved.peer.key,
          space: spaceOf(orchDir(), resolved.peer.key),
          state: optionalString(resolved.peer.status.state) ?? "unknown",
          model: peerModel(resolved.peer.status),
          text,
        });
      }, "error: unable to read peer agent");
    },
  });
}
