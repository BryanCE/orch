Adopt an agent nobody leases, such as one whose spawner detached it or exited, to drive it
from your session. An agent a live holder leases must be released first with `orch detach`.

    orch adopt api-types

Plan your work around agents you spawned or adopted. Another session's agents stay theirs:
drive verbs against them are refused, and their orchestrator may close them at any time.
