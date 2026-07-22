bun test v1.3.14 (0d9b296a)

test\adapter-allowlist.test.ts:
(pass) pi adapter tool allowlist > declares exactly the built-ins and bridge tools [1.21ms]
(pass) pi adapter tool allowlist > restricts interactive pi launches to the allowlist and the orch bridge/HUD extensions only [0.90ms]
(pass) pi adapter tool allowlist > restricts headless pif launches to the bridge/HUD extensions and preserves the prompt [1.12ms]

test\adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [27.12ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [18.09ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [8.52ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [3.82ms]

test\adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [2.79ms]
(pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.17ms]
(pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.09ms]
(pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.16ms]

test\adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [1.09ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.23ms]
(pass) PiAdapter > reads state from the presence status through store helpers [5.44ms]
(pass) PiAdapter > appends a steer message to the presence inbox [3.86ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [3.61ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [6.04ms]

test\answer-dispatch.test.ts:
(pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [50.33ms]
(pass) answer via the control dispatcher > refuses answer when the adapter declares ask false, naming target and adapter [27.44ms]
(pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [27.54ms]
(pass) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [91.26ms]
(pass) answer over the daemon control socket > refuses a cross-workspace answer at the daemon wall [19.10ms]
(pass) answer over the daemon control socket > refuses a non-owner answer, naming the owning orchestrator [55.19ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > workspaceNames is empty ΓÇö headless has no name concept [0.34ms]
(pass) HeadlessBackend > spawns a detached process and records its handle [111.10ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [179.42ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [730.53ms]
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [626.80ms]
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [5.50ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [12.64ms]
(pass) HeadlessBackend > never signals an unrecorded pid [8.43ms]

test\backend-herdr.test.ts:
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [2.76ms]
(pass) HerdrBackend > maps close and list to herdr helpers [2.42ms]
(pass) HerdrBackend > workspaceNames maps tab labels by workspace, first label wins, unlabeled skipped [3.75ms]

test\backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [0.49ms]
(pass) TmuxBackend > reports tmux availability [387.38ms]
(pass) TmuxBackend > workspaceNames is empty ΓÇö tmux sessions have no names distinct from ids [1.10ms]
(pass) TmuxBackend > reflects the TMUX environment [1.44ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.59ms]
(pass) TmuxBackend > list() and inventory() surface only orch-spawned panes [6.28ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [7.50ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [10.56ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [1.22ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [58.93ms]
(pass) TmuxBackend > waitAgentStatus fails immediately when the pane has no presence key [0.42ms]
(pass) TmuxBackend > read returns captured text and throws when capture-pane fails [0.65ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [0.75ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [1.71ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.75ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [2.18ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [1.64ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [1.12ms]
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [34.70ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [34.21ms]
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [46.77ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [0.31ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [33.67ms]

test\broker-governance.test.ts:
(pass) daemon governWrite enforcement > unscoped actor bypasses ownership and the wall [29.13ms]
(pass) daemon governWrite enforcement > owner may write to its own agent [26.21ms]
(pass) daemon governWrite enforcement > a foreign owner in the same workspace is refused [27.46ms]
(pass) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [28.20ms]
(pass) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [26.31ms]
(pass) daemon governWrite enforcement > --steal transfers ownership to the actor [28.96ms]
(pass) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [30.52ms]

test\broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [29.36ms]
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [0.28ms]
(pass) broker ownership and workspace governance > work-loop selection stays within the origin workspace [28.61ms]

test\broker-routing.test.ts:
(pass) broker CLI routing > write refuses when the daemon socket is unavailable [5578.28ms]
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [394.17ms]
(pass) broker CLI routing > dispatch failure is daemon-absent, not herdr-not-found [5551.85ms]

test\check-bridge.test.ts:
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.20ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.80ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / config seams [0.53ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [1.04ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.35ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.08ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [1.14ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [1.41ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.32ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.48ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke-test exemption is documented and load-bearing [0.28ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has exactly one identity-branch line and it is exempted [24.14ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.29ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.04ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [2.08ms]

test\claude-adapter.test.ts:
(pass) Claude adapter > declares its identity and capabilities [0.66ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.23ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.25ms]
(pass) Claude adapter > detects state from a live presence status [4.22ms]
(pass) Claude adapter > extracts result.json before transcript and native output [4.42ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [3.63ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [275.13ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [2773.04ms]
(pass) Claude adapter > exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session) [280.17ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed ORCH_AGENT_KEY [243.34ms]

test\claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [180.25ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [923.48ms]
(pass) claude-hooks shim > under node > writes status.json for a valid key [1167.95ms]
(pass) claude-hooks shim > under deno > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [667.39ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under deno > exits 1 loudly on a present-but-malformed key [599.94ms]
(pass) claude-hooks shim > under deno > writes status.json for a valid key [2401.22ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [354.44ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [216.45ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [316.46ms]
(skip) claude-hooks shim tests need the dist bundle

test\clean-worktrees.test.ts:
Preparing worktree (new branch 'orch/empty')
Preparing worktree (new branch 'orch/merged')
Preparing worktree (new branch 'orch/unmerged')
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [9012.77ms]
Preparing worktree (new branch 'orch/discard')
fatal: 'refs/heads/orch/discard' - not a valid ref
(pass) clean worktrees > --force discards an unmerged orphan and its branch [5516.85ms]

test\cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.26ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.20ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.24ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.14ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.43ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.53ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [111.97ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [0.35ms]
(pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [130.93ms]
(pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [1.32ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [2236.91ms]
(pass) headless common path: identity key -> presence > one adapter uses opaque keys across headless and tmux backend routes [0.25ms]
(pass) headless common path: identity key -> presence > workspaceOf reads the workspace from the structured key, not a regex [0.18ms]

test\cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.19ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [80.95ms]
(pass) tmux backend registry and capabilities > exposes pane capabilities [0.23ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.21ms]
(pass) tmux backend registry and capabilities > serializes tmux identities as one flat key [0.57ms]
(pass) tmux backend registry and capabilities > rejects an empty handle without invoking tmux [0.11ms]
(pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [34.44ms]
(pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [0.24ms]
(pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [0.19ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-workspace [1.88ms]

test\close-always.test.ts:
{"closed":["pane-name","pane-key","pane-id"],"requested":3,"ok":3,"stream":false}
(pass) close always works > closes a foreign-workspace target by name, key, or pane id [66.46ms]
(pass) close always works > dead pane-less close is a successful no-op that reaps registry and presence [453.90ms]
(pass) close always works > steer remains blocked by the workspace wall [0.26ms]

test\cmd-lock-bridge.test.ts:
(pass) pi-bridge command-lock interception > wraps a matching locked command in acquireΓåÆrelease around the tool call [74.69ms]
(pass) pi-bridge command-lock interception > leaves a non-matching command untouched ΓÇö no acquire, no release [14.77ms]
(pass) pi-bridge command-lock interception > only bash tool calls are intercepted ΓÇö a non-bash tool never acquires [3.91ms]

test\cmd-lock.test.ts:
(pass) command lock > acquire and release round-trip [2.53ms]
(pass) command lock > second acquire blocks until first releases [56.36ms]
(pass) command lock > dead-pid lock is reaped [2.73ms]
(pass) command lock > release with wrong pid refuses [2.05ms]
bun test held by agent-a (pid 9936)
(pass) command lock > matches locked command prefixes and probes settings [3.82ms]
(pass) command lock > run propagates the child exit code [92.38ms]

test\codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [2.23ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [0.54ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [0.90ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [1.23ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [1.67ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [459.93ms]

test\command-workspace-fields.test.ts:
(pass) command workspace fields > status and wall entities use persisted workspace instead of serialized-key text [26.76ms]
(pass) command workspace fields > status reports a mixed pi and Claude fleet with the same identity fields [23.02ms]

test\commands-clean.test.ts:
(pass) commands/clean > reaps dead agent dirs but preserves live pids [27.99ms]

test\commands-control.test.ts:
(pass) commands/control > parses dispatch flags without losing prompt words [1.99ms]
(pass) commands/control > parses --then destination and note [0.09ms]
(pass) commands/control > adds worker header unless raw [0.21ms]

test\commands-daemon.test.ts:
(pass) commands/daemon > parses governance and validates daemon status [0.61ms]
(pass) commands/daemon > reads only a positive integer lock pid [2.58ms]

test\commands-events.test.ts:
(pass) commands/events > parses filters and scope flags [2.46ms]
(pass) commands/events > a dropped subscription names the command that recovers it [0.13ms]
(pass) commands/events > rejects malformed event and labels sinks [0.39ms]

test\commands-index.test.ts:
(pass) commands/index > does not gate help or noninteractive commands [2.67ms]
(pass) commands/index > reads a package version string [0.78ms]

test\commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [0.57ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [0.25ms]

test\commands-panes.test.ts:
(pass) commands/panes > pane identity remains backend-neutral [1.87ms]
(pass) commands/panes > exports the pane listing command directly [0.09ms]

test\commands-queue.test.ts:
(pass) commands/queue > round-trips add/list/cancel on an isolated store [27.77ms]
No queue tasks.
(pass) commands/queue > renders empty queues without throwing [0.22ms]

test\commands-results.test.ts:
(pass) commands/results > validates and extracts question payloads [3.23ms]
(pass) commands/results > formats invalid and recent timestamps [0.27ms]
(pass) commands/results > routes a seeded result.json through the command module [455.04ms]
(pass) commands/results > orch tail resolves a non-pi target through that adapter's session view [632.93ms]
(pass) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [801.37ms]
(pass) commands/results > orch tail -n keeps last-N rendered entries for a pi session [284.75ms]
(pass) commands/results > orch session reports the pi entry count [121.27ms]
(pass) commands/results > orch session shows zero entries for an adapter view without them [108.99ms]

test\commands-review.test.ts:
(pass) commands/review > uses the short orch branch as review target [1.85ms]
(pass) commands/review > falls back to branch then pane [0.06ms]

test\commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.31ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [3.55ms]
(pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.93ms]
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > a consistent selection records silently and never prompts [0.53ms]
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > no installed entrypoint leaves the selection untouched [0.25ms]
Runtime mismatch: the installed orch entrypoint (/usr/local/bin/orch) is a node build, but you selected bun.
  A bun install requires a rebuild: bun run build:dev
  recording node to match the installed entrypoint ΓÇö re-run orch setup --runtime bun after bun run build:dev to switch
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > a mismatch records nothing without confirmation ΓÇö the consistent value wins [0.29ms]
Runtime mismatch: the installed orch entrypoint (/usr/local/bin/orch) is a node build, but you selected bun.
  A bun install requires a rebuild: bun run build:dev
  recording bun ΓÇö pending rebuild; run bun run build:dev to make it real
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > a mismatch records the selection only on explicit confirmation [0.21ms]
Runtime mismatch: the installed orch entrypoint (/usr/local/bin/orch) is a node build, but you selected bun.
  A bun install requires a rebuild: bun run build:dev
  recording node to match the installed entrypoint ΓÇö re-run orch setup --runtime bun after bun run build:dev to switch
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > non-interactive never prompts and records the consistent value [0.15ms]

test\commands-spawn.test.ts:
(pass) commands/spawn > parses spawn flags and rejects no implicit adapter assumptions [0.34ms]
(pass) commands/spawn > identifies pi launchers and preserves raw prompt [0.14ms]

test\commands-status.test.ts:
(pass) commands/status > derives view fields from seeded presence [3.79ms]
(pass) commands/status > marks dead presence as exited [0.12ms]
(pass) commands/status > shared status row carries presence-derived fields [0.50ms]
(pass) commands/status > json branch and local table branch derive identical rows apart from host [0.35ms]
(pass) commands/status > formats workspace labels and warnings [0.22ms]

test\commands-target.test.ts:
(pass) commands/target > splits known flags and preserves positional args [0.16ms]
(pass) commands/target > extracts target and joined prompt [0.22ms]
(pass) commands/target > reads only structured result text [0.22ms]
(pass) commands/target > quotes remote args and ORCH_DIR safely [0.29ms]
(pass) commands/target > lists only live serialized identity presence entries [9.55ms]

test\config-precedence.test.ts:
(pass) config precedence > returns a defaults value when no override is set [5.59ms]
(pass) config precedence > applies defaults when config, env, and flag are absent [1.52ms]
(pass) config precedence > uses env over config and flag over env [2.10ms]
(pass) config precedence > parses notify entries and hosts into expected shapes [9.40ms]
(pass) config precedence > reports a helpful validation error for invalid config [2.59ms]

test\config-watch.test.ts:
(pass) watchConfig > loads initially and applies a valid edit after the debounce [51.53ms]
(pass) watchConfig > keeps the last-good config, warns once, and recovers [454.19ms]
(pass) watchConfig > reloads on a touched reload.signal without a settings edit [31.43ms]
(pass) watchConfig > stop prevents further callbacks [428.58ms]

test\config.test.ts:
(pass) loadConfig > refuses to invent a configuration when settings.json is missing [12.84ms]
(pass) loadConfig > requires a top-level runtime and never defaults it [40.66ms]
(pass) loadConfig > rejects an unrecognized runtime naming the accepted values [32.75ms]
(pass) loadConfig > rejects a runtime misplaced under defaults [31.26ms]
(pass) loadConfig > reads the declared runtime [14.40ms]
(pass) loadConfig > parses every supported settings section [19.93ms]
(pass) loadConfig > rejects a file without the current schemaVersion [19.33ms]
(pass) loadConfig > rejects invalid JSON loudly [25.73ms]
(pass) loadConfig > names the key path for invalid fields [20.04ms]
(pass) loadConfig > rejects unknown settings keys [19.68ms]
(pass) loadConfig > parses models.allowed as a string array [15.76ms]
(pass) loadConfig > rejects old settings keys [113.11ms]
(pass) loadConfig > rejects legacy notify type and unknown ids [50.57ms]
(pass) loadConfig > applies timeout defaults and disables cross-workspace writes by default [14.61ms]
(pass) loadConfig > rejects a host without dest [47.34ms]
(pass) loadConfig > rejects an unknown id in installed.adapters [37.74ms]
(pass) loadConfig > rejects defaults.adapter not present in installed.adapters [20.20ms]
(pass) loadConfig > rejects when settings.json is absent but a legacy config.toml exists [32.40ms]
(pass) allowedModelPatterns > returns the built-in defaults when config is absent [39.99ms]
(pass) allowedModelPatterns > returns the configured patterns when set [27.84ms]
(pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or installed entry [80.33ms]
(pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [47.51ms]
(pass) writeSettingsRuntime > a different runtime replaces the single value in place [67.08ms]
(pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [51.09ms]
(pass) reapUnreadableSettings > leaves a readable file alone [18.64ms]
(pass) writeSettingsInstalled > round-trips both provider arrays [51.33ms]
(pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [94.44ms]
(pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [40.72ms]
(pass) writeSettingsDefault > is idempotent when rewriting the same value [45.82ms]
(pass) writeSettingsDefault > refuses to write through an out-of-version settings file [35.40ms]
(pass) writeSettingsDefault > switches defaults.adapter between two installed ids and loads clean [23.86ms]
(pass) config precedence > uses the fallback when env and settings.json omit a setting [3.73ms]
(pass) config precedence > uses the settings.json value over the fallback [15.27ms]
(pass) config precedence > uses the ORCH_* environment value over settings.json [94.87ms]
(pass) config precedence > uses an explicit flag override over the environment [0.64ms]
(pass) resolveSetting > uses flag, environment coercion, config, then fallback in precedence order [0.79ms]
(pass) resolveWithSource > reports the winning source at each precedence level [0.68ms]

test\control-dispatch.test.ts:
(pass) deliverControl > steers pi through its presence inbox [47.68ms]
(pass) deliverControl > warns and succeeds when claude keys fallback delivers [31.87ms]
steering headless~local~claude-fail via claude keys fallback (degraded delivery)
(pass) deliverControl > fails when claude keys fallback cannot deliver [33.26ms]
(skip) deliverControl > executes codex steer command and accepts exit zero
(skip) deliverControl > treats a nonzero codex command exit as failure
(pass) deliverControl > fails unsupported steer and setModel capabilities [29.46ms]
(pass) deliverControl > requires presence for inbox delivery [23.86ms]

test\daemon-events.test.ts:
(pass) daemon presence events > an RPC subscriber receives a presence transition [58.44ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [0.28ms]
(pass) daemon presence events > a blocked transition drives command sink delivery [145.85ms]
(pass) daemon presence events > a dead daemon closes the subscription instead of falling back to files [19.33ms]
(pass) daemon presence events > a caller-initiated stop is not reported as a disconnect [177.21ms]

test\daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [5.41ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [5.51ms]
(pass) daemon lifecycle > rejects malformed locks and a socket probe that fails [5.81ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [3.64ms]
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.3.14+0d9b296af)

Usage: bun <command> [...flags] [...args]

Commands:
  run       ./my-script.ts       Execute a file with Bun
            lint                 Run a package.json script
  test                           Run unit tests with Bun
  x         nuxi                 Execute a package binary (CLI), installing if needed (bunx)
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
  create    elysia               Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [87.67ms]
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [8.18ms]
(pass) daemon lifecycle > rejects a recycled pid identity [2.27ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [2.43ms]

test\daemon-rpc.test.ts:
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
  remove    redux                Remove a dependency from package.json (bun rm)
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
  create    astro                Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon RPC > round-trips a call over the real unix socket [17.09ms]
(pass) daemon RPC > returns an error for an unknown method [17.59ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [53.02ms]
(pass) daemon RPC > delivers pushed subscription events [70.84ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [61.90ms]
(pass) daemon RPC > has a catchable absent-daemon error [3.33ms]

test\doctor-backends.test.ts:
(pass) doctor backend and presence checks > reports every registered backend and boolean capability fields [995.12ms]
(pass) doctor backend and presence checks > passes with herdr active while an installed tmux sits outside a session [0.49ms]
(pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.95ms]
(pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [1.10ms]
(pass) doctor backend and presence checks > fails when any installed backend is unavailable, active or not [0.88ms]
(pass) doctor backend and presence checks > honours the configured default over the probe order [0.53ms]
(pass) doctor backend and presence checks > reports only records missing the current schema stamp [56.34ms]

test\doctor-checks.test.ts:
(pass) doctor notification-sink checks > reports no sinks as healthy [422.23ms]
(pass) doctor notification-sink checks > rejects a webhook with a malformed URL [17.93ms]
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [319.16ms]
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [40.58ms]

test\doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [195.48ms]
(pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [147.53ms]
(pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [280.40ms]
(pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [206.69ms]
(pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [1407.14ms]
(pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [899.00ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [64.20ms]
(pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [72.93ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [141.71ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [1.63ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [1.78ms]

test\doctor-hosts.test.ts:
(pass) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [133.36ms]
(pass) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [149.60ms]
(pass) doctor remote host checks > flags a remote orch version/schema mismatch in detail [185.80ms]
(pass) doctor remote host checks > reports no remote hosts configured as healthy [713.70ms]

test\doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env node as node [34.10ms]
(pass) shebangRuntime > reads #!/usr/bin/env bun as bun [15.00ms]
(pass) shebangRuntime > reads #!/usr/bin/env deno as deno [7.37ms]
(pass) shebangRuntime > reads #!/usr/local/bin/node as node [14.67ms]
(pass) shebangRuntime > does not mistake a longer binary name for a runtime [12.04ms]
(pass) shebangRuntime > returns null for a file with no shebang [4.32ms]
(pass) shebangRuntime > returns null for an unreadable path [2.51ms]
(pass) runningRuntime > reports the runtime this suite is executing under [0.59ms]
(pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [8.86ms]
(pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [11.22ms]
(pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [18.24ms]
(pass) doctor runtime verdict table > declared node but executing under bun fails [8.71ms]
(pass) doctor runtime verdict table > declared bun but executing under node fails just as loudly [10.91ms]
(pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [5.83ms]
(pass) doctor runtime verdict table > declared runtime absent from PATH fails [8.97ms]
(pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [7.31ms]
(pass) doctor runtime verdict table > remediation names both directions ΓÇö rebuild, or re-record the declaration [9.23ms]
(pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [4.82ms]

test\doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [756.67ms]
(pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [301.82ms]
(pass) doctor stale presence safety > no dead agents leaves nothing to remove [118.36ms]

test\doctor-unscoped-tasks.test.ts:
(pass) doctor unscoped queue tasks > only scoped tasks pass [35.90ms]
(pass) doctor unscoped queue tasks > reports a null-workspace row as reappable and names it [40.73ms]
(pass) doctor unscoped queue tasks > stays report-only ΓÇö no pre-selected destructive fix [38.26ms]
(pass) doctor unscoped queue tasks > the check is wired into runDoctor [85.73ms]

test\doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [0.28ms]
(pass) runDoctor > runs on an unconfigured install without failing for want of settings.json [99.16ms]
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [75.92ms]
(pass) runDoctor > reports an absent daemon as optional [81.95ms]
(pass) runDoctor > reports and fixes a stale daemon lock [104.76ms]
(pass) runDoctor > accepts a live daemon and an answerable socket [236.77ms]
(pass) runDoctor > warns when the live daemon code hash is stale [774.83ms]
(pass) runDoctor > fails on an invalid lock and an unanswerable live socket [1262.86ms]
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [6.22ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [5.11ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [5.64ms]
(pass) runDoctor > reports a dead presence pid and corrupt spawn registry lines [81.77ms]
(pass) runDoctor > bins check is driven by the installed set and offers no fix [43.53ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [3.24ms]
(pass) runDoctor > validates configured notifier adapters [594.73ms]
notify: could not load settings.json: C:\Users\Bryan\AppData\Local\Temp\orch-doctor-1dBqZI\settings.json: this settings file has invalid values: Γ£û Invalid input: expected number, received string ΓåÆ at queue.max_retries Fix those keys by hand, or re-record the file with: orch setup
(pass) runDoctor > reports invalid config and accepts missing config [152.15ms]
(pass) runDoctor > never throws when individual checks encounter broken inputs [1011.45ms]

test\herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [23.77ms]
(pass) herdr and notification hardening > falls back to a real name when an adapter id is blank [1.74ms]
(pass) herdr and notification hardening > nameless notifications use a workspace label, never a bare pane key [3.23ms]

test\herdr-pane-state.test.ts:
(pass) retryableErrorMessage classifier > no assistant message ΓåÆ undefined [0.99ms]
(pass) retryableErrorMessage classifier > assistant that did not stop on error ΓåÆ undefined [0.22ms]
(pass) retryableErrorMessage classifier > error stop with non-retryable text ΓåÆ undefined [5.31ms]
(pass) retryableErrorMessage classifier > error stop with retryable text ΓåÆ the message [0.49ms]
(pass) retryableErrorMessage classifier > non-string retryable errorMessage is stringified before matching [0.32ms]
(pass) retryableErrorMessage classifier > only the last assistant turn is classified [0.26ms]
(pass) createPaneStateMachine state ordering > run ΓåÆ blocked ΓåÆ unblock ΓåÆ idle debounce [49.73ms]
(pass) createPaneStateMachine state ordering > dedupes unchanged state [1.01ms]
(pass) createPaneStateMachine state ordering > retryable end holds working, then settles to blocked after grace [172.81ms]
(pass) createPaneStateMachine state ordering > duplicate end after settling does not publish a false idle [165.10ms]
(pass) createPaneStateMachine state ordering > openSession forces a publish even when state is unchanged [6.30ms]

test\identity.test.ts:
(pass) serializeIdentity / parseIdentity round-trip > round-trips herdr [0.87ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with % handle [0.17ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with : and % handle [0.11ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips headless pid handle [0.21ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips empty workspace [0.06ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips separator inside parts [0.09ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips slash inside parts [0.08ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips percent-code-lookalike [0.06ms]
(pass) serializeIdentity / parseIdentity round-trip > serialized key is a single flat segment (no nested path) [0.61ms]
(pass) serializeIdentity / parseIdentity round-trip > backend namespaces prevent collisions across equal workspace/handle [0.49ms]
(pass) malformed input > rejects wrong segment count [1.15ms]
(pass) malformed input > rejects empty key [13.13ms]
(pass) malformed input > rejects empty backend or handle on serialize [1.67ms]
(pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.39ms]
(pass) malformed input > tryParseIdentity parses a valid key [0.38ms]

test\notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > skips an unavailable adapter without affecting available adapters [2.59ms]
notify: webhook notifier has invalid configuration
(pass) notifier registry and built-in adapters > reports malformed required configuration instead of throwing [2.26ms]
(pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [14.10ms]
(pass) notifier registry and built-in adapters > command adapter passes canonical JSON on stdin [517.61ms]
(pass) notifier registry and built-in adapters > desktop fallback selects notify-send, then WSL notify when it fails [7.15ms]
notify: bad sink failed
(pass) notifier registry and built-in adapters > isolates delivery failures and still delivers to other adapters [0.93ms]

test\notify-events-format.test.ts:
(pass) notification and presence event formatting > workspaceColor is stable and returns a palette hex [0.14ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.44ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.89ms]
(pass) notification and presence event formatting > webhook payload includes workspace and workspaceColor [0.73ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [1.12ms]
(pass) notification and presence event formatting > derivePresenceTransition derives workspace from identity keys [0.21ms]

test\notify-sinks.test.ts:
(pass) notify sinks > delivers command sink payload as JSON [182.14ms]
(pass) notify sinks > loadSinks parses command and webhook declarations [3.39ms]

test\notify.test.ts:
(pass) notify > parses valid sinks and applies default on states [3.75ms]
(pass) notify > delivers only to sinks whose on filter matches the event [134.38ms]
(pass) notify > command sink writes the event payload as JSON on stdin [148.44ms]
(pass) notify > titles lead with exactly one terminal state and agent [3.34ms]
(pass) notify > webhook failure is non-fatal and reports a warning [49.95ms]

test\orchd-rpc-reconnect.test.ts:
(pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [380.29ms]
(pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1243.99ms]

test\orchd-rpc-replay.test.ts:
(pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [46.48ms]
(pass) orchd RPC replay buffer > drops the oldest events and reports a replay gap [41.31ms]

test\orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [285.00ms]

test\orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [21.26ms]
(pass) orchd RPC transports > round-trips over the TCP fallback transport [38.58ms]

test\outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [62.43ms]

test\outbox.test.ts:
(pass) outbox delivery > selects pending messages and delivers each message once [35.07ms]
(pass) outbox delivery > keeps failed messages pending until their backoff expires [37.21ms]

test\owner-scoping.test.ts:
(pass) fleet ownership scoping > owner token uses ORCH_OWNER, then registered backend caller identity [0.76ms]
(pass) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [31.00ms]
(pass) fleet ownership scoping > headless bulk operations refuse without an owner token [367.26ms]
{"closed":["mine"],"requested":1,"ok":1,"stream":false}
(pass) fleet ownership scoping > close --all leaves foreign-owned records untouched [37.88ms]
(pass) fleet ownership scoping > explicit foreign target fails and names its owner [1546.78ms]
(pass) fleet ownership scoping > --force allows an explicit foreign target [1282.49ms]

test\ownership.test.ts:
(pass) agent ownership > round-trips an owner [33.27ms]
(pass) agent ownership > allows unowned and same-owner writes [37.13ms]
(pass) agent ownership > denies foreign writes and supports stealing [28.49ms]

test\parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [0.12ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.16ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.76ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.19ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.22ms]

test\pi-model-control.test.ts:
(pass) splitThinkingSuffix > splits a valid ladder effort off the bare id [0.25ms]
(pass) splitThinkingSuffix > leaves a bare model untouched [0.04ms]
(pass) splitThinkingSuffix > keeps a trailing colon token that is not a thinking level as part of the id [0.04ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > looks up the BARE id and returns the effort suffix separately [1.80ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > retries until a still-booting registry answers [29.08ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > throws when the registry never yields the model [7.57ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > rejects a model outside the allowlist before any registry lookup [2.25ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > rejects a token without a provider/id shape [1.29ms]
(pass) isAllowedModel > always allows openai-codex, applies globs to the rest [2.12ms]
(pass) createModelControl.applyControlCommand > applies a suffixed model command and records a success outcome [3.72ms]
(pass) createModelControl.applyControlCommand > records a failure outcome when the model is rejected [2.99ms]
(pass) createModelControl.applyControlCommand > applies a thinking command directly [2.49ms]

test\pid-liveness.test.ts:
(pass) pidAlive liveness contract (shared by pi peers) > EPERM means the process exists under another user ΓÇö alive [6.71ms]
(pass) pidAlive liveness contract (shared by pi peers) > ESRCH means no such process ΓÇö dead [0.07ms]
(pass) pidAlive liveness contract (shared by pi peers) > the current process is alive [0.07ms]
(pass) pidAlive liveness contract (shared by pi peers) > non-positive and non-numeric pids are rejected without signalling [0.11ms]

test\presence-schema.test.ts:
(pass) presence status schema > reads a spawned namespaced identity with backend, workspace, handle, and adapter [138.25ms]
(pass) presence status schema > orch status JSON exposes the complete spawned identity fields [129.27ms]
(pass) presence status schema > status and list report the same agent identity [769.89ms]
(pass) presence status schema > mixed pi and Claude status rows carry the same identity field set [1223.86ms]
(pass) presence status schema > rejects a status record that carries no schema stamp [269.38ms]
(pass) presence status schema > rejects a status record stamped with a non-current schema [144.97ms]
(pass) presence status schema > a malformed record is skipped without hiding the valid records beside it [147.59ms]
(pass) presence status schema > persists the complete spawned identity record [11.02ms]

test\queue-workspace-replay.test.ts:
(pass) queue workspace replay > persists workspace through append-only replay [37.48ms]
(pass) queue workspace replay > a malformed null-workspace row replays but is never claimable [45.34ms]
(pass) queue workspace replay > replays separate workspace values for multiple tasks [27.34ms]
(pass) queue workspace replay > selects only tasks eligible for the requested workspace [31.52ms]

test\queue.test.ts:
(pass) queue > add then list shows a queued task [27.61ms]
(pass) queue > exactly one claimer wins, including parallel attempts [36.53ms]
(pass) queue > replays done, failed, and retry transitions [42.37ms]
(pass) queue > cancels queued tasks and returns an error result for claimed tasks [29.72ms]
(pass) queue > picks queued tasks FIFO, honoring the agent constraint [31.63ms]
(pass) queue > caps retries: requeue below the cap, terminal failed at it [56.19ms]
(pass) queue > settles a claimed task to done and blocks any later claim [29.92ms]
(pass) queue > exactly one of two racing claimers wins [26.74ms]
(pass) queue > rejects an unscoped task at enqueue [31.69ms]
(pass) queue > a malformed null-workspace row is skipped at claim, never dispatched [35.75ms]

test\remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [1851.74ms]
(pass) async remote fan-out > returns a typed dead-host failure [224.60ms]
(pass) async remote fan-out > returns a typed timeout failure [543.22ms]
(pass) async remote fan-out > returns a typed non-JSON failure [1482.20ms]
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [902.48ms]

test\remote.test.ts:
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.18ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.21ms]

test\review.test.ts:
Preparing worktree (new branch 'orch/feature-1')
(pass) review plumbing > lists only done worktree agents with commits ahead [4037.03ms]
Preparing worktree (new branch 'orch/iterate-1')
(pass) review plumbing > reject re-dispatches feedback through the adapter inbox [5830.68ms]
Preparing worktree (new branch 'orch/approve-1')
fatal: 'refs/heads/orch/approve-1' - not a valid ref
(pass) review plumbing > approve merges and removes the worktree and branch [6348.04ms]
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
(pass) review plumbing > conflicting approval aborts without changing either branch [6254.19ms]
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
(pass) review plumbing > non-fast-forward approval creates a merge commit [6614.73ms]

test\routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves origin workspace selection [51.30ms]
(pass) store hardening > a fresh store creates the full current schema with WAL enabled [65.58ms]
(pass) store hardening > a steal updates ownership only when the observed owner still matches [71.10ms]
(pass) store hardening > the conditional claim is exactly once [69.76ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [1975.56ms]

test\settings-command.test.ts:
(pass) orch settings > --json reports value + source per setting, settings.json winning over defaults [421.45ms]
(pass) orch settings > --json reports env as the winning source over settings.json [433.10ms]
C:\Users\Bryan\AppData\Local\Temp\orch-settings-cmd-FhDZBV\settings.json: defaults.adapter: "codex" is not an installed adapter ΓÇö installed: pi, claude; re-run orch setup
(pass) orch settings > --harness switches defaults.adapter between installed ids and rejects a non-installed id [3455.12ms]
C:\Users\Bryan\AppData\Local\Temp\orch-settings-cmd-AHwSyy\config.toml: legacy config.toml detected ΓÇö settings now live in C:\Users\Bryan\AppData\Local\Temp\orch-settings-cmd-AHwSyy\settings.json; re-run orch setup (the old values are not read)
(pass) orch settings > a load error surfaces loudly with no partial table [2013.07ms]

test\setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [11.75ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.48ms]
(pass) notifier setup logic > renders a command entry that loadConfig can parse [2.25ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.67ms]

test\setup-smoke.test.ts:
(pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [1.35ms]
(pass) runSetupSmoke (12.5) > a rejected dispatch fails loudly and sets a non-zero exit code [0.48ms]
(pass) runSetupSmoke (12.5) > a dispatch that is accepted but yields no result times out and fails non-zero [0.44ms]
(pass) runSetupSmoke (12.5) > a failed spawn fails loudly before any dispatch [0.33ms]

test\skew-guard.test.ts:
(pass) CLI daemon skew guard > refuses mutating commands and names both hashes plus the reload remedy [362.12ms]
(pass) CLI daemon skew guard > allows read-only commands while the daemon is skewed [439.57ms]
(pass) CLI daemon skew guard > --stale-ok overrides refusal for a mutating command [7654.73ms]
228 | }
229 | 
230 | function connect(pathOrPort: string | number, timeoutMs: number): Promise<Socket> {
231 |   return new Promise((resolve, reject) => {
232 |     const socket = typeof pathOrPort === "string"
233 |       ? createConnection(pathOrPort)
      ^
error: connect ENOENT C:\Users\Bryan\AppData\Local\Temp\orch-skew-guard-nM4Nw0\orchd.sock
   errno: -4058,
 syscall: "connect",
    port: undefined,
 address: "C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-skew-guard-nM4Nw0\\orchd.sock",
    code: "ENOENT"

      at afterConnect (node:net:1154:39)
      at connectError (node:net:352:48)
      at doConnect (unknown:1:1)
      at kConnectPipe (node:net:367:19)
      at internalConnect (node:net:1062:93)
      at connect (node:net:634:58)
      at C:\Users\Bryan\Documents\orch\src\daemon\rpc.ts:233:9
      at new Promise (native:1:11)
      at connect (C:\Users\Bryan\Documents\orch\src\daemon\rpc.ts:344:9)
      at connectDaemon (C:\Users\Bryan\Documents\orch\src\daemon\rpc.ts:390:5)
      at C:\Users\Bryan\Documents\orch\test\skew-guard.test.ts:114:27
(fail) CLI daemon skew guard > doctor reports skew as a warning without making skew itself a failure [555.04ms]
(pass) CLI daemon skew guard > does not treat an absent daemon as skew and auto-starts a fresh daemon [3525.84ms]

test\spawn-identity.test.ts:
(pass) one key per pane spawn (12.1) > the registry row key equals the ORCH_AGENT_KEY env key, and the pane handle is a separate field [38.83ms]
(pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [34.84ms]

test\spawn-limits.test.ts:
(pass) spawn limits > schema loads global and workspace caps [2.31ms]
(pass) spawn limits > rejects invalid cap %s with file and key [2.61ms]
(pass) spawn limits > rejects invalid cap %s with file and key [2.19ms]
(pass) spawn limits > rejects invalid cap %s with file and key [2.04ms]
(pass) spawn limits > omitted fleet caps normalize to defaults [8.61ms]
(pass) spawn limits > global boundary refusal data counts the whole request [12.12ms]
(pass) spawn limits > one workspace may use the full global allotment [5.25ms]
(pass) spawn limits > workspace cap is independent of global headroom [5.77ms]
(pass) spawn limits > uncapped workspace is bounded only by global count [6.34ms]
(pass) spawn limits > dead pid records free capacity [3.26ms]
(pass) spawn limits > foreign panes never count [6.69ms]
(pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [377.76ms]
(pass) spawn limits > doctor accepts satisfiable limits [838.56ms]

test\transcript.test.ts:
(pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [3.81ms]
(pass) lastAssistantFromJsonl > undefined for blank or empty input [0.51ms]
(pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.43ms]
(pass) assistantText > reads role-tagged records [0.25ms]
(pass) assistantText > reads the {type:'assistant'} envelope with a nested message [0.23ms]
(pass) assistantText > undefined for non-assistant roles [0.26ms]
(pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.30ms]
(pass) contentText empty-string part handling > an all-empty content array yields undefined [0.25ms]
(pass) contentText empty-string part handling > a bare empty string yields undefined [0.15ms]

test\wall-single-owner.test.ts:
(pass) workspace wall ownership > keeps the wall decision primitive in one source module [866.17ms]

test\work-notify.test.ts:
(pass) orch work notifications > delivers a presence transition through a configured command sink [510.40ms]

test\worker-prompt.test.ts:
(pass) worker prompt capability composition > work loop gives codex the base header without orch_ask [48.16ms]
(pass) worker prompt capability composition > work loop gives pi the orch_ask header clause [58.66ms]
(pass) worker prompt capability composition > orch run composition selects the same header per adapter [0.29ms]
(pass) worker prompt capability composition > locked-commands clause names the commands when the list is non-empty [0.10ms]
(pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.06ms]
(pass) worker prompt capability composition > events strip both worker header variants [0.29ms]

test\worker-tools.test.ts:
(pass) worker tool policy > default spawn omits peer tools [0.22ms]
(pass) worker tool policy > explicitly disabled peer tools are omitted [0.06ms]
(pass) worker tool policy > config enables all peer tools [0.06ms]

test\workspace-policy.test.ts:
(pass) workspace policy > reads workspaces from serialized identity keys [0.33ms]
(pass) workspace policy > resolves workspace names through records and functions [0.12ms]
(pass) workspace policy > compares serialized keys by their workspace [0.08ms]
(pass) workspace policy > enforces the workspace wall [0.15ms]
(pass) workspace policy > scopes serialized identity keys to the current workspace [0.23ms]
(pass) workspace policy > null current workspace leaves items unscoped [0.07ms]
(pass) workspace policy > 2.7 status displays the reported workspace identity field [28.69ms]
(pass) workspace policy > 6.6 structured identity drives status and policy, not serialized key text [28.59ms]

test\workspace-walls.test.ts:
(pass) workspace helpers > extracts workspace ids only from identity keys [0.27ms]
(pass) workspace helpers > derives an entity workspace from the identity key [0.18ms]
(pass) workspace helpers > returns the same entities when all workspaces are requested [80.16ms]
(pass) workspace wall writes > allows a write within the same workspace [0.18ms]
(pass) workspace wall writes > denies a cross-workspace write with both workspaces in the reason [0.09ms]
(pass) workspace wall writes > applies the same wall rule to herdr, tmux, and headless identities [0.19ms]
(pass) workspace wall writes > allows a cross-workspace write with an explicit override [0.07ms]
(pass) workspace wall writes > allows legacy unscoped targets [0.07ms]
(pass) workspace-aware queued task selection > excludes tasks pinned to another workspace [0.15ms]
(pass) workspace-aware queued task selection > skips a malformed unscoped task in every workspace [0.09ms]
(pass) workspace-aware queued task selection > selects the earliest eligible task and respects agent constraints [0.10ms]

test\worktree.test.ts:
Preparing worktree (new branch 'orch/fixes-1')
(pass) worktree primitives > creates and lists an agent worktree on an orch branch [2982.09ms]
Preparing worktree (new branch 'orch/feature')
(pass) worktree primitives > detects commits ahead of a base branch [3432.06ms]
Preparing worktree (new branch 'orch/remove-me')
(pass) worktree primitives > removes an agent worktree [3403.02ms]
fatal: not a git repository (or any of the parent directories): .git
(pass) worktree primitives > rejects a non-repository path with a clear error [66.27ms]

3 tests skipped:
(skip) claude-hooks shim tests need the dist bundle
(skip) deliverControl > executes codex steer command and accepts exit zero
(skip) deliverControl > treats a nonzero codex command exit as failure


1 tests failed:
(fail) CLI daemon skew guard > doctor reports skew as a warning without making skew itself a failure [555.04ms]

 535 pass
 3 skip
 1 fail
 1987 expect() calls
Ran 539 tests across 91 files. [145.21s]
