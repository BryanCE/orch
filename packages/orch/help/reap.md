Delete an agent record. Its JSONL history stays until retention ages it out. Refuses while
the process or any descendant is live. Ending is never gated by the lease.

Bare `orch reap` on a TTY opens an interactive multiselect over live agents, with provably
dead rows pre-checked. `--dead` is the non-interactive sweep of provably dead agents.
