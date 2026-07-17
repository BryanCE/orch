## Context

orch separates *what runs* (agent adapters: pi/claude/codex) from *where it runs* (plexer backends: herdr/tmux/headless). The interfaces exist (`src/backends/backend.ts`, `src/adapters/adapter.ts`), but the separation leaks: agent identity is minted inside the pi bridge from herdr's `HERDR_PANE_ID`, and the workspace wall is computed by regex-parsing herdr's `ws:pane` string (`src/policy/workspace.ts:12`). The daemon and command layer also dispatch and control panes through concrete herdr calls. Because core code knows one multiplexer's string grammar and control surface, a second plexer cannot be added without special-casing. Nothing is published yet, so a clean break is acceptable; no compatibility shims are needed.

Research into comparable tools supports this architecture:
- **Ports & Adapters (Hexagonal)** at the system level — orch owns the ports; herdr/tmux/pi are adapters to the outside.
- **Bridge** for the two independent axes (agent × plexer) — both `Backend` and `AgentAdapter` remain independent.
- **Adapter** per concrete tool wrapping a foreign CLI to a port.
- **Provider Model (Factory + Strategy)** for config-driven runtime selection.

## Goals / Non-Goals

**Goals:**
- Make the plexer a true port: any backend implements the complete control contract, is selected by config, and requires zero call-site edits.
- Make the backend the identity authority. It mints a stable `{ backend, workspace, handle }`; every backend reports a workspace; and no core code parses a multiplexer's string format.
- Enforce Bridge separation: agent adapters never reference a plexer type or plexer environment variable, and plexer backends never reference an agent type or runtime.
- Prove it with herdr + headless first, then tmux.

**Non-Goals:**
- zellij / screen adapters — deferred until the common path is proven.
- Remote/multi-machine transport.
- Rewriting governance or durable-messaging internals; they consume the new structured workspace.

## Decisions

### D1 — Bridge is the spine; Adapter is per-tool; Provider Model selects

Keep the two axes (`AgentAdapter`, plexer `Backend`) as independently-varying hierarchies (Bridge). Each concrete backend is an Adapter over a foreign CLI. A registry + factory builds the configured backend (Provider Model). Adding a backend means a new adapter and registration, not new command-layer branches.

- *Alternative — Strategy only:* Strategy swaps algorithms orch owns; herdr/tmux are foreign systems with their own interfaces, so Adapter plus Bridge is the correct boundary. Strategy remains the factory's selection mechanism.
- *Alternative — one flat runner merging agent and plexer:* this creates an agent × plexer class for every pair and defeats Bridge. Rejected.

### D2 — The backend port is the identity and control authority

The `Backend` port owns backend-specific handle creation and exposes this complete surface:

- `mintIdentity(handle) → { backend, workspace, handle }` and the probe methods `isAvailable()` and `isInsideSession()`.
- `deliver(handle, payload)` for daemon dispatch and steer.
- `close(handle)` for safe pane/process close.
- `focus(handle)` for selecting a target.
- `sendKeys(handle, keys)` for keystroke control.
- `applyLayout(tabOrGroup, layout)` for tab/group layout operations.
- `list()` for backend-native target enumeration.
- Capability flags: `panes`, `focusable`, and `canSendKeys`.

Every herdr branch in `src/daemon/orchd.ts` and `src/commands.ts` (including `herdrBestEffort` and the focus/layout/send-keys/close paths) must route through this surface and then be deleted. A backend that lacks an operation declares the corresponding capability false; callers check the flag and do not use concrete casts. The registry/port contract has tests for every method and capability combination.

Identity is minted by the selected backend for the actual handle, before the agent starts writing presence. It stays stable across list/status, restart, reattach, and process recovery unless the backend creates a new handle. Headless uses its process handle and still follows the same contract.

- *Alternative — keep minting in the bridge:* that forces each agent extension to know each plexer environment. Rejected.

### D3 — Flat serialized key and opaque environment propagation

The presence key is exactly one filesystem-safe segment:

`<backend>~<workspace>~<handle>`

Each part percent-escapes `~`, `%`, `:`, and `/` (escape `%` first or use an equivalent unambiguous percent codec). Examples are `herdr~wD~p2`, `tmux~main~%255`, and `headless~local~1234`. `~/.orch/agents/` contains one flat directory per agent. Nested paths such as `~/.orch/agents/tmux/main/%5/` are forbidden. `serializeIdentity` and `parseIdentity` are the only key/identity boundary, with round-trip and malformed-input tests.

The agent process receives the opaque key in `ORCH_AGENT_KEY`. A missing or malformed `ORCH_AGENT_KEY` is a hard startup error: the agent exits non-zero, reports the validation error, and creates no presence directory. Agent bridges and hooks never read `HERDR_PANE_ID`, `TMUX_PANE`, or any other backend environment variable.

### D4 — Every backend reports a workspace; walls are uniform

`workspace` is always a string in an identity and presence record. Herdr reports its workspace, tmux reports its session workspace, and headless reports the literal workspace `local` (never `null`). `workspaceOf` reads the persisted identity workspace field; it never parses the key. `checkWall` applies the same rule to herdr, tmux, and headless: a cross-workspace write is refused unless the explicit cross-workspace permission is enabled. The `ws:pane` regex is deleted. There is no unscoped/null exception.

### D5 — Versioned presence records and lifecycle of bad records

Every presence directory contains a record with `schemaVersion: 1`, the serialized `key`, and the identity fields `backend`, `workspace`, and `handle`, plus the existing process/status fields. Writers must emit the version and all identity fields; readers must verify the key round-trip and field agreement.

Readers (`status`, fleet enumeration, and wall checks) ignore malformed, unknown-version, and legacy pre-v1 records so they cannot target or write through them. `orch doctor --json` reports each ignored record with its path and reason and returns non-zero when any are found. `orch clean` (including its orphan/stale cleanup) reaps those records after its normal safety checks. This explicitly covers old nested records and old flat `ws:pane` records.

### D6 — Registry, factory, capabilities, and verifiable Bridge separation

Backends self-register under `herdr`, `tmux`, and `headless`; `resolveBackend(config)` returns the configured backend. `orch doctor --json` reports each registered backend's availability, inside-session probe, workspace, and capability flags (`panes`, `focusable`, `canSendKeys`) with stable field names and exit status.

The required static boundary check is `bun run check:bridge`. It scans agent adapter sources for imports/references to backend types and plexer environment variables, and scans backend sources for references to pi, claude, codex, or agent types. It exits zero only when no forbidden cross-axis reference exists and non-zero on the first violation. This check is required in CI and at each migration gate.

## Risks / Trade-offs

- **Breaking key format churns every live presence dir.** → Acceptable: old records are not read as live; `orch doctor --json` reports them and `orch clean` reaps them.
- **Wide blast radius.** → Land the common path as one atomic vertical slice, with gates below; the key and identity fields localize the churn.
- **tmux handles contain `%` and `:`.** → The single-segment codec is the only serialization boundary; test round-trips for all three backends.
- **Bridge separation can erode later.** → `bun run check:bridge` makes forbidden imports, env vars, and runtime references fail visibly.
- **Nested multiplexers can confuse probes.** → Config selection wins; probes inform doctor/defaults and never silently override an explicit backend.

## Migration Plan

1. **Atomic common vertical slice:** in one landing, add the identity codec and versioned record schema; migrate every presence writer and reader (including Claude hooks and tests); add the complete registry/backend port and capability contract; implement herdr and headless; route spawn, daemon delivery, close, focus, send-keys, layout, list, and walls through the port; pass `ORCH_AGENT_KEY`; and enable the flat v1 format. No intermediate commit may ship only part of this slice.
   - **Gate:** `bun run check`, `bun run check:bridge`, and the named CLI integration test `bun test test/cli-backends-herdr-headless.test.ts` must pass before landing.
2. **Tmux group:** implement and register tmux against the same identity, presence, wall, and complete control contracts; add configured selection and its CLI integration coverage.
   - **Gate:** `bun run check`, `bun run check:bridge`, and `bun test test/cli-backends-tmux.test.ts` must pass before landing.
3. **Documentation and cleanup:** update architecture and data-layout docs, including the flat key, v1 schema, malformed-record lifecycle, and backend capability output.
   - **Gate:** `bun run check`, `bun run check:bridge`, and `bun test test/cli-backends-herdr-headless.test.ts test/cli-backends-tmux.test.ts` must pass.

orch remains shippable throughout: the first group is complete before the new format is enabled, and tmux lands only after the common path is green. Rollback is a code revert; old records remain safely ignored until `orch clean` reaps them.

## Open Questions

- Whether `orch rename` should update a display-only `by-name` view; the flat identity key remains the sole storage surface.
- Whether future remote transport needs a workspace taxonomy beyond the backend-reported string; no null/unscoped value is permitted in this design.
