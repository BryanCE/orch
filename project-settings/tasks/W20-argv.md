# W20: backends take argv and env, and quote for their own shell (Part E)

Read `project-settings/claude-worker-policy.md`, section "Part E", first. Paths are from the repo root `/home/bryan/orch`. No `as` casts, no `any`. Do not run any test; the test files are a later wave.

The shapes every task builds against. Each is written by the task named; before it lands, an error that is only about it is not yours.
- T1, `packages/orch/src/types/adapter.ts`: `AgentAdapter` has no `interactiveCmd`. `WorkerLaunchRole` is
  `{ restrictedInteractiveArgv(opts: SpawnOpts): readonly string[]; restrictedHeadlessCmd(prompt: string, opts: SpawnOpts): string[] }`.
  `CompactionRole` is `{ readonly envNames: readonly string[]; launch(points, model): CompactionLaunch }`. `QuicklistForm` is gone.
- T2, `packages/orch/src/shared/harness.ts`: `launchCompaction(launchAt: (tokens: number) => CompactionLaunch, envNames: readonly string[]): CompactionRole`.
  `packages/orch/src/policy/workers.ts`: `policyEnvNames(adapter: AgentAdapter): readonly string[]`.
- T3, `packages/orch/src/types/backend.ts`:
  ```ts
  /** What a launch runs: the harness's argv, or the shell line `--cmd` gave. */
  export type LaunchProgram =
    | { readonly kind: "argv"; readonly argv: readonly string[] }
    | { readonly kind: "shell"; readonly line: string };
  ```
  `AgentInputRole` gains `readonly shell: ShellDialect`. `RelaunchRole.relaunch(handle: Handle, program: LaunchProgram, opts: BackendSpawnOpts)`.
  `packages/orch/src/shared/shell.ts`: `type ShellDialect = "posix" | "cmd"`, `shellCommand(dialect, program): string`, `shellLaunchLine(dialect, program, env, unset): string`.
  `packages/orch/src/host.ts`: `hostShellDialect(): ShellDialect`.
  `packages/orch/src/backends/backend.ts`: `launchProgram(adapter: AgentAdapter, opts: BackendSpawnOpts): LaunchProgram`; `createInteractiveCommand` is gone.
- T5, `packages/orch/src/daemon/server/spawn/models.ts`: `launchArgv(adapter, launch, tuning, orchDir): readonly string[]` in place of `launchCommand`.
  `packages/orch/src/daemon/server/terminal-relaunch.ts`: `relaunchPlace(state, agent, place, program: LaunchProgram, opts)` and `relaunchTerminal(state, agent, quitText, program: LaunchProgram, opts)`.

## T1 One argv per adapter: types, pi, omp, opencode
Edit `packages/orch/src/types/adapter.ts`:
- Delete `interactiveCmd` from `AgentAdapter` (L364-365, with its doc line). Reword `interactiveArgv`'s doc to: `The interactive launch as RAW argv: the executable first, then unquoted arguments. Each backend quotes it for its own shell, or a plexer that starts the harness itself takes it as is.`
- `WorkerLaunchRole` (L193): `restrictedInteractiveCmd(opts: SpawnOpts): string;` becomes `restrictedInteractiveArgv(opts: SpawnOpts): readonly string[];`.
- `CompactionRole` (L284): add `/** Every env name \`launch\` can write, so a relaunch into a running shell can remove the ones it no longer sets. */ readonly envNames: readonly string[];` before `launch`.
- Delete `QuicklistForm` (L387) and its doc comment.
Edit `packages/orch/src/adapters/pi.ts`:
- `modelSelectionArgv(flags, opts)`: drop the `form` parameter; the cycle push becomes `argv.push(flags.cycle, patterns)`. `bridgeModelArgv(opts: SpawnOpts): string[]` drops `form` too. `piLaunchArgv(opts, worker, prompt, thinking)` drops its `form` parameter, and every call drops the `"shell"`/`"argv"` argument.
- Delete `interactiveCmd` (L443-446). Rename `restrictedInteractiveCmd` (L454) to `restrictedInteractiveArgv(opts: SpawnOpts): readonly string[]` returning `piLaunchArgv(opts, true, undefined, this.thinking)`. The abstract declaration (L355) and the `workerLaunch` object (L359) follow the rename: `restrictedInteractiveArgv: (opts: SpawnOpts): readonly string[] => this.restrictedInteractiveArgv(opts)`.
- `compaction` (L440): `{ envNames: [], launch: (): CompactionLaunch => NO_COMPACTION }`.
- Remove `QuicklistForm` from the type import, and `shellQuote` if then unused.
Edit `packages/orch/src/adapters/omp.ts`:
- Delete `interactiveCmd` (L90-92). `restrictedInteractiveCmd` becomes `restrictedInteractiveArgv(opts: SpawnOpts): readonly string[]` returning `["omp", ...ompToolArgv(opts), ...ompExtensionArgv(opts), ...bridgeModelArgv(opts)]`. Every `bridgeModelArgv(opts, "argv")` becomes `bridgeModelArgv(opts)`.
Edit `packages/orch/src/adapters/opencode.ts`: delete `interactiveCmd` (L83-85).
Verify: packages/orch/src/types/adapter.ts packages/orch/src/adapters/pi.ts packages/orch/src/adapters/omp.ts packages/orch/src/adapters/opencode.ts
Errors in other files about `interactiveCmd`, `restrictedInteractiveCmd` or `envNames` are the other tasks'; report "pending" when only those remain.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T2 Claude, codex, the compaction role and the policy's env names
Edit `packages/orch/src/shared/harness.ts`: `launchCompaction(launchAt, envNames: readonly string[]): CompactionRole` returns `{ envNames, launch: ... }` (launch unchanged). Add to its doc: `\`envNames\` is every name \`launchAt\`'s env can hold.`
Edit `packages/orch/src/adapters/claude.ts`:
- `compaction` (L342): `launchCompaction((tokens) => ({ env: { [COMPACT_WINDOW_ENV]: String(tokens) }, args: [] }), [COMPACT_WINDOW_ENV])`.
- Delete `interactiveCmd` (L364-366).
Edit `packages/orch/src/adapters/codex.ts`:
- `compaction` (L116): add `[]` as the second argument of `launchCompaction`.
- Delete `interactiveCmd` (L135-139). Delete the `shellQuote` import if then unused.
Edit `packages/orch/src/policy/workers.ts`: add, after `policyEnv`, with `READ_ONLY_ENV` and `OUT_DIR_ENV` imported from `./read-only.ts` (add to an existing import of that file if there is one):
```ts
/** Every env name a launch policy can set for `adapter`'s harness: its compaction point's names
 *  and the read-only names. A relaunch into a running shell removes the ones its env leaves out. */
export function policyEnvNames(adapter: AgentAdapter): readonly string[] {
  return [...(adapter.compaction?.envNames ?? []), READ_ONLY_ENV, OUT_DIR_ENV];
}
```
If `READ_ONLY_ENV` or `OUT_DIR_ENV` is not exported from `packages/orch/src/policy/read-only.ts`, export it.
Verify: packages/orch/src/shared/harness.ts packages/orch/src/adapters/claude.ts packages/orch/src/adapters/codex.ts packages/orch/src/policy/workers.ts
Errors in other files about `interactiveCmd` or `envNames` are the other tasks'; report "pending" when only those remain.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T3 The launch program, the shell renderer, held
Create `packages/orch/src/shared/shell.ts`:
```ts
// Rendering a launch for the shell that runs it. A backend declares its shell's dialect; this is
// the one place a launch's argv and env become shell text.
import { shellQuote } from "../util.ts";
import type { LaunchProgram } from "../types/backend.ts";

/** The shell a backend's pane or process runs a line in. */
export type ShellDialect = "posix" | "cmd";

/** One argument quoted for cmd.exe: in double quotes, with each `"` in it doubled. */
function cmdQuote(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

const QUOTE: Readonly<Record<ShellDialect, (value: string) => string>> = { posix: shellQuote, cmd: cmdQuote };

/** `program` as one line of `dialect`: argv quoted for it, a `--cmd` line as given. */
export function shellCommand(dialect: ShellDialect, program: LaunchProgram): string {
  return program.kind === "shell" ? program.line : program.argv.map(QUOTE[dialect]).join(" ");
}

/** The line that starts `program` in a shell that is already running, with `env` set and each
 *  name in `unset` removed. posix runs it under `env`, and a `--cmd` line under `sh -c`; cmd sets
 *  each variable first. */
export function shellLaunchLine(dialect: ShellDialect, program: LaunchProgram, env: Readonly<Record<string, string>>, unset: readonly string[]): string {
  const removed = unset.filter((name) => !Object.hasOwn(env, name));
  if (dialect === "cmd") {
    const sets = [...removed.map((name) => `set "${name}="`), ...Object.entries(env).map(([name, value]) => `set "${name}=${value}"`)];
    return [...sets, shellCommand("cmd", program)].join(" & ");
  }
  const command = program.kind === "shell" ? ["sh", "-c", shellQuote(program.line)].join(" ") : shellCommand("posix", program);
  return ["env", ...removed.flatMap((name) => ["-u", name]), ...Object.entries(env).map(([name, value]) => `${name}=${shellQuote(value)}`), command].join(" ");
}
```
Edit `packages/orch/src/types/backend.ts`:
- Add the `LaunchProgram` type from the top of this file, with its doc, above `AgentInputRole`.
- `AgentInputRole` gains, first: `/** The shell its pane types a line into. */ readonly shell: ShellDialect;` with `import type { ShellDialect } from "../shared/shell.ts";`.
- `RelaunchRole.relaunch(handle: Handle, program: LaunchProgram, opts: BackendSpawnOpts)`; its doc: `End the place's program and run \`program\` in a fresh place with the env \`opts\` builds.`
Edit `packages/orch/src/host.ts`: after `hostShell`, add
```ts
const HOST_SHELL_DIALECT: Record<HostOs, ShellDialect> = { linux: "posix", darwin: "posix", windows: "cmd" };

/** The dialect of the shell `hostShell` runs. */
export function hostShellDialect(): ShellDialect {
  return HOST_SHELL_DIALECT[hostOs()];
}
```
with `import type { ShellDialect } from "./shared/shell.ts";`.
Edit `packages/orch/src/backends/backend.ts`: replace `createInteractiveCommand` with
```ts
/** What a launch runs: the caller's `--cmd` line, else the harness's argv: a given program, else
 *  its worker launch, else its plain interactive launch. */
export function launchProgram(adapter: AgentAdapter, opts: BackendSpawnOpts): LaunchProgram {
  if (opts.cmd !== undefined) return { kind: "shell", line: opts.cmd };
  const argv = opts.program ?? adapter.workerLaunch?.restrictedInteractiveArgv(opts) ?? adapter.interactiveArgv(opts);
  if (argv.length === 0) throw new Error(`adapter ${String(adapter.id)} returned an empty interactive argv`);
  return { kind: "argv", argv };
}
```
Import `LaunchProgram` as a type; delete the `shellQuote` import if then unused.
Edit `packages/orch/src/backends/held/index.ts`:
- `shellRun(program: LaunchProgram): HeldProgram` returns `{ file, args: [...args, shellCommand(hostShellDialect(), program)] }`. Its doc: `A held PTY runs its program through this host's shell, quoted for that shell, as a pane would run it.`
- `startHeldAgent`'s default `program` becomes `shellRun(launchProgram(adapter, opts))`; import `launchProgram` from `../backend.ts` in place of `createInteractiveCommand`.
- `heldInput` gains `shell: hostShellDialect(),` first.
- `heldRelaunch.relaunch: async (handle, program, opts) =>` and `shellRun(program).args`.
- Imports: `shellCommand` from `../../shared/shell.ts`, `hostShellDialect` beside `hostShell`, type `LaunchProgram`.
Verify: packages/orch/src/shared/shell.ts packages/orch/src/types/backend.ts packages/orch/src/host.ts packages/orch/src/backends/backend.ts packages/orch/src/backends/held/index.ts
Errors in other files (tmux, orca, herdr, daemon/server, test) are the other tasks'; report "pending" when only those remain.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T4 tmux, orca and herdr take the launch program
Edit `packages/orch/src/backends/tmux/index.ts`:
- `spawn` (L332): `const command = shellCommand("posix", launchProgram(adapter, opts));` in place of `createInteractiveCommand(...)`. Keep the comment above it, reworded: `// An explicit --cmd is the caller's launch line verbatim; without one the adapter's argv, quoted for the pane's shell.`
- `agentInput` (L99) gains `shell: "posix" as const,` first. If the object is not typed against `AgentInputRole`, the literal type must still be `"posix"`; prefer `readonly agentInput: AgentInputRole<TmuxHandle> = { shell: "posix", ... }` if that typechecks with the existing methods.
- Imports: `launchProgram` from `../backend.ts` in place of `createInteractiveCommand`; `shellCommand` from `../../shared/shell.ts`.
Edit `packages/orch/src/backends/orca/index.ts`:
- `spawn` (L284): `const command = shellCommand("posix", launchProgram(adapter, opts));`. `launchLine` stays as is.
- `agentInput` (L137) gains `shell: "posix"` the same way as tmux.
- Imports as for tmux.
Edit `packages/orch/src/backends/herdr/index.ts`:
- `launchArgs` (L398): the first line becomes
  ```ts
    const program = launchProgram(adapter, opts);
    if (program.kind === "shell") throw new Error("herdr starts the harness itself, so it cannot run a --cmd line; spawn without --cmd");
    const argv = program.argv;
  ```
  Delete the following `if (argv.length === 0) throw ...` line (launchProgram refuses an empty argv). In the doc above, replace the sentence that starts `That is why \`opts.cmd\` cannot select` through `what bug 1.4 was.` with: `So a \`--cmd\` line is refused here, and a worker's flags come from its restricted launch, as on every other backend.`
- `agentInput` (L169) gains `shell: "posix"` the same way.
- Import `launchProgram` from `../backend.ts`.
Verify: packages/orch/src/backends/tmux/index.ts packages/orch/src/backends/orca/index.ts packages/orch/src/backends/herdr/index.ts
Errors in other files are the other tasks'; report "pending" when only those remain.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T5 Core: the launch argv, the relaunch program and the pane restart's env
Edit `packages/orch/src/daemon/server/spawn/models.ts`: replace `launchCommand` with
```ts
/** The argv a launch under `launch` runs, for a preview, a trust check or a restart: the
 *  harness's worker launch when it has one. With `orchDir` set it may write the harness's
 *  launch config there; with null it writes nothing. */
export function launchArgv(adapter: AgentAdapter, launch: LaunchPolicy, tuning: { readonly model?: string; readonly thinking?: ThinkingLevel }, orchDir: OrchDir | null): readonly string[] {
  const opts = { ...tuning, preferredModels: launch.preferredModels, tools: launch.tools, workers: launch.workers, ...(orchDir === null ? {} : { orchDir }) };
  return adapter.workerLaunch?.restrictedInteractiveArgv(opts) ?? adapter.interactiveArgv(opts);
}
```
Every caller of `launchCommand` in `packages/orch/src/daemon/server/spawn/index.ts` and `packages/orch/src/daemon/server/spawn/placement.ts` wraps it: `shellLine(launchArgv(...same arguments...))` (`shellLine` from `../../../util.ts`).
Edit `packages/orch/src/daemon/server/terminal-relaunch.ts`: `relaunchPlace(..., program: LaunchProgram, opts)` passes `program` to `place.role.relaunch(place.handle, program, opts)`. `relaunchTerminal(state, agent, quitText, program: LaunchProgram, opts)` passes it to `relaunchPlace`, and on the pane path submits `shellCommand(pane.input.shell, program)` in place of `command`. Update its doc's last line to: `A pane's shell keeps its own env here; a restart's pane fallback sets it on the line.` Imports: `shellCommand` from `../../shared/shell.ts`, type `LaunchProgram`.
Edit `packages/orch/src/daemon/server/session-agents.ts`: in `adoptTerminal`, `relaunchTerminal(state, placeHere(directory, key), quit, { kind: "argv", argv }, opts)`; delete the `shellLine` import if then unused.
Edit `packages/orch/src/daemon/server/handlers/relaunch.ts`:
- `planRelaunch` returns `program: LaunchProgram` beside `command`:
  `const program: LaunchProgram = request.cmd === null ? { kind: "argv", argv: launchArgv(adapter, launch, relaunch, state.directory) } : { kind: "shell", line: request.cmd };`
  `const command = shellCommand("posix", program);` Its return gains `program`. Replace the `launchCommand` import with `launchArgv`.
- `relaunchInPlace`: `relaunchPlace(state, agent, place, program, opts)`.
- `restartAttached`: `const program: LaunchProgram = { kind: "argv", argv: prepared.program };` `const command = shellCommand("posix", program);` and `relaunchTerminal(state, agent, quitText, program, prepared.opts)`. Delete `shellLine` from the import if then unused.
- `restartHere`, the pane fallback at its end: destructure `{ adapter, relaunch, view, launch, program, command }` from `planRelaunch`; after `preTrust(...)` add
  ```ts
    if (view.form === null) throw new Error(`${view.name} records no form to relaunch in`);
    // The pane's shell still holds the old launch's env: the line sets the new one and removes what it dropped.
    const opts = restartOpts(state, agent, view, launch, relaunch, view.form);
    const line = shellLaunchLine(pane.input.shell, program, agentLaunchEnv(opts), policyEnvNames(adapter));
  ```
  and `pane.input.submit(pane.handle, command)` becomes `pane.input.submit(pane.handle, line)`. Keep `command` in the outcome.
- Imports: `shellCommand`, `shellLaunchLine` from `../../../shared/shell.ts`; `agentLaunchEnv` from `../../../policy/spawner.ts`; `policyEnvNames` from `../../../policy/workers.ts`; type `LaunchProgram` from `../../../types/backend.ts`.
Verify: packages/orch/src/daemon/server/spawn/models.ts packages/orch/src/daemon/server/spawn/index.ts packages/orch/src/daemon/server/spawn/placement.ts packages/orch/src/daemon/server/terminal-relaunch.ts packages/orch/src/daemon/server/session-agents.ts packages/orch/src/daemon/server/handlers/relaunch.ts
Errors in the adapter, backend or test files are the other tasks'; report "pending" when only those remain.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
