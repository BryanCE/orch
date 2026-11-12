// Type-only: `typeof` over a runtime binding, erased at compile time, so this
// creates no runtime edge out of the types layer.
import type { ENVIRONMENT_AXES } from "../store/agent-view.ts";
import type { HostedProcess } from "./process.ts";
import type { OutboxPayload } from "../shared/bridge-message.ts";
import type { CallerKind, ThinkingLevel } from "./policy.ts";
import type { AgentOrigin, HostId, HostIdentity } from "./host.ts";
import type { FormId } from "./form.ts";

export interface AgentInput {
  id: string;
  spawnedBy?: string | null;
  harnessId: string;
  /** The host the agent runs on, this machine included, and the directory it runs in there:
   *  its first `agent_hosts` row, written with the agent row. */
  host: HostIdentity;
  cwd: string;
  name: string;
  label?: string | null;
  createdAt: number;
}

export interface AgentEnding { endedAt: number; closedBy: string | null }

export interface SessionAgentIdentity {
  readonly id: string;
  readonly label: string;
  readonly kind: "session";
}

export interface SessionAgentInput {
  pid: number;
  startToken: string;
  /** The harness's own stable session token, when it exports one. It, not the
   *  process pair, is what keeps ONE session on ONE agent id for its whole life. */
  sessionToken?: string | null;
  harnessId: string;
  cwd: string;
  label: string;
  /** The host the session's process runs on, as that host names itself. */
  host: HostIdentity;
  /** Plexer observed by the registering session, when it runs in one. */
  plexerId?: string | null;
  plexerVersion?: string | null;
  /** The place the session occupies in that plexer. Recorded so a spawn lands
   *  beside the caller by reading the store, never by sniffing the plexer. */
  handle?: string | null;
  /** The space the caller registered in. Optional (A7): a session in no space
   *  records no row, which is an answer and not a missing value. */
  space?: string | null;
  /** The live agent this session started inside, such as the terminal a harness was typed
   *  into. Written once, when the row is minted; provenance never changes after. */
  spawnedBy?: string | null;
  now: number;
}

export interface AgentRow {
  id: string;
  spawnedBy: string | null;
  rootAgentId: string;
  harnessId: string;
  name: string;
  label: string | null;
  kind: CallerKind;
  claimedAt: number | null;
  sessionToken: string | null;
  createdAt: number;
  ending?: AgentEnding | null;
}

import type { AgentWorktree } from "./worktree.ts";

export type ClaimResult =
  | { kind: "stamped" }
  | { kind: "unchanged" }
  | { kind: "refused"; reason: "unknown-agent" | "claimed-by-other" };

export interface HostPlexerRow {
  hostId: HostId;
  plexerId: string;
  since: number;
  until: number | null;
  version: string;
}

/** Where an agent is — DERIVED from {@link ENVIRONMENT_AXES}, never written out
 *  a second time. Every field is nullable because an axis that has no row is
 *  genuinely absent: a headless agent has no handle, and that is an answer, not
 *  a missing value to paper over. */
/** The axis names {@link ENVIRONMENT_AXES} declares. Derived from that list, so
 *  it can never name a different set (A15). */
export type EnvironmentAxisKey = (typeof ENVIRONMENT_AXES)[number]["key"];

/** The axes every agent has: the host it runs on and the directory it runs in there, from its
 *  open `agent_hosts` row. Never null: no absence stands for a place. */
export interface AgentLocationAxes {
  readonly host: HostIdentity;
  readonly cwd: string;
}

export type AgentEnvironment = Readonly<Record<EnvironmentAxisKey, string | null>> & AgentLocationAxes;

/** How an agent is configured. Not environment: it survives a move. */
export interface AgentTuning {
  readonly model: string | null;
  readonly thinking: string | null;
}

/** Who holds an agent right now, and since when. `null` is unheld — and an
 *  unheld agent is not a dead one (Rule 11: work survives its spawner). */
export interface AgentHolder {
  readonly orchId: string;
  readonly since: number;
}

/** The four facts, side by side but never merged. */
export interface AgentView {
  /** Identity — minted once, immutable. */
  readonly id: string;
  readonly name: string;
  readonly label: string | null;
  readonly harnessId: string;
  readonly createdAt: number;
  /** Provenance — how the row came to be, and who spawned it. Both immutable. */
  readonly kind: CallerKind;
  readonly spawnedBy: string | null;
  /** The spawner's CURRENT name, read as a join. Never stored beside the child:
   *  a copy goes stale the moment the spawner is renamed, and a name is mutable
   *  by design while provenance is not. `null` when nothing spawned this agent. */
  readonly spawnedByName: string | null;
  readonly rootAgentId: string;
  /** Ownership — a lease, mutable, and never authorization. */
  readonly heldBy: AgentHolder | null;
  /** Environment — where it is, mutable. */
  readonly environment: AgentEnvironment;
  readonly tuning: AgentTuning;
  /** Program: the form its harness runs in. Null for an agent orch did not launch. */
  readonly form: FormId | null;
  /** When it ended. An ending is an instant, never a lifetime column (A1). */
  readonly endedAt: number | null;
}

export interface StoredCatalogue {
  /** `binaryStamp` of the harness that answered; a different stamp means a new binary. */
  binary: string | null;
  at: number;
  stdout: string;
}

export interface StoredEvent {
  seq: number;
  ts: number;
  event: unknown;
}

/** Every action requiring consent. A union, so adding one fails to compile until
 *  it has a sentence a human can read. */
export const GRANT_KINDS = ["spawn.new-space", "command.run"] as const;

export type GrantKind = (typeof GRANT_KINDS)[number];

/**
 * One consequential action. `params` is the whole truth of what will execute:
 * the approval renders from it and the binding hash covers it, so a field left
 * out is a field the human never saw and the gate never checked.
 */
export interface GrantAction {
  readonly kind: GrantKind;
  readonly params: Readonly<Record<string, string>>;
}

/** A refused action, recorded so a human can read what was actually asked for. */
export interface GrantRequest {
  readonly id: string;
  readonly actionHash: string;
  readonly kind: GrantKind;
  readonly params: Record<string, string>;
  /** Which agent asked, for provenance only — never rendered as the action. */
  readonly requestedBy: string | null;
  readonly requestedAt: number;
}

export interface TuningValues { model:string; thinking?:string|null }

export interface OutboxMessageInput {
  id: string;
  target: string;
  payload: OutboxPayload;
  createdAt?: number;
}

/**
 * `pending`   no channel has taken it yet.
 * `awaiting`  handed to a channel whose reader acks separately; open, but sent.
 * `delivered` settled.
 * The middle state is what tells "nothing would take this write" apart from
 * "the agent has not read it yet" — collapsing them made every write look
 * unapplied to its caller.
 */
/** `undeliverable` is terminal like `delivered`: the agent it was written for is
 *  gone, and no number of retries brings it back. */
export type OutboxState = "pending" | "awaiting" | "delivered" | "undeliverable";

export interface OutboxMessage {
  id: string;
  target: string;
  payload: OutboxPayload;
  state: OutboxState;
  attempts: number;
  createdAt: number;
  nextAttemptAt: number;
}

/** What an agent did with one control command. `error` absent means it applied. */
export interface ControlOutcomeRecord{id:string;agentId:string;command:string;requested:unknown;settledAt:number;error?:string}

export interface RunRecord { dispatchId:string; agentKey:string; adapter?:string; model?:string; space?:string; task?:string; state:string; startedAt:number; finishedAt?:number; tokensIn?:number; tokensOut?:number; cacheRead?:number; cacheWrite?:number; cost?:number; turns?:number; result?:unknown; lastError?:string }

export interface SpawnRegistration {
  form: FormId;
  key: string;
  harnessId: string;
  /**
   * Environment: the plexer this agent runs in, when it runs in one.
   *
   * Absent means NO ROW in `agent_plexers` — a capless agent is in no plexer,
   * which is a real answer and not a missing one. Rule 11: nullness IS the
   * capability, so this is never a sentinel like "local" or "none".
   */
  backendId?: string;
  /** Whether this backend exposes the agent in a pane. */
  /** Whether orch placed this agent somewhere the environment tracks; a placed agent has a handle. */
  placed: boolean;
  handle?: string;
  cwd: string;
  name: string;
  /**
   * Environment: orch's own grouping for this agent.
   *
   * A7 — a space is USER-CREATED and optional, never minted from a path — so
   * this is the id of a space that already exists, and a spawn into none states
   * nothing. Absent means NO ROW in `agent_spaces`: a missing axis is a missing
   * row, never a NULL and never an invented place called "local".
   */
  space?: string;
  /** The bare model id the launch resolved: never a `model:effort` ladder token. */
  model: string;
  /**
   * The thinking effort the launch resolved, stated beside the model. Absent
   * means NO effort is recorded (an adopted agent orch never launched); a launch
   * orch made always states one. It is never re-derived from `model`, which is
   * bare by the time it reaches here.
   */
  thinking?: ThinkingLevel;
  /** The register-session id of the spawning session, when it has one. */
  spawner: string | null;
  /** The host and agent that asked for this spawn, when another host's orchd did; the
   *  spawner is then theirs, never a row here. Absent: asked for on this host, and the
   *  agent inherits its spawner's origin, if any. */
  origin?: AgentOrigin;
  /**
   * Ownership: the orch that HOLDS this agent once it is running.
   *
   * Rule 11 — a lease, never a column on the agent, and never welded to the
   * provenance above: a spawner hands work off and stops holding it. Absent
   * means the spawner keeps the lease it took at launch.
   */
  owner?: string;
  worktree?: AgentWorktree;
  /**
   * Environment: the OS process this agent runs in, on the host it runs on. That host is
   * the agent's host: orchd registers only an agent that runs on its own host.
   *
   * Rule 11 — the ONE liveness source. The daemon and every presence reader ask
   * this row whether the agent is alive; a pid an agent writes about itself is
   * never consulted. The environment's own process statement is recorded; it
   * must die with the agent.
   */
  process: HostedProcess;
  now?: number;
}

/**
 * The reference a spawning orchd keeps for an agent it asked a linked host to run.
 *
 * The agent's process, environment, logs and runs live on `host`, in that host's
 * store. Here it is the agent row, its spawner's lease, the tuning it was launched
 * with, and the host it runs on: no process, no handle, no plexer.
 */
export type HostedSpawnRegistration = Pick<SpawnRegistration, "form" | "key" | "harnessId" | "cwd" | "name" | "model" | "thinking" | "spawner" | "now"> & {
  /** The linked host that runs it, as that host names itself. */
  readonly host: HostIdentity;
};

export type LeaseReleaseReason = "released" | "handoff" | "adopted" | "expired";

export interface Lease {
  readonly id: number;
  readonly agentId: string;
  readonly orchId: string;
  readonly since: number;
  readonly until: number | null;
  readonly releaseReason: LeaseReleaseReason | null;
}

export interface SpaceRow {
  readonly id: string;
  readonly name: string;
}

/** A space as `orch space` lists it: with the home this plexer holds for it, if any. */
export interface SpaceListing extends SpaceRow {
  readonly home: string | null;
}
