Start one agent per name, all in one tab. Spawn when no idle agent can take the task through
`orch dispatch`. Name each agent for its part of the job.

    orch spawn api-types api-routes --tab api \
      --file specs/types.md --file specs/routes.md --model luna:high

Spawn returns once every agent is connected to orchd; dispatch or monitor right away.

Traps:
- `--prompt`, `--file`, and `--model` take one value for all, or one per name in order.
- Without `--tab`, the agents land in a new tab with a random label like `elk-glacier-01`.
  Name the tab after the area of work; an existing label gets the new panes.
- A path written in the prompt does not move the agent. Reach for `--dir`.
- `--host <name>` runs the agents on that host and needs `--dir`: a path on that host. They report here and you drive them from here. `orch host` lists the hosts.
  Inside a plexer, each agent also gets a pane here, in the tab, running `orch attach <agent>`
  to show its screen. Closing that pane only detaches; the agent keeps running. With no
  plexer, no pane opens and the spawn still succeeds.
- Give edits to the same files to one agent. Reach for `--worktree` when parallel agents
  might touch the same files by accident, then collect with `orch review`. Each agent gets
  the branch `orch/<name>`, forked from what is checked out here, and sits in the same tab
  and the same `orch status` as any other agent.
- `--worktree-provider worktrunk` makes the worktree with worktrunk, so its location
  template and its hooks apply. `worktrees.provider` sets the default. Orch runs
  `WORKTRUNK_BIN`, else the first of `worktrees.worktrunk_commands` it finds: a name, a path,
  or a command like `git wt`. A shell alias is invisible to it, so write out what it runs.
- A worktree starts without gitignored files. List the ones agents need in `.worktreeinclude`,
  gitignore syntax, and orch brings them in with either provider before the agent starts.
  With worktrunk, `pre-start` hooks finish before the agent launches and `post-start` hooks
  run beside it, so put anything an agent depends on in `pre-start`.
- Outside a plexer the agents run headless and need `--prompt` or `--file`.
- A refused spawn creates nothing and names the setting. `orch status --capacity` shows room.
- `STALLED <handle> <name>` exits 1: its bridge never attached. The task still arrives once
  it connects, but the model is unset: run `orch model <name> <model>` then, or `orch restart <name>`.
