# T3 Code's remote model

Source: `pingdotgg/t3code` at `7fe1310`. Main sources: `docs/internals/remote.md`,
`docs/internals/connection-runtime.md`, `docs/user/remote-access.md`,
`packages/client-runtime/src/connection/`.

## One server per machine, clients connect to it

An **environment** is one T3 server: it owns the providers, the agent processes, files,
the SQLite store. A client (desktop, the hosted web app, mobile) connects to one
environment at a time per connection and can hold many connections.

The route never changes the execution model: "Direct access, Tailscale, SSH, and T3
Connect change how the client reaches that server; they do not introduce another
execution model." Work does not move between machines. A project and its threads belong
to one environment.

## Identity is independent of the route

- Each server mints a random UUIDv4 `environmentId` once and keeps it in
  `<stateDir>/environment-id`, published atomically with `link()` so concurrent starts
  agree (`apps/server/src/environment/ServerEnvironment.ts:89`, `121-163`).
- The label is display only: macOS `ComputerName`, Linux `PRETTY_HOSTNAME`, `hostname`,
  then a fallback (`ServerEnvironmentLabel.ts:158-195`).
- Every server answers `GET /.well-known/t3/environment` without auth. The client checks
  the id there on every connect and refuses a mismatch: "a different machine. Add it as
  its own environment" (`apps/web/src/connection/platform.ts:230-235`).
- Advertised addresses are hints. "Only the connecting device can prove that a route
  works." A credential is never sent to an address until that address has answered with
  the right `environmentId`, so a LAN address that now belongs to another machine never
  receives a token.

## A machine has an ordered list of routes

A saved environment holds a primary route and ordered alternates
(`packages/client-runtime/src/connection/catalog.ts`, `model.ts:5-40`). Route kinds:
direct (LAN, Tailscale, VPN, public URL), SSH, T3 Connect.

- The [driver](../../packages/client-runtime/src/connection/driver.ts) connects over the
  first route that works.
- Each direct route is first checked with the public descriptor. When every route stays
  silent, each is still tried.
- A failing route moves on to the next. Only an incompatible server stops the walk,
  because it is the same server on every route.
- While connected over a later route, the supervisor preflights the earlier ones (on a
  network change, on foreground, every minute) and moves back when one works. A route
  that answers but fails again is held back for a cooldown so a flaky network cannot
  bounce the session.
- Learned routes: a connected server reports its LAN and tailnet addresses and the client
  saves them, reusing the credential of the route they were learned over. Pairing once
  through T3 Connect is enough to use the LAN at home. A learned route the server stops
  reporting is dropped; routes the user saved are never touched.
- Rank, cheapest first: loopback, LAN, tailnet or VPN, public, SSH, relay.

Storage: desktop keeps the catalog as one `safeStorage`-encrypted blob in
`connection-catalog.json`. The browser uses IndexedDB. The hosted web app keeps it in the
browser and connects straight to each environment; app.t3.codes never proxies traffic.

## Connection runtime

One connection owner per environment in `packages/client-runtime`, shared by web, desktop
and mobile so views never run competing reconnect loops.

- One retry owner: jittered exponential backoff capped at 5 minutes, reset only after a
  connection stays up. Auth failures and offline states wait for a wakeup instead of
  retrying.
- Liveness: a probe on the open socket. If it is unanswered after 500 ms, the client asks
  the host for its descriptor over a fresh request. Host answers while the socket is
  silent means the socket is dead: replace it. Deadline 3 s on loopback and LAN, 15 s
  elsewhere, since a tailnet over DERP can be slow on a live socket.
- A socket opening is not readiness. The session waits for the initial server
  configuration. Transport health and data freshness are tracked separately.
- Durable subscriptions follow a replacement session. Mutations are never replayed
  automatically; idempotency belongs to the operation.
- An involuntary disconnect keeps the registration and cached data. Explicit removal
  clears credentials and state.

## Version skew

Remote servers outlive client releases. Clients read advertised capabilities and handle
their absence instead of assuming their own version describes the server. Pairing
refuses a mismatched `orchestrationProtocolVersion` (`apps/server/src/cli/pair.ts:506-512`).

## WSL is its own environment

The Windows desktop app runs a WSL distro as a separate backend with its own server and
its own id, reached over a loopback port that WSL forwards
(`apps/desktop/src/wsl/DesktopWslBackend.ts`, `WSL_INSTANCE_ID_PREFIX = "wsl:"`). It
installs the server runtime into the distro automatically.

## A desktop can run with no local environment

`localEnvironmentEnabled` off: the desktop app starts no local server and only drives
saved environments over pairing, relay or SSH. Possible because the UI is not served by
the backend.

## Takeaways for orch

- Same shape as orch's: one daemon per machine owns its agents, store and plexer. T3
  never centralizes execution and never moves work between machines.
- A machine is a minted id plus a display label plus an ordered route list. Routes are
  how to get there, never who it is. That matches Rule 11: environment is never identity.
- Verify identity on the far end before trusting a route.
- Learned routes make setup one step: connect once, the far side tells you its other
  addresses.
