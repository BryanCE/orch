# agent-adapters Specification

## Purpose
TBD - created by archiving change make-orch-general-purpose. Update Purpose after archive.
## Requirements
### Requirement: Adapter selection
orch SHALL support named agent adapters (`pi`, `claude`, `codex`), selectable per spawn via `--agent <id>` on `orch spawn`, `orch tile`, and `orch queue add`, with the default taken from config (`defaults.adapter`, built-in default `pi`). The chosen adapter SHALL be recorded in the spawn registry so later commands resolve it without re-specification. Agent adapter selection SHALL be independent of the selected plexer backend.

#### Scenario: Spawn a Claude Code fleet
- **WHEN** the user runs `orch spawn 2 --agent claude --tab Team1`
- **THEN** two panes launch the Claude Code CLI (not pi), and `orch status` shows them with `AGENT` = `claude`

#### Scenario: Unknown adapter is rejected
- **WHEN** the user runs `orch spawn 1 --agent aider`
- **THEN** orch exits non-zero with a message listing the supported adapter ids

#### Scenario: Agent selection is backend-independent
- **WHEN** the user runs `orch spawn 1 --backend tmux --agent claude`
- **THEN** orch selects the tmux backend and Claude Code adapter independently, with neither adapter selection nor backend selection requiring a hard-coded branch for the other

### Requirement: Presence protocol as the uniform contract
Every adapter SHALL surface its agent's state through the presence protocol (`$ORCH_DIR/agents/<key>/status.json`, `result.json`, and where supported `inbox.jsonl`, `question.json`/`answer.json`), including a `schema` version and an `agent` field identifying the adapter. Core commands (`status`, `events`, `result`, `wait`, `questions`) SHALL operate on presence data only, never on agent-specific formats. The displayed agent id SHALL come from the presence record or spawn registry, never a hardcoded default. When an agent has no live presence writer, view fallbacks (state, model, cost, task, last text) SHALL be derived from the resolved adapter's own session parsing, gated on that adapter's declared `sessionTail` capability — never from a parser hardcoded to one adapter. The adapter SHALL receive agent identity through an opaque orch-provided environment key and MUST NOT obtain it from a plexer-specific variable.

#### Scenario: Mixed fleet in one status table
- **WHEN** a pi agent and a claude agent are both running and `orch status --json` is invoked
- **THEN** both entries appear with the same fields (state, task, cost when known, agent id) sourced from their presence dirs

#### Scenario: Result extraction is adapter-neutral
- **WHEN** a claude agent finishes a dispatched task
- **THEN** `orch result <target>` prints the final assistant text from that agent's `result.json`

#### Scenario: A presence-only agent is labeled by its real adapter
- **WHEN** a codex agent has written presence but is not enumerated by the backend, and `orch status --json` is invoked
- **THEN** its `AGENT` column reads `codex` (from the presence/spawn record), not `pi`

#### Scenario: Session fallbacks come from the resolved adapter
- **WHEN** an agent whose adapter declares `sessionTail` has a native session/log but no live presence writer, and `orch status` is invoked
- **THEN** its state and last text are produced by that adapter's session parsing, and an adapter without `sessionTail` instead shows the backend-reported status

#### Scenario: Presence identity uses orch env
- **WHEN** an agent adapter starts under any supported backend
- **THEN** it reads its opaque identity from the orch-provided environment key and never reads `HERDR_PANE_ID` or another plexer-specific identity variable

### Requirement: Declared capabilities with explicit degraded modes
Each adapter SHALL declare its capabilities (steer mechanism, blocking ask support, model switching, session tail). A command relying on an unsupported capability SHALL either fall back with a printed warning (e.g. steer via pane keystrokes when no inbox exists) or fail fast with exit code 1 and an actionable message — never silently no-op.

#### Scenario: Steer falls back with a warning
- **WHEN** the user runs `orch steer <claude-target> "focus on tests"` and the claude adapter declares steer capability `keys`
- **THEN** the text is delivered via pane keystrokes and a warning names the degraded mechanism

#### Scenario: Unsupported model switch fails fast
- **WHEN** the user runs `orch model <codex-target> openai/gpt-x` and the codex adapter does not support model switching
- **THEN** orch exits 1 with a message stating the codex adapter cannot switch models

### Requirement: Claude Code adapter
orch SHALL ship a Claude Code adapter whose shim (hook scripts installed through the adapter's `installShim()`) writes presence protocol files for session start, blocked/notification states, and final results on stop. The shim SHALL be installable without affecting the user's other Claude Code hooks. Claude presence granularity SHALL be documented honestly as coarse: `working` on session start, `blocked` on a notification, and `done`/`idle` on stop, with no mid-run tool, token, or cost transitions. Whether Claude's `settings.json` hooks fire under headless print mode (`claude -p`) SHALL be verified against the targeted Claude Code version, not assumed. If they fire, headless claude presence works as specified above. If they do NOT fire, claude result harvest SHALL fall back to `extractResult` over the recorded headless `-p` log (per the headless log-path requirement), and the see/steer capabilities SHALL surface as loud, documented gaps in `-p` mode — an explicit status such as `no presence in -p mode` and a non-zero exit on a steer attempt — never a silent `-`.

#### Scenario: Claude agent lifecycle is visible
- **WHEN** a claude agent spawned by orch starts working on a prompt and later finishes
- **THEN** its `status.json` shows `working` during the run and `done` after, and `result.json` contains the final text

#### Scenario: Setup installs the shim additively
- **WHEN** the user runs `orch setup` with an existing Claude Code hooks configuration
- **THEN** orch's hooks are merged in without removing or overwriting unrelated user hooks

#### Scenario: Mid-run granularity is coarse, not misreported
- **WHEN** a claude agent is between session start and stop, invoking tools
- **THEN** its `status.json` state remains `working` and does not claim per-tool or per-token transitions it cannot observe

#### Scenario: Headless claude presence is verified, its gaps loud
- **WHEN** a claude agent is run headless with `claude -p`, where hook firing under print mode has been checked against the targeted version
- **THEN** if the hooks fire, its `status.json` reflects `working`/`done` as specified; and if they do not, `orch result` still returns the final text via the adapter parsing the recorded `-p` log, while a steer/see attempt reports an explicit unsupported-in-`-p` status and exits non-zero rather than showing a silent `-`

### Requirement: pi adapter preserves existing behavior
The pi adapter SHALL retain current behavior exactly: `orchestrator-bridge.ts` as the presence writer, inbox steering, `orch_ask` blocking questions, model/thinking switching via inbox commands, and result extraction — with no changes required to existing user workflows.

#### Scenario: Existing pi flow unchanged
- **WHEN** a user upgrades orch and runs their existing `orch spawn 3 --tab work` + `orch dispatch pi-1 "task"` flow with no config file
- **THEN** behavior is identical to pre-adapter orch (pi launched, worker header applied, presence-based status)

### Requirement: Worker prompt references only supported tools
The worker prompt header SHALL reference the `orch_ask` tool only for adapters that declare the blocking-ask capability. A worker launched under an adapter without ask support SHALL receive the base worker header with no instruction to call `orch_ask`. This SHALL hold wherever the worker prompt is composed — both the interactive dispatch path (`orch run`) and the work-loop task-assignment path (`orch work`) — each deriving the `orch_ask` clause from the capabilities of the adapter resolved for the target agent, never from a fixed default.

#### Scenario: Codex worker prompt omits orch_ask
- **WHEN** a worker is dispatched to a codex agent via `orch run`, whose adapter declares no ask capability
- **THEN** the worker prompt contains the base `[orch worker]` header and does not instruct the agent to call `orch_ask`

#### Scenario: Work-loop assignment to a codex worker omits orch_ask
- **WHEN** the work loop assigns a queued task to a running codex worker and composes its dispatch prompt
- **THEN** the composed prompt uses the base `[orch worker]` header with no `orch_ask` instruction, because the clause is selected from the resolved codex adapter's absent ask capability at the assignment site

#### Scenario: pi worker prompt keeps orch_ask
- **WHEN** a worker is dispatched to a pi agent, whose adapter declares ask support
- **THEN** the worker prompt instructs the agent to call `orch_ask` for decisions it cannot make itself

### Requirement: Agent identity is an opaque orch key
The orch spawn surface SHALL mint or receive an opaque identity key for each agent, pass it to the adapter through a documented orch-provided environment variable, and require the adapter to use that key for presence paths. The key MUST NOT be a plexer-specific value such as `HERDR_PANE_ID`, and agent adapters MUST NOT reference herdr or tmux types, variables, or commands.

#### Scenario: Adapter runs on multiple backends
- **WHEN** the user spawns the same agent adapter on herdr, tmux, and headless backends
- **THEN** each process receives the same kind of orch-provided opaque identity environment key and the adapter code and behavior do not reference the concrete backend

#### Scenario: Missing opaque key fails safely
- **WHEN** an agent adapter starts without the orch-provided identity environment key
- **THEN** it exits non-zero or writes a clear error state instead of deriving identity from `HERDR_PANE_ID` or another plexer variable

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

### Requirement: Each harness's transcript decoding exists in exactly one module

The logic that decodes a harness's transcript/session text (content extraction, assistant-text extraction, JSONL tail scanning) SHALL exist in exactly one shared, node-safe module imported by both the adapter and any shim that reads the same format. A shim SHALL NOT carry its own copy of a parser the adapter also implements; two readers of the same wire format SHALL be the same code.

#### Scenario: Shim and adapter read a transcript identically

- **WHEN** a claude agent's transcript contains an entry with empty-string content parts, and both the claude shim (writing presence) and the claude adapter (reading the session as fallback) decode it
- **THEN** both produce the identical extracted text, because both call the one shared transcript module

#### Scenario: Core session tail goes through the adapter port

- **WHEN** the user runs `orch tail <claude-target>` (or against a codex target)
- **THEN** the session entries are produced by that target's resolved adapter through the port's session-view surface, not by another harness's parser, and a pi-format parser is never applied to a non-pi session

