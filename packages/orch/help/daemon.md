Manage the resident orch daemon (orchd). Write commands auto-start it when absent. orchd
owns its lifecycle: with no live agents, no event subscribers, and no RPC traffic for
`daemon.idle_shutdown_minutes` (0 = never), it exits on its own.

Trust `orch daemon status`, the RPC answer, not the existence of a pid file. A hung daemon
means stop, kill the pid, start. Bridges reconnect to a restarted daemon on their own.
After any daemon stop, start, or rebuild: respawn the fleet, then smoke-test one trivial
dispatch before you fan out.

A refusal reading `daemon hash=... differs from installed hash=...` is CLI/daemon skew
after a rebuild. `orch daemon reload` re-execs the daemon on the new code. Never
`--stale-ok` past it.
