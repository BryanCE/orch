# improvements.md — status

8 of 20 done.

| # | Item | Done |
|---|---|---|
| 1 | Nothing tells you thinking effort is per task | ✅ |
| 2 | Capacity is invisible until a spawn dies mid-batch | ✅ |
| 3 | Empty replay is indistinguishable from wrong scope | ❌ |
| 4 | An answer can land after the agent has moved on | ❌ |
| 5 | Exited agents shadow live names | ❌ |
| 6 | A fleet can vanish with no event | ❌ |
| 7 | `orch result` returns the previous task's result | ❌ |
| 8 | Steer and answer have no ack | ❌ |
| 9 | dispatch reports accepted, never delivered | ❌ |
| 10 | Fresh spawn timing is undocumented | ❌ |
| 11 | The watch banner is delivered as an event | ✅ |
| 12 | Orch cannot ask whether a monitor is already armed | ❌ |
| 13 | A watch fires without `--all` | ❌ |
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
| 11 | The watch banner writes to stderr, so it no longer reaches a watching harness as an event. |
| 15 | `orch dispatch <target> --file <path>`, and `--file -` for stdin. Refusals for prompt-and-file together, empty file, unreadable path. `cmdDispatch` split back under the cap. |
| 17 | `--name` gone from every caller and doc. `setup`'s smoke spawn was passing it into a parser that dies on unknown flags, so it could never run. Deleted the unreferenced `test/golden/help.txt`. |
| 18 | Nothing to build: `orch status --json --live` already exists. |
| 19 | `--cwd` deleted from `spawn`, `tile` and `tab new`. An agent starts in the spawner's directory; `--dir <path>` is the override, named for the agent's directory. Incantation stripped from `SKILL.md`, both reference files, and the README. |
| 20 | Audited every verb, flag, short flag and setting the skill names against the code. Three were fiction: `fleet.spawn_cap`, `orch events --notify` (never parsed — it would have been swallowed as a target name), and the notify sink fields, whose real syntax is `--url=<value>` / `--command=<value>`. Quoting guidance rewritten shell-neutral. |

## Also done, not an improvements.md item

| Change |
|---|
| Deleted `orch events --mine` — a flag whose only job was to explicitly select the default. |

## Blocked on you

| # | Question |
|---|---|
| 16 | Does `redispatch` carry the new model and the new name, or do those stay their own commands? |

## Open, from your flag ruling

The same idea is still spelled differently across commands:

| Flag | Where | Means |
|---|---|---|
| `--all` | events, status, results, questions | every space, not just the caller's — consistent already |
| `--any-agent` | events | every agent, not just this session's |
| `--local` | results, questions | this host only, skipping configured remote hosts |
| `--all-panes` | status | also list panes orch did not spawn |

`--any-agent` and `--all` are two different axes wearing similar names; `--local` is a third
axis (host) entirely. `--all-panes` is pane vocabulary in orch's own CLI.
