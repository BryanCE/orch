# improvements.md — status

9 done, 3 half done, 8 open. Verified against the code on 2026-09-09, after the scope commits
(`0bacab6`, `6b5af86`) landed.

| # | Item | Done |
|---|---|---|
| 1 | Nothing tells you thinking effort is per task | ✅ |
| 2 | Capacity is invisible until a spawn dies mid-batch | ✅ |
| 3 | Empty replay is indistinguishable from wrong scope | ❌ |
| 4 | An answer can land after the agent has moved on | ❌ |
| 5 | Exited agents shadow live names | ❌ |
| 6 | A fleet can vanish with no event | 🟡 |
| 7 | `orch result` returns the previous task's result | ❌ |
| 8 | Steer and answer have no ack | ❌ |
| 9 | dispatch reports accepted, never delivered | 🟡 |
| 10 | Fresh spawn timing is undocumented | 🟡 |
| 11 | The watch banner is delivered as an event | ✅ |
| 12 | Orch cannot ask whether a monitor is already armed | ❌ |
| 13 | A watch fires without `--all` | ✅ |
| 14 | Worker lint noise | ❌ |
| 15 | Prompt bodies come from a file or stdin | ✅ |
| 16 | `orch redispatch` | ❌ |
| 17 | The leftover `--name` flag | ✅ |
| 18 | A `--json` filter for live status | ✅ |
| 19 | `--cwd` on every spawn | ✅ |
| 20 | The published skill drifts from the code | ✅ |

## What each done item actually changed

| # | Change |
|---|---|
| 1 | `reset` prints the level it pinned; four scattered `model:thinking` joins collapsed into one `modelSpec` in `policy/thinking.ts`. `cmdNew` split back under the cyclomatic cap. |
| 2 | Skill cited `fleet.spawn_cap`, which does not exist; it now names the four real caps and `orch status --capacity`. The claimed mid-spawn refusal was false — admission runs before anything is created. |
| 11 | The watch banner is suppressed whenever stdout is not a terminal, so it never reaches a watching harness as an event. |
| 13 | `policy/scope.ts` is now the single ownership rule, asked per streamed transition by `events` and per row by `status`. Bare `orch events` delivers every agent the caller owns, matched on `spawnedBy` and the open lease — no widening flag. Code-side done; not yet re-confirmed on a live fleet. |
| 15 | `orch dispatch <target> --file <path>`, and `--file -` for stdin. Refusals for prompt-and-file together, empty file, unreadable path. `cmdDispatch` split back under the cap. |
| 17 | `--name` gone from every caller and doc. `setup`'s smoke spawn was passing it into a parser that dies on unknown flags, so it could never run. Deleted the unreferenced `test/golden/help.txt`. |
| 18 | Nothing to build: `orch status --json --live` already exists. |
| 19 | `--cwd` deleted from `spawn`, `tile` and `tab new`. An agent starts in the spawner's directory; `--dir <path>` is the override, named for the agent's directory. Incantation stripped from `SKILL.md`, both reference files, and the README. |
| 20 | Audited every verb, flag, short flag and setting the skill names against the code. Three were fiction: `fleet.spawn_cap`, `orch events --notify` (never parsed — it would have been swallowed as a target name), and the notify sink fields, whose real syntax is `--url=<value>` / `--command=<value>`. Quoting guidance rewritten shell-neutral. |

## The three half-done ones

| # | Half that landed | Half still owed |
|---|---|---|
| 6 | `orch events` no longer has a default state filter at all — `options.filter` is null unless you pass `--filter`, so `exited` streams like every other state, and `daemon/events.ts` derives `exited` from pid liveness. A dead fleet now announces itself. | When the STREAM ends, nothing names the reason. `subscribeEvents` redials with bounded backoff forever on close or error; a daemon that never comes back is indistinguishable from a quiet fleet. |
| 9 | The dispatch id is minted by the daemon, returned by the CLI, logged under one correlation id, and shows in `orch status` as `.dispatchId`. Delivery IS tracked: the outbox retries until the agent's `ack.jsonl` line arrives, then logs `dispatch.acked`. | None of that reaches the caller. `orch dispatch` prints "Dispatched to X (dispatch abc)" the instant orchd accepts it, and there is no `delivered` transition on the event stream. Delivery is known and unsaid. |
| 10 | The behaviour is settled: for any inbox-steering adapter, `spawn` blocks up to 60s on `awaitBridgeRegistration` and prints `ok` or `STALLED` per agent (exit 1 on a stall), and an adapter that writes no presence record at start prints an UNVERIFIED warning. A dispatch is durable through the outbox, so it queues rather than drops. | The skill says none of this. Nothing tells a reader that spawn already waited, so the `sleep 5` habit has no reason to stop. |

## Open, verified against the code

| # | What the code says today |
|---|---|
| 3 | Replay works (`daemon/rpc/replay.ts`, a 1000-row window with a `gap` flag), but every replayed event is filtered through the same `accepts()` as a live one, and presence reads only LIVE agent views — so a fleet that has since died replays as silence. Nothing prints "replayed N" or "0 events in history", so empty history and wrong scope are the same output. `reference/commands.md` still teaches the false doctrine: "A silent stream means the scope is wrong, not that nothing happened." |
| 4 | `deliverAnswer` returns `ack: "none"`. The answer is typed at the harness and nothing waits, so orch cannot say whether the turn consumed it. |
| 5 | `entities.ts` builds its pool from `agentViews` (every agent ever), not `liveAgentViews`. `liveAgentViews` exists and is used by `close`, `capacity` and presence — but not by name resolution, so an exited pane still holds its name and `dispatch story-server` still hits the ambiguity refusal in `refusal.ts:43`. |
| 7 | `orch result` returns the newest line of `results.jsonl`, and nothing clears or partitions that file on reset. Only the pi agent writes `dispatchId` into a result record; the claude and codex extensions do not. No caller compares a result's dispatch id to the current one, so a post-reset read is silently the last task's. |
| 8 | Steer through an inbox adapter returns `ack: "expected"` and the outbox chases it, so delivery is known internally — the CLI prints `Steered` before any of it. Answer has no ack at all. `awaitControlOutcome` exists and is used by `set-model` only. |
| 12 | No `subscribe` / `subscriptions` verbs exist; the daemon holds the connections and is never asked. `reference/commands.md` still teaches `pgrep -fa "orch events"` as the preflight. |
| 14 | The worker header (`worker-prompt.ts`) says "Run your own tests and typechecks directly in this pane" and names no lint command; nothing in the header or the context carries the repo's lint verb. |
| 16 | No `redispatch` anywhere in `src/` or `skills/`. Still blocked on your ruling below. |

## Blocked on you

| # | Question |
|---|---|
| 16 | Does `redispatch` carry the new model and the new name, or do those stay their own commands? |

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
