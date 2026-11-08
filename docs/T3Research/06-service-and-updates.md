# T3 Code background service and updates

Source: `pingdotgg/t3code` at `7fe1310`. Main sources: `docs/user/background-service.md`,
`docs/internals/server-updates.md`, `apps/server/src/serviceLauncher.ts`.

## One command sets a machine up

`t3 up` asks how other devices reach this machine (T3 Connect, local network, or both),
signs in if needed, and on Linux and macOS installs a background service. Flags make it
non-interactive (`--connect`, `--lan`, `--no-…`, `--yes`). With no terminal it never
prompts; a needed restart runs without asking. `t3 status --json` prints the result.

## Service management

| Task | Command |
| --- | --- |
| Set up access | `t3 up` |
| How others reach it | `t3 status` |
| Install and start | `t3 service install` |
| Status and log location | `t3 service status` |
| Update | `t3 update` |
| Restart | `t3 service restart` |
| Remove | `t3 service uninstall` |

- Linux: a systemd user service, with lingering enabled so it starts at boot and survives
  logout. `t3 service status` reports `linger-disabled`, `service-stopped`,
  `restart-pending` and prints the repair command.
- macOS: a launchd LaunchAgent, runs while the user is logged in.
- Windows: no background service. Keep the desktop app open or `t3 serve` in a terminal.
- `service.env` under the T3 home holds environment overrides and survives reinstalls
  and updates.
- `t3 service protect` asks for sudo once to reserve memory for the server and protect it,
  Tailscale and sshd from the OOM killer, so a machine whose agents ate all the RAM stays
  reachable.

## When the server is not running

- Direct, Tailscale and T3 Connect routes do not start a server. The host must already be
  running one (service, desktop app, or `t3 serve`).
- SSH is the route that starts one: it installs the runtime if missing and launches the
  server (see `02-ssh.md`).
- T3 Connect has a linked-but-stopped state: the relay keeps the allocation, the
  environment shows "offline" instead of "not authorized", and the tunnel comes back on
  the next start without pairing again.

## The launcher owns updates

A stable launcher process is what systemd or launchd runs. It is the only writer of
service state. Server children ask it for an update over inherited IPC and never replace
themselves.

1. The launcher durably records the pending update, then stops the old child.
2. It snapshots SQLite (main file, WAL, shm) so migrations can roll back with no down
   migrations, and refuses an update whose snapshot will not fit on disk.
3. It starts the target as a trial. The trial must finish migrations, bind HTTP and park
   every long-running root before reporting `prepared`.
4. The launcher commits the version durably and replies `committed`. Only then does the
   child accept commands and announce ready.
5. A failed or timed-out trial rolls back to the old version and restores the snapshot.

Clients match the launcher's update id against the ready event after reconnecting,
because a reconnect alone cannot tell a successful update from a rollback.

## Interrupted work resumes

After a restart, runs that were cut off continue if the durable run, provider thread,
session and native resume identity all match. Intent goes in a durable outbox, so it
survives another restart. Delivery stops after three continuations in a row so a turn
that crashes the server cannot loop.

## Takeaways for orch

- "Daemon not running" on the far machine is handled by the connecting side starting it
  over SSH, the same way orch's CLI already autostarts a local orchd.
- "orch not installed" on the far machine is handled by shipping a self-contained,
  checksum-verified artifact over the same SSH session, pinned to the caller's version.
  Their artifact is a standalone binary, so the far machine needs no Node. orch would need
  a runtime there (any of node, bun, deno per Rule 6) or a bundled one.
- Installing anything on another machine is the same kind of act as Rule 12's "writing
  into the installed tree". It has to be Bryan's decision, made once per machine, not a
  side effect an agent can trigger.
