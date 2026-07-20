# doctor-config — delta

## ADDED Requirements

### Requirement: Doctor separates broken installs from situational context

`orch doctor` SHALL reserve FAIL for conditions where the installation itself is broken (missing integration, stale daemon code, invalid config, runtime mismatch). A condition that merely reflects where the command was run — a session-scoped backend reporting `insideSession = false` while its binary is available and another installed backend is usable — SHALL be reported as a warning naming the situational cause, not a failure. Doctor's exit code SHALL be non-zero only when a genuine failure is present.

#### Scenario: Outside a herdr session is a warning, not a failure

- **WHEN** herdr is installed and available, the command runs from a shell that is not inside a herdr session, headless is also installed, and `orch doctor` runs
- **THEN** the backend-capability row reports a warning naming the absent session (with the hint to open a herdr workspace), the check is not a FAIL, and doctor's exit code is unaffected by it

#### Scenario: A genuinely unavailable backend still fails

- **WHEN** an installed backend's binary is absent from PATH and `orch doctor` runs
- **THEN** that backend's check is a FAIL with the install fix, and the exit code is non-zero
