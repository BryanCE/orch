## 1. Adapter registry (composition root)

- [x] 1.1 Add `src/adapters/registry.ts` mirroring `src/backends/registry.ts`: import `piAdapter`/`codexAdapter`/`claudeAdapter`, export `resolveAdapter(id)` and `allAdapters()`; this file is the sole legal importer of concrete adapters.
- [x] 1.2 Repoint `src/commands.ts` to import `resolveAdapter` from `src/adapters/registry.ts`; delete the inline `adapters` array and `resolveAdapter` (no re-export left behind, per Rule 8).
- [ ] 1.3 Verify: `bun run check` clean; `bun test test/adapters` (or the adapter/registry tests) green.

## 2. Contain pi's wire format in the pi adapter

- [x] 2.1 Move the `inbox.jsonl` append and `answer.json` write out of `src/store.ts` (`steerPresence`/`writeAnswer`) into `src/adapters/pi.ts`; keep the protocol-neutral presence-dir path helper in `store.ts`.
- [x] 2.2 Give the pi adapter a model-write path so the pi `{cmd:"model"}` inbox line is produced only inside `src/adapters/pi.ts`.
- [x] 2.3 Delete the now-unused store writers and fix every caller; grep confirms `inbox.jsonl` and `answer.json` appear only in `src/adapters/pi.ts`.
- [ ] 2.4 Verify: `bun test` on the pi adapter and store tests green; pi steer/answer/model still write the same files as before.

## 3. Control dispatcher (L5), daemon-side

- [x] 3.1 Add `src/control/dispatch.ts` exporting `deliverControl(target, action)` for `steer | model`, invoked only inside the daemon process: resolve the target's adapter (from presence `status.agent` / spawn-registry record) and backend (per-target, not current defaults), gate on `adapter.caps`, invoke the port method. No CLI code path imports or calls `deliverControl`.
- [x] 3.2 Execute a returned `AdapterCommand` itself, daemon-side, via `node:child_process` `execFile` — run `argv[0]` with `argv.slice(1)` non-interactively, pipe `stdin` when present, under a bounded timeout, and capture the exit code (node-safe per Rule 6; no `Bun.*`, no `DeliverPayload` `exec` kind). This is a machine-local invocation, so codex resume-steer works identically on every backend (herdr/tmux/headless). On `caps.steer === "keys"` with no command, fall back to `backend.deliver({kind:"message"})` and print the degraded-mechanism warning; when that `deliver` returns `false` (e.g. a headless backend that cannot send keys), fail fast with exit 1 instead of warning-and-succeeding.
- [x] 3.3 Fail fast (exit 1, actionable message naming target + adapter + action) when the capability is absent (`steer: none`, `caps.setModel === false`), the executed `AdapterCommand` spawn-fails / exits nonzero, or the keys-fallback `backend.deliver` returns `false`; a discarded, failed, or undelivered steer is never a silent no-op or false success.
- [ ] 3.4 Add unit tests for `deliverControl`: pi inbox path, claude keys fallback (deliver true → warn+exit 0; deliver false → exit 1), codex `execFile` command execution (exit 0 → success), unsupported-capability exit 1, nonzero-exit / discarded-command-is-failure.

## 4. Route the daemon through the dispatcher

- [x] 4.1 In `src/daemon/orchd.ts`: delete `import piAdapter` (line ~25); rewrite `deliverBackend` steer branch (lines ~99-103) to call `deliverControl`.
- [x] 4.2 Rewrite `setModel` (lines ~146-154) to route the model action through `deliverControl` gated on `caps.setModel`; remove the direct `inbox.jsonl` append.
- [ ] 4.3 Verify: `bun test` on the daemon/outbox tests green; a claude/codex steer through the daemon no longer reports false success.

## 5. Route the command layer: brokered verbs over the socket, reads local

- [x] 5.1 Fix `src/commands.ts` `cmdSteer` (line ~1149): delete the presence-only in-CLI `adapter.steer` branch and its `adapter.id !== "pi"` check entirely; route the presence-only case through `writeRpc("steer", …)` to orchd, exactly like the pane branch, so the daemon's dispatcher applies the effect and executes any returned command. No `deliverControl` call in the CLI.
- [x] 5.2 Route `cmdAnswer` (lines ~814-832) through `adapter.answer` directly (a read/local write, not a brokered verb) instead of writing `answer.json` directly; the pi adapter performs the file write. Gate on `caps.ask`: when the target's adapter declares `ask` false, exit 1 naming the adapter and that it cannot answer blocking questions, and write no answer file.
- [ ] 5.3 Route `cmdResult` (lines ~1080-1127) and `cmdPipe` (line ~1183) result extraction through `adapter.extractResult` instead of reading `result.json`/`parseSession` directly; `cmdPipe`'s steer leg to the destination continues to `writeRpc("steer", …)`.
- [x] 5.4 Route `cmdBroadcast` through `writeRpc("steer", …)` per target so mixed fleets steer correctly through the daemon's dispatcher.
- [ ] 5.5 Verify: `bun test` on the affected command tests green.

## 6. De-pi the lifecycle verbs (reset/reload/restart)

- [x] 6.1 Give the pi adapter a declared lifecycle capability: move pi's `/new`, `/reload`, `/quit` strings into `src/adapters/pi.ts` behind a `caps`-level lifecycle declaration plus adapter method(s) returning the per-verb `AdapterCommand`/delivery text; those slash-command strings appear in no other module.
- [x] 6.2 Rewrite the reset/reload/restart bodies (`cmdNew`, `cmdReload`, `cmdRestart` and the `doReload`/`doHardRestart` helpers, `src/commands.ts:2210-2410`) to resolve the target's adapter, gate on the declared lifecycle capability, and obtain the delivery text/command from the adapter — deleting the hardcoded `/new`/`/reload`/`/quit` sends and any `adapter.id` branching; keep the protocol-neutral readiness polling (status.json advance, pid refresh, shell-seen) in core.
- [x] 6.3 Fail fast (exit 1, actionable message naming target + adapter + verb) when the adapter declares no lifecycle mechanism for the requested verb; never deliver a meaningless keystroke to a foreign agent.
- [ ] 6.4 Verify: `bun test` on the lifecycle tests green; `orch reset` on a pi agent still clears via `/new` and reports ready, with `/new` produced only inside the pi adapter.

## 7. Port-boundary static check (L6)

- [ ] 7.1 Extend `scripts/check-bridge.ts` with a core-scope pass (`src/**` excluding `src/adapters/**`, `src/backends/**`, and the two registry files) that fails on: concrete adapter/backend imports, `adapter.id`/`backend.id` equality branches, and any adapter wire literal from the single exhaustive set defined in the check script — pi's `inbox.jsonl`/`answer.json`, codex's notify event names (`agent-turn-complete` and its siblings), and claude's hook identifiers/paths (`SessionStart`/`Stop`/`Notification` hook-event names, the `claude-hooks` script path). Keep the list in one place so a new adapter's literal is a one-line addition.
- [ ] 7.2 Wire the boundary check into `bun run check` and the CI gate.
- [ ] 7.3 Verify: `bun run check:bridge` exits 0 on the finished tree; a deliberately reintroduced `import piAdapter` (or an `agent-turn-complete` literal) in core makes it exit nonzero.

## 8. Verification gates

- [ ] 8.1 `bun run check` clean (oxlint + tsc + fallow) and `bun run check:bridge` green.
- [ ] 8.2 `bun test` green on the full suite (or at minimum the adapter, store, daemon, and command test files touched here).
- [ ] 8.3 Execute every scenario in `specs/control-dispatch/spec.md` (including the lifecycle scenarios), `specs/port-boundary-guard/spec.md`, `specs/agent-adapters/spec.md`, and `specs/dispatch-broker/spec.md` against the built CLI and record the observed outcome for each — the change is not done until these have actually been run (the skipped-verification gate is how "built" was falsely claimed last time).
