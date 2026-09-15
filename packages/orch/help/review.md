Review done worktree agents. With `--worktree` at spawn, each agent commits on its own
branch. `list` shows done agents with commits ahead of their base, `approve` merges and
removes the worktree, `reject -m` re-dispatches feedback into the same worktree. With no
subcommand, review walks it interactively.
