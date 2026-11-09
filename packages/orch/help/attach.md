Turn this terminal into a view of the agent's live screen: what it shows now, scrollback
included, then everything it prints. What you type goes to the agent, and resizing the terminal
resizes its screen. The title names the agent and the host it runs on.

    orch attach api-routes

This machine's orchd carries the screen wherever the agent runs: from its own terminal holder,
or over the link from the orchd of the host that runs it. Only an agent orchd holds in a
terminal has a screen to attach to.

Press the detach key, Ctrl-] unless the `attach.detach_key` setting says otherwise, to stop
viewing. The agent keeps running, and `orch attach` shows it again. Closing the terminal
detaches the same way. A viewer that reads too slowly never holds the agent up: its backlog is
dropped and it gets a fresh screen once it catches up (`attach.queue_bytes`).

The view ends on its own when the agent exits, or when the host it runs on goes offline.
