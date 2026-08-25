# control-dispatch Specification

## Purpose
TBD - created by archiving change adapter-control-authority. Update Purpose after archive.
## Requirements
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

### Requirement: A returned adapter command is executed

When an adapter's steer mechanism produces a command to run (for example a `resume` adapter that returns a `codex resume …` argv), the dispatcher SHALL execute that command itself, in the daemon process, as a machine-local child process (`node:child_process`), writing any supplied command input to its standard input, rather than discarding it or handing it to the backend's delivery surface. Because this is a machine-local invocation and not a pane delivery, it SHALL behave identically regardless of which backend owns the agent's pane — herdr, tmux, or headless — requiring no backend command-execution capability. A steer against such an adapter SHALL NOT report success unless the command actually ran and exited zero.

#### Scenario: Codex steer executes the resume command

- **WHEN** a codex agent is live and the user runs `orch steer <codex-target> "add tests"`
- **THEN** the dispatcher runs the adapter's resume command as a local child process, and — the command having exited zero — `orch steer` exits 0, independent of which backend owns the agent's pane

#### Scenario: The resume command fails to run

- **WHEN** a codex agent's steer produces a command but running it fails — the adapter binary is missing, the child process exits nonzero, or it times out
- **THEN** `orch steer <codex-target> "…"` exits 1 with a message naming the target, the adapter, and the failed command, and reports no success

### Requirement: Keys-based steer falls back to backend delivery

When the resolved adapter declares its steer mechanism as `keys` and its steer mechanism returns no command, the dispatcher SHALL deliver the text to the agent through the target backend's message delivery, and SHALL print a warning naming the degraded (keystroke) mechanism. When the backend's delivery reports failure (returns `false` — for example a headless backend that cannot send keys), the dispatcher SHALL exit 1 with a message naming the target and that the backend could not deliver the keystroke steer; it SHALL NOT treat a failed delivery as success.

#### Scenario: Claude steer delivers via backend keystrokes

- **WHEN** the user runs `orch steer <claude-target> "focus on tests"` and the claude adapter declares steer `keys`
- **THEN** the text is delivered to the pane via the backend and a warning names the keystroke mechanism, exit 0

#### Scenario: Keys steer on a backend that cannot deliver fails loudly

- **WHEN** the user runs `orch steer <claude-target> "focus on tests"`, the claude adapter declares steer `keys`, and the target's backend delivery returns `false` (e.g. a headless backend with no keystroke channel)
- **THEN** the command exits 1 with a message naming the target and the failed keystroke delivery, and prints no success line

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

### Requirement: Lifecycle verbs route through a declared adapter mechanism

The session-lifecycle verbs — `orch reset`, `orch reload`, `orch restart` — SHALL resolve the target's recorded adapter and obtain the action's mechanism from a lifecycle capability declared on the adapter port, rather than delivering a hardcoded provider slash-command. An adapter's native lifecycle commands (pi's `/new`, `/reload`, `/quit`) SHALL live only inside that adapter. When the resolved adapter declares no lifecycle mechanism for the requested verb, orch SHALL exit 1 naming the target, the adapter, and the unsupported lifecycle action; it SHALL NOT deliver a meaningless keystroke to a foreign agent nor report success. No lifecycle verb SHALL branch on the adapter's id.

#### Scenario: Resetting a pi agent clears via pi's declared mechanism

- **WHEN** the user runs `orch reset <pi-target>`
- **THEN** the pi agent's session is cleared using the reset command the pi adapter declares, and the verb waits for the pi bridge to report ready, exiting 0 — with the `/new` string produced only inside the pi adapter

#### Scenario: A lifecycle verb unsupported by the adapter fails loudly

- **WHEN** the user runs `orch reset <target>` (or `reload`/`restart`) and the target's adapter declares no lifecycle mechanism for that verb
- **THEN** the command exits 1 naming the target, the adapter, and the unsupported lifecycle action, and delivers nothing to the agent

### Requirement: A missing adapter identity is an error, never a default

When a control or lifecycle command resolves a target whose presence record and spawn registry carry no adapter identity, orch SHALL exit 1 naming the target and the missing identity. It SHALL NOT fall back to any default adapter's strategy.

#### Scenario: Identity-less target is refused, not treated as pi

- **WHEN** a presence record has no `agent` field and no spawn-registry adapter, and the user runs `orch answer <target> "yes"` (or `orch reset <target>`)
- **THEN** the command exits 1 naming the target and the absent adapter identity, and no adapter mechanism is invoked

