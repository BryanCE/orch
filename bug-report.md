
## 2026-08-06 — stale empty `orchd.lock` makes `daemon start` lie "started" while the process exits "already running"

- **Sequence:** Prior crash left an EMPTY `~/.orch/orchd.lock`. `orch daemon start` printed `started (pid N)` but the spawned process logged `already running` and exited; `orch daemon status` said `not running`. Loop repeats forever — 8 "already running" lines in orchd.log.
- **Expected:** Start should validate the lock (empty or dead-pid lock = stale, remove and proceed) and report the real outcome instead of claiming started.
- **Fix applied:** `rm ~/.orch/orchd.lock orchd.sock orchd.port`, then start → running.
- **Impact:** High — daemon is unstartable via the CLI until the lock is hand-deleted, and `start`'s output actively misleads.
- **Root cause:** `canReclaim` (`src/daemon/lifecycle.ts`) bailed on `!record`, so an
  UNREADABLE lock — the one case with no owner to protect — was the one case orch
  would never reclaim. A parseable lock naming a dead pid reclaimed fine.
- **Code fix:**
  - `canReclaim` now guards on `record && processIdentityMatches(record)`; an unreadable
    lock is reclaimable, still vetoed by a socket that answers.
  - `doctor`'s `orchd-lock` check offers a removal fix for an unreadable lock too, so
    `orch doctor -y` self-heals it instead of reporting an unfixable `fail`.
  - `orch daemon start` no longer prints `started` when orchd never answered; it dies
    pointing at `orchd.log`.
  - `bun run build:cli` runs `scripts/retire-daemon.ts` first: every build stops the
    daemon whose code it is about to replace and clears its lock/socket/port.
  - `orchd.lock`/`.sock`/`.port`/`.log` now have one definition site,
    `src/daemon/runtime-files.ts`.

## 2026-08-06 — orchd dies silently ~1s after start, logs nothing

- **Sequence:** After the stale-lock cleanup, `orch daemon start` → `started (pid 356916)`; `orch daemon status` 1s later → `running (pid 356916, uptime 1s, hash c4313d4ee948, unix, tcp://127.0.0.1:3716)`. Seconds later the pid is gone, `status` says `not running`, no orchd process exists, nothing listens on 3716, and lock/sock/port files are gone. `orchd.log` contains ONLY repeated `already running` lines — zero crash output, zero startup output from the instance that died.
- **Also:** `orch daemon start --foreground` does not run in foreground — it returned `started (pid 357452)` immediately, so the flag is ignored or silently unknown. No way to capture the crash on stderr through the CLI.
- **Expected:** orchd logs its own startup + fatal error to orchd.log; a crash within seconds should leave a traceback. `--foreground` (or an equivalent) should exist for exactly this diagnosis and unknown flags should error.
- **Impact:** High — daemon cannot stay up on this machine right now and there is no diagnostic path through the CLI. Fleet spawns tile panes but every dispatch path is dead (`orch spawn` ends with "daemon absent", exit 1).
- **State when stopped:** panes wE:p7D/wE:p7E (payroll-1/-2) are open and registered but launched daemonless; no dispatches sent.
- **Read of the evidence:** lock/sock/port were all GONE, which only `shutDown()` does —
  so orchd exited CLEANLY on a signal, it did not crash. The likeliest sender is orch
  itself: `ensureDaemon` gives a daemon 200ms + 1s to answer, then SIGTERMs it as
  "wedged". A busy daemon that misses that 1.2s window is killed by the next CLI
  command, silently. Unproven — the logging below is what will name the killer.
- **Code fix:**
  - orchd now logs its own lifecycle to `orchd.log`: `started pid/hash/transport`,
    `shutting down on SIGTERM|SIGINT`, `stopped pid`, and `exiting: another orchd owns
    <dir>` in place of the bare `already running`.
  - orchd installs `uncaughtException` / `unhandledRejection` handlers that log a full
    traceback before exiting, plus a nonzero-exit-code line.
  - The CLI announces a kill: `orchd pid N holds the lock but did not answer; stopping
    it` on stderr, from the one `terminateWedgedDaemon` both `ensureDaemon` and
    `daemon start` now use.
  - `--foreground` is accepted alongside `--fg`, and `orch daemon <action>` now REJECTS
    unknown flags instead of ignoring them.
  - `--fg` actually stays in the foreground: `runForeground` resolves the child's exit
    code and `daemon start` awaits it, so orchd's stderr reaches the terminal.






    ===================================NW FROM OTHER REPO===============
    # Orch integration feedback

Observed from an OMP parent session dispatching two Pi panes on 2026-08-18.

## 1. Add a real orch-to-parent push bridge

`orch events` already receives daemon transitions, but OMP can only keep that stream in a managed process. Events are not injected into the parent conversation, so the parent still needs `hub wait` or `hub logs` to discover state changes. `orch questions` and `orch result` have the same problem.

Provide one session-scoped subscription, filtered to pane names owned by that parent, which pushes notices for:

- `asking`: include the question and a reply handle
- `blocked`: include the blocking reason
- `error`: include the error and recent relevant output
- `done`: include the final result, not just the state transition

The subscription should deduplicate transitions, survive later dispatches to the same panes, clean itself up with the parent session, and never emit events from panes owned by another session. OMP's native background jobs already auto-inject completion notices; orch should integrate with the same broker mechanism.

A useful interface would be either `orch subscribe <targets...> --sink <omp-session>` or a harness-level `orch_watch` tool. `orch dispatch --notify-parent` could create/reuse that subscription automatically. This removes status polling, a separately managed `orch events` process, `orch questions`, and the final `orch result` call.

## 2. Distinguish dispatch acceptance from agent completion

Running `orch dispatch` through an async OMP command produces a completion notice as soon as orch accepts the prompt. That notice says only `Dispatched to <pane>` and can look like the delegated task completed.

Return a durable dispatch ID and explicit phase, for example `accepted`, while the push bridge later reports `working`, `asking`, and `done`. The `done` event should carry the result for that exact dispatch ID so results cannot be confused after pane reuse.

## 3. Do not return spawn failure after panes were successfully created

This command created and registered both requested panes, then exited with code 1 because a later orchd health check timed out:

```text
orch spawn 2 --name snapshot-recon --model openai-codex/gpt-5.6-luna:high
...
Spawned 2 named agent(s) on tab "snapshot-recon"
...
orchd pid 80144 did not answer within 2000ms
Command exited with code 1
```

That is dangerous for automation: a caller may retry and create duplicate panes even though spawn succeeded. Make spawn atomic from the caller's perspective, or return success with a structured warning once every requested pane is created and registered. JSON output should expose separate fields such as `created`, `registered`, and `daemonHealthWarning`.

## 4. Make model identifiers discoverable and consistent

The documented/provider-style model ID was rejected:

```text
openrouter/openai/gpt-5.6-luna is not in models.allowed.pi
```

The accepted model was:

```text
openai-codex/gpt-5.6-luna:high
```

The error did list allowed base models, which helped, but callers still have to retry and then run `orch status --json` to verify the effective model. Prefer one canonical model vocabulary across docs, settings, and CLI. At minimum, add `orch models --json` and make a rejected spawn emit a paste-ready corrected spec including supported thinking levels.

## 5. Collapse the normal integration sequence

The current parent workflow is:

1. spawn
2. status/model verification
3. dispatch
4. start and manage `orch events`
5. separately check questions
6. consume the transition
7. fetch the result
8. close the watcher and panes

A durable `spawn/dispatch + automatic parent subscription` path should reduce that to dispatch and receive pushed result/question notices. Keep the lower-level commands for interactive debugging, but do not require every coding-agent parent to rebuild orchestration plumbing.

## 6. Deduplicate daemon transition events

One `working` → `done` transition for `snapshot-recon-2` was emitted repeatedly by `orch events` for more than 30 seconds. The payload was effectively identical except for timestamps and occasional cost changes; more than twenty `done` events arrived for the same pane and task.

Emit each state transition once. A stable event ID or `(pane, dispatchId, oldState, newState, transitionSequence)` identity would let downstream bridges enforce idempotency as a second line of defense. Repeated terminal events would otherwise spam the proposed parent push bridge and trigger duplicate result collection.

At the same checkpoint, `orch status --json` reported `state: \"done\"` while `backendStatus` was still `\"working\"` for that pane. Terminal state should not be published until the backend is actually terminal, or the fields need explicit names/documentation that make the distinction actionable.

## 7. Display logical agent identities, not backend routing IDs

Human-facing send and steer output currently exposes transport-specific targets such as:

```text
orch_send
sent to herdr~wF~v4gh24w0af
```

That identifier is useful to the multiplexer implementation, not to the operator. The operator knows the agent by its logical name and only needs enough runtime context to distinguish harnesses or multiplexers.

Render a stable logical identity such as:

```text
sent to pi/herdr: snapshot-recon-1
```

The exact labels should come from structured runtime metadata rather than parsing or hardcoding Herdr IDs. Use the same presentation for dispatch, send, steer, answer, results, events, and questions.

Keep the interface implementation-neutral:

- primary display fields: logical agent name, harness/adapter, and multiplexer/backend;
- optional verbose/debug fields: pane ID, workspace ID, transport key, and raw backend address;
- JSON fields should remain separate, for example `recipient.name`, `recipient.harness`, `recipient.multiplexer`, and `recipient.transportId`;
- moving a pane, changing workspaces, or replacing the multiplexer must not change the human-facing agent identity;
- when no explicit name exists, generate a stable logical name instead of falling back to a raw pane or transport ID.

This separation lets orch change pane layouts, workspace IDs, multiplexers, and transport implementations without leaking those details into normal agent-facing output.

