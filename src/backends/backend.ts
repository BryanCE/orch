import type { AgentAdapter } from "../adapters/adapter.ts";
import type { Identity } from "./identity.ts";
import type { PaneForeground } from "./pane-ready.ts";
import type { WorkerPolicy } from "../policy/workers.ts";

/** A pane coordinate returned by a pane inventory. */
export interface PaneCoordinate {
  readonly handle: BackendHandle;
  readonly workspace: string | null;
  readonly group: string | null;
}

export type PaneTarget<Handle = BackendHandle> = BackendTarget<Handle>;
export interface OpenPaneRequest {
  readonly cwd: string;
  readonly workspace?: string;
  readonly group?: string;
  readonly split?: BackendSplit;
  readonly targetPane?: BackendHandle;
  readonly env?: Readonly<Record<string, string>>;
}
export interface CreatedPane<Handle = BackendHandle> { readonly handle: Handle; }

export interface PaneHostRole<Handle = BackendHandle> {
  open(request: OpenPaneRequest): CreatedPane<Handle>;
  close(handle: Handle): void;
}
export interface PaneInventoryRole<Handle = BackendHandle> {
  current(): PaneCoordinate | null;
  list(): readonly PaneTarget<Handle>[];
}
export interface PaneInputRole<Handle = BackendHandle> {
  submit(handle: Handle, text: string): void;
  sendKeys(handle: Handle, keys: readonly string[]): void;
  focus(handle: Handle): void;
  foreground(handle: Handle): PaneForeground;
}
export interface PaneScreenRole<Handle = BackendHandle> { read(handle: Handle, lines: number): string; }
export interface PaneZoomRole<Handle = BackendHandle> { setZoom(handle: Handle, mode: BackendZoomMode): void; }
export interface PaneNamingRole<Handle = BackendHandle> { renamePane(handle: Handle, name: string): void; }
export interface AgentNamingRole<Handle = BackendHandle> { renameAgent(handle: Handle, name: string): void; }
export interface AgentStatusRole<Handle = BackendHandle> { wait(handle: Handle, status: string, timeoutMs: number): void; }

/** Request to create one plexer group (herdr tab, tmux window). */
export interface CreateGroupRequest {
  readonly workspace: string;
  readonly cwd: string;
  readonly label?: string | null;
  /** Environment for the group's own shell pane, for a caller that will launch
   *  an agent in it rather than opening a second pane beside it. */
  readonly env?: Readonly<Record<string, string>>;
}

/** Result of creating a group, including its initial shell pane. */
export interface CreatedGroup<Handle = BackendHandle> {
  readonly group: PlexerGroup;
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
  list(): readonly PlexerGroup[];
  create(request: CreateGroupRequest): CreatedGroup<Handle>;
  rename(coordinate: string, label: string): void;
  close(coordinate: string): void;
  focus(coordinate: string): void;
  move(request: MovePaneRequest<Handle>): void;
}

/** Group geometry role used by the tiling planner. */
export interface GroupLayoutRole<Handle = BackendHandle> {
  read(coordinate: string): GroupLayout<Handle>;
}

export interface EnvironmentServices<Handle = BackendHandle> {
  readonly paneHost: PaneHostRole<Handle> | null;
  readonly paneInventory: PaneInventoryRole<Handle> | null;
  readonly paneInput: PaneInputRole<Handle> | null;
  readonly paneScreen: PaneScreenRole<Handle> | null;
  readonly paneZoom: PaneZoomRole<Handle> | null;
  readonly paneNaming: PaneNamingRole<Handle> | null;
  readonly agentNaming: AgentNamingRole<Handle> | null;
  readonly agentStatus: AgentStatusRole<Handle> | null;
  readonly groupHome: GroupHomeRole<Handle> | null;
  readonly groupLayout: GroupLayoutRole<Handle> | null;
}

/** The closed backend-id set, importable without pulling any provider code. */
export const BACKEND_IDS = ["herdr", "tmux", "headless"] as const;

/** Plexer backends supported by orch. */
export type BackendId = (typeof BACKEND_IDS)[number];

export function isBackendId(value: unknown): value is BackendId {
  return typeof value === "string" && (BACKEND_IDS as readonly string[]).includes(value);
}

/** Herdr's backend-owned notification sink id — the one spelling core may import. */
export const HERDR_SINK_ID = "herdr";

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

/** Capabilities exposed by a backend. */
export interface BackendCapabilities {
  /** Whether the backend creates or manages visible panes. */
  readonly panes: boolean;
  /** Whether the backend can focus one of its handles. */
  readonly focusable: boolean;
  /** Whether the backend can deliver raw keystrokes to a handle. */
  readonly canSendKeys: boolean;
  /** Whether the backend owns logs and can prune its stale log artifacts. */
  readonly canPruneLogs: boolean;
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

/** Port vocabulary aliases; coordinates remain opaque provider values. */
export type PlexerGroup = BackendGroup;
export type GroupLayout<Handle = BackendHandle> = BackendGroupLayout<Handle>;

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
export interface Backend<Handle = BackendHandle> extends EnvironmentServices<Handle> {
  readonly id: BackendId;
  readonly panes: boolean;
  readonly focusable: boolean;
  /** Whether raw keystroke delivery is supported (capability-gated by callers). */
  readonly canSendKeys: boolean;
  /** Declared backend capabilities. */
  readonly capabilities: BackendCapabilities;
  /** Orch-owned channels composed for this environment. */
  readonly channel: AgentChannelRole;
  readonly capture: CaptureRole;
  /** Explicit plexer fast path; normal dispatch never uses this channel. */
  readonly paneInput: PaneInputRole<Handle> | null;
  /** Whether the backend binary/runtime is present on this machine. */
  isAvailable(): boolean;
  /** Whether the current process is inside a live session for this backend. */
  isInsideSession(): boolean;
  /** Installed integration version, when this backend exposes one. */
  version?(): string | null;
  spawn(adapter: AgentAdapter, opts: BackendSpawnOpts): Handle;
  close(handle: Handle): boolean;
  list(): Handle[];
  /** Bring a target into view. */
  focus(handle: Handle): boolean;
  /** Send raw keystrokes (backend key names, e.g. "Escape", "Enter"). */
  sendKeys(handle: Handle, keys: readonly string[]): boolean;
  /**
   * Workspace id → human display name for the workspaces the backend can
   * enumerate. A backend with no name concept returns an empty map; consumers
   * fall back to the workspace id.
   */
  workspaceNames(): Map<string, string>;

  /**
   * Live handle for one agent identity key. Declared by backends whose handle is
   * not a pane the spawn registry can record — a detached process handle changes
   * every relaunch, so only the backend knows the current one.
   */
  handleFor?(key: string): Handle | undefined;
  /** Identity of the calling process's own target, when inside a session. */
  currentIdentity?(): Identity | null;
  /** Every live target with display metadata (fleet enumeration). */
  inventory?(): BackendTarget<Handle>[];
  /** Read the last visible lines of a target's screen. Throws on failure. */
  read?(handle: Handle, lines: number): string;
  zoom?(handle: Handle, mode: BackendZoomMode): boolean;
  /** Rename the agent shown for a target. */
  renameAgent?(handle: Handle, name: string): boolean;
  /** Rename the pane border label of a target. */
  renamePane?(handle: Handle, name: string): boolean;
  /** Remove stale backend-owned logs, retaining logs for live presence keys. */
  pruneLogs?(cutoff: Date, liveKeys: readonly string[], orchDir?: string): number;
  /** What a target is running right now, for launch and exit checks. */
  paneForeground?(handle: Handle): PaneForeground;
  /** Block until the backend reports the agent status, or time out. */
  waitAgentStatus?(handle: Handle, status: string, timeoutMs: number): boolean;
  workspaces?(): BackendWorkspace[];
  /** Open a workspace of orch's own and report it with its root handle. Throws on
   *  failure. A caller outside the plexer has no workspace to borrow, and taking
   *  someone else's is what put orch's agents in another person's space. */
  createWorkspace?(opts: { cwd: string; label?: string | null }): { workspace: string; rootHandle: Handle };
  focusWorkspace?(workspace: string): boolean;
}
