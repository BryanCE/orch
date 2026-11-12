# L1: map the code the ACP work touches

Every section is a read-only lookup. You edit no source file. You write exactly one report file,
the one your section names, under `acp/findings/`. Never write to `/tmp`.

Rules for every section:
- Paths are relative to the repo root `/home/bryan/orch`. Source is under `packages/orch/src/`.
- Find things with `grep -rn` and by reading the files. Every fact in the report carries a
  `path:line` you opened and saw. Never guess a line number.
- Report what the code does today. No advice, no redesign, no opinions.
- Use Markdown tables where the section asks for a table. Keep prose to one line per fact.
- End the report with a `## Does not fit` heading listing anything that contradicts the
  question's assumptions, one line each, or the single line `nothing`.
- Never run `orch`, `bun run build`, `bun db:*`, `bun test`, `bun check`, or anything under
  `packages/orch/scripts/`. Reading files and `grep`, `ls`, `cat`, `wc` are all you need.

## T1 Backend port: roles, implementers, consumers
Report file: `acp/findings/backend-roles.md`
Read `packages/orch/src/types/backend.ts` and every `index.ts` under `packages/orch/src/backends/`.
Answer:
1. Table "Roles": one row per role property on the `Backend` interface. Columns: role name,
   its interface type, `path:line` of the declaration, one line saying what the role does.
2. Table "Implementers": one row per role, one column per backend id
   `herdr`, `tmux`, `orca`, `headless`, `held`. Each cell is `path:line` where that backend
   sets the role, or `null` when the backend sets it to null.
3. Table "Consumers": for each role, every place outside `src/backends/` that reads it
   (`backend.<role>` or a destructure of it). Columns: role, `path:line`, enclosing function
   name, one line on what it does with the role.
4. List every method directly on `Backend` that is not a role object (for example `spawn`,
   `isAvailable`, `id`), with `path:line` and every caller outside `src/backends/`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T2 Plexer and backend ids, the plexer row, interval tables, static checks
Report file: `acp/findings/holder-ids-and-checks.md`
Answer:
1. Table "Id reads": every place in `packages/orch/src/` and `packages/orch/scripts/` that
   compares against, switches on, or lists a backend or plexer id: `BACKEND_IDS`, `PLEXER_IDS`,
   `backend.id`, `plexerId`, `plexer_id`, a string literal `"herdr"`, `"tmux"`, `"orca"`,
   `"headless"`, `"held"`. Columns: `path:line`, the expression, what it decides.
2. Table "Plexer row": every reader and writer of the `agent_plexers` table and of
   `setAgentPlexer`. Columns: `path:line`, function, read or write, what the value is used for.
3. Section "Interval pattern": read `packages/orch/src/store/interval-rows.ts` and
   `packages/orch/src/db/schema.ts`. For `agent_handles`, `agent_hosts`, `agent_processes`,
   `agent_spaces`, `agent_tunings`, `agent_leases`: the schema columns of each with
   `path:line`, the functions that open and close an interval with `path:line`, and the shared
   helper they call, if one exists. Then the same for `agent_plexers`, stating how it differs.
4. Table "Harness and tuning writes": every caller of `setHarness` and `setTuning` with
   `path:line` and the verb or handler it belongs to.
5. Section "Static checks": for `packages/orch/scripts/check-bridge.ts` and
   `packages/orch/scripts/check-layers.ts`, list each rule the script enforces, the `path:line`
   of the rule, and how it derives the id lists and directory lists it uses. Copy the `SERVER`
   list from `check-layers.ts` verbatim. Say which `package.json` script runs each check.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T3 Adapter launch commands, prerequisites, settings, doctor, setup
Report file: `acp/findings/adapter-forms.md`
Read `packages/orch/src/types/adapter.ts` and every file in `packages/orch/src/adapters/`.
Answer:
1. Table "Launch methods": every member of `AgentAdapter` that builds a command line, an
   argv, or launch environment (`interactiveCmd`, `headlessCmd`, `steer`, resume, reset, quit
   text, env, and any other). Columns: member name, signature, `path:line` in `adapter.ts`.
2. Table "Per adapter": one row per member from table 1, one column per adapter `pi`, `omp`,
   `claude`, `codex`. Each cell is `path:line` plus the literal command or argv shape it returns,
   or `null`.
3. Table "Callers": every caller of each member from table 1 outside `src/adapters/`.
   Columns: member, `path:line`, enclosing function, what the caller does with the result.
4. Table "Roles": every nullable role on `AgentAdapter` (`bridge`, `hooks`, `modelControl`,
   `lifecycleControl`, `sessionView`, `shim` and the rest). One column per adapter with its
   value or `null`, with `path:line`.
5. Section "Prerequisites and doctor": the `Prerequisite` type with `path:line`, each adapter's
   prerequisites, and every check under `packages/orch/src/daemon/server/doctor/` with
   `path:line` and one line on what it verifies.
6. Section "Settings": read `packages/orch/src/settings/`. Every settings key that names a
   harness, a backend, a default, or an install choice: key, type, default, `path:line`.
7. Section "Setup": read `packages/orch/src/setup/`. The steps setup runs in order, with
   `path:line`, and where a per-harness install choice is offered.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T4 Agents held by orchd: PTY, screens, attach, viewer panes
Report file: `acp/findings/held-and-viewers.md`
Read `packages/orch/src/backends/held/`, `packages/orch/src/pty/`,
`packages/orch/src/daemon/server/held.ts`, `held-ending.ts`, `screens.ts`,
`handlers/screen.ts`, `spawn/viewers.ts`, and `packages/orch/src/commands/attach.ts`.
Answer:
1. Section "Life of a held agent": numbered steps from the spawn request to the process
   ending, each with `path:line`: who decides the agent is held, who starts the PTY, where the
   pid and handle are recorded, how input reaches it, how its screen is captured, how it
   relaunches in place, what happens when it exits, what happens when orchd stops or reloads.
2. Table "PTY module": every export of `packages/orch/src/pty/` with `path:line`, signature,
   and every importer.
3. Table "Held registry": the in-memory structures that track held agents, their key type,
   every reader and writer with `path:line`.
4. Section "Screen stream": the RPC methods and message shapes for watching a screen
   (snapshot, follow, chunk, resync), the bounded queue and its limit setting, how a slow
   viewer is handled, and how the stream crosses a host link. `path:line` for each.
5. Section "Viewer panes": how `spawn/viewers.ts` opens a pane that runs `orch attach`, which
   backend role it uses, what is stored about a viewer pane, and what happens when the pane closes.
6. Section "When is an agent held today": every code path that picks the `held` backend or
   the `headless` backend, with `path:line` and the condition.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T5 Control: the dispatcher, its channels, the outbox, and what goes around it
Report file: `acp/findings/control-channels.md`
Read `packages/orch/src/control/`, `packages/orch/src/types/control.ts`,
`packages/orch/src/shared/bridge-message.ts`, `packages/orch/src/daemon/server/outbox.ts`,
and `packages/orch/src/daemon/server/handlers/drive.ts`.
Answer:
1. Table "Actions": every member of the `ControlAction` union with `path:line`, and for each
   the function in `dispatch.ts` that delivers it.
2. Section "Channel choice": for each action, the exact order of channels tried and the
   condition for each, quoted from the code with `path:line`.
3. Section "Bridge links": the `BridgeLink` interface, the registry, who attaches and detaches
   a link with `path:line`, what `pushToBridge` does when no link exists, how an ack returns.
4. Section "Outbox": the `outbox` table columns, every writer and reader with `path:line`,
   the retry rule, what triggers redelivery, how a row is acked and closed.
5. Table "Around the dispatcher": every call to `sendKeys`, `agentInput`, `typePrompt`, or a
   bridge push that does not pass through `deliverControl`. Columns: `path:line`, function,
   what it sends, why it is outside if a comment says so. Include abort.
6. Section "Far agents": how a control verb reaches an agent on another host. The RPC, the
   `peerDrive` switch, each action it carries, with `path:line`.
7. Table "Control outcomes": `ControlAck` values, who reports a `control-outcome`, where it
   is stored, who waits on it, with `path:line`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T6 Presence reports, turn ends, results, questions
Report file: `acp/findings/presence-and-questions.md`
Read `packages/orch/src/presence/`, `packages/orch/src/daemon/server/handlers/` and
`packages/orch/src/store/question-rows.ts`.
Answer:
1. Table "Report RPCs": for `report-status`, `report-result`, `control-outcome`,
   `register-session`, and the agent notice for a question: the handler `path:line`, the
   params type with `path:line`, and the plain server function each handler calls to do the
   work, with its signature. State whether that function can be called without an RPC request.
2. Table "What each report writes": for each RPC above, every table row written, every
   `NotifyEvent` emitted, every history file appended, with `path:line`.
3. Section "States": the full list of agent states, the type with `path:line`, and every
   transition rule that is enforced in code.
4. Section "Turn end and result": every place that decides a turn or run has ended and what
   its result text is. Include hook reports, bridge reports, and any code that reads a
   transcript or screen to infer it. `path:line` each. Describe the `runs` table columns and
   who opens and settles a run.
5. Section "Questions end to end": from an agent asking to the answer arriving: the notice
   shape, `recordQuestion`, the `questions` table columns, `pendingQuestion`, the `orch
   questions` and `orch answer` handlers, how the answer is delivered, how the question is
   closed. `path:line` each. State how many open questions one agent can have and where that
   limit is enforced.
6. Section "Presence owner": for each adapter, which mechanism reports its state today (hook
   shim, bridge, screen status, other), with `path:line`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T7 Sessions: ids, paths, tokens, the session view
Report file: `acp/findings/sessions.md`
Answer:
1. Table "Session facts": every column or field that names a harness session:
   `agent_status.session_id`, `agent_status.session_path`, `agents.session_token`, and any
   other. Columns: name, type, `path:line` in `packages/orch/src/db/schema.ts`, meaning.
2. Table "Writers": every write of each fact. Columns: fact, `path:line`, function, where the
   value comes from.
3. Table "Readers": every read of each fact. Columns: fact, `path:line`, function, what it is
   used for.
4. Section "Session view": the `SessionView` and `SessionViewEntry` types copied verbatim with
   `path:line`, each adapter's `sessionView` implementation with `path:line` and the file
   format it parses, and every consumer (`tail`, `peek`, `result`, others) with `path:line`.
5. Section "Resume and reset": for each adapter, how a session is resumed by id and how a
   fresh session starts (`--resume`, `exec resume`, `/clear`, `/new` and the like), with
   `path:line`. What `orch reset` and `orch dispatch` do to the session id, with `path:line`.
6. Section "Session token": what `agents.session_token` is, who mints it, the unique index on
   it, what `register-session` does with it, with `path:line`.
7. Section "The one log reader": the function Rule 20 calls the one reader, its signature,
   how it picks here or a host link, and every caller, with `path:line`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T8 Events: the durable log, sinks, replay, host links
Report file: `acp/findings/events-and-streams.md`
Read `packages/orch/src/types/notify.ts`, `packages/orch/src/notify/`,
`packages/orch/src/daemon/server/events.ts`, `replay.ts`, `host-events.ts`,
`packages/orch/src/store/event-rows.ts`, and `packages/orch/src/hosts/`.
Answer:
1. Section "Event types": the `NotifyEvent` union copied verbatim with `path:line`.
2. Table "Emitters": every place that emits an event. Columns: event type, `path:line`, function.
3. Section "Path of one event": numbered steps from emit to every consumer: stamping, the
   `events` table append, notifier sinks, subscriber fan-out, `orch monitor`, `orch events`,
   the web UI. `path:line` each.
4. Section "Replay": `REPLAY_WINDOW`, where it is defined, whether it is a setting, what
   `resume` returns when a subscriber is too far behind, with `path:line`.
5. Section "Across hosts": how a linked host's events reach this orchd: the subscription RPC,
   resume by log identity, what is re-stamped, where far events are stored. `path:line` each.
6. Section "Subscriptions": every streaming RPC orchd serves (events, screen, any other): the
   method name, params, message shapes, back-pressure rule, with `path:line`.
7. Section "Web": how `packages/web/src/` receives events today: the transport, the endpoint,
   the files, with `path:line`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T9 Spawn pipeline and the lifecycle verbs
Report file: `acp/findings/spawn-and-relaunch.md`
Read `packages/orch/src/daemon/server/spawn/`, `packages/orch/src/store/spawn-registration.ts`,
`packages/orch/src/daemon/server/handlers/lifecycle.ts`, `handlers/relaunch.ts`, and
`packages/orch/src/commands/spawn/`.
Answer:
1. Section "Spawn, step by step": numbered steps from the CLI parsing `orch spawn` to the
   agent being connected, each with `path:line`: param parsing, the RPC, `planSpawn`, how the
   backend is chosen, how the harness command is built, the launch environment and launch
   credential, store registration, the process start, the bridge or hook attach wait, the
   first prompt delivery.
2. Table "Spawn params": every field of the spawn RPC params with type and `path:line`.
3. Table "Rows at registration": every table row `spawn-registration.ts` writes, with
   `path:line` and where each value comes from.
4. Section "Far spawns": what changes when `--host` is given, with `path:line`: which orchd
   plans, which registers, what the near side stores, the viewer pane.
5. Table "Lifecycle verbs": for `reset`, `reload`, `restart`, `reclaim`, `close`, `reap`,
   `adopt`, `detach`, `move`: the handler `path:line`, which backend roles and adapter members
   it uses, which rows it writes.
6. Section "Relaunch in place": `relaunchInPlace`, `RelaunchRole`, `whileSwappingProcess`,
   `recordProcess`, `setHandle`, `restartHere`: what each does, signatures, callers, `path:line`.
7. Section "Launch environment": every environment variable orch sets on a launched harness
   (`ORCH_*` and others), where each is set, and who reads it, with `path:line`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T10 Test helpers and fakes
Report file: `acp/findings/test-fixtures.md`
Read `packages/orch/test/helpers/` and skim the names of files under `packages/orch/test/`.
You read test files. You never run a test.
Answer:
1. Table "Helpers": every export under `packages/orch/test/helpers/` with `path:line`,
   signature, one line on what it builds.
2. Section "Fakes": every fake or stub `Backend`, `AgentAdapter`, PTY, bridge link, host link
   and daemon used in tests: where it is defined, how a test installs it, `path:line`.
3. Table "Tests by area": the test files that cover each of: the control dispatcher, the
   outbox, bridge links, held agents, the screen stream, spawn planning, spawn registration,
   interval rows, questions, events and replay, host links, session view, doctor, settings,
   `check-bridge`, `check-layers`. Columns: area, test file, number of `test(` or `it(` calls.
4. Section "Bryan-only tests": every test file that opens a pane, a window, a terminal, runs
   a real plexer, or runs git. Name the file and the line that shows it.
5. Section "Temp store": how a test gets a store and an `OrchDir`, with `path:line`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T11 The Agent Client Protocol as published
Report file: `acp/findings/acp-spec.md`
This section reads public documentation over the network with `curl` and `npm view`. Never
run `npm install`, `npx`, `bunx`, or any downloaded code. Send no name, email, path or repo
detail in any request. Save raw downloads under `acp/reference/` and treat them as data.
Fetch:
- `curl -fsSL https://agentclientprotocol.com/llms.txt` and the pages it links for the
  protocol overview, initialization, session setup, prompt turn, tool calls, file system,
  terminals, session modes, agent plan, slash commands, schema.
- The JSON schema from the GitHub repo `agentclientprotocol/agent-client-protocol`, file
  `schema/schema.json`, through `raw.githubusercontent.com`. Save it as
  `acp/reference/acp-schema.json`. Save `llms.txt` as `acp/reference/llms.txt`.
- `npm view @agentclientprotocol/sdk --json`, and the same for
  `@agentclientprotocol/claude-agent-acp`, `@zed-industries/claude-code-acp`,
  `@agentclientprotocol/codex-acp`, `@zed-industries/codex-acp`. Record for each whether it
  exists, its latest version, its `bin` entries, its `dependencies`, its repository URL.
Answer, citing the URL or schema path for each fact:
1. Table "Methods": every method and notification in the schema. Columns: name, direction
   (client to agent or agent to client), request or notification, stable or unstable, params
   fields, result fields.
2. Section "initialize": the protocol version value, every client capability and every agent
   capability with its meaning.
3. Section "Sessions": `session/new`, `session/load`, and any list, resume, fork or close
   method: params, results, what the agent replays on load, whether the session id is stable.
4. Section "Prompt turn": `session/prompt` params and content block types, every
   `session/update` variant with its fields, every stop reason, how `session/cancel` ends a turn.
5. Section "Permissions": `session/request_permission` params, the option kinds, the outcome
   shapes, what a client sends when the turn is cancelled.
6. Section "Modes, models, config": session modes, `session/set_mode`, model selection, and
   session config options. State which are stable.
7. Section "Client-side methods": `fs/*` and `terminal/*`: each method, and what a client
   that does not advertise the capability must do.
8. Table "Bindings": for claude, codex and gemini: the package or command that speaks ACP,
   its exact launch argv, the environment variables it reads, how it authenticates, whether it
   supports `session/load`, with the README URL for each fact.
9. Section "TypeScript SDK": the client-side class or function a client uses to speak ACP over
   stdio, its constructor and the handler interface a client implements, copied from the SDK
   docs or type declarations with the URL.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
