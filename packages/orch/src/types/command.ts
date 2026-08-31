import type { AdapterId, AgentAdapter, HarnessModel, ShimRole } from "./adapter.ts";
import type { Backend, BackendHandle, BackendId, SpaceHomeRole, TilePlacement } from "./backend.ts";
import type { ThinkingLevel, WorkerPolicy } from "./policy.ts";
import type { AgentView } from "./store.ts";
import type { Entity, LogLevel, WorkerHeaderContext } from "./core.ts";
export interface DeadAgentSweepOptions {
  /** Root to inspect; omitted for the operator's configured ORCH_DIR. */
  root?: string;
  /** Only reap directories whose mtime is before this cutoff. */
  olderThan?: Date;
}

export interface DispatchToAgentOptions {
  raw?: boolean;
  adapter?: AgentAdapter;
  context?: WorkerHeaderContext;
  gov?: WriteGovernance;
}

export interface DaemonStatus {
  pid: number;
  startedAt: string;
  uptimeSec: number;
  codeHash: string;
  socket: string;
  tcpEndpoint?: string;
}

export interface WriteGovernance {
  steal?: boolean;
  crossSpace?: boolean;
}

export interface LogOptions { since?: number; level?: LogLevel; agent?: string; dispatch?: string; json: boolean; }

/** One model as this command displays it, numbered by its place in the shown list. */
export interface ModelRow {
  index: number;
  spec: string;
  label?: string;
  default: boolean;
  preferred: boolean;
}

/** One harness section: what it launches on, what its own picker cycles, and its catalogue. */
export interface HarnessSection {
  id: AdapterId;
  default?: string;
  preferred: string[];
  models: ModelRow[];
}

/** What the listing was narrowed to. Neither filter reads or writes settings. */
export interface ModelFilters {
  /** Show only the models in that harness's configured quicklist. */
  quicklistOnly: boolean;
  /** Case-insensitive substring matched against both spec and label. */
  search?: string;
}

/** Asks one harness what it can run. Injected so the listing can be exercised without a
 *  harness binary on PATH. */
export type CatalogueReader = (id: AdapterId) => readonly HarnessModel[];

/** The scope flags of `orch queue add`, before any of them is resolved. */
export interface QueueScopeFlags {
  agent?: string;
  pack?: string;
  space?: string;
}

/** What each installed harness launches by default, offers in its own picker, and may launch at all. */
export interface HarnessModelChoices {
  defaults: Partial<Record<AdapterId, string>>;
  preferred: Partial<Record<AdapterId, string[]>>;
  allowed: Partial<Record<AdapterId, string[]>>;
}

/** Boundary answer when the selected environment has no integration role. */
export interface ShimBoundaryAnswer {
  readonly outcome: "answer";
  readonly reason: "no-environment-role";
  readonly exitCode: 0;
  readonly text: string;
}

export interface ShimBoundaryInvocation {
  readonly outcome: "invoke";
  readonly role: ShimRole;
}

export type ShimBoundaryPlan = ShimBoundaryAnswer | ShimBoundaryInvocation;

/** The four IO steps of the closing smoke round-trip, injected so the orchestration is testable
 * without a live daemon, a model, or a real spawn. Each default is a thin wrapper over the same
 * plumbing `orch spawn`/`orch run`/`orch result` use — the smoke reuses those paths, never
 * reimplements them. */
export interface SmokeSteps {
  /** Spawn one headless agent ON the given prompt and return its identity key; throws when none is recorded. */
  spawnHeadless: (cwd: string, prompt: string) => Promise<string>;
  /** Build the trivial prompt the agent is launched on. */
  buildPrompt: () => string;
  /** The agent's result text once it has produced one, else undefined. */
  readResultText: (key: string) => string | undefined;
  /** Best-effort teardown of the smoke agent. */
  cleanup: (key: string) => void;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  timeoutMs: number;
}

/** Where this command runs: orch's store, the plexer it is in, and that plexer's
 *  space-home role when it composes one. */
export interface SpaceEnvironment {
  readonly directory: string;
  readonly plexerId: string;
  readonly spaceHome: SpaceHomeRole | null;
  /** The agent asking, recorded as `spaces.created_by`. It grants nothing. */
  readonly actorId: string | null;
}

export interface AgentFlags {
  adapterFlag?: string;
  backendFlag?: string;
  modelFlag?: string;
  thinkingFlag?: string;
}

export interface AgentSettings {
  adapter: AdapterId;
  backend: BackendId;
  model: string;
  thinking: ThinkingLevel;
  /** The quicklist this harness's own picker/cycle is given; never a launch gate. */
  preferredModels: readonly string[];
}

export interface CreatedAgent { key: string; pane: string; name: string }

export interface TabSpawnSpec {
  backend: Backend;
  adapter: AgentAdapter;
  adapterId: AdapterId;
  name: string;
  cwd: string;
  /** orch's own grouping (A7: user-created and OPTIONAL). Null means the agent is
   *  filed in no space — a missing axis, never a sentinel string (Rule 11). */
  space: string | null;
  /** The plexer's coordinate the pane opens in (E10). Orch's space is never
   *  handed to the plexer; absent means the plexer places it on its own default. */
  workspace?: string;
  group: string;
  model: string;
  /** Thinking effort selected for this launch. */
  thinking?: ThinkingLevel;
  /** The quicklist this harness's own picker/cycle is given; never a launch gate. */
  preferredModels: readonly string[];
  /** Where the pane lands in the group, from the tiling planner. */
  placement?: TilePlacement;
  /** Existing pane to launch into (fresh tab root). */
  intoPane?: BackendHandle;
  /** The identity already stamped into `intoPane`'s environment when the pane was
   *  opened ahead of the launch. ONE key per agent: the pane's env and the record
   *  must name the same id, so a pre-opened pane hands its key in rather than
   *  letting the launch mint a second one. */
  key?: string;
  env?: Readonly<Record<string, string>>;
  tools?: string;
  /** What this worker may load; absent lets the adapter apply no policy. */
  workers?: WorkerPolicy;
  /** Verbatim launch command from `--cmd`; absent lets the adapter build it. */
  cmd?: string;
  worktree?: string;
  branch?: string;
  /** Hello-registered id of the session performing this launch. */
  spawnerAgentId?: string | null;
}

/** A rendered snapshot of which roles an environment composes. Data for display,
 *  never a thing to branch on — the code reads the role itself. */
export interface EnvironmentCapabilityView {
  readonly spaceHome: boolean;
  readonly identity: boolean;
  readonly handleLookup: boolean;
  readonly logPruning: boolean;
}

export interface StatusRow {
  key: string;
  /** Orch-minted id; distinct from every plexer coordinate. */
  agentId?: string | null;
  paneId: string | null;
  /** False for panes orch did not spawn (the orchestrator's own, the user's). */
  managed: boolean;
  name: string | null;
  tab: string | null;
  agent: string | null;
  /** Current live lease holder, or an explicit no-driving status when unleased. */
  owner: string | null;
  spawnedBy: string | null;
  spawnedByLabel: string | null;
  worktree: string | null;
  branch: string | null;
  /** Directory the agent works in; the repo boundary a wandering worker crossed. */
  cwd: string | null;
  focused: boolean;
  model: string;
  modelShort: string;
  /** What the AGENT reports about itself through its presence record — the only
   *  field that answers "is the work finished". It moves ahead of `backendStatus`
   *  by design: an agent is done the moment it says so, whatever its pane shows. */
  state: string;
  /** True when no live bridge answered and `state` came from the backend or session. */
  stateFallback: boolean;
  staleExtension?: boolean;
  exited: boolean;
  /** False once the agent's pid is gone; the visibility filter's only liveness input. */
  alive: boolean;
  cost: number;
  ctxPercent: number | null;
  task: string | null;
  /** Id of the dispatch the agent reports running; diff against the id `orch
   *  dispatch` printed to prove a pane runs the prompt it was sent. */
  dispatchId: string | null;
  lastText: string | null;
  /** What the MULTIPLEXER reports about the pane the agent runs in. It lags `state`
   *  and is a routing/diagnostic fact, never a completion signal — read `state`. */
  backendStatus: string | null;
  /** Backend that supplied this row, when known. */
  backend: string | null;
  /** What the owning backend can do with this agent. Every renderer branches on
   *  these, never on the backend's id (Rule 9). Null when no backend owns it. */
  capabilities: EnvironmentCapabilityView | null;
  sessionPath: string | null;
  presenceDir: string | null;
  presenceOnly: boolean;
  tokens: unknown;
  turns: unknown;
  /** Orch-owned space identity and display name. */
  spaceId?: string | null;
  spaceName?: string | null;
  /** Immutable provenance root (pack) identity and display name. */
  rootAgentId?: string | null;
  rootAgentName?: string | null;
  host?: string;
  warning?: string;
}

export interface LifecycleTarget {
  readonly entity: Entity;
  /** The address orch reaches this agent by: its presence key, else its id. */
  readonly key: string;
  /** The composed agent, or null for a pane orch never minted an id for. */
  readonly view: AgentView | null;
  readonly backend: Backend;
  /** Backend-native handle, or a headless pid/key signal handle. */
  readonly handle: BackendHandle;
}

/** One option row of a catalogue multiselect. */
export interface CatalogueOption {
  value: string;
  label: string;
  hint?: string;
  checked: boolean;
}

export type CataloguePicker = (
  mode: "multiselect" | "autocomplete",
  message: string,
  options: readonly CatalogueOption[],
  maxItems: number,
) => Promise<string[] | null>;

/**
 * Where one spawn puts its fleet. Two DIFFERENT facts, never welded.
 *
 * `space` is orch's own grouping — user-created, optional and never minted from
 * a path. `workspace` is the plexer's coordinate, which orch stores and hands
 * back and never says.
 * Returning one as the other is how `wF` came to be printed as a name a human
 * chose, and how a spawn opened a window the store then refused to file.
 */
export interface SpawnPlacement {
  readonly space: string | null;
  readonly workspace: string | undefined;
}

/** What deciding a {@link SpawnPlacement} needs. */
export interface SpawnPlacementRequest {
  readonly directory: string;
  readonly backend: Backend;
  /** The space the caller named, or null. Never invented here. */
  readonly space: string | null;
  /** The agent at the root of this fleet's provenance tree — what
   *  `pack_plexers.pack_id` names. Null when the caller has no agent row yet. */
  readonly packRootId: string | null;
  readonly cwd: string;
  /** orch's own name for the fleet, marked before it reaches the plexer. */
  readonly label: string;
  /** Opening a home puts a window on the human's screen, so it is asked for.
   *  Passed in rather than called here so the decision stays one function and
   *  the gate stays testable. Throws or exits when not granted. */
  readonly grantNewHome: () => void;
}

export interface LeaseCommandResult {
  readonly id: string;
  readonly name: string;
  readonly released?: boolean;
  readonly adopted?: boolean;
  readonly reaped?: boolean;
  readonly renamed?: boolean;
}

/** Every lease operation takes the same two options: when it happened, and
 *  whether the caller is deliberately taking the agent from a LIVE orch (C4). */
export interface LeaseOptions {
  readonly now?: number;
  readonly steal?: boolean;
}

/**
 * Everything minted for ONE agent before any pane exists: its identity, its
 * worktree and the environment its pane is opened with.
 *
 * A fresh-tab launch is deliberately phased — mint every identity, create the
 * tab, open every pane, then launch every agent — so this is what one agent
 * carries between those phases. `pane` is filled in by the phase that opens it
 * and stays undefined when that failed, which costs that agent and never the tab.
 */
export interface PreparedAgent {
  readonly name: string;
  readonly cwd: string;
  readonly key: string;
  readonly env: Readonly<Record<string, string>>;
  readonly branch: string | undefined;
  pane: BackendHandle | undefined;
}
