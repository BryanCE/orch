# Files and data layout

This document describes orch's on-disk state under `$ORCH_DIR` (default: `~/.orch`).
SQLite table ownership, schema handling, and retention behavior are covered in
[`store.md`](store.md); this page lists the paths and the boundary between durable rows and
file-based protocols.

```
$ORCH_DIR/                     # default: ~/.orch
├── orch.db                    # SQLite (WAL): all brokered tables
├── orch.db-wal                # SQLite write-ahead log (transient)
├── orch.db-shm                # SQLite shared memory (transient)
├── settings.json              # user configuration, including retention (JSON)
├── reload.signal              # touch signal for config/extension reload watchers
├── cmd-lock.json              # command lock holder; present only while held
├── orchd.sock                 # daemon Unix RPC endpoint (or marker)
├── orchd.port                 # loopback TCP port when TCP transport is used
├── orchd.token                # owner-readable loopback RPC credential
├── orchd.lock                 # daemon single-instance lock
├── orchd.log                  # detached daemon stdout/stderr and lifecycle log
├── logs/                      # detached headless-agent output
│   └── <key>-<timestamp>.log
└── agents/                    # file-based presence and agent IPC
    └── <key>/                 # one flat serialized identity key
        ├── status.json        # agent identity, liveness, state and run facts
        ├── result.json        # settled-turn result
        ├── inbox.jsonl        # orchestrator-to-agent control lines
        ├── answer.json        # reply to an agent question
        ├── question.json      # agent-to-orchestrator blocking question
        ├── ack.jsonl          # delivery markers for control lines
        └── control.json       # outcome of a model/thinking control command
```

## Durable state

`orch.db` is the single SQLite store (schema stamp `STORE_SCHEMA = 5`). It contains the
queue, ownership, outbox, spawned registry, session identities, catalogues, durable event
stream, and dispatch runs. The spawn registry is the `spawned` table;
`$ORCH_DIR/spawned.jsonl` is not used. Model catalogue cache entries are in the `catalogues`
table; `$ORCH_DIR/model-catalogues.json` is not used. See [`store.md`](store.md) for the
table map and row semantics.

SQLite runs in WAL mode, so `orch.db-wal` and `orch.db-shm` may appear beside the database
while it is open. They are transient: stop the daemon before copying or restoring the store,
and copy `orch.db` alone.

The `events` table makes the daemon event sequence durable across a daemon restart, subject
to event retention. The `runs` table records one row per dispatch, including outcome and
usage counters. `orch runs` reads that history. If an agent's presence directory has been
reaped, `orch result` can read the latest matching run row instead when addressed by its
canonical key.

## Presence and daemon files

Presence directories are disposable live-agent records. Every valid record has the current
presence schema stamp and uses the flat `<backend>~<workspace>~<handle>` key (each segment
percent-escapes reserved characters). Losing `agents/<key>/` loses the last observed
presence/result files, not queued work, event history, or run history.

The daemon owns `orchd.lock`, `orchd.sock`, `orchd.port`, and `orchd.token` while running;
its detached output remains in `orchd.log`. Headless agents write their redirected output
under `logs/`. `cmd-lock.json` is the separate machine-wide heavy-command lock and is removed
when that command releases the lock.

Retention is configured by the `retention` object in `settings.json`: settled queue
`queue_days` (14), events `events_days` (7), completed runs `runs_days` (30), delivered
outbox `outbox_days` (7), and session identities `identities_days` (7). The daemon sweeps
those row classes hourly; ownership, spawned, and catalogue rows have no retention key
and are removed only by their explicit operations. See [`store.md`](store.md) for details.

Agent-CLI extensions and harness settings live outside `$ORCH_DIR` in the user harness
configuration directories; setup records the selected roots in `settings.json`.
