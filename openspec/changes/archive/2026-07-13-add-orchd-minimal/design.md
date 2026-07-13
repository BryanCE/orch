# Design: add-orchd-minimal

## Approach

orchd is a thin resident wrapper around modules that already exist — not a rewrite. The store boundary (`src/store.ts`), events derivation, `src/notify.ts` sinks, and the `orch work` loop were all built protocol-first; orchd imports them and runs them continuously. New code is confined to: lifecycle (lock, daemonize, re-exec), the socket server, and the CLI's prefer-daemon/fallback client.

```
src/daemon/
  orchd.ts        entrypoint: lock → subsystems → socket server
  lifecycle.ts    single-instance lock, daemonize/--fg, re-exec reload, self-hash
  rpc.ts          ndjson JSON-RPC server + client (shared by CLI)
  subsystems.ts   composes: presenceWatch → events → notify;  workLoop;  configWatch
```

## Decisions

- **D1: file protocol stays the wire contract.** orchd is a privileged *reader/actor* on `~/.orch`, never a gatekeeper — bridges keep writing files, CLIs keep reading them when the daemon is absent. This is what makes the daemon thin and the fallback free.
- **D2: ndjson JSON-RPC over unix socket** — matches herdr's proven pattern on this machine; TCP-on-loopback + port file fallback for environments where unix sockets fail (some WSL/Windows interop paths). No HTTP framework in the minimal cut.
- **D3: re-exec for reload** — `orch daemon reload` has the daemon exec its own entrypoint (same argv, lock handed over), which solves reload-the-reloader without a supervisor. Self-staleness = compare running code hash (recorded at boot) to disk; surfaced in `daemon status` and doctor.
- **D4: subsystems are the existing modules.** No parallel implementations: the work loop is `cmdWork`'s engine refactored to accept an injected clock/stop-signal; sink delivery is `notify.ts` as-is; events derivation is shared with the CLI path. Divergence between daemon and CLI behavior is a bug class we design away by construction.
- **D5: supersedes add-live-reload** — config hot-reload lives in `configWatch` (daemon) and extension staleness in doctor + status.json `extensionHash` (bridge). The standalone `reload.signal` file from the superseded design is NOT built.

## Risks

- Daemonizing under bun on WSL: use detached spawn + lock file rather than double-fork; `--fg` mode is the escape hatch and what supervisors/systemd use.
- Two orchestrator sessions racing `daemon start`: the O_EXCL lock decides; loser gets "already running".
- Socket file left stale after crash: start-up probes the socket before honoring the lock; dead socket + dead pid → reclaim.

## Migration

`orch events`/`work` keep their flags; they just prefer the daemon when present. No config changes required. `add-live-reload` is superseded (marked in its proposal); its staleness tasks 3.1–3.3 carry into group 3 here unchanged.
