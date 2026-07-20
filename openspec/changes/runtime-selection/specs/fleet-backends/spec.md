# fleet-backends Delta

## MODIFIED Requirements

### Requirement: Backend capability probes
Each registered backend SHALL expose availability and current-session probes through the backend port, and orch MUST use those probes before selecting an implicit backend or starting a spawn.

The `orch doctor` backend-capabilities row SHALL gate on those probes asymmetrically, because the two probes have different satisfiability:

- **Availability is a conjunction.** The row SHALL fail when ANY installed backend reports `available=false`. An installed backend whose binary is missing is a real defect and MUST be surfaced.
- **Current-session applies to the active backend only.** The row SHALL require `insideSession=true` ONLY of the active/default backend. An installed but non-active backend reporting `insideSession=false` is normal and MUST NOT fail the row, since an operator cannot be inside two session-bound backends at once and a row that demands it is unsatisfiable by construction.

The row's detail text SHALL render one backend per line — a real line break between entries, never a literal backslash-n rendering the entries as a single run-on line.

#### Scenario: Current session is required
- **WHEN** the configured backend reports `isAvailable = true` but `isInsideSession = false` for a session-bound spawn
- **THEN** orch exits non-zero with an actionable message naming the missing backend session

#### Scenario: Two pane backends installed, one active, doctor passes
- **WHEN** herdr, headless, and tmux are all installed, the active/default backend is herdr, and `orch doctor` probes report `herdr: available=true, insideSession=true`, `headless: available=true, insideSession=true`, and `tmux: available=true, insideSession=false`
- **THEN** the backend-capabilities row reports `ok` — every installed backend is available and the active backend is inside its session — and tmux reporting `insideSession=false` does not fail the row

#### Scenario: Installed backend that is not available fails
- **WHEN** an installed backend reports `available=false` while every other installed backend and the active backend probe cleanly, and the user runs `orch doctor`
- **THEN** the backend-capabilities row reports `fail`, its detail names the unavailable backend, and `orch doctor` exits non-zero

#### Scenario: Active backend outside its session fails
- **WHEN** the active/default backend reports `available=true` but `insideSession=false`, and the user runs `orch doctor`
- **THEN** the backend-capabilities row reports `fail` and its detail names the active backend's missing session

#### Scenario: Detail renders one backend per line
- **WHEN** the user runs `orch doctor` with herdr, headless, and tmux installed
- **THEN** the backend-capabilities detail prints each backend's probe results on its own line, with no literal `\n` characters in the output
