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
import { term } from "../policy/vocabulary.ts";
import { recipientFromStatus, recipientLabel } from "../recipient.ts";
import { INBOX_FILE } from "../presence/schema.ts";
import { presenceAgentDir, presenceFile, presenceRoot, readLatestResult, readStatus } from "../presence/writer.ts";
import { isRecord, optionalString, pidAlive, projectRoot, truncate } from "../util.ts";
// Type-only: erased at compile time, so it creates no runtime edge back to
// presence.ts (which imports this module's peer operations).
import type { AgentPresence, BridgeToolResult, DaemonClient, DriveState, HarnessApi, HarnessContext, Peer, PeerResolution, PeerSummary } from "../types/agent.ts";
import type { PeerView } from "../daemon/peer-view.ts";

function peerModel(status: unknown): string | undefined {
  if (!isRecord(status) || !isRecord(status.model)) return undefined;
  const provider = optionalString(status.model.provider);
  const id = optionalString(status.model.id);
  if (!provider || !id) return undefined;
  const thinking = optionalString(status.thinking) ?? "";
  return `${provider}/${id}:${thinking}`;
}


// A key is one minted id: lowercase alphanumerics, nothing a filesystem has to
// escape and nothing to split apart. So the presence directory name IS the key,
// with no encoding step either way (see src/presence/store.ts).
function isDriveState(value: unknown): value is DriveState {
  return isRecord(value)
    && (value.kind === "leased" || value.kind === "unleased")
    && typeof value.owner === "string"
    && typeof value.mine === "boolean";
}

function isPeerView(value: unknown): value is PeerView {
  if (!isRecord(value) || !Array.isArray(value.visible) || !isRecord(value.spaces) || !isRecord(value.drive)) return false;
  return value.visible.every((key) => typeof key === "string")
    && Object.values(value.spaces).every((space) => space === null || typeof space === "string")
    && Object.values(value.drive).every(isDriveState);
}

async function peerViewFor(daemon: DaemonClient, ownKey: string, keys: string[], allSpaces: boolean): Promise<PeerView | undefined> {
  const answer = await daemon.ask("peer-view", { ownKey, keys, allSpaces });
  return isPeerView(answer) ? answer : undefined;
}

async function livePeers(daemon: DaemonClient, ownKey: string, allSpaces = false): Promise<{ peers: Peer[]; view: PeerView } | undefined> {
  try {
    const peers = fs.readdirSync(presenceRoot(), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== ownKey)
      .map((entry) => { const dir = presenceAgentDir(entry.name); return { key: entry.name, dir, status: readStatus(dir) }; })
      .filter((peer) => pidAlive(peer.status.pid))
      .sort((left, right) => left.key.localeCompare(right.key));
    const view = await peerViewFor(daemon, ownKey, peers.map((peer) => peer.key), allSpaces);
    if (!view) return undefined;
    const visible = new Set(view.visible);
    const scoped = peers.filter((peer) => visible.has(peer.key)
      && (allSpaces || optionalString(peer.status.project) === projectRoot()));
    return { peers: scoped, view };
  } catch {
    return undefined;
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
const UNREACHABLE_SPAWNER_ADVICE = " Write your result and end the turn; it is collected from your result file.";

/** Resolve the stamped spawner only when its live presence can receive a message. */
function liveSpawnerPeer(): Peer | undefined {
  const key = optionalString(process.env.ORCH_SPAWNER);
  if (!key) return undefined;
  const dir = presenceAgentDir(key);
  const status = readStatus(dir);
  if (!pidAlive(status.pid) || !fs.existsSync(presenceFile(dir, INBOX_FILE))) return undefined;
  return { key, dir, status };
}

/** Whether the stamped spawner has a live process and a mailbox to receive messages. */
export function spawnerReachable(): boolean {
  return liveSpawnerPeer() !== undefined;
}

/** The caller's own orchestrator, resolved by the address its launch stamped.
 *  The fleet wall never applies here: the spawner handed this worker its own
 *  address at launch, and replying to it is the one always-valid cross-scope edge. */
function resolveSpawnerPeer(): PeerResolution {
  const key = optionalString(process.env.ORCH_SPAWNER);
  const label = optionalString(process.env.ORCH_SPAWNER_LABEL);
  if (!key) return { error: `error: no spawner address recorded for this agent${label ? ` (spawned by ${label})` : ""}.${UNREACHABLE_SPAWNER_ADVICE}` };
  const peer = liveSpawnerPeer();
  if (!peer) {
    return { error: `error: spawner ${label ?? key} (${key}) has no live presence inbox to reply to.${UNREACHABLE_SPAWNER_ADVICE}` };
  }
  return { peer };
}

export async function resolvePeer(daemon: DaemonClient, target: string, ownKey: string, allRequested = false): Promise<PeerResolution> {
  if (target === "spawner" || (target.length > 0 && target === optionalString(process.env.ORCH_SPAWNER))) return resolveSpawnerPeer();
  const live = await livePeers(daemon, ownKey, allRequested);
  if (!live) return { error: "error: peer view unavailable" };
  const exact = live.peers.find((peer) => peer.key === target);
  const matches = exact ? [exact] : live.peers.filter((peer) => peer.key.endsWith(target) || optionalString(peer.status.label) === target);
  if (matches.length === 1 && matches[0]) return { peer: matches[0] };
  if (matches.length > 1) return { error: `error: ambiguous target. Candidates: ${matches.map((peer) => peer.key).join(", ")}` };
  return { error: `error: target not found. Candidates: ${live.peers.map((peer) => peer.key).join(", ")}` };
}

function summarizePeer(peer: Peer, view: PeerView, spawnerKey: string | undefined): PeerSummary {
  return {
    key: peer.key,
    name: optionalString(peer.status.label),
    harness: optionalString(peer.status.agent),
    space: view.spaces[peer.key] ?? null,
    state: optionalString(peer.status.state) ?? "unknown",
    drive: view.drive[peer.key] ?? { kind: "unleased", owner: "unleased", mine: false },
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
function hiddenSpawnerSummary(rows: PeerSummary[], view: PeerView, spawnerKey: string | undefined): PeerSummary | null {
  if (!spawnerKey || rows.some((row) => row.key === spawnerKey)) return null;
  const resolved = resolveSpawnerPeer();
  if ("error" in resolved) return null;
  return summarizePeer(resolved.peer, view, spawnerKey);
}

/** The caller's own agents.id, so "held by you" is answered by the lease table
 *  rather than by an environment the caller happens to sit in. The key IS that
 *  id — there is no segment to pull out of it — and a key that is not one
 *  addresses no agent, so the caller holds nothing. */


export async function peerSummaries(daemon: DaemonClient, ownKey: string, allSpaces = false): Promise<PeerSummary[]> {
  const live = await livePeers(daemon, ownKey, allSpaces);
  if (!live) return [];
  const spawnerKey = optionalString(process.env.ORCH_SPAWNER);
  const rows = live.peers.map((peer) => summarizePeer(peer, live.view, spawnerKey));
  const spawner = hiddenSpawnerSummary(rows, live.view, spawnerKey);
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

export async function sendPeerMessage(daemon: DaemonClient, target: string, text: string, ownKey: string, allSpaces = false): Promise<string> {
  const resolved = await resolvePeer(daemon, target, ownKey, allSpaces);
  if ("error" in resolved) return resolved.error;
  // The receiver learns the sender's NAME with the key beside it as the reply
  // address — both sides of every message carry full identity.
  const ownName = optionalString(readStatus(presenceAgentDir(ownKey)).label);
  appendPeerInbox(resolved.peer.dir, `[from ${ownName ? `${ownName} (${ownKey})` : ownKey}] ${text}`);
  // The sender knows a peer by its name and harness, not by the transport key that routed there.
  const live = await livePeers(daemon, ownKey, allSpaces);
  const space = live?.view.spaces[resolved.peer.key] ?? null;
  return `sent to ${recipientLabel(recipientFromStatus(resolved.peer.key, space ?? "", resolved.peer.status))}`;
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
export function registerPeerTools(harness: HarnessApi, presence: AgentPresence, daemon: DaemonClient): void {
  harness.registerCommand("peers", {
    description: "List live orch peer agents",
    handler: (_args, ctx) => {
      try {
        void peerSummaries(daemon, presence.ownPresenceKey(ctx)).then((peers) => {
          ctx.ui.notify(peers.length ? formatPeerLines(peers) : "no live peers", "info");
        });
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
        void sendPeerMessage(daemon, target, text, presence.ownPresenceKey(ctx)).then((result) => {
          ctx.ui.notify(result, result.startsWith("sent to ") ? "info" : "error");
        });
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
        async () => JSON.stringify(await peerSummaries(
          daemon,
          presence.ownPresenceKey(ctx),
          params.all_spaces === true || params.allSpaces === true,
        )),
        "error: unable to list peer agents",
      );
    },
  });

  if (spawnerReachable()) {
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
          () => sendPeerMessage(daemon, params.target, params.text, presence.ownPresenceKey(ctx), crossSpace),
          "error: unable to send peer message",
        );
      },
    });
  }

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
      return executeTool(async () => {
        const ownKey = presence.ownPresenceKey(ctx);
        const resolved = await resolvePeer(daemon, params.target, ownKey, crossSpace);
        if ("error" in resolved) return resolved.error;
        const resultRecord = readLatestResult(resolved.peer.dir) ?? {};
        const text = typeof resultRecord.text === "string"
          ? resultRecord.text
          : typeof resolved.peer.status.lastText === "string" ? resolved.peer.status.lastText : "";
        return JSON.stringify({
          key: resolved.peer.key,
          space: null,
          state: optionalString(resolved.peer.status.state) ?? "unknown",
          model: peerModel(resolved.peer.status),
          text,
        });
      }, "error: unable to read peer agent");
    },
  });
}
