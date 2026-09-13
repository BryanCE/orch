bun test v1.4.0 (34cbb9a40)

packages/orch/integration/daemon-registration.test.ts:
(pass) machine daemon registration > refuses a second start and names the live socket [2.41ms]
(pass) machine daemon registration > the refusal a second start prints names the live daemon's pid [1.11ms]
(pass) machine daemon registration > doctor names both when a second daemon is live beside the registered one [3.59ms]
(pass) machine daemon registration > evicts a registration whose process instance no longer matches [0.79ms]
(pass) machine daemon registration > routes a different orch dir to its own runtime files [0.97ms]
(pass) machine daemon registration > doctor distinguishes registered-but-dead from live-and-registered [0.91ms]

packages/orch/integration/codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [0.69ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [1.01ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [0.65ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [0.54ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [0.43ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [36.21ms]

packages/orch/integration/routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves pack selection [47.17ms]
(pass) store hardening > a fresh store creates the full current schema with WAL enabled [27.67ms]
(pass) store hardening > the store refuses a second open holding, so ownership cannot fork [31.46ms]
(pass) store hardening > adoption closes the prior holding in the same step that opens the new one [40.85ms]
(pass) store hardening > the attempt insert claim is exactly once [35.32ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [175.30ms]

packages/orch/integration/reset-build-safety.test.ts:
(pass) build reset safety > --build dry-run never names a path inside ORCH_DIR [134.48ms]

packages/orch/integration/claude-adapter.test.ts:
(pass) Claude adapter > declares its identity, and composes only the roles it fully implements [0.12ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.09ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.05ms]
(pass) Claude adapter > detects state from a live presence status [21.48ms]
(pass) Claude adapter > extracts results.jsonl before transcript and native output [1.00ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [0.54ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [25.96ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [69.69ms]
(pass) Claude adapter > exits silently and writes no presence without launch env (a non-orch session) [15.75ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed launch env [16.34ms]

packages/orch/integration/cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.13ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.09ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.11ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.13ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.06ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.18ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [0.17ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no plexer answers [0.08ms]
(pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [53.78ms]
(pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [0.42ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [144.65ms]
(pass) headless common path: identity key -> presence > one adapter uses the same opaque key across headless and tmux routes [0.23ms]
(pass) headless common path: identity key -> presence > a key carries no environment to read back out of it [0.06ms]

packages/orch/integration/daemon-no-peer-credentials.test.ts:
(pass) the daemon asks for a token and nothing else > no peer-credential or ancestry syscall appears in the daemon at all [0.86ms]
(pass) the daemon asks for a token and nothing else > a caller the daemon has no relationship to is accepted on the token alone [54.63ms]
(pass) the daemon asks for a token and nothing else > that same stranger without the token is refused, so the token is what decided [3.15ms]

packages/orch/integration/owner-scoping.test.ts:
124 |     seedStatus(dir, grandchild, { pid: process.pid, state: "working", project: process.cwd() });
125 |     seedStatus(dir, foreignRoot, { pid: process.pid, state: "working", project: "/other/project" });
126 |     // Identity is injected through ownKey; no launch credential is set.
127 |     delete process.env[LAUNCH_ENV];
128 | 
129 |     expect(peerView(dir, root, [child, grandchild, foreignRoot], true).visible).toEqual([child, grandchild, foreignRoot]);
                                                                                      ^
error: expect(received).toEqual(expected)

- [
-   "child00001",
-   "grand00001",
-   "other00001",
- ]
+ []

- Expected  - 5
+ Received  + 1

      at <anonymous> (/home/bryan/orch/packages/orch/integration/owner-scoping.test.ts:129:81)
(fail) fleet ownership scoping > fleet visibility follows provenance depth, not caller environment [84.99ms]
(pass) fleet ownership scoping > owner token uses ORCH_OWNER, else this process's own minted id [20.82ms]
(pass) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [50.08ms]
(pass) fleet ownership scoping > close --all works without an owner token [182.40ms]
skipping caller: unknown backend null (reaping the record)
skipping other: unknown backend null (reaping the record)
{"closed":["caller","klmine0001","klforeign1","other"],"results":[{"target":"caller","handle":null,"outcome":"done","error":null},{"target":"klmine0001","handle":"mine","outcome":"done","error":null},{"target":"klforeign1","handle":"foreign","outcome":"done","error":null},{"target":"other","handle":null,"outcome":"done","error":null}],"requested":4,"ok":4,"stream":false}
(pass) fleet ownership scoping > close --all closes all managed records regardless of owner [80.13ms]
(pass) fleet ownership scoping > driving verbs remain gated against a live foreign holder [14861.53ms]
(pass) fleet ownership scoping > result refuses a foreign-owned agent and names its owner [7390.59ms]
(pass) fleet ownership scoping > pane mutations refuse a foreign-owned agent and name its owner [15024.32ms]
276 |     expect(refused.status).not.toBe(0);
277 |     expect(refused.output).toContain("usage: orch close");
278 |     expect(spawnedRecords().has(key)).toBe(true);
279 | 
280 |     const result = runCli(dir, ["close", key], "caller-orchestrator");
281 |     expect(result.status).toBe(0);
                                ^
error: expect(received).toBe(expected)

Expected: 0
Received: 1

      at <anonymous> (/home/bryan/orch/packages/orch/integration/owner-scoping.test.ts:281:27)
(fail) fleet ownership scoping > close has no force option and remains unconditional without it [6253.63ms]
{"closed":["kmismatch1"],"results":[{"target":"kmismatch1","handle":"{\"pid\":15247,\"key\":\"kmismatch1\"}","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) fleet ownership scoping > close cleans up a mismatched recorded process without signalling [3751.66ms]
(pass) a spawned agent touches only what it spawned > a spawned agent acts as its own minted id, not its launch key [0.39ms]
(pass) a spawned agent touches only what it spawned > --cross-space from a spawned agent is refused [212.11ms]
(pass) a spawned agent touches only what it spawned > close --all from an AGENT sweeps only its own subtree [242.76ms]
(pass) a spawned agent touches only what it spawned > close --all from the HUMAN sweeps every managed spawn, whoever spawned it [245.93ms]
(pass) a spawned agent touches only what it spawned > close from a spawned agent is REFUSED when the target is not its own [3722.89ms]
(pass) a spawned agent touches only what it spawned > close from a spawned agent SUCCEEDS on a slave it spawned itself [3761.39ms]
(pass) a spawned agent touches only what it spawned > the workspace operator keeps control of an agent-owned fleet [3744.74ms]

packages/orch/integration/presence-schema.test.ts:
(pass) presence status schema > reads a spawned identity without placement fields in status [93.66ms]
(pass) presence status schema > orch status JSON exposes the agent status fields [58.14ms]
(pass) presence status schema > status and list report the same agent identity [3596.38ms]
(pass) presence status schema > mixed pi and Claude status rows carry the same status field set [60.10ms]
(pass) presence status schema > rejects a status record that carries no schema stamp [63.19ms]
(pass) presence status schema > rejects a status record stamped with a non-current schema [49.62ms]
(pass) presence status schema > rejects a current-schema record carrying placement fields [62.53ms]
(pass) presence status schema > a malformed record is skipped without hiding the valid records beside it [62.98ms]
(pass) presence status schema > the four facts are recorded apart and composed back onto the minted id [42.26ms]

packages/orch/integration/os-executors.test.ts:
(pass) cross-OS execution is a backend, not a peer daemon > the local side supplies start, is-alive and kill [2.29ms]
(pass) cross-OS execution is a backend, not a peer daemon > an OS side with no executor answers, and never runs the body [0.16ms]
(pass) cross-OS execution is a backend, not a peer daemon > the local side runs the body and hands back its value [0.07ms]
(pass) cross-OS execution is a backend, not a peer daemon > doctor passes a daemon registered on the side orch is running on [0.75ms]
(pass) cross-OS execution is a backend, not a peer daemon > doctor answers, rather than failing, for a daemon on a side with no executor [0.47ms]

packages/orch/integration/close-always.test.ts:
killed 1 dangling process
killed 1 dangling process
killed 1 dangling process
killed 1 dangling process
killed 1 dangling process
killed 1 dangling process
killed 1 dangling process
killed 1 dangling process
killed 1 dangling process
killed 1 dangling process
killed 1 dangling process
killed 1 dangling process
killed 1 dangling process
{"closed":["panename01","panekey001","paneid0001"],"results":[{"target":"panename01","handle":"pane-name","outcome":"done","error":null},{"target":"panekey001","handle":"pane-key","outcome":"done","error":null},{"target":"paneid0001","handle":"pane-id","outcome":"done","error":null}],"requested":3,"ok":3,"stream":false}
(fail) close always works > closes a foreign-space target by name, key, or pane id [10677.10ms]
  ^ this test timed out after 5000ms.
{"closed":["survives01"],"results":[{"target":"survives01","handle":"pane-survives","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
143 |     };
144 |     Object.defineProperty(process, "exit", { value: replacementExit });
145 |     try {
146 |       withExitCode(() => {
147 |         withRegisteredBackend(backend, () => { cmdClose([key, "--json"]); });
148 |         expect(process.exitCode).toBe(1);
                                       ^
error: expect(received).toBe(expected)

Expected: 1
Received: 0

      at <anonymous> (/home/bryan/orch/packages/orch/integration/close-always.test.ts:148:34)
      at withExitCode (/home/bryan/orch/packages/orch/test/helpers/exit-code.ts:5:12)
      at <anonymous> (/home/bryan/orch/packages/orch/integration/close-always.test.ts:146:7)
(fail) close always works > a successful backend close retains a pane that is still listed [3590.14ms]
Could not close signalfai1: cannot signal process 10465: orch is running in it
{"closed":[],"results":[{"target":"signalfai1","handle":"pane-signal-failed","outcome":"error","error":"cannot signal process 10465: orch is running in it"}],"requested":1,"ok":0,"stream":false}
(pass) close always works > a failed signal retains the registry and presence and reports failure [3569.02ms]
{"closed":["presence01"],"results":[{"target":"presence01","handle":"pane-presence-only","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) close always works > presence pid without a recorded process closes the pane without signalling and ends the row [4078.66ms]
{"closed":["owned00001"],"results":[{"target":"owned00001","handle":"pane-owned","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) close always works > close ignores owner and spawnedBy gates [3691.45ms]
{"outcome":"answer","reason":"no-environment-role","text":"this pane environment does not provide abort"}
(pass) close always works > abort ignores owner gate [3570.55ms]
killed 1 dangling process
killed 1 dangling process
killed 1 dangling process
killed 1 dangling process
killed 1 dangling process
{"closed":["duplicate1"],"results":[{"target":"duplicate1","handle":"pane-duplicate","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(fail) close always works > duplicate close targets count once [7166.00ms]
  ^ this test timed out after 5000ms.
(pass) close always works > dead pane-less close is a successful no-op that ends the row and leaves presence to reap [4176.44ms]
(pass) close always works > steer remains blocked by the space wall [61.88ms]

packages/orch/integration/identity-launch.test.ts:
(pass) launchCredential > returns null when the launch environment is unset [0.67ms]
(pass) launchCredential > returns a minted id [0.33ms]
(pass) launchCredential > malformed value exits 1 and logs launch.invalid-key [25.66ms]

packages/orch/integration/settings-command.test.ts:
(pass) orch settings > every registered setting is reachable through --json [184.39ms]
(pass) orch settings > every registered setting is printed in the table [163.68ms]
(pass) orch settings > --json reports value + source per setting, settings.json winning over defaults [158.73ms]
(pass) orch settings > --json reports env as the winning source over settings.json [165.69ms]
(pass) orch settings > --harness switches defaults.adapter between enabled ids and rejects a non-enabled id [478.73ms]
(pass) orch settings > reports each harness's picker quicklist and launch gate as separate rows [262.45ms]
(pass) orch settings > a load error surfaces loudly with no partial table [216.01ms]
(pass) orch settings > sets a boolean through its registry entry [232.52ms]
(pass) orch settings > sets an integer through its registry entry [246.36ms]
fleet.max_depth = 6
(pass) orch settings > single-setting set delegates to the registry writer [4.21ms]
(pass) orch settings > sets a choice through its registry entry [166.83ms]
(pass) orch settings > sets a multi value through its registry entry [172.75ms]
(pass) orch settings > sets a list value through its registry entry [160.61ms]
(pass) orch settings > refuses an invalid boolean and names the allowed values [176.70ms]
(pass) orch settings > refuses an invalid integer and names the allowed range [164.26ms]
(pass) orch settings > refuses an invalid choice and names the allowed choices [173.92ms]
(pass) orch settings > refuses an invalid multi value and names the allowed choices [169.02ms]
(pass) orch settings > refuses an invalid list and names JSON as the allowed format [175.29ms]
(pass) orch settings > refuses an unknown key and suggests nearest valid keys [163.51ms]
(pass) orch settings > refuses read-only runtime and names the editing subcommand [137.76ms]

packages/orch/doctor/doctor-checks.test.ts:
(pass) doctor provenance-depth checks > finds a live agent deeper than fleet.max_depth [60.34ms]
(pass) doctor provenance-depth checks > accepts a live agent at fleet.max_depth [48.47ms]
(pass) doctor unclaimed-agent checks > finds an old unclaimed live agent with its age [42.35ms]
(pass) doctor unclaimed-agent checks > ignores a claimed agent [58.73ms]
(pass) doctor unclaimed-agent checks > ignores a fresh unclaimed agent under the threshold [41.06ms]
(pass) doctor notification-sink checks > reports no sinks as healthy [0.78ms]
(pass) doctor notification-sink checks > rejects a webhook with a malformed URL [2.32ms]
(pass) doctor notification-sink checks > uses the notify-send prerequisite install command in desktop remediation [1.24ms]
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [1.15ms]
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [0.56ms]
(pass) doctor notification-sink checks > warns when a notifier omits done from its on list [0.60ms]
(pass) doctor notification-sink checks > does not warn when a notifier includes done in its on list [0.41ms]
(pass) doctor notification-sink checks > keeps unavailable notifier failures when done is omitted [0.39ms]

packages/orch/doctor/doctor-settings-defects.test.ts:
(pass) doctor settings defects > accepts an absent settings file [0.76ms]
(pass) doctor settings defects > accepts a clean settings file and keeps its path detail [0.77ms]
(pass) doctor settings defects > reports malformed JSON as a file defect [0.58ms]
(pass) doctor settings defects > reports a read failure instead of throwing [0.45ms]
(pass) doctor settings defects > reports a stale key with the value that was written [3.46ms]
(pass) doctor settings defects > reports a typo with its suggested key [1.13ms]
(pass) doctor settings defects > reports the expected schema version [0.71ms]
(pass) doctor settings defects > skips settings-dependent checks with a short repair hint [46.13ms]

packages/orch/doctor/doctor-declared-vs-reality.test.ts:
(pass) doctor declared-vs-reality > describes composed and absent backend roles [0.44ms]
75 | }
76 | 
77 | function tuningFindings(orchDir: string, dependencies: DeclaredVsRealityDependencies): string[] {
78 |   return liveAgentViews(orchDir).flatMap((agent) => {
79 |     const tuning = currentTuning(orchDir, agent.id);
80 |     const status = dependencies.readPresenceStatus(join(presenceAgentDir(agent.id, orchDir), STATUS_FILE));
                                     ^
TypeError: dependencies.readPresenceStatus is not a function. (In 'dependencies.readPresenceStatus(join(presenceAgentDir(agent.id, orchDir), STATUS_FILE))', 'dependencies.readPresenceStatus' is undefined)
      at <anonymous> (/home/bryan/orch/packages/orch/src/doctor/declared-vs-reality.ts:80:33)
      at checkDeclaredVsReality (/home/bryan/orch/packages/orch/src/doctor/declared-vs-reality.ts:94:154)
      at <anonymous> (/home/bryan/orch/packages/orch/doctor/doctor-declared-vs-reality.test.ts:57:20)
(fail) doctor declared-vs-reality > reports a lease whose recorded holder process is dead [39.91ms]
75 | }
76 | 
77 | function tuningFindings(orchDir: string, dependencies: DeclaredVsRealityDependencies): string[] {
78 |   return liveAgentViews(orchDir).flatMap((agent) => {
79 |     const tuning = currentTuning(orchDir, agent.id);
80 |     const status = dependencies.readPresenceStatus(join(presenceAgentDir(agent.id, orchDir), STATUS_FILE));
                                     ^
TypeError: dependencies.readPresenceStatus is not a function. (In 'dependencies.readPresenceStatus(join(presenceAgentDir(agent.id, orchDir), STATUS_FILE))', 'dependencies.readPresenceStatus' is undefined)
      at <anonymous> (/home/bryan/orch/packages/orch/src/doctor/declared-vs-reality.ts:80:33)
      at checkDeclaredVsReality (/home/bryan/orch/packages/orch/src/doctor/declared-vs-reality.ts:94:154)
      at <anonymous> (/home/bryan/orch/packages/orch/doctor/doctor-declared-vs-reality.test.ts:72:20)
(fail) doctor declared-vs-reality > reports an environment handle missing from its plexer [40.21ms]
75 | }
76 | 
77 | function tuningFindings(orchDir: string, dependencies: DeclaredVsRealityDependencies): string[] {
78 |   return liveAgentViews(orchDir).flatMap((agent) => {
79 |     const tuning = currentTuning(orchDir, agent.id);
80 |     const status = dependencies.readPresenceStatus(join(presenceAgentDir(agent.id, orchDir), STATUS_FILE));
                                     ^
TypeError: dependencies.readPresenceStatus is not a function. (In 'dependencies.readPresenceStatus(join(presenceAgentDir(agent.id, orchDir), STATUS_FILE))', 'dependencies.readPresenceStatus' is undefined)
      at <anonymous> (/home/bryan/orch/packages/orch/src/doctor/declared-vs-reality.ts:80:33)
      at checkDeclaredVsReality (/home/bryan/orch/packages/orch/src/doctor/declared-vs-reality.ts:94:154)
      at <anonymous> (/home/bryan/orch/packages/orch/doctor/doctor-declared-vs-reality.test.ts:91:20)
(fail) doctor declared-vs-reality > reports a live agent with no lease and no live spawner [40.13ms]
(pass) doctor declared-vs-reality > surfaces a missing task scope row as unrunnable [68.53ms]
(pass) doctor declared-vs-reality > doctor -y does not delete an unrunnable task [106.13ms]

packages/orch/doctor/doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [144.63ms]
(pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [67.23ms]
65 | 
66 |   test("no dead agents leaves nothing to remove", async () => {
67 |     const directory = tempDir();
68 |     writeDeadAgent(directory, LIVE_KEY, { schema: PRESENCE_SCHEMA, pid: process.pid, label: "alive", agent: "pi", cwd: "/x/orch" });
69 |     const result = staleResult(await runDoctor(directory));
70 |     expect(result.status).toBe("ok");
                               ^
error: expect(received).toBe(expected)

Expected: "ok"
Received: "warn"

      at <anonymous> (/home/bryan/orch/packages/orch/doctor/doctor-stale-presence.test.ts:70:27)
(fail) doctor stale presence safety > no dead agents leaves nothing to remove [80.15ms]

packages/orch/doctor/doctor-settings-preservation.test.ts:
(pass) doctor settings preservation > yes mode leaves existing settings.json byte-identical [30.67ms]

packages/orch/doctor/doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [0.11ms]
(pass) runDoctor > runs on an unconfigured install without failing for want of settings.json [23.31ms]
(pass) runDoctor > checks a healthy store [51.47ms]
(pass) runDoctor > warns when the store is absent [0.32ms]
(pass) runDoctor > fails when the store predates orch's migrations [28.12ms]
(pass) runDoctor > fails and names a missing store table [27.89ms]
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [22.93ms]
(pass) runDoctor > reports an absent daemon as optional [32.00ms]
(pass) runDoctor > reports and fixes a stale daemon lock [21.81ms]
(pass) runDoctor > accepts a live daemon and an answerable socket [67.61ms]
(pass) runDoctor > warns when the live daemon code hash is stale [26.47ms]
(pass) runDoctor > fails on an invalid lock and an unanswerable live socket [43.25ms]
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [31.70ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [23.24ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [22.93ms]
(pass) runDoctor > reports a dead presence pid [59.73ms]
(pass) runDoctor > bins check is driven by the enabled set and offers no fix [21.97ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [0.41ms]
(pass) runDoctor > validates configured notifier adapters [1154.27ms]
(pass) runDoctor > reports invalid settings and accepts missing settings [78.24ms]
(pass) runDoctor > never throws when individual checks encounter broken inputs [64.27ms]

packages/orch/doctor/doctor-orphan-daemons.test.ts:
(pass) doctor orphaned-daemon check > a live foreign lock is reported, and an unproven owner is never killable [26.67ms]
(pass) doctor orphaned-daemon check > a dead pid's lock is not an orphan [31.67ms]
(pass) doctor orphaned-daemon check > the caller's own orch dir is never reported against itself [29.92ms]

packages/orch/test/tiling.test.ts:
(pass) planTilePlacement > a lone pane anchors the split to the only pane [0.12ms]
(pass) planTilePlacement > first_split rules the opening split, however the screen is shaped [0.11ms]
(pass) planTilePlacement > first_split longest-edge leaves the opening split to the tab's own shape [0.08ms]
(pass) planTilePlacement > a tab with no geometry to read still opens the way first_split says [0.07ms]
(pass) planTilePlacement > past the first split, the biggest pane halves its longer side whatever first_split says [0.13ms]
(pass) planTilePlacement > the biggest pane is the target, whatever the caller's own pane is [0.06ms]
(pass) planTilePlacement > equal panes resolve top-left first, so enumeration order cannot decide [0.06ms]
(pass) planTilePlacement > four agents land in a 2x2 grid, not four columns [0.37ms]
(pass) planTilePlacement > four agents on an ultrawide screen still land in a 2x2 grid [0.19ms]
(pass) planTilePlacement > first_split rows stacks the second agent, columns seats it alongside [0.07ms]
(pass) planTilePlacement > longest-edge on an ultrawide screen is the four-thin-columns layout first_split exists to avoid [0.07ms]
(pass) planTilePlacement > the same pane count yields the same grid whatever pane order the plexer reports [1.16ms]

packages/orch/test/hello-environment.test.ts:
(pass) hello records the environment in full > the plexer the caller registered in is on the agent, not only on the host [55.45ms]
(pass) hello records the environment in full > the place the caller occupies in its plexer is recorded at hello [57.05ms]
(pass) hello records the environment in full > a session that moved to another place re-registers with the new one, and one row stays open [58.81ms]
(pass) hello records the environment in full > the space the caller registered in is recorded at hello, not inferred later [46.24ms]
(pass) hello records the environment in full > a session in no space and no plexer records neither, and that is an answer [43.97ms]
(pass) hello records the environment in full > re-registering the same session does not re-root or re-place it [53.89ms]
(pass) hello records the environment in full > the claim carries every environment fact hello has to record [47.19ms]

packages/orch/test/orchd-rpc-reconnect.test.ts:
(pass) RPC JSON framing > rejects malformed object that only has an id [0.06ms]
(pass) RPC JSON framing > parses split and multiple newline-delimited frames [11.96ms]
(pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [346.72ms]
(pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1055.15ms]

packages/orch/test/commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.14ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [0.31ms]
Selection recorded in /tmp/orch-setup-characterization-p770ku/settings.json:
  runtime           = node
  adapters          = pi
  default adapter   = pi
  backends          = headless
  default backend   = headless
  model (pi)          = (none)  picker: none, allowed: all offered
Prerequisites:
  MISSING pi
  ok      headless
  install bun: curl -fsSL https://bun.sh/install | bash
  install pi: bun add -g @earendil-works/pi-coding-agent
Presence dir:
  /tmp/orch-setup-characterization-p770ku/agents
Skills:
  not installed - turn it back on with: orch settings skills --install
bins:
  /tmp/orch-setup-home-ecJ2Lw/.local/bin/orch -> /home/bryan/orch/packages/orch/dist/bin/orch.js
  /tmp/orch-setup-home-ecJ2Lw/.local/bin/pif -> /home/bryan/orch/packages/orch/bin/pif
  /tmp/orch-setup-home-ecJ2Lw/.local/bin/orch-ding -> /home/bryan/orch/packages/orch/dist/bin/orch-ding.js
  SKIP pi extensions: pi integration shim disabled
Running doctor checks...
Doctor: 31/35 checks passed
Done. Open a plexer workspace and try: orch spawn 2 --tab Team1
(pass) commands/setup > runs non-interactive setup against the requested ORCH_DIR and records the selected composition [64.87ms]
(pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.16ms]

packages/orch/test/store-identity.test.ts:
(pass) hello agent identity rows > reuses the live agent for the same session process and mints for another [52.65ms]
(pass) hello agent identity rows > first sight creates a named root agent and open process row [38.51ms]

packages/orch/test/port-no-optional-methods.test.ts:
(pass) the environment port declares capability by composition, never by optionality > src/types/backend.ts has no optional methods on any port interface [4.83ms]
(pass) the environment port declares capability by composition, never by optionality > the deleted capability flags bag is gone, not merely unimplemented [0.15ms]
(pass) the environment port declares capability by composition, never by optionality > src/types/adapter.ts has no optional methods on the harness port either [0.38ms]

packages/orch/test/notify-router.test.ts:
(pass) notify router > delivers only when on includes the event state [0.36ms]
(pass) notify router > passes typed webhook and command configuration [0.18ms]
(pass) notify router > surfaces notifier errors [0.19ms]

packages/orch/test/status-perf.test.ts:
(pass) status performance seams > resolves bundle hashes once per status call [3541.50ms]
(pass) status performance seams > resolves orchestrator id once per status call [3536.90ms]

packages/orch/test/nested-spawn-unleased.test.ts:
(pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the middle agent's death leaves the grandchild unleased, held by nobody [44.39ms]
(pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the grandchild stays alive and adoptable, and keeps its own provenance [43.09ms]
(pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the grandparent holding the middle agent does not extend to the grandchild [41.90ms]

packages/orch/test/log-level.test.ts:
(pass) the configured log level reaches every logger > the env var wins over settings.json [0.66ms]
(pass) the configured log level reaches every logger > settings.json is used when the env var is unset [0.87ms]
(pass) the configured log level reaches every logger > an unrecognised env value falls back to the configured level [0.54ms]
(pass) the configured log level reaches every logger > the CLI logger honours the configured level [0.73ms]
(pass) the configured log level reaches every logger > the CLI logger drops records below the configured level [0.54ms]
(pass) the configured log level reaches every logger > the daemon logger resolves through the same helper [0.54ms]

packages/orch/test/daemon-rpc.test.ts:
(pass) daemon RPC > rejects a hello response with a malformed optional field [0.13ms]
(pass) daemon RPC > hello translates an absent daemon instead of reading a missing token [5032.32ms]
199 |       // an absence is an answer to a human, never a failure path.
200 |       // Claude composes no inbox steering and headless has no pane, so the dispatch
201 |       // is ANSWERED — and the outbox acks it rather than leaving a phantom pending
202 |       // row the daemon would retry forever.
203 |       await rpcCall(dir, "dispatch", { target, text: "cannot be reached" });
204 |       expect(selectPendingOutbox(dir, Number.MAX_SAFE_INTEGER)).toHaveLength(0);
                                                                      ^
error: expect(received).toHaveLength(expected)

Expected length: 0
Received length: 1

      at <anonymous> (/home/bryan/orch/packages/orch/test/daemon-rpc.test.ts:204:65)
(fail) daemon RPC > an unreachable agent yields a boundary answer, and the outbox is not left pending [1054.42ms]
(pass) daemon RPC > round-trips a call over the real unix socket [12.81ms]
(pass) daemon RPC > issues one session identity to sequential invocations from one session [320.51ms]
(pass) daemon RPC > hello returns live agents whose newest lease is closed or absent [170.34ms]
(pass) daemon RPC > hello returns an empty unleased list when none exist [107.03ms]
(pass) daemon RPC > a TCP hello with the daemon token gets an identity [302.01ms]
(pass) daemon RPC > refuses a hello that reports no session pid [34.43ms]
(pass) daemon RPC > refuses a hello without its environment [12.87ms]
(pass) daemon RPC > same session pid keeps its id and a different session pid gets another [152.78ms]
(pass) daemon RPC > refuses a TCP hello without a token [4.62ms]
(pass) daemon RPC > refuses a TCP hello with a wrong token [5.97ms]
(pass) daemon RPC > writes the daemon token with owner-only permissions [3.55ms]
(pass) daemon RPC > returns an error for an unknown method [4.58ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [13.94ms]
(pass) daemon RPC > delivers pushed subscription events [92.41ms]
(pass) daemon RPC > replays durable events after a daemon restart without a gap [452.09ms]
(pass) daemon RPC > reports the oldest sequence when replay starts before the pruned window [220.10ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [68.03ms]
(pass) daemon RPC > has a catchable absent-daemon error [0.66ms]
(pass) daemon RPC > calls a slow daemon unreachable, not absent [111.65ms]
(pass) daemon RPC > calls a refused endpoint absent so a wedged daemon is still reclaimable [2.25ms]
killed 1 dangling process
(fail) daemon RPC > dispatch waits for and reports a bridge acknowledgement [30013.26ms]
  ^ this test timed out after 30000ms.
(pass) daemon RPC > dispatch reports unavailable while a live agent has no bridge [282.36ms]
killed 1 dangling process
(fail) daemon RPC > attach reports open rows and re-pushes them [30006.23ms]
  ^ this test timed out after 30000ms.

packages/orch/test/cross-pack-result-delivery.test.ts:
(pass) results go to the enqueuer as mail > a result is an outbox row for the enqueuer, not the runner [51.51ms]
(pass) results go to the enqueuer as mail > a failed task reports its error in the mail body [52.23ms]
(pass) results go to the enqueuer as mail > a cross-wall enqueuer gets no row and the task stays settled [48.95ms]
(pass) acceptMail > refuses a message across the space wall by its reason [45.06ms]
(pass) acceptMail > requires non-empty from, target, and text [45.65ms]
(pass) acceptMail > queues a BridgeMessage steer payload [51.45ms]

packages/orch/test/rename-syncs-the-pane-border.test.ts:
(pass) orch rename syncs the pane border in one command (U5) > one rename sets orch's name AND the plexer chrome [3584.60ms]
(pass) orch rename syncs the pane border in one command (U5) > the response states the two outcomes SEPARATELY [3575.56ms]
(pass) orch rename syncs the pane border in one command (U5) > a plexer that refuses the chrome never unwrites orch's own name [3577.62ms]
(pass) orch rename syncs the pane border in one command (U5) > --pane still gives the border something DIFFERENT, and leaves the name alone [3572.17ms]

packages/orch/test/store-instants.test.ts:
(pass) epoch-millisecond store instants > a lease records its holding as an integer instant [43.83ms]
(pass) epoch-millisecond store instants > agents order numerically by their creation instant, never lexically [31.18ms]
(pass) epoch-millisecond store instants > all time-named columns use integer declarations [0.63ms]

packages/orch/test/provenance.test.ts:
(pass) the one provenance walk > ancestors are parent-first, root last [0.07ms]
(pass) the one provenance walk > depth counts hops to the root [0.04ms]
(pass) the one provenance walk > an unknown id is its own root at depth 0 [0.01ms]
(pass) the one provenance walk > an unknown parent ends the chain instead of throwing [0.03ms]
(pass) the one provenance walk > descendant is any depth, never self, never a sibling tree [0.06ms]
(pass) the one provenance walk > a cycle terminates [0.03ms]

packages/orch/test/daemon-rpc-identity.test.ts:
(pass) daemon identity RPCs > claim-identity stamps a minted id [453.47ms]
(pass) daemon identity RPCs > claim-identity refuses an unknown id by naming it [196.18ms]
(pass) daemon identity RPCs > register-session mints one id per session token [85.41ms]
(pass) daemon identity RPCs > the removed method is unknown [4.60ms]

packages/orch/test/transcript.test.ts:
(pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [0.24ms]
(pass) lastAssistantFromJsonl > undefined for blank or empty input [0.05ms]
(pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.08ms]
(pass) assistantText > reads role-tagged records [0.05ms]
(pass) assistantText > reads the {type:'assistant'} envelope with a nested message [0.03ms]
(pass) assistantText > undefined for non-assistant roles [0.03ms]
(pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.06ms]
(pass) contentText empty-string part handling > an all-empty content array yields undefined [0.04ms]
(pass) contentText empty-string part handling > a bare empty string yields undefined [0.02ms]

packages/orch/test/setup-io.test.ts:
(pass) setup prompt answer validation > refuses a single answer that was not offered [0.25ms]
(pass) setup prompt answer validation > refuses multi-select answers containing an unoffered value [1.45ms]

packages/orch/test/close-is-keyed-by-agent-id.test.ts:
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > an agent whose pane is gone is never handed to the plexer as a pane [58.73ms]
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > an agent whose pane is gone still ends, and reports done [57.47ms]
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > what a human is told they closed is the agent, not the plexer's coordinate [53.77ms]
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > the --json closed list names agents, so a caller can map it back [60.50ms]
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > the plexer is still handed the real handle when there IS a pane [52.67ms]

packages/orch/test/daemon-renags-questions.test.ts:
(pass) question re-ask policy > nothing due emits nothing [0.20ms]
(pass) question re-ask policy > an overdue question emits its first re-ask [0.06ms]
(pass) question re-ask policy > an emitted re-ask waits for the interval before emitting again [0.04ms]
(pass) question re-ask policy > a settled question emits no further re-asks [0.10ms]
(pass) question re-ask policy > the limit emits one final gave-up event and then stays silent [0.06ms]

packages/orch/test/caller-kind.test.ts:
(pass) caller kind > id + recorded token is agent [51.40ms]
(pass) caller kind > a harness marker is a session even when its token differs [44.00ms]
(pass) caller kind > a harness marker is a session without a launch credential [36.71ms]
(pass) caller kind > no harness marker is the operator [0.35ms]
(pass) caller kind > an unregistered session asks the daemon registration seam [0.62ms]
(pass) caller kind > override flags are allowed only for the operator [0.26ms]
(pass) caller kind > override flags refuse a driving session [39.20ms]
(pass) caller kind > override flags refuse a spawned agent [41.57ms]

packages/orch/test/status-filter-columns.test.ts:
(pass) orch status --filter on columns > drops the named columns from the default table [1.21ms]
(pass) orch status --filter on columns > a filtered owner column leaves no shared-owner footer [0.21ms]
(pass) orch status --filter on columns > drops the named columns from the human table [0.11ms]
(pass) orch status --filter on columns > drops the same facts from a JSON row [0.72ms]

packages/orch/test/daemon-events.test.ts:
(pass) daemon presence events > closes every watcher when watched agent directories disappear [28.91ms]
(pass) daemon presence events > an RPC subscriber receives a presence transition [46.08ms]
(pass) daemon presence events > a dispatched transition writes the full run row and preserves untruncated result [53.25ms]
(pass) daemon presence events > repeated transitions upsert one run and only terminal states set finishedAt [58.88ms]
(pass) daemon presence events > a status without a dispatch id does not write history [48.88ms]
(pass) daemon presence events > a throwing history write does not stop event delivery [62.00ms]
(pass) daemon presence events > emitted events carry the pack capacity at publish time [49.21ms]
(pass) daemon presence events > a flapping status file cannot storm the stream with repeat transitions [0.24ms]
(pass) daemon presence events > a genuine repeat of the same transition for new work still publishes [0.09ms]
(pass) daemon presence events > a repeat transition publishes again once the suppression window passes [0.06ms]
(pass) daemon presence events > repeated observations cannot slide the suppression window forever [0.04ms]
(pass) daemon presence events > a working-to-done repeat after the dedupe window is emitted [0.07ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [38.13ms]
(pass) daemon presence events > presence transitions use the normalized agent name after rename [38.95ms]
(pass) daemon presence events > derivePresenceTransition preserves the complete asking transition payload [39.22ms]
(pass) daemon presence events > an asking transition drives command sink delivery [54.60ms]

packages/orch/test/skill-store-and-links.test.ts:
(pass) skill store and harness links > writes real files to the store and links each harness dir into it [4.81ms]
(pass) skill store and harness links > replaces a real directory left in a harness dir with a link into the store [0.87ms]
(pass) skill store and harness links > doctor reports a harness dir holding a real directory instead of a link [1.49ms]
(pass) skill store and harness links > doctor passes once every harness dir links into the store [8.23ms]
(pass) skill store and harness links > doctor skips when the user turned the skill install off [0.62ms]

packages/orch/test/backend-process-role.test.ts:
(pass) ProcessRole > headless provider records pid and start token and safely kills it [26.48ms]
(pass) ProcessRole > herdr provider records pid and start token and safely kills it [0.77ms]
(pass) ProcessRole > tmux provider records pid and start token and safely kills it [25.73ms]
(pass) ProcessRole > reports replaced when a pid is reused by a different process token [0.34ms]
(pass) ProcessRole > running returns the process identity for a resolved handle [0.06ms]
(pass) ProcessRole > running throws when the environment reports no process [0.06ms]
(pass) ProcessRole > running records a null token when the OS cannot provide one [0.03ms]
(pass) ProcessRole > the default signal refuses orch's own process and its parent [0.05ms]
(pass) ProcessRole > kill signals a live record that carries no start token [0.06ms]

packages/orch/test/status-unleased.test.ts:
(pass) status owner rendering > leased by a live holder shows that holder [52.03ms]
(pass) status owner rendering > a dead holder is shown as unleased with the holder gone [45.34ms]
(pass) status owner rendering > an agent never leased shows no orch driving it [40.70ms]

packages/orch/test/commands-panes.test.ts:
(pass) commands/panes > pane identity is the minted id alone [0.05ms]
(pass) commands/panes > a plexer-and-space key is not an identity [0.02ms]
(pass) commands/panes > exports the pane listing command directly [0.08ms]

packages/orch/test/store-runs.test.ts:
(pass) run rows > round-trips every field, including a structured result [26.97ms]
(pass) run rows > upsert updates a row while preserving its original start time [28.27ms]
(pass) run rows > orders by started time, filters by agent, and honours limit [34.44ms]
(pass) run rows > omits absent optional fields instead of returning null [26.04ms]
(pass) run rows > deletes only rows older than the cutoff and returns the count [32.18ms]
(pass) run rows > stays readable after the agent presence directory is deleted [39.18ms]

packages/orch/test/doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env node as node [0.51ms]
(pass) shebangRuntime > reads #!/usr/bin/env bun as bun [0.27ms]
(pass) shebangRuntime > reads #!/usr/bin/env deno as deno [0.21ms]
(pass) shebangRuntime > reads #!/usr/local/bin/node as node [0.22ms]
(pass) shebangRuntime > does not mistake a longer binary name for a runtime [0.23ms]
(pass) shebangRuntime > returns null for a file with no shebang [0.19ms]
(pass) shebangRuntime > returns null for an unreadable path [0.17ms]
(pass) runningRuntime > reports the runtime this suite is executing under [5.83ms]
(pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [1.03ms]
(pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [0.50ms]
(pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [0.22ms]
(pass) doctor runtime verdict table > launching under bun while declaring node is fine [0.28ms]
(pass) doctor runtime verdict table > launching under node while declaring bun is fine [0.18ms]
(pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [0.31ms]
(pass) doctor runtime verdict table > declared runtime absent from PATH fails [0.28ms]
(pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [0.24ms]
(pass) doctor runtime verdict table > remediation names both directions — rebuild, or re-record the declaration [0.66ms]
(pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [0.17ms]

packages/orch/test/herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [0.94ms]
(pass) herdr and notification hardening > falls back to a valid name when the identity key contains herdr-invalid separators [0.15ms]
(pass) herdr and notification hardening > nameless notifications use a space label, never a bare pane key [0.14ms]

packages/orch/test/settings-editor.test.ts:
(pass) settings editor reducer > moves focus down and up without running off either end [0.25ms]
(pass) settings editor reducer > opens the focused setting for editing [0.05ms]
(pass) settings editor reducer > cancel leaves value unchanged and returns to browsing [0.20ms]
(pass) settings editor reducer > commit updates value and produces a pending write [0.18ms]
(pass) settings editor reducer > refuses invalid values with a reason and stays open [0.07ms]
(pass) settings editor reducer > refuses opening a read-only setting with a reason [0.05ms]
(pass) settings editor reducer > cancelling without a commit yields zero writes [0.04ms]

packages/orch/test/environment-dictates-what-is-possible.test.ts:
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > a MOVE is a new environment record, and what is possible follows it at once [35.53ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > a move closes the interval it left, so history says WHERE it was and WHEN [38.58ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > moving one axis leaves every other axis exactly where it was [39.96ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > an UPGRADE is a NEW host_plexers row, not an overwrite of the old one [39.36ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > re-declaring the SAME version is not an upgrade and opens no second row [33.86ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > nothing anywhere records what an agent CAN do [19.31ms]

packages/orch/test/daemon-status-lease.test.ts:
(pass) daemon status lease payload > reports the current holder and its liveness [41.56ms]
(pass) daemon status lease payload > distinguishes a known unleased agent from an unknown key [32.23ms]

packages/orch/test/lifecycle-targets.test.ts:
(pass) lifecycle target resolution > prefers one live agent over dead ones sharing its name [0.19ms]
(pass) lifecycle target resolution > reports the target and disambiguating ids for live ambiguity [0.19ms]
(pass) lifecycle target resolution > cleanup can still resolve a dead agent when no live match exists [0.05ms]
(pass) lifecycle target resolution > an agent is addressable by its id, its name, or its pane handle [0.05ms]
(pass) lifecycle target resolution > the pane is environment: moving it leaves every other address intact [0.03ms]

packages/orch/test/parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [0.04ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.03ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.05ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.03ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.04ms]

packages/orch/test/setup-smoke.test.ts:
(pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [0.43ms]
(pass) runSetupSmoke (12.5) > the agent is launched on the prompt it built [0.10ms]
(pass) runSetupSmoke (12.5) > an agent that launches but yields no result times out and fails non-zero [0.38ms]
(pass) runSetupSmoke (12.5) > a rejected spawn fails loudly and never polls for a result [0.22ms]

packages/orch/test/capacity.test.ts:
(pass) fleet capacity > one pack per root, each against the per-pack cap; roots never sum into one pack [0.24ms]
(pass) fleet capacity > a selected root scopes the packs to that one pack [0.11ms]
(pass) fleet capacity > reports configured per-space caps [0.08ms]
(pass) fleet capacity > uses null for an unlimited total [0.06ms]
(pass) fleet capacity > formats one pack per root, the caller's first, then space and machine capacity [0.15ms]

packages/orch/test/agent-key-is-minted-id.test.ts:
(pass) a driving session mints an id, it is not placed by name > the key an interactive session addresses itself by is a bare minted id [1.10ms]
(pass) a driving session mints an id, it is not placed by name > the presence directory is named by that id alone [0.38ms]
(pass) a driving session mints an id, it is not placed by name > a launch that handed over a minted id is used verbatim [0.28ms]
(pass) this process's own identity is the id and nothing else > a spawned agent answers with the id its launch handed it [0.14ms]
(pass) the fleet wall is lifted by the absence of a launch, not by a key's shape > an agent orch launched may not cross into another project's fleet [52.25ms]
(pass) who drives an agent is looked up by its id > the key IS the agent id — no segment is split out of it [39.65ms]
(pass) who drives an agent is looked up by its id > a composite key addresses no agent at all [48.66ms]
(pass) doctor reads a presence directory name as an id > a composite directory name is a malformed identity key [1.00ms]
(pass) doctor reads a presence directory name as an id > a minted id with a current stamp is well formed [25.87ms]

packages/orch/test/launch-model-gate.test.ts:
(pass) the model gate rules by harness membership, not by format > accepts a listed spec, with or without a thinking suffix [0.22ms]
(pass) the model gate rules by harness membership, not by format > refuses a ladder shorthand and names what the harness does offer [0.25ms]
(pass) the model gate rules by harness membership, not by format > accepts each harness's own vocabulary rather than one shared grammar [0.15ms]
(pass) the model gate rules by harness membership, not by format > cannot check a harness that publishes no catalogue, and does not pretend to [0.04ms]
(pass) the settings allowlist applies on top of harness membership > an empty allowlist restricts nothing beyond the harness list [0.58ms]
(pass) the settings allowlist applies on top of harness membership > a configured allowlist refuses a listed model outside its patterns [0.98ms]
(pass) the settings allowlist applies on top of harness membership > harness membership is checked before the allowlist, so the message names the harness [0.34ms]

packages/orch/test/status-live.test.ts:
(pass) live status renderer > renders a clear screen, timestamped header, and table body [5.22ms]
(pass) live status renderer > renders a refresh failure in the header area [0.16ms]
(pass) live status renderer > coalesces a burst into one pending follow-up refresh [0.26ms]
(pass) live status renderer > keeps the existing table renderer available [0.12ms]

packages/orch/test/queue-space-replay.test.ts:
(pass) queue replay keeps typed scope > stored scope offers pack work only to that pack [49.58ms]

packages/orch/test/agent-view.test.ts:
(pass) the agent composer > an agent with no environment rows has every axis absent, not defaulted [38.05ms]
(pass) the agent composer > each axis composes independently, and moving one leaves identity untouched [48.83ms]
(pass) the agent composer > tuning is not environment: it survives a move [39.71ms]
(pass) the agent composer > ownership reads as a live lease, and a released one is not ownership [45.33ms]
(pass) the agent composer > provenance is on the view and is not the same fact as ownership [37.83ms]
(pass) the agent composer > provenance carries the spawner's name, read as a join and never stored twice [40.52ms]
(pass) the agent composer > an agent with no spawner reports no spawner name [35.68ms]
(pass) the agent composer > agentViews is oldest-first and liveAgentViews drops ended agents [41.63ms]
(pass) the agent composer > the axis list is the only place every axis is enumerated [1.19ms]
(pass) the agent composer > the composed shape is exactly the axis list, with nothing extra and nothing missing [37.05ms]
(pass) the agent composer > an unknown agent is null, never an empty shell [31.75ms]

packages/orch/test/command-refusal.test.ts:
(pass) a command refusal is thrown, not exited > an unresolvable target throws a CommandRefusal instead of killing the process [3546.88ms]
(pass) a command refusal is thrown, not exited > the refusal carries the reason a human needs [3541.96ms]

packages/orch/test/herdr-notify-busy.test.ts:
(pass) a herdr notification is delivered only when herdr says it was shown > shown is a delivery [2.54ms]
(pass) a herdr notification is delivered only when herdr says it was shown > busy is NOT a delivery, however herdr exited [0.12ms]
(pass) a herdr notification is delivered only when herdr says it was shown > every other refusal herdr can answer with is also not a delivery [0.08ms]
(pass) a herdr notification is delivered only when herdr says it was shown > output that is not a herdr answer is never read as a delivery [0.08ms]
(pass) a busy herdr is waited out, not dropped > a toast shown on the first try is sent once and waits for nothing [0.17ms]
(pass) a busy herdr is waited out, not dropped > a busy herdr is retried after a wait, and the retry is the delivery [0.05ms]
(pass) a busy herdr is waited out, not dropped > a herdr that stays busy gives up rather than blocking the daemon forever [0.04ms]
(pass) a busy herdr is waited out, not dropped > a refusal that waiting cannot fix is not retried [0.03ms]

packages/orch/test/check-bridge.test.ts:
(pass) presence filenames stay limited to the live protocol > inbox.jsonl is no longer a presence-filename breach [0.40ms]
(pass) presence filenames stay limited to the live protocol > status.json remains a presence-filename breach [0.04ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.04ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.03ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / settings seams [0.03ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [0.23ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.06ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.02ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the shared harness model port outside the adapter dispatcher [0.01ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [0.18ms]
(pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > flags a runtime adapter importing bridge-bundles/build.ts [0.09ms]
(pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > allows scripts and the build-tool module itself [0.03ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [0.07ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.04ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.08ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke test holds no exemption: the branch was deleted, not blessed [0.07ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has no identity-branch line, exempted or otherwise [1.94ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > flags spawner key and spawnerIdentity key owner-token fallbacks [0.19ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > allows a benign line [0.03ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > passes the clean tree: reply addresses never use owner-token fallbacks [0.99ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags object literals that synthesize an identity [0.23ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags concatenated and template identity keys [0.20ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > allows a fresh spawn mint and the issuer modules [0.05ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > no file is exempt from the identity-construction rule [0.02ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > passes the clean tree: every identity construction is allowed or registered [1.25ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.12ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.02ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [0.45ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > a deleted capability bag or optional method is not exempt [0.59ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > the exempted names are the roles the ports actually declare [0.11ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > nullable data on the port is not exempted as a role [0.05ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > flags plexer and harness identity branches [0.04ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > flags method-presence capability checks [0.14ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > allows a branch inside a concrete backend [0.02ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > passes the clean tree: no file in ANY scanned scope branches on an environment id [29.50ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > the core-scope allowlist is EMPTY, so no line holds a standing exemption [0.08ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > allows capability-driven code [0.02ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags INSERT and UPDATE SQL that welds a lease holder into spawned_by [0.21ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags lease row types carrying a provenance field [0.06ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > allows separate lease and provenance rows [0.05ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > passes the clean tree: no source line crosses lease and provenance columns [12.09ms]
(pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a launch env read outside launch.ts with the file and constant named [0.21ms]
(pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > allows the launch env read inside identity/launch.ts [0.04ms]
(pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a bare launch env name literal outside launch.ts [0.04ms]
(pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a comment mentioning the launch env name outside launch.ts [0.03ms]
(pass) the closed plexer-id set is spelled in exactly one line > the definition line is allowed where it lives, and nowhere else [0.10ms]
(pass) the closed plexer-id set is spelled in exactly one line > any other quoted plexer id in that same file still fails [0.06ms]
(pass) the closed plexer-id set is spelled in exactly one line > the line src/types/backend.ts actually carries is the allowed one [0.52ms]
(pass) the closed plexer-id set is spelled in exactly one line > extensions get the same rule with their own scope named [0.02ms]

packages/orch/test/plexer-versions.test.ts:
(pass) plexer version support > a floor admits every version at or above it [0.16ms]
(pass) plexer version support > compares numeric versions rather than lexical strings [0.07ms]
(pass) plexer version support > rotates one open host install row when the plexer changes version [41.80ms]
(pass) plexer version support > doctor names both versions and tells the operator to update the plexer [0.20ms]
(pass) plexer version support > a supported plexer the user never installed is not a complaint [0.04ms]
(pass) plexer version support > an in-range install reports ok with the version it read [0.07ms]
(pass) plexer version support > a compatible server rides along on the row without complaint [0.13ms]
(pass) plexer version support > a server the installed client outgrew fails and names the restart [0.10ms]
(pass) plexer version support > a server that reports no compatibility is unknown, never a failure [0.09ms]
(pass) plexer version support > a plexer with no server running says nothing about one [0.07ms]
(pass) plexer version support > only an installed plexer that cannot report a version warns [0.06ms]

packages/orch/test/settings-defects.test.ts:
(pass) settingsDefects > returns no defects for an absent file [0.26ms]
(pass) settingsDefects > returns no defects for a valid settings file [0.68ms]
(pass) settingsDefects > reports unparsable JSON as one file defect [0.52ms]
(pass) settingsDefects > suggests a near-match for a stale key [0.91ms]
(pass) settingsDefects > does not guess a replacement for a removed key [0.58ms]
(pass) settingsDefects > reports the expected pinned schema value [0.39ms]
(pass) settingsDefects > reports a wrong value type on a real key [0.37ms]

packages/orch/test/store-rebuild-schema.test.ts:
39 | 
40 | describe("rebuild schema", () => {
41 |   test("rebuild DDL inventory is exact", () => {
42 |     const d = db();
43 |     const rows = d.all(sql`SELECT type,name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'`);
44 |     expect(new Set(rows.map((row) => `${stringField(row, "type")}:${stringField(row, "name")}`))).toEqual(expectedInventory);
                                                                                                       ^
error: expect(received).toEqual(expected)

  Set {
-   "table:outbox",
-   "table:control_outcomes",
-   "table:catalogues",
-   "table:events",
-   "table:runs",
-   "table:harnesses",
-   "table:plexers",
-   "table:hosts",
-   "table:host_plexers",
-   "table:spaces",
-   "table:agents",
-   "table:agent_worktrees",
+   "table:__drizzle_migrations",
    "table:agent_endings",
-   "table:agent_processes",
-   "table:agent_plexers",
    "table:agent_handles",
+   "table:agent_leases",
+   "table:agent_plexers",
+   "table:agent_processes",
    "table:agent_spaces",
    "table:agent_tunings",
-   "table:agent_leases",
-   "table:space_plexers",
-   "table:pack_plexers",
-   "table:tasks",
-   "table:task_cancellations",
-   "table:task_attempts",
-   "table:pack_intakes",
-   "table:grant_requests",
-   "table:grant_request_params",
+   "table:agent_worktrees",
+   "table:agents",
+   "table:catalogues",
+   "table:control_outcomes",
+   "table:events",
    "table:grant_approvals",
    "table:grant_denials",
+   "table:grant_request_params",
+   "table:grant_requests",
    "table:grant_spends",
-   "table:__drizzle_migrations",
-   "index:outbox_pending",
-   "index:control_outcomes_agent",
-   "index:runs_agent_started",
-   "index:one_install",
-   "index:one_live_process",
+   "table:harnesses",
+   "table:host_plexers",
+   "table:hosts",
+   "table:outbox",
+   "table:pack_intakes",
+   "table:pack_plexers",
+   "table:plexers",
+   "table:questions",
+   "table:runs",
+   "table:space_plexers",
+   "table:spaces",
+   "table:task_attempts",
+   "table:task_cancellations",
+   "table:tasks",
    "index:one_handle",
+   "index:one_lease",
+   "index:leases_by_orch",
+   "index:one_live_process",
    "index:one_space",
    "index:one_tuning",
-   "index:one_lease",
-   "index:one_space_home",
-   "index:one_pack_home",
+   "index:agents_by_pack",
+   "index:agents_by_spawner",
+   "index:one_agent_per_session",
+   "index:control_outcomes_agent",
+   "index:grants_by_action",
+   "index:one_install",
+   "index:outbox_pending",
    "index:one_intake",
+   "index:one_pack_home",
+   "index:questions_pending",
+   "index:runs_agent_started",
+   "index:one_space_home",
    "index:one_open_attempt",
-   "index:agents_by_pack",
-   "index:agents_by_spawner",
-   "index:leases_by_orch",
+   "index:attempts_running",
    "index:tasks_by_agent",
    "index:tasks_by_pack",
    "index:tasks_by_space",
    "index:tasks_by_enqueuer",
-   "index:attempts_running",
-   "index:grants_by_action",
-   "index:one_agent_per_session",
+   "view:grant_states",
    "view:task_states",
-   "view:grant_states",
  }

- Expected  - 39
+ Received  + 41

      at <anonymous> (/home/bryan/orch/packages/orch/test/store-rebuild-schema.test.ts:44:99)
(fail) rebuild schema > rebuild DDL inventory is exact [25.40ms]
(pass) rebuild schema > the store opens migrated, with foreign keys enabled [24.37ms]
(pass) rebuild schema > all ten partial unique indexes allow only one open row [531.08ms]
(pass) rebuild schema > enforces foreign keys and agent checks [39.83ms]
(pass) rebuild schema > requires exactly one task scope [34.55ms]
(pass) rebuild schema > allows one open attempt only [46.14ms]
(pass) rebuild schema > enforces lease checks and one lease [44.84ms]
(pass) rebuild schema > remaining documented CHECKs and cascades are enforced [56.22ms]
(pass) rebuild schema > task_states derives queued claimed and outcomes [53.06ms]

packages/orch/test/wall-single-owner.test.ts:
(pass) space wall ownership > keeps the wall decision primitive in one source module [6.82ms]

packages/orch/test/spawn-identity.test.ts:
(pass) one key per pane spawn (12.1) > identity is an opaque minted id — never the name, never the pane handle [54.62ms]
(pass) one key per pane spawn (12.1) > a name freed by a dead agent is reusable, and the two agents differ in identity [79.12ms]
(pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [64.04ms]
(pass) A1: spawn registration records the space as an environment axis > a spawn into a space writes agent_spaces, and the composer reads it back [50.83ms]
(pass) A1: spawn registration records the space as an environment axis > a spawn stating no space records NO ROW — a missing axis is a missing row [46.28ms]
(pass) A1: spawn registration records the space as an environment axis > moving an agent to another space closes the old interval and keeps its identity [61.62ms]

packages/orch/test/answer-dispatch.test.ts:
(pass) answer over the bridge > pushes the answer and its question id [59.61ms]
(pass) answer over the bridge > returns not-asking without pushing [56.20ms]
(pass) answer over the bridge > reports a detached bridge for a live asking agent [53.83ms]
(pass) answer over the bridge > reports a gone asking agent [31.46ms]
(pass) answer over the bridge > answers with a clear absence when the adapter takes no answers [46.67ms]

packages/orch/test/adapter-allowlist.test.ts:
(pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [0.39ms]
(pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.07ms]
(pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.05ms]
(pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.05ms]
(pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.10ms]
(pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.06ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.14ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.04ms]
(pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.06ms]

packages/orch/test/recipient-label.test.ts:
(pass) agent identity shown to an operator > names the agent and its harness, never the transport key [0.08ms]
(pass) agent identity shown to an operator > drops the routing prefix when nothing is known about it [0.03ms]
(pass) agent identity shown to an operator > a nameless agent gets a stable logical name, not its key [0.08ms]

packages/orch/test/build-bin.test.ts:
(pass) build entrypoint > always stamps a node shebang and executable mode [0.66ms]
(pass) the installed CLI is the packaged build, never live source (K2) > the `orch` bin points at the packaged entrypoint, not bin/orch.ts [0.06ms]
(pass) the installed CLI is the packaged build, never live source (K2) > the packaged entrypoint is built for node, from the source entrypoint [0.04ms]
(pass) the installed CLI is the packaged build, never live source (K2) > a global install cannot happen without a build in front of it [0.05ms]
(pass) the installed CLI is the packaged build, never live source (K2) > the package ships dist/, so what is installed is what was built [0.02ms]

packages/orch/test/tool-exec-retry.test.ts:
(pass) every command into a harness or plexer retries on timing, not on being wrong > a transient refusal is reattempted until it succeeds [4.02ms]
(pass) every command into a harness or plexer retries on timing, not on being wrong > a failure the caller calls permanent is thrown on the FIRST attempt, never retried [0.29ms]
(pass) every command into a harness or plexer retries on timing, not on being wrong > a tool that never recovers exhausts the budget and reports how many attempts it cost [7.73ms]
(pass) every command into a harness or plexer retries on timing, not on being wrong > the seam names no harness: the same policy drives a different binary [1.67ms]

packages/orch/test/daemon-idle.test.ts:
(pass) orchd idle shutdown rule > a zero setting disables idle shutdown entirely [0.10ms]
(pass) orchd idle shutdown rule > a live agent holds the daemon open however long it has been quiet [0.03ms]
(pass) orchd idle shutdown rule > an event subscriber holds the daemon open [0.02ms]
(pass) orchd idle shutdown rule > recent activity holds the daemon open below the threshold [0.02ms]
(pass) orchd idle shutdown rule > a fully idle daemon past the threshold is due to exit [0.03ms]

packages/orch/test/notify-ding.test.ts:
(pass) notify/ding > the sound sink is a declared sink that takes no configuration [0.23ms]
(pass) notify/ding > this host names the players it would use, and says how to get one [0.11ms]
(pass) notify/ding > a command string runs through the host's own shell; argv is passed through untouched [0.07ms]

packages/orch/test/commands-clean.test.ts:
(pass) commands/clean > the forced sweep reaps dead agent dirs but preserves live processes [61.66ms]
{"malformed":["herdr~wF~p9"],"closed":2,"removed":[],"worktrees":0}
(pass) commands/clean > bare clean keeps ended agents as history and closes their queued writes [58.96ms]
{"malformed":[],"closed":1,"removed":["deadagent1"],"worktrees":0}
(pass) commands/clean > --force reaps the ended agent and closes its queued writes [42.54ms]
(pass) worktree ownership reads the composed environment > a live agent's worktree is protected and a dead one's is not [41.46ms]
(pass) orch clean is destructive maintenance > a spawned agent is refused the sweep, and the dirs it does not own survive [40.77ms]

packages/orch/test/queue.test.ts:
(pass) queue facade on tasks and attempts > malformed task options are refused instead of handed back as TaskOptions [44.03ms]
(pass) queue facade on tasks and attempts > enqueue selects exactly one typed scope and defaults to the enqueuer pack [61.13ms]
(pass) queue facade on tasks and attempts > agent scope requires the enqueuer to lease the target [62.51ms]
(pass) queue facade on tasks and attempts > Cq1: the gate is on enqueuing into a scope, and adoption earns it [69.39ms]
(pass) queue facade on tasks and attempts > Cq1: a pack drains its queue with its orch dead and no lease in force [56.29ms]
(pass) queue facade on tasks and attempts > claiming excludes another pack and space claims require open intake [83.62ms]
(pass) queue facade on tasks and attempts > Cq3: a space-scoped task is an offer, and only an opted-in pack consumes it [76.67ms]
(pass) queue facade on tasks and attempts > a failed pack attempt retries on another member, never outside the pack [62.55ms]
(pass) queue facade on tasks and attempts > Cq5: an agent-scoped binding is to the agent and survives adoption [469.18ms]
(pass) queue facade on tasks and attempts > Cq13: adoption carries the queue — pack work comes with the agents [339.87ms]
(pass) queue facade on tasks and attempts > a claim is an insert and a lost race returns false [57.24ms]
(pass) queue facade on tasks and attempts > cancel rights are enqueuer, targeted agent's leasing orch, or human [70.50ms]
(pass) queue facade on tasks and attempts > Cq7: origin_workspace is gone from the tasks table, scope replaces it [52.05ms]
(pass) queue facade on tasks and attempts > state and attempt-derived values have no legacy flattened fields [53.09ms]

packages/orch/test/log-record.test.ts:
(pass) the one log record shape > writes one JSONL record per call, with an epoch-millis instant [3.15ms]
(pass) the one log record shape > a record below the configured level is not written at all [0.41ms]
(pass) the one log record shape > a correlation id rides every record of one dispatch, so one grep finds its whole life [0.32ms]
(pass) the one log record shape > agentId carries orch's minted id; a plexer handle is a field, never the identity [0.38ms]
(pass) the one log record shape > every level is orderable, lowest to highest [0.04ms]
(pass) the one log record shape > a malformed line is rejected by the guard rather than trusted [0.07ms]

packages/orch/test/one-bind-for-the-unix-endpoint.test.ts:
(pass) one bind for the unix endpoint (2.4) > the unix endpoint is claimed in exactly one place [0.08ms]
(pass) one bind for the unix endpoint (2.4) > reclaiming a stale socket yields the endpoint a first bind produces [6.93ms]

packages/orch/test/spawn-placement.test.ts:
orch is not running inside herdr and no backend was chosen - spawning headless. Pass --backend herdr or set defaults.backend to open a herdr home for these agents (the user grants it), or --space <id> to place them in an open space.
(pass) outside every plexer, spawn is headless unless the human chose one > a plexer orch only probed, from a plain terminal, spawns headless [33.80ms]
(pass) outside every plexer, spawn is headless unless the human chose one > a chosen plexer stays selected and its home is what the human grants [25.48ms]
orch is not running inside herdr and herdr cannot open a space of its own - spawning headless. Pass --backend herdr or set defaults.backend to open a herdr home for these agents (the user grants it), or --space <id> to place them in an open space.
(pass) outside every plexer, spawn is headless unless the human chose one > a chosen plexer that cannot open a home still falls back to headless [32.44ms]
(pass) outside every plexer, spawn is headless unless the human chose one > a caller recorded inside the plexer stays in it, chosen or not [26.74ms]
(pass) outside every plexer, spawn is headless unless the human chose one > a named space is placement enough: no chosen backend needed [27.85ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a named space is orch's own id, and the workspace is its RECORDED home [46.23ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > with no space, orch INSIDE the plexer spawns beside itself and opens nothing [31.61ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a caller INSIDE the plexer whose recorded place is gone resolves no coordinate, never another [35.33ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a caller INSIDE the plexer with NO orch identity (a human's pane) spawns beside itself [30.22ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > with no space and orch OUTSIDE the plexer, the PACK gets its own marked home [38.15ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > the same pack spawning again reuses its home and asks the human nothing [44.01ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > an environment that holds nothing answers with an absence, never a refusal [35.84ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a space with no home HERE places the fleet without borrowing another plexer's [47.33ms]

packages/orch/test/holder-death-costs-a-driver.test.ts:
(pass) holder death costs a driver, not a life (D2) > the task in flight finishes and its result survives the holder [53.59ms]
(pass) holder death costs a driver, not a life (D2) > the lease closes `expired` — not `released`, because no caller held it [48.21ms]
(pass) holder death costs a driver, not a life (D2) > the agent stays alive, unleased and adoptable — nothing closes it [50.22ms]
(pass) holder death costs a driver, not a life (D2) > it receives no new work: the death hands the agent to nobody [49.86ms]
(pass) holder death costs a driver, not a life (D2) > expiry is recorded once and does not erase who held it [44.91ms]
(pass) holder death costs a driver, not a life (D2) > clearing a dead holder's lease is never refused, and is idempotent [45.92ms]

packages/orch/test/hermetic-env.test.ts:
(pass) the test suite is hermetic > no plexer environment leaks in from the shell that launched bun [0.13ms]

packages/orch/test/a-row-is-not-a-pane.test.ts:
(pass) a row is not evidence that a pane exists (U1, U4) > a recorded handle the plexer does not list is reported as NO pane [3560.28ms]
(pass) a row is not evidence that a pane exists (U1, U4) > the agent itself is still there — losing a pane costs a shortcut, not a life [3563.77ms]
(pass) a row is not evidence that a pane exists (U1, U4) > a handle the plexer DOES list is kept [3563.88ms]

packages/orch/test/settings-repair-write.test.ts:
(pass) applySettingsRepairs > rename carries the value to the new key [7.48ms]
(pass) applySettingsRepairs > rename onto an occupied key throws and leaves the file untouched [0.75ms]
(pass) applySettingsRepairs > set writes a value at a dotted path [0.78ms]
(pass) applySettingsRepairs > drop deletes a value without pruning its parent [1.00ms]
(pass) applySettingsRepairs > applies several repairs in one call [2.65ms]
(pass) applySettingsRepairs > repairs a schema-rejected file before readSettingsFile validates it [1.14ms]

packages/orch/test/store-queue.test.ts:
(pass) queue facade storage > state is derived from attempts rather than stored on tasks [44.71ms]
(pass) queue facade storage > retention deletes only settled tasks older than the cutoff [52.19ms]
(pass) queue facade storage > retention never removes a queued task based on its age [39.41ms]
(pass) queue facade storage > agent-scoped tasks become unrunnable when their agent ends [34.97ms]
(pass) queue facade storage > completed tasks stay done after their scope agent ends [49.18ms]
(pass) queue facade storage > a dead orch does not make a pack task unrunnable while a member lives [38.79ms]
(pass) queue facade storage > pack-scoped tasks become unrunnable when every pack member ends [39.20ms]

packages/orch/test/commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [500.62ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [500.43ms]
killed 1 dangling process
killed 1 dangling process
killed 1 dangling process
killed 1 dangling process
killed 1 dangling process
(fail) commands/lifecycle > --all targets the agents this orch holds a live lease on, and drops them when it releases [7118.37ms]
  ^ this test timed out after 5000ms.

packages/orch/test/settings-shell.test.ts:
(pass) settings shell decisions > non-TTY takes the print path [0.10ms]
(pass) settings shell decisions > an overridden setting is refused with the winner named [0.20ms]
(pass) settings shell decisions > registered writes use the registry entry [1.21ms]
(pass) settings shell decisions > registry exposes writable subcommand entries [0.18ms]

packages/orch/test/worker-tools.test.ts:
(pass) worker tool policy > no configured allowlist restricts nothing [0.19ms]
(pass) worker tool policy > a configured allowlist always carries orch's own tools [0.06ms]
(pass) worker tool policy > peer tools join the allowlist when the fleet enables them [0.02ms]

packages/orch/test/spawn-policy.test.ts:
(pass) spawn policy caps > spawn, dispatch, reset, and model share one resolved tuning [1.64ms]
(pass) spawn policy caps > launch env uses the minted agent id name [0.03ms]
(pass) spawn policy caps > worker prompt depth > root worker maySpawn follows max_depth [0.36ms]
(pass) spawn policy caps > allows a pack spawn while under the cap [0.83ms]
(pass) spawn policy caps > blocks an at-cap spawn and offers dispatch or the pack queue [0.23ms]
(pass) spawn policy caps > a slave may not spawn by default: fleet.max_depth is 1 [0.09ms]
(pass) spawn policy caps > fleet.max_depth 2 lets a slave spawn and refuses its child [0.15ms]
(pass) spawn policy caps > reads a pack cap override from settings [0.71ms]
(pass) spawn policy caps > a tab holds at most fleet.max_agents_per_tab agents, counting what it already holds [0.79ms]
(pass) spawn policy caps > a refused cmdSpawn makes no name, worktree, registry, or queue mutation [64.25ms]

packages/orch/test/thinking-resolution.test.ts:
(pass) thinking resolution > resolves every rung in priority order [0.73ms]
(pass) thinking resolution > bare model with no setting yields harness default [0.46ms]
(pass) thinking resolution > pi translates the resolved level through its thinking role [0.11ms]
(pass) thinking resolution > per-harness override beats global default [0.31ms]

packages/orch/test/herdr-hud-environment.test.ts:
(pass) the herdr HUD reads its pane from the composer, never from the key > a herdr-placed agent reports the handle its environment carries [59.15ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > the handle follows the agent when it moves pane [56.49ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > an agent on another plexer is not a herdr pane [48.44ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > a process orch never launched is not a herdr pane [0.38ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > a key that is not a minted id resolves to no pane at all [0.24ms]

packages/orch/test/setup-flags.test.ts:
(pass) setup model flags > rejects a bare model when multiple harnesses are selected [0.14ms]
(pass) setup model flags > binds each model flag to its own harness [0.08ms]
(pass) setup model flags > allows a bare model for one harness [0.02ms]
(pass) setup model flags > rejects a model bound to an unselected harness [0.11ms]
(pass) setup model flags > rejects duplicate model flags for one harness [0.05ms]

packages/orch/test/setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [106.70ms]
(pass) notifier setup logic > lists unavailable notifiers with remediation and disables selection [0.15ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.18ms]
(pass) notifier setup logic > renders a command entry that loadSettings can parse [0.89ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.23ms]

packages/orch/test/claude-hooks.test.ts:
(pass) Claude hook command > gates execution on the launch environment variable [0.24ms]

packages/orch/test/port-has-no-shell.test.ts:
(pass) the backend port has no dead workspace shell > backend types contain neither deleted declaration [0.08ms]
(pass) the backend port has no dead workspace shell > src contains no workspaceNames calls or BackendWorkspace references [4.15ms]

packages/orch/test/daemon-credential.test.ts:
(pass) the token file is the whole credential > the token is 0600 [2.11ms]
(pass) the token file is the whole credential > $ORCH_DIR is 0700, so same-uid is a boundary the filesystem enforces [1.95ms]
(pass) the token file is the whole credential > a token left loose by an earlier run is tightened, not trusted [1.57ms]
(pass) the token file is the whole credential > a runtime directory the daemon creates is 0700 too [1.43ms]
(pass) the token file is the whole credential > nothing else is enrolled: there is no allowlist beside the token [1.54ms]

packages/orch/test/peer-identity.test.ts:
(pass) spawner identity > a bare operator with no session markers is just the operator [24.58ms]
(pass) spawner identity > an unregistered Claude Code session is labelled by its harness, with no id [27.75ms]
(pass) spawner identity > a session orch has registered IS addressable, by the id orch minted [44.72ms]
(pass) spawner identity > an unregistered session has no id to hand out, and does not invent one [0.43ms]
(pass) spawner identity > an orch-spawned orchestrator acts as the id orch minted for it [43.62ms]
(pass) spawner identity > agentIdentityEnv stamps a reply address only when the spawner has one [0.26ms]
(pass) spawner identity > worktreeEnv stamps worktree identity only for isolated agents [0.08ms]
(pass) spawner identity > the registry keeps the exact spawning session distinct from the lease holder [61.83ms]
(pass) the spawner address invariant > an UNREGISTERED session stamps no address, so no worker is handed an unreachable one [0.37ms]
(pass) the spawner address invariant > a bare operator stamps no address [22.95ms]
197 |     expect(address).toBe(registered.id);
198 |     process.env.ORCH_SPAWNER = address;
199 |     process.env.ORCH_SPAWNER_LABEL = "claude session";
200 | 
201 |     const resolved = await resolvePeer(noPeersDaemon, "spawner", "worker0006");
202 |     expect("error" in resolved ? resolved.error : null).toBeNull();
                                                              ^
error: expect(received).toBeNull()

Received: "error: spawner claude session (vcc79cdaov) has no live status record to reply to. Write your result and end the turn; it is collected from your result file."

      at <anonymous> (/home/bryan/orch/packages/orch/test/peer-identity.test.ts:202:57)
(fail) the spawner address invariant > an address that IS stamped resolves to a live status record [40.10ms]
209 |     const ownKey = "sender0001";
210 |     const peerKey = "unplaced02";
211 |     seedStatus(directory, peerKey, { agent: "pi", pid: process.pid, state: "idle", label: "unplaced" });
212 | 
213 |     const summary = (await peerSummaries(daemonClientForPeers([peerKey]), ownKey))[0];
214 |     expect(summary?.space).toBeNull();
                                 ^
error: expect(received).toBeNull()

Received: undefined

      at <anonymous> (/home/bryan/orch/packages/orch/test/peer-identity.test.ts:214:28)
(fail) peer identity in messaging > peer summaries render an unplaced agent without a local place name [35.76ms]
224 |     seedStatus(orchDir, ownKey, { agent: "pi", label: "sweep-1", pid: process.pid, state: "working" });
225 |     seedStatus(orchDir, peerKey, { agent: "pi", label: "sweep-2", pid: process.pid, state: "idle" });
226 |     const { daemon, calls } = recordingDaemon([ownKey, peerKey], { accepted: true, id: "mail-1", ack: "acknowledged" });
227 | 
228 |     const result = await sendPeerMessage(daemon, "sweep-2", "found it", ownKey);
229 |     expect(result).toBe("sent to pi: sweep-2");
                         ^
error: expect(received).toBe(expected)

Expected: "sent to pi: sweep-2"
Received: "error: peer view unavailable"

      at <anonymous> (/home/bryan/orch/packages/orch/test/peer-identity.test.ts:229:20)
(fail) peer identity in messaging > orch_send reports the peer's NAME and calls the message RPC [2.68ms]
241 |     seedStatus(orchDir, ownKey, { agent: "pi", label: "sweep-1", pid: process.pid, state: "working" });
242 |     seedStatus(orchDir, peerKey, { agent: "pi", label: "sweep-2", pid: process.pid, state: "idle" });
243 |     const { daemon } = recordingDaemon([ownKey, peerKey], { accepted: true, id: "mail-2", ack: "unavailable" });
244 | 
245 |     const result = await sendPeerMessage(daemon, "sweep-2", "found it", ownKey);
246 |     expect(result).toBe("sent to pi: sweep-2 (queued, not yet read)");
                         ^
error: expect(received).toBe(expected)

Expected: "sent to pi: sweep-2 (queued, not yet read)"
Received: "error: peer view unavailable"

      at <anonymous> (/home/bryan/orch/packages/orch/test/peer-identity.test.ts:246:20)
(fail) peer identity in messaging > orch_send reports queued when the message is not acknowledged [1.10ms]
253 |     seedStatus(orchDir, ownKey, { agent: "pi", label: "sweep-1", pid: process.pid, state: "working" });
254 |     seedStatus(orchDir, peerKey, { agent: "pi", label: "sweep-2", pid: process.pid, state: "idle" });
255 |     const { daemon } = recordingDaemon([ownKey, peerKey], undefined);
256 | 
257 |     const result = await sendPeerMessage(daemon, "sweep-2", "found it", ownKey);
258 |     expect(result).toBe("error: daemon unreachable; message not sent");
                         ^
error: expect(received).toBe(expected)

Expected: "error: daemon unreachable; message not sent"
Received: "error: peer view unavailable"

      at <anonymous> (/home/bryan/orch/packages/orch/test/peer-identity.test.ts:258:20)
(fail) peer identity in messaging > orch_send reports when the daemon is unreachable [1.05ms]
263 |     const ownKey = "sender0001";
264 |     const peerKey = "recon30003";
265 |     seedStatus(orchDir, peerKey, { agent: "pi", label: "recon-3", pid: process.pid, state: "idle" });
266 | 
267 |     const resolved = await resolvePeer(daemonClientForPeers([peerKey]), "recon-3", ownKey);
268 |     expect("peer" in resolved && resolved.peer.key).toBe(peerKey);
                                                          ^
error: expect(received).toBe(expected)

Expected: "recon30003"
Received: false

      at <anonymous> (/home/bryan/orch/packages/orch/test/peer-identity.test.ts:268:53)
(fail) peer identity in messaging > peers resolve by display name exactly like by key [32.83ms]
275 |     process.env.ORCH_SPAWNER = "session777";
276 |     process.env.ORCH_SPAWNER_LABEL = "pi session";
277 | 
278 |     const { daemon } = recordingDaemon(["session777"], { accepted: true, id: "mail-3", ack: "acknowledged" });
279 |     const sent = await sendPeerMessage(daemon, "spawner", "done with the sweep", ownKey);
280 |     expect(sent).toStartWith("sent to ");
                       ^
error: expect(received).toStartWith(expected)

Expected to start with: "sent to "
Received: "error: spawner pi session (session777) has no live status record to reply to. Write your result and end the turn; it is collected from your result file."

      at <anonymous> (/home/bryan/orch/packages/orch/test/peer-identity.test.ts:280:18)
(fail) peer identity in messaging > "spawner" reaches the stamped spawner session across fleet scoping [1.19ms]
(pass) peer identity in messaging > a spawner with no live status record is refused BY NAME, not with a bare key [0.37ms]

packages/orch/test/bridge-reasserts-pin.test.ts:
(pass) bridge reasserts orch model pins > reasserts after session_start and reports the applied pin [8.35ms]
(pass) bridge reasserts orch model pins > reasserts one time for a foreign level and ignores apply events [4.25ms]
(pass) bridge reasserts orch model pins > a harness clamp does not create a reassert loop [3.84ms]

packages/orch/test/transfer-does-not-disturb.test.ts:
(pass) a transfer touches the lease and nothing else > a handoff changes the holder and leaves every other fact identical [72.65ms]
(pass) a transfer touches the lease and nothing else > the agent's process is not restarted or re-attached [64.63ms]
(pass) a transfer touches the lease and nothing else > no control write is delivered to the agent [59.11ms]
(pass) a transfer touches the lease and nothing else > adoption of an unheld agent disturbs it no more than a handoff does [58.30ms]
(pass) a transfer touches the lease and nothing else > the holding that ended is kept as history, not erased by the transfer [62.70ms]

packages/orch/test/commands-runs.test.ts:
(pass) commands/runs > lists newest first and honors -n [57.38ms]
(pass) commands/runs > target filter and json preserve RunRecord rows [3583.50ms]
(pass) commands/runs > running rows render as running, not zero duration [0.19ms]
(pass) commands/runs > result falls back to durable run history after presence reap [3550.57ms]

packages/orch/test/dispatch-channel-first.test.ts:
(pass) work reaches an agent through its link > a headless agent receives a dispatch through the link [43.89ms]
(pass) work reaches an agent through its link > a capless adapter still gets the not-placed boundary answer [39.14ms]

packages/orch/test/settings-notify.test.ts:
(pass) orch settings notify > records a sink with the field that sink declares [108.51ms]
(pass) orch settings notify > re-adding one sink replaces it in place and keeps the fields the call omits [325.65ms]
(pass) orch settings notify > accepts asking as a first-class sink state [116.45ms]
(pass) orch settings notify > remove drops only the named sink [242.17ms]
(pass) orch settings notify > list reports each sink with the states it fires on, defaults included [239.22ms]
(pass) orch settings notify > an empty notify array lists as none configured [0.73ms]
(pass) orch settings notify > the notify row lists every sink, the states it may fire on, and the fields each carries [144.93ms]
(pass) orch settings notify > the notify row writes the picked sinks, states included, and drops the ones left off [1.94ms]
(pass) orch settings notify > the notify row refuses an unknown sink, a carrying sink with nothing to carry, and an unknown state [0.76ms]

packages/orch/test/notify.test.ts:
(pass) notification routing > an excluded state does not invoke its notifier [4.99ms]

packages/orch/test/backend-tmux.test.ts:
(pass) TmuxBackend > current identity uses the explicit id, not the launch environment [0.86ms]
(pass) TmuxBackend > does not expose legacy top-level group methods [0.11ms]
(pass) TmuxBackend > composes a complete group role bundle [0.08ms]
(pass) TmuxBackend > exposes tmux pane roles [0.06ms]
(pass) TmuxBackend > reads the pane shell pid as the pane process [0.51ms]
(pass) TmuxBackend > reports tmux availability [0.97ms]
(pass) TmuxBackend > reflects the TMUX environment [0.23ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.16ms]
(pass) TmuxBackend > the pane inventory surfaces only orch-spawned panes [0.44ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.12ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [0.33ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.11ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [251.03ms]
(pass) TmuxBackend > waiting fails immediately when the pane has no presence key [0.19ms]
(pass) TmuxBackend > the pane screen returns captured text and throws when capture-pane fails [1750.87ms]
(pass) TmuxBackend > setLabel and renameAgent write two distinct pane options [0.30ms]
(pass) TmuxBackend > placement.open splits the requested target with cwd and environment [0.26ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.37ms]
(pass) TmuxBackend > spawn splits the planned target pane, not whatever pane the window has active [0.13ms]
(pass) TmuxBackend > groupLayout reports every pane in a window with its cell geometry [0.22ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.18ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [0.24ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.13ms]
(pass) an agent is launched with its fleet's project scope (1.13) > a tmux agent in a worktree carries the FLEET's project, not its own cwd [0.18ms]
(pass) an agent is launched with its fleet's project scope (1.13) > a tmux agent opened in a fresh window carries it too [0.12ms]
(pass) an agent is launched with its fleet's project scope (1.13) > an empty value is dropped rather than exported as a configured blank [0.22ms]

packages/orch/test/identity.test.ts:
(pass) serializeIdentity / parseIdentity > a key is the minted id verbatim [0.10ms]
(pass) serializeIdentity / parseIdentity > round-trips a minted id [0.05ms]
(pass) serializeIdentity / parseIdentity > a key is one flat filesystem-safe segment with nothing to split [0.10ms]
(pass) serializeIdentity / parseIdentity > two spawns never collide, so no plexer is needed to namespace them [1.06ms]
(pass) isAgentId > accepts a minted id [0.05ms]
(pass) isAgentId > rejects everything that is not one [0.10ms]
(pass) malformed input > rejects malformed ids [0.05ms]

packages/orch/test/commands-lease.test.ts:
(pass) lease commands > detach releases the lease and is a no-op when already unleased [51.61ms]
(pass) lease commands > a LIVE foreign holder still excludes everyone else [49.27ms]
(pass) lease commands > adopt takes an unleased agent and a dead holder [46.50ms]
(pass) lease commands > adopt refuses a holder with a live recorded process [41.02ms]
(pass) lease commands > reap refuses when a live descendant exists, regardless of lease [43.40ms]
(pass) lease commands > reap refuses while the recorded process is alive [37.21ms]
(pass) lease commands > reap is never lease-gated and removes the record and presence [40.46ms]
{"outcome":"answer","reason":"no-environment-role","text":"this pane environment does not provide abort"}
(pass) lease commands > abort proceeds with a foreign live-holder lease [3581.79ms]
{"closed":["ggqctlfldg"],"results":[{"target":"ggqctlfldg","handle":"close-handle","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) lease commands > close proceeds with a foreign live-holder lease [3578.03ms]
{"target":"87nctbl50b","name":"reap-worker","reaped":true}
(pass) lease commands > reap proceeds with a foreign live-holder lease [48.28ms]
(pass) lease commands > reset driving verb refuses a foreign live-holder lease [40.32ms]

packages/orch/test/event-identity.test.ts:
(pass) published event identity > stamps a per-agent ordinal so a redelivery is recognizable [0.33ms]
(pass) the work loop is not a second presence-transition source > an agent state change publishes nothing from the queue loop [368.49ms]

packages/orch/test/adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.33ms]
(pass) PiAdapter > restricted workers explicitly load the bundled pi extension [0.16ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.08ms]
(pass) PiAdapter > reads state from the presence status through store helpers [293.61ms]
(pass) PiAdapter > reads results.jsonl and falls back to the last assistant session text [1.06ms]
(pass) PiAdapter > parses pi's supported model table without importing harness internals [0.31ms]

packages/orch/test/daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [1.63ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [2.08ms]
(pass) daemon lifecycle > reclaims an unreadable lock, which a crash truncated and no daemon owns [2.15ms]
(pass) daemon lifecycle > refuses an unreadable lock while the socket still answers [0.64ms]
(pass) daemon lifecycle > clears the lock, socket and port a departed daemon owned, keeping the log [0.78ms]
(pass) daemon lifecycle > refuses a stale lock when the socket probe cannot answer [0.70ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [1.00ms]
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.4.0+34cbb9a40)

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
  remove    moment               Remove a dependency from package.json (bun rm)
  update    react                Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
  dedupe                         Remove duplicate versions from the lockfile
  prune                          Remove packages that are not in the lockfile from node_modules
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
  create    svelte               Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [120.88ms]
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [2.57ms]
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.4.0+34cbb9a40)

Usage: bun <command> [...flags] [...args]

Commands:
  run       ./my-script.ts       Execute a file with Bun
            lint                 Run a package.json script
  test                           Run unit tests with Bun
  x         vite                 Execute a package binary (CLI), installing if needed (bunx)
  repl                           Start a REPL session with Bun
  exec                           Run a shell script directly with Bun

  install                        Install dependencies for a package.json (bun i)
  add       elysia               Add a dependency to package.json (bun a)
  remove    moment               Remove a dependency from package.json (bun rm)
  update    @shumai/shumai       Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
  dedupe                         Remove duplicate versions from the lockfile
  prune                          Remove packages that are not in the lockfile from node_modules
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
  create    svelte               Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > rejects a recycled pid identity [5.58ms]
(pass) daemon lifecycle > foreign machine registration cannot be signalled for another store [2.20ms]
(pass) daemon lifecycle > only a provable lock owner may be signalled [1.09ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [0.44ms]

packages/orch/test/control-ack.test.ts:
(pass) control delivery acknowledgements > waits for the matching reader acknowledgement [0.54ms]
(pass) control delivery acknowledgements > captures an acknowledgement arriving during delivery [0.12ms]
(pass) control delivery acknowledgements > never claims consumption for an unacknowledged channel [0.07ms]
(pass) control delivery acknowledgements > times out without claiming that delivery was cancelled [11.19ms]
(pass) control delivery acknowledgements > propagates a failed send and removes its waiter [0.38ms]

packages/orch/test/port-seam-errors.test.ts:
(pass) port seam error contract > provider mutation errors preserve argv, exit status, stderr, and stdout [0.46ms]
(pass) port seam error contract > provider query errors throw instead of returning a sentinel [0.61ms]

packages/orch/test/one-control-dispatcher.test.ts:
(pass) there is exactly one control dispatcher > no module outside src/control declares a control dispatcher [7.17ms]
(pass) there is exactly one control dispatcher > no dispatcher is exported under two names [5.97ms]

packages/orch/test/spawn-name-list.test.ts:
(pass) spawn names every agent positionally, at creation > the positional arguments are the names, one per pane [0.12ms]
(pass) spawn names every agent positionally, at creation > the pane count is how many names were given [0.05ms]
(pass) spawn names every agent positionally, at creation > spawning with no name at all is refused [0.15ms]
(pass) spawn names every agent positionally, at creation > a bare count is not a name and is refused [0.28ms]
(pass) spawn names every agent positionally, at creation > the same name twice would collide, so it is refused before anything is created [0.13ms]
(pass) spawn names every agent positionally, at creation > every name is validated, so one bad name creates nothing [0.14ms]
(pass) spawn names every agent positionally, at creation > --name is gone: naming is positional, so the flag is an unknown flag [0.09ms]
(pass) spawn names every agent positionally, at creation > claimSpawnNames takes the resolved names and asserts each is free [0.60ms]

packages/orch/test/no-placement-row-over-the-composed-view.test.ts:
(pass) no Placement row is reassembled over the composed view (2.1) > there is no second lookup module projecting the environment into a flat row [0.08ms]
(pass) no Placement row is reassembled over the composed view (2.1) > the space wall reads the OPEN space interval, so a moved agent is walled by where it IS [88.33ms]
(pass) no Placement row is reassembled over the composed view (2.1) > a string that names no registered agent is in no space rather than an error [24.28ms]

packages/orch/test/store-lease-rows.test.ts:
(pass) agent lease rows > fencing ids are monotonic across agents and never reused after reap [49.93ms]
(pass) agent lease rows > a second open lease is rejected [43.33ms]
(pass) agent lease rows > release and expiry close rows with matching reason and exact until [46.90ms]
(pass) agent lease rows > handoff closes current and inserts a newer row without changing prior facts [53.26ms]
(pass) agent lease rows > adoption closes prior and inserts a strictly newer adopter row [66.81ms]
(pass) agent lease rows > adoption with no open lease is plain acquire and leaves closed history untouched [50.28ms]
(pass) agent lease rows > handoff rolls back close when successor insert fails [57.51ms]
(pass) agent lease rows > wrong-holder release and handoff are rejected [41.92ms]
(pass) agent lease rows > an agent cannot lease itself [39.25ms]
(pass) agent lease rows > expiry inserts nothing new [41.73ms]
(pass) agent lease rows > reads return only open rows [49.40ms]

packages/orch/test/unleased-stays-adoptable.test.ts:
(pass) unleased and idle stays alive and adoptable (D3) > a decade of retention sweeps never ages out an unleased idle agent [36.04ms]
(pass) unleased and idle stays alive and adoptable (D3) > and it is still adoptable afterwards — the point of keeping it [35.36ms]
(pass) unleased and idle stays alive and adoptable (D3) > the sweep reaps only agents that actually ENDED, never merely unleased ones [48.24ms]
(pass) unleased and idle stays alive and adoptable (D3) > repeated sweeps are stable: an unleased agent survives every one of them [41.37ms]

packages/orch/test/port-seam-channel.test.ts:
(pass) orch bridge links and capture roles > headless delivery reaches the link and the ack settles its outbox row [58.77ms]
(pass) orch bridge links and capture roles > capture reads status and result from the orch presence record [24.92ms]

packages/orch/test/one-spelling-per-fact.test.ts:
(pass) one spelling per shared fact > osSide and the store agree for an injected Windows platform [30.42ms]
(pass) one spelling per shared fact > the shared record guard rejects arrays and null [0.13ms]
(pass) one spelling per shared fact > removed identity method has no source spelling [3.48ms]
(pass) one spelling per shared fact > settings reads have no literal fallbacks [4.92ms]
(pass) one spelling per shared fact > launch env has one spelling [13.36ms]
(pass) one spelling per shared fact > removed spawn cap has no source or README spelling [3.75ms]

packages/orch/test/outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [43.15ms]

packages/orch/test/settings-thinking.test.ts:
(pass) orch settings thinking > writes the global default and reads back through loadSettings [1.89ms]
(pass) orch settings thinking > writes a per-harness override without disturbing the global default [1.34ms]
thinking  xhigh
(pass) orch settings thinking > the command sets the level a user names [0.93ms]
thinking (pi)  low
(pass) orch settings thinking > the command sets a per-harness level with --harness [0.86ms]
(pass) orch settings thinking > a level orch does not know is refused, naming the valid levels [0.35ms]
(pass) orch settings thinking > clearing a per-harness override falls back to the global default [1.16ms]

packages/orch/test/lease-authority.test.ts:
(pass) C3 foreign agents are untouchable > every driving verb is refused while a live foreign orch holds the lease [49.04ms]
(pass) C3 foreign agents are untouchable > a DEAD foreign holder is not a collision [49.72ms]
(pass) C3 foreign agents are untouchable > the composed holder IS the open lease, with nothing beside it [55.65ms]
(pass) C4 steal > adopt refuses a live holder, and --steal takes it [70.20ms]
(pass) C4 steal > detach refuses a live holder, and --steal releases it [55.95ms]
(pass) C4a fencing token > lease ids are monotonic across handoff and adoption [45.22ms]
(pass) C4a fencing token > a stale fence cannot release the current holder's lease [47.08ms]
(pass) C4a fencing token > openLeaseId is null when nothing is leased [43.13ms]
(pass) C4b reads are never gated > status and events read straight through a live foreign lease [36.70ms]
(pass) C4c/C4d name resolution > duplicate names are legal and an ambiguous target asks for the id [39.70ms]
(pass) C4c/C4d name resolution > a unique name resolves, and an unknown target is a lookup miss [37.55ms]
(pass) C4e naming at creation > a nameless spawn is refused [0.22ms]
(pass) C4e naming at creation > a self-registering session gets <harness>-<first 8 of its id> [34.44ms]
(pass) C4f self-rename > an agent renames itself whether or not a lease is in force [53.05ms]
(pass) C4f self-rename > renaming another agent is driving and obeys the lease [51.61ms]
(pass) C4f self-rename > an invalid name is refused [32.96ms]
(pass) C5 a transfer does not disturb the agent > adoption writes lease rows and touches nothing else [64.79ms]
(pass) C7 live by lease, history by provenance > adoption moves the live view and leaves provenance untouched [47.05ms]

packages/orch/test/work-notify.test.ts:
(pass) orch presence notifications > delivers a presence transition through a configured command sink [76.31ms]

packages/orch/test/cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.13ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [0.49ms]
(pass) tmux backend registry and capabilities > exposes pane roles [0.18ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.12ms]
(pass) tmux backend registry and capabilities > a tmux agent's key is the minted id, never its pane [0.09ms]
(pass) tmux backend registry and capabilities > selects an available placing environment, whichever one the caller sits in [0.16ms]
(pass) tmux backend registry and capabilities > falls back to headless only when no environment can place an agent [0.05ms]
(pass) tmux backend registry and capabilities > an installed plexer is selectable from outside its session, and refuses in its own words [0.31ms]
(pass) tmux backend registry and capabilities > herdr is selectable from outside a herdr session [0.10ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-space [73.82ms]

packages/orch/test/setup-wizard.test.ts:
(pass) setup model picker > switches large catalogues to searchable bounded mode and preserves effort [0.36ms]
(pass) setup model picker > keeps the compact selector for small catalogues [0.11ms]
(pass) setup model list picker > large catalogues use the bounded searchable multiselect [0.25ms]
(pass) setup model list picker > the prompt names both jobs the list does, and that an empty one forbids nothing [0.12ms]
(pass) setup model list picker > stored values start checked, and clearing them returns an empty selection [0.22ms]

packages/orch/test/work-loop-identity.test.ts:
(pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > a claim records the minted agent id, not the presence key [58.74ms]
(pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > an idle process with no registered agent row is never handed pack work [53.83ms]
(pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > Cq1: the pack drains its own queue with its orch dead and no lease in force [53.30ms]

packages/orch/test/space-policy.test.ts:
(pass) a space is user-created, and absence falls back to the repo root > placing an agent in a space nobody created is refused, not minted [34.77ms]
(pass) a space is user-created, and absence falls back to the repo root > two unspaced agents in the SAME repo root can reach each other [34.34ms]
(pass) a space is user-created, and absence falls back to the repo root > two unspaced agents in DIFFERENT repo roots cannot [48.43ms]
(pass) a space is user-created, and absence falls back to the repo root > an agent placed in no space reports none, even inside a plexer workspace [3578.90ms]
(pass) a space is user-created, and absence falls back to the repo root > recording a spawn never conjures the space it names [30.92ms]
(pass) a space is user-created, and absence falls back to the repo root > a space still walls, and it outranks the repo root [40.51ms]
(pass) space policy > reads the space from the environment satellite, and absence is null [68.51ms]
(pass) space policy > resolves space names through records and functions [0.16ms]
(pass) space policy > compares agents by the space each is composed into [85.62ms]
(pass) space policy > enforces the space wall across every plexer alike [105.96ms]
(pass) space policy > scopes agents to the current space [54.31ms]
(pass) space policy > a null current space leaves items unscoped [31.98ms]
(pass) space policy > 2.7 status displays the composed space, not text sliced from a key [3573.78ms]
(pass) space policy > 6.6 structured identity drives status and policy, not serialized key text [3573.51ms]

packages/orch/test/notify-events-format.test.ts:
(pass) notification and presence event formatting > spaceColor is stable and returns a palette hex [0.13ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.16ms]
(pass) notification and presence event formatting > named events prefer the human name over the harness id [0.05ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.11ms]
(pass) notification and presence event formatting > webhook payload includes space and spaceColor [0.77ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [21.57ms]
(pass) notification and presence event formatting > derivePresenceTransition composes the space from the agent's environment [35.23ms]

packages/orch/test/store-events.test.ts:
(pass) event store rows > appendEvent assigns increasing sequence numbers and round-trips payload [38.50ms]
(pass) event store rows > appendEvent keeps sequence numbers across store reopen [49.39ms]
(pass) event store rows > pruned sequence numbers are never reused [59.84ms]
(pass) event store rows > selectEventsSince filters by sequence, orders ascending, and honours limit [40.18ms]
(pass) event store rows > oldestEventSeq reports undefined when empty and the surviving lowest sequence after pruning [40.96ms]

packages/orch/test/bridge-terminal.test.ts:
(pass) bridge terminal turn seam > empty and tool-only turn_end turns still publish a terminal idle state [3.46ms]
(pass) bridge terminal turn seam > a settled turn with assistant text publishes done [1.78ms]

packages/orch/test/events-scope-notice.test.ts:
(pass) events scope notice > names the default live scope and its wideners [0.09ms]
(pass) events scope notice > names the all-agent live scope and its history widener [0.07ms]
(pass) events scope notice > a redirected stream is a harness reading transitions, and gets no banner [0.01ms]
(pass) events scope notice > does not announce when history was requested [0.06ms]
(pass) events scope notice > writes one notice before starting the live transport [0.11ms]
(pass) events scope notice > does not write a notice when history was requested [0.04ms]
(pass) events scope notice > says so when the caller owns no agents [0.06ms]
(pass) events scope notice > stays out of a --json stream, which a parser is reading [0.04ms]
(pass) events scope notice > does not announce when explicit targets were requested [0.04ms]

packages/orch/test/status-owner-column.test.ts:
(pass) the rendered status table carries the owner column > each row's OWNER cell holds that row's lease fact [0.63ms]
(pass) the rendered status table carries the owner column > a dead holder reads as unleased under a table that all shares one owner [0.26ms]
(pass) the rendered status table carries the owner column > the owner column is dropped only when no row knows its lease [0.21ms]

packages/orch/test/pack-gets-its-own-home.test.ts:
(pass) a pack gets its own marked plexer home (E8, E9, E10) > the coordinate is STORED against the pack and is never orch's own id [33.64ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > the home orch opens is MARKED as orch's, never a bare directory name [36.39ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > a space's home and a pack's home use the SAME role and different tables [44.18ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > a home recorded in another plexer is not this one's to drive [37.25ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > closing a pack's home clears the row, so the next open is a fresh one [41.36ms]

packages/orch/test/doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [2.19ms]
(pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [1.49ms]
(pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [309.57ms]
(pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [0.87ms]
(pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [227.06ms]
(pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [1.34ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [1.44ms]
(pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [1.03ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [1.54ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [0.42ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [0.38ms]

packages/orch/test/worker-prompt.test.ts:
(pass) worker prompt capability composition > spawn clause follows maySpawn and stripping preserves the task [1.25ms]
(pass) worker prompt capability composition > orch run composition selects the same header per adapter [4.18ms]
(pass) worker prompt capability composition > the worker header does not instruct a lock that does not lock [0.16ms]
(pass) worker prompt capability composition > the header addresses the agent, and names no plexer furniture [0.06ms]
(pass) worker prompt capability composition > the verify clause names the configured commands, and asks for the repository's own when there are none [0.15ms]
(pass) worker prompt capability composition > locked-commands clause names the commands, and asks for a report rather than a lock [0.06ms]
(pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.04ms]
(pass) worker prompt capability composition > the reply-to-spawner clause needs a reachable spawner, not just a bridge-enabled worker [0.06ms]
(pass) worker prompt capability composition > unreachable spawner tells the worker to finish and end without relaying [0.05ms]
(pass) worker prompt capability composition > reachable spawner permits replying to the spawner only [0.05ms]
(pass) worker prompt capability composition > a reachable spawner still earns no clause when the worker has no bridge [0.04ms]
(pass) worker prompt capability composition > the ask clause follows the bridge actions [0.10ms]
(pass) worker prompt capability composition > events strip both worker header variants [27.36ms]

packages/orch/test/adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [7.04ms]
(pass) adapter and runtime hardening > rejects unknown settings keys with a useful path [1.30ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [1.69ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [1.17ms]

packages/orch/test/identity-is-not-environment.test.ts:
(pass) A1 — identity carries no environment > Identity declares no plexer and no plexer grouping [0.11ms]
(pass) A1 — identity carries no environment > a key is the minted id itself, with no separator to split [0.10ms]
(pass) A1 — identity carries no environment > the module never spells the sentinels that stand in for a missing place [0.05ms]
(pass) A1 — identity carries no environment > minted ids are unique per spawn [2.37ms]

packages/orch/test/commands-target.test.ts:
(pass) commands/target > splits known flags and preserves positional args [0.10ms]
(pass) commands/target > extracts target and joined prompt [0.19ms]
(pass) commands/target > reads only structured result text [0.06ms]
(pass) commands/target > quotes remote args and ORCH_DIR safely [0.26ms]
23 |     try {
24 |       // Only a minted id names an agent; a plexer/space key names an environment.
25 |       for (const [key, pid] of [["live000001", process.pid], ["not-an-identity", process.pid], ["dead000001", 999999]] as const) {
26 |         seedStatus(root, key, { key, pid });
27 |       }
28 |       expect(livePanePresenceEntries().map((entry) => entry.key)).toEqual(["live000001"]);
                                                                       ^
error: expect(received).toEqual(expected)

- [
-   "live000001",
- ]
+ []

- Expected  - 3
+ Received  + 1

      at <anonymous> (/home/bryan/orch/packages/orch/test/commands-target.test.ts:28:67)
(fail) commands/target > lists only live serialized identity presence entries [27.31ms]

packages/orch/test/outbox.test.ts:
(pass) outbox delivery > selects pending messages and delivers each message once [41.02ms]
(pass) outbox delivery > checks one message's pending state without scanning the outbox [47.85ms]
(pass) outbox delivery > keeps failed messages pending until their backoff expires [49.94ms]

packages/orch/test/reload-no-bundle-write.test.ts:
{"results":[],"ok":0,"total":0,"hard":false,"signaled":"reload.signal"}
(pass) reload > does not write installed extension bundles [3517.04ms]

packages/orch/test/commands-queue.test.ts:
(pass) commands/queue > cmdQueue list emits the selected JSON view [54.07ms]
(pass) commands/queue > round-trips add/list/cancel on an isolated store [41.82ms]
No queue tasks.
(pass) commands/queue > renders empty queues without throwing [0.30ms]

packages/orch/test/store-task-rows.test.ts:
(pass) task and attempt rows > malformed task rows are refused instead of handed back as typed data [64.24ms]
(pass) task and attempt rows > malformed attempt rows are refused instead of handing back NaN [55.40ms]
(pass) task and attempt rows > enqueue accepts exactly one typed scope and round-trips JSON opts [42.69ms]
(pass) task and attempt rows > queued tasks can be edited only by their enqueuer [60.74ms]
(pass) task and attempt rows > two concurrent claims have one winner and one index violation [48.44ms]
(pass) task and attempt rows > failed attempts remain in history and retries are new attempts [58.74ms]
(pass) task and attempt rows > settlement stores exact integer instants and outcome payloads [54.49ms]
(pass) task and attempt rows > task state precedence covers queued, claimed, failed, done and cancelled [67.41ms]
(pass) task and attempt rows > intakes are half-open history and duplicate open intake is rejected [45.25ms]

packages/orch/test/no-sibling-relay.test.ts:
(pass) a worker with no reachable spawner does not relay (L6) > an unset spawner refuses, and the refusal names the agent's own report path [1.17ms]
(pass) a worker with no reachable spawner does not relay (L6) > the refusal never suggests another agent as an alternative route [0.77ms]
(pass) a worker with no reachable spawner does not relay (L6) > a spawner that is stamped but has no live status record refuses by NAME and still says to report [0.57ms]

packages/orch/test/orch-bugs-4-5.test.ts:
(pass) orch bugs 4 and 5 launch contracts > interactive launch routes use one argv composition [0.18ms]
(pass) orch bugs 4 and 5 launch contracts > headless launch routes use one argv composition [0.10ms]
(pass) orch bugs 4 and 5 launch contracts > inherited extension policy emits every discovered extension [0.06ms]

packages/orch/test/doctor-declared-vs-reality-tuning.test.ts:
(pass) doctor declared tuning versus reality > matching model and effort produces no finding [45.57ms]
(pass) doctor declared tuning versus reality > different effort reports both ladder specs [48.91ms]
(pass) doctor declared tuning versus reality > different model reports both ladder specs [41.71ms]
(pass) doctor declared tuning versus reality > missing status produces no tuning finding [42.26ms]

packages/orch/test/settings-view.test.ts:
(pass) settings view > visibleEntryIndices matches key and group case-insensitively [0.22ms]
(pass) settings view > windowBounds keeps the focus inside the budget and clamps at both ends [0.10ms]
(pass) settings view > frame shows group headers, values, provenance tags, and the focused help [0.45ms]
(pass) settings view > frame with a filter narrows the list and draws the filter line [0.07ms]
(pass) settings view > frame reports an empty filter match instead of a blank screen [0.04ms]
(pass) settings view > a long list is windowed with more-above/more-below markers [0.59ms]
(pass) settings view > overlays render choices, checkboxes, and input with error [0.20ms]
(pass) settings view > a checkbox row shows what its choice carries [0.05ms]
(pass) settings view > displayValue keeps scalars bare and JSON-encodes shapes [0.04ms]

packages/orch/test/bridge-client.test.ts:
(pass) bridge daemon client > attaches, receives deliveries, acks on the link, and reconnects [77.04ms]
(pass) bridge daemon client > dead endpoints resolve undefined without invoking handlers [0.95ms]

packages/orch/test/port-seam-boundary.test.ts:
(pass) port seam command boundary > headless target is answered without invoking its pane role [0.08ms]
(pass) port seam command boundary > paned environment without a role is answered at the boundary [0.05ms]
(pass) port seam command boundary > an invocation preserves the provider failure [0.06ms]

packages/orch/test/notify-sinks.test.ts:
(pass) notification entries > desktop entries use the canonical notifier registry [0.20ms]

packages/orch/test/session-env.test.ts:
(pass) shim environment > allows the launch environment variable [0.08ms]

packages/orch/test/remote.test.ts:
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.10ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.07ms]

packages/orch/test/broker-ownership.test.ts:
(pass) broker ownership and space governance > the composed holder is the only ownership record, and adoption moves it [41.96ms]
(pass) broker ownership and space governance > refuses cross-space writes unless explicitly overridden [56.20ms]
(pass) broker ownership and space governance > moving an agent between spaces moves the wall, not its identity [40.78ms]

packages/orch/test/work-survives-its-spawner.test.ts:
(pass) work survives its spawner, always (D1) > ending the spawner leaves the child live, unended and still listed [46.82ms]
(pass) work survives its spawner, always (D1) > a grandchild is untouched when the middle agent ends [53.22ms]
(pass) work survives its spawner, always (D1) > the store has no lifetime column and no fate-sharing flag anywhere [0.56ms]
(pass) work survives its spawner, always (D1) > spawn offers no flag that decides whether work outlives its spawner [3.08ms]
(pass) work survives its spawner, always (D1) > closing the spawner never writes an ending for anything it spawned [52.20ms]

packages/orch/test/session.test.ts:
(pass) parseSession > returns an empty view for null and missing paths [0.10ms]
(pass) parseSession > handles model, thinking, user, assistant, tool, and unknown entries [1.02ms]
(pass) parseSession > joins text blocks and ignores non-text blocks [0.48ms]

packages/orch/test/session-refresh-repoints-identity.test.ts:
(pass) session refresh identity continuity > same process with a new token repoints the existing agent and preserves its lease [39.46ms]
(pass) session refresh identity continuity > same token with a new process keeps the agent and repoints its process interval [37.50ms]
(pass) session refresh identity continuity > a new token and a new process mint a new agent [36.62ms]
(pass) session refresh identity continuity > a process anchored by an ended agent mints instead of repointing [39.56ms]

packages/orch/test/status-renders-one-row-shape.test.ts:
(pass) status rendering has one row shape and one table renderer > task and last text use the same spelling in the row and table cell [7.11ms]
(pass) status rendering has one row shape and one table renderer > local and remote rows share the renderer; remote adds only HOST [0.31ms]
(pass) status rendering has one row shape and one table renderer > fleet resolves caller inputs once while building three presence rows [3549.69ms]

packages/orch/test/commands-help.test.ts:
(pass) per-command help topics > daemon help names every subcommand and the idle shutdown setting [0.09ms]
(pass) per-command help topics > aliases resolve to their command's topic [0.04ms]
(pass) per-command help topics > logs help names every filter the command accepts [0.07ms]
(pass) per-command help topics > an unknown name has no topic [0.01ms]
(pass) per-command help topics > every topic is printable text ending in a newline [0.08ms]

packages/orch/test/spawn-names.test.ts:
(pass) agent name validation > rejects names outside herdr's naming rule [0.34ms]
(pass) agent name validation > accepts lowercase names with hyphens and underscores [0.04ms]
(pass) a live name is claimed and a dead one is released > a live agent holds its name against a second spawn [47.32ms]
(pass) a live name is claimed and a dead one is released > a dead agent frees its name [52.81ms]
(pass) a live name is claimed and a dead one is released > another space's agent never blocks a name here [52.68ms]
(pass) name scope follows the agent's current space, not its birthplace > moving an agent moves the name it holds [54.22ms]
(pass) name scope follows the agent's current space, not its birthplace > the collision names the agent by its minted id [52.17ms]

packages/orch/test/identity-self.test.ts:
(pass) selfIdentity > returns the launch id without touching the store [0.37ms]

packages/orch/test/adapter-session-env.test.ts:
(pass) adapter-owned session environment > resolves each caller harness through the public session resolver [0.21ms]
(pass) adapter-owned session environment > keeps harness env literals inside adapter modules [2.39ms]
(pass) adapter-owned session environment > a registered adapter resolves a novel marker without resolver changes [0.11ms]

packages/orch/test/spawn-preferred-models.test.ts:
(pass) the preferred quicklist reaches every launch route > a pane spawn hands the exact array to the backend [43.42ms]
(pass) the preferred quicklist reaches every launch route > an unconfigured quicklist stays empty rather than becoming a default one [56.64ms]
(pass) the preferred quicklist reaches every launch route > the previewed command is the command a launch runs [0.37ms]
(pass) the preferred quicklist reaches every launch route > a headless launch forwards the quicklist into the adapter's own options [43.30ms]
(pass) orchd rules on the quicklist it is sent > accepts an absent value and an array of specs [0.20ms]
(pass) orchd rules on the quicklist it is sent > refuses a joined string or a blank entry instead of coercing it [0.16ms]

packages/orch/test/settings-precedence.test.ts:
(pass) settings precedence > returns a defaults value when no override is set [1.59ms]
(pass) settings precedence > applies defaults when settings, env, and flag are absent [1.08ms]
(pass) settings precedence > uses env over settings and flag over env [0.61ms]
(pass) settings precedence > parses notify entries and hosts into expected shapes [1.14ms]
(pass) settings precedence > reports a helpful validation error for invalid settings [0.47ms]

packages/orch/test/bridge-link-server.test.ts:
(pass) daemon bridge links > attaches, replies, notifies after the reply write, and pushes deliveries [325.81ms]
(pass) daemon bridge links > a socket close detaches its bridge [526.29ms]
(pass) daemon bridge links > a second socket replaces the first link [70.53ms]
(pass) daemon bridge links > attach for an agent the store does not know is refused and the server keeps serving [41.27ms]
(pass) daemon bridge links > attach without a key is rejected [8.03ms]
(pass) daemon bridge links > server close detaches every bridge [37.06ms]

packages/orch/test/launch-stamp.test.ts:
(pass) canonical launch stamp > claude and codex launches produce the same status shape [0.31ms]

packages/orch/test/self-actor-identity.test.ts:
(pass) a driving session's write-actor is the agent orch registered for it > the session token resolves to the id hello minted, so the actor equals its own lease holder [40.16ms]
(pass) a driving session's write-actor is the agent orch registered for it > a token orch has never seen resolves to nothing rather than a fabricated id [25.95ms]
(pass) a driving session's write-actor is the agent orch registered for it > one session keeps ONE id across calls, whatever pid the shell reports [53.47ms]

packages/orch/test/daemon-transport-parity.test.ts:
(pass) both transports carry one mechanism > a bound TCP port does not displace the unix socket or become its own service [8.05ms]
(pass) both transports carry one mechanism > the credential is demanded identically on both [8.36ms]
(pass) both transports carry one mechanism > a missing credential is refused identically on both [5.13ms]
(pass) both transports carry one mechanism > the same token registers the same session whichever transport carried it [54.47ms]

packages/orch/test/peer-lease-visibility.test.ts:
74 | // F6 + G9: the compact listing is what agents actually read. Without the lease
75 | // on it, an unleased agent reads as ordinary live work belonging to the caller.
76 | describe("peer summaries carry ownership as a lease", () => {
77 |   test("a peer the caller holds reports the caller as the live holder", () => {
78 |     const directory = fixture();
79 |     expect(peerView(directory, CALLER, [HELD], false).drive[HELD]).toEqual({ kind: "leased", owner: CALLER, mine: true });
                                                                        ^
error: expect(received).toEqual(expected)

- {
-   "kind": "leased",
-   "mine": true,
-   "owner": "caller0001",
- }
+ undefined

- Expected  - 5
+ Received  + 1

      at <anonymous> (/home/bryan/orch/packages/orch/test/peer-lease-visibility.test.ts:79:68)
(fail) peer summaries carry ownership as a lease > a peer the caller holds reports the caller as the live holder [56.06ms]
79 |     expect(peerView(directory, CALLER, [HELD], false).drive[HELD]).toEqual({ kind: "leased", owner: CALLER, mine: true });
80 |   });
81 | 
82 |   test("a peer nobody ever took reports no orch driving it", () => {
83 |     const directory = fixture();
84 |     expect(peerView(directory, CALLER, [LOOSE], false).drive[LOOSE]).toEqual({ kind: "unleased", owner: "no orch driving it", mine: false });
                                                                          ^
error: expect(received).toEqual(expected)

- {
-   "kind": "unleased",
-   "mine": false,
-   "owner": "no orch driving it",
- }
+ undefined

- Expected  - 5
+ Received  + 1

      at <anonymous> (/home/bryan/orch/packages/orch/test/peer-lease-visibility.test.ts:84:70)
(fail) peer summaries carry ownership as a lease > a peer nobody ever took reports no orch driving it [59.32ms]
84 |     expect(peerView(directory, CALLER, [LOOSE], false).drive[LOOSE]).toEqual({ kind: "unleased", owner: "no orch driving it", mine: false });
85 |   });
86 | 
87 |   test("a dead holder is not a live one", () => {
88 |     const directory = fixture();
89 |     expect(peerView(directory, CALLER, [ORPHAN], false).drive[ORPHAN]).toEqual({ kind: "unleased", owner: "no orch driving it (holder gone)", mine: false });
                                                                            ^
error: expect(received).toEqual(expected)

- {
-   "kind": "unleased",
-   "mine": false,
-   "owner": "no orch driving it (holder gone)",
- }
+ undefined

- Expected  - 5
+ Received  + 1

      at <anonymous> (/home/bryan/orch/packages/orch/test/peer-lease-visibility.test.ts:89:72)
(fail) peer summaries carry ownership as a lease > a dead holder is not a live one [51.47ms]
93 | describe("the compact listing separates orphans from live work", () => {
94 |   test("unleased peers sit in their own bucket, below the driven ones", async () => {
95 |     const directory = fixture();
96 |     const lines = formatPeerLines(await summaries(directory)).split("\n");
97 |     const heading = lines.findIndex((line) => line.startsWith("unleased"));
98 |     expect(heading).toBeGreaterThan(0);
                         ^
error: expect(received).toBeGreaterThan(expected)

Expected: > 0
Received: -1

      at <anonymous> (/home/bryan/orch/packages/orch/test/peer-lease-visibility.test.ts:98:21)
(fail) the compact listing separates orphans from live work > unleased peers sit in their own bucket, below the driven ones [61.78ms]
108 | 
109 |   test("a held peer names its holder, and an unleased one never reads as yours", async () => {
110 |     const directory = fixture();
111 |     const output = formatPeerLines(await summaries(directory));
112 |     const line = (label: string) => output.split("\n").find((row) => row.startsWith(label)) ?? "";
113 |     expect(line("held-1")).toContain("held by you");
                                 ^
error: expect(received).toContain(expected)

Expected to contain: "held by you"
Received: ""

      at <anonymous> (/home/bryan/orch/packages/orch/test/peer-lease-visibility.test.ts:113:28)
(fail) the compact listing separates orphans from live work > a held peer names its holder, and an unleased one never reads as yours [57.42ms]
117 |   });
118 | 
119 |   test("with nothing unleased the bucket does not appear at all", async () => {
120 |     const directory = fixture();
121 |     const held = (await summaries(directory)).filter((peer) => peer.drive.kind === "leased");
122 |     expect(held.length).toBe(1);
                              ^
error: expect(received).toBe(expected)

Expected: 1
Received: 0

      at <anonymous> (/home/bryan/orch/packages/orch/test/peer-lease-visibility.test.ts:122:25)
(fail) the compact listing separates orphans from live work > with nothing unleased the bucket does not appear at all [70.98ms]

packages/orch/test/remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [24.85ms]
(pass) async remote fan-out > returns a typed dead-host failure [26.66ms]
(pass) async remote fan-out > returns a typed timeout failure [509.08ms]
(pass) async remote fan-out > returns a typed non-JSON failure [25.87ms]
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [505.12ms]

packages/orch/test/reap-picker.test.ts:
(pass) reapCandidates > classifies unleased dead holders and leased dead processes [0.28ms]
(pass) reapCandidates > classifies empty input [0.03ms]
(pass) cmdReap > prints the --dead --json result shape [61.80ms]
(pass) cmdReap > refuses bare reap when stdin is not a TTY [0.44ms]

packages/orch/test/adapter-roles.test.ts:
(pass) adapter role composition > composes complete roles per adapter [1.53ms]
(pass) adapter role composition > answers with zero exit code when a shim role is absent [4.83ms]

packages/orch/test/commands-logging.test.ts:
(pass) orch logs > --dispatch selects one dispatch across both sinks, oldest first [1.55ms]
(pass) orch logs > --agent selects one agent's records [0.55ms]
(pass) orch logs > --level selects one severity [0.50ms]
(pass) orch logs > --since drops everything older than the instant given [0.66ms]
(pass) orch logs > --since 0 keeps every record instead of being read as a missing value [0.68ms]
(pass) orch logs > renders a readable line: instant, level, event, correlation, agent, fields [0.54ms]
(pass) orch logs > --json emits the records themselves [0.54ms]
(pass) command logging > notify test records the diagnosis and keeps user output on stdout [1.94ms]

packages/orch/test/offline-is-not-a-second-source.test.ts:
killed 1 dangling process
killed 1 dangling process
killed 1 dangling process
killed 1 dangling process
killed 1 dangling process
(fail) --offline is a narrower view of ONE source, not a second one (M8) > offline and online read the same agents from the same presence files [7082.71ms]
  ^ this test timed out after 5000ms.
(pass) --offline is a narrower view of ONE source, not a second one (M8) > offline reports the SAME state the agent reported, never a second opinion [3672.89ms]
(pass) --offline is a narrower view of ONE source, not a second one (M8) > there is exactly ONE row builder, and --offline only narrows what it asks [1.43ms]
106 |     const source = readFileSync(join(import.meta.dir, "..", "src", "commands", "status.ts"), "utf8");
107 | 
108 |     // This is what the flag is FOR, and the reason it stays a status flag rather
109 |     // than moving to doctor: a person on a machine with no daemon still gets the
110 |     // fleet, and orch does not start one behind their back to answer.
111 |     expect(source).toMatch(/if \(!options\.offline\) \{\s*await ensureDaemonOrWarn/);
                         ^
error: expect(received).toContain(expected)

Expected to contain: "if (!options.offline) await ensureDaemonOrWarn"
Received: "import { loadSettingsOrNull } from \"../settings/read.ts\";\nimport { isBridgeExtensionStale, shippedBundleHashes } from \"../doctor/extensions.ts\";\nimport { spawnerIdentity } from \"../policy/spawner.ts\";\nimport { modelSpec } from \"../policy/thinking.ts\";\nimport { deriveDriveState, NO_ORCH_DRIVER } from \"../agent/drive-state.ts\";\nimport { computeFleetCapacity, formatCapacityLine } from \"../policy/capacity.ts\";\n\nimport { getAdapter } from \"../adapters/registry.ts\";\nimport { collapse, buildEntities, sortEntities } from \"../entities.ts\";\nimport { getBackend } from \"../backends/registry.ts\";\nimport { runRemoteAsync } from \"../remote.ts\";\nimport { orchDir } from \"../presence/writer.ts\";\nimport { renderTable } from \"../table.ts\";\nimport { spaceName as resolveSpaceName, withinSpaceCeiling } from \"../policy/space.ts\";\nimport { ensureCallerRegistered, selfId, spaceOfAgent } from \"../identity/self.ts\";\nimport { callerKind } from \"../policy/caller.ts\";\nimport { ensureDaemonOrWarn } from \"../daemon/reach.ts\";\nimport { dim } from \"../tui/screen.ts\";\nimport { rpcCall } from \"../daemon/rpc/client.ts\";\nimport { currentLease } from \"../store/lease-rows.ts\";\nimport {\n  agentViewIndex,\n  die,\n  firstNonEmptyText,\n  forbidNonOperatorOverride,\n  presenceById,\n  resultText,\n  splitOptionFlags,\n  viewForKey,\n} from \"./target.ts\";\nimport { isRecord, truncate } from \"../util.ts\";\nimport type { AgentAdapter, SessionView } from \"../types/adapter.ts\";\nimport type { AgentView } from \"../types/store.ts\";\nimport type { PresenceEntry } from \"../types/presence.ts\";\nimport type { OrchSettings } from \"../types/settings.ts\";\nimport type { EnvironmentCapabilityView, StatusRow } from \"../types/command.ts\";\nimport type { Entity } from \"../types/core.ts\";\nimport type { CallerKind } from \"../types/policy.ts\";\n\nconst isTTY = process.stdout.isTTY;\nconst DETACHED_ENVIRONMENT = \"headless\";\n\nexport function formatSpace(id: string | null | undefined, name: string | null | undefined): string {\n  if (!id) return \"-\";\n  return name && name !== id ? `${name} (${id})` : name ?? id;\n}\n\nexport function displaySpace(id: string | null | undefined, resolver: OrchSettings[\"spaces\"]): string {\n  return formatSpace(id, resolveSpaceName(id, resolver));\n}\n\ninterface Provenance {\n  spawnedBy: string | null;\n  spawnedByLabel: string | null;\n  worktree: string | null;\n  branch: string | null;\n  cwd: string | null;\n}\n\n/** Resolve the adapter recorded for one entity (spawn registry, then presence, then backend report). */\nexport function entityAdapter(ent: Entity, views: ReadonlyMap<string, AgentView> = agentViewIndex()): AgentAdapter | undefined {\n  return getAdapter(viewForKey(views, ent.key)?.harnessId ?? ent.presence?.status?.agent ?? ent.agent ?? \"\");\n}\n\nfunction currentOrchId(): string | null {\n  return spawnerIdentity().key;\n}\n\nfunction currentLeaseOwner(directory: string, agentId: string): string | null {\n  try {\n    return currentLease(directory, agentId)?.orchId ?? null;\n  } catch {\n    return null;\n  }\n}\n\nexport function formatOwnerCell(row: Pick<StatusRow, \"owner\">): string {\n  if (row.owner === null) return \"-\";\n  return row.owner.startsWith(NO_ORCH_DRIVER) ? (isTTY ? dim(row.owner) : row.owner) : row.owner;\n}\n\n/** Format a provider/model pair with its optional thinking suffix. */\nfunction formatModel(provider: string | null | undefined, model: string, thinking: string | null | undefined): string {\n  return modelSpec(`${provider ?? \"\"}/${model}`, thinking);\n}\n\n/** Build a model string from a presence status when one is reported. */\nfunction presenceModelString(pres: PresenceEntry | null): string | null {\n  const model = pres?.status?.model;\n  if (!model?.id) return null;\n  return formatModel(model.provider, model.id, pres?.status?.thinking);\n}\n\n/** Build a model string from a session tail when one is reported. */\nfunction sessionModelString(sview: SessionView | null): string | null {\n  if (!sview?.model) return null;\n  return formatModel(sview.provider, sview.model, sview.thinking);\n}\n\n/** Build the \"provider/model:thinking\" display string from presence, session, then adapter default. */\nfunction deriveModelString(pres: PresenceEntry | null, sview: SessionView | null, adapter: AgentAdapter | undefined): string {\n  const presenceModel = presenceModelString(pres);\n  if (presenceModel) return presenceModel;\n  const sessionModel = sessionModelString(sview);\n  if (sessionModel) return sessionModel;\n  const adapterDefault = adapter?.defaultModel?.defaultModelString();\n  return adapterDefault ? `${adapterDefault} (default)` : \"-\";\n}\n\n/** Pick the state label plus its fallback/exited flags: live bridge wins, else backend/session fallback. */\nfunction deriveState(pres: PresenceEntry | null, ent: Entity, sview: SessionView | null): { state: string; stateFallback: boolean; exited: boolean } {\n  if (!pres?.status) {\n    // no live bridge → backend status or session fallback\n    return { state: ent.backendStatus ?? sview?.state ?? (sview ? \"idle\" : \"unknown\"), stateFallback: true, exited: false };\n  }\n  // presence = live bridge → no fallback marker\n  if (!pres.alive) return { state: \"exited\", stateFallback: false, exited: true };\n  return { state: pres.status.asking ? \"asking\" : pres.status.state ?? \"unknown\", stateFallback: false, exited: false };\n}\n\n/** Pick the reported cost: presence first, then session view, else zero. */\nfunction deriveCost(pres: PresenceEntry | null, sview: SessionView | null): number {\n  if (pres?.status && typeof pres.status.cost === \"number\") return pres.status.cost;\n  if (typeof sview?.cost === \"number\") return sview.cost;\n  return 0;\n}\n\n/** Read the context-window percent from presence, or null when unreported. */\nfunction deriveContextPercent(pres: PresenceEntry | null): number | null {\n  if (pres?.status?.context && typeof pres.status.context.percent === \"number\") return pres.status.context.percent;\n  return null;\n}\n\n/** Read a session tail only when the adapter declares that capability. */\nfunction sessionViewFor(ent: Entity, adapter: AgentAdapter | undefined): SessionView | null {\n  if (!adapter?.sessionView || !ent.sessionPath) return null;\n  return adapter.sessionView.readSessionView({ sessionPath: ent.sessionPath }) ?? null;\n}\n\nfunction deriveViewTask(pres: PresenceEntry | null, sview: SessionView | null): string {\n  const question = pres?.status?.asking?.question;\n  return firstNonEmptyText(question ? `Q: ${question}` : undefined, pres?.status?.task, sview?.task);\n}\n\nfunction deriveViewLast(pres: PresenceEntry | null, sview: SessionView | null): string {\n  return firstNonEmptyText(pres?.status?.lastText, resultText(pres?.result), sview?.lastText);\n}\n\n/**\n * The four facts, read apart (A1). Ownership is the open lease; provenance is\n * the immutable spawner; worktree/branch are environment axes; cwd is the\n * agent's own. Nothing here reads a second copy of any of them off one wide row.\n */\nfunction viewProvenance(\n  pres: PresenceEntry | null,\n  view: AgentView | undefined,\n): Provenance {\n  const status = pres?.status ?? null;\n  return {\n    spawnedBy: view?.spawnedBy ?? status?.spawnedBy ?? null,\n    // The spawner's name is a JOIN the composer already makes; a second copy\n    // beside the child goes stale the moment the spawner is renamed.\n    spawnedByLabel: view?.spawnedByName ?? status?.spawnedByLabel ?? null,\n    worktree: view?.environment.worktree ?? status?.worktree ?? null,\n    branch: view?.environment.branch ?? status?.branch ?? null,\n    cwd: view?.cwd ?? status?.cwd ?? null,\n  };\n}\n\n/**\n * The fleet, from the daemon when it answers and from presence files when it does not.\n * orchd already holds this state, so asking it is the cheap path AND the one that keeps a\n * single source of truth; the file scan stays because `orch status` is specified to work\n * with orchd absent.\n */\ninterface FleetSnapshot {\n  rows: StatusRow[];\n  agentsSeen: number;\n  alive: number;\n  /** Whether a backend inventory actually contributed rows to this snapshot. */\n  backendAnswered: boolean;\n}\n\nexport interface StatusResult extends FleetSnapshot {\n  /** Whether the table needs the HOST column for a merged local/remote listing. */\n  host: boolean;\n}\n\n/** Apply liveness-derived state at the row boundary, before any renderer sees it. */\nexport function normalizeStatusRow(row: StatusRow): StatusRow {\n  return { ...row, state: displayStatusState(row) };\n}\n\nfunction snapshot(rows: StatusRow[], backendAnswered: boolean): FleetSnapshot {\n  const normalized = rows.map(normalizeStatusRow);\n  return {\n    rows: normalized,\n    agentsSeen: normalized.length,\n    alive: normalized.filter((row) => row.alive).length,\n    backendAnswered,\n  };\n}\n\n/**\n * A status row that arrived from OUTSIDE this process — the daemon's RPC answer\n * or a remote host's `orch status --json`.\n *\n * Rule 13: this used to be `answer.rows as StatusRow[]`, which is a promise to\n * the compiler about data neither end of the wire has checked. A row that is\n * missing `state` or carries a number where a string belongs then reaches every\n * renderer, and the crash lands far from the boundary that let it in.\n */\nfunction isStatusRow(value: unknown): value is StatusRow {\n  if (!isRecord(value)) return false;\n  const strings = [\"key\", \"model\", \"modelShort\", \"state\"] as const;\n  const nullableStrings = [\n    \"paneId\", \"name\", \"tab\", \"agent\", \"owner\", \"spawnedBy\", \"spawnedByLabel\", \"worktree\",\n    \"branch\", \"cwd\", \"task\", \"dispatchId\", \"lastText\", \"backendStatus\", \"backend\",\n    \"sessionPath\", \"presenceDir\",\n  ] as const;\n  const booleans = [\"managed\", \"focused\", \"stateFallback\", \"exited\", \"alive\", \"presenceOnly\"] as const;\n  for (const field of strings) if (typeof value[field] !== \"string\") return false;\n  for (const field of nullableStrings) if (value[field] !== null && typeof value[field] !== \"string\") return false;\n  for (const field of booleans) if (typeof value[field] !== \"boolean\") return false;\n  if (value.ownerId !== undefined && value.ownerId !== null && typeof value.ownerId !== \"string\") return false;\n  if (value.bridgeAttached !== null && typeof value.bridgeAttached !== \"boolean\") return false;\n  if (typeof value.cost !== \"number\") return false;\n  if (value.ctxPercent !== null && typeof value.ctxPercent !== \"number\") return false;\n  // `capabilities` is a nullable composed view, not a flag bag: null means no\n  // backend owns the row, which is an answer renderers already read (E13/E14).\n  return value.capabilities === null || isRecord(value.capabilities);\n}\n\n/** Keep only the rows that really are rows. A malformed one is dropped at the\n *  boundary rather than carried inward as a lie about its shape. */\nfunction statusRowsFrom(values: readonly unknown[]): StatusRow[] {\n  return values.filter(isStatusRow);\n}\n\nasync function readFleetRows(spaces: OrchSettings[\"spaces\"], offline: boolean): Promise<FleetSnapshot> {\n  if (offline) {\n    const rows = fleetStatusRows(spaces, { offline: true });\n    return snapshot(rows, rows.some((row) => row.backend != null));\n  }\n  try {\n    const answer = await rpcCall(orchDir(), \"status\");\n    if (isRecord(answer) && Array.isArray(answer.rows)) {\n      const rows = statusRowsFrom(answer.rows);\n      // RPC availability is not backend availability; only inventory-bearing rows count.\n      return snapshot(rows, rows.some((row) => row.backend != null));\n    }\n  } catch {\n    // Daemon absent or refusing: fall through to the file protocol.\n  }\n  const rows = fleetStatusRows(spaces);\n  return snapshot(rows, rows.some((row) => row.backend != null));\n}\n\n/**\n * Who is asking, and how far they may see. One rule for every caller: you see what you\n * currently holds, and widening flags are operator-only. An operator sees the machine;\n * a session or agent sees only its open leases, never an agent merely spawned in the past.\n */\nexport interface CallerScope {\n  /** The caller's agent id, or null for an operator without an agent row. */\n  id: string | null;\n  /** The space a session or agent caller may never see past. */\n  ceiling: string | null;\n  kind: CallerKind;\n}\n\nexport function callerScope(): CallerScope {\n  const kind = callerKind();\n  const id = selfId() ?? null;\n  return { id, ceiling: kind === \"operator\" || id === null ? null : spaceOfAgent(id), kind };\n}\n\n/**\n * The rows this caller should see. By default a session or agent sees only the agents\n * whose current lease it holds, so \"is anyone idle?\" never counts another holder's fleet.\n * `--space-wide` is operator-only; an operator sits outside the session scope and sees the\n * machine. `--all-panes` is the separate\n * question of panes orch did not spawn, and `--filter` removes the states it names.\n */\nexport function scopeFleetRows(\n  rows: readonly StatusRow[],\n  opts: { spaceWide: boolean; allPanes: boolean; states?: ReadonlySet<string>; agent?: string; space?: string; caller?: CallerScope },\n): StatusRow[] {\n  const caller: CallerScope = opts.caller ?? { id: null, ceiling: null, kind: \"operator\" };\n  return rows.filter((row) => {\n    if (opts.space !== undefined && row.spaceId !== opts.space) return false;\n    if (opts.agent !== undefined && !statusRowMatches(row, opts.agent)) return false;\n    if (!opts.allPanes && !row.managed) return false;\n    if (!withinSpaceCeiling(row.spaceId, caller.ceiling)) return false;\n    if (caller.kind !== \"operator\" && !opts.spaceWide && (caller.id === null || row.ownerId !== caller.id)) return false;\n    if (opts.states?.has(displayStatusState(row))) return false;\n    // The table is the fleet as it is NOW. An agent that has exited is history —\n    // `orch result` and `orch tail` still read it — and keeping every dead one\n    // that ever recorded a line buried ten working agents under thirty corpses.\n    // Naming one agent in `--agent` is how you ask for it back.\n    return opts.agent !== undefined || (row.alive && !row.exited);\n  });\n}\n\n/** `--agent=<name|id>`: the row's minted id, presence key, name, or current handle. */\nfunction statusRowMatches(row: StatusRow, target: string): boolean {\n  return row.agentId === target || row.key === target || row.name === target || row.paneId === target;\n}\n\nexport function formatNoRowsMessage(info: { agentsSeen: number; alive: number; backendAnswered: boolean }): string {\n  const backend = info.backendAnswered ? \"; backend answered: yes\" : \"\";\n  return `No agents found (agent records seen: ${info.agentsSeen}; alive: ${info.alive}${backend}).\\n`;\n}\n\nexport function displayStatusState(row: Pick<StatusRow, \"state\" | \"alive\" | \"exited\">): string {\n  return row.exited || !row.alive ? \"exited\" : row.state;\n}\n\n/** `--flag=a,b`: the trimmed names after the flag, or null when the caller named none. */\nfunction parseNameList(args: readonly string[], flag: string): Set<string> | null {\n  const argument = args.find((candidate) => candidate.startsWith(flag));\n  if (argument === undefined) return null;\n  const names = argument.slice(flag.length).split(\",\").map((name) => name.trim()).filter((name) => name.length > 0);\n  return names.length === 0 ? null : new Set(names);\n}\n\n/** Every table column by its lower-cased header, with the JSON row keys that carry the same fact. */\nconst STATUS_COLUMN_KEYS: Readonly<Record<string, readonly (keyof StatusRow)[]>> = {\n  host: [\"host\"],\n  id: [\"key\", \"agentId\"],\n  env: [\"paneId\"],\n  name: [\"name\"],\n  owner: [\"owner\"],\n  branch: [\"branch\"],\n  tab: [\"tab\"],\n  agent: [\"agent\"],\n  harness: [\"agent\"],\n  cwd: [\"cwd\"],\n  worktree: [\"worktree\"],\n  model: [\"model\", \"modelShort\"],\n  state: [\"state\", \"stateFallback\", \"exited\"],\n  cost: [\"cost\"],\n  ctx: [\"ctxPercent\"],\n  task: [\"task\"],\n  last: [\"lastText\"],\n};\n\n/** What `--filter` removes: the columns it names and the rows in the states it names. */\nexport interface StatusFilter {\n  columns: ReadonlySet<string>;\n  states: ReadonlySet<string>;\n}\n\nexport const NO_STATUS_FILTER: StatusFilter = { columns: new Set(), states: new Set() };\n\n/** `--filter=owner,env,done`: a column name drops that column; any other name drops rows in that state. */\nfunction parseStatusFilter(args: readonly string[]): StatusFilter {\n  const names = [...(parseNameList(args, \"--filter=\") ?? [])].map((name) => name.toLowerCase());\n  return {\n    columns: new Set(names.filter((name) => name in STATUS_COLUMN_KEYS)),\n    states: new Set(names.filter((name) => !(name in STATUS_COLUMN_KEYS))),\n  };\n}\n\n/** One JSON row with the filtered columns' keys removed. */\nexport function filterRowKeys(row: StatusRow, columns: ReadonlySet<string>): Partial<StatusRow> {\n  const visible: Partial<StatusRow> = { ...row };\n  for (const column of columns) {\n    for (const key of STATUS_COLUMN_KEYS[column] ?? []) delete visible[key];\n  }\n  return visible;\n}\n\n/** The cells (or headers, or caps) that survive `--filter`, matched by header position. */\nfunction visibleColumns<T>(cells: readonly T[], headers: readonly string[], columns: ReadonlySet<string>): T[] {\n  return cells.filter((_, index) => !columns.has((headers[index] ?? \"\").toLowerCase()));\n}\n\n/** `--flag value` or `--flag=value`: the value, or undefined when the caller gave neither. */\nfunction parseValueFlag(args: readonly string[], flag: string): string | undefined {\n  for (let index = 0; index < args.length; index++) {\n    const argument = args[index] ?? \"\";\n    if (argument === flag) return args[index + 1];\n    if (argument.startsWith(`${flag}=`)) return argument.slice(flag.length + 1);\n  }\n  return undefined;\n}\n\nfunction parseSpace(args: readonly string[]): string | undefined {\n  return parseValueFlag(args, \"--space\");\n}\n\n/** `--agent=<name|id>`: one agent to show, whatever its state. */\nfunction parseAgentTarget(args: readonly string[]): string | undefined {\n  const target = parseValueFlag(args, \"--agent\")?.trim();\n  if (target === undefined) return undefined;\n  if (target.length === 0) die(\"--agent needs a name or id, e.g. --agent=ctx-edges\");\n  return target;\n}\n\nexport interface TableFlags {\n  showSpace: boolean;\n  showOwner: boolean;\n  showBranch: boolean;\n  human?: boolean;\n}\n\nexport interface StatusOptions {\n  json: boolean;\n  human: boolean;\n  spaceWide: boolean;\n  allPanes: boolean;\n  /** The columns and states `--filter` removes; both empty by default. */\n  filter: StatusFilter;\n  /** The one agent named with `--agent`, by name or id; undefined means the fleet. */\n  agent?: string;\n  local: boolean;\n  offline: boolean;\n  live: boolean;\n  capacity: boolean;\n  space?: string;\n}\n\n/** What a table renderer needs beyond the rows. */\nexport interface StatusTableOptions {\n  spaceWide: boolean;\n  host: boolean;\n  human?: boolean;\n  /** Columns `--filter` removed. */\n  columns: ReadonlySet<string>;\n}\n\nexport function parseStatusOptions(args: readonly string[]): StatusOptions {\n  const { enabled } = splitOptionFlags([...args], [\"--json\", \"--human\", \"--space-wide\", \"--local\", \"--all-panes\", \"--offline\", \"--live\", \"--capacity\"]);\n  return {\n    json: enabled.has(\"--json\"),\n    human: enabled.has(\"--human\"),\n    spaceWide: enabled.has(\"--space-wide\"),\n    allPanes: enabled.has(\"--all-panes\"),\n    filter: parseStatusFilter(args),\n    agent: parseAgentTarget(args),\n    local: enabled.has(\"--local\"),\n    offline: enabled.has(\"--offline\"),\n    live: enabled.has(\"--live\"),\n    capacity: enabled.has(\"--capacity\"),\n    space: parseSpace(args),\n  };\n}\n\nfunction tableFlags(rows: readonly StatusRow[], spaceWide: boolean, human: boolean): TableFlags {\n  return {\n    showSpace: spaceWide && new Set(rows.map((row) => row.spaceId ?? \"-\")).size > 1,\n    // A column every row agrees on tells you nothing and costs 32 characters a\n    // line: \"no orch driving it (holder gone)\" repeated twenty-five times said\n    // only what the state column already said. It appears when owners DIFFER.\n    showOwner: new Set(rows.map((row) => row.owner ?? \"-\")).size > 1,\n    showBranch: rows.some((row) => row.branch),\n    human,\n  };\n}\n\nfunction tableOptionalCells(row: StatusRow, flags: TableFlags): string[] {\n  const cells: string[] = [];\n  if (flags.showOwner) cells.push(formatOwnerCell(row));\n  if (flags.showBranch) cells.push(row.branch ?? \"-\");\n  return cells;\n}\n\nfunction localIdCell(row: StatusRow): string {\n  if (row.warning) return \"-\";\n  return (row.agentId ?? row.key) + (row.focused ? \"*\" : \"\");\n}\n\nfunction environmentCell(row: StatusRow): string {\n  if (row.warning) return \"-\";\n  const handle = row.paneId;\n  // The column says WHERE an agent is, so it carries a coordinate. A detached\n  // agent's handle is a process record instead, and printing it raw put\n  // `{\"pid\":32…` in the column on every headless row.\n  if (handle === null || handle.startsWith(\"{\")) return DETACHED_ENVIRONMENT;\n  return handle;\n}\n\nfunction localNameCell(row: StatusRow, flags: TableFlags): string {\n  const name = row.name ?? (row.warning ? \"WARNING\" : \"\");\n  return flags.showSpace ? `${formatSpace(row.spaceId, row.spaceName)} / ${name}` : name;\n}\n\nfunction tableStateCell(row: StatusRow, includeFallback: boolean): string {\n  return displayStatusState(row) + (includeFallback && row.stateFallback ? \"?\" : \"\") + (row.staleExtension ? \" (stale)\" : \"\");\n}\n\nfunction tableCostCell(row: StatusRow): string {\n  return row.cost > 0 ? \"$\" + row.cost.toFixed(2) : \"\";\n}\n\nfunction tableContextCell(row: StatusRow): string {\n  return row.ctxPercent != null ? `${Math.round(row.ctxPercent)}%` : \"\";\n}\n\nfunction tableRow(row: StatusRow, flags: TableFlags, host: boolean): string[] {\n  if (flags.human) {\n    return [\n      ...(host ? [row.host ?? \"local\"] : []), row.name ?? (row.warning ? \"WARNING\" : \"-\"),\n      row.agent ?? \"-\", truncate(row.cwd ?? \"-\", 30), truncate(row.worktree ?? \"-\", 24),\n      truncate(row.branch ?? \"-\", 20), formatOwnerCell(row), tableStateCell(row, true),\n    ];\n  }\n  const prefix = host\n    ? [row.host ?? \"local\", localIdCell(row), environmentCell(row), localNameCell(row, flags)]\n    : [localIdCell(row), environmentCell(row), localNameCell(row, flags)];\n  return [\n    ...prefix, ...tableOptionalCells(row, flags), row.tab ?? \"-\", row.agent ?? \"-\",\n    row.modelShort || row.model || \"-\", tableStateCell(row, true), tableCostCell(row),\n    tableContextCell(row), truncate(collapse(row.task ?? \"\"), 40), truncate(collapse(row.lastText ?? \"\"), 50),\n  ];\n}\n\nfunction ownerBranchHeaders(flags: TableFlags): string[] {\n  const columns: string[] = [];\n  if (flags.showOwner) columns.push(\"OWNER\");\n  if (flags.showBranch) columns.push(\"BRANCH\");\n  return columns;\n}\n\n/** The one lease every row shares, or null when they disagree or none is known.\n *  A shared fact is stated once under the table instead of in every line (F6:\n *  the fact must still READ, and one line reads better than twenty-five). */\nfunction sharedOwner(rows: readonly StatusRow[]): string | null {\n  const owners = new Set(rows.map((row) => row.owner).filter((owner): owner is string => owner !== null));\n  return owners.size === 1 && rows.every((row) => row.owner !== null) ? [...owners][0]! : null;\n}\n\nfunction ownerBranchCaps(flags: TableFlags): number[] {\n  const caps: number[] = [];\n  // Wide enough for the whole unleased sentence: F6 says the row must READ as\n  // \"no orch driving it (holder gone)\", and \"no orch driving i...\" does not.\n  // The column only grows to the cap when a value needs it.\n  if (flags.showOwner) caps.push(32);\n  if (flags.showBranch) caps.push(24);\n  return caps;\n}\n\nfunction tableColumns(flags: TableFlags, host: boolean): { headers: string[]; caps: number[] } {\n  if (flags.human) {\n    return {\n      headers: [...(host ? [\"HOST\"] : []), \"NAME\", \"HARNESS\", \"CWD\", \"WORKTREE\", \"BRANCH\", \"OWNER\", \"STATE\"],\n      caps: [...(host ? [10] : []), 20, 10, 30, 24, 20, 32, 12],\n    };\n  }\n  return {\n    // Every cap is a promise the line still fits a terminal. TASK is the prompt\n    // you sent and LAST is what came back; both used to spend 90 characters\n    // repeating a repo path, and the row scrolled off the right of the screen.\n    headers: [...(host ? [\"HOST\"] : []), \"ID\", \"ENV\", \"NAME\", ...ownerBranchHeaders(flags), \"TAB\", \"AGENT\", \"MODEL\", \"STATE\", \"COST\", \"CTX\", \"TASK\", \"LAST\"],\n    caps: [...(host ? [10] : []), 12, 10, 14, ...ownerBranchCaps(flags), 8, 6, 20, 10, 6, 4, 24, 34],\n  };\n}\n\n/**\n * The local status table as text: header, rule, one line per row.\n *\n * Exported because the ASSEMBLY is the thing worth guarding — a column that the\n * header announces must carry its cell in every row. Verifying the owner FACT on\n * a row said nothing about whether the rendered table still shows it.\n */\n/** Render either local or merged rows. The merged form differs only by HOST. */\nexport function renderStatusTable(rows: readonly StatusRow[], flags: TableFlags, options: { host: boolean; columns: ReadonlySet<string> }): string {\n  if (!rows.length) return \"\";\n  const { headers, caps } = tableColumns(flags, options.host);\n  const cells = rows.map((row) => visibleColumns(tableRow(row, flags, options.host), headers, options.columns));\n  const rendered = renderTable(visibleColumns(headers, headers, options.columns), cells, visibleColumns(caps, headers, options.columns)).split(\"\\n\");\n  const out: string[] = [rendered[0] ?? \"\", rendered[1] ?? \"\"];\n  for (let index = 0; index < rows.length; index++) {\n    const line = rendered[index + 2] ?? \"\";\n    out.push(rows[index]?.exited ? (isTTY ? dim(line) : line) : line);\n  }\n  const shared = sharedOwner(rows);\n  if (!flags.showOwner && !options.columns.has(\"owner\") && shared !== null) out.push(`owner: ${shared}`);\n  return out.join(\"\\n\");\n}\n\n/** Render the status table for any row set without writing to a stream. */\nexport function formatStatusTable(rows: readonly StatusRow[], options: StatusTableOptions): string {\n  return renderStatusTable(rows, tableFlags(rows, options.spaceWide, options.human === true), { host: options.host, columns: options.columns });\n}\n\nexport function localStatusTable(visible: readonly StatusRow[], spaceWide: boolean): string {\n  return formatStatusTable(visible, { spaceWide, host: false, columns: NO_STATUS_FILTER.columns });\n}\n\ninterface OrchNames {\n  agentId: string | null;\n  agentName: string | null;\n  rootAgentId: string | null;\n  rootAgentName: string | null;\n  spaceId: string | null;\n  spaceName: string | null;\n}\n\n/** Read names and environment from the already-loaded normalized agent views. */\nfunction orchNames(key: string, views: ReadonlyMap<string, AgentView>): OrchNames {\n  const agent = views.get(key);\n  if (!agent) return { agentId: key, agentName: null, rootAgentId: null, rootAgentName: null, spaceId: null, spaceName: null };\n  const root = views.get(agent.rootAgentId);\n  return {\n    agentId: key,\n    agentName: agent.name,\n    rootAgentId: agent.rootAgentId,\n    rootAgentName: root?.name ?? null,\n    spaceId: agent.environment.space,\n    spaceName: null,\n  };\n}\n\n/** What this environment can actually do, read from the roles it composes. */\nfunction backendCapabilities(entity: Entity): EnvironmentCapabilityView | null {\n  if (entity.backend === null) return null;\n  const backend = getBackend(entity.backend);\n  if (!backend) return null;\n  return {\n    spaceHome: backend.spaceHome !== null,\n    identity: backend.identity !== null,\n    handleLookup: backend.handleLookup !== null,\n    logPruning: backend.logPruning !== null,\n  };\n}\n\n/** Compose one entity directly into the single row shape used everywhere. */\nexport function statusRowFromEntity(\n  entity: Entity,\n  views: ReadonlyMap<string, AgentView>,\n  staleHashes: ReadonlySet<string> | undefined = new Set(shippedBundleHashes()),\n  spaces: OrchSettings[\"spaces\"] = {},\n  orchId: string | null = null,\n  directory?: string,\n): StatusRow {\n  const pres = entity.presence;\n  const adapter = entityAdapter(entity, views);\n  const sview = sessionViewFor(entity, adapter);\n  const agentView = viewForKey(views, entity.key);\n  const modelFull = deriveModelString(pres, sview, adapter);\n  const { state, stateFallback, exited } = deriveState(pres, entity, sview);\n  const provenance = viewProvenance(pres, agentView);\n  const alive = pres?.alive ?? false;\n  const spaceNames = orchNames(entity.key, views);\n  const spaceId = spaceNames.spaceId ?? entity.space;\n  const ownership = directory === undefined\n    ? { owner: NO_ORCH_DRIVER, ownerId: null }\n    : { owner: deriveDriveState(entity.key, { currentOrchId: orchId, directory }).owner, ownerId: currentLeaseOwner(directory, entity.key) };\n  return {\n    key: entity.key,\n    agentId: spaceNames.agentId,\n    rootAgentId: spaceNames.rootAgentId,\n    rootAgentName: spaceNames.rootAgentName,\n    paneId: entity.paneId,\n    managed: entity.managed,\n    name: spaceNames.agentName ?? (entity.managed === false ? null : entity.name),\n    tab: entity.tabLabel,\n    agent: entity.agent,\n    owner: ownership.owner,\n    ownerId: ownership.ownerId,\n    ...provenance,\n    focused: entity.focused,\n    model: modelFull,\n    modelShort: modelFull.replace(/^openai-codex\\//, \"\"),\n    state: displayStatusState({ state, alive, exited }),\n    stateFallback,\n    staleExtension: isBridgeExtensionStale(pres?.status?.extensionHash, undefined, staleHashes),\n    exited,\n    alive,\n    cost: deriveCost(pres, sview),\n    ctxPercent: deriveContextPercent(pres),\n    // Collapse deliberately at the row boundary so JSON and table cells agree.\n    task: collapse(deriveViewTask(pres, sview)),\n    dispatchId: pres?.status?.dispatchId ?? null,\n    lastText: collapse(deriveViewLast(pres, sview)),\n    backendStatus: entity.backendStatus,\n    backend: entity.backend,\n    capabilities: backendCapabilities(entity),\n    sessionPath: entity.sessionPath,\n    presenceDir: pres?.dir ?? null,\n    presenceOnly: entity.presenceOnly,\n    bridgeAttached: null,\n    tokens: sview?.tokens ?? pres?.status?.tokens ?? null,\n    turns: pres?.status?.turns ?? sview?.turns ?? null,\n    spaceId,\n    spaceName: spaceNames.spaceName ?? resolveSpaceName(spaceId, spaces),\n  };\n}\n\n/**\n * Every agent orch knows about, in the ONE row shape the daemon serves and every\n * renderer consumes. Unscoped and unfiltered on purpose: the daemon cannot know the\n * caller's space, so scoping and visibility belong to the command that renders.\n */\ninterface FleetStatusOptions {\n  offline?: boolean;\n  bundleHashes?: () => ReadonlySet<string>;\n  orchId?: () => string | null;\n  /** Resolve the store root once per fleet build (injectable for cost tests). */\n  directory?: () => string;\n}\n\nexport function fleetStatusRows(spaces: OrchSettings[\"spaces\"], options: FleetStatusOptions = {}): StatusRow[] {\n  const directory = options.directory?.() ?? orchDir();\n  const views = agentViewIndex();\n  const staleHashes = options.bundleHashes?.() ?? new Set(shippedBundleHashes());\n  // Resolve these process-wide inputs once so a fleet never performs a caller\n  // lookup for every individual row.\n  const orchId = options.orchId?.() ?? currentOrchId();\n  return sortEntities(buildEntities({ skipBackends: options.offline === true }))\n    .map((entity) => statusRowFromEntity(entity, views, staleHashes, spaces, orchId, directory));\n}\n\n/** The local half of a merged remote listing: the same scoped rows, stamped `local`. */\nasync function localStatusRows(options: StatusOptions, spaces: OrchSettings[\"spaces\"], caller?: CallerScope): Promise<FleetSnapshot> {\n  const snapshot = await readFleetRows(spaces, options.offline);\n  const scoped = scopeFleetRows(snapshot.rows, { ...options, states: options.filter.states, caller });  return { ...snapshot, rows: scoped.map((row) => ({ ...row, host: \"local\" })) };\n}\n\nexport function warningStatusRow(host: string, warning: string): StatusRow {\n  return {\n    key: `warning:${host}`, paneId: null, managed: false, name: \"WARNING\", owner: null, ownerId: null,\n    spawnedBy: null, spawnedByLabel: null, worktree: null, branch: null, cwd: null, tab: null, agent: null,\n    focused: false, model: \"\", modelShort: \"\", state: \"warning\", stateFallback: false, staleExtension: false,\n    exited: false, alive: false, cost: 0, ctxPercent: null, task: warning, dispatchId: null, lastText: null,\n    backendStatus: null, backend: null, capabilities: null, sessionPath: null, presenceDir: null, presenceOnly: false,\n    bridgeAttached: null, tokens: null, turns: null, host, warning,\n  };\n}\n\ntype RemoteStatusResult = Awaited<ReturnType<typeof runRemoteAsync>>;\n\nasync function remoteStatusResults(hosts: OrchSettings[\"hosts\"], offline: boolean): Promise<{ name: string; result: RemoteStatusResult }[]> {\n  return Promise.all(Object.entries(hosts).map(async ([name, host]) => ({\n    name,\n    result: await runRemoteAsync(name, host, [\"status\", ...(offline ? [\"--offline\"] : [])], { timeoutMs: host.timeout_ms }),\n  })));\n}\n\nfunction validRemoteValues(result: RemoteStatusResult): StatusRow[] {\n  if (!result.ok || !Array.isArray(result.value)) return [];\n  return statusRowsFrom(result.value);\n}\n\n/** The narrowing a remote host's rows still owe after they arrive: one space, one agent. */\ninterface RemoteNarrowing {\n  space?: string;\n  agent?: string;\n}\n\nfunction remoteRowsFromResult(name: string, result: RemoteStatusResult, narrowing: RemoteNarrowing): StatusRow[] {\n  if (!result.ok) return [warningStatusRow(name, result.failure.message)];\n  if (!Array.isArray(result.value)) return [warningStatusRow(name, `Host \"${name}\" returned an invalid status payload.`)];\n  return validRemoteValues(result).map((value) => normalizeStatusRow(value))\n    .filter((row) => narrowing.space === undefined || row.spaceId === narrowing.space)\n    .filter((row) => narrowing.agent === undefined || statusRowMatches(row, narrowing.agent))\n    .map((row) => ({ ...row, host: name }));\n}\n\nfunction mergeRemoteStatusRows(local: readonly StatusRow[], remoteResults: readonly { name: string; result: RemoteStatusResult }[], narrowing: RemoteNarrowing): StatusRow[] {\n  return [...local, ...remoteResults.flatMap(({ name, result }) => remoteRowsFromResult(name, result, narrowing))];\n}\n\nfunction remoteSummary(remoteResults: readonly { result: RemoteStatusResult }[]): { rows: StatusRow[]; alive: number; backendAnswered: boolean } {\n  const rows = remoteResults.flatMap(({ result }) => validRemoteValues(result));\n  return { rows, alive: rows.filter((row) => row.alive).length, backendAnswered: rows.some((row) => row.backend != null) };\n}\n\n/** Fetch and scope the same rows used by both the one-shot and live status views. */\nexport async function readStatusResult(options: StatusOptions, caller: CallerScope = callerScope()): Promise<StatusResult> {\n  const settings = loadSettingsOrNull(orchDir());\n  const hosts = settings?.hosts ?? {};\n  const spaces = settings?.spaces ?? {};\n  if (options.local || caller.kind !== \"operator\" || Object.keys(hosts).length === 0) {\n    const local = await localStatusRows(options, spaces, caller);\n    return { ...local, host: false };\n  }\n  const localSnapshot = await localStatusRows(options, spaces, caller);\n  const remoteResults = await remoteStatusResults(hosts, options.offline);\n  const rows = mergeRemoteStatusRows(localSnapshot.rows, remoteResults, { space: options.space, agent: options.agent });\n  const remote = remoteSummary(remoteResults);\n  return {\n    rows,\n    agentsSeen: localSnapshot.agentsSeen + remote.rows.length,\n    alive: localSnapshot.alive + remote.alive,\n    backendAnswered: localSnapshot.backendAnswered || remote.backendAnswered,\n    host: true,\n  };\n}\n\nfunction capacityOutput(settings: OrchSettings): { capacity: ReturnType<typeof computeFleetCapacity>; line: string } {\n  const capacity = computeFleetCapacity(agentViewIndex(), presenceById(), settings);\n  return { capacity, line: formatCapacityLine(capacity, currentOrchId() ?? undefined) };\n}\n\n/** The one-shot status table. `--live` is routed away before this runs (`status-verb.ts`). */\nexport async function cmdStatus(options: StatusOptions): Promise<void> {\n  if (!options.offline) {\n    await ensureDaemonOrWarn(orchDir());\n    await ensureCallerRegistered();\n  }\n  const caller = callerScope();\n  if (options.spaceWide) forbidNonOperatorOverride(\"--space-wide\");\n  if (options.allPanes) forbidNonOperatorOverride(\"--all-panes\");\n  if (options.capacity) {\n    const settings = loadSettingsOrNull(orchDir());\n    if (settings === null) throw new Error(\"capacity unavailable: settings.json does not exist\");\n    const output = capacityOutput(settings);\n    if (options.json) {\n      process.stdout.write(JSON.stringify({ capacity: output.capacity }, null, 2) + \"\\n\");\n    } else {\n      process.stdout.write(output.line + \"\\n\");\n    }\n    return;\n  }\n  const result = await readStatusResult(options, caller);\n  const settings = options.json ? null : loadSettingsOrNull(orchDir());\n  if (options.json) {\n    process.stdout.write(JSON.stringify(result.rows.map((row) => filterRowKeys(row, options.filter.columns)), null, 2) + \"\\n\");\n    return;\n  }\n  const capacityLine = settings === null ? null : capacityOutput(settings).line;\n  if (!result.rows.length) {\n    process.stdout.write(formatNoRowsMessage(result));\n    if (capacityLine !== null) process.stdout.write(capacityLine + \"\\n\");\n    return;\n  }\n  process.stdout.write(formatStatusTable(result.rows, { spaceWide: options.spaceWide, host: result.host, human: options.human, columns: options.filter.columns }) + \"\\n\");\n  if (capacityLine !== null) process.stdout.write(capacityLine + \"\\n\");\n}\n"

      at <anonymous> (/home/bryan/orch/packages/orch/test/offline-is-not-a-second-source.test.ts:111:20)
(fail) --offline is a narrower view of ONE source, not a second one (M8) > offline is the one path that never dials or starts the daemon [1.10ms]

packages/orch/test/one-writer-records-a-spawned-agent.test.ts:
(pass) one writer records a spawned agent (2.1) > registerSpawnedAgent alone writes the COMPLETE record — space and lease included [214.88ms]
(pass) one writer records a spawned agent (2.1) > a spawn leaves NOTHING for a second writer to fill in [142.32ms]
(pass) one writer records a spawned agent (2.1) > a spawn into NO space records no space and hands the plexer only its coordinate [174.16ms]
(pass) one writer records a spawned agent (2.1) > the presence store no longer offers a second way to record an agent [0.37ms]

packages/orch/test/spawn-registry.test.ts:
(pass) spawn agent registration > writes the hub, environment, tuning, and lease [191.16ms]
(pass) spawn agent registration > an agent that states no plexer and no handle gets neither row [155.32ms]
(pass) spawn agent registration > worktree row is present only for a worktree launch [254.96ms]
(pass) spawn agent registration > an unknown or absent spawner produces a root pack of one and no lease [189.96ms]

packages/orch/test/settings-repair.test.ts:
(pass) settings repair choices > offers rename, set, drop, then leave when all repairs apply [3.37ms]
(pass) settings repair choices > offers only rename when there is only a suggestion [0.08ms]
(pass) settings repair choices > offers only set when there is only an expected value [0.04ms]
(pass) settings repair choices > always offers leave, and cannot drop a file-level defect [0.03ms]
(pass) settings repair reducer > starts every defect at leave and focus at zero [0.11ms]
(pass) settings repair reducer > refuses choices the focused defect does not offer and reports why [0.32ms]
(pass) settings repair reducer > clamps focus at both ends and clears a prior reason [0.14ms]
(pass) settings repair reducer > maps non-leave choices to repairs in defect order [0.24ms]
(pass) settings repair reducer > leave produces no repair [0.05ms]
(pass) settings repair reducer > empty defects make every action a no-op [0.06ms]

packages/orch/test/backend-headless.test.ts:
(pass) HeadlessBackend > refuses to spawn with no prompt — a headless agent runs its prompt and exits [0.63ms]
(pass) HeadlessBackend > spawns a detached process and records its handle [116.63ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [71.00ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [46.77ms]
(pass) HeadlessBackend > signals a matching recorded process through the injected killer [0.45ms]
(pass) HeadlessBackend > refuses to signal a pid whose process instance was replaced [0.27ms]
(pass) HeadlessBackend > never signals a dead pid [0.14ms]

packages/orch/test/commands-spawn.test.ts:
(pass) commands/spawn > refuses an invalid name before resolving or creating a workspace [3.63ms]
(pass) commands/spawn > refuses spawn without a name before any spawn mutations [37.51ms]
(pass) commands/spawn > rejects removed spawn cap flag as unknown [0.18ms]
(pass) commands/spawn > rejects --detached as an unknown spawn flag [1.97ms]
(pass) commands/spawn > the positionals are the agent names [0.18ms]
(pass) commands/spawn > collects repeated prompts in agent order [0.06ms]
(pass) commands/spawn > each pi flavor launches its own binary and preserves raw prompt [0.18ms]

packages/orch/test/queue-reaping.test.ts:
(pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > a failed task whose scope is gone is unrunnable and survives every retention sweep [64.03ms]
(pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > unrunnable is about who is alive now — a new pack member makes it claimable again [56.11ms]
(pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > stale is surfaced beside its state and never deleted on age [52.17ms]
(pass) Cq12: an orphaned task has take-on, leave and reap, all deliberate > take-on re-scopes to the taker's own pack and the work becomes claimable there [210.34ms]
(pass) Cq12: an orphaned task has take-on, leave and reap, all deliberate > take-on refuses a taker that is not itself live [730.29ms]

packages/orch/test/broker-governance.test.ts:
(pass) daemon governWrite enforcement > an unscoped actor is refused while a live orch holds the lease [106.88ms]
(pass) daemon governWrite enforcement > an unscoped actor may write to an unleased target [57.73ms]
(pass) daemon governWrite enforcement > the lease holder may write to its own agent [103.93ms]
(pass) daemon governWrite enforcement > a foreign live holder in the same space is refused and named [69.50ms]
(pass) daemon governWrite enforcement > a dead holder is not a collision [70.64ms]
(pass) daemon governWrite enforcement > --steal on a driving verb does not take a live holder's lease [89.35ms]
(pass) daemon governWrite enforcement > a cross-space write is refused by the wall before the lease [101.35ms]
(pass) daemon governWrite enforcement > --cross-space clears the wall but the lease still applies [86.44ms]
(pass) daemon governWrite enforcement > the space operator writes to a same-space leased agent without taking the lease [69.48ms]
(pass) daemon governWrite enforcement > a foreign space's operator still hits the wall [74.29ms]
(pass) daemon governWrite enforcement > a refused enqueue leaves the lease exactly as it was [57.67ms]
(pass) daemon governWrite enforcement > a granted write and its enqueue commit together [61.08ms]
(pass) daemon governWrite enforcement > an unleased target is writable by any same-space actor [107.56ms]

packages/orch/test/unleased-agents.test.ts:
(pass) registration unleased agent hint > includes unleased workers but never session identities [61.72ms]

packages/orch/test/ambiguous-target-says-what-to-do.test.ts:
(pass) an ambiguous target names the failure and the way out (U3) > the message names the failure, the target string, and every candidate [0.20ms]
(pass) an ambiguous target names the failure and the way out (U3) > it says what to send instead, so the caller is not left guessing [0.11ms]
(pass) an ambiguous target names the failure and the way out (U3) > it is a refusal, not an exit — the caller can act on it [0.05ms]
(pass) an ambiguous target names the failure and the way out (U3) > resolveAgentView raises that same one message [0.31ms]

packages/orch/test/bridge-links.test.ts:
(pass) bridge links > attach holds the link under the canonical key and push reaches it [60.80ms]
(pass) bridge links > a second attach for the same key replaces the first [71.88ms]
(pass) bridge links > detach removes only the link still held [59.76ms]
(pass) bridge links > push with no link throws BridgeDetachedError [53.34ms]
(pass) bridge links > an unknown target is refused before the registry is consulted [0.72ms]
(pass) bridge message guards > accept every action shape [0.43ms]
(pass) bridge message guards > refuse a missing field, an unknown action, and a non-record [0.34ms]
(pass) bridge message guards > a delivery is an id plus a message [0.25ms]

packages/orch/test/space-walls.test.ts:
(pass) space helpers > reads space ids from the environment satellite, never from the key [1.90ms]
(pass) space helpers > an agent that moves space keeps its identity and reports the new space [7.84ms]
(pass) space helpers > derives an entity space from the store [2.25ms]
(pass) space helpers > returns the same entities when all spaces are requested [0.67ms]
(pass) space wall writes > allows a write within the same space [1.29ms]
(pass) space wall writes > denies a cross-space write with both spaces in the reason [0.79ms]
(pass) space wall writes > applies the same wall rule whatever plexer the agents sit in [4.76ms]
(pass) space wall writes > allows a cross-space write with an explicit override [2.38ms]
(pass) space wall writes > allows unplaced targets [1.39ms]

packages/orch/test/one-query-stack-over-the-connection.test.ts:
(pass) one query stack over the connection (2.3) > the store exposes no raw-SQL port beside the typed one [0.09ms]
(pass) one query stack over the connection (2.3) > nothing in the repo prepares a statement through the deleted port [19.33ms]

packages/orch/test/presence-dirs-are-reaped-not-migrated.test.ts:
(pass) a presence dir in the old shape is reaped, never migrated (J4) > a composite-named dir is not presence, whatever its file claims [64.52ms]
(pass) a presence dir in the old shape is reaped, never migrated (J4) > the sweep REMOVES it rather than leaving it for a migration that never comes [51.96ms]
(pass) a presence dir in the old shape is reaped, never migrated (J4) > nothing renames, rewrites or re-keys the old directory [1.00ms]
(pass) a presence dir in the old shape is reaped, never migrated (J4) > a dead dir in the CURRENT shape is still reaped the ordinary way [48.79ms]

packages/orch/test/store-catalogue.test.ts:
(pass) catalogue rows > empty store reads an empty Map [26.24ms]
(pass) catalogue rows > write then read round-trips at and stdout [31.10ms]
(pass) catalogue rows > writing the same command twice keeps one row with newer values [39.33ms]
(pass) catalogue rows > an entry with empty stdout is not stored [26.09ms]
(pass) catalogue rows > clearCatalogues empties the store [39.10ms]
(pass) catalogue rows > two commands coexist and updating one does not touch the other [35.24ms]

packages/orch/test/events-open-with-pending-questions.test.ts:
(pass) events pending-question snapshot > a late watcher receives every open question through the event writer [57.63ms]

packages/orch/test/spawn-limits.test.ts:
(pass) spawn limits > schema loads global and workspace caps [1.02ms]
(pass) spawn limits > rejects invalid cap %s with file and key [1.02ms]
(pass) spawn limits > rejects invalid cap %s with file and key [0.36ms]
(pass) spawn limits > rejects invalid cap %s with file and key [0.52ms]
(pass) spawn limits > omitted fleet caps normalize to defaults [0.47ms]
(pass) spawn limits > global boundary refusal data counts the whole request [2.46ms]
(pass) spawn limits > one workspace may use the full global allotment [1.44ms]
(pass) spawn limits > workspace cap is independent of global headroom [1.11ms]
(pass) spawn limits > uncapped space is bounded only by global count [1.12ms]
(pass) spawn limits > foreign pack members do not consume the caller's pack cap [2.80ms]
(pass) spawn limits > an agent whose recorded process is gone frees capacity [1.78ms]
(pass) spawn limits > foreign panes never count [1.14ms]
(pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [1.09ms]
(pass) spawn limits > doctor accepts satisfiable limits [0.73ms]

packages/orch/test/store-values.test.ts:
(pass) store row values > uses null for optional database values without JSON text [0.06ms]
(pass) store row values > sets only non-null fields [0.11ms]

packages/orch/test/agent-model-unwelded.test.ts:
(pass) A1 — the four facts are never welded > no table welds identity, provenance, ownership and environment into one row [0.73ms]
(pass) A1 — the four facts are never welded > ownership is a lease table, not a second id space [0.54ms]
(pass) A1 — the four facts are never welded > the agents hub carries identity and provenance only [0.25ms]
(pass) A1 — the four facts are never welded > no table anywhere carries a lifetime [6.98ms]

packages/orch/test/orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [83.62ms]

packages/orch/test/status-headless.test.ts:
(pass) headless status visibility > drops an exited agent that finished, however much it recorded [3.19ms]
(pass) headless status visibility > --filter removes the states it names; --agent brings one dead agent back [0.23ms]
(pass) headless status visibility > --filter drops live rows in the states it names [0.09ms]
(pass) headless status visibility > drops a dead row with no result or terminal state [0.07ms]
(pass) headless status visibility > keeps a live row [0.06ms]
(pass) headless status visibility > --space-wide widens the scope without resurrecting empty dead rows [0.05ms]
(pass) headless status visibility > uses agent language without backend details when no backend was asked [0.10ms]

packages/orch/test/seat-index.test.ts:
(pass) seat pure seams > errorMessage preserves non-Error thrown values [5.09ms]
(pass) seat pure seams > hasTheme discriminates missing and valid themes [9.79ms]
(pass) seat pure seams > countStates groups active, blocked, failed, and settled states [0.17ms]
(pass) seat pure seams > formatSeatStatus renders state counts and view hint [0.20ms]
(pass) seat pure seams > reconcileDashboardSelection preserves id and guards missing snapshots [0.18ms]

packages/orch/test/queue-cli-scope.test.ts:
(pass) Cq2: all three scopes are choosable at enqueue > --agent, --pack and --space each select exactly one typed scope [59.04ms]
(pass) Cq2: all three scopes are choosable at enqueue > a name resolves to one id, and an ambiguous name asks for the id [45.05ms]
(pass) Cq2: all three scopes are choosable at enqueue > two scope flags at once are refused [50.30ms]
(pass) Cq9: reading the queue is open > listing and history carry no caller and hide no other pack's work [50.98ms]

packages/orch/test/orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [4.80ms]
(pass) orchd RPC transports > round-trips over the TCP fallback transport [6.22ms]

packages/orch/test/settings-repair-roundtrip.test.ts:
(pass) repairing a settings.json the schema rejects > reports every rejected key without touching the file [2.45ms]
(pass) repairing a settings.json the schema rejects > a removed key is never guessed at - it offers no rename [1.50ms]
(pass) repairing a settings.json the schema rejects > the choices a person makes leave the file loadable [2.36ms]
(pass) repairing a settings.json the schema rejects > a typo keeps its value: renaming carries it to the real key [1.69ms]
(pass) repairing a settings.json the schema rejects > leaving every defect alone writes nothing at all [1.29ms]

packages/orch/test/pi-model-control.test.ts:
(pass) splitThinkingSuffix > splits a valid ladder effort off the bare id [0.07ms]
(pass) splitThinkingSuffix > leaves a bare model untouched [0.05ms]
(pass) splitThinkingSuffix > keeps a trailing colon token that is not a thinking level as part of the id [0.04ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > looks up the BARE id and returns the effort suffix separately [0.30ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > retries until a still-booting registry answers [2.46ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > throws when the registry never yields the model [0.25ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > rejects a token without a provider/id shape [0.09ms]
(pass) createModelControl.applyControlCommand > applies a suffixed model command and records a success outcome [0.51ms]
(pass) createModelControl.applyControlCommand > records a failure outcome when the model is rejected [1756.45ms]

packages/orch/test/doctor-backends.test.ts:
(pass) doctor backend and presence checks > reports every registered backend and composed roles [0.76ms]
(pass) doctor backend and presence checks > passes with herdr active while an enabled tmux sits outside a session [0.09ms]
(pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.06ms]
(pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [0.08ms]
(pass) doctor backend and presence checks > fails when any enabled backend is unavailable, active or not [0.06ms]
(pass) doctor backend and presence checks > honours the configured default over the probe order [0.11ms]
(pass) doctor backend and presence checks > reports only records missing the current schema stamp [26.85ms]

packages/orch/test/os-side.test.ts:
(pass) osSide > supports both platform branches independent of ambient host [0.03ms]

packages/orch/test/commands-events.test.ts:
(pass) commands/events > owned renderers and tool help do not expose the retired workspace term [0.30ms]
(pass) commands/events > bare events is scoped to this session's agents and renders readable lines [0.05ms]
(pass) commands/events > parses the scope flags [0.04ms]
(pass) commands/events > parses the wake-up flags [0.04ms]
(pass) commands/events > --filter names the states to drop and is never the default [0.09ms]
(pass) commands/events > includes an adopted agent whose open lease is mine [0.04ms]
(pass) commands/events > includes a reused pane leased by me even when another session spawned it [0.02ms]
(pass) commands/events > includes an unleased agent spawned by this session [0.02ms]
(pass) commands/events > excludes an agent spawned by a different session [0.01ms]
(pass) commands/events > --space-wide passes agents from both sessions [0.03ms]
(pass) commands/events > excludes an agent while another orch holds its lease [0.02ms]
(pass) commands/events > describes durable replay and reports pruned history gaps [0.05ms]
(pass) commands/events > names one agent by name or by identity key [0.04ms]
(pass) commands/events > a subscription with no daemon keeps redialing instead of exiting [0.14ms]
(pass) commands/events > renders opaque plexer coordinates without relabeling them as spaces [0.27ms]
(pass) commands/events > an event line says what happened, never the fleet's books [0.13ms]
(pass) commands/events > rejects malformed event and labels sinks [0.10ms]
(pass) commands/events space wall > an agent is heard only inside the space it currently occupies [43.35ms]
(pass) commands/events space wall > moving an agent moves its events with it [55.33ms]
(pass) commands/events space wall > an unplaced caller has no wall and hears the machine [47.39ms]
(pass) commands/events space wall > a key naming no registered agent is in no space [0.30ms]

packages/orch/test/close-reports-every-target.test.ts:
(pass) close reports an outcome for every target it was given (U2) > --json carries a per-target outcome, not just the successes [72.09ms]
(pass) close reports an outcome for every target it was given (U2) > a failed target reports outcome error WITH the real error text [56.36ms]
(pass) close reports an outcome for every target it was given (U2) > a pane the plexer no longer has is CLOSED, not failed [51.63ms]
(pass) close reports an outcome for every target it was given (U2) > the exit code still reflects whether every target closed [51.08ms]

packages/orch/test/commands-space.test.ts:
(pass) orch space — orch's own grouping > a space is created, listed, renamed and deleted with no space-home role [38.98ms]
(pass) orch space — orch's own grouping > create refuses a name already in use [29.63ms]
(pass) orch space — orch's own grouping > delete refuses a space that still holds agents [35.98ms]
(pass) orch space — the plexer's home > create makes a home and records only its coordinate [42.65ms]
(pass) orch space — the plexer's home > list reports that a space has a home without naming the coordinate [33.22ms]
(pass) orch space — the plexer's home > rename renames orch's space and its home [38.67ms]
(pass) orch space — the plexer's home > delete closes the home and drops its coordinate [40.25ms]
(pass) orch space — the plexer's home > focus focuses the recorded coordinate [30.62ms]
(pass) orch space — the plexer's home > a home made in another plexer is not this environment's to focus [30.98ms]
(pass) orch space — absence is an answer > focus with no space-home role names the space and what is missing [33.11ms]
(pass) orch space — absence is an answer > the plain-text answer names the space too [28.24ms]
(pass) orch space — vocabulary and wiring > cmdSpace lists through the resolved environment [25.38ms]
(pass) orch space — vocabulary and wiring > orch ws is gone [0.09ms]
(pass) orch space — vocabulary and wiring > space help never says workspace and offers create/rename/delete [0.05ms]
(pass) orch space — vocabulary and wiring > no space output ever says workspace [34.26ms]

packages/orch/test/lifecycle-reports-a-partial-run.test.ts:
(pass) a partial reload or restart is reported, not exited > reload --json writes the whole payload and sets exitCode, never exits [3560.53ms]
(pass) a partial reload or restart is reported, not exited > restart --json writes the whole payload and sets exitCode, never exits [3560.87ms]

packages/orch/test/store-interval-rows.test.ts:
(pass) interval satellites > only one open interval is allowed [52.24ms]
(pass) interval satellites > half-open adjacency is legal [39.11ms]
(pass) interval satellites > clearSpace closes without opening [41.08ms]
(pass) interval satellites > agent plexer is immutable one-shot [41.77ms]
(pass) interval satellites > process restart history closes at the successor since [38.79ms]
(pass) interval satellites > process rows carry host and process identity [38.08ms]
(pass) interval satellites > process start_token round-trips [37.87ms]
(pass) interval satellites > space move history closes at the successor since [42.02ms]
(pass) interval satellites > tuning change history closes at the successor since [41.17ms]
(pass) interval satellites > handle history preserves each renumbered handle [52.04ms]
(pass) interval satellites > interval instants are stored as INTEGER values [49.74ms]
(pass) interval satellites > process wrapper rolls back predecessor close when successor fails [44.08ms]
(pass) interval satellites > space wrapper rolls back predecessor close when successor fails [44.02ms]
(pass) interval satellites > tuning carries model and nullable thinking [36.17ms]

packages/orch/test/commands-control.test.ts:
(pass) commands/control > parses dispatch flags without losing prompt words [0.29ms]
(pass) commands/control > parses --then destination and note [0.06ms]
(pass) commands/control > adds worker header unless raw [0.07ms]

packages/orch/test/outbox-ack.test.ts:
(pass) socket outbox acknowledgements > an ack settles an awaiting row and later delivery skips it [37.96ms]
(pass) socket outbox acknowledgements > a detached bridge retries a pending row and logs the reason [32.54ms]
(pass) socket outbox acknowledgements > a gone agent settles its row as undeliverable on the first attempt [29.94ms]
(pass) socket outbox acknowledgements > failed delivery at the cap settles, while one attempt earlier retries [44.75ms]
(pass) socket outbox acknowledgements > redelivery covers every open row for one target, regardless of nextAttemptAt [41.13ms]
(pass) socket outbox acknowledgements > open-row selection excludes settled rows [34.26ms]
(pass) socket outbox acknowledgements > malformed stored payloads are rejected [33.05ms]

packages/orch/test/claim-agent.test.ts:
(pass) claim agent > unclaimed + A → stamped [29.53ms]
(pass) claim agent > claimed A, claim A → unchanged [36.94ms]
(pass) claim agent > claimed A, reclaimAgent(id) then B → stamped with B [36.83ms]
(pass) claim agent > claimed A, plain claim B → refused claimed-by-other, row unchanged [40.53ms]
(pass) claim agent > unknown id → refused unknown-agent [42.32ms]

packages/orch/test/dispatch-prompt-file.test.ts:
(pass) a dispatch prompt can come from a file instead of argv > --file is parsed off the positionals [4.84ms]
(pass) a dispatch prompt can come from a file instead of argv > the file body is the prompt, apostrophes and newlines intact [0.67ms]
(pass) a dispatch prompt can come from a file instead of argv > without --file the positionals after the target are the prompt [0.06ms]
(pass) a dispatch prompt can come from a file instead of argv > a typed prompt and --file together is a refusal, never a silent winner [0.49ms]
(pass) a dispatch prompt can come from a file instead of argv > an empty file is refused: a dispatch with no prompt is not a dispatch [0.35ms]
(pass) a dispatch prompt can come from a file instead of argv > a missing file names itself in the refusal [0.22ms]
(pass) --with points the agent at context it opens on demand > --with is repeatable and parsed off the positionals [0.08ms]
(pass) --with points the agent at context it opens on demand > a file reference is absolute and typed as a file [0.36ms]
(pass) --with points the agent at context it opens on demand > a directory reference is typed as a directory [0.23ms]
(pass) --with points the agent at context it opens on demand > a missing path dies at dispatch, naming the flag [0.17ms]
(pass) --with points the agent at context it opens on demand > the task tells the agent where to look and to open paths only when needed; content is never inlined [0.07ms]
(pass) --with points the agent at context it opens on demand > no references leaves the instructions untouched [0.02ms]

packages/orch/test/daemon-decision-trail.test.ts:
(pass) daemon decision trail > records a lease refused against a live holder [52.90ms]
(pass) daemon decision trail > records a lease granted over a dead holder [74.40ms]
(pass) daemon decision trail > records a not-placed boundary answer with its reason [49.61ms]

packages/orch/test/commands-daemon.test.ts:
(pass) commands/daemon > parses governance and validates daemon status [0.31ms]
(pass) commands/daemon > reads a lock pid only from a complete lock record [0.44ms]

packages/orch/test/every-agent-has-a-link.test.ts:
(pass) every agent has an attached link > agents in placed, headless, and handleless environments receive the same push [74.82ms]
(pass) every agent has an attached link > an agent with no handle is still addressable through its link [43.33ms]

packages/orch/test/daemon-repins-on-settings-change.test.ts:
(pass) daemon settings tuning re-pin > pins every live agent to the resolved settings default [1.40ms]
(pass) daemon settings tuning re-pin > does not pin when tuning settings did not change [0.54ms]
(pass) daemon settings tuning re-pin > continues re-pinning after one agent fails [0.62ms]

packages/orch/test/no-stderr-writes.test.ts:
(pass) orch has one diagnosis channel (the logger) and one output channel (stdout) > no runtime source writes to process.stderr [8.08ms]
(pass) orch has one diagnosis channel (the logger) and one output channel (stdout) > the scan actually covers the tree it claims to [0.96ms]

packages/orch/test/errno-guard.test.ts:
(pass) errnoCode reads a syscall error code, and only a real one > returns the code of a real node syscall error [0.10ms]
(pass) errnoCode reads a syscall error code, and only a real one > a plain Error carries no code, so there is none to report [0.08ms]
(pass) errnoCode reads a syscall error code, and only a real one > a non-object never yields a code instead of crashing on it [0.54ms]
(pass) errnoCode reads a syscall error code, and only a real one > a code-shaped field of the wrong type is not a code [0.06ms]
(pass) isAgentState verifies the state rather than asserting it > accepts a declared state [0.08ms]
(pass) isAgentState verifies the state rather than asserting it > rejects anything not declared, including non-strings [0.09ms]

packages/orch/test/command-space-fields.test.ts:
(pass) command space fields > status and wall entities use the composed space, and it is nowhere in the key [3572.30ms]
(pass) command space fields > skipBackends keeps the authoritative presence entity shape [3560.58ms]
(pass) command space fields > status reports a mixed pi and Claude fleet with the same identity fields [3569.90ms]

packages/orch/test/bridge-apply.test.ts:
(pass) presence bridge delivery > applies dispatch before ack, dedupes redelivery, and detaches [1.18ms]
(pass) presence bridge delivery > applies model deliveries through model control [10.63ms]
(pass) presence bridge delivery > resolves matching answers and drops answers for other questions [0.72ms]

packages/orch/test/store-connection-guards.test.ts:
(pass) store migration guards > a store predating the migrations is refused, not rebuilt over [35.66ms]
(pass) store migration guards > names live presence as the thing to close before rebuilding [43.22ms]
(pass) a slave never reaps or recreates the store > a spawned agent hitting a schema-mismatched store errors and mutates nothing [46.75ms]
(pass) a slave never reaps or recreates the store > a recreate is refused while a live presence dir exists, for the user too [52.38ms]
(pass) a slave never reaps or recreates the store > the user may recreate once nothing is live [44.02ms]
(pass) a slave never reaps or recreates the store > a spawned agent is refused a recreate even with nothing live [53.32ms]

packages/orch/test/retention.test.ts:
(pass) retention sweep > retention windows are independently configurable [30.26ms]
(pass) retention sweep > uses each table's own window and keeps queued and claimed tasks [115.55ms]
(pass) retention sweep > returns zero counts when every row is inside its window [41.79ms]
(pass) retention sweep > continues sweeping when one table delete fails [37.81ms]
(pass) retention sweep > reaps expired agents by identity, taking every satellite with them [43.34ms]
(pass) retention sweep > reaps dead dirs by recorded instants, not a fresh directory mtime [36.65ms]
(pass) retention sweep > keeps dead dirs with a newer recorded instant despite an old mtime [23.65ms]
(pass) retention sweep > reaps malformed dead dirs with no recorded instant [29.63ms]
(pass) retention sweep > keeps result-only recorded instant despite an old mtime [22.77ms]
(pass) retention sweep > never reaps a live presence dir regardless of age [46.11ms]
(pass) retention sweep > sweeps old logs but preserves logs for live agents [41.09ms]
(pass) retention sweep > does not sweep again one minute after the first tick [35.87ms]
(pass) retention sweep > prunes orch's own logs past the age cap [23.09ms]
(pass) retention sweep > prunes orch's own logs past the size cap even when freshly written [37.08ms]

packages/orch/test/commands-status.test.ts:
(pass) commands/status > zero-row message reports gathered counts and backend response [0.03ms]
(pass) commands/status > dead rows never display stale live state [0.03ms]
(pass) commands/status > shared row boundary normalizes stale state for every renderer [0.06ms]
(pass) commands/status > a human at a terminal has no identity to narrow by and no space to be held inside [0.08ms]
(pass) commands/status > --agent narrows to one row by id, key, or name, exited or not [0.12ms]
(pass) commands/status > an agent sees what it spawned, and never past its own space > the default is the agents this caller spawned [0.04ms]
(pass) commands/status > an agent sees what it spawned, and never past its own space > --space-wide widens to the caller's space, which is the wall [0.03ms]
(pass) commands/status > an agent sees what it spawned, and never past its own space > a human widening sees every space, including the one the agent could not [0.03ms]
(pass) commands/status > derives status row fields from seeded presence [29.95ms]
(pass) commands/status > marks dead presence as exited [9.73ms]
(pass) commands/status > asking presence is surfaced as a question while still reporting live state [4.08ms]
(pass) commands/status > shared status row carries presence-derived fields [4.69ms]
(pass) commands/status > row carries the owning backend's declared capabilities [10.06ms]
(pass) commands/status > an agent whose backend orch cannot name reports no capabilities [5.63ms]
(pass) commands/status > status owner ignores spawning provenance when no lease exists [15.00ms]
(pass) commands/status > lease-backed status attribution distinguishes my lease, another lease, and unleased rows [76.06ms]
(pass) commands/status > default table separates minted identity from pane environment [0.51ms]
(pass) commands/status > human table shows harness and working directory facts [0.31ms]
(pass) commands/status > json branch and local table branch derive identical rows apart from host [22.07ms]
(pass) commands/status > capacity footer uses configured caps and shows one pack per root [0.53ms]
(pass) commands/status > formats workspace labels and warnings [0.22ms]

packages/orch/test/one-shape-only.test.ts:
(pass) one current shape only > a live presence record with a malformed identity is a doctor failure [12.38ms]
(pass) one current shape only > doctor backend reports have one detection spelling [0.96ms]

packages/orch/test/work-loop-binding.test.ts:
(pass) work loop attempt binding > statusSpeaksForTask verifies the current attempt dispatch id [0.21ms]
(pass) Cq4: results go to the enqueuer, not the runner > every task event the work loop publishes is keyed to whoever enqueued it [64.34ms]

packages/orch/test/settings-watch.test.ts:
(pass) watchSettings > loads initially and applies a valid edit after the debounce [22.70ms]
(pass) watchSettings > keeps the last-good settings, warns once, and recovers [394.77ms]
(pass) watchSettings > reloads on a touched reload.signal without a settings edit [21.70ms]
(pass) watchSettings > stop prevents further callbacks [409.25ms]

packages/orch/test/vocabulary.test.ts:
(pass) vocabulary is a display map, and a role is tree position > a role is derived from the tree, never stored [39.22ms]
(pass) vocabulary is a display map, and a role is tree position > no table carries a role column: there is nothing to disagree with the tree [36.79ms]
(pass) vocabulary is a display map, and a role is tree position > renaming an agent or moving its lease never changes its role [47.32ms]
(pass) vocabulary is a display map, and a role is tree position > every role term orch displays comes from the one map [0.16ms]
(pass) vocabulary is a display map, and a role is tree position > no module outside the map spells a role term into a user-facing string [16.44ms]

packages/orch/test/backend-space-home.test.ts:
(pass) tmux space home > focus switches the client to the session holding the space [12.49ms]
(pass) tmux space home > create names the session after the space and returns its root window and pane [0.53ms]
(pass) tmux space home > rename and close address the session coordinate [0.13ms]
(pass) tmux space home > list reports every session as a coordinate with a label [0.17ms]
(pass) a home orch opens is never unmarked (E8) > an unlabelled pack home is named for the pack it was opened for [0.18ms]
(pass) a home orch opens is never unmarked (E8) > an unlabelled space home is named for the space, not for the pack [0.08ms]
(pass) a home orch opens is never unmarked (E8) > a subject id the plexer would refuse is made safe, never passed through [0.06ms]
(pass) a home orch opens is never unmarked (E8) > a caller-supplied label is used verbatim [0.05ms]

packages/orch/test/queue-scope.test.ts:
(pass) queue scope invariants > a failed pack task retries on another pack member, while an agent task stays pinned [71.38ms]
(pass) queue scope invariants > cancel is allowed for the enqueuer or a lease holder of a targeted agent [69.11ms]
(pass) queue scope invariants > cancel refuses a caller who is neither enqueuer nor targeted lease holder [46.06ms]
(pass) queue scope invariants > edit is allowed only for the enqueuer while queued [60.18ms]
(pass) queue scope invariants > an orphan has exactly take-on, leave, and reap resolutions [65.47ms]
(pass) queue scope invariants > stale queued work is surfaced distinctly and never deleted by age [49.04ms]
(pass) queue scope invariants > two concurrent claims have one winner and one one_open_attempt violation [52.43ms]

packages/orch/test/settings-repair-screen.test.ts:
(pass) repair action labels > names the key a rename lands on, so the destination is never a guess [0.07ms]
(pass) repair action labels > names the value a set writes [0.05ms]
(pass) repair action labels > drop and leave say only what they do [0.03ms]
(pass) repair frame > shows every defect with the value the person wrote [0.48ms]
(pass) repair frame > promises that nothing changes before a save, because nothing does [0.10ms]
(pass) repair frame > every defect starts at leave, so opening the screen destroys nothing [0.12ms]
(pass) repair frame > a chosen repair is shown as what it will do [0.08ms]
(pass) repair frame > the focused row's offered keys are shown, so no choice has to be guessed [0.09ms]
(pass) repair frame > the count reads as English for one defect and for many [0.07ms]
(pass) repair frame > no row runs past the terminal width, tag included [0.14ms]
(pass) repair frame > the file being repaired is named in the header [0.07ms]

packages/orch/test/store-agent-rows.test.ts:
(pass) agent store rows > insertAgent writes both NULL; agentById reads both back [54.58ms]
(pass) agent store rows > insertAgent materializes the provenance root [46.91ms]
(pass) agent store rows > endAgent records who closed it, nullable for death [47.15ms]
(pass) agent store rows > liveAgents excludes agents with an ending [144.85ms]
(pass) agent store rows > packMembers selects the materialized root [171.77ms]
(pass) agent store rows > unknown harness is rejected by the foreign key [129.08ms]
(pass) agent store rows > unknown spawnedBy is rejected by the foreign key [228.75ms]
(pass) agent store rows > label maps both null and a value [208.07ms]
(pass) agent store rows > created_at is an INTEGER epoch millisecond [179.79ms]
(pass) agent store rows > worktreeOf distinguishes repo agents from worktree agents [43.88ms]
(pass) agent store rows > renameAgent is id-keyed and leaves identity history unchanged [47.40ms]
(pass) agent store rows > lookup ensure operations are insert-or-ignore [39.61ms]
(pass) agent store rows > childrenOf returns direct descendants [51.61ms]

packages/orch/test/agent-monitor.test.ts:
(pass) agent fleet monitor > surfaces only agents spawned by this session [1.00ms]
(pass) agent fleet monitor > empty model renders no status line or widget [0.27ms]
(pass) agent fleet monitor > worker process registers no monitor regardless of events [0.31ms]
(pass) agent fleet monitor > does not replay history into a plain pi session [0.21ms]

packages/orch/test/adapter-bundle-diagnosis.test.ts:
(pass) adapter bundle installation > reports a missing shipped bundle as a structured diagnosis [0.32ms]
pi extensions:
(pass) adapter bundle installation > diagnoses a missing shipped bundle without writing [0.40ms]

packages/orch/test/close-authority.test.ts:
(pass) who may end an agent (D7) > the human may close anything [43.56ms]
(pass) who may end an agent (D7) > an orch may close the slaves it owns, at any depth [46.01ms]
(pass) who may end an agent (D7) > an agent may NOT close another orch's slaves, and is told whose it is [40.98ms]
(pass) who may end an agent (D7) > an agent may not close a peer orch either [62.87ms]
(pass) who may end an agent (D7) > an agent may always close itself — acting on yourself is not driving a fleet [39.42ms]
(pass) who may end an agent (D7) > adopting grants the right to end, and the spawner keeps it [47.37ms]
(pass) who may end an agent (D7) > a provenance cycle terminates instead of hanging [41.82ms]

packages/orch/test/commands-models.test.ts:
(pass) orch models lists the whole catalogue > shows every offered model, quicklisted or not, allowed or not [0.53ms]
(pass) orch models lists the whole catalogue > marks the launch default (thinking suffix removed) and the quicklist members [0.18ms]
(pass) orch models lists the whole catalogue > keeps harness sections in configured order [0.09ms]
(pass) orch models lists the whole catalogue > a harness that enumerates nothing gets an empty section, not another's models [0.29ms]
(pass) orch models filters > --preferred narrows to the quicklist and renumbers what is shown [0.18ms]
(pass) orch models filters > --search matches spec and label case-insensitively [0.18ms]
(pass) orch models filters > filters combine, and no match is an empty result rather than the full list [0.06ms]
(pass) orch models --pick prints one spec > a numeric pick reads the displayed index of a single harness [0.15ms]
(pass) orch models --pick prints one spec > an exact spec pick resolves after filtering [0.08ms]
(pass) orch models --pick prints one spec > ambiguous, missing, zero, and out-of-range picks fail [0.37ms]
(pass) orch models --json > emits the pinned harness/model shape [0.14ms]

packages/orch/test/settings-registry.test.ts:
(pass) settings registry > declares every schema setting exactly once [0.97ms]
(pass) settings registry > every registry read resolves against loaded settings [2.37ms]
(pass) settings registry > fleet help explains what each limit counts [0.28ms]
(pass) settings registry > fleet.max_depth round-trips through the full-tree writer [1.71ms]
(pass) settings registry > fleet.max_depth rejects zero through the registered writer [1.11ms]
(pass) settings registry > fleet.max_depth writes its value to settings.json [1.39ms]
(pass) settings registry > contains no duplicate keys [0.14ms]

packages/orch/test/backend-herdr-predicates.test.ts:
(pass) herdr environment predicates > neither variable set [0.24ms]
(pass) herdr environment predicates > HERDR_ENV=1 only [0.03ms]
(pass) herdr environment predicates > HERDR_PANE_ID only [0.01ms]
(pass) herdr environment predicates > both variables set

packages/orch/test/doctor-unscoped-tasks.test.ts:
(pass) doctor task scopes > a facade-enqueued task has exactly one typed scope [43.41ms]
(pass) doctor task scopes > the database rejects an unscoped task instead of keeping a legacy queue row [31.60ms]
(pass) doctor task scopes > doctor lists unrunnable tasks and deliberate resolutions without deleting [32.92ms]

packages/orch/test/commands-results.test.ts:
(pass) commands/results > renders daemon questions with the existing JSON shape [52.78ms]
(pass) commands/results > renders exactly the pending questions returned by the daemon [4.46ms]
(pass) commands/results > surfaces a missing daemon instead of returning an empty list [0.74ms]
(pass) commands/results > formats invalid and recent timestamps [0.08ms]
(pass) commands/results > routes a seeded results.jsonl through the command module [3579.53ms]
(pass) commands/results > keeps every settled dispatch and reports the newest [3555.09ms]
(pass) commands/results > falls back to adapter session text when results.jsonl is absent [3569.32ms]
(pass) commands/results > uses results.jsonl even when the presence status has no agent [3565.84ms]
(pass) commands/results > orch tail resolves a non-pi target through that adapter's session view [3562.67ms]
(pass) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [3559.98ms]
(pass) commands/results > orch tail -n keeps last-N rendered entries for a pi session [3558.81ms]
(pass) commands/results > orch session reports the pi entry count [3577.93ms]
(pass) commands/results > orch session shows zero entries for an adapter view without them [3590.28ms]

packages/orch/test/settings.test.ts:
(pass) loadSettings > refuses to invent settings when settings.json is missing [0.89ms]
(pass) loadSettings > requires a top-level runtime and never defaults it [1.67ms]
(pass) loadSettings > rejects an unrecognized runtime naming the accepted values [0.92ms]
(pass) loadSettings > rejects a runtime misplaced under defaults [12.62ms]
(pass) loadSettings > reads the declared runtime [18.77ms]
(pass) loadSettings > parses every supported settings section [11.11ms]
(pass) loadSettings > reads question re-ask and retention sweep settings [0.89ms]
(pass) loadSettings > rejects a file without the current schemaVersion [4.47ms]
(pass) loadSettings > rejects invalid JSON loudly [0.53ms]
(pass) loadSettings > names the key path for invalid fields [0.95ms]
(pass) loadSettings > rejects unknown settings keys [0.66ms]
(pass) loadSettings > rejects removed spawn cap setting by name [0.79ms]
(pass) loadSettings > parses models.allowed as a per-harness pattern map [0.76ms]
(pass) loadSettings > rejects renamed fleet keys and loads their replacements [2.44ms]
(pass) loadSettings > rejects old settings keys [11.11ms]
(pass) loadSettings > rejects legacy notify type and unknown ids [1.76ms]
(pass) loadSettings > applies every settings default when sections are absent [0.73ms]
(pass) loadSettings > preserves configured values while defaulting each missing section value [1.30ms]
(pass) loadSettings > rejects non-positive and non-integer retention windows [12.57ms]
(pass) loadSettings > rejects a host without dest [0.99ms]
(pass) loadSettings > rejects an unknown id in enabled.adapters [2.59ms]
(pass) loadSettings > rejects defaults.adapter not present in enabled.adapters [0.95ms]
(pass) loadSettings > rejects when settings.json is absent but a legacy config.toml exists [0.55ms]
(pass) allowedModelPatterns > restricts nothing when settings contain no patterns [9.60ms]
(pass) allowedModelPatterns > returns the configured patterns when set [0.96ms]
(pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or enabled entry [0.83ms]
(pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [0.83ms]
(pass) writeSettingsRuntime > a different runtime replaces the single value in place [0.68ms]
(pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [0.83ms]
(pass) reapUnreadableSettings > leaves a readable file alone [0.37ms]
(pass) writeSettingsEnabled > round-trips both provider arrays [0.87ms]
(pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [1.18ms]
(pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [0.84ms]
(pass) writeSettingsDefault > is idempotent when rewriting the same value [0.93ms]
(pass) writeSettingsDefault > refuses to write through an out-of-version settings file [0.48ms]
(pass) writeSettingsDefault > switches defaults.adapter between two enabled ids and loads clean [0.63ms]
(pass) writeSettingsFullTree > round-trips defaults without inventing max_agents_total [1.88ms]
(pass) settings precedence > uses the fallback when env and settings.json omit a setting [0.48ms]
(pass) settings precedence > uses the settings.json value over the fallback [0.43ms]
(pass) settings precedence > uses the ORCH_* environment value over settings.json [11.04ms]
(pass) settings precedence > uses an explicit flag override over the environment [0.16ms]
(pass) resolveSetting > uses flag, environment coercion, settings, then fallback in precedence order [0.12ms]
(pass) resolveWithSource > rejects an environment value with the wrong shape [0.20ms]
(pass) resolveWithSource > reports the winning source at each precedence level [0.15ms]
(pass) models.preferred and models.allowed are independent > loadSettings parses a per-harness preferred quicklist [0.85ms]
(pass) models.preferred and models.allowed are independent > an absent preferred map normalizes to an empty map, not to allowed [0.57ms]
(pass) models.preferred and models.allowed are independent > writing one list leaves the other byte-for-value intact [12.76ms]
(pass) models.preferred and models.allowed are independent > an empty list is recorded as no list at all, so a cleared picker really clears [3.39ms]
(pass) models.preferred and models.allowed are independent > the full tree seeds both maps when absent and preserves both when present [2.54ms]
(pass) models.preferred and models.allowed are independent > the allowlist gate reads models.allowed only [0.57ms]

packages/orch/test/reap-walks-provenance.test.ts:
(pass) reap walks the provenance tree (H3) > an ended agent with a still-present descendant is NOT reaped [128.30ms]
(pass) reap walks the provenance tree (H3) > the tree is reaped from the LEAF up, one sweep per level [106.96ms]
(pass) reap walks the provenance tree (H3) > a LIVE descendant blocks the reap even when the parent ended long ago [80.51ms]
(pass) reap walks the provenance tree (H3) > provenance has no ON DELETE CASCADE, so no reap can erase a subtree [81.14ms]

packages/orch/test/control-dispatch.test.ts:
(pass) deliverControl bridge dispatch > pushes run and steer with their action ids [68.91ms]
(pass) deliverControl bridge dispatch > reports a detached bridge for a live agent [46.36ms]
(pass) deliverControl bridge dispatch > reports a gone agent before pushing to its link [45.65ms]
(pass) deliverControl bridge dispatch > answers only when status has no pending question [46.57ms]
(pass) deliverControl bridge dispatch > pushes an answer with the asking question id [40.97ms]
(pass) deliverControl bridge dispatch > pushes model changes and waits for the control outcome [472.69ms]
(pass) deliverControl bridge dispatch > rejects an outcome whose applied pin differs from the request [497.59ms]
(pass) deliverControl bridge dispatch > uses the backend input path when the adapter bridge takes no steers [50.05ms]

packages/orch/test/backend-herdr.test.ts:
(pass) HerdrBackend > current identity uses the explicit id, not the launch environment [6.89ms]
(pass) HerdrBackend > composes a complete group role bundle [0.09ms]
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [0.94ms]
(pass) HerdrBackend > starts the mapped herdr harness kind in the pane it created [0.24ms]
(pass) HerdrBackend > agent_not_ready keeps the pane and does not close it [0.23ms]
(pass) HerdrBackend > a caller pane is split rather than given a new tab [0.13ms]
(pass) HerdrBackend > pane and tab creation always preserves focus [0.14ms]
(pass) HerdrBackend > split direction clamps to herdr's right|down [0.10ms]
(pass) HerdrBackend > env reaches the pane through herdr's --env, not an argv prefix [0.17ms]
(pass) HerdrBackend > a handed-over pane is launched into directly, never split or closed [0.09ms]
(pass) HerdrBackend > a group is created with the environment its own pane will launch under [0.24ms]
(pass) HerdrBackend > a group with no coordinate is refused, not placed wherever herdr is focused [0.09ms]
(pass) HerdrBackend > a pane with no coordinate is refused the same way [0.08ms]
(pass) HerdrBackend > the inventory answers which workspace holds a pane, and null for one herdr no longer lists [0.20ms]
(pass) HerdrBackend > the pane host closes a pane through herdr [0.09ms]
(pass) HerdrBackend > a planned target pane is split directly, never re-seated afterwards [0.45ms]
(pass) HerdrBackend > a grouped spawn with no planned target splits a pane already in that tab, never the caller's pane [0.97ms]
(pass) HerdrBackend > a same-tab re-seat bounces through a throwaway tab so herdr executes it [0.41ms]
(pass) HerdrBackend > adopts herdr's replacement pane id after move [0.12ms]
(pass) HerdrBackend > refuses a live herdr agent name before start [0.42ms]
(pass) HerdrBackend > reads recent unwrapped pane output [0.16ms]
(pass) HerdrBackend > a refused move surfaces herdr's reason instead of claiming success [0.12ms]
(pass) HerdrBackend > groupLayout reads tab geometry straight off the pane listing [0.33ms]
(pass) HerdrBackend > pane input reports gone handles without retrying and retries plain failures [1751.39ms]
(pass) HerdrBackend > pane rename failure reaches the role caller [0.18ms]
(pass) HerdrBackend > waiting uses agent wait --until, not the removed top-level wait [0.10ms]
(pass) HerdrBackend space home > opens an orch-marked workspace for a pack the caller did not label [0.27ms]
(pass) HerdrBackend space home > a space home the human named keeps that name [0.14ms]
(pass) HerdrBackend space home > create hands back the plexer coordinate, the root tab and the root pane, and says none of them [0.12ms]

packages/orch/test/one-retry-policy.test.ts:
(pass) one retry policy > retries flaky async and sync operations through the shared helper [0.45ms]
(pass) one retry policy > uses the policy's declared backoff schedule [0.23ms]
(pass) one retry policy > surfaces the last error after exactly attempts tries [0.34ms]

packages/orch/test/broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.26ms]
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [31.25ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [46.99ms]
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [32.64ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [28.57ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [7.75ms]

packages/orch/test/peer-project-scope.test.ts:
42 |     const directory = makeOrchDir();
43 |     seedStatus(directory, "sibling001", { pid: process.pid, state: "working" });
44 |     seedStatus(directory, "foreigner1", { pid: process.pid, label: "foreigner", state: "working", project: "/some/other/project" });
45 | 
46 |     const keys = (await peerSummaries(daemonClientForPeers(["sibling001", "foreigner1"]), ownKey)).map((peer) => peer.key);
47 |     expect(keys).toEqual(["sibling001"]);
                      ^
error: expect(received).toEqual(expected)

- [
-   "sibling001",
- ]
+ []

- Expected  - 3
+ Received  + 1

      at <anonymous> (/home/bryan/orch/packages/orch/test/peer-project-scope.test.ts:47:18)
(fail) peer discovery walls on the project > a same-workspace peer from another project is invisible by default [27.91ms]
50 |   test("all_workspaces deliberately lifts the project wall", async () => {
51 |     const directory = makeOrchDir();
52 |     seedStatus(directory, "foreigner1", { pid: process.pid, label: "foreigner", state: "working", project: "/some/other/project" });
53 | 
54 |     const keys = (await peerSummaries(daemonClientForPeers(["foreigner1"]), ownKey, true)).map((peer) => peer.key);
55 |     expect(keys).toEqual(["foreigner1"]);
                      ^
error: expect(received).toEqual(expected)

- [
-   "foreigner1",
- ]
+ []

- Expected  - 3
+ Received  + 1

      at <anonymous> (/home/bryan/orch/packages/orch/test/peer-project-scope.test.ts:55:18)
(fail) peer discovery walls on the project > all_workspaces deliberately lifts the project wall [27.27ms]
60 |     seedStatus(directory, "foreigner1", { pid: process.pid, label: "foreigner", state: "working", project: "/some/other/project" });
61 | 
62 |     const refused = await resolvePeer(daemonClientForPeers(["foreigner1"]), "foreigner", ownKey);
63 |     expect("error" in refused).toBe(true);
64 |     const allowed = await resolvePeer(daemonClientForPeers(["foreigner1"]), "foreigner", ownKey, true);
65 |     expect("peer" in allowed).toBe(true);
                                   ^
error: expect(received).toBe(expected)

Expected: true
Received: false

      at <anonymous> (/home/bryan/orch/packages/orch/test/peer-project-scope.test.ts:65:31)
(fail) peer discovery walls on the project > a cross-project target does not resolve for sends without the explicit flag [40.98ms]
(pass) peer discovery walls on the project > a record with no project stamp is malformed and never listed [26.57ms]
(pass) peer discovery walls on the project > a spawned agent's all_workspaces flag is ignored [52.01ms]

packages/orch/test/peer-tools-registration.test.ts:
(pass) peer tool registration > does not register orch_send when no spawner address exists [1.19ms]
79 |     seedStatus(directory, "dead-spawner", { pid: 2147483646 });
80 |     const { harness, toolNames } = fakeHarness();
81 | 
82 |     registerPeerTools(harness, fakePresence(harness), stubDaemonClient());
83 | 
84 |     expect(toolNames).not.toContain("orch_send");
                               ^
error: expect(received).not.toContain(expected)

Expected to not contain: "orch_send"
Received: [ "orch_agents", "orch_send", "orch_read" ]

      at <anonymous> (/home/bryan/orch/packages/orch/test/peer-tools-registration.test.ts:84:27)
(fail) peer tool registration > does not register orch_send when the spawner pid is dead [0.73ms]
(pass) peer tool registration > registers orch_send when the spawner has a live status record [0.66ms]

packages/orch/test/session-sees-only-held-agents.test.ts:
(pass) session agent visibility > shows only agents held by the current session, not its provenance children [0.27ms]
(pass) session agent visibility > an operator sees every agent in every space [0.15ms]
(pass) session agent visibility > a session cannot reset a foreign-held agent [3566.87ms]
(pass) session agent visibility > a session cannot read runs by the exact key of a foreign-held agent [3565.13ms]
(pass) session agent visibility > a session cannot widen status with --space-wide [9.62ms]
killed 1 dangling process
killed 1 dangling process
killed 1 dangling process
killed 1 dangling process
killed 1 dangling process
(fail) session agent visibility > a session cannot resolve a foreign target, even when it shares provenance [7085.11ms]
  ^ this test timed out after 5000ms.

packages/orch/test/pid-liveness.test.ts:
(pass) pidAlive liveness contract (shared by pi peers) > EPERM means the process exists under another user — alive [0.33ms]
(pass) pidAlive liveness contract (shared by pi peers) > ESRCH means no such process — dead [0.04ms]
(pass) pidAlive liveness contract (shared by pi peers) > the current process is alive [0.02ms]
(pass) pidAlive liveness contract (shared by pi peers) > non-positive and non-numeric pids are rejected without signalling [0.05ms]

packages/orch/test/notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > reports notifier reachability from one configured entry [0.21ms]
(pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [0.51ms]
(pass) notifier registry and built-in adapters > a notifier error is the caller's real error [0.16ms]

packages/orch/test/orchd-rpc-replay.test.ts:
(pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [32.75ms]
(pass) orchd RPC replay buffer > replays from inside the surviving range without a gap [81.92ms]
(pass) orchd RPC replay buffer > reports a gap when the requested sequence predates retained history [35.45ms]
(pass) orchd RPC replay buffer > empty history has no gap or oldest sequence [21.40ms]
(pass) orchd RPC replay buffer > limits replay size without pruning durable events [2126.50ms]

packages/orch/test/commands-index.test.ts:
(pass) commands/index > does not gate help or noninteractive commands [0.05ms]
(pass) commands/index > reads a package version string [0.10ms]
(pass) commands/index > announces unleased agents once per session [1.14ms]
(pass) commands/index > dispatches representative commands and reports unknown commands [1.14ms]

packages/orch/test/store-outbox.test.ts:
(pass) outbox store rows > inserts pending messages and orders them by creation time [28.55ms]
(pass) outbox store rows > reports one message's pending state [30.33ms]
(pass) outbox store rows > bumps attempts and hides a message until its next attempt time [29.32ms]
(pass) outbox store rows > deletes delivered messages older than the cutoff [37.49ms]

packages/orch/test/adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [0.07ms]
(pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.09ms]
(pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.04ms]
(pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.03ms]
(pass) preferred models fill the harness's native picker quicklist > pi interactive builders pass the quicklist as one quoted --models argument [0.09ms]
(pass) preferred models fill the harness's native picker quicklist > pi headless builders pass the quicklist as one verbatim argv entry [0.07ms]
(pass) preferred models fill the harness's native picker quicklist > pi omits --models cleanly for an absent or empty quicklist [0.11ms]
(pass) preferred models fill the harness's native picker quicklist > pi keeps quicklist order and provider punctuation intact [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > omp interactive builders pass the quicklist as one quoted --models argument [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > omp headless builders pass the quicklist as one verbatim argv entry [0.02ms]
(pass) preferred models fill the harness's native picker quicklist > omp omits --models cleanly for an absent or empty quicklist [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > omp keeps quicklist order and provider punctuation intact
(pass) preferred models fill the harness's native picker quicklist > a model outside the quicklist is still what the launch runs on [0.06ms]

packages/orch/test/a-backend-exposes-each-operation-once.test.ts:
(pass) a backend exposes each operation exactly once (2.2) > herdr publishes no operation beside the role that owns it [0.46ms]
(pass) a backend exposes each operation exactly once (2.2) > tmux publishes no operation beside the role that owns it [0.16ms]
(pass) a backend exposes each operation exactly once (2.2) > headless publishes no operation beside the role that owns it [0.11ms]

packages/orch/test/pack-membership.test.ts:
(pass) a pack is the provenance root > a registered session is an orch of a pack of one [33.09ms]
(pass) a pack is the provenance root > membership is inherited from the spawner at any depth, never re-rooted [38.82ms]
(pass) a pack is the provenance root > every agent is in exactly one pack, and two packs never share a member [46.43ms]
(pass) a pack is the provenance root > a pack of one grows without re-rooting, and the root stays the orch [39.91ms]
(pass) a pack is the provenance root > a lease or a move never changes which pack an agent is in [47.35ms]
(pass) a pack is the provenance root > an agent cannot be spawned by someone who does not exist [27.41ms]

packages/web/src/lib/fleet.test.ts:
(pass) web environment projection > novel plexers still render a detached environment [0.71ms]
(pass) web environment projection > missing space is absent rather than local [0.11ms]
(pass) web environment projection > pane coordinates are not chosen names [0.08ms]
(pass) web environment projection > unknown daemon states use the neutral fallback [0.13ms]
(pass) web environment projection > uses names from orch rows and falls back to the minted id [0.08ms]
(pass) web environment projection > uses the orch space name and id [0.07ms]
(pass) web environment projection > history groups ended agents by provenance root [0.13ms]
(pass) web environment projection > live projection excludes ended rows [0.14ms]
(pass) web environment projection > renderers contain no provider-id branches or backend capability imports [0.58ms]

packages/web/src/lib/web-shell.test.ts:
(pass) web shell and fleet views > the app shell scrolls only its content region [0.34ms]
(pass) web shell and fleet views > no route declares a scroll frame of its own [0.58ms]
(pass) web shell and fleet views > unleased agents are partitioned into an orphan bucket [0.23ms]
(pass) web shell and fleet views > history groups exited agents by the agent that spawned them [0.08ms]
(pass) web shell and fleet views > live work groups under its current lease holder [0.27ms]
(pass) web shell and fleet views > adopted work is filed under its current holder [0.07ms]
(pass) web shell and fleet views > unheld agents remain visible under the unheld group [0.07ms]
(pass) web shell and fleet views > dead holders become unheld and do not drive work [0.08ms]
(pass) web shell and fleet views > lease groups preserve every flat space member [0.10ms]
(pass) web shell and fleet views > visible names never expose a plexer coordinate or the forbidden term [0.09ms]

35 tests failed:
(fail) fleet ownership scoping > fleet visibility follows provenance depth, not caller environment [84.99ms]
(fail) fleet ownership scoping > close has no force option and remains unconditional without it [6253.63ms]
(fail) close always works > closes a foreign-space target by name, key, or pane id [10677.10ms]
  ^ this test timed out after 5000ms.
(fail) close always works > a successful backend close retains a pane that is still listed [3590.14ms]
(fail) close always works > duplicate close targets count once [7166.00ms]
  ^ this test timed out after 5000ms.
(fail) doctor declared-vs-reality > reports a lease whose recorded holder process is dead [39.91ms]
(fail) doctor declared-vs-reality > reports an environment handle missing from its plexer [40.21ms]
(fail) doctor declared-vs-reality > reports a live agent with no lease and no live spawner [40.13ms]
(fail) doctor stale presence safety > no dead agents leaves nothing to remove [80.15ms]
(fail) daemon RPC > an unreachable agent yields a boundary answer, and the outbox is not left pending [1054.42ms]
(fail) daemon RPC > dispatch waits for and reports a bridge acknowledgement [30013.26ms]
  ^ this test timed out after 30000ms.
(fail) daemon RPC > attach reports open rows and re-pushes them [30006.23ms]
  ^ this test timed out after 30000ms.
(fail) rebuild schema > rebuild DDL inventory is exact [25.40ms]
(fail) commands/lifecycle > --all targets the agents this orch holds a live lease on, and drops them when it releases [7118.37ms]
  ^ this test timed out after 5000ms.
(fail) the spawner address invariant > an address that IS stamped resolves to a live status record [40.10ms]
(fail) peer identity in messaging > peer summaries render an unplaced agent without a local place name [35.76ms]
(fail) peer identity in messaging > orch_send reports the peer's NAME and calls the message RPC [2.68ms]
(fail) peer identity in messaging > orch_send reports queued when the message is not acknowledged [1.10ms]
(fail) peer identity in messaging > orch_send reports when the daemon is unreachable [1.05ms]
(fail) peer identity in messaging > peers resolve by display name exactly like by key [32.83ms]
(fail) peer identity in messaging > "spawner" reaches the stamped spawner session across fleet scoping [1.19ms]
(fail) commands/target > lists only live serialized identity presence entries [27.31ms]
(fail) peer summaries carry ownership as a lease > a peer the caller holds reports the caller as the live holder [56.06ms]
(fail) peer summaries carry ownership as a lease > a peer nobody ever took reports no orch driving it [59.32ms]
(fail) peer summaries carry ownership as a lease > a dead holder is not a live one [51.47ms]
(fail) the compact listing separates orphans from live work > unleased peers sit in their own bucket, below the driven ones [61.78ms]
(fail) the compact listing separates orphans from live work > a held peer names its holder, and an unleased one never reads as yours [57.42ms]
(fail) the compact listing separates orphans from live work > with nothing unleased the bucket does not appear at all [70.98ms]
(fail) --offline is a narrower view of ONE source, not a second one (M8) > offline and online read the same agents from the same presence files [7082.71ms]
  ^ this test timed out after 5000ms.
(fail) --offline is a narrower view of ONE source, not a second one (M8) > offline is the one path that never dials or starts the daemon [1.10ms]
(fail) peer discovery walls on the project > a same-workspace peer from another project is invisible by default [27.91ms]
(fail) peer discovery walls on the project > all_workspaces deliberately lifts the project wall [27.27ms]
(fail) peer discovery walls on the project > a cross-project target does not resolve for sends without the explicit flag [40.98ms]
(fail) peer tool registration > does not register orch_send when the spawner pid is dead [0.73ms]
(fail) session agent visibility > a session cannot resolve a foreign target, even when it shares provenance [7085.11ms]
  ^ this test timed out after 5000ms.

 1602 pass
 35 fail
 7520 expect() calls
Ran 1637 tests across 255 files. [381.07s]
