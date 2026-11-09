Read the agent's last session entries, rendered through its harness, to see what it said
and did. It still answers after `orch close`; only `orch reap` removes the session. An agent on
another host is read from that host's orchd, and the output opens with `from <host>:`.

    orch tail api-routes -n 50
