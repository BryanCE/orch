import type { SessionAgentIdentity } from "./store.ts";
import type { Logger } from "./core.ts";
import type { StatusRow } from "./command.ts";
import type { NotifyEvent } from "./notify.ts";
import type { OrchDir } from "./core.ts";
import type { HostOs } from "./host.ts";
import type { SettingsManager } from "./services.ts";
import type { ModelCatalogue } from "./adapter.ts";
import type { PresenceEntry } from "./presence.ts";
import type { TaskRec } from "./queue.ts";
import type { IdentityMethod, ParamsOf, ResultOf, RpcMethod } from "../daemon/rpc/protocol.ts";

export interface LockRecord {
  pid: number;
  codeHash: string;
  startedAt: string;
  startToken?: string;
}

export type RpcEventEmitter = (event: NotifyEvent) => void;

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

export type RpcHandler<M extends RpcMethod> = (params: ParamsOf<M>, emit: RpcEventEmitter, context: RpcRequestContext) => ResultOf<M> | Promise<ResultOf<M>>;
/** Complete: one handler per method, the identity handshake excluded (the server answers those itself). */
export type RpcHandlers = { readonly [M in Exclude<RpcMethod, IdentityMethod>]: RpcHandler<M> };

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
  /** Logger used to contain failures in event subscribers. */
  logger?: Logger;
  /** Report a bridge attach after its RPC reply has been written. */
  onBridgeAttached?: (key: string) => void;
};

export interface BufferedEvent {
  seq: number;
  event: NotifyEvent;
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
  emit(event: NotifyEvent): void;
  /** How many connections currently hold a subscribe-events subscription. */
  subscriberCount(): number;
  /** How many bridge keys currently have an attached connection. */
  attachedBridgeCount(): number;
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
  readonly orchDir: OrchDir;
  readonly pid: number;
  readonly startToken: string;
  readonly osSide: HostOs;
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
  readonly osSide: HostOs;
  /** Start a detached process from `entrypoint`, answering with its pid. */
  start(entrypoint: string, args?: string[], orchDir?: OrchDir): number;
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
  /** Address of the session that spawned this agent. */
  spawnedBy?: string;
  /** Human description of the session that spawned this agent. */
  spawnedByLabel?: string;
};

export interface PresenceWatchOptions {
  orchDir: OrchDir;
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
 * One row of the daemon's `status` reply: orch's status row plus the lease facts
 * only the daemon holds. Declaring the reply as bare `StatusRow` is what let the
 * web package hand-copy a second spelling of the row and drift from it — every
 * client of the `status` method reads THIS type (Rule 8: one shape).
 */
export type DaemonStatusRow = StatusRow & LeaseStatusPayload;

/** One pending question as every client renders it. */
export interface PendingQuestionView {
  readonly questionId: string;
  readonly agentId: string;
  readonly key: string;
  readonly name: string | null;
  readonly question: string;
  readonly askedAt: number;
}

/**
 * What the daemon's outbox reports for one delivery.
 *
 * `acked`  the bridge received and acknowledged the message.
 * `queued` the message was pushed down the bridge link, with its ack pending.
 * `failed` the delivery attempt did not complete; retry with backoff.
 * `gone`   the target agent no longer exists, so retrying is pointless.
 */
export type OutboxDelivery = "acked" | "queued" | "failed" | "gone";

export interface OutboxDeps {
  deliver(target: string, payload: unknown, id: string): Promise<OutboxDelivery>;
  now(): number;
  /** A row that fails this many attempts is closed as undeliverable. The gone signal is the fix for a dead agent; this is the backstop. */
  readonly maxAttempts: number;
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
  control_outcomes: number;
  events: number;
  runs: number;
  ended_agents: number;
  logs: number;
}

export interface WorkOptions {
  orchDir: OrchDir;
  pollIntervalMs: number;
  signal?: AbortSignal;
  once?: boolean;
  continuous?: boolean;
  /** Suppress human progress output for machine-readable callers. */
  json?: boolean;
  maxRetries?: number;
  /** Settings for each loop iteration. The daemon passes its manager so reloads are seen. */
  settings: SettingsManager;
  models: ModelCatalogue;
  dispatch?: (entry: PresenceEntry, task: TaskRec) => Promise<void>;
  /** Emit canonical work lifecycle events through the daemon fan-out. */
  onEvent?: (event: NotifyEvent) => void;
}
