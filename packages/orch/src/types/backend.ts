import type { ExecFileSyncOptionsWithStringEncoding } from "node:child_process";
import type { AgentAdapter } from "./adapter.ts";
import type { HeadlessHandle } from "./plexer.ts";
import type { ThinkingLevel, WorkerPolicy } from "./policy.ts";
import type { AgentId } from "../backends/identity.ts";
import type { Logger, OrchDir } from "./core.ts";

/** Where a placed agent sits, as the environment reports it. */
export interface PlacementCoordinate {
  readonly handle: BackendHandle;
  readonly workspace: string | null;
  readonly group: string | null;
}

export interface PlacementRequest<Handle = BackendHandle> {
  readonly cwd: string;
  readonly workspace?: string;
  readonly group?: string;
  readonly split?: BackendSplit;
  readonly targetHandle?: Handle;
  readonly env?: Readonly<Record<string, string>>;
}

export interface Placement<Handle = BackendHandle> { readonly handle: Handle; }

export interface PlacementRole<Handle = BackendHandle> {
  open(request: PlacementRequest<Handle>): Placement<Handle>;
  close(handle: Handle): void;
}

export interface PlacementInventoryRole<Handle = BackendHandle> {
  current(): PlacementCoordinate | null;
  list(): readonly BackendTarget<Handle>[];
  /** The plexer's own coordinate (herdr workspace, tmux session) holding a
   *  place, or null when the place is gone. How orch lands a fleet beside a
   *  caller whose handle it RECORDED, without sniffing the plexer again. */
  coordinateOf(handle: Handle): string | null;
}

export interface AgentInputRole<Handle = BackendHandle> {
  submit(handle: Handle, text: string): void;
  sendKeys(handle: Handle, keys: readonly string[]): void;
  focus(handle: Handle): void;
}

export interface ForegroundRole<Handle = BackendHandle> { read(handle: Handle): ForegroundProcesses; }

export interface ScreenRole<Handle = BackendHandle> { read(handle: Handle, lines: number): string; }

export interface ZoomRole<Handle = BackendHandle> { setZoom(handle: Handle, mode: BackendZoomMode): void; }

export interface LabelRole<Handle = BackendHandle> { setLabel(handle: Handle, name: string): void; }

export interface AgentNamingRole<Handle = BackendHandle> { renameAgent(handle: Handle, name: string): void; }

export interface AgentStatusRole<Handle = BackendHandle> { wait(handle: Handle, status: string, timeoutMs: number): void; }

/** Request to create one plexer group (herdr tab, tmux window). */
export interface CreateGroupRequest {
  /** The plexer's coordinate to open the group in, or undefined when orch
   *  resolved none — it never invents one, and the plexer uses its own default. */
  readonly workspace: string | undefined;
  readonly cwd: string;
  readonly label?: string | null;
  /** Environment for the group's own root place, for a caller that will launch
   *  an agent in it rather than opening a second place beside it. */
  readonly env?: Readonly<Record<string, string>>;
}

/** Result of creating a group, including its root place. */
export interface CreatedGroup<Handle = BackendHandle> {
  readonly group: BackendGroup;
  readonly rootHandle: Handle;
}

/** Group placement request. A null group creates a fresh group. */
export interface MoveRequest<Handle = BackendHandle> {
  readonly handle: Handle;
  readonly group: string | null;
  readonly split: BackendSplit;
  readonly against?: Handle;
  /** Alias used by placement callers for the place to split. */
  readonly targetHandle?: Handle;
  readonly label?: string | null;
}

/** Group inventory and mutation role. Every method is implemented by an environment that places agents. */
export interface GroupHomeRole<Handle = BackendHandle> {
  list(): readonly BackendGroup[];
  create(request: CreateGroupRequest): CreatedGroup<Handle>;
  rename(coordinate: string, label: string): void;
  close(coordinate: string): void;
  focus(coordinate: string): void;
  move(request: MoveRequest<Handle>): void;
}

/** Group geometry role used by the tiling planner. */
export interface GroupLayoutRole<Handle = BackendHandle> {
  read(coordinate: string): BackendGroupLayout<Handle>;
}

/** One plexer home coordinate belonging to a space or pack. */
export interface PlexerHome {
  readonly coordinate: string;
  readonly label: string | null;
}

/** Request to create a plexer home for a space or pack. */
export interface CreateHomeRequest {
  readonly cwd: string;
  readonly label?: string | null;
  readonly env?: Readonly<Record<string, string>>;
}

/** Result of creating a plexer home. A home opens with one group and one place
 *  already in it; both are returned so the first agent can take that place
 *  instead of a second group being opened beside an empty one. */
export interface CreatedHome<Handle = BackendHandle> {
  readonly coordinate: string;
  readonly rootGroup: string;
  readonly rootHandle: Handle;
}

/**
 * What a home is opened FOR. orch has exactly two things a plexer can hold — a
 * space and a pack — and neither is a new noun minted
 * for the plexer's own grouping. The coordinate the plexer hands back is stored
 * against this subject in `space_plexers` / `pack_plexers`, never displayed.
 */
export interface HomeSubject {
  readonly kind: "space" | "pack";
  readonly id: string;
}

/** Home inventory and mutation role for spaces and packs. */
export interface SpaceHomeRole<Handle = BackendHandle> {
  list(): readonly PlexerHome[];
  create(subject: HomeSubject, request: CreateHomeRequest): CreatedHome<Handle>;
  rename(coordinate: string, label: string): void;
  close(coordinate: string): void;
  focus(coordinate: string): void;
}

/**
 * Where the calling process itself is. Composed by an environment a process can be
 * INSIDE. A detached agent is in no space, so headless
 * composes nothing here and callers get the absence as their answer: nullness
 * is the capability, never a method probe.
 */
export interface EnvironmentIdentityRole {
  /** Where the calling process sits, or null when it is not inside one at all. */
  current(id: string | null): AgentId | null;
}

/** Turning an agent key into this environment's native handle. A separate role
 *  from identity on purpose: knowing where YOU are and being able to address
 *  SOMEONE ELSE are different capabilities, and welding them would force an
 *  environment to fake whichever half it lacks. */
export interface HandleLookupRole<Handle = BackendHandle> {
  handleFor(key: string, orchDir: OrchDir): Handle | undefined;
}

/** What an environment's running server says about itself. `compatible` is null
 *  when the server reports no compatibility fact for orch to read. */
export interface ServerReport {
  readonly version: string | null;
  readonly compatible: boolean | null;
}

/** Reporting an environment's installed integration version. */
export interface VersionRole {
  installed(): string | null;
  /** The oldest version of its own environment this integration still speaks to.
   *  The integration's fact to state, never core's to hold: a version range keyed
   *  by environment id in core is an environment orch cannot add without editing
   *  policy. A floor and never a ceiling - a newer environment is the environment. */
  supported(): string;
}

/** Reporting the server an environment's client talks to. Null role for an
 *  environment that is one process and has no server to disagree with; a null
 *  report for one whose server is not running. */
export interface ServerInfoRole {
  running(): ServerReport | null;
}

/** Pruning this environment's own logs. Absent when it keeps none — which is an
 *  answer, not a failure, and replaces the `canPruneLogs` boolean declared
 *  alongside the method. */
export interface LogPruningRole {
  prune(cutoff: Date, liveKeys: readonly string[], orchDir: OrchDir, logger: Logger): number;
}

/** Request to launch one process in an environment. */
export interface StartRequest {
  readonly argv: readonly string[];
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string>>;
  readonly detached?: boolean;
}

/** Process identity returned at launch; pid alone is never sufficient. */
export interface StartedProcess {
  readonly pid: number;
  readonly startToken: string;
}

/** Process identity recorded for a running agent. */
export interface RecordedProcess {
  readonly pid: number;
  /** Proof this pid is still the instance orch launched; null when the OS would not say. */
  readonly startToken: string | null;
}

export type ProcessState = "alive" | "dead" | "replaced";

export interface ProcessRole<Handle = BackendHandle> {
  start(request: StartRequest): StartedProcess;
  /** The process the agent at this handle runs in: a place's shell, a detached
   *  harness, whatever this environment knows its own handle to run. */
  running(handle: Handle): RecordedProcess;
  state(process: RecordedProcess): ProcessState;
  kill(process: RecordedProcess, signal: NodeJS.Signals): void;
}


/** The closed backend-id set, importable without pulling any provider code. */
export const BACKEND_IDS = ["herdr", "tmux", "orca", "headless"] as const;

/** Plexer backends supported by orch. */
export type BackendId = (typeof BACKEND_IDS)[number];

/** Request selecting captured orch-owned output. */
export interface CaptureRequest {
  readonly source?: "status" | "result" | "all";
}

/** Captured output from the orch presence/result protocol. */
export interface CapturedOutput {
  readonly status: unknown;
  readonly result: unknown;
}

/** The orch-owned captured status/result channel. */
export interface CaptureRole {
  read(agentId: string, request: CaptureRequest): CapturedOutput;
}

/** Options common to backend launches. */
export interface BackendSpawnOpts {
  /** Initial task sent to the adapter. */
  readonly prompt?: string;
  /** Presence key to associate with the process, when known. */
  readonly key?: string;
  /** Directory in which the adapter process starts. */
  readonly cwd?: string;
  /** Model selected for this process. */
  readonly model?: string;
  /** Independent thinking effort selected for this process. */
  readonly thinking?: ThinkingLevel;
  /** Model patterns the adapter should expose in its native cycle/picker, when configured. */
  readonly preferredModels?: readonly string[];
  /** ORCH_DIR for the adapter process. */
  readonly orchDir: OrchDir;
  /** Extra environment passed to the adapter process. */
  readonly env?: Readonly<Record<string, string>>;
  /** How long the harness waits for orchd to accept a report, in milliseconds. */
  readonly reportTimeoutMs?: number;
  /** Explicit worker tool allowlist, when the launcher applies one. */
  readonly tools?: string;
  /** What this worker may load; the adapter maps it onto its harness's flags. */
  readonly workers?: WorkerPolicy;
  /** Verbatim launch command overriding the adapter's own; `orch spawn --cmd`. */
  readonly cmd?: string;
  /** Display name given to the spawned agent, when the backend supports naming. */
  readonly name?: string;
  /** Backend workspace to spawn into; defaults to the caller's workspace. */
  readonly workspace?: string;
  /** Existing group (tab/window) to spawn into. */
  readonly group?: string;
  /** Split direction within the target group. */
  readonly split?: BackendSplit;
  /** The place the new place must split, so placement never depends on what has focus. */
  readonly targetHandle?: BackendHandle;
  /**
   * Launch the agent in this place instead of opening one. A group is born with a
   * root place, and splitting off it to then close it leaves an orphan whenever
   * the environment declines the close — which every later tiling decision then
   * balances against. Handing that place over directly cannot leave one.
   */
  readonly intoHandle?: BackendHandle;
}

/**
 * A native handle returned by one of orch's environments.
 *
 * An environment that places agents addresses each with its native string
 * coordinate; the detached environment carries the process identity it can
 * actually signal. The object variant is intentionally shaped (rather than
 * `unknown`) so code that renders a handle must account for the process form
 * explicitly. The optional phantom kind keeps native coordinate strings
 * compatible while documenting the discriminant used by structured handles.
 */
export type BackendHandle = (string & { readonly kind?: "placed" }) | HeadlessHandle;

/** Split direction for placement inside a group. */
export type BackendSplit = "down" | "right";

/** Zoom state applied to one place. */
export type BackendZoomMode = "on" | "off" | "toggle";

/** Geometry of one place inside a group layout. */
export interface BackendRect {
  readonly width: number;
  readonly height: number;
  readonly x: number;
  readonly y: number;
}

/** One live target visible to a backend, with display metadata. */
export interface BackendTarget<Handle = BackendHandle> {
  readonly handle: Handle;
  readonly workspace: string | null;
  /** Owning group (herdr tab, tmux window), when the backend has groups. */
  readonly group: string | null;
  /** Display label of the owning group, when the backend labels groups. */
  readonly groupLabel: string | null;
  /** Display name assigned to the agent in this target. */
  readonly name: string | null;
  /** Agent kind reported by the backend, when known. */
  readonly agent: string | null;
  readonly focused: boolean;
  /** Backend-native agent status string, when reported. */
  readonly status: string | null;
  /** Agent session path reported by the backend, when known. */
  readonly sessionPath: string | null;
}

/** One group (herdr tab, tmux window) reported by a backend. */
export interface BackendGroup {
  readonly id: string;
  readonly label: string | null;
  readonly workspace: string | null;
  readonly focused: boolean;
  readonly number: number | null;
  readonly placementCount: number | null;
  readonly status: string | null;
}

/** Geometry of every place in one group. */
export interface BackendGroupLayout<Handle = BackendHandle> {
  readonly group: string;
  readonly placements: readonly { readonly handle: Handle; readonly rect: BackendRect }[];
}



/**
 * Lifecycle, identity, and control contract shared by every environment,
 * whether it places agents or detaches them.
 *
 * The backend owns its workspace/session identity (design D2): it reports the
 * calling process's own {@link Identity} via {@link Backend.currentIdentity} and
 * probes its own availability. An agent's stable identity is minted BEFORE
 * launch by the spawner and passed opaquely via `LAUNCH_ENV`; the backend
 * never re-mints a second identity from a post-spawn handle. The backend is also
 * the control authority: delivery, focus, keystrokes, and layout route through
 * this port, never through a concrete plexer CLI at the call site. The port is
 * agent-agnostic — it never references pi/claude/codex.
 *
 * Required methods return false when the operation fails or the backend cannot
 * perform it; optional methods are absent when a backend has no such concept
 * (callers gate on presence, never on the backend id).
 */
export interface Backend<Handle = BackendHandle> {
  readonly id: BackendId;
  /** Whether the backend binary/runtime is present on this machine. */
  isAvailable(): boolean;
  /** Whether the current process is inside a live session for this backend. */
  isInsideSession(): boolean;
  spawn(adapter: AgentAdapter, opts: BackendSpawnOpts): Handle;
  /** Process control, always composed: every environment runs processes. */
  readonly process: ProcessRole<Handle>;
  /** Read orch-owned captured status/result records; control traffic uses the daemon socket. */
  readonly capture: CaptureRole;
  /** Identity of the calling process's own target, when inside a session. */
  readonly identity: EnvironmentIdentityRole | null;
  /**
   * Live handle for one agent identity key. Composed by backends whose handle is
   * not a place the spawn registry can record — a detached process handle changes
   * every relaunch, so only the backend knows the current one.
   */
  readonly handleLookup: HandleLookupRole<Handle> | null;
  /** Remove stale backend-owned logs, retaining logs for live presence keys. */
  readonly logPruning: LogPruningRole | null;
  /** Reports this environment's installed integration version. Absent when the
   *  environment exposes no version to report — which is an ANSWER for the doctor
   *  to print, not a missing method to probe for. */
  readonly versionInfo: VersionRole | null;
  /** Reports the server this environment's client drives. Absent when it runs as
   *  one process, so there is no client and server that can disagree. */
  readonly serverInfo: ServerInfoRole | null;
  readonly placement: PlacementRole<Handle> | null;
  readonly placementInventory: PlacementInventoryRole<Handle> | null;
  /** Explicit environment fast path; normal dispatch never uses this channel. */
  readonly agentInput: AgentInputRole<Handle> | null;
  readonly foreground: ForegroundRole<Handle> | null;
  readonly screen: ScreenRole<Handle> | null;
  readonly zooming: ZoomRole<Handle> | null;
  readonly labeling: LabelRole<Handle> | null;
  readonly agentNaming: AgentNamingRole<Handle> | null;
  readonly agentStatus: AgentStatusRole<Handle> | null;
  readonly groupHome: GroupHomeRole<Handle> | null;
  readonly groupLayout: GroupLayoutRole<Handle> | null;
  readonly spaceHome: SpaceHomeRole<Handle> | null;
}

/** What an environment can see about the processes one agent is running right now. */
export interface ForegroundProcesses {
  /** The place's own shell. Null when the environment does not report it. */
  shellPid: number | null;
  /** Leader of the process group holding the terminal. Null where the OS
   *  exposes no foreground group — Windows-side agents, where only names remain. */
  foregroundPid: number | null;
  processes: readonly string[];
}

/**
 * How a tab's FIRST split runs, from `tiling.first_split` in settings.json.
 * Every split after it halves the biggest place's longer visual side whichever
 * one is set — the opening split is all that differs, and it is what decides
 * whether four agents land as a 2x2 grid or as four of one shape.
 *
 * - `rows` stacks: the new place goes under the old one (a horizontal divider).
 * - `columns` sits side by side (a vertical divider).
 * - `longest-edge` lets the tab's own shape pick, which on a wide monitor keeps
 *   choosing columns until the fleet is a row of thin strips.
 */
export const TILE_FIRST_SPLITS = ["rows", "columns", "longest-edge"] as const;

export type TileFirstSplit = (typeof TILE_FIRST_SPLITS)[number];

/** Where the next agent lands in a group. */
export interface TilePlacement {
  /** The place to split. Absent on a one-place group, where every backend's own
   *  default already splits the one place there is. */
  readonly targetHandle?: BackendHandle;
  readonly split: BackendSplit;
}

export interface LocalProcessRoleDeps {
  readonly isAlive?: (pid: number) => boolean;
  readonly startToken?: (pid: number) => string | undefined;
  readonly spawn?: (request: StartRequest) => StartedProcess;
  readonly signal?: (pid: number, signal: NodeJS.Signals) => void;
}

/** One attempt of one external tool command, as the exec seam saw it. */
export interface ToolExecRecord {
  readonly binary: string;
  readonly args: readonly string[];
  readonly attempt: number;
  readonly ok: boolean;
  readonly elapsedMs: number;
}

/**
 * One exec seam for every external tool orch drives — every plexer, every
 * harness CLI. It names none of them: a binary and its argv go in, output comes
 * out, and the retry policy is the caller's to state.
 *
 * Why it exists: orch's commands fail on TIMING far more often than on being
 * wrong. A place whose shell has not finished coming up, a plexer server still
 * binding its socket, a loaded machine — each answers with a refusal that would
 * have succeeded moments later. Failing the whole spawn on the first of those is
 * what makes orch feel unreliable on slower hardware, and it is not a per-harness
 * problem, so it does not get a per-harness fix (Rule 9).
 */
export type ToolExecutor = (
  binary: string,
  args: readonly string[],
  options: ExecFileSyncOptionsWithStringEncoding,
) => string;
