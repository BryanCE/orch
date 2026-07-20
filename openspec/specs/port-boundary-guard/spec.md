# port-boundary-guard Specification

## Purpose
TBD - created by archiving change adapter-control-authority. Update Purpose after archive.
## Requirements
### Requirement: Core may not import concrete adapters or backends

The boundary check run by `bun run check:bridge` (and as part of `bun run check`) SHALL fail with a nonzero exit when any core source file — under `src/` but outside `src/adapters/` and `src/backends/`, excluding the adapter and backend registry composition roots — imports a concrete adapter module (`pi`, `claude`, `codex`) or a concrete backend module. Resolving an adapter or backend in core SHALL go through the registry, never a direct import.

#### Scenario: Direct pi import in core fails the check

- **WHEN** a file such as `src/daemon/orchd.ts` imports `../adapters/pi.ts` and `bun run check:bridge` runs
- **THEN** the check exits nonzero and names the offending file and line

#### Scenario: Registry-mediated resolution passes

- **WHEN** core resolves adapters only through the adapter registry and `bun run check:bridge` runs
- **THEN** the check exits 0

### Requirement: Core may not contain adapter wire literals

The boundary check SHALL fail when a core source file (same scope as above) contains any adapter-internal wire-format literal, so that each adapter's private protocol appears in exactly one adapter module. The enforced literal set SHALL cover every adapter's wire identifiers, not only pi's — pi's `inbox.jsonl` and `answer.json`, codex's notify event names (including `agent-turn-complete`), and claude's hook identifiers/paths (its `SessionStart`/`Stop`/`Notification` hook-event names and its `claude-hooks` script path). This set SHALL be the exhaustive enforced list and SHALL be defined in exactly one place — the boundary-check script — so that adding a new adapter's literal is a single-line edit and no second copy of the list can drift.

#### Scenario: An inbox literal in core fails the check

- **WHEN** a core file appends to a path ending in `inbox.jsonl` and `bun run check:bridge` runs
- **THEN** the check exits nonzero and names the offending file and line

#### Scenario: A codex or claude wire literal in core fails the check

- **WHEN** a core file references `agent-turn-complete` or a claude hook identifier and `bun run check:bridge` runs
- **THEN** the check exits nonzero and names the offending file and line

#### Scenario: Each literal confined to its owning adapter passes

- **WHEN** `inbox.jsonl`/`answer.json` appear only in `src/adapters/pi.ts`, the codex notify events only in `src/adapters/codex.ts`, and the claude hook identifiers only in `src/adapters/claude.ts`, and `bun run check:bridge` runs
- **THEN** the check exits 0

### Requirement: Core may not branch on adapter or backend identity

The boundary check SHALL fail when a core source file contains an adapter- or backend-identity equality branch in any lexical form — member-id comparisons (`adapter.id === "pi"`, `backend.id !== "…"`), bare string comparisons against a known provider id (`agent === "pi"`, `settings.adapter === "claude"`), and default-to-provider fallbacks (`?? "pi"` or `|| "pi"` feeding an adapter or backend resolution). Core SHALL branch on declared capabilities, never on a provider id, and SHALL treat a missing provider identity as an error rather than defaulting to any provider.

#### Scenario: An id-equality branch fails the check

- **WHEN** a core file contains `adapter.id !== "pi"` and `bun run check:bridge` runs
- **THEN** the check exits nonzero and names the offending file and line

#### Scenario: A string-form identity branch fails the check

- **WHEN** a core file contains `agent === "claude"` (or an equivalent quoted-provider-id equality outside the registries) and `bun run check:bridge` runs
- **THEN** the check exits nonzero and names the offending file and line

#### Scenario: A default-to-provider fallback fails the check

- **WHEN** a core file resolves an adapter with `resolveAdapter(x ?? "pi")` and `bun run check:bridge` runs
- **THEN** the check exits nonzero and names the offending file and line

### Requirement: The boundary check gates the build and CI

`bun run check` SHALL run the boundary check as part of its verification, and CI SHALL run it as a required gate, so a boundary violation cannot merge.

#### Scenario: Check is part of the standard verification

- **WHEN** `bun run check` runs on a tree with a core boundary violation
- **THEN** verification exits nonzero

### Requirement: Adapter control strategies are invocable only from the dispatcher

The boundary check SHALL fail when any file in `src/` outside `src/control/dispatch.ts` (and outside the adapter implementations themselves) invokes an adapter control strategy member — `.steer(`, `.answer(`, or `.setModel(` — on an adapter value. The single dispatcher is the only production caller of adapter control strategies.

#### Scenario: A CLI-side adapter control call fails the check

- **WHEN** a file under `src/commands/` calls `adapter.answer(...)` directly and `bun run check:bridge` runs
- **THEN** the check exits nonzero and names the offending file and line

### Requirement: Workspace packages honor the same port boundaries

The boundary check SHALL scan workspace package sources (`packages/*/src/**`) and fail when one imports a concrete adapter or backend module from core (for example `src/backends/herdr/…`). Workspace packages SHALL reach core only through ports, registries, policy, the presence store, and the daemon client.

#### Scenario: A web-server herdr import fails the check

- **WHEN** `packages/web/src/server/orch.ts` imports `src/backends/herdr/cli.ts` and `bun run check:bridge` runs
- **THEN** the check exits nonzero and names the offending file and line

#### Scenario: Port-mediated web access passes

- **WHEN** the web server reaches workspace names through the backend port and presence through the shared store, and `bun run check:bridge` runs
- **THEN** the check exits 0

### Requirement: Core commands may not import a harness session parser

The boundary check SHALL fail when a file under `src/commands/` imports a per-harness session/transcript parser directly (for example pi's `parseSession`). Session reads in core SHALL go through the adapter port's session-view surface.

#### Scenario: A raw parseSession import in a command fails the check

- **WHEN** a file under `src/commands/` imports `parseSession` and `bun run check:bridge` runs
- **THEN** the check exits nonzero and names the offending file and line

