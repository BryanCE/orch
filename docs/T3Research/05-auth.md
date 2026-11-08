# T3 Code environment authentication

Source: `pingdotgg/t3code` at `7fe1310`. Main sources: `docs/internals/environment-auth.md`,
`docs/user/remote-access.md` ("Manage or revoke access"),
`packages/client-runtime/src/authorization/remote.ts`, `apps/server/src/auth/`.

## The environment issues its own sessions

Every route ends at the same check: the environment's own session store. Cloud identity
and relay credentials are a separate trust boundary. "A relay token is never an
environment login."

## Pairing

1. The host mints a one-time pairing credential with scopes, a TTL (5 min default for
   `t3 pair`), and a label. Ways to get one: `t3 pair` (prints a URL and a QR code),
   `t3 auth pairing create --json` (the SSH launcher runs this over ssh), or a link from
   Settings, Sharing & access.
2. The client exchanges it at `POST /oauth/token` (OAuth token exchange,
   `subject_token=<credential>`) for a bearer `access_token`.
3. Sessions are read at `/api/auth/session`.
4. WebSockets use short-lived tickets from `/api/auth/websocket-ticket`, so long-lived
   tokens stay out of socket URLs.

A hosted pairing URL carries the secret in the fragment, which never reaches the hosted
origin's server.

Pairing authorizes the device for future connections. Each new device needs a fresh
link. Pairing the same environment again replaces that device's grant.

## Scopes

- Pairing delegates a set of scopes. Exchange can narrow, never widen. Stored grants are
  never expanded when scopes split.
- Default grant is everything, including access management and T3 Connect management.
  Their reasoning: `terminal:operate` is a shell as the server's user and
  `orchestration:operate` can start a full-access agent, so withholding management from
  the default would not be a real boundary.
- Every RPC declares a required scope and middleware checks it before the handler runs
  (`apps/server/src/auth/RpcAuthorization.ts`).
- `--scope` on `t3 pair`, `t3 auth pairing create`, `t3 auth session issue` picks scopes.
- Unknown and retired scope names are dropped on exchange so old clients keep connecting.

## DPoP

T3 Connect clients hold a proof key. Tokens are bound to it; each request carries a fresh
proof that names the URL it signs, and its `jti` is consumed. A ticket captured on a plain
HTTP LAN route is useless without the key. An invalid proof fails; it never falls back to
bearer.

## Outside agents over MCP

Agents T3 did not start (Claude Code, Codex, ChatGPT) sign in to the environment's `/mcp`
through a narrow OAuth authorization-code server with PKCE
(`apps/server/src/auth/McpOAuth.ts`). The user grants read-only or a runtime-mode ceiling.
Those sessions work only on `/mcp`. Peer links between environments reuse exactly this.

## Revocation

Sessions are listed and revoked on the host: Settings, Sharing & access, or
`t3 auth session list` and `t3 auth session revoke <id>`. A session with an open
connection stays listed after its credential expires.

## Takeaways for orch

- orch today authenticates by "can read a 0600 token file under `$ORCH_DIR`", which only
  works on one machine. Once a peer is involved, the receiving daemon needs its own
  record of who the peer is and what it may do.
- If the link is SSH stdio into the far daemon, SSH has already authenticated the user.
  The far `orch daemon dial-stdio` runs as that user, can read the local token, and so
  is exactly as trusted as a local CLI. That removes the need for pairing codes on the
  SSH route.
- Pairing and scopes only become necessary if orch ever exposes a listener on a network
  address. T3's lesson there: bind loopback and let a proxy (SSH, Tailscale Serve,
  tunnel) carry it, or accept only private and tailnet peers.
