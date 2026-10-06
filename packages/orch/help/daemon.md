orchd starts on its own when a command needs it, and exits after
`daemon.idle_shutdown_minutes` with no agents, streams, or requests. Check it with
`orch daemon status`. A timeout there means a busy machine, not a dead daemon: retry.

To restart it, run `orch daemon stop`, then `orch daemon start`. If stop times out, kill the
pid it names, then start. Bridges reconnect on their own: keep the fleet and send one short
dispatch to confirm delivery.

    orch daemon status

After an orch update, commands refuse with `daemon hash=... differs from installed hash=...`.
Run `orch daemon reload` to put the daemon on the new code, rather than passing `--stale-ok`.
