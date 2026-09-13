bun test v1.4.0 (34cbb9a40)

packages/orch/integration/daemon-registration.test.ts:
(pass) machine daemon registration > refuses a second start and names the live socket [2.27ms]
(pass) machine daemon registration > the refusal a second start prints names the live daemon's pid [0.82ms]
(pass) machine daemon registration > doctor names both when a second daemon is live beside the registered one [3.85ms]
(pass) machine daemon registration > evicts a registration whose process instance no longer matches [0.89ms]
(pass) machine daemon registration > routes a different orch dir to its own runtime files [1.11ms]
(pass) machine daemon registration > doctor distinguishes registered-but-dead from live-and-registered [0.95ms]

packages/orch/integration/codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [0.85ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [1.04ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [2.17ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [2.86ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [0.78ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [40.83ms]

packages/orch/integration/routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves pack selection [42.69ms]
(pass) store hardening > a fresh store creates the full current schema with WAL enabled [34.04ms]
(pass) store hardening > the store refuses a second open holding, so ownership cannot fork [33.50ms]
(pass) store hardening > adoption closes the prior holding in the same step that opens the new one [46.22ms]
(pass) store hardening > the attempt insert claim is exactly once [41.57ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [154.80ms]

packages/orch/integration/reset-build-safety.test.ts:
(pass) build reset safety > --build dry-run never names a path inside ORCH_DIR [134.43ms]

packages/orch/integration/claude-adapter.test.ts:
(pass) Claude adapter > declares its identity, and composes only the roles it fully implements [0.13ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.14ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.12ms]
(pass) Claude adapter > detects state from a live presence status [26.85ms]
(pass) Claude adapter > extracts results.jsonl before transcript and native output [1.07ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [0.58ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [25.71ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [78.25ms]
(pass) Claude adapter > exits silently and writes no presence without launch env (a non-orch session) [15.27ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed launch env [16.44ms]

packages/orch/integration/cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.13ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.07ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.12ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.13ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.08ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.18ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [0.14ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no plexer answers [0.10ms]
(pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [52.76ms]
(pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [0.42ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [144.84ms]
(pass) headless common path: identity key -> presence > one adapter uses the same opaque key across headless and tmux routes [0.29ms]
(pass) headless common path: identity key -> presence > a key carries no environment to read back out of it [0.04ms]

packages/orch/integration/daemon-no-peer-credentials.test.ts:
(pass) the daemon asks for a token and nothing else > no peer-credential or ancestry syscall appears in the daemon at all [0.94ms]
(pass) the daemon asks for a token and nothing else > a caller the daemon has no relationship to is accepted on the token alone [50.94ms]
(pass) the daemon asks for a token and nothing else > that same stranger without the token is refused, so the token is what decided [3.16ms]

packages/orch/integration/owner-scoping.test.ts:
(pass) fleet ownership scoping > fleet visibility follows provenance depth, not caller environment [133.35ms]
(pass) fleet ownership scoping > owner token uses ORCH_OWNER, else this process's own minted id [24.70ms]
(pass) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [52.08ms]
(pass) fleet ownership scoping > close --all works without an owner token [690.38ms]
skipping caller: unknown backend null (reaping the record)
skipping other: unknown backend null (reaping the record)
{"closed":["caller","klmine0001","klforeign1","other"],"results":[{"target":"caller","handle":null,"outcome":"done","error":null},{"target":"klmine0001","handle":"mine","outcome":"done","error":null},{"target":"klforeign1","handle":"foreign","outcome":"done","error":null},{"target":"other","handle":null,"outcome":"done","error":null}],"requested":4,"ok":4,"stream":false}
(pass) fleet ownership scoping > close --all closes all managed records regardless of owner [92.74ms]
(pass) fleet ownership scoping > driving verbs remain gated against a live foreign holder [815.01ms]
(pass) fleet ownership scoping > result refuses a foreign-owned agent and names its owner [335.71ms]
(pass) fleet ownership scoping > pane mutations refuse a foreign-owned agent and name its owner [634.81ms]
(pass) fleet ownership scoping > close has no force option and remains unconditional without it [379.25ms]
{"closed":["kmismatch1"],"results":[{"target":"kmismatch1","handle":"{\"pid\":12624,\"key\":\"kmismatch1\"}","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) fleet ownership scoping > close cleans up a mismatched recorded process without signalling [58.29ms]
(pass) a spawned agent touches only what it spawned > a spawned agent acts as its own minted id, not its launch key [0.29ms]
(pass) a spawned agent touches only what it spawned > --cross-space from a spawned agent is refused [204.86ms]
(pass) a spawned agent touches only what it spawned > close --all from an AGENT sweeps only its own subtree [244.05ms]
(pass) a spawned agent touches only what it spawned > close --all from the HUMAN sweeps every managed spawn, whoever spawned it [224.12ms]
(pass) a spawned agent touches only what it spawned > close from a spawned agent is REFUSED when the target is not its own [194.91ms]
(pass) a spawned agent touches only what it spawned > close from a spawned agent SUCCEEDS on a slave it spawned itself [224.46ms]
(pass) a spawned agent touches only what it spawned > the workspace operator keeps control of an agent-owned fleet [204.59ms]

packages/orch/integration/presence-schema.test.ts:
(pass) presence status schema > reads a spawned identity without placement fields in status [99.33ms]
(pass) presence status schema > orch status JSON exposes the agent status fields [58.68ms]
(pass) presence status schema > status and list report the same agent identity [61.94ms]
(pass) presence status schema > mixed pi and Claude status rows carry the same status field set [59.28ms]
(pass) presence status schema > rejects a status record that carries no schema stamp [53.17ms]
(pass) presence status schema > rejects a status record stamped with a non-current schema [50.92ms]
(pass) presence status schema > rejects a current-schema record carrying placement fields [50.14ms]
(pass) presence status schema > a malformed record is skipped without hiding the valid records beside it [57.27ms]
(pass) presence status schema > the four facts are recorded apart and composed back onto the minted id [43.52ms]

packages/orch/integration/os-executors.test.ts:
(pass) cross-OS execution is a backend, not a peer daemon > the local side supplies start, is-alive and kill [0.16ms]
(pass) cross-OS execution is a backend, not a peer daemon > an OS side with no executor answers, and never runs the body [0.12ms]
(pass) cross-OS execution is a backend, not a peer daemon > the local side runs the body and hands back its value [0.07ms]
(pass) cross-OS execution is a backend, not a peer daemon > doctor passes a daemon registered on the side orch is running on [0.63ms]
(pass) cross-OS execution is a backend, not a peer daemon > doctor answers, rather than failing, for a daemon on a side with no executor [0.38ms]

packages/orch/integration/close-always.test.ts:
{"closed":["panename01","panekey001","paneid0001"],"results":[{"target":"panename01","handle":"pane-name","outcome":"done","error":null},{"target":"panekey001","handle":"pane-key","outcome":"done","error":null},{"target":"paneid0001","handle":"pane-id","outcome":"done","error":null}],"requested":3,"ok":3,"stream":false}
(pass) close always works > closes a foreign-space target by name, key, or pane id [134.44ms]
Could not close survives01: pane-survives is still listed by headless after the close
{"closed":[],"results":[{"target":"survives01","handle":"pane-survives","outcome":"error","error":"pane-survives is still listed by headless after the close"}],"requested":1,"ok":0,"stream":false}
(pass) close always works > a successful backend close retains a pane that is still listed [51.32ms]
Could not close signalfai1: cannot signal process 12168: orch is running in it
{"closed":[],"results":[{"target":"signalfai1","handle":"pane-signal-failed","outcome":"error","error":"cannot signal process 12168: orch is running in it"}],"requested":1,"ok":0,"stream":false}
(pass) close always works > a failed signal retains the registry and presence and reports failure [55.88ms]
{"closed":["presence01"],"results":[{"target":"presence01","handle":"pane-presence-only","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) close always works > presence pid without a recorded process closes the pane without signalling and ends the row [54.01ms]
{"closed":["owned00001"],"results":[{"target":"owned00001","handle":"pane-owned","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) close always works > close ignores owner and spawnedBy gates [60.30ms]
{"outcome":"answer","reason":"no-environment-role","text":"this pane environment does not provide abort"}
(pass) close always works > abort ignores owner gate [52.04ms]
{"closed":["duplicate1"],"results":[{"target":"duplicate1","handle":"pane-duplicate","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) close always works > duplicate close targets count once [62.72ms]
(pass) close always works > dead pane-less close is a successful no-op that ends the row and leaves presence to reap [226.45ms]
(pass) close always works > steer remains blocked by the space wall [58.97ms]

packages/orch/integration/identity-launch.test.ts:
(pass) launchCredential > returns null when the launch environment is unset [0.48ms]
(pass) launchCredential > returns a minted id [0.31ms]
(pass) launchCredential > malformed value exits 1 and logs launch.invalid-key [18.22ms]

packages/orch/integration/settings-command.test.ts:
(pass) orch settings > every registered setting is reachable through --json [149.47ms]
(pass) orch settings > every registered setting is printed in the table [136.69ms]
(pass) orch settings > --json reports value + source per setting, settings.json winning over defaults [132.49ms]
(pass) orch settings > --json reports env as the winning source over settings.json [137.34ms]
(pass) orch settings > --harness switches defaults.adapter between enabled ids and rejects a non-enabled id [380.73ms]
(pass) orch settings > reports each harness's picker quicklist and launch gate as separate rows [153.50ms]
(pass) orch settings > a load error surfaces loudly with no partial table [124.40ms]
(pass) orch settings > sets a boolean through its registry entry [125.61ms]
(pass) orch settings > sets an integer through its registry entry [139.58ms]
fleet.max_depth = 6
(pass) orch settings > single-setting set delegates to the registry writer [3.25ms]
(pass) orch settings > sets a choice through its registry entry [152.01ms]
(pass) orch settings > sets a multi value through its registry entry [152.61ms]
(pass) orch settings > sets a list value through its registry entry [125.67ms]
(pass) orch settings > refuses an invalid boolean and names the allowed values [134.52ms]
(pass) orch settings > refuses an invalid integer and names the allowed range [136.39ms]
(pass) orch settings > refuses an invalid choice and names the allowed choices [125.75ms]
(pass) orch settings > refuses an invalid multi value and names the allowed choices [127.40ms]
(pass) orch settings > refuses an invalid list and names JSON as the allowed format [126.68ms]
(pass) orch settings > refuses an unknown key and suggests nearest valid keys [131.45ms]
(pass) orch settings > refuses read-only runtime and names the editing subcommand [139.29ms]

packages/orch/doctor/doctor-checks.test.ts:
(pass) doctor provenance-depth checks > finds a live agent deeper than fleet.max_depth [52.11ms]
(pass) doctor provenance-depth checks > accepts a live agent at fleet.max_depth [44.17ms]
(pass) doctor unclaimed-agent checks > finds an old unclaimed live agent with its age [35.09ms]
(pass) doctor unclaimed-agent checks > ignores a claimed agent [39.71ms]
(pass) doctor unclaimed-agent checks > ignores a fresh unclaimed agent under the threshold [39.44ms]
(pass) doctor notification-sink checks > reports no sinks as healthy [0.76ms]
(pass) doctor notification-sink checks > rejects a webhook with a malformed URL [2.04ms]
(pass) doctor notification-sink checks > uses the notify-send prerequisite install command in desktop remediation [1.28ms]
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [1.12ms]
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [0.69ms]
(pass) doctor notification-sink checks > warns when a notifier omits done from its on list [0.53ms]
(pass) doctor notification-sink checks > does not warn when a notifier includes done in its on list [0.37ms]
(pass) doctor notification-sink checks > keeps unavailable notifier failures when done is omitted [0.40ms]

packages/orch/doctor/doctor-settings-defects.test.ts:
(pass) doctor settings defects > accepts an absent settings file [0.46ms]
(pass) doctor settings defects > accepts a clean settings file and keeps its path detail [0.48ms]
(pass) doctor settings defects > reports malformed JSON as a file defect [0.39ms]
(pass) doctor settings defects > reports a read failure instead of throwing [0.32ms]
(pass) doctor settings defects > reports a stale key with the value that was written [2.19ms]
(pass) doctor settings defects > reports a typo with its suggested key [0.96ms]
(pass) doctor settings defects > reports the expected schema version [0.92ms]
(pass) doctor settings defects > skips settings-dependent checks with a short repair hint [44.34ms]

packages/orch/doctor/doctor-declared-vs-reality.test.ts:
(pass) doctor declared-vs-reality > describes composed and absent backend roles [0.40ms]
(pass) doctor declared-vs-reality > reports a lease whose recorded holder process is dead [63.94ms]
(pass) doctor declared-vs-reality > reports an environment handle missing from its plexer [46.45ms]
(pass) doctor declared-vs-reality > reports a live agent with no lease and no live spawner [42.82ms]
(pass) doctor declared-vs-reality > surfaces a missing task scope row as unrunnable [58.33ms]
(pass) doctor declared-vs-reality > doctor -y does not delete an unrunnable task [61.44ms]

packages/orch/doctor/doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [131.96ms]
(pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [63.56ms]
(pass) doctor stale presence safety > no dead agents leaves nothing to remove [82.28ms]

packages/orch/doctor/doctor-settings-preservation.test.ts:
(pass) doctor settings preservation > yes mode leaves existing settings.json byte-identical [22.37ms]

packages/orch/doctor/doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [0.09ms]
(pass) runDoctor > runs on an unconfigured install without failing for want of settings.json [18.52ms]
(pass) runDoctor > checks a healthy store [46.09ms]
(pass) runDoctor > warns when the store is absent [0.31ms]
(pass) runDoctor > fails when the store predates orch's migrations [37.07ms]
(pass) runDoctor > fails and names a missing store table [41.85ms]
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [42.47ms]
(pass) runDoctor > reports an absent daemon as optional [19.63ms]
(pass) runDoctor > reports and fixes a stale daemon lock [24.01ms]
(pass) runDoctor > accepts a live daemon and an answerable socket [59.68ms]
(pass) runDoctor > warns when the live daemon code hash is stale [21.50ms]
(pass) runDoctor > fails on an invalid lock and an unanswerable live socket [50.56ms]
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [24.55ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [19.70ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [26.50ms]
(pass) runDoctor > reports a dead presence pid [51.67ms]
(pass) runDoctor > bins check is driven by the enabled set and offers no fix [24.91ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [0.67ms]
(pass) runDoctor > validates configured notifier adapters [255.00ms]
(pass) runDoctor > reports invalid settings and accepts missing settings [70.45ms]
(pass) runDoctor > never throws when individual checks encounter broken inputs [49.44ms]

packages/orch/doctor/doctor-orphan-daemons.test.ts:
(pass) doctor orphaned-daemon check > a live foreign lock is reported, and an unproven owner is never killable [19.48ms]
(pass) doctor orphaned-daemon check > a dead pid's lock is not an orphan [17.34ms]
(pass) doctor orphaned-daemon check > the caller's own orch dir is never reported against itself [21.98ms]

packages/orch/test/tiling.test.ts:
(pass) planTilePlacement > a lone pane anchors the split to the only pane [0.23ms]
(pass) planTilePlacement > first_split rules the opening split, however the screen is shaped [0.13ms]
(pass) planTilePlacement > first_split longest-edge leaves the opening split to the tab's own shape [0.07ms]
(pass) planTilePlacement > a tab with no geometry to read still opens the way first_split says [0.04ms]
(pass) planTilePlacement > past the first split, the biggest pane halves its longer side whatever first_split says [0.10ms]
(pass) planTilePlacement > the biggest pane is the target, whatever the caller's own pane is [0.03ms]
(pass) planTilePlacement > equal panes resolve top-left first, so enumeration order cannot decide [0.04ms]
(pass) planTilePlacement > four agents land in a 2x2 grid, not four columns [0.24ms]
(pass) planTilePlacement > four agents on an ultrawide screen still land in a 2x2 grid [0.09ms]
(pass) planTilePlacement > first_split rows stacks the second agent, columns seats it alongside [0.06ms]
(pass) planTilePlacement > longest-edge on an ultrawide screen is the four-thin-columns layout first_split exists to avoid [0.06ms]
(pass) planTilePlacement > the same pane count yields the same grid whatever pane order the plexer reports [0.93ms]

packages/orch/test/hello-environment.test.ts:
(pass) hello records the environment in full > the plexer the caller registered in is on the agent, not only on the host [46.43ms]
(pass) hello records the environment in full > the place the caller occupies in its plexer is recorded at hello [38.54ms]
(pass) hello records the environment in full > a session that moved to another place re-registers with the new one, and one row stays open [42.24ms]
(pass) hello records the environment in full > the space the caller registered in is recorded at hello, not inferred later [39.33ms]
(pass) hello records the environment in full > a session in no space and no plexer records neither, and that is an answer [36.05ms]
(pass) hello records the environment in full > re-registering the same session does not re-root or re-place it [49.27ms]
(pass) hello records the environment in full > the claim carries every environment fact hello has to record [40.32ms]

packages/orch/test/orchd-rpc-reconnect.test.ts:
(pass) RPC JSON framing > rejects malformed object that only has an id [0.08ms]
(pass) RPC JSON framing > parses split and multiple newline-delimited frames [9.37ms]
(pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [336.98ms]
(pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1053.77ms]

packages/orch/test/commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.13ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [0.29ms]
Selection recorded in /tmp/orch-setup-characterization-yisQIj/settings.json:
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
  /tmp/orch-setup-characterization-yisQIj/agents
Skills:
  not installed - turn it back on with: orch settings skills --install
bins:
  /tmp/orch-setup-home-IScZOf/.local/bin/orch -> /home/bryan/orch/packages/orch/dist/bin/orch.js
  /tmp/orch-setup-home-IScZOf/.local/bin/pif -> /home/bryan/orch/packages/orch/bin/pif
  /tmp/orch-setup-home-IScZOf/.local/bin/orch-ding -> /home/bryan/orch/packages/orch/dist/bin/orch-ding.js
  SKIP pi extensions: pi integration shim disabled
Running doctor checks...
Doctor: 31/35 checks passed
Done. Open a plexer workspace and try: orch spawn 2 --tab Team1
(pass) commands/setup > runs non-interactive setup against the requested ORCH_DIR and records the selected composition [55.24ms]
(pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.15ms]

packages/orch/test/store-identity.test.ts:
(pass) hello agent identity rows > reuses the live agent for the same session process and mints for another [56.65ms]
(pass) hello agent identity rows > first sight creates a named root agent and open process row [47.55ms]

packages/orch/test/port-no-optional-methods.test.ts:
(pass) the environment port declares capability by composition, never by optionality > src/types/backend.ts has no optional methods on any port interface [0.77ms]
(pass) the environment port declares capability by composition, never by optionality > the deleted capability flags bag is gone, not merely unimplemented [0.17ms]
(pass) the environment port declares capability by composition, never by optionality > src/types/adapter.ts has no optional methods on the harness port either [0.42ms]

packages/orch/test/notify-router.test.ts:
(pass) notify router > delivers only when on includes the event state [0.54ms]
(pass) notify router > passes typed webhook and command configuration [0.28ms]
(pass) notify router > surfaces notifier errors [0.17ms]

packages/orch/test/status-perf.test.ts:
(pass) status performance seams > resolves bundle hashes once per status call [3521.58ms]
(pass) status performance seams > resolves orchestrator id once per status call [3530.82ms]

packages/orch/test/nested-spawn-unleased.test.ts:
(pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the middle agent's death leaves the grandchild unleased, held by nobody [46.23ms]
(pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the grandchild stays alive and adoptable, and keeps its own provenance [39.95ms]
(pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the grandparent holding the middle agent does not extend to the grandchild [39.06ms]

packages/orch/test/log-level.test.ts:
(pass) the configured log level reaches every logger > the env var wins over settings.json [0.51ms]
(pass) the configured log level reaches every logger > settings.json is used when the env var is unset [0.53ms]
(pass) the configured log level reaches every logger > an unrecognised env value falls back to the configured level [0.42ms]
(pass) the configured log level reaches every logger > the CLI logger honours the configured level [0.63ms]
(pass) the configured log level reaches every logger > the CLI logger drops records below the configured level [0.39ms]
(pass) the configured log level reaches every logger > the daemon logger resolves through the same helper [0.36ms]

packages/orch/test/daemon-rpc.test.ts:
(pass) daemon RPC > rejects a hello response with a malformed optional field [0.12ms]
(pass) daemon RPC > hello translates an absent daemon instead of reading a missing token [5021.09ms]
1 unleased agent(s) exist - orch adopt 2o5pi9lknd to take one, orch status to see them.
(pass) daemon RPC > an unreachable agent yields a boundary answer, and the outbox is not left pending [280.32ms]
(pass) daemon RPC > round-trips a call over the real unix socket [4.22ms]
(pass) daemon RPC > issues one session identity to sequential invocations from one session [51.83ms]
(pass) daemon RPC > hello returns live agents whose newest lease is closed or absent [63.59ms]
(pass) daemon RPC > hello returns an empty unleased list when none exist [40.06ms]
(pass) daemon RPC > a TCP hello with the daemon token gets an identity [38.99ms]
(pass) daemon RPC > refuses a hello that reports no session pid [4.40ms]
(pass) daemon RPC > refuses a hello without its environment [3.83ms]
(pass) daemon RPC > same session pid keeps its id and a different session pid gets another [55.75ms]
(pass) daemon RPC > refuses a TCP hello without a token [4.30ms]
(pass) daemon RPC > refuses a TCP hello with a wrong token [4.06ms]
(pass) daemon RPC > writes the daemon token with owner-only permissions [3.43ms]
(pass) daemon RPC > returns an error for an unknown method [2.53ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [13.27ms]
(pass) daemon RPC > delivers pushed subscription events [43.38ms]
(pass) daemon RPC > replays durable events after a daemon restart without a gap [307.73ms]
(pass) daemon RPC > reports the oldest sequence when replay starts before the pruned window [38.31ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [8.87ms]
(pass) daemon RPC > has a catchable absent-daemon error [0.44ms]
(pass) daemon RPC > calls a slow daemon unreachable, not absent [103.21ms]
(pass) daemon RPC > calls a refused endpoint absent so a wedged daemon is still reclaimable [0.91ms]
1 unleased agent(s) exist - orch adopt j51gv1q9gb to take one, orch status to see them.
(pass) daemon RPC > dispatch waits for and reports a bridge acknowledgement [355.57ms]
(pass) daemon RPC > dispatch reports unavailable while a live agent has no bridge [271.56ms]
1 unleased agent(s) exist - orch adopt afhsylh3no to take one, orch status to see them.
(pass) daemon RPC > attach reports open rows and re-pushes them [344.62ms]

packages/orch/test/cross-pack-result-delivery.test.ts:
(pass) results go to the enqueuer as mail > a result is an outbox row for the enqueuer, not the runner [67.07ms]
(pass) results go to the enqueuer as mail > a failed task reports its error in the mail body [54.36ms]
(pass) results go to the enqueuer as mail > a cross-wall enqueuer gets no row and the task stays settled [69.85ms]
(pass) acceptMail > refuses a message across the space wall by its reason [51.26ms]
(pass) acceptMail > requires non-empty from, target, and text [48.44ms]
(pass) acceptMail > queues a BridgeMessage steer payload [115.46ms]

packages/orch/test/rename-syncs-the-pane-border.test.ts:
(pass) orch rename syncs the pane border in one command (U5) > one rename sets orch's name AND the plexer chrome [81.19ms]
(pass) orch rename syncs the pane border in one command (U5) > the response states the two outcomes SEPARATELY [76.70ms]
(pass) orch rename syncs the pane border in one command (U5) > a plexer that refuses the chrome never unwrites orch's own name [68.02ms]
(pass) orch rename syncs the pane border in one command (U5) > --pane still gives the border something DIFFERENT, and leaves the name alone [82.53ms]

packages/orch/test/store-instants.test.ts:
(pass) epoch-millisecond store instants > a lease records its holding as an integer instant [74.11ms]
(pass) epoch-millisecond store instants > agents order numerically by their creation instant, never lexically [39.53ms]
(pass) epoch-millisecond store instants > all time-named columns use integer declarations [0.62ms]

packages/orch/test/provenance.test.ts:
(pass) the one provenance walk > ancestors are parent-first, root last [0.10ms]
(pass) the one provenance walk > depth counts hops to the root [0.03ms]
(pass) the one provenance walk > an unknown id is its own root at depth 0 [0.01ms]
(pass) the one provenance walk > an unknown parent ends the chain instead of throwing [0.03ms]
(pass) the one provenance walk > descendant is any depth, never self, never a sibling tree [0.03ms]
(pass) the one provenance walk > a cycle terminates [0.03ms]

packages/orch/test/daemon-rpc-identity.test.ts:
(pass) daemon identity RPCs > claim-identity stamps a minted id [58.35ms]
(pass) daemon identity RPCs > claim-identity refuses an unknown id by naming it [26.92ms]
(pass) daemon identity RPCs > register-session mints one id per session token [44.23ms]
(pass) daemon identity RPCs > the removed method is unknown [2.95ms]

packages/orch/test/transcript.test.ts:
(pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [0.35ms]
(pass) lastAssistantFromJsonl > undefined for blank or empty input [0.05ms]
(pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.07ms]
(pass) assistantText > reads role-tagged records [0.03ms]
(pass) assistantText > reads the {type:'assistant'} envelope with a nested message [0.02ms]
(pass) assistantText > undefined for non-assistant roles [0.03ms]
(pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.06ms]
(pass) contentText empty-string part handling > an all-empty content array yields undefined [0.04ms]
(pass) contentText empty-string part handling > a bare empty string yields undefined [0.02ms]

packages/orch/test/setup-io.test.ts:
(pass) setup prompt answer validation > refuses a single answer that was not offered [0.15ms]
(pass) setup prompt answer validation > refuses multi-select answers containing an unoffered value [0.17ms]

packages/orch/test/close-is-keyed-by-agent-id.test.ts:
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > an agent whose pane is gone is never handed to the plexer as a pane [63.76ms]
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > an agent whose pane is gone still ends, and reports done [74.06ms]
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > what a human is told they closed is the agent, not the plexer's coordinate [55.99ms]
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > the --json closed list names agents, so a caller can map it back [64.88ms]
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > the plexer is still handed the real handle when there IS a pane [58.16ms]

packages/orch/test/daemon-renags-questions.test.ts:
(pass) question re-ask policy > nothing due emits nothing [0.20ms]
(pass) question re-ask policy > an overdue question emits its first re-ask [0.10ms]
(pass) question re-ask policy > an emitted re-ask waits for the interval before emitting again [0.07ms]
(pass) question re-ask policy > a settled question emits no further re-asks [0.05ms]
(pass) question re-ask policy > the limit emits one final gave-up event and then stays silent [0.06ms]

packages/orch/test/caller-kind.test.ts:
(pass) caller kind > id + recorded token is agent [41.19ms]
(pass) caller kind > a harness marker is a session even when its token differs [39.49ms]
(pass) caller kind > a harness marker is a session without a launch credential [54.36ms]
(pass) caller kind > no harness marker is the operator [0.32ms]
(pass) caller kind > an unregistered session asks the daemon registration seam [0.55ms]
(pass) caller kind > override flags are allowed only for the operator [0.26ms]
(pass) caller kind > override flags refuse a driving session [47.58ms]
(pass) caller kind > override flags refuse a spawned agent [39.42ms]

packages/orch/test/status-filter-columns.test.ts:
(pass) orch status --filter on columns > drops the named columns from the default table [0.87ms]
(pass) orch status --filter on columns > a filtered owner column leaves no shared-owner footer [0.21ms]
(pass) orch status --filter on columns > drops the named columns from the human table [0.08ms]
(pass) orch status --filter on columns > drops the same facts from a JSON row [0.15ms]

packages/orch/test/daemon-events.test.ts:
(pass) daemon presence events > closes every watcher when watched agent directories disappear [23.46ms]
(pass) daemon presence events > an RPC subscriber receives a presence transition [54.04ms]
(pass) daemon presence events > a dispatched transition writes the full run row and preserves untruncated result [50.70ms]
(pass) daemon presence events > repeated transitions upsert one run and only terminal states set finishedAt [58.08ms]
(pass) daemon presence events > a status without a dispatch id does not write history [46.03ms]
(pass) daemon presence events > a throwing history write does not stop event delivery [53.74ms]
(pass) daemon presence events > emitted events carry the pack capacity at publish time [47.47ms]
(pass) daemon presence events > a flapping status file cannot storm the stream with repeat transitions [0.26ms]
(pass) daemon presence events > a genuine repeat of the same transition for new work still publishes [0.08ms]
(pass) daemon presence events > a repeat transition publishes again once the suppression window passes [0.04ms]
(pass) daemon presence events > repeated observations cannot slide the suppression window forever [0.03ms]
(pass) daemon presence events > a working-to-done repeat after the dedupe window is emitted [0.06ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [31.64ms]
(pass) daemon presence events > presence transitions use the normalized agent name after rename [34.84ms]
(pass) daemon presence events > derivePresenceTransition preserves the complete asking transition payload [37.20ms]
(pass) daemon presence events > an asking transition drives command sink delivery [49.60ms]

packages/orch/test/skill-store-and-links.test.ts:
(pass) skill store and harness links > writes real files to the store and links each harness dir into it [2.48ms]
(pass) skill store and harness links > replaces a real directory left in a harness dir with a link into the store [1.27ms]
(pass) skill store and harness links > doctor reports a harness dir holding a real directory instead of a link [2.66ms]
(pass) skill store and harness links > doctor passes once every harness dir links into the store [1.90ms]
(pass) skill store and harness links > doctor skips when the user turned the skill install off [0.44ms]

packages/orch/test/backend-process-role.test.ts:
(pass) ProcessRole > headless provider records pid and start token and safely kills it [26.14ms]
(pass) ProcessRole > herdr provider records pid and start token and safely kills it [0.71ms]
(pass) ProcessRole > tmux provider records pid and start token and safely kills it [25.87ms]
(pass) ProcessRole > reports replaced when a pid is reused by a different process token [0.27ms]
(pass) ProcessRole > running returns the process identity for a resolved handle [0.10ms]
(pass) ProcessRole > running throws when the environment reports no process [0.07ms]
(pass) ProcessRole > running records a null token when the OS cannot provide one [0.04ms]
(pass) ProcessRole > the default signal refuses orch's own process and its parent [0.09ms]
(pass) ProcessRole > kill signals a live record that carries no start token [0.08ms]

packages/orch/test/status-unleased.test.ts:
(pass) status owner rendering > leased by a live holder shows that holder [58.69ms]
(pass) status owner rendering > a dead holder is shown as unleased with the holder gone [57.49ms]
(pass) status owner rendering > an agent never leased shows no orch driving it [49.30ms]

packages/orch/test/commands-panes.test.ts:
(pass) commands/panes > pane identity is the minted id alone [0.05ms]
(pass) commands/panes > a plexer-and-space key is not an identity [0.02ms]
(pass) commands/panes > exports the pane listing command directly [0.09ms]

packages/orch/test/store-runs.test.ts:
(pass) run rows > round-trips every field, including a structured result [37.62ms]
(pass) run rows > upsert updates a row while preserving its original start time [35.43ms]
(pass) run rows > orders by started time, filters by agent, and honours limit [36.26ms]
(pass) run rows > omits absent optional fields instead of returning null [25.93ms]
(pass) run rows > deletes only rows older than the cutoff and returns the count [174.95ms]
(pass) run rows > stays readable after the agent presence directory is deleted [406.87ms]

packages/orch/test/doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env node as node [0.58ms]
(pass) shebangRuntime > reads #!/usr/bin/env bun as bun [0.30ms]
(pass) shebangRuntime > reads #!/usr/bin/env deno as deno [0.27ms]
(pass) shebangRuntime > reads #!/usr/local/bin/node as node [0.19ms]
(pass) shebangRuntime > does not mistake a longer binary name for a runtime [0.23ms]
(pass) shebangRuntime > returns null for a file with no shebang [0.23ms]
(pass) shebangRuntime > returns null for an unreadable path [0.22ms]
(pass) runningRuntime > reports the runtime this suite is executing under [0.06ms]
(pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [0.83ms]
(pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [0.54ms]
(pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [0.27ms]
(pass) doctor runtime verdict table > launching under bun while declaring node is fine [0.37ms]
(pass) doctor runtime verdict table > launching under node while declaring bun is fine [0.25ms]
(pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [0.37ms]
(pass) doctor runtime verdict table > declared runtime absent from PATH fails [0.40ms]
(pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [0.32ms]
(pass) doctor runtime verdict table > remediation names both directions — rebuild, or re-record the declaration [0.32ms]
(pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [0.26ms]

packages/orch/test/herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [4.48ms]
(pass) herdr and notification hardening > falls back to a valid name when the identity key contains herdr-invalid separators [0.31ms]
(pass) herdr and notification hardening > nameless notifications use a space label, never a bare pane key [0.25ms]

packages/orch/test/settings-editor.test.ts:
(pass) settings editor reducer > moves focus down and up without running off either end [0.41ms]
(pass) settings editor reducer > opens the focused setting for editing [0.07ms]
(pass) settings editor reducer > cancel leaves value unchanged and returns to browsing [0.05ms]
(pass) settings editor reducer > commit updates value and produces a pending write [0.20ms]
(pass) settings editor reducer > refuses invalid values with a reason and stays open [0.08ms]
(pass) settings editor reducer > refuses opening a read-only setting with a reason [0.07ms]
(pass) settings editor reducer > cancelling without a commit yields zero writes [0.04ms]

packages/orch/test/environment-dictates-what-is-possible.test.ts:
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > a MOVE is a new environment record, and what is possible follows it at once [81.54ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > a move closes the interval it left, so history says WHERE it was and WHEN [72.80ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > moving one axis leaves every other axis exactly where it was [44.57ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > an UPGRADE is a NEW host_plexers row, not an overwrite of the old one [40.22ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > re-declaring the SAME version is not an upgrade and opens no second row [37.67ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > nothing anywhere records what an agent CAN do [31.11ms]

packages/orch/test/daemon-status-lease.test.ts:
(pass) daemon status lease payload > reports the current holder and its liveness [52.30ms]
(pass) daemon status lease payload > distinguishes a known unleased agent from an unknown key [38.12ms]

packages/orch/test/lifecycle-targets.test.ts:
(pass) lifecycle target resolution > prefers one live agent over dead ones sharing its name [0.20ms]
(pass) lifecycle target resolution > reports the target and disambiguating ids for live ambiguity [0.19ms]
(pass) lifecycle target resolution > cleanup can still resolve a dead agent when no live match exists [0.03ms]
(pass) lifecycle target resolution > an agent is addressable by its id, its name, or its pane handle [0.03ms]
(pass) lifecycle target resolution > the pane is environment: moving it leaves every other address intact [0.03ms]

packages/orch/test/parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [0.02ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.03ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.04ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.03ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.03ms]

packages/orch/test/setup-smoke.test.ts:
(pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [0.36ms]
(pass) runSetupSmoke (12.5) > the agent is launched on the prompt it built [0.09ms]
(pass) runSetupSmoke (12.5) > an agent that launches but yields no result times out and fails non-zero [0.91ms]
(pass) runSetupSmoke (12.5) > a rejected spawn fails loudly and never polls for a result [0.72ms]

packages/orch/test/capacity.test.ts:
(pass) fleet capacity > one pack per root, each against the per-pack cap; roots never sum into one pack [0.44ms]
(pass) fleet capacity > a selected root scopes the packs to that one pack [0.19ms]
(pass) fleet capacity > reports configured per-space caps [0.18ms]
(pass) fleet capacity > uses null for an unlimited total [0.10ms]
(pass) fleet capacity > formats one pack per root, the caller's first, then space and machine capacity [0.26ms]

packages/orch/test/agent-key-is-minted-id.test.ts:
(pass) a driving session mints an id, it is not placed by name > the key an interactive session addresses itself by is a bare minted id [1.75ms]
(pass) a driving session mints an id, it is not placed by name > the presence directory is named by that id alone [0.97ms]
(pass) a driving session mints an id, it is not placed by name > a launch that handed over a minted id is used verbatim [0.48ms]
(pass) this process's own identity is the id and nothing else > a spawned agent answers with the id its launch handed it [0.23ms]
(pass) the fleet wall is lifted by the absence of a launch, not by a key's shape > an agent orch launched may not cross into another project's fleet [59.81ms]
(pass) who drives an agent is looked up by its id > the key IS the agent id — no segment is split out of it [37.88ms]
(pass) who drives an agent is looked up by its id > a composite key addresses no agent at all [40.98ms]
(pass) doctor reads a presence directory name as an id > a composite directory name is a malformed identity key [0.62ms]
(pass) doctor reads a presence directory name as an id > a minted id with a current stamp is well formed [24.54ms]

packages/orch/test/launch-model-gate.test.ts:
(pass) the model gate rules by harness membership, not by format > accepts a listed spec, with or without a thinking suffix [0.19ms]
(pass) the model gate rules by harness membership, not by format > refuses a ladder shorthand and names what the harness does offer [0.17ms]
(pass) the model gate rules by harness membership, not by format > accepts each harness's own vocabulary rather than one shared grammar [0.09ms]
(pass) the model gate rules by harness membership, not by format > cannot check a harness that publishes no catalogue, and does not pretend to [0.02ms]
(pass) the settings allowlist applies on top of harness membership > an empty allowlist restricts nothing beyond the harness list [0.55ms]
(pass) the settings allowlist applies on top of harness membership > a configured allowlist refuses a listed model outside its patterns [0.81ms]
(pass) the settings allowlist applies on top of harness membership > harness membership is checked before the allowlist, so the message names the harness [0.25ms]

packages/orch/test/status-live.test.ts:
(pass) live status renderer > renders a clear screen, timestamped header, and table body [4.29ms]
(pass) live status renderer > renders a refresh failure in the header area [0.11ms]
(pass) live status renderer > coalesces a burst into one pending follow-up refresh [0.23ms]
(pass) live status renderer > keeps the existing table renderer available [0.11ms]

packages/orch/test/queue-space-replay.test.ts:
(pass) queue replay keeps typed scope > stored scope offers pack work only to that pack [34.77ms]

packages/orch/test/agent-view.test.ts:
(pass) the agent composer > an agent with no environment rows has every axis absent, not defaulted [47.12ms]
(pass) the agent composer > each axis composes independently, and moving one leaves identity untouched [55.84ms]
(pass) the agent composer > tuning is not environment: it survives a move [53.84ms]
(pass) the agent composer > ownership reads as a live lease, and a released one is not ownership [45.88ms]
(pass) the agent composer > provenance is on the view and is not the same fact as ownership [40.04ms]
(pass) the agent composer > provenance carries the spawner's name, read as a join and never stored twice [35.98ms]
(pass) the agent composer > an agent with no spawner reports no spawner name [32.63ms]
(pass) the agent composer > agentViews is oldest-first and liveAgentViews drops ended agents [37.40ms]
(pass) the agent composer > the axis list is the only place every axis is enumerated [0.44ms]
(pass) the agent composer > the composed shape is exactly the axis list, with nothing extra and nothing missing [35.68ms]
(pass) the agent composer > an unknown agent is null, never an empty shell [30.11ms]

packages/orch/test/command-refusal.test.ts:
(pass) a command refusal is thrown, not exited > an unresolvable target throws a CommandRefusal instead of killing the process [21.50ms]
(pass) a command refusal is thrown, not exited > the refusal carries the reason a human needs [24.22ms]

packages/orch/test/herdr-notify-busy.test.ts:
(pass) a herdr notification is delivered only when herdr says it was shown > shown is a delivery [0.11ms]
(pass) a herdr notification is delivered only when herdr says it was shown > busy is NOT a delivery, however herdr exited [0.02ms]
(pass) a herdr notification is delivered only when herdr says it was shown > every other refusal herdr can answer with is also not a delivery [0.05ms]
(pass) a herdr notification is delivered only when herdr says it was shown > output that is not a herdr answer is never read as a delivery [0.06ms]
(pass) a busy herdr is waited out, not dropped > a toast shown on the first try is sent once and waits for nothing [0.14ms]
(pass) a busy herdr is waited out, not dropped > a busy herdr is retried after a wait, and the retry is the delivery [0.05ms]
(pass) a busy herdr is waited out, not dropped > a herdr that stays busy gives up rather than blocking the daemon forever [0.06ms]
(pass) a busy herdr is waited out, not dropped > a refusal that waiting cannot fix is not retried [0.03ms]

packages/orch/test/check-bridge.test.ts:
(pass) presence filenames stay limited to the live protocol > inbox.jsonl is no longer a presence-filename breach [0.36ms]
(pass) presence filenames stay limited to the live protocol > status.json remains a presence-filename breach [0.08ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.08ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.04ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / settings seams [0.03ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [0.25ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.07ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.02ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the shared harness model port outside the adapter dispatcher [0.01ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [0.18ms]
(pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > flags a runtime adapter importing bridge-bundles/build.ts [0.08ms]
(pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > allows scripts and the build-tool module itself [0.02ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [0.04ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.03ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.05ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke test holds no exemption: the branch was deleted, not blessed [0.04ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has no identity-branch line, exempted or otherwise [1.70ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > flags spawner key and spawnerIdentity key owner-token fallbacks [0.08ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > allows a benign line [0.01ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > passes the clean tree: reply addresses never use owner-token fallbacks [0.69ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags object literals that synthesize an identity [0.10ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags concatenated and template identity keys [0.11ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > allows a fresh spawn mint and the issuer modules [0.03ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > no file is exempt from the identity-construction rule [0.01ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > passes the clean tree: every identity construction is allowed or registered [0.77ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.05ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.01ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [0.25ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > a deleted capability bag or optional method is not exempt [0.34ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > the exempted names are the roles the ports actually declare [0.06ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > nullable data on the port is not exempted as a role [0.03ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > flags plexer and harness identity branches [0.03ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > flags method-presence capability checks [0.09ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > allows a branch inside a concrete backend [0.01ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > passes the clean tree: no file in ANY scanned scope branches on an environment id [27.09ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > the core-scope allowlist is EMPTY, so no line holds a standing exemption [0.16ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > allows capability-driven code [0.04ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags INSERT and UPDATE SQL that welds a lease holder into spawned_by [0.28ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags lease row types carrying a provenance field [0.06ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > allows separate lease and provenance rows [0.12ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > passes the clean tree: no source line crosses lease and provenance columns [15.72ms]
(pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a launch env read outside launch.ts with the file and constant named [0.36ms]
(pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > allows the launch env read inside identity/launch.ts [0.06ms]
(pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a bare launch env name literal outside launch.ts [0.04ms]
(pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a comment mentioning the launch env name outside launch.ts [0.02ms]
(pass) the closed plexer-id set is spelled in exactly one line > the definition line is allowed where it lives, and nowhere else [0.08ms]
(pass) the closed plexer-id set is spelled in exactly one line > any other quoted plexer id in that same file still fails [0.04ms]
(pass) the closed plexer-id set is spelled in exactly one line > the line src/types/backend.ts actually carries is the allowed one [0.75ms]
(pass) the closed plexer-id set is spelled in exactly one line > extensions get the same rule with their own scope named [0.09ms]

packages/orch/test/plexer-versions.test.ts:
(pass) plexer version support > a floor admits every version at or above it [0.20ms]
(pass) plexer version support > compares numeric versions rather than lexical strings [0.08ms]
(pass) plexer version support > rotates one open host install row when the plexer changes version [52.27ms]
(pass) plexer version support > doctor names both versions and tells the operator to update the plexer [0.19ms]
(pass) plexer version support > a supported plexer the user never installed is not a complaint [0.04ms]
(pass) plexer version support > an in-range install reports ok with the version it read [0.07ms]
(pass) plexer version support > a compatible server rides along on the row without complaint [0.05ms]
(pass) plexer version support > a server the installed client outgrew fails and names the restart [0.05ms]
(pass) plexer version support > a server that reports no compatibility is unknown, never a failure [0.16ms]
(pass) plexer version support > a plexer with no server running says nothing about one [0.13ms]
(pass) plexer version support > only an installed plexer that cannot report a version warns [0.04ms]

packages/orch/test/settings-defects.test.ts:
(pass) settingsDefects > returns no defects for an absent file [0.28ms]
(pass) settingsDefects > returns no defects for a valid settings file [0.42ms]
(pass) settingsDefects > reports unparsable JSON as one file defect [0.28ms]
(pass) settingsDefects > suggests a near-match for a stale key [0.79ms]
(pass) settingsDefects > does not guess a replacement for a removed key [0.62ms]
(pass) settingsDefects > reports the expected pinned schema value [0.50ms]
(pass) settingsDefects > reports a wrong value type on a real key [0.47ms]

packages/orch/test/store-rebuild-schema.test.ts:
(pass) rebuild schema > rebuild DDL inventory is exact [23.21ms]
(pass) rebuild schema > the store opens migrated, with foreign keys enabled [28.63ms]
(pass) rebuild schema > all ten partial unique indexes allow only one open row [373.36ms]
(pass) rebuild schema > enforces foreign keys and agent checks [38.28ms]
(pass) rebuild schema > requires exactly one task scope [40.38ms]
(pass) rebuild schema > allows one open attempt only [90.88ms]
(pass) rebuild schema > enforces lease checks and one lease [57.99ms]
(pass) rebuild schema > remaining documented CHECKs and cascades are enforced [53.64ms]
(pass) rebuild schema > task_states derives queued claimed and outcomes [55.69ms]

packages/orch/test/wall-single-owner.test.ts:
(pass) space wall ownership > keeps the wall decision primitive in one source module [8.28ms]

packages/orch/test/spawn-identity.test.ts:
(pass) one key per pane spawn (12.1) > identity is an opaque minted id — never the name, never the pane handle [51.16ms]
(pass) one key per pane spawn (12.1) > a name freed by a dead agent is reusable, and the two agents differ in identity [69.95ms]
(pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [64.01ms]
(pass) A1: spawn registration records the space as an environment axis > a spawn into a space writes agent_spaces, and the composer reads it back [52.98ms]
(pass) A1: spawn registration records the space as an environment axis > a spawn stating no space records NO ROW — a missing axis is a missing row [45.88ms]
(pass) A1: spawn registration records the space as an environment axis > moving an agent to another space closes the old interval and keeps its identity [52.96ms]

packages/orch/test/answer-dispatch.test.ts:
(pass) answer over the bridge > pushes the answer and its question id [48.32ms]
(pass) answer over the bridge > returns not-asking without pushing [47.46ms]
(pass) answer over the bridge > reports a detached bridge for a live asking agent [49.36ms]
(pass) answer over the bridge > reports a gone asking agent [24.94ms]
(pass) answer over the bridge > answers with a clear absence when the adapter takes no answers [45.32ms]

packages/orch/test/adapter-allowlist.test.ts:
(pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [0.36ms]
(pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.06ms]
(pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.02ms]
(pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.03ms]
(pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.09ms]
(pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.05ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.18ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.03ms]
(pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.04ms]

packages/orch/test/recipient-label.test.ts:
(pass) agent identity shown to an operator > names the agent and its harness, never the transport key [0.05ms]
(pass) agent identity shown to an operator > drops the routing prefix when nothing is known about it [0.02ms]
(pass) agent identity shown to an operator > a nameless agent gets a stable logical name, not its key [0.05ms]

packages/orch/test/build-bin.test.ts:
(pass) build entrypoint > always stamps a node shebang and executable mode [0.38ms]
(pass) the installed CLI is the packaged build, never live source (K2) > the `orch` bin points at the packaged entrypoint, not bin/orch.ts [0.03ms]
(pass) the installed CLI is the packaged build, never live source (K2) > the packaged entrypoint is built for node, from the source entrypoint [0.02ms]
(pass) the installed CLI is the packaged build, never live source (K2) > a global install cannot happen without a build in front of it [0.03ms]
(pass) the installed CLI is the packaged build, never live source (K2) > the package ships dist/, so what is installed is what was built [0.01ms]

packages/orch/test/tool-exec-retry.test.ts:
(pass) every command into a harness or plexer retries on timing, not on being wrong > a transient refusal is reattempted until it succeeds [3.48ms]
(pass) every command into a harness or plexer retries on timing, not on being wrong > a failure the caller calls permanent is thrown on the FIRST attempt, never retried [0.22ms]
(pass) every command into a harness or plexer retries on timing, not on being wrong > a tool that never recovers exhausts the budget and reports how many attempts it cost [7.53ms]
(pass) every command into a harness or plexer retries on timing, not on being wrong > the seam names no harness: the same policy drives a different binary [1.34ms]

packages/orch/test/daemon-idle.test.ts:
(pass) orchd idle shutdown rule > a zero setting disables idle shutdown entirely [0.06ms]
(pass) orchd idle shutdown rule > a live agent holds the daemon open however long it has been quiet [0.02ms]
(pass) orchd idle shutdown rule > an event subscriber holds the daemon open [0.03ms]
(pass) orchd idle shutdown rule > recent activity holds the daemon open below the threshold [0.02ms]
(pass) orchd idle shutdown rule > a fully idle daemon past the threshold is due to exit [0.02ms]

packages/orch/test/notify-ding.test.ts:
(pass) notify/ding > the sound sink is a declared sink that takes no configuration [0.19ms]
(pass) notify/ding > this host names the players it would use, and says how to get one [0.08ms]
(pass) notify/ding > a command string runs through the host's own shell; argv is passed through untouched [0.04ms]

packages/orch/test/commands-clean.test.ts:
(pass) commands/clean > the forced sweep reaps dead agent dirs but preserves live processes [44.39ms]
{"malformed":["herdr~wF~p9"],"closed":2,"removed":[],"worktrees":0}
(pass) commands/clean > bare clean keeps ended agents as history and closes their queued writes [54.91ms]
{"malformed":[],"closed":1,"removed":["deadagent1"],"worktrees":0}
(pass) commands/clean > --force reaps the ended agent and closes its queued writes [33.33ms]
(pass) worktree ownership reads the composed environment > a live agent's worktree is protected and a dead one's is not [40.67ms]
(pass) orch clean is destructive maintenance > a spawned agent is refused the sweep, and the dirs it does not own survive [36.40ms]

packages/orch/test/queue.test.ts:
(pass) queue facade on tasks and attempts > malformed task options are refused instead of handed back as TaskOptions [44.84ms]
(pass) queue facade on tasks and attempts > enqueue selects exactly one typed scope and defaults to the enqueuer pack [44.48ms]
(pass) queue facade on tasks and attempts > agent scope requires the enqueuer to lease the target [45.80ms]
(pass) queue facade on tasks and attempts > Cq1: the gate is on enqueuing into a scope, and adoption earns it [62.67ms]
(pass) queue facade on tasks and attempts > Cq1: a pack drains its queue with its orch dead and no lease in force [57.20ms]
(pass) queue facade on tasks and attempts > claiming excludes another pack and space claims require open intake [52.05ms]
(pass) queue facade on tasks and attempts > Cq3: a space-scoped task is an offer, and only an opted-in pack consumes it [58.39ms]
(pass) queue facade on tasks and attempts > a failed pack attempt retries on another member, never outside the pack [50.63ms]
(pass) queue facade on tasks and attempts > Cq5: an agent-scoped binding is to the agent and survives adoption [48.26ms]
(pass) queue facade on tasks and attempts > Cq13: adoption carries the queue — pack work comes with the agents [46.97ms]
(pass) queue facade on tasks and attempts > a claim is an insert and a lost race returns false [43.25ms]
(pass) queue facade on tasks and attempts > cancel rights are enqueuer, targeted agent's leasing orch, or human [56.54ms]
(pass) queue facade on tasks and attempts > Cq7: origin_workspace is gone from the tasks table, scope replaces it [37.28ms]
(pass) queue facade on tasks and attempts > state and attempt-derived values have no legacy flattened fields [38.04ms]

packages/orch/test/log-record.test.ts:
(pass) the one log record shape > writes one JSONL record per call, with an epoch-millis instant [2.83ms]
(pass) the one log record shape > a record below the configured level is not written at all [0.44ms]
(pass) the one log record shape > a correlation id rides every record of one dispatch, so one grep finds its whole life [0.39ms]
(pass) the one log record shape > agentId carries orch's minted id; a plexer handle is a field, never the identity [0.25ms]
(pass) the one log record shape > every level is orderable, lowest to highest [0.03ms]
(pass) the one log record shape > a malformed line is rejected by the guard rather than trusted [0.04ms]

packages/orch/test/one-bind-for-the-unix-endpoint.test.ts:
(pass) one bind for the unix endpoint (2.4) > the unix endpoint is claimed in exactly one place [0.04ms]
(pass) one bind for the unix endpoint (2.4) > reclaiming a stale socket yields the endpoint a first bind produces [5.79ms]

packages/orch/test/spawn-placement.test.ts:
orch is not running inside herdr and no backend was chosen - spawning headless. Pass --backend herdr or set defaults.backend to open a herdr home for these agents (the user grants it), or --space <id> to place them in an open space.
(pass) outside every plexer, spawn is headless unless the human chose one > a plexer orch only probed, from a plain terminal, spawns headless [24.43ms]
(pass) outside every plexer, spawn is headless unless the human chose one > a chosen plexer stays selected and its home is what the human grants [21.40ms]
orch is not running inside herdr and herdr cannot open a space of its own - spawning headless. Pass --backend herdr or set defaults.backend to open a herdr home for these agents (the user grants it), or --space <id> to place them in an open space.
(pass) outside every plexer, spawn is headless unless the human chose one > a chosen plexer that cannot open a home still falls back to headless [21.38ms]
(pass) outside every plexer, spawn is headless unless the human chose one > a caller recorded inside the plexer stays in it, chosen or not [35.24ms]
(pass) outside every plexer, spawn is headless unless the human chose one > a named space is placement enough: no chosen backend needed [21.75ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a named space is orch's own id, and the workspace is its RECORDED home [36.23ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > with no space, orch INSIDE the plexer spawns beside itself and opens nothing [28.80ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a caller INSIDE the plexer whose recorded place is gone resolves no coordinate, never another [28.39ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a caller INSIDE the plexer with NO orch identity (a human's pane) spawns beside itself [31.00ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > with no space and orch OUTSIDE the plexer, the PACK gets its own marked home [34.83ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > the same pack spawning again reuses its home and asks the human nothing [31.78ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > an environment that holds nothing answers with an absence, never a refusal [29.10ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a space with no home HERE places the fleet without borrowing another plexer's [31.85ms]

packages/orch/test/holder-death-costs-a-driver.test.ts:
(pass) holder death costs a driver, not a life (D2) > the task in flight finishes and its result survives the holder [44.62ms]
(pass) holder death costs a driver, not a life (D2) > the lease closes `expired` — not `released`, because no caller held it [35.06ms]
(pass) holder death costs a driver, not a life (D2) > the agent stays alive, unleased and adoptable — nothing closes it [46.64ms]
(pass) holder death costs a driver, not a life (D2) > it receives no new work: the death hands the agent to nobody [41.04ms]
(pass) holder death costs a driver, not a life (D2) > expiry is recorded once and does not erase who held it [40.93ms]
(pass) holder death costs a driver, not a life (D2) > clearing a dead holder's lease is never refused, and is idempotent [44.68ms]

packages/orch/test/hermetic-env.test.ts:
(pass) the test suite is hermetic > no plexer environment leaks in from the shell that launched bun [0.14ms]

packages/orch/test/a-row-is-not-a-pane.test.ts:
(pass) a row is not evidence that a pane exists (U1, U4) > a recorded handle the plexer does not list is reported as NO pane [38.61ms]
(pass) a row is not evidence that a pane exists (U1, U4) > the agent itself is still there — losing a pane costs a shortcut, not a life [42.34ms]
(pass) a row is not evidence that a pane exists (U1, U4) > a handle the plexer DOES list is kept [39.67ms]

packages/orch/test/settings-repair-write.test.ts:
(pass) applySettingsRepairs > rename carries the value to the new key [1.55ms]
(pass) applySettingsRepairs > rename onto an occupied key throws and leaves the file untouched [0.60ms]
(pass) applySettingsRepairs > set writes a value at a dotted path [0.75ms]
(pass) applySettingsRepairs > drop deletes a value without pruning its parent [0.69ms]
(pass) applySettingsRepairs > applies several repairs in one call [0.73ms]
(pass) applySettingsRepairs > repairs a schema-rejected file before readSettingsFile validates it [0.97ms]

packages/orch/test/store-queue.test.ts:
(pass) queue facade storage > state is derived from attempts rather than stored on tasks [45.02ms]
(pass) queue facade storage > retention deletes only settled tasks older than the cutoff [39.49ms]
(pass) queue facade storage > retention never removes a queued task based on its age [33.75ms]
(pass) queue facade storage > agent-scoped tasks become unrunnable when their agent ends [36.29ms]
(pass) queue facade storage > completed tasks stay done after their scope agent ends [39.62ms]
(pass) queue facade storage > a dead orch does not make a pack task unrunnable while a member lives [36.54ms]
(pass) queue facade storage > pack-scoped tasks become unrunnable when every pack member ends [32.62ms]

packages/orch/test/commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [500.50ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [500.47ms]
(pass) commands/lifecycle > --all targets the agents this orch holds a live lease on, and drops them when it releases [63.73ms]

packages/orch/test/settings-shell.test.ts:
(pass) settings shell decisions > non-TTY takes the print path [3.97ms]
(pass) settings shell decisions > an overridden setting is refused with the winner named [0.36ms]
(pass) settings shell decisions > registered writes use the registry entry [1.23ms]
(pass) settings shell decisions > registry exposes writable subcommand entries [0.19ms]

packages/orch/test/worker-tools.test.ts:
(pass) worker tool policy > no configured allowlist restricts nothing [0.14ms]
(pass) worker tool policy > a configured allowlist always carries orch's own tools [0.04ms]
(pass) worker tool policy > peer tools join the allowlist when the fleet enables them [0.02ms]

packages/orch/test/spawn-policy.test.ts:
(pass) spawn policy caps > spawn, dispatch, reset, and model share one resolved tuning [0.81ms]
(pass) spawn policy caps > launch env uses the minted agent id name [0.02ms]
(pass) spawn policy caps > worker prompt depth > root worker maySpawn follows max_depth [0.26ms]
(pass) spawn policy caps > allows a pack spawn while under the cap [0.41ms]
(pass) spawn policy caps > blocks an at-cap spawn and offers dispatch or the pack queue [0.21ms]
(pass) spawn policy caps > a slave may not spawn by default: fleet.max_depth is 1 [0.12ms]
(pass) spawn policy caps > fleet.max_depth 2 lets a slave spawn and refuses its child [0.12ms]
(pass) spawn policy caps > reads a pack cap override from settings [0.42ms]
(pass) spawn policy caps > a tab holds at most fleet.max_agents_per_tab agents, counting what it already holds [0.66ms]
(pass) spawn policy caps > a refused cmdSpawn makes no name, worktree, registry, or queue mutation [57.49ms]

packages/orch/test/thinking-resolution.test.ts:
(pass) thinking resolution > resolves every rung in priority order [0.61ms]
(pass) thinking resolution > bare model with no setting yields harness default [0.38ms]
(pass) thinking resolution > pi translates the resolved level through its thinking role [0.09ms]
(pass) thinking resolution > per-harness override beats global default [0.27ms]

packages/orch/test/herdr-hud-environment.test.ts:
(pass) the herdr HUD reads its pane from the composer, never from the key > a herdr-placed agent reports the handle its environment carries [46.29ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > the handle follows the agent when it moves pane [48.17ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > an agent on another plexer is not a herdr pane [46.00ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > a process orch never launched is not a herdr pane [0.39ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > a key that is not a minted id resolves to no pane at all [0.29ms]

packages/orch/test/setup-flags.test.ts:
(pass) setup model flags > rejects a bare model when multiple harnesses are selected [0.20ms]
(pass) setup model flags > binds each model flag to its own harness [0.12ms]
(pass) setup model flags > allows a bare model for one harness [0.05ms]
(pass) setup model flags > rejects a model bound to an unselected harness [0.14ms]
(pass) setup model flags > rejects duplicate model flags for one harness [0.06ms]

packages/orch/test/setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [1846.29ms]
(pass) notifier setup logic > lists unavailable notifiers with remediation and disables selection [0.14ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.20ms]
(pass) notifier setup logic > renders a command entry that loadSettings can parse [1.02ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.35ms]

packages/orch/test/claude-hooks.test.ts:
(pass) Claude hook command > gates execution on the launch environment variable [1.56ms]

packages/orch/test/port-has-no-shell.test.ts:
(pass) the backend port has no dead workspace shell > backend types contain neither deleted declaration [3.06ms]
(pass) the backend port has no dead workspace shell > src contains no workspaceNames calls or BackendWorkspace references [3.88ms]

packages/orch/test/daemon-credential.test.ts:
(pass) the token file is the whole credential > the token is 0600 [1.97ms]
(pass) the token file is the whole credential > $ORCH_DIR is 0700, so same-uid is a boundary the filesystem enforces [1.70ms]
(pass) the token file is the whole credential > a token left loose by an earlier run is tightened, not trusted [1.46ms]
(pass) the token file is the whole credential > a runtime directory the daemon creates is 0700 too [1.44ms]
(pass) the token file is the whole credential > nothing else is enrolled: there is no allowlist beside the token [1.49ms]

packages/orch/test/peer-identity.test.ts:
(pass) spawner identity > a bare operator with no session markers is just the operator [30.53ms]
(pass) spawner identity > an unregistered Claude Code session is labelled by its harness, with no id [21.05ms]
(pass) spawner identity > a session orch has registered IS addressable, by the id orch minted [33.50ms]
(pass) spawner identity > an unregistered session has no id to hand out, and does not invent one [0.81ms]
(pass) spawner identity > an orch-spawned orchestrator acts as the id orch minted for it [38.55ms]
(pass) spawner identity > agentIdentityEnv stamps a reply address only when the spawner has one [0.22ms]
(pass) spawner identity > worktreeEnv stamps worktree identity only for isolated agents [0.07ms]
(pass) spawner identity > the registry keeps the exact spawning session distinct from the lease holder [51.95ms]
(pass) the spawner address invariant > an UNREGISTERED session stamps no address, so no worker is handed an unreachable one [0.32ms]
(pass) the spawner address invariant > a bare operator stamps no address [25.86ms]
(pass) the spawner address invariant > an address that IS stamped resolves to a live status record [37.96ms]
(pass) peer identity in messaging > peer summaries render an unplaced agent without a local place name [44.55ms]
(pass) peer identity in messaging > orch_send reports the peer's NAME and calls the message RPC [46.63ms]
