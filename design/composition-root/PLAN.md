# Composition root: build plan

Delegator's document. Workers never read this; they read `WORKER.md` plus one task file.

Background: `design/pi-code-patterns.md` sections 1, 2, 3, 6, 8. Every fact a worker needs is already in its task file. If a task turns out to need research, the delegator does the research and rewrites the task; the worker never researches.

## Target shape

```ts
// src/types/services.ts
export interface SettingsManager {
  readonly file: string;                 // path for messages
  current(): OrchSettings;               // throws the "does not exist ... Run: orch setup" error when absent
  currentOrNull(): OrchSettings | null;  // null when absent; still throws on a malformed file
  reload(): OrchSettings | null;         // drop the cached value, re-read storage
}
export interface Services {
  readonly orchDir: string;
  readonly settings: SettingsManager;
  readonly logger: Logger;
}
export type OrchDirService = Pick<Services, "orchDir">;
export type SettingsService = Pick<Services, "settings">;
export type LoggerService = Pick<Services, "logger">;

// src/settings/storage.ts
export interface SettingsStorage { readonly file: string; read(): string | null; }
export function fileSettingsStorage(orchDir: string): SettingsStorage;
export function inMemorySettingsStorage(text: string | null, file: string): SettingsStorage;

// src/settings/manager.ts
export function createSettingsManager(storage: SettingsStorage): SettingsManager;
export function fileSettingsManager(orchDir: string): SettingsManager;
export function inMemorySettingsManager(text: string | null, file: string): SettingsManager;

// src/services.ts
export interface ServicesOptions { orchDir?: string; settings?: SettingsManager; logger?: Logger }
export function createServices(options?: ServicesOptions): Services;
```

Roots. Exactly these build a `Services`:

| Root | Where | Builds |
|---|---|---|
| CLI | `src/commands/index.ts` `runCommand` | full `createServices()` once, passed to every `cmd*` |
| daemon | `src/daemon/orchd.ts` `startDaemon` | full `createServices()` once; the settings watcher calls `services.settings.reload()` |
| hook shims | `extensions/claude/index.ts`, `extensions/codex/index.ts` | `orchDir` + presence writer only, through one helper |
| in-process extensions | `extensions/pi/index.ts`, `extensions/omp/index.ts` | `createServices()` at registration |

Depth rule. Commands receive `services`. Helpers one level down declare the narrowest `Pick<Services, ...>` they use. Leaves (`src/entities.ts`, `src/presence/*`, `src/policy/*`, `src/settings/read.ts`) take plain values: `orchDir: string`, `settings: OrchSettings`, `hosts`. Nothing takes the whole bag more than one level below a root. No function anywhere defaults a parameter to `orchDir()` or `loadSettings()`.

Writes to `settings.json` stay in `src/settings/write.ts` taking `orchDir: string`. Moving writes behind the storage port is a later plan.

## The loop

1. Pick the next wave. Spawn as many workers as the wave has parallel tasks, max 4 per tab, tiled. `luna:high` unless the task says otherwise.
2. Dispatch each task in one shot with the commands under "Dispatch commands". A plain `orch dispatch` lands on a clean session, which satisfies Rule 7. `--keep-context` is used only for the chains listed under "Context continuity".
3. Watch the push stream. Each worker reports `DONE` with its pasted check output, or `BLOCKED` with the reason.
4. On `DONE`: the report is the agent's result; orch keeps it in that agent's `results.jsonl` and `orch result <agent>` reads it back. Nothing is copied anywhere. If it names callers or follow-ups, write the follow-up task files immediately (see "Generated tasks") and dispatch them to the freed worker. Never leave a worker idle while tasks exist.
5. On `BLOCKED`: fix the task file, redispatch clean. Escalate straight from `luna:high` to `sol:low`, then `sol:high` (cap), only that worker. Never `luna:xhigh`.
6. When a wave's last task lands, run `bun check` from the repo root over the whole tree. Green means commit point. Red means write a fix task from the output and dispatch it. Do not start the next wave on a red tree except where the wave table says the tree is expected red until a closing task.

Rules that bind the delegator: Rule 1 (never build, migrate, reload), Rule 0 (the gate is the delegator's whole-tree `bun check`), Rule 3 (one owner per file per wave), Rule 7 (clean session per task, except the chains Bryan authorised below).

## Dispatch commands

The prompt is always the rules sheet followed by the task, piped as one file so the rules are in the prompt, not merely available.

Fresh session (default):
```
cat design/composition-root/WORKER.md design/composition-root/tasks/<id>.md \
  | orch dispatch <agent> --file - --model luna:high
```

A 2b or 3a task, which carries its README:
```
cat design/composition-root/WORKER.md design/composition-root/tasks/2b-README.md design/composition-root/tasks/2b-clean.md \
  | orch dispatch <agent> --file -
```

Chained onto the same agent, context kept:
```
cat design/composition-root/WORKER.md design/composition-root/tasks/<next id>.md \
  | orch dispatch <agent> --file - --keep-context
```

Handing one agent's result to another. When a task says "the 2a signatures" or "sibling signatures", the delegator pipes the finished agent's result through orchd right after the dispatch:
```
orch pipe <finished agent> <working agent> "New signatures from <task id>; pass what each now requires."
```
One `pipe` per source. Every 2b worker gets the three 2a results piped. `2b-spawn-index` gets the three spawn siblings. `2c-01` gets every 2a and 2b result. `4-02` gets every 3a result. Nothing is copied to disk and nothing is pasted into a task file.

Model per task: pass `--model luna:low` or `--model sol:low` when the task file names one; otherwise omit and the agent's pinned default applies.

## Context continuity

A chain is one agent doing consecutive tasks with `--keep-context`, because the second task is faster with the first one's file knowledge in the window. A break point is where a fresh session is better: a new file, a big file, or a task whose only input is written down already. Chains run serially by nature, so they are used only where the dependency is real.

Chains:

| Chain | Why |
|---|---|
| `10` → `11` → `13` | the manager's author writes the factory over it and the tests against it |
| `2a-01-target` → `2b-status` → `2b-status-verb-live-review` | status is the heaviest consumer of target helpers; the author of the new signatures threads them |
| `2a-03-lifecycle-index` → `2b-lifecycle-close` → `2b-lifecycle-reload` → `2b-lifecycle-reset-rename` | one helper module, four consumers in the same directory |
| `2b-spawn-flags-admission` → `2b-spawn-models-placement` → `2b-spawn-report` → `2b-spawn-index` | `spawn/index.ts` needs every sibling's new signature; the agent that changed them holds them, so nothing is piped |
| `3a-<file>` → its generated `3b-*` tasks | the agent that changed the signature fixes its own callers, as long as the caller file is not claimed by another 3b task in flight |
| `4-02-daemon-root` → `4-03-daemon-state-object` | both are `orchd.ts`; the second is a mechanical move over what the first just wrote |

Break points, always a fresh session:

- The first task of every wave.
- `2c-01-cli-root`: `index.ts` has not been touched by anyone; the input is the full set of 2a and 2b results, piped in.
- `4-02-daemon-root`: `orchd.ts` is the largest file in the daemon; start it with an empty window and the 3a results piped in.
- Every `6-*` task: their inputs are the tree itself.
- Any task redispatched after `BLOCKED`.
- Any task whose predecessor on that agent reported a check that was not clean; a dirty window compounds.

Everything not listed above runs on whichever agent is free, fresh.

Results are the record. Do not close an agent whose result a later task still needs to pipe; reset it instead, or read the result with `orch result <agent> --json` before closing.

## Waves

Tasks live in `tasks/`. Parallel means dispatch together. Sequential means one at a time in the order listed. "Tree red until" names the closing task after which the whole-tree gate must be green.

| Wave | Tasks | Mode | Tree red until | Commit after |
|---|---|---|---|---|
| 0 foundation | `00-services-types`, `01-settings-parse-split`, `02-settings-storage`, `03-die-single`, `04-watch-load-option` | parallel (5) | never | yes |
| 1 manager and factory | `10-settings-manager`, `11-services-factory`, `12-test-helper-services`, `13-settings-manager-tests` | `10` first, then `11`; `12` and `13` after `10` | never | yes |
| 2a helpers | `2a-01-target`, `2a-02-entities`, `2a-03-lifecycle-index` | parallel (3) | `2c-01` | no |
| 2b commands | every `2b-*` file | parallel, 10 at a time, any order | `2c-01` | no |
| 2c CLI root | `2c-01-cli-root` | alone, after every 2b reports DONE | closes it | yes |
| 3a leaf signatures | every `3a-*` file | parallel, 10 at a time | generated `3b-*` | no |
| 3b callers | generated from 3a results | parallel, one per caller file | closes it | yes |
| 4 daemon root | `4-01-work-loop-settings`, `4-02-daemon-root`, `4-03-daemon-state-object` | sequential | `4-02` | yes after `4-03` |
| 5 shim roots | `5-01-presence-session-helper`, `5-02-extension-roots` | parallel (2) | never | yes |
| 6 contract and enforce | `6-01-delete-load-settings`, `6-02-env-read-into-services`, `6-03-delete-command-logger`, `6-04-watch-load-required`, `6-05-check-bridge-rule`, `6-06-test-sweep` | `6-01` to `6-04` parallel (4); then `6-05`; then `6-06` | generated from `6-06` | yes |

Model tiers: `luna:low` for any task marked trivial, `sol:low` for `2a-01-target`, `2c-01-cli-root`, `4-02-daemon-root`, `4-03-daemon-state-object`. Everything else `luna:high`. `luna:xhigh` is never used.

## Generated tasks

Wave 3a workers change a signature in their own file and list every caller the compiler names, as `path:line` lines under `CALLERS:`. The delegator reads those with `orch result <agent>`, turns each distinct caller file into one `3b-<file>.md` task using the template below, one owner per file, and dispatches them as workers free up. Two 3a results naming the same caller file merge into one 3b task.

```
# 3b: thread values into <caller file>

Owns: <caller file>

Do:
- <for each CALLERS line>: at line N, `<old call>` now requires `<param>`. Pass `<the value the caller already holds: services.orchDir | services.settings.current() | orchDir | settings>`.
- If this file is a command, it already receives `services`. If it is a leaf, add the parameter to its own signature and report the new callers the same way (CALLERS:).

Check: scoped check on this file. Tests: the test files that import this file.
```

Wave 6-06 works the same way for test files.

## Commit points

Commit only on a green whole-tree `bun check` and green touched tests, per Rule 0. Suggested messages:

- wave 0: `Add Services types, settings storage port, one die, watch load option`
- wave 1: `Add SettingsManager and createServices`
- wave 2: `Thread Services through every command from one CLI root`
- wave 3: `Remove orchDir and loadSettings defaults from leaves`
- wave 4: `Build the daemon from one root and drop its module-level state`
- wave 5: `Give shims and extensions their own three-line roots`
- wave 6: `Delete loadSettings and orchDir globals; enforce the roots in check-bridge`
