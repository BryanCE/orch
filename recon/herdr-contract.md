# orch ↔ herdr 0.8.2 contract inventory

## Authority captured
`herdr --skill` says IDs are opaque (`w1`, `w1:t1`, `w1:p1`), are never reused; creation responses must be read (`workspace create`: `workspace`, `tab`, `root_pane`; `tab create`: `tab`, `root_pane`; `pane split`: `pane`); after `pane move` continue with `.result.move_result.pane.pane_id`, while `.previous_pane_id` is old. `agent start` requires an existing pane at an interactive shell prompt, accepts `--timeout`, and names must match `[a-z][a-z0-9_-]{0,31}` and be unique among live agents. `agent prompt --wait` waits settled states; `agent wait --until` is state-specific. `pane read` sources are visible/recent/recent-unwrapped/detection (skill recommends recent-unwrapped for logs). Omitting a pane target may use the UI-focused pane; prefer `--current` or explicit ID.

Group help confirms: `pane run <PANE_ID> <COMMAND>...`; `pane send-keys <PANE_ID> <KEY>...`; `pane process-info --pane <ID>|--current`; `pane layout --pane <ID>|--current`; `pane move <PANE_ID>` with `--tab`, `--split`, `--target-pane`, `--new-tab`; `pane split [PANE_ID]` with `--current`/`--pane`; `agent start <NAME> --kind <KIND> --pane <ID> [--timeout MS]`; `agent wait <TARGET> [--until STATUS] [--timeout MS]`; tab/workspace create and focus/rename/close as used below.

Real error probe (`herdr agent get no-such-agent-zz 2>&1`):
```json
{"error":{"code":"agent_not_found","message":"agent target no-such-agent-zz not found"},"id":"cli:agent:get"}
```
exit status = 1.

## Every CLI invocation
| file:line | argv shape | response fields parsed | contract comparison |
|---|---|---|---|
| `src/backends/herdr/cli.ts:157` | `--version` | text semantic version | OK; `herdrExec` captures text |
| `cli.ts:170` | `pane list` | `panes[]`, each `pane_id` | OK; list has no target and is intentionally global |
| `cli.ts:176` | `agent list` | `agents[]` with `pane_id`, `name` | OK |
| `cli.ts:186` | `tab list` | `tabs[]`, each `tab_id` | OK; global listing |
| `notify.ts:24` | `notification show <title> --body <body>` | none (ack/exit) | OK |
| `index.ts:154` | `pane run <handle> <text>` | none | OK; explicit pane |
| `index.ts:155,354` | `pane send-keys <handle> <keys...>` | none | OK; explicit pane |
| `index.ts:156,349` | `agent focus <handle>` | none | OK; explicit target |
| `index.ts:170,242,316` | `pane close <handle>` | none | OK; explicit pane |
| `index.ts:257` | `pane rename <handle> <name>` | none | OK; explicit pane |
| `index.ts:259` | `agent start <name> --kind <kind> --pane <handle> --timeout 30000` (timeout appended by `herdrStartAgent`) | no fields parsed | **DEFECT:** contract requires unique valid name and shell prompt; shell is polled, but name is not validated/uniqueness-checked (see defects) |
| `index.ts:307` | `pane split <splitFrom> --direction right/down --cwd ... --env ... --no-focus` | `pane.pane_id` (fallback also `root_pane.pane_id`) | OK; split contract returns `pane`; fallback is unnecessary but harmless |
| `index.ts:307` | `tab create --workspace <workspace> --cwd ... --env ... --no-focus` | `root_pane.pane_id` (also accepts `pane`) | OK; skill says tab + root_pane, but orch does **not** parse returned `tab` here because only pane handle is needed |
| `index.ts:374` | `pane read <handle> --source visible --lines N` | raw text | OK syntax; **caveat:** skill recommends `recent-unwrapped` for logs/transcripts, while orch hard-codes `visible` |
| `index.ts:383` | `pane zoom <handle> --on/--off/--toggle` | none | OK; explicit pane |
| `index.ts:389` | `agent rename <handle> <name>` | none | OK syntax; same name grammar applies, but no local validation |
| `index.ts:395` | `pane rename <handle> <name>` | none | OK |
| `index.ts:416` | `pane move <handle> --tab <group> --split <dir> [--target-pane <against>] --no-focus` | `move_result.changed`, `move_result.reason` only | **DEFECT:** herdr returns `move_result.pane.pane_id` (new ID); orch ignores it and continues using old handle |
| `index.ts:424` | `pane move <handle> --new-tab --no-focus [--label]` | nothing (typed `unknown`) | **DEFECT:** move contract requires adopting returned new pane ID; orch discards whole response |
| `index.ts:440` | `pane layout --pane <handle>` | `layout.tab_id`, `layout.panes[].pane_id`, `.rect` | OK; explicit pane |
| `index.ts:452` | `pane process-info --pane <handle>` | `result.process_info.shell_pid`, `foreground_process_group_id`, `foreground_processes[].name` | OK shape and explicit target; JSON is validated |
| `index.ts:469` | `agent wait <handle> --until <status> --timeout <ms>` | none (wait success is exit) | OK; explicit target and `--until` |
| `index.ts:481` | `workspace create --cwd ... --no-focus [--label]` | `workspace.workspace_id`, `root_pane.pane_id` | OK; matches skill |
| `index.ts:493` | `tab create --workspace ... --cwd ... --env ... --no-focus [--label]` | `tab.tab_id`, `root_pane.pane_id` | OK; matches skill exactly |
| `index.ts:505` | `tab rename <group> <label>` | none | OK |
| `index.ts:511` | `tab close <group>` | none | OK |
| `index.ts:517` | `tab focus <group>` | none | OK |
| `index.ts:524` | `workspace list` | `workspaces[]` | OK |
| `index.ts:530` | `workspace focus <workspace>` | none | OK |
| `hud.ts:124` | `pane list` and `tab list` | JSON `panes`/`tabs` (unwraps optional `result`) | OK; listings intentionally global |
| `hud.ts:192` | `notification show <title> --body ... --sound request --position bottom-left` | none | OK |

`herdrAck`/`herdrJSON`/`herdrExec` wrappers are defined in `cli.ts:122-150,193`; mutation failures include stderr/stdout in an error, preserving herdr's JSON error body.

## ID derivation and implicit focus audit
- `index.ts:67-74` derives an **agent name** from adapter id and the final `~`-separated key component, normalizing/truncating to 32 chars. This is not a herdr pane/tab/workspace ID, but it is used as `agent start` name.
- `index.ts:60-62` resolves workspace by matching the caller-provided `HERDR_PANE_ID` against `pane list`; it does not derive an ID.
- `index.ts:218-223` uses `HERDR_PANE_ID` as caller identity (environment-provided opaque pane ID), not a predicted ID.
- `index.ts:307-309`, `481-483`, `493-495` read creation IDs from responses. `index.ts:323` and `331-337` read IDs from listings. No other pane/tab/workspace ID is synthesized.
- `pane-socket.ts:114-141` and `hud.ts:67-70` derive event/message IDs using timestamp + random suffix; these are orch socket message IDs, not herdr entity IDs.
- No orch control invocation targets a pane implicitly: all pane/agent operations carry `<handle>`/`--pane`; `pane list`, `tab list`, `agent list`, `workspace list`, and notifications are global by definition. `hud.ts:124` list calls likewise have no focused-pane dependency. No use of `--current` is present.

## Prioritized concrete defects
1. **P0 — `src/backends/herdr/index.ts:414-424` (both move paths).** Herdr contract returns a new `move_result.pane.pane_id` after move and says old `previous_pane_id` must not be reused. Orch reduces response to `changed/reason` or discards it, then keeps the old handle. Smallest fix: return/adopt the response's `move_result.pane.pane_id` through the backend handle/update path; never continue with `previous_pane_id`.
2. **P1 — `src/backends/herdr/index.ts:67-74,259`.** Herdr requires name regex and uniqueness among live agents. Explicit `opts.name` is passed unvalidated; generated names can collide after normalization/truncation. Smallest fix: validate against the exact regex and check `herdr agent list` before `agent start`, returning a deterministic collision error (or generate a unique valid name).
3. **P2 — `src/backends/herdr/index.ts:374`.** `pane read` uses `--source visible`; the official skill says `recent-unwrapped` is preferred for logs/transcripts and visible is only the viewport. Smallest fix: use `recent-unwrapped` for backend capture/read semantics where complete output is required.
