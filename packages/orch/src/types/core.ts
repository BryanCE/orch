// Type-only: `keyof typeof` over a runtime binding, erased at compile time, so
// this creates no runtime edge out of the types layer.
import type { EXTENSION_SOURCE_DIR } from "../bridge-bundles/metadata.ts";

import type { PresenceEntry } from "./presence.ts";
/** Ordered lowest severity last: an index into this array IS the verbosity. */
export const LOG_LEVELS = ["error", "warn", "info", "debug", "trace"] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

/** What a field may hold. A record is a row to be queried, not a place for objects:
 *  a nested shape has no stable column and cannot be filtered on. */
export type LogValue = string | number | boolean | null;

export interface LogRecord {
  /** Epoch millis. Rule 11: instants are INTEGER epoch millis, never TEXT. */
  readonly at: number;
  readonly level: LogLevel;
  /** A stable dotted name ("dispatch.delivered"), never a sentence. The readable
   *  rendering is produced from the record, so wording can change without breaking
   *  anything that greps. */
  readonly event: string;
  /** The dispatch id, or the RPC request id. Correlation is the point. */
  readonly correlationId?: string;
  /** orch's minted id and nothing else. A plexer handle is environment
   *  (`TASKS/01-agent-model.md`) and belongs in `fields`. */
  readonly agentId?: string;
  readonly fields?: Readonly<Record<string, LogValue>>;
}

/** Per-record context that is not a field: who this is about, and what it belongs to. */
export interface LogContext {
  readonly correlationId?: string;
  readonly agentId?: string;
}

export interface Logger {
  error(event: string, fields?: Readonly<Record<string, LogValue>>, context?: LogContext): void;
  warn(event: string, fields?: Readonly<Record<string, LogValue>>, context?: LogContext): void;
  info(event: string, fields?: Readonly<Record<string, LogValue>>, context?: LogContext): void;
  debug(event: string, fields?: Readonly<Record<string, LogValue>>, context?: LogContext): void;
  trace(event: string, fields?: Readonly<Record<string, LogValue>>, context?: LogContext): void;
  /** A logger that stamps every record with one correlation id, so a caller cannot
   *  forget to pass it halfway through a dispatch. */
  forCorrelation(correlationId: string): Logger;
  forAgent(agentId: string): Logger;
}

export interface LoggerOptions {
  readonly file: string;
  readonly level: LogLevel;
  /** Injectable so a test can assert ordering without sleeping on the real clock. */
  readonly now?: () => number;
}

/**
 * Absolute path of the package root — the directory holding package.json.
 * Walks up from this module's own location so it resolves correctly whether orch
 * runs from live source (`src/util.ts` → repo root) or the bundled entrypoint
 * (`dist/bin/orch.js` → repo root in dev, `node_modules/orch` when published).
 * A hardcoded "two levels up from the entry file" breaks the moment the entry
 * moves from `bin/` to `dist/bin/`.
 */
export type OsSide = "linux" | "windows" | "darwin";

/** A parsed JSON object. The one spelling of this shape repo-wide. */
export type JsonRecord = Record<string, unknown>;

/**
 * One retry policy for every flaky IO path in orch. Older and loaded machines fail these
 * operations on TIMING, not on being wrong, so each reattempt waits longer than the last.
 *
 * Only ever wrap an operation that is safe to run twice. A request that already reached its
 * server and merely answered late is NOT safe — reattempting `spawn-detached` on a slow box
 * launches a second agent.
 */
export interface RetryPolicy {
  attempts: number;
  delayMs: number;
  /** Multiplies the wait after each failed attempt. */
  backoff: number;
  /** Which failures are worth reattempting. A failure this rejects is rethrown
   *  at once: retrying a name collision or a bad argument only wastes the budget
   *  that a genuinely slow machine needs. Absent = every failure is retryable. */
  retryable?: (error: unknown) => boolean;
}

export interface Entity {
  key: string;
  paneId: string | null;
  /** True when orch spawned this agent. A backend reports every pane it owns,
   *  including the orchestrator's own — false means "someone else's pane". */
  managed: boolean;
  name: string | null;
  tabLabel: string | null;
  agent: string | null;
  focused: boolean;
  backendStatus: string | null;
  /** Backend that owns this agent; what its capabilities are read from. */
  backend: string | null;
  presence: PresenceEntry | null;
  sessionPath: string | null;
  presenceOnly: boolean;
  /** Space from the backend view or orch's spawned registry. */
  space: string | null;
  /** Set when this entity was addressed with a configured host prefix. */
  host?: string;
}

export interface ToolCallContentBlock {
  type: "toolCall";
  name?: string;
  arguments?: Record<string, unknown>;
}

export interface TextContentBlock {
  type: "text";
  text?: string;
}

export interface OtherContentBlock {
  type: string;
  [key: string]: unknown;
}

export type ContentBlock = TextContentBlock | ToolCallContentBlock | OtherContentBlock;
export type SessionContent = string | ContentBlock[];

export interface SessionUsage {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
  cost?: number | { total?: number };
}

export interface SessionMessage {
  role: string;
  timestamp?: string;
  content?: SessionContent;
  model?: string;
  provider?: string;
  usage?: SessionUsage;
  toolName?: string;
  isError?: boolean;
}

export interface SessionEntry {
  type: string;
  timestamp?: string;
  modelId?: string;
  provider?: string;
  thinkingLevel?: string;
  message?: SessionMessage;
}

/**
 * Who a control message reached, split into what an operator reads and what routed it.
 *
 * Panes move, spaces are renamed and a plexer can be swapped without any of it
 * changing the agent, so `transportId` is a debug field and never a display name. This
 * module is a LEAF on purpose: the in-harness peer tools render the same identity as
 * the CLI, and importing the spawn registry there would drag the store into a bundle
 * that runs inside someone else's harness process.
 */
export interface Recipient {
  name: string;
  harness: string | null;
  multiplexer: string | null;
  transportId: string;
}

export type RemoteFailureKind = "dead-host" | "timeout" | "non-json" | "invalid-config";

export interface RemoteFailure {
  kind: RemoteFailureKind;
  host: string;
  message: string;
  stderr?: string;
  stdout?: string;
}

export type RemoteResult =
  | { ok: true; value: unknown }
  | { ok: false; failure: RemoteFailure };

export interface SshResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  code?: number;
}

/** Filesystem scope a shim invocation is granted. Paths must be absolute. */
export interface ShimScope {
  /** The resolved $ORCH_DIR — read AND written (presence records live here). */
  orchDir: string;
  /** Additional read-only roots, e.g. the directory holding claude transcripts. */
  readOnly?: readonly string[];
}

export interface WorkerHeaderContext {
  maySpawn: boolean;
  lockedCommands?: readonly string[];
  /** The spawner's inbox is live and will accept a peer write. Default false: orch
   *  never instructs a reply it has not established the worker can actually deliver. */
  spawnerRepliable?: boolean;
}

export type ExtensionName = keyof typeof EXTENSION_SOURCE_DIR;

/**
 * Who this process is, as ONE answer for the whole CLI.
 *
 * Identity is the minted id and nothing else (TASKS/01). Where the process runs
 * — plexer, space, pane handle, cwd — is ENVIRONMENT: recorded on its own rows
 * beside the agent, never consulted to work out who someone is. Asking the plexer
 * "who am I" is what produced `<backend>~<workspace>~operator`, an id that named
 * an environment and matched no stored record, so orch refused its own fleet.
 *
 * Orch mints exactly once, in `register-session`. Everything here READS that record.
 */
/**
 * The harness session this `orch` process runs inside, as that harness's OWN
 * adapter declares it. Orch names no harness here (Rule 9): an adapter that
 * exports a session marker owns the env vocabulary, one that declares none has
 * no session identity, and adding a harness edits zero files outside its adapter.
 *
 * This is ENVIRONMENT — where the caller is running. The only identity it yields
 * is the token used to look up the id orch already minted.
 */
export interface CallerSession {
  readonly harnessId: string;
  /** Stable per-session token, when the harness exports one. */
  readonly sessionId: string | null;
  /** The session's own pid, when it exports one. NEVER `process.ppid`: that is
   *  the shell orch was run from, which differs on every invocation. */
  readonly pid: number | null;
}

export interface SelfIdentity {
  /** The id orch minted. Opaque, immutable, plexer-independent. */
  readonly id: string;
}

/** One candidate an ambiguous target matched, and what distinguishes it. */
export interface AmbiguousCandidate {
  readonly key: string;
  /** Whatever tells a human these apart — a tab label, a harness, both. */
  readonly detail: string | null;
}
