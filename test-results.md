bun test v1.4.0 (34cbb9a40)

test\adapter-allowlist.test.ts:
(pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [0.30ms]
(pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.04ms]
(pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.01ms]
(pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's
(pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.09ms]
(pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.03ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.06ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.01ms]
(pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.02ms]

test\adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [2.77ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [6.10ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [3.86ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [1.09ms]

test\adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [0.04ms]
(pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.03ms]
(pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.02ms]
(pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.03ms]
(pass) preferred models fill the harness's native picker quicklist > pi interactive builders pass the quicklist as one quoted --models argument [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > pi headless builders pass the quicklist as one verbatim argv entry [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > pi omits --models cleanly for an absent or empty quicklist [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > pi keeps quicklist order and provider punctuation intact [0.01ms]
(pass) preferred models fill the harness's native picker quicklist > omp interactive builders pass the quicklist as one quoted --models argument [0.02ms]
(pass) preferred models fill the harness's native picker quicklist > omp headless builders pass the quicklist as one verbatim argv entry
(pass) preferred models fill the harness's native picker quicklist > omp omits --models cleanly for an absent or empty quicklist [0.02ms]
(pass) preferred models fill the harness's native picker quicklist > omp keeps quicklist order and provider punctuation intact
(pass) preferred models fill the harness's native picker quicklist > a model outside the quicklist is still what the launch runs on [0.02ms]

test\adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.20ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.06ms]
(pass) PiAdapter > reads state from the presence status through store helpers [13.69ms]
(pass) PiAdapter > appends a steer message to the presence inbox [12.46ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [21.32ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [15.68ms]
(pass) PiAdapter > parses pi's supported model table without importing harness internals [0.54ms]

test\answer-dispatch.test.ts:
(pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [26.60ms]
(pass) answer via the control dispatcher > refuses answer when the adapter declares ask false, naming target and adapter [17.32ms]
(pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [49.83ms]
(pass) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [70.55ms]
(pass) answer over the daemon control socket > refuses a cross-workspace answer at the daemon wall [8.58ms]
(pass) answer over the daemon control socket > refuses a non-owner answer, naming the owning orchestrator [50.85ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > workspaceNames is empty ΓÇö headless has no name concept [0.15ms]
(pass) HeadlessBackend > refuses to spawn with no prompt ΓÇö a headless agent runs its prompt and exits [0.24ms]
(pass) HeadlessBackend > spawns a detached process and records its handle [32.73ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [79.02ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [33.58ms]
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [54.56ms]
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [13.90ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [13.01ms]
(pass) HeadlessBackend > never signals an unrecorded pid [1.47ms]

test\backend-herdr.test.ts:
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [0.25ms]
(pass) HerdrBackend > maps close and list to herdr helpers [0.07ms]
(pass) HerdrBackend > a planned target pane is honoured by re-seating the fresh pane against it [0.09ms]
(pass) HerdrBackend > a same-tab re-seat bounces through a throwaway tab so herdr executes it [0.03ms]
(pass) HerdrBackend > a refused move surfaces herdr's reason instead of claiming success [0.03ms]
(pass) HerdrBackend > groupLayout reads tab geometry straight off the pane listing [0.06ms]
(pass) HerdrBackend > workspaceNames maps tab labels by workspace, first label wins, unlabeled skipped [0.07ms]

test\backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [0.10ms]
(pass) TmuxBackend > reports tmux availability [3.34ms]
(pass) TmuxBackend > workspaceNames is empty ΓÇö tmux sessions have no names distinct from ids [0.06ms]
(pass) TmuxBackend > reflects the TMUX environment [0.08ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.07ms]
(pass) TmuxBackend > list() and inventory() surface only orch-spawned panes [0.52ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.13ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [3.29ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.24ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [52.32ms]
(pass) TmuxBackend > waitAgentStatus fails immediately when the pane has no presence key [0.17ms]
(pass) TmuxBackend > read returns captured text and throws when capture-pane fails [0.12ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [0.11ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.23ms]
(pass) TmuxBackend > spawn splits the planned target pane, not whatever pane the window has active [0.06ms]
(pass) TmuxBackend > groupLayout reports every pane in a window with its cell geometry [0.18ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.06ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [0.25ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.08ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.16ms]
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [45.48ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [56.76ms]
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [45.29ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [0.35ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [10.08ms]

test\broker-governance.test.ts:
(pass) daemon governWrite enforcement > an unscoped actor is refused on an owned target [45.86ms]
(pass) daemon governWrite enforcement > an unscoped actor may write to an unowned target [37.32ms]
(pass) daemon governWrite enforcement > owner may write to its own agent [41.64ms]
(pass) daemon governWrite enforcement > a foreign owner in the same workspace is refused [40.02ms]
(pass) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [39.77ms]
(pass) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [40.92ms]
(pass) daemon governWrite enforcement > --steal transfers ownership to the actor [41.16ms]
(pass) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [40.07ms]
(pass) daemon governWrite enforcement > the workspace operator writes to any same-workspace owned agent [40.98ms]
(pass) daemon governWrite enforcement > a foreign workspace's operator still hits the wall [39.81ms]

test\broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [47.94ms]
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [0.28ms]
(pass) broker ownership and workspace governance > work-loop selection stays within the origin workspace [41.58ms]

test\broker-routing.test.ts:
(pass) broker CLI routing > an unprovable foreign lock is never signalled; dispatch starts a fresh daemon and fails on delivery [210.05ms]
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [128.84ms]
(pass) broker CLI routing > dispatch failure is a delivery verdict, never herdr-not-found [248.25ms]

test\check-bridge.test.ts:
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.06ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.03ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / config seams [0.04ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [0.22ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.06ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the shared harness model port outside the adapter dispatcher
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [0.19ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [0.29ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.03ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.07ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke-test exemption is documented and load-bearing [0.03ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has exactly one identity-branch line and it is exempted [3.59ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.04ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [0.25ms]

test\claude-adapter.test.ts:
(pass) Claude adapter > declares its identity and capabilities [0.17ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.05ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.08ms]
(pass) Claude adapter > detects state from a live presence status [9.01ms]
(pass) Claude adapter > extracts result.json before transcript and native output [3.46ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [2.39ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [44.87ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [168.33ms]
(pass) Claude adapter > exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session) [32.83ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed ORCH_AGENT_KEY [37.49ms]

test\claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [78.06ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [72.59ms]
(pass) claude-hooks shim > under node > writes status.json for a valid key [77.45ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [41.75ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [45.38ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [52.29ms]
(skip) claude-hooks shim tests need the dist bundle

test\clean-worktrees.test.ts:
Preparing worktree (new branch 'orch/empty')
Preparing worktree (new branch 'orch/merged')
Preparing worktree (new branch 'orch/unmerged')
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [1979.86ms]
Preparing worktree (new branch 'orch/discard')
(pass) clean worktrees > --force discards an unmerged orphan and its branch [934.67ms]

test\cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.28ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.09ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.13ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.06ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.16ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.08ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [7.44ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [0.10ms]
(pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [51.64ms]
(pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [0.82ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [80.33ms]
(pass) headless common path: identity key -> presence > one adapter uses opaque keys across headless and tmux backend routes [0.15ms]
(pass) headless common path: identity key -> presence > workspaceOf reads the workspace from the structured key, not a regex [0.05ms]

test\cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.08ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [5.72ms]
(pass) tmux backend registry and capabilities > exposes pane capabilities [0.04ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.05ms]
(pass) tmux backend registry and capabilities > serializes tmux identities as one flat key [0.08ms]
(pass) tmux backend registry and capabilities > rejects an empty handle without invoking tmux [0.01ms]
(pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [2.50ms]
(pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [0.07ms]
(pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [0.04ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-workspace [0.12ms]

test\close-always.test.ts:
{"closed":["pane-name","pane-key","pane-id"],"requested":3,"ok":3,"stream":false}
(pass) close always works > closes a foreign-workspace target by name, key, or pane id [88.45ms]
(pass) close always works > dead pane-less close is a successful no-op that reaps registry and presence [191.36ms]
(pass) close always works > steer remains blocked by the workspace wall [0.18ms]

test\cmd-lock-bridge.test.ts:
(pass) pi-bridge command-lock interception > wraps a matching locked command in acquireΓåÆrelease around the tool call [12.97ms]
(pass) pi-bridge command-lock interception > leaves a non-matching command untouched ΓÇö no acquire, no release [0.63ms]
(pass) pi-bridge command-lock interception > only bash tool calls are intercepted ΓÇö a non-bash tool never acquires [0.36ms]

test\cmd-lock.test.ts:
(pass) command lock > acquire and release round-trip [12.09ms]
(pass) command lock > second acquire blocks until first releases [61.15ms]
(pass) command lock > dead-pid lock is reaped [22.69ms]
(pass) command lock > release with wrong pid refuses [12.20ms]
bun test held by agent-a (pid 8692)
(pass) command lock > matches locked command prefixes and probes settings [16.00ms]
(pass) command lock > run propagates the child exit code [27.62ms]

test\codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [0.16ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [0.18ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [0.41ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [12.87ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [2.27ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [90.63ms]

test\command-workspace-fields.test.ts:
(pass) command workspace fields > status and wall entities use persisted workspace instead of serialized-key text [49.00ms]
(pass) command workspace fields > status reports a mixed pi and Claude fleet with the same identity fields [51.39ms]

test\commands-clean.test.ts:
(pass) commands/clean > reaps dead agent dirs but preserves live pids [5.75ms]

test\commands-control.test.ts:
(pass) commands/control > parses dispatch flags without losing prompt words [0.15ms]
(pass) commands/control > parses --then destination and note [0.02ms]
(pass) commands/control > adds worker header unless raw [0.06ms]

test\commands-daemon.test.ts:
(pass) commands/daemon > parses governance and validates daemon status [0.12ms]
(pass) commands/daemon > reads a lock pid only from a complete lock record [8.01ms]

test\commands-events.test.ts:
(pass) commands/events > parses filters and scope flags [0.19ms]
(pass) commands/events > parses the wake-up flags [0.02ms]
(pass) commands/events > a subscription with no daemon keeps redialing instead of exiting [0.23ms]
(pass) commands/events > rejects malformed event and labels sinks [0.11ms]

test\commands-help.test.ts:
(pass) per-command help topics > daemon help names every subcommand and the idle shutdown setting [0.03ms]
(pass) per-command help topics > aliases resolve to their command's topic [0.01ms]
(pass) per-command help topics > an unknown name has no topic
(pass) per-command help topics > every topic is printable text ending in a newline [0.05ms]

test\commands-index.test.ts:
(pass) commands/index > does not gate help or noninteractive commands [0.03ms]
(pass) commands/index > reads a package version string [0.14ms]

test\commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [0.18ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [0.04ms]

test\commands-models.test.ts:
(pass) orch models lists the whole catalogue > shows every offered model, quicklisted or not, allowed or not [0.20ms]
(pass) orch models lists the whole catalogue > marks the launch default (thinking suffix removed) and the quicklist members [0.05ms]
(pass) orch models lists the whole catalogue > keeps harness sections in configured order [0.02ms]
(pass) orch models lists the whole catalogue > a harness that enumerates nothing gets an empty section, not another's models [0.06ms]
(pass) orch models filters > --preferred narrows to the quicklist and renumbers what is shown [0.03ms]
(pass) orch models filters > --search matches spec and label case-insensitively [0.04ms]
(pass) orch models filters > filters combine, and no match is an empty result rather than the full list [0.01ms]
(pass) orch models --pick prints one spec > a numeric pick reads the displayed index of a single harness [0.05ms]
(pass) orch models --pick prints one spec > an exact spec pick resolves after filtering [0.02ms]
(pass) orch models --pick prints one spec > ambiguous, missing, zero, and out-of-range picks fail [0.16ms]
(pass) orch models --json > emits the pinned harness/model shape [0.04ms]

test\commands-panes.test.ts:
(pass) commands/panes > pane identity remains backend-neutral [0.03ms]
(pass) commands/panes > exports the pane listing command directly [0.01ms]

test\commands-queue.test.ts:
(pass) commands/queue > round-trips add/list/cancel on an isolated store [45.11ms]
(pass) commands/queue > renders empty queues without throwing [0.15ms]
No queue tasks.

test\commands-results.test.ts:
(pass) commands/results > validates and extracts question payloads [0.10ms]
(pass) commands/results > formats invalid and recent timestamps [0.09ms]
(pass) commands/results > routes a seeded result.json through the command module [54.40ms]
(pass) commands/results > orch tail resolves a non-pi target through that adapter's session view [60.36ms]
(pass) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [64.76ms]
(pass) commands/results > orch tail -n keeps last-N rendered entries for a pi session [69.99ms]
(pass) commands/results > orch session reports the pi entry count [66.86ms]
(pass) commands/results > orch session shows zero entries for an adapter view without them [62.63ms]

test\commands-review.test.ts:
(pass) commands/review > uses the short orch branch as review target [0.26ms]
(pass) commands/review > falls back to branch then pane [0.03ms]

test\commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.17ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [0.46ms]
(pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.17ms]

test\commands-spawn.test.ts:
(pass) commands/spawn > parses spawn flags and rejects no implicit adapter assumptions [0.21ms]
(pass) commands/spawn > each pi flavor launches its own binary and preserves raw prompt [0.06ms]

test\commands-status.test.ts:
(pass) commands/status > derives view fields from seeded presence [0.57ms]
(pass) commands/status > marks dead presence as exited [0.11ms]
(pass) commands/status > shared status row carries presence-derived fields [0.16ms]
(pass) commands/status > row carries the spawning orchestrator, null for panes orch never recorded [0.05ms]
(pass) commands/status > json branch and local table branch derive identical rows apart from host [0.05ms]
(pass) commands/status > formats workspace labels and warnings [0.05ms]

test\commands-target.test.ts:
(pass) commands/target > splits known flags and preserves positional args [0.04ms]
(pass) commands/target > extracts target and joined prompt [0.07ms]
(pass) commands/target > reads only structured result text [0.02ms]
(pass) commands/target > quotes remote args and ORCH_DIR safely [0.05ms]
(pass) commands/target > lists only live serialized identity presence entries [14.84ms]

test\config-precedence.test.ts:
(pass) config precedence > returns a defaults value when no override is set [2.89ms]
(pass) config precedence > applies defaults when config, env, and flag are absent [2.26ms]
(pass) config precedence > uses env over config and flag over env [2.87ms]
(pass) config precedence > parses notify entries and hosts into expected shapes [4.62ms]
(pass) config precedence > reports a helpful validation error for invalid config [12.34ms]

test\config-watch.test.ts:
(pass) watchConfig > loads initially and applies a valid edit after the debounce [27.44ms]
(pass) watchConfig > keeps the last-good config, warns once, and recovers [402.49ms]
(pass) watchConfig > reloads on a touched reload.signal without a settings edit [36.60ms]
(pass) watchConfig > stop prevents further callbacks [409.69ms]

test\config.test.ts:
(pass) loadConfig > refuses to invent a configuration when settings.json is missing [1.05ms]
(pass) loadConfig > requires a top-level runtime and never defaults it [3.63ms]
(pass) loadConfig > rejects an unrecognized runtime naming the accepted values [2.93ms]
(pass) loadConfig > rejects a runtime misplaced under defaults [1.90ms]
(pass) loadConfig > reads the declared runtime [1.67ms]
(pass) loadConfig > parses every supported settings section [4.84ms]
(pass) loadConfig > rejects a file without the current schemaVersion [3.05ms]
(pass) loadConfig > rejects invalid JSON loudly [1.95ms]
(pass) loadConfig > names the key path for invalid fields [1.78ms]
(pass) loadConfig > rejects unknown settings keys [1.51ms]
(pass) loadConfig > parses models.allowed as a per-harness pattern map [1.96ms]
(pass) loadConfig > rejects old settings keys [7.14ms]
(pass) loadConfig > rejects legacy notify type and unknown ids [5.81ms]
(pass) loadConfig > applies timeout defaults and disables cross-workspace writes by default [2.33ms]
(pass) loadConfig > rejects a host without dest [3.31ms]
(pass) loadConfig > rejects an unknown id in enabled.adapters [3.19ms]
(pass) loadConfig > rejects defaults.adapter not present in enabled.adapters [13.13ms]
(pass) loadConfig > rejects when settings.json is absent but a legacy config.toml exists [1.56ms]
(pass) allowedModelPatterns > restricts nothing when no config names patterns [0.54ms]
(pass) allowedModelPatterns > returns the configured patterns when set [2.70ms]
(pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or enabled entry [3.28ms]
(pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [2.76ms]
(pass) writeSettingsRuntime > a different runtime replaces the single value in place [2.38ms]
(pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [4.65ms]
(pass) reapUnreadableSettings > leaves a readable file alone [2.66ms]
(pass) writeSettingsEnabled > round-trips both provider arrays [14.41ms]
(pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [9.57ms]
(pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [4.87ms]
(pass) writeSettingsDefault > is idempotent when rewriting the same value [9.80ms]
(pass) writeSettingsDefault > refuses to write through an out-of-version settings file [2.70ms]
(pass) writeSettingsDefault > switches defaults.adapter between two enabled ids and loads clean [5.07ms]
(pass) config precedence > uses the fallback when env and settings.json omit a setting [3.36ms]
(pass) config precedence > uses the settings.json value over the fallback [4.20ms]
(pass) config precedence > uses the ORCH_* environment value over settings.json [3.39ms]
(pass) config precedence > uses an explicit flag override over the environment [0.15ms]
(pass) resolveSetting > uses flag, environment coercion, config, then fallback in precedence order [0.09ms]
(pass) resolveWithSource > reports the winning source at each precedence level [0.06ms]
(pass) models.preferred and models.allowed are independent > loadConfig parses a per-harness preferred quicklist [2.80ms]
(pass) models.preferred and models.allowed are independent > an absent preferred map normalizes to an empty map, not to allowed [2.93ms]
(pass) models.preferred and models.allowed are independent > writing one list leaves the other byte-for-value intact [12.66ms]
(pass) models.preferred and models.allowed are independent > an empty list is recorded as no list at all, so a cleared picker really clears [6.44ms]
(pass) models.preferred and models.allowed are independent > the full tree seeds both maps when absent and preserves both when present [19.55ms]
(pass) models.preferred and models.allowed are independent > the allowlist gate reads models.allowed only [3.23ms]

test\control-dispatch.test.ts:
(pass) deliverControl > steers pi through its presence inbox [18.16ms]
(pass) deliverControl > warns and succeeds when claude keys fallback delivers [48.65ms]
steer headless~local~claude-fail via claude keys fallback (degraded delivery)
(pass) deliverControl > fails when claude keys fallback cannot deliver [48.40ms]
(pass) deliverControl > fails unsupported steer and setModel capabilities [4.50ms]
(pass) deliverControl > requires presence for inbox delivery [48.61ms]
(pass) deliverControl > refuses inbox delivery to an agent whose bridge never registered [53.03ms]
(pass) deliverControl > refuses inbox delivery to an agent whose process is gone [45.73ms]

test\daemon-events.test.ts:
(pass) daemon presence events > an RPC subscriber receives a presence transition [37.73ms]
(pass) daemon presence events > a flapping status file cannot storm the stream with repeat transitions [0.30ms]
(pass) daemon presence events > a genuine repeat of the same transition for new work still publishes [0.05ms]
(pass) daemon presence events > a repeat transition publishes again once the suppression window passes [0.02ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [0.07ms]
(pass) daemon presence events > a blocked transition drives command sink delivery [52.18ms]
(pass) daemon presence events > a dead daemon closes the subscription instead of falling back to files [18.04ms]
(pass) daemon presence events > a caller-initiated stop is not reported as a disconnect [57.13ms]

test\daemon-idle.test.ts:
(pass) orchd idle shutdown rule > a zero setting disables idle shutdown entirely [0.06ms]
(pass) orchd idle shutdown rule > a live agent holds the daemon open however long it has been quiet
(pass) orchd idle shutdown rule > an event subscriber holds the daemon open
(pass) orchd idle shutdown rule > recent activity holds the daemon open below the threshold
(pass) orchd idle shutdown rule > a fully idle daemon past the threshold is due to exit

test\daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [808.81ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [494.98ms]
(pass) daemon lifecycle > reclaims an unreadable lock, which a crash truncated and no daemon owns [753.93ms]
(pass) daemon lifecycle > refuses an unreadable lock while the socket still answers [265.47ms]
(pass) daemon lifecycle > clears the lock, socket and port a departed daemon owned, keeping the log [4.20ms]
(pass) daemon lifecycle > refuses a stale lock when the socket probe cannot answer [250.53ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [251.63ms]
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.4.0+34cbb9a40)

Usage: bun <command> [...flags] [...args]

Commands:
  run       ./my-script.ts       Execute a file with Bun
            lint                 Run a package.json script
  test                           Run unit tests with Bun
  x         bun-repl             Execute a package binary (CLI), installing if needed (bunx)
  repl                           Start a REPL session with Bun
  exec                           Run a shell script directly with Bun

  install                        Install dependencies for a package.json (bun i)
  add       react                Add a dependency to package.json (bun a)
  remove    moment               Remove a dependency from package.json (bun rm)
  update    lyra                 Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
  dedupe                         Remove duplicate versions from the lockfile
  prune                          Remove packages that are not in the lockfile from node_modules
  outdated                       Display latest versions of outdated dependencies
  link      [<package>]          Register or link a local npm package
  unlink                         Unregister a local npm package
  publish                        Publish a package to the npm registry
  patch <pkg>                    Prepare a package for patching
  pm <subcommand>                Additional package management utilities
  info      @remix-run/dev       Display package metadata from the registry
  why       @evan/duckdb         Explain why a package is installed

  build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file

  init                           Start an empty Bun project from a built-in template
  create    astro                Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [69.79ms]
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [265.61ms]
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
  add       react                Add a dependency to package.json (bun a)
  remove    is-array             Remove a dependency from package.json (bun rm)
  update    lyra                 Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
  dedupe                         Remove duplicate versions from the lockfile
  prune                          Remove packages that are not in the lockfile from node_modules
  outdated                       Display latest versions of outdated dependencies
  link      [<package>]          Register or link a local npm package
  unlink                         Unregister a local npm package
  publish                        Publish a package to the npm registry
  patch <pkg>                    Prepare a package for patching
  pm <subcommand>                Additional package management utilities
  info      @remix-run/dev       Display package metadata from the registry
  why       @evan/duckdb         Explain why a package is installed

  build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file

  init                           Start an empty Bun project from a built-in template
  create    astro                Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > rejects a recycled pid identity [985.50ms]
(pass) daemon lifecycle > only a provable lock owner may be signalled [768.23ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [3.06ms]

test\daemon-rpc.test.ts:
(pass) daemon RPC > round-trips a call over the real unix socket [7.60ms]
(pass) daemon RPC > returns an error for an unknown method [5.72ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [19.59ms]
(pass) daemon RPC > delivers pushed subscription events [12.75ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [520.41ms]
(pass) daemon RPC > has a catchable absent-daemon error [0.63ms]
(pass) daemon RPC > calls a slow daemon unreachable, not absent [106.06ms]
(pass) daemon RPC > calls a refused endpoint absent so a wedged daemon is still reclaimable [1.59ms]

test\doctor-backends.test.ts:
(pass) doctor backend and presence checks > reports every registered backend and boolean capability fields [5.37ms]
(pass) doctor backend and presence checks > passes with herdr active while an enabled tmux sits outside a session [0.03ms]
(pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.03ms]
(pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [0.02ms]
(pass) doctor backend and presence checks > fails when any enabled backend is unavailable, active or not [0.01ms]
(pass) doctor backend and presence checks > honours the configured default over the probe order [0.01ms]
(pass) doctor backend and presence checks > reports only records missing the current schema stamp [3.41ms]

test\doctor-checks.test.ts:
(pass) doctor notification-sink checks > reports no sinks as healthy [66.37ms]
(pass) doctor notification-sink checks > rejects a webhook with a malformed URL [2.59ms]
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [65.33ms]
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [68.18ms]

test\doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [15.52ms]
(pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [15.22ms]
(pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [28.35ms]
(pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [14.24ms]
(pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [17.70ms]
(pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [17.03ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [11.11ms]
(pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [9.92ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [30.31ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [0.71ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [9.05ms]

test\doctor-hosts.test.ts:
(pass) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [79.86ms]
(pass) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [77.10ms]
(pass) doctor remote host checks > flags a remote orch version/schema mismatch in detail [65.96ms]
(pass) doctor remote host checks > reports no remote hosts configured as healthy [66.98ms]

test\doctor-orphan-daemons.test.ts:
(pass) doctor orphaned-daemon check > a live foreign lock is reported, and an unproven owner is never killable [23.06ms]
(pass) doctor orphaned-daemon check > a dead pid's lock is not an orphan [19.90ms]
(pass) doctor orphaned-daemon check > the caller's own orch dir is never reported against itself [18.70ms]

test\doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env node as node [2.02ms]
(pass) shebangRuntime > reads #!/usr/bin/env bun as bun [2.37ms]
(pass) shebangRuntime > reads #!/usr/bin/env deno as deno [2.09ms]
(pass) shebangRuntime > reads #!/usr/local/bin/node as node [1.66ms]
(pass) shebangRuntime > does not mistake a longer binary name for a runtime [1.34ms]
(pass) shebangRuntime > returns null for a file with no shebang [1.25ms]
(pass) shebangRuntime > returns null for an unreadable path [0.44ms]
(pass) runningRuntime > reports the runtime this suite is executing under [0.03ms]
(pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [2.70ms]
(pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [1.96ms]
(pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [2.18ms]
(pass) doctor runtime verdict table > declared node but executing under bun fails [2.53ms]
(pass) doctor runtime verdict table > declared bun but executing under node fails just as loudly [2.29ms]
(pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [2.82ms]
(pass) doctor runtime verdict table > declared runtime absent from PATH fails [2.91ms]
(pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [3.21ms]
(pass) doctor runtime verdict table > remediation names both directions ΓÇö rebuild, or re-record the declaration [3.03ms]
(pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [0.74ms]

test\doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [85.64ms]
(pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [77.56ms]
(pass) doctor stale presence safety > no dead agents leaves nothing to remove [79.41ms]

test\doctor-unscoped-tasks.test.ts:
(pass) doctor unscoped queue tasks > only scoped tasks pass [39.78ms]
(pass) doctor unscoped queue tasks > reports a null-workspace row as reappable and names it [70.22ms]
(pass) doctor unscoped queue tasks > stays report-only ΓÇö no pre-selected destructive fix [67.97ms]
(pass) doctor unscoped queue tasks > the check is wired into runDoctor [86.19ms]

test\doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [0.16ms]
(pass) runDoctor > runs on an unconfigured install without failing for want of settings.json [72.00ms]
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [75.05ms]
(pass) runDoctor > reports an absent daemon as optional [65.68ms]
(pass) runDoctor > reports and fixes a stale daemon lock [69.06ms]
(pass) runDoctor > accepts a live daemon and an answerable socket [150.11ms]
(pass) runDoctor > warns when the live daemon code hash is stale [73.94ms]
(pass) runDoctor > fails on an invalid lock and an unanswerable live socket [142.02ms]
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [2.24ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [1.80ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [3.16ms]
(pass) runDoctor > reports a dead presence pid and corrupt spawn registry lines [77.04ms]
(pass) runDoctor > bins check is driven by the enabled set and offers no fix [58.54ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [2.77ms]
(pass) runDoctor > validates configured notifier adapters [249.88ms]
notify: could not load settings.json: C:\Users\Bryan\AppData\Local\Temp\orch-doctor-H9N5Mm\settings.json: this settings file has invalid values: Γ£û Invalid input: expected number, received string ΓåÆ at queue.max_retries Fix those keys by hand, or re-record the file with: orch setup
(pass) runDoctor > reports invalid config and accepts missing config [141.65ms]
(pass) runDoctor > never throws when individual checks encounter broken inputs [154.11ms]

test\event-identity.test.ts:
(pass) published event identity > stamps a per-agent ordinal so a redelivery is recognizable [0.31ms]
(pass) the work loop is not a second presence-transition source > an agent state change publishes nothing from the queue loop [178.71ms]

test\herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [0.14ms]
(pass) herdr and notification hardening > falls back to a real name when an adapter id is blank [0.04ms]
(pass) herdr and notification hardening > nameless notifications use a workspace label, never a bare pane key [0.15ms]

test\herdr-pane-state.test.ts:
(pass) retryableErrorMessage classifier > no assistant message ΓåÆ undefined [0.08ms]
(pass) retryableErrorMessage classifier > assistant that did not stop on error ΓåÆ undefined [0.01ms]
(pass) retryableErrorMessage classifier > error stop with non-retryable text ΓåÆ undefined [0.14ms]
(pass) retryableErrorMessage classifier > error stop with retryable text ΓåÆ the message [0.02ms]
(pass) retryableErrorMessage classifier > non-string retryable errorMessage is stringified before matching [0.01ms]
(pass) retryableErrorMessage classifier > only the last assistant turn is classified [0.01ms]
(pass) createPaneStateMachine state ordering > run ΓåÆ blocked ΓåÆ unblock ΓåÆ idle debounce [5.29ms]
(pass) createPaneStateMachine state ordering > dedupes unchanged state [0.12ms]
(pass) createPaneStateMachine state ordering > retryable end holds working, then settles to blocked after grace [40.43ms]
(pass) createPaneStateMachine state ordering > duplicate end after settling does not publish a false idle [11.46ms]
(pass) createPaneStateMachine state ordering > openSession forces a publish even when state is unchanged [0.07ms]

test\identity.test.ts:
(pass) serializeIdentity / parseIdentity round-trip > round-trips herdr [0.08ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with % handle [0.01ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with : and % handle
(pass) serializeIdentity / parseIdentity round-trip > round-trips headless pid handle
(pass) serializeIdentity / parseIdentity round-trip > round-trips empty workspace
(pass) serializeIdentity / parseIdentity round-trip > round-trips separator inside parts
(pass) serializeIdentity / parseIdentity round-trip > round-trips slash inside parts
(pass) serializeIdentity / parseIdentity round-trip > round-trips percent-code-lookalike
(pass) serializeIdentity / parseIdentity round-trip > serialized key is a single flat segment (no nested path) [0.02ms]
(pass) serializeIdentity / parseIdentity round-trip > backend namespaces prevent collisions across equal workspace/handle [0.03ms]
(pass) malformed input > rejects wrong segment count [0.08ms]
(pass) malformed input > rejects empty key [0.02ms]
(pass) malformed input > rejects empty backend or id on serialize [0.03ms]
(pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.01ms]
(pass) malformed input > tryParseIdentity parses a valid key [0.01ms]

test\launch-model-gate.test.ts:
(pass) the model gate rules by harness membership, not by format > accepts a listed spec, with or without a thinking suffix [0.09ms]
(pass) the model gate rules by harness membership, not by format > refuses a ladder shorthand and names what the harness does offer [0.10ms]
(pass) the model gate rules by harness membership, not by format > accepts each harness's own vocabulary rather than one shared grammar [0.04ms]
(pass) the model gate rules by harness membership, not by format > cannot check a harness that publishes no catalogue, and does not pretend to
(pass) the settings allowlist applies on top of harness membership > an empty allowlist restricts nothing beyond the harness list [2.63ms]
(pass) the settings allowlist applies on top of harness membership > a configured allowlist refuses a listed model outside its patterns [3.96ms]
(pass) the settings allowlist applies on top of harness membership > harness membership is checked before the allowlist, so the message names the harness [1.46ms]

test\notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > skips an unavailable adapter without affecting available adapters [0.39ms]
notify: webhook notifier has invalid configuration
(pass) notifier registry and built-in adapters > reports malformed required configuration instead of throwing [0.16ms]
(pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [0.44ms]
(pass) notifier registry and built-in adapters > command adapter passes canonical JSON on stdin [26.09ms]
(pass) notifier registry and built-in adapters > desktop fallback selects notify-send, then WSL notify when it fails [5.67ms]
notify: bad sink failed
(pass) notifier registry and built-in adapters > isolates delivery failures and still delivers to other adapters [0.48ms]

test\notify-events-format.test.ts:
(pass) notification and presence event formatting > workspaceColor is stable and returns a palette hex [0.09ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.14ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.08ms]
(pass) notification and presence event formatting > webhook payload includes workspace and workspaceColor [0.39ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [0.31ms]
(pass) notification and presence event formatting > derivePresenceTransition derives workspace from identity keys [0.06ms]

test\notify-sinks.test.ts:
(pass) notify sinks > delivers command sink payload as JSON [28.16ms]
(pass) notify sinks > loadSinks parses command and webhook declarations [2.91ms]

test\notify.test.ts:
(pass) notify > parses valid sinks and applies default on states [3.55ms]
(pass) notify > delivers only to sinks whose on filter matches the event [26.48ms]
(pass) notify > command sink writes the event payload as JSON on stdin [28.30ms]
(pass) notify > titles lead with exactly one terminal state and agent [0.18ms]
(pass) notify > webhook failure is non-fatal and reports a warning [25.91ms]

test\orchd-rpc-reconnect.test.ts:
(pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [284.59ms]
(pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1024.48ms]

test\orchd-rpc-replay.test.ts:
(pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [0.08ms]
(pass) orchd RPC replay buffer > drops the oldest events and reports a replay gap [0.31ms]

test\orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [30.21ms]

test\orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [4.65ms]
(pass) orchd RPC transports > round-trips over the TCP fallback transport [14.69ms]

test\outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [74.55ms]

test\outbox.test.ts:
(pass) outbox delivery > selects pending messages and delivers each message once [46.63ms]
(pass) outbox delivery > keeps failed messages pending until their backoff expires [48.29ms]

test\owner-scoping.test.ts:
(pass) fleet ownership scoping > owner token uses ORCH_OWNER, else the write actor (selfActor) [9.68ms]
(pass) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [46.28ms]
(pass) fleet ownership scoping > headless bulk operations refuse without an owner token [85.13ms]
{"closed":["mine"],"requested":1,"ok":1,"stream":false}
(pass) fleet ownership scoping > close --all leaves foreign-owned records untouched [50.84ms]
(pass) fleet ownership scoping > explicit foreign target fails and names its owner [164.86ms]
(pass) fleet ownership scoping > result refuses a foreign-owned agent and names its owner [266.52ms]
(pass) fleet ownership scoping > pane mutations refuse a foreign-owned agent and name its owner [561.89ms]
(pass) fleet ownership scoping > --force allows an explicit foreign target [187.53ms]
(pass) a spawned agent touches only what it spawned > selfActor is the agent's own key inside a spawned agent [2.18ms]
(pass) a spawned agent touches only what it spawned > --cross-workspace from a spawned agent is refused [129.17ms]
(pass) a spawned agent touches only what it spawned > close --all sweeps only the caller's own spawns [154.95ms]
(pass) a spawned agent touches only what it spawned > --force from a spawned agent is refused outright [158.33ms]
(pass) a spawned agent touches only what it spawned > the workspace operator keeps control of an agent-owned fleet [173.65ms]

test\ownership.test.ts:
(pass) agent ownership > round-trips an owner [40.44ms]
(pass) agent ownership > allows unowned and same-owner writes [40.01ms]
(pass) agent ownership > denies foreign writes and supports stealing [45.04ms]

test\parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [0.04ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.03ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.04ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.02ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.03ms]

test\peer-identity.test.ts:
(pass) spawner identity > a bare operator with no session markers is just the operator [0.72ms]
(pass) spawner identity > a Claude Code session names itself through its env marker [0.48ms]
(pass) spawner identity > a Claude Code session exporting its session id gets a per-session key [0.45ms]
(pass) spawner identity > a harness session with presence hands out its own reply address [8.08ms]
(pass) spawner identity > an orch-spawned orchestrator is named by its own agent name and harness [52.80ms]
(pass) spawner identity > agentIdentityEnv stamps the name and falls back to the owner token as address [0.32ms]
(pass) spawner identity > worktreeEnv stamps worktree identity only for isolated agents [0.16ms]
(pass) spawner identity > the registry keeps the exact spawning session distinct from the workspace owner [47.01ms]
(pass) peer identity in messaging > orch_send reports the peer's NAME, and stamps the sender's name on the message [16.79ms]
(pass) peer identity in messaging > peers resolve by display name exactly like by key [11.11ms]
(pass) peer identity in messaging > "spawner" reaches the stamped spawner session across fleet scoping [11.97ms]
(pass) peer identity in messaging > a spawner with no inbox is refused BY NAME, not with a bare key [0.65ms]

test\peer-project-scope.test.ts:
(pass) peer discovery walls on the project > a same-workspace peer from another project is invisible by default [8.96ms]
(pass) peer discovery walls on the project > all_workspaces deliberately lifts the project wall [3.36ms]
(pass) peer discovery walls on the project > a cross-project target does not resolve for sends without the explicit flag [2.87ms]
(pass) peer discovery walls on the project > a record with no project stamp is malformed and never listed [7.14ms]
(pass) peer discovery walls on the project > a spawned agent's all_workspaces flag is ignored [3.65ms]

test\pi-model-control.test.ts:
(pass) splitThinkingSuffix > splits a valid ladder effort off the bare id [0.06ms]
(pass) splitThinkingSuffix > leaves a bare model untouched [0.01ms]
(pass) splitThinkingSuffix > keeps a trailing colon token that is not a thinking level as part of the id [0.03ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > looks up the BARE id and returns the effort suffix separately [0.24ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > retries until a still-booting registry answers [2.96ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > throws when the registry never yields the model [1.65ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > rejects a token without a provider/id shape [0.05ms]
(pass) createModelControl.applyControlCommand > applies a suffixed model command and records a success outcome [9.45ms]
(pass) createModelControl.applyControlCommand > records a failure outcome when the model is rejected [2026.55ms]
(pass) createModelControl.applyControlCommand > applies a thinking command directly [11.32ms]

test\pid-liveness.test.ts:
(pass) pidAlive liveness contract (shared by pi peers) > EPERM means the process exists under another user ΓÇö alive [0.10ms]
(pass) pidAlive liveness contract (shared by pi peers) > ESRCH means no such process ΓÇö dead [0.02ms]
(pass) pidAlive liveness contract (shared by pi peers) > the current process is alive [0.02ms]
(pass) pidAlive liveness contract (shared by pi peers) > non-positive and non-numeric pids are rejected without signalling [0.03ms]

test\presence-schema.test.ts:
(pass) presence status schema > reads a spawned namespaced identity with backend, workspace, handle, and adapter [28.99ms]
(pass) presence status schema > orch status JSON exposes the complete spawned identity fields [24.51ms]
(pass) presence status schema > status and list report the same agent identity [74.73ms]
(pass) presence status schema > mixed pi and Claude status rows carry the same identity field set [25.72ms]
(pass) presence status schema > rejects a status record that carries no schema stamp [25.15ms]
(pass) presence status schema > rejects a status record stamped with a non-current schema [28.20ms]
(pass) presence status schema > a malformed record is skipped without hiding the valid records beside it [32.64ms]
(pass) presence status schema > persists the complete spawned identity record [28.89ms]

test\queue-workspace-replay.test.ts:
(pass) queue workspace replay > persists workspace through append-only replay [41.46ms]
(pass) queue workspace replay > a malformed null-workspace row replays but is never claimable [51.86ms]
(pass) queue workspace replay > replays separate workspace values for multiple tasks [42.18ms]
(pass) queue workspace replay > selects only tasks eligible for the requested workspace [60.23ms]

test\queue.test.ts:
(pass) queue > add then list shows a queued task [33.22ms]
(pass) queue > exactly one claimer wins, including parallel attempts [42.97ms]
(pass) queue > replays done, failed, and retry transitions [50.96ms]
(pass) queue > cancels queued tasks and returns an error result for claimed tasks [40.00ms]
(pass) queue > picks queued tasks FIFO, honoring the agent constraint [38.83ms]
(pass) queue > caps retries: requeue below the cap, terminal failed at it [41.66ms]
(pass) queue > settles a claimed task to done and blocks any later claim [41.16ms]
(pass) queue > exactly one of two racing claimers wins [38.49ms]
(pass) queue > rejects an unscoped task at enqueue [35.84ms]
(pass) queue > a claim stamps the dispatch id the settle path verifies against [32.44ms]
(pass) queue > a once-claimed task is only ever offered back to its own agent [39.10ms]
(pass) queue > a bound-but-requeued task can fail terminally instead of re-binding [41.61ms]
(pass) queue > a malformed null-workspace row is skipped at claim, never dispatched [58.92ms]

test\recipient-label.test.ts:
(pass) agent identity shown to an operator > names the agent and its harness, never the transport key [0.07ms]
(pass) agent identity shown to an operator > drops the routing prefix when nothing is known about it [0.01ms]
(pass) agent identity shown to an operator > a nameless agent gets a stable logical name, not its key [0.02ms]

test\remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [73.12ms]
(pass) async remote fan-out > returns a typed dead-host failure [67.99ms]
(pass) async remote fan-out > returns a typed timeout failure [515.45ms]
(pass) async remote fan-out > returns a typed non-JSON failure [76.60ms]
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [528.43ms]

test\remote.test.ts:
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.06ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.05ms]

test\review.test.ts:
Preparing worktree (new branch 'orch/feature-1')
(pass) review plumbing > lists only done worktree agents with commits ahead [691.60ms]
Preparing worktree (new branch 'orch/iterate-1')
(pass) review plumbing > reject re-dispatches feedback through the adapter inbox [1216.58ms]
Preparing worktree (new branch 'orch/approve-1')
(pass) review plumbing > approve merges and removes the worktree and branch [987.85ms]
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
(pass) review plumbing > conflicting approval aborts without changing either branch [718.06ms]
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
(pass) review plumbing > non-fast-forward approval creates a merge commit [834.90ms]

test\routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves origin workspace selection [51.96ms]
(pass) store hardening > a fresh store creates the full current schema with WAL enabled [57.79ms]
(pass) store hardening > a steal updates ownership only when the observed owner still matches [45.21ms]
(pass) store hardening > the conditional claim is exactly once [47.10ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [176.24ms]

test\settings-command.test.ts:
(pass) orch settings > --json reports value + source per setting, settings.json winning over defaults [98.16ms]
(pass) orch settings > --json reports env as the winning source over settings.json [81.71ms]
(pass) orch settings > --harness switches defaults.adapter between enabled ids and rejects a non-enabled id [297.53ms]
(pass) orch settings > reports each harness's picker quicklist and launch gate as separate rows [86.28ms]
(pass) orch settings > a load error surfaces loudly with no partial table [77.92ms]

test\setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [5.35ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.25ms]
(pass) notifier setup logic > renders a command entry that loadConfig can parse [2.70ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.25ms]

test\setup-smoke.test.ts:
(pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [0.35ms]
(pass) runSetupSmoke (12.5) > the agent is launched on the prompt it built [0.12ms]
(pass) runSetupSmoke (12.5) > an agent that launches but yields no result times out and fails non-zero [0.15ms]
(pass) runSetupSmoke (12.5) > a rejected spawn fails loudly and never polls for a result [0.11ms]

test\setup-wizard.test.ts:
(pass) setup model picker > switches large catalogues to searchable bounded mode and preserves effort [0.20ms]
(pass) setup model picker > keeps the compact selector for small catalogues [0.05ms]
(pass) setup model list picker > large catalogues use the bounded searchable multiselect [0.13ms]
(pass) setup model list picker > the prompt names both jobs the list does, and that an empty one forbids nothing [0.05ms]
(pass) setup model list picker > stored values start checked, and clearing them returns an empty selection [0.37ms]

test\skew-guard.test.ts:
(pass) CLI daemon skew guard > refuses mutating commands and names both hashes plus the reload remedy [113.65ms]
(pass) CLI daemon skew guard > allows read-only commands while the daemon is skewed [166.13ms]
(pass) CLI daemon skew guard > --stale-ok overrides refusal for a mutating command [1219.37ms]
  warning: pi --list-models failed; pi lists no models (pi --list-models failed after 2 attempts: Executable not found in $PATH: "pi")
(pass) CLI daemon skew guard > doctor reports skew as a warning without making skew itself a failure [606.33ms]
(pass) CLI daemon skew guard > does not treat an absent daemon as skew and auto-starts a fresh daemon [1645.43ms]

test\spawn-identity.test.ts:
(pass) one key per pane spawn (12.1) > identity is an opaque minted id ΓÇö never the name, never the pane handle [71.64ms]
(pass) one key per pane spawn (12.1) > a name freed by a dead agent is reusable, and the two agents differ in identity [84.13ms]
(pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [79.76ms]

test\spawn-limits.test.ts:
(pass) spawn limits > schema loads global and workspace caps [3.54ms]
(pass) spawn limits > rejects invalid cap %s with file and key [3.44ms]
(pass) spawn limits > rejects invalid cap %s with file and key [3.28ms]
(pass) spawn limits > rejects invalid cap %s with file and key [3.31ms]
(pass) spawn limits > omitted fleet caps normalize to defaults [2.47ms]
(pass) spawn limits > global boundary refusal data counts the whole request [9.99ms]
(pass) spawn limits > one workspace may use the full global allotment [5.78ms]
(pass) spawn limits > workspace cap is independent of global headroom [4.22ms]
(pass) spawn limits > uncapped workspace is bounded only by global count [2.34ms]
(pass) spawn limits > dead pid records free capacity [2.64ms]
(pass) spawn limits > foreign panes never count [3.14ms]
(pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [97.78ms]
(pass) spawn limits > doctor accepts satisfiable limits [112.96ms]

test\spawn-names.test.ts:
(pass) spawn name numbering > starts at 1 when no agent under the prefix is live [47.74ms]
(pass) spawn name numbering > continues past the highest live index so a live fleet is grown, not collided with [55.30ms]
(pass) spawn name numbering > a dead agent frees its name and its index [48.24ms]
(pass) spawn name numbering > another workspace's fleet never affects numbering [50.95ms]
(pass) spawn name numbering > a prefix that is another prefix's head never matches it [51.05ms]

test\spawn-preferred-models.test.ts:
(pass) the preferred quicklist reaches every launch route > a pane spawn hands the exact array to the backend [63.72ms]
(pass) the preferred quicklist reaches every launch route > an unconfigured quicklist stays empty rather than becoming a default one [58.68ms]
(pass) the preferred quicklist reaches every launch route > the previewed command is the command a launch runs [0.50ms]
(pass) the preferred quicklist reaches every launch route > a headless launch forwards the quicklist into the adapter's own options [7.58ms]
(pass) orchd rules on the quicklist it is sent > accepts an absent value and an array of specs [0.20ms]
(pass) orchd rules on the quicklist it is sent > refuses a joined string or a blank entry instead of coercing it [0.18ms]

test\tiling.test.ts:
(pass) planTilePlacement > a lone pane needs no target: every backend's default split hits it [0.10ms]
(pass) planTilePlacement > first_split rules the opening split, however the screen is shaped [0.09ms]
(pass) planTilePlacement > first_split longest-edge leaves the opening split to the tab's own shape [0.09ms]
(pass) planTilePlacement > a tab with no geometry to read still opens the way first_split says [0.05ms]
(pass) planTilePlacement > past the first split, the biggest pane halves its longer side whatever first_split says [0.14ms]
(pass) planTilePlacement > the biggest pane is the target, whatever the caller's own pane is [0.05ms]
(pass) planTilePlacement > equal panes resolve top-left first, so enumeration order cannot decide [0.04ms]
(pass) planTilePlacement > four agents land in a 2x2 grid, not four columns [0.22ms]
(pass) planTilePlacement > four agents on an ultrawide screen still land in a 2x2 grid [0.04ms]
(pass) planTilePlacement > first_split rows stacks the second agent, columns seats it alongside [0.03ms]
(pass) planTilePlacement > longest-edge on an ultrawide screen is the four-thin-columns layout first_split exists to avoid [0.02ms]
(pass) planTilePlacement > the same pane count yields the same grid whatever pane order the plexer reports [0.45ms]

test\transcript.test.ts:
(pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [0.15ms]
(pass) lastAssistantFromJsonl > undefined for blank or empty input [0.03ms]
(pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.03ms]
(pass) assistantText > reads role-tagged records [0.01ms]
(pass) assistantText > reads the {type:'assistant'} envelope with a nested message [0.01ms]
(pass) assistantText > undefined for non-assistant roles
(pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.03ms]
(pass) contentText empty-string part handling > an all-empty content array yields undefined [0.02ms]
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
(fail) workspace wall ownership > keeps the wall decision primitive in one source module [7.59ms]

test\work-loop-binding.test.ts:
(pass) work loop dispatch binding > statusSpeaksForTask demands an id match whenever the bridge reports one [0.13ms]
(pass) work loop dispatch binding > a claimed task settles only from a status carrying its own dispatch id [80.72ms]
(pass) work loop dispatch binding > a claimed task whose agent died fails instead of re-binding to a new pane [56.36ms]
(pass) work loop dispatch binding > a bound retry whose agent died fails too, never reaching another agent [59.87ms]

test\work-notify.test.ts:
(pass) orch presence notifications > delivers a presence transition through a configured command sink [77.84ms]

test\worker-prompt.test.ts:
(pass) worker prompt capability composition > orch run composition selects the same header per adapter [0.07ms]
(pass) worker prompt capability composition > locked-commands clause names the commands when the list is non-empty [0.03ms]
(pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.03ms]
(pass) worker prompt capability composition > events strip both worker header variants [0.33ms]

test\worker-tools.test.ts:
(pass) worker tool policy > no configured allowlist restricts nothing [0.09ms]
(pass) worker tool policy > a configured allowlist always carries orch's own tools [0.03ms]
(pass) worker tool policy > peer tools join the allowlist when the fleet enables them [0.02ms]

test\workspace-policy.test.ts:
(pass) workspace policy > reads workspaces from serialized identity keys [0.09ms]
(pass) workspace policy > resolves workspace names through records and functions [0.06ms]
(pass) workspace policy > compares serialized keys by their workspace [0.05ms]
(pass) workspace policy > enforces the workspace wall [0.05ms]
(pass) workspace policy > scopes serialized identity keys to the current workspace [0.04ms]
(pass) workspace policy > null current workspace leaves items unscoped [0.02ms]
(pass) workspace policy > 2.7 status displays the reported workspace identity field [61.82ms]
(pass) workspace policy > 6.6 structured identity drives status and policy, not serialized key text [45.92ms]

test\workspace-walls.test.ts:
(pass) workspace helpers > extracts workspace ids only from identity keys [0.08ms]
(pass) workspace helpers > derives an entity workspace from the identity key [0.07ms]
(pass) workspace helpers > returns the same entities when all workspaces are requested [5.89ms]
(pass) workspace wall writes > allows a write within the same workspace [0.08ms]
(pass) workspace wall writes > denies a cross-workspace write with both workspaces in the reason [0.07ms]
(pass) workspace wall writes > applies the same wall rule to herdr, tmux, and headless identities [0.16ms]
(pass) workspace wall writes > allows a cross-workspace write with an explicit override [0.03ms]
(pass) workspace wall writes > allows legacy unscoped targets [0.03ms]
(pass) workspace-aware queued task selection > excludes tasks pinned to another workspace [0.08ms]
(pass) workspace-aware queued task selection > skips a malformed unscoped task in every workspace [0.03ms]
(pass) workspace-aware queued task selection > selects the earliest eligible task and respects agent constraints [0.07ms]

test\worktree.test.ts:
Preparing worktree (new branch 'orch/fixes-1')
(pass) worktree primitives > creates and lists an agent worktree on an orch branch [300.99ms]
Preparing worktree (new branch 'orch/feature')
(pass) worktree primitives > detects commits ahead of a base branch [497.68ms]
Preparing worktree (new branch 'orch/remove-me')
(pass) worktree primitives > removes an agent worktree [347.50ms]
fatal: not a git repository (or any of the parent directories): .git
(pass) worktree primitives > rejects a non-repository path with a clear error [34.01ms]

1 tests skipped:
(skip) claude-hooks shim tests need the dist bundle


1 tests failed:
(fail) workspace wall ownership > keeps the wall decision primitive in one source module [7.59ms]

 665 pass
 1 skip
 1 fail
 2397 expect() calls
Ran 667 tests across 105 files. [36.91s]
