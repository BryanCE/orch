## 1. Tools given to a spawned agent
- `orch_ask(question: string)` calls the daemon client's `postQuestion` (`question` RPC), then awaits its answer; common harness bridge registers it for pi and omp (via their pi-shaped composition), not Claude or Codex extensions. `packages/orch/src/agent/tools.ts:112-129`; `packages/orch/src/agent/harness-bridge.ts:26`; `packages/orch/extensions/pi/compose.ts:10-17`; `packages/orch/extensions/omp/index.ts:16-25`.
- `orch_agents(all_spaces?: boolean, allSpaces?: boolean)` calls `peer-view` (and peer summary/self lookups), and is registered by the common bridge for pi and omp. `packages/orch/src/agent/peers.ts:298-315`; `packages/orch/src/agent/peers.ts:28-36`.
- `orch_send(target: string, text: string, cross_spaces?: boolean, allSpaces?: boolean)` calls `peer-view` to resolve the target, then `message`; available only when a launch credential exists, through the common bridge for pi and omp. `packages/orch/src/agent/peers.ts:320-341`; `packages/orch/src/agent/peers.ts:184-201`.
- `orch_read(target: string, cross_spaces?: boolean, allSpaces?: boolean)` calls `peer-view` to resolve and read status/result from it; common bridge for pi and omp. `packages/orch/src/agent/peers.ts:344-372`; `packages/orch/src/agent/peers.ts:184-201`.
- `monitor(command: string, description: string, timeout_ms?: number)` starts a shell watch; `monitor_stop(id: string)` ends it. Registered only by the pi-shaped composition (pi and omp). `packages/orch/extensions/pi/monitor/index.ts:74-96`; `packages/orch/extensions/pi/monitor/index.ts:99-110`; `packages/orch/extensions/pi/compose.ts:10-17`.

## 2. `orch message` routes and refusals
- The `message` RPC request shape is:
  ```ts
  message: GOVERNANCE.extend({ from: nonBlank, target: nonBlank, text: nonBlank })
  ```
  `packages/orch/src/daemon/client/protocol.ts:636`.
- A worker may message its own spawner; two leading orchs may message each other; worker-to-worker, orch-to-worker, and other pairs are allowed subject to the space wall. Leading-orch mail is instead gated by `fleet.orch_peers`. `packages/orch/src/daemon/server/mail.ts:18-23,43-50`; `packages/orch/src/daemon/server/peer-orchs.ts:16-20`.
- RPC: `message`; it accepts mail into the outbox and awaits delivery acknowledgement. `packages/orch/src/daemon/server/handlers/write.ts:357-372`.
- Refusals: `from`, `target`, or `text` missing/blank: `"<name> is required"`; forged actor: `"mail goes out as its caller: <actor> cannot send as <from>"`; orch peers disabled: `"orch peers are off. The user turns them on with: orch settings fleet.orch_peers true"`; wall denial: the `checkWall` reason, or `"space wall denied the mail"`. `packages/orch/src/daemon/server/mail.ts:15-16,45-50,65-70`; `packages/orch/src/daemon/server/handlers/write.ts:357-362`; `packages/orch/src/daemon/server/peer-orchs.ts:14-15`.

## 3. Message delivery
- Direction picks `to_spawner` for a worker writing to its spawner, `to_orch` for leading orch-to-orch, otherwise `to_worker`. `prompt-unless-focused` becomes events only when the recipient pane is focused and it is watched; otherwise it becomes a prompt. `packages/orch/src/daemon/server/mail.ts:18-32`.
- Prompt delivery types `[from <name>] ` before the body (leading-orch mail also includes the `orch message` reply instruction); event delivery is a `MESSAGE <code> from <name>: <text>` line. `packages/orch/src/daemon/server/handlers/write.ts:348-355`; `packages/orch/src/settings/registry.ts:188-190,218`.
- Prompt goes through `deliverControl` as a steer; events go to the session stream. `packages/orch/src/daemon/server/handlers/write.ts:108-117`.
- The event text is capped by `monitor.summary_chars` (default 400); a cut message can be retrieved in full with `orch message read <code>`. `packages/orch/src/settings/schema.ts:102`; `packages/orch/src/settings/registry.ts:218`.

## 4. Life of a question
- `orch_ask` raises a question with the `question` RPC; it waits on the bridge answer waiter and returns `answer.text` to the tool caller. `packages/orch/src/agent/tools.ts:121-152`; `packages/orch/src/agent/daemon-client.ts:254-256`.
- ACP permission/request asks arrive at `SessionLinkEvents.onAsk`; orchd stores the ACP title and options in `questions`/`question_options`, publishes asking status, and returns an id. `packages/orch/src/daemon/server/session-agents.ts:83-85,118-127`.
- Claude Stop hook also raises a question when `trailingQuestion` finds one in the final assistant text; it reports the `question` RPC, then asking status. `packages/orch/extensions/claude/index.ts:115-120,130-135`.
- `questions`: `id`, `agent_id`, `question`, `asked_at`, nullable `answered_at`, nullable `answer`. `question_options`: `question_id`, `position`, `option_id`, `label`, `kind`. `packages/orch/src/db/schema.ts:47-67`.
- `question` RPC records harness-raised notices; `answer` RPC routes a user's answer to the agent. The bridge answer carries the answer text back to the waiting `orch_ask`; ACP receives the answer through its control/session flow. `packages/orch/src/daemon/server/handlers/lifecycle.ts:283-287`; `packages/orch/src/daemon/server/handlers/write.ts:374-400,408-418`; `packages/orch/src/agent/tools.ts:150-152`.

## 5. Can orchd ask the human without an agent asking?
- not found (`rg -n 'recordAgentQuestion|recordQuestion|"question"' packages/orch/src/daemon/server packages/orch/src/store`): question entry points are agent notices, the bridge tool, Claude hook, and ACP session asks; no independent orchd-to-human question function.

## 6. `mail` and `questions` settings
- `mail.to_spawner`: `MAIL_DELIVERIES` enum; default `prompt-unless-focused`; help: “Where mail a worker sends the agent that spawned it lands. prompt types it into that agent's input as it arrives, whoever is in the pane; prompt-unless-focused does the same except while the human is in that pane (a plexer window shows it now) and that agent has orch monitor or orch events open, when it goes there as a MESSAGE line instead; events always goes there and leaves the input alone.” `packages/orch/src/settings/schema.ts:97,180-184`; `packages/orch/src/settings/registry.ts:188`.
- `mail.to_worker`: `MAIL_DELIVERIES` enum; default `prompt`; help: “Where every other mail lands: an orch to its worker, worker to worker, a task result to its enqueuer. prompt types it into the recipient's input; prompt-unless-focused does the same except while the human is in that pane (a plexer window shows it now) and the recipient has orch monitor or orch events open; events publishes it as a MESSAGE line on orch monitor and orch events.” `packages/orch/src/settings/schema.ts:97,180-184`; `packages/orch/src/settings/registry.ts:189`.
- `mail.to_orch`: `MAIL_DELIVERIES` enum; default `prompt-unless-focused`; help: “Where orch message lands between two leading orchs. prompt-unless-focused, the default, types it into the other orch's input unless the human is in that pane (a plexer window shows it now) and it has orch monitor open, when it goes there as a MESSAGE line instead; prompt always types it in; events always goes to orch monitor.” `packages/orch/src/settings/schema.ts:97,180-184`; `packages/orch/src/settings/registry.ts:190`.
- `questions.renag_ms`: positive integer; default `120_000`; help: “How long an unanswered question waits before the daemon asks again, in milliseconds.” `packages/orch/src/settings/schema.ts:101,250-254`; `packages/orch/src/settings/registry.ts:215`.
- `questions.renag_limit`: positive integer; default `5`; help: “How many asking events the daemon emits before giving up.” `packages/orch/src/settings/schema.ts:101,250-254`; `packages/orch/src/settings/registry.ts:216`.
