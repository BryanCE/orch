# L25: argv and env at each launch boundary

## 1. Worker launch role

`packages/orch/src/types/adapter.ts:193-196`:
```ts
export interface WorkerLaunchRole {
  restrictedInteractiveCmd(opts: SpawnOpts): string;
  restrictedHeadlessCmd(prompt: string, opts: SpawnOpts): string[];
}
```
Neither method has a parallel argv field. Implementations are in `adapters/pi.ts` (abstract class methods implemented by Pi) and `adapters/omp.ts`; both expose an interactive string and a headless argv array. No other adapter implementation was found.

`packages/orch/src/adapters/pi.ts:454-468`:
```ts
  restrictedInteractiveCmd(opts: SpawnOpts): string {
    return piLaunchArgv(opts, true, undefined, "shell", this.thinking).join(" ");
  }

  /** Start pi with the initial prompt for headless runs. */
  headlessCmd(prompt: string, opts: SpawnOpts): string[] {
    return piLaunchArgv(opts, opts.workers !== undefined, prompt, "argv", this.thinking);
  }

  /** Start headless pi under the same worker policy as an interactive pi worker. */
  restrictedHeadlessCmd(prompt: string, opts: SpawnOpts): string[] {
    return piLaunchArgv(opts, true, prompt, "argv", this.thinking);
  }
```

`packages/orch/src/adapters/omp.ts:100-112`:
```ts
  restrictedInteractiveCmd(opts: SpawnOpts): string {
    return ["omp", ...ompToolArgv(opts), ...ompExtensionArgv(opts), ...bridgeModelArgv(opts, "shell")].join(" ");
  }

  /** omp's single binary serves headless runs too — no launcher wrapper. */
  headlessCmd(prompt: string, opts: SpawnOpts): string[] {
    return ["omp", ...bridgeModelArgv(opts, "argv"), prompt];
  }

  /** Start omp headless under the same worker policy as an interactive omp worker. */
  restrictedHeadlessCmd(prompt: string, opts: SpawnOpts): string[] {
    return ["omp", ...ompToolArgv(opts), ...ompExtensionArgv(opts), ...bridgeModelArgv(opts, "argv"), prompt];
  }
```

## 2. Adapter interactive command forms

`packages/orch/src/adapters/omp.ts:90-97`:
```ts
  interactiveCmd(opts: SpawnOpts): string {
    return ["omp", ...bridgeModelArgv(opts, "shell")].join(" ");
  }

  interactiveArgv(opts: SpawnOpts): readonly string[] {
    return ["omp", ...bridgeModelArgv(opts, "argv")];
  }
```
`packages/orch/src/adapters/pi.ts:501-503`, `bridgeModelArgv`:
```ts
export function bridgeModelArgv(opts: SpawnOpts, form: QuicklistForm): string[] {
  return modelSelectionArgv({ model: "--model", cycle: "--models" }, opts, form);
}
```
The `shell` form formats values for a shell command string; `argv` returns argument elements without shell formatting.

`packages/orch/src/adapters/codex.ts:135-144`:
```ts
  interactiveCmd(opts: SpawnOpts): string {
    const command = ["codex"];
    if (opts.model) command.push("--model", shellQuote(opts.model));
    return [...command, ...compactionArgs(this, opts)].join(" ");
  }

  interactiveArgv(opts: SpawnOpts): readonly string[] {
    return [...buildInteractiveArgv("codex", opts), ...compactionArgs(this, opts)];
  }
```
The string explicitly `shellQuote`s the model value. The argv form uses the raw model argument from `buildInteractiveArgv`.

`packages/orch/src/adapters/opencode.ts:83-89`:
```ts
  interactiveCmd(opts: SpawnOpts): string {
    return this.interactiveArgv(opts).join(" ");
  }

  interactiveArgv(_opts: SpawnOpts): readonly string[] {
    return ["opencode"];
  }
```

`packages/orch/src/adapters/claude.ts:364-373`:
```ts
  interactiveCmd(opts: SpawnOpts): string {
    return this.interactiveArgv(opts).join(" ");
  }

  interactiveArgv(opts: SpawnOpts): readonly string[] {
    const argv = [...buildInteractiveArgv("claude", opts), ...settingsArgv(opts), ...mcpArgv(opts), ...readOnlyArgv(opts)];
    if (opts.thinking !== undefined) argv.push(...this.thinking.launchArgs(opts.thinking));
    return argv;
  }
```

## 3. Call sites

- `packages/orch/src/backends/backend.ts:23-25`, `createInteractiveCommand`: selects explicit `opts.cmd`, shell-quoted `opts.program`, worker restricted command, or `adapter.interactiveCmd`, returning a string.
- `packages/orch/src/backends/held/index.ts:226`, `startHeldAgent`: passes the string to `shellRun` as the shell command.
- `packages/orch/src/backends/tmux/index.ts:335`, backend spawn: gets the string, then uses it in its pane launch.
- `packages/orch/src/backends/orca/index.ts:285`, backend spawn: gets the string and sends it through `launchLine`.
- `packages/orch/src/daemon/server/spawn/models.ts:43`, model command selection: returns worker restricted string when available, otherwise `interactiveCmd`; it does not convert it to argv.
- `packages/orch/src/backends/backend.ts:24` is the only runtime caller of `restrictedInteractiveCmd` in source. The headless backend calls `restrictedHeadlessCmd` at `backends/headless/index.ts:193` and uses the returned argv to spawn the process.

## 4. Launch env and transport

`packages/orch/src/backends/orca/index.ts:77-79`, `launchLine`:
```ts
function launchLine(cwd: string, env: Readonly<Record<string, string>>, command: string): string {
  return ["cd", shellQuote(cwd), "&&", "env", ...Object.entries(env).map(([key, value]) => `${key}=${shellQuote(value)}`), command].join(" ");
}
```
It emits shell text: quoted cwd and env values, followed by the command string. The command is already a string.

`packages/orch/src/backends/tmux/index.ts:33-35`, `tmuxEnvArgs`:
```ts
function tmuxEnvArgs(env: Readonly<Record<string, string>>): string[] {
  return Object.entries(env).flatMap(([name, value]) => ["-e", `${name}=${value}`]);
}
```
These become tmux `-e NAME=value` arguments, not shell `export` text.

`packages/orch/src/policy/spawner.ts:47-63`, `agentLaunchEnv`:
```ts
export function agentLaunchEnv(
  opts: Pick<BackendSpawnOpts, "key" | "orchDir" | "env" | "project">,
  extra: Readonly<Record<string, string | undefined>> = {},
): Record<string, string> {
  const values: Partial<Record<(typeof ORCH_ENV_VARS)[number], string | undefined>> = {
    [LAUNCH_ENV]: opts.key,
    ORCH_DIR: opts.orchDir,
    ORCH_PROJECT: opts.project,
  };
  const candidates: Record<string, string | undefined> = Object.fromEntries(
    ORCH_ENV_VARS.map((name) => [name, values[name]]),
  );
  Object.assign(candidates, extra, opts.env ?? {});
  return Object.fromEntries(
    Object.entries(candidates).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
}
```

`packages/orch/src/backends/herdr/index.ts:351-352, 399-407`: pane creation gets `env: agentLaunchEnv(opts, HERDR_ENVIRONMENT_STAMP)`; launch gets argv arguments, not a command string. `launchArgs` takes `opts.program ?? adapter.interactiveArgv(opts)`, drops argv[0], and gives the remaining raw args to `cli.startAgent`. Herdr supplies the executable and quotes for its target shell. The nearby comment states that explicitly: “Raw and unquoted: herdr quotes for the target shell itself (`interactive_shell_command`).”

## 5. Policy env and compaction

`packages/orch/src/policy/workers.ts:57-61`, `compactionLaunch`:
```ts
function compactionLaunch(adapter: AgentAdapter, model: string | undefined, policy: WorkerPolicy | undefined): CompactionLaunch {
  const points = policy?.compactAtTokens[adapter.id];
  return points === undefined || adapter.compaction === null ? NO_COMPACTION : adapter.compaction.launch(points, model);
}
```

`packages/orch/src/policy/read-only.ts:38-40`, `readOnlyEnv`:
```ts
export function readOnlyEnv(readOnly: ReadOnly): Record<string, string> {
  return { [READ_ONLY_ENV]: "1", ...(readOnly.out === null ? {} : { [OUT_DIR_ENV]: readOnly.out }) };
}
```
Policy env names are `ORCH_READ_ONLY` and `ORCH_OUT_DIR`, declared by `READ_ONLY_ENV` and `OUT_DIR_ENV` in `policy/read-only.ts:9,11`. Compaction launch env is adapter-controlled: Claude declares `COMPACT_WINDOW_ENV = "CLAUDE_CODE_AUTO_COMPACT_WINDOW"` (`adapters/claude.ts:76`) and its `compaction.launch` writes it (`:342`). Codex compaction has no env output; it sets `model_auto_compact_token_limit` as args (`adapters/codex.ts:19,116`). Pi's compaction launch returns `NO_COMPACTION` (`adapters/pi.ts:440`).

## 6. Host shell

`packages/orch/src/host.ts:33-44`:
```ts
const HOST_SHELL: Record<HostOs, readonly [string, ...string[]]> = {
  linux: ["sh", "-c"],
  darwin: ["sh", "-c"],
  windows: ["cmd.exe", "/d", "/s", "/c"],
};

/** The argv prefix that runs one shell line on this host. */
export function hostShell(): readonly [string, ...string[]] {
  return HOST_SHELL[hostOs()];
}
```
It returns `sh -c` on POSIX, and `cmd.exe /d /s /c` on Windows.

## 7. Input submit implementations

- `packages/orch/src/backends/held/index.ts:84-90`: `submit` types the provided text directly into the PTY, then types Enter. It is terminal input, not shell-quoted text.
- `packages/orch/src/backends/herdr/index.ts:169-170`: `submit` passes text as the `pane run` command argument. The pane executes that text; it is not converted to argv by orch.
- `packages/orch/src/backends/tmux/index.ts:99-104`: `submit` passes text to `tmux send-keys` then sends Enter. It types the text into the pane as-is.
- `packages/orch/src/backends/orca/index.ts:137-140`: `submit` passes text to `terminal send --text` with `--enter`. It types the text into the terminal as-is.
