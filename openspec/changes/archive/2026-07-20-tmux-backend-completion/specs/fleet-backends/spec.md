## ADDED Requirements

### Requirement: Implicit tmux selection inside a live tmux session
When no backend is selected via `--backend` or `defaults.backend`, orch SHALL select the tmux backend when tmux is available and the process is inside a live tmux session, choosing it after the herdr-inside-session probe and before the headless fallback. Selection SHALL rely on the backend's own availability and current-session probes, not on hard-coded per-backend branching at the call site.

#### Scenario: Inside tmux with no configured backend
- **WHEN** the user is inside a live tmux session, herdr is not the current session, and runs `orch spawn 2 --cwd ~/proj` with no backend configured
- **THEN** orch selects the tmux backend and the two agents appear as panes in the tmux session

#### Scenario: Outside any session falls back to headless
- **WHEN** the user is not inside herdr or tmux and runs `orch spawn 2` with no backend configured
- **THEN** orch selects the headless backend instead of tmux

### Requirement: Session-scoped backend validation fails fast
When a backend is selected via `--backend` or `defaults.backend`, orch SHALL verify at validation time that the backend reports itself inside a live session, and SHALL exit non-zero with an actionable message naming the missing session when it does not — before any spawn is attempted. A backend that has no session concept SHALL always pass this check.

#### Scenario: Configured tmux outside a session fails at validation
- **WHEN** the user sets `defaults.backend = "tmux"` (or passes `--backend tmux`) and runs `orch spawn 1` from outside any tmux session
- **THEN** orch exits non-zero with a message that a tmux session is required, and no pane is created

#### Scenario: Headless is never rejected for lack of a session
- **WHEN** the user runs `orch spawn 1 --backend headless` from outside any multiplexer session
- **THEN** validation passes and the headless agent starts

#### Scenario: Configured herdr outside a herdr session fails at validation
- **WHEN** the user sets `defaults.backend = "herdr"` (or passes `--backend herdr`) and runs `orch spawn 1` from outside any herdr session
- **THEN** orch exits non-zero at validation with a message that a herdr session is required, and no pane is created — the uniform session check applies to every session-scoped backend, not only tmux
