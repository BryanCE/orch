import type { AgentAdapter } from "../adapters/adapter.ts";

/** Capabilities exposed by a backend. */
export interface BackendCapabilities {
  /** Whether the backend creates or manages visible panes. */
  readonly panes: boolean;
  /** Whether the backend can focus one of its handles. */
  readonly focusable: boolean;
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
}

/** Lifecycle contract shared by pane and detached-process backends. */
export interface Backend<Handle = BackendHandle> {
  readonly id: string;
  readonly panes: boolean;
  readonly focusable: boolean;
  spawn(adapter: AgentAdapter, opts: BackendSpawnOpts): Handle;
  close(handle: Handle): boolean;
  list(): Handle[];
}
