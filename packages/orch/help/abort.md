Use abort when an agent is stuck in a slow or wrong step and a steer would wait behind it.
It presses Escape twice to cancel the current turn, then steers with the text, so the agent
moves to the new instruction with no gap. That turn's work is lost; put what to keep in the
text. Any caller may abort any agent, whoever holds its lease.

    orch abort orca-cli "Stop the repo-wide grep. Write cli.ts from what you have read."
