orchd starts on its own when a command needs it and runs until it is stopped. It holds the
PTY of every agent another host spawned on this one, so stopping it ends those agents. Check
it with `orch daemon status`, which counts the held agents. A timeout there means a busy
machine, not a dead daemon: retry.

To restart it, run `orch daemon stop`, then `orch daemon start`. With held agents, stop and
reload say how many they would end and refuse until you pass `--yes`. If stop times out, kill
the pid it names, then start. Bridges reconnect on their own: keep the fleet and send one short
dispatch to confirm delivery.

    orch daemon status

After an orch update, commands refuse with `daemon hash=... differs from installed hash=...`.
Run `orch daemon reload` to put the daemon on the new code, rather than passing `--stale-ok`.
