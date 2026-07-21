bun test v1.3.14 (0d9b296a)

test\adapter-allowlist.test.ts:
(pass) pi adapter tool allowlist > declares exactly the built-ins and bridge tools [0.12ms]
(pass) pi adapter tool allowlist > restricts interactive pi launches to the allowlist and the orch bridge/HUD extensions only [0.40ms]
(pass) pi adapter tool allowlist > restricts headless pif launches to the bridge/HUD extensions and preserves the prompt [1.13ms]

test\adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [13.65ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [9.60ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [7.03ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [2.28ms]

test\adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [2.70ms]
(pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.14ms]
(pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.08ms]
(pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.20ms]

test\adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.37ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.18ms]
(pass) PiAdapter > reads state from the presence status through store helpers [4.24ms]
(pass) PiAdapter > appends a steer message to the presence inbox [3.14ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [3.01ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [5.93ms]

test\answer-dispatch.test.ts:
(pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [36.03ms]
(pass) answer via the control dispatcher > refuses answer when the adapter declares ask false, naming target and adapter [26.60ms]
(pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [40.21ms]
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
(fail) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [24.97ms]
115 |     seedStatus(directory, foreign, { agent: "pi", pid: process.pid });
116 |     await startAnswerServer(directory);
117 | 
118 |     expect(
119 |       rpcCall(directory, "answer", { target: foreign, text: "yes", actor: key("wA", "boss") }),
120 |     ).rejects.toThrow(/workspace wall/);
                    ^
error: expect(received).toThrow(expected)

Expected pattern: /workspace wall/
Received message: "orchd daemon is absent (C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-answer-OsOGSJ)"

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\answer-dispatch.test.ts:120:15)
(fail) answer over the daemon control socket > refuses a cross-workspace answer at the daemon wall [11.91ms]
129 |     setOwner(directory, agentKey, key("wA", "owner"));
130 |     await startAnswerServer(directory);
131 | 
132 |     expect(
133 |       rpcCall(directory, "answer", { target: agentKey, text: "yes", actor: key("wA", "intruder") }),
134 |     ).rejects.toThrow(/owned by/);
                    ^
error: expect(received).toThrow(expected)

Expected pattern: /owned by/
Received message: "orchd daemon is absent (C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-answer-MmjnCH)"

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\answer-dispatch.test.ts:134:15)
(fail) answer over the daemon control socket > refuses a non-owner answer, naming the owning orchestrator [45.59ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > workspaceNames is empty ΓÇö headless has no name concept [0.40ms]
(pass) HeadlessBackend > spawns a detached process and records its handle [110.84ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [146.22ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [95.23ms]
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [119.66ms]
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [2.82ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [3.12ms]
(pass) HeadlessBackend > never signals an unrecorded pid [2.07ms]

test\backend-herdr.test.ts:
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [0.63ms]
(pass) HerdrBackend > maps close and list to herdr helpers [0.21ms]
(pass) HerdrBackend > workspaceNames maps tab labels by workspace, first label wins, unlabeled skipped [0.35ms]

test\backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [0.36ms]
(pass) TmuxBackend > reports tmux availability [44.87ms]
(pass) TmuxBackend > workspaceNames is empty ΓÇö tmux sessions have no names distinct from ids [0.22ms]
(pass) TmuxBackend > reflects the TMUX environment [0.23ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.16ms]
(pass) TmuxBackend > list() and inventory() surface only orch-spawned panes [2.13ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.51ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [2.48ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.66ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [57.73ms]
(pass) TmuxBackend > waitAgentStatus fails immediately when the pane has no presence key [0.89ms]
(pass) TmuxBackend > read returns captured text and throws when capture-pane fails [2.28ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [3.57ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [3.84ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [1.15ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [1.88ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.63ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [2.52ms]
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [65.99ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [64.28ms]
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [109.47ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [1.35ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [146.57ms]

test\broker-governance.test.ts:
(pass) daemon governWrite enforcement > unscoped actor bypasses ownership and the wall [78.10ms]
(pass) daemon governWrite enforcement > owner may write to its own agent [61.28ms]
(pass) daemon governWrite enforcement > a foreign owner in the same workspace is refused [58.91ms]
(pass) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [58.91ms]
(pass) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [83.60ms]
(pass) daemon governWrite enforcement > --steal transfers ownership to the actor [71.68ms]
(pass) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [60.88ms]

test\broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [80.30ms]
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [0.86ms]
(pass) broker ownership and workspace governance > work-loop selection stays within the origin workspace [64.55ms]

test\broker-routing.test.ts:
(pass) broker CLI routing > write refuses when the daemon socket is unavailable [6237.14ms]
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [830.63ms]
(pass) broker CLI routing > dispatch failure is daemon-absent, not herdr-not-found [5490.52ms]

test\check-bridge.test.ts:
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.59ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.39ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / config seams [0.28ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [4.34ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [1.20ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.13ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [6.02ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [5.94ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.76ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [2.81ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke-test exemption is documented and load-bearing [0.74ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has exactly one identity-branch line and it is exempted [102.81ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.98ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.09ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [1.56ms]

test\claude-adapter.test.ts:
(pass) Claude adapter > declares its identity and capabilities [2.13ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.86ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [1.67ms]
(pass) Claude adapter > detects state from a live presence status [9.73ms]
(pass) Claude adapter > extracts result.json before transcript and native output [16.80ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [17.01ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [622.62ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [1201.73ms]
(pass) Claude adapter > exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session) [1221.99ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed ORCH_AGENT_KEY [555.88ms]

test\claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [178.33ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [182.24ms]
(pass) claude-hooks shim > under node > writes status.json for a valid key [182.51ms]
(pass) claude-hooks shim > under deno > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [477.16ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under deno > exits 1 loudly on a present-but-malformed key [1638.54ms]
(pass) claude-hooks shim > under deno > writes status.json for a valid key [380.52ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [181.34ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [190.49ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [202.02ms]
(skip) claude-hooks shim tests need the dist bundle

test\clean-worktrees.test.ts:
Preparing worktree (new branch 'orch/empty')
Preparing worktree (new branch 'orch/merged')
Preparing worktree (new branch 'orch/unmerged')
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [8839.52ms]
Preparing worktree (new branch 'orch/discard')
fatal: 'refs/heads/orch/discard' - not a valid ref
(pass) clean worktrees > --force discards an unmerged orphan and its branch [3687.23ms]

test\cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.41ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.30ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.31ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.22ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.41ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.20ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [117.81ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [0.29ms]
(pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [401.42ms]
(pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [5.24ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [1719.57ms]
(pass) headless common path: identity key -> presence > one adapter uses opaque keys across headless and tmux backend routes [0.24ms]
(pass) headless common path: identity key -> presence > workspaceOf reads the workspace from the structured key, not a regex [0.14ms]

test\cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.23ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [71.00ms]
(pass) tmux backend registry and capabilities > exposes pane capabilities [0.20ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.16ms]
(pass) tmux backend registry and capabilities > serializes tmux identities as one flat key [0.25ms]
(pass) tmux backend registry and capabilities > rejects an empty handle without invoking tmux [0.08ms]
(pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [38.42ms]
(pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [0.36ms]
(pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [0.27ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-workspace [0.53ms]

test\close-always.test.ts:
{"closed":["pane-name","pane-key","pane-id"],"requested":3,"ok":3,"stream":false}
(pass) close always works > closes a foreign-workspace target by name, key, or pane id [59.31ms]
(pass) close always works > dead pane-less close is a successful no-op that reaps registry and presence [338.98ms]
(pass) close always works > steer remains blocked by the workspace wall [0.28ms]

test\cmd-lock-bridge.test.ts:
(pass) pi-bridge command-lock interception > wraps a matching locked command in acquireΓåÆrelease around the tool call [17.40ms]
(pass) pi-bridge command-lock interception > leaves a non-matching command untouched ΓÇö no acquire, no release [2.61ms]
(pass) pi-bridge command-lock interception > only bash tool calls are intercepted ΓÇö a non-bash tool never acquires [3.42ms]

test\cmd-lock.test.ts:
(pass) command lock > acquire and release round-trip [12.33ms]
(pass) command lock > second acquire blocks until first releases [94.30ms]
(pass) command lock > dead-pid lock is reaped [11.44ms]
(pass) command lock > release with wrong pid refuses [10.52ms]
bun test held by agent-a (pid 18760)
(pass) command lock > matches locked command prefixes and probes settings [37.17ms]
(pass) command lock > run propagates the child exit code [467.98ms]

test\codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [0.52ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [2.15ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [3.39ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [11.34ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [4.99ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [1416.24ms]

test\command-workspace-fields.test.ts:
(pass) command workspace fields > status and wall entities use persisted workspace instead of serialized-key text [28.00ms]
(pass) command workspace fields > status reports a mixed pi and Claude fleet with the same identity fields [25.73ms]

test\commands-clean.test.ts:
(pass) commands/clean > reaps dead agent dirs but preserves live pids [13.19ms]

test\commands-control.test.ts:
(pass) commands/control > parses dispatch flags without losing prompt words [2.44ms]
(pass) commands/control > parses --then destination and note [0.16ms]
(pass) commands/control > adds worker header unless raw [0.22ms]

test\commands-daemon.test.ts:
(pass) commands/daemon > parses governance and validates daemon status [0.30ms]
(pass) commands/daemon > reads only a positive integer lock pid [2.80ms]

test\commands-events.test.ts:
(pass) commands/events > parses filters and scope flags [2.97ms]
(pass) commands/events > a dropped subscription names the command that recovers it [0.06ms]
(pass) commands/events > rejects malformed event and labels sinks [0.32ms]

test\commands-index.test.ts:
(pass) commands/index > does not gate help or noninteractive commands [3.01ms]
(pass) commands/index > reads a package version string [0.79ms]

test\commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [0.68ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [0.23ms]

test\commands-panes.test.ts:
(pass) commands/panes > pane identity remains backend-neutral [2.41ms]
(pass) commands/panes > exports the pane listing command directly [0.13ms]

test\commands-queue.test.ts:
(pass) commands/queue > round-trips add/list/cancel on an isolated store [27.81ms]
No queue tasks.
(pass) commands/queue > renders empty queues without throwing [0.29ms]

test\commands-results.test.ts:
(pass) commands/results > validates and extracts question payloads [2.36ms]
(pass) commands/results > formats invalid and recent timestamps [0.23ms]
(pass) commands/results > routes a seeded result.json through the command module [112.30ms]
(pass) commands/results > orch tail resolves a non-pi target through that adapter's session view [164.08ms]
(pass) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [103.81ms]
(pass) commands/results > orch tail -n keeps last-N rendered entries for a pi session [144.24ms]
(pass) commands/results > orch session reports the pi entry count [441.30ms]
(pass) commands/results > orch session shows zero entries for an adapter view without them [454.83ms]

test\commands-review.test.ts:
(pass) commands/review > uses the short orch branch as review target [5.30ms]
(pass) commands/review > falls back to branch then pane [0.16ms]

test\commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [1.34ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [4.10ms]
(pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [1.46ms]
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > a consistent selection records silently and never prompts [4.19ms]
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > no installed entrypoint leaves the selection untouched [1.47ms]
Runtime mismatch: the installed orch entrypoint (/usr/local/bin/orch) is a node build, but you selected bun.
  A bun install requires a rebuild: bun run build:dev
  recording node to match the installed entrypoint ΓÇö re-run orch setup --runtime bun after bun run build:dev to switch
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > a mismatch records nothing without confirmation ΓÇö the consistent value wins [1.03ms]
Runtime mismatch: the installed orch entrypoint (/usr/local/bin/orch) is a node build, but you selected bun.
  A bun install requires a rebuild: bun run build:dev
  recording bun ΓÇö pending rebuild; run bun run build:dev to make it real
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > a mismatch records the selection only on explicit confirmation [1.04ms]
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > non-interactive never prompts and records the consistent value [0.86ms]
Runtime mismatch: the installed orch entrypoint (/usr/local/bin/orch) is a node build, but you selected bun.
  A bun install requires a rebuild: bun run build:dev
  recording node to match the installed entrypoint ΓÇö re-run orch setup --runtime bun after bun run build:dev to switch

test\commands-spawn.test.ts:
(pass) commands/spawn > parses spawn flags and rejects no implicit adapter assumptions [10.22ms]
(pass) commands/spawn > identifies pi launchers and preserves raw prompt [0.52ms]

test\commands-status.test.ts:
(pass) commands/status > derives view fields from seeded presence [13.96ms]
(pass) commands/status > marks dead presence as exited [0.35ms]
(pass) commands/status > shared status row carries presence-derived fields [1.21ms]
(pass) commands/status > json branch and local table branch derive identical rows apart from host [0.32ms]
(pass) commands/status > formats workspace labels and warnings [0.43ms]

test\commands-target.test.ts:
(pass) commands/target > splits known flags and preserves positional args [10.02ms]
(pass) commands/target > extracts target and joined prompt [0.92ms]
(pass) commands/target > reads only structured result text [0.64ms]
(pass) commands/target > quotes remote args and ORCH_DIR safely [1.08ms]
(pass) commands/target > lists only live serialized identity presence entries [50.75ms]

test\config-precedence.test.ts:
(pass) config precedence > returns a defaults value when no override is set [22.75ms]
(pass) config precedence > applies defaults when config, env, and flag are absent [10.28ms]
(pass) config precedence > uses env over config and flag over env [12.59ms]
(pass) config precedence > parses notify entries and hosts into expected shapes [24.97ms]
(pass) config precedence > reports a helpful validation error for invalid config [5.24ms]

test\config-watch.test.ts:
(pass) watchConfig > loads initially and applies a valid edit after the debounce [163.76ms]
(pass) watchConfig > keeps the last-good config, warns once, and recovers [491.73ms]
(pass) watchConfig > reloads on a touched reload.signal without a settings edit [81.61ms]
(pass) watchConfig > stop prevents further callbacks [415.79ms]

test\config.test.ts:
(pass) loadConfig > refuses to invent a configuration when settings.json is missing [1.90ms]
(pass) loadConfig > requires a top-level runtime and never defaults it [2.62ms]
(pass) loadConfig > rejects an unrecognized runtime naming the accepted values [2.33ms]
(pass) loadConfig > rejects a runtime misplaced under defaults [2.60ms]
(pass) loadConfig > reads the declared runtime [2.16ms]
(pass) loadConfig > parses every supported settings section [4.22ms]
(pass) loadConfig > rejects a file without the current schemaVersion [2.21ms]
(pass) loadConfig > rejects invalid JSON loudly [1.75ms]
(pass) loadConfig > names the key path for invalid fields [2.19ms]
(pass) loadConfig > rejects unknown settings keys [1.51ms]
(pass) loadConfig > parses models.allowed as a string array [2.50ms]
(pass) loadConfig > rejects old settings keys [7.32ms]
(pass) loadConfig > rejects legacy notify type and unknown ids [4.26ms]
(pass) loadConfig > applies timeout defaults and disables cross-workspace writes by default [1.98ms]
(pass) loadConfig > rejects a host without dest [4.51ms]
(pass) loadConfig > rejects an unknown id in installed.adapters [2.31ms]
(pass) loadConfig > rejects defaults.adapter not present in installed.adapters [2.10ms]
(pass) loadConfig > rejects when settings.json is absent but a legacy config.toml exists [2.20ms]
(pass) allowedModelPatterns > returns the built-in defaults when config is absent [1.32ms]
(pass) allowedModelPatterns > returns the configured patterns when set [2.08ms]
(pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or installed entry [3.64ms]
(pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [4.90ms]
(pass) writeSettingsRuntime > a different runtime replaces the single value in place [3.61ms]
(pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [3.41ms]
(pass) reapUnreadableSettings > leaves a readable file alone [1.58ms]
(pass) writeSettingsInstalled > round-trips both provider arrays [4.85ms]
(pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [6.10ms]
(pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [3.06ms]
(pass) writeSettingsDefault > is idempotent when rewriting the same value [5.61ms]
(pass) writeSettingsDefault > refuses to write through an out-of-version settings file [2.57ms]
(pass) writeSettingsDefault > switches defaults.adapter between two installed ids and loads clean [3.57ms]
(pass) config precedence > uses the fallback when env and settings.json omit a setting [2.12ms]
(pass) config precedence > uses the settings.json value over the fallback [2.18ms]
(pass) config precedence > uses the ORCH_* environment value over settings.json [2.13ms]
(pass) config precedence > uses an explicit flag override over the environment [0.21ms]
(pass) resolveSetting > uses flag, environment coercion, config, then fallback in precedence order [0.29ms]
(pass) resolveWithSource > reports the winning source at each precedence level [0.22ms]

test\control-dispatch.test.ts:
(pass) deliverControl > steers pi through its presence inbox [30.26ms]
(pass) deliverControl > warns and succeeds when claude keys fallback delivers [25.27ms]
steering headless~local~claude-fail via claude keys fallback (degraded delivery)
(pass) deliverControl > fails when claude keys fallback cannot deliver [25.55ms]
(skip) deliverControl > executes codex steer command and accepts exit zero
(skip) deliverControl > treats a nonzero codex command exit as failure
(pass) deliverControl > fails unsupported steer and setModel capabilities [26.53ms]
(pass) deliverControl > requires presence for inbox delivery [26.04ms]

test\daemon-events.test.ts:
269 |       return await connect(port, timeoutMs);
270 |     } catch {
271 |       // A stale port file is the same as an absent daemon to callers.
272 |     }
273 |   }
274 |   throw new DaemonAbsentError(orchDir);
              ^
DaemonAbsentError: orchd daemon is absent (C:\Users\Bryan\AppData\Local\Temp\orch-events-fAuM5X)
 code: "DAEMON_ABSENT"

      at connectDaemon (C:\Users\Bryan\Documents\orch\src\daemon\rpc.ts:274:9)
      at rpcSubscribe (C:\Users\Bryan\Documents\orch\src\daemon\rpc.ts:570:24)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\daemon-events.test.ts:69:24)
(fail) daemon presence events > an RPC subscriber receives a presence transition [16.10ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [0.39ms]
(pass) daemon presence events > a blocked transition drives command sink delivery [117.29ms]
269 |       return await connect(port, timeoutMs);
270 |     } catch {
271 |       // A stale port file is the same as an absent daemon to callers.
272 |     }
273 |   }
274 |   throw new DaemonAbsentError(orchDir);
              ^
DaemonAbsentError: orchd daemon is absent (C:\Users\Bryan\AppData\Local\Temp\orch-events-EzhpRy)
 code: "DAEMON_ABSENT"

      at connectDaemon (C:\Users\Bryan\Documents\orch\src\daemon\rpc.ts:274:9)
      at rpcSubscribe (C:\Users\Bryan\Documents\orch\src\daemon\rpc.ts:570:24)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\daemon-events.test.ts:125:24)
(fail) daemon presence events > a dead daemon closes the subscription instead of falling back to files [11.73ms]
269 |       return await connect(port, timeoutMs);
270 |     } catch {
271 |       // A stale port file is the same as an absent daemon to callers.
272 |     }
273 |   }
274 |   throw new DaemonAbsentError(orchDir);
              ^
DaemonAbsentError: orchd daemon is absent (C:\Users\Bryan\AppData\Local\Temp\orch-events-qqDc8p)
 code: "DAEMON_ABSENT"

      at connectDaemon (C:\Users\Bryan\Documents\orch\src\daemon\rpc.ts:274:9)
      at rpcSubscribe (C:\Users\Bryan\Documents\orch\src\daemon\rpc.ts:570:24)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\daemon-events.test.ts:141:24)
(fail) daemon presence events > a caller-initiated stop is not reported as a disconnect [20.19ms]

test\daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [5.15ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [4.62ms]
(pass) daemon lifecycle > rejects malformed locks and a socket probe that fails [5.11ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [3.30ms]
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.3.14+0d9b296af)

Usage: bun <command> [...flags] [...args]

Commands:
  run       ./my-script.ts       Execute a file with Bun
            lint                 Run a package.json script
  test                           Run unit tests with Bun
  x         next                 Execute a package binary (CLI), installing if needed (bunx)
  repl                           Start a REPL session with Bun
  exec                           Run a shell script directly with Bun

  install                        Install dependencies for a package.json (bun i)
  add       tailwindcss          Add a dependency to package.json (bun a)
  remove    moment               Remove a dependency from package.json (bun rm)
  update    elysia               Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
  outdated                       Display latest versions of outdated dependencies
  link      [<package>]          Register or link a local npm package
  unlink                         Unregister a local npm package
  publish                        Publish a package to the npm registry
  patch <pkg>                    Prepare a package for patching
  pm <subcommand>                Additional package management utilities
  info      @shumai/shumai       Display package metadata from the registry
  why       hono                 Explain why a package is installed

  build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file

  init                           Start an empty Bun project from a built-in template
  create    astro                Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [115.78ms]
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [35.25ms]
(pass) daemon lifecycle > rejects a recycled pid identity [4.88ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [3.29ms]

test\daemon-rpc.test.ts:
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.3.14+0d9b296af)

Usage: bun <command> [...flags] [...args]

Commands:
  run       ./my-script.ts       Execute a file with Bun
            lint                 Run a package.json script
  test                           Run unit tests with Bun
  x         prettier             Execute a package binary (CLI), installing if needed (bunx)
  repl                           Start a REPL session with Bun
  exec                           Run a shell script directly with Bun

  install                        Install dependencies for a package.json (bun i)
  add       zod                  Add a dependency to package.json (bun a)
  remove    redux                Remove a dependency from package.json (bun rm)
  update    tailwindcss          Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
  outdated                       Display latest versions of outdated dependencies
  link      [<package>]          Register or link a local npm package
  unlink                         Unregister a local npm package
  publish                        Publish a package to the npm registry
  patch <pkg>                    Prepare a package for patching
  pm <subcommand>                Additional package management utilities
  info      elysia               Display package metadata from the registry
  why       @shumai/shumai       Explain why a package is installed

  build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file

  init                           Start an empty Bun project from a built-in template
  create    astro                Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
47 | 
48 | describe("daemon RPC", () => {
49 |   test("round-trips a call over the real unix socket", async () => {
50 |     const dir = tempOrchDir();
51 |     await start(dir);
52 |     expect(rpcCall(dir, "echo", { ok: true })).resolves.toEqual({ ok: true });
                                                             ^
error: 

Expected promise that resolves
Received promise that rejected: Promise { <rejected> }

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\daemon-rpc.test.ts:52:57)
(fail) daemon RPC > round-trips a call over the real unix socket [73.96ms]
53 |   });
54 | 
55 |   test("returns an error for an unknown method", async () => {
56 |     const dir = tempOrchDir();
57 |     await start(dir);
58 |     expect(rpcCall(dir, "missing")).rejects.toBeInstanceOf(RpcError);
                                                 ^
error: expect(received).toBeInstanceOf(expected)

Expected constructor: [class RpcError extends Error]
Received value: 269 |       return await connect(port, timeoutMs);
270 |     } catch {
271 |       // A stale port file is the same as an absent daemon to callers.
272 |     }
273 |   }
274 |   throw new DaemonAbsentError(orchDir);
              ^
DaemonAbsentError: orchd daemon is absent (C:\Users\Bryan\AppData\Local\Temp\orch-rpc-QVacOl)
 code: "DAEMON_ABSENT"

      at connectDaemon (C:\Users\Bryan\Documents\orch\src\daemon\rpc.ts:274:9)
      at rpcCall (C:\Users\Bryan\Documents\orch\src\daemon\rpc.ts:439:24)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\daemon-rpc.test.ts:58:12)


      at <anonymous> (C:\Users\Bryan\Documents\orch\test\daemon-rpc.test.ts:58:45)
(fail) daemon RPC > returns an error for an unknown method [86.99ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [256.54ms]
269 |       return await connect(port, timeoutMs);
270 |     } catch {
271 |       // A stale port file is the same as an absent daemon to callers.
272 |     }
273 |   }
274 |   throw new DaemonAbsentError(orchDir);
              ^
DaemonAbsentError: orchd daemon is absent (C:\Users\Bryan\AppData\Local\Temp\orch-rpc-Sj5b43)
 code: "DAEMON_ABSENT"

      at connectDaemon (C:\Users\Bryan\Documents\orch\src\daemon\rpc.ts:274:9)
      at rpcSubscribe (C:\Users\Bryan\Documents\orch\src\daemon\rpc.ts:570:24)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\daemon-rpc.test.ts:87:12)
      at new Promise (1:11)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\daemon-rpc.test.ts:86:19)
(fail) daemon RPC > delivers pushed subscription events [57.81ms]
94 |     const dir = tempOrchDir();
95 |     writeFileSync(join(dir, "orchd.sock"), "stale endpoint");
96 |     expect(acquireDaemonLock(dir)).toBe(true);
97 |     const server = await start(dir);
98 |     expect(server.transport).toBe("unix");
99 |     expect(rpcCall(dir, "echo", "after-reclaim")).resolves.toBe("after-reclaim");
                                                                ^
error: 

Expected promise that resolves
Received promise that rejected: Promise { <rejected> }

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\daemon-rpc.test.ts:99:60)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\daemon-rpc.test.ts:89:28)
(fail) daemon RPC > removes a stale unix socket when the daemon owns the lock [93.27ms]
(pass) daemon RPC > has a catchable absent-daemon error [7.88ms]
