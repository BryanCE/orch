# ACP job: task index

Model: `MODEL.md`. Stopping point: the ten lines under "MVP" in `PRD.md`. Code maps:
`findings/`. Published protocol: `reference/` and `findings/acp-spec.md`.

Each wave is one file under `tasks/` with one `## T<n>` section per agent. A wave file is
written exactly, with every path and line checked, just before its wave is dispatched. Waves
marked "outline" below have their design fixed here and their exact file still to write.

Lines marked **Bryan** are commands only Bryan runs. The wave after one waits for his word.

`[x]` means typed and `bun check` clean. A wave is done only when its checkpoint is all `[x]`.

## Task files, in the order the work ran

- `tasks/L1-map.md`: the lookup wave. Eleven reports in `findings/`.
- `tasks/W1-foundations.md`: forms, stdio kinds, the null `acp` role, the link registry rename.
- `tasks/W2-store.md`: the `agent_forms` interval table and the `question_options` table.
- `tasks/P1-parallel.md`: ten sections that need no ACP SDK, and the SDK lookup.
- `tasks/P2-adapters-and-review.md`: the resume role, the codex `acp` role, and two reviews.
- `tasks/P3-acp-module.md`: `src/acp/session.ts` and `src/acp/entries.ts`.
- `tasks/P4-links-and-review.md`: the link declares what it takes, answers pick an option,
  bindings as prerequisites, and two reviews.
- `tasks/L2-wiring-lookup.md`: the lookup of what wiring a session into orchd builds on.
- `tasks/P5-link-and-wiring.md`: the ACP link, the entry renderer, and orchd holding an ACP agent.
- `tasks/P6-finish.md`: wiring review fixes, the viewer for a held agent here, switching form,
  these docs, and the review of switching form.
- `tasks/P7-far-and-setup.md`: the far host ACP test, and setup installs a missing binding.

## Status

- [x] Lookup wave `tasks/L1-map.md`: eleven reports in `findings/`, protocol in `reference/`.
- [x] `PRD.md`, `MODEL.md`, `RULES.md`, this index.
- [x] Rule wording applied to `CLAUDE.md` and the architecture law.
- [x] Wave 1, checkpoint passed.
- [ ] Wave 2: typed and `bun check` clean. Blocked on `bun db:gen` and `bun db:reset`, then its tests.
- [x] Waves 3, 4 and 5: typed. Each is listed below with the P section that did it.
- [ ] Wave 6: typed except its far host tests.
- [ ] Wave 7: typed except what restart prints, its test through the handler, and its review.
- [ ] Wave 8: not started. It still needs its exact task file.
- [ ] MVP lines 1 to 10 in `PRD.md`: none run yet.

Nothing is built, and the store is not migrated.

## Wave 1: foundations, `tasks/W1-foundations.md`, landed
No behavior change, no schema change.
- [x] T1 `src/types/form.ts`, `src/types/backend.ts`, the five `src/backends/*/index.ts`,
  `test/helpers/backend.ts`, `test/form.test.ts`. Forms, stdio kinds, `Backend.offers`.
- [x] T2 `src/types/adapter.ts`, `src/adapters/{pi,claude,codex}.ts`, `test/helpers/adapter.ts`.
  `AcpRole`, null on every adapter.
- [x] T3 `src/control/bridge-links.ts` becomes `agent-links.ts`. `BridgeLink` becomes `AgentLink`.

### CHECKPOINT 1, passed
- [x] `bun check` clean over the tree.
- [x] 66 tests pass across the 11 touched test files. The status
row's `bridgeAttached` field keeps its name: it is a wire field, and only the registry was renamed.

## Wave 2: the store, `tasks/W2-store.md`, typed, not yet tested
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

## Wave 3: the ACP module, done by `tasks/P3-acp-module.md` and `tasks/P5-link-and-wiring.md`
- [ ] **Bryan first:** add `@agentclientprotocol/sdk` to `packages/orch` with `bun add`. The docs
say version 2.6.0 replaces `ClientSideConnection` with a fluent `client()` function, so the
first task reads the installed type declarations before any code is designed.
- [x] T0 lookup: the `client()` API, its handler registration, `ndJsonStream`, and the request
  and notification types, into `findings/acp-sdk.md`. Done by `P1-parallel.md` section L1.
- [x] T1 `src/acp/session.ts`. `AcpSession` over a pair of streams. Done by `P3-acp-module.md`
  section T1.
- [x] T2 `src/acp/entries.ts`. `session/update` variants to orch session entries. Done by
  `P3-acp-module.md` section T2.
- [x] T3 `src/acp/link.ts`. An `AgentLink` over an `AcpSession`. Done by
  `P5-link-and-wiring.md` section T1.
- [x] T4 `test/helpers/fake-acp-agent.ts` and `test/acp-*.test.ts`. A scripted agent on in-memory
  streams. Done by `P3-acp-module.md` and `P5-link-and-wiring.md`.
- [x] T5 `scripts/check-bridge.ts`, `scripts/check-layers.ts`, `test/check-bridge.test.ts`. A rule
  that fails on an ACP method name or the SDK import outside `src/acp/`, and `src/acp/` in
  `SERVER`. Done by `P1-parallel.md` section T6.

### CHECKPOINT 3
- [ ] `bun check`, and `bun test` on the `acp-*` and `check-*` tests.

## Wave 4: orchd holds an ACP agent, done by `tasks/P1-parallel.md`, `tasks/P2-adapters-and-review.md`, `tasks/P5-link-and-wiring.md` and `tasks/P6-finish.md`
The first visible result: a Codex agent over ACP in `orch status`.
- [x] T1 `src/types/pipes.ts`, `src/pty/node-pipes.ts`, `src/daemon/server/held-pipes.ts`,
  `test/helpers/fake-pipes.ts`. A pipes provider beside the PTY provider. Done by
  `P1-parallel.md` section T2.
- [x] T2 `src/daemon/server/held.ts`, `src/types/pty.ts`. A held screen fed by a PTY or by a
  writer orchd owns. Done by `P1-parallel.md` section T7.
- [x] T3 `src/adapters/codex.ts`. The `acp` role: argv `codex-acp`, its environment,
  `sharesSessions` from Bryan's check. Done by `P2-adapters-and-review.md` section T1.
- [x] T4 `src/daemon/server/spawn/plan.ts`, `src/commands/spawn/flags.ts`,
  `src/daemon/client/protocol.ts`, `src/settings/schema.ts`, `src/settings/registry.ts`,
  `src/commands/registry.ts`, `src/types/store.ts`, `src/store/spawn-registration.ts`. `--form`,
  `defaults.forms`, and `form` in the spawn params and in the spawn registration. Done by
  `P1-parallel.md` section T5.
- [x] T5 `src/backends/held/index.ts`, `src/daemon/server/spawn/index.ts`,
  `src/daemon/server/spawn/viewers.ts`, `src/daemon/server/handlers/lifecycle.ts`.
  `startHeldAgent` takes the form. orchd holds local agents. A viewer pane opens for any agent
  whose backend has no placement role and offers a stdio other than `none`. Done by
  `P5-link-and-wiring.md` section T3 and `P6-finish.md` section T2.
- [x] T6 `src/daemon/server/acp-agents.ts`. Start the binding on pipes, open the session, attach
  the link, and wire its callbacks. Done by `P5-link-and-wiring.md` section T3.
- [x] T7 tests on the fake pipes and the fake ACP agent: spawn to `done`, result text stored.
  Done by `P5-link-and-wiring.md` section T3.

- [ ] **Bryan:** `bun run build:orch:dev`, install `codex-acp`, then MVP line 1 and line 2.

## Wave 5: control, done by `tasks/P1-parallel.md` and `tasks/P4-links-and-review.md`
- [x] T1 `src/types/control.ts`, `src/control/dispatch.ts`,
  `src/daemon/server/handlers/drive.ts`. `abort` is a `ControlAction`. `abortHere` calls the
  dispatcher. Keys stay the fallback. Done by `P1-parallel.md` section T3.
- [x] T2 `src/control/dispatch.ts`. The channel comes from the agent's form: a form with a link
  pushes down the link, else today's order. Done by `P1-parallel.md` section T3 and
  `P4-links-and-review.md` section T1.
- [x] T3 `src/daemon/server/handlers/table.ts`, `src/daemon/server/outbox.ts`. The body of the
  `ack` handler is the plain function `ackOutboxRow`. Done by `P1-parallel.md` section T9.
- [x] T4 `src/daemon/server/handlers/write.ts`, `src/commands/` for `answer` and `questions`.
  Options in the question view. `orch answer <agent> <n>` picks an option. Done by
  `P1-parallel.md` section T4 and `P4-links-and-review.md` section T1.
- [x] T5 tests: `control-dispatch`, `answer-dispatch`, `outbox-ack`, new abort cases. Done by
  the sections above.

- [ ] **Bryan:** build, then MVP lines 3 and 4.

## Wave 6: reading and far hosts, done in part by `tasks/P1-parallel.md`
- [x] T1 `src/agent/session-log.ts`, `src/agent/read.ts`. orchd's session log as JSONL of session
  entries, and the one reader taking it for a form whose transcript orchd writes. Done by
  `P1-parallel.md` section T8.
- [x] T2 `src/daemon/client/protocol.ts`, `src/daemon/server/handlers/lifecycle.ts`,
  `src/hosts/link.ts`. `spawn-headless` carries the form, so a linked host holds an ACP agent.
  Done by `P1-parallel.md` section T5.
- [x] T3 `src/commands/status/`, `src/daemon/server/fleet-rows.ts`. The form column. Done by
  `P1-parallel.md` section T10.
- [x] T4 tests with `startFarOrchd`: `test/acp-far.test.ts`, `P7-far-and-setup.md` section T1.
  Typed, not yet run: the SDK is in `bun.lock` and not installed.

- [ ] **Bryan:** build on both hosts, then MVP lines 5 and 6.

## Wave 7: switching form, done by `tasks/P2-adapters-and-review.md` and `tasks/P6-finish.md`
- [x] T1 `src/types/adapter.ts`, the adapters. A resume argv for the `tui` form by session id.
  Done by `P2-adapters-and-review.md` section T1.
- [x] T2 `src/daemon/server/handlers/relaunch.ts`, `src/daemon/server/handlers/restart-form.ts`,
  `src/commands/lifecycle/`, `src/daemon/client/protocol.ts`. `orch restart --form`. To `tui`:
  close the session, start the PTY with the resume argv. To `acp`: end the PTY, `session/resume`
  or `session/load`. Refuse when the binding lacks session sharing or load, naming which. Done
  by `P6-finish.md` section T3.
- [x] T3 tests on fake PTY and fake ACP agent: `test/restart-form.test.ts`. Done by
  `P6-finish.md` section T3.
- [x] What restart prints, and a test through the handler: `P6-finish.md` section T5.
- [x] Review of switching form: `P6-finish.md` section R5, writing
  `findings/review-P6-restart.md`.
- [x] Fixes from the restart review, `tasks/P6-finish.md` T6.

- [ ] **Bryan:** build, then MVP line 7.

## Wave 8: Claude, doctor, setup, outline
Starts when the four checks in `PRD.md` are recorded.
- [ ] T1 `src/adapters/claude.ts`, `extensions/claude/`. The `acp` role, and the launch
  environment that keeps the hook shim from reporting state in `acp` form.
- [x] T2 doctor probe. `probeBinding` in `src/daemon/server/acp-probe.ts` starts a binding, sends
  `initialize` and stops it, under `timeouts.acp_probe_ms`. `src/daemon/server/doctor/bins.ts`
  calls it for each installed binding.
- [x] T3 `src/daemon/server/setup.ts`. Setup queues the install of a missing binding, from
  the install command on the adapter's `acp` role. `P7-far-and-setup.md` section T2.

- [ ] **Bryan:** build, then MVP lines 8, 9 and 10. The job ends here.
