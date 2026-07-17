bun test v1.3.14 (0d9b296a)

test\adapter-allowlist.test.ts:
(pass) pi adapter tool allowlist > declares exactly the built-ins and bridge tools [48.25ms]
(pass) pi adapter tool allowlist > restricts interactive pi launches to the allowlist [0.29ms]
(pass) pi adapter tool allowlist > restricts headless pif launches and preserves the prompt [0.22ms]

test\adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [9.99ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [86.50ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [7.14ms]
(pass) adapter and runtime hardening > headless generates one safe presence key when no key is supplied [89.54ms]

test\adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.72ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.20ms]
(pass) PiAdapter > reads state from the presence status through store helpers [3.48ms]
(pass) PiAdapter > appends a steer message to the presence inbox [14.58ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [12.75ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [80.74ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > spawns a detached process and records its handle [951.94ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [1101.13ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [646.72ms]
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [283.43ms]
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [15.38ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [1.83ms]
(pass) HeadlessBackend > never signals an unrecorded pid [1.14ms]

test\backend-herdr.test.ts:
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [0.73ms]
(pass) HerdrBackend > maps close and list to herdr helpers [0.27ms]

test\backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [0.32ms]
(pass) TmuxBackend > reports tmux availability [43.74ms]
(pass) TmuxBackend > reflects the TMUX environment [0.34ms]
(pass) TmuxBackend > mints identity from the owning session [0.35ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.19ms]
(pass) TmuxBackend > list() and inventory() surface only orch-spawned panes [1.58ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.85ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [50.37ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.52ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [51.16ms]
(pass) TmuxBackend > waitAgentStatus fails immediately when the pane has no presence key [0.21ms]
(pass) TmuxBackend > read returns captured text and throws when capture-pane fails [0.33ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [0.37ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [1.37ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.38ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [1.10ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.32ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.61ms]
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [28.20ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [27.90ms]
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [71.22ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [2.03ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [358.06ms]

test\broker-governance.test.ts:
(pass) daemon governWrite enforcement > unscoped actor bypasses ownership and the wall [107.52ms]
(pass) daemon governWrite enforcement > owner may write to its own agent [92.31ms]
(pass) daemon governWrite enforcement > a foreign owner in the same workspace is refused [52.77ms]
(pass) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [91.32ms]
(pass) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [93.03ms]
(pass) daemon governWrite enforcement > --steal transfers ownership to the actor [74.45ms]
(pass) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [46.17ms]

test\broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [60.68ms]
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [0.90ms]
(pass) broker ownership and workspace governance > work-loop selection stays within the origin workspace [82.47ms]

test\broker-routing.test.ts:
(pass) broker CLI routing > write refuses when the daemon socket is unavailable [8006.87ms]
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [3111.70ms]
(pass) broker CLI routing > dispatch failure is daemon-absent, not herdr-not-found [7332.39ms]

test\claude-adapter.test.ts:
(pass) Claude adapter > declares its identity and capabilities [200.07ms]
(pass) Claude adapter > builds the interactive Claude launch command [1.51ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [3.68ms]
(pass) Claude adapter > detects state from a live presence status [16.96ms]
(pass) Claude adapter > extracts result.json before transcript and native output [14.18ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [4.17ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [4099.77ms]
(pass) Claude adapter > exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session) [960.62ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed ORCH_AGENT_KEY [718.32ms]

test\claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [2037.14ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [731.83ms]
(pass) claude-hooks shim > under node > writes status.json for a valid key [374.57ms]
(pass) claude-hooks shim > under deno > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [4374.54ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under deno > exits 1 loudly on a present-but-malformed key [798.06ms]
(pass) claude-hooks shim > under deno > writes status.json for a valid key [5232.06ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [1104.11ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [646.61ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [1559.67ms]
(skip) claude-hooks shim tests need the dist bundle

test\clean-worktrees.test.ts:
Preparing worktree (new branch 'orch/empty')
Preparing worktree (new branch 'orch/merged')
Preparing worktree (new branch 'orch/unmerged')
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [17940.48ms]
Preparing worktree (new branch 'orch/discard')
fatal: 'refs/heads/orch/discard' - not a valid ref
(pass) clean worktrees > --force discards an unmerged orphan and its branch [9946.61ms]

test\cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.38ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.41ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.27ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.37ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.53ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.22ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [140.76ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [0.29ms]
(pass) headless common path: identity key -> presence > spawn mints a filesystem-safe headless identity and creates its presence dir [510.80ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [3316.59ms]
(pass) headless common path: identity key -> presence > one adapter uses opaque keys across headless and tmux backend routes [2.36ms]
(pass) headless common path: identity key -> presence > workspaceOf reads the workspace from the structured key, not a regex [0.18ms]

test\cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.43ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [72.09ms]
(pass) tmux backend registry and capabilities > exposes pane capabilities [0.20ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.16ms]
(pass) tmux backend registry and capabilities > mints identity from a protected session seam [0.21ms]
(pass) tmux backend registry and capabilities > serializes tmux identities as one flat key [0.19ms]
(pass) tmux backend registry and capabilities > rejects an empty handle without invoking tmux [0.08ms]
(pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [45.17ms]
(pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [1.52ms]
(pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [0.53ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-workspace [0.75ms]

test\cmd-lock-bridge.test.ts:
(pass) pi-bridge command-lock interception > wraps a matching locked command in acquireΓåÆrelease around the tool call [91.94ms]
(pass) pi-bridge command-lock interception > leaves a non-matching command untouched ΓÇö no acquire, no release [27.98ms]
(pass) pi-bridge command-lock interception > only bash tool calls are intercepted ΓÇö a non-bash tool never acquires [1.06ms]

test\cmd-lock.test.ts:
(pass) command lock > acquire and release round-trip [14.70ms]
(pass) command lock > second acquire blocks until first releases [64.66ms]
(pass) command lock > dead-pid lock is reaped [132.52ms]
(pass) command lock > release with wrong pid refuses [2.15ms]
bun test held by agent-a (pid 8100)
(pass) command lock > matches locked command prefixes and probes settings [39.35ms]
(pass) command lock > run propagates the child exit code [1422.57ms]

test\codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [126.37ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [2.03ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [9.24ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [4.12ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [5.23ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [1893.90ms]

test\command-workspace-fields.test.ts:
(pass) command workspace fields > status and wall entities use persisted workspace instead of serialized-key text [195.45ms]
(pass) command workspace fields > status reports a mixed pi and Claude fleet with the same identity fields [71.64ms]

test\commands-clean.test.ts:
(pass) commands/clean > reaps dead agent dirs but preserves live pids [137.04ms]

test\commands-control.test.ts:
(pass) commands/control > parses dispatch flags without losing prompt words [169.71ms]
(pass) commands/control > parses --then destination and note [0.14ms]
(pass) commands/control > adds worker header unless raw [0.45ms]

test\commands-daemon.test.ts:
(pass) commands/daemon > parses governance and validates daemon status [181.07ms]
(pass) commands/daemon > reads only a positive integer lock pid [4.63ms]

test\commands-events.test.ts:
(pass) commands/events > parses filters, scope, notification, and offline flags [74.58ms]
(pass) commands/events > rejects malformed event and labels sinks [1.35ms]

test\commands-index.test.ts:
(pass) commands/index > does not gate help or noninteractive commands [36.36ms]
(pass) commands/index > reads a package version string [0.69ms]

test\commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [47.05ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [0.19ms]

test\commands-panes.test.ts:
(pass) commands/panes > pane identity remains backend-neutral [64.58ms]
(pass) commands/panes > exports the pane listing command directly [0.12ms]

test\commands-queue.test.ts:
(pass) commands/queue > round-trips add/list/cancel on an isolated store [114.91ms]
No queue tasks.
(pass) commands/queue > renders empty queues without throwing [0.45ms]

test\commands-results.test.ts:
(pass) commands/results > validates and extracts question payloads [57.95ms]
(pass) commands/results > formats invalid and recent timestamps [0.68ms]
(pass) commands/results > routes a seeded result.json through the command module [135.08ms]

test\commands-review.test.ts:
(pass) commands/review > uses the short orch branch as review target [2.19ms]
(pass) commands/review > falls back to branch then pane [0.47ms]

test\commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [1.51ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [2.90ms]

test\commands-spawn.test.ts:
(pass) commands/spawn > parses spawn flags and rejects no implicit adapter assumptions [104.65ms]
(pass) commands/spawn > identifies pi launchers and preserves raw prompt [0.51ms]

test\commands-status.test.ts:
(pass) commands/status > derives view fields from seeded presence [1.50ms]
(pass) commands/status > marks dead presence as exited [0.16ms]
(pass) commands/status > formats workspace labels and warnings [0.22ms]

test\commands-target.test.ts:
(pass) commands/target > splits known flags and preserves positional args [171.97ms]
(pass) commands/target > extracts target and joined prompt [3.31ms]
(pass) commands/target > reads only structured result text [0.56ms]
(pass) commands/target > quotes remote args and ORCH_DIR safely [0.98ms]
(pass) commands/target > lists only live serialized identity presence entries [9.37ms]

test\config-precedence.test.ts:
(pass) config precedence > returns a defaults value when no override is set [199.01ms]
(pass) config precedence > applies defaults when config, env, and flag are absent [0.97ms]
(pass) config precedence > uses env over config and flag over env [1.88ms]
(pass) config precedence > parses notify entries and hosts into expected shapes [15.77ms]
(pass) config precedence > reports a helpful validation error for invalid config [14.44ms]

test\config-watch.test.ts:
(pass) watchConfig > applies a valid edit after the debounced change [915.66ms]
(pass) watchConfig > keeps the last-good config and warns once for an invalid edit [736.52ms]
(pass) watchConfig > stop prevents further callbacks [835.12ms]

test\config.test.ts:
(pass) loadConfig > uses defaults when settings.json is missing [193.38ms]
(pass) loadConfig > parses every supported settings section [21.29ms]
(pass) loadConfig > rejects a file without the current schemaVersion [11.55ms]
(pass) loadConfig > rejects invalid JSON loudly [7.42ms]
(pass) loadConfig > names the key path for invalid fields [3.02ms]
(pass) loadConfig > rejects unknown settings keys [2.44ms]
(pass) loadConfig > parses defaults.allowed_models as a string array [2.90ms]
(pass) loadConfig > rejects a non-string entry in defaults.allowed_models [7.26ms]
(pass) loadConfig > validates defaults.worker_peer_tools as a boolean [17.11ms]
(pass) loadConfig > accepts true and false for defaults.worker_peer_tools [35.01ms]
(pass) loadConfig > leaves defaults.worker_peer_tools absent when unset [1.00ms]
(pass) loadConfig > rejects a host without dest [7.60ms]
(pass) loadConfig > rejects an unknown id in installed.adapters [17.33ms]
(pass) loadConfig > rejects defaults.adapter not present in installed.adapters [11.75ms]
(pass) loadConfig > rejects when settings.json is absent but a legacy config.toml exists [7.95ms]
(pass) allowedModelPatterns > returns the built-in defaults when config is absent [7.02ms]
(pass) allowedModelPatterns > returns the configured patterns when set [2.52ms]
(pass) writeSettingsInstalled > round-trips both provider arrays [8.61ms]
(pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [27.41ms]
(pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [49.36ms]
(pass) writeSettingsDefault > is idempotent when rewriting the same value [31.70ms]
(pass) writeSettingsDefault > refuses to write through an out-of-version settings file [2.71ms]
(pass) writeSettingsDefault > switches defaults.adapter between two installed ids and loads clean [3.64ms]
(pass) config precedence > uses the fallback when env and settings.json omit a setting [1.01ms]
(pass) config precedence > uses the settings.json value over the fallback [13.72ms]
(pass) config precedence > uses the ORCH_* environment value over settings.json [8.14ms]
(pass) config precedence > uses an explicit flag override over the environment [1.75ms]
(pass) resolveSetting > uses flag, environment coercion, config, then fallback in precedence order [2.66ms]
(pass) resolveWithSource > reports the winning source at each precedence level [1.48ms]

test\control-dispatch.test.ts:
(pass) deliverControl > steers pi through its presence inbox [80.65ms]
(pass) deliverControl > warns and succeeds when claude keys fallback delivers [73.58ms]
steering headless~local~claude-fail via claude keys fallback (degraded delivery)
(pass) deliverControl > fails when claude keys fallback cannot deliver [67.58ms]
(skip) deliverControl > executes codex steer command and accepts exit zero
(skip) deliverControl > treats a nonzero codex command exit as failure
(pass) deliverControl > fails unsupported steer and setModel capabilities [63.18ms]
(pass) deliverControl > requires presence for inbox delivery [56.71ms]

test\daemon-configwatch.test.ts:
(pass) config watch > loads initially and applies edits [279.71ms]
(pass) config watch > keeps the last good config on invalid JSON and recovers [130.54ms]
(pass) config watch > stops all callbacks [314.79ms]

test\daemon-events.test.ts:
(pass) daemon presence events > an RPC subscriber receives a presence transition [442.12ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [2.38ms]
(pass) daemon presence events > a blocked transition drives command sink delivery [1185.63ms]
(pass) daemon presence events > a dead daemon falls back once and diffs the switch snapshot [1114.09ms]

test\daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [16.50ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [23.04ms]
(pass) daemon lifecycle > rejects malformed locks and a socket probe that fails [17.17ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [3.35ms]
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [220.98ms]
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
  add       react                Add a dependency to package.json (bun a)
  remove    babel-core           Remove a dependency from package.json (bun rm)
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
  create    elysia               Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [240.12ms]
(pass) daemon lifecycle > rejects a recycled pid identity [7.93ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [5.08ms]

test\daemon-rpc.test.ts:
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
  add       lyra                 Add a dependency to package.json (bun a)
  remove    @parcel/core         Remove a dependency from package.json (bun rm)
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
  create    svelte               Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon RPC > round-trips a call over the real unix socket [254.07ms]
(pass) daemon RPC > returns an error for an unknown method [314.82ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [227.59ms]
(pass) daemon RPC > delivers pushed subscription events [127.38ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [394.16ms]
(pass) daemon RPC > has a catchable absent-daemon error [2.10ms]

test\doctor-backends.test.ts:
(pass) doctor backend and presence checks > reports every registered backend and boolean capability fields [221.56ms]
(pass) doctor backend and presence checks > reports only malformed or legacy presence records [5.98ms]

test\doctor-checks.test.ts:
(pass) doctor notification-sink checks > reports no sinks as healthy [104.49ms]
(pass) doctor notification-sink checks > warns for a webhook with a malformed URL [13.65ms]
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [57.33ms]
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [51.91ms]

test\doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [13.46ms]
(pass) doctor Claude hooks shim check > accepts the node runtime command form [10.37ms]
(pass) doctor Claude hooks shim check > accepts the deno runtime command form [6.54ms]
(pass) doctor Claude hooks shim check > accepts the bun runtime command form [9.61ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [2.39ms]
(pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [1.75ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [3.32ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [1.93ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [3.75ms]

test\doctor-hosts.test.ts:
(pass) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [22.49ms]
(pass) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [6.18ms]
(pass) doctor remote host checks > flags a remote orch version/schema mismatch in detail [27.94ms]
(pass) doctor remote host checks > reports no remote hosts configured as healthy [18.73ms]

test\doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [40.60ms]
(pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [42.89ms]
(pass) doctor stale presence safety > no dead agents leaves nothing to remove [30.85ms]

test\doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [107.26ms]
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [20.86ms]
(pass) runDoctor > reports an absent daemon as optional [17.92ms]
(pass) runDoctor > reports and fixes a stale daemon lock [14.38ms]
(pass) runDoctor > accepts a live daemon and an answerable socket [680.58ms]
(pass) runDoctor > warns when the live daemon code hash is stale [52.81ms]
(pass) runDoctor > fails on an invalid lock and an unanswerable live socket [58.64ms]
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [3.39ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [2.85ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [9.01ms]
(pass) runDoctor > reports a dead presence pid and corrupt spawn registry lines [52.75ms]
(pass) runDoctor > bins check is driven by the installed set and offers no fix [16.44ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [14.23ms]
(pass) runDoctor > validates configured notifier adapters [145.34ms]
notify: could not load settings.json: Error: C:\Users\Bryan\AppData\Local\Temp\orch-doctor-Hsob9i\settings.json: invalid settings: Γ£û Invalid input: expected number, received string ΓåÆ at queue.max_retries
(pass) runDoctor > reports invalid config and accepts missing config [63.56ms]
(pass) runDoctor > never throws when individual checks encounter broken inputs [96.17ms]

test\herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [3.38ms]
(pass) herdr and notification hardening > falls back to a real name when an adapter id is blank [1.78ms]
(pass) herdr and notification hardening > nameless notifications use a workspace label, never a bare pane key [2.01ms]

test\identity.test.ts:
(pass) serializeIdentity / parseIdentity round-trip > round-trips herdr [0.62ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with % handle [0.12ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with : and % handle [0.09ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips headless pid handle [0.07ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips empty workspace [0.09ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips separator inside parts [0.09ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips slash inside parts [0.08ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips percent-code-lookalike [0.07ms]
(pass) serializeIdentity / parseIdentity round-trip > serialized key is a single flat segment (no nested path) [12.65ms]
(pass) serializeIdentity / parseIdentity round-trip > backend namespaces prevent collisions across equal workspace/handle [0.14ms]
(pass) malformed input > rejects wrong segment count [0.20ms]
(pass) malformed input > rejects empty key [0.10ms]
(pass) malformed input > rejects empty backend or handle on serialize [0.18ms]
(pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.06ms]
(pass) malformed input > tryParseIdentity parses a valid key [0.06ms]

test\notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > skips an unavailable adapter without affecting available adapters [7.30ms]
notify: webhook notifier has invalid configuration
(pass) notifier registry and built-in adapters > reports malformed required configuration instead of throwing [8.75ms]
(pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [6.79ms]
(pass) notifier registry and built-in adapters > command adapter passes canonical JSON on stdin [782.30ms]
(pass) notifier registry and built-in adapters > desktop fallback selects notify-send, then WSL notify when it fails [5.30ms]
notify: bad sink failed
(pass) notifier registry and built-in adapters > isolates delivery failures and still delivers to other adapters [0.59ms]

test\notify-events-format.test.ts:
(pass) notification and presence event formatting > workspaceColor is stable and returns a palette hex [0.13ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.24ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [1.18ms]
(pass) notification and presence event formatting > webhook payload includes workspace and workspaceColor [1.26ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [2.57ms]
(pass) notification and presence event formatting > derivePresenceTransition derives workspace from identity keys [0.40ms]

test\notify-sinks.test.ts:
(pass) notify sinks > delivers command sink payload as JSON [710.08ms]
(pass) notify sinks > loadSinks parses command and webhook declarations [3.52ms]

test\notify.test.ts:
(pass) notify > parses valid sinks and warns about unknown types and missing fields [17.09ms]
(pass) notify > delivers only to sinks whose on filter matches the event [1024.48ms]
(pass) notify > command sink writes the event payload as JSON on stdin [1109.34ms]
(pass) notify > titles lead with exactly one terminal state and agent [26.30ms]
(pass) notify > webhook failure is non-fatal and reports a warning [26.39ms]

test\orchd-rpc-replay.test.ts:
(pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [1.06ms]
(pass) orchd RPC replay buffer > drops the oldest events and reports a replay gap [27.78ms]

test\orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [547.93ms]

test\orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [122.33ms]
(pass) orchd RPC transports > round-trips over the TCP fallback transport [246.53ms]

test\outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [68.69ms]

test\outbox.test.ts:
(pass) outbox delivery > selects pending messages and delivers each message once [27.71ms]
(pass) outbox delivery > keeps failed messages pending until their backoff expires [25.59ms]

test\ownership.test.ts:
(pass) agent ownership > round-trips an owner [89.26ms]
(pass) agent ownership > allows unowned and same-owner writes [41.93ms]
(pass) agent ownership > denies foreign writes and supports stealing [53.08ms]

test\parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [241.46ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.16ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.15ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.13ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.09ms]

test\presence-schema.test.ts:
(pass) presence status schema > reads a spawned namespaced identity with backend, workspace, handle, and adapter [1390.40ms]
(pass) presence status schema > orch status JSON exposes the complete spawned identity fields [1690.91ms]
(pass) presence status schema > status and list report the same agent identity [770.90ms]
(pass) presence status schema > mixed pi and Claude status rows carry the same identity field set [946.87ms]
(pass) presence status schema > keeps schema-1 status records valid without adding fields [2292.93ms]
(pass) presence status schema > loads a mixed directory of schema-1 and schema-2 records [492.25ms]
(pass) presence status schema > persists the complete spawned identity record [12.34ms]

test\queue-workspace-replay.test.ts:
(pass) queue workspace replay > persists workspace through append-only replay [154.82ms]
(pass) queue workspace replay > keeps legacy tasks without a workspace [52.59ms]
(pass) queue workspace replay > replays separate workspace values for multiple tasks [54.06ms]
(pass) queue workspace replay > selects only tasks eligible for the requested workspace [49.33ms]

test\queue.test.ts:
(pass) queue > add then list shows a queued task [61.03ms]
(pass) queue > exactly one claimer wins, including parallel attempts [96.87ms]
(pass) queue > replays done, failed, and retry transitions [87.78ms]
(pass) queue > cancels queued tasks and returns an error result for claimed tasks [57.71ms]
(pass) queue > picks queued tasks FIFO, honoring the agent constraint [56.01ms]
(pass) queue > caps retries: requeue below the cap, terminal failed at it [59.82ms]
(pass) queue > settles a claimed task to done and blocks any later claim [59.44ms]
(pass) queue > exactly one of two racing claimers wins [57.21ms]

test\remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [2324.98ms]
(pass) async remote fan-out > returns a typed dead-host failure [1218.78ms]
(pass) async remote fan-out > returns a typed timeout failure [896.88ms]
(pass) async remote fan-out > returns a typed non-JSON failure [2489.75ms]
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [1774.86ms]

test\remote.test.ts:
(pass) remote SSH executor > runs BatchMode SSH and parses JSON [2129.16ms]
(pass) remote SSH executor > returns a typed timeout failure [3058.13ms]
(pass) remote SSH executor > returns a dead-host failure [1491.36ms]
(pass) remote SSH executor > returns a non-JSON failure [755.99ms]
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [1.88ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.52ms]

test\review.test.ts:
Preparing worktree (new branch 'orch/feature-1')
(pass) review plumbing > lists only done worktree agents with commits ahead [9647.03ms]
Preparing worktree (new branch 'orch/iterate-1')
(pass) review plumbing > reject re-dispatches feedback through the adapter inbox [15853.00ms]
Preparing worktree (new branch 'orch/approve-1')
fatal: 'refs/heads/orch/approve-1' - not a valid ref
(pass) review plumbing > approve merges and removes the worktree and branch [10315.85ms]
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
(pass) review plumbing > conflicting approval aborts without changing either branch [9016.54ms]
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
(pass) review plumbing > non-fast-forward approval creates a merge commit [6730.87ms]

test\routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves origin workspace selection [55.13ms]
(pass) store hardening > reopening an old outbox schema applies the migration idempotently and enables WAL [64.44ms]
(pass) store hardening > a steal updates ownership only when the observed owner still matches [58.68ms]
(pass) store hardening > the conditional claim is exactly once [56.09ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [2132.20ms]

test\settings-command.test.ts:
(pass) orch settings > --json reports value + source per setting, settings.json winning over defaults [1673.26ms]
(pass) orch settings > --json reports env as the winning source over settings.json [2006.74ms]
C:\Users\Bryan\AppData\Local\Temp\orch-settings-cmd-V9k8wf\settings.json: defaults.adapter: "codex" is not an installed adapter ΓÇö installed: pi, claude; re-run orch setup
(pass) orch settings > --harness switches defaults.adapter between installed ids and rejects a non-installed id [4711.23ms]
C:\Users\Bryan\AppData\Local\Temp\orch-settings-cmd-Al2lMd\config.toml: legacy config.toml detected ΓÇö settings now live in C:\Users\Bryan\AppData\Local\Temp\orch-settings-cmd-Al2lMd\settings.json; re-run orch setup (the old values are not read)
(pass) orch settings > a load error surfaces loudly with no partial table [2039.76ms]

test\setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [21.81ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [6.82ms]
(pass) notifier setup logic > renders a command entry that loadConfig can parse [10.26ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [6.95ms]

test\spawn-limits.test.ts:
(pass) spawn limits > schema loads global and workspace caps [87.69ms]
(pass) spawn limits > rejects invalid cap %s with file and key [14.14ms]
(pass) spawn limits > rejects invalid cap %s with file and key [2.18ms]
(pass) spawn limits > rejects invalid cap %s with file and key [1.99ms]
(pass) spawn limits > omitted limits normalize to no caps [1.00ms]
(pass) spawn limits > global boundary refusal data counts the whole request [83.71ms]
(pass) spawn limits > one workspace may use the full global allotment [12.20ms]
(pass) spawn limits > workspace cap is independent of global headroom [12.25ms]
(pass) spawn limits > uncapped workspace is bounded only by global count [10.76ms]
(pass) spawn limits > dead pid records free capacity [1.62ms]
(pass) spawn limits > foreign panes never count [2.57ms]
(pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [28.71ms]
(pass) spawn limits > doctor accepts satisfiable limits [23.89ms]

test\wall-single-owner.test.ts:
(pass) workspace wall ownership > keeps the wall decision primitive in one source module [743.77ms]

test\work-notify.test.ts:
(pass) orch work notifications > delivers a presence transition through a configured command sink [716.78ms]

test\work-race.test.ts:
24 |       const code = (error as { code?: string }).code;
25 |       if (code !== "EBUSY" && code !== "ENOTEMPTY" && code !== "EPERM") throw error;
26 |       pauseMs(100);
27 |     }
28 |   }
29 |   // Final attempt: if a child's handle still lingers past the retry budget, a
       ^
error: EBUSY: resource busy or locked, rm 'C:\Users\Bryan\AppData\Local\Temp\orch-work-race-g2KyBn'
      at removeTempDir (C:\Users\Bryan\Documents\orch\test\helpers\tempdir.ts:29:3)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\work-race.test.ts:49:31)
(fail) orch work claim race > two concurrent workers produce one claim and the loser exits cleanly [14252.84ms]

test\worker-prompt.test.ts:
(pass) worker prompt capability composition > work loop gives codex the base header without orch_ask [217.74ms]
(pass) worker prompt capability composition > work loop gives pi the orch_ask header clause [623.84ms]
(pass) worker prompt capability composition > orch run composition selects the same header per adapter [0.30ms]
(pass) worker prompt capability composition > locked-commands clause names the commands when the list is non-empty [0.10ms]
(pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.06ms]
(pass) worker prompt capability composition > events strip both worker header variants [18.99ms]

test\worker-tools.test.ts:
(pass) worker tool policy > default spawn omits peer tools [4.22ms]
(pass) worker tool policy > explicitly disabled peer tools are omitted [0.94ms]
(pass) worker tool policy > config enables all peer tools [0.32ms]

test\workspace-policy.test.ts:
(pass) workspace policy > reads workspaces from serialized identity keys [0.50ms]
(pass) workspace policy > resolves workspace names through records and functions [0.30ms]
(pass) workspace policy > compares serialized keys by their workspace [0.23ms]
(pass) workspace policy > enforces the workspace wall [0.37ms]
(pass) workspace policy > scopes serialized identity keys to the current workspace [0.33ms]
(pass) workspace policy > null current workspace leaves items unscoped [0.09ms]
(pass) workspace policy > 2.7 status displays the reported workspace identity field [111.57ms]
(pass) workspace policy > 6.6 structured identity drives status and policy, not serialized key text [49.54ms]

test\workspace-walls.test.ts:
(pass) workspace helpers > extracts workspace ids only from identity keys [0.70ms]
(pass) workspace helpers > derives an entity workspace from the identity key [0.61ms]
(pass) workspace helpers > returns the same entities when all workspaces are requested [0.33ms]
(pass) workspace wall writes > allows a write within the same workspace [0.32ms]
(pass) workspace wall writes > denies a cross-workspace write with both workspaces in the reason [0.66ms]
(pass) workspace wall writes > applies the same wall rule to herdr, tmux, and headless identities [1.66ms]
(pass) workspace wall writes > allows a cross-workspace write with an explicit override [0.07ms]
(pass) workspace wall writes > allows legacy unscoped targets [0.07ms]
(pass) workspace-aware queued task selection > excludes tasks pinned to another workspace [0.15ms]
(pass) workspace-aware queued task selection > keeps legacy tasks eligible in any workspace [0.08ms]
(pass) workspace-aware queued task selection > selects the earliest eligible task and respects agent constraints [20.30ms]

test\worktree.test.ts:
Preparing worktree (new branch 'orch/fixes-1')
(pass) worktree primitives > creates and lists an agent worktree on an orch branch [4026.33ms]
Preparing worktree (new branch 'orch/feature')
(pass) worktree primitives > detects commits ahead of a base branch [5534.69ms]
Preparing worktree (new branch 'orch/remove-me')
(pass) worktree primitives > removes an agent worktree [4232.64ms]
fatal: not a git repository (or any of the parent directories): .git
(pass) worktree primitives > rejects a non-repository path with a clear error [149.29ms]

3 tests skipped:
(skip) claude-hooks shim tests need the dist bundle
(skip) deliverControl > executes codex steer command and accepts exit zero
(skip) deliverControl > treats a nonzero codex command exit as failure


1 tests failed:
(fail) orch work claim race > two concurrent workers produce one claim and the loser exits cleanly [14252.84ms]

 400 pass
 3 skip
 1 fail
 1016 expect() calls
Ran 404 tests across 78 files. [237.82s]
