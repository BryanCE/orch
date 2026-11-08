# T3 Connect

Source: `pingdotgg/t3code` at `7fe1310`. Main sources: `docs/internals/t3-connect.md`,
`infra/relay/`, `apps/server/src/cloud/`, `packages/client-runtime/src/relay/`,
`packages/contracts/src/relay.ts`.

## What it is

A hosted service that makes a machine reachable from anywhere without router port
forwarding, and lists your machines under one account. You sign in on the host
(`t3 connect`, or `t3 up` and pick T3 Connect), then sign in to the same account on a
phone or at app.t3.codes and pick the machine.

## Topology: a Cloudflare Tunnel per machine, plus a broker

It is not a relay that carries traffic, and it is not WebRTC.

- **Each environment runs its own `cloudflared` connector** and gets its own Cloudflare
  Tunnel hostname:
  `cloudflared tunnel --no-autoupdate … run` with `TUNNEL_TOKEN=<connectorToken>`
  (`apps/server/src/cloud/ManagedEndpointRuntime.ts:729-750`). That is an outbound
  QUIC or HTTP/2 connection to Cloudflare's edge, so no inbound port is opened.
- The tunnel's ingress is a single loopback HTTP origin, then `http_status:404`. Only
  loopback origins are accepted (`infra/relay/src/environments/ManagedEndpointProvider.ts`).
  The hostname is derived from `sha256(namespace, userId, environmentId)`.
- **The relay is a control plane only.** One Cloudflare Worker
  (`infra/relay/src/worker.ts`), PlanetScale Postgres through Hyperdrive, Clerk for
  identity, a cron every 5 minutes to reap idle tunnels. "After bootstrap, clients send
  application traffic through the environment's tunnel hostname; the relay Worker does not
  proxy their HTTP or WebSocket sessions."
- The one thing the relay does carry: webhooks at `/v1/hooks/:endpointKey/:hookId/:token`,
  optionally held in a Durable Object while the machine is offline and pushed back when it
  returns.
- No end-to-end encryption at the application layer. HTTPS ends at Cloudflare's edge,
  then the tunnel delivers to the loopback origin. Cloudflare can see plaintext; T3's
  Worker cannot. (Inference from how Cloudflare Tunnel works, not stated in code.)

## Discovery: account to machines

- `GET /v1/environments` with a Clerk token lists linked machines:
  `{environmentId, label, endpoint{httpBaseUrl, wsBaseUrl, providerKind}, linkedAt}`.
- `POST /v1/environments/:id/status` returns `online` or `offline`, with
  `offlineReason: "tunnel_released"` for a host that stopped cleanly.
- Relay tables are keyed by `(user_id, environment_id)`:
  `relay_environment_links` (stores the environment's public key and endpoint),
  `relay_managed_endpoint_allocations` (unique hostname plus a `generation` counter).

## Linking a machine to an account

Each environment has one Ed25519 keypair in its secret store. The signed-in client drives
the link (`apps/web/src/cloud/linkEnvironment.ts:333-430`):

1. Relay issues a single-use challenge.
2. The environment signs a proof: the challenge, its descriptor, `environmentId`, its
   public key, endpoint, loopback origin.
3. The relay verifies the proof and returns a connector token and tunnel id, an
   environment credential, and the relay's mint public key.
4. The client installs those on the environment (`/api/connect/relay-config`).

Headless hosts link through the CLI with Clerk OAuth: PKCE with a loopback callback, or the
OAuth device grant over SSH ("open this URL, confirm this code").

## Connecting through it

The client holds a P-256 DPoP key (non-extractable WebCrypto on web).

1. Exchange the Clerk JWT for a relay DPoP access token (30 min).
2. Ask the relay to connect to environment `:id` with the client's key thumbprint.
3. The relay signs a 2-minute mint request (`aud: t3-env:<id>`, `sub: userId`,
   `cnf.jkt: <thumbprint>`, nonce) and posts it through the tunnel to the environment, with
   redirects disabled.
4. The environment checks the relay's signature, that `sub` is the linked user, the
   lifetime and the scope, consumes the jti and nonce, then mints a 2-minute pairing
   credential bound to the client's key and signs its answer.
5. The relay checks that signature against the stored environment public key and hands
   the credential back.
6. The client redeems it directly at the environment's `/oauth/token` with a fresh proof.

The relay never sees the environment session token. The docs state the trust assumption
openly: a compromised relay signing key is not made harmless by DPoP.

Environment tokens last 1 hour and are renewed in the last minute; the server moves the
live socket to the new session without a reconnect.

## Lifecycle

- Startup reconciles intent. Linking can be recorded while the server is stopped.
- A clean shutdown releases the Cloudflare tunnel (Cloudflare bills idle tunnels) but keeps
  the hostname and allocation, so the machine shows "offline", not "not authorized".
- On start, the host registers recovery with a short-lived signature and gets its tunnel
  back under the same hostname. Clients keep their bindings.
- If `cloudflared` exits or is rejected, the host asks for a replacement at most once
  every 2 minutes.
- `cloudflared` is pinned by version and checksum and swapped with no downtime: the new
  connector registers before the old one stops.
- There is no remote wake. A machine whose server is down just shows offline.

## Limits and accounts

- 3 machines per account by default; a paid T3 Chat plan raises it to 10 (Pro) or 100
  (Premier) (`DEFAULT_MANAGED_TUNNEL_LIMIT`, `T3CHAT_PLAN_TUNNEL_LIMITS` in
  `packages/contracts/src/relay.ts:969-972`). Phones and browsers do not count.
- Several accounts can link the same environment on the relay side, but the environment
  stores one installed cloud user and refuses a mint for anyone else
  (`apps/server/src/cloud/CloudLink.ts`, `linkedCloudUserId`). In practice one account per
  machine at a time.
- On the client, switching cloud accounts touches only relay routes, never directly paired
  machines.

## Takeaways for orch

- T3 Connect exists because T3's clients are phones and browsers that cannot run SSH or
  join a tailnet. Every machine Bryan drives orch from can do both. orch does not need a
  hosted relay, an account system, or Cloudflare.
- The useful idea is the machine registry: one place that knows every machine, its id,
  label, and how to reach it. For orch that registry can be the machines themselves, each
  telling its peers what it knows, with no hosted service.
- The multi-account story is weak even in T3: one cloud account per machine. Multiple
  tailnets is a harder version of the same problem, and T3 does not solve it.
