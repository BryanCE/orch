## Why

orch's two axes — *what runs* (agent: pi/claude/codex) and *where it runs* (plexer: herdr/headless) — are supposed to vary independently, but they don't: agent identity is minted inside the bridge from herdr's `HERDR_PANE_ID`, and the workspace wall is derived by regex-parsing herdr's `ws:pane` string (`src/policy/workspace.ts`). That welds the core to one multiplexer, so a second plexer (tmux) cannot drop in. To publish orch as a tool anyone can adopt on their own stack, the plexer must be a real port behind a stable abstraction — the GoF **Bridge** spine — with each concrete multiplexer an **Adapter**, selected at runtime by config.

## What Changes

- **BREAKING**: Presence keys move from herdr's `ws:pane` string to a backend-namespaced structured identity `{ backend, workspace, handle }`, serialized to a filesystem-safe key (e.g. `herdr/wD/p2`, `tmux/main/%5`, `headless/1234`). Existing `~/.orch/agents/<key>` dirs from the old format are not migrated (nothing is published yet; a clean reset is expected).
- **BREAKING**: The plexer **port** becomes the identity authority. It mints the handle, reports its workspace, and probes availability/current-session (`isAvailable`, `isInsideSession`) — the agent bridge no longer reads `HERDR_PANE_ID`; it receives an opaque orch-provided key via env.
- The workspace wall (`workspaceOf`/`checkWall`) consumes the backend-reported `workspace` field. No policy code parses any plexer's string format.
- Backends register in a **registry** and are built by a **factory** from config (`[defaults] backend = "tmux"`), replacing hard-coded backend wiring. This is the Provider Model (Factory + Strategy) selection layer.
- A **tmux backend adapter** ships as the first proof that the port is truly pluggable (spawn/close/list panes, layout, identity, workspace, capability probing).
- **Bridge enforced**: agent adapters become plexer-agnostic and plexer backends become agent-agnostic; neither references the other's concrete type.

### Non-goals (explicitly deferred)
- **zellij / screen adapters** — deferred until the herdr + headless + tmux primitives are proven. Build the port before expanding the set.
- **Remote/multi-machine transport** — out of scope; identity abstraction is a prerequisite for it, not part of it.
- **Governance/durable-messaging internals** — unchanged; they consume the new structured workspace but their logic is not rewritten here.

## Capabilities

### New Capabilities
- `plexer-identity`: backend-owned structured identity (`backend`/`workspace`/`handle`), filesystem-safe namespaced key format, minted at spawn and carried to the agent process by env — the replacement for `HERDR_PANE_ID` parsing.
- `tmux-backend`: the tmux plexer adapter implementing the plexer port (session/window/pane spawn, close, list, layout, identity, workspace, `isAvailable`/`isInsideSession`).

### Modified Capabilities
- `fleet-backends`: the Backend/plexer port gains identity minting, workspace reporting, and capability probing; concrete backends self-register and are selected by a config-driven factory; the port is agent-agnostic (Bridge).
- `workspace-policy`: workspace and the wall are derived from the backend-reported identity, not a `ws:pane` regex; walls become plexer-agnostic and apply uniformly (herdr, tmux, headless).
- `agent-adapters`: agent identity comes from an orch-provided opaque key (env), never a plexer-specific variable; adapters are plexer-agnostic (Bridge).

## Impact

- **New**: `src/backends/tmux.ts`; a backend registry/factory; a plexer-identity module.
- **Modified (port + policy)**: `src/backends/backend.ts` (port shape), `src/backends/herdr.ts` and `src/backends/headless.ts` (implement identity/workspace/probing), `src/policy/workspace.ts` (consume structured workspace), `src/store.ts` (key serialization / presence-dir naming).
- **Modified (identity threading — the ~7 assumers)**: `src/commands.ts`, `src/entities.ts`, `src/adapters/claude.ts`, `src/daemon/orchd.ts`, `extensions/orchestrator-bridge.ts`, `extensions/herdr-agent-state.ts`.
- **Config**: `[defaults] backend` selects the plexer; new backends need no call-site edits.
- **Docs**: architecture diagrams (`orch-architecture-*.md`) and `docs/reference/files-and-data-layout.md` (key format) update to the new identity model.
