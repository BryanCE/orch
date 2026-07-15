# agent-adapters Specification

## Purpose
TBD - created by archiving change make-orch-general-purpose. Update Purpose after archive.
## Requirements
### Requirement: Adapter selection
orch SHALL support named agent adapters (`pi`, `claude`, `codex`), selectable per spawn via `--agent <id>` on `orch spawn`, `orch tile`, and `orch queue add`, with the default taken from config (`defaults.adapter`, built-in default `pi`). The chosen adapter SHALL be recorded in the spawn registry so later commands resolve it without re-specification.

#### Scenario: Spawn a Claude Code fleet
- **WHEN** the user runs `orch spawn 2 --agent claude --tab Team1`
- **THEN** two panes launch the Claude Code CLI (not pi), and `orch status` shows them with `AGENT` = `claude`

#### Scenario: Unknown adapter is rejected
- **WHEN** the user runs `orch spawn 1 --agent aider`
- **THEN** orch exits non-zero with a message listing the supported adapter ids

### Requirement: Presence protocol as the uniform contract
Every adapter SHALL surface its agent's state through the presence protocol (`$ORCH_DIR/agents/<key>/status.json`, `result.json`, and where supported `inbox.jsonl`, `question.json`/`answer.json`), including a `schema` version and an `agent` field identifying the adapter. Core commands (`status`, `events`, `result`, `wait`, `questions`) SHALL operate on presence data only, never on agent-specific formats.

#### Scenario: Mixed fleet in one status table
- **WHEN** a pi agent and a claude agent are both running and `orch status --json` is invoked
- **THEN** both entries appear with the same fields (state, task, cost when known, agent id) sourced from their presence dirs

#### Scenario: Result extraction is adapter-neutral
- **WHEN** a claude agent finishes a dispatched task
- **THEN** `orch result <target>` prints the final assistant text from that agent's `result.json`

### Requirement: Declared capabilities with explicit degraded modes
Each adapter SHALL declare its capabilities (steer mechanism, blocking ask support, model switching, session tail). A command relying on an unsupported capability SHALL either fall back with a printed warning (e.g. steer via pane keystrokes when no inbox exists) or fail fast with exit code 1 and an actionable message — never silently no-op.

#### Scenario: Steer falls back with a warning
- **WHEN** the user runs `orch steer <claude-target> "focus on tests"` and the claude adapter declares steer capability `keys`
- **THEN** the text is delivered via pane keystrokes and a warning names the degraded mechanism

#### Scenario: Unsupported model switch fails fast
- **WHEN** the user runs `orch model <codex-target> openai/gpt-x` and the codex adapter does not support model switching
- **THEN** orch exits 1 with a message stating the codex adapter cannot switch models

### Requirement: Claude Code adapter
orch SHALL ship a Claude Code adapter whose shim (hook scripts installed by `orch setup`) writes presence protocol files for session start, state transitions, final results, and blocked/notification states. The shim SHALL be installable and removable without affecting the user's other Claude Code hooks.

#### Scenario: Claude agent lifecycle is visible
- **WHEN** a claude agent spawned by orch starts working on a prompt and later finishes
- **THEN** its `status.json` shows `working` during the run and `done` after, and `result.json` contains the final text

#### Scenario: Setup installs the shim additively
- **WHEN** the user runs `orch setup` with an existing Claude Code hooks configuration
- **THEN** orch's hooks are merged in without removing or overwriting unrelated user hooks

### Requirement: pi adapter preserves existing behavior
The pi adapter SHALL retain current behavior exactly: `orchestrator-bridge.ts` as the presence writer, inbox steering, `orch_ask` blocking questions, model/thinking switching via inbox commands, and result extraction — with no changes required to existing user workflows.

#### Scenario: Existing pi flow unchanged
- **WHEN** a user upgrades orch and runs their existing `orch spawn 3 --tab work` + `orch dispatch pi-1 "task"` flow with no config file
- **THEN** behavior is identical to pre-adapter orch (pi launched, worker header applied, presence-based status)

