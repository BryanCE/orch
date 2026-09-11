# SOCKET-REFACTOR — every orch↔agent control message travels over the daemon socket

Ruling (Bryan, 2026-09-11): files are history, never transport. `inbox.jsonl`, `ack.jsonl`,
`answer.json` and `question.json` are control channels that happen to be files. They go.
The daemon owns delivery. A bridge holds one live connection to the daemon. Every message an
orchestrator sends to an agent is an outbox row, pushed down that connection, and settled by
one `ack` RPC. Nothing polls a directory. Nothing watches a file.

This directory is the whole spec. Every slice file under it is a complete task for one orch.
`scratch.md` items 4, 9 and 10 close as a consequence.

## What is wrong today

| Channel | File | Writers |
|---|---|---|
| orch → agent text and commands | `inbox.jsonl` | `adapters/pi.ts` via the outbox; `agent/peers.ts` (peer message: no outbox, no id, no ack); `daemon/result-delivery.ts` (result to spawner: no outbox); `presence/roles.ts` (a fourth writer, no callers) |
| agent → orch "I read it" | `ack.jsonl` | fallback after a socket post; the daemon scans every agent dir every drain tick |
| orch → asking agent | `answer.json` | `adapters/pi.ts`; the bridge polls it in `agent/tools.ts` |
| agent → orch "I am asking" | `question.json` | `agent/tools.ts`; redundant with `status.asking` in `status.json` |
| "is it still queued?" | reads `inbox.jsonl` | `control/outcome.ts` |

Four transports for one fact. The bridge polls (1s) and `fs.watch`es a directory that on WSL
`/mnt/*` never fires. The daemon does directory I/O per tick. An ack that misses the socket
lands in a file nobody reads until a daemon returns.

## The design

Three parts. Two of them already exist.

1. **The outbox row is the fail-safe.** SQLite, daemon-owned, already there. A write stays open
   until an ack settles it. Daemon dies: the row is still open when it returns. Bridge dies:
   the row is still open. Nothing else needs to be durable.
2. **The ack is one socket RPC.** `ack {id}` settles the row and wakes the waiter. Already there
   (`orchd.ts` handler `ack`). A lost ack costs one redelivery, not a lost message.
3. **The bridge dedupes by message id.** The daemon redelivers with the SAME id. The bridge
   sees a known id, re-acks, does not apply it twice. Already there (`daemon-client.ts`).

What is new is the transport: **the link**.

- A bridge opens one persistent connection to orchd at start and sends `attach {key}`.
- The daemon keeps `key → link`. Socket close removes it. A second attach for the same key
  replaces the first (a restarted bridge).
- Delivery is a push down the link. No link = the row stays `pending`, the drain retries.
- On `attach`, the daemon re-pushes every open row for that key. That is the reconnect
  fail-safe.
- Every orch → agent TEXT is an outbox row: dispatch, steer, peer message,
  result-to-spawner. No text writer bypasses the outbox. No writer touches a file.
- `answer` and `model` are pushed directly (not queued) and each waits on its own signal:
  an answer waits for the ack, a model switch waits for the `control-outcome` report. Both
  fail loudly to the caller in the same RPC (not asking, refused model, no link). Queueing
  them would turn a refusal into a silent retry.
- `dispatch` waits for the ack the way `steer` already does, so `orch dispatch` prints
  delivered or queued. That closes #9.
- The answer carries the question id. The bridge drops an answer for a question it no longer
  waits on. That closes #4.
- `spawn` waits for `attach`, not for a status file. That closes #10 (the wait is now the real
  signal, and the skill can say so).

Rule 9 holds. No wire format in core: the daemon pushes orch's own message shape. The branch
is on a declared capability (`adapter.bridge`), never on an adapter id.

### The one window that stays

The bridge dedupe set is in memory. If the bridge crashes after it applies a message and
before it acks, a restarted bridge applies the redelivery again. That is the at-least-once
trade. No file closes it. Do not add one.

### Decisions already made — do not reopen

- No new SQLite table. The outbox `payload` column is JSON and already holds `{action, text}`.
- No schema version bump anywhere (Rule 14).
- No "delivered" state on the event stream. The event stream carries agent state
  transitions only. The delivery signal for a caller is the `dispatch` RPC result.
- `question.json` is deleted. `orch questions` and `orch answer` read `status.asking`.
- `on_done` inbox command is deleted. Nothing writes it.
- `AgentChannelRole` / `backend.channel` is deleted. Nothing calls it.
- `SteerMechanism` is deleted. Nothing reads it.
- Reconnect cadence is a setting: `daemon.bridge_reconnect_ms` (default 1000). Rule 17.
- A peer message (`orch_send`, a task result to its enqueuer) is MAIL, not a driving verb.
  It is an outbox `steer` row governed by the space wall only, never by the lease (Rule 11:
  ownership is mutual exclusion for driving verbs). The sender is always a real agent id —
  the daemon never acts as a principal.
- `--force` on `orch answer` is deleted. The bridge drops an answer whose `questionId` it is
  not waiting on, so forcing one past a missing question delivers nothing.

## The wire

JSON lines on the existing orchd socket (unix path, or the loopback port in `orchd.port`).
The server already keeps persistent sockets for `subscribe-events`; `attach` uses the same
mechanism.

```
bridge → daemon   {"id":1,"method":"attach","params":{"key":"<agent key>"}}
daemon → bridge   {"id":1,"result":{"attached":true,"open":<n>}}
daemon → bridge   {"event":{"kind":"delivery","id":"<outbox id>","message":<BridgeMessage>}}   (0..n, then on every new write)
bridge → daemon   {"id":2,"method":"ack","params":{"id":"<outbox id>"}}
daemon → bridge   {"id":2,"result":{"ok":true}}
```

`BridgeMessage` is the ONE shape, defined once in `src/control/bridge-message.ts`:

```ts
export type BridgeMessage =
  | { readonly action: "dispatch"; readonly text: string }
  | { readonly action: "steer"; readonly text: string }
  | { readonly action: "answer"; readonly text: string; readonly questionId: string }
  | { readonly action: "model"; readonly model: string };

export type BridgeAction = BridgeMessage["action"];
export interface BridgeDelivery { readonly id: string; readonly message: BridgeMessage }
export function isBridgeMessage(value: unknown): value is BridgeMessage
export function isBridgeDelivery(value: unknown): value is BridgeDelivery
```

The outbox row's `payload` IS the `BridgeMessage`. `model` keeps its `control-outcome`
report on top of the ack: ack = read, outcome = applied. Thinking effort travels inside the
model spec (`provider/id:level`), as it does today; there is no separate thinking message.

The adapter capability (P1-3 defines it in `src/types/adapter.ts`):

```ts
/** The harness runs orch's bridge: it attaches to orchd at start and applies deliveries
 *  pushed down that link. `takes` lists the actions this bridge applies. */
export interface BridgeRole { readonly takes: readonly BridgeAction[] }
// AgentAdapter: readonly bridge: BridgeRole | null;   — replaces `question` and `inboxSteering`
```

pi and omp: `takes: ["dispatch", "steer", "answer", "model"]`. claude and codex: `null`.

## Step 0 — the delegator writes the seam before phase 1

Two small modules every phase-1 slice imports. The delegator writes them by hand, with a test,
and runs `bun check` before any orch spawns. Nothing else changes in step 0; the old file
transport keeps working until phase 2.

`src/control/bridge-message.ts` — leaf. Types + guards above. No imports beyond `util.ts`.
Both the daemon and the bridge bundle import it.

`src/control/bridge-links.ts` — daemon-only registry. Imports `normalizeControlTarget`.

```ts
export interface BridgeLink { push(delivery: BridgeDelivery): void }
export class BridgeDetachedError extends Error { readonly code = "BRIDGE_DETACHED"; constructor(key: string) }
/** Replace any link held for the key. */
export function attachBridge(key: string, link: BridgeLink): void
/** Remove the link only if it is still the one held. */
export function detachBridge(key: string, link: BridgeLink): void
export function bridgeAttached(key: string): boolean
/** Throws BridgeDetachedError when no link is held. */
export function pushToBridge(key: string, delivery: BridgeDelivery): void
export function attachedBridgeKeys(): readonly string[]
```

Keys are canonical targets. `attachBridge`, `bridgeAttached` and `pushToBridge` pass the key
through `normalizeControlTarget` themselves; callers pass whatever spelling they have.

`test/bridge-links.test.ts` covers attach/replace/detach/push/throw.

## Cross-slice contracts

Named here so a caller can code against them while the provider lands in the same phase.

| Contract | Provider | Callers |
|---|---|---|
| `DaemonClient.attach(key, onDelivery)` / `detach()` / `attached()` — `src/types/agent.ts` | P1-1 | P2-5 |
| `RpcServerOptions.onBridgeAttached(key)`, `RpcServer.attachedBridgeCount()` — `src/types/daemon.ts` | P1-2 | P2-1 |
| `adapter.bridge: BridgeRole \| null` — `src/types/adapter.ts` | P1-3 | P1-4, P1-5 (same phase) |
| `selectOpenOutboxForTarget(dir, target)`, `outboxMessageState(dir, id)` — `src/store/outbox-rows.ts`; `redeliverOpenRows(dir, target, deps)` — `src/daemon/outbox.ts` | P1-6 | P2-1 |
| `acceptMail(directory, from, target, text): Promise<{ id: string }>` — `src/daemon/mail.ts` | P1-7 | P2-1 |
| `dispatch` RPC result `{ accepted: true, id, ack: "acknowledged" \| "unavailable" }` | P2-1 | P2-4 (same phase) |
| `message` RPC `{ from, target, text }` → `{ accepted: true, id, ack }` | P2-1 | P2-7 (same phase, runtime only; tests fake the daemon) |
| `StatusRow.bridgeAttached: boolean` — `src/types/command.ts`; orchd's `fleetStatus` fills it | P2-3 (type), P2-1 (fill) | P2-3's spawn wait |
| `presence.answers.await(questionId, signal)` / `.settle(deliveryId, message)` — `src/agent/presence.ts` | P2-5 | P2-6 (same phase) |
| `awaitControlOutcome(id, timeoutMs)` — `src/control/outcome.ts` | P2-2 | P2-2 (same owner) |

## Phases and ownership

Each slice is one small task for one orch: a handful of files, one idea, one test file. One
owner per file per phase. A file listed under two slices in the SAME phase is a bug in this
plan — say so and stop. Across phases a file may change owner.

Two slices in one phase may share a contract from the table above. The caller codes against
it; its scoped check is red until the provider lands. The slice reports that residue by name.
The phase gate is the delegator's `bun check` over the tree after every slice in the phase
has landed.

### Phase 1 — the seam (8 orchs)

| Slice | Owns | Delivers |
|---|---|---|
| P1-1 `bridge-client` | `src/presence/socket-client.ts`, `src/agent/daemon-client.ts`, `src/types/agent.ts`, `src/types/settings.ts`, `src/settings/schema.ts`, `src/settings/registry.ts`, `test/bridge-client.test.ts` | `openJsonLineLink`; `DaemonClient.attach/detach/attached`; `daemon.bridge_reconnect_ms` |
| P1-2 `link-server` | `src/daemon/rpc/server.ts`, `src/types/daemon.ts`, `test/bridge-link-server.test.ts` | `attach` on the server; `onBridgeAttached`; `attachedBridgeCount` |
| P1-3 `adapter-shape` | `src/types/adapter.ts`, `src/adapters/pi.ts`, `src/adapters/omp.ts`, `src/adapters/claude.ts`, `src/adapters/codex.ts`, `test/helpers/adapter.ts`, `test/adapter-pi.test.ts` | `bridge: BridgeRole \| null`; file writers deleted from adapters |
| P1-4 `dispatch-push` | `src/control/dispatch.ts`, `src/types/control.ts`, `test/control-dispatch.test.ts`, `test/answer-dispatch.test.ts`, `test/presence-inbox.test.ts` (delete) | `deliverControl` pushes through `bridge-links` |
| P1-5 `role-gates` | `src/worker-prompt.ts`, `src/commands/spawn/index.ts`, `test/worker-prompt.test.ts`, `test/check-bridge.test.ts` | the readers of `inboxSteering`/`question` read `bridge` |
| P1-6 `outbox-rows` | `src/store/outbox-rows.ts`, `src/types/store.ts`, `src/daemon/outbox.ts`, `test/outbox-ack.test.ts` | payload is `BridgeMessage`; `selectOpenOutboxForTarget`; `outboxMessageState`; `redeliverOpenRows`; ack scan deleted |
| P1-7 `mail` | `src/daemon/mail.ts` (new), `src/daemon/result-delivery.ts`, `test/cross-pack-result-delivery.test.ts` | `acceptMail`; results travel as outbox rows |
| P1-8 `questions` | `src/commands/results.ts`, `test/commands-results.test.ts` | `orch questions` reads `status.asking` |

### Phase 2 — delivery end to end (8 orchs)

| Slice | Owns | Delivers |
|---|---|---|
| P2-1 `orchd` | `src/daemon/orchd.ts`, `test/daemon-rpc.test.ts` | `deliverWrite` maps `BridgeMessage`; `acceptTextWrite`; `dispatch` waits for ack; `message`, `attach` RPCs; re-push on attach; idle count |
| P2-2 `outcome` | `src/control/outcome.ts`, `src/control/dispatch.ts` | silence has one meaning; `awaitControlOutcome(id, timeoutMs)` |
| P2-3 `spawn-wait` | `src/commands/spawn/report.ts`, `src/commands/status.ts`, `src/types/command.ts`, `src/presence/store.ts` | spawn waits for attach; `bridgeAttached` on status rows; `bridgeRegistered` deleted |
| P2-4 `cli-dispatch` | `src/commands/control.ts` | `orch dispatch` prints delivered/queued; `orch answer` loses `--force` |
| P2-5 `presence-link` | `src/agent/presence.ts`, `src/agent/model-control.ts`, `src/agent/harness-bridge.ts`, `test/bridge-apply.test.ts` | attach on init; `routeDelivery`; `presence.answers`; poll/watch/on_done/handoff deleted |
| P2-6 `ask-link` | `src/agent/tools.ts` | `orch_ask` waits on `presence.answers`; no question/answer files |
| P2-7 `peer-mail` | `src/agent/peers.ts`, `test/peer-identity.test.ts`, `test/peer-tools-registration.test.ts`, `test/no-sibling-relay.test.ts` | `orch_send` calls the `message` RPC; `appendPeerInbox` deleted |
| P2-8 `transport-tests` | `test/dispatch-channel-first.test.ts`, `test/every-agent-has-an-inbox.test.ts` → `test/every-agent-has-a-link.test.ts`, `test/port-seam-channel.test.ts`, `test/transfer-does-not-disturb.test.ts` | the four "needs no screen" tests assert on the link |

### Phase 3 — delete and document (7 orchs)

| Slice | Owns | Delivers |
|---|---|---|
| P3-1 `delete-files` | `src/presence/inbox.ts` (delete), `src/presence/schema.ts`, `src/presence/writer.ts`, `src/presence/roles.ts`, `src/types/backend.ts`, `src/backends/herdr/index.ts`, `src/backends/headless/index.ts`, `src/backends/tmux/index.ts` | the four filenames, `writeAnswer`, the channel role are gone |
| P3-2 `check-bridge` | `scripts/check-bridge.ts`, `test/check-bridge.test.ts` | the static gate no longer names the deleted files |
| P3-3 `comment-sweep` | `src/entities.ts`, `src/seat/source.ts`, `src/types/core.ts`, `src/types/policy.ts`, `src/types/seat.ts`, `src/types/daemon.ts`, `src/types/agent.ts`, `test/a-row-is-not-a-pane.test.ts` | no sentence describes the old transport |
| P3-4 `smoke-dead` | `test/smoke.sh` | smoke fixture uses `status.asking`; `fallow:dead` report |
| P3-5 `help` | `src/commands/help.ts`, `src/commands/index.ts` | help says what the commands do now |
| P3-6 `skill` | `skills/orch/SKILL.md`, `skills/orch/reference/*.md` | the spawn-already-waited rule; delivered/queued; no `--force` |
| P3-7 `docs` | `packages/orch/README.md`, `packages/web/src/lib/fleet.ts`, `scratch.md` | README, one web comment, items 4/9/10 closed |

## Gate

Every slice: `bun check` on what it touched, pasted in the result, with any residue named
by the sibling slice that clears it; `bun test <its test files>` green. The delegator runs
`bun check` and the full `bun test` over the tree after each phase. Nothing dispatches into
the next phase on a red gate.

No slice runs a build. No slice runs `orch daemon reload`. No slice edits `drizzle/`. The
installed `orch` is the one Bryan built; code changes reach a live daemon only after Bryan
runs `bun run build:orch:dev` and `orch daemon reload`, which he does between phases if he
wants to.

## Dispatch (delegator runs these)

Names are stable across phases; a phase-2 or phase-3 slice is a `dispatch` to a name from
phase 1 (`orch dispatch` clears the session before it sends). Two tabs of four.

Phase 1:

```bash
orch spawn bridge-client link-server adapter-shape dispatch-push --tab socket-a
orch spawn role-gates outbox-rows mail questions                --tab socket-b
orch dispatch bridge-client --file SOCKET-REFACTOR/P1-1-bridge-client.md
orch dispatch link-server   --file SOCKET-REFACTOR/P1-2-link-server.md
orch dispatch adapter-shape --file SOCKET-REFACTOR/P1-3-adapter-shape.md
orch dispatch dispatch-push --file SOCKET-REFACTOR/P1-4-dispatch-push.md
orch dispatch role-gates    --file SOCKET-REFACTOR/P1-5-role-gates.md
orch dispatch outbox-rows   --file SOCKET-REFACTOR/P1-6-outbox-rows.md
orch dispatch mail          --file SOCKET-REFACTOR/P1-7-mail.md
orch dispatch questions     --file SOCKET-REFACTOR/P1-8-questions.md
```

Phase 2 (after the phase-1 gate):

```bash
orch dispatch bridge-client --file SOCKET-REFACTOR/P2-1-orchd.md
orch dispatch link-server   --file SOCKET-REFACTOR/P2-2-outcome.md
orch dispatch adapter-shape --file SOCKET-REFACTOR/P2-3-spawn-wait.md
orch dispatch dispatch-push --file SOCKET-REFACTOR/P2-4-cli-dispatch.md
orch dispatch role-gates    --file SOCKET-REFACTOR/P2-5-presence-link.md
orch dispatch outbox-rows   --file SOCKET-REFACTOR/P2-6-ask-link.md
orch dispatch mail          --file SOCKET-REFACTOR/P2-7-peer-mail.md
orch dispatch questions     --file SOCKET-REFACTOR/P2-8-transport-tests.md
```

Phase 3 (after the phase-2 gate):

```bash
orch dispatch bridge-client --file SOCKET-REFACTOR/P3-1-delete-files.md
orch dispatch link-server   --file SOCKET-REFACTOR/P3-2-check-bridge.md
orch dispatch adapter-shape --file SOCKET-REFACTOR/P3-3-comment-sweep.md
orch dispatch dispatch-push --file SOCKET-REFACTOR/P3-4-smoke-dead.md
orch dispatch role-gates    --file SOCKET-REFACTOR/P3-5-help.md
orch dispatch outbox-rows   --file SOCKET-REFACTOR/P3-6-skill.md
orch dispatch mail          --file SOCKET-REFACTOR/P3-7-docs.md
orch close questions
```

Then the delegator runs `bun check`, `bun test`, `bun run fallow:dupes`, `bun run
fallow:health` and `bun run fallow:dead` once over the tree, fixes what is left, and hands
Bryan the commit message.
