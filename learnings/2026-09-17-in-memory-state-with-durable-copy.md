# Durability strategies for an in-memory daemon with a crash-recovery-only disk copy

Outside research, 2026-09-17. Question: a single-process Node/TypeScript daemon
keeps authoritative state in memory and never reads its on-disk sqlite copy at
runtime. The disk copy exists only so the daemon can rebuild state after a
crash or power loss. Compare four strategies for keeping that copy durable.

Target system: one writer process, ~150 records across ~10 sqlite tables,
sub-millisecond in-memory ops that persistence must not slow down, sqlite via
drizzle already in the codebase, and two offline readers (`--offline` status,
doctor) that open the sqlite file directly only while the daemon is down.

A note that applies to every strategy below: a **process crash** leaves the
OS page cache intact — the kernel is still running, so any bytes already
handed to `write()` are still sitting in memory and the kernel will flush them
on its own schedule. A **power loss** takes the page cache with it — only
bytes that reached the storage device via a completed sync survive. Node's
plain `fs.writeFile`/`fs.writeFileSync` only issue a `write(2)`-style call and
return; nothing is flushed to the device until `fs.fsync`/`fs.fsyncSync` or
`filehandle.sync()` is called. `filehandle.sync()` is documented to "request
that all data for the open file descriptor is flushed to the storage device,"
and `filehandle.datasync()` separately "forces all currently queued I/O
operations associated with the file to the operating system's synchronized
I/O completion state... unlike `filehandle.sync` this method does not flush
modified metadata" — the existence of these as distinct, explicit calls is
itself the documentation that an ordinary write does not fsync
(https://nodejs.org/api/fs.html). This is why "crash" and "power loss" get
separate answers below wherever unflushed writes are in play.

## 1. Periodic full snapshot / checkpoint

Redis's RDB is the canonical version: `fork()`, then the child writes a new
file and the parent atomically replaces the old one. "The parent process will
never perform disk I/O or alike," which is what makes I/O free on Redis's hot
path — the child does the writing, and copy-on-write means the child only
pages in memory the parent actually mutates during the dump
(https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/).
The parent process is still not free, though: "fork() can be time consuming
if the dataset is big, and may result in Redis stopping serving clients for
some milliseconds or even for one second if the dataset is very big and the
CPU performance is not great" (same source) — the pause is in the fork() call
itself, before any I/O happens.

That fork-and-dump shape does not transplant to a Node daemon the way it
sounds. `child_process.fork()` starts a fresh V8 process with its own heap;
it does not get a copy-on-write view of the parent's JS objects the way a
POSIX `fork()` gives a C process a view of its heap pages. A Node daemon that
wants an "in-process full dump" therefore has only one real option: serialize
the in-memory state on the main thread and write it out, which puts the dump
squarely on the hot path for its duration — there is no cost-free child to
hand it to. At 150 records this dump is small, but it is still synchronous
CPU + I/O time stolen from every in-memory operation queued behind it.

**Durability window.** RDB's own trade-off: "you'll usually create an RDB
snapshot every five minutes or more, so in case of Redis stopping working
without a correct shutdown for any reason you should be prepared to lose the
latest minutes of data" (Redis persistence docs, same URL as above). Crash
and power loss give the *same* answer for this strategy — there are no
interim writes sitting in the page cache between snapshots for a crash to
preserve; everything since the last full dump is gone either way.

**Write cost on the hot path.** Off the hot path only if the dump runs in a
process/thread that does not share the event loop doing the in-memory work
(Redis's model). Done in-process on one Node thread, it is squarely on the
hot path.

**Restore cost and correctness.** Fast and simple: load one file. "RDB
allows faster restarts with big datasets compared to AOF"
(https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/).
No replay, no ordering to reconstruct — the snapshot's atomic rename means a
reader only ever sees a complete file ("the RDB is never modified once
produced, and while it gets produced it uses a temporary name and is renamed
into its final destination atomically... only when the new snapshot is
complete," same source).

**Complexity.** Low for the format itself (one full dump), but any attempt to
get the fork-based off-hot-path property in Node adds a worker thread or
child process and a way to hand it a serialized copy of the state — nontrivial
plumbing for a 150-record dataset that does not obviously earn it.

**Fit with sqlite.** A full rewrite is either `DELETE FROM t; INSERT ...` per
table or `DROP TABLE t; CREATE TABLE t; INSERT ...`, wrapped in one
transaction. Both get the same atomicity guarantee from sqlite's commit
mechanism regardless of which DDL/DML mix is used, because the rollback
journal or WAL protects every page changed inside a transaction, schema pages
included — "either all database changes within a single transaction occur or
none of them occur" (https://sqlite.org/atomiccommit.html). A DROP+CREATE
inside the same transaction as the snapshot fsyncs no differently than
DELETE+INSERT; the only material difference is that DROP+CREATE churns
`sqlite_master` and invalidates prepared statements, which DELETE+INSERT does
not. Whichever is used, a full-table rewrite this small will regenerate far
fewer than the ~4MB / 1000-page WAL auto-checkpoint threshold
(https://sqlite.org/wal.html), so it will not itself trigger a checkpoint
stall.

## 2. Append-only journal / write-behind log with compaction

Redis's AOF logs every write command and replays it at startup
(https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/).
Durability is set by `appendfsync`, and the three policies are exact:

- `always` — "fsync every time new commands are appended to the AOF. Very
  very slow, very safe" (same source). Both crash and power loss lose at
  most the write currently in flight, because every completed write is
  already fsynced before the next one proceeds.
- `everysec` — "fsync every second... you may lose 1 second of data if there
  is a disaster" (same source). This is where crash and power loss genuinely
  diverge: the writes made in that pending second are still sitting in the
  OS page cache. A process crash (kernel alive) does not touch that cache —
  the data is very likely to reach disk on the kernel's own schedule even
  though the daemon never called fsync itself. A power loss takes the page
  cache with it, so that second of writes is actually gone. Redis's own
  wording only promises the power-loss number; the crash case is better in
  practice precisely because Node's/the OS's `write()` already handed the
  bytes to the kernel.
- `no` — "Never fsync, just put your data in the hands of the Operating
  System... Normally Linux will flush data every 30 seconds with this
  configuration, but it's up to the kernel's exact tuning" (same source).
  Same crash/power-loss split as `everysec`, just a wider window — up to ~30s
  of writes are power-loss-exposed, and survive a mere process crash.

Torn writes are handled, not avoided: "the AOF is an append-only log, so
there are no seeks, nor corruption problems if there is a power outage. Even
if the log ends with a half-written command... the `redis-check-aof` tool is
able to fix it easily," and modern Redis will "discard the last non
well-formed command" and load anyway
(https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/).
**AOF rewrite** (compaction) runs in a forked child that writes the minimal
command set needed to reproduce the current dataset, while the parent keeps
appending to the file being replaced; the switch is atomic, so "the rewrite
is completely safe" (same source, "Log rewriting" section).

`sqlite`'s own WAL is the same idea at the storage-engine layer: "changes are
appended into a separate WAL file. A COMMIT occurs when a special record
indicating a commit is appended to the WAL" (https://sqlite.org/wal.html) —
crash recovery for WAL is covered under Strategy 4, since WAL-with-checkpoint
*is* the hybrid pattern, not a pure append-only journal on its own.

**Write cost on the hot path.** Writing one journal entry per mutation, on a
Node single-process daemon, means either the write is synchronous and on the
hot path, or it is deferred to an async `fs`/sqlite call the caller does not
await — but then the daemon has reinvented `everysec`-style buffering by
hand, with none of Redis's background fsync thread to bound it. There is no
free lunch here without building the equivalent of Redis's dedicated fsync
thread.

**Restore cost and correctness.** Replay is O(number of journal entries since
the beginning of time) unless compaction runs, which is the whole reason AOF
rewrite exists. Ordering must be preserved exactly — a journal is only
correct if replayed in write order, which is the same requirement sqlite's
own WAL enforces via a monotonically increasing commit sequence.

**Complexity.** Highest of the four to hand-build well: entry format,
fsync-policy tri-state, rewrite/compaction trigger, a second file plus
manifest to avoid rewriting the whole log every restart, and a repair path
for a truncated tail.

**Fit with sqlite.** Building an application-level append-only journal on top
of sqlite duplicates work sqlite's WAL already does at a lower level. Using
`BEGIN IMMEDIATE` per journal entry avoids the write-lock-upgrade failure
mode entirely (irrelevant here — single writer, no other connection ever
holds a write lock concurrently — but still cheap to use consistently). The
practical conclusion: a hand-rolled per-mutation journal is strictly inferior
to just running sqlite in WAL mode and letting sqlite's own append-only log
do this job (Strategy 4).

## 3. Dirty-set flush on a timer

Collect the set of records changed since the last tick and write them in one
sqlite transaction per tick. This is not one of the two Redis mechanisms —
it is closer to a generic write-behind cache — so there is no Redis citation
for it; it is evaluated purely against the sqlite primary sources and the
target system's numbers.

**Durability window.** Crash and power loss are the same as Strategy 1's:
everything mutated since the last tick and not yet committed is gone either
way, because the dirty set lives only in memory until the transaction
commits. The window is bounded by the tick interval, not by dataset size —
unlike Strategy 1, the flush cost does not grow with total record count, only
with how many of the ~150 records changed that tick.

**Write cost on the hot path.** None. The in-memory operation only adds a key
to a dirty set (an O(1) operation), which is exactly the "I/O off the hot
path" property the target system needs. The actual sqlite write happens on
the timer, off the calling code path entirely.

**Restore cost and correctness.** Trivial: at startup the daemon just opens
the sqlite file — it is already fully durable up to the last committed tick,
there is nothing to replay. Correctness depends only on the flush being a
single transaction per tick; sqlite's transaction guarantees (below) make
that one commit all-or-nothing.

**Complexity.** Lowest of the four: a dirty-key set, a timer, and one upsert
transaction. No rewrite/compaction logic, no journal format, no fork/thread
plumbing.

**Fit with sqlite.** This is the literal shape sqlite transactions are built
for: `BEGIN IMMEDIATE` (safe as the sole writer, and cheap even though there
is never contention to avoid — https://sqlite.org/lang_transaction.html),
one `INSERT ... ON CONFLICT` per dirty row, `COMMIT`. In WAL mode this is one
appended WAL commit record per tick — "WAL uses many fewer fsync()
operations" and writes are "all sequential"
(https://sqlite.org/wal.html) — rather than the two writes-plus-fsyncs a
rollback-journal commit costs. `PRAGMA synchronous=NORMAL` is the documented
sweet spot for this shape in WAL mode: "the SQLite database engine will still
sync at the most critical moments, but less often than in FULL mode," and
critically, "WAL mode is always consistent with synchronous=NORMAL" even
though "a transaction committed in WAL mode with synchronous=NORMAL might
roll back following a power loss or system crash" — i.e. you can lose the
last committed tick's transaction on power loss, but you cannot get a
corrupt database (https://sqlite.org/pragma.html#pragma_synchronous). That
lost-last-transaction exposure is the same "since the last tick" window
already described above, not a new risk. `PRAGMA synchronous=FULL` removes
even that by syncing every commit, at the cost of an fsync per tick instead
of per WAL-checkpoint — affordable for a once-per-tick write of ~150 rows'
worth of dirty data.

## Write-behind implementation in Node: queue+setImmediate vs worker_threads

Strategy 3 says "the sqlite write happens on the timer, off the calling code
path entirely," but both `node:sqlite` and `bun:sqlite` are synchronous APIs
— there is no async/await variant. "The `node:sqlite` module facilitates
... SQLite databases" through a synchronous interface
(https://nodejs.org/api/sqlite.html); every `DatabaseSync.prototype.exec` /
`StatementSync.prototype.run` call blocks the calling thread until it
returns. Wrapping a call in a `Promise` does not move the write off the main
thread — it only defers *when* the same-thread blocking call happens, not
*where* it runs. There are two real shapes for keeping this blocking write
off the hot path.

**Queue + drain on `setImmediate`.** The hot path pushes a row (or a
reference to a dirty record) onto an in-memory array and returns immediately
— the caller gets its reply before the write happens. A `setImmediate`
callback, which "schedules the 'immediate' execution of `callback` after ...
the current poll phase completes" (https://nodejs.org/api/timers.html#setimmediatecallback-args),
drains the whole queue in one pass, wrapped in a single
`BEGIN IMMEDIATE ... COMMIT`. `BEGIN IMMEDIATE` "causes the database
connection to start a new write transaction ... and to take the write lock
immediately, without waiting for the transaction to make a change" — a
single writer process never contends for that lock, so this is mostly a
statement of intent rather than a functional fix, but it is cheap to use
consistently and fails fast rather than discovering a lock problem partway
through a transaction (https://sqlite.org/lang_transaction.html). This still
runs on the main thread, and the drain callback still blocks it for the
duration of the transaction — but that block happens after the reply for
whatever request queued the row already went out, and its duration is
bounded by how many rows accumulated in one tick, not by anything a caller
is waiting on.

**A `worker_threads` worker owning the connection.** The main thread
`postMessage`s each dirty row (or a batch) to a dedicated worker
(https://nodejs.org/api/worker_threads.html); the worker opens its own
sqlite connection and performs the synchronous writes on its own thread,
genuinely off the main thread rather than merely off the current tick. The
cost this trades in: every posted message goes through the structured clone
algorithm — a serialize-and-copy, not a shared reference
(https://nodejs.org/api/worker_threads.html, `port.postMessage()`) — plus
the operational complexity of a second thread with its own startup, error,
and shutdown lifecycle. The `setImmediate` shape pays neither cost: same
thread, same heap, zero serialization, in exchange for sharing the block
with the event loop.

**Commit cost under WAL.** Both shapes pay the same per-commit cost once the
transaction reaches sqlite, and that cost is set by `synchronous`, not by
which shape produced the transaction. `PRAGMA synchronous=NORMAL` syncs "at
the most critical moments," and in WAL mode specifically this means the sync
happens at checkpoint boundaries, not on every commit — "a transaction
committed in WAL mode with `synchronous=NORMAL` might roll back following a
power loss or system crash" even though the database stays uncorrupted
(https://sqlite.org/pragma.html#pragma_synchronous). `PRAGMA synchronous=FULL`
instead "ensure[s] that all content is safely written to the disk surface
prior to continuing" on every transaction commit, which in WAL mode means
every commit fsyncs the WAL file (same URL).

**Fit at this scale.** At ~150 records and a low write rate, the
queue+`setImmediate` shape is the one that fits Strategy 3. The block it
introduces is bounded by a batch that can never exceed the whole dataset,
and it happens after replies are already sent — the exact property Strategy
3 needs. A `worker_threads` connection buys genuine off-main-thread
execution, but pays for it with structured-clone serialization on every
message plus a second thread to operate, for a workload where the thing
being avoided — a same-thread commit of at most ~150 small rows — is already
cheap. The extra complexity is not justified at this scale; it would start
to earn its keep at a write volume or record count large enough that a
batch's commit duration itself became the bottleneck.

## 4. Hybrid snapshot + journal

Redis's current mechanism is a literal base-plus-incremental split: "the
original single AOF file is split into base file (at most one) and
incremental files... The base file represents an initial (RDB or AOF format)
snapshot of the data present when the AOF is rewritten. The incremental files
contain incremental changes since the last base AOF file was created"
(https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/).
This is what `aof-use-rdb-preamble` named in older Redis versions and what
the current multi-part-AOF mechanism does natively: a snapshot anchors
recovery, and only the incremental tail after it needs replaying.

The general pattern — snapshot (checkpoint) plus replay-from-checkpoint for
whatever happened after it — is exactly what sqlite's own WAL checkpoint
mechanism is: "moving transactions from the WAL file back into the database"
is the checkpoint (https://sqlite.org/wal.html), the main database file is
the base/snapshot, and the WAL is the incremental journal on top of it. By
default sqlite checkpoints "when the WAL file reaches a threshold size of
1000 pages" (~4MB) (same source), rolling the incremental log back into the
base automatically, with the threshold tunable via `wal_autocheckpoint`.

**Durability window.** Bounded by whatever the underlying journal component
guarantees (Strategy 2's analysis applies to the incremental part) — crash
vs. power loss splits the same way, governed by the same `synchronous` level
in effect. The advantage over a pure journal is recovery time, not the
durability window itself.

**Write cost on the hot path.** Same as whichever journal mechanism feeds it
— off the hot path if writes are batched/deferred (as in Strategy 3), on the
hot path if each mutation forces an immediate sync.

**Restore cost and correctness.** This is the strategy's actual payoff: only
the incremental entries since the last base need replaying, not the entire
history since day one. Ordering only needs to be correct within the
incremental tail. sqlite's own crash recovery is: "if an application crash,
or an operating-system crash, or even a power failure occurs in the middle of
a transaction, the partially written transaction should be automatically
rolled back the next time the database file is accessed"
(https://sqlite.org/howtocorrupt.html) — a fresh connection (including one of
the two offline readers) opening the file after a crash triggers this
automatically; nothing in the daemon has to detect or drive it.

**Complexity.** Highest to hand-build at the application level: it needs both
the full-dump logic of Strategy 1 *and* the incremental-log logic of
Strategy 2, plus the bookkeeping to know when to roll the base forward. But
this is precisely why hand-building it is the wrong call when sqlite is
already the storage format: WAL mode gives this for free at the engine
layer.

**Fit with sqlite.** This is not a fourth thing to build on top of sqlite —
it is what sqlite in WAL mode already *is* once Strategy 3's per-tick
transactions are the write pattern. Each ticked transaction is an
incremental entry; sqlite's own auto-checkpoint at 1000 pages is the base
roll-forward; `sqlite3_wal_checkpoint_v2()`'s PASSIVE/FULL/RESTART/TRUNCATE
modes are the operator-facing controls if a manual checkpoint on shutdown is
wanted (https://sqlite.org/wal.html). Checkpointing itself needs its own
sync: "checkpointing... requires sync operations in order to avoid the
possibility of database corruption following a power loss or hard reboot,"
and correspondingly, "in WAL mode, the only time that a failed sync operation
can cause database corruption is during a checkpoint operation"
(https://sqlite.org/wal.html and https://sqlite.org/howtocorrupt.html) — so
the one place this design must not skip a sync is the checkpoint itself, not
every individual commit.

## Runtime reads of sqlite: staleness vs read-your-writes

The original framing said the sqlite file is "never read at runtime." That
holds for the daemon's hot set, but not universally: a daemon can
legitimately query sqlite at runtime for cold or historical data it does not
keep resident in memory — run history, past events, expired or superseded
leases, anything append-only and rarely re-read. That is a third read path,
distinct from the two offline readers (`--offline` status, doctor), because
it can happen while the daemon is up and its writer connection may be
mid-cycle.

For Strategy 3 (dirty-set flush on a timer, the recommended strategy): between
ticks, a runtime read of sqlite sees the state as of the last completed
flush, not the current in-memory state — **stale-by-one-tick**, not
**read-your-writes**. A record the daemon changed since the last tick and
has not yet flushed is invisible to a query against the file, even though the
in-memory model already reflects it. Strategy 1 (full snapshot) has the same
shape, bounded by the snapshot interval instead of the tick interval.
Strategy 2 (append-only journal) and Strategy 4 (hybrid) answer according to
whatever has actually been committed to the journal/WAL at read time: under
an `always`-fsync-style policy that is effectively read-your-writes already,
since every write is flushed before the next one proceeds; under an
`everysec`/`no`-style batching policy it collapses to the same
stale-by-one-window answer as Strategy 3.

Two ways to give a runtime read read-your-writes consistency when it
actually needs it: (a) drain the write queue synchronously before doing the
read — force the pending batch to commit first, so the query sees it; or
(b) never read sqlite at all for anything the in-memory model already
holds — answer from memory, and reserve sqlite reads strictly for cold data
the memory model doesn't track.

(b) is the right default for this system's shape: the hot set lives fully in
memory, and the only things ever queried from sqlite at runtime are
cold/historical — by definition, data the daemon does not hold live. If a
record is cold enough to only exist in sqlite, it was written in a prior
flush already, so there is no pending-write staleness question for it in
practice. The staleness question only bites if the code tries to read
something it just wrote, in the same tick, before that tick's flush has run
— and the fix for that case is not (a)'s synchronous drain, it is simply not
reading sqlite for that value at all: read the in-memory model, which is
what (b) already does by construction. (a) only earns its cost for a
hypothetical read path that must query sqlite specifically and must not be
stale — a case this system's design does not create, because anything
queryable that way is either hot (so it lives in memory) or cold (so
one-tick staleness does not matter).

This is also what makes the offline readers, and any runtime cold-data
reader, safe to open the file concurrently with the daemon's writer
connection: a WAL reader "continue[s] to use the old snapshot ... until [it]
completes," entirely isolated from writes in progress, and "readers are not
blocked by a writer and a writer is not blocked by readers" — the two use
"different locks" (https://sqlite.org/wal.html). A cold-data query started
while the daemon's write-behind transaction is mid-flight sees a clean,
self-consistent snapshot as of its own start, never a half-written commit.

## Comparison

| Strategy | Durability window — crash | Durability window — power loss | Hot-path write cost | Restore cost / complexity |
|---|---|---|---|---|
| 1. Periodic full snapshot | Since last snapshot (same as power loss — no interim writes exist) | Since last snapshot | Off-path only with a true fork/thread handoff; on-path if dumped in-process | Trivial restore (load one file); building the off-path dump is the real cost |
| 2. Append-only journal | `always`: none. `everysec`/`no`: page-cache resident writes likely survive a mere crash | `always`: none. `everysec`: ≤1s. `no`: ≤~30s (kernel-tuned) | On-path unless a background fsync thread is built | Replay grows with journal length until compacted; highest build/maintain cost |
| 3. Dirty-set flush on a timer | Since last tick (same as power loss) | Since last tick | Off-path — dirty-set insert is O(1), sqlite write deferred to timer | Trivial (sqlite file is already durable); lowest complexity |
| 4. Hybrid snapshot + journal | Governed by the journal component feeding it | Governed by the journal component feeding it | Same as the journal component feeding it | Bounded replay (only since last checkpoint); highest complexity to hand-build, free if sqlite WAL is used as-is |

## Recommendation

For this target system — one Node writer, ~150 records across ~10 tables,
sub-millisecond in-memory ops, sqlite/drizzle already present, and two
readers that only ever open the file while the daemon is down — Strategy 3
(dirty-set flush on a timer) writing through sqlite in WAL mode with
`PRAGMA synchronous=NORMAL` is the right fit, and it is also what Strategy 4
collapses into for free: each tick's transaction is the incremental log
entry, and sqlite's own auto-checkpoint (default ~4MB / 1000 pages,
https://sqlite.org/wal.html) is the snapshot roll-forward, so nothing
hybrid needs to be hand-built. A full periodic snapshot (Strategy 1) buys
nothing extra at 150 rows — a full-table rewrite and a dirty-row upsert cost
about the same at this scale, so there is no reason to pay Strategy 1's
fork/thread complexity to get the same "since last write" durability window
Strategy 3 already has for free. A hand-rolled append-only journal
(Strategy 2) is the wrong layer to build it at: sqlite's WAL is already that
journal, with crash recovery sqlite drives itself on next open
(https://sqlite.org/howtocorrupt.html) — reimplementing it above sqlite only
adds a second, worse copy of the same mechanism. The real trade-off to name
in numbers: with `synchronous=NORMAL` in WAL mode the daemon can lose at most
the one in-flight ticked transaction on power loss while remaining
structurally uncorrupted ("WAL mode is always consistent with
synchronous=NORMAL," https://sqlite.org/pragma.html#pragma_synchronous) —
directly analogous to Redis's documented `everysec` bound of "at most one
second of writes"
(https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/),
except here the bound is one tick, not one second, and the flush interval is
a knob the daemon controls directly rather than an OS fsync scheduler. If
even a single ticked transaction of loss is unacceptable, move to
`synchronous=FULL` for that same design — an fsync per tick instead of per
checkpoint — which at ~150 rows and a low tick rate is cheap enough to not
need justifying further. Implemented, the flush belongs on a queue drained by
`setImmediate`, not a dedicated `worker_threads` connection — the batch is
small enough that a same-thread commit after the reply already went out beats
paying structured-clone serialization and a second thread's lifecycle for no
measurable gain. Any runtime read of sqlite should be limited to cold data
the in-memory model doesn't track; for everything the hot set holds, answer
from memory and never open the file, which sidesteps the stale-by-one-tick
question entirely rather than solving it with a synchronous drain.
