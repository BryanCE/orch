# Presence durability + control plane — tasks

Research backing every decision: `learnings/2026-09-01-sqlite-multiprocess-vs-presence-files.md`.

Ordered. Each task states the defect, the change, and how you know it is done.

---

## Decisions in force

**The invariant. This is the acceptance test for the whole change.**

> `rm -rf $ORCH_DIR/agents/*` at any moment, and orch keeps working. You lose
> readable history and nothing else.

**Files stay.** They exist so a human can read, parse, archive and delete past
runs however they like. They are a derived history surface, never the write path
and never read to make a decision. Nothing is ever cleaned out to make orch work
correctly — pruning is a convenience, not a maintenance requirement.

**The DB is the signalling and control plane.** Liveness, leases, queue state
and outcomes are rows. Anything whose correctness depends on it is a row.

**Write order: row first, then the line.** The agent writes its own row in a
transaction, then appends the JSONL. A failed append costs history, never
correctness. The daemon stops mirroring and becomes a notifier and reaper.

**Runtime floor is node ≥ 22.5** — the first release with `node:sqlite`. Bun
polyfills it, Deno ships it through node-compat.

---

## T1. `BEGIN IMMEDIATE` on every read-then-write

**Defect.** SQLite does not honour `busy_timeout` when a DEFERRED transaction
upgrades a read lock to a write lock — a concurrent writer returns `SQLITE_BUSY`
immediately regardless of the timeout. Every claim-style path (read row, decide,
write) is exposed. Prerequisite for T2, and already latent wherever the CLI,
daemon and agents write concurrently today.

**Change.** Audit `src/store/*.ts` for read-then-write sequences and open them
`BEGIN IMMEDIATE`. Queue claim (`src/store/task-rows.ts`), lease acquisition,
`upsertRun`, spawn registration.

**Done when.** No claim path runs in a DEFERRED transaction; a concurrent-claim
test asserts exactly-once.

---

## T2. Stop the dual write — agents write their own rows

**Defect.** An agent writes state to a file; a different process later copies it
into a table. Two systems, no shared transaction, and a window where one landed
and the other did not. `fs.watch` is the least reliable link in it (see the
learnings doc §4: on WSL2 `/mnt/*`, `inotify_add_watch()` succeeds and delivers
nothing, silently).

The store is already configured for it: `journal_mode = WAL`, `busy_timeout = 5000`
(`src/store/connection.ts:189-195`). Fleet cap is 4 agents/tab — an order of
magnitude under where WAL write contention starts to bite (~20 concurrent writers).

**Change.** The agent writes its own status/result rows transactionally, then
appends the same event to its JSONL. Delete `runRecordForTransition` and the
`upsertRun` call from the watcher — `runs` stops being a mirror.

The daemon keeps notifying, because SQLite has no cross-process change hook. It
polls `PRAGMA data_version` on a read connection and diffs, instead of watching N
agent directories. That also removes the WSL2 `/mnt` failure mode, where
`fs.watch` never fires.

On-disk layout and file contents do not change. Only who writes them, and who is
allowed to read them for correctness (nobody).

**Done when.** A dispatch that completes with orchd stopped still has a `runs`
row; killing the watcher loses notifications, never data; deleting `agents/`
mid-run loses no state the CLI reports.

---

## T3. Move the queue into SQLite

**Defect.** `inbox.jsonl` + claim-rename + `ack.jsonl` is a hand-rolled directory
queue standing in for the control plane.

**Change.** Delivery and claim become rows, claimed under `BEGIN IMMEDIATE` for
exactly-once. `inbox.jsonl` and `ack.jsonl` join `status.json`, `results.jsonl`
and `outcomes.jsonl` as derived history: written for a human to read, parse and
delete, never read back to decide anything.

`src/control/outcome.ts` already shows the shape — the agent reports over the
daemon socket, the daemon records the row and settles the waiter in process.

**Done when.** No claim is a rename; queue state is answerable by query; deleting
`agents/` mid-run loses no delivery.

---

## T4. One retention setting for the file surface

**Defect.** Once files are derived, what to keep is a user choice, and Rule 17
says it is a setting. There is none.

**Change.** One knob, not a per-file-type matrix nobody sets: what to keep
(everything / results only / nothing) plus a prune age. Schema +
`SETTINGS_DEFAULTS` + registry help line + required type. Default keeps
everything orch writes today, so behaviour is unchanged until someone opts out.

**Done when.** The default produces the current file set byte for byte; setting
it to nothing leaves `agents/` empty and every command still passes its tests.

---

## T5. Cut the sqlite graph out of the bundled harness artifacts

**Defect.** `extensions/**` bundles link `node:sqlite`, against Rules 6 and 10.
Under node the shim prints `ExperimentalWarning: SQLite is an experimental
feature` to stderr, which fails `test/claude-hooks-shim.test.ts` ("Nothing on
either output channel") and pollutes any harness that reads the shim's output.

One leak is cut: `src/worker-prompt.ts` is now a leaf, with `maySpawnFrom` and
`spawnerIsRepliable` moved to `src/policy/spawner.ts`.

The remaining leak is `src/backends/herdr/hud.ts:51` — `herdrPaneHandle` reads
`environmentOf(orchDir(), id)`. Full path into the bundle:
`extensions/claude/index.ts:19` → `src/backends/hud.ts:23` →
`src/backends/herdr/hud.ts:15` → `src/store/agent-view.ts`.

`src/presence/store.ts` is the same class of problem: `writer.ts` and `schema.ts`
are leaf-clean as their headers claim, `store.ts` is not, and the pi bridge pulls
it in via `seat/source.ts:15`.

**sqlite is not the only coupling in the bundle.** `src/backends/herdr/hud.ts`
(330 lines) also talks to the plexer directly, and both paths ship inside every
harness artifact:

- `sendHerdrMetadata` opens herdr's own control socket and calls
  `pane.report_metadata` (`hud.ts:81-95`), driven by `createPaneStatusReporter`.
- `runHerdrJson` shells out to `herdr pane list` / `herdr tab list` via
  `execFile` (`hud.ts:140`), driven by `readPaneLabels`.

Removing only the store read would leave a bundle that still knows herdr's wire
format and its CLI. The whole file moves behind the daemon.

**Change.** A bundled artifact passes MESSAGES through the daemon. It reads
neither the store nor the plexer's environment — knowing its pane handle is
itself the coupling. orchd is the only thing that knows herdr exists.

Applied to the six members of `PaneHud` (`src/types/plexer.ts:57`):

- `paneHandle` — deleted, along with `herdrPaneHandle` and its callers.
- `registerPaneState`, `statusReporter` — the agent already writes its state and
  orchd already watches transitions, so orchd paints the pane from what it has.
  The shim stops doing it; no new message.
- `notify` — a message to orchd, which already owns `notify/router.ts`.
- `readLabels`, `registerBlockedRelay` — orchd pushes these to the shim on the
  socket it already holds for acks and control outcomes.

The bundle then keeps no `backends/herdr/` code, no `HERDR_PANE_ID`, no herdr
socket, no `herdr` shell-out and no store.

The consumer to rewrite against is `src/agent/harness-bridge.ts:33-85`, which
uses all six members. `activePaneHud(id)` currently answers synchronously; a
daemon-backed HUD does not, so the bridge takes what orchd tells it rather than
asking during construction.

Afterwards make `scripts/check-bridge.ts` fail when a bundled extension links
`node:sqlite`, drizzle, a plexer socket or a plexer binary. Do not leave it as a
comment nobody checks.

**Done when.** `bun check` fails on a violation, `dist/scripts/claude-hooks.js`
contains no `node:sqlite` and no `herdr`, and `test/claude-hooks-shim.test.ts`
passes. That test exercises the built artifact, so it stays red until a rebuild.

---

## T6. Housekeeping

- **`orch stop` does not exist.** No handler, no `TOPICS` entry, so `orch stop -h`
  prints `Unknown command: stop` + usage, exit 1. The stop-shaped verbs are
  `orch daemon stop`, `orch abort`, `orch close`. Decide: add an alias, or leave
  it. An `ALIASES` entry alone would make `-h` work while the command stays
  unknown — do not do that half.
- **`bun reinstall` wipes all of `~/.orch`** (`packages/orch/scripts/reset.ts`,
  no `--build`) — db, agents, settings, logs. That is its job, but nothing warns
  and nothing backs up. `bun db:reset` keeps a copy under `~/.orch/backups/`;
  the full reset does not. Consider making the store removal step snapshot
  `agents/` + `orch.db` the way `db:reset` already does.
- **`liveStorePresent` is presence-only** (`scripts/reset.ts:228`): it checks
  `orchd.lock` and live pids in `agents/*/status.json`. Deleting `orch.db` does
  not move it, and costs run history. The refusal message says "stop agents and
  retry" — it should name the pids it found.
- **`oxlint-tsgolint` is not installed**, so `bun check`'s lint leg cannot run:
  `bun add -D oxlint-tsgolint`.
