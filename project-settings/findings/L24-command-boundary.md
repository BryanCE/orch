# L24 — How a launch command reaches each backend's shell

## Shared command construction

`packages/orch/src/backends/backend.ts:23-26`, `createInteractiveCommand` (whole function):
```ts
export function createInteractiveCommand(adapter: AgentAdapter, opts: BackendSpawnOpts): string {
  const command = opts.cmd ?? (opts.program === undefined ? undefined : opts.program.map(shellQuote).join(" ")) ?? adapter.workerLaunch?.restrictedInteractiveCmd(opts) ?? adapter.interactiveCmd(opts);
  if (!command.trim()) throw new Error(`adapter ${String(adapter.id)} returned an empty interactive command`);
  return command;
}
```
Callers in `packages/orch/src`: `backends/held/index.ts:226`, `startHeldAgent`; `backends/tmux/index.ts:335`, `TmuxBackend.spawn`; `backends/orca/index.ts:285`, `OrcaBackend.spawn`. Herdr does not call this helper; it uses adapter argv directly.

`packages/orch/src/types/adapter.ts:30-49`, `SpawnOpts` (whole):
```ts
export interface SpawnOpts {
  readonly key?: string;
  readonly cwd?: string;
  readonly model?: string;
  readonly thinking?: ThinkingLevel;
  readonly preferredModels?: readonly string[];
  readonly orchDir?: OrchDir;
  readonly env?: Readonly<Record<string, string>>;
  readonly tools?: string;
  readonly workers?: WorkerPolicy;
}
```
`packages/orch/src/types/adapter.ts:194`: `restrictedInteractiveCmd(opts: SpawnOpts): string;` (`WorkerLaunchRole`). `packages/orch/src/types/adapter.ts:364-374`:
```ts
  /** Build the normal shell command used to start one agent in an interactive pane. */
  interactiveCmd(opts: SpawnOpts): string;
  /**
   * The same interactive launch as `interactiveCmd`, as RAW argv: the executable
   * first, then unquoted arguments. A plexer that starts the harness itself needs
   * the arguments without a shell's quoting, because it applies its own for the
   * shell it is launching into — a plexer does exactly this
   * (`argv = [interactive_agent_executable(kind), ...args]`), and handing it a
   * pre-quoted string exports the quotes as part of the value.
   */
  interactiveArgv(opts: SpawnOpts): readonly string[];
```

## Adapters

Adapter IDs (including all adapters): `packages/orch/src/types/adapter.ts:10-13`: `export const ADAPTER_IDS = ["pi", "omp", "claude", "codex", "opencode"] as const;` The pattern in implementations:

- `adapters/pi.ts:444-448`: `interactiveCmd` returns `shellLine(this.interactiveArgv(opts))`; `interactiveArgv` builds the raw executable/args. Shell quoting happens in `shellLine`.
- `adapters/omp.ts:90-96`: `interactiveCmd` is `["omp", ...bridgeModelArgv(opts, "shell")].join(" ")`; argv uses `bridgeModelArgv(opts, "argv")`. The shell variant builds its own form; no general per-argument quoting in the join.
- `adapters/claude.ts:364-370`: `interactiveCmd` returns `this.interactiveArgv(opts).join(" ")`; argv is raw. No quoting at the join.
- `adapters/codex.ts:135-154`: command is assembled as a string; model is explicitly `shellQuote(opts.model)`. Other argv elements are joined without general quoting.
- `adapters/opencode.ts:83-90`: command is `this.interactiveArgv(opts).join(" ")`; argv is raw, no general quoting.

`packages/orch/src/util.ts:89-95`:
```ts
/** Single-quote one value for a POSIX sh command string. */
export function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

/** One POSIX shell line running `argv`, every element quoted. */
export function shellLine(argv: readonly string[]): string {
  return argv.map(shellQuote).join(" ");
}
```
Adapter grep finds `shellQuote` uses in pi (model-cycle argument) and codex (model), and no adapter-local `shellLine`/`shellQuote` helper. `claude-hooks.ts` uses shared `shellLine` for its command.

## Backend launch boundaries

`BackendSpawnOpts` is `packages/orch/src/types/backend.ts:288-320`; its `project` is passed as `ORCH_PROJECT`, `orchDir` as `ORCH_DIR`, and optional `env` is the extra process environment. Backend spawn implementations receive this structure at their `spawn(adapter, opts)` entry point.

- **held** (`backends/held/index.ts:61-64,226-232`): `createInteractiveCommand` creates a string; `shellRun` puts it after the host shell's `-c` argument as a `HeldProgram` (`file`, `args`). `startHeldAgent` passes `heldLaunchEnv(opts)` separately as PTY process env in `HeldStartRequest`; not shell `export` text.
- **headless** (`backends/headless/index.ts:161-216`): runs adapter headless command as argv; launch env is merged into process `env` (`{ ...process.env, ...agentLaunchEnv(...) }`). It is a process environment, not typed shell text.
- **herdr** (`backends/herdr/index.ts:335-405`): uses `opts.program ?? adapter.interactiveArgv(opts)` as argv. `placement.open` receives executable/args and `agentLaunchEnv(...)` as env, with pane env flags also supported for Herdr's workspace/pane APIs. It does not pass a pre-quoted command string for the initial launch.
- **tmux** (`backends/tmux/index.ts:332-352`): makes a command string with `createInteractiveCommand`; passes `cwd`, env arguments from `tmuxEnvArgs(agentLaunchEnv(...))`, and command to tmux pane/window creation. The pane command is shell text; env is passed through tmux environment API arguments, not prefixed `export` text. `shellLine` is used for later `agentInput` commands (`:144`).
- **orca** (`backends/orca/index.ts:284-301`): command string from `createInteractiveCommand`; `placement.open` gets launch line assembled as `cd <quoted cwd> && env KEY=<quoted value> ... <command>`. Environment is shell text and values are quoted by `launchLine`; the command itself is not re-quoted there.

`packages/orch/src/backends/held/index.ts:61-64`, `shellRun` (whole):
```ts
function shellRun(command: string): HeldProgram {
  const [file, ...args] = hostShell();
  return { file, args: [...args, command] };
}
```

## Restart pane fallback

`packages/orch/src/daemon/server/handlers/relaunch.ts:228` calls `pane.input.submit(pane.handle, command)` in `restartHere`. This submits shell text to the existing pane. Backends with `agentInput` are held, Herdr, tmux, and Orca; headless has `agentInput = null` (`backends/headless/index.ts:120`). At spawn, held supplies PTY process env (`held/index.ts:231`), Herdr supplies `agentLaunchEnv` via pane open (`herdr/index.ts:343-351`), tmux supplies environment via tmux pane options (`tmux/index.ts:335-346`), and Orca serializes env into its launch shell line (`orca/index.ts:289-299`). Thus their existing shell/pane receives the restart command; it is not a fresh process-env argument on `pane.input.submit`.
