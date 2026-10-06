Start a fresh session in the same pane to clear the context without sending work. To clear
and send a task in one step, use `orch dispatch`, which clears first.

    orch reset api-routes --model luna:high

With no `--model`, the agent keeps the model it holds. reload keeps the session, reset
starts a new session, restart starts a new process.
