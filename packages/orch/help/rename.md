Set the agent's name, shown in the NAME column, on monitor lines, and on the pane border.
Rename an agent in the same message that gives it new work, so every line names what it
holds now. The session, model, and your watch on it stay as they were.

    orch rename api-routes api-auth

Reach for `--pane` only when the border must read differently from the name. When two live
agents share a name, address one by its key from `orch status --json`, then rename it.
