# Port seam — environment-derived roles

**Status: DECIDED. This is the implementation contract.**

## Decision

The current `Backend` interface is deleted. It conflates process execution, orch delivery,
pane control, plexer structure, discovery and maintenance in one 30-method object, then describes
that object three times: optional methods, `capabilities`, and bare booleans. None survive.

An action receives a **composed environment**, built from the environment recorded at `hello` and
the compatible `host_plexers` row. Providers do not announce capabilities and actions do not
probe for them. A move selects a new recorded environment; an upgrade selects a new compatible
provider implementation. Acting performs no discovery or negotiation.

```ts
interface EnvironmentServices {
  // Present for every live agent. These are orch services, not plexer services.
  readonly process: ProcessRole;
  readonly channel: AgentChannelRole;
  readonly capture: CaptureRole;

  // A null role means that thing is not in the recorded environment.
  readonly paneHost: PaneHostRole | null;
  readonly paneInventory: PaneInventoryRole | null;
  readonly paneInput: PaneInputRole | null;
  readonly paneScreen: PaneScreenRole | null;
  readonly paneZoom: PaneZoomRole | null;
  readonly paneNaming: PaneNamingRole | null;
  readonly agentNaming: AgentNamingRole | null;
  readonly agentStatus: AgentStatusRole | null;
  readonly groupHome: GroupHomeRole | null;
  readonly groupLayout: GroupLayoutRole | null;
  readonly spaceHome: SpaceHomeRole | null;
  readonly ownedLogs: OwnedLogsRole | null;
}

interface ProcessRole {
  start(request: StartRequest): StartedProcess;
  state(process: RecordedProcess): "alive" | "dead" | "replaced";
  kill(process: RecordedProcess, signal: NodeJS.Signals): void;
}
interface AgentChannelRole { deliver(agentId: string, message: AgentMessage): DeliveryReceipt; }
interface CaptureRole { read(agentId: string, request: CaptureRequest): CapturedOutput; }

interface PaneHostRole {
  open(request: OpenPaneRequest): CreatedPane;
  close(handle: PlexerHandle): void;
}
interface PaneInventoryRole {
  current(): PaneCoordinate | null;
  list(): readonly PaneTarget[];
}
interface PaneInputRole {
  submit(handle: PlexerHandle, text: string): void;
  sendKeys(handle: PlexerHandle, keys: readonly string[]): void;
  focus(handle: PlexerHandle): void;
  foreground(handle: PlexerHandle): PaneForeground;
}
interface PaneScreenRole { read(handle: PlexerHandle, lines: number): string; }
interface PaneZoomRole { setZoom(handle: PlexerHandle, mode: "on" | "off" | "toggle"): void; }
interface PaneNamingRole { renamePane(handle: PlexerHandle, name: string): void; }
interface AgentNamingRole { renameAgent(handle: PlexerHandle, name: string): void; }
interface AgentStatusRole { wait(handle: PlexerHandle, state: string, timeoutMs: number): void; }

interface GroupHomeRole {
  list(): readonly PlexerGroup[];
  create(request: CreateGroupRequest): CreatedGroup;
  rename(coordinate: string, label: string): void;
  close(coordinate: string): void;
  focus(coordinate: string): void;
  move(request: MovePaneRequest): void;
}
interface GroupLayoutRole { read(coordinate: string): GroupLayout; }
interface SpaceHomeRole {
  list(): readonly PlexerHome[];
  create(subject: { kind: "space" | "pack"; id: string }, request: CreateHomeRequest): CreatedHome;
  rename(coordinate: string, label: string): void;
  close(coordinate: string): void;
  focus(coordinate: string): void;
}
interface OwnedLogsRole { prune(request: PruneLogsRequest): number; }
```

Every method in every role is required. A provider composes only roles it implements completely;
it never installs a stub, returns “unsupported”, or supplies a capability value. The nullable
members are structural environment axes, not flags: consumers cannot invoke a missing role, and
adding a plexer edits its provider/composer registration only. Opaque plexer coordinates remain
in `agent_handles`, `space_plexers` and `pack_plexers`; they never become orch names.

`AgentChannelRole` is always the orch inbox → bridge → ack path. `CaptureRole` is always orch's
captured presence/result path. A pane fast path is explicit `PaneInputRole.submit`; it is never a
fallback for failed delivery. Headless therefore has channel, capture and process roles and no
pane roles. It does not implement a fake backend.

Provider availability and version checks belong to registration/setup/doctor, outside the action
port. Their result is a structured diagnosis (`available`, `missing`, `incompatible`, with text),
not an action-time boolean. Harness variation is composed the same way: the control dispatcher
receives required strategy roles (`AskStrategy`, `SteerStrategy`, `ModelStrategy`,
`LifecycleStrategy`) rather than reading adapter capability fields or optional methods.

## Command boundary and errors

There is no unsupported-operation error inside orch. The command boundary resolves the target,
loads its recorded environment, and asks the composer for the role required by that command.
That produces one of two command plans:

```ts
type BoundaryPlan<T> =
  | { readonly outcome: "invoke"; readonly role: T }
  | { readonly outcome: "answer"; readonly text: string; readonly reason: "no-pane" | "no-environment-role" };
```

Only the boundary handles `answer`; internal action functions accept a required role and have no
absence branch. Example: `orch zoom worker-1` for a headless agent prints
`worker-1 has no pane; zoom does not apply.` and exits successfully. JSON reports
`{"outcome":"answer","reason":"no-pane",...}`. No exception was raised and no plexer call was
attempted. A paned environment without a zoom role is likewise answered at the boundary as
`this pane environment does not provide zoom`; that is environment description, not a provider
failure.

Once an invocation begins, failure is failure. Mutation methods return `void`; queries return
data; waits either return or throw a timeout error. No action returns success/failure as a
boolean. Provider adapters preserve the real command, exit status, stderr and stdout in the
thrown error. The CLI's single outer boundary renders that text and exits non-zero; RPC returns
the same text to its caller; an agent caller receives that RPC failure through its own reply
channel. Multi-target commands record `outcome: "done" | "error"` plus the real error text,
never `ok: false`. Cosmetic follow-up actions are either part of the requested transaction and
fail it, or are not performed; they are never warning-only best effort.

## All 17 current branch groups

| current site | becomes |
|---|---|
| `commands/control.ts` adapter caps and `canSendKeys` | The sole control dispatcher is given a required harness strategy and, only for a keys strategy, a required `PaneInputRole`. Missing roles are answered before dispatch; execution failures throw. |
| `worker-prompt.ts` adapter caps | Prompt construction receives a resolved `WorkerInteraction` strategy value from the harness composer; it does not inspect ids, caps or methods. |
| `status.ts`, `results.ts`, `config.ts`, `spawn.ts` adapter caps | Session views use a composed capture strategy; locks and registration are harness policy types; bridge readiness follows the required channel receipt. No capability projection is stored or served. |
| `daemon/retention.ts` prune flag + method presence | Iterate composed `OwnedLogsRole` instances selected from recorded live environments; `prune` is required and errors reach the retention report. |
| `doctor/backends.ts` booleans and ids | Doctor diagnoses configured/recorded environment recipes and host compatibility, then lists the roles the composer produced. It does not call action ports or infer “headless” from flags. |
| `commands/panes.ts` booleans and optional methods | Each command boundary requests its exact role; action helpers accept that required role. Pane/group/space absence is an answer; provider failure is an error. |
| `commands/spawn.ts` optional inventory/group/workspace methods and `panes` | Spawn resolves an environment recipe first, then receives required process plus requested home/layout roles. If the requested placement has no role, the boundary answers before creating anything. |
| `commands/lifecycle.ts` optional wait/focus/rename/deliver, `canSendKeys`, adapter caps | Lifecycle strategy comes from the harness composer. Pane lifecycle receives `PaneInputRole`; channel lifecycle receives `AgentChannelRole`. Rename commits orch's name and treats requested plexer chrome as a separate required action. |
| `entities.ts` inventory presence | The environment projection joins recorded handles to `PaneInventoryRole` output only for environments composed with that role. No provider-wide enumeration branch remains. |
| `backends/tiling.ts` optional layout | Tiling accepts `GroupLayoutRole`; callers without it are answered before entering the tiler. |
| `backends/registry.ts` availability/session methods | Split into provider registration plus registration/doctor diagnostics. Runtime composition keys only on recorded environment axes and compatible `host_plexers`, never on a live probe. |
| `backends/herdr/hud.ts` HERDR env/socket/backend identity | Herdr wire/environment parsing stays inside the herdr provider. It emits/updates recorded plexer coordinates; core HUD policy consumes the composed environment only. |
| `backends/herdr/index.ts` harness map, HERDR env, backend constant | Harness-name → herdr-kind translation and all herdr argv remain in the herdr adapter/provider. The generic start request carries a harness id; no pair branch reaches core. |
| `setup/notifiers.ts`, `config.ts` herdr sink literal/env | Notification remains its independent provider axis. Settings select a sink; provider diagnostics decide readiness. Send throws real errors. |
| `spawn.ts`, `setup.ts` literal `headless` branches | Absence of a plexer row composes the headless recipe. Fallback records that environment before launch; setup cleanup selects records by environment shape, never an id. |
| capability/id assertions in tests | Replace with contract tests for complete role bundles, boundary-answer tests, error-text propagation tests and static no-id/no-method-presence/no-capability-field checks. |
| backend capability projection served to web/status | Web receives the composed environment description (pane coordinate/home presence and available command answers), not `BackendCapabilities`; renderers do not branch on provider id. |

## `herdrBestEffort` is deleted

`herdrAck`/the herdr executor throws an error containing the invoked argv, exit status and real
stderr/stdout. Every current call changes as follows:

| current call | new behavior |
|---|---|
| pane rename during spawn | Required spawn step. Failure closes the newly-created pane, reports cleanup failure if any, and fails spawn with the rename error. |
| pane close | `ProcessRole.kill` ends the recorded process; requested pane cleanup is `PaneHostRole.close` and throws if it fails. No swallowed cleanup. |
| `deliver` → `pane run` | Removed from delivery. Explicit shell submission uses `PaneInputRole.submit` and throws. |
| `deliver` → `agent prompt` | Normal dispatch uses `AgentChannelRole.deliver`; an explicit plexer fast path uses `PaneInputRole.submit`. Neither falls back to the other. |
| agent focus | `PaneInputRole.focus`; throws to the requester. |
| pane send-keys | `PaneInputRole.sendKeys`; throws to the requester. |
| pane zoom | `PaneZoomRole.setZoom`; throws to the requester. |
| agent rename | `AgentNamingRole.renameAgent`; if requested, its failure is reported and never changes whether orch's own name write succeeded. The response states the two outcomes separately. |
| pane rename | `PaneNamingRole.renamePane`; throws to the requester. |
| group rename | `GroupHomeRole.rename`; throws to the requester. |
| group close | `GroupHomeRole.close`; throws to the requester. |
| group focus | `GroupHomeRole.focus`; throws to the requester. |
| space/pack home focus | `SpaceHomeRole.focus`; throws to the requester. |
| native notification | The notification provider `send` throws; the notification dispatcher reports the real failure to its caller. |

The same slice deletes catch-to-sentinel behavior in `workspaceNames`, `paneForeground`,
`waitAgentStatus`, reseating, lifecycle and close paths. A genuine domain state is returned as a
tagged state; an execution failure is never translated to `false`, `null`, an empty collection,
a default foreground, a warning, or “unchanged”.

## Migration slices

Each slice starts with a failing focused test when observable, changes one vertical seam, removes
the replaced member in the same slice, and leaves no compatibility adapter or duplicate action
path. Only that slice's tests are run.

1. **Error contract.** Add provider-error and CLI/RPC propagation tests; replace
   `herdrBestEffort` and all catch-to-sentinel herdr mutations/queries with throwing executors.
2. **Orch channel and capture.** Test headless delivery/ack and captured reads first; introduce
   required `AgentChannelRole`/`CaptureRole`; remove backend `deliver` and plexer reads used as
   truth.
3. **Pane input and screen.** Test boundary answers and real failures; extract inventory, input,
   host, screen, zoom, naming and status roles; migrate panes, lifecycle and control; delete the
   corresponding `Backend` fields/methods and pane booleans.
4. **Groups and layout.** Test each composed provider bundle; extract `GroupHomeRole` and
   `GroupLayoutRole`; migrate spawn/tile/tab/move; delete every group optional method.
5. **Space/pack homes.** Test create/rename/close/focus and coordinate persistence; add
   `SpaceHomeRole`, migrate `ws` to the space/pack boundary, and delete workspace methods and
   vocabulary from core.
6. **Process execution.** Test start/state/kill with recorded pid + start token; extract
   `ProcessRole`; migrate spawn/close/liveness. Pane cleanup is no longer the kill path.
7. **Harness strategies.** Test one dispatcher across harness/environment combinations; replace
   adapter caps and optional strategies with required composed strategy roles; migrate prompt,
   status, result, spawn and lifecycle consumers.
8. **Maintenance and diagnostics.** Test pruning failures and environment diagnoses; extract
   `OwnedLogsRole`; move availability/version/session checks out of the action seam; replace web
   and doctor capability projections with environment descriptions.
9. **Delete the shell.** Remove `Backend`, `BackendCapabilities`, `panes`, `focusable`,
   `canSendKeys`, remaining optional-method checks and provider-id branches. Add static checks
   forbidding capability fields, action-method presence tests, catch-to-sentinel conversions and
   core branches on harness/plexer ids.

A slice is not complete until its new focused tests pass and its touched files lint clean. The
full Windows gates remain user-run ground truth.
