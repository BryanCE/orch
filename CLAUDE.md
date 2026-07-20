# CLAUDE.md — working rules for this repo (NON-NEGOTIABLE)

# GROUND-TRUTH FILES — READ THESE, NEVER RUN THE GATES YOURSELF
These files ARE the state of the tree. The USER runs the commands (on Windows); I only READ the result files. Running `bun test`/`bun run check` myself = FIRED.
- **`test-fails.md`** — full `bun test` output. User regenerates with: `bun test *> .\test-fails.md`
- **`current-errors.md`** — `bun run check` + `check:bridge` output. User regenerates with: `orch > bun check > .\current-errors.md`
- **`specview.md`** — openspec status snapshot.
WORKFLOW: after ANY change that needs verifying, ASK the user to rerun the relevant command above, then RE-READ the file before claiming anything. Always re-open the file after a rerun — never rely on a prior read.

# No running tetsing or checking from wsl only windows ! 

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
This project ships to node so anyone can use it without bun. Runtime code in `src/` and `extensions/` MUST be node-safe. **NEVER** call `Bun.*` APIs (`Bun.which`, `Bun.file`, `Bun.sleep`, `Bun.spawn`, etc.) or import `bun:*` (except `bun:sqlite` ONLY as a guarded fallback behind `node:sqlite`) in runtime code. Use node equivalents: `node:sqlite` for the DB (already abstracted in `src/store/sqlite.ts`), `node:child_process` / a PATH scan for binary lookup, `node:fs`, timers for sleep. `bun:test` is fine in `test/` (tests run under bun). The distributable entrypoint is the node-built `dist/bin/orch.js` (node shebang, chmod +x); `bun run build:dev` runs `bun run build:cli` (bun bundles → node output), then `npm pack` + `npm install -g <tarball>` to do a real copied global install under the active node prefix. The installed `orch` points at the packaged `dist/bin/orch.js`, NOT live `bin/orch.ts` — CLI source edits require a rebuild + reinstall via `bun run build:dev` to take effect.

## Rule 7 — Dispatch agents on a FRESH context. Always `reset` before a new task.
Before handing an agent a new task, `orch reset <target>` (alias `new`) so it starts with clean context — never pile a new task onto a used session. Reset every target you're about to redispatch, in the same shot as the dispatch.

## Rule 8 — Pre-publish: ZERO legacy/back-compat handling.
We are redesigning heavily; until orch actually publishes there is exactly ONE current schema/shape/format for every record, config, and file. NEVER write code that accepts, migrates, or special-cases out-of-date data — old records are malformed; reap them or error. Design for evolvability (stamp a version, one shared constant), but never accept two versions at once. When a shape changes, bump the constant and fix every writer, reader, and test in the same change.

## Rule 9 — The harness×plexer architecture direction is BINDING. Read `learnings/` before touching adapters/backends/daemon/setup.
`learnings/2026-07-16-harness-plexer-architecture.md` is law: layered stack (Hexagonal ports → Bridge → per-tool Adapter → capability-negotiated Strategy → Provider factory/builder → single control dispatcher → static enforcement). No pair code, wire formats live in exactly one adapter, branch on caps never on adapter/backend id, all control traffic through the one dispatcher, composition stored in user-editable `$ORCH_DIR/settings.json` (JSON — NEVER TOML), doctor verifies declared vs reality. Full reference `docs/reference/design-patterns.md`; research record `learnings/2026-07-16-pattern-research.md`. Deviating from this direction = fired.

## Rule 10 — Per-harness code lives under `extensions/<harness>/`, named for that harness.
Every agent harness's shipped in-process code lives in its OWN directory named for it: `extensions/pi/`, `extensions/claude/`, `extensions/codex/`. NEVER a generic name (`bridge`, `orchestrator-bridge`, `shim`) and NEVER parked in `scripts/` — `scripts/` is build tooling only. A new harness = a new `extensions/<harness>/` directory, no exceptions.
- **Harness ≠ backend.** Code gated on a *plexer* (`backend === "herdr"`, `HERDR_SOCKET_PATH`, tmux panes) belongs under `src/backends/<plexer>/`, NEVER under `extensions/<harness>/`. Mixing the two axes in one file is the pair code Rule 9 forbids.
- **The presence protocol is orch's, not any harness's.** `status.json` / `result.json` / `inbox.jsonl` / `ack.jsonl` and their writers live in `src/presence/`. Every harness artifact IMPORTS that writer; none reimplements `atomicWrite` or hand-rolls the presence dir. Three copies of that writer is exactly the bug this rule exists to prevent.
- Bundle OUTPUT names are decoupled from source dirs (`src/bridge-bundle.ts` maps name→dir) — renaming a source directory must never rename a shipped artifact the installed tree or doctor already knows.
- `scripts/check-bridge.ts` enforces this; its `extensions` scan MUST stay recursive, or it silently scans zero files and passes.
