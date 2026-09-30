A durable task list that `orch work` hands to idle agents. Use it for fan-out where any agent
may take any task: one `add` per task, and the daemon assigns them the moment an agent is idle.

    orch queue add "Port the billing tests to bun:test."

With no scope flag, a task goes to your own fleet: you and the agents you spawned. `--agent`
narrows it to one agent, `--space` widens it to a space.

A failed task retries up to `queue.max_retries` times. A task still claimed by a closed agent
retries into the next agent with that name, so check `orch queue list` before you reuse
fleet names.
