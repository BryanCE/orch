## ADDED Requirements

### Requirement: Codex presence writer
orch SHALL ship a Codex presence writer so a codex agent surfaces state and results through the presence protocol in every backend. A notify shim, invoked on codex's `agent-turn-complete` event, SHALL write `status.json` and (when the turn produced assistant text) `result.json` under `$ORCH_DIR/agents/<key>/`, stamping the current `schema` and `agent` = `codex`. Because codex fires the completion event only for a settled successful turn and its notify record carries no exit code, the shim SHALL feed that completion record into the adapter's state detection with a synthetic successful exit code, so a completed turn resolves to state `done` and never `idle`. For detached/headless codex, orch SHALL parse the captured codex `--json` output through the codex adapter to derive state and final text. Codex's event vocabulary (`agent-turn-complete`, `last-assistant-message`) SHALL be decoded only within the codex adapter; the shim SHALL NOT re-implement it. Absence of a notify event SHALL NOT be reported as `blocked`.

#### Scenario: Codex turn completion is visible
- **WHEN** a codex agent spawned by orch (with `ORCH_AGENT_KEY` set) completes a turn and its notify shim runs
- **THEN** `orch status <target>` shows the agent with `AGENT` = `codex` and state `done` — the shim supplies a synthetic successful exit code so the completion event resolves to `done`, not `idle` — and `orch result <target>` prints the turn's final assistant text

#### Scenario: Headless codex result harvested from session output
- **WHEN** a codex agent is run detached and finishes, with its `--json` output captured to the log path the headless backend recorded at spawn
- **THEN** `orch status --json` for that agent shows a non-`unknown` state and its last assistant text, both derived from the codex adapter parsing the output at that recorded path rather than from a pi-specific parser or a directory-scan guess

#### Scenario: A non-orch codex session writes nothing
- **WHEN** the codex notify shim runs without `ORCH_AGENT_KEY` in the environment
- **THEN** it exits 0 and writes no presence files

### Requirement: Headless session log path is recorded for harvest
The headless backend SHALL record the exact path of the captured agent stdout log at spawn time — in the spawn registry record (a `log` field) and/or the agent's `status.json` — so later `orch status`/`orch result` can locate it deterministically. The view layer SHALL pass that recorded path to the resolved adapter's session parsing as `sessionPath`. Detached-agent state and result harvest SHALL derive from that recorded path and SHALL NOT fall back to scanning a directory for the newest log; when no log path was recorded, the adapter's session view SHALL degrade to `undefined` (state falls back to `backendStatus`) and SHALL NOT throw. (Headless logs live flat under `$ORCH_DIR/logs/<key>-<timestamp>.log`, not under `$ORCH_DIR/agents/<key>/`, so a per-agent-dir scan would find nothing.)

#### Scenario: Headless log path reaches the adapter as sessionPath
- **WHEN** the headless backend spawns a detached agent and later `orch status`/`orch result` runs for it
- **THEN** the log path recorded at spawn (registry `log` field and/or `status.json`) is passed to the resolved adapter's `readSessionView`/`extractResult` as `sessionPath`, and the harvested state/text come from parsing that exact file — with no directory-scan fallback

### Requirement: Adapter integration install
Each adapter SHALL install its own integration through the port's `installShim()`, and SHALL do so idempotently and additively: re-running SHALL NOT remove or overwrite another adapter's integration or the user's unrelated configuration. The pi integration SHALL build and link the bridge extension bundle; the claude integration SHALL merge its `settings.json` hooks. Because codex's `notify` config key holds exactly one program (unlike claude's hooks array or pi's extensions directory, both additive), the codex integration SHALL register the orch shim through codex's per-spawn notify mechanism (spawn flag or environment variable) where the targeted codex version exposes one; where it does not, it SHALL set codex's top-level `notify` key to the orch shim ONLY when that key is empty. A pre-existing foreign (non-orch) `notify` value SHALL NOT be overwritten: the integration SHALL leave the user's value unchanged, warn, and report the resulting codex presence-capability gap so `orch setup` surfaces it and `orch doctor` flags it. All other codex configuration SHALL be preserved. `orch setup` SHALL install the pi and claude integrations through their adapter's `installShim()`; the codex `installShim()` SHALL be provided on the port for setup to invoke without any adapter-id branching at the call site.

#### Scenario: Re-running pi install is idempotent
- **WHEN** the user runs `orch setup --agent pi` twice
- **THEN** the pi bridge bundle is linked into the pi extensions directory once, with the second run reporting it already configured and adding no duplicate

#### Scenario: Codex notify install is additive
- **WHEN** the codex adapter's `installShim()` runs against a `~/.codex/config.toml` that already contains unrelated codex keys and no `notify` value
- **THEN** the top-level `notify` key points at the orch codex shim and every pre-existing codex key is retained unchanged, and re-running makes no further edit

#### Scenario: Codex notify install refuses to clobber a foreign notify program
- **WHEN** the codex adapter's `installShim()` runs against a `~/.codex/config.toml` whose top-level `notify` key already points at a non-orch program
- **THEN** it leaves the user's `notify` value unchanged, prints a warning naming the conflict, and reports a codex presence-capability gap (surfaced by `orch setup` and flagged by `orch doctor`), rather than overwriting the user's program

## MODIFIED Requirements

### Requirement: Presence protocol as the uniform contract
Every adapter SHALL surface its agent's state through the presence protocol (`$ORCH_DIR/agents/<key>/status.json`, `result.json`, and where supported `inbox.jsonl`, `question.json`/`answer.json`), including a `schema` version and an `agent` field identifying the adapter. Core commands (`status`, `events`, `result`, `wait`, `questions`) SHALL operate on presence data only, never on agent-specific formats. The displayed agent id SHALL come from the presence record or spawn registry, never a hardcoded default. When an agent has no live presence writer, view fallbacks (state, model, cost, task, last text) SHALL be derived from the resolved adapter's own session parsing, gated on that adapter's declared `sessionTail` capability — never from a parser hardcoded to one adapter.

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

## ADDED Requirements

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
