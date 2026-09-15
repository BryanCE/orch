Adopt an unleased agent, or every available orphan with `--all`. A live lease holder must
release first (`orch detach`).

Another session's agents are never yours. `reset`, `dispatch`, `steer`, and `model` against
a live foreign holder are refused, and that fleet's orchestrator may close its panes at any
moment. Never plan on claiming a foreign fleet. If the pack cap blocks your spawn, spawn
what fits now, hold the rest, and retry on any event that frees capacity.
