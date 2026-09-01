import type { z } from "zod";
// Type-only: `z.infer` over the runtime schemas, erased at compile time, so
// this creates no runtime edge out of the types layer.
import type { HostSchema, NotifyEntrySchema } from "../settings/schema.ts";
import type { AdapterId } from "./adapter.ts";
import { AGENT_STATES } from "../agent-state.ts";
import type { BackendId } from "./backend.ts";
import type { OrchRuntime } from "../runtimes.ts";
import type { ThinkingLevel } from "./policy.ts";
import type { TileFirstSplit } from "./backend.ts";
import type { LogLevel } from "./core.ts";

/** The shared agent-state vocabulary used by presence, events, and notify sinks. */
export const NOTIFY_STATES = AGENT_STATES;

export type NotifyState = (typeof NOTIFY_STATES)[number];

export type NotifyEntry = z.infer<typeof NotifyEntrySchema>;

export type HostSettings = z.infer<typeof HostSchema>;

/** Settings normalized for consumers: every section present and defaults applied. */
export interface OrchSettings {
  runtime: OrchRuntime;
  enabled: { adapters: AdapterId[]; backends: BackendId[] };
  defaults: { adapter?: AdapterId; backend?: BackendId; models: Partial<Record<AdapterId, string>>; thinking?: ThinkingLevel; thinking_by_harness?: Partial<Record<AdapterId, ThinkingLevel>>; worktree: boolean };
  fleet: { max_agents_per_pack: number; max_depth: number; max_agents_total?: number; max_agents_per_space: Record<string, number>; worker_peer_tools: boolean; cross_space: boolean };
  models: { allowed: Partial<Record<AdapterId, string[]>>; preferred: Partial<Record<AdapterId, string[]>> };
  workers: { inherit_extensions: boolean; exclude_extensions: string[]; builtin_tools: boolean; allow_tools: string[] };
  queue: { max_retries: number };
  retention: { ended_agents_days: number; queue_days: number; events_days: number; runs_days: number; outbox_days: number; control_outcomes_days: number; logs_days: number };
  logging?: { level: LogLevel };
  timeouts: { dispatch_ack_ms: number; wait_ms: number; adapter_command_ms: number; notify_ms: number };
  notify: NotifyEntry[];
  locked_commands: string[];
  hosts: Record<string, HostSettings>;
  spaces: Record<string, string>;
  daemon: { tcp_port: number; idle_shutdown_minutes: number };
  doctor: { unclaimed_after_ms: number };
  tiling: { first_split: TileFirstSplit };
  skills: { install: boolean; roots: string[] };
}

export interface SettingsWatchOptions {
  onChange: (config: OrchSettings) => void;
  onWarn?: (message: string) => void;
  debounceMs?: number;
  pollMs?: number;
};

export interface SettingsWatch {
  stop: () => void;
};

/** Where a resolved setting's winning value came from. */
export type SettingSource = "flag" | "env" | "settings.json" | "default";

/**
 * The declared shape of one setting is the contract.
 *
 * This file holds ONLY the types, so the registry that declares every setting and
 * the editor that walks them can both depend on the shape without depending on
 * each other. One setting is described in exactly one place — the registry entry —
 * and printing, editing and validating are three views of that one declaration.
 */

export type SettingKind =
  | { readonly kind: "boolean" }
  | { readonly kind: "integer"; readonly min?: number; readonly max?: number }
  | { readonly kind: "choice"; readonly choices: readonly string[] }
  | { readonly kind: "multi"; readonly choices: readonly string[] }
  /** A pick-list of delivery sinks. Each picked sink is an object: its id, the one value
   *  `fields` says it carries, and the `states` it fires on. */
  | {
    readonly kind: "sinks";
    readonly choices: readonly string[];
    readonly fields: Readonly<Record<string, { readonly name: string; readonly suggestion?: string }>>;
    readonly states: readonly string[];
    /** Fired on when a sink names no states of its own. */
    readonly defaultStates: readonly string[];
  }
  | { readonly kind: "text" }
  | { readonly kind: "list" };

export interface SettingSpec {
  /** The dotted path into settings.json, and its display name. */
  readonly key: string;
  /** How the editor sections the list ("fleet"). */
  readonly group: string;
  /** One line, shown under the cursor. */
  readonly help: string;
  readonly type: SettingKind;
  readonly read: (config: OrchSettings) => unknown;
  /** Absent means read-only BY DECLARATION — never by omission. */
  readonly write?: (orchDir: string, value: unknown) => void;
  /** The env var that overrides this setting, if any. */
  readonly env?: string;
}

/** A declared setting together with the value currently shown by the editor. */
export interface EditorSetting {
  readonly spec: SettingSpec;
  readonly value: unknown;
  /** Provenance used by the shell when rendering the row. */
  readonly source?: string;
  /** A flag or environment value that wins over settings.json, making this row read-only. */
  readonly override?: string;
}

export interface PendingWrite {
  readonly key: string;
  readonly value: unknown;
}

export interface BrowsingState {
  readonly mode: "browsing";
  readonly settings: readonly EditorSetting[];
  readonly focusedIndex: number;
  readonly pendingWrites: readonly PendingWrite[];
  readonly reason?: string;
}

export interface EditingState {
  readonly mode: "editing";
  readonly settings: readonly EditorSetting[];
  readonly focusedIndex: number;
  readonly focused: EditorSetting;
  readonly draft: unknown;
  readonly pendingWrites: readonly PendingWrite[];
  readonly reason?: string;
}

export type EditorState = BrowsingState | EditingState;

export type EditorAction =
  | { readonly type: "move"; readonly direction: "up" | "down" }
  | { readonly type: "open" }
  | { readonly type: "cancel" }
  | { readonly type: "commit"; readonly value: unknown };

/**
 * One thing in settings.json the schema will not accept.
 *
 * A defect carries everything a person needs to decide what to do about it — where it is,
 * what they wrote there, and what is wrong with it — because nothing may act on their
 * behalf. A key one letter off a real one holds a value somebody typed on purpose, so it
 * is reported, never assumed to be junk and never removed to make the file load.
 */
export interface SettingsDefect {
  /** Dotted path into settings.json; "" when the file itself is not parseable JSON. */
  readonly path: string;
  /** What the file holds there, verbatim, so a repair can carry it to the right key. */
  readonly value: unknown;
  readonly problem: string;
  /** The current key this is most likely a misspelling of. Never a renamed key: a value
   *  whose setting no longer exists is the person's to place, not orch's to guess. */
  readonly suggestion?: string;
  /** The one value the schema accepts here, when it accepts exactly one. */
  readonly expected?: unknown;
}

/** One edit the repair screen makes to settings.json. Every one of them is a choice a
 *  person made on a defect; nothing here is ever applied automatically. */
export type SettingsRepair =
  | { readonly kind: "rename"; readonly from: string; readonly to: string }
  | { readonly kind: "set"; readonly path: string; readonly value: unknown }
  | { readonly kind: "drop"; readonly path: string };

/** What the person chose for one defect. `leave` writes nothing and is where every
 *  defect starts: quitting the screen leaves the file exactly as they wrote it. */
export type RepairChoice = "leave" | "rename" | "set" | "drop";

export interface RepairState {
  readonly defects: readonly SettingsDefect[];
  /** One choice per defect, index-aligned with `defects`. */
  readonly choices: readonly RepairChoice[];
  readonly focusedIndex: number;
  /** Why the last action was refused, shown on the status line. */
  readonly reason?: string;
}

export type RepairAction =
  | { readonly type: "move"; readonly direction: "up" | "down" }
  | { readonly type: "choose"; readonly choice: RepairChoice };
