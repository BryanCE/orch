# ACP job: task index

Model: `MODEL.md`. Stopping point: the ten lines under "MVP" in `PRD.md`. Code maps:
`findings/`. Published protocol: `reference/` and `findings/acp-spec.md`.

Each wave is one file under `tasks/` with one `## T<n>` section per agent. A wave file is
written exactly, with every path and line checked, just before its wave is dispatched. Waves
marked "outline" below have their design fixed here and their exact file still to write.

Lines marked **Bryan** are commands only Bryan runs. The wave after one waits for his word.

`[x]` means typed and `bun check` clean. A wave is done only when its checkpoint is all `[x]`.

## Status on 2026-11-11

- [x] Lookup wave `tasks/L1-map.md`: eleven reports in `findings/`, protocol in `reference/`.
- [x] `PRD.md`, `MODEL.md`, `RULES.md`, this index.
- [x] Rule wording applied to `CLAUDE.md` and the architecture law.
- [x] Wave 1, checkpoint passed.
- [ ] Wave 2: typed and `bun check` clean. Blocked on `bun db:gen` and `bun db:reset`, then its tests.
- [ ] Waves 3 to 8: not started. Each still needs its exact task file.
- [ ] MVP lines 1 to 10 in `PRD.md`: none run yet.

Waves 1 and 2 are committed. Nothing is built, and the store is not migrated.

## Wave 1: foundations — `tasks/W1-foundations.md` — landed
No behavior change, no schema change.
- [x] T1 `src/types/form.ts`, `src/types/backend.ts`, the five `src/backends/*/index.ts`,
  `test/helpers/backend.ts`, `test/form.test.ts`. Forms, stdio kinds, `Backend.offers`.
- [x] T2 `src/types/adapter.ts`, `src/adapters/{pi,claude,codex}.ts`, `test/helpers/adapter.ts`.
  `AcpRole`, null on every adapter.
- [x] T3 `src/control/bridge-links.ts` becomes `agent-links.ts`. `BridgeLink` becomes `AgentLink`.

### CHECKPOINT 1 — passed
- [x] `bun check` clean over the tree.
- [x] 66 tests pass across the 11 touched test files. The status
row's `bridgeAttached` field keeps its name: it is a wire field, and only the registry was renamed.

## Wave 2: the store — `tasks/W2-store.md` — typed, not yet tested
One wave, so the schema is generated once. One agent types T1 and T2 in order, since both
edit `schema.ts`. A second types T3 after.
- [x] T1 `src/types/form.ts`, `src/db/schema.ts`, `src/store/interval-rows.ts`,
  `src/store/agent-view.ts`, `src/types/store.ts`. New interval table `agent_forms`. `setForm`.
  `AgentView.form`, null for an agent orch did not launch. Wave 4 makes every spawn state it.
- [x] T2 `src/types/question.ts`, `src/db/schema.ts`, `src/store/question-rows.ts`,
  `src/daemon/server/handlers/lifecycle.ts`. New table `question_options`. `recordQuestion`
  takes options and a `supersede` flag. `pendingQuestion` returns the oldest open row.
- [x] T3 `test/store-interval-rows.test.ts`, `test/daemon-renags-questions.test.ts`,
  `test/store-rebuild-schema.test.ts`, `test/helpers/views.ts`, and every test the two shape
  changes break.

`agent_plexers` is unchanged. An agent keeps its plexer for life.

- [ ] **Bryan:** `bun db:gen`, then `bun db:reset`. `packages/orch/drizzle/` is empty, so
  `db:gen` writes one migration that creates every table, and a store built from the old
  chain cannot take it. `db:reset` backs the store up and rebuilds it.

### CHECKPOINT 2
- [x] `bun check` clean over the tree with all of wave 2 in.
- [ ] The touched store tests. They cannot pass until Bryan's migration exists.

## Wave 3: the ACP module — outline
- [ ] **Bryan first:** add `@agentclientprotocol/sdk` to `packages/orch` with `bun add`. The docs
say version 2.6.0 replaces `ClientSideConnection` with a fluent `client()` function, so the
first task reads the installed type declarations before any code is designed.
- [ ] T0 lookup: the `client()` API, its handler registration, `ndJsonStream`, and the request
  and notification types, from `node_modules/@agentclientprotocol/sdk`, into
  `findings/acp-sdk.md`.
- [ ] T1 `src/acp/session.ts`. `AcpSession` over a pair of streams: `initialize` with no `fs` and
  no `terminal` capability, `session/new`, `session/load`, `session/resume`, `session/prompt`,
  `session/cancel`, `session/set_mode`, `session/set_config_option`, `session/close`. It
  exposes what the agent offered.
- [ ] T2 `src/acp/entries.ts`. `session/update` variants to orch session entries: message and
  thought chunks coalesced, tool call and its updates, plan. `StopReason` to an orch outcome.
- [ ] T3 `src/acp/link.ts`. An `AgentLink` over an `AcpSession`: `dispatch` and `steer` become
  prompts, a steer during a turn waits for the turn to end, `answer` settles a permission
  request, `model` sets the model config option. Callbacks out: entry, turn ended, permission
  asked, row applied.
- [ ] T4 `test/helpers/fake-acp-agent.ts` and `test/acp-*.test.ts`. A scripted agent on in-memory
  streams. Cases: a full turn, cancel, two permission requests open at once, a steer mid-turn,
  load with replay.
- [ ] T5 `scripts/check-bridge.ts`, `scripts/check-layers.ts`, `test/check-bridge.test.ts`. A rule
  that fails on an ACP method name or the SDK import outside `src/acp/`. `src/acp/` joins
  `SERVER`.

### CHECKPOINT 3
`bun check`. `bun test` on the `acp-*` and `check-*` tests.

## Wave 4: orchd holds an ACP agent — outline
The first visible result: a Codex agent over ACP in `orch status`.
- [ ] T1 `src/types/pipes.ts`, `src/pty/node-pipes.ts`, `src/daemon/server/held-pipes.ts`,
  `test/helpers/fake-pipes.ts`. A pipes provider beside the PTY provider, and a holder that
  keeps each process by agent id, with its pid, streams and exit.
- [ ] T2 `src/daemon/server/held.ts`, `src/types/pty.ts`. A held screen can be fed by a PTY or by
  a writer orchd owns, so an agent on pipes still has a screen to attach to.
- [ ] T3 `src/adapters/codex.ts`. The `acp` role: argv `codex-acp`, its environment,
  `sharesSessions` from Bryan's check.
- [ ] T4 `src/daemon/server/spawn/plan.ts`, `src/commands/spawn/flags.ts`,
  `src/daemon/client/protocol.ts`, `src/settings/schema.ts`, `src/settings/registry.ts`,
  `src/commands/registry.ts`, `src/types/store.ts`, `src/store/spawn-registration.ts`. `--form`,
  `defaults.forms`, `form` in the spawn params and in the spawn registration, and the five
  steps under "Choosing form and backend at spawn" in `MODEL.md`. Every spawn writes its form.
- [ ] T5 `src/backends/held/index.ts`, `src/daemon/server/spawn/index.ts`,
  `src/daemon/server/spawn/viewers.ts`, `src/daemon/server/handlers/lifecycle.ts`.
  `startHeldAgent` takes the form. orchd holds local agents. A viewer pane opens for any agent
  whose backend has no placement role.
- [ ] T6 `src/daemon/server/acp-agents.ts`. Start the binding on pipes, open the session, attach
  the link, and wire its callbacks: `acceptStatusReport`, `acceptResultReport`,
  `recordQuestion`, the session log, the transcript screen. Store the session id.
- [ ] T7 tests on the fake pipes and the fake ACP agent: spawn to `done`, result text stored.

- [ ] **Bryan:** `bun run build:orch:dev`, install `codex-acp`, then MVP line 1 and line 2.

## Wave 5: control — outline
- [ ] T1 `src/types/control.ts`, `src/control/dispatch.ts`,
  `src/daemon/server/handlers/drive.ts`. `abort` is a `ControlAction`. `abortHere` calls the
  dispatcher. Keys stay the fallback.
- [ ] T2 `src/control/dispatch.ts`. The channel comes from the agent's form: a form with a link
  pushes down the link, else today's order.
- [ ] T3 `src/daemon/server/handlers/table.ts`, `src/daemon/server/outbox.ts`. The body of the
  `ack` handler becomes a plain function the ACP link calls when it applies a row.
- [ ] T4 `src/daemon/server/handlers/write.ts`, `src/commands/` for `answer` and `questions`.
  Options in the question view. `orch answer <agent> <n>` picks an option.
- [ ] T5 tests: `control-dispatch`, `answer-dispatch`, `outbox-ack`, new abort cases.

- [ ] **Bryan:** build, then MVP lines 3 and 4.

## Wave 6: reading and far hosts — outline
- [ ] T1 `src/agent/session-log.ts`, `src/agent/read.ts`. orchd's session log as JSONL of session
  entries, and the one reader taking it for a form whose transcript orchd writes.
- [ ] T2 `src/daemon/client/protocol.ts`, `src/daemon/server/handlers/lifecycle.ts`,
  `src/hosts/link.ts`. `spawn-headless` carries the form, so a linked host holds an ACP agent.
- [ ] T3 `src/commands/status/`, `src/daemon/server/fleet-rows.ts`. The form column.
- [ ] T4 tests with `startFarOrchd`.

- [ ] **Bryan:** build on both hosts, then MVP lines 5 and 6.

## Wave 7: switching form — outline
- [ ] T1 `src/types/adapter.ts`, the adapters. A resume argv for the `tui` form by session id.
- [ ] T2 `src/daemon/server/handlers/relaunch.ts`, `src/commands/lifecycle/`,
  `src/daemon/client/protocol.ts`. `orch restart --form`. To `tui`: close the session, start
  the PTY with the resume argv. To `acp`: end the PTY, `session/resume` or `session/load`.
  Refuse when the binding lacks session sharing or load, naming which.
- [ ] T3 tests on fake PTY and fake ACP agent.

- [ ] **Bryan:** build, then MVP line 7.

## Wave 8: Claude, doctor, setup — outline
Starts when the four checks in `PRD.md` are recorded.
- [ ] T1 `src/adapters/claude.ts`, `extensions/claude/`. The `acp` role, and the launch
  environment that keeps the hook shim from reporting state in `acp` form.
- [ ] T2 `src/shared/prerequisites.ts`, `src/daemon/server/doctor/`. Each binding as a
  prerequisite of its adapter's `acp` role. Doctor runs `initialize` against each installed
  binding and reports its version and protocol version.
- [ ] T3 `src/setup/`. Setup offers to install bindings for the harnesses chosen.

- [ ] **Bryan:** build, then MVP lines 8, 9 and 10. The job ends here.
