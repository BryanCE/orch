bun test v1.3.14 (0d9b296a)

test\adapter-allowlist.test.ts:
(pass) pi adapter tool allowlist > declares exactly the built-ins and bridge tools [41.82ms]
(pass) pi adapter tool allowlist > restricts interactive pi launches to the allowlist and the orch bridge/HUD extensions only [4.28ms]
(pass) pi adapter tool allowlist > restricts headless pif launches to the bridge/HUD extensions and preserves the prompt [6.15ms]

test\adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [17.84ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [24.41ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [8.37ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [2.31ms]

test\adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [0.12ms]
(pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.13ms]
(pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.08ms]
(pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [2.39ms]

test\adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.63ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.53ms]
(pass) PiAdapter > reads state from the presence status through store helpers [7.09ms]
(pass) PiAdapter > appends a steer message to the presence inbox [7.45ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [4.24ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [6.34ms]

test\answer-dispatch.test.ts:
280 |  * settings.json is a loud error naming the file and `orch setup`, never a silent empty
281 |  * config. Use `loadConfigOrNull` only where first-run really must be distinguished. */
282 | export function loadConfig(orchDir: string): OrchConfig {
283 |   const config = loadConfigOrNull(orchDir);
284 |   if (config === null) {
285 |     throw new Error(`${settingsPath(orchDir)} does not exist ΓÇö orch has no built-in configuration and does nothing by default.\nRun: orch setup`);
                    ^
error: C:\Users\Bryan\AppData\Local\Temp\orch-answer-KHuDRd\settings.json does not exist ΓÇö orch has no built-in configuration and does nothing by default.
Run: orch setup
      at loadConfig (C:\Users\Bryan\Documents\orch\src\config.ts:285:15)
      at deliverControl (C:\Users\Bryan\Documents\orch\src\control\dispatch.ts:113:21)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\answer-dispatch.test.ts:65:11)
(fail) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [70.95ms]
72 |     const directory = tempDir();
73 |     process.env.ORCH_DIR = directory;
74 |     const agentKey = key("local", "claude-noask");
75 |     seedStatus(directory, agentKey, { agent: "claude", pid: process.pid });
76 | 
77 |     expect(deliverControl(agentKey, { kind: "answer", text: "no" })).rejects.toThrow(
                                                                                  ^
error: expect(received).toThrow(expected)

Expected pattern: /cannot answer .*headless~local~claude-noask.*adapter claude declares ask false/
Received message: "C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-answer-BHXpFS\\settings.json does not exist ΓÇö orch has no built-in configuration and does nothing by default.\nRun: orch setup"

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\answer-dispatch.test.ts:77:78)
(fail) answer via the control dispatcher > refuses answer when the adapter declares ask false, naming target and adapter [4.40ms]
85 |     process.env.ORCH_DIR = directory;
86 |     const agentKey = key("local", "identity-less");
87 |     // A presence record with no `agent` field and no spawn-registry adapter is malformed, never pi.
88 |     seedStatus(directory, agentKey, { pid: process.pid });
89 | 
90 |     expect(deliverControl(agentKey, { kind: "answer", text: "yes" })).rejects.toThrow(
                                                                                   ^
error: expect(received).toThrow(expected)

Expected pattern: /headless~local~identity-less has no recorded adapter/
Received message: "C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-answer-DdYH3v\\settings.json does not exist ΓÇö orch has no built-in configuration and does nothing by default.\nRun: orch setup"

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\answer-dispatch.test.ts:90:79)
(fail) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [3.78ms]
100 |     process.env.ORCH_DIR = directory;
101 |     const agentKey = key("local", "socket-answer");
102 |     seedStatus(directory, agentKey, { agent: "pi", pid: process.pid });
103 |     await startAnswerServer(directory);
104 | 
105 |     expect(rpcCall(directory, "answer", { target: agentKey, text: "delivered" })).resolves.toEqual({ ok: true });
                                                                                                 ^
error: 

Expected promise that resolves
Received promise that rejected: Promise { <rejected> }

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\answer-dispatch.test.ts:105:92)
(fail) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [103.85ms]
115 |     seedStatus(directory, foreign, { agent: "pi", pid: process.pid });
116 |     await startAnswerServer(directory);
117 | 
118 |     expect(
119 |       rpcCall(directory, "answer", { target: foreign, text: "yes", actor: key("wA", "boss") }),
120 |     ).rejects.toThrow(/workspace wall/);
                    ^
error: expect(received).toThrow(expected)

Expected pattern: /workspace wall/
Received message: "C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-answer-c5F1eS\\settings.json does not exist ΓÇö orch has no built-in configuration and does nothing by default.\nRun: orch setup"

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\answer-dispatch.test.ts:120:15)
(fail) answer over the daemon control socket > refuses a cross-workspace answer at the daemon wall [15.76ms]
(pass) answer over the daemon control socket > refuses a non-owner answer, naming the owning orchestrator [39.88ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > workspaceNames is empty ΓÇö headless has no name concept [0.34ms]
(pass) HeadlessBackend > spawns a detached process and records its handle [111.21ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [132.54ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [91.59ms]
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [99.51ms]
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [1.95ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [1.85ms]
(pass) HeadlessBackend > never signals an unrecorded pid [1.60ms]

test\backend-herdr.test.ts:
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [0.77ms]
(pass) HerdrBackend > maps close and list to herdr helpers [0.18ms]
(pass) HerdrBackend > workspaceNames maps tab labels by workspace, first label wins, unlabeled skipped [0.24ms]

test\backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [0.17ms]
(pass) TmuxBackend > reports tmux availability [122.96ms]
(pass) TmuxBackend > workspaceNames is empty ΓÇö tmux sessions have no names distinct from ids [0.57ms]
(pass) TmuxBackend > reflects the TMUX environment [0.54ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.37ms]
(pass) TmuxBackend > list() and inventory() surface only orch-spawned panes [4.10ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [1.47ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [5.55ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [1.43ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [66.82ms]
(pass) TmuxBackend > waitAgentStatus fails immediately when the pane has no presence key [0.83ms]
(pass) TmuxBackend > read returns captured text and throws when capture-pane fails [1.27ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [1.32ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [3.14ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [1.86ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [4.40ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [1.86ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [1.11ms]
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [120.51ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [88.02ms]
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [103.32ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [2.73ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [98.17ms]

test\broker-governance.test.ts:
(pass) daemon governWrite enforcement > unscoped actor bypasses ownership and the wall [67.74ms]
(pass) daemon governWrite enforcement > owner may write to its own agent [49.54ms]
(pass) daemon governWrite enforcement > a foreign owner in the same workspace is refused [64.49ms]
38 |   });
39 | 
40 |   test("a cross-workspace write is refused by the wall before ownership", () => {
41 |     const dir = freshDir();
42 |     setOwner(dir, "herdr~wB~p1", "herdr~wB~p9");
43 |     expect(() => governWrite(dir, "herdr~wB~p1", { actor: "herdr~wA~p9", text: "hi" })).toThrow(/workspace wall/);
                                                                                             ^
error: expect(received).toThrow(expected)

Expected pattern: /workspace wall/
Received message: "C:\\Users\\Bryan\\.orch\\settings.json does not exist ΓÇö orch has no built-in configuration and does nothing by default.\nRun: orch setup"

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\broker-governance.test.ts:43:89)
(fail) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [70.55ms]
(pass) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [56.66ms]
(pass) daemon governWrite enforcement > --steal transfers ownership to the actor [59.27ms]
(pass) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [56.91ms]

test\broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [56.00ms]
280 |  * settings.json is a loud error naming the file and `orch setup`, never a silent empty
281 |  * config. Use `loadConfigOrNull` only where first-run really must be distinguished. */
282 | export function loadConfig(orchDir: string): OrchConfig {
283 |   const config = loadConfigOrNull(orchDir);
284 |   if (config === null) {
285 |     throw new Error(`${settingsPath(orchDir)} does not exist ΓÇö orch has no built-in configuration and does nothing by default.\nRun: orch setup`);
                                                                                                                                                     ^
error: C:\Users\Bryan\.orch\settings.json does not exist ΓÇö orch has no built-in configuration and does nothing by default.
Run: orch setup
      at loadConfig (C:\Users\Bryan\Documents\orch\src\config.ts:285:144)
      at checkWall (C:\Users\Bryan\Documents\orch\src\policy\workspace.ts:44:39)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\broker-ownership.test.ts:42:21)
(fail) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [3.32ms]
(pass) broker ownership and workspace governance > work-loop selection stays within the origin workspace [62.53ms]

test\broker-routing.test.ts:
(pass) broker CLI routing > write refuses when the daemon socket is unavailable [5565.97ms]
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [264.83ms]
(pass) broker CLI routing > dispatch failure is daemon-absent, not herdr-not-found [5269.30ms]

test\check-bridge.test.ts:
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.09ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.05ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / config seams [0.09ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [0.53ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.15ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.04ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [0.34ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [0.80ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.17ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.30ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke-test exemption is documented and load-bearing [0.10ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has exactly one identity-branch line and it is exempted [8.05ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.16ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.04ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [0.64ms]

test\claude-adapter.test.ts:
(pass) Claude adapter > declares its identity and capabilities [0.25ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.11ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.18ms]
(pass) Claude adapter > detects state from a live presence status [2.08ms]
(pass) Claude adapter > extracts result.json before transcript and native output [3.48ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [2.07ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [161.51ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [2185.64ms]
(pass) Claude adapter > exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session) [294.48ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed ORCH_AGENT_KEY [263.96ms]

test\claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [555.01ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [1013.80ms]
(pass) claude-hooks shim > under node > writes status.json for a valid key [633.81ms]
(pass) claude-hooks shim > under deno > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [385.56ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under deno > exits 1 loudly on a present-but-malformed key [334.01ms]
(pass) claude-hooks shim > under deno > writes status.json for a valid key [1727.08ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [241.37ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [154.28ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [152.71ms]
(skip) claude-hooks shim tests need the dist bundle

test\clean-worktrees.test.ts:
Preparing worktree (new branch 'orch/empty')
Preparing worktree (new branch 'orch/merged')
Preparing worktree (new branch 'orch/unmerged')
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [8274.47ms]
Preparing worktree (new branch 'orch/discard')
fatal: 'refs/heads/orch/discard' - not a valid ref
(pass) clean worktrees > --force discards an unmerged orphan and its branch [3983.07ms]

test\cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [1.10ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [1.41ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [1.38ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [1.55ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [3.16ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.56ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [658.29ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [0.78ms]
(pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [457.80ms]
(pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [2.05ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [710.51ms]
(pass) headless common path: identity key -> presence > one adapter uses opaque keys across headless and tmux backend routes [0.29ms]
(pass) headless common path: identity key -> presence > workspaceOf reads the workspace from the structured key, not a regex [0.26ms]

test\cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.24ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [72.38ms]
(pass) tmux backend registry and capabilities > exposes pane capabilities [0.19ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.18ms]
(pass) tmux backend registry and capabilities > serializes tmux identities as one flat key [0.24ms]
(pass) tmux backend registry and capabilities > rejects an empty handle without invoking tmux [0.09ms]
(pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [38.13ms]
(pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [0.36ms]
(pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [0.27ms]
280 |  * settings.json is a loud error naming the file and `orch setup`, never a silent empty
281 |  * config. Use `loadConfigOrNull` only where first-run really must be distinguished. */
282 | export function loadConfig(orchDir: string): OrchConfig {
283 |   const config = loadConfigOrNull(orchDir);
284 |   if (config === null) {
285 |     throw new Error(`${settingsPath(orchDir)} does not exist ΓÇö orch has no built-in configuration and does nothing by default.\nRun: orch setup`);
                    ^
error: C:\Users\Bryan\.orch\settings.json does not exist ΓÇö orch has no built-in configuration and does nothing by default.
Run: orch setup
      at loadConfig (C:\Users\Bryan\Documents\orch\src\config.ts:285:15)
      at checkWall (C:\Users\Bryan\Documents\orch\src\policy\workspace.ts:44:39)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\cli-backends-tmux.test.ts:112:22)
(fail) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-workspace [0.92ms]

test\cmd-lock-bridge.test.ts:
(pass) pi-bridge command-lock interception > wraps a matching locked command in acquireΓåÆrelease around the tool call [105.44ms]
(pass) pi-bridge command-lock interception > leaves a non-matching command untouched ΓÇö no acquire, no release [37.24ms]
(pass) pi-bridge command-lock interception > only bash tool calls are intercepted ΓÇö a non-bash tool never acquires [17.33ms]

test\cmd-lock.test.ts:
(pass) command lock > acquire and release round-trip [13.96ms]
(pass) command lock > second acquire blocks until first releases [82.24ms]
(pass) command lock > dead-pid lock is reaped [15.91ms]
(pass) command lock > release with wrong pid refuses [10.92ms]
bun test held by agent-a (pid 3804)
(pass) command lock > matches locked command prefixes and probes settings [16.44ms]
(pass) command lock > run propagates the child exit code [570.57ms]

test\codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [22.26ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [0.49ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [0.93ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [1.44ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [1.01ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [454.94ms]

test\command-workspace-fields.test.ts:
(pass) command workspace fields > status and wall entities use persisted workspace instead of serialized-key text [33.35ms]
(pass) command workspace fields > status reports a mixed pi and Claude fleet with the same identity fields [33.43ms]

test\commands-clean.test.ts:
(pass) commands/clean > reaps dead agent dirs but preserves live pids [7.88ms]

test\commands-control.test.ts:
(pass) commands/control > parses dispatch flags without losing prompt words [2.86ms]
(pass) commands/control > parses --then destination and note [0.11ms]
(pass) commands/control > adds worker header unless raw [0.22ms]

test\commands-daemon.test.ts:
(pass) commands/daemon > parses governance and validates daemon status [0.29ms]
(pass) commands/daemon > reads only a positive integer lock pid [2.45ms]

test\commands-events.test.ts:
(pass) commands/events > parses filters and scope flags [2.40ms]
(pass) commands/events > a dropped subscription names the command that recovers it [0.05ms]
(pass) commands/events > rejects malformed event and labels sinks [0.22ms]

test\commands-index.test.ts:
(pass) commands/index > does not gate help or noninteractive commands [2.26ms]
(pass) commands/index > reads a package version string [0.58ms]

test\commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [0.54ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [0.23ms]

test\commands-panes.test.ts:
(pass) commands/panes > pane identity remains backend-neutral [1.90ms]
(pass) commands/panes > exports the pane listing command directly [0.09ms]

test\commands-queue.test.ts:
(pass) commands/queue > round-trips add/list/cancel on an isolated store [29.87ms]
No queue tasks.
(pass) commands/queue > renders empty queues without throwing [0.26ms]

test\commands-results.test.ts:
(pass) commands/results > validates and extracts question payloads [2.97ms]
(pass) commands/results > formats invalid and recent timestamps [0.22ms]
(pass) commands/results > routes a seeded result.json through the command module [476.70ms]
(pass) commands/results > orch tail resolves a non-pi target through that adapter's session view [548.35ms]
(pass) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [532.73ms]
(pass) commands/results > orch tail -n keeps last-N rendered entries for a pi session [107.68ms]
(pass) commands/results > orch session reports the pi entry count [87.77ms]
(pass) commands/results > orch session shows zero entries for an adapter view without them [98.04ms]

test\commands-review.test.ts:
(pass) commands/review > uses the short orch branch as review target [2.10ms]
(pass) commands/review > falls back to branch then pane [0.08ms]

test\commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.25ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [0.68ms]
(pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.31ms]
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > a consistent selection records silently and never prompts [0.36ms]
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > no installed entrypoint leaves the selection untouched [0.14ms]
Runtime mismatch: the installed orch entrypoint (/usr/local/bin/orch) is a node build, but you selected bun.
  A bun install requires a rebuild: bun run build:dev
  recording node to match the installed entrypoint ΓÇö re-run orch setup --runtime bun after bun run build:dev to switch
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > a mismatch records nothing without confirmation ΓÇö the consistent value wins [0.17ms]
Runtime mismatch: the installed orch entrypoint (/usr/local/bin/orch) is a node build, but you selected bun.
  A bun install requires a rebuild: bun run build:dev
  recording bun ΓÇö pending rebuild; run bun run build:dev to make it real
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > a mismatch records the selection only on explicit confirmation [0.16ms]
Runtime mismatch: the installed orch entrypoint (/usr/local/bin/orch) is a node build, but you selected bun.
  A bun install requires a rebuild: bun run build:dev
  recording node to match the installed entrypoint ΓÇö re-run orch setup --runtime bun after bun run build:dev to switch
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > non-interactive never prompts and records the consistent value [0.21ms]

test\commands-spawn.test.ts:
(pass) commands/spawn > parses spawn flags and rejects no implicit adapter assumptions [0.68ms]
(pass) commands/spawn > identifies pi launchers and preserves raw prompt [0.21ms]

test\commands-status.test.ts:
(pass) commands/status > derives view fields from seeded presence [1.09ms]
(pass) commands/status > marks dead presence as exited [0.15ms]
(pass) commands/status > shared status row carries presence-derived fields [0.48ms]
(pass) commands/status > json branch and local table branch derive identical rows apart from host [0.15ms]
(pass) commands/status > formats workspace labels and warnings [0.16ms]

test\commands-target.test.ts:
(pass) commands/target > splits known flags and preserves positional args [2.20ms]
(pass) commands/target > extracts target and joined prompt [0.26ms]
(pass) commands/target > reads only structured result text [0.08ms]
(pass) commands/target > quotes remote args and ORCH_DIR safely [0.16ms]
(pass) commands/target > lists only live serialized identity presence entries [7.22ms]

test\config-precedence.test.ts:
(pass) config precedence > returns a defaults value when no override is set [3.16ms]
(pass) config precedence > applies defaults when config, env, and flag are absent [1.77ms]
(pass) config precedence > uses env over config and flag over env [1.95ms]
(pass) config precedence > parses notify entries and hosts into expected shapes [4.86ms]
(pass) config precedence > reports a helpful validation error for invalid config [2.56ms]

test\config-watch.test.ts:
(pass) watchConfig > loads initially and applies a valid edit after the debounce [51.57ms]
(pass) watchConfig > keeps the last-good config, warns once, and recovers [428.96ms]
(pass) watchConfig > reloads on a touched reload.signal without a settings edit [48.72ms]
(pass) watchConfig > stop prevents further callbacks [420.56ms]

test\config.test.ts:
(pass) loadConfig > refuses to invent a configuration when settings.json is missing [4.35ms]
(pass) loadConfig > requires a top-level runtime and never defaults it [11.81ms]
(pass) loadConfig > rejects an unrecognized runtime naming the accepted values [8.86ms]
(pass) loadConfig > rejects a runtime misplaced under defaults [9.58ms]
(pass) loadConfig > reads the declared runtime [10.22ms]
77 |       notify: [{ id: "webhook", on: ["done", "error"], url: "https://example.test/orch" }],
78 |       hosts: { gpu1: { dest: "bryan@gpu1" } },
79 |       workspaces: { wD: "Design" },
80 |     });
81 | 
82 |     expect(loadConfig(directory)).toEqual({
                                       ^
error: expect(received).toEqual(expected)

  {
+   "daemon": {
+     "tcp_port": 3716,
+   },
    "defaults": {
      "adapter": "claude",
      "backend": "headless",
      "model": "sonnet",
      "worktree": true,
    },
    "fleet": {
      "cross_workspace": true,
      "max_agents": 12,
      "spawn_cap": 4,
      "worker_peer_tools": true,
      "workspace_caps": {
        "wD": 4,
      },
    },
    "hosts": {
      "gpu1": {
        "dest": "bryan@gpu1",
      },
    },
    "installed": {
      "adapters": [
        "pi",
        "claude",
      ],
      "backends": [
        "headless",
      ],
    },
    "locked_commands": [],
    "models": {
      "allowed": [
        "sonnet",
      ],
    },
    "notify": [
      {
        "id": "webhook",
        "on": [
          "done",
          "error",
        ],
        "url": "https://example.test/orch",
      },
    ],
    "queue": {
      "max_retries": 3,
    },
    "runtime": "node",
    "timeouts": {
      "adapter_command_ms": 33,
      "dispatch_ack_ms": 11,
      "notify_ms": 44,
      "wait_ms": 22,
    },
    "workspaces": {
      "wD": "Design",
    },
  }

- Expected  - 0
+ Received  + 3

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\config.test.ts:82:35)
(fail) loadConfig > parses every supported settings section [23.02ms]
(pass) loadConfig > rejects a file without the current schemaVersion [12.87ms]
(pass) loadConfig > rejects invalid JSON loudly [6.84ms]
(pass) loadConfig > names the key path for invalid fields [13.36ms]
(pass) loadConfig > rejects unknown settings keys [20.97ms]
(pass) loadConfig > parses models.allowed as a string array [8.11ms]
(pass) loadConfig > rejects old settings keys [45.66ms]
(pass) loadConfig > rejects legacy notify type and unknown ids [19.41ms]
(pass) loadConfig > applies timeout defaults and disables cross-workspace writes by default [15.58ms]
(pass) loadConfig > rejects a host without dest [10.54ms]
(pass) loadConfig > rejects an unknown id in installed.adapters [12.94ms]
(pass) loadConfig > rejects defaults.adapter not present in installed.adapters [5.04ms]
(pass) loadConfig > rejects when settings.json is absent but a legacy config.toml exists [7.56ms]
(pass) allowedModelPatterns > returns the built-in defaults when config is absent [7.28ms]
(pass) allowedModelPatterns > returns the configured patterns when set [11.30ms]
(pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or installed entry [29.31ms]
(pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [13.46ms]
(pass) writeSettingsRuntime > a different runtime replaces the single value in place [15.90ms]
(pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [26.61ms]
(pass) reapUnreadableSettings > leaves a readable file alone [63.51ms]
(pass) writeSettingsInstalled > round-trips both provider arrays [115.03ms]
(pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [28.92ms]
(pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [23.00ms]
(pass) writeSettingsDefault > is idempotent when rewriting the same value [16.92ms]
(pass) writeSettingsDefault > refuses to write through an out-of-version settings file [3.25ms]
(pass) writeSettingsDefault > switches defaults.adapter between two installed ids and loads clean [26.22ms]
330 |     delete process.env.ORCH_CONFIG_PRECEDENCE;
331 |     const directory = tempDir();
332 |     writeSettingsFixture(directory);
333 |     const config = loadConfig(directory);
334 | 
335 |     expect(resolveSetting<number>({ env: "ORCH_CONFIG_PRECEDENCE", config: config.fleet.spawn_cap, fallback: 2 })).toBe(2);
                                                                                                                         ^
error: expect(received).toBe(expected)

Expected: 2
Received: 8

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\config.test.ts:335:116)
(fail) config precedence > uses the fallback when env and settings.json omit a setting [9.23ms]
(pass) config precedence > uses the settings.json value over the fallback [8.35ms]
(pass) config precedence > uses the ORCH_* environment value over settings.json [7.01ms]
(pass) config precedence > uses an explicit flag override over the environment [0.46ms]
(pass) resolveSetting > uses flag, environment coercion, config, then fallback in precedence order [1.38ms]
(pass) resolveWithSource > reports the winning source at each precedence level [0.84ms]

test\control-dispatch.test.ts:
280 |  * settings.json is a loud error naming the file and `orch setup`, never a silent empty
281 |  * config. Use `loadConfigOrNull` only where first-run really must be distinguished. */
282 | export function loadConfig(orchDir: string): OrchConfig {
283 |   const config = loadConfigOrNull(orchDir);
284 |   if (config === null) {
285 |     throw new Error(`${settingsPath(orchDir)} does not exist ΓÇö orch has no built-in configuration and does nothing by default.\nRun: orch setup`);
                    ^
error: C:\Users\Bryan\AppData\Local\Temp\orch-control-dispatch-QPkGCt\settings.json does not exist ΓÇö orch has no built-in configuration and does nothing by default.
Run: orch setup
      at loadConfig (C:\Users\Bryan\Documents\orch\src\config.ts:285:15)
      at deliverControl (C:\Users\Bryan\Documents\orch\src\control\dispatch.ts:113:21)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\control-dispatch.test.ts:57:12)
(fail) deliverControl > steers pi through its presence inbox [15.92ms]
280 |  * settings.json is a loud error naming the file and `orch setup`, never a silent empty
281 |  * config. Use `loadConfigOrNull` only where first-run really must be distinguished. */
282 | export function loadConfig(orchDir: string): OrchConfig {
283 |   const config = loadConfigOrNull(orchDir);
284 |   if (config === null) {
285 |     throw new Error(`${settingsPath(orchDir)} does not exist ΓÇö orch has no built-in configuration and does nothing by default.\nRun: orch setup`);
                    ^
error: C:\Users\Bryan\AppData\Local\Temp\orch-control-dispatch-h1vl74\settings.json does not exist ΓÇö orch has no built-in configuration and does nothing by default.
Run: orch setup
      at loadConfig (C:\Users\Bryan\Documents\orch\src\config.ts:285:15)
      at deliverControl (C:\Users\Bryan\Documents\orch\src\control\dispatch.ts:113:21)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\control-dispatch.test.ts:74:13)
(fail) deliverControl > warns and succeeds when claude keys fallback delivers [96.75ms]
83 |     const directory = tempDir();
84 |     process.env.ORCH_DIR = directory;
85 |     const key = target("headless", "claude-fail");
86 |     presence(directory, key, "claude");
87 | 
88 |     expect(deliverControl(key, { kind: "steer", text: "hello claude" })).rejects.toThrow(/cannot steer .*backend cannot deliver/);
                                                                                      ^
error: expect(received).toThrow(expected)

Expected pattern: /cannot steer .*backend cannot deliver/
Received message: "C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-control-dispatch-dHDJ7Q\\settings.json does not exist ΓÇö orch has no built-in configuration and does nothing by default.\nRun: orch setup"

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\control-dispatch.test.ts:88:82)
(fail) deliverControl > fails when claude keys fallback cannot deliver [32.34ms]
(skip) deliverControl > executes codex steer command and accepts exit zero
(skip) deliverControl > treats a nonzero codex command exit as failure
123 |     presence(directory, key, "claude");
124 |     const caps: { steer: "inbox" | "keys" | "resume" | "none" } = claudeAdapter.caps;
125 |     const previousSteer = caps.steer;
126 |     caps.steer = "none";
127 |     try {
128 |       expect(deliverControl(key, { kind: "steer", text: "nope" })).rejects.toThrow(/steer.*none/);
                                                                                 ^
error: expect(received).toThrow(expected)

Expected pattern: /steer.*none/
Received message: "C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-control-dispatch-sBFMks\\settings.json does not exist ΓÇö orch has no built-in configuration and does nothing by default.\nRun: orch setup"

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\control-dispatch.test.ts:128:76)
(fail) deliverControl > fails unsupported steer and setModel capabilities [21.34ms]
136 |     const directory = tempDir();
137 |     process.env.ORCH_DIR = directory;
138 |     const key = target("headless", "missing-presence");
139 |     recordSpawned(key, { adapter: "pi", backend: "headless", handle: key });
140 | 
141 |     expect(deliverControl(key, { kind: "steer", text: "lost" })).rejects.toThrow(/no presence dir/);
                                                                               ^
error: expect(received).toThrow(expected)

Expected pattern: /no presence dir/
Received message: "C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-control-dispatch-qLDOUW\\settings.json does not exist ΓÇö orch has no built-in configuration and does nothing by default.\nRun: orch setup"

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\control-dispatch.test.ts:141:74)
(fail) deliverControl > requires presence for inbox delivery [395.05ms]

test\daemon-events.test.ts:
(pass) daemon presence events > an RPC subscriber receives a presence transition [243.97ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [0.34ms]
(pass) daemon presence events > a blocked transition drives command sink delivery [234.69ms]
(pass) daemon presence events > a dead daemon closes the subscription instead of falling back to files [208.24ms]
(pass) daemon presence events > a caller-initiated stop is not reported as a disconnect [390.41ms]

test\daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [23.58ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [25.31ms]
(pass) daemon lifecycle > rejects malformed locks and a socket probe that fails [25.17ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [13.45ms]
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [225.55ms]
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.3.14+0d9b296af)

Usage: bun <command> [...flags] [...args]

Commands:
  run       ./my-script.ts       Execute a file with Bun
            lint                 Run a package.json script
  test                           Run unit tests with Bun
  x         vite                 Execute a package binary (CLI), installing if needed (bunx)
  repl                           Start a REPL session with Bun
  exec                           Run a shell script directly with Bun

  install                        Install dependencies for a package.json (bun i)
  add       @evan/duckdb         Add a dependency to package.json (bun a)
  remove    is-array             Remove a dependency from package.json (bun rm)
  update    @zarfjs/zarf         Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
  outdated                       Display latest versions of outdated dependencies
  link      [<package>]          Register or link a local npm package
  unlink                         Unregister a local npm package
  publish                        Publish a package to the npm registry
  patch <pkg>                    Prepare a package for patching
  pm <subcommand>                Additional package management utilities
  info      zod                  Display package metadata from the registry
  why       tailwindcss          Explain why a package is installed

  build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file

  init                           Start an empty Bun project from a built-in template
  create    next-app             Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [144.74ms]
(pass) daemon lifecycle > rejects a recycled pid identity [7.69ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [4.60ms]

test\daemon-rpc.test.ts:
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.3.14+0d9b296af)

Usage: bun <command> [...flags] [...args]

Commands:
  run       ./my-script.ts       Execute a file with Bun
            lint                 Run a package.json script
  test                           Run unit tests with Bun
  x         prisma               Execute a package binary (CLI), installing if needed (bunx)
  repl                           Start a REPL session with Bun
  exec                           Run a shell script directly with Bun

  install                        Install dependencies for a package.json (bun i)
  add       hono                 Add a dependency to package.json (bun a)
  remove    browserify           Remove a dependency from package.json (bun rm)
  update    react                Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
  outdated                       Display latest versions of outdated dependencies
  link      [<package>]          Register or link a local npm package
  unlink                         Unregister a local npm package
  publish                        Publish a package to the npm registry
  patch <pkg>                    Prepare a package for patching
  pm <subcommand>                Additional package management utilities
  info      lyra                 Display package metadata from the registry
  why       @remix-run/dev       Explain why a package is installed

  build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file

  init                           Start an empty Bun project from a built-in template
  create    svelte               Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon RPC > round-trips a call over the real unix socket [345.17ms]
(pass) daemon RPC > returns an error for an unknown method [260.41ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [187.56ms]
(pass) daemon RPC > delivers pushed subscription events [87.17ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [362.35ms]
(pass) daemon RPC > has a catchable absent-daemon error [13.83ms]

test\doctor-backends.test.ts:
(pass) doctor backend and presence checks > reports every registered backend and boolean capability fields [88.79ms]
(pass) doctor backend and presence checks > passes with herdr active while an installed tmux sits outside a session [0.44ms]
(pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.19ms]
(pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [0.15ms]
(pass) doctor backend and presence checks > fails when any installed backend is unavailable, active or not [0.09ms]
(pass) doctor backend and presence checks > honours the configured default over the probe order [0.08ms]
(pass) doctor backend and presence checks > reports only records missing the current schema stamp [8.19ms]

test\doctor-checks.test.ts:
(pass) doctor notification-sink checks > reports no sinks as healthy [35.58ms]
(pass) doctor notification-sink checks > rejects a webhook with a malformed URL [2.88ms]
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [34.69ms]
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [30.17ms]

test\doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [63.72ms]
(pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [62.82ms]
(pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [203.42ms]
(pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [149.05ms]
(pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [131.53ms]
(pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [797.59ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [257.23ms]
(pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [289.62ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [462.19ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [5.93ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [3.25ms]

test\doctor-hosts.test.ts:
(pass) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [123.25ms]
(pass) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [183.35ms]
(pass) doctor remote host checks > flags a remote orch version/schema mismatch in detail [125.89ms]
(pass) doctor remote host checks > reports no remote hosts configured as healthy [74.11ms]

test\doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env node as node [2.22ms]
(pass) shebangRuntime > reads #!/usr/bin/env bun as bun [1.72ms]
(pass) shebangRuntime > reads #!/usr/bin/env deno as deno [1.44ms]
(pass) shebangRuntime > reads #!/usr/local/bin/node as node [1.35ms]
(pass) shebangRuntime > does not mistake a longer binary name for a runtime [1.41ms]
(pass) shebangRuntime > returns null for a file with no shebang [1.45ms]
(pass) shebangRuntime > returns null for an unreadable path [1.07ms]
(pass) runningRuntime > reports the runtime this suite is executing under [0.09ms]
(pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [2.15ms]
(pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [1.80ms]
(pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [1.77ms]
(pass) doctor runtime verdict table > declared node but executing under bun fails [2.02ms]
(pass) doctor runtime verdict table > declared bun but executing under node fails just as loudly [2.35ms]
(pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [2.44ms]
(pass) doctor runtime verdict table > declared runtime absent from PATH fails [2.48ms]
(pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [1.86ms]
(pass) doctor runtime verdict table > remediation names both directions ΓÇö rebuild, or re-record the declaration [1.50ms]
(pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [1.11ms]

test\doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [65.63ms]
(pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [59.84ms]
(pass) doctor stale presence safety > no dead agents leaves nothing to remove [64.79ms]

test\doctor-unscoped-tasks.test.ts:
(pass) doctor unscoped queue tasks > only scoped tasks pass [24.91ms]
(pass) doctor unscoped queue tasks > reports a null-workspace row as reappable and names it [29.63ms]
(pass) doctor unscoped queue tasks > stays report-only ΓÇö no pre-selected destructive fix [26.82ms]
(pass) doctor unscoped queue tasks > the check is wired into runDoctor [88.60ms]

test\doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [10.70ms]
44 |     // must still get a full report: absence of configuration is the answer for a check whose
45 |     // subject is a configured section, never a defect.
46 |     const results = await runDoctor(tempDir(), () => ({ ok: true, stdout: "", stderr: "", code: 0 }));
47 | 
48 |     for (const entry of results.filter((row) => row.status === "fail")) {
49 |       expect(entry.detail).not.toContain("settings.json");
                                    ^
error: expect(received).not.toContain(expected)

Expected to not contain: "settings.json"
Received: "C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-doctor-fXhf58\\settings.json is missing; run orch setup"

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\doctor.test.ts:49:32)
(fail) runDoctor > runs on an unconfigured install without failing for want of settings.json [562.97ms]
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [297.85ms]
(pass) runDoctor > reports an absent daemon as optional [219.95ms]
(pass) runDoctor > reports and fixes a stale daemon lock [247.12ms]
(pass) runDoctor > accepts a live daemon and an answerable socket [525.39ms]
(pass) runDoctor > warns when the live daemon code hash is stale [121.21ms]
(pass) runDoctor > fails on an invalid lock and an unanswerable live socket [126.18ms]
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [3.62ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [3.35ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [3.83ms]
(pass) runDoctor > reports a dead presence pid and corrupt spawn registry lines [58.11ms]
(pass) runDoctor > bins check is driven by the installed set and offers no fix [87.14ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [2.69ms]
(pass) runDoctor > validates configured notifier adapters [320.53ms]
notify: could not load settings.json: C:\Users\Bryan\AppData\Local\Temp\orch-doctor-kONn70\settings.json: this settings file has invalid values: Γ£û Invalid input: expected number, received string ΓåÆ at queue.max_retries Fix those keys by hand, or re-record the file with: orch setup
269 |     const missing = tempDir();
270 | 
271 |     const configResult = check(await runDoctor(invalid), "config");
272 |     expect(configResult.status).toBe("fail");
273 |     expect(configResult.detail).toContain("settings.json");
274 |     expect(check(await runDoctor(missing), "config")).toEqual({ id: "config", label: "Config validity", status: "ok", detail: "no settings.json" });
                                                            ^
error: expect(received).toEqual(expected)

  {
-   "detail": "no settings.json",
+   "detail": "C:\Users\Bryan\AppData\Local\Temp\orch-doctor-aT2WPg\settings.json is missing; run orch setup",
    "id": "config",
    "label": "Config validity",
-   "status": "ok",
+   "status": "fail",
  }

- Expected  - 2
+ Received  + 2

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\doctor.test.ts:274:55)
(fail) runDoctor > reports invalid config and accepts missing config [130.94ms]
(pass) runDoctor > never throws when individual checks encounter broken inputs [137.59ms]

test\herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [0.51ms]
(pass) herdr and notification hardening > falls back to a real name when an adapter id is blank [0.13ms]
(pass) herdr and notification hardening > nameless notifications use a workspace label, never a bare pane key [0.33ms]

test\herdr-pane-state.test.ts:
(pass) retryableErrorMessage classifier > no assistant message ΓåÆ undefined [0.47ms]
(pass) retryableErrorMessage classifier > assistant that did not stop on error ΓåÆ undefined [0.08ms]
(pass) retryableErrorMessage classifier > error stop with non-retryable text ΓåÆ undefined [0.44ms]
(pass) retryableErrorMessage classifier > error stop with retryable text ΓåÆ the message [0.14ms]
(pass) retryableErrorMessage classifier > non-string retryable errorMessage is stringified before matching [0.07ms]
(pass) retryableErrorMessage classifier > only the last assistant turn is classified [0.19ms]
(pass) createPaneStateMachine state ordering > run ΓåÆ blocked ΓåÆ unblock ΓåÆ idle debounce [20.37ms]
(pass) createPaneStateMachine state ordering > dedupes unchanged state [3.05ms]
(pass) createPaneStateMachine state ordering > retryable end holds working, then settles to blocked after grace [58.80ms]
(pass) createPaneStateMachine state ordering > duplicate end after settling does not publish a false idle [33.76ms]
(pass) createPaneStateMachine state ordering > openSession forces a publish even when state is unchanged [6.88ms]

test\identity.test.ts:
(pass) serializeIdentity / parseIdentity round-trip > round-trips herdr [0.17ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with % handle [0.11ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with : and % handle [0.04ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips headless pid handle [0.03ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips empty workspace [0.03ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips separator inside parts [0.04ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips slash inside parts [0.04ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips percent-code-lookalike [0.03ms]
(pass) serializeIdentity / parseIdentity round-trip > serialized key is a single flat segment (no nested path) [0.13ms]
(pass) serializeIdentity / parseIdentity round-trip > backend namespaces prevent collisions across equal workspace/handle [0.30ms]
(pass) malformed input > rejects wrong segment count [0.29ms]
(pass) malformed input > rejects empty key [0.13ms]
(pass) malformed input > rejects empty backend or handle on serialize [0.20ms]
(pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.11ms]
(pass) malformed input > tryParseIdentity parses a valid key [0.09ms]

test\notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > skips an unavailable adapter without affecting available adapters [2.08ms]
notify: webhook notifier has invalid configuration
(pass) notifier registry and built-in adapters > reports malformed required configuration instead of throwing [1.04ms]
(pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [3.70ms]
(pass) notifier registry and built-in adapters > command adapter passes canonical JSON on stdin [363.25ms]
(pass) notifier registry and built-in adapters > desktop fallback selects notify-send, then WSL notify when it fails [37.44ms]
notify: bad sink failed
(pass) notifier registry and built-in adapters > isolates delivery failures and still delivers to other adapters [3.34ms]

test\notify-events-format.test.ts:
(pass) notification and presence event formatting > workspaceColor is stable and returns a palette hex [0.45ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.84ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [1.12ms]
(pass) notification and presence event formatting > webhook payload includes workspace and workspaceColor [2.64ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [1.91ms]
(pass) notification and presence event formatting > derivePresenceTransition derives workspace from identity keys [0.79ms]

test\notify-sinks.test.ts:
(pass) notify sinks > delivers command sink payload as JSON [482.96ms]
notify: could not load settings.json: C:\Users\Bryan\AppData\Local\Temp\orch-notify-sinks-Ty5Aui\settings.json: this settings file has invalid values: Γ£û Too small: expected string to have >=1 characters ΓåÆ at notify[0].command[2] Fix those keys by hand, or re-record the file with: orch setup
62 |         { id: "command", on: ["done"], command: nodeCommand("") },
63 |         { id: "webhook", on: ["error"], url: "https://example.test/notify" },
64 |       ],
65 |     });
66 | 
67 |     expect(loadSinks(directory)).toEqual([
                                      ^
error: expect(received).toEqual(expected)

- [
-   {
-     "command": [
-       "C:\Users\Bryan\.bun\bin\bun.exe",
-       "-e",
-       "",
-     ],
-     "on": [
-       "done",
-     ],
-     "type": "command",
-   },
-   {
-     "on": [
-       "error",
-     ],
-     "type": "webhook",
-     "url": "https://example.test/notify",
-   },
- ]
+ []

- Expected  - 20
+ Received  + 1

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\notify-sinks.test.ts:67:34)
(fail) notify sinks > loadSinks parses command and webhook declarations [19.16ms]

test\notify.test.ts:
60 |       ],
61 |     });
62 | 
63 |     const result = captureStderr(() => loadSinks(directory));
64 | 
65 |     expect(result.value).toEqual([
                              ^
error: expect(received).toEqual(expected)

- [
-   {
-     "on": [
-       "blocked",
-       "error",
-     ],
-     "type": "desktop",
-   },
-   {
-     "on": [
-       "done",
-       "error",
-     ],
-     "type": "webhook",
-     "url": "https://example.test/hook",
-   },
-   {
-     "command": [
-       "C:\Users\Bryan\.bun\bin\bun.exe",
-       "-e",
-       "",
-     ],
-     "on": [
-       "blocked",
-       "error",
-     ],
-     "type": "command",
-   },
-   {
-     "on": [
-       "done",
-     ],
-     "type": "herdr",
-   },
- ]
+ []

- Expected  - 35
+ Received  + 1

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\notify.test.ts:65:26)
(fail) notify > parses valid sinks and applies default on states [15.86ms]
(pass) notify > delivers only to sinks whose on filter matches the event [397.42ms]
(pass) notify > command sink writes the event payload as JSON on stdin [157.13ms]
(pass) notify > titles lead with exactly one terminal state and agent [0.49ms]
(pass) notify > webhook failure is non-fatal and reports a warning [30.22ms]

test\orchd-rpc-reconnect.test.ts:
(pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [366.61ms]
(pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1058.61ms]

test\orchd-rpc-replay.test.ts:
(pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [0.70ms]
(pass) orchd RPC replay buffer > drops the oldest events and reports a replay gap [3.96ms]

test\orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [111.86ms]

test\orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [15.65ms]
(pass) orchd RPC transports > round-trips over the TCP fallback transport [110.69ms]

test\outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [81.42ms]

test\outbox.test.ts:
(pass) outbox delivery > selects pending messages and delivers each message once [77.44ms]
(pass) outbox delivery > keeps failed messages pending until their backoff expires [305.73ms]

test\ownership.test.ts:
(pass) agent ownership > round-trips an owner [155.91ms]
(pass) agent ownership > allows unowned and same-owner writes [51.58ms]
(pass) agent ownership > denies foreign writes and supports stealing [71.17ms]

test\parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [12.02ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.54ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [1.20ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.70ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [1.77ms]

test\pi-model-control.test.ts:
(pass) splitThinkingSuffix > splits a valid ladder effort off the bare id [1.30ms]
(pass) splitThinkingSuffix > leaves a bare model untouched [0.27ms]
(pass) splitThinkingSuffix > keeps a trailing colon token that is not a thinking level as part of the id [0.22ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > looks up the BARE id and returns the effort suffix separately [8.97ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > retries until a still-booting registry answers [25.66ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > throws when the registry never yields the model [12.35ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > rejects a model outside the allowlist before any registry lookup [3.19ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > rejects a token without a provider/id shape [8.80ms]
(pass) isAllowedModel > always allows openai-codex, applies globs to the rest [4.58ms]
(pass) createModelControl.applyControlCommand > applies a suffixed model command and records a success outcome [14.69ms]
(pass) createModelControl.applyControlCommand > records a failure outcome when the model is rejected [14.38ms]
(pass) createModelControl.applyControlCommand > applies a thinking command directly [8.65ms]

test\pid-liveness.test.ts:
(pass) pidAlive liveness contract (shared by pi peers) > EPERM means the process exists under another user ΓÇö alive [16.31ms]
(pass) pidAlive liveness contract (shared by pi peers) > ESRCH means no such process ΓÇö dead [0.23ms]
(pass) pidAlive liveness contract (shared by pi peers) > the current process is alive [0.23ms]
(pass) pidAlive liveness contract (shared by pi peers) > non-positive and non-numeric pids are rejected without signalling [0.44ms]

test\presence-schema.test.ts:
(pass) presence status schema > reads a spawned namespaced identity with backend, workspace, handle, and adapter [145.58ms]
(pass) presence status schema > orch status JSON exposes the complete spawned identity fields [117.51ms]
(pass) presence status schema > status and list report the same agent identity [201.72ms]
(pass) presence status schema > mixed pi and Claude status rows carry the same identity field set [98.86ms]
(pass) presence status schema > rejects a status record that carries no schema stamp [99.05ms]
(pass) presence status schema > rejects a status record stamped with a non-current schema [94.93ms]
(pass) presence status schema > a malformed record is skipped without hiding the valid records beside it [84.22ms]
(pass) presence status schema > persists the complete spawned identity record [23.35ms]

test\queue-workspace-replay.test.ts:
(pass) queue workspace replay > persists workspace through append-only replay [65.52ms]
(pass) queue workspace replay > a malformed null-workspace row replays but is never claimable [77.01ms]
(pass) queue workspace replay > replays separate workspace values for multiple tasks [92.26ms]
(pass) queue workspace replay > selects only tasks eligible for the requested workspace [102.48ms]

test\queue.test.ts:
(pass) queue > add then list shows a queued task [49.88ms]
(pass) queue > exactly one claimer wins, including parallel attempts [64.08ms]
(pass) queue > replays done, failed, and retry transitions [80.50ms]
(pass) queue > cancels queued tasks and returns an error result for claimed tasks [58.84ms]
(pass) queue > picks queued tasks FIFO, honoring the agent constraint [62.25ms]
(pass) queue > caps retries: requeue below the cap, terminal failed at it [60.93ms]
(pass) queue > settles a claimed task to done and blocks any later claim [73.12ms]
(pass) queue > exactly one of two racing claimers wins [54.20ms]
(pass) queue > rejects an unscoped task at enqueue [47.46ms]
(pass) queue > a malformed null-workspace row is skipped at claim, never dispatched [62.95ms]

test\remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [755.23ms]
(pass) async remote fan-out > returns a typed dead-host failure [162.85ms]
(pass) async remote fan-out > returns a typed timeout failure [567.82ms]
(pass) async remote fan-out > returns a typed non-JSON failure [237.53ms]
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [988.72ms]

test\remote.test.ts:
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.58ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.89ms]

test\review.test.ts:
Preparing worktree (new branch 'orch/feature-1')
(pass) review plumbing > lists only done worktree agents with commits ahead [2788.70ms]
Preparing worktree (new branch 'orch/iterate-1')
(pass) review plumbing > reject re-dispatches feedback through the adapter inbox [4690.57ms]
Preparing worktree (new branch 'orch/approve-1')
fatal: 'refs/heads/orch/approve-1' - not a valid ref
(pass) review plumbing > approve merges and removes the worktree and branch [4492.25ms]
Preparing worktree (new branch 'orch/conflict-1')
hint: Diverging branches can't be fast-forwarded, you need to either:
hint:
hint: 	git merge --no-ff
hint:
hint: or:
hint:
hint: 	git rebase
hint:
hint: Disable this message with "git config set advice.diverging false"
fatal: Not possible to fast-forward, aborting.
(pass) review plumbing > conflicting approval aborts without changing either branch [3841.34ms]
Preparing worktree (new branch 'orch/merge-1')
hint: Diverging branches can't be fast-forwarded, you need to either:
hint:
hint: 	git merge --no-ff
hint:
hint: or:
hint:
hint: 	git rebase
hint:
hint: Disable this message with "git config set advice.diverging false"
fatal: Not possible to fast-forward, aborting.
(pass) review plumbing > non-fast-forward approval creates a merge commit [4766.98ms]

test\routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves origin workspace selection [117.01ms]
(pass) store hardening > a fresh store creates the full current schema with WAL enabled [79.10ms]
(pass) store hardening > a steal updates ownership only when the observed owner still matches [104.13ms]
(pass) store hardening > the conditional claim is exactly once [74.85ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [354.91ms]

test\settings-command.test.ts:
49 |       installed: { adapters: ["pi", "claude"], backends: ["headless"] },
50 |       defaults: { adapter: "pi", backend: "headless" },
51 |     });
52 | 
53 |     const report = JSON.parse(runSettings(directory, {}, "--json")) as Record<string, { value: unknown; source: string }>;
54 |     expect(report.adapter).toEqual({ value: "pi", source: "settings.json" });
                                ^
error: expect(received).toEqual(expected)

- {
-   "source": "settings.json",
-   "value": "pi",
- }
+ undefined

- Expected  - 4
+ Received  + 1

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\settings-command.test.ts:54:28)
(fail) orch settings > --json reports value + source per setting, settings.json winning over defaults [1161.79ms]
64 |       installed: { adapters: ["pi"], backends: [] },
65 |       defaults: { adapter: "pi" },
66 |     });
67 | 
68 |     const report = JSON.parse(runSettings(directory, { ORCH_ADAPTER: "claude" }, "--json")) as Record<string, { value: unknown; source: string }>;
69 |     expect(report.adapter).toEqual({ value: "claude", source: "env" });
                                ^
error: expect(received).toEqual(expected)

- {
-   "source": "env",
-   "value": "claude",
- }
+ undefined

- Expected  - 4
+ Received  + 1

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\settings-command.test.ts:69:28)
(fail) orch settings > --json reports env as the winning source over settings.json [781.61ms]
76 |       defaults: { adapter: "pi", backend: "headless" },
77 |     });
78 | 
79 |     expect(runSettings(directory, {}, "--harness=claude")).toContain("default adapter = claude");
80 |     const report = JSON.parse(runSettings(directory, {}, "--json")) as Record<string, { value: unknown }>;
81 |     expect(report.adapter!.value).toBe("claude");
                       ^
TypeError: undefined is not an object (evaluating 'report.adapter.value')
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\settings-command.test.ts:81:19)
(fail) orch settings > --harness switches defaults.adapter between installed ids and rejects a non-installed id [1003.28ms]
C:\Users\Bryan\AppData\Local\Temp\orch-settings-cmd-nU1GIy\config.toml: legacy config.toml detected ΓÇö settings now live in C:\Users\Bryan\AppData\Local\Temp\orch-settings-cmd-nU1GIy\settings.json; re-run orch setup (the old values are not read)
(pass) orch settings > a load error surfaces loudly with no partial table [1347.00ms]

test\setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [48.45ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [4.08ms]
(pass) notifier setup logic > renders a command entry that loadConfig can parse [13.21ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [1.37ms]

test\setup-smoke.test.ts:
(pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [5.43ms]
(pass) runSetupSmoke (12.5) > a rejected dispatch fails loudly and sets a non-zero exit code [1.93ms]
(pass) runSetupSmoke (12.5) > a dispatch that is accepted but yields no result times out and fails non-zero [1.49ms]
(pass) runSetupSmoke (12.5) > a failed spawn fails loudly before any dispatch [1.18ms]

test\spawn-identity.test.ts:
(pass) one key per pane spawn (12.1) > the registry row key equals the ORCH_AGENT_KEY env key, and the pane handle is a separate field [212.25ms]
(pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [100.54ms]

test\spawn-limits.test.ts:
(pass) spawn limits > schema loads global and workspace caps [2.92ms]
(pass) spawn limits > rejects invalid cap %s with file and key [3.82ms]
(pass) spawn limits > rejects invalid cap %s with file and key [2.29ms]
(pass) spawn limits > rejects invalid cap %s with file and key [2.33ms]
(pass) spawn limits > omitted fleet caps normalize to defaults [2.05ms]
(pass) spawn limits > global boundary refusal data counts the whole request [11.39ms]
(pass) spawn limits > one workspace may use the full global allotment [5.32ms]
(pass) spawn limits > workspace cap is independent of global headroom [4.64ms]
(pass) spawn limits > uncapped workspace is bounded only by global count [3.77ms]
(pass) spawn limits > dead pid records free capacity [3.13ms]
(pass) spawn limits > foreign panes never count [3.44ms]
(pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [104.61ms]
(pass) spawn limits > doctor accepts satisfiable limits [105.27ms]

test\transcript.test.ts:
(pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [0.42ms]
(pass) lastAssistantFromJsonl > undefined for blank or empty input [0.06ms]
(pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.09ms]
(pass) assistantText > reads role-tagged records [0.05ms]
(pass) assistantText > reads the {type:'assistant'} envelope with a nested message [0.06ms]
(pass) assistantText > undefined for non-assistant roles [0.05ms]
(pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.08ms]
(pass) contentText empty-string part handling > an all-empty content array yields undefined [0.07ms]
(pass) contentText empty-string part handling > a bare empty string yields undefined [0.03ms]

test\wall-single-owner.test.ts:
(pass) workspace wall ownership > keeps the wall decision primitive in one source module [15.05ms]

test\work-notify.test.ts:
49 |     });
50 | 
51 |     try {
52 |       const { runWorkLoop } = await import("../src/daemon/work-loop.ts");
53 |       const { loadSinks } = await import("../src/notify/router.ts");
54 |       expect(loadSinks(orchDir)).toEqual([{ type: "command", on: ["working"], command }]);
                                      ^
error: expect(received).toEqual(expected)

  [
    {
      "command": [
        "C:\Users\Bryan\.bun\bin\bun.exe",
        "-e",
        "const fs = require("node:fs"); fs.writeFileSync("C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-work-notify-ViI1rW\\notification.json", fs.readFileSync(0, "utf8"));",
      ],
      "on": [
        "working",
      ],
+     "timeoutMs": 3000,
      "type": "command",
    },
  ]

- Expected  - 0
+ Received  + 1

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\work-notify.test.ts:54:34)
(fail) orch work notifications > delivers a presence transition through a configured command sink [5.80ms]

test\worker-prompt.test.ts:
(pass) worker prompt capability composition > work loop gives codex the base header without orch_ask [64.67ms]
(pass) worker prompt capability composition > work loop gives pi the orch_ask header clause [157.55ms]
(pass) worker prompt capability composition > orch run composition selects the same header per adapter [0.21ms]
(pass) worker prompt capability composition > locked-commands clause names the commands when the list is non-empty [0.10ms]
(pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.09ms]
(pass) worker prompt capability composition > events strip both worker header variants [0.33ms]

test\worker-tools.test.ts:
(pass) worker tool policy > default spawn omits peer tools [0.22ms]
(pass) worker tool policy > explicitly disabled peer tools are omitted [0.05ms]
(pass) worker tool policy > config enables all peer tools [0.06ms]

test\workspace-policy.test.ts:
(pass) workspace policy > reads workspaces from serialized identity keys [0.22ms]
(pass) workspace policy > resolves workspace names through records and functions [0.16ms]
(pass) workspace policy > compares serialized keys by their workspace [0.09ms]
(pass) workspace policy > enforces the workspace wall [0.42ms]
(pass) workspace policy > scopes serialized identity keys to the current workspace [0.25ms]
(pass) workspace policy > null current workspace leaves items unscoped [0.07ms]
(pass) workspace policy > 2.7 status displays the reported workspace identity field [23.74ms]
(pass) workspace policy > 6.6 structured identity drives status and policy, not serialized key text [22.98ms]

test\workspace-walls.test.ts:
(pass) workspace helpers > extracts workspace ids only from identity keys [0.16ms]
(pass) workspace helpers > derives an entity workspace from the identity key [0.12ms]
(pass) workspace helpers > returns the same entities when all workspaces are requested [54.43ms]
(pass) workspace wall writes > allows a write within the same workspace [0.15ms]
(pass) workspace wall writes > denies a cross-workspace write with both workspaces in the reason [0.29ms]
(pass) workspace wall writes > applies the same wall rule to herdr, tmux, and headless identities [0.60ms]
(pass) workspace wall writes > allows a cross-workspace write with an explicit override [0.07ms]
(pass) workspace wall writes > allows legacy unscoped targets [0.06ms]
(pass) workspace-aware queued task selection > excludes tasks pinned to another workspace [0.13ms]
(pass) workspace-aware queued task selection > skips a malformed unscoped task in every workspace [0.09ms]
(pass) workspace-aware queued task selection > selects the earliest eligible task and respects agent constraints [0.10ms]

test\worktree.test.ts:
Preparing worktree (new branch 'orch/fixes-1')
(pass) worktree primitives > creates and lists an agent worktree on an orch branch [2356.77ms]
Preparing worktree (new branch 'orch/feature')
(pass) worktree primitives > detects commits ahead of a base branch [1402.63ms]
Preparing worktree (new branch 'orch/remove-me')
(pass) worktree primitives > removes an agent worktree [2136.89ms]
fatal: not a git repository (or any of the parent directories): .git
(pass) worktree primitives > rejects a non-repository path with a clear error [52.31ms]

3 tests skipped:
(skip) claude-hooks shim tests need the dist bundle
(skip) deliverControl > executes codex steer command and accepts exit zero
(skip) deliverControl > treats a nonzero codex command exit as failure


23 tests failed:
(fail) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [70.95ms]
(fail) answer via the control dispatcher > refuses answer when the adapter declares ask false, naming target and adapter [4.40ms]
(fail) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [3.78ms]
(fail) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [103.85ms]
(fail) answer over the daemon control socket > refuses a cross-workspace answer at the daemon wall [15.76ms]
(fail) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [70.55ms]
(fail) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [3.32ms]
(fail) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-workspace [0.92ms]
(fail) loadConfig > parses every supported settings section [23.02ms]
(fail) config precedence > uses the fallback when env and settings.json omit a setting [9.23ms]
(fail) deliverControl > steers pi through its presence inbox [15.92ms]
(fail) deliverControl > warns and succeeds when claude keys fallback delivers [96.75ms]
(fail) deliverControl > fails when claude keys fallback cannot deliver [32.34ms]
(fail) deliverControl > fails unsupported steer and setModel capabilities [21.34ms]
(fail) deliverControl > requires presence for inbox delivery [395.05ms]
(fail) runDoctor > runs on an unconfigured install without failing for want of settings.json [562.97ms]
(fail) runDoctor > reports invalid config and accepts missing config [130.94ms]
(fail) notify sinks > loadSinks parses command and webhook declarations [19.16ms]
(fail) notify > parses valid sinks and applies default on states [15.86ms]
(fail) orch settings > --json reports value + source per setting, settings.json winning over defaults [1161.79ms]
(fail) orch settings > --json reports env as the winning source over settings.json [781.61ms]
(fail) orch settings > --harness switches defaults.adapter between installed ids and rejects a non-installed id [1003.28ms]
(fail) orch work notifications > delivers a presence transition through a configured command sink [5.80ms]

 499 pass
 3 skip
 23 fail
 1919 expect() calls
Ran 525 tests across 88 files. [97.29s]
