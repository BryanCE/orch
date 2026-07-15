import type { AgentAdapter } from "../adapters/adapter.ts";
import type { Identity } from "./identity.ts";

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
}

/** Opaque backend-specific process or pane handle. */
export type BackendHandle = unknown;

/** Entry written to the spawn registry. */
export interface BackendRegistryRecord<Handle = BackendHandle> {
  readonly backend: string;
  readonly handle: Handle;
  readonly adapter: string;
  /** Working directory the agent was launched in, when known. */
  readonly cwd?: string;
}

/**
 * Lifecycle and identity contract shared by pane and detached-process backends.
 *
 * The backend is the identity authority (design D2): it mints a stable
 * {@link Identity} for each handle and probes its own availability. The port is
 * agent-agnostic — it never references pi/claude/codex.
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
  /** Mint the stable structured identity for a spawned handle. */
  mintIdentity(handle: Handle): Identity;
  spawn(adapter: AgentAdapter, opts: BackendSpawnOpts): Handle;
  close(handle: Handle): boolean;
  list(): Handle[];
}
