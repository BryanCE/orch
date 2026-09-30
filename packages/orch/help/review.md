Review the commits of agents spawned with `--worktree` once they are done. Each one committed
on its own branch. `approve` merges it; `reject` sends feedback back into the same worktree.

    orch review reject api-routes -m "Keep the old route names."

Bare `orch review` walks every pending one interactively.
