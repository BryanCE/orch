# W7: what each orchd settings reader reads

Context for every section. orchd's `services.settings.current()` was just retyped from
`OrchSettings` to `InstallSettings` (`packages/orch/src/types/settings.ts`): the install-only
keys alone. That broke every orchd read of a project key, and every place orchd passes its
settings to a function typed `OrchSettings`, `SettingsManager`, `Services` or `DaemonClient`.
Each error file under `project-settings/findings/` lists `bunx tsc` errors, one per line, with
paths relative to `packages/orch/`. These tasks only read code and write one report file each.
Edit no source file. Run no command. Paths in the report are from the repo root.

The install-only keys: a key is install-only when it is one of these, or starts with one of
these followed by a dot: `runtime`, `enabled`, `skills`, `project`, `settings_file`, `daemon`,
`links`, `hosts`, `servers`, `lock`, `retention`, `logging`, `doctor`, `timeouts`, `queue`,
`pty`, `attach`, `notify`, `notification`, `monitor`, `monitor_tool`, `counts`, `tiling`,
`spaces`, `mail`, `questions`, `fleet.max_agents_total`, `fleet.max_agents_per_space`,
`fleet.min_free_memory_mb`, `fleet.cross_space`, `fleet.orch_peers`. Every other key is a
project key.

Report format: Markdown, one `##` heading per error line, the heading being the error's
`file(line,col)`. Under it:
- **Called**: when the error is an argument or assignment, the function or property it is
  passed to, its definition as `path:line`, and its parameter's declared type.
- **Reads**: every settings key that value is read for, following the value through every
  function it is passed to, until it is read. Each key as `section.key`, marked `install` or
  `project`, with `path:line` of the read. Write the whole section name when a whole section
  is passed on (for example `timeouts`).
- **Other callers**: every other caller of that function in `packages/orch/src/` and
  `packages/orch/extensions/`, as `path:line`, and whether it is server code (under one of
  `src/daemon/server/`, `src/store/`, `src/backends/`, `src/adapters/`, `src/acp/`,
  `src/control/`, `src/hosts/`, `src/worktrees/`, `src/entities/`, `src/presence/`) or client.
- **For whom**: what in the enclosing function names the agent or directory the read is for:
  the variable, its type, and whether it is an agent key or id, an agent row, a launch plan, a
  request's `cwd` or `dir`. "none" when nothing does.
When several error lines share one called function, answer it fully under the first and write
"same as <heading>" under the rest.

## T1 Spawn, lifecycle, relaunch, restart
Answer every line of `project-settings/findings/E1-errors.txt`. Write
`project-settings/findings/L11-spawn-readers.md`.

## T2 Council and the other handlers
Answer every line of `project-settings/findings/E2-errors.txt`. Write
`project-settings/findings/L12-handler-readers.md`.

## T3 orchd's root, events, state, tabs, session agents and the tests
Answer every line of `project-settings/findings/E3-errors.txt`. Write
`project-settings/findings/L13-root-readers.md`. For a line in a test file or a test helper,
write only what the test builds (a `DaemonServices`, a `DaemonState`, a settings fixture) and
the line's text.
