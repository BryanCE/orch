# Tasks: add-live-reload

## 1. Config hot-reload

- [x] 1.1 `watchConfig(orchDir, onChange)` in `src/config.ts`: fs.watch + 250ms debounce + 5s stat-poll fallback (DrvFs); last-good semantics on parse failure with a single warning; unit tests with a temp config file (valid edit applies, invalid edit keeps last-good)
- [x] 1.2 Wire into `orch events` (re-build sink list on change, stderr notice "config reloaded") and `orch work` (re-read defaults + max_retries between iterations); also watch `$ORCH_DIR/reload.signal`

## 2. Fleet reload command

- [x] 2.1 Extend the existing reload path in `src/commands.ts`: after pane `/reload`s, touch `$ORCH_DIR/reload.signal`; report per-item outcome-first (RELOADED/FAILED per pane, SIGNALED for watchers)
- [x] 2.2 Help text + golden update; smoke stays green

## 3. Staleness detection

- [x] 3.1 Bridge records `extensionHash` (short content sha of its own source) in status.json at load (schema-additive; both extensions)
- [x] 3.2 Doctor check `staleExtensions`: per live pane compare status.json hash vs on-disk hash; failure message includes the exact `orch reload <pane>` fix; tests with temp fixtures
- [x] 3.3 `orch status` appends stale marker to STATE for hash-mismatched panes; golden/smoke updated

## 4. Verify live

- [x] 4.1 End-to-end on this machine: edit config.toml under a running `orch events --notify` → new sink fires; run `orch setup` then `orch reload --all` → doctor reports zero stale panes
