# `orch settings` — one interactive editor over one settings registry

**Status: DECIDED. This is the implementation contract.**

## The problem

`orch settings` today prints a flat table and exits. Changing anything means either
hand-editing `$ORCH_DIR/settings.json` or knowing that a specific subcommand exists
(`settings models`, `settings skills`, `settings notify`, `settings thinking`). Most
settings have **no** subcommand at all — `fleet.spawn_cap`, `daemon.tcp_port`,
`timeouts.*`, `retention.*`, `tiling.first_split`, `queue.max_retries` are printed and
then unreachable. The user's only route to them is the JSON file the CLI exists to own.

Underneath, one setting is described in **three** unrelated places:

| where | what it holds |
|---|---|
| `src/config.ts` zod schema | its type and validity |
| `src/commands/settings.ts` row array | its label, current value and source |
| `src/config.ts` `writeSettings*` | how to persist it |

Adding a setting means editing three files and remembering the third. `defaults.thinking`
proved it: the schema and the resolver landed, and the setting stayed invisible in the
listing and unwritable from the CLI until it was wired by hand afterwards.

## Decision

**One declared registry of settings is the single source of truth, and `orch settings`
is an interactive editor over it.** Printing, editing and validating are three views of
one declaration, never three lists.

### 1. The registry

```ts
type SettingKind =
  | { readonly kind: "boolean" }
  | { readonly kind: "integer"; readonly min?: number; readonly max?: number }
  | { readonly kind: "choice"; readonly choices: readonly string[] }
  | { readonly kind: "multi"; readonly choices: readonly string[] }
  | { readonly kind: "text" }
  | { readonly kind: "list" };

interface SettingSpec {
  readonly key: string;              // "fleet.spawn_cap" — the path, and its display name
  readonly group: string;            // "fleet" — how the editor sections the list
  readonly help: string;             // one line, shown under the cursor
  readonly type: SettingKind;
  readonly read: (config: OrchConfig) => unknown;
  readonly write: (orchDir: string, value: unknown) => void;
  readonly env?: string;             // the env var that overrides it, if any
}
```

Every setting the schema declares appears exactly once, here. The editor, the printout
and `--json` all iterate this array; none of them carries its own list. A setting with
no `write` is **read-only by declaration**, not by omission.

**The zod schema stays the validator.** The registry does not restate types — a
`choice`'s `choices` and an `integer`'s bounds are derived from the schema where the
schema expresses them (as `NOTIFY_IDS` is already derived from `NotifyEntrySchema`).
Restating them is the drift this document exists to prevent.

### 2. The editor

Bare `orch settings` **on a TTY** opens the editor. It is built on the prompt wrappers
already in `src/setup/io.ts` (`promptSelect`, `promptMultiselect`, `promptAutocomplete`)
over the `@clack/prompts` dependency the repo already has. **No second TUI stack, no new
dependency** — a second prompt library is exactly the duplication `fallow` is run to
catch.

- Settings are listed grouped by `group`, each row showing key, current value, and source
  when the source is not `settings.json`.
- Enter opens the focused setting for editing; the widget follows its `kind` — boolean
  toggles, choice selects, multi uses space to toggle members, integer and text prompt
  with validation, list edits members.
- A value that fails validation is **refused with the reason**, and the editor stays open
  on that setting. It never writes an invalid value and never silently coerces one.
- Escape leaves a setting unchanged; the editor exits cleanly on cancel with nothing
  written.
- **A setting overridden by a flag or env var is shown as overridden and is not
  editable**, naming what wins. Writing a value the process would then ignore is a lie.
  This follows the existing precedence: flag > env > settings.json > default.

### 3. Non-interactive is unchanged and is not an afterthought

- No TTY, or `--json`: print exactly as today. Scripts and the existing tests keep working.
- `orch settings <key> <value>` sets one setting non-interactively, validated identically
  through the same registry entry. This is what CI and a dotfile bootstrap use.
- The existing subcommands (`models`, `skills`, `notify`, `thinking`) stay, because each
  drives a multi-step flow (catalogue refresh, file installation, sink probing) that a
  single-value editor cannot express. They must **write through the same registry entry**
  rather than calling a writer directly, so the two paths cannot disagree.

### 4. It never edits a file it could not read

If `settings.json` fails to load, the editor refuses and says so plainly, exactly as the
printout does today. It does not offer to "fix" a file it does not understand, and it
never rewrites a file written by a different `schemaVersion` — that is Rule 8's job and
the answer there is `orch setup`, not a silent migration.

## Slices

1. **The registry.** Declare every setting currently in the schema, with `read`/`write`.
   Test: every key the zod schema declares appears exactly once in the registry, and every
   registry key resolves against a real config. That test is what stops the next setting
   from being invisible.
2. **Printout from the registry.** Rewrite the current listing to iterate the registry.
   Byte-identical output; the existing tests are the characterization.
3. **`orch settings <key> <value>`.** Non-interactive single set through the registry,
   with validation and a real error message. Test each `kind`, including a refusal.
4. **The editor.** Interactive navigation and per-kind widgets over `src/setup/io.ts`.
   Test the reducer — focus movement, edit, cancel, commit — as a pure function; the
   prompt layer stays a thin shell so the logic is testable without a TTY.
5. **Overrides and read-only.** Show and refuse env/flag-overridden settings; test that an
   overridden setting cannot be written.
6. **Fold the subcommands onto the registry** so `models`/`skills`/`notify`/`thinking`
   persist through the same entry, and delete the direct writer calls.
