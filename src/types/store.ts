// Type-only: `typeof` over a runtime binding, erased at compile time, so this
// creates no runtime edge out of the types layer.
import type { ENVIRONMENT_AXES } from "../store/agent-view.ts";
import type { HomeSubject, SpaceHomeRole } from "./backend.ts";

export type HostOs = "linux" | "windows" | "darwin";

export interface AgentInput {
  id: string;
  spawnedBy?: string | null;
  harnessId: string;
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
  hostId: string;
  hostName: string;
  hostOs: HostOs;
  /** Plexer observed by the registering session, when it runs in one. */
  plexerId?: string | null;
  plexerVersion?: string | null;
  /** The space the caller registered in. Optional (A7): a session in no space
   *  records no row, which is an answer and not a missing value. */
  space?: string | null;
  now: number;
}

export interface AgentRow {
  id: string;
  spawnedBy: string | null;
  rootAgentId: string;
  harnessId: string;
  cwd: string;
  name: string;
  label: string | null;
  createdAt: number;
  ending?: AgentEnding | null;
}

export interface AgentWorktree {
  path: string;
  branch: string;
}

export interface HostPlexerRow {
  hostId: string;
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

export type AgentEnvironment = Readonly<Record<EnvironmentAxisKey, string | null>>;

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
  readonly cwd: string;
  readonly createdAt: number;
  /** Provenance — who spawned it, immutable. */
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
  /** When it ended. An ending is an instant, never a lifetime column (A1). */
  readonly endedAt: number | null;
}

export interface StoredCatalogue {
  at: number;
  stdout: string;
}

export interface StatementLike {
  run(...params: unknown[]): { changes: number };
  all(...params: unknown[]): unknown[];
  get(...params: unknown[]): unknown;
}

export interface DatabaseLike {
  exec(sql: string): void;
  query(sql: string): StatementLike;
  close(): void;
}

export interface StoredEvent {
  seq: number;
  ts: number;
  event: unknown;
}

/** Every action requiring consent. A union, so adding one fails to compile until
 *  it has a sentence a human can read. */
export type GrantKind = "spawn.new-space";

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

export interface ProcessValues { hostId:string; pid:number; startToken?:string|null }

export interface TuningValues { model:string; thinking?:string|null }

export interface OutboxMessageInput{id:string;target:string;payload:unknown;createdAt?:number}

/**
 * `pending`   no channel has taken it yet.
 * `awaiting`  handed to a channel whose reader acks separately; open, but sent.
 * `delivered` settled.
 * The middle state is what tells "nothing would take this write" apart from
 * "the agent has not read it yet" — collapsing them failed every inbox dispatch
 * back to the caller as unapplied (TASKS/02-scope.md L7).
 */
export type OutboxState = "pending" | "awaiting" | "delivered";

export interface OutboxMessage{id:string;target:string;payload:unknown;state:OutboxState;attempts:number;createdAt:number;nextAttemptAt:number}

export interface RunRecord { dispatchId:string; agentKey:string; adapter?:string; model?:string; space?:string; task?:string; state:string; startedAt:number; finishedAt?:number; tokensIn?:number; tokensOut?:number; cacheRead?:number; cacheWrite?:number; cost?:number; turns?:number; result?:unknown; lastError?:string }

export interface SpawnRegistration {
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
  pane: boolean;
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
  model: string;
  /** The hello-registered agent id of the spawning session, when it has one. */
  spawner: string | null;
  /**
   * Ownership: the orch that HOLDS this agent once it is running.
   *
   * Rule 11 — a lease, never a column on the agent, and never welded to the
   * provenance above: a spawner hands work off and stops holding it. Absent
   * means the spawner keeps the lease it took at launch.
   */
  owner?: string;
  worktree?: { path: string; branch: string };
  now?: number;
}

export type LeaseReleaseReason = "released" | "handoff" | "adopted" | "expired";

export interface Lease {
  readonly id: number;
  readonly agentId: string;
  readonly orchId: string;
  readonly since: number;
  readonly until: number | null;
  readonly releaseReason: LeaseReleaseReason | null;
}

export interface OpenHomeRequest {
  readonly directory: string;
  readonly subject: HomeSubject;
  readonly plexerId: string;
  /** `null` IS the answer that this environment holds nothing (E13) — there is
   *  no probe here and no unsupported-operation path (E14). */
  readonly home: SpaceHomeRole | null;
  readonly cwd: string;
  /** orch's own name for the thing being grouped. It is MARKED before it reaches
   *  the plexer; the plexer never sees a bare directory basename. */
  readonly label: string;
  readonly env?: Readonly<Record<string, string>>;
}
