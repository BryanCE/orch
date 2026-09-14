# CLAUDE.md. Rules for this repo. Non-negotiable.

# ORCH IS NEVER COUPLED TO A PLEXER OR A HARNESS.
Main orch code and CLI commands never depend on a specific plexer or harness. The daemon exists so a command can resolve its own target. `orch result <pane>` is invalid because a pane is a plexer coordinate; the command takes an agent and resolves the rest.

Layout: the repo root is a private bun workspace. The orch package (`@bryance/orch`) is `packages/orch/`, holding `src/`, `test/`, `bin/`, `extensions/`, `scripts/`, `skills/`, `drizzle/`. The web UI is `packages/web/`. Relative paths in the rules below are inside `packages/orch/` unless they start with `packages/`.

Root scripts: every verb runs from the root and delegates through `bun --filter`. A bare verb covers the whole workspace (`bun check`, `bun run build`). `:orch` or `:web` scopes it to one package (`bun run check:web`, `bun run build:orch:dev`). Verbs with no counterpart in the other package (`db:*`, `reset`, `reinstall`, `fallow:*`) stay unsuffixed. A package owns its own verbs. The root only fans out, one explicit entry per package, so a missing script fails loudly instead of matching nothing.

Never call a bare `orch` from a package.json script. The workspace links `node_modules/.bin/orch` to the repo-local `packages/orch/dist/bin/orch.js`, which shadows the installed CLI inside every `bun run`. The repo build's `packageRoot()` then points harness shims and shebangs at the checkout instead of `~/.local/lib/node_modules/@bryance/orch`. Scripts resolve `ORCH=$(npm prefix -g)/bin/orch` and invoke that.

# RULE #1. NEVER BUILD. NEVER MIGRATE. NEVER GENERATE. NEVER RELOAD. ASK BRYAN.
User-only, no exceptions, not through a worker or subagent or orch verb, not "just to test":
- `bun run build:orch:dev`, `bun run build`, `bun run build:orch`, `bun run build:web`, `bun build`, `npm pack`, `npm install -g`, `npm i -g`
- `bun db:gen`, `bun db:mig`, `bun db:reset`, `drizzle-kit`, editing `drizzle/` or any `migration.sql`
- `orch daemon reload`, `orch daemon restart`, `orch daemon stop`
When a change needs one of these, stop, hand Bryan the command, and wait until he says it ran. Never poll, never assume, never retry.

# RULE 0. THE GATE IS `bun check`. ORCHS RUN IT ON THEIR FILES. THE DELEGATOR RUNS THE ONE THAT COUNTS.
Every orch runs `bun check` on what it touched and pastes it clean in its result. The delegator runs `bun check` once over the whole tree before every commit. That run is the gate. `bun test` is scoped to touched files, always. Nothing commits on a dirty gate or a red test.

# RULE 0.1. TESTS: ONLY THE FILES YOU TOUCHED, ON THE SIDE THAT OWNS THE DISK, ONCE. SOME ARE BRYAN-ONLY.
Every test lives in `packages/orch/test/` and runs under the plain `bun test` runner. There is no second test directory and no second test script.

Bryan-only, never run by the delegator or an orch, no exceptions: `test/smoke.sh`, and any test that opens a pane, a window, or a terminal, or drives a real plexer. They open terminals on Bryan's screen while he works. Running one without his say-so is a firing offence. Bryan runs them and pastes the output. You fix what is in it.

Everything else: run the test files your change touched, once, after the edits are complete. Not before, not again, not five times in a row. Pick them by what imports the changed module directly, not by a grep over the test tree, because a broad grep pulls in Bryan-only files. The full suite is Bryan's. He runs it and pastes it to you.

Bryan works from two places: WSL only at home, Windows plus WSL at the office. The checkout can live on either filesystem, and crossing the boundary in either direction is slow enough to time out tests that pass in a second on the side that owns the disk. Run `git rev-parse --show-toplevel` once and pick the side that owns it:
- Checkout under `/mnt/<drive>/…` (Windows disk): run through the Windows side.
  ```
  WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT\packages\orch'; bun test <the files you touched>"
  ```
- Checkout anywhere else (`/home/…`, WSL disk): run WSL's bun from the root with root-relative paths. Not `bun --filter … test` and not `bun --cwd … test`. Both hit the package's `test` script and run the whole suite.
  ```
  bun test packages/orch/test/<the files you touched>
  ```
Never run tests across the boundary. A `\\wsl$` read from powershell is as slow as a `/mnt/c` read from WSL. A timeout from a cross-boundary run is not a finding. Do not report it, bump a timeout, or profile it.

Orchs: no `git diff`, no `git status`, no `git log`, no fallow, no re-reading a file you already changed. Edit, run your touched test files plus lint and tc once, paste, report done.

# RULE 1. BRYAN'S FILE IS GROUND TRUTH. NEVER ARGUE WITH IT.
A file or output he hands you is the current state. Never call it stale, cached, a snapshot, or outdated. Never re-characterize it as "just warnings" or "only fallow". Open it. Fix every item.

# RULE 2. DO NOT ARGUE. FIX IT.
No debating counts, severity, or whether it matters. If it is in the file or Bryan said fix it, fix it. Zero pushback, zero caveats, zero "actually".

# RULE 3. BE FAST. DISPATCH IN ONE SHOT.
Minutes, not half an hour. The moment work splits, spawn the fleet and dispatch every slice in one message. No serial setup, no re-reading state you already have. One pass per slice, one owner per file: no two agents touch the same file in a wave, and a slice is done only when its owner's scoped check and tests are green.

# RULE 4. FLEET DISCIPLINE. See the `orch` skill.
- `luna:high` is the default. Escalate `luna:xhigh`, then `sol:low`, then `sol:high` (cap), only for the one agent whose task failed. Never terra. `luna:low` for trivially mechanical slices.
- Max 4 agents per tab, tiled. Split bigger fleets across tabs.
- `reload` live-reloads code in place. `reset` starts a new session. `restart` closes and relaunches. Use `reload`, never `restart`, to pick up code.

# RULE 6. RUNTIME-PORTABLE CODE. BUN IS A BUILD TOOL ONLY.
Runtime code in `src/` and `extensions/` must run under any JS runtime: node, deno, bun, whatever comes next. Target the `node:` builtins, the baseline every runtime implements. No `Bun.*` API, no `bun:*` import, no deno globals. The one exception is `bun:sqlite` as a guarded fallback behind `node:sqlite` in `packages/orch/src/store/connection.ts`. Use `node:child_process`, `node:fs`, timers. `bun:test` in `test/` is fine. The installed `orch` runs the packaged `dist/bin/orch.js`, not `bin/orch.ts`, so CLI source edits need Bryan's `bun run build:orch:dev` to take effect.

# RULE 7. FRESH CONTEXT PER TASK.
`orch dispatch` clears the session and re-pins the model before it sends, so a new task never lands on a used session. Never pass `--keep-context` for a new task; it exists only to add to work already in flight. `orch reset <target>` (alias `new`) is for clearing a session without sending work.

# RULE 8. NO LEGACY. NO BACK-COMPAT. ONE SHAPE.
Nothing has published. There is exactly one current shape for every record, config, and file. Never write code that accepts, migrates, or special-cases old data. Old records are malformed: reap them or error. When a shape changes, fix every writer, reader, fixture, and test in the same change.

# RULE 9. THE HARNESS x PLEXER ARCHITECTURE IS BINDING.
`learnings/2026-07-16-harness-plexer-architecture.md` is law. Hexagonal ports, then Bridge, then per-tool Adapter, then capability-negotiated Strategy, then Provider factory, then one control dispatcher, then static enforcement. No pair code. Wire formats live in exactly one adapter. Branch on caps, never on adapter or backend id. All control traffic goes through the one dispatcher. Composition lives in `$ORCH_DIR/settings.json`, JSON, never TOML. Doctor verifies declared against reality. Read `learnings/` before touching adapters, backends, daemon, or setup. Deviating gets you fired.

# RULE 10. PER-HARNESS CODE LIVES IN `extensions/<harness>/`.
`extensions/pi/`, `extensions/claude/`, `extensions/codex/`. Never a generic name (`bridge`, `shim`), never in `scripts/`. `scripts/` is build tooling.
- Harness is not backend. Code gated on a plexer (`backend === "herdr"`, `HERDR_SOCKET_PATH`, tmux panes) goes in `src/backends/<plexer>/`, never `extensions/`.
- The presence protocol is orch's. `status.json`, `result.json`, `inbox.jsonl`, `ack.jsonl` and their writers live in `src/presence/`. Every harness imports that writer. Nobody reimplements `atomicWrite`.
- Bundle output names are decoupled from source dirs in `src/bridge-bundles/metadata.ts`. Renaming a source dir must not rename a shipped artifact. The bundler (`src/bridge-bundles/build.ts`) is build tooling; runtime `src/**` never imports it.
- `scripts/check-bridge.ts` enforces this. Its `extensions` scan must stay recursive or it scans nothing and passes.

# RULE 11. ORCH OWNS EVERY AGENT. AN ORCHESTRATOR IS AN AGENT. ENVIRONMENT IS NEVER IDENTITY.
The agent model below is law, same standing as Rule 9. It binds identity, keys, registration, spawn, ownership, environment, reaping, and the backend port. The code is the documentation. There are no plan files. `learnings/` holds outside research only, never plans, never task lists.
- One entity. Orchestrator, worker, and a Claude session driving orch are all agents. No second id space, no second liveness mechanism.
- Four facts, never welded. Identity is a minted id and nothing else. Provenance is who spawned it, immutable. Ownership is a lease. Environment is where it is (cwd, repo, worktree, branch, plexer, handle, OS side), mutable. No fifth fact, no lifetime column.
- Everything has an environment. orch's grouping is a space. "Workspace" is a plexer's word and never appears in orch's model, CLI, or UI.
- Never encode environment into identity. No `<backend>~<workspace>~<handle>` key. `"local"` is a missing value with a name. `wF` is herdr's id. Both become columns.
- Delivery and read are orch's mechanism. A pane is a shortcut. `inbox.jsonl` to bridge to `ack.jsonl` needs no screen.
- Branch on declared capabilities, never on an environment id. Adding an environment edits zero renderers, commands, or policy.
- Ownership is mutual exclusion, not authorization. `dispatch`, `steer`, `model`, `reset` are gated against a live foreign holder. `abort`, `close`, `reap` are never gated. The human can always kill.
- Work survives its spawner. No lifetime, no `--detached`, no fate-sharing, no grace timer. `detach` means release the lease.
- Normalize. No wide agent row. Instants are INTEGER epoch millis. Prefer a nullable instant over a boolean. `NULL` means not applicable, never a sentinel string.

# RULE 12. PUBLISHING IS USER-ONLY. NEVER WRITE INTO THE INSTALLED TREE.
Only Bryan's `bun run build:orch:dev` writes to `~/.local/lib/node_modules/@bryance/orch/`, `~/.pi/agent/extensions/`, or any global location. Not `bun build --outfile`, not `npm install -g`, not a symlink, not an orch verb, not a worker, not "just to test". Builds go to `dist/` or a temp dir and stop.

# RULE 13. NO `as` CASTS. NO `any`. FIX THE TYPE.
`as X` only when there is no other way. `as unknown as X` never. `any` never. A fixture that fails a type gets a typed factory that builds the complete value. A wrong shape gets a real type guard. A wrong signature gets fixed. A gate error is the compiler telling you the code is wrong. Casting deletes the message, not the bug.

# RULE 14. NEVER BUMP A SCHEMA VERSION.
Frozen until Bryan removes this rule: `SETTINGS_SCHEMA` (`src/settings/schema.ts`) is 1, `PRESENCE_SCHEMA` (`src/presence/schema.ts`) is 1, `version` in every `package.json` stays put, and so does every future version constant. When a shape changes, change the shape and every writer, reader, fixture, and test. Do not touch the number. A fixture that disagrees with the constant is the fixture being wrong.

# RULE 15. NEVER `cd` INTO THE DIRECTORY YOU ARE IN.
The working directory is `/home/bryan/orch` and it persists across Bash calls. Run commands bare. No `cd` prefix, no `pushd`, no `(cd … && …)`. The one exception is a command that must run somewhere else, and then say why.

# RULE 16. DRY. NEVER DUPLICATE CODE.
Two places computing the same thing is a bug. Grep and run `fallow` before you write a helper. If it exists, call it. Never ask Bryan whether to consolidate. Do it.

# RULE 17. NOTHING IS HARDCODED.
Every number, cap, depth, timeout, port, path, or name is a setting in `settings.json` (schema, `SETTINGS_DEFAULTS`, registry help line, required type) or an env var. `?? <literal>` on a settings read is forbidden.
