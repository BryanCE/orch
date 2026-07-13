# Tasks: add-orchd-minimal

## 1. Lifecycle core

- [x] 1.1 `src/daemon/lifecycle.ts`: O_EXCL lock with pid+code-hash, dead-lock reclaim (dead pid + unanswering socket), daemonized start (detached spawn) and `--fg`, re-exec reload; unit tests with temp ORCH_DIR
- [x] 1.2 `orch daemon start|stop|status [--json]|reload` wired in `src/commands.ts` + help/golden; smoke green *(2026-07-13: includes minimal `src/daemon/orchd.ts` entrypoint — lock → RPC server with daemon-status/reload; boot-captured codeHash; answer-based socket probe so kill -9 reclaim works)*

## 2. Socket RPC

- [x] 2.1 `src/daemon/rpc.ts`: ndjson JSON-RPC server on `$ORCH_DIR/orchd.sock` (loopback-TCP + port-file fallback), client half shared by CLI; methods daemon-status, fleet-status, subscribe-events, enqueue; tests over a real socket in temp dir
- [x] 2.2 Doctor checks: orchd running/absent/stale-code; socket answerable; lock consistency *(2026-07-13: presence/staleness/lock/socket checks + stale-lock `--fix`; absence is informational per daemon-optional spec)*

## 3. Resident subsystems (reuse, don't reimplement)

- [x] 3.1 Extract `orch work` engine to accept injected stop-signal/interval; daemon runs it continuously; CLI `orch work` unchanged standalone *(2026-07-13: `src/work.ts` runWorkLoop; work-race green unmodified; daemon-status gains subsystems.workLoop)*
- [x] 3.2 presenceWatch→events→notify pipeline in-daemon (sink delivery per notifications spec incl. outcome-first titles); `orch events` prefers daemon subscription, falls back to file watch on dead socket with one notice
- [x] 3.3 configWatch: hot-reload config.toml (last-good on parse failure) for sinks/defaults/max_retries — carried from superseded add-live-reload *(2026-07-13: `src/daemon/configwatch.ts` + tests; daemon composition rides with 3.2)*
- [x] 3.4 Extension staleness (carried): bridge records `extensionHash` in status.json; doctor compares vs disk *(2026-07-13: bridge hashes itself with an inlined helper — the src/ import broke through the ~/.pi symlink, see 3.8 in make-orch-general-purpose; doctor names stale panes + restart hints)*; `orch status` stale marker still open (deferred — commands.ts contention)

## 4. Verify live on this machine

- [ ] 4.1 Daemon up: blocked agent toasts with NO orch events process running; queued task assigned with NO orch work running
- [ ] 4.2 `orch daemon reload` after editing src/ → status shows new hash; kill -9 the daemon → next `orch daemon start` reclaims lock; stop daemon mid-`orch events` → CLI falls back without losing transitions
