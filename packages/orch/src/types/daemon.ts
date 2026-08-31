import type { SessionAgentIdentity } from "./store.ts";
import type { NotifyEvent } from "./notify.ts";
import type { OsSide } from "./core.ts";
import type { OrchConfig } from "./config.ts";
import type { PresenceEntry } from "./presence.ts";
import type { TaskRec } from "./queue.ts";

export interface LockRecord {
  pid: number;
  codeHash: string;
  startedAt: string;
  startToken?: string;
}

export type RpcParams = unknown;

export type RpcEventEmitter = (event: unknown) => void;

export interface RpcRequestContext {
  readonly transport: "unix" | "tcp";
  readonly identity?: SessionAgentIdentity;
}

export interface UnleasedAgent {
  readonly id: string;
  readonly name: string;
}

/** A driving session registration retains its identity fields and appends adoptable agents. */
export type RegisterSessionResponse = SessionAgentIdentity & { readonly unleased: readonly UnleasedAgent[]; readonly registrationWarning?: string };

export interface ClaimIdentityResponse {
  readonly id: string;
}

export type RpcHandler = (params: RpcParams, emit: RpcEventEmitter, context: RpcRequestContext) => unknown;

export type RpcHandlers = Record<string, RpcHandler>;

/** Where one daemon instance is reachable and how a caller proves itself: the
 *  unix socket path, the loopback port file beside it, and the token file. */
export interface EndpointPaths {
  socket: string;
  port: string;
  token: string;
}

export interface RpcServerOptions {
  /** Allow one stale unix endpoint to be removed during daemon boot. */
  holdsDaemonLock?: boolean;
  /** TCP port to bind on loopback alongside the unix socket. */
  tcpPort?: number;
  /** Report a TCP bind failure without taking down the unix listener. */
  onTcpError?: (error: unknown, port: number) => void;
};

export interface BufferedEvent {
  seq: number;
  event: unknown;
}

export interface ReplayResult {
  events: BufferedEvent[];
  gap: boolean;
  oldestSeq?: number;
}

export interface RpcServer {
  /** Stop accepting connections and remove the endpoint files. */
  close(): Promise<void>;
  /** Push an event to every connection subscribed with subscribe-events. */
  emit(event: unknown): void;
  /** How many connections currently hold a subscribe-events subscription. */
  subscriberCount(): number;
  readonly transport: "unix" | "tcp";
  readonly socketPath: string;
  readonly portFile: string;
  readonly tcpEndpoint?: string;
}

export interface EventSubscription {
  close(): void;
  readonly lastSeq: () => number;
}

export type DaemonLock = Pick<LockRecord, "pid" | "codeHash" | "startToken">;

/** The machine-wide rendezvous record. Its endpoint paths are the only address
 *  clients discover; orchDir scopes those endpoints to the owning store, and
 *  osSide records which side of an OS boundary the daemon is hosted on — the one
 *  fact a client on the other side cannot work out from the paths alone. */
export interface DaemonRegistration {
  readonly orchDir: string;
  readonly pid: number;
  readonly startToken: string;
  readonly osSide: OsSide;
  readonly socket: string;
  readonly token: string;
  readonly port: string;
}

export interface DaemonRegistrationResult {
  readonly acquired: boolean;
  readonly registration?: DaemonRegistration;
}

export interface DaemonCodeSkew {
  daemonHash: string;
  diskHash: string;
}

/** A synchronous socket answer check supplied by the RPC layer (and by tests). */
export type SocketProbe = (socketPath: string) => boolean;

/**
 * What starts, checks and stops a process on ONE OS side.
 *
 * Windows and WSL are one machine and get one daemon: two would be two lease
 * tables, two identity spaces and two answers to who holds an agent. What
 * genuinely differs across the boundary is execution, not truth — so the far
 * side gets an executor behind the backend port, never a peer daemon.
 */
export interface OsExecutor {
  readonly osSide: OsSide;
  /** Start a detached process from `entrypoint`, answering with its pid. */
  start(entrypoint: string, args?: string[], orchDir?: string): number;
  /** Whether that process is still the instance it claims to be. */
  isAlive(pid: number, startToken?: string): boolean;
  /** Stop it and wait for the OS to reap it, up to `graceMs`. */
  kill(pid: number, graceMs: number): Promise<void>;
}

/** Ran the body on that side, or the answer that nothing can run there. */
export type OsSideExecution<T> =
  | { readonly outcome: "ran"; readonly value: T }
  | { readonly outcome: "answer"; readonly reason: "no-environment-role"; readonly exitCode: 0; readonly text: string };

export interface PresenceMetadata {
  name: string | null;
  tab: string | null;
  pid?: number;
  /** Address of the session that spawned this agent. */
  spawnedBy?: string;
  /** Human description of the session that spawned this agent. */
  spawnedByLabel?: string;
};

export interface PresenceWatchOptions {
  orchDir: string;
  onEvent: (event: NotifyEvent) => void;
  initialStates?: Map<string, string>;
  keys?: Map<string, PresenceMetadata>;
  metadataFor?: (key: string) => PresenceMetadata;
  acceptKey?: (key: string) => boolean;
  pollIntervalMs?: number;
  /** Test seam for verifying every watcher is closed when its directory disappears. */
  onWatcherClosed?: () => void;
};

export interface PresenceWatch {
  states: Map<string, string>;
  scan: () => void;
  stop: () => void;
  readonly watcherCount: () => number;
};

export interface LeasePayload {
  readonly holderId: string;
  readonly holderName: string;
  readonly holderAlive: boolean;
}

export interface LeaseStatusPayload {
  readonly lease: LeasePayload | null;
  /** False means the status key has no corresponding row in agents yet. */
  readonly leaseKnown: boolean;
}

/**
 * What a channel can promise about one write.
 *
 * `acked`  the message reached its reader, or reached a channel that HAS no
 *          separate reader to hear from — a pane keystroke, a boundary answer.
 *          Terminal either way.
 * `queued` the message was handed to a channel whose reader acknowledges
 *          separately: the inbox. This is NOT delivery. The agent's own marker
 *          in `ack.jsonl` is what settles the row.
 * `failed` the write did not happen. Retry with backoff.
 *
 * A boolean cannot carry this: it collapses "handed to the channel" into
 * "read by the agent", which settled every inbox row at write time and made the
 * ack reader below unreachable in the daemon.
 */
export type OutboxDelivery = "acked" | "queued" | "failed";

export interface OutboxDeps {
  deliver(target: string, payload: unknown, id: string): Promise<OutboxDelivery>;
  now(): number;
}

/** The files one orchd instance owns while it runs. Orch defines these names, so
 *  they get exactly one definition site — same rule as the presence filenames. */
export interface DaemonDiscoveryFiles {
  /** Machine-wide registration; unlike the store this is shared by all clients. */
  readonly registration: string;
}

export interface DaemonRuntimeFiles {
  /** The backing-store ownership record (machine-wide admission is registration). */
  readonly lock: string;
  /** The unix socket orchd binds for RPC. */
  readonly socket: string;
  /** The TCP port orchd advertises where unix sockets are unavailable. */
  readonly port: string;
  /** Owner-readable credential for loopback TCP identity RPCs. */
  readonly token: string;
  /** Where the daemon's structured JSONL diagnostics are written. */
  readonly log: string;
}

export interface SweepCounts {
  queue: number;
  outbox: number;
  events: number;
  runs: number;
  ended_agents: number;
  logs: number;
}

export interface WorkOptions {
  orchDir: string;
  pollIntervalMs: number;
  signal?: AbortSignal;
  once?: boolean;
  continuous?: boolean;
  /** Suppress human progress output for machine-readable callers. */
  json?: boolean;
  maxRetries?: number;
  /** Return the latest config for each loop iteration. */
  getConfig?: () => OrchConfig;
  dispatch?: (entry: PresenceEntry, task: TaskRec) => Promise<void>;
  /** Emit canonical work lifecycle events through the daemon fan-out. */
  onEvent?: (event: NotifyEvent) => void;
}
