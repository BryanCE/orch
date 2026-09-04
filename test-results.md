$ bun --filter @bryance/orch test
@bryance/orch test: bun test v1.4.0 (34cbb9a40) 24x PARALLEL
@bryance/orch test: 
@bryance/orch test: test\a-backend-exposes-each-operation-once.test.ts:
@bryance/orch test: (pass) a backend exposes each operation exactly once (2.2) > herdr publishes no operation beside the role that owns it [0.15ms]
@bryance/orch test: (pass) a backend exposes each operation exactly once (2.2) > tmux publishes no operation beside the role that owns it [0.04ms]
@bryance/orch test: (pass) a backend exposes each operation exactly once (2.2) > headless publishes no operation beside the role that owns it [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\identity-is-not-environment.test.ts:
@bryance/orch test: (pass) A1 ΓÇö identity carries no environment > Identity declares no plexer and no plexer grouping [0.09ms]
@bryance/orch test: 
@bryance/orch test: test\port-no-optional-methods.test.ts:
@bryance/orch test: (pass) the environment port declares capability by composition, never by optionality > src/types/backend.ts has no optional methods on any port interface [32.17ms]
@bryance/orch test: (pass) the environment port declares capability by composition, never by optionality > the deleted capability flags bag is gone, not merely unimplemented [0.72ms]
@bryance/orch test: (pass) the environment port declares capability by composition, never by optionality > src/types/adapter.ts has no optional methods on the harness port either [0.58ms]
@bryance/orch test: 
@bryance/orch test: test\agent-model-unwelded.test.ts:
@bryance/orch test: (pass) A1 ΓÇö the four facts are never welded > no table welds identity, provenance, ownership and environment into one row [1.20ms]
@bryance/orch test: (pass) A1 ΓÇö the four facts are never welded > ownership is a lease table, not a second id space [0.97ms]
@bryance/orch test: (pass) A1 ΓÇö the four facts are never welded > the agents hub carries identity and provenance only [0.28ms]
@bryance/orch test: (pass) A1 ΓÇö the four facts are never welded > no table anywhere carries a lifetime [8.12ms]
@bryance/orch test: 
@bryance/orch test: test\identity-is-not-environment.test.ts:
@bryance/orch test: (pass) A1 ΓÇö identity carries no environment > a key is the minted id itself, with no separator to split [0.36ms]
@bryance/orch test: (pass) A1 ΓÇö identity carries no environment > the module never spells the sentinels that stand in for a missing place [0.05ms]
@bryance/orch test: (pass) A1 ΓÇö identity carries no environment > minted ids are unique per spawn [73.53ms]
@bryance/orch test: 
@bryance/orch test: test\notify-sinks.test.ts:
@bryance/orch test: (pass) notification entries > desktop entries use the canonical notifier registry [0.82ms]
@bryance/orch test: 
@bryance/orch test: test\claude-adapter.test.ts:
@bryance/orch test: (pass) Claude adapter > declares its identity, and composes only the roles it fully implements [1.16ms]
@bryance/orch test: 
@bryance/orch test: test\notify.test.ts:
@bryance/orch test: (pass) notification routing > an excluded state does not invoke its notifier [0.98ms]
@bryance/orch test: 
@bryance/orch test: test\log-level.test.ts:
@bryance/orch test: (pass) the configured log level reaches every logger > the env var wins over settings.json [45.64ms]
@bryance/orch test: 
@bryance/orch test: test\pack-gets-its-own-home.test.ts:
@bryance/orch test: (pass) a pack gets its own marked plexer home (E8, E9, E10) > the coordinate is STORED against the pack and is never orch's own id [121.12ms]
@bryance/orch test: 
@bryance/orch test: test\identity-launch.test.ts:
@bryance/orch test: (pass) launchCredential > returns null when the launch environment is unset [5.66ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-reconnect.test.ts:
@bryance/orch test: (pass) RPC JSON framing > rejects malformed object that only has an id [0.16ms]
@bryance/orch test: 
@bryance/orch test: test\agent-monitor.test.ts:
@bryance/orch test: (pass) agent fleet monitor > surfaces only agents spawned by this session [17.16ms]
@bryance/orch test: 
@bryance/orch test: test\settings.test.ts:
@bryance/orch test: (pass) loadSettings > refuses to invent settings when settings.json is missing [6.28ms]
@bryance/orch test: 
@bryance/orch test: test\agent-monitor.test.ts:
@bryance/orch test: (pass) agent fleet monitor > empty model renders no status line or widget [1.06ms]
@bryance/orch test: (pass) agent fleet monitor > worker process registers no monitor regardless of events [1.31ms]
@bryance/orch test: (pass) agent fleet monitor > does not replay history into a plain pi session [2.32ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-claude-hooks.test.ts:
@bryance/orch test: (pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [111.89ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-boundary.test.ts:
@bryance/orch test: (pass) port seam command boundary > headless target is answered without invoking its pane role [0.08ms]
@bryance/orch test: (pass) port seam command boundary > paned environment without a role is answered at the boundary [0.02ms]
@bryance/orch test: (pass) port seam command boundary > an invocation preserves the provider failure [0.14ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-reconnect.test.ts:
@bryance/orch test: (pass) RPC JSON framing > parses split and multiple newline-delimited frames [58.90ms]
@bryance/orch test: 
@bryance/orch test: test\settings-precedence.test.ts:
@bryance/orch test: (pass) settings precedence > returns a defaults value when no override is set [43.97ms]
@bryance/orch test: 
@bryance/orch test: test\environment-dictates-what-is-possible.test.ts:
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > a MOVE is a new environment record, and what is possible follows it at once [193.74ms]
@bryance/orch test: 
@bryance/orch test: test\commands-setup.test.ts:
@bryance/orch test: (pass) commands/setup > reads value and assignment flags [0.34ms]
@bryance/orch test: 
@bryance/orch test: test\log-level.test.ts:
@bryance/orch test: (pass) the configured log level reaches every logger > settings.json is used when the env var is unset [25.48ms]
@bryance/orch test: (pass) the configured log level reaches every logger > an unrecognised env value falls back to the configured level [11.78ms]
@bryance/orch test: (pass) the configured log level reaches every logger > the CLI logger honours the configured level [45.28ms]
@bryance/orch test: (pass) the configured log level reaches every logger > the CLI logger drops records below the configured level [11.14ms]
@bryance/orch test: (pass) the configured log level reaches every logger > the daemon logger resolves through the same helper [24.39ms]
@bryance/orch test: 
@bryance/orch test: test\queue-space-replay.test.ts:
@bryance/orch test: (pass) queue replay keeps typed scope > stored scope offers pack work only to that pack [213.27ms]
@bryance/orch test: 
@bryance/orch test: test\settings-precedence.test.ts:
@bryance/orch test: (pass) settings precedence > applies defaults when settings, env, and flag are absent [9.52ms]
@bryance/orch test: (pass) settings precedence > uses env over settings and flag over env [12.73ms]
@bryance/orch test: (pass) settings precedence > parses notify entries and hosts into expected shapes [25.22ms]
@bryance/orch test: (pass) settings precedence > reports a helpful validation error for invalid settings [24.05ms]
@bryance/orch test: 
@bryance/orch test: test\a-row-is-not-a-pane.test.ts:
@bryance/orch test: (pass) a row is not evidence that a pane exists (U1, U4) > a recorded handle the plexer does not list is reported as NO pane [154.09ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-name-list.test.ts:
@bryance/orch test: (pass) spawn names every agent positionally, at creation > the positional arguments are the names, one per pane [1.23ms]
@bryance/orch test: 
@bryance/orch test: test\commands-index.test.ts:
@bryance/orch test: (pass) commands/index > does not gate help or noninteractive commands [0.18ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-name-list.test.ts:
@bryance/orch test: (pass) spawn names every agent positionally, at creation > the pane count is how many names were given [0.15ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > spawning with no name at all is refused [0.25ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > a bare count is not a name and is refused [0.15ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > the same name twice would collide, so it is refused before anything is created [0.08ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > every name is validated, so one bad name creates nothing [0.08ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > --name is gone: naming is positional, so the flag is an unknown flag [0.27ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > claimSpawnNames takes the resolved names and asserts each is free [9.89ms]
@bryance/orch test: 
@bryance/orch test: test\agent-view.test.ts:
@bryance/orch test: (pass) the agent composer > an agent with no environment rows has every axis absent, not defaulted [120.69ms]
@bryance/orch test: 
@bryance/orch test: test\log-record.test.ts:
@bryance/orch test: (pass) the one log record shape > writes one JSONL record per call, with an epoch-millis instant [20.42ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-terminal.test.ts:
@bryance/orch test: (pass) bridge terminal turn seam > empty and tool-only turn_end turns still publish a terminal idle state [118.30ms]
@bryance/orch test: 
@bryance/orch test: test\commands-index.test.ts:
@bryance/orch test: (pass) commands/index > reads a package version string [0.58ms]
@bryance/orch test: (pass) commands/index > announces unleased agents once per session [3.08ms]
@bryance/orch test: (pass) commands/index > dispatches representative commands and reports unknown commands [48.51ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-names.test.ts:
@bryance/orch test: (pass) agent name validation > rejects names outside herdr's naming rule [0.30ms]
@bryance/orch test: 
@bryance/orch test: test\settings-registry.test.ts:
@bryance/orch test: (pass) settings registry > declares every schema setting exactly once [1.08ms]
@bryance/orch test: 
@bryance/orch test: test\identity-launch.test.ts:
@bryance/orch test: (pass) launchCredential > returns a minted id [4.47ms]
@bryance/orch test: (pass) launchCredential > malformed value exits 1 and logs launch.invalid-key [244.59ms]
@bryance/orch test: 
@bryance/orch test: test\store-queue.test.ts:
@bryance/orch test: (pass) queue facade storage > state is derived from attempts rather than stored on tasks [224.74ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-terminal.test.ts:
@bryance/orch test: (pass) bridge terminal turn seam > a settled turn with assistant text publishes done [57.56ms]
@bryance/orch test: 
@bryance/orch test: test\log-record.test.ts:
@bryance/orch test: (pass) the one log record shape > a record below the configured level is not written at all [35.93ms]
@bryance/orch test: (pass) the one log record shape > a correlation id rides every record of one dispatch, so one grep finds its whole life [41.39ms]
@bryance/orch test: (pass) the one log record shape > agentId carries orch's minted id; a plexer handle is a field, never the identity [23.84ms]
@bryance/orch test: (pass) the one log record shape > every level is orderable, lowest to highest [0.10ms]
@bryance/orch test: (pass) the one log record shape > a malformed line is rejected by the guard rather than trusted [0.44ms]
@bryance/orch test: 
@bryance/orch test: test\identity-self.test.ts:
@bryance/orch test: (pass) selfIdentity > returns the launch id without touching the store [9.02ms]
@bryance/orch test: 
@bryance/orch test: test\identity.test.ts:
@bryance/orch test: (pass) serializeIdentity / parseIdentity > a key is the minted id verbatim [0.34ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-channel.test.ts:
@bryance/orch test: (pass) orch channel and capture roles > headless delivery reaches the inbox and is acknowledged without a screen [223.30ms]
@bryance/orch test: 
@bryance/orch test: test\settings-registry.test.ts:
@bryance/orch test: (pass) settings registry > every registry read resolves against loaded settings [50.99ms]
@bryance/orch test: (pass) settings registry > fleet help explains what each limit counts [0.27ms]
@bryance/orch test: (pass) settings registry > fleet.max_depth round-trips through the full-tree writer [40.45ms]
@bryance/orch test: (pass) settings registry > fleet.max_depth rejects zero through the registered writer [18.80ms]
@bryance/orch test: (pass) settings registry > fleet.max_depth writes its value to settings.json [20.95ms]
@bryance/orch test: (pass) settings registry > contains no duplicate keys [0.26ms]
@bryance/orch test: 
@bryance/orch test: test\retention.test.ts:
@bryance/orch test: (pass) retention sweep > retention windows are independently configurable [220.99ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-channel.test.ts:
@bryance/orch test: (pass) orch channel and capture roles > capture reads status and result from the orch presence record [30.14ms]
@bryance/orch test: 
@bryance/orch test: test\identity.test.ts:
@bryance/orch test: (pass) serializeIdentity / parseIdentity > round-trips a minted id [0.27ms]
@bryance/orch test: (pass) serializeIdentity / parseIdentity > a key is one flat filesystem-safe segment with nothing to split [0.12ms]
@bryance/orch test: (pass) serializeIdentity / parseIdentity > two spawns never collide, so no plexer is needed to namespace them [83.75ms]
@bryance/orch test: (pass) isAgentId > accepts a minted id [0.06ms]
@bryance/orch test: (pass) isAgentId > rejects everything that is not one [0.10ms]
@bryance/orch test: (pass) malformed input > rejects a plexer-and-space key on parse [0.18ms]
@bryance/orch test: (pass) malformed input > rejects an empty key [0.02ms]
@bryance/orch test: (pass) malformed input > rejects a pane handle, a name, and a wrong-length id on serialize [0.13ms]
@bryance/orch test: (pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.05ms]
@bryance/orch test: (pass) malformed input > tryParseIdentity parses a minted id [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-errors.test.ts:
@bryance/orch test: (pass) port seam error contract > provider mutation errors preserve argv, exit status, stderr, and stdout [0.70ms]
@bryance/orch test: 
@bryance/orch test: test\queue.test.ts:
@bryance/orch test: (pass) queue facade on tasks and attempts > malformed task options are refused instead of handed back as TaskOptions [255.33ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-errors.test.ts:
@bryance/orch test: (pass) port seam error contract > provider query errors throw instead of returning a sentinel [0.57ms]
@bryance/orch test: 
@bryance/orch test: test\unleased-stays-adoptable.test.ts:
@bryance/orch test: (pass) unleased and idle stays alive and adoptable (D3) > a decade of retention sweeps never ages out an unleased idle agent [237.44ms]
@bryance/orch test: 
@bryance/orch test: test\offline-is-not-a-second-source.test.ts:
@bryance/orch test: (pass) --offline is a narrower view of ONE source, not a second one (M8) > offline and online read the same agents from the same presence files [225.69ms]
@bryance/orch test: 
@bryance/orch test: test\broker-daemon-hardening.test.ts:
@bryance/orch test: (pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.72ms]
@bryance/orch test: 
@bryance/orch test: test\presence-dirs-are-reaped-not-migrated.test.ts:
@bryance/orch test: (pass) a presence dir in the old shape is reaped, never migrated (J4) > a composite-named dir is not presence, even with a LIVE pid [31.61ms]
@bryance/orch test: 
@bryance/orch test: test\a-row-is-not-a-pane.test.ts:
@bryance/orch test: (pass) a row is not evidence that a pane exists (U1, U4) > the agent itself is still there ΓÇö losing a pane costs a shortcut, not a life [170.51ms]
@bryance/orch test: (pass) a row is not evidence that a pane exists (U1, U4) > a handle the plexer DOES list is kept [222.39ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-roundtrip.test.ts:
@bryance/orch test: (pass) repairing a settings.json the schema rejects > reports every rejected key without touching the file [33.85ms]
@bryance/orch test: 
@bryance/orch test: test\launch-model-gate.test.ts:
@bryance/orch test: (pass) the model gate rules by harness membership, not by format > accepts a listed spec, with or without a thinking suffix [0.22ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-allowlist.test.ts:
@bryance/orch test: (pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [5.85ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.21ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.04ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.04ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.21ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.14ms]
@bryance/orch test: (pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.76ms]
@bryance/orch test: (pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.12ms]
@bryance/orch test: (pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.08ms]
@bryance/orch test: 
@bryance/orch test: test\offline-is-not-a-second-source.test.ts:
@bryance/orch test: (pass) --offline is a narrower view of ONE source, not a second one (M8) > offline reports the SAME state the agent reported, never a second opinion [171.04ms]
@bryance/orch test: (pass) --offline is a narrower view of ONE source, not a second one (M8) > there is exactly ONE row builder, and --offline only narrows what it asks [0.61ms]
@bryance/orch test: (pass) --offline is a narrower view of ONE source, not a second one (M8) > offline is the one path that never dials or starts the daemon [0.32ms]
@bryance/orch test: 
@bryance/orch test: test\launch-model-gate.test.ts:
@bryance/orch test: (pass) the model gate rules by harness membership, not by format > refuses a ladder shorthand and names what the harness does offer [0.22ms]
@bryance/orch test: (pass) the model gate rules by harness membership, not by format > accepts each harness's own vocabulary rather than one shared grammar [0.08ms]
@bryance/orch test: (pass) the model gate rules by harness membership, not by format > cannot check a harness that publishes no catalogue, and does not pretend to [0.02ms]
@bryance/orch test: (pass) the settings allowlist applies on top of harness membership > an empty allowlist restricts nothing beyond the harness list [16.47ms]
@bryance/orch test: (pass) the settings allowlist applies on top of harness membership > a configured allowlist refuses a listed model outside its patterns [27.72ms]
@bryance/orch test: (pass) the settings allowlist applies on top of harness membership > harness membership is checked before the allowlist, so the message names the harness [13.16ms]
@bryance/orch test: 
@bryance/orch test: test\nested-spawn-unleased.test.ts:
@bryance/orch test: (pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the middle agent's death leaves the grandchild unleased, held by nobody [251.73ms]
@bryance/orch test: 
@bryance/orch test: test\launch-stamp.test.ts:
@bryance/orch test: (pass) canonical launch stamp > claude and codex launches produce the same status shape [0.80ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-roundtrip.test.ts:
@bryance/orch test: (pass) repairing a settings.json the schema rejects > a removed key is never guessed at - it offers no rename [9.38ms]
@bryance/orch test: (pass) repairing a settings.json the schema rejects > the choices a person makes leave the file loadable [35.62ms]
@bryance/orch test: (pass) repairing a settings.json the schema rejects > a typo keeps its value: renaming carries it to the real key [33.25ms]
@bryance/orch test: (pass) repairing a settings.json the schema rejects > leaving every defect alone writes nothing at all [10.27ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-screen.test.ts:
@bryance/orch test: (pass) repair action labels > names the key a rename lands on, so the destination is never a guess [0.04ms]
@bryance/orch test: (pass) repair action labels > names the value a set writes [0.04ms]
@bryance/orch test: (pass) repair action labels > drop and leave say only what they do [0.01ms]
@bryance/orch test: (pass) repair frame > shows every defect with the value the person wrote [0.61ms]
@bryance/orch test: (pass) repair frame > promises that nothing changes before a save, because nothing does [0.06ms]
@bryance/orch test: (pass) repair frame > every defect starts at leave, so opening the screen destroys nothing [0.04ms]
@bryance/orch test: (pass) repair frame > a chosen repair is shown as what it will do [0.04ms]
@bryance/orch test: (pass) repair frame > the focused row's offered keys are shown, so no choice has to be guessed [0.08ms]
@bryance/orch test: (pass) repair frame > the count reads as English for one defect and for many [0.05ms]
@bryance/orch test: (pass) repair frame > no row runs past the terminal width, tag included [0.07ms]
@bryance/orch test: (pass) repair frame > the file being repaired is named in the header [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-bundle-diagnosis.test.ts:
@bryance/orch test: (pass) adapter bundle installation > reports a missing shipped bundle as a structured diagnosis [2.92ms]
@bryance/orch test: pi extensions:
@bryance/orch test: (pass) adapter bundle installation > diagnoses a missing shipped bundle without writing [5.36ms]
@bryance/orch test: 
@bryance/orch test: test\one-bind-for-the-unix-endpoint.test.ts:
@bryance/orch test: (pass) one bind for the unix endpoint (2.4) > the unix endpoint is claimed in exactly one place [0.08ms]
@bryance/orch test: 
@bryance/orch test: test\presence-dirs-are-reaped-not-migrated.test.ts:
@bryance/orch test: (pass) a presence dir in the old shape is reaped, never migrated (J4) > the sweep REMOVES it rather than leaving it for a migration that never comes [19.18ms]
@bryance/orch test: (pass) a presence dir in the old shape is reaped, never migrated (J4) > nothing renames, rewrites or re-keys the old directory [23.46ms]
@bryance/orch test: (pass) a presence dir in the old shape is reaped, never migrated (J4) > a dead dir in the CURRENT shape is still reaped the ordinary way [153.14ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-claude-hooks.test.ts:
@bryance/orch test: (pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [117.49ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [98.31ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [119.38ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [112.14ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [80.49ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [27.62ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [47.49ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [85.58ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > treats an absent settings file as not configured [0.72ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > handles malformed settings gracefully [13.65ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lease.test.ts:
@bryance/orch test: (pass) lease commands > detach releases the lease and is a no-op when already unleased [278.35ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-write.test.ts:
@bryance/orch test: (pass) applySettingsRepairs > rename carries the value to the new key [39.22ms]
@bryance/orch test: 
@bryance/orch test: test\one-bind-for-the-unix-endpoint.test.ts:
@bryance/orch test: (pass) one bind for the unix endpoint (2.4) > reclaiming a stale socket yields the endpoint a first bind produces [92.17ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-hardening.test.ts:
@bryance/orch test: (pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [2.56ms]
@bryance/orch test: 
@bryance/orch test: test\one-control-dispatcher.test.ts:
@bryance/orch test: (pass) there is exactly one control dispatcher > no module outside src/control declares a control dispatcher [20.76ms]
@bryance/orch test: 
@bryance/orch test: test\claude-adapter.test.ts:
@bryance/orch test: (pass) Claude adapter > builds the interactive Claude launch command [0.69ms]
@bryance/orch test: (pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.95ms]
@bryance/orch test: (pass) Claude adapter > detects state from a live presence status [30.47ms]
@bryance/orch test: (pass) Claude adapter > extracts results.jsonl before transcript and native output [40.63ms]
@bryance/orch test: (pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [22.06ms]
@bryance/orch test: (pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [182.75ms]
@bryance/orch test: (pass) Claude adapter > maps Claude hook events to presence states and schema [456.07ms]
@bryance/orch test: (pass) Claude adapter > exits silently and writes no presence without launch env (a non-orch session) [61.92ms]
@bryance/orch test: (pass) Claude adapter > fails hard and writes no presence on a malformed launch env [72.73ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-hardening.test.ts:
@bryance/orch test: (pass) adapter and runtime hardening > rejects unknown settings keys with a useful path [29.70ms]
@bryance/orch test: (pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [19.02ms]
@bryance/orch test: (pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [3.92ms]
@bryance/orch test: 
@bryance/orch test: test\one-control-dispatcher.test.ts:
@bryance/orch test: (pass) there is exactly one control dispatcher > no dispatcher is exported under two names [19.73ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-declared-vs-reality.test.ts:
@bryance/orch test: (pass) doctor declared-vs-reality > describes composed and absent backend roles [23.90ms]
@bryance/orch test: 
@bryance/orch test: test\presence-inbox.test.ts:
@bryance/orch test: (pass) shared presence line writers > inbox and ack drains use the same claimed rename path [65.48ms]
@bryance/orch test: 
@bryance/orch test: test\one-query-stack-over-the-connection.test.ts:
@bryance/orch test: (pass) one query stack over the connection (2.3) > the store exposes no raw-SQL port beside the typed one [0.07ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-write.test.ts:
@bryance/orch test: (pass) applySettingsRepairs > rename onto an occupied key throws and leaves the file untouched [11.26ms]
@bryance/orch test: (pass) applySettingsRepairs > set writes a value at a dotted path [19.68ms]
@bryance/orch test: (pass) applySettingsRepairs > drop deletes a value without pruning its parent [35.67ms]
@bryance/orch test: (pass) applySettingsRepairs > applies several repairs in one call [34.96ms]
@bryance/orch test: (pass) applySettingsRepairs > repairs a schema-rejected file before readSettingsFile validates it [21.86ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-model-flag.test.ts:
@bryance/orch test: (pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [0.13ms]
@bryance/orch test: (pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.10ms]
@bryance/orch test: (pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.13ms]
@bryance/orch test: (pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.22ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > pi interactive builders pass the quicklist as one quoted --models argument [0.13ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > pi headless builders pass the quicklist as one verbatim argv entry [0.12ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > pi omits --models cleanly for an absent or empty quicklist [0.11ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > pi keeps quicklist order and provider punctuation intact [0.06ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > omp interactive builders pass the quicklist as one quoted --models argument [0.07ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > omp headless builders pass the quicklist as one verbatim argv entry [0.04ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > omp omits --models cleanly for an absent or empty quicklist [0.10ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > omp keeps quicklist order and provider punctuation intact [0.01ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > a model outside the quicklist is still what the launch runs on [0.07ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair.test.ts:
@bryance/orch test: (pass) settings repair choices > offers rename, set, drop, then leave when all repairs apply [0.11ms]
@bryance/orch test: (pass) settings repair choices > offers only rename when there is only a suggestion [0.03ms]
@bryance/orch test: (pass) settings repair choices > offers only set when there is only an expected value [0.02ms]
@bryance/orch test: (pass) settings repair choices > always offers leave, and cannot drop a file-level defect [0.01ms]
@bryance/orch test: (pass) settings repair reducer > starts every defect at leave and focus at zero [0.04ms]
@bryance/orch test: (pass) settings repair reducer > refuses choices the focused defect does not offer and reports why [0.18ms]
@bryance/orch test: (pass) settings repair reducer > clamps focus at both ends and clears a prior reason [0.08ms]
@bryance/orch test: (pass) settings repair reducer > maps non-leave choices to repairs in defect order [0.10ms]
@bryance/orch test: (pass) settings repair reducer > leave produces no repair [0.02ms]
@bryance/orch test: (pass) settings repair reducer > empty defects make every action a no-op [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\presence-inbox.test.ts:
@bryance/orch test: (pass) shared presence line writers > pi appends and answers through shared presence writers [48.12ms]
@bryance/orch test: (pass) shared presence line writers > wrong status schema is rejected by shared status reader [25.92ms]
@bryance/orch test: 
@bryance/orch test: test\one-query-stack-over-the-connection.test.ts:
@bryance/orch test: 31 |       .filter((file) => file !== THIS_FILE)
@bryance/orch test: 32 |       .flatMap((file) => {
@bryance/orch test: 33 |         const lines = readFileSync(file, "utf8").split("\n");
@bryance/orch test: 34 |         return lines.flatMap((line, index) => line.includes(".query(") ? [`${file}:${index + 1}`] : []);
@bryance/orch test: 35 |       });
@bryance/orch test: 36 |     expect(callers).toEqual([]);
@bryance/orch test:                          ^
@bryance/orch test: error: expect(received).toEqual(expected)
@bryance/orch test: 
@bryance/orch test: - []
@bryance/orch test: + [
@bryance/orch test: +   "C:/dev/personal/orch/packages/orch/test/one-query-stack-over-the-connection.test.ts:34",
@bryance/orch test: + ]
@bryance/orch test: 
@bryance/orch test: - Expected  - 1
@bryance/orch test: + Received  + 3
@bryance/orch test: 
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\one-query-stack-over-the-connection.test.ts:36:21)
@bryance/orch test: (fail) one query stack over the connection (2.3) > nothing in the repo prepares a statement through the deleted port [68.84ms]
@bryance/orch test: 
@bryance/orch test: test\one-retry-policy.test.ts:
@bryance/orch test: (pass) one retry policy > retries flaky async and sync operations through the shared helper [0.55ms]
@bryance/orch test: (pass) one retry policy > uses the policy's declared backoff schedule [0.12ms]
@bryance/orch test: (pass) one retry policy > surfaces the last error after exactly attempts tries [0.30ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-pi.test.ts:
@bryance/orch test: (pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.31ms]
@bryance/orch test: 
@bryance/orch test: test\claude-hooks-shim.test.ts:
@bryance/orch test: (pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no launch env) [140.99ms]
@bryance/orch test: 
@bryance/orch test: test\broker-daemon-hardening.test.ts:
@bryance/orch test: (pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [208.64ms]
@bryance/orch test: (pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [222.45ms]
@bryance/orch test: 
@bryance/orch test: test\unleased-stays-adoptable.test.ts:
@bryance/orch test: (pass) unleased and idle stays alive and adoptable (D3) > and it is still adoptable afterwards ΓÇö the point of keeping it [226.63ms]
@bryance/orch test: (pass) unleased and idle stays alive and adoptable (D3) > the sweep reaps only agents that actually ENDED, never merely unleased ones [205.84ms]
@bryance/orch test: (pass) unleased and idle stays alive and adoptable (D3) > repeated sweeps are stable: an unleased agent survives every one of them [231.32ms]
@bryance/orch test: 
@bryance/orch test: test\settings-shell.test.ts:
@bryance/orch test: (pass) settings shell decisions > non-TTY takes the print path [0.07ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-pi.test.ts:
@bryance/orch test: (pass) PiAdapter > restricted workers explicitly load the bundled pi extension [0.49ms]
@bryance/orch test: (pass) PiAdapter > declares its lifecycle slash-commands [0.12ms]
@bryance/orch test: (pass) PiAdapter > reads state from the presence status through store helpers [21.74ms]
@bryance/orch test: (pass) PiAdapter > appends a steer message to the presence inbox [21.66ms]
@bryance/orch test: (pass) PiAdapter > writes a blocking answer to the presence answer file [50.51ms]
@bryance/orch test: (pass) PiAdapter > reads results.jsonl and falls back to the last assistant session text [40.93ms]
@bryance/orch test: (pass) PiAdapter > parses pi's supported model table without importing harness internals [0.69ms]
@bryance/orch test: 
@bryance/orch test: test\nested-spawn-unleased.test.ts:
@bryance/orch test: (pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the grandchild stays alive and adoptable, and keeps its own provenance [240.43ms]
@bryance/orch test: (pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the grandparent holding the middle agent does not extend to the grandchild [231.16ms]
@bryance/orch test: 
@bryance/orch test: test\environment-dictates-what-is-possible.test.ts:
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > a move closes the interval it left, so history says WHERE it was and WHEN [178.94ms]
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > moving one axis leaves every other axis exactly where it was [246.73ms]
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > an UPGRADE is a NEW host_plexers row, not an overwrite of the old one [202.40ms]
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > re-declaring the SAME version is not an upgrade and opens no second row [186.96ms]
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > nothing anywhere records what an agent CAN do [169.07ms]
@bryance/orch test: 
@bryance/orch test: test\pack-gets-its-own-home.test.ts:
@bryance/orch test: (pass) a pack gets its own marked plexer home (E8, E9, E10) > the home orch opens is MARKED as orch's, never a bare directory name [193.17ms]
@bryance/orch test: (pass) a pack gets its own marked plexer home (E8, E9, E10) > a space's home and a pack's home use the SAME role and different tables [252.45ms]
@bryance/orch test: (pass) a pack gets its own marked plexer home (E8, E9, E10) > an environment that holds nothing answers with an absence, and stores none [181.42ms]
@bryance/orch test: (pass) a pack gets its own marked plexer home (E8, E9, E10) > a home recorded in another plexer is not this one's to drive [207.98ms]
@bryance/orch test: (pass) a pack gets its own marked plexer home (E8, E9, E10) > closing a pack's home clears the row, so the next open is a fresh one [232.80ms]
@bryance/orch test: 
@bryance/orch test: test\one-shape-only.test.ts:
@bryance/orch test: (pass) one current shape only > a live presence record with a malformed identity is a doctor failure [29.30ms]
@bryance/orch test: 
@bryance/orch test: test\errno-guard.test.ts:
@bryance/orch test: (pass) errnoCode reads a syscall error code, and only a real one > returns the code of a real node syscall error [0.32ms]
@bryance/orch test: (pass) errnoCode reads a syscall error code, and only a real one > a plain Error carries no code, so there is none to report [0.04ms]
@bryance/orch test: (pass) errnoCode reads a syscall error code, and only a real one > a non-object never yields a code instead of crashing on it [0.07ms]
@bryance/orch test: (pass) errnoCode reads a syscall error code, and only a real one > a code-shaped field of the wrong type is not a code [0.02ms]
@bryance/orch test: (pass) isAgentState verifies the state rather than asserting it > accepts a declared state [0.08ms]
@bryance/orch test: (pass) isAgentState verifies the state rather than asserting it > rejects anything not declared, including non-strings [0.05ms]
@bryance/orch test: 
@bryance/orch test: test\one-shape-only.test.ts:
@bryance/orch test: (pass) one current shape only > doctor backend reports have one detection spelling [38.55ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-roles.test.ts:
@bryance/orch test: (pass) adapter role composition > composes complete roles per adapter [0.37ms]
@bryance/orch test: (pass) adapter role composition > answers with zero exit code when a shim role is absent [0.18ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-session-env.test.ts:
@bryance/orch test: (pass) adapter-owned session environment > resolves each caller harness through the public session resolver [0.90ms]
@bryance/orch test: (pass) adapter-owned session environment > keeps harness env literals inside adapter modules [20.46ms]
@bryance/orch test: (pass) adapter-owned session environment > a registered adapter resolves a novel marker without resolver changes [0.46ms]
@bryance/orch test: 
@bryance/orch test: test\broker-daemon-hardening.test.ts:
@bryance/orch test: (pass) broker daemon hardening > concurrent drains do not redeliver one message id [244.60ms]
@bryance/orch test: (pass) broker daemon hardening > replay after the newest sequence is empty without a gap [180.17ms]
@bryance/orch test: (pass) broker daemon hardening > malformed request gets an error and the connection remains usable [45.54ms]
@bryance/orch test: 
@bryance/orch test: test\agent-key-is-minted-id.test.ts:
@bryance/orch test: (pass) a driving session mints an id, it is not placed by name > the key an interactive session addresses itself by is a bare minted id [12.57ms]
@bryance/orch test: 
@bryance/orch test: test\presence-schema.test.ts:
@bryance/orch test: (pass) presence status schema > reads a spawned identity without placement fields in status [436.69ms]
@bryance/orch test: 
@bryance/orch test: test\settings.test.ts:
@bryance/orch test: (pass) loadSettings > requires a top-level runtime and never defaults it [46.82ms]
@bryance/orch test: (pass) loadSettings > rejects an unrecognized runtime naming the accepted values [14.66ms]
@bryance/orch test: (pass) loadSettings > rejects a runtime misplaced under defaults [33.54ms]
@bryance/orch test: (pass) loadSettings > reads the declared runtime [12.26ms]
@bryance/orch test: (pass) loadSettings > parses every supported settings section [41.06ms]
@bryance/orch test: (pass) loadSettings > rejects a file without the current schemaVersion [9.94ms]
@bryance/orch test: (pass) loadSettings > rejects invalid JSON loudly [13.40ms]
@bryance/orch test: (pass) loadSettings > names the key path for invalid fields [21.09ms]
@bryance/orch test: (pass) loadSettings > rejects unknown settings keys [21.29ms]
@bryance/orch test: (pass) loadSettings > rejects removed spawn cap setting by name [23.76ms]
@bryance/orch test: (pass) loadSettings > parses models.allowed as a per-harness pattern map [24.80ms]
@bryance/orch test: (pass) loadSettings > rejects renamed fleet keys and loads their replacements [96.42ms]
@bryance/orch test: (pass) loadSettings > rejects old settings keys [84.80ms]
@bryance/orch test: (pass) loadSettings > rejects legacy notify type and unknown ids [47.18ms]
@bryance/orch test: (pass) loadSettings > applies every settings default when sections are absent [20.41ms]
@bryance/orch test: (pass) loadSettings > preserves configured values while defaulting each missing section value [17.46ms]
@bryance/orch test: (pass) loadSettings > rejects non-positive and non-integer retention windows [49.97ms]
@bryance/orch test: (pass) loadSettings > rejects a host without dest [13.91ms]
@bryance/orch test: (pass) loadSettings > rejects an unknown id in enabled.adapters [20.30ms]
@bryance/orch test: (pass) loadSettings > rejects defaults.adapter not present in enabled.adapters [21.44ms]
@bryance/orch test: (pass) loadSettings > rejects when settings.json is absent but a legacy config.toml exists [8.84ms]
@bryance/orch test: (pass) allowedModelPatterns > restricts nothing when settings contain no patterns [8.16ms]
@bryance/orch test: (pass) allowedModelPatterns > returns the configured patterns when set [22.98ms]
@bryance/orch test: (pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or enabled entry [12.89ms]
@bryance/orch test: (pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [19.76ms]
@bryance/orch test: (pass) writeSettingsRuntime > a different runtime replaces the single value in place [31.44ms]
@bryance/orch test: (pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [24.65ms]
@bryance/orch test: (pass) reapUnreadableSettings > leaves a readable file alone [23.11ms]
@bryance/orch test: (pass) writeSettingsEnabled > round-trips both provider arrays [39.73ms]
@bryance/orch test: (pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [58.09ms]
@bryance/orch test: (pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [35.03ms]
@bryance/orch test: (pass) writeSettingsDefault > is idempotent when rewriting the same value [44.65ms]
@bryance/orch test: (pass) writeSettingsDefault > refuses to write through an out-of-version settings file [6.84ms]
@bryance/orch test: (pass) writeSettingsDefault > switches defaults.adapter between two enabled ids and loads clean [28.17ms]
@bryance/orch test: (pass) writeSettingsFullTree > round-trips defaults without inventing max_agents_total [31.82ms]
@bryance/orch test: (pass) settings precedence > uses the fallback when env and settings.json omit a setting [9.46ms]
@bryance/orch test: (pass) settings precedence > uses the settings.json value over the fallback [14.90ms]
@bryance/orch test: (pass) settings precedence > uses the ORCH_* environment value over settings.json [6.94ms]
@bryance/orch test: (pass) settings precedence > uses an explicit flag override over the environment [0.23ms]
@bryance/orch test: (pass) resolveSetting > uses flag, environment coercion, settings, then fallback in precedence order [0.18ms]
@bryance/orch test: (pass) resolveWithSource > rejects an environment value with the wrong shape [0.23ms]
@bryance/orch test: (pass) resolveWithSource > reports the winning source at each precedence level [0.14ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > loadSettings parses a per-harness preferred quicklist [15.40ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > an absent preferred map normalizes to an empty map, not to allowed [8.40ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > writing one list leaves the other byte-for-value intact [67.83ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > an empty list is recorded as no list at all, so a cleared picker really clears [70.96ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > the full tree seeds both maps when absent and preserves both when present [185.49ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > the allowlist gate reads models.allowed only [27.09ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-names.test.ts:
@bryance/orch test: (pass) agent name validation > accepts lowercase names with hyphens and underscores [0.08ms]
@bryance/orch test: (pass) a live name is claimed and a dead one is released > a live agent holds its name against a second spawn [321.95ms]
@bryance/orch test: (pass) a live name is claimed and a dead one is released > a dead agent frees its name [252.69ms]
@bryance/orch test: (pass) a live name is claimed and a dead one is released > another space's agent never blocks a name here [257.50ms]
@bryance/orch test: (pass) name scope follows the agent's current space, not its birthplace > moving an agent moves the name it holds [246.11ms]
@bryance/orch test: (pass) name scope follows the agent's current space, not its birthplace > the collision names the agent by its minted id [183.62ms]
@bryance/orch test: 
@bryance/orch test: test\pack-membership.test.ts:
@bryance/orch test: (pass) a pack is the provenance root > a registered session is an orch of a pack of one [255.64ms]
@bryance/orch test: 
@bryance/orch test: test\one-spelling-per-fact.test.ts:
@bryance/orch test: (pass) one spelling per shared fact > osSide and the store agree for an injected Windows platform [141.23ms]
@bryance/orch test: 
@bryance/orch test: test\vocabulary.test.ts:
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > a role is derived from the tree, never stored [288.80ms]
@bryance/orch test: 
@bryance/orch test: test\event-identity.test.ts:
@bryance/orch test: (pass) published event identity > stamps a per-agent ordinal so a redelivery is recognizable [1.07ms]
@bryance/orch test: 
@bryance/orch test: test\store-queue.test.ts:
@bryance/orch test: (pass) queue facade storage > retention deletes only settled tasks older than the cutoff [242.05ms]
@bryance/orch test: (pass) queue facade storage > retention never removes a queued task based on its age [197.10ms]
@bryance/orch test: (pass) queue facade storage > agent-scoped tasks become unrunnable when their agent ends [189.69ms]
@bryance/orch test: (pass) queue facade storage > completed tasks stay done after their scope agent ends [213.38ms]
@bryance/orch test: (pass) queue facade storage > a dead orch does not make a pack task unrunnable while a member lives [213.64ms]
@bryance/orch test: (pass) queue facade storage > pack-scoped tasks become unrunnable when every pack member ends [332.97ms]
@bryance/orch test: 
@bryance/orch test: test\setup-flags.test.ts:
@bryance/orch test: (pass) setup model flags > rejects a bare model when multiple harnesses are selected [0.34ms]
@bryance/orch test: (pass) setup model flags > binds each model flag to its own harness [0.10ms]
@bryance/orch test: (pass) setup model flags > allows a bare model for one harness [0.02ms]
@bryance/orch test: (pass) setup model flags > rejects a model bound to an unselected harness [0.11ms]
@bryance/orch test: (pass) setup model flags > rejects duplicate model flags for one harness [0.07ms]
@bryance/orch test: 
@bryance/orch test: test\setup-io.test.ts:
@bryance/orch test: (pass) setup prompt answer validation > refuses a single answer that was not offered [0.25ms]
@bryance/orch test: (pass) setup prompt answer validation > refuses multi-select answers containing an unoffered value [0.12ms]
@bryance/orch test: 
@bryance/orch test: test\one-spelling-per-fact.test.ts:
@bryance/orch test: (pass) one spelling per shared fact > the shared record guard rejects arrays and null [0.14ms]
@bryance/orch test: (pass) one spelling per shared fact > removed identity method has no source spelling [26.27ms]
@bryance/orch test: (pass) one spelling per shared fact > settings reads have no literal fallbacks [24.94ms]
@bryance/orch test: (pass) one spelling per shared fact > launch env has one spelling [107.10ms]
@bryance/orch test: (pass) one spelling per shared fact > removed spawn cap has no source or README spelling [18.89ms]
@bryance/orch test: 
@bryance/orch test: test\settings-shell.test.ts:
@bryance/orch test: (pass) settings shell decisions > an overridden setting is refused with the winner named [0.53ms]
@bryance/orch test: (pass) settings shell decisions > an overridden setting cannot be written [615.86ms]
@bryance/orch test: (pass) settings shell decisions > registered writes use the registry entry [33.43ms]
@bryance/orch test: (pass) settings shell decisions > registry exposes writable subcommand entries [0.42ms]
@bryance/orch test: 
@bryance/orch test: test\no-daemon-commands.test.ts:
@bryance/orch test: (pass) commands that need no daemon need no identity > orch help registers no agent and starts no daemon [546.10ms]
@bryance/orch test: 
@bryance/orch test: test\claude-hooks-shim.test.ts:
@bryance/orch test: (pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [170.27ms]
@bryance/orch test: (pass) claude-hooks shim > under node > writes status.json for a valid key [250.03ms]
@bryance/orch test: (pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no launch env) [166.65ms]
@bryance/orch test: (pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [69.70ms]
@bryance/orch test: (pass) claude-hooks shim > under bun > writes status.json for a valid key [90.60ms]
@bryance/orch test: (skip) claude-hooks shim tests need the dist bundle
@bryance/orch test: 
@bryance/orch test: test\setup-notifiers.test.ts:
@bryance/orch test: (pass) notifier setup logic > probes the built-in adapters [17.69ms]
@bryance/orch test: 
@bryance/orch test: test\claude-hooks.test.ts:
@bryance/orch test: (pass) Claude hook command > gates execution on the launch environment variable [9.03ms]
@bryance/orch test: 
@bryance/orch test: test\store-rebuild-schema.test.ts:
@bryance/orch test: (pass) rebuild schema > rebuild DDL inventory is exact [149.07ms]
@bryance/orch test: 
@bryance/orch test: test\setup-notifiers.test.ts:
@bryance/orch test: (pass) notifier setup logic > lists unavailable notifiers with remediation and disables selection [0.47ms]
@bryance/orch test: (pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.39ms]
@bryance/orch test: (pass) notifier setup logic > renders a command entry that loadSettings can parse [44.75ms]
@bryance/orch test: (pass) notifier setup logic > builds valid entries and reports invalid selections [2.18ms]
@bryance/orch test: 
@bryance/orch test: test\agent-view.test.ts:
@bryance/orch test: (pass) the agent composer > each axis composes independently, and moving one leaves identity untouched [222.31ms]
@bryance/orch test: (pass) the agent composer > tuning is not environment: it survives a move [215.98ms]
@bryance/orch test: (pass) the agent composer > ownership reads as a live lease, and a released one is not ownership [205.89ms]
@bryance/orch test: (pass) the agent composer > provenance is on the view and is not the same fact as ownership [183.75ms]
@bryance/orch test: (pass) the agent composer > provenance carries the spawner's name, read as a join and never stored twice [217.98ms]
@bryance/orch test: (pass) the agent composer > an agent with no spawner reports no spawner name [142.42ms]
@bryance/orch test: (pass) the agent composer > agentViews is oldest-first and liveAgentViews drops ended agents [158.10ms]
@bryance/orch test: (pass) the agent composer > the axis list is the only place every axis is enumerated [0.59ms]
@bryance/orch test: (pass) the agent composer > the composed shape is exactly the axis list, with nothing extra and nothing missing [175.09ms]
@bryance/orch test: (pass) the agent composer > an unknown agent is null, never an empty shell [180.87ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a named space is orch's own id, and the workspace is its RECORDED home [236.92ms]
@bryance/orch test: 
@bryance/orch test: test\settings-thinking.test.ts:
@bryance/orch test: (pass) orch settings thinking > writes the global default and reads back through loadSettings [39.58ms]
@bryance/orch test: 
@bryance/orch test: test\vocabulary.test.ts:
@bryance/orch test: 113 |         offenders.push(`${file}: ${match[0]}`);
@bryance/orch test: 114 |       }
@bryance/orch test: 115 |     }
@bryance/orch test: 116 |     // Every one of these must build its text from `term()`, or the day Bryan
@bryance/orch test: 117 |     // renames "slave" the word survives in half the messages.
@bryance/orch test: 118 |     expect(offenders).toEqual([]);
@bryance/orch test:                             ^
@bryance/orch test: error: expect(received).toEqual(expected)
@bryance/orch test: 
@bryance/orch test: - []
@bryance/orch test: + [
@bryance/orch test: +   
@bryance/orch test: + "C:/dev/personal/orch/packages/orch/src/policy/vocabulary.ts: ",
@bryance/orch test: +   
@bryance/orch test: +   slave: ""
@bryance/orch test: + ,
@bryance/orch test: +   "C:/dev/personal/orch/packages/orch/src/policy/vocabulary.ts: "slave"",
@bryance/orch test: +   "C:/dev/personal/orch/packages/orch/src/types/policy.ts: "slave"",
@bryance/orch test: + ]
@bryance/orch test: 
@bryance/orch test: - Expected  - 1
@bryance/orch test: + Received  + 9
@bryance/orch test: 
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\vocabulary.test.ts:118:23)
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > no table carries a role column: there is nothing to disagree with the tree [130.58ms]
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > renaming an agent or moving its lease never changes its role [208.83ms]
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > every role term orch displays comes from the one map [0.15ms]
@bryance/orch test: (fail) vocabulary is a display map, and a role is tree position > no module outside the map spells a role term into a user-facing string [58.11ms]
@bryance/orch test: 
@bryance/orch test: test\event-identity.test.ts:
@bryance/orch test: (pass) the work loop is not a second presence-transition source > an agent state change publishes nothing from the queue loop [348.53ms]
@bryance/orch test: 
@bryance/orch test: test\ambiguous-target-says-what-to-do.test.ts:
@bryance/orch test: (pass) an ambiguous target names the failure and the way out (U3) > the message names the failure, the target string, and every candidate [0.13ms]
@bryance/orch test: (pass) an ambiguous target names the failure and the way out (U3) > it says what to send instead, so the caller is not left guessing [0.08ms]
@bryance/orch test: (pass) an ambiguous target names the failure and the way out (U3) > it is a refusal, not an exit ΓÇö the caller can act on it [0.04ms]
@bryance/orch test: (pass) an ambiguous target names the failure and the way out (U3) > resolveAgentView raises that same one message [0.58ms]
@bryance/orch test: 
@bryance/orch test: test\wall-single-owner.test.ts:
@bryance/orch test: (pass) space wall ownership > keeps the wall decision primitive in one source module [62.93ms]
@bryance/orch test: 
@bryance/orch test: test\events-scope-notice.test.ts:
@bryance/orch test: (pass) events scope notice > names the default live scope and its wideners [0.26ms]
@bryance/orch test: (pass) events scope notice > names the all-agent live scope and its history widener [0.02ms]
@bryance/orch test: (pass) events scope notice > does not announce when history was requested [0.02ms]
@bryance/orch test: (pass) events scope notice > writes one notice before starting the live transport [0.09ms]
@bryance/orch test: (pass) events scope notice > does not write a notice when history was requested [0.03ms]
@bryance/orch test: (pass) events scope notice > does not announce when explicit targets were requested [0.05ms]
@bryance/orch test: 
@bryance/orch test: test\web-projection.test.ts:
@bryance/orch test: (pass) web fleet projection > uses the orch agent name and falls back to its minted id, never the plexer agent name [1.84ms]
@bryance/orch test: (pass) web fleet projection > uses the orch space name and never exposes the plexer space id [0.17ms]
@bryance/orch test: (pass) web fleet projection > unscoped agents use a neutral space label when no orch space exists [0.70ms]
@bryance/orch test: (pass) web fleet projection > history groups ended agents by provenance root, never by their leases [0.21ms]
@bryance/orch test: (pass) web fleet projection > live projection excludes ended rows and keeps unleased live agents out of history [0.15ms]
@bryance/orch test: (pass) live views group by lease (C7) > a space encompasses its orchs, and each orch encompasses the agents it holds [0.20ms]
@bryance/orch test: (pass) live views group by lease (C7) > an ADOPTED agent is filed under the orch holding it now, never under its spawner [0.09ms]
@bryance/orch test: (pass) live views group by lease (C7) > an UNHELD agent is grouped as unheld, not hidden and not invented an orch [0.09ms]
@bryance/orch test: (pass) live views group by lease (C7) > the space still lists every live agent flat, so the lease grouping adds a level and hides nothing [0.10ms]
@bryance/orch test: (pass) live views group by lease (C7) > history does NOT gain a lease level: a pack stays grouped by provenance [0.09ms]
@bryance/orch test: (pass) the orphan bucket holds every undriven agent (G9) > a lease whose holder is DEAD is an orphan, not live work [0.14ms]
@bryance/orch test: (pass) the orphan bucket holds every undriven agent (G9) > an agent with no lease at all is still an orphan [0.07ms]
@bryance/orch test: (pass) the orphan bucket holds every undriven agent (G9) > the two buckets never overlap and never lose an agent [0.23ms]
@bryance/orch test: (pass) the orphan bucket holds every undriven agent (G9) > a dead holder is not shown as an orch driving work in the lease grouping either [0.06ms]
@bryance/orch test: 
@bryance/orch test: test\one-writer-records-a-spawned-agent.test.ts:
@bryance/orch test: (pass) one writer records a spawned agent (2.1) > registerSpawnedAgent alone writes the COMPLETE record ΓÇö space and lease included [248.37ms]
@bryance/orch test: 
@bryance/orch test: test\settings-thinking.test.ts:
@bryance/orch test: thinking  xhigh
@bryance/orch test: thinking (pi)  low
@bryance/orch test: (pass) orch settings thinking > writes a per-harness override without disturbing the global default [36.99ms]
@bryance/orch test: (pass) orch settings thinking > the command sets the level a user names [30.73ms]
@bryance/orch test: (pass) orch settings thinking > the command sets a per-harness level with --harness [26.40ms]
@bryance/orch test: (pass) orch settings thinking > a level orch does not know is refused, naming the valid levels [14.62ms]
@bryance/orch test: (pass) orch settings thinking > clearing a per-harness override falls back to the global default [35.91ms]
@bryance/orch test: 
@bryance/orch test: test\cmd-lock-is-never-half-created.test.ts:
@bryance/orch test: (pass) the command lock file is never observable half-created > a reader racing acquire/release never sees an existing but incomplete lock [2220.01ms]
@bryance/orch test: 
@bryance/orch test: test\setup-smoke.test.ts:
@bryance/orch test: (pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [0.65ms]
@bryance/orch test: (pass) runSetupSmoke (12.5) > the agent is launched on the prompt it built [0.12ms]
@bryance/orch test: (pass) runSetupSmoke (12.5) > an agent that launches but yields no result times out and fails non-zero [2.27ms]
@bryance/orch test: (pass) runSetupSmoke (12.5) > a rejected spawn fails loudly and never polls for a result [2.59ms]
@bryance/orch test: 
@bryance/orch test: test\cmd-lock-is-never-half-created.test.ts:
@bryance/orch test: (pass) the command lock file is never observable half-created > createFileExclusively refuses a taken path and leaves no staging file behind [12.33ms]
@bryance/orch test: 
@bryance/orch test: test\settings-view.test.ts:
@bryance/orch test: (pass) settings view > visibleEntryIndices matches key and group case-insensitively [0.42ms]
@bryance/orch test: (pass) settings view > windowBounds keeps the focus inside the budget and clamps at both ends [0.12ms]
@bryance/orch test: (pass) settings view > frame shows group headers, values, provenance tags, and the focused help [0.85ms]
@bryance/orch test: (pass) settings view > frame with a filter narrows the list and draws the filter line [0.18ms]
@bryance/orch test: (pass) settings view > frame reports an empty filter match instead of a blank screen [0.08ms]
@bryance/orch test: (pass) settings view > a long list is windowed with more-above/more-below markers [14.15ms]
@bryance/orch test: (pass) settings view > overlays render choices, checkboxes, and input with error [0.33ms]
@bryance/orch test: (pass) settings view > a checkbox row shows what its choice carries [0.06ms]
@bryance/orch test: (pass) settings view > displayValue keeps scalars bare and JSON-encodes shapes [0.04ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [32.78ms]
@bryance/orch test: (pass) answer via the control dispatcher > answers, rather than failing, when the adapter composes no question role [25.39ms]
@bryance/orch test: (pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [32.56ms]
@bryance/orch test: 
@bryance/orch test: test\setup-wizard.test.ts:
@bryance/orch test: (pass) setup model picker > switches large catalogues to searchable bounded mode and preserves effort [0.64ms]
@bryance/orch test: (pass) setup model picker > keeps the compact selector for small catalogues [0.20ms]
@bryance/orch test: (pass) setup model list picker > large catalogues use the bounded searchable multiselect [0.41ms]
@bryance/orch test: (pass) setup model list picker > the prompt names both jobs the list does, and that an empty one forbids nothing [0.19ms]
@bryance/orch test: (pass) setup model list picker > stored values start checked, and clearing them returns an empty selection [0.26ms]
@bryance/orch test: 
@bryance/orch test: test\work-loop-binding.test.ts:
@bryance/orch test: (pass) work loop attempt binding > statusSpeaksForTask verifies the current attempt dispatch id [0.79ms]
@bryance/orch test: 
@bryance/orch test: test\settings-watch.test.ts:
@bryance/orch test: (pass) watchSettings > loads initially and applies a valid edit after the debounce [61.92ms]
@bryance/orch test: 
@bryance/orch test: test\retention.test.ts:
@bryance/orch test: (pass) retention sweep > uses each table's own window and keeps queued and claimed tasks [427.15ms]
@bryance/orch test: (pass) retention sweep > returns zero counts when every row is inside its window [230.53ms]
@bryance/orch test: (pass) retention sweep > continues sweeping when one table delete fails [198.98ms]
@bryance/orch test: (pass) retention sweep > reaps expired agents by identity, taking every satellite with them [191.40ms]
@bryance/orch test: (pass) retention sweep > reaps dead dirs by recorded instants, not a fresh directory mtime [155.93ms]
@bryance/orch test: (pass) retention sweep > keeps dead dirs with a newer recorded instant despite an old mtime [136.12ms]
@bryance/orch test: (pass) retention sweep > reaps malformed dead dirs with no recorded instant [140.38ms]
@bryance/orch test: (pass) retention sweep > keeps result-only recorded instant despite an old mtime [136.83ms]
@bryance/orch test: (pass) retention sweep > never reaps a live presence dir regardless of age [116.12ms]
@bryance/orch test: (pass) retention sweep > sweeps old logs but preserves logs for live agents [133.72ms]
@bryance/orch test: 
@bryance/orch test: test\every-agent-has-an-inbox.test.ts:
@bryance/orch test: (pass) every agent has an inbox > a paned agent and a capless one are delivered to identically [384.11ms]
@bryance/orch test: 
@bryance/orch test: test\retention.test.ts:
@bryance/orch test: (pass) retention sweep > does not sweep again one minute after the first tick [219.37ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [236.31ms]
@bryance/orch test: 
@bryance/orch test: test\one-writer-records-a-spawned-agent.test.ts:
@bryance/orch test: (pass) one writer records a spawned agent (2.1) > a spawn leaves NOTHING for a second writer to fill in [203.48ms]
@bryance/orch test: (pass) one writer records a spawned agent (2.1) > a spawn into NO space records no space and hands the plexer only its coordinate [213.11ms]
@bryance/orch test: (pass) one writer records a spawned agent (2.1) > the presence store no longer offers a second way to record an agent [0.50ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-reconnect.test.ts:
@bryance/orch test: (pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [2450.02ms]
@bryance/orch test: 
@bryance/orch test: test\orch-bugs-4-5.test.ts:
@bryance/orch test: (pass) orch bugs 4 and 5 launch contracts > interactive launch routes use one argv composition [0.52ms]
@bryance/orch test: (pass) orch bugs 4 and 5 launch contracts > headless launch routes use one argv composition [0.11ms]
@bryance/orch test: (pass) orch bugs 4 and 5 launch contracts > inherited extension policy emits every discovered extension [0.07ms]
@bryance/orch test: 
@bryance/orch test: test\pack-membership.test.ts:
@bryance/orch test: (pass) a pack is the provenance root > membership is inherited from the spawner at any depth, never re-rooted [180.46ms]
@bryance/orch test: (pass) a pack is the provenance root > every agent is in exactly one pack, and two packs never share a member [253.93ms]
@bryance/orch test: (pass) a pack is the provenance root > a pack of one grows without re-rooting, and the root stays the orch [289.81ms]
@bryance/orch test: (pass) a pack is the provenance root > a lease or a move never changes which pack an agent is in [209.41ms]
@bryance/orch test: (pass) a pack is the provenance root > an agent cannot be spawned by someone who does not exist [154.95ms]
@bryance/orch test: 
@bryance/orch test: test\work-loop-binding.test.ts:
@bryance/orch test: (pass) Cq4: results go to the enqueuer, not the runner > every task event the work loop publishes is keyed to whoever enqueued it [338.81ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-lifecycle.test.ts:
@bryance/orch test: (pass) daemon lifecycle > acquires once and refuses a second live owner [2828.02ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) answer over the daemon control socket > refuses a cross-space answer at the daemon wall [239.64ms]
@bryance/orch test: 
@bryance/orch test: test\retention.test.ts:
@bryance/orch test: (pass) retention sweep > prunes orch's own logs past the age cap [133.19ms]
@bryance/orch test: (pass) retention sweep > prunes orch's own logs past the size cap even when freshly written [140.09ms]
@bryance/orch test: 
@bryance/orch test: test\parse-target.test.ts:
@bryance/orch test: (pass) <host>/<target> grammar > keeps targets without a host unchanged [0.33ms]
@bryance/orch test: (pass) <host>/<target> grammar > parses configured host prefixes [0.11ms]
@bryance/orch test: (pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.29ms]
@bryance/orch test: (pass) <host>/<target> grammar > rejects empty hosts and targets [0.06ms]
@bryance/orch test: (pass) <host>/<target> grammar > formats local and host-prefixed targets [0.07ms]
@bryance/orch test: 
@bryance/orch test: test\skew-guard.test.ts:
@bryance/orch test: (pass) CLI daemon skew guard > refuses mutating commands and names both hashes plus the reload remedy [322.77ms]
@bryance/orch test: 
@bryance/orch test: test\presence-schema.test.ts:
@bryance/orch test: (pass) presence status schema > orch status JSON exposes the agent status fields [158.03ms]
@bryance/orch test: (pass) presence status schema > status and list report the same agent identity [284.92ms]
@bryance/orch test: (pass) presence status schema > mixed pi and Claude status rows carry the same status field set [137.24ms]
@bryance/orch test: (pass) presence status schema > rejects a status record that carries no schema stamp [108.81ms]
@bryance/orch test: (pass) presence status schema > rejects a status record stamped with a non-current schema [117.66ms]
@bryance/orch test: (pass) presence status schema > rejects a current-schema record carrying placement fields [210.88ms]
@bryance/orch test: (pass) presence status schema > a malformed record is skipped without hiding the valid records beside it [147.01ms]
@bryance/orch test: (pass) presence status schema > the four facts are recorded apart and composed back onto the minted id [151.59ms]
@bryance/orch test: 
@bryance/orch test: test\settings-watch.test.ts:
@bryance/orch test: (pass) watchSettings > keeps the last-good settings, warns once, and recovers [408.39ms]
@bryance/orch test: (pass) watchSettings > reloads on a touched reload.signal without a settings edit [46.15ms]
@bryance/orch test: 
@bryance/orch test: test\provenance.test.ts:
@bryance/orch test: (pass) the one provenance walk > ancestors are parent-first, root last [0.21ms]
@bryance/orch test: (pass) the one provenance walk > depth counts hops to the root [0.07ms]
@bryance/orch test: (pass) the one provenance walk > an unknown id is its own root at depth 0 [0.01ms]
@bryance/orch test: (pass) the one provenance walk > an unknown parent ends the chain instead of throwing [0.05ms]
@bryance/orch test: (pass) the one provenance walk > descendant is any depth, never self, never a sibling tree [0.06ms]
@bryance/orch test: (pass) the one provenance walk > a cycle terminates [0.04ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > with no space, orch INSIDE the plexer spawns beside itself and opens nothing [147.99ms]
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a caller INSIDE the plexer with NO orch identity (a human's pane) spawns beside itself [143.60ms]
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > with no space and orch OUTSIDE the plexer, the PACK gets its own marked home [208.69ms]
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > the same pack spawning again reuses its home and asks the human nothing [184.32ms]
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > an environment that holds nothing answers with an absence, never a refusal [174.43ms]
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a space with no home HERE places the fleet without borrowing another plexer's [147.51ms]
@bryance/orch test: 
@bryance/orch test: test\peer-identity.test.ts:
@bryance/orch test: (pass) spawner identity > a bare operator with no session markers is just the operator [7.93ms]
@bryance/orch test: 
@bryance/orch test: test\cross-pack-result-delivery.test.ts:
@bryance/orch test: (pass) results go to the enqueuer across packs (Cq4) > a result reaches the FOREIGN enqueuer's inbox, not the runner's [299.28ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-policy.test.ts:
@bryance/orch test: (pass) spawn policy caps > launch env uses the minted agent id name [0.25ms]
@bryance/orch test: 
@bryance/orch test: test\work-loop-identity.test.ts:
@bryance/orch test: (pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > a claim records the minted agent id, not the presence key [239.19ms]
@bryance/orch test: 
@bryance/orch test: test\every-agent-has-an-inbox.test.ts:
@bryance/orch test: (pass) every agent has an inbox > the inbox is at one derived path, whatever the agent's environment [251.31ms]
@bryance/orch test: (pass) every agent has an inbox > delivery stamps an id and a timestamp on every message, for every agent [180.75ms]
@bryance/orch test: (pass) every agent has an inbox > delivery is refused for a disconnected bridge, not for a missing pane [209.18ms]
@bryance/orch test: 
@bryance/orch test: test\queue-cli-scope.test.ts:
@bryance/orch test: (pass) Cq2: all three scopes are choosable at enqueue > --agent, --pack and --space each select exactly one typed scope [223.16ms]
@bryance/orch test: 
@bryance/orch test: test\status-unleased.test.ts:
@bryance/orch test: (pass) status owner rendering > leased by a live holder shows that holder [2935.11ms]
@bryance/orch test: 
@bryance/orch test: test\settings-watch.test.ts:
@bryance/orch test: (pass) watchSettings > stop prevents further callbacks [447.38ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-policy.test.ts:
@bryance/orch test: (pass) spawn policy caps > worker prompt depth > root worker maySpawn follows max_depth [17.42ms]
@bryance/orch test: (pass) spawn policy caps > allows a pack spawn while under the cap [1.13ms]
@bryance/orch test: (pass) spawn policy caps > blocks an at-cap spawn and offers dispatch or the pack queue [0.23ms]
@bryance/orch test: (pass) spawn policy caps > a slave may not spawn by default: fleet.max_depth is 1 [0.09ms]
@bryance/orch test: (pass) spawn policy caps > fleet.max_depth 2 lets a slave spawn and refuses its child [0.14ms]
@bryance/orch test: (pass) spawn policy caps > reads a pack cap override from settings [30.26ms]
@bryance/orch test: (pass) spawn policy caps > a refused cmdSpawn makes no name, worktree, registry, or queue mutation [229.68ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-transport-parity.test.ts:
@bryance/orch test: (pass) both transports carry one mechanism > a bound TCP port does not displace the unix socket or become its own service [39.83ms]
@bryance/orch test: (pass) both transports carry one mechanism > the credential is demanded identically on both [40.15ms]
@bryance/orch test: 
@bryance/orch test: test\hello-environment.test.ts:
@bryance/orch test: (pass) hello records the environment in full > the plexer the caller registered in is on the agent, not only on the host [231.25ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-transport-parity.test.ts:
@bryance/orch test: (pass) both transports carry one mechanism > a missing credential is refused identically on both [37.10ms]
@bryance/orch test: 
@bryance/orch test: test\queue.test.ts:
@bryance/orch test: (pass) queue facade on tasks and attempts > enqueue selects exactly one typed scope and defaults to the enqueuer pack [257.30ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > agent scope requires the enqueuer to lease the target [247.48ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq1: the gate is on enqueuing into a scope, and adoption earns it [297.71ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq1: a pack drains its queue with its orch dead and no lease in force [213.84ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > claiming excludes another pack and space claims require open intake [209.66ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq3: a space-scoped task is an offer, and only an opted-in pack consumes it [261.90ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > a failed pack attempt retries on another member, never outside the pack [223.64ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq5: an agent-scoped binding is to the agent and survives adoption [250.42ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq13: adoption carries the queue ΓÇö pack work comes with the agents [230.24ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > a claim is an insert and a lost race returns false [212.92ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > cancel rights are enqueuer, targeted agent's leasing orch, or human [245.67ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq7: origin_workspace is gone from the tasks table, scope replaces it [189.64ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > state and attempt-derived values have no legacy flattened fields [209.10ms]
@bryance/orch test: 
@bryance/orch test: test\work-loop-identity.test.ts:
@bryance/orch test: (pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > an idle process with no registered agent row is never handed pack work [203.22ms]
@bryance/orch test: (pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > Cq1: the pack drains its own queue with its orch dead and no lease in force [238.31ms]
@bryance/orch test: 
@bryance/orch test: test\broker-governance.test.ts:
@bryance/orch test: (pass) daemon governWrite enforcement > an unscoped actor is refused while a live orch holds the lease [1985.08ms]
@bryance/orch test: 
@bryance/orch test: test\reap-picker.test.ts:
@bryance/orch test: (pass) reapCandidates > classifies unleased dead holders and leased dead processes [0.59ms]
@bryance/orch test: 
@bryance/orch test: test\cross-pack-result-delivery.test.ts:
@bryance/orch test: (pass) results go to the enqueuer across packs (Cq4) > the delivered line carries the result payload, not just a notification [214.03ms]
@bryance/orch test: (pass) results go to the enqueuer across packs (Cq4) > a FAILED task still reports back ΓÇö silence is the worst outcome [238.35ms]
@bryance/orch test: (pass) results go to the enqueuer across packs (Cq4) > an enqueuer with no inbox is not an error ΓÇö delivery is best-effort, the task stays settled [194.67ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-reconnect.test.ts:
@bryance/orch test: (pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1214.81ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-preferred-models.test.ts:
@bryance/orch test: (pass) the preferred quicklist reaches every launch route > a pane spawn hands the exact array to the backend [212.83ms]
@bryance/orch test: 
@bryance/orch test: test\queue-cli-scope.test.ts:
@bryance/orch test: (pass) Cq2: all three scopes are choosable at enqueue > a name resolves to one id, and an ambiguous name asks for the id [196.01ms]
@bryance/orch test: (pass) Cq2: all three scopes are choosable at enqueue > two scope flags at once are refused [199.74ms]
@bryance/orch test: (pass) Cq9: reading the queue is open > listing and history carry no caller and hide no other pack's work [210.10ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-credential.test.ts:
@bryance/orch test: (skip) the token file is the whole credential > the token is 0600
@bryance/orch test: (skip) the token file is the whole credential > $ORCH_DIR is 0700, so same-uid is a boundary the filesystem enforces
@bryance/orch test: (skip) the token file is the whole credential > a token left loose by an earlier run is tightened, not trusted
@bryance/orch test: (skip) the token file is the whole credential > a runtime directory the daemon creates is 0700 too
@bryance/orch test: 
@bryance/orch test: test\work-notify.test.ts:
@bryance/orch test: (pass) orch presence notifications > delivers a presence transition through a configured command sink [184.52ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-credential.test.ts:
@bryance/orch test: (pass) the token file is the whole credential > nothing else is enrolled: there is no allowlist beside the token [39.96ms]
@bryance/orch test: 
@bryance/orch test: test\reap-picker.test.ts:
@bryance/orch test: (pass) reapCandidates > classifies empty input [0.07ms]
@bryance/orch test: (pass) cmdReap > prints the --dead --json result shape [202.49ms]
@bryance/orch test: (pass) cmdReap > refuses bare reap when stdin is not a TTY [0.76ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-replay.test.ts:
@bryance/orch test: (pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [182.85ms]
@bryance/orch test: 
@bryance/orch test: test\peer-identity.test.ts:
@bryance/orch test: (pass) spawner identity > an unregistered Claude Code session is labelled by its harness, with no id [3.88ms]
@bryance/orch test: (pass) spawner identity > a session orch has registered IS addressable, by the id orch minted [221.13ms]
@bryance/orch test: (pass) spawner identity > an unregistered session has no id to hand out, and does not invent one [5.02ms]
@bryance/orch test: (pass) spawner identity > an orch-spawned orchestrator acts as the id orch minted for it [205.22ms]
@bryance/orch test: (pass) spawner identity > agentIdentityEnv stamps a reply address only when the spawner has one [0.68ms]
@bryance/orch test: (pass) spawner identity > worktreeEnv stamps worktree identity only for isolated agents [0.56ms]
@bryance/orch test: (pass) spawner identity > the registry keeps the exact spawning session distinct from the lease holder [224.92ms]
@bryance/orch test: (pass) the spawner address invariant > an UNREGISTERED session stamps no address, so no worker is handed an unreachable one [5.75ms]
@bryance/orch test: (pass) the spawner address invariant > a bare operator stamps no address [4.51ms]
@bryance/orch test: (pass) the spawner address invariant > an address that IS stamped resolves to a live inbox [189.52ms]
@bryance/orch test: (pass) peer identity in messaging > peer summaries render an unplaced agent without a local place name [25.32ms]
@bryance/orch test: (pass) peer identity in messaging > orch_send reports the peer's NAME, and stamps the sender's name on the message [42.43ms]
@bryance/orch test: (pass) peer identity in messaging > peers resolve by display name exactly like by key [22.02ms]
@bryance/orch test: (pass) peer identity in messaging > "spawner" reaches the stamped spawner session across fleet scoping [28.75ms]
@bryance/orch test: (pass) peer identity in messaging > a spawner with no inbox is refused BY NAME, not with a bare key [6.27ms]
@bryance/orch test: 
@bryance/orch test: test\work-survives-its-spawner.test.ts:
@bryance/orch test: (pass) work survives its spawner, always (D1) > ending the spawner leaves the child live, unended and still listed [207.81ms]
@bryance/orch test: 
@bryance/orch test: test\queue-reaping.test.ts:
@bryance/orch test: (pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > a failed task whose scope is gone is unrunnable and survives every retention sweep [259.82ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-preferred-models.test.ts:
@bryance/orch test: (pass) the preferred quicklist reaches every launch route > an unconfigured quicklist stays empty rather than becoming a default one [216.72ms]
@bryance/orch test: (pass) the preferred quicklist reaches every launch route > the previewed command is the command a launch runs [0.75ms]
@bryance/orch test: (pass) the preferred quicklist reaches every launch route > a headless launch forwards the quicklist into the adapter's own options [199.82ms]
@bryance/orch test: (pass) orchd rules on the quicklist it is sent > accepts an absent value and an array of specs [0.25ms]
@bryance/orch test: (pass) orchd rules on the quicklist it is sent > refuses a joined string or a blank entry instead of coercing it [0.38ms]
@bryance/orch test: 
@bryance/orch test: test\reap-walks-provenance.test.ts:
@bryance/orch test: (pass) reap walks the provenance tree (H3) > an ended agent with a still-present descendant is NOT reaped [259.60ms]
@bryance/orch test: 
@bryance/orch test: test\hello-environment.test.ts:
@bryance/orch test: (pass) hello records the environment in full > the space the caller registered in is recorded at hello, not inferred later [188.65ms]
@bryance/orch test: (pass) hello records the environment in full > a session in no space and no plexer records neither, and that is an answer [173.84ms]
@bryance/orch test: (pass) hello records the environment in full > re-registering the same session does not re-root or re-place it [226.64ms]
@bryance/orch test: (pass) hello records the environment in full > the claim carries every environment fact hello has to record [208.43ms]
@bryance/orch test: 
@bryance/orch test: test\agent-key-is-minted-id.test.ts:
@bryance/orch test: (pass) a driving session mints an id, it is not placed by name > the presence directory is named by that id alone [20.83ms]
@bryance/orch test: (pass) a driving session mints an id, it is not placed by name > a launch that handed over a minted id is used verbatim [10.80ms]
@bryance/orch test: (pass) this process's own identity is the id and nothing else > a spawned agent answers with the id its launch handed it [1.40ms]
@bryance/orch test: (pass) the fleet wall is lifted by the absence of a launch, not by a key's shape > an agent orch launched may not cross into another project's fleet [174.27ms]
@bryance/orch test: (pass) who drives an agent is looked up by its id > the key IS the agent id ΓÇö no segment is split out of it [1757.48ms]
@bryance/orch test: (pass) who drives an agent is looked up by its id > a composite key addresses no agent at all [797.89ms]
@bryance/orch test: (pass) doctor reads a presence directory name as an id > a composite directory name is a malformed identity key [20.94ms]
@bryance/orch test: (pass) doctor reads a presence directory name as an id > a minted id with a current stamp is well formed [9.52ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) answer over the daemon control socket > refuses an answer from outside the lease, naming the holder [1585.86ms]
@bryance/orch test: 
@bryance/orch test: test\backend-headless.test.ts:
@bryance/orch test: (pass) HeadlessBackend > refuses to spawn with no prompt ΓÇö a headless agent runs its prompt and exits [3.26ms]
@bryance/orch test: 
@bryance/orch test: test\work-survives-its-spawner.test.ts:
@bryance/orch test: (pass) work survives its spawner, always (D1) > a grandchild is untouched when the middle agent ends [178.03ms]
@bryance/orch test: (pass) work survives its spawner, always (D1) > the store has no lifetime column and no fate-sharing flag anywhere [0.80ms]
@bryance/orch test: (pass) work survives its spawner, always (D1) > spawn offers no flag that decides whether work outlives its spawner [2.04ms]
@bryance/orch test: (pass) work survives its spawner, always (D1) > closing the spawner never writes an ending for anything it spawned [173.47ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-registry.test.ts:
@bryance/orch test: (pass) spawn agent registration > writes the hub, environment, tuning, and lease [221.45ms]
@bryance/orch test: 
@bryance/orch test: test\commands-clean.test.ts:
@bryance/orch test: (pass) commands/clean > reaps dead agent dirs but preserves live pids [156.47ms]
@bryance/orch test: 
@bryance/orch test: test\worker-prompt.test.ts:
@bryance/orch test: (pass) worker prompt capability composition > spawn clause follows maySpawn and stripping preserves the task [1.80ms]
@bryance/orch test: (pass) worker prompt capability composition > orch run composition selects the same header per adapter [0.09ms]
@bryance/orch test: (pass) worker prompt capability composition > the worker header does not instruct a lock that does not lock [0.03ms]
@bryance/orch test: (pass) worker prompt capability composition > locked-commands clause names the commands, and asks for a report rather than a lock [0.03ms]
@bryance/orch test: (pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.02ms]
@bryance/orch test: (pass) worker prompt capability composition > the reply-to-spawner clause needs a reachable spawner, not just an inbox-steerable worker [0.04ms]
@bryance/orch test: (pass) worker prompt capability composition > unreachable spawner tells the worker to finish and end without relaying [0.02ms]
@bryance/orch test: (pass) worker prompt capability composition > reachable spawner permits replying to the spawner only [0.02ms]
@bryance/orch test: (pass) worker prompt capability composition > a reachable spawner still earns no clause when the worker cannot be steered by inbox [0.02ms]
@bryance/orch test: (pass) worker prompt capability composition > events strip both worker header variants [26.61ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-hud-environment.test.ts:
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > a herdr-placed agent reports the handle its environment carries [239.02ms]
@bryance/orch test: 
@bryance/orch test: test\backend-headless.test.ts:
@bryance/orch test: (pass) HeadlessBackend > spawns a detached process and records its handle [175.15ms]
@bryance/orch test: 
@bryance/orch test: test\worker-tools.test.ts:
@bryance/orch test: (pass) worker tool policy > no configured allowlist restricts nothing [0.52ms]
@bryance/orch test: (pass) worker tool policy > a configured allowlist always carries orch's own tools [0.05ms]
@bryance/orch test: (pass) worker tool policy > peer tools join the allowlist when the fleet enables them [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\backend-headless.test.ts:
@bryance/orch test: (pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [120.35ms]
@bryance/orch test: (pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [78.68ms]
@bryance/orch test: 
@bryance/orch test: test\reap-walks-provenance.test.ts:
@bryance/orch test: (pass) reap walks the provenance tree (H3) > the tree is reaped from the LEAF up, one sweep per level [213.98ms]
@bryance/orch test: (pass) reap walks the provenance tree (H3) > a LIVE descendant blocks the reap even when the parent ended long ago [223.02ms]
@bryance/orch test: (pass) reap walks the provenance tree (H3) > provenance has no ON DELETE CASCADE, so no reap can erase a subtree [173.21ms]
@bryance/orch test: 
@bryance/orch test: test\commands-clean.test.ts:
@bryance/orch test: (pass) worktree ownership reads the composed environment > a live agent's worktree is protected and a dead one's is not [193.93ms]
@bryance/orch test: (pass) orch clean is destructive maintenance > a spawned agent is refused the sweep, and the dirs it does not own survive [182.14ms]
@bryance/orch test: 
@bryance/orch test: test\recipient-label.test.ts:
@bryance/orch test: (pass) agent identity shown to an operator > names the agent and its harness, never the transport key [0.09ms]
@bryance/orch test: (pass) agent identity shown to an operator > drops the routing prefix when nothing is known about it [0.02ms]
@bryance/orch test: (pass) agent identity shown to an operator > a nameless agent gets a stable logical name, not its key [0.08ms]
@bryance/orch test: 
@bryance/orch test: test\review.test.ts:
@bryance/orch test: Preparing worktree (new branch 'orch/feature-1')
@bryance/orch test: (pass) review plumbing > lists only done worktree agents with commits ahead [1994.29ms]
@bryance/orch test: 
@bryance/orch test: test\queue-reaping.test.ts:
@bryance/orch test: (pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > unrunnable is about who is alive now ΓÇö a new pack member makes it claimable again [205.44ms]
@bryance/orch test: (pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > stale is surfaced beside its state and never deleted on age [199.18ms]
@bryance/orch test: (pass) Cq12: an orphaned task has take-on, leave and reap, all deliberate > take-on re-scopes to the taker's own pack and the work becomes claimable there [216.80ms]
@bryance/orch test: (pass) Cq12: an orphaned task has take-on, leave and reap, all deliberate > take-on refuses a taker that is not itself live [197.85ms]
@bryance/orch test: 
@bryance/orch test: test\commands-control.test.ts:
@bryance/orch test: (pass) commands/control > parses dispatch flags without losing prompt words [0.16ms]
@bryance/orch test: (pass) commands/control > parses --then destination and note [0.14ms]
@bryance/orch test: (pass) commands/control > adds worker header unless raw [0.28ms]
@bryance/orch test: 
@bryance/orch test: test\commands-daemon.test.ts:
@bryance/orch test: (pass) commands/daemon > parses governance and validates daemon status [0.66ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-hud-environment.test.ts:
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > the handle follows the agent when it moves pane [197.74ms]
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > an agent on another plexer is not a herdr pane [214.34ms]
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > a process orch never launched is not a herdr pane [10.55ms]
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > a key that is not a minted id resolves to no pane at all [9.24ms]
@bryance/orch test: 
@bryance/orch test: test\reload-no-bundle-write.test.ts:
@bryance/orch test: {"results":[],"ok":0,"total":0,"hard":false,"signaled":"reload.signal"}
@bryance/orch test: (pass) reload > does not write installed extension bundles [29.71ms]
@bryance/orch test: 
@bryance/orch test: test\commands-daemon.test.ts:
@bryance/orch test: (pass) commands/daemon > reads a lock pid only from a complete lock record [29.81ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-registry.test.ts:
@bryance/orch test: (pass) spawn agent registration > an agent that states no plexer and no handle gets neither row [181.52ms]
@bryance/orch test: (pass) spawn agent registration > worktree row is present only for a worktree launch [248.17ms]
@bryance/orch test: (pass) spawn agent registration > an unknown or absent spawner produces a root pack of one and no lease [188.00ms]
@bryance/orch test: 
@bryance/orch test: test\status-unleased.test.ts:
@bryance/orch test: (pass) status owner rendering > a dead holder is shown as unleased with the holder gone [904.88ms]
@bryance/orch test: (pass) status owner rendering > an agent never leased shows no orch driving it [1016.43ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-transport-parity.test.ts:
@bryance/orch test: (pass) both transports carry one mechanism > the same token registers the same session whichever transport carried it [1654.05ms]
@bryance/orch test: 
@bryance/orch test: test\commands-events.test.ts:
@bryance/orch test: (pass) commands/events > owned renderers and tool help do not expose the retired workspace term [0.97ms]
@bryance/orch test: 
@bryance/orch test: test\store-rebuild-schema.test.ts:
@bryance/orch test: (pass) rebuild schema > the store opens migrated, with foreign keys enabled [115.75ms]
@bryance/orch test: (pass) rebuild schema > all ten partial unique indexes allow only one open row [1995.28ms]
@bryance/orch test: (pass) rebuild schema > enforces foreign keys and agent checks [192.81ms]
@bryance/orch test: (pass) rebuild schema > requires exactly one task scope [165.07ms]
@bryance/orch test: (pass) rebuild schema > allows one open attempt only [167.20ms]
@bryance/orch test: (pass) rebuild schema > enforces lease checks and one lease [176.92ms]
@bryance/orch test: (pass) rebuild schema > remaining documented CHECKs and cascades are enforced [218.08ms]
@bryance/orch test: (pass) rebuild schema > task_states derives queued claimed and outcomes [207.53ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-notify-busy.test.ts:
@bryance/orch test: (pass) a herdr notification is delivered only when herdr says it was shown > shown is a delivery [0.18ms]
@bryance/orch test: (pass) a herdr notification is delivered only when herdr says it was shown > busy is NOT a delivery, however herdr exited [0.02ms]
@bryance/orch test: (pass) a herdr notification is delivered only when herdr says it was shown > every other refusal herdr can answer with is also not a delivery [0.06ms]
@bryance/orch test: (pass) a herdr notification is delivered only when herdr says it was shown > output that is not a herdr answer is never read as a delivery [0.10ms]
@bryance/orch test: (pass) a busy herdr is waited out, not dropped > a toast shown on the first try is sent once and waits for nothing [0.16ms]
@bryance/orch test: (pass) a busy herdr is waited out, not dropped > a busy herdr is retried after a wait, and the retry is the delivery [0.05ms]
@bryance/orch test: (pass) a busy herdr is waited out, not dropped > a herdr that stays busy gives up rather than blocking the daemon forever [0.03ms]
@bryance/orch test: (pass) a busy herdr is waited out, not dropped > a refusal that waiting cannot fix is not retried [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\status-headless.test.ts:
@bryance/orch test: (pass) headless status visibility > keeps an exited agent with a terminal state [0.26ms]
@bryance/orch test: (pass) headless status visibility > keeps an exited agent with a recorded result [0.07ms]
@bryance/orch test: (pass) headless status visibility > drops a dead row with no result or terminal state [0.03ms]
@bryance/orch test: (pass) headless status visibility > keeps a live row [0.02ms]
@bryance/orch test: (pass) headless status visibility > --all keeps stale rows [0.03ms]
@bryance/orch test: (pass) headless status visibility > uses agent language without backend details when no backend was asked [0.08ms]
@bryance/orch test: 
@bryance/orch test: test\lease-authority.test.ts:
@bryance/orch test: (pass) C3 foreign agents are untouchable > every driving verb is refused while a live foreign orch holds the lease [4264.44ms]
@bryance/orch test: 
@bryance/orch test: test\queue-scope.test.ts:
@bryance/orch test: (pass) queue scope invariants > a failed pack task retries on another pack member, while an agent task stays pinned [220.87ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-notify-hardening.test.ts:
@bryance/orch test: (pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [1.28ms]
@bryance/orch test: (pass) herdr and notification hardening > falls back to a valid name when the identity key contains herdr-invalid separators [0.38ms]
@bryance/orch test: (pass) herdr and notification hardening > nameless notifications use a space label, never a bare pane key [0.51ms]
@bryance/orch test: 
@bryance/orch test: test\hermetic-env.test.ts:
@bryance/orch test: (pass) the test suite is hermetic > no plexer environment leaks in from the shell that launched bun [0.51ms]
@bryance/orch test: 
@bryance/orch test: test\dispatch-channel-first.test.ts:
@bryance/orch test: (pass) work reaches an agent through orch's channel, with the pane only a shortcut > a headless agent receives a dispatch through the inbox, not a no-pane answer [70.85ms]
@bryance/orch test: 
@bryance/orch test: test\cmd-lock-serialize.test.ts:
@bryance/orch test: (pass) command lock serialization > serializes two real CLI acquirers without overlapping their commands [2968.51ms]
@bryance/orch test: 
@bryance/orch test: test\dispatch-channel-first.test.ts:
@bryance/orch test: (pass) work reaches an agent through orch's channel, with the pane only a shortcut > a steer reaches a paneless agent the same way [37.68ms]
@bryance/orch test: 
@bryance/orch test: test\status-live.test.ts:
@bryance/orch test: (pass) live status renderer > renders a clear screen, timestamped header, and table body [9.08ms]
@bryance/orch test: (pass) live status renderer > renders a refresh failure in the header area [0.17ms]
@bryance/orch test: (pass) live status renderer > coalesces a burst into one pending follow-up refresh [0.38ms]
@bryance/orch test: (pass) live status renderer > keeps the existing table renderer available [0.08ms]
@bryance/orch test: 
@bryance/orch test: test\store-agent-rows.test.ts:
@bryance/orch test: (pass) agent store rows > insertAgent writes both NULL; agentById reads both back [174.78ms]
@bryance/orch test: 
@bryance/orch test: test\store-runs.test.ts:
@bryance/orch test: (pass) run rows > round-trips every field, including a structured result [145.32ms]
@bryance/orch test: 
@bryance/orch test: test\remote-fanout.test.ts:
@bryance/orch test: (pass) async remote fan-out > parses valid JSON from a host [295.86ms]
@bryance/orch test: 
@bryance/orch test: test\worktree.test.ts:
@bryance/orch test: Preparing worktree (new branch 'orch/fixes-1')
@bryance/orch test: (pass) worktree primitives > creates and lists an agent worktree on an orch branch [694.83ms]
@bryance/orch test: 
@bryance/orch test: test\status-owner-column.test.ts:
@bryance/orch test: (pass) the rendered status table carries the owner column > each row's OWNER cell holds that row's lease fact [0.80ms]
@bryance/orch test: (pass) the rendered status table carries the owner column > a dead holder renders as unleased, not as a live driver [0.25ms]
@bryance/orch test: (pass) the rendered status table carries the owner column > the owner column is dropped only when no row knows its lease [0.12ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-decision-trail.test.ts:
@bryance/orch test: (pass) daemon decision trail > records a lease refused against a live holder [1634.32ms]
@bryance/orch test: 
@bryance/orch test: test\status-perf.test.ts:
@bryance/orch test: (pass) status performance seams > resolves bundle hashes once per status call [13.34ms]
@bryance/orch test: 
@bryance/orch test: test\remote-fanout.test.ts:
@bryance/orch test: (pass) async remote fan-out > returns a typed dead-host failure [277.70ms]
@bryance/orch test: 
@bryance/orch test: test\status-perf.test.ts:
@bryance/orch test: (pass) status performance seams > resolves orchestrator id once per status call [35.26ms]
@bryance/orch test: 
@bryance/orch test: test\holder-death-costs-a-driver.test.ts:
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > the task in flight finishes and its result survives the holder [317.24ms]
@bryance/orch test: 
@bryance/orch test: test\commands-events.test.ts:
@bryance/orch test: (pass) commands/events > bare events is scoped to this session's agents and renders readable lines [0.18ms]
@bryance/orch test: (pass) commands/events > parses filters and scope flags [0.08ms]
@bryance/orch test: (pass) commands/events > parses the wake-up flags [0.03ms]
@bryance/orch test: (pass) commands/events > includes an adopted agent whose open lease is mine [0.05ms]
@bryance/orch test: (pass) commands/events > includes a reused pane leased by me even when another session spawned it [0.02ms]
@bryance/orch test: (pass) commands/events > includes an unleased agent spawned by this session [0.01ms]
@bryance/orch test: (pass) commands/events > excludes an agent spawned by a different session [0.01ms]
@bryance/orch test: (pass) commands/events > --any-agent passes agents from both sessions [0.03ms]
@bryance/orch test: (pass) commands/events > excludes an agent while another orch holds its lease [0.01ms]
@bryance/orch test: (pass) commands/events > describes durable replay and reports pruned history gaps [0.05ms]
@bryance/orch test: (pass) commands/events > names one agent by name or by identity key [0.05ms]
@bryance/orch test: (pass) commands/events > a subscription with no daemon keeps redialing instead of exiting [1.09ms]
@bryance/orch test: (pass) commands/events > renders opaque plexer coordinates without relabeling them as spaces [0.53ms]
@bryance/orch test: (pass) commands/events > appends pack capacity to human-readable event lines [0.06ms]
@bryance/orch test: (pass) commands/events > rejects malformed event and labels sinks [0.10ms]
@bryance/orch test: (pass) commands/events space scope > an agent streams into the space it currently occupies [162.18ms]
@bryance/orch test: (pass) commands/events space scope > moving an agent moves its events with it [254.98ms]
@bryance/orch test: (pass) commands/events space scope > --all streams every space, and an unplaced caller scopes to none [214.82ms]
@bryance/orch test: (pass) commands/events space scope > a key naming no registered agent is in no space [4.88ms]
@bryance/orch test: 
@bryance/orch test: test\status-renders-one-row-shape.test.ts:
@bryance/orch test: (pass) status rendering has one row shape and one table renderer > task and last text use the same spelling in the row and table cell [64.80ms]
@bryance/orch test: 
@bryance/orch test: test\commands-help.test.ts:
@bryance/orch test: (pass) per-command help topics > daemon help names every subcommand and the idle shutdown setting [0.06ms]
@bryance/orch test: (pass) per-command help topics > aliases resolve to their command's topic [0.03ms]
@bryance/orch test: (pass) per-command help topics > logs help names every filter the command accepts [0.06ms]
@bryance/orch test: (pass) per-command help topics > an unknown name has no topic [0.03ms]
@bryance/orch test: (pass) per-command help topics > every topic is printable text ending in a newline [0.07ms]
@bryance/orch test: 
@bryance/orch test: test\session.test.ts:
@bryance/orch test: (pass) parseSession > returns an empty view for null and missing paths [0.24ms]
@bryance/orch test: (pass) parseSession > handles model, thinking, user, assistant, tool, and unknown entries [20.11ms]
@bryance/orch test: (pass) parseSession > joins text blocks and ignores non-text blocks [17.27ms]
@bryance/orch test: 
@bryance/orch test: test\status-renders-one-row-shape.test.ts:
@bryance/orch test: (pass) status rendering has one row shape and one table renderer > local and remote rows share the renderer; remote adds only HOST [0.58ms]
@bryance/orch test: (pass) status rendering has one row shape and one table renderer > fleet resolves caller inputs once while building three presence rows [182.77ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-decision-trail.test.ts:
@bryance/orch test: (pass) daemon decision trail > records a lease granted over a dead holder [254.33ms]
@bryance/orch test: (pass) daemon decision trail > records a no-pane boundary answer with its reason [199.69ms]
@bryance/orch test: 
@bryance/orch test: test\remote-fanout.test.ts:
@bryance/orch test: (pass) async remote fan-out > returns a typed timeout failure [539.57ms]
@bryance/orch test: 
@bryance/orch test: test\peer-lease-visibility.test.ts:
@bryance/orch test: (pass) peer summaries carry ownership as a lease > a peer the caller holds reports the caller as the live holder [2060.79ms]
@bryance/orch test: 
@bryance/orch test: test\store-runs.test.ts:
@bryance/orch test: (pass) run rows > upsert updates a row while preserving its original start time [275.29ms]
@bryance/orch test: (pass) run rows > orders by started time, filters by agent, and honours limit [163.82ms]
@bryance/orch test: (pass) run rows > omits absent optional fields instead of returning null [146.92ms]
@bryance/orch test: (pass) run rows > deletes only rows older than the cutoff and returns the count [164.96ms]
@bryance/orch test: (pass) run rows > stays readable after the agent presence directory is deleted [189.60ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > closes every watcher when watched agent directories disappear [65.28ms]
@bryance/orch test: 
@bryance/orch test: test\commands-queue.test.ts:
@bryance/orch test: (pass) commands/queue > cmdQueue list emits the selected JSON view [168.87ms]
@bryance/orch test: 
@bryance/orch test: test\settings-command.test.ts:
@bryance/orch test: (pass) orch settings > every registered setting is reachable through --json [429.08ms]
@bryance/orch test: 
@bryance/orch test: test\commands-queue.test.ts:
@bryance/orch test: No queue tasks.
@bryance/orch test: (pass) commands/queue > round-trips add/list/cancel on an isolated store [154.63ms]
@bryance/orch test: (pass) commands/queue > renders empty queues without throwing [0.43ms]
@bryance/orch test: 
@bryance/orch test: test\remote-fanout.test.ts:
@bryance/orch test: (pass) async remote fan-out > returns a typed non-JSON failure [364.36ms]
@bryance/orch test: 
@bryance/orch test: test\store-task-rows.test.ts:
@bryance/orch test: (pass) task and attempt rows > malformed task rows are refused instead of handed back as typed data [176.59ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > an RPC subscriber receives a presence transition [323.44ms]
@bryance/orch test: 
@bryance/orch test: test\queue-scope.test.ts:
@bryance/orch test: (pass) queue scope invariants > cancel is allowed for the enqueuer or a lease holder of a targeted agent [337.95ms]
@bryance/orch test: (pass) queue scope invariants > cancel refuses a caller who is neither enqueuer nor targeted lease holder [220.98ms]
@bryance/orch test: (pass) queue scope invariants > edit is allowed only for the enqueuer while queued [217.22ms]
@bryance/orch test: (pass) queue scope invariants > an orphan has exactly take-on, leave, and reap resolutions [253.15ms]
@bryance/orch test: (pass) queue scope invariants > stale queued work is surfaced distinctly and never deleted by age [181.39ms]
@bryance/orch test: (pass) queue scope invariants > two concurrent claims have one winner and one one_open_attempt violation [221.45ms]
@bryance/orch test: 
@bryance/orch test: test\holder-death-costs-a-driver.test.ts:
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > the lease closes `expired` ΓÇö not `released`, because no caller held it [208.14ms]
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > the agent stays alive, unleased and adoptable ΓÇö nothing closes it [243.31ms]
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > it receives no new work: the death hands the agent to nobody [205.32ms]
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > expiry is recorded once and does not erase who held it [173.76ms]
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > clearing a dead holder's lease is never refused, and is idempotent [163.07ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > a dispatched transition writes the full run row and preserves untruncated result [170.47ms]
@bryance/orch test: 
@bryance/orch test: test\commands-results.test.ts:
@bryance/orch test: (pass) commands/results > renders missing space and host as absent instead of inventing local [117.01ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > repeated transitions upsert one run and only terminal states set finishedAt [142.62ms]
@bryance/orch test: (pass) daemon presence events > a status without a dispatch id does not write history [110.51ms]
@bryance/orch test: 
@bryance/orch test: test\store-agent-rows.test.ts:
@bryance/orch test: (pass) agent store rows > insertAgent materializes the provenance root [228.22ms]
@bryance/orch test: (pass) agent store rows > endAgent records who closed it, nullable for death [201.41ms]
@bryance/orch test: (pass) agent store rows > liveAgents excludes agents with an ending [175.12ms]
@bryance/orch test: (pass) agent store rows > packMembers selects the materialized root [189.06ms]
@bryance/orch test: (pass) agent store rows > unknown harness is rejected by the foreign key [84.94ms]
@bryance/orch test: (pass) agent store rows > unknown spawnedBy is rejected by the foreign key [114.51ms]
@bryance/orch test: (pass) agent store rows > label maps both null and a value [156.48ms]
@bryance/orch test: (pass) agent store rows > created_at is an INTEGER epoch millisecond [148.09ms]
@bryance/orch test: (pass) agent store rows > worktreeOf distinguishes repo agents from worktree agents [132.25ms]
@bryance/orch test: (pass) agent store rows > renameAgent is id-keyed and leaves identity history unchanged [119.28ms]
@bryance/orch test: (pass) agent store rows > lookup ensure operations are insert-or-ignore [90.50ms]
@bryance/orch test: (pass) agent store rows > childrenOf returns direct descendants [119.42ms]
@bryance/orch test: 
@bryance/orch test: test\outbox-ack.test.ts:
@bryance/orch test: (pass) outbox ack fallback > consumes a fake agent ack from ack.jsonl on the next drain [129.31ms]
@bryance/orch test: 
@bryance/orch test: test\remote-fanout.test.ts:
@bryance/orch test: (pass) async remote fan-out > fans out and keeps per-host failures without throwing [610.36ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > a throwing history write does not stop event delivery [165.44ms]
@bryance/orch test: 
@bryance/orch test: test\remote.test.ts:
@bryance/orch test: (pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.61ms]
@bryance/orch test: (pass) host-prefixed targets > reports unknown host and configured names [0.28ms]
@bryance/orch test: 
@bryance/orch test: test\backend-headless.test.ts:
@bryance/orch test: (pass) HeadlessBackend > signals a matching recorded process through the injected killer [1401.78ms]
@bryance/orch test: (pass) HeadlessBackend > refuses to signal a pid whose process instance was replaced [1148.61ms]
@bryance/orch test: (pass) HeadlessBackend > never signals a dead pid [0.32ms]
@bryance/orch test: 
@bryance/orch test: test\backend-herdr-predicates.test.ts:
@bryance/orch test: (pass) herdr environment predicates > neither variable set [2.37ms]
@bryance/orch test: (pass) herdr environment predicates > HERDR_ENV=1 only [0.30ms]
@bryance/orch test: (pass) herdr environment predicates > HERDR_PANE_ID only [0.11ms]
@bryance/orch test: (pass) herdr environment predicates > both variables set [0.07ms]
@bryance/orch test: 
@bryance/orch test: test\store-catalogue.test.ts:
@bryance/orch test: (pass) catalogue rows > empty store reads an empty Map [143.00ms]
@bryance/orch test: 
@bryance/orch test: test\backend-herdr.test.ts:
@bryance/orch test: (pass) HerdrBackend > current identity uses the explicit id, not the launch environment [6.56ms]
@bryance/orch test: (pass) HerdrBackend > composes a complete group role bundle [0.09ms]
@bryance/orch test: (pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [1.56ms]
@bryance/orch test: (pass) HerdrBackend > starts the mapped herdr harness kind in the pane it created [0.22ms]
@bryance/orch test: (pass) HerdrBackend > agent_not_ready keeps the pane and does not close it [0.30ms]
@bryance/orch test: (pass) HerdrBackend > a caller pane is split rather than given a new tab [0.15ms]
@bryance/orch test: (pass) HerdrBackend > pane and tab creation always preserves focus [0.13ms]
@bryance/orch test: (pass) HerdrBackend > split direction clamps to herdr's right|down [0.07ms]
@bryance/orch test: (pass) HerdrBackend > env reaches the pane through herdr's --env, not an argv prefix [0.17ms]
@bryance/orch test: (pass) HerdrBackend > a handed-over pane is launched into directly, never split or closed [0.07ms]
@bryance/orch test: (pass) HerdrBackend > a group is created with the environment its own pane will launch under [0.18ms]
@bryance/orch test: (pass) HerdrBackend > the pane host closes a pane through herdr [0.03ms]
@bryance/orch test: (pass) HerdrBackend > a planned target pane is split directly, never re-seated afterwards [4.37ms]
@bryance/orch test: (pass) HerdrBackend > a grouped spawn with no planned target splits a pane already in that tab, never the caller's pane [1.63ms]
@bryance/orch test: (pass) HerdrBackend > a same-tab re-seat bounces through a throwaway tab so herdr executes it [0.67ms]
@bryance/orch test: (pass) HerdrBackend > adopts herdr's replacement pane id after move [0.14ms]
@bryance/orch test: (pass) HerdrBackend > refuses a live herdr agent name before start [0.63ms]
@bryance/orch test: (pass) HerdrBackend > reads recent unwrapped pane output [0.16ms]
@bryance/orch test: (pass) HerdrBackend > a refused move surfaces herdr's reason instead of claiming success [0.08ms]
@bryance/orch test: (pass) HerdrBackend > groupLayout reads tab geometry straight off the pane listing [0.26ms]
@bryance/orch test: (pass) HerdrBackend > pane input submits through pane run [0.04ms]
@bryance/orch test: (pass) HerdrBackend > pane rename failure reaches the role caller [0.15ms]
@bryance/orch test: (pass) HerdrBackend > waiting uses agent wait --until, not the removed top-level wait [0.06ms]
@bryance/orch test: (pass) HerdrBackend space home > opens an orch-marked workspace for a pack the caller did not label [1.09ms]
@bryance/orch test: (pass) HerdrBackend space home > a space home the human named keeps that name [0.48ms]
@bryance/orch test: (pass) HerdrBackend space home > create hands back the plexer coordinate and the root pane, and says neither [0.17ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > emitted events carry the pack capacity at publish time [182.44ms]
@bryance/orch test: (pass) daemon presence events > a flapping status file cannot storm the stream with repeat transitions [0.65ms]
@bryance/orch test: (pass) daemon presence events > a genuine repeat of the same transition for new work still publishes [0.34ms]
@bryance/orch test: (pass) daemon presence events > a repeat transition publishes again once the suppression window passes [0.11ms]
@bryance/orch test: (pass) daemon presence events > repeated observations cannot slide the suppression window forever [0.07ms]
@bryance/orch test: (pass) daemon presence events > a working-to-done repeat after the dedupe window is emitted [0.15ms]
@bryance/orch test: (pass) daemon presence events > presence transitions resolve the human name before emission [2.80ms]
@bryance/orch test: (pass) daemon presence events > presence transitions use the normalized agent name after rename [149.21ms]
@bryance/orch test: (pass) daemon presence events > derivePresenceTransition preserves the complete asking transition payload [10.01ms]
@bryance/orch test: (pass) daemon presence events > an asking transition drives command sink delivery [152.04ms]
@bryance/orch test: 
@bryance/orch test: test\rename-syncs-the-pane-border.test.ts:
@bryance/orch test: (pass) orch rename syncs the pane border in one command (U5) > one rename sets orch's name AND the plexer chrome [251.47ms]
@bryance/orch test: 
@bryance/orch test: test\store-task-rows.test.ts:
@bryance/orch test: (pass) task and attempt rows > malformed attempt rows are refused instead of handing back NaN [153.85ms]
@bryance/orch test: (pass) task and attempt rows > enqueue accepts exactly one typed scope and round-trips JSON opts [117.53ms]
@bryance/orch test: (pass) task and attempt rows > queued tasks can be edited only by their enqueuer [118.70ms]
@bryance/orch test: (pass) task and attempt rows > two concurrent claims have one winner and one index violation [162.46ms]
@bryance/orch test: (pass) task and attempt rows > failed attempts remain in history and retries are new attempts [125.71ms]
@bryance/orch test: (pass) task and attempt rows > settlement stores exact integer instants and outcome payloads [145.61ms]
@bryance/orch test: (pass) task and attempt rows > task state precedence covers queued, claimed, failed, done and cancelled [289.44ms]
@bryance/orch test: (pass) task and attempt rows > intakes are half-open history and duplicate open intake is rejected [190.47ms]
@bryance/orch test: 
@bryance/orch test: test\cmd-lock-serialize.test.ts:
@bryance/orch test: (pass) command lock serialization > evicts a lock whose process instance token no longer matches [1938.35ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-idle.test.ts:
@bryance/orch test: (pass) orchd idle shutdown rule > a zero setting disables idle shutdown entirely [0.11ms]
@bryance/orch test: (pass) orchd idle shutdown rule > a live agent holds the daemon open however long it has been quiet [0.02ms]
@bryance/orch test: (pass) orchd idle shutdown rule > an event subscriber holds the daemon open [0.02ms]
@bryance/orch test: (pass) orchd idle shutdown rule > recent activity holds the daemon open below the threshold [0.02ms]
@bryance/orch test: (pass) orchd idle shutdown rule > a fully idle daemon past the threshold is due to exit [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\commands-setup.test.ts:
@bryance/orch test: Selection recorded in C:\Users\Bryan\AppData\Local\Temp\orch-setup-characterization-HN2ltg\settings.json:
@bryance/orch test:   runtime           = node
@bryance/orch test:   adapters          = pi
@bryance/orch test:   default adapter   = pi
@bryance/orch test:   backends          = headless
@bryance/orch test:   default backend   = headless
@bryance/orch test:   model (pi)          = (none)  picker: none, allowed: all offered
@bryance/orch test: Prerequisites:
@bryance/orch test:   MISSING pi
@bryance/orch test:   ok      headless
@bryance/orch test:   install bun: curl -fsSL https://bun.sh/install | bash
@bryance/orch test:   install pi: bun add -g @earendil-works/pi-coding-agent
@bryance/orch test: Presence dir:
@bryance/orch test:   C:\Users\Bryan\AppData\Local\Temp\orch-setup-characterization-HN2ltg\agents
@bryance/orch test: Skills:
@bryance/orch test:   not installed - turn it back on with: orch settings skills --install
@bryance/orch test: bins:
@bryance/orch test:   C:\Users\Bryan\AppData\Local\Temp\orch-setup-home-JHizTV\.local\bin\orch (copy)
@bryance/orch test:   C:\Users\Bryan\AppData\Local\Temp\orch-setup-home-JHizTV\.local\bin\pif (copy)
@bryance/orch test:   C:\Users\Bryan\AppData\Local\Temp\orch-setup-home-JHizTV\.local\bin\orch-ding (copy)
@bryance/orch test:   SKIP pi extensions: pi integration shim disabled
@bryance/orch test: Running doctor checks...
@bryance/orch test: Doctor: 28/34 checks passed
@bryance/orch test: Smoke test skipped (non-interactive) - run `orch setup` on a TTY to verify orch can deliver work.
@bryance/orch test: Done. Open a plexer workspace and try: orch spawn 2 --tab Team1
@bryance/orch test: (pass) commands/setup > resolves noninteractive provider sets and defaults [0.41ms]
@bryance/orch test: (fail) commands/setup > runs non-interactive setup against the requested ORCH_DIR and records the selected composition [7887.26ms]
@bryance/orch test:   ^ this test timed out after 5000ms.
@bryance/orch test: (pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.49ms]
@bryance/orch test: 
@bryance/orch test: test\store-values.test.ts:
@bryance/orch test: (pass) store row values > uses null for optional database values without JSON text [0.09ms]
@bryance/orch test: (pass) store row values > sets only non-null fields [0.05ms]
@bryance/orch test: 
@bryance/orch test: test\thinking-resolution.test.ts:
@bryance/orch test: (pass) thinking resolution > resolves every rung in priority order [29.29ms]
@bryance/orch test: 
@bryance/orch test: test\store-catalogue.test.ts:
@bryance/orch test: (pass) catalogue rows > write then read round-trips at and stdout [143.20ms]
@bryance/orch test: (pass) catalogue rows > writing the same command twice keeps one row with newer values [131.59ms]
@bryance/orch test: (pass) catalogue rows > an entry with empty stdout is not stored [107.73ms]
@bryance/orch test: (pass) catalogue rows > clearCatalogues empties the store [142.39ms]
@bryance/orch test: (pass) catalogue rows > two commands coexist and updating one does not touch the other [153.96ms]
@bryance/orch test: 
@bryance/orch test: test\caller-kind.test.ts:
@bryance/orch test: (pass) caller kind > id + recorded token is agent [197.65ms]
@bryance/orch test: 
@bryance/orch test: test\thinking-resolution.test.ts:
@bryance/orch test: (pass) thinking resolution > bare model with no setting yields harness default [19.42ms]
@bryance/orch test: (pass) thinking resolution > pi translates the resolved level through its thinking role [0.63ms]
@bryance/orch test: (pass) thinking resolution > per-harness override beats global default [39.87ms]
@bryance/orch test: 
@bryance/orch test: test\clean-worktrees.test.ts:
@bryance/orch test: Preparing worktree (new branch 'orch/empty')
@bryance/orch test: Preparing worktree (new branch 'orch/merged')
@bryance/orch test: Preparing worktree (new branch 'orch/unmerged')
@bryance/orch test: (pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [6330.33ms]
@bryance/orch test: 
@bryance/orch test: test\tiling.test.ts:
@bryance/orch test: (pass) planTilePlacement > a lone pane anchors the split to the only pane [0.24ms]
@bryance/orch test: (pass) planTilePlacement > first_split rules the opening split, however the screen is shaped [0.11ms]
@bryance/orch test: (pass) planTilePlacement > first_split longest-edge leaves the opening split to the tab's own shape [0.06ms]
@bryance/orch test: (pass) planTilePlacement > a tab with no geometry to read still opens the way first_split says [0.04ms]
@bryance/orch test: (pass) planTilePlacement > past the first split, the biggest pane halves its longer side whatever first_split says [0.21ms]
@bryance/orch test: (pass) planTilePlacement > the biggest pane is the target, whatever the caller's own pane is [0.06ms]
@bryance/orch test: (pass) planTilePlacement > equal panes resolve top-left first, so enumeration order cannot decide [0.06ms]
@bryance/orch test: (pass) planTilePlacement > four agents land in a 2x2 grid, not four columns [0.49ms]
@bryance/orch test: (pass) planTilePlacement > four agents on an ultrawide screen still land in a 2x2 grid [0.09ms]
@bryance/orch test: (pass) planTilePlacement > first_split rows stacks the second agent, columns seats it alongside [0.05ms]
@bryance/orch test: (pass) planTilePlacement > longest-edge on an ultrawide screen is the four-thin-columns layout first_split exists to avoid [0.04ms]
@bryance/orch test: (pass) planTilePlacement > the same pane count yields the same grid whatever pane order the plexer reports [3.28ms]
@bryance/orch test: 
@bryance/orch test: test\outbox-ack.test.ts:
@bryance/orch test: (pass) outbox ack fallback > keeps an unacknowledged delivery pending for retry [99.45ms]
@bryance/orch test: (pass) outbox ack fallback > a duplicated ack marker is counted once, not twice [221.58ms]
@bryance/orch test: (pass) outbox ack fallback > an ack whose key does not match the agent dir is ignored [199.95ms]
@bryance/orch test: (pass) outbox ack fallback > an inbox write is queued, not delivered: only the agent's ack settles the row [170.99ms]
@bryance/orch test: (pass) outbox ack fallback > a channel that can never ack settles the row on the write itself [131.34ms]
@bryance/orch test: (pass) outbox ack fallback > a queued write is handed off, so it is open but no longer unsent [152.21ms]
@bryance/orch test: (pass) outbox ack fallback > a write no channel would take stays unsent [161.14ms]
@bryance/orch test: 
@bryance/orch test: test\tool-exec-retry.test.ts:
@bryance/orch test: (pass) every command into a harness or plexer retries on timing, not on being wrong > a transient refusal is reattempted until it succeeds [11.03ms]
@bryance/orch test: 
@bryance/orch test: test\commands-results.test.ts:
@bryance/orch test: (pass) commands/results > validates and extracts question payloads [0.15ms]
@bryance/orch test: (pass) commands/results > formats invalid and recent timestamps [0.07ms]
@bryance/orch test: (pass) commands/results > routes a seeded results.jsonl through the command module [147.75ms]
@bryance/orch test: (pass) commands/results > keeps every settled dispatch and reports the newest [139.45ms]
@bryance/orch test: (pass) commands/results > falls back to adapter session text when results.jsonl is absent [124.22ms]
@bryance/orch test: (pass) commands/results > uses results.jsonl even when the presence status has no agent [158.57ms]
@bryance/orch test: (pass) commands/results > orch tail resolves a non-pi target through that adapter's session view [190.52ms]
@bryance/orch test: (pass) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [189.04ms]
@bryance/orch test: (pass) commands/results > orch tail -n keeps last-N rendered entries for a pi session [180.89ms]
@bryance/orch test: (pass) commands/results > orch session reports the pi entry count [197.45ms]
@bryance/orch test: (pass) commands/results > orch session shows zero entries for an adapter view without them [196.80ms]
@bryance/orch test: 
@bryance/orch test: test\tool-exec-retry.test.ts:
@bryance/orch test: (pass) every command into a harness or plexer retries on timing, not on being wrong > a failure the caller calls permanent is thrown on the FIRST attempt, never retried [0.59ms]
@bryance/orch test: (pass) every command into a harness or plexer retries on timing, not on being wrong > a tool that never recovers exhausts the budget and reports how many attempts it cost [29.41ms]
@bryance/orch test: (pass) every command into a harness or plexer retries on timing, not on being wrong > the seam names no harness: the same policy drives a different binary [1.53ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö orch's own grouping > a space is created, listed, renamed and deleted with no space-home role [242.00ms]
@bryance/orch test: 
@bryance/orch test: test\transcript.test.ts:
@bryance/orch test: (pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [3.63ms]
@bryance/orch test: (pass) lastAssistantFromJsonl > undefined for blank or empty input [0.06ms]
@bryance/orch test: (pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.22ms]
@bryance/orch test: (pass) assistantText > reads role-tagged records [0.08ms]
@bryance/orch test: (pass) assistantText > reads the {type:'assistant'} envelope with a nested message [0.02ms]
@bryance/orch test: (pass) assistantText > undefined for non-assistant roles [0.02ms]
@bryance/orch test: (pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.04ms]
@bryance/orch test: (pass) contentText empty-string part handling > an all-empty content array yields undefined [0.05ms]
@bryance/orch test: (pass) contentText empty-string part handling > a bare empty string yields undefined [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\rename-syncs-the-pane-border.test.ts:
@bryance/orch test: (pass) orch rename syncs the pane border in one command (U5) > the response states the two outcomes SEPARATELY [207.68ms]
@bryance/orch test: (pass) orch rename syncs the pane border in one command (U5) > a plexer that refuses the chrome never unwrites orch's own name [281.29ms]
@bryance/orch test: (pass) orch rename syncs the pane border in one command (U5) > --pane still gives the border something DIFFERENT, and leaves the name alone [225.57ms]
@bryance/orch test: 
@bryance/orch test: test\store-connection-guards.test.ts:
@bryance/orch test: (pass) store migration guards > a store predating the migrations is refused, not rebuilt over [166.90ms]
@bryance/orch test: 
@bryance/orch test: test\commands-review.test.ts:
@bryance/orch test: (pass) commands/review > uses the short orch branch as review target [0.12ms]
@bryance/orch test: (pass) commands/review > falls back to branch then the agent's address [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\caller-kind.test.ts:
@bryance/orch test: (pass) caller kind > id + other token is human [170.15ms]
@bryance/orch test: (pass) caller kind > id + no token is human [166.81ms]
@bryance/orch test: (pass) caller kind > no id is human [3.96ms]
@bryance/orch test: 
@bryance/orch test: test\outbox-replay.test.ts:
@bryance/orch test: (pass) outbox restart replay > replays failed messages after restart without duplicates [199.64ms]
@bryance/orch test: 
@bryance/orch test: test\transfer-does-not-disturb.test.ts:
@bryance/orch test: (pass) a transfer touches the lease and nothing else > a handoff changes the holder and leaves every other fact identical [258.91ms]
@bryance/orch test: 
@bryance/orch test: test\capacity.test.ts:
@bryance/orch test: (pass) fleet capacity > counts live agents by root holder [0.55ms]
@bryance/orch test: (pass) fleet capacity > reports configured per-space caps [0.20ms]
@bryance/orch test: (pass) fleet capacity > uses null for an unlimited total [0.11ms]
@bryance/orch test: (pass) fleet capacity > formats holder, space, and machine capacity [0.19ms]
@bryance/orch test: 
@bryance/orch test: test\check-bridge.test.ts:
@bryance/orch test: (pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.12ms]
@bryance/orch test: 
@bryance/orch test: test\commands-runs.test.ts:
@bryance/orch test: (pass) commands/runs > lists newest first and honors -n [215.39ms]
@bryance/orch test: 
@bryance/orch test: test\outbox.test.ts:
@bryance/orch test: (pass) outbox delivery > selects pending messages and delivers each message once [177.53ms]
@bryance/orch test: 
@bryance/orch test: test\worktree.test.ts:
@bryance/orch test: Preparing worktree (new branch 'orch/feature')
@bryance/orch test: Preparing worktree (new branch 'orch/remove-me')
@bryance/orch test: fatal: not a git repository (or any of the parent directories): .git
@bryance/orch test: (pass) worktree primitives > detects commits ahead of a base branch [2257.97ms]
@bryance/orch test: (pass) worktree primitives > removes an agent worktree [1277.10ms]
@bryance/orch test: (pass) worktree primitives > rejects a non-repository path with a clear error [136.31ms]
@bryance/orch test: 
@bryance/orch test: test\check-bridge.test.ts:
@bryance/orch test: (pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.07ms]
@bryance/orch test: (pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / settings seams [0.06ms]
@bryance/orch test: (pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [3.88ms]
@bryance/orch test: (pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.23ms]
@bryance/orch test: (pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.03ms]
@bryance/orch test: (pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the shared harness model port outside the adapter dispatcher [0.02ms]
@bryance/orch test: (pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [0.51ms]
@bryance/orch test: (pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > flags a runtime adapter importing bridge-bundles/build.ts [0.14ms]
@bryance/orch test: (pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > allows scripts and the build-tool module itself [0.03ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [1.72ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.40ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.33ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke test holds no exemption: the branch was deleted, not blessed [0.12ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has no identity-branch line, exempted or otherwise [7.31ms]
@bryance/orch test: (pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > flags spawner key and spawnerIdentity key owner-token fallbacks [0.48ms]
@bryance/orch test: (pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > allows a benign line [0.27ms]
@bryance/orch test: (pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > passes the clean tree: reply addresses never use owner-token fallbacks [1.81ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags object literals that synthesize an identity [0.19ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags concatenated and template identity keys [0.25ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > allows a fresh spawn mint and the issuer modules [0.04ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > no file is exempt from the identity-construction rule [0.02ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > passes the clean tree: every identity construction is allowed or registered [1.32ms]
@bryance/orch test: (pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.09ms]
@bryance/orch test: (pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.02ms]
@bryance/orch test: (pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [0.79ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > a deleted capability bag or optional method is not exempt [0.87ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > the exempted names are the roles the ports actually declare [0.27ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > nullable data on the port is not exempted as a role [0.03ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > flags plexer and harness identity branches [0.03ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > flags method-presence capability checks [0.15ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > allows a branch inside a concrete backend [0.02ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > passes the clean tree: no file in ANY scanned scope branches on an environment id [156.18ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > the core-scope allowlist is EMPTY, so no line holds a standing exemption [0.15ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > allows capability-driven code [0.03ms]
@bryance/orch test: (pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags INSERT and UPDATE SQL that welds a lease holder into spawned_by [0.39ms]
@bryance/orch test: (pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags lease row types carrying a provenance field [0.05ms]
@bryance/orch test: (pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > allows separate lease and provenance rows [0.10ms]
@bryance/orch test: (pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > passes the clean tree: no source line crosses lease and provenance columns [51.53ms]
@bryance/orch test: (pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a launch env read outside launch.ts with the file and constant named [0.38ms]
@bryance/orch test: (pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > allows the launch env read inside identity/launch.ts [0.04ms]
@bryance/orch test: (pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a bare launch env name literal outside launch.ts [0.03ms]
@bryance/orch test: (pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a comment mentioning the launch env name outside launch.ts [0.02ms]
@bryance/orch test: (pass) the closed plexer-id set is spelled in exactly one line > the definition line is allowed where it lives, and nowhere else [0.14ms]
@bryance/orch test: (pass) the closed plexer-id set is spelled in exactly one line > any other quoted plexer id in that same file still fails [0.08ms]
@bryance/orch test: (pass) the closed plexer-id set is spelled in exactly one line > the line src/types/backend.ts actually carries is the allowed one [19.26ms]
@bryance/orch test: (pass) the closed plexer-id set is spelled in exactly one line > extensions get the same rule with their own scope named [0.15ms]
@bryance/orch test: 
@bryance/orch test: test\outbox.test.ts:
@bryance/orch test: (pass) outbox delivery > checks one message's pending state without scanning the outbox [140.13ms]
@bryance/orch test: (pass) outbox delivery > keeps failed messages pending until their backoff expires [150.68ms]
@bryance/orch test: 
@bryance/orch test: test\no-daemon-commands.test.ts:
@bryance/orch test: (pass) commands that need no daemon need no identity > orch version registers no agent and starts no daemon [385.34ms]
@bryance/orch test: (pass) commands that need no daemon need no identity > orch status --offline registers no agent and starts no daemon [285.72ms]
@bryance/orch test: (pass) commands that need no daemon need no identity > orch doctor registers no agent and starts no daemon [6349.11ms]
@bryance/orch test: (pass) commands that need no daemon need no identity > help works before setup has ever run, which is when it is needed most [316.03ms]
@bryance/orch test: 
@bryance/orch test: test\commands-runs.test.ts:
@bryance/orch test: (pass) commands/runs > target filter and json preserve RunRecord rows [207.53ms]
@bryance/orch test: (pass) commands/runs > running rows render as running, not zero duration [0.41ms]
@bryance/orch test: (pass) commands/runs > result falls back to durable run history after presence reap [144.07ms]
@bryance/orch test: 
@bryance/orch test: test\store-connection-guards.test.ts:
@bryance/orch test: (pass) store migration guards > names live presence as the thing to close before rebuilding [164.07ms]
@bryance/orch test: (pass) a slave never reaps or recreates the store > a spawned agent hitting a schema-mismatched store errors and mutates nothing [205.42ms]
@bryance/orch test: (pass) a slave never reaps or recreates the store > a recreate is refused while a live presence dir exists, for the user too [108.89ms]
@bryance/orch test: (pass) a slave never reaps or recreates the store > the user may recreate once nothing is live [121.37ms]
@bryance/orch test: (pass) a slave never reaps or recreates the store > a spawned agent is refused a recreate even with nothing live [151.93ms]
@bryance/orch test: 
@bryance/orch test: test\claim-agent.test.ts:
@bryance/orch test: (pass) claim agent > unclaimed + A ΓåÆ stamped [133.95ms]
@bryance/orch test: 
@bryance/orch test: test\no-placement-row-over-the-composed-view.test.ts:
@bryance/orch test: (pass) no Placement row is reassembled over the composed view (2.1) > there is no second lookup module projecting the environment into a flat row [0.43ms]
@bryance/orch test: 
@bryance/orch test: test\close-authority.test.ts:
@bryance/orch test: (pass) who may end an agent (D7) > the human may close anything [160.77ms]
@bryance/orch test: 
@bryance/orch test: test\notify-ding.test.ts:
@bryance/orch test: (pass) notify/ding > the sound sink is a declared sink that takes no configuration [57.65ms]
@bryance/orch test: (pass) notify/ding > this host names the players it would use, and says how to get one [0.39ms]
@bryance/orch test: (pass) notify/ding > a command string runs through the host's own shell; argv is passed through untouched [0.10ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-lifecycle.test.ts:
@bryance/orch test: Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.4.0+34cbb9a40)
@bryance/orch test: 
@bryance/orch test: Usage: bun <command> [...flags] [...args]
@bryance/orch test: 
@bryance/orch test: Commands:
@bryance/orch test:   run       ./my-script.ts       Execute a file with Bun
@bryance/orch test:             lint                 Run a package.json script
@bryance/orch test:   test                           Run unit tests with Bun
@bryance/orch test:   x         prisma               Execute a package binary (CLI), installing if needed (bunx)
@bryance/orch test:   repl                           Start a REPL session with Bun
@bryance/orch test:   exec                           Run a shell script directly with Bun
@bryance/orch test: 
@bryance/orch test:   install                        Install dependencies for a package.json (bun i)
@bryance/orch test:   add       @remix-run/dev       Add a dependency to package.json (bun a)
@bryance/orch test:   remove    jquery               Remove a dependency from package.json (bun rm)
@bryance/orch test:   update    @evan/duckdb         Update outdated dependencies
@bryance/orch test:   audit                          Check installed packages for vulnerabilities
@bryance/orch test:   dedupe                         Remove duplicate versions from the lockfile
@bryance/orch test:   prune                          Remove packages that are not in the lockfile from node_modules
@bryance/orch test:   outdated                       Display latest versions of outdated dependencies
@bryance/orch test:   link      [<package>]          Register or link a local npm package
@bryance/orch test:   unlink                         Unregister a local npm package
@bryance/orch test:   publish                        Publish a package to the npm registry
@bryance/orch test:   patch <pkg>                    Prepare a package for patching
@bryance/orch test:   pm <subcommand>                Additional package management utilities
@bryance/orch test:   info      @zarfjs/zarf         Display package metadata from the registry
@bryance/orch test:   why       zod                  Explain why a package is installed
@bryance/orch test: 
@bryance/orch test:   build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file
@bryance/orch test: 
@bryance/orch test:   init                           Start an empty Bun project from a built-in template
@bryance/orch test:   create    svelte               Create a new project from a template (bun c)
@bryance/orch test:   upgrade                        Upgrade to latest version of Bun.
@bryance/orch test: 
@bryance/orch test:   <command> --help               Print help text for command.
@bryance/orch test: 
@bryance/orch test: Learn more about Bun:            https://bun.com/docs
@bryance/orch test: Join our Discord community:      https://bun.com/discord
@bryance/orch test: (pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [1462.16ms]
@bryance/orch test: (pass) daemon lifecycle > reclaims an unreadable lock, which a crash truncated and no daemon owns [2375.34ms]
@bryance/orch test: (pass) daemon lifecycle > refuses an unreadable lock while the socket still answers [1003.74ms]
@bryance/orch test: (pass) daemon lifecycle > clears the lock, socket and port a departed daemon owned, keeping the log [20.89ms]
@bryance/orch test: (pass) daemon lifecycle > refuses a stale lock when the socket probe cannot answer [795.99ms]
@bryance/orch test: (pass) daemon lifecycle > retries if a stale lock disappears during reclaim [1050.49ms]
@bryance/orch test: 
@bryance/orch test: test\store-events.test.ts:
@bryance/orch test: (pass) event store rows > appendEvent assigns increasing sequence numbers and round-trips payload [389.16ms]
@bryance/orch test: 
@bryance/orch test: test\transfer-does-not-disturb.test.ts:
@bryance/orch test: (pass) a transfer touches the lease and nothing else > the agent's process is not restarted or re-attached [231.63ms]
@bryance/orch test: (pass) a transfer touches the lease and nothing else > no reset, steer or re-attach is delivered to the agent [258.35ms]
@bryance/orch test: (pass) a transfer touches the lease and nothing else > adoption of an unheld agent disturbs it no more than a handoff does [195.89ms]
@bryance/orch test: (pass) a transfer touches the lease and nothing else > the holding that ended is kept as history, not erased by the transfer [259.12ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-lifecycle.test.ts:
@bryance/orch test: (pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [305.61ms]
@bryance/orch test: 
@bryance/orch test: test\notify-events-format.test.ts:
@bryance/orch test: (pass) notification and presence event formatting > spaceColor is stable and returns a palette hex [0.42ms]
@bryance/orch test: 
@bryance/orch test: test\no-placement-row-over-the-composed-view.test.ts:
@bryance/orch test: (pass) no Placement row is reassembled over the composed view (2.1) > the space wall reads the OPEN space interval, so a moved agent is walled by where it IS [301.31ms]
@bryance/orch test: (pass) no Placement row is reassembled over the composed view (2.1) > a string that names no registered agent is in no space rather than an error [119.98ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: (pass) fleet ownership scoping > fleet visibility follows provenance depth, not caller environment [541.72ms]
@bryance/orch test: 
@bryance/orch test: test\claim-agent.test.ts:
@bryance/orch test: (pass) claim agent > claimed A, claim A ΓåÆ unchanged [122.71ms]
@bryance/orch test: (pass) claim agent > claimed A, reclaimAgent(id) then B ΓåÆ stamped with B [241.73ms]
@bryance/orch test: (pass) claim agent > claimed A, plain claim B ΓåÆ refused claimed-by-other, row unchanged [186.99ms]
@bryance/orch test: (pass) claim agent > unknown id ΓåÆ refused unknown-agent [180.01ms]
@bryance/orch test: 
@bryance/orch test: test\no-sibling-relay.test.ts:
@bryance/orch test: (pass) a worker with no reachable spawner does not relay (L6) > an unset spawner refuses, and the refusal names the agent's own report path [39.05ms]
@bryance/orch test: 
@bryance/orch test: test\notify-events-format.test.ts:
@bryance/orch test: (pass) notification and presence event formatting > nameless events use an identity-derived agent label [1.00ms]
@bryance/orch test: (pass) notification and presence event formatting > named events prefer the human name over the harness id [0.38ms]
@bryance/orch test: (pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.20ms]
@bryance/orch test: (pass) notification and presence event formatting > webhook payload includes space and spaceColor [2.64ms]
@bryance/orch test: (pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [10.05ms]
@bryance/orch test: (pass) notification and presence event formatting > derivePresenceTransition composes the space from the agent's environment [250.12ms]
@bryance/orch test: 
@bryance/orch test: test\unleased-agents.test.ts:
@bryance/orch test: (pass) registration unleased agent hint > includes unleased workers but never session identities [242.68ms]
@bryance/orch test: 
@bryance/orch test: test\no-sibling-relay.test.ts:
@bryance/orch test: (pass) a worker with no reachable spawner does not relay (L6) > the refusal never suggests another agent as an alternative route [25.76ms]
@bryance/orch test: (pass) a worker with no reachable spawner does not relay (L6) > a spawner that is stamped but has no inbox refuses by NAME and still says to report [32.85ms]
@bryance/orch test: 
@bryance/orch test: test\pid-liveness.test.ts:
@bryance/orch test: (pass) pidAlive liveness contract (shared by pi peers) > EPERM means the process exists under another user ΓÇö alive [0.25ms]
@bryance/orch test: 
@bryance/orch test: test\notify-router.test.ts:
@bryance/orch test: (pass) notify router > delivers only when on includes the event state [0.49ms]
@bryance/orch test: 
@bryance/orch test: test\pid-liveness.test.ts:
@bryance/orch test: (pass) pidAlive liveness contract (shared by pi peers) > ESRCH means no such process ΓÇö dead [0.06ms]
@bryance/orch test: (pass) pidAlive liveness contract (shared by pi peers) > the current process is alive [0.05ms]
@bryance/orch test: (pass) pidAlive liveness contract (shared by pi peers) > non-positive and non-numeric pids are rejected without signalling [0.04ms]
@bryance/orch test: 
@bryance/orch test: test\notify-router.test.ts:
@bryance/orch test: (pass) notify router > passes typed webhook and command configuration [0.63ms]
@bryance/orch test: (pass) notify router > surfaces notifier errors [0.94ms]
@bryance/orch test: 
@bryance/orch test: test\no-stderr-writes.test.ts:
@bryance/orch test: (pass) orch has one diagnosis channel (the logger) and one output channel (stdout) > no runtime source writes to process.stderr [72.11ms]
@bryance/orch test: (pass) orch has one diagnosis channel (the logger) and one output channel (stdout) > the scan actually covers the tree it claims to [5.12ms]
@bryance/orch test: 
@bryance/orch test: test\plexer-versions.test.ts:
@bryance/orch test: (pass) plexer version support > pins herdr to the tested range, including both exclusive boundaries [1.00ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-replay.test.ts:
@bryance/orch test: (pass) orchd RPC replay buffer > replays from inside the surviving range without a gap [187.98ms]
@bryance/orch test: (pass) orchd RPC replay buffer > reports a gap when the requested sequence predates retained history [166.92ms]
@bryance/orch test: (pass) orchd RPC replay buffer > empty history has no gap or oldest sequence [114.15ms]
@bryance/orch test: (pass) orchd RPC replay buffer > limits replay size without pruning durable events [5771.68ms]
@bryance/orch test: 
@bryance/orch test: test\notifier-adapters.test.ts:
@bryance/orch test: (pass) notifier registry and built-in adapters > reports notifier reachability from one configured entry [0.48ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö orch's own grouping > create refuses a name already in use [159.32ms]
@bryance/orch test: (pass) orch space ΓÇö orch's own grouping > delete refuses a space that still holds agents [164.61ms]
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > create makes a home and records only its coordinate [145.99ms]
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > list reports that a space has a home without naming the coordinate [142.85ms]
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > rename renames orch's space and its home [160.89ms]
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > delete closes the home and drops its coordinate [112.55ms]
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > focus focuses the recorded coordinate [138.52ms]
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > a home made in another plexer is not this environment's to focus [259.96ms]
@bryance/orch test: (pass) orch space ΓÇö absence is an answer > focus with no space-home role names the space and what is missing [173.12ms]
@bryance/orch test: (pass) orch space ΓÇö absence is an answer > the plain-text answer names the space too [168.47ms]
@bryance/orch test: (pass) orch space ΓÇö vocabulary and wiring > cmdSpace lists through the resolved environment [119.62ms]
@bryance/orch test: (pass) orch space ΓÇö vocabulary and wiring > orch ws is gone [0.22ms]
@bryance/orch test: (pass) orch space ΓÇö vocabulary and wiring > space help never says workspace and offers create/rename/delete [0.17ms]
@bryance/orch test: (pass) orch space ΓÇö vocabulary and wiring > no space output ever says workspace [118.44ms]
@bryance/orch test: 
@bryance/orch test: test\notifier-adapters.test.ts:
@bryance/orch test: (pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [2.76ms]
@bryance/orch test: (pass) notifier registry and built-in adapters > a notifier error is the caller's real error [0.65ms]
@bryance/orch test: 
@bryance/orch test: test\plexer-versions.test.ts:
@bryance/orch test: (pass) plexer version support > compares numeric versions rather than lexical strings [0.09ms]
@bryance/orch test: (pass) plexer version support > rotates one open host install row when the plexer changes version [151.16ms]
@bryance/orch test: (pass) plexer version support > doctor names both versions and tells the operator to update orch [0.49ms]
@bryance/orch test: (pass) plexer version support > a supported plexer the user never installed is not a complaint [0.07ms]
@bryance/orch test: (pass) plexer version support > an in-range install reports ok with the version it read [0.07ms]
@bryance/orch test: (pass) plexer version support > only an installed plexer that cannot report a version warns [0.04ms]
@bryance/orch test: 
@bryance/orch test: test\port-has-no-shell.test.ts:
@bryance/orch test: (pass) the backend port has no dead workspace shell > backend types contain neither deleted declaration [0.31ms]
@bryance/orch test: 
@bryance/orch test: test\store-events.test.ts:
@bryance/orch test: (pass) event store rows > appendEvent keeps sequence numbers across store reopen [288.11ms]
@bryance/orch test: (pass) event store rows > pruned sequence numbers are never reused [173.02ms]
@bryance/orch test: (pass) event store rows > selectEventsSince filters by sequence, orders ascending, and honours limit [152.31ms]
@bryance/orch test: (pass) event store rows > oldestEventSeq reports undefined when empty and the surviving lowest sequence after pruning [115.26ms]
@bryance/orch test: 
@bryance/orch test: test\port-has-no-shell.test.ts:
@bryance/orch test: (pass) the backend port has no dead workspace shell > src contains no workspaceNames calls or BackendWorkspace references [26.47ms]
@bryance/orch test: 
@bryance/orch test: test\store-interval-rows.test.ts:
@bryance/orch test: (pass) interval satellites > only one open interval is allowed [176.96ms]
@bryance/orch test: 
@bryance/orch test: test\close-authority.test.ts:
@bryance/orch test: (pass) who may end an agent (D7) > an orch may close the slaves it owns, at any depth [240.88ms]
@bryance/orch test: (pass) who may end an agent (D7) > an agent may NOT close another orch's slaves, and is told whose it is [202.10ms]
@bryance/orch test: (pass) who may end an agent (D7) > an agent may not close a peer orch either [206.19ms]
@bryance/orch test: (pass) who may end an agent (D7) > an agent may always close itself ΓÇö acting on yourself is not driving a fleet [141.52ms]
@bryance/orch test: (pass) who may end an agent (D7) > the LEASE never decides it: a foreign holder does not block the owner [141.08ms]
@bryance/orch test: (pass) who may end an agent (D7) > a provenance cycle terminates instead of hanging [121.37ms]
@bryance/orch test: 
@bryance/orch test: test\commands-models.test.ts:
@bryance/orch test: (pass) orch models lists the whole catalogue > shows every offered model, quicklisted or not, allowed or not [1.01ms]
@bryance/orch test: (pass) orch models lists the whole catalogue > marks the launch default (thinking suffix removed) and the quicklist members [0.37ms]
@bryance/orch test: (pass) orch models lists the whole catalogue > keeps harness sections in configured order [0.17ms]
@bryance/orch test: (pass) orch models lists the whole catalogue > a harness that enumerates nothing gets an empty section, not another's models [0.27ms]
@bryance/orch test: (pass) orch models filters > --preferred narrows to the quicklist and renumbers what is shown [0.13ms]
@bryance/orch test: (pass) orch models filters > --search matches spec and label case-insensitively [0.12ms]
@bryance/orch test: (pass) orch models filters > filters combine, and no match is an empty result rather than the full list [0.09ms]
@bryance/orch test: (pass) orch models --pick prints one spec > a numeric pick reads the displayed index of a single harness [0.20ms]
@bryance/orch test: (pass) orch models --pick prints one spec > an exact spec pick resolves after filtering [0.08ms]
@bryance/orch test: (pass) orch models --pick prints one spec > ambiguous, missing, zero, and out-of-range picks fail [0.56ms]
@bryance/orch test: (pass) orch models --json > emits the pinned harness/model shape [0.25ms]
@bryance/orch test: 
@bryance/orch test: test\commands-spawn.test.ts:
@bryance/orch test: (pass) commands/spawn > refuses an invalid name before resolving or creating a workspace [20.57ms]
@bryance/orch test: 
@bryance/orch test: test\backend-process-role.test.ts:
@bryance/orch test: (pass) ProcessRole > headless provider records pid and start token and safely kills it [2920.61ms]
@bryance/orch test: 
@bryance/orch test: test\command-refusal.test.ts:
@bryance/orch test: (pass) a command refusal is thrown, not exited > an unresolvable target throws a CommandRefusal instead of killing the process [118.93ms]
@bryance/orch test: 
@bryance/orch test: test\commands-panes.test.ts:
@bryance/orch test: (pass) commands/panes > pane identity is the minted id alone [0.06ms]
@bryance/orch test: (pass) commands/panes > a plexer-and-space key is not an identity [0.11ms]
@bryance/orch test: (pass) commands/panes > exports the pane listing command directly [0.04ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-subscribe.test.ts:
@bryance/orch test: (pass) orchd event subscription > replays only events missed between subscriptions [246.71ms]
@bryance/orch test: 
@bryance/orch test: test\commands-spawn.test.ts:
@bryance/orch test: (pass) commands/spawn > refuses spawn without a name before any spawn mutations [119.12ms]
@bryance/orch test: (pass) commands/spawn > rejects removed spawn cap flag as unknown [0.18ms]
@bryance/orch test: (pass) commands/spawn > rejects --detached as an unknown spawn flag [6.80ms]
@bryance/orch test: (pass) commands/spawn > the positionals are the agent names [0.22ms]
@bryance/orch test: (pass) commands/spawn > collects repeated prompts in agent order [0.07ms]
@bryance/orch test: (pass) commands/spawn > each pi flavor launches its own binary and preserves raw prompt [0.34ms]
@bryance/orch test: 
@bryance/orch test: test\store-identity.test.ts:
@bryance/orch test: (pass) hello agent identity rows > reuses the live agent for the same session process and mints for another [195.98ms]
@bryance/orch test: 
@bryance/orch test: test\commands-status.test.ts:
@bryance/orch test: (pass) commands/status > zero-row message reports gathered counts and backend response [0.12ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-transport.test.ts:
@bryance/orch test: (pass) orchd RPC transports > round-trips over the default unix transport [65.87ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-runtime.test.ts:
@bryance/orch test: (pass) shebangRuntime > reads #!/usr/bin/env node as node [40.89ms]
@bryance/orch test: 
@bryance/orch test: test\store-identity.test.ts:
@bryance/orch test: (pass) hello agent identity rows > first sight creates a named root agent and open process row [140.01ms]
@bryance/orch test: 
@bryance/orch test: test\close-is-keyed-by-agent-id.test.ts:
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > an agent whose pane is gone is never handed to the plexer as a pane [195.87ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-transport.test.ts:
@bryance/orch test: (pass) orchd RPC transports > round-trips over the TCP fallback transport [150.69ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-runtime.test.ts:
@bryance/orch test: (pass) shebangRuntime > reads #!/usr/bin/env bun as bun [5.68ms]
@bryance/orch test: (pass) shebangRuntime > reads #!/usr/bin/env deno as deno [13.19ms]
@bryance/orch test: (pass) shebangRuntime > reads #!/usr/local/bin/node as node [20.61ms]
@bryance/orch test: (pass) shebangRuntime > does not mistake a longer binary name for a runtime [8.25ms]
@bryance/orch test: (pass) shebangRuntime > returns null for a file with no shebang [32.12ms]
@bryance/orch test: (pass) shebangRuntime > returns null for an unreadable path [3.20ms]
@bryance/orch test: (pass) runningRuntime > reports the runtime this suite is executing under [0.26ms]
@bryance/orch test: (pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [31.76ms]
@bryance/orch test: (pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [6.29ms]
@bryance/orch test: (pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [5.84ms]
@bryance/orch test: (pass) doctor runtime verdict table > launching under bun while declaring node is fine [8.42ms]
@bryance/orch test: (pass) doctor runtime verdict table > launching under node while declaring bun is fine [24.00ms]
@bryance/orch test: (pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [10.77ms]
@bryance/orch test: (pass) doctor runtime verdict table > declared runtime absent from PATH fails [7.19ms]
@bryance/orch test: (pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [10.58ms]
@bryance/orch test: (pass) doctor runtime verdict table > remediation names both directions ΓÇö rebuild, or re-record the declaration [8.28ms]
@bryance/orch test: (pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [2.75ms]
@bryance/orch test: 
@bryance/orch test: test\os-executors.test.ts:
@bryance/orch test: (pass) cross-OS execution is a backend, not a peer daemon > the local side supplies start, is-alive and kill [0.88ms]
@bryance/orch test: 
@bryance/orch test: test\store-instants.test.ts:
@bryance/orch test: (pass) epoch-millisecond store instants > a lease records its holding as an integer instant [177.74ms]
@bryance/orch test: (pass) epoch-millisecond store instants > agents order numerically by their creation instant, never lexically [152.01ms]
@bryance/orch test: (pass) epoch-millisecond store instants > all time-named columns use integer declarations [1.26ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-settings-defects.test.ts:
@bryance/orch test: (pass) doctor settings defects > accepts an absent settings file [8.50ms]
@bryance/orch test: 
@bryance/orch test: test\command-refusal.test.ts:
@bryance/orch test: (pass) a command refusal is thrown, not exited > the refusal carries the reason a human needs [88.72ms]
@bryance/orch test: (pass) a command refusal is thrown, not exited > the CLI boundary turns a refusal into exit 1 with the message on stdout [844.26ms]
@bryance/orch test: 
@bryance/orch test: test\close-is-keyed-by-agent-id.test.ts:
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > an agent whose pane is gone still ends, and reports done [205.21ms]
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > what a human is told they closed is the agent, not the plexer's coordinate [201.70ms]
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > the --json closed list names agents, so a caller can map it back [147.08ms]
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > the plexer is still handed the real handle when there IS a pane [136.18ms]
@bryance/orch test: 
@bryance/orch test: test\self-actor-identity.test.ts:
@bryance/orch test: (pass) a driving session's write-actor is the agent orch registered for it > the session token resolves to the id hello minted, so the actor equals its own lease holder [153.56ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc-identity.test.ts:
@bryance/orch test: (pass) daemon identity RPCs > claim-identity stamps a minted id [1486.11ms]
@bryance/orch test: 
@bryance/orch test: test\self-actor-identity.test.ts:
@bryance/orch test: (pass) a driving session's write-actor is the agent orch registered for it > a token orch has never seen resolves to nothing rather than a fabricated id [51.83ms]
@bryance/orch test: (pass) a driving session's write-actor is the agent orch registered for it > one session keeps ONE id across calls, whatever pid the shell reports [81.73ms]
@bryance/orch test: 
@bryance/orch test: test\session-env.test.ts:
@bryance/orch test: (pass) shim environment > allows the launch environment variable [0.33ms]
@bryance/orch test: 
@bryance/orch test: test\store-interval-rows.test.ts:
@bryance/orch test: (pass) interval satellites > half-open adjacency is legal [144.06ms]
@bryance/orch test: (pass) interval satellites > clearSpace closes without opening [138.79ms]
@bryance/orch test: (pass) interval satellites > agent plexer is immutable one-shot [102.65ms]
@bryance/orch test: (pass) interval satellites > process restart history closes at the successor since [92.45ms]
@bryance/orch test: (pass) interval satellites > process rows carry host and process identity [127.11ms]
@bryance/orch test: (pass) interval satellites > nullable process start_token round-trips as null [157.88ms]
@bryance/orch test: (pass) interval satellites > space move history closes at the successor since [155.27ms]
@bryance/orch test: (pass) interval satellites > tuning change history closes at the successor since [118.70ms]
@bryance/orch test: (pass) interval satellites > handle history preserves each renumbered handle [118.37ms]
@bryance/orch test: (pass) interval satellites > interval instants are stored as INTEGER values [109.70ms]
@bryance/orch test: (pass) interval satellites > process wrapper rolls back predecessor close when successor fails [76.23ms]
@bryance/orch test: (pass) interval satellites > space wrapper rolls back predecessor close when successor fails [74.85ms]
@bryance/orch test: (pass) interval satellites > tuning carries model and nullable thinking [87.07ms]
@bryance/orch test: 
@bryance/orch test: test\command-space-fields.test.ts:
@bryance/orch test: (pass) command space fields > status and wall entities use the composed space, and it is nowhere in the key [169.24ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-settings-preservation.test.ts:
@bryance/orch test: (pass) doctor settings preservation > yes mode leaves existing settings.json byte-identical [5295.31ms]
@bryance/orch test: 
@bryance/orch test: test\close-reports-every-target.test.ts:
@bryance/orch test: (pass) close reports an outcome for every target it was given (U2) > --json carries a per-target outcome, not just the successes [258.98ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-identity.test.ts:
@bryance/orch test: (pass) one key per pane spawn (12.1) > identity is an opaque minted id ΓÇö never the name, never the pane handle [258.94ms]
@bryance/orch test: 
@bryance/orch test: test\store-lease-rows.test.ts:
@bryance/orch test: (pass) agent lease rows > fencing ids are monotonic across agents and never reused after reap [163.72ms]
@bryance/orch test: 
@bryance/orch test: test\cmd-lock-serialize.test.ts:
@bryance/orch test: (pass) command lock serialization > does not evict a lock held by a live foreign process [6308.90ms]
@bryance/orch test: 
@bryance/orch test: test\command-space-fields.test.ts:
@bryance/orch test: (pass) command space fields > skipBackends keeps the authoritative presence entity shape [143.84ms]
@bryance/orch test: (pass) command space fields > status reports a mixed pi and Claude fleet with the same identity fields [1590.82ms]
@bryance/orch test: 
@bryance/orch test: test\settings-editor.test.ts:
@bryance/orch test: (pass) settings editor reducer > moves focus down and up without running off either end [0.37ms]
@bryance/orch test: (pass) settings editor reducer > opens the focused setting for editing [0.05ms]
@bryance/orch test: (pass) settings editor reducer > cancel leaves value unchanged and returns to browsing [0.04ms]
@bryance/orch test: (pass) settings editor reducer > commit updates value and produces a pending write [0.20ms]
@bryance/orch test: (pass) settings editor reducer > refuses invalid values with a reason and stays open [0.06ms]
@bryance/orch test: (pass) settings editor reducer > refuses opening a read-only setting with a reason [0.05ms]
@bryance/orch test: (pass) settings editor reducer > cancelling without a commit yields zero writes [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\reset-build-safety.test.ts:
@bryance/orch test: (pass) build reset safety > --build dry-run never names a path inside ORCH_DIR [5451.67ms]
@bryance/orch test: 
@bryance/orch test: test\clean-worktrees.test.ts:
@bryance/orch test: Preparing worktree (new branch 'orch/discard')
@bryance/orch test: (pass) clean worktrees > --force discards an unmerged orphan and its branch [5798.80ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc-identity.test.ts:
@bryance/orch test: (pass) daemon identity RPCs > claim-identity refuses an unknown id by naming it [2515.68ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-herdr-headless.test.ts:
@bryance/orch test: (pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.43ms]
@bryance/orch test: 
@bryance/orch test: test\commands-status.test.ts:
@bryance/orch test: (pass) commands/status > dead rows never display stale live state [0.05ms]
@bryance/orch test: (pass) commands/status > shared row boundary normalizes stale state for every renderer [0.11ms]
@bryance/orch test: (pass) commands/status > default status reads span every workspace [0.20ms]
@bryance/orch test: (pass) commands/status > derives status row fields from seeded presence [92.81ms]
@bryance/orch test: (pass) commands/status > marks dead presence as exited [11.40ms]
@bryance/orch test: (pass) commands/status > asking presence is surfaced as a question while still reporting live state [10.98ms]
@bryance/orch test: (pass) commands/status > shared status row carries presence-derived fields [10.54ms]
@bryance/orch test: (pass) commands/status > row carries the owning backend's declared capabilities [89.40ms]
@bryance/orch test: (pass) commands/status > an agent whose backend orch cannot name reports no capabilities [9.70ms]
@bryance/orch test: (pass) commands/status > status owner ignores spawning provenance when no lease exists [16.88ms]
@bryance/orch test: (pass) commands/status > lease-backed status attribution distinguishes my lease, another lease, and unleased rows [3541.79ms]
@bryance/orch test: (pass) commands/status > default table separates minted identity from pane environment [1.50ms]
@bryance/orch test: (pass) commands/status > human table shows harness and working directory facts [0.19ms]
@bryance/orch test: (pass) commands/status > json branch and local table branch derive identical rows apart from host [20.81ms]
@bryance/orch test: (pass) commands/status > capacity footer uses configured caps and groups holders by root [1.53ms]
@bryance/orch test: (pass) commands/status > formats workspace labels and warnings [0.18ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lease.test.ts:
@bryance/orch test: {"outcome":"answer","reason":"no-environment-role","text":"this pane environment does not provide abort"}
@bryance/orch test: {"closed":["1qzrqork79"],"results":[{"target":"1qzrqork79","handle":"close-handle","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
@bryance/orch test: {"target":"fveqwj2sxs","name":"reap-worker","reaped":true}
@bryance/orch test: (pass) lease commands > a LIVE foreign holder still excludes everyone else [2214.39ms]
@bryance/orch test: (pass) lease commands > adopt takes an unleased agent and a dead holder [214.12ms]
@bryance/orch test: (pass) lease commands > adopt refuses a holder with a live recorded process [1608.30ms]
@bryance/orch test: (pass) lease commands > reap refuses when a live descendant exists, regardless of lease [190.31ms]
@bryance/orch test: (pass) lease commands > reap refuses while the recorded process is alive [1836.50ms]
@bryance/orch test: (pass) lease commands > reap is never lease-gated and removes the record and presence [114.75ms]
@bryance/orch test: (pass) lease commands > abort proceeds with a foreign live-holder lease [1254.94ms]
@bryance/orch test: (pass) lease commands > close proceeds with a foreign live-holder lease [1483.67ms]
@bryance/orch test: (pass) lease commands > reap proceeds with a foreign live-holder lease [1421.24ms]
@bryance/orch test: (pass) lease commands > reset driving verb refuses a foreign live-holder lease [3414.99ms]
@bryance/orch test: 
@bryance/orch test: test\commands-target.test.ts:
@bryance/orch test: (pass) commands/target > splits known flags and preserves positional args [0.20ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: skipping caller: unknown backend null (reaping the record)
@bryance/orch test: skipping other: unknown backend null (reaping the record)
@bryance/orch test: {"closed":["caller","klmine0001","klforeign1","other"],"results":[{"target":"caller","handle":null,"outcome":"done","error":null},{"target":"klmine0001","handle":"mine","outcome":"done","error":null},{"target":"klforeign1","handle":"foreign","outcome":"done","error":null},{"target":"other","handle":null,"outcome":"done","error":null}],"requested":4,"ok":4,"stream":false}
@bryance/orch test: 204 |     seedSpace(dir, "local");
@bryance/orch test: 205 |     placeAgent(key, { backend: "headless", adapter: "pi", space: "local", handle: JSON.stringify({ pid, key }), owner: "other-orchestrator" });
@bryance/orch test: 206 | 
@bryance/orch test: 207 |     const result = runCli(dir, ["close", key], "caller-orchestrator");
@bryance/orch test: 208 |     expect({ status: result.status, output: result.output }).toMatchObject({ status: 0 });
@bryance/orch test: 209 |     expect(existsSync(signalPath)).toBe(true);
@bryance/orch test:                                          ^
@bryance/orch test: error: expect(received).toBe(expected)
@bryance/orch test: 
@bryance/orch test: Expected: true
@bryance/orch test: Received: false
@bryance/orch test: 
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\owner-scoping.test.ts:209:36)
@bryance/orch test: (pass) fleet ownership scoping > owner token uses ORCH_OWNER, else this process's own minted id [2.94ms]
@bryance/orch test: (pass) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [183.74ms]
@bryance/orch test: (pass) fleet ownership scoping > close --all works without an owner token [750.71ms]
@bryance/orch test: (pass) fleet ownership scoping > close --all closes all managed records regardless of owner [303.80ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lifecycle.test.ts:
@bryance/orch test: (pass) commands/lifecycle > capability helpers fail closed when absent [1.28ms]
@bryance/orch test: 
@bryance/orch test: test\cmd-lock-serialize.test.ts:
@bryance/orch test: (pass) command lock serialization > release refuses a different process instance token [1655.35ms]
@bryance/orch test: 
@bryance/orch test: test\settings-notify.test.ts:
@bryance/orch test: (pass) orch settings notify > records a sink with the field that sink declares [1193.20ms]
@bryance/orch test: 
@bryance/orch test: test\dispatch-correlation.test.ts:
@bryance/orch test: 48 |       ORCH_DAEMON_DISCOVERY_DIR: discoveries.get(orchDir),
@bryance/orch test: 49 |     },
@bryance/orch test: 50 |     stdout: "pipe",
@bryance/orch test: 51 |     stderr: "pipe",
@bryance/orch test: 52 |   });
@bryance/orch test: 53 |   if (!ran.success) throw new Error(`orch ${args.join(" ")} exited ${ran.exitCode}: ${ran.stderr.toString()}`);
@bryance/orch test:                                                                                                                   ^
@bryance/orch test: error: orch dispatch corr01agnt do the thing --cross-space --json exited 1: 
@bryance/orch test:       at runOrch (C:\dev\personal\orch\packages\orch\test\dispatch-correlation.test.ts:53:110)
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\dispatch-correlation.test.ts:115:34)
@bryance/orch test: (fail) dispatch correlation > one dispatch id produces the whole life of that dispatch [9867.53ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-declared-vs-reality.test.ts:
@bryance/orch test: (pass) doctor declared-vs-reality > reports a lease whose recorded holder process is dead [260.68ms]
@bryance/orch test: (pass) doctor declared-vs-reality > reports an environment handle missing from its plexer [180.78ms]
@bryance/orch test: (pass) doctor declared-vs-reality > reports a live agent with no lease and no live spawner [148.93ms]
@bryance/orch test: (pass) doctor declared-vs-reality > surfaces a missing task scope row as unrunnable [7265.44ms]
@bryance/orch test: (pass) doctor declared-vs-reality > doctor -y does not delete an unrunnable task [6632.76ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-backends.test.ts:
@bryance/orch test: (pass) doctor backend and presence checks > reports every registered backend and composed roles [35.65ms]
@bryance/orch test: (pass) doctor backend and presence checks > passes with herdr active while an enabled tmux sits outside a session [0.06ms]
@bryance/orch test: (pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.05ms]
@bryance/orch test: (pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [0.08ms]
@bryance/orch test: (pass) doctor backend and presence checks > fails when any enabled backend is unavailable, active or not [0.03ms]
@bryance/orch test: (pass) doctor backend and presence checks > honours the configured default over the probe order [0.02ms]
@bryance/orch test: (pass) doctor backend and presence checks > reports only records missing the current schema stamp [18.17ms]
@bryance/orch test: 
@bryance/orch test: test\commands-target.test.ts:
@bryance/orch test: (pass) commands/target > extracts target and joined prompt [0.25ms]
@bryance/orch test: (pass) commands/target > reads only structured result text [0.20ms]
@bryance/orch test: (pass) commands/target > quotes remote args and ORCH_DIR safely [0.35ms]
@bryance/orch test: (pass) commands/target > lists only live serialized identity presence entries [769.32ms]
@bryance/orch test: 
@bryance/orch test: test\broker-routing.test.ts:
@bryance/orch test: (pass) broker CLI routing > status --offline reads seeded presence files without a daemon [1558.47ms]
@bryance/orch test: 
@bryance/orch test: test\close-reports-every-target.test.ts:
@bryance/orch test: (pass) close reports an outcome for every target it was given (U2) > a failed target reports outcome error WITH the real error text [1454.77ms]
@bryance/orch test: (pass) close reports an outcome for every target it was given (U2) > a pane the plexer no longer has is CLOSED, not failed [1909.81ms]
@bryance/orch test: (pass) close reports an outcome for every target it was given (U2) > the exit code still reflects whether every target closed [132.47ms]
@bryance/orch test: 
@bryance/orch test: test\control-dispatch.test.ts:
@bryance/orch test: (pass) deliverControl > steers pi through its presence inbox [51.03ms]
@bryance/orch test: 
@bryance/orch test: test\build-bin.test.ts:
@bryance/orch test: (pass) build entrypoint > always stamps a node shebang and executable mode [33.73ms]
@bryance/orch test: (pass) the installed CLI is the packaged build, never live source (K2) > the `orch` bin points at the packaged entrypoint, not bin/orch.ts [0.09ms]
@bryance/orch test: (pass) the installed CLI is the packaged build, never live source (K2) > the packaged entrypoint is built for node, from the source entrypoint [0.06ms]
@bryance/orch test: (pass) the installed CLI is the packaged build, never live source (K2) > a global install cannot happen without a build in front of it [0.06ms]
@bryance/orch test: (pass) the installed CLI is the packaged build, never live source (K2) > the package ships dist/, so what is installed is what was built [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-checks.test.ts:
@bryance/orch test: (pass) doctor provenance-depth checks > finds a live agent deeper than fleet.max_depth [242.25ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lifecycle.test.ts:
@bryance/orch test: (pass) commands/lifecycle > reports missing bridge pid without touching backend [0.45ms]
@bryance/orch test: (pass) commands/lifecycle > --all targets the agents this orch holds a live lease on, and drops them when it releases [811.25ms]
@bryance/orch test: 
@bryance/orch test: test\lifecycle-targets.test.ts:
@bryance/orch test: (pass) lifecycle target resolution > prefers one live agent over dead ones sharing its name [0.35ms]
@bryance/orch test: (pass) lifecycle target resolution > reports the target and disambiguating ids for live ambiguity [0.53ms]
@bryance/orch test: (pass) lifecycle target resolution > cleanup can still resolve a dead agent when no live match exists [0.04ms]
@bryance/orch test: (pass) lifecycle target resolution > an agent is addressable by its id, its name, or its pane handle [0.03ms]
@bryance/orch test: (pass) lifecycle target resolution > the pane is environment: moving it leaves every other address intact [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\lock-holder.test.ts:
@bryance/orch test: (pass) command lock holder > uses the registered agent id [3.24ms]
@bryance/orch test: (pass) command lock holder > uses the process user fallback when unregistered [8.24ms]
@bryance/orch test: 
@bryance/orch test: test\commands-logging.test.ts:
@bryance/orch test: (pass) orch logs > --dispatch selects one dispatch across both sinks, oldest first [41.05ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-identity.test.ts:
@bryance/orch test: (pass) one key per pane spawn (12.1) > a name freed by a dead agent is reusable, and the two agents differ in identity [2630.67ms]
@bryance/orch test: (pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [814.08ms]
@bryance/orch test: (pass) A1: spawn registration records the space as an environment axis > a spawn into a space writes agent_spaces, and the composer reads it back [168.35ms]
@bryance/orch test: (pass) A1: spawn registration records the space as an environment axis > a spawn stating no space records NO ROW ΓÇö a missing axis is a missing row [130.39ms]
@bryance/orch test: (pass) A1: spawn registration records the space as an environment axis > moving an agent to another space closes the old interval and keeps its identity [142.63ms]
@bryance/orch test: 
@bryance/orch test: test\peer-tools-registration.test.ts:
@bryance/orch test: (pass) peer tool registration > does not register orch_send when no spawner address exists [59.46ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-herdr-headless.test.ts:
@bryance/orch test: (pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.21ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.20ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.17ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.38ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.46ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [67.02ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [0.25ms]
@bryance/orch test: (pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [908.46ms]
@bryance/orch test: (pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [964.93ms]
@bryance/orch test: 
@bryance/orch test: test\commands-logging.test.ts:
@bryance/orch test: (pass) orch logs > --agent selects one agent's records [24.86ms]
@bryance/orch test: (pass) orch logs > --level selects one severity [28.07ms]
@bryance/orch test: (pass) orch logs > --since drops everything older than the instant given [48.08ms]
@bryance/orch test: (pass) orch logs > --since 0 keeps every record instead of being read as a missing value [17.63ms]
@bryance/orch test: (pass) orch logs > renders a readable line: instant, level, event, correlation, agent, fields [15.04ms]
@bryance/orch test: (pass) orch logs > --json emits the records themselves [46.56ms]
@bryance/orch test: (pass) command logging > notify test records the diagnosis and keeps user output on stdout [42.00ms]
@bryance/orch test: 
@bryance/orch test: test\peer-tools-registration.test.ts:
@bryance/orch test: (pass) peer tool registration > does not register orch_send when the spawner pid is dead [31.69ms]
@bryance/orch test: (pass) peer tool registration > registers orch_send when the spawner has live presence and an inbox [54.17ms]
@bryance/orch test: 
@bryance/orch test: test\settings-notify.test.ts:
@bryance/orch test: (pass) orch settings notify > re-adding one sink replaces it in place and keeps the fields the call omits [781.60ms]
@bryance/orch test: (pass) orch settings notify > accepts asking as a first-class sink state [47.39ms]
@bryance/orch test: (pass) orch settings notify > remove drops only the named sink [91.66ms]
@bryance/orch test: (pass) orch settings notify > list reports each sink with the states it fires on, defaults included [80.63ms]
@bryance/orch test: (pass) orch settings notify > an empty notify array lists as none configured [9.60ms]
@bryance/orch test: (pass) orch settings notify > the notify row lists every sink, the states it may fire on, and the fields each carries [49.81ms]
@bryance/orch test: (pass) orch settings notify > the notify row writes the picked sinks, states included, and drops the ones left off [35.11ms]
@bryance/orch test: (pass) orch settings notify > the notify row refuses an unknown sink, a carrying sink with nothing to carry, and an unknown state [8.15ms]
@bryance/orch test: 
@bryance/orch test: test\store-lease-rows.test.ts:
@bryance/orch test: (pass) agent lease rows > a second open lease is rejected [1223.65ms]
@bryance/orch test: (pass) agent lease rows > release and expiry close rows with matching reason and exact until [1218.08ms]
@bryance/orch test: (pass) agent lease rows > handoff closes current and inserts a newer row without changing prior facts [824.41ms]
@bryance/orch test: (pass) agent lease rows > adoption closes prior and inserts a strictly newer adopter row [95.18ms]
@bryance/orch test: (pass) agent lease rows > adoption with no open lease is plain acquire and leaves closed history untouched [136.93ms]
@bryance/orch test: (pass) agent lease rows > handoff rolls back close when successor insert fails [138.99ms]
@bryance/orch test: (pass) agent lease rows > wrong-holder release and handoff are rejected [117.61ms]
@bryance/orch test: (pass) agent lease rows > an agent cannot lease itself [118.22ms]
@bryance/orch test: (pass) agent lease rows > expiry inserts nothing new [109.73ms]
@bryance/orch test: (pass) agent lease rows > reads return only open rows [122.50ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-limits.test.ts:
@bryance/orch test: (pass) spawn limits > schema loads global and workspace caps [46.52ms]
@bryance/orch test: 
@bryance/orch test: test\pi-model-control.test.ts:
@bryance/orch test: (pass) splitThinkingSuffix > splits a valid ladder effort off the bare id [0.12ms]
@bryance/orch test: (pass) splitThinkingSuffix > leaves a bare model untouched [0.07ms]
@bryance/orch test: (pass) splitThinkingSuffix > keeps a trailing colon token that is not a thinking level as part of the id [0.04ms]
@bryance/orch test: (pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > looks up the BARE id and returns the effort suffix separately [11.84ms]
@bryance/orch test: (pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > retries until a still-booting registry answers [22.99ms]
@bryance/orch test: (pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > throws when the registry never yields the model [0.36ms]
@bryance/orch test: (pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > rejects a token without a provider/id shape [0.15ms]
@bryance/orch test: (pass) createModelControl.applyControlCommand > applies a suffixed model command and records a success outcome [1.80ms]
@bryance/orch test: 
@bryance/orch test: test\backend-tmux.test.ts:
@bryance/orch test: (pass) TmuxBackend > current identity uses the explicit id, not the launch environment [18.47ms]
@bryance/orch test: 
@bryance/orch test: test\control-dispatch.test.ts:
@bryance/orch test: (pass) deliverControl > refuses to steer a pane awaiting an answer, naming the primitive that lands [22.66ms]
@bryance/orch test: (pass) deliverControl > still answers a pane awaiting an answer [76.22ms]
@bryance/orch test: (pass) deliverControl > a run dispatch is not blocked by an asking pane [39.41ms]
@bryance/orch test: (pass) deliverControl > does not fall back from a keys strategy to the orch channel [135.69ms]
@bryance/orch test: (pass) deliverControl > a run to a keys-strategy agent with no pane is answered, never queued on the channel [119.53ms]
@bryance/orch test: (pass) deliverControl > refuses steer and model on an adapter that composes neither role [19.60ms]
@bryance/orch test: (pass) deliverControl > requires presence for inbox delivery [117.12ms]
@bryance/orch test: (pass) deliverControl > refuses inbox delivery to an agent whose bridge never registered [94.70ms]
@bryance/orch test: (pass) deliverControl > refuses inbox delivery to an agent whose process is gone [85.92ms]
@bryance/orch test: 
@bryance/orch test: test\store-outbox.test.ts:
@bryance/orch test: (pass) outbox store rows > inserts pending messages and orders them by creation time [90.88ms]
@bryance/orch test: 
@bryance/orch test: test\peer-lease-visibility.test.ts:
@bryance/orch test: (pass) peer summaries carry ownership as a lease > a peer nobody ever took reports no orch driving it [1338.19ms]
@bryance/orch test: (pass) peer summaries carry ownership as a lease > a dead holder is not a live one [1338.49ms]
@bryance/orch test: (pass) the compact listing separates orphans from live work > unleased peers sit in their own bucket, below the driven ones [2461.82ms]
@bryance/orch test: (pass) the compact listing separates orphans from live work > a held peer names its holder, and an unleased one never reads as yours [3484.10ms]
@bryance/orch test: (pass) the compact listing separates orphans from live work > with nothing unleased the bucket does not appear at all [1854.58ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-herdr-headless.test.ts:
@bryance/orch test: (pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [452.33ms]
@bryance/orch test: (pass) headless common path: identity key -> presence > one adapter uses the same opaque key across headless and tmux routes [0.41ms]
@bryance/orch test: (pass) headless common path: identity key -> presence > a key carries no environment to read back out of it [0.08ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-tmux.test.ts:
@bryance/orch test: (pass) tmux backend registry and capabilities > is registered [0.32ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > explicit selection follows tmux availability [33.57ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > exposes pane roles [0.16ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > reflects the TMUX environment [0.23ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > a tmux agent's key is the minted id, never its pane [0.55ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [12.39ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [0.35ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [0.14ms]
@bryance/orch test: 
@bryance/orch test: test\backend-process-role.test.ts:
@bryance/orch test: (pass) ProcessRole > herdr provider records pid and start token and safely kills it [3509.58ms]
@bryance/orch test: (pass) ProcessRole > tmux provider records pid and start token and safely kills it [2767.24ms]
@bryance/orch test: (pass) ProcessRole > reports replaced when a pid is reused by a different process token [0.25ms]
@bryance/orch test: 
@bryance/orch test: test\backend-space-home.test.ts:
@bryance/orch test: (pass) tmux space home > focus switches the client to the session holding the space [0.23ms]
@bryance/orch test: (pass) tmux space home > create names the session after the space and returns its root pane [0.20ms]
@bryance/orch test: (pass) tmux space home > rename and close address the session coordinate [0.07ms]
@bryance/orch test: (pass) tmux space home > list reports every session as a coordinate with a label [0.14ms]
@bryance/orch test: (pass) a home orch opens is never unmarked (E8) > an unlabelled pack home is named for the pack it was opened for [0.09ms]
@bryance/orch test: (pass) a home orch opens is never unmarked (E8) > an unlabelled space home is named for the space, not for the pack [0.06ms]
@bryance/orch test: (pass) a home orch opens is never unmarked (E8) > a subject id the plexer would refuse is made safe, never passed through [0.03ms]
@bryance/orch test: (pass) a home orch opens is never unmarked (E8) > a caller-supplied label is used verbatim [0.17ms]
@bryance/orch test: 
@bryance/orch test: test\store-outbox.test.ts:
@bryance/orch test: (pass) outbox store rows > reports one message's pending state [99.27ms]
@bryance/orch test: (pass) outbox store rows > bumps attempts and hides a message until its next attempt time [106.38ms]
@bryance/orch test: (pass) outbox store rows > deletes delivered messages older than the cutoff [148.42ms]
@bryance/orch test: 
@bryance/orch test: test\peer-project-scope.test.ts:
@bryance/orch test: (pass) peer discovery walls on the project > a same-workspace peer from another project is invisible by default [26.08ms]
@bryance/orch test: 
@bryance/orch test: test\close-always.test.ts:
@bryance/orch test: {"closed":["panename01","panekey001","paneid0001"],"results":[{"target":"panename01","handle":"pane-name","outcome":"done","error":null},{"target":"panekey001","handle":"pane-key","outcome":"done","error":null},{"target":"paneid0001","handle":"pane-id","outcome":"done","error":null}],"requested":3,"ok":3,"stream":false}
@bryance/orch test: (pass) close always works > closes a foreign-space target by name, key, or pane id [375.08ms]
@bryance/orch test: 
@bryance/orch test: test\doctor.test.ts:
@bryance/orch test: (pass) runDoctor > detects DrvFs paths by mount path segment [0.20ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-tmux.test.ts:
@bryance/orch test: (pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-space [198.65ms]
@bryance/orch test: 
@bryance/orch test: test\cmd-lock.test.ts:
@bryance/orch test: (pass) command lock > acquire and release round-trip [1755.55ms]
@bryance/orch test: 
@bryance/orch test: test\peer-project-scope.test.ts:
@bryance/orch test: (pass) peer discovery walls on the project > all_workspaces deliberately lifts the project wall [15.19ms]
@bryance/orch test: (pass) peer discovery walls on the project > a cross-project target does not resolve for sends without the explicit flag [37.26ms]
@bryance/orch test: (pass) peer discovery walls on the project > a record with no project stamp is malformed and never listed [21.52ms]
@bryance/orch test: (pass) peer discovery walls on the project > a spawned agent's all_workspaces flag is ignored [140.81ms]
@bryance/orch test: 
@bryance/orch test: test\space-walls.test.ts:
@bryance/orch test: (pass) space helpers > reads space ids from the environment satellite, never from the key [34.14ms]
@bryance/orch test: 
@bryance/orch test: test\skew-guard.test.ts:
@bryance/orch test: (pass) CLI daemon skew guard > allows read-only commands while the daemon is skewed [396.25ms]
@bryance/orch test: (pass) CLI daemon skew guard > --stale-ok overrides refusal for a mutating command [1486.79ms]
@bryance/orch test: (pass) CLI daemon skew guard > doctor reports skew as a warning without making skew itself a failure [4504.21ms]
@bryance/orch test: (pass) CLI daemon skew guard > does not treat an absent daemon as skew and auto-starts a fresh daemon [8209.90ms]
@bryance/orch test: 
@bryance/orch test: test\space-walls.test.ts:
@bryance/orch test: (pass) space helpers > an agent that moves space keeps its identity and reports the new space [12.00ms]
@bryance/orch test: (pass) space helpers > derives an entity space from the store [6.04ms]
@bryance/orch test: (pass) space helpers > returns the same entities when all spaces are requested [0.52ms]
@bryance/orch test: (pass) space wall writes > allows a write within the same space [1.54ms]
@bryance/orch test: (pass) space wall writes > denies a cross-space write with both spaces in the reason [1.00ms]
@bryance/orch test: (pass) space wall writes > applies the same wall rule whatever plexer the agents sit in [23.40ms]
@bryance/orch test: (pass) space wall writes > allows a cross-space write with an explicit override [1.57ms]
@bryance/orch test: (pass) space wall writes > allows unplaced targets [1.32ms]
@bryance/orch test: 
@bryance/orch test: test\settings-defects.test.ts:
@bryance/orch test: (pass) settingsDefects > returns no defects for an absent file [5.07ms]
@bryance/orch test: 
@bryance/orch test: test\space-policy.test.ts:
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > placing an agent in a space nobody created is refused, not minted [131.09ms]
@bryance/orch test: 
@bryance/orch test: test\settings-command.test.ts:
@bryance/orch test: fleet.max_depth = 6
@bryance/orch test: (pass) orch settings > every registered setting is printed in the table [676.30ms]
@bryance/orch test: (pass) orch settings > --json reports value + source per setting, settings.json winning over defaults [515.61ms]
@bryance/orch test: (pass) orch settings > --json reports env as the winning source over settings.json [512.88ms]
@bryance/orch test: (pass) orch settings > --harness switches defaults.adapter between enabled ids and rejects a non-enabled id [1306.87ms]
@bryance/orch test: (pass) orch settings > reports each harness's picker quicklist and launch gate as separate rows [374.02ms]
@bryance/orch test: (pass) orch settings > a load error surfaces loudly with no partial table [264.30ms]
@bryance/orch test: (pass) orch settings > sets a boolean through its registry entry [399.83ms]
@bryance/orch test: (pass) orch settings > sets an integer through its registry entry [588.67ms]
@bryance/orch test: (pass) orch settings > single-setting set delegates to the registry writer [15.41ms]
@bryance/orch test: (pass) orch settings > sets a choice through its registry entry [454.49ms]
@bryance/orch test: (pass) orch settings > sets a multi value through its registry entry [486.27ms]
@bryance/orch test: (pass) orch settings > sets a list value through its registry entry [1913.70ms]
@bryance/orch test: (pass) orch settings > refuses an invalid boolean and names the allowed values [1513.15ms]
@bryance/orch test: (pass) orch settings > refuses an invalid integer and names the allowed range [260.96ms]
@bryance/orch test: (pass) orch settings > refuses an invalid choice and names the allowed choices [350.35ms]
@bryance/orch test: (pass) orch settings > refuses an invalid multi value and names the allowed choices [527.21ms]
@bryance/orch test: (pass) orch settings > refuses an invalid list and names JSON as the allowed format [320.12ms]
@bryance/orch test: (pass) orch settings > refuses an unknown key and suggests nearest valid keys [431.76ms]
@bryance/orch test: (pass) orch settings > refuses read-only runtime and names the editing subcommand [377.92ms]
@bryance/orch test: 
@bryance/orch test: test\settings-defects.test.ts:
@bryance/orch test: (pass) settingsDefects > returns no defects for a valid settings file [36.17ms]
@bryance/orch test: (pass) settingsDefects > reports unparsable JSON as one file defect [7.46ms]
@bryance/orch test: (pass) settingsDefects > suggests a near-match for a stale key [31.36ms]
@bryance/orch test: (pass) settingsDefects > does not guess a replacement for a removed key [12.74ms]
@bryance/orch test: (pass) settingsDefects > reports the expected pinned schema value [13.02ms]
@bryance/orch test: (pass) settingsDefects > reports a wrong value type on a real key [25.12ms]
@bryance/orch test: 
@bryance/orch test: test\codex-adapter.test.ts:
@bryance/orch test: (pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [7.56ms]
@bryance/orch test: 
@bryance/orch test: test\os-executors.test.ts:
@bryance/orch test: (pass) cross-OS execution is a backend, not a peer daemon > an OS side with no executor answers, and never runs the body [0.27ms]
@bryance/orch test: (pass) cross-OS execution is a backend, not a peer daemon > the local side runs the body and hands back its value [0.35ms]
@bryance/orch test: (pass) cross-OS execution is a backend, not a peer daemon > doctor passes a daemon registered on the side orch is running on [4292.37ms]
@bryance/orch test: (pass) cross-OS execution is a backend, not a peer daemon > doctor answers, rather than failing, for a daemon on a side with no executor [2560.35ms]
@bryance/orch test: 
@bryance/orch test: test\broker-ownership.test.ts:
@bryance/orch test: (pass) broker ownership and space governance > the composed holder is the only ownership record, and adoption moves it [100.19ms]
@bryance/orch test: 
@bryance/orch test: test\os-side.test.ts:
@bryance/orch test: (pass) osSide > supports both platform branches independent of ambient host [0.18ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc-identity.test.ts:
@bryance/orch test: (pass) daemon identity RPCs > register-session mints one id per session token [3840.04ms]
@bryance/orch test: (pass) daemon identity RPCs > the removed method is unknown [28.75ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-no-peer-credentials.test.ts:
@bryance/orch test: (pass) the daemon asks for a token and nothing else > no peer-credential or ancestry syscall appears in the daemon at all [5.60ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc.test.ts:
@bryance/orch test: (pass) daemon RPC > rejects a hello response with a malformed optional field [0.40ms]
@bryance/orch test: 
@bryance/orch test: test\pi-model-control.test.ts:
@bryance/orch test: (pass) createModelControl.applyControlCommand > records a failure outcome when the model is rejected [1801.42ms]
@bryance/orch test: 
@bryance/orch test: test\cmd-lock-bridge.test.ts:
@bryance/orch test: (pass) pi-bridge command-lock interception > wraps a matching locked command in acquireΓåÆrelease around the tool call [1669.25ms]
@bryance/orch test: 
@bryance/orch test: test\pi-model-control.test.ts:
@bryance/orch test: (pass) createModelControl.applyControlCommand > applies a thinking command directly [5.72ms]
@bryance/orch test: 
@bryance/orch test: test\codex-adapter.test.ts:
@bryance/orch test: (pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [6.12ms]
@bryance/orch test: (pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [6.27ms]
@bryance/orch test: (pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [19.63ms]
@bryance/orch test: (pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [19.18ms]
@bryance/orch test: (pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [198.28ms]
@bryance/orch test: 
@bryance/orch test: test\broker-ownership.test.ts:
@bryance/orch test: (pass) broker ownership and space governance > refuses cross-space writes unless explicitly overridden [140.11ms]
@bryance/orch test: (pass) broker ownership and space governance > moving an agent between spaces moves the wall, not its identity [87.30ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-unscoped-tasks.test.ts:
@bryance/orch test: (pass) doctor task scopes > a facade-enqueued task has exactly one typed scope [86.00ms]
@bryance/orch test: 
@bryance/orch test: test\lifecycle-reports-a-partial-run.test.ts:
@bryance/orch test: (pass) a partial reload or restart is reported, not exited > reload --json writes the whole payload and sets exitCode, never exits [185.88ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-unscoped-tasks.test.ts:
@bryance/orch test: (pass) doctor task scopes > the database rejects an unscoped task instead of keeping a legacy queue row [103.17ms]
@bryance/orch test: (pass) doctor task scopes > doctor lists unrunnable tasks and deliberate resolutions without deleting [127.51ms]
@bryance/orch test: 
@bryance/orch test: test\backend-tmux.test.ts:
@bryance/orch test: (pass) TmuxBackend > does not expose legacy top-level group methods [0.22ms]
@bryance/orch test: (pass) TmuxBackend > composes a complete group role bundle [0.15ms]
@bryance/orch test: (pass) TmuxBackend > exposes tmux pane roles [0.21ms]
@bryance/orch test: (pass) TmuxBackend > does not declare pane foreground capability [0.18ms]
@bryance/orch test: (pass) TmuxBackend > reports tmux availability [30.92ms]
@bryance/orch test: (pass) TmuxBackend > reflects the TMUX environment [0.34ms]
@bryance/orch test: (pass) TmuxBackend > rejects an empty handle without invoking tmux [0.20ms]
@bryance/orch test: (pass) TmuxBackend > the pane inventory surfaces only orch-spawned panes [2.22ms]
@bryance/orch test: (pass) TmuxBackend > status-facing inventory displays the tmux session workspace [4.78ms]
@bryance/orch test: (pass) TmuxBackend > inventory status is read from the pane's presence status.json [16.64ms]
@bryance/orch test: (pass) TmuxBackend > inventory status is null when no presence status.json exists [0.76ms]
@bryance/orch test: (pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [298.37ms]
@bryance/orch test: (pass) TmuxBackend > waiting fails immediately when the pane has no presence key [0.39ms]
@bryance/orch test: (pass) TmuxBackend > the pane screen returns captured text and throws when capture-pane fails [1786.42ms]
@bryance/orch test: (pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [1.36ms]
@bryance/orch test: (pass) TmuxBackend > paneHost.open splits the requested target with cwd and environment [0.60ms]
@bryance/orch test: (pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.85ms]
@bryance/orch test: (pass) TmuxBackend > spawn splits the planned target pane, not whatever pane the window has active [0.70ms]
@bryance/orch test: (pass) TmuxBackend > groupLayout reports every pane in a window with its cell geometry [0.80ms]
@bryance/orch test: (pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.82ms]
@bryance/orch test: (pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [0.58ms]
@bryance/orch test: (pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.36ms]
@bryance/orch test: (pass) an agent is launched with its fleet's project scope (1.13) > a tmux agent in a worktree carries the FLEET's project, not its own cwd [0.77ms]
@bryance/orch test: (pass) an agent is launched with its fleet's project scope (1.13) > a tmux agent opened in a fresh window carries it too [0.77ms]
@bryance/orch test: (pass) an agent is launched with its fleet's project scope (1.13) > an empty value is dropped rather than exported as a configured blank [0.61ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-stale-presence.test.ts:
@bryance/orch test: killed 1 dangling process
@bryance/orch test: (fail) doctor stale presence safety > describes a dead agent by name and project, not a bare key [6124.28ms]
@bryance/orch test:   ^ this test timed out after 5000ms.
@bryance/orch test: 
@bryance/orch test: test\lifecycle-reports-a-partial-run.test.ts:
@bryance/orch test: (pass) a partial reload or restart is reported, not exited > restart --json writes the whole payload and sets exitCode, never exits [95.18ms]
@bryance/orch test: 
@bryance/orch test: test\routing-hardening.test.ts:
@bryance/orch test: (pass) store hardening > stores hostile values as data and preserves pack selection [97.18ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-settings-defects.test.ts:
@bryance/orch test: (pass) doctor settings defects > accepts a clean settings file and keeps its path detail [39.25ms]
@bryance/orch test: (pass) doctor settings defects > reports malformed JSON as a file defect [4.43ms]
@bryance/orch test: (pass) doctor settings defects > reports a read failure instead of throwing [6.16ms]
@bryance/orch test: (pass) doctor settings defects > reports a stale key with the value that was written [39.18ms]
@bryance/orch test: (pass) doctor settings defects > reports a typo with its suggested key [21.46ms]
@bryance/orch test: (pass) doctor settings defects > reports the expected schema version [17.25ms]
@bryance/orch test: (pass) doctor settings defects > skips settings-dependent checks with a short repair hint [7410.60ms]
@bryance/orch test: 
@bryance/orch test: test\close-always.test.ts:
@bryance/orch test: Could not close survives01: pane-survives is still listed by headless after the close
@bryance/orch test: {"closed":[],"results":[{"target":"survives01","handle":"pane-survives","outcome":"error","error":"pane-survives is still listed by headless after the close"}],"requested":1,"ok":0,"stream":false}
@bryance/orch test: (pass) close always works > a successful backend close retains a pane that is still listed [1937.22ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-hosts.test.ts:
@bryance/orch test: (pass) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [3550.67ms]
@bryance/orch test: 
@bryance/orch test: test\seat-index.test.ts:
@bryance/orch test: (pass) seat pure seams > errorMessage preserves non-Error thrown values [9.04ms]
@bryance/orch test: (pass) seat pure seams > hasTheme discriminates missing and valid themes [20.17ms]
@bryance/orch test: (pass) seat pure seams > countStates groups active, blocked, failed, and settled states [0.22ms]
@bryance/orch test: (pass) seat pure seams > formatSeatStatus renders state counts and view hint [0.38ms]
@bryance/orch test: (pass) seat pure seams > reconcileDashboardSelection preserves id and guards missing snapshots [0.19ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-status-lease.test.ts:
@bryance/orch test: (pass) daemon status lease payload > reports the current holder and its liveness [1797.79ms]
@bryance/orch test: 
@bryance/orch test: test\routing-hardening.test.ts:
@bryance/orch test: (pass) store hardening > a fresh store creates the full current schema with WAL enabled [97.82ms]
@bryance/orch test: (pass) store hardening > the store refuses a second open holding, so ownership cannot fork [93.56ms]
@bryance/orch test: (pass) store hardening > adoption closes the prior holding in the same step that opens the new one [89.85ms]
@bryance/orch test: (pass) store hardening > the attempt insert claim is exactly once [124.68ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-no-peer-credentials.test.ts:
@bryance/orch test: (pass) the daemon asks for a token and nothing else > a caller the daemon has no relationship to is accepted on the token alone [1188.91ms]
@bryance/orch test: (pass) the daemon asks for a token and nothing else > that same stranger without the token is refused, so the token is what decided [43.06ms]
@bryance/orch test: 
@bryance/orch test: test\routing-hardening.test.ts:
@bryance/orch test: (pass) CLI offline routing > status --offline does not start or contact orchd [293.87ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-registration.test.ts:
@bryance/orch test: (pass) machine daemon registration > refuses a second start and names the live socket [2931.06ms]
@bryance/orch test: 
@bryance/orch test: test\space-policy.test.ts:
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > two unspaced agents in the SAME repo root can reach each other [118.74ms]
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > two unspaced agents in DIFFERENT repo roots cannot [137.44ms]
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > an agent placed in no space reports none, even inside a plexer workspace [175.12ms]
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > recording a spawn never conjures the space it names [84.93ms]
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > a space still walls, and it outranks the repo root [133.58ms]
@bryance/orch test: (pass) space policy > reads the space from the environment satellite, and absence is null [186.02ms]
@bryance/orch test: (pass) space policy > resolves space names through records and functions [0.41ms]
@bryance/orch test: (pass) space policy > compares agents by the space each is composed into [177.86ms]
@bryance/orch test: (pass) space policy > enforces the space wall across every plexer alike [250.70ms]
@bryance/orch test: (pass) space policy > scopes agents to the current space [185.97ms]
@bryance/orch test: (pass) space policy > a null current space leaves items unscoped [81.03ms]
@bryance/orch test: (pass) space policy > 2.7 status displays the composed space, not text sliced from a key [193.87ms]
@bryance/orch test: (pass) space policy > 6.6 structured identity drives status and policy, not serialized key text [144.24ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-status-lease.test.ts:
@bryance/orch test: (pass) daemon status lease payload > distinguishes a known unleased agent from an unknown key [681.40ms]
@bryance/orch test: 
@bryance/orch test: test\cmd-lock.test.ts:
@bryance/orch test: 79 |     if (Date.now() - started >= timeoutMs) break;
@bryance/orch test: 80 |     await sleep(pollMs);
@bryance/orch test: 81 |   }
@bryance/orch test: 82 |   const holder = loadLock(path);
@bryance/orch test: 83 |   const heldBy = holder ? `${holder.holder} (pid ${holder.pid})` : "an unknown holder";
@bryance/orch test: 84 |   throw new Error(`timed out after ${timeoutMs}ms waiting for command lock held by ${heldBy}`);
@bryance/orch test:                  ^
@bryance/orch test: error: timed out after 2000ms waiting for command lock held by first (pid 27288)
@bryance/orch test:       at acquireCommandLock (C:\dev\personal\orch\packages\orch\src\control\cmd-lock.ts:84:13)
@bryance/orch test: (fail) command lock > second acquire blocks until first releases [3009.12ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-lifecycle.test.ts:
@bryance/orch test: Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.4.0+34cbb9a40)
@bryance/orch test: 
@bryance/orch test: Usage: bun <command> [...flags] [...args]
@bryance/orch test: 
@bryance/orch test: Commands:
@bryance/orch test:   run       ./my-script.ts       Execute a file with Bun
@bryance/orch test:             lint                 Run a package.json script
@bryance/orch test:   test                           Run unit tests with Bun
@bryance/orch test:   x         bun-repl             Execute a package binary (CLI), installing if needed (bunx)
@bryance/orch test:   repl                           Start a REPL session with Bun
@bryance/orch test:   exec                           Run a shell script directly with Bun
@bryance/orch test: 
@bryance/orch test:   install                        Install dependencies for a package.json (bun i)
@bryance/orch test:   add       lyra                 Add a dependency to package.json (bun a)
@bryance/orch test:   remove    underscore           Remove a dependency from package.json (bun rm)
@bryance/orch test:   update    @remix-run/dev       Update outdated dependencies
@bryance/orch test:   audit                          Check installed packages for vulnerabilities
@bryance/orch test:   dedupe                         Remove duplicate versions from the lockfile
@bryance/orch test:   prune                          Remove packages that are not in the lockfile from node_modules
@bryance/orch test:   outdated                       Display latest versions of outdated dependencies
@bryance/orch test:   link      [<package>]          Register or link a local npm package
@bryance/orch test:   unlink                         Unregister a local npm package
@bryance/orch test:   publish                        Publish a package to the npm registry
@bryance/orch test:   patch <pkg>                    Prepare a package for patching
@bryance/orch test:   pm <subcommand>                Additional package management utilities
@bryance/orch test:   info      @evan/duckdb         Display package metadata from the registry
@bryance/orch test:   why       @zarfjs/zarf         Explain why a package is installed
@bryance/orch test: 
@bryance/orch test:   build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file
@bryance/orch test: 
@bryance/orch test:   init                           Start an empty Bun project from a built-in template
@bryance/orch test:   create    next-app             Create a new project from a template (bun c)
@bryance/orch test:   upgrade                        Upgrade to latest version of Bun.
@bryance/orch test: 
@bryance/orch test:   <command> --help               Print help text for command.
@bryance/orch test: 
@bryance/orch test: Learn more about Bun:            https://bun.com/docs
@bryance/orch test: Join our Discord community:      https://bun.com/discord
@bryance/orch test: (pass) daemon lifecycle > reexecs with the current argv and hands over the lock [1227.25ms]
@bryance/orch test: (pass) daemon lifecycle > rejects a recycled pid identity [4534.61ms]
@bryance/orch test: (pass) daemon lifecycle > foreign machine registration cannot be signalled for another store [2547.67ms]
@bryance/orch test: (pass) daemon lifecycle > only a provable lock owner may be signalled [2103.02ms]
@bryance/orch test: (pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [9.38ms]
@bryance/orch test: 
@bryance/orch test: test\cmd-lock-bridge.test.ts:
@bryance/orch test: (pass) pi-bridge command-lock interception > leaves a non-matching command untouched ΓÇö no acquire, no release [894.36ms]
@bryance/orch test: (pass) pi-bridge command-lock interception > only bash tool calls are intercepted ΓÇö a non-bash tool never acquires [625.93ms]
@bryance/orch test: 
@bryance/orch test: test\close-always.test.ts:
@bryance/orch test: Could not close signalfai1: signal denied
@bryance/orch test: {"closed":[],"results":[{"target":"signalfai1","handle":"pane-signal-failed","outcome":"error","error":"signal denied"}],"requested":1,"ok":0,"stream":false}
@bryance/orch test: {"closed":["presence01"],"results":[{"target":"presence01","handle":"pane-presence-only","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
@bryance/orch test: (pass) close always works > a failed signal retains the registry and presence and reports failure [1454.46ms]
@bryance/orch test: (pass) close always works > presence pid without a recorded process closes the pane without signalling and ends the row [167.24ms]
@bryance/orch test: {"closed":["owned00001"],"results":[{"target":"owned00001","handle":"pane-owned","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
@bryance/orch test: {"outcome":"answer","reason":"no-environment-role","text":"this pane environment does not provide abort"}
@bryance/orch test: {"closed":["duplicate1"],"results":[{"target":"duplicate1","handle":"pane-duplicate","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
@bryance/orch test: (pass) close always works > close ignores owner and spawnedBy gates [155.65ms]
@bryance/orch test: (pass) close always works > abort ignores owner gate [142.44ms]
@bryance/orch test: (pass) close always works > duplicate close targets count once [138.20ms]
@bryance/orch test: (pass) close always works > dead pane-less close is a successful no-op that ends the row and leaves presence to reap [508.26ms]
@bryance/orch test: (pass) close always works > steer remains blocked by the space wall [166.12ms]
@bryance/orch test: 
@bryance/orch test: test\lease-authority.test.ts:
@bryance/orch test: (pass) C3 foreign agents are untouchable > a DEAD foreign holder is not a collision [2195.46ms]
@bryance/orch test: (pass) C3 foreign agents are untouchable > the composed holder IS the open lease, with nothing beside it [1401.94ms]
@bryance/orch test: (pass) C4 steal > adopt refuses a live holder, and --steal takes it [2250.56ms]
@bryance/orch test: (pass) C4 steal > detach refuses a live holder, and --steal releases it [3379.33ms]
@bryance/orch test: (pass) C4a fencing token > lease ids are monotonic across handoff and adoption [884.90ms]
@bryance/orch test: (pass) C4a fencing token > a stale fence cannot release the current holder's lease [86.71ms]
@bryance/orch test: (pass) C4a fencing token > openLeaseId is null when nothing is leased [72.09ms]
@bryance/orch test: (pass) C4b reads are never gated > status and events read straight through a live foreign lease [2036.26ms]
@bryance/orch test: (pass) C4c/C4d name resolution > duplicate names are legal and an ambiguous target asks for the id [99.02ms]
@bryance/orch test: (pass) C4c/C4d name resolution > a unique name resolves, and an unknown target is a lookup miss [81.10ms]
@bryance/orch test: (pass) C4e naming at creation > a nameless spawn is refused [0.50ms]
@bryance/orch test: (pass) C4e naming at creation > a self-registering session gets <harness>-<first 8 of its id> [110.41ms]
@bryance/orch test: (pass) C4f self-rename > an agent renames itself whether or not a lease is in force [975.00ms]
@bryance/orch test: (pass) C4f self-rename > renaming another agent is driving and obeys the lease [1398.55ms]
@bryance/orch test: (pass) C4f self-rename > an invalid name is refused [100.72ms]
@bryance/orch test: (pass) C5 a transfer does not disturb the agent > adoption writes lease rows and touches nothing else [700.11ms]
@bryance/orch test: (pass) C7 live by lease, history by provenance > adoption moves the live view and leaves provenance untouched [698.87ms]
@bryance/orch test: 
@bryance/orch test: test\cmd-lock-bridge.test.ts:
@bryance/orch test: (pass) pi-bridge command-lock interception > blocks a concurrent orch lock run while the bridge holds the shared lock [2241.80ms]
@bryance/orch test: 
@bryance/orch test: test\review.test.ts:
@bryance/orch test: Preparing worktree (new branch 'orch/iterate-1')
@bryance/orch test: 74 |       ORCH_DAEMON_DISCOVERY_DIR: daemonDiscoveries.get(orchDir),
@bryance/orch test: 75 |     },
@bryance/orch test: 76 |     stdout: "pipe",
@bryance/orch test: 77 |     stderr: "pipe",
@bryance/orch test: 78 |   });
@bryance/orch test: 79 |   if (!ran.success) throw new Error(`orch ${args.join(" ")} exited ${ran.exitCode}: ${ran.stderr.toString()}`);
@bryance/orch test:                                    ^
@bryance/orch test: error: orch review reject iterate-1 -m handle the empty case exited 1: 
@bryance/orch test:       at runOrch (C:\dev\personal\orch\packages\orch\test\review.test.ts:79:31)
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\review.test.ts:141:12)
@bryance/orch test: Preparing worktree (new branch 'orch/approve-1')
@bryance/orch test: Preparing worktree (new branch 'orch/conflict-1')
@bryance/orch test: hint: Diverging branches can't be fast-forwarded, you need to either:
@bryance/orch test: hint:
@bryance/orch test: hint: 	git merge --no-ff
@bryance/orch test: hint:
@bryance/orch test: hint: or:
@bryance/orch test: hint:
@bryance/orch test: hint: 	git rebase
@bryance/orch test: hint:
@bryance/orch test: hint: Disable this message with "git config set advice.diverging false"
@bryance/orch test: fatal: Not possible to fast-forward, aborting.
@bryance/orch test: 170 |     const branchHead = git(worktreePath, ["rev-parse", "HEAD"]);
@bryance/orch test: 171 | 
@bryance/orch test: 172 |     expect(() => mergeReviewBranch(repoRoot, branch)).toThrow("merge aborted");
@bryance/orch test: 173 |     expect(git(repoRoot, ["rev-parse", "HEAD"])).not.toBe(branchHead);
@bryance/orch test: 174 |     expect(git(worktreePath, ["rev-parse", "HEAD"])).toBe(branchHead);
@bryance/orch test: 175 |     expect(fs.readFileSync(path.join(repoRoot, "README.md"), "utf8")).toBe("base change\n");
@bryance/orch test:                                                                             ^
@bryance/orch test: error: expect(received).toBe(expected)
@bryance/orch test: 
@bryance/orch test:   "base change
@bryance/orch test:   "
@bryance/orch test: 
@bryance/orch test: - Expected  - 0
@bryance/orch test: + Received  + 0
@bryance/orch test: 
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\review.test.ts:175:71)
@bryance/orch test: Preparing worktree (new branch 'orch/merge-1')
@bryance/orch test: hint: Diverging branches can't be fast-forwarded, you need to either:
@bryance/orch test: hint:
@bryance/orch test: hint: 	git merge --no-ff
@bryance/orch test: hint:
@bryance/orch test: hint: or:
@bryance/orch test: hint:
@bryance/orch test: hint: 	git rebase
@bryance/orch test: hint:
@bryance/orch test: hint: Disable this message with "git config set advice.diverging false"
@bryance/orch test: fatal: Not possible to fast-forward, aborting.
@bryance/orch test: (fail) review plumbing > reject re-dispatches feedback through the adapter inbox [10916.93ms]
@bryance/orch test: (pass) review plumbing > approve merges and removes the worktree and branch [3025.58ms]
@bryance/orch test: (fail) review plumbing > conflicting approval aborts without changing either branch [1770.52ms]
@bryance/orch test: (pass) review plumbing > non-fast-forward approval creates a merge commit [1704.38ms]
@bryance/orch test: 
@bryance/orch test: test\cmd-lock-bridge.test.ts:
@bryance/orch test: (pass) pi-bridge command-lock interception > surfaces a present but broken settings load instead of silently disabling locks [627.69ms]
@bryance/orch test: 
@bryance/orch test: test\broker-governance.test.ts:
@bryance/orch test: (pass) daemon governWrite enforcement > an unscoped actor may write to an unleased target [160.84ms]
@bryance/orch test: (pass) daemon governWrite enforcement > the lease holder may write to its own agent [1774.95ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a foreign live holder in the same space is refused and named [2767.59ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a dead holder is not a collision [1498.02ms]
@bryance/orch test: (pass) daemon governWrite enforcement > --steal on a driving verb does not take a live holder's lease [3775.19ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a cross-space write is refused by the wall before the lease [2043.95ms]
@bryance/orch test: (pass) daemon governWrite enforcement > --cross-space clears the wall but the lease still applies [2077.39ms]
@bryance/orch test: (pass) daemon governWrite enforcement > the space operator writes to a same-space leased agent without taking the lease [1710.03ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a foreign space's operator still hits the wall [695.10ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a refused enqueue leaves the lease exactly as it was [1417.29ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a granted write and its enqueue commit together [1330.16ms]
@bryance/orch test: (pass) daemon governWrite enforcement > an unleased target is writable by any same-space actor [101.28ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc.test.ts:
@bryance/orch test: (pass) daemon RPC > hello translates an absent daemon instead of reading a missing token [5047.70ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-limits.test.ts:
@bryance/orch test: (pass) spawn limits > rejects invalid cap %s with file and key [42.30ms]
@bryance/orch test: (pass) spawn limits > rejects invalid cap %s with file and key [35.43ms]
@bryance/orch test: (pass) spawn limits > rejects invalid cap %s with file and key [18.42ms]
@bryance/orch test: (pass) spawn limits > omitted fleet caps normalize to defaults [7.80ms]
@bryance/orch test: (pass) spawn limits > global boundary refusal data counts the whole request [50.67ms]
@bryance/orch test: (pass) spawn limits > one workspace may use the full global allotment [17.09ms]
@bryance/orch test: (pass) spawn limits > workspace cap is independent of global headroom [32.54ms]
@bryance/orch test: (pass) spawn limits > uncapped space is bounded only by global count [31.41ms]
@bryance/orch test: (pass) spawn limits > foreign pack members do not consume the caller's pack cap [48.55ms]
@bryance/orch test: (pass) spawn limits > dead pid records free capacity [12.79ms]
@bryance/orch test: (pass) spawn limits > foreign panes never count [12.63ms]
@bryance/orch test: (pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [4717.77ms]
@bryance/orch test: (pass) spawn limits > doctor accepts satisfiable limits [2467.12ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-orphan-daemons.test.ts:
@bryance/orch test: (pass) doctor orphaned-daemon check > a live foreign lock is reported, and an unproven owner is never killable [5768.32ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: killed 1 dangling process
@bryance/orch test: 227 |       }));
@bryance/orch test: 228 |       seedSpace(dir, "local");
@bryance/orch test: 229 |       seedAgent(key, { backend: "headless", adapter: "pi", space: "local", handle: key, owner: "other-orchestrator" });
@bryance/orch test: 230 |       const result = runCli(dir, [verb, key, ...(arg ? [arg] : [])], "caller-orchestrator");
@bryance/orch test: 231 |       expect(result.status).not.toBe(0);
@bryance/orch test: 232 |       expect(result.output).toContain("other-orchestrator");
@bryance/orch test:                                   ^
@bryance/orch test: error: expect(received).toContain(expected)
@bryance/orch test: 
@bryance/orch test: Expected to contain: "other-orchestrator"
@bryance/orch test: Received: "\n"
@bryance/orch test: 
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\owner-scoping.test.ts:232:29)
@bryance/orch test: (fail) fleet ownership scoping > explicit foreign target closes successfully [4435.28ms]
@bryance/orch test: (fail) fleet ownership scoping > driving verbs remain gated against a live foreign holder [5040.01ms]
@bryance/orch test:   ^ this test timed out after 5000ms.
@bryance/orch test: (pass) fleet ownership scoping > result refuses a foreign-owned agent and names its owner [790.45ms]
@bryance/orch test: (pass) fleet ownership scoping > pane mutations refuse a foreign-owned agent and name its owner [1365.71ms]
@bryance/orch test: 
@bryance/orch test: test\cmd-lock.test.ts:
@bryance/orch test: 79 |     if (Date.now() - started >= timeoutMs) break;
@bryance/orch test: 80 |     await sleep(pollMs);
@bryance/orch test: 81 |   }
@bryance/orch test: 82 |   const holder = loadLock(path);
@bryance/orch test: 83 |   const heldBy = holder ? `${holder.holder} (pid ${holder.pid})` : "an unknown holder";
@bryance/orch test: 84 |   throw new Error(`timed out after ${timeoutMs}ms waiting for command lock held by ${heldBy}`);
@bryance/orch test:                  ^
@bryance/orch test: error: timed out after 500ms waiting for command lock held by an unknown holder
@bryance/orch test:       at acquireCommandLock (C:\dev\personal\orch\packages\orch\src\control\cmd-lock.ts:84:13)
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\cmd-lock.test.ts:44:18)
@bryance/orch test: bun test held by agent-a (pid 27288)
@bryance/orch test: (fail) command lock > dead-pid lock is reaped [681.19ms]
@bryance/orch test: (pass) command lock > release with wrong pid refuses [1905.40ms]
@bryance/orch test: (pass) command lock > matches locked command prefixes and probes settings [1626.89ms]
@bryance/orch test: (pass) command lock > run propagates the child exit code [666.46ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: {"closed":["kmismatch1"],"results":[{"target":"kmismatch1","handle":"{\"pid\":11948,\"key\":\"kmismatch1\"}","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
@bryance/orch test: (pass) fleet ownership scoping > close has no force option and remains unconditional without it [1890.77ms]
@bryance/orch test: (pass) fleet ownership scoping > close cleans up a mismatched recorded process without signalling [785.03ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-stale-presence.test.ts:
@bryance/orch test: killed 1 dangling process
@bryance/orch test: (fail) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [5452.97ms]
@bryance/orch test:   ^ this test timed out after 5000ms.
@bryance/orch test: (pass) doctor stale presence safety > no dead agents leaves nothing to remove [3461.71ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: (pass) a spawned agent touches only what it spawned > a spawned agent acts as its own minted id, not its launch key [3.20ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > --cross-space from a spawned agent is refused [407.14ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > close --all from an AGENT sweeps only its own subtree [432.70ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > close --all from the HUMAN sweeps every managed spawn, whoever spawned it [485.27ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > close from a spawned agent is REFUSED when the target is not its own [466.10ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > close from a spawned agent SUCCEEDS on a slave it spawned itself [445.59ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > the workspace operator keeps control of an agent-owned fleet [385.34ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-hosts.test.ts:
@bryance/orch test: (pass) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [3738.79ms]
@bryance/orch test: (pass) doctor remote host checks > flags a remote orch version/schema mismatch in detail [2208.06ms]
@bryance/orch test: (pass) doctor remote host checks > reports no remote hosts configured as healthy [3933.77ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc.test.ts:
@bryance/orch test: (pass) daemon RPC > an unreachable agent yields a boundary answer, and the outbox is not left pending [6011.60ms]
@bryance/orch test: (pass) daemon RPC > round-trips a call over the real unix socket [16.26ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-orphan-daemons.test.ts:
@bryance/orch test: (pass) doctor orphaned-daemon check > a dead pid's lock is not an orphan [3274.04ms]
@bryance/orch test: (pass) doctor orphaned-daemon check > the caller's own orch dir is never reported against itself [2195.17ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-registration.test.ts:
@bryance/orch test: (pass) machine daemon registration > the refusal a second start prints names the live daemon's pid [2575.61ms]
@bryance/orch test: (pass) machine daemon registration > doctor names both when a second daemon is live beside the registered one [1736.75ms]
@bryance/orch test: (pass) machine daemon registration > evicts a registration whose process instance no longer matches [1720.33ms]
@bryance/orch test: (pass) machine daemon registration > routes a different orch dir to its own runtime files [1785.88ms]
@bryance/orch test: (pass) machine daemon registration > doctor distinguishes registered-but-dead from live-and-registered [2349.41ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc.test.ts:
@bryance/orch test: (pass) daemon RPC > issues one session identity to sequential invocations from one session [901.62ms]
@bryance/orch test: 
@bryance/orch test: test\doctor.test.ts:
@bryance/orch test: (pass) runDoctor > runs on an unconfigured install without failing for want of settings.json [2992.09ms]
@bryance/orch test: (pass) runDoctor > checks a healthy store [3012.51ms]
@bryance/orch test: (pass) runDoctor > warns when the store is absent [1.29ms]
@bryance/orch test: (pass) runDoctor > fails when the store predates orch's migrations [71.06ms]
@bryance/orch test: (pass) runDoctor > fails and names a missing store table [76.53ms]
@bryance/orch test: (pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [2297.80ms]
@bryance/orch test: (pass) runDoctor > reports an absent daemon as optional [3588.02ms]
@bryance/orch test: (pass) runDoctor > reports and fixes a stale daemon lock [1382.61ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-checks.test.ts:
@bryance/orch test: (pass) doctor provenance-depth checks > accepts a live agent at fleet.max_depth [163.02ms]
@bryance/orch test: (pass) doctor unclaimed-agent checks > finds an old unclaimed live agent with its age [117.78ms]
@bryance/orch test: (pass) doctor unclaimed-agent checks > ignores a claimed agent [113.98ms]
@bryance/orch test: (pass) doctor unclaimed-agent checks > ignores a fresh unclaimed agent under the threshold [110.91ms]
@bryance/orch test: (pass) doctor notification-sink checks > reports no sinks as healthy [1924.29ms]
@bryance/orch test: (pass) doctor notification-sink checks > rejects a webhook with a malformed URL [28.92ms]
@bryance/orch test: (pass) doctor notification-sink checks > uses the notify-send prerequisite install command in desktop remediation [40.81ms]
@bryance/orch test: (pass) doctor notification-sink checks > warns for a command binary missing from PATH [1457.85ms]
@bryance/orch test: (pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [2183.27ms]
@bryance/orch test: (pass) doctor notification-sink checks > warns when a notifier omits done from its on list [2996.33ms]
@bryance/orch test: (pass) doctor notification-sink checks > does not warn when a notifier includes done in its on list [4010.22ms]
@bryance/orch test: (pass) doctor notification-sink checks > keeps unavailable notifier failures when done is omitted [1478.48ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc.test.ts:
@bryance/orch test: (pass) daemon RPC > hello returns live agents whose newest lease is closed or absent [793.03ms]
@bryance/orch test: (pass) daemon RPC > hello returns an empty unleased list when none exist [425.99ms]
@bryance/orch test: (pass) daemon RPC > a TCP hello with the daemon token gets an identity [843.51ms]
@bryance/orch test: (pass) daemon RPC > refuses a hello that reports no session pid [15.81ms]
@bryance/orch test: (pass) daemon RPC > refuses a hello without its environment [16.99ms]
@bryance/orch test: 
@bryance/orch test: test\doctor.test.ts:
@bryance/orch test: (pass) runDoctor > accepts a live daemon and an answerable socket [2137.97ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc.test.ts:
@bryance/orch test: (pass) daemon RPC > same session pid keeps its id and a different session pid gets another [1157.60ms]
@bryance/orch test: (pass) daemon RPC > refuses a TCP hello without a token [10.56ms]
@bryance/orch test: (pass) daemon RPC > refuses a TCP hello with a wrong token [10.64ms]
@bryance/orch test: (pass) daemon RPC > writes the daemon token with owner-only permissions [9.80ms]
@bryance/orch test: (pass) daemon RPC > returns an error for an unknown method [8.96ms]
@bryance/orch test: (pass) daemon RPC > reports malformed lines and keeps the connection alive [20.51ms]
@bryance/orch test: (pass) daemon RPC > delivers pushed subscription events [65.47ms]
@bryance/orch test: (pass) daemon RPC > replays durable events after a daemon restart without a gap [329.50ms]
@bryance/orch test: (pass) daemon RPC > reports the oldest sequence when replay starts before the pruned window [57.86ms]
@bryance/orch test: (pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [958.90ms]
@bryance/orch test: (pass) daemon RPC > has a catchable absent-daemon error [0.79ms]
@bryance/orch test: (pass) daemon RPC > calls a slow daemon unreachable, not absent [111.63ms]
@bryance/orch test: (pass) daemon RPC > calls a refused endpoint absent so a wedged daemon is still reclaimable [4.48ms]
@bryance/orch test: 
@bryance/orch test: test\doctor.test.ts:
@bryance/orch test: (pass) runDoctor > warns when the live daemon code hash is stale [970.90ms]
@bryance/orch test: (pass) runDoctor > fails on an invalid lock and an unanswerable live socket [1722.14ms]
@bryance/orch test: (pass) runDoctor > warns when the extension bundle is absent for a matching live hash [7.35ms]
@bryance/orch test: (pass) runDoctor > warns when the extension bundle is absent for a stale live hash [7.79ms]
@bryance/orch test: (pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [7.79ms]
@bryance/orch test: (pass) runDoctor > reports a dead presence pid [803.46ms]
@bryance/orch test: (pass) runDoctor > bins check is driven by the enabled set and offers no fix [179.73ms]
@bryance/orch test: (pass) runDoctor > applyFixes reports exactly the changes it applies [7.11ms]
@bryance/orch test: (pass) runDoctor > validates configured notifier adapters [2485.17ms]
@bryance/orch test: (pass) runDoctor > reports invalid settings and accepts missing settings [1563.87ms]
@bryance/orch test: (pass) runDoctor > never throws when individual checks encounter broken inputs [1573.13ms]
@bryance/orch test: 
@bryance/orch test: 5 tests skipped:
@bryance/orch test: (skip) claude-hooks shim tests need the dist bundle
@bryance/orch test: (skip) the token file is the whole credential > the token is 0600
@bryance/orch test: (skip) the token file is the whole credential > $ORCH_DIR is 0700, so same-uid is a boundary the filesystem enforces
@bryance/orch test: (skip) the token file is the whole credential > a token left loose by an earlier run is tightened, not trusted
@bryance/orch test: (skip) the token file is the whole credential > a runtime directory the daemon creates is 0700 too
@bryance/orch test: 
@bryance/orch test: 
@bryance/orch test: 12 tests failed:
@bryance/orch test: (fail) one query stack over the connection (2.3) > nothing in the repo prepares a statement through the deleted port [68.84ms]
@bryance/orch test: (fail) review plumbing > reject re-dispatches feedback through the adapter inbox [10916.93ms]
@bryance/orch test: (fail) review plumbing > conflicting approval aborts without changing either branch [1770.52ms]
@bryance/orch test: (fail) vocabulary is a display map, and a role is tree position > no module outside the map spells a role term into a user-facing string [58.11ms]
@bryance/orch test: (fail) command lock > second acquire blocks until first releases [3009.12ms]
@bryance/orch test: (fail) command lock > dead-pid lock is reaped [681.19ms]
@bryance/orch test: (fail) doctor stale presence safety > describes a dead agent by name and project, not a bare key [6124.28ms]
@bryance/orch test:   ^ this test timed out after 5000ms.
@bryance/orch test: (fail) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [5452.97ms]
@bryance/orch test:   ^ this test timed out after 5000ms.
@bryance/orch test: (fail) fleet ownership scoping > explicit foreign target closes successfully [4435.28ms]
@bryance/orch test: (fail) fleet ownership scoping > driving verbs remain gated against a live foreign holder [5040.01ms]
@bryance/orch test:   ^ this test timed out after 5000ms.
@bryance/orch test: (fail) commands/setup > runs non-interactive setup against the requested ORCH_DIR and records the selected composition [7887.26ms]
@bryance/orch test:   ^ this test timed out after 5000ms.
@bryance/orch test: (fail) dispatch correlation > one dispatch id produces the whole life of that dispatch [9867.53ms]
@bryance/orch test: 
@bryance/orch test:  1566 pass
@bryance/orch test:  5 skip
@bryance/orch test:  12 fail
@bryance/orch test:  7113 expect() calls
@bryance/orch test: Ran 1583 tests across 255 files. [42.34s]
@bryance/orch test: Exited with code 1
error: script "test:orch" exited with code 1
