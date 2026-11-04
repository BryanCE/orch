Review the commits of agents spawned with `--worktree` once they are done, or once you closed
them. Each one committed on its own branch. `approve` lands it on the branch it forked from,
closes the agent and removes the worktree, using the tool that made it. `reject` sends feedback
back into the same worktree, which takes an agent that is still open.

    orch review reject api-routes -m "Keep the old route names."

Bare `orch review` walks every pending one interactively.
