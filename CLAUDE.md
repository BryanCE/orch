# CLAUDE.md. Rules for this repo. Non-negotiable.

Layout: the repo root is a private bun workspace. The orch package (`@bryance/orch`) lives in `packages/orch/` — its `src/`, `test/`, `bin/`, `extensions/`, `scripts/`, `skills/`, `drizzle/`. The web UI is `packages/web/`. Relative paths in the rules below are inside `packages/orch/` unless they start with `packages/`.

Root scripts: every verb runs from the root and delegates via `bun --filter`. A **bare verb covers the whole workspace** (`bun check`, `bun run build`); **`:orch` / `:web` scopes it to one package** (`bun run check:web`, `bun run build:orch:dev`). Verbs with no counterpart in the other package — `db:*`, `reset`, `reinstall`, `fallow:*` — stay unsuffixed. A package owns its own verbs; the root only fans out, explicitly, one entry per package, so a missing script fails loudly instead of matching nothing.

Never call a bare `orch` from a package.json script. The workspace links `node_modules/.bin/orch` at the repo-local `packages/orch/dist/bin/orch.js`, and it shadows the installed CLI inside every `bun run`; the repo build's `packageRoot()` then points harness shims and shebangs at the checkout instead of `~/.local/lib/node_modules/@bryance/orch`. Scripts resolve `ORCH=$(npm prefix -g)/bin/orch` and invoke that.

# RULE #1. NEVER BUILD. NEVER MIGRATE. NEVER GENERATE. NEVER RELOAD. ASK BRYAN.
User-only, no exceptions, not through a worker or subagent or orch verb, not "just to test":
- `bun run build:orch:dev`, `bun run build`, `bun run build:orch`, `bun run build:web`, `bun build`, `npm pack`, `npm install -g`, `npm i -g`
- `bun db:gen`, `bun db:mig`, `bun db:reset`, `drizzle-kit`, editing `drizzle/` or any `migration.sql`
- `orch daemon reload`, `orch daemon restart`, `orch daemon stop`
When a change needs one of these, stop, hand Bryan the command, and wait until he says it ran. Never poll, never assume, never retry.

# RULE 0. THE GATE IS `bun check`. ORCHS RUN IT ON THEIR FILES. THE DELEGATOR RUNS THE ONE THAT COUNTS.
Every orch runs `bun check` on what it touched and pastes it clean in its result. The delegator runs `bun check` once over the whole tree before every commit; that run is the gate. `bun test` scoped to touched files, always. Nothing commits on a dirty gate or a red test.

# RULE 1. BRYAN'S FILE IS GROUND TRUTH. NEVER ARGUE WITH IT.
A file or output he hands you is the current state. Never call it stale, cached, a snapshot, or outdated. Never re-characterize it as "just warnings" or "only fallow". Open it. Fix every item.

# RULE 2. DO NOT ARGUE. FIX IT.
No debating counts, severity, or whether it matters. If it is in the file or Bryan said fix it, fix it. Zero pushback, zero caveats, zero "actually".

# RULE 3. BE FAST. DISPATCH IN ONE SHOT.
Minutes, not half an hour. The moment work splits, spawn the fleet and dispatch every slice in one message. No serial setup, no re-reading state you already have. One pass per slice, one owner per file: no two agents touch the same file in a wave, and a slice is done only when its owner's scoped check and tests are green.

# RULE 4. FLEET DISCIPLINE. See the `orch` skill.
- `luna:high` is the default. Escalate `luna:xhigh`, then `sol:low`, then `sol:high` (cap), only for the one agent whose task failed. Never terra. `luna:low` for trivially mechanical slices.
- Max 4 agents per tab, tiled. Split bigger fleets across tabs.
- `reload` = live-reload code in place. `reset` = new session. `restart` = close and relaunch. Use `reload`, never `restart`, to pick up code.

# RULE 6. RUNTIME-PORTABLE CODE. BUN IS A BUILD TOOL ONLY.
Runtime code in `src/` and `extensions/` must be runnable by any JS runtime — node, deno, bun, whatever comes next. The `node:` builtin surface is the portable baseline every runtime implements, so target it; that this mostly reads as "use node" is a consequence, not the rule. No `Bun.*` API, no `bun:*` import, no deno globals, except `bun:sqlite` as a guarded fallback behind `node:sqlite` (already in `packages/orch/src/store/connection.ts`). Use `node:child_process`, `node:fs`, timers. `bun:test` in `test/` is fine. The installed `orch` runs the packaged `dist/bin/orch.js`, not `bin/orch.ts`; CLI source edits need Bryan's `bun run build:orch:dev` to take effect.

# RULE 7. FRESH CONTEXT PER TASK. `reset` BEFORE DISPATCH.
`orch reset <target>` (alias `new`) every target you are about to redispatch, in the same shot as the dispatch. Never stack a new task on a used session.

# RULE 8. NO LEGACY. NO BACK-COMPAT. ONE SHAPE.
Nothing has published. There is exactly one current shape for every record, config, and file. Never write code that accepts, migrates, or special-cases old data. Old records are malformed; reap them or error. When a shape changes, fix every writer, reader, fixture, and test in the same change.

# RULE 9. THE HARNESS x PLEXER ARCHITECTURE IS BINDING.
`learnings/2026-07-16-harness-plexer-architecture.md` is law. Hexagonal ports, then Bridge, then per-tool Adapter, then capability-negotiated Strategy, then Provider factory, then one control dispatcher, then static enforcement. No pair code. Wire formats live in exactly one adapter. Branch on caps, never on adapter or backend id. All control traffic through the one dispatcher. Composition lives in `$ORCH_DIR/settings.json`, JSON, never TOML. Doctor verifies declared vs reality. Read `learnings/` before touching adapters, backends, daemon, or setup. Deviating = fired.

# RULE 10. PER-HARNESS CODE LIVES IN `extensions/<harness>/`.
`extensions/pi/`, `extensions/claude/`, `extensions/codex/`. Never a generic name (`bridge`, `shim`), never in `scripts/`. `scripts/` is build tooling.
- Harness is not backend. Code gated on a plexer (`backend === "herdr"`, `HERDR_SOCKET_PATH`, tmux panes) goes in `src/backends/<plexer>/`, never `extensions/`.
- The presence protocol is orch's. `status.json`, `result.json`, `inbox.jsonl`, `ack.jsonl` and their writers live in `src/presence/`. Every harness imports that writer. Nobody reimplements `atomicWrite`.
- Bundle output names are decoupled from source dirs in `src/bridge-bundles/metadata.ts`. Renaming a source dir must not rename a shipped artifact. The bundler itself (`src/bridge-bundles/build.ts`) is build tooling; runtime `src/**` never imports it.
- `scripts/check-bridge.ts` enforces this. Its `extensions` scan must stay recursive or it scans nothing and passes.

# RULE 11. ORCH OWNS EVERY AGENT. AN ORCHESTRATOR IS AN AGENT. ENVIRONMENT IS NEVER IDENTITY.
The agent model below is law, same standing as Rule 9. It binds identity, keys, registration, spawn, ownership, environment, reaping, and the backend port. The code is the documentation; there are no plan files. `learnings/` holds outside research only — never plans, never task lists.
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
Only Bryan's `bun run build:dev` writes to `~/.local/lib/node_modules/@bryance/orch/`, `~/.pi/agent/extensions/`, or any global location. Not `bun build --outfile`, not `npm install -g`, not a symlink, not an orch verb, not a worker, not "just to test". Builds go to `dist/` or a temp dir and stop.

# RULE 13. NO `as` CASTS. NO `any`. FIX THE TYPE.
`as X` only when there is no other way. `as unknown as X` never. `any` never. A fixture that fails a type gets a typed factory that builds the complete value. A wrong shape gets a real type guard. A wrong signature gets fixed. A gate error is the compiler telling you the code is wrong; casting deletes the message, not the bug.

# RULE 14. NEVER BUMP A SCHEMA VERSION. NOTHING HAS PUBLISHED.
Frozen until Bryan removes this rule: `SETTINGS_SCHEMA` (`src/config.ts`) = 1, `PRESENCE_SCHEMA` (`src/presence/schema.ts`) = 1, `version` in every `package.json`, and every future version constant. When a shape changes, change the shape and every writer, reader, fixture, and test. Do not touch the number. A fixture that disagrees with the constant is the fixture being wrong.

# RULE 15. NEVER `cd` INTO THE DIRECTORY YOU ARE IN.
The working directory is `/home/bryan/orch` and it persists across Bash calls. Run commands bare. No `cd` prefix, no `pushd`, no `(cd … && …)`. The one exception is a command that must run somewhere else, and then say why.

# RULE 16. DRY. NEVER DUPLICATE CODE.
Two places computing the same thing is a bug. Grep and run `fallow` before you write a helper. If it exists, call it. Never ask Bryan whether to consolidate. Do it.

# RULE 17. NOTHING IS HARDCODED.
Every number, cap, depth, timeout, port, path, or name is a setting in `settings.json` (schema + `SETTINGS_DEFAULTS` + registry help line + required type) or an env var. `?? <literal>` on a settings read is forbidden.
