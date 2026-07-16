# Architecture Review — 2026-07-16

Full audit of the adapter/strategy patterns (agent harness × multiplexer), the openspec completion claims, and the file organization. Produced from five parallel code audits (specs, commands.ts routing, adapters+bridge, backends, setup+daemon); every finding is file:line cited against the tree as of commit `4311e5d`.

## Verdict in one paragraph

The **backend/plexer strategy pattern is real**: commands.ts and the daemon route pane operations through the `Backend` port with zero direct herdr/tmux CLI bypasses and zero `if (backend.id === "herdr")` branches. The **AgentAdapter pattern is a facade**: the interface exists, but the live system bypasses its methods on every write path and hardcodes the pi bridge protocol — at the daemon choke point, in the answer/result/pipe commands, and in the status view layer. Only pi is first-class; claude is launch+dispatch with coarse presence; codex is a shell that spawns and then runs blind. The openspec change promising all of this (`pluggable-plexer-backends`) was checked off 39/44 but its verification task (run the spec scenarios) is still open, it was never synced to main specs, and at least one of its scenarios contradicts its own design. Separately, the codebase has degenerated into monolith files — `commands.ts` at 3,250 lines and the bridge at 1,778 — which is the root enabler of the coupling: everything can reach everything, so everything does.

---

## 1. Support matrix today (spawn / see / steer / harvest)

| | herdr | tmux | headless |
|---|---|---|---|
| **pi** | full (HUD, toasts, inbox steer, results) | works; no HUD; fleet enumeration blind | works; no HUD |
| **claude** | spawn+dispatch ok; coarse hook presence; steer **silently lost in daemon**; no model/ask | same, plus tmux fleet blindness | spawn only; `claude -p` cannot be steered |
| **codex** | spawn+dispatch only — no presence, no steer, no results | spawn only — blind | spawn only — blind |

---

## 2. Findings, ranked by severity

### 2.1 The daemon hardcodes pi on every control write (worst single defect)

- `src/daemon/orchd.ts:25` imports `piAdapter` directly.
- `deliverBackend` (`orchd.ts:99-103`): every steer to a target with presence goes to `piAdapter.steer` regardless of the running adapter. Return ignored, always reports `true`.
- `setModel` (`orchd.ts:146-154`): unconditionally appends `{cmd:"model"}` to `inbox.jsonl` (pi bridge inbox). `caps.setModel` is never checked.
- Because dispatch-broker forces all writes through the daemon, `orch steer`, `orch model`, `orch broadcast`, `orch pipe`, and `review reject` are pi-only at the choke point. For a claude agent the steer writes an inbox file claude never reads and is **reported delivered while silently lost** — the broker built to centralize governance also centralized the pi coupling.
- Only `dispatch` (`orchd.ts:98`, `backend.deliver({kind:"run"})`) is adapter-agnostic.

### 2.2 AgentAdapter methods are dead code

Grep-verified: `adapter.detectState()`, `adapter.extractResult()`, `adapter.installShim()` are called **nowhere** in `src/` outside `src/adapters/`.

- `cmdResult` (`commands.ts:1080-1127`) and `cmdPipe` (`:1183`) read `result.json` / `parseSession` directly, bypassing `extractResult`.
- `cmdAnswer` (`commands.ts:814-832`) writes `answer.json` into the presence dir directly; never calls `adapter.answer()`; `caps.ask` is consulted nowhere in the file.
- **Bug** at `commands.ts:1149`: `if (!command && adapter.id !== "pi")` — (a) name-checks pi instead of gating on `caps.steer`; (b) when a non-pi adapter's `steer()` returns an `AdapterCommand`, the truthy return skips the fallback and **nothing executes the command**. Codex's `steer()` builds a real `codex resume` argv that is dropped on the floor.
- `installShim` is declared on the interface (`adapter.ts:119`) but no adapter implements it and nothing calls it.

### 2.3 Codex is a shell

- `src/adapters/codex.ts` (267 lines) contains real, unit-tested parsers (`detectState` :219, `extractResult` :252, resume-steer :234) that the running system never invokes.
- No presence writer exists for codex: setup installs integrations only for pi (`commands.ts:1676-1690`) and claude (`:1714`); nothing consumes codex's documented `agent-turn-complete` notify event (`codex.ts:14`).
- The headless backend redirects child stdout to a log file (`src/backends/headless/index.ts:191-198`) that no adapter parser ever reads.
- Net: codex agents spawn fine, then report nothing, cannot be steered, and their results are never harvested — in every backend.

### 2.4 Presence is two bespoke side-channels, not an adapter contract

Spec (`openspec/specs/agent-adapters/spec.md` L18) requires every adapter to surface state through the presence protocol uniformly. Reality:

- **pi** → `extensions/orchestrator-bridge.ts` (1,778 lines): rich per-tool/cost/context presence, inbox steer, ask/answer.
- **claude** → `scripts/claude-hooks.ts` settings.json shim (installed at `commands.ts:1553,1714`): SessionStart/Stop/Notification only — coarse, no mid-run state.
- **codex** → nothing.

Downstream pi assumptions this creates:

- `deriveView` (`commands.ts:112-129`): `isPi = ent.agent === "pi"`; only pi gets `parseSession()`; non-pi agents lose model/cost/task/last fallbacks and render `-`.
- `entities.ts:120`: presence-only entities hardcode `agent: "pi"` — any other adapter is mislabeled.
- `reset`/`reload`/`restart` (`commands.ts:2271-2358`) poll `status.json` refresh and send `/new`/`/reload`/`/quit` slash commands — pi bridge protocol, meaningless to claude/codex.
- `WORKER_PROMPT_HEADER` (`commands.ts:2166`) bakes the pi-only `orch_ask` tool name into every worker prompt.
- pi trust seeding: `TRUST_FILE`/`launchesPi`/`writeTrustEntry` (`commands.ts:1778-1795`) — correctly gated, but lives inline in the command monolith.
- `parseSpawnFlags` default `cmd: "pi"` (`commands.ts:1927`) — cosmetic (overridden by `adapterCommand`), but a smell.

### 2.5 The bridge is pi-only and half herdr-wired

- `extensions/orchestrator-bridge.ts` is a pi `ExtensionAPI` extension; `src/bridge-bundle.ts` bundles exactly one extension (`PI_EXTENSION_NAMES = ["orchestrator-bridge"]`). There is no claude or codex equivalent — "bundle correct code per combination" in practice means one pi bundle plus a claude hook file.
- Identity discipline is honored: the bridge never reads `HERDR_PANE_ID`; identity comes solely from opaque `ORCH_AGENT_KEY` (`:219,249,267`). This matches design D3.
- But the HUD/metadata half is herdr-hardwired (gated on `AGENT_IDENTITY?.backend === "herdr"`): raw JSON-RPC over `HERDR_SOCKET_PATH` (`:259,390`), `herdr notification show` shell-outs (`:355`), `herdr pane list`/`tab list` shell-outs (`:816`), `pi.events.on("herdr:blocked")` (`:614,1737`). tmux/headless pi agents get presence files but no HUD/toast equivalent exists behind the gate.

### 2.6 tmux backend is a runnable skeleton; auto-detection excludes it

- Implements the 11 required port methods with real tmux calls (`src/backends/tmux/index.ts:51-110`): spawn (`new-window` with `ORCH_AGENT_KEY` env), deliver, focus, sendKeys, close, list, identity from live session name.
- Omits the **entire optional surface**: no `inventory`, `groups`, `workspaces`, `read`, `waitAgentStatus`, `renameAgent`, `createGroup`. Every cockpit/fleet-visibility feature walks those and sees nothing — launch+steer works, **see does not**. `list()` (`:85-88`) returns every pane in every session, unfiltered to orch agents.
- `resolveBackend` (`src/backends/registry.ts:34-40`) probes herdr-inside-session then falls straight to headless — `tmux.isInsideSession()` is never consulted. A user inside tmux silently gets the headless backend unless config says otherwise.
- `validateBackend` (`registry.ts:27-32`) checks only `isAvailable()` (binary on PATH), not `isInsideSession()` — `backend = tmux` validates outside any tmux session and fails later at spawn (`tmux/index.ts:52`).

By contrast: **herdr** implements the full ~30-method surface; **headless** is a legitimately well-built backend (identity-first spawn, append-only registry, triple-guarded close, injectable liveness for tests — `headless/index.ts:160-230`).

### 2.7 Onboarding asks the right questions, then ignores the answers

- Credit: the wizard genuinely asks adapter (pi/codex/claude) and backend (herdr/headless/tmux) and writes both to `[defaults]` in config.toml (`commands.ts:1638-1644`, `config.ts:404`). Config is consumed by `resolveBackend`/`resolveAdapter` — not dead.
- Prereq loop (`commands.ts:1653-1658`) probes ALL of `bun, plexer, pi, claude` regardless of selection — a claude+tmux user is told `pi MISSING` and offered a pi install.
- `DEP_INSTALLERS` (`commands.ts:1457-1462`): the `plexer` entry points at placeholder `https://example.invalid/install.sh` and the id doesn't match the actual backend name `herdr`.
- Doctor never reads `defaults.adapter`/`defaults.backend` to tailor checks: hard-requires pi (`doctor.ts:100-112`), always runs claude-hooks check (`:296`), pi-only extension check (`:527`), no tmux health check. Only `checkBackendCapabilities` (`:159`) is genuinely backend-generic.
- The notifier wizard (`src/setup/notifiers.ts:27-85`) is **dead code** — written, tested, never called from `cmdSetup`; setup writes zero `[[notify]]` entries.
- Config schema is a single global `defaults.adapter` + `defaults.backend` (`config.ts:16-25`); no per-host backend, no per-agent default map.

### 2.8 Spec hygiene: the completion claim was self-certified

- The "any agent × any plexer independently, no hardcoded cross-branches" requirements live **only** in `openspec/changes/pluggable-plexer-backends/specs/` (agent-adapters L5,L15-17,L64-73; fleet-backends L5). The change was **never synced or archived** — main specs still describe the two-backend herdr world (`openspec/specs/fleet-backends/spec.md` L7 names only herdr+headless; `dispatch-broker/spec.md` L13 still says "the daemon performs the herdr send").
- `tasks.md`: 39 [x], 3 [~], 2 [ ]. **Task 8.2 — actually running the OpenSpec scenarios against the implementation — is unchecked.** The checked boxes were never behavior-verified.
- One scenario would fail if run: `plexer-identity/spec.md` L17-20 asserts a nested presence path `~/.orch/agents/tmux/main/%5/` that design D3 (L54-58) explicitly forbids and `src/backends/identity.ts:70-74` correctly does not produce. The spec contradicts its own design.
- Task 6.4 [~]: tmux ownership/cross-session wall partial. Task 3.3 [~]: the bridge extension itself has no tests. Task 8.1 [~]: full suite never verified green on an idle machine.
- Stray: `openspec/changes/unify-workspace-policy/` is an empty leftover dir (real one is archived).

### 2.9 What is genuinely clean (keep, don't churn)

- Backend port design (`src/backends/backend.ts:137-190`): required-vs-optional split, callers gate on method presence not backend id.
- `identity.ts` (`:28-93`): flat `<backend>~<workspace>~<handle>` key, percent-escaped, single parsing boundary, no plexer leakage.
- `backendTarget()` per-target resolution (`commands.ts:1770-1776`) and `resolveBackend()` for fleet ops — the correct two-way split, used consistently.
- Daemon plumbing outside `deliverBackend`/`setModel`: rpc/outbox/lifecycle/configwatch/events are backend-neutral; no `herdr` strings, no `HERDR_` env reads in any daemon file.
- `notify.ts` sink-provider registration; `entities.ts` port usage (`allBackends()`, `backend.inventory()`), aside from the legacy `herdrStatus` field name (`entities.ts:17,104,122` — populated generically; should be `backendStatus`).
- `check:bridge` static boundary check (`scripts/check-bridge.ts`) exists and is wired in package.json.
- Headless backend implementation quality (see 2.6).

---

## 3. NEW GOAL — file reorganization (monolith teardown)

**Rule: no file over ~500-700 lines, and that ceiling only where cohesion genuinely demands it. Pure, testable functions. Organized by domain/function.** Current offenders:

| file | lines | over budget |
|---|---|---|
| `src/commands.ts` | 3,250 | ~5-6× |
| `extensions/orchestrator-bridge.ts` | 1,778 | ~3× |
| `src/doctor.ts` | 875 | ~1.5× |
| `src/notify.ts` | 702 | at the line |
| `src/daemon/rpc.ts` | 549 | borderline |

Everything else is already ≤430 lines.

The monolith is not just ugly — it is **why the coupling happened**. `commands.ts` holds CLI parsing, view derivation, presence I/O, steering logic, setup/install, dep management, pi trust seeding, spawn settings, worker prompts, and lifecycle polling in one namespace, so every concern reached into every other. The split is by domain:

### 3.1 `src/commands.ts` → `src/commands/` (one domain per file, each well under budget)

- `commands/status.ts` — status/view: `deriveView`, table rendering (fix the `isPi` branch on the way through: view fallbacks come from the adapter, not a name check).
- `commands/spawn.ts` — spawn/tile: flags parsing, `resolveSpawnSettings`, `adapterCommand`, worker prompts.
- `commands/control.ts` — steer/model/answer/broadcast/pipe: routed through `AgentAdapter` caps + returned `AdapterCommand` execution (fixes 2.2).
- `commands/lifecycle.ts` — new/reset/reload/restart/close/abort: liveness protocol delegated to the adapter, not hardcoded status.json polling.
- `commands/panes.ts` — focus/zoom/move/rename/peek/keys/tabs/ws: pure Backend-port geometry verbs (already clean, just relocated).
- `commands/results.ts` — result/pipe/questions harvest via `adapter.extractResult`.
- `commands/setup.ts` — the wizard flow, keyed off configured adapter+backend; dep table fixed (2.7); notifier wizard wired in or deleted.
- `commands/target.ts` — `resolveTarget`, `backendTarget`, identity plumbing shared by the above.
- `commands/index.ts` — dispatch table only: argv → command fn. No business logic.
- pi trust seeding (`TRUST_FILE`/`writeTrustEntry`) moves into `src/adapters/pi.ts` where it belongs — it is pi launch behavior, not command logic.

### 3.2 `extensions/orchestrator-bridge.ts` → `extensions/bridge/` modules

- `bridge/presence.ts` — presence dir writes, status/result/inbox (backend-neutral core).
- `bridge/tools.ts` — `orch_*` tool + command registration.
- `bridge/herdr-hud.ts` — everything currently gated on `backend === "herdr"` (socket RPC, toasts, pane state, `herdr:blocked`). Gives future tmux/headless HUD strategies an obvious slot.
- `bridge/daemon-ack.ts` — orchd socket acks.
- Bundling already produces a single output file, so the split costs nothing at runtime (`bun build` handles the graph).

### 3.3 `src/doctor.ts` → `src/doctor/` — one check-group per file (bins, backends, extensions, hooks, daemon, presence), a runner that composes them, and checks selected by configured adapter+backend instead of the fixed list.

### 3.4 `src/notify.ts` → split sink builtins (`desktop`, `webhook`, `command`) from the router/registry.

### 3.5 Purity/testability rules for the reorg

- Command modules take resolved, narrowed inputs (adapter, backend, entity) — no re-parsing config or re-resolving targets inside leaf functions (caller owns the gate).
- I/O at the edges: presence file reads/writes live in `store.ts`/adapter modules; command fns compose them.
- Every new module gets direct unit tests; the WSL suite already proves the pattern (backends and headless are tested via injectable liveness/killers — copy that style).
- No compat shims, no re-exports from the old paths: move, fix callers, delete.

---

## 4. Pattern framework — the multi-level stack (see `docs/reference/design-patterns.md`, the recorded reference)

This is an **a × b multi-level build**, and the architecture is a layered composition — Strategy *on top of* the structural patterns, not instead of them. The full researched stack, now durably recorded in `docs/reference/design-patterns.md` (the original research report was never committed; only a five-line summary survived in design.md):

- **L0 Hexagonal** — core owns the two ports (`AgentAdapter`, `Backend`); infrastructure depends inward; core never imports a concrete provider or touches its wire format.
- **L1 Bridge** — agent × plexer as independently varying hierarchies; no pair classes, ever (kills the N×M explosion).
- **L2 Adapter (GoF)** — one per foreign tool; each adapter *owns its tool's entire wire surface* (pi's inbox files, claude's hooks, codex's notify events, herdr's socket, tmux's argv).
- **L3 Strategy + capability negotiation** — inside each axis, varying behaviors are declared strategies selected by capability flags (LSP/terraform-provider style): steer = inbox|keys|resume|none, ask/setModel, panes/focusable/canSendKeys. Callers branch on caps, never on identity.
- **L4 Provider Model (Registry + Factory + Builder)** — config-driven `resolveBackend`/`resolveAdapter`; setup is the Builder that assembles the chosen pair by asking each provider to install its own integration (`installShim`).
- **L5 Facade/Context** — one control-plane dispatcher, the sole invoker of adapter strategies.
- **L6 Enforcement** — static checks on every boundary; the plexer axis proved patterns only hold where a check holds them.

The failure, in that vocabulary: **the stack was executed for one leg of the Bridge.** D2 ("the backend port is the identity and control authority") had migration gates and got enforced — hence the clean plexer axis. **No D2-equivalent was ever written for the agent axis**, so nothing forced orchd/commands through the AgentAdapter port. L2 broken (pi's wire format leaked across core), L3 ignored (caps never consulted; id-checks instead), L4 half-done (installShim dead, setup branches on harness), L5 never built (no dispatcher — orchd hardcodes piAdapter), L6 absent on the agent side (`check:bridge` guards the axis wall, not the port boundary, so `import piAdapter` in core passes). Per-level conformance table: `docs/reference/design-patterns.md`.

The remedy is the mirror openspec change (working name `adapter-control-authority`), with the missing decisions:

- **D2′ — the adapter port is the control authority for agent-directed messages.** One control dispatcher in core: `resolveAdapter → caps gate → port method → execute returned AdapterCommand`, backend `deliver` fallback per caps, loud exit-1 on absent capability. Deletes orchd's `piAdapter` import and every direct control write.
- **D3′ — pi's file protocol is pi-adapter-internal.** `inbox.jsonl`/`answer.json` I/O lives only in `src/adapters/pi.ts`.
- **D6′ — extend `check:bridge` with a port-boundary check.** Core (outside `src/adapters/`, `src/backends/`) may not import concrete adapter/backend modules nor contain adapter-internal file literals. CI-gated — the plexer axis proved the pattern only holds where a static check holds it.
- **Provider Model on install.** `cmdSetup`/doctor branches on harness die; setup calls `resolveAdapter(config).installShim()` — each adapter installs its own integration (pi: bridge bundle; claude: hooks; codex: the missing `agent-turn-complete` notify shim). Doctor derives its checks from the resolved adapter+backend.
- Migration gates like D2/D6 had, and the openspec scenarios actually run this time (the skipped 8.2 gate is what allowed the false "done").

## 5. Fix list in dependency order

1. **orchd `deliverBackend`/`setModel`** (`orchd.ts:82-154`): resolve the target's adapter; execute returned `AdapterCommand` or fall back to `backend.deliver` per `caps.steer`; check `caps.setModel` and fail loudly (exit 1, per the spec's degraded-mode rule) instead of silently dropping. Un-breaks steer/model/broadcast/pipe for every non-pi adapter.
2. **commands.ts:1149 + answer/result/pipe**: execute adapter commands; gate on caps not `id !== "pi"`; route through `adapter.answer`/`extractResult`.
3. **Codex presence writer**: notify-hook shim on `agent-turn-complete`, or headless pipes output through `adapter.detectState`/`extractResult` (parsers exist and are tested).
4. **tmux**: implement `inventory`/`groups`/`read`/`waitAgentStatus`; add tmux to `resolveBackend` auto-probe; `validateBackend` checks `isInsideSession()` for session-scoped backends.
5. **setup/doctor**: prereqs and checks keyed off configured adapter+backend; fix `plexer` installer id/URL; wire or delete notifier wizard.
6. **De-pi the view layer**: `herdrStatus`→`backendStatus`; kill `isPi` in `deriveView` via adapter-provided session parsing; stop hardcoding `agent:"pi"` (`entities.ts:120`); adapter-aware `WORKER_PROMPT_HEADER`.
7. **File reorg (§3)** — best done interleaved: each behavioral fix above lands in its new home rather than patching the monolith first and moving second.
8. **`settings.json` replaces `config.toml`** (JSON, never TOML — user decision, final): user-facing `$ORCH_DIR/settings.json`, written by setup via whole-file JSON round-trip, hand-editable, `schemaVersion`-stamped, validated loudly on every load; delete the hand-rolled TOML parser, the `Bun.TOML` probe, `writeDefaultEntry` text surgery, and the legacy `ssh` alias (Rule 8: no migration — old config.toml is malformed data). `orch doctor` verifies declared settings vs reality (backend available/inside-session, adapter on PATH + shim current, live fleet pairs); `orch settings` prints effective values with provenance (flag > env > settings.json > default). configWatch retargets settings.json.
9. **Spec hygiene**: run the scenarios (task 8.2), fix the contradictory nested-path scenario, sync + archive `pluggable-plexer-backends`, delete empty `unify-workspace-policy` dir, sync main specs to the delta language.

Definition of done stays Rule 5: `bun run check` clean + `bun test` passing, plus the openspec scenarios actually executed this time.
