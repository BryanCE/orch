Queue a prompt through orchd with the worker header prepended, onto the session the agent
already has. `orch dispatch` is the normal verb: it clears the session first. `--raw` sends
the exact prompt with no header.
