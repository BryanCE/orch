# SQLite as the agent write surface vs. presence files

Outside research, 2026-09-01. Question: agents currently write JSON files and a
daemon watcher mirrors them into `runs`. Should agents write SQLite directly?

## 1. SQLite handles many short-lived writer processes

WAL mode lets one writer and any number of readers proceed at the same instant;
readers read the main file and peek at the `-wal` for newer pages. It does NOT
lift the single-writer constraint — two simultaneous writers serialize, one waits.
Measured guidance: lock errors are negligible below ~20 concurrent writers, and
p99 latency degrades past that.

orch's fleet cap is 4 agents per tab. Even several tabs plus the daemon and CLI
invocations sit an order of magnitude under the degradation threshold. Write
volume per agent is a status upsert per turn, not a stream.

Required settings (orch already has the first two, `src/store/connection.ts:189-195`):

- `PRAGMA journal_mode = WAL` ✔
- `PRAGMA busy_timeout = 5000` ✔ — at least 3-5s; raise it if not latency-sensitive
- `BEGIN IMMEDIATE` for any read-then-write transaction ✗ **not currently used**

That third one is the trap. SQLite does not honour `busy_timeout` when a
DEFERRED transaction upgrades a read lock to a write lock: a concurrent writer
makes it return `SQLITE_BUSY` immediately, timeout or not. Every claim-style
operation (read a row, decide, write it) must open with `BEGIN IMMEDIATE`.

Sources:
- [Runnable SQLite Docs: WAL & Concurrency](https://coddy.tech/docs/sqlite/wal-mode-and-concurrency)
- [SQLite concurrent writes and "database is locked" errors](https://tenthousandmeters.com/blog/sqlite-concurrent-writes-and-database-is-locked-errors/)
- [What to do about SQLITE_BUSY errors despite setting a timeout](https://berthub.eu/articles/posts/a-brief-post-on-sqlite3-database-locked-despite-timeout/)
- [SQLite in Production 2026: Benchmarks and Limits](https://sesamedisk.com/sqlite-in-production-2026-benchmarks-limits/)

## 2. A DB queue is strictly better than a directory queue

Exactly-once claim across worker processes is a solved SQLite pattern: the
read-and-claim must be one atomic step under `BEGIN IMMEDIATE`. That is the same
guarantee Redis/BullMQ give, over a file instead of a socket. The filesystem
equivalent — a queue folder polled on an interval, files moved between
queue/processing/succeeded/failed dirs — is the weaker form of the same machine,
and it is roughly what `inbox.jsonl` + claim-rename + `ack.jsonl` reimplements by
hand.

Note SQLite's own IPC mechanism *is* filesystem locks. Moving orch's queue into
SQLite is not adding a dependency on something exotic; it is using the locking
primitive orch already depends on, through a layer that gives transactions.

Sources:
- [A SQLite Background Job System](https://jasongorman.uk/writing/sqlite-background-job-system/)
- [SQLite User Forum: Publish/subscribe queue](https://sqlite.org/forum/info/304941521f0014c944e50b88fab6ca58a33d91384e2e58c95d1945c7609a635a)

## 3. The one thing files give that SQLite does not: change notification

This is the real cost of moving off files, and it is the only honest argument
for the current design.

SQLite has no cross-process change notification. `sqlite3_update_hook` fires only
on the connection that registered it — a hook in process B never sees process A's
writes. The community answers are:

1. watch the `-wal`/`-journal` file for commits, then
2. poll `PRAGMA data_version` (a counter incremented by other processes' commits)
   on a read connection, debounced ~1s, then
3. diff cached query results to find what actually changed.

So a DB-backed presence store still needs a watcher; it just watches one file
(`orch.db-wal`) instead of N directories, and gets a consistent snapshot instead
of a torn-file race. The daemon's push stream keeps working — the trigger changes,
the transport does not.

Source:
- [SQLite User Forum: Best way to observe database operations](https://sqlite.org/forum/info/82b7a5abb323fbce)

## 4. `fs.watch` is the least reliable part of the current design

The daemon's `runs` mirror fires only if `fs.watch` delivers the `status.json`
event that produces the terminal transition (`src/daemon/events.ts:352-368`).
Known failure modes:

- **WSL2 + `/mnt/*` (9P/drvfs): `inotify_add_watch()` succeeds and no event is
  ever delivered.** Silent. Open since 2019, unfixed. `$ORCH_DIR` on the Linux
  side is safe; an `ORCH_DIR` pointed at a Windows path is not, and would fail
  invisibly.
- inotify watch limit (commonly 8192) — exhaustion is not recoverable in-process.
- Events on directory creation can be missed: inotify watches the parent, and
  entries created during watcher setup are lost.
- No events for changes originating on the remote side of NFS/CIFS/SSHFS.

`src/daemon/events.ts` already pairs the watch with a safety poll, which is the
correct mitigation. But the mirror is still best-effort: no daemon running, or a
dropped event, means no `runs` row, and today `close` then deletes the only other
copy.

Sources:
- [nodejs/node#37960 — fs.watch does not work for WSL2 file paths](https://github.com/nodejs/node/issues/37960)
- [microsoft/WSL#4293 — inotify user watch limit](https://github.com/microsoft/WSL/issues/4293)
- [zed-industries/zed#51340 — PollWatcher fallback for WSL, network FS, FUSE](https://github.com/zed-industries/zed/issues/51340)
- [Fix: Node.js fs.watch cross-platform quirks](https://fixdevs.com/blog/nodejs-fs-watch-not-working/)

## 5. The current design is a dual write; the outbox pattern is the fix

orch writes agent state to a file and (separately, later, from another process)
to a table. That is textbook dual write: two systems, no shared transaction, and
a window where one succeeded and the other did not. Whoever reads afterwards
cannot tell which.

The transactional outbox inverts it: the producer writes the business record and
the event in ONE transaction against ONE database; a relay reads unsent rows and
publishes asynchronously. The database, not the transport, is the atomic unit of
truth. Guarantees at-least-once, not exactly-once, so consumers stay idempotent —
which orch's ack path already assumes.

Applied here: the agent writes its own status/result row transactionally, and the
daemon relays transitions to subscribers. There is no mirror, so there is nothing
for a missed `fs.watch` event to lose.

Trade-offs the sources call out and that apply: every write carries the outbox
write (larger transactions, more contention), delivery is delayed by the relay
poll, the relay must be monitored, and the outbox table needs archival. orch
already runs the relay (orchd) and already has retention.

Sources:
- [Transactional outbox pattern — AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- [The Outbox Pattern Explained](https://streamkap.com/resources-and-guides/outbox-pattern-explained)
- [Transactional Outbox Pattern: A Practical Guide to Trade-offs](https://www.softwarecraftsperson.com/posts/2025-10-08-transactional-outbox-pattern/)

## 6. Runtime portability: what `node:sqlite` actually costs (Rule 6)

The stated reason presence stays file-only is that harness shims run under
whatever runtime is on PATH and must not link the sqlite graph. Current state of
that constraint:

- **Node**: `node:sqlite` landed in v22.5.0 behind an experimental warning,
  release-candidate in 24.x, fully stable in v26.
- **Bun**: provides a `node:sqlite` polyfill, documented as covering the most
  common cases; `bun:sqlite` is the native path.
- **Deno**: ships `node:sqlite` via its node-compat layer.

So the portable baseline holds on current runtimes, with a real floor: node
< 22.5 has no `node:sqlite` at all, and on 22.x it warns.

**Measured, in this repo, 2026-09-01 — the constraint is already not enforced:**
`dist/extensions/pi-bridge.js` contains `from "node:sqlite"` (×2), 6 `DatabaseSync`
references and 136 drizzle references. The leak path is
`extensions/pi/index.ts` → `src/seat/index.ts` → `seat/runtime.ts` →
`seat/source.ts:15` → `src/presence/store.ts` → `src/store/connection.ts`.
`presence/writer.ts` and `presence/schema.ts` are leaf-clean as their headers
claim; `presence/store.ts` is not, and the bridge pulls it in through the seat UI.
The bridge bundles are 2.4MB each — larger than `dist/bin/orch.js` at 1.6MB.

Sources:
- [Using the built-in SQLite module in Node.js](https://blog.logrocket.com/using-built-in-sqlite-module-node-js/)
- [Node.js node:sqlite module — Bun reference](https://bun.com/reference/node/sqlite)
- [`node:sqlite` not available in Bun? — oven-sh/bun#27092](https://github.com/oven-sh/bun/discussions/27092)

## 7. Files and the DB answer different questions

The discriminator is not which one is nicer to read. It is: does correctness
depend on the file?

Where a file IS the record, the failure mode is documented and has a name. The
stale pidfile syndrome: a process writes a file, dies without removing it, and
the file now asserts something false. Nothing detects this, because the reader
trusts the file. The consequences the sources list are a startup script deciding
the service is already running and refusing to start, a signal delivered to
whatever process inherited the reused PID, and in every case a human deleting a
file before the software will work again. That is the same class of bug as
`close` removing the only copy of a run, and as a missed `fs.watch` event
leaving no row.

Where the file is a byproduct, none of it applies, because nothing reads it to
make a decision.

What SQLite gives that a directory of JSON files does not, per the sources:
concurrency and partial writes handled by the store instead of by convention,
queries and indexing over the whole set instead of N reads the caller joins by
hand, integrity constraints, and change detection at the store level rather than
at the filesystem. The counterweight the same sources raise is that a JSON file
is editable and inspectable with no tool at all, and a database is not.

Sources:
- [Local-First State Management With SQLite](https://powersync.com/blog/local-first-state-management-with-sqlite)
- [SQLite User Forum: Flat files vs SQLite](https://sqlite.org/forum/forumpost/3d7be1ad3d?t=c)
- [SQLite User Forum: SQLite vs. XML vs. JSON as an application file format](https://sqlite.org/forum/info/f6ee53954467d410)
- [The Stale pidfile Syndrome](https://perfec.to/posts/stale-pidfile/)
- [Stale PID File Prevents Service Startup](https://www.progressiverobot.com/2026/05/24/stale-pid-file-prevents-service-startup/)

## 8. JSONL is the correct shape for the history surface

The format the agent-runtime sources converge on for the readable surface is
newline-delimited JSON, for reasons that are specific rather than aesthetic:

- Each line is self-contained and independently parseable, so a truncated tail
  costs one event. A batched JSON array or a binary log does not survive a
  partial write during a crash.
- Append-only matches the forward-only progression of agent work. The sources
  are explicit that the discipline is what makes it work: allow code to edit
  old events and it degrades into a status field with extra steps.
- It is text, so `grep`, `jq`, `sed` and `awk` all apply, along with long-term
  archival and any tool that reads lines. The stated production pattern is to
  grep a session id and read the turns in order.
- It needs no queue, broker, or new dependency. A flat file and an append is
  the whole mechanism.

One file per unit (per day, or here per agent) with new events at the bottom is
the layout these sources use.

Sources:
- [Give Agents an Append-Only Event Log](https://bmdpat.com/blog/ai-agent-event-log-observability-2026)
- [JSONL as the Native Observability Format for AI Agent Runtimes](https://zylos.ai/research/2026-06-06-jsonl-agent-observability-data-format/)
- [JSONL for Log Processing](https://ndjson.com/use-cases/log-processing/)
- [Working with NDJSON: Newline-Delimited JSON for Logs and Streams](https://jsonparser.com/ndjson-guide)
- [A Beginner's Guide to JSON Logging](https://betterstack.com/community/guides/logging/json-logging/)

## What the research does NOT support

- Keeping the files "so the user can read past runs by hand" is a real
  requirement, but it argues for an exported/queryable artifact, not for the
  files being the write path. A `.jsonl` transcript written alongside the row
  serves it; so does `orch runs --json`.
- Nothing found treats a directory of mutable JSON files as a coordination
  primitive where a store is available. The systems that publish JSONL heavily
  publish it as an observability and history surface. The systems where files
  are the control plane are the ones operating under a no-daemon constraint,
  and their literature is a catalogue of staleness bugs.
- Nothing found supports a watcher-mirror as a durability mechanism. Every
  source treats a watcher as a notification trigger over data that is already
  durable somewhere else.

Sources:
- [Abusing SQLite to Handle Concurrency — SkyPilot](https://blog.skypilot.co/abusing-sqlite-to-handle-concurrency/)
- [Outbox Pattern for Reliable Event Publishing — Conduktor](https://www.conduktor.io/glossary/outbox-pattern-for-reliable-event-publishing)
