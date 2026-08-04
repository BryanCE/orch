bun test v1.3.14 (0d9b296a)

test\adapter-allowlist.test.ts:
(pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [1.30ms]
(pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.40ms]
(pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.13ms]
(pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.08ms]
(pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.42ms]
(pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.27ms]

test\adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [5.25ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [21.68ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [6.55ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [6.41ms]

test\adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [7.28ms]
(pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.18ms]
(pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.10ms]
(pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.14ms]

test\adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [1.74ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.71ms]
(pass) PiAdapter > reads state from the presence status through store helpers [20.31ms]
(pass) PiAdapter > appends a steer message to the presence inbox [15.53ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [16.32ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [97.36ms]

test\answer-dispatch.test.ts:
(pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [59.58ms]
(pass) answer via the control dispatcher > refuses answer when the adapter declares ask false, naming target and adapter [15.66ms]
(pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [105.21ms]
100 |     process.env.ORCH_DIR = directory;
101 |     const agentKey = key("local", "socket-answer");
102 |     seedStatus(directory, agentKey, { agent: "pi", pid: process.pid });
103 |     await startAnswerServer(directory);
104 | 
105 |     await expect(rpcCall(directory, "answer", { target: agentKey, text: "delivered" })).resolves.toEqual({ ok: true });
                                                                                                       ^
error: 

Expected promise that resolves
Received promise that rejected: Promise { <rejected> }

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\answer-dispatch.test.ts:105:98)
(fail) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [198.54ms]
115 |     seedStatus(directory, foreign, { agent: "pi", pid: process.pid });
116 |     await startAnswerServer(directory);
117 | 
118 |     await expect(
119 |       rpcCall(directory, "answer", { target: foreign, text: "yes", actor: key("wA", "boss") }),
120 |     ).rejects.toThrow(/workspace wall/);
                    ^
error: expect(received).toThrow(expected)

Expected pattern: /workspace wall/
Received message: "orchd daemon is absent (C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-answer-U4LTj3)"

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\answer-dispatch.test.ts:120:15)
(fail) answer over the daemon control socket > refuses a cross-workspace answer at the daemon wall [127.58ms]
129 |     setOwner(directory, agentKey, key("wA", "owner"));
130 |     await startAnswerServer(directory);
131 | 
132 |     await expect(
133 |       rpcCall(directory, "answer", { target: agentKey, text: "yes", actor: key("wA", "intruder") }),
134 |     ).rejects.toThrow(/owned by/);
                    ^
error: expect(received).toThrow(expected)

Expected pattern: /owned by/
Received message: "orchd daemon is absent (C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-answer-zv0ToG)"

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\answer-dispatch.test.ts:134:15)
(fail) answer over the daemon control socket > refuses a non-owner answer, naming the owning orchestrator [98.83ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > workspaceNames is empty ΓÇö headless has no name concept [1.20ms]
(pass) HeadlessBackend > spawns a detached process and records its handle [1071.87ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [189.72ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [2631.43ms]
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [916.91ms]
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [60.74ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [50.85ms]
(pass) HeadlessBackend > never signals an unrecorded pid [99.33ms]

test\backend-herdr.test.ts:
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [285.63ms]
(pass) HerdrBackend > maps close and list to herdr helpers [0.57ms]
(pass) HerdrBackend > a planned target pane is honoured by re-seating the fresh pane against it [0.58ms]
(pass) HerdrBackend > groupLayout reads tab geometry straight off the pane listing [0.80ms]
(pass) HerdrBackend > workspaceNames maps tab labels by workspace, first label wins, unlabeled skipped [1.69ms]

test\backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [7.38ms]
(pass) TmuxBackend > reports tmux availability [355.33ms]
(pass) TmuxBackend > workspaceNames is empty ΓÇö tmux sessions have no names distinct from ids [0.86ms]
(pass) TmuxBackend > reflects the TMUX environment [1.17ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [1.38ms]
(pass) TmuxBackend > list() and inventory() surface only orch-spawned panes [13.07ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [1.15ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [10.92ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [2.69ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [104.02ms]
(pass) TmuxBackend > waitAgentStatus fails immediately when the pane has no presence key [0.50ms]
(pass) TmuxBackend > read returns captured text and throws when capture-pane fails [0.66ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [1.24ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [3.83ms]
(pass) TmuxBackend > spawn splits the planned target pane, not whatever pane the window has active [2.80ms]
(pass) TmuxBackend > groupLayout reports every pane in a window with its cell geometry [2.58ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [1.26ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [3.89ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [1.30ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [1.34ms]
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [73.97ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [34.79ms]
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [135.39ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [0.60ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [3625.39ms]

test\broker-governance.test.ts:
(pass) daemon governWrite enforcement > unscoped actor bypasses ownership and the wall [240.63ms]
(pass) daemon governWrite enforcement > owner may write to its own agent [131.26ms]
(pass) daemon governWrite enforcement > a foreign owner in the same workspace is refused [67.52ms]
(pass) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [59.89ms]
(pass) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [62.30ms]
(pass) daemon governWrite enforcement > --steal transfers ownership to the actor [88.74ms]
(pass) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [64.21ms]

test\broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [116.23ms]
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [1.11ms]
(pass) broker ownership and workspace governance > work-loop selection stays within the origin workspace [126.61ms]

test\broker-routing.test.ts:
(pass) broker CLI routing > write refuses when the daemon socket is unavailable [12388.83ms]
71 |     seedAgent(orchDir);
72 | 
73 |     const result = runCli(orchDir, ["status", "--offline", "--json", "--all"]);
74 | 
75 |     expect(result.status).toBe(0);
76 |     expect(result.stdout).toContain("agent-alpha");
                               ^
error: expect(received).toContain(expected)

Expected to contain: "agent-alpha"
Received: "[]\n"

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\broker-routing.test.ts:76:27)
(fail) broker CLI routing > status --offline reads seeded presence files without a daemon [5685.58ms]
(pass) broker CLI routing > dispatch failure is daemon-absent, not herdr-not-found [10656.39ms]

test\check-bridge.test.ts:
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [4.49ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.86ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / config seams [1.36ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [81.96ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.28ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.06ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [58.02ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [0.89ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.25ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.32ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke-test exemption is documented and load-bearing [0.12ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has exactly one identity-branch line and it is exempted [339.83ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [1.70ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.26ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [6.48ms]

test\claude-adapter.test.ts:
(pass) Claude adapter > declares its identity and capabilities [0.45ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.23ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.26ms]
(pass) Claude adapter > detects state from a live presence status [2.99ms]
(pass) Claude adapter > extracts result.json before transcript and native output [13.27ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [4.92ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [1756.71ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [5103.61ms]
(pass) Claude adapter > exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session) [949.29ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed ORCH_AGENT_KEY [944.99ms]

test\claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [311.65ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [315.02ms]
(pass) claude-hooks shim > under node > writes status.json for a valid key [297.57ms]
(pass) claude-hooks shim > under deno > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [2734.66ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under deno > exits 1 loudly on a present-but-malformed key [1535.87ms]
(pass) claude-hooks shim > under deno > writes status.json for a valid key [1320.38ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [2514.87ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [571.27ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [1434.49ms]
(skip) claude-hooks shim tests need the dist bundle

test\clean-worktrees.test.ts:
Preparing worktree (new branch 'orch/empty')
Preparing worktree (new branch 'orch/merged')
Preparing worktree (new branch 'orch/unmerged')
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [19956.16ms]
Preparing worktree (new branch 'orch/discard')
fatal: 'refs/heads/orch/discard' - not a valid ref
(pass) clean worktrees > --force discards an unmerged orphan and its branch [10633.01ms]

test\cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.97ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [52.75ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.37ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.19ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [1.03ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [1.10ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [440.54ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [0.33ms]
(pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [234.94ms]
(pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [1.77ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [994.12ms]
(pass) headless common path: identity key -> presence > one adapter uses opaque keys across headless and tmux backend routes [0.90ms]
(pass) headless common path: identity key -> presence > workspaceOf reads the workspace from the structured key, not a regex [0.17ms]

test\cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [15.40ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [251.38ms]
(pass) tmux backend registry and capabilities > exposes pane capabilities [0.62ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.65ms]
(pass) tmux backend registry and capabilities > serializes tmux identities as one flat key [0.80ms]
(pass) tmux backend registry and capabilities > rejects an empty handle without invoking tmux [0.30ms]
(pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [167.34ms]
(pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [2.90ms]
(pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [3.80ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-workspace [2.33ms]

test\close-always.test.ts:
{"closed":["pane-name","pane-key","pane-id"],"requested":3,"ok":3,"stream":false}
(pass) close always works > closes a foreign-workspace target by name, key, or pane id [168.42ms]
(pass) close always works > dead pane-less close is a successful no-op that reaps registry and presence [1947.96ms]
(pass) close always works > steer remains blocked by the workspace wall [0.38ms]

test\cmd-lock-bridge.test.ts:
(pass) pi-bridge command-lock interception > wraps a matching locked command in acquireΓåÆrelease around the tool call [15.94ms]
(pass) pi-bridge command-lock interception > leaves a non-matching command untouched ΓÇö no acquire, no release [2.43ms]
(pass) pi-bridge command-lock interception > only bash tool calls are intercepted ΓÇö a non-bash tool never acquires [2.16ms]

test\cmd-lock.test.ts:
(pass) command lock > acquire and release round-trip [8.70ms]
(pass) command lock > second acquire blocks until first releases [69.52ms]
(pass) command lock > dead-pid lock is reaped [2.82ms]
(pass) command lock > release with wrong pid refuses [1.93ms]
bun test held by agent-a (pid 9568)
(pass) command lock > matches locked command prefixes and probes settings [4.30ms]
(pass) command lock > run propagates the child exit code [159.44ms]

test\codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [3.66ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [0.51ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [0.83ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [0.97ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [0.90ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [2913.42ms]

test\command-workspace-fields.test.ts:
(pass) command workspace fields > status and wall entities use persisted workspace instead of serialized-key text [82.52ms]
(pass) command workspace fields > status reports a mixed pi and Claude fleet with the same identity fields [67.95ms]

test\commands-clean.test.ts:
(pass) commands/clean > reaps dead agent dirs but preserves live pids [34.36ms]

test\commands-control.test.ts:
(pass) commands/control > parses dispatch flags without losing prompt words [14.96ms]
(pass) commands/control > parses --then destination and note [0.39ms]
(pass) commands/control > adds worker header unless raw [0.89ms]

test\commands-daemon.test.ts:
(pass) commands/daemon > parses governance and validates daemon status [2.24ms]
(pass) commands/daemon > reads a lock pid only from a complete lock record [3.28ms]

test\commands-events.test.ts:
(pass) commands/events > parses filters and scope flags [8.00ms]
(pass) commands/events > a subscription with no daemon keeps redialing instead of exiting [0.71ms]
(pass) commands/events > rejects malformed event and labels sinks [0.62ms]

test\commands-index.test.ts:
(pass) commands/index > does not gate help or noninteractive commands [2.56ms]
(pass) commands/index > reads a package version string [0.64ms]

test\commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [0.69ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [0.22ms]

test\commands-panes.test.ts:
(pass) commands/panes > pane identity remains backend-neutral [2.62ms]
(pass) commands/panes > exports the pane listing command directly [0.12ms]

test\commands-queue.test.ts:
(pass) commands/queue > round-trips add/list/cancel on an isolated store [33.26ms]
No queue tasks.
(pass) commands/queue > renders empty queues without throwing [0.30ms]

test\commands-results.test.ts:
(pass) commands/results > validates and extracts question payloads [0.23ms]
(pass) commands/results > formats invalid and recent timestamps [0.23ms]
(pass) commands/results > routes a seeded result.json through the command module [113.40ms]
(pass) commands/results > orch tail resolves a non-pi target through that adapter's session view [108.12ms]
 97 | 
 98 |   test("orch tail renders pi's per-turn entries with role rows and a tool-call summary", () => {
 99 |     const { key, restore } = seedPiSession();
100 |     let joined = "";
101 |     try { joined = captureStdout(() => cmdTail([key])); } finally { restore(); }
102 |     expect(joined).toContain("user      Γöé first task");
                         ^
error: expect(received).toContain(expected)

Expected to contain: "user      Γöé first task"
Received: "session: C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-command-pitail-23QErI\\agents\\headless~wP~7000\\session.jsonl\nmodel: -   cost: $0.0000   turns: 3\n\n10:00:00 user      | first task\n10:00:01 assistant | working on it\n10:00:02 assistant | [tools] bash(ls -la)\n10:00:03 tool      | bash -> file listing\n10:00:04 assistant | final answer\n"

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\commands-results.test.ts:102:20)
(fail) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [127.58ms]
(pass) commands/results > orch tail -n keeps last-N rendered entries for a pi session [115.98ms]
(pass) commands/results > orch session reports the pi entry count [106.85ms]
(pass) commands/results > orch session shows zero entries for an adapter view without them [116.09ms]

test\commands-review.test.ts:
(pass) commands/review > uses the short orch branch as review target [3.07ms]
(pass) commands/review > falls back to branch then pane [0.09ms]

test\commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.31ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [0.69ms]
(pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.38ms]

test\commands-spawn.test.ts:
(pass) commands/spawn > parses spawn flags and rejects no implicit adapter assumptions [6.18ms]
(pass) commands/spawn > identifies pi launchers and preserves raw prompt [0.15ms]

test\commands-status.test.ts:
(pass) commands/status > derives view fields from seeded presence [6.27ms]
(pass) commands/status > marks dead presence as exited [0.32ms]
(pass) commands/status > shared status row carries presence-derived fields [0.60ms]
(pass) commands/status > json branch and local table branch derive identical rows apart from host [1.31ms]
(pass) commands/status > formats workspace labels and warnings [0.25ms]

test\commands-target.test.ts:
(pass) commands/target > splits known flags and preserves positional args [0.14ms]
(pass) commands/target > extracts target and joined prompt [0.20ms]
(pass) commands/target > reads only structured result text [0.08ms]
(pass) commands/target > quotes remote args and ORCH_DIR safely [0.17ms]
(pass) commands/target > lists only live serialized identity presence entries [7.62ms]

test\config-precedence.test.ts:
(pass) config precedence > returns a defaults value when no override is set [6.32ms]
(pass) config precedence > applies defaults when config, env, and flag are absent [2.22ms]
(pass) config precedence > uses env over config and flag over env [2.47ms]
(pass) config precedence > parses notify entries and hosts into expected shapes [5.69ms]
(pass) config precedence > reports a helpful validation error for invalid config [2.67ms]

test\config-watch.test.ts:
(pass) watchConfig > loads initially and applies a valid edit after the debounce [52.84ms]
(pass) watchConfig > keeps the last-good config, warns once, and recovers [500.69ms]
(pass) watchConfig > reloads on a touched reload.signal without a settings edit [107.16ms]
(pass) watchConfig > stop prevents further callbacks [480.85ms]

test\config.test.ts:
(pass) loadConfig > refuses to invent a configuration when settings.json is missing [12.47ms]
(pass) loadConfig > requires a top-level runtime and never defaults it [12.16ms]
(pass) loadConfig > rejects an unrecognized runtime naming the accepted values [13.97ms]
(pass) loadConfig > rejects a runtime misplaced under defaults [11.21ms]
(pass) loadConfig > reads the declared runtime [11.26ms]
(pass) loadConfig > parses every supported settings section [6.81ms]
(pass) loadConfig > rejects a file without the current schemaVersion [8.08ms]
(pass) loadConfig > rejects invalid JSON loudly [8.26ms]
(pass) loadConfig > names the key path for invalid fields [14.18ms]
(pass) loadConfig > rejects unknown settings keys [14.85ms]
(pass) loadConfig > parses models.allowed as a string array [8.10ms]
(pass) loadConfig > rejects old settings keys [24.35ms]
(pass) loadConfig > rejects legacy notify type and unknown ids [36.08ms]
(pass) loadConfig > applies timeout defaults and disables cross-workspace writes by default [3.51ms]
(pass) loadConfig > rejects a host without dest [15.28ms]
(pass) loadConfig > rejects an unknown id in installed.adapters [14.51ms]
(pass) loadConfig > rejects defaults.adapter not present in installed.adapters [9.29ms]
(pass) loadConfig > rejects when settings.json is absent but a legacy config.toml exists [11.75ms]
(pass) allowedModelPatterns > restricts nothing when no config names patterns [2.12ms]
(pass) allowedModelPatterns > returns the configured patterns when set [2.47ms]
(pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or installed entry [4.85ms]
(pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [23.33ms]
(pass) writeSettingsRuntime > a different runtime replaces the single value in place [20.88ms]
(pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [10.89ms]
(pass) reapUnreadableSettings > leaves a readable file alone [1.96ms]
(pass) writeSettingsInstalled > round-trips both provider arrays [15.63ms]
(pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [36.30ms]
(pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [4.73ms]
(pass) writeSettingsDefault > is idempotent when rewriting the same value [6.14ms]
(pass) writeSettingsDefault > refuses to write through an out-of-version settings file [11.26ms]
(pass) writeSettingsDefault > switches defaults.adapter between two installed ids and loads clean [25.31ms]
(pass) config precedence > uses the fallback when env and settings.json omit a setting [15.79ms]
(pass) config precedence > uses the settings.json value over the fallback [2.18ms]
(pass) config precedence > uses the ORCH_* environment value over settings.json [2.14ms]
(pass) config precedence > uses an explicit flag override over the environment [0.20ms]
(pass) resolveSetting > uses flag, environment coercion, config, then fallback in precedence order [0.26ms]
(pass) resolveWithSource > reports the winning source at each precedence level [0.36ms]

test\control-dispatch.test.ts:
(pass) deliverControl > steers pi through its presence inbox [79.00ms]
(pass) deliverControl > warns and succeeds when claude keys fallback delivers [200.82ms]
steer headless~local~claude-fail via claude keys fallback (degraded delivery)
(pass) deliverControl > fails when claude keys fallback cannot deliver [80.98ms]
(skip) deliverControl > executes codex steer command and accepts exit zero
(skip) deliverControl > treats a nonzero codex command exit as failure
(pass) deliverControl > fails unsupported steer and setModel capabilities [11.99ms]
(pass) deliverControl > requires presence for inbox delivery [79.39ms]

test\daemon-events.test.ts:
291 | 
292 | async function connectDaemon(orchDir: string, timeoutMs: number): Promise<Socket> {
293 |   const paths = endpointPaths(orchDir);
294 |   const connection = (await dialEndpoint(paths.socket, timeoutMs))
295 |     ?? (await dialEndpoint(readPortFile(orchDir), timeoutMs));
296 |   if (!connection) throw new DaemonAbsentError(orchDir);
                               ^
DaemonAbsentError: orchd daemon is absent (C:\Users\Bryan\AppData\Local\Temp\orch-events-Wspsao)
 code: "DAEMON_ABSENT"

      at connectDaemon (C:\Users\Bryan\Documents\orch\src\daemon\rpc.ts:296:26)
      at async rpcSubscribe (C:\Users\Bryan\Documents\orch\src\daemon\rpc.ts:595:24)
      at async <anonymous> (C:\Users\Bryan\Documents\orch\test\daemon-events.test.ts:69:24)
(fail) daemon presence events > an RPC subscriber receives a presence transition [60.50ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [0.56ms]
(pass) daemon presence events > a blocked transition drives command sink delivery [1234.28ms]
291 | 
292 | async function connectDaemon(orchDir: string, timeoutMs: number): Promise<Socket> {
293 |   const paths = endpointPaths(orchDir);
294 |   const connection = (await dialEndpoint(paths.socket, timeoutMs))
295 |     ?? (await dialEndpoint(readPortFile(orchDir), timeoutMs));
296 |   if (!connection) throw new DaemonAbsentError(orchDir);
                               ^
DaemonAbsentError: orchd daemon is absent (C:\Users\Bryan\AppData\Local\Temp\orch-events-SLdiBo)
 code: "DAEMON_ABSENT"

      at connectDaemon (C:\Users\Bryan\Documents\orch\src\daemon\rpc.ts:296:26)
      at async rpcSubscribe (C:\Users\Bryan\Documents\orch\src\daemon\rpc.ts:595:24)
      at async <anonymous> (C:\Users\Bryan\Documents\orch\test\daemon-events.test.ts:125:24)
(fail) daemon presence events > a dead daemon closes the subscription instead of falling back to files [48.69ms]
291 | 
292 | async function connectDaemon(orchDir: string, timeoutMs: number): Promise<Socket> {
293 |   const paths = endpointPaths(orchDir);
294 |   const connection = (await dialEndpoint(paths.socket, timeoutMs))
295 |     ?? (await dialEndpoint(readPortFile(orchDir), timeoutMs));
296 |   if (!connection) throw new DaemonAbsentError(orchDir);
                               ^
DaemonAbsentError: orchd daemon is absent (C:\Users\Bryan\AppData\Local\Temp\orch-events-pnZSRb)
 code: "DAEMON_ABSENT"

      at connectDaemon (C:\Users\Bryan\Documents\orch\src\daemon\rpc.ts:296:26)
      at async rpcSubscribe (C:\Users\Bryan\Documents\orch\src\daemon\rpc.ts:595:24)
      at async <anonymous> (C:\Users\Bryan\Documents\orch\test\daemon-events.test.ts:141:24)
(fail) daemon presence events > a caller-initiated stop is not reported as a disconnect [120.25ms]

test\daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [4191.63ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [3297.57ms]
(pass) daemon lifecycle > rejects malformed locks and a socket probe that fails [4844.52ms]
83 |     writeFileSync(join(orchDir, "orchd.lock"), JSON.stringify({ pid: 0, codeHash: "old", startedAt: "now" }));
84 |     expect(acquireDaemonLock(orchDir, (socket) => {
85 |       rmSync(join(orchDir, "orchd.lock"));
86 |       expect(socket).toBe(join(orchDir, "orchd.sock"));
87 |       return false;
88 |     })).toBe(true);
             ^
error: expect(received).toBe(expected)

Expected: true
Received: false

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\daemon-lifecycle.test.ts:88:9)
(fail) daemon lifecycle > retries if a stale lock disappears during reclaim [1035.72ms]
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
  remove    babel-core           Remove a dependency from package.json (bun rm)
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
  create    svelte               Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [91.01ms]
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [2576.80ms]
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
  add       lyra                 Add a dependency to package.json (bun a)
  remove    moment               Remove a dependency from package.json (bun rm)
  update    @remix-run/dev       Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
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
  create    next-app             Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(fail) daemon lifecycle > rejects a recycled pid identity [6768.58ms]
  ^ this test timed out after 5000ms.
killed 4 dangling processes
145 |   test("only a provable lock owner may be signalled", () => {
146 |     const orchDir = makeOrchDir();
147 |     expect(acquireDaemonLock(orchDir)).toBe(true);
148 | 
149 |     // This process really did take the lock, so it is signallable.
150 |     expect(provenDaemonPid(orchDir)).toBe(process.pid);
                                           ^
error: expect(received).toBe(expected)

Expected: 9568
Received: undefined

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\daemon-lifecycle.test.ts:150:38)
(fail) daemon lifecycle > only a provable lock owner may be signalled [5065.10ms]
  ^ this test timed out after 5000ms.
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [8.50ms]

test\daemon-rpc.test.ts:
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
(fail) daemon RPC > round-trips a call over the real unix socket [133.40ms]
53 |   });
54 | 
55 |   test("returns an error for an unknown method", async () => {
56 |     const dir = tempOrchDir();
57 |     await start(dir);
58 |     expect(rpcCall(dir, "missing")).rejects.toBeInstanceOf(RpcError);
                                                 ^
error: expect(received).toBeInstanceOf(expected)

Expected constructor: [class RpcError extends Error]
Received value: 291 | 
292 | async function connectDaemon(orchDir: string, timeoutMs: number): Promise<Socket> {
293 |   const paths = endpointPaths(orchDir);
294 |   const connection = (await dialEndpoint(paths.socket, timeoutMs))
295 |     ?? (await dialEndpoint(readPortFile(orchDir), timeoutMs));
296 |   if (!connection) throw new DaemonAbsentError(orchDir);
                               ^
DaemonAbsentError: orchd daemon is absent (C:\Users\Bryan\AppData\Local\Temp\orch-rpc-z01TjK)
 code: "DAEMON_ABSENT"

      at connectDaemon (C:\Users\Bryan\Documents\orch\src\daemon\rpc.ts:296:26)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\daemon-rpc.test.ts:58:45)


      at <anonymous> (C:\Users\Bryan\Documents\orch\test\daemon-rpc.test.ts:58:45)
(fail) daemon RPC > returns an error for an unknown method [236.92ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [1089.79ms]
291 | 
292 | async function connectDaemon(orchDir: string, timeoutMs: number): Promise<Socket> {
293 |   const paths = endpointPaths(orchDir);
294 |   const connection = (await dialEndpoint(paths.socket, timeoutMs))
295 |     ?? (await dialEndpoint(readPortFile(orchDir), timeoutMs));
296 |   if (!connection) throw new DaemonAbsentError(orchDir);
                               ^
DaemonAbsentError: orchd daemon is absent (C:\Users\Bryan\AppData\Local\Temp\orch-rpc-VPowXw)
 code: "DAEMON_ABSENT"

      at connectDaemon (C:\Users\Bryan\Documents\orch\src\daemon\rpc.ts:296:26)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\daemon-rpc.test.ts:89:28)
(fail) daemon RPC > delivers pushed subscription events [52.67ms]
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
(fail) daemon RPC > removes a stale unix socket when the daemon owns the lock [3426.10ms]
(pass) daemon RPC > has a catchable absent-daemon error [10.88ms]
