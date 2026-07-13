# fleet-steering

## ADDED Requirements

### Requirement: Event stream survives an empty fleet
`orch events --all` SHALL keep running when zero live agent presence dirs exist, and SHALL begin emitting transitions for agents that appear later, without restart.

#### Scenario: Monitor armed before the fleet boots
- **WHEN** `orch events --all` is started with no live agents and an agent spawns 30 seconds later and changes state
- **THEN** the process is still running and emits that agent's transition line

### Requirement: Tab labels resolve as tab targets
Commands that accept a tab (`tile`, `tab`, `move`) SHALL resolve a tab by its label as shown in the `orch tabs` LABEL column, in addition to tab ids and pane targets. A label matching more than one tab SHALL exit 1 listing the candidate tab ids.

#### Scenario: Tile onto a tab by label
- **WHEN** a tab labeled `notify` exists and the user runs `orch tile notify --name extra`
- **THEN** a pane is added to that tab, exit code 0

#### Scenario: Ambiguous label
- **WHEN** two tabs share the label `work` and the user runs `orch tile work`
- **THEN** the command exits 1 and lists both tab ids as candidates

### Requirement: Bridge-dependent writes wait for readiness
`orch model` SHALL wait up to a bounded default (10s) for the target pane's bridge presence dir before failing, polling rather than exiting on first miss. A `--no-wait` flag SHALL restore immediate failure. On timeout the error SHALL state how long it waited.

#### Scenario: Model set immediately after spawn
- **WHEN** `orch model <pane> <model>` runs 1 second after `orch spawn` created the pane and the bridge appears within 10s
- **THEN** the model is applied and the command exits 0 without the caller sleeping

#### Scenario: Bridge never appears
- **WHEN** the target pane never writes a presence dir within the wait window
- **THEN** the command exits 1 with an error naming the wait duration

### Requirement: Unambiguous model-change acknowledgement
`orch model` SHALL distinguish three outcomes: no-op (requested model already set — exit 0, output says already set), confirmed change (exit 0, output shows old → new), and unconfirmed change (bridge did not reflect the new model within the verification window — exit 1, output names both the requested and the still-current model).

#### Scenario: No-op is not a warning
- **WHEN** the pane is already on the requested model
- **THEN** output states it is already set, exit 0, and no "may be rejected" language appears

#### Scenario: Unconfirmed change fails loudly
- **WHEN** the bridge does not reflect the requested model within the verification window
- **THEN** the command exits 1 and the output names the requested model and the model still in effect

### Requirement: Spawn-time model pinning
`orch spawn` and `orch tile` SHALL accept `--model <provider/id:effort>` and apply it to each created pane once its bridge is ready. A pane whose pin fails SHALL produce a per-pane warning without aborting the other panes, and the exit code SHALL be nonzero if any pin failed.

#### Scenario: Fleet born on the intended model
- **WHEN** `orch spawn 2 --model openai-codex/gpt-5.6-terra:medium` completes and the bridges boot
- **THEN** `orch status` shows both new panes on `openai-codex/gpt-5.6-terra:medium` without any separate `orch model` call

#### Scenario: One pin fails
- **WHEN** one of two spawned panes never boots its bridge
- **THEN** the other pane is pinned, a warning names the failed pane, and the command exits nonzero
