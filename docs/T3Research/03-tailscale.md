# T3 Code and Tailscale

Source: `pingdotgg/t3code` at `7fe1310`. Code: `packages/tailscale/src/tailscale.ts`,
`apps/server/src/environment/DirectEndpoints.ts`, `apps/server/src/cli/pair.ts`,
`packages/client-runtime/src/connection/routes.ts`.

## The short version

Tailscale is not a connection type in T3. It is a network that supplies addresses for
ordinary pairing. In the docs' words, "Tailscale supplies an endpoint for ordinary
pairing, so it needs no separate environment type."

All Tailscale code is server side and is about exposing this machine. Nothing lists
tailnet peers, and nothing handles multiple tailnets, multiple accounts, or
`tailscale switch`. It uses whichever profile the local `tailscale` CLI is on.

## CLI, not the LocalAPI

Spawns `tailscale` (`tailscale.exe` on Windows) with a 3.5 s timeout (`tailscale.ts:18-30`).

| Call | Used for |
| --- | --- |
| `tailscale status --json` | `Self.DNSName` with the trailing dot stripped, `Self.TailscaleIPs` (IPv4 kept only inside `100.64.0.0/10`), `Self.CapMap` (`"https"` in it means HTTPS certs are enabled) (`:140-228`) |
| `status --json` again | `ExitNodeStatus` and `Peer[*].ExitNode`, only to name the exit node in a reachability hint (`:299-348`). The only read of `Peer`. |
| `tailscale debug prefs` | `RunSSH && WantRunning`, whether Tailscale SSH is on (`:350-371`) |
| `tailscale serve --bg --https=443 http://127.0.0.1:<port>` | Publish the loopback server over tailnet HTTPS (`:440-449`) |
| `serve … off`, `serve status --json` | Remove it; find existing routes that already point at this server (`:463-651`) |

Stderr is classified into `not-logged-in`, `not-running`, `permission-denied`,
`no-existing-handler`, `unknown`. Raw stderr is never logged because it can contain
`tskey-…` auth keys (`:38-71`).

## Tailscale Serve for HTTPS

`t3 pair --tailscale` (`apps/server/src/cli/pair.ts:371-434`):

1. Read status. Fail without a MagicDNS name or without the HTTPS capability, linking the
   admin DNS page.
2. Probe `https://<magicdns>/`. Refuse if it already serves a different `environmentId`
   or something that is not T3.
3. `tailscale serve --bg`.
4. Print a pairing URL on the MagicDNS HTTPS address, with a one-time token (5 min TTL).

With `tailscaleServeEnabled` the server sets Serve up on start and removes it on shutdown
(`apps/server/src/server.ts:884-930`). The server itself keeps listening on loopback;
Serve is the proxy.

## Advertising tailnet addresses

The server reports its own reachable addresses to every connected client
(`DirectEndpoints.ts:58-173`):

- Tailnet interfaces are found by name (`^tailscale`) or by an IPv6 address in
  `fd7a:115c:a1e0::/48`. Not by `100.x`, because that CGNAT range is shared with
  Cloudflare WARP and other VPNs (`:47-53`).
- Advertises `http://<ip>:<port>/` tagged `tailnet` or `lan`, and the Serve HTTPS URL
  once it answers.
- On a cloud VM, detected by reaching `169.254.169.254`, only tailnet addresses are
  advertised (`:85-131`).
- Public addresses are never advertised, because credentials travel over plain HTTP on
  these routes.

The client saves these as learned routes. A host classified tailnet (`.ts.net` name, the
Tailscale ULA range, or the server's tag) is allowed over plain HTTP; a bare `100.x`
address counts as generic VPN (`routes.ts:96-98`, `270-277`).

Route rank on the client (`routes.ts:105-113`): loopback 0, lan 1, tailnet 2, vpn 2,
public 3, ssh 4, relay 5. Cheapest working route wins.

## Remote editor targets

The server advertises `{kind: "tailscale", host: <magicdns>, username}` as a way to open
an editor over SSH, when sshd listens on port 22 or Tailscale SSH is on
(`RemoteOpenTargets.ts:27-82`). It also advertises `<shorthost>.local` over mDNS.

## Listening safely on every interface

The background service with LAN access listens on every IPv4 interface and drops any
connection whose peer is not loopback, private, or tailnet IPv4. That keeps a VPS's
public address closed while one wildcard listener follows DHCP changes
(`docs/internals/remote.md`, "Identity is independent of the route").

## Takeaways for orch

- T3 does not solve multiple tailnets. For orch, a machine's route list has to carry it:
  each route is an address plus the way to reach it, and a machine reachable on two
  tailnets has two routes. Tailscale node sharing, which puts one tailnet's machine into
  another tailnet, needs no orch code at all.
- Detect tailnet membership by interface or the `fd7a:115c:a1e0::/48` ULA, not by
  `100.x`.
- `tailscale status --json` on the local node is a cheap source of "who is out there"
  that T3 does not use. orch can list `Peer[*]` and probe each for orch, which T3
  never does.
- Tailscale SSH (`RunSSH`) makes the SSH route work with no keys to manage.
