# CLAUDE.md — working rules for this repo (NON-NEGOTIABLE)

# GROUND-TRUTH FILES — READ THESE, NEVER RUN THE GATES YOURSELF
These files ARE the state of the tree. The USER runs the commands (on Windows); I only READ the result files. Running `bun test`/`bun run check` myself = FIRED.
- **`test-results.md`** — full `bun test` output. User regenerates with: `bun run test *> .\test-results.md`
- **`current-errors.md`** — `bun run check` + `check:bridge` output. User regenerates with: `bun check > .\current-errors.md`
- **`specview.md`** — openspec status snapshot.
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
- Model ladder: `luna:medium` default → escalate luna high/xhigh → `sol:low`→`sol:high` (cap). NEVER terra. `luna:low` for trivially mechanical slices.
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

## Rule 11 — ☢️ ORCH OWNS EVERY AGENT. AN ENVIRONMENT IS A PLACEMENT, NEVER AN IDENTITY. ☢️
`docs/reference/agent-ownership.md` is law, same standing as Rule 9. Read it before touching identity, keys, placement, workspaces, spawn, or the backend port.
- **Three entities, and they never blur.** *Agent* = an opaque minted id and NOTHING else, never mutable. *Placement* = environment, workspace, handle, cwd, worktree, branch — recorded by orch, and it CHANGES because agents move. *Workspace* = orch's OWN named grouping, minted and labelled by orch.
- **A workspace is orch's, not the plexer's.** An orch workspace is *projected into* an environment (a herdr workspace, a tmux session) and that projection is recorded as placement. Displaying a herdr-generated id like `wF` as a name is the bug. `"local"` is not a workspace, it is a missing value with a name — never write it, never default to it.
- **Never encode placement into identity.** No `<backend>~<workspace>~<handle>` in a new key. Anything inside an identity can never change, which is exactly why identity holds only the minted id.
- **Delivery and read are ORCH's mechanism; a pane is an optimisation.** `inbox.jsonl → bridge → ack.jsonl` needs no screen. A capless environment is one with no shortcut, NOT one orch cannot talk to.
- **Branch on declared capabilities, never on an environment id.** `backend === "herdr"`, `paneId === null`, and `key.startsWith("headless~")` are the same mistake three ways. Adding an environment means declaring its caps and editing ZERO renderers, commands, or policy. If a consumer needs editing, the seam is wrong.
**Why:** 2026-08-26 — the web showed `wF` (herdr's own generated id) as the workspace name and bucketed every detached agent ever spawned into `local`, because a plexer coordinate was being used as orch's identity.

## Rule 12 — ☢️ AN AGENT IS HELD BY A SESSION OR BY NOBODY. THE HUMAN IS NOT A PRINCIPAL. ☢️
`docs/reference/agent-lifecycle.md` is law, same standing as Rules 9 and 11. Read it before touching spawn, reaping, retention, session death, or adoption.
- **Held or unheld, and unheld is normal.** Never invent an owner value meaning "the human" — that is `"local"` all over again, a missing value dressed up as a principal. No accounts, ever; same-uid IS the trust boundary. The human's standing intent lives in `settings.json`; live intent is a command. CLI and web are two doors into ONE daemon method, never two code paths.
- **Ownership is a lease, never a parent pointer.** renew / release / handoff / adoption / expiry. Expiry transfers nothing to nobody. `processStartToken(pid)` is *evidence* for renewal; the lease is the *statement* — never fuse them.
- **`spawnedBy` is provenance and NEVER the owner field.** Two columns: one immutable (where it came from), one mutable (who holds it now). `orch events` scopes on OWNERSHIP — a provenance-scoped watch shows an adopted fleet nothing.
- **Two lifetimes, chosen at spawn, default fate-share.** `orch spawn` = owned, dies with its session. `--detached` = survives, and REQUIRES a name. `orch detach <target>` promotes a live agent. Said nothing = meant them to die.
- **Ownership governs automatic behaviour ONLY, never permission.** No command is ever gated on ownership. The kill path must not route through the holder (a dead holder would make its agent immortal) and must not touch the plexer, the pane, or the spawner's process.
- **Ending is three verbs:** `abort` the turn, `close` the process, `reap` the record. History outlives all three.
**Why:** 2026-08-26 — seven stale presence dirs nobody could name the owner of, which systemd documents exactly: processes that escape lifecycle management "remain running even while their service is considered stopped and is assumed to not consume any resources."

## Rule 10 — Per-harness code lives under `extensions/<harness>/`, named for that harness.
Every agent harness's shipped in-process code lives in its OWN directory named for it: `extensions/pi/`, `extensions/claude/`, `extensions/codex/`. NEVER a generic name (`bridge`, `orchestrator-bridge`, `shim`) and NEVER parked in `scripts/` — `scripts/` is build tooling only. A new harness = a new `extensions/<harness>/` directory, no exceptions.
- **Harness ≠ backend.** Code gated on a *plexer* (`backend === "herdr"`, `HERDR_SOCKET_PATH`, tmux panes) belongs under `src/backends/<plexer>/`, NEVER under `extensions/<harness>/`. Mixing the two axes in one file is the pair code Rule 9 forbids.
- **The presence protocol is orch's, not any harness's.** `status.json` / `result.json` / `inbox.jsonl` / `ack.jsonl` and their writers live in `src/presence/`. Every harness artifact IMPORTS that writer; none reimplements `atomicWrite` or hand-rolls the presence dir. Three copies of that writer is exactly the bug this rule exists to prevent.
- Bundle OUTPUT names are decoupled from source dirs (`src/bridge-bundle.ts` maps name→dir) — renaming a source directory must never rename a shipped artifact the installed tree or doctor already knows.
- `scripts/check-bridge.ts` enforces this; its `extensions` scan MUST stay recursive, or it silently scans zero files and passes.
