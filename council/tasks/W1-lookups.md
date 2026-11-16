# W1: lookups for the council feature

Context for every section. "Council" is a planned feature: one prompt is sent to several
models from different providers, each drafts, critiques and scores one shared plan document
over a fixed number of rounds, and the user sees each model's score and decides whether to run
another round. Nothing is built yet. These tasks only read code and write one report file each.
Edit no source file. Run no `orch` command, no build, no test. Paths are from the repo root
`/home/bryan/orch`.

Report file format for every section: markdown, one `##` heading per numbered question, each
fact as a bullet ending in `path:line`. Quote a signature or type in a code block when the
question asks for a shape. Write "not found" under a question whose answer is not in the code,
with the grep you ran.

## T1 How a skill ships
Read `packages/orch/skills/`, `packages/orch/package.json`, `packages/orch/src/setup/`,
`packages/orch/src/daemon/server/setup.ts`, `packages/orch/src/commands/setup.ts`,
`packages/orch/src/commands/doctor.ts`, `packages/orch/src/daemon/server/doctor/`,
`packages/orch/scripts/`.
Write `council/findings/L1-skills.md` answering:
1. Every place the string `skills` or the path `skills/orch` is read, copied, linked or listed:
   build scripts, `files` in package.json, setup, doctor. One bullet per site.
2. For each harness (pi, omp, claude, codex, opencode): the directory the orch skill is
   installed into and the function that installs it.
3. Is the set of shipped skills a list, a directory scan, or the single name `orch` written
   in code? Quote the code that decides it.
4. What doctor checks about an installed skill, and the message it prints on a mismatch.
5. What `packages/orch/skills/orch/evals/` holds and which script runs it.
6. Every file that would need an edit to ship a second skill directory
   `packages/orch/skills/council/`. One bullet per file with the line to change.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T2 Settings, models, harnesses, forms
Read `packages/orch/src/settings/schema.ts`, `packages/orch/src/settings/registry.ts`,
`packages/orch/src/settings/schema-tree.ts`, `packages/orch/src/commands/spawn/models.ts`,
`packages/orch/src/commands/models.ts`, `packages/orch/src/adapters/registry.ts`,
`packages/orch/src/adapters/model-catalogue.ts`, and each adapter in
`packages/orch/src/adapters/`.
Write `council/findings/L2-settings-models.md` answering:
1. The top-level sections of the settings type, one bullet each with a one-line purpose.
2. The four things one setting needs to exist (schema entry, `SETTINGS_DEFAULTS` entry,
   registry help line, required type). Show all four for one existing array-valued setting
   and one existing object-valued setting, quoted.
3. Every setting that names a model, a harness, a form or a thinking level. Quote its type
   and its default.
4. How a `--model` value such as `luna:high` becomes a harness, a provider model id and a
   thinking level: the functions in order, with signatures.
5. The harness adapter interface: quote the type. For each of pi, omp, claude, codex,
   opencode list the forms it declares (`tui`, `oneshot`, `acp`, `server`) and the
   capabilities it declares.
6. How the model catalogue is filled per harness, where it is stored, and what the `picker`
   and `default` marks in `orch models` come from.
7. Any existing setting or type that holds a list of models, or a named group of
   harness plus model pairs. Quote it, or write "not found".
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T3 Fan-out, results, queue, review
Read `packages/orch/src/commands/registry.ts`, `packages/orch/src/commands/spawn/`,
`packages/orch/src/commands/delivery.ts`, `packages/orch/src/commands/results.ts`,
`packages/orch/src/commands/events.ts`, `packages/orch/src/commands/queue.ts`,
`packages/orch/src/commands/review.ts`, `packages/orch/src/commands/control.ts`,
`packages/orch/src/queue.ts`, `packages/orch/src/groups.ts`,
`packages/orch/src/worker-prompt.ts`, `packages/orch/src/daemon/server/work-loop.ts`,
`packages/orch/src/daemon/server/result-delivery.ts`,
`packages/orch/src/daemon/server/outbox.ts`, `packages/orch/src/store/task-rows.ts`,
`packages/orch/src/store/run-rows.ts`, `packages/orch/src/store/outbox-rows.ts`,
`packages/orch/src/db/`.
Write `council/findings/L3-fanout-results.md` answering:
1. Every command in the registry: name, one-line summary, the file that implements it.
2. The RPC methods `spawn`, `dispatch`, `result`, `wait`, `pipe`, `broadcast` and the queue
   verbs call on orchd: method name, request type, response type, handler file.
3. What a result is: the type an agent reports through `report-result`, the table it lands
   in with its columns, and what `orch result <a> <b>` prints for two agents. Is a result
   free text only, or can it carry structured fields?
4. The task queue: the `tasks` table columns, how a task is claimed by an idle agent, and
   what `work-loop.ts` does on each tick.
5. `orch pipe`: what it moves from one agent to another and how.
6. `orch review`: what it collects and what it prints.
7. `groups.ts`: what a group is, who creates one, which commands take one.
8. `worker-prompt.ts`: the full text that orch wraps around a dispatched task, quoted.
9. Every table in the schema under `packages/orch/src/db/`: name and one-line purpose.
10. Any code that sends one prompt to several agents and joins their answers into one
    value. Quote it, or write "not found".
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T4 ACP, forms, held and headless agents
Read `packages/orch/src/acp/`, `packages/orch/src/daemon/server/acp-driver.ts`,
`packages/orch/src/daemon/server/acp-probe.ts`, `packages/orch/src/daemon/server/held.ts`,
`packages/orch/src/daemon/server/held-ending.ts`, `packages/orch/src/backends/backend.ts`,
`packages/orch/src/backends/held/`, `packages/orch/src/backends/headless/`,
`packages/orch/src/control/dispatch.ts`, `packages/orch/src/control/agent-links.ts`,
`packages/orch/src/daemon/server/spawn/`, `acp/README.md`, `acp/MODEL.md`.
Write `council/findings/L4-acp-forms.md` answering:
1. The four forms (`tui`, `oneshot`, `acp`, `server`): where the type is declared, what stdio
   each needs, and which backends can hold each. Quote the matching code.
2. For each harness, the argv and env orch uses to start it in the `acp` form, and which
   harnesses have no `acp` role.
3. The life of one ACP prompt: the functions from an orchd dispatch to the session prompt
   call, and from the session's final message to the stored result. Signatures in order.
4. What orchd writes to an ACP agent's log and how `orch result` reads the answer back.
5. Whether one ACP session can take a second prompt and keep its conversation, and the
   function that does it. Whether `orch dispatch` clears the conversation for an ACP agent.
6. What the `oneshot` form is, which harnesses have it, and how its output is captured.
7. With no plexer present, the exact path a `spawn --form acp --prompt` takes, and whether
   any pane or terminal is needed.
8. The channel types the control dispatcher picks between, and the rule that picks one per
   action. Quote the type and the selection function.
9. Whether a harness's permission or approval request over ACP reaches the user, and how
   (`orch questions`, auto-approve, or refused).
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
