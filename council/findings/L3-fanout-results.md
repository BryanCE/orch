## 1. Registry commands
- `status` — fleet table with cost and context; `commands/status/verb.ts` (`registry.ts:46`, `index.ts:131`).
- `whoami` — caller identity; `commands/whoami.ts` (`registry.ts:59`, `index.ts:134`).
- `monitor` — stream selected state changes; `commands/events.ts` (`registry.ts:60`, `index.ts:132`).
- `events` — stream every state transition; `commands/events.ts` (`registry.ts:61`, `index.ts:130`).
- `questions` — list agents blocked on a question; `commands/results.ts` (`registry.ts:63`, `index.ts:136`).
- `runs` — dispatch history; `commands/runs.ts` (`registry.ts:68`, `index.ts:135`).
- `logs` — structured diagnosis records; `commands/logs.ts` (`registry.ts:73`, `index.ts:129`).
- `dispatch` — durable task to a clean session; `commands/control.ts` (`registry.ts:86`, `index.ts:161`).
- `answer` — answer an agent's question; `commands/control.ts` (`registry.ts:100`, `index.ts:150`).
- `steer` — mid-run instruction; `commands/control.ts` (`registry.ts:101`, `index.ts:153`).
- `broadcast` — steer several agents; `commands/control.ts` (`registry.ts:103`, `index.ts:152`).
- `pipe` — hand one agent's result to another; `commands/control.ts` (`registry.ts:107`, `index.ts:151`).
- `model` — change an agent's model; `commands/control.ts` (`registry.ts:109`, `index.ts:157`).
- `wait` — block until an agent reaches a state; `commands/lifecycle/index.ts` (`registry.ts:114`, `index.ts:160`).
- `result` — print each target's result; `commands/results.ts` (`registry.ts:125`, `index.ts:149`).
- `tail` — session entries; `commands/results.ts` (`registry.ts:129`, `index.ts:154`).
- `peek` — current pane screen; `commands/panes.ts` (`registry.ts:130`, `index.ts:144`).
- `attach` — watch/type into an agent screen; `commands/attach.ts` (`registry.ts:131`, `index.ts:155`).
- `session` — session path and stats; `commands/results.ts` (`registry.ts:132`, `index.ts:155`).
- `queue` — durable task queue: `add`, `list`, `history`, `cancel`, `edit`, `take-on`, `reap`, `intake` (their summaries are respectively add task, list queued/claimed/settled, list completed/failed/cancelled, cancel unclaimed, replace unclaimed text, claim now, delete settled, and pull tasks into an agent); all are implemented by `commands/queue.ts` (`registry.ts:139-165`, `index.ts:143`).
- `work` — assign queued tasks to idle agents; `commands/daemon.ts` (`registry.ts:168`, `index.ts:146`).
- `review` — review finished worktree agents: `list`, `approve`, `reject` (list branches with commits ahead, land/close/remove, or re-dispatch feedback); `commands/review.ts` (`registry.ts:176-185`, `index.ts:147`).
- `spawn` — launch named agents; `commands/spawn/index.ts` (`registry.ts:198`, `index.ts:156`).
- `tile` — add an agent to a tab; `commands/spawn/index.ts` (`registry.ts:216`, `index.ts:156`).
- `rename` — set agent name or pane label; `commands/lifecycle/rename.ts` (`registry.ts:218`, `index.ts:159`).
- `reset` / alias `new` — fresh session, same agent; `commands/lifecycle/reset.ts` (`registry.ts:222`, `index.ts:158`).
- `reload` — live-reload agent code; `commands/lifecycle/reload.ts` (`registry.ts:223`, `index.ts:155`).
- `restart` — relaunch harness; `commands/lifecycle/reload.ts` (`registry.ts:225`, `index.ts:162`).
- `close` / alias `kill` — close agents; `commands/lifecycle/close.ts` (`registry.ts:237`, `index.ts:157`).
- `abort` — cancel current turn and optionally steer; `commands/lifecycle/close.ts` (`registry.ts:244`, `index.ts:163`).
- `detach` — release lease; `commands/lease.ts` (`registry.ts:245`, `index.ts:164`).
- `adopt` — list/take orphans; `commands/lease.ts` (`registry.ts:246`, `index.ts:165`).
- `reap` — delete agent record; `commands/lease.ts` (`registry.ts:248`, `index.ts:166`).
- `grant` — approve refused action (subcommand `list` shows pending approvals); `commands/grant.ts` (`registry.ts:253-256`, `index.ts:167`).
- `lock` — run a gated command when allowed; `commands/lock.ts` (`registry.ts:258`, `index.ts:168`).
- `focus`, `zoom`, `move`, `keys`, `pane` (subcommand `list`) — focus pane, zoom, move pane, send keys, or list raw panes; `commands/panes.ts` (`registry.ts:259-281`, `index.ts:144-145`).
- `tab` — manage tabs: `list`, `new`, `rename`, `close`, `focus`; `commands/panes.ts` (`registry.ts:287-303`, `index.ts:145`).
- `space` — manage spaces: `list`, `create`, `rename`, `delete`, `focus`; `commands/space.ts` (`registry.ts:307-315`, `index.ts:148`).
- `daemon` — manage orchd: `start`, `stop`, `status`, `reload`; `commands/daemon.ts` (`registry.ts:322-333`, `index.ts:140`).
- `host` — manage linked machines: `list`, `add`, `key`, `check`, `forget`, `serve`; `commands/host.ts` (`registry.ts:337-353`, `index.ts:148`).
- `doctor` — check/fix install; `commands/doctor.ts` (`registry.ts:357`, `index.ts:139`).
- `clean` — remove dead agent dirs/orphaned worktrees; `commands/clean.ts` (`registry.ts:365`, `index.ts:138`).
- `setup` — onboarding wizard; `commands/setup.ts` (`registry.ts:373`, `index.ts:145`).
- `settings` — inspect/edit settings; subcommands `models`, `thinking`, `skills`, `notify list/add/remove`, `grant`, `revoke`; `commands/settings.ts` (`registry.ts:391-438`, `index.ts:145`).
- `models` — list models each harness can run; `commands/models.ts` (`registry.ts:442`, `index.ts:141`).
- `notify test` — send synthetic transition to sinks; `commands/events.ts` (`registry.ts:452-459`, `index.ts:137`).
- `version` / `-V` / `--version` — installed version; inline handler in `commands/index.ts` (`registry.ts:463`, `index.ts:174-176`).
- `help` / `-h` / `--help` — command map/topic; inline handler in `commands/index.ts` (`registry.ts:464`, `index.ts:177`).

## 2. RPCs used by the named commands
- `spawn`: RPC `spawn`; request has `form`, agent array (`name`, `harness`, `model`, `thinking`, `prompt`), `cmd`, `plexer`, `cwd`, `tab`, `space`, `host`, `worktree` plus governance; response is a discriminated `answer` or `spawned` result containing agents/panes/harness traits/notes. Handler: `daemon/server/handlers/table.ts` routes to `daemon/server/spawn/index.ts` (`protocol.ts:214, 698-708, 882-900`; `spawn/index.ts:322`).
- `dispatch`: RPC `dispatch`; request `{target,text,worker?}` plus governance; response `ACCEPTED` = `{accepted:true,id,ack}`. Handler `daemon/server/handlers/write.ts` (`protocol.ts:305-309, 625-633, 846`; `handlers/table.ts:130`).
- `result`: no result-named RPC; client calls `agent-read` with `{caller,key,read:{kind:"result"}}`; response `{host,reading}` where result lookup is found `{source,payload}` or missing `{reason}`. Handler `daemon/server/handlers/host.ts` (agent-read schema/result schema: `protocol.ts:505-524, 751, 948`; route: `handlers/table.ts:170`).
- `wait`: RPC `agent-wait`; `{caller,target,status,timeoutMs}` → `{reached,state}`; handler `daemon/server/handlers/wait.ts` (`protocol.ts:755, 950`; command call: `commands/lifecycle/index.ts:17-29`).
- `pipe`: no pipe RPC; reads source with `agent-read` then sends composed text to destination via `steer`; both calls use the above read result and `ACCEPTED` response. Handlers: `handlers/read.ts` and `handlers/write.ts`; CLI composition `commands/control.ts:94-96,177-198`.
- `broadcast`: no broadcast RPC; one `steer` RPC per destination, each `ACCEPTED`; write handler `daemon/server/handlers/write.ts`. `steerEach` makes parallel calls and records delivered/refused outcomes individually (`commands/control.ts:109-175`).
- Queue `add`: RPC `enqueue`, request `{enqueuedBy,text,opts,scope}`, response `{task:TaskRec}`, `handlers/lifecycle.ts` (`protocol.ts:607-614, 867`; handler `handlers/table.ts:133`).
- Queue `list`/`history`: `queue-list`, `{history:boolean}` → `{tasks:TaskRec[]}`, `handlers/queue.ts` (`protocol.ts:777,962`; route `handlers/table.ts:199`).
- Queue `cancel`: `queue-cancel`, `{target,by}` plus governance → `{task:TaskRec}`; `handlers/queue.ts` (`protocol.ts:778,963`; route `handlers/table.ts:200`).
- Queue `edit`: `queue-edit`, `{target,by,text}` plus governance → `{task:TaskRec}`; `handlers/queue.ts` (`protocol.ts:779,964`; route `handlers/table.ts:201`).
- Queue `take-on`: `queue-take-on`, `{target,taker}` plus governance → `{task:TaskRec}`; `handlers/queue.ts` (`protocol.ts:780,965`; route `handlers/table.ts:202`).
- Queue `reap`: `queue-reap`, `{target,by}` plus governance → `{ok:true}`; `handlers/queue.ts` (`protocol.ts:781,966`; route `handlers/table.ts:203`).
- Queue `intake`: `queue-intake`, `{by,agent?,space?,close}` plus governance → `{intakes:PackIntakeRec[]}`; `handlers/queue.ts` (`protocol.ts:782,967`; route `handlers/table.ts:204`). Queue routes are registered in `daemon/server/handlers/table.ts:199-204`.

## 3. Results
- `report-result` takes `ResultReport`: `{text:string, dispatchId?, task?, model?:{provider,id}|null, thinking?, tokens?:{input,output,cacheRead,cacheWrite}|null, cost?, turns?, sessionPath?, finishedAt:number}`; fields other than `text` are structured metadata (`types/presence.ts:99-110`; RPC schema `daemon/client/protocol.ts:621`).
- orchd writes presence history and upserts a `runs` row keyed by dispatch id; result payload in `runs.result` is JSON text. `runs` columns: `dispatch_id`, `agent_key`, `adapter`, `model`, `space`, `task`, `state`, `started_at`, `finished_at`, `tokens_in`, `tokens_out`, `cache_read`, `cache_write`, `cost`, `turns`, `result`, `last_error` (`daemon/server/status-report.ts:137-159`; `db/schema.ts:81-100`).
- `orch result a b` prints each result separately, headed `== a` / `== b`; each found entry prints host annotation, optional history/session-source notice, then rendered payload; JSON emits one array entry per target. It does not join results (`commands/results.ts:66-68, 84-104`).
- The reported answer itself is text (`ResultReport.text`), but the report has structured metadata; historical run results may be arbitrary JSON values (`types/presence.ts:101-110`; `store/run-rows.ts:16-33`).

## 4. Task queue
- `tasks` columns: `id`, `text`, JSON-text `opts`, `enqueued_by`, nullable exactly-one scope among `scope_agent_id`, `scope_pack_id`, `scope_space_id`, and `created_at` (`db/schema.ts:412-430`).
- The daemon finds alive `idle`/`done` presence entries with agent rows, picks the oldest eligible queued/failed task matching scope, model and harness, then inserts a unique open `task_attempts` claim with agent and dispatch id; the unique index makes competing claim loss return false (`daemon/server/work-loop.ts:26-29, 276-295`; `queue.ts:217-270`; `db/schema.ts:438-456`).
- Each work-loop tick sweeps retained rows on schedule, re-emits due questions, snapshots presence, settles claimed tasks from agent status/result (or failure if gone), discovers idle runners, claims and dispatches tasks up to configured concurrency, then waits for a wake/tick; one-pass mode exits after one assignment pass (`daemon/server/work-loop.ts:250-308`).

## 5. `orch pipe`
- Reads the source agent's reported result through orchd, requires nonempty rendered result text, prefixes it with `[piped from <name>]`, inserts optional instruction, then sends that text as a `steer` to the destination. It moves result text, not session state (`commands/control.ts:94-96,177-198`).

## 6. `orch review`
- Collects ended or done agents with worktrees whose branches have commits ahead of base; each review includes branch/worktree/base, task, result summary (or commit summary), diff, commit count, harness/provider, ended state, host. `list` prints a table (`target`, `branch`, ahead count, task, summary); JSON prints rows (`daemon/server/handlers/review.ts:54-110`; `commands/review.ts:26-42`).
- `approve` lands branch, closes agent if not ended, removes worktree; `reject` steers feedback into the same worktree (`commands/review.ts:48-79`).

## 7. Groups
- `groups.ts` is a pure lookup helper: a plexer `BackendGroup` (tab) can be matched by exact id or label, otherwise case-insensitive label (`groups.ts:1-9`). It does not create groups.
- The plexer/server creates a tab/group through `tab new`; `orch spawn --tab` places agents in a tab and `tile` targets one. Tab operations also take group identifiers: `tab list/rename/close/focus`, pane `move`, plus `focus`/`zoom`/`move` commands act on tab/pane context (`commands/registry.ts:198-201,287-303`; creation RPC description `daemon/client/protocol.ts:725`).

## 8. Worker prompt
```text
[orch worker] No human watches you. Verify the files you edited before you report; a task that edits no file runs no verify command. Every orch verb (spawn, dispatch, steer, close, reset, status) stays forbidden. Do the work yourself. A slice too big for one agent is reported back, not split by you. Run the tests and typechecks this repository already has. Never spawn subagents. For any decision you cannot make yourself, call orch_ask and wait for the orch. NEVER use ask-user/question tools. End your turn with your final report as your last reply; orch delivers it to the orch. Never route a report through another agent.
```
This is the base header plus clauses for no configured verify command, no spawn permission, ask-capable harness, and reachable spawner; the clauses vary by settings/harness/context (`worker-prompt.ts:20-23, 26-29, 44-46, 55-67, 88-101`).

## 9. Schema tables
- `outbox` — durable control deliveries and retry state (`db/schema.ts:27`).
- `control_outcomes` — agent outcomes for control commands (`db/schema.ts:38`).
- `questions` — agent questions and their answer state (`db/schema.ts:49`).
- `question_options` — ordered choices for questions (`db/schema.ts:60`).
- `catalogues` — cached command catalogue output (`db/schema.ts:68`).
- `events` — durable sequenced event payloads (`db/schema.ts:75`).
- `runs` — dispatch/run state, metrics and result (`db/schema.ts:81`).
- `harnesses` — configured harness identities (`db/schema.ts:103`).
- `plexers` — configured plexer identities (`db/schema.ts:109`).
- `hosts` — linked machine identity and OS (`db/schema.ts:115`).
- `host_plexers` — plexer installations per host over time (`db/schema.ts:122`).
- `host_names` — configured host name bound to host identity (`db/schema.ts:136`).
- `host_links` — linked-host connection intervals and last-seen time (`db/schema.ts:145`).
- `host_event_cursors` — event-log resume position per host (`db/schema.ts:162`).
- `store_identity` — identity of this store (`db/schema.ts:171`).
- `spaces` — named orch groupings (`db/schema.ts:176`).
- `agents` — agent identity, provenance, harness and pack membership (`db/schema.ts:185`).
- `agent_worktrees` — worktree placement and branch metadata (`db/schema.ts:214`).
- `agent_endings` — agent end state and actor (`db/schema.ts:222`).
- `agent_origins` — remote-host origin/provenance (`db/schema.ts:232`).
- `agent_status` — latest reported agent status (`db/schema.ts:242`).
- `agent_plexers` — agent's backend/plexer identity (`db/schema.ts:272`).
- `agent_hosts` — agent host and cwd intervals (`db/schema.ts:284`).
- `agent_processes` — agent process identity intervals (`db/schema.ts:298`).
- `agent_handles` — agent plexer handle intervals (`db/schema.ts:310`).
- `agent_spaces` — agent space membership intervals (`db/schema.ts:321`).
- `agent_tunings` — agent model/thinking intervals (`db/schema.ts:332`).
- `agent_forms` — agent harness-form intervals (`db/schema.ts:346`).
- `agent_leases` — ownership leases over time (`db/schema.ts:357`).
- `space_plexers` — plexer home for each space (`db/schema.ts:375`).
- `pack_plexers` — plexer home for each pack (`db/schema.ts:387`).
- `pack_intakes` — pack consent intervals for consuming a space queue (`db/schema.ts:399`).
- `tasks` — durable queued task and scope (`db/schema.ts:412`).
- `task_cancellations` — task cancellation event (`db/schema.ts:432`).
- `task_attempts` — claim and settlement history for each task (`db/schema.ts:438`).
- `grant_requests` — requests for human consent (`db/schema.ts:460`).
- `grant_request_params` — key/value parameters of grant requests (`db/schema.ts:468`).
- `grant_approvals` — approval and expiry (`db/schema.ts:474`).
- `grant_denials` — denial of a grant (`db/schema.ts:481`).
- `grant_spends` — recorded use of an approval (`db/schema.ts:486`).
- `command_locks` — active gated-command locks (`db/schema.ts:495`).
- `task_states` (view) — derived task state from cancellation, attempts and scope (`db/schema.ts:521`).
- `grant_states` (view) — derived grant state from approval/denial/spend rows (`db/schema.ts:571`).

## 10. Fan-out and join
- No code found that sends one prompt to several agents and joins their answers into one value. `broadcast` sends one steering text to multiple destinations and collects per-target delivery/refusal acknowledgements, not agent answers (`commands/control.ts:109-175`).
