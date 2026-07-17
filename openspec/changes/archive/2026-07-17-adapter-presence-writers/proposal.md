## Why

The `AgentAdapter` port declares presence writers, session parsing, and `installShim()`, but only pi is wired end to end. Codex's `detectState`/`extractResult` parsers are unit-tested dead code, nothing consumes its documented `agent-turn-complete` notify event, and a spawned codex agent reports nothing, in every backend. Claude has coarse hook presence but its shim install lives inline in `commands.ts` instead of behind the port. And the view/presence layer still hardcodes pi: `deriveView` branches on `ent.agent === "pi"`, presence-only entities are labeled `agent:"pi"` regardless of the real adapter, the `Entity.herdrStatus` field name lies about being herdr-specific, and the worker prompt bakes pi's `orch_ask` tool into every launch. Until each adapter owns its wire surface and the view reads adapter-declared capabilities, "any agent × any plexer" stays fiction and the next adapter inherits the coupling.

## What Changes

- **Codex presence writer.** Add a codex notify shim, invoked on `agent-turn-complete`, that writes `status.json`/`result.json` using the existing (currently dead) `CodexAdapter.detectState`/`extractResult` parsers. Wire those same parsers into the live session-tail path so headless/detached codex output is parsed through the adapter instead of landing in an unread log.
- **`installShim()` made real on the port.** Give every adapter a concrete `installShim()`: pi builds and links its bridge bundle, claude installs the `settings.json` hooks (relocating `installClaudeHooks` logic out of `commands.ts` and behind the port), codex installs the notify shim. Each is idempotent and additive — re-running never removes another provider's integration or the user's unrelated config (law #5). Because codex's `notify` is a single-program key (not an additive array), the codex integration prefers a per-spawn notify mechanism where available and, when falling back to global config, writes only into an empty key and refuses to overwrite a pre-existing foreign `notify` value (warns + reports the gap).
- **De-pi the view/presence layer.** Replace `deriveView`'s `isPi` special-casing (`commands.ts:112-129`) with adapter-provided session parsing, gated on `caps.sessionTail`. Stop hardcoding `agent:"pi"` for presence-only entities (`entities.ts:120`) — the agent comes from the presence record. Rename `herdrStatus` → `backendStatus` everywhere (`entities.ts:17,104,122` and its `commands.ts` consumers). Make `WORKER_PROMPT_HEADER` (`commands.ts:2170`) adapter-aware at both composition sites — the `orch run` dispatch (`commands.ts:2172`) and the `orch work` work-loop assignment (`work.ts:~60`) — so `orch_ask` is only referenced for adapters that declare `caps.ask`, resolved from the target agent's adapter rather than a fixed default.
- **Claude presence fidelity.** Spec the coarse hook granularity honestly (state is start/stop/notification only, no mid-run transitions) and ensure result extraction through the transcript works via the port.
- Callers branch on capabilities, never on adapter id (law #3); an unsupported capability fails loudly, never silently no-ops.

## Capabilities

### New Capabilities
<!-- none: this change fills gaps in an existing capability rather than adding a new one -->

### Modified Capabilities
- `agent-adapters`: adds the requirement that each adapter installs its own integration via `installShim()` (idempotent + additive); adds the codex presence-writer requirement (notify shim + adapter-parsed session tail); tightens the uniform-presence requirement so the view layer derives session/state data from the resolved adapter (gated on `caps.sessionTail`) and the agent label from the presence record rather than a hardcoded `pi`; makes the worker prompt reference `orch_ask` only for `caps.ask` adapters; states the claude hook granularity honestly.

## Impact

- **Code:** `src/adapters/codex.ts` (notify-driven state/result, session-tail parsing), `src/adapters/claude.ts` + relocated `installClaudeHooks` logic, `src/adapters/pi.ts` (`installShim`), `src/adapters/adapter.ts` (session-parse port method if introduced), new `scripts/codex-notify.ts` bundle + `build:notify` script, `src/backends/backend.ts` + `src/backends/headless/index.ts` (record the captured log path — new `log` field on `BackendRegistryRecord` and a `status.json` mirror — so headless harvest has a deterministic input), `src/work.ts` (adapter-aware header at the work-loop composition site), `src/commands.ts` (`deriveView`, `WORKER_PROMPT_HEADER`, `herdrStatus` consumers), `src/entities.ts` (`backendStatus` rename, agent from presence).
- **Contracts preserved:** the presence-dir file protocol under `$ORCH_DIR/agents/<key>/` and `PRESENCE_SCHEMA` are unchanged; new writers stamp the same schema. Runtime stays node-safe — the codex shim probes the user's runtime exactly as `installClaudeHooks` already does; no `Bun.*` calls.
- **Tests/golden:** `test/golden/status*.json` update for the `backendStatus` field rename; new adapter unit tests for the codex notify shim and session-tail parsing.

## Non-goals (deferred by name)

- The control dispatcher and answer/result-command routing (`orch steer`/`model`/`answer`/`result`/`pipe` through the port) — **adapter-control-authority**.
- `orch setup`/`doctor` *calling* `installShim()` and deriving checks from the resolved pair — **provider-driven-setup-doctor**. This change only *provides* the `installShim()` implementations on the port.
- Splitting `commands.ts`/the bridge into per-domain files — **monolith-file-breakdown**. Fixes land in the current files here.
- tmux fleet-visibility surface and `settings.json`-replaces-`config.toml` — tracked elsewhere.
