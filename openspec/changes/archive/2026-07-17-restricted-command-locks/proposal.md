# Proposal: restricted-command-locks

## Why

Heavy repo-wide commands — `bun test`, `bun run check`, linters — are locked resources on this machine: several agents running them concurrently thrash CPU/RAM (today's incident) and produce garbage results while other agents are mid-edit. Discipline ("one verify pass after all agents report done") lives only in orchestrator prompts today; nothing enforces it. Agents also reach for verification they don't need — reviewing and checking is the orchestrator's job.

## What Changes

- Add `locked_commands: string[]` to `$ORCH_DIR/settings.json`: the user declares which commands are locked resources on their machine (e.g. `"bun test"`, `"bun run check"`, lint commands). Matching is prefix-based on the normalized command line.
- Add a machine-wide command lock: exactly ONE holder at a time may run a locked command. Primitives live in `src/cmd-lock.ts`; a dead holder's lock is reclaimable (pid-liveness), never a permanent deadlock.
- CLI verbs: `orch lock run -- <argv>` (acquire → run → release, waiting its turn), `orch lock check -- <argv>` (probe: exit 3 when the command is locked and the lock is held elsewhere), `orch lock status`, and a human force-release.
- Enforcement leg, capability-gated per adapter: the pi bridge extension intercepts bash tool calls matching `locked_commands` and transparently acquires/releases the lock around them — one agent at a time even if the agent never heard of the lock. Adapters without a pre-tool interception seam record a capability gap (worker-prompt guidance only) rather than pretending to enforce.
- Worker prompts gain a clause naming the user's locked commands and the `orch lock run` verb, so agents that genuinely need a locked command acquire the lock instead of free-running it. The default posture stays: agents do their task; the orchestrator runs the reviews.
- No `locked_commands` configured = no locking (current behavior by omission).

## Capabilities

### New Capabilities
- `command-locks`: user-declared locked commands in settings.json plus a machine-wide single-holder lock that serializes them across all agents, with per-adapter transparent enforcement where the adapter exposes an interception seam.

### Modified Capabilities

<!-- none — composes onto settings, worker prompts, and the bridge extension without changing existing requirements -->

## Impact

- `src/config.ts`: `locked_commands` in the one settings schema.
- `src/cmd-lock.ts` (new): acquire/release/probe primitives with stale-holder reclaim.
- `src/commands/lock.ts` (new) + routing line in `src/commands/index.ts`: the `orch lock` verb family.
- Bridge extension (pi): bash tool interception wrapping matched commands in the lock.
- Worker prompt composition: locked-commands clause.
- Tests: `test/cmd-lock.test.ts` primitives + matcher + CLI probe exit codes + bridge wrap behavior.
