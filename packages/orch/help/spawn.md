Start one agent per name, all in one tab. Name each agent for its part of the job.

    orch spawn api-types api-routes api-guards --tab api \
      --file specs/types.md --file specs/routes.md --file specs/guards.md \
      --model luna:high --model luna:low --model luna:high

Per-agent values
  --prompt, --file, and --model take one value for every agent, or one per name in order.
  --with <path> reaches every agent. --with <name>=<path> reaches that agent only.

Where the agents land
  --tab is one area of work (server, client). A tab that already has the label gets the new panes.
  --dir sets the working directory. A path written in the prompt does not move the agent.
  --space files the fleet in an orch space from 'orch space list'.
  --backend <plexer> opens that plexer's home. A human approves it with 'orch grant'.
  Outside a plexer, the agents run headless. Headless needs --prompt or --file.

Before you spawn
  An idle agent takes a new task through 'orch dispatch'. Spawn when that dispatch fails.
  Use --worktree when agents edit the same files. Collect with 'orch review'.
  'orch status --capacity' shows the limits. A refused spawn creates nothing and names the setting.

Output
  Spawn returns once every agent is connected to orchd. Dispatch right away.

    ok      <handle>  <name>
    STALLED <handle>  <name> - bridge never attached; try: orch restart <name>

  A stall exits 1. The stalled agent still gets its task when it connects.
  Its model is not set. Run 'orch model <name> <model>' after it connects.
