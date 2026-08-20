# orch bug report

Issues hit while driving the orch CLI from this repo.

## 2026-08-20 — dead daemon reported as a 2000ms timeout, and `spawn` reported success against it

- **Sequence:** `orch spawn 3 --name recon` created and tiled three panes, registered all three
  ("ok" for each), then printed three `could not pin ... to openai-codex/gpt-5.6-luna:high` warnings,
  each saying `orchd pid 81440 did not answer within 2000ms; it was NOT stopped`. Every later
  command, `orch status`, `orch status --json`, `orch daemon status`, returned only that same
  timeout line. `orchd.log` showed `2026-08-19T20:42:19.678Z orchd shutting down on SIGTERM` and
  nothing after it. The daemon had been dead for hours; nothing was slow.
- **Expected:**
  1. `daemon status` must distinguish "dead" from "busy". The pid is not running, so this is
     knowable without waiting 2000ms. The message actively argues the opposite ("a timeout is no
     proof it died"), which sends the operator to `orchd.log` to discover what `status` should
     have said.
  2. `spawn` must not report a successful fleet when it could not reach the daemon. It printed
     the tiling, "Spawned 3 named agent(s)", and per-pane `ok` registration lines, so the fleet
     looked healthy while its control plane was absent.
  3. `status --json` returned non-JSON on this path, so a JSON consumer crashes on a parse error
     instead of reading an error object. Error output on `--json` should still be JSON.
- **Impact:** High. The operator spawns a fleet, sees success, dispatches into it, and gets
  nothing back. Diagnosis requires reading `orchd.log` by hand because every CLI surface reports
  the same misleading timeout.
- **Suggested fix:** In the RPC client, when the connect/answer deadline expires, probe the
  recorded pid before composing the message. Dead pid gives "orchd pid N is not running (last log
  line: ...)" plus the reclaim path. Live pid keeps the current timeout wording. Make `spawn`
  fail loudly, or at minimum print a "control plane unreachable, panes are unmanaged" banner,
  when any post-create daemon call times out.

## 2026-08-20 — `orch result` returns the last line, not the agent's report

Pane `dispersal-2` (`wF:p1E`), state `done`, cost $0.04, 24% context.

`orch result dispersal-2` printed one line:

```text
Noted. Key distinction: `detectedReassignments` can increment without a `DISPERSED` event...
```

That is the agent's acknowledgement of a `steer`, not the multi-section report it produced. The full answer was only recoverable by finding the raw session JSONL under `~/.pi/agent/sessions/` and pulling assistant text out by hand.

A `steer` mid-task makes the trailing message an acknowledgement, so "last assistant message" is the wrong thing to return. Return the substantive final report, or return every assistant turn since the original dispatch and let the caller pick.

## 2026-08-20 — `orch tail` reports "(no entries)" for a pane that produced output

Same pane, same moment. `orch status` showed `done`, $0.04 spent, 24% context used. `orch tail dispersal-2` printed:

```text
model: openai-codex/gpt-5.6-luna:high   cost: $0.0000   turns: 0

(no entries)
```

Cost `$0.0000` and `turns: 0` contradict the `orch status` row for the same agent, so `tail` is reading a different session file than the one the work happened in, probably a newly created empty one. When a pane has several session files, `tail` has to resolve the one tied to the dispatch instead of the newest on disk.

## 2026-08-20 — `orch status --json` shape is undocumented, and getting it wrong fails silently

`orch status --json` emits a top-level array. Writing `.agents[]` against it is a natural first guess and fails with:

```text
jq: error: Cannot index array with string "agents"
```

That failure is invisible in the case that matters. jq writes the error to stderr while a watcher only consumes stdout, so a poll loop built on the wrong path emits zero events forever, which looks exactly like "nothing has finished yet". Cost here was a monitor that ran six minutes past both agents completing, while I sat waiting on it.

Either fix works:

- document the array shape and element fields in `orch help status` (`name`, `state`, `key`, `paneId`, `tab`, `model`, `modelShort`, `cost`, `ctxPercent`, `tokens`, `turns`, `task`, `lastText`, `alive`, `exited`, `sessionPath`, `presenceDir`, `workspace`, `owner`);
- or add `orch status --names <a,b> --states done,error,blocked,asking`, printing one `name<TAB>state` line per match, so a watcher never needs jq at all.
