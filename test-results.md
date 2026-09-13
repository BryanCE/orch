bun test v1.4.0 (34cbb9a40)

packages/orch/integration/daemon-registration.test.ts:
(pass) machine daemon registration > refuses a second start and names the live socket [1.58ms]
(pass) machine daemon registration > the refusal a second start prints names the live daemon's pid [0.77ms]
(pass) machine daemon registration > doctor names both when a second daemon is live beside the registered one [3.45ms]
(pass) machine daemon registration > evicts a registration whose process instance no longer matches [0.79ms]
(pass) machine daemon registration > routes a different orch dir to its own runtime files [0.93ms]
(pass) machine daemon registration > doctor distinguishes registered-but-dead from live-and-registered [0.70ms]

packages/orch/integration/codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [0.37ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [0.76ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [0.63ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [0.59ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [0.54ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [83.84ms]

packages/orch/integration/routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves pack selection [56.73ms]
(pass) store hardening > a fresh store creates the full current schema with WAL enabled [34.67ms]
(pass) store hardening > the store refuses a second open holding, so ownership cannot fork [39.37ms]
(pass) store hardening > adoption closes the prior holding in the same step that opens the new one [53.81ms]
(pass) store hardening > the attempt insert claim is exactly once [42.25ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [157.51ms]

packages/orch/integration/reset-build-safety.test.ts:
(pass) build reset safety > --build dry-run never names a path inside ORCH_DIR [125.45ms]

packages/orch/integration/claude-adapter.test.ts:
(pass) Claude adapter > declares its identity, and composes only the roles it fully implements [0.24ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.09ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.10ms]
(pass) Claude adapter > detects state from a live presence status [25.77ms]
(pass) Claude adapter > extracts results.jsonl before transcript and native output [1.11ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [0.68ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [49.33ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [156.64ms]
(pass) Claude adapter > exits silently and writes no presence without launch env (a non-orch session) [35.81ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed launch env [37.75ms]

packages/orch/integration/cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.20ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.08ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.13ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.13ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.08ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.24ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [0.19ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no plexer answers [0.11ms]
(pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [58.38ms]
(pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [0.39ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [131.71ms]
(pass) headless common path: identity key -> presence > one adapter uses the same opaque key across headless and tmux routes [0.22ms]
(pass) headless common path: identity key -> presence > a key carries no environment to read back out of it [0.04ms]

packages/orch/integration/daemon-no-peer-credentials.test.ts:
(pass) the daemon asks for a token and nothing else > no peer-credential or ancestry syscall appears in the daemon at all [0.96ms]
(pass) the daemon asks for a token and nothing else > a caller the daemon has no relationship to is accepted on the token alone [53.87ms]
(pass) the daemon asks for a token and nothing else > that same stranger without the token is refused, so the token is what decided [3.03ms]

packages/orch/integration/owner-scoping.test.ts:
(pass) fleet ownership scoping > fleet visibility follows provenance depth, not caller environment [119.96ms]
(pass) fleet ownership scoping > owner token uses ORCH_OWNER, else this process's own minted id [26.08ms]
(pass) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [54.49ms]
(pass) fleet ownership scoping > close --all works without an owner token [191.12ms]
skipping caller: unknown backend null (reaping the record)
skipping other: unknown backend null (reaping the record)
{"closed":["caller","klmine0001","klforeign1","other"],"results":[{"target":"caller","handle":null,"outcome":"done","error":null},{"target":"klmine0001","handle":"mine","outcome":"done","error":null},{"target":"klforeign1","handle":"foreign","outcome":"done","error":null},{"target":"other","handle":null,"outcome":"done","error":null}],"requested":4,"ok":4,"stream":false}
(pass) fleet ownership scoping > close --all closes all managed records regardless of owner [86.04ms]
(pass) fleet ownership scoping > driving verbs remain gated against a live foreign holder [738.81ms]
(pass) fleet ownership scoping > result refuses a foreign-owned agent and names its owner [323.76ms]
(pass) fleet ownership scoping > pane mutations refuse a foreign-owned agent and name its owner [532.63ms]
(pass) fleet ownership scoping > close has no force option and remains unconditional without it [368.66ms]
{"closed":["kmismatch1"],"results":[{"target":"kmismatch1","handle":"{\"pid\":28787,\"key\":\"kmismatch1\"}","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) fleet ownership scoping > close cleans up a mismatched recorded process without signalling [63.29ms]
(pass) a spawned agent touches only what it spawned > a spawned agent acts as its own minted id, not its launch key [0.49ms]
(pass) a spawned agent touches only what it spawned > --cross-space from a spawned agent is refused [192.74ms]
(pass) a spawned agent touches only what it spawned > close --all from an AGENT sweeps only its own subtree [209.72ms]
(pass) a spawned agent touches only what it spawned > close --all from the HUMAN sweeps every managed spawn, whoever spawned it [217.98ms]
(pass) a spawned agent touches only what it spawned > close from a spawned agent is REFUSED when the target is not its own [184.03ms]
(pass) a spawned agent touches only what it spawned > close from a spawned agent SUCCEEDS on a slave it spawned itself [209.63ms]
(pass) a spawned agent touches only what it spawned > the workspace operator keeps control of an agent-owned fleet [198.07ms]

packages/orch/integration/presence-schema.test.ts:
(pass) presence status schema > reads a spawned identity without placement fields in status [65.10ms]
(pass) presence status schema > orch status JSON exposes the agent status fields [44.15ms]
(pass) presence status schema > status and list report the same agent identity [61.17ms]
(pass) presence status schema > mixed pi and Claude status rows carry the same status field set [54.98ms]
(pass) presence status schema > rejects a status record that carries no schema stamp [43.31ms]
(pass) presence status schema > rejects a status record stamped with a non-current schema [40.83ms]
(pass) presence status schema > rejects a current-schema record carrying placement fields [41.20ms]
(pass) presence status schema > a malformed record is skipped without hiding the valid records beside it [38.64ms]
(pass) presence status schema > the four facts are recorded apart and composed back onto the minted id [35.62ms]

packages/orch/integration/os-executors.test.ts:
(pass) cross-OS execution is a backend, not a peer daemon > the local side supplies start, is-alive and kill [0.15ms]
(pass) cross-OS execution is a backend, not a peer daemon > an OS side with no executor answers, and never runs the body [0.10ms]
(pass) cross-OS execution is a backend, not a peer daemon > the local side runs the body and hands back its value [0.06ms]
(pass) cross-OS execution is a backend, not a peer daemon > doctor passes a daemon registered on the side orch is running on [0.59ms]
(pass) cross-OS execution is a backend, not a peer daemon > doctor answers, rather than failing, for a daemon on a side with no executor [0.38ms]

packages/orch/integration/close-always.test.ts:
{"closed":["panename01","panekey001","paneid0001"],"results":[{"target":"panename01","handle":"pane-name","outcome":"done","error":null},{"target":"panekey001","handle":"pane-key","outcome":"done","error":null},{"target":"paneid0001","handle":"pane-id","outcome":"done","error":null}],"requested":3,"ok":3,"stream":false}
(pass) close always works > closes a foreign-space target by name, key, or pane id [111.01ms]
Could not close survives01: pane-survives is still listed by headless after the close
{"closed":[],"results":[{"target":"survives01","handle":"pane-survives","outcome":"error","error":"pane-survives is still listed by headless after the close"}],"requested":1,"ok":0,"stream":false}
(pass) close always works > a successful backend close retains a pane that is still listed [59.01ms]
Could not close signalfai1: cannot signal process 28302: orch is running in it
{"closed":[],"results":[{"target":"signalfai1","handle":"pane-signal-failed","outcome":"error","error":"cannot signal process 28302: orch is running in it"}],"requested":1,"ok":0,"stream":false}
(pass) close always works > a failed signal retains the registry and presence and reports failure [52.08ms]
{"closed":["presence01"],"results":[{"target":"presence01","handle":"pane-presence-only","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) close always works > presence pid without a recorded process closes the pane without signalling and ends the row [62.78ms]
{"closed":["owned00001"],"results":[{"target":"owned00001","handle":"pane-owned","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) close always works > close ignores owner and spawnedBy gates [63.16ms]
{"outcome":"answer","reason":"no-environment-role","text":"this pane environment does not provide abort"}
(pass) close always works > abort ignores owner gate [59.60ms]
{"closed":["duplicate1"],"results":[{"target":"duplicate1","handle":"pane-duplicate","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) close always works > duplicate close targets count once [70.98ms]
(pass) close always works > dead pane-less close is a successful no-op that ends the row and leaves presence to reap [194.64ms]
(pass) close always works > steer remains blocked by the space wall [64.35ms]

packages/orch/integration/identity-launch.test.ts:
(pass) launchCredential > returns null when the launch environment is unset [3.56ms]
(pass) launchCredential > returns a minted id [0.34ms]
(pass) launchCredential > malformed value exits 1 and logs launch.invalid-key [14.91ms]

packages/orch/integration/settings-command.test.ts:
(pass) orch settings > every registered setting is reachable through --json [112.99ms]
(pass) orch settings > every registered setting is printed in the table [116.80ms]
(pass) orch settings > --json reports value + source per setting, settings.json winning over defaults [130.45ms]
(pass) orch settings > --json reports env as the winning source over settings.json [111.47ms]
(pass) orch settings > --harness switches defaults.adapter between enabled ids and rejects a non-enabled id [318.02ms]
(pass) orch settings > reports each harness's picker quicklist and launch gate as separate rows [115.80ms]
(pass) orch settings > a load error surfaces loudly with no partial table [104.88ms]
(pass) orch settings > sets a boolean through its registry entry [110.83ms]
(pass) orch settings > sets an integer through its registry entry [118.72ms]
fleet.max_depth = 6
(pass) orch settings > single-setting set delegates to the registry writer [2.93ms]
(pass) orch settings > sets a choice through its registry entry [113.76ms]
(pass) orch settings > sets a multi value through its registry entry [110.07ms]
(pass) orch settings > sets a list value through its registry entry [121.81ms]
(pass) orch settings > refuses an invalid boolean and names the allowed values [111.82ms]
(pass) orch settings > refuses an invalid integer and names the allowed range [117.59ms]
(pass) orch settings > refuses an invalid choice and names the allowed choices [115.43ms]
(pass) orch settings > refuses an invalid multi value and names the allowed choices [113.97ms]
(pass) orch settings > refuses an invalid list and names JSON as the allowed format [106.38ms]
(pass) orch settings > refuses an unknown key and suggests nearest valid keys [113.89ms]
(pass) orch settings > refuses read-only runtime and names the editing subcommand [120.16ms]

packages/orch/doctor/doctor-checks.test.ts:
(pass) doctor provenance-depth checks > finds a live agent deeper than fleet.max_depth [62.30ms]
(pass) doctor provenance-depth checks > accepts a live agent at fleet.max_depth [48.72ms]
(pass) doctor unclaimed-agent checks > finds an old unclaimed live agent with its age [40.84ms]
(pass) doctor unclaimed-agent checks > ignores a claimed agent [49.42ms]
(pass) doctor unclaimed-agent checks > ignores a fresh unclaimed agent under the threshold [39.63ms]
(pass) doctor notification-sink checks > reports no sinks as healthy [0.67ms]
(pass) doctor notification-sink checks > rejects a webhook with a malformed URL [2.00ms]
(pass) doctor notification-sink checks > uses the notify-send prerequisite install command in desktop remediation [1.28ms]
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [1.12ms]
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [0.54ms]
(pass) doctor notification-sink checks > warns when a notifier omits done from its on list [0.56ms]
(pass) doctor notification-sink checks > does not warn when a notifier includes done in its on list [0.43ms]
(pass) doctor notification-sink checks > keeps unavailable notifier failures when done is omitted [0.46ms]

packages/orch/doctor/doctor-settings-defects.test.ts:
(pass) doctor settings defects > accepts an absent settings file [0.48ms]
(pass) doctor settings defects > accepts a clean settings file and keeps its path detail [0.58ms]
(pass) doctor settings defects > reports malformed JSON as a file defect [0.44ms]
(pass) doctor settings defects > reports a read failure instead of throwing [0.32ms]
(pass) doctor settings defects > reports a stale key with the value that was written [2.22ms]
(pass) doctor settings defects > reports a typo with its suggested key [0.73ms]
(pass) doctor settings defects > reports the expected schema version [0.49ms]
(pass) doctor settings defects > skips settings-dependent checks with a short repair hint [29.15ms]

packages/orch/doctor/doctor-declared-vs-reality.test.ts:
(pass) doctor declared-vs-reality > describes composed and absent backend roles [0.61ms]
(pass) doctor declared-vs-reality > reports a lease whose recorded holder process is dead [46.62ms]
(pass) doctor declared-vs-reality > reports an environment handle missing from its plexer [40.33ms]
(pass) doctor declared-vs-reality > reports a live agent with no lease and no live spawner [43.86ms]
(pass) doctor declared-vs-reality > surfaces a missing task scope row as unrunnable [67.31ms]
(pass) doctor declared-vs-reality > doctor -y does not delete an unrunnable task [59.55ms]

packages/orch/doctor/doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [50.62ms]
(pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [118.41ms]
(pass) doctor stale presence safety > no dead agents leaves nothing to remove [76.42ms]

packages/orch/doctor/doctor-settings-preservation.test.ts:
(pass) doctor settings preservation > yes mode leaves existing settings.json byte-identical [23.29ms]

packages/orch/doctor/doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [0.08ms]
(pass) runDoctor > runs on an unconfigured install without failing for want of settings.json [17.64ms]
(pass) runDoctor > checks a healthy store [45.68ms]
(pass) runDoctor > warns when the store is absent [0.29ms]
(pass) runDoctor > fails when the store predates orch's migrations [33.20ms]
(pass) runDoctor > fails and names a missing store table [25.59ms]
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [22.58ms]
(pass) runDoctor > reports an absent daemon as optional [19.07ms]
(pass) runDoctor > reports and fixes a stale daemon lock [18.32ms]
(pass) runDoctor > accepts a live daemon and an answerable socket [46.22ms]
(pass) runDoctor > warns when the live daemon code hash is stale [25.50ms]
(pass) runDoctor > fails on an invalid lock and an unanswerable live socket [34.52ms]
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [33.77ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [24.35ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [24.73ms]
(pass) runDoctor > reports a dead presence pid [51.57ms]
(pass) runDoctor > bins check is driven by the enabled set and offers no fix [17.19ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [0.48ms]
(pass) runDoctor > validates configured notifier adapters [213.38ms]
(pass) runDoctor > reports invalid settings and accepts missing settings [44.16ms]
(pass) runDoctor > never throws when individual checks encounter broken inputs [32.86ms]

packages/orch/doctor/doctor-orphan-daemons.test.ts:
(pass) doctor orphaned-daemon check > a live foreign lock is reported, and an unproven owner is never killable [28.81ms]
(pass) doctor orphaned-daemon check > a dead pid's lock is not an orphan [14.46ms]
(pass) doctor orphaned-daemon check > the caller's own orch dir is never reported against itself [13.96ms]

packages/orch/test/tiling.test.ts:
(pass) planTilePlacement > a lone pane anchors the split to the only pane [0.10ms]
(pass) planTilePlacement > first_split rules the opening split, however the screen is shaped [0.09ms]
(pass) planTilePlacement > first_split longest-edge leaves the opening split to the tab's own shape [0.06ms]
(pass) planTilePlacement > a tab with no geometry to read still opens the way first_split says [0.15ms]
(pass) planTilePlacement > past the first split, the biggest pane halves its longer side whatever first_split says [0.13ms]
(pass) planTilePlacement > the biggest pane is the target, whatever the caller's own pane is [0.05ms]
(pass) planTilePlacement > equal panes resolve top-left first, so enumeration order cannot decide [0.04ms]
(pass) planTilePlacement > four agents land in a 2x2 grid, not four columns [0.26ms]
(pass) planTilePlacement > four agents on an ultrawide screen still land in a 2x2 grid [0.07ms]
(pass) planTilePlacement > first_split rows stacks the second agent, columns seats it alongside [0.05ms]
(pass) planTilePlacement > longest-edge on an ultrawide screen is the four-thin-columns layout first_split exists to avoid [0.04ms]
(pass) planTilePlacement > the same pane count yields the same grid whatever pane order the plexer reports [1.14ms]

packages/orch/test/hello-environment.test.ts:
(pass) hello records the environment in full > the plexer the caller registered in is on the agent, not only on the host [48.77ms]
(pass) hello records the environment in full > the place the caller occupies in its plexer is recorded at hello [41.36ms]
(pass) hello records the environment in full > a session that moved to another place re-registers with the new one, and one row stays open [49.12ms]
(pass) hello records the environment in full > the space the caller registered in is recorded at hello, not inferred later [39.68ms]
(pass) hello records the environment in full > a session in no space and no plexer records neither, and that is an answer [33.90ms]
(pass) hello records the environment in full > re-registering the same session does not re-root or re-place it [46.43ms]
(pass) hello records the environment in full > the claim carries every environment fact hello has to record [31.96ms]

packages/orch/test/orchd-rpc-reconnect.test.ts:
(pass) RPC JSON framing > rejects malformed object that only has an id [0.07ms]
(pass) RPC JSON framing > parses split and multiple newline-delimited frames [11.84ms]
(pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [345.74ms]
(pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1057.59ms]

packages/orch/test/commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.14ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [0.29ms]
Selection recorded in /tmp/orch-setup-characterization-fyaEOf/settings.json:
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
  /tmp/orch-setup-characterization-fyaEOf/agents
Skills:
  not installed - turn it back on with: orch settings skills --install
bins:
  /tmp/orch-setup-home-LNT8Lh/.local/bin/orch -> /home/bryan/orch/packages/orch/dist/bin/orch.js
  /tmp/orch-setup-home-LNT8Lh/.local/bin/pif -> /home/bryan/orch/packages/orch/bin/pif
  /tmp/orch-setup-home-LNT8Lh/.local/bin/orch-ding -> /home/bryan/orch/packages/orch/dist/bin/orch-ding.js
  SKIP pi extensions: pi integration shim disabled
Running doctor checks...
Doctor: 30/35 checks passed
Done. Open a plexer workspace and try: orch spawn 2 --tab Team1
(pass) commands/setup > runs non-interactive setup against the requested ORCH_DIR and records the selected composition [64.50ms]
(pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.29ms]

packages/orch/test/store-identity.test.ts:
(pass) hello agent identity rows > reuses the live agent for the same session process and mints for another [44.45ms]
(pass) hello agent identity rows > first sight creates a named root agent and open process row [39.82ms]

packages/orch/test/port-no-optional-methods.test.ts:
(pass) the environment port declares capability by composition, never by optionality > src/types/backend.ts has no optional methods on any port interface [0.65ms]
(pass) the environment port declares capability by composition, never by optionality > the deleted capability flags bag is gone, not merely unimplemented [0.38ms]
(pass) the environment port declares capability by composition, never by optionality > src/types/adapter.ts has no optional methods on the harness port either [0.68ms]

packages/orch/test/notify-router.test.ts:
(pass) notify router > delivers only when on includes the event state [0.40ms]
(pass) notify router > passes typed webhook and command configuration [0.16ms]
(pass) notify router > surfaces notifier errors [0.26ms]

packages/orch/test/status-perf.test.ts:
(pass) status performance seams > resolves bundle hashes once per status call [7.12ms]
(pass) status performance seams > resolves orchestrator id once per status call [11.30ms]

packages/orch/test/nested-spawn-unleased.test.ts:
(pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the middle agent's death leaves the grandchild unleased, held by nobody [47.40ms]
(pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the grandchild stays alive and adoptable, and keeps its own provenance [42.76ms]
(pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the grandparent holding the middle agent does not extend to the grandchild [39.22ms]

packages/orch/test/log-level.test.ts:
(pass) the configured log level reaches every logger > the env var wins over settings.json [0.70ms]
(pass) the configured log level reaches every logger > settings.json is used when the env var is unset [0.30ms]
(pass) the configured log level reaches every logger > an unrecognised env value falls back to the configured level [0.21ms]
(pass) the configured log level reaches every logger > the CLI logger honours the configured level [0.45ms]
(pass) the configured log level reaches every logger > the CLI logger drops records below the configured level [0.24ms]
(pass) the configured log level reaches every logger > the daemon logger resolves through the same helper [0.29ms]

packages/orch/test/daemon-rpc.test.ts:
(pass) daemon RPC > rejects a hello response with a malformed optional field [0.09ms]
(pass) daemon RPC > hello translates an absent daemon instead of reading a missing token [5035.50ms]
208 |       logger.warn("daemon.registration-warning", { warning: identity.registrationWarning });
209 |       process.stdout.write(`warning: ${identity.registrationWarning}\n`);
210 |     }
211 |     return identity;
212 |   } catch (error: unknown) {
213 |     throw translateDaemonError(orchDir, error);
                ^
error: orch daemon unavailable; run 'orch daemon start': orchd daemon is absent (/tmp/orch-rpc-l0W2Xe)
      at rpcRegisterSession (/home/bryan/orch/packages/orch/src/daemon/reach.ts:213:11)
      at async <anonymous> (/home/bryan/orch/packages/orch/test/daemon-rpc.test.ts:205:13)
(fail) daemon RPC > an unreachable agent yields a boundary answer, and the outbox is not left pending [5089.06ms]
(pass) daemon RPC > round-trips a call over the real unix socket [2.86ms]
(pass) daemon RPC > issues one session identity to sequential invocations from one session [45.68ms]
(pass) daemon RPC > hello returns live agents whose newest lease is closed or absent [66.05ms]
(pass) daemon RPC > hello returns an empty unleased list when none exist [39.32ms]
(pass) daemon RPC > a TCP hello with the daemon token gets an identity [43.87ms]
(pass) daemon RPC > refuses a hello that reports no session pid [4.42ms]
(pass) daemon RPC > refuses a hello without its environment [3.48ms]
(pass) daemon RPC > same session pid keeps its id and a different session pid gets another [48.80ms]
(pass) daemon RPC > refuses a TCP hello without a token [3.61ms]
(pass) daemon RPC > refuses a TCP hello with a wrong token [3.33ms]
(pass) daemon RPC > writes the daemon token with owner-only permissions [2.78ms]
(pass) daemon RPC > returns an error for an unknown method [1.93ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [12.72ms]
(pass) daemon RPC > delivers pushed subscription events [45.35ms]
(pass) daemon RPC > replays durable events after a daemon restart without a gap [304.13ms]
(pass) daemon RPC > reports the oldest sequence when replay starts before the pruned window [37.62ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [4.44ms]
(pass) daemon RPC > has a catchable absent-daemon error [0.30ms]
(pass) daemon RPC > calls a slow daemon unreachable, not absent [103.08ms]
(pass) daemon RPC > calls a refused endpoint absent so a wedged daemon is still reclaimable [0.61ms]
208 |       logger.warn("daemon.registration-warning", { warning: identity.registrationWarning });
209 |       process.stdout.write(`warning: ${identity.registrationWarning}\n`);
210 |     }
211 |     return identity;
212 |   } catch (error: unknown) {
213 |     throw translateDaemonError(orchDir, error);
                ^
error: orch daemon unavailable; run 'orch daemon start': orchd daemon is absent (/tmp/orch-rpc-VopwNg)
      at rpcRegisterSession (/home/bryan/orch/packages/orch/src/daemon/reach.ts:213:11)
      at async startRealDaemon (/home/bryan/orch/packages/orch/test/daemon-rpc.test.ts:137:9)
      at async <anonymous> (/home/bryan/orch/packages/orch/test/daemon-rpc.test.ts:464:24)
(fail) daemon RPC > dispatch waits for and reports a bridge acknowledgement [5087.13ms]
208 |       logger.warn("daemon.registration-warning", { warning: identity.registrationWarning });
209 |       process.stdout.write(`warning: ${identity.registrationWarning}\n`);
210 |     }
211 |     return identity;
212 |   } catch (error: unknown) {
213 |     throw translateDaemonError(orchDir, error);
                ^
error: orch daemon unavailable; run 'orch daemon start': orchd daemon is absent (/tmp/orch-rpc-ha0l8h)
      at rpcRegisterSession (/home/bryan/orch/packages/orch/src/daemon/reach.ts:213:11)
      at async startRealDaemon (/home/bryan/orch/packages/orch/test/daemon-rpc.test.ts:137:9)
      at async <anonymous> (/home/bryan/orch/packages/orch/test/daemon-rpc.test.ts:483:24)
(fail) daemon RPC > dispatch reports unavailable while a live agent has no bridge [5022.39ms]
208 |       logger.warn("daemon.registration-warning", { warning: identity.registrationWarning });
209 |       process.stdout.write(`warning: ${identity.registrationWarning}\n`);
210 |     }
211 |     return identity;
212 |   } catch (error: unknown) {
213 |     throw translateDaemonError(orchDir, error);
                ^
error: orch daemon unavailable; run 'orch daemon start': orchd daemon is absent (/tmp/orch-rpc-rN7tQg)
      at rpcRegisterSession (/home/bryan/orch/packages/orch/src/daemon/reach.ts:213:11)
      at async startRealDaemon (/home/bryan/orch/packages/orch/test/daemon-rpc.test.ts:137:9)
      at async <anonymous> (/home/bryan/orch/packages/orch/test/daemon-rpc.test.ts:504:24)
(fail) daemon RPC > attach reports open rows and re-pushes them [5087.52ms]

packages/orch/test/cross-pack-result-delivery.test.ts:
(pass) results go to the enqueuer as mail > a result is an outbox row for the enqueuer, not the runner [52.22ms]
(pass) results go to the enqueuer as mail > a failed task reports its error in the mail body [53.89ms]
(pass) results go to the enqueuer as mail > a cross-wall enqueuer gets no row and the task stays settled [49.15ms]
(pass) acceptMail > refuses a message across the space wall by its reason [46.58ms]
(pass) acceptMail > requires non-empty from, target, and text [43.32ms]
(pass) acceptMail > queues a BridgeMessage steer payload [46.95ms]

packages/orch/test/rename-syncs-the-pane-border.test.ts:
(pass) orch rename syncs the pane border in one command (U5) > one rename sets orch's name AND the plexer chrome [55.58ms]
(pass) orch rename syncs the pane border in one command (U5) > the response states the two outcomes SEPARATELY [53.02ms]
(pass) orch rename syncs the pane border in one command (U5) > a plexer that refuses the chrome never unwrites orch's own name [56.85ms]
(pass) orch rename syncs the pane border in one command (U5) > --pane still gives the border something DIFFERENT, and leaves the name alone [50.74ms]

packages/orch/test/store-instants.test.ts:
(pass) epoch-millisecond store instants > a lease records its holding as an integer instant [50.51ms]
(pass) epoch-millisecond store instants > agents order numerically by their creation instant, never lexically [33.70ms]
(pass) epoch-millisecond store instants > all time-named columns use integer declarations [0.49ms]

packages/orch/test/provenance.test.ts:
(pass) the one provenance walk > ancestors are parent-first, root last [0.06ms]
(pass) the one provenance walk > depth counts hops to the root [0.03ms]
(pass) the one provenance walk > an unknown id is its own root at depth 0 [0.01ms]
(pass) the one provenance walk > an unknown parent ends the chain instead of throwing [0.03ms]
(pass) the one provenance walk > descendant is any depth, never self, never a sibling tree [0.04ms]
(pass) the one provenance walk > a cycle terminates [0.03ms]

packages/orch/test/daemon-rpc-identity.test.ts:
(pass) daemon identity RPCs > claim-identity stamps a minted id [37.10ms]
(pass) daemon identity RPCs > claim-identity refuses an unknown id by naming it [26.71ms]
(pass) daemon identity RPCs > register-session mints one id per session token [40.54ms]
(pass) daemon identity RPCs > the removed method is unknown [2.69ms]

packages/orch/test/transcript.test.ts:
(pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [0.14ms]
(pass) lastAssistantFromJsonl > undefined for blank or empty input [0.04ms]
(pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.06ms]
(pass) assistantText > reads role-tagged records [0.02ms]
(pass) assistantText > reads the {type:'assistant'} envelope with a nested message [0.02ms]
(pass) assistantText > undefined for non-assistant roles [0.03ms]
(pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.04ms]
(pass) contentText empty-string part handling > an all-empty content array yields undefined [0.02ms]
(pass) contentText empty-string part handling > a bare empty string yields undefined [0.01ms]

packages/orch/test/setup-io.test.ts:
(pass) setup prompt answer validation > refuses a single answer that was not offered [0.10ms]
(pass) setup prompt answer validation > refuses multi-select answers containing an unoffered value [0.08ms]

packages/orch/test/close-is-keyed-by-agent-id.test.ts:
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > an agent whose pane is gone is never handed to the plexer as a pane [57.17ms]
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > an agent whose pane is gone still ends, and reports done [51.23ms]
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > what a human is told they closed is the agent, not the plexer's coordinate [56.05ms]
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > the --json closed list names agents, so a caller can map it back [53.54ms]
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > the plexer is still handed the real handle when there IS a pane [59.54ms]

packages/orch/test/daemon-renags-questions.test.ts:
(pass) question re-ask policy > nothing due emits nothing [0.15ms]
(pass) question re-ask policy > an overdue question emits its first re-ask [0.06ms]
(pass) question re-ask policy > an emitted re-ask waits for the interval before emitting again [0.04ms]
(pass) question re-ask policy > a settled question emits no further re-asks [0.03ms]
(pass) question re-ask policy > the limit emits one final gave-up event and then stays silent [0.04ms]

packages/orch/test/caller-kind.test.ts:
(pass) caller kind > id + recorded token is agent [43.32ms]
(pass) caller kind > a harness marker is a session even when its token differs [42.88ms]
(pass) caller kind > a harness marker is a session without a launch credential [39.95ms]
(pass) caller kind > no harness marker is the operator [0.29ms]
(pass) caller kind > an unregistered session asks the daemon registration seam [0.53ms]
(pass) caller kind > override flags are allowed only for the operator [0.26ms]
(pass) caller kind > override flags refuse a driving session [37.54ms]
(pass) caller kind > override flags refuse a spawned agent [47.93ms]

packages/orch/test/status-filter-columns.test.ts:
(pass) orch status --filter on columns > drops the named columns from the default table [0.84ms]
(pass) orch status --filter on columns > a filtered owner column leaves no shared-owner footer [0.21ms]
(pass) orch status --filter on columns > drops the named columns from the human table [0.08ms]
(pass) orch status --filter on columns > drops the same facts from a JSON row [0.09ms]

packages/orch/test/daemon-events.test.ts:
(pass) daemon presence events > closes every watcher when watched agent directories disappear [30.71ms]
(pass) daemon presence events > an RPC subscriber receives a presence transition [51.27ms]
(pass) daemon presence events > a dispatched transition writes the full run row and preserves untruncated result [54.28ms]
(pass) daemon presence events > repeated transitions upsert one run and only terminal states set finishedAt [59.39ms]
(pass) daemon presence events > a status without a dispatch id does not write history [49.56ms]
(pass) daemon presence events > a throwing history write does not stop event delivery [52.78ms]
(pass) daemon presence events > emitted events carry the pack capacity at publish time [44.14ms]
(pass) daemon presence events > a flapping status file cannot storm the stream with repeat transitions [0.21ms]
(pass) daemon presence events > a genuine repeat of the same transition for new work still publishes [0.07ms]
(pass) daemon presence events > a repeat transition publishes again once the suppression window passes [0.04ms]
(pass) daemon presence events > repeated observations cannot slide the suppression window forever [0.03ms]
(pass) daemon presence events > a working-to-done repeat after the dedupe window is emitted [0.06ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [39.31ms]
(pass) daemon presence events > presence transitions use the normalized agent name after rename [40.43ms]
(pass) daemon presence events > derivePresenceTransition preserves the complete asking transition payload [37.94ms]
(pass) daemon presence events > an asking transition drives command sink delivery [59.75ms]

packages/orch/test/skill-store-and-links.test.ts:
(pass) skill store and harness links > writes real files to the store and links each harness dir into it [1.95ms]
(pass) skill store and harness links > replaces a real directory left in a harness dir with a link into the store [0.84ms]
(pass) skill store and harness links > doctor reports a harness dir holding a real directory instead of a link [1.12ms]
(pass) skill store and harness links > doctor passes once every harness dir links into the store [0.91ms]
(pass) skill store and harness links > doctor skips when the user turned the skill install off [0.30ms]

packages/orch/test/backend-process-role.test.ts:
(pass) ProcessRole > headless provider records pid and start token and safely kills it [26.41ms]
(pass) ProcessRole > herdr provider records pid and start token and safely kills it [25.98ms]
(pass) ProcessRole > tmux provider records pid and start token and safely kills it [26.67ms]
(pass) ProcessRole > reports replaced when a pid is reused by a different process token [0.38ms]
(pass) ProcessRole > running returns the process identity for a resolved handle [0.10ms]
(pass) ProcessRole > running throws when the environment reports no process [0.10ms]
(pass) ProcessRole > running records a null token when the OS cannot provide one [0.06ms]
(pass) ProcessRole > the default signal refuses orch's own process and its parent [0.13ms]
(pass) ProcessRole > kill signals a live record that carries no start token [0.09ms]

packages/orch/test/status-unleased.test.ts:
(pass) status owner rendering > leased by a live holder shows that holder [59.61ms]
(pass) status owner rendering > a dead holder is shown as unleased with the holder gone [62.26ms]
(pass) status owner rendering > an agent never leased shows no orch driving it [47.61ms]

packages/orch/test/commands-panes.test.ts:
(pass) commands/panes > pane identity is the minted id alone [0.04ms]
(pass) commands/panes > a plexer-and-space key is not an identity [0.01ms]
(pass) commands/panes > exports the pane listing command directly [0.01ms]

packages/orch/test/store-runs.test.ts:
(pass) run rows > round-trips every field, including a structured result [30.51ms]
(pass) run rows > upsert updates a row while preserving its original start time [34.21ms]
(pass) run rows > orders by started time, filters by agent, and honours limit [34.38ms]
(pass) run rows > omits absent optional fields instead of returning null [40.11ms]
(pass) run rows > deletes only rows older than the cutoff and returns the count [37.14ms]
(pass) run rows > stays readable after the agent presence directory is deleted [36.90ms]

packages/orch/test/doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env node as node [0.37ms]
(pass) shebangRuntime > reads #!/usr/bin/env bun as bun [0.21ms]
(pass) shebangRuntime > reads #!/usr/bin/env deno as deno [0.18ms]
(pass) shebangRuntime > reads #!/usr/local/bin/node as node [0.16ms]
(pass) shebangRuntime > does not mistake a longer binary name for a runtime [0.16ms]
(pass) shebangRuntime > returns null for a file with no shebang [0.14ms]
(pass) shebangRuntime > returns null for an unreadable path [0.13ms]
(pass) runningRuntime > reports the runtime this suite is executing under [0.04ms]
(pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [0.57ms]
(pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [0.47ms]
(pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [0.23ms]
(pass) doctor runtime verdict table > launching under bun while declaring node is fine [0.27ms]
(pass) doctor runtime verdict table > launching under node while declaring bun is fine [0.17ms]
(pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [0.24ms]
(pass) doctor runtime verdict table > declared runtime absent from PATH fails [0.23ms]
(pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [0.21ms]
(pass) doctor runtime verdict table > remediation names both directions — rebuild, or re-record the declaration [0.24ms]
(pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [0.17ms]

packages/orch/test/herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [0.79ms]
(pass) herdr and notification hardening > falls back to a valid name when the identity key contains herdr-invalid separators [0.26ms]
(pass) herdr and notification hardening > nameless notifications use a space label, never a bare pane key [0.29ms]

packages/orch/test/settings-editor.test.ts:
(pass) settings editor reducer > moves focus down and up without running off either end [0.24ms]
(pass) settings editor reducer > opens the focused setting for editing [0.05ms]
(pass) settings editor reducer > cancel leaves value unchanged and returns to browsing [0.03ms]
(pass) settings editor reducer > commit updates value and produces a pending write [0.15ms]
(pass) settings editor reducer > refuses invalid values with a reason and stays open [0.06ms]
(pass) settings editor reducer > refuses opening a read-only setting with a reason [0.06ms]
(pass) settings editor reducer > cancelling without a commit yields zero writes [0.03ms]

packages/orch/test/environment-dictates-what-is-possible.test.ts:
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > a MOVE is a new environment record, and what is possible follows it at once [43.54ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > a move closes the interval it left, so history says WHERE it was and WHEN [34.55ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > moving one axis leaves every other axis exactly where it was [41.46ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > an UPGRADE is a NEW host_plexers row, not an overwrite of the old one [31.76ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > re-declaring the SAME version is not an upgrade and opens no second row [33.41ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > nothing anywhere records what an agent CAN do [23.82ms]

packages/orch/test/daemon-status-lease.test.ts:
(pass) daemon status lease payload > reports the current holder and its liveness [40.85ms]
(pass) daemon status lease payload > distinguishes a known unleased agent from an unknown key [39.10ms]

packages/orch/test/lifecycle-targets.test.ts:
(pass) lifecycle target resolution > prefers one live agent over dead ones sharing its name [0.18ms]
(pass) lifecycle target resolution > reports the target and disambiguating ids for live ambiguity [0.18ms]
(pass) lifecycle target resolution > cleanup can still resolve a dead agent when no live match exists [0.04ms]
(pass) lifecycle target resolution > an agent is addressable by its id, its name, or its pane handle [0.03ms]
(pass) lifecycle target resolution > the pane is environment: moving it leaves every other address intact [0.02ms]

packages/orch/test/parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [0.02ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.03ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.04ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.03ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.03ms]

packages/orch/test/setup-smoke.test.ts:
(pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [0.44ms]
(pass) runSetupSmoke (12.5) > the agent is launched on the prompt it built [0.11ms]
(pass) runSetupSmoke (12.5) > an agent that launches but yields no result times out and fails non-zero [0.20ms]
(pass) runSetupSmoke (12.5) > a rejected spawn fails loudly and never polls for a result [0.17ms]

packages/orch/test/capacity.test.ts:
(pass) fleet capacity > one pack per root, each against the per-pack cap; roots never sum into one pack [0.20ms]
(pass) fleet capacity > a selected root scopes the packs to that one pack [0.07ms]
(pass) fleet capacity > reports configured per-space caps [0.05ms]
(pass) fleet capacity > uses null for an unlimited total [0.04ms]
(pass) fleet capacity > formats one pack per root, the caller's first, then space and machine capacity [0.13ms]

packages/orch/test/agent-key-is-minted-id.test.ts:
(pass) a driving session mints an id, it is not placed by name > the key an interactive session addresses itself by is a bare minted id [0.98ms]
(pass) a driving session mints an id, it is not placed by name > the presence directory is named by that id alone [0.38ms]
(pass) a driving session mints an id, it is not placed by name > a launch that handed over a minted id is used verbatim [0.31ms]
(pass) this process's own identity is the id and nothing else > a spawned agent answers with the id its launch handed it [0.15ms]
(pass) the fleet wall is lifted by the absence of a launch, not by a key's shape > an agent orch launched may not cross into another project's fleet [52.43ms]
(pass) who drives an agent is looked up by its id > the key IS the agent id — no segment is split out of it [45.12ms]
(pass) who drives an agent is looked up by its id > a composite key addresses no agent at all [40.00ms]
(pass) doctor reads a presence directory name as an id > a composite directory name is a malformed identity key [0.63ms]
(pass) doctor reads a presence directory name as an id > a minted id with a current stamp is well formed [23.48ms]

packages/orch/test/launch-model-gate.test.ts:
(pass) the model gate rules by harness membership, not by format > accepts a listed spec, with or without a thinking suffix [0.18ms]
(pass) the model gate rules by harness membership, not by format > refuses a ladder shorthand and names what the harness does offer [0.20ms]
(pass) the model gate rules by harness membership, not by format > accepts each harness's own vocabulary rather than one shared grammar [0.09ms]
(pass) the model gate rules by harness membership, not by format > cannot check a harness that publishes no catalogue, and does not pretend to [0.02ms]
(pass) the settings allowlist applies on top of harness membership > an empty allowlist restricts nothing beyond the harness list [0.51ms]
(pass) the settings allowlist applies on top of harness membership > a configured allowlist refuses a listed model outside its patterns [0.85ms]
(pass) the settings allowlist applies on top of harness membership > harness membership is checked before the allowlist, so the message names the harness [0.32ms]

packages/orch/test/status-live.test.ts:
(pass) live status renderer > renders a clear screen, timestamped header, and table body [5.04ms]
(pass) live status renderer > renders a refresh failure in the header area [0.12ms]
(pass) live status renderer > coalesces a burst into one pending follow-up refresh [0.27ms]
(pass) live status renderer > keeps the existing table renderer available [0.21ms]

packages/orch/test/queue-space-replay.test.ts:
(pass) queue replay keeps typed scope > stored scope offers pack work only to that pack [42.44ms]

packages/orch/test/agent-view.test.ts:
(pass) the agent composer > an agent with no environment rows has every axis absent, not defaulted [35.72ms]
(pass) the agent composer > each axis composes independently, and moving one leaves identity untouched [52.08ms]
(pass) the agent composer > tuning is not environment: it survives a move [42.13ms]
(pass) the agent composer > ownership reads as a live lease, and a released one is not ownership [41.84ms]
(pass) the agent composer > provenance is on the view and is not the same fact as ownership [37.80ms]
(pass) the agent composer > provenance carries the spawner's name, read as a join and never stored twice [41.29ms]
(pass) the agent composer > an agent with no spawner reports no spawner name [35.75ms]
(pass) the agent composer > agentViews is oldest-first and liveAgentViews drops ended agents [40.32ms]
(pass) the agent composer > the axis list is the only place every axis is enumerated [0.36ms]
(pass) the agent composer > the composed shape is exactly the axis list, with nothing extra and nothing missing [39.44ms]
(pass) the agent composer > an unknown agent is null, never an empty shell [32.16ms]

packages/orch/test/command-refusal.test.ts:
(pass) a command refusal is thrown, not exited > an unresolvable target throws a CommandRefusal instead of killing the process [29.10ms]
(pass) a command refusal is thrown, not exited > the refusal carries the reason a human needs [22.99ms]

packages/orch/test/herdr-notify-busy.test.ts:
(pass) a herdr notification is delivered only when herdr says it was shown > shown is a delivery [0.10ms]
(pass) a herdr notification is delivered only when herdr says it was shown > busy is NOT a delivery, however herdr exited [0.02ms]
(pass) a herdr notification is delivered only when herdr says it was shown > every other refusal herdr can answer with is also not a delivery [0.05ms]
(pass) a herdr notification is delivered only when herdr says it was shown > output that is not a herdr answer is never read as a delivery [0.06ms]
(pass) a busy herdr is waited out, not dropped > a toast shown on the first try is sent once and waits for nothing [0.12ms]
(pass) a busy herdr is waited out, not dropped > a busy herdr is retried after a wait, and the retry is the delivery [0.05ms]
(pass) a busy herdr is waited out, not dropped > a herdr that stays busy gives up rather than blocking the daemon forever [0.04ms]
(pass) a busy herdr is waited out, not dropped > a refusal that waiting cannot fix is not retried [0.03ms]

packages/orch/test/check-bridge.test.ts:
(pass) presence filenames stay limited to the live protocol > inbox.jsonl is no longer a presence-filename breach [0.51ms]
(pass) presence filenames stay limited to the live protocol > status.json remains a presence-filename breach [0.05ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.04ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.03ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / settings seams [0.07ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [0.30ms]
(pass) composition happens only at roots (checkCompositionRootLine) > flags ORCH_DIR reads outside src/services.ts [0.06ms]
(pass) composition happens only at roots (checkCompositionRootLine) > flags createServices calls outside the five roots [0.08ms]
(pass) composition happens only at roots (checkCompositionRootLine) > flags imports of removed global composition exports [0.06ms]
(pass) composition happens only at roots (checkCompositionRootLine) > allows createServices calls in each composition root [0.04ms]
(pass) composition happens only at roots (checkCompositionRootLine) > allows the ORCH_DIR read and declaration in src/services.ts [0.03ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.06ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.02ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the shared harness model port outside the adapter dispatcher [0.01ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [0.19ms]
(pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > flags a runtime adapter importing bridge-bundles/build.ts [0.06ms]
(pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > allows scripts and the build-tool module itself [0.02ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [0.04ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.03ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.05ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke test holds no exemption: the branch was deleted, not blessed [0.04ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has no identity-branch line, exempted or otherwise [1.92ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > flags spawner key and spawnerIdentity key owner-token fallbacks [0.09ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > allows a benign line [0.01ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > passes the clean tree: reply addresses never use owner-token fallbacks [0.70ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags object literals that synthesize an identity [0.09ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags concatenated and template identity keys [0.11ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > allows a fresh spawn mint and the issuer modules [0.03ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > no file is exempt from the identity-construction rule [0.02ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > passes the clean tree: every identity construction is allowed or registered [0.99ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.07ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.02ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [0.33ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > a deleted capability bag or optional method is not exempt [0.37ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > the exempted names are the roles the ports actually declare [0.11ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > nullable data on the port is not exempted as a role [0.05ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > flags plexer and harness identity branches [0.04ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > flags method-presence capability checks [0.14ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > allows a branch inside a concrete backend [0.03ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > passes the clean tree: no file in ANY scanned scope branches on an environment id [27.66ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > the core-scope allowlist is EMPTY, so no line holds a standing exemption [0.09ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > allows capability-driven code [0.02ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags INSERT and UPDATE SQL that welds a lease holder into spawned_by [0.23ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags lease row types carrying a provenance field [0.04ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > allows separate lease and provenance rows [0.05ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > passes the clean tree: no source line crosses lease and provenance columns [11.66ms]
(pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a launch env read outside launch.ts with the file and constant named [0.15ms]
(pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > allows the launch env read inside identity/launch.ts [0.02ms]
(pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a bare launch env name literal outside launch.ts [0.03ms]
(pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a comment mentioning the launch env name outside launch.ts [0.01ms]
(pass) the closed plexer-id set is spelled in exactly one line > the definition line is allowed where it lives, and nowhere else [0.04ms]
(pass) the closed plexer-id set is spelled in exactly one line > any other quoted plexer id in that same file still fails [0.04ms]
(pass) the closed plexer-id set is spelled in exactly one line > the line src/types/backend.ts actually carries is the allowed one [0.45ms]
(pass) the closed plexer-id set is spelled in exactly one line > extensions get the same rule with their own scope named [0.04ms]

packages/orch/test/plexer-versions.test.ts:
(pass) plexer version support > a floor admits every version at or above it [0.11ms]
(pass) plexer version support > compares numeric versions rather than lexical strings [0.05ms]
(pass) plexer version support > rotates one open host install row when the plexer changes version [47.28ms]
(pass) plexer version support > doctor names both versions and tells the operator to update the plexer [0.22ms]
(pass) plexer version support > a supported plexer the user never installed is not a complaint [0.04ms]
(pass) plexer version support > an in-range install reports ok with the version it read [0.07ms]
(pass) plexer version support > a compatible server rides along on the row without complaint [0.10ms]
(pass) plexer version support > a server the installed client outgrew fails and names the restart [0.06ms]
(pass) plexer version support > a server that reports no compatibility is unknown, never a failure [0.12ms]
(pass) plexer version support > a plexer with no server running says nothing about one [0.09ms]
(pass) plexer version support > only an installed plexer that cannot report a version warns [0.04ms]

packages/orch/test/settings-defects.test.ts:
(pass) settingsDefects > returns no defects for an absent file [0.23ms]
(pass) settingsDefects > returns no defects for a valid settings file [0.37ms]
(pass) settingsDefects > reports unparsable JSON as one file defect [0.27ms]
(pass) settingsDefects > suggests a near-match for a stale key [0.91ms]
(pass) settingsDefects > does not guess a replacement for a removed key [0.59ms]
(pass) settingsDefects > reports the expected pinned schema value [0.43ms]
(pass) settingsDefects > reports a wrong value type on a real key [0.38ms]

packages/orch/test/store-rebuild-schema.test.ts:
(pass) rebuild schema > rebuild DDL inventory is exact [25.27ms]
(pass) rebuild schema > the store opens migrated, with foreign keys enabled [20.90ms]
(pass) rebuild schema > all ten partial unique indexes allow only one open row [401.89ms]
(pass) rebuild schema > enforces foreign keys and agent checks [35.52ms]
(pass) rebuild schema > requires exactly one task scope [35.29ms]
(pass) rebuild schema > allows one open attempt only [37.71ms]
(pass) rebuild schema > enforces lease checks and one lease [36.57ms]
(pass) rebuild schema > remaining documented CHECKs and cascades are enforced [43.78ms]
(pass) rebuild schema > task_states derives queued claimed and outcomes [57.91ms]

packages/orch/test/wall-single-owner.test.ts:
(pass) space wall ownership > keeps the wall decision primitive in one source module [7.68ms]

packages/orch/test/spawn-identity.test.ts:
(pass) one key per pane spawn (12.1) > identity is an opaque minted id — never the name, never the pane handle [57.07ms]
(pass) one key per pane spawn (12.1) > a name freed by a dead agent is reusable, and the two agents differ in identity [64.81ms]
(pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [61.57ms]
(pass) A1: spawn registration records the space as an environment axis > a spawn into a space writes agent_spaces, and the composer reads it back [57.01ms]
(pass) A1: spawn registration records the space as an environment axis > a spawn stating no space records NO ROW — a missing axis is a missing row [48.55ms]
(pass) A1: spawn registration records the space as an environment axis > moving an agent to another space closes the old interval and keeps its identity [51.15ms]

packages/orch/test/answer-dispatch.test.ts:
(pass) answer over the bridge > pushes the answer and its question id [56.91ms]
(pass) answer over the bridge > returns not-asking without pushing [45.21ms]
(pass) answer over the bridge > reports a detached bridge for a live asking agent [45.40ms]
(pass) answer over the bridge > reports a gone asking agent [28.99ms]
(pass) answer over the bridge > answers with a clear absence when the adapter takes no answers [42.94ms]

packages/orch/test/adapter-allowlist.test.ts:
(pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [0.34ms]
(pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.06ms]
(pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.03ms]
(pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.02ms]
(pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.07ms]
(pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.04ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.10ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.03ms]
(pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.04ms]

packages/orch/test/recipient-label.test.ts:
(pass) agent identity shown to an operator > names the agent and its harness, never the transport key [0.05ms]
(pass) agent identity shown to an operator > drops the routing prefix when nothing is known about it [0.02ms]
(pass) agent identity shown to an operator > a nameless agent gets a stable logical name, not its key [0.05ms]

packages/orch/test/build-bin.test.ts:
(pass) build entrypoint > always stamps a node shebang and executable mode [0.35ms]
(pass) the installed CLI is the packaged build, never live source (K2) > the `orch` bin points at the packaged entrypoint, not bin/orch.ts [0.02ms]
(pass) the installed CLI is the packaged build, never live source (K2) > the packaged entrypoint is built for node, from the source entrypoint [0.02ms]
(pass) the installed CLI is the packaged build, never live source (K2) > a global install cannot happen without a build in front of it [0.03ms]
(pass) the installed CLI is the packaged build, never live source (K2) > the package ships dist/, so what is installed is what was built [0.01ms]

packages/orch/test/tool-exec-retry.test.ts:
(pass) every command into a harness or plexer retries on timing, not on being wrong > a transient refusal is reattempted until it succeeds [3.47ms]
(pass) every command into a harness or plexer retries on timing, not on being wrong > a failure the caller calls permanent is thrown on the FIRST attempt, never retried [0.15ms]
(pass) every command into a harness or plexer retries on timing, not on being wrong > a tool that never recovers exhausts the budget and reports how many attempts it cost [7.59ms]
(pass) every command into a harness or plexer retries on timing, not on being wrong > the seam names no harness: the same policy drives a different binary [1.22ms]

packages/orch/test/daemon-idle.test.ts:
(pass) orchd idle shutdown rule > a zero setting disables idle shutdown entirely [0.05ms]
(pass) orchd idle shutdown rule > a live agent holds the daemon open however long it has been quiet [0.02ms]
(pass) orchd idle shutdown rule > an event subscriber holds the daemon open [0.02ms]
(pass) orchd idle shutdown rule > recent activity holds the daemon open below the threshold [0.02ms]
(pass) orchd idle shutdown rule > a fully idle daemon past the threshold is due to exit [0.01ms]

packages/orch/test/notify-ding.test.ts:
(pass) notify/ding > the sound sink is a declared sink that takes no configuration [0.18ms]
(pass) notify/ding > this host names the players it would use, and says how to get one [0.07ms]
(pass) notify/ding > a command string runs through the host's own shell; argv is passed through untouched [0.04ms]

packages/orch/test/commands-clean.test.ts:
(pass) commands/clean > the forced sweep reaps dead agent dirs but preserves live processes [50.68ms]
{"malformed":["herdr~wF~p9"],"closed":2,"removed":[],"worktrees":0}
(pass) commands/clean > bare clean keeps ended agents as history and closes their queued writes [59.07ms]
{"malformed":[],"closed":1,"removed":["deadagent1"],"worktrees":0}
(pass) commands/clean > --force reaps the ended agent and closes its queued writes [35.81ms]
(pass) worktree ownership reads the composed environment > a live agent's worktree is protected and a dead one's is not [50.15ms]
(pass) orch clean is destructive maintenance > a spawned agent is refused the sweep, and the dirs it does not own survive [41.34ms]

packages/orch/test/queue.test.ts:
(pass) queue facade on tasks and attempts > malformed task options are refused instead of handed back as TaskOptions [47.51ms]
(pass) queue facade on tasks and attempts > enqueue selects exactly one typed scope and defaults to the enqueuer pack [56.87ms]
(pass) queue facade on tasks and attempts > agent scope requires the enqueuer to lease the target [49.04ms]
(pass) queue facade on tasks and attempts > Cq1: the gate is on enqueuing into a scope, and adoption earns it [54.78ms]
(pass) queue facade on tasks and attempts > Cq1: a pack drains its queue with its orch dead and no lease in force [51.39ms]
(pass) queue facade on tasks and attempts > claiming excludes another pack and space claims require open intake [311.35ms]
(pass) queue facade on tasks and attempts > Cq3: a space-scoped task is an offer, and only an opted-in pack consumes it [409.71ms]
(pass) queue facade on tasks and attempts > a failed pack attempt retries on another member, never outside the pack [87.47ms]
(pass) queue facade on tasks and attempts > Cq5: an agent-scoped binding is to the agent and survives adoption [60.16ms]
(pass) queue facade on tasks and attempts > Cq13: adoption carries the queue — pack work comes with the agents [60.90ms]
(pass) queue facade on tasks and attempts > a claim is an insert and a lost race returns false [50.72ms]
(pass) queue facade on tasks and attempts > cancel rights are enqueuer, targeted agent's leasing orch, or human [63.49ms]
(pass) queue facade on tasks and attempts > Cq7: origin_workspace is gone from the tasks table, scope replaces it [39.04ms]
(pass) queue facade on tasks and attempts > state and attempt-derived values have no legacy flattened fields [47.15ms]

packages/orch/test/log-record.test.ts:
(pass) the one log record shape > writes one JSONL record per call, with an epoch-millis instant [3.26ms]
(pass) the one log record shape > a record below the configured level is not written at all [0.45ms]
(pass) the one log record shape > a correlation id rides every record of one dispatch, so one grep finds its whole life [0.42ms]
(pass) the one log record shape > agentId carries orch's minted id; a plexer handle is a field, never the identity [0.36ms]
(pass) the one log record shape > every level is orderable, lowest to highest [0.05ms]
(pass) the one log record shape > a malformed line is rejected by the guard rather than trusted [0.08ms]

packages/orch/test/one-bind-for-the-unix-endpoint.test.ts:
(pass) one bind for the unix endpoint (2.4) > the unix endpoint is claimed in exactly one place [0.04ms]
(pass) one bind for the unix endpoint (2.4) > reclaiming a stale socket yields the endpoint a first bind produces [6.32ms]

packages/orch/test/spawn-placement.test.ts:
orch is not running inside herdr and no backend was chosen - spawning headless. Pass --backend herdr or set defaults.backend to open a herdr home for these agents (the user grants it), or --space <id> to place them in an open space.
(pass) outside every plexer, spawn is headless unless the human chose one > a plexer orch only probed, from a plain terminal, spawns headless [27.61ms]
(pass) outside every plexer, spawn is headless unless the human chose one > a chosen plexer stays selected and its home is what the human grants [20.43ms]
orch is not running inside herdr and herdr cannot open a space of its own - spawning headless. Pass --backend herdr or set defaults.backend to open a herdr home for these agents (the user grants it), or --space <id> to place them in an open space.
(pass) outside every plexer, spawn is headless unless the human chose one > a chosen plexer that cannot open a home still falls back to headless [24.99ms]
(pass) outside every plexer, spawn is headless unless the human chose one > a caller recorded inside the plexer stays in it, chosen or not [23.51ms]
(pass) outside every plexer, spawn is headless unless the human chose one > a named space is placement enough: no chosen backend needed [27.00ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a named space is orch's own id, and the workspace is its RECORDED home [39.79ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > with no space, orch INSIDE the plexer spawns beside itself and opens nothing [32.75ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a caller INSIDE the plexer whose recorded place is gone resolves no coordinate, never another [28.85ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a caller INSIDE the plexer with NO orch identity (a human's pane) spawns beside itself [36.92ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > with no space and orch OUTSIDE the plexer, the PACK gets its own marked home [34.74ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > the same pack spawning again reuses its home and asks the human nothing [37.03ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > an environment that holds nothing answers with an absence, never a refusal [35.48ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a space with no home HERE places the fleet without borrowing another plexer's [36.06ms]

packages/orch/test/holder-death-costs-a-driver.test.ts:
(pass) holder death costs a driver, not a life (D2) > the task in flight finishes and its result survives the holder [44.34ms]
(pass) holder death costs a driver, not a life (D2) > the lease closes `expired` — not `released`, because no caller held it [46.18ms]
(pass) holder death costs a driver, not a life (D2) > the agent stays alive, unleased and adoptable — nothing closes it [44.98ms]
(pass) holder death costs a driver, not a life (D2) > it receives no new work: the death hands the agent to nobody [45.84ms]
(pass) holder death costs a driver, not a life (D2) > expiry is recorded once and does not erase who held it [38.82ms]
(pass) holder death costs a driver, not a life (D2) > clearing a dead holder's lease is never refused, and is idempotent [44.14ms]

packages/orch/test/hermetic-env.test.ts:
(pass) the test suite is hermetic > no plexer environment leaks in from the shell that launched bun [1.11ms]

packages/orch/test/a-row-is-not-a-pane.test.ts:
(pass) a row is not evidence that a pane exists (U1, U4) > a recorded handle the plexer does not list is reported as NO pane [49.97ms]
(pass) a row is not evidence that a pane exists (U1, U4) > the agent itself is still there — losing a pane costs a shortcut, not a life [47.51ms]
(pass) a row is not evidence that a pane exists (U1, U4) > a handle the plexer DOES list is kept [44.11ms]

packages/orch/test/settings-repair-write.test.ts:
(pass) applySettingsRepairs > rename carries the value to the new key [2.19ms]
(pass) applySettingsRepairs > rename onto an occupied key throws and leaves the file untouched [0.50ms]
(pass) applySettingsRepairs > set writes a value at a dotted path [0.74ms]
(pass) applySettingsRepairs > drop deletes a value without pruning its parent [0.85ms]
(pass) applySettingsRepairs > applies several repairs in one call [0.53ms]
(pass) applySettingsRepairs > repairs a schema-rejected file before readSettingsFile validates it [0.60ms]

packages/orch/test/store-queue.test.ts:
(pass) queue facade storage > state is derived from attempts rather than stored on tasks [45.51ms]
(pass) queue facade storage > retention deletes only settled tasks older than the cutoff [48.44ms]
(pass) queue facade storage > retention never removes a queued task based on its age [37.86ms]
(pass) queue facade storage > agent-scoped tasks become unrunnable when their agent ends [32.05ms]
(pass) queue facade storage > completed tasks stay done after their scope agent ends [43.73ms]
(pass) queue facade storage > a dead orch does not make a pack task unrunnable while a member lives [35.98ms]
(pass) queue facade storage > pack-scoped tasks become unrunnable when every pack member ends [38.21ms]

packages/orch/test/commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [500.61ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [500.59ms]
(pass) commands/lifecycle > --all targets the agents this orch holds a live lease on, and drops them when it releases [74.18ms]

packages/orch/test/settings-shell.test.ts:
(pass) settings shell decisions > non-TTY takes the print path [0.07ms]
(pass) settings shell decisions > an overridden setting is refused with the winner named [2.45ms]
(pass) settings shell decisions > registered writes use the registry entry [0.89ms]
(pass) settings shell decisions > registry exposes writable subcommand entries [0.14ms]

packages/orch/test/worker-tools.test.ts:
(pass) worker tool policy > no configured allowlist restricts nothing [0.16ms]
(pass) worker tool policy > a configured allowlist always carries orch's own tools [0.04ms]
(pass) worker tool policy > peer tools join the allowlist when the fleet enables them [0.02ms]

packages/orch/test/spawn-policy.test.ts:
(pass) spawn policy caps > spawn, dispatch, reset, and model share one resolved tuning [0.90ms]
(pass) spawn policy caps > launch env uses the minted agent id name [0.02ms]
(pass) spawn policy caps > worker prompt depth > root worker maySpawn follows max_depth [0.25ms]
(pass) spawn policy caps > allows a pack spawn while under the cap [0.38ms]
(pass) spawn policy caps > blocks an at-cap spawn and offers dispatch or the pack queue [0.15ms]
(pass) spawn policy caps > a slave may not spawn by default: fleet.max_depth is 1 [0.05ms]
(pass) spawn policy caps > fleet.max_depth 2 lets a slave spawn and refuses its child [0.09ms]
(pass) spawn policy caps > reads a pack cap override from settings [0.41ms]
(pass) spawn policy caps > a tab holds at most fleet.max_agents_per_tab agents, counting what it already holds [0.59ms]
(pass) spawn policy caps > a refused cmdSpawn makes no name, worktree, registry, or queue mutation [54.39ms]

packages/orch/test/thinking-resolution.test.ts:
(pass) thinking resolution > resolves every rung in priority order [0.68ms]
(pass) thinking resolution > bare model with no setting yields harness default [0.42ms]
(pass) thinking resolution > pi translates the resolved level through its thinking role [0.09ms]
(pass) thinking resolution > per-harness override beats global default [0.29ms]

packages/orch/test/herdr-hud-environment.test.ts:
(pass) the herdr HUD reads its pane from the composer, never from the key > a herdr-placed agent reports the handle its environment carries [51.91ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > the handle follows the agent when it moves pane [59.14ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > an agent on another plexer is not a herdr pane [45.58ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > a process orch never launched is not a herdr pane [0.37ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > a key that is not a minted id resolves to no pane at all [0.24ms]

packages/orch/test/setup-flags.test.ts:
(pass) setup model flags > rejects a bare model when multiple harnesses are selected [0.14ms]
(pass) setup model flags > binds each model flag to its own harness [0.07ms]
(pass) setup model flags > allows a bare model for one harness [0.04ms]
(pass) setup model flags > rejects a model bound to an unselected harness [0.11ms]
(pass) setup model flags > rejects duplicate model flags for one harness [0.04ms]

packages/orch/test/setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [76.36ms]
(pass) notifier setup logic > lists unavailable notifiers with remediation and disables selection [0.13ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.17ms]
(pass) notifier setup logic > renders a command entry that loadSettings can parse [0.77ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.25ms]

packages/orch/test/claude-hooks.test.ts:
(pass) Claude hook command > gates execution on the launch environment variable [0.24ms]

packages/orch/test/port-has-no-shell.test.ts:
(pass) the backend port has no dead workspace shell > backend types contain neither deleted declaration [0.07ms]
(pass) the backend port has no dead workspace shell > src contains no workspaceNames calls or BackendWorkspace references [3.81ms]

packages/orch/test/daemon-credential.test.ts:
(pass) the token file is the whole credential > the token is 0600 [1.96ms]
(pass) the token file is the whole credential > $ORCH_DIR is 0700, so same-uid is a boundary the filesystem enforces [1.74ms]
(pass) the token file is the whole credential > a token left loose by an earlier run is tightened, not trusted [1.51ms]
(pass) the token file is the whole credential > a runtime directory the daemon creates is 0700 too [1.45ms]
(pass) the token file is the whole credential > nothing else is enrolled: there is no allowlist beside the token [1.47ms]

packages/orch/test/peer-identity.test.ts:
(pass) spawner identity > a bare operator with no session markers is just the operator [35.49ms]
(pass) spawner identity > an unregistered Claude Code session is labelled by its harness, with no id [23.90ms]
(pass) spawner identity > a session orch has registered IS addressable, by the id orch minted [32.04ms]
(pass) spawner identity > an unregistered session has no id to hand out, and does not invent one [0.40ms]
(pass) spawner identity > an orch-spawned orchestrator acts as the id orch minted for it [44.34ms]
(pass) spawner identity > agentIdentityEnv stamps a reply address only when the spawner has one [0.18ms]
(pass) spawner identity > worktreeEnv stamps worktree identity only for isolated agents [0.05ms]
(pass) spawner identity > the registry keeps the exact spawning session distinct from the lease holder [51.54ms]
(pass) the spawner address invariant > an UNREGISTERED session stamps no address, so no worker is handed an unreachable one [0.32ms]
(pass) the spawner address invariant > a bare operator stamps no address [23.56ms]
(pass) the spawner address invariant > an address that IS stamped resolves to a live status record [44.39ms]
(pass) peer identity in messaging > peer summaries render an unplaced agent without a local place name [48.96ms]
(pass) peer identity in messaging > orch_send reports the peer's NAME and calls the message RPC [43.90ms]
(pass) peer identity in messaging > orch_send reports queued when the message is not acknowledged [40.39ms]
(pass) peer identity in messaging > orch_send reports when the daemon is unreachable [44.40ms]
(pass) peer identity in messaging > peers resolve by display name exactly like by key [43.14ms]
(pass) peer identity in messaging > "spawner" reaches the stamped spawner session across fleet scoping [58.11ms]
(pass) peer identity in messaging > a spawner with no live status record is refused BY NAME, not with a bare key [41.20ms]

packages/orch/test/bridge-reasserts-pin.test.ts:
(pass) bridge reasserts orch model pins > reasserts after session_start and reports the applied pin [5.69ms]
(pass) bridge reasserts orch model pins > reasserts one time for a foreign level and ignores apply events [3.40ms]
(pass) bridge reasserts orch model pins > a harness clamp does not create a reassert loop [2.31ms]

packages/orch/test/transfer-does-not-disturb.test.ts:
(pass) a transfer touches the lease and nothing else > a handoff changes the holder and leaves every other fact identical [59.27ms]
(pass) a transfer touches the lease and nothing else > the agent's process is not restarted or re-attached [58.06ms]
(pass) a transfer touches the lease and nothing else > no control write is delivered to the agent [65.63ms]
(pass) a transfer touches the lease and nothing else > adoption of an unheld agent disturbs it no more than a handoff does [63.57ms]
(pass) a transfer touches the lease and nothing else > the holding that ended is kept as history, not erased by the transfer [58.27ms]

packages/orch/test/commands-runs.test.ts:
(pass) commands/runs > lists newest first and honors -n [46.91ms]
(pass) commands/runs > target filter and json preserve RunRecord rows [54.57ms]
(pass) commands/runs > running rows render as running, not zero duration [0.20ms]
(pass) commands/runs > result falls back to durable run history after presence reap [32.44ms]

packages/orch/test/dispatch-channel-first.test.ts:
(pass) work reaches an agent through its link > a headless agent receives a dispatch through the link [47.51ms]
(pass) work reaches an agent through its link > a capless adapter still gets the not-placed boundary answer [49.04ms]

packages/orch/test/settings-notify.test.ts:
(pass) orch settings notify > records a sink with the field that sink declares [93.74ms]
(pass) orch settings notify > re-adding one sink replaces it in place and keeps the fields the call omits [266.98ms]
(pass) orch settings notify > accepts asking as a first-class sink state [91.66ms]
(pass) orch settings notify > remove drops only the named sink [185.59ms]
(pass) orch settings notify > list reports each sink with the states it fires on, defaults included [178.63ms]
(pass) orch settings notify > an empty notify array lists as none configured [0.40ms]
(pass) orch settings notify > the notify row lists every sink, the states it may fire on, and the fields each carries [84.52ms]
(pass) orch settings notify > the notify row writes the picked sinks, states included, and drops the ones left off [1.81ms]
(pass) orch settings notify > the notify row refuses an unknown sink, a carrying sink with nothing to carry, and an unknown state [0.55ms]

packages/orch/test/notify.test.ts:
(pass) notification routing > an excluded state does not invoke its notifier [6.06ms]

packages/orch/test/backend-tmux.test.ts:
(pass) TmuxBackend > current identity uses the explicit id, not the launch environment [0.55ms]
(pass) TmuxBackend > does not expose legacy top-level group methods [0.09ms]
(pass) TmuxBackend > composes a complete group role bundle [0.04ms]
(pass) TmuxBackend > exposes tmux pane roles [0.03ms]
(pass) TmuxBackend > reads the pane shell pid as the pane process [0.32ms]
(pass) TmuxBackend > reports tmux availability [0.16ms]
(pass) TmuxBackend > reflects the TMUX environment [0.06ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.05ms]
(pass) TmuxBackend > the pane inventory surfaces only orch-spawned panes [0.33ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.12ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [0.40ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.07ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [251.53ms]
(pass) TmuxBackend > waiting fails immediately when the pane has no presence key [0.27ms]
(pass) TmuxBackend > the pane screen returns captured text and throws when capture-pane fails [1751.61ms]
(pass) TmuxBackend > setLabel and renameAgent write two distinct pane options [0.51ms]
(pass) TmuxBackend > placement.open splits the requested target with cwd and environment [0.63ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.82ms]
(pass) TmuxBackend > spawn splits the planned target pane, not whatever pane the window has active [0.32ms]
(pass) TmuxBackend > groupLayout reports every pane in a window with its cell geometry [0.74ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.45ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [0.57ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.22ms]
(pass) an agent is launched with its fleet's project scope (1.13) > a tmux agent in a worktree carries the FLEET's project, not its own cwd [0.28ms]
(pass) an agent is launched with its fleet's project scope (1.13) > a tmux agent opened in a fresh window carries it too [0.18ms]
(pass) an agent is launched with its fleet's project scope (1.13) > an empty value is dropped rather than exported as a configured blank [0.14ms]

packages/orch/test/identity.test.ts:
(pass) serializeIdentity / parseIdentity > a key is the minted id verbatim [0.03ms]
(pass) serializeIdentity / parseIdentity > round-trips a minted id [0.02ms]
(pass) serializeIdentity / parseIdentity > a key is one flat filesystem-safe segment with nothing to split [0.04ms]
(pass) serializeIdentity / parseIdentity > two spawns never collide, so no plexer is needed to namespace them [3.51ms]
(pass) isAgentId > accepts a minted id [0.03ms]
(pass) isAgentId > rejects everything that is not one [0.05ms]
(pass) malformed input > rejects malformed ids [0.03ms]

packages/orch/test/commands-lease.test.ts:
(pass) lease commands > detach releases the lease and is a no-op when already unleased [55.61ms]
(pass) lease commands > a LIVE foreign holder still excludes everyone else [48.49ms]
(pass) lease commands > adopt takes an unleased agent and a dead holder [46.37ms]
(pass) lease commands > adopt refuses a holder with a live recorded process [40.43ms]
(pass) lease commands > reap refuses when a live descendant exists, regardless of lease [46.01ms]
(pass) lease commands > reap refuses while the recorded process is alive [34.47ms]
(pass) lease commands > reap is never lease-gated and removes the record and presence [45.31ms]
{"outcome":"answer","reason":"no-environment-role","text":"this pane environment does not provide abort"}
(pass) lease commands > abort proceeds with a foreign live-holder lease [52.30ms]
{"closed":["20na7rl9c1"],"results":[{"target":"20na7rl9c1","handle":"close-handle","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) lease commands > close proceeds with a foreign live-holder lease [57.65ms]
{"target":"9v756d6fj2","name":"reap-worker","reaped":true}
(pass) lease commands > reap proceeds with a foreign live-holder lease [43.78ms]
(pass) lease commands > reset driving verb refuses a foreign live-holder lease [44.27ms]

packages/orch/test/event-identity.test.ts:
(pass) published event identity > stamps a per-agent ordinal so a redelivery is recognizable [0.22ms]
(pass) the work loop is not a second presence-transition source > an agent state change publishes nothing from the queue loop [158.97ms]

packages/orch/test/adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.13ms]
(pass) PiAdapter > restricted workers explicitly load the bundled pi extension [0.09ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.04ms]
(pass) PiAdapter > reads state from the presence status through store helpers [21.75ms]
(pass) PiAdapter > reads results.jsonl and falls back to the last assistant session text [0.98ms]
(pass) PiAdapter > parses pi's supported model table without importing harness internals [0.26ms]

packages/orch/test/daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [0.77ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [0.59ms]
(pass) daemon lifecycle > reclaims an unreadable lock, which a crash truncated and no daemon owns [0.72ms]
(pass) daemon lifecycle > refuses an unreadable lock while the socket still answers [0.28ms]
(pass) daemon lifecycle > clears the lock, socket and port a departed daemon owned, keeping the log [0.35ms]
(pass) daemon lifecycle > refuses a stale lock when the socket probe cannot answer [0.34ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [0.46ms]
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
  add       react                Add a dependency to package.json (bun a)
  remove    @parcel/core         Remove a dependency from package.json (bun rm)
  update    lyra                 Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
  dedupe                         Remove duplicate versions from the lockfile
  prune                          Remove packages that are not in the lockfile from node_modules
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
  create    astro                Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [21.40ms]
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [1.31ms]
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
  add       @shumai/shumai       Add a dependency to package.json (bun a)
  remove    moment               Remove a dependency from package.json (bun rm)
  update    hono                 Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
  dedupe                         Remove duplicate versions from the lockfile
  prune                          Remove packages that are not in the lockfile from node_modules
  outdated                       Display latest versions of outdated dependencies
  link      [<package>]          Register or link a local npm package
  unlink                         Unregister a local npm package
  publish                        Publish a package to the npm registry
  patch <pkg>                    Prepare a package for patching
  pm <subcommand>                Additional package management utilities
  info      react                Display package metadata from the registry
  why       lyra                 Explain why a package is installed

  build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file

  init                           Start an empty Bun project from a built-in template
  create    svelte               Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > rejects a recycled pid identity [0.69ms]
(pass) daemon lifecycle > foreign machine registration cannot be signalled for another store [0.42ms]
(pass) daemon lifecycle > only a provable lock owner may be signalled [0.33ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [0.23ms]

packages/orch/test/control-ack.test.ts:
(pass) control delivery acknowledgements > waits for the matching reader acknowledgement [0.24ms]
(pass) control delivery acknowledgements > captures an acknowledgement arriving during delivery [0.06ms]
(pass) control delivery acknowledgements > never claims consumption for an unacknowledged channel [0.03ms]
(pass) control delivery acknowledgements > times out without claiming that delivery was cancelled [2.92ms]
(pass) control delivery acknowledgements > propagates a failed send and removes its waiter [0.18ms]

packages/orch/test/port-seam-errors.test.ts:
(pass) port seam error contract > provider mutation errors preserve argv, exit status, stderr, and stdout [0.28ms]
(pass) port seam error contract > provider query errors throw instead of returning a sentinel [0.14ms]

packages/orch/test/one-control-dispatcher.test.ts:
(pass) there is exactly one control dispatcher > no module outside src/control declares a control dispatcher [3.23ms]
(pass) there is exactly one control dispatcher > no dispatcher is exported under two names [7.61ms]

packages/orch/test/spawn-name-list.test.ts:
(pass) spawn names every agent positionally, at creation > the positional arguments are the names, one per pane [0.09ms]
(pass) spawn names every agent positionally, at creation > the pane count is how many names were given [0.04ms]
(pass) spawn names every agent positionally, at creation > spawning with no name at all is refused [0.10ms]
(pass) spawn names every agent positionally, at creation > a bare count is not a name and is refused [0.12ms]
(pass) spawn names every agent positionally, at creation > the same name twice would collide, so it is refused before anything is created [0.05ms]
(pass) spawn names every agent positionally, at creation > every name is validated, so one bad name creates nothing [0.04ms]
(pass) spawn names every agent positionally, at creation > --name is gone: naming is positional, so the flag is an unknown flag [0.06ms]
(pass) spawn names every agent positionally, at creation > claimSpawnNames takes the resolved names and asserts each is free [0.88ms]

packages/orch/test/no-placement-row-over-the-composed-view.test.ts:
(pass) no Placement row is reassembled over the composed view (2.1) > there is no second lookup module projecting the environment into a flat row [0.09ms]
(pass) no Placement row is reassembled over the composed view (2.1) > the space wall reads the OPEN space interval, so a moved agent is walled by where it IS [62.43ms]
(pass) no Placement row is reassembled over the composed view (2.1) > a string that names no registered agent is in no space rather than an error [29.20ms]

packages/orch/test/store-lease-rows.test.ts:
(pass) agent lease rows > fencing ids are monotonic across agents and never reused after reap [44.16ms]
(pass) agent lease rows > a second open lease is rejected [44.18ms]
(pass) agent lease rows > release and expiry close rows with matching reason and exact until [47.22ms]
(pass) agent lease rows > handoff closes current and inserts a newer row without changing prior facts [45.47ms]
(pass) agent lease rows > adoption closes prior and inserts a strictly newer adopter row [47.44ms]
(pass) agent lease rows > adoption with no open lease is plain acquire and leaves closed history untouched [40.99ms]
(pass) agent lease rows > handoff rolls back close when successor insert fails [41.57ms]
(pass) agent lease rows > wrong-holder release and handoff are rejected [38.75ms]
(pass) agent lease rows > an agent cannot lease itself [39.70ms]
(pass) agent lease rows > expiry inserts nothing new [40.97ms]
(pass) agent lease rows > reads return only open rows [47.51ms]

packages/orch/test/unleased-stays-adoptable.test.ts:
(pass) unleased and idle stays alive and adoptable (D3) > a decade of retention sweeps never ages out an unleased idle agent [39.73ms]
(pass) unleased and idle stays alive and adoptable (D3) > and it is still adoptable afterwards — the point of keeping it [37.83ms]
(pass) unleased and idle stays alive and adoptable (D3) > the sweep reaps only agents that actually ENDED, never merely unleased ones [43.46ms]
(pass) unleased and idle stays alive and adoptable (D3) > repeated sweeps are stable: an unleased agent survives every one of them [37.70ms]

packages/orch/test/port-seam-channel.test.ts:
(pass) orch bridge links and capture roles > headless delivery reaches the link and the ack settles its outbox row [57.76ms]
(pass) orch bridge links and capture roles > live session delivery settles mail without a bridge or pane route [48.98ms]
(pass) orch bridge links and capture roles > a spawned agent whose bridge is detached stays queued for that bridge [60.87ms]
(pass) orch bridge links and capture roles > dead session without a bridge or pane route is undeliverable [45.03ms]
(pass) orch bridge links and capture roles > capture reads status and result from the orch presence record [23.04ms]

packages/orch/test/one-spelling-per-fact.test.ts:
(pass) one spelling per shared fact > osSide and the store agree for an injected Windows platform [36.18ms]
(pass) one spelling per shared fact > the shared record guard rejects arrays and null [0.13ms]
(pass) one spelling per shared fact > removed identity method has no source spelling [3.16ms]
(pass) one spelling per shared fact > settings reads have no literal fallbacks [8.28ms]
(pass) one spelling per shared fact > launch env has one spelling [6.80ms]
(pass) one spelling per shared fact > removed spawn cap has no source or README spelling [3.26ms]

packages/orch/test/outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [45.44ms]

packages/orch/test/settings-thinking.test.ts:
(pass) orch settings thinking > writes the global default and reads back through loadSettings [0.84ms]
(pass) orch settings thinking > writes a per-harness override without disturbing the global default [0.53ms]
thinking  xhigh
(pass) orch settings thinking > the command sets the level a user names [0.71ms]
thinking (pi)  low
(pass) orch settings thinking > the command sets a per-harness level with --harness [0.75ms]
(pass) orch settings thinking > a level orch does not know is refused, naming the valid levels [0.29ms]
(pass) orch settings thinking > clearing a per-harness override falls back to the global default [0.43ms]

packages/orch/test/lease-authority.test.ts:
(pass) C3 foreign agents are untouchable > every driving verb is refused while a live foreign orch holds the lease [50.38ms]
(pass) C3 foreign agents are untouchable > a DEAD foreign holder is not a collision [42.24ms]
(pass) C3 foreign agents are untouchable > the composed holder IS the open lease, with nothing beside it [42.95ms]
(pass) C4 steal > adopt refuses a live holder, and --steal takes it [45.45ms]
(pass) C4 steal > detach refuses a live holder, and --steal releases it [49.08ms]
(pass) C4a fencing token > lease ids are monotonic across handoff and adoption [44.70ms]
(pass) C4a fencing token > a stale fence cannot release the current holder's lease [44.96ms]
(pass) C4a fencing token > openLeaseId is null when nothing is leased [34.87ms]
(pass) C4b reads are never gated > status and events read straight through a live foreign lease [37.86ms]
(pass) C4c/C4d name resolution > duplicate names are legal and an ambiguous target asks for the id [41.28ms]
(pass) C4c/C4d name resolution > a unique name resolves, and an unknown target is a lookup miss [33.40ms]
(pass) C4e naming at creation > a nameless spawn is refused [0.13ms]
(pass) C4e naming at creation > a self-registering session gets <harness>-<first 8 of its id> [33.70ms]
(pass) C4f self-rename > an agent renames itself whether or not a lease is in force [48.39ms]
(pass) C4f self-rename > renaming another agent is driving and obeys the lease [43.26ms]
(pass) C4f self-rename > an invalid name is refused [31.64ms]
(pass) C5 a transfer does not disturb the agent > adoption writes lease rows and touches nothing else [49.42ms]
(pass) C7 live by lease, history by provenance > adoption moves the live view and leaves provenance untouched [47.64ms]

packages/orch/test/work-notify.test.ts:
(pass) orch presence notifications > delivers a presence transition through a configured command sink [62.77ms]

packages/orch/test/cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.11ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [0.33ms]
(pass) tmux backend registry and capabilities > exposes pane roles [0.07ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.05ms]
(pass) tmux backend registry and capabilities > a tmux agent's key is the minted id, never its pane [0.07ms]
(pass) tmux backend registry and capabilities > selects an available placing environment, whichever one the caller sits in [0.14ms]
(pass) tmux backend registry and capabilities > falls back to headless only when no environment can place an agent [0.06ms]
(pass) tmux backend registry and capabilities > an installed plexer is selectable from outside its session, and refuses in its own words [0.27ms]
(pass) tmux backend registry and capabilities > herdr is selectable from outside a herdr session [0.05ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-space [66.72ms]

packages/orch/test/setup-wizard.test.ts:
(pass) setup model picker > switches large catalogues to searchable bounded mode and preserves effort [0.42ms]
(pass) setup model picker > keeps the compact selector for small catalogues [0.15ms]
(pass) setup model list picker > large catalogues use the bounded searchable multiselect [0.20ms]
(pass) setup model list picker > the prompt names both jobs the list does, and that an empty one forbids nothing [0.08ms]
(pass) setup model list picker > stored values start checked, and clearing them returns an empty selection [0.25ms]

packages/orch/test/work-loop-identity.test.ts:
(pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > a claim records the minted agent id, not the presence key [64.17ms]
(pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > an idle process with no registered agent row is never handed pack work [45.87ms]
(pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > Cq1: the pack drains its own queue with its orch dead and no lease in force [56.40ms]

packages/orch/test/space-policy.test.ts:
(pass) a space is user-created, and absence falls back to the repo root > placing an agent in a space nobody created is refused, not minted [32.12ms]
(pass) a space is user-created, and absence falls back to the repo root > two unspaced agents in the SAME repo root can reach each other [36.29ms]
(pass) a space is user-created, and absence falls back to the repo root > two unspaced agents in DIFFERENT repo roots cannot [39.47ms]
(pass) a space is user-created, and absence falls back to the repo root > an agent placed in no space reports none, even inside a plexer workspace [43.16ms]
(pass) a space is user-created, and absence falls back to the repo root > recording a spawn never conjures the space it names [31.80ms]
(pass) a space is user-created, and absence falls back to the repo root > a space still walls, and it outranks the repo root [44.44ms]
(pass) space policy > reads the space from the environment satellite, and absence is null [61.17ms]
(pass) space policy > resolves space names through records and functions [0.12ms]
(pass) space policy > compares agents by the space each is composed into [71.99ms]
(pass) space policy > enforces the space wall across every plexer alike [96.66ms]
(pass) space policy > scopes agents to the current space [63.53ms]
(pass) space policy > a null current space leaves items unscoped [35.81ms]
(pass) space policy > 2.7 status displays the composed space, not text sliced from a key [62.07ms]
(pass) space policy > 6.6 structured identity drives status and policy, not serialized key text [57.94ms]

packages/orch/test/notify-events-format.test.ts:
(pass) notification and presence event formatting > spaceColor is stable and returns a palette hex [0.08ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.11ms]
(pass) notification and presence event formatting > named events prefer the human name over the harness id [0.04ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.08ms]
(pass) notification and presence event formatting > message notification titles contain delivered mail text [0.04ms]
(pass) notification and presence event formatting > webhook payload includes space and spaceColor [0.41ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [25.83ms]
(pass) notification and presence event formatting > derivePresenceTransition composes the space from the agent's environment [39.20ms]

packages/orch/test/store-events.test.ts:
(pass) event store rows > appendEvent assigns increasing sequence numbers and round-trips payload [40.59ms]
(pass) event store rows > appendEvent keeps sequence numbers across store reopen [50.41ms]
(pass) event store rows > pruned sequence numbers are never reused [39.43ms]
(pass) event store rows > selectEventsSince filters by sequence, orders ascending, and honours limit [42.00ms]
(pass) event store rows > oldestEventSeq reports undefined when empty and the surviving lowest sequence after pruning [41.36ms]

packages/orch/test/bridge-terminal.test.ts:
(pass) bridge terminal turn seam > empty and tool-only turn_end turns still publish a terminal idle state [2.15ms]
(pass) bridge terminal turn seam > a settled turn with assistant text publishes done [1.44ms]

packages/orch/test/events-scope-notice.test.ts:
(pass) events scope notice > names the default live scope and its wideners [0.43ms]
(pass) events scope notice > names the all-agent live scope and its history widener [0.11ms]
(pass) events scope notice > a redirected stream is a harness reading transitions, and gets no banner [0.03ms]
(pass) events scope notice > does not announce when history was requested [0.08ms]
(pass) events scope notice > writes one notice before starting the live transport [0.17ms]
(pass) events scope notice > does not write a notice when history was requested [0.07ms]
(pass) events scope notice > says so when the caller owns no agents [0.12ms]
(pass) events scope notice > stays out of a --json stream, which a parser is reading [0.07ms]
(pass) events scope notice > does not announce when explicit targets were requested [0.06ms]

packages/orch/test/status-owner-column.test.ts:
(pass) the rendered status table carries the owner column > each row's OWNER cell holds that row's lease fact [0.81ms]
(pass) the rendered status table carries the owner column > a dead holder reads as unleased under a table that all shares one owner [0.19ms]
(pass) the rendered status table carries the owner column > the owner column is dropped only when no row knows its lease [0.08ms]

packages/orch/test/pack-gets-its-own-home.test.ts:
(pass) a pack gets its own marked plexer home (E8, E9, E10) > the coordinate is STORED against the pack and is never orch's own id [43.89ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > the home orch opens is MARKED as orch's, never a bare directory name [31.97ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > a space's home and a pack's home use the SAME role and different tables [41.18ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > a home recorded in another plexer is not this one's to drive [36.48ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > closing a pack's home clears the row, so the next open is a fresh one [53.22ms]

packages/orch/test/doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [1.34ms]
(pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [0.86ms]
(pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [257.09ms]
(pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [0.62ms]
(pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [143.48ms]
(pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [0.91ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [0.67ms]
(pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [0.64ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [1.05ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [0.91ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [1.21ms]

packages/orch/test/worker-prompt.test.ts:
(pass) worker prompt capability composition > spawn clause follows maySpawn and stripping preserves the task [0.14ms]
(pass) worker prompt capability composition > orch run composition selects the same header per adapter [0.10ms]
(pass) worker prompt capability composition > the worker header does not instruct a lock that does not lock [0.06ms]
(pass) worker prompt capability composition > the header addresses the agent, and names no plexer furniture [0.06ms]
(pass) worker prompt capability composition > the verify clause names the configured commands, and asks for the repository's own when there are none [0.07ms]
(pass) worker prompt capability composition > locked-commands clause names the commands, and asks for a report rather than a lock [0.04ms]
(pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.02ms]
(pass) worker prompt capability composition > the reply-to-spawner clause needs a reachable spawner, not just a bridge-enabled worker [0.04ms]
(pass) worker prompt capability composition > unreachable spawner tells the worker to finish and end without relaying [0.03ms]
(pass) worker prompt capability composition > reachable spawner permits replying to the spawner only [0.03ms]
(pass) worker prompt capability composition > a reachable spawner still earns no clause when the worker has no bridge [0.02ms]
(pass) worker prompt capability composition > the ask clause follows the bridge actions [0.05ms]
(pass) worker prompt capability composition > events strip both worker header variants [26.26ms]

packages/orch/test/adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [0.55ms]
(pass) adapter and runtime hardening > rejects unknown settings keys with a useful path [0.67ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [42.76ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [0.54ms]

packages/orch/test/identity-is-not-environment.test.ts:
(pass) A1 — identity carries no environment > Identity declares no plexer and no plexer grouping [0.09ms]
(pass) A1 — identity carries no environment > a key is the minted id itself, with no separator to split [0.05ms]
(pass) A1 — identity carries no environment > the module never spells the sentinels that stand in for a missing place [0.04ms]
(pass) A1 — identity carries no environment > minted ids are unique per spawn [1.85ms]

packages/orch/test/commands-target.test.ts:
(pass) commands/target > splits known flags and preserves positional args [0.06ms]
(pass) commands/target > extracts target and joined prompt [0.12ms]
(pass) commands/target > reads only structured result text [0.04ms]
(pass) commands/target > quotes remote args and ORCH_DIR safely [0.12ms]
(pass) commands/target > lists only live serialized identity presence entries [51.65ms]

packages/orch/test/outbox.test.ts:
(pass) outbox delivery > selects pending messages and delivers each message once [37.19ms]
(pass) outbox delivery > checks one message's pending state without scanning the outbox [35.29ms]
(pass) outbox delivery > keeps failed messages pending until their backoff expires [35.33ms]

packages/orch/test/reload-no-bundle-write.test.ts:
{"results":[],"ok":0,"total":0,"hard":false,"signaled":"reload.signal"}
(pass) reload > does not write installed extension bundles [2.13ms]

packages/orch/test/commands-queue.test.ts:
(pass) commands/queue > cmdQueue list emits the selected JSON view [39.07ms]
(pass) commands/queue > round-trips add/list/cancel on an isolated store [34.04ms]
No queue tasks.
(pass) commands/queue > renders empty queues without throwing [0.13ms]

packages/orch/test/store-task-rows.test.ts:
(pass) task and attempt rows > malformed task rows are refused instead of handed back as typed data [45.31ms]
(pass) task and attempt rows > malformed attempt rows are refused instead of handing back NaN [44.52ms]
(pass) task and attempt rows > enqueue accepts exactly one typed scope and round-trips JSON opts [38.64ms]
(pass) task and attempt rows > queued tasks can be edited only by their enqueuer [47.25ms]
(pass) task and attempt rows > two concurrent claims have one winner and one index violation [44.05ms]
(pass) task and attempt rows > failed attempts remain in history and retries are new attempts [46.88ms]
(pass) task and attempt rows > settlement stores exact integer instants and outcome payloads [51.86ms]
(pass) task and attempt rows > task state precedence covers queued, claimed, failed, done and cancelled [61.78ms]
(pass) task and attempt rows > intakes are half-open history and duplicate open intake is rejected [55.86ms]

packages/orch/test/no-sibling-relay.test.ts:
(pass) a worker with no reachable spawner does not relay (L6) > an unset spawner refuses, and the refusal names the agent's own report path [0.75ms]
(pass) a worker with no reachable spawner does not relay (L6) > the refusal never suggests another agent as an alternative route [0.66ms]
(pass) a worker with no reachable spawner does not relay (L6) > a spawner that is stamped but has no live status record refuses by NAME and still says to report [0.54ms]

packages/orch/test/orch-bugs-4-5.test.ts:
(pass) orch bugs 4 and 5 launch contracts > interactive launch routes use one argv composition [0.11ms]
(pass) orch bugs 4 and 5 launch contracts > headless launch routes use one argv composition [0.10ms]
(pass) orch bugs 4 and 5 launch contracts > inherited extension policy emits every discovered extension [0.05ms]

packages/orch/test/doctor-declared-vs-reality-tuning.test.ts:
(pass) doctor declared tuning versus reality > matching model and effort produces no finding [139.90ms]
(pass) doctor declared tuning versus reality > different effort reports both ladder specs [560.80ms]
(pass) doctor declared tuning versus reality > different model reports both ladder specs [44.34ms]
(pass) doctor declared tuning versus reality > missing status produces no tuning finding [48.52ms]

packages/orch/test/settings-view.test.ts:
(pass) settings view > visibleEntryIndices matches key and group case-insensitively [4.04ms]
(pass) settings view > windowBounds keeps the focus inside the budget and clamps at both ends [0.14ms]
(pass) settings view > frame shows group headers, values, provenance tags, and the focused help [0.53ms]
(pass) settings view > frame with a filter narrows the list and draws the filter line [0.09ms]
(pass) settings view > frame reports an empty filter match instead of a blank screen [0.06ms]
(pass) settings view > a long list is windowed with more-above/more-below markers [0.54ms]
(pass) settings view > overlays render choices, checkboxes, and input with error [0.23ms]
(pass) settings view > a checkbox row shows what its choice carries [0.05ms]
(pass) settings view > displayValue keeps scalars bare and JSON-encodes shapes [0.04ms]

packages/orch/test/bridge-client.test.ts:
(pass) bridge daemon client > attaches, receives deliveries, acks on the link, and reconnects [1064.82ms]
(pass) bridge daemon client > dead endpoints resolve undefined without invoking handlers [1.38ms]

packages/orch/test/port-seam-boundary.test.ts:
(pass) port seam command boundary > headless target is answered without invoking its pane role [0.11ms]
(pass) port seam command boundary > paned environment without a role is answered at the boundary [0.06ms]
(pass) port seam command boundary > an invocation preserves the provider failure [0.14ms]

packages/orch/test/notify-sinks.test.ts:
(pass) notification entries > desktop entries use the canonical notifier registry [0.21ms]

packages/orch/test/session-env.test.ts:
(pass) shim environment > allows the launch environment variable [0.09ms]

packages/orch/test/remote.test.ts:
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.09ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.08ms]

packages/orch/test/broker-ownership.test.ts:
(pass) broker ownership and space governance > the composed holder is the only ownership record, and adoption moves it [46.81ms]
(pass) broker ownership and space governance > refuses cross-space writes unless explicitly overridden [49.63ms]
(pass) broker ownership and space governance > moving an agent between spaces moves the wall, not its identity [49.62ms]

packages/orch/test/work-survives-its-spawner.test.ts:
(pass) work survives its spawner, always (D1) > ending the spawner leaves the child live, unended and still listed [39.84ms]
(pass) work survives its spawner, always (D1) > a grandchild is untouched when the middle agent ends [37.27ms]
(pass) work survives its spawner, always (D1) > the store has no lifetime column and no fate-sharing flag anywhere [0.31ms]
(pass) work survives its spawner, always (D1) > spawn offers no flag that decides whether work outlives its spawner [0.34ms]
(pass) work survives its spawner, always (D1) > closing the spawner never writes an ending for anything it spawned [38.45ms]

packages/orch/test/session.test.ts:
(pass) parseSession > returns an empty view for null and missing paths [0.08ms]
(pass) parseSession > handles model, thinking, user, assistant, tool, and unknown entries [0.79ms]
(pass) parseSession > joins text blocks and ignores non-text blocks [0.29ms]

packages/orch/test/session-refresh-repoints-identity.test.ts:
(pass) session refresh identity continuity > same process with a new token repoints the existing agent and preserves its lease [49.89ms]
(pass) session refresh identity continuity > same token with a new process keeps the agent and repoints its process interval [36.78ms]
(pass) session refresh identity continuity > a new token and a new process mint a new agent [37.84ms]
(pass) session refresh identity continuity > a process anchored by an ended agent mints instead of repointing [38.45ms]

packages/orch/test/status-renders-one-row-shape.test.ts:
(pass) status rendering has one row shape and one table renderer > task and last text use the same spelling in the row and table cell [6.14ms]
(pass) status rendering has one row shape and one table renderer > local and remote rows share the renderer; remote adds only HOST [0.46ms]
(pass) status rendering has one row shape and one table renderer > fleet resolves caller inputs once while building three presence rows [28.90ms]

packages/orch/test/commands-help.test.ts:
(pass) per-command help topics > daemon help names every subcommand and the idle shutdown setting [0.05ms]
(pass) per-command help topics > aliases resolve to their command's topic [0.03ms]
(pass) per-command help topics > logs help names every filter the command accepts [0.05ms]
(pass) per-command help topics > an unknown name has no topic [0.06ms]
(pass) per-command help topics > every topic is printable text ending in a newline [0.05ms]

packages/orch/test/spawn-names.test.ts:
(pass) agent name validation > rejects names outside herdr's naming rule [0.18ms]
(pass) agent name validation > accepts lowercase names with hyphens and underscores [0.04ms]
(pass) a live name is claimed and a dead one is released > a live agent holds its name against a second spawn [56.91ms]
(pass) a live name is claimed and a dead one is released > a dead agent frees its name [51.05ms]
(pass) a live name is claimed and a dead one is released > another space's agent never blocks a name here [47.60ms]
(pass) name scope follows the agent's current space, not its birthplace > moving an agent moves the name it holds [61.91ms]
(pass) name scope follows the agent's current space, not its birthplace > the collision names the agent by its minted id [50.76ms]

packages/orch/test/identity-self.test.ts:
(pass) selfIdentity > returns the launch id without touching the store [0.62ms]

packages/orch/test/adapter-session-env.test.ts:
(pass) adapter-owned session environment > resolves each caller harness through the public session resolver [0.29ms]
(pass) adapter-owned session environment > keeps harness env literals inside adapter modules [4.10ms]
(pass) adapter-owned session environment > a registered adapter resolves a novel marker without resolver changes [0.26ms]

packages/orch/test/spawn-preferred-models.test.ts:
(pass) the preferred quicklist reaches every launch route > a pane spawn hands the exact array to the backend [57.97ms]
(pass) the preferred quicklist reaches every launch route > an unconfigured quicklist stays empty rather than becoming a default one [51.70ms]
(pass) the preferred quicklist reaches every launch route > the previewed command is the command a launch runs [0.33ms]
(pass) the preferred quicklist reaches every launch route > a headless launch forwards the quicklist into the adapter's own options [49.30ms]
(pass) orchd rules on the quicklist it is sent > accepts an absent value and an array of specs [0.17ms]
(pass) orchd rules on the quicklist it is sent > refuses a joined string or a blank entry instead of coercing it [0.13ms]

packages/orch/test/settings-precedence.test.ts:
(pass) settings precedence > returns a defaults value when no override is set [0.71ms]
(pass) settings precedence > applies defaults when settings, env, and flag are absent [0.52ms]
(pass) settings precedence > uses env over settings and flag over env [0.35ms]
(pass) settings precedence > parses notify entries and hosts into expected shapes [0.87ms]
(pass) settings precedence > reports a helpful validation error for invalid settings [0.48ms]

packages/orch/test/bridge-link-server.test.ts:
(pass) daemon bridge links > attaches, replies, notifies after the reply write, and pushes deliveries [36.73ms]
(pass) daemon bridge links > a socket close detaches its bridge [36.00ms]
(pass) daemon bridge links > a second socket replaces the first link [53.08ms]
(pass) daemon bridge links > attach for an agent the store does not know is refused and the server keeps serving [42.50ms]
(pass) daemon bridge links > attach without a key is rejected [7.44ms]
(pass) daemon bridge links > server close detaches every bridge [35.54ms]

packages/orch/test/launch-stamp.test.ts:
(pass) canonical launch stamp > claude and codex launches produce the same status shape [0.17ms]

packages/orch/test/self-actor-identity.test.ts:
(pass) a driving session's write-actor is the agent orch registered for it > the session token resolves to the id hello minted, so the actor equals its own lease holder [39.68ms]
(pass) a driving session's write-actor is the agent orch registered for it > a token orch has never seen resolves to nothing rather than a fabricated id [23.21ms]
(pass) a driving session's write-actor is the agent orch registered for it > one session keeps ONE id across calls, whatever pid the shell reports [39.03ms]

packages/orch/test/daemon-transport-parity.test.ts:
(pass) both transports carry one mechanism > a bound TCP port does not displace the unix socket or become its own service [3.20ms]
(pass) both transports carry one mechanism > the credential is demanded identically on both [4.48ms]
(pass) both transports carry one mechanism > a missing credential is refused identically on both [3.45ms]
(pass) both transports carry one mechanism > the same token registers the same session whichever transport carried it [45.45ms]

packages/orch/test/peer-lease-visibility.test.ts:
(pass) peer summaries carry ownership as a lease > a peer the caller holds reports the caller as the live holder [55.67ms]
(pass) peer summaries carry ownership as a lease > a peer nobody ever took reports no orch driving it [65.02ms]
(pass) peer summaries carry ownership as a lease > a dead holder is not a live one [63.08ms]
(pass) the compact listing separates orphans from live work > unleased peers sit in their own bucket, below the driven ones [62.23ms]
(pass) the compact listing separates orphans from live work > a held peer names its holder, and an unleased one never reads as yours [66.25ms]
(pass) the compact listing separates orphans from live work > with nothing unleased the bucket does not appear at all [68.05ms]

packages/orch/test/remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [21.73ms]
(pass) async remote fan-out > returns a typed dead-host failure [18.73ms]
(pass) async remote fan-out > returns a typed timeout failure [505.57ms]
(pass) async remote fan-out > returns a typed non-JSON failure [19.69ms]
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [505.14ms]

packages/orch/test/reap-picker.test.ts:
(pass) reapCandidates > classifies unleased dead holders and leased dead processes [0.16ms]
(pass) reapCandidates > classifies empty input [0.02ms]
(pass) cmdReap > prints the --dead --json result shape [46.36ms]
(pass) cmdReap > refuses bare reap when stdin is not a TTY [0.27ms]

packages/orch/test/adapter-roles.test.ts:
(pass) adapter role composition > composes complete roles per adapter [0.10ms]
(pass) adapter role composition > answers with zero exit code when a shim role is absent [0.04ms]

packages/orch/test/commands-logging.test.ts:
(pass) orch logs > --dispatch selects one dispatch across both sinks, oldest first [1.17ms]
(pass) orch logs > --agent selects one agent's records [0.53ms]
(pass) orch logs > --level selects one severity [0.37ms]
(pass) orch logs > --since drops everything older than the instant given [0.42ms]
(pass) orch logs > --since 0 keeps every record instead of being read as a missing value [0.43ms]
(pass) orch logs > renders a readable line: instant, level, event, correlation, agent, fields [0.34ms]
(pass) orch logs > --json emits the records themselves [0.43ms]
(pass) command logging > notify test records the diagnosis and keeps user output on stdout [0.76ms]

packages/orch/test/offline-is-not-a-second-source.test.ts:
(pass) --offline is a narrower view of ONE source, not a second one (M8) > offline and online read the same agents from the same presence files [50.64ms]
(pass) --offline is a narrower view of ONE source, not a second one (M8) > offline reports the SAME state the agent reported, never a second opinion [45.26ms]
(pass) --offline is a narrower view of ONE source, not a second one (M8) > there is exactly ONE row builder, and --offline only narrows what it asks [0.35ms]
(pass) --offline is a narrower view of ONE source, not a second one (M8) > offline is the one path that never dials or starts the daemon [0.25ms]

packages/orch/test/one-writer-records-a-spawned-agent.test.ts:
(pass) one writer records a spawned agent (2.1) > registerSpawnedAgent alone writes the COMPLETE record — space and lease included [60.29ms]
(pass) one writer records a spawned agent (2.1) > a spawn leaves NOTHING for a second writer to fill in [53.98ms]
(pass) one writer records a spawned agent (2.1) > a spawn into NO space records no space and hands the plexer only its coordinate [51.60ms]
(pass) one writer records a spawned agent (2.1) > the presence store no longer offers a second way to record an agent [0.18ms]

packages/orch/test/spawn-registry.test.ts:
(pass) spawn agent registration > writes the hub, environment, tuning, and lease [52.31ms]
(pass) spawn agent registration > an agent that states no plexer and no handle gets neither row [47.36ms]
(pass) spawn agent registration > worktree row is present only for a worktree launch [61.62ms]
(pass) spawn agent registration > an unknown or absent spawner produces a root pack of one and no lease [47.34ms]

packages/orch/test/settings-repair.test.ts:
(pass) settings repair choices > offers rename, set, drop, then leave when all repairs apply [0.09ms]
(pass) settings repair choices > offers only rename when there is only a suggestion [0.03ms]
(pass) settings repair choices > offers only set when there is only an expected value [0.02ms]
(pass) settings repair choices > always offers leave, and cannot drop a file-level defect [0.01ms]
(pass) settings repair reducer > starts every defect at leave and focus at zero [0.05ms]
(pass) settings repair reducer > refuses choices the focused defect does not offer and reports why [0.13ms]
(pass) settings repair reducer > clamps focus at both ends and clears a prior reason [0.06ms]
(pass) settings repair reducer > maps non-leave choices to repairs in defect order [0.14ms]
(pass) settings repair reducer > leave produces no repair [0.04ms]
(pass) settings repair reducer > empty defects make every action a no-op [0.06ms]

packages/orch/test/backend-headless.test.ts:
(pass) HeadlessBackend > refuses to spawn with no prompt — a headless agent runs its prompt and exits [0.76ms]
(pass) HeadlessBackend > spawns a detached process and records its handle [48.43ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [56.52ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [18.60ms]
(pass) HeadlessBackend > signals a matching recorded process through the injected killer [0.22ms]
(pass) HeadlessBackend > refuses to signal a pid whose process instance was replaced [0.11ms]
(pass) HeadlessBackend > never signals a dead pid [0.08ms]

packages/orch/test/commands-spawn.test.ts:
(pass) commands/spawn > refuses an invalid name before resolving or creating a workspace [1.20ms]
(pass) commands/spawn > refuses spawn without a name before any spawn mutations [30.18ms]
(pass) commands/spawn > rejects removed spawn cap flag as unknown [0.11ms]
(pass) commands/spawn > rejects --detached as an unknown spawn flag [0.87ms]
(pass) commands/spawn > the positionals are the agent names [0.12ms]
(pass) commands/spawn > collects repeated prompts in agent order [0.03ms]
(pass) commands/spawn > each pi flavor launches its own binary and preserves raw prompt [0.12ms]

packages/orch/test/queue-reaping.test.ts:
(pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > a failed task whose scope is gone is unrunnable and survives every retention sweep [55.71ms]
(pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > unrunnable is about who is alive now — a new pack member makes it claimable again [49.94ms]
(pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > stale is surfaced beside its state and never deleted on age [43.65ms]
(pass) Cq12: an orphaned task has take-on, leave and reap, all deliberate > take-on re-scopes to the taker's own pack and the work becomes claimable there [42.81ms]
(pass) Cq12: an orphaned task has take-on, leave and reap, all deliberate > take-on refuses a taker that is not itself live [47.74ms]

packages/orch/test/broker-governance.test.ts:
(pass) daemon governWrite enforcement > an unscoped actor is refused while a live orch holds the lease [43.00ms]
(pass) daemon governWrite enforcement > an unscoped actor may write to an unleased target [34.32ms]
(pass) daemon governWrite enforcement > the lease holder may write to its own agent [43.81ms]
(pass) daemon governWrite enforcement > a foreign live holder in the same space is refused and named [41.10ms]
(pass) daemon governWrite enforcement > a dead holder is not a collision [41.18ms]
(pass) daemon governWrite enforcement > --steal on a driving verb does not take a live holder's lease [45.72ms]
(pass) daemon governWrite enforcement > a cross-space write is refused by the wall before the lease [55.69ms]
(pass) daemon governWrite enforcement > --cross-space clears the wall but the lease still applies [52.71ms]
(pass) daemon governWrite enforcement > the space operator writes to a same-space leased agent without taking the lease [51.07ms]
(pass) daemon governWrite enforcement > a foreign space's operator still hits the wall [59.97ms]
(pass) daemon governWrite enforcement > a refused enqueue leaves the lease exactly as it was [48.66ms]
(pass) daemon governWrite enforcement > a granted write and its enqueue commit together [41.99ms]
(pass) daemon governWrite enforcement > an unleased target is writable by any same-space actor [42.76ms]

packages/orch/test/unleased-agents.test.ts:
(pass) registration unleased agent hint > includes unleased workers but never session identities [43.38ms]

packages/orch/test/ambiguous-target-says-what-to-do.test.ts:
(pass) an ambiguous target names the failure and the way out (U3) > the message names the failure, the target string, and every candidate [0.09ms]
(pass) an ambiguous target names the failure and the way out (U3) > it says what to send instead, so the caller is not left guessing [0.06ms]
(pass) an ambiguous target names the failure and the way out (U3) > it is a refusal, not an exit — the caller can act on it [0.03ms]
(pass) an ambiguous target names the failure and the way out (U3) > resolveAgentView raises that same one message [0.22ms]

packages/orch/test/bridge-links.test.ts:
(pass) bridge links > attach holds the link under the canonical key and push reaches it [40.62ms]
(pass) bridge links > a second attach for the same key replaces the first [38.26ms]
(pass) bridge links > detach removes only the link still held [44.77ms]
(pass) bridge links > push with no link throws BridgeDetachedError [36.84ms]
(pass) bridge links > an unknown target is refused before the registry is consulted [0.37ms]
(pass) bridge message guards > accept every action shape [0.31ms]
(pass) bridge message guards > refuse a missing field, an unknown action, and a non-record [0.18ms]
(pass) bridge message guards > a delivery is an id plus a message [0.14ms]

packages/orch/test/space-walls.test.ts:
(pass) space helpers > reads space ids from the environment satellite, never from the key [0.70ms]
(pass) space helpers > an agent that moves space keeps its identity and reports the new space [5.49ms]
(pass) space helpers > derives an entity space from the store [0.68ms]
(pass) space helpers > returns the same entities when all spaces are requested [0.26ms]
(pass) space wall writes > allows a write within the same space [0.50ms]
(pass) space wall writes > denies a cross-space write with both spaces in the reason [0.56ms]
(pass) space wall writes > applies the same wall rule whatever plexer the agents sit in [2.62ms]
(pass) space wall writes > allows a cross-space write with an explicit override [0.42ms]
(pass) space wall writes > allows unplaced targets [0.27ms]

packages/orch/test/one-query-stack-over-the-connection.test.ts:
(pass) one query stack over the connection (2.3) > the store exposes no raw-SQL port beside the typed one [0.04ms]
(pass) one query stack over the connection (2.3) > nothing in the repo prepares a statement through the deleted port [12.54ms]

packages/orch/test/presence-dirs-are-reaped-not-migrated.test.ts:
(pass) a presence dir in the old shape is reaped, never migrated (J4) > a composite-named dir is not presence, whatever its file claims [43.93ms]
(pass) a presence dir in the old shape is reaped, never migrated (J4) > the sweep REMOVES it rather than leaving it for a migration that never comes [48.27ms]
(pass) a presence dir in the old shape is reaped, never migrated (J4) > nothing renames, rewrites or re-keys the old directory [0.43ms]
(pass) a presence dir in the old shape is reaped, never migrated (J4) > a dead dir in the CURRENT shape is still reaped the ordinary way [28.34ms]

packages/orch/test/store-catalogue.test.ts:
(pass) catalogue rows > empty store reads an empty Map [29.04ms]
(pass) catalogue rows > write then read round-trips at and stdout [29.87ms]
(pass) catalogue rows > writing the same command twice keeps one row with newer values [32.89ms]
(pass) catalogue rows > an entry with empty stdout is not stored [26.56ms]
(pass) catalogue rows > clearCatalogues empties the store [31.37ms]
(pass) catalogue rows > two commands coexist and updating one does not touch the other [32.66ms]

packages/orch/test/events-open-with-pending-questions.test.ts:
(pass) events pending-question snapshot > a late watcher receives every open question through the event writer [52.99ms]

packages/orch/test/spawn-limits.test.ts:
(pass) spawn limits > schema loads global and workspace caps [1.05ms]
(pass) spawn limits > rejects invalid cap %s with file and key [0.93ms]
(pass) spawn limits > rejects invalid cap %s with file and key [0.29ms]
(pass) spawn limits > rejects invalid cap %s with file and key [0.30ms]
(pass) spawn limits > omitted fleet caps normalize to defaults [0.27ms]
(pass) spawn limits > global boundary refusal data counts the whole request [1.18ms]
(pass) spawn limits > one workspace may use the full global allotment [0.60ms]
(pass) spawn limits > workspace cap is independent of global headroom [0.57ms]
(pass) spawn limits > uncapped space is bounded only by global count [0.56ms]
(pass) spawn limits > foreign pack members do not consume the caller's pack cap [1.10ms]
(pass) spawn limits > an agent whose recorded process is gone frees capacity [3.21ms]
(pass) spawn limits > foreign panes never count [0.72ms]
(pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [0.61ms]
(pass) spawn limits > doctor accepts satisfiable limits [0.34ms]

packages/orch/test/store-values.test.ts:
(pass) store row values > uses null for optional database values without JSON text [0.02ms]
(pass) store row values > sets only non-null fields [0.03ms]

packages/orch/test/agent-model-unwelded.test.ts:
(pass) A1 — the four facts are never welded > no table welds identity, provenance, ownership and environment into one row [0.31ms]
(pass) A1 — the four facts are never welded > ownership is a lease table, not a second id space [0.22ms]
(pass) A1 — the four facts are never welded > the agents hub carries identity and provenance only [0.13ms]
(pass) A1 — the four facts are never welded > no table anywhere carries a lifetime [3.83ms]

packages/orch/test/orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [79.66ms]

packages/orch/test/status-headless.test.ts:
(pass) headless status visibility > drops an exited agent that finished, however much it recorded [0.20ms]
(pass) headless status visibility > --filter removes the states it names; --agent brings one dead agent back [0.09ms]
(pass) headless status visibility > --filter drops live rows in the states it names [0.06ms]
(pass) headless status visibility > drops a dead row with no result or terminal state [0.03ms]
(pass) headless status visibility > keeps a live row [0.02ms]
(pass) headless status visibility > --space-wide widens the scope without resurrecting empty dead rows [0.03ms]
(pass) headless status visibility > uses agent language without backend details when no backend was asked [0.06ms]

packages/orch/test/seat-index.test.ts:
(pass) seat pure seams > errorMessage preserves non-Error thrown values [0.06ms]
(pass) seat pure seams > hasTheme discriminates missing and valid themes [0.44ms]
(pass) seat pure seams > countStates groups active, blocked, failed, and settled states [0.20ms]
(pass) seat pure seams > formatSeatStatus renders state counts and view hint [0.20ms]
(pass) seat pure seams > reconcileDashboardSelection preserves id and guards missing snapshots [0.34ms]

packages/orch/test/queue-cli-scope.test.ts:
(pass) Cq2: all three scopes are choosable at enqueue > --agent, --pack and --space each select exactly one typed scope [50.68ms]
(pass) Cq2: all three scopes are choosable at enqueue > a name resolves to one id, and an ambiguous name asks for the id [42.25ms]
(pass) Cq2: all three scopes are choosable at enqueue > two scope flags at once are refused [40.00ms]
(pass) Cq9: reading the queue is open > listing and history carry no caller and hide no other pack's work [47.31ms]

packages/orch/test/orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [3.82ms]
(pass) orchd RPC transports > round-trips over the TCP fallback transport [5.06ms]

packages/orch/test/settings-repair-roundtrip.test.ts:
(pass) repairing a settings.json the schema rejects > reports every rejected key without touching the file [2.00ms]
(pass) repairing a settings.json the schema rejects > a removed key is never guessed at - it offers no rename [0.96ms]
(pass) repairing a settings.json the schema rejects > the choices a person makes leave the file loadable [2.09ms]
(pass) repairing a settings.json the schema rejects > a typo keeps its value: renaming carries it to the real key [1.24ms]
(pass) repairing a settings.json the schema rejects > leaving every defect alone writes nothing at all [1.21ms]

packages/orch/test/pi-model-control.test.ts:
(pass) splitThinkingSuffix > splits a valid ladder effort off the bare id [0.04ms]
(pass) splitThinkingSuffix > leaves a bare model untouched [0.02ms]
(pass) splitThinkingSuffix > keeps a trailing colon token that is not a thinking level as part of the id [0.02ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > looks up the BARE id and returns the effort suffix separately [0.22ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > retries until a still-booting registry answers [2.83ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > throws when the registry never yields the model [0.26ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > rejects a token without a provider/id shape [0.10ms]
(pass) createModelControl.applyControlCommand > applies a suffixed model command and records a success outcome [0.41ms]
(pass) createModelControl.applyControlCommand > records a failure outcome when the model is rejected [1754.53ms]

packages/orch/test/doctor-backends.test.ts:
(pass) doctor backend and presence checks > reports every registered backend and composed roles [1.61ms]
(pass) doctor backend and presence checks > passes with herdr active while an enabled tmux sits outside a session [0.26ms]
(pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.16ms]
(pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [0.14ms]
(pass) doctor backend and presence checks > fails when any enabled backend is unavailable, active or not [0.11ms]
(pass) doctor backend and presence checks > honours the configured default over the probe order [0.12ms]
(pass) doctor backend and presence checks > reports only records missing the current schema stamp [32.72ms]

packages/orch/test/os-side.test.ts:
(pass) osSide > supports both platform branches independent of ambient host [0.03ms]

packages/orch/test/commands-events.test.ts:
(pass) commands/events > owned renderers and tool help do not expose the retired workspace term [0.35ms]
(pass) commands/events > bare events is scoped to this session's agents and renders readable lines [0.06ms]
(pass) commands/events > parses the scope flags [0.04ms]
(pass) commands/events > parses the wake-up flags [0.04ms]
(pass) commands/events > --filter names the states to drop and is never the default [0.09ms]
(pass) commands/events > includes an adopted agent whose open lease is mine [0.04ms]
(pass) commands/events > includes a reused pane leased by me even when another session spawned it [0.02ms]
(pass) commands/events > includes an unleased agent spawned by this session [0.02ms]
(pass) commands/events > excludes an agent spawned by a different session [0.01ms]
(pass) commands/events > --space-wide passes agents from both sessions [0.04ms]
(pass) commands/events > excludes an agent while another orch holds its lease [0.02ms]
(pass) commands/events > describes durable replay and reports pruned history gaps [0.05ms]
(pass) commands/events > names one agent by name or by identity key [0.03ms]
(pass) commands/events > a subscription with no daemon keeps redialing instead of exiting [0.14ms]
(pass) commands/events > renders opaque plexer coordinates without relabeling them as spaces [0.24ms]
(pass) commands/events > message events render the full delivered mail text [0.08ms]
(pass) commands/events > an event line says what happened, never the fleet's books [0.06ms]
(pass) commands/events > rejects malformed event and labels sinks [0.09ms]
(pass) commands/events space wall > an agent is heard only inside the space it currently occupies [51.49ms]
(pass) commands/events space wall > moving an agent moves its events with it [54.18ms]
(pass) commands/events space wall > an unplaced caller has no wall and hears the machine [51.81ms]
(pass) commands/events space wall > a key naming no registered agent is in no space [0.25ms]

packages/orch/test/close-reports-every-target.test.ts:
(pass) close reports an outcome for every target it was given (U2) > --json carries a per-target outcome, not just the successes [94.20ms]
(pass) close reports an outcome for every target it was given (U2) > a failed target reports outcome error WITH the real error text [50.49ms]
(pass) close reports an outcome for every target it was given (U2) > a pane the plexer no longer has is CLOSED, not failed [54.88ms]
(pass) close reports an outcome for every target it was given (U2) > the exit code still reflects whether every target closed [55.48ms]

packages/orch/test/commands-space.test.ts:
(pass) orch space — orch's own grouping > a space is created, listed, renamed and deleted with no space-home role [36.44ms]
(pass) orch space — orch's own grouping > create refuses a name already in use [30.89ms]
(pass) orch space — orch's own grouping > delete refuses a space that still holds agents [40.21ms]
(pass) orch space — the plexer's home > create makes a home and records only its coordinate [34.27ms]
(pass) orch space — the plexer's home > list reports that a space has a home without naming the coordinate [36.40ms]
(pass) orch space — the plexer's home > rename renames orch's space and its home [34.10ms]
(pass) orch space — the plexer's home > delete closes the home and drops its coordinate [43.74ms]
(pass) orch space — the plexer's home > focus focuses the recorded coordinate [31.79ms]
(pass) orch space — the plexer's home > a home made in another plexer is not this environment's to focus [39.93ms]
(pass) orch space — absence is an answer > focus with no space-home role names the space and what is missing [33.37ms]
(pass) orch space — absence is an answer > the plain-text answer names the space too [30.55ms]
(pass) orch space — vocabulary and wiring > cmdSpace lists through the resolved environment [24.90ms]
(pass) orch space — vocabulary and wiring > orch ws is gone [0.07ms]
(pass) orch space — vocabulary and wiring > space help never says workspace and offers create/rename/delete [0.05ms]
(pass) orch space — vocabulary and wiring > no space output ever says workspace [31.23ms]

packages/orch/test/settings-manager.test.ts:
(pass) settings manager > currentOrNull returns null and current reports an absent file [0.20ms]
(pass) settings manager > parses valid fixture text [0.37ms]
(pass) settings manager > holds one parsed object until reload [0.14ms]
(pass) settings manager > does not cache malformed text as a value [0.15ms]
(pass) settings manager > reloads file settings after the file changes [0.48ms]
(pass) settings manager > reports a legacy config.toml [0.26ms]

packages/orch/test/lifecycle-reports-a-partial-run.test.ts:
(pass) a partial reload or restart is reported, not exited > reload --json writes the whole payload and sets exitCode, never exits [35.77ms]
(pass) a partial reload or restart is reported, not exited > restart --json writes the whole payload and sets exitCode, never exits [32.00ms]

packages/orch/test/store-interval-rows.test.ts:
(pass) interval satellites > only one open interval is allowed [48.18ms]
(pass) interval satellites > half-open adjacency is legal [44.78ms]
(pass) interval satellites > clearSpace closes without opening [46.03ms]
(pass) interval satellites > agent plexer is immutable one-shot [40.03ms]
(pass) interval satellites > process restart history closes at the successor since [40.02ms]
(pass) interval satellites > process rows carry host and process identity [45.78ms]
(pass) interval satellites > process start_token round-trips [42.40ms]
(pass) interval satellites > space move history closes at the successor since [47.44ms]
(pass) interval satellites > tuning change history closes at the successor since [39.56ms]
(pass) interval satellites > handle history preserves each renumbered handle [45.71ms]
(pass) interval satellites > interval instants are stored as INTEGER values [59.63ms]
(pass) interval satellites > process wrapper rolls back predecessor close when successor fails [41.38ms]
(pass) interval satellites > space wrapper rolls back predecessor close when successor fails [39.00ms]
(pass) interval satellites > tuning carries model and nullable thinking [42.53ms]

packages/orch/test/commands-control.test.ts:
(pass) commands/control > parses dispatch flags without losing prompt words [5.57ms]
(pass) commands/control > parses --then destination and note [0.22ms]
(pass) commands/control > adds worker header unless raw [0.10ms]

packages/orch/test/outbox-ack.test.ts:
(pass) socket outbox acknowledgements > an ack settles an awaiting row and later delivery skips it [47.67ms]
(pass) socket outbox acknowledgements > a detached bridge retries a pending row and logs the reason [36.52ms]
(pass) socket outbox acknowledgements > a gone agent settles its row as undeliverable on the first attempt [32.25ms]
(pass) socket outbox acknowledgements > failed delivery at the cap settles, while one attempt earlier retries [45.46ms]
(pass) socket outbox acknowledgements > redelivery covers every open row for one target, regardless of nextAttemptAt [47.08ms]
(pass) socket outbox acknowledgements > open-row selection excludes settled rows [37.95ms]
(pass) socket outbox acknowledgements > malformed stored payloads are rejected [36.44ms]

packages/orch/test/claim-agent.test.ts:
(pass) claim agent > unclaimed + A → stamped [36.27ms]
(pass) claim agent > claimed A, claim A → unchanged [40.39ms]
(pass) claim agent > claimed A, reclaimAgent(id) then B → stamped with B [37.24ms]
(pass) claim agent > claimed A, plain claim B → refused claimed-by-other, row unchanged [38.43ms]
(pass) claim agent > unknown id → refused unknown-agent [29.43ms]

packages/orch/test/dispatch-prompt-file.test.ts:
(pass) a dispatch prompt can come from a file instead of argv > --file is parsed off the positionals [0.09ms]
(pass) a dispatch prompt can come from a file instead of argv > the file body is the prompt, apostrophes and newlines intact [0.82ms]
(pass) a dispatch prompt can come from a file instead of argv > without --file the positionals after the target are the prompt [0.07ms]
(pass) a dispatch prompt can come from a file instead of argv > a typed prompt and --file together is a refusal, never a silent winner [1.46ms]
(pass) a dispatch prompt can come from a file instead of argv > an empty file is refused: a dispatch with no prompt is not a dispatch [0.71ms]
(pass) a dispatch prompt can come from a file instead of argv > a missing file names itself in the refusal [0.20ms]
(pass) --with points the agent at context it opens on demand > --with is repeatable and parsed off the positionals [0.08ms]
(pass) --with points the agent at context it opens on demand > a file reference is absolute and typed as a file [0.31ms]
(pass) --with points the agent at context it opens on demand > a directory reference is typed as a directory [0.19ms]
(pass) --with points the agent at context it opens on demand > a missing path dies at dispatch, naming the flag [0.10ms]
(pass) --with points the agent at context it opens on demand > the task tells the agent where to look and to open paths only when needed; content is never inlined [0.06ms]
(pass) --with points the agent at context it opens on demand > no references leaves the instructions untouched [0.02ms]

packages/orch/test/daemon-decision-trail.test.ts:
(pass) daemon decision trail > records a lease refused against a live holder [48.32ms]
(pass) daemon decision trail > records a lease granted over a dead holder [41.84ms]
(pass) daemon decision trail > records a not-placed boundary answer with its reason [37.86ms]

packages/orch/test/commands-daemon.test.ts:
(pass) commands/daemon > parses governance and validates daemon status [0.75ms]
(pass) commands/daemon > reads a lock pid only from a complete lock record [0.40ms]

packages/orch/test/every-agent-has-a-link.test.ts:
(pass) every agent has an attached link > agents in placed, headless, and handleless environments receive the same push [79.20ms]
(pass) every agent has an attached link > an agent with no handle is still addressable through its link [49.86ms]

packages/orch/test/daemon-repins-on-settings-change.test.ts:
(pass) daemon settings tuning re-pin > pins every live agent to the resolved settings default [1.44ms]
(pass) daemon settings tuning re-pin > does not pin when tuning settings did not change [0.54ms]
(pass) daemon settings tuning re-pin > continues re-pinning after one agent fails [0.60ms]

packages/orch/test/no-stderr-writes.test.ts:
(pass) orch has one diagnosis channel (the logger) and one output channel (stdout) > no runtime source writes to process.stderr [5.86ms]
(pass) orch has one diagnosis channel (the logger) and one output channel (stdout) > the scan actually covers the tree it claims to [0.48ms]

packages/orch/test/errno-guard.test.ts:
(pass) errnoCode reads a syscall error code, and only a real one > returns the code of a real node syscall error [0.06ms]
(pass) errnoCode reads a syscall error code, and only a real one > a plain Error carries no code, so there is none to report [0.03ms]
(pass) errnoCode reads a syscall error code, and only a real one > a non-object never yields a code instead of crashing on it [0.06ms]
(pass) errnoCode reads a syscall error code, and only a real one > a code-shaped field of the wrong type is not a code [0.03ms]
(pass) isAgentState verifies the state rather than asserting it > accepts a declared state [0.04ms]
(pass) isAgentState verifies the state rather than asserting it > rejects anything not declared, including non-strings [0.06ms]

packages/orch/test/command-space-fields.test.ts:
(pass) command space fields > status and wall entities use the composed space, and it is nowhere in the key [50.64ms]
(pass) command space fields > skipBackends keeps the authoritative presence entity shape [43.74ms]
(pass) command space fields > status reports a mixed pi and Claude fleet with the same identity fields [54.49ms]

packages/orch/test/bridge-apply.test.ts:
(pass) presence bridge delivery > applies dispatch before ack, dedupes redelivery, and detaches [1.06ms]
(pass) presence bridge delivery > applies model deliveries through model control [11.56ms]
(pass) presence bridge delivery > resolves matching answers and drops answers for other questions [1.13ms]

packages/orch/test/store-connection-guards.test.ts:
(pass) store migration guards > a store predating the migrations is refused, not rebuilt over [34.03ms]
(pass) store migration guards > names live presence as the thing to close before rebuilding [53.06ms]
(pass) a slave never reaps or recreates the store > a spawned agent hitting a schema-mismatched store errors and mutates nothing [48.36ms]
(pass) a slave never reaps or recreates the store > a recreate is refused while a live presence dir exists, for the user too [47.42ms]
(pass) a slave never reaps or recreates the store > the user may recreate once nothing is live [49.12ms]
(pass) a slave never reaps or recreates the store > a spawned agent is refused a recreate even with nothing live [44.77ms]

packages/orch/test/retention.test.ts:
(pass) retention sweep > retention windows are independently configurable [30.05ms]
(pass) retention sweep > uses each table's own window and keeps queued and claimed tasks [101.40ms]
(pass) retention sweep > returns zero counts when every row is inside its window [45.46ms]
(pass) retention sweep > continues sweeping when one table delete fails [40.35ms]
(pass) retention sweep > reaps expired agents by identity, taking every satellite with them [51.12ms]
(pass) retention sweep > reaps dead dirs by recorded instants, not a fresh directory mtime [43.36ms]
(pass) retention sweep > keeps dead dirs with a newer recorded instant despite an old mtime [26.95ms]
(pass) retention sweep > reaps malformed dead dirs with no recorded instant [28.97ms]
(pass) retention sweep > keeps result-only recorded instant despite an old mtime [31.32ms]
(pass) retention sweep > never reaps a live presence dir regardless of age [41.91ms]
(pass) retention sweep > sweeps old logs but preserves logs for live agents [53.48ms]
(pass) retention sweep > does not sweep again one minute after the first tick [34.97ms]
(pass) retention sweep > prunes orch's own logs past the age cap [24.45ms]
(pass) retention sweep > prunes orch's own logs past the size cap even when freshly written [34.35ms]

packages/orch/test/commands-status.test.ts:
(pass) commands/status > zero-row message reports gathered counts and backend response [0.03ms]
(pass) commands/status > dead rows never display stale live state [0.03ms]
(pass) commands/status > shared row boundary normalizes stale state for every renderer [0.05ms]
(pass) commands/status > a human at a terminal has no identity to narrow by and no space to be held inside [0.07ms]
(pass) commands/status > --agent narrows to one row by id, key, or name, exited or not [0.11ms]
(pass) commands/status > an agent sees what it spawned, and never past its own space > the default is the agents this caller spawned [0.06ms]
(pass) commands/status > an agent sees what it spawned, and never past its own space > --space-wide widens to the caller's space, which is the wall [0.05ms]
(pass) commands/status > an agent sees what it spawned, and never past its own space > a human widening sees every space, including the one the agent could not [0.05ms]
(pass) commands/status > derives status row fields from seeded presence [6.31ms]
(pass) commands/status > marks dead presence as exited [5.78ms]
(pass) commands/status > asking presence is surfaced as a question while still reporting live state [5.18ms]
(pass) commands/status > shared status row carries presence-derived fields [5.76ms]
(pass) commands/status > row carries the owning backend's declared capabilities [14.15ms]
(pass) commands/status > an agent whose backend orch cannot name reports no capabilities [3.53ms]
(pass) commands/status > status owner ignores spawning provenance when no lease exists [9.08ms]
(pass) commands/status > lease-backed status attribution distinguishes my lease, another lease, and unleased rows [59.68ms]
(pass) commands/status > default table separates minted identity from pane environment [0.45ms]
(pass) commands/status > human table shows harness and working directory facts [0.27ms]
(pass) commands/status > json branch and local table branch derive identical rows apart from host [10.20ms]
(pass) commands/status > capacity footer uses configured caps and shows one pack per root [0.42ms]
(pass) commands/status > formats workspace labels and warnings [0.14ms]

packages/orch/test/one-shape-only.test.ts:
(pass) one current shape only > a live presence record with a malformed identity is a doctor failure [0.60ms]
(pass) one current shape only > doctor backend reports have one detection spelling [0.30ms]

packages/orch/test/work-loop-binding.test.ts:
(pass) work loop attempt binding > statusSpeaksForTask verifies the current attempt dispatch id [0.09ms]
(pass) Cq4: results go to the enqueuer, not the runner > every task event the work loop publishes is keyed to whoever enqueued it [54.96ms]

packages/orch/test/settings-watch.test.ts:
(pass) watchSettings > loads initially and applies a valid edit after the debounce [22.14ms]
(pass) watchSettings > keeps the last-good settings, warns once, and recovers [394.42ms]
(pass) watchSettings > reloads on a touched reload.signal without a settings edit [22.71ms]
(pass) watchSettings > stop prevents further callbacks [406.42ms]

packages/orch/test/vocabulary.test.ts:
(pass) vocabulary is a display map, and a role is tree position > a role is derived from the tree, never stored [44.65ms]
(pass) vocabulary is a display map, and a role is tree position > no table carries a role column: there is nothing to disagree with the tree [26.40ms]
(pass) vocabulary is a display map, and a role is tree position > renaming an agent or moving its lease never changes its role [49.73ms]
(pass) vocabulary is a display map, and a role is tree position > every role term orch displays comes from the one map [0.10ms]
(pass) vocabulary is a display map, and a role is tree position > no module outside the map spells a role term into a user-facing string [12.10ms]

packages/orch/test/backend-space-home.test.ts:
(pass) tmux space home > focus switches the client to the session holding the space [0.17ms]
(pass) tmux space home > create names the session after the space and returns its root window and pane [0.24ms]
(pass) tmux space home > rename and close address the session coordinate [0.09ms]
(pass) tmux space home > list reports every session as a coordinate with a label [0.10ms]
(pass) a home orch opens is never unmarked (E8) > an unlabelled pack home is named for the pack it was opened for [0.12ms]
(pass) a home orch opens is never unmarked (E8) > an unlabelled space home is named for the space, not for the pack [0.06ms]
(pass) a home orch opens is never unmarked (E8) > a subject id the plexer would refuse is made safe, never passed through [0.04ms]
(pass) a home orch opens is never unmarked (E8) > a caller-supplied label is used verbatim [0.05ms]

packages/orch/test/queue-scope.test.ts:
(pass) queue scope invariants > a failed pack task retries on another pack member, while an agent task stays pinned [54.12ms]
(pass) queue scope invariants > cancel is allowed for the enqueuer or a lease holder of a targeted agent [49.79ms]
(pass) queue scope invariants > cancel refuses a caller who is neither enqueuer nor targeted lease holder [40.77ms]
(pass) queue scope invariants > edit is allowed only for the enqueuer while queued [47.99ms]
(pass) queue scope invariants > an orphan has exactly take-on, leave, and reap resolutions [57.13ms]
(pass) queue scope invariants > stale queued work is surfaced distinctly and never deleted by age [40.63ms]
(pass) queue scope invariants > two concurrent claims have one winner and one one_open_attempt violation [49.75ms]

packages/orch/test/settings-repair-screen.test.ts:
(pass) repair action labels > names the key a rename lands on, so the destination is never a guess [0.05ms]
(pass) repair action labels > names the value a set writes [0.03ms]
(pass) repair action labels > drop and leave say only what they do [0.02ms]
(pass) repair frame > shows every defect with the value the person wrote [7.43ms]
(pass) repair frame > promises that nothing changes before a save, because nothing does [0.09ms]
(pass) repair frame > every defect starts at leave, so opening the screen destroys nothing [0.07ms]
(pass) repair frame > a chosen repair is shown as what it will do [0.05ms]
(pass) repair frame > the focused row's offered keys are shown, so no choice has to be guessed [0.07ms]
(pass) repair frame > the count reads as English for one defect and for many [0.07ms]
(pass) repair frame > no row runs past the terminal width, tag included [0.11ms]
(pass) repair frame > the file being repaired is named in the header [0.04ms]

packages/orch/test/store-agent-rows.test.ts:
(pass) agent store rows > insertAgent writes both NULL; agentById reads both back [42.41ms]
(pass) agent store rows > insertAgent materializes the provenance root [40.37ms]
(pass) agent store rows > endAgent records who closed it, nullable for death [40.09ms]
(pass) agent store rows > liveAgents excludes agents with an ending [45.43ms]
(pass) agent store rows > packMembers selects the materialized root [39.71ms]
(pass) agent store rows > unknown harness is rejected by the foreign key [23.89ms]
(pass) agent store rows > unknown spawnedBy is rejected by the foreign key [22.84ms]
(pass) agent store rows > label maps both null and a value [39.59ms]
(pass) agent store rows > created_at is an INTEGER epoch millisecond [40.95ms]
(pass) agent store rows > worktreeOf distinguishes repo agents from worktree agents [39.21ms]
(pass) agent store rows > renameAgent is id-keyed and leaves identity history unchanged [39.32ms]
(pass) agent store rows > lookup ensure operations are insert-or-ignore [31.36ms]
(pass) agent store rows > childrenOf returns direct descendants [37.12ms]

packages/orch/test/agent-monitor.test.ts:
(pass) agent fleet monitor > surfaces only agents spawned by this session [1.66ms]
(pass) agent fleet monitor > empty model renders no status line or widget [0.24ms]
(pass) agent fleet monitor > worker process registers no monitor regardless of events [0.21ms]
(pass) agent fleet monitor > does not replay history into a plain pi session [0.16ms]

packages/orch/test/adapter-bundle-diagnosis.test.ts:
(pass) adapter bundle installation > reports a missing shipped bundle as a structured diagnosis [0.46ms]
pi extensions:
(pass) adapter bundle installation > diagnoses a missing shipped bundle without writing [0.42ms]

packages/orch/test/close-authority.test.ts:
(pass) who may end an agent (D7) > the human may close anything [44.15ms]
(pass) who may end an agent (D7) > an orch may close the slaves it owns, at any depth [38.51ms]
(pass) who may end an agent (D7) > an agent may NOT close another orch's slaves, and is told whose it is [37.46ms]
(pass) who may end an agent (D7) > an agent may not close a peer orch either [37.58ms]
(pass) who may end an agent (D7) > an agent may always close itself — acting on yourself is not driving a fleet [38.19ms]
(pass) who may end an agent (D7) > adopting grants the right to end, and the spawner keeps it [37.71ms]
(pass) who may end an agent (D7) > a provenance cycle terminates instead of hanging [37.80ms]

packages/orch/test/commands-models.test.ts:
(pass) orch models lists the whole catalogue > shows every offered model, quicklisted or not, allowed or not [0.32ms]
(pass) orch models lists the whole catalogue > marks the launch default (thinking suffix removed) and the quicklist members [0.09ms]
(pass) orch models lists the whole catalogue > keeps harness sections in configured order [0.05ms]
(pass) orch models lists the whole catalogue > a harness that enumerates nothing gets an empty section, not another's models [0.10ms]
(pass) orch models filters > --preferred narrows to the quicklist and renumbers what is shown [0.05ms]
(pass) orch models filters > --search matches spec and label case-insensitively [0.07ms]
(pass) orch models filters > filters combine, and no match is an empty result rather than the full list [0.03ms]
(pass) orch models --pick prints one spec > a numeric pick reads the displayed index of a single harness [0.09ms]
(pass) orch models --pick prints one spec > an exact spec pick resolves after filtering [0.05ms]
(pass) orch models --pick prints one spec > ambiguous, missing, zero, and out-of-range picks fail [0.38ms]
(pass) orch models --json > emits the pinned harness/model shape [0.09ms]

packages/orch/test/settings-registry.test.ts:
(pass) settings registry > declares every schema setting exactly once [0.59ms]
(pass) settings registry > every registry read resolves against loaded settings [1.50ms]
(pass) settings registry > fleet help explains what each limit counts [0.12ms]
(pass) settings registry > fleet.max_depth round-trips through the full-tree writer [1.10ms]
(pass) settings registry > fleet.max_depth rejects zero through the registered writer [0.82ms]
(pass) settings registry > fleet.max_depth writes its value to settings.json [1.00ms]
(pass) settings registry > contains no duplicate keys [0.14ms]

packages/orch/test/backend-herdr-predicates.test.ts:
(pass) herdr environment predicates > neither variable set [0.14ms]
(pass) herdr environment predicates > HERDR_ENV=1 only [0.07ms]
(pass) herdr environment predicates > HERDR_PANE_ID only [0.04ms]
(pass) herdr environment predicates > both variables set [0.01ms]

packages/orch/test/doctor-unscoped-tasks.test.ts:
(pass) doctor task scopes > a facade-enqueued task has exactly one typed scope [32.38ms]
(pass) doctor task scopes > the database rejects an unscoped task instead of keeping a legacy queue row [27.65ms]
(pass) doctor task scopes > doctor lists unrunnable tasks and deliberate resolutions without deleting [32.40ms]

packages/orch/test/commands-results.test.ts:
(pass) commands/results > renders daemon questions with the existing JSON shape [44.54ms]
(pass) commands/results > renders exactly the pending questions returned by the daemon [3.10ms]
(pass) commands/results > surfaces a missing daemon instead of returning an empty list [0.69ms]
(pass) commands/results > formats invalid and recent timestamps [0.17ms]
(pass) commands/results > routes a seeded results.jsonl through the command module [36.13ms]
(pass) commands/results > keeps every settled dispatch and reports the newest [36.88ms]
(pass) commands/results > falls back to adapter session text when results.jsonl is absent [40.15ms]
(pass) commands/results > uses results.jsonl even when the presence status has no agent [40.23ms]
(pass) commands/results > orch tail resolves a non-pi target through that adapter's session view [35.23ms]
(pass) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [37.58ms]
(pass) commands/results > orch tail -n keeps last-N rendered entries for a pi session [38.84ms]
(pass) commands/results > orch session reports the pi entry count [38.82ms]
(pass) commands/results > orch session shows zero entries for an adapter view without them [33.13ms]

packages/orch/test/settings.test.ts:
(pass) loadSettings > refuses to invent settings when settings.json is missing [4.60ms]
(pass) loadSettings > requires a top-level runtime and never defaults it [0.69ms]
(pass) loadSettings > rejects an unrecognized runtime naming the accepted values [0.35ms]
(pass) loadSettings > rejects a runtime misplaced under defaults [0.45ms]
(pass) loadSettings > reads the declared runtime [0.30ms]
(pass) loadSettings > parses every supported settings section [1.10ms]
(pass) loadSettings > reads question re-ask and retention sweep settings [0.42ms]
(pass) loadSettings > rejects a file without the current schemaVersion [0.37ms]
(pass) loadSettings > rejects invalid JSON loudly [0.20ms]
(pass) loadSettings > names the key path for invalid fields [0.41ms]
(pass) loadSettings > rejects unknown settings keys [0.28ms]
(pass) loadSettings > rejects removed spawn cap setting by name [0.37ms]
(pass) loadSettings > parses models.allowed as a per-harness pattern map [0.35ms]
(pass) loadSettings > rejects renamed fleet keys and loads their replacements [1.28ms]
(pass) loadSettings > rejects old settings keys [1.20ms]
(pass) loadSettings > rejects legacy notify type and unknown ids [0.72ms]
(pass) loadSettings > applies every settings default when sections are absent [0.47ms]
(pass) loadSettings > preserves configured values while defaulting each missing section value [0.68ms]
(pass) loadSettings > rejects non-positive and non-integer retention windows [0.80ms]
(pass) loadSettings > rejects a host without dest [0.45ms]
(pass) loadSettings > rejects an unknown id in enabled.adapters [0.43ms]
(pass) loadSettings > rejects defaults.adapter not present in enabled.adapters [0.35ms]
(pass) loadSettings > rejects when settings.json is absent but a legacy config.toml exists [0.29ms]
(pass) allowedModelPatterns > restricts nothing when settings contain no patterns [0.26ms]
(pass) allowedModelPatterns > returns the configured patterns when set [0.31ms]
(pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or enabled entry [0.43ms]
(pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [0.60ms]
(pass) writeSettingsRuntime > a different runtime replaces the single value in place [0.54ms]
(pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [0.42ms]
(pass) reapUnreadableSettings > leaves a readable file alone [0.19ms]
(pass) writeSettingsEnabled > round-trips both provider arrays [0.54ms]
(pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [0.90ms]
(pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [0.59ms]
(pass) writeSettingsDefault > is idempotent when rewriting the same value [0.79ms]
(pass) writeSettingsDefault > refuses to write through an out-of-version settings file [0.32ms]
(pass) writeSettingsDefault > switches defaults.adapter between two enabled ids and loads clean [0.53ms]
(pass) writeSettingsFullTree > round-trips defaults without inventing max_agents_total [1.30ms]
(pass) settings precedence > uses the fallback when env and settings.json omit a setting [0.36ms]
(pass) settings precedence > uses the settings.json value over the fallback [0.29ms]
(pass) settings precedence > uses the ORCH_* environment value over settings.json [0.26ms]
(pass) settings precedence > uses an explicit flag override over the environment [0.05ms]
(pass) resolveSetting > uses flag, environment coercion, settings, then fallback in precedence order [0.08ms]
(pass) resolveWithSource > rejects an environment value with the wrong shape [0.10ms]
(pass) resolveWithSource > reports the winning source at each precedence level [0.10ms]
(pass) models.preferred and models.allowed are independent > loadSettings parses a per-harness preferred quicklist [0.29ms]
(pass) models.preferred and models.allowed are independent > an absent preferred map normalizes to an empty map, not to allowed [0.26ms]
(pass) models.preferred and models.allowed are independent > writing one list leaves the other byte-for-value intact [1.22ms]
(pass) models.preferred and models.allowed are independent > an empty list is recorded as no list at all, so a cleared picker really clears [0.78ms]
(pass) models.preferred and models.allowed are independent > the full tree seeds both maps when absent and preserves both when present [2.59ms]
(pass) models.preferred and models.allowed are independent > the allowlist gate reads models.allowed only [0.42ms]

packages/orch/test/reap-walks-provenance.test.ts:
(pass) reap walks the provenance tree (H3) > an ended agent with a still-present descendant is NOT reaped [43.53ms]
(pass) reap walks the provenance tree (H3) > the tree is reaped from the LEAF up, one sweep per level [46.55ms]
(pass) reap walks the provenance tree (H3) > a LIVE descendant blocks the reap even when the parent ended long ago [37.55ms]
(pass) reap walks the provenance tree (H3) > provenance has no ON DELETE CASCADE, so no reap can erase a subtree [30.92ms]

packages/orch/test/control-dispatch.test.ts:
(pass) deliverControl bridge dispatch > pushes run and steer with their action ids [61.01ms]
(pass) deliverControl bridge dispatch > reports a detached bridge for a live agent [36.50ms]
(pass) deliverControl bridge dispatch > reports a gone agent before pushing to its link [41.75ms]
(pass) deliverControl bridge dispatch > answers only when status has no pending question [44.08ms]
(pass) deliverControl bridge dispatch > pushes an answer with the asking question id [42.94ms]
(pass) deliverControl bridge dispatch > pushes model changes and waits for the control outcome [38.90ms]
(pass) deliverControl bridge dispatch > rejects an outcome whose applied pin differs from the request [41.38ms]
(pass) deliverControl bridge dispatch > uses the backend input path when the adapter bridge takes no steers [41.69ms]

packages/orch/test/backend-herdr.test.ts:
(pass) HerdrBackend > current identity uses the explicit id, not the launch environment [0.27ms]
(pass) HerdrBackend > composes a complete group role bundle [0.04ms]
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [0.48ms]
(pass) HerdrBackend > starts the mapped herdr harness kind in the pane it created [0.18ms]
(pass) HerdrBackend > agent_not_ready keeps the pane and does not close it [0.14ms]
(pass) HerdrBackend > a caller pane is split rather than given a new tab [0.09ms]
(pass) HerdrBackend > pane and tab creation always preserves focus [0.09ms]
(pass) HerdrBackend > split direction clamps to herdr's right|down [0.09ms]
(pass) HerdrBackend > env reaches the pane through herdr's --env, not an argv prefix [0.12ms]
(pass) HerdrBackend > a handed-over pane is launched into directly, never split or closed [0.07ms]
(pass) HerdrBackend > a group is created with the environment its own pane will launch under [0.14ms]
(pass) HerdrBackend > a group with no coordinate is refused, not placed wherever herdr is focused [0.07ms]
(pass) HerdrBackend > a pane with no coordinate is refused the same way [0.04ms]
(pass) HerdrBackend > the inventory answers which workspace holds a pane, and null for one herdr no longer lists [0.09ms]
(pass) HerdrBackend > the pane host closes a pane through herdr [0.06ms]
(pass) HerdrBackend > a planned target pane is split directly, never re-seated afterwards [0.15ms]
(pass) HerdrBackend > a grouped spawn with no planned target splits a pane already in that tab, never the caller's pane [0.29ms]
(pass) HerdrBackend > a same-tab re-seat bounces through a throwaway tab so herdr executes it [0.14ms]
(pass) HerdrBackend > adopts herdr's replacement pane id after move [0.03ms]
(pass) HerdrBackend > refuses a live herdr agent name before start [0.16ms]
(pass) HerdrBackend > reads recent unwrapped pane output [0.05ms]
(pass) HerdrBackend > a refused move surfaces herdr's reason instead of claiming success [0.07ms]
(pass) HerdrBackend > groupLayout reads tab geometry straight off the pane listing [0.13ms]
(pass) HerdrBackend > pane input reports gone handles without retrying and retries plain failures [1751.73ms]
(pass) HerdrBackend > pane rename failure reaches the role caller [0.34ms]
(pass) HerdrBackend > waiting uses agent wait --until, not the removed top-level wait [0.20ms]
(pass) HerdrBackend space home > opens an orch-marked workspace for a pack the caller did not label [0.53ms]
(pass) HerdrBackend space home > a space home the human named keeps that name [0.17ms]
(pass) HerdrBackend space home > create hands back the plexer coordinate, the root tab and the root pane, and says none of them [0.11ms]

packages/orch/test/one-retry-policy.test.ts:
(pass) one retry policy > retries flaky async and sync operations through the shared helper [0.38ms]
(pass) one retry policy > uses the policy's declared backoff schedule [0.19ms]
(pass) one retry policy > surfaces the last error after exactly attempts tries [0.22ms]

packages/orch/test/broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.14ms]
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [36.20ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [31.14ms]
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [26.68ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [25.91ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [6.48ms]

packages/orch/test/peer-project-scope.test.ts:
(pass) peer discovery walls on the project > a same-workspace peer from another project is invisible by default [44.36ms]
(pass) peer discovery walls on the project > all_workspaces deliberately lifts the project wall [37.30ms]
(pass) peer discovery walls on the project > a cross-project target does not resolve for sends without the explicit flag [34.24ms]
(pass) peer discovery walls on the project > a record with no project stamp is malformed and never listed [38.65ms]
(pass) peer discovery walls on the project > a spawned agent's all_workspaces flag is ignored [48.36ms]

packages/orch/test/peer-tools-registration.test.ts:
(pass) peer tool registration > does not register orch_send when no spawner address exists [0.79ms]
(pass) peer tool registration > does not register orch_send when the spawner pid is dead [36.78ms]
(pass) peer tool registration > registers orch_send when the spawner has a live status record [37.11ms]

packages/orch/test/session-sees-only-held-agents.test.ts:
(pass) session agent visibility > shows only agents held by the current session, not its provenance children [0.18ms]
(pass) session agent visibility > an operator sees every agent in every space [0.09ms]
(pass) session agent visibility > a session cannot reset a foreign-held agent [39.60ms]
(pass) session agent visibility > a session cannot read runs by the exact key of a foreign-held agent [37.88ms]
(pass) session agent visibility > a session cannot widen status with --space-wide [23.04ms]
(pass) session agent visibility > a session cannot resolve a foreign target, even when it shares provenance [40.61ms]

packages/orch/test/pid-liveness.test.ts:
(pass) pidAlive liveness contract (shared by pi peers) > EPERM means the process exists under another user — alive [0.11ms]
(pass) pidAlive liveness contract (shared by pi peers) > ESRCH means no such process — dead [0.03ms]
(pass) pidAlive liveness contract (shared by pi peers) > the current process is alive [0.02ms]
(pass) pidAlive liveness contract (shared by pi peers) > non-positive and non-numeric pids are rejected without signalling [0.04ms]

packages/orch/test/notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > reports notifier reachability from one configured entry [0.22ms]
(pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [0.38ms]
(pass) notifier registry and built-in adapters > a notifier error is the caller's real error [0.16ms]

packages/orch/test/orchd-rpc-replay.test.ts:
(pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [28.01ms]
(pass) orchd RPC replay buffer > replays from inside the surviving range without a gap [30.94ms]
(pass) orchd RPC replay buffer > reports a gap when the requested sequence predates retained history [29.88ms]
(pass) orchd RPC replay buffer > empty history has no gap or oldest sequence [21.46ms]
(pass) orchd RPC replay buffer > limits replay size without pruning durable events [1737.97ms]

packages/orch/test/commands-index.test.ts:
(pass) commands/index > does not gate help or noninteractive commands [0.06ms]
(pass) commands/index > reads a package version string [0.09ms]
(pass) commands/index > announces unleased agents once per session [0.21ms]
(pass) commands/index > dispatches representative commands and reports unknown commands [1.02ms]

packages/orch/test/store-outbox.test.ts:
(pass) outbox store rows > inserts pending messages and orders them by creation time [25.06ms]
(pass) outbox store rows > reports one message's pending state [29.06ms]
(pass) outbox store rows > bumps attempts and hides a message until its next attempt time [26.37ms]
(pass) outbox store rows > deletes delivered messages older than the cutoff [33.01ms]

packages/orch/test/adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [0.06ms]
(pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.10ms]
(pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.04ms]
(pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.03ms]
(pass) preferred models fill the harness's native picker quicklist > pi interactive builders pass the quicklist as one quoted --models argument [0.09ms]
(pass) preferred models fill the harness's native picker quicklist > pi headless builders pass the quicklist as one verbatim argv entry [0.07ms]
(pass) preferred models fill the harness's native picker quicklist > pi omits --models cleanly for an absent or empty quicklist [0.10ms]
(pass) preferred models fill the harness's native picker quicklist > pi keeps quicklist order and provider punctuation intact [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > omp interactive builders pass the quicklist as one quoted --models argument [0.03ms]
(pass) preferred models fill the harness's native picker quicklist > omp headless builders pass the quicklist as one verbatim argv entry [0.01ms]
(pass) preferred models fill the harness's native picker quicklist > omp omits --models cleanly for an absent or empty quicklist [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > omp keeps quicklist order and provider punctuation intact
(pass) preferred models fill the harness's native picker quicklist > a model outside the quicklist is still what the launch runs on [0.06ms]

packages/orch/test/a-backend-exposes-each-operation-once.test.ts:
(pass) a backend exposes each operation exactly once (2.2) > herdr publishes no operation beside the role that owns it [0.10ms]
(pass) a backend exposes each operation exactly once (2.2) > tmux publishes no operation beside the role that owns it [0.08ms]
(pass) a backend exposes each operation exactly once (2.2) > headless publishes no operation beside the role that owns it [0.07ms]

packages/orch/test/pack-membership.test.ts:
(pass) a pack is the provenance root > a registered session is an orch of a pack of one [31.38ms]
(pass) a pack is the provenance root > membership is inherited from the spawner at any depth, never re-rooted [36.80ms]
(pass) a pack is the provenance root > every agent is in exactly one pack, and two packs never share a member [41.75ms]
(pass) a pack is the provenance root > a pack of one grows without re-rooting, and the root stays the orch [29.06ms]
(pass) a pack is the provenance root > a lease or a move never changes which pack an agent is in [39.56ms]
(pass) a pack is the provenance root > an agent cannot be spawned by someone who does not exist [23.94ms]

packages/web/src/lib/fleet.test.ts:
(pass) web environment projection > novel plexers still render a detached environment [0.38ms]
(pass) web environment projection > missing space is absent rather than local [0.06ms]
(pass) web environment projection > pane coordinates are not chosen names [0.04ms]
(pass) web environment projection > unknown daemon states use the neutral fallback [0.04ms]
(pass) web environment projection > uses names from orch rows and falls back to the minted id [0.05ms]
(pass) web environment projection > uses the orch space name and id [0.04ms]
(pass) web environment projection > history groups ended agents by provenance root [0.09ms]
(pass) web environment projection > live projection excludes ended rows [0.09ms]
(pass) web environment projection > renderers contain no provider-id branches or backend capability imports [0.31ms]

packages/web/src/lib/web-shell.test.ts:
(pass) web shell and fleet views > the app shell scrolls only its content region [0.24ms]
(pass) web shell and fleet views > no route declares a scroll frame of its own [0.44ms]
(pass) web shell and fleet views > unleased agents are partitioned into an orphan bucket [0.20ms]
(pass) web shell and fleet views > history groups exited agents by the agent that spawned them [0.07ms]
(pass) web shell and fleet views > live work groups under its current lease holder [0.17ms]
(pass) web shell and fleet views > adopted work is filed under its current holder [0.09ms]
(pass) web shell and fleet views > unheld agents remain visible under the unheld group [0.06ms]
(pass) web shell and fleet views > dead holders become unheld and do not drive work [0.08ms]
(pass) web shell and fleet views > lease groups preserve every flat space member [0.09ms]
(pass) web shell and fleet views > visible names never expose a plexer coordinate or the forbidden term [0.08ms]

4 tests failed:
(fail) daemon RPC > an unreachable agent yields a boundary answer, and the outbox is not left pending [5089.06ms]
(fail) daemon RPC > dispatch waits for and reports a bridge acknowledgement [5087.13ms]
(fail) daemon RPC > dispatch reports unavailable while a live agent has no bridge [5022.39ms]
(fail) daemon RPC > attach reports open rows and re-pushes them [5087.52ms]

 1649 pass
 4 fail
 7607 expect() calls
Ran 1653 tests across 256 files. [77.33s]
