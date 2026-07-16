## Context

orch is an a × b system: agent harnesses (pi, claude, codex) × multiplexers (herdr, tmux, headless). The design-pattern stack (`docs/reference/design-patterns.md`) requires a single control-plane dispatcher (L5) as the sole invoker of adapter control strategies, wire formats contained inside each adapter (L2), capability-negotiated behavior (L3), and static enforcement of the boundaries (L6). The plexer axis has all of this and stayed clean; the agent axis got the port interface but no dispatcher, no containment, and no port-boundary check — so it rotted:

- `src/daemon/orchd.ts:25` imports `piAdapter`; `deliverBackend` (`:99-103`) calls `piAdapter.steer` for any target with presence, ignores the return, and always reports success; `setModel` (`:146-154`) appends `{cmd:"model"}` to `inbox.jsonl` unconditionally, never checking `caps.setModel`.
- `commands.ts:1149` branches `if (!command && adapter.id !== "pi")` — name-checks pi instead of gating on `caps.steer`, and when a non-pi adapter's `steer()` returns an `AdapterCommand`, the truthy return skips the fallback and **nothing executes the command** (codex's `codex resume` argv is dropped).
- `cmdAnswer` (`commands.ts:829`) writes `answer.json` directly; `cmdResult` (`:1080-1127`) and `cmdPipe` (`:1183`) read `result.json`/`parseSession` directly — `adapter.answer`/`adapter.extractResult` are never called.
- `src/store.ts:182-188` (`steerPresence`/`writeAnswer`) writes `inbox.jsonl`/`answer.json` from core — pi's wire format lives outside the pi adapter.

`AdapterCommand` (argv + optional stdin) and the `caps` block (`steer: inbox|keys|resume|none`, `ask`, `setModel`, `sessionTail`) already exist on the port (`src/adapters/adapter.ts`). pi declares `steer:"inbox"`, claude `steer:"keys"`, codex `steer:"resume"`. The dispatcher is the missing piece that turns those declarations into correct behavior.

Constraints: node-safe runtime only, no `Bun.*` (Rule 6); one schema, no back-compat shims or migration (Rule 8); files ≤500-700 lines, single-responsibility verb names (Rule 4 / repo coding principles); the presence-dir file protocol stays the language-neutral truth channel; `orch close --all` reaping and herdr-at-the-process-boundary invariants are untouched.

## Goals / Non-Goals

**Goals:**
- One dispatcher module, running inside the daemon, that is the only code that invokes `adapter.steer` and decides steer/model routing. Brokered control commands reach it over the orchd socket; the CLI never invokes it directly.
- The dispatcher executes the `AdapterCommand` a port method returns itself, daemon-side, via `node:child_process` (not through a backend port method), falls back to `backend.deliver({kind:"message"})` when `caps.steer === "keys"`, and exits 1 with an actionable message when the capability is absent or the command exits nonzero.
- pi's `inbox.jsonl`/`answer.json` I/O lives only in `src/adapters/pi.ts`; those literal filenames appear in exactly one module.
- A static check fails the build when core (outside `src/adapters/`, `src/backends/`) imports a concrete adapter/backend module, contains an adapter wire literal, or contains an adapter/backend id-equality branch.
- pi behavior is byte-for-byte unchanged from the user's point of view.

**Non-Goals:**
- Writing codex/claude presence writers (`adapter-presence-writers`), provider-driven setup/doctor (`provider-driven-setup-doctor`), `settings.json` (`settings-json-config`), tmux completion (`tmux-backend-completion`), or the monolith file split (`monolith-file-breakdown`). The dispatcher lands as a standalone module so the later split adopts it without rework.
- Changing the presence-dir protocol, the outbox/governance flow, or the `orch model` wait/ack contract (`fleet-steering` is unchanged; the dispatcher is the mechanism under it).
- Adding a `steer` strategy for a capability no adapter declares yet.

## Decisions

### D1 — One dispatcher module, invoked daemon-side; brokered commands reach it over the orchd socket

`src/control/dispatch.ts` exports `deliverControl(target, action)` where `action` is one of `steer | model` carrying its text/model. (`answer` is not brokered — see D3/D5 and the control-dispatch spec: `orch answer` calls `adapter.answer` directly in the CLI, gated in-CLI on `caps.ask` so an adapter with `ask:false` exits 1 and writes no answer file; the `result`/`pipe` extraction reads are likewise direct.) **It runs inside the daemon process only** — the daemon's RPC handlers (`steer`, `set-model`, and the outbox `deliverBackend` steer path) are the sole callers, after `governWrite` has passed. The CLI never invokes `deliverControl`: a brokered command (`orch steer`, `orch model`, and the steer legs of `orch broadcast`/`orch pipe`, plus `orch dispatch`/`orch run`) reaches the dispatcher only by `writeRpc` to orchd, so governance and single-choke-point routing are never bypassed (this is why the change's own `dispatch-broker` spec forbids a direct CLI→backend path). `deliverControl`:
1. Resolves the target's adapter (from the presence `status.agent` / spawn-registry record) and the target's backend (from the identity/registry — `backendTarget()`-style per-target resolution, never current defaults, per L4b).
2. Gates on `adapter.caps` for the action.
3. Invokes the port method (`adapter.steer` for a steer action; the adapter's model mechanism for a model action), and if it returns an `AdapterCommand`, **executes that argv itself, daemon-side, via `node:child_process` `execFile`** — spawning `argv[0]` with `argv.slice(1)` non-interactively, writing `stdin` to the child's standard input when present, under a bounded timeout, and capturing the exit code. A nonzero exit (or spawn failure) means the steer FAILED: the dispatcher reports the failure loudly and does not record success. It does **not** hand the argv to `backend.deliver` — see rationale below.
4. Falls back to `backend.deliver(handle, {kind:"message", text})` when `caps.steer === "keys"` and the port returns no command — and treats a `false` return from that `deliver` (e.g. a headless backend with `canSendKeys:false`, whose `deliver` is unconditionally `false`) as a failed steer: exit 1 naming the target and the undelivered keystroke, never warn-and-succeed.
5. Exits 1 with a message naming the target, the adapter, and the missing capability when the capability is `none`/unsupported — never a silent no-op (agent-adapters degraded-mode rule).

Rationale (single invoker): L5 requires a single context object as the sole invoker so the Strategy/Bridge structure holds. Alternatives rejected: (a) leaving routing inline in orchd + each command — the status quo that rotted; (b) putting the dispatcher method on each adapter — that re-scatters the routing decision and the execution step across adapters and reintroduces per-pair logic. The dispatcher owns routing; adapters own only "what command represents this action for my tool."

Rationale (why `execFile`, not a backend port method): an `AdapterCommand` such as `codex resume …` is a **machine-local CLI invocation**, not a pane-targeted keystroke or prompt delivery — it talks to the codex tool on this host, independent of which multiplexer owns the agent's pane. It therefore needs no `Backend` port surface. Adding an `exec`/`run-argv` kind to `DeliverPayload` (which today is only `{kind:"run"|"message", text}`) would push agent-command semantics into the plexer port and make every backend claim it can run adapter argv — an axis-wall violation (law #2/#8: agent concerns never leak into the plexer port). Running it daemon-side via `node:child_process` keeps agent-command execution on the agent axis and inside the one dispatcher, and stays node-safe (Rule 6: `node:child_process` only, no `Bun.*`).

Why the dispatcher lives in `src/control/` (core) and may still call `resolveAdapter`: it imports the **registry** (`resolveAdapter` from a registry module), not a concrete `pi.ts`/`claude.ts`/`codex.ts`. The registry is the L4 composition root and the single legal importer of concrete adapters — exactly as `src/backends/registry.ts` is for backends.

### D2 — Extract an adapter registry as the composition root

Today `resolveAdapter` and the `adapters` array live inline in `commands.ts:1843-1860`. Move them to `src/adapters/registry.ts` (mirror of `src/backends/registry.ts`): it imports `piAdapter`/`codexAdapter`/`claudeAdapter` and exports `resolveAdapter(id)` / `allAdapters()`. This is the one file exempt from the port-boundary import rule (like `backends/registry.ts`). The dispatcher, the daemon, and `commands.ts` import `resolveAdapter` from the registry — none import a concrete adapter.

Rationale: the port-boundary check needs a single sanctioned importer of concrete adapters or it cannot distinguish the composition root from a leak. Alternative rejected: keeping the array in `commands.ts` — then `commands.ts` (core) imports concrete adapters and the check can't fire there without a per-file exemption that defeats the purpose.

### D3 — pi's file protocol becomes pi-adapter-internal

Move `steerPresence`'s `inbox.jsonl` append and `writeAnswer`'s `answer.json` write out of `src/store.ts` and into `src/adapters/pi.ts`. The pi adapter's `steer()` and `answer()` already resolve the presence entry; they perform the file write directly (using the shared presence-dir path helper, which is protocol-neutral). The pi model command becomes an adapter concern too: since `setModel` currently writes pi's `{cmd:"model"}` inbox line, the pi adapter gains the ability to build that write, and the dispatcher's `model` action calls the adapter (gated on `caps.setModel`) rather than orchd touching `inbox.jsonl`.

Rationale: L2 — the wire format lives in exactly one module. `presenceAgentDir()`/the presence dir path stays in `store.ts` (it is the protocol-neutral location of the truth channel, shared by all adapters); only the pi-specific *filenames and record shapes* move into pi.ts. Alternative rejected: leaving thin `store.ts` writers and having pi call them — the literal `inbox.jsonl` still appears in core, so the containment check still fails.

### D4 — Model routing joins the dispatcher, gated on `caps.setModel`

`deliverControl(target, {kind:"model", model})` resolves the adapter, checks `caps.setModel`, and on `false` exits 1 with "the <id> adapter cannot switch models" (matching the existing agent-adapters scenario). On `true` it invokes the adapter's model mechanism. The daemon `set-model` RPC handler calls this instead of appending `inbox.jsonl`; `orch model` stays a CLI command that `writeRpc`s to orchd (as it does today), and the daemon handler is the only caller of `deliverControl` — `orch model` never invokes the dispatcher in-process.

Rationale: unifies the third control verb under the same L5 choke point and honors L3 (caps, not identity). The `orch model` wait/ack behavior (`fleet-steering`) is unchanged — it still waits for bridge readiness and reports old→new; only the write mechanism moves under the dispatcher.

### D5 — Port-boundary static check (L6)

Extend `scripts/check-bridge.ts` with a core-scope pass over `src/**` excluding `src/adapters/**` and `src/backends/**` (and excluding the two registry files, which are the sanctioned composition roots). It fails on:
- `import`/`from` of a concrete adapter module (`../adapters/pi.ts`, `pi`, `claude`, `codex`) or concrete backend module, outside the registries.
- Adapter wire literals: `inbox.jsonl`, `answer.json` (and the existing herdr/tmux literals already guarded).
- id-equality branches: `adapter.id === "…"`, `adapter.id !== "…"`, `backend.id === "…"` (grep-style line match).

Wire it into `bun run check` (add `check:bridge` to the `check` script or run both in CI). Rationale: L6 — the plexer axis proved a pattern holds only where a check holds it. Alternative rejected: a lint rule — the repo already owns a bespoke line scanner (`check-bridge.ts`) with the exact exclusion machinery; extend it rather than add a second mechanism.

The enforced wire-literal set is not just pi's. Law #2 covers every adapter's private format, so the check's core-scope literal list is the exhaustive, single-sourced set of adapter wire identifiers: pi's `inbox.jsonl`/`answer.json`, codex's notify event names (`agent-turn-complete`, and any sibling notify/hook event strings the codex adapter owns), and claude's hook identifiers/paths (its `SessionStart`/`Stop`/`Notification` hook-event names and the `claude-hooks` script path). The list lives in exactly one place — the `check-bridge.ts` core-scope pass — so adding a new adapter's literal is a one-line edit there, and the same check proves each of those strings appears in core nowhere but its owning adapter.

### D6 — Lifecycle verbs join the adapter port, gated on a declared lifecycle capability

`orch reset`/`reload`/`restart` (the `cmdNew`, `cmdReload`, `cmdRestart` command bodies and their `doReload`/`doHardRestart` helpers, `commands.ts:2210-2410`) today deliver pi's `/new`, `/reload`, and `/quit` slash-commands via `backend.deliver({kind:"run"})` and poll `status.json` — pi wire format and a pi-only happy path with no adapter ownership, exactly the coupling the monolith split would otherwise relocate verbatim. Move the slash-command strings into `src/adapters/pi.ts` behind a **declared lifecycle capability** (a `caps`-level lifecycle declaration plus adapter method(s) that return the per-verb `AdapterCommand`/delivery text). Core resolves the target's adapter, gates on the declared capability, and obtains the delivery text/command from the adapter; the readiness-polling orchestration that surrounds it (status.json advance, pid refresh, shell-seen) is protocol-neutral and stays in core. When the adapter declares no mechanism for the requested verb, the verb fails loudly (exit 1) instead of delivering a meaningless keystroke to a claude/codex agent.

Rationale: law #2 (pi's slash-commands are pi wire format → one module), law #3 (branch on a declared lifecycle capability, never `adapter.id`), and it closes the unowned pi-coupling the cross-cutting sweep found. Scope is deliberately narrow — the port surface and the routing/gating decision, not the wait/poll mechanics. Alternative rejected: leaving lifecycle inline until `monolith-file-breakdown` — that change moves code verbatim and would carry the pi-coupling forward, violating the sequencing precondition (law #8) the same way the steer path did.

## Risks / Trade-offs

- **[A returned `AdapterCommand` can fail to run]** → The dispatcher runs an `AdapterCommand` (e.g. `codex resume …`) itself, daemon-side, via `node:child_process` `execFile` — a machine-local invocation that does not depend on the backend's delivery surface, so `caps.steer === "resume"` works on any backend (herdr, tmux, headless) so long as the adapter's CLI is on PATH. The failure surface is the child process itself: a missing binary, a nonzero exit, or a timeout. Mitigation: the dispatcher captures the exit code and, on spawn failure or nonzero exit, fails fast with exit 1 naming the target, the adapter, and the failed command — degraded-mode rule, never a silent or falsely-successful steer. Because execution is local, there is no codex-on-tmux gap here; tmux completion (`tmux-backend-completion`) owns only pane/keystroke delivery, not adapter-command execution.
- **[Moving `inbox.jsonl`/`answer.json` writers changes call graphs across store.ts, pi.ts, orchd.ts, commands.ts]** → Rule 8 forbids shims, so every caller is rewritten in this change. Mitigation: the port-boundary check + `bun test` on the affected files (steer/answer/model/pipe/result paths) is the safety net; the change is not done until scenarios run (task gate).
- **[The check could false-positive on legitimate strings]** (e.g. a comment mentioning `inbox.jsonl`, or `answer.json` in a test fixture) → Mitigation: scope the check to `src/**` core only (tests and adapters excluded), and match the concrete-import and id-equality patterns precisely; if a legitimate core reference to a protocol filename exists, that is itself the leak the check is meant to catch and it moves into the adapter.
- **[pi regression risk]** — pi is the only fully-working pairing; routing it through the dispatcher must not change its behavior → Mitigation: pi's `steer`/`answer` still return `undefined` (they write files as a side effect), so the dispatcher's "no command → for `inbox` do nothing further" path preserves exact current behavior; a pi steer/answer/model test asserts the same file writes as before.

## Migration Plan

No user-facing migration — internal call-graph change only. Sequence:
1. Add `src/adapters/registry.ts` (move `adapters` array + `resolveAdapter`), repoint `commands.ts`.
2. Add `src/control/dispatch.ts` (`deliverControl`).
3. Move `inbox.jsonl`/`answer.json` I/O into `src/adapters/pi.ts`; delete the writers from `src/store.ts`.
4. Rewrite `orchd.ts` `deliverBackend`/`setModel` to call `deliverControl`; delete the `piAdapter` import.
5. Rewrite `commands.ts` control commands: the brokered verbs (`cmdSteer` — including its presence-only branch — and `cmdBroadcast`, plus the steer leg of `cmdPipe`) `writeRpc` to orchd so the daemon's dispatcher applies the effect; the read/local verbs (`cmdAnswer`, `cmdResult`, and `cmdPipe`'s result extraction) call the adapter port methods (`adapter.answer` / `adapter.extractResult`) directly in-process. No CLI command calls `deliverControl`.
6. Extend `scripts/check-bridge.ts`; wire into `bun run check` + CI.
7. Run `bun run check`, `bun run check:bridge`, targeted `bun test`, then execute the spec scenarios.

Rollback: revert the change set; there is no persisted state change to undo (presence protocol and file formats are unchanged).

## Open Questions

- None outstanding. The `AdapterCommand` execution mechanism (resolved during the adversarial audit): the dispatcher runs the argv itself, daemon-side, via `node:child_process` `execFile` with `stdin` piped when present — not through any `Backend` port method. `DeliverPayload` stays `{kind:"run"|"message", text}`; no `exec` kind is added (that would breach the axis wall — see D1 rationale).
