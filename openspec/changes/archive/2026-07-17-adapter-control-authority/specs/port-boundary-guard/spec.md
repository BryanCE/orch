# port-boundary-guard

## ADDED Requirements

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

The boundary check SHALL fail when a core source file contains an adapter- or backend-identity equality branch (for example `adapter.id === "pi"`, `adapter.id !== "pi"`, or `backend.id === "…"`). Core SHALL branch on declared capabilities, never on a provider id.

#### Scenario: An id-equality branch fails the check

- **WHEN** a core file contains `adapter.id !== "pi"` and `bun run check:bridge` runs
- **THEN** the check exits nonzero and names the offending file and line

### Requirement: The boundary check gates the build and CI

`bun run check` SHALL run the boundary check as part of its verification, and CI SHALL run it as a required gate, so a boundary violation cannot merge.

#### Scenario: Check is part of the standard verification

- **WHEN** `bun run check` runs on a tree with a core boundary violation
- **THEN** verification exits nonzero
