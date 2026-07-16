## Why

Four source files carry the whole control plane: `src/commands.ts` (3,275 lines), `extensions/orchestrator-bridge.ts` (1,777), `src/doctor.ts` (876), and `src/notify.ts` (702). The monolith is not merely ugly — it is the root enabler of the coupling the architecture review catalogued: `commands.ts` holds CLI parsing, view derivation, presence I/O, steering, setup/install, dep management, pi trust seeding, spawn settings, worker prompts, and lifecycle polling in one namespace, so every concern can reach into every other and therefore does. Splitting each monolith into small, single-purpose, directly-testable modules removes the "everything can reach everything" affordance and gives each behavioral fix a real home to land in.

## What Changes

- `src/commands.ts` → `src/commands/` split by domain (status, spawn, control, lifecycle, panes, results, setup, target) with an `index.ts` that is a pure argv→command dispatch table containing no business logic.
- `extensions/orchestrator-bridge.ts` → `extensions/bridge/` modules (backend-neutral presence core, `orch_*` tool/command registration, herdr-gated HUD, orchd socket acks). The single bundled output is unchanged; `src/bridge-bundle.ts` points at the new entrypoint.
- `src/doctor.ts` → `src/doctor/` with one check-group per file (bins, backends, extensions, hooks, daemon, presence, remote, config) plus a composing runner.
- `src/notify.ts` → sink builtins (desktop/webhook/command) split from the router/registry.
- pi trust seeding (`TRUST_FILE`/`launchesPi`/`writeTrustEntry`) moves out of the command layer into `src/adapters/pi.ts`, where it belongs as pi launch behavior.
- Purity rules enforced across the split: leaf modules take resolved, narrowed inputs (adapter/backend/entity) — no re-resolving config or targets inside leaves; I/O lives at the edges (presence file access in store/adapter modules); every new module is directly unit-testable.
- **No compat shims and no re-exports from the old paths** — every import is repointed, the old monolith files are deleted, and nothing re-exports from `src/commands.ts`, `src/doctor.ts`, `src/notify.ts`, or `extensions/orchestrator-bridge.ts`.

This change is a **pure reorganization**: zero behavior change. Every module keeps the exact logic it had; only its location and its inputs (narrowed, at the boundary) change.

### Sequencing (hard dependency)

This change lands **LAST**, after `adapter-control-authority`, `adapter-presence-writers`, `settings-json-config`, `provider-driven-setup-doctor`, and `tmux-backend-completion`. Those five change behavior; this one only moves code. It adopts the modules those changes introduce (the dispatcher, presence writers, settings loader, provider-driven doctor checks, tmux port methods) directly into the new layout, so each behavioral fix lives in its new home rather than being written into the monolith and then moved a second time. Landing this first would force every sibling to re-target files mid-flight and would move code that is about to be rewritten.

### Non-goals (explicitly deferred)

- **Any behavior change.** Capability gating, dispatcher wiring, presence writers, settings.json, provider-driven doctor, tmux completion — all belong to the five sibling changes, not here. If a scenario would change an exit code, a file written, or CLI output, it is out of scope.
- **`src/daemon/rpc.ts` (549 lines)** and other borderline files ≤ ~550 lines — under the ceiling, left alone. The ceiling is applied only where cohesion genuinely demands it, not as a mechanical line-count sweep.
- **A permanent CI line-count guard.** Verification here is the one-shot `wc -l` ceiling check plus the scenarios; a standing enforcement check is a separate concern.

## Capabilities

### New Capabilities
- `module-layout`: the structural invariants of the source tree — the four monoliths are decomposed into domain modules under `src/commands/`, `extensions/bridge/`, `src/doctor/`, and split `notify` modules; the CLI dispatch entrypoint carries only routing; no source file exceeds the ~700-line ceiling; no old monolith path survives and nothing re-exports from one; leaf modules take narrowed inputs with I/O pushed to the edges. Every invariant is mechanically verifiable from the filesystem and CLI (`find`/`wc -l`, `grep`, `bun run check`, `bun test`).

### Modified Capabilities
<!-- None. This is a pure reorganization; no existing capability's REQUIREMENTS change. All behavioral requirements are owned by the five sibling changes. -->

## Impact

- **Deleted**: `src/commands.ts`, `src/doctor.ts`, `src/notify.ts`, `extensions/orchestrator-bridge.ts` (contents moved, not left as shims).
- **New**: `src/commands/{status,spawn,control,lifecycle,panes,results,setup,target,index}.ts`; `extensions/bridge/{presence,tools,herdr-hud,daemon-ack,index}.ts`; `src/doctor/{bins,backends,extensions,hooks,daemon,presence,remote,config,runner}.ts` (final grouping fixed in design); `src/notify/{sinks,router}.ts` (or equivalent split).
- **Modified**: `src/bridge-bundle.ts` (bridge entrypoint path); `src/adapters/pi.ts` (absorbs trust seeding); every importer of the four monoliths (`bin/orch.ts`, `src/daemon/*`, tests) repointed to the new module paths.
- **Untouched (survive the reorg)**: `src/control/dispatch.ts` (`deliverControl`) and `src/adapters/registry.ts` (`resolveAdapter` — the sole legal concrete-adapter importer) are sibling-introduced CORE modules from `adapter-control-authority`. They are NOT folded into `src/commands/`; they keep their location and content. `commands/control.ts` holds only the thin CLI wrappers (`cmdSteer`/`cmdAnswer`/`cmdModel`/`cmdBroadcast`/`cmdPipe`) that broker to `deliverControl` — no routing, caps-gating, or wire I/O. Phase A only repoints `resolveAdapter` imports to `src/adapters/registry.ts`.
- **Tests**: each new module gets or keeps direct unit tests; the full suite must be green after every phase (WSL: CLI-spawning/git-heavy tests need 15–30s timeouts).
- **Build**: `bun build` follows the new import graph automatically for the bridge bundle; the shipped `dist/extensions/orchestrator-bridge.js` output name and behavior are unchanged.
