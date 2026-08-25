# agent-adapters

## ADDED Requirements

### Requirement: An adapter's private wire format is contained in that adapter

Each adapter's native file protocol SHALL be read and written in exactly one module — the adapter itself. pi's `inbox.jsonl` and `answer.json` SHALL be produced only by the pi adapter; no core command, daemon path, or shared store helper SHALL read or write those files. Core SHALL interact with agents only through the presence protocol and the adapter port.

#### Scenario: Steering a pi agent still lands in its inbox

- **WHEN** the user runs `orch steer <pi-target> "next task"`
- **THEN** the text is appended to that pi agent's `inbox.jsonl` and the agent consumes it, with the write performed by the pi adapter

#### Scenario: Answering a pi question still writes its answer file

- **WHEN** a pi agent asks a blocking question and the user runs `orch answer <pi-target> "yes"`
- **THEN** the answer is written to that agent's `answer.json` and the agent unblocks, with the write performed by the pi adapter

### Requirement: Control commands execute the command an adapter returns

When a control command (`steer`, `answer`, `model`, `pipe`, `broadcast`) routes to an adapter whose mechanism returns a command to run rather than writing a file, orch SHALL execute that command as a machine-local child process and SHALL treat delivery as failed if the command could not be run or exited nonzero. orch SHALL NOT report success for a control command whose returned command was discarded or failed.

#### Scenario: A non-file steer mechanism runs its command

- **WHEN** an adapter's steer mechanism produces a resume-style command and the user runs `orch steer <target> "…"`
- **THEN** the command is run as a local child process and, on a zero exit, orch exits 0

#### Scenario: A discarded or failed command is a failure, not a success

- **WHEN** an adapter's steer mechanism produces a command but it is discarded, fails to spawn, or exits nonzero
- **THEN** `orch steer <target> "…"` exits nonzero and does not print a success line
