# orch bug reports / suggestions

## 2026-08-24 — a spawned pane is bound to a WORKSPACE, not to the calling session or its repo

- Observed: `orch spawn 4 --name mcpname` run from `/mnt/c/dev/ils/t3reports` produced four panes
  that `orch status --json` reports as `workspace: "wF"` with **no cwd recorded at all**
  (`cwd=n/a`). Nothing confines those panes to the repo the command was issued from — the only
  thing pointing them at it was the sentence `Repo /mnt/c/dev/ils/t3reports` at the top of each
  dispatch prompt.
- How it surfaced: edits appeared in `/mnt/c/dev/personal/orch` (48 files, incl.
  `src/daemon/events.ts`, `src/daemon/orchd.ts`, `src/notify/format.ts`) while this fleet was
  running. They turned out to be another session's work — but **that is the bug**: with no cwd on
  the pane and one shared workspace, there was no way to tell from orch whose fleet did it. I
  closed four panes (`fix-1`..`fix-4`) that were not mine while trying to find out.
- Root cause: `wF` is a single shared herdr workspace that every session on the machine spawns
  into. There is no session→fleet binding and no default cwd binding, which is also why `owner`
  is `herdr~wF~operator` on every pane (see below) and why one session's `orch status` lists
  another session's workers as if they were its own.
- Impact: the ONLY thing keeping a worker inside the intended repo is a sentence in its prompt.
  That is not a boundary — a wandering agent hits no error, and the orchestrator finds out only
  by noticing unexplained edits in an unrelated repo. `--cwd` exists and fixes it, but it is
  opt-in and easy to omit; the safe behaviour should be the default.
- Suggestion: default `--cwd` to the directory `orch spawn` was invoked from, and record it on the
  pane so `orch status` can show it. Optionally refuse writes outside the pane's cwd unless a flag
  opts out. Scope a fleet to the session that spawned it rather than to the shared workspace.

## 2026-08-24 — `owner` is identical on every pane, so nothing identifies which session may close a pane

- Observed: `orch status --json | jq -r '.[].owner'` returned `herdr~wF~operator` for all 13 live panes — my 13 workers across 4 tabs AND a `TL Commission` pane belonging to a different session. The field is per-workspace, not per-orchestrator.
- Impact: the skill's rule "close only your own panes" is unenforceable from `status` alone. The only thing keeping a session from closing another session's worker is remembering its own spawn names in conversation context — which does not survive a compaction or a `--resume`. `orch close --all` is worse: it claims to close "only orch-spawned panes", which is every session's panes, not the caller's.
- Suggestion: stamp each pane with the orchestrator identity that spawned it (session id / pid), expose it as a distinct field (`spawnedBy`) alongside `owner`, and have `orch close` refuse a pane spawned by a different orchestrator unless `--force`. Scope `--all` to the caller's own panes.

## 2026-08-24 — `orch events` re-emits the same transition repeatedly for an idle pane

- Observed: with `orch events --status done,error,blocked,asking --json` attached, a pane sitting
  idle at `done` produced ~15 identical `"oldState":"aborted","newState":"done"` events in under a
  minute — same `key`, same `task`, same `cost`, each with a fresh `seq` and `ts`. Not a replay of
  history: they kept arriving live, after a timestamp floor had already excluded everything older
  than the moment the stream opened.
- Impact: every duplicate is its own notification, so the push stream is unusable as-is — the
  consumer has to bolt on `awk '$0 != last[$1] {...}'` state to get back to one-event-per-actual-
  transition. `--status` does not suppress them because they genuinely re-enter the same state.
- Suggestion: only emit when `oldState != newState`, or dedupe by `(key, oldState, newState)`
  within a window. Related: attaching replays recent history with no way to opt out — a
  `--since-seq <n>` / `--live-only` flag would let a consumer choose (see the field request below;
  `seq` is already in the payload, it just cannot be used as a cursor).

## 2026-08-24 — feature request: `orch events` is missing the fields that would let it replace polling entirely

Not an orch bug — `orch events` already pushes and works. The poll loop was a bug in MY orch-cli
skill, which told me to copy a `while true` + `orch status --json` + jq-diff monitor verbatim and
never mentioned `orch events` at all. That produced three stacked poll loops in one session, two
watching panes that had already been closed. **The skill is now fixed** to arm a single
`orch events` stream with a `pgrep -fa "orch events"` preflight.

What remains are genuine gaps in what the stream carries.

### What `orch events --json` emits today

```json
{"key":"herdr~wF~4z6k02hgiy","workspace":"wF","agent":"pi","tab":null,
 "model":"gpt-5.6-luna:\"high\"","oldState":"aborted","newState":"done",
 "task":"[from herdr~wF~gqsfbx7vy3] Read-only: inspect next 4 MCP tools (5-8 alphabeti...",
 "cost":0.074,"ts":"2026-08-24T19:55:58.554Z","seq":3684,"workspaceName":"wF"}
```

### What it needs to carry

| field | why |
|---|---|
| `name` | **The blocker.** `key` is an opaque `herdr~wF~4z6k02hgiy`; `status --json` has `name` but events does not, so an event cannot be mapped back to `mcpname-2` without a second `status` call. `tab` came back `null` too, so neither identifier is usable. |
| `dispatchId` | Echo the id of the dispatch this transition belongs to. Also fixes diagnosing a pane that runs an older/narrower prompt than the one sent — compare ids instead of eyeballing `.task`. |
| `spawnedBy` | Same session identity as the `owner` item above, so a stream can be filtered to the caller's own panes without naming them. |
| `result` (on `done`) | The final text, or a path to it. Every `done` today is followed by a blocking `orch result <name>` round-trip for an answer the daemon already holds. |
| `reason` (on `error`/`blocked`) | What actually failed — API error, tool denial, context exhaustion. Right now `error` is a bare state and diagnosis needs `orch tail`. |
| `filesTouched` (on `done`) | The paths the worker wrote. `done` is a claim; this makes verification cheap and lets the orchestrator detect two workers colliding on one file. |
| `tokens` / `ctxPercent` | Already in `status`; in the stream they let the orchestrator see a worker approaching its context limit before its output degrades. |

### The flags that make it survivable

- **`--since-seq <n>`** — events already carry a monotonic `seq`. Let a reconnecting stream replay
  from the last seq it saw. This is the single fix for compaction: a fresh monitor resumes the same
  stream instead of starting blind, and nothing that happened during the gap is lost.
- **`--mine`** — restrict to panes this orchestrator spawned, resolved by the daemon rather than by
  a name list the caller has to remember. Removes the reason a compacted session arms a second
  monitor at all.
- **Idempotent arming** — `orch events --mine --once`, or a documented rule that a second stream for
  the same session replaces the first, so re-arming after a compaction cannot stack.

### How the orchestrator would use it

One persistent stream per session, armed at the first dispatch and never re-armed:

```bash
orch events --mine --status done,error,blocked,asking --json \
  | jq -r --unbuffered '"\(.name) \(.newState) \(.reason // .result[0:200] // "")"'
```

No poll loop, no pane-name list, no `status` round-trip to resolve `key`, no follow-up `orch result`
on completion. On reconnect after a compaction it becomes
`orch events --mine --since-seq $(cat .orch-last-seq)` and the gap closes itself.
