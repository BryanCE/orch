bun test v1.4.0 (34cbb9a40)

test\adapter-allowlist.test.ts:
(pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [0.38ms]
(pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.07ms]
(pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.01ms]
(pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.01ms]
(pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.10ms]
(pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.03ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.06ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.01ms]
(pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.04ms]

test\adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [3.42ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [6.21ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [4.17ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [1.12ms]

test\adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [0.04ms]
(pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.03ms]
(pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.02ms]
(pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.03ms]
(pass) preferred models fill the harness's native picker quicklist > pi interactive builders pass the quicklist as one quoted --models argument [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > pi headless builders pass the quicklist as one verbatim argv entry [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > pi omits --models cleanly for an absent or empty quicklist [0.03ms]
(pass) preferred models fill the harness's native picker quicklist > pi keeps quicklist order and provider punctuation intact [0.02ms]
(pass) preferred models fill the harness's native picker quicklist > omp interactive builders pass the quicklist as one quoted --models argument [0.02ms]
(pass) preferred models fill the harness's native picker quicklist > omp headless builders pass the quicklist as one verbatim argv entry [0.01ms]
(pass) preferred models fill the harness's native picker quicklist > omp omits --models cleanly for an absent or empty quicklist [0.02ms]
(pass) preferred models fill the harness's native picker quicklist > omp keeps quicklist order and provider punctuation intact
(pass) preferred models fill the harness's native picker quicklist > a model outside the quicklist is still what the launch runs on [0.02ms]

test\adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.17ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.06ms]
(pass) PiAdapter > reads state from the presence status through store helpers [16.21ms]
(pass) PiAdapter > appends a steer message to the presence inbox [17.46ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [31.41ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [15.19ms]
(pass) PiAdapter > parses pi's supported model table without importing harness internals [0.55ms]

test\answer-dispatch.test.ts:
(pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [30.65ms]
(pass) answer via the control dispatcher > refuses answer when the adapter declares ask false, naming target and adapter [13.30ms]
(pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [60.38ms]
(pass) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [76.38ms]
(pass) answer over the daemon control socket > refuses a cross-workspace answer at the daemon wall [10.69ms]
(pass) answer over the daemon control socket > refuses a non-owner answer, naming the owning orchestrator [58.82ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > workspaceNames is empty ΓÇö headless has no name concept [0.28ms]
(pass) HeadlessBackend > refuses to spawn with no prompt ΓÇö a headless agent runs its prompt and exits [0.58ms]
(pass) HeadlessBackend > spawns a detached process and records its handle [39.54ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [72.94ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [45.79ms]
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [47.61ms]
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [14.93ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [13.04ms]
(pass) HeadlessBackend > never signals an unrecorded pid [1.96ms]

test\backend-herdr.test.ts:
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [0.58ms]
(pass) HerdrBackend > maps close and list to herdr helpers [0.18ms]
(pass) HerdrBackend > a planned target pane is honoured by re-seating the fresh pane against it [0.26ms]
(pass) HerdrBackend > a same-tab re-seat bounces through a throwaway tab so herdr executes it [0.13ms]
(pass) HerdrBackend > a refused move surfaces herdr's reason instead of claiming success [0.09ms]
(pass) HerdrBackend > groupLayout reads tab geometry straight off the pane listing [0.21ms]
(pass) HerdrBackend > workspaceNames maps tab labels by workspace, first label wins, unlabeled skipped [0.15ms]

test\backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [0.15ms]
(pass) TmuxBackend > reports tmux availability [5.24ms]
(pass) TmuxBackend > workspaceNames is empty ΓÇö tmux sessions have no names distinct from ids [0.14ms]
(pass) TmuxBackend > reflects the TMUX environment [0.18ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.07ms]
(pass) TmuxBackend > list() and inventory() surface only orch-spawned panes [0.76ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.18ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [3.03ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.38ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [53.45ms]
(pass) TmuxBackend > waitAgentStatus fails immediately when the pane has no presence key [0.27ms]
(pass) TmuxBackend > read returns captured text and throws when capture-pane fails [0.58ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [0.30ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.38ms]
(pass) TmuxBackend > spawn splits the planned target pane, not whatever pane the window has active [0.07ms]
(pass) TmuxBackend > groupLayout reports every pane in a window with its cell geometry [0.23ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.10ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [0.35ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.12ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.24ms]
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [49.40ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [63.41ms]
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [62.87ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [0.37ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [11.83ms]

test\broker-governance.test.ts:
(pass) daemon governWrite enforcement > an unscoped actor is refused on an owned target [49.94ms]
(pass) daemon governWrite enforcement > an unscoped actor may write to an unowned target [42.76ms]
(pass) daemon governWrite enforcement > owner may write to its own agent [47.11ms]
(pass) daemon governWrite enforcement > a foreign owner in the same workspace is refused [48.78ms]
(pass) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [46.30ms]
(pass) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [47.75ms]
(pass) daemon governWrite enforcement > --steal transfers ownership to the actor [45.79ms]
(pass) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [45.37ms]
(pass) daemon governWrite enforcement > the workspace operator writes to any same-workspace owned agent [48.48ms]
(pass) daemon governWrite enforcement > a foreign workspace's operator still hits the wall [44.28ms]

test\broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [52.43ms]
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [0.21ms]
(pass) broker ownership and workspace governance > work-loop selection stays within the origin workspace [47.60ms]

test\broker-routing.test.ts:
(pass) broker CLI routing > an unprovable foreign lock is never signalled; dispatch starts a fresh daemon and fails on delivery [268.06ms]
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [139.94ms]
(pass) broker CLI routing > dispatch failure is a delivery verdict, never herdr-not-found [267.83ms]

test\check-bridge.test.ts:
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.06ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.03ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / config seams [0.04ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [0.27ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.07ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.03ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the shared harness model port outside the adapter dispatcher [0.01ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [0.30ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [0.44ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.06ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.10ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke-test exemption is documented and load-bearing [0.04ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has exactly one identity-branch line and it is exempted [4.65ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.06ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.01ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [0.29ms]

test\claude-adapter.test.ts:
(pass) Claude adapter > declares its identity and capabilities [0.16ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.05ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.06ms]
(pass) Claude adapter > detects state from a live presence status [9.75ms]
(pass) Claude adapter > extracts result.json before transcript and native output [3.08ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [2.21ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [47.87ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [192.56ms]
(pass) Claude adapter > exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session) [35.29ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed ORCH_AGENT_KEY [39.78ms]

test\claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [77.15ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [67.42ms]
(pass) claude-hooks shim > under node > writes status.json for a valid key [84.99ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [45.92ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [51.42ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [58.23ms]
(skip) claude-hooks shim tests need the dist bundle

test\clean-worktrees.test.ts:
Preparing worktree (new branch 'orch/empty')
Preparing worktree (new branch 'orch/merged')
Preparing worktree (new branch 'orch/unmerged')
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [2288.20ms]
Preparing worktree (new branch 'orch/discard')
(pass) clean worktrees > --force discards an unmerged orphan and its branch [944.15ms]

test\cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [1.07ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.09ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.15ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.06ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.19ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.09ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [7.88ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [0.10ms]
(pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [28.40ms]
(pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [0.49ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [69.10ms]
(pass) headless common path: identity key -> presence > one adapter uses opaque keys across headless and tmux backend routes [0.21ms]
(pass) headless common path: identity key -> presence > workspaceOf reads the workspace from the structured key, not a regex [0.08ms]

test\cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.09ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [7.87ms]
(pass) tmux backend registry and capabilities > exposes pane capabilities [0.11ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.10ms]
(pass) tmux backend registry and capabilities > serializes tmux identities as one flat key [0.14ms]
(pass) tmux backend registry and capabilities > rejects an empty handle without invoking tmux [0.02ms]
(pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [3.38ms]
(pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [0.18ms]
(pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [0.07ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-workspace [0.21ms]

test\close-always.test.ts:
{"closed":["pane-name","pane-key","pane-id"],"requested":3,"ok":3,"stream":false}
(pass) close always works > closes a foreign-workspace target by name, key, or pane id [89.60ms]
(pass) close always works > dead pane-less close is a successful no-op that reaps registry and presence [167.26ms]
(pass) close always works > steer remains blocked by the workspace wall [0.19ms]

test\cmd-lock-bridge.test.ts:
(pass) pi-bridge command-lock interception > wraps a matching locked command in acquireΓåÆrelease around the tool call [11.59ms]
(pass) pi-bridge command-lock interception > leaves a non-matching command untouched ΓÇö no acquire, no release [0.66ms]
(pass) pi-bridge command-lock interception > only bash tool calls are intercepted ΓÇö a non-bash tool never acquires [0.37ms]

test\cmd-lock.test.ts:
(pass) command lock > acquire and release round-trip [11.11ms]
(pass) command lock > second acquire blocks until first releases [59.54ms]
(pass) command lock > dead-pid lock is reaped [21.64ms]
(pass) command lock > release with wrong pid refuses [12.92ms]
bun test held by agent-a (pid 26516)
(pass) command lock > matches locked command prefixes and probes settings [13.07ms]
(pass) command lock > run propagates the child exit code [23.51ms]

test\codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [0.16ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [0.16ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [0.50ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [2.37ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [2.24ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [76.67ms]

test\command-workspace-fields.test.ts:
(pass) command workspace fields > status and wall entities use persisted workspace instead of serialized-key text [53.99ms]
(pass) command workspace fields > status reports a mixed pi and Claude fleet with the same identity fields [58.76ms]

test\commands-clean.test.ts:
(pass) commands/clean > reaps dead agent dirs but preserves live pids [3.99ms]

test\commands-control.test.ts:
(pass) commands/control > parses dispatch flags without losing prompt words [0.17ms]
(pass) commands/control > parses --then destination and note [0.03ms]
(pass) commands/control > adds worker header unless raw [0.09ms]

test\commands-daemon.test.ts:
(pass) commands/daemon > parses governance and validates daemon status [0.15ms]
(pass) commands/daemon > reads a lock pid only from a complete lock record [3.93ms]

test\commands-events.test.ts:
(pass) commands/events > parses filters and scope flags [0.27ms]
(pass) commands/events > parses the wake-up flags [0.03ms]
(pass) commands/events > a subscription with no daemon keeps redialing instead of exiting [0.21ms]
(pass) commands/events > rejects malformed event and labels sinks [0.11ms]

test\commands-help.test.ts:
(pass) per-command help topics > daemon help names every subcommand and the idle shutdown setting [0.03ms]
(pass) per-command help topics > aliases resolve to their command's topic [0.02ms]
(pass) per-command help topics > an unknown name has no topic
(pass) per-command help topics > every topic is printable text ending in a newline [0.05ms]

test\commands-index.test.ts:
(pass) commands/index > does not gate help or noninteractive commands [0.03ms]
(pass) commands/index > reads a package version string [0.15ms]

test\commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [0.20ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [0.04ms]

test\commands-models.test.ts:
(pass) orch models lists the whole catalogue > shows every offered model, quicklisted or not, allowed or not [0.21ms]
(pass) orch models lists the whole catalogue > marks the launch default (thinking suffix removed) and the quicklist members [0.05ms]
(pass) orch models lists the whole catalogue > keeps harness sections in configured order [0.02ms]
(pass) orch models lists the whole catalogue > a harness that enumerates nothing gets an empty section, not another's models [0.06ms]
(pass) orch models filters > --preferred narrows to the quicklist and renumbers what is shown [0.02ms]
(pass) orch models filters > --search matches spec and label case-insensitively [0.05ms]
(pass) orch models filters > filters combine, and no match is an empty result rather than the full list [0.01ms]
(pass) orch models --pick prints one spec > a numeric pick reads the displayed index of a single harness [0.06ms]
(pass) orch models --pick prints one spec > an exact spec pick resolves after filtering [0.02ms]
(pass) orch models --pick prints one spec > ambiguous, missing, zero, and out-of-range picks fail [0.15ms]
(pass) orch models --json > emits the pinned harness/model shape [0.05ms]

test\commands-panes.test.ts:
(pass) commands/panes > pane identity remains backend-neutral [0.03ms]
(pass) commands/panes > exports the pane listing command directly [0.02ms]

test\commands-queue.test.ts:
(pass) commands/queue > round-trips add/list/cancel on an isolated store [44.38ms]
(pass) commands/queue > renders empty queues without throwing [0.15ms]
No queue tasks.

test\commands-results.test.ts:
(pass) commands/results > validates and extracts question payloads [0.06ms]
(pass) commands/results > formats invalid and recent timestamps [0.07ms]
(pass) commands/results > routes a seeded result.json through the command module [56.58ms]
(pass) commands/results > orch tail resolves a non-pi target through that adapter's session view [54.85ms]
(pass) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [61.60ms]
(pass) commands/results > orch tail -n keeps last-N rendered entries for a pi session [54.38ms]
(pass) commands/results > orch session reports the pi entry count [56.38ms]
(pass) commands/results > orch session shows zero entries for an adapter view without them [63.43ms]

test\commands-review.test.ts:
(pass) commands/review > uses the short orch branch as review target [2.74ms]
(pass) commands/review > falls back to branch then pane [0.05ms]

test\commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.14ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [0.33ms]
(pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.11ms]

test\commands-spawn.test.ts:
(pass) commands/spawn > parses spawn flags and rejects no implicit adapter assumptions [0.17ms]
(pass) commands/spawn > each pi flavor launches its own binary and preserves raw prompt [0.10ms]

test\commands-status.test.ts:
(pass) commands/status > derives view fields from seeded presence [0.46ms]
(pass) commands/status > marks dead presence as exited [0.06ms]
(pass) commands/status > shared status row carries presence-derived fields [0.14ms]
(pass) commands/status > row carries the spawning orchestrator, null for panes orch never recorded [0.04ms]
(pass) commands/status > json branch and local table branch derive identical rows apart from host [0.03ms]
(pass) commands/status > formats workspace labels and warnings [0.05ms]

test\commands-target.test.ts:
(pass) commands/target > splits known flags and preserves positional args [0.04ms]
(pass) commands/target > extracts target and joined prompt [0.05ms]
(pass) commands/target > reads only structured result text [0.01ms]
(pass) commands/target > quotes remote args and ORCH_DIR safely [0.04ms]
(pass) commands/target > lists only live serialized identity presence entries [10.68ms]

test\config-precedence.test.ts:
(pass) config precedence > returns a defaults value when no override is set [3.62ms]
(pass) config precedence > applies defaults when config, env, and flag are absent [3.71ms]
(pass) config precedence > uses env over config and flag over env [3.32ms]
(pass) config precedence > parses notify entries and hosts into expected shapes [4.26ms]
(pass) config precedence > reports a helpful validation error for invalid config [12.00ms]

test\config-watch.test.ts:
(pass) watchConfig > loads initially and applies a valid edit after the debounce [27.38ms]
(pass) watchConfig > keeps the last-good config, warns once, and recovers [401.73ms]
(pass) watchConfig > reloads on a touched reload.signal without a settings edit [35.62ms]
(pass) watchConfig > stop prevents further callbacks [411.47ms]

test\config.test.ts:
(pass) loadConfig > refuses to invent a configuration when settings.json is missing [1.04ms]
(pass) loadConfig > requires a top-level runtime and never defaults it [3.34ms]
(pass) loadConfig > rejects an unrecognized runtime naming the accepted values [2.76ms]
(pass) loadConfig > rejects a runtime misplaced under defaults [3.34ms]
(pass) loadConfig > reads the declared runtime [3.31ms]
(pass) loadConfig > parses every supported settings section [4.76ms]
(pass) loadConfig > rejects a file without the current schemaVersion [2.13ms]
(pass) loadConfig > rejects invalid JSON loudly [1.66ms]
(pass) loadConfig > names the key path for invalid fields [1.79ms]
(pass) loadConfig > rejects unknown settings keys [1.88ms]
(pass) loadConfig > parses models.allowed as a per-harness pattern map [2.02ms]
(pass) loadConfig > rejects old settings keys [8.73ms]
(pass) loadConfig > rejects legacy notify type and unknown ids [4.71ms]
(pass) loadConfig > applies timeout defaults and disables cross-workspace writes by default [2.57ms]
(pass) loadConfig > rejects a host without dest [3.70ms]
(pass) loadConfig > rejects an unknown id in enabled.adapters [2.66ms]
(pass) loadConfig > rejects defaults.adapter not present in enabled.adapters [1.71ms]
(pass) loadConfig > rejects when settings.json is absent but a legacy config.toml exists [0.77ms]
(pass) allowedModelPatterns > restricts nothing when no config names patterns [0.40ms]
(pass) allowedModelPatterns > returns the configured patterns when set [1.47ms]
(pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or enabled entry [3.00ms]
(pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [5.57ms]
(pass) writeSettingsRuntime > a different runtime replaces the single value in place [4.30ms]
(pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [5.25ms]
(pass) reapUnreadableSettings > leaves a readable file alone [4.20ms]
(pass) writeSettingsEnabled > round-trips both provider arrays [3.38ms]
(pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [5.21ms]
(pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [13.10ms]
(pass) writeSettingsDefault > is idempotent when rewriting the same value [7.09ms]
(pass) writeSettingsDefault > refuses to write through an out-of-version settings file [2.57ms]
(pass) writeSettingsDefault > switches defaults.adapter between two enabled ids and loads clean [13.53ms]
(pass) config precedence > uses the fallback when env and settings.json omit a setting [1.77ms]
(pass) config precedence > uses the settings.json value over the fallback [1.49ms]
(pass) config precedence > uses the ORCH_* environment value over settings.json [1.51ms]
(pass) config precedence > uses an explicit flag override over the environment [0.05ms]
(pass) resolveSetting > uses flag, environment coercion, config, then fallback in precedence order [0.05ms]
(pass) resolveWithSource > reports the winning source at each precedence level [0.04ms]
(pass) models.preferred and models.allowed are independent > loadConfig parses a per-harness preferred quicklist [1.35ms]
(pass) models.preferred and models.allowed are independent > an absent preferred map normalizes to an empty map, not to allowed [1.66ms]
(pass) models.preferred and models.allowed are independent > writing one list leaves the other byte-for-value intact [9.33ms]
(pass) models.preferred and models.allowed are independent > an empty list is recorded as no list at all, so a cleared picker really clears [5.32ms]
(pass) models.preferred and models.allowed are independent > the full tree seeds both maps when absent and preserves both when present [7.76ms]
(pass) models.preferred and models.allowed are independent > the allowlist gate reads models.allowed only [2.89ms]

test\control-dispatch.test.ts:
(pass) deliverControl > steers pi through its presence inbox [12.94ms]
(pass) deliverControl > warns and succeeds when claude keys fallback delivers [45.03ms]
steer headless~local~claude-fail via claude keys fallback (degraded delivery)
(pass) deliverControl > fails when claude keys fallback cannot deliver [47.24ms]
(pass) deliverControl > fails unsupported steer and setModel capabilities [5.00ms]
(pass) deliverControl > requires presence for inbox delivery [48.77ms]
(pass) deliverControl > refuses inbox delivery to an agent whose bridge never registered [49.47ms]
(pass) deliverControl > refuses inbox delivery to an agent whose process is gone [47.36ms]

test\daemon-events.test.ts:
(pass) daemon presence events > an RPC subscriber receives a presence transition [30.08ms]
(pass) daemon presence events > a flapping status file cannot storm the stream with repeat transitions [0.57ms]
(pass) daemon presence events > a genuine repeat of the same transition for new work still publishes [0.08ms]
(pass) daemon presence events > a repeat transition publishes again once the suppression window passes [0.04ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [0.13ms]
(pass) daemon presence events > a blocked transition drives command sink delivery [53.69ms]
(pass) daemon presence events > a dead daemon closes the subscription instead of falling back to files [16.69ms]
(pass) daemon presence events > a caller-initiated stop is not reported as a disconnect [57.93ms]

test\daemon-idle.test.ts:
(pass) orchd idle shutdown rule > a zero setting disables idle shutdown entirely [0.06ms]
(pass) orchd idle shutdown rule > a live agent holds the daemon open however long it has been quiet [0.01ms]
(pass) orchd idle shutdown rule > an event subscriber holds the daemon open
(pass) orchd idle shutdown rule > recent activity holds the daemon open below the threshold
(pass) orchd idle shutdown rule > a fully idle daemon past the threshold is due to exit

test\daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [793.43ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [523.06ms]
(pass) daemon lifecycle > reclaims an unreadable lock, which a crash truncated and no daemon owns [835.16ms]
(pass) daemon lifecycle > refuses an unreadable lock while the socket still answers [248.11ms]
(pass) daemon lifecycle > clears the lock, socket and port a departed daemon owned, keeping the log [3.02ms]
(pass) daemon lifecycle > refuses a stale lock when the socket probe cannot answer [287.23ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [260.32ms]
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
  add       lyra                 Add a dependency to package.json (bun a)
  remove    babel-core           Remove a dependency from package.json (bun rm)
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
  create    next-app             Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [78.68ms]
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [253.65ms]
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.4.0+34cbb9a40)

Usage: bun <command> [...flags] [...args]

Commands:
  run       ./my-script.ts       Execute a file with Bun
            lint                 Run a package.json script
  test                           Run unit tests with Bun
  x         prisma               Execute a package binary (CLI), installing if needed (bunx)
  repl                           Start a REPL session with Bun
  exec                           Run a shell script directly with Bun

  install                        Install dependencies for a package.json (bun i)
  add       @remix-run/dev       Add a dependency to package.json (bun a)
  remove    is-array             Remove a dependency from package.json (bun rm)
  update    @evan/duckdb         Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
  dedupe                         Remove duplicate versions from the lockfile
  prune                          Remove packages that are not in the lockfile from node_modules
  outdated                       Display latest versions of outdated dependencies
  link      [<package>]          Register or link a local npm package
  unlink                         Unregister a local npm package
  publish                        Publish a package to the npm registry
  patch <pkg>                    Prepare a package for patching
  pm <subcommand>                Additional package management utilities
  info      @zarfjs/zarf         Display package metadata from the registry
  why       zod                  Explain why a package is installed

  build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file

  init                           Start an empty Bun project from a built-in template
  create    elysia               Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > rejects a recycled pid identity [1030.61ms]
(pass) daemon lifecycle > only a provable lock owner may be signalled [822.36ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [4.51ms]

test\daemon-rpc.test.ts:
(pass) daemon RPC > round-trips a call over the real unix socket [10.50ms]
(pass) daemon RPC > returns an error for an unknown method [7.71ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [19.73ms]
(pass) daemon RPC > delivers pushed subscription events [14.14ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [513.51ms]
(pass) daemon RPC > has a catchable absent-daemon error [0.62ms]
(pass) daemon RPC > calls a slow daemon unreachable, not absent [107.37ms]
(pass) daemon RPC > calls a refused endpoint absent so a wedged daemon is still reclaimable [2.93ms]

test\doctor-backends.test.ts:
(pass) doctor backend and presence checks > reports every registered backend and boolean capability fields [6.67ms]
(pass) doctor backend and presence checks > passes with herdr active while an enabled tmux sits outside a session [0.04ms]
(pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.03ms]
(pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [0.03ms]
(pass) doctor backend and presence checks > fails when any enabled backend is unavailable, active or not [0.02ms]
(pass) doctor backend and presence checks > honours the configured default over the probe order [0.02ms]
(pass) doctor backend and presence checks > reports only records missing the current schema stamp [4.19ms]

test\doctor-checks.test.ts:
(pass) doctor notification-sink checks > reports no sinks as healthy [74.91ms]
(pass) doctor notification-sink checks > rejects a webhook with a malformed URL [3.80ms]
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [75.12ms]
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [70.69ms]

test\doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [23.04ms]
(pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [21.29ms]
(pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [27.67ms]
(pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [17.18ms]
(pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [17.74ms]
(pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [14.33ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [11.89ms]
(pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [10.58ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [27.76ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [0.30ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [9.08ms]

test\doctor-hosts.test.ts:
(pass) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [92.27ms]
(pass) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [79.64ms]
(pass) doctor remote host checks > flags a remote orch version/schema mismatch in detail [85.10ms]
(pass) doctor remote host checks > reports no remote hosts configured as healthy [82.19ms]

test\doctor-orphan-daemons.test.ts:
(pass) doctor orphaned-daemon check > a live foreign lock is reported, and an unproven owner is never killable [41.95ms]
(pass) doctor orphaned-daemon check > a dead pid's lock is not an orphan [30.98ms]
(pass) doctor orphaned-daemon check > the caller's own orch dir is never reported against itself [30.79ms]

test\doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env node as node [2.64ms]
(pass) shebangRuntime > reads #!/usr/bin/env bun as bun [2.65ms]
(pass) shebangRuntime > reads #!/usr/bin/env deno as deno [2.80ms]
(pass) shebangRuntime > reads #!/usr/local/bin/node as node [2.97ms]
(pass) shebangRuntime > does not mistake a longer binary name for a runtime [3.27ms]
(pass) shebangRuntime > returns null for a file with no shebang [3.96ms]
(pass) shebangRuntime > returns null for an unreadable path [1.30ms]
(pass) runningRuntime > reports the runtime this suite is executing under [0.13ms]
(pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [4.88ms]
(pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [5.04ms]
(pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [5.66ms]
(pass) doctor runtime verdict table > declared node but executing under bun fails [5.44ms]
(pass) doctor runtime verdict table > declared bun but executing under node fails just as loudly [18.09ms]
(pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [7.93ms]
(pass) doctor runtime verdict table > declared runtime absent from PATH fails [5.43ms]
(pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [4.98ms]
(pass) doctor runtime verdict table > remediation names both directions ΓÇö rebuild, or re-record the declaration [16.25ms]
(pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [1.01ms]

test\doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [133.49ms]
(pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [107.40ms]
(pass) doctor stale presence safety > no dead agents leaves nothing to remove [104.86ms]

test\doctor-unscoped-tasks.test.ts:
(pass) doctor unscoped queue tasks > only scoped tasks pass [50.73ms]
(pass) doctor unscoped queue tasks > reports a null-workspace row as reappable and names it [93.43ms]
(pass) doctor unscoped queue tasks > stays report-only ΓÇö no pre-selected destructive fix [88.95ms]
(pass) doctor unscoped queue tasks > the check is wired into runDoctor [130.05ms]

test\doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [0.16ms]
(pass) runDoctor > runs on an unconfigured install without failing for want of settings.json [96.86ms]
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [111.01ms]
(pass) runDoctor > reports an absent daemon as optional [83.04ms]
(pass) runDoctor > reports and fixes a stale daemon lock [91.60ms]
(pass) runDoctor > accepts a live daemon and an answerable socket [129.86ms]
(pass) runDoctor > warns when the live daemon code hash is stale [76.65ms]
(pass) runDoctor > fails on an invalid lock and an unanswerable live socket [153.55ms]
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [2.70ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [1.91ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [2.62ms]
(pass) runDoctor > reports a dead presence pid and corrupt spawn registry lines [83.69ms]
(pass) runDoctor > bins check is driven by the enabled set and offers no fix [62.84ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [2.72ms]
(pass) runDoctor > validates configured notifier adapters [280.02ms]
notify: could not load settings.json: C:\Users\Bryan\AppData\Local\Temp\orch-doctor-jdsIYe\settings.json: this settings file has invalid values: Γ£û Invalid input: expected number, received string ΓåÆ at queue.max_retries Fix those keys by hand, or re-record the file with: orch setup
(pass) runDoctor > reports invalid config and accepts missing config [148.94ms]
(pass) runDoctor > never throws when individual checks encounter broken inputs [173.00ms]

test\event-identity.test.ts:
(pass) published event identity > stamps a per-agent ordinal so a redelivery is recognizable [0.51ms]
(pass) the work loop is not a second presence-transition source > an agent state change publishes nothing from the queue loop [182.83ms]

test\herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [0.16ms]
(pass) herdr and notification hardening > falls back to a real name when an adapter id is blank [0.04ms]
(pass) herdr and notification hardening > nameless notifications use a workspace label, never a bare pane key [0.15ms]

test\herdr-pane-state.test.ts:
(pass) retryableErrorMessage classifier > no assistant message ΓåÆ undefined [0.09ms]
(pass) retryableErrorMessage classifier > assistant that did not stop on error ΓåÆ undefined [0.01ms]
(pass) retryableErrorMessage classifier > error stop with non-retryable text ΓåÆ undefined [0.14ms]
(pass) retryableErrorMessage classifier > error stop with retryable text ΓåÆ the message [0.02ms]
(pass) retryableErrorMessage classifier > non-string retryable errorMessage is stringified before matching [0.01ms]
(pass) retryableErrorMessage classifier > only the last assistant turn is classified [0.01ms]
(pass) createPaneStateMachine state ordering > run ΓåÆ blocked ΓåÆ unblock ΓåÆ idle debounce [6.43ms]
(pass) createPaneStateMachine state ordering > dedupes unchanged state [0.06ms]
(pass) createPaneStateMachine state ordering > retryable end holds working, then settles to blocked after grace [40.66ms]
(pass) createPaneStateMachine state ordering > duplicate end after settling does not publish a false idle [12.49ms]
(pass) createPaneStateMachine state ordering > openSession forces a publish even when state is unchanged [0.16ms]

test\identity.test.ts:
(pass) serializeIdentity / parseIdentity round-trip > round-trips herdr [0.08ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with % handle [0.02ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with : and % handle
(pass) serializeIdentity / parseIdentity round-trip > round-trips headless pid handle
(pass) serializeIdentity / parseIdentity round-trip > round-trips empty workspace
(pass) serializeIdentity / parseIdentity round-trip > round-trips separator inside parts
(pass) serializeIdentity / parseIdentity round-trip > round-trips slash inside parts
(pass) serializeIdentity / parseIdentity round-trip > round-trips percent-code-lookalike
(pass) serializeIdentity / parseIdentity round-trip > serialized key is a single flat segment (no nested path) [0.06ms]
(pass) serializeIdentity / parseIdentity round-trip > backend namespaces prevent collisions across equal workspace/handle [0.04ms]
(pass) malformed input > rejects wrong segment count [0.11ms]
(pass) malformed input > rejects empty key [0.03ms]
(pass) malformed input > rejects empty backend or id on serialize [0.04ms]
(pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.02ms]
(pass) malformed input > tryParseIdentity parses a valid key [0.03ms]

test\launch-model-gate.test.ts:
(pass) the model gate rules by harness membership, not by format > accepts a listed spec, with or without a thinking suffix [0.13ms]
(pass) the model gate rules by harness membership, not by format > refuses a ladder shorthand and names what the harness does offer [0.16ms]
(pass) the model gate rules by harness membership, not by format > accepts each harness's own vocabulary rather than one shared grammar [0.07ms]
(pass) the model gate rules by harness membership, not by format > cannot check a harness that publishes no catalogue, and does not pretend to [0.02ms]
(pass) the settings allowlist applies on top of harness membership > an empty allowlist restricts nothing beyond the harness list [2.97ms]
(pass) the settings allowlist applies on top of harness membership > a configured allowlist refuses a listed model outside its patterns [3.33ms]
(pass) the settings allowlist applies on top of harness membership > harness membership is checked before the allowlist, so the message names the harness [1.52ms]

test\notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > skips an unavailable adapter without affecting available adapters [0.39ms]
notify: webhook notifier has invalid configuration
(pass) notifier registry and built-in adapters > reports malformed required configuration instead of throwing [0.18ms]
(pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [0.43ms]
(pass) notifier registry and built-in adapters > command adapter passes canonical JSON on stdin [28.57ms]
(pass) notifier registry and built-in adapters > desktop fallback selects notify-send, then WSL notify when it fails [4.09ms]
notify: bad sink failed
(pass) notifier registry and built-in adapters > isolates delivery failures and still delivers to other adapters [0.25ms]

test\notify-events-format.test.ts:
(pass) notification and presence event formatting > workspaceColor is stable and returns a palette hex [0.06ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.09ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.05ms]
(pass) notification and presence event formatting > webhook payload includes workspace and workspaceColor [0.22ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [0.21ms]
(pass) notification and presence event formatting > derivePresenceTransition derives workspace from identity keys [0.04ms]

test\notify-sinks.test.ts:
(pass) notify sinks > delivers command sink payload as JSON [31.30ms]
(pass) notify sinks > loadSinks parses command and webhook declarations [3.49ms]

test\notify.test.ts:
(pass) notify > parses valid sinks and applies default on states [3.13ms]
(pass) notify > delivers only to sinks whose on filter matches the event [32.35ms]
(pass) notify > command sink writes the event payload as JSON on stdin [26.07ms]
(pass) notify > titles lead with exactly one terminal state and agent [0.24ms]
(pass) notify > webhook failure is non-fatal and reports a warning [26.74ms]

test\orchd-rpc-reconnect.test.ts:
(pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [285.30ms]
(pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1026.41ms]

test\orchd-rpc-replay.test.ts:
(pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [0.11ms]
(pass) orchd RPC replay buffer > drops the oldest events and reports a replay gap [0.32ms]

test\orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [27.93ms]

test\orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [7.00ms]
(pass) orchd RPC transports > round-trips over the TCP fallback transport [15.47ms]

test\outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [52.23ms]

test\outbox.test.ts:
(pass) outbox delivery > selects pending messages and delivers each message once [47.96ms]
(pass) outbox delivery > keeps failed messages pending until their backoff expires [46.64ms]

test\owner-scoping.test.ts:
(pass) fleet ownership scoping > owner token uses ORCH_OWNER, else the write actor (selfActor) [12.85ms]
(pass) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [48.33ms]
(pass) fleet ownership scoping > headless bulk operations refuse without an owner token [87.94ms]
{"closed":["mine"],"requested":1,"ok":1,"stream":false}
(pass) fleet ownership scoping > close --all leaves foreign-owned records untouched [50.90ms]
(pass) fleet ownership scoping > explicit foreign target fails and names its owner [196.34ms]
(pass) fleet ownership scoping > result refuses a foreign-owned agent and names its owner [307.66ms]
(pass) fleet ownership scoping > pane mutations refuse a foreign-owned agent and name its owner [651.71ms]
(pass) fleet ownership scoping > --force allows an explicit foreign target [184.46ms]
(pass) a spawned agent touches only what it spawned > selfActor is the agent's own key inside a spawned agent [2.54ms]
(pass) a spawned agent touches only what it spawned > --cross-workspace from a spawned agent is refused [136.87ms]
(pass) a spawned agent touches only what it spawned > close --all sweeps only the caller's own spawns [184.69ms]
(pass) a spawned agent touches only what it spawned > --force from a spawned agent is refused outright [178.15ms]
(pass) a spawned agent touches only what it spawned > the workspace operator keeps control of an agent-owned fleet [179.90ms]

test\ownership.test.ts:
(pass) agent ownership > round-trips an owner [40.08ms]
(pass) agent ownership > allows unowned and same-owner writes [42.08ms]
(pass) agent ownership > denies foreign writes and supports stealing [48.25ms]

test\parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [0.04ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.04ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.04ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.02ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.03ms]

test\peer-identity.test.ts:
(pass) spawner identity > a bare operator with no session markers is just the operator [0.77ms]
(pass) spawner identity > a Claude Code session names itself through its env marker [0.52ms]
(pass) spawner identity > a Claude Code session has NO reply address; its session id only names it apart [0.43ms]
(pass) spawner identity > a harness session with presence hands out its own reply address [10.62ms]
(pass) spawner identity > an orch-spawned orchestrator is named by its own agent name and harness [60.20ms]
(pass) spawner identity > agentIdentityEnv stamps a reply address only when the spawner has one [0.26ms]
(pass) spawner identity > worktreeEnv stamps worktree identity only for isolated agents [0.10ms]
(pass) spawner identity > the registry keeps the exact spawning session distinct from the workspace owner [50.23ms]
(pass) the spawner address invariant > a Claude Code session stamps no address, so no worker is handed an unreachable one [0.83ms]
(pass) the spawner address invariant > a bare operator stamps no address [0.50ms]
(pass) the spawner address invariant > an address that IS stamped resolves to a live inbox [4.40ms]
(pass) peer identity in messaging > orch_send reports the peer's NAME, and stamps the sender's name on the message [22.24ms]
(pass) peer identity in messaging > peers resolve by display name exactly like by key [10.94ms]
(pass) peer identity in messaging > "spawner" reaches the stamped spawner session across fleet scoping [13.39ms]
(pass) peer identity in messaging > a spawner with no inbox is refused BY NAME, not with a bare key [1.04ms]

test\peer-project-scope.test.ts:
(pass) peer discovery walls on the project > a same-workspace peer from another project is invisible by default [16.18ms]
(pass) peer discovery walls on the project > all_workspaces deliberately lifts the project wall [6.82ms]
(pass) peer discovery walls on the project > a cross-project target does not resolve for sends without the explicit flag [6.40ms]
(pass) peer discovery walls on the project > a record with no project stamp is malformed and never listed [16.33ms]
(pass) peer discovery walls on the project > a spawned agent's all_workspaces flag is ignored [4.58ms]

test\pi-model-control.test.ts:
(pass) splitThinkingSuffix > splits a valid ladder effort off the bare id [0.12ms]
(pass) splitThinkingSuffix > leaves a bare model untouched [0.02ms]
(pass) splitThinkingSuffix > keeps a trailing colon token that is not a thinking level as part of the id [0.03ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > looks up the BARE id and returns the effort suffix separately [0.36ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > retries until a still-booting registry answers [3.63ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > throws when the registry never yields the model [1.60ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > rejects a token without a provider/id shape [0.12ms]
(pass) createModelControl.applyControlCommand > applies a suffixed model command and records a success outcome [11.01ms]
(pass) createModelControl.applyControlCommand > records a failure outcome when the model is rejected [2021.35ms]
(pass) createModelControl.applyControlCommand > applies a thinking command directly [15.94ms]

test\pid-liveness.test.ts:
(pass) pidAlive liveness contract (shared by pi peers) > EPERM means the process exists under another user ΓÇö alive [0.14ms]
(pass) pidAlive liveness contract (shared by pi peers) > ESRCH means no such process ΓÇö dead [0.02ms]
(pass) pidAlive liveness contract (shared by pi peers) > the current process is alive [0.04ms]
(pass) pidAlive liveness contract (shared by pi peers) > non-positive and non-numeric pids are rejected without signalling [0.04ms]

test\presence-schema.test.ts:
(pass) presence status schema > reads a spawned namespaced identity with backend, workspace, handle, and adapter [37.44ms]
(pass) presence status schema > orch status JSON exposes the complete spawned identity fields [38.00ms]
(pass) presence status schema > status and list report the same agent identity [77.69ms]
(pass) presence status schema > mixed pi and Claude status rows carry the same identity field set [36.60ms]
(pass) presence status schema > rejects a status record that carries no schema stamp [33.99ms]
(pass) presence status schema > rejects a status record stamped with a non-current schema [34.06ms]
(pass) presence status schema > a malformed record is skipped without hiding the valid records beside it [31.37ms]
(pass) presence status schema > persists the complete spawned identity record [33.75ms]

test\queue-workspace-replay.test.ts:
(pass) queue workspace replay > persists workspace through append-only replay [42.14ms]
(pass) queue workspace replay > a malformed null-workspace row replays but is never claimable [68.47ms]
(pass) queue workspace replay > replays separate workspace values for multiple tasks [47.99ms]
(pass) queue workspace replay > selects only tasks eligible for the requested workspace [71.45ms]

test\queue.test.ts:
(pass) queue > add then list shows a queued task [48.52ms]
(pass) queue > exactly one claimer wins, including parallel attempts [54.02ms]
(pass) queue > replays done, failed, and retry transitions [64.08ms]
(pass) queue > cancels queued tasks and returns an error result for claimed tasks [49.95ms]
(pass) queue > picks queued tasks FIFO, honoring the agent constraint [52.54ms]
(pass) queue > caps retries: requeue below the cap, terminal failed at it [58.92ms]
(pass) queue > settles a claimed task to done and blocks any later claim [46.27ms]
(pass) queue > exactly one of two racing claimers wins [46.89ms]
(pass) queue > rejects an unscoped task at enqueue [42.09ms]
(pass) queue > a claim stamps the dispatch id the settle path verifies against [48.05ms]
(pass) queue > a once-claimed task is only ever offered back to its own agent [52.19ms]
(pass) queue > a bound-but-requeued task can fail terminally instead of re-binding [58.91ms]
(pass) queue > a malformed null-workspace row is skipped at claim, never dispatched [64.58ms]

test\recipient-label.test.ts:
(pass) agent identity shown to an operator > names the agent and its harness, never the transport key [1.88ms]
(pass) agent identity shown to an operator > drops the routing prefix when nothing is known about it [0.04ms]
(pass) agent identity shown to an operator > a nameless agent gets a stable logical name, not its key [0.03ms]

test\remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [69.66ms]
(pass) async remote fan-out > returns a typed dead-host failure [79.87ms]
(pass) async remote fan-out > returns a typed timeout failure [517.57ms]
(pass) async remote fan-out > returns a typed non-JSON failure [82.59ms]
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [533.41ms]

test\remote.test.ts:
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.08ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.06ms]

test\review.test.ts:
Preparing worktree (new branch 'orch/feature-1')
(pass) review plumbing > lists only done worktree agents with commits ahead [668.52ms]
Preparing worktree (new branch 'orch/iterate-1')
(pass) review plumbing > reject re-dispatches feedback through the adapter inbox [1297.18ms]
Preparing worktree (new branch 'orch/approve-1')
(pass) review plumbing > approve merges and removes the worktree and branch [1026.88ms]
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
(pass) review plumbing > conflicting approval aborts without changing either branch [763.79ms]
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
(pass) review plumbing > non-fast-forward approval creates a merge commit [764.70ms]

test\routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves origin workspace selection [49.39ms]
(pass) store hardening > a fresh store creates the full current schema with WAL enabled [53.79ms]
(pass) store hardening > a steal updates ownership only when the observed owner still matches [45.34ms]
(pass) store hardening > the conditional claim is exactly once [43.62ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [118.44ms]

test\settings-command.test.ts:
(pass) orch settings > --json reports value + source per setting, settings.json winning over defaults [87.70ms]
(pass) orch settings > --json reports env as the winning source over settings.json [82.52ms]
(pass) orch settings > --harness switches defaults.adapter between enabled ids and rejects a non-enabled id [237.38ms]
(pass) orch settings > reports each harness's picker quicklist and launch gate as separate rows [84.00ms]
(pass) orch settings > a load error surfaces loudly with no partial table [85.97ms]

test\setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [1.44ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.17ms]
(pass) notifier setup logic > renders a command entry that loadConfig can parse [2.45ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.19ms]

test\setup-smoke.test.ts:
(pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [0.27ms]
(pass) runSetupSmoke (12.5) > the agent is launched on the prompt it built [0.07ms]
(pass) runSetupSmoke (12.5) > an agent that launches but yields no result times out and fails non-zero [0.09ms]
(pass) runSetupSmoke (12.5) > a rejected spawn fails loudly and never polls for a result [0.08ms]

test\setup-wizard.test.ts:
(pass) setup model picker > switches large catalogues to searchable bounded mode and preserves effort [0.19ms]
(pass) setup model picker > keeps the compact selector for small catalogues [0.05ms]
(pass) setup model list picker > large catalogues use the bounded searchable multiselect [0.12ms]
(pass) setup model list picker > the prompt names both jobs the list does, and that an empty one forbids nothing [0.04ms]
(pass) setup model list picker > stored values start checked, and clearing them returns an empty selection [0.08ms]

test\skew-guard.test.ts:
(pass) CLI daemon skew guard > refuses mutating commands and names both hashes plus the reload remedy [73.05ms]
(pass) CLI daemon skew guard > allows read-only commands while the daemon is skewed [126.91ms]
(pass) CLI daemon skew guard > --stale-ok overrides refusal for a mutating command [1162.34ms]
  warning: pi --list-models failed; pi lists no models (pi --list-models failed after 2 attempts: Executable not found in $PATH: "pi")
(pass) CLI daemon skew guard > doctor reports skew as a warning without making skew itself a failure [603.01ms]
(pass) CLI daemon skew guard > does not treat an absent daemon as skew and auto-starts a fresh daemon [1334.54ms]

test\spawn-identity.test.ts:
(pass) one key per pane spawn (12.1) > identity is an opaque minted id ΓÇö never the name, never the pane handle [58.70ms]
(pass) one key per pane spawn (12.1) > a name freed by a dead agent is reusable, and the two agents differ in identity [68.92ms]
(pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [66.79ms]

test\spawn-limits.test.ts:
(pass) spawn limits > schema loads global and workspace caps [2.28ms]
(pass) spawn limits > rejects invalid cap %s with file and key [1.91ms]
(pass) spawn limits > rejects invalid cap %s with file and key [2.00ms]
(pass) spawn limits > rejects invalid cap %s with file and key [1.89ms]
(pass) spawn limits > omitted fleet caps normalize to defaults [1.46ms]
(pass) spawn limits > global boundary refusal data counts the whole request [6.53ms]
(pass) spawn limits > one workspace may use the full global allotment [6.23ms]
(pass) spawn limits > workspace cap is independent of global headroom [3.70ms]
(pass) spawn limits > uncapped workspace is bounded only by global count [3.06ms]
(pass) spawn limits > dead pid records free capacity [2.80ms]
(pass) spawn limits > foreign panes never count [3.08ms]
(pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [78.88ms]
(pass) spawn limits > doctor accepts satisfiable limits [78.01ms]

test\spawn-names.test.ts:
(pass) spawn name numbering > starts at 1 when no agent under the prefix is live [39.33ms]
(pass) spawn name numbering > continues past the highest live index so a live fleet is grown, not collided with [54.64ms]
(pass) spawn name numbering > a dead agent frees its name and its index [41.72ms]
(pass) spawn name numbering > another workspace's fleet never affects numbering [47.86ms]
(pass) spawn name numbering > a prefix that is another prefix's head never matches it [45.09ms]

test\spawn-preferred-models.test.ts:
(pass) the preferred quicklist reaches every launch route > a pane spawn hands the exact array to the backend [53.14ms]
(pass) the preferred quicklist reaches every launch route > an unconfigured quicklist stays empty rather than becoming a default one [52.26ms]
(pass) the preferred quicklist reaches every launch route > the previewed command is the command a launch runs [0.71ms]
(pass) the preferred quicklist reaches every launch route > a headless launch forwards the quicklist into the adapter's own options [6.10ms]
(pass) orchd rules on the quicklist it is sent > accepts an absent value and an array of specs [0.18ms]
(pass) orchd rules on the quicklist it is sent > refuses a joined string or a blank entry instead of coercing it [0.17ms]

test\tiling.test.ts:
(pass) planTilePlacement > a lone pane needs no target: every backend's default split hits it [0.15ms]
(pass) planTilePlacement > first_split rules the opening split, however the screen is shaped [0.08ms]
(pass) planTilePlacement > first_split longest-edge leaves the opening split to the tab's own shape [0.04ms]
(pass) planTilePlacement > a tab with no geometry to read still opens the way first_split says [0.03ms]
(pass) planTilePlacement > past the first split, the biggest pane halves its longer side whatever first_split says [0.11ms]
(pass) planTilePlacement > the biggest pane is the target, whatever the caller's own pane is [0.03ms]
(pass) planTilePlacement > equal panes resolve top-left first, so enumeration order cannot decide [0.03ms]
(pass) planTilePlacement > four agents land in a 2x2 grid, not four columns [0.24ms]
(pass) planTilePlacement > four agents on an ultrawide screen still land in a 2x2 grid [0.04ms]
(pass) planTilePlacement > first_split rows stacks the second agent, columns seats it alongside [0.03ms]
(pass) planTilePlacement > longest-edge on an ultrawide screen is the four-thin-columns layout first_split exists to avoid [0.04ms]
(pass) planTilePlacement > the same pane count yields the same grid whatever pane order the plexer reports [0.46ms]

test\transcript.test.ts:
(pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [0.18ms]
(pass) lastAssistantFromJsonl > undefined for blank or empty input [0.02ms]
(pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.03ms]
(pass) assistantText > reads role-tagged records [0.02ms]
(pass) assistantText > reads the {type:'assistant'} envelope with a nested message [0.01ms]
(pass) assistantText > undefined for non-assistant roles [0.01ms]
(pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.02ms]
(pass) contentText empty-string part handling > an all-empty content array yields undefined [0.01ms]
(pass) contentText empty-string part handling > a bare empty string yields undefined

test\wall-single-owner.test.ts:
28 | 
29 |     for (const marker of wallMarkers) {
30 |       const owners = sources
31 |         .filter(([, source]) => marker.test(source))
32 |         .map(([path]) => path);
33 |       expect(owners).toEqual([canonicalWallModule]);
                          ^
error: expect(received).toEqual(expected)

- [
-   "src/policy/workspace.ts",
- ]
+ []

- Expected  - 3
+ Received  + 1

      at <anonymous> (C:\dev\personal\orch\test\wall-single-owner.test.ts:33:22)
(fail) workspace wall ownership > keeps the wall decision primitive in one source module [6.10ms]

test\work-loop-binding.test.ts:
(pass) work loop dispatch binding > statusSpeaksForTask demands an id match whenever the bridge reports one [0.10ms]
(pass) work loop dispatch binding > a claimed task settles only from a status carrying its own dispatch id [67.82ms]
(pass) work loop dispatch binding > a claimed task whose agent died fails instead of re-binding to a new pane [47.17ms]
(pass) work loop dispatch binding > a bound retry whose agent died fails too, never reaching another agent [52.31ms]

test\work-notify.test.ts:
(pass) orch presence notifications > delivers a presence transition through a configured command sink [54.92ms]

test\worker-prompt.test.ts:
(pass) worker prompt capability composition > orch run composition selects the same header per adapter [0.10ms]
(pass) worker prompt capability composition > locked-commands clause names the commands when the list is non-empty [0.06ms]
(pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.02ms]
(pass) worker prompt capability composition > the reply-to-spawner clause needs a reachable spawner, not just an inbox-steerable worker [0.03ms]
(pass) worker prompt capability composition > a reachable spawner still earns no clause when the worker cannot be steered by inbox [0.02ms]
(pass) worker prompt capability composition > events strip both worker header variants [0.28ms]

test\worker-tools.test.ts:
(pass) worker tool policy > no configured allowlist restricts nothing [0.10ms]
(pass) worker tool policy > a configured allowlist always carries orch's own tools [0.03ms]
(pass) worker tool policy > peer tools join the allowlist when the fleet enables them [0.02ms]

test\workspace-policy.test.ts:
(pass) workspace policy > reads workspaces from serialized identity keys [0.13ms]
(pass) workspace policy > resolves workspace names through records and functions [0.07ms]
(pass) workspace policy > compares serialized keys by their workspace [0.05ms]
(pass) workspace policy > enforces the workspace wall [0.05ms]
(pass) workspace policy > scopes serialized identity keys to the current workspace [0.04ms]
(pass) workspace policy > null current workspace leaves items unscoped [0.02ms]
(pass) workspace policy > 2.7 status displays the reported workspace identity field [59.36ms]
(pass) workspace policy > 6.6 structured identity drives status and policy, not serialized key text [49.46ms]

test\workspace-walls.test.ts:
(pass) workspace helpers > extracts workspace ids only from identity keys [3.90ms]
(pass) workspace helpers > derives an entity workspace from the identity key [0.16ms]
(pass) workspace helpers > returns the same entities when all workspaces are requested [5.45ms]
(pass) workspace wall writes > allows a write within the same workspace [0.06ms]
(pass) workspace wall writes > denies a cross-workspace write with both workspaces in the reason [0.05ms]
(pass) workspace wall writes > applies the same wall rule to herdr, tmux, and headless identities [0.12ms]
(pass) workspace wall writes > allows a cross-workspace write with an explicit override [0.01ms]
(pass) workspace wall writes > allows legacy unscoped targets [0.01ms]
(pass) workspace-aware queued task selection > excludes tasks pinned to another workspace [0.07ms]
(pass) workspace-aware queued task selection > skips a malformed unscoped task in every workspace [0.05ms]
(pass) workspace-aware queued task selection > selects the earliest eligible task and respects agent constraints [0.05ms]

test\worktree.test.ts:
Preparing worktree (new branch 'orch/fixes-1')
(pass) worktree primitives > creates and lists an agent worktree on an orch branch [262.16ms]
Preparing worktree (new branch 'orch/feature')
(pass) worktree primitives > detects commits ahead of a base branch [472.19ms]
Preparing worktree (new branch 'orch/remove-me')
(pass) worktree primitives > removes an agent worktree [375.77ms]
fatal: not a git repository (or any of the parent directories): .git
(pass) worktree primitives > rejects a non-repository path with a clear error [43.21ms]

1 tests skipped:
(skip) claude-hooks shim tests need the dist bundle


1 tests failed:
(fail) workspace wall ownership > keeps the wall decision primitive in one source module [6.10ms]

 670 pass
 1 skip
 1 fail
 2405 expect() calls
Ran 672 tests across 105 files. [37.97s]
