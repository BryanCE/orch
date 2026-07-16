## 1. Identity Module
- [x] 1.1 Define the backend-agnostic `Identity` type with `backend`, `workspace`, and `handle` fields
- [x] 1.2 Implement filesystem-safe `serializeIdentity` and `parseIdentity` with backend namespacing, escaping, and validation
- [x] 1.3 Add round-trip tests for herdr, tmux, and headless identities, including `%`, `:`, empty workspace, and collision cases
- [x] 1.4 Export the identity module and verify existing code remains green without consuming the new key format

## 2. Backend Port and Spawn Identity
- [x] 2.0 Complete the D2 control surface on the `Backend` port (deliver/focus/sendKeys/applyLayout + read/zoom/rename/group/workspace/layout/wait/inventory/currentIdentity ops); implement fully on herdr, minimally on tmux/headless; route ALL core call sites (commands/entities/work/orchd) through the port and delete every direct herdr call from core (2026-07-16 — this was previously claimed done but had never been built)
- [x] 2.1 Extend the `Backend` port with `mintIdentity`, `isAvailable`, and `isInsideSession` while preserving existing backend operations
- [x] 2.2 Implement identity minting and capability probes for the herdr backend
- [x] 2.3 Implement identity minting and capability probes for the headless backend using pid handles and a null or local workspace
- [x] 2.4 Add backend capability and identity unit tests for herdr and headless, including unavailable and outside-session states
- [x] 2.5 Write backend, workspace, and serialized identity key fields into each presence record at spawn
- [x] 2.6 Pass the serialized identity as `ORCH_AGENT_KEY` to every spawned agent process
- [x] 2.7 Record backend, minted handle, adapter, and cwd in every `spawned.jsonl` entry
- [x] 2.8 Add spawn and presence integration tests proving identity propagation and backend-independent adapter selection

## 3. Bridge Identity Input
- [x] 3.1 Update every bridge extension to read and validate `ORCH_AGENT_KEY` for presence paths
- [x] 3.2 Remove bridge identity derivation from `HERDR_PANE_ID` and other plexer-specific variables
- [~] 3.3 Add bridge tests for the opaque key, missing-key failure, and operation without herdr environment variables (claude hook covered: opaque-key fixture + hard-fail missing-key test in test/claude-adapter.test.ts; orchestrator-bridge extension itself still untested)

## 4. Workspace Policy Migration
- [x] 4.1 Add presence-record helpers that read and expose the structured identity workspace field
- [x] 4.2 Replace `workspaceOf` and `checkWall` internals with persisted identity workspace reads
- [x] 4.3 Delete the `ws:pane` regex and all plexer-format parsing from workspace policy
- [x] 4.4 Update status, list, events, result, wait, questions, close, queue, and work assumers to use serialized identity parsing and presence identity fields
- [x] 4.5 Update close safety checks to dispatch termination through the recorded backend and verify headless pid identity before signalling
- [x] 4.6 Add workspace-policy tests for same-workspace, cross-workspace, override, null-workspace, and mixed-backend cases
- [ ] 4.7 Add command-level tests proving status and wall decisions use workspace fields rather than serialized key text

## 5. Backend Registry and Factory
- [x] 5.1 Add a backend registry keyed by backend id with self-registration for herdr and headless
- [x] 5.2 Implement `resolveBackend` for explicit config, defaults, capability probes, unknown ids, and unavailable backends
- [x] 5.3 Route spawn and target resolution through the backend factory without hard-coded per-backend selection branches
- [x] 5.4 Update doctor and backend-facing errors to report registered backend capability probes clearly
- [x] 5.5 Add registry and factory tests for explicit selection, implicit headless fallback, unknown ids, and unavailable backends
- [x] 5.6 Add integration tests proving mixed agents keep adapter selection independent from backend selection

## 6. Tmux Backend and Configuration
- [x] 6.1 Implement `src/backends/tmux.ts` with availability and inside-session probes plus session workspace reporting
- [x] 6.2 Implement tmux identity minting with safe handles and full spawn, close, list, and lifecycle behavior
- [x] 6.3 Implement tmux pane/window creation, environment propagation, and tiling for multiple orch agents
- [~] 6.4 Implement tmux ownership checks and cross-session workspace-wall enforcement (wall via shared policy; tmux reports session workspace)
- [x] 6.5 Register the tmux backend and add `--backend tmux` to spawn, tile, and queue command paths
- [x] 6.6 Add `[defaults] backend` config parsing, validation, and default selection behavior
- [x] 6.7 Add tmux backend unit and integration tests for probes, identity, spawn, tiling, close, workspace, and unavailable-session failures
- [x] 6.8 Add CLI tests for explicit tmux selection, configured tmux selection, and backend-independent Claude/pi adapter selection

## 7. Documentation
- [x] 7.1 Update `orch-architecture-*.md` documents with the Bridge, backend port, registry, and factory model
- [x] 7.2 Update `docs/files-and-data-layout.md` with the flat serialized identity key and structured presence identity fields
- [x] 7.3 Document `ORCH_AGENT_KEY`, backend selection, `[defaults] backend`, capability probes, and workspace behavior
- [x] 7.4 Document that old `ws:pane`-era presence directories are abandoned and may be reaped by `orch clean`

## 8. Verification
- [~] 8.1 Run the full Bun test suite and fix all failures (264/266 → migration failures fixed; final run pending reorg)
- [ ] 8.2 Run every OpenSpec scenario for agent adapters, fleet backends, plexer identity, tmux backend, and workspace policy and make them pass
- [ ] 8.3 Run `bun run check` and confirm the repository is clean
