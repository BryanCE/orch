
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
