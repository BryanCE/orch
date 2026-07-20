bun test v1.3.14 (0d9b296a)

test\adapter-allowlist.test.ts:
(pass) pi adapter tool allowlist > declares exactly the built-ins and bridge tools [0.08ms]
(pass) pi adapter tool allowlist > restricts interactive pi launches to the allowlist and the orch bridge/HUD extensions only [0.27ms]
(pass) pi adapter tool allowlist > restricts headless pif launches to the bridge/HUD extensions and preserves the prompt [0.40ms]

test\adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [8.89ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [7.40ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [4.92ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [1.77ms]

test\adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [2.92ms]
(pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.15ms]
(pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.11ms]
(pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.18ms]

test\adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.31ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.19ms]
(pass) PiAdapter > reads state from the presence status through store helpers [3.63ms]
(pass) PiAdapter > appends a steer message to the presence inbox [2.76ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [2.53ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [3.64ms]

test\answer-dispatch.test.ts:
(pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [35.48ms]
(pass) answer via the control dispatcher > refuses answer when the adapter declares ask false, naming target and adapter [22.70ms]
(pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [25.67ms]
(pass) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [62.24ms]
(pass) answer over the daemon control socket > refuses a cross-workspace answer at the daemon wall [14.46ms]
(pass) answer over the daemon control socket > refuses a non-owner answer, naming the owning orchestrator [67.22ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > workspaceNames is empty ΓÇö headless has no name concept [0.78ms]
(pass) HeadlessBackend > spawns a detached process and records its handle [85.40ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [146.36ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [119.65ms]
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [66.24ms]
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [1.87ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [2.01ms]
(pass) HeadlessBackend > never signals an unrecorded pid [1.38ms]

test\backend-herdr.test.ts:
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [0.32ms]
(pass) HerdrBackend > maps close and list to herdr helpers [0.13ms]
(pass) HerdrBackend > workspaceNames maps tab labels by workspace, first label wins, unlabeled skipped [0.14ms]

test\backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [0.17ms]
(pass) TmuxBackend > reports tmux availability [23.19ms]
(pass) TmuxBackend > workspaceNames is empty ΓÇö tmux sessions have no names distinct from ids [0.14ms]
(pass) TmuxBackend > reflects the TMUX environment [0.16ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.09ms]
(pass) TmuxBackend > list() and inventory() surface only orch-spawned panes [0.96ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.29ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [1.31ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.36ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [51.79ms]
(pass) TmuxBackend > waitAgentStatus fails immediately when the pane has no presence key [0.21ms]
(pass) TmuxBackend > read returns captured text and throws when capture-pane fails [0.19ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [0.22ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.39ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.22ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [0.70ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.22ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.33ms]
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [21.38ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [24.93ms]
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [47.86ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [0.42ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [85.46ms]

test\broker-governance.test.ts:
(pass) daemon governWrite enforcement > unscoped actor bypasses ownership and the wall [173.30ms]
(pass) daemon governWrite enforcement > owner may write to its own agent [123.26ms]
(pass) daemon governWrite enforcement > a foreign owner in the same workspace is refused [54.22ms]
(pass) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [143.80ms]
(pass) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [51.64ms]
(pass) daemon governWrite enforcement > --steal transfers ownership to the actor [62.12ms]
(pass) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [107.78ms]

test\broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [54.70ms]
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [0.31ms]
(pass) broker ownership and workspace governance > work-loop selection stays within the origin workspace [26.51ms]

test\broker-routing.test.ts:
(pass) broker CLI routing > write refuses when the daemon socket is unavailable [5509.35ms]
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [673.36ms]
(pass) broker CLI routing > dispatch failure is daemon-absent, not herdr-not-found [5531.50ms]

test\check-bridge.test.ts:
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.51ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.42ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / config seams [0.45ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [5.05ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.65ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.23ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [2.57ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [3.86ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.67ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [1.59ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke-test exemption is documented and load-bearing [0.58ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has exactly one identity-branch line and it is exempted [89.14ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.32ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.08ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [1.87ms]

test\claude-adapter.test.ts:
(pass) Claude adapter > declares its identity and capabilities [0.67ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.32ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.46ms]
(pass) Claude adapter > detects state from a live presence status [4.70ms]
(pass) Claude adapter > extracts result.json before transcript and native output [5.43ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [4.27ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [203.45ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [642.89ms]
(pass) Claude adapter > exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session) [184.14ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed ORCH_AGENT_KEY [748.25ms]

test\claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [611.66ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [338.82ms]
(pass) claude-hooks shim > under node > writes status.json for a valid key [121.05ms]
(pass) claude-hooks shim > under deno > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [263.77ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under deno > exits 1 loudly on a present-but-malformed key [204.38ms]
(pass) claude-hooks shim > under deno > writes status.json for a valid key [192.92ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [148.29ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [102.03ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [115.31ms]
(skip) claude-hooks shim tests need the dist bundle

test\clean-worktrees.test.ts:
Preparing worktree (new branch 'orch/empty')
Preparing worktree (new branch 'orch/merged')
Preparing worktree (new branch 'orch/unmerged')
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [4818.21ms]
Preparing worktree (new branch 'orch/discard')
fatal: 'refs/heads/orch/discard' - not a valid ref
(pass) clean worktrees > --force discards an unmerged orphan and its branch [2735.17ms]

test\cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.21ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.16ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.16ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.12ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.26ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.13ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [64.20ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [0.21ms]
(pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [76.60ms]
(pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [0.78ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [1097.96ms]
(pass) headless common path: identity key -> presence > one adapter uses opaque keys across headless and tmux backend routes [1.19ms]
(pass) headless common path: identity key -> presence > workspaceOf reads the workspace from the structured key, not a regex [0.58ms]

test\cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.88ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [194.44ms]
(pass) tmux backend registry and capabilities > exposes pane capabilities [0.51ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.53ms]
(pass) tmux backend registry and capabilities > serializes tmux identities as one flat key [0.67ms]
(pass) tmux backend registry and capabilities > rejects an empty handle without invoking tmux [0.25ms]
(pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [124.01ms]
(pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [1.32ms]
(pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [1.15ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-workspace [1.86ms]

test\close-always.test.ts:
{"closed":["pane-name","pane-key","pane-id"],"requested":3,"ok":3,"stream":false}
(pass) close always works > closes a foreign-workspace target by name, key, or pane id [82.12ms]
(pass) close always works > dead pane-less close is a successful no-op that reaps registry and presence [289.92ms]
(pass) close always works > steer remains blocked by the workspace wall [0.23ms]

test\cmd-lock-bridge.test.ts:
(pass) pi-bridge command-lock interception > wraps a matching locked command in acquireΓåÆrelease around the tool call [4.65ms]
(pass) pi-bridge command-lock interception > leaves a non-matching command untouched ΓÇö no acquire, no release [0.77ms]
(pass) pi-bridge command-lock interception > only bash tool calls are intercepted ΓÇö a non-bash tool never acquires [0.45ms]

test\cmd-lock.test.ts:
(pass) command lock > acquire and release round-trip [5.61ms]
(pass) command lock > second acquire blocks until first releases [60.92ms]
(pass) command lock > dead-pid lock is reaped [6.95ms]
(pass) command lock > release with wrong pid refuses [5.57ms]
bun test held by agent-a (pid 16772)
(pass) command lock > matches locked command prefixes and probes settings [14.27ms]
(pass) command lock > run propagates the child exit code [83.80ms]

test\codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [1.65ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [0.35ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [0.56ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [0.72ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [0.72ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [270.50ms]

test\command-workspace-fields.test.ts:
(pass) command workspace fields > status and wall entities use persisted workspace instead of serialized-key text [24.40ms]
(pass) command workspace fields > status reports a mixed pi and Claude fleet with the same identity fields [20.55ms]

test\commands-clean.test.ts:
(pass) commands/clean > reaps dead agent dirs but preserves live pids [5.94ms]

test\commands-control.test.ts:
(pass) commands/control > parses dispatch flags without losing prompt words [2.14ms]
(pass) commands/control > parses --then destination and note [0.06ms]
(pass) commands/control > adds worker header unless raw [0.15ms]

test\commands-daemon.test.ts:
(pass) commands/daemon > parses governance and validates daemon status [0.20ms]
(pass) commands/daemon > reads only a positive integer lock pid [2.07ms]

test\commands-events.test.ts:
(pass) commands/events > parses filters and scope flags [1.92ms]
(pass) commands/events > a dropped subscription names the command that recovers it [0.06ms]
(pass) commands/events > rejects malformed event and labels sinks [0.16ms]

test\commands-index.test.ts:
(pass) commands/index > does not gate help or noninteractive commands [2.03ms]
(pass) commands/index > reads a package version string [0.47ms]

test\commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [0.54ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [0.27ms]

test\commands-panes.test.ts:
(pass) commands/panes > pane identity remains backend-neutral [1.83ms]
(pass) commands/panes > exports the pane listing command directly [0.10ms]

test\commands-queue.test.ts:
(pass) commands/queue > round-trips add/list/cancel on an isolated store [25.99ms]
No queue tasks.
(pass) commands/queue > renders empty queues without throwing [0.18ms]

test\commands-results.test.ts:
(pass) commands/results > validates and extracts question payloads [2.23ms]
(pass) commands/results > formats invalid and recent timestamps [0.15ms]
(pass) commands/results > routes a seeded result.json through the command module [69.28ms]
(pass) commands/results > orch tail resolves a non-pi target through that adapter's session view [66.69ms]
(pass) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [89.74ms]
(pass) commands/results > orch tail -n keeps last-N rendered entries for a pi session [63.28ms]
(pass) commands/results > orch session reports the pi entry count [63.89ms]
(pass) commands/results > orch session shows zero entries for an adapter view without them [102.93ms]

test\commands-review.test.ts:
(pass) commands/review > uses the short orch branch as review target [1.50ms]
(pass) commands/review > falls back to branch then pane [0.04ms]

test\commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.17ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [0.51ms]
(pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.21ms]
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > a consistent selection records silently and never prompts [0.28ms]
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > no installed entrypoint leaves the selection untouched [0.10ms]
Runtime mismatch: the installed orch entrypoint (/usr/local/bin/orch) is a node build, but you selected bun.
  A bun install requires a rebuild: bun run build:dev
  recording node to match the installed entrypoint ΓÇö re-run orch setup --runtime bun after bun run build:dev to switch
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > a mismatch records nothing without confirmation ΓÇö the consistent value wins [0.12ms]
Runtime mismatch: the installed orch entrypoint (/usr/local/bin/orch) is a node build, but you selected bun.
  A bun install requires a rebuild: bun run build:dev
  recording bun ΓÇö pending rebuild; run bun run build:dev to make it real
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > a mismatch records the selection only on explicit confirmation [0.14ms]
Runtime mismatch: the installed orch entrypoint (/usr/local/bin/orch) is a node build, but you selected bun.
  A bun install requires a rebuild: bun run build:dev
  recording node to match the installed entrypoint ΓÇö re-run orch setup --runtime bun after bun run build:dev to switch
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > non-interactive never prompts and records the consistent value [0.13ms]

test\commands-spawn.test.ts:
(pass) commands/spawn > parses spawn flags and rejects no implicit adapter assumptions [0.21ms]
(pass) commands/spawn > identifies pi launchers and preserves raw prompt [0.09ms]

test\commands-status.test.ts:
(pass) commands/status > derives view fields from seeded presence [0.78ms]
(pass) commands/status > marks dead presence as exited [0.09ms]
(pass) commands/status > shared status row carries presence-derived fields [0.35ms]
(pass) commands/status > json branch and local table branch derive identical rows apart from host [0.13ms]
(pass) commands/status > formats workspace labels and warnings [0.15ms]

test\commands-target.test.ts:
(pass) commands/target > splits known flags and preserves positional args [2.54ms]
(pass) commands/target > extracts target and joined prompt [0.25ms]
(pass) commands/target > reads only structured result text [0.05ms]
(pass) commands/target > quotes remote args and ORCH_DIR safely [0.14ms]
(pass) commands/target > lists only live serialized identity presence entries [5.84ms]

test\config-precedence.test.ts:
(pass) config precedence > returns a defaults value when no override is set [3.82ms]
(pass) config precedence > applies defaults when config, env, and flag are absent [1.37ms]
(pass) config precedence > uses env over config and flag over env [1.82ms]
(pass) config precedence > parses notify entries and hosts into expected shapes [4.24ms]
(pass) config precedence > reports a helpful validation error for invalid config [2.00ms]

test\config-watch.test.ts:
(pass) watchConfig > loads initially and applies a valid edit after the debounce [45.54ms]
(pass) watchConfig > keeps the last-good config, warns once, and recovers [463.26ms]
(pass) watchConfig > reloads on a touched reload.signal without a settings edit [82.35ms]
(pass) watchConfig > stop prevents further callbacks [429.35ms]

test\config.test.ts:
(pass) loadConfig > refuses to invent a configuration when settings.json is missing [7.43ms]
(pass) loadConfig > requires a top-level runtime and never defaults it [11.29ms]
(pass) loadConfig > rejects an unrecognized runtime naming the accepted values [8.47ms]
(pass) loadConfig > rejects a runtime misplaced under defaults [5.40ms]
(pass) loadConfig > reads the declared runtime [4.62ms]
(pass) loadConfig > parses every supported settings section [19.63ms]
(pass) loadConfig > rejects a file without the current schemaVersion [12.22ms]
(pass) loadConfig > rejects invalid JSON loudly [7.05ms]
(pass) loadConfig > names the key path for invalid fields [10.63ms]
(pass) loadConfig > rejects unknown settings keys [4.97ms]
(pass) loadConfig > parses models.allowed as a string array [5.32ms]
(pass) loadConfig > rejects old settings keys [33.61ms]
(pass) loadConfig > rejects legacy notify type and unknown ids [16.48ms]
(pass) loadConfig > applies timeout defaults and disables cross-workspace writes by default [5.95ms]
(pass) loadConfig > rejects a host without dest [6.26ms]
(pass) loadConfig > rejects an unknown id in installed.adapters [7.18ms]
(pass) loadConfig > rejects defaults.adapter not present in installed.adapters [10.67ms]
(pass) loadConfig > rejects when settings.json is absent but a legacy config.toml exists [9.85ms]
(pass) allowedModelPatterns > returns the built-in defaults when config is absent [4.63ms]
(pass) allowedModelPatterns > returns the configured patterns when set [9.15ms]
(pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or installed entry [15.51ms]
(pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [22.87ms]
(pass) writeSettingsRuntime > a different runtime replaces the single value in place [20.17ms]
(pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [21.59ms]
(pass) reapUnreadableSettings > leaves a readable file alone [9.27ms]
(pass) writeSettingsInstalled > round-trips both provider arrays [21.03ms]
(pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [22.33ms]
(pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [16.84ms]
(pass) writeSettingsDefault > is idempotent when rewriting the same value [30.55ms]
(pass) writeSettingsDefault > refuses to write through an out-of-version settings file [11.57ms]
(pass) writeSettingsDefault > switches defaults.adapter between two installed ids and loads clean [19.81ms]
(pass) config precedence > uses the fallback when env and settings.json omit a setting [22.93ms]
(pass) config precedence > uses the settings.json value over the fallback [11.86ms]
(pass) config precedence > uses the ORCH_* environment value over settings.json [6.70ms]
(pass) config precedence > uses an explicit flag override over the environment [1.51ms]
(pass) resolveSetting > uses flag, environment coercion, config, then fallback in precedence order [2.55ms]
(pass) resolveWithSource > reports the winning source at each precedence level [2.75ms]

test\control-dispatch.test.ts:
(pass) deliverControl > steers pi through its presence inbox [98.00ms]
(pass) deliverControl > warns and succeeds when claude keys fallback delivers [39.10ms]
steering headless~local~claude-fail via claude keys fallback (degraded delivery)
(pass) deliverControl > fails when claude keys fallback cannot deliver [25.75ms]
(skip) deliverControl > executes codex steer command and accepts exit zero
(skip) deliverControl > treats a nonzero codex command exit as failure
(pass) deliverControl > fails unsupported steer and setModel capabilities [25.29ms]
(pass) deliverControl > requires presence for inbox delivery [21.70ms]

test\daemon-events.test.ts:
(pass) daemon presence events > an RPC subscriber receives a presence transition [49.05ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [0.23ms]
(pass) daemon presence events > a blocked transition drives command sink delivery [78.49ms]
(pass) daemon presence events > a dead daemon closes the subscription instead of falling back to files [29.76ms]
(pass) daemon presence events > a caller-initiated stop is not reported as a disconnect [94.09ms]

test\daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [6.36ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [5.36ms]
(pass) daemon lifecycle > rejects malformed locks and a socket probe that fails [6.53ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [2.80ms]
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
  add       zod                  Add a dependency to package.json (bun a)
  remove    webpack              Remove a dependency from package.json (bun rm)
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
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [89.20ms]
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [7.36ms]
(pass) daemon lifecycle > rejects a recycled pid identity [2.25ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [2.26ms]

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
  add       lyra                 Add a dependency to package.json (bun a)
  remove    underscore           Remove a dependency from package.json (bun rm)
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
(pass) daemon RPC > round-trips a call over the real unix socket [11.02ms]
(pass) daemon RPC > returns an error for an unknown method [10.44ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [39.93ms]
(pass) daemon RPC > delivers pushed subscription events [31.00ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [37.61ms]
(pass) daemon RPC > has a catchable absent-daemon error [2.70ms]

test\doctor-backends.test.ts:
(pass) doctor backend and presence checks > reports every registered backend and boolean capability fields [65.21ms]
(pass) doctor backend and presence checks > passes with herdr active while an installed tmux sits outside a session [0.10ms]
(pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.11ms]
(pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [0.11ms]
(pass) doctor backend and presence checks > fails when any installed backend is unavailable, active or not [0.07ms]
(pass) doctor backend and presence checks > honours the configured default over the probe order [0.08ms]
(pass) doctor backend and presence checks > reports only records missing the current schema stamp [4.52ms]

test\doctor-checks.test.ts:
(pass) doctor notification-sink checks > reports no sinks as healthy [33.55ms]
(pass) doctor notification-sink checks > rejects a webhook with a malformed URL [2.94ms]
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [35.34ms]
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [29.70ms]

test\doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [75.18ms]
(pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [57.33ms]
(pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [191.32ms]
(pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [98.91ms]
(pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [95.57ms]
(pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [71.81ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [32.71ms]
(pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [36.00ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [200.23ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [7.80ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [6.53ms]

test\doctor-hosts.test.ts:
(pass) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [572.85ms]
(pass) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [518.27ms]
(pass) doctor remote host checks > flags a remote orch version/schema mismatch in detail [266.67ms]
(pass) doctor remote host checks > reports no remote hosts configured as healthy [61.40ms]

test\doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env node as node [1.74ms]
(pass) shebangRuntime > reads #!/usr/bin/env bun as bun [1.79ms]
(pass) shebangRuntime > reads #!/usr/bin/env deno as deno [1.43ms]
(pass) shebangRuntime > reads #!/usr/local/bin/node as node [1.81ms]
(pass) shebangRuntime > does not mistake a longer binary name for a runtime [1.65ms]
(pass) shebangRuntime > returns null for a file with no shebang [1.28ms]
(pass) shebangRuntime > returns null for an unreadable path [1.16ms]
(pass) runningRuntime > reports the runtime this suite is executing under [0.13ms]
(pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [1.96ms]
(pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [1.82ms]
(pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [1.85ms]
(pass) doctor runtime verdict table > declared node but executing under bun fails [1.89ms]
(pass) doctor runtime verdict table > declared bun but executing under node fails just as loudly [1.96ms]
(pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [2.24ms]
(pass) doctor runtime verdict table > declared runtime absent from PATH fails [2.18ms]
(pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [1.85ms]
(pass) doctor runtime verdict table > remediation names both directions ΓÇö rebuild, or re-record the declaration [1.98ms]
(pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [1.18ms]

test\doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [73.13ms]
(pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [67.48ms]
(pass) doctor stale presence safety > no dead agents leaves nothing to remove [61.73ms]

test\doctor-unscoped-tasks.test.ts:
(pass) doctor unscoped queue tasks > only scoped tasks pass [23.06ms]
(pass) doctor unscoped queue tasks > reports a null-workspace row as reappable and names it [26.87ms]
(pass) doctor unscoped queue tasks > stays report-only ΓÇö no pre-selected destructive fix [25.36ms]
(pass) doctor unscoped queue tasks > the check is wired into runDoctor [67.66ms]

test\doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [2.37ms]
(pass) runDoctor > runs on an unconfigured install without failing for want of settings.json [55.57ms]
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [44.29ms]
(pass) runDoctor > reports an absent daemon as optional [41.58ms]
(pass) runDoctor > reports and fixes a stale daemon lock [45.43ms]
(pass) runDoctor > accepts a live daemon and an answerable socket [106.82ms]
(pass) runDoctor > warns when the live daemon code hash is stale [47.77ms]
(pass) runDoctor > fails on an invalid lock and an unanswerable live socket [110.83ms]
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [2.50ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [3.38ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [3.26ms]
(pass) runDoctor > reports a dead presence pid and corrupt spawn registry lines [83.47ms]
(pass) runDoctor > bins check is driven by the installed set and offers no fix [27.72ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [1.65ms]
(pass) runDoctor > validates configured notifier adapters [299.37ms]
notify: could not load settings.json: C:\Users\Bryan\AppData\Local\Temp\orch-doctor-UtEivn\settings.json: this settings file has invalid values: Γ£û Invalid input: expected number, received string ΓåÆ at queue.max_retries Fix those keys by hand, or re-record the file with: orch setup
(pass) runDoctor > reports invalid config and accepts missing config [214.93ms]
(pass) runDoctor > never throws when individual checks encounter broken inputs [449.00ms]

test\herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [0.76ms]
(pass) herdr and notification hardening > falls back to a real name when an adapter id is blank [0.31ms]
(pass) herdr and notification hardening > nameless notifications use a workspace label, never a bare pane key [0.83ms]

test\herdr-pane-state.test.ts:
(pass) retryableErrorMessage classifier > no assistant message ΓåÆ undefined [1.25ms]
(pass) retryableErrorMessage classifier > assistant that did not stop on error ΓåÆ undefined [0.28ms]
(pass) retryableErrorMessage classifier > error stop with non-retryable text ΓåÆ undefined [1.50ms]
(pass) retryableErrorMessage classifier > error stop with retryable text ΓåÆ the message [0.35ms]
(pass) retryableErrorMessage classifier > non-string retryable errorMessage is stringified before matching [0.29ms]
(pass) retryableErrorMessage classifier > only the last assistant turn is classified [0.22ms]
(pass) createPaneStateMachine state ordering > run ΓåÆ blocked ΓåÆ unblock ΓåÆ idle debounce [23.41ms]
(pass) createPaneStateMachine state ordering > dedupes unchanged state [0.35ms]
(pass) createPaneStateMachine state ordering > retryable end holds working, then settles to blocked after grace [62.23ms]
(pass) createPaneStateMachine state ordering > duplicate end after settling does not publish a false idle [48.05ms]
(pass) createPaneStateMachine state ordering > openSession forces a publish even when state is unchanged [8.23ms]

test\identity.test.ts:
(pass) serializeIdentity / parseIdentity round-trip > round-trips herdr [0.35ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with % handle [0.12ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with : and % handle [0.10ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips headless pid handle [0.08ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips empty workspace [0.14ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips separator inside parts [0.11ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips slash inside parts [0.11ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips percent-code-lookalike [0.12ms]
(pass) serializeIdentity / parseIdentity round-trip > serialized key is a single flat segment (no nested path) [0.47ms]
(pass) serializeIdentity / parseIdentity round-trip > backend namespaces prevent collisions across equal workspace/handle [0.57ms]
(pass) malformed input > rejects wrong segment count [0.79ms]
(pass) malformed input > rejects empty key [0.39ms]
(pass) malformed input > rejects empty backend or handle on serialize [0.74ms]
(pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.28ms]
(pass) malformed input > tryParseIdentity parses a valid key [0.22ms]

test\notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > skips an unavailable adapter without affecting available adapters [2.99ms]
notify: webhook notifier has invalid configuration
(pass) notifier registry and built-in adapters > reports malformed required configuration instead of throwing [1.41ms]
(pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [3.33ms]
(pass) notifier registry and built-in adapters > command adapter passes canonical JSON on stdin [431.01ms]
(pass) notifier registry and built-in adapters > desktop fallback selects notify-send, then WSL notify when it fails [30.17ms]
notify: bad sink failed
(pass) notifier registry and built-in adapters > isolates delivery failures and still delivers to other adapters [3.13ms]

test\notify-events-format.test.ts:
(pass) notification and presence event formatting > workspaceColor is stable and returns a palette hex [0.41ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [1.56ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [1.42ms]
(pass) notification and presence event formatting > webhook payload includes workspace and workspaceColor [4.04ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [3.71ms]
(pass) notification and presence event formatting > derivePresenceTransition derives workspace from identity keys [1.04ms]

test\notify-sinks.test.ts:
(pass) notify sinks > delivers command sink payload as JSON [196.14ms]
62 |         { id: "command", on: ["done"], command: nodeCommand("") },
63 |         { id: "webhook", on: ["error"], url: "https://example.test/notify" },
64 |       ],
65 |     });
66 | 
67 |     expect(loadSinks(directory)).toEqual([
                                      ^
error: expect(received).toEqual(expected)

  [
    {
      "command": [
        "C:\Users\Bryan\.bun\bin\bun.exe",
        "-e",
        "",
      ],
      "on": [
        "done",
      ],
+     "timeoutMs": 3000,
      "type": "command",
    },
    {
      "on": [
        "error",
      ],
+     "timeoutMs": 3000,
      "type": "webhook",
      "url": "https://example.test/notify",
    },
  ]

- Expected  - 0
+ Received  + 2

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\notify-sinks.test.ts:67:34)
(fail) notify sinks > loadSinks parses command and webhook declarations [2.86ms]

test\notify.test.ts:
60 |       ],
61 |     });
62 | 
63 |     const result = captureStderr(() => loadSinks(directory));
64 | 
65 |     expect(result.value).toEqual([
                              ^
error: expect(received).toEqual(expected)

  [
    {
      "on": [
        "blocked",
        "error",
      ],
      "type": "desktop",
    },
    {
      "on": [
        "done",
        "error",
      ],
+     "timeoutMs": 3000,
      "type": "webhook",
      "url": "https://example.test/hook",
    },
    {
      "command": [
        "C:\Users\Bryan\.bun\bin\bun.exe",
        "-e",
        "",
      ],
      "on": [
        "blocked",
        "error",
      ],
+     "timeoutMs": 3000,
      "type": "command",
    },
    {
      "on": [
        "done",
      ],
+     "timeoutMs": 3000,
      "type": "herdr",
    },
  ]

- Expected  - 0
+ Received  + 3

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\notify.test.ts:65:26)
(fail) notify > parses valid sinks and applies default on states [2.49ms]
(pass) notify > delivers only to sinks whose on filter matches the event [63.95ms]
(pass) notify > command sink writes the event payload as JSON on stdin [67.79ms]
(pass) notify > titles lead with exactly one terminal state and agent [0.26ms]
(pass) notify > webhook failure is non-fatal and reports a warning [26.25ms]

test\orchd-rpc-reconnect.test.ts:
(pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [353.54ms]
(pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1061.60ms]

test\orchd-rpc-replay.test.ts:
(pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [0.27ms]
(pass) orchd RPC replay buffer > drops the oldest events and reports a replay gap [1.59ms]

test\orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [49.00ms]

test\orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [23.80ms]
(pass) orchd RPC transports > round-trips over the TCP fallback transport [49.34ms]

test\outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [40.21ms]

test\outbox.test.ts:
(pass) outbox delivery > selects pending messages and delivers each message once [30.42ms]
(pass) outbox delivery > keeps failed messages pending until their backoff expires [28.34ms]

test\owner-scoping.test.ts:
(pass) fleet ownership scoping > owner token uses ORCH_OWNER, then registered backend caller identity [1.95ms]
(pass) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [27.47ms]
(pass) fleet ownership scoping > headless bulk operations refuse without an owner token [199.33ms]
108 |     recordSpawned("headless~local~mine", { backend: "headless", handle: "mine", owner: "caller" });
109 |     recordSpawned("headless~local~foreign", { backend: "headless", handle: "foreign", owner: "other" });
110 | 
111 |     const closed: string[] = [];
112 |     const backend = headlessBackend as Backend & { inventory: () => { handle: string }[] };
113 |     const originalInventory = backend.inventory.bind(backend);
                                            ^
TypeError: undefined is not an object (evaluating 'backend.inventory.bind')
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\owner-scoping.test.ts:113:39)
(fail) fleet ownership scoping > close --all leaves foreign-owned records untouched [26.50ms]
(pass) fleet ownership scoping > explicit foreign target fails and names its owner [313.87ms]
(pass) fleet ownership scoping > --force allows an explicit foreign target [301.37ms]

test\ownership.test.ts:
(pass) agent ownership > round-trips an owner [24.71ms]
(pass) agent ownership > allows unowned and same-owner writes [27.37ms]
(pass) agent ownership > denies foreign writes and supports stealing [33.02ms]

test\parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [3.86ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.20ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.24ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.26ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.18ms]

test\pi-model-control.test.ts:
(pass) splitThinkingSuffix > splits a valid ladder effort off the bare id [0.45ms]
(pass) splitThinkingSuffix > leaves a bare model untouched [0.11ms]
(pass) splitThinkingSuffix > keeps a trailing colon token that is not a thinking level as part of the id [0.08ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > looks up the BARE id and returns the effort suffix separately [3.34ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > retries until a still-booting registry answers [20.87ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > throws when the registry never yields the model [6.92ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > rejects a model outside the allowlist before any registry lookup [2.97ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > rejects a token without a provider/id shape [1.72ms]
(pass) isAllowedModel > always allows openai-codex, applies globs to the rest [2.54ms]
(pass) createModelControl.applyControlCommand > applies a suffixed model command and records a success outcome [6.82ms]
(pass) createModelControl.applyControlCommand > records a failure outcome when the model is rejected [6.07ms]
(pass) createModelControl.applyControlCommand > applies a thinking command directly [5.39ms]

test\pid-liveness.test.ts:
(pass) pidAlive liveness contract (shared by pi peers) > EPERM means the process exists under another user ΓÇö alive [4.90ms]
(pass) pidAlive liveness contract (shared by pi peers) > ESRCH means no such process ΓÇö dead [0.11ms]
(pass) pidAlive liveness contract (shared by pi peers) > the current process is alive [0.21ms]
(pass) pidAlive liveness contract (shared by pi peers) > non-positive and non-numeric pids are rejected without signalling [0.28ms]

test\presence-schema.test.ts:
(pass) presence status schema > reads a spawned namespaced identity with backend, workspace, handle, and adapter [101.94ms]
(pass) presence status schema > orch status JSON exposes the complete spawned identity fields [80.79ms]
(pass) presence status schema > status and list report the same agent identity [96.77ms]
(pass) presence status schema > mixed pi and Claude status rows carry the same identity field set [78.66ms]
(pass) presence status schema > rejects a status record that carries no schema stamp [75.48ms]
(pass) presence status schema > rejects a status record stamped with a non-current schema [81.12ms]
(pass) presence status schema > a malformed record is skipped without hiding the valid records beside it [102.34ms]
(pass) presence status schema > persists the complete spawned identity record [89.71ms]

test\queue-workspace-replay.test.ts:
(pass) queue workspace replay > persists workspace through append-only replay [22.19ms]
(pass) queue workspace replay > a malformed null-workspace row replays but is never claimable [21.88ms]
(pass) queue workspace replay > replays separate workspace values for multiple tasks [21.80ms]
(pass) queue workspace replay > selects only tasks eligible for the requested workspace [24.40ms]

test\queue.test.ts:
(pass) queue > add then list shows a queued task [21.79ms]
(pass) queue > exactly one claimer wins, including parallel attempts [38.49ms]
(pass) queue > replays done, failed, and retry transitions [35.73ms]
(pass) queue > cancels queued tasks and returns an error result for claimed tasks [25.26ms]
(pass) queue > picks queued tasks FIFO, honoring the agent constraint [23.68ms]
(pass) queue > caps retries: requeue below the cap, terminal failed at it [25.93ms]
(pass) queue > settles a claimed task to done and blocks any later claim [23.72ms]
(pass) queue > exactly one of two racing claimers wins [35.95ms]
(pass) queue > rejects an unscoped task at enqueue [37.16ms]
(pass) queue > a malformed null-workspace row is skipped at claim, never dispatched [40.43ms]

test\remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [1017.48ms]
(pass) async remote fan-out > returns a typed dead-host failure [246.22ms]
(pass) async remote fan-out > returns a typed timeout failure [539.53ms]
(pass) async remote fan-out > returns a typed non-JSON failure [990.43ms]
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [1152.87ms]

test\remote.test.ts:
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.17ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.12ms]

test\review.test.ts:
Preparing worktree (new branch 'orch/feature-1')
(pass) review plumbing > lists only done worktree agents with commits ahead [2806.22ms]
Preparing worktree (new branch 'orch/iterate-1')
(pass) review plumbing > reject re-dispatches feedback through the adapter inbox [3678.58ms]
Preparing worktree (new branch 'orch/approve-1')
fatal: 'refs/heads/orch/approve-1' - not a valid ref
(pass) review plumbing > approve merges and removes the worktree and branch [2710.09ms]
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
(pass) review plumbing > conflicting approval aborts without changing either branch [2620.73ms]
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
(pass) review plumbing > non-fast-forward approval creates a merge commit [2597.03ms]

test\routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves origin workspace selection [46.94ms]
(pass) store hardening > a fresh store creates the full current schema with WAL enabled [57.80ms]
(pass) store hardening > a steal updates ownership only when the observed owner still matches [60.74ms]
(pass) store hardening > the conditional claim is exactly once [67.32ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [1267.79ms]

test\settings-command.test.ts:
52 | 
53 |     const report = JSON.parse(runSettings(directory, {}, "--json")) as Record<string, { value: unknown; source: string }>;
54 |     expect(report.adapter).toEqual({ value: "pi", source: "settings.json" });
55 |     expect(report.backend).toEqual({ value: "headless", source: "settings.json" });
56 |     expect(report.model!.source).toBe("default");
57 |     expect(report.spawn_cap).toEqual({ value: 8, source: "default" });
                                  ^
error: expect(received).toEqual(expected)

- {
-   "source": "default",
-   "value": 8,
- }
+ undefined

- Expected  - 4
+ Received  + 1

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\settings-command.test.ts:57:30)
(fail) orch settings > --json reports value + source per setting, settings.json winning over defaults [315.78ms]
(pass) orch settings > --json reports env as the winning source over settings.json [318.67ms]
C:\Users\Bryan\AppData\Local\Temp\orch-settings-cmd-InbMMi\settings.json: defaults.adapter: "codex" is not an installed adapter ΓÇö installed: pi, claude; re-run orch setup
(pass) orch settings > --harness switches defaults.adapter between installed ids and rejects a non-installed id [2468.42ms]
C:\Users\Bryan\AppData\Local\Temp\orch-settings-cmd-DsCTME\config.toml: legacy config.toml detected ΓÇö settings now live in C:\Users\Bryan\AppData\Local\Temp\orch-settings-cmd-DsCTME\settings.json; re-run orch setup (the old values are not read)
(pass) orch settings > a load error surfaces loudly with no partial table [268.62ms]

test\setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [10.36ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.42ms]
(pass) notifier setup logic > renders a command entry that loadConfig can parse [2.25ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.60ms]

test\setup-smoke.test.ts:
(pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [1.13ms]
(pass) runSetupSmoke (12.5) > a rejected dispatch fails loudly and sets a non-zero exit code [0.41ms]
(pass) runSetupSmoke (12.5) > a dispatch that is accepted but yields no result times out and fails non-zero [0.39ms]
(pass) runSetupSmoke (12.5) > a failed spawn fails loudly before any dispatch [0.28ms]

test\skew-guard.test.ts:
(pass) CLI daemon skew guard > refuses mutating commands and names both hashes plus the reload remedy [289.41ms]
(pass) CLI daemon skew guard > allows read-only commands while the daemon is skewed [407.66ms]
(pass) CLI daemon skew guard > --stale-ok overrides refusal for a mutating command [6710.75ms]
228 | }
229 | 
230 | function connect(pathOrPort: string | number, timeoutMs: number): Promise<Socket> {
231 |   return new Promise((resolve, reject) => {
232 |     const socket = typeof pathOrPort === "string"
233 |       ? createConnection(pathOrPort)
      ^
error: connect ENOENT C:\Users\Bryan\AppData\Local\Temp\orch-skew-guard-fQeUxA\orchd.sock
   errno: -4058,
 syscall: "connect",
    port: undefined,
 address: "C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-skew-guard-fQeUxA\\orchd.sock",
    code: "ENOENT"

      at afterConnect (node:net:1154:39)
      at connectError (node:net:352:48)
      at doConnect (unknown:1:1)
      at kConnectPipe (node:net:367:19)
      at internalConnect (node:net:1062:93)
      at connect (node:net:634:58)
      at C:\Users\Bryan\Documents\orch\src\daemon\rpc.ts:233:9
      at new Promise (native:1:11)
      at connect (C:\Users\Bryan\Documents\orch\src\daemon\rpc.ts:339:9)
      at connectDaemon (C:\Users\Bryan\Documents\orch\src\daemon\rpc.ts:372:16)
      at C:\Users\Bryan\Documents\orch\test\skew-guard.test.ts:114:27
(fail) CLI daemon skew guard > doctor reports skew as a warning without making skew itself a failure [258.18ms]
(pass) CLI daemon skew guard > does not treat an absent daemon as skew and auto-starts a fresh daemon [1589.17ms]

test\spawn-identity.test.ts:
(pass) one key per pane spawn (12.1) > the registry row key equals the ORCH_AGENT_KEY env key, and the pane handle is a separate field [83.78ms]
(pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [77.43ms]

test\spawn-limits.test.ts:
(pass) spawn limits > schema loads global and workspace caps [6.54ms]
(pass) spawn limits > rejects invalid cap %s with file and key [15.78ms]
(pass) spawn limits > rejects invalid cap %s with file and key [10.21ms]
(pass) spawn limits > rejects invalid cap %s with file and key [10.41ms]
(pass) spawn limits > omitted fleet caps normalize to defaults [8.57ms]
(pass) spawn limits > global boundary refusal data counts the whole request [42.14ms]
(pass) spawn limits > one workspace may use the full global allotment [22.35ms]
(pass) spawn limits > workspace cap is independent of global headroom [16.43ms]
(pass) spawn limits > uncapped workspace is bounded only by global count [12.44ms]
(pass) spawn limits > dead pid records free capacity [13.82ms]
(pass) spawn limits > foreign panes never count [14.02ms]
(pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [366.08ms]
(pass) spawn limits > doctor accepts satisfiable limits [147.63ms]

test\transcript.test.ts:
(pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [0.41ms]
(pass) lastAssistantFromJsonl > undefined for blank or empty input [0.07ms]
(pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.10ms]
(pass) assistantText > reads role-tagged records [0.05ms]
(pass) assistantText > reads the {type:'assistant'} envelope with a nested message [0.04ms]
(pass) assistantText > undefined for non-assistant roles [0.04ms]
(pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.08ms]
(pass) contentText empty-string part handling > an all-empty content array yields undefined [0.09ms]
(pass) contentText empty-string part handling > a bare empty string yields undefined [0.03ms]

test\wall-single-owner.test.ts:
(pass) workspace wall ownership > keeps the wall decision primitive in one source module [14.82ms]

test\work-notify.test.ts:
(pass) orch work notifications > delivers a presence transition through a configured command sink [155.79ms]

test\worker-prompt.test.ts:
(pass) worker prompt capability composition > work loop gives codex the base header without orch_ask [55.20ms]
(pass) worker prompt capability composition > work loop gives pi the orch_ask header clause [64.35ms]
(pass) worker prompt capability composition > orch run composition selects the same header per adapter [0.19ms]
(pass) worker prompt capability composition > locked-commands clause names the commands when the list is non-empty [0.12ms]
(pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.07ms]
(pass) worker prompt capability composition > events strip both worker header variants [0.38ms]

test\worker-tools.test.ts:
(pass) worker tool policy > default spawn omits peer tools [0.27ms]
(pass) worker tool policy > explicitly disabled peer tools are omitted [0.04ms]
(pass) worker tool policy > config enables all peer tools [0.06ms]

test\workspace-policy.test.ts:
(pass) workspace policy > reads workspaces from serialized identity keys [0.30ms]
(pass) workspace policy > resolves workspace names through records and functions [0.20ms]
(pass) workspace policy > compares serialized keys by their workspace [0.12ms]
(pass) workspace policy > enforces the workspace wall [0.17ms]
(pass) workspace policy > scopes serialized identity keys to the current workspace [0.23ms]
(pass) workspace policy > null current workspace leaves items unscoped [0.10ms]
(pass) workspace policy > 2.7 status displays the reported workspace identity field [26.97ms]
(pass) workspace policy > 6.6 structured identity drives status and policy, not serialized key text [26.18ms]

test\workspace-walls.test.ts:
(pass) workspace helpers > extracts workspace ids only from identity keys [0.16ms]
(pass) workspace helpers > derives an entity workspace from the identity key [0.14ms]
(pass) workspace helpers > returns the same entities when all workspaces are requested [72.98ms]
(pass) workspace wall writes > allows a write within the same workspace [0.15ms]
(pass) workspace wall writes > denies a cross-workspace write with both workspaces in the reason [0.10ms]
(pass) workspace wall writes > applies the same wall rule to herdr, tmux, and headless identities [0.21ms]
(pass) workspace wall writes > allows a cross-workspace write with an explicit override [0.07ms]
(pass) workspace wall writes > allows legacy unscoped targets [0.08ms]
(pass) workspace-aware queued task selection > excludes tasks pinned to another workspace [0.15ms]
(pass) workspace-aware queued task selection > skips a malformed unscoped task in every workspace [0.10ms]
(pass) workspace-aware queued task selection > selects the earliest eligible task and respects agent constraints [0.14ms]

test\worktree.test.ts:
Preparing worktree (new branch 'orch/fixes-1')
(pass) worktree primitives > creates and lists an agent worktree on an orch branch [1712.32ms]
Preparing worktree (new branch 'orch/feature')
(pass) worktree primitives > detects commits ahead of a base branch [1837.48ms]
Preparing worktree (new branch 'orch/remove-me')
(pass) worktree primitives > removes an agent worktree [1909.49ms]
fatal: not a git repository (or any of the parent directories): .git
(pass) worktree primitives > rejects a non-repository path with a clear error [40.22ms]

3 tests skipped:
(skip) claude-hooks shim tests need the dist bundle
(skip) deliverControl > executes codex steer command and accepts exit zero
(skip) deliverControl > treats a nonzero codex command exit as failure


5 tests failed:
(fail) notify sinks > loadSinks parses command and webhook declarations [2.86ms]
(fail) notify > parses valid sinks and applies default on states [2.49ms]
(fail) fleet ownership scoping > close --all leaves foreign-owned records untouched [26.50ms]
(fail) orch settings > --json reports value + source per setting, settings.json winning over defaults [315.78ms]
(fail) CLI daemon skew guard > doctor reports skew as a warning without making skew itself a failure [258.18ms]

 531 pass
 3 skip
 5 fail
 1984 expect() calls
Ran 539 tests across 91 files. [81.13s]
