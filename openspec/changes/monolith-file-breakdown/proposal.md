## Why

Four source files carry the whole control plane: `src/commands.ts` (3,275 lines), `extensions/pi/index.ts` (1,868, formerly `extensions/orchestrator-bridge.ts`), `src/doctor.ts` (876), and `src/notify.ts` (702). The monolith is not merely ugly — it is the root enabler of the coupling the architecture review catalogued: `commands.ts` holds CLI parsing, view derivation, presence I/O, steering, setup/install, dep management, pi trust seeding, spawn settings, worker prompts, and lifecycle polling in one namespace, so every concern can reach into every other and therefore does. Splitting each monolith into small, single-purpose, directly-testable modules removes the "everything can reach everything" affordance and gives each behavioral fix a real home to land in.

## What Changes

- `src/commands.ts` → `src/commands/` split by domain (status, spawn, control, lifecycle, panes, results, setup, target) with an `index.ts` that is a pure argv→command dispatch table containing no business logic.
- **Harness layout (CLAUDE.md Rule 10):** every harness's shipped code moves under `extensions/<harness>/` named for it — `extensions/pi/`, `extensions/claude/`, `extensions/codex/`; `scripts/` keeps build tooling only. `extensions/pi/index.ts` then splits into four modules (presence, tools, daemon-ack, index). The herdr-gated HUD leaves the harness dir entirely for `src/backends/herdr/hud.ts` — it is plexer-gated, not harness-gated. All bundled output names unchanged; `src/bridge-bundle.ts` maps name→source-dir.
- **One shared presence writer:** `atomicWrite` + presence-dir + `status.json`/`result.json` writing is currently implemented THREE times (once per harness artifact). It collapses into `src/presence/{writer,inbox}.ts`, imported by all three. Presence is core — the protocol orch defines and harnesses conform to — not an integration.
- `src/doctor.ts` → `src/doctor/` with one check-group per file (bins, backends, extensions, hooks, daemon, presence, remote, config) plus a composing runner.
- `src/notify.ts` → sink builtins (desktop/webhook/command) split from the router/registry.
- pi trust seeding (`TRUST_FILE`/`launchesPi`/`writeTrustEntry`) moves out of the command layer into `src/adapters/pi.ts`, where it belongs as pi launch behavior.
- Purity rules enforced across the split: leaf modules take resolved, narrowed inputs (adapter/backend/entity) — no re-resolving config or targets inside leaves; I/O lives at the edges (presence file access in store/adapter modules); every new module is directly unit-testable.
- **No compat shims and no re-exports from the old paths** — every import is repointed, the old monolith files are deleted, and nothing re-exports from `src/commands.ts`, `src/doctor.ts`, `src/notify.ts`, or the pre-move harness paths.

Phases A–E are a **pure reorganization**: zero behavior change, each module keeping the exact logic it had. The presence dedup (Phase E2) is the one deliberate exception — collapsing three writer copies into one changes what executes inside the claude and codex shims, so it carries its own behavioral gate rather than riding the pure-move claim.

### Sequencing (hard dependency)

This change lands **LAST**, after `adapter-control-authority`, `adapter-presence-writers`, `settings-json-config`, `provider-driven-setup-doctor`, and `tmux-backend-completion`. Those five change behavior; this one only moves code. It adopts the modules those changes introduce (the dispatcher, presence writers, settings loader, provider-driven doctor checks, tmux port methods) directly into the new layout, so each behavioral fix lives in its new home rather than being written into the monolith and then moved a second time. Landing this first would force every sibling to re-target files mid-flight and would move code that is about to be rewritten.

### Non-goals (explicitly deferred)

- **Any behavior change.** Capability gating, dispatcher wiring, presence writers, settings.json, provider-driven doctor, tmux completion — all belong to the five sibling changes, not here. If a scenario would change an exit code, a file written, or CLI output, it is out of scope.
- **`src/daemon/rpc.ts` (549 lines)** and other borderline files ≤ ~550 lines — under the ceiling, left alone. The ceiling is applied only where cohesion genuinely demands it, not as a mechanical line-count sweep.
- **A permanent CI line-count guard.** Verification here is the one-shot `wc -l` ceiling check plus the scenarios; a standing enforcement check is a separate concern.

## Capabilities

### New Capabilities
- `module-layout`: the structural invariants of the source tree — the four monoliths are decomposed into domain modules under `src/commands/`, `extensions/pi/`, `src/doctor/`, and split `notify` modules; each harness's code lives under `extensions/<harness>/` and the presence protocol has exactly one writer in `src/presence/`; the CLI dispatch entrypoint carries only routing; no source file exceeds the ~700-line ceiling; no old monolith path survives and nothing re-exports from one; leaf modules take narrowed inputs with I/O pushed to the edges. Every invariant is mechanically verifiable from the filesystem and CLI (`find`/`wc -l`, `grep`, `bun run check`, `bun test`).

### Modified Capabilities
<!-- None. This is a pure reorganization; no existing capability's REQUIREMENTS change. All behavioral requirements are owned by the five sibling changes. -->

## Impact

- **Deleted**: `src/commands.ts`, `src/doctor.ts`, `src/notify.ts` (contents moved, not left as shims). **Relocated**: `extensions/orchestrator-bridge.ts`→`extensions/pi/index.ts`, `scripts/claude-hooks.ts`→`extensions/claude/index.ts`, `scripts/codex-notify.ts`→`extensions/codex/index.ts`, `src/presence-schema.ts`→`src/presence/schema.ts`.
- **New**: `src/commands/{status,spawn,control,lifecycle,panes,results,setup,target,index}.ts`; `extensions/pi/{presence,tools,daemon-ack,index}.ts`; `src/presence/{writer,inbox,schema}.ts`; `src/backends/herdr/hud.ts`; `src/doctor/{bins,backends,extensions,hooks,daemon,presence,remote,config,runner}.ts` (final grouping fixed in design); `src/notify/{sinks,router}.ts` (or equivalent split).
- **Modified**: `src/bridge-bundle.ts` (bridge entrypoint path); `src/adapters/pi.ts` (absorbs trust seeding); every importer of the four monoliths (`bin/orch.ts`, `src/daemon/*`, tests) repointed to the new module paths.
- **Untouched (survive the reorg)**: `src/control/dispatch.ts` (`deliverControl`) and `src/adapters/registry.ts` (`resolveAdapter` — the sole legal concrete-adapter importer) are sibling-introduced CORE modules from `adapter-control-authority`. They are NOT folded into `src/commands/`; they keep their location and content. `commands/control.ts` holds only the thin CLI wrappers (`cmdSteer`/`cmdAnswer`/`cmdModel`/`cmdBroadcast`/`cmdPipe`) that broker to `deliverControl` — no routing, caps-gating, or wire I/O. Phase A only repoints `resolveAdapter` imports to `src/adapters/registry.ts`.
- **Tests**: each new module gets or keeps direct unit tests; the full suite must be green after every phase (WSL: CLI-spawning/git-heavy tests need 15–30s timeouts).
- **Build**: `bun build` follows the new import graph automatically; `package.json` build:ext/build:hooks/build:notify point at the new sources while every shipped output name (`dist/extensions/orchestrator-bridge.js`, `dist/scripts/claude-hooks.js`, `dist/scripts/codex-notify.js`) is unchanged.
- **Guard**: `scripts/check-bridge.ts` drops the two pi presence filenames from `ADAPTER_WIRE_LITERALS` (orch defines them; codex/claude entries stay banned) and its `extensions` scan is made recursive — it was non-recursive and would silently scan zero files under the new layout.
