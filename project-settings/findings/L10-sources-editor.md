## 1. `"settings.json"` as a `SettingSource` value or source comparison

- `packages/orch/src/settings/read.ts:373` — `return { value: opts.settings, source: "settings.json" };`
- `packages/orch/src/settings/shell/state.ts:21` — `return rawValue(raw, spec.key) === undefined ? "default" : "settings.json";`
- `packages/orch/src/settings/view.ts:86` — `else if (entry.source !== undefined && entry.source !== "settings.json") tags.push(`[${entry.source}]`);`
- `packages/orch/src/commands/settings.ts:392` — `const source = raw !== undefined ? "settings.json" : "default";`
- `packages/orch/src/commands/settings.ts:411` — `out.enabled = { value: settings.enabled, source: enabledSet ? "settings.json" : "default", agentWritable: false };`
- `packages/orch/src/types/settings.ts:103` — `export type SettingSource = "flag" | "settings.json" | "default";`
- No matching source-value or source-comparison occurrences in `packages/orch/extensions/`, `packages/web/src/`, or `packages/orch/test/`; searched those trees for the literal.

## 2. Editor state signatures and manager source

```ts
function sourceFor(spec: SettingSpec, raw: Record<string, unknown>): SettingSource
export function loadEntries(manager: SettingsManager): EditorSetting[]
export function commitAndFlush(session: Session, manager: SettingsManager, editing: EditingState, value: unknown): void
export function resetFocused(session: Session, manager: SettingsManager): void
```

- `sourceFor` does not take a `SettingsManager`; `loadEntries`, `commitAndFlush`, and `resetFocused` do.
- `loadEntries` uses `manager.file` and `manager.current()`. The manager is supplied by the editor entry point, `runSettingsEditor(manager, offers)`, which receives `services.settings` from `commands/settings.ts` in `launchSettingsEditor`.
- Other exported functions in `state.ts`:

```ts
export interface Session { /* browsing state */ }
export function asBrowsing(state: EditorState): BrowsingState
export function stepFocus(state: BrowsingState, filter: string, direction: "up" | "down"): BrowsingState
export function refocusVisible(session: Session): void
export function screenOf(session: Session, manager: SettingsManager): SettingsScreen
export function reloadRows(session: Session, manager: SettingsManager, focusKey: string): void
export function resetFocused(session: Session, manager: SettingsManager): void
export function toggleAgentGrant(session: Session, manager: SettingsManager): void
export function cancelEdit(session: Session, editing: EditingState, status?: string): void
export function commitPick(session: Session, manager: SettingsManager, editing: EditingState, picked: unknown): void
export function commitAndFlush(session: Session, manager: SettingsManager, editing: EditingState, value: unknown): void
```

## 3. Settings command signatures and settings source

```ts
function rawSetting(orchDirPath: OrchDir, ...keys: string[]): unknown
function writableSpec(key: string): SettingSpec
async function refuseUngrantedAgentWrite(services: DaemonClient, key: string): Promise<void>
async function setSingleSetting(services: DaemonClient, key: string, input: string): Promise<void>
function collectSettingsProvenance(services: Pick<Services, "orchDir">, settings: OrchSettings): ProvenanceRow[]
function printSettingsOutput(services: Pick<Services, "settings">, settings: OrchSettings, provenance: readonly ProvenanceRow[], json: boolean): void
async function settingsRoot(services: Services, invocation: Invocation): Promise<void>
export async function cmdSettings(services: Services, args: string[]): Promise<void>
async function runSettingsVerb(services: Services, args: string[]): Promise<void>
```

- `rawSetting` gets its `OrchDir` from `services.orchDir` at the call in `collectSettingsProvenance`; it reads the raw file for provenance.
- `refuseUngrantedAgentWrite` and `setSingleSetting` receive daemon services; the manager is `services.settings`. `writableSpec` takes no settings object.
- `collectSettingsProvenance` receives settings from `currentSettings(services)` in `settingsRoot`; `printSettingsOutput` receives the same value. Its manager comes from `services.settings` for the displayed file path.
- `settingsRoot` / `runSettingsVerb` / `cmdSettings` receive `Services`; the manager is `services.settings`. The interactive path passes it to `runSettingsEditor`.
- `runSettingsEditor` signature: `export async function runSettingsEditor(manager: SettingsManager, offers: HarnessOffers): Promise<void>`. `launchSettingsEditor` supplies `services.settings` and offers from `setupProbes(services).offers`.
- `--harness` and `--plexer` are read from `invocation.flags` in `settingsRoot` and passed to `switchSettingsDefaults`; `parseCommand("settings", args)` constructs the invocation in `runSettingsVerb`. The registry declares both flags on the settings command.
- Requested names `cmdSettings`, `runSettingsVerb`, `settingsRoot`, `setSingleSetting`, `writableSpec`, `refuseUngrantedAgentWrite`, `rawSetting`, `collectSettingsProvenance`, `printSettingsOutput` are present. No function named `runSettingsEditor` is declared in `commands/settings.ts`; it is imported from the shell module.

## 4. Editor key handling

- `browseOnce` installs the key handler and delegates to `searchKey` while searching, otherwise `browseKey` (`packages/orch/src/settings/shell/edit.ts:81-103`).
- Browse bindings: Return falls through; Escape clears filter or quits; Up/Down move; Ctrl+D resets; `a` toggles agent grant; `/` starts search. Search bindings: Return keeps matches; Escape clears; Up/Down move; Backspace deletes; printable characters append.
- `Tab` is not bound. The key dispatch is:

```ts
if (info.name === "return") return;
if (info.name === "escape") { /* clear filter or quit */ return; }
if (info.name === "up" || info.name === "down") { moveFocus(session, info.name); return; }
if (info.ctrl === true && info.name === "d") { resetFocused(session, manager); return; }
if (char === AGENT_KEY) { toggleAgentGrant(session, manager); return; }
if (char === SEARCH_KEY) session.searching = true;
```

## 5. Registry settings command entry

```ts
{
  name: "settings", section: "maintenance", args: "[<key> <value>]",
  summary: "Every effective setting and its source.",
  flags: [{ ...HARNESS, help: "Switch the default harness." }, { ...PLEXER, help: "Switch the default plexer." }],
  subcommands: [
    {
      name: "models",
      summary: "Re-pick, per harness: launch model, picker quicklist, and the launchable set.",
      flags: [
        { ...HARNESS, help: "One harness instead of every enabled one." },
        { ...MODEL, placeholder: "<harness>=<model[:thinking]>" },
        { name: "--refresh", arity: "none", help: "Ask the harnesses again instead of using the stored catalogues." },
      ],
    },
    {
      name: "thinking", args: "[<level>]",
      summary: "Thinking effort for every launch, independent of the model.",
      flags: [
        { ...HARNESS, help: "Set or clear that harness's override instead of the global default." },
        { name: "--clear", arity: "none", help: "Remove the override named by --harness." },
      ],
    },
    {
      name: "skills",
      summary: "Turn the skill install on or off and choose where it writes.",
      flags: [
        { name: "--skills", arity: "none", help: "Write every packaged skill now." },
        { name: "--no-skills", arity: "none", help: "Record the refusal and leave files already there alone." },
        { name: "--store", arity: "one", placeholder: "<path>", help: "The one directory holding the real files. Default ~/.agents/skills." },
        { name: "--link", arity: "one", placeholder: "<path>[,<path>...]", help: "Harness directories symlinked into the store. Default: the skills directory of each enabled harness that has its own." },
      ],
    },
    {
      name: "notify",
      summary: "The sinks orchd delivers notifications through.",
      flags: [],
      subcommands: [
        { name: "list", summary: "Each sink, the states it fires on, and where it delivers.", flags: [] },
        { name: "add", args: "<sink> [--<field>=<value>]...", summary: "Record one sink. A sink already configured is replaced, keeping fields this call does not name.", flags: [{ ...ONLY, help: "States it fires on. Default blocked,error,done." }], openFlags: true },
        { name: "remove", args: "<sink>", summary: "Stop delivering through that sink.", flags: [] },
      ],
    },
    { name: "grant", args: "<key>", summary: "Let an agent write that setting with orch settings.", flags: [] },
    { name: "revoke", args: "<key>", summary: "Make that setting the human's alone again.", flags: [] },
  ],
}
```
