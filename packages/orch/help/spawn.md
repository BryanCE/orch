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
  might touch the same files by accident, then collect with `orch review`.
- Outside a plexer the agents run headless and need `--prompt` or `--file`.
- A refused spawn creates nothing and names the setting. `orch status --capacity` shows room.
- `STALLED <handle> <name>` exits 1: its bridge never attached. The task still arrives once
  it connects, but the model is unset: run `orch model <name> <model>` then, or `orch restart <name>`.
