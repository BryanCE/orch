bun test v1.3.14 (0d9b296a)

test\adapter-allowlist.test.ts:
(pass) pi adapter tool allowlist > declares exactly the built-ins and bridge tools [17.74ms]
(pass) pi adapter tool allowlist > restricts interactive pi launches to the allowlist [0.49ms]
(pass) pi adapter tool allowlist > restricts headless pif launches and preserves the prompt [0.33ms]

test\adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [10.21ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [33.24ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [8.34ms]
(pass) adapter and runtime hardening > headless generates one safe presence key when no key is supplied [48.99ms]

test\adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.58ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.21ms]
(pass) PiAdapter > reads state from the presence status through store helpers [3.20ms]
(pass) PiAdapter > appends a steer message to the presence inbox [109.58ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [2.64ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [7.75ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > spawns a detached process and records its handle [255.43ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [1031.79ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [801.34ms]
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [752.41ms]
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [18.20ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [16.69ms]
(pass) HeadlessBackend > never signals an unrecorded pid [9.84ms]

test\backend-herdr.test.ts:
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [3.05ms]
(pass) HerdrBackend > maps close and list to herdr helpers [1.40ms]

test\backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [3.04ms]
(pass) TmuxBackend > reports tmux availability [228.89ms]
(pass) TmuxBackend > reflects the TMUX environment [2.05ms]
(pass) TmuxBackend > mints identity from the owning session [6.69ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [1.30ms]
(pass) TmuxBackend > list() and inventory() surface only orch-spawned panes [5.54ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.35ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [2.98ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.53ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [122.67ms]
(pass) TmuxBackend > waitAgentStatus fails immediately when the pane has no presence key [0.21ms]
(pass) TmuxBackend > read returns captured text and throws when capture-pane fails [0.32ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [0.32ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.75ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.30ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [2.46ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [1.37ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [2.36ms]
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [94.81ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [57.93ms]
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [132.06ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [0.64ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [675.66ms]

test\broker-governance.test.ts:
(pass) daemon governWrite enforcement > unscoped actor bypasses ownership and the wall [87.73ms]
(pass) daemon governWrite enforcement > owner may write to its own agent [27.88ms]
(pass) daemon governWrite enforcement > a foreign owner in the same workspace is refused [23.10ms]
(pass) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [23.87ms]
(pass) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [32.59ms]
(pass) daemon governWrite enforcement > --steal transfers ownership to the actor [58.85ms]
(pass) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [56.36ms]

test\broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [63.16ms]
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [3.44ms]
(pass) broker ownership and workspace governance > work-loop selection stays within the origin workspace [75.42ms]

test\broker-routing.test.ts:
(pass) broker CLI routing > write refuses when the daemon socket is unavailable [9075.97ms]
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [2475.97ms]
(pass) broker CLI routing > dispatch failure is daemon-absent, not herdr-not-found [8360.58ms]

test\claude-adapter.test.ts:
(pass) Claude adapter > declares its identity and capabilities [6.89ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.85ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.78ms]
(pass) Claude adapter > detects state from a live presence status [273.32ms]
(pass) Claude adapter > extracts result.json before transcript and native output [6.55ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [3.07ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [4887.88ms]
(pass) Claude adapter > exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session) [690.34ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed ORCH_AGENT_KEY [714.43ms]

test\claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [688.75ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [1124.62ms]
(pass) claude-hooks shim > under node > writes status.json for a valid key [889.13ms]
(pass) claude-hooks shim > under deno > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [812.27ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under deno > exits 1 loudly on a present-but-malformed key [626.88ms]
(pass) claude-hooks shim > under deno > writes status.json for a valid key [828.58ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [1702.54ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [2104.29ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [616.37ms]
(skip) claude-hooks shim tests need the dist bundle

test\clean-worktrees.test.ts:
Preparing worktree (new branch 'orch/empty')
Preparing worktree (new branch 'orch/merged')
Preparing worktree (new branch 'orch/unmerged')
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [24156.26ms]
Preparing worktree (new branch 'orch/discard')
fatal: 'refs/heads/orch/discard' - not a valid ref
(pass) clean worktrees > --force discards an unmerged orphan and its branch [10468.42ms]

test\cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [1.52ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [2.07ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.31ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.52ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.39ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.19ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [399.87ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [4.95ms]
(pass) headless common path: identity key -> presence > spawn mints a filesystem-safe headless identity and creates its presence dir [963.41ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [3498.03ms]
(pass) headless common path: identity key -> presence > one adapter uses opaque keys across headless and tmux backend routes [1.07ms]
(pass) headless common path: identity key -> presence > workspaceOf reads the workspace from the structured key, not a regex [0.57ms]

test\cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [7.47ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [275.02ms]
(pass) tmux backend registry and capabilities > exposes pane capabilities [3.30ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [2.46ms]
(pass) tmux backend registry and capabilities > mints identity from a protected session seam [1.20ms]
(pass) tmux backend registry and capabilities > serializes tmux identities as one flat key [5.96ms]
(pass) tmux backend registry and capabilities > rejects an empty handle without invoking tmux [0.15ms]
(pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [142.33ms]
(pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [2.45ms]
(pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [2.04ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-workspace [2.96ms]

test\cmd-lock-bridge.test.ts:
(pass) pi-bridge command-lock interception > wraps a matching locked command in acquireΓåÆrelease around the tool call [111.63ms]
(pass) pi-bridge command-lock interception > leaves a non-matching command untouched ΓÇö no acquire, no release [5.88ms]
(pass) pi-bridge command-lock interception > only bash tool calls are intercepted ΓÇö a non-bash tool never acquires [2.25ms]

test\cmd-lock.test.ts:
(pass) command lock > acquire and release round-trip [23.87ms]
(pass) command lock > second acquire blocks until first releases [231.38ms]
(pass) command lock > dead-pid lock is reaped [2.60ms]
(pass) command lock > release with wrong pid refuses [2.92ms]
bun test held by agent-a (pid 27540)
(pass) command lock > matches locked command prefixes and probes settings [13.99ms]
(pass) command lock > run propagates the child exit code [438.77ms]

test\codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [0.49ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [0.43ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [0.74ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [1.08ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [0.82ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [2768.92ms]

test\command-workspace-fields.test.ts:
(pass) command workspace fields > status and wall entities use persisted workspace instead of serialized-key text [346.46ms]
(pass) command workspace fields > status reports a mixed pi and Claude fleet with the same identity fields [65.91ms]

test\commands-clean.test.ts:
(pass) commands/clean > reaps dead agent dirs but preserves live pids [147.83ms]

test\commands-control.test.ts:
(pass) commands/control > parses dispatch flags without losing prompt words [98.61ms]
(pass) commands/control > parses --then destination and note [0.14ms]
(pass) commands/control > adds worker header unless raw [0.29ms]

test\commands-daemon.test.ts:
(pass) commands/daemon > parses governance and validates daemon status [36.73ms]
(pass) commands/daemon > reads only a positive integer lock pid [2.33ms]

test\commands-events.test.ts:
(pass) commands/events > parses filters, scope, notification, and offline flags [77.63ms]
(pass) commands/events > rejects malformed event and labels sinks [0.72ms]

test\commands-index.test.ts:
(pass) commands/index > does not gate help or noninteractive commands [35.56ms]
(pass) commands/index > reads a package version string [1.05ms]

test\commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [36.67ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [0.26ms]

test\commands-panes.test.ts:
(pass) commands/panes > pane identity remains backend-neutral [25.20ms]
(pass) commands/panes > exports the pane listing command directly [0.10ms]

test\commands-queue.test.ts:
(pass) commands/queue > round-trips add/list/cancel on an isolated store [111.57ms]
No queue tasks.
(pass) commands/queue > renders empty queues without throwing [1.00ms]

test\commands-results.test.ts:
(pass) commands/results > validates and extracts question payloads [76.64ms]
(pass) commands/results > formats invalid and recent timestamps [3.17ms]
(pass) commands/results > routes a seeded result.json through the command module [330.54ms]

test\commands-review.test.ts:
(pass) commands/review > uses the short orch branch as review target [89.93ms]
(pass) commands/review > falls back to branch then pane [0.09ms]

test\commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.44ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [117.19ms]

test\commands-spawn.test.ts:
(pass) commands/spawn > parses spawn flags and rejects no implicit adapter assumptions [218.52ms]
(pass) commands/spawn > identifies pi launchers and preserves raw prompt [0.69ms]

test\commands-status.test.ts:
(pass) commands/status > derives view fields from seeded presence [127.44ms]
(pass) commands/status > marks dead presence as exited [0.22ms]
(pass) commands/status > formats workspace labels and warnings [0.25ms]

test\commands-target.test.ts:
(pass) commands/target > splits known flags and preserves positional args [129.67ms]
(pass) commands/target > extracts target and joined prompt [0.92ms]
(pass) commands/target > reads only structured result text [0.13ms]
(pass) commands/target > quotes remote args and ORCH_DIR safely [0.46ms]
(pass) commands/target > lists only live serialized identity presence entries [9.15ms]

test\config-precedence.test.ts:
(pass) config precedence > returns a defaults value when no override is set [79.14ms]
(pass) config precedence > applies defaults when config, env, and flag are absent [4.99ms]
(pass) config precedence > uses env over config and flag over env [8.31ms]
(pass) config precedence > parses notify entries and hosts into expected shapes [30.44ms]
(pass) config precedence > reports a helpful validation error for invalid config [4.43ms]

test\config-watch.test.ts:
(pass) watchConfig > applies a valid edit after the debounced change [1158.00ms]
(pass) watchConfig > keeps the last-good config and warns once for an invalid edit [678.55ms]
(pass) watchConfig > stop prevents further callbacks [411.73ms]

test\config.test.ts:
(pass) loadConfig > uses defaults when settings.json is missing [1.60ms]
(pass) loadConfig > parses every supported settings section [3.68ms]
(pass) loadConfig > rejects a file without the current schemaVersion [2.94ms]
(pass) loadConfig > rejects invalid JSON loudly [2.06ms]
(pass) loadConfig > names the key path for invalid fields [9.84ms]
(pass) loadConfig > rejects unknown settings keys [2.53ms]
(pass) loadConfig > parses defaults.allowed_models as a string array [2.05ms]
(pass) loadConfig > rejects a non-string entry in defaults.allowed_models [2.82ms]
(pass) loadConfig > validates defaults.worker_peer_tools as a boolean [2.59ms]
(pass) loadConfig > accepts true and false for defaults.worker_peer_tools [4.67ms]
(pass) loadConfig > leaves defaults.worker_peer_tools absent when unset [1.42ms]
(pass) loadConfig > rejects a host without dest [3.45ms]
(pass) loadConfig > rejects an unknown id in installed.adapters [2.43ms]
(pass) loadConfig > rejects defaults.adapter not present in installed.adapters [2.87ms]
(pass) loadConfig > rejects when settings.json is absent but a legacy config.toml exists [1.90ms]
(pass) allowedModelPatterns > returns the built-in defaults when config is absent [2.48ms]
(pass) allowedModelPatterns > returns the configured patterns when set [1.75ms]
(pass) writeSettingsInstalled > round-trips both provider arrays [3.71ms]
(pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [5.65ms]
(pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [3.21ms]
(pass) writeSettingsDefault > is idempotent when rewriting the same value [4.50ms]
(pass) writeSettingsDefault > refuses to write through an out-of-version settings file [2.56ms]
(pass) writeSettingsDefault > switches defaults.adapter between two installed ids and loads clean [2.88ms]
(pass) config precedence > uses the fallback when env and settings.json omit a setting [0.98ms]
(pass) config precedence > uses the settings.json value over the fallback [2.21ms]
(pass) config precedence > uses the ORCH_* environment value over settings.json [2.09ms]
(pass) config precedence > uses an explicit flag override over the environment [0.20ms]
(pass) resolveSetting > uses flag, environment coercion, config, then fallback in precedence order [0.23ms]
(pass) resolveWithSource > reports the winning source at each precedence level [9.50ms]

test\control-dispatch.test.ts:
(pass) deliverControl > steers pi through its presence inbox [34.88ms]
(pass) deliverControl > warns and succeeds when claude keys fallback delivers [35.47ms]
steering headless~local~claude-fail via claude keys fallback (degraded delivery)
(pass) deliverControl > fails when claude keys fallback cannot deliver [36.57ms]
(skip) deliverControl > executes codex steer command and accepts exit zero
(skip) deliverControl > treats a nonzero codex command exit as failure
(pass) deliverControl > fails unsupported steer and setModel capabilities [31.38ms]
(pass) deliverControl > requires presence for inbox delivery [32.80ms]

test\daemon-configwatch.test.ts:
(pass) config watch > loads initially and applies edits [587.32ms]
(pass) config watch > keeps the last good config on invalid JSON and recovers [300.99ms]
(pass) config watch > stops all callbacks [263.14ms]

test\daemon-events.test.ts:
(pass) daemon presence events > an RPC subscriber receives a presence transition [659.58ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [47.87ms]
(pass) daemon presence events > a blocked transition drives command sink delivery [1193.48ms]
(pass) daemon presence events > a dead daemon falls back once and diffs the switch snapshot [930.49ms]

test\daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [6.17ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [5.91ms]
(pass) daemon lifecycle > rejects malformed locks and a socket probe that fails [4.74ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [3.79ms]
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.3.14+0d9b296af)

Usage: bun <command> [...flags] [...args]

Commands:
  run       ./my-script.ts       Execute a file with Bun
            lint                 Run a package.json script
  test                           Run unit tests with Bun
  x         eslint               Execute a package binary (CLI), installing if needed (bunx)
  repl                           Start a REPL session with Bun
  exec                           Run a shell script directly with Bun

  install                        Install dependencies for a package.json (bun i)
  add       elysia               Add a dependency to package.json (bun a)
  remove    webpack              Remove a dependency from package.json (bun rm)
  update    @shumai/shumai       Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
  outdated                       Display latest versions of outdated dependencies
  link      [<package>]          Register or link a local npm package
  unlink                         Unregister a local npm package
  publish                        Publish a package to the npm registry
  patch <pkg>                    Prepare a package for patching
  pm <subcommand>                Additional package management utilities
  info      hono                 Display package metadata from the registry
  why       react                Explain why a package is installed

  build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file

  init                           Start an empty Bun project from a built-in template
  create    vite                 Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [237.25ms]
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [23.13ms]
(pass) daemon lifecycle > rejects a recycled pid identity [1.87ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [1.76ms]

test\daemon-rpc.test.ts:
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
  create    elysia               Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon RPC > round-trips a call over the real unix socket [69.87ms]
(pass) daemon RPC > returns an error for an unknown method [90.28ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [763.39ms]
(pass) daemon RPC > delivers pushed subscription events [432.07ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [1195.35ms]
(pass) daemon RPC > has a catchable absent-daemon error [8.79ms]

test\doctor-backends.test.ts:
(pass) doctor backend and presence checks > reports every registered backend and boolean capability fields [118.65ms]
(pass) doctor backend and presence checks > reports only malformed or legacy presence records [4.71ms]

test\doctor-checks.test.ts:
(pass) doctor notification-sink checks > reports no sinks as healthy [43.44ms]
(pass) doctor notification-sink checks > warns for a webhook with a malformed URL [25.28ms]
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [29.69ms]
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [7.09ms]

test\doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [9.29ms]
(pass) doctor Claude hooks shim check > accepts the node runtime command form [8.69ms]
(pass) doctor Claude hooks shim check > accepts the deno runtime command form [13.50ms]
(pass) doctor Claude hooks shim check > accepts the bun runtime command form [6.67ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [7.79ms]
(pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [5.57ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [3.10ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [1.09ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [1.59ms]

test\doctor-hosts.test.ts:
(pass) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [7.08ms]
(pass) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [15.84ms]
(pass) doctor remote host checks > flags a remote orch version/schema mismatch in detail [41.78ms]
(pass) doctor remote host checks > reports no remote hosts configured as healthy [4.38ms]

test\doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [43.35ms]
(pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [43.98ms]
(pass) doctor stale presence safety > no dead agents leaves nothing to remove [9.99ms]

test\doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [66.27ms]
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [3.82ms]
(pass) runDoctor > reports an absent daemon as optional [3.97ms]
(pass) runDoctor > reports and fixes a stale daemon lock [5.53ms]
(pass) runDoctor > accepts a live daemon and an answerable socket [230.36ms]
(pass) runDoctor > warns when the live daemon code hash is stale [11.16ms]
(pass) runDoctor > fails on an invalid lock and an unanswerable live socket [13.36ms]
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [3.47ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [3.16ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [4.59ms]
(pass) runDoctor > reports a dead presence pid and corrupt spawn registry lines [13.39ms]
(pass) runDoctor > bins check is driven by the installed set and offers no fix [4.42ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [2.66ms]
(pass) runDoctor > validates configured notifier adapters [66.30ms]
notify: could not load settings.json: Error: C:\Users\Bryan\AppData\Local\Temp\orch-doctor-vYWGlM\settings.json: invalid settings: Γ£û Invalid input: expected number, received string ΓåÆ at queue.max_retries
(pass) runDoctor > reports invalid config and accepts missing config [14.66ms]
(pass) runDoctor > never throws when individual checks encounter broken inputs [15.71ms]

test\herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [0.83ms]
(pass) herdr and notification hardening > falls back to a real name when an adapter id is blank [0.29ms]
(pass) herdr and notification hardening > nameless notifications use a workspace label, never a bare pane key [1.52ms]

test\identity.test.ts:
(pass) serializeIdentity / parseIdentity round-trip > round-trips herdr [0.13ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with % handle [0.03ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with : and % handle [0.02ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips headless pid handle [0.03ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips empty workspace [0.03ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips separator inside parts [0.02ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips slash inside parts [0.02ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips percent-code-lookalike [0.01ms]
(pass) serializeIdentity / parseIdentity round-trip > serialized key is a single flat segment (no nested path) [0.17ms]
(pass) serializeIdentity / parseIdentity round-trip > backend namespaces prevent collisions across equal workspace/handle [0.49ms]
(pass) malformed input > rejects wrong segment count [0.27ms]
(pass) malformed input > rejects empty key [0.12ms]
(pass) malformed input > rejects empty backend or handle on serialize [0.20ms]
(pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.94ms]
(pass) malformed input > tryParseIdentity parses a valid key [5.16ms]

test\notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > skips an unavailable adapter without affecting available adapters [1.61ms]
notify: webhook notifier has invalid configuration
(pass) notifier registry and built-in adapters > reports malformed required configuration instead of throwing [1.04ms]
(pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [43.50ms]
(pass) notifier registry and built-in adapters > command adapter passes canonical JSON on stdin [849.73ms]
(pass) notifier registry and built-in adapters > desktop fallback selects notify-send, then WSL notify when it fails [40.30ms]
notify: bad sink failed
(pass) notifier registry and built-in adapters > isolates delivery failures and still delivers to other adapters [5.81ms]

test\notify-events-format.test.ts:
(pass) notification and presence event formatting > workspaceColor is stable and returns a palette hex [1.44ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [1.02ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [1.03ms]
(pass) notification and presence event formatting > webhook payload includes workspace and workspaceColor [3.02ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [4.11ms]
(pass) notification and presence event formatting > derivePresenceTransition derives workspace from identity keys [1.04ms]

test\notify-sinks.test.ts:
(pass) notify sinks > delivers command sink payload as JSON [1882.27ms]
(pass) notify sinks > loadSinks parses command and webhook declarations [31.38ms]

test\notify.test.ts:
(pass) notify > parses valid sinks and warns about unknown types and missing fields [5.11ms]
(pass) notify > delivers only to sinks whose on filter matches the event [1025.89ms]
(pass) notify > command sink writes the event payload as JSON on stdin [480.56ms]
(pass) notify > titles lead with exactly one terminal state and agent [0.47ms]
(pass) notify > webhook failure is non-fatal and reports a warning [39.63ms]

test\orchd-rpc-replay.test.ts:
(pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [0.31ms]
(pass) orchd RPC replay buffer > drops the oldest events and reports a replay gap [6.27ms]

test\orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [929.21ms]

test\orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [258.81ms]
(pass) orchd RPC transports > round-trips over the TCP fallback transport [565.98ms]

test\outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [116.51ms]

test\outbox.test.ts:
(pass) outbox delivery > selects pending messages and delivers each message once [74.40ms]
(pass) outbox delivery > keeps failed messages pending until their backoff expires [57.89ms]

test\ownership.test.ts:
(pass) agent ownership > round-trips an owner [175.04ms]
(pass) agent ownership > allows unowned and same-owner writes [52.63ms]
(pass) agent ownership > denies foreign writes and supports stealing [48.16ms]

test\parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [42.48ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.21ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [188.20ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.76ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.34ms]

test\presence-schema.test.ts:
(pass) presence status schema > reads a spawned namespaced identity with backend, workspace, handle, and adapter [983.69ms]
(pass) presence status schema > orch status JSON exposes the complete spawned identity fields [1683.18ms]
(pass) presence status schema > status and list report the same agent identity [1150.75ms]
(pass) presence status schema > mixed pi and Claude status rows carry the same identity field set [1854.79ms]
(pass) presence status schema > keeps schema-1 status records valid without adding fields [2645.77ms]
(pass) presence status schema > loads a mixed directory of schema-1 and schema-2 records [1073.19ms]
(pass) presence status schema > persists the complete spawned identity record [53.19ms]

test\queue-workspace-replay.test.ts:
(pass) queue workspace replay > persists workspace through append-only replay [213.67ms]
(pass) queue workspace replay > keeps legacy tasks without a workspace [47.95ms]
(pass) queue workspace replay > replays separate workspace values for multiple tasks [64.04ms]
(pass) queue workspace replay > selects only tasks eligible for the requested workspace [51.98ms]

test\queue.test.ts:
(pass) queue > add then list shows a queued task [70.02ms]
(pass) queue > exactly one claimer wins, including parallel attempts [108.57ms]
(pass) queue > replays done, failed, and retry transitions [74.45ms]
(pass) queue > cancels queued tasks and returns an error result for claimed tasks [59.78ms]
(pass) queue > picks queued tasks FIFO, honoring the agent constraint [55.74ms]
(pass) queue > caps retries: requeue below the cap, terminal failed at it [59.77ms]
(pass) queue > settles a claimed task to done and blocks any later claim [48.51ms]
(pass) queue > exactly one of two racing claimers wins [51.69ms]

test\remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [888.61ms]
(pass) async remote fan-out > returns a typed dead-host failure [2924.82ms]
(pass) async remote fan-out > returns a typed timeout failure [1089.35ms]
(pass) async remote fan-out > returns a typed non-JSON failure [1286.77ms]
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [2967.84ms]

test\remote.test.ts:
(pass) remote SSH executor > runs BatchMode SSH and parses JSON [1653.85ms]
(pass) remote SSH executor > returns a typed timeout failure [3079.60ms]
(pass) remote SSH executor > returns a dead-host failure [1437.26ms]
(pass) remote SSH executor > returns a non-JSON failure [817.85ms]
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [1.12ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.69ms]

test\review.test.ts:
Preparing worktree (new branch 'orch/feature-1')
(pass) review plumbing > lists only done worktree agents with commits ahead [9124.27ms]
Preparing worktree (new branch 'orch/iterate-1')
 6 | // handle lingers), then let rmSync's native maxRetries/retryDelay ride out the
 7 | // transient EBUSY that git-worktree and spawned subprocesses leave on Windows
 8 | // for a beat after they exit. This is Node's documented Windows-lock handling.
 9 | export function removeTempDir(dir: string): void {
10 |   closeAllStores();
11 |   rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
       ^
error: EBUSY: resource busy or locked, rm 'C:\Users\Bryan\AppData\Local\Temp\orch-review-dir-c6BfBd'
      at removeTempDir (C:\Users\Bryan\Documents\orch\test\helpers\tempdir.ts:11:3)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\review.test.ts:72:5)
(fail) review plumbing > reject re-dispatches feedback through the adapter inbox [10072.48ms]
Preparing worktree (new branch 'orch/approve-1')
fatal: 'refs/heads/orch/approve-1' - not a valid ref
(pass) review plumbing > approve merges and removes the worktree and branch [10061.14ms]
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
(pass) review plumbing > conflicting approval aborts without changing either branch [7787.91ms]
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
(pass) review plumbing > non-fast-forward approval creates a merge commit [8027.47ms]

test\routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves origin workspace selection [52.63ms]
(pass) store hardening > reopening an old outbox schema applies the migration idempotently and enables WAL [61.43ms]
(pass) store hardening > a steal updates ownership only when the observed owner still matches [55.45ms]
(pass) store hardening > the conditional claim is exactly once [51.58ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [2031.16ms]

test\settings-command.test.ts:
(pass) orch settings > --json reports value + source per setting, settings.json winning over defaults [2639.90ms]
(pass) orch settings > --json reports env as the winning source over settings.json [1965.47ms]
C:\Users\Bryan\AppData\Local\Temp\orch-settings-cmd-m4jySm\settings.json: defaults.adapter: "codex" is not an installed adapter ΓÇö installed: pi, claude; re-run orch setup
(pass) orch settings > --harness switches defaults.adapter between installed ids and rejects a non-installed id [5959.74ms]
C:\Users\Bryan\AppData\Local\Temp\orch-settings-cmd-vg7oDb\config.toml: legacy config.toml detected ΓÇö settings now live in C:\Users\Bryan\AppData\Local\Temp\orch-settings-cmd-vg7oDb\settings.json; re-run orch setup (the old values are not read)
(pass) orch settings > a load error surfaces loudly with no partial table [2068.42ms]

test\setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [14.89ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.88ms]
(pass) notifier setup logic > renders a command entry that loadConfig can parse [1.95ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.59ms]

test\spawn-limits.test.ts:
(pass) spawn limits > schema loads global and workspace caps [8.17ms]
(pass) spawn limits > rejects invalid cap %s with file and key [45.38ms]
(pass) spawn limits > rejects invalid cap %s with file and key [2.04ms]
(pass) spawn limits > rejects invalid cap %s with file and key [6.13ms]
(pass) spawn limits > omitted limits normalize to no caps [1.42ms]
(pass) spawn limits > global boundary refusal data counts the whole request [9.89ms]
(pass) spawn limits > one workspace may use the full global allotment [2.06ms]
(pass) spawn limits > workspace cap is independent of global headroom [2.01ms]
(pass) spawn limits > uncapped workspace is bounded only by global count [1.54ms]
(pass) spawn limits > dead pid records free capacity [1.37ms]
(pass) spawn limits > foreign panes never count [1.19ms]
(pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [7.12ms]
(pass) spawn limits > doctor accepts satisfiable limits [5.40ms]

test\wall-single-owner.test.ts:
(pass) workspace wall ownership > keeps the wall decision primitive in one source module [309.33ms]

test\work-notify.test.ts:
(pass) orch work notifications > delivers a presence transition through a configured command sink [2499.93ms]

test\worker-prompt.test.ts:
(pass) worker prompt capability composition > work loop gives codex the base header without orch_ask [598.46ms]
(pass) worker prompt capability composition > work loop gives pi the orch_ask header clause [301.48ms]
(pass) worker prompt capability composition > orch run composition selects the same header per adapter [1.08ms]
(pass) worker prompt capability composition > locked-commands clause names the commands when the list is non-empty [0.41ms]
(pass) worker prompt capability composition > no locked-commands clause when the list is empty [1.08ms]
(pass) worker prompt capability composition > events strip both worker header variants [10.30ms]

test\worker-tools.test.ts:
(pass) worker tool policy > default spawn omits peer tools [0.24ms]
(pass) worker tool policy > explicitly disabled peer tools are omitted [0.07ms]
(pass) worker tool policy > config enables all peer tools [0.07ms]

test\workspace-policy.test.ts:
(pass) workspace policy > reads workspaces from serialized identity keys [0.46ms]
(pass) workspace policy > resolves workspace names through records and functions [0.31ms]
(pass) workspace policy > compares serialized keys by their workspace [0.21ms]
(pass) workspace policy > enforces the workspace wall [0.26ms]
(pass) workspace policy > scopes serialized identity keys to the current workspace [0.54ms]
(pass) workspace policy > null current workspace leaves items unscoped [0.26ms]
(pass) workspace policy > 2.7 status displays the reported workspace identity field [251.08ms]
(pass) workspace policy > 6.6 structured identity drives status and policy, not serialized key text [28.23ms]

test\workspace-walls.test.ts:
(pass) workspace helpers > extracts workspace ids only from identity keys [0.20ms]
(pass) workspace helpers > derives an entity workspace from the identity key [0.13ms]
(pass) workspace helpers > returns the same entities when all workspaces are requested [0.07ms]
(pass) workspace wall writes > allows a write within the same workspace [0.08ms]
(pass) workspace wall writes > denies a cross-workspace write with both workspaces in the reason [0.09ms]
(pass) workspace wall writes > applies the same wall rule to herdr, tmux, and headless identities [0.23ms]
(pass) workspace wall writes > allows a cross-workspace write with an explicit override [0.06ms]
(pass) workspace wall writes > allows legacy unscoped targets [0.06ms]
(pass) workspace-aware queued task selection > excludes tasks pinned to another workspace [0.14ms]
(pass) workspace-aware queued task selection > keeps legacy tasks eligible in any workspace [0.08ms]
(pass) workspace-aware queued task selection > selects the earliest eligible task and respects agent constraints [0.80ms]

test\worktree.test.ts:
Preparing worktree (new branch 'orch/fixes-1')
(pass) worktree primitives > creates and lists an agent worktree on an orch branch [5080.02ms]
Preparing worktree (new branch 'orch/feature')
(pass) worktree primitives > detects commits ahead of a base branch [6522.74ms]
Preparing worktree (new branch 'orch/remove-me')
(pass) worktree primitives > removes an agent worktree [4322.56ms]
fatal: not a git repository (or any of the parent directories): .git
(pass) worktree primitives > rejects a non-repository path with a clear error [308.53ms]

3 tests skipped:
(skip) claude-hooks shim tests need the dist bundle
(skip) deliverControl > executes codex steer command and accepts exit zero
(skip) deliverControl > treats a nonzero codex command exit as failure


1 tests failed:
(fail) review plumbing > reject re-dispatches feedback through the adapter inbox [10072.48ms]

 399 pass
 3 skip
 1 fail
 1011 expect() calls
Ran 403 tests across 77 files. [228.49s]
