# W2: lookups for the council feature

Context for every section. "Council" is a planned feature: several agents on different models
review one subject (a plan, a UI or an implementation). Each scores it and lists what would
improve it in one Markdown file of its own, and never changes the subject. The agent that
convened the council does the work between rounds, and the user sees each member's score and
decides whether to run another round. `council/README.md` is the full description. Nothing is
built yet. These tasks only read code and write one report file each.
Edit no source file. Run no `orch` command, no build, no test, no git command that writes.
Paths are from the repo root `/home/bryan/orch`.

Report file format for every section: markdown, one `##` heading per numbered question, each
fact as a bullet ending in `path:line`. Quote a signature or type in a code block when the
question asks for a shape. Write "not found" under a question whose answer is not in the code,
with the grep you ran.

## T5 Mail, agent tools, questions
Read `packages/orch/src/daemon/server/mail.ts`, `packages/orch/src/daemon/server/peer-orchs.ts`,
`packages/orch/src/daemon/server/peer-view.ts`, `packages/orch/src/daemon/server/handlers/peer.ts`,
`packages/orch/src/agent/tools.ts`, `packages/orch/src/agent/peers.ts`,
`packages/orch/src/recipient.ts`, `packages/orch/src/commands/orchs.ts`,
`packages/orch/src/store/question-rows.ts`, `packages/orch/extensions/pi/monitor/`,
`packages/orch/extensions/pi/index.ts`, `packages/orch/extensions/claude/index.ts`,
`packages/orch/extensions/codex/index.ts`, and the `mail` and `questions` sections of
`packages/orch/src/settings/schema.ts` and `packages/orch/src/settings/registry.ts`.
Write `council/findings/L5-mail-tools.md` answering:
1. Every tool orch gives a spawned agent (such as `orch_ask`): its name, its parameters, the
   RPC it calls, and which harnesses get it. One bullet per tool.
2. `orch message`: who may send to whom (worker to its orch, orch to orch, worker to worker,
   orch to its own worker). The RPC method, its request type quoted, and each refusal
   message quoted.
3. How a message reaches its recipient: as a monitor line or as a prompt. Quote the rule that
   picks one, the line format, and the length cap with the setting that holds it.
4. The life of a question: every way one is raised (a tool, an ACP permission request,
   anything else), the columns of `questions` and `question_options`, the RPC that raises it,
   the RPC that answers it, and what the asker receives when it is answered.
5. Can orchd code raise a question to the human with no agent asking? Quote the function, or
   write "not found".
6. Each key under `mail` and `questions` in settings: type, default, help line.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T6 Rounds: dispatch per form, run history
Read `packages/orch/src/daemon/server/handlers/write.ts`, `packages/orch/src/control/dispatch.ts`,
`packages/orch/src/daemon/server/session-agents.ts`, `packages/orch/src/backends/headless/index.ts`,
`packages/orch/src/daemon/server/handlers/host.ts`, `packages/orch/src/commands/agent-read.ts`,
`packages/orch/src/agent/read.ts`, `packages/orch/src/commands/results.ts`,
`packages/orch/src/commands/runs.ts`, `packages/orch/src/store/run-rows.ts`,
`packages/orch/src/daemon/server/status-report.ts`, `packages/orch/src/daemon/server/handlers/wait.ts`,
`packages/orch/src/commands/spawn/`, `packages/orch/src/commands/registry.ts`, and the
`headlessCmd` and `extractResult` members of each adapter in `packages/orch/src/adapters/`.
Write `council/findings/L6-rounds.md` answering:
1. What a `dispatch` does to the agent's conversation, for each case: `tui` with a bridge,
   `tui` without a bridge, `acp`, `server`, `oneshot`. Name the function and quote the lines
   that clear or keep the conversation.
2. A `oneshot` agent whose process has exited: what `orch dispatch` to it does. Quote the
   refusal message or the relaunch code.
3. How the result of a `oneshot` run is produced for each of pi, omp, claude, codex, opencode:
   what `extractResult` parses and from where.
4. Where a `dispatchId` is minted and how a reported result is tied to it.
5. An agent has finished three dispatches. How is the result of the first one read: the
   command, its flags as defined in `registry.ts`, the RPC. Quote the flag definitions of
   `result` and `runs`.
6. The shape `orch result --json` prints for one target. Quote the type.
7. `orch wait`: the states it accepts, and whether one call waits on several agents.
8. One `orch spawn` call with three names: can each name have its own harness and its own
   model? Quote the code that pairs `--harness` and `--model` values to names, and the
   `spawn` request type in `packages/orch/src/daemon/client/protocol.ts`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T7 Tool limits and the worker prompt
Read `packages/orch/src/worker-prompt.ts`, `packages/orch/src/policy/workers.ts`,
`packages/orch/src/policy/command-gate.ts`, `packages/orch/src/policy/command-paths.ts`,
`packages/orch/src/policy/spawner.ts`, `packages/orch/src/policy/agent-settings.ts`,
`packages/orch/src/types/adapter.ts`, each adapter in `packages/orch/src/adapters/`,
`packages/orch/extensions/`, and the `workers`, `agents`, `denied_commands`, `gated_commands`
and `locked_commands` sections of `packages/orch/src/settings/schema.ts` and
`packages/orch/src/settings/registry.ts`.
Write `council/findings/L7-tool-limits.md` answering:
1. Each key under `workers`: type, default, help line.
2. For each of pi, omp, claude, codex, opencode: how `workers.tools` and
   `workers.exclude_extensions` reach the launched process (argv or env). Quote the code.
3. For each harness: is there a launch flag or role that stops an agent from editing files or
   running shell commands? Quote it, or write "not found".
4. Every clause of the worker prompt and the condition that includes it. Quote each condition.
5. The `worker` field of the `dispatch` request: what it changes. Can a dispatch reach an
   agent with no worker header at all? Quote the code.
6. `denied_commands`, `gated_commands`, `locked_commands`: type, default, the roles they name,
   and the function that enforces each.
7. Is any of the above set per spawn or per agent, or only for the whole install? Quote the
   type that would carry a per-agent value, or write "not found".
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T8 Web UI
Read every file under `packages/web/src/routes/`, `packages/web/src/server/`,
`packages/web/src/hooks/`, `packages/web/src/lib/`, and `packages/web/src/components/` except
`components/ui/`. Skip `packages/web/src/themes/`.
Write `council/findings/L8-web.md` answering:
1. Every route: URL path, file, what it shows.
2. Every call the web server makes to orchd or to the `orch` CLI: function, RPC method or
   command.
3. How live updates reach the browser: stream or polling, and the files that carry it.
4. Every field an `AgentCard` shows. Does a result text, a cost or a token count appear
   anywhere in the UI?
5. `QuestionsPanel`: what it shows, and whether the user can answer from it.
6. The event kinds the UI renders. Quote the union or the switch in
   `packages/web/src/lib/daemon-events.ts`.
7. Using the queue page as the example: every file that carries it, from route to server
   function to the RPC call. One bullet per file.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T9 What orchd does when an agent finishes, and what a new verb touches
Read `packages/orch/src/daemon/server/event-bus.ts`, `packages/orch/src/daemon/server/events.ts`,
`packages/orch/src/daemon/server/status-events.ts`, `packages/orch/src/daemon/server/status-report.ts`,
`packages/orch/src/daemon/server/result-delivery.ts`, `packages/orch/src/daemon/server/work-loop.ts`,
`packages/orch/src/daemon/server/wake.ts`, `packages/orch/src/daemon/server/handlers/review.ts`,
`packages/orch/src/daemon/server/handlers/table.ts`, `packages/orch/src/daemon/server/handlers/peer.ts`,
`packages/orch/src/daemon/server/peer-orchs.ts`, `packages/orch/src/daemon/client/protocol.ts`,
`packages/orch/src/commands/registry.ts`, `packages/orch/src/commands/index.ts`,
`packages/orch/src/commands/orchs.ts`, `packages/orch/src/db/schema.ts`,
`packages/orch/src/store/home-rows.ts`, `packages/orch/scripts/check-layers.ts`.
Write `council/findings/L9-server-flow.md` answering:
1. The event bus: its type, the event union, and the publish and subscribe signatures, quoted.
2. What orchd does when an agent reports a result: the functions in call order from
   `acceptResultReport` to the delivery to the agent's spawner, with signatures.
3. What the spawner receives when its agent finishes: the exact text format and the path it
   travels (outbox row, monitor line, prompt). Quote the code that builds the text.
4. How the work loop learns that a claimed task finished: the function and what it compares.
5. Any server code that waits for several agents to finish and then acts once. Quote it, or
   write "not found".
6. With the `orchs` verb as the example: every file that carries it. Registry entry, command
   module, wiring in `commands/index.ts`, protocol method and schemas, handler table entry,
   handler, tests under `packages/orch/test/`. One bullet per file with its line.
7. With the `pack_intakes` table as the example: every file that names it. Schema, row
   module, readers, writers, migration under `packages/orch/drizzle/`, tests. One bullet per
   file with its line.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
