# CLAUDE.md — working rules for this repo (NON-NEGOTIABLE)

## RULE #1 — ☢️ NEVER BUILD. NEVER MIGRATE. NEVER GENERATE. ASK BRYAN. ☢️
You are NOT ALLOWED to run ANYTHING that builds, installs, migrates, generates, resets, or
reloads. Not directly, not through a worker, not through a subagent, not through an orch
verb, not "just to test it". The complete list, all USER-ONLY:
- `bun run build:dev`, `bun run build`, `bun run build:cli`, `bun build`, `npm pack`,
  `npm install -g`, `npm i -g` — ANY build or install
- `bun db:gen`, `bun db:mig`, `bun db:reset`, `drizzle-kit`, editing `drizzle/` or any
  `migration.sql` — ANY database generation, migration, or reset
- `orch daemon reload`, `orch daemon restart`, `orch daemon stop` — the daemon runs YOUR
  installed build; only Bryan cycles it
- `bun check`, `bun run check`, `bun run check:bridge` — the gate (Rule 5)
When a change needs any of these, STOP and hand Bryan the exact command to run, then WAIT
for him to say it is done. Never poll, never assume, never "retry in case". Every time this
rule is broken it costs Bryan hours; it has been said MANY times.

# GROUND-TRUTH FILES — READ THESE, NEVER RUN THE GATES YOURSELF
These files ARE the state of the tree. The USER runs the gate on Windows; I READ the result files. Running `bun run check` myself = FIRED. **Running `bun test` is FINE and encouraged** — run tests freely while working, especially scoped runs of the files you touched.
- **`test-results.md`** — full `bun test` output. User regenerates with: `bun run test *> .\test-results.md`
- **`current-errors.md`** — `bun run check` + `check:bridge` output. User regenerates with: `bun check > .\current-errors.md`
WORKFLOW: after ANY change that needs verifying, ASK the user to rerun the relevant command above, then RE-READ the file before claiming anything. Always re-open the file after a rerun — never rely on a prior read.

# No running tetsing or checking from wsl only windows ! 

## Rule 0 — ☢️ QUOTE THE GATE COMMANDS EXACTLY. NEVER PREFIX, DECORATE, OR INVENT. ☢️
There are exactly TWO commands to ever hand the user, character for character:
```
bun check > .\current-errors.md
bun run test *> .\test-results.md
```
**`orch` is NOT part of either command.** It is a directory/prompt name. Never prepend it, never prepend any `cd`, path, shell name, or `>`-chained prefix. Never "helpfully" expand `bun check` to `bun run check`, `bunx`, or a `&&` chain. Copy the line from this file verbatim into chat and stop.
Getting this wrong wastes the user's time on a command that does not run, in the one place they cannot skip. Zero variants. Zero improvisation.

## Rule 1 — The user's file/output IS ground truth. Never argue with it.
When the user hands you a file or output — ESPECIALLY one named `current-errors.md` or anything "current" — it is the CURRENT state, full stop. NEVER say it is "stale", "cached", "a snapshot", "outdated", or "predates the fixes". NEVER re-characterize what's in it ("it's just warnings", "only fallow", "the count is small"). Open it, read what it says, and FIX every item in it. If you think reality differs, you are wrong — trust the file.

## Rule 2 — Do not argue. Do not explain why something isn't a problem. Fix it.
No debating counts, severity, "warnings vs errors", or whether something matters. If it's in the file or the user says fix it, fix it. Zero pushback, zero caveats, zero "actually…". The user's instruction is the spec.

## Rule 3 — Be fast. Delegate immediately, dispatch in ONE shot.
This work should take minutes, not half an hour. The moment work splits, spawn the orch fleet and dispatch EVERY slice in one message. No serial setup, no analysis paralysis, no re-reading state you already have. Never run `bun run check` or delegate it; only the user runs that command. Use the user's provided output as ground truth.

## Rule 4 — Fleet discipline (see the `orch` skill).
- Model ladder: **`luna:high` is the default.** Escalate `luna:xhigh` → `sol:low` → `sol:high` (cap), and ONLY for the specific agent whose task actually failed — never the whole fleet, never pre-emptively on a fresh slice. NEVER terra. `luna:low` for trivially mechanical slices.
- MAX 4 agents per tab, tiled. Split bigger fleets across tabs.
- Lifecycle verbs: `reload` = live-reload code in place; `reset` = new session/context; `restart` = full close + relaunch. Use `reload`, never `restart`, to pick up code changes.

## Rule 5 — `bun run check` is USER-ONLY.
Never run `bun run check`, directly or through another agent. Only the user runs it. Wait for the user's output, treat it as ground truth, and fix every reported item. Do not declare the check clean without user-provided passing output.

## Rule 6 — NODE-COMPATIBLE runtime. Bun is a BUILD tool only, NEVER a runtime dependency.
This project ships to node so anyone can use it without bun. Runtime code in `src/` and `extensions/` MUST be node-safe. **NEVER** call `Bun.*` APIs (`Bun.which`, `Bun.file`, `Bun.sleep`, `Bun.spawn`, etc.) or import `bun:*` (except `bun:sqlite` ONLY as a guarded fallback behind `node:sqlite`) in runtime code. Use node equivalents: `node:sqlite` for the DB (already abstracted in `src/store/connection.ts`), `node:child_process` / a PATH scan for binary lookup, `node:fs`, timers for sleep. `bun:test` is fine in `test/` (tests run under bun). The distributable entrypoint is the node-built `dist/bin/orch.js` (node shebang, chmod +x); `bun run build:dev` runs `bun run build:cli` (bun bundles → node output), then `npm pack` + `npm install -g <tarball>` to do a real copied global install under the active node prefix. The installed `orch` points at the packaged `dist/bin/orch.js`, NOT live `bin/orch.ts` — CLI source edits require a rebuild + reinstall via `bun run build:dev` to take effect.

## Rule 7 — Dispatch agents on a FRESH context. Always `reset` before a new task.
Before handing an agent a new task, `orch reset <target>` (alias `new`) so it starts with clean context — never pile a new task onto a used session. Reset every target you're about to redispatch, in the same shot as the dispatch.

## Rule 8 — Pre-publish: ZERO legacy/back-compat handling.
We are redesigning heavily; until orch actually publishes there is exactly ONE current schema/shape/format for every record, config, and file. NEVER write code that accepts, migrates, or special-cases out-of-date data — old records are malformed; reap them or error. Design for evolvability (stamp a version, one shared constant), but never accept two versions at once. When a shape changes, bump the constant and fix every writer, reader, and test in the same change.

## Rule 9 — The harness×plexer architecture direction is BINDING. Read `learnings/` before touching adapters/backends/daemon/setup.
`learnings/2026-07-16-harness-plexer-architecture.md` is law: layered stack (Hexagonal ports → Bridge → per-tool Adapter → capability-negotiated Strategy → Provider factory/builder → single control dispatcher → static enforcement). No pair code, wire formats live in exactly one adapter, branch on caps never on adapter/backend id, all control traffic through the one dispatcher, composition stored in user-editable `$ORCH_DIR/settings.json` (JSON — NEVER TOML), doctor verifies declared vs reality. Full reference `docs/reference/design-patterns.md`; research record `learnings/2026-07-16-pattern-research.md`. Deviating from this direction = fired.

## Rule 11 — ☢️ ORCH OWNS EVERY AGENT. AN ORCHESTRATOR IS AN AGENT. ENVIRONMENT IS NEVER IDENTITY. ☢️
`TASKS/01-agent-model.md` is law, same standing as Rule 9. Read it before touching identity, keys, registration, spawn, ownership, environment, reaping, or the backend port. **Every plan, design, and task list for this rebuild lives in `TASKS/` and NOWHERE else** — not `docs/`, not `learnings/`, not a comment.
- **One entity.** Orchestrator, worker, and a Claude session driving orch are all agents, pointing at each other via provenance and a lease. No second id space, no second liveness mechanism.
- **Four facts, never welded.** *Identity* = a minted id and NOTHING else, immutable. *Provenance* = who spawned it, immutable. *Ownership* = who holds it now, a lease. *Environment* = where it is (cwd/repo/worktree/branch/plexer/handle/OS side), mutable. There is no fifth fact and no lifetime column.
- **Everything has an environment** — an agent, a pack, a space. orch's own grouping is a **space**; "workspace" is a plexer's word and never appears in orch's model, CLI, or UI.
- **Never encode environment into identity.** No `<backend>~<workspace>~<handle>` key. `"local"` is not a place, it is a missing value with a name; `wF` is herdr's id, never a name you chose. Both become columns.
- **Delivery and read are ORCH's mechanism; a pane is an optimisation.** `inbox.jsonl → bridge → ack.jsonl` needs no screen. A capless environment is one with no shortcut, NOT one orch cannot talk to.
- **Branch on declared capabilities, never on an environment id.** `backend === "herdr"`, `handle === null`, and `key.startsWith("headless~")` are one mistake in three hats. Adding an environment edits ZERO renderers, commands, or policy.
- **Ownership is a lease and it is mutual exclusion, NOT authorization.** `dispatch`/`steer`/`model`/`reset` are gated against a *live* foreign holder; `abort`/`close`/`reap` are NEVER gated — the human must always be able to kill from CLI or web. A dead holder is not a collision.
- **Work survives its spawner, ALWAYS.** No lifetime, no `--detached`, no fate-sharing, no grace timer on a working process. Losing a holder costs a driver, never a life. `detach` means one thing: release the lease.
- **Normalize, and pick types from purpose.** No wide agent row. Instants are INTEGER epoch millis, never TEXT. Prefer a nullable instant over a boolean — it says *when*, not just *whether*. `NULL` means not-applicable and never a sentinel string.
**Why:** 2026-08-26 — the web showed `wF` as a workspace name and bucketed every detached agent into `local`, and seven stale presence dirs had no nameable owner, because plexer coordinates were being used as orch identity and ownership had no liveness.

## Rule 10 — Per-harness code lives under `extensions/<harness>/`, named for that harness.
Every agent harness's shipped in-process code lives in its OWN directory named for it: `extensions/pi/`, `extensions/claude/`, `extensions/codex/`. NEVER a generic name (`bridge`, `orchestrator-bridge`, `shim`) and NEVER parked in `scripts/` — `scripts/` is build tooling only. A new harness = a new `extensions/<harness>/` directory, no exceptions.
- **Harness ≠ backend.** Code gated on a *plexer* (`backend === "herdr"`, `HERDR_SOCKET_PATH`, tmux panes) belongs under `src/backends/<plexer>/`, NEVER under `extensions/<harness>/`. Mixing the two axes in one file is the pair code Rule 9 forbids.
- **The presence protocol is orch's, not any harness's.** `status.json` / `result.json` / `inbox.jsonl` / `ack.jsonl` and their writers live in `src/presence/`. Every harness artifact IMPORTS that writer; none reimplements `atomicWrite` or hand-rolls the presence dir. Three copies of that writer is exactly the bug this rule exists to prevent.
- Bundle OUTPUT names are decoupled from source dirs (`src/bridge-bundle.ts` maps name→dir) — renaming a source directory must never rename a shipped artifact the installed tree or doctor already knows.
- `scripts/check-bridge.ts` enforces this; its `extensions` scan MUST stay recursive, or it silently scans zero files and passes.

## Rule 12 — ☢️ PUBLISHING IS USER-ONLY. NEVER WRITE INTO THE INSTALLED TREE. ☢️
Nothing but the user's own `bun run build:dev` writes to `~/.local/lib/node_modules/@bryance/orch/`, `~/.pi/agent/extensions/`, or any installed/global location. Not `bun build --outfile <installed path>`, not `npm install -g`, not `npm pack`, not a symlink, not an orch verb (reload/reset/restart never build), not a worker, not the orchestrator session "just to test it". Builds go to the checkout's `dist/` or a temp dir and STOP there.
**Why:** 2026-08-28 — the orchestrator session hand-bundled untypechecked seat code straight into the installed package; every pi session on the machine (the user's own included) then crashed loading `pi-bridge.js` (`Effect.runForkWith is not a function`) for hours, and only the user could replace the file.

## Rule 13 — NO `as` casts, NO `any`. Fix the type, never the symptom.
`as X` is forbidden unless there is genuinely no other way, and `as unknown as X` is forbidden outright — it is a lie to the compiler wearing two hats. `any` (explicit or implicit) is forbidden everywhere. A test fixture that doesn't satisfy a type gets a typed factory that builds the COMPLETE value; a value of the wrong shape gets narrowed with a real type guard; a wrong signature gets its signature fixed. A gate error is never "fixed" by casting past it — that's the compiler telling you the code is wrong, and casting deletes the message, not the bug.
**Why:** 2026-08-28 — a gate-sweep worker "fixed" a typecheck error by rewriting `as Partial<NotifyEvent>` to `as unknown as NotifyEvent`.

## Rule 14 — ☢️ NEVER BUMP A SCHEMA VERSION. NOTHING HAS PUBLISHED. ☢️
**NOTHING IS PUBLISHED. There is no installed base. Every version number in this repo is frozen
until Bryan removes this rule.** A bump versions the shape against nobody and only breaks the tree.
Frozen, no exceptions:
- `SETTINGS_SCHEMA` (`src/config.ts`) — **1**
- `PRESENCE_SCHEMA` (`src/presence/schema.ts`) — **1**
- the `version` in `package.json` (and any workspace package.json) — publishing has not happened
- every future schema/version/stamp constant added to this repo
Rules:
- When a shape changes, **change the shape and every writer, reader, fixture and test. Do NOT touch the number.**
- Never bump "to be safe", never bump for a release/publish, never bump as part of a wave, never bump because a fixture disagrees.
- A version mismatch in a test is the FIXTURE being wrong, never a reason to move the constant.
**Why:** 2026-08-29 — a build wave walked `SETTINGS_SCHEMA` to 5 for an added `logging` section
and left three fixtures stamped 3 and 4, breaking six tests for a version that guards nothing.
