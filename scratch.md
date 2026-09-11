# improvements.md — status

16 done, 2 half done, 2 open. Verified against the code on 2026-09-10.

## Ahead of the 20: the dispatch outage, fixed 2026-09-10

`orchd` stopped answering dispatches (2000ms timeout, then silent no-ops), intermittently,
recovering on its own. Four defects compounded, all confirmed in `~/.orch/orchd.log`:
one target at attempt **145**, 416 `bridge is disconnected` failures, 1235 delivery attempts.

| Defect | Fix | Where |
|---|---|---|
| The outbox had NO periodic drain. `drainOutbox` had exactly one caller — `acceptWrite` — so a queued write was retried only when some other caller dispatched. | orchd drains on its own clock, every `daemon.outbox_drain_ms`. | `daemon/orchd.ts`, `settings/*` |
| Accepting a dispatch awaited a drain of the WHOLE backlog, so one orch's dead agent delayed every other orch's send past the RPC budget. | `acceptWrite` delivers only its own write, through `deliverOutboxMessage`. | `daemon/orchd.ts`, `daemon/outbox.ts` |
| A write to an agent that no longer exists retried forever at the 30s cap. | `AgentGoneError` is a permanent failure; the row settles `undeliverable`. | `control/agent-gone.ts`, `control/dispatch.ts`, `daemon/outbox.ts`, `store/outbox-rows.ts` |
| Closing an agent left its queued writes open, so a closed agent kept generating retries. | `endAgent` closes that agent's open writes. | `store/agent-rows.ts`, `store/outbox-rows.ts` |

Also: `pane_not_found` / `agent_not_found` from herdr now means "gone" in orch's vocabulary,
mapped inside herdr's own adapter through a typed `HerdrCommandError` so no core module reads
a herdr code. `store/outbox-rows.ts` was hand-packed onto single lines; rewritten as ordinary code.

## Spawn produced no agents anywhere to watch

`resolveBackend` picked the environment by asking `isInsideSession()`. Run `orch spawn` from a
terminal that is not itself inside a plexer and every spawn silently became headless — the caller
asked for a fleet it could watch and got agents with nowhere to appear. An earlier pass removed
`isInsideSession()` from `validateBackend`, which covers the explicit and configured routes; the
DEFAULT route kept it. Selection now asks only whether an environment is available and can place
an agent. `backends/registry.ts`.

## Rule 11 as a gate

`scripts/check-vocabulary.ts` fails on a plexer's words (`pane`, `workspace`) anywhere outside
`src/backends/<plexer>/`. It reported **538 uses across 66 files** when it was written; it is now
at **335 across 57**. It is NOT yet wired into `bun check` — it lands there in the same commit
that finishes the rename, or it turns the gate red on existing code.

The **Backend port** (`src/types/backend.ts`) no longer speaks a plexer's vocabulary. It was the
source of the coupling: every core caller inherited its field names.

| Was | Now |
|---|---|
| `paneHost` / `PaneHostRole` | `placement` / `PlacementRole` |
| `paneInventory` / `PaneInventoryRole` | `placementInventory` / `PlacementInventoryRole` |
| `paneInput` / `PaneInputRole` | `agentInput` / `AgentInputRole` |
| `paneForeground` / `PaneForegroundRole` / `PaneForeground` | `foreground` / `ForegroundRole` / `ForegroundProcesses` |
| `paneScreen` / `PaneScreenRole` | `screen` / `ScreenRole` |
| `paneZoom` / `PaneZoomRole` | `zooming` / `ZoomRole` |
| `paneNaming.renamePane` / `PaneNamingRole` | `labeling.setLabel` / `LabelRole` |
| `OpenPaneRequest` / `OpenedPane` / `MovePaneRequest` | `PlacementRequest` / `Placement` / `MoveRequest` |
| `PaneCoordinate` | `PlacementCoordinate` |
| `intoPane` / `targetPane` | `intoHandle` / `targetHandle` |
| `paneCount` / layout `panes` | `placementCount` / `placements` |
| `backends/pane-ready.ts` | `backends/shell-ready.ts` |
| `NO_PANE_FOREGROUND` / `paneAtShellPrompt` | `NO_FOREGROUND` / `atShellPrompt` |
| boundary reason `"no-pane"` | `"not-placed"` |

Earlier clusters, same rule — every writer, reader and test in one change:

| Cluster | Was | Now |
|---|---|---|
| `SpawnRegistration` (`types/store.ts`) | `pane: boolean` | `placed: boolean` |
| `CreatedAgent`, `PreparedAgent` (`types/command.ts`) | `pane` | `handle` |
| `ClearedAgent` (`lifecycle/reset.ts`) | `pane` | `handle` |
| `DispatchSettings` (`commands/control.ts`) | `pane` | `handle` |
| `ReloadResult` (`lifecycle/reload.ts`) | `pane` | `handle` |
| `lifecycle/reload.ts` | `reloadPaneAndAwaitBridge`, `restartPaneAndAwaitBridge` | `reloadAgentAndAwaitBridge`, `restartAgentAndAwaitBridge` |
| `spawn/index.ts` | `openPanesForGroup` | `placeRemainingAgents` |

### Two things the rename exposed

1. The role `zoom` collided with a legacy top-level method that
   `test/a-backend-exposes-each-operation-once.test.ts` forbids. Renamed to `zooming`.
2. **A real bug in `scripts/check-bridge.ts`.** The role alternation was built as `a|b|c` and
   used as `(?!a|b|c\b)`, so the `\b` bound only to the LAST alternative. Any role that prefixes
   a plain data field (`placement` inside `placementCount`) silently exempted that field from the
   capability rule. Now grouped: `(?!(?:a|b|c)\b)`. `check:bridge` still passes, so nothing was
   relying on the hole.

### Still open — Bryan's call, published CLI surface

`src/commands/panes.ts` holds the `orch panes` verb and the `--all-panes` flag on `orch status`.
Renaming a shipped command is not the rename's to decide. `Entity.paneId` is the next internal
cluster after that.

| # | Item | Done |
|---|---|---|
| 1 | Nothing tells you thinking effort is per task | ✅ |
| 2 | Capacity is invisible until a spawn dies mid-batch | ✅ |
| 3 | Empty replay is indistinguishable from wrong scope | 🟡 |
| 4 | An answer can land after the agent has moved on | ✅ |
| 5 | Exited agents shadow live names | ✅ |
| 6 | A fleet can vanish with no event | 🟡 |
| 7 | `orch result` returns the previous task's result | ✅ |
| 8 | Steer and answer have no ack | ✅ |
| 9 | dispatch reports accepted, never delivered | ✅ |
| 10 | Fresh spawn timing is undocumented | ✅ |
| 11 | The watch banner is delivered as an event | ✅ |
| 12 | ~~Orch cannot ask whether a monitor is already armed~~ RULED OUT | — |
| 21 | dispatch resets by default; spawn and dispatch take `--file` and `--with` | ✅ |
| 13 | A watch fires without `--all` | ✅ |
| 14 | Worker lint noise | ✅ |
| 15 | Prompt bodies come from a file or stdin | ✅ |
| 16 | ~~`orch redispatch`~~ RULED OUT — dispatch does it | — |
| 17 | The leftover `--name` flag | ✅ |
| 18 | A `--json` filter for live status | ✅ |
| 19 | `--cwd` on every spawn | ✅ |
| 20 | The published skill drifts from the code | ✅ |

## What each done item actually changed

| # | Change |
|---|---|
| 8 | Steer and answer wait for a matching reader acknowledgement using `timeouts.dispatch_ack_ms`. ~~Answer writers carry a delivery id; readers report consumption through orch's shared ack protocol.~~ Timeout fails without claiming delivery was cancelled. Channels without acknowledgements say consumption is unconfirmed. Core uses ports and correlation ids, with no provider-id branches. Source tests pass; user check and publish are pending. |
| 1 | `reset` prints the level it pinned; four scattered `model:thinking` joins collapsed into one `modelSpec` in `policy/thinking.ts`. `cmdNew` split back under the cyclomatic cap. |
| 2 | Skill cited `fleet.spawn_cap`, which does not exist; it now names the four real caps and `orch status --capacity`. The claimed mid-spawn refusal was false — admission runs before anything is created. |
| 11 | The watch banner is suppressed whenever stdout is not a terminal, so it never reaches a watching harness as an event. |
| 13 | `policy/scope.ts` is now the single ownership rule, asked per streamed transition by `events` and per row by `status`. Bare `orch events` delivers every agent the caller owns, matched on `spawnedBy` and the open lease — no widening flag. Code-side done; not yet re-confirmed on a live fleet. |
| 15 | `orch dispatch <target> --file <path>`, and `--file -` for stdin. Refusals for prompt-and-file together, empty file, unreadable path. `cmdDispatch` split back under the cap. |
| 17 | `--name` gone from every caller and doc. `setup`'s smoke spawn was passing it into a parser that dies on unknown flags, so it could never run. Deleted the unreferenced `test/golden/help.txt`. |
| 18 | Nothing to build: `orch status --json --live` already exists. |
| 19 | `--cwd` deleted from `spawn`, `tile` and `tab new`. An agent starts in the spawner's directory; `--dir <path>` is the override, named for the agent's directory. Incantation stripped from `SKILL.md`, both reference files, and the README. |
| 5 | `entities.ts` resolves a name against the agents still running first. `stillRunning` is "orch recorded no ending and the process has not gone"; `nameHolders` returns the running holders of a name, and falls back to every holder only when none is running. An id or handle still addresses an ended agent forever. `Entity.ended` carries the recorded ending. |
| 7 | `orch result` reads the run row for the agent's CURRENT `dispatchId` (`selectRun`), not the newest line of `results.jsonl`. The daemon already bound each result to its dispatch id in the `runs` table; nothing asked for it. An unsettled dispatch now refuses by name — `Dispatch abc has not settled (working)` — instead of printing the previous task's answer. The old path stays only for an agent with no dispatch id, which is one orch never dispatched to. |
| 14 | The worker header no longer names a pane or invents a verify command. `workers.verify_commands` is a real setting (schema, read, registry, type); `verifyCommandsClause` names those commands, and falls back to "the tests and typechecks this repository already has" when the user declared none. |
| 20 | Audited every verb, flag, short flag and setting the skill names against the code. Three were fiction: `fleet.spawn_cap`, `orch events --notify` (never parsed — it would have been swallowed as a target name), and the notify sink fields, whose real syntax is `--url=<value>` / `--command=<value>`. Quoting guidance rewritten shell-neutral. |

## The four half-done ones

| # | Half that landed | Half still owed |
|---|---|---|
| 3 | A caller owning nothing is told so instead of watching a stream that cannot ever speak: `ownedAgentCount` counts what the caller owns and `emptyScopeNotice` writes the sentence. `reference/commands.md` no longer teaches "a silent stream means the scope is wrong" — it names all three causes of silence. | Replay itself still prints no count. `--since-seq 0` over an empty history and `--since-seq 0` filtered down to nothing are the same output, and a fleet that has since died replays as silence because presence reads only live views. |
| 6 | `orch events` no longer has a default state filter at all — `options.filter` is null unless you pass `--filter`, so `exited` streams like every other state, and `daemon/events.ts` derives `exited` from pid liveness. A dead fleet now announces itself. | When the STREAM ends, nothing names the reason. `subscribeEvents` redials with bounded backoff forever on close or error; a daemon that never comes back is indistinguishable from a quiet fleet. |
| 9 | The dispatch id is minted by the daemon, returned by the CLI, logged under one correlation id, and shows in `orch status` as `.dispatchId`. ~~Delivery IS tracked: the outbox retries until the agent's `ack.jsonl` line arrives, then logs `dispatch.acked`.~~ | `orch dispatch` waits for the bridge ack and prints delivered or queued; the `ack` RPC settles the row; no file is read. |
| 10 | The behaviour is settled: for any inbox-steering adapter, `spawn` blocks up to 60s on `awaitBridgeRegistration` and prints `ok` or `STALLED` per agent (exit 1 on a stall), and an adapter that writes no presence record at start prints an UNVERIFIED warning. A dispatch is durable through the outbox, so it queues rather than drops. | The skill states the attach wait; `sleep` after spawn is ruled out. |

## Open, verified against the code

| # | What the code says today |
|---|---|
| 4 | The answer carries `questionId`; the bridge drops an answer for a question it is not waiting on and does not ack it, so the caller sees the miss. |
| 21 | DONE. `dispatch` clears the session, then pins the model, then sends; `--keep-context` skips the clear. `clearSession` is exported from `lifecycle/reset.ts`. `readPromptFile` moved to `commands/prompt-file.ts` and both verbs call it. Both verbs take `--file` and `--with`, and `taskWithPaths` composes the paths into the task. Help and the published skill say so. |
| 12 | No `subscribe` / `subscriptions` verbs exist; the daemon holds the connections and is never asked. `reference/commands.md` still teaches `pgrep -fa "orch events"` as the preflight. |
| 16 | No `redispatch` anywhere in `src/` or `skills/`. Still blocked on your ruling below. |

## Landed this session, outside the 20

| What | Where |
|---|---|
| orch never probes a plexer. `backendReachable` and `serverAnswers` are deleted with all four call sites. orch calls the port; the integration answers or throws, and a throw is "no answer". | `backends/backend.ts`, `entities.ts`, `lifecycle/close.ts` |
| Spawning into a plexer you are not inside works. `validateBackend` checks registered and installed, never `isInsideSession()`. herdr's own error is what refuses when herdr cannot take the agent. | `backends/registry.ts` |
| The census asks each environment for its handles ONCE per fleet build, keyed by handle, so nothing lists twice. | `entities.ts` |
| `orch status` shows live and working agents. Exited rows come back only with `--filter`. A single shared owner collapses out of the table into a footer, and a detached environment prints as one word instead of a JSON blob. | `commands/status.ts` |
| `orch lock` is gone: command, dispatch entry, help topic, usage block and test. | `commands/`, `skills/orch/reference/fleet.md` |
| The caller's plexer is recorded at registration instead of sent as `undefined`, so placement reads it as a fact. | `daemon/rpc/registration.ts`, `identity/self.ts` |
| A fleet's own home is named for the working directory, not for the first slice. `--tab` is no longer needed for one spawn. | `commands/spawn/placement.ts` |
| `run-rows.ts` was hand-packed onto single lines with one-letter parameters. Rewritten as ordinary code; the insert and the conflict-update no longer repeat the same 15 columns. | `store/run-rows.ts` |
| The control channel moved off files (`inbox.jsonl`, `ack.jsonl`, `answer.json`, `question.json`). | `SOCKET-REFACTOR/README.md` |

Still hand-packed the same way: `store/outbox-rows.ts`.

## Blocked on you

| # | Question |
|---|---|
| 16 | RULED OUT. There is no `redispatch` verb, and the concept came from `improvements.md` (a past pass), never from Bryan. `spawn` creates and starts work; `dispatch` is the follow-up to an agent that already exists. Bryan's ruling: dispatch RESETS the context and sends the next work by default, with a flag to send work without resetting. Both verbs take `--prompt`, `--file` and `--with`. The old "does it carry the new name and model" question was noise — the agent already has both, `--model` is on dispatch, renaming is `orch rename`. |

## Open, from your flag ruling

The scope work replaced `--mine` / `--any-agent` with `--space-wide` on `events` and `status`, so
those two now speak one vocabulary. The rest did not move:

| Flag | Where | Means |
|---|---|---|
| `--space-wide` | events, status | every agent in the caller's space, not just the ones it owns |
| `--all` | results, questions, panes | the same widening, spelled differently |
| `--local` | results, questions, status | this host only, skipping configured remote hosts |
| `--all-panes` | status | also list panes orch did not spawn |

`--all` on `results`, `questions` and `panes` calls `scopeEntitiesToSpace(…, { all })` — literally
the widening `--space-wide` names. `--local` is a host axis wearing the same shape, and
`--all-panes` is pane vocabulary in orch's own CLI.
