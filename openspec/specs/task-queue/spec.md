# task-queue Specification

## Purpose
Persist tasks, assign them to eligible idle agents, retry failures, and expose queue history.
## Requirements
### Requirement: Enqueue tasks
`orch queue add "<task>"` SHALL append a task to a persistent queue under `$ORCH_DIR/queue/` and print its task id. Options SHALL include `--agent <adapter>`, `--model <spec>`, `--cwd <path>`, and `--worktree`. `orch queue list [--json]` SHALL show queued, running, done, and failed tasks with their ids, and `orch queue cancel <id>` SHALL cancel a not-yet-claimed task.

#### Scenario: Add and list
- **WHEN** the user runs `orch queue add "fix the failing tests"` followed by `orch queue list`
- **THEN** the new task appears with state `queued` and a printed id

#### Scenario: Cancel a queued task
- **WHEN** the user cancels a task that has not been claimed
- **THEN** its state becomes `cancelled` and no runner will dispatch it

### Requirement: Idle-agent assignment
`orch work` SHALL run a queue runner that assigns queued tasks (FIFO) to idle agents matching the task's constraints (adapter, cwd), dispatching through the agent's adapter. When no agent is idle, tasks SHALL remain queued until one becomes idle. `--once` SHALL process assignments until the queue is empty or no agent is available, then exit; the default mode runs until interrupted.

#### Scenario: Queue drains as agents free up
- **WHEN** 3 tasks are queued, 2 agents are idle, and `orch work` runs
- **THEN** 2 tasks dispatch immediately and the third dispatches when the first agent returns to idle

#### Scenario: No idle agents means waiting, not failure
- **WHEN** a task is enqueued while all agents are working
- **THEN** the task stays `queued` and `orch queue list` reflects that state

### Requirement: Claim atomicity
Task claiming SHALL be atomic such that two concurrently running `orch work` processes can never assign the same task twice.

#### Scenario: Two runners, one claim
- **WHEN** two `orch work` processes race to claim the same queued task
- **THEN** exactly one dispatches it and the other observes it as claimed

### Requirement: Retry on error
When a dispatched task's agent settles in `error` (or its process dies mid-run), the runner SHALL re-queue the task up to `queue.max_retries` times (config, default 1), then mark it `failed` with the last error recorded.

#### Scenario: Transient failure retries
- **WHEN** a task's first run ends in state `error` and max_retries is 1
- **THEN** the task is dispatched once more, and if it succeeds its final state is `done`

#### Scenario: Exhausted retries fail visibly
- **WHEN** a task fails more times than max_retries allows
- **THEN** `orch queue list` shows it `failed` with the last error text

### Requirement: Persistent history
Task outcomes (task text, assigned agent, timestamps, retries, final state, result reference) SHALL be recorded append-only and queryable via `orch queue history [--json]`, surviving orch restarts.

#### Scenario: History outlives the session
- **WHEN** tasks complete, the machine reboots, and the user runs `orch queue history`
- **THEN** completed tasks are listed with their outcomes and assigned agents

