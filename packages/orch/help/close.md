Close the pane. The process ends; the agent's row and its history stay, so `orch result`
and `orch tail` still answer. Only `orch reap` deletes. Closing an agent that already
exited, or one the reaper already deleted, is a no-op success.

Close is never gated by a lease. The human can always kill. `--all` from an unregistered
shell sweeps every agent orch spawned, whoever holds it, and never a pane orch did not
spawn. `--all` from a registered caller (a spawned agent, a harness session, a registered
shell) sweeps only itself, what it spawned at any depth, and what it adopted. A named target
outside that set is refused, and the refusal names the owner.

Close a tab only when that domain is done. Close-and-respawn cycles per round waste time
and leave dead panes that look idle. Between tasks reuse the agent with `orch dispatch`.
