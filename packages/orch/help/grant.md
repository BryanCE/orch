Approve an action an agent was refused: a command in `gated_commands`, or a spawn that opens
a new space on the human's screen. `orch grant list` shows what is waiting; plain
`orch grant` walks each request, and `orch grant <id>` answers one.

    orch grant k3v9x2pa

Approving asks a yes/no question on a terminal, so only the human can grant. A refused agent
asks the human to run `orch grant <id>`, then runs the exact same command again.
