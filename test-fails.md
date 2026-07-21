bun test v1.3.14 (0d9b296a)

test\adapter-allowlist.test.ts:
(pass) pi adapter tool allowlist > declares exactly the built-ins and bridge tools [0.10ms]
(pass) pi adapter tool allowlist > restricts interactive pi launches to the allowlist and the orch bridge/HUD extensions only [0.38ms]
(pass) pi adapter tool allowlist > restricts headless pif launches to the bridge/HUD extensions and preserves the prompt [0.46ms]

test\adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [16.95ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [28.01ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [5.50ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [2.58ms]

test\adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [4.05ms]
(pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.15ms]
(pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.11ms]
(pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.16ms]

test\adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.44ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.45ms]
(pass) PiAdapter > reads state from the presence status through store helpers [4.90ms]
(pass) PiAdapter > appends a steer message to the presence inbox [3.94ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [7.26ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [4.94ms]

test\answer-dispatch.test.ts:
(pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [33.14ms]
(pass) answer via the control dispatcher > refuses answer when the adapter declares ask false, naming target and adapter [26.35ms]
(pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [26.71ms]
(pass) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [90.12ms]
(pass) answer over the daemon control socket > refuses a cross-workspace answer at the daemon wall [45.18ms]
(pass) answer over the daemon control socket > refuses a non-owner answer, naming the owning orchestrator [636.76ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > workspaceNames is empty ΓÇö headless has no name concept [3.31ms]
(pass) HeadlessBackend > spawns a detached process and records its handle [1324.78ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [217.73ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [105.93ms]
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [113.33ms]
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [3.09ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [2.40ms]
(pass) HeadlessBackend > never signals an unrecorded pid [1.67ms]

test\backend-herdr.test.ts:
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [0.65ms]
(pass) HerdrBackend > maps close and list to herdr helpers [0.19ms]
(pass) HerdrBackend > workspaceNames maps tab labels by workspace, first label wins, unlabeled skipped [0.31ms]

test\backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [0.33ms]
(pass) TmuxBackend > reports tmux availability [41.00ms]
(pass) TmuxBackend > workspaceNames is empty ΓÇö tmux sessions have no names distinct from ids [0.27ms]
(pass) TmuxBackend > reflects the TMUX environment [0.34ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.17ms]
(pass) TmuxBackend > list() and inventory() surface only orch-spawned panes [1.71ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.36ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [2.31ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [1.12ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [53.02ms]
(pass) TmuxBackend > waitAgentStatus fails immediately when the pane has no presence key [0.20ms]
(pass) TmuxBackend > read returns captured text and throws when capture-pane fails [0.28ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [0.37ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.73ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.28ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [1.12ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.35ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.61ms]
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [25.49ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [32.37ms]
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [30.55ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [0.43ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [49.01ms]

test\broker-governance.test.ts:
(pass) daemon governWrite enforcement > unscoped actor bypasses ownership and the wall [22.38ms]
(pass) daemon governWrite enforcement > owner may write to its own agent [22.12ms]
(pass) daemon governWrite enforcement > a foreign owner in the same workspace is refused [22.31ms]
(pass) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [22.45ms]
(pass) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [24.11ms]
(pass) daemon governWrite enforcement > --steal transfers ownership to the actor [22.67ms]
(pass) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [21.04ms]

test\broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [24.57ms]
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [0.27ms]
(pass) broker ownership and workspace governance > work-loop selection stays within the origin workspace [25.69ms]

test\broker-routing.test.ts:
(pass) broker CLI routing > write refuses when the daemon socket is unavailable [6478.88ms]
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [1197.24ms]
(pass) broker CLI routing > dispatch failure is daemon-absent, not herdr-not-found [5551.02ms]

test\check-bridge.test.ts:
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.83ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.47ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / config seams [0.28ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [2.55ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.52ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.12ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [1.88ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [4.03ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [1.48ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [2.16ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke-test exemption is documented and load-bearing [0.46ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has exactly one identity-branch line and it is exempted [151.99ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.17ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.04ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [5.55ms]

test\claude-adapter.test.ts:
(pass) Claude adapter > declares its identity and capabilities [0.53ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.49ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.50ms]
(pass) Claude adapter > detects state from a live presence status [6.23ms]
(pass) Claude adapter > extracts result.json before transcript and native output [4.81ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [7.71ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [445.09ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [2819.37ms]
(pass) Claude adapter > exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session) [264.59ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed ORCH_AGENT_KEY [243.62ms]

test\claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [773.65ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [1733.71ms]
(pass) claude-hooks shim > under node > writes status.json for a valid key [434.69ms]
(pass) claude-hooks shim > under deno > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [566.41ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under deno > exits 1 loudly on a present-but-malformed key [1760.55ms]
(pass) claude-hooks shim > under deno > writes status.json for a valid key [632.38ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [641.42ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [2467.07ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [354.15ms]
(skip) claude-hooks shim tests need the dist bundle

test\clean-worktrees.test.ts:
Preparing worktree (new branch 'orch/empty')
Preparing worktree (new branch 'orch/merged')
Preparing worktree (new branch 'orch/unmerged')
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [12605.33ms]
Preparing worktree (new branch 'orch/discard')
fatal: 'refs/heads/orch/discard' - not a valid ref
(pass) clean worktrees > --force discards an unmerged orphan and its branch [6501.47ms]

test\cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.37ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.30ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.32ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.24ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.49ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.21ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [130.21ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [0.63ms]
(pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [241.18ms]
(pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [0.92ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [5842.42ms]
(pass) headless common path: identity key -> presence > one adapter uses opaque keys across headless and tmux backend routes [0.23ms]
(pass) headless common path: identity key -> presence > workspaceOf reads the workspace from the structured key, not a regex [0.12ms]

test\cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.35ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [91.65ms]
(pass) tmux backend registry and capabilities > exposes pane capabilities [0.22ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.25ms]
(pass) tmux backend registry and capabilities > serializes tmux identities as one flat key [0.29ms]
(pass) tmux backend registry and capabilities > rejects an empty handle without invoking tmux [0.08ms]
(pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [55.92ms]
(pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [0.34ms]
(pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [0.20ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-workspace [0.39ms]

test\close-always.test.ts:
{"closed":["pane-name","pane-key","pane-id"],"requested":3,"ok":3,"stream":false}
(pass) close always works > closes a foreign-workspace target by name, key, or pane id [2527.97ms]
(pass) close always works > dead pane-less close is a successful no-op that reaps registry and presence [3285.40ms]
(pass) close always works > steer remains blocked by the workspace wall [0.26ms]

test\cmd-lock-bridge.test.ts:
(pass) pi-bridge command-lock interception > wraps a matching locked command in acquireΓåÆrelease around the tool call [22.44ms]
(pass) pi-bridge command-lock interception > leaves a non-matching command untouched ΓÇö no acquire, no release [2.35ms]
(pass) pi-bridge command-lock interception > only bash tool calls are intercepted ΓÇö a non-bash tool never acquires [0.83ms]

test\cmd-lock.test.ts:
(pass) command lock > acquire and release round-trip [2.67ms]
(pass) command lock > second acquire blocks until first releases [63.52ms]
(pass) command lock > dead-pid lock is reaped [5.21ms]
(pass) command lock > release with wrong pid refuses [3.29ms]
bun test held by agent-a (pid 12212)
(pass) command lock > matches locked command prefixes and probes settings [6.91ms]
(pass) command lock > run propagates the child exit code [90.56ms]

test\codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [0.34ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [0.47ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [0.85ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [1.13ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [0.96ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [2259.36ms]

test\command-workspace-fields.test.ts:
(pass) command workspace fields > status and wall entities use persisted workspace instead of serialized-key text [74.20ms]
(pass) command workspace fields > status reports a mixed pi and Claude fleet with the same identity fields [60.54ms]

test\commands-clean.test.ts:
(pass) commands/clean > reaps dead agent dirs but preserves live pids [15.95ms]

test\commands-control.test.ts:
(pass) commands/control > parses dispatch flags without losing prompt words [13.11ms]
(pass) commands/control > parses --then destination and note [0.18ms]
(pass) commands/control > adds worker header unless raw [0.25ms]

test\commands-daemon.test.ts:
(pass) commands/daemon > parses governance and validates daemon status [15.25ms]
(pass) commands/daemon > reads only a positive integer lock pid [3.02ms]

test\commands-events.test.ts:
(pass) commands/events > parses filters and scope flags [9.30ms]
(pass) commands/events > a dropped subscription names the command that recovers it [0.07ms]
(pass) commands/events > rejects malformed event and labels sinks [0.25ms]

test\commands-index.test.ts:
(pass) commands/index > does not gate help or noninteractive commands [7.24ms]
(pass) commands/index > reads a package version string [0.59ms]

test\commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [0.66ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [0.24ms]

test\commands-panes.test.ts:
(pass) commands/panes > pane identity remains backend-neutral [5.82ms]
(pass) commands/panes > exports the pane listing command directly [0.15ms]

test\commands-queue.test.ts:
(pass) commands/queue > round-trips add/list/cancel on an isolated store [30.15ms]
No queue tasks.
(pass) commands/queue > renders empty queues without throwing [0.30ms]

test\commands-results.test.ts:
(pass) commands/results > validates and extracts question payloads [3.61ms]
(pass) commands/results > formats invalid and recent timestamps [0.23ms]
(pass) commands/results > routes a seeded result.json through the command module [146.21ms]
(pass) commands/results > orch tail resolves a non-pi target through that adapter's session view [286.29ms]
(pass) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [624.51ms]
(pass) commands/results > orch tail -n keeps last-N rendered entries for a pi session [732.37ms]
(pass) commands/results > orch session reports the pi entry count [551.17ms]
(pass) commands/results > orch session shows zero entries for an adapter view without them [109.35ms]

test\commands-review.test.ts:
(pass) commands/review > uses the short orch branch as review target [2.25ms]
(pass) commands/review > falls back to branch then pane [0.08ms]

test\commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.82ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [1.16ms]
(pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [1.66ms]
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > a consistent selection records silently and never prompts [0.43ms]
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > no installed entrypoint leaves the selection untouched [0.15ms]
Runtime mismatch: the installed orch entrypoint (/usr/local/bin/orch) is a node build, but you selected bun.
  A bun install requires a rebuild: bun run build:dev
  recording node to match the installed entrypoint ΓÇö re-run orch setup --runtime bun after bun run build:dev to switch
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > a mismatch records nothing without confirmation ΓÇö the consistent value wins [0.23ms]
Runtime mismatch: the installed orch entrypoint (/usr/local/bin/orch) is a node build, but you selected bun.
  A bun install requires a rebuild: bun run build:dev
  recording bun ΓÇö pending rebuild; run bun run build:dev to make it real
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > a mismatch records the selection only on explicit confirmation [0.20ms]
(pass) commands/setup > reconcileRuntimeToEntrypoint (11.1) > non-interactive never prompts and records the consistent value [0.16ms]

test\commands-spawn.test.ts:
Runtime mismatch: the installed orch entrypoint (/usr/local/bin/orch) is a node build, but you selected bun.
  A bun install requires a rebuild: bun run build:dev
  recording node to match the installed entrypoint ΓÇö re-run orch setup --runtime bun after bun run build:dev to switch
(pass) commands/spawn > parses spawn flags and rejects no implicit adapter assumptions [0.36ms]
(pass) commands/spawn > identifies pi launchers and preserves raw prompt [0.14ms]

test\commands-status.test.ts:
(pass) commands/status > derives view fields from seeded presence [3.44ms]
(pass) commands/status > marks dead presence as exited [1.89ms]
(pass) commands/status > shared status row carries presence-derived fields [0.80ms]
(pass) commands/status > json branch and local table branch derive identical rows apart from host [0.15ms]
(pass) commands/status > formats workspace labels and warnings [0.24ms]

test\commands-target.test.ts:
(pass) commands/target > splits known flags and preserves positional args [2.60ms]
(pass) commands/target > extracts target and joined prompt [0.31ms]
(pass) commands/target > reads only structured result text [0.06ms]
(pass) commands/target > quotes remote args and ORCH_DIR safely [0.24ms]
(pass) commands/target > lists only live serialized identity presence entries [9.97ms]

test\config-precedence.test.ts:
(pass) config precedence > returns a defaults value when no override is set [6.61ms]
(pass) config precedence > applies defaults when config, env, and flag are absent [2.23ms]
(pass) config precedence > uses env over config and flag over env [2.83ms]
(pass) config precedence > parses notify entries and hosts into expected shapes [5.05ms]
(pass) config precedence > reports a helpful validation error for invalid config [2.88ms]

test\config-watch.test.ts:
(pass) watchConfig > loads initially and applies a valid edit after the debounce [66.47ms]
(pass) watchConfig > keeps the last-good config, warns once, and recovers [444.62ms]
(pass) watchConfig > reloads on a touched reload.signal without a settings edit [57.03ms]
(pass) watchConfig > stop prevents further callbacks [449.15ms]

test\config.test.ts:
(pass) loadConfig > refuses to invent a configuration when settings.json is missing [7.13ms]
(pass) loadConfig > requires a top-level runtime and never defaults it [7.86ms]
(pass) loadConfig > rejects an unrecognized runtime naming the accepted values [9.68ms]
(pass) loadConfig > rejects a runtime misplaced under defaults [11.29ms]
(pass) loadConfig > reads the declared runtime [8.79ms]
(pass) loadConfig > parses every supported settings section [17.79ms]
(pass) loadConfig > rejects a file without the current schemaVersion [7.37ms]
(pass) loadConfig > rejects invalid JSON loudly [8.34ms]
(pass) loadConfig > names the key path for invalid fields [9.35ms]
(pass) loadConfig > rejects unknown settings keys [11.37ms]
(pass) loadConfig > parses models.allowed as a string array [21.16ms]
(pass) loadConfig > rejects old settings keys [29.44ms]
(pass) loadConfig > rejects legacy notify type and unknown ids [19.56ms]
(pass) loadConfig > applies timeout defaults and disables cross-workspace writes by default [10.62ms]
(pass) loadConfig > rejects a host without dest [9.25ms]
(pass) loadConfig > rejects an unknown id in installed.adapters [10.49ms]
(pass) loadConfig > rejects defaults.adapter not present in installed.adapters [9.58ms]
(pass) loadConfig > rejects when settings.json is absent but a legacy config.toml exists [10.28ms]
(pass) allowedModelPatterns > returns the built-in defaults when config is absent [5.23ms]
(pass) allowedModelPatterns > returns the configured patterns when set [11.71ms]
(pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or installed entry [11.19ms]
(pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [17.86ms]
(pass) writeSettingsRuntime > a different runtime replaces the single value in place [16.78ms]
(pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [18.94ms]
(pass) reapUnreadableSettings > leaves a readable file alone [5.72ms]
(pass) writeSettingsInstalled > round-trips both provider arrays [16.70ms]
(pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [34.48ms]
(pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [10.19ms]
(pass) writeSettingsDefault > is idempotent when rewriting the same value [45.67ms]
(pass) writeSettingsDefault > refuses to write through an out-of-version settings file [7.74ms]
(pass) writeSettingsDefault > switches defaults.adapter between two installed ids and loads clean [8.31ms]
(pass) config precedence > uses the fallback when env and settings.json omit a setting [9.23ms]
(pass) config precedence > uses the settings.json value over the fallback [9.67ms]
(pass) config precedence > uses the ORCH_* environment value over settings.json [8.26ms]
(pass) config precedence > uses an explicit flag override over the environment [0.71ms]
(pass) resolveSetting > uses flag, environment coercion, config, then fallback in precedence order [1.01ms]
(pass) resolveWithSource > reports the winning source at each precedence level [0.76ms]

test\control-dispatch.test.ts:
(pass) deliverControl > steers pi through its presence inbox [94.20ms]
(pass) deliverControl > warns and succeeds when claude keys fallback delivers [67.37ms]
steering headless~local~claude-fail via claude keys fallback (degraded delivery)
(pass) deliverControl > fails when claude keys fallback cannot deliver [82.29ms]
(skip) deliverControl > executes codex steer command and accepts exit zero
(skip) deliverControl > treats a nonzero codex command exit as failure
(pass) deliverControl > fails unsupported steer and setModel capabilities [91.96ms]
(pass) deliverControl > requires presence for inbox delivery [66.38ms]

test\daemon-events.test.ts:
(pass) daemon presence events > an RPC subscriber receives a presence transition [177.51ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [1.68ms]
(pass) daemon presence events > a blocked transition drives command sink delivery [587.62ms]
(pass) daemon presence events > a dead daemon closes the subscription instead of falling back to files [25.00ms]
(pass) daemon presence events > a caller-initiated stop is not reported as a disconnect [99.27ms]

test\daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [4.08ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [4.62ms]
(pass) daemon lifecycle > rejects malformed locks and a socket probe that fails [5.37ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [3.77ms]
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
  create    astro                Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [87.60ms]
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [7.14ms]
(pass) daemon lifecycle > rejects a recycled pid identity [2.87ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [2.84ms]

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
  add       @evan/duckdb         Add a dependency to package.json (bun a)
  remove    browserify           Remove a dependency from package.json (bun rm)
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
  create    vite                 Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon RPC > round-trips a call over the real unix socket [12.11ms]
(pass) daemon RPC > returns an error for an unknown method [9.23ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [50.42ms]
(pass) daemon RPC > delivers pushed subscription events [37.03ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [38.32ms]
(pass) daemon RPC > has a catchable absent-daemon error [3.21ms]

test\doctor-backends.test.ts:
(pass) doctor backend and presence checks > reports every registered backend and boolean capability fields [86.57ms]
(pass) doctor backend and presence checks > passes with herdr active while an installed tmux sits outside a session [0.15ms]
(pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.14ms]
(pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [0.18ms]
(pass) doctor backend and presence checks > fails when any installed backend is unavailable, active or not [0.09ms]
(pass) doctor backend and presence checks > honours the configured default over the probe order [0.07ms]
(pass) doctor backend and presence checks > reports only records missing the current schema stamp [5.17ms]

test\doctor-checks.test.ts:
(pass) doctor notification-sink checks > reports no sinks as healthy [40.91ms]
(pass) doctor notification-sink checks > rejects a webhook with a malformed URL [2.91ms]
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [49.46ms]
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [37.78ms]

test\doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [96.33ms]
(pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [109.04ms]
(pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [755.87ms]
(pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [1218.43ms]
(pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [340.68ms]
(pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [171.85ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [58.87ms]
(pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [74.73ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [104.38ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [1.76ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [3.56ms]

test\doctor-hosts.test.ts:
(pass) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [164.61ms]
(pass) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [156.55ms]
(pass) doctor remote host checks > flags a remote orch version/schema mismatch in detail [237.63ms]
(pass) doctor remote host checks > reports no remote hosts configured as healthy [321.23ms]

test\doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env node as node [8.06ms]
(pass) shebangRuntime > reads #!/usr/bin/env bun as bun [9.41ms]
(pass) shebangRuntime > reads #!/usr/bin/env deno as deno [4.94ms]
(pass) shebangRuntime > reads #!/usr/local/bin/node as node [4.24ms]
(pass) shebangRuntime > does not mistake a longer binary name for a runtime [3.24ms]
(pass) shebangRuntime > returns null for a file with no shebang [10.73ms]
(pass) shebangRuntime > returns null for an unreadable path [4.52ms]
(pass) runningRuntime > reports the runtime this suite is executing under [0.32ms]
(pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [12.34ms]
(pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [7.82ms]
(pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [9.21ms]
(pass) doctor runtime verdict table > declared node but executing under bun fails [7.10ms]
(pass) doctor runtime verdict table > declared bun but executing under node fails just as loudly [4.37ms]
(pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [4.23ms]
(pass) doctor runtime verdict table > declared runtime absent from PATH fails [18.64ms]
(pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [57.22ms]
(pass) doctor runtime verdict table > remediation names both directions ΓÇö rebuild, or re-record the declaration [9.07ms]
(pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [107.43ms]

test\doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [334.09ms]
(pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [313.59ms]
(pass) doctor stale presence safety > no dead agents leaves nothing to remove [348.09ms]

test\doctor-unscoped-tasks.test.ts:
(pass) doctor unscoped queue tasks > only scoped tasks pass [123.26ms]
(pass) doctor unscoped queue tasks > reports a null-workspace row as reappable and names it [66.25ms]
(pass) doctor unscoped queue tasks > stays report-only ΓÇö no pre-selected destructive fix [67.64ms]
(pass) doctor unscoped queue tasks > the check is wired into runDoctor [153.48ms]

test\doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [0.26ms]
(pass) runDoctor > runs on an unconfigured install without failing for want of settings.json [60.21ms]
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [63.66ms]
(pass) runDoctor > reports an absent daemon as optional [62.45ms]
(pass) runDoctor > reports and fixes a stale daemon lock [62.69ms]
(pass) runDoctor > accepts a live daemon and an answerable socket [184.01ms]
(pass) runDoctor > warns when the live daemon code hash is stale [89.89ms]
(pass) runDoctor > fails on an invalid lock and an unanswerable live socket [140.68ms]
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [4.46ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [4.44ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [5.11ms]
(pass) runDoctor > reports a dead presence pid and corrupt spawn registry lines [91.77ms]
(pass) runDoctor > bins check is driven by the installed set and offers no fix [29.72ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [2.59ms]
(pass) runDoctor > validates configured notifier adapters [1326.96ms]
notify: could not load settings.json: C:\Users\Bryan\AppData\Local\Temp\orch-doctor-RG4D7I\settings.json: this settings file has invalid values: Γ£û Invalid input: expected number, received string ΓåÆ at queue.max_retries Fix those keys by hand, or re-record the file with: orch setup
(pass) runDoctor > reports invalid config and accepts missing config [495.71ms]
(pass) runDoctor > never throws when individual checks encounter broken inputs [382.35ms]

test\herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [2.95ms]
(pass) herdr and notification hardening > falls back to a real name when an adapter id is blank [0.16ms]
(pass) herdr and notification hardening > nameless notifications use a workspace label, never a bare pane key [0.50ms]

test\herdr-pane-state.test.ts:
(pass) retryableErrorMessage classifier > no assistant message ΓåÆ undefined [0.34ms]
(pass) retryableErrorMessage classifier > assistant that did not stop on error ΓåÆ undefined [0.06ms]
(pass) retryableErrorMessage classifier > error stop with non-retryable text ΓåÆ undefined [0.34ms]
(pass) retryableErrorMessage classifier > error stop with retryable text ΓåÆ the message [0.16ms]
(pass) retryableErrorMessage classifier > non-string retryable errorMessage is stringified before matching [0.12ms]
(pass) retryableErrorMessage classifier > only the last assistant turn is classified [0.17ms]
(pass) createPaneStateMachine state ordering > run ΓåÆ blocked ΓåÆ unblock ΓåÆ idle debounce [11.27ms]
(pass) createPaneStateMachine state ordering > dedupes unchanged state [3.07ms]
(pass) createPaneStateMachine state ordering > retryable end holds working, then settles to blocked after grace [42.68ms]
(pass) createPaneStateMachine state ordering > duplicate end after settling does not publish a false idle [33.51ms]
(pass) createPaneStateMachine state ordering > openSession forces a publish even when state is unchanged [2.65ms]

test\identity.test.ts:
(pass) serializeIdentity / parseIdentity round-trip > round-trips herdr [0.17ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with % handle [0.06ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with : and % handle [0.02ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips headless pid handle [0.02ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips empty workspace [0.02ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips separator inside parts [0.02ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips slash inside parts [0.02ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips percent-code-lookalike [0.02ms]
(pass) serializeIdentity / parseIdentity round-trip > serialized key is a single flat segment (no nested path) [0.10ms]
(pass) serializeIdentity / parseIdentity round-trip > backend namespaces prevent collisions across equal workspace/handle [0.11ms]
(pass) malformed input > rejects wrong segment count [0.22ms]
(pass) malformed input > rejects empty key [0.09ms]
(pass) malformed input > rejects empty backend or handle on serialize [0.17ms]
(pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.06ms]
(pass) malformed input > tryParseIdentity parses a valid key [0.05ms]

test\notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > skips an unavailable adapter without affecting available adapters [0.83ms]
notify: webhook notifier has invalid configuration
(pass) notifier registry and built-in adapters > reports malformed required configuration instead of throwing [0.41ms]
(pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [1.15ms]
(pass) notifier registry and built-in adapters > command adapter passes canonical JSON on stdin [112.41ms]
(pass) notifier registry and built-in adapters > desktop fallback selects notify-send, then WSL notify when it fails [6.90ms]
notify: bad sink failed
(pass) notifier registry and built-in adapters > isolates delivery failures and still delivers to other adapters [0.63ms]

test\notify-events-format.test.ts:
(pass) notification and presence event formatting > workspaceColor is stable and returns a palette hex [0.14ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.24ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.24ms]
(pass) notification and presence event formatting > webhook payload includes workspace and workspaceColor [0.77ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [0.66ms]
(pass) notification and presence event formatting > derivePresenceTransition derives workspace from identity keys [0.18ms]

test\notify-sinks.test.ts:
(pass) notify sinks > delivers command sink payload as JSON [103.50ms]
(pass) notify sinks > loadSinks parses command and webhook declarations [2.36ms]

test\notify.test.ts:
(pass) notify > parses valid sinks and applies default on states [3.67ms]
(pass) notify > delivers only to sinks whose on filter matches the event [115.29ms]
(pass) notify > command sink writes the event payload as JSON on stdin [97.76ms]
(pass) notify > titles lead with exactly one terminal state and agent [0.41ms]
(pass) notify > webhook failure is non-fatal and reports a warning [28.98ms]

test\orchd-rpc-reconnect.test.ts:
(pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [332.03ms]
(pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1122.05ms]

test\orchd-rpc-replay.test.ts:
(pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [2.30ms]
(pass) orchd RPC replay buffer > drops the oldest events and reports a replay gap [5.17ms]

test\orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [96.48ms]

test\orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [18.45ms]
(pass) orchd RPC transports > round-trips over the TCP fallback transport [61.07ms]

test\outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [70.53ms]

test\outbox.test.ts:
(pass) outbox delivery > selects pending messages and delivers each message once [67.78ms]
(pass) outbox delivery > keeps failed messages pending until their backoff expires [59.43ms]

test\owner-scoping.test.ts:
(pass) fleet ownership scoping > owner token uses ORCH_OWNER, then registered backend caller identity [2.50ms]
(pass) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [64.26ms]
(pass) fleet ownership scoping > headless bulk operations refuse without an owner token [631.45ms]
{"closed":["mine"],"requested":1,"ok":1,"stream":false}
(pass) fleet ownership scoping > close --all leaves foreign-owned records untouched [41.23ms]
(pass) fleet ownership scoping > explicit foreign target fails and names its owner [497.46ms]
(pass) fleet ownership scoping > --force allows an explicit foreign target [1825.98ms]

test\ownership.test.ts:
(pass) agent ownership > round-trips an owner [63.42ms]
(pass) agent ownership > allows unowned and same-owner writes [58.16ms]
(pass) agent ownership > denies foreign writes and supports stealing [57.53ms]

test\parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [0.36ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.29ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.55ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [1.13ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.51ms]

test\pi-model-control.test.ts:
(pass) splitThinkingSuffix > splits a valid ladder effort off the bare id [0.82ms]
(pass) splitThinkingSuffix > leaves a bare model untouched [0.18ms]
(pass) splitThinkingSuffix > keeps a trailing colon token that is not a thinking level as part of the id [0.09ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > looks up the BARE id and returns the effort suffix separately [3.99ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > retries until a still-booting registry answers [23.52ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > throws when the registry never yields the model [15.46ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > rejects a model outside the allowlist before any registry lookup [1.94ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > rejects a token without a provider/id shape [1.07ms]
(pass) isAllowedModel > always allows openai-codex, applies globs to the rest [1.56ms]
(pass) createModelControl.applyControlCommand > applies a suffixed model command and records a success outcome [3.47ms]
(pass) createModelControl.applyControlCommand > records a failure outcome when the model is rejected [3.11ms]
(pass) createModelControl.applyControlCommand > applies a thinking command directly [2.73ms]

test\pid-liveness.test.ts:
(pass) pidAlive liveness contract (shared by pi peers) > EPERM means the process exists under another user ΓÇö alive [6.93ms]
(pass) pidAlive liveness contract (shared by pi peers) > ESRCH means no such process ΓÇö dead [0.06ms]
(pass) pidAlive liveness contract (shared by pi peers) > the current process is alive [0.06ms]
(pass) pidAlive liveness contract (shared by pi peers) > non-positive and non-numeric pids are rejected without signalling [0.11ms]

test\presence-schema.test.ts:
(pass) presence status schema > reads a spawned namespaced identity with backend, workspace, handle, and adapter [129.12ms]
(pass) presence status schema > orch status JSON exposes the complete spawned identity fields [122.09ms]
(pass) presence status schema > status and list report the same agent identity [155.29ms]
(pass) presence status schema > mixed pi and Claude status rows carry the same identity field set [120.78ms]
(pass) presence status schema > rejects a status record that carries no schema stamp [116.85ms]
(pass) presence status schema > rejects a status record stamped with a non-current schema [114.08ms]
(pass) presence status schema > a malformed record is skipped without hiding the valid records beside it [119.91ms]
(pass) presence status schema > persists the complete spawned identity record [10.46ms]

test\queue-workspace-replay.test.ts:
(pass) queue workspace replay > persists workspace through append-only replay [27.33ms]
(pass) queue workspace replay > a malformed null-workspace row replays but is never claimable [51.61ms]
(pass) queue workspace replay > replays separate workspace values for multiple tasks [49.42ms]
(pass) queue workspace replay > selects only tasks eligible for the requested workspace [63.77ms]

test\queue.test.ts:
(pass) queue > add then list shows a queued task [58.95ms]
(pass) queue > exactly one claimer wins, including parallel attempts [65.43ms]
(pass) queue > replays done, failed, and retry transitions [77.54ms]
(pass) queue > cancels queued tasks and returns an error result for claimed tasks [69.00ms]
(pass) queue > picks queued tasks FIFO, honoring the agent constraint [62.16ms]
(pass) queue > caps retries: requeue below the cap, terminal failed at it [60.12ms]
(pass) queue > settles a claimed task to done and blocks any later claim [55.44ms]
(pass) queue > exactly one of two racing claimers wins [51.83ms]
(pass) queue > rejects an unscoped task at enqueue [47.91ms]
(pass) queue > a malformed null-workspace row is skipped at claim, never dispatched [72.28ms]

test\remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [1110.99ms]
(pass) async remote fan-out > returns a typed dead-host failure [264.08ms]
(pass) async remote fan-out > returns a typed timeout failure [527.10ms]
(pass) async remote fan-out > returns a typed non-JSON failure [165.38ms]
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [987.24ms]

test\remote.test.ts:
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.36ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.33ms]

test\review.test.ts:
Preparing worktree (new branch 'orch/feature-1')
(pass) review plumbing > lists only done worktree agents with commits ahead [3851.97ms]
Preparing worktree (new branch 'orch/iterate-1')
(pass) review plumbing > reject re-dispatches feedback through the adapter inbox [5007.88ms]
Preparing worktree (new branch 'orch/approve-1')
fatal: 'refs/heads/orch/approve-1' - not a valid ref
(pass) review plumbing > approve merges and removes the worktree and branch [4191.09ms]
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
(pass) review plumbing > conflicting approval aborts without changing either branch [2525.73ms]
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
(pass) review plumbing > non-fast-forward approval creates a merge commit [2988.87ms]

test\routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves origin workspace selection [23.39ms]
(pass) store hardening > a fresh store creates the full current schema with WAL enabled [21.48ms]
(pass) store hardening > a steal updates ownership only when the observed owner still matches [22.11ms]
(pass) store hardening > the conditional claim is exactly once [20.83ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [313.93ms]

test\settings-command.test.ts:
(pass) orch settings > --json reports value + source per setting, settings.json winning over defaults [777.35ms]
(pass) orch settings > --json reports env as the winning source over settings.json [1183.69ms]
C:\Users\Bryan\AppData\Local\Temp\orch-settings-cmd-Hoz30t\settings.json: defaults.adapter: "codex" is not an installed adapter ΓÇö installed: pi, claude; re-run orch setup
(pass) orch settings > --harness switches defaults.adapter between installed ids and rejects a non-installed id [921.88ms]
C:\Users\Bryan\AppData\Local\Temp\orch-settings-cmd-JWSk1L\config.toml: legacy config.toml detected ΓÇö settings now live in C:\Users\Bryan\AppData\Local\Temp\orch-settings-cmd-JWSk1L\settings.json; re-run orch setup (the old values are not read)
(pass) orch settings > a load error surfaces loudly with no partial table [199.89ms]

test\setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [6.70ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.29ms]
(pass) notifier setup logic > renders a command entry that loadConfig can parse [3.70ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [1.28ms]

test\setup-smoke.test.ts:
(pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [2.57ms]
(pass) runSetupSmoke (12.5) > a rejected dispatch fails loudly and sets a non-zero exit code [1.53ms]
(pass) runSetupSmoke (12.5) > a dispatch that is accepted but yields no result times out and fails non-zero [1.19ms]
(pass) runSetupSmoke (12.5) > a failed spawn fails loudly before any dispatch [0.70ms]

test\skew-guard.test.ts:
(pass) CLI daemon skew guard > refuses mutating commands and names both hashes plus the reload remedy [953.72ms]
(pass) CLI daemon skew guard > allows read-only commands while the daemon is skewed [1197.61ms]
(pass) CLI daemon skew guard > --stale-ok overrides refusal for a mutating command [5568.27ms]
228 | }
229 | 
230 | function connect(pathOrPort: string | number, timeoutMs: number): Promise<Socket> {
231 |   return new Promise((resolve, reject) => {
232 |     const socket = typeof pathOrPort === "string"
233 |       ? createConnection(pathOrPort)
      ^
error: connect ENOENT C:\Users\Bryan\AppData\Local\Temp\orch-skew-guard-ASBVK3\orchd.sock
   errno: -4058,
 syscall: "connect",
    port: undefined,
 address: "C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-skew-guard-ASBVK3\\orchd.sock",
    code: "ENOENT"

      at afterConnect (node:net:1154:39)
      at connectError (node:net:352:48)
      at doConnect (unknown:1:1)
      at kConnectPipe (node:net:367:19)
      at internalConnect (node:net:1062:93)
      at connect (node:net:634:58)
      at C:\Users\Bryan\Documents\orch\src\daemon\rpc.ts:233:9
      at new Promise (native:1:11)
      at connect (C:\Users\Bryan\Documents\orch\src\daemon\rpc.ts:341:9)
      at connectDaemon (C:\Users\Bryan\Documents\orch\src\daemon\rpc.ts:376:27)
      at C:\Users\Bryan\Documents\orch\test\skew-guard.test.ts:114:27
(fail) CLI daemon skew guard > doctor reports skew as a warning without making skew itself a failure [113.37ms]
(pass) CLI daemon skew guard > does not treat an absent daemon as skew and auto-starts a fresh daemon [2288.71ms]

test\spawn-identity.test.ts:
(pass) one key per pane spawn (12.1) > the registry row key equals the ORCH_AGENT_KEY env key, and the pane handle is a separate field [26.61ms]
(pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [25.01ms]

test\spawn-limits.test.ts:
(pass) spawn limits > schema loads global and workspace caps [2.40ms]
(pass) spawn limits > rejects invalid cap %s with file and key [2.46ms]
(pass) spawn limits > rejects invalid cap %s with file and key [1.58ms]
(pass) spawn limits > rejects invalid cap %s with file and key [1.63ms]
(pass) spawn limits > omitted fleet caps normalize to defaults [1.56ms]
(pass) spawn limits > global boundary refusal data counts the whole request [8.48ms]
(pass) spawn limits > one workspace may use the full global allotment [3.79ms]
(pass) spawn limits > workspace cap is independent of global headroom [3.46ms]
(pass) spawn limits > uncapped workspace is bounded only by global count [2.48ms]
(pass) spawn limits > dead pid records free capacity [2.14ms]
(pass) spawn limits > foreign panes never count [2.07ms]
(pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [73.64ms]
(pass) spawn limits > doctor accepts satisfiable limits [77.03ms]

test\transcript.test.ts:
(pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [0.22ms]
(pass) lastAssistantFromJsonl > undefined for blank or empty input [0.05ms]
(pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.08ms]
(pass) assistantText > reads role-tagged records [0.04ms]
(pass) assistantText > reads the {type:'assistant'} envelope with a nested message [0.04ms]
(pass) assistantText > undefined for non-assistant roles [0.04ms]
(pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.07ms]
(pass) contentText empty-string part handling > an all-empty content array yields undefined [0.05ms]
(pass) contentText empty-string part handling > a bare empty string yields undefined [0.03ms]

test\wall-single-owner.test.ts:
(pass) workspace wall ownership > keeps the wall decision primitive in one source module [13.06ms]

test\work-notify.test.ts:
(pass) orch work notifications > delivers a presence transition through a configured command sink [445.92ms]

test\worker-prompt.test.ts:
(pass) worker prompt capability composition > work loop gives codex the base header without orch_ask [133.77ms]
(pass) worker prompt capability composition > work loop gives pi the orch_ask header clause [151.54ms]
(pass) worker prompt capability composition > orch run composition selects the same header per adapter [32.11ms]
(pass) worker prompt capability composition > locked-commands clause names the commands when the list is non-empty [1.06ms]
(pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.50ms]
(pass) worker prompt capability composition > events strip both worker header variants [3.41ms]

test\worker-tools.test.ts:
(pass) worker tool policy > default spawn omits peer tools [1.20ms]
(pass) worker tool policy > explicitly disabled peer tools are omitted [0.62ms]
(pass) worker tool policy > config enables all peer tools [0.37ms]

test\workspace-policy.test.ts:
(pass) workspace policy > reads workspaces from serialized identity keys [0.82ms]
(pass) workspace policy > resolves workspace names through records and functions [1.06ms]
(pass) workspace policy > compares serialized keys by their workspace [0.38ms]
(pass) workspace policy > enforces the workspace wall [0.59ms]
(pass) workspace policy > scopes serialized identity keys to the current workspace [0.70ms]
(pass) workspace policy > null current workspace leaves items unscoped [0.25ms]
(pass) workspace policy > 2.7 status displays the reported workspace identity field [72.09ms]
(pass) workspace policy > 6.6 structured identity drives status and policy, not serialized key text [65.52ms]

test\workspace-walls.test.ts:
(pass) workspace helpers > extracts workspace ids only from identity keys [0.66ms]
(pass) workspace helpers > derives an entity workspace from the identity key [0.62ms]
(pass) workspace helpers > returns the same entities when all workspaces are requested [306.06ms]
(pass) workspace wall writes > allows a write within the same workspace [0.65ms]
(pass) workspace wall writes > denies a cross-workspace write with both workspaces in the reason [0.32ms]
(pass) workspace wall writes > applies the same wall rule to herdr, tmux, and headless identities [0.80ms]
(pass) workspace wall writes > allows a cross-workspace write with an explicit override [0.35ms]
(pass) workspace wall writes > allows legacy unscoped targets [0.29ms]
(pass) workspace-aware queued task selection > excludes tasks pinned to another workspace [0.54ms]
(pass) workspace-aware queued task selection > skips a malformed unscoped task in every workspace [0.37ms]
(pass) workspace-aware queued task selection > selects the earliest eligible task and respects agent constraints [0.40ms]

test\worktree.test.ts:
Preparing worktree (new branch 'orch/fixes-1')
(pass) worktree primitives > creates and lists an agent worktree on an orch branch [1354.34ms]
Preparing worktree (new branch 'orch/feature')
(pass) worktree primitives > detects commits ahead of a base branch [2853.56ms]
Preparing worktree (new branch 'orch/remove-me')
(pass) worktree primitives > removes an agent worktree [2098.71ms]
fatal: not a git repository (or any of the parent directories): .git
(pass) worktree primitives > rejects a non-repository path with a clear error [220.33ms]

3 tests skipped:
(skip) claude-hooks shim tests need the dist bundle
(skip) deliverControl > executes codex steer command and accepts exit zero
(skip) deliverControl > treats a nonzero codex command exit as failure


1 tests failed:
(fail) CLI daemon skew guard > doctor reports skew as a warning without making skew itself a failure [113.37ms]

 535 pass
 3 skip
 1 fail
 1987 expect() calls
Ran 539 tests across 91 files. [131.97s]
