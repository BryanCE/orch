# command-locks

## ADDED Requirements

### Requirement: User declares locked commands in settings
`$ORCH_DIR/settings.json` SHALL accept an optional `locked_commands: string[]` listing command prefixes that are locked resources on this machine. Matching SHALL be whitespace-normalized prefix matching at token boundaries. An absent or empty list SHALL disable command locking entirely.

#### Scenario: Locked command list loads
- **WHEN** settings.json contains `"locked_commands": ["bun test", "bun run check"]`
- **THEN** the settings load succeeds and both entries participate in matching

#### Scenario: Token-boundary prefix matching
- **WHEN** `locked_commands` contains `"bun test"`
- **THEN** `bun test test/foo.test.ts` matches and `bun tester` does not

#### Scenario: Omitted list disables locking
- **WHEN** settings.json has no `locked_commands`
- **THEN** no command is treated as locked and no lock is ever required

### Requirement: One machine-wide holder at a time
The command lock SHALL admit exactly one holder machine-wide across all workspaces, agents, and orchestrators. The holder record SHALL carry pid, agent key when present, the command, and acquisition time. A holder whose pid is no longer alive SHALL be treated as stale and its lock reclaimable by the next acquirer — a crashed holder never deadlocks the machine.

#### Scenario: Second acquirer waits its turn
- **WHEN** one agent holds the lock for `bun test` and a second requests it
- **THEN** the second waits and acquires only after the first releases

#### Scenario: Dead holder is reclaimed
- **WHEN** the recorded holder pid is not alive
- **THEN** a new acquirer obtains the lock without human intervention

### Requirement: Lock verbs wrap and probe locked commands
`orch lock run -- <argv>` SHALL acquire the lock (waiting with bounded backoff and a loud timeout error naming the current holder), execute the command, and release on exit — including failure exits. `orch lock check -- <argv>` SHALL exit 0 when the command is not locked or the lock is free, and exit 3 when the command is locked and held elsewhere. `orch lock status` SHALL report the holder. A force release SHALL exist for the human and SHALL name the evicted holder.

#### Scenario: lock run serializes a locked command
- **WHEN** two agents invoke `orch lock run -- bun test` concurrently
- **THEN** the runs execute strictly one after the other and both release the lock afterward

#### Scenario: lock check signals held
- **WHEN** `bun run check` is in `locked_commands` and another process holds the lock
- **THEN** `orch lock check -- bun run check` exits 3

#### Scenario: Release happens on command failure
- **WHEN** a locked command run through `orch lock run` exits non-zero
- **THEN** the lock is released and the wrapper propagates the failure exit

### Requirement: Enforcement is transparent where the adapter allows interception
For adapters exposing a pre-tool interception seam (pi via the bridge extension), bash tool invocations matching `locked_commands` SHALL be wrapped in lock acquire/release transparently — serialization holds even for an agent that never heard of the lock. Adapters without such a seam SHALL NOT pretend to enforce: the gap SHALL be surfaced (setup/doctor capability reporting) and covered by worker-prompt guidance only. Enforcement selection SHALL be capability-gated, never an adapter-id branch in core.

#### Scenario: Pi agent is serialized without cooperation
- **WHEN** a pi agent's bash tool runs `bun test` while another agent holds the lock
- **THEN** the bridge waits for the lock before the command starts, and releases it after

#### Scenario: Unenforceable adapter reports the gap
- **WHEN** an installed adapter exposes no pre-tool interception seam
- **THEN** the capability gap is reported honestly and only prompt-level guidance applies

### Requirement: Worker prompts steer agents away from free-running locked commands
When `locked_commands` is non-empty, composed worker prompts SHALL name the locked commands and instruct agents to prefer leaving verification to the orchestrator, and — when a locked command genuinely serves their task — to run it via `orch lock run`. The clause SHALL compose through the existing capability-aware header.

#### Scenario: Worker header names the locked commands
- **WHEN** `locked_commands` is `["bun test", "bun run check"]` and a worker is dispatched
- **THEN** its header lists both commands and the `orch lock run` form

#### Scenario: No clause when the feature is off
- **WHEN** `locked_commands` is absent
- **THEN** the worker header contains no lock clause
