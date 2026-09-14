bun test v1.4.0 (34cbb9a40)

packages\orch\test\a-backend-exposes-each-operation-once.test.ts:
(pass) a backend exposes each operation exactly once (2.2) > herdr publishes no operation beside the role that owns it [0.13ms]
(pass) a backend exposes each operation exactly once (2.2) > tmux publishes no operation beside the role that owns it [0.04ms]
(pass) a backend exposes each operation exactly once (2.2) > headless publishes no operation beside the role that owns it [0.01ms]

packages\orch\test\a-row-is-not-a-pane.test.ts:
(pass) a row is not evidence that a pane exists (U1, U4) > a recorded handle the plexer does not list is reported as NO pane [93.04ms]
(pass) a row is not evidence that a pane exists (U1, U4) > the agent itself is still there ΓÇö losing a pane costs a shortcut, not a life [73.61ms]
(pass) a row is not evidence that a pane exists (U1, U4) > a handle the plexer DOES list is kept [64.73ms]

packages\orch\test\adapter-allowlist.test.ts:
(pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [0.97ms]
(pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.10ms]
(pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.02ms]
(pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.01ms]
(pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.09ms]
(pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.07ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.07ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.01ms]
(pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.02ms]

packages\orch\test\adapter-bundle-diagnosis.test.ts:
(pass) adapter bundle installation > reports a missing shipped bundle as a structured diagnosis [0.64ms]
pi extensions:
(pass) adapter bundle installation > diagnoses a missing shipped bundle without writing [2.55ms]

packages\orch\test\adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [1.67ms]
(pass) adapter and runtime hardening > rejects unknown settings keys with a useful path [9.49ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [4.32ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [1.51ms]

packages\orch\test\adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [0.06ms]
(pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.04ms]
(pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.04ms]
(pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > pi interactive builders pass the quicklist as one quoted --models argument [0.05ms]
(pass) preferred models fill the harness's native picker quicklist > pi headless builders pass the quicklist as one verbatim argv entry [0.06ms]
(pass) preferred models fill the harness's native picker quicklist > pi omits --models cleanly for an absent or empty quicklist [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > pi keeps quicklist order and provider punctuation intact [0.02ms]
(pass) preferred models fill the harness's native picker quicklist > omp interactive builders pass the quicklist as one quoted --models argument [0.02ms]
(pass) preferred models fill the harness's native picker quicklist > omp headless builders pass the quicklist as one verbatim argv entry [0.01ms]
(pass) preferred models fill the harness's native picker quicklist > omp omits --models cleanly for an absent or empty quicklist [0.03ms]
(pass) preferred models fill the harness's native picker quicklist > omp keeps quicklist order and provider punctuation intact
(pass) preferred models fill the harness's native picker quicklist > a model outside the quicklist is still what the launch runs on [0.02ms]

packages\orch\test\adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.18ms]
(pass) PiAdapter > restricted workers explicitly load the bundled pi extension [0.11ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.06ms]
(pass) PiAdapter > reads state from the presence status through store helpers [65.12ms]
(pass) PiAdapter > reads the reported result and falls back to the last assistant session text [23.98ms]
(pass) PiAdapter > parses pi's supported model table without importing harness internals [0.30ms]

packages\orch\test\adapter-roles.test.ts:
(pass) adapter role composition > composes complete roles per adapter [0.07ms]
(pass) adapter role composition > answers with zero exit code when a shim role is absent [0.03ms]

packages\orch\test\adapter-session-env.test.ts:
(pass) adapter-owned session environment > resolves each caller harness through the public session resolver [0.43ms]
(pass) adapter-owned session environment > keeps harness env literals inside adapter modules [13.97ms]
(pass) adapter-owned session environment > a registered adapter resolves a novel marker without resolver changes [0.23ms]

packages\orch\test\agent-key-is-minted-id.test.ts:
(pass) a driving session mints an id, it is not placed by name > the key an interactive session addresses itself by is a bare minted id [2.09ms]
(pass) a driving session mints an id, it is not placed by name > the presence directory is named by that id alone [0.67ms]
(pass) a driving session mints an id, it is not placed by name > a launch that handed over a minted id is used verbatim [0.63ms]
(pass) this process's own identity is the id and nothing else > a spawned agent answers with the id its launch handed it [0.56ms]
72 | 		const params = query.params.length === 0 ? query.params : fillPlaceholders(query.params, placeholderValues);
73 | 		logger.logQuery(sql, params);
74 | 		if (resultKind === "sync") try {
75 | 			return executors.run(params);
76 | 		} catch (e) {
77 | 			throw new DrizzleQueryError(sql, params, e);
                                                  ^
DrizzleQueryError: Failed query: insert into "agents" ("id", "spawned_by", "root_agent_id", "harness_id", "cwd", "name", "label", "session_token", "claimed_at", "created_at") values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
params: 53bid465vq,rootagent1,rootagent1,pi,C:\dev\personal\orch,53bid465vq,,,,1789396084869
      at run (C:\dev\personal\orch\node_modules\drizzle-orm\sqlite-core\async\session.js:77:46)
      at insertAgent (C:\dev\personal\orch\packages\orch\src\store\agent-rows.ts:51:33)
      at registerSpawnedAgent (C:\dev\personal\orch\packages\orch\src\store\spawn-registration.ts:38:3)
      at seedAgent (C:\dev\personal\orch\packages\orch\test\helpers\agent.ts:20:3)
      at <anonymous> (C:\dev\personal\orch\packages\orch\test\agent-key-is-minted-id.test.ts:174:5)
(fail) the fleet wall is lifted by the absence of a launch, not by a key's shape > an agent orch launched may not cross into another project's fleet [80.67ms]
(pass) who drives an agent is looked up by its id > the key IS the agent id ΓÇö no segment is split out of it [1058.99ms]
(pass) who drives an agent is looked up by its id > a composite key addresses no agent at all [442.83ms]
218 | describe("doctor reads a presence directory name as an id", () => {
219 |   test("a composite directory name is a malformed identity key", () => {
220 |     const directory = tempOrchDir();
221 |     seedStatus(directory, COMPOSITE_KEY, { schema: PRESENCE_SCHEMA, agent: "pi", pid: DEAD_PID, state: "idle" });
222 |     const result = checkMalformedPresenceRecords(directory);
223 |     expect(result.status).toBe("fail");
                                ^
error: expect(received).toBe(expected)

Expected: "fail"
Received: "ok"

      at <anonymous> (C:\dev\personal\orch\packages\orch\test\agent-key-is-minted-id.test.ts:223:27)
(fail) doctor reads a presence directory name as an id > a composite directory name is a malformed identity key [61.03ms]
(pass) doctor reads a presence directory name as an id > a minted id with a current stamp is well formed [64.12ms]

packages\orch\test\agent-model-unwelded.test.ts:
(pass) A1 ΓÇö the four facts are never welded > no table welds identity, provenance, ownership and environment into one row [0.89ms]
(pass) A1 ΓÇö the four facts are never welded > ownership is a lease table, not a second id space [0.36ms]
(pass) A1 ΓÇö the four facts are never welded > the agents hub carries identity and provenance only [0.15ms]
(pass) A1 ΓÇö the four facts are never welded > no table anywhere carries a lifetime [3.30ms]

packages\orch\test\agent-monitor.test.ts:
(pass) agent fleet monitor > surfaces only agents spawned by this session [4.27ms]
(pass) agent fleet monitor > empty model renders no status line or widget [0.49ms]
(pass) agent fleet monitor > worker process registers no monitor regardless of events [0.48ms]
(pass) agent fleet monitor > does not replay history into a plain pi session [0.43ms]

packages\orch\test\agent-view.test.ts:
(pass) the agent composer > an agent with no environment rows has every axis absent, not defaulted [55.91ms]
(pass) the agent composer > each axis composes independently, and moving one leaves identity untouched [72.88ms]
(pass) the agent composer > tuning is not environment: it survives a move [63.09ms]
(pass) the agent composer > ownership reads as a live lease, and a released one is not ownership [63.05ms]
(pass) the agent composer > provenance is on the view and is not the same fact as ownership [60.95ms]
(pass) the agent composer > provenance carries the spawner's name, read as a join and never stored twice [58.92ms]
(pass) the agent composer > an agent with no spawner reports no spawner name [56.95ms]
(pass) the agent composer > agentViews is oldest-first and liveAgentViews drops ended agents [57.98ms]
(pass) the agent composer > the axis list is the only place every axis is enumerated [0.42ms]
(pass) the agent composer > the composed shape is exactly the axis list, with nothing extra and nothing missing [52.57ms]
(pass) the agent composer > an unknown agent is null, never an empty shell [52.01ms]

packages\orch\test\ambiguous-target-says-what-to-do.test.ts:
(pass) an ambiguous target names the failure and the way out (U3) > the message names the failure, the target string, and every candidate [0.13ms]
(pass) an ambiguous target names the failure and the way out (U3) > it says what to send instead, so the caller is not left guessing [0.02ms]
(pass) an ambiguous target names the failure and the way out (U3) > it is a refusal, not an exit ΓÇö the caller can act on it [0.03ms]
(pass) an ambiguous target names the failure and the way out (U3) > resolveAgentView raises that same one message [0.26ms]

packages\orch\test\answer-dispatch.test.ts:
(pass) answer over the bridge > pushes the answer and its question id [85.01ms]
(pass) answer over the bridge > returns not-asking without pushing [75.11ms]
(pass) answer over the bridge > reports a detached bridge for a live asking agent [72.83ms]
(pass) answer over the bridge > reports a gone asking agent [69.08ms]
(pass) answer over the bridge > answers with a clear absence when the adapter takes no answers [73.04ms]

packages\orch\test\backend-headless.test.ts:
(pass) HeadlessBackend > refuses to spawn with no prompt ΓÇö a headless agent runs its prompt and exits [1.88ms]
(pass) HeadlessBackend > spawns a detached process and records its handle [464.99ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [572.45ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [463.21ms]
(pass) HeadlessBackend > signals a matching recorded process through the injected killer [760.25ms]
(pass) HeadlessBackend > refuses to signal a pid whose process instance was replaced [362.67ms]
(pass) HeadlessBackend > never signals a dead pid [0.22ms]

packages\orch\test\backend-herdr-predicates.test.ts:
(pass) herdr environment predicates > neither variable set [0.17ms]
(pass) herdr environment predicates > HERDR_ENV=1 only [0.05ms]
(pass) herdr environment predicates > HERDR_PANE_ID only [0.03ms]
(pass) herdr environment predicates > both variables set [0.02ms]

packages\orch\test\backend-herdr.test.ts:
(pass) HerdrBackend > current identity uses the explicit id, not the launch environment [0.91ms]
(pass) HerdrBackend > composes a complete group role bundle [0.04ms]
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [1.41ms]
(pass) HerdrBackend > starts the mapped herdr harness kind in the pane it created [0.10ms]
(pass) HerdrBackend > agent_not_ready keeps the pane and does not close it [0.12ms]
(pass) HerdrBackend > a caller pane is split rather than given a new tab [0.07ms]
(pass) HerdrBackend > pane and tab creation always preserves focus [0.09ms]
(pass) HerdrBackend > split direction clamps to herdr's right|down [0.04ms]
(pass) HerdrBackend > env reaches the pane through herdr's --env, not an argv prefix [0.08ms]
(pass) HerdrBackend > a handed-over pane is launched into directly, never split or closed [0.03ms]
(pass) HerdrBackend > a group is created with the environment its own pane will launch under [0.61ms]
(pass) HerdrBackend > a group with no coordinate is refused, not placed wherever herdr is focused [0.05ms]
(pass) HerdrBackend > a pane with no coordinate is refused the same way [0.02ms]
(pass) HerdrBackend > the inventory answers which workspace holds a pane, and null for one herdr no longer lists [0.09ms]
(pass) HerdrBackend > the pane host closes a pane through herdr [0.03ms]
(pass) HerdrBackend > a planned target pane is split directly, never re-seated afterwards [0.09ms]
(pass) HerdrBackend > a grouped spawn with no planned target splits a pane already in that tab, never the caller's pane [0.26ms]
(pass) HerdrBackend > a same-tab re-seat bounces through a throwaway tab so herdr executes it [0.40ms]
(pass) HerdrBackend > adopts herdr's replacement pane id after move [0.09ms]
(pass) HerdrBackend > refuses a live herdr agent name before start [0.12ms]
(pass) HerdrBackend > reads recent unwrapped pane output [0.05ms]
(pass) HerdrBackend > a refused move surfaces herdr's reason instead of claiming success [0.03ms]
(pass) HerdrBackend > groupLayout reads tab geometry straight off the pane listing [0.08ms]
(pass) HerdrBackend > pane input reports gone handles without retrying and retries plain failures [1766.28ms]
(pass) HerdrBackend > pane rename failure reaches the role caller [0.14ms]
(pass) HerdrBackend > waiting uses agent wait --until, not the removed top-level wait [0.10ms]
(pass) HerdrBackend space home > opens an orch-marked workspace for a pack the caller did not label [0.85ms]
(pass) HerdrBackend space home > a space home the human named keeps that name [0.09ms]
(pass) HerdrBackend space home > create hands back the plexer coordinate, the root tab and the root pane, and says none of them [0.06ms]

packages\orch\test\backend-process-role.test.ts:
(pass) ProcessRole > headless provider records pid and start token and safely kills it [1183.78ms]
(pass) ProcessRole > herdr provider records pid and start token and safely kills it [1137.24ms]
(pass) ProcessRole > tmux provider records pid and start token and safely kills it [1164.33ms]
(pass) ProcessRole > reports replaced when a pid is reused by a different process token [0.23ms]
(pass) ProcessRole > running returns the process identity for a resolved handle [0.05ms]
(pass) ProcessRole > running throws when the environment reports no process [0.10ms]
(pass) ProcessRole > running records a null token when the OS cannot provide one [0.02ms]
(pass) ProcessRole > the default signal refuses orch's own process and its parent [0.04ms]
(pass) ProcessRole > kill signals a live record that carries no start token [0.04ms]

packages\orch\test\backend-space-home.test.ts:
(pass) tmux space home > focus switches the client to the session holding the space [3.88ms]
(pass) tmux space home > create names the session after the space and returns its root window and pane [0.16ms]
(pass) tmux space home > rename and close address the session coordinate [0.03ms]
(pass) tmux space home > list reports every session as a coordinate with a label [0.06ms]
(pass) a home orch opens is never unmarked (E8) > an unlabelled pack home is named for the pack it was opened for [0.06ms]
(pass) a home orch opens is never unmarked (E8) > an unlabelled space home is named for the space, not for the pack [0.03ms]
(pass) a home orch opens is never unmarked (E8) > a subject id the plexer would refuse is made safe, never passed through [0.04ms]
(pass) a home orch opens is never unmarked (E8) > a caller-supplied label is used verbatim [0.04ms]

packages\orch\test\backend-tmux.test.ts:
(pass) TmuxBackend > current identity uses the explicit id, not the launch environment [1.07ms]
(pass) TmuxBackend > does not expose legacy top-level group methods [0.08ms]
(pass) TmuxBackend > composes a complete group role bundle [0.05ms]
(pass) TmuxBackend > exposes tmux pane roles [0.04ms]
(pass) TmuxBackend > reads the pane shell pid as the pane process [0.28ms]
(pass) TmuxBackend > reports tmux availability [3.76ms]
(pass) TmuxBackend > reflects the TMUX environment [0.11ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.05ms]
(pass) TmuxBackend > the pane inventory surfaces only orch-spawned panes [0.27ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.07ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [221.07ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.12ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [262.92ms]
(pass) TmuxBackend > waiting fails immediately when the pane has no presence key [0.19ms]
(pass) TmuxBackend > the pane screen returns captured text and throws when capture-pane fails [1763.14ms]
(pass) TmuxBackend > setLabel and renameAgent write two distinct pane options [0.29ms]
(pass) TmuxBackend > placement.open splits the requested target with cwd and environment [0.26ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.38ms]
(pass) TmuxBackend > spawn splits the planned target pane, not whatever pane the window has active [0.14ms]
(pass) TmuxBackend > groupLayout reports every pane in a window with its cell geometry [0.23ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.15ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [0.27ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.20ms]
(pass) an agent is launched with its fleet's project scope (1.13) > a tmux agent in a worktree carries the FLEET's project, not its own cwd [0.20ms]
(pass) an agent is launched with its fleet's project scope (1.13) > a tmux agent opened in a fresh window carries it too [0.09ms]
(pass) an agent is launched with its fleet's project scope (1.13) > an empty value is dropped rather than exported as a configured blank [0.10ms]

packages\orch\test\bridge-apply.test.ts:
(pass) presence bridge delivery > applies dispatch before ack, dedupes redelivery, and detaches [3.48ms]
(pass) presence bridge delivery > applies model deliveries through model control [11.93ms]
(pass) presence bridge delivery > resolves matching answers and drops answers for other questions [0.84ms]

packages\orch\test\bridge-client.test.ts:
(pass) bridge daemon client > attaches, receives deliveries, acks on the link, and reconnects [1077.90ms]
(pass) bridge daemon client > dead endpoints resolve undefined without invoking handlers [2.84ms]

packages\orch\test\bridge-link-server.test.ts:
(pass) daemon bridge links > attaches, replies, notifies after the reply write, and pushes deliveries [86.25ms]
(pass) daemon bridge links > a socket close detaches its bridge [80.79ms]
(pass) daemon bridge links > a second socket replaces the first link [88.07ms]
(pass) daemon bridge links > attach for an agent the store does not know is refused and the server keeps serving [82.26ms]
(pass) daemon bridge links > attach without a key is rejected [12.10ms]
(pass) daemon bridge links > server close detaches every bridge [79.74ms]

packages\orch\test\bridge-links.test.ts:
72 | 		const params = query.params.length === 0 ? query.params : fillPlaceholders(query.params, placeholderValues);
73 | 		logger.logQuery(sql, params);
74 | 		if (resultKind === "sync") try {
75 | 			return executors.run(params);
76 | 		} catch (e) {
77 | 			throw new DrizzleQueryError(sql, params, e);
                                                  ^
DrizzleQueryError: Failed query: insert into "agents" ("id", "spawned_by", "root_agent_id", "harness_id", "cwd", "name", "label", "session_token", "claimed_at", "created_at") values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
params: t8es3jn0ih,,t8es3jn0ih,pi,C:\dev\personal\orch,worker-a,,,,1789396099373
      at run (C:\dev\personal\orch\node_modules\drizzle-orm\sqlite-core\async\session.js:77:46)
      at insertAgent (C:\dev\personal\orch\packages\orch\src\store\agent-rows.ts:51:33)
      at registerSpawnedAgent (C:\dev\personal\orch\packages\orch\src\store\spawn-registration.ts:38:3)
      at seedAgent (C:\dev\personal\orch\packages\orch\test\helpers\agent.ts:20:3)
      at liveAgent (C:\dev\personal\orch\packages\orch\test\bridge-links.test.ts:40:3)
      at <anonymous> (C:\dev\personal\orch\packages\orch\test\bridge-links.test.ts:76:17)
(fail) bridge links > attach holds the link under the canonical key and push reaches it [63.50ms]
72 | 		const params = query.params.length === 0 ? query.params : fillPlaceholders(query.params, placeholderValues);
73 | 		logger.logQuery(sql, params);
74 | 		if (resultKind === "sync") try {
75 | 			return executors.run(params);
76 | 		} catch (e) {
77 | 			throw new DrizzleQueryError(sql, params, e);
                                                  ^
DrizzleQueryError: Failed query: insert into "agents" ("id", "spawned_by", "root_agent_id", "harness_id", "cwd", "name", "label", "session_token", "claimed_at", "created_at") values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
params: xwpwk8p03w,,xwpwk8p03w,pi,C:\dev\personal\orch,worker-b,,,,1789396099433
      at run (C:\dev\personal\orch\node_modules\drizzle-orm\sqlite-core\async\session.js:77:46)
      at insertAgent (C:\dev\personal\orch\packages\orch\src\store\agent-rows.ts:51:33)
      at registerSpawnedAgent (C:\dev\personal\orch\packages\orch\src\store\spawn-registration.ts:38:3)
      at seedAgent (C:\dev\personal\orch\packages\orch\test\helpers\agent.ts:20:3)
      at liveAgent (C:\dev\personal\orch\packages\orch\test\bridge-links.test.ts:40:3)
      at <anonymous> (C:\dev\personal\orch\packages\orch\test\bridge-links.test.ts:86:17)
(fail) bridge links > a second attach for the same key replaces the first [60.02ms]
72 | 		const params = query.params.length === 0 ? query.params : fillPlaceholders(query.params, placeholderValues);
73 | 		logger.logQuery(sql, params);
74 | 		if (resultKind === "sync") try {
75 | 			return executors.run(params);
76 | 		} catch (e) {
77 | 			throw new DrizzleQueryError(sql, params, e);
                                                  ^
DrizzleQueryError: Failed query: insert into "agents" ("id", "spawned_by", "root_agent_id", "harness_id", "cwd", "name", "label", "session_token", "claimed_at", "created_at") values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
params: od2td4vnm6,,od2td4vnm6,pi,C:\dev\personal\orch,worker-c,,,,1789396099497
      at run (C:\dev\personal\orch\node_modules\drizzle-orm\sqlite-core\async\session.js:77:46)
      at insertAgent (C:\dev\personal\orch\packages\orch\src\store\agent-rows.ts:51:33)
      at registerSpawnedAgent (C:\dev\personal\orch\packages\orch\src\store\spawn-registration.ts:38:3)
      at seedAgent (C:\dev\personal\orch\packages\orch\test\helpers\agent.ts:20:3)
      at liveAgent (C:\dev\personal\orch\packages\orch\test\bridge-links.test.ts:40:3)
      at <anonymous> (C:\dev\personal\orch\packages\orch\test\bridge-links.test.ts:97:17)
(fail) bridge links > detach removes only the link still held [65.95ms]
72 | 		const params = query.params.length === 0 ? query.params : fillPlaceholders(query.params, placeholderValues);
73 | 		logger.logQuery(sql, params);
74 | 		if (resultKind === "sync") try {
75 | 			return executors.run(params);
76 | 		} catch (e) {
77 | 			throw new DrizzleQueryError(sql, params, e);
                                                  ^
DrizzleQueryError: Failed query: insert into "agents" ("id", "spawned_by", "root_agent_id", "harness_id", "cwd", "name", "label", "session_token", "claimed_at", "created_at") values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
params: 1rdwgy15x3,,1rdwgy15x3,pi,C:\dev\personal\orch,worker-d,,,,1789396099562
      at run (C:\dev\personal\orch\node_modules\drizzle-orm\sqlite-core\async\session.js:77:46)
      at insertAgent (C:\dev\personal\orch\packages\orch\src\store\agent-rows.ts:51:33)
      at registerSpawnedAgent (C:\dev\personal\orch\packages\orch\src\store\spawn-registration.ts:38:3)
      at seedAgent (C:\dev\personal\orch\packages\orch\test\helpers\agent.ts:20:3)
      at liveAgent (C:\dev\personal\orch\packages\orch\test\bridge-links.test.ts:40:3)
      at <anonymous> (C:\dev\personal\orch\packages\orch\test\bridge-links.test.ts:109:17)
(fail) bridge links > push with no link throws BridgeDetachedError [65.43ms]
(pass) bridge links > an unknown target is refused before the registry is consulted [0.80ms]
(pass) bridge message guards > accept every action shape [0.81ms]
(pass) bridge message guards > refuse a missing field, an unknown action, and a non-record [0.42ms]
(pass) bridge message guards > a delivery is an id plus a message [0.39ms]

packages\orch\test\bridge-reasserts-pin.test.ts:
(pass) bridge reasserts orch model pins > reasserts after session_start and reports the applied pin [5.61ms]
(pass) bridge reasserts orch model pins > reasserts one time for a foreign level and ignores apply events [3.70ms]
(pass) bridge reasserts orch model pins > a harness clamp does not create a reassert loop [3.93ms]

packages\orch\test\bridge-terminal.test.ts:
(pass) bridge terminal turn seam > empty and tool-only turn_end turns still publish a terminal idle state [72.26ms]
(pass) bridge terminal turn seam > a settled turn with assistant text publishes done [75.34ms]

packages\orch\test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.76ms]
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [53.84ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [55.95ms]
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [65.34ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [50.07ms]

packages\orch\test\broker-governance.test.ts:
(pass) daemon governWrite enforcement > an unscoped actor is refused while a live orch holds the lease [845.77ms]
(pass) daemon governWrite enforcement > an unscoped actor may write to an unleased target [58.27ms]
(pass) daemon governWrite enforcement > the lease holder may write to its own agent [833.93ms]
(pass) daemon governWrite enforcement > a foreign live holder in the same space is refused and named [825.38ms]
(pass) daemon governWrite enforcement > a dead holder is not a collision [434.47ms]
(pass) daemon governWrite enforcement > --steal on a driving verb does not take a live holder's lease [819.04ms]
(pass) daemon governWrite enforcement > a cross-space write is refused by the wall before the lease [449.16ms]
(pass) daemon governWrite enforcement > --cross-space clears the wall but the lease still applies [848.71ms]
(pass) daemon governWrite enforcement > the space operator writes to a same-space leased agent without taking the lease [847.11ms]
(pass) daemon governWrite enforcement > a foreign space's operator still hits the wall [448.75ms]
(pass) daemon governWrite enforcement > a refused enqueue leaves the lease exactly as it was [825.16ms]
(pass) daemon governWrite enforcement > a granted write and its enqueue commit together [777.31ms]
(pass) daemon governWrite enforcement > an unleased target is writable by any same-space actor [67.90ms]

packages\orch\test\broker-ownership.test.ts:
(pass) broker ownership and space governance > the composed holder is the only ownership record, and adoption moves it [89.30ms]
(pass) broker ownership and space governance > refuses cross-space writes unless explicitly overridden [87.09ms]
(pass) broker ownership and space governance > moving an agent between spaces moves the wall, not its identity [72.01ms]

packages\orch\test\build-bin.test.ts:
(pass) build entrypoint > always stamps a node shebang and executable mode [29.81ms]
(pass) the installed CLI is the packaged build, never live source (K2) > the `orch` bin points at the packaged entrypoint, not bin/orch.ts [0.04ms]
(pass) the installed CLI is the packaged build, never live source (K2) > the packaged entrypoint is built for node, from the source entrypoint [0.03ms]
(pass) the installed CLI is the packaged build, never live source (K2) > a global install cannot happen without a build in front of it [0.03ms]
(pass) the installed CLI is the packaged build, never live source (K2) > the package ships dist/, so what is installed is what was built [0.01ms]

packages\orch\test\caller-kind.test.ts:
(pass) caller kind > id + recorded token is agent [65.69ms]
(pass) caller kind > a harness marker is a session even when its token differs [64.85ms]
(pass) caller kind > a harness marker is a session without a launch credential [63.22ms]
(pass) caller kind > no harness marker is the operator [0.88ms]
(pass) caller kind > an unregistered session asks the daemon registration seam [1.94ms]
(pass) caller kind > override flags are allowed only for the operator [0.69ms]
(pass) caller kind > override flags refuse a driving session [61.34ms]
(pass) caller kind > override flags refuse a spawned agent [60.93ms]

packages\orch\test\capacity.test.ts:
(pass) fleet capacity > one pack per root, each against the per-pack cap; roots never sum into one pack [0.48ms]
(pass) fleet capacity > a selected root scopes the packs to that one pack [0.07ms]
(pass) fleet capacity > reports configured per-space caps [0.03ms]
(pass) fleet capacity > uses null for an unlimited total [0.02ms]
(pass) fleet capacity > formats one pack per root, the caller's first, then space and machine capacity [0.09ms]

packages\orch\test\check-bridge.test.ts:
(pass) presence filenames stay limited to the live protocol > inbox.jsonl is no longer a presence-filename breach [0.40ms]
(pass) presence filenames stay limited to the live protocol > status.json is a state-file breach [0.02ms]
(pass) Rule 18 forbids state files and fs.watch outside their sanctioned sites > status.json is forbidden under src but allowed outside the scanned scopes [0.01ms]
(pass) Rule 18 forbids state files and fs.watch outside their sanctioned sites > fs.watch is forbidden outside src/settings/watch.ts [0.01ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.03ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.02ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / settings seams [0.02ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [0.25ms]
(pass) composition happens only at roots (checkCompositionRootLine) > flags ORCH_DIR reads outside src/services.ts [0.04ms]
(pass) composition happens only at roots (checkCompositionRootLine) > flags createServices calls outside the five roots [0.02ms]
(pass) composition happens only at roots (checkCompositionRootLine) > flags imports of removed global composition exports [0.05ms]
117 |       "extensions/pi/index.ts",
118 |       "extensions/omp/index.ts",
119 |       "scripts/retire-daemon.ts",
120 |       "scripts/db/migrate.ts",
121 |     ]) {
122 |       expect(checkCompositionRootLine("const services = createServices();", relPath)).toBeUndefined();
                                                                                            ^
error: expect(received).toBeUndefined()

Received: "createServices() may only be called from a composition root"

      at <anonymous> (C:\dev\personal\orch\packages\orch\test\check-bridge.test.ts:122:87)
(fail) composition happens only at roots (checkCompositionRootLine) > allows createServices calls in each composition root [0.21ms]
(pass) composition happens only at roots (checkCompositionRootLine) > allows the ORCH_DIR read and declaration in src/services.ts [0.03ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.05ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the shared harness model port outside the adapter dispatcher
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [0.18ms]
(pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > flags a runtime adapter importing bridge-bundles/build.ts [0.04ms]
(pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > allows scripts and the build-tool module itself [0.01ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [0.04ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.02ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.02ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke test holds no exemption: the branch was deleted, not blessed [0.03ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has no identity-branch line, exempted or otherwise [1.76ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > flags spawner key and spawnerIdentity key owner-token fallbacks [0.06ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > allows a benign line
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > passes the clean tree: reply addresses never use owner-token fallbacks [0.71ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags object literals that synthesize an identity [0.08ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags concatenated and template identity keys [0.08ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > allows a fresh spawn mint and the issuer modules [0.02ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > no file is exempt from the identity-construction rule
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > passes the clean tree: every identity construction is allowed or registered [0.76ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.04ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.08ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [0.24ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > a deleted capability bag or optional method is not exempt [0.32ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > the exempted names are the roles the ports actually declare [0.05ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > nullable data on the port is not exempted as a role [0.01ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > flags plexer and harness identity branches [0.02ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > flags method-presence capability checks [0.06ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > allows a branch inside a concrete backend
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > passes the clean tree: no file in ANY scanned scope branches on an environment id [35.08ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > the core-scope allowlist is EMPTY, so no line holds a standing exemption [0.10ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > allows capability-driven code [0.02ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags INSERT and UPDATE SQL that welds a lease holder into spawned_by [0.23ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags lease row types carrying a provenance field [0.02ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > allows separate lease and provenance rows [0.04ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > passes the clean tree: no source line crosses lease and provenance columns [18.03ms]
(pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a launch env read outside launch.ts with the file and constant named [0.19ms]
(pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > allows the launch env read inside identity/launch.ts [0.02ms]
(pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a bare launch env name literal outside launch.ts [0.02ms]
(pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a comment mentioning the launch env name outside launch.ts
(pass) the closed plexer-id set is spelled in exactly one line > the definition line is allowed where it lives, and nowhere else [0.03ms]
(pass) the closed plexer-id set is spelled in exactly one line > any other quoted plexer id in that same file still fails [0.01ms]
(pass) the closed plexer-id set is spelled in exactly one line > the line src/types/backend.ts actually carries is the allowed one [0.34ms]
(pass) the closed plexer-id set is spelled in exactly one line > extensions get the same rule with their own scope named [0.01ms]

packages\orch\test\claim-agent.test.ts:
(pass) claim agent > unclaimed + A ΓåÆ stamped [53.86ms]
(pass) claim agent > claimed A, claim A ΓåÆ unchanged [57.26ms]
(pass) claim agent > claimed A, reclaimAgent(id) then B ΓåÆ stamped with B [63.00ms]
(pass) claim agent > claimed A, plain claim B ΓåÆ refused claimed-by-other, row unchanged [58.67ms]
(pass) claim agent > unknown id ΓåÆ refused unknown-agent [52.03ms]

packages\orch\test\claude-adapter.test.ts:
(pass) Claude adapter > declares its identity, and composes only the roles it fully implements [0.29ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.09ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.09ms]
(pass) Claude adapter > detects state from a live presence status [52.65ms]
(pass) Claude adapter > extracts results before transcript and native output [30.59ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [8.97ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [238.72ms]
(pass) Claude adapter > maps Claude hook events to presence reports [323.83ms]
(pass) Claude adapter > exits silently and writes no presence without launch env (a non-orch session) [77.26ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed launch env [61.42ms]

packages\orch\test\claude-hooks.test.ts:
(pass) Claude hook command > runs for every Claude session and lets the shim self-gate [2.65ms]

packages\orch\test\cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.09ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.06ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.08ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.06ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.03ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.07ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [7.18ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no plexer answers [0.09ms]
(pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [426.27ms]
(pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [0.69ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [135.20ms]
(pass) headless common path: identity key -> presence > one adapter uses the same opaque key across headless and tmux routes [0.17ms]
(pass) headless common path: identity key -> presence > a key carries no environment to read back out of it [0.02ms]

packages\orch\test\cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.09ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [5.00ms]
(pass) tmux backend registry and capabilities > exposes pane roles [0.06ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.05ms]
(pass) tmux backend registry and capabilities > a tmux agent's key is the minted id, never its pane [0.05ms]
(pass) tmux backend registry and capabilities > selects an available placing environment, whichever one the caller sits in [0.08ms]
(pass) tmux backend registry and capabilities > falls back to headless only when no environment can place an agent [0.03ms]
(pass) tmux backend registry and capabilities > an installed plexer is selectable from outside its session, and refuses in its own words [0.09ms]
(pass) tmux backend registry and capabilities > herdr is selectable from outside a herdr session [0.03ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-space [81.98ms]

packages\orch\test\close-always.test.ts:
{"closed":["panename01","panekey001","paneid0001"],"results":[{"target":"panename01","handle":"pane-name","outcome":"done","error":null},{"target":"panekey001","handle":"pane-key","outcome":"done","error":null},{"target":"paneid0001","handle":"pane-id","outcome":"done","error":null}],"requested":3,"ok":3,"stream":false}
114 |     }));
115 | 
116 |     expect(backend.closed).toEqual(["pane-name", "pane-key", "pane-id"]);
117 |     for (const [key] of records) {
118 |       expect(spawnedRecords(dir).has(key)).toBe(false);
119 |       expect(existsSync(join(dir, "agents", key))).toBe(true);
                                                         ^
error: expect(received).toBe(expected)

Expected: true
Received: false

      at <anonymous> (C:\dev\personal\orch\packages\orch\test\close-always.test.ts:119:52)
(fail) close always works > closes a foreign-space target by name, key, or pane id [1508.29ms]
Could not close survives01: pane-survives is still listed by headless after the close
{"closed":[],"results":[{"target":"survives01","handle":"pane-survives","outcome":"error","error":"pane-survives is still listed by headless after the close"}],"requested":1,"ok":0,"stream":false}
143 |     try {
144 |       withExitCode(() => {
145 |         withRegisteredBackend(backend, () => { cmdClose(testServices({ orchDir: dir, settings: testSettings }), [key, "--json"]); });
146 |         expect(process.exitCode).toBe(1);
147 |         expect(spawnedRecords(dir).has(key)).toBe(true);
148 |         expect(existsSync(join(dir, "agents", key))).toBe(true);
                                                           ^
error: expect(received).toBe(expected)

Expected: true
Received: false

      at <anonymous> (C:\dev\personal\orch\packages\orch\test\close-always.test.ts:148:54)
      at withExitCode (C:\dev\personal\orch\packages\orch\test\helpers\exit-code.ts:5:12)
      at <anonymous> (C:\dev\personal\orch\packages\orch\test\close-always.test.ts:144:7)
(fail) close always works > a successful backend close retains a pane that is still listed [1592.62ms]
Could not close signalfai1: cannot signal process 27644: orch is running in it
{"closed":[],"results":[{"target":"signalfai1","handle":"pane-signal-failed","outcome":"error","error":"cannot signal process 27644: orch is running in it"}],"requested":1,"ok":0,"stream":false}
180 |     try {
181 |       withExitCode(() => {
182 |         cmdClose(testServices({ orchDir: dir, settings: testSettings }), [key, "--json"]);
183 |         expect(process.exitCode).toBe(1);
184 |         expect(spawnedRecords(dir).has(key)).toBe(true);
185 |         expect(existsSync(join(dir, "agents", key))).toBe(true);
                                                           ^
error: expect(received).toBe(expected)

Expected: true
Received: false

      at <anonymous> (C:\dev\personal\orch\packages\orch\test\close-always.test.ts:185:54)
      at withExitCode (C:\dev\personal\orch\packages\orch\test\helpers\exit-code.ts:5:12)
      at <anonymous> (C:\dev\personal\orch\packages\orch\test\close-always.test.ts:181:7)
(fail) close always works > a failed signal retains the registry and presence and reports failure [2297.98ms]
{"closed":["presence01"],"results":[{"target":"presence01","handle":"pane-presence-only","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
207 |     });
208 | 
209 |     expect(backend.closed).toEqual([handle]);
210 |     expect(processIsAlive(pid)).toBe(true);
211 |     expect(spawnedRecords(dir).has(key)).toBe(false);
212 |     expect(existsSync(join(dir, "agents", key))).toBe(true);
                                                       ^
error: expect(received).toBe(expected)

Expected: true
Received: false

      at <anonymous> (C:\dev\personal\orch\packages\orch\test\close-always.test.ts:212:50)
(fail) close always works > presence pid without a recorded process closes the pane without signalling and ends the row [857.38ms]
{"closed":["owned00001"],"results":[{"target":"owned00001","handle":"pane-owned","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) close always works > close ignores owner and spawnedBy gates [842.91ms]
{"outcome":"answer","reason":"no-environment-role","text":"this pane environment does not provide abort"}
(pass) close always works > abort ignores owner gate [81.00ms]
{"closed":["duplicate1"],"results":[{"target":"duplicate1","handle":"pane-duplicate","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) close always works > duplicate close targets count once [852.60ms]
(pass) close always works > dead pane-less close is a successful no-op that ends the row and leaves presence to reap [1009.42ms]
(pass) close always works > steer remains blocked by the space wall [81.71ms]

packages\orch\test\close-authority.test.ts:
(pass) who may end an agent (D7) > the human may close anything [91.78ms]
(pass) who may end an agent (D7) > an orch may close the slaves it owns, at any depth [62.90ms]
(pass) who may end an agent (D7) > an agent may NOT close another orch's slaves, and is told whose it is [60.93ms]
(pass) who may end an agent (D7) > an agent may not close a peer orch either [63.02ms]
(pass) who may end an agent (D7) > an agent may always close itself ΓÇö acting on yourself is not driving a fleet [59.53ms]
(pass) who may end an agent (D7) > adopting grants the right to end, and the spawner keeps it [63.47ms]
(pass) who may end an agent (D7) > a provenance cycle terminates instead of hanging [61.09ms]

packages\orch\test\close-is-keyed-by-agent-id.test.ts:
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > an agent whose pane is gone is never handed to the plexer as a pane [837.65ms]
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > an agent whose pane is gone still ends, and reports done [852.46ms]
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > what a human is told they closed is the agent, not the plexer's coordinate [830.85ms]
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > the --json closed list names agents, so a caller can map it back [834.23ms]
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > the plexer is still handed the real handle when there IS a pane [873.82ms]

packages\orch\test\close-reports-every-target.test.ts:
(pass) close reports an outcome for every target it was given (U2) > --json carries a per-target outcome, not just the successes [1245.24ms]
(pass) close reports an outcome for every target it was given (U2) > a failed target reports outcome error WITH the real error text [463.22ms]
(pass) close reports an outcome for every target it was given (U2) > a pane the plexer no longer has is CLOSED, not failed [832.46ms]
(pass) close reports an outcome for every target it was given (U2) > the exit code still reflects whether every target closed [869.96ms]

packages\orch\test\codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [25.17ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [1.05ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [1.03ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [7.67ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [6.45ms]
(pass) CodexAdapter > notify shim reports done presence and result over orchd [166.99ms]

packages\orch\test\command-refusal.test.ts:
(pass) a command refusal is thrown, not exited > an unresolvable target throws a CommandRefusal instead of killing the process [397.37ms]
(pass) a command refusal is thrown, not exited > the refusal carries the reason a human needs [421.89ms]

packages\orch\test\command-space-fields.test.ts:
(pass) command space fields > status and wall entities use the composed space, and it is nowhere in the key [63.88ms]
(pass) command space fields > skipBackends keeps the authoritative presence entity shape [64.13ms]
(pass) command space fields > status reports a mixed pi and Claude fleet with the same identity fields [88.75ms]

packages\orch\test\commands-clean.test.ts:
(pass) commands/clean > the forced sweep reaps dead agent dirs but preserves live processes [86.92ms]
{"malformed":["herdr~wF~p9"],"closed":2,"removed":[],"worktrees":0}
(pass) commands/clean > bare clean keeps ended agents as history and closes their queued writes [106.72ms]
{"malformed":[],"closed":1,"removed":["deadagent1"],"worktrees":0}
(pass) commands/clean > --force reaps the ended agent and closes its queued writes [74.54ms]
(pass) worktree ownership reads the composed environment > a live agent's worktree is protected and a dead one's is not [75.93ms]
(pass) orch clean is destructive maintenance > a spawned agent is refused the sweep, and the dirs it does not own survive [78.15ms]

packages\orch\test\commands-control.test.ts:
(pass) commands/control > parses dispatch flags without losing prompt words [0.18ms]
(pass) commands/control > parses --then destination and note [0.03ms]
(pass) commands/control > adds worker header unless raw [0.09ms]

packages\orch\test\commands-daemon.test.ts:
27 |         startedAt: "now",
28 |         uptimeSec: 1,
29 |         codeHash: "h",
30 |         socket: "s",
31 |         subsystems: { workLoop: "running", presenceWatch: "running", settingsWatch: "running" },
32 |       }).success).toBe(true);
                       ^
error: expect(received).toBe(expected)

Expected: true
Received: false

      at <anonymous> (C:\dev\personal\orch\packages\orch\test\commands-daemon.test.ts:32:19)
(fail) commands/daemon > parses governance and validates daemon status [2.60ms]
(pass) commands/daemon > reads a lock pid only from a complete lock record [17.31ms]

packages\orch\test\commands-events.test.ts:
(pass) commands/events > owned renderers and tool help do not expose the retired workspace term [0.51ms]
(pass) commands/events > bare events is scoped to this session's agents and renders readable lines [0.07ms]
(pass) commands/events > parses the scope flags [0.06ms]
(pass) commands/events > parses the wake-up flags [0.03ms]
(pass) commands/events > --filter names the states to drop and is never the default [0.08ms]
(pass) commands/events > includes an adopted agent whose open lease is mine [0.03ms]
(pass) commands/events > includes a reused pane leased by me even when another session spawned it
(pass) commands/events > includes an unleased agent spawned by this session
(pass) commands/events > excludes an agent spawned by a different session
(pass) commands/events > --space-wide passes agents from both sessions [0.02ms]
(pass) commands/events > excludes an agent while another orch holds its lease
(pass) commands/events > describes durable replay and reports pruned history gaps [0.04ms]
(pass) commands/events > names one agent by name or by identity key [0.03ms]
(pass) commands/events > a subscription with no daemon keeps redialing instead of exiting [0.40ms]
(pass) commands/events > renders opaque plexer coordinates without relabeling them as spaces [0.43ms]
(pass) commands/events > message events render the full delivered mail text [0.05ms]
(pass) commands/events > an event line says what happened, never the fleet's books [0.03ms]
(pass) commands/events > rejects malformed event and labels sinks [0.28ms]
(pass) commands/events space wall > an agent is heard only inside the space it currently occupies [74.41ms]
(pass) commands/events space wall > moving an agent moves its events with it [79.97ms]
(pass) commands/events space wall > an unplaced caller has no wall and hears the machine [66.90ms]
(pass) commands/events space wall > a key naming no registered agent is in no space [0.67ms]
(pass) commands/events space wall > a session hears its workers and its mail, never its own transitions [85.44ms]

packages\orch\test\commands-help.test.ts:
(pass) per-command help topics > daemon help names every subcommand and the idle shutdown setting [0.04ms]
(pass) per-command help topics > aliases resolve to their command's topic [0.02ms]
(pass) per-command help topics > logs help names every filter the command accepts [0.06ms]
(pass) per-command help topics > an unknown name has no topic
(pass) per-command help topics > every topic is printable text ending in a newline [0.04ms]

packages\orch\test\commands-index.test.ts:
(pass) commands/index > does not gate help or noninteractive commands [0.05ms]
(pass) commands/index > reads a package version string [0.18ms]
(pass) commands/index > prints the daemon's unleased list and stays silent on an empty one [0.08ms]
(pass) commands/index > dispatches representative commands and reports unknown commands [8.51ms]

packages\orch\test\commands-lease.test.ts:
(pass) lease commands > detach releases the lease and is a no-op when already unleased [70.42ms]
(pass) lease commands > a LIVE foreign holder still excludes everyone else [846.68ms]
(pass) lease commands > adopt takes an unleased agent and a dead holder [62.08ms]
(pass) lease commands > adopt refuses a holder with a live recorded process [809.09ms]
(pass) lease commands > reap refuses when a live descendant exists, regardless of lease [57.88ms]
(pass) lease commands > reap refuses while the recorded process is alive [726.11ms]
(pass) lease commands > reap is never lease-gated and removes the record and presence [63.03ms]
{"outcome":"answer","reason":"no-environment-role","text":"this pane environment does not provide abort"}
(pass) lease commands > abort proceeds with a foreign live-holder lease [1115.77ms]
{"closed":["mlvb7sr9sj"],"results":[{"target":"mlvb7sr9sj","handle":"close-handle","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) lease commands > close proceeds with a foreign live-holder lease [2098.99ms]
{"target":"w2canh58of","name":"reap-worker","reaped":true}
(pass) lease commands > reap proceeds with a foreign live-holder lease [422.99ms]
(pass) lease commands > reset driving verb refuses a foreign live-holder lease [758.58ms]

packages\orch\test\commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [0.53ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [0.07ms]
(pass) commands/lifecycle > --all targets the agents this orch holds a live lease on, and drops them when it releases [1202.49ms]

packages\orch\test\commands-logging.test.ts:
(pass) orch logs > --dispatch selects one dispatch across both sinks, oldest first [16.79ms]
(pass) orch logs > --agent selects one agent's records [7.87ms]
(pass) orch logs > --level selects one severity [4.36ms]
(pass) orch logs > --since drops everything older than the instant given [3.71ms]
(pass) orch logs > --since 0 keeps every record instead of being read as a missing value [3.58ms]
(pass) orch logs > renders a readable line: instant, level, event, correlation, agent, fields [3.42ms]
(pass) orch logs > --json emits the records themselves [4.20ms]
(pass) command logging > notify test records the diagnosis and keeps user output on stdout [9.00ms]

packages\orch\test\commands-models.test.ts:
(pass) orch models lists the whole catalogue > shows every offered model, quicklisted or not, allowed or not [0.50ms]
(pass) orch models lists the whole catalogue > marks the launch default (thinking suffix removed) and the quicklist members [0.08ms]
(pass) orch models lists the whole catalogue > keeps harness sections in configured order [0.04ms]
(pass) orch models lists the whole catalogue > a harness that enumerates nothing gets an empty section, not another's models [0.10ms]
(pass) orch models filters > --preferred narrows to the quicklist and renumbers what is shown [0.05ms]
(pass) orch models filters > --search matches spec and label case-insensitively [0.06ms]
(pass) orch models filters > filters combine, and no match is an empty result rather than the full list [0.04ms]
(pass) orch models --pick prints one spec > a numeric pick reads the displayed index of a single harness [0.11ms]
(pass) orch models --pick prints one spec > an exact spec pick resolves after filtering [0.06ms]
(pass) orch models --pick prints one spec > ambiguous, missing, zero, and out-of-range picks fail [0.28ms]
(pass) orch models --json > emits the pinned harness/model shape [0.11ms]

packages\orch\test\commands-panes.test.ts:
(pass) commands/panes > pane identity is the minted id alone [0.05ms]
(pass) commands/panes > a plexer-and-space key is not an identity
(pass) commands/panes > exports the pane listing command directly [0.03ms]

packages\orch\test\commands-queue.test.ts:
(pass) commands/queue > cmdQueue list emits the selected JSON view [61.78ms]
(pass) commands/queue > round-trips add/list/cancel on an isolated store [55.78ms]
No queue tasks.
(pass) commands/queue > renders empty queues without throwing [0.14ms]

packages\orch\test\commands-results.test.ts:
(pass) commands/results > renders daemon questions with the existing JSON shape [70.02ms]
(pass) commands/results > renders exactly the pending questions returned by the daemon [9.50ms]
(pass) commands/results > surfaces a missing daemon instead of returning an empty list [2.53ms]
(pass) commands/results > formats invalid and recent timestamps [0.85ms]
(pass) commands/results > routes a seeded results.jsonl through the command module [452.33ms]
(pass) commands/results > keeps every settled dispatch and reports the newest [422.16ms]
(pass) commands/results > falls back to adapter session text when results.jsonl is absent [454.29ms]
(pass) commands/results > uses results.jsonl even when the presence status has no agent [447.20ms]
(pass) commands/results > renders several target results under headers [855.20ms]
(pass) commands/results > renders several target results as a JSON array [856.78ms]
(pass) commands/results > continues after a missing target and sets exit code [847.38ms]
(pass) commands/results > orch tail resolves a non-pi target through that adapter's session view [447.76ms]
(pass) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [472.61ms]
(pass) commands/results > orch tail -n keeps last-N rendered entries for a pi session [452.81ms]
(pass) commands/results > orch session reports the pi entry count [443.64ms]
(pass) commands/results > orch session shows zero entries for an adapter view without them [449.50ms]

packages\orch\test\commands-runs.test.ts:
(pass) commands/runs > lists newest first and honors -n [91.67ms]
(pass) commands/runs > target filter and json preserve RunRecord rows [465.17ms]
(pass) commands/runs > running rows render as running, not zero duration [0.29ms]
(pass) commands/runs > result falls back to durable run history after presence reap [444.62ms]

packages\orch\test\commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.24ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [0.29ms]
Selection recorded in C:\Users\Bryan\AppData\Local\Temp\orch-setup-characterization-KgK5oj\settings.json:
  runtime           = node
  adapters          = pi
  default adapter   = pi
  backends          = headless
  default backend   = headless
  model (pi)          = (none)  picker: none, allowed: all offered
Prerequisites:
  MISSING pi
  ok      headless
  install bun: curl -fsSL https://bun.sh/install | bash
  install pi: bun add -g @earendil-works/pi-coding-agent
Presence dir:
  C:\Users\Bryan\AppData\Local\Temp\orch-setup-characterization-KgK5oj\agents
Skills:
  not installed - turn it back on with: orch settings skills --install
bins:
  C:\Users\Bryan\AppData\Local\Temp\orch-setup-home-PHVLDj\.local\bin\orch (copy)
  C:\Users\Bryan\AppData\Local\Temp\orch-setup-home-PHVLDj\.local\bin\pif (copy)
  C:\Users\Bryan\AppData\Local\Temp\orch-setup-home-PHVLDj\.local\bin\orch-ding (copy)
  SKIP pi extensions: pi integration shim disabled
Running doctor checks...
Doctor: 30/35 checks passed
Done. Open a plexer workspace and try: orch spawn 2 --tab Team1
(pass) commands/setup > runs non-interactive setup against the requested ORCH_DIR and records the selected composition [5127.36ms]
(pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.23ms]

packages\orch\test\commands-space.test.ts:
(pass) orch space ΓÇö orch's own grouping > a space is created, listed, renamed and deleted with no space-home role [83.33ms]
(pass) orch space ΓÇö orch's own grouping > create refuses a name already in use [47.91ms]
(pass) orch space ΓÇö orch's own grouping > delete refuses a space that still holds agents [59.18ms]
(pass) orch space ΓÇö the plexer's home > create makes a home and records only its coordinate [52.84ms]
(pass) orch space ΓÇö the plexer's home > list reports that a space has a home without naming the coordinate [52.97ms]
(pass) orch space ΓÇö the plexer's home > rename renames orch's space and its home [52.29ms]
(pass) orch space ΓÇö the plexer's home > delete closes the home and drops its coordinate [54.92ms]
(pass) orch space ΓÇö the plexer's home > focus focuses the recorded coordinate [49.87ms]
(pass) orch space ΓÇö the plexer's home > a home made in another plexer is not this environment's to focus [50.92ms]
(pass) orch space ΓÇö absence is an answer > focus with no space-home role names the space and what is missing [44.97ms]
(pass) orch space ΓÇö absence is an answer > the plain-text answer names the space too [50.99ms]
(pass) orch space ΓÇö vocabulary and wiring > cmdSpace lists through the resolved environment [429.03ms]
(pass) orch space ΓÇö vocabulary and wiring > orch ws is gone [0.14ms]
(pass) orch space ΓÇö vocabulary and wiring > space help never says workspace and offers create/rename/delete [0.08ms]
(pass) orch space ΓÇö vocabulary and wiring > no space output ever says workspace [54.69ms]

packages\orch\test\commands-spawn.test.ts:
(pass) commands/spawn > refuses an invalid name before resolving or creating a workspace [2.93ms]
(pass) commands/spawn > refuses spawn without a name before any spawn mutations [41.08ms]
(pass) commands/spawn > rejects removed spawn cap flag as unknown [0.12ms]
(pass) commands/spawn > rejects --detached as an unknown spawn flag [2.06ms]
(pass) commands/spawn > the positionals are the agent names [0.11ms]
(pass) commands/spawn > collects repeated prompts in agent order [0.03ms]
(pass) commands/spawn > collects repeated files and models in order [0.02ms]
(pass) commands/spawn > collects repeated models in order [0.03ms]
(pass) commands/spawn > resolves one prompt file per agent [7.27ms]
(pass) commands/spawn > reuses one prompt file for every agent [6.94ms]
(pass) commands/spawn > refuses an incorrect number of prompt files [0.99ms]
(pass) commands/spawn > refuses stdin prompt files more than once [0.75ms]
(pass) commands/spawn > resolves one model per agent [0.83ms]
(pass) commands/spawn > refuses an incorrect number of models [0.65ms]
(pass) commands/spawn > each pi flavor launches its own binary and preserves raw prompt [0.11ms]

packages\orch\test\commands-status.test.ts:
(pass) commands/status > zero-row message reports gathered counts and backend response [0.04ms]
(pass) commands/status > dead rows never display stale live state [0.02ms]
(pass) commands/status > shared row boundary normalizes stale state for every renderer [0.03ms]
(pass) commands/status > a human at a terminal has no identity to narrow by and no space to be held inside [0.11ms]
(pass) commands/status > --agent narrows to one row by id, key, or name, exited or not [0.08ms]
(pass) commands/status > an agent sees what it spawned, and never past its own space > the default is the agents this caller spawned [0.03ms]
(pass) commands/status > an agent sees what it spawned, and never past its own space > --space-wide widens to the caller's space, which is the wall [0.02ms]
(pass) commands/status > an agent sees what it spawned, and never past its own space > a human widening sees every space, including the one the agent could not [0.01ms]
(pass) commands/status > derives status row fields from seeded presence [8.32ms]
(pass) commands/status > marks dead presence as exited [4.14ms]
(pass) commands/status > asking presence is surfaced as a question while still reporting live state [40.19ms]
(pass) commands/status > shared status row carries presence-derived fields [4.36ms]
(pass) commands/status > row carries the owning backend's declared capabilities [7.80ms]
(pass) commands/status > an agent whose backend orch cannot name reports no capabilities [3.74ms]
(pass) commands/status > status owner ignores spawning provenance when no lease exists [8.04ms]
(pass) commands/status > lease-backed status attribution distinguishes my lease, another lease, and unleased rows [835.22ms]
(pass) commands/status > default table separates minted identity from pane environment [0.72ms]
(pass) commands/status > human table shows harness and working directory facts [0.07ms]
(pass) commands/status > json branch and local table branch derive identical rows apart from host [8.75ms]
(pass) commands/status > capacity footer uses configured caps and shows one pack per root [0.22ms]
(pass) commands/status > formats workspace labels and warnings [0.08ms]

packages\orch\test\commands-target.test.ts:
(pass) commands/target > splits known flags and preserves positional args [2.32ms]
(pass) commands/target > extracts target and joined prompt [0.18ms]
(pass) commands/target > reads only structured result text [0.03ms]
(pass) commands/target > quotes remote args and ORCH_DIR safely [0.07ms]
(pass) commands/target > lists only live serialized identity presence entries [94.70ms]

packages\orch\test\control-ack.test.ts:
(pass) control delivery acknowledgements > waits for the matching reader acknowledgement [0.37ms]
(pass) control delivery acknowledgements > captures an acknowledgement arriving during delivery [0.05ms]
(pass) control delivery acknowledgements > never claims consumption for an unacknowledged channel [0.02ms]
(pass) control delivery acknowledgements > times out without claiming that delivery was cancelled [9.55ms]
(pass) control delivery acknowledgements > propagates a failed send and removes its waiter [0.27ms]

packages\orch\test\control-dispatch.test.ts:
(pass) deliverControl bridge dispatch > pushes run and steer with their action ids [89.10ms]
(pass) deliverControl bridge dispatch > reports a detached bridge for a live agent [69.98ms]
(pass) deliverControl bridge dispatch > reports a gone agent before pushing to its link [69.90ms]
(pass) deliverControl bridge dispatch > answers only when status has no pending question [67.97ms]
(pass) deliverControl bridge dispatch > pushes an answer with the asking question id [71.01ms]
  warning: pi --list-models failed; pi lists no models (pi --list-models failed after 2 attempts: Executable not found in $PATH: "pi")
(pass) deliverControl bridge dispatch > pushes model changes and waits for the control outcome [598.42ms]
  warning: pi --list-models failed; pi lists no models (pi --list-models failed after 2 attempts: Executable not found in $PATH: "pi")
(pass) deliverControl bridge dispatch > rejects an outcome whose applied pin differs from the request [591.26ms]
(pass) deliverControl bridge dispatch > uses the backend input path when the adapter bridge takes no steers [80.57ms]

packages\orch\test\cross-pack-result-delivery.test.ts:
(pass) results go to the enqueuer as mail > a result is an outbox row for the enqueuer, not the runner [98.84ms]
(pass) results go to the enqueuer as mail > a failed task reports its error in the mail body [71.85ms]
(pass) results go to the enqueuer as mail > a cross-wall enqueuer gets no row and the task stays settled [75.09ms]
(pass) acceptMail > refuses a message across the space wall by its reason [62.92ms]
(pass) acceptMail > requires non-empty from, target, and text [59.10ms]
(pass) acceptMail > queues a mail payload, routed by mail.delivery when it is delivered [69.94ms]

packages\orch\test\daemon-credential.test.ts:
(skip) the token file is the whole credential > the token is 0600
(skip) the token file is the whole credential > $ORCH_DIR is 0700, so same-uid is a boundary the filesystem enforces
(skip) the token file is the whole credential > a token left loose by an earlier run is tightened, not trusted
(skip) the token file is the whole credential > a runtime directory the daemon creates is 0700 too
(pass) the token file is the whole credential > nothing else is enrolled: there is no allowlist beside the token [10.84ms]

packages\orch\test\daemon-decision-trail.test.ts:
(pass) daemon decision trail > records a lease refused against a live holder [823.03ms]
(pass) daemon decision trail > records a lease granted over a dead holder [65.49ms]
110 | 
111 |     // Await the promise itself rather than `.resolves`: the linter does not see
112 |     // matcher chains as Thenable, and awaiting the call is the same assertion.
113 |     // A boundary answer is terminal: it is a reply to a human, and no bridge
114 |     // will ever append a marker for it, so it settles on the write (L7).
115 |     expect(await deliverWrite(daemonState(directory), target, { action: "steer", text: "hello" }, "dispatch-1")).toBe("acked");
                                                                                                                       ^
error: expect(received).toBe(expected)

Expected: "acked"
Received: "gone"

      at <anonymous> (C:\dev\personal\orch\packages\orch\test\daemon-decision-trail.test.ts:115:114)
(fail) daemon decision trail > records a not-placed boundary answer with its reason [74.27ms]

packages\orch\test\daemon-events.test.ts:
(pass) daemon presence events > a report for an unregistered agent throws and publishes nothing [1.18ms]
(pass) daemon presence events > reports publish only changed-state transitions [68.12ms]
(pass) daemon presence events > an RPC subscriber receives a presence transition [93.02ms]
(pass) daemon presence events > a dispatched transition writes the full run row [74.06ms]
(pass) daemon presence events > a result report stores the complete result text [59.03ms]
(pass) daemon presence events > repeated transitions upsert one run and only terminal states set finishedAt [78.03ms]
(pass) daemon presence events > a status without a dispatch id does not write history [68.85ms]
(pass) daemon presence events > a throwing history write does not stop event delivery [71.94ms]
(pass) daemon presence events > emitted events carry the pack capacity at publish time [71.22ms]
(pass) daemon presence events > a flapping status file cannot storm the stream with repeat transitions [0.23ms]
(pass) daemon presence events > a genuine repeat of the same transition for new work still publishes [0.05ms]
(pass) daemon presence events > a repeat transition publishes again once the suppression window passes [0.03ms]
(pass) daemon presence events > repeated observations cannot slide the suppression window forever [0.02ms]
(pass) daemon presence events > a working-to-done repeat after the dedupe window is emitted [0.04ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [54.23ms]
(pass) daemon presence events > presence transitions use the normalized agent name after rename [59.82ms]
(pass) daemon presence events > status rows preserve the complete asking transition payload [58.00ms]
(pass) daemon presence events > an asking report publishes an asking event [68.71ms]
(pass) daemon presence events > an asking transition drives command sink delivery [101.68ms]
(pass) daemon presence events > liveness turns a dead process into exited [91.19ms]

packages\orch\test\daemon-idle.test.ts:
(pass) orchd idle shutdown rule > a zero setting disables idle shutdown entirely [0.06ms]
(pass) orchd idle shutdown rule > a live agent holds the daemon open however long it has been quiet [0.01ms]
(pass) orchd idle shutdown rule > an event subscriber holds the daemon open
(pass) orchd idle shutdown rule > recent activity holds the daemon open below the threshold
(pass) orchd idle shutdown rule > a fully idle daemon past the threshold is due to exit

packages\orch\test\daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [1143.65ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [770.66ms]
(pass) daemon lifecycle > reclaims an unreadable lock, which a crash truncated and no daemon owns [1136.15ms]
(pass) daemon lifecycle > refuses an unreadable lock while the socket still answers [385.14ms]
(pass) daemon lifecycle > clears the lock, socket and port a departed daemon owned, keeping the log [4.46ms]
(pass) daemon lifecycle > refuses a stale lock when the socket probe cannot answer [377.58ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [381.67ms]
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.4.0+34cbb9a40)

Usage: bun <command> [...flags] [...args]

Commands:
  run       ./my-script.ts       Execute a file with Bun
            lint                 Run a package.json script
  test                           Run unit tests with Bun
  x         nuxi                 Execute a package binary (CLI), installing if needed (bunx)
  repl                           Start a REPL session with Bun
  exec                           Run a shell script directly with Bun

  install                        Install dependencies for a package.json (bun i)
  add       lyra                 Add a dependency to package.json (bun a)
  remove    @parcel/core         Remove a dependency from package.json (bun rm)
  update    @remix-run/dev       Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
  dedupe                         Remove duplicate versions from the lockfile
  prune                          Remove packages that are not in the lockfile from node_modules
  outdated                       Display latest versions of outdated dependencies
  link      [<package>]          Register or link a local npm package
  unlink                         Unregister a local npm package
  publish                        Publish a package to the npm registry
  patch <pkg>                    Prepare a package for patching
  pm <subcommand>                Additional package management utilities
  info      @evan/duckdb         Display package metadata from the registry
  why       @zarfjs/zarf         Explain why a package is installed

  build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file

  init                           Start an empty Bun project from a built-in template
  create    astro                Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [159.23ms]
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [382.00ms]
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.4.0+34cbb9a40)

Usage: bun <command> [...flags] [...args]

Commands:
  run       ./my-script.ts       Execute a file with Bun
            lint                 Run a package.json script
  test                           Run unit tests with Bun
  x         eslint               Execute a package binary (CLI), installing if needed (bunx)
  repl                           Start a REPL session with Bun
  exec                           Run a shell script directly with Bun

  install                        Install dependencies for a package.json (bun i)
  add       @zarfjs/zarf         Add a dependency to package.json (bun a)
  remove    left-pad             Remove a dependency from package.json (bun rm)
  update    zod                  Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
  dedupe                         Remove duplicate versions from the lockfile
  prune                          Remove packages that are not in the lockfile from node_modules
  outdated                       Display latest versions of outdated dependencies
  link      [<package>]          Register or link a local npm package
  unlink                         Unregister a local npm package
  publish                        Publish a package to the npm registry
  patch <pkg>                    Prepare a package for patching
  pm <subcommand>                Additional package management utilities
  info      tailwindcss          Display package metadata from the registry
  why       elysia               Explain why a package is installed

  build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file

  init                           Start an empty Bun project from a built-in template
  create    elysia               Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > rejects a recycled pid identity [1457.72ms]
(pass) daemon lifecycle > foreign machine registration cannot be signalled for another store [1082.69ms]
(pass) daemon lifecycle > only a provable lock owner may be signalled [1139.18ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [12.71ms]

packages\orch\test\daemon-no-peer-credentials.test.ts:
(pass) the daemon asks for a token and nothing else > no peer-credential or ancestry syscall appears in the daemon at all [2.31ms]
(pass) the daemon asks for a token and nothing else > a caller the daemon has no relationship to is accepted on the token alone [499.95ms]
(pass) the daemon asks for a token and nothing else > that same stranger without the token is refused, so the token is what decided [13.25ms]

packages\orch\test\daemon-registration.test.ts:
(pass) machine daemon registration > refuses a second start and names the live socket [1531.62ms]
(pass) machine daemon registration > the refusal a second start prints names the live daemon's pid [1502.06ms]
(pass) machine daemon registration > doctor names both when a second daemon is live beside the registered one [1119.45ms]
(pass) machine daemon registration > evicts a registration whose process instance no longer matches [1142.44ms]
(pass) machine daemon registration > routes a different orch dir to its own runtime files [1141.48ms]
(pass) machine daemon registration > doctor distinguishes registered-but-dead from live-and-registered [1951.29ms]

packages\orch\test\daemon-renags-questions.test.ts:
(pass) question re-ask policy > nothing due emits nothing [0.18ms]
(pass) question re-ask policy > an overdue question emits its first re-ask [0.05ms]
(pass) question re-ask policy > an emitted re-ask waits for the interval before emitting again [0.03ms]
(pass) question re-ask policy > a settled question emits no further re-asks [0.02ms]
(pass) question re-ask policy > the limit emits one final gave-up event and then stays silent [0.02ms]

packages\orch\test\daemon-repins-on-settings-change.test.ts:
(pass) daemon settings tuning re-pin > pins every live agent to the resolved settings default [36.96ms]
(pass) daemon settings tuning re-pin > keeps the tuning a pinned agent holds and tunes only the unpinned one [3.08ms]
(pass) daemon settings tuning re-pin > does not pin when tuning settings did not change [6.73ms]
(pass) daemon settings tuning re-pin > continues re-pinning after one agent fails [3.10ms]

packages\orch\test\daemon-rpc-identity.test.ts:
(pass) daemon identity RPCs > claim-identity stamps a minted id [455.94ms]
(pass) daemon identity RPCs > claim-identity refuses an unknown id by naming it [426.60ms]
(pass) daemon identity RPCs > register-session mints one id per session token [842.85ms]
(pass) daemon identity RPCs > the removed method is unknown [0.15ms]

packages\orch\test\daemon-rpc.test.ts:
(pass) daemon RPC > rejects a hello response with a malformed optional field [0.27ms]
(pass) daemon RPC > hello translates an absent daemon instead of reading a missing token [5079.71ms]
1 unleased agent(s) exist - orch adopt 638ukdt1kf to take one, orch status to see them.
(pass) daemon RPC > an unreachable agent yields a boundary answer, and the outbox is not left pending [5969.05ms]
(pass) daemon RPC > round-trips a call over the real unix socket [13.96ms]
(pass) daemon RPC > issues one session identity to sequential invocations from one session [765.70ms]
(pass) daemon RPC > hello returns live agents whose newest lease is closed or absent [776.41ms]
(pass) daemon RPC > hello returns an empty unleased list when none exist [420.22ms]
(pass) daemon RPC > a TCP hello with the daemon token gets an identity [1053.15ms]
(pass) daemon RPC > refuses a hello that reports no session pid [16.77ms]
(pass) daemon RPC > refuses a hello without its environment [16.41ms]
(pass) daemon RPC > same session pid keeps its id and a different session pid gets another [1490.10ms]
(pass) daemon RPC > refuses a TCP hello without a token [7.35ms]
(pass) daemon RPC > refuses a TCP hello with a wrong token [7.28ms]
(pass) daemon RPC > writes the daemon token with owner-only permissions [10.68ms]
(pass) daemon RPC > returns an error for an unknown method [8.37ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [19.60ms]
(pass) daemon RPC > delivers pushed subscription events [60.40ms]
(pass) daemon RPC > replays durable events after a daemon restart without a gap [340.33ms]
(pass) daemon RPC > reports the oldest sequence when replay starts before the pruned window [57.25ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [1129.17ms]
(pass) daemon RPC > has a catchable absent-daemon error [0.82ms]
(pass) daemon RPC > calls a slow daemon unreachable, not absent [114.63ms]
(pass) daemon RPC > calls a refused endpoint absent so a wedged daemon is still reclaimable [1.71ms]
1 unleased agent(s) exist - orch adopt zqte0makb8 to take one, orch status to see them.
(pass) daemon RPC > dispatch waits for and reports a bridge acknowledgement [10303.91ms]
1 unleased agent(s) exist - orch adopt jbqgho9p8m to take one, orch status to see them.
117 | export function errorResponse(id: number | null, code: RpcErrorCode, message: string): Extract<RpcLine, { kind: "error" }> {
118 |   return { kind: "error", id, error: { code, message } };
119 | }
120 | 
121 | export function responseError(line: Extract<RpcLine, { kind: "error" }>): RpcError {
122 |   return new RpcError(line.error.code, line.error.message, line.error.data);
               ^
RpcError: write 26b7fcc1-86b2-4a2c-859f-0807a91637a3: agent jbqgho9p8m is gone
 data: undefined,
 code: "HANDLER_ERROR"

      at responseError (C:\dev\personal\orch\packages\orch\src\daemon\client\wire.ts:122:10)
      at rpcCall (C:\dev\personal\orch\packages\orch\src\daemon\client\rpc.ts:155:42)
      at async <anonymous> (C:\dev\personal\orch\packages\orch\test\daemon-rpc.test.ts:512:28)
(fail) daemon RPC > dispatch reports unavailable while a live agent has no bridge [5675.37ms]
1 unleased agent(s) exist - orch adopt mi53n7dqs6 to take one, orch status to see them.
(pass) daemon RPC > attach reports open rows and re-pushes them [11716.44ms]

packages\orch\test\daemon-status-lease.test.ts:
(pass) daemon status lease payload > reports the current holder and its liveness [754.33ms]
(pass) daemon status lease payload > distinguishes a known unleased agent from an unknown key [396.38ms]

packages\orch\test\daemon-transport-parity.test.ts:
(pass) both transports carry one mechanism > a bound TCP port does not displace the unix socket or become its own service [10.54ms]
(pass) both transports carry one mechanism > the credential is demanded identically on both [10.52ms]
(pass) both transports carry one mechanism > a missing credential is refused identically on both [9.52ms]
(pass) both transports carry one mechanism > the same token registers the same session whichever transport carried it [757.13ms]

packages\orch\test\dispatch-channel-first.test.ts:
(pass) work reaches an agent through its link > a headless agent receives a dispatch through the link [68.64ms]
(pass) work reaches an agent through its link > a capless adapter still gets the not-placed boundary answer [68.34ms]

packages\orch\test\dispatch-prompt-file.test.ts:
(pass) a dispatch prompt can come from a file instead of argv > --file is parsed off the positionals [0.10ms]
(pass) a dispatch prompt can come from a file instead of argv > the file body is the prompt, apostrophes and newlines intact [6.87ms]
(pass) a dispatch prompt can come from a file instead of argv > without --file the positionals after the target are the prompt [0.06ms]
(pass) a dispatch prompt can come from a file instead of argv > a typed prompt and --file together is a refusal, never a silent winner [0.91ms]
(pass) a dispatch prompt can come from a file instead of argv > an empty file is refused: a dispatch with no prompt is not a dispatch [0.84ms]
(pass) a dispatch prompt can come from a file instead of argv > a missing file names itself in the refusal [0.15ms]
(pass) --with points the agent at context it opens on demand > --with is repeatable and parsed off the positionals [0.05ms]
(pass) --with points the agent at context it opens on demand > a file reference is absolute and typed as a file [1.18ms]
(pass) --with points the agent at context it opens on demand > a directory reference is typed as a directory [0.74ms]
(pass) --with points the agent at context it opens on demand > a missing path dies at dispatch, naming the flag [0.14ms]
(pass) --with points the agent at context it opens on demand > the task tells the agent where to look and to open paths only when needed; content is never inlined [0.07ms]
(pass) --with points the agent at context it opens on demand > no references leaves the instructions untouched

packages\orch\test\doctor-backends.test.ts:
(pass) doctor backend and presence checks > reports every registered backend and composed roles [6.58ms]
(pass) doctor backend and presence checks > passes with herdr active while an enabled tmux sits outside a session [0.04ms]
(pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.03ms]
(pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [0.03ms]
(pass) doctor backend and presence checks > fails when any enabled backend is unavailable, active or not [0.02ms]
(pass) doctor backend and presence checks > honours the configured default over the probe order [0.02ms]
(pass) doctor backend and presence checks > reports only records missing the current schema stamp [116.20ms]

packages\orch\test\doctor-checks.test.ts:
(pass) doctor provenance-depth checks > finds a live agent deeper than fleet.max_depth [83.91ms]
(pass) doctor provenance-depth checks > accepts a live agent at fleet.max_depth [66.86ms]
(pass) doctor unclaimed-agent checks > finds an old unclaimed live agent with its age [65.40ms]
(pass) doctor unclaimed-agent checks > ignores a claimed agent [63.64ms]
(pass) doctor unclaimed-agent checks > ignores a fresh unclaimed agent under the threshold [77.52ms]
(pass) doctor notification-sink checks > reports no sinks as healthy [1.32ms]
(pass) doctor notification-sink checks > rejects a webhook with a malformed URL [7.71ms]
(pass) doctor notification-sink checks > uses the notify-send prerequisite install command in desktop remediation [7.56ms]
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [7.90ms]
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [7.20ms]
(pass) doctor notification-sink checks > warns when a notifier omits done from its on list [8.68ms]
(pass) doctor notification-sink checks > does not warn when a notifier includes done in its on list [7.61ms]
(pass) doctor notification-sink checks > keeps unavailable notifier failures when done is omitted [7.08ms]

packages\orch\test\doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [24.22ms]
(pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [18.10ms]
(pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [29.85ms]
(pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [23.51ms]
(pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [18.82ms]
(pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [16.97ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [15.53ms]
(pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [17.37ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [54.34ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [0.93ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [7.76ms]

packages\orch\test\doctor-declared-vs-reality-tuning.test.ts:
(pass) doctor declared tuning versus reality > matching model and effort produces no finding [62.33ms]
(pass) doctor declared tuning versus reality > different effort reports both ladder specs [61.14ms]
(pass) doctor declared tuning versus reality > different model reports both ladder specs [60.09ms]
(pass) doctor declared tuning versus reality > missing status produces no tuning finding [61.06ms]

packages\orch\test\doctor-declared-vs-reality.test.ts:
(pass) doctor declared-vs-reality > describes composed and absent backend roles [6.37ms]
(pass) doctor declared-vs-reality > reports a lease whose recorded holder process is dead [63.21ms]
(pass) doctor declared-vs-reality > reports an environment handle missing from its plexer [57.03ms]
(pass) doctor declared-vs-reality > reports a live agent with no lease and no live spawner [64.92ms]
(pass) doctor declared-vs-reality > surfaces a missing task scope row as unrunnable [2306.08ms]
(pass) doctor declared-vs-reality > doctor -y does not delete an unrunnable task [2206.16ms]

packages\orch\test\doctor-orphan-daemons.test.ts:
(pass) doctor orphaned-daemon check > a live foreign lock is reported, and an unproven owner is never killable [2088.89ms]
(pass) doctor orphaned-daemon check > a dead pid's lock is not an orphan [2063.01ms]
(pass) doctor orphaned-daemon check > the caller's own orch dir is never reported against itself [2077.80ms]

packages\orch\test\doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env node as node [29.52ms]
(pass) shebangRuntime > reads #!/usr/bin/env bun as bun [6.97ms]
(pass) shebangRuntime > reads #!/usr/bin/env deno as deno [5.89ms]
(pass) shebangRuntime > reads #!/usr/local/bin/node as node [7.23ms]
(pass) shebangRuntime > does not mistake a longer binary name for a runtime [5.37ms]
(pass) shebangRuntime > returns null for a file with no shebang [12.09ms]
(pass) shebangRuntime > returns null for an unreadable path [0.47ms]
(pass) runningRuntime > reports the runtime this suite is executing under [0.04ms]
(pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [2.60ms]
(pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [1.97ms]
(pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [1.69ms]
(pass) doctor runtime verdict table > launching under bun while declaring node is fine [2.53ms]
(pass) doctor runtime verdict table > launching under node while declaring bun is fine [2.90ms]
(pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [2.00ms]
(pass) doctor runtime verdict table > declared runtime absent from PATH fails [1.50ms]
(pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [1.41ms]
(pass) doctor runtime verdict table > remediation names both directions ΓÇö rebuild, or re-record the declaration [1.37ms]
(pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [0.37ms]

packages\orch\test\doctor-settings-defects.test.ts:
(pass) doctor settings defects > accepts an absent settings file [1.08ms]
(pass) doctor settings defects > accepts a clean settings file and keeps its path detail [2.42ms]
(pass) doctor settings defects > reports malformed JSON as a file defect [1.01ms]
(pass) doctor settings defects > reports a read failure instead of throwing [0.78ms]
(pass) doctor settings defects > reports a stale key with the value that was written [7.43ms]
(pass) doctor settings defects > reports a typo with its suggested key [8.03ms]
(pass) doctor settings defects > reports the expected schema version [5.92ms]
(pass) doctor settings defects > skips settings-dependent checks with a short repair hint [2267.94ms]

packages\orch\test\doctor-settings-preservation.test.ts:
(pass) doctor settings preservation > yes mode leaves existing settings.json byte-identical [2498.18ms]

packages\orch\test\doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [2694.20ms]
(pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [2860.78ms]
(pass) doctor stale presence safety > no dead agents leaves nothing to remove [2429.25ms]
(pass) doctor stale presence safety > flags malformed presence directory names [2523.04ms]

packages\orch\test\doctor-unscoped-tasks.test.ts:
(pass) doctor task scopes > a facade-enqueued task has exactly one typed scope [75.27ms]
(pass) doctor task scopes > the database rejects an unscoped task instead of keeping a legacy queue row [49.05ms]
(pass) doctor task scopes > doctor lists unrunnable tasks and deliberate resolutions without deleting [55.04ms]

packages\orch\test\doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [0.14ms]
(pass) runDoctor > runs on an unconfigured install without failing for want of settings.json [2186.59ms]
(pass) runDoctor > checks a healthy store [2144.37ms]
(pass) runDoctor > warns when the store is absent [0.79ms]
(pass) runDoctor > fails when the store predates orch's migrations [50.91ms]
(pass) runDoctor > fails and names a missing store table [51.40ms]
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [2089.86ms]
(pass) runDoctor > reports an absent daemon as optional [2154.25ms]
(pass) runDoctor > reports and fixes a stale daemon lock [2096.81ms]
killed 1 dangling process
(fail) runDoctor > accepts a live daemon and an answerable socket [5034.47ms]
  ^ this test timed out after 5000ms.
(pass) runDoctor > warns when the live daemon code hash is stale [3411.04ms]
(pass) runDoctor > fails on an invalid lock and an unanswerable live socket [4510.67ms]
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [66.35ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [59.04ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [66.25ms]
(pass) runDoctor > reports a dead presence pid [2228.98ms]
(pass) runDoctor > bins check is driven by the enabled set and offers no fix [582.43ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [8.84ms]
killed 1 dangling process
killed 1 dangling process
killed 1 dangling process
killed 1 dangling process
killed 1 dangling process
(fail) runDoctor > validates configured notifier adapters [10666.11ms]
  ^ this test timed out after 5000ms.
(fail) runDoctor > reports invalid settings and accepts missing settings [5928.82ms]
  ^ this test timed out after 5000ms.
killed 1 dangling process
killed 1 dangling process
(fail) runDoctor > never throws when individual checks encounter broken inputs [6179.91ms]
  ^ this test timed out after 5000ms.

# Unhandled error between tests
-------------------------------
142 |       codeHash: computeCodeHash(entrypoint),
143 |       startedAt: new Date().toISOString(),
144 |     }));
145 | 
146 |     expect(check(await runTestDoctor(directory), "orchd")).toMatchObject({ status: "ok" });
147 |     expect(check(await runTestDoctor(directory), "orchd-socket")).toMatchObject({ status: "ok" });
                                                                        ^
error: expect(received).toMatchObject(expected)

  {
-   "status": "ok",
+   "detail": "orchd pid 27644 is not answerable: orchd did not answer in time (connect); its liveness is unknown; try orch daemon start",
+   "id": "orchd-socket",
+   "label": "orchd socket",
+   "status": "fail",
  }

- Expected  - 1
+ Received  + 4

      at <anonymous> (C:\dev\personal\orch\packages\orch\test\doctor.test.ts:147:67)
-------------------------------


packages\orch\test\environment-dictates-what-is-possible.test.ts:
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > a MOVE is a new environment record, and what is possible follows it at once [93.28ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > a move closes the interval it left, so history says WHERE it was and WHEN [73.42ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > moving one axis leaves every other axis exactly where it was [72.50ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > an UPGRADE is a NEW host_plexers row, not an overwrite of the old one [73.17ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > re-declaring the SAME version is not an upgrade and opens no second row [59.73ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > nothing anywhere records what an agent CAN do [52.06ms]

packages\orch\test\errno-guard.test.ts:
(pass) errnoCode reads a syscall error code, and only a real one > returns the code of a real node syscall error [0.57ms]
(pass) errnoCode reads a syscall error code, and only a real one > a plain Error carries no code, so there is none to report [0.16ms]
(pass) errnoCode reads a syscall error code, and only a real one > a non-object never yields a code instead of crashing on it [0.19ms]
(pass) errnoCode reads a syscall error code, and only a real one > a code-shaped field of the wrong type is not a code [0.08ms]
(pass) isAgentState verifies the state rather than asserting it > accepts a declared state [0.05ms]
(pass) isAgentState verifies the state rather than asserting it > rejects anything not declared, including non-strings [0.04ms]

packages\orch\test\event-bus.test.ts:
(pass) event bus > a throwing handler does not stop later handlers and is logged once [0.18ms]
(pass) event bus > unsubscribe removes only its own handler [0.06ms]
(pass) event bus > emit with no handlers is a no-op [0.03ms]

packages\orch\test\event-identity.test.ts:
(pass) published event identity > stamps a per-agent ordinal so a redelivery is recognizable [0.93ms]
(pass) the work loop is not a second presence-transition source > an agent state change publishes nothing from the queue loop [210.37ms]

packages\orch\test\events-open-with-pending-questions.test.ts:
(pass) events pending-question snapshot > a late watcher receives every open question through the event writer [65.54ms]

packages\orch\test\events-scope-notice.test.ts:
(pass) events scope notice > names the default live scope and its wideners [0.11ms]
(pass) events scope notice > names the all-agent live scope and its history widener [0.03ms]
(pass) events scope notice > a redirected stream is a harness reading transitions, and gets no banner [0.01ms]
(pass) events scope notice > does not announce when history was requested [0.05ms]
(pass) events scope notice > writes one notice before starting the live transport [0.18ms]
(pass) events scope notice > does not write a notice when history was requested [0.07ms]
(pass) events scope notice > says so when the caller owns no agents [0.08ms]
(pass) events scope notice > stays out of a --json stream, which a parser is reading [0.05ms]
(pass) events scope notice > does not announce when explicit targets were requested [0.03ms]

packages\orch\test\every-agent-has-a-link.test.ts:
(pass) every agent has an attached link > agents in placed, headless, and handleless environments receive the same push [140.88ms]
(pass) every agent has an attached link > an agent with no handle is still addressable through its link [82.16ms]

packages\orch\test\hello-environment.test.ts:
(pass) hello records the environment in full > the plexer the caller registered in is on the agent, not only on the host [70.46ms]
(pass) hello records the environment in full > the place the caller occupies in its plexer is recorded at hello [72.42ms]
(pass) hello records the environment in full > a session that moved to another place re-registers with the new one, and one row stays open [74.80ms]
(pass) hello records the environment in full > the space the caller registered in is recorded at hello, not inferred later [85.41ms]
(pass) hello records the environment in full > a session in no space and no plexer records neither, and that is an answer [67.79ms]
(pass) hello records the environment in full > re-registering the same session does not re-root or re-place it [75.05ms]
(pass) hello records the environment in full > the claim carries every environment fact hello has to record [68.75ms]

packages\orch\test\herdr-hud-environment.test.ts:
(pass) the herdr HUD reads its pane from the composer, never from the key > a herdr-placed agent reports the handle its environment carries [69.65ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > the handle follows the agent when it moves pane [69.52ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > an agent on another plexer is not a herdr pane [78.73ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > a process orch never launched is not a herdr pane [2.59ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > a key that is not a minted id resolves to no pane at all [1.92ms]

packages\orch\test\herdr-notify-busy.test.ts:
(pass) a herdr notification is delivered only when herdr says it was shown > shown is a delivery [0.14ms]
(pass) a herdr notification is delivered only when herdr says it was shown > busy is NOT a delivery, however herdr exited [0.01ms]
(pass) a herdr notification is delivered only when herdr says it was shown > every other refusal herdr can answer with is also not a delivery [0.06ms]
(pass) a herdr notification is delivered only when herdr says it was shown > output that is not a herdr answer is never read as a delivery [0.06ms]
(pass) a busy herdr is waited out, not dropped > a toast shown on the first try is sent once and waits for nothing [0.12ms]
(pass) a busy herdr is waited out, not dropped > a busy herdr is retried after a wait, and the retry is the delivery [0.03ms]
(pass) a busy herdr is waited out, not dropped > a herdr that stays busy gives up rather than blocking the daemon forever [0.02ms]
(pass) a busy herdr is waited out, not dropped > a refusal that waiting cannot fix is not retried [0.01ms]

packages\orch\test\herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [1.51ms]
(pass) herdr and notification hardening > falls back to a valid name when the identity key contains herdr-invalid separators [0.46ms]
(pass) herdr and notification hardening > nameless notifications use a space label, never a bare pane key [0.64ms]

packages\orch\test\hermetic-env.test.ts:
(pass) the test suite is hermetic > no plexer environment leaks in from the shell that launched bun [0.13ms]

packages\orch\test\holder-death-costs-a-driver.test.ts:
(pass) holder death costs a driver, not a life (D2) > the task in flight finishes and its result survives the holder [80.25ms]
(pass) holder death costs a driver, not a life (D2) > the lease closes `expired` ΓÇö not `released`, because no caller held it [74.47ms]
(pass) holder death costs a driver, not a life (D2) > the agent stays alive, unleased and adoptable ΓÇö nothing closes it [73.83ms]
(pass) holder death costs a driver, not a life (D2) > it receives no new work: the death hands the agent to nobody [74.55ms]
(pass) holder death costs a driver, not a life (D2) > expiry is recorded once and does not erase who held it [65.60ms]
(pass) holder death costs a driver, not a life (D2) > clearing a dead holder's lease is never refused, and is idempotent [66.12ms]

packages\orch\test\host.test.ts:
(pass) host > maps supported platforms [0.03ms]
(pass) host > rejects unsupported platforms [0.03ms]
(pass) host > guards host operating systems [0.05ms]
(pass) host > detects WSL from distro name or kernel release [0.04ms]
(pass) host > detects the current host [0.07ms]

packages\orch\test\identity-is-not-environment.test.ts:
(pass) A1 ΓÇö identity carries no environment > Identity declares no plexer and no plexer grouping [0.07ms]
(pass) A1 ΓÇö identity carries no environment > a key is the minted id itself, with no separator to split [0.03ms]
(pass) A1 ΓÇö identity carries no environment > the module never spells the sentinels that stand in for a missing place [0.02ms]
(pass) A1 ΓÇö identity carries no environment > minted ids are unique per spawn [1.15ms]

packages\orch\test\identity-launch.test.ts:
(pass) an unset launch credential is absent [0.14ms]
(pass) a minted launch credential is accepted [0.09ms]
(pass) a malformed launch credential is refused, never exited [0.17ms]

packages\orch\test\identity-self.test.ts:
(pass) selfIdentity > returns the launch id without touching the store [3.65ms]

packages\orch\test\identity.test.ts:
(pass) serializeIdentity / parseIdentity > a key is the minted id verbatim [0.03ms]
(pass) serializeIdentity / parseIdentity > round-trips a minted id [0.01ms]
(pass) serializeIdentity / parseIdentity > a key is one flat filesystem-safe segment with nothing to split [0.06ms]
(pass) serializeIdentity / parseIdentity > two spawns never collide, so no plexer is needed to namespace them [0.35ms]
(pass) isAgentId > accepts a minted id [0.01ms]
(pass) isAgentId > rejects everything that is not one [0.03ms]
(pass) malformed input > rejects malformed ids [0.02ms]

packages\orch\test\launch-model-gate.test.ts:
(pass) the model gate rules by harness membership, not by format > accepts a listed spec, with or without a thinking suffix [1.85ms]
(pass) the model gate rules by harness membership, not by format > refuses a ladder shorthand and names what the harness does offer [1.36ms]
(pass) the model gate rules by harness membership, not by format > accepts each harness's own vocabulary rather than one shared grammar [1.36ms]
(pass) the model gate rules by harness membership, not by format > cannot check a harness that publishes no catalogue, and does not pretend to [1.12ms]
(pass) short model names expand against the allowed harness catalogue > expands a short name with one listed match [1.71ms]
(pass) short model names expand against the allowed harness catalogue > reports multiple matches as ambiguous in sorted order [2.04ms]
(pass) short model names expand against the allowed harness catalogue > passes through a full listed spec [3.21ms]
(pass) short model names expand against the allowed harness catalogue > does not expand a match excluded by models.allowed [10.18ms]
(pass) the settings allowlist applies on top of harness membership > an empty allowlist restricts nothing beyond the harness list [2.49ms]
(pass) the settings allowlist applies on top of harness membership > a configured allowlist refuses a listed model outside its patterns [10.06ms]
(pass) the settings allowlist applies on top of harness membership > a spec no harness lists is refused by the harness, not the allowlist [3.00ms]
(pass) admission expands a short name through the same gate > expands a short name and keeps its thinking suffix [1.85ms]
(pass) admission expands a short name through the same gate > refuses an ambiguous short name by naming every candidate [1.80ms]
(pass) admission expands a short name through the same gate > a short name whose only matches the allowlist excludes is an allowlist refusal [8.83ms]
(pass) admission expands a short name through the same gate > the allowlist narrows an otherwise ambiguous short name to one match [10.11ms]

packages\orch\test\lease-authority.test.ts:
(pass) C3 foreign agents are untouchable > every driving verb is refused while a live foreign orch holds the lease [2062.05ms]
(pass) C3 foreign agents are untouchable > a DEAD foreign holder is not a collision [906.95ms]
(pass) C3 foreign agents are untouchable > the composed holder IS the open lease, with nothing beside it [480.47ms]
(pass) C4 steal > adopt refuses a live holder, and --steal takes it [859.93ms]
(pass) C4 steal > detach refuses a live holder, and --steal releases it [856.52ms]
(pass) C4a fencing token > lease ids are monotonic across handoff and adoption [77.70ms]
(pass) C4a fencing token > a stale fence cannot release the current holder's lease [78.07ms]
(pass) C4a fencing token > openLeaseId is null when nothing is leased [61.70ms]
(pass) C4b reads are never gated > status and events read straight through a live foreign lease [831.24ms]
(pass) C4c/C4d name resolution > duplicate names are legal and an ambiguous target asks for the id [64.18ms]
(pass) C4c/C4d name resolution > a unique name resolves, and an unknown target is a lookup miss [61.53ms]
(pass) C4e naming at creation > a nameless spawn is refused [0.44ms]
(pass) C4e naming at creation > a self-registering session gets <harness>-<first 8 of its id> [59.96ms]
(pass) C4f self-rename > an agent renames itself whether or not a lease is in force [455.13ms]
(pass) C4f self-rename > renaming another agent is driving and obeys the lease [879.20ms]
(pass) C4f self-rename > an invalid name is refused [61.87ms]
(pass) C5 a transfer does not disturb the agent > adoption writes lease rows and touches nothing else [470.40ms]
(pass) C7 live by lease, history by provenance > adoption moves the live view and leaves provenance untouched [457.02ms]

packages\orch\test\lifecycle-reports-a-partial-run.test.ts:
(pass) a partial reload or restart is reported, not exited > reload --json writes the whole payload and sets exitCode, never exits [93.56ms]
(pass) a partial reload or restart is reported, not exited > restart --json writes the whole payload and sets exitCode, never exits [61.70ms]

packages\orch\test\lifecycle-targets.test.ts:
(pass) lifecycle target resolution > prefers one live agent over dead ones sharing its name [0.19ms]
(pass) lifecycle target resolution > reports the target and disambiguating ids for live ambiguity [0.23ms]
(pass) lifecycle target resolution > cleanup can still resolve a dead agent when no live match exists [0.10ms]
(pass) lifecycle target resolution > an agent is addressable by its id, its name, or its pane handle [0.04ms]
(pass) lifecycle target resolution > the pane is environment: moving it leaves every other address intact [0.02ms]

packages\orch\test\log-level.test.ts:
(pass) the configured log level reaches every logger > the env var wins over settings.json [9.94ms]
(pass) the configured log level reaches every logger > settings.json is used when the env var is unset [9.94ms]
(pass) the configured log level reaches every logger > an unrecognised env value falls back to the configured level [4.38ms]
(pass) the configured log level reaches every logger > the CLI logger honours the configured level [9.35ms]
(pass) the configured log level reaches every logger > the CLI logger drops records below the configured level [2.72ms]
(pass) the configured log level reaches every logger > the daemon logger resolves through the same helper [12.90ms]

packages\orch\test\log-record.test.ts:
(pass) the one log record shape > writes one JSONL record per call, with an epoch-millis instant [11.31ms]
(pass) the one log record shape > a record below the configured level is not written at all [16.30ms]
(pass) the one log record shape > a correlation id rides every record of one dispatch, so one grep finds its whole life [18.71ms]
(pass) the one log record shape > agentId carries orch's minted id; a plexer handle is a field, never the identity [8.70ms]
(pass) the one log record shape > every level is orderable, lowest to highest [0.22ms]
(pass) the one log record shape > a malformed line is rejected by the guard rather than trusted [0.11ms]

packages\orch\test\nested-spawn-unleased.test.ts:
(pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the middle agent's death leaves the grandchild unleased, held by nobody [88.94ms]
(pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the grandchild stays alive and adoptable, and keeps its own provenance [69.48ms]
(pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the grandparent holding the middle agent does not extend to the grandchild [61.88ms]

packages\orch\test\no-placement-row-over-the-composed-view.test.ts:
(pass) no Placement row is reassembled over the composed view (2.1) > there is no second lookup module projecting the environment into a flat row [0.13ms]
(pass) no Placement row is reassembled over the composed view (2.1) > the space wall reads the OPEN space interval, so a moved agent is walled by where it IS [82.86ms]
(pass) no Placement row is reassembled over the composed view (2.1) > a string that names no registered agent is in no space rather than an error [48.24ms]

packages\orch\test\no-sibling-relay.test.ts:
(pass) a worker with no reachable spawner does not relay (L6) > an unset spawner refuses, and the refusal names the agent's own report path [77.47ms]
(pass) a worker with no reachable spawner does not relay (L6) > the refusal never suggests another agent as an alternative route [88.47ms]
(pass) a worker with no reachable spawner does not relay (L6) > a spawner that is stamped but has no live status record refuses by NAME and still says to report [67.35ms]

packages\orch\test\no-stderr-writes.test.ts:
(pass) orch has one diagnosis channel (the logger) and one output channel (stdout) > no runtime source writes to process.stderr [14.16ms]
(pass) orch has one diagnosis channel (the logger) and one output channel (stdout) > the scan actually covers the tree it claims to [1.37ms]

packages\orch\test\notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > reports notifier reachability from one configured entry [0.24ms]
(pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [0.49ms]
(pass) notifier registry and built-in adapters > a notifier error is the caller's real error [0.14ms]

packages\orch\test\notify-ding.test.ts:
(pass) notify/ding > the sound sink is a declared sink that takes no configuration [0.16ms]
(pass) notify/ding > this host names the players it would use, and says how to get one [0.05ms]
(pass) notify/ding > a command string runs through the host's own shell; argv is passed through untouched [0.02ms]

packages\orch\test\notify-event.test.ts:
(pass) notify events > accepts every event member [2.54ms]
(pass) notify events > rejects invalid event shapes [0.31ms]
(pass) notify events > reads agent state only from state events [0.03ms]

packages\orch\test\notify-events-format.test.ts:
(pass) notification and presence event formatting > spaceColor is stable and returns a palette hex [0.09ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.10ms]
(pass) notification and presence event formatting > named events prefer the human name over the harness id [0.02ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.07ms]
(pass) notification and presence event formatting > message notification titles contain delivered mail text [0.02ms]
(pass) notification and presence event formatting > webhook payload includes space and spaceColor [0.37ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [60.03ms]
(pass) notification and presence event formatting > transitionEventFromRow composes the space from the agent's environment [54.42ms]

packages\orch\test\notify-router.test.ts:
(pass) notify router > delivers only when on includes the event state [0.87ms]
(pass) notify router > passes typed webhook and command configuration [3.45ms]
(pass) notify router > surfaces notifier errors [0.21ms]

packages\orch\test\notify-sinks.test.ts:
(pass) notification entries > desktop entries use the canonical notifier registry [0.18ms]

packages\orch\test\notify.test.ts:
(pass) notification routing > an excluded state does not invoke its notifier [0.10ms]

packages\orch\test\offline-is-not-a-second-source.test.ts:
(pass) --offline is a narrower view of ONE source, not a second one (M8) > offline and online read the same agents from the same presence files [782.39ms]
(pass) --offline is a narrower view of ONE source, not a second one (M8) > offline reports the SAME state the agent reported, never a second opinion [414.08ms]
(pass) --offline is a narrower view of ONE source, not a second one (M8) > there is exactly ONE row builder, and --offline only narrows what it asks [0.30ms]
(pass) --offline is a narrower view of ONE source, not a second one (M8) > offline is the one path that never dials or starts the daemon [0.09ms]

packages\orch\test\one-bind-for-the-unix-endpoint.test.ts:

# Unhandled error between tests
-------------------------------
16 |  * the EADDRINUSE recovery, then repeated the success tail (companion TCP, endpoint,
17 |  * result) beside it. Two copies of one sequence means a fact added to the endpoint
18 |  * lands in one of them: the recovered daemon and the fresh one stop agreeing about
19 |  * where they are reachable.
20 |  */
21 | const RPC_SOURCE = readFileSync(join(import.meta.dir, "..", "src", "daemon", "rpc", "server.ts"), "utf8");
                        ^
ENOENT: no such file or directory, open 'C:\dev\personal\orch\packages\orch\src\daemon\rpc\server.ts'
    path: "C:\\dev\\personal\\orch\\packages\\orch\\src\\daemon\\rpc\\server.ts",
 syscall: "open",
   errno: -4058,
    code: "ENOENT"

      at C:\dev\personal\orch\packages\orch\test\one-bind-for-the-unix-endpoint.test.ts:21:20
-------------------------------


packages\orch\test\one-control-dispatcher.test.ts:
(pass) there is exactly one control dispatcher > no module outside src/control declares a control dispatcher [8.54ms]
(pass) there is exactly one control dispatcher > no dispatcher is exported under two names [8.38ms]

packages\orch\test\one-query-stack-over-the-connection.test.ts:
(pass) one query stack over the connection (2.3) > the store exposes no raw-SQL port beside the typed one [0.04ms]
(pass) one query stack over the connection (2.3) > nothing in the repo prepares a statement through the deleted port [22.87ms]

packages\orch\test\one-retry-policy.test.ts:
(pass) one retry policy > retries flaky async and sync operations through the shared helper [0.25ms]
(pass) one retry policy > uses the policy's declared backoff schedule [0.08ms]
(pass) one retry policy > surfaces the last error after exactly attempts tries [0.14ms]

packages\orch\test\one-shape-only.test.ts:
(pass) one current shape only > a live presence record with a malformed identity is a doctor failure [1.82ms]
(pass) one current shape only > doctor backend reports have one detection spelling [5.47ms]

packages\orch\test\one-spelling-per-fact.test.ts:
(pass) one spelling per shared fact > host OS and the store agree for an injected Windows platform [47.15ms]
(pass) one spelling per shared fact > the shared record guard rejects arrays and null [0.35ms]
(pass) one spelling per shared fact > removed identity method has no source spelling [11.67ms]
(pass) one spelling per shared fact > settings reads have no literal fallbacks [10.93ms]
64 |     const oldCount = files.reduce((count, file) => count + (readFileSync(file, "utf8").match(oldPattern)?.length ?? 0), 0);
65 |     expect(oldCount).toBe(0);
66 |     const idName = ["ORCH_AGENT", "ID"].join("_");
67 |     const idPattern = new RegExp(idName, "g");
68 |     const idInTests = walk(join(packageRoot, "test")).reduce((count, file) => count + (readFileSync(file, "utf8").match(idPattern)?.length ?? 0), 0);
69 |     expect(idInTests).toBe(1);
                           ^
error: expect(received).toBe(expected)

Expected: 1
Received: 2

      at <anonymous> (C:\dev\personal\orch\packages\orch\test\one-spelling-per-fact.test.ts:69:23)
(fail) one spelling per shared fact > launch env has one spelling [27.14ms]
(pass) one spelling per shared fact > removed spawn cap has no source or README spelling [11.75ms]

packages\orch\test\one-writer-records-a-spawned-agent.test.ts:
(pass) one writer records a spawned agent (2.1) > registerSpawnedAgent alone writes the COMPLETE record ΓÇö space and lease included [74.68ms]
(pass) one writer records a spawned agent (2.1) > a spawn leaves NOTHING for a second writer to fill in [759.40ms]
(pass) one writer records a spawned agent (2.1) > a spawn into NO space records no space and hands the plexer only its coordinate [737.10ms]
(pass) one writer records a spawned agent (2.1) > the presence store no longer offers a second way to record an agent [0.20ms]

packages\orch\test\orch-bugs-4-5.test.ts:
(pass) orch bugs 4 and 5 launch contracts > interactive launch routes use one argv composition [0.36ms]
(pass) orch bugs 4 and 5 launch contracts > headless launch routes use one argv composition [0.07ms]
(pass) orch bugs 4 and 5 launch contracts > inherited extension policy emits every discovered extension [0.05ms]

packages\orch\test\orchd-rpc-reconnect.test.ts:
(pass) RPC JSON framing > rejects malformed object that only has an id [0.34ms]
(pass) RPC JSON framing > parses split and multiple newline-delimited frames [19.59ms]
(pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [1084.34ms]
(pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1079.01ms]

packages\orch\test\orchd-rpc-replay.test.ts:
(pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [52.78ms]
(pass) orchd RPC replay buffer > replays from inside the surviving range without a gap [55.07ms]
(pass) orchd RPC replay buffer > reports a gap when the requested sequence predates retained history [53.73ms]
(pass) orchd RPC replay buffer > empty history has no gap or oldest sequence [37.18ms]
(pass) orchd RPC replay buffer > limits replay size without pruning durable events [2193.10ms]

packages\orch\test\orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [123.90ms]

packages\orch\test\orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [9.07ms]
(pass) orchd RPC transports > round-trips over the TCP fallback transport [15.74ms]

packages\orch\test\os-executors.test.ts:
(pass) cross-OS execution is a backend, not a peer daemon > the local side supplies start, is-alive and kill [0.17ms]
(pass) cross-OS execution is a backend, not a peer daemon > an OS side with no executor answers, and never runs the body [0.09ms]
(pass) cross-OS execution is a backend, not a peer daemon > the local side runs the body and hands back its value [0.05ms]
(pass) cross-OS execution is a backend, not a peer daemon > doctor passes a daemon registered on the side orch is running on [1398.78ms]
(pass) cross-OS execution is a backend, not a peer daemon > doctor answers, rather than failing, for a daemon on a side with no executor [1049.95ms]

packages\orch\test\outbox-ack.test.ts:
(pass) socket outbox acknowledgements > an ack settles an awaiting row and later delivery skips it [60.12ms]
(pass) socket outbox acknowledgements > a detached bridge retries a pending row and logs the reason [59.40ms]
(pass) socket outbox acknowledgements > a gone agent settles its row as undeliverable on the first attempt [51.74ms]
(pass) socket outbox acknowledgements > failed delivery at the cap settles, while one attempt earlier retries [81.29ms]
(pass) socket outbox acknowledgements > redelivery covers every open row for one target, regardless of nextAttemptAt [70.66ms]
(pass) socket outbox acknowledgements > open-row selection excludes settled rows [56.32ms]
(pass) socket outbox acknowledgements > malformed stored payloads are rejected [50.49ms]

packages\orch\test\outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [92.30ms]

packages\orch\test\outbox.test.ts:
(pass) outbox delivery > selects pending messages and delivers each message once [56.48ms]
(pass) outbox delivery > checks one message's pending state without scanning the outbox [53.84ms]
(pass) outbox delivery > keeps failed messages pending until their backoff expires [53.08ms]

packages\orch\test\owner-scoping.test.ts:
(pass) fleet ownership scoping > fleet visibility follows provenance depth, not caller environment [152.66ms]
(pass) fleet ownership scoping > owner token uses ORCH_OWNER, else this process's own minted id [723.14ms]
(pass) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [753.48ms]
(pass) fleet ownership scoping > close --all works without an owner token [1305.34ms]
skipping caller: unknown backend null (reaping the record)
skipping other: unknown backend null (reaping the record)
{"closed":["caller","klmine0001","klforeign1","other"],"results":[{"target":"caller","handle":null,"outcome":"done","error":null},{"target":"klmine0001","handle":"mine","outcome":"done","error":null},{"target":"klforeign1","handle":"foreign","outcome":"done","error":null},{"target":"other","handle":null,"outcome":"done","error":null}],"requested":4,"ok":4,"stream":false}
(pass) fleet ownership scoping > close --all closes all managed records regardless of owner [1864.77ms]
(pass) fleet ownership scoping > driving verbs remain gated against a live foreign holder [5042.71ms]
(pass) fleet ownership scoping > result refuses a foreign-owned agent and names its owner [1578.64ms]
(pass) fleet ownership scoping > pane mutations refuse a foreign-owned agent and name its owner [3583.18ms]
(pass) fleet ownership scoping > close has no force option and remains unconditional without it [3173.64ms]
{"closed":["kmismatch1"],"results":[{"target":"kmismatch1","handle":"{\"pid\":34464,\"key\":\"kmismatch1\"}","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) fleet ownership scoping > close cleans up a mismatched recorded process without signalling [1555.68ms]
(pass) a spawned agent touches only what it spawned > a spawned agent acts as its own minted id, not its launch key [26.43ms]
(pass) a spawned agent touches only what it spawned > --cross-space from a spawned agent is refused [325.41ms]
(pass) a spawned agent touches only what it spawned > close --all from an AGENT sweeps only its own subtree [335.16ms]
(pass) a spawned agent touches only what it spawned > close --all from the HUMAN sweeps every managed spawn, whoever spawned it [1826.88ms]
(pass) a spawned agent touches only what it spawned > close from a spawned agent is REFUSED when the target is not its own [257.28ms]
(pass) a spawned agent touches only what it spawned > close from a spawned agent SUCCEEDS on a slave it spawned itself [280.53ms]
(pass) a spawned agent touches only what it spawned > the workspace operator keeps control of an agent-owned fleet [988.57ms]

packages\orch\test\pack-gets-its-own-home.test.ts:
(pass) a pack gets its own marked plexer home (E8, E9, E10) > the coordinate is STORED against the pack and is never orch's own id [74.57ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > the home orch opens is MARKED as orch's, never a bare directory name [61.86ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > a space's home and a pack's home use the SAME role and different tables [59.82ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > a home recorded in another plexer is not this one's to drive [51.82ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > closing a pack's home clears the row, so the next open is a fresh one [58.12ms]

packages\orch\test\pack-membership.test.ts:
(pass) a pack is the provenance root > a registered session is an orch of a pack of one [58.44ms]
(pass) a pack is the provenance root > membership is inherited from the spawner at any depth, never re-rooted [59.75ms]
(pass) a pack is the provenance root > every agent is in exactly one pack, and two packs never share a member [65.04ms]
(pass) a pack is the provenance root > a pack of one grows without re-rooting, and the root stays the orch [56.06ms]
(pass) a pack is the provenance root > a lease or a move never changes which pack an agent is in [63.83ms]
(pass) a pack is the provenance root > an agent cannot be spawned by someone who does not exist [49.04ms]

packages\orch\test\parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [0.04ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.03ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.05ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.02ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.03ms]

packages\orch\test\peer-identity.test.ts:
(pass) spawner identity > a bare operator with no session markers is just the operator [389.85ms]
(pass) spawner identity > an unregistered Claude Code session is labelled by its harness, with no id [372.42ms]
(pass) spawner identity > a session orch has registered IS addressable, by the id orch minted [52.58ms]
(pass) spawner identity > an unregistered session has no id to hand out, and does not invent one [0.82ms]
(pass) spawner identity > an orch-spawned orchestrator acts as the id orch minted for it [68.36ms]
(pass) spawner identity > agentIdentityEnv stamps a reply address only when the spawner has one [0.34ms]
(pass) spawner identity > worktreeEnv stamps worktree identity only for isolated agents [0.14ms]
(pass) spawner identity > the registry keeps the exact spawning session distinct from the lease holder [76.32ms]
(pass) the spawner address invariant > an UNREGISTERED session stamps no address, so no worker is handed an unreachable one [1.19ms]
(pass) the spawner address invariant > a bare operator stamps no address [384.29ms]
(pass) the spawner address invariant > an address that IS stamped resolves to a live status record [59.52ms]
(pass) peer identity in messaging > peer summaries render an unplaced agent without a local place name [68.70ms]
(pass) peer identity in messaging > orch_send reports the peer's NAME and calls the message RPC [83.34ms]
(pass) peer identity in messaging > orch_send reports queued when the message is not acknowledged [71.13ms]
(pass) peer identity in messaging > orch_send reports when the daemon is unreachable [72.97ms]
(pass) peer identity in messaging > peers resolve by display name exactly like by key [65.89ms]
(pass) peer identity in messaging > "spawner" reaches the stamped spawner session across fleet scoping [66.98ms]
(pass) peer identity in messaging > a spawner with no live status record is refused BY NAME, not with a bare key [57.95ms]

packages\orch\test\peer-lease-visibility.test.ts:
(pass) peer summaries carry ownership as a lease > a peer the caller holds reports the caller as the live holder [1128.24ms]
(pass) peer summaries carry ownership as a lease > a peer nobody ever took reports no orch driving it [819.76ms]
(pass) peer summaries carry ownership as a lease > a dead holder is not a live one [794.82ms]
(pass) the compact listing separates orphans from live work > unleased peers sit in their own bucket, below the driven ones [1118.63ms]
(pass) the compact listing separates orphans from live work > a held peer names its holder, and an unleased one never reads as yours [1105.03ms]
(pass) the compact listing separates orphans from live work > with nothing unleased the bucket does not appear at all [1128.33ms]

packages\orch\test\peer-project-scope.test.ts:
(pass) peer discovery walls on the project > a same-workspace peer from another project is invisible by default [102.90ms]
(pass) peer discovery walls on the project > all_workspaces deliberately lifts the project wall [69.26ms]
(pass) peer discovery walls on the project > a cross-project target does not resolve for sends without the explicit flag [62.55ms]
78 |     const directory = makeOrchDir();
79 |     seedAgent("unstamped1", {}, directory);
80 |     seedLiveProcess(directory, "unstamped1");
81 |     seedStatus(directory, "unstamped1", { pid: process.pid, state: "working", project: undefined });
82 | 
83 |     expect(await peerSummaries(directory, daemonClientForPeers(directory, ["unstamped1"]), ownKey)).toEqual([]);
                                                                                                         ^
error: expect(received).toEqual(expected)

- []
+ [
+   {
+     "branch": undefined,
+     "cost": undefined,
+     "drive": {
+       "kind": "unleased",
+       "mine": false,
+       "owner": "no orch driving it",
+     },
+     "harness": "pi",
+     "isSpawner": undefined,
+     "key": "unstamped1",
+     "lastText": "",
+     "model": undefined,
+     "name": "unstamped1",
+     "space": null,
+     "spawnedBy": undefined,
+     "spawnedByLabel": undefined,
+     "state": "working",
+     "task": undefined,
+     "updatedAt": undefined,
+     "worktree": undefined,
+   },
+ ]

- Expected  - 1
+ Received  + 24

      at <anonymous> (C:\dev\personal\orch\packages\orch\test\peer-project-scope.test.ts:83:101)
(fail) peer discovery walls on the project > a record with no project stamp is malformed and never listed [69.91ms]
(pass) peer discovery walls on the project > a spawned agent's all_workspaces flag is ignored [85.90ms]
(pass) peer discovery walls on the project > a worker sees its orchestrator in visible and peers [78.19ms]

packages\orch\test\peer-tools-registration.test.ts:
(pass) peer tool registration > does not register orch_send when no spawner address exists [1.62ms]
(pass) peer tool registration > does not register orch_send when the spawner pid is dead [59.98ms]
(pass) peer tool registration > registers orch_send when the spawner has a live status record [68.07ms]

packages\orch\test\pi-model-control.test.ts:
(pass) splitThinkingSuffix > splits a valid ladder effort off the bare id [0.05ms]
(pass) splitThinkingSuffix > leaves a bare model untouched [0.02ms]
(pass) splitThinkingSuffix > keeps a trailing colon token that is not a thinking level as part of the id [0.01ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > looks up the BARE id and returns the effort suffix separately [0.17ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > retries until a still-booting registry answers [13.20ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > throws when the registry never yields the model [0.21ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > rejects a token without a provider/id shape [0.05ms]
(pass) createModelControl.applyControlCommand > applies a suffixed model command and reports a success outcome [0.39ms]
(pass) createModelControl.applyControlCommand > reports a failure outcome when the model is rejected [1760.01ms]

packages\orch\test\pid-liveness.test.ts:
(pass) pidAlive liveness contract (shared by pi peers) > EPERM means the process exists under another user ΓÇö alive [0.10ms]
(pass) pidAlive liveness contract (shared by pi peers) > ESRCH means no such process ΓÇö dead [0.01ms]
(pass) pidAlive liveness contract (shared by pi peers) > the current process is alive [0.02ms]
(pass) pidAlive liveness contract (shared by pi peers) > non-positive and non-numeric pids are rejected without signalling [0.03ms]

packages\orch\test\plexer-versions.test.ts:
(pass) plexer version support > a floor admits every version at or above it [0.32ms]
(pass) plexer version support > compares numeric versions rather than lexical strings [0.02ms]
(pass) plexer version support > rotates one open host install row when the plexer changes version [61.37ms]
(pass) plexer version support > doctor names both versions and tells the operator to update the plexer [0.15ms]
(pass) plexer version support > a supported plexer the user never installed is not a complaint [0.03ms]
(pass) plexer version support > an in-range install reports ok with the version it read [0.05ms]
(pass) plexer version support > a compatible server rides along on the row without complaint [0.02ms]
(pass) plexer version support > a server the installed client outgrew fails and names the restart [0.03ms]
(pass) plexer version support > a server that reports no compatibility is unknown, never a failure [0.03ms]
(pass) plexer version support > a plexer with no server running says nothing about one [0.02ms]
(pass) plexer version support > only an installed plexer that cannot report a version warns [0.02ms]

packages\orch\test\port-has-no-shell.test.ts:
(pass) the backend port has no dead workspace shell > backend types contain neither deleted declaration [0.12ms]
(pass) the backend port has no dead workspace shell > src contains no workspaceNames calls or BackendWorkspace references [9.14ms]

packages\orch\test\port-no-optional-methods.test.ts:
(pass) the environment port declares capability by composition, never by optionality > src/types/backend.ts has no optional methods on any port interface [0.41ms]
(pass) the environment port declares capability by composition, never by optionality > the deleted capability flags bag is gone, not merely unimplemented [0.12ms]
(pass) the environment port declares capability by composition, never by optionality > src/types/adapter.ts has no optional methods on the harness port either [0.22ms]

packages\orch\test\port-seam-boundary.test.ts:
(pass) port seam command boundary > headless target is answered without invoking its pane role [0.06ms]
(pass) port seam command boundary > paned environment without a role is answered at the boundary [0.01ms]
(pass) port seam command boundary > an invocation preserves the provider failure [0.04ms]

packages\orch\test\port-seam-channel.test.ts:
(pass) orch bridge links and capture roles > headless delivery reaches the link and the ack settles its outbox row [80.30ms]
(pass) orch bridge links and capture roles > live session delivery settles mail without a bridge or pane route [72.69ms]
(pass) orch bridge links and capture roles > a spawned agent whose bridge is detached stays queued for that bridge [81.72ms]
(pass) orch bridge links and capture roles > mail under mail.delivery prompt waits for the recipient's bridge like a steer [81.54ms]
(pass) orch bridge links and capture roles > mail under mail.delivery events settles on the recipient's stream, never its input [116.97ms]
(pass) orch bridge links and capture roles > mail under mail.delivery events to a dead recipient is undeliverable [113.68ms]
(pass) orch bridge links and capture roles > dead session without a bridge or pane route is undeliverable [87.80ms]
162 |     fs.mkdirSync(agentDir, { recursive: true });
163 |     mergeAgentStatus(orchDir, key, { state: "done" }, Date.now());
164 |     writeResult(agentDir, { schema: PRESENCE_SCHEMA, key, text: "captured result" });
165 | 
166 |     const captured = createCaptureRole(orchDir).read(key, { source: "all" });
167 |     expect(captured.status).toMatchObject({ key, state: "done" });
                                  ^
error: expect(received).toMatchObject(expected)

  {
-   "key": "capturedg1",
+   "agentId": "capturedg1",
+   "blockedMessage": null,
+   "cacheRead": null,
+   "cacheWrite": null,
+   "contextPercent": null,
+   "contextTokens": null,
+   "cost": null,
+   "currentFile": null,
+   "dispatchId": null,
+   "extensionHash": null,
+   "filesTouched": null,
+   "finishedAt": null,
+   "lastError": null,
+   "lastText": null,
+   "modelId": null,
+   "modelProvider": null,
+   "project": null,
+   "sessionId": null,
+   "sessionPath": null,
+   "startedAt": null,
    "state": "done",
+   "task": null,
+   "thinking": null,
+   "tokensIn": null,
+   "tokensOut": null,
+   "turns": null,
+   "updatedAt": 1789396360679,
  }

- Expected  - 1
+ Received  + 26

      at <anonymous> (C:\dev\personal\orch\packages\orch\test\port-seam-channel.test.ts:167:29)
(fail) orch bridge links and capture roles > capture reads status and result from the orch presence record [76.57ms]

packages\orch\test\port-seam-errors.test.ts:
(pass) port seam error contract > provider mutation errors preserve argv, exit status, stderr, and stdout [2.35ms]
(pass) port seam error contract > provider query errors throw instead of returning a sentinel [0.13ms]

packages\orch\test\presence-dirs-are-reaped-not-migrated.test.ts:
(pass) a presence dir in the old shape is reaped, never migrated (J4) > a composite-named dir is not presence, whatever its file claims [89.29ms]
(pass) a presence dir in the old shape is reaped, never migrated (J4) > the sweep REMOVES it rather than leaving it for a migration that never comes [64.18ms]
(pass) a presence dir in the old shape is reaped, never migrated (J4) > nothing renames, rewrites or re-keys the old directory [1.41ms]
(pass) a presence dir in the old shape is reaped, never migrated (J4) > a dead dir in the CURRENT shape is still reaped the ordinary way [63.96ms]

packages\orch\test\provenance.test.ts:
(pass) the one provenance walk > ancestors are parent-first, root last [0.11ms]
(pass) the one provenance walk > depth counts hops to the root [0.02ms]
(pass) the one provenance walk > an unknown id is its own root at depth 0 [0.03ms]
(pass) the one provenance walk > an unknown parent ends the chain instead of throwing [0.02ms]
(pass) the one provenance walk > descendant is any depth, never self, never a sibling tree [0.02ms]
(pass) the one provenance walk > a cycle terminates [0.01ms]

packages\orch\test\queue-cli-scope.test.ts:
(pass) Cq2: all three scopes are choosable at enqueue > --agent, --pack and --space each select exactly one typed scope [65.03ms]
(pass) Cq2: all three scopes are choosable at enqueue > a name resolves to one id, and an ambiguous name asks for the id [77.62ms]
(pass) Cq2: all three scopes are choosable at enqueue > two scope flags at once are refused [79.58ms]
(pass) Cq9: reading the queue is open > listing and history carry no caller and hide no other pack's work [100.20ms]

packages\orch\test\queue-reaping.test.ts:
(pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > a failed task whose scope is gone is unrunnable and survives every retention sweep [107.41ms]
(pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > unrunnable is about who is alive now ΓÇö a new pack member makes it claimable again [94.03ms]
(pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > stale is surfaced beside its state and never deleted on age [84.90ms]
(pass) Cq12: an orphaned task has take-on, leave and reap, all deliberate > take-on re-scopes to the taker's own pack and the work becomes claimable there [88.10ms]
(pass) Cq12: an orphaned task has take-on, leave and reap, all deliberate > take-on refuses a taker that is not itself live [98.60ms]

packages\orch\test\queue-scope.test.ts:
(pass) queue scope invariants > a failed pack task retries on another pack member, while an agent task stays pinned [129.41ms]
(pass) queue scope invariants > cancel is allowed for the enqueuer or a lease holder of a targeted agent [94.12ms]
(pass) queue scope invariants > cancel refuses a caller who is neither enqueuer nor targeted lease holder [91.37ms]
(pass) queue scope invariants > edit is allowed only for the enqueuer while queued [94.56ms]
(pass) queue scope invariants > an orphan has exactly take-on, leave, and reap resolutions [103.73ms]
(pass) queue scope invariants > stale queued work is surfaced distinctly and never deleted by age [102.07ms]
(pass) queue scope invariants > two concurrent claims have one winner and one one_open_attempt violation [117.83ms]

packages\orch\test\queue-space-replay.test.ts:
(pass) queue replay keeps typed scope > stored scope offers pack work only to that pack [76.94ms]

packages\orch\test\queue.test.ts:
(pass) queue facade on tasks and attempts > malformed task options are refused instead of handed back as TaskOptions [95.88ms]
(pass) queue facade on tasks and attempts > enqueue selects exactly one typed scope and defaults to the enqueuer pack [92.54ms]
(pass) queue facade on tasks and attempts > agent scope requires the enqueuer to lease the target [96.17ms]
(pass) queue facade on tasks and attempts > Cq1: the gate is on enqueuing into a scope, and adoption earns it [103.59ms]
(pass) queue facade on tasks and attempts > Cq1: a pack drains its queue with its orch dead and no lease in force [101.48ms]
(pass) queue facade on tasks and attempts > claiming excludes another pack and space claims require open intake [103.54ms]
(pass) queue facade on tasks and attempts > Cq3: a space-scoped task is an offer, and only an opted-in pack consumes it [108.97ms]
(pass) queue facade on tasks and attempts > a failed pack attempt retries on another member, never outside the pack [77.99ms]
(pass) queue facade on tasks and attempts > Cq5: an agent-scoped binding is to the agent and survives adoption [72.51ms]
(pass) queue facade on tasks and attempts > Cq13: adoption carries the queue ΓÇö pack work comes with the agents [82.96ms]
(pass) queue facade on tasks and attempts > a claim is an insert and a lost race returns false [69.62ms]
(pass) queue facade on tasks and attempts > cancel rights are enqueuer, targeted agent's leasing orch, or human [82.40ms]
(pass) queue facade on tasks and attempts > Cq7: origin_workspace is gone from the tasks table, scope replaces it [60.52ms]
(pass) queue facade on tasks and attempts > state and attempt-derived values have no legacy flattened fields [75.95ms]

packages\orch\test\reap-picker.test.ts:
(pass) reapCandidates > classifies unleased dead holders and leased dead processes [36.01ms]
(pass) reapCandidates > classifies empty input [0.11ms]
(pass) cmdReap > prints the --dead --json result shape [62.27ms]
(pass) cmdReap > refuses bare reap when stdin is not a TTY [0.46ms]

packages\orch\test\reap-walks-provenance.test.ts:
(pass) reap walks the provenance tree (H3) > an ended agent with a still-present descendant is NOT reaped [69.81ms]
69 |     end(d, "grand", 12);
70 | 
71 |     // The leaf has no descendants, so it goes first.
72 |     sweepExpiredRows(d, retention(), FAR_FUTURE);
73 |     expect(agentView(d, "grand")).toBeNull();
74 |     expect(agentView(d, "child")).not.toBeNull();
                                           ^
error: expect(received).not.toBeNull()

Received: null

      at <anonymous> (C:\dev\personal\orch\packages\orch\test\reap-walks-provenance.test.ts:74:39)
(fail) reap walks the provenance tree (H3) > the tree is reaped from the LEAF up, one sweep per level [66.85ms]
90 |     sweepExpiredRows(d, retention(), FAR_FUTURE);
91 |     sweepExpiredRows(d, retention(), FAR_FUTURE);
92 | 
93 |     // Nothing in the chain may go while the leaf is alive: deleting `child`
94 |     // would erase the grandchild's provenance while the grandchild still runs.
95 |     expect(agentView(d, "grand")?.endedAt).toBeNull();
                                                ^
error: expect(received).toBeNull()

Received: undefined

      at <anonymous> (C:\dev\personal\orch\packages\orch\test\reap-walks-provenance.test.ts:95:44)
(fail) reap walks the provenance tree (H3) > a LIVE descendant blocks the reap even when the parent ended long ago [72.06ms]
(pass) reap walks the provenance tree (H3) > provenance has no ON DELETE CASCADE, so no reap can erase a subtree [55.93ms]

packages\orch\test\recipient-label.test.ts:
(pass) agent identity shown to an operator > names the agent and its harness, never the transport key [0.06ms]
(pass) agent identity shown to an operator > drops the routing prefix when nothing is known about it [0.02ms]
(pass) agent identity shown to an operator > a nameless agent gets a stable logical name, not its key [0.05ms]

packages\orch\test\reload-no-bundle-write.test.ts:
{"results":[],"ok":0,"total":0,"hard":false,"signaled":"reload.signal"}
(pass) reload > does not write installed extension bundles [13.33ms]

packages\orch\test\remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [95.78ms]
(pass) async remote fan-out > returns a typed dead-host failure [81.91ms]
(pass) async remote fan-out > returns a typed timeout failure [516.45ms]
(pass) async remote fan-out > returns a typed non-JSON failure [82.23ms]
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [537.55ms]

packages\orch\test\remote.test.ts:
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.11ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.04ms]

packages\orch\test\rename-syncs-the-pane-border.test.ts:
(pass) orch rename syncs the pane border in one command (U5) > one rename sets orch's name AND the plexer chrome [464.36ms]
(pass) orch rename syncs the pane border in one command (U5) > the response states the two outcomes SEPARATELY [467.80ms]
(pass) orch rename syncs the pane border in one command (U5) > a plexer that refuses the chrome never unwrites orch's own name [485.28ms]
(pass) orch rename syncs the pane border in one command (U5) > --pane still gives the border something DIFFERENT, and leaves the name alone [468.33ms]

packages\orch\test\reset-build-safety.test.ts:
(pass) build reset safety > --build dry-run never names a path inside ORCH_DIR [1881.11ms]

packages\orch\test\retention.test.ts:
(pass) retention sweep > retention windows are independently configurable [57.78ms]
113 |     markOutboxDelivered(orchDir, "out-new");
114 |     appendEvent(orchDir, Date.parse("2026-01-20T00:00:00.000Z"), { id: "event-old" });
115 |     appendEvent(orchDir, Date.parse("2026-01-30T00:00:00.000Z"), { id: "event-new" });
116 |     upsertRun(orchDir, run("run-old", "2025-12-20T00:00:00.000Z"));
117 |     upsertRun(orchDir, run("run-new", "2026-01-20T00:00:00.000Z"));
118 |     expect(sweepExpiredRows(orchDir, settingsFixture({ queue_days: 14, events_days: 3, runs_days: 30, outbox_days: 7 }), NOW)).toEqual({
                                                                                                                                     ^
error: expect(received).toEqual(expected)

  {
    "control_outcomes": 0,
-   "ended_agents": 0,
+   "ended_agents": 1,
    "events": 1,
    "logs": 0,
    "outbox": 1,
    "queue": 1,
    "runs": 1,
  }

- Expected  - 1
+ Received  + 1

      at <anonymous> (C:\dev\personal\orch\packages\orch\test\retention.test.ts:118:128)
(fail) retention sweep > uses each table's own window and keeps queued and claimed tasks [161.89ms]
125 |   });
126 | 
127 |   test("returns zero counts when every row is inside its window", () => {
128 |     const orchDir = fixture();
129 |     seedQueueTask(orchDir, "queue", "done", "2026-01-31T00:00:00.000Z");
130 |     expect(sweepExpiredRows(orchDir, settingsFixture(), NOW)).toEqual({ queue: 0, outbox: 0, control_outcomes: 0, events: 0, runs: 0, ended_agents: 0, logs: 0 });
                                                                    ^
error: expect(received).toEqual(expected)

  {
    "control_outcomes": 0,
-   "ended_agents": 0,
+   "ended_agents": 1,
    "events": 0,
    "logs": 0,
    "outbox": 0,
    "queue": 0,
    "runs": 0,
  }

- Expected  - 1
+ Received  + 1

      at <anonymous> (C:\dev\personal\orch\packages\orch\test\retention.test.ts:130:63)
(fail) retention sweep > returns zero counts when every row is inside its window [93.76ms]
(pass) retention sweep > continues sweeping when one table delete fails [66.61ms]
158 |     db.run(sql`INSERT INTO agent_endings(agent_id,ended_at,closed_by) VALUES (${agentId},${Date.parse(old)},NULL)`);
159 |     db.run(sql`INSERT INTO agent_worktrees(agent_id,path,branch) VALUES (${agentId},${"/tmp/worktree"},${"orch/expired"})`);
160 |     db.run(sql`INSERT INTO agent_plexers(agent_id,plexer_id) VALUES (${agentId},${"headless"})`);
161 |     acquireLease(orchDir, agentId, holder, Date.parse(old));
162 | 
163 |     expect(sweepExpiredRows(orchDir, settingsFixture({ ended_agents_days: 7 }), NOW).ended_agents).toBe(1);
                                                                                                         ^
error: expect(received).toBe(expected)

Expected: 1
Received: 2

      at <anonymous> (C:\dev\personal\orch\packages\orch\test\retention.test.ts:163:100)
(fail) retention sweep > reaps expired agents by identity, taking every satellite with them [81.70ms]
72 | 		const params = query.params.length === 0 ? query.params : fillPlaceholders(query.params, placeholderValues);
73 | 		logger.logQuery(sql, params);
74 | 		if (resultKind === "sync") try {
75 | 			return executors.run(params);
76 | 		} catch (e) {
77 | 			throw new DrizzleQueryError(sql, params, e);
                                                  ^
DrizzleQueryError: Failed query: INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES (?,?,?,?,?,?)
params: deadagent1,deadagent1,pi,/tmp,deadagent1,1768867200000
      at run (C:\dev\personal\orch\node_modules\drizzle-orm\sqlite-core\async\session.js:77:46)
      at <anonymous> (C:\dev\personal\orch\packages\orch\test\retention.test.ts:180:8)
(fail) retention sweep > reaps dead dirs by recorded instants, not a fresh directory mtime [58.17ms]
70 |     tabLabel: null,
71 |   };
72 | }
73 | 
74 | function appendPresenceLine(directory: string, name: string, record: PresenceRecord): void {
75 |   appendFileSync(presenceFile(directory, name), `${JSON.stringify(record)}\n`);
       ^
error: ENOENT: no such file or directory, open 'deadagentn\results.jsonl'
      at appendPresenceLine (C:\dev\personal\orch\packages\orch\src\presence\history.ts:75:3)
      at writeResult (C:\dev\personal\orch\packages\orch\src\presence\history.ts:80:3)
      at <anonymous> (C:\dev\personal\orch\packages\orch\test\retention.test.ts:192:5)
(fail) retention sweep > keeps dead dirs with a newer recorded instant despite an old mtime [60.65ms]
70 |     tabLabel: null,
71 |   };
72 | }
73 | 
74 | function appendPresenceLine(directory: string, name: string, record: PresenceRecord): void {
75 |   appendFileSync(presenceFile(directory, name), `${JSON.stringify(record)}\n`);
       ^
error: ENOENT: no such file or directory, open 'deadagentm\results.jsonl'
      at appendPresenceLine (C:\dev\personal\orch\packages\orch\src\presence\history.ts:75:3)
      at writeResult (C:\dev\personal\orch\packages\orch\src\presence\history.ts:80:3)
      at <anonymous> (C:\dev\personal\orch\packages\orch\test\retention.test.ts:202:5)
(fail) retention sweep > reaps malformed dead dirs with no recorded instant [58.15ms]
207 | 
208 |   test("keeps result-only recorded instant despite an old mtime", () => {
209 |     const orchDir = fixture();
210 |     const key = "deadagentr";
211 |     const dir = seedStatus(orchDir, key, { pid: 999999 });
212 |     writeFileSync(join(dir, "status.json"), "not valid status");
          ^
error: ENOENT: no such file or directory, open 'deadagentr\status.json'
      at <anonymous> (C:\dev\personal\orch\packages\orch\test\retention.test.ts:212:5)
(fail) retention sweep > keeps result-only recorded instant despite an old mtime [60.13ms]
220 |     const orchDir = fixture();
221 |     seedAgent("liveagent1", {}, orchDir);
222 |     seedLiveProcess(orchDir, "liveagent1");
223 |     const dir = seedStatus(orchDir, "liveagent1", {});
224 |     const old = new Date(NOW.getTime() - 100 * 24 * 60 * 60 * 1000);
225 |     utimesSync(dir, old, old);
          ^
error: ENOENT: no such file or directory, utime 'liveagent1'
      at <anonymous> (C:\dev\personal\orch\packages\orch\test\retention.test.ts:225:5)
(fail) retention sweep > never reaps a live presence dir regardless of age [64.73ms]
(pass) retention sweep > sweeps old logs but preserves logs for live agents [77.73ms]
(pass) retention sweep > does not sweep again one minute after the first tick [58.29ms]
(pass) retention sweep > prunes orch's own logs past the age cap [39.92ms]
(pass) retention sweep > prunes orch's own logs past the size cap even when freshly written [46.97ms]

packages\orch\test\routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves pack selection [57.05ms]
(pass) store hardening > a fresh store creates the full current schema with WAL enabled [47.92ms]
(pass) store hardening > the store refuses a second open holding, so ownership cannot fork [52.98ms]
(pass) store hardening > adoption closes the prior holding in the same step that opens the new one [55.03ms]
(pass) store hardening > the attempt insert claim is exactly once [52.95ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [231.51ms]

packages\orch\test\seat-index.test.ts:
(pass) seat pure seams > errorMessage preserves non-Error thrown values [3.57ms]
(pass) seat pure seams > hasTheme discriminates missing and valid themes [0.34ms]
(pass) seat pure seams > countStates groups active, blocked, failed, and settled states [0.07ms]
(pass) seat pure seams > formatSeatStatus renders state counts and view hint [0.10ms]
(pass) seat pure seams > reconcileDashboardSelection preserves id and guards missing snapshots [0.08ms]

packages\orch\test\self-actor-identity.test.ts:
(pass) a driving session's write-actor is the agent orch registered for it > the session token resolves to the id hello minted, so the actor equals its own lease holder [52.19ms]
(pass) a driving session's write-actor is the agent orch registered for it > a token orch has never seen resolves to nothing rather than a fabricated id [37.00ms]
(pass) a driving session's write-actor is the agent orch registered for it > one session keeps ONE id across calls, whatever pid the shell reports [51.30ms]

packages\orch\test\session-env.test.ts:
(pass) shim environment > allows the launch environment variable [0.17ms]

packages\orch\test\session-refresh-repoints-identity.test.ts:
(pass) session refresh identity continuity > same process with a new token repoints the existing agent and preserves its lease [69.15ms]
(pass) session refresh identity continuity > same token with a new process keeps the agent and repoints its process interval [55.95ms]
(pass) session refresh identity continuity > a new token and a new process mint a new agent [56.06ms]
(pass) session refresh identity continuity > a process anchored by an ended agent mints instead of repointing [54.91ms]

packages\orch\test\session-sees-only-held-agents.test.ts:
(pass) session agent visibility > shows only agents held by the current session, not its provenance children [0.17ms]
(pass) session agent visibility > an operator sees every agent in every space [0.04ms]
(pass) session agent visibility > a session cannot reset a foreign-held agent [83.72ms]
(pass) session agent visibility > a session cannot read runs by the exact key of a foreign-held agent [63.79ms]
(pass) session agent visibility > a session cannot widen status with --space-wide [401.78ms]
(pass) session agent visibility > a session cannot resolve a foreign target, even when it shares provenance [71.07ms]

packages\orch\test\session.test.ts:
(pass) parseSession > returns an empty view for null and missing paths [0.14ms]
(pass) parseSession > handles model, thinking, user, assistant, tool, and unknown entries [8.14ms]
(pass) parseSession > joins text blocks and ignores non-text blocks [5.92ms]

packages\orch\test\settings-command.test.ts:
(pass) orch settings > every registered setting is reachable through --json [179.57ms]
(pass) orch settings > every registered setting is printed in the table [151.34ms]
(pass) orch settings > --json reports value + source per setting, settings.json winning over defaults [170.86ms]
(pass) orch settings > --json reports env as the winning source over settings.json [165.89ms]
(pass) orch settings > --harness switches defaults.adapter between enabled ids and rejects a non-enabled id [485.77ms]
(pass) orch settings > reports each harness's picker quicklist and launch gate as separate rows [165.75ms]
(pass) orch settings > a load error surfaces loudly with no partial table [154.67ms]
(pass) orch settings > sets a boolean through its registry entry [173.09ms]
(pass) orch settings > sets an integer through its registry entry [166.35ms]
fleet.max_depth = 6
(pass) orch settings > single-setting set delegates to the registry writer [2.75ms]
(pass) orch settings > sets a choice through its registry entry [179.28ms]
(pass) orch settings > sets a multi value through its registry entry [184.39ms]
(pass) orch settings > sets a list value through its registry entry [163.62ms]
(pass) orch settings > refuses an invalid boolean and names the allowed values [160.29ms]
(pass) orch settings > refuses an invalid integer and names the allowed range [159.93ms]
(pass) orch settings > refuses an invalid choice and names the allowed choices [173.75ms]
(pass) orch settings > refuses an invalid multi value and names the allowed choices [173.49ms]
(pass) orch settings > refuses an invalid list and names JSON as the allowed format [168.95ms]
(pass) orch settings > refuses an unknown key and suggests nearest valid keys [161.93ms]
(pass) orch settings > refuses read-only runtime and names the editing subcommand [160.42ms]

packages\orch\test\settings-defects.test.ts:
(pass) settingsDefects > returns no defects for an absent file [24.32ms]
(pass) settingsDefects > returns no defects for a valid settings file [2.15ms]
(pass) settingsDefects > reports unparsable JSON as one file defect [0.98ms]
(pass) settingsDefects > suggests a near-match for a stale key [5.88ms]
(pass) settingsDefects > does not guess a replacement for a removed key [9.33ms]
(pass) settingsDefects > reports the expected pinned schema value [2.70ms]
(pass) settingsDefects > reports a wrong value type on a real key [5.99ms]

packages\orch\test\settings-editor.test.ts:
(pass) settings editor reducer > moves focus down and up without running off either end [0.24ms]
(pass) settings editor reducer > opens the focused setting for editing [0.03ms]
(pass) settings editor reducer > cancel leaves value unchanged and returns to browsing [0.02ms]
(pass) settings editor reducer > commit updates value and produces a pending write [0.10ms]
(pass) settings editor reducer > refuses invalid values with a reason and stays open [0.05ms]
(pass) settings editor reducer > refuses opening a read-only setting with a reason [0.03ms]
(pass) settings editor reducer > cancelling without a commit yields zero writes [0.01ms]

packages\orch\test\settings-manager.test.ts:
(pass) settings manager > currentOrNull returns null and current reports an absent file [0.65ms]
(pass) settings manager > parses valid fixture text [0.62ms]
(pass) settings manager > holds one parsed object until reload [0.48ms]
(pass) settings manager > does not cache malformed text as a value [0.45ms]
(pass) settings manager > reloads file settings after the file changes [8.17ms]
(pass) settings manager > update > file manager lands text and current reflects it without reload [3.22ms]
(pass) settings manager > update > in-memory manager lands text and current reflects it [0.55ms]
(pass) settings manager > update > removes a stale lock before updating [13.06ms]
(pass) settings manager > update > refuses a held lock and leaves settings and lock untouched [7.46ms]
(pass) settings manager > reports a legacy config.toml [0.87ms]

packages\orch\test\settings-notify.test.ts:
(pass) orch settings notify > records a sink with the field that sink declares [16.95ms]
(pass) orch settings notify > re-adding one sink replaces it in place and keeps the fields the call omits [40.73ms]
(pass) orch settings notify > accepts asking as a first-class sink state [14.82ms]
(pass) orch settings notify > remove drops only the named sink [31.28ms]
(pass) orch settings notify > list reports each sink with the states it fires on, defaults included [19.82ms]
(pass) orch settings notify > an empty notify array lists as none configured [2.41ms]
(pass) orch settings notify > the notify row lists every sink, the states it may fire on, and the fields each carries [14.53ms]
(pass) orch settings notify > the notify row writes the picked sinks, states included, and drops the ones left off [17.33ms]
(pass) orch settings notify > the notify row refuses an unknown sink, a carrying sink with nothing to carry, and an unknown state [1.22ms]

packages\orch\test\settings-precedence.test.ts:
(pass) settings precedence > returns a defaults value when no override is set [9.26ms]
(pass) settings precedence > applies defaults when settings, env, and flag are absent [1.93ms]
(pass) settings precedence > uses env over settings and flag over env [2.10ms]
(pass) settings precedence > parses notify entries and hosts into expected shapes [7.65ms]
(pass) settings precedence > reports a helpful validation error for invalid settings [6.42ms]

packages\orch\test\settings-registry.test.ts:
(pass) settings registry > declares every schema setting exactly once [0.42ms]
(pass) settings registry > every registry read resolves against loaded settings [2.91ms]
(pass) settings registry > fleet help explains what each limit counts [0.12ms]
(pass) settings registry > fleet.max_depth round-trips through the full-tree writer [5.44ms]
(pass) settings registry > fleet.max_depth rejects zero through the registered writer [2.84ms]
(pass) settings registry > fleet.max_depth writes its value to settings.json [4.93ms]
(pass) settings registry > contains no duplicate keys [0.11ms]

packages\orch\test\settings-repair-roundtrip.test.ts:
(pass) repairing a settings.json the schema rejects > reports every rejected key without touching the file [7.55ms]
(pass) repairing a settings.json the schema rejects > a removed key is never guessed at - it offers no rename [2.01ms]
(pass) repairing a settings.json the schema rejects > the choices a person makes leave the file loadable [10.76ms]
(pass) repairing a settings.json the schema rejects > a typo keeps its value: renaming carries it to the real key [16.57ms]
(pass) repairing a settings.json the schema rejects > leaving every defect alone writes nothing at all [2.50ms]

packages\orch\test\settings-repair-screen.test.ts:
(pass) repair action labels > names the key a rename lands on, so the destination is never a guess [0.04ms]
(pass) repair action labels > names the value a set writes
(pass) repair action labels > drop and leave say only what they do [0.01ms]
(pass) repair frame > shows every defect with the value the person wrote [0.36ms]
(pass) repair frame > promises that nothing changes before a save, because nothing does [0.03ms]
(pass) repair frame > every defect starts at leave, so opening the screen destroys nothing [0.02ms]
(pass) repair frame > a chosen repair is shown as what it will do [0.02ms]
(pass) repair frame > the focused row's offered keys are shown, so no choice has to be guessed [0.04ms]
(pass) repair frame > the count reads as English for one defect and for many [0.03ms]
(pass) repair frame > no row runs past the terminal width, tag included [0.07ms]
(pass) repair frame > the file being repaired is named in the header [0.02ms]

packages\orch\test\settings-repair-write.test.ts:
(pass) applySettingsRepairs > rename carries the value to the new key [8.13ms]
(pass) applySettingsRepairs > rename onto an occupied key throws and leaves the file untouched [8.43ms]
(pass) applySettingsRepairs > set writes a value at a dotted path [9.33ms]
(pass) applySettingsRepairs > drop deletes a value without pruning its parent [18.23ms]
(pass) applySettingsRepairs > applies several repairs in one call [17.25ms]
(pass) applySettingsRepairs > repairs a schema-rejected file before readSettingsFile validates it [16.54ms]

packages\orch\test\settings-repair.test.ts:
(pass) settings repair choices > offers rename, set, drop, then leave when all repairs apply [0.07ms]
(pass) settings repair choices > offers only rename when there is only a suggestion [0.01ms]
(pass) settings repair choices > offers only set when there is only an expected value [0.01ms]
(pass) settings repair choices > always offers leave, and cannot drop a file-level defect
(pass) settings repair reducer > starts every defect at leave and focus at zero [0.03ms]
(pass) settings repair reducer > refuses choices the focused defect does not offer and reports why [0.07ms]
(pass) settings repair reducer > clamps focus at both ends and clears a prior reason [0.04ms]
(pass) settings repair reducer > maps non-leave choices to repairs in defect order [0.05ms]
(pass) settings repair reducer > leave produces no repair [0.01ms]
(pass) settings repair reducer > empty defects make every action a no-op [0.02ms]

packages\orch\test\settings-shell.test.ts:
(pass) settings shell decisions > non-TTY takes the print path [0.03ms]
(pass) settings shell decisions > an overridden setting is refused with the winner named [0.11ms]
(pass) settings shell decisions > registered writes use the registry entry [10.44ms]
(pass) settings shell decisions > registry exposes writable subcommand entries [0.19ms]

packages\orch\test\settings-thinking.test.ts:
(pass) orch settings thinking > writes the global default and reads back through loadSettings [9.88ms]
(pass) orch settings thinking > writes a per-harness override without disturbing the global default [15.01ms]
thinking  xhigh
(pass) orch settings thinking > the command sets the level a user names [12.91ms]
thinking (pi)  low
(pass) orch settings thinking > the command sets a per-harness level with --harness [12.09ms]
(pass) orch settings thinking > a level orch does not know is refused, naming the valid levels [2.97ms]
(pass) orch settings thinking > clearing a per-harness override falls back to the global default [12.46ms]

packages\orch\test\settings-view.test.ts:
(pass) settings view > visibleEntryIndices matches key and group case-insensitively [0.18ms]
(pass) settings view > windowBounds keeps the focus inside the budget and clamps at both ends [0.04ms]
(pass) settings view > frame shows group headers, values, provenance tags, and the focused help [0.31ms]
(pass) settings view > frame with a filter narrows the list and draws the filter line [0.04ms]
(pass) settings view > frame reports an empty filter match instead of a blank screen [0.02ms]
(pass) settings view > a long list is windowed with more-above/more-below markers [0.20ms]
(pass) settings view > overlays render choices, checkboxes, and input with error [0.15ms]
(pass) settings view > a checkbox row shows what its choice carries [0.03ms]
(pass) settings view > displayValue keeps scalars bare and JSON-encodes shapes [0.04ms]

packages\orch\test\settings-watch.test.ts:
(pass) watchSettings > loads initially and applies a valid edit after the debounce [36.66ms]
(pass) watchSettings > keeps the last-good settings, warns once, and recovers [398.07ms]
(pass) watchSettings > reloads on a touched reload.signal without a settings edit [28.08ms]
(pass) watchSettings > stop prevents further callbacks [410.72ms]

packages\orch\test\settings.test.ts:
(pass) loadSettings > refuses to invent settings when settings.json is missing [1.06ms]
(pass) loadSettings > requires a top-level runtime and never defaults it [2.51ms]
(pass) loadSettings > rejects an unrecognized runtime naming the accepted values [2.08ms]
(pass) loadSettings > rejects a runtime misplaced under defaults [2.68ms]
(pass) loadSettings > reads the declared runtime [7.59ms]
(pass) loadSettings > parses every supported settings section [2.89ms]
(pass) loadSettings > reads question re-ask and retention sweep settings [2.02ms]
(pass) loadSettings > rejects a file without the current schemaVersion [2.16ms]
(pass) loadSettings > rejects invalid JSON loudly [2.66ms]
(pass) loadSettings > names the key path for invalid fields [2.95ms]
(pass) loadSettings > rejects unknown settings keys [2.70ms]
(pass) loadSettings > rejects removed spawn cap setting by name [2.56ms]
(pass) loadSettings > parses models.allowed as a per-harness pattern map [2.47ms]
(pass) loadSettings > rejects renamed fleet keys and loads their replacements [28.12ms]
(pass) loadSettings > rejects old settings keys [9.33ms]
(pass) loadSettings > rejects legacy notify type and unknown ids [12.06ms]
(pass) loadSettings > applies every settings default when sections are absent [2.15ms]
(pass) loadSettings > preserves configured values while defaulting each missing section value [2.53ms]
(pass) loadSettings > rejects non-positive and non-integer retention windows [10.31ms]
(pass) loadSettings > rejects a host without dest [2.02ms]
(pass) loadSettings > rejects an unknown id in enabled.adapters [3.11ms]
(pass) loadSettings > rejects defaults.adapter not present in enabled.adapters [3.09ms]
(pass) loadSettings > rejects when settings.json is absent but a legacy config.toml exists [1.37ms]
(pass) allowedModelPatterns > restricts nothing when settings contain no patterns [1.97ms]
(pass) allowedModelPatterns > returns the configured patterns when set [2.06ms]
(pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or enabled entry [2.78ms]
(pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [4.60ms]
(pass) writeSettingsRuntime > a different runtime replaces the single value in place [6.12ms]
(pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [5.64ms]
(pass) reapUnreadableSettings > leaves a readable file alone [2.03ms]
(pass) writeSettingsEnabled > round-trips both provider arrays [9.05ms]
(pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [11.26ms]
(pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [7.10ms]
(pass) writeSettingsDefault > is idempotent when rewriting the same value [11.37ms]
(pass) writeSettingsDefault > refuses to write through an out-of-version settings file [3.67ms]
(pass) writeSettingsDefault > switches defaults.adapter between two enabled ids and loads clean [4.71ms]
(pass) writeSettingsFullTree > round-trips defaults without inventing max_agents_total [6.14ms]
(pass) settings precedence > uses the fallback when env and settings.json omit a setting [3.35ms]
(pass) settings precedence > uses the settings.json value over the fallback [3.02ms]
(pass) settings precedence > uses the ORCH_* environment value over settings.json [2.21ms]
(pass) settings precedence > uses an explicit flag override over the environment [0.12ms]
(pass) resolveSetting > uses flag, environment coercion, settings, then fallback in precedence order [0.09ms]
(pass) resolveWithSource > rejects an environment value with the wrong shape [0.12ms]
(pass) resolveWithSource > reports the winning source at each precedence level [0.08ms]
(pass) models.preferred and models.allowed are independent > loadSettings parses a per-harness preferred quicklist [2.26ms]
(pass) models.preferred and models.allowed are independent > an absent preferred map normalizes to an empty map, not to allowed [2.00ms]
(pass) models.preferred and models.allowed are independent > writing one list leaves the other byte-for-value intact [12.15ms]
(pass) models.preferred and models.allowed are independent > an empty list is recorded as no list at all, so a cleared picker really clears [6.37ms]
(pass) models.preferred and models.allowed are independent > the full tree seeds both maps when absent and preserves both when present [14.02ms]
(pass) models.preferred and models.allowed are independent > the allowlist gate reads models.allowed only [2.04ms]

packages\orch\test\setup-flags.test.ts:
(pass) setup model flags > rejects a bare model when multiple harnesses are selected [0.15ms]
(pass) setup model flags > binds each model flag to its own harness [0.06ms]
(pass) setup model flags > allows a bare model for one harness [0.01ms]
(pass) setup model flags > rejects a model bound to an unselected harness [0.07ms]
(pass) setup model flags > rejects duplicate model flags for one harness [0.02ms]

packages\orch\test\setup-io.test.ts:
(pass) setup prompt answer validation > refuses a single answer that was not offered [0.10ms]
(pass) setup prompt answer validation > refuses multi-select answers containing an unoffered value [0.05ms]

packages\orch\test\setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [5.49ms]
(pass) notifier setup logic > lists unavailable notifiers with remediation and disables selection [0.14ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.09ms]
(pass) notifier setup logic > renders a command entry that loadSettings can parse [8.66ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.27ms]

packages\orch\test\setup-smoke.test.ts:
(pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [1.23ms]
(pass) runSetupSmoke (12.5) > the agent is launched on the prompt it built [0.48ms]
(pass) runSetupSmoke (12.5) > an agent that launches but yields no result times out and fails non-zero [1.09ms]
(pass) runSetupSmoke (12.5) > a rejected spawn fails loudly and never polls for a result [1.17ms]

packages\orch\test\setup-wizard.test.ts:
(pass) setup model picker > switches large catalogues to searchable bounded mode and preserves effort [0.25ms]
(pass) setup model picker > keeps the compact selector for small catalogues [0.06ms]
(pass) setup model list picker > large catalogues use the bounded searchable multiselect [0.15ms]
(pass) setup model list picker > the prompt names both jobs the list does, and that an empty one forbids nothing [0.05ms]
(pass) setup model list picker > stored values start checked, and clearing them returns an empty selection [0.09ms]

packages\orch\test\skill-store-and-links.test.ts:
(pass) skill store and harness links > writes real files to the store and links each harness dir into it [14.52ms]
(pass) skill store and harness links > replaces a real directory left in a harness dir with a link into the store [12.00ms]
(pass) skill store and harness links > doctor reports a harness dir holding a real directory instead of a link [11.90ms]
(pass) skill store and harness links > doctor passes once every harness dir links into the store [12.57ms]
(pass) skill store and harness links > doctor skips when the user turned the skill install off [6.22ms]

packages\orch\test\space-policy.test.ts:
(pass) a space is user-created, and absence falls back to the repo root > placing an agent in a space nobody created is refused, not minted [61.30ms]
(pass) a space is user-created, and absence falls back to the repo root > two unspaced agents in the SAME repo root can reach each other [54.56ms]
(pass) a space is user-created, and absence falls back to the repo root > two unspaced agents in DIFFERENT repo roots cannot [61.12ms]
(pass) a space is user-created, and absence falls back to the repo root > an agent placed in no space reports none, even inside a plexer workspace [59.69ms]
(pass) a space is user-created, and absence falls back to the repo root > recording a spawn never conjures the space it names [50.97ms]
(pass) a space is user-created, and absence falls back to the repo root > a space still walls, and it outranks the repo root [64.83ms]
(pass) space policy > reads the space from the environment satellite, and absence is null [79.78ms]
(pass) space policy > resolves space names through records and functions [0.16ms]
(pass) space policy > compares agents by the space each is composed into [91.88ms]
(pass) space policy > enforces the space wall across every plexer alike [120.44ms]
(pass) space policy > scopes agents to the current space [73.56ms]
(pass) space policy > a null current space leaves items unscoped [47.97ms]
(pass) space policy > 2.7 status displays the composed space, not text sliced from a key [87.34ms]
(pass) space policy > 6.6 structured identity drives status and policy, not serialized key text [76.95ms]

packages\orch\test\space-walls.test.ts:
(pass) space helpers > reads space ids from the environment satellite, never from the key [5.96ms]
(pass) space helpers > an agent that moves space keeps its identity and reports the new space [7.50ms]
(pass) space helpers > derives an entity space from the store [0.40ms]
(pass) space helpers > returns the same entities when all spaces are requested [394.57ms]
(pass) space wall writes > allows a write within the same space [0.57ms]
(pass) space wall writes > denies a cross-space write with both spaces in the reason [0.36ms]
(pass) space wall writes > applies the same wall rule whatever plexer the agents sit in [2.03ms]
(pass) space wall writes > allows a cross-space write with an explicit override [0.30ms]
(pass) space wall writes > allows unplaced targets [0.18ms]

packages\orch\test\spawn-identity.test.ts:
(pass) one key per pane spawn (12.1) > identity is an opaque minted id ΓÇö never the name, never the pane handle [1249.19ms]
23 |   const presence = loadPresence(orchDir);
24 |   const taken = [...spawnedRecords(orchDir).values()].find((view) =>
25 |     view.name === name
26 |     && sameSpace(view.environment.space, space)
27 |     && presence.get(view.id)?.alive === true);
28 |   if (taken) throw new Error(`name "${name}" is already live as ${taken.id}; close it or pick another name`);
                                                                                                                ^
error: name "audit-1" is already live as f21p3seksf; close it or pick another name
      at assertNameFree (C:\dev\personal\orch\packages\orch\src\policy\name.ts:28:108)
      at spawnOneIntoTab (C:\dev\personal\orch\packages\orch\src\commands\spawn\placement.ts:148:3)
      at <anonymous> (C:\dev\personal\orch\packages\orch\test\spawn-identity.test.ts:130:20)
(fail) one key per pane spawn (12.1) > a name freed by a dead agent is reusable, and the two agents differ in identity [1604.11ms]
(pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [1882.41ms]
(pass) A1: spawn registration records the space as an environment axis > a spawn into a space writes agent_spaces, and the composer reads it back [68.13ms]
(pass) A1: spawn registration records the space as an environment axis > a spawn stating no space records NO ROW ΓÇö a missing axis is a missing row [63.51ms]
(pass) A1: spawn registration records the space as an environment axis > moving an agent to another space closes the old interval and keeps its identity [75.43ms]

packages\orch\test\spawn-limits.test.ts:
(pass) spawn limits > schema loads global and workspace caps [27.36ms]
(pass) spawn limits > rejects invalid cap %s with file and key [6.80ms]
(pass) spawn limits > rejects invalid cap %s with file and key [5.34ms]
(pass) spawn limits > rejects invalid cap %s with file and key [5.07ms]
(pass) spawn limits > omitted fleet caps normalize to defaults [1.83ms]
(pass) spawn limits > global boundary refusal data counts the whole request [99.97ms]
(pass) spawn limits > one workspace may use the full global allotment [79.77ms]
(pass) spawn limits > workspace cap is independent of global headroom [79.21ms]
(pass) spawn limits > uncapped space is bounded only by global count [71.83ms]
(pass) spawn limits > foreign pack members do not consume the caller's pack cap [144.06ms]
(pass) spawn limits > an agent whose recorded process is gone frees capacity [70.33ms]
(pass) spawn limits > foreign panes never count [67.53ms]
(pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [7.17ms]
(pass) spawn limits > doctor accepts satisfiable limits [5.94ms]

packages\orch\test\spawn-name-list.test.ts:
(pass) spawn names every agent positionally, at creation > the positional arguments are the names, one per pane [0.11ms]
(pass) spawn names every agent positionally, at creation > the pane count is how many names were given [0.02ms]
(pass) spawn names every agent positionally, at creation > spawning with no name at all is refused [0.06ms]
(pass) spawn names every agent positionally, at creation > a bare count is not a name and is refused [0.02ms]
(pass) spawn names every agent positionally, at creation > the same name twice would collide, so it is refused before anything is created [0.03ms]
(pass) spawn names every agent positionally, at creation > every name is validated, so one bad name creates nothing [0.02ms]
(pass) spawn names every agent positionally, at creation > --name is gone: naming is positional, so the flag is an unknown flag [0.04ms]
(pass) spawn names every agent positionally, at creation > claimSpawnNames takes the resolved names and asserts each is free [2.02ms]

packages\orch\test\spawn-names.test.ts:
(pass) agent name validation > rejects names outside herdr's naming rule [0.13ms]
(pass) agent name validation > accepts lowercase names with hyphens and underscores [0.02ms]
(pass) a live name is claimed and a dead one is released > a live agent holds its name against a second spawn [69.19ms]
(pass) a live name is claimed and a dead one is released > a dead agent frees its name [72.67ms]
(pass) a live name is claimed and a dead one is released > another space's agent never blocks a name here [67.01ms]
(pass) name scope follows the agent's current space, not its birthplace > moving an agent moves the name it holds [83.01ms]
(pass) name scope follows the agent's current space, not its birthplace > the collision names the agent by its minted id [70.80ms]

packages\orch\test\spawn-placement.test.ts:
orch is not running inside herdr and no backend was chosen - spawning headless. Pass --backend herdr or set defaults.backend to open a herdr home for these agents (the user grants it), or --space <id> to place them in an open space.
(pass) outside every plexer, spawn is headless unless the human chose one > a plexer orch only probed, from a plain terminal, spawns headless [42.71ms]
(pass) outside every plexer, spawn is headless unless the human chose one > a chosen plexer stays selected and its home is what the human grants [36.84ms]
orch is not running inside herdr and herdr cannot open a space of its own - spawning headless. Pass --backend herdr or set defaults.backend to open a herdr home for these agents (the user grants it), or --space <id> to place them in an open space.
(pass) outside every plexer, spawn is headless unless the human chose one > a chosen plexer that cannot open a home still falls back to headless [38.45ms]
(pass) outside every plexer, spawn is headless unless the human chose one > a caller recorded inside the plexer stays in it, chosen or not [39.81ms]
(pass) outside every plexer, spawn is headless unless the human chose one > a named space is placement enough: no chosen backend needed [38.49ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a named space is orch's own id, and the workspace is its RECORDED home [61.37ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > with no space, orch INSIDE the plexer spawns beside itself and opens nothing [50.52ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a caller INSIDE the plexer whose recorded place is gone resolves no coordinate, never another [51.34ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a caller INSIDE the plexer with NO orch identity (a human's pane) spawns beside itself [52.55ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > with no space and orch OUTSIDE the plexer, the PACK gets its own marked home [62.15ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > the same pack spawning again reuses its home and asks the human nothing [61.00ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > an environment that holds nothing answers with an absence, never a refusal [52.29ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a space with no home HERE places the fleet without borrowing another plexer's [61.04ms]

packages\orch\test\spawn-policy.test.ts:
(pass) spawn policy caps > spawn, dispatch, reset, and model share one resolved tuning [7.50ms]
(pass) spawn policy caps > an agent's own pin outranks the default and only this command's flags outrank the pin [8.57ms]
(pass) spawn policy caps > launch env uses the minted agent id name [0.07ms]
(pass) spawn policy caps > worker prompt depth > root worker maySpawn follows max_depth [0.81ms]
(pass) spawn policy caps > allows a pack spawn while under the cap [0.30ms]
(pass) spawn policy caps > blocks an at-cap spawn and offers dispatch or the pack queue [0.09ms]
(pass) spawn policy caps > a slave may not spawn by default: fleet.max_depth is 1 [0.04ms]
(pass) spawn policy caps > fleet.max_depth 2 lets a slave spawn and refuses its child [0.07ms]
(pass) spawn policy caps > reads a pack cap override from settings [2.02ms]
(pass) spawn policy caps > a tab holds at most fleet.max_agents_per_tab agents, counting what it already holds [6.11ms]
(pass) spawn policy caps > a refused cmdSpawn makes no name, worktree, registry, or queue mutation [847.22ms]

packages\orch\test\spawn-preferred-models.test.ts:
(pass) the preferred quicklist reaches every launch route > a pane spawn hands the exact array to the backend [1244.91ms]
(pass) the preferred quicklist reaches every launch route > two created agents retain their own model tuning [2679.54ms]
(pass) the preferred quicklist reaches every launch route > an unconfigured quicklist stays empty rather than becoming a default one [1095.21ms]
(pass) the preferred quicklist reaches every launch route > the previewed command is the command a launch runs [0.29ms]
(pass) the preferred quicklist reaches every launch route > a headless launch forwards the quicklist into the adapter's own options [499.27ms]
(pass) orchd rules on the quicklist it is sent > accepts an absent value and an array of specs [1.27ms]
(pass) orchd rules on the quicklist it is sent > refuses a joined string or a blank entry instead of coercing it [0.17ms]

packages\orch\test\spawn-registry.test.ts:
(pass) spawn agent registration > writes the hub, environment, tuning, and lease [99.93ms]
(pass) spawn agent registration > an agent that states no plexer and no handle gets neither row [63.11ms]
(pass) spawn agent registration > worktree row is present only for a worktree launch [83.16ms]
(pass) spawn agent registration > an unknown or absent spawner produces a root pack of one and no lease [65.74ms]

packages\orch\test\status-filter-columns.test.ts:
(pass) orch status --filter on columns > drops the named columns from the default table [0.39ms]
(pass) orch status --filter on columns > a filtered owner column leaves no shared-owner footer [0.08ms]
(pass) orch status --filter on columns > drops the named columns from the human table [0.06ms]
(pass) orch status --filter on columns > drops the same facts from a JSON row [0.08ms]

packages\orch\test\status-headless.test.ts:
(pass) headless status visibility > drops an exited agent that finished, however much it recorded [0.06ms]
(pass) headless status visibility > --filter removes the states it names; --agent brings one dead agent back [0.03ms]
(pass) headless status visibility > --filter drops live rows in the states it names [0.04ms]
(pass) headless status visibility > drops a dead row with no result or terminal state [0.02ms]
(pass) headless status visibility > keeps a live row [0.01ms]
(pass) headless status visibility > --space-wide widens the scope without resurrecting empty dead rows [0.01ms]
(pass) headless status visibility > uses agent language without backend details when no backend was asked [0.02ms]

packages\orch\test\status-live.test.ts:
(pass) live status renderer > renders a clear screen, timestamped header, and table body [0.18ms]
(pass) live status renderer > renders a refresh failure in the header area [0.07ms]
(pass) live status renderer > coalesces a burst into one pending follow-up refresh [0.23ms]
(pass) live status renderer > keeps the existing table renderer available [0.06ms]

packages\orch\test\status-owner-column.test.ts:
(pass) the rendered status table carries the owner column > each row's OWNER cell holds that row's lease fact [0.23ms]
(pass) the rendered status table carries the owner column > a dead holder reads as unleased under a table that all shares one owner [0.06ms]
(pass) the rendered status table carries the owner column > the owner column is dropped only when no row knows its lease [0.04ms]

packages\orch\test\status-perf.test.ts:
(pass) status performance seams > resolves bundle hashes once per status call [423.32ms]
(pass) status performance seams > resolves orchestrator id once per status call [389.09ms]

packages\orch\test\status-renders-one-row-shape.test.ts:
(pass) status rendering has one row shape and one table renderer > task and last text use the same spelling in the row and table cell [50.09ms]
(pass) status rendering has one row shape and one table renderer > local and remote rows share the renderer; remote adds only HOST [0.38ms]
(pass) status rendering has one row shape and one table renderer > fleet resolves caller inputs once while building three presence rows [477.10ms]

packages\orch\test\status-unleased.test.ts:
(pass) status owner rendering > leased by a live holder shows that holder [1214.54ms]
(pass) status owner rendering > a dead holder is shown as unleased with the holder gone [433.37ms]
(pass) status owner rendering > an agent never leased shows no orch driving it [451.01ms]

packages\orch\test\store-agent-rows.test.ts:
(pass) agent store rows > insertAgent writes both NULL; agentById reads both back [80.68ms]
(pass) agent store rows > insertAgent materializes the provenance root [59.48ms]
(pass) agent store rows > endAgent records who closed it, nullable for death [64.14ms]
(pass) agent store rows > liveAgents excludes agents with an ending [63.09ms]
(pass) agent store rows > packMembers selects the materialized root [58.74ms]
(pass) agent store rows > unknown harness is rejected by the foreign key [41.14ms]
(pass) agent store rows > unknown spawnedBy is rejected by the foreign key [37.83ms]
(pass) agent store rows > label maps both null and a value [57.71ms]
(pass) agent store rows > created_at is an INTEGER epoch millisecond [52.40ms]
(pass) agent store rows > worktreeOf distinguishes repo agents from worktree agents [61.86ms]
(pass) agent store rows > renameAgent is id-keyed and leaves identity history unchanged [58.23ms]
(pass) agent store rows > lookup ensure operations are insert-or-ignore [52.80ms]
(pass) agent store rows > childrenOf returns direct descendants [70.02ms]

packages\orch\test\store-catalogue.test.ts:
(pass) catalogue rows > empty store reads an empty Map [37.68ms]
(pass) catalogue rows > write then read round-trips at and stdout [50.75ms]
(pass) catalogue rows > writing the same command twice keeps one row with newer values [52.75ms]
(pass) catalogue rows > an entry with empty stdout is not stored [38.11ms]
(pass) catalogue rows > clearCatalogues empties the store [54.95ms]
(pass) catalogue rows > two commands coexist and updating one does not touch the other [62.90ms]

packages\orch\test\store-connection-guards.test.ts:
(pass) store migration guards > a store predating the migrations is refused, not rebuilt over [54.07ms]
(pass) store migration guards > names live presence as the thing to close before rebuilding [80.60ms]
(pass) a slave never reaps or recreates the store > a spawned agent hitting a schema-mismatched store errors and mutates nothing [73.18ms]
(pass) a slave never reaps or recreates the store > a recreate is refused while a live worker exists, for the user too [96.19ms]
(pass) a slave never reaps or recreates the store > a live driving session is refused without --with-sessions and allowed with it [80.46ms]
(pass) a slave never reaps or recreates the store > the user may recreate once nothing is live [82.84ms]
(pass) a slave never reaps or recreates the store > a spawned agent is refused a recreate even with nothing live [62.28ms]

packages\orch\test\store-events.test.ts:
(pass) event store rows > appendEvent assigns increasing sequence numbers and round-trips payload [48.96ms]
(pass) event store rows > appendEvent keeps sequence numbers across store reopen [81.51ms]
(pass) event store rows > pruned sequence numbers are never reused [64.30ms]
(pass) event store rows > selectEventsSince filters by sequence, orders ascending, and honours limit [65.80ms]
(pass) event store rows > oldestEventSeq reports undefined when empty and the surviving lowest sequence after pruning [61.06ms]

packages\orch\test\store-identity.test.ts:
(pass) hello agent identity rows > reuses the live agent for the same session process and mints for another [57.17ms]
(pass) hello agent identity rows > first sight creates a named root agent and open process row [52.05ms]

packages\orch\test\store-instants.test.ts:
(pass) epoch-millisecond store instants > a lease records its holding as an integer instant [71.53ms]
(pass) epoch-millisecond store instants > agents order numerically by their creation instant, never lexically [61.92ms]
(pass) epoch-millisecond store instants > all time-named columns use integer declarations [0.81ms]

packages\orch\test\store-interval-rows.test.ts:
(pass) interval satellites > only one open interval is allowed [61.28ms]
(pass) interval satellites > half-open adjacency is legal [60.94ms]
(pass) interval satellites > clearSpace closes without opening [60.17ms]
(pass) interval satellites > agent plexer is immutable one-shot [60.49ms]
(pass) interval satellites > process restart history closes at the successor since [62.53ms]
(pass) interval satellites > process rows carry host and process identity [63.91ms]
(pass) interval satellites > process start_token round-trips [60.67ms]
(pass) interval satellites > space move history closes at the successor since [73.43ms]
(pass) interval satellites > tuning change history closes at the successor since [61.94ms]
(pass) interval satellites > handle history preserves each renumbered handle [63.08ms]
(pass) interval satellites > interval instants are stored as INTEGER values [76.65ms]
(pass) interval satellites > process wrapper rolls back predecessor close when successor fails [59.05ms]
(pass) interval satellites > space wrapper rolls back predecessor close when successor fails [62.90ms]
(pass) interval satellites > tuning carries model and nullable thinking [61.42ms]

packages\orch\test\store-lease-rows.test.ts:
(pass) agent lease rows > fencing ids are monotonic across agents and never reused after reap [90.90ms]
(pass) agent lease rows > a second open lease is rejected [60.70ms]
(pass) agent lease rows > release and expiry close rows with matching reason and exact until [71.25ms]
(pass) agent lease rows > handoff closes current and inserts a newer row without changing prior facts [66.57ms]
(pass) agent lease rows > adoption closes prior and inserts a strictly newer adopter row [63.86ms]
(pass) agent lease rows > adoption with no open lease is plain acquire and leaves closed history untouched [63.90ms]
(pass) agent lease rows > handoff rolls back close when successor insert fails [61.13ms]
(pass) agent lease rows > wrong-holder release and handoff are rejected [60.18ms]
(pass) agent lease rows > an agent cannot lease itself [59.65ms]
(pass) agent lease rows > expiry inserts nothing new [66.22ms]
(pass) agent lease rows > reads return only open rows [68.85ms]

packages\orch\test\store-outbox.test.ts:
(pass) outbox store rows > inserts pending messages and orders them by creation time [50.19ms]
(pass) outbox store rows > reports one message's pending state [52.92ms]
(pass) outbox store rows > bumps attempts and hides a message until its next attempt time [49.62ms]
(pass) outbox store rows > deletes delivered messages older than the cutoff [57.99ms]

packages\orch\test\store-queue.test.ts:
(pass) queue facade storage > state is derived from attempts rather than stored on tasks [60.00ms]
(pass) queue facade storage > retention deletes only settled tasks older than the cutoff [63.86ms]
(pass) queue facade storage > retention never removes a queued task based on its age [56.94ms]
(pass) queue facade storage > agent-scoped tasks become unrunnable when their agent ends [55.96ms]
(pass) queue facade storage > completed tasks stay done after their scope agent ends [63.21ms]
(pass) queue facade storage > a dead orch does not make a pack task unrunnable while a member lives [57.80ms]
(pass) queue facade storage > pack-scoped tasks become unrunnable when every pack member ends [56.29ms]

packages\orch\test\store-rebuild-schema.test.ts:
37 | 
38 | describe("rebuild schema", () => {
39 |   test("rebuild DDL inventory is exact", () => {
40 |     const d = db();
41 |     const rows = d.all(sql`SELECT type,name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'`);
42 |     expect(new Set(rows.map((row) => `${stringField(row, "type")}:${stringField(row, "name")}`))).toEqual(expectedInventory);
                                                                                                       ^
error: expect(received).toEqual(expected)

  Set {
-   "table:outbox",
-   "table:control_outcomes",
-   "table:catalogues",
-   "table:events",
-   "table:runs",
-   "table:questions",
-   "table:harnesses",
-   "table:plexers",
-   "table:hosts",
-   "table:host_plexers",
-   "table:spaces",
-   "table:agents",
-   "table:agent_worktrees",
+   "table:__drizzle_migrations",
    "table:agent_endings",
-   "table:agent_processes",
-   "table:agent_plexers",
    "table:agent_handles",
+   "table:agent_leases",
+   "table:agent_plexers",
+   "table:agent_processes",
    "table:agent_spaces",
    "table:agent_tunings",
-   "table:agent_leases",
-   "table:space_plexers",
-   "table:pack_plexers",
-   "table:tasks",
-   "table:task_cancellations",
-   "table:task_attempts",
-   "table:pack_intakes",
-   "table:grant_requests",
-   "table:grant_request_params",
+   "table:agent_worktrees",
+   "table:agents",
+   "table:catalogues",
+   "table:control_outcomes",
+   "table:events",
    "table:grant_approvals",
    "table:grant_denials",
+   "table:grant_request_params",
+   "table:grant_requests",
    "table:grant_spends",
-   "table:__drizzle_migrations",
-   "index:outbox_pending",
-   "index:control_outcomes_agent",
-   "index:runs_agent_started",
-   "index:questions_pending",
-   "index:one_install",
-   "index:one_live_process",
+   "table:harnesses",
+   "table:host_plexers",
+   "table:hosts",
+   "table:outbox",
+   "table:pack_intakes",
+   "table:pack_plexers",
+   "table:plexers",
+   "table:questions",
+   "table:runs",
+   "table:space_plexers",
+   "table:spaces",
+   "table:task_attempts",
+   "table:task_cancellations",
+   "table:tasks",
    "index:one_handle",
+   "index:one_lease",
+   "index:leases_by_orch",
+   "index:one_live_process",
    "index:one_space",
    "index:one_tuning",
-   "index:one_lease",
-   "index:one_space_home",
-   "index:one_pack_home",
+   "index:agents_by_pack",
+   "index:agents_by_spawner",
+   "index:one_agent_per_session",
+   "index:control_outcomes_agent",
+   "index:grants_by_action",
+   "index:one_install",
+   "index:outbox_pending",
    "index:one_intake",
+   "index:one_pack_home",
+   "index:questions_pending",
+   "index:runs_agent_started",
+   "index:one_space_home",
    "index:one_open_attempt",
-   "index:agents_by_pack",
-   "index:agents_by_spawner",
-   "index:leases_by_orch",
+   "index:attempts_running",
    "index:tasks_by_agent",
    "index:tasks_by_pack",
    "index:tasks_by_space",
    "index:tasks_by_enqueuer",
-   "index:attempts_running",
-   "index:grants_by_action",
-   "index:one_agent_per_session",
+   "view:grant_states",
    "view:task_states",
-   "view:grant_states",
+   "table:agent_status",
  }

- Expected  - 41
+ Received  + 42

      at <anonymous> (C:\dev\personal\orch\packages\orch\test\store-rebuild-schema.test.ts:42:99)
(fail) rebuild schema > rebuild DDL inventory is exact [40.99ms]
(pass) rebuild schema > the store opens migrated, with foreign keys enabled [38.93ms]
(pass) rebuild schema > all ten partial unique indexes allow only one open row [642.17ms]
(pass) rebuild schema > enforces foreign keys and agent checks [53.86ms]
(pass) rebuild schema > requires exactly one task scope [52.99ms]
(pass) rebuild schema > allows one open attempt only [58.44ms]
(pass) rebuild schema > enforces lease checks and one lease [56.49ms]
(pass) rebuild schema > remaining documented CHECKs and cascades are enforced [68.19ms]
(pass) rebuild schema > task_states derives queued claimed and outcomes [71.83ms]

packages\orch\test\store-runs.test.ts:
(pass) run rows > round-trips every field, including a structured result [56.18ms]
(pass) run rows > upsert updates a row while preserving its original start time [51.16ms]
(pass) run rows > orders by started time, filters by agent, and honours limit [53.54ms]
(pass) run rows > omits absent optional fields instead of returning null [49.41ms]
(pass) run rows > deletes only rows older than the cutoff and returns the count [57.67ms]
(pass) run rows > stays readable after the agent presence directory is deleted [68.53ms]

packages\orch\test\store-task-rows.test.ts:
(pass) task and attempt rows > malformed task rows are refused instead of handed back as typed data [62.80ms]
(pass) task and attempt rows > malformed attempt rows are refused instead of handing back NaN [65.62ms]
(pass) task and attempt rows > enqueue accepts exactly one typed scope and round-trips JSON opts [60.39ms]
(pass) task and attempt rows > queued tasks can be edited only by their enqueuer [72.74ms]
(pass) task and attempt rows > two concurrent claims have one winner and one index violation [82.85ms]
(pass) task and attempt rows > failed attempts remain in history and retries are new attempts [73.09ms]
(pass) task and attempt rows > settlement stores exact integer instants and outcome payloads [69.99ms]
(pass) task and attempt rows > task state precedence covers queued, claimed, failed, done and cancelled [83.15ms]
(pass) task and attempt rows > intakes are half-open history and duplicate open intake is rejected [65.93ms]

packages\orch\test\store-values.test.ts:
(pass) store row values > uses null for optional database values without JSON text [0.05ms]
(pass) store row values > sets only non-null fields [0.04ms]

packages\orch\test\thinking-resolution.test.ts:
(pass) thinking resolution > resolves every rung in priority order [39.06ms]
(pass) thinking resolution > bare model with no setting yields harness default [7.75ms]
(pass) thinking resolution > pi translates the resolved level through its thinking role [0.30ms]
(pass) thinking resolution > per-harness override beats global default [8.30ms]

packages\orch\test\tiling.test.ts:
(pass) planTilePlacement > a lone pane anchors the split to the only pane [0.18ms]
(pass) planTilePlacement > first_split rules the opening split, however the screen is shaped [0.08ms]
(pass) planTilePlacement > first_split longest-edge leaves the opening split to the tab's own shape [0.05ms]
(pass) planTilePlacement > a tab with no geometry to read still opens the way first_split says [0.04ms]
(pass) planTilePlacement > past the first split, the biggest pane halves its longer side whatever first_split says [0.13ms]
(pass) planTilePlacement > the biggest pane is the target, whatever the caller's own pane is [0.04ms]
(pass) planTilePlacement > equal panes resolve top-left first, so enumeration order cannot decide [0.04ms]
(pass) planTilePlacement > four agents land in a 2x2 grid, not four columns [0.32ms]
(pass) planTilePlacement > four agents on an ultrawide screen still land in a 2x2 grid [0.07ms]
(pass) planTilePlacement > first_split rows stacks the second agent, columns seats it alongside [0.04ms]
(pass) planTilePlacement > longest-edge on an ultrawide screen is the four-thin-columns layout first_split exists to avoid [0.04ms]
(pass) planTilePlacement > the same pane count yields the same grid whatever pane order the plexer reports [0.90ms]

packages\orch\test\tool-exec-retry.test.ts:
(pass) every command into a harness or plexer retries on timing, not on being wrong > a transient refusal is reattempted until it succeeds [11.87ms]
(pass) every command into a harness or plexer retries on timing, not on being wrong > a failure the caller calls permanent is thrown on the FIRST attempt, never retried [0.21ms]
(pass) every command into a harness or plexer retries on timing, not on being wrong > a tool that never recovers exhausts the budget and reports how many attempts it cost [17.56ms]
(pass) every command into a harness or plexer retries on timing, not on being wrong > the seam names no harness: the same policy drives a different binary [1.17ms]

packages\orch\test\transcript.test.ts:
(pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [0.26ms]
(pass) lastAssistantFromJsonl > undefined for blank or empty input [0.02ms]
(pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.03ms]
(pass) assistantText > reads role-tagged records [0.02ms]
(pass) assistantText > reads the {type:'assistant'} envelope with a nested message [0.01ms]
(pass) assistantText > undefined for non-assistant roles
(pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.02ms]
(pass) contentText empty-string part handling > an all-empty content array yields undefined [0.01ms]
(pass) contentText empty-string part handling > a bare empty string yields undefined

packages\orch\test\transfer-does-not-disturb.test.ts:
(pass) a transfer touches the lease and nothing else > a handoff changes the holder and leaves every other fact identical [84.06ms]
(pass) a transfer touches the lease and nothing else > the agent's process is not restarted or re-attached [81.81ms]
(pass) a transfer touches the lease and nothing else > no control write is delivered to the agent [865.39ms]
(pass) a transfer touches the lease and nothing else > adoption of an unheld agent disturbs it no more than a handoff does [85.03ms]
(pass) a transfer touches the lease and nothing else > the holding that ended is kept as history, not erased by the transfer [87.88ms]

packages\orch\test\unleased-agents.test.ts:
(pass) registration unleased agent hint > includes unleased workers but never session identities [63.50ms]

packages\orch\test\unleased-stays-adoptable.test.ts:
52 |     expect(currentLease(d, "loose")).toBeNull();
53 | 
54 |     sweepExpiredRows(d, aggressiveRetention(), FAR_FUTURE);
55 | 
56 |     // Nothing ages it out: no ending was written, and it is still live.
57 |     expect(agentView(d, "loose")?.endedAt).toBeNull();
                                                ^
error: expect(received).toBeNull()

Received: undefined

      at <anonymous> (C:\dev\personal\orch\packages\orch\test\unleased-stays-adoptable.test.ts:57:44)
(fail) unleased and idle stays alive and adoptable (D3) > a decade of retention sweeps never ages out an unleased idle agent [66.07ms]
268 |     const result = body();
269 |     db.exec("COMMIT");
270 |     return result;
271 |   } catch (error) {
272 |     try { db.exec("ROLLBACK"); } catch {}
273 |     throw error;
                ^
DrizzleQueryError: Failed query: insert into "agent_leases" ("id", "agent_id", "orch_id", "since", "until", "release_reason") values (null, ?, ?, ?, null, null) returning "id"
params: loose,adopter,100
      at withTransaction (C:\dev\personal\orch\packages\orch\src\store\connection.ts:273:11)
      at <anonymous> (C:\dev\personal\orch\packages\orch\test\unleased-stays-adoptable.test.ts:68:5)
(fail) unleased and idle stays alive and adoptable (D3) > and it is still adoptable afterwards ΓÇö the point of keeping it [63.23ms]
78 | 
79 |     // An ending is the ONE thing that makes a record sweepable. The ended agent
80 |     // is gone; the unleased one, swept in the same pass with the same window, is
81 |     // untouched ΓÇö so the sweep is keyed on the ending and never on age or lease.
82 |     expect(agentView(d, "ended")).toBeNull();
83 |     expect(agentView(d, "loose")?.endedAt).toBeNull();
                                                ^
error: expect(received).toBeNull()

Received: undefined

      at <anonymous> (C:\dev\personal\orch\packages\orch\test\unleased-stays-adoptable.test.ts:83:44)
(fail) unleased and idle stays alive and adoptable (D3) > the sweep reaps only agents that actually ENDED, never merely unleased ones [70.76ms]
86 | 
87 |   test("repeated sweeps are stable: an unleased agent survives every one of them", () => {
88 |     const d = fixture();
89 |     seedStatus(d, "loose", { agent: "pi", pid: process.pid, state: "idle" });
90 |     for (let i = 0; i < 5; i += 1) sweepExpiredRows(d, aggressiveRetention(), FAR_FUTURE);
91 |     expect(liveAgentViews(d).map((v) => v.id)).toContain("loose");
                                                    ^
error: expect(received).toContain(expected)

Expected to contain: "loose"
Received: []

      at <anonymous> (C:\dev\personal\orch\packages\orch\test\unleased-stays-adoptable.test.ts:91:48)
(fail) unleased and idle stays alive and adoptable (D3) > repeated sweeps are stable: an unleased agent survives every one of them [65.06ms]

packages\orch\test\vocabulary.test.ts:
(pass) vocabulary is a display map, and a role is tree position > a role is derived from the tree, never stored [54.78ms]
(pass) vocabulary is a display map, and a role is tree position > no table carries a role column: there is nothing to disagree with the tree [48.91ms]
(pass) vocabulary is a display map, and a role is tree position > renaming an agent or moving its lease never changes its role [60.31ms]
(pass) vocabulary is a display map, and a role is tree position > every role term orch displays comes from the one map [0.12ms]
113 |         offenders.push(`${file}: ${match[0]}`);
114 |       }
115 |     }
116 |     // Every one of these must build its text from `term()`, or the day Bryan
117 |     // renames "slave" the word survives in half the messages.
118 |     expect(offenders).toEqual([]);
                            ^
error: expect(received).toEqual(expected)

- []
+ [
+   
+ "C:/dev/personal/orch/packages/orch/src/commands/help.ts: `.
+ One pack per orchestrator, yours first, each against fleet.max_agents_per_pack; packs never sum.
+ \`"
+ ,
+   "C:/dev/personal/orch/packages/orch/src/settings/registry.ts: "Where every other mail lands: an orchestrator to its worker, peer to peer, a task result to its enqueuer. prompt types it into the recipient'",
+ ]

- Expected  - 1
+ Received  + 8

      at <anonymous> (C:\dev\personal\orch\packages\orch\test\vocabulary.test.ts:118:23)
(fail) vocabulary is a display map, and a role is tree position > no module outside the map spells a role term into a user-facing string [18.78ms]

packages\orch\test\wall-single-owner.test.ts:
(pass) space wall ownership > keeps the wall decision primitive in one source module [12.04ms]

packages\orch\test\work-loop-binding.test.ts:
(pass) work loop attempt binding > statusSpeaksForTask verifies the current attempt dispatch id [0.11ms]
68 |           seedStatus(dir, RUNNER_KEY, { state: "done", label: "Runner" });
69 |           return Promise.resolve();
70 |         },
71 |         onEvent: (event) => published.push(event),
72 |       });
73 |       expect(published.map((event) => event.type === "task" ? event.newState : undefined)).toEqual(["claimed", "done"]);
                                                                                                ^
error: expect(received).toEqual(expected)

  [
    "claimed",
-   "done",
+   "failed",
  ]

- Expected  - 1
+ Received  + 1

      at <anonymous> (C:\dev\personal\orch\packages\orch\test\work-loop-binding.test.ts:73:92)
(fail) Cq4: results go to the enqueuer, not the runner > every task event the work loop publishes is keyed to whoever enqueued it [10164.36ms]

packages\orch\test\work-loop-identity.test.ts:
58 |           return Promise.resolve();
59 |         },
60 |         onEvent: () => { /* events are Cq4's business */ },
61 |       });
62 |       expect(attemptsOf(dir, task.id).map((attempt) => attempt.agentId)).toEqual(["runner0000"]);
63 |       expect(listTasks(dir)[0]?.state).toBe("done");
                                            ^
error: expect(received).toBe(expected)

Expected: "done"
Received: "failed"

      at <anonymous> (C:\dev\personal\orch\packages\orch\test\work-loop-identity.test.ts:63:40)
      at async withOrchDir (C:\dev\personal\orch\packages\orch\test\work-loop-identity.test.ts:38:22)
      at async <anonymous> (C:\dev\personal\orch\packages\orch\test\work-loop-identity.test.ts:47:11)
(fail) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > a claim records the minted agent id, not the presence key [10154.72ms]
(pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > an idle process with no registered agent row is never handed pack work [98.92ms]
 99 |           return Promise.resolve();
100 |         },
101 |         onEvent: () => { /* Cq4 covers where these land */ },
102 |       });
103 |       expect(attemptsOf(dir, task.id).map((attempt) => attempt.agentId)).toEqual(["runner0000"]);
104 |       expect(listTasks(dir)[0]?.state).toBe("done");
                                             ^
error: expect(received).toBe(expected)

Expected: "done"
Received: "failed"

      at <anonymous> (C:\dev\personal\orch\packages\orch\test\work-loop-identity.test.ts:104:40)
      at async withOrchDir (C:\dev\personal\orch\packages\orch\test\work-loop-identity.test.ts:38:22)
      at async <anonymous> (C:\dev\personal\orch\packages\orch\test\work-loop-identity.test.ts:90:11)
(fail) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > Cq1: the pack drains its own queue with its orch dead and no lease in force [10149.14ms]

packages\orch\test\work-notify.test.ts:
(pass) orch presence notifications > delivers a presence transition through a configured command sink [116.37ms]

packages\orch\test\work-survives-its-spawner.test.ts:
(pass) work survives its spawner, always (D1) > ending the spawner leaves the child live, unended and still listed [57.38ms]
(pass) work survives its spawner, always (D1) > a grandchild is untouched when the middle agent ends [59.15ms]
(pass) work survives its spawner, always (D1) > the store has no lifetime column and no fate-sharing flag anywhere [0.45ms]
(pass) work survives its spawner, always (D1) > spawn offers no flag that decides whether work outlives its spawner [0.89ms]
(pass) work survives its spawner, always (D1) > closing the spawner never writes an ending for anything it spawned [55.58ms]

packages\orch\test\worker-prompt.test.ts:
(pass) worker prompt capability composition > spawn clause follows maySpawn and stripping preserves the task [0.11ms]
(pass) worker prompt capability composition > orch run composition selects the same header per adapter [0.04ms]
(pass) worker prompt capability composition > the worker header does not instruct a lock that does not lock [0.02ms]
(pass) worker prompt capability composition > the header addresses the agent, and names no plexer furniture [0.02ms]
(pass) worker prompt capability composition > the verify clause names the configured commands, and asks for the repository's own when there are none [0.03ms]
(pass) worker prompt capability composition > locked-commands clause names the commands, and asks for a report rather than a lock [0.01ms]
(pass) worker prompt capability composition > no locked-commands clause when the list is empty
(pass) worker prompt capability composition > the reply-to-spawner clause needs a reachable spawner, not just a bridge-enabled worker [0.02ms]
(pass) worker prompt capability composition > unreachable spawner tells the worker to finish and end without relaying [0.01ms]
(pass) worker prompt capability composition > reachable spawner permits replying to the spawner only [0.01ms]
(pass) worker prompt capability composition > a reachable spawner still earns no clause when the worker has no bridge
(pass) worker prompt capability composition > the ask clause follows the bridge actions [0.04ms]
(pass) worker prompt capability composition > events strip both worker header variants [67.29ms]

packages\orch\test\worker-tools.test.ts:
(pass) worker tool policy > no configured allowlist restricts nothing [0.15ms]
(pass) worker tool policy > a configured allowlist always carries orch's own tools [0.03ms]
(pass) worker tool policy > peer tools join the allowlist when the fleet enables them [0.01ms]

packages\web\src\lib\fleet.test.ts:
(pass) web environment projection > novel plexers still render a detached environment [0.37ms]
(pass) web environment projection > missing space is absent rather than local [0.04ms]
(pass) web environment projection > pane coordinates are not chosen names [0.02ms]
(pass) web environment projection > unknown daemon states use the neutral fallback [0.02ms]
(pass) web environment projection > uses names from orch rows and falls back to the minted id [0.03ms]
(pass) web environment projection > uses the orch space name and id [0.02ms]
(pass) web environment projection > history groups ended agents by provenance root [0.05ms]
(pass) web environment projection > live projection excludes ended rows [0.06ms]
(pass) web environment projection > renderers contain no provider-id branches or backend capability imports [0.70ms]

packages\web\src\lib\web-shell.test.ts:
(pass) web shell and fleet views > the app shell scrolls only its content region [0.24ms]
(pass) web shell and fleet views > no route declares a scroll frame of its own [0.48ms]
(pass) web shell and fleet views > unleased agents are partitioned into an orphan bucket [0.17ms]
(pass) web shell and fleet views > history groups exited agents by the agent that spawned them [0.04ms]
(pass) web shell and fleet views > live work groups under its current lease holder [0.07ms]
(pass) web shell and fleet views > adopted work is filed under its current holder [0.03ms]
(pass) web shell and fleet views > unheld agents remain visible under the unheld group [0.07ms]
(pass) web shell and fleet views > dead holders become unheld and do not drive work [0.04ms]
(pass) web shell and fleet views > lease groups preserve every flat space member [0.04ms]
(pass) web shell and fleet views > visible names never expose a plexer coordinate or the forbidden term [0.05ms]

4 tests skipped:
(skip) the token file is the whole credential > the token is 0600
(skip) the token file is the whole credential > $ORCH_DIR is 0700, so same-uid is a boundary the filesystem enforces
(skip) the token file is the whole credential > a token left loose by an earlier run is tightened, not trusted
(skip) the token file is the whole credential > a runtime directory the daemon creates is 0700 too


42 tests failed:
(fail) the fleet wall is lifted by the absence of a launch, not by a key's shape > an agent orch launched may not cross into another project's fleet [80.67ms]
(fail) doctor reads a presence directory name as an id > a composite directory name is a malformed identity key [61.03ms]
(fail) bridge links > attach holds the link under the canonical key and push reaches it [63.50ms]
(fail) bridge links > a second attach for the same key replaces the first [60.02ms]
(fail) bridge links > detach removes only the link still held [65.95ms]
(fail) bridge links > push with no link throws BridgeDetachedError [65.43ms]
(fail) composition happens only at roots (checkCompositionRootLine) > allows createServices calls in each composition root [0.21ms]
(fail) close always works > closes a foreign-space target by name, key, or pane id [1508.29ms]
(fail) close always works > a successful backend close retains a pane that is still listed [1592.62ms]
(fail) close always works > a failed signal retains the registry and presence and reports failure [2297.98ms]
(fail) close always works > presence pid without a recorded process closes the pane without signalling and ends the row [857.38ms]
(fail) commands/daemon > parses governance and validates daemon status [2.60ms]
(fail) daemon decision trail > records a not-placed boundary answer with its reason [74.27ms]
(fail) daemon RPC > dispatch reports unavailable while a live agent has no bridge [5675.37ms]
(fail) runDoctor > accepts a live daemon and an answerable socket [5034.47ms]
  ^ this test timed out after 5000ms.
(fail) runDoctor > validates configured notifier adapters [10666.11ms]
  ^ this test timed out after 5000ms.
(fail) runDoctor > reports invalid settings and accepts missing settings [5928.82ms]
  ^ this test timed out after 5000ms.
(fail) runDoctor > never throws when individual checks encounter broken inputs [6179.91ms]
  ^ this test timed out after 5000ms.
(fail) one spelling per shared fact > launch env has one spelling [27.14ms]
(fail) peer discovery walls on the project > a record with no project stamp is malformed and never listed [69.91ms]
(fail) orch bridge links and capture roles > capture reads status and result from the orch presence record [76.57ms]
(fail) reap walks the provenance tree (H3) > the tree is reaped from the LEAF up, one sweep per level [66.85ms]
(fail) reap walks the provenance tree (H3) > a LIVE descendant blocks the reap even when the parent ended long ago [72.06ms]
(fail) retention sweep > uses each table's own window and keeps queued and claimed tasks [161.89ms]
(fail) retention sweep > returns zero counts when every row is inside its window [93.76ms]
(fail) retention sweep > reaps expired agents by identity, taking every satellite with them [81.70ms]
(fail) retention sweep > reaps dead dirs by recorded instants, not a fresh directory mtime [58.17ms]
(fail) retention sweep > keeps dead dirs with a newer recorded instant despite an old mtime [60.65ms]
(fail) retention sweep > reaps malformed dead dirs with no recorded instant [58.15ms]
(fail) retention sweep > keeps result-only recorded instant despite an old mtime [60.13ms]
(fail) retention sweep > never reaps a live presence dir regardless of age [64.73ms]
(fail) one key per pane spawn (12.1) > a name freed by a dead agent is reusable, and the two agents differ in identity [1604.11ms]
(fail) rebuild schema > rebuild DDL inventory is exact [40.99ms]
(fail) unleased and idle stays alive and adoptable (D3) > a decade of retention sweeps never ages out an unleased idle agent [66.07ms]
(fail) unleased and idle stays alive and adoptable (D3) > and it is still adoptable afterwards ΓÇö the point of keeping it [63.23ms]
(fail) unleased and idle stays alive and adoptable (D3) > the sweep reaps only agents that actually ENDED, never merely unleased ones [70.76ms]
(fail) unleased and idle stays alive and adoptable (D3) > repeated sweeps are stable: an unleased agent survives every one of them [65.06ms]
(fail) vocabulary is a display map, and a role is tree position > no module outside the map spells a role term into a user-facing string [18.78ms]
(fail) Cq4: results go to the enqueuer, not the runner > every task event the work loop publishes is keyed to whoever enqueued it [10164.36ms]
(fail) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > a claim records the minted agent id, not the presence key [10154.72ms]
(fail) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > Cq1: the pack drains its own queue with its orch dead and no lease in force [10149.14ms]

 1644 pass
 4 skip
 42 fail
 2 errors
 7783 expect() calls
Ran 1690 tests across 256 files. [351.27s]
