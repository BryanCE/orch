# port-boundary-guard — delta

## MODIFIED Requirements

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

## ADDED Requirements

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
