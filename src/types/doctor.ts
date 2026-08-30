import type { OrchRuntime } from "../runtimes.ts";
import type { SshResult } from "./core.ts";

/** Shared result shape returned by doctor checks and adapter diagnostics. */
export interface FixDescriptor {
  description: string;
  apply(): void;
  /** True for fixes that delete data. UIs must render these clearly and never pre-select them. */
  destructive?: boolean;
}

export interface DoctorBackendReport {
  id: string;
  /** Whether the backend runtime is present on this machine. */
  detected?: boolean;
  /** Whether the backend is enabled in settings. */
  enabled?: boolean;
  /** Whether this backend is the selected runtime for this invocation. */
  active?: boolean;
  insideSession: boolean;
  roles: readonly string[];
  space: string | null;
}

export interface IgnoredPresenceRecord {
  path: string;
  reason: string;
}

export interface CheckResult {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail" | "skip";
  detail: string;
  fix?: FixDescriptor;
  backends?: DoctorBackendReport[];
  ignoredRecords?: IgnoredPresenceRecord[];
}

/** What this host can say about one plexer right now: whether its binary is
 *  here at all, and the version that binary reports. A plexer orch supports but
 *  the user never installed is a choice, not a defect — `installed` is only
 *  meaningful once `detected` is true. */
export interface BackendVersionObservation {
  plexerId: string;
  detected: boolean;
  installed: string | null;
}

export type BinaryStatus = Record<string, boolean>;

export interface PlexerInventoryEntry {
  readonly handle: unknown;
}

export interface DeclaredVsRealityDependencies {
  readonly processAlive: (pid: number, startToken: string | null) => boolean;
  readonly plexerInventory: (plexerId: string) => readonly PlexerInventoryEntry[] | null;
}

export type SshRunner = (destination: string, command: string, options?: { timeoutMs?: number }) => SshResult;

/**
 * Verify the DECLARED runtime against installed reality — the check the runtime
 * key exists for. No runtime is privileged here: the defect is the MISMATCH, not
 * which runtime won. Running under bun is perfectly fine if that is what you
 * declared; running under bun while settings.json says node means orch and its
 * shims disagree about the world, and that is what goes wrong silently.
 *
 * Two independent drifts are caught:
 *
 *  1. orch is executing under a runtime other than the declared one. This is the
 *     failure that motivated the whole axis: the `orch` entrypoint was a stale
 *     symlink to `bin/orch.ts` carrying a different shebang than the install
 *     declared, so every invocation ran under the wrong runtime for weeks with
 *     doctor reporting nothing, because no check compared declared to actual.
 *  2. The resolved `orch` entrypoint's shebang names a different runtime. This
 *     still fires when doctor itself happens to run under the declared runtime,
 *     so a mismatched entrypoint cannot hide behind a lucky invocation.
 *
 * A declared runtime missing from PATH is also a failure: the harness shims are
 * spawned by claude/codex using that runtime, so an absent binary means every
 * shim invocation fails silently at agent runtime rather than here.
 */
/**
 * Observations the verdict depends on. Injected so each row of the table is
 * testable deterministically — a test asserting the "running under bun" verdict
 * must not require the suite to actually be running under bun.
 */
export interface RuntimeObservations {
  /** The runtime actually executing orch. */
  running?: OrchRuntime;
  /** Absolute path of a runtime on PATH, or null when absent. */
  resolve?: (bin: string) => string | null;
  /** Runtime named by the resolved `orch` entrypoint's shebang, or null. */
  entrypoint?: () => { path: string; runtime: OrchRuntime | null } | null;
}

/** Run independent environment diagnostics; individual check failures never reject this function. */
export interface DoctorOptions {
  readonly yes?: boolean;
  readonly sshRunner?: SshRunner;
}
