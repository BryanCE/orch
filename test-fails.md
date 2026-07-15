bun test v1.3.13 (bf2e2cec)

test/daemon-rpc.test.ts:
(pass) daemon RPC > round-trips a call over the real unix socket [9.40ms]
(pass) daemon RPC > returns an error for an unknown method [7.39ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [17.77ms]
(pass) daemon RPC > delivers pushed subscription events [9.10ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [6.45ms]
(pass) daemon RPC > has a catchable absent-daemon error [7.04ms]

test/clean-worktrees.test.ts:
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [130.81ms]
fatal: 'refs/heads/orch/discard' - not a valid ref
(pass) clean worktrees > --force discards an unmerged orphan and its branch [94.17ms]

test/review.test.ts:
(pass) review plumbing > lists only done worktree agents with commits ahead [86.76ms]
(pass) review plumbing > reject re-dispatches feedback through the adapter inbox [400.19ms]
fatal: 'refs/heads/orch/approve-1' - not a valid ref
(pass) review plumbing > approve merges and removes the worktree and branch [92.81ms]
fatal: Not possible to fast-forward, aborting.
(pass) review plumbing > conflicting approval aborts without changing either branch [34.78ms]
fatal: Not possible to fast-forward, aborting.
(pass) review plumbing > non-fast-forward approval creates a merge commit [37.79ms]

test/codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [2.04ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [0.44ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [0.40ms]

test/daemon-events.test.ts:
(pass) daemon presence events > an RPC subscriber receives a presence transition [17.75ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [0.11ms]
(pass) daemon presence events > a blocked transition drives command sink delivery [24.74ms]
(pass) daemon presence events > a dead daemon falls back once and diffs the switch snapshot [75.10ms]

test/herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [1.78ms]
(pass) herdr and notification hardening > falls back to a real name when an adapter id is blank [0.07ms]
70 |   });
71 | 
72 |   test("nameless notifications use a workspace label, never a bare pane key", () => {
73 |     const title = notificationText(event(), { colorize: false }).title;
74 |     expect(title).toContain("[workspace]");
75 |     expect(title).not.toContain("p9");
                           ^
error: expect(received).not.toContain(expected)

Expected to not contain: "p9"
Received: "DONE [workspace] workspace/agent-p9: state changed"

      at <anonymous> (/home/bryan/orch/test/herdr-notify-hardening.test.ts:75:23)
(fail) herdr and notification hardening > nameless notifications use a workspace label, never a bare pane key [0.20ms]

test/routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves origin workspace selection [28.41ms]
(pass) store hardening > reopening an old outbox schema applies the migration idempotently and enables WAL [18.18ms]
(pass) store hardening > a steal updates ownership only when the observed owner still matches [18.63ms]
(pass) store hardening > the conditional claim is exactly once [16.63ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [60.82ms]

test/parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [0.11ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.06ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.06ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.07ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.08ms]

test/wall-single-owner.test.ts:
(pass) workspace wall ownership > keeps the wall decision primitive in one source module [2.84ms]

test/adapter-allowlist.test.ts:
(pass) pi adapter tool allowlist > declares exactly the built-ins and bridge tools [1.03ms]
(pass) pi adapter tool allowlist > restricts interactive pi launches to the allowlist [0.13ms]
(pass) pi adapter tool allowlist > restricts headless pif launches and preserves the prompt [0.08ms]

test/queue.test.ts:
(pass) queue > add then list shows a queued task [16.87ms]
(pass) queue > exactly one claimer wins, including parallel attempts [21.40ms]
(pass) queue > replays done, failed, and retry transitions [33.46ms]
(pass) queue > cancels queued tasks and returns an error result for claimed tasks [23.88ms]
(pass) queue > picks queued tasks FIFO, honoring the agent constraint [27.37ms]
(pass) queue > caps retries: requeue below the cap, terminal failed at it [28.24ms]
(pass) queue > settles a claimed task to done and blocks any later claim [27.51ms]
(pass) queue > exactly one of two racing claimers wins [20.67ms]

test/broker-routing.test.ts:
(pass) broker CLI routing > write refuses when the daemon socket is unavailable [5097.44ms]
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [61.04ms]
(pass) broker CLI routing > dispatch failure is daemon-absent, not herdr-not-found [5077.42ms]

test/worker-tools.test.ts:
(pass) worker tool policy > default spawn omits peer tools [0.09ms]
(pass) worker tool policy > explicitly disabled peer tools are omitted [0.02ms]
(pass) worker tool policy > config enables all peer tools [0.02ms]

test/claude-adapter.test.ts:
(pass) Claude adapter > declares its identity and capabilities [0.10ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.04ms]
(pass) Claude adapter > detects state from a live presence status [0.47ms]
(pass) Claude adapter > extracts result.json before transcript and native output [0.59ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [90.44ms]

test/setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [124.02ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.30ms]
(pass) notifier setup logic > renders a command entry that loadConfig can parse [2.24ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.26ms]

test/notify.test.ts:
(pass) notify > parses valid sinks and warns about unknown types and missing fields [0.87ms]
(pass) notify > delivers only to sinks whose on filter matches the event [24.23ms]
146 |     };
147 | 
148 |     expect(await deliverToSink(sink, event)).toBe(true);
149 |     await waitForFile(output);
150 | 
151 |     expect(JSON.parse(readFileSync(output, "utf8"))).toEqual({
                                                           ^
error: expect(received).toEqual(expected)

  {
    "agent": "worker",
    "body": 
- "ERROR [task-1] worker: boom
- Workspace: task-1 (#db2777)
+ "ERROR [workspace] worker: boom
+ Workspace: workspace (#db2777)
  Tab: workers
  Model: terra:medium
  Task: run tests
  Cost: $1.25"
  ,
    "cost": 1.25,
    "host": "gpu1",
    "key": "task-1",
    "lastError": "boom",
    "model": "terra:medium",
    "newState": "error",
    "oldState": "working",
    "tab": "workers",
    "task": "run tests",
-   "title": "ERROR [task-1] worker: boom",
+   "title": "ERROR [workspace] worker: boom",
    "ts": "2026-01-01T00:00:00.000Z",
-   "workspace": "task-1",
+   "workspace": "workspace",
    "workspaceColor": "#db2777",
  }

- Expected  - 4
+ Received  + 4

      at <anonymous> (/home/bryan/orch/test/notify.test.ts:151:54)
(fail) notify > command sink writes the event payload as JSON on stdin [15.66ms]
(pass) notify > titles lead with exactly one terminal state and agent [0.19ms]
(pass) notify > webhook failure is non-fatal and reports a warning [28.12ms]

test/adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.15ms]
(pass) PiAdapter > reads state from the presence status through store helpers [0.57ms]
(pass) PiAdapter > appends a steer message to the presence inbox [0.42ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [0.36ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [0.88ms]

test/daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [0.62ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [0.45ms]
(pass) daemon lifecycle > rejects malformed locks and a socket probe that fails [0.55ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [0.26ms]
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.3.13+bf2e2cecf)

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
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [53.12ms]
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [1.21ms]
(pass) daemon lifecycle > rejects a recycled pid identity [0.46ms]
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.3.13+bf2e2cecf)

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
  remove    jquery               Remove a dependency from package.json (bun rm)
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
  create    astro                Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [0.18ms]

test/queue-workspace-replay.test.ts:
(pass) queue workspace replay > persists workspace through append-only replay [23.59ms]
(pass) queue workspace replay > keeps legacy tasks without a workspace [14.73ms]
(pass) queue workspace replay > replays separate workspace values for multiple tasks [16.33ms]
(pass) queue workspace replay > selects only tasks eligible for the requested workspace [17.89ms]

test/outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [27.36ms]

test/work-notify.test.ts:
(pass) orch work notifications > delivers a presence transition through a configured command sink [61.42ms]

test/notify-events-format.test.ts:
(pass) notification and presence event formatting > workspaceColor is stable and returns a palette hex [0.06ms]
(pass) notification and presence event formatting > nameless events use an abstract agent label, never the harness pane key [0.11ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.06ms]
(pass) notification and presence event formatting > webhook payload includes workspace and workspaceColor [0.42ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [0.16ms]
(pass) notification and presence event formatting > derivePresenceTransition derives workspace only for workspace:pane keys [0.07ms]

test/config.test.ts:
(pass) loadConfig > uses defaults when config.toml is missing [0.51ms]
(pass) loadConfig > parses every supported config section [0.38ms]
(pass) loadConfig > names the file, key, expected, and found type for invalid fields [0.30ms]
(pass) loadConfig > parses defaults.allowed_models as a string array [0.27ms]
(pass) loadConfig > rejects a non-string entry in defaults.allowed_models [0.25ms]
(pass) loadConfig > validates defaults.worker_peer_tools as a boolean [0.18ms]
(pass) loadConfig > accepts true and false for defaults.worker_peer_tools [0.31ms]
(pass) loadConfig > leaves defaults.worker_peer_tools absent when unset [0.11ms]
(pass) allowedModelPatterns > returns the built-in defaults when config is absent [0.17ms]
(pass) allowedModelPatterns > returns the configured patterns when set [0.15ms]
(pass) writeDefaultEntry > creates a [defaults] table and records the entry [0.49ms]
(pass) writeDefaultEntry > replaces an existing entry without disturbing other sections [0.21ms]
(pass) writeDefaultEntry > is idempotent when rewriting the same value [0.27ms]
(pass) config precedence > uses the fallback when env and config.toml omit a setting [0.19ms]
(pass) config precedence > uses the config.toml value over the fallback [0.19ms]
(pass) config precedence > uses the ORCH_* environment value over config.toml [0.21ms]
(pass) config precedence > uses an explicit flag override over the environment [0.03ms]
(pass) resolveSetting > uses flag, environment coercion, config, then fallback in precedence order [0.06ms]

test/doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [0.82ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [0.30ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [0.31ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [0.26ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [0.19ms]

test/adapter-hardening.test.ts:
17 |     const pi = new PiAdapter();
18 |     const codex = new CodexAdapter();
19 |     expect(() => pi.extractResult({ key: "missing", sessionPath: "/missing/session.jsonl" })).not.toThrow();
20 |     expect(pi.extractResult({ key: "missing", sessionPath: "/missing/session.jsonl" })).toBeUndefined();
21 |     expect(codex.extractResult({ output: "{broken\n" })).toBeUndefined();
22 |     expect(claudeAdapter.extractResult({ key: "missing", output: "   \nnot json" })).toBeUndefined();
                                                                                          ^
error: expect(received).toBeUndefined()

Received: "not json"

      at <anonymous> (/home/bryan/orch/test/adapter-hardening.test.ts:22:86)
(fail) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [2.40ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [0.35ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [1.19ms]
53 |       extractResult: () => undefined,
54 |     };
55 |     const backend = new HeadlessBackend({ pidAlive: () => false });
56 |     const handle = backend.spawn(adapter, { orchDir: directory });
57 |     expect(handle.key).toMatch(/^session-\d+-\d+$/);
58 |     expect(backend.list()).toContainEqual({ ...handle, alive: false });
                                ^
error: expect(received).toContainEqual(expected)

Expected to contain: {
  pid: 29448,
  key: "session-28466-1",
  alive: false,
}
Received: []

      at <anonymous> (/home/bryan/orch/test/adapter-hardening.test.ts:58:28)
(fail) adapter and runtime hardening > headless generates one safe presence key when no key is supplied [1.54ms]

test/outbox.test.ts:
(pass) outbox delivery > selects pending messages and delivers each message once [23.38ms]
(pass) outbox delivery > keeps failed messages pending until their backoff expires [19.99ms]

test/worktree.test.ts:
(pass) worktree primitives > creates and lists an agent worktree on an orch branch [25.15ms]
(pass) worktree primitives > detects commits ahead of a base branch [23.63ms]
(pass) worktree primitives > removes an agent worktree [19.33ms]
fatal: not a git repository (or any of the parent directories): .git
(pass) worktree primitives > rejects a non-repository path with a clear error [1.11ms]

test/presence-schema.test.ts:
(pass) presence status schema > reads a schema-2 status with its adapter id [24.67ms]
(pass) presence status schema > keeps schema-1 status records valid without adding fields [42.71ms]
(pass) presence status schema > loads a mixed directory of schema-1 and schema-2 records [21.54ms]

test/notify-sinks.test.ts:
(pass) notify sinks > delivers command sink payload as JSON [14.89ms]
(pass) notify sinks > loadSinks parses command and webhook declarations [0.29ms]

test/remote.test.ts:
(pass) remote SSH executor > runs BatchMode SSH and parses JSON [20.21ms]
(pass) remote SSH executor > returns a typed timeout failure [503.52ms]
(pass) remote SSH executor > returns a dead-host failure [26.33ms]
(pass) remote SSH executor > returns a non-JSON failure [23.95ms]
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.22ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.09ms]

test/broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [22.79ms]
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [0.19ms]
(pass) broker ownership and workspace governance > work-loop selection stays within the origin workspace [20.18ms]

test/doctor-checks.test.ts:
(pass) doctor notification-sink checks > reports no sinks as healthy [3.88ms]
(pass) doctor notification-sink checks > warns for a webhook with a malformed URL [1.49ms]
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [0.85ms]
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [0.95ms]

test/ownership.test.ts:
(pass) agent ownership > round-trips an owner [18.25ms]
(pass) agent ownership > allows unowned and same-owner writes [18.63ms]
(pass) agent ownership > denies foreign writes and supports stealing [16.89ms]

test/doctor-hosts.test.ts:
38 |     writeHosts(directory, '[hosts.good]\ndest = "user@good.example"\n');
39 | 
40 |     const results = await runDoctor(directory, successfulRunner);
41 | 
42 |     expect(result(results, "remote-ssh")).toMatchObject({ status: "ok", detail: "1 configured host passed" });
43 |     expect(result(results, "remote-orch-version")).toMatchObject({ status: "ok", detail: "1 configured host passed" });
                                                        ^
error: expect(received).toMatchObject(expected)

  {
-   "detail": "1 configured host passed",
-   "status": "ok",
+   "detail": "good: remote orch 0.1.0 (local 0.2.0); fix: ssh user@good.example orch --version",
+   "id": "remote-orch-version",
+   "label": "Remote orch version/schema",
+   "status": "fail",
  }

- Expected  - 2
+ Received  + 4

      at <anonymous> (/home/bryan/orch/test/doctor-hosts.test.ts:43:52)
(fail) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [118.28ms]
(pass) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [118.63ms]
66 |         : { ok: true, stdout: "", stderr: "", code: 0 };
67 | 
68 |     const check = result(await runDoctor(directory, mismatch), "remote-orch-version");
69 | 
70 |     expect(check.status).toBe("fail");
71 |     expect(check.detail).toContain("old: remote orch 9.9.9 (local 0.1.0)");
                              ^
error: expect(received).toContain(expected)

Expected to contain: "old: remote orch 9.9.9 (local 0.1.0)"
Received: "old: remote orch 9.9.9 (local 0.2.0); fix: ssh user@old.example orch --version"

      at <anonymous> (/home/bryan/orch/test/doctor-hosts.test.ts:71:26)
(fail) doctor remote host checks > flags a remote orch version/schema mismatch in detail [122.68ms]
(pass) doctor remote host checks > reports no remote hosts configured as healthy [114.36ms]

test/remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [22.87ms]
(pass) async remote fan-out > returns a typed dead-host failure [20.41ms]
(pass) async remote fan-out > returns a typed timeout failure [503.41ms]
(pass) async remote fan-out > returns a typed non-JSON failure [23.53ms]
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [504.99ms]

test/backend-headless.test.ts:
(pass) HeadlessBackend > spawns a detached process and records its handle [23.76ms]
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [46.21ms]
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [0.46ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [0.31ms]
(pass) HeadlessBackend > never signals an unrecorded pid [0.25ms]

test/config-watch.test.ts:
(pass) watchConfig > applies a valid edit after the debounced change [257.42ms]
(pass) watchConfig > keeps the last-good config and warns once for an invalid edit [602.20ms]
(pass) watchConfig > stop prevents further callbacks [407.12ms]

test/orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [24.62ms]

test/orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [2.46ms]
(pass) orchd RPC transports > round-trips over the TCP fallback transport [6.88ms]

test/daemon-configwatch.test.ts:
(pass) config watch > loads initially and applies edits [24.11ms]
(pass) config watch > keeps the last good config on invalid TOML and recovers [47.40ms]
(pass) config watch > stops all callbacks [254.47ms]

test/workspace-policy.test.ts:
(pass) workspace policy > extracts workspace ids from base32 Herdr pane keys [0.13ms]
(pass) workspace policy > resolves workspace names through records and functions [0.14ms]
(pass) workspace policy > treats headless and session keys as unscoped [0.04ms]
(pass) workspace policy > denies a cross-workspace wall without override [0.03ms]
(pass) workspace policy > allows a cross-workspace wall with override [0.01ms]
(pass) workspace policy > scopes items to the current workspace and excludes unscoped keys [0.14ms]
(pass) workspace policy > null current workspace leaves items unscoped [0.04ms]
(pass) workspace policy > accepts base32 pane ids beyond the existing coverage [0.07ms]

test/config-precedence.test.ts:
(pass) config precedence > returns a [defaults] value when no override is set [0.42ms]
(pass) config precedence > applies defaults when config, env, and flag are absent [0.17ms]
(pass) config precedence > uses env over config and flag over env [0.24ms]
(pass) config precedence > parses notify entries and hosts into expected shapes [0.24ms]
(pass) config precedence > reports a helpful validation error for invalid config [0.23ms]

test/doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [0.14ms]
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [106.36ms]
(pass) runDoctor > reports an absent daemon as optional [115.81ms]
(pass) runDoctor > reports and fixes a stale daemon lock [115.46ms]
(pass) runDoctor > accepts a live daemon and an answerable socket [235.09ms]
(pass) runDoctor > warns when the live daemon code hash is stale [110.24ms]
(pass) runDoctor > fails on an invalid lock and an unanswerable live socket [231.78ms]
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [0.73ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [0.38ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [0.46ms]
(pass) runDoctor > reports a dead presence pid and corrupt spawn registry lines [106.99ms]
(pass) runDoctor > does not offer a fix for missing binaries [3.17ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [0.47ms]
(pass) runDoctor > validates configured notifier adapters [660.49ms]
(pass) runDoctor > reports invalid config and accepts missing config [232.97ms]
(pass) runDoctor > never throws when individual checks encounter broken inputs [317.88ms]

test/workspace-walls.test.ts:
(pass) workspace helpers > extracts workspace ids only from pane ids [0.05ms]
(pass) workspace helpers > derives an entity workspace from paneId or key [0.08ms]
(pass) workspace helpers > returns the same entities when all workspaces are requested [0.08ms]
(pass) workspace wall writes > allows a write within the same workspace [0.03ms]
(pass) workspace wall writes > denies a cross-workspace write with both workspaces in the reason [0.03ms]
(pass) workspace wall writes > allows a cross-workspace write with an explicit override [0.02ms]
(pass) workspace wall writes > allows legacy unscoped targets [0.01ms]
(pass) workspace-aware queued task selection > excludes tasks pinned to another workspace [0.07ms]
(pass) workspace-aware queued task selection > keeps legacy tasks eligible in any workspace [0.03ms]
(pass) workspace-aware queued task selection > selects the earliest eligible task and respects agent constraints [0.18ms]

test/backend-herdr.test.ts:
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [0.14ms]
(pass) HerdrBackend > maps close and list to herdr helpers [0.11ms]

test/broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [1.48ms]
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [20.34ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [20.27ms]
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [18.13ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [1.82ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [4.64ms]

test/notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > skips an unavailable adapter without affecting available adapters [0.38ms]
notify: webhook notifier has invalid configuration
(pass) notifier registry and built-in adapters > reports malformed required configuration instead of throwing [0.23ms]
(pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [0.37ms]
(pass) notifier registry and built-in adapters > command adapter passes canonical JSON on stdin [16.82ms]
(pass) notifier registry and built-in adapters > desktop fallback selects notify-send, then WSL notify when it fails [0.89ms]
notify: bad sink failed
(pass) notifier registry and built-in adapters > isolates delivery failures and still delivers to other adapters [0.47ms]

test/orchd-rpc-replay.test.ts:
(pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [0.08ms]
(pass) orchd RPC replay buffer > drops the oldest events and reports a replay gap [0.49ms]

test/work-race.test.ts:
(pass) orch work claim race > two concurrent workers produce one claim and the loser exits cleanly [363.81ms]

6 tests failed:
(fail) herdr and notification hardening > nameless notifications use a workspace label, never a bare pane key [0.20ms]
(fail) notify > command sink writes the event payload as JSON on stdin [15.66ms]
(fail) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [2.40ms]
(fail) adapter and runtime hardening > headless generates one safe presence key when no key is supplied [1.54ms]
(fail) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [118.28ms]
(fail) doctor remote host checks > flags a remote orch version/schema mismatch in detail [122.68ms]

 217 pass
 6 fail
 623 expect() calls
Ran 223 tests across 49 files. [19.24s]
