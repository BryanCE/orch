## MODIFIED Requirements

### Requirement: Bridge-dependent writes wait for readiness
`orch model` SHALL route through the daemon broker and wait up to a bounded default (10s) for the target pane's bridge presence dir before failing, polling rather than exiting on first miss. A `--no-wait` flag SHALL restore immediate failure. On timeout the error SHALL state how long it waited. With orchd absent, `orch model` SHALL refuse with a nonzero exit and a message to run `orch daemon start`, rather than attempting a direct write.

#### Scenario: Model set immediately after spawn
- **WHEN** `orch model <pane> <model>` runs 1 second after `orch spawn` created the pane and the bridge appears within 10s
- **THEN** the model is applied through the broker and the command exits 0 without the caller sleeping

#### Scenario: Bridge never appears
- **WHEN** the target pane never writes a presence dir within the wait window
- **THEN** the command exits 1 with an error naming the wait duration

#### Scenario: Model change refuses without the broker
- **WHEN** orchd is absent and `orch model <pane> <model>` runs
- **THEN** the command exits nonzero and tells the operator to run `orch daemon start`, and no model change is attempted
