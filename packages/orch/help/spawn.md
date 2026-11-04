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
- Give edits to the same files to one agent. Reach for `--worktree` when parallel agents
  might touch the same files by accident, then collect with `orch review`. Each agent gets
  the branch `orch/<name>`, forked from what is checked out here, and sits in the same tab
  and the same `orch status` as any other agent.
- `--worktree-provider worktrunk` makes the worktree with `wkt`, so its location template
  and its hooks apply. `worktrees.provider` sets the default.
- A worktree holds no gitignored files. Dependencies need a worktrunk hook, or the agent
  installs them itself.
- Outside a plexer the agents run headless and need `--prompt` or `--file`.
- A refused spawn creates nothing and names the setting. `orch status --capacity` shows room.
- `STALLED <handle> <name>` exits 1: its bridge never attached. The task still arrives once
  it connects, but the model is unset: run `orch model <name> <model>` then, or `orch restart <name>`.
