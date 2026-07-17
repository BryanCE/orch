# Tasks: restricted-command-locks

## 1. Settings + matcher

- [ ] 1.1 Add optional `locked_commands: string[]` to the settings schema in `src/config.ts` and the normalized consumer type (always-present, `[]` when omitted). DO NOT touch `SETTINGS_SCHEMA` — pre-publish (0.1.0) it stays `1`; add the field to the one live schema and fix every writer/reader/test in the same change (no version bump, no legacy acceptance).
- [ ] 1.2 Add the whitespace-normalized token-boundary prefix matcher (`matchesLockedCommand`) as a pure function; `"bun test"` matches `bun test x` and never `bun tester`.
- [ ] 1.3 Schema + matcher tests: list loads, boundary matching, omitted list disables the feature.

## 2. Lock primitives (`src/cmd-lock.ts`)

- [ ] 2.1 Machine-wide single lock under `$ORCH_DIR`: atomic `O_EXCL` create, holder record `{ pid, key?, command, acquiredAt }`, release, and stale-holder reclaim on dead pid (D2). Node-safe, injectable liveness for tests.
- [ ] 2.2 Waiting acquire with bounded backoff and a loud timeout error naming the current holder (D6).
- [ ] 2.3 `test/cmd-lock.test.ts`: mutual exclusion (second acquirer waits), dead-holder reclaim, release-on-failure, holder record contents.

## 3. CLI verbs (`src/commands/lock.ts` + routing)

- [ ] 3.1 `orch lock run -- <argv>`: acquire → exec → release on ANY exit, propagating the exit code (D3).
- [ ] 3.2 `orch lock check -- <argv>`: exit 0 free-or-unlocked, exit 3 locked-and-held (D3).
- [ ] 3.3 `orch lock status` (holder pid/key/command/age) and `orch lock release --force` naming the evicted holder.
- [ ] 3.4 Routing line in `src/commands/index.ts` + help text; CLI tests for the exit-code contract.

## 4. Enforcement leg (capability-gated)

- [ ] 4.1 Pi bridge extension: intercept bash tool invocations, match against `locked_commands`, transparently wrap matched runs in acquire/release (waiting, D6). If the extension API exposes no pre-tool seam, report that finding — do not hack around it.
- [ ] 4.2 Surface the enforcement capability per adapter through setup/doctor gap reporting for adapters without a seam (codex; claude until a PreToolUse leg exists). Capability-gated — no adapter-id branch in core.
- [ ] 4.3 Test: bridge wrap behavior with a stubbed lock (matched command waits for and releases the lock; unmatched command untouched).

## 5. Worker prompt clause

- [ ] 5.1 When `locked_commands` is non-empty, compose the clause naming the locked commands and the `orch lock run` form, through the existing capability-aware header (D5); absent list = no clause.
- [ ] 5.2 Extend the worker-prompt tests for both states.

## 6. Verification (deferred until the tree-wide gate is allowed)

- [ ] 6.1 `bun run check` clean, `bun run check:bridge` green, `bun test` green.
- [ ] 6.2 Execute the spec scenarios: two concurrent `orch lock run -- bun test` serialize; `lock check` exits 3 while held; dead-holder reclaim; pi bridge serializes an uncooperative agent; worker header lists the user's locked commands; `locked_commands` written into the live `~/.orch/settings.json` (`["bun test", "bun run check"]` per the user's machine).
