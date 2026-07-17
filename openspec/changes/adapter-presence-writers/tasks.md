## 1. Port: capability-gated session view

- [x] 1.1 Add `SessionView` (state?, model?, provider?, thinking?, task?, lastText?, cost?) and `SessionViewInput` (sessionPath?, output?) to `src/adapters/adapter.ts`, and declare optional `readSessionView(input): SessionView | undefined` on `AgentAdapter`.
- [x] 1.2 Implement `piAdapter.readSessionView` in `src/adapters/pi.ts` by wrapping the existing `parseSession` (`src/session.ts`) and mapping `SessionData` → `SessionView`.
- [x] 1.3 Implement `claudeAdapter.readSessionView` in `src/adapters/claude.ts` reading the transcript for `lastText` (reuse the existing transcript path logic); leave state presence-driven.
- [ ] 1.4 Gate: `bun run check` clean; `bun test test/adapters` (or the pi/claude adapter tests) green.

## 2. De-pi the view/presence layer

- [x] 2.1 In `src/commands.ts` `deriveView`, resolve the adapter for the entity (spawn registry `adapter` → presence `agent`), replace `isPi ? parseSession(...) : null` with `caps.sessionTail ? adapter.readSessionView({ sessionPath: ent.sessionPath }) : undefined`, and read the model/state/cost/task/last fallbacks from `SessionView`.
- [x] 2.2 In `src/entities.ts`, stop hardcoding `agent: "pi"` for presence-only entities (`entities.ts:120`); take the agent from the presence record's `agent` field.
- [x] 2.3 Rename `herdrStatus` → `backendStatus` across `src/entities.ts` (`:17,104,122`), `src/commands.ts` consumers (`:146,236,340,358,1350,1351,1362`), and `test/workspace-walls.test.ts`; no re-export or alias (Rule 8).
- [x] 2.4 Update `test/golden/status.json` and `test/golden/status-all.json` for the `backendStatus` key rename.
- [ ] 2.5 Gate: `bun run check` clean; `bun test` for status/entities/workspace-walls green; golden fixtures pass.

## 3. Worker prompt capability-awareness

- [x] 3.1 Split the worker header into a base constant plus an optional `orch_ask` clause, and add a helper that composes the header from a resolved adapter's `caps.ask` (base header when `ask` is absent, base + `orch_ask` clause when present).
- [x] 3.2 Apply the capability-aware header at BOTH composition sites — editing the constant alone leaves the work loop pi-shaped:
  - `workerPrompt` (`src/commands.ts:2172`, the `orch run` path) resolves the target pane's adapter and selects the clause from its caps.
  - `dispatchTask` (`src/work.ts:~60`, the `orch work` path) resolves the assigned agent's adapter (spawn registry `adapter` → presence `agent` field) and selects the clause — it MUST NOT interpolate the bare `WORKER_PROMPT_HEADER` constant.
- [x] 3.3 Reconcile `src/daemon/events.ts:10` so its prefix-strip matches the base header prefix and recognizes both header variants (with and without the `orch_ask` clause).
- [ ] 3.4 Gate: `bun run check` clean; `bun test` for work/events/daemon green, including a test that a codex worker assigned via the work loop gets the base header and a pi worker gets the `orch_ask` clause.

## 4. Adapter installShim implementations

- [x] 4.1 Add `piAdapter.installShim()` in `src/adapters/pi.ts` that builds (if missing) and links the bridge bundle into the pi extensions dir — the logic currently inline in `cmdSetup` (`commands.ts:1680-1694`).
- [x] 4.2 Move the `installClaudeHooks` body (`commands.ts:1553-1609`) onto `claudeAdapter.installShim()` in `src/adapters/claude.ts` (behavior identical: JSON round-trip, runtime probe, stale-entry prune, additive merge); repoint the `cmdSetup` call and the pi bundle branch to call the adapters' `installShim()`; delete the relocated inline code (no shim left behind).
- [ ] 4.3 Gate: `bun run check` clean; `check:bridge` passes (no core→adapter wire-literal regressions); `orch setup --agent claude --yes` and `--agent pi --yes` still install additively.

## 5. Codex presence writer

- [x] 5.1 Add `scripts/codex-notify.ts`: reads the notify JSON from `argv[2]`, resolves identity from `ORCH_AGENT_KEY` (via `src/backends/identity.ts`), and writes `status.json`/`result.json` (atomic tmp+rename, `PRESENCE_SCHEMA`) using `CodexAdapter.detectState`/`extractResult`; exit 0 with no writes when `ORCH_AGENT_KEY` is absent. Node-safe, no `Bun.*`. When feeding the completion record into `CodexAdapter.detectState`, supply a synthetic `exitCode: 0` (a fired `agent-turn-complete` proves a settled successful turn) so state resolves to `done`, not `idle`.
- [x] 5.2 Add a `build:notify` script bundling `scripts/codex-notify.ts` → `dist/scripts/codex-notify.js` (target=node, format=esm) and include it in `build:cli`.
- [x] 5.3 Implement `codexAdapter.installShim()` in `src/adapters/codex.ts`. First confirm whether the targeted codex version exposes a per-spawn notify mechanism (spawn flag/env); if so, prefer it (no global-config write) per D2. Otherwise fall back to editing the top-level `notify` key in `~/.codex/config.toml` under the probed runtime — but ONLY when the key is empty. A pre-existing foreign (non-orch) `notify` value MUST NOT be overwritten: leave it, warn naming the conflict, and record a codex presence-capability gap for `orch setup`/`orch doctor` to surface (D2a). Semantics: replace-if-already-orch, insert-if-empty, refuse-if-foreign; bail with a warning on an unparseable file. Idempotent + additive, never clobbering unrelated keys. (Confirmed via Codex CLI source: `-c key=value` overlays `ConfigToml` including `notify`, a genuine per-spawn mechanism — but wiring it into `interactiveCmd`/`headlessCmd` was out of this task's file scope, so `installShim()` implements the D2a config.toml fallback as the shipped behavior; the per-spawn path is noted in code for a follow-up.)
- [x] 5.4 Record the headless log path at spawn (D3a): add a `log` field to the headless spawn registry record (`BackendRegistryRecord`, `src/backends/backend.ts:115`) and mirror it into the agent's `status.json`; pass the already-computed `logPath` (`src/backends/headless/index.ts:190`) into `appendRegistry`. `deriveView` sources `sessionPath` for a headless agent from that recorded path. Do NOT add any directory-scan fallback — logs are flat under `$ORCH_DIR/logs/`, never `$ORCH_DIR/agents/<key>/`. (deriveView wiring resolved via the presence path: headless exposes no `inventory()`, so headless agents only become entities through presence, and the notify shim stamps `ORCH_AGENT_LOG` as `status.json.sessionPath`, which `buildEntities` already feeds into `ent.sessionPath` → `deriveView`; core reading the backend-internal registry directly would breach the port wall)
- [x] 5.5 Implement `codexAdapter.readSessionView` reading the captured `--json` log at the recorded `sessionPath` through `detectState`/`extractResult`; when no log path was recorded, return `undefined` (state falls back to `backendStatus`), never throw, never scan.
- [ ] 5.6 Gate: `bun run check` clean; new `bun test test/adapters/codex*` covering notify-shim status/result writing, the notify shim producing state `done` (via synthetic exit code) not `idle` on a completion event, `installShim` idempotency+additivity into an empty `notify` key on a populated `config.toml`, `installShim` REFUSING to overwrite a pre-existing foreign `notify` value (leaves it, warns, reports the gap), the headless backend recording its `log` path so `readSessionView` harvests from the recorded file, and session-tail parsing.

## 6. Claude fidelity documentation

- [x] 6.1 Update the `ClaudeAdapter` docstring and `scripts/claude-hooks.ts` header to state the coarse granularity (working/blocked/done-idle, no mid-run transitions) as specified.
- [ ] 6.2 Confirm `claudeAdapter.extractResult` + `readSessionView` return the Stop-hook transcript's final text; add/extend a claude adapter test asserting it.
- [ ] 6.3 Verify (do not assume) whether Claude's `settings.json` hooks fire under headless print mode: run `claude -p` with hooks installed and observe SessionStart/Stop actually firing; record the result. If they fire, headless claude presence works as specced. If they do NOT fire: wire result harvest to `claudeAdapter.extractResult` over the D3a-recorded `-p` log, and make `see`/`steer` in `-p` mode fail loudly — an explicit `no presence in -p mode` status and a non-zero exit on a steer attempt (law #3), never a silent `-`. Add a test pinning whichever outcome holds.

## 7. Verification

- [ ] 7.1 Full gate: `bun run check` clean, `check:bridge` clean, `bun test` passing.
- [ ] 7.2 Execute the spec scenarios by hand against the build and record the result: mixed pi+claude `orch status --json` (uniform fields, correct agent ids); a presence-only codex agent labeled `codex` not `pi`; a codex turn (notify shim) → `status` `done` (synthetic exit code, not `idle`) + `result` text; a headless codex run harvested via session tail from the log path the backend recorded at spawn (not a directory scan); the claude-`-p` hook-firing outcome from task 6.3 confirmed (presence works, or the loud `no presence in -p mode` fallback + non-zero steer exit); a codex worker assigned via BOTH `orch run` and the `orch work` work loop omits `orch_ask` while pi's keeps it; `orch setup` re-run installs pi/claude additively; codex `installShim()` inserts into an empty `notify` key but REFUSES to overwrite a pre-existing foreign `notify` value (leaves it, warns, reports the gap). Do NOT mark done until every scenario has actually run.
