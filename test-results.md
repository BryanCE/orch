$ bun --filter @bryance/orch test
@bryance/orch test: bun test v1.4.0 (34cbb9a40) 24x PARALLEL
@bryance/orch test: 
@bryance/orch test: test\a-backend-exposes-each-operation-once.test.ts:
@bryance/orch test: (pass) a backend exposes each operation exactly once (2.2) > herdr publishes no operation beside the role that owns it [0.11ms]
@bryance/orch test: (pass) a backend exposes each operation exactly once (2.2) > tmux publishes no operation beside the role that owns it [0.03ms]
@bryance/orch test: (pass) a backend exposes each operation exactly once (2.2) > headless publishes no operation beside the role that owns it [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\identity-is-not-environment.test.ts:
@bryance/orch test: (pass) A1 ΓÇö identity carries no environment > Identity declares no plexer and no plexer grouping [0.09ms]
@bryance/orch test: 
@bryance/orch test: test\errno-guard.test.ts:
@bryance/orch test: (pass) errnoCode reads a syscall error code, and only a real one > returns the code of a real node syscall error [0.30ms]
@bryance/orch test: (pass) errnoCode reads a syscall error code, and only a real one > a plain Error carries no code, so there is none to report [0.03ms]
@bryance/orch test: (pass) errnoCode reads a syscall error code, and only a real one > a non-object never yields a code instead of crashing on it [0.03ms]
@bryance/orch test: (pass) errnoCode reads a syscall error code, and only a real one > a code-shaped field of the wrong type is not a code [0.02ms]
@bryance/orch test: (pass) isAgentState verifies the state rather than asserting it > accepts a declared state [0.05ms]
@bryance/orch test: (pass) isAgentState verifies the state rather than asserting it > rejects anything not declared, including non-strings [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\identity-is-not-environment.test.ts:
@bryance/orch test: (pass) A1 ΓÇö identity carries no environment > a key is the minted id itself, with no separator to split [0.29ms]
@bryance/orch test: (pass) A1 ΓÇö identity carries no environment > the module never spells the sentinels that stand in for a missing place [0.02ms]
@bryance/orch test: (pass) A1 ΓÇö identity carries no environment > minted ids are unique per spawn [26.76ms]
@bryance/orch test: 
@bryance/orch test: test\agent-model-unwelded.test.ts:
@bryance/orch test: (pass) A1 ΓÇö the four facts are never welded > no table welds identity, provenance, ownership and environment into one row [10.95ms]
@bryance/orch test: (pass) A1 ΓÇö the four facts are never welded > ownership is a lease table, not a second id space [6.88ms]
@bryance/orch test: (pass) A1 ΓÇö the four facts are never welded > the agents hub carries identity and provenance only [1.35ms]
@bryance/orch test: (pass) A1 ΓÇö the four facts are never welded > no table anywhere carries a lifetime [41.76ms]
@bryance/orch test: 
@bryance/orch test: test\notify.test.ts:
@bryance/orch test: (pass) notification routing > an excluded state does not invoke its notifier [4.67ms]
@bryance/orch test: 
@bryance/orch test: test\log-record.test.ts:
@bryance/orch test: (pass) the one log record shape > writes one JSONL record per call, with an epoch-millis instant [32.40ms]
@bryance/orch test: 
@bryance/orch test: test\identity-launch.test.ts:
@bryance/orch test: (pass) launchCredential > returns null when the launch environment is unset [28.46ms]
@bryance/orch test: 
@bryance/orch test: test\pack-membership.test.ts:
@bryance/orch test: (pass) a pack is the provenance root > a registered session is an orch of a pack of one [94.23ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-claude-hooks.test.ts:
@bryance/orch test: (pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [106.37ms]
@bryance/orch test: 
@bryance/orch test: test\log-record.test.ts:
@bryance/orch test: (pass) the one log record shape > a record below the configured level is not written at all [24.61ms]
@bryance/orch test: (pass) the one log record shape > a correlation id rides every record of one dispatch, so one grep finds its whole life [35.00ms]
@bryance/orch test: (pass) the one log record shape > agentId carries orch's minted id; a plexer handle is a field, never the identity [13.43ms]
@bryance/orch test: (pass) the one log record shape > every level is orderable, lowest to highest [0.06ms]
@bryance/orch test: (pass) the one log record shape > a malformed line is rejected by the guard rather than trusted [0.07ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-reconnect.test.ts:
@bryance/orch test: (pass) RPC JSON framing > rejects malformed object that only has an id [2.45ms]
@bryance/orch test: 
@bryance/orch test: test\agent-monitor.test.ts:
@bryance/orch test: (pass) agent fleet monitor > surfaces only agents spawned by this session [9.58ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-boundary.test.ts:
@bryance/orch test: (pass) port seam command boundary > headless target is answered without invoking its pane role [0.11ms]
@bryance/orch test: 
@bryance/orch test: test\agent-monitor.test.ts:
@bryance/orch test: (pass) agent fleet monitor > empty model renders no status line or widget [2.71ms]
@bryance/orch test: (pass) agent fleet monitor > worker process registers no monitor regardless of events [2.99ms]
@bryance/orch test: (pass) agent fleet monitor > does not replay history into a plain pi session [6.36ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-boundary.test.ts:
@bryance/orch test: (pass) port seam command boundary > paned environment without a role is answered at the boundary [0.02ms]
@bryance/orch test: (pass) port seam command boundary > an invocation preserves the provider failure [0.09ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-reconnect.test.ts:
@bryance/orch test: (pass) RPC JSON framing > parses split and multiple newline-delimited frames [24.25ms]
@bryance/orch test: 
@bryance/orch test: test\settings-registry.test.ts:
@bryance/orch test: (pass) settings registry > declares every schema setting exactly once [1.18ms]
@bryance/orch test: 
@bryance/orch test: test\commands-index.test.ts:
@bryance/orch test: (pass) commands/index > does not gate help or noninteractive commands [0.14ms]
@bryance/orch test: 
@bryance/orch test: test\claude-hooks-shim.test.ts:
@bryance/orch test: (pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no launch env) [170.68ms]
@bryance/orch test: 
@bryance/orch test: test\setup-flags.test.ts:
@bryance/orch test: (pass) setup model flags > rejects a bare model when multiple harnesses are selected [0.49ms]
@bryance/orch test: (pass) setup model flags > binds each model flag to its own harness [0.20ms]
@bryance/orch test: (pass) setup model flags > allows a bare model for one harness [0.07ms]
@bryance/orch test: (pass) setup model flags > rejects a model bound to an unselected harness [0.31ms]
@bryance/orch test: (pass) setup model flags > rejects duplicate model flags for one harness [0.21ms]
@bryance/orch test: 
@bryance/orch test: test\event-identity.test.ts:
@bryance/orch test: (pass) published event identity > stamps a per-agent ordinal so a redelivery is recognizable [0.75ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-terminal.test.ts:
@bryance/orch test: (pass) bridge terminal turn seam > empty and tool-only turn_end turns still publish a terminal idle state [63.95ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-name-list.test.ts:
@bryance/orch test: (pass) spawn names every agent positionally, at creation > the positional arguments are the names, one per pane [0.85ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö orch's own grouping > a space is created, listed, renamed and deleted with no space-home role [167.93ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-name-list.test.ts:
@bryance/orch test: (pass) spawn names every agent positionally, at creation > the pane count is how many names were given [0.45ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > spawning with no name at all is refused [0.34ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > a bare count is not a name and is refused [0.24ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > the same name twice would collide, so it is refused before anything is created [0.29ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > every name is validated, so one bad name creates nothing [0.22ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > --name is gone: naming is positional, so the flag is an unknown flag [0.42ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > claimSpawnNames takes the resolved names and asserts each is free [9.30ms]
@bryance/orch test: 
@bryance/orch test: test\queue-space-replay.test.ts:
@bryance/orch test: (pass) queue replay keeps typed scope > stored scope offers pack work only to that pack [177.53ms]
@bryance/orch test: 
@bryance/orch test: test\setup-io.test.ts:
@bryance/orch test: (pass) setup prompt answer validation > refuses a single answer that was not offered [0.42ms]
@bryance/orch test: (pass) setup prompt answer validation > refuses multi-select answers containing an unoffered value [0.52ms]
@bryance/orch test: 
@bryance/orch test: test\settings-registry.test.ts:
@bryance/orch test: (pass) settings registry > every registry read resolves against loaded settings [46.54ms]
@bryance/orch test: (pass) settings registry > fleet help explains what each limit counts [0.26ms]
@bryance/orch test: (pass) settings registry > fleet.max_depth round-trips through the full-tree writer [31.72ms]
@bryance/orch test: (pass) settings registry > fleet.max_depth rejects zero through the registered writer [14.66ms]
@bryance/orch test: (pass) settings registry > fleet.max_depth writes its value to settings.json [32.73ms]
@bryance/orch test: (pass) settings registry > contains no duplicate keys [0.14ms]
@bryance/orch test: 
@bryance/orch test: test\commands-index.test.ts:
@bryance/orch test: (pass) commands/index > reads a package version string [1.37ms]
@bryance/orch test: (pass) commands/index > announces unleased agents once per session [3.73ms]
@bryance/orch test: (pass) commands/index > dispatches representative commands and reports unknown commands [58.66ms]
@bryance/orch test: 
@bryance/orch test: test\a-row-is-not-a-pane.test.ts:
@bryance/orch test: (pass) a row is not evidence that a pane exists (U1, U4) > a recorded handle the plexer does not list is reported as NO pane [230.08ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-names.test.ts:
@bryance/orch test: (pass) agent name validation > rejects names outside herdr's naming rule [0.60ms]
@bryance/orch test: 
@bryance/orch test: test\store-queue.test.ts:
@bryance/orch test: (pass) queue facade storage > state is derived from attempts rather than stored on tasks [251.96ms]
@bryance/orch test: 
@bryance/orch test: test\identity-launch.test.ts:
@bryance/orch test: (pass) launchCredential > returns a minted id [4.14ms]
@bryance/orch test: (pass) launchCredential > malformed value exits 1 and logs launch.invalid-key [288.50ms]
@bryance/orch test: 
@bryance/orch test: test\nested-spawn-unleased.test.ts:
@bryance/orch test: (pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the middle agent's death leaves the grandchild unleased, held by nobody [209.14ms]
@bryance/orch test: 
@bryance/orch test: test\identity-self.test.ts:
@bryance/orch test: (pass) selfIdentity > returns the launch id without touching the store [14.46ms]
@bryance/orch test: 
@bryance/orch test: test\offline-is-not-a-second-source.test.ts:
@bryance/orch test: (pass) --offline is a narrower view of ONE source, not a second one (M8) > offline and online read the same agents from the same presence files [190.65ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-terminal.test.ts:
@bryance/orch test: (pass) bridge terminal turn seam > a settled turn with assistant text publishes done [158.02ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-roundtrip.test.ts:
@bryance/orch test: (pass) repairing a settings.json the schema rejects > reports every rejected key without touching the file [27.72ms]
@bryance/orch test: 
@bryance/orch test: test\identity.test.ts:
@bryance/orch test: (pass) serializeIdentity / parseIdentity > a key is the minted id verbatim [0.30ms]
@bryance/orch test: 
@bryance/orch test: test\unleased-stays-adoptable.test.ts:
@bryance/orch test: (pass) unleased and idle stays alive and adoptable (D3) > a decade of retention sweeps never ages out an unleased idle agent [263.25ms]
@bryance/orch test: 
@bryance/orch test: test\identity.test.ts:
@bryance/orch test: (pass) serializeIdentity / parseIdentity > round-trips a minted id [0.20ms]
@bryance/orch test: (pass) serializeIdentity / parseIdentity > a key is one flat filesystem-safe segment with nothing to split [0.11ms]
@bryance/orch test: (pass) serializeIdentity / parseIdentity > two spawns never collide, so no plexer is needed to namespace them [14.52ms]
@bryance/orch test: (pass) isAgentId > accepts a minted id [0.21ms]
@bryance/orch test: (pass) isAgentId > rejects everything that is not one [0.28ms]
@bryance/orch test: (pass) malformed input > rejects a plexer-and-space key on parse [0.46ms]
@bryance/orch test: (pass) malformed input > rejects an empty key [0.05ms]
@bryance/orch test: (pass) malformed input > rejects a pane handle, a name, and a wrong-length id on serialize [0.25ms]
@bryance/orch test: (pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.16ms]
@bryance/orch test: (pass) malformed input > tryParseIdentity parses a minted id [0.05ms]
@bryance/orch test: 
@bryance/orch test: test\agent-view.test.ts:
@bryance/orch test: (pass) the agent composer > an agent with no environment rows has every axis absent, not defaulted [277.80ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-roundtrip.test.ts:
@bryance/orch test: (pass) repairing a settings.json the schema rejects > a removed key is never guessed at - it offers no rename [8.69ms]
@bryance/orch test: (pass) repairing a settings.json the schema rejects > the choices a person makes leave the file loadable [36.97ms]
@bryance/orch test: (pass) repairing a settings.json the schema rejects > a typo keeps its value: renaming carries it to the real key [27.44ms]
@bryance/orch test: (pass) repairing a settings.json the schema rejects > leaving every defect alone writes nothing at all [14.11ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-channel.test.ts:
@bryance/orch test: (pass) orch channel and capture roles > headless delivery reaches the inbox and is acknowledged without a screen [262.17ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-screen.test.ts:
@bryance/orch test: (pass) repair action labels > names the key a rename lands on, so the destination is never a guess [0.04ms]
@bryance/orch test: (pass) repair action labels > names the value a set writes [0.04ms]
@bryance/orch test: (pass) repair action labels > drop and leave say only what they do [0.01ms]
@bryance/orch test: (pass) repair frame > shows every defect with the value the person wrote [0.57ms]
@bryance/orch test: (pass) repair frame > promises that nothing changes before a save, because nothing does [0.06ms]
@bryance/orch test: (pass) repair frame > every defect starts at leave, so opening the screen destroys nothing [0.04ms]
@bryance/orch test: (pass) repair frame > a chosen repair is shown as what it will do [0.04ms]
@bryance/orch test: (pass) repair frame > the focused row's offered keys are shown, so no choice has to be guessed [0.10ms]
@bryance/orch test: (pass) repair frame > the count reads as English for one defect and for many [0.06ms]
@bryance/orch test: (pass) repair frame > no row runs past the terminal width, tag included [0.08ms]
@bryance/orch test: (pass) repair frame > the file being repaired is named in the header [0.04ms]
@bryance/orch test: 
@bryance/orch test: test\setup-notifiers.test.ts:
@bryance/orch test: (pass) notifier setup logic > probes the built-in adapters [26.04ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-channel.test.ts:
@bryance/orch test: (pass) orch channel and capture roles > capture reads status and result from the orch presence record [23.73ms]
@bryance/orch test: 
@bryance/orch test: test\event-identity.test.ts:
@bryance/orch test: (pass) the work loop is not a second presence-transition source > an agent state change publishes nothing from the queue loop [305.07ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-errors.test.ts:
@bryance/orch test: (pass) port seam error contract > provider mutation errors preserve argv, exit status, stderr, and stdout [0.35ms]
@bryance/orch test: (pass) port seam error contract > provider query errors throw instead of returning a sentinel [0.19ms]
@bryance/orch test: 
@bryance/orch test: test\offline-is-not-a-second-source.test.ts:
@bryance/orch test: (pass) --offline is a narrower view of ONE source, not a second one (M8) > offline reports the SAME state the agent reported, never a second opinion [147.60ms]
@bryance/orch test: (pass) --offline is a narrower view of ONE source, not a second one (M8) > there is exactly ONE row builder, and --offline only narrows what it asks [0.46ms]
@bryance/orch test: (pass) --offline is a narrower view of ONE source, not a second one (M8) > offline is the one path that never dials or starts the daemon [0.21ms]
@bryance/orch test: 
@bryance/orch test: test\queue.test.ts:
@bryance/orch test: (pass) queue facade on tasks and attempts > malformed task options are refused instead of handed back as TaskOptions [257.96ms]
@bryance/orch test: 
@bryance/orch test: test\setup-notifiers.test.ts:
@bryance/orch test: (pass) notifier setup logic > lists unavailable notifiers with remediation and disables selection [0.28ms]
@bryance/orch test: (pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.22ms]
@bryance/orch test: (pass) notifier setup logic > renders a command entry that loadSettings can parse [38.05ms]
@bryance/orch test: (pass) notifier setup logic > builds valid entries and reports invalid selections [0.61ms]
@bryance/orch test: 
@bryance/orch test: test\launch-model-gate.test.ts:
@bryance/orch test: (pass) the model gate rules by harness membership, not by format > accepts a listed spec, with or without a thinking suffix [0.33ms]
@bryance/orch test: 
@bryance/orch test: test\presence-dirs-are-reaped-not-migrated.test.ts:
@bryance/orch test: (pass) a presence dir in the old shape is reaped, never migrated (J4) > a composite-named dir is not presence, even with a LIVE pid [24.95ms]
@bryance/orch test: 
@bryance/orch test: test\one-bind-for-the-unix-endpoint.test.ts:
@bryance/orch test: (pass) one bind for the unix endpoint (2.4) > the unix endpoint is claimed in exactly one place [0.92ms]
@bryance/orch test: 
@bryance/orch test: test\events-scope-notice.test.ts:
@bryance/orch test: (pass) events scope notice > names the default live scope and its wideners [0.26ms]
@bryance/orch test: (pass) events scope notice > names the all-agent live scope and its history widener [0.20ms]
@bryance/orch test: (pass) events scope notice > does not announce when history was requested [0.11ms]
@bryance/orch test: (pass) events scope notice > writes one notice before starting the live transport [0.25ms]
@bryance/orch test: (pass) events scope notice > does not write a notice when history was requested [0.07ms]
@bryance/orch test: (pass) events scope notice > does not announce when explicit targets were requested [0.06ms]
@bryance/orch test: 
@bryance/orch test: test\launch-model-gate.test.ts:
@bryance/orch test: (pass) the model gate rules by harness membership, not by format > refuses a ladder shorthand and names what the harness does offer [0.62ms]
@bryance/orch test: (pass) the model gate rules by harness membership, not by format > accepts each harness's own vocabulary rather than one shared grammar [0.16ms]
@bryance/orch test: (pass) the model gate rules by harness membership, not by format > cannot check a harness that publishes no catalogue, and does not pretend to [0.03ms]
@bryance/orch test: (pass) the settings allowlist applies on top of harness membership > an empty allowlist restricts nothing beyond the harness list [36.00ms]
@bryance/orch test: (pass) the settings allowlist applies on top of harness membership > a configured allowlist refuses a listed model outside its patterns [13.72ms]
@bryance/orch test: (pass) the settings allowlist applies on top of harness membership > harness membership is checked before the allowlist, so the message names the harness [4.52ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-write.test.ts:
@bryance/orch test: (pass) applySettingsRepairs > rename carries the value to the new key [27.82ms]
@bryance/orch test: 
@bryance/orch test: test\launch-stamp.test.ts:
@bryance/orch test: (pass) canonical launch stamp > claude and codex launches produce the same status shape [0.54ms]
@bryance/orch test: 
@bryance/orch test: test\broker-daemon-hardening.test.ts:
@bryance/orch test: (pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.50ms]
@bryance/orch test: 
@bryance/orch test: test\one-bind-for-the-unix-endpoint.test.ts:
@bryance/orch test: (pass) one bind for the unix endpoint (2.4) > reclaiming a stale socket yields the endpoint a first bind produces [76.46ms]
@bryance/orch test: 
@bryance/orch test: test\setup-smoke.test.ts:
@bryance/orch test: (pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [0.55ms]
@bryance/orch test: 
@bryance/orch test: test\one-control-dispatcher.test.ts:
@bryance/orch test: (pass) there is exactly one control dispatcher > no module outside src/control declares a control dispatcher [28.38ms]
@bryance/orch test: 
@bryance/orch test: test\setup-smoke.test.ts:
@bryance/orch test: (pass) runSetupSmoke (12.5) > the agent is launched on the prompt it built [0.12ms]
@bryance/orch test: (pass) runSetupSmoke (12.5) > an agent that launches but yields no result times out and fails non-zero [3.39ms]
@bryance/orch test: (pass) runSetupSmoke (12.5) > a rejected spawn fails loudly and never polls for a result [1.90ms]
@bryance/orch test: 
@bryance/orch test: test\one-control-dispatcher.test.ts:
@bryance/orch test: (pass) there is exactly one control dispatcher > no dispatcher is exported under two names [39.01ms]
@bryance/orch test: 
@bryance/orch test: test\nested-spawn-unleased.test.ts:
@bryance/orch test: (pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the grandchild stays alive and adoptable, and keeps its own provenance [240.70ms]
@bryance/orch test: (pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the grandparent holding the middle agent does not extend to the grandchild [198.15ms]
@bryance/orch test: 
@bryance/orch test: test\one-query-stack-over-the-connection.test.ts:
@bryance/orch test: (pass) one query stack over the connection (2.3) > the store exposes no raw-SQL port beside the typed one [0.08ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-write.test.ts:
@bryance/orch test: (pass) applySettingsRepairs > rename onto an occupied key throws and leaves the file untouched [35.59ms]
@bryance/orch test: (pass) applySettingsRepairs > set writes a value at a dotted path [17.51ms]
@bryance/orch test: (pass) applySettingsRepairs > drop deletes a value without pruning its parent [33.05ms]
@bryance/orch test: (pass) applySettingsRepairs > applies several repairs in one call [30.94ms]
@bryance/orch test: (pass) applySettingsRepairs > repairs a schema-rejected file before readSettingsFile validates it [41.69ms]
@bryance/orch test: 
@bryance/orch test: test\a-row-is-not-a-pane.test.ts:
@bryance/orch test: (pass) a row is not evidence that a pane exists (U1, U4) > the agent itself is still there ΓÇö losing a pane costs a shortcut, not a life [294.90ms]
@bryance/orch test: (pass) a row is not evidence that a pane exists (U1, U4) > a handle the plexer DOES list is kept [238.69ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lease.test.ts:
@bryance/orch test: (pass) lease commands > detach releases the lease and is a no-op when already unleased [215.45ms]
@bryance/orch test: 
@bryance/orch test: test\presence-dirs-are-reaped-not-migrated.test.ts:
@bryance/orch test: (pass) a presence dir in the old shape is reaped, never migrated (J4) > the sweep REMOVES it rather than leaving it for a migration that never comes [13.14ms]
@bryance/orch test: (pass) a presence dir in the old shape is reaped, never migrated (J4) > nothing renames, rewrites or re-keys the old directory [17.63ms]
@bryance/orch test: (pass) a presence dir in the old shape is reaped, never migrated (J4) > a dead dir in the CURRENT shape is still reaped the ordinary way [164.16ms]
@bryance/orch test: 
@bryance/orch test: test\claude-hooks-shim.test.ts:
@bryance/orch test: (pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [182.76ms]
@bryance/orch test: (pass) claude-hooks shim > under node > writes status.json for a valid key [171.63ms]
@bryance/orch test: (pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no launch env) [101.36ms]
@bryance/orch test: (pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [78.92ms]
@bryance/orch test: (pass) claude-hooks shim > under bun > writes status.json for a valid key [100.23ms]
@bryance/orch test: (skip) claude-hooks shim tests need the dist bundle
@bryance/orch test: 
@bryance/orch test: test\settings-repair.test.ts:
@bryance/orch test: (pass) settings repair choices > offers rename, set, drop, then leave when all repairs apply [0.10ms]
@bryance/orch test: (pass) settings repair choices > offers only rename when there is only a suggestion [0.03ms]
@bryance/orch test: (pass) settings repair choices > offers only set when there is only an expected value [0.02ms]
@bryance/orch test: (pass) settings repair choices > always offers leave, and cannot drop a file-level defect [0.01ms]
@bryance/orch test: (pass) settings repair reducer > starts every defect at leave and focus at zero [0.04ms]
@bryance/orch test: (pass) settings repair reducer > refuses choices the focused defect does not offer and reports why [0.16ms]
@bryance/orch test: (pass) settings repair reducer > clamps focus at both ends and clears a prior reason [0.07ms]
@bryance/orch test: (pass) settings repair reducer > maps non-leave choices to repairs in defect order [0.24ms]
@bryance/orch test: (pass) settings repair reducer > leave produces no repair [0.06ms]
@bryance/orch test: (pass) settings repair reducer > empty defects make every action a no-op [0.04ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-allowlist.test.ts:
@bryance/orch test: (pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [0.94ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.59ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.13ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.05ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.31ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.22ms]
@bryance/orch test: (pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.22ms]
@bryance/orch test: (pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.21ms]
@bryance/orch test: (pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.12ms]
@bryance/orch test: 
@bryance/orch test: test\setup-wizard.test.ts:
@bryance/orch test: (pass) setup model picker > switches large catalogues to searchable bounded mode and preserves effort [0.85ms]
@bryance/orch test: (pass) setup model picker > keeps the compact selector for small catalogues [0.17ms]
@bryance/orch test: (pass) setup model list picker > large catalogues use the bounded searchable multiselect [0.61ms]
@bryance/orch test: (pass) setup model list picker > the prompt names both jobs the list does, and that an empty one forbids nothing [0.29ms]
@bryance/orch test: (pass) setup model list picker > stored values start checked, and clearing them returns an empty selection [0.38ms]
@bryance/orch test: 
@bryance/orch test: test\claude-hooks.test.ts:
@bryance/orch test: (pass) Claude hook command > gates execution on the launch environment variable [9.97ms]
@bryance/orch test: 
@bryance/orch test: test\every-agent-has-an-inbox.test.ts:
@bryance/orch test: (pass) every agent has an inbox > a paned agent and a capless one are delivered to identically [278.07ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-claude-hooks.test.ts:
@bryance/orch test: (pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [105.77ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [144.04ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [169.55ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [169.44ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [66.43ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [54.24ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [56.38ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [92.91ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > treats an absent settings file as not configured [1.94ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > handles malformed settings gracefully [18.25ms]
@bryance/orch test: 
@bryance/orch test: test\one-query-stack-over-the-connection.test.ts:
@bryance/orch test: (pass) one query stack over the connection (2.3) > nothing in the repo prepares a statement through the deleted port [170.30ms]
@bryance/orch test: 
@bryance/orch test: test\one-retry-policy.test.ts:
@bryance/orch test: (pass) one retry policy > retries flaky async and sync operations through the shared helper [1.50ms]
@bryance/orch test: (pass) one retry policy > uses the policy's declared backoff schedule [0.62ms]
@bryance/orch test: (pass) one retry policy > surfaces the last error after exactly attempts tries [1.10ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-bundle-diagnosis.test.ts:
@bryance/orch test: (pass) adapter bundle installation > reports a missing shipped bundle as a structured diagnosis [2.53ms]
@bryance/orch test: 
@bryance/orch test: test\settings-shell.test.ts:
@bryance/orch test: (pass) settings shell decisions > non-TTY takes the print path [0.10ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-bundle-diagnosis.test.ts:
@bryance/orch test: pi extensions:
@bryance/orch test: (pass) adapter bundle installation > diagnoses a missing shipped bundle without writing [20.33ms]
@bryance/orch test: 
@bryance/orch test: test\broker-daemon-hardening.test.ts:
@bryance/orch test: (pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [177.14ms]
@bryance/orch test: (pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [189.15ms]
@bryance/orch test: 
@bryance/orch test: test\presence-inbox.test.ts:
@bryance/orch test: (pass) shared presence line writers > inbox and ack drains use the same claimed rename path [48.60ms]
@bryance/orch test: 
@bryance/orch test: test\unleased-stays-adoptable.test.ts:
@bryance/orch test: (pass) unleased and idle stays alive and adoptable (D3) > and it is still adoptable afterwards ΓÇö the point of keeping it [234.94ms]
@bryance/orch test: (pass) unleased and idle stays alive and adoptable (D3) > the sweep reaps only agents that actually ENDED, never merely unleased ones [233.14ms]
@bryance/orch test: (pass) unleased and idle stays alive and adoptable (D3) > repeated sweeps are stable: an unleased agent survives every one of them [278.66ms]
@bryance/orch test: 
@bryance/orch test: test\pack-membership.test.ts:
@bryance/orch test: (pass) a pack is the provenance root > membership is inherited from the spawner at any depth, never re-rooted [167.56ms]
@bryance/orch test: (pass) a pack is the provenance root > every agent is in exactly one pack, and two packs never share a member [293.99ms]
@bryance/orch test: (pass) a pack is the provenance root > a pack of one grows without re-rooting, and the root stays the orch [180.42ms]
@bryance/orch test: (pass) a pack is the provenance root > a lease or a move never changes which pack an agent is in [200.74ms]
@bryance/orch test: (pass) a pack is the provenance root > an agent cannot be spawned by someone who does not exist [151.96ms]
@bryance/orch test: 
@bryance/orch test: test\one-shape-only.test.ts:
@bryance/orch test: (pass) one current shape only > a live presence record with a malformed identity is a doctor failure [17.10ms]
@bryance/orch test: 
@bryance/orch test: test\presence-inbox.test.ts:
@bryance/orch test: (pass) shared presence line writers > pi appends and answers through shared presence writers [32.20ms]
@bryance/orch test: (pass) shared presence line writers > wrong status schema is rejected by shared status reader [79.27ms]
@bryance/orch test: 
@bryance/orch test: test\one-shape-only.test.ts:
@bryance/orch test: (pass) one current shape only > doctor backend reports have one detection spelling [20.62ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-declared-vs-reality.test.ts:
@bryance/orch test: (pass) doctor declared-vs-reality > describes composed and absent backend roles [89.92ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-hardening.test.ts:
@bryance/orch test: (pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [2.00ms]
@bryance/orch test: 
@bryance/orch test: test\parse-target.test.ts:
@bryance/orch test: (pass) <host>/<target> grammar > keeps targets without a host unchanged [0.24ms]
@bryance/orch test: (pass) <host>/<target> grammar > parses configured host prefixes [0.05ms]
@bryance/orch test: (pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.07ms]
@bryance/orch test: (pass) <host>/<target> grammar > rejects empty hosts and targets [0.03ms]
@bryance/orch test: (pass) <host>/<target> grammar > formats local and host-prefixed targets [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-hardening.test.ts:
@bryance/orch test: (pass) adapter and runtime hardening > rejects unknown settings keys with a useful path [41.30ms]
@bryance/orch test: (pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [13.77ms]
@bryance/orch test: (pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [5.38ms]
@bryance/orch test: 
@bryance/orch test: test\broker-daemon-hardening.test.ts:
@bryance/orch test: (pass) broker daemon hardening > concurrent drains do not redeliver one message id [223.99ms]
@bryance/orch test: (pass) broker daemon hardening > replay after the newest sequence is empty without a gap [134.93ms]
@bryance/orch test: (pass) broker daemon hardening > malformed request gets an error and the connection remains usable [35.16ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-names.test.ts:
@bryance/orch test: (pass) agent name validation > accepts lowercase names with hyphens and underscores [0.30ms]
@bryance/orch test: (pass) a live name is claimed and a dead one is released > a live agent holds its name against a second spawn [283.70ms]
@bryance/orch test: (pass) a live name is claimed and a dead one is released > a dead agent frees its name [229.89ms]
@bryance/orch test: (pass) a live name is claimed and a dead one is released > another space's agent never blocks a name here [209.70ms]
@bryance/orch test: (pass) name scope follows the agent's current space, not its birthplace > moving an agent moves the name it holds [189.64ms]
@bryance/orch test: (pass) name scope follows the agent's current space, not its birthplace > the collision names the agent by its minted id [224.85ms]
@bryance/orch test: 
@bryance/orch test: test\one-spelling-per-fact.test.ts:
@bryance/orch test: (pass) one spelling per shared fact > osSide and the store agree for an injected Windows platform [150.18ms]
@bryance/orch test: 
@bryance/orch test: test\vocabulary.test.ts:
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > a role is derived from the tree, never stored [203.74ms]
@bryance/orch test: 
@bryance/orch test: test\every-agent-has-an-inbox.test.ts:
@bryance/orch test: (pass) every agent has an inbox > the inbox is at one derived path, whatever the agent's environment [206.66ms]
@bryance/orch test: (pass) every agent has an inbox > delivery stamps an id and a timestamp on every message, for every agent [134.90ms]
@bryance/orch test: (pass) every agent has an inbox > delivery is refused for a disconnected bridge, not for a missing pane [213.80ms]
@bryance/orch test: 
@bryance/orch test: test\no-daemon-commands.test.ts:
@bryance/orch test: (pass) commands that need no daemon need no identity > orch help registers no agent and starts no daemon [604.84ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-model-flag.test.ts:
@bryance/orch test: (pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [0.23ms]
@bryance/orch test: (pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.30ms]
@bryance/orch test: (pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.10ms]
@bryance/orch test: (pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.10ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > pi interactive builders pass the quicklist as one quoted --models argument [0.22ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > pi headless builders pass the quicklist as one verbatim argv entry [0.17ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > pi omits --models cleanly for an absent or empty quicklist [0.11ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > pi keeps quicklist order and provider punctuation intact [0.05ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > omp interactive builders pass the quicklist as one quoted --models argument [0.09ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > omp headless builders pass the quicklist as one verbatim argv entry [0.02ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > omp omits --models cleanly for an absent or empty quicklist [0.74ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > omp keeps quicklist order and provider punctuation intact [0.05ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > a model outside the quicklist is still what the launch runs on [0.18ms]
@bryance/orch test: 
@bryance/orch test: test\presence-schema.test.ts:
@bryance/orch test: (pass) presence status schema > reads a spawned identity without placement fields in status [192.86ms]
@bryance/orch test: 
@bryance/orch test: test\store-queue.test.ts:
@bryance/orch test: (pass) queue facade storage > retention deletes only settled tasks older than the cutoff [261.56ms]
@bryance/orch test: (pass) queue facade storage > retention never removes a queued task based on its age [202.91ms]
@bryance/orch test: (pass) queue facade storage > agent-scoped tasks become unrunnable when their agent ends [195.23ms]
@bryance/orch test: (pass) queue facade storage > completed tasks stay done after their scope agent ends [203.86ms]
@bryance/orch test: (pass) queue facade storage > a dead orch does not make a pack task unrunnable while a member lives [184.56ms]
@bryance/orch test: (pass) queue facade storage > pack-scoped tasks become unrunnable when every pack member ends [249.14ms]
@bryance/orch test: 
@bryance/orch test: test\one-spelling-per-fact.test.ts:
@bryance/orch test: (pass) one spelling per shared fact > the shared record guard rejects arrays and null [0.08ms]
@bryance/orch test: (pass) one spelling per shared fact > removed identity method has no source spelling [18.85ms]
@bryance/orch test: (pass) one spelling per shared fact > settings reads have no literal fallbacks [46.86ms]
@bryance/orch test: (pass) one spelling per shared fact > launch env has one spelling [74.44ms]
@bryance/orch test: (pass) one spelling per shared fact > removed spawn cap has no source or README spelling [56.80ms]
@bryance/orch test: 
@bryance/orch test: test\peer-identity.test.ts:
@bryance/orch test: (pass) spawner identity > a bare operator with no session markers is just the operator [50.22ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-pi.test.ts:
@bryance/orch test: (pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [2.14ms]
@bryance/orch test: 
@bryance/orch test: test\skew-guard.test.ts:
@bryance/orch test: (pass) CLI daemon skew guard > refuses mutating commands and names both hashes plus the reload remedy [594.46ms]
@bryance/orch test: 
@bryance/orch test: test\settings-shell.test.ts:
@bryance/orch test: (pass) settings shell decisions > an overridden setting is refused with the winner named [25.00ms]
@bryance/orch test: (pass) settings shell decisions > an overridden setting cannot be written [611.55ms]
@bryance/orch test: (pass) settings shell decisions > registered writes use the registry entry [40.74ms]
@bryance/orch test: (pass) settings shell decisions > registry exposes writable subcommand entries [0.84ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a named space is orch's own id, and the workspace is its RECORDED home [229.34ms]
@bryance/orch test: 
@bryance/orch test: test\store-rebuild-schema.test.ts:
@bryance/orch test: (pass) rebuild schema > rebuild DDL inventory is exact [157.08ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-pi.test.ts:
@bryance/orch test: (pass) PiAdapter > restricted workers explicitly load the bundled pi extension [0.56ms]
@bryance/orch test: (pass) PiAdapter > declares its lifecycle slash-commands [0.28ms]
@bryance/orch test: (pass) PiAdapter > reads state from the presence status through store helpers [41.42ms]
@bryance/orch test: (pass) PiAdapter > appends a steer message to the presence inbox [26.49ms]
@bryance/orch test: (pass) PiAdapter > writes a blocking answer to the presence answer file [32.43ms]
@bryance/orch test: (pass) PiAdapter > reads results.jsonl and falls back to the last assistant session text [53.18ms]
@bryance/orch test: (pass) PiAdapter > parses pi's supported model table without importing harness internals [1.16ms]
@bryance/orch test: 
@bryance/orch test: test\hello-environment.test.ts:
@bryance/orch test: (pass) hello records the environment in full > the plexer the caller registered in is on the agent, not only on the host [295.34ms]
@bryance/orch test: 
@bryance/orch test: test\settings-thinking.test.ts:
@bryance/orch test: (pass) orch settings thinking > writes the global default and reads back through loadSettings [23.87ms]
@bryance/orch test: 
@bryance/orch test: test\vocabulary.test.ts:
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > no table carries a role column: there is nothing to disagree with the tree [203.11ms]
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > renaming an agent or moving its lease never changes its role [255.97ms]
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > every role term orch displays comes from the one map [0.26ms]
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > no module outside the map spells a role term into a user-facing string [76.82ms]
@bryance/orch test: 
@bryance/orch test: test\settings-thinking.test.ts:
@bryance/orch test: thinking  xhigh
@bryance/orch test: thinking (pi)  low
@bryance/orch test: (pass) orch settings thinking > writes a per-harness override without disturbing the global default [28.24ms]
@bryance/orch test: (pass) orch settings thinking > the command sets the level a user names [23.40ms]
@bryance/orch test: (pass) orch settings thinking > the command sets a per-harness level with --harness [19.96ms]
@bryance/orch test: (pass) orch settings thinking > a level orch does not know is refused, naming the valid levels [3.35ms]
@bryance/orch test: (pass) orch settings thinking > clearing a per-harness override falls back to the global default [24.52ms]
@bryance/orch test: 
@bryance/orch test: test\cmd-lock-is-never-half-created.test.ts:
@bryance/orch test: (pass) the command lock file is never observable half-created > a reader racing acquire/release never sees an existing but incomplete lock [2157.18ms]
@bryance/orch test: 
@bryance/orch test: test\settings-view.test.ts:
@bryance/orch test: (pass) settings view > visibleEntryIndices matches key and group case-insensitively [0.22ms]
@bryance/orch test: 
@bryance/orch test: test\wall-single-owner.test.ts:
@bryance/orch test: (pass) space wall ownership > keeps the wall decision primitive in one source module [23.35ms]
@bryance/orch test: 
@bryance/orch test: test\settings-view.test.ts:
@bryance/orch test: (pass) settings view > windowBounds keeps the focus inside the budget and clamps at both ends [0.07ms]
@bryance/orch test: (pass) settings view > frame shows group headers, values, provenance tags, and the focused help [0.49ms]
@bryance/orch test: (pass) settings view > frame with a filter narrows the list and draws the filter line [0.09ms]
@bryance/orch test: (pass) settings view > frame reports an empty filter match instead of a blank screen [0.04ms]
@bryance/orch test: (pass) settings view > a long list is windowed with more-above/more-below markers [1.34ms]
@bryance/orch test: (pass) settings view > overlays render choices, checkboxes, and input with error [1.56ms]
@bryance/orch test: (pass) settings view > a checkbox row shows what its choice carries [1.25ms]
@bryance/orch test: (pass) settings view > displayValue keeps scalars bare and JSON-encodes shapes [0.56ms]
@bryance/orch test: 
@bryance/orch test: test\one-writer-records-a-spawned-agent.test.ts:
@bryance/orch test: (pass) one writer records a spawned agent (2.1) > registerSpawnedAgent alone writes the COMPLETE record ΓÇö space and lease included [242.93ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-roles.test.ts:
@bryance/orch test: (pass) adapter role composition > composes complete roles per adapter [0.16ms]
@bryance/orch test: (pass) adapter role composition > answers with zero exit code when a shim role is absent [0.08ms]
@bryance/orch test: 
@bryance/orch test: test\cmd-lock-is-never-half-created.test.ts:
@bryance/orch test: (pass) the command lock file is never observable half-created > createFileExclusively refuses a taken path and leaves no staging file behind [46.83ms]
@bryance/orch test: 
@bryance/orch test: test\web-projection.test.ts:
@bryance/orch test: (pass) web fleet projection > uses the orch agent name and falls back to its minted id, never the plexer agent name [0.93ms]
@bryance/orch test: (pass) web fleet projection > uses the orch space name and never exposes the plexer space id [0.11ms]
@bryance/orch test: (pass) web fleet projection > unscoped agents use a neutral space label when no orch space exists [1.57ms]
@bryance/orch test: (pass) web fleet projection > history groups ended agents by provenance root, never by their leases [0.66ms]
@bryance/orch test: (pass) web fleet projection > live projection excludes ended rows and keeps unleased live agents out of history [0.29ms]
@bryance/orch test: (pass) live views group by lease (C7) > a space encompasses its orchs, and each orch encompasses the agents it holds [0.58ms]
@bryance/orch test: (pass) live views group by lease (C7) > an ADOPTED agent is filed under the orch holding it now, never under its spawner [0.56ms]
@bryance/orch test: (pass) live views group by lease (C7) > an UNHELD agent is grouped as unheld, not hidden and not invented an orch [0.73ms]
@bryance/orch test: (pass) live views group by lease (C7) > the space still lists every live agent flat, so the lease grouping adds a level and hides nothing [0.28ms]
@bryance/orch test: (pass) live views group by lease (C7) > history does NOT gain a lease level: a pack stays grouped by provenance [0.82ms]
@bryance/orch test: (pass) the orphan bucket holds every undriven agent (G9) > a lease whose holder is DEAD is an orphan, not live work [0.29ms]
@bryance/orch test: (pass) the orphan bucket holds every undriven agent (G9) > an agent with no lease at all is still an orphan [3.00ms]
@bryance/orch test: (pass) the orphan bucket holds every undriven agent (G9) > the two buckets never overlap and never lose an agent [4.85ms]
@bryance/orch test: (pass) the orphan bucket holds every undriven agent (G9) > a dead holder is not shown as an orch driving work in the lease grouping either [0.49ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-session-env.test.ts:
@bryance/orch test: (pass) adapter-owned session environment > resolves each caller harness through the public session resolver [0.85ms]
@bryance/orch test: (pass) adapter-owned session environment > keeps harness env literals inside adapter modules [25.53ms]
@bryance/orch test: (pass) adapter-owned session environment > a registered adapter resolves a novel marker without resolver changes [0.45ms]
@bryance/orch test: 
@bryance/orch test: test\settings-watch.test.ts:
@bryance/orch test: (pass) watchSettings > loads initially and applies a valid edit after the debounce [41.66ms]
@bryance/orch test: 
@bryance/orch test: test\work-loop-binding.test.ts:
@bryance/orch test: (pass) work loop attempt binding > statusSpeaksForTask verifies the current attempt dispatch id [0.37ms]
@bryance/orch test: 
@bryance/orch test: test\agent-view.test.ts:
@bryance/orch test: (pass) the agent composer > each axis composes independently, and moving one leaves identity untouched [278.64ms]
@bryance/orch test: (pass) the agent composer > tuning is not environment: it survives a move [242.80ms]
@bryance/orch test: (pass) the agent composer > ownership reads as a live lease, and a released one is not ownership [214.47ms]
@bryance/orch test: (pass) the agent composer > provenance is on the view and is not the same fact as ownership [175.35ms]
@bryance/orch test: (pass) the agent composer > provenance carries the spawner's name, read as a join and never stored twice [223.27ms]
@bryance/orch test: (pass) the agent composer > an agent with no spawner reports no spawner name [249.56ms]
@bryance/orch test: (pass) the agent composer > agentViews is oldest-first and liveAgentViews drops ended agents [247.97ms]
@bryance/orch test: (pass) the agent composer > the axis list is the only place every axis is enumerated [1.02ms]
@bryance/orch test: (pass) the agent composer > the composed shape is exactly the axis list, with nothing extra and nothing missing [159.39ms]
@bryance/orch test: (pass) the agent composer > an unknown agent is null, never an empty shell [215.84ms]
@bryance/orch test: 
@bryance/orch test: test\one-writer-records-a-spawned-agent.test.ts:
@bryance/orch test: (pass) one writer records a spawned agent (2.1) > a spawn leaves NOTHING for a second writer to fill in [187.92ms]
@bryance/orch test: (pass) one writer records a spawned agent (2.1) > a spawn into NO space records no space and hands the plexer only its coordinate [204.11ms]
@bryance/orch test: (pass) one writer records a spawned agent (2.1) > the presence store no longer offers a second way to record an agent [0.28ms]
@bryance/orch test: 
@bryance/orch test: test\agent-key-is-minted-id.test.ts:
@bryance/orch test: (pass) a driving session mints an id, it is not placed by name > the key an interactive session addresses itself by is a bare minted id [35.24ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö orch's own grouping > create refuses a name already in use [205.34ms]
@bryance/orch test: (pass) orch space ΓÇö orch's own grouping > delete refuses a space that still holds agents [195.29ms]
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > create makes a home and records only its coordinate [172.31ms]
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > list reports that a space has a home without naming the coordinate [154.44ms]
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > rename renames orch's space and its home [401.84ms]
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > delete closes the home and drops its coordinate [194.70ms]
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > focus focuses the recorded coordinate [195.49ms]
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > a home made in another plexer is not this environment's to focus [177.72ms]
@bryance/orch test: (pass) orch space ΓÇö absence is an answer > focus with no space-home role names the space and what is missing [149.41ms]
@bryance/orch test: (pass) orch space ΓÇö absence is an answer > the plain-text answer names the space too [125.47ms]
@bryance/orch test: (pass) orch space ΓÇö vocabulary and wiring > cmdSpace lists through the resolved environment [100.79ms]
@bryance/orch test: (pass) orch space ΓÇö vocabulary and wiring > orch ws is gone [0.16ms]
@bryance/orch test: (pass) orch space ΓÇö vocabulary and wiring > space help never says workspace and offers create/rename/delete [0.08ms]
@bryance/orch test: (pass) orch space ΓÇö vocabulary and wiring > no space output ever says workspace [174.14ms]
@bryance/orch test: 
@bryance/orch test: test\orch-bugs-4-5.test.ts:
@bryance/orch test: (pass) orch bugs 4 and 5 launch contracts > interactive launch routes use one argv composition [1.60ms]
@bryance/orch test: (pass) orch bugs 4 and 5 launch contracts > headless launch routes use one argv composition [0.84ms]
@bryance/orch test: (pass) orch bugs 4 and 5 launch contracts > inherited extension policy emits every discovered extension [0.45ms]
@bryance/orch test: 
@bryance/orch test: test\hello-environment.test.ts:
@bryance/orch test: (pass) hello records the environment in full > the space the caller registered in is recorded at hello, not inferred later [185.18ms]
@bryance/orch test: (pass) hello records the environment in full > a session in no space and no plexer records neither, and that is an answer [139.57ms]
@bryance/orch test: (pass) hello records the environment in full > re-registering the same session does not re-root or re-place it [217.72ms]
@bryance/orch test: (pass) hello records the environment in full > the claim carries every environment fact hello has to record [144.55ms]
@bryance/orch test: 
@bryance/orch test: test\settings-watch.test.ts:
@bryance/orch test: (pass) watchSettings > keeps the last-good settings, warns once, and recovers [439.26ms]
@bryance/orch test: 
@bryance/orch test: test\ambiguous-target-says-what-to-do.test.ts:
@bryance/orch test: (pass) an ambiguous target names the failure and the way out (U3) > the message names the failure, the target string, and every candidate [0.24ms]
@bryance/orch test: (pass) an ambiguous target names the failure and the way out (U3) > it says what to send instead, so the caller is not left guessing [0.06ms]
@bryance/orch test: (pass) an ambiguous target names the failure and the way out (U3) > it is a refusal, not an exit ΓÇö the caller can act on it [0.04ms]
@bryance/orch test: (pass) an ambiguous target names the failure and the way out (U3) > resolveAgentView raises that same one message [0.42ms]
@bryance/orch test: 
@bryance/orch test: test\settings-watch.test.ts:
@bryance/orch test: (pass) watchSettings > reloads on a touched reload.signal without a settings edit [43.06ms]
@bryance/orch test: 
@bryance/orch test: test\peer-identity.test.ts:
@bryance/orch test: (pass) spawner identity > an unregistered Claude Code session is labelled by its harness, with no id [13.23ms]
@bryance/orch test: (pass) spawner identity > a session orch has registered IS addressable, by the id orch minted [208.08ms]
@bryance/orch test: (pass) spawner identity > an unregistered session has no id to hand out, and does not invent one [6.51ms]
@bryance/orch test: (pass) spawner identity > an orch-spawned orchestrator acts as the id orch minted for it [191.61ms]
@bryance/orch test: (pass) spawner identity > agentIdentityEnv stamps a reply address only when the spawner has one [0.40ms]
@bryance/orch test: (pass) spawner identity > worktreeEnv stamps worktree identity only for isolated agents [0.25ms]
@bryance/orch test: (pass) spawner identity > the registry keeps the exact spawning session distinct from the lease holder [171.93ms]
@bryance/orch test: (pass) the spawner address invariant > an UNREGISTERED session stamps no address, so no worker is handed an unreachable one [3.23ms]
@bryance/orch test: (pass) the spawner address invariant > a bare operator stamps no address [1.54ms]
@bryance/orch test: (pass) the spawner address invariant > an address that IS stamped resolves to a live inbox [188.72ms]
@bryance/orch test: (pass) peer identity in messaging > peer summaries render an unplaced agent without a local place name [23.42ms]
@bryance/orch test: (pass) peer identity in messaging > orch_send reports the peer's NAME, and stamps the sender's name on the message [53.56ms]
@bryance/orch test: (pass) peer identity in messaging > peers resolve by display name exactly like by key [32.78ms]
@bryance/orch test: (pass) peer identity in messaging > "spawner" reaches the stamped spawner session across fleet scoping [37.71ms]
@bryance/orch test: (pass) peer identity in messaging > a spawner with no inbox is refused BY NAME, not with a bare key [3.80ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > with no space, orch INSIDE the plexer spawns beside itself and opens nothing [186.87ms]
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a caller INSIDE the plexer with NO orch identity (a human's pane) spawns beside itself [159.04ms]
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > with no space and orch OUTSIDE the plexer, the PACK gets its own marked home [115.17ms]
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > the same pack spawning again reuses its home and asks the human nothing [196.28ms]
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > an environment that holds nothing answers with an absence, never a refusal [108.65ms]
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a space with no home HERE places the fleet without borrowing another plexer's [166.81ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-transport-parity.test.ts:
@bryance/orch test: (pass) both transports carry one mechanism > a bound TCP port does not displace the unix socket or become its own service [49.77ms]
@bryance/orch test: 
@bryance/orch test: test\work-loop-binding.test.ts:
@bryance/orch test: (pass) Cq4: results go to the enqueuer, not the runner > every task event the work loop publishes is keyed to whoever enqueued it [341.53ms]
@bryance/orch test: 
@bryance/orch test: test\commands-spawn.test.ts:
@bryance/orch test: (pass) commands/spawn > refuses an invalid name before resolving or creating a workspace [30.30ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-reconnect.test.ts:
@bryance/orch test: (pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [2781.91ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-transport-parity.test.ts:
@bryance/orch test: (pass) both transports carry one mechanism > the credential is demanded identically on both [134.05ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-lifecycle.test.ts:
@bryance/orch test: (pass) daemon lifecycle > acquires once and refuses a second live owner [3042.05ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-transport-parity.test.ts:
@bryance/orch test: (pass) both transports carry one mechanism > a missing credential is refused identically on both [30.72ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-hud-environment.test.ts:
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > a herdr-placed agent reports the handle its environment carries [130.01ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-policy.test.ts:
@bryance/orch test: (pass) spawn policy caps > launch env uses the minted agent id name [0.17ms]
@bryance/orch test: 
@bryance/orch test: test\commands-spawn.test.ts:
@bryance/orch test: (pass) commands/spawn > refuses spawn without a name before any spawn mutations [177.42ms]
@bryance/orch test: (pass) commands/spawn > rejects removed spawn cap flag as unknown [0.15ms]
@bryance/orch test: (pass) commands/spawn > rejects --detached as an unknown spawn flag [6.02ms]
@bryance/orch test: (pass) commands/spawn > the positionals are the agent names [0.16ms]
@bryance/orch test: (pass) commands/spawn > collects repeated prompts in agent order [0.05ms]
@bryance/orch test: (pass) commands/spawn > each pi flavor launches its own binary and preserves raw prompt [0.32ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [49.82ms]
@bryance/orch test: 
@bryance/orch test: test\settings-watch.test.ts:
@bryance/orch test: (pass) watchSettings > stop prevents further callbacks [416.62ms]
@bryance/orch test: 
@bryance/orch test: test\queue.test.ts:
@bryance/orch test: (pass) queue facade on tasks and attempts > enqueue selects exactly one typed scope and defaults to the enqueuer pack [273.95ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > agent scope requires the enqueuer to lease the target [204.48ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq1: the gate is on enqueuing into a scope, and adoption earns it [188.95ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq1: a pack drains its queue with its orch dead and no lease in force [220.18ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > claiming excludes another pack and space claims require open intake [190.39ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq3: a space-scoped task is an offer, and only an opted-in pack consumes it [271.78ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > a failed pack attempt retries on another member, never outside the pack [261.85ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq5: an agent-scoped binding is to the agent and survives adoption [194.33ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq13: adoption carries the queue ΓÇö pack work comes with the agents [272.12ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > a claim is an insert and a lost race returns false [116.78ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > cancel rights are enqueuer, targeted agent's leasing orch, or human [119.15ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq7: origin_workspace is gone from the tasks table, scope replaces it [125.49ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > state and attempt-derived values have no legacy flattened fields [152.01ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) answer via the control dispatcher > answers, rather than failing, when the adapter composes no question role [23.29ms]
@bryance/orch test: (pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [26.13ms]
@bryance/orch test: 
@bryance/orch test: test\review.test.ts:
@bryance/orch test: Preparing worktree (new branch 'orch/feature-1')
@bryance/orch test: (pass) review plumbing > lists only done worktree agents with commits ahead [3080.54ms]
@bryance/orch test: 
@bryance/orch test: test\settings.test.ts:
@bryance/orch test: (pass) loadSettings > refuses to invent settings when settings.json is missing [3.17ms]
@bryance/orch test: 
@bryance/orch test: test\commands-status.test.ts:
@bryance/orch test: (pass) commands/status > zero-row message reports gathered counts and backend response [0.09ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-policy.test.ts:
@bryance/orch test: (pass) spawn policy caps > worker prompt depth > root worker maySpawn follows max_depth [2.44ms]
@bryance/orch test: (pass) spawn policy caps > allows a pack spawn while under the cap [0.89ms]
@bryance/orch test: (pass) spawn policy caps > blocks an at-cap spawn and offers dispatch or the pack queue [0.23ms]
@bryance/orch test: (pass) spawn policy caps > a slave may not spawn by default: fleet.max_depth is 1 [0.08ms]
@bryance/orch test: (pass) spawn policy caps > fleet.max_depth 2 lets a slave spawn and refuses its child [0.17ms]
@bryance/orch test: (pass) spawn policy caps > reads a pack cap override from settings [34.26ms]
@bryance/orch test: (pass) spawn policy caps > a refused cmdSpawn makes no name, worktree, registry, or queue mutation [190.04ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-hud-environment.test.ts:
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > the handle follows the agent when it moves pane [158.42ms]
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > an agent on another plexer is not a herdr pane [119.05ms]
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > a process orch never launched is not a herdr pane [6.32ms]
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > a key that is not a minted id resolves to no pane at all [5.14ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-notify-busy.test.ts:
@bryance/orch test: (pass) a herdr notification is delivered only when herdr says it was shown > shown is a delivery [0.12ms]
@bryance/orch test: (pass) a herdr notification is delivered only when herdr says it was shown > busy is NOT a delivery, however herdr exited [0.02ms]
@bryance/orch test: (pass) a herdr notification is delivered only when herdr says it was shown > every other refusal herdr can answer with is also not a delivery [0.06ms]
@bryance/orch test: (pass) a herdr notification is delivered only when herdr says it was shown > output that is not a herdr answer is never read as a delivery [0.08ms]
@bryance/orch test: (pass) a busy herdr is waited out, not dropped > a toast shown on the first try is sent once and waits for nothing [0.15ms]
@bryance/orch test: (pass) a busy herdr is waited out, not dropped > a busy herdr is retried after a wait, and the retry is the delivery [0.05ms]
@bryance/orch test: (pass) a busy herdr is waited out, not dropped > a herdr that stays busy gives up rather than blocking the daemon forever [0.03ms]
@bryance/orch test: (pass) a busy herdr is waited out, not dropped > a refusal that waiting cannot fix is not retried [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\presence-schema.test.ts:
@bryance/orch test: (pass) presence status schema > orch status JSON exposes the agent status fields [136.73ms]
@bryance/orch test: (pass) presence status schema > status and list report the same agent identity [248.21ms]
@bryance/orch test: (pass) presence status schema > mixed pi and Claude status rows carry the same status field set [195.50ms]
@bryance/orch test: (pass) presence status schema > rejects a status record that carries no schema stamp [274.52ms]
@bryance/orch test: (pass) presence status schema > rejects a status record stamped with a non-current schema [317.51ms]
@bryance/orch test: (pass) presence status schema > rejects a current-schema record carrying placement fields [226.36ms]
@bryance/orch test: (pass) presence status schema > a malformed record is skipped without hiding the valid records beside it [248.77ms]
@bryance/orch test: (pass) presence status schema > the four facts are recorded apart and composed back onto the minted id [100.55ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [184.37ms]
@bryance/orch test: 
@bryance/orch test: test\work-loop-identity.test.ts:
@bryance/orch test: (pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > a claim records the minted agent id, not the presence key [276.56ms]
@bryance/orch test: 
@bryance/orch test: test\provenance.test.ts:
@bryance/orch test: (pass) the one provenance walk > ancestors are parent-first, root last [0.12ms]
@bryance/orch test: (pass) the one provenance walk > depth counts hops to the root [0.03ms]
@bryance/orch test: (pass) the one provenance walk > an unknown id is its own root at depth 0 [0.01ms]
@bryance/orch test: (pass) the one provenance walk > an unknown parent ends the chain instead of throwing [0.05ms]
@bryance/orch test: (pass) the one provenance walk > descendant is any depth, never self, never a sibling tree [0.07ms]
@bryance/orch test: (pass) the one provenance walk > a cycle terminates [0.12ms]
@bryance/orch test: 
@bryance/orch test: test\reap-picker.test.ts:
@bryance/orch test: (pass) reapCandidates > classifies unleased dead holders and leased dead processes [0.53ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-notify-hardening.test.ts:
@bryance/orch test: (pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [1.81ms]
@bryance/orch test: (pass) herdr and notification hardening > falls back to a valid name when the identity key contains herdr-invalid separators [0.97ms]
@bryance/orch test: (pass) herdr and notification hardening > nameless notifications use a space label, never a bare pane key [0.73ms]
@bryance/orch test: 
@bryance/orch test: test\hermetic-env.test.ts:
@bryance/orch test: (pass) the test suite is hermetic > no plexer environment leaks in from the shell that launched bun [2.15ms]
@bryance/orch test: 
@bryance/orch test: test\reap-picker.test.ts:
@bryance/orch test: (pass) reapCandidates > classifies empty input [0.08ms]
@bryance/orch test: (pass) cmdReap > prints the --dead --json result shape [143.35ms]
@bryance/orch test: (pass) cmdReap > refuses bare reap when stdin is not a TTY [0.44ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-preferred-models.test.ts:
@bryance/orch test: (pass) the preferred quicklist reaches every launch route > a pane spawn hands the exact array to the backend [167.29ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) answer over the daemon control socket > refuses a cross-space answer at the daemon wall [336.04ms]
@bryance/orch test: 
@bryance/orch test: test\queue-cli-scope.test.ts:
@bryance/orch test: (pass) Cq2: all three scopes are choosable at enqueue > --agent, --pack and --space each select exactly one typed scope [146.46ms]
@bryance/orch test: 
@bryance/orch test: test\work-loop-identity.test.ts:
@bryance/orch test: (pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > an idle process with no registered agent row is never handed pack work [172.83ms]
@bryance/orch test: (pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > Cq1: the pack drains its own queue with its orch dead and no lease in force [227.19ms]
@bryance/orch test: 
@bryance/orch test: test\holder-death-costs-a-driver.test.ts:
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > the task in flight finishes and its result survives the holder [173.53ms]
@bryance/orch test: 
@bryance/orch test: test\reap-walks-provenance.test.ts:
@bryance/orch test: (pass) reap walks the provenance tree (H3) > an ended agent with a still-present descendant is NOT reaped [165.13ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-preferred-models.test.ts:
@bryance/orch test: (pass) the preferred quicklist reaches every launch route > an unconfigured quicklist stays empty rather than becoming a default one [161.02ms]
@bryance/orch test: (pass) the preferred quicklist reaches every launch route > the previewed command is the command a launch runs [0.46ms]
@bryance/orch test: (pass) the preferred quicklist reaches every launch route > a headless launch forwards the quicklist into the adapter's own options [164.11ms]
@bryance/orch test: (pass) orchd rules on the quicklist it is sent > accepts an absent value and an array of specs [0.25ms]
@bryance/orch test: (pass) orchd rules on the quicklist it is sent > refuses a joined string or a blank entry instead of coercing it [0.31ms]
@bryance/orch test: 
@bryance/orch test: test\work-notify.test.ts:
@bryance/orch test: (pass) orch presence notifications > delivers a presence transition through a configured command sink [136.66ms]
@bryance/orch test: 
@bryance/orch test: test\broker-governance.test.ts:
@bryance/orch test: (pass) daemon governWrite enforcement > an unscoped actor is refused while a live orch holds the lease [2349.69ms]
@bryance/orch test: 
@bryance/orch test: test\status-unleased.test.ts:
@bryance/orch test: (pass) status owner rendering > leased by a live holder shows that holder [3713.69ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-reconnect.test.ts:
@bryance/orch test: (pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1347.12ms]
@bryance/orch test: 
@bryance/orch test: test\queue-cli-scope.test.ts:
@bryance/orch test: (pass) Cq2: all three scopes are choosable at enqueue > a name resolves to one id, and an ambiguous name asks for the id [148.76ms]
@bryance/orch test: (pass) Cq2: all three scopes are choosable at enqueue > two scope flags at once are refused [167.92ms]
@bryance/orch test: (pass) Cq9: reading the queue is open > listing and history carry no caller and hide no other pack's work [795.55ms]
@bryance/orch test: 
@bryance/orch test: test\work-survives-its-spawner.test.ts:
@bryance/orch test: (pass) work survives its spawner, always (D1) > ending the spawner leaves the child live, unended and still listed [755.57ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-registry.test.ts:
@bryance/orch test: (pass) spawn agent registration > writes the hub, environment, tuning, and lease [779.43ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-replay.test.ts:
@bryance/orch test: (pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [600.54ms]
@bryance/orch test: 
@bryance/orch test: test\settings.test.ts:
@bryance/orch test: (pass) loadSettings > requires a top-level runtime and never defaults it [33.53ms]
@bryance/orch test: (pass) loadSettings > rejects an unrecognized runtime naming the accepted values [14.35ms]
@bryance/orch test: (pass) loadSettings > rejects a runtime misplaced under defaults [6.63ms]
@bryance/orch test: (pass) loadSettings > reads the declared runtime [15.15ms]
@bryance/orch test: (pass) loadSettings > parses every supported settings section [21.56ms]
@bryance/orch test: (pass) loadSettings > rejects a file without the current schemaVersion [4.29ms]
@bryance/orch test: (pass) loadSettings > rejects invalid JSON loudly [4.80ms]
@bryance/orch test: (pass) loadSettings > names the key path for invalid fields [15.80ms]
@bryance/orch test: (pass) loadSettings > rejects unknown settings keys [15.46ms]
@bryance/orch test: (pass) loadSettings > rejects removed spawn cap setting by name [5.85ms]
@bryance/orch test: (pass) loadSettings > parses models.allowed as a per-harness pattern map [4.48ms]
@bryance/orch test: (pass) loadSettings > rejects renamed fleet keys and loads their replacements [44.45ms]
@bryance/orch test: (pass) loadSettings > rejects old settings keys [53.11ms]
@bryance/orch test: (pass) loadSettings > rejects legacy notify type and unknown ids [30.27ms]
@bryance/orch test: (pass) loadSettings > applies every settings default when sections are absent [6.55ms]
@bryance/orch test: (pass) loadSettings > preserves configured values while defaulting each missing section value [13.82ms]
@bryance/orch test: (pass) loadSettings > rejects non-positive and non-integer retention windows [38.45ms]
@bryance/orch test: (pass) loadSettings > rejects a host without dest [15.71ms]
@bryance/orch test: (pass) loadSettings > rejects an unknown id in enabled.adapters [9.74ms]
@bryance/orch test: (pass) loadSettings > rejects defaults.adapter not present in enabled.adapters [5.89ms]
@bryance/orch test: (pass) loadSettings > rejects when settings.json is absent but a legacy config.toml exists [2.82ms]
@bryance/orch test: (pass) allowedModelPatterns > restricts nothing when settings contain no patterns [1.45ms]
@bryance/orch test: (pass) allowedModelPatterns > returns the configured patterns when set [18.52ms]
@bryance/orch test: (pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or enabled entry [15.65ms]
@bryance/orch test: (pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [9.68ms]
@bryance/orch test: (pass) writeSettingsRuntime > a different runtime replaces the single value in place [20.11ms]
@bryance/orch test: (pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [14.03ms]
@bryance/orch test: (pass) reapUnreadableSettings > leaves a readable file alone [5.17ms]
@bryance/orch test: (pass) writeSettingsEnabled > round-trips both provider arrays [32.07ms]
@bryance/orch test: (pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [51.83ms]
@bryance/orch test: (pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [28.32ms]
@bryance/orch test: (pass) writeSettingsDefault > is idempotent when rewriting the same value [32.09ms]
@bryance/orch test: (pass) writeSettingsDefault > refuses to write through an out-of-version settings file [3.66ms]
@bryance/orch test: (pass) writeSettingsDefault > switches defaults.adapter between two enabled ids and loads clean [48.20ms]
@bryance/orch test: (pass) writeSettingsFullTree > round-trips defaults without inventing max_agents_total [29.72ms]
@bryance/orch test: (pass) settings precedence > uses the fallback when env and settings.json omit a setting [5.84ms]
@bryance/orch test: (pass) settings precedence > uses the settings.json value over the fallback [4.57ms]
@bryance/orch test: (pass) settings precedence > uses the ORCH_* environment value over settings.json [4.69ms]
@bryance/orch test: (pass) settings precedence > uses an explicit flag override over the environment [0.20ms]
@bryance/orch test: (pass) resolveSetting > uses flag, environment coercion, settings, then fallback in precedence order [0.14ms]
@bryance/orch test: (pass) resolveWithSource > rejects an environment value with the wrong shape [0.17ms]
@bryance/orch test: (pass) resolveWithSource > reports the winning source at each precedence level [0.10ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > loadSettings parses a per-harness preferred quicklist [17.18ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > an absent preferred map normalizes to an empty map, not to allowed [14.57ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > writing one list leaves the other byte-for-value intact [83.33ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > an empty list is recorded as no list at all, so a cleared picker really clears [31.76ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > the full tree seeds both maps when absent and preserves both when present [752.50ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > the allowlist gate reads models.allowed only [112.53ms]
@bryance/orch test: 
@bryance/orch test: test\reap-walks-provenance.test.ts:
@bryance/orch test: (pass) reap walks the provenance tree (H3) > the tree is reaped from the LEAF up, one sweep per level [241.81ms]
@bryance/orch test: (pass) reap walks the provenance tree (H3) > a LIVE descendant blocks the reap even when the parent ended long ago [718.42ms]
@bryance/orch test: (pass) reap walks the provenance tree (H3) > provenance has no ON DELETE CASCADE, so no reap can erase a subtree [218.03ms]
@bryance/orch test: 
@bryance/orch test: test\recipient-label.test.ts:
@bryance/orch test: (pass) agent identity shown to an operator > names the agent and its harness, never the transport key [0.09ms]
@bryance/orch test: (pass) agent identity shown to an operator > drops the routing prefix when nothing is known about it [0.02ms]
@bryance/orch test: (pass) agent identity shown to an operator > a nameless agent gets a stable logical name, not its key [0.15ms]
@bryance/orch test: 
@bryance/orch test: test\queue-reaping.test.ts:
@bryance/orch test: (pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > a failed task whose scope is gone is unrunnable and survives every retention sweep [206.07ms]
@bryance/orch test: 
@bryance/orch test: test\work-survives-its-spawner.test.ts:
@bryance/orch test: (pass) work survives its spawner, always (D1) > a grandchild is untouched when the middle agent ends [246.54ms]
@bryance/orch test: (pass) work survives its spawner, always (D1) > the store has no lifetime column and no fate-sharing flag anywhere [0.61ms]
@bryance/orch test: (pass) work survives its spawner, always (D1) > spawn offers no flag that decides whether work outlives its spawner [1.70ms]
@bryance/orch test: (pass) work survives its spawner, always (D1) > closing the spawner never writes an ending for anything it spawned [180.23ms]
@bryance/orch test: 
@bryance/orch test: test\reload-no-bundle-write.test.ts:
@bryance/orch test: {"results":[],"ok":0,"total":0,"hard":false,"signaled":"reload.signal"}
@bryance/orch test: (pass) reload > does not write installed extension bundles [11.25ms]
@bryance/orch test: 
@bryance/orch test: test\holder-death-costs-a-driver.test.ts:
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > the lease closes `expired` ΓÇö not `released`, because no caller held it [159.81ms]
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > the agent stays alive, unleased and adoptable ΓÇö nothing closes it [327.77ms]
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > it receives no new work: the death hands the agent to nobody [644.71ms]
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > expiry is recorded once and does not erase who held it [172.43ms]
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > clearing a dead holder's lease is never refused, and is idempotent [158.30ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-registry.test.ts:
@bryance/orch test: (pass) spawn agent registration > an agent that states no plexer and no handle gets neither row [210.58ms]
@bryance/orch test: (pass) spawn agent registration > worktree row is present only for a worktree launch [195.06ms]
@bryance/orch test: (pass) spawn agent registration > an unknown or absent spawner produces a root pack of one and no lease [138.91ms]
@bryance/orch test: 
@bryance/orch test: test\worker-prompt.test.ts:
@bryance/orch test: (pass) worker prompt capability composition > spawn clause follows maySpawn and stripping preserves the task [1.20ms]
@bryance/orch test: (pass) worker prompt capability composition > orch run composition selects the same header per adapter [0.35ms]
@bryance/orch test: (pass) worker prompt capability composition > the worker header does not instruct a lock that does not lock [0.19ms]
@bryance/orch test: (pass) worker prompt capability composition > locked-commands clause names the commands, and asks for a report rather than a lock [0.17ms]
@bryance/orch test: (pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.05ms]
@bryance/orch test: (pass) worker prompt capability composition > the reply-to-spawner clause needs a reachable spawner, not just an inbox-steerable worker [0.16ms]
@bryance/orch test: (pass) worker prompt capability composition > unreachable spawner tells the worker to finish and end without relaying [3.61ms]
@bryance/orch test: (pass) worker prompt capability composition > reachable spawner permits replying to the spawner only [0.15ms]
@bryance/orch test: (pass) worker prompt capability composition > a reachable spawner still earns no clause when the worker cannot be steered by inbox [0.04ms]
@bryance/orch test: (pass) worker prompt capability composition > events strip both worker header variants [7.90ms]
@bryance/orch test: 
@bryance/orch test: test\worker-tools.test.ts:
@bryance/orch test: (pass) worker tool policy > no configured allowlist restricts nothing [0.22ms]
@bryance/orch test: (pass) worker tool policy > a configured allowlist always carries orch's own tools [0.16ms]
@bryance/orch test: (pass) worker tool policy > peer tools join the allowlist when the fleet enables them [0.11ms]
@bryance/orch test: 
@bryance/orch test: test\commands-clean.test.ts:
@bryance/orch test: (pass) commands/clean > reaps dead agent dirs but preserves live pids [101.41ms]
@bryance/orch test: 
@bryance/orch test: test\store-rebuild-schema.test.ts:
@bryance/orch test: (pass) rebuild schema > the store opens migrated, with foreign keys enabled [143.51ms]
@bryance/orch test: (pass) rebuild schema > all ten partial unique indexes allow only one open row [1729.09ms]
@bryance/orch test: (pass) rebuild schema > enforces foreign keys and agent checks [229.30ms]
@bryance/orch test: (pass) rebuild schema > requires exactly one task scope [553.35ms]
@bryance/orch test: (pass) rebuild schema > allows one open attempt only [483.85ms]
@bryance/orch test: (pass) rebuild schema > enforces lease checks and one lease [166.04ms]
@bryance/orch test: (pass) rebuild schema > remaining documented CHECKs and cascades are enforced [192.56ms]
@bryance/orch test: (pass) rebuild schema > task_states derives queued claimed and outcomes [158.07ms]
@bryance/orch test: 
@bryance/orch test: test\status-headless.test.ts:
@bryance/orch test: (pass) headless status visibility > keeps an exited agent with a terminal state [0.25ms]
@bryance/orch test: (pass) headless status visibility > keeps an exited agent with a recorded result [0.05ms]
@bryance/orch test: (pass) headless status visibility > drops a dead row with no result or terminal state [0.02ms]
@bryance/orch test: (pass) headless status visibility > keeps a live row [0.02ms]
@bryance/orch test: (pass) headless status visibility > --all keeps stale rows [0.02ms]
@bryance/orch test: (pass) headless status visibility > uses agent language without backend details when no backend was asked [0.07ms]
@bryance/orch test: 
@bryance/orch test: test\peer-lease-visibility.test.ts:
@bryance/orch test: (pass) peer summaries carry ownership as a lease > a peer the caller holds reports the caller as the live holder [2672.36ms]
@bryance/orch test: 
@bryance/orch test: test\queue-reaping.test.ts:
@bryance/orch test: (pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > unrunnable is about who is alive now ΓÇö a new pack member makes it claimable again [163.17ms]
@bryance/orch test: (pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > stale is surfaced beside its state and never deleted on age [113.53ms]
@bryance/orch test: (pass) Cq12: an orphaned task has take-on, leave and reap, all deliberate > take-on re-scopes to the taker's own pack and the work becomes claimable there [110.01ms]
@bryance/orch test: (pass) Cq12: an orphaned task has take-on, leave and reap, all deliberate > take-on refuses a taker that is not itself live [142.86ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-transport-parity.test.ts:
@bryance/orch test: (pass) both transports carry one mechanism > the same token registers the same session whichever transport carried it [2686.00ms]
@bryance/orch test: 
@bryance/orch test: test\commands-status.test.ts:
@bryance/orch test: (pass) commands/status > dead rows never display stale live state [0.04ms]
@bryance/orch test: (pass) commands/status > shared row boundary normalizes stale state for every renderer [0.12ms]
@bryance/orch test: (pass) commands/status > default status reads span every workspace [0.47ms]
@bryance/orch test: (pass) commands/status > derives status row fields from seeded presence [35.76ms]
@bryance/orch test: (pass) commands/status > marks dead presence as exited [5.74ms]
@bryance/orch test: (pass) commands/status > asking presence is surfaced as a question while still reporting live state [47.68ms]
@bryance/orch test: (pass) commands/status > shared status row carries presence-derived fields [24.14ms]
@bryance/orch test: (pass) commands/status > row carries the owning backend's declared capabilities [40.60ms]
@bryance/orch test: (pass) commands/status > an agent whose backend orch cannot name reports no capabilities [5.62ms]
@bryance/orch test: (pass) commands/status > status owner ignores spawning provenance when no lease exists [48.21ms]
@bryance/orch test: (pass) commands/status > lease-backed status attribution distinguishes my lease, another lease, and unleased rows [2227.11ms]
@bryance/orch test: (pass) commands/status > default table separates minted identity from pane environment [0.95ms]
@bryance/orch test: (pass) commands/status > human table shows harness and working directory facts [0.11ms]
@bryance/orch test: (pass) commands/status > json branch and local table branch derive identical rows apart from host [15.87ms]
@bryance/orch test: (pass) commands/status > capacity footer uses configured caps and groups holders by root [0.88ms]
@bryance/orch test: (pass) commands/status > formats workspace labels and warnings [11.72ms]
@bryance/orch test: 
@bryance/orch test: test\settings-command.test.ts:
@bryance/orch test: (pass) orch settings > every registered setting is reachable through --json [575.34ms]
@bryance/orch test: 
@bryance/orch test: test\status-live.test.ts:
@bryance/orch test: (pass) live status renderer > renders a clear screen, timestamped header, and table body [15.80ms]
@bryance/orch test: (pass) live status renderer > renders a refresh failure in the header area [4.43ms]
@bryance/orch test: (pass) live status renderer > coalesces a burst into one pending follow-up refresh [1.04ms]
@bryance/orch test: (pass) live status renderer > keeps the existing table renderer available [0.12ms]
@bryance/orch test: 
@bryance/orch test: test\dispatch-channel-first.test.ts:
@bryance/orch test: (pass) work reaches an agent through orch's channel, with the pane only a shortcut > a headless agent receives a dispatch through the inbox, not a no-pane answer [86.09ms]
@bryance/orch test: 
@bryance/orch test: test\store-runs.test.ts:
@bryance/orch test: (pass) run rows > round-trips every field, including a structured result [177.97ms]
@bryance/orch test: 
@bryance/orch test: test\dispatch-channel-first.test.ts:
@bryance/orch test: (pass) work reaches an agent through orch's channel, with the pane only a shortcut > a steer reaches a paneless agent the same way [38.87ms]
@bryance/orch test: 
@bryance/orch test: test\remote-fanout.test.ts:
@bryance/orch test: (pass) async remote fan-out > parses valid JSON from a host [566.37ms]
@bryance/orch test: 
@bryance/orch test: test\queue-scope.test.ts:
@bryance/orch test: (pass) queue scope invariants > a failed pack task retries on another pack member, while an agent task stays pinned [209.36ms]
@bryance/orch test: 
@bryance/orch test: test\status-owner-column.test.ts:
@bryance/orch test: (pass) the rendered status table carries the owner column > each row's OWNER cell holds that row's lease fact [0.87ms]
@bryance/orch test: (pass) the rendered status table carries the owner column > a dead holder renders as unleased, not as a live driver [0.12ms]
@bryance/orch test: (pass) the rendered status table carries the owner column > the owner column is dropped only when no row knows its lease [0.16ms]
@bryance/orch test: 
@bryance/orch test: test\commands-clean.test.ts:
@bryance/orch test: (pass) worktree ownership reads the composed environment > a live agent's worktree is protected and a dead one's is not [224.96ms]
@bryance/orch test: (pass) orch clean is destructive maintenance > a spawned agent is refused the sweep, and the dirs it does not own survive [149.85ms]
@bryance/orch test: 
@bryance/orch test: test\commands-target.test.ts:
@bryance/orch test: (pass) commands/target > splits known flags and preserves positional args [0.48ms]
@bryance/orch test: 
@bryance/orch test: test\lease-authority.test.ts:
@bryance/orch test: killed 1 dangling process
@bryance/orch test: 61 |     expect(() => governWrite(dir, "worker", { target: "worker", actor: "caller-orch", text: "x" }))
@bryance/orch test: 62 |       .toThrow(/orch-a/);
@bryance/orch test: 63 |     // The lease commands answer with the same rule, without a daemon.
@bryance/orch test: 64 |     expect(() => detachAgent(dir, "worker", "caller-orch")).toThrow(/leased by live orch orch-a/);
@bryance/orch test: 65 |     expect(() => adoptAgent(dir, "worker", "caller-orch")).toThrow(/leased by live orch orch-a/);
@bryance/orch test: 66 |     expect(() => renameTarget(dir, "worker", "caller-orch", "hijacked")).toThrow(/leased by live orch orch-a/);
@bryance/orch test:                                                                               ^
@bryance/orch test: error: expect(received).toThrow(expected)
@bryance/orch test: 
@bryance/orch test: Expected pattern: /leased by live orch orch-a/
@bryance/orch test: 
@bryance/orch test: Received function did not throw
@bryance/orch test: Received value: {
@bryance/orch test:   id: "worker",
@bryance/orch test:   name: "hijacked",
@bryance/orch test:   renamed: true,
@bryance/orch test: }
@bryance/orch test: 
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\lease-authority.test.ts:66:74)
@bryance/orch test: (fail) C3 foreign agents are untouchable > every driving verb is refused while a live foreign orch holds the lease [5061.03ms]
@bryance/orch test:   ^ this test timed out after 5000ms.
@bryance/orch test: 
@bryance/orch test: test\commands-target.test.ts:
@bryance/orch test: (pass) commands/target > extracts target and joined prompt [0.49ms]
@bryance/orch test: (pass) commands/target > reads only structured result text [0.07ms]
@bryance/orch test: (pass) commands/target > quotes remote args and ORCH_DIR safely [0.55ms]
@bryance/orch test: (pass) commands/target > lists only live serialized identity presence entries [40.85ms]
@bryance/orch test: 
@bryance/orch test: test\commands-control.test.ts:
@bryance/orch test: (pass) commands/control > parses dispatch flags without losing prompt words [1.47ms]
@bryance/orch test: (pass) commands/control > parses --then destination and note [0.38ms]
@bryance/orch test: (pass) commands/control > adds worker header unless raw [0.63ms]
@bryance/orch test: 
@bryance/orch test: test\status-perf.test.ts:
@bryance/orch test: (pass) status performance seams > resolves bundle hashes once per status call [6.91ms]
@bryance/orch test: (pass) status performance seams > resolves orchestrator id once per status call [9.22ms]
@bryance/orch test: 
@bryance/orch test: test\control-dispatch.test.ts:
@bryance/orch test: (pass) deliverControl > steers pi through its presence inbox [70.90ms]
@bryance/orch test: 
@bryance/orch test: test\commands-daemon.test.ts:
@bryance/orch test: (pass) commands/daemon > parses governance and validates daemon status [1.81ms]
@bryance/orch test: (pass) commands/daemon > reads a lock pid only from a complete lock record [44.82ms]
@bryance/orch test: 
@bryance/orch test: test\status-renders-one-row-shape.test.ts:
@bryance/orch test: (pass) status rendering has one row shape and one table renderer > task and last text use the same spelling in the row and table cell [51.84ms]
@bryance/orch test: 
@bryance/orch test: test\commands-events.test.ts:
@bryance/orch test: (pass) commands/events > owned renderers and tool help do not expose the retired workspace term [1.95ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) answer over the daemon control socket > refuses an answer from outside the lease, naming the holder [2741.87ms]
@bryance/orch test: 
@bryance/orch test: test\remote-fanout.test.ts:
@bryance/orch test: (pass) async remote fan-out > returns a typed dead-host failure [531.84ms]
@bryance/orch test: 
@bryance/orch test: test\status-renders-one-row-shape.test.ts:
@bryance/orch test: (pass) status rendering has one row shape and one table renderer > local and remote rows share the renderer; remote adds only HOST [0.36ms]
@bryance/orch test: (pass) status rendering has one row shape and one table renderer > fleet resolves caller inputs once while building three presence rows [190.65ms]
@bryance/orch test: 
@bryance/orch test: test\backend-headless.test.ts:
@bryance/orch test: (pass) HeadlessBackend > refuses to spawn with no prompt ΓÇö a headless agent runs its prompt and exits [2.28ms]
@bryance/orch test: 
@bryance/orch test: test\store-runs.test.ts:
@bryance/orch test: (pass) run rows > upsert updates a row while preserving its original start time [140.60ms]
@bryance/orch test: (pass) run rows > orders by started time, filters by agent, and honours limit [149.05ms]
@bryance/orch test: (pass) run rows > omits absent optional fields instead of returning null [116.80ms]
@bryance/orch test: (pass) run rows > deletes only rows older than the cutoff and returns the count [195.03ms]
@bryance/orch test: (pass) run rows > stays readable after the agent presence directory is deleted [210.91ms]
@bryance/orch test: 
@bryance/orch test: test\cmd-lock-serialize.test.ts:
@bryance/orch test: (pass) command lock serialization > serializes two real CLI acquirers without overlapping their commands [4515.23ms]
@bryance/orch test: 
@bryance/orch test: test\backend-headless.test.ts:
@bryance/orch test: (pass) HeadlessBackend > spawns a detached process and records its handle [251.80ms]
@bryance/orch test: 
@bryance/orch test: test\worktree.test.ts:
@bryance/orch test: Preparing worktree (new branch 'orch/fixes-1')
@bryance/orch test: (pass) worktree primitives > creates and lists an agent worktree on an orch branch [1254.09ms]
@bryance/orch test: 
@bryance/orch test: test\commands-queue.test.ts:
@bryance/orch test: (pass) commands/queue > cmdQueue list emits the selected JSON view [145.70ms]
@bryance/orch test: 
@bryance/orch test: test\backend-headless.test.ts:
@bryance/orch test: (pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [98.59ms]
@bryance/orch test: 
@bryance/orch test: test\commands-events.test.ts:
@bryance/orch test: (pass) commands/events > bare events is scoped to this session's agents and renders readable lines [0.08ms]
@bryance/orch test: (pass) commands/events > parses filters and scope flags [0.13ms]
@bryance/orch test: (pass) commands/events > parses the wake-up flags [0.08ms]
@bryance/orch test: (pass) commands/events > includes an adopted agent whose open lease is mine [0.05ms]
@bryance/orch test: (pass) commands/events > includes a reused pane leased by me even when another session spawned it [0.02ms]
@bryance/orch test: (pass) commands/events > includes an unleased agent spawned by this session [0.02ms]
@bryance/orch test: (pass) commands/events > excludes an agent spawned by a different session [0.01ms]
@bryance/orch test: (pass) commands/events > --any-agent passes agents from both sessions [0.09ms]
@bryance/orch test: (pass) commands/events > excludes an agent while another orch holds its lease [0.03ms]
@bryance/orch test: (pass) commands/events > describes durable replay and reports pruned history gaps [0.10ms]
@bryance/orch test: (pass) commands/events > names one agent by name or by identity key [0.05ms]
@bryance/orch test: (pass) commands/events > a subscription with no daemon keeps redialing instead of exiting [17.83ms]
@bryance/orch test: (pass) commands/events > renders opaque plexer coordinates without relabeling them as spaces [0.34ms]
@bryance/orch test: (pass) commands/events > appends pack capacity to human-readable event lines [0.07ms]
@bryance/orch test: (pass) commands/events > rejects malformed event and labels sinks [0.11ms]
@bryance/orch test: (pass) commands/events space scope > an agent streams into the space it currently occupies [181.54ms]
@bryance/orch test: (pass) commands/events space scope > moving an agent moves its events with it [189.91ms]
@bryance/orch test: (pass) commands/events space scope > --all streams every space, and an unplaced caller scopes to none [181.97ms]
@bryance/orch test: (pass) commands/events space scope > a key naming no registered agent is in no space [1.44ms]
@bryance/orch test: 
@bryance/orch test: test\queue-scope.test.ts:
@bryance/orch test: (pass) queue scope invariants > cancel is allowed for the enqueuer or a lease holder of a targeted agent [159.43ms]
@bryance/orch test: (pass) queue scope invariants > cancel refuses a caller who is neither enqueuer nor targeted lease holder [126.25ms]
@bryance/orch test: (pass) queue scope invariants > edit is allowed only for the enqueuer while queued [206.49ms]
@bryance/orch test: (pass) queue scope invariants > an orphan has exactly take-on, leave, and reap resolutions [197.74ms]
@bryance/orch test: (pass) queue scope invariants > stale queued work is surfaced distinctly and never deleted by age [154.77ms]
@bryance/orch test: (pass) queue scope invariants > two concurrent claims have one winner and one one_open_attempt violation [200.60ms]
@bryance/orch test: 
@bryance/orch test: test\commands-help.test.ts:
@bryance/orch test: (pass) per-command help topics > daemon help names every subcommand and the idle shutdown setting [0.04ms]
@bryance/orch test: (pass) per-command help topics > aliases resolve to their command's topic [0.03ms]
@bryance/orch test: (pass) per-command help topics > logs help names every filter the command accepts [0.09ms]
@bryance/orch test: (pass) per-command help topics > an unknown name has no topic [0.02ms]
@bryance/orch test: (pass) per-command help topics > every topic is printable text ending in a newline [0.14ms]
@bryance/orch test: 
@bryance/orch test: test\remote-fanout.test.ts:
@bryance/orch test: (pass) async remote fan-out > returns a typed timeout failure [539.57ms]
@bryance/orch test: 
@bryance/orch test: test\commands-queue.test.ts:
@bryance/orch test: No queue tasks.
@bryance/orch test: (pass) commands/queue > round-trips add/list/cancel on an isolated store [138.11ms]
@bryance/orch test: (pass) commands/queue > renders empty queues without throwing [0.27ms]
@bryance/orch test: 
@bryance/orch test: test\store-task-rows.test.ts:
@bryance/orch test: (pass) task and attempt rows > malformed task rows are refused instead of handed back as typed data [206.36ms]
@bryance/orch test: 
@bryance/orch test: test\control-dispatch.test.ts:
@bryance/orch test: (pass) deliverControl > refuses to steer a pane awaiting an answer, naming the primitive that lands [30.47ms]
@bryance/orch test: (pass) deliverControl > still answers a pane awaiting an answer [40.21ms]
@bryance/orch test: (pass) deliverControl > a run dispatch is not blocked by an asking pane [29.01ms]
@bryance/orch test: (pass) deliverControl > does not fall back from a keys strategy to the orch channel [211.59ms]
@bryance/orch test: (pass) deliverControl > a run to a keys-strategy agent with no pane is answered, never queued on the channel [157.97ms]
@bryance/orch test: (pass) deliverControl > refuses steer and model on an adapter that composes neither role [18.04ms]
@bryance/orch test: (pass) deliverControl > requires presence for inbox delivery [150.51ms]
@bryance/orch test: (pass) deliverControl > refuses inbox delivery to an agent whose bridge never registered [152.72ms]
@bryance/orch test: (pass) deliverControl > refuses inbox delivery to an agent whose process is gone [126.76ms]
@bryance/orch test: 
@bryance/orch test: test\outbox-ack.test.ts:
@bryance/orch test: (pass) outbox ack fallback > consumes a fake agent ack from ack.jsonl on the next drain [140.50ms]
@bryance/orch test: 
@bryance/orch test: test\commands-results.test.ts:
@bryance/orch test: (pass) commands/results > renders missing space and host as absent instead of inventing local [128.77ms]
@bryance/orch test: 
@bryance/orch test: test\status-unleased.test.ts:
@bryance/orch test: (pass) status owner rendering > a dead holder is shown as unleased with the holder gone [1611.22ms]
@bryance/orch test: (pass) status owner rendering > an agent never leased shows no orch driving it [1659.32ms]
@bryance/orch test: 
@bryance/orch test: test\remote-fanout.test.ts:
@bryance/orch test: (pass) async remote fan-out > returns a typed non-JSON failure [363.89ms]
@bryance/orch test: 
@bryance/orch test: test\agent-key-is-minted-id.test.ts:
@bryance/orch test: (pass) a driving session mints an id, it is not placed by name > the presence directory is named by that id alone [9.28ms]
@bryance/orch test: (pass) a driving session mints an id, it is not placed by name > a launch that handed over a minted id is used verbatim [51.96ms]
@bryance/orch test: (pass) this process's own identity is the id and nothing else > a spawned agent answers with the id its launch handed it [4.50ms]
@bryance/orch test: (pass) the fleet wall is lifted by the absence of a launch, not by a key's shape > an agent orch launched may not cross into another project's fleet [265.90ms]
@bryance/orch test: (pass) who drives an agent is looked up by its id > the key IS the agent id ΓÇö no segment is split out of it [2831.15ms]
@bryance/orch test: (pass) who drives an agent is looked up by its id > a composite key addresses no agent at all [1636.43ms]
@bryance/orch test: (pass) doctor reads a presence directory name as an id > a composite directory name is a malformed identity key [31.38ms]
@bryance/orch test: (pass) doctor reads a presence directory name as an id > a minted id with a current stamp is well formed [12.05ms]
@bryance/orch test: 
@bryance/orch test: test\cross-pack-result-delivery.test.ts:
@bryance/orch test: (pass) results go to the enqueuer across packs (Cq4) > a result reaches the FOREIGN enqueuer's inbox, not the runner's [165.70ms]
@bryance/orch test: 
@bryance/orch test: test\store-agent-rows.test.ts:
@bryance/orch test: (pass) agent store rows > insertAgent writes both NULL; agentById reads both back [168.24ms]
@bryance/orch test: 
@bryance/orch test: test\capacity.test.ts:
@bryance/orch test: (pass) fleet capacity > counts live agents by root holder [1.22ms]
@bryance/orch test: (pass) fleet capacity > reports configured per-space caps [0.18ms]
@bryance/orch test: (pass) fleet capacity > uses null for an unlimited total [0.18ms]
@bryance/orch test: (pass) fleet capacity > formats holder, space, and machine capacity [0.38ms]
@bryance/orch test: 
@bryance/orch test: test\check-bridge.test.ts:
@bryance/orch test: (pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.17ms]
@bryance/orch test: 
@bryance/orch test: test\cross-pack-result-delivery.test.ts:
@bryance/orch test: (pass) results go to the enqueuer across packs (Cq4) > the delivered line carries the result payload, not just a notification [190.22ms]
@bryance/orch test: (pass) results go to the enqueuer across packs (Cq4) > a FAILED task still reports back ΓÇö silence is the worst outcome [150.42ms]
@bryance/orch test: (pass) results go to the enqueuer across packs (Cq4) > an enqueuer with no inbox is not an error ΓÇö delivery is best-effort, the task stays settled [123.43ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-credential.test.ts:
@bryance/orch test: (skip) the token file is the whole credential > the token is 0600
@bryance/orch test: (skip) the token file is the whole credential > $ORCH_DIR is 0700, so same-uid is a boundary the filesystem enforces
@bryance/orch test: (skip) the token file is the whole credential > a token left loose by an earlier run is tightened, not trusted
@bryance/orch test: (skip) the token file is the whole credential > a runtime directory the daemon creates is 0700 too
@bryance/orch test: (pass) the token file is the whole credential > nothing else is enrolled: there is no allowlist beside the token [19.96ms]
@bryance/orch test: 
@bryance/orch test: test\remote-fanout.test.ts:
@bryance/orch test: (pass) async remote fan-out > fans out and keeps per-host failures without throwing [652.13ms]
@bryance/orch test: 
@bryance/orch test: test\check-bridge.test.ts:
@bryance/orch test: (pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.10ms]
@bryance/orch test: (pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / settings seams [0.10ms]
@bryance/orch test: (pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [0.63ms]
@bryance/orch test: (pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.20ms]
@bryance/orch test: (pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.05ms]
@bryance/orch test: (pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the shared harness model port outside the adapter dispatcher [0.04ms]
@bryance/orch test: (pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [2.40ms]
@bryance/orch test: (pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > flags a runtime adapter importing bridge-bundles/build.ts [0.64ms]
@bryance/orch test: (pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > allows scripts and the build-tool module itself [0.06ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [0.80ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.08ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.27ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke test holds no exemption: the branch was deleted, not blessed [0.13ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has no identity-branch line, exempted or otherwise [5.43ms]
@bryance/orch test: (pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > flags spawner key and spawnerIdentity key owner-token fallbacks [0.31ms]
@bryance/orch test: (pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > allows a benign line [0.03ms]
@bryance/orch test: (pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > passes the clean tree: reply addresses never use owner-token fallbacks [8.42ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags object literals that synthesize an identity [0.38ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags concatenated and template identity keys [0.23ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > allows a fresh spawn mint and the issuer modules [0.05ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > no file is exempt from the identity-construction rule [0.02ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > passes the clean tree: every identity construction is allowed or registered [4.56ms]
@bryance/orch test: (pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.55ms]
@bryance/orch test: (pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.06ms]
@bryance/orch test: (pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [2.36ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > a deleted capability bag or optional method is not exempt [2.17ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > the exempted names are the roles the ports actually declare [0.46ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > nullable data on the port is not exempted as a role [0.07ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > flags plexer and harness identity branches [0.04ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > flags method-presence capability checks [0.29ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > allows a branch inside a concrete backend [0.05ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > passes the clean tree: no file in ANY scanned scope branches on an environment id [237.49ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > the core-scope allowlist is EMPTY, so no line holds a standing exemption [0.14ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > allows capability-driven code [0.05ms]
@bryance/orch test: (pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags INSERT and UPDATE SQL that welds a lease holder into spawned_by [0.38ms]
@bryance/orch test: (pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags lease row types carrying a provenance field [0.06ms]
@bryance/orch test: (pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > allows separate lease and provenance rows [0.17ms]
@bryance/orch test: (pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > passes the clean tree: no source line crosses lease and provenance columns [60.26ms]
@bryance/orch test: (pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a launch env read outside launch.ts with the file and constant named [0.25ms]
@bryance/orch test: (pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > allows the launch env read inside identity/launch.ts [0.04ms]
@bryance/orch test: (pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a bare launch env name literal outside launch.ts [0.03ms]
@bryance/orch test: (pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a comment mentioning the launch env name outside launch.ts [0.02ms]
@bryance/orch test: (pass) the closed plexer-id set is spelled in exactly one line > the definition line is allowed where it lives, and nowhere else [0.14ms]
@bryance/orch test: (pass) the closed plexer-id set is spelled in exactly one line > any other quoted plexer id in that same file still fails [0.03ms]
@bryance/orch test: (pass) the closed plexer-id set is spelled in exactly one line > the line src/types/backend.ts actually carries is the allowed one [4.87ms]
@bryance/orch test: (pass) the closed plexer-id set is spelled in exactly one line > extensions get the same rule with their own scope named [0.41ms]
@bryance/orch test: 
@bryance/orch test: test\remote.test.ts:
@bryance/orch test: (pass) host-prefixed targets > round-trips local and host-prefixed grammar [1.42ms]
@bryance/orch test: (pass) host-prefixed targets > reports unknown host and configured names [0.09ms]
@bryance/orch test: 
@bryance/orch test: test\outbox-ack.test.ts:
@bryance/orch test: (pass) outbox ack fallback > keeps an unacknowledged delivery pending for retry [109.16ms]
@bryance/orch test: (pass) outbox ack fallback > a duplicated ack marker is counted once, not twice [141.25ms]
@bryance/orch test: (pass) outbox ack fallback > an ack whose key does not match the agent dir is ignored [175.90ms]
@bryance/orch test: (pass) outbox ack fallback > an inbox write is queued, not delivered: only the agent's ack settles the row [152.81ms]
@bryance/orch test: (pass) outbox ack fallback > a channel that can never ack settles the row on the write itself [102.18ms]
@bryance/orch test: (pass) outbox ack fallback > a queued write is handed off, so it is open but no longer unsent [139.94ms]
@bryance/orch test: (pass) outbox ack fallback > a write no channel would take stays unsent [106.40ms]
@bryance/orch test: 
@bryance/orch test: test\claim-agent.test.ts:
@bryance/orch test: (pass) claim agent > unclaimed + A ΓåÆ stamped [187.56ms]
@bryance/orch test: 
@bryance/orch test: test\outbox-replay.test.ts:
@bryance/orch test: (pass) outbox restart replay > replays failed messages after restart without duplicates [177.27ms]
@bryance/orch test: 
@bryance/orch test: test\clean-worktrees.test.ts:
@bryance/orch test: Preparing worktree (new branch 'orch/empty')
@bryance/orch test: Preparing worktree (new branch 'orch/merged')
@bryance/orch test: Preparing worktree (new branch 'orch/unmerged')
@bryance/orch test: (pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [7330.57ms]
@bryance/orch test: 
@bryance/orch test: test\rename-syncs-the-pane-border.test.ts:
@bryance/orch test: (pass) orch rename syncs the pane border in one command (U5) > one rename sets orch's name AND the plexer chrome [224.75ms]
@bryance/orch test: 
@bryance/orch test: test\commands-results.test.ts:
@bryance/orch test: (pass) commands/results > validates and extracts question payloads [0.09ms]
@bryance/orch test: (pass) commands/results > formats invalid and recent timestamps [0.06ms]
@bryance/orch test: (pass) commands/results > routes a seeded results.jsonl through the command module [151.96ms]
@bryance/orch test: (pass) commands/results > keeps every settled dispatch and reports the newest [167.46ms]
@bryance/orch test: (pass) commands/results > falls back to adapter session text when results.jsonl is absent [154.95ms]
@bryance/orch test: (pass) commands/results > uses results.jsonl even when the presence status has no agent [165.24ms]
@bryance/orch test: (pass) commands/results > orch tail resolves a non-pi target through that adapter's session view [175.07ms]
@bryance/orch test: (pass) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [142.57ms]
@bryance/orch test: (pass) commands/results > orch tail -n keeps last-N rendered entries for a pi session [153.11ms]
@bryance/orch test: (pass) commands/results > orch session reports the pi entry count [164.32ms]
@bryance/orch test: (pass) commands/results > orch session shows zero entries for an adapter view without them [179.67ms]
@bryance/orch test: 
@bryance/orch test: test\outbox.test.ts:
@bryance/orch test: (pass) outbox delivery > selects pending messages and delivers each message once [190.67ms]
@bryance/orch test: 
@bryance/orch test: test\store-task-rows.test.ts:
@bryance/orch test: (pass) task and attempt rows > malformed attempt rows are refused instead of handing back NaN [158.19ms]
@bryance/orch test: (pass) task and attempt rows > enqueue accepts exactly one typed scope and round-trips JSON opts [187.93ms]
@bryance/orch test: (pass) task and attempt rows > queued tasks can be edited only by their enqueuer [226.03ms]
@bryance/orch test: (pass) task and attempt rows > two concurrent claims have one winner and one index violation [226.91ms]
@bryance/orch test: (pass) task and attempt rows > failed attempts remain in history and retries are new attempts [211.59ms]
@bryance/orch test: (pass) task and attempt rows > settlement stores exact integer instants and outcome payloads [191.76ms]
@bryance/orch test: (pass) task and attempt rows > task state precedence covers queued, claimed, failed, done and cancelled [275.10ms]
@bryance/orch test: (pass) task and attempt rows > intakes are half-open history and duplicate open intake is rejected [205.95ms]
@bryance/orch test: 
@bryance/orch test: test\store-values.test.ts:
@bryance/orch test: (pass) store row values > uses null for optional database values without JSON text [0.11ms]
@bryance/orch test: (pass) store row values > sets only non-null fields [0.08ms]
@bryance/orch test: 
@bryance/orch test: test\outbox.test.ts:
@bryance/orch test: (pass) outbox delivery > checks one message's pending state without scanning the outbox [111.10ms]
@bryance/orch test: (pass) outbox delivery > keeps failed messages pending until their backoff expires [96.28ms]
@bryance/orch test: 
@bryance/orch test: test\commands-review.test.ts:
@bryance/orch test: (pass) commands/review > uses the short orch branch as review target [0.16ms]
@bryance/orch test: (pass) commands/review > falls back to branch then the agent's address [0.06ms]
@bryance/orch test: 
@bryance/orch test: test\rename-syncs-the-pane-border.test.ts:
@bryance/orch test: (pass) orch rename syncs the pane border in one command (U5) > the response states the two outcomes SEPARATELY [219.49ms]
@bryance/orch test: (pass) orch rename syncs the pane border in one command (U5) > a plexer that refuses the chrome never unwrites orch's own name [151.46ms]
@bryance/orch test: (pass) orch rename syncs the pane border in one command (U5) > --pane still gives the border something DIFFERENT, and leaves the name alone [104.95ms]
@bryance/orch test: 
@bryance/orch test: test\claim-agent.test.ts:
@bryance/orch test: (pass) claim agent > claimed A, claim A ΓåÆ unchanged [173.25ms]
@bryance/orch test: (pass) claim agent > claimed A, reclaimAgent(id) then B ΓåÆ stamped with B [185.10ms]
@bryance/orch test: (pass) claim agent > claimed A, plain claim B ΓåÆ refused claimed-by-other, row unchanged [122.94ms]
@bryance/orch test: (pass) claim agent > unknown id ΓåÆ refused unknown-agent [101.94ms]
@bryance/orch test: 
@bryance/orch test: test\store-agent-rows.test.ts:
@bryance/orch test: (pass) agent store rows > insertAgent materializes the provenance root [123.82ms]
@bryance/orch test: (pass) agent store rows > endAgent records who closed it, nullable for death [131.35ms]
@bryance/orch test: (pass) agent store rows > liveAgents excludes agents with an ending [158.69ms]
@bryance/orch test: (pass) agent store rows > packMembers selects the materialized root [122.58ms]
@bryance/orch test: (pass) agent store rows > unknown harness is rejected by the foreign key [83.00ms]
@bryance/orch test: (pass) agent store rows > unknown spawnedBy is rejected by the foreign key [115.75ms]
@bryance/orch test: (pass) agent store rows > label maps both null and a value [141.95ms]
@bryance/orch test: (pass) agent store rows > created_at is an INTEGER epoch millisecond [154.07ms]
@bryance/orch test: (pass) agent store rows > worktreeOf distinguishes repo agents from worktree agents [143.19ms]
@bryance/orch test: (pass) agent store rows > renameAgent is id-keyed and leaves identity history unchanged [113.73ms]
@bryance/orch test: (pass) agent store rows > lookup ensure operations are insert-or-ignore [76.12ms]
@bryance/orch test: (pass) agent store rows > childrenOf returns direct descendants [73.81ms]
@bryance/orch test: 
@bryance/orch test: test\commands-runs.test.ts:
@bryance/orch test: (pass) commands/runs > lists newest first and honors -n [84.53ms]
@bryance/orch test: 
@bryance/orch test: test\thinking-resolution.test.ts:
@bryance/orch test: (pass) thinking resolution > resolves every rung in priority order [77.13ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: (pass) fleet ownership scoping > fleet visibility follows provenance depth, not caller environment [220.19ms]
@bryance/orch test: 
@bryance/orch test: test\thinking-resolution.test.ts:
@bryance/orch test: (pass) thinking resolution > bare model with no setting yields harness default [7.73ms]
@bryance/orch test: (pass) thinking resolution > pi translates the resolved level through its thinking role [0.85ms]
@bryance/orch test: (pass) thinking resolution > per-harness override beats global default [41.98ms]
@bryance/orch test: 
@bryance/orch test: test\store-catalogue.test.ts:
@bryance/orch test: (pass) catalogue rows > empty store reads an empty Map [118.63ms]
@bryance/orch test: 
@bryance/orch test: test\commands-runs.test.ts:
@bryance/orch test: (pass) commands/runs > target filter and json preserve RunRecord rows [134.83ms]
@bryance/orch test: (pass) commands/runs > running rows render as running, not zero duration [0.28ms]
@bryance/orch test: (pass) commands/runs > result falls back to durable run history after presence reap [74.11ms]
@bryance/orch test: 
@bryance/orch test: test\tiling.test.ts:
@bryance/orch test: (pass) planTilePlacement > a lone pane anchors the split to the only pane [0.19ms]
@bryance/orch test: (pass) planTilePlacement > first_split rules the opening split, however the screen is shaped [0.10ms]
@bryance/orch test: (pass) planTilePlacement > first_split longest-edge leaves the opening split to the tab's own shape [0.19ms]
@bryance/orch test: (pass) planTilePlacement > a tab with no geometry to read still opens the way first_split says [0.06ms]
@bryance/orch test: (pass) planTilePlacement > past the first split, the biggest pane halves its longer side whatever first_split says [0.44ms]
@bryance/orch test: (pass) planTilePlacement > the biggest pane is the target, whatever the caller's own pane is [0.09ms]
@bryance/orch test: (pass) planTilePlacement > equal panes resolve top-left first, so enumeration order cannot decide [0.18ms]
@bryance/orch test: (pass) planTilePlacement > four agents land in a 2x2 grid, not four columns [0.95ms]
@bryance/orch test: (pass) planTilePlacement > four agents on an ultrawide screen still land in a 2x2 grid [0.08ms]
@bryance/orch test: (pass) planTilePlacement > first_split rows stacks the second agent, columns seats it alongside [0.04ms]
@bryance/orch test: (pass) planTilePlacement > longest-edge on an ultrawide screen is the four-thin-columns layout first_split exists to avoid [0.04ms]
@bryance/orch test: (pass) planTilePlacement > the same pane count yields the same grid whatever pane order the plexer reports [24.00ms]
@bryance/orch test: 
@bryance/orch test: test\claude-adapter.test.ts:
@bryance/orch test: (pass) Claude adapter > declares its identity, and composes only the roles it fully implements [2.57ms]
@bryance/orch test: 
@bryance/orch test: test\tool-exec-retry.test.ts:
@bryance/orch test: (pass) every command into a harness or plexer retries on timing, not on being wrong > a transient refusal is reattempted until it succeeds [23.31ms]
@bryance/orch test: 
@bryance/orch test: test\commands-setup.test.ts:
@bryance/orch test: (pass) commands/setup > reads value and assignment flags [0.49ms]
@bryance/orch test: 
@bryance/orch test: test\tool-exec-retry.test.ts:
@bryance/orch test: (pass) every command into a harness or plexer retries on timing, not on being wrong > a failure the caller calls permanent is thrown on the FIRST attempt, never retried [0.31ms]
@bryance/orch test: (pass) every command into a harness or plexer retries on timing, not on being wrong > a tool that never recovers exhausts the budget and reports how many attempts it cost [57.37ms]
@bryance/orch test: (pass) every command into a harness or plexer retries on timing, not on being wrong > the seam names no harness: the same policy drives a different binary [1.38ms]
@bryance/orch test: 
@bryance/orch test: test\transcript.test.ts:
@bryance/orch test: (pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [8.89ms]
@bryance/orch test: (pass) lastAssistantFromJsonl > undefined for blank or empty input [1.67ms]
@bryance/orch test: (pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.74ms]
@bryance/orch test: (pass) assistantText > reads role-tagged records [0.45ms]
@bryance/orch test: (pass) assistantText > reads the {type:'assistant'} envelope with a nested message [0.07ms]
@bryance/orch test: (pass) assistantText > undefined for non-assistant roles [0.04ms]
@bryance/orch test: (pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.06ms]
@bryance/orch test: (pass) contentText empty-string part handling > an all-empty content array yields undefined [0.06ms]
@bryance/orch test: (pass) contentText empty-string part handling > a bare empty string yields undefined [0.01ms]
@bryance/orch test: 
@bryance/orch test: test\store-catalogue.test.ts:
@bryance/orch test: (pass) catalogue rows > write then read round-trips at and stdout [78.33ms]
@bryance/orch test: (pass) catalogue rows > writing the same command twice keeps one row with newer values [79.93ms]
@bryance/orch test: (pass) catalogue rows > an entry with empty stdout is not stored [54.48ms]
@bryance/orch test: (pass) catalogue rows > clearCatalogues empties the store [56.96ms]
@bryance/orch test: (pass) catalogue rows > two commands coexist and updating one does not touch the other [61.87ms]
@bryance/orch test: 
@bryance/orch test: test\store-connection-guards.test.ts:
@bryance/orch test: (pass) store migration guards > a store predating the migrations is refused, not rebuilt over [95.27ms]
@bryance/orch test: 
@bryance/orch test: test\transfer-does-not-disturb.test.ts:
@bryance/orch test: (pass) a transfer touches the lease and nothing else > a handoff changes the holder and leaves every other fact identical [198.50ms]
@bryance/orch test: 
@bryance/orch test: test\cmd-lock-serialize.test.ts:
@bryance/orch test: (pass) command lock serialization > evicts a lock whose process instance token no longer matches [2312.57ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-replay.test.ts:
@bryance/orch test: (pass) orchd RPC replay buffer > replays from inside the surviving range without a gap [153.41ms]
@bryance/orch test: (pass) orchd RPC replay buffer > reports a gap when the requested sequence predates retained history [131.23ms]
@bryance/orch test: (pass) orchd RPC replay buffer > empty history has no gap or oldest sequence [88.95ms]
@bryance/orch test: (pass) orchd RPC replay buffer > limits replay size without pruning durable events [4695.68ms]
@bryance/orch test: 
@bryance/orch test: test\worktree.test.ts:
@bryance/orch test: Preparing worktree (new branch 'orch/feature')
@bryance/orch test: Preparing worktree (new branch 'orch/remove-me')
@bryance/orch test: fatal: not a git repository (or any of the parent directories): .git
@bryance/orch test: (pass) worktree primitives > detects commits ahead of a base branch [1886.52ms]
@bryance/orch test: (pass) worktree primitives > removes an agent worktree [1392.28ms]
@bryance/orch test: (pass) worktree primitives > rejects a non-repository path with a clear error [96.55ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-subscribe.test.ts:
@bryance/orch test: (pass) orchd event subscription > replays only events missed between subscriptions [170.92ms]
@bryance/orch test: 
@bryance/orch test: test\store-connection-guards.test.ts:
@bryance/orch test: (pass) store migration guards > names live presence as the thing to close before rebuilding [117.05ms]
@bryance/orch test: (pass) a slave never reaps or recreates the store > a spawned agent hitting a schema-mismatched store errors and mutates nothing [162.94ms]
@bryance/orch test: (pass) a slave never reaps or recreates the store > a recreate is refused while a live presence dir exists, for the user too [98.58ms]
@bryance/orch test: (pass) a slave never reaps or recreates the store > the user may recreate once nothing is live [108.32ms]
@bryance/orch test: (pass) a slave never reaps or recreates the store > a spawned agent is refused a recreate even with nothing live [96.34ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-transport.test.ts:
@bryance/orch test: (pass) orchd RPC transports > round-trips over the default unix transport [27.14ms]
@bryance/orch test: (pass) orchd RPC transports > round-trips over the TCP fallback transport [68.95ms]
@bryance/orch test: 
@bryance/orch test: test\backend-headless.test.ts:
@bryance/orch test: (pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [58.94ms]
@bryance/orch test: (pass) HeadlessBackend > signals a matching recorded process through the injected killer [2334.68ms]
@bryance/orch test: (pass) HeadlessBackend > refuses to signal a pid whose process instance was replaced [1180.15ms]
@bryance/orch test: (pass) HeadlessBackend > never signals a dead pid [0.52ms]
@bryance/orch test: 
@bryance/orch test: test\notify-ding.test.ts:
@bryance/orch test: (pass) notify/ding > the sound sink is a declared sink that takes no configuration [0.42ms]
@bryance/orch test: (pass) notify/ding > this host names the players it would use, and says how to get one [1.10ms]
@bryance/orch test: (pass) notify/ding > a command string runs through the host's own shell; argv is passed through untouched [0.11ms]
@bryance/orch test: 
@bryance/orch test: test\store-events.test.ts:
@bryance/orch test: (pass) event store rows > appendEvent assigns increasing sequence numbers and round-trips payload [107.57ms]
@bryance/orch test: 
@bryance/orch test: test\os-executors.test.ts:
@bryance/orch test: (pass) cross-OS execution is a backend, not a peer daemon > the local side supplies start, is-alive and kill [1.59ms]
@bryance/orch test: 
@bryance/orch test: test\claude-adapter.test.ts:
@bryance/orch test: (pass) Claude adapter > builds the interactive Claude launch command [0.50ms]
@bryance/orch test: (pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.66ms]
@bryance/orch test: (pass) Claude adapter > detects state from a live presence status [110.50ms]
@bryance/orch test: (pass) Claude adapter > extracts results.jsonl before transcript and native output [21.09ms]
@bryance/orch test: (pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [21.97ms]
@bryance/orch test: (pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [188.53ms]
@bryance/orch test: (pass) Claude adapter > maps Claude hook events to presence states and schema [583.10ms]
@bryance/orch test: (pass) Claude adapter > exits silently and writes no presence without launch env (a non-orch session) [251.18ms]
@bryance/orch test: (pass) Claude adapter > fails hard and writes no presence on a malformed launch env [140.17ms]
@bryance/orch test: 
@bryance/orch test: test\backend-herdr-predicates.test.ts:
@bryance/orch test: (pass) herdr environment predicates > neither variable set [0.62ms]
@bryance/orch test: (pass) herdr environment predicates > HERDR_ENV=1 only [0.15ms]
@bryance/orch test: (pass) herdr environment predicates > HERDR_PANE_ID only [0.13ms]
@bryance/orch test: (pass) herdr environment predicates > both variables set [0.07ms]
@bryance/orch test: 
@bryance/orch test: test\transfer-does-not-disturb.test.ts:
@bryance/orch test: (pass) a transfer touches the lease and nothing else > the agent's process is not restarted or re-attached [230.12ms]
@bryance/orch test: (pass) a transfer touches the lease and nothing else > no reset, steer or re-attach is delivered to the agent [273.48ms]
@bryance/orch test: (pass) a transfer touches the lease and nothing else > adoption of an unheld agent disturbs it no more than a handoff does [257.36ms]
@bryance/orch test: (pass) a transfer touches the lease and nothing else > the holding that ended is kept as history, not erased by the transfer [173.75ms]
@bryance/orch test: 
@bryance/orch test: test\backend-herdr.test.ts:
@bryance/orch test: (pass) HerdrBackend > current identity uses the explicit id, not the launch environment [6.86ms]
@bryance/orch test: (pass) HerdrBackend > composes a complete group role bundle [0.23ms]
@bryance/orch test: (pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [2.41ms]
@bryance/orch test: (pass) HerdrBackend > starts the mapped herdr harness kind in the pane it created [14.86ms]
@bryance/orch test: (pass) HerdrBackend > agent_not_ready keeps the pane and does not close it [2.62ms]
@bryance/orch test: (pass) HerdrBackend > a caller pane is split rather than given a new tab [2.74ms]
@bryance/orch test: (pass) HerdrBackend > pane and tab creation always preserves focus [1.44ms]
@bryance/orch test: (pass) HerdrBackend > split direction clamps to herdr's right|down [0.38ms]
@bryance/orch test: (pass) HerdrBackend > env reaches the pane through herdr's --env, not an argv prefix [0.44ms]
@bryance/orch test: (pass) HerdrBackend > a handed-over pane is launched into directly, never split or closed [0.17ms]
@bryance/orch test: (pass) HerdrBackend > a group is created with the environment its own pane will launch under [0.36ms]
@bryance/orch test: (pass) HerdrBackend > the pane host closes a pane through herdr [0.05ms]
@bryance/orch test: (pass) HerdrBackend > a planned target pane is split directly, never re-seated afterwards [10.91ms]
@bryance/orch test: (pass) HerdrBackend > a grouped spawn with no planned target splits a pane already in that tab, never the caller's pane [2.44ms]
@bryance/orch test: (pass) HerdrBackend > a same-tab re-seat bounces through a throwaway tab so herdr executes it [0.28ms]
@bryance/orch test: (pass) HerdrBackend > adopts herdr's replacement pane id after move [0.05ms]
@bryance/orch test: (pass) HerdrBackend > refuses a live herdr agent name before start [0.45ms]
@bryance/orch test: (pass) HerdrBackend > reads recent unwrapped pane output [0.16ms]
@bryance/orch test: (pass) HerdrBackend > a refused move surfaces herdr's reason instead of claiming success [0.09ms]
@bryance/orch test: (pass) HerdrBackend > groupLayout reads tab geometry straight off the pane listing [0.22ms]
@bryance/orch test: (pass) HerdrBackend > pane input submits through pane run [0.04ms]
@bryance/orch test: (pass) HerdrBackend > pane rename failure reaches the role caller [0.18ms]
@bryance/orch test: (pass) HerdrBackend > waiting uses agent wait --until, not the removed top-level wait [0.07ms]
@bryance/orch test: (pass) HerdrBackend space home > opens an orch-marked workspace for a pack the caller did not label [2.21ms]
@bryance/orch test: (pass) HerdrBackend space home > a space home the human named keeps that name [0.14ms]
@bryance/orch test: (pass) HerdrBackend space home > create hands back the plexer coordinate and the root pane, and says neither [0.11ms]
@bryance/orch test: 
@bryance/orch test: test\store-events.test.ts:
@bryance/orch test: (pass) event store rows > appendEvent keeps sequence numbers across store reopen [112.85ms]
@bryance/orch test: (pass) event store rows > pruned sequence numbers are never reused [104.96ms]
@bryance/orch test: (pass) event store rows > selectEventsSince filters by sequence, orders ascending, and honours limit [74.29ms]
@bryance/orch test: (pass) event store rows > oldestEventSeq reports undefined when empty and the surviving lowest sequence after pruning [83.03ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-settings-preservation.test.ts:
@bryance/orch test: (pass) doctor settings preservation > yes mode leaves existing settings.json byte-identical [3769.81ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-decision-trail.test.ts:
@bryance/orch test: (pass) daemon decision trail > records a lease refused against a live holder [2692.49ms]
@bryance/orch test: 
@bryance/orch test: test\commands-setup.test.ts:
@bryance/orch test: Selection recorded in C:\Users\Bryan\AppData\Local\Temp\orch-setup-characterization-rmEa5N\settings.json:
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
@bryance/orch test:   C:\Users\Bryan\AppData\Local\Temp\orch-setup-characterization-rmEa5N\agents
@bryance/orch test: Skills:
@bryance/orch test:   not installed - turn it back on with: orch settings skills --install
@bryance/orch test: bins:
@bryance/orch test:   C:\Users\Bryan\AppData\Local\Temp\orch-setup-home-d1NtoJ\.local\bin\orch (copy)
@bryance/orch test:   C:\Users\Bryan\AppData\Local\Temp\orch-setup-home-d1NtoJ\.local\bin\pif (copy)
@bryance/orch test:   C:\Users\Bryan\AppData\Local\Temp\orch-setup-home-d1NtoJ\.local\bin\orch-ding (copy)
@bryance/orch test:   SKIP pi extensions: pi integration shim disabled
@bryance/orch test: Running doctor checks...
@bryance/orch test: Doctor: 29/35 checks passed
@bryance/orch test: Smoke test skipped (non-interactive) - run `orch setup` on a TTY to verify orch can deliver work.
@bryance/orch test: Done. Open a plexer workspace and try: orch spawn 2 --tab Team1
@bryance/orch test: (pass) commands/setup > resolves noninteractive provider sets and defaults [0.81ms]
@bryance/orch test: (pass) commands/setup > runs non-interactive setup against the requested ORCH_DIR and records the selected composition [1472.22ms]
@bryance/orch test: (pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.34ms]
@bryance/orch test: 
@bryance/orch test: test\notify-events-format.test.ts:
@bryance/orch test: (pass) notification and presence event formatting > spaceColor is stable and returns a palette hex [0.27ms]
@bryance/orch test: 
@bryance/orch test: test\close-authority.test.ts:
@bryance/orch test: (pass) who may end an agent (D7) > the human may close anything [180.95ms]
@bryance/orch test: 
@bryance/orch test: test\pid-liveness.test.ts:
@bryance/orch test: (pass) pidAlive liveness contract (shared by pi peers) > EPERM means the process exists under another user ΓÇö alive [1.48ms]
@bryance/orch test: (pass) pidAlive liveness contract (shared by pi peers) > ESRCH means no such process ΓÇö dead [0.19ms]
@bryance/orch test: (pass) pidAlive liveness contract (shared by pi peers) > the current process is alive [0.09ms]
@bryance/orch test: (pass) pidAlive liveness contract (shared by pi peers) > non-positive and non-numeric pids are rejected without signalling [0.10ms]
@bryance/orch test: 
@bryance/orch test: test\store-identity.test.ts:
@bryance/orch test: (pass) hello agent identity rows > reuses the live agent for the same session process and mints for another [213.50ms]
@bryance/orch test: 
@bryance/orch test: test\unleased-agents.test.ts:
@bryance/orch test: (pass) registration unleased agent hint > includes unleased workers but never session identities [215.47ms]
@bryance/orch test: 
@bryance/orch test: test\plexer-versions.test.ts:
@bryance/orch test: (pass) plexer version support > pins herdr to the tested range, including both exclusive boundaries [0.74ms]
@bryance/orch test: 
@bryance/orch test: test\notify-events-format.test.ts:
@bryance/orch test: (pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.52ms]
@bryance/orch test: (pass) notification and presence event formatting > named events prefer the human name over the harness id [0.22ms]
@bryance/orch test: (pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.27ms]
@bryance/orch test: (pass) notification and presence event formatting > webhook payload includes space and spaceColor [1.59ms]
@bryance/orch test: (pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [15.57ms]
@bryance/orch test: (pass) notification and presence event formatting > derivePresenceTransition composes the space from the agent's environment [239.91ms]
@bryance/orch test: 
@bryance/orch test: test\store-identity.test.ts:
@bryance/orch test: (pass) hello agent identity rows > first sight creates a named root agent and open process row [154.15ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-decision-trail.test.ts:
@bryance/orch test: (pass) daemon decision trail > records a lease granted over a dead holder [190.55ms]
@bryance/orch test: (pass) daemon decision trail > records a no-pane boundary answer with its reason [172.61ms]
@bryance/orch test: 
@bryance/orch test: test\notify-router.test.ts:
@bryance/orch test: (pass) notify router > delivers only when on includes the event state [0.57ms]
@bryance/orch test: (pass) notify router > passes typed webhook and command configuration [0.70ms]
@bryance/orch test: (pass) notify router > surfaces notifier errors [0.51ms]
@bryance/orch test: 
@bryance/orch test: test\plexer-versions.test.ts:
@bryance/orch test: (pass) plexer version support > compares numeric versions rather than lexical strings [0.13ms]
@bryance/orch test: (pass) plexer version support > rotates one open host install row when the plexer changes version [162.51ms]
@bryance/orch test: (pass) plexer version support > doctor names both versions and tells the operator to update orch [0.37ms]
@bryance/orch test: (pass) plexer version support > a supported plexer the user never installed is not a complaint [0.16ms]
@bryance/orch test: (pass) plexer version support > an in-range install reports ok with the version it read [0.05ms]
@bryance/orch test: (pass) plexer version support > only an installed plexer that cannot report a version warns [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\port-has-no-shell.test.ts:
@bryance/orch test: (pass) the backend port has no dead workspace shell > backend types contain neither deleted declaration [0.33ms]
@bryance/orch test: 
@bryance/orch test: test\store-instants.test.ts:
@bryance/orch test: (pass) epoch-millisecond store instants > a lease records its holding as an integer instant [121.23ms]
@bryance/orch test: 
@bryance/orch test: test\port-has-no-shell.test.ts:
@bryance/orch test: (pass) the backend port has no dead workspace shell > src contains no workspaceNames calls or BackendWorkspace references [29.34ms]
@bryance/orch test: 
@bryance/orch test: test\port-no-optional-methods.test.ts:
@bryance/orch test: (pass) the environment port declares capability by composition, never by optionality > src/types/backend.ts has no optional methods on any port interface [1.36ms]
@bryance/orch test: (pass) the environment port declares capability by composition, never by optionality > the deleted capability flags bag is gone, not merely unimplemented [0.73ms]
@bryance/orch test: (pass) the environment port declares capability by composition, never by optionality > src/types/adapter.ts has no optional methods on the harness port either [2.08ms]
@bryance/orch test: 
@bryance/orch test: test\notify-sinks.test.ts:
@bryance/orch test: (pass) notification entries > desktop entries use the canonical notifier registry [0.95ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > closes every watcher when watched agent directories disappear [36.02ms]
@bryance/orch test: 
@bryance/orch test: test\store-instants.test.ts:
@bryance/orch test: (pass) epoch-millisecond store instants > agents order numerically by their creation instant, never lexically [88.47ms]
@bryance/orch test: (pass) epoch-millisecond store instants > all time-named columns use integer declarations [0.86ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > an RPC subscriber receives a presence transition [361.03ms]
@bryance/orch test: 
@bryance/orch test: test\self-actor-identity.test.ts:
@bryance/orch test: (pass) a driving session's write-actor is the agent orch registered for it > the session token resolves to the id hello minted, so the actor equals its own lease holder [326.33ms]
@bryance/orch test: 
@bryance/orch test: test\store-interval-rows.test.ts:
@bryance/orch test: (pass) interval satellites > only one open interval is allowed [302.82ms]
@bryance/orch test: 
@bryance/orch test: test\no-daemon-commands.test.ts:
@bryance/orch test: (pass) commands that need no daemon need no identity > orch version registers no agent and starts no daemon [383.39ms]
@bryance/orch test: (pass) commands that need no daemon need no identity > orch status --offline registers no agent and starts no daemon [679.78ms]
@bryance/orch test: (pass) commands that need no daemon need no identity > orch doctor registers no agent and starts no daemon [9048.59ms]
@bryance/orch test: (pass) commands that need no daemon need no identity > help works before setup has ever run, which is when it is needed most [269.61ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > a dispatched transition writes the full run row and preserves untruncated result [198.58ms]
@bryance/orch test: 
@bryance/orch test: test\no-placement-row-over-the-composed-view.test.ts:
@bryance/orch test: (pass) no Placement row is reassembled over the composed view (2.1) > there is no second lookup module projecting the environment into a flat row [0.58ms]
@bryance/orch test: 
@bryance/orch test: test\self-actor-identity.test.ts:
@bryance/orch test: (pass) a driving session's write-actor is the agent orch registered for it > a token orch has never seen resolves to nothing rather than a fabricated id [83.47ms]
@bryance/orch test: (pass) a driving session's write-actor is the agent orch registered for it > one session keeps ONE id across calls, whatever pid the shell reports [140.95ms]
@bryance/orch test: 
@bryance/orch test: test\space-walls.test.ts:
@bryance/orch test: (pass) space helpers > reads space ids from the environment satellite, never from the key [5.06ms]
@bryance/orch test: 
@bryance/orch test: test\session-env.test.ts:
@bryance/orch test: (pass) shim environment > allows the launch environment variable [0.66ms]
@bryance/orch test: 
@bryance/orch test: test\space-walls.test.ts:
@bryance/orch test: (pass) space helpers > an agent that moves space keeps its identity and reports the new space [17.54ms]
@bryance/orch test: (pass) space helpers > derives an entity space from the store [2.37ms]
@bryance/orch test: (pass) space helpers > returns the same entities when all spaces are requested [0.66ms]
@bryance/orch test: (pass) space wall writes > allows a write within the same space [3.17ms]
@bryance/orch test: (pass) space wall writes > denies a cross-space write with both spaces in the reason [2.17ms]
@bryance/orch test: (pass) space wall writes > applies the same wall rule whatever plexer the agents sit in [9.01ms]
@bryance/orch test: (pass) space wall writes > allows a cross-space write with an explicit override [1.54ms]
@bryance/orch test: (pass) space wall writes > allows unplaced targets [0.93ms]
@bryance/orch test: 
@bryance/orch test: test\close-authority.test.ts:
@bryance/orch test: (pass) who may end an agent (D7) > an orch may close the slaves it owns, at any depth [189.46ms]
@bryance/orch test: (pass) who may end an agent (D7) > an agent may NOT close another orch's slaves, and is told whose it is [179.69ms]
@bryance/orch test: (pass) who may end an agent (D7) > an agent may not close a peer orch either [130.61ms]
@bryance/orch test: (pass) who may end an agent (D7) > an agent may always close itself ΓÇö acting on yourself is not driving a fleet [334.11ms]
@bryance/orch test: (pass) who may end an agent (D7) > the LEASE never decides it: a foreign holder does not block the owner [195.39ms]
@bryance/orch test: (pass) who may end an agent (D7) > a provenance cycle terminates instead of hanging [174.46ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > repeated transitions upsert one run and only terminal states set finishedAt [158.88ms]
@bryance/orch test: 
@bryance/orch test: test\session.test.ts:
@bryance/orch test: (pass) parseSession > returns an empty view for null and missing paths [0.29ms]
@bryance/orch test: (pass) parseSession > handles model, thinking, user, assistant, tool, and unknown entries [15.47ms]
@bryance/orch test: (pass) parseSession > joins text blocks and ignores non-text blocks [13.67ms]
@bryance/orch test: 
@bryance/orch test: test\no-placement-row-over-the-composed-view.test.ts:
@bryance/orch test: (pass) no Placement row is reassembled over the composed view (2.1) > the space wall reads the OPEN space interval, so a moved agent is walled by where it IS [163.92ms]
@bryance/orch test: (pass) no Placement row is reassembled over the composed view (2.1) > a string that names no registered agent is in no space rather than an error [49.76ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > a status without a dispatch id does not write history [79.60ms]
@bryance/orch test: 
@bryance/orch test: test\build-bin.test.ts:
@bryance/orch test: (pass) build entrypoint > always stamps a node shebang and executable mode [56.49ms]
@bryance/orch test: (pass) the installed CLI is the packaged build, never live source (K2) > the `orch` bin points at the packaged entrypoint, not bin/orch.ts [0.05ms]
@bryance/orch test: (pass) the installed CLI is the packaged build, never live source (K2) > the packaged entrypoint is built for node, from the source entrypoint [0.03ms]
@bryance/orch test: (pass) the installed CLI is the packaged build, never live source (K2) > a global install cannot happen without a build in front of it [0.14ms]
@bryance/orch test: (pass) the installed CLI is the packaged build, never live source (K2) > the package ships dist/, so what is installed is what was built [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\no-sibling-relay.test.ts:
@bryance/orch test: (pass) a worker with no reachable spawner does not relay (L6) > an unset spawner refuses, and the refusal names the agent's own report path [14.62ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > a throwing history write does not stop event delivery [199.15ms]
@bryance/orch test: 
@bryance/orch test: test\no-sibling-relay.test.ts:
@bryance/orch test: (pass) a worker with no reachable spawner does not relay (L6) > the refusal never suggests another agent as an alternative route [24.18ms]
@bryance/orch test: (pass) a worker with no reachable spawner does not relay (L6) > a spawner that is stamped but has no inbox refuses by NAME and still says to report [7.35ms]
@bryance/orch test: 
@bryance/orch test: test\caller-kind.test.ts:
@bryance/orch test: (pass) caller kind > id + recorded token is agent [149.32ms]
@bryance/orch test: 
@bryance/orch test: test\no-stderr-writes.test.ts:
@bryance/orch test: (pass) orch has one diagnosis channel (the logger) and one output channel (stdout) > no runtime source writes to process.stderr [109.09ms]
@bryance/orch test: (pass) orch has one diagnosis channel (the logger) and one output channel (stdout) > the scan actually covers the tree it claims to [5.49ms]
@bryance/orch test: 
@bryance/orch test: test\close-is-keyed-by-agent-id.test.ts:
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > an agent whose pane is gone is never handed to the plexer as a pane [226.18ms]
@bryance/orch test: 
@bryance/orch test: test\clean-worktrees.test.ts:
@bryance/orch test: Preparing worktree (new branch 'orch/discard')
@bryance/orch test: (pass) clean worktrees > --force discards an unmerged orphan and its branch [4121.41ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-identity.test.ts:
@bryance/orch test: (pass) one key per pane spawn (12.1) > identity is an opaque minted id ΓÇö never the name, never the pane handle [264.69ms]
@bryance/orch test: 
@bryance/orch test: test\notifier-adapters.test.ts:
@bryance/orch test: (pass) notifier registry and built-in adapters > reports notifier reachability from one configured entry [1.02ms]
@bryance/orch test: (pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [2.61ms]
@bryance/orch test: (pass) notifier registry and built-in adapters > a notifier error is the caller's real error [0.29ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc-identity.test.ts:
@bryance/orch test: (pass) daemon identity RPCs > claim-identity stamps a minted id [1538.13ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > emitted events carry the pack capacity at publish time [156.40ms]
@bryance/orch test: (pass) daemon presence events > a flapping status file cannot storm the stream with repeat transitions [0.24ms]
@bryance/orch test: (pass) daemon presence events > a genuine repeat of the same transition for new work still publishes [0.16ms]
@bryance/orch test: (pass) daemon presence events > a repeat transition publishes again once the suppression window passes [0.10ms]
@bryance/orch test: (pass) daemon presence events > repeated observations cannot slide the suppression window forever [0.08ms]
@bryance/orch test: (pass) daemon presence events > a working-to-done repeat after the dedupe window is emitted [0.13ms]
@bryance/orch test: (pass) daemon presence events > presence transitions resolve the human name before emission [1.14ms]
@bryance/orch test: (pass) daemon presence events > presence transitions use the normalized agent name after rename [152.63ms]
@bryance/orch test: (pass) daemon presence events > derivePresenceTransition preserves the complete asking transition payload [2.33ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-herdr-headless.test.ts:
@bryance/orch test: (pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [1.78ms]
@bryance/orch test: 
@bryance/orch test: test\caller-kind.test.ts:
@bryance/orch test: (pass) caller kind > id + other token is human [161.74ms]
@bryance/orch test: (pass) caller kind > id + no token is human [129.22ms]
@bryance/orch test: (pass) caller kind > no id is human [1.45ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > an asking transition drives command sink delivery [148.96ms]
@bryance/orch test: 
@bryance/orch test: test\commands-models.test.ts:
@bryance/orch test: (pass) orch models lists the whole catalogue > shows every offered model, quicklisted or not, allowed or not [0.50ms]
@bryance/orch test: 
@bryance/orch test: test\command-refusal.test.ts:
@bryance/orch test: (pass) a command refusal is thrown, not exited > an unresolvable target throws a CommandRefusal instead of killing the process [97.02ms]
@bryance/orch test: 
@bryance/orch test: test\commands-models.test.ts:
@bryance/orch test: (pass) orch models lists the whole catalogue > marks the launch default (thinking suffix removed) and the quicklist members [0.13ms]
@bryance/orch test: (pass) orch models lists the whole catalogue > keeps harness sections in configured order [0.05ms]
@bryance/orch test: (pass) orch models lists the whole catalogue > a harness that enumerates nothing gets an empty section, not another's models [0.11ms]
@bryance/orch test: (pass) orch models filters > --preferred narrows to the quicklist and renumbers what is shown [0.05ms]
@bryance/orch test: (pass) orch models filters > --search matches spec and label case-insensitively [0.09ms]
@bryance/orch test: (pass) orch models filters > filters combine, and no match is an empty result rather than the full list [0.05ms]
@bryance/orch test: (pass) orch models --pick prints one spec > a numeric pick reads the displayed index of a single harness [0.11ms]
@bryance/orch test: (pass) orch models --pick prints one spec > an exact spec pick resolves after filtering [0.04ms]
@bryance/orch test: (pass) orch models --pick prints one spec > ambiguous, missing, zero, and out-of-range picks fail [0.63ms]
@bryance/orch test: (pass) orch models --json > emits the pinned harness/model shape [1.02ms]
@bryance/orch test: 
@bryance/orch test: test\commands-panes.test.ts:
@bryance/orch test: (pass) commands/panes > pane identity is the minted id alone [0.95ms]
@bryance/orch test: (pass) commands/panes > a plexer-and-space key is not an identity [0.23ms]
@bryance/orch test: (pass) commands/panes > exports the pane listing command directly [0.04ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-herdr-headless.test.ts:
@bryance/orch test: (pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.34ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.45ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.31ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.46ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.25ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [64.43ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [0.19ms]
@bryance/orch test: (pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [232.95ms]
@bryance/orch test: (pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [1.30ms]
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
@bryance/orch test:   x         next                 Execute a package binary (CLI), installing if needed (bunx)
@bryance/orch test:   repl                           Start a REPL session with Bun
@bryance/orch test:   exec                           Run a shell script directly with Bun
@bryance/orch test: 
@bryance/orch test:   install                        Install dependencies for a package.json (bun i)
@bryance/orch test:   add       @zarfjs/zarf         Add a dependency to package.json (bun a)
@bryance/orch test:   remove    is-array             Remove a dependency from package.json (bun rm)
@bryance/orch test:   update    zod                  Update outdated dependencies
@bryance/orch test:   audit                          Check installed packages for vulnerabilities
@bryance/orch test:   dedupe                         Remove duplicate versions from the lockfile
@bryance/orch test:   prune                          Remove packages that are not in the lockfile from node_modules
@bryance/orch test:   outdated                       Display latest versions of outdated dependencies
@bryance/orch test:   link      [<package>]          Register or link a local npm package
@bryance/orch test:   unlink                         Unregister a local npm package
@bryance/orch test:   publish                        Publish a package to the npm registry
@bryance/orch test:   patch <pkg>                    Prepare a package for patching
@bryance/orch test:   pm <subcommand>                Additional package management utilities
@bryance/orch test:   info      tailwindcss          Display package metadata from the registry
@bryance/orch test:   why       elysia               Explain why a package is installed
@bryance/orch test: 
@bryance/orch test:   build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file
@bryance/orch test: 
@bryance/orch test:   init                           Start an empty Bun project from a built-in template
@bryance/orch test:   create    astro                Create a new project from a template (bun c)
@bryance/orch test:   upgrade                        Upgrade to latest version of Bun.
@bryance/orch test: 
@bryance/orch test:   <command> --help               Print help text for command.
@bryance/orch test: 
@bryance/orch test: Learn more about Bun:            https://bun.com/docs
@bryance/orch test: Join our Discord community:      https://bun.com/discord
@bryance/orch test: (pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [2687.87ms]
@bryance/orch test: (pass) daemon lifecycle > reclaims an unreadable lock, which a crash truncated and no daemon owns [4251.98ms]
@bryance/orch test: (pass) daemon lifecycle > refuses an unreadable lock while the socket still answers [1036.21ms]
@bryance/orch test: (pass) daemon lifecycle > clears the lock, socket and port a departed daemon owned, keeping the log [5.07ms]
@bryance/orch test: (pass) daemon lifecycle > refuses a stale lock when the socket probe cannot answer [1135.98ms]
@bryance/orch test: (pass) daemon lifecycle > retries if a stale lock disappears during reclaim [1068.66ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-idle.test.ts:
@bryance/orch test: (pass) orchd idle shutdown rule > a zero setting disables idle shutdown entirely [0.36ms]
@bryance/orch test: (pass) orchd idle shutdown rule > a live agent holds the daemon open however long it has been quiet [0.10ms]
@bryance/orch test: (pass) orchd idle shutdown rule > an event subscriber holds the daemon open [0.06ms]
@bryance/orch test: (pass) orchd idle shutdown rule > recent activity holds the daemon open below the threshold [0.02ms]
@bryance/orch test: (pass) orchd idle shutdown rule > a fully idle daemon past the threshold is due to exit [0.01ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-runtime.test.ts:
@bryance/orch test: (pass) shebangRuntime > reads #!/usr/bin/env node as node [15.06ms]
@bryance/orch test: 
@bryance/orch test: test\reset-build-safety.test.ts:
@bryance/orch test: (pass) build reset safety > --build dry-run never names a path inside ORCH_DIR [4399.23ms]
@bryance/orch test: 
@bryance/orch test: test\lock-holder.test.ts:
@bryance/orch test: (pass) command lock holder > uses the registered agent id [56.41ms]
@bryance/orch test: (pass) command lock holder > uses the process user fallback when unregistered [1.99ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-lifecycle.test.ts:
@bryance/orch test: (pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [401.39ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-runtime.test.ts:
@bryance/orch test: (pass) shebangRuntime > reads #!/usr/bin/env bun as bun [12.54ms]
@bryance/orch test: (pass) shebangRuntime > reads #!/usr/bin/env deno as deno [15.99ms]
@bryance/orch test: (pass) shebangRuntime > reads #!/usr/local/bin/node as node [3.82ms]
@bryance/orch test: (pass) shebangRuntime > does not mistake a longer binary name for a runtime [4.09ms]
@bryance/orch test: (pass) shebangRuntime > returns null for a file with no shebang [20.34ms]
@bryance/orch test: (pass) shebangRuntime > returns null for an unreadable path [1.12ms]
@bryance/orch test: (pass) runningRuntime > reports the runtime this suite is executing under [0.13ms]
@bryance/orch test: (pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [22.99ms]
@bryance/orch test: (pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [4.95ms]
@bryance/orch test: (pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [13.59ms]
@bryance/orch test: (pass) doctor runtime verdict table > launching under bun while declaring node is fine [4.01ms]
@bryance/orch test: (pass) doctor runtime verdict table > launching under node while declaring bun is fine [4.45ms]
@bryance/orch test: (pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [4.50ms]
@bryance/orch test: (pass) doctor runtime verdict table > declared runtime absent from PATH fails [5.12ms]
@bryance/orch test: (pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [8.70ms]
@bryance/orch test: (pass) doctor runtime verdict table > remediation names both directions ΓÇö rebuild, or re-record the declaration [4.57ms]
@bryance/orch test: (pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [1.50ms]
@bryance/orch test: 
@bryance/orch test: test\log-level.test.ts:
@bryance/orch test: (pass) the configured log level reaches every logger > the env var wins over settings.json [4.02ms]
@bryance/orch test: 
@bryance/orch test: test\close-is-keyed-by-agent-id.test.ts:
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > an agent whose pane is gone still ends, and reports done [247.84ms]
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > what a human is told they closed is the agent, not the plexer's coordinate [217.04ms]
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > the --json closed list names agents, so a caller can map it back [237.73ms]
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > the plexer is still handed the real handle when there IS a pane [185.05ms]
@bryance/orch test: 
@bryance/orch test: test\log-level.test.ts:
@bryance/orch test: (pass) the configured log level reaches every logger > settings.json is used when the env var is unset [6.28ms]
@bryance/orch test: (pass) the configured log level reaches every logger > an unrecognised env value falls back to the configured level [4.24ms]
@bryance/orch test: (pass) the configured log level reaches every logger > the CLI logger honours the configured level [19.91ms]
@bryance/orch test: (pass) the configured log level reaches every logger > the CLI logger drops records below the configured level [4.31ms]
@bryance/orch test: (pass) the configured log level reaches every logger > the daemon logger resolves through the same helper [29.43ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-settings-defects.test.ts:
@bryance/orch test: (pass) doctor settings defects > accepts an absent settings file [3.74ms]
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
@bryance/orch test: (pass) fleet ownership scoping > owner token uses ORCH_OWNER, else this process's own minted id [2.29ms]
@bryance/orch test: (pass) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [109.26ms]
@bryance/orch test: (pass) fleet ownership scoping > close --all works without an owner token [862.54ms]
@bryance/orch test: (pass) fleet ownership scoping > close --all closes all managed records regardless of owner [264.20ms]
@bryance/orch test: 
@bryance/orch test: test\store-interval-rows.test.ts:
@bryance/orch test: (pass) interval satellites > half-open adjacency is legal [153.89ms]
@bryance/orch test: (pass) interval satellites > clearSpace closes without opening [134.34ms]
@bryance/orch test: (pass) interval satellites > agent plexer is immutable one-shot [83.65ms]
@bryance/orch test: (pass) interval satellites > process restart history closes at the successor since [73.37ms]
@bryance/orch test: (pass) interval satellites > process rows carry host and process identity [71.21ms]
@bryance/orch test: (pass) interval satellites > nullable process start_token round-trips as null [89.33ms]
@bryance/orch test: (pass) interval satellites > space move history closes at the successor since [216.89ms]
@bryance/orch test: (pass) interval satellites > tuning change history closes at the successor since [164.40ms]
@bryance/orch test: (pass) interval satellites > handle history preserves each renumbered handle [130.59ms]
@bryance/orch test: (pass) interval satellites > interval instants are stored as INTEGER values [202.91ms]
@bryance/orch test: (pass) interval satellites > process wrapper rolls back predecessor close when successor fails [134.43ms]
@bryance/orch test: (pass) interval satellites > space wrapper rolls back predecessor close when successor fails [139.97ms]
@bryance/orch test: (pass) interval satellites > tuning carries model and nullable thinking [103.31ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-identity.test.ts:
@bryance/orch test: (pass) one key per pane spawn (12.1) > a name freed by a dead agent is reusable, and the two agents differ in identity [227.69ms]
@bryance/orch test: (pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [228.46ms]
@bryance/orch test: (pass) A1: spawn registration records the space as an environment axis > a spawn into a space writes agent_spaces, and the composer reads it back [194.36ms]
@bryance/orch test: (pass) A1: spawn registration records the space as an environment axis > a spawn stating no space records NO ROW ΓÇö a missing axis is a missing row [128.74ms]
@bryance/orch test: (pass) A1: spawn registration records the space as an environment axis > moving an agent to another space closes the old interval and keeps its identity [142.33ms]
@bryance/orch test: 
@bryance/orch test: test\retention.test.ts:
@bryance/orch test: (pass) retention sweep > retention windows are independently configurable [114.93ms]
@bryance/orch test: 
@bryance/orch test: test\command-refusal.test.ts:
@bryance/orch test: (pass) a command refusal is thrown, not exited > the refusal carries the reason a human needs [177.44ms]
@bryance/orch test: (pass) a command refusal is thrown, not exited > the CLI boundary turns a refusal into exit 1 with the message on stdout [544.21ms]
@bryance/orch test: 
@bryance/orch test: test\settings-notify.test.ts:
@bryance/orch test: (pass) orch settings notify > records a sink with the field that sink declares [48.93ms]
@bryance/orch test: 
@bryance/orch test: test\store-lease-rows.test.ts:
@bryance/orch test: (pass) agent lease rows > fencing ids are monotonic across agents and never reused after reap [143.82ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-herdr-headless.test.ts:
@bryance/orch test: (pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [697.38ms]
@bryance/orch test: (pass) headless common path: identity key -> presence > one adapter uses the same opaque key across headless and tmux routes [1.70ms]
@bryance/orch test: (pass) headless common path: identity key -> presence > a key carries no environment to read back out of it [0.19ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-tmux.test.ts:
@bryance/orch test: (pass) tmux backend registry and capabilities > is registered [0.23ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-limits.test.ts:
@bryance/orch test: (pass) spawn limits > schema loads global and workspace caps [35.24ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-tmux.test.ts:
@bryance/orch test: (pass) tmux backend registry and capabilities > explicit selection follows tmux availability [33.99ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > exposes pane roles [0.43ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > reflects the TMUX environment [0.22ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > a tmux agent's key is the minted id, never its pane [0.33ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [25.64ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [0.93ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [0.21ms]
@bryance/orch test: 
@bryance/orch test: test\backend-process-role.test.ts:
@bryance/orch test: (pass) ProcessRole > headless provider records pid and start token and safely kills it [3082.42ms]
@bryance/orch test: 
@bryance/orch test: test\close-reports-every-target.test.ts:
@bryance/orch test: (pass) close reports an outcome for every target it was given (U2) > --json carries a per-target outcome, not just the successes [286.39ms]
@bryance/orch test: 
@bryance/orch test: test\command-space-fields.test.ts:
@bryance/orch test: (pass) command space fields > status and wall entities use the composed space, and it is nowhere in the key [1050.41ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-tmux.test.ts:
@bryance/orch test: (pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-space [1210.76ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc-identity.test.ts:
@bryance/orch test: (pass) daemon identity RPCs > claim-identity refuses an unknown id by naming it [2509.39ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lease.test.ts:
@bryance/orch test: {"outcome":"answer","reason":"no-environment-role","text":"this pane environment does not provide abort"}
@bryance/orch test: {"closed":["5qm034hkxq"],"results":[{"target":"5qm034hkxq","handle":"close-handle","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
@bryance/orch test: {"target":"j3qqdf3fu2","name":"reap-worker","reaped":true}
@bryance/orch test: (pass) lease commands > a LIVE foreign holder still excludes everyone else [2429.39ms]
@bryance/orch test: (pass) lease commands > adopt takes an unleased agent and a dead holder [136.34ms]
@bryance/orch test: (pass) lease commands > adopt refuses a holder with a live recorded process [2258.53ms]
@bryance/orch test: (pass) lease commands > reap refuses when a live descendant exists, regardless of lease [186.25ms]
@bryance/orch test: (pass) lease commands > reap refuses while the recorded process is alive [2547.27ms]
@bryance/orch test: (pass) lease commands > reap is never lease-gated and removes the record and presence [175.27ms]
@bryance/orch test: (pass) lease commands > abort proceeds with a foreign live-holder lease [1441.47ms]
@bryance/orch test: (pass) lease commands > close proceeds with a foreign live-holder lease [1278.87ms]
@bryance/orch test: (pass) lease commands > reap proceeds with a foreign live-holder lease [1476.82ms]
@bryance/orch test: (pass) lease commands > reset driving verb refuses a foreign live-holder lease [3034.72ms]
@bryance/orch test: 
@bryance/orch test: test\cmd-lock-serialize.test.ts:
@bryance/orch test: (pass) command lock serialization > does not evict a lock held by a live foreign process [6955.03ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lifecycle.test.ts:
@bryance/orch test: (pass) commands/lifecycle > capability helpers fail closed when absent [0.77ms]
@bryance/orch test: 
@bryance/orch test: test\peer-lease-visibility.test.ts:
@bryance/orch test: (pass) peer summaries carry ownership as a lease > a peer nobody ever took reports no orch driving it [1651.62ms]
@bryance/orch test: (pass) peer summaries carry ownership as a lease > a dead holder is not a live one [1227.86ms]
@bryance/orch test: (pass) the compact listing separates orphans from live work > unleased peers sit in their own bucket, below the driven ones [2538.30ms]
@bryance/orch test: (pass) the compact listing separates orphans from live work > a held peer names its holder, and an unleased one never reads as yours [2118.42ms]
@bryance/orch test: (pass) the compact listing separates orphans from live work > with nothing unleased the bucket does not appear at all [3377.76ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lifecycle.test.ts:
@bryance/orch test: (pass) commands/lifecycle > reports missing bridge pid without touching backend [0.10ms]
@bryance/orch test: (pass) commands/lifecycle > --all targets the agents this orch holds a live lease on, and drops them when it releases [940.52ms]
@bryance/orch test: 
@bryance/orch test: test\command-space-fields.test.ts:
@bryance/orch test: (pass) command space fields > skipBackends keeps the authoritative presence entity shape [1158.06ms]
@bryance/orch test: (pass) command space fields > status reports a mixed pi and Claude fleet with the same identity fields [1138.40ms]
@bryance/orch test: 
@bryance/orch test: test\doctor.test.ts:
@bryance/orch test: (pass) runDoctor > detects DrvFs paths by mount path segment [0.27ms]
@bryance/orch test: 
@bryance/orch test: test\cmd-lock-serialize.test.ts:
@bryance/orch test: (pass) command lock serialization > release refuses a different process instance token [1538.20ms]
@bryance/orch test: 
@bryance/orch test: test\peer-project-scope.test.ts:
@bryance/orch test: (pass) peer discovery walls on the project > a same-workspace peer from another project is invisible by default [988.70ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-declared-vs-reality.test.ts:
@bryance/orch test: (pass) doctor declared-vs-reality > reports a lease whose recorded holder process is dead [214.05ms]
@bryance/orch test: (pass) doctor declared-vs-reality > reports an environment handle missing from its plexer [172.50ms]
@bryance/orch test: (pass) doctor declared-vs-reality > reports a live agent with no lease and no live spawner [211.42ms]
@bryance/orch test: (pass) doctor declared-vs-reality > surfaces a missing task scope row as unrunnable [8184.88ms]
@bryance/orch test: (pass) doctor declared-vs-reality > doctor -y does not delete an unrunnable task [7627.78ms]
@bryance/orch test: 
@bryance/orch test: test\peer-project-scope.test.ts:
@bryance/orch test: (pass) peer discovery walls on the project > all_workspaces deliberately lifts the project wall [15.87ms]
@bryance/orch test: (pass) peer discovery walls on the project > a cross-project target does not resolve for sends without the explicit flag [6.00ms]
@bryance/orch test: (pass) peer discovery walls on the project > a record with no project stamp is malformed and never listed [13.11ms]
@bryance/orch test: (pass) peer discovery walls on the project > a spawned agent's all_workspaces flag is ignored [93.50ms]
@bryance/orch test: 
@bryance/orch test: test\close-reports-every-target.test.ts:
@bryance/orch test: (pass) close reports an outcome for every target it was given (U2) > a failed target reports outcome error WITH the real error text [1042.15ms]
@bryance/orch test: (pass) close reports an outcome for every target it was given (U2) > a pane the plexer no longer has is CLOSED, not failed [1768.28ms]
@bryance/orch test: (pass) close reports an outcome for every target it was given (U2) > the exit code still reflects whether every target closed [976.78ms]
@bryance/orch test: 
@bryance/orch test: test\settings-notify.test.ts:
@bryance/orch test: (pass) orch settings notify > re-adding one sink replaces it in place and keeps the fields the call omits [169.65ms]
@bryance/orch test: (pass) orch settings notify > accepts asking as a first-class sink state [39.97ms]
@bryance/orch test: (pass) orch settings notify > remove drops only the named sink [1016.33ms]
@bryance/orch test: (pass) orch settings notify > list reports each sink with the states it fires on, defaults included [1117.32ms]
@bryance/orch test: (pass) orch settings notify > an empty notify array lists as none configured [881.26ms]
@bryance/orch test: (pass) orch settings notify > the notify row lists every sink, the states it may fire on, and the fields each carries [769.89ms]
@bryance/orch test: (pass) orch settings notify > the notify row writes the picked sinks, states included, and drops the ones left off [27.68ms]
@bryance/orch test: (pass) orch settings notify > the notify row refuses an unknown sink, a carrying sink with nothing to carry, and an unknown state [2.78ms]
@bryance/orch test: 
@bryance/orch test: test\peer-tools-registration.test.ts:
@bryance/orch test: (pass) peer tool registration > does not register orch_send when no spawner address exists [8.77ms]
@bryance/orch test: (pass) peer tool registration > does not register orch_send when the spawner pid is dead [29.46ms]
@bryance/orch test: (pass) peer tool registration > registers orch_send when the spawner has live presence and an inbox [19.43ms]
@bryance/orch test: 
@bryance/orch test: test\pi-model-control.test.ts:
@bryance/orch test: (pass) splitThinkingSuffix > splits a valid ladder effort off the bare id [0.08ms]
@bryance/orch test: (pass) splitThinkingSuffix > leaves a bare model untouched [0.03ms]
@bryance/orch test: (pass) splitThinkingSuffix > keeps a trailing colon token that is not a thinking level as part of the id [0.02ms]
@bryance/orch test: (pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > looks up the BARE id and returns the effort suffix separately [0.62ms]
@bryance/orch test: (pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > retries until a still-booting registry answers [3.44ms]
@bryance/orch test: (pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > throws when the registry never yields the model [0.21ms]
@bryance/orch test: (pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > rejects a token without a provider/id shape [0.07ms]
@bryance/orch test: (pass) createModelControl.applyControlCommand > applies a suffixed model command and records a success outcome [0.66ms]
@bryance/orch test: 
@bryance/orch test: test\settings-precedence.test.ts:
@bryance/orch test: (pass) settings precedence > returns a defaults value when no override is set [20.73ms]
@bryance/orch test: 
@bryance/orch test: test\commands-logging.test.ts:
@bryance/orch test: (pass) orch logs > --dispatch selects one dispatch across both sinks, oldest first [997.76ms]
@bryance/orch test: 
@bryance/orch test: test\settings-precedence.test.ts:
@bryance/orch test: (pass) settings precedence > applies defaults when settings, env, and flag are absent [5.79ms]
@bryance/orch test: (pass) settings precedence > uses env over settings and flag over env [14.49ms]
@bryance/orch test: (pass) settings precedence > parses notify entries and hosts into expected shapes [16.09ms]
@bryance/orch test: (pass) settings precedence > reports a helpful validation error for invalid settings [13.84ms]
@bryance/orch test: 
@bryance/orch test: test\close-always.test.ts:
@bryance/orch test: {"closed":["panename01","panekey001","paneid0001"],"results":[{"target":"panename01","handle":"pane-name","outcome":"done","error":null},{"target":"panekey001","handle":"pane-key","outcome":"done","error":null},{"target":"paneid0001","handle":"pane-id","outcome":"done","error":null}],"requested":3,"ok":3,"stream":false}
@bryance/orch test: (pass) close always works > closes a foreign-space target by name, key, or pane id [2720.99ms]
@bryance/orch test: 
@bryance/orch test: test\backend-tmux.test.ts:
@bryance/orch test: (pass) TmuxBackend > current identity uses the explicit id, not the launch environment [2.35ms]
@bryance/orch test: 
@bryance/orch test: test\commands-logging.test.ts:
@bryance/orch test: (pass) orch logs > --agent selects one agent's records [25.81ms]
@bryance/orch test: (pass) orch logs > --level selects one severity [8.90ms]
@bryance/orch test: (pass) orch logs > --since drops everything older than the instant given [12.35ms]
@bryance/orch test: (pass) orch logs > --since 0 keeps every record instead of being read as a missing value [9.56ms]
@bryance/orch test: (pass) orch logs > renders a readable line: instant, level, event, correlation, agent, fields [13.69ms]
@bryance/orch test: (pass) orch logs > --json emits the records themselves [6.26ms]
@bryance/orch test: (pass) command logging > notify test records the diagnosis and keeps user output on stdout [72.15ms]
@bryance/orch test: 
@bryance/orch test: test\dispatch-correlation.test.ts:
@bryance/orch test: (pass) dispatch correlation > one dispatch id produces the whole life of that dispatch [12405.91ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-backends.test.ts:
@bryance/orch test: (pass) doctor backend and presence checks > reports every registered backend and composed roles [25.27ms]
@bryance/orch test: (pass) doctor backend and presence checks > passes with herdr active while an enabled tmux sits outside a session [0.09ms]
@bryance/orch test: (pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.05ms]
@bryance/orch test: (pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [0.05ms]
@bryance/orch test: (pass) doctor backend and presence checks > fails when any enabled backend is unavailable, active or not [0.04ms]
@bryance/orch test: (pass) doctor backend and presence checks > honours the configured default over the probe order [0.03ms]
@bryance/orch test: (pass) doctor backend and presence checks > reports only records missing the current schema stamp [15.38ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-checks.test.ts:
@bryance/orch test: (pass) doctor provenance-depth checks > finds a live agent deeper than fleet.max_depth [144.11ms]
@bryance/orch test: 
@bryance/orch test: test\retention.test.ts:
@bryance/orch test: (pass) retention sweep > uses each table's own window and keeps queued and claimed tasks [246.21ms]
@bryance/orch test: (pass) retention sweep > returns zero counts when every row is inside its window [1325.60ms]
@bryance/orch test: (pass) retention sweep > continues sweeping when one table delete fails [1032.68ms]
@bryance/orch test: (pass) retention sweep > reaps expired agents by identity, taking every satellite with them [1065.98ms]
@bryance/orch test: (pass) retention sweep > reaps dead dirs by recorded instants, not a fresh directory mtime [894.06ms]
@bryance/orch test: (pass) retention sweep > keeps dead dirs with a newer recorded instant despite an old mtime [84.99ms]
@bryance/orch test: (pass) retention sweep > reaps malformed dead dirs with no recorded instant [113.50ms]
@bryance/orch test: (pass) retention sweep > keeps result-only recorded instant despite an old mtime [103.09ms]
@bryance/orch test: (pass) retention sweep > never reaps a live presence dir regardless of age [83.46ms]
@bryance/orch test: (pass) retention sweep > sweeps old logs but preserves logs for live agents [78.36ms]
@bryance/orch test: 
@bryance/orch test: test\store-lease-rows.test.ts:
@bryance/orch test: (pass) agent lease rows > a second open lease is rejected [117.75ms]
@bryance/orch test: (pass) agent lease rows > release and expiry close rows with matching reason and exact until [1277.10ms]
@bryance/orch test: (pass) agent lease rows > handoff closes current and inserts a newer row without changing prior facts [1255.57ms]
@bryance/orch test: (pass) agent lease rows > adoption closes prior and inserts a strictly newer adopter row [998.37ms]
@bryance/orch test: (pass) agent lease rows > adoption with no open lease is plain acquire and leaves closed history untouched [829.61ms]
@bryance/orch test: (pass) agent lease rows > handoff rolls back close when successor insert fails [89.75ms]
@bryance/orch test: (pass) agent lease rows > wrong-holder release and handoff are rejected [146.79ms]
@bryance/orch test: (pass) agent lease rows > an agent cannot lease itself [93.10ms]
@bryance/orch test: (pass) agent lease rows > expiry inserts nothing new [115.96ms]
@bryance/orch test: (pass) agent lease rows > reads return only open rows [139.99ms]
@bryance/orch test: 
@bryance/orch test: test\retention.test.ts:
@bryance/orch test: (pass) retention sweep > does not sweep again one minute after the first tick [180.30ms]
@bryance/orch test: 
@bryance/orch test: test\broker-routing.test.ts:
@bryance/orch test: (pass) broker CLI routing > status --offline reads seeded presence files without a daemon [667.25ms]
@bryance/orch test: 
@bryance/orch test: test\store-outbox.test.ts:
@bryance/orch test: (pass) outbox store rows > inserts pending messages and orders them by creation time [115.25ms]
@bryance/orch test: 
@bryance/orch test: test\retention.test.ts:
@bryance/orch test: (pass) retention sweep > prunes orch's own logs past the age cap [68.05ms]
@bryance/orch test: (pass) retention sweep > prunes orch's own logs past the size cap even when freshly written [90.93ms]
@bryance/orch test: 
@bryance/orch test: test\lifecycle-targets.test.ts:
@bryance/orch test: (pass) lifecycle target resolution > prefers one live agent over dead ones sharing its name [0.41ms]
@bryance/orch test: (pass) lifecycle target resolution > reports the target and disambiguating ids for live ambiguity [0.52ms]
@bryance/orch test: (pass) lifecycle target resolution > cleanup can still resolve a dead agent when no live match exists [0.07ms]
@bryance/orch test: (pass) lifecycle target resolution > an agent is addressable by its id, its name, or its pane handle [0.19ms]
@bryance/orch test: (pass) lifecycle target resolution > the pane is environment: moving it leaves every other address intact [0.13ms]
@bryance/orch test: 
@bryance/orch test: test\backend-process-role.test.ts:
@bryance/orch test: (pass) ProcessRole > herdr provider records pid and start token and safely kills it [2645.99ms]
@bryance/orch test: (pass) ProcessRole > tmux provider records pid and start token and safely kills it [2643.53ms]
@bryance/orch test: (pass) ProcessRole > reports replaced when a pid is reused by a different process token [0.28ms]
@bryance/orch test: 
@bryance/orch test: test\store-outbox.test.ts:
@bryance/orch test: (pass) outbox store rows > reports one message's pending state [76.48ms]
@bryance/orch test: (pass) outbox store rows > bumps attempts and hides a message until its next attempt time [85.25ms]
@bryance/orch test: (pass) outbox store rows > deletes delivered messages older than the cutoff [87.92ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-stale-presence.test.ts:
@bryance/orch test: (pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [8291.57ms]
@bryance/orch test: 
@bryance/orch test: test\settings-editor.test.ts:
@bryance/orch test: (pass) settings editor reducer > moves focus down and up without running off either end [0.33ms]
@bryance/orch test: (pass) settings editor reducer > opens the focused setting for editing [0.04ms]
@bryance/orch test: (pass) settings editor reducer > cancel leaves value unchanged and returns to browsing [0.03ms]
@bryance/orch test: (pass) settings editor reducer > commit updates value and produces a pending write [0.17ms]
@bryance/orch test: (pass) settings editor reducer > refuses invalid values with a reason and stays open [0.05ms]
@bryance/orch test: (pass) settings editor reducer > refuses opening a read-only setting with a reason [0.04ms]
@bryance/orch test: (pass) settings editor reducer > cancelling without a commit yields zero writes [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\backend-space-home.test.ts:
@bryance/orch test: (pass) tmux space home > focus switches the client to the session holding the space [0.41ms]
@bryance/orch test: (pass) tmux space home > create names the session after the space and returns its root pane [0.48ms]
@bryance/orch test: (pass) tmux space home > rename and close address the session coordinate [0.09ms]
@bryance/orch test: (pass) tmux space home > list reports every session as a coordinate with a label [0.12ms]
@bryance/orch test: (pass) a home orch opens is never unmarked (E8) > an unlabelled pack home is named for the pack it was opened for [0.07ms]
@bryance/orch test: (pass) a home orch opens is never unmarked (E8) > an unlabelled space home is named for the space, not for the pack [0.10ms]
@bryance/orch test: (pass) a home orch opens is never unmarked (E8) > a subject id the plexer would refuse is made safe, never passed through [0.04ms]
@bryance/orch test: (pass) a home orch opens is never unmarked (E8) > a caller-supplied label is used verbatim [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc-identity.test.ts:
@bryance/orch test: (pass) daemon identity RPCs > register-session mints one id per session token [4143.53ms]
@bryance/orch test: (pass) daemon identity RPCs > the removed method is unknown [16.45ms]
@bryance/orch test: 
@bryance/orch test: test\cmd-lock.test.ts:
@bryance/orch test: (pass) command lock > acquire and release round-trip [1862.71ms]
@bryance/orch test: 
@bryance/orch test: test\space-policy.test.ts:
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > placing an agent in a space nobody created is refused, not minted [71.68ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc.test.ts:
@bryance/orch test: (pass) daemon RPC > rejects a hello response with a malformed optional field [0.31ms]
@bryance/orch test: 
@bryance/orch test: test\pi-model-control.test.ts:
@bryance/orch test: (pass) createModelControl.applyControlCommand > records a failure outcome when the model is rejected [1778.95ms]
@bryance/orch test: (pass) createModelControl.applyControlCommand > applies a thinking command directly [0.52ms]
@bryance/orch test: 
@bryance/orch test: test\os-executors.test.ts:
@bryance/orch test: (pass) cross-OS execution is a backend, not a peer daemon > an OS side with no executor answers, and never runs the body [0.99ms]
@bryance/orch test: (pass) cross-OS execution is a backend, not a peer daemon > the local side runs the body and hands back its value [0.24ms]
@bryance/orch test: (pass) cross-OS execution is a backend, not a peer daemon > doctor passes a daemon registered on the side orch is running on [6400.20ms]
@bryance/orch test: (pass) cross-OS execution is a backend, not a peer daemon > doctor answers, rather than failing, for a daemon on a side with no executor [2783.80ms]
@bryance/orch test: 
@bryance/orch test: test\os-side.test.ts:
@bryance/orch test: (pass) osSide > supports both platform branches independent of ambient host [0.05ms]
@bryance/orch test: 
@bryance/orch test: test\broker-ownership.test.ts:
@bryance/orch test: (pass) broker ownership and space governance > the composed holder is the only ownership record, and adoption moves it [135.26ms]
@bryance/orch test: 
@bryance/orch test: test\codex-adapter.test.ts:
@bryance/orch test: (pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [5.29ms]
@bryance/orch test: 
@bryance/orch test: test\settings-command.test.ts:
@bryance/orch test: fleet.max_depth = 6
@bryance/orch test: (pass) orch settings > every registered setting is printed in the table [766.11ms]
@bryance/orch test: (pass) orch settings > --json reports value + source per setting, settings.json winning over defaults [370.64ms]
@bryance/orch test: (pass) orch settings > --json reports env as the winning source over settings.json [792.67ms]
@bryance/orch test: (pass) orch settings > --harness switches defaults.adapter between enabled ids and rejects a non-enabled id [2211.16ms]
@bryance/orch test: (pass) orch settings > reports each harness's picker quicklist and launch gate as separate rows [633.09ms]
@bryance/orch test: (pass) orch settings > a load error surfaces loudly with no partial table [447.95ms]
@bryance/orch test: (pass) orch settings > sets a boolean through its registry entry [416.53ms]
@bryance/orch test: (pass) orch settings > sets an integer through its registry entry [474.88ms]
@bryance/orch test: (pass) orch settings > single-setting set delegates to the registry writer [12.89ms]
@bryance/orch test: (pass) orch settings > sets a choice through its registry entry [464.54ms]
@bryance/orch test: (pass) orch settings > sets a multi value through its registry entry [525.54ms]
@bryance/orch test: (pass) orch settings > sets a list value through its registry entry [452.61ms]
@bryance/orch test: (pass) orch settings > refuses an invalid boolean and names the allowed values [677.63ms]
@bryance/orch test: (pass) orch settings > refuses an invalid integer and names the allowed range [1788.42ms]
@bryance/orch test: (pass) orch settings > refuses an invalid choice and names the allowed choices [1250.27ms]
@bryance/orch test: (pass) orch settings > refuses an invalid multi value and names the allowed choices [1572.55ms]
@bryance/orch test: (pass) orch settings > refuses an invalid list and names JSON as the allowed format [458.56ms]
@bryance/orch test: (pass) orch settings > refuses an unknown key and suggests nearest valid keys [505.20ms]
@bryance/orch test: (pass) orch settings > refuses read-only runtime and names the editing subcommand [525.09ms]
@bryance/orch test: 
@bryance/orch test: test\settings-defects.test.ts:
@bryance/orch test: (pass) settingsDefects > returns no defects for an absent file [3.49ms]
@bryance/orch test: 
@bryance/orch test: test\broker-ownership.test.ts:
@bryance/orch test: (pass) broker ownership and space governance > refuses cross-space writes unless explicitly overridden [146.33ms]
@bryance/orch test: (pass) broker ownership and space governance > moving an agent between spaces moves the wall, not its identity [120.39ms]
@bryance/orch test: 
@bryance/orch test: test\codex-adapter.test.ts:
@bryance/orch test: (pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [8.78ms]
@bryance/orch test: (pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [3.98ms]
@bryance/orch test: (pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [15.24ms]
@bryance/orch test: (pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [19.17ms]
@bryance/orch test: (pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [192.84ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-settings-defects.test.ts:
@bryance/orch test: (pass) doctor settings defects > accepts a clean settings file and keeps its path detail [18.26ms]
@bryance/orch test: (pass) doctor settings defects > reports malformed JSON as a file defect [2.10ms]
@bryance/orch test: (pass) doctor settings defects > reports a read failure instead of throwing [1.74ms]
@bryance/orch test: (pass) doctor settings defects > reports a stale key with the value that was written [14.12ms]
@bryance/orch test: (pass) doctor settings defects > reports a typo with its suggested key [11.92ms]
@bryance/orch test: (pass) doctor settings defects > reports the expected schema version [5.99ms]
@bryance/orch test: (pass) doctor settings defects > skips settings-dependent checks with a short repair hint [6543.50ms]
@bryance/orch test: 
@bryance/orch test: test\settings-defects.test.ts:
@bryance/orch test: (pass) settingsDefects > returns no defects for a valid settings file [10.98ms]
@bryance/orch test: (pass) settingsDefects > reports unparsable JSON as one file defect [3.49ms]
@bryance/orch test: (pass) settingsDefects > suggests a near-match for a stale key [15.19ms]
@bryance/orch test: (pass) settingsDefects > does not guess a replacement for a removed key [21.98ms]
@bryance/orch test: (pass) settingsDefects > reports the expected pinned schema value [6.24ms]
@bryance/orch test: (pass) settingsDefects > reports a wrong value type on a real key [6.30ms]
@bryance/orch test: 
@bryance/orch test: test\skew-guard.test.ts:
@bryance/orch test: (pass) CLI daemon skew guard > allows read-only commands while the daemon is skewed [830.32ms]
@bryance/orch test: (pass) CLI daemon skew guard > --stale-ok overrides refusal for a mutating command [2210.56ms]
@bryance/orch test: (pass) CLI daemon skew guard > doctor reports skew as a warning without making skew itself a failure [6220.61ms]
@bryance/orch test: (pass) CLI daemon skew guard > does not treat an absent daemon as skew and auto-starts a fresh daemon [9205.89ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-no-peer-credentials.test.ts:
@bryance/orch test: (pass) the daemon asks for a token and nothing else > no peer-credential or ancestry syscall appears in the daemon at all [10.90ms]
@bryance/orch test: 
@bryance/orch test: test\backend-tmux.test.ts:
@bryance/orch test: (pass) TmuxBackend > does not expose legacy top-level group methods [0.20ms]
@bryance/orch test: (pass) TmuxBackend > composes a complete group role bundle [0.12ms]
@bryance/orch test: (pass) TmuxBackend > exposes tmux pane roles [0.09ms]
@bryance/orch test: (pass) TmuxBackend > does not declare pane foreground capability [0.11ms]
@bryance/orch test: (pass) TmuxBackend > reports tmux availability [11.61ms]
@bryance/orch test: (pass) TmuxBackend > reflects the TMUX environment [0.43ms]
@bryance/orch test: (pass) TmuxBackend > rejects an empty handle without invoking tmux [0.46ms]
@bryance/orch test: (pass) TmuxBackend > the pane inventory surfaces only orch-spawned panes [2.76ms]
@bryance/orch test: (pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.31ms]
@bryance/orch test: (pass) TmuxBackend > inventory status is read from the pane's presence status.json [4.68ms]
@bryance/orch test: (pass) TmuxBackend > inventory status is null when no presence status.json exists [0.37ms]
@bryance/orch test: (pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [275.93ms]
@bryance/orch test: (pass) TmuxBackend > waiting fails immediately when the pane has no presence key [0.39ms]
@bryance/orch test: (pass) TmuxBackend > the pane screen returns captured text and throws when capture-pane fails [1769.83ms]
@bryance/orch test: (pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [1.25ms]
@bryance/orch test: (pass) TmuxBackend > paneHost.open splits the requested target with cwd and environment [1.08ms]
@bryance/orch test: (pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [6.23ms]
@bryance/orch test: (pass) TmuxBackend > spawn splits the planned target pane, not whatever pane the window has active [0.64ms]
@bryance/orch test: (pass) TmuxBackend > groupLayout reports every pane in a window with its cell geometry [0.85ms]
@bryance/orch test: (pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.77ms]
@bryance/orch test: (pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [1.96ms]
@bryance/orch test: (pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [1.71ms]
@bryance/orch test: (pass) an agent is launched with its fleet's project scope (1.13) > a tmux agent in a worktree carries the FLEET's project, not its own cwd [0.99ms]
@bryance/orch test: (pass) an agent is launched with its fleet's project scope (1.13) > a tmux agent opened in a fresh window carries it too [0.55ms]
@bryance/orch test: (pass) an agent is launched with its fleet's project scope (1.13) > an empty value is dropped rather than exported as a configured blank [0.83ms]
@bryance/orch test: 
@bryance/orch test: test\cmd-lock-bridge.test.ts:
@bryance/orch test: (pass) pi-bridge command-lock interception > wraps a matching locked command in acquireΓåÆrelease around the tool call [1807.05ms]
@bryance/orch test: 
@bryance/orch test: test\close-always.test.ts:
@bryance/orch test: Could not close survives01: pane-survives is still listed by headless after the close
@bryance/orch test: {"closed":[],"results":[{"target":"survives01","handle":"pane-survives","outcome":"error","error":"pane-survives is still listed by headless after the close"}],"requested":1,"ok":0,"stream":false}
@bryance/orch test: (pass) close always works > a successful backend close retains a pane that is still listed [2237.06ms]
@bryance/orch test: 
@bryance/orch test: test\skill-store-and-links.test.ts:
@bryance/orch test: (pass) skill store and harness links > writes real files to the store and links each harness dir into it [38.77ms]
@bryance/orch test: 
@bryance/orch test: test\environment-dictates-what-is-possible.test.ts:
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > a MOVE is a new environment record, and what is possible follows it at once [142.63ms]
@bryance/orch test: 
@bryance/orch test: test\lifecycle-reports-a-partial-run.test.ts:
@bryance/orch test: (pass) a partial reload or restart is reported, not exited > reload --json writes the whole payload and sets exitCode, never exits [143.63ms]
@bryance/orch test: 
@bryance/orch test: test\pack-gets-its-own-home.test.ts:
@bryance/orch test: (pass) a pack gets its own marked plexer home (E8, E9, E10) > the coordinate is STORED against the pack and is never orch's own id [154.49ms]
@bryance/orch test: 
@bryance/orch test: test\lifecycle-reports-a-partial-run.test.ts:
@bryance/orch test: (pass) a partial reload or restart is reported, not exited > restart --json writes the whole payload and sets exitCode, never exits [105.93ms]
@bryance/orch test: 
@bryance/orch test: test\skill-store-and-links.test.ts:
@bryance/orch test: (pass) skill store and harness links > replaces a real directory left in a harness dir with a link into the store [44.22ms]
@bryance/orch test: (pass) skill store and harness links > doctor reports a harness dir holding a real directory instead of a link [49.16ms]
@bryance/orch test: (pass) skill store and harness links > doctor passes once every harness dir links into the store [45.23ms]
@bryance/orch test: (pass) skill store and harness links > doctor skips when the user turned the skill install off [20.91ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-unscoped-tasks.test.ts:
@bryance/orch test: (pass) doctor task scopes > a facade-enqueued task has exactly one typed scope [147.78ms]
@bryance/orch test: 
@bryance/orch test: test\routing-hardening.test.ts:
@bryance/orch test: (pass) store hardening > stores hostile values as data and preserves pack selection [197.04ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-unscoped-tasks.test.ts:
@bryance/orch test: (pass) doctor task scopes > the database rejects an unscoped task instead of keeping a legacy queue row [142.98ms]
@bryance/orch test: (pass) doctor task scopes > doctor lists unrunnable tasks and deliberate resolutions without deleting [160.38ms]
@bryance/orch test: 
@bryance/orch test: test\environment-dictates-what-is-possible.test.ts:
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > a move closes the interval it left, so history says WHERE it was and WHEN [128.01ms]
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > moving one axis leaves every other axis exactly where it was [140.96ms]
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > an UPGRADE is a NEW host_plexers row, not an overwrite of the old one [154.88ms]
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > re-declaring the SAME version is not an upgrade and opens no second row [126.14ms]
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > nothing anywhere records what an agent CAN do [90.01ms]
@bryance/orch test: 
@bryance/orch test: test\seat-index.test.ts:
@bryance/orch test: (pass) seat pure seams > errorMessage preserves non-Error thrown values [1.73ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-no-peer-credentials.test.ts:
@bryance/orch test: (pass) the daemon asks for a token and nothing else > a caller the daemon has no relationship to is accepted on the token alone [1014.73ms]
@bryance/orch test: 
@bryance/orch test: test\seat-index.test.ts:
@bryance/orch test: (pass) seat pure seams > hasTheme discriminates missing and valid themes [0.93ms]
@bryance/orch test: (pass) seat pure seams > countStates groups active, blocked, failed, and settled states [0.19ms]
@bryance/orch test: (pass) seat pure seams > formatSeatStatus renders state counts and view hint [0.32ms]
@bryance/orch test: (pass) seat pure seams > reconcileDashboardSelection preserves id and guards missing snapshots [0.27ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-no-peer-credentials.test.ts:
@bryance/orch test: (pass) the daemon asks for a token and nothing else > that same stranger without the token is refused, so the token is what decided [29.92ms]
@bryance/orch test: 
@bryance/orch test: test\pack-gets-its-own-home.test.ts:
@bryance/orch test: (pass) a pack gets its own marked plexer home (E8, E9, E10) > the home orch opens is MARKED as orch's, never a bare directory name [117.67ms]
@bryance/orch test: (pass) a pack gets its own marked plexer home (E8, E9, E10) > a space's home and a pack's home use the SAME role and different tables [152.33ms]
@bryance/orch test: (pass) a pack gets its own marked plexer home (E8, E9, E10) > an environment that holds nothing answers with an absence, and stores none [141.40ms]
@bryance/orch test: (pass) a pack gets its own marked plexer home (E8, E9, E10) > a home recorded in another plexer is not this one's to drive [155.26ms]
@bryance/orch test: (pass) a pack gets its own marked plexer home (E8, E9, E10) > closing a pack's home clears the row, so the next open is a fresh one [178.68ms]
@bryance/orch test: 
@bryance/orch test: test\space-policy.test.ts:
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > two unspaced agents in the SAME repo root can reach each other [63.78ms]
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > two unspaced agents in DIFFERENT repo roots cannot [73.33ms]
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > an agent placed in no space reports none, even inside a plexer workspace [145.27ms]
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > recording a spawn never conjures the space it names [80.08ms]
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > a space still walls, and it outranks the repo root [117.93ms]
@bryance/orch test: (pass) space policy > reads the space from the environment satellite, and absence is null [146.13ms]
@bryance/orch test: (pass) space policy > resolves space names through records and functions [0.30ms]
@bryance/orch test: (pass) space policy > compares agents by the space each is composed into [172.95ms]
@bryance/orch test: (pass) space policy > enforces the space wall across every plexer alike [289.86ms]
@bryance/orch test: (pass) space policy > scopes agents to the current space [165.98ms]
@bryance/orch test: (pass) space policy > a null current space leaves items unscoped [138.19ms]
@bryance/orch test: (pass) space policy > 2.7 status displays the composed space, not text sliced from a key [211.78ms]
@bryance/orch test: (pass) space policy > 6.6 structured identity drives status and policy, not serialized key text [222.51ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-status-lease.test.ts:
@bryance/orch test: (pass) daemon status lease payload > reports the current holder and its liveness [1757.92ms]
@bryance/orch test: 
@bryance/orch test: test\routing-hardening.test.ts:
@bryance/orch test: (pass) store hardening > a fresh store creates the full current schema with WAL enabled [123.71ms]
@bryance/orch test: (pass) store hardening > the store refuses a second open holding, so ownership cannot fork [143.36ms]
@bryance/orch test: (pass) store hardening > adoption closes the prior holding in the same step that opens the new one [162.79ms]
@bryance/orch test: (pass) store hardening > the attempt insert claim is exactly once [121.60ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-hosts.test.ts:
@bryance/orch test: (pass) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [3821.39ms]
@bryance/orch test: 
@bryance/orch test: test\routing-hardening.test.ts:
@bryance/orch test: (pass) CLI offline routing > status --offline does not start or contact orchd [367.66ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-registration.test.ts:
@bryance/orch test: (pass) machine daemon registration > refuses a second start and names the live socket [3067.92ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-status-lease.test.ts:
@bryance/orch test: (pass) daemon status lease payload > distinguishes a known unleased agent from an unknown key [737.02ms]
@bryance/orch test: 
@bryance/orch test: test\close-always.test.ts:
@bryance/orch test: Could not close signalfai1: signal denied
@bryance/orch test: {"closed":[],"results":[{"target":"signalfai1","handle":"pane-signal-failed","outcome":"error","error":"signal denied"}],"requested":1,"ok":0,"stream":false}
@bryance/orch test: {"closed":["presence01"],"results":[{"target":"presence01","handle":"pane-presence-only","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
@bryance/orch test: (pass) close always works > a failed signal retains the registry and presence and reports failure [1747.76ms]
@bryance/orch test: (pass) close always works > presence pid without a recorded process closes the pane without signalling and ends the row [137.02ms]
@bryance/orch test: 
@bryance/orch test: test\cmd-lock.test.ts:
@bryance/orch test: 79 |     if (Date.now() - started >= timeoutMs) break;
@bryance/orch test: 80 |     await sleep(pollMs);
@bryance/orch test: 81 |   }
@bryance/orch test: 82 |   const holder = loadLock(path);
@bryance/orch test: 83 |   const heldBy = holder ? `${holder.holder} (pid ${holder.pid})` : "an unknown holder";
@bryance/orch test: 84 |   throw new Error(`timed out after ${timeoutMs}ms waiting for command lock held by ${heldBy}`);
@bryance/orch test:                  ^
@bryance/orch test: error: timed out after 2000ms waiting for command lock held by first (pid 33472)
@bryance/orch test:       at acquireCommandLock (C:\dev\personal\orch\packages\orch\src\control\cmd-lock.ts:84:13)
@bryance/orch test: (fail) command lock > second acquire blocks until first releases [2912.85ms]
@bryance/orch test: 
@bryance/orch test: test\cmd-lock-bridge.test.ts:
@bryance/orch test: (pass) pi-bridge command-lock interception > leaves a non-matching command untouched ΓÇö no acquire, no release [817.10ms]
@bryance/orch test: (pass) pi-bridge command-lock interception > only bash tool calls are intercepted ΓÇö a non-bash tool never acquires [663.68ms]
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
@bryance/orch test:   x         eslint               Execute a package binary (CLI), installing if needed (bunx)
@bryance/orch test:   repl                           Start a REPL session with Bun
@bryance/orch test:   exec                           Run a shell script directly with Bun
@bryance/orch test: 
@bryance/orch test:   install                        Install dependencies for a package.json (bun i)
@bryance/orch test:   add       @evan/duckdb         Add a dependency to package.json (bun a)
@bryance/orch test:   remove    redux                Remove a dependency from package.json (bun rm)
@bryance/orch test:   update    @zarfjs/zarf         Update outdated dependencies
@bryance/orch test:   audit                          Check installed packages for vulnerabilities
@bryance/orch test:   dedupe                         Remove duplicate versions from the lockfile
@bryance/orch test:   prune                          Remove packages that are not in the lockfile from node_modules
@bryance/orch test:   outdated                       Display latest versions of outdated dependencies
@bryance/orch test:   link      [<package>]          Register or link a local npm package
@bryance/orch test:   unlink                         Unregister a local npm package
@bryance/orch test:   publish                        Publish a package to the npm registry
@bryance/orch test:   patch <pkg>                    Prepare a package for patching
@bryance/orch test:   pm <subcommand>                Additional package management utilities
@bryance/orch test:   info      zod                  Display package metadata from the registry
@bryance/orch test:   why       tailwindcss          Explain why a package is installed
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
@bryance/orch test: (pass) daemon lifecycle > reexecs with the current argv and hands over the lock [1872.95ms]
@bryance/orch test: (pass) daemon lifecycle > rejects a recycled pid identity [3321.30ms]
@bryance/orch test: (pass) daemon lifecycle > foreign machine registration cannot be signalled for another store [2315.16ms]
@bryance/orch test: (pass) daemon lifecycle > only a provable lock owner may be signalled [2042.18ms]
@bryance/orch test: (pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [27.63ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-orphan-daemons.test.ts:
@bryance/orch test: (pass) doctor orphaned-daemon check > a live foreign lock is reported, and an unproven owner is never killable [2947.70ms]
@bryance/orch test: 
@bryance/orch test: test\close-always.test.ts:
@bryance/orch test: {"closed":["owned00001"],"results":[{"target":"owned00001","handle":"pane-owned","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
@bryance/orch test: {"outcome":"answer","reason":"no-environment-role","text":"this pane environment does not provide abort"}
@bryance/orch test: {"closed":["duplicate1"],"results":[{"target":"duplicate1","handle":"pane-duplicate","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
@bryance/orch test: (pass) close always works > close ignores owner and spawnedBy gates [117.15ms]
@bryance/orch test: (pass) close always works > abort ignores owner gate [120.69ms]
@bryance/orch test: (pass) close always works > duplicate close targets count once [105.30ms]
@bryance/orch test: (pass) close always works > dead pane-less close is a successful no-op that ends the row and leaves presence to reap [682.87ms]
@bryance/orch test: (pass) close always works > steer remains blocked by the space wall [132.01ms]
@bryance/orch test: 
@bryance/orch test: test\cmd-lock-bridge.test.ts:
@bryance/orch test: (pass) pi-bridge command-lock interception > blocks a concurrent orch lock run while the bridge holds the shared lock [2339.77ms]
@bryance/orch test: 
@bryance/orch test: test\broker-governance.test.ts:
@bryance/orch test: (pass) daemon governWrite enforcement > an unscoped actor may write to an unleased target [364.33ms]
@bryance/orch test: (pass) daemon governWrite enforcement > the lease holder may write to its own agent [3078.18ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a foreign live holder in the same space is refused and named [2427.97ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a dead holder is not a collision [1134.76ms]
@bryance/orch test: (pass) daemon governWrite enforcement > --steal on a driving verb does not take a live holder's lease [2354.97ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a cross-space write is refused by the wall before the lease [2022.57ms]
@bryance/orch test: (pass) daemon governWrite enforcement > --cross-space clears the wall but the lease still applies [3170.03ms]
@bryance/orch test: (pass) daemon governWrite enforcement > the space operator writes to a same-space leased agent without taking the lease [1854.85ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a foreign space's operator still hits the wall [955.97ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a refused enqueue leaves the lease exactly as it was [1385.23ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a granted write and its enqueue commit together [1455.70ms]
@bryance/orch test: (pass) daemon governWrite enforcement > an unleased target is writable by any same-space actor [93.86ms]
@bryance/orch test: 
@bryance/orch test: test\lease-authority.test.ts:
@bryance/orch test: (pass) C3 foreign agents are untouchable > a DEAD foreign holder is not a collision [2481.81ms]
@bryance/orch test: (pass) C3 foreign agents are untouchable > the composed holder IS the open lease, with nothing beside it [1558.33ms]
@bryance/orch test: (pass) C4 steal > adopt refuses a live holder, and --steal takes it [2077.34ms]
@bryance/orch test: (pass) C4 steal > detach refuses a live holder, and --steal releases it [3179.50ms]
@bryance/orch test: (pass) C4a fencing token > lease ids are monotonic across handoff and adoption [960.75ms]
@bryance/orch test: (pass) C4a fencing token > a stale fence cannot release the current holder's lease [814.52ms]
@bryance/orch test: (pass) C4a fencing token > openLeaseId is null when nothing is leased [1049.09ms]
@bryance/orch test: (pass) C4b reads are never gated > status and events read straight through a live foreign lease [1972.66ms]
@bryance/orch test: (pass) C4c/C4d name resolution > duplicate names are legal and an ambiguous target asks for the id [147.38ms]
@bryance/orch test: (pass) C4c/C4d name resolution > a unique name resolves, and an unknown target is a lookup miss [103.08ms]
@bryance/orch test: (pass) C4e naming at creation > a nameless spawn is refused [0.62ms]
@bryance/orch test: (pass) C4e naming at creation > a self-registering session gets <harness>-<first 8 of its id> [113.15ms]
@bryance/orch test: (pass) C4f self-rename > an agent renames itself whether or not a lease is in force [882.92ms]
@bryance/orch test: (pass) C4f self-rename > renaming another agent is driving and obeys the lease [1516.15ms]
@bryance/orch test: (pass) C4f self-rename > an invalid name is refused [74.17ms]
@bryance/orch test: (pass) C5 a transfer does not disturb the agent > adoption writes lease rows and touches nothing else [717.75ms]
@bryance/orch test: (pass) C7 live by lease, history by provenance > adoption moves the live view and leaves provenance untouched [739.43ms]
@bryance/orch test: 
@bryance/orch test: test\review.test.ts:
@bryance/orch test: Preparing worktree (new branch 'orch/iterate-1')
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
@bryance/orch test: (pass) review plumbing > reject re-dispatches feedback through the adapter inbox [15388.10ms]
@bryance/orch test: (pass) review plumbing > approve merges and removes the worktree and branch [2771.24ms]
@bryance/orch test: (fail) review plumbing > conflicting approval aborts without changing either branch [1635.98ms]
@bryance/orch test: (pass) review plumbing > non-fast-forward approval creates a merge commit [1603.39ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc.test.ts:
@bryance/orch test: (pass) daemon RPC > hello translates an absent daemon instead of reading a missing token [5064.70ms]
@bryance/orch test: 
@bryance/orch test: test\cmd-lock-bridge.test.ts:
@bryance/orch test: (pass) pi-bridge command-lock interception > surfaces a present but broken settings load instead of silently disabling locks [522.80ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: (fail) fleet ownership scoping > explicit foreign target closes successfully [3185.78ms]
@bryance/orch test: (pass) fleet ownership scoping > driving verbs remain gated against a live foreign holder [7731.06ms]
@bryance/orch test: (pass) fleet ownership scoping > result refuses a foreign-owned agent and names its owner [935.13ms]
@bryance/orch test: (pass) fleet ownership scoping > pane mutations refuse a foreign-owned agent and name its owner [1742.49ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-stale-presence.test.ts:
@bryance/orch test: (pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [3427.64ms]
@bryance/orch test: (pass) doctor stale presence safety > no dead agents leaves nothing to remove [3628.38ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: {"closed":["kmismatch1"],"results":[{"target":"kmismatch1","handle":"{\"pid\":19744,\"key\":\"kmismatch1\"}","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
@bryance/orch test: (pass) fleet ownership scoping > close has no force option and remains unconditional without it [1918.68ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-limits.test.ts:
@bryance/orch test: (pass) spawn limits > rejects invalid cap %s with file and key [21.45ms]
@bryance/orch test: (pass) spawn limits > rejects invalid cap %s with file and key [21.10ms]
@bryance/orch test: (pass) spawn limits > rejects invalid cap %s with file and key [18.70ms]
@bryance/orch test: (pass) spawn limits > omitted fleet caps normalize to defaults [6.47ms]
@bryance/orch test: (pass) spawn limits > global boundary refusal data counts the whole request [1164.17ms]
@bryance/orch test: (pass) spawn limits > one workspace may use the full global allotment [1082.11ms]
@bryance/orch test: (pass) spawn limits > workspace cap is independent of global headroom [1001.08ms]
@bryance/orch test: (pass) spawn limits > uncapped space is bounded only by global count [757.46ms]
@bryance/orch test: (pass) spawn limits > foreign pack members do not consume the caller's pack cap [65.00ms]
@bryance/orch test: (pass) spawn limits > dead pid records free capacity [19.15ms]
@bryance/orch test: (pass) spawn limits > foreign panes never count [17.43ms]
@bryance/orch test: (pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [4842.32ms]
@bryance/orch test: (pass) spawn limits > doctor accepts satisfiable limits [4494.75ms]
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
@bryance/orch test: bun test held by agent-a (pid 33472)
@bryance/orch test: (fail) command lock > dead-pid lock is reaped [762.39ms]
@bryance/orch test: (pass) command lock > release with wrong pid refuses [1914.48ms]
@bryance/orch test: (pass) command lock > matches locked command prefixes and probes settings [1862.03ms]
@bryance/orch test: (pass) command lock > run propagates the child exit code [738.49ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: (pass) fleet ownership scoping > close cleans up a mismatched recorded process without signalling [838.39ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > a spawned agent acts as its own minted id, not its launch key [2.57ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > --cross-space from a spawned agent is refused [487.05ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > close --all from an AGENT sweeps only its own subtree [513.40ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > close --all from the HUMAN sweeps every managed spawn, whoever spawned it [492.21ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > close from a spawned agent is REFUSED when the target is not its own [457.50ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > close from a spawned agent SUCCEEDS on a slave it spawned itself [428.45ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > the workspace operator keeps control of an agent-owned fleet [446.02ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-orphan-daemons.test.ts:
@bryance/orch test: (pass) doctor orphaned-daemon check > a dead pid's lock is not an orphan [3997.15ms]
@bryance/orch test: (pass) doctor orphaned-daemon check > the caller's own orch dir is never reported against itself [3377.85ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc.test.ts:
@bryance/orch test: (pass) daemon RPC > an unreachable agent yields a boundary answer, and the outbox is not left pending [6455.70ms]
@bryance/orch test: (pass) daemon RPC > round-trips a call over the real unix socket [16.53ms]
@bryance/orch test: (pass) daemon RPC > issues one session identity to sequential invocations from one session [887.44ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-hosts.test.ts:
@bryance/orch test: (pass) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [4986.65ms]
@bryance/orch test: (pass) doctor remote host checks > flags a remote orch version/schema mismatch in detail [3706.36ms]
@bryance/orch test: (pass) doctor remote host checks > reports no remote hosts configured as healthy [1714.11ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-registration.test.ts:
@bryance/orch test: (pass) machine daemon registration > the refusal a second start prints names the live daemon's pid [2567.19ms]
@bryance/orch test: (pass) machine daemon registration > doctor names both when a second daemon is live beside the registered one [1780.02ms]
@bryance/orch test: (pass) machine daemon registration > evicts a registration whose process instance no longer matches [1955.77ms]
@bryance/orch test: (pass) machine daemon registration > routes a different orch dir to its own runtime files [1689.14ms]
@bryance/orch test: (pass) machine daemon registration > doctor distinguishes registered-but-dead from live-and-registered [2261.63ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc.test.ts:
@bryance/orch test: (pass) daemon RPC > hello returns live agents whose newest lease is closed or absent [948.51ms]
@bryance/orch test: 
@bryance/orch test: test\doctor.test.ts:
@bryance/orch test: (pass) runDoctor > runs on an unconfigured install without failing for want of settings.json [3765.87ms]
@bryance/orch test: (pass) runDoctor > checks a healthy store [3592.22ms]
@bryance/orch test: (pass) runDoctor > warns when the store is absent [4.89ms]
@bryance/orch test: (pass) runDoctor > fails when the store predates orch's migrations [81.19ms]
@bryance/orch test: (pass) runDoctor > fails and names a missing store table [80.71ms]
@bryance/orch test: (pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [3966.45ms]
@bryance/orch test: (pass) runDoctor > reports an absent daemon as optional [2507.34ms]
@bryance/orch test: (pass) runDoctor > reports and fixes a stale daemon lock [1585.24ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-checks.test.ts:
@bryance/orch test: (pass) doctor provenance-depth checks > accepts a live agent at fleet.max_depth [142.08ms]
@bryance/orch test: (pass) doctor unclaimed-agent checks > finds an old unclaimed live agent with its age [105.87ms]
@bryance/orch test: (pass) doctor unclaimed-agent checks > ignores a claimed agent [109.99ms]
@bryance/orch test: (pass) doctor unclaimed-agent checks > ignores a fresh unclaimed agent under the threshold [93.85ms]
@bryance/orch test: (pass) doctor notification-sink checks > reports no sinks as healthy [1831.36ms]
@bryance/orch test: (pass) doctor notification-sink checks > rejects a webhook with a malformed URL [27.16ms]
@bryance/orch test: (pass) doctor notification-sink checks > uses the notify-send prerequisite install command in desktop remediation [19.84ms]
@bryance/orch test: (pass) doctor notification-sink checks > warns for a command binary missing from PATH [1226.81ms]
@bryance/orch test: (pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [2760.87ms]
@bryance/orch test: (pass) doctor notification-sink checks > warns when a notifier omits done from its on list [3927.51ms]
@bryance/orch test: (pass) doctor notification-sink checks > does not warn when a notifier includes done in its on list [2657.25ms]
@bryance/orch test: (pass) doctor notification-sink checks > keeps unavailable notifier failures when done is omitted [1675.80ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc.test.ts:
@bryance/orch test: (pass) daemon RPC > hello returns an empty unleased list when none exist [441.23ms]
@bryance/orch test: (pass) daemon RPC > a TCP hello with the daemon token gets an identity [743.01ms]
@bryance/orch test: (pass) daemon RPC > refuses a hello that reports no session pid [14.09ms]
@bryance/orch test: (pass) daemon RPC > refuses a hello without its environment [12.23ms]
@bryance/orch test: 
@bryance/orch test: test\doctor.test.ts:
@bryance/orch test: (pass) runDoctor > accepts a live daemon and an answerable socket [2217.08ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc.test.ts:
@bryance/orch test: (pass) daemon RPC > same session pid keeps its id and a different session pid gets another [1128.81ms]
@bryance/orch test: (pass) daemon RPC > refuses a TCP hello without a token [9.46ms]
@bryance/orch test: (pass) daemon RPC > refuses a TCP hello with a wrong token [7.08ms]
@bryance/orch test: (pass) daemon RPC > writes the daemon token with owner-only permissions [10.80ms]
@bryance/orch test: (pass) daemon RPC > returns an error for an unknown method [7.11ms]
@bryance/orch test: (pass) daemon RPC > reports malformed lines and keeps the connection alive [21.01ms]
@bryance/orch test: (pass) daemon RPC > delivers pushed subscription events [66.53ms]
@bryance/orch test: (pass) daemon RPC > replays durable events after a daemon restart without a gap [323.85ms]
@bryance/orch test: (pass) daemon RPC > reports the oldest sequence when replay starts before the pruned window [57.14ms]
@bryance/orch test: (pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [1084.26ms]
@bryance/orch test: (pass) daemon RPC > has a catchable absent-daemon error [1.65ms]
@bryance/orch test: (pass) daemon RPC > calls a slow daemon unreachable, not absent [113.56ms]
@bryance/orch test: (pass) daemon RPC > calls a refused endpoint absent so a wedged daemon is still reclaimable [10.61ms]
@bryance/orch test: 
@bryance/orch test: test\doctor.test.ts:
@bryance/orch test: (pass) runDoctor > warns when the live daemon code hash is stale [1075.55ms]
@bryance/orch test: (pass) runDoctor > fails on an invalid lock and an unanswerable live socket [2636.00ms]
@bryance/orch test: (pass) runDoctor > warns when the extension bundle is absent for a matching live hash [14.46ms]
@bryance/orch test: (pass) runDoctor > warns when the extension bundle is absent for a stale live hash [16.80ms]
@bryance/orch test: (pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [14.74ms]
@bryance/orch test: (pass) runDoctor > reports a dead presence pid [1367.73ms]
@bryance/orch test: (pass) runDoctor > bins check is driven by the enabled set and offers no fix [418.99ms]
@bryance/orch test: (pass) runDoctor > applyFixes reports exactly the changes it applies [10.64ms]
@bryance/orch test: (pass) runDoctor > validates configured notifier adapters [3397.65ms]
@bryance/orch test: (pass) runDoctor > reports invalid settings and accepts missing settings [1793.26ms]
@bryance/orch test: (pass) runDoctor > never throws when individual checks encounter broken inputs [2172.12ms]
@bryance/orch test: 
@bryance/orch test: 5 tests skipped:
@bryance/orch test: (skip) the token file is the whole credential > the token is 0600
@bryance/orch test: (skip) the token file is the whole credential > $ORCH_DIR is 0700, so same-uid is a boundary the filesystem enforces
@bryance/orch test: (skip) the token file is the whole credential > a token left loose by an earlier run is tightened, not trusted
@bryance/orch test: (skip) the token file is the whole credential > a runtime directory the daemon creates is 0700 too
@bryance/orch test: (skip) claude-hooks shim tests need the dist bundle
@bryance/orch test: 
@bryance/orch test: 
@bryance/orch test: 5 tests failed:
@bryance/orch test: (fail) C3 foreign agents are untouchable > every driving verb is refused while a live foreign orch holds the lease [5061.03ms]
@bryance/orch test:   ^ this test timed out after 5000ms.
@bryance/orch test: (fail) review plumbing > conflicting approval aborts without changing either branch [1635.98ms]
@bryance/orch test: (fail) command lock > second acquire blocks until first releases [2912.85ms]
@bryance/orch test: (fail) command lock > dead-pid lock is reaped [762.39ms]
@bryance/orch test: (fail) fleet ownership scoping > explicit foreign target closes successfully [3185.78ms]
@bryance/orch test: 
@bryance/orch test:  1578 pass
@bryance/orch test:  5 skip
@bryance/orch test:  5 fail
@bryance/orch test:  7141 expect() calls
@bryance/orch test: Ran 1588 tests across 256 files. [48.69s]
@bryance/orch test: Exited with code 1
error: script "test:orch" exited with code 1
