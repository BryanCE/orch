# Logging and diagnosis — one logger, structured, correlated

**Status: DECIDED. This is the implementation contract.**

## The problem

orch has no logger. It has three unrelated habits that together *look* like logging:

1. **`logLifecycle`** (`src/daemon/orchd.ts:369`) appends one line to `$ORCH_DIR/orchd.log`
   for exactly three events: start, stop, death. Nothing else ever calls it.
2. **stdio redirection.** `startDaemon` spawns orchd detached with stdout+stderr pointed at
   that same file (`src/daemon/lifecycle.ts:304`). So a line lands in `orchd.log` only if
   some code happened to call `process.stderr.write` — **66 such sites in `src/`** — or if
   something threw and the runtime printed a stack.
3. **`process.stdout.write`** — **262 sites** — is CLI *output*, correctly, but it is the
   same mechanism, so "what the user reads" and "what gets recorded" are not separable.

Measured 2026-08-29 on a live machine: a whole working session of eight agents, dozens of
dispatches, several daemon restarts and two bridge disconnections produced a log whose only
non-lifecycle content was four stack traces and two `run … failed` lines.

What is missing, concretely:

| absent | consequence |
|---|---|
| levels | cannot turn detail up when diagnosing, or down in normal use |
| structured fields | nothing is greppable by agent id, dispatch id, or verb |
| a correlation id | a dispatch cannot be followed CLI → daemon → outbox → bridge → ack |
| any CLI-side log | half the system writes nothing anywhere, ever |
| rotation | `orchd.log` grows unboundedly; `retention.logs_days` prunes the **plexer's** logs (`src/daemon/retention.ts:68-77`), never orch's own |
| a decision trail | lease grants/refusals, boundary answers and retries leave no record |

This also violates the standing TypeScript rule already applied to this repo: *"Prefer
structured logger diagnostics with enough context to debug from an id. No `console.log` in
shipped code."* (`console.*` is indeed 0 in `src/` — but only because the same content went
to `process.stderr.write` instead.)

## Decision

**One logger, owned by orch, used by every layer, emitting structured records with a
correlation id — and it is a diagnosis channel, never the user-output channel.**

### 1. Output and logging are different things and never share a call

`process.stdout.write` stays exactly what it is: **what the human asked to see**. It is not
logging and must never be routed through the logger. Conversely the logger never writes to
stdout in the CLI. The 262 stdout sites are not in scope for conversion; the 66 stderr sites
are, because every one of them is a diagnosis line wearing an output hat.

### 2. One record shape

```ts
interface LogRecord {
  readonly at: number;                 // epoch millis (Rule 11 — never TEXT)
  readonly level: "error" | "warn" | "info" | "debug" | "trace";
  readonly event: string;              // stable dotted name: "dispatch.delivered"
  readonly correlationId?: string;     // the dispatch id, or the RPC request id
  readonly agentId?: string;           // orch's minted id — never a plexer coordinate
  readonly fields?: Readonly<Record<string, string | number | boolean | null>>;
}
```

`event` is a **stable name**, not a sentence. The human-readable rendering is produced from
the record at read time, so a message can be reworded without breaking anything that greps.

`agentId` is the minted id and nothing else. Per `01-agent-model.md`, a plexer handle is
environment and goes in `fields`, never in the identity slot.

### 3. Correlation is the point

Every dispatch already mints a dispatch id and `orch status --json` already echoes it. That
id becomes the `correlationId` on every record the dispatch touches — CLI accept, RPC call,
outbox row, delivery attempt, retry, bridge ack, terminal state. **One `grep <dispatchId>`
must produce the whole life of that dispatch.** That is the single test of whether this
work succeeded.

RPC requests that are not dispatches use their request id. Nothing is logged without one
where one exists.

### 4. Levels, and what belongs at each

- **error** — an operation failed and the caller was told. Always includes the real error
  text, per `07-port-seam.md` ("Provider adapters preserve the real command, exit status,
  stderr and stdout in the thrown error").
- **warn** — degraded but proceeding: a retry, a reconnect, a stale record reaped.
- **info** — state changes worth reconstructing after the fact: daemon lifecycle, spawn,
  dispatch accepted/delivered, lease taken/released/expired, agent terminal state.
- **debug** — the decision trail: which role the boundary resolved, why a lease was refused,
  which candidate a target resolved to.
- **trace** — wire level: RPC frames, inbox/ack lines.

Default `info`. Configurable in `settings.json` (`logging.level`) and overridable per run by
an env var, so a user reproducing a bug can raise it without editing settings.

### 5. Sinks, rotation, retention

The logger writes JSONL to `$ORCH_DIR/orchd.log` (daemon) and `$ORCH_DIR/orch.log` (CLI), one
record per line. JSONL because these records are queried, not read top to bottom.

Rotation is orch's own and belongs to the same retention sweep that already exists:
`retention.logs_days` currently prunes only plexer logs (`retention.ts:68-77`) — it must
prune orch's own logs too, with a size cap as well as an age cap. A daemon that has run for
a month must not have a gigabyte log.

Redirecting the daemon's raw stdio to the log file **stops**. Anything orchd genuinely writes
to stderr is a bug to convert into a log call; an uncaught throw is caught at the top level
and logged as a record.

### 6. It is not a second event stream

`orch events` is the push stream of agent state transitions and stays exactly as it is. The
log is for diagnosis and is read from disk. They must not become two answers to one question:
a state transition is published to the event stream and logged at `info`; nothing else in the
log is duplicated onto the stream.

## Slices

1. **The logger.** One module, the record shape above, JSONL sink, level from settings + env.
   Test the record shape and level filtering. No callers converted yet.
2. **Daemon lifecycle and errors.** Replace `logLifecycle` and the top-level error handlers;
   stop redirecting orchd's raw stdio into the log file; catch-and-log at the top level.
3. **Correlation through a dispatch.** Thread the dispatch id from CLI accept to bridge ack.
   The acceptance test is literally `grep <dispatchId> orchd.log` returning the full path.
4. **The 66 `process.stderr.write` sites.** Convert each to a log call at the right level.
   Any that is genuinely user-facing output moves to stdout instead — decide per site.
5. **Decision trail at `debug`.** Lease grant/refusal with liveness, boundary answers with
   their reason, retry attempts with their backoff.
6. **Rotation and retention.** Age + size cap on orch's own logs, inside the existing sweep.
7. **`orch logs`.** Read the JSONL back with filters (`--since`, `--level`, `--agent`,
   `--dispatch`) and a readable rendering. A log nobody can query is a log nobody reads.
