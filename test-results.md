bun test v1.3.13 (bf2e2cec)

test/commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.58ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [3.03ms]
(pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.21ms]

test/daemon-rpc.test.ts:
(pass) daemon RPC > round-trips a call over the real unix socket [12.14ms]
(pass) daemon RPC > returns an error for an unknown method [4.08ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [12.80ms]
(pass) daemon RPC > delivers pushed subscription events [11.13ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [4.33ms]
(pass) daemon RPC > has a catchable absent-daemon error [0.67ms]

test/clean-worktrees.test.ts:
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [170.96ms]
fatal: 'refs/heads/orch/discard' - not a valid ref
(pass) clean worktrees > --force discards an unmerged orphan and its branch [146.88ms]

test/review.test.ts:
(pass) review plumbing > lists only done worktree agents with commits ahead [148.21ms]
(pass) review plumbing > reject re-dispatches feedback through the adapter inbox [499.76ms]
fatal: 'refs/heads/orch/approve-1' - not a valid ref
(pass) review plumbing > approve merges and removes the worktree and branch [166.41ms]
fatal: Not possible to fast-forward, aborting.
(pass) review plumbing > conflicting approval aborts without changing either branch [37.70ms]
fatal: Not possible to fast-forward, aborting.
(pass) review plumbing > non-fast-forward approval creates a merge commit [40.93ms]

test/codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [1.51ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [0.44ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [0.32ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [0.76ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [0.23ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [106.95ms]

test/daemon-events.test.ts:
(pass) daemon presence events > an RPC subscriber receives a presence transition [19.93ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [0.12ms]
(pass) daemon presence events > a blocked transition drives command sink delivery [21.63ms]
(pass) daemon presence events > a dead daemon closes the subscription instead of falling back to files [13.07ms]
(pass) daemon presence events > a caller-initiated stop is not reported as a disconnect [55.15ms]

test/commands-panes.test.ts:
(pass) commands/panes > pane identity remains backend-neutral [1.88ms]
(pass) commands/panes > exports the pane listing command directly [0.02ms]

test/doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env node as node [0.50ms]
(pass) shebangRuntime > reads #!/usr/bin/env bun as bun [0.24ms]
(pass) shebangRuntime > reads #!/usr/bin/env deno as deno [0.19ms]
(pass) shebangRuntime > reads #!/usr/local/bin/node as node [0.13ms]
(pass) shebangRuntime > does not mistake a longer binary name for a runtime [0.15ms]
(pass) shebangRuntime > returns null for a file with no shebang [0.15ms]
(pass) shebangRuntime > returns null for an unreadable path [0.15ms]
(pass) runningRuntime > reports the runtime this suite is executing under [0.04ms]
(pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [1.90ms]
(pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [0.18ms]
(pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [0.24ms]
(pass) doctor runtime verdict table > declared node but executing under bun fails [0.25ms]
(pass) doctor runtime verdict table > declared bun but executing under node fails just as loudly [0.25ms]
(pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [0.32ms]
(pass) doctor runtime verdict table > declared runtime absent from PATH fails [0.27ms]
(pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [0.21ms]
(pass) doctor runtime verdict table > remediation names both directions — rebuild, or re-record the declaration [0.20ms]
(pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [0.21ms]

test/herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [0.27ms]
(pass) herdr and notification hardening > falls back to a real name when an adapter id is blank [0.05ms]
(pass) herdr and notification hardening > nameless notifications use a workspace label, never a bare pane key [0.14ms]

test/routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves origin workspace selection [36.82ms]
(pass) store hardening > reopening an old outbox schema applies the migration idempotently and enables WAL [24.36ms]
(pass) store hardening > a steal updates ownership only when the observed owner still matches [23.63ms]
(pass) store hardening > the conditional claim is exactly once [25.68ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [119.30ms]

test/parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [0.11ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.04ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.05ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.04ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.04ms]

test/claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [74.92ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [26.90ms]
(pass) claude-hooks shim > under node > writes status.json for a valid key [20.15ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [18.46ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [20.32ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [21.21ms]
(skip) claude-hooks shim tests need the dist bundle

test/wall-single-owner.test.ts:
(pass) workspace wall ownership > keeps the wall decision primitive in one source module [3.48ms]

test/adapter-allowlist.test.ts:
(pass) pi adapter tool allowlist > declares exactly the built-ins and bridge tools [0.03ms]
(pass) pi adapter tool allowlist > restricts interactive pi launches to the allowlist [0.12ms]
(pass) pi adapter tool allowlist > restricts headless pif launches and preserves the prompt [0.08ms]

test/commands-clean.test.ts:
(pass) commands/clean > reaps dead agent dirs but preserves live pids [2.89ms]

test/queue.test.ts:
(pass) queue > add then list shows a queued task [25.27ms]
(pass) queue > exactly one claimer wins, including parallel attempts [28.30ms]
(pass) queue > replays done, failed, and retry transitions [36.94ms]
(pass) queue > cancels queued tasks and returns an error result for claimed tasks [26.42ms]
(pass) queue > picks queued tasks FIFO, honoring the agent constraint [23.64ms]
(pass) queue > caps retries: requeue below the cap, terminal failed at it [28.39ms]
(pass) queue > settles a claimed task to done and blocks any later claim [21.49ms]
(pass) queue > exactly one of two racing claimers wins [23.05ms]

test/broker-routing.test.ts:
(pass) broker CLI routing > write refuses when the daemon socket is unavailable [5134.73ms]
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [102.37ms]
(pass) broker CLI routing > dispatch failure is daemon-absent, not herdr-not-found [5124.44ms]

test/commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [0.25ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [0.06ms]

test/worker-tools.test.ts:
(pass) worker tool policy > default spawn omits peer tools [0.10ms]
(pass) worker tool policy > explicitly disabled peer tools are omitted [0.02ms]
(pass) worker tool policy > config enables all peer tools [0.02ms]

test/claude-adapter.test.ts:
(pass) Claude adapter > declares its identity and capabilities [0.10ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.03ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.06ms]
(pass) Claude adapter > detects state from a live presence status [0.50ms]
(pass) Claude adapter > extracts result.json before transcript and native output [0.67ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [0.51ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [119.51ms]
(pass) Claude adapter > exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session) [30.68ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed ORCH_AGENT_KEY [31.15ms]

test/setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [90.24ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.23ms]
(pass) notifier setup logic > renders a command entry that loadConfig can parse [0.70ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.25ms]

test/cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.10ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.10ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.14ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.12ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.07ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.13ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [0.14ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [0.07ms]
(pass) headless common path: identity key -> presence > spawn mints a filesystem-safe headless identity and creates its presence dir [24.30ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [63.42ms]
(pass) headless common path: identity key -> presence > one adapter uses opaque keys across headless and tmux backend routes [0.17ms]
(pass) headless common path: identity key -> presence > workspaceOf reads the workspace from the structured key, not a regex [0.07ms]

test/notify.test.ts:
(pass) notify > parses valid sinks and warns about unknown types and missing fields [0.94ms]
(pass) notify > delivers only to sinks whose on filter matches the event [25.86ms]
(pass) notify > command sink writes the event payload as JSON on stdin [13.48ms]
(pass) notify > titles lead with exactly one terminal state and agent [0.24ms]
(pass) notify > webhook failure is non-fatal and reports a warning [27.91ms]

test/backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [0.12ms]
(pass) TmuxBackend > reports tmux availability [0.25ms]
(pass) TmuxBackend > reflects the TMUX environment [0.07ms]
(pass) TmuxBackend > mints identity from the owning session [0.14ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.08ms]
(pass) TmuxBackend > list() and inventory() surface only orch-spawned panes [0.62ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.08ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [0.47ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.09ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [50.25ms]
(pass) TmuxBackend > waitAgentStatus fails immediately when the pane has no presence key [0.15ms]
(pass) TmuxBackend > read returns captured text and throws when capture-pane fails [0.15ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [0.12ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.25ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.12ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [0.74ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.14ms]

test/identity.test.ts:
(pass) serializeIdentity / parseIdentity round-trip > round-trips herdr [0.05ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with % handle [0.03ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with : and % handle
(pass) serializeIdentity / parseIdentity round-trip > round-trips headless pid handle
(pass) serializeIdentity / parseIdentity round-trip > round-trips empty workspace
(pass) serializeIdentity / parseIdentity round-trip > round-trips separator inside parts
(pass) serializeIdentity / parseIdentity round-trip > round-trips slash inside parts [0.07ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips percent-code-lookalike [0.02ms]
(pass) serializeIdentity / parseIdentity round-trip > serialized key is a single flat segment (no nested path) [0.07ms]
(pass) serializeIdentity / parseIdentity round-trip > backend namespaces prevent collisions across equal workspace/handle [0.07ms]
(pass) malformed input > rejects wrong segment count [0.11ms]
(pass) malformed input > rejects empty key [0.04ms]
(pass) malformed input > rejects empty backend or handle on serialize [0.08ms]
(pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.05ms]
(pass) malformed input > tryParseIdentity parses a valid key [0.02ms]

test/adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.13ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.05ms]
(pass) PiAdapter > reads state from the presence status through store helpers [0.49ms]
(pass) PiAdapter > appends a steer message to the presence inbox [0.38ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [0.28ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [0.71ms]

test/daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [0.63ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [0.45ms]
(pass) daemon lifecycle > rejects malformed locks and a socket probe that fails [0.44ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [0.30ms]
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.3.13+bf2e2cecf)

Usage: bun <command> [...flags] [...args]

Commands:
  run       ./my-script.ts       Execute a file with Bun
            lint                 Run a package.json script
  test                           Run unit tests with Bun
  x         prettier             Execute a package binary (CLI), installing if needed (bunx)
  repl                           Start a REPL session with Bun
  exec                           Run a shell script directly with Bun

  install                        Install dependencies for a package.json (bun i)
  add       @remix-run/dev       Add a dependency to package.json (bun a)
  remove    left-pad             Remove a dependency from package.json (bun rm)
  update    @evan/duckdb         Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
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
  create    next-app             Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [53.90ms]
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [1.10ms]
(pass) daemon lifecycle > rejects a recycled pid identity [0.43ms]
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.3.13+bf2e2cecf)

Usage: bun <command> [...flags] [...args]

Commands:
  run       ./my-script.ts       Execute a file with Bun
            lint                 Run a package.json script
  test                           Run unit tests with Bun
  x         next                 Execute a package binary (CLI), installing if needed (bunx)
  repl                           Start a REPL session with Bun
  exec                           Run a shell script directly with Bun

  install                        Install dependencies for a package.json (bun i)
  add       @zarfjs/zarf         Add a dependency to package.json (bun a)
  remove    moment               Remove a dependency from package.json (bun rm)
  update    zod                  Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
  outdated                       Display latest versions of outdated dependencies
  link      [<package>]          Register or link a local npm package
  unlink                         Unregister a local npm package
  publish                        Publish a package to the npm registry
  patch <pkg>                    Prepare a package for patching
  pm <subcommand>                Additional package management utilities
  info      tailwindcss          Display package metadata from the registry
  why       elysia               Explain why a package is installed

  build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file

  init                           Start an empty Bun project from a built-in template
  create    elysia               Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [0.21ms]

test/queue-workspace-replay.test.ts:
(pass) queue workspace replay > persists workspace through append-only replay [22.49ms]
(pass) queue workspace replay > keeps legacy tasks without a workspace [19.22ms]
(pass) queue workspace replay > replays separate workspace values for multiple tasks [23.52ms]
(pass) queue workspace replay > selects only tasks eligible for the requested workspace [23.81ms]

test/outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [30.94ms]

test/work-notify.test.ts:
(pass) orch work notifications > delivers a presence transition through a configured command sink [66.13ms]

test/cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.15ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [0.42ms]
(pass) tmux backend registry and capabilities > exposes pane capabilities [0.06ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.04ms]
(pass) tmux backend registry and capabilities > mints identity from a protected session seam [0.14ms]
(pass) tmux backend registry and capabilities > serializes tmux identities as one flat key [0.09ms]
(pass) tmux backend registry and capabilities > rejects an empty handle without invoking tmux [0.02ms]
(pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [0.21ms]
(pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [0.12ms]
(pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [0.23ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-workspace [0.31ms]

test/notify-events-format.test.ts:
(pass) notification and presence event formatting > workspaceColor is stable and returns a palette hex [0.17ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.24ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.15ms]
(pass) notification and presence event formatting > webhook payload includes workspace and workspaceColor [0.55ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [0.36ms]
(pass) notification and presence event formatting > derivePresenceTransition derives workspace from identity keys [0.14ms]

test/config.test.ts:
(pass) loadConfig > refuses to invent a configuration when settings.json is missing [0.57ms]
(pass) loadConfig > requires a top-level runtime and never defaults it [1.62ms]
(pass) loadConfig > rejects an unrecognized runtime naming the accepted values [0.66ms]
(pass) loadConfig > rejects a runtime misplaced under defaults [1.41ms]
(pass) loadConfig > reads the declared runtime [0.30ms]
(pass) loadConfig > parses every supported settings section [1.69ms]
(pass) loadConfig > rejects a file without the current schemaVersion [0.51ms]
(pass) loadConfig > rejects invalid JSON loudly [0.23ms]
(pass) loadConfig > names the key path for invalid fields [0.46ms]
(pass) loadConfig > rejects unknown settings keys [0.38ms]
(pass) loadConfig > parses defaults.allowed_models as a string array [0.33ms]
(pass) loadConfig > rejects a non-string entry in defaults.allowed_models [0.37ms]
(pass) loadConfig > validates defaults.worker_peer_tools as a boolean [0.39ms]
(pass) loadConfig > accepts true and false for defaults.worker_peer_tools [0.39ms]
(pass) loadConfig > leaves defaults.worker_peer_tools absent when unset [0.20ms]
(pass) loadConfig > rejects a host without dest [0.51ms]
(pass) loadConfig > rejects an unknown id in installed.adapters [0.50ms]
(pass) loadConfig > rejects defaults.adapter not present in installed.adapters [0.34ms]
(pass) loadConfig > rejects when settings.json is absent but a legacy config.toml exists [0.30ms]
(pass) allowedModelPatterns > returns the built-in defaults when config is absent [0.25ms]
(pass) allowedModelPatterns > returns the configured patterns when set [0.35ms]
(pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or installed entry [0.56ms]
(pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [0.75ms]
(pass) writeSettingsRuntime > a different runtime replaces the single value in place [0.68ms]
(pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [0.60ms]
(pass) reapUnreadableSettings > leaves a readable file alone [0.19ms]
(pass) writeSettingsInstalled > round-trips both provider arrays [0.88ms]
(pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [1.05ms]
(pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [0.75ms]
(pass) writeSettingsDefault > is idempotent when rewriting the same value [1.16ms]
(pass) writeSettingsDefault > refuses to write through an out-of-version settings file [0.38ms]
(pass) writeSettingsDefault > switches defaults.adapter between two installed ids and loads clean [0.58ms]
(pass) config precedence > uses the fallback when env and settings.json omit a setting [0.34ms]
(pass) config precedence > uses the settings.json value over the fallback [0.29ms]
(pass) config precedence > uses the ORCH_* environment value over settings.json [0.31ms]
(pass) config precedence > uses an explicit flag override over the environment [0.03ms]
(pass) resolveSetting > uses flag, environment coercion, config, then fallback in precedence order [0.05ms]
(pass) resolveWithSource > reports the winning source at each precedence level [0.05ms]

test/doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [2.07ms]
(pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [1.60ms]
(pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [282.70ms]
(pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [0.69ms]
(pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [134.50ms]
(pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [0.83ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [0.69ms]
(pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [2.33ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [1.38ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [0.42ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [0.28ms]

test/worker-prompt.test.ts:
(pass) worker prompt capability composition > work loop gives codex the base header without orch_ask [40.81ms]
(pass) worker prompt capability composition > work loop gives pi the orch_ask header clause [32.41ms]
(pass) worker prompt capability composition > orch run composition selects the same header per adapter [0.15ms]
(pass) worker prompt capability composition > locked-commands clause names the commands when the list is non-empty [0.04ms]
(pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.03ms]
(pass) worker prompt capability composition > events strip both worker header variants [0.15ms]

test/adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [0.36ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [0.54ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [1.37ms]
(pass) adapter and runtime hardening > headless generates one safe presence key when no key is supplied [1.03ms]

test/commands-target.test.ts:
(pass) commands/target > splits known flags and preserves positional args [1.44ms]
(pass) commands/target > extracts target and joined prompt [0.10ms]
(pass) commands/target > reads only structured result text [0.04ms]
(pass) commands/target > quotes remote args and ORCH_DIR safely [0.07ms]
(pass) commands/target > lists only live serialized identity presence entries [0.87ms]

test/outbox.test.ts:
(pass) outbox delivery > selects pending messages and delivers each message once [27.78ms]
(pass) outbox delivery > keeps failed messages pending until their backoff expires [24.39ms]

test/commands-queue.test.ts:
(pass) commands/queue > round-trips add/list/cancel on an isolated store [27.42ms]
No queue tasks.
(pass) commands/queue > renders empty queues without throwing [0.18ms]

test/command-workspace-fields.test.ts:
(pass) command workspace fields > status and wall entities use persisted workspace instead of serialized-key text [26.42ms]
(pass) command workspace fields > status reports a mixed pi and Claude fleet with the same identity fields [19.01ms]

test/worktree.test.ts:
(pass) worktree primitives > creates and lists an agent worktree on an orch branch [20.49ms]
(pass) worktree primitives > detects commits ahead of a base branch [27.19ms]
(pass) worktree primitives > removes an agent worktree [23.55ms]
fatal: not a git repository (or any of the parent directories): .git
(pass) worktree primitives > rejects a non-repository path with a clear error [1.35ms]

test/presence-schema.test.ts:
(pass) presence status schema > reads a spawned namespaced identity with backend, workspace, handle, and adapter [24.09ms]
(pass) presence status schema > orch status JSON exposes the complete spawned identity fields [21.16ms]
(pass) presence status schema > status and list report the same agent identity [42.72ms]
(pass) presence status schema > mixed pi and Claude status rows carry the same identity field set [22.10ms]
(pass) presence status schema > rejects a status record that carries no schema stamp [23.65ms]
(pass) presence status schema > rejects a status record stamped with a non-current schema [20.16ms]
(pass) presence status schema > a malformed record is skipped without hiding the valid records beside it [20.97ms]
(pass) presence status schema > persists the complete spawned identity record [12.04ms]

test/notify-sinks.test.ts:
(pass) notify sinks > delivers command sink payload as JSON [16.55ms]
(pass) notify sinks > loadSinks parses command and webhook declarations [0.56ms]

test/cmd-lock.test.ts:
(pass) command lock > acquire and release round-trip [0.95ms]
(pass) command lock > second acquire blocks until first releases [37.68ms]
(pass) command lock > dead-pid lock is reaped [0.52ms]
(pass) command lock > release with wrong pid refuses [0.29ms]
bun test held by agent-a (pid 15629)
(pass) command lock > matches locked command prefixes and probes settings [1.18ms]
(pass) command lock > run propagates the child exit code [9.42ms]

test/remote.test.ts:
(pass) remote SSH executor > runs BatchMode SSH and parses JSON [23.06ms]
(pass) remote SSH executor > returns a typed timeout failure [3006.12ms]
(pass) remote SSH executor > returns a dead-host failure [20.82ms]
(pass) remote SSH executor > returns a non-JSON failure [18.67ms]
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.13ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.06ms]

test/broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [26.17ms]
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [0.17ms]
(pass) broker ownership and workspace governance > work-loop selection stays within the origin workspace [26.11ms]

test/cmd-lock-bridge.test.ts:
(pass) pi-bridge command-lock interception > wraps a matching locked command in acquire→release around the tool call [2.39ms]
(pass) pi-bridge command-lock interception > leaves a non-matching command untouched — no acquire, no release [0.40ms]
(pass) pi-bridge command-lock interception > only bash tool calls are intercepted — a non-bash tool never acquires [0.49ms]

test/doctor-checks.test.ts:
(pass) doctor notification-sink checks > reports no sinks as healthy [3.17ms]
(pass) doctor notification-sink checks > warns for a webhook with a malformed URL [1.34ms]
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [1.00ms]
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [0.74ms]

test/ownership.test.ts:
(pass) agent ownership > round-trips an owner [25.84ms]
(pass) agent ownership > allows unowned and same-owner writes [23.22ms]
(pass) agent ownership > denies foreign writes and supports stealing [20.75ms]

test/doctor-hosts.test.ts:
(pass) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [1.67ms]
(pass) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [0.93ms]
(pass) doctor remote host checks > flags a remote orch version/schema mismatch in detail [1.02ms]
(pass) doctor remote host checks > reports no remote hosts configured as healthy [0.51ms]

test/remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [20.94ms]
(pass) async remote fan-out > returns a typed dead-host failure [22.87ms]
(pass) async remote fan-out > returns a typed timeout failure [503.61ms]
(pass) async remote fan-out > returns a typed non-JSON failure [21.60ms]
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [504.66ms]

test/backend-headless.test.ts:
(pass) HeadlessBackend > spawns a detached process and records its handle [24.34ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [45.14ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [21.45ms]
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [44.64ms]
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [0.54ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [0.51ms]
(pass) HeadlessBackend > never signals an unrecorded pid [0.45ms]

test/commands-spawn.test.ts:
(pass) commands/spawn > parses spawn flags and rejects no implicit adapter assumptions [0.19ms]
(pass) commands/spawn > identifies pi launchers and preserves raw prompt [0.08ms]

test/broker-governance.test.ts:
(pass) daemon governWrite enforcement > unscoped actor bypasses ownership and the wall [25.51ms]
(pass) daemon governWrite enforcement > owner may write to its own agent [18.57ms]
(pass) daemon governWrite enforcement > a foreign owner in the same workspace is refused [20.40ms]
(pass) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [22.86ms]
(pass) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [23.14ms]
(pass) daemon governWrite enforcement > --steal transfers ownership to the actor [19.79ms]
(pass) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [17.15ms]

test/spawn-limits.test.ts:
(pass) spawn limits > schema loads global and workspace caps [0.95ms]
(pass) spawn limits > rejects invalid cap %s with file and key [0.66ms]
(pass) spawn limits > rejects invalid cap %s with file and key [0.26ms]
(pass) spawn limits > rejects invalid cap %s with file and key [0.31ms]
(pass) spawn limits > omitted limits normalize to no caps [0.21ms]
(pass) spawn limits > global boundary refusal data counts the whole request [1.04ms]
(pass) spawn limits > one workspace may use the full global allotment [0.37ms]
(pass) spawn limits > workspace cap is independent of global headroom [0.21ms]
(pass) spawn limits > uncapped workspace is bounded only by global count [0.27ms]
(pass) spawn limits > dead pid records free capacity [0.23ms]
(pass) spawn limits > foreign panes never count [0.24ms]
(pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [1.20ms]
(pass) spawn limits > doctor accepts satisfiable limits [0.85ms]

test/config-watch.test.ts:
(pass) watchConfig > loads initially and applies a valid edit after the debounce [23.82ms]
(pass) watchConfig > keeps the last-good config, warns once, and recovers [405.10ms]
(pass) watchConfig > reloads on a touched reload.signal without a settings edit [37.12ms]
(pass) watchConfig > stop prevents further callbacks [406.98ms]

test/orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [24.72ms]

test/orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [3.15ms]
(pass) orchd RPC transports > round-trips over the TCP fallback transport [6.00ms]

test/doctor-backends.test.ts:
(pass) doctor backend and presence checks > reports every registered backend and boolean capability fields [0.37ms]
(pass) doctor backend and presence checks > passes with herdr active while an installed tmux sits outside a session [0.05ms]
(pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.07ms]
(pass) doctor backend and presence checks > fails when the active backend is outside a live session [0.05ms]
(pass) doctor backend and presence checks > fails when any installed backend is unavailable, active or not [0.05ms]
(pass) doctor backend and presence checks > honours the configured default over the probe order [0.03ms]
(pass) doctor backend and presence checks > reports only records missing the current schema stamp [0.67ms]

test/commands-events.test.ts:
(pass) commands/events > parses filters and scope flags [2.80ms]
(pass) commands/events > a dropped subscription names the command that recovers it [0.04ms]
(pass) commands/events > rejects malformed event and labels sinks [0.14ms]

test/commands-control.test.ts:
(pass) commands/control > parses dispatch flags without losing prompt words [2.10ms]
(pass) commands/control > parses --then destination and note [0.06ms]
(pass) commands/control > adds worker header unless raw [0.04ms]

test/commands-daemon.test.ts:
(pass) commands/daemon > parses governance and validates daemon status [0.11ms]
(pass) commands/daemon > reads only a positive integer lock pid [0.32ms]

test/commands-review.test.ts:
(pass) commands/review > uses the short orch branch as review target [1.87ms]
(pass) commands/review > falls back to branch then pane [0.05ms]

test/commands-status.test.ts:
(pass) commands/status > derives view fields from seeded presence [0.40ms]
(pass) commands/status > marks dead presence as exited [0.07ms]
(pass) commands/status > formats workspace labels and warnings [0.08ms]

test/workspace-policy.test.ts:
(pass) workspace policy > reads workspaces from serialized identity keys [0.12ms]
(pass) workspace policy > resolves workspace names through records and functions [0.11ms]
(pass) workspace policy > compares serialized keys by their workspace [0.05ms]
(pass) workspace policy > enforces the workspace wall [0.07ms]
(pass) workspace policy > scopes serialized identity keys to the current workspace [0.12ms]
(pass) workspace policy > null current workspace leaves items unscoped [0.03ms]
(pass) workspace policy > 2.7 status displays the reported workspace identity field [26.05ms]
(pass) workspace policy > 6.6 structured identity drives status and policy, not serialized key text [19.59ms]

test/doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [2.37ms]
(pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [1.60ms]
(pass) doctor stale presence safety > no dead agents leaves nothing to remove [1.44ms]

test/config-precedence.test.ts:
(pass) config precedence > returns a defaults value when no override is set [0.38ms]
(pass) config precedence > applies defaults when config, env, and flag are absent [0.24ms]
(pass) config precedence > uses env over config and flag over env [0.25ms]
(pass) config precedence > parses notify entries and hosts into expected shapes [0.44ms]
(pass) config precedence > reports a helpful validation error for invalid config [0.51ms]

test/doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [0.11ms]
(pass) runDoctor > runs on an unconfigured install without failing for want of settings.json [0.82ms]
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [0.39ms]
(pass) runDoctor > reports an absent daemon as optional [0.44ms]
(pass) runDoctor > reports and fixes a stale daemon lock [0.99ms]
(pass) runDoctor > accepts a live daemon and an answerable socket [6.59ms]
(pass) runDoctor > warns when the live daemon code hash is stale [1.49ms]
(pass) runDoctor > fails on an invalid lock and an unanswerable live socket [1.75ms]
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [0.49ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [0.38ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [0.48ms]
(pass) runDoctor > reports a dead presence pid and corrupt spawn registry lines [1.65ms]
(pass) runDoctor > bins check is driven by the installed set and offers no fix [0.50ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [0.25ms]
(pass) runDoctor > validates configured notifier adapters [93.46ms]
notify: could not load settings.json: /tmp/orch-doctor-cKwXa1/settings.json: this settings file has invalid values: ✖ Invalid input: expected number, received string → at queue.max_retries Fix those keys by hand, or re-record the file with: orch setup
(pass) runDoctor > reports invalid config and accepts missing config [3.17ms]
(pass) runDoctor > never throws when individual checks encounter broken inputs [2.19ms]

test/commands-results.test.ts:
(pass) commands/results > validates and extracts question payloads [1.37ms]
(pass) commands/results > formats invalid and recent timestamps [0.10ms]
/tmp/orch-command-result-VI5Ay1/settings.json does not exist — orch has no built-in configuration and does nothing by default.
Run: orch setup
