bun test v1.3.14 (0d9b296a)

test/adapter-allowlist.test.ts:
(pass) pi adapter tool allowlist > declares exactly the built-ins and bridge tools [7.20ms]
(pass) pi adapter tool allowlist > restricts interactive pi launches to the allowlist [3.25ms]
(pass) pi adapter tool allowlist > restricts headless pif launches and preserves the prompt [0.35ms]

test/adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [353.07ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [57.73ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [87.80ms]
(pass) adapter and runtime hardening > headless generates one safe presence key when no key is supplied [158.45ms]

test/adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [2.39ms]
(pass) PiAdapter > reads state from the presence status through store helpers [24.90ms]
(pass) PiAdapter > appends a steer message to the presence inbox [5.83ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [11.61ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [14.37ms]

test/backend-headless.test.ts:
(pass) HeadlessBackend > spawns a detached process and records its handle [131.59ms]
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [241.87ms]
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [1.54ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [2.87ms]
(pass) HeadlessBackend > never signals an unrecorded pid [0.99ms]

test/backend-herdr.test.ts:
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [0.73ms]
(pass) HerdrBackend > maps close and list to herdr helpers [0.37ms]

test/backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [1.28ms]
(pass) TmuxBackend > reports tmux availability [3.39ms]
(pass) TmuxBackend > reflects the TMUX environment [0.63ms]
(pass) TmuxBackend > mints identity from the owning session [6.19ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.38ms]

test/broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.56ms]
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [146.17ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [147.25ms]
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [409.49ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [18.44ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [553.05ms]

test/broker-governance.test.ts:
(pass) daemon governWrite enforcement > unscoped actor bypasses ownership and the wall [546.28ms]
(pass) daemon governWrite enforcement > owner may write to its own agent [291.50ms]
(pass) daemon governWrite enforcement > a foreign owner in the same workspace is refused [184.89ms]
(pass) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [141.54ms]
(pass) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [139.13ms]
(pass) daemon governWrite enforcement > --steal transfers ownership to the actor [131.19ms]
(pass) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [90.36ms]

test/broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [150.98ms]
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [0.28ms]
(pass) broker ownership and workspace governance > work-loop selection stays within the origin workspace [270.55ms]

test/broker-routing.test.ts:
(pass) broker CLI routing > write refuses when the daemon socket is unavailable [7706.04ms]
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [956.18ms]
(pass) broker CLI routing > dispatch failure is daemon-absent, not herdr-not-found [7753.53ms]

test/claude-adapter.test.ts:
(pass) Claude adapter > declares its identity and capabilities [7.49ms]
(pass) Claude adapter > builds the interactive Claude launch command [32.31ms]
(pass) Claude adapter > detects state from a live presence status [55.77ms]
(pass) Claude adapter > extracts result.json before transcript and native output [59.29ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [971.68ms]

test/clean-worktrees.test.ts:
hint: Using 'master' as the name for the initial branch. This default branch name
hint: is subject to change. To configure the initial branch name to use in all
hint: of your new repositories, which will suppress this warning, call:
hint: 
hint: 	git config --global init.defaultBranch <name>
hint: 
hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
hint: 'development'. The just-created branch can be renamed via this command:
hint: 
hint: 	git branch -m <name>
Preparing worktree (new branch 'orch/empty')
Preparing worktree (new branch 'orch/merged')
Preparing worktree (new branch 'orch/unmerged')
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [5511.57ms]
hint: Using 'master' as the name for the initial branch. This default branch name
hint: is subject to change. To configure the initial branch name to use in all
hint: of your new repositories, which will suppress this warning, call:
hint: 
hint: 	git config --global init.defaultBranch <name>
hint: 
hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
hint: 'development'. The just-created branch can be renamed via this command:
hint: 
hint: 	git branch -m <name>
Preparing worktree (new branch 'orch/discard')
fatal: 'refs/heads/orch/discard' - not a valid ref
(pass) clean worktrees > --force discards an unmerged orphan and its branch [2930.10ms]

test/cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [3.61ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [1.16ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.37ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [0.61ms]
(pass) headless common path: identity key -> presence > spawn mints a filesystem-safe headless identity and creates its presence dir [83.88ms]
(pass) headless common path: identity key -> presence > workspaceOf reads the workspace from the structured key, not a regex [0.25ms]

test/cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.13ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [0.95ms]
(pass) tmux backend registry and capabilities > exposes pane capabilities [0.62ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.17ms]
(pass) tmux backend registry and capabilities > mints identity from a protected session seam [0.24ms]
(pass) tmux backend registry and capabilities > serializes tmux identities as one flat key [0.42ms]
(pass) tmux backend registry and capabilities > rejects an empty handle without invoking tmux [0.12ms]

test/codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [4.54ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [3.17ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [1.36ms]

test/config-precedence.test.ts:
(pass) config precedence > returns a [defaults] value when no override is set [1.45ms]
(pass) config precedence > applies defaults when config, env, and flag are absent [1.48ms]
(pass) config precedence > uses env over config and flag over env [11.98ms]
(pass) config precedence > parses notify entries and hosts into expected shapes [1.76ms]
(pass) config precedence > reports a helpful validation error for invalid config [2.38ms]

test/config-watch.test.ts:
(pass) watchConfig > applies a valid edit after the debounced change [266.83ms]
(pass) watchConfig > keeps the last-good config and warns once for an invalid edit [688.49ms]
(pass) watchConfig > stop prevents further callbacks [477.81ms]

test/config.test.ts:
(pass) loadConfig > uses defaults when config.toml is missing [2.77ms]
(pass) loadConfig > parses every supported config section [7.07ms]
(pass) loadConfig > names the file, key, expected, and found type for invalid fields [8.59ms]
(pass) loadConfig > parses defaults.allowed_models as a string array [2.20ms]
(pass) loadConfig > rejects a non-string entry in defaults.allowed_models [17.73ms]
(pass) loadConfig > validates defaults.worker_peer_tools as a boolean [15.86ms]
(pass) loadConfig > accepts true and false for defaults.worker_peer_tools [29.68ms]
(pass) loadConfig > leaves defaults.worker_peer_tools absent when unset [2.95ms]
(pass) allowedModelPatterns > returns the built-in defaults when config is absent [10.31ms]
(pass) allowedModelPatterns > returns the configured patterns when set [2.82ms]
(pass) writeDefaultEntry > creates a [defaults] table and records the entry [31.55ms]
(pass) writeDefaultEntry > replaces an existing entry without disturbing other sections [48.00ms]
(pass) writeDefaultEntry > is idempotent when rewriting the same value [7.67ms]
(pass) config precedence > uses the fallback when env and config.toml omit a setting [7.83ms]
(pass) config precedence > uses the config.toml value over the fallback [4.37ms]
(pass) config precedence > uses the ORCH_* environment value over config.toml [27.56ms]
(pass) config precedence > uses an explicit flag override over the environment [30.57ms]
(pass) resolveSetting > uses flag, environment coercion, config, then fallback in precedence order [20.37ms]

test/daemon-configwatch.test.ts:
(pass) config watch > loads initially and applies edits [30.23ms]
(pass) config watch > keeps the last good config on invalid TOML and recovers [88.11ms]
(pass) config watch > stops all callbacks [262.35ms]

test/daemon-events.test.ts:
(pass) daemon presence events > an RPC subscriber receives a presence transition [54.75ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [0.73ms]
(pass) daemon presence events > a blocked transition drives command sink delivery [201.82ms]
(pass) daemon presence events > a dead daemon falls back once and diffs the switch snapshot [113.16ms]

test/daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [166.56ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [363.51ms]
(pass) daemon lifecycle > rejects malformed locks and a socket probe that fails [465.78ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [223.73ms]
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
  add       hono                 Add a dependency to package.json (bun a)
  remove    backbone             Remove a dependency from package.json (bun rm)
  update    react                Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
  outdated                       Display latest versions of outdated dependencies
  link      [<package>]          Register or link a local npm package
  unlink                         Unregister a local npm package
  publish                        Publish a package to the npm registry
  patch <pkg>                    Prepare a package for patching
  pm <subcommand>                Additional package management utilities
  info      lyra                 Display package metadata from the registry
  why       @remix-run/dev       Explain why a package is installed

  build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file

  init                           Start an empty Bun project from a built-in template
  create    vite                 Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [275.57ms]
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [160.77ms]
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
  add       tailwindcss          Add a dependency to package.json (bun a)
  remove    underscore           Remove a dependency from package.json (bun rm)
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
  create    vite                 Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > rejects a recycled pid identity [272.40ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [2.08ms]

test/daemon-rpc.test.ts:
(pass) daemon RPC > round-trips a call over the real unix socket [21.16ms]
(pass) daemon RPC > returns an error for an unknown method [16.64ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [20.90ms]
(pass) daemon RPC > delivers pushed subscription events [26.04ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [65.79ms]
(pass) daemon RPC > has a catchable absent-daemon error [4.41ms]

test/doctor-backends.test.ts:
(pass) doctor backend and presence checks > reports every registered backend and boolean capability fields [3.12ms]
(pass) doctor backend and presence checks > reports only malformed or legacy presence records [8.53ms]

test/doctor-checks.test.ts:
(pass) doctor notification-sink checks > reports no sinks as healthy [26.41ms]
(pass) doctor notification-sink checks > warns for a webhook with a malformed URL [38.97ms]
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [40.48ms]
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [15.84ms]

test/doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [11.19ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [7.61ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [1.90ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [1.55ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [1.32ms]

test/doctor-hosts.test.ts:
(pass) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [2887.91ms]
(pass) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [2843.48ms]
(pass) doctor remote host checks > flags a remote orch version/schema mismatch in detail [1247.67ms]
(pass) doctor remote host checks > reports no remote hosts configured as healthy [2424.99ms]

test/doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [4120.01ms]
(pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [1919.03ms]
(pass) doctor stale presence safety > no dead agents leaves nothing to remove [4954.88ms]

test/doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [0.33ms]
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [1941.44ms]
(pass) runDoctor > reports an absent daemon as optional [1624.18ms]
(pass) runDoctor > reports and fixes a stale daemon lock [1068.12ms]
68 |       codeHash: computeCodeHash(entrypoint),
69 |       startedAt: new Date().toISOString(),
70 |     }));
71 | 
72 |     expect(check(await runDoctor(directory), "orchd")).toMatchObject({ status: "ok" });
73 |     expect(check(await runDoctor(directory), "orchd-socket")).toMatchObject({ status: "ok" });
                                                                   ^
error: expect(received).toMatchObject(expected)

  {
-   "status": "ok",
+   "detail": "orchd pid 1676109 is not answerable: orchd daemon is absent (/tmp/orch-doctor-jnrn2r); try orch daemon start",
+   "id": "orchd-socket",
+   "label": "orchd socket",
+   "status": "fail",
  }

- Expected  - 1
+ Received  + 4

      at <anonymous> (/mnt/c/Users/Bryan/Documents/orch/test/doctor.test.ts:73:63)
(fail) runDoctor > accepts a live daemon and an answerable socket [4831.02ms]
(pass) runDoctor > warns when the live daemon code hash is stale [406.08ms]
killed 1 dangling process
(fail) runDoctor > fails on an invalid lock and an unanswerable live socket [5195.90ms]
  ^ this test timed out after 5000ms.
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [18.30ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [3.67ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [5.78ms]
(pass) runDoctor > reports a dead presence pid and corrupt spawn registry lines [661.80ms]
(pass) runDoctor > does not offer a fix for missing binaries [11.31ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [1.49ms]
killed 1 dangling process
(fail) runDoctor > validates configured notifier adapters [8130.34ms]
  ^ this test timed out after 5000ms.
killed 2 dangling processes
(fail) runDoctor > reports invalid config and accepts missing config [9711.96ms]
  ^ this test timed out after 5000ms.
(pass) runDoctor > never throws when individual checks encounter broken inputs [2848.83ms]

test/herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [0.65ms]
(pass) herdr and notification hardening > falls back to a real name when an adapter id is blank [0.20ms]
(pass) herdr and notification hardening > nameless notifications use a workspace label, never a bare pane key [0.54ms]

test/identity.test.ts:
(pass) serializeIdentity / parseIdentity round-trip > round-trips herdr [0.35ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with % handle [0.10ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with : and % handle [0.33ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips headless pid handle [0.41ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips empty workspace [0.09ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips separator inside parts [0.55ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips slash inside parts [0.13ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips percent-code-lookalike [0.07ms]
(pass) serializeIdentity / parseIdentity round-trip > serialized key is a single flat segment (no nested path) [0.96ms]
(pass) serializeIdentity / parseIdentity round-trip > backend namespaces prevent collisions across equal workspace/handle [0.24ms]
(pass) malformed input > rejects wrong segment count [0.39ms]
(pass) malformed input > rejects empty key [0.24ms]
(pass) malformed input > rejects empty backend or handle on serialize [0.90ms]
(pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.22ms]
(pass) malformed input > tryParseIdentity parses a valid key [0.78ms]

test/notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > skips an unavailable adapter without affecting available adapters [1.45ms]
notify: webhook notifier has invalid configuration
(pass) notifier registry and built-in adapters > reports malformed required configuration instead of throwing [1.15ms]
(pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [1.13ms]
(pass) notifier registry and built-in adapters > command adapter passes canonical JSON on stdin [153.10ms]
(pass) notifier registry and built-in adapters > desktop fallback selects notify-send, then WSL notify when it fails [3.47ms]
notify: bad sink failed
(pass) notifier registry and built-in adapters > isolates delivery failures and still delivers to other adapters [6.06ms]

test/notify-events-format.test.ts:
(pass) notification and presence event formatting > workspaceColor is stable and returns a palette hex [0.14ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.37ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [1.44ms]
(pass) notification and presence event formatting > webhook payload includes workspace and workspaceColor [0.89ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [1.46ms]
(pass) notification and presence event formatting > derivePresenceTransition derives workspace from identity keys [1.57ms]

test/notify-sinks.test.ts:
(pass) notify sinks > delivers command sink payload as JSON [1142.65ms]
(pass) notify sinks > loadSinks parses command and webhook declarations [77.34ms]

test/notify.test.ts:
(pass) notify > parses valid sinks and warns about unknown types and missing fields [84.16ms]
(pass) notify > delivers only to sinks whose on filter matches the event [458.10ms]
(pass) notify > command sink writes the event payload as JSON on stdin [157.49ms]
(pass) notify > titles lead with exactly one terminal state and agent [2.29ms]
(pass) notify > webhook failure is non-fatal and reports a warning [26.86ms]

test/orchd-rpc-replay.test.ts:
(pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [2.00ms]
(pass) orchd RPC replay buffer > drops the oldest events and reports a replay gap [4.14ms]

test/orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [32.66ms]

test/orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [7.77ms]
(pass) orchd RPC transports > round-trips over the TCP fallback transport [16.76ms]

test/outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [147.33ms]

test/outbox.test.ts:
(pass) outbox delivery > selects pending messages and delivers each message once [111.58ms]
(pass) outbox delivery > keeps failed messages pending until their backoff expires [118.54ms]

test/ownership.test.ts:
(pass) agent ownership > round-trips an owner [78.50ms]
(pass) agent ownership > allows unowned and same-owner writes [359.50ms]
(pass) agent ownership > denies foreign writes and supports stealing [363.37ms]

test/parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [53.04ms]
(pass) <host>/<target> grammar > parses configured host prefixes [1.89ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [1.04ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [1.95ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.55ms]

test/presence-schema.test.ts:
(pass) presence status schema > reads a schema-2 status with its adapter id [1221.70ms]
(pass) presence status schema > keeps schema-1 status records valid without adding fields [478.98ms]
(pass) presence status schema > loads a mixed directory of schema-1 and schema-2 records [265.54ms]

test/queue-workspace-replay.test.ts:
(pass) queue workspace replay > persists workspace through append-only replay [491.73ms]
(pass) queue workspace replay > keeps legacy tasks without a workspace [571.06ms]
(pass) queue workspace replay > replays separate workspace values for multiple tasks [762.27ms]
(pass) queue workspace replay > selects only tasks eligible for the requested workspace [291.59ms]

test/queue.test.ts:
(pass) queue > add then list shows a queued task [249.95ms]
(pass) queue > exactly one claimer wins, including parallel attempts [160.02ms]
(pass) queue > replays done, failed, and retry transitions [270.24ms]
(pass) queue > cancels queued tasks and returns an error result for claimed tasks [295.50ms]
(pass) queue > picks queued tasks FIFO, honoring the agent constraint [770.30ms]
(pass) queue > caps retries: requeue below the cap, terminal failed at it [1043.76ms]
(pass) queue > settles a claimed task to done and blocks any later claim [286.97ms]
(pass) queue > exactly one of two racing claimers wins [115.58ms]

test/remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [247.66ms]
(pass) async remote fan-out > returns a typed dead-host failure [219.65ms]
(pass) async remote fan-out > returns a typed timeout failure [675.95ms]
(pass) async remote fan-out > returns a typed non-JSON failure [1435.03ms]
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [525.86ms]

test/remote.test.ts:
(pass) remote SSH executor > runs BatchMode SSH and parses JSON [214.58ms]
(pass) remote SSH executor > returns a typed timeout failure [718.97ms]
(pass) remote SSH executor > returns a dead-host failure [1493.13ms]
(pass) remote SSH executor > returns a non-JSON failure [301.25ms]
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.33ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.36ms]

test/review.test.ts:
hint: Using 'master' as the name for the initial branch. This default branch name
hint: is subject to change. To configure the initial branch name to use in all
hint: of your new repositories, which will suppress this warning, call:
hint: 
hint: 	git config --global init.defaultBranch <name>
hint: 
hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
hint: 'development'. The just-created branch can be renamed via this command:
hint: 
hint: 	git branch -m <name>
Preparing worktree (new branch 'orch/feature-1')
(pass) review plumbing > lists only done worktree agents with commits ahead [4312.50ms]
hint: Using 'master' as the name for the initial branch. This default branch name
hint: is subject to change. To configure the initial branch name to use in all
hint: of your new repositories, which will suppress this warning, call:
hint: 
hint: 	git config --global init.defaultBranch <name>
hint: 
hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
hint: 'development'. The just-created branch can be renamed via this command:
hint: 
hint: 	git branch -m <name>
Preparing worktree (new branch 'orch/iterate-1')
(fail) review plumbing > reject re-dispatches feedback through the adapter inbox [8666.33ms]
  ^ this test timed out after 5000ms.
hint: Using 'master' as the name for the initial branch. This default branch name
hint: is subject to change. To configure the initial branch name to use in all
hint: of your new repositories, which will suppress this warning, call:
hint: 
hint: 	git config --global init.defaultBranch <name>
hint: 
hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
hint: 'development'. The just-created branch can be renamed via this command:
hint: 
hint: 	git branch -m <name>
Preparing worktree (new branch 'orch/approve-1')
fatal: 'refs/heads/orch/approve-1' - not a valid ref
(fail) review plumbing > approve merges and removes the worktree and branch [5113.69ms]
  ^ this test timed out after 5000ms.
hint: Using 'master' as the name for the initial branch. This default branch name
hint: is subject to change. To configure the initial branch name to use in all
hint: of your new repositories, which will suppress this warning, call:
hint: 
hint: 	git config --global init.defaultBranch <name>
hint: 
hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
hint: 'development'. The just-created branch can be renamed via this command:
hint: 
hint: 	git branch -m <name>
Preparing worktree (new branch 'orch/conflict-1')
hint: Diverging branches can't be fast-forwarded, you need to either:
hint: 
hint: 	git merge --no-ff
hint: 
hint: or:
hint: 
hint: 	git rebase
hint: 
hint: Disable this message with "git config advice.diverging false"
fatal: Not possible to fast-forward, aborting.
(pass) review plumbing > conflicting approval aborts without changing either branch [1164.46ms]
hint: Using 'master' as the name for the initial branch. This default branch name
hint: is subject to change. To configure the initial branch name to use in all
hint: of your new repositories, which will suppress this warning, call:
hint: 
hint: 	git config --global init.defaultBranch <name>
hint: 
hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
hint: 'development'. The just-created branch can be renamed via this command:
hint: 
hint: 	git branch -m <name>
Preparing worktree (new branch 'orch/merge-1')
hint: Diverging branches can't be fast-forwarded, you need to either:
hint: 
hint: 	git merge --no-ff
hint: 
hint: or:
hint: 
hint: 	git rebase
hint: 
hint: Disable this message with "git config advice.diverging false"
fatal: Not possible to fast-forward, aborting.
(pass) review plumbing > non-fast-forward approval creates a merge commit [1642.72ms]

test/routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves origin workspace selection [146.01ms]
(pass) store hardening > reopening an old outbox schema applies the migration idempotently and enables WAL [142.68ms]
(pass) store hardening > a steal updates ownership only when the observed owner still matches [149.61ms]
(pass) store hardening > the conditional claim is exactly once [121.52ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [2953.10ms]

test/setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [2489.41ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [1.22ms]
(pass) notifier setup logic > renders a command entry that loadConfig can parse [4.84ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.72ms]

test/wall-single-owner.test.ts:
(pass) workspace wall ownership > keeps the wall decision primitive in one source module [183.82ms]

test/work-notify.test.ts:
(pass) orch work notifications > delivers a presence transition through a configured command sink [268.38ms]

test/work-race.test.ts:
(pass) orch work claim race > two concurrent workers produce one claim and the loser exits cleanly [4315.32ms]

test/worker-tools.test.ts:
(pass) worker tool policy > default spawn omits peer tools [0.24ms]
(pass) worker tool policy > explicitly disabled peer tools are omitted [0.12ms]
(pass) worker tool policy > config enables all peer tools [0.83ms]

test/workspace-policy.test.ts:
(pass) workspace policy > reads workspaces from serialized identity keys [0.26ms]
(pass) workspace policy > resolves workspace names through records and functions [0.45ms]
(pass) workspace policy > compares serialized keys by their workspace [0.27ms]
(pass) workspace policy > enforces the workspace wall [0.37ms]
(pass) workspace policy > scopes serialized identity keys to the current workspace [0.35ms]
(pass) workspace policy > null current workspace leaves items unscoped [0.15ms]

test/workspace-walls.test.ts:
(pass) workspace helpers > extracts workspace ids only from identity keys [0.22ms]
(pass) workspace helpers > derives an entity workspace from the identity key [0.42ms]
(pass) workspace helpers > returns the same entities when all workspaces are requested [0.71ms]
(pass) workspace wall writes > allows a write within the same workspace [0.17ms]
(pass) workspace wall writes > denies a cross-workspace write with both workspaces in the reason [2.06ms]
(pass) workspace wall writes > allows a cross-workspace write with an explicit override [0.16ms]
(pass) workspace wall writes > allows legacy unscoped targets [0.13ms]
(pass) workspace-aware queued task selection > excludes tasks pinned to another workspace [0.23ms]
(pass) workspace-aware queued task selection > keeps legacy tasks eligible in any workspace [0.13ms]
(pass) workspace-aware queued task selection > selects the earliest eligible task and respects agent constraints [0.17ms]

test/worktree.test.ts:
hint: Using 'master' as the name for the initial branch. This default branch name
hint: is subject to change. To configure the initial branch name to use in all
hint: of your new repositories, which will suppress this warning, call:
hint: 
hint: 	git config --global init.defaultBranch <name>
hint: 
hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
hint: 'development'. The just-created branch can be renamed via this command:
hint: 
hint: 	git branch -m <name>
Preparing worktree (new branch 'orch/fixes-1')
(pass) worktree primitives > creates and lists an agent worktree on an orch branch [238.98ms]
hint: Using 'master' as the name for the initial branch. This default branch name
hint: is subject to change. To configure the initial branch name to use in all
hint: of your new repositories, which will suppress this warning, call:
hint: 
hint: 	git config --global init.defaultBranch <name>
hint: 
hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
hint: 'development'. The just-created branch can be renamed via this command:
hint: 
hint: 	git branch -m <name>
Preparing worktree (new branch 'orch/feature')
(pass) worktree primitives > detects commits ahead of a base branch [1130.81ms]
hint: Using 'master' as the name for the initial branch. This default branch name
hint: is subject to change. To configure the initial branch name to use in all
hint: of your new repositories, which will suppress this warning, call:
hint: 
hint: 	git config --global init.defaultBranch <name>
hint: 
hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
hint: 'development'. The just-created branch can be renamed via this command:
hint: 
hint: 	git branch -m <name>
Preparing worktree (new branch 'orch/remove-me')
(pass) worktree primitives > removes an agent worktree [1491.01ms]
fatal: not a git repository (or any of the parent directories): .git
(pass) worktree primitives > rejects a non-repository path with a clear error [44.25ms]

6 tests failed:
(fail) runDoctor > accepts a live daemon and an answerable socket [4831.02ms]
(fail) runDoctor > fails on an invalid lock and an unanswerable live socket [5195.90ms]
  ^ this test timed out after 5000ms.
(fail) runDoctor > validates configured notifier adapters [8130.34ms]
  ^ this test timed out after 5000ms.
(fail) runDoctor > reports invalid config and accepts missing config [9711.96ms]
  ^ this test timed out after 5000ms.
(fail) review plumbing > reject re-dispatches feedback through the adapter inbox [8666.33ms]
  ^ this test timed out after 5000ms.
(fail) review plumbing > approve merges and removes the worktree and branch [5113.69ms]
  ^ this test timed out after 5000ms.

 260 pass
 6 fail
 714 expect() calls
Ran 266 tests across 56 files. [155.31s]
