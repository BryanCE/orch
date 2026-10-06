Adopt an orphan to drive it from your session. An orphan is an agent that something spawned
and that no live agent holds, such as a worker whose terminal closed. Run `orch adopt` with
no names to list the orphans, then name the ones you take.

    orch adopt
    orch adopt api-types api-routes

A terminal or a harness session is never an orphan, so adopt never takes one. An agent a
live holder leases must be released first with `orch detach`.

Plan your work around agents you spawned or adopted. Another session's agents stay theirs:
drive verbs against them are refused, and their orchestrator may close them at any time.
