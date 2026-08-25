# control-dispatch — delta

## MODIFIED Requirements

### Requirement: All agent-directed control traffic flows through one daemon-side dispatcher

Every steer, answer, or model effect SHALL be applied by a single control dispatcher that runs inside the daemon, resolves the target's recorded adapter and backend, gates on the adapter's declared capabilities, and routes accordingly. The brokered control commands — `orch steer`, `orch model`, `orch answer`, `orch broadcast`, and the steer leg of `orch pipe` — SHALL reach this dispatcher only by calling orchd over its control socket; they SHALL NOT invoke the dispatcher in-process nor apply the effect directly from the CLI. Local read/extraction — result extraction for `orch pipe`/`orch result` — MAY call the target adapter's `extractResult` port method directly, as a read. No command and no daemon path SHALL apply a steer/answer/model effect by branching on the adapter's id or by writing an adapter's native file directly. Outside the dispatcher (and the adapter implementations themselves), no code in `src/` SHALL invoke an adapter's control strategy methods (`steer`, `answer`, `setModel`).

#### Scenario: Steer resolves per-target adapter, not the current default

- **WHEN** a pi agent and a claude agent are both live, the config default adapter is later changed, and the user runs `orch steer <pi-target> "keep going"`
- **THEN** the pi agent is steered through pi's inbox mechanism regardless of the changed default, and the command exits 0

#### Scenario: Broadcast steers a mixed fleet correctly

- **WHEN** a fleet contains both a pi and a claude agent and the user runs `orch broadcast "status?" --all`
- **THEN** the pi agent receives the text through its inbox and the claude agent receives it through its declared `keys` mechanism, each via the dispatcher, and the command reports the delivered count

#### Scenario: Answer is delivered by the daemon-side dispatcher

- **WHEN** a pi agent asks a blocking question and the user runs `orch answer <target> "yes"`
- **THEN** the CLI sends the answer to orchd over the control socket, the daemon's governance (workspace wall + ownership) admits it, and the dispatcher applies it via the adapter's `answer` mechanism — the CLI process itself invokes no adapter control strategy

#### Scenario: A cross-workspace answer is refused by the daemon

- **WHEN** an orchestrator in workspace A runs `orch answer <workspace-B-target> "yes"` without the cross-workspace override
- **THEN** the daemon refuses the write with a workspace-boundary reason and no answer reaches the agent

### Requirement: Absent control capability fails loudly

When a control command targets an adapter that does not support the requested action — steer mechanism `none`, `orch model` against an adapter whose `setModel` capability is false, or `orch answer` against an adapter whose `ask` capability is false — orch SHALL exit 1 with a message naming the target, the adapter, and the unsupported action, and SHALL write no agent file. It SHALL NOT silently no-op nor report success. For steer, model, and answer alike the failure is raised by the daemon-side dispatcher's capability gate.

#### Scenario: Model switch unsupported by the adapter

- **WHEN** the user runs `orch model <codex-target> openai/gpt-x` and the codex adapter does not support model switching
- **THEN** the command exits 1 with a message stating the codex adapter cannot switch models, and no agent file is written

#### Scenario: Answer unsupported by the adapter

- **WHEN** the user runs `orch answer <target> "yes"` and the target's adapter declares its `ask` capability false
- **THEN** the command exits 1 with a message stating that adapter cannot answer blocking questions, and no answer file is written — the refusal coming from the dispatcher's capability gate, not a CLI-side check

#### Scenario: Steer against an unsteerable adapter

- **WHEN** the user runs `orch steer <target> "…"` and the target adapter declares steer mechanism `none`
- **THEN** the command exits 1 naming the adapter and that it cannot be steered

## ADDED Requirements

### Requirement: A missing adapter identity is an error, never a default

When a control or lifecycle command resolves a target whose presence record and spawn registry carry no adapter identity, orch SHALL exit 1 naming the target and the missing identity. It SHALL NOT fall back to any default adapter's strategy.

#### Scenario: Identity-less target is refused, not treated as pi

- **WHEN** a presence record has no `agent` field and no spawn-registry adapter, and the user runs `orch answer <target> "yes"` (or `orch reset <target>`)
- **THEN** the command exits 1 naming the target and the absent adapter identity, and no adapter mechanism is invoked
