## ADDED Requirements

### Requirement: No source file exceeds the size ceiling

Every TypeScript file under `src/` and `extensions/` SHALL be at most 700 lines. The four former monoliths (`src/commands.ts`, `extensions/orchestrator-bridge.ts`, `src/doctor.ts`, `src/notify.ts`) SHALL NOT exist as single files.

#### Scenario: Ceiling holds across the tree
- **WHEN** `find src extensions -name '*.ts' | xargs wc -l | sort -rn | head` is run
- **THEN** the largest count reported is at most 700
- **AND** no line of that output names `src/commands.ts`, `src/doctor.ts`, `src/notify.ts`, or `extensions/orchestrator-bridge.ts`

### Requirement: Command logic is organized into domain modules

The command layer SHALL live under `src/commands/`, one module per command domain (status, spawn, control, lifecycle, panes, results, events, review, queue, clean, daemon, setup, target), each with a single nameable responsibility.

#### Scenario: Domain modules exist and stay under ceiling
- **WHEN** `ls src/commands/` is listed and each file's length is measured
- **THEN** `src/commands/` contains the per-domain modules and an `index.ts`
- **AND** every file in `src/commands/` is at most 700 lines

#### Scenario: pi trust seeding is not in the command layer
- **WHEN** `grep -rn "trust.json\|writeTrustEntry\|launchesPi" src/commands/` is run
- **THEN** it returns no matches
- **AND** `grep -n "writeTrustEntry" src/adapters/pi.ts` finds the trust-seeding code in the pi adapter

### Requirement: The dispatch entrypoint contains only routing

`src/commands/index.ts` SHALL map argv tokens to command functions and nothing else. It SHALL NOT read or write the presence directory, call adapter or backend port methods, or resolve config or targets.

#### Scenario: Entrypoint is free of business logic
- **WHEN** `src/commands/index.ts` is inspected
- **THEN** it imports command functions from the sibling domain modules and dispatches on the argv command token
- **AND** it contains no presence-directory file access, no `adapter.`/`backend.` method calls, and no `loadConfig`/`resolveTarget`/`resolveBackend` calls

### Requirement: Sibling-introduced control core survives the reorganization

`src/control/dispatch.ts` (`deliverControl`) and `src/adapters/registry.ts` (`resolveAdapter`) — the control dispatcher and adapter composition root introduced by `adapter-control-authority` — SHALL remain core modules in their pre-reorg location and SHALL NOT be folded into `src/commands/`. `src/commands/control.ts` SHALL hold only thin CLI wrappers that broker to the dispatcher and SHALL NOT gate on adapter capabilities or perform adapter wire I/O.

#### Scenario: Dispatcher and adapter registry stay in core
- **WHEN** the tree is inspected after the reorg
- **THEN** `src/control/dispatch.ts` exists and still exports `deliverControl`
- **AND** `src/adapters/registry.ts` exists and still exports `resolveAdapter`
- **AND** neither file lives under `src/commands/`

#### Scenario: control.ts wrappers hold no caps-gating
- **WHEN** `grep -nE '\.caps\b|caps\.' src/commands/control.ts` is run
- **THEN** it returns no matches, because capability gating lives in `src/control/dispatch.ts`, not the command wrappers

### Requirement: The pi bridge is organized into modules with an unchanged bundle

The bridge extension SHALL live under `extensions/bridge/` split into a backend-neutral presence core, a herdr-gated HUD module, a daemon-ack module, an `orch_*` tool/command registration module, and a composition entrypoint. The bundled artifact SHALL remain a single file named `dist/extensions/orchestrator-bridge.js` with unchanged runtime behavior.

#### Scenario: Bridge modules exist and herdr code is isolated
- **WHEN** `ls extensions/bridge/` is listed
- **THEN** it contains the presence, herdr-hud, daemon-ack, tools, and index modules
- **AND** every file in `extensions/bridge/` is at most 700 lines
- **AND** `grep -rln 'HERDR_SOCKET_PATH\|herdr notification\|herdr:blocked' extensions/bridge/` names only the herdr-hud module

#### Scenario: Bundle name and consumers are unchanged
- **WHEN** the bridge is rebuilt via `bun run build:dev`
- **THEN** `PI_EXTENSION_NAMES` in `src/bridge-bundle.ts` is still `["orchestrator-bridge"]`
- **AND** the emitted bundle path is `dist/extensions/orchestrator-bridge.js`
- **AND** `orch doctor` reports the bridge extension check as passing (not stale)

### Requirement: Doctor is organized into check-group modules

The doctor SHALL live under `src/doctor/`, one module per check group (bins, presence, backends, extensions, hooks, daemon, notify, remote, config) plus a composing runner. `src/doctor.ts` SHALL NOT exist as a single file.

#### Scenario: Check-group modules exist and runner composes them
- **WHEN** `ls src/doctor/` is listed
- **THEN** it contains one module per check group plus a runner module
- **AND** every file in `src/doctor/` is at most 700 lines
- **AND** `orch doctor` produces the same set of check ids as before the split

### Requirement: Notify separates sink builtins from routing

The notify layer SHALL separate builtin sink providers (desktop, webhook, command) from the router/registry. `src/notify.ts` SHALL NOT exist as a single file.

#### Scenario: Sinks and router are separate modules
- **WHEN** the notify modules are listed
- **THEN** builtin sink providers and the routing/registry live in separate files
- **AND** each notify module is at most 700 lines

### Requirement: No compatibility shim survives the move

No old monolith path SHALL survive and nothing SHALL re-export from a deleted monolith. Every importer SHALL reference the new module paths directly.

#### Scenario: Deleted paths have zero re-exports and zero importers
- **WHEN** `grep -rn "from ['\"].*/commands['\"]\|from ['\"].*/doctor['\"]\|from ['\"].*/notify['\"]\|from ['\"].*orchestrator-bridge['\"]" src bin extensions test` is run (excluding `src/bridge-bundle.ts`'s bundle-name constant)
- **THEN** no import resolves to a deleted monolith file
- **AND** `git ls-files` shows `src/commands.ts`, `src/doctor.ts`, `src/notify.ts`, and `extensions/orchestrator-bridge.ts` no longer tracked

### Requirement: Leaf modules take narrowed inputs and are directly testable

Leaf command modules SHALL receive resolved, narrowed inputs (an already-resolved adapter, backend, or entity) and SHALL NOT re-resolve config or targets internally. Presence file I/O SHALL live in `src/store.ts` and the adapter modules, composed by command modules rather than performed inline. Each new module SHALL be importable and unit-testable in isolation.

#### Scenario: Command leaves do not re-resolve or touch the presence dir directly
- **WHEN** the leaf functions in `src/commands/` are inspected — a leaf is defined as any exported function that is NOT registered in the `src/commands/index.ts` dispatch table (those command entrypoints own resolution) and is NOT defined in `target.ts`
- **THEN** `grep -nE 'loadConfig|resolveTarget|resolveBackend' src/commands/*.ts` reports these calls only inside `target.ts` and the dispatch-table command entries — never inside a leaf
- **AND** `grep -nE "orch/agents|presenceAgentDir|fs\.(readFile|writeFile|readdir|rm|mkdir)" src/commands/*.ts` shows no leaf performing raw presence-directory I/O (leaves compose `src/store.ts` / adapter helpers instead)

#### Scenario: Modules are unit-testable
- **WHEN** each new module is imported in isolation — for every file `f` in `src/commands/*.ts`, `src/doctor/*.ts`, `src/notify/*.ts`, and `extensions/bridge/*.ts`, run `node --input-type=module -e "await import('./${f}')"`
- **THEN** every import resolves and evaluates without spawning the full CLI (`runCommand` is never invoked)
- **AND** `bun test` includes at least one direct unit test per new module that imports it rather than driving argv through the dispatch entrypoint

### Requirement: The reorganization changes no behavior

The split SHALL preserve every CLI behavior. `bun run check` and the full `bun test` suite SHALL pass after the change, unchanged in their behavioral assertions.

#### Scenario: Green after the reorg
- **WHEN** `bun run check` is run
- **THEN** it exits 0
- **AND** `bun test` passes
- **AND** (review-gated) `git diff --stat <phase-base>..HEAD -- 'test/**'` is inspected by a reviewer who confirms every test-file change is an import-path repoint or a test relocation, with no behavioral assertion (expected exit code, expected output, expected file write) modified — this scenario is verified by human review of the test diff, not by an automated check
