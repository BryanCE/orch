# The agent model

The rest of Rule 11 in `CLAUDE.md`, binding like it. Relative paths are inside `packages/orch/` unless they start with `packages/`.

- One entity. Orchestrator, worker, and a Claude session driving orch are all agents. No second id space, no second liveness mechanism.
- Five facts, never welded. Identity is a minted id and nothing else. Provenance is who spawned it, immutable. Ownership is a lease. Environment is where it is (host, cwd, repo, worktree, branch, space, plexer, handle, OS side), mutable. Program is what it runs (harness, form, model, thinking), mutable. No lifetime column, and no fact that welds two of these together.
- A change of form is the same agent. A restart from `tui` to `acp` or back closes one `agent_forms` row and opens the next, and keeps the id, the lease and the conversation. This applies to form only.
- Everything has an environment. orch's grouping is a space. "Workspace" is a plexer's word and never appears in orch's model, CLI, or UI.
- Never encode environment into identity. No `<backend>~<workspace>~<handle>` key. `"local"` is a missing value with a name. `wF` is herdr's id. Both become columns.
- Delivery and read are orch's mechanism, over the daemon socket. A pane is a shortcut. An outbox row pushed down the agent's link (a bridge, an ACP session) and acked back needs no screen.
- Branch on declared capabilities, never on an environment id. Adding an environment edits zero renderers, commands, or policy.
- Ownership is mutual exclusion, not authorization. `dispatch`, `steer`, `model`, `reset` are gated against a live foreign holder. `abort`, `close`, `reap` are never gated. The human can always kill.
- Work survives its spawner. No lifetime, no `--detached`, no fate-sharing, no grace timer. `detach` means release the lease.
- Normalize. No wide agent row. Instants are INTEGER epoch millis. Prefer a nullable instant over a boolean. `NULL` means not applicable, never a sentinel string.
