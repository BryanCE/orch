bun test v1.3.14 (0d9b296a)

test\adapter-allowlist.test.ts:
(pass) pi adapter tool allowlist > declares exactly the built-ins and bridge tools [0.06ms]
(pass) pi adapter tool allowlist > restricts interactive pi launches to the allowlist and the orch bridge/HUD extensions only [0.23ms]
(pass) pi adapter tool allowlist > restricts headless pif launches to the bridge/HUD extensions and preserves the prompt [0.31ms]

test\adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [6.96ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [5.43ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [3.29ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [1.24ms]

test\adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [0.08ms]
(pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.10ms]
(pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.06ms]
(pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.14ms]

test\adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.28ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.13ms]
(pass) PiAdapter > reads state from the presence status through store helpers [2.52ms]
(pass) PiAdapter > appends a steer message to the presence inbox [2.13ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [2.13ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [2.87ms]

test\answer-dispatch.test.ts:
(pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [31.36ms]
(pass) answer via the control dispatcher > refuses answer when the adapter declares ask false, naming target and adapter [22.49ms]
(pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [24.14ms]
(pass) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [50.77ms]
(pass) answer over the daemon control socket > refuses a cross-workspace answer at the daemon wall [15.59ms]
(pass) answer over the daemon control socket > refuses a non-owner answer, naming the owning orchestrator [35.16ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > workspaceNames is empty ΓÇö headless has no name concept [0.35ms]
(pass) HeadlessBackend > spawns a detached process and records its handle [71.94ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [115.00ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [66.80ms]
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [88.69ms]
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [2.64ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [2.26ms]
(pass) HeadlessBackend > never signals an unrecorded pid [1.24ms]

test\backend-herdr.test.ts:
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [0.36ms]
(pass) HerdrBackend > maps close and list to herdr helpers [0.15ms]
(pass) HerdrBackend > workspaceNames maps tab labels by workspace, first label wins, unlabeled skipped [0.17ms]

test\backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [0.16ms]
(pass) TmuxBackend > reports tmux availability [23.35ms]
(pass) TmuxBackend > workspaceNames is empty ΓÇö tmux sessions have no names distinct from ids [0.17ms]
(pass) TmuxBackend > reflects the TMUX environment [0.15ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.13ms]
(pass) TmuxBackend > list() and inventory() surface only orch-spawned panes [1.11ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.23ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [1.47ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.22ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [52.04ms]
(pass) TmuxBackend > waitAgentStatus fails immediately when the pane has no presence key [0.22ms]
(pass) TmuxBackend > read returns captured text and throws when capture-pane fails [0.23ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [0.24ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.39ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.20ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [0.57ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.20ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.33ms]
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [23.52ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [26.95ms]
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [29.21ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [0.28ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [66.47ms]

test\broker-governance.test.ts:
(pass) daemon governWrite enforcement > unscoped actor bypasses ownership and the wall [27.39ms]
(pass) daemon governWrite enforcement > owner may write to its own agent [23.05ms]
(pass) daemon governWrite enforcement > a foreign owner in the same workspace is refused [21.40ms]
(pass) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [20.45ms]
(pass) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [21.88ms]
(pass) daemon governWrite enforcement > --steal transfers ownership to the actor [28.64ms]
(pass) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [39.68ms]

test\broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [31.96ms]
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [0.28ms]
(pass) broker ownership and workspace governance > work-loop selection stays within the origin workspace [25.24ms]

test\broker-routing.test.ts:
(pass) broker CLI routing > write refuses when the daemon socket is unavailable [5328.72ms]
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [199.98ms]
(pass) broker CLI routing > dispatch failure is daemon-absent, not herdr-not-found [5261.01ms]

test\check-bridge.test.ts:
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.09ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.09ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / config seams [0.08ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [0.47ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.11ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.05ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [0.31ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [0.38ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.08ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.17ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke-test exemption is documented and load-bearing [0.07ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has exactly one identity-branch line and it is exempted [7.16ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.13ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.02ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [0.46ms]

test\claude-adapter.test.ts:
(pass) Claude adapter > declares its identity and capabilities [0.23ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.15ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.20ms]
(pass) Claude adapter > detects state from a live presence status [1.79ms]
(pass) Claude adapter > extracts result.json before transcript and native output [2.25ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [1.72ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [88.41ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [347.15ms]
(pass) Claude adapter > exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session) [81.14ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed ORCH_AGENT_KEY [85.15ms]

test\claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [61.67ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [59.60ms]
(pass) claude-hooks shim > under node > writes status.json for a valid key [62.67ms]
(pass) claude-hooks shim > under deno > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [109.39ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under deno > exits 1 loudly on a present-but-malformed key [109.48ms]
(pass) claude-hooks shim > under deno > writes status.json for a valid key [129.22ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [76.14ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [78.57ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [80.60ms]
(skip) claude-hooks shim tests need the dist bundle

test\clean-worktrees.test.ts:
Preparing worktree (new branch 'orch/empty')
Preparing worktree (new branch 'orch/merged')
Preparing worktree (new branch 'orch/unmerged')
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [2396.33ms]
Preparing worktree (new branch 'orch/discard')
fatal: 'refs/heads/orch/discard' - not a valid ref
(pass) clean worktrees > --force discards an unmerged orphan and its branch [1339.43ms]

test\cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.20ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.17ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.16ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.13ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.30ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.16ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [58.49ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [0.24ms]
(pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [64.04ms]
(pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [0.72ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [165.22ms]
(pass) headless common path: identity key -> presence > one adapter uses opaque keys across headless and tmux backend routes [0.18ms]
(pass) headless common path: identity key -> presence > workspaceOf reads the workspace from the structured key, not a regex [0.10ms]

test\cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.12ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [37.92ms]
(pass) tmux backend registry and capabilities > exposes pane capabilities [0.12ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.11ms]
(pass) tmux backend registry and capabilities > serializes tmux identities as one flat key [0.16ms]
(pass) tmux backend registry and capabilities > rejects an empty handle without invoking tmux [0.05ms]
(pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [18.94ms]
(pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [0.25ms]
(pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [0.15ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-workspace [0.28ms]

test\cmd-lock-bridge.test.ts:
(pass) pi-bridge command-lock interception > wraps a matching locked command in acquireΓåÆrelease around the tool call [9.08ms]
(pass) pi-bridge command-lock interception > leaves a non-matching command untouched ΓÇö no acquire, no release [1.99ms]
(pass) pi-bridge command-lock interception > only bash tool calls are intercepted ΓÇö a non-bash tool never acquires [1.81ms]

test\cmd-lock.test.ts:
(pass) command lock > acquire and release round-trip [6.44ms]
(pass) command lock > second acquire blocks until first releases [74.29ms]
(pass) command lock > dead-pid lock is reaped [8.53ms]
(pass) command lock > release with wrong pid refuses [7.18ms]
bun test held by agent-a (pid 2236)
(pass) command lock > matches locked command prefixes and probes settings [13.42ms]
(pass) command lock > run propagates the child exit code [198.82ms]

test\codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [1.75ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [0.91ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [1.83ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [2.25ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [2.57ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [355.87ms]

test\command-workspace-fields.test.ts:
(pass) command workspace fields > status and wall entities use persisted workspace instead of serialized-key text [28.96ms]
(pass) command workspace fields > status reports a mixed pi and Claude fleet with the same identity fields [24.58ms]

test\commands-clean.test.ts:
(pass) commands/clean > reaps dead agent dirs but preserves live pids [5.50ms]

test\commands-control.test.ts:
(pass) commands/control > parses dispatch flags without losing prompt words [2.27ms]
(pass) commands/control > parses --then destination and note [0.07ms]
(pass) commands/control > adds worker header unless raw [0.12ms]

test\commands-daemon.test.ts:
(pass) commands/daemon > parses governance and validates daemon status [0.16ms]
(pass) commands/daemon > reads only a positive integer lock pid [1.51ms]

test\commands-events.test.ts:
(pass) commands/events > parses filters and scope flags [1.65ms]
(pass) commands/events > a dropped subscription names the command that recovers it [0.04ms]
(pass) commands/events > rejects malformed event and labels sinks [0.15ms]

test\commands-index.test.ts:
(pass) commands/index > does not gate help or noninteractive commands [1.36ms]
(pass) commands/index > reads a package version string [0.42ms]

test\commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [0.43ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [0.18ms]

test\commands-panes.test.ts:
(pass) commands/panes > pane identity remains backend-neutral [1.32ms]
(pass) commands/panes > exports the pane listing command directly [0.04ms]

test\commands-queue.test.ts:
(pass) commands/queue > round-trips add/list/cancel on an isolated store [26.86ms]
No queue tasks.
(pass) commands/queue > renders empty queues without throwing [0.28ms]

test\commands-results.test.ts:
(pass) commands/results > validates and extracts question payloads [1.95ms]
(pass) commands/results > formats invalid and recent timestamps [0.19ms]
(pass) commands/results > routes a seeded result.json through the command module [63.62ms]
(pass) commands/results > orch tail resolves a non-pi target through that adapter's session view [68.18ms]
(pass) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [67.45ms]
(pass) commands/results > orch tail -n keeps last-N rendered entries for a pi session [67.23ms]
(pass) commands/results > orch session reports the pi entry count [66.33ms]
(pass) commands/results > orch session shows zero entries for an adapter view without them [64.93ms]

test\commands-review.test.ts:
(pass) commands/review > uses the short orch branch as review target [1.98ms]
(pass) commands/review > falls back to branch then pane [0.04ms]

test\commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.20ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [0.43ms]
(pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.20ms]
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > a consistent selection records silently and never prompts [0.25ms]
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > no installed entrypoint leaves the selection untouched [0.11ms]
Runtime mismatch: the installed orch entrypoint (/usr/local/bin/orch) is a node build, but you selected bun.
  A bun install requires a rebuild: bun run build:dev
  recording node to match the installed entrypoint ΓÇö re-run orch setup --runtime bun after bun run build:dev to switch
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > a mismatch records nothing without confirmation ΓÇö the consistent value wins [0.16ms]
Runtime mismatch: the installed orch entrypoint (/usr/local/bin/orch) is a node build, but you selected bun.
  A bun install requires a rebuild: bun run build:dev
  recording bun ΓÇö pending rebuild; run bun run build:dev to make it real
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > a mismatch records the selection only on explicit confirmation [0.16ms]
Runtime mismatch: the installed orch entrypoint (/usr/local/bin/orch) is a node build, but you selected bun.
  A bun install requires a rebuild: bun run build:dev
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > non-interactive never prompts and records the consistent value [0.18ms]
  recording node to match the installed entrypoint ΓÇö re-run orch setup --runtime bun after bun run build:dev to switch

test\commands-spawn.test.ts:
(pass) commands/spawn > parses spawn flags and rejects no implicit adapter assumptions [0.20ms]
(pass) commands/spawn > identifies pi launchers and preserves raw prompt [0.11ms]

test\commands-status.test.ts:
(pass) commands/status > derives view fields from seeded presence [0.65ms]
(pass) commands/status > marks dead presence as exited [0.07ms]
(pass) commands/status > shared status row carries presence-derived fields [0.29ms]
(pass) commands/status > json branch and local table branch derive identical rows apart from host [0.11ms]
(pass) commands/status > formats workspace labels and warnings [0.15ms]

test\commands-target.test.ts:
(pass) commands/target > splits known flags and preserves positional args [2.01ms]
(pass) commands/target > extracts target and joined prompt [0.13ms]
(pass) commands/target > reads only structured result text [0.08ms]
(pass) commands/target > quotes remote args and ORCH_DIR safely [0.10ms]
(pass) commands/target > lists only live serialized identity presence entries [4.46ms]

test\config-precedence.test.ts:
(pass) config precedence > returns a defaults value when no override is set [2.93ms]
(pass) config precedence > applies defaults when config, env, and flag are absent [1.23ms]
(pass) config precedence > uses env over config and flag over env [1.29ms]
(pass) config precedence > parses notify entries and hosts into expected shapes [2.59ms]
(pass) config precedence > reports a helpful validation error for invalid config [1.40ms]

test\config-watch.test.ts:
(pass) watchConfig > loads initially and applies a valid edit after the debounce [72.73ms]
(pass) watchConfig > keeps the last-good config, warns once, and recovers [435.27ms]
(pass) watchConfig > reloads on a touched reload.signal without a settings edit [31.33ms]
(pass) watchConfig > stop prevents further callbacks [414.87ms]

test\config.test.ts:
(pass) loadConfig > refuses to invent a configuration when settings.json is missing [1.55ms]
(pass) loadConfig > requires a top-level runtime and never defaults it [2.35ms]
(pass) loadConfig > rejects an unrecognized runtime naming the accepted values [1.58ms]
(pass) loadConfig > rejects a runtime misplaced under defaults [1.53ms]
(pass) loadConfig > reads the declared runtime [1.48ms]
(pass) loadConfig > parses every supported settings section [1.45ms]
(pass) loadConfig > rejects a file without the current schemaVersion [1.28ms]
(pass) loadConfig > rejects invalid JSON loudly [0.99ms]
(pass) loadConfig > names the key path for invalid fields [1.30ms]
(pass) loadConfig > rejects unknown settings keys [1.27ms]
(pass) loadConfig > parses defaults.allowed_models as a string array [1.16ms]
(pass) loadConfig > rejects a non-string entry in defaults.allowed_models [1.37ms]
(pass) loadConfig > validates defaults.worker_peer_tools as a boolean [1.61ms]
(pass) loadConfig > accepts true and false for defaults.worker_peer_tools [2.20ms]
(pass) loadConfig > leaves defaults.worker_peer_tools absent when unset [1.35ms]
(pass) loadConfig > rejects a host without dest [1.77ms]
(pass) loadConfig > rejects an unknown id in installed.adapters [1.57ms]
(pass) loadConfig > rejects defaults.adapter not present in installed.adapters [1.62ms]
(pass) loadConfig > rejects when settings.json is absent but a legacy config.toml exists [1.17ms]
(pass) allowedModelPatterns > returns the built-in defaults when config is absent [0.63ms]
(pass) allowedModelPatterns > returns the configured patterns when set [1.09ms]
(pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or installed entry [1.69ms]
(pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [2.11ms]
(pass) writeSettingsRuntime > a different runtime replaces the single value in place [2.16ms]
(pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [2.35ms]
(pass) reapUnreadableSettings > leaves a readable file alone [1.06ms]
(pass) writeSettingsInstalled > round-trips both provider arrays [2.20ms]
(pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [3.73ms]
(pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [2.44ms]
(pass) writeSettingsDefault > is idempotent when rewriting the same value [4.16ms]
(pass) writeSettingsDefault > refuses to write through an out-of-version settings file [1.16ms]
(pass) writeSettingsDefault > switches defaults.adapter between two installed ids and loads clean [10.28ms]
(pass) config precedence > uses the fallback when env and settings.json omit a setting [1.69ms]
(pass) config precedence > uses the settings.json value over the fallback [1.30ms]
(pass) config precedence > uses the ORCH_* environment value over settings.json [1.18ms]
(pass) config precedence > uses an explicit flag override over the environment [0.08ms]
(pass) resolveSetting > uses flag, environment coercion, config, then fallback in precedence order [0.17ms]
(pass) resolveWithSource > reports the winning source at each precedence level [0.12ms]

test\control-dispatch.test.ts:
(pass) deliverControl > steers pi through its presence inbox [25.89ms]
(pass) deliverControl > warns and succeeds when claude keys fallback delivers [21.15ms]
steering headless~local~claude-fail via claude keys fallback (degraded delivery)
(pass) deliverControl > fails when claude keys fallback cannot deliver [23.27ms]
(skip) deliverControl > executes codex steer command and accepts exit zero
(skip) deliverControl > treats a nonzero codex command exit as failure
(pass) deliverControl > fails unsupported steer and setModel capabilities [24.29ms]
(pass) deliverControl > requires presence for inbox delivery [22.81ms]

test\daemon-events.test.ts:
(pass) daemon presence events > an RPC subscriber receives a presence transition [44.97ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [0.24ms]
(pass) daemon presence events > a blocked transition drives command sink delivery [71.22ms]
(pass) daemon presence events > a dead daemon closes the subscription instead of falling back to files [28.54ms]
(pass) daemon presence events > a caller-initiated stop is not reported as a disconnect [76.51ms]

test\daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [2.84ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [2.95ms]
(pass) daemon lifecycle > rejects malformed locks and a socket probe that fails [3.17ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [2.36ms]
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.3.14+0d9b296af)

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
  remove    webpack              Remove a dependency from package.json (bun rm)
  update    lyra                 Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
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
  create    vite                 Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [76.75ms]
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [9.28ms]
(pass) daemon lifecycle > rejects a recycled pid identity [1.79ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [1.59ms]

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
  add       lyra                 Add a dependency to package.json (bun a)
  remove    redux                Remove a dependency from package.json (bun rm)
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
  create    elysia               Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon RPC > round-trips a call over the real unix socket [6.58ms]
(pass) daemon RPC > returns an error for an unknown method [18.04ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [44.68ms]
(pass) daemon RPC > delivers pushed subscription events [30.35ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [41.97ms]
(pass) daemon RPC > has a catchable absent-daemon error [2.62ms]

test\doctor-backends.test.ts:
(pass) doctor backend and presence checks > reports every registered backend and boolean capability fields [43.25ms]
(pass) doctor backend and presence checks > passes with herdr active while an installed tmux sits outside a session [0.10ms]
(pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.11ms]
(pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [0.09ms]
(pass) doctor backend and presence checks > fails when any installed backend is unavailable, active or not [0.04ms]
(pass) doctor backend and presence checks > honours the configured default over the probe order [0.07ms]
(pass) doctor backend and presence checks > reports only records missing the current schema stamp [3.08ms]

test\doctor-checks.test.ts:
(pass) doctor notification-sink checks > reports no sinks as healthy [29.31ms]
(pass) doctor notification-sink checks > warns for a webhook with a malformed URL [29.02ms]
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [28.80ms]
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [28.07ms]

test\doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [43.75ms]
(pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [45.63ms]
(pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [123.72ms]
(pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [94.84ms]
(pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [82.98ms]
(pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [68.01ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [26.88ms]
(pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [26.83ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [46.67ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [1.15ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [1.24ms]

test\doctor-hosts.test.ts:
(pass) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [73.92ms]
(pass) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [67.96ms]
(pass) doctor remote host checks > flags a remote orch version/schema mismatch in detail [70.02ms]
(pass) doctor remote host checks > reports no remote hosts configured as healthy [52.73ms]

test\doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env node as node [1.27ms]
(pass) shebangRuntime > reads #!/usr/bin/env bun as bun [1.12ms]
(pass) shebangRuntime > reads #!/usr/bin/env deno as deno [0.94ms]
(pass) shebangRuntime > reads #!/usr/local/bin/node as node [0.94ms]
(pass) shebangRuntime > does not mistake a longer binary name for a runtime [0.95ms]
(pass) shebangRuntime > returns null for a file with no shebang [0.91ms]
(pass) shebangRuntime > returns null for an unreadable path [0.63ms]
(pass) runningRuntime > reports the runtime this suite is executing under [0.05ms]
(pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [1.26ms]
(pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [1.08ms]
(pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [1.01ms]
(pass) doctor runtime verdict table > declared node but executing under bun fails [1.10ms]
(pass) doctor runtime verdict table > declared bun but executing under node fails just as loudly [1.33ms]
(pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [1.14ms]
(pass) doctor runtime verdict table > declared runtime absent from PATH fails [1.22ms]
(pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [1.26ms]
(pass) doctor runtime verdict table > remediation names both directions ΓÇö rebuild, or re-record the declaration [1.13ms]
(pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [0.62ms]

test\doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [65.83ms]
(pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [72.53ms]
(pass) doctor stale presence safety > no dead agents leaves nothing to remove [78.46ms]

test\doctor-unscoped-tasks.test.ts:
(pass) doctor unscoped queue tasks > only scoped tasks pass [24.09ms]
(pass) doctor unscoped queue tasks > reports a null-workspace row as reappable and names it [28.05ms]
(pass) doctor unscoped queue tasks > stays report-only ΓÇö no pre-selected destructive fix [22.93ms]
(pass) doctor unscoped queue tasks > the check is wired into runDoctor [49.52ms]

test\doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [1.35ms]
(pass) runDoctor > runs on an unconfigured install without failing for want of settings.json [45.26ms]
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [48.93ms]
(pass) runDoctor > reports an absent daemon as optional [43.73ms]
(pass) runDoctor > reports and fixes a stale daemon lock [55.03ms]
(pass) runDoctor > accepts a live daemon and an answerable socket [108.42ms]
(pass) runDoctor > warns when the live daemon code hash is stale [45.80ms]
(pass) runDoctor > fails on an invalid lock and an unanswerable live socket [95.06ms]
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [2.43ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [2.08ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [3.25ms]
(pass) runDoctor > reports a dead presence pid and corrupt spawn registry lines [55.58ms]
(pass) runDoctor > bins check is driven by the installed set and offers no fix [32.83ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [6.15ms]
(pass) runDoctor > validates configured notifier adapters [241.24ms]
notify: could not load settings.json: C:\Users\Bryan\AppData\Local\Temp\orch-doctor-lu9A8m\settings.json: this settings file has invalid values: Γ£û Invalid input: expected number, received string ΓåÆ at queue.max_retries Fix those keys by hand, or re-record the file with: orch setup
(pass) runDoctor > reports invalid config and accepts missing config [103.23ms]
(pass) runDoctor > never throws when individual checks encounter broken inputs [93.57ms]

test\herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [0.29ms]
(pass) herdr and notification hardening > falls back to a real name when an adapter id is blank [0.12ms]
(pass) herdr and notification hardening > nameless notifications use a workspace label, never a bare pane key [0.27ms]

test\herdr-pane-state.test.ts:
(pass) retryableErrorMessage classifier > no assistant message ΓåÆ undefined [0.14ms]
(pass) retryableErrorMessage classifier > assistant that did not stop on error ΓåÆ undefined [0.03ms]
(pass) retryableErrorMessage classifier > error stop with non-retryable text ΓåÆ undefined [0.24ms]
(pass) retryableErrorMessage classifier > error stop with retryable text ΓåÆ the message [0.04ms]
(pass) retryableErrorMessage classifier > non-string retryable errorMessage is stringified before matching [0.06ms]
(pass) retryableErrorMessage classifier > only the last assistant turn is classified [0.06ms]
(pass) createPaneStateMachine state ordering > run ΓåÆ blocked ΓåÆ unblock ΓåÆ idle debounce [18.11ms]
(pass) createPaneStateMachine state ordering > dedupes unchanged state [1.76ms]
(pass) createPaneStateMachine state ordering > retryable end holds working, then settles to blocked after grace [47.02ms]
(pass) createPaneStateMachine state ordering > duplicate end after settling does not publish a false idle [30.64ms]
(pass) createPaneStateMachine state ordering > openSession forces a publish even when state is unchanged [1.40ms]

test\identity.test.ts:
(pass) serializeIdentity / parseIdentity round-trip > round-trips herdr [0.05ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with % handle [0.02ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with : and % handle
(pass) serializeIdentity / parseIdentity round-trip > round-trips headless pid handle
(pass) serializeIdentity / parseIdentity round-trip > round-trips empty workspace
(pass) serializeIdentity / parseIdentity round-trip > round-trips separator inside parts
(pass) serializeIdentity / parseIdentity round-trip > round-trips slash inside parts
(pass) serializeIdentity / parseIdentity round-trip > round-trips percent-code-lookalike
(pass) serializeIdentity / parseIdentity round-trip > serialized key is a single flat segment (no nested path) [0.08ms]
(pass) serializeIdentity / parseIdentity round-trip > backend namespaces prevent collisions across equal workspace/handle [0.12ms]
(pass) malformed input > rejects wrong segment count [0.17ms]
(pass) malformed input > rejects empty key [0.04ms]
(pass) malformed input > rejects empty backend or handle on serialize [0.09ms]
(pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.08ms]
(pass) malformed input > tryParseIdentity parses a valid key [0.06ms]

test\notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > skips an unavailable adapter without affecting available adapters [0.40ms]
notify: webhook notifier has invalid configuration
(pass) notifier registry and built-in adapters > reports malformed required configuration instead of throwing [0.21ms]
(pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [0.52ms]
(pass) notifier registry and built-in adapters > command adapter passes canonical JSON on stdin [65.65ms]
(pass) notifier registry and built-in adapters > desktop fallback selects notify-send, then WSL notify when it fails [3.34ms]
notify: bad sink failed
(pass) notifier registry and built-in adapters > isolates delivery failures and still delivers to other adapters [0.36ms]

test\notify-events-format.test.ts:
(pass) notification and presence event formatting > workspaceColor is stable and returns a palette hex [0.08ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.14ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.13ms]
(pass) notification and presence event formatting > webhook payload includes workspace and workspaceColor [0.37ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [0.25ms]
(pass) notification and presence event formatting > derivePresenceTransition derives workspace from identity keys [0.12ms]

test\notify-sinks.test.ts:
(pass) notify sinks > delivers command sink payload as JSON [67.10ms]
(pass) notify sinks > loadSinks parses command and webhook declarations [1.36ms]

test\notify.test.ts:
(pass) notify > parses valid sinks and warns about unknown types and missing fields [1.78ms]
(pass) notify > delivers only to sinks whose on filter matches the event [61.55ms]
(pass) notify > command sink writes the event payload as JSON on stdin [73.15ms]
(pass) notify > titles lead with exactly one terminal state and agent [0.38ms]
(pass) notify > webhook failure is non-fatal and reports a warning [39.05ms]

test\orchd-rpc-reconnect.test.ts:
(pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [336.77ms]
(pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1069.94ms]

test\orchd-rpc-replay.test.ts:
(pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [0.40ms]
(pass) orchd RPC replay buffer > drops the oldest events and reports a replay gap [2.06ms]

test\orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [69.14ms]

test\orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [17.67ms]
(pass) orchd RPC transports > round-trips over the TCP fallback transport [36.86ms]

test\outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [34.56ms]

test\outbox.test.ts:
(pass) outbox delivery > selects pending messages and delivers each message once [26.42ms]
(pass) outbox delivery > keeps failed messages pending until their backoff expires [26.72ms]

test\ownership.test.ts:
(pass) agent ownership > round-trips an owner [26.10ms]
(pass) agent ownership > allows unowned and same-owner writes [25.31ms]
(pass) agent ownership > denies foreign writes and supports stealing [28.42ms]

test\parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [1.27ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.06ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.08ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.05ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.05ms]

test\pi-model-control.test.ts:
(pass) splitThinkingSuffix > splits a valid ladder effort off the bare id [0.14ms]
(pass) splitThinkingSuffix > leaves a bare model untouched [0.03ms]
(pass) splitThinkingSuffix > keeps a trailing colon token that is not a thinking level as part of the id [0.02ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > looks up the BARE id and returns the effort suffix separately [1.02ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > retries until a still-booting registry answers [27.43ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > throws when the registry never yields the model [15.85ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > rejects a model outside the allowlist before any registry lookup [0.94ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > rejects a token without a provider/id shape [0.56ms]
(pass) isAllowedModel > always allows openai-codex, applies globs to the rest [0.74ms]
(pass) createModelControl.applyControlCommand > applies a suffixed model command and records a success outcome [1.94ms]
(pass) createModelControl.applyControlCommand > records a failure outcome when the model is rejected [1.69ms]
(pass) createModelControl.applyControlCommand > applies a thinking command directly [1.48ms]

test\pid-liveness.test.ts:
(pass) pidAlive liveness contract (shared by pi peers) > EPERM means the process exists under another user ΓÇö alive [1.45ms]
(pass) pidAlive liveness contract (shared by pi peers) > ESRCH means no such process ΓÇö dead [0.03ms]
(pass) pidAlive liveness contract (shared by pi peers) > the current process is alive [0.05ms]
(pass) pidAlive liveness contract (shared by pi peers) > non-positive and non-numeric pids are rejected without signalling [0.07ms]

test\presence-schema.test.ts:
(pass) presence status schema > reads a spawned namespaced identity with backend, workspace, handle, and adapter [82.92ms]
(pass) presence status schema > orch status JSON exposes the complete spawned identity fields [75.15ms]
(pass) presence status schema > status and list report the same agent identity [98.60ms]
(pass) presence status schema > mixed pi and Claude status rows carry the same identity field set [81.07ms]
(pass) presence status schema > rejects a status record that carries no schema stamp [74.67ms]
(pass) presence status schema > rejects a status record stamped with a non-current schema [73.39ms]
(pass) presence status schema > a malformed record is skipped without hiding the valid records beside it [74.93ms]
(pass) presence status schema > persists the complete spawned identity record [17.18ms]

test\queue-workspace-replay.test.ts:
(pass) queue workspace replay > persists workspace through append-only replay [28.19ms]
(pass) queue workspace replay > a malformed null-workspace row replays but is never claimable [46.37ms]
(pass) queue workspace replay > replays separate workspace values for multiple tasks [28.54ms]
(pass) queue workspace replay > selects only tasks eligible for the requested workspace [22.78ms]

test\queue.test.ts:
(pass) queue > add then list shows a queued task [20.88ms]
(pass) queue > exactly one claimer wins, including parallel attempts [29.69ms]
(pass) queue > replays done, failed, and retry transitions [29.54ms]
(pass) queue > cancels queued tasks and returns an error result for claimed tasks [31.30ms]
(pass) queue > picks queued tasks FIFO, honoring the agent constraint [28.88ms]
(pass) queue > caps retries: requeue below the cap, terminal failed at it [31.99ms]
(pass) queue > settles a claimed task to done and blocks any later claim [27.91ms]
(pass) queue > exactly one of two racing claimers wins [27.64ms]
(pass) queue > rejects an unscoped task at enqueue [22.95ms]
(pass) queue > a malformed null-workspace row is skipped at claim, never dispatched [25.65ms]

test\remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [138.55ms]
(pass) async remote fan-out > returns a typed dead-host failure [136.58ms]
(pass) async remote fan-out > returns a typed timeout failure [533.93ms]
(pass) async remote fan-out > returns a typed non-JSON failure [144.53ms]
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [561.39ms]

test\remote.test.ts:
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.34ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.24ms]

test\review.test.ts:
Preparing worktree (new branch 'orch/feature-1')
(pass) review plumbing > lists only done worktree agents with commits ahead [1048.98ms]
Preparing worktree (new branch 'orch/iterate-1')
(pass) review plumbing > reject re-dispatches feedback through the adapter inbox [1721.78ms]
Preparing worktree (new branch 'orch/approve-1')
fatal: 'refs/heads/orch/approve-1' - not a valid ref
(pass) review plumbing > approve merges and removes the worktree and branch [1352.83ms]
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
(pass) review plumbing > conflicting approval aborts without changing either branch [1108.36ms]
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
(pass) review plumbing > non-fast-forward approval creates a merge commit [1834.14ms]

test\routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves origin workspace selection [26.89ms]
(pass) store hardening > a fresh store creates the full current schema with WAL enabled [23.72ms]
(pass) store hardening > a steal updates ownership only when the observed owner still matches [25.81ms]
(pass) store hardening > the conditional claim is exactly once [24.99ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [202.72ms]

test\settings-command.test.ts:
(pass) orch settings > --json reports value + source per setting, settings.json winning over defaults [174.32ms]
(pass) orch settings > --json reports env as the winning source over settings.json [166.14ms]
C:\Users\Bryan\AppData\Local\Temp\orch-settings-cmd-HviSk7\settings.json: defaults.adapter: "codex" is not an installed adapter ΓÇö installed: pi, claude; re-run orch setup
(pass) orch settings > --harness switches defaults.adapter between installed ids and rejects a non-installed id [517.22ms]
C:\Users\Bryan\AppData\Local\Temp\orch-settings-cmd-OINjtk\config.toml: legacy config.toml detected ΓÇö settings now live in C:\Users\Bryan\AppData\Local\Temp\orch-settings-cmd-OINjtk\settings.json; re-run orch setup (the old values are not read)
(pass) orch settings > a load error surfaces loudly with no partial table [163.08ms]

test\setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [7.18ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.29ms]
(pass) notifier setup logic > renders a command entry that loadConfig can parse [1.47ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.41ms]

test\setup-smoke.test.ts:
(pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [0.55ms]
(pass) runSetupSmoke (12.5) > a rejected dispatch fails loudly and sets a non-zero exit code [0.24ms]
(pass) runSetupSmoke (12.5) > a dispatch that is accepted but yields no result times out and fails non-zero [0.21ms]
(pass) runSetupSmoke (12.5) > a failed spawn fails loudly before any dispatch [0.14ms]

test\spawn-identity.test.ts:
(pass) one key per pane spawn (12.1) > the registry row key equals the ORCH_AGENT_KEY env key, and the pane handle is a separate field [65.22ms]
(pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [66.39ms]

test\spawn-limits.test.ts:
(pass) spawn limits > schema loads global and workspace caps [2.60ms]
(pass) spawn limits > rejects invalid cap %s with file and key [2.02ms]
(pass) spawn limits > rejects invalid cap %s with file and key [1.43ms]
(pass) spawn limits > rejects invalid cap %s with file and key [1.43ms]
(pass) spawn limits > omitted limits normalize to no caps [1.22ms]
(pass) spawn limits > global boundary refusal data counts the whole request [6.65ms]
(pass) spawn limits > one workspace may use the full global allotment [3.26ms]
(pass) spawn limits > workspace cap is independent of global headroom [2.56ms]
(pass) spawn limits > uncapped workspace is bounded only by global count [1.80ms]
(pass) spawn limits > dead pid records free capacity [1.86ms]
(pass) spawn limits > foreign panes never count [2.05ms]
(pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [71.49ms]
(pass) spawn limits > doctor accepts satisfiable limits [66.66ms]

test\transcript.test.ts:
(pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [0.21ms]
(pass) lastAssistantFromJsonl > undefined for blank or empty input [0.04ms]
(pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.08ms]
(pass) assistantText > reads role-tagged records [0.05ms]
(pass) assistantText > reads the {type:'assistant'} envelope with a nested message [0.03ms]
(pass) assistantText > undefined for non-assistant roles [0.02ms]
(pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.04ms]
(pass) contentText empty-string part handling > an all-empty content array yields undefined [0.06ms]
(pass) contentText empty-string part handling > a bare empty string yields undefined [0.03ms]

test\wall-single-owner.test.ts:
(pass) workspace wall ownership > keeps the wall decision primitive in one source module [9.17ms]

test\work-notify.test.ts:
(pass) orch work notifications > delivers a presence transition through a configured command sink [166.86ms]

test\worker-prompt.test.ts:
(pass) worker prompt capability composition > work loop gives codex the base header without orch_ask [79.37ms]
(pass) worker prompt capability composition > work loop gives pi the orch_ask header clause [78.88ms]
(pass) worker prompt capability composition > orch run composition selects the same header per adapter [0.45ms]
(pass) worker prompt capability composition > locked-commands clause names the commands when the list is non-empty [0.29ms]
(pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.25ms]
(pass) worker prompt capability composition > events strip both worker header variants [0.74ms]

test\worker-tools.test.ts:
(pass) worker tool policy > default spawn omits peer tools [0.50ms]
(pass) worker tool policy > explicitly disabled peer tools are omitted [0.17ms]
(pass) worker tool policy > config enables all peer tools [0.23ms]

test\workspace-policy.test.ts:
(pass) workspace policy > reads workspaces from serialized identity keys [0.58ms]
(pass) workspace policy > resolves workspace names through records and functions [0.28ms]
(pass) workspace policy > compares serialized keys by their workspace [0.19ms]
(pass) workspace policy > enforces the workspace wall [0.30ms]
(pass) workspace policy > scopes serialized identity keys to the current workspace [0.40ms]
(pass) workspace policy > null current workspace leaves items unscoped [0.14ms]
(pass) workspace policy > 2.7 status displays the reported workspace identity field [44.73ms]
(pass) workspace policy > 6.6 structured identity drives status and policy, not serialized key text [64.61ms]

test\workspace-walls.test.ts:
(pass) workspace helpers > extracts workspace ids only from identity keys [0.36ms]
(pass) workspace helpers > derives an entity workspace from the identity key [0.25ms]
(pass) workspace helpers > returns the same entities when all workspaces are requested [164.38ms]
(pass) workspace wall writes > allows a write within the same workspace [0.41ms]
(pass) workspace wall writes > denies a cross-workspace write with both workspaces in the reason [0.22ms]
(pass) workspace wall writes > applies the same wall rule to herdr, tmux, and headless identities [0.48ms]
(pass) workspace wall writes > allows a cross-workspace write with an explicit override [0.13ms]
(pass) workspace wall writes > allows legacy unscoped targets [0.18ms]
(pass) workspace-aware queued task selection > excludes tasks pinned to another workspace [0.35ms]
(pass) workspace-aware queued task selection > skips a malformed unscoped task in every workspace [0.23ms]
(pass) workspace-aware queued task selection > selects the earliest eligible task and respects agent constraints [0.36ms]

test\worktree.test.ts:
Preparing worktree (new branch 'orch/fixes-1')
(pass) worktree primitives > creates and lists an agent worktree on an orch branch [855.93ms]
Preparing worktree (new branch 'orch/feature')
(pass) worktree primitives > detects commits ahead of a base branch [717.38ms]
Preparing worktree (new branch 'orch/remove-me')
(pass) worktree primitives > removes an agent worktree [598.91ms]
fatal: not a git repository (or any of the parent directories): .git
(pass) worktree primitives > rejects a non-repository path with a clear error [36.28ms]

3 tests skipped:
(skip) claude-hooks shim tests need the dist bundle
(skip) deliverControl > executes codex steer command and accepts exit zero
(skip) deliverControl > treats a nonzero codex command exit as failure

 523 pass
 3 skip
 0 fail
 1783 expect() calls
Ran 526 tests across 88 files. [39.89s]
