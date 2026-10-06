Clear leftovers after a crash or a long session: agent directories that name no agent, and
queued writes to agents that are gone. Ended agents stay as history until the daemon sweeps
them. Reach for `--all` to delete dead agents' records now, and `--worktrees` to remove
worktrees no agent runs in.

    orch clean --worktrees

`--all` with `--worktrees` also discards unmerged commits. Run `orch review` first to keep
that work. `--all` skips live agents; close them first. A spawned agent is refused and asks
the human or its orch to run clean.
