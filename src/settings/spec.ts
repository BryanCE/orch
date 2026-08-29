/**
 * The declared shape of one setting. `TASKS/14-settings-tui.md` is the contract.
 *
 * This file holds ONLY the types, so the registry that declares every setting and
 * the editor that walks them can both depend on the shape without depending on
 * each other. One setting is described in exactly one place — the registry entry —
 * and printing, editing and validating are three views of that one declaration.
 */
import type { OrchConfig } from "../config.ts";

export type SettingKind =
  | { readonly kind: "boolean" }
  | { readonly kind: "integer"; readonly min?: number; readonly max?: number }
  | { readonly kind: "choice"; readonly choices: readonly string[] }
  | { readonly kind: "multi"; readonly choices: readonly string[] }
  | { readonly kind: "text" }
  | { readonly kind: "list" };

export interface SettingSpec {
  /** The dotted path into settings.json ("fleet.spawn_cap"), and its display name. */
  readonly key: string;
  /** How the editor sections the list ("fleet"). */
  readonly group: string;
  /** One line, shown under the cursor. */
  readonly help: string;
  readonly type: SettingKind;
  readonly read: (config: OrchConfig) => unknown;
  /** Absent means read-only BY DECLARATION — never by omission. */
  readonly write?: (orchDir: string, value: unknown) => void;
  /** The env var that overrides this setting, if any. */
  readonly env?: string;
}
