# T3 Code remote access research

How T3 Code (`pingdotgg/t3code`, open source) runs agents on other machines: over SSH,
over Tailscale, through its hosted T3 Connect service, and server to server through peer
links. Read from the source at commit `7fe1310` (2026-11-08), cross-checked against its
own `docs/internals` and `docs/user`. File references in these notes are paths in that
repo.

## Files

| File | Covers |
| --- | --- |
| [01-model.md](./01-model.md) | One server per machine, identity vs routes, the connection runtime, WSL |
| [02-ssh.md](./02-ssh.md) | SSH launcher: install, start or reuse, version pinning, the tunnel, credentials |
| [03-tailscale.md](./03-tailscale.md) | What T3 does with Tailscale, and what it does not (peers, multiple tailnets) |
| [04-t3-connect.md](./04-t3-connect.md) | T3 Connect: Cloudflare Tunnel per machine, relay as control plane, DPoP, limits |
| [05-auth.md](./05-auth.md) | Pairing, scopes, sessions, outside agents over MCP |
| [06-service-and-updates.md](./06-service-and-updates.md) | Background service, launcher-owned updates, what happens when the server is down |
| [07-peer-links.md](./07-peer-links.md) | Server to server: one machine driving agents on another |
| [08-for-orch.md](./08-for-orch.md) | What orch should take from this, the recommended design, open questions |

## Summary

- **One server per machine.** Each machine runs its own T3 server, which owns agents,
  files and state. Nothing is centralized and work never moves between machines.
- **A machine is an id, reached by routes.** Each server mints a UUID once. Clients keep an
  ordered list of routes per machine (LAN, tailnet, SSH, T3 Connect), connect over the
  first that works, check the id before sending a credential, and learn new routes from the
  server itself.
- **SSH is the only route that starts things.** It installs a pinned, checksum-verified
  runtime on the remote if missing, starts or adopts a server, and forwards a loopback
  port with `ssh -L`. A server it found already running is never stopped.
- **Tailscale is just a network.** T3 reads only the local node's status, publishes itself
  with Tailscale Serve for HTTPS, and advertises its tailnet addresses. No peer discovery,
  no multi-tailnet or multi-account handling.
- **T3 Connect is a Cloudflare Tunnel per machine** plus a hosted broker (a Cloudflare
  Worker with Clerk and Postgres) that lists machines per account and mints key-bound
  one-time credentials. The broker never carries session traffic. 3 machines free, up to
  100 on paid plans. It exists for phones and browsers.
- **Peer links** let one T3 server drive agents on another through the other's MCP
  endpoint, carrying the caller's access ceiling and an immutable origin stamp, and
  following remote work across restarts.

## For orch

The existing `settings.hosts` SSH-per-call forwarding is not the right shape. Replace it
with one daemon per machine and one long-lived SSH stdio link per peer, carrying orch's own
RPC, routing every verb in the daemon, with `@machine` addressing, ordered and learned
routes, autostart of the far daemon, and a version handshake. Details and open questions in
[08-for-orch.md](./08-for-orch.md).
