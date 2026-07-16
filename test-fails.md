bun test v1.3.14 (0d9b296a)

test/adapter-allowlist.test.ts:
(pass) pi adapter tool allowlist > declares exactly the built-ins and bridge tools [2.03ms]
(pass) pi adapter tool allowlist > restricts interactive pi launches to the allowlist [0.33ms]
(pass) pi adapter tool allowlist > restricts headless pif launches and preserves the prompt [0.27ms]

test/adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [2.76ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [4.05ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [8.13ms]
(pass) adapter and runtime hardening > headless generates one safe presence key when no key is supplied [10.52ms]

test/adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [1.37ms]
(pass) PiAdapter > reads state from the presence status through store helpers [1.91ms]
(pass) PiAdapter > appends a steer message to the presence inbox [1.36ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [1.94ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [1.98ms]

test/backend-headless.test.ts:
(pass) HeadlessBackend > spawns a detached process and records its handle [66.77ms]
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [83.57ms]
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [1.68ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [1.19ms]
(pass) HeadlessBackend > never signals an unrecorded pid [1.06ms]

test/backend-herdr.test.ts:
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [0.59ms]
(pass) HerdrBackend > maps close and list to herdr helpers [0.30ms]

test/backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [0.14ms]
(pass) TmuxBackend > reports tmux availability [1.40ms]
(pass) TmuxBackend > reflects the TMUX environment [0.28ms]
(pass) TmuxBackend > mints identity from the owning session [0.28ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.10ms]

test/broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [1.31ms]
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [126.59ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [374.72ms]
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [408.10ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [1.99ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [157.83ms]

test/broker-governance.test.ts:
(pass) daemon governWrite enforcement > unscoped actor bypasses ownership and the wall [294.96ms]
(pass) daemon governWrite enforcement > owner may write to its own agent [222.46ms]
(pass) daemon governWrite enforcement > a foreign owner in the same workspace is refused [451.09ms]
(pass) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [310.45ms]
(pass) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [85.90ms]
(pass) daemon governWrite enforcement > --steal transfers ownership to the actor [54.58ms]
(pass) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [81.78ms]

test/broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [59.34ms]
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [0.29ms]
(pass) broker ownership and workspace governance > work-loop selection stays within the origin workspace [60.51ms]

test/broker-routing.test.ts:
49 |     writeFileSync(join(orchDir, "orchd.lock"), JSON.stringify({ pid: process.pid }));
50 | 
51 |     const result = runCli(orchDir, ["dispatch", "agent-alpha", "hello"]);
52 | 
53 |     expect(result.status).not.toBe(0);
54 |     expect(`${result.stdout}\n${result.stderr}`).toContain("orch daemon start");
                                                      ^
error: expect(received).toContain(expected)

Expected to contain: "orch daemon start"
Received: "\nno harness selected — pass --agent <id> or run `orch setup` to pick one\n"

      at <anonymous> (/mnt/c/Users/Bryan/Documents/orch/test/broker-routing.test.ts:54:50)
(fail) broker CLI routing > write refuses when the daemon socket is unavailable [434.32ms]
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [2331.33ms]
72 | 
73 |     const result = runCli(orchDir, ["dispatch", "agent-alpha", "hello"]);
74 |     const output = `${result.stdout}\n${result.stderr}`;
75 | 
76 |     expect(result.status).not.toBe(0);
77 |     expect(output).toContain("orch daemon start");
                        ^
error: expect(received).toContain(expected)

Expected to contain: "orch daemon start"
Received: "\nno harness selected — pass --agent <id> or run `orch setup` to pick one\n"

      at <anonymous> (/mnt/c/Users/Bryan/Documents/orch/test/broker-routing.test.ts:77:20)
(fail) broker CLI routing > dispatch failure is daemon-absent, not herdr-not-found [522.73ms]

test/claude-adapter.test.ts:
(pass) Claude adapter > declares its identity and capabilities [0.32ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.15ms]
(pass) Claude adapter > detects state from a live presence status [2.01ms]
(pass) Claude adapter > extracts result.json before transcript and native output [2.20ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [2166.17ms]
(pass) Claude adapter > exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session) [487.46ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed ORCH_AGENT_KEY [100.05ms]

test/claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [94.54ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [93.92ms]
(pass) claude-hooks shim > under node > writes status.json for a valid key [87.71ms]
(pass) claude-hooks shim > under deno > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [926.96ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under deno > exits 1 loudly on a present-but-malformed key [2217.54ms]
(pass) claude-hooks shim > under deno > writes status.json for a valid key [230.47ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [81.37ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [77.76ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [97.69ms]
(skip) claude-hooks shim tests need the dist bundle

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
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [2443.74ms]
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
(pass) clean worktrees > --force discards an unmerged orphan and its branch [530.66ms]

test/cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.54ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.24ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.39ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [0.36ms]
(pass) headless common path: identity key -> presence > spawn mints a filesystem-safe headless identity and creates its presence dir [68.87ms]
(pass) headless common path: identity key -> presence > workspaceOf reads the workspace from the structured key, not a regex [0.30ms]

test/cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.18ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [1.43ms]
(pass) tmux backend registry and capabilities > exposes pane capabilities [0.14ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.12ms]
(pass) tmux backend registry and capabilities > mints identity from a protected session seam [0.20ms]
(pass) tmux backend registry and capabilities > serializes tmux identities as one flat key [0.20ms]
(pass) tmux backend registry and capabilities > rejects an empty handle without invoking tmux [0.06ms]

test/codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [0.38ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [0.77ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [0.85ms]

test/config-precedence.test.ts:
(pass) config precedence > returns a [defaults] value when no override is set [1.72ms]
(pass) config precedence > applies defaults when config, env, and flag are absent [2.02ms]
(pass) config precedence > uses env over config and flag over env [1.61ms]
(pass) config precedence > parses notify entries and hosts into expected shapes [1.47ms]
(pass) config precedence > reports a helpful validation error for invalid config [2.24ms]

test/config-watch.test.ts:
(pass) watchConfig > applies a valid edit after the debounced change [261.91ms]
(pass) watchConfig > keeps the last-good config and warns once for an invalid edit [615.72ms]
(pass) watchConfig > stop prevents further callbacks [415.05ms]

test/config.test.ts:
(pass) loadConfig > uses defaults when config.toml is missing [1.60ms]
(pass) loadConfig > parses every supported config section [5.45ms]
(pass) loadConfig > names the file, key, expected, and found type for invalid fields [1.47ms]
(pass) loadConfig > parses defaults.allowed_models as a string array [4.99ms]
(pass) loadConfig > rejects a non-string entry in defaults.allowed_models [1.99ms]
(pass) loadConfig > validates defaults.worker_peer_tools as a boolean [5.42ms]
(pass) loadConfig > accepts true and false for defaults.worker_peer_tools [17.28ms]
(pass) loadConfig > leaves defaults.worker_peer_tools absent when unset [3.89ms]
(pass) allowedModelPatterns > returns the built-in defaults when config is absent [1.28ms]
(pass) allowedModelPatterns > returns the configured patterns when set [1.29ms]
(pass) writeDefaultEntry > creates a [defaults] table and records the entry [8.10ms]
(pass) writeDefaultEntry > replaces an existing entry without disturbing other sections [4.76ms]
(pass) writeDefaultEntry > is idempotent when rewriting the same value [4.83ms]
(pass) config precedence > uses the fallback when env and config.toml omit a setting [2.42ms]
(pass) config precedence > uses the config.toml value over the fallback [1.79ms]
(pass) config precedence > uses the ORCH_* environment value over config.toml [2.38ms]
(pass) config precedence > uses an explicit flag override over the environment [0.18ms]
(pass) resolveSetting > uses flag, environment coercion, config, then fallback in precedence order [0.31ms]

test/daemon-configwatch.test.ts:
(pass) config watch > loads initially and applies edits [26.23ms]
(pass) config watch > keeps the last good config on invalid TOML and recovers [69.88ms]
(pass) config watch > stops all callbacks [264.96ms]

test/daemon-events.test.ts:
(pass) daemon presence events > an RPC subscriber receives a presence transition [82.73ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [0.44ms]
(pass) daemon presence events > a blocked transition drives command sink delivery [436.08ms]
(pass) daemon presence events > a dead daemon falls back once and diffs the switch snapshot [174.35ms]

test/daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [60.38ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [59.62ms]
(pass) daemon lifecycle > rejects malformed locks and a socket probe that fails [110.91ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [5.66ms]
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
  create    next-app             Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [75.09ms]
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [30.24ms]
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
  add       @remix-run/dev       Add a dependency to package.json (bun a)
  remove    redux                Remove a dependency from package.json (bun rm)
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
  create    svelte               Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > rejects a recycled pid identity [56.46ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [1.25ms]

test/daemon-rpc.test.ts:
(pass) daemon RPC > round-trips a call over the real unix socket [13.71ms]
(pass) daemon RPC > returns an error for an unknown method [8.61ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [17.52ms]
(pass) daemon RPC > delivers pushed subscription events [11.31ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [72.11ms]
(pass) daemon RPC > has a catchable absent-daemon error [1.78ms]

test/doctor-backends.test.ts:
(pass) doctor backend and presence checks > reports every registered backend and boolean capability fields [2.28ms]
(pass) doctor backend and presence checks > reports only malformed or legacy presence records [8.97ms]

test/doctor-checks.test.ts:
(pass) doctor notification-sink checks > reports no sinks as healthy [14.42ms]
(pass) doctor notification-sink checks > warns for a webhook with a malformed URL [12.97ms]
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [7.98ms]
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [7.10ms]

test/doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [1.71ms]
(pass) doctor Claude hooks shim check > accepts the node runtime command form [1.15ms]
(pass) doctor Claude hooks shim check > accepts the deno runtime command form [0.95ms]
(pass) doctor Claude hooks shim check > accepts the bun runtime command form [1.05ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [0.78ms]
(pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [1.54ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [2.26ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [1.35ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [1.10ms]

test/doctor-hosts.test.ts:
(pass) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [37.06ms]
(pass) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [11.93ms]
(pass) doctor remote host checks > flags a remote orch version/schema mismatch in detail [51.65ms]
(pass) doctor remote host checks > reports no remote hosts configured as healthy [60.22ms]

test/doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [104.35ms]
(pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [66.56ms]
(pass) doctor stale presence safety > no dead agents leaves nothing to remove [225.46ms]

test/doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [13.52ms]
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [15.87ms]
(pass) runDoctor > reports an absent daemon as optional [35.15ms]
(pass) runDoctor > reports and fixes a stale daemon lock [22.80ms]
(pass) runDoctor > accepts a live daemon and an answerable socket [144.33ms]
(pass) runDoctor > warns when the live daemon code hash is stale [83.91ms]
(pass) runDoctor > fails on an invalid lock and an unanswerable live socket [81.43ms]
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [34.75ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [9.25ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [28.64ms]
(pass) runDoctor > reports a dead presence pid and corrupt spawn registry lines [84.10ms]
(pass) runDoctor > does not offer a fix for missing binaries [46.32ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [1.59ms]
(pass) runDoctor > validates configured notifier adapters [1819.63ms]
(pass) runDoctor > reports invalid config and accepts missing config [25.52ms]
(pass) runDoctor > never throws when individual checks encounter broken inputs [24.85ms]

test/herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [0.54ms]
(pass) herdr and notification hardening > falls back to a real name when an adapter id is blank [0.27ms]
(pass) herdr and notification hardening > nameless notifications use a workspace label, never a bare pane key [0.47ms]

test/identity.test.ts:
(pass) serializeIdentity / parseIdentity round-trip > round-trips herdr [0.13ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with % handle [0.07ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with : and % handle [0.15ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips headless pid handle [0.14ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips empty workspace [0.13ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips separator inside parts [0.13ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips slash inside parts [0.04ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips percent-code-lookalike [0.06ms]
(pass) serializeIdentity / parseIdentity round-trip > serialized key is a single flat segment (no nested path) [0.16ms]
(pass) serializeIdentity / parseIdentity round-trip > backend namespaces prevent collisions across equal workspace/handle [0.18ms]
(pass) malformed input > rejects wrong segment count [0.35ms]
(pass) malformed input > rejects empty key [0.13ms]
(pass) malformed input > rejects empty backend or handle on serialize [0.26ms]
(pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.13ms]
(pass) malformed input > tryParseIdentity parses a valid key [0.13ms]

test/notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > skips an unavailable adapter without affecting available adapters [0.89ms]
notify: webhook notifier has invalid configuration
(pass) notifier registry and built-in adapters > reports malformed required configuration instead of throwing [1.33ms]
(pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [1.23ms]
(pass) notifier registry and built-in adapters > command adapter passes canonical JSON on stdin [124.18ms]
(pass) notifier registry and built-in adapters > desktop fallback selects notify-send, then WSL notify when it fails [2.26ms]
notify: bad sink failed
(pass) notifier registry and built-in adapters > isolates delivery failures and still delivers to other adapters [1.03ms]

test/notify-events-format.test.ts:
(pass) notification and presence event formatting > workspaceColor is stable and returns a palette hex [0.15ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.32ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.25ms]
(pass) notification and presence event formatting > webhook payload includes workspace and workspaceColor [0.79ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [0.40ms]
(pass) notification and presence event formatting > derivePresenceTransition derives workspace from identity keys [0.30ms]

test/notify-sinks.test.ts:
(pass) notify sinks > delivers command sink payload as JSON [64.58ms]
(pass) notify sinks > loadSinks parses command and webhook declarations [1.46ms]

test/notify.test.ts:
(pass) notify > parses valid sinks and warns about unknown types and missing fields [2.57ms]
(pass) notify > delivers only to sinks whose on filter matches the event [66.95ms]
(pass) notify > command sink writes the event payload as JSON on stdin [76.67ms]
(pass) notify > titles lead with exactly one terminal state and agent [0.42ms]
(pass) notify > webhook failure is non-fatal and reports a warning [27.56ms]

test/orchd-rpc-replay.test.ts:
(pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [4.36ms]
(pass) orchd RPC replay buffer > drops the oldest events and reports a replay gap [8.59ms]

test/orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [71.62ms]

test/orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [34.97ms]
(pass) orchd RPC transports > round-trips over the TCP fallback transport [57.46ms]

test/outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [394.31ms]

test/outbox.test.ts:
(pass) outbox delivery > selects pending messages and delivers each message once [258.87ms]
(pass) outbox delivery > keeps failed messages pending until their backoff expires [241.46ms]

test/ownership.test.ts:
(pass) agent ownership > round-trips an owner [257.90ms]
(pass) agent ownership > allows unowned and same-owner writes [237.45ms]
(pass) agent ownership > denies foreign writes and supports stealing [282.98ms]

test/parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [13.05ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.86ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.88ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.68ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.76ms]

test/presence-schema.test.ts:
(pass) presence status schema > reads a schema-2 status with its adapter id [460.28ms]
(pass) presence status schema > keeps schema-1 status records valid without adding fields [185.68ms]
(pass) presence status schema > loads a mixed directory of schema-1 and schema-2 records [74.11ms]

test/queue-workspace-replay.test.ts:
(pass) queue workspace replay > persists workspace through append-only replay [68.05ms]
(pass) queue workspace replay > keeps legacy tasks without a workspace [53.70ms]
(pass) queue workspace replay > replays separate workspace values for multiple tasks [55.98ms]
(pass) queue workspace replay > selects only tasks eligible for the requested workspace [70.05ms]

test/queue.test.ts:
(pass) queue > add then list shows a queued task [123.56ms]
(pass) queue > exactly one claimer wins, including parallel attempts [147.55ms]
(pass) queue > replays done, failed, and retry transitions [291.75ms]
(pass) queue > cancels queued tasks and returns an error result for claimed tasks [359.47ms]
(pass) queue > picks queued tasks FIFO, honoring the agent constraint [380.21ms]
(pass) queue > caps retries: requeue below the cap, terminal failed at it [301.05ms]
(pass) queue > settles a claimed task to done and blocks any later claim [228.26ms]
(pass) queue > exactly one of two racing claimers wins [319.04ms]

test/remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [75.10ms]
(pass) async remote fan-out > returns a typed dead-host failure [67.49ms]
(pass) async remote fan-out > returns a typed timeout failure [507.19ms]
(pass) async remote fan-out > returns a typed non-JSON failure [79.66ms]
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [542.03ms]

test/remote.test.ts:
(pass) remote SSH executor > runs BatchMode SSH and parses JSON [546.33ms]
(pass) remote SSH executor > returns a typed timeout failure [516.86ms]
(pass) remote SSH executor > returns a dead-host failure [1098.08ms]
(pass) remote SSH executor > returns a non-JSON failure [69.32ms]
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.14ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.11ms]

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
(pass) review plumbing > lists only done worktree agents with commits ahead [485.23ms]
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
79 |     const worktreePath = createAgentWorktree(repoRoot, "iterate-1");
80 |     commit(worktreePath, "feature.txt", "feature\n", "first pass");
81 |     registerDoneAgent(orchDir, "pane-1", worktreePath, worktreeBranch(worktreePath));
82 | 
83 |     expect(runOrch(repoRoot, orchDir, "review", "reject", "iterate-1", "-m", "handle the empty case")).toContain("re-dispatched");
84 |     expect(fs.readFileSync(path.join(orchDir, "agents", "pane-1", "inbox.jsonl"), "utf8")).toContain("handle the empty case");
                   ^
error: ENOENT: no such file or directory, open '/tmp/orch-review-dir-GpIq1U/agents/pane-1/inbox.jsonl'
      at <anonymous> (/mnt/c/Users/Bryan/Documents/orch/test/review.test.ts:84:15)
(fail) review plumbing > reject re-dispatches feedback through the adapter inbox [2713.85ms]
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
(pass) review plumbing > approve merges and removes the worktree and branch [546.71ms]
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
(pass) review plumbing > conflicting approval aborts without changing either branch [195.75ms]
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
(pass) review plumbing > non-fast-forward approval creates a merge commit [204.17ms]

test/routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves origin workspace selection [110.47ms]
(pass) store hardening > reopening an old outbox schema applies the migration idempotently and enables WAL [229.39ms]
(pass) store hardening > a steal updates ownership only when the observed owner still matches [244.78ms]
(pass) store hardening > the conditional claim is exactly once [247.69ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [1411.22ms]

test/setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [152.50ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.50ms]
(pass) notifier setup logic > renders a command entry that loadConfig can parse [1.95ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.82ms]

test/wall-single-owner.test.ts:
(pass) workspace wall ownership > keeps the wall decision primitive in one source module [53.51ms]

test/work-notify.test.ts:
(pass) orch work notifications > delivers a presence transition through a configured command sink [126.81ms]

test/work-race.test.ts:
(pass) orch work claim race > two concurrent workers produce one claim and the loser exits cleanly [1781.03ms]

test/worker-tools.test.ts:
(pass) worker tool policy > default spawn omits peer tools [0.67ms]
(pass) worker tool policy > explicitly disabled peer tools are omitted [0.38ms]
(pass) worker tool policy > config enables all peer tools [0.56ms]

test/workspace-policy.test.ts:
(pass) workspace policy > reads workspaces from serialized identity keys [1.02ms]
(pass) workspace policy > resolves workspace names through records and functions [8.34ms]
(pass) workspace policy > compares serialized keys by their workspace [0.91ms]
(pass) workspace policy > enforces the workspace wall [0.85ms]
(pass) workspace policy > scopes serialized identity keys to the current workspace [0.58ms]
(pass) workspace policy > null current workspace leaves items unscoped [0.26ms]

test/workspace-walls.test.ts:
(pass) workspace helpers > extracts workspace ids only from identity keys [1.23ms]
(pass) workspace helpers > derives an entity workspace from the identity key [0.20ms]
(pass) workspace helpers > returns the same entities when all workspaces are requested [0.30ms]
(pass) workspace wall writes > allows a write within the same workspace [0.08ms]
(pass) workspace wall writes > denies a cross-workspace write with both workspaces in the reason [0.09ms]
(pass) workspace wall writes > allows a cross-workspace write with an explicit override [0.06ms]
(pass) workspace wall writes > allows legacy unscoped targets [0.07ms]
(pass) workspace-aware queued task selection > excludes tasks pinned to another workspace [0.17ms]
(pass) workspace-aware queued task selection > keeps legacy tasks eligible in any workspace [0.07ms]
(pass) workspace-aware queued task selection > selects the earliest eligible task and respects agent constraints [0.20ms]

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
(pass) worktree primitives > creates and lists an agent worktree on an orch branch [91.58ms]
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
(pass) worktree primitives > detects commits ahead of a base branch [180.93ms]
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
(pass) worktree primitives > removes an agent worktree [97.59ms]
fatal: not a git repository (or any of the parent directories): .git
(pass) worktree primitives > rejects a non-repository path with a clear error [4.66ms]

1 tests skipped:
(skip) claude-hooks shim tests need the dist bundle


3 tests failed:
(fail) broker CLI routing > write refuses when the daemon socket is unavailable [434.32ms]
(fail) broker CLI routing > dispatch failure is daemon-absent, not herdr-not-found [522.73ms]
(fail) review plumbing > reject re-dispatches feedback through the adapter inbox [2713.85ms]

 278 pass
 1 skip
 3 fail
 742 expect() calls
Ran 282 tests across 57 files. [46.26s]
