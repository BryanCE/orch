bun test v1.3.14 (0d9b296a)

test\adapter-allowlist.test.ts:
(pass) pi adapter tool allowlist > declares exactly the built-ins and bridge tools [77.99ms]
(pass) pi adapter tool allowlist > restricts interactive pi launches to the allowlist [0.42ms]
(pass) pi adapter tool allowlist > restricts headless pif launches and preserves the prompt [0.22ms]

test\adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [13.85ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [37.00ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [5.96ms]
(pass) adapter and runtime hardening > headless generates one safe presence key when no key is supplied [48.49ms]

test\adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.51ms]
(pass) PiAdapter > declares its lifecycle slash-commands [9.44ms]
(pass) PiAdapter > reads state from the presence status through store helpers [3.62ms]
(pass) PiAdapter > appends a steer message to the presence inbox [2.87ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [2.64ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [25.56ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > spawns a detached process and records its handle [435.52ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [1539.96ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [855.64ms]
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [770.52ms]
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [4.36ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [2.05ms]
(pass) HeadlessBackend > never signals an unrecorded pid [3.72ms]

test\backend-herdr.test.ts:
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [3.50ms]
(pass) HerdrBackend > maps close and list to herdr helpers [1.10ms]

test\backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [0.32ms]
(pass) TmuxBackend > reports tmux availability [62.99ms]
(pass) TmuxBackend > reflects the TMUX environment [0.40ms]
(pass) TmuxBackend > mints identity from the owning session [0.37ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.18ms]
(pass) TmuxBackend > list() and inventory() surface only orch-spawned panes [1.53ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.31ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [1.57ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.36ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [51.66ms]
(pass) TmuxBackend > waitAgentStatus fails immediately when the pane has no presence key [0.22ms]
(pass) TmuxBackend > read returns captured text and throws when capture-pane fails [0.30ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [0.38ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.60ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.28ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [1.04ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.31ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.57ms]
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [37.28ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [59.95ms]
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [117.74ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [0.53ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [254.37ms]

test\broker-governance.test.ts:
(pass) daemon governWrite enforcement > unscoped actor bypasses ownership and the wall [69.73ms]
(pass) daemon governWrite enforcement > owner may write to its own agent [26.67ms]
(pass) daemon governWrite enforcement > a foreign owner in the same workspace is refused [61.66ms]
(pass) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [25.12ms]
(pass) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [49.86ms]
(pass) daemon governWrite enforcement > --steal transfers ownership to the actor [53.37ms]
(pass) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [42.54ms]

test\broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [53.93ms]
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [0.97ms]
(pass) broker ownership and workspace governance > work-loop selection stays within the origin workspace [70.90ms]

test\broker-routing.test.ts:
(pass) broker CLI routing > write refuses when the daemon socket is unavailable [13280.95ms]
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [2525.96ms]
(pass) broker CLI routing > dispatch failure is daemon-absent, not herdr-not-found [8335.34ms]

test\claude-adapter.test.ts:
(pass) Claude adapter > declares its identity and capabilities [5.96ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.23ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.25ms]
(pass) Claude adapter > detects state from a live presence status [81.03ms]
(pass) Claude adapter > extracts result.json before transcript and native output [4.82ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [3.13ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [4651.47ms]
(pass) Claude adapter > exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session) [997.63ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed ORCH_AGENT_KEY [1797.03ms]

test\claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [874.32ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [302.86ms]
(pass) claude-hooks shim > under node > writes status.json for a valid key [336.29ms]
(pass) claude-hooks shim > under deno > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [709.21ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under deno > exits 1 loudly on a present-but-malformed key [823.59ms]
(pass) claude-hooks shim > under deno > writes status.json for a valid key [1170.59ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [1117.54ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [390.79ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [389.36ms]
(skip) claude-hooks shim tests need the dist bundle

test\clean-worktrees.test.ts:
Preparing worktree (new branch 'orch/empty')
Preparing worktree (new branch 'orch/merged')
Preparing worktree (new branch 'orch/unmerged')
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [21409.02ms]
Preparing worktree (new branch 'orch/discard')
fatal: 'refs/heads/orch/discard' - not a valid ref
(pass) clean worktrees > --force discards an unmerged orphan and its branch [17793.41ms]

test\cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.40ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.28ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.27ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.26ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.43ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.21ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [151.31ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [0.31ms]
(pass) headless common path: identity key -> presence > spawn mints a filesystem-safe headless identity and creates its presence dir [307.46ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [4281.13ms]
(pass) headless common path: identity key -> presence > one adapter uses opaque keys across headless and tmux backend routes [0.22ms]
(pass) headless common path: identity key -> presence > workspaceOf reads the workspace from the structured key, not a regex [0.14ms]

test\cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.65ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [82.45ms]
(pass) tmux backend registry and capabilities > exposes pane capabilities [0.53ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.18ms]
(pass) tmux backend registry and capabilities > mints identity from a protected session seam [0.23ms]
(pass) tmux backend registry and capabilities > serializes tmux identities as one flat key [0.21ms]
(pass) tmux backend registry and capabilities > rejects an empty handle without invoking tmux [0.07ms]
(pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [44.05ms]
(pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [0.42ms]
(pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [3.34ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-workspace [0.44ms]

test\cmd-lock.test.ts:
(pass) command lock > acquire and release round-trip [3.45ms]
(pass) command lock > second acquire blocks until first releases [83.80ms]
(pass) command lock > dead-pid lock is reaped [49.58ms]
(pass) command lock > release with wrong pid refuses [2.16ms]
bun test
(pass) command lock > matches locked command prefixes and probes settings [20.75ms]
(pass) command lock > run propagates the child exit code [1454.85ms]

test\codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [115.23ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [2.81ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [3.19ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [8.37ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [6.11ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [3189.82ms]

test\command-workspace-fields.test.ts:
(pass) command workspace fields > status and wall entities use persisted workspace instead of serialized-key text [176.65ms]
(pass) command workspace fields > status reports a mixed pi and Claude fleet with the same identity fields [60.07ms]

test\commands-clean.test.ts:
(pass) commands/clean > reaps dead agent dirs but preserves live pids [117.44ms]

test\commands-control.test.ts:
(pass) commands/control > parses dispatch flags without losing prompt words [216.31ms]
(pass) commands/control > parses --then destination and note [0.10ms]
(pass) commands/control > adds worker header unless raw [0.19ms]

test\commands-daemon.test.ts:
(pass) commands/daemon > parses governance and validates daemon status [75.41ms]
(pass) commands/daemon > reads only a positive integer lock pid [2.82ms]

test\commands-events.test.ts:
(pass) commands/events > parses filters, scope, notification, and offline flags [60.32ms]
(pass) commands/events > rejects malformed event and labels sinks [0.29ms]

test\commands-index.test.ts:
(pass) commands/index > does not gate help or noninteractive commands [228.23ms]
(pass) commands/index > reads a package version string [2.63ms]

test\commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [100.91ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [0.20ms]

test\commands-panes.test.ts:
(pass) commands/panes > pane identity remains backend-neutral [21.39ms]
(pass) commands/panes > exports the pane listing command directly [0.22ms]

test\commands-queue.test.ts:
(pass) commands/queue > round-trips add/list/cancel on an isolated store [117.90ms]
No queue tasks.
(pass) commands/queue > renders empty queues without throwing [0.23ms]

test\commands-results.test.ts:
(pass) commands/results > validates and extracts question payloads [34.13ms]
(pass) commands/results > formats invalid and recent timestamps [0.23ms]
(pass) commands/results > routes a seeded result.json through the command module [142.39ms]

test\commands-review.test.ts:
(pass) commands/review > uses the short orch branch as review target [37.33ms]
(pass) commands/review > falls back to branch then pane [0.09ms]

test\commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.34ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [1.20ms]

test\commands-spawn.test.ts:
(pass) commands/spawn > parses spawn flags and rejects no implicit adapter assumptions [65.64ms]
(pass) commands/spawn > identifies pi launchers and preserves raw prompt [0.25ms]

test\commands-status.test.ts:
(pass) commands/status > derives view fields from seeded presence [54.41ms]
(pass) commands/status > marks dead presence as exited [0.23ms]
(pass) commands/status > formats workspace labels and warnings [0.26ms]

test\commands-target.test.ts:
(pass) commands/target > splits known flags and preserves positional args [8.33ms]
(pass) commands/target > extracts target and joined prompt [0.23ms]
(pass) commands/target > reads only structured result text [0.07ms]
(pass) commands/target > quotes remote args and ORCH_DIR safely [0.23ms]
(pass) commands/target > lists only live serialized identity presence entries [12.57ms]

test\config-precedence.test.ts:
(pass) config precedence > returns a defaults value when no override is set [213.38ms]
(pass) config precedence > applies defaults when config, env, and flag are absent [56.13ms]
(pass) config precedence > uses env over config and flag over env [9.77ms]
(pass) config precedence > parses notify entries and hosts into expected shapes [22.29ms]
(pass) config precedence > reports a helpful validation error for invalid config [16.45ms]

test\config-watch.test.ts:
(pass) watchConfig > applies a valid edit after the debounced change [847.65ms]
(pass) watchConfig > keeps the last-good config and warns once for an invalid edit [1275.01ms]
(pass) watchConfig > stop prevents further callbacks [636.26ms]

test\config.test.ts:
(pass) loadConfig > uses defaults when settings.json is missing [1.94ms]
(pass) loadConfig > parses every supported settings section [5.27ms]
(pass) loadConfig > rejects a file without the current schemaVersion [4.77ms]
(pass) loadConfig > rejects invalid JSON loudly [1.59ms]
(pass) loadConfig > names the key path for invalid fields [2.02ms]
(pass) loadConfig > rejects unknown settings keys [1.86ms]
(pass) loadConfig > parses defaults.allowed_models as a string array [1.79ms]
(pass) loadConfig > rejects a non-string entry in defaults.allowed_models [2.37ms]
(pass) loadConfig > validates defaults.worker_peer_tools as a boolean [2.13ms]
(pass) loadConfig > accepts true and false for defaults.worker_peer_tools [3.60ms]
(pass) loadConfig > leaves defaults.worker_peer_tools absent when unset [1.08ms]
(pass) loadConfig > rejects a host without dest [2.24ms]
(pass) loadConfig > rejects an unknown id in installed.adapters [2.18ms]
(pass) loadConfig > rejects defaults.adapter not present in installed.adapters [2.01ms]
(pass) loadConfig > rejects when settings.json is absent but a legacy config.toml exists [1.91ms]
(pass) allowedModelPatterns > returns the built-in defaults when config is absent [1.04ms]
(pass) allowedModelPatterns > returns the configured patterns when set [1.82ms]
(pass) writeSettingsInstalled > round-trips both provider arrays [3.31ms]
(pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [25.59ms]
(pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [3.70ms]
(pass) writeSettingsDefault > is idempotent when rewriting the same value [9.44ms]
(pass) writeSettingsDefault > refuses to write through an out-of-version settings file [1.96ms]
(pass) writeSettingsDefault > switches defaults.adapter between two installed ids and loads clean [3.32ms]
(pass) config precedence > uses the fallback when env and settings.json omit a setting [0.98ms]
(pass) config precedence > uses the settings.json value over the fallback [3.64ms]
(pass) config precedence > uses the ORCH_* environment value over settings.json [2.68ms]
(pass) config precedence > uses an explicit flag override over the environment [0.17ms]
(pass) resolveSetting > uses flag, environment coercion, config, then fallback in precedence order [0.21ms]
(pass) resolveWithSource > reports the winning source at each precedence level [0.16ms]

test\control-dispatch.test.ts:
(pass) deliverControl > steers pi through its presence inbox [42.65ms]
(pass) deliverControl > warns and succeeds when claude keys fallback delivers [65.26ms]
steering headless~local~claude-fail via claude keys fallback (degraded delivery)
(pass) deliverControl > fails when claude keys fallback cannot deliver [28.29ms]
(skip) deliverControl > executes codex steer command and accepts exit zero
(skip) deliverControl > treats a nonzero codex command exit as failure
(pass) deliverControl > fails unsupported steer and setModel capabilities [24.96ms]
(pass) deliverControl > requires presence for inbox delivery [39.36ms]

test\daemon-configwatch.test.ts:
(pass) config watch > loads initially and applies edits [507.45ms]
(pass) config watch > keeps the last good config on invalid JSON and recovers [497.75ms]
(pass) config watch > stops all callbacks [286.08ms]

test\daemon-events.test.ts:
(pass) daemon presence events > an RPC subscriber receives a presence transition [307.69ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [12.20ms]
(pass) daemon presence events > a blocked transition drives command sink delivery [726.70ms]
(pass) daemon presence events > a dead daemon falls back once and diffs the switch snapshot [222.31ms]

test\daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [7.91ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [4.24ms]
(pass) daemon lifecycle > rejects malformed locks and a socket probe that fails [4.53ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [2.89ms]
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
  add       elysia               Add a dependency to package.json (bun a)
  remove    babel-core           Remove a dependency from package.json (bun rm)
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
  create    astro                Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [125.80ms]
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [67.88ms]
(pass) daemon lifecycle > rejects a recycled pid identity [2.17ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [1.92ms]

test\daemon-rpc.test.ts:
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
  remove    is-array             Remove a dependency from package.json (bun rm)
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
  create    astro                Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon RPC > round-trips a call over the real unix socket [135.69ms]
(pass) daemon RPC > returns an error for an unknown method [254.64ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [515.16ms]
(pass) daemon RPC > delivers pushed subscription events [274.32ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [386.85ms]
(pass) daemon RPC > has a catchable absent-daemon error [7.75ms]

test\doctor-backends.test.ts:
(pass) doctor backend and presence checks > reports every registered backend and boolean capability fields [110.67ms]
(pass) doctor backend and presence checks > reports only malformed or legacy presence records [11.85ms]

test\doctor-checks.test.ts:
(pass) doctor notification-sink checks > reports no sinks as healthy [56.65ms]
(pass) doctor notification-sink checks > warns for a webhook with a malformed URL [36.25ms]
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [22.12ms]
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [21.32ms]

test\doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [12.41ms]
(pass) doctor Claude hooks shim check > accepts the node runtime command form [7.71ms]
(pass) doctor Claude hooks shim check > accepts the deno runtime command form [7.72ms]
(pass) doctor Claude hooks shim check > accepts the bun runtime command form [1.80ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [1.40ms]
(pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [1.45ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [2.37ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [1.14ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [1.26ms]

test\doctor-hosts.test.ts:
(pass) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [35.07ms]
(pass) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [94.27ms]
(pass) doctor remote host checks > flags a remote orch version/schema mismatch in detail [46.19ms]
(pass) doctor remote host checks > reports no remote hosts configured as healthy [7.90ms]

test\doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [77.38ms]
(pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [45.71ms]
(pass) doctor stale presence safety > no dead agents leaves nothing to remove [60.67ms]

test\doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [91.39ms]
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [50.19ms]
(pass) runDoctor > reports an absent daemon as optional [3.47ms]
(pass) runDoctor > reports and fixes a stale daemon lock [5.14ms]
(pass) runDoctor > accepts a live daemon and an answerable socket [391.31ms]
(pass) runDoctor > warns when the live daemon code hash is stale [21.92ms]
(pass) runDoctor > fails on an invalid lock and an unanswerable live socket [14.63ms]
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [3.39ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [7.77ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [3.52ms]
(pass) runDoctor > reports a dead presence pid and corrupt spawn registry lines [79.63ms]
(pass) runDoctor > bins check is driven by the installed set and offers no fix [3.34ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [9.91ms]
(pass) runDoctor > validates configured notifier adapters [70.80ms]
notify: could not load settings.json: Error: C:\Users\Bryan\AppData\Local\Temp\orch-doctor-9BXiu6\settings.json: invalid settings: Γ£û Invalid input: expected number, received string ΓåÆ at queue.max_retries
(pass) runDoctor > reports invalid config and accepts missing config [12.21ms]
(pass) runDoctor > never throws when individual checks encounter broken inputs [26.71ms]

test\herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [15.19ms]
(pass) herdr and notification hardening > falls back to a real name when an adapter id is blank [1.46ms]
(pass) herdr and notification hardening > nameless notifications use a workspace label, never a bare pane key [0.50ms]

test\identity.test.ts:
(pass) serializeIdentity / parseIdentity round-trip > round-trips herdr [0.14ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with % handle [0.10ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with : and % handle [0.03ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips headless pid handle [0.02ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips empty workspace [0.05ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips separator inside parts [0.03ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips slash inside parts [0.02ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips percent-code-lookalike [0.02ms]
(pass) serializeIdentity / parseIdentity round-trip > serialized key is a single flat segment (no nested path) [0.10ms]
(pass) serializeIdentity / parseIdentity round-trip > backend namespaces prevent collisions across equal workspace/handle [0.12ms]
(pass) malformed input > rejects wrong segment count [0.21ms]
(pass) malformed input > rejects empty key [0.10ms]
(pass) malformed input > rejects empty backend or handle on serialize [0.17ms]
(pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.07ms]
(pass) malformed input > tryParseIdentity parses a valid key [0.06ms]

test\notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > skips an unavailable adapter without affecting available adapters [1.12ms]
notify: webhook notifier has invalid configuration
(pass) notifier registry and built-in adapters > reports malformed required configuration instead of throwing [0.60ms]
(pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [3.99ms]
(pass) notifier registry and built-in adapters > command adapter passes canonical JSON on stdin [531.00ms]
(pass) notifier registry and built-in adapters > desktop fallback selects notify-send, then WSL notify when it fails [7.04ms]
notify: bad sink failed
(pass) notifier registry and built-in adapters > isolates delivery failures and still delivers to other adapters [2.46ms]

test\notify-events-format.test.ts:
(pass) notification and presence event formatting > workspaceColor is stable and returns a palette hex [0.66ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [1.21ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [1.34ms]
(pass) notification and presence event formatting > webhook payload includes workspace and workspaceColor [3.86ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [2.03ms]
(pass) notification and presence event formatting > derivePresenceTransition derives workspace from identity keys [0.88ms]

test\notify-sinks.test.ts:
(pass) notify sinks > delivers command sink payload as JSON [1207.44ms]
(pass) notify sinks > loadSinks parses command and webhook declarations [32.12ms]

test\notify.test.ts:
(pass) notify > parses valid sinks and warns about unknown types and missing fields [30.02ms]
 98 |       newState: "done",
 99 |       ts: "2026-01-01T00:00:00.000Z",
100 |     });
101 |     await waitForFile(matchingFile);
102 | 
103 |     expect(readFileSync(matchingFile, "utf8")).toBe("matched");
                 ^
ENOENT: no such file or directory, open 'C:\Users\Bryan\AppData\Local\Temp\orch-notify-5dOBgh\matching'
    path: "C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-notify-5dOBgh\\matching",
 syscall: "open",
   errno: -2,
    code: "ENOENT"

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\notify.test.ts:103:12)
(fail) notify > delivers only to sinks whose on filter matches the event [1076.04ms]
(pass) notify > command sink writes the event payload as JSON on stdin [909.12ms]
(pass) notify > titles lead with exactly one terminal state and agent [17.92ms]
(pass) notify > webhook failure is non-fatal and reports a warning [46.48ms]

test\orchd-rpc-replay.test.ts:
(pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [0.25ms]
(pass) orchd RPC replay buffer > drops the oldest events and reports a replay gap [32.28ms]

test\orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [243.44ms]

test\orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [78.81ms]
(pass) orchd RPC transports > round-trips over the TCP fallback transport [179.67ms]

test\outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [30.36ms]

test\outbox.test.ts:
(pass) outbox delivery > selects pending messages and delivers each message once [28.79ms]
(pass) outbox delivery > keeps failed messages pending until their backoff expires [26.96ms]

test\ownership.test.ts:
(pass) agent ownership > round-trips an owner [84.10ms]
(pass) agent ownership > allows unowned and same-owner writes [49.33ms]
(pass) agent ownership > denies foreign writes and supports stealing [49.18ms]

test\parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [136.90ms]
(pass) <host>/<target> grammar > parses configured host prefixes [1.23ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.76ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.62ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.45ms]

test\presence-schema.test.ts:
(pass) presence status schema > reads a spawned namespaced identity with backend, workspace, handle, and adapter [1324.36ms]
(pass) presence status schema > orch status JSON exposes the complete spawned identity fields [1650.95ms]
(pass) presence status schema > status and list report the same agent identity [629.04ms]
(pass) presence status schema > mixed pi and Claude status rows carry the same identity field set [599.16ms]
(pass) presence status schema > keeps schema-1 status records valid without adding fields [3407.67ms]
(pass) presence status schema > loads a mixed directory of schema-1 and schema-2 records [552.59ms]
(pass) presence status schema > persists the complete spawned identity record [9.29ms]

test\queue-workspace-replay.test.ts:
(pass) queue workspace replay > persists workspace through append-only replay [106.00ms]
(pass) queue workspace replay > keeps legacy tasks without a workspace [49.34ms]
(pass) queue workspace replay > replays separate workspace values for multiple tasks [38.59ms]
(pass) queue workspace replay > selects only tasks eligible for the requested workspace [47.66ms]

test\queue.test.ts:
(pass) queue > add then list shows a queued task [137.95ms]
(pass) queue > exactly one claimer wins, including parallel attempts [69.11ms]
(pass) queue > replays done, failed, and retry transitions [124.69ms]
(pass) queue > cancels queued tasks and returns an error result for claimed tasks [79.27ms]
(pass) queue > picks queued tasks FIFO, honoring the agent constraint [70.04ms]
(pass) queue > caps retries: requeue below the cap, terminal failed at it [69.36ms]
(pass) queue > settles a claimed task to done and blocks any later claim [50.66ms]
(pass) queue > exactly one of two racing claimers wins [61.35ms]

test\remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [1660.29ms]
(pass) async remote fan-out > returns a typed dead-host failure [1371.25ms]
(pass) async remote fan-out > returns a typed timeout failure [641.24ms]
(pass) async remote fan-out > returns a typed non-JSON failure [2023.84ms]
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [1274.95ms]

test\remote.test.ts:
58 | 
59 | describe("remote SSH executor", () => {
60 |   test("runs BatchMode SSH and parses JSON", () => {
61 |     const { bin, record } = fixture();
62 |     const result = runRemote("gpu1", { dest: "bryan@gpu1" }, ["status"], { timeoutMs: 3000, sshBin: bin });
63 |     expect(result).toEqual({ ok: true, value: { host: "gpu1", ok: true } });
                        ^
error: expect(received).toEqual(expected)

  {
-   "ok": true,
-   "value": {
+   "failure": {
      "host": "gpu1",
-     "ok": true,
+     "kind": "timeout",
+     "message": "Host "gpu1" timed out after 3000ms.",
    },
+   "ok": false,
  }

- Expected  - 3
+ Received  + 4

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\remote.test.ts:63:20)
(fail) remote SSH executor > runs BatchMode SSH and parses JSON [113.51ms]
38 | function fsRead(file: string): string {
39 |   return readFileSync(file, "utf8");
40 | }
41 | 
42 | function recorded(record: string): string {
43 |   expect(existsSync(record)).toBe(true);
                                  ^
error: expect(received).toBe(expected)

Expected: true
Received: false

      at recorded (C:\Users\Bryan\Documents\orch\test\remote.test.ts:43:30)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\remote.test.ts:71:12)
(fail) remote SSH executor > returns a typed timeout failure [539.13ms]
(pass) remote SSH executor > returns a dead-host failure [2050.48ms]
(pass) remote SSH executor > returns a non-JSON failure [1271.77ms]
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.21ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.15ms]

test\review.test.ts:
Preparing worktree (new branch 'orch/feature-1')
(pass) review plumbing > lists only done worktree agents with commits ahead [8107.48ms]
Preparing worktree (new branch 'orch/iterate-1')
(pass) review plumbing > reject re-dispatches feedback through the adapter inbox [11039.08ms]
Preparing worktree (new branch 'orch/approve-1')
fatal: 'refs/heads/orch/approve-1' - not a valid ref
(pass) review plumbing > approve merges and removes the worktree and branch [11968.40ms]
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
(pass) review plumbing > conflicting approval aborts without changing either branch [7485.95ms]
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
(pass) review plumbing > non-fast-forward approval creates a merge commit [7424.56ms]

test\routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves origin workspace selection [61.69ms]
(pass) store hardening > reopening an old outbox schema applies the migration idempotently and enables WAL [67.60ms]
(pass) store hardening > a steal updates ownership only when the observed owner still matches [60.55ms]
(pass) store hardening > the conditional claim is exactly once [72.57ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [2922.72ms]

test\settings-command.test.ts:
(pass) orch settings > --json reports value + source per setting, settings.json winning over defaults [1437.68ms]
(pass) orch settings > --json reports env as the winning source over settings.json [2203.63ms]
C:\Users\Bryan\AppData\Local\Temp\orch-settings-cmd-exEbBS\settings.json: defaults.adapter: "codex" is not an installed adapter ΓÇö installed: pi, claude; re-run orch setup
(pass) orch settings > --harness switches defaults.adapter between installed ids and rejects a non-installed id [5619.29ms]
C:\Users\Bryan\AppData\Local\Temp\orch-settings-cmd-RbbXvA\config.toml: legacy config.toml detected ΓÇö settings now live in C:\Users\Bryan\AppData\Local\Temp\orch-settings-cmd-RbbXvA\settings.json; re-run orch setup (the old values are not read)
(pass) orch settings > a load error surfaces loudly with no partial table [960.92ms]

test\setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [117.94ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.45ms]
(pass) notifier setup logic > renders a command entry that loadConfig can parse [3.50ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.55ms]

test\spawn-limits.test.ts:
(pass) spawn limits > schema loads global and workspace caps [49.41ms]
(pass) spawn limits > rejects invalid cap %s with file and key [26.01ms]
(pass) spawn limits > rejects invalid cap %s with file and key [5.68ms]
(pass) spawn limits > rejects invalid cap %s with file and key [1.98ms]
(pass) spawn limits > omitted limits normalize to no caps [0.89ms]
(pass) spawn limits > global boundary refusal data counts the whole request [16.98ms]
(pass) spawn limits > one workspace may use the full global allotment [44.29ms]
(pass) spawn limits > workspace cap is independent of global headroom [9.86ms]
(pass) spawn limits > uncapped workspace is bounded only by global count [9.36ms]
(pass) spawn limits > dead pid records free capacity [10.94ms]
(pass) spawn limits > foreign panes never count [5.34ms]
(pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [21.04ms]
(pass) spawn limits > doctor accepts satisfiable limits [19.89ms]

test\wall-single-owner.test.ts:
(pass) workspace wall ownership > keeps the wall decision primitive in one source module [461.92ms]

test\work-notify.test.ts:
(pass) orch work notifications > delivers a presence transition through a configured command sink [1108.19ms]

test\work-race.test.ts:
22 |       const code = (error as { code?: string }).code;
23 |       if (code !== "EBUSY" && code !== "ENOTEMPTY" && code !== "EPERM") throw error;
24 |       pauseMs(50);
25 |     }
26 |   }
27 |   rmSync(dir, { recursive: true, force: true });
       ^
error: EBUSY: resource busy or locked, rm 'C:\Users\Bryan\AppData\Local\Temp\orch-work-race-rFsvKE'
      at removeTempDir (C:\Users\Bryan\Documents\orch\test\helpers\tempdir.ts:27:3)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\work-race.test.ts:49:31)
(fail) orch work claim race > two concurrent workers produce one claim and the loser exits cleanly [4548.03ms]

test\worker-prompt.test.ts:
(pass) worker prompt capability composition > work loop gives codex the base header without orch_ask [307.91ms]
(pass) worker prompt capability composition > work loop gives pi the orch_ask header clause [285.85ms]
(pass) worker prompt capability composition > orch run composition selects the same header per adapter [0.93ms]
(pass) worker prompt capability composition > events strip both worker header variants [1.44ms]

test\worker-tools.test.ts:
(pass) worker tool policy > default spawn omits peer tools [0.23ms]
(pass) worker tool policy > explicitly disabled peer tools are omitted [0.07ms]
(pass) worker tool policy > config enables all peer tools [0.07ms]

test\workspace-policy.test.ts:
(pass) workspace policy > reads workspaces from serialized identity keys [0.55ms]
(pass) workspace policy > resolves workspace names through records and functions [0.34ms]
(pass) workspace policy > compares serialized keys by their workspace [0.13ms]
(pass) workspace policy > enforces the workspace wall [0.20ms]
(pass) workspace policy > scopes serialized identity keys to the current workspace [0.74ms]
(pass) workspace policy > null current workspace leaves items unscoped [0.10ms]
(pass) workspace policy > 2.7 status displays the reported workspace identity field [26.50ms]
(pass) workspace policy > 6.6 structured identity drives status and policy, not serialized key text [25.41ms]

test\workspace-walls.test.ts:
(pass) workspace helpers > extracts workspace ids only from identity keys [0.18ms]
(pass) workspace helpers > derives an entity workspace from the identity key [0.15ms]
(pass) workspace helpers > returns the same entities when all workspaces are requested [0.12ms]
(pass) workspace wall writes > allows a write within the same workspace [0.06ms]
(pass) workspace wall writes > denies a cross-workspace write with both workspaces in the reason [0.08ms]
(pass) workspace wall writes > applies the same wall rule to herdr, tmux, and headless identities [0.19ms]
(pass) workspace wall writes > allows a cross-workspace write with an explicit override [0.09ms]
(pass) workspace wall writes > allows legacy unscoped targets [0.06ms]
(pass) workspace-aware queued task selection > excludes tasks pinned to another workspace [0.13ms]
(pass) workspace-aware queued task selection > keeps legacy tasks eligible in any workspace [0.08ms]
(pass) workspace-aware queued task selection > selects the earliest eligible task and respects agent constraints [5.03ms]

test\worktree.test.ts:
Preparing worktree (new branch 'orch/fixes-1')
(pass) worktree primitives > creates and lists an agent worktree on an orch branch [3719.85ms]
Preparing worktree (new branch 'orch/feature')
(fail) worktree primitives > detects commits ahead of a base branch [6104.46ms]
  ^ this test timed out after 5000ms.
Preparing worktree (new branch 'orch/remove-me')
(fail) worktree primitives > removes an agent worktree [6070.63ms]
  ^ this test timed out after 5000ms.
fatal: not a git repository (or any of the parent directories): .git
(pass) worktree primitives > rejects a non-repository path with a clear error [537.56ms]

3 tests skipped:
(skip) claude-hooks shim tests need the dist bundle
(skip) deliverControl > executes codex steer command and accepts exit zero
(skip) deliverControl > treats a nonzero codex command exit as failure


6 tests failed:
(fail) notify > delivers only to sinks whose on filter matches the event [1076.04ms]
(fail) remote SSH executor > runs BatchMode SSH and parses JSON [113.51ms]
(fail) remote SSH executor > returns a typed timeout failure [539.13ms]
(fail) orch work claim race > two concurrent workers produce one claim and the loser exits cleanly [4548.03ms]
(fail) worktree primitives > detects commits ahead of a base branch [6104.46ms]
  ^ this test timed out after 5000ms.
(fail) worktree primitives > removes an agent worktree [6070.63ms]
  ^ this test timed out after 5000ms.

 390 pass
 3 skip
 6 fail
 992 expect() calls
Ran 399 tests across 77 files. [223.95s]
