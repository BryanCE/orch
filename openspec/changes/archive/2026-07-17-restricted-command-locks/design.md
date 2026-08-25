# Design: restricted-command-locks

## Context

Multiple orchestrators and their fleets share one machine. `bun test` / `bun run check` / linters are repo-wide, CPU-heavy, and meaningless while the tree is mid-edit. The user knows which commands are locked resources on their machine; orch must let them declare that once and have it hold for every agent, on every adapter, without per-prompt discipline. Implementation of the primitives and the pi enforcement leg is in flight (`src/cmd-lock.ts`, `locked_commands` schema, `orch lock run`/`check`, bridge interception) — this design pins the behavior those pieces must satisfy.

## Goals / Non-Goals

**Goals:**
- One settings key (`locked_commands: string[]`), user-owned, machine-specific.
- Exactly one holder machine-wide; everyone else waits or backs off — never two concurrent `bun test` runs.
- Transparent enforcement where the adapter allows interception (pi bridge); honest capability-gap reporting where it does not.
- Crash-safe: a dead holder never deadlocks the machine.
- Agents keep working their task; the orchestrator remains the default runner of reviews/checks. The lock is for the case where a locked command genuinely serves the agent's task.

**Non-Goals:**
- No per-command or per-workspace lock granularity in v1 — one machine-wide mutex covers all locked commands (they contend for the same CPU/RAM anyway).
- No scheduling/priority beyond first-come order.
- No enforcement over the human user's own shell — `locked_commands` governs orch-spawned agents and orch-run commands.

## Decisions

- **D1 — Settings shape.** `locked_commands: z.array(z.string())` optional in the one settings schema (snake_case like `queue.max_retries`). Matching: normalize whitespace, prefix-match the agent's command line against each entry (`"bun test"` matches `bun test test/foo.test.ts`). Empty/absent = feature off.
- **D2 — Lock primitives** (`src/cmd-lock.ts`). Single machine-wide lock under `$ORCH_DIR` (one lock file, atomic create), holder record = `{ pid, key?, command, acquiredAt }`. Stale reclaim: holder pid dead → lock is free (same pid-liveness join presence uses). Node-safe, no daemon dependency for v1 — file-atomicity (`O_EXCL`) on the local `$ORCH_DIR` is sufficient because `$ORCH_DIR` is machine-local (not `/mnt/c`); revisit daemon brokering only if contention outgrows it.
- **D3 — CLI surface** (`src/commands/lock.ts`). `orch lock run -- <argv>`: acquire (waiting with backoff), exec argv, release on exit either way. `orch lock check -- <argv>`: exit 0 = not a locked command or lock free; **exit 3 = locked command and lock held elsewhere** (a distinct, scriptable code). `orch lock status`: holder pid/key/command/age. `orch lock release --force`: human override naming the evicted holder.
- **D4 — Enforcement is capability-gated, never adapter-id branched.** The pi bridge extension intercepts bash tool calls, matches against `locked_commands`, and wraps matched runs in acquire/release transparently — the agent needs no protocol knowledge. An adapter with no pre-tool seam (codex today; claude unless a PreToolUse hook leg is added later) gets the worker-prompt clause only, and doctor/setup surface the gap honestly — no silent pretend-enforcement.
- **D5 — Worker prompt clause.** When `locked_commands` is non-empty, the composed worker header names the locked commands and instructs: prefer reporting for the orchestrator to verify; when a locked command genuinely serves the task, run it as `orch lock run -- <cmd>`. Composes through the existing capability-aware header, not a new constant.
- **D6 — Waiting semantics.** `orch lock run` waits (bounded backoff, generous default timeout, loud timeout error naming the holder). The bridge interception waits the same way — a queued `bun test` behind another agent's run is the intended behavior, not an error.

## Risks / Trade-offs

- **File-lock portability**: `O_EXCL` create is portable node; `$ORCH_DIR` lives on the local filesystem (`~/.orch`), not a 9p mount, so atomicity holds. If `$ORCH_DIR` is ever relocated onto a network mount this needs the daemon-brokered variant.
- **Prefix matching is coarse** (`"bun test"` also matches `bun tester`): normalized token-boundary matching mitigates; entries are user-authored, so false positives are visible and fixable in settings.
- **Unenforceable adapters** can still free-run locked commands (codex). Accepted: the gap is reported, the prompt clause covers the honest path, and the pi fleet — the bulk of spawned agents — is hard-enforced.
- **Two lock-related features touch the settings schema together** (`agent-spawn-limits` adds `limits`): both add fields to the ONE live schema; `SETTINGS_SCHEMA` stays `1` pre-publish (never bumped — a bump caused a stale-binary mismatch and was reverted). Each change just adds its optional field and fixes writers/readers/tests.
