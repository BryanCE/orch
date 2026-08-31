// Type-only: `typeof`/`ReturnType` over a runtime binding, erased at compile
// time, so these create no runtime edge out of the types layer.
import type { createAgentPresence } from "../agent/presence.ts";
import type { subscribeEvents } from "../daemon/rpc/client.ts";
import type { ThinkingLevel } from "./policy.ts";
import type { JsonRecord } from "./core.ts";

/**
 * The harness surface orch's in-agent control plane runs against.
 *
 * This is orch's OWN port, not any harness's API: nothing here imports a harness
 * package, so `src/agent/**` typechecks, bundles and runs with none of them
 * installed. Each harness's composition root (`extensions/<harness>/index.ts`)
 * imports its own package's types and hands its live API in — pi and omp both
 * satisfy this structurally, and a build that stops satisfying it fails in its
 * own directory rather than silently degrading the shared plane.
 *
 * It is deliberately the SUBSET the control plane actually uses. Widening it to
 * mirror a harness's full ExtensionAPI would re-couple every consumer to whichever
 * harness the extra members were copied from.
 */

/** A model as the harness's own registry hands it back; orch reads two fields and never constructs one. */
export interface HarnessResolvedModel {
  readonly provider: string;
  readonly id: string;
}

/** The session file, id, and message branch orch reconciles presence against. */
export interface HarnessSessionManager {
  getSessionFile(): string | undefined;
  getSessionId(): string | undefined;
  getBranch(): readonly unknown[];
}

/** How much of the model's context window the current session occupies. */
export interface HarnessContextUsage {
  readonly tokens?: number;
  readonly percent?: number;
}

/** The harness's own model registry, keyed the way that harness names models. */
export interface HarnessModelRegistry {
  find(provider: string, id: string): HarnessResolvedModel | undefined;
}

/** Per-invocation UI methods the control plane uses. */
export interface HarnessUi {
  notify(message: string, level: "info" | "warning" | "error"): void;
  setStatus(key: string, text: string | undefined): void;
  setWidget(key: string, content: string[] | undefined): void;
}

/** Shared event bus the plexer HUD may subscribe to. */
export interface HarnessEventBus {
  on(channel: string, handler: (data: unknown) => void): unknown;
}

/** Per-invocation state the harness passes to every handler. */
export interface HarnessContext {
  readonly hasUI: boolean;
  readonly model?: HarnessResolvedModel;
  readonly sessionManager: HarnessSessionManager;
  readonly modelRegistry: HarnessModelRegistry;
  readonly ui: HarnessUi;
  isIdle(): boolean;
  getContextUsage(): HarnessContextUsage | undefined;
}

/** A handler bound to one harness event; the event payload is validated by its reader. */
export type HarnessEventHandler = (event: unknown, ctx: HarnessContext) => void | Promise<unknown>;

/** A slash-command handler; `args` is the raw text after the command name. */
export type HarnessCommandHandler = (args: string | undefined, ctx: HarnessContext) => void | Promise<void>;

/** A tool the control plane registers into the agent's own toolset. */
export interface HarnessTool {
  readonly name: string;
  readonly label?: string;
  readonly description: string;
  readonly promptSnippet?: string;
  readonly promptGuidelines?: readonly string[];
  readonly parameters: unknown;
  execute(
    toolCallId: string,
    params: never,
    signal: AbortSignal | undefined,
    onUpdate: unknown,
    ctx: HarnessContext,
  ): unknown;
}

/** The harness API surface the control plane binds to. */
export interface HarnessApi {
  on(event: string, handler: HarnessEventHandler): void;
  registerTool(tool: HarnessTool): void;
  registerCommand(name: string, options: { description?: string; handler: HarnessCommandHandler }): void;
  sendUserMessage(content: string, options?: { deliverAs?: "steer" | "followUp" }): void;
  setModel(model: HarnessResolvedModel): Promise<boolean> | void;
  getThinkingLevel(): ThinkingLevel | undefined;
  setThinkingLevel(level: ThinkingLevel, persist?: boolean): void;
  readonly events: HarnessEventBus;
}

/**
 * What one harness build calls itself and calls its settle signal.
 *
 * The settle event is the run's real "done" — it fires only when the harness will
 * not auto-continue (no retry or compaction pending), unlike `agent_end`. pi
 * spells it `agent_settled`, omp spells it `session_stop`, and each emits only its
 * own; the name belongs to the harness's composition root, never to shared code.
 */
export interface HarnessIdentity {
  /** Adapter id stamped into status.json so orch knows which harness answered. */
  readonly agentId: string;
  /** Event name this build fires when a run settles. */
  readonly settleEvent: string;
}

/** What a composition root gets back: the live fleet model (when the generic
 * monitor is wired), and this session's own orch identity for richer seats. */
export interface HarnessBridge {
  fleet: FleetReadModel | undefined;
  /** This session's presence key, once minted; a harness-specific orchestrator
   *  seat (extensions/pi/fleet) keys its identity wall on this. */
  ownKey: () => string | undefined;
}

export interface PeerSummary {
  key: string;
  /** Display name stamped at launch (or by the plexer); the human spelling of this peer. */
  name?: string;
  /** Harness this peer runs (pi, claude, codex, omp). */
  harness?: string;
  space: string | null;
  state: string;
  /** Ownership, and ownership only: the LIVE lease on this
   *  agent. Without it the compact listing an agent actually reads shows an
   *  unleased peer as ordinary live work belonging to whoever is looking. */
  drive: DriveState;
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

/** One sibling agent as its presence directory reports it. */
export interface Peer {
  key: string;
  dir: string;
  status: JsonRecord;
}

export interface PeerResolutionError {
  error: string;
}

export interface PeerResolutionPeer {
  peer: Peer;
}

export type PeerResolution = PeerResolutionError | PeerResolutionPeer;

export interface BridgeToolResult {
  content: [{ type: "text"; text: string }];
  details: undefined;
}

/** One agent as the orchestrator currently understands it, from events alone. */
export interface FleetAgentRow {
  key: string;
  name: string;
  state: string;
  model: string | null;
  task: string;
  cost?: number;
  ts: string;
}

/** Live, read-only view of this session's own fleet, for a harness UI to render. */
export interface FleetReadModel {
  list(): readonly FleetAgentRow[];
  size(): number;
  /** Fires on every accepted transition; returns an unsubscribe. */
  subscribe(listener: () => void): () => void;
}

/** How the status line spells the fleet; a harness with a themed UI substitutes its own. */
export type FleetStatusRenderer = (context: HarnessContext, agents: readonly FleetAgentRow[]) => string;

export interface FleetMonitor {
  /** Bind the monitor to a live session's UI and start rendering. */
  attach(context: HarnessContext): void;
  stop(): void;
  readonly model: FleetReadModel;
}

export interface FleetMonitorOptions {
  /** This session's own identity, once a context can compute it. */
  ownKey(context: HarnessContext): string | undefined;
  /** Themed spelling of the status line; plain text by default. */
  renderStatus?: FleetStatusRenderer;
  /** Where transitions arrive from; the daemon's event stream by default. A test
   *  pushes its own so the monitor's seam can be driven without a daemon. */
  subscribe?: typeof subscribeEvents;
}

export interface UsageLike {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
  cost?: { total?: number };
}

export interface AssistantMessageLike {
  role: string;
  content: unknown;
  usage?: UsageLike;
  stopReason?: string;
  errorMessage?: string;
}

/**
 * State-change payload handed to the composition root's notification sink.
 * Declared here, not imported from a backend, so the harness never depends on
 * which plexer (if any) delivers it.
 */
export interface BridgeNotification {
  key: string;
  space?: string;
  agent: string | null;
  tab: string | null;
  model: string | null;
  oldState: string;
  newState: string;
  task?: string;
  cost?: number;
  ts: string;
  lastError?: string;
}

export type BridgeNotifier = (event: BridgeNotification) => void;

export interface AgentPresenceOptions {
  harness: HarnessApi;
  /** Which harness build this session is, and what it calls its settle signal. */
  identity: HarnessIdentity;
  /** Plexer pane handle for this process, or null when the backend has no panes. */
  paneId: string | null;
  /** Bridge code hash stamped into status.json for the doctor staleness check. */
  extensionHash: string;
  /** Daemon-socket ack transport for consumed inbox messages. */
  ack: DaemonAck;
  /** Sink invoked after every status write so a HUD can mirror the agent state. */
  reportStatus: (snapshot: { state: string; task?: string; cost: number }) => void;
}

/** The live presence binding returned by {@link createAgentPresence}. */
export type AgentPresence = ReturnType<typeof createAgentPresence>;

/** What a reader is told about who drives an agent. `owner` is the human
 *  spelling for both cases, so no renderer has to compose the sentence. */
export interface DriveState {
  kind: "leased" | "unleased";
  owner: string;
  mine: boolean;
}

export interface DriveStateOptions {
  directory?: string;
  /** Raw agents.id for the caller, supplied by the current session identity. */
  currentOrchId?: string | null;
}

export interface AgentToolsOptions {
  presence: AgentPresence;
  /** Which harness build this session is, and what it calls its settle signal. */
  identity: HarnessIdentity;
  /** Delivers a state-change notification (wired to the plexer HUD, if any). */
  notify: BridgeNotifier;
  /** Refreshes this agent's pane/tab labels and writes status when they apply. */
  refreshLabels: () => Promise<void>;
}

/** Ack transport + dedupe set handed to the inbox drain. */
export interface DaemonAck {
  /** Message id carried by a parsed inbox line, when it has one. */
  messageIdOf(parsed: unknown): string | undefined;
  isAcked(id: string): boolean;
  markAcked(id: string): void;
  /** Posts the ack to orchd; false means the caller should fall back to ack.jsonl. */
  post(id: string): Promise<boolean>;
}

export type ResolvedModel = NonNullable<HarnessContext["model"]>;

/** A raw inbox control command; `cmd` selects which of `model`/`level` is meaningful. */
export interface ControlCommand {
  cmd: string;
  /** Dispatcher-minted request id, echoed into the control outcome so the waiter matches its own command. */
  id?: unknown;
  model?: unknown;
  level?: unknown;
}

/** Look up a registry model by bare provider + id; a fresh value each call so a retry sees a just-loaded registry. */
export type FindRegistryModel = (provider: string, id: string) => ResolvedModel | undefined;

export interface ModelControlDeps {
  harness: HarnessApi;
  /** The running agent's context, read fresh so a retry sees a registry that just loaded. */
  context: () => HarnessContext | undefined;
  /** Absolute path of the presence control-outcome record; resolved lazily (set at presence init). */
  controlFile: () => string;
  /** Re-read the applied model into presence state and flush status.json. */
  refreshPresence: () => void;
}
