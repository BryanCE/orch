## Context

`TmuxBackend` (`src/backends/tmux/index.ts`) implements the 11 required Backend port methods with real tmux calls but omits the entire optional surface. Fleet-visibility features walk `inventory`/`groups`/`workspaces`/`read`/`waitAgentStatus` and see nothing — launch and steer work, observe does not. Three additional gaps: `list()` returns every pane in every session (unfiltered to orch agents); `resolveBackend` never consults `tmux.isInsideSession()`, so a user inside tmux silently gets headless; and `validateBackend` checks only `isAvailable()`, so `--backend tmux` outside a session validates then crashes at spawn.

Reference implementation is `HerdrBackend` (the full ~30-method surface). Precedent for a backend with no native agent status is `HeadlessBackend`, which filters `list()` through the spawn registry and reads the presence protocol (`status.json`) inside `close()` for ownership. Constraints: Rule 6 node-safe (`node:child_process` execFile only — already how `cli.ts` works), Rule 8 no back-compat, and the capability convention (implement a real method or omit it — never a stub returning false).

## Goals / Non-Goals

**Goals:**
- Real tmux implementations of `inventory`, `groups`, `workspaces`, `read`, `waitAgentStatus`, `renameAgent`, `renamePane`, `createGroup`.
- `list()` and `inventory()` enumerate only orch-spawned panes.
- Implicit backend selection picks tmux inside a live tmux session; session-scoped backends fail fast at validation outside a session.
- tmux ownership / cross-session wall enforced through the shared `checkWall` policy primitive (finishes pluggable-plexer-backends task 6.4).

**Non-Goals:**
- No adapter changes, no tmux HUD/toasts, no file splits, no herdr/headless changes.

## Decisions

### D1 — Mark orch panes with tmux pane user options; enumerate in one `list-panes`
At spawn, stamp pane-scoped user options on the new pane: `@orch_agent_key` (the presence key), `@orch_agent` (adapter id), and later `@orch_agent_name` (display name). `list()` and `inventory()` run one `list-panes -a -F "<tab-joined fields>"` including `#{@orch_agent_key}` and keep only rows with a non-empty key. tmux user options (the `@` prefix) are readable in format strings and settable per-pane with `set-option -p`, so the same query returns pane id, `#{session_name}`, `#{window_id}`, `#{window_name}`, `#{pane_title}`, active flags, and the orch markers together.

*Alternative:* cross-reference pane ids against `spawned.jsonl` (the headless approach). Rejected as the primary marker because it couples the backend to ORCH_DIR/registry freshness and needs a second read; the pane option is self-describing, survives a stale or absent registry, and lets one query carry every inventory field. The registry remains the authority for `close --all`; this is purely the read/enumerate path.

*Registry recording (F6):* tmux does NOT need a backend-internal `appendRegistry` like `HeadlessBackend` keeps. The `spawned.jsonl` registry (`recordSpawned`, `store.ts:106`) is written **generically at the command layer** for every backend — `executeSpawn`/`launchAdditionalAgents` call `recordSpawned(key, { backend: backend.id, handle, … })` for tmux exactly as for herdr (`commands.ts:2013/2043/2105`). `close --all` cross-references each backend's `inventory()` against that registry by `backend`+`handle` (`commands.ts:2414-2424`), so once this change adds tmux `inventory()`, a recorded tmux pane becomes closable by `close --all` with no new backend registry code. Headless's internal `appendRegistry` exists only because headless has no session/inventory to enumerate; tmux enumerates via `list-panes`, so the command-layer record plus `inventory()` is sufficient. This is verified in source, not assumed — a scenario asserts it (task 6.8).

### D2 — Agent status comes from the presence protocol, not tmux
tmux reports no native agent status. The backend is the identity authority, and every orch pane carries its presence key in `@orch_agent_key`, so the backend resolves that key and reads `presenceAgentDir(key)/status.json`. This drives both `inventory().status` (so tmux fleet cards show `working`/`done` like herdr) and `waitAgentStatus` (poll `status.json` until the state matches or the timeout elapses). Precedent: `HeadlessBackend.close()` already reads `status.json` for ownership, so a backend reading presence is established.

*Alternatives:* scrape `capture-pane` for a status marker (rejected — fragile, no reliable marker) or omit `waitAgentStatus` (rejected — that abandons the status parity that motivates the whole change). `status` on `BackendTarget` is a nullable field, so when no `@orch_agent_key` or `status.json` exists it is legitimately `null` — that is a null value, not a stubbed method.

### D3 — `renameAgent` vs `renamePane` map to two distinct tmux writes
`renamePane(handle, name)` sets the pane border title via `select-pane -t <pane> -T <name>` (`#{pane_title}`, the visible border text). `renameAgent(handle, name)` sets the `@orch_agent_name` pane option — the logical agent identity surfaced as `inventory().name` (falling back to `#{pane_title}` when unset). Two single-responsibility writes; neither reinterprets the other. tmux has no third "agent name" concept, so the option carries it.

### D4 — `groups()` / `workspaces()` are scoped to orch structure
`groups()` returns the tmux windows that contain at least one orch pane; `workspaces()` returns the sessions that contain at least one orch pane — both derived from the same filtered pane listing as D1. The cockpit renders the orch fleet's tree, never the user's unrelated windows/sessions.

*Alternative:* enumerate every tmux window/session. Rejected — it violates the workspace wall ("show the orch fleet, not the user's terminal") and the spawn-registry safety principle of never surfacing user-created structure as orch's.

Two port-contract details this change states explicitly (from `backend.ts`): `createGroup` **throws on failure** (it does not return a nullable group), matching the port contract at `backend.ts:183` (a non-nullable `{ group, rootHandle }` return) — the caller treats group creation as an operation that must succeed or surface an error. And a tmux `BackendWorkspace.number` is **`null`**: tmux sessions have no stable orch workspace numbering the way herdr assigns one, so `workspaces()` reports `number: null` for tmux and the fleet view keys off the session name, not a number.

### D5 — Auto-detect and validate through the existing `isInsideSession()` probe, no id-branching
`resolveBackend` gains one rung after the herdr-inside-session probe and before the headless fallback: `if (tmuxBackend.isAvailable() && tmuxBackend.isInsideSession()) return tmuxBackend;`. `validateBackend` gains a uniform check: `if (!backend.isInsideSession()) throw <actionable message naming the missing session>`. Because `isInsideSession()` is already uniform across the port and `HeadlessBackend.isInsideSession()` returns `true` unconditionally, this single check fails fast for session-scoped backends (herdr, tmux) selected outside a session and is a no-op for headless — no `backend.id` branch and no new `sessionScoped` flag. This is the enforcement point the pluggable-plexer-backends "Backend capability probes" requirement already mandates.

### D6 — Cross-session wall is the shared policy at the command layer, but the current wiring is broken and this change fixes it
A tmux identity's workspace is its session name (already true via `mintIdentity`/`currentIdentity`), so a cross-session target is a cross-workspace target, and the wall must ride the shared `checkWall(ownKey, targetKey, {crossWorkspace})` primitive — no tmux-specific wall code. That is the target state. The premise that steer/dispatch *already* route pane targets through `checkWall` correctly is **false today**, and pluggable-plexer-backends task 6.4 is genuinely unfinished as a result. Three concrete defects (verified in source) make both wall scenarios unreachable:

1. **No cross-workspace opt reaches the resolver.** `cmdSteer` calls `resolveTarget(target)` with no options (`commands.ts:1142`); `resolveTarget` only widens its pool past the caller's workspace when `opts.all === true` or the target is host-prefixed (`entities.ts:194`). `--cross-workspace` is parsed into `gov.crossWorkspace` (`commands.ts:2933`) but only threaded into `writeRpc` for the daemon leg (`commands.ts:2945`) — it never reaches `resolveTarget`. So a cross-session pane is not in the scoped pool and cannot be found even with the override.
2. **The foreign fallback feeds the wall a bare pane id, so it silently allows.** When the scoped match misses, `resolveTarget` re-searches the unscoped pool and calls `checkWall(ownKey, foreign.paneId ?? foreign.key, { crossWorkspace: false })` (`entities.ts:204`). For a tmux target `foreign.paneId` is a bare pane id such as `%5`; `workspaceOf("%5")` runs `tryParseIdentity`, which needs three `~`-joined segments, gets one, and returns `null`; `checkWall` treats a `null` target workspace as unscoped and returns `{ allowed: true }` (`workspace.ts:40`). The wall never refuses.
3. **Execution then dies with the wrong message.** Because the fallback did not return an entity, control falls through to `die("No target matches …")` (`entities.ts:208`). So the specced "workspace-wall message" is never printed, and — since the third `checkWall` arg is hardcoded `crossWorkspace: false` and the pool was never widened — the "`--cross-workspace` delivers" path can never resolve a target to deliver to either. Both scenarios fail.

**Fixes this change makes (all in the command/entities layer, none in the backend):**
- Pass the **serialized identity** (`foreign.key`, a `<backend>~<workspace>~<handle>` key that `workspaceOf` can parse) into `checkWall` at `entities.ts:204`, not `foreign.paneId`, so the wall sees the real target workspace and can refuse.
- Give `resolveTarget` a `crossWorkspace` option: when set it (a) widens the search pool to the unscoped set so a cross-session target is findable, and (b) is passed as the `crossWorkspace` value into `checkWall` so an authorized override returns the entity instead of dying. `selfActor()` supplies `ownKey` (a workspace-scoped operator identity, `entities.ts:69`), so same-session steers stay allowed and cross-session steers refuse-or-allow on the flag.
- Thread `gov.crossWorkspace` from `cmdSteer` (and the dispatch/run paths that resolve a target locally) into `resolveTarget(target, { crossWorkspace })`.

Only after scenario execution shows a **real wall refusal message** on a cross-session steer without the flag, and a **real delivery** with `--cross-workspace`, is task 6.4 complete (see tasks 5.1–5.2, gated). The wall stays out of the backend, keeping the port policy-agnostic.

### D8 — `spawn` honors `opts.group`/`opts.split` so created groups are usable
`TmuxBackend.spawn` currently issues `new-window` for every spawn (`tmux/index.ts:58`), ignoring `opts.group` and `opts.split`, so an agent can never be placed into a group `createGroup` just made — the created window would sit empty. To mirror herdr, which pushes `--tab <group>` and `--split <split>` (`herdr/index.ts:156-157`), tmux `spawn` gains a placement path: when `opts.group` names an existing window it uses `split-window -t <window>` (honoring `opts.split` for horizontal/vertical orientation via `-h`/`-v`) instead of `new-window`, stamping the same pane user options and env, and re-tiling the target window. Absent `opts.group` it keeps the `new-window` behavior. This is the placement half of D4's `createGroup`; without it group tiling — a core cockpit-thesis affordance — cannot work.

### Coordination notes (shared infra in flight)

- **Daemon delivery of pane targets (verify-only dependency on `adapter-control-authority`).** `cmdSteer` sends the **bare pane id** as the RPC target (`commands.ts:1159-1160`), while orchd's `deliverBackend` either `parseIdentity(target)` (which a bare `%5` fails) or falls back to `spawnedRecords().get(target)` keyed by the **serialized identity**, which a bare pane id misses — so daemon delivery returns `false` for a tmux pane today (`orchd.ts:88-96`). This is the exact daemon dispatch path `adapter-control-authority` is rewriting (its daemon-side `deliverControl` dispatcher). This change does **not** re-plumb the daemon; instead its scenario run of tmux steer against a real pane is **gated on `adapter-control-authority` landing** (task 6.6), so the two changes don't fight over `deliverBackend`.
- **`herdrStatus` → `backendStatus` rename (ordering with `adapter-presence-writers`).** `inventory().status` is surfaced through the entity field currently named `herdrStatus` (`entities.ts:104`); `adapter-presence-writers` renames it to `backendStatus`. Tmux inventory sourcing status from presence (D2) lands in that same field, so its tasks are ordered/labeled to consume whichever name is current at implementation time and to rebase onto the rename rather than collide with it (task 2.2 note).
- **Archive gate on `plexer-base-sync`.** This change's `ADDED` requirements extend the pluggable-plexer-backends base tmux-backend/fleet-backends specs. That base must be synced into the main specs first by the new `plexer-base-sync` change; this change's archive is sequenced after it (task 6.7).

### D7 — `read()` throws; queries stay best-effort
`read(handle, lines)` uses `capture-pane -p -t <pane> -S -<lines>` through a strict execFile helper that throws on failure (matching `HerdrBackend.read`, since callers treat read failure as an error). All enumeration/rename/status queries stay on `bestEffortTmux` (returns `null` on failure). New tmux invocations live in `src/backends/tmux/cli.ts` as node `execFile` calls — no `Bun.*`.

## Risks / Trade-offs

- Backend reads orch's presence dir (D2) → a mild layering coupling, but bounded to the key the backend itself minted and stamps on the pane, and already precedented by headless.
- Pane user options are lost if a pane is replaced by non-orch means → such a pane simply drops out of orch enumeration, which is the correct (orch-only) behavior, not a bug.
- `inventory()` does N presence-file reads for status → N is the orch fleet size (small); reads are best-effort and skip cleanly when absent.
- `list-panes -a` spans all sessions → the `@orch_agent_key` filter keeps output to orch panes; the user's panes are read past, never acted on.

## Migration Plan

Additive: new optional methods and two registry checks. No data migration. Rollback is reverting the backend/registry edits; existing required-method behavior is untouched. The pluggable-plexer-backends change remains the base tmux-backend spec; this change's deltas merge additively on archive.

## Open Questions

- None blocking. If a future spawn-into-existing-window picker needs the user's own windows, that is a separate spawn-target concern outside this change's read-only fleet-visibility scope.
