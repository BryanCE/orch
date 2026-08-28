# Design-rulings reconciliation

The ten `DESIGN` tags in `02-scope.md` were checked against `TASKS/NOTES.md`, every
`TASKS/adr/*` record, the closed/open-rulings section of `02-scope.md`,
`01-agent-model.md`, `06-schema.md`, `07-port-seam.md`, all other TASKS documents,
and `git log -p -- TASKS`. Quotes below are verbatim from the cited ruling text.

## D10 — lock-delay cooldown after expiry

**NOT FOUND.** The only explicit statement is still an open item, not a ruling:

> “**`D10` lock-delay** — the cooldown after lease expiry is designed as a rule but has no
> number and no home yet.” (`TASKS/06-schema.md:534-541`)

Searched `TASKS/NOTES.md`, `TASKS/adr/*`, the open/closed-rulings section of
`TASKS/02-scope.md`, `TASKS/01-agent-model.md`, `TASKS/06-schema.md`,
`TASKS/07-port-seam.md`, all other `TASKS/` files, and every historical TASKS patch.
Those occurrences describe D10 as needing a ruling; none settles whether a cooldown
exists, its duration, or where it is stored. No BUILD spec is emitted and the scope
status remains `DESIGN`.

## E2 — headless delivery

**Ruling:**

> “`AgentChannelRole` is always the orch inbox → bridge → ack path. `CaptureRole` is always orch's
> captured presence/result path. A pane fast path is explicit `PaneInputRole.submit`; it is never a
> fallback for failed delivery. Headless therefore has channel, capture and process roles and no
> pane roles. It does not implement a fake backend.” (`TASKS/07-port-seam.md:91-94`)

**BUILD spec:**
- Touch `src/backends/headless/index.ts`, the environment composer/port, and the orch presence/outbox channel (`src/presence/`, `src/daemon/outbox.ts`).
- Write the failing headless delivery/ack and captured-read contract test first, as required by `TASKS/07-port-seam.md:186-190`.
- Compose headless with required channel, capture, and process roles; route delivery through inbox → bridge → ack, never a pane.
- Delete the backend `deliver` boolean/fake backend and any pane fallback path; absence of pane roles is structural.

## E9 — plexer homes for orch structure

**Ruling:**

> “A plexer can also **hold orch's own structure**: a space or a pack can be given a home of its
> own inside the plexer. The grouping is orch's and the name is orch's; the plexer only renders
> it, using whatever it groups by internally.” (`TASKS/03-vocabulary.md:200-213`)

> “Every method in every role is required. A provider composes only roles it implements completely;
> it never installs a stub, returns “unsupported”, or supplies a capability value. The nullable
> members are structural environment axes, not flags: consumers cannot invoke a missing role, and
> adding a plexer edits its provider/composer registration only. Opaque plexer coordinates remain
> in `agent_handles`, `space_plexers` and `pack_plexers`; they never become orch names.” (`TASKS/07-port-seam.md:85-89`)

**BUILD spec:**
- Touch the provider/composer and `GroupHomeRole`/`SpaceHomeRole`, spawn/home persistence, and `space_plexers`/`pack_plexers` store seams.
- Write create/rename/close/focus plus coordinate-persistence provider tests first (`TASKS/07-port-seam.md:194-198`).
- Implement complete per-plexer home roles, branching on the provided role and persisting opaque coordinates for spaces/packs.
- Delete `orch ws`, core workspace methods/vocabulary, plexer-id branches, and any display of a plexer coordinate as an orch name.

## F5 — `orch space` command surface

**Ruling:**

> “Any orch may create, read or rename a space. An orch may **delete a space it is in**, provided
> no other pack is in it — so nobody moves the wall out from under someone else's agents. A
> totally empty space is the user's to delete, surfaced in the web.” (`TASKS/03-vocabulary.md:160-177`)

> - The grouping is `spaces`, and agents carry `space_id`.
> - "Workspace" is a **plexer's** word — herdr's grouping, tmux's session. It lives inside an
>   environment as the plexer's own coordinate and appears nowhere in orch's model, CLI, or UI.
> - Every existing use of "workspace" for orch's own grouping — the store column, the
>   `--workspace` flag, `orch ws`, the workspace-wall policy, the event field — names the wrong
>   concept and is renamed, not aliased. (`TASKS/adr/0001-space-not-workspace.md:46-51`)

**BUILD spec:**
- Touch `src/commands/space.ts`, command registration/help, space store/RPC boundaries, and CLI tests.
- Write the create/read/rename/delete command test first, including the “no other pack” delete guard.
- Resolve space names through orch-owned ids and enforce the stated membership rule; expose empty-space deletion to the web.
- Delete `orch ws`, `--workspace` as orch grouping, and workspace-wall/name aliases; do not add a compatibility command.

## G8 — web layout and `ScrollArea`

**NOT FOUND.** The only matching statement is the scope row itself:

> “**Layout system** — only the content region scrolls; correct shadcn `ScrollArea` usage on every page” (`TASKS/02-scope.md:204`)

Its status annotation says “asked for, never designed.” Searches of `TASKS/NOTES.md`,
`TASKS/adr/*`, the closed/open-rulings section, `TASKS/01-agent-model.md`,
`TASKS/06-schema.md`, `TASKS/07-port-seam.md`, all other `TASKS/` files, and every
historical TASKS patch found no layout decision, page map, or `ScrollArea` contract.
No BUILD spec is emitted and the scope status remains `DESIGN`.

## I4 — doctor declared-vs-reality checks

**Ruling:**

> “Provider availability and version checks belong to registration/setup/doctor, outside the action
> port. Their result is a structured diagnosis (`available`, `missing`, `incompatible`, with text),
> not an action-time boolean.” (`TASKS/07-port-seam.md:96-100`)

> “| `doctor/backends.ts` booleans and ids | Doctor diagnoses configured/recorded environment recipes and host compatibility, then lists the roles the composer produced. It does not call action ports or infer “headless” from flags. |” (`TASKS/07-port-seam.md:139`)

**BUILD spec:**
- Touch `src/doctor/backends.ts`, doctor registration/config runners, environment/lease queries, and doctor tests.
- Write a diagnosis matrix first: declared-vs-reality leases, recorded environments, and orphan state, including missing/incompatible text.
- Make doctor compare recorded recipes/host reality and lease/orphan facts, returning structured diagnoses without action-time probing.
- Delete doctor backend-id/boolean inference and action-port calls; no capability flags or “headless” inference remain.

## I8 — unrunnable scoped tasks

**Ruling:**

> “**Unrunnable** — the task's scope contains no live agent. Agent-scoped and the agent is
> closed; pack-scoped and the pack is gone. Nobody can ever claim it, so it is surfaced as
> unrunnable and is reapable. That is a *fact about the task*, not a timer.” (`TASKS/NOTES.md:224-230`)

> “Three resolutions, all deliberate: **take it on** (re-scope to the taker's pack), **leave it**,
> **reap it**. The surfacing is the mechanism; the decision is always a person's or an orch's.”
> (`TASKS/NOTES.md:248-252`)

**BUILD spec:**
- Touch `task_states`/task queries, doctor queue diagnostics, the queue command/reap boundary, and focused doctor tests.
- Write the missing-scope-row test first: report `unrunnable` and preserve the task until an explicit resolution.
- Derive unrunnable from live scope membership and surface it for deliberate take-on/leave/reap decisions.
- Delete age-based or timer auto-deletion of queued tasks; a stale but claimable task remains visible.

## M6 — one daemon per machine

**Ruling:**

> “**The rule.** One orchd per machine. The CLI on either OS, the web, and a harness bridge are
> all clients that dial it. `$ORCH_DIR` is orchd's private backing store: an implementation
> detail, never an address, never something a client reads to decide anything. Discovery is
> separate from storage — a socket path and the token file.” (`TASKS/NOTES.md:340-343`)

> “The same node-safe binary runs on either side, but **never both at once**. Machine-wide
> registration: a second start on the other side refuses and prints where the live one is, and
> doctor verifies declared-vs-reality like every other check.” (`TASKS/NOTES.md:368-370`)

**BUILD spec:**
- Touch daemon startup/registration and runtime discovery/lock files, client connection paths, doctor checks, and daemon tests.
- Write the second-start test first: a second OS-side registration is refused and names the live daemon location.
- Enforce one machine-wide daemon while keeping `$ORCH_DIR` private storage discovered via socket plus token.
- Delete dual-daemon startup and every client read of `$ORCH_DIR`/presence as a second source; doctor reports lock reality.

## M7 — cross-OS executor backend

**Ruling:**

> “What genuinely differs across the boundary is **execution, not truth**: a WSL daemon cannot
> `kill(pid, 0)` a Windows process, and `processInstanceMatches` is the single primitive the
> lease model stands on. That is not an argument for a second daemon — it is an argument that the
> far side needs an **executor**, which is precisely the backend port from Rule 9: start a
> process somewhere, report whether it is alive, kill it. The OS boundary is environment plus a
> capability, and per E3 adding it edits zero renderers, commands, or policy.” (`TASKS/NOTES.md:350-355`)

> “An OS side with no executor is a **declared missing capability** — an honest "nothing can run
> here", never a crash and never a silently empty list.” (`TASKS/NOTES.md:372-373`)

**BUILD spec:**
- Touch the process/backend port and per-OS executor providers, environment composition/RPC, doctor diagnostics, and executor tests.
- Write start/state/kill tests across local and cross-OS executors first, plus the no-executor answer case.
- Keep one daemon/store and delegate far-side process start, liveness, and kill through the recorded environment executor.
- Delete peer-daemon assumptions and crash/empty-list fallbacks for a missing executor; return the declared “nothing can run here” answer.

## M8 — offline status command

**NOT FOUND as a final command choice.** The architecture ruling is clear that there is one source,
but the command disposition remains explicitly alternative:

> “**The rule.** One orchd per machine. The CLI on either OS, the web, and a harness bridge are
> all clients that dial it. `$ORCH_DIR` is orchd's private backing store: an implementation
> detail, never an address, never something a client reads to decide anything. Discovery is
> separate from storage — a socket path and the token file.” (`TASKS/NOTES.md:340-343`)

> “**`orch status --offline`.** A second reader of a second source. It survives only as a
> doctor affordance that says loudly it is not the truth, or it goes.” (`TASKS/NOTES.md:375-381`)

Searched `TASKS/adr/*`, the open/closed-rulings section, `TASKS/01-agent-model.md`,
`TASKS/06-schema.md`, `TASKS/07-port-seam.md`, all other `TASKS/` files, and every
historical TASKS patch. No ruling chooses “doctor affordance” versus deletion. No BUILD
spec is emitted and the scope status remains `DESIGN`.
