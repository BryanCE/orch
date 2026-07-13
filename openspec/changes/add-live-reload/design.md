# Design: add-live-reload

## Approach

Three small mechanisms, no daemon, no new state files beyond one field:

1. **Config hot-reload** — `fs.watch($ORCH_DIR/config.toml)` (with a 250ms debounce and polling fallback) inside the two long-running commands. On change: `loadConfig()`; on success swap the in-memory config, on parse failure keep last-good and warn once. The watcher lives in `src/config.ts` as `watchConfig(orchDir, onChange)` so both commands share it.

2. **Fleet reload signal** — orch-side watchers are plain processes; they get a `reload` line appended to a well-known control file (`$ORCH_DIR/reload.signal`, mtime bump is the signal — content irrelevant) that `watchConfig` also watches. `orch reload` (extending the existing `restart`/reload path in `src/commands.ts`) does: pane `/reload` per target (existing), then touches `reload.signal`. No sockets, no pid tracking for watchers.

3. **Staleness detection** — at extension load, the bridge hashes its own source file (`fs.readFileSync(import.meta.url path)` → short sha) into `status.json.extensionHash`. Doctor check `staleExtensions` hashes on-disk files and compares per live pane. `orch status` appends a `!stale` marker to the STATE column when hashes differ. Uses existing presence protocol — schema-additive field, readers tolerate absence.

## Decisions

- **D1: mtime-bump signal file over sockets/IPC** — watchers already watch files; one more watched path is zero new machinery and works across WSL/Windows boundaries where unix sockets are fragile.
- **D2: last-good config on parse failure** — a stream must never die because the operator saved mid-edit; matches notify.ts best-effort philosophy.
- **D3: content hash, not mtime, for staleness** — symlinked extensions (`orch setup` default) make mtime unreliable across the symlink; a short content hash is unambiguous and cheap at load time.
- **D4: no auto-reload of panes** — automatic `/reload` mid-run could interrupt an agent's turn; staleness is surfaced (doctor/status) and reload stays an explicit operator/orchestrator action.

## Risks

- `fs.watch` on /mnt/c (DrvFs) is historically unreliable → every watcher pairs with a 5s poll fallback (config file stat).
- Bridge hashing at load adds ~1ms per pane start — negligible.
- Two orchestrator sessions may both touch `reload.signal`; harmless — reload is idempotent.
