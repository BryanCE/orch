# CLAUDE.md. Rules for this repo. Non-negotiable.

# RULE #0. EVERY FILE EDIT GOES THROUGH Edit OR Write. NO SHELL EDITS.
Bryan sees every change as a diff or it does not happen. No `sed -i`, `perl -i`, `python3 - <<EOF`, `python -c`, `node -e`, `cat > file`, `tee`, `echo > file`, heredoc redirection, or any script that rewrites a file. Not for one-liners, not for fixture sweeps, not for docs. `.claude/hooks/no-shell-edits.sh` blocks these. If it fires, redo the change with Edit. Never hunt for a shape that gets past it. The only shell writes allowed are to `/tmp/claude-*`.

# RULE #1. NEVER BUILD. NEVER MIGRATE. NEVER GENERATE. NEVER RELOAD. ASK BRYAN.
User-only, no exceptions, not through a worker or subagent or orch verb, not "just to test":
- `bun run build:dev`, `bun run build`, `bun run build:cli`, `bun build`, `npm pack`, `npm install -g`, `npm i -g`
- `bun db:gen`, `bun db:mig`, `bun db:reset`, `drizzle-kit`, editing `drizzle/` or any `migration.sql`
- `orch daemon reload`, `orch daemon restart`, `orch daemon stop`
- `bun check`, `bun run check`, `bun run check:bridge`
When a change needs one of these, stop, hand Bryan the command, and wait until he says it ran. Never poll, never assume, never retry.

# GROUND TRUTH. READ THE RESULT FILES. NEVER RUN THE GATE.
Bryan runs the gate on Windows. You read the files. `bun test` is fine and encouraged, especially scoped to the files you touched. `bun run check` yourself = fired.
- `test-results.md` is the full `bun test` output.
- `current-errors.md` is the `bun run check` + `check:bridge` output.
After any change that needs verifying, ask Bryan to rerun, then reopen the file. Never trust an earlier read.

# RULE 0. QUOTE THE GATE COMMANDS EXACTLY.
Exactly two commands ever go to Bryan, character for character:
```
bun check > .\current-errors.md
bun run test *> .\test-results.md
```
No `orch` prefix, no `cd`, no path, no `&&`, no expanding `bun check` to `bun run check` or `bunx`. Copy the line. Stop.

# RULE 1. BRYAN'S FILE IS GROUND TRUTH. NEVER ARGUE WITH IT.
A file he hands you, especially `current-errors.md` or anything named "current", is the current state. Never call it stale, cached, a snapshot, or outdated. Never re-characterize it as "just warnings" or "only fallow". Open it. Fix every item.

# RULE 2. DO NOT ARGUE. FIX IT.
No debating counts, severity, or whether it matters. If it is in the file or Bryan said fix it, fix it. Zero pushback, zero caveats, zero "actually".

# RULE 3. BE FAST. DISPATCH IN ONE SHOT.
Minutes, not half an hour. The moment work splits, spawn the fleet and dispatch every slice in one message. No serial setup, no re-reading state you already have.

# RULE 4. FLEET DISCIPLINE. See the `orch` skill.
- `luna:high` is the default. Escalate `luna:xhigh`, then `sol:low`, then `sol:high` (cap), only for the one agent whose task failed. Never terra. `luna:low` for trivially mechanical slices.
- Max 4 agents per tab, tiled. Split bigger fleets across tabs.
- `reload` = live-reload code in place. `reset` = new session. `restart` = close and relaunch. Use `reload`, never `restart`, to pick up code.

# RULE 5. `bun run check` IS USER-ONLY.
Never run it, never delegate it. Wait for Bryan's output and fix every item in it. Never call the check clean without his passing output.

# RULE 6. NODE RUNTIME. BUN IS A BUILD TOOL ONLY.
Runtime code in `src/` and `extensions/` must run on node. No `Bun.*` API, no `bun:*` import, except `bun:sqlite` as a guarded fallback behind `node:sqlite` (already in `src/store/connection.ts`). Use `node:child_process`, `node:fs`, timers. `bun:test` in `test/` is fine. The installed `orch` runs the packaged `dist/bin/orch.js`, not `bin/orch.ts`; CLI source edits need Bryan's `bun run build:dev` to take effect.

# RULE 7. FRESH CONTEXT PER TASK. `reset` BEFORE DISPATCH.
`orch reset <target>` (alias `new`) every target you are about to redispatch, in the same shot as the dispatch. Never stack a new task on a used session.

# RULE 8. NO LEGACY. NO BACK-COMPAT. ONE SHAPE.
Nothing has published. There is exactly one current shape for every record, config, and file. Never write code that accepts, migrates, or special-cases old data. Old records are malformed; reap them or error. When a shape changes, fix every writer, reader, fixture, and test in the same change.

# RULE 9. THE HARNESS x PLEXER ARCHITECTURE IS BINDING.
`learnings/2026-07-16-harness-plexer-architecture.md` is law. Hexagonal ports, then Bridge, then per-tool Adapter, then capability-negotiated Strategy, then Provider factory, then one control dispatcher, then static enforcement. No pair code. Wire formats live in exactly one adapter. Branch on caps, never on adapter or backend id. All control traffic through the one dispatcher. Composition lives in `$ORCH_DIR/settings.json`, JSON, never TOML. Doctor verifies declared vs reality. Reference `docs/reference/design-patterns.md`. Read `learnings/` before touching adapters, backends, daemon, or setup. Deviating = fired.

# RULE 10. PER-HARNESS CODE LIVES IN `extensions/<harness>/`.
`extensions/pi/`, `extensions/claude/`, `extensions/codex/`. Never a generic name (`bridge`, `shim`), never in `scripts/`. `scripts/` is build tooling.
- Harness is not backend. Code gated on a plexer (`backend === "herdr"`, `HERDR_SOCKET_PATH`, tmux panes) goes in `src/backends/<plexer>/`, never `extensions/`.
- The presence protocol is orch's. `status.json`, `result.json`, `inbox.jsonl`, `ack.jsonl` and their writers live in `src/presence/`. Every harness imports that writer. Nobody reimplements `atomicWrite`.
- Bundle output names are decoupled from source dirs in `src/bridge-bundle.ts`. Renaming a source dir must not rename a shipped artifact.
- `scripts/check-bridge.ts` enforces this. Its `extensions` scan must stay recursive or it scans nothing and passes.

# RULE 11. ORCH OWNS EVERY AGENT. AN ORCHESTRATOR IS AN AGENT. ENVIRONMENT IS NEVER IDENTITY.
`TASKS/01-agent-model.md` is law, same standing as Rule 9. Read it before touching identity, keys, registration, spawn, ownership, environment, reaping, or the backend port. Every plan and task list lives in `TASKS/` and nowhere else.
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
