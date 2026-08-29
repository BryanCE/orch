import type { ExecFileSyncOptionsWithStringEncoding } from "node:child_process";
import type { AgentAdapter } from "./adapter.ts";
import type { WorkerPolicy } from "./policy.ts";

/** A pane coordinate returned by a pane inventory. */
export interface PaneCoordinate {
  readonly handle: BackendHandle;
  readonly workspace: string | null;
  readonly group: string | null;
}

export interface OpenPaneRequest<Handle = BackendHandle> {
  readonly cwd: string;
  readonly workspace?: string;
  readonly group?: string;
  readonly split?: BackendSplit;
  readonly targetPane?: Handle;
  readonly env?: Readonly<Record<string, string>>;
}

export interface OpenedPane<Handle = BackendHandle> { readonly handle: Handle; }

export interface PaneHostRole<Handle = BackendHandle> {
  open(request: OpenPaneRequest<Handle>): OpenedPane<Handle>;
  close(handle: Handle): void;
}

export interface PaneInventoryRole<Handle = BackendHandle> {
  current(): PaneCoordinate | null;
  list(): readonly BackendTarget<Handle>[];
}

export interface PaneInputRole<Handle = BackendHandle> {
  submit(handle: Handle, text: string): void;
  sendKeys(handle: Handle, keys: readonly string[]): void;
  focus(handle: Handle): void;
}

export interface PaneForegroundRole<Handle = BackendHandle> { read(handle: Handle): PaneForeground; }

export interface PaneScreenRole<Handle = BackendHandle> { read(handle: Handle, lines: number): string; }

export interface PaneZoomRole<Handle = BackendHandle> { setZoom(handle: Handle, mode: BackendZoomMode): void; }

export interface PaneNamingRole<Handle = BackendHandle> { renamePane(handle: Handle, name: string): void; }

export interface AgentNamingRole<Handle = BackendHandle> { renameAgent(handle: Handle, name: string): void; }

export interface AgentStatusRole<Handle = BackendHandle> { wait(handle: Handle, status: string, timeoutMs: number): void; }

/** Request to create one plexer group (herdr tab, tmux window). */
export interface CreateGroupRequest {
  /** The plexer's coordinate to open the group in, or undefined when orch
   *  resolved none — it never invents one, and the plexer uses its own default
   *  (`TASKS/02-scope.md` E10, E14). */
  readonly workspace: string | undefined;
  readonly cwd: string;
  readonly label?: string | null;
  /** Environment for the group's own shell pane, for a caller that will launch
   *  an agent in it rather than opening a second pane beside it. */
  readonly env?: Readonly<Record<string, string>>;
}

/** Result of creating a group, including its initial shell pane. */
export interface CreatedGroup<Handle = BackendHandle> {
  readonly group: BackendGroup;
  readonly rootHandle: Handle;
}

/** Group placement request. A null group creates a fresh group. */
export interface MovePaneRequest<Handle = BackendHandle> {
  readonly handle: Handle;
  readonly group: string | null;
  readonly split: BackendSplit;
  readonly against?: Handle;
  /** Alias used by placement callers for the pane to split. */
  readonly targetPane?: Handle;
  readonly label?: string | null;
}

/** Group inventory and mutation role. Every method is implemented by a paned provider. */
export interface GroupHomeRole<Handle = BackendHandle> {
  list(): readonly BackendGroup[];
  create(request: CreateGroupRequest): CreatedGroup<Handle>;
  rename(coordinate: string, label: string): void;
  close(coordinate: string): void;
  focus(coordinate: string): void;
  move(request: MovePaneRequest<Handle>): void;
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

/** Result of creating a plexer home, including its root pane handle. */
export interface CreatedHome<Handle = BackendHandle> {
  readonly coordinate: string;
  readonly rootHandle: Handle;
}

/**
 * What a home is opened FOR. orch has exactly two things a plexer can hold — a
 * space and a pack (`TASKS/02-scope.md` E10) — and neither is a new noun minted
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
 * INSIDE — a pane in a plexer. A detached agent is in no space, so headless
 * composes nothing here and callers get the absence as their answer
 * (`TASKS/02-scope.md` E13 — nullness is the capability, never a method probe).
 */
export interface EnvironmentIdentityRole {
  /** Where the calling process sits, or null when it is not inside one at all. */
  current(): Identity | null;
}

/** Turning an agent key into this environment's native handle. A separate role
 *  from identity on purpose: knowing where YOU are and being able to address
 *  SOMEONE ELSE are different capabilities, and welding them would force an
 *  environment to fake whichever half it lacks. */
export interface HandleLookupRole<Handle = BackendHandle> {
  handleFor(key: string): Handle | undefined;
}

/** Reporting an environment's installed integration version. */
export interface VersionRole {
  installed(): string | null;
}

/** Pruning this environment's own logs. Absent when it keeps none — which is an
 *  answer, not a failure, and replaces the `canPruneLogs` boolean Ef12 declared
 *  alongside the method (`TASKS/02-scope.md` E13 deletes both). */
export interface LogPruningRole {
  prune(cutoff: Date, liveKeys: readonly string[], orchDir?: string): number;
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
  readonly startToken: string;
}

export type ProcessState = "alive" | "dead" | "replaced";

export interface ProcessRole {
  start(request: StartRequest): StartedProcess;
  state(process: RecordedProcess): ProcessState;
  kill(process: RecordedProcess, signal: NodeJS.Signals): void;
}


/** The closed backend-id set, importable without pulling any provider code. */
export const BACKEND_IDS = ["herdr", "tmux", "headless"] as const;

/** Plexer backends supported by orch. */
export type BackendId = (typeof BACKEND_IDS)[number];

/** One orch message delivered through an agent's presence inbox. */
export interface AgentMessage {
  readonly id?: string;
  readonly text: string;
  readonly action?: "dispatch" | "steer";
}

/** Receipt for a message appended to the orch inbox. */
export interface DeliveryReceipt {
  readonly id: string;
  readonly accepted: true;
}

/** Request selecting captured orch-owned output. */
export interface CaptureRequest {
  readonly source?: "status" | "result" | "all";
}

/** Captured output from the orch presence/result protocol. */
export interface CapturedOutput {
  readonly status: unknown;
  readonly result: unknown;
}

/** The lossless orch inbox channel. This is never a plexer operation. */
export interface AgentChannelRole {
  deliver(agentId: string, message: AgentMessage): DeliveryReceipt;
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
  /** Model patterns the adapter should expose in its native cycle/picker, when configured. */
  readonly preferredModels?: readonly string[];
  /** ORCH_DIR override for the adapter process. */
  readonly orchDir?: string;
  /** Extra environment passed to the adapter process. */
  readonly env?: Readonly<Record<string, string>>;
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
  /** Pane the new pane must split, so placement never depends on what has focus. */
  readonly targetPane?: BackendHandle;
  /**
   * Launch the agent in this pane instead of opening one. A group is born with a
   * shell pane, and splitting off it to then close it leaves an orphan whenever
   * the plexer declines the close — which every later tiling decision then
   * balances against. Handing that pane over directly cannot leave one.
   */
  readonly intoPane?: BackendHandle;
}

/** Opaque backend-specific process or pane handle. */
export type BackendHandle = unknown;

/** Split direction for pane placement inside a group. */
export type BackendSplit = "down" | "right";

/** Zoom state applied to one pane. */
export type BackendZoomMode = "on" | "off" | "toggle";

/** Pane geometry inside a group layout. */
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
  readonly paneCount: number | null;
  readonly status: string | null;
}

/** One workspace reported by a backend. */
export interface BackendWorkspace {
  readonly id: string;
  readonly label: string | null;
  readonly focused: boolean;
  readonly number: number | null;
  readonly tabCount: number | null;
  readonly paneCount: number | null;
  readonly status: string | null;
}

/** Geometry of every pane in one group. */
export interface BackendGroupLayout<Handle = BackendHandle> {
  readonly group: string;
  readonly panes: readonly { readonly handle: Handle; readonly rect: BackendRect }[];
}



/**
 * Lifecycle, identity, and control contract shared by pane and
 * detached-process backends.
 *
 * The backend owns its workspace/session identity (design D2): it reports the
 * calling process's own {@link Identity} via {@link Backend.currentIdentity} and
 * probes its own availability. An agent's stable identity is minted BEFORE
 * launch by the spawner and passed opaquely via `ORCH_AGENT_KEY`; the backend
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
  /**
   * Workspace id → human display name for the workspaces the backend can
   * enumerate. A backend with no name concept returns an empty map; consumers
   * fall back to the workspace id.
   */
  workspaceNames(): Map<string, string>;

  /** Process control, always composed: every environment runs processes. */
  readonly process: ProcessRole;
  /** Orch-owned channels composed for this environment. */
  readonly channel: AgentChannelRole;
  readonly capture: CaptureRole;
  /** Identity of the calling process's own target, when inside a session. */
  readonly identity: EnvironmentIdentityRole | null;
  /**
   * Live handle for one agent identity key. Composed by backends whose handle is
   * not a pane the spawn registry can record — a detached process handle changes
   * every relaunch, so only the backend knows the current one.
   */
  readonly handleLookup: HandleLookupRole<Handle> | null;
  /** Remove stale backend-owned logs, retaining logs for live presence keys. */
  readonly logPruning: LogPruningRole | null;
  /** Reports this environment's installed integration version. Absent when the
   *  environment exposes no version to report — which is an ANSWER for the doctor
   *  to print, not a missing method to probe for (TASKS/02-scope.md E13). */
  readonly versionInfo: VersionRole | null;
  readonly paneHost: PaneHostRole<Handle> | null;
  readonly paneInventory: PaneInventoryRole<Handle> | null;
  /** Explicit plexer fast path; normal dispatch never uses this channel. */
  readonly paneInput: PaneInputRole<Handle> | null;
  readonly paneForeground: PaneForegroundRole<Handle> | null;
  readonly paneScreen: PaneScreenRole<Handle> | null;
  readonly paneZoom: PaneZoomRole<Handle> | null;
  readonly paneNaming: PaneNamingRole<Handle> | null;
  readonly agentNaming: AgentNamingRole<Handle> | null;
  readonly agentStatus: AgentStatusRole<Handle> | null;
  readonly groupHome: GroupHomeRole<Handle> | null;
  readonly groupLayout: GroupLayoutRole<Handle> | null;
  readonly spaceHome: SpaceHomeRole<Handle> | null;
}

/**
 * An agent's identity.
 *
 * One field on purpose. Provenance, ownership and environment are three other
 * facts on three other timelines; welding any of them in here is what this
 * module exists to prevent.
 */
export interface Identity {
  /**
   * Opaque agent id minted BEFORE launch and passed via ORCH_AGENT_KEY.
   *
   * Carries no meaning and is never derived from anything the user can change.
   * It is NOT the agent's name: a name is a mutable label stored beside the
   * agent, and deriving identity from it made the two inseparable — a name
   * could not be reused after its agent died, could not be reassigned, and
   * renaming would have severed every presence/ack join.
   *
   * Equally never the backend pane id or OS pid: those exist only after spawn,
   * so minting a key from one forks the agent into two identities.
   */
  readonly id: string;
}

/** What a plexer can see about the processes a pane is running right now. */
export interface PaneForeground {
  /** The pane's own shell. Null when the plexer does not report it. */
  shellPid: number | null;
  /** Leader of the process group holding the terminal. Null on panes whose OS
   *  exposes no foreground group — Windows-side panes, where only names remain. */
  foregroundPid: number | null;
  processes: readonly string[];
}

/**
 * How a tab's FIRST split runs, from `tiling.first_split` in settings.json.
 * Every split after it halves the biggest pane's longer visual side whichever
 * one is set — the opening split is all that differs, and it is what decides
 * whether four agents land as a 2x2 grid or as four of one shape.
 *
 * - `rows` stacks: the new pane goes under the old one (a horizontal divider).
 * - `columns` sits side by side (a vertical divider).
 * - `longest-edge` lets the tab's own shape pick, which on a wide monitor keeps
 *   choosing columns until the fleet is a row of thin strips.
 */
export const TILE_FIRST_SPLITS = ["rows", "columns", "longest-edge"] as const;

export type TileFirstSplit = (typeof TILE_FIRST_SPLITS)[number];

/** Where the next agent lands in a group. */
export interface TilePlacement {
  /** Pane to split. Absent on a single-pane group, where every backend's own
   *  default already splits the one pane there is. */
  readonly targetPane?: BackendHandle;
  readonly split: BackendSplit;
}

export interface LocalProcessRoleDeps {
  readonly isAlive?: (pid: number) => boolean;
  readonly startToken?: (pid: number) => string | undefined;
  readonly spawn?: (request: StartRequest) => StartedProcess;
  readonly signal?: (pid: number, signal: NodeJS.Signals) => void;
}

/**
 * One exec seam for every external tool orch drives — every plexer, every
 * harness CLI. It names none of them: a binary and its argv go in, output comes
 * out, and the retry policy is the caller's to state.
 *
 * Why it exists: orch's commands fail on TIMING far more often than on being
 * wrong. A pane whose shell has not finished coming up, a plexer server still
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
