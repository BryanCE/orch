import type { AgentAdapter } from "../adapters/adapter.ts";
import type { Identity } from "./identity.ts";

/** Plexer backends supported by orch. */
export type BackendId = "herdr" | "tmux" | "headless";

/** The closed backend-id set, importable without pulling any provider code. */
export const BACKEND_IDS: readonly BackendId[] = ["herdr", "tmux", "headless"];

/** Capabilities exposed by a backend. */
export interface BackendCapabilities {
  /** Whether the backend creates or manages visible panes. */
  readonly panes: boolean;
  /** Whether the backend can focus one of its handles. */
  readonly focusable: boolean;
  /** Whether the backend can deliver raw keystrokes to a handle. */
  readonly canSendKeys: boolean;
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
  /** ORCH_DIR override for the adapter process. */
  readonly orchDir?: string;
  /** Extra environment passed to the adapter process. */
  readonly env?: Readonly<Record<string, string>>;
  /** Explicit worker tool allowlist, when the launcher applies one. */
  readonly tools?: string;
  /** Display name given to the spawned agent, when the backend supports naming. */
  readonly name?: string;
  /** Backend workspace to spawn into; defaults to the caller's workspace. */
  readonly workspace?: string;
  /** Existing group (tab/window) to spawn into. */
  readonly group?: string;
  /** Split direction within the target group. */
  readonly split?: BackendSplit;
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

/** Text delivered to an agent's input line. */
export interface DeliverPayload {
  /**
   * "run" types the text into the target and submits it as a command/prompt;
   * "message" injects the text into the agent's input, then submits it.
   */
  readonly kind: "run" | "message";
  readonly text: string;
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

/** Geometry of every pane in the group containing a handle. */
export interface BackendGroupLayout<Handle = BackendHandle> {
  readonly group: string;
  readonly panes: readonly { readonly handle: Handle; readonly rect: BackendRect }[];
}

/** Entry written to the spawn registry. */
export interface BackendRegistryRecord<Handle = BackendHandle> {
  readonly backend: string;
  readonly handle: Handle;
  readonly adapter: string;
  /** Working directory the agent was launched in, when known. */
  readonly cwd?: string;
  /** Captured output log path recorded at spawn time (D3a), when the backend writes one. */
  readonly log?: string;
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
  readonly id: string;
  readonly panes: boolean;
  readonly focusable: boolean;
  /** Whether raw keystroke delivery is supported (capability-gated by callers). */
  readonly canSendKeys: boolean;
  /** Whether the backend binary/runtime is present on this machine. */
  isAvailable(): boolean;
  /** Whether the current process is inside a live session for this backend. */
  isInsideSession(): boolean;
  spawn(adapter: AgentAdapter, opts: BackendSpawnOpts): Handle;
  close(handle: Handle): boolean;
  list(): Handle[];
  /** Submit text to the agent in a target (design D2 dispatch/steer surface). */
  deliver(handle: Handle, payload: DeliverPayload): boolean;
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
  /** Move a target into an existing group. */
  moveToGroup?(handle: Handle, group: string, split: BackendSplit): boolean;
  /** Move a target into a freshly created group. */
  moveToNewGroup?(handle: Handle, label: string | null): boolean;
  /** Geometry of the group containing a handle. Throws when unresolvable. */
  layoutOf?(handle: Handle): BackendGroupLayout<Handle>;
  /** Names of foreground processes running in a target. */
  foregroundProcesses?(handle: Handle): string[];
  /** Block until the backend reports the agent status, or time out. */
  waitAgentStatus?(handle: Handle, status: string, timeoutMs: number): boolean;
  /** Create a group and report it with its root handle. Throws on failure. */
  createGroup?(opts: { workspace: string; cwd: string; label?: string | null }): { group: BackendGroup; rootHandle: Handle };
  groups?(): BackendGroup[];
  renameGroup?(group: string, label: string): boolean;
  closeGroup?(group: string): boolean;
  focusGroup?(group: string): boolean;
  workspaces?(): BackendWorkspace[];
  focusWorkspace?(workspace: string): boolean;
}
