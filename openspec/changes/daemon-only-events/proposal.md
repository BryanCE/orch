## Why

`orch events` has two event sources. The daemon pushes transitions over the RPC socket, and `--offline` watches `$ORCH_DIR/agents/*/status.json` directly from the client. The second one exists so that a user with a dead daemon can still see *something*.

That escape hatch costs more than it returns:

- **Two implementations of the same transition semantics.** The daemon derives events from presence files via `startPresenceWatch`; the CLI derives them from the same files with the same function but a different seed (`seedEventStates`) and a different notification path. Divergence between them is silent — you only find out when the two disagree about what state an agent is in.
- **A polling probe that exists only to hand over.** `startPreferredEvents` calls `daemon-status` every 500ms purely to detect that it should switch to files. Nothing else needs that probe; the socket already knows when it closes.
- **`--notify` only ever worked in the mode being deleted.** The RPC path never delivered to sinks (the daemon owns notification); only the file path called `notify`. So the flag was live in the fallback and dead in the normal path — the exact confusion two sources produce.

Presence files are orchd's *ingress*, not a client transport. Harness shims write them, the daemon is the single reader that turns them into events, and clients subscribe to the daemon. One source, one set of semantics.

## What Changes

- **`orch events --offline` is removed.** The command requires a running daemon, with no read-only file-watch mode. `orch status --offline` is untouched — `status` is a point-in-time file read that never had a second implementation to diverge from.
- **`startPreferredEvents` is deleted** from `src/daemon/events.ts`, along with its `PreferredEvents` / `PreferredEventsOptions` types and the 500ms `daemon-status` probe. `orch events` calls `rpcSubscribe` directly.
- **`rpcSubscribe` gains an `onClose` callback.** The socket closing IS the disconnect signal, so detection stops being a poll and becomes an event. `onClose` fires on a daemon-side drop but NOT on a caller-initiated `stop()`, so a clean shutdown is never reported as a disconnect.
- **A dropped subscription exits non-zero** naming `orch daemon start`, rather than degrading to files.
- **`startPresenceWatch` becomes daemon-only.** It stays exactly as it is — it is how orchd ingests presence — but its only importer is now `src/daemon/orchd.ts`, and its doc comment records that importing it outside `src/daemon/` reintroduces the second event source.

## Capabilities

### Modified Capabilities
- `orchd-daemon`: the read-command resilience requirement currently grants `orch events` an explicit `--offline` file-watch mode. That clause is removed; `orch events` requires orchd unconditionally. The rest of the requirement — `status`/`result`/`doctor` staying file-readable, write commands refusing without the broker — is unchanged.

## Open Question

`--notify` on `orch events` is now inert in every mode: the daemon delivers to sinks, and the only client-side delivery lived in the deleted file path. It should either be removed from the command, or the client should deliver on received events (which would double-notify against the daemon's own sinks). Removal is the coherent answer under a daemon-only model, but it is a second user-facing flag deletion and is deliberately NOT bundled into this change.
