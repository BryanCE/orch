# orch bugs — 2026-07-22 session evidence

Environment: orch global npm install, orchd running, herdr backend, workspace wE, repo t3reports. All commands run from WSL in the repo. Reproduced multiple times in one session; this is the write-up of the exact sequences.

## BUG 1 (worst): target resolution goes ambiguous after a pane's first COMPLETED dispatch — and `reset` clears the SESSION but not the ambiguity

Deterministic repro, hit twice today on two different panes:

1. `orch spawn 1 --name impl` -> pane impl-1 (wE:p1Q)
2. `orch dispatch impl-1 "<task>"` -> works, agent runs, goes done
3. `orch reset impl-1` -> succeeds: "Cleared session on wE:p1Q (/new); ready."
4. `orch dispatch impl-1 "<next task>"` -> FAILS: `control target wE:p1Q is ambiguous: herdr~wE~impl-1, wE:p1Q`

So reset half-works: the session write resolves, the very next dispatch to the SAME target string does not. The registry appears to hold two entries for one pane (agent key `herdr~wE~impl-1` and pane id `wE:p1Q`) and dispatch refuses to pick.

- `orch close wE:p1Q` -> `Ambiguous target "wE:p1Q"` (the PANE ID ITSELF is ambiguous, not just the name)
- `orch close herdr~wE~impl-1` -> **WORKS**: "Closed wE:p1Q."

So the full agent key resolves for `close` while both the short name and the pane id are ambiguous. Whatever dedup you do for close-by-full-key, dispatch/steer/reset need it too. Expected behavior: name, pane id, and full key all resolve to the one live bridge; a stale registry entry from the completed dispatch should be evicted or shadowed, never left to collide.

Identical earlier occurrence: pane recon-map-1 (wE:p1N), same steps, same error string `control target wE:p1N is ambiguous: herdr~wE~recon-map-1, wE:p1N`.

## BUG 2: steers to a WORKING agent return "not applied or acknowledged" while the dispatch channel is fine

While impl-1 (wE:p1Q) was mid-task on its FIRST dispatch (state `working` in `orch status --json`):

- `orch steer impl-1 "<scope change>"` -> `write 07285671-... was not applied or acknowledged for target wE:p1Q`
- retry -> `write a89f6c66-... was not applied or acknowledged for target wE:p1Q`

The agent was healthy: it completed the full task and wrote result.json. So the inbox/steer write path to a live, working bridge silently drops while the original dispatch executes fine. A steer that can never land mid-run makes steering useless exactly when it matters.

## BUG 3: session/tail telemetry is disconnected from the agent's real activity

For the whole impl-1 run, `orch tail impl-1` showed:

```
model: openai-codex/gpt-5.6-luna:medium   cost: $0.0000   turns: 0
(no entries)
```

...from dispatch through `done`, while the agent actually edited 11 files and produced a full result (`orch result impl-1` returned the complete report). So `tail`/session shows a fresh empty session while the work happens somewhere else, cost stays $0.0000, turns stays 0. Either the bridge writes to a different session file than tail reads, or the reset created a new session file and tail follows the new one while the run logs to the old. Consequence: zero mid-run observability — you cannot see what a working agent is doing, only its terminal result.

## BUG 4 (previously reported, still present): `spawn --tab` is ignored

Every `orch spawn N --name X` creates a NEW tab named X even when `--tab <existing>` is passed. Workaround in use: spawn, then `orch move <pane> --tab <tab_id> --split down` (emptied tab auto-closes). Works, but it is two commands and a tab flash per worker.

## BUG 5 (previously reported): `orch rename <pane> <newname>` fails

`orch rename standardize-1 collapse` -> "Could not rename". Tab rename (`orch tab rename wE:tR impl`) works fine; pane rename does not.

## Also seen this session (context, may be same root cause as 1/2)

- Spawn model pin warning: `warning: could not pin impl-1 (wE:p1Q) to openai-codex/gpt-5.6-luna:medium` on a fresh spawn; manual `orch model impl-1 <spec>` immediately after was accepted. Intermittent.
- Every CLI invocation prints node's `ExperimentalWarning: SQLite is an experimental feature` to stderr — worth suppressing in the packaged bin.

## BUG 6: no auto-tiling on spawn/move — panes land wherever the last --split put them

`orch move <pane> --tab <id> --split down` stacks every moved pane off the same edge, so a tab that accumulates workers ends up with a wrong, unbalanced layout unless the orchestrator remembers to run `tile` after every move. Tiling should not be a choice: any spawn into a tab and any `move` into a tab should auto-rebalance the tab's layout (the same balanced tiling `spawn N` already does for its own fresh tab). Manual `--split` should be the override, not the default path.

Worse: attempting the manual rebalance, `orch tile wE:tR` did not tile the tab — it SPAWNED a new agent pane (`warning: could not pin tile-4 (wE:p26)...`, status then showed a `tile-4 unknown` row). `tile` appears to parse its argument as a spawn spec. So there is currently NO working way to rebalance a tab after moving panes in: `--split` stacks them wrong and `tile` creates garbage panes (had to `orch close herdr~wE~tile-4`). Auto-tile on spawn/move would make both problems disappear.

## BUG 7 (extends bugs 1/2): an IN-FLIGHT pane in `asking` state is fully unreachable — every control channel fails at once

Pane attn-1 (wE:p1X) asked a question mid-task (state `asking`). Then:
- `orch answer attn-1 "..."` -> `agent is owned by wE:p1` (misroute: wE:p1 is the ORCHESTRATOR's own pane)
- `orch answer herdr~wE~attn-1 "..."` -> same `agent is owned by wE:p1` (full key does not help for answer)
- `orch steer` -> not applied or acknowledged (bug 2)
- `orch dispatch attn-1 "..."` -> `control target wE:p1X is ambiguous: herdr~wE~attn-1, wE:p1X` — so the ambiguity of bug 1 is NOT only after a completed dispatch; it hit an agent still on its FIRST dispatch
- `herdr pane run wE:p1X "<answer>"` typed into the pane but the agent never left `asking` (store status.json flipped to `blocked`)
- The store (`~/.orch/agents/herdr~wE~attn-1/`) held question.json but no inbox file to append an answer to

Net: a worker that asks a question can become permanently stuck with no way to answer it; the only recovery was `orch close herdr~wE~attn-1` (close by full key still worked) and a full re-dispatch to a fresh pane with the answer pre-baked into the prompt. `orch answer` must resolve the same registry entry that `questions` lists, and the answer path needs a durable file fallback like dispatch has.

## ASK: one session-long fleet event stream that actually covers everything

An orchestrator should subscribe ONCE per session and see every agent transition (spawned, working, asking, blocked, done, error) for the workspace. `orch events` nominally is that channel, but given the daemon-restart deafness (bridges lose their subscription, no reconnect) and the registry ambiguity above, the practical fallback today is polling `orch status --json` in a loop — and `asking` is easy to miss unless explicitly polled for (a pane sat stuck on a question until a human noticed). Wanted: `orch events --all --follow` that (a) survives daemon restarts, (b) emits asking/blocked (with the question text), (c) never goes silent for a live fleet. One subscription, whole fleet, whole session.

## What would fix the workflow

1. One pane = one resolvable identity for ALL ops (dispatch/steer/reset/close), before and after any number of completed dispatches. Evict/merge stale registry entries on completion and on reset.
2. Steer writes must ack against a working bridge, or fail with a reason (bridge deaf, queue full), never a silent no-ack.
3. `orch tail`/session must follow the session the bridge is actually writing, so a working agent is observable mid-run.
4. Honor `spawn --tab`.
5. Fix pane `rename`.
