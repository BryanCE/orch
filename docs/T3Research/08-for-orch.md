# What this means for orch

The goal: from any machine, `@bryan-swe` means "do this on that machine, with its
harnesses, plexer, repos and settings", in both directions, across more than one tailnet,
and it works when the far daemon is stopped or orch is missing there.

## Is the current SSH-per-call forwarding what we want?

No. Today `settings.hosts` plus `<host>/<target>` makes a handful of verbs (`status`,
`questions`, `result`, `steer`, `answer`, `dispatch`, `queue add`) run
`ssh <dest> orch <verb> --json` and print the answer (`src/remote.ts`,
`src/commands/target.ts`). T3 never works this way, and it falls short of the goal:

- **Per verb.** Each verb has its own forwarding branch. `spawn`, `monitor`, `close`,
  `adopt`, the TUI and the web UI have none.
- **Identity is lost.** On the far side the forwarded `orch` runs from an SSH shell, so
  `registerCaller` sees a raw terminal: the operator, holding no lease. Leases and
  provenance (Rule 11, Rule 19) do not cross the link.
- **No streaming.** A process per call cannot carry an event subscription.
- **Slow.** A full SSH handshake and a cold `orch` start on every call.
- **Rule debt.** The SSH argument building is written twice (`sshArgs` in `remote.ts`,
  `remoteCommandArgs` in `target.ts`, Rule 16), and `DEFAULT_REMOTE_TIMEOUT_MS = 3000` is
  hardcoded (Rule 17).

T3's model is the one to copy: one server per machine, and the client talks that server's
own protocol over a tunnel. Only the route varies.

## Is SSH the best transport?

Yes, carried as a stdio pipe. The options:

| Option | Verdict |
| --- | --- |
| **SSH stdio pipe**: `ssh <route> orch daemon dial-stdio`, which connects stdin/stdout to the far orchd socket. One long-lived link per peer carries orch's line-framed RPC and event stream. | **Recommended.** No port opened anywhere. SSH or Tailscale SSH does auth. `~/.ssh/config` (ProxyJump, keys, aliases) applies for free. Works on LAN, any tailnet, through jump hosts. Same pattern Docker uses for `ssh://` hosts. Runtime portable (Rule 6): the far verb is plain `node:net` piping. |
| SSH `-L` port forward (what T3 does) | T3 needs it because its protocol is HTTP and WebSocket. orch's is a unix socket; forwarding a port adds a port to pick and leak, for nothing. |
| orchd listening on its tailnet address with pairing tokens (T3's direct route) | Needs a pairing flow, scopes, a token store, and a listener that filters peers. Ties orch to one tailnet at a time. Worth it only for clients that cannot SSH (a phone). |
| Hosted relay (T3 Connect) | A service to run, an account system, Cloudflare. Exists for phones and browsers. Not needed. |
| Embedding Tailscale (`tsnet`) | Go only. Breaks Rule 6. |

## Design

### Machines are addressable

- A machine is a minted id plus a label (`bryan-swe`). The `hosts` table already exists;
  it becomes the registry. Identity is the id, never the route (T3: "identity is
  independent of the route"; orch Rule 11).
- `@name` selects a machine: `orch @bryan-swe spawn …`, `orch @bryan-swe status`,
  `orch @all status`, and `worker-3@bryan-swe` as a target anywhere. No `@` means here.
  A bare agent id or name not found here is resolved by asking peers.
- `host/target` goes away (Rule 8, one shape).
- The far daemon resolves everything against its own `settings.json`: adapters, plexer,
  `spaces`, worktree settings. Names cross the wire, paths never do.

### Routing lives in the daemon, once

The CLI always talks to the local orchd. A request whose target machine is not this one
goes over the peer link to that machine's orchd, and the reply streams back. Every verb
works remotely with no per-verb code; the forwarding branches in `control.ts`,
`results.ts`, `queue.ts` and the whole of `remote.ts` are deleted.

The peer link carries the caller: "agent X on @home". The far daemon records provenance
and leases against that, so ownership holds across machines. A dropped link makes held
agents orphans; nothing is killed (work survives its spawner).

### Routes, ordered, verified, learned

Per machine, an ordered list of routes in `settings.json` (Rule 17):

```json
"machines": {
  "bryan-swe": {
    "routes": [
      { "ssh": "bryan@bryan-swe.work-tailnet.ts.net" },
      { "ssh": "bryan-swe", "jump": "home" }
    ]
  }
}
```

From T3:

- Try routes in order; first that works wins. While on a later route, retry the earlier
  ones on a timer and move back when one works, with a cooldown so a flaky network cannot
  bounce the link.
- Verify before trusting: the first frame on a link is the far daemon's machine id. A
  route that reaches a different machine is refused, never silently used.
- Learned routes: a connected peer reports its own addresses and the machines it can
  reach. Adding one machine once makes it known to the rest of the mesh.
- One retry owner per peer: jittered backoff with a cap, reset only after the link stays
  up.

### Multiple tailnets

T3 does not handle this; it uses whatever account the local `tailscale` CLI is on. For
orch, cheapest first:

1. **Tailscale node sharing.** Share the work machine into the personal tailnet (or the
   reverse). Every machine is reachable from one tailnet; orch needs no tailnet code.
2. **Jump routes.** A route through a machine on both tailnets, or reachable from either.
   It is just `ProxyJump`, so it needs only the `jump` field.
3. **Learned reachability.** Each peer reports which machines it can reach. When `@box`
   is on a tailnet this machine is not, orch routes through a peer that can reach it.
   This is the mesh doing the work of option 2 without hand-written jump entries.

Discovery: `tailscale status --json` on each machine lists `Peer[*]` with MagicDNS
names. `orch machines scan` probes each over SSH for orch and offers to add it. T3 reads
only `Self`; reading peers is the step it skips.

Detect a tailnet address by interface name or the `fd7a:115c:a1e0::/48` ULA, not by
`100.x`, which Cloudflare WARP and other VPNs share (T3 learned this).

### When the far daemon is not running

The link command is `orch daemon dial-stdio` on the far machine. It calls the same
`ensureDaemon` (`src/daemon/client/reach.ts`) the local CLI already uses to autostart
orchd, then pipes. A stopped daemon starts on first contact. Like T3's SSH launcher, a
daemon the link started and one it found running are treated the same once up: closing
the link never stops the far daemon.

### When orch is not installed there, or is a different version

The link's first exchange is a version handshake. Outcomes:

- `orch` not found on the far `PATH` of a login shell: the link reports "orch is not
  installed on @box" and names the install command.
- Version differs: the link reports both versions and names the update command. Clients
  read advertised capabilities rather than assume their own version (T3 rule).
- T3 installs and upgrades the remote automatically, pinned to the client's exact
  version, from a checksum-verified self-contained archive. For orch, installing onto
  another machine falls under Rule #1 and Rule 12: it writes an installed tree. So it is
  an explicit verb Bryan runs (`orch @box install`, shipping this machine's packed
  build), never something a link or an agent does on its own. Open question below.

### When the machine is off or unreachable

T3 shows it offline and does nothing else (no remote wake). For orch, a write to an
offline machine can wait in the outbox orch already has and deliver when the link comes
back, the way T3's relay holds webhooks for an offline machine. Reads report the machine
offline with the last time it was seen.

### Windows and WSL

T3 runs a WSL distro as its own environment with its own server and id, reached over the
loopback port WSL forwards. Same for orch: the office box is two machines,
`@bryan-swe` (Windows) and `@bryan-swe-wsl`, each with its own orchd, linked over
loopback. That also gives the Windows and WSL sides one fleet view.

## Open questions for Bryan

1. **Remote install.** Should `orch @box install` exist, given Rule #1 and Rule 12? If
   yes, it needs a rule carve-out naming it. If no, orch only reports "not installed" and
   the version to install.
2. **Offline writes.** Queue writes to an offline machine and deliver later, or refuse
   them?
3. **Grammar.** `orch @box <verb>` for the whole command and `agent@box` for targets?

## What to read next in the T3 source

- `packages/ssh/src/tunnel.ts`: the launcher script, start or reuse, ownership on cleanup.
- `packages/client-runtime/src/connection/{driver,supervisor,routes}.ts`: route walking,
  preflight, learned routes, retry.
- `apps/server/src/peer/PeerForwarding.ts`, `RemoteDelegation.ts`: caller identity and
  following remote work across restarts.
