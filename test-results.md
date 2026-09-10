$ bun --filter @bryance/orch test
@bryance/orch test: bun test v1.4.0 (34cbb9a40) 24x PARALLEL
@bryance/orch test: 
@bryance/orch test: integration\claude-adapter.test.ts:
@bryance/orch test: (pass) Claude adapter > declares its identity, and composes only the roles it fully implements [0.49ms]
@bryance/orch test: 
@bryance/orch test: test\commands-help.test.ts:
@bryance/orch test: (pass) per-command help topics > daemon help names every subcommand and the idle shutdown setting [0.08ms]
@bryance/orch test: (pass) per-command help topics > aliases resolve to their command's topic [0.03ms]
@bryance/orch test: (pass) per-command help topics > logs help names every filter the command accepts [0.08ms]
@bryance/orch test: (pass) per-command help topics > an unknown name has no topic
@bryance/orch test: (pass) per-command help topics > every topic is printable text ending in a newline [0.05ms]
@bryance/orch test: 
@bryance/orch test: test\setup-io.test.ts:
@bryance/orch test: (pass) setup prompt answer validation > refuses a single answer that was not offered [0.34ms]
@bryance/orch test: (pass) setup prompt answer validation > refuses multi-select answers containing an unoffered value [0.25ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-notify-busy.test.ts:
@bryance/orch test: (pass) a herdr notification is delivered only when herdr says it was shown > shown is a delivery [0.21ms]
@bryance/orch test: (pass) a herdr notification is delivered only when herdr says it was shown > busy is NOT a delivery, however herdr exited [0.35ms]
@bryance/orch test: (pass) a herdr notification is delivered only when herdr says it was shown > every other refusal herdr can answer with is also not a delivery [0.19ms]
@bryance/orch test: (pass) a herdr notification is delivered only when herdr says it was shown > output that is not a herdr answer is never read as a delivery [0.36ms]
@bryance/orch test: (pass) a busy herdr is waited out, not dropped > a toast shown on the first try is sent once and waits for nothing [1.12ms]
@bryance/orch test: (pass) a busy herdr is waited out, not dropped > a busy herdr is retried after a wait, and the retry is the delivery [0.61ms]
@bryance/orch test: (pass) a busy herdr is waited out, not dropped > a herdr that stays busy gives up rather than blocking the daemon forever [0.78ms]
@bryance/orch test: (pass) a busy herdr is waited out, not dropped > a refusal that waiting cannot fix is not retried [0.19ms]
@bryance/orch test: 
@bryance/orch test: test\one-spelling-per-fact.test.ts:
@bryance/orch test: (pass) one spelling per shared fact > osSide and the store agree for an injected Windows platform [82.31ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-tmux.test.ts:
@bryance/orch test: (pass) tmux backend registry and capabilities > is registered [1.68ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > explicit selection follows tmux availability [19.40ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > exposes pane roles [0.14ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > reflects the TMUX environment [0.20ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > a tmux agent's key is the minted id, never its pane [0.49ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > selects an available placing environment, whichever one the caller sits in [0.22ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > falls back to headless only when no environment can place an agent [0.09ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > an installed plexer is selectable from outside its session, and refuses in its own words [0.39ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > herdr is selectable from outside a herdr session [0.07ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-names.test.ts:
@bryance/orch test: (pass) agent name validation > rejects names outside herdr's naming rule [0.80ms]
@bryance/orch test: 
@bryance/orch test: test\agent-monitor.test.ts:
@bryance/orch test: (pass) agent fleet monitor > surfaces only agents spawned by this session [5.40ms]
@bryance/orch test: (pass) agent fleet monitor > empty model renders no status line or widget [3.06ms]
@bryance/orch test: (pass) agent fleet monitor > worker process registers no monitor regardless of events [3.87ms]
@bryance/orch test: (pass) agent fleet monitor > does not replay history into a plain pi session [2.43ms]
@bryance/orch test: 
@bryance/orch test: test\plexer-versions.test.ts:
@bryance/orch test: (pass) plexer version support > a floor admits every version at or above it [0.50ms]
@bryance/orch test: 
@bryance/orch test: test\commands-setup.test.ts:
@bryance/orch test: (pass) commands/setup > reads value and assignment flags [0.27ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-claude-hooks.test.ts:
@bryance/orch test: (pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [72.16ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-roundtrip.test.ts:
@bryance/orch test: (pass) repairing a settings.json the schema rejects > reports every rejected key without touching the file [74.39ms]
@bryance/orch test: 
@bryance/orch test: test\notify-events-format.test.ts:
@bryance/orch test: (pass) notification and presence event formatting > spaceColor is stable and returns a palette hex [0.21ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-terminal.test.ts:
@bryance/orch test: (pass) bridge terminal turn seam > empty and tool-only turn_end turns still publish a terminal idle state [46.70ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-notify-hardening.test.ts:
@bryance/orch test: (pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [1.08ms]
@bryance/orch test: 
@bryance/orch test: test\commands-index.test.ts:
@bryance/orch test: (pass) commands/index > does not gate help or noninteractive commands [0.18ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-notify-hardening.test.ts:
@bryance/orch test: (pass) herdr and notification hardening > falls back to a valid name when the identity key contains herdr-invalid separators [0.25ms]
@bryance/orch test: (pass) herdr and notification hardening > nameless notifications use a space label, never a bare pane key [0.50ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-terminal.test.ts:
@bryance/orch test: (pass) bridge terminal turn seam > a settled turn with assistant text publishes done [37.92ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-roundtrip.test.ts:
@bryance/orch test: (pass) repairing a settings.json the schema rejects > a removed key is never guessed at - it offers no rename [9.43ms]
@bryance/orch test: (pass) repairing a settings.json the schema rejects > the choices a person makes leave the file loadable [23.38ms]
@bryance/orch test: (pass) repairing a settings.json the schema rejects > a typo keeps its value: renaming carries it to the real key [16.35ms]
@bryance/orch test: (pass) repairing a settings.json the schema rejects > leaving every defect alone writes nothing at all [8.90ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-idle.test.ts:
@bryance/orch test: (pass) orchd idle shutdown rule > a zero setting disables idle shutdown entirely [0.04ms]
@bryance/orch test: (pass) orchd idle shutdown rule > a live agent holds the daemon open however long it has been quiet [0.04ms]
@bryance/orch test: (pass) orchd idle shutdown rule > an event subscriber holds the daemon open [0.03ms]
@bryance/orch test: (pass) orchd idle shutdown rule > recent activity holds the daemon open below the threshold [0.08ms]
@bryance/orch test: (pass) orchd idle shutdown rule > a fully idle daemon past the threshold is due to exit [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\commands-index.test.ts:
@bryance/orch test: (pass) commands/index > reads a package version string [0.40ms]
@bryance/orch test: (pass) commands/index > announces unleased agents once per session [2.13ms]
@bryance/orch test: (pass) commands/index > dispatches representative commands and reports unknown commands [37.51ms]
@bryance/orch test: 
@bryance/orch test: test\a-row-is-not-a-pane.test.ts:
@bryance/orch test: 77 | 
@bryance/orch test: 78 |     // The plexer is asked and lists a different pane entirely: the recorded one
@bryance/orch test: 79 |     // is gone. This is the exact herdr `pane_not_found` case.
@bryance/orch test: 80 |     const entity = entityFor("goneagent1", [fakePane("w7:p9Z")]);
@bryance/orch test: 81 | 
@bryance/orch test: 82 |     expect(entity?.paneId).toBeNull();
@bryance/orch test:                                 ^
@bryance/orch test: error: expect(received).toBeNull()
@bryance/orch test: 
@bryance/orch test: Received: "w7:p2B"
@bryance/orch test: 
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\a-row-is-not-a-pane.test.ts:82:28)
@bryance/orch test: (fail) a row is not evidence that a pane exists (U1, U4) > a recorded handle the plexer does not list is reported as NO pane [174.96ms]
@bryance/orch test: 
@bryance/orch test: test\hermetic-env.test.ts:
@bryance/orch test: (pass) the test suite is hermetic > no plexer environment leaks in from the shell that launched bun [0.27ms]
@bryance/orch test: 
@bryance/orch test: test\outbox.test.ts:
@bryance/orch test: (pass) outbox delivery > selects pending messages and delivers each message once [199.48ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-screen.test.ts:
@bryance/orch test: (pass) repair action labels > names the key a rename lands on, so the destination is never a guess [0.07ms]
@bryance/orch test: (pass) repair action labels > names the value a set writes [0.05ms]
@bryance/orch test: (pass) repair action labels > drop and leave say only what they do [0.02ms]
@bryance/orch test: (pass) repair frame > shows every defect with the value the person wrote [0.66ms]
@bryance/orch test: (pass) repair frame > promises that nothing changes before a save, because nothing does [0.09ms]
@bryance/orch test: (pass) repair frame > every defect starts at leave, so opening the screen destroys nothing [0.06ms]
@bryance/orch test: (pass) repair frame > a chosen repair is shown as what it will do [0.06ms]
@bryance/orch test: (pass) repair frame > the focused row's offered keys are shown, so no choice has to be guessed [0.10ms]
@bryance/orch test: (pass) repair frame > the count reads as English for one defect and for many [0.07ms]
@bryance/orch test: (pass) repair frame > no row runs past the terminal width, tag included [0.14ms]
@bryance/orch test: (pass) repair frame > the file being repaired is named in the header [0.04ms]
@bryance/orch test: 
@bryance/orch test: test\one-spelling-per-fact.test.ts:
@bryance/orch test: (pass) one spelling per shared fact > the shared record guard rejects arrays and null [0.15ms]
@bryance/orch test: (pass) one spelling per shared fact > removed identity method has no source spelling [23.73ms]
@bryance/orch test: (pass) one spelling per shared fact > settings reads have no literal fallbacks [115.85ms]
@bryance/orch test: (pass) one spelling per shared fact > launch env has one spelling [48.29ms]
@bryance/orch test: (pass) one spelling per shared fact > removed spawn cap has no source or README spelling [29.21ms]
@bryance/orch test: 
@bryance/orch test: test\queue-scope.test.ts:
@bryance/orch test: (pass) queue scope invariants > a failed pack task retries on another pack member, while an agent task stays pinned [268.62ms]
@bryance/orch test: 
@bryance/orch test: test\setup-notifiers.test.ts:
@bryance/orch test: (pass) notifier setup logic > probes the built-in adapters [38.27ms]
@bryance/orch test: 
@bryance/orch test: test\broker-daemon-hardening.test.ts:
@bryance/orch test: (pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.34ms]
@bryance/orch test: 
@bryance/orch test: test\agent-view.test.ts:
@bryance/orch test: (pass) the agent composer > an agent with no environment rows has every axis absent, not defaulted [282.32ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-tmux.test.ts:
@bryance/orch test: (pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-space [326.82ms]
@bryance/orch test: 
@bryance/orch test: test\plexer-versions.test.ts:
@bryance/orch test: (pass) plexer version support > compares numeric versions rather than lexical strings [0.03ms]
@bryance/orch test: (pass) plexer version support > rotates one open host install row when the plexer changes version [296.67ms]
@bryance/orch test: (pass) plexer version support > doctor names both versions and tells the operator to update the plexer [0.48ms]
@bryance/orch test: (pass) plexer version support > a supported plexer the user never installed is not a complaint [0.05ms]
@bryance/orch test: (pass) plexer version support > an in-range install reports ok with the version it read [0.06ms]
@bryance/orch test: (pass) plexer version support > a compatible server rides along on the row without complaint [0.04ms]
@bryance/orch test: (pass) plexer version support > a server the installed client outgrew fails and names the restart [0.04ms]
@bryance/orch test: (pass) plexer version support > a server that reports no compatibility is unknown, never a failure [0.03ms]
@bryance/orch test: (pass) plexer version support > a plexer with no server running says nothing about one [0.05ms]
@bryance/orch test: (pass) plexer version support > only an installed plexer that cannot report a version warns [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\setup-notifiers.test.ts:
@bryance/orch test: (pass) notifier setup logic > lists unavailable notifiers with remediation and disables selection [0.35ms]
@bryance/orch test: (pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.64ms]
@bryance/orch test: (pass) notifier setup logic > renders a command entry that loadSettings can parse [140.12ms]
@bryance/orch test: (pass) notifier setup logic > builds valid entries and reports invalid selections [0.45ms]
@bryance/orch test: 
@bryance/orch test: test\lifecycle-reports-a-partial-run.test.ts:
@bryance/orch test: (pass) a partial reload or restart is reported, not exited > reload --json writes the whole payload and sets exitCode, never exits [312.65ms]
@bryance/orch test: 
@bryance/orch test: test\notify-events-format.test.ts:
@bryance/orch test: (pass) notification and presence event formatting > nameless events use an identity-derived agent label [18.24ms]
@bryance/orch test: (pass) notification and presence event formatting > named events prefer the human name over the harness id [0.10ms]
@bryance/orch test: (pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.20ms]
@bryance/orch test: (pass) notification and presence event formatting > webhook payload includes space and spaceColor [2.42ms]
@bryance/orch test: (pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [7.02ms]
@bryance/orch test: (pass) notification and presence event formatting > derivePresenceTransition composes the space from the agent's environment [232.79ms]
@bryance/orch test: 
@bryance/orch test: test\retention.test.ts:
@bryance/orch test: (pass) retention sweep > retention windows are independently configurable [238.88ms]
@bryance/orch test: 
@bryance/orch test: test\port-has-no-shell.test.ts:
@bryance/orch test: (pass) the backend port has no dead workspace shell > backend types contain neither deleted declaration [0.22ms]
@bryance/orch test: 
@bryance/orch test: test\store-queue.test.ts:
@bryance/orch test: (pass) queue facade storage > state is derived from attempts rather than stored on tasks [290.01ms]
@bryance/orch test: 
@bryance/orch test: test\unleased-agents.test.ts:
@bryance/orch test: (pass) registration unleased agent hint > includes unleased workers but never session identities [299.80ms]
@bryance/orch test: 
@bryance/orch test: test\port-has-no-shell.test.ts:
@bryance/orch test: (pass) the backend port has no dead workspace shell > src contains no workspaceNames calls or BackendWorkspace references [20.03ms]
@bryance/orch test: 
@bryance/orch test: test\notify-router.test.ts:
@bryance/orch test: (pass) notify router > delivers only when on includes the event state [0.27ms]
@bryance/orch test: (pass) notify router > passes typed webhook and command configuration [0.52ms]
@bryance/orch test: (pass) notify router > surfaces notifier errors [0.17ms]
@bryance/orch test: 
@bryance/orch test: test\setup-smoke.test.ts:
@bryance/orch test: (pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [0.59ms]
@bryance/orch test: (pass) runSetupSmoke (12.5) > the agent is launched on the prompt it built [0.11ms]
@bryance/orch test: (pass) runSetupSmoke (12.5) > an agent that launches but yields no result times out and fails non-zero [2.41ms]
@bryance/orch test: (pass) runSetupSmoke (12.5) > a rejected spawn fails loudly and never polls for a result [0.84ms]
@bryance/orch test: 
@bryance/orch test: test\port-no-optional-methods.test.ts:
@bryance/orch test: (pass) the environment port declares capability by composition, never by optionality > src/types/backend.ts has no optional methods on any port interface [0.90ms]
@bryance/orch test: (pass) the environment port declares capability by composition, never by optionality > the deleted capability flags bag is gone, not merely unimplemented [0.37ms]
@bryance/orch test: (pass) the environment port declares capability by composition, never by optionality > src/types/adapter.ts has no optional methods on the harness port either [0.71ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-write.test.ts:
@bryance/orch test: (pass) applySettingsRepairs > rename carries the value to the new key [274.72ms]
@bryance/orch test: 
@bryance/orch test: test\notify-sinks.test.ts:
@bryance/orch test: (pass) notification entries > desktop entries use the canonical notifier registry [0.26ms]
@bryance/orch test: 
@bryance/orch test: test\one-writer-records-a-spawned-agent.test.ts:
@bryance/orch test: (pass) one writer records a spawned agent (2.1) > registerSpawnedAgent alone writes the COMPLETE record ΓÇö space and lease included [312.23ms]
@bryance/orch test: 
@bryance/orch test: test\notify.test.ts:
@bryance/orch test: (pass) notification routing > an excluded state does not invoke its notifier [0.55ms]
@bryance/orch test: 
@bryance/orch test: test\setup-wizard.test.ts:
@bryance/orch test: (pass) setup model picker > switches large catalogues to searchable bounded mode and preserves effort [0.56ms]
@bryance/orch test: (pass) setup model picker > keeps the compact selector for small catalogues [0.10ms]
@bryance/orch test: (pass) setup model list picker > large catalogues use the bounded searchable multiselect [0.51ms]
@bryance/orch test: (pass) setup model list picker > the prompt names both jobs the list does, and that an empty one forbids nothing [0.29ms]
@bryance/orch test: (pass) setup model list picker > stored values start checked, and clearing them returns an empty selection [0.44ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-boundary.test.ts:
@bryance/orch test: (pass) port seam command boundary > headless target is answered without invoking its pane role [0.11ms]
@bryance/orch test: (pass) port seam command boundary > paned environment without a role is answered at the boundary [0.09ms]
@bryance/orch test: (pass) port seam command boundary > an invocation preserves the provider failure [0.09ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lease.test.ts:
@bryance/orch test: (pass) lease commands > detach releases the lease and is a no-op when already unleased [353.30ms]
@bryance/orch test: 
@bryance/orch test: test\holder-death-costs-a-driver.test.ts:
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > the task in flight finishes and its result survives the holder [390.19ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-write.test.ts:
@bryance/orch test: (pass) applySettingsRepairs > rename onto an occupied key throws and leaves the file untouched [15.21ms]
@bryance/orch test: (pass) applySettingsRepairs > set writes a value at a dotted path [24.10ms]
@bryance/orch test: (pass) applySettingsRepairs > drop deletes a value without pruning its parent [30.76ms]
@bryance/orch test: (pass) applySettingsRepairs > applies several repairs in one call [28.55ms]
@bryance/orch test: (pass) applySettingsRepairs > repairs a schema-rejected file before readSettingsFile validates it [35.64ms]
@bryance/orch test: 
@bryance/orch test: test\outbox.test.ts:
@bryance/orch test: (pass) outbox delivery > checks one message's pending state without scanning the outbox [231.32ms]
@bryance/orch test: (pass) outbox delivery > keeps failed messages pending until their backoff expires [309.23ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair.test.ts:
@bryance/orch test: (pass) settings repair choices > offers rename, set, drop, then leave when all repairs apply [0.12ms]
@bryance/orch test: (pass) settings repair choices > offers only rename when there is only a suggestion [0.04ms]
@bryance/orch test: (pass) settings repair choices > offers only set when there is only an expected value [0.02ms]
@bryance/orch test: (pass) settings repair choices > always offers leave, and cannot drop a file-level defect [0.02ms]
@bryance/orch test: (pass) settings repair reducer > starts every defect at leave and focus at zero [0.05ms]
@bryance/orch test: (pass) settings repair reducer > refuses choices the focused defect does not offer and reports why [0.18ms]
@bryance/orch test: (pass) settings repair reducer > clamps focus at both ends and clears a prior reason [0.09ms]
@bryance/orch test: (pass) settings repair reducer > maps non-leave choices to repairs in defect order [0.12ms]
@bryance/orch test: (pass) settings repair reducer > leave produces no repair [0.02ms]
@bryance/orch test: (pass) settings repair reducer > empty defects make every action a no-op [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\close-authority.test.ts:
@bryance/orch test: (pass) who may end an agent (D7) > the human may close anything [302.54ms]
@bryance/orch test: 
@bryance/orch test: test\lifecycle-reports-a-partial-run.test.ts:
@bryance/orch test: (pass) a partial reload or restart is reported, not exited > restart --json writes the whole payload and sets exitCode, never exits [377.29ms]
@bryance/orch test: 
@bryance/orch test: test\skill-store-and-links.test.ts:
@bryance/orch test: (pass) skill store and harness links > writes real files to the store and links each harness dir into it [51.98ms]
@bryance/orch test: 
@bryance/orch test: test\a-row-is-not-a-pane.test.ts:
@bryance/orch test: (pass) a row is not evidence that a pane exists (U1, U4) > the agent itself is still there ΓÇö losing a pane costs a shortcut, not a life [280.56ms]
@bryance/orch test: (pass) a row is not evidence that a pane exists (U1, U4) > a handle the plexer DOES list is kept [328.39ms]
@bryance/orch test: 
@bryance/orch test: integration\claude-adapter.test.ts:
@bryance/orch test: (pass) Claude adapter > builds the interactive Claude launch command [0.17ms]
@bryance/orch test: (pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.14ms]
@bryance/orch test: (pass) Claude adapter > detects state from a live presence status [11.04ms]
@bryance/orch test: (pass) Claude adapter > extracts results.jsonl before transcript and native output [12.33ms]
@bryance/orch test: (pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [12.95ms]
@bryance/orch test: (pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [227.03ms]
@bryance/orch test: (pass) Claude adapter > maps Claude hook events to presence states and schema [740.28ms]
@bryance/orch test: (pass) Claude adapter > exits silently and writes no presence without launch env (a non-orch session) [67.80ms]
@bryance/orch test: (pass) Claude adapter > fails hard and writes no presence on a malformed launch env [83.26ms]
@bryance/orch test: 
@bryance/orch test: test\lifecycle-targets.test.ts:
@bryance/orch test: (pass) lifecycle target resolution > prefers one live agent over dead ones sharing its name [0.38ms]
@bryance/orch test: (pass) lifecycle target resolution > reports the target and disambiguating ids for live ambiguity [0.49ms]
@bryance/orch test: (pass) lifecycle target resolution > cleanup can still resolve a dead agent when no live match exists [0.06ms]
@bryance/orch test: (pass) lifecycle target resolution > an agent is addressable by its id, its name, or its pane handle [0.03ms]
@bryance/orch test: (pass) lifecycle target resolution > the pane is environment: moving it leaves every other address intact [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\unleased-stays-adoptable.test.ts:
@bryance/orch test: (pass) unleased and idle stays alive and adoptable (D3) > a decade of retention sweeps never ages out an unleased idle agent [243.06ms]
@bryance/orch test: 
@bryance/orch test: test\settings-shell.test.ts:
@bryance/orch test: (pass) settings shell decisions > non-TTY takes the print path [0.08ms]
@bryance/orch test: 
@bryance/orch test: test\one-writer-records-a-spawned-agent.test.ts:
@bryance/orch test: 83 |   const key = spec.key ?? serializeIdentity({ id: mintAgentId() });
@bryance/orch test: 84 |   const spawner = spawnerIdentity();
@bryance/orch test: 85 |   const env = spec.env ?? { ...agentIdentityEnv(spec.name, spawner), ...worktreeEnv(spec.worktree, spec.branch), [LAUNCH_ENV]: key, ORCH_DIR: orchDir() };
@bryance/orch test: 86 |   let place: BackendHandle | undefined;
@bryance/orch test: 87 |   if (spec.placement) {
@bryance/orch test: 88 |     if (!spec.backend.placement) throw new Error("environment cannot place an agent");
@bryance/orch test:                                                                                          ^
@bryance/orch test: error: environment cannot place an agent
@bryance/orch test:       at spawnOneIntoTab (C:\dev\personal\orch\packages\orch\src\commands\spawn\placement.ts:88:85)
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\one-writer-records-a-spawned-agent.test.ts:98:19)
@bryance/orch test: (pass) one writer records a spawned agent (2.1) > a spawn leaves NOTHING for a second writer to fill in [248.06ms]
@bryance/orch test: (fail) one writer records a spawned agent (2.1) > a spawn into NO space records no space and hands the plexer only its coordinate [8.30ms]
@bryance/orch test: (pass) one writer records a spawned agent (2.1) > the presence store no longer offers a second way to record an agent [0.41ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-allowlist.test.ts:
@bryance/orch test: (pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [1.30ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-claude-hooks.test.ts:
@bryance/orch test: (pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [63.36ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [238.49ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [158.61ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [70.84ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [72.18ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [50.89ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [38.37ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [77.14ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > treats an absent settings file as not configured [0.77ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > handles malformed settings gracefully [3.16ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-allowlist.test.ts:
@bryance/orch test: (pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.32ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.15ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.04ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.21ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.32ms]
@bryance/orch test: (pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.23ms]
@bryance/orch test: (pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.05ms]
@bryance/orch test: (pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.08ms]
@bryance/orch test: 
@bryance/orch test: test\log-level.test.ts:
@bryance/orch test: (pass) the configured log level reaches every logger > the env var wins over settings.json [9.06ms]
@bryance/orch test: 
@bryance/orch test: integration\cli-backends-herdr-headless.test.ts:
@bryance/orch test: (pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.35ms]
@bryance/orch test: 
@bryance/orch test: test\settings-shell.test.ts:
@bryance/orch test: (pass) settings shell decisions > an overridden setting is refused with the winner named [0.80ms]
@bryance/orch test: (pass) settings shell decisions > registered writes use the registry entry [41.09ms]
@bryance/orch test: (pass) settings shell decisions > registry exposes writable subcommand entries [0.24ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-runtime.test.ts:
@bryance/orch test: (pass) shebangRuntime > reads #!/usr/bin/env node as node [12.57ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-bundle-diagnosis.test.ts:
@bryance/orch test: (pass) adapter bundle installation > reports a missing shipped bundle as a structured diagnosis [5.13ms]
@bryance/orch test: pi extensions:
@bryance/orch test: (pass) adapter bundle installation > diagnoses a missing shipped bundle without writing [7.49ms]
@bryance/orch test: 
@bryance/orch test: test\orch-bugs-4-5.test.ts:
@bryance/orch test: (pass) orch bugs 4 and 5 launch contracts > interactive launch routes use one argv composition [2.71ms]
@bryance/orch test: (pass) orch bugs 4 and 5 launch contracts > headless launch routes use one argv composition [0.76ms]
@bryance/orch test: (pass) orch bugs 4 and 5 launch contracts > inherited extension policy emits every discovered extension [0.13ms]
@bryance/orch test: 
@bryance/orch test: test\offline-is-not-a-second-source.test.ts:
@bryance/orch test: (pass) --offline is a narrower view of ONE source, not a second one (M8) > offline and online read the same agents from the same presence files [231.69ms]
@bryance/orch test: 
@bryance/orch test: test\broker-daemon-hardening.test.ts:
@bryance/orch test: (pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [295.98ms]
@bryance/orch test: (pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [208.44ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-channel.test.ts:
@bryance/orch test: (pass) orch channel and capture roles > headless delivery reaches the inbox and is acknowledged without a screen [262.35ms]
@bryance/orch test: 
@bryance/orch test: test\log-level.test.ts:
@bryance/orch test: (pass) the configured log level reaches every logger > settings.json is used when the env var is unset [15.82ms]
@bryance/orch test: (pass) the configured log level reaches every logger > an unrecognised env value falls back to the configured level [19.78ms]
@bryance/orch test: (pass) the configured log level reaches every logger > the CLI logger honours the configured level [42.12ms]
@bryance/orch test: (pass) the configured log level reaches every logger > the CLI logger drops records below the configured level [17.14ms]
@bryance/orch test: (pass) the configured log level reaches every logger > the daemon logger resolves through the same helper [34.04ms]
@bryance/orch test: 
@bryance/orch test: test\pack-gets-its-own-home.test.ts:
@bryance/orch test: (pass) a pack gets its own marked plexer home (E8, E9, E10) > the coordinate is STORED against the pack and is never orch's own id [211.74ms]
@bryance/orch test: 
@bryance/orch test: test\settings-thinking.test.ts:
@bryance/orch test: (pass) orch settings thinking > writes the global default and reads back through loadSettings [43.93ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-hardening.test.ts:
@bryance/orch test: (pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [1.69ms]
@bryance/orch test: 
@bryance/orch test: test\skill-store-and-links.test.ts:
@bryance/orch test: (pass) skill store and harness links > replaces a real directory left in a harness dir with a link into the store [73.47ms]
@bryance/orch test: (pass) skill store and harness links > doctor reports a harness dir holding a real directory instead of a link [60.64ms]
@bryance/orch test: (pass) skill store and harness links > doctor passes once every harness dir links into the store [76.41ms]
@bryance/orch test: (pass) skill store and harness links > doctor skips when the user turned the skill install off [29.53ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-reconnect.test.ts:
@bryance/orch test: (pass) RPC JSON framing > rejects malformed object that only has an id [0.37ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-channel.test.ts:
@bryance/orch test: (pass) orch channel and capture roles > capture reads status and result from the orch presence record [25.17ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-errors.test.ts:
@bryance/orch test: (pass) port seam error contract > provider mutation errors preserve argv, exit status, stderr, and stdout [0.83ms]
@bryance/orch test: (pass) port seam error contract > provider query errors throw instead of returning a sentinel [0.22ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-reconnect.test.ts:
@bryance/orch test: (pass) RPC JSON framing > parses split and multiple newline-delimited frames [37.51ms]
@bryance/orch test: 
@bryance/orch test: test\log-record.test.ts:
@bryance/orch test: (pass) the one log record shape > writes one JSONL record per call, with an epoch-millis instant [30.39ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-hardening.test.ts:
@bryance/orch test: (pass) adapter and runtime hardening > rejects unknown settings keys with a useful path [29.41ms]
@bryance/orch test: (pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [33.09ms]
@bryance/orch test: (pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [9.11ms]
@bryance/orch test: 
@bryance/orch test: test\presence-dirs-are-reaped-not-migrated.test.ts:
@bryance/orch test: (pass) a presence dir in the old shape is reaped, never migrated (J4) > a composite-named dir is not presence, even with a LIVE pid [36.34ms]
@bryance/orch test: 
@bryance/orch test: test\offline-is-not-a-second-source.test.ts:
@bryance/orch test: (pass) --offline is a narrower view of ONE source, not a second one (M8) > offline reports the SAME state the agent reported, never a second opinion [191.72ms]
@bryance/orch test: (pass) --offline is a narrower view of ONE source, not a second one (M8) > there is exactly ONE row builder, and --offline only narrows what it asks [0.50ms]
@bryance/orch test: (pass) --offline is a narrower view of ONE source, not a second one (M8) > offline is the one path that never dials or starts the daemon [0.19ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-model-flag.test.ts:
@bryance/orch test: (pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [0.19ms]
@bryance/orch test: 
@bryance/orch test: test\settings-thinking.test.ts:
@bryance/orch test: thinking  xhigh
@bryance/orch test: thinking (pi)  low
@bryance/orch test: (pass) orch settings thinking > writes a per-harness override without disturbing the global default [25.69ms]
@bryance/orch test: (pass) orch settings thinking > the command sets the level a user names [25.49ms]
@bryance/orch test: (pass) orch settings thinking > the command sets a per-harness level with --harness [39.85ms]
@bryance/orch test: (pass) orch settings thinking > a level orch does not know is refused, naming the valid levels [18.17ms]
@bryance/orch test: (pass) orch settings thinking > clearing a per-harness override falls back to the global default [37.38ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-model-flag.test.ts:
@bryance/orch test: (pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.28ms]
@bryance/orch test: (pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.35ms]
@bryance/orch test: (pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.18ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > pi interactive builders pass the quicklist as one quoted --models argument [0.10ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > pi headless builders pass the quicklist as one verbatim argv entry [0.74ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > pi omits --models cleanly for an absent or empty quicklist [0.25ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > pi keeps quicklist order and provider punctuation intact [0.09ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > omp interactive builders pass the quicklist as one quoted --models argument [0.09ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > omp headless builders pass the quicklist as one verbatim argv entry [0.04ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > omp omits --models cleanly for an absent or empty quicklist [0.92ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > omp keeps quicklist order and provider punctuation intact [0.03ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > a model outside the quicklist is still what the launch runs on [0.12ms]
@bryance/orch test: 
@bryance/orch test: test\log-record.test.ts:
@bryance/orch test: (pass) the one log record shape > a record below the configured level is not written at all [41.70ms]
@bryance/orch test: (pass) the one log record shape > a correlation id rides every record of one dispatch, so one grep finds its whole life [42.70ms]
@bryance/orch test: (pass) the one log record shape > agentId carries orch's minted id; a plexer handle is a field, never the identity [14.18ms]
@bryance/orch test: (pass) the one log record shape > every level is orderable, lowest to highest [0.17ms]
@bryance/orch test: (pass) the one log record shape > a malformed line is rejected by the guard rather than trusted [0.11ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-runtime.test.ts:
@bryance/orch test: (pass) shebangRuntime > reads #!/usr/bin/env bun as bun [10.51ms]
@bryance/orch test: (pass) shebangRuntime > reads #!/usr/bin/env deno as deno [13.66ms]
@bryance/orch test: (pass) shebangRuntime > reads #!/usr/local/bin/node as node [25.07ms]
@bryance/orch test: (pass) shebangRuntime > does not mistake a longer binary name for a runtime [17.92ms]
@bryance/orch test: (pass) shebangRuntime > returns null for a file with no shebang [25.08ms]
@bryance/orch test: (pass) shebangRuntime > returns null for an unreadable path [4.67ms]
@bryance/orch test: (pass) runningRuntime > reports the runtime this suite is executing under [0.14ms]
@bryance/orch test: (pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [15.89ms]
@bryance/orch test: (pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [15.17ms]
@bryance/orch test: (pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [12.15ms]
@bryance/orch test: (pass) doctor runtime verdict table > launching under bun while declaring node is fine [22.07ms]
@bryance/orch test: (pass) doctor runtime verdict table > launching under node while declaring bun is fine [11.80ms]
@bryance/orch test: (pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [10.29ms]
@bryance/orch test: (pass) doctor runtime verdict table > declared runtime absent from PATH fails [32.30ms]
@bryance/orch test: (pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [11.58ms]
@bryance/orch test: (pass) doctor runtime verdict table > remediation names both directions ΓÇö rebuild, or re-record the declaration [7.98ms]
@bryance/orch test: (pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [3.99ms]
@bryance/orch test: 
@bryance/orch test: integration\cli-backends-herdr-headless.test.ts:
@bryance/orch test: (pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.12ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.17ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.18ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.25ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.25ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [30.69ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > implicit selection falls back to headless when no plexer answers [0.18ms]
@bryance/orch test: (pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [269.66ms]
@bryance/orch test: (pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [2.95ms]
@bryance/orch test: 
@bryance/orch test: test\settings-view.test.ts:
@bryance/orch test: (pass) settings view > visibleEntryIndices matches key and group case-insensitively [0.20ms]
@bryance/orch test: (pass) settings view > windowBounds keeps the focus inside the budget and clamps at both ends [0.07ms]
@bryance/orch test: (pass) settings view > frame shows group headers, values, provenance tags, and the focused help [0.57ms]
@bryance/orch test: (pass) settings view > frame with a filter narrows the list and draws the filter line [0.07ms]
@bryance/orch test: (pass) settings view > frame reports an empty filter match instead of a blank screen [0.04ms]
@bryance/orch test: (pass) settings view > a long list is windowed with more-above/more-below markers [0.41ms]
@bryance/orch test: (pass) settings view > overlays render choices, checkboxes, and input with error [0.30ms]
@bryance/orch test: (pass) settings view > a checkbox row shows what its choice carries [0.07ms]
@bryance/orch test: (pass) settings view > displayValue keeps scalars bare and JSON-encodes shapes [0.04ms]
@bryance/orch test: 
@bryance/orch test: test\one-bind-for-the-unix-endpoint.test.ts:
@bryance/orch test: (pass) one bind for the unix endpoint (2.4) > the unix endpoint is claimed in exactly one place [0.07ms]
@bryance/orch test: 
@bryance/orch test: test\broker-daemon-hardening.test.ts:
@bryance/orch test: (pass) broker daemon hardening > concurrent drains do not redeliver one message id [231.45ms]
@bryance/orch test: (pass) broker daemon hardening > replay after the newest sequence is empty without a gap [184.19ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-pi.test.ts:
@bryance/orch test: (pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.34ms]
@bryance/orch test: 
@bryance/orch test: test\broker-daemon-hardening.test.ts:
@bryance/orch test: (pass) broker daemon hardening > malformed request gets an error and the connection remains usable [45.26ms]
@bryance/orch test: 
@bryance/orch test: test\settings-watch.test.ts:
@bryance/orch test: (pass) watchSettings > loads initially and applies a valid edit after the debounce [47.13ms]
@bryance/orch test: 
@bryance/orch test: test\one-bind-for-the-unix-endpoint.test.ts:
@bryance/orch test: (pass) one bind for the unix endpoint (2.4) > reclaiming a stale socket yields the endpoint a first bind produces [82.22ms]
@bryance/orch test: 
@bryance/orch test: test\one-control-dispatcher.test.ts:
@bryance/orch test: (pass) there is exactly one control dispatcher > no module outside src/control declares a control dispatcher [29.70ms]
@bryance/orch test: 
@bryance/orch test: test\presence-dirs-are-reaped-not-migrated.test.ts:
@bryance/orch test: (pass) a presence dir in the old shape is reaped, never migrated (J4) > the sweep REMOVES it rather than leaving it for a migration that never comes [26.85ms]
@bryance/orch test: (pass) a presence dir in the old shape is reaped, never migrated (J4) > nothing renames, rewrites or re-keys the old directory [23.17ms]
@bryance/orch test: (pass) a presence dir in the old shape is reaped, never migrated (J4) > a dead dir in the CURRENT shape is still reaped the ordinary way [178.33ms]
@bryance/orch test: 
@bryance/orch test: test\space-policy.test.ts:
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > placing an agent in a space nobody created is refused, not minted [231.76ms]
@bryance/orch test: 
@bryance/orch test: test\one-control-dispatcher.test.ts:
@bryance/orch test: (pass) there is exactly one control dispatcher > no dispatcher is exported under two names [23.18ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-pi.test.ts:
@bryance/orch test: (pass) PiAdapter > restricted workers explicitly load the bundled pi extension [0.22ms]
@bryance/orch test: (pass) PiAdapter > declares its lifecycle slash-commands [0.15ms]
@bryance/orch test: (pass) PiAdapter > reads state from the presence status through store helpers [25.30ms]
@bryance/orch test: (pass) PiAdapter > appends a steer message to the presence inbox [16.69ms]
@bryance/orch test: (pass) PiAdapter > writes a blocking answer to the presence answer file [33.09ms]
@bryance/orch test: (pass) PiAdapter > reads results.jsonl and falls back to the last assistant session text [32.23ms]
@bryance/orch test: (pass) PiAdapter > parses pi's supported model table without importing harness internals [0.52ms]
@bryance/orch test: 
@bryance/orch test: test\one-query-stack-over-the-connection.test.ts:
@bryance/orch test: (pass) one query stack over the connection (2.3) > the store exposes no raw-SQL port beside the typed one [0.05ms]
@bryance/orch test: (pass) one query stack over the connection (2.3) > nothing in the repo prepares a statement through the deleted port [35.24ms]
@bryance/orch test: 
@bryance/orch test: test\presence-inbox.test.ts:
@bryance/orch test: (pass) shared presence line writers > uses the socket acknowledgement without writing a fallback [29.73ms]
@bryance/orch test: 
@bryance/orch test: test\one-retry-policy.test.ts:
@bryance/orch test: (pass) one retry policy > retries flaky async and sync operations through the shared helper [0.56ms]
@bryance/orch test: (pass) one retry policy > uses the policy's declared backoff schedule [0.46ms]
@bryance/orch test: (pass) one retry policy > surfaces the last error after exactly attempts tries [0.41ms]
@bryance/orch test: 
@bryance/orch test: integration\cli-backends-herdr-headless.test.ts:
@bryance/orch test: (pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [306.38ms]
@bryance/orch test: (pass) headless common path: identity key -> presence > one adapter uses the same opaque key across headless and tmux routes [0.26ms]
@bryance/orch test: (pass) headless common path: identity key -> presence > a key carries no environment to read back out of it [0.09ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-unscoped-tasks.test.ts:
@bryance/orch test: (pass) doctor task scopes > a facade-enqueued task has exactly one typed scope [267.48ms]
@bryance/orch test: 
@bryance/orch test: test\nested-spawn-unleased.test.ts:
@bryance/orch test: (pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the middle agent's death leaves the grandchild unleased, held by nobody [277.42ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-roles.test.ts:
@bryance/orch test: (pass) adapter role composition > composes complete roles per adapter [0.26ms]
@bryance/orch test: 
@bryance/orch test: test\one-shape-only.test.ts:
@bryance/orch test: (pass) one current shape only > a live presence record with a malformed identity is a doctor failure [33.87ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-roles.test.ts:
@bryance/orch test: (pass) adapter role composition > answers with zero exit code when a shim role is absent [0.11ms]
@bryance/orch test: 
@bryance/orch test: test\one-shape-only.test.ts:
@bryance/orch test: (pass) one current shape only > doctor backend reports have one detection spelling [18.98ms]
@bryance/orch test: 
@bryance/orch test: test\unleased-stays-adoptable.test.ts:
@bryance/orch test: (pass) unleased and idle stays alive and adoptable (D3) > and it is still adoptable afterwards ΓÇö the point of keeping it [232.07ms]
@bryance/orch test: (pass) unleased and idle stays alive and adoptable (D3) > the sweep reaps only agents that actually ENDED, never merely unleased ones [240.47ms]
@bryance/orch test: (pass) unleased and idle stays alive and adoptable (D3) > repeated sweeps are stable: an unleased agent survives every one of them [251.89ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-session-env.test.ts:
@bryance/orch test: (pass) adapter-owned session environment > resolves each caller harness through the public session resolver [0.73ms]
@bryance/orch test: 
@bryance/orch test: test\presence-inbox.test.ts:
@bryance/orch test: (pass) shared presence line writers > writes a fallback if socket reporting fails, throws=%s [10.95ms]
@bryance/orch test: (pass) shared presence line writers > writes a fallback if socket reporting fails, throws=%s [12.86ms]
@bryance/orch test: (pass) shared presence line writers > inbox and ack drains use the same claimed rename path [25.65ms]
@bryance/orch test: (pass) shared presence line writers > pi appends and answers through shared presence writers [42.46ms]
@bryance/orch test: (pass) shared presence line writers > wrong status schema is rejected by shared status reader [26.36ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-session-env.test.ts:
@bryance/orch test: (pass) adapter-owned session environment > keeps harness env literals inside adapter modules [14.81ms]
@bryance/orch test: (pass) adapter-owned session environment > a registered adapter resolves a novel marker without resolver changes [0.27ms]
@bryance/orch test: 
@bryance/orch test: test\provenance.test.ts:
@bryance/orch test: (pass) the one provenance walk > ancestors are parent-first, root last [0.14ms]
@bryance/orch test: (pass) the one provenance walk > depth counts hops to the root [0.04ms]
@bryance/orch test: (pass) the one provenance walk > an unknown id is its own root at depth 0 [0.03ms]
@bryance/orch test: (pass) the one provenance walk > an unknown parent ends the chain instead of throwing [0.05ms]
@bryance/orch test: (pass) the one provenance walk > descendant is any depth, never self, never a sibling tree [0.05ms]
@bryance/orch test: (pass) the one provenance walk > a cycle terminates [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-names.test.ts:
@bryance/orch test: (pass) agent name validation > accepts lowercase names with hyphens and underscores [10.43ms]
@bryance/orch test: (pass) a live name is claimed and a dead one is released > a live agent holds its name against a second spawn [367.57ms]
@bryance/orch test: (pass) a live name is claimed and a dead one is released > a dead agent frees its name [400.88ms]
@bryance/orch test: (pass) a live name is claimed and a dead one is released > another space's agent never blocks a name here [265.58ms]
@bryance/orch test: (pass) name scope follows the agent's current space, not its birthplace > moving an agent moves the name it holds [288.40ms]
@bryance/orch test: (pass) name scope follows the agent's current space, not its birthplace > the collision names the agent by its minted id [284.46ms]
@bryance/orch test: 
@bryance/orch test: test\control-dispatch.test.ts:
@bryance/orch test: (pass) deliverControl > steers pi through its presence inbox [51.99ms]
@bryance/orch test: 
@bryance/orch test: test\agent-key-is-minted-id.test.ts:
@bryance/orch test: (pass) a driving session mints an id, it is not placed by name > the key an interactive session addresses itself by is a bare minted id [23.95ms]
@bryance/orch test: 
@bryance/orch test: test\settings-watch.test.ts:
@bryance/orch test: (pass) watchSettings > keeps the last-good settings, warns once, and recovers [440.36ms]
@bryance/orch test: 
@bryance/orch test: test\holder-death-costs-a-driver.test.ts:
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > the lease closes `expired` ΓÇö not `released`, because no caller held it [217.92ms]
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > the agent stays alive, unleased and adoptable ΓÇö nothing closes it [246.29ms]
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > it receives no new work: the death hands the agent to nobody [232.09ms]
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > expiry is recorded once and does not erase who held it [234.67ms]
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > clearing a dead holder's lease is never refused, and is idempotent [210.83ms]
@bryance/orch test: 
@bryance/orch test: test\settings-watch.test.ts:
@bryance/orch test: (pass) watchSettings > reloads on a touched reload.signal without a settings edit [46.27ms]
@bryance/orch test: 
@bryance/orch test: test\vocabulary.test.ts:
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > a role is derived from the tree, never stored [198.57ms]
@bryance/orch test: 
@bryance/orch test: test\identity-is-not-environment.test.ts:
@bryance/orch test: (pass) A1 ΓÇö identity carries no environment > Identity declares no plexer and no plexer grouping [0.11ms]
@bryance/orch test: (pass) A1 ΓÇö identity carries no environment > a key is the minted id itself, with no separator to split [0.32ms]
@bryance/orch test: (pass) A1 ΓÇö identity carries no environment > the module never spells the sentinels that stand in for a missing place [0.03ms]
@bryance/orch test: (pass) A1 ΓÇö identity carries no environment > minted ids are unique per spawn [1.58ms]
@bryance/orch test: 
@bryance/orch test: test\queue-scope.test.ts:
@bryance/orch test: (pass) queue scope invariants > cancel is allowed for the enqueuer or a lease holder of a targeted agent [259.73ms]
@bryance/orch test: (pass) queue scope invariants > cancel refuses a caller who is neither enqueuer nor targeted lease holder [320.42ms]
@bryance/orch test: (pass) queue scope invariants > edit is allowed only for the enqueuer while queued [253.12ms]
@bryance/orch test: (pass) queue scope invariants > an orphan has exactly take-on, leave, and reap resolutions [285.78ms]
@bryance/orch test: (pass) queue scope invariants > stale queued work is surfaced distinctly and never deleted by age [284.12ms]
@bryance/orch test: (pass) queue scope invariants > two concurrent claims have one winner and one one_open_attempt violation [245.23ms]
@bryance/orch test: 
@bryance/orch test: test\identity-self.test.ts:
@bryance/orch test: (pass) selfIdentity > returns the launch id without touching the store [4.27ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-unscoped-tasks.test.ts:
@bryance/orch test: (pass) doctor task scopes > the database rejects an unscoped task instead of keeping a legacy queue row [188.14ms]
@bryance/orch test: (pass) doctor task scopes > doctor lists unrunnable tasks and deliberate resolutions without deleting [185.87ms]
@bryance/orch test: 
@bryance/orch test: test\queue-cli-scope.test.ts:
@bryance/orch test: (pass) Cq2: all three scopes are choosable at enqueue > --agent, --pack and --space each select exactly one typed scope [202.24ms]
@bryance/orch test: 
@bryance/orch test: test\identity.test.ts:
@bryance/orch test: (pass) serializeIdentity / parseIdentity > a key is the minted id verbatim [0.11ms]
@bryance/orch test: (pass) serializeIdentity / parseIdentity > round-trips a minted id [0.07ms]
@bryance/orch test: (pass) serializeIdentity / parseIdentity > a key is one flat filesystem-safe segment with nothing to split [0.07ms]
@bryance/orch test: (pass) serializeIdentity / parseIdentity > two spawns never collide, so no plexer is needed to namespace them [0.66ms]
@bryance/orch test: (pass) isAgentId > accepts a minted id [0.03ms]
@bryance/orch test: (pass) isAgentId > rejects everything that is not one [0.05ms]
@bryance/orch test: (pass) malformed input > rejects a plexer-and-space key on parse [0.13ms]
@bryance/orch test: (pass) malformed input > rejects an empty key [0.02ms]
@bryance/orch test: (pass) malformed input > rejects a pane handle, a name, and a wrong-length id on serialize [0.08ms]
@bryance/orch test: (pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.03ms]
@bryance/orch test: (pass) malformed input > tryParseIdentity parses a minted id [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\store-queue.test.ts:
@bryance/orch test: (pass) queue facade storage > retention deletes only settled tasks older than the cutoff [357.61ms]
@bryance/orch test: (pass) queue facade storage > retention never removes a queued task based on its age [218.84ms]
@bryance/orch test: (pass) queue facade storage > agent-scoped tasks become unrunnable when their agent ends [212.97ms]
@bryance/orch test: (pass) queue facade storage > completed tasks stay done after their scope agent ends [267.72ms]
@bryance/orch test: (pass) queue facade storage > a dead orch does not make a pack task unrunnable while a member lives [214.11ms]
@bryance/orch test: (pass) queue facade storage > pack-scoped tasks become unrunnable when every pack member ends [203.92ms]
@bryance/orch test: 
@bryance/orch test: test\nested-spawn-unleased.test.ts:
@bryance/orch test: (pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the grandchild stays alive and adoptable, and keeps its own provenance [243.77ms]
@bryance/orch test: (pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the grandparent holding the middle agent does not extend to the grandchild [185.20ms]
@bryance/orch test: 
@bryance/orch test: test\launch-model-gate.test.ts:
@bryance/orch test: (pass) the model gate rules by harness membership, not by format > accepts a listed spec, with or without a thinking suffix [0.48ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a named space is orch's own id, and the workspace is its RECORDED home [195.50ms]
@bryance/orch test: 
@bryance/orch test: test\no-placement-row-over-the-composed-view.test.ts:
@bryance/orch test: (pass) no Placement row is reassembled over the composed view (2.1) > there is no second lookup module projecting the environment into a flat row [0.32ms]
@bryance/orch test: 
@bryance/orch test: test\launch-model-gate.test.ts:
@bryance/orch test: (pass) the model gate rules by harness membership, not by format > refuses a ladder shorthand and names what the harness does offer [0.27ms]
@bryance/orch test: (pass) the model gate rules by harness membership, not by format > accepts each harness's own vocabulary rather than one shared grammar [0.24ms]
@bryance/orch test: (pass) the model gate rules by harness membership, not by format > cannot check a harness that publishes no catalogue, and does not pretend to [0.04ms]
@bryance/orch test: (pass) the settings allowlist applies on top of harness membership > an empty allowlist restricts nothing beyond the harness list [13.80ms]
@bryance/orch test: (pass) the settings allowlist applies on top of harness membership > a configured allowlist refuses a listed model outside its patterns [9.78ms]
@bryance/orch test: (pass) the settings allowlist applies on top of harness membership > harness membership is checked before the allowlist, so the message names the harness [4.64ms]
@bryance/orch test: 
@bryance/orch test: test\launch-stamp.test.ts:
@bryance/orch test: (pass) canonical launch stamp > claude and codex launches produce the same status shape [0.90ms]
@bryance/orch test: 
@bryance/orch test: test\queue-space-replay.test.ts:
@bryance/orch test: (pass) queue replay keeps typed scope > stored scope offers pack work only to that pack [185.74ms]
@bryance/orch test: 
@bryance/orch test: test\pack-gets-its-own-home.test.ts:
@bryance/orch test: (pass) a pack gets its own marked plexer home (E8, E9, E10) > the home orch opens is MARKED as orch's, never a bare directory name [208.47ms]
@bryance/orch test: (pass) a pack gets its own marked plexer home (E8, E9, E10) > a space's home and a pack's home use the SAME role and different tables [284.18ms]
@bryance/orch test: (pass) a pack gets its own marked plexer home (E8, E9, E10) > an environment that holds nothing answers with an absence, and stores none [201.03ms]
@bryance/orch test: (pass) a pack gets its own marked plexer home (E8, E9, E10) > a home recorded in another plexer is not this one's to drive [182.28ms]
@bryance/orch test: (pass) a pack gets its own marked plexer home (E8, E9, E10) > closing a pack's home clears the row, so the next open is a fresh one [193.73ms]
@bryance/orch test: 
@bryance/orch test: test\close-authority.test.ts:
@bryance/orch test: (pass) who may end an agent (D7) > an orch may close the slaves it owns, at any depth [214.03ms]
@bryance/orch test: (pass) who may end an agent (D7) > an agent may NOT close another orch's slaves, and is told whose it is [207.07ms]
@bryance/orch test: (pass) who may end an agent (D7) > an agent may not close a peer orch either [230.05ms]
@bryance/orch test: (pass) who may end an agent (D7) > an agent may always close itself ΓÇö acting on yourself is not driving a fleet [250.48ms]
@bryance/orch test: (pass) who may end an agent (D7) > the LEASE never decides it: a foreign holder does not block the owner [203.71ms]
@bryance/orch test: (pass) who may end an agent (D7) > a provenance cycle terminates instead of hanging [220.67ms]
@bryance/orch test: 
@bryance/orch test: test\environment-dictates-what-is-possible.test.ts:
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > a MOVE is a new environment record, and what is possible follows it at once [179.61ms]
@bryance/orch test: 
@bryance/orch test: integration\close-always.test.ts:
@bryance/orch test: {"closed":["panename01","panekey001","paneid0001"],"results":[{"target":"panename01","handle":"pane-name","outcome":"done","error":null},{"target":"panekey001","handle":"pane-key","outcome":"done","error":null},{"target":"paneid0001","handle":"pane-id","outcome":"done","error":null}],"requested":3,"ok":3,"stream":false}
@bryance/orch test: (pass) close always works > closes a foreign-space target by name, key, or pane id [505.13ms]
@bryance/orch test: 
@bryance/orch test: test\store-rebuild-schema.test.ts:
@bryance/orch test: (pass) rebuild schema > rebuild DDL inventory is exact [149.46ms]
@bryance/orch test: 
@bryance/orch test: test\settings-watch.test.ts:
@bryance/orch test: (pass) watchSettings > stop prevents further callbacks [410.31ms]
@bryance/orch test: 
@bryance/orch test: test\vocabulary.test.ts:
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > no table carries a role column: there is nothing to disagree with the tree [161.74ms]
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > renaming an agent or moving its lease never changes its role [215.39ms]
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > every role term orch displays comes from the one map [0.13ms]
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > no module outside the map spells a role term into a user-facing string [35.81ms]
@bryance/orch test: 
@bryance/orch test: test\wall-single-owner.test.ts:
@bryance/orch test: (pass) space wall ownership > keeps the wall decision primitive in one source module [25.02ms]
@bryance/orch test: 
@bryance/orch test: test\agent-view.test.ts:
@bryance/orch test: (pass) the agent composer > each axis composes independently, and moving one leaves identity untouched [321.18ms]
@bryance/orch test: (pass) the agent composer > tuning is not environment: it survives a move [227.15ms]
@bryance/orch test: (pass) the agent composer > ownership reads as a live lease, and a released one is not ownership [229.28ms]
@bryance/orch test: (pass) the agent composer > provenance is on the view and is not the same fact as ownership [189.94ms]
@bryance/orch test: (pass) the agent composer > provenance carries the spawner's name, read as a join and never stored twice [256.43ms]
@bryance/orch test: (pass) the agent composer > an agent with no spawner reports no spawner name [187.86ms]
@bryance/orch test: (pass) the agent composer > agentViews is oldest-first and liveAgentViews drops ended agents [192.81ms]
@bryance/orch test: (pass) the agent composer > the axis list is the only place every axis is enumerated [0.64ms]
@bryance/orch test: (pass) the agent composer > the composed shape is exactly the axis list, with nothing extra and nothing missing [170.41ms]
@bryance/orch test: (pass) the agent composer > an unknown agent is null, never an empty shell [172.84ms]
@bryance/orch test: 
@bryance/orch test: test\queue.test.ts:
@bryance/orch test: (pass) queue facade on tasks and attempts > malformed task options are refused instead of handed back as TaskOptions [229.14ms]
@bryance/orch test: 
@bryance/orch test: test\web-projection.test.ts:
@bryance/orch test: (pass) web fleet projection > uses the orch agent name and falls back to its minted id, never the plexer agent name [0.79ms]
@bryance/orch test: (pass) web fleet projection > uses the orch space name and never exposes the plexer space id [0.19ms]
@bryance/orch test: (pass) web fleet projection > unscoped agents use a neutral space label when no orch space exists [0.13ms]
@bryance/orch test: (pass) web fleet projection > history groups ended agents by provenance root, never by their leases [0.23ms]
@bryance/orch test: (pass) web fleet projection > live projection excludes ended rows and keeps unleased live agents out of history [0.17ms]
@bryance/orch test: (pass) live views group by lease (C7) > a space encompasses its orchs, and each orch encompasses the agents it holds [0.18ms]
@bryance/orch test: (pass) live views group by lease (C7) > an ADOPTED agent is filed under the orch holding it now, never under its spawner [0.12ms]
@bryance/orch test: (pass) live views group by lease (C7) > an UNHELD agent is grouped as unheld, not hidden and not invented an orch [0.11ms]
@bryance/orch test: (pass) live views group by lease (C7) > the space still lists every live agent flat, so the lease grouping adds a level and hides nothing [0.11ms]
@bryance/orch test: (pass) live views group by lease (C7) > history does NOT gain a lease level: a pack stays grouped by provenance [0.12ms]
@bryance/orch test: (pass) the orphan bucket holds every undriven agent (G9) > a lease whose holder is DEAD is an orphan, not live work [0.24ms]
@bryance/orch test: (pass) the orphan bucket holds every undriven agent (G9) > an agent with no lease at all is still an orphan [0.20ms]
@bryance/orch test: (pass) the orphan bucket holds every undriven agent (G9) > the two buckets never overlap and never lose an agent [0.51ms]
@bryance/orch test: (pass) the orphan bucket holds every undriven agent (G9) > a dead holder is not shown as an orch driving work in the lease grouping either [0.17ms]
@bryance/orch test: 
@bryance/orch test: test\settings.test.ts:
@bryance/orch test: (pass) loadSettings > refuses to invent settings when settings.json is missing [5.94ms]
@bryance/orch test: 
@bryance/orch test: test\no-placement-row-over-the-composed-view.test.ts:
@bryance/orch test: (pass) no Placement row is reassembled over the composed view (2.1) > the space wall reads the OPEN space interval, so a moved agent is walled by where it IS [220.52ms]
@bryance/orch test: (pass) no Placement row is reassembled over the composed view (2.1) > a string that names no registered agent is in no space rather than an error [133.95ms]
@bryance/orch test: 
@bryance/orch test: test\pack-membership.test.ts:
@bryance/orch test: (pass) a pack is the provenance root > a registered session is an orch of a pack of one [228.20ms]
@bryance/orch test: 
@bryance/orch test: test\ambiguous-target-says-what-to-do.test.ts:
@bryance/orch test: (pass) an ambiguous target names the failure and the way out (U3) > the message names the failure, the target string, and every candidate [0.23ms]
@bryance/orch test: (pass) an ambiguous target names the failure and the way out (U3) > it says what to send instead, so the caller is not left guessing [0.03ms]
@bryance/orch test: (pass) an ambiguous target names the failure and the way out (U3) > it is a refusal, not an exit ΓÇö the caller can act on it [0.04ms]
@bryance/orch test: (pass) an ambiguous target names the failure and the way out (U3) > resolveAgentView raises that same one message [0.34ms]
@bryance/orch test: 
@bryance/orch test: test\close-is-keyed-by-agent-id.test.ts:
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > an agent whose pane is gone is never handed to the plexer as a pane [253.62ms]
@bryance/orch test: 
@bryance/orch test: test\no-sibling-relay.test.ts:
@bryance/orch test: (pass) a worker with no reachable spawner does not relay (L6) > an unset spawner refuses, and the refusal names the agent's own report path [17.05ms]
@bryance/orch test: (pass) a worker with no reachable spawner does not relay (L6) > the refusal never suggests another agent as an alternative route [16.26ms]
@bryance/orch test: (pass) a worker with no reachable spawner does not relay (L6) > a spawner that is stamped but has no inbox refuses by NAME and still says to report [8.45ms]
@bryance/orch test: 
@bryance/orch test: test\no-stderr-writes.test.ts:
@bryance/orch test: (pass) orch has one diagnosis channel (the logger) and one output channel (stdout) > no runtime source writes to process.stderr [41.52ms]
@bryance/orch test: (pass) orch has one diagnosis channel (the logger) and one output channel (stdout) > the scan actually covers the tree it claims to [2.64ms]
@bryance/orch test: 
@bryance/orch test: test\queue-cli-scope.test.ts:
@bryance/orch test: (pass) Cq2: all three scopes are choosable at enqueue > a name resolves to one id, and an ambiguous name asks for the id [196.53ms]
@bryance/orch test: (pass) Cq2: all three scopes are choosable at enqueue > two scope flags at once are refused [195.28ms]
@bryance/orch test: (pass) Cq9: reading the queue is open > listing and history carry no caller and hide no other pack's work [271.54ms]
@bryance/orch test: 
@bryance/orch test: test\work-loop-binding.test.ts:
@bryance/orch test: (pass) work loop attempt binding > statusSpeaksForTask verifies the current attempt dispatch id [0.33ms]
@bryance/orch test: 
@bryance/orch test: test\notifier-adapters.test.ts:
@bryance/orch test: (pass) notifier registry and built-in adapters > reports notifier reachability from one configured entry [1.22ms]
@bryance/orch test: (pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [2.28ms]
@bryance/orch test: (pass) notifier registry and built-in adapters > a notifier error is the caller's real error [0.58ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [46.56ms]
@bryance/orch test: 
@bryance/orch test: test\notify-ding.test.ts:
@bryance/orch test: (pass) notify/ding > the sound sink is a declared sink that takes no configuration [0.37ms]
@bryance/orch test: (pass) notify/ding > this host names the players it would use, and says how to get one [0.17ms]
@bryance/orch test: (pass) notify/ding > a command string runs through the host's own shell; argv is passed through untouched [0.11ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-lifecycle.test.ts:
@bryance/orch test: (pass) daemon lifecycle > acquires once and refuses a second live owner [2573.91ms]
@bryance/orch test: 
@bryance/orch test: test\work-loop-binding.test.ts:
@bryance/orch test: (pass) Cq4: results go to the enqueuer, not the runner > every task event the work loop publishes is keyed to whoever enqueued it [320.59ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) answer via the control dispatcher > answers, rather than failing, when the adapter composes no question role [28.34ms]
@bryance/orch test: (pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [87.68ms]
@bryance/orch test: 
@bryance/orch test: test\status-unleased.test.ts:
@bryance/orch test: (pass) status owner rendering > leased by a live holder shows that holder [2761.48ms]
@bryance/orch test: 
@bryance/orch test: test\control-dispatch.test.ts:
@bryance/orch test: 100 |     const key = target();
@bryance/orch test: 101 |     const dir = presence(directory, key, "claude");
@bryance/orch test: 102 |     seedAgent(key, { adapter: "claude", backend: "headless", handle: key });
@bryance/orch test: 103 | 
@bryance/orch test: 104 |     const outcome = await deliverControl(key, { kind: "steer", text: "hello claude" });
@bryance/orch test: 105 |     expect(outcome).toEqual({ outcome: "answer", reason: "no-pane", text: `${key} has no pane; steer does not apply.` });
@bryance/orch test:                           ^
@bryance/orch test: error: expect(received).toEqual(expected)
@bryance/orch test: 
@bryance/orch test:   {
@bryance/orch test:     "outcome": "answer",
@bryance/orch test: -   "reason": "no-pane",
@bryance/orch test: -   "text": "4q3hr7n4uo has no pane; steer does not apply.",
@bryance/orch test: +   "reason": "not-placed",
@bryance/orch test: +   "text": "4q3hr7n4uo is placed nowhere; steer does not apply.",
@bryance/orch test:   }
@bryance/orch test: 
@bryance/orch test: - Expected  - 2
@bryance/orch test: + Received  + 2
@bryance/orch test: 
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\control-dispatch.test.ts:105:21)
@bryance/orch test: 112 |     const key = target();
@bryance/orch test: 113 |     const dir = presence(directory, key, "claude");
@bryance/orch test: 114 |     seedAgent(key, { adapter: "claude", backend: "headless", handle: key });
@bryance/orch test: 115 | 
@bryance/orch test: 116 |     const outcome = await deliverControl(key, { kind: "run", text: "hello claude" });
@bryance/orch test: 117 |     expect(outcome).toEqual({ outcome: "answer", reason: "no-pane", text: `${key} has no pane; run does not apply.` });
@bryance/orch test:                           ^
@bryance/orch test: error: expect(received).toEqual(expected)
@bryance/orch test: 
@bryance/orch test:   {
@bryance/orch test:     "outcome": "answer",
@bryance/orch test: -   "reason": "no-pane",
@bryance/orch test: -   "text": "ec1oxvghod has no pane; run does not apply.",
@bryance/orch test: +   "reason": "not-placed",
@bryance/orch test: +   "text": "ec1oxvghod is placed nowhere; run does not apply.",
@bryance/orch test:   }
@bryance/orch test: 
@bryance/orch test: - Expected  - 2
@bryance/orch test: + Received  + 2
@bryance/orch test: 
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\control-dispatch.test.ts:117:21)
@bryance/orch test: 128 |     presence(directory, key, "claude");
@bryance/orch test: 129 | 
@bryance/orch test: 130 |     expect(claudeAdapter.inboxSteering).toBeNull();
@bryance/orch test: 131 |     expect(claudeAdapter.modelControl).toBeNull();
@bryance/orch test: 132 | 
@bryance/orch test: 133 |     expect(await deliverControl(key, { kind: "steer", text: "nope" })).toEqual({
@bryance/orch test:                                                                              ^
@bryance/orch test: error: expect(received).toEqual(expected)
@bryance/orch test: 
@bryance/orch test:   {
@bryance/orch test:     "outcome": "answer",
@bryance/orch test: -   "reason": "no-pane",
@bryance/orch test: -   "text": "p9ocl6g7zy has no pane; steer does not apply.",
@bryance/orch test: +   "reason": "not-placed",
@bryance/orch test: +   "text": "p9ocl6g7zy is placed nowhere; steer does not apply.",
@bryance/orch test:   }
@bryance/orch test: 
@bryance/orch test: - Expected  - 2
@bryance/orch test: + Received  + 2
@bryance/orch test: 
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\control-dispatch.test.ts:133:72)
@bryance/orch test: (pass) deliverControl > refuses to steer a pane awaiting an answer, naming the primitive that lands [32.84ms]
@bryance/orch test: (pass) deliverControl > still answers a pane awaiting an answer [31.36ms]
@bryance/orch test: (pass) deliverControl > a run dispatch is not blocked by an asking pane [25.73ms]
@bryance/orch test: (fail) deliverControl > does not fall back from a keys strategy to the orch channel [199.91ms]
@bryance/orch test: (fail) deliverControl > a run to a keys-strategy agent with no pane is answered, never queued on the channel [208.57ms]
@bryance/orch test: (fail) deliverControl > refuses steer and model on an adapter that composes neither role [8.81ms]
@bryance/orch test: (pass) deliverControl > requires presence for inbox delivery [207.01ms]
@bryance/orch test: (pass) deliverControl > refuses inbox delivery to an agent whose bridge never registered [209.84ms]
@bryance/orch test: (pass) deliverControl > refuses inbox delivery to an agent whose process is gone [266.50ms]
@bryance/orch test: 
@bryance/orch test: test\queue-reaping.test.ts:
@bryance/orch test: (pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > a failed task whose scope is gone is unrunnable and survives every retention sweep [306.09ms]
@bryance/orch test: 
@bryance/orch test: integration\presence-schema.test.ts:
@bryance/orch test: (pass) presence status schema > reads a spawned identity without placement fields in status [194.75ms]
@bryance/orch test: 
@bryance/orch test: test\retention.test.ts:
@bryance/orch test: (pass) retention sweep > uses each table's own window and keeps queued and claimed tasks [590.93ms]
@bryance/orch test: (pass) retention sweep > returns zero counts when every row is inside its window [246.46ms]
@bryance/orch test: (pass) retention sweep > continues sweeping when one table delete fails [308.51ms]
@bryance/orch test: (pass) retention sweep > reaps expired agents by identity, taking every satellite with them [246.07ms]
@bryance/orch test: (pass) retention sweep > reaps dead dirs by recorded instants, not a fresh directory mtime [191.52ms]
@bryance/orch test: (pass) retention sweep > keeps dead dirs with a newer recorded instant despite an old mtime [153.08ms]
@bryance/orch test: (pass) retention sweep > reaps malformed dead dirs with no recorded instant [149.87ms]
@bryance/orch test: (pass) retention sweep > keeps result-only recorded instant despite an old mtime [162.32ms]
@bryance/orch test: (pass) retention sweep > never reaps a live presence dir regardless of age [214.39ms]
@bryance/orch test: (pass) retention sweep > sweeps old logs but preserves logs for live agents [190.24ms]
@bryance/orch test: 
@bryance/orch test: test\environment-dictates-what-is-possible.test.ts:
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > a move closes the interval it left, so history says WHERE it was and WHEN [184.81ms]
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > moving one axis leaves every other axis exactly where it was [198.05ms]
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > an UPGRADE is a NEW host_plexers row, not an overwrite of the old one [188.70ms]
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > re-declaring the SAME version is not an upgrade and opens no second row [210.17ms]
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > nothing anywhere records what an agent CAN do [123.37ms]
@bryance/orch test: 
@bryance/orch test: test\broker-governance.test.ts:
@bryance/orch test: (pass) daemon governWrite enforcement > an unscoped actor is refused while a live orch holds the lease [1611.56ms]
@bryance/orch test: 
@bryance/orch test: test\errno-guard.test.ts:
@bryance/orch test: (pass) errnoCode reads a syscall error code, and only a real one > returns the code of a real node syscall error [0.25ms]
@bryance/orch test: (pass) errnoCode reads a syscall error code, and only a real one > a plain Error carries no code, so there is none to report [0.05ms]
@bryance/orch test: (pass) errnoCode reads a syscall error code, and only a real one > a non-object never yields a code instead of crashing on it [0.05ms]
@bryance/orch test: (pass) errnoCode reads a syscall error code, and only a real one > a code-shaped field of the wrong type is not a code [0.02ms]
@bryance/orch test: (pass) isAgentState verifies the state rather than asserting it > accepts a declared state [0.09ms]
@bryance/orch test: (pass) isAgentState verifies the state rather than asserting it > rejects anything not declared, including non-strings [0.05ms]
@bryance/orch test: 
@bryance/orch test: test\retention.test.ts:
@bryance/orch test: (pass) retention sweep > does not sweep again one minute after the first tick [203.01ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) steer acknowledgements > waits for the fallback reader ack [250.18ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > with no space, orch INSIDE the plexer spawns beside itself and opens nothing [153.29ms]
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a caller INSIDE the plexer with NO orch identity (a human's pane) spawns beside itself [210.81ms]
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > with no space and orch OUTSIDE the plexer, the PACK gets its own marked home [204.47ms]
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > the same pack spawning again reuses its home and asks the human nothing [224.86ms]
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > an environment that holds nothing answers with an absence, never a refusal [181.41ms]
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a space with no home HERE places the fleet without borrowing another plexer's [233.34ms]
@bryance/orch test: 
@bryance/orch test: test\event-identity.test.ts:
@bryance/orch test: (pass) published event identity > stamps a per-agent ordinal so a redelivery is recognizable [0.67ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-reconnect.test.ts:
@bryance/orch test: (pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [2148.04ms]
@bryance/orch test: 
@bryance/orch test: test\settings.test.ts:
@bryance/orch test: (pass) loadSettings > requires a top-level runtime and never defaults it [20.34ms]
@bryance/orch test: (pass) loadSettings > rejects an unrecognized runtime naming the accepted values [10.64ms]
@bryance/orch test: (pass) loadSettings > rejects a runtime misplaced under defaults [21.81ms]
@bryance/orch test: (pass) loadSettings > reads the declared runtime [13.95ms]
@bryance/orch test: (pass) loadSettings > parses every supported settings section [33.90ms]
@bryance/orch test: (pass) loadSettings > rejects a file without the current schemaVersion [11.34ms]
@bryance/orch test: (pass) loadSettings > rejects invalid JSON loudly [6.92ms]
@bryance/orch test: (pass) loadSettings > names the key path for invalid fields [10.25ms]
@bryance/orch test: (pass) loadSettings > rejects unknown settings keys [12.21ms]
@bryance/orch test: (pass) loadSettings > rejects removed spawn cap setting by name [31.30ms]
@bryance/orch test: (pass) loadSettings > parses models.allowed as a per-harness pattern map [16.38ms]
@bryance/orch test: (pass) loadSettings > rejects renamed fleet keys and loads their replacements [42.53ms]
@bryance/orch test: (pass) loadSettings > rejects old settings keys [75.74ms]
@bryance/orch test: (pass) loadSettings > rejects legacy notify type and unknown ids [34.01ms]
@bryance/orch test: (pass) loadSettings > applies every settings default when sections are absent [19.24ms]
@bryance/orch test: (pass) loadSettings > preserves configured values while defaulting each missing section value [67.54ms]
@bryance/orch test: (pass) loadSettings > rejects non-positive and non-integer retention windows [24.04ms]
@bryance/orch test: (pass) loadSettings > rejects a host without dest [7.45ms]
@bryance/orch test: (pass) loadSettings > rejects an unknown id in enabled.adapters [10.30ms]
@bryance/orch test: (pass) loadSettings > rejects defaults.adapter not present in enabled.adapters [15.58ms]
@bryance/orch test: (pass) loadSettings > rejects when settings.json is absent but a legacy config.toml exists [4.04ms]
@bryance/orch test: (pass) allowedModelPatterns > restricts nothing when settings contain no patterns [3.97ms]
@bryance/orch test: (pass) allowedModelPatterns > returns the configured patterns when set [9.42ms]
@bryance/orch test: (pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or enabled entry [19.76ms]
@bryance/orch test: (pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [31.46ms]
@bryance/orch test: (pass) writeSettingsRuntime > a different runtime replaces the single value in place [21.23ms]
@bryance/orch test: (pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [13.26ms]
@bryance/orch test: (pass) reapUnreadableSettings > leaves a readable file alone [5.83ms]
@bryance/orch test: (pass) writeSettingsEnabled > round-trips both provider arrays [26.79ms]
@bryance/orch test: (pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [61.66ms]
@bryance/orch test: (pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [25.42ms]
@bryance/orch test: (pass) writeSettingsDefault > is idempotent when rewriting the same value [24.48ms]
@bryance/orch test: (pass) writeSettingsDefault > refuses to write through an out-of-version settings file [9.12ms]
@bryance/orch test: (pass) writeSettingsDefault > switches defaults.adapter between two enabled ids and loads clean [29.43ms]
@bryance/orch test: (pass) writeSettingsFullTree > round-trips defaults without inventing max_agents_total [13.32ms]
@bryance/orch test: (pass) settings precedence > uses the fallback when env and settings.json omit a setting [5.12ms]
@bryance/orch test: (pass) settings precedence > uses the settings.json value over the fallback [12.52ms]
@bryance/orch test: (pass) settings precedence > uses the ORCH_* environment value over settings.json [9.57ms]
@bryance/orch test: (pass) settings precedence > uses an explicit flag override over the environment [0.17ms]
@bryance/orch test: (pass) resolveSetting > uses flag, environment coercion, settings, then fallback in precedence order [0.13ms]
@bryance/orch test: (pass) resolveWithSource > rejects an environment value with the wrong shape [0.16ms]
@bryance/orch test: (pass) resolveWithSource > reports the winning source at each precedence level [0.16ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > loadSettings parses a per-harness preferred quicklist [20.88ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > an absent preferred map normalizes to an empty map, not to allowed [10.65ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > writing one list leaves the other byte-for-value intact [54.59ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > an empty list is recorded as no list at all, so a cleared picker really clears [30.90ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > the full tree seeds both maps when absent and preserves both when present [31.60ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > the allowlist gate reads models.allowed only [5.10ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) steer acknowledgements > fails rather than reporting a queued steer as delivered [312.05ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-policy.test.ts:
@bryance/orch test: (pass) spawn policy caps > launch env uses the minted agent id name [0.38ms]
@bryance/orch test: 
@bryance/orch test: test\cross-pack-result-delivery.test.ts:
@bryance/orch test: (pass) results go to the enqueuer across packs (Cq4) > a result reaches the FOREIGN enqueuer's inbox, not the runner's [267.86ms]
@bryance/orch test: 
@bryance/orch test: test\work-loop-identity.test.ts:
@bryance/orch test: (pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > a claim records the minted agent id, not the presence key [253.23ms]
@bryance/orch test: 
@bryance/orch test: test\retention.test.ts:
@bryance/orch test: (pass) retention sweep > prunes orch's own logs past the age cap [173.34ms]
@bryance/orch test: (pass) retention sweep > prunes orch's own logs past the size cap even when freshly written [158.45ms]
@bryance/orch test: 
@bryance/orch test: test\setup-flags.test.ts:
@bryance/orch test: (pass) setup model flags > rejects a bare model when multiple harnesses are selected [0.61ms]
@bryance/orch test: (pass) setup model flags > binds each model flag to its own harness [0.33ms]
@bryance/orch test: (pass) setup model flags > allows a bare model for one harness [0.42ms]
@bryance/orch test: (pass) setup model flags > rejects a model bound to an unselected harness [0.97ms]
@bryance/orch test: (pass) setup model flags > rejects duplicate model flags for one harness [0.45ms]
@bryance/orch test: 
@bryance/orch test: test\event-identity.test.ts:
@bryance/orch test: (pass) the work loop is not a second presence-transition source > an agent state change publishes nothing from the queue loop [265.17ms]
@bryance/orch test: 
@bryance/orch test: test\close-is-keyed-by-agent-id.test.ts:
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > an agent whose pane is gone still ends, and reports done [237.80ms]
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > what a human is told they closed is the agent, not the plexer's coordinate [294.05ms]
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > the --json closed list names agents, so a caller can map it back [262.54ms]
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > the plexer is still handed the real handle when there IS a pane [242.78ms]
@bryance/orch test: 
@bryance/orch test: test\events-scope-notice.test.ts:
@bryance/orch test: (pass) events scope notice > names the default live scope and its wideners [0.13ms]
@bryance/orch test: 
@bryance/orch test: test\pack-membership.test.ts:
@bryance/orch test: (pass) a pack is the provenance root > membership is inherited from the spawner at any depth, never re-rooted [232.43ms]
@bryance/orch test: (pass) a pack is the provenance root > every agent is in exactly one pack, and two packs never share a member [309.93ms]
@bryance/orch test: (pass) a pack is the provenance root > a pack of one grows without re-rooting, and the root stays the orch [228.41ms]
@bryance/orch test: (pass) a pack is the provenance root > a lease or a move never changes which pack an agent is in [261.73ms]
@bryance/orch test: (pass) a pack is the provenance root > an agent cannot be spawned by someone who does not exist [158.92ms]
@bryance/orch test: 
@bryance/orch test: test\events-scope-notice.test.ts:
@bryance/orch test: (pass) events scope notice > names the all-agent live scope and its history widener [0.13ms]
@bryance/orch test: (pass) events scope notice > a redirected stream is a harness reading transitions, and gets no banner [0.02ms]
@bryance/orch test: (pass) events scope notice > does not announce when history was requested [4.79ms]
@bryance/orch test: (pass) events scope notice > writes one notice before starting the live transport [0.19ms]
@bryance/orch test: (pass) events scope notice > does not write a notice when history was requested [0.07ms]
@bryance/orch test: (pass) events scope notice > says so when the caller owns no agents [0.09ms]
@bryance/orch test: (pass) events scope notice > stays out of a --json stream, which a parser is reading [0.06ms]
@bryance/orch test: (pass) events scope notice > does not announce when explicit targets were requested [0.07ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) answer over the daemon control socket > fails when the answer is written but never consumed [281.17ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-policy.test.ts:
@bryance/orch test: (pass) spawn policy caps > worker prompt depth > root worker maySpawn follows max_depth [5.02ms]
@bryance/orch test: (pass) spawn policy caps > allows a pack spawn while under the cap [1.42ms]
@bryance/orch test: (pass) spawn policy caps > blocks an at-cap spawn and offers dispatch or the pack queue [0.31ms]
@bryance/orch test: (pass) spawn policy caps > a slave may not spawn by default: fleet.max_depth is 1 [0.12ms]
@bryance/orch test: (pass) spawn policy caps > fleet.max_depth 2 lets a slave spawn and refuses its child [0.26ms]
@bryance/orch test: (pass) spawn policy caps > reads a pack cap override from settings [30.62ms]
@bryance/orch test: (pass) spawn policy caps > a refused cmdSpawn makes no name, worktree, registry, or queue mutation [251.98ms]
@bryance/orch test: 
@bryance/orch test: test\parse-target.test.ts:
@bryance/orch test: (pass) <host>/<target> grammar > keeps targets without a host unchanged [0.29ms]
@bryance/orch test: (pass) <host>/<target> grammar > parses configured host prefixes [0.08ms]
@bryance/orch test: (pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.24ms]
@bryance/orch test: (pass) <host>/<target> grammar > rejects empty hosts and targets [0.08ms]
@bryance/orch test: (pass) <host>/<target> grammar > formats local and host-prefixed targets [0.06ms]
@bryance/orch test: 
@bryance/orch test: test\store-identity.test.ts:
@bryance/orch test: (pass) hello agent identity rows > reuses the live agent for the same session process and mints for another [223.26ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) answer over the daemon control socket > does not report success when the answer role is unavailable [171.84ms]
@bryance/orch test: 
@bryance/orch test: test\peer-identity.test.ts:
@bryance/orch test: (pass) spawner identity > a bare operator with no session markers is just the operator [2.98ms]
@bryance/orch test: 
@bryance/orch test: test\queue-reaping.test.ts:
@bryance/orch test: (pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > unrunnable is about who is alive now ΓÇö a new pack member makes it claimable again [233.71ms]
@bryance/orch test: (pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > stale is surfaced beside its state and never deleted on age [230.79ms]
@bryance/orch test: (pass) Cq12: an orphaned task has take-on, leave and reap, all deliberate > take-on re-scopes to the taker's own pack and the work becomes claimable there [206.93ms]
@bryance/orch test: (pass) Cq12: an orphaned task has take-on, leave and reap, all deliberate > take-on refuses a taker that is not itself live [215.56ms]
@bryance/orch test: 
@bryance/orch test: test\work-loop-identity.test.ts:
@bryance/orch test: (pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > an idle process with no registered agent row is never handed pack work [212.09ms]
@bryance/orch test: (pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > Cq1: the pack drains its own queue with its orch dead and no lease in force [271.72ms]
@bryance/orch test: 
@bryance/orch test: test\every-agent-has-an-inbox.test.ts:
@bryance/orch test: (pass) every agent has an inbox > a paned agent and a capless one are delivered to identically [286.31ms]
@bryance/orch test: 
@bryance/orch test: test\close-reports-every-target.test.ts:
@bryance/orch test: (pass) close reports an outcome for every target it was given (U2) > --json carries a per-target outcome, not just the successes [283.25ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [166.62ms]
@bryance/orch test: 
@bryance/orch test: test\dispatch-channel-first.test.ts:
@bryance/orch test: (pass) work reaches an agent through orch's channel, with the pane only a shortcut > a headless agent receives a dispatch through the inbox, not a no-pane answer [37.37ms]
@bryance/orch test: 
@bryance/orch test: test\store-identity.test.ts:
@bryance/orch test: (pass) hello agent identity rows > first sight creates a named root agent and open process row [198.34ms]
@bryance/orch test: 
@bryance/orch test: test\dispatch-channel-first.test.ts:
@bryance/orch test: (pass) work reaches an agent through orch's channel, with the pane only a shortcut > a steer reaches a paneless agent the same way [32.31ms]
@bryance/orch test: 
@bryance/orch test: test\cross-pack-result-delivery.test.ts:
@bryance/orch test: (pass) results go to the enqueuer across packs (Cq4) > the delivered line carries the result payload, not just a notification [217.63ms]
@bryance/orch test: (pass) results go to the enqueuer across packs (Cq4) > a FAILED task still reports back ΓÇö silence is the worst outcome [223.86ms]
@bryance/orch test: (pass) results go to the enqueuer across packs (Cq4) > an enqueuer with no inbox is not an error ΓÇö delivery is best-effort, the task stays settled [218.05ms]
@bryance/orch test: 
@bryance/orch test: test\work-notify.test.ts:
@bryance/orch test: (pass) orch presence notifications > delivers a presence transition through a configured command sink [112.95ms]
@bryance/orch test: 
@bryance/orch test: integration\presence-schema.test.ts:
@bryance/orch test: (pass) presence status schema > orch status JSON exposes the agent status fields [116.50ms]
@bryance/orch test: (pass) presence status schema > status and list report the same agent identity [277.33ms]
@bryance/orch test: (pass) presence status schema > mixed pi and Claude status rows carry the same status field set [104.17ms]
@bryance/orch test: (pass) presence status schema > rejects a status record that carries no schema stamp [124.32ms]
@bryance/orch test: (pass) presence status schema > rejects a status record stamped with a non-current schema [92.84ms]
@bryance/orch test: (pass) presence status schema > rejects a current-schema record carrying placement fields [122.77ms]
@bryance/orch test: (pass) presence status schema > a malformed record is skipped without hiding the valid records beside it [96.15ms]
@bryance/orch test: (pass) presence status schema > the four facts are recorded apart and composed back onto the minted id [144.74ms]
@bryance/orch test: 
@bryance/orch test: test\dispatch-prompt-file.test.ts:
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > --file is parsed off the positionals [0.21ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-credential.test.ts:
@bryance/orch test: (skip) the token file is the whole credential > the token is 0600
@bryance/orch test: 
@bryance/orch test: test\spawn-preferred-models.test.ts:
@bryance/orch test: (pass) the preferred quicklist reaches every launch route > a pane spawn hands the exact array to the backend [283.09ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-credential.test.ts:
@bryance/orch test: (skip) the token file is the whole credential > $ORCH_DIR is 0700, so same-uid is a boundary the filesystem enforces
@bryance/orch test: (skip) the token file is the whole credential > a token left loose by an earlier run is tightened, not trusted
@bryance/orch test: (skip) the token file is the whole credential > a runtime directory the daemon creates is 0700 too
@bryance/orch test: (pass) the token file is the whole credential > nothing else is enrolled: there is no allowlist beside the token [46.24ms]
@bryance/orch test: 
@bryance/orch test: integration\close-always.test.ts:
@bryance/orch test: Could not close survives01: pane-survives is still listed by headless after the close
@bryance/orch test: {"closed":[],"results":[{"target":"survives01","handle":"pane-survives","outcome":"error","error":"pane-survives is still listed by headless after the close"}],"requested":1,"ok":0,"stream":false}
@bryance/orch test: (pass) close always works > a successful backend close retains a pane that is still listed [2016.16ms]
@bryance/orch test: 
@bryance/orch test: test\dispatch-prompt-file.test.ts:
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > the file body is the prompt, apostrophes and newlines intact [33.95ms]
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > without --file the positionals after the target are the prompt [0.10ms]
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > a typed prompt and --file together is a refusal, never a silent winner [10.82ms]
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > an empty file is refused: a dispatch with no prompt is not a dispatch [25.67ms]
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > a missing file names itself in the refusal [2.77ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) answer over the daemon control socket > refuses a cross-space answer at the daemon wall [255.56ms]
@bryance/orch test: 
@bryance/orch test: test\store-instants.test.ts:
@bryance/orch test: (pass) epoch-millisecond store instants > a lease records its holding as an integer instant [253.04ms]
@bryance/orch test: 
@bryance/orch test: test\work-survives-its-spawner.test.ts:
@bryance/orch test: (pass) work survives its spawner, always (D1) > ending the spawner leaves the child live, unended and still listed [212.62ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-backends.test.ts:
@bryance/orch test: (pass) doctor backend and presence checks > reports every registered backend and composed roles [32.73ms]
@bryance/orch test: (pass) doctor backend and presence checks > passes with herdr active while an enabled tmux sits outside a session [1.26ms]
@bryance/orch test: (pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.17ms]
@bryance/orch test: (pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [0.20ms]
@bryance/orch test: (pass) doctor backend and presence checks > fails when any enabled backend is unavailable, active or not [0.40ms]
@bryance/orch test: (pass) doctor backend and presence checks > honours the configured default over the probe order [0.13ms]
@bryance/orch test: (pass) doctor backend and presence checks > reports only records missing the current schema stamp [33.22ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-reconnect.test.ts:
@bryance/orch test: (pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1209.50ms]
@bryance/orch test: 
@bryance/orch test: test\store-instants.test.ts:
@bryance/orch test: (pass) epoch-millisecond store instants > agents order numerically by their creation instant, never lexically [190.50ms]
@bryance/orch test: (pass) epoch-millisecond store instants > all time-named columns use integer declarations [1.28ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-preferred-models.test.ts:
@bryance/orch test: (pass) the preferred quicklist reaches every launch route > an unconfigured quicklist stays empty rather than becoming a default one [217.78ms]
@bryance/orch test: (pass) the preferred quicklist reaches every launch route > the previewed command is the command a launch runs [0.81ms]
@bryance/orch test: (pass) the preferred quicklist reaches every launch route > a headless launch forwards the quicklist into the adapter's own options [224.51ms]
@bryance/orch test: (pass) orchd rules on the quicklist it is sent > accepts an absent value and an array of specs [0.29ms]
@bryance/orch test: (pass) orchd rules on the quicklist it is sent > refuses a joined string or a blank entry instead of coercing it [0.31ms]
@bryance/orch test: 
@bryance/orch test: test\every-agent-has-an-inbox.test.ts:
@bryance/orch test: (pass) every agent has an inbox > the inbox is at one derived path, whatever the agent's environment [276.23ms]
@bryance/orch test: (pass) every agent has an inbox > delivery stamps an id and a timestamp on every message, for every agent [177.81ms]
@bryance/orch test: (pass) every agent has an inbox > delivery is refused for a disconnected bridge, not for a missing pane [208.66ms]
@bryance/orch test: 
@bryance/orch test: test\close-reports-every-target.test.ts:
@bryance/orch test: (pass) close reports an outcome for every target it was given (U2) > a failed target reports outcome error WITH the real error text [276.76ms]
@bryance/orch test: (pass) close reports an outcome for every target it was given (U2) > a pane the plexer no longer has is CLOSED, not failed [209.98ms]
@bryance/orch test: (pass) close reports an outcome for every target it was given (U2) > the exit code still reflects whether every target closed [205.15ms]
@bryance/orch test: 
@bryance/orch test: test\space-policy.test.ts:
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > two unspaced agents in the SAME repo root can reach each other [251.56ms]
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > two unspaced agents in DIFFERENT repo roots cannot [196.05ms]
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > an agent placed in no space reports none, even inside a plexer workspace [221.89ms]
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > recording a spawn never conjures the space it names [164.63ms]
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > a space still walls, and it outranks the repo root [218.99ms]
@bryance/orch test: (pass) space policy > reads the space from the environment satellite, and absence is null [331.71ms]
@bryance/orch test: (pass) space policy > resolves space names through records and functions [0.36ms]
@bryance/orch test: (pass) space policy > compares agents by the space each is composed into [334.17ms]
@bryance/orch test: (pass) space policy > enforces the space wall across every plexer alike [421.62ms]
@bryance/orch test: (pass) space policy > scopes agents to the current space [262.71ms]
@bryance/orch test: (pass) space policy > a null current space leaves items unscoped [166.18ms]
@bryance/orch test: (pass) space policy > 2.7 status displays the composed space, not text sliced from a key [314.22ms]
@bryance/orch test: (pass) space policy > 6.6 structured identity drives status and policy, not serialized key text [299.98ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-replay.test.ts:
@bryance/orch test: (pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [152.81ms]
@bryance/orch test: 
@bryance/orch test: test\work-survives-its-spawner.test.ts:
@bryance/orch test: (pass) work survives its spawner, always (D1) > a grandchild is untouched when the middle agent ends [210.09ms]
@bryance/orch test: (pass) work survives its spawner, always (D1) > the store has no lifetime column and no fate-sharing flag anywhere [0.55ms]
@bryance/orch test: (pass) work survives its spawner, always (D1) > spawn offers no flag that decides whether work outlives its spawner [1.28ms]
@bryance/orch test: (pass) work survives its spawner, always (D1) > closing the spawner never writes an ending for anything it spawned [179.24ms]
@bryance/orch test: 
@bryance/orch test: test\store-interval-rows.test.ts:
@bryance/orch test: (pass) interval satellites > only one open interval is allowed [184.35ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-checks.test.ts:
@bryance/orch test: (pass) doctor provenance-depth checks > finds a live agent deeper than fleet.max_depth [232.80ms]
@bryance/orch test: 
@bryance/orch test: test\worker-prompt.test.ts:
@bryance/orch test: (pass) worker prompt capability composition > spawn clause follows maySpawn and stripping preserves the task [0.39ms]
@bryance/orch test: (pass) worker prompt capability composition > orch run composition selects the same header per adapter [0.05ms]
@bryance/orch test: (pass) worker prompt capability composition > the worker header does not instruct a lock that does not lock [0.04ms]
@bryance/orch test: (pass) worker prompt capability composition > the header addresses the agent, and names no plexer furniture [0.03ms]
@bryance/orch test: (pass) worker prompt capability composition > the verify clause names the configured commands, and asks for the repository's own when there are none [0.04ms]
@bryance/orch test: (pass) worker prompt capability composition > locked-commands clause names the commands, and asks for a report rather than a lock [0.03ms]
@bryance/orch test: (pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.02ms]
@bryance/orch test: (pass) worker prompt capability composition > the reply-to-spawner clause needs a reachable spawner, not just an inbox-steerable worker [0.03ms]
@bryance/orch test: (pass) worker prompt capability composition > unreachable spawner tells the worker to finish and end without relaying [0.02ms]
@bryance/orch test: (pass) worker prompt capability composition > reachable spawner permits replying to the spawner only [0.02ms]
@bryance/orch test: (pass) worker prompt capability composition > a reachable spawner still earns no clause when the worker cannot be steered by inbox [0.02ms]
@bryance/orch test: (pass) worker prompt capability composition > events strip both worker header variants [5.32ms]
@bryance/orch test: 
@bryance/orch test: test\command-refusal.test.ts:
@bryance/orch test: (pass) a command refusal is thrown, not exited > an unresolvable target throws a CommandRefusal instead of killing the process [145.21ms]
@bryance/orch test: 
@bryance/orch test: test\worker-tools.test.ts:
@bryance/orch test: (pass) worker tool policy > no configured allowlist restricts nothing [0.27ms]
@bryance/orch test: (pass) worker tool policy > a configured allowlist always carries orch's own tools [0.06ms]
@bryance/orch test: (pass) worker tool policy > peer tools join the allowlist when the fleet enables them [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\hello-environment.test.ts:
@bryance/orch test: (pass) hello records the environment in full > the plexer the caller registered in is on the agent, not only on the host [206.16ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-registry.test.ts:
@bryance/orch test: (pass) spawn agent registration > writes the hub, environment, tuning, and lease [219.13ms]
@bryance/orch test: 
@bryance/orch test: test\settings-editor.test.ts:
@bryance/orch test: (pass) settings editor reducer > moves focus down and up without running off either end [0.38ms]
@bryance/orch test: (pass) settings editor reducer > opens the focused setting for editing [0.05ms]
@bryance/orch test: (pass) settings editor reducer > cancel leaves value unchanged and returns to browsing [0.04ms]
@bryance/orch test: (pass) settings editor reducer > commit updates value and produces a pending write [0.17ms]
@bryance/orch test: (pass) settings editor reducer > refuses invalid values with a reason and stays open [0.05ms]
@bryance/orch test: (pass) settings editor reducer > refuses opening a read-only setting with a reason [0.06ms]
@bryance/orch test: (pass) settings editor reducer > cancelling without a commit yields zero writes [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\agent-key-is-minted-id.test.ts:
@bryance/orch test: (pass) a driving session mints an id, it is not placed by name > the presence directory is named by that id alone [6.68ms]
@bryance/orch test: (pass) a driving session mints an id, it is not placed by name > a launch that handed over a minted id is used verbatim [8.16ms]
@bryance/orch test: (pass) this process's own identity is the id and nothing else > a spawned agent answers with the id its launch handed it [6.39ms]
@bryance/orch test: (pass) the fleet wall is lifted by the absence of a launch, not by a key's shape > an agent orch launched may not cross into another project's fleet [228.00ms]
@bryance/orch test: (pass) who drives an agent is looked up by its id > the key IS the agent id ΓÇö no segment is split out of it [1761.83ms]
@bryance/orch test: (pass) who drives an agent is looked up by its id > a composite key addresses no agent at all [1109.12ms]
@bryance/orch test: (pass) doctor reads a presence directory name as an id > a composite directory name is a malformed identity key [12.62ms]
@bryance/orch test: (pass) doctor reads a presence directory name as an id > a minted id with a current stamp is well formed [11.47ms]
@bryance/orch test: 
@bryance/orch test: test\peer-identity.test.ts:
@bryance/orch test: (pass) spawner identity > an unregistered Claude Code session is labelled by its harness, with no id [2.73ms]
@bryance/orch test: (pass) spawner identity > a session orch has registered IS addressable, by the id orch minted [206.13ms]
@bryance/orch test: (pass) spawner identity > an unregistered session has no id to hand out, and does not invent one [2.57ms]
@bryance/orch test: (pass) spawner identity > an orch-spawned orchestrator acts as the id orch minted for it [327.89ms]
@bryance/orch test: (pass) spawner identity > agentIdentityEnv stamps a reply address only when the spawner has one [0.80ms]
@bryance/orch test: (pass) spawner identity > worktreeEnv stamps worktree identity only for isolated agents [0.43ms]
@bryance/orch test: (pass) spawner identity > the registry keeps the exact spawning session distinct from the lease holder [235.99ms]
@bryance/orch test: (pass) the spawner address invariant > an UNREGISTERED session stamps no address, so no worker is handed an unreachable one [6.22ms]
@bryance/orch test: (pass) the spawner address invariant > a bare operator stamps no address [6.65ms]
@bryance/orch test: (pass) the spawner address invariant > an address that IS stamped resolves to a live inbox [188.16ms]
@bryance/orch test: (pass) peer identity in messaging > peer summaries render an unplaced agent without a local place name [18.40ms]
@bryance/orch test: (pass) peer identity in messaging > orch_send reports the peer's NAME, and stamps the sender's name on the message [30.15ms]
@bryance/orch test: (pass) peer identity in messaging > peers resolve by display name exactly like by key [22.23ms]
@bryance/orch test: (pass) peer identity in messaging > "spawner" reaches the stamped spawner session across fleet scoping [23.46ms]
@bryance/orch test: (pass) peer identity in messaging > a spawner with no inbox is refused BY NAME, not with a bare key [4.34ms]
@bryance/orch test: 
@bryance/orch test: test\command-refusal.test.ts:
@bryance/orch test: (pass) a command refusal is thrown, not exited > the refusal carries the reason a human needs [137.72ms]
@bryance/orch test: 
@bryance/orch test: test\agent-model-unwelded.test.ts:
@bryance/orch test: (pass) A1 ΓÇö the four facts are never welded > no table welds identity, provenance, ownership and environment into one row [2.90ms]
@bryance/orch test: (pass) A1 ΓÇö the four facts are never welded > ownership is a lease table, not a second id space [1.72ms]
@bryance/orch test: (pass) A1 ΓÇö the four facts are never welded > the agents hub carries identity and provenance only [0.35ms]
@bryance/orch test: (pass) A1 ΓÇö the four facts are never welded > no table anywhere carries a lifetime [13.26ms]
@bryance/orch test: 
@bryance/orch test: test\seat-index.test.ts:
@bryance/orch test: (pass) seat pure seams > errorMessage preserves non-Error thrown values [1.93ms]
@bryance/orch test: (pass) seat pure seams > hasTheme discriminates missing and valid themes [1.19ms]
@bryance/orch test: (pass) seat pure seams > countStates groups active, blocked, failed, and settled states [0.18ms]
@bryance/orch test: (pass) seat pure seams > formatSeatStatus renders state counts and view hint [0.22ms]
@bryance/orch test: (pass) seat pure seams > reconcileDashboardSelection preserves id and guards missing snapshots [0.40ms]
@bryance/orch test: 
@bryance/orch test: test\tiling.test.ts:
@bryance/orch test: 37 | 
@bryance/orch test: 38 | /** Split the group's biggest place across its longer visual side, once the group's
@bryance/orch test: 39 |  *  opening split has been spent. Reading the whole group means the same agent
@bryance/orch test: 40 |  *  count yields the same grid whatever place the caller started from, on any plexer. */
@bryance/orch test: 41 | export function planTilePlacement(layout: BackendGroupLayout, policy: TileFirstSplit): TilePlacement {
@bryance/orch test: 42 |   const biggest = [...layout.placements].sort(biggestFirst)[0];
@bryance/orch test:                            ^
@bryance/orch test: TypeError: Spread syntax requires ...iterable not be null or undefined
@bryance/orch test:       at planTilePlacement (C:\dev\personal\orch\packages\orch\src\backends\tiling.ts:42:23)
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\tiling.test.ts:44:12)
@bryance/orch test: (fail) planTilePlacement > a lone pane anchors the split to the only pane [0.32ms]
@bryance/orch test: 37 | 
@bryance/orch test: 38 | /** Split the group's biggest place across its longer visual side, once the group's
@bryance/orch test: 39 |  *  opening split has been spent. Reading the whole group means the same agent
@bryance/orch test: 40 |  *  count yields the same grid whatever place the caller started from, on any plexer. */
@bryance/orch test: 41 | export function planTilePlacement(layout: BackendGroupLayout, policy: TileFirstSplit): TilePlacement {
@bryance/orch test: 42 |   const biggest = [...layout.placements].sort(biggestFirst)[0];
@bryance/orch test:                            ^
@bryance/orch test: TypeError: Spread syntax requires ...iterable not be null or undefined
@bryance/orch test:       at planTilePlacement (C:\dev\personal\orch\packages\orch\src\backends\tiling.ts:42:23)
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\tiling.test.ts:50:14)
@bryance/orch test: 37 | 
@bryance/orch test: 38 | /** Split the group's biggest place across its longer visual side, once the group's
@bryance/orch test: 39 |  *  opening split has been spent. Reading the whole group means the same agent
@bryance/orch test: 40 |  *  count yields the same grid whatever place the caller started from, on any plexer. */
@bryance/orch test: 41 | export function planTilePlacement(layout: BackendGroupLayout, policy: TileFirstSplit): TilePlacement {
@bryance/orch test: 42 |   const biggest = [...layout.placements].sort(biggestFirst)[0];
@bryance/orch test:                            ^
@bryance/orch test: TypeError: Spread syntax requires ...iterable not be null or undefined
@bryance/orch test:       at planTilePlacement (C:\dev\personal\orch\packages\orch\src\backends\tiling.ts:42:23)
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\tiling.test.ts:56:12)
@bryance/orch test: 37 | 
@bryance/orch test: 38 | /** Split the group's biggest place across its longer visual side, once the group's
@bryance/orch test: 39 |  *  opening split has been spent. Reading the whole group means the same agent
@bryance/orch test: 40 |  *  count yields the same grid whatever place the caller started from, on any plexer. */
@bryance/orch test: 41 | export function planTilePlacement(layout: BackendGroupLayout, policy: TileFirstSplit): TilePlacement {
@bryance/orch test: 42 |   const biggest = [...layout.placements].sort(biggestFirst)[0];
@bryance/orch test:                            ^
@bryance/orch test: TypeError: Spread syntax requires ...iterable not be null or undefined
@bryance/orch test:       at planTilePlacement (C:\dev\personal\orch\packages\orch\src\backends\tiling.ts:42:23)
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\tiling.test.ts:77:14)
@bryance/orch test: 37 | 
@bryance/orch test: 38 | /** Split the group's biggest place across its longer visual side, once the group's
@bryance/orch test: 39 |  *  opening split has been spent. Reading the whole group means the same agent
@bryance/orch test: 40 |  *  count yields the same grid whatever place the caller started from, on any plexer. */
@bryance/orch test: 41 | export function planTilePlacement(layout: BackendGroupLayout, policy: TileFirstSplit): TilePlacement {
@bryance/orch test: 42 |   const biggest = [...layout.placements].sort(biggestFirst)[0];
@bryance/orch test:                            ^
@bryance/orch test: TypeError: Spread syntax requires ...iterable not be null or undefined
@bryance/orch test:       at planTilePlacement (C:\dev\personal\orch\packages\orch\src\backends\tiling.ts:42:23)
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\tiling.test.ts:83:23)
@bryance/orch test: 37 | 
@bryance/orch test: 38 | /** Split the group's biggest place across its longer visual side, once the group's
@bryance/orch test: 39 |  *  opening split has been spent. Reading the whole group means the same agent
@bryance/orch test: 40 |  *  count yields the same grid whatever place the caller started from, on any plexer. */
@bryance/orch test: 41 | export function planTilePlacement(layout: BackendGroupLayout, policy: TileFirstSplit): TilePlacement {
@bryance/orch test: 42 |   const biggest = [...layout.placements].sort(biggestFirst)[0];
@bryance/orch test:                            ^
@bryance/orch test: TypeError: Spread syntax requires ...iterable not be null or undefined
@bryance/orch test:       at planTilePlacement (C:\dev\personal\orch\packages\orch\src\backends\tiling.ts:42:23)
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\tiling.test.ts:98:12)
@bryance/orch test: 37 | 
@bryance/orch test: 38 | /** Split the group's biggest place across its longer visual side, once the group's
@bryance/orch test: 39 |  *  opening split has been spent. Reading the whole group means the same agent
@bryance/orch test: 40 |  *  count yields the same grid whatever place the caller started from, on any plexer. */
@bryance/orch test: 41 | export function planTilePlacement(layout: BackendGroupLayout, policy: TileFirstSplit): TilePlacement {
@bryance/orch test: 42 |   const biggest = [...layout.placements].sort(biggestFirst)[0];
@bryance/orch test:                            ^
@bryance/orch test: TypeError: Spread syntax requires ...iterable not be null or undefined
@bryance/orch test:       at planTilePlacement (C:\dev\personal\orch\packages\orch\src\backends\tiling.ts:42:23)
@bryance/orch test:       at fillTab (C:\dev\personal\orch\packages\orch\test\tiling.test.ts:25:23)
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\tiling.test.ts:103:12)
@bryance/orch test: 37 | 
@bryance/orch test: 38 | /** Split the group's biggest place across its longer visual side, once the group's
@bryance/orch test: 39 |  *  opening split has been spent. Reading the whole group means the same agent
@bryance/orch test: 40 |  *  count yields the same grid whatever place the caller started from, on any plexer. */
@bryance/orch test: 41 | export function planTilePlacement(layout: BackendGroupLayout, policy: TileFirstSplit): TilePlacement {
@bryance/orch test: 42 |   const biggest = [...layout.placements].sort(biggestFirst)[0];
@bryance/orch test:                            ^
@bryance/orch test: TypeError: Spread syntax requires ...iterable not be null or undefined
@bryance/orch test:       at planTilePlacement (C:\dev\personal\orch\packages\orch\src\backends\tiling.ts:42:23)
@bryance/orch test:       at fillTab (C:\dev\personal\orch\packages\orch\test\tiling.test.ts:25:23)
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\tiling.test.ts:108:12)
@bryance/orch test: 37 | 
@bryance/orch test: 38 | /** Split the group's biggest place across its longer visual side, once the group's
@bryance/orch test: 39 |  *  opening split has been spent. Reading the whole group means the same agent
@bryance/orch test: 40 |  *  count yields the same grid whatever place the caller started from, on any plexer. */
@bryance/orch test: 41 | export function planTilePlacement(layout: BackendGroupLayout, policy: TileFirstSplit): TilePlacement {
@bryance/orch test: 42 |   const biggest = [...layout.placements].sort(biggestFirst)[0];
@bryance/orch test:                            ^
@bryance/orch test: TypeError: Spread syntax requires ...iterable not be null or undefined
@bryance/orch test:       at planTilePlacement (C:\dev\personal\orch\packages\orch\src\backends\tiling.ts:42:23)
@bryance/orch test:       at fillTab (C:\dev\personal\orch\packages\orch\test\tiling.test.ts:25:23)
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\tiling.test.ts:113:12)
@bryance/orch test: 37 | 
@bryance/orch test: 38 | /** Split the group's biggest place across its longer visual side, once the group's
@bryance/orch test: 39 |  *  opening split has been spent. Reading the whole group means the same agent
@bryance/orch test: 40 |  *  count yields the same grid whatever place the caller started from, on any plexer. */
@bryance/orch test: 41 | export function planTilePlacement(layout: BackendGroupLayout, policy: TileFirstSplit): TilePlacement {
@bryance/orch test: 42 |   const biggest = [...layout.placements].sort(biggestFirst)[0];
@bryance/orch test:                            ^
@bryance/orch test: TypeError: Spread syntax requires ...iterable not be null or undefined
@bryance/orch test:       at planTilePlacement (C:\dev\personal\orch\packages\orch\src\backends\tiling.ts:42:23)
@bryance/orch test:       at fillTab (C:\dev\personal\orch\packages\orch\test\tiling.test.ts:25:23)
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\tiling.test.ts:118:12)
@bryance/orch test: 37 | 
@bryance/orch test: 38 | /** Split the group's biggest place across its longer visual side, once the group's
@bryance/orch test: 39 |  *  opening split has been spent. Reading the whole group means the same agent
@bryance/orch test: 40 |  *  count yields the same grid whatever place the caller started from, on any plexer. */
@bryance/orch test: 41 | export function planTilePlacement(layout: BackendGroupLayout, policy: TileFirstSplit): TilePlacement {
@bryance/orch test: 42 |   const biggest = [...layout.placements].sort(biggestFirst)[0];
@bryance/orch test:                            ^
@bryance/orch test: TypeError: Spread syntax requires ...iterable not be null or undefined
@bryance/orch test:       at planTilePlacement (C:\dev\personal\orch\packages\orch\src\backends\tiling.ts:42:23)
@bryance/orch test:       at fillTab (C:\dev\personal\orch\packages\orch\test\tiling.test.ts:25:23)
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\tiling.test.ts:125:39)
@bryance/orch test: (fail) planTilePlacement > first_split rules the opening split, however the screen is shaped [0.32ms]
@bryance/orch test: (fail) planTilePlacement > first_split longest-edge leaves the opening split to the tab's own shape [0.15ms]
@bryance/orch test: (pass) planTilePlacement > a tab with no geometry to read still opens the way first_split says [0.06ms]
@bryance/orch test: (fail) planTilePlacement > past the first split, the biggest pane halves its longer side whatever first_split says [0.25ms]
@bryance/orch test: (fail) planTilePlacement > the biggest pane is the target, whatever the caller's own pane is [0.20ms]
@bryance/orch test: (fail) planTilePlacement > equal panes resolve top-left first, so enumeration order cannot decide [0.20ms]
@bryance/orch test: (fail) planTilePlacement > four agents land in a 2x2 grid, not four columns [0.28ms]
@bryance/orch test: (fail) planTilePlacement > four agents on an ultrawide screen still land in a 2x2 grid [0.22ms]
@bryance/orch test: (fail) planTilePlacement > first_split rows stacks the second agent, columns seats it alongside [0.41ms]
@bryance/orch test: (fail) planTilePlacement > longest-edge on an ultrawide screen is the four-thin-columns layout first_split exists to avoid [0.49ms]
@bryance/orch test: (fail) planTilePlacement > the same pane count yields the same grid whatever pane order the plexer reports [0.65ms]
@bryance/orch test: 
@bryance/orch test: test\settings-notify.test.ts:
@bryance/orch test: (pass) orch settings notify > records a sink with the field that sink declares [49.03ms]
@bryance/orch test: 
@bryance/orch test: test\tool-exec-retry.test.ts:
@bryance/orch test: (pass) every command into a harness or plexer retries on timing, not on being wrong > a transient refusal is reattempted until it succeeds [15.02ms]
@bryance/orch test: (pass) every command into a harness or plexer retries on timing, not on being wrong > a failure the caller calls permanent is thrown on the FIRST attempt, never retried [0.47ms]
@bryance/orch test: (pass) every command into a harness or plexer retries on timing, not on being wrong > a tool that never recovers exhausts the budget and reports how many attempts it cost [32.53ms]
@bryance/orch test: (pass) every command into a harness or plexer retries on timing, not on being wrong > the seam names no harness: the same policy drives a different binary [1.18ms]
@bryance/orch test: 
@bryance/orch test: test\status-unleased.test.ts:
@bryance/orch test: (pass) status owner rendering > a dead holder is shown as unleased with the holder gone [1034.97ms]
@bryance/orch test: (pass) status owner rendering > an agent never leased shows no orch driving it [1091.00ms]
@bryance/orch test: 
@bryance/orch test: test\transcript.test.ts:
@bryance/orch test: (pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [0.45ms]
@bryance/orch test: (pass) lastAssistantFromJsonl > undefined for blank or empty input [0.04ms]
@bryance/orch test: (pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.08ms]
@bryance/orch test: (pass) assistantText > reads role-tagged records [0.03ms]
@bryance/orch test: (pass) assistantText > reads the {type:'assistant'} envelope with a nested message [0.03ms]
@bryance/orch test: (pass) assistantText > undefined for non-assistant roles [0.02ms]
@bryance/orch test: (pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.02ms]
@bryance/orch test: (pass) contentText empty-string part handling > an all-empty content array yields undefined [0.10ms]
@bryance/orch test: (pass) contentText empty-string part handling > a bare empty string yields undefined [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\space-walls.test.ts:
@bryance/orch test: (pass) space helpers > reads space ids from the environment satellite, never from the key [4.74ms]
@bryance/orch test: (pass) space helpers > an agent that moves space keeps its identity and reports the new space [20.17ms]
@bryance/orch test: (pass) space helpers > derives an entity space from the store [1.30ms]
@bryance/orch test: (pass) space helpers > returns the same entities when all spaces are requested [0.50ms]
@bryance/orch test: (pass) space wall writes > allows a write within the same space [1.24ms]
@bryance/orch test: (pass) space wall writes > denies a cross-space write with both spaces in the reason [1.03ms]
@bryance/orch test: (pass) space wall writes > applies the same wall rule whatever plexer the agents sit in [5.62ms]
@bryance/orch test: (pass) space wall writes > allows a cross-space write with an explicit override [0.83ms]
@bryance/orch test: (pass) space wall writes > allows unplaced targets [0.45ms]
@bryance/orch test: 
@bryance/orch test: test\self-actor-identity.test.ts:
@bryance/orch test: (pass) a driving session's write-actor is the agent orch registered for it > the session token resolves to the id hello minted, so the actor equals its own lease holder [201.55ms]
@bryance/orch test: 
@bryance/orch test: test\command-space-fields.test.ts:
@bryance/orch test: (pass) command space fields > status and wall entities use the composed space, and it is nowhere in the key [254.21ms]
@bryance/orch test: 
@bryance/orch test: test\store-agent-rows.test.ts:
@bryance/orch test: (pass) agent store rows > insertAgent writes both NULL; agentById reads both back [185.34ms]
@bryance/orch test: 
@bryance/orch test: test\settings-notify.test.ts:
@bryance/orch test: (pass) orch settings notify > re-adding one sink replaces it in place and keeps the fields the call omits [83.36ms]
@bryance/orch test: (pass) orch settings notify > accepts asking as a first-class sink state [38.66ms]
@bryance/orch test: (pass) orch settings notify > remove drops only the named sink [66.61ms]
@bryance/orch test: (pass) orch settings notify > list reports each sink with the states it fires on, defaults included [66.77ms]
@bryance/orch test: (pass) orch settings notify > an empty notify array lists as none configured [13.14ms]
@bryance/orch test: (pass) orch settings notify > the notify row lists every sink, the states it may fire on, and the fields each carries [38.94ms]
@bryance/orch test: (pass) orch settings notify > the notify row writes the picked sinks, states included, and drops the ones left off [21.43ms]
@bryance/orch test: (pass) orch settings notify > the notify row refuses an unknown sink, a carrying sink with nothing to carry, and an unknown state [12.93ms]
@bryance/orch test: 
@bryance/orch test: test\transfer-does-not-disturb.test.ts:
@bryance/orch test: (pass) a transfer touches the lease and nothing else > a handoff changes the holder and leaves every other fact identical [290.05ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-identity.test.ts:
@bryance/orch test: (pass) one key per pane spawn (12.1) > identity is an opaque minted id ΓÇö never the name, never the pane handle [282.85ms]
@bryance/orch test: 
@bryance/orch test: test\settings-precedence.test.ts:
@bryance/orch test: (pass) settings precedence > returns a defaults value when no override is set [117.32ms]
@bryance/orch test: (pass) settings precedence > applies defaults when settings, env, and flag are absent [17.92ms]
@bryance/orch test: (pass) settings precedence > uses env over settings and flag over env [10.90ms]
@bryance/orch test: (pass) settings precedence > parses notify entries and hosts into expected shapes [11.46ms]
@bryance/orch test: (pass) settings precedence > reports a helpful validation error for invalid settings [17.93ms]
@bryance/orch test: 
@bryance/orch test: test\self-actor-identity.test.ts:
@bryance/orch test: (pass) a driving session's write-actor is the agent orch registered for it > a token orch has never seen resolves to nothing rather than a fabricated id [135.57ms]
@bryance/orch test: (pass) a driving session's write-actor is the agent orch registered for it > one session keeps ONE id across calls, whatever pid the shell reports [286.59ms]
@bryance/orch test: 
@bryance/orch test: test\settings-registry.test.ts:
@bryance/orch test: (pass) settings registry > declares every schema setting exactly once [0.59ms]
@bryance/orch test: 
@bryance/orch test: test\session-env.test.ts:
@bryance/orch test: (pass) shim environment > allows the launch environment variable [0.31ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-checks.test.ts:
@bryance/orch test: (pass) doctor provenance-depth checks > accepts a live agent at fleet.max_depth [188.83ms]
@bryance/orch test: (pass) doctor unclaimed-agent checks > finds an old unclaimed live agent with its age [193.00ms]
@bryance/orch test: (pass) doctor unclaimed-agent checks > ignores a claimed agent [188.67ms]
@bryance/orch test: (pass) doctor unclaimed-agent checks > ignores a fresh unclaimed agent under the threshold [266.31ms]
@bryance/orch test: (pass) doctor notification-sink checks > reports no sinks as healthy [15.25ms]
@bryance/orch test: (pass) doctor notification-sink checks > rejects a webhook with a malformed URL [21.32ms]
@bryance/orch test: (pass) doctor notification-sink checks > uses the notify-send prerequisite install command in desktop remediation [13.51ms]
@bryance/orch test: (pass) doctor notification-sink checks > warns for a command binary missing from PATH [25.86ms]
@bryance/orch test: (pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [12.45ms]
@bryance/orch test: (pass) doctor notification-sink checks > warns when a notifier omits done from its on list [10.28ms]
@bryance/orch test: (pass) doctor notification-sink checks > does not warn when a notifier includes done in its on list [10.34ms]
@bryance/orch test: (pass) doctor notification-sink checks > keeps unavailable notifier failures when done is omitted [18.03ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-registry.test.ts:
@bryance/orch test: (pass) spawn agent registration > an agent that states no plexer and no handle gets neither row [186.85ms]
@bryance/orch test: (pass) spawn agent registration > worktree row is present only for a worktree launch [281.81ms]
@bryance/orch test: (pass) spawn agent registration > an unknown or absent spawner produces a root pack of one and no lease [350.88ms]
@bryance/orch test: 
@bryance/orch test: test\session.test.ts:
@bryance/orch test: (pass) parseSession > returns an empty view for null and missing paths [0.31ms]
@bryance/orch test: 
@bryance/orch test: test\hello-environment.test.ts:
@bryance/orch test: (pass) hello records the environment in full > the space the caller registered in is recorded at hello, not inferred later [199.78ms]
@bryance/orch test: (pass) hello records the environment in full > a session in no space and no plexer records neither, and that is an answer [216.07ms]
@bryance/orch test: (pass) hello records the environment in full > re-registering the same session does not re-root or re-place it [300.20ms]
@bryance/orch test: (pass) hello records the environment in full > the claim carries every environment fact hello has to record [185.28ms]
@bryance/orch test: 
@bryance/orch test: test\session.test.ts:
@bryance/orch test: (pass) parseSession > handles model, thinking, user, assistant, tool, and unknown entries [11.55ms]
@bryance/orch test: (pass) parseSession > joins text blocks and ignores non-text blocks [13.55ms]
@bryance/orch test: 
@bryance/orch test: test\settings-registry.test.ts:
@bryance/orch test: (pass) settings registry > every registry read resolves against loaded settings [15.65ms]
@bryance/orch test: (pass) settings registry > fleet help explains what each limit counts [1.65ms]
@bryance/orch test: (pass) settings registry > fleet.max_depth round-trips through the full-tree writer [32.36ms]
@bryance/orch test: (pass) settings registry > fleet.max_depth rejects zero through the registered writer [21.71ms]
@bryance/orch test: (pass) settings registry > fleet.max_depth writes its value to settings.json [12.34ms]
@bryance/orch test: (pass) settings registry > contains no duplicate keys [0.41ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) answer over the daemon control socket > refuses an answer from outside the lease, naming the holder [1587.40ms]
@bryance/orch test: 
@bryance/orch test: test\queue.test.ts:
@bryance/orch test: (pass) queue facade on tasks and attempts > enqueue selects exactly one typed scope and defaults to the enqueuer pack [298.58ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > agent scope requires the enqueuer to lease the target [282.49ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq1: the gate is on enqueuing into a scope, and adoption earns it [279.35ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq1: a pack drains its queue with its orch dead and no lease in force [258.99ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > claiming excludes another pack and space claims require open intake [246.70ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq3: a space-scoped task is an offer, and only an opted-in pack consumes it [305.53ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > a failed pack attempt retries on another member, never outside the pack [289.90ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq5: an agent-scoped binding is to the agent and survives adoption [248.10ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq13: adoption carries the queue ΓÇö pack work comes with the agents [256.02ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > a claim is an insert and a lost race returns false [224.00ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > cancel rights are enqueuer, targeted agent's leasing orch, or human [278.54ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq7: origin_workspace is gone from the tasks table, scope replaces it [264.79ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > state and attempt-derived values have no legacy flattened fields [218.67ms]
@bryance/orch test: 
@bryance/orch test: test\status-headless.test.ts:
@bryance/orch test: (pass) headless status visibility > drops an exited agent that finished, however much it recorded [0.39ms]
@bryance/orch test: (pass) headless status visibility > --filter names the states, so it brings the dead back [0.17ms]
@bryance/orch test: (pass) headless status visibility > drops a dead row with no result or terminal state [0.07ms]
@bryance/orch test: (pass) headless status visibility > keeps a live row [0.05ms]
@bryance/orch test: (pass) headless status visibility > --space-wide widens the scope without resurrecting empty dead rows [0.03ms]
@bryance/orch test: (pass) headless status visibility > uses agent language without backend details when no backend was asked [0.09ms]
@bryance/orch test: 
@bryance/orch test: test\capacity.test.ts:
@bryance/orch test: (pass) fleet capacity > counts live agents by root holder [0.74ms]
@bryance/orch test: (pass) fleet capacity > reports configured per-space caps [0.07ms]
@bryance/orch test: (pass) fleet capacity > uses null for an unlimited total [0.07ms]
@bryance/orch test: (pass) fleet capacity > formats holder, space, and machine capacity [0.19ms]
@bryance/orch test: 
@bryance/orch test: test\store-rebuild-schema.test.ts:
@bryance/orch test: (pass) rebuild schema > the store opens migrated, with foreign keys enabled [126.25ms]
@bryance/orch test: (pass) rebuild schema > all ten partial unique indexes allow only one open row [2297.96ms]
@bryance/orch test: (pass) rebuild schema > enforces foreign keys and agent checks [176.53ms]
@bryance/orch test: (pass) rebuild schema > requires exactly one task scope [182.82ms]
@bryance/orch test: (pass) rebuild schema > allows one open attempt only [193.91ms]
@bryance/orch test: (pass) rebuild schema > enforces lease checks and one lease [205.63ms]
@bryance/orch test: (pass) rebuild schema > remaining documented CHECKs and cascades are enforced [258.95ms]
@bryance/orch test: (pass) rebuild schema > task_states derives queued claimed and outcomes [245.39ms]
@bryance/orch test: 
@bryance/orch test: test\settings-defects.test.ts:
@bryance/orch test: (pass) settingsDefects > returns no defects for an absent file [3.18ms]
@bryance/orch test: 
@bryance/orch test: test\command-space-fields.test.ts:
@bryance/orch test: (pass) command space fields > skipBackends keeps the authoritative presence entity shape [349.25ms]
@bryance/orch test: (pass) command space fields > status reports a mixed pi and Claude fleet with the same identity fields [256.67ms]
@bryance/orch test: 
@bryance/orch test: test\check-bridge.test.ts:
@bryance/orch test: (pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.18ms]
@bryance/orch test: 
@bryance/orch test: test\backend-headless.test.ts:
@bryance/orch test: (pass) HeadlessBackend > refuses to spawn with no prompt ΓÇö a headless agent runs its prompt and exits [1.35ms]
@bryance/orch test: 
@bryance/orch test: integration\doctor-declared-vs-reality.test.ts:
@bryance/orch test: 41 | describe("doctor declared-vs-reality", () => {
@bryance/orch test: 42 |   test("describes composed and absent backend roles", () => {
@bryance/orch test: 43 |     const result = withRegisteredBackend(new FakePanedBackend(), () => describeBackendEnvironments(["headless"]));
@bryance/orch test: 44 |     const description = result.backends?.find((backend) => backend.id === "headless");
@bryance/orch test: 45 |     expect(description).toBeDefined();
@bryance/orch test: 46 |     expect(description?.roles).toContain("paneHost");
@bryance/orch test:                                     ^
@bryance/orch test: error: expect(received).toContain(expected)
@bryance/orch test: 
@bryance/orch test: Expected to contain: "paneHost"
@bryance/orch test: Received: [ "placement", "placementInventory", "agentInput", "foreground", "screen", "zoom", "labeling" ]
@bryance/orch test: 
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\integration\doctor-declared-vs-reality.test.ts:46:32)
@bryance/orch test: (fail) doctor declared-vs-reality > describes composed and absent backend roles [27.39ms]
@bryance/orch test: 
@bryance/orch test: test\status-live.test.ts:
@bryance/orch test: (pass) live status renderer > renders a clear screen, timestamped header, and table body [9.47ms]
@bryance/orch test: (pass) live status renderer > renders a refresh failure in the header area [0.32ms]
@bryance/orch test: (pass) live status renderer > coalesces a burst into one pending follow-up refresh [0.95ms]
@bryance/orch test: (pass) live status renderer > keeps the existing table renderer available [0.24ms]
@bryance/orch test: 
@bryance/orch test: test\settings-defects.test.ts:
@bryance/orch test: (pass) settingsDefects > returns no defects for a valid settings file [14.62ms]
@bryance/orch test: (pass) settingsDefects > reports unparsable JSON as one file defect [4.75ms]
@bryance/orch test: (pass) settingsDefects > suggests a near-match for a stale key [13.57ms]
@bryance/orch test: (pass) settingsDefects > does not guess a replacement for a removed key [19.78ms]
@bryance/orch test: (pass) settingsDefects > reports the expected pinned schema value [31.29ms]
@bryance/orch test: (pass) settingsDefects > reports a wrong value type on a real key [18.63ms]
@bryance/orch test: 
@bryance/orch test: test\reap-picker.test.ts:
@bryance/orch test: (pass) reapCandidates > classifies unleased dead holders and leased dead processes [0.41ms]
@bryance/orch test: 
@bryance/orch test: test\check-bridge.test.ts:
@bryance/orch test: 259 |   test("the exempted names are the roles the ports actually declare", () => {
@bryance/orch test: 260 |     for (const deleted of ["capabilities", "createWorkspace", "currentIdentity", "handleFor", "pruneLogs", "workspaces", "focusWorkspace", "version"]) {
@bryance/orch test: 261 |       expect(ENVIRONMENT_ROLE_NAMES).not.toContain(deleted);
@bryance/orch test: 262 |     }
@bryance/orch test: 263 |     for (const composed of ["paneInventory", "paneInput", "spaceHome", "identity", "handleLookup", "logPruning", "inboxSteering", "question", "modelControl", "thinking"]) {
@bryance/orch test: 264 |       expect(ENVIRONMENT_ROLE_NAMES).toContain(composed);
@bryance/orch test:                                            ^
@bryance/orch test: error: expect(received).toContain(expected)
@bryance/orch test: 
@bryance/orch test: Expected to contain: "paneInventory"
@bryance/orch test: Received: [
@bryance/orch test:   "process", "channel", "capture", "identity", "handleLookup", "logPruning", "versionInfo", "serverInfo",
@bryance/orch test:   "placement", "placementInventory", "agentInput", "foreground", "screen",
@bryance/orch test:   "zoom", "labeling", "agentNaming", "agentStatus", "groupHome", "groupLayout", "spaceHome", "thinking",
@bryance/orch test:   "workerLaunch", "modelControl", "lifecycleControl", "sessionView", "workspaceTrust",
@bryance/orch test:   "shim", "defaultModel", "models", "modelWarm", "question", "inboxSteering", "presenceRegistration",
@bryance/orch test:   "sessionEnvMarker", "sessionIdEnv", "sessionPidEnv",
@bryance/orch test:   "id"
@bryance/orch test: ]
@bryance/orch test: 
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\check-bridge.test.ts:264:38)
@bryance/orch test: 282 | 
@bryance/orch test: 283 |   test("flags method-presence capability checks", () => {
@bryance/orch test: 284 |     expect(checkEnvironmentCapabilityLine('  if (typeof backend.zoom === "function") return backend.zoom(target);', "src/commands/panes.ts")).toContain("method-presence");
@bryance/orch test: 285 |     expect(checkEnvironmentCapabilityLine("  if (backend.sendKeys) return backend.sendKeys(target, text);", "src/commands/control.ts")).toContain("method-presence");
@bryance/orch test: 286 |     expect(checkEnvironmentCapabilityLine('  if ("zoom" in provider) return provider.zoom(target);', "src/commands/panes.ts")).toContain("method-presence");
@bryance/orch test: 287 |     expect(checkEnvironmentCapabilityLine("  if (provider.zoom?.()) return focus();", "src/commands/panes.ts")).toContain("method-presence");
@bryance/orch test:                                                                                                                       ^
@bryance/orch test: error: Received value must be an array type, or both received and expected values must be strings.
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\check-bridge.test.ts:287:113)
@bryance/orch test: 312 |           const reason = checkEnvironmentCapabilityLine(lines[index]!, relPath);
@bryance/orch test: 313 |           if (reason) violations.push(`${relPath}:${index + 1}: ${lines[index]!.trim()}`);
@bryance/orch test: 314 |         }
@bryance/orch test: 315 |       }
@bryance/orch test: 316 |     }
@bryance/orch test: 317 |     expect(violations).toEqual([]);
@bryance/orch test:                              ^
@bryance/orch test: error: expect(received).toEqual(expected)
@bryance/orch test: 
@bryance/orch test: - []
@bryance/orch test: + [
@bryance/orch test: +   "src/commands/lifecycle/rename.ts:83: if (!backend.paneNaming) throw new Error("target environment has no pane naming role");",
@bryance/orch test: +   "src/commands/panes.ts:215: if (backend.paneHost) backend.paneHost.close(created.rootHandle);",
@bryance/orch test: + ]
@bryance/orch test: 
@bryance/orch test: - Expected  - 1
@bryance/orch test: + Received  + 4
@bryance/orch test: 
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\check-bridge.test.ts:317:24)
@bryance/orch test: (pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.08ms]
@bryance/orch test: (pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / settings seams [0.09ms]
@bryance/orch test: (pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [0.56ms]
@bryance/orch test: (pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.21ms]
@bryance/orch test: (pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.03ms]
@bryance/orch test: (pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the shared harness model port outside the adapter dispatcher [0.02ms]
@bryance/orch test: (pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [0.61ms]
@bryance/orch test: (pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > flags a runtime adapter importing bridge-bundles/build.ts [0.33ms]
@bryance/orch test: (pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > allows scripts and the build-tool module itself [0.09ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [1.07ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.08ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.53ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke test holds no exemption: the branch was deleted, not blessed [0.13ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has no identity-branch line, exempted or otherwise [4.87ms]
@bryance/orch test: (pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > flags spawner key and spawnerIdentity key owner-token fallbacks [0.36ms]
@bryance/orch test: (pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > allows a benign line [0.06ms]
@bryance/orch test: (pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > passes the clean tree: reply addresses never use owner-token fallbacks [1.94ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags object literals that synthesize an identity [0.38ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags concatenated and template identity keys [0.28ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > allows a fresh spawn mint and the issuer modules [0.04ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > no file is exempt from the identity-construction rule [0.02ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > passes the clean tree: every identity construction is allowed or registered [1.55ms]
@bryance/orch test: (pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.12ms]
@bryance/orch test: (pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.02ms]
@bryance/orch test: (pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [0.45ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > a deleted capability bag or optional method is not exempt [1.01ms]
@bryance/orch test: (fail) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > the exempted names are the roles the ports actually declare [0.69ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > nullable data on the port is not exempted as a role [0.12ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > flags plexer and harness identity branches [0.05ms]
@bryance/orch test: (fail) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > flags method-presence capability checks [0.59ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > allows a branch inside a concrete backend [0.08ms]
@bryance/orch test: (fail) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > passes the clean tree: no file in ANY scanned scope branches on an environment id [79.89ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > the core-scope allowlist is EMPTY, so no line holds a standing exemption [0.38ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > allows capability-driven code [0.06ms]
@bryance/orch test: (pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags INSERT and UPDATE SQL that welds a lease holder into spawned_by [0.47ms]
@bryance/orch test: (pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags lease row types carrying a provenance field [0.12ms]
@bryance/orch test: (pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > allows separate lease and provenance rows [0.14ms]
@bryance/orch test: (pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > passes the clean tree: no source line crosses lease and provenance columns [27.75ms]
@bryance/orch test: (pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a launch env read outside launch.ts with the file and constant named [0.21ms]
@bryance/orch test: (pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > allows the launch env read inside identity/launch.ts [0.03ms]
@bryance/orch test: (pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a bare launch env name literal outside launch.ts [0.02ms]
@bryance/orch test: (pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a comment mentioning the launch env name outside launch.ts [0.02ms]
@bryance/orch test: (pass) the closed plexer-id set is spelled in exactly one line > the definition line is allowed where it lives, and nowhere else [0.05ms]
@bryance/orch test: (pass) the closed plexer-id set is spelled in exactly one line > any other quoted plexer id in that same file still fails [0.02ms]
@bryance/orch test: (pass) the closed plexer-id set is spelled in exactly one line > the line src/types/backend.ts actually carries is the allowed one [0.77ms]
@bryance/orch test: (pass) the closed plexer-id set is spelled in exactly one line > extensions get the same rule with their own scope named [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-hud-environment.test.ts:
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > a herdr-placed agent reports the handle its environment carries [174.95ms]
@bryance/orch test: 
@bryance/orch test: test\status-owner-column.test.ts:
@bryance/orch test: (pass) the rendered status table carries the owner column > each row's OWNER cell holds that row's lease fact [0.86ms]
@bryance/orch test: (pass) the rendered status table carries the owner column > a dead holder reads as unleased under a table that all shares one owner [0.21ms]
@bryance/orch test: (pass) the rendered status table carries the owner column > the owner column is dropped only when no row knows its lease [0.09ms]
@bryance/orch test: 
@bryance/orch test: test\commands-panes.test.ts:
@bryance/orch test: (pass) commands/panes > pane identity is the minted id alone [0.07ms]
@bryance/orch test: (pass) commands/panes > a plexer-and-space key is not an identity [0.13ms]
@bryance/orch test: (pass) commands/panes > exports the pane listing command directly [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\store-runs.test.ts:
@bryance/orch test: (pass) run rows > round-trips every field, including a structured result [197.16ms]
@bryance/orch test: 
@bryance/orch test: test\backend-headless.test.ts:
@bryance/orch test: (pass) HeadlessBackend > spawns a detached process and records its handle [175.95ms]
@bryance/orch test: 
@bryance/orch test: test\commands-clean.test.ts:
@bryance/orch test: (pass) commands/clean > reaps dead agent dirs but preserves live pids [152.04ms]
@bryance/orch test: 
@bryance/orch test: test\backend-headless.test.ts:
@bryance/orch test: (pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [84.77ms]
@bryance/orch test: 
@bryance/orch test: test\status-perf.test.ts:
@bryance/orch test: (pass) status performance seams > resolves bundle hashes once per status call [55.72ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-decision-trail.test.ts:
@bryance/orch test: (pass) daemon decision trail > records a lease refused against a live holder [1815.85ms]
@bryance/orch test: 
@bryance/orch test: test\reap-picker.test.ts:
@bryance/orch test: (pass) reapCandidates > classifies empty input [0.08ms]
@bryance/orch test: (pass) cmdReap > prints the --dead --json result shape [221.29ms]
@bryance/orch test: (pass) cmdReap > refuses bare reap when stdin is not a TTY [0.35ms]
@bryance/orch test: 
@bryance/orch test: test\status-perf.test.ts:
@bryance/orch test: (pass) status performance seams > resolves orchestrator id once per status call [27.38ms]
@bryance/orch test: 
@bryance/orch test: test\lease-authority.test.ts:
@bryance/orch test: (pass) C3 foreign agents are untouchable > every driving verb is refused while a live foreign orch holds the lease [4034.53ms]
@bryance/orch test: 
@bryance/orch test: test\claim-agent.test.ts:
@bryance/orch test: (pass) claim agent > unclaimed + A ΓåÆ stamped [215.65ms]
@bryance/orch test: 
@bryance/orch test: test\commands-queue.test.ts:
@bryance/orch test: (pass) commands/queue > cmdQueue list emits the selected JSON view [202.49ms]
@bryance/orch test: 
@bryance/orch test: test\status-renders-one-row-shape.test.ts:
@bryance/orch test: (pass) status rendering has one row shape and one table renderer > task and last text use the same spelling in the row and table cell [64.80ms]
@bryance/orch test: 
@bryance/orch test: integration\close-always.test.ts:
@bryance/orch test: Could not close signalfai1: signal denied
@bryance/orch test: {"closed":[],"results":[{"target":"signalfai1","handle":"pane-signal-failed","outcome":"error","error":"signal denied"}],"requested":1,"ok":0,"stream":false}
@bryance/orch test: {"closed":["presence01"],"results":[{"target":"presence01","handle":"pane-presence-only","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
@bryance/orch test: (pass) close always works > a failed signal retains the registry and presence and reports failure [1962.99ms]
@bryance/orch test: 
@bryance/orch test: test\reap-walks-provenance.test.ts:
@bryance/orch test: (pass) reap walks the provenance tree (H3) > an ended agent with a still-present descendant is NOT reaped [230.08ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-hud-environment.test.ts:
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > the handle follows the agent when it moves pane [251.09ms]
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > an agent on another plexer is not a herdr pane [248.14ms]
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > a process orch never launched is not a herdr pane [5.46ms]
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > a key that is not a minted id resolves to no pane at all [3.83ms]
@bryance/orch test: 
@bryance/orch test: test\commands-queue.test.ts:
@bryance/orch test: No queue tasks.
@bryance/orch test: (pass) commands/queue > round-trips add/list/cancel on an isolated store [204.39ms]
@bryance/orch test: (pass) commands/queue > renders empty queues without throwing [0.44ms]
@bryance/orch test: 
@bryance/orch test: test\status-renders-one-row-shape.test.ts:
@bryance/orch test: (pass) status rendering has one row shape and one table renderer > local and remote rows share the renderer; remote adds only HOST [0.36ms]
@bryance/orch test: (pass) status rendering has one row shape and one table renderer > fleet resolves caller inputs once while building three presence rows [235.19ms]
@bryance/orch test: 
@bryance/orch test: test\commands-clean.test.ts:
@bryance/orch test: (pass) worktree ownership reads the composed environment > a live agent's worktree is protected and a dead one's is not [256.38ms]
@bryance/orch test: (pass) orch clean is destructive maintenance > a spawned agent is refused the sweep, and the dirs it does not own survive [207.20ms]
@bryance/orch test: 
@bryance/orch test: test\transfer-does-not-disturb.test.ts:
@bryance/orch test: (pass) a transfer touches the lease and nothing else > the agent's process is not restarted or re-attached [346.19ms]
@bryance/orch test: (pass) a transfer touches the lease and nothing else > no reset, steer or re-attach is delivered to the agent [226.35ms]
@bryance/orch test: (pass) a transfer touches the lease and nothing else > adoption of an unheld agent disturbs it no more than a handoff does [316.19ms]
@bryance/orch test: (pass) a transfer touches the lease and nothing else > the holding that ended is kept as history, not erased by the transfer [304.76ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-decision-trail.test.ts:
@bryance/orch test: 111 | 
@bryance/orch test: 112 |     const trail = records(directory);
@bryance/orch test: 113 |     const record = trail.find((candidate) => candidate.event === "boundary.answer");
@bryance/orch test: 114 |     if (record === undefined) throw new Error("missing boundary answer record");
@bryance/orch test: 115 |     expect(Number.isFinite(record.at)).toBe(true);
@bryance/orch test: 116 |     expect(record).toEqual({
@bryance/orch test:                          ^
@bryance/orch test: error: expect(received).toEqual(expected)
@bryance/orch test: 
@bryance/orch test:   {
@bryance/orch test:     "agentId": "y27uhuqmv5",
@bryance/orch test:     "at": 1789073099759,
@bryance/orch test:     "correlationId": "dispatch-1",
@bryance/orch test:     "event": "boundary.answer",
@bryance/orch test:     "fields": {
@bryance/orch test: -     "reason": "no-pane",
@bryance/orch test: +     "reason": "not-placed",
@bryance/orch test:       "target": "y27uhuqmv5",
@bryance/orch test:     },
@bryance/orch test:     "level": "debug",
@bryance/orch test:   }
@bryance/orch test: 
@bryance/orch test: - Expected  - 1
@bryance/orch test: + Received  + 1
@bryance/orch test: 
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\daemon-decision-trail.test.ts:116:20)
@bryance/orch test: (pass) daemon decision trail > records a lease granted over a dead holder [233.99ms]
@bryance/orch test: (fail) daemon decision trail > records a no-pane boundary answer with its reason [201.17ms]
@bryance/orch test: 
@bryance/orch test: test\commands-control.test.ts:
@bryance/orch test: (pass) commands/control > parses dispatch flags without losing prompt words [0.26ms]
@bryance/orch test: (pass) commands/control > parses --then destination and note [0.05ms]
@bryance/orch test: (pass) commands/control > adds worker header unless raw [0.13ms]
@bryance/orch test: 
@bryance/orch test: test\commands-status.test.ts:
@bryance/orch test: (pass) commands/status > zero-row message reports gathered counts and backend response [0.04ms]
@bryance/orch test: 
@bryance/orch test: test\os-side.test.ts:
@bryance/orch test: (pass) osSide > supports both platform branches independent of ambient host [0.10ms]
@bryance/orch test: 
@bryance/orch test: integration\reset-build-safety.test.ts:
@bryance/orch test: (pass) build reset safety > --build dry-run never names a path inside ORCH_DIR [2576.84ms]
@bryance/orch test: 
@bryance/orch test: test\commands-daemon.test.ts:
@bryance/orch test: (pass) commands/daemon > parses governance and validates daemon status [0.86ms]
@bryance/orch test: (pass) commands/daemon > reads a lock pid only from a complete lock record [29.00ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-identity.test.ts:
@bryance/orch test: (pass) one key per pane spawn (12.1) > a name freed by a dead agent is reusable, and the two agents differ in identity [261.86ms]
@bryance/orch test: (pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [234.74ms]
@bryance/orch test: (pass) A1: spawn registration records the space as an environment axis > a spawn into a space writes agent_spaces, and the composer reads it back [253.45ms]
@bryance/orch test: (pass) A1: spawn registration records the space as an environment axis > a spawn stating no space records NO ROW ΓÇö a missing axis is a missing row [192.80ms]
@bryance/orch test: (pass) A1: spawn registration records the space as an environment axis > moving an agent to another space closes the old interval and keeps its identity [270.71ms]
@bryance/orch test: 
@bryance/orch test: test\commands-results.test.ts:
@bryance/orch test: (pass) commands/results > renders missing space and host as absent instead of inventing local [295.90ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > closes every watcher when watched agent directories disappear [147.00ms]
@bryance/orch test: 
@bryance/orch test: test\peer-lease-visibility.test.ts:
@bryance/orch test: (pass) peer summaries carry ownership as a lease > a peer the caller holds reports the caller as the live holder [1817.30ms]
@bryance/orch test: 
@bryance/orch test: test\commands-events.test.ts:
@bryance/orch test: (pass) commands/events > owned renderers and tool help do not expose the retired workspace term [0.86ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-limits.test.ts:
@bryance/orch test: (pass) spawn limits > schema loads global and workspace caps [19.13ms]
@bryance/orch test: 
@bryance/orch test: integration\routing-hardening.test.ts:
@bryance/orch test: (pass) store hardening > stores hostile values as data and preserves pack selection [280.10ms]
@bryance/orch test: 
@bryance/orch test: test\outbox-ack.test.ts:
@bryance/orch test: (pass) outbox ack fallback > consumes a fake agent ack from ack.jsonl on the next drain [315.76ms]
@bryance/orch test: 
@bryance/orch test: test\store-runs.test.ts:
@bryance/orch test: (pass) run rows > upsert updates a row while preserving its original start time [191.85ms]
@bryance/orch test: (pass) run rows > orders by started time, filters by agent, and honours limit [222.51ms]
@bryance/orch test: (pass) run rows > omits absent optional fields instead of returning null [163.55ms]
@bryance/orch test: (pass) run rows > deletes only rows older than the cutoff and returns the count [254.89ms]
@bryance/orch test: (pass) run rows > stays readable after the agent presence directory is deleted [248.52ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > an RPC subscriber receives a presence transition [273.57ms]
@bryance/orch test: 
@bryance/orch test: test\claim-agent.test.ts:
@bryance/orch test: (pass) claim agent > claimed A, claim A ΓåÆ unchanged [216.72ms]
@bryance/orch test: (pass) claim agent > claimed A, reclaimAgent(id) then B ΓåÆ stamped with B [202.19ms]
@bryance/orch test: (pass) claim agent > claimed A, plain claim B ΓåÆ refused claimed-by-other, row unchanged [286.99ms]
@bryance/orch test: (pass) claim agent > unknown id ΓåÆ refused unknown-agent [181.93ms]
@bryance/orch test: 
@bryance/orch test: test\claude-hooks.test.ts:
@bryance/orch test: (pass) Claude hook command > gates execution on the launch environment variable [10.05ms]
@bryance/orch test: 
@bryance/orch test: test\reap-walks-provenance.test.ts:
@bryance/orch test: (pass) reap walks the provenance tree (H3) > the tree is reaped from the LEAF up, one sweep per level [257.40ms]
@bryance/orch test: (pass) reap walks the provenance tree (H3) > a LIVE descendant blocks the reap even when the parent ended long ago [312.73ms]
@bryance/orch test: (pass) reap walks the provenance tree (H3) > provenance has no ON DELETE CASCADE, so no reap can erase a subtree [191.77ms]
@bryance/orch test: 
@bryance/orch test: test\recipient-label.test.ts:
@bryance/orch test: (pass) agent identity shown to an operator > names the agent and its harness, never the transport key [0.09ms]
@bryance/orch test: (pass) agent identity shown to an operator > drops the routing prefix when nothing is known about it [0.02ms]
@bryance/orch test: (pass) agent identity shown to an operator > a nameless agent gets a stable logical name, not its key [0.14ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-limits.test.ts:
@bryance/orch test: (pass) spawn limits > rejects invalid cap %s with file and key [8.34ms]
@bryance/orch test: (pass) spawn limits > rejects invalid cap %s with file and key [12.76ms]
@bryance/orch test: (pass) spawn limits > rejects invalid cap %s with file and key [10.98ms]
@bryance/orch test: (pass) spawn limits > omitted fleet caps normalize to defaults [13.08ms]
@bryance/orch test: (pass) spawn limits > global boundary refusal data counts the whole request [58.73ms]
@bryance/orch test: (pass) spawn limits > one workspace may use the full global allotment [28.89ms]
@bryance/orch test: (pass) spawn limits > workspace cap is independent of global headroom [48.66ms]
@bryance/orch test: (pass) spawn limits > uncapped space is bounded only by global count [17.18ms]
@bryance/orch test: (pass) spawn limits > foreign pack members do not consume the caller's pack cap [77.29ms]
@bryance/orch test: (pass) spawn limits > dead pid records free capacity [12.70ms]
@bryance/orch test: (pass) spawn limits > foreign panes never count [17.70ms]
@bryance/orch test: (pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [18.61ms]
@bryance/orch test: (pass) spawn limits > doctor accepts satisfiable limits [6.71ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > a dispatched transition writes the full run row and preserves untruncated result [244.78ms]
@bryance/orch test: 
@bryance/orch test: test\store-task-rows.test.ts:
@bryance/orch test: (pass) task and attempt rows > malformed task rows are refused instead of handed back as typed data [231.16ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-name-list.test.ts:
@bryance/orch test: (pass) spawn names every agent positionally, at creation > the positional arguments are the names, one per pane [0.41ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > the pane count is how many names were given [0.05ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > spawning with no name at all is refused [0.11ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > a bare count is not a name and is refused [0.14ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > the same name twice would collide, so it is refused before anything is created [0.07ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > every name is validated, so one bad name creates nothing [0.05ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > --name is gone: naming is positional, so the flag is an unknown flag [0.19ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > claimSpawnNames takes the resolved names and asserts each is free [4.75ms]
@bryance/orch test: 
@bryance/orch test: test\reload-no-bundle-write.test.ts:
@bryance/orch test: {"results":[],"ok":0,"total":0,"hard":false,"signaled":"reload.signal"}
@bryance/orch test: (pass) reload > does not write installed extension bundles [42.81ms]
@bryance/orch test: 
@bryance/orch test: test\remote-fanout.test.ts:
@bryance/orch test: (pass) async remote fan-out > parses valid JSON from a host [219.90ms]
@bryance/orch test: 
@bryance/orch test: integration\os-executors.test.ts:
@bryance/orch test: (pass) cross-OS execution is a backend, not a peer daemon > the local side supplies start, is-alive and kill [1.24ms]
@bryance/orch test: 
@bryance/orch test: test\commands-events.test.ts:
@bryance/orch test: (pass) commands/events > bare events is scoped to this session's agents and renders readable lines [0.10ms]
@bryance/orch test: (pass) commands/events > parses the scope flags [0.09ms]
@bryance/orch test: (pass) commands/events > parses the wake-up flags [0.05ms]
@bryance/orch test: (pass) commands/events > --filter narrows to named states and is never the default [0.08ms]
@bryance/orch test: (pass) commands/events > includes an adopted agent whose open lease is mine [0.03ms]
@bryance/orch test: (pass) commands/events > includes a reused pane leased by me even when another session spawned it [0.01ms]
@bryance/orch test: (pass) commands/events > includes an unleased agent spawned by this session [0.01ms]
@bryance/orch test: (pass) commands/events > excludes an agent spawned by a different session [0.01ms]
@bryance/orch test: (pass) commands/events > --space-wide passes agents from both sessions [0.03ms]
@bryance/orch test: (pass) commands/events > excludes an agent while another orch holds its lease [0.01ms]
@bryance/orch test: (pass) commands/events > describes durable replay and reports pruned history gaps [0.05ms]
@bryance/orch test: (pass) commands/events > names one agent by name or by identity key [0.04ms]
@bryance/orch test: (pass) commands/events > a subscription with no daemon keeps redialing instead of exiting [0.54ms]
@bryance/orch test: (pass) commands/events > renders opaque plexer coordinates without relabeling them as spaces [0.49ms]
@bryance/orch test: (pass) commands/events > an event line says what happened, never the fleet's books [0.08ms]
@bryance/orch test: (pass) commands/events > rejects malformed event and labels sinks [0.12ms]
@bryance/orch test: (pass) commands/events space wall > an agent is heard only inside the space it currently occupies [243.38ms]
@bryance/orch test: (pass) commands/events space wall > moving an agent moves its events with it [215.29ms]
@bryance/orch test: (pass) commands/events space wall > an unplaced caller has no wall and hears the machine [208.27ms]
@bryance/orch test: (pass) commands/events space wall > a key naming no registered agent is in no space [5.71ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > repeated transitions upsert one run and only terminal states set finishedAt [216.71ms]
@bryance/orch test: 
@bryance/orch test: test\pi-model-control.test.ts:
@bryance/orch test: (pass) splitThinkingSuffix > splits a valid ladder effort off the bare id [0.10ms]
@bryance/orch test: (pass) splitThinkingSuffix > leaves a bare model untouched [0.02ms]
@bryance/orch test: (pass) splitThinkingSuffix > keeps a trailing colon token that is not a thinking level as part of the id [0.02ms]
@bryance/orch test: (pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > looks up the BARE id and returns the effort suffix separately [0.62ms]
@bryance/orch test: (pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > retries until a still-booting registry answers [3.82ms]
@bryance/orch test: (pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > throws when the registry never yields the model [0.26ms]
@bryance/orch test: (pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > rejects a token without a provider/id shape [0.09ms]
@bryance/orch test: (pass) createModelControl.applyControlCommand > applies a suffixed model command and records a success outcome [0.81ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > a status without a dispatch id does not write history [140.38ms]
@bryance/orch test: 
@bryance/orch test: test\store-agent-rows.test.ts:
@bryance/orch test: (pass) agent store rows > insertAgent materializes the provenance root [253.37ms]
@bryance/orch test: (pass) agent store rows > endAgent records who closed it, nullable for death [209.14ms]
@bryance/orch test: (pass) agent store rows > liveAgents excludes agents with an ending [172.54ms]
@bryance/orch test: (pass) agent store rows > packMembers selects the materialized root [230.87ms]
@bryance/orch test: (pass) agent store rows > unknown harness is rejected by the foreign key [136.54ms]
@bryance/orch test: (pass) agent store rows > unknown spawnedBy is rejected by the foreign key [142.87ms]
@bryance/orch test: (pass) agent store rows > label maps both null and a value [205.70ms]
@bryance/orch test: (pass) agent store rows > created_at is an INTEGER epoch millisecond [236.27ms]
@bryance/orch test: (pass) agent store rows > worktreeOf distinguishes repo agents from worktree agents [240.76ms]
@bryance/orch test: (pass) agent store rows > renameAgent is id-keyed and leaves identity history unchanged [214.99ms]
@bryance/orch test: (pass) agent store rows > lookup ensure operations are insert-or-ignore [202.51ms]
@bryance/orch test: (pass) agent store rows > childrenOf returns direct descendants [217.04ms]
@bryance/orch test: 
@bryance/orch test: integration\routing-hardening.test.ts:
@bryance/orch test: (pass) store hardening > a fresh store creates the full current schema with WAL enabled [185.90ms]
@bryance/orch test: (pass) store hardening > the store refuses a second open holding, so ownership cannot fork [193.11ms]
@bryance/orch test: (pass) store hardening > adoption closes the prior holding in the same step that opens the new one [174.72ms]
@bryance/orch test: (pass) store hardening > the attempt insert claim is exactly once [168.24ms]
@bryance/orch test: 
@bryance/orch test: test\remote-fanout.test.ts:
@bryance/orch test: (pass) async remote fan-out > returns a typed dead-host failure [343.88ms]
@bryance/orch test: 
@bryance/orch test: test\store-interval-rows.test.ts:
@bryance/orch test: (pass) interval satellites > half-open adjacency is legal [200.53ms]
@bryance/orch test: (pass) interval satellites > clearSpace closes without opening [221.79ms]
@bryance/orch test: (pass) interval satellites > agent plexer is immutable one-shot [195.66ms]
@bryance/orch test: (pass) interval satellites > process restart history closes at the successor since [347.12ms]
@bryance/orch test: (pass) interval satellites > process rows carry host and process identity [197.26ms]
@bryance/orch test: (pass) interval satellites > nullable process start_token round-trips as null [212.43ms]
@bryance/orch test: (pass) interval satellites > space move history closes at the successor since [261.48ms]
@bryance/orch test: (pass) interval satellites > tuning change history closes at the successor since [254.47ms]
@bryance/orch test: (pass) interval satellites > handle history preserves each renumbered handle [309.25ms]
@bryance/orch test: (pass) interval satellites > interval instants are stored as INTEGER values [285.10ms]
@bryance/orch test: (pass) interval satellites > process wrapper rolls back predecessor close when successor fails [209.91ms]
@bryance/orch test: (pass) interval satellites > space wrapper rolls back predecessor close when successor fails [240.43ms]
@bryance/orch test: (pass) interval satellites > tuning carries model and nullable thinking [176.22ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > a throwing history write does not stop event delivery [158.67ms]
@bryance/orch test: 
@bryance/orch test: test\store-catalogue.test.ts:
@bryance/orch test: (pass) catalogue rows > empty store reads an empty Map [134.46ms]
@bryance/orch test: 
@bryance/orch test: integration\routing-hardening.test.ts:
@bryance/orch test: (pass) CLI offline routing > status --offline does not start or contact orchd [387.00ms]
@bryance/orch test: 
@bryance/orch test: test\store-lease-rows.test.ts:
@bryance/orch test: (pass) agent lease rows > fencing ids are monotonic across agents and never reused after reap [323.50ms]
@bryance/orch test: 
@bryance/orch test: test\outbox-ack.test.ts:
@bryance/orch test: (pass) outbox ack fallback > keeps an unacknowledged delivery pending for retry [191.93ms]
@bryance/orch test: (pass) outbox ack fallback > a duplicated ack marker is counted once, not twice [189.92ms]
@bryance/orch test: (pass) outbox ack fallback > an ack whose key does not match the agent dir is ignored [171.87ms]
@bryance/orch test: (pass) outbox ack fallback > an inbox write is queued, not delivered: only the agent's ack settles the row [176.29ms]
@bryance/orch test: (pass) outbox ack fallback > a channel that can never ack settles the row on the write itself [112.78ms]
@bryance/orch test: (pass) outbox ack fallback > a queued write is handed off, so it is open but no longer unsent [146.25ms]
@bryance/orch test: (pass) outbox ack fallback > a write no channel would take stays unsent [240.76ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > emitted events carry the pack capacity at publish time [190.81ms]
@bryance/orch test: (pass) daemon presence events > a flapping status file cannot storm the stream with repeat transitions [0.32ms]
@bryance/orch test: (pass) daemon presence events > a genuine repeat of the same transition for new work still publishes [0.16ms]
@bryance/orch test: (pass) daemon presence events > a repeat transition publishes again once the suppression window passes [0.08ms]
@bryance/orch test: (pass) daemon presence events > repeated observations cannot slide the suppression window forever [0.04ms]
@bryance/orch test: (pass) daemon presence events > a working-to-done repeat after the dedupe window is emitted [0.09ms]
@bryance/orch test: (pass) daemon presence events > presence transitions resolve the human name before emission [1.18ms]
@bryance/orch test: (pass) daemon presence events > presence transitions use the normalized agent name after rename [210.35ms]
@bryance/orch test: (pass) daemon presence events > derivePresenceTransition preserves the complete asking transition payload [2.37ms]
@bryance/orch test: 
@bryance/orch test: test\remote-fanout.test.ts:
@bryance/orch test: (pass) async remote fan-out > returns a typed timeout failure [540.91ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > an asking transition drives command sink delivery [106.49ms]
@bryance/orch test: 
@bryance/orch test: test\backend-headless.test.ts:
@bryance/orch test: (pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [55.40ms]
@bryance/orch test: (pass) HeadlessBackend > signals a matching recorded process through the injected killer [1366.91ms]
@bryance/orch test: (pass) HeadlessBackend > refuses to signal a pid whose process instance was replaced [874.56ms]
@bryance/orch test: (pass) HeadlessBackend > never signals a dead pid [0.29ms]
@bryance/orch test: 
@bryance/orch test: integration\close-always.test.ts:
@bryance/orch test: {"closed":["owned00001"],"results":[{"target":"owned00001","handle":"pane-owned","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
@bryance/orch test: {"outcome":"answer","reason":"no-environment-role","text":"this pane environment does not provide abort"}
@bryance/orch test: {"closed":["duplicate1"],"results":[{"target":"duplicate1","handle":"pane-duplicate","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
@bryance/orch test: (pass) close always works > presence pid without a recorded process closes the pane without signalling and ends the row [345.76ms]
@bryance/orch test: (pass) close always works > close ignores owner and spawnedBy gates [288.85ms]
@bryance/orch test: (pass) close always works > abort ignores owner gate [335.98ms]
@bryance/orch test: (pass) close always works > duplicate close targets count once [310.89ms]
@bryance/orch test: (pass) close always works > dead pane-less close is a successful no-op that ends the row and leaves presence to reap [883.83ms]
@bryance/orch test: (pass) close always works > steer remains blocked by the space wall [240.35ms]
@bryance/orch test: 
@bryance/orch test: integration\daemon-no-peer-credentials.test.ts:
@bryance/orch test: (pass) the daemon asks for a token and nothing else > no peer-credential or ancestry syscall appears in the daemon at all [3.85ms]
@bryance/orch test: 
@bryance/orch test: test\outbox-replay.test.ts:
@bryance/orch test: (pass) outbox restart replay > replays failed messages after restart without duplicates [186.55ms]
@bryance/orch test: 
@bryance/orch test: test\backend-herdr-predicates.test.ts:
@bryance/orch test: (pass) herdr environment predicates > neither variable set [0.91ms]
@bryance/orch test: (pass) herdr environment predicates > HERDR_ENV=1 only [0.16ms]
@bryance/orch test: (pass) herdr environment predicates > HERDR_PANE_ID only [0.37ms]
@bryance/orch test: (pass) herdr environment predicates > both variables set [0.13ms]
@bryance/orch test: 
@bryance/orch test: test\remote-fanout.test.ts:
@bryance/orch test: (pass) async remote fan-out > returns a typed non-JSON failure [285.37ms]
@bryance/orch test: 
@bryance/orch test: test\build-bin.test.ts:
@bryance/orch test: (pass) build entrypoint > always stamps a node shebang and executable mode [22.77ms]
@bryance/orch test: (pass) the installed CLI is the packaged build, never live source (K2) > the `orch` bin points at the packaged entrypoint, not bin/orch.ts [0.08ms]
@bryance/orch test: (pass) the installed CLI is the packaged build, never live source (K2) > the packaged entrypoint is built for node, from the source entrypoint [0.04ms]
@bryance/orch test: (pass) the installed CLI is the packaged build, never live source (K2) > a global install cannot happen without a build in front of it [0.05ms]
@bryance/orch test: (pass) the installed CLI is the packaged build, never live source (K2) > the package ships dist/, so what is installed is what was built [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\backend-herdr.test.ts:
@bryance/orch test: (pass) HerdrBackend > current identity uses the explicit id, not the launch environment [4.09ms]
@bryance/orch test: 
@bryance/orch test: integration\codex-adapter.test.ts:
@bryance/orch test: (pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [7.85ms]
@bryance/orch test: 
@bryance/orch test: test\backend-herdr.test.ts:
@bryance/orch test: 210 | 
@bryance/orch test: 211 |   test("a caller pane is split rather than given a new tab", () => {
@bryance/orch test: 212 |     herdrArgv.length = 0;
@bryance/orch test: 213 |     backend.spawn(fakeAdapter, { cwd: testDir, workspace: "ws-test", split: "down", targetPane: "w0:p1" });
@bryance/orch test: 214 | 
@bryance/orch test: 215 |     expect(herdrArgv[0]).toEqual(
@bryance/orch test:                                ^
@bryance/orch test: error: expect(received).toEqual(expected)
@bryance/orch test: 
@bryance/orch test:   [
@bryance/orch test: -   "pane",
@bryance/orch test: -   "split",
@bryance/orch test: -   "w0:p1",
@bryance/orch test: -   "--direction",
@bryance/orch test: -   "down",
@bryance/orch test: +   "tab",
@bryance/orch test: +   "create",
@bryance/orch test: +   "--workspace",
@bryance/orch test: +   "ws-test",
@bryance/orch test:     "--cwd",
@bryance/orch test:     "C:\Users\Bryan\AppData\Local\Temp\orch-backend-herdr-L49tG3",
@bryance/orch test:     "--env",
@bryance/orch test:     "ORCH_ENVIRONMENT={"labels":true,"blockedEvent":"herdr:blocked"}",
@bryance/orch test:     "--env",
@bryance/orch test:     "ORCH_PROJECT=C:\dev\personal\orch\packages\orch",
@bryance/orch test:     "--no-focus",
@bryance/orch test:   ]
@bryance/orch test: 
@bryance/orch test: - Expected  - 5
@bryance/orch test: + Received  + 4
@bryance/orch test: 
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\backend-herdr.test.ts:215:26)
@bryance/orch test: 229 | 
@bryance/orch test: 230 |   test("split direction clamps to herdr's right|down", () => {
@bryance/orch test: 231 |     herdrArgv.length = 0;
@bryance/orch test: 232 |     backend.spawn(fakeAdapter, { cwd: testDir, workspace: "ws-test", split: "right", targetPane: "w0:p1" });
@bryance/orch test: 233 | 
@bryance/orch test: 234 |     expect(herdrArgv[0]?.[4]).toBe("right");
@bryance/orch test:                                     ^
@bryance/orch test: error: expect(received).toBe(expected)
@bryance/orch test: 
@bryance/orch test: Expected: "right"
@bryance/orch test: Received: "--cwd"
@bryance/orch test: 
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\backend-herdr.test.ts:234:31)
@bryance/orch test: 254 |     herdrArgv.length = 0;
@bryance/orch test: 255 |     freshPane("w0:p9");
@bryance/orch test: 256 |     const handle = backend.spawn(fakeAdapter, { cwd: testDir, workspace: "ws-test", group: "t9", intoPane: "w0:p9" });
@bryance/orch test: 257 | 
@bryance/orch test: 258 |     expect(handle).toBe("w0:p9");
@bryance/orch test: 259 |     expect(herdrArgv).toEqual([
@bryance/orch test:                             ^
@bryance/orch test: error: expect(received).toEqual(expected)
@bryance/orch test: 
@bryance/orch test:   [
@bryance/orch test:     [
@bryance/orch test: +     "tab",
@bryance/orch test: +     "list",
@bryance/orch test: +   ],
@bryance/orch test: +   [
@bryance/orch test: +     "agent",
@bryance/orch test: +     "list",
@bryance/orch test: +   ],
@bryance/orch test: +   [
@bryance/orch test: +     "pane",
@bryance/orch test: +     "list",
@bryance/orch test: +   ],
@bryance/orch test: +   [
@bryance/orch test: +     "tab",
@bryance/orch test: +     "create",
@bryance/orch test: +     "--workspace",
@bryance/orch test: +     "ws-test",
@bryance/orch test: +     "--cwd",
@bryance/orch test: +     "C:\Users\Bryan\AppData\Local\Temp\orch-backend-herdr-L49tG3",
@bryance/orch test: +     "--env",
@bryance/orch test: +     "ORCH_ENVIRONMENT={"labels":true,"blockedEvent":"herdr:blocked"}",
@bryance/orch test: +     "--env",
@bryance/orch test: +     "ORCH_PROJECT=C:\dev\personal\orch\packages\orch",
@bryance/orch test: +     "--no-focus",
@bryance/orch test: +   ],
@bryance/orch test: +   [
@bryance/orch test:       "pane",
@bryance/orch test:       "rename",
@bryance/orch test:       "w0:p9",
@bryance/orch test:       "pi-agent",
@bryance/orch test:     ],
@bryance/orch test:     [
@bryance/orch test:       "agent",
@bryance/orch test:       "list",
@bryance/orch test:     ],
@bryance/orch test:     [
@bryance/orch test:       "agent",
@bryance/orch test:       "start",
@bryance/orch test:       "pi-agent",
@bryance/orch test:       "--kind",
@bryance/orch test:       "pi",
@bryance/orch test:       "--pane",
@bryance/orch test:       "w0:p9",
@bryance/orch test:       "--timeout",
@bryance/orch test:       "30000",
@bryance/orch test:     ],
@bryance/orch test:   ]
@bryance/orch test: 
@bryance/orch test: - Expected  - 0
@bryance/orch test: + Received  + 25
@bryance/orch test: 
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\backend-herdr.test.ts:259:23)
@bryance/orch test: 274 |       "--label", "fleet", "--env", `${LAUNCH_ENV}=${key}`, "--env", `ORCH_PROJECT=${projectRoot()}`,
@bryance/orch test: 275 |     ]);
@bryance/orch test: 276 |   });
@bryance/orch test: 277 | 
@bryance/orch test: 278 |   test("the pane host closes a pane through herdr", () => {
@bryance/orch test: 279 |     backend.paneHost.close("w0:p2");
@bryance/orch test:                   ^
@bryance/orch test: TypeError: undefined is not an object (evaluating 'backend.paneHost.close')
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\backend-herdr.test.ts:279:13)
@bryance/orch test: 284 |     // The pane is born in the planned neighbour's tab, so the same-tab move
@bryance/orch test: 285 |     // that used to follow only bounced it through a throwaway tab and back.
@bryance/orch test: 286 |     herdrArgv.length = 0;
@bryance/orch test: 287 |     backend.spawn(fakeAdapter, { cwd: testDir, workspace: "ws-test", group: "t1", split: "down", targetPane: "w0:p1" });
@bryance/orch test: 288 | 
@bryance/orch test: 289 |     expect(herdrArgv[0]?.slice(0, 5)).toEqual(["pane", "split", "w0:p1", "--direction", "down"]);
@bryance/orch test:                                             ^
@bryance/orch test: error: expect(received).toEqual(expected)
@bryance/orch test: 
@bryance/orch test:   [
@bryance/orch test: -   "pane",
@bryance/orch test: -   "split",
@bryance/orch test: -   "w0:p1",
@bryance/orch test: -   "--direction",
@bryance/orch test: -   "down",
@bryance/orch test: +   "tab",
@bryance/orch test: +   "list",
@bryance/orch test:   ]
@bryance/orch test: 
@bryance/orch test: - Expected  - 5
@bryance/orch test: + Received  + 2
@bryance/orch test: 
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\backend-herdr.test.ts:289:39)
@bryance/orch test: 332 |     }
@bryance/orch test: 333 |   });
@bryance/orch test: 334 | 
@bryance/orch test: 335 |   test("reads recent unwrapped pane output", () => {
@bryance/orch test: 336 |     herdrArgv.length = 0;
@bryance/orch test: 337 |     backend.paneScreen.read("w0:p1", 12);
@bryance/orch test:                   ^
@bryance/orch test: TypeError: undefined is not an object (evaluating 'backend.paneScreen.read')
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\backend-herdr.test.ts:337:13)
@bryance/orch test: 342 |     moveResults.push({ changed: false, reason: "tab_not_found" });
@bryance/orch test: 343 |     expect(() => backend.groupHome.move({ handle: "w0:p3", group: "t9", split: "right" })).toThrow("tab_not_found");
@bryance/orch test: 344 |   });
@bryance/orch test: 345 | 
@bryance/orch test: 346 |   test("groupLayout reads tab geometry straight off the pane listing", () => {
@bryance/orch test: 347 |     expect(backend.groupLayout.read("t1")).toEqual({
@bryance/orch test:                                                  ^
@bryance/orch test: error: expect(received).toEqual(expected)
@bryance/orch test: 
@bryance/orch test:   {
@bryance/orch test:     "group": "t1",
@bryance/orch test: -   "panes": [
@bryance/orch test: +   "placements": [
@bryance/orch test:       {
@bryance/orch test:         "handle": "w0:p1",
@bryance/orch test:         "rect": {
@bryance/orch test:           "height": 50,
@bryance/orch test:           "width": 100,
@bryance/orch test:           "x": 0,
@bryance/orch test:           "y": 0,
@bryance/orch test:         },
@bryance/orch test:       },
@bryance/orch test:       {
@bryance/orch test:         "handle": "w0:p2",
@bryance/orch test:         "rect": {
@bryance/orch test:           "height": 50,
@bryance/orch test:           "width": 100,
@bryance/orch test:           "x": 100,
@bryance/orch test:           "y": 0,
@bryance/orch test:         },
@bryance/orch test:       },
@bryance/orch test:     ],
@bryance/orch test:   }
@bryance/orch test: 
@bryance/orch test: - Expected  - 1
@bryance/orch test: + Received  + 1
@bryance/orch test: 
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\backend-herdr.test.ts:347:44)
@bryance/orch test: 354 |     expect(() => backend.groupLayout.read("t2")).toThrow("no panes on tab t2");
@bryance/orch test: 355 |   });
@bryance/orch test: 356 | 
@bryance/orch test: 357 |   test("pane input submits through pane run", () => {
@bryance/orch test: 358 |     herdrArgv.length = 0;
@bryance/orch test: 359 |     backend.paneInput.submit("w0:p1", "ls");
@bryance/orch test:                   ^
@bryance/orch test: TypeError: undefined is not an object (evaluating 'backend.paneInput.submit')
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\backend-herdr.test.ts:359:13)
@bryance/orch test: 362 |   });
@bryance/orch test: 363 | 
@bryance/orch test: 364 |   test("pane rename failure reaches the role caller", () => {
@bryance/orch test: 365 |     paneRenameFails = true;
@bryance/orch test: 366 |     try {
@bryance/orch test: 367 |       expect(() => backend.paneNaming.renamePane("w0:p1", "renamed")).toThrow("pane rename failed");
@bryance/orch test:                                                                             ^
@bryance/orch test: error: expect(received).toThrow(expected)
@bryance/orch test: 
@bryance/orch test: Expected substring: "pane rename failed"
@bryance/orch test: Received message: "undefined is not an object (evaluating 'backend.paneNaming.renamePane')"
@bryance/orch test: 
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\backend-herdr.test.ts:367:71)
@bryance/orch test: (pass) HerdrBackend > composes a complete group role bundle [0.07ms]
@bryance/orch test: (pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [1.35ms]
@bryance/orch test: (pass) HerdrBackend > starts the mapped herdr harness kind in the pane it created [0.17ms]
@bryance/orch test: (pass) HerdrBackend > agent_not_ready keeps the pane and does not close it [0.23ms]
@bryance/orch test: (fail) HerdrBackend > a caller pane is split rather than given a new tab [0.53ms]
@bryance/orch test: (pass) HerdrBackend > pane and tab creation always preserves focus [0.22ms]
@bryance/orch test: (fail) HerdrBackend > split direction clamps to herdr's right|down [0.84ms]
@bryance/orch test: (pass) HerdrBackend > env reaches the pane through herdr's --env, not an argv prefix [0.28ms]
@bryance/orch test: (fail) HerdrBackend > a handed-over pane is launched into directly, never split or closed [0.64ms]
@bryance/orch test: (pass) HerdrBackend > a group is created with the environment its own pane will launch under [0.24ms]
@bryance/orch test: (fail) HerdrBackend > the pane host closes a pane through herdr [0.18ms]
@bryance/orch test: (fail) HerdrBackend > a planned target pane is split directly, never re-seated afterwards [0.48ms]
@bryance/orch test: (pass) HerdrBackend > a grouped spawn with no planned target splits a pane already in that tab, never the caller's pane [6.85ms]
@bryance/orch test: (pass) HerdrBackend > a same-tab re-seat bounces through a throwaway tab so herdr executes it [0.28ms]
@bryance/orch test: (pass) HerdrBackend > adopts herdr's replacement pane id after move [0.06ms]
@bryance/orch test: (pass) HerdrBackend > refuses a live herdr agent name before start [0.62ms]
@bryance/orch test: (fail) HerdrBackend > reads recent unwrapped pane output [0.58ms]
@bryance/orch test: (pass) HerdrBackend > a refused move surfaces herdr's reason instead of claiming success [0.11ms]
@bryance/orch test: (fail) HerdrBackend > groupLayout reads tab geometry straight off the pane listing [0.70ms]
@bryance/orch test: (fail) HerdrBackend > pane input submits through pane run [0.44ms]
@bryance/orch test: (fail) HerdrBackend > pane rename failure reaches the role caller [0.27ms]
@bryance/orch test: (pass) HerdrBackend > waiting uses agent wait --until, not the removed top-level wait [0.12ms]
@bryance/orch test: (pass) HerdrBackend space home > opens an orch-marked workspace for a pack the caller did not label [0.39ms]
@bryance/orch test: (pass) HerdrBackend space home > a space home the human named keeps that name [0.07ms]
@bryance/orch test: (pass) HerdrBackend space home > create hands back the plexer coordinate and the root pane, and says neither [0.04ms]
@bryance/orch test: 
@bryance/orch test: integration\settings-command.test.ts:
@bryance/orch test: (pass) orch settings > every registered setting is reachable through --json [428.69ms]
@bryance/orch test: 
@bryance/orch test: test\commands-logging.test.ts:
@bryance/orch test: (pass) orch logs > --dispatch selects one dispatch across both sinks, oldest first [36.85ms]
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
@bryance/orch test:   add       hono                 Add a dependency to package.json (bun a)
@bryance/orch test:   remove    moment               Remove a dependency from package.json (bun rm)
@bryance/orch test:   update    react                Update outdated dependencies
@bryance/orch test:   audit                          Check installed packages for vulnerabilities
@bryance/orch test:   dedupe                         Remove duplicate versions from the lockfile
@bryance/orch test:   prune                          Remove packages that are not in the lockfile from node_modules
@bryance/orch test:   outdated                       Display latest versions of outdated dependencies
@bryance/orch test:   link      [<package>]          Register or link a local npm package
@bryance/orch test:   unlink                         Unregister a local npm package
@bryance/orch test:   publish                        Publish a package to the npm registry
@bryance/orch test:   patch <pkg>                    Prepare a package for patching
@bryance/orch test:   pm <subcommand>                Additional package management utilities
@bryance/orch test:   info      lyra                 Display package metadata from the registry
@bryance/orch test:   why       @remix-run/dev       Explain why a package is installed
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
@bryance/orch test: (pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [1547.52ms]
@bryance/orch test: (pass) daemon lifecycle > reclaims an unreadable lock, which a crash truncated and no daemon owns [2033.47ms]
@bryance/orch test: (pass) daemon lifecycle > refuses an unreadable lock while the socket still answers [704.69ms]
@bryance/orch test: (pass) daemon lifecycle > clears the lock, socket and port a departed daemon owned, keeping the log [10.77ms]
@bryance/orch test: (pass) daemon lifecycle > refuses a stale lock when the socket probe cannot answer [853.52ms]
@bryance/orch test: (pass) daemon lifecycle > retries if a stale lock disappears during reclaim [808.43ms]
@bryance/orch test: 
@bryance/orch test: test\caller-kind.test.ts:
@bryance/orch test: (pass) caller kind > id + recorded token is agent [161.76ms]
@bryance/orch test: 
@bryance/orch test: test\store-catalogue.test.ts:
@bryance/orch test: (pass) catalogue rows > write then read round-trips at and stdout [209.12ms]
@bryance/orch test: (pass) catalogue rows > writing the same command twice keeps one row with newer values [156.36ms]
@bryance/orch test: (pass) catalogue rows > an entry with empty stdout is not stored [113.38ms]
@bryance/orch test: (pass) catalogue rows > clearCatalogues empties the store [184.56ms]
@bryance/orch test: (pass) catalogue rows > two commands coexist and updating one does not touch the other [178.04ms]
@bryance/orch test: 
@bryance/orch test: test\commands-status.test.ts:
@bryance/orch test: (pass) commands/status > dead rows never display stale live state [0.02ms]
@bryance/orch test: (pass) commands/status > shared row boundary normalizes stale state for every renderer [0.05ms]
@bryance/orch test: (pass) commands/status > a human at a terminal has no identity to narrow by and no space to be held inside [0.10ms]
@bryance/orch test: (pass) commands/status > an agent sees what it spawned, and never past its own space > the default is the agents this caller spawned [0.06ms]
@bryance/orch test: (pass) commands/status > an agent sees what it spawned, and never past its own space > --space-wide widens to the caller's space, which is the wall [0.02ms]
@bryance/orch test: (pass) commands/status > an agent sees what it spawned, and never past its own space > a human widening sees every space, including the one the agent could not [0.02ms]
@bryance/orch test: (pass) commands/status > derives status row fields from seeded presence [18.04ms]
@bryance/orch test: (pass) commands/status > marks dead presence as exited [8.55ms]
@bryance/orch test: (pass) commands/status > asking presence is surfaced as a question while still reporting live state [15.37ms]
@bryance/orch test: (pass) commands/status > shared status row carries presence-derived fields [5.64ms]
@bryance/orch test: (pass) commands/status > row carries the owning backend's declared capabilities [18.07ms]
@bryance/orch test: (pass) commands/status > an agent whose backend orch cannot name reports no capabilities [17.42ms]
@bryance/orch test: (pass) commands/status > status owner ignores spawning provenance when no lease exists [14.91ms]
@bryance/orch test: (pass) commands/status > lease-backed status attribution distinguishes my lease, another lease, and unleased rows [2123.29ms]
@bryance/orch test: (pass) commands/status > default table separates minted identity from pane environment [0.79ms]
@bryance/orch test: (pass) commands/status > human table shows harness and working directory facts [0.34ms]
@bryance/orch test: (pass) commands/status > json branch and local table branch derive identical rows apart from host [72.48ms]
@bryance/orch test: (pass) commands/status > capacity footer uses configured caps and groups holders by root [0.86ms]
@bryance/orch test: (pass) commands/status > formats workspace labels and warnings [0.16ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-lifecycle.test.ts:
@bryance/orch test: (pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [210.55ms]
@bryance/orch test: 
@bryance/orch test: integration\codex-adapter.test.ts:
@bryance/orch test: (pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [7.34ms]
@bryance/orch test: (pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [8.57ms]
@bryance/orch test: (pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [17.51ms]
@bryance/orch test: (pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [10.08ms]
@bryance/orch test: (pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [311.75ms]
@bryance/orch test: 
@bryance/orch test: test\commands-logging.test.ts:
@bryance/orch test: (pass) orch logs > --agent selects one agent's records [34.31ms]
@bryance/orch test: (pass) orch logs > --level selects one severity [68.99ms]
@bryance/orch test: (pass) orch logs > --since drops everything older than the instant given [32.13ms]
@bryance/orch test: (pass) orch logs > --since 0 keeps every record instead of being read as a missing value [24.50ms]
@bryance/orch test: (pass) orch logs > renders a readable line: instant, level, event, correlation, agent, fields [25.01ms]
@bryance/orch test: (pass) orch logs > --json emits the records themselves [24.37ms]
@bryance/orch test: (pass) command logging > notify test records the diagnosis and keeps user output on stdout [38.33ms]
@bryance/orch test: 
@bryance/orch test: test\commands-results.test.ts:
@bryance/orch test: (pass) commands/results > validates and extracts question payloads [0.15ms]
@bryance/orch test: (pass) commands/results > formats invalid and recent timestamps [0.07ms]
@bryance/orch test: (pass) commands/results > routes a seeded results.jsonl through the command module [259.13ms]
@bryance/orch test: (pass) commands/results > keeps every settled dispatch and reports the newest [263.74ms]
@bryance/orch test: (pass) commands/results > falls back to adapter session text when results.jsonl is absent [267.06ms]
@bryance/orch test: (pass) commands/results > uses results.jsonl even when the presence status has no agent [212.46ms]
@bryance/orch test: (pass) commands/results > orch tail resolves a non-pi target through that adapter's session view [230.05ms]
@bryance/orch test: (pass) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [265.54ms]
@bryance/orch test: (pass) commands/results > orch tail -n keeps last-N rendered entries for a pi session [234.66ms]
@bryance/orch test: (pass) commands/results > orch session reports the pi entry count [235.87ms]
@bryance/orch test: (pass) commands/results > orch session shows zero entries for an adapter view without them [245.63ms]
@bryance/orch test: 
@bryance/orch test: test\commands-models.test.ts:
@bryance/orch test: (pass) orch models lists the whole catalogue > shows every offered model, quicklisted or not, allowed or not [1.41ms]
@bryance/orch test: (pass) orch models lists the whole catalogue > marks the launch default (thinking suffix removed) and the quicklist members [0.14ms]
@bryance/orch test: (pass) orch models lists the whole catalogue > keeps harness sections in configured order [0.11ms]
@bryance/orch test: (pass) orch models lists the whole catalogue > a harness that enumerates nothing gets an empty section, not another's models [0.17ms]
@bryance/orch test: (pass) orch models filters > --preferred narrows to the quicklist and renumbers what is shown [0.06ms]
@bryance/orch test: (pass) orch models filters > --search matches spec and label case-insensitively [0.08ms]
@bryance/orch test: (pass) orch models filters > filters combine, and no match is an empty result rather than the full list [0.06ms]
@bryance/orch test: (pass) orch models --pick prints one spec > a numeric pick reads the displayed index of a single harness [0.20ms]
@bryance/orch test: (pass) orch models --pick prints one spec > an exact spec pick resolves after filtering [0.40ms]
@bryance/orch test: (pass) orch models --pick prints one spec > ambiguous, missing, zero, and out-of-range picks fail [0.74ms]
@bryance/orch test: (pass) orch models --json > emits the pinned harness/model shape [0.15ms]
@bryance/orch test: 
@bryance/orch test: test\commands-target.test.ts:
@bryance/orch test: (pass) commands/target > splits known flags and preserves positional args [0.27ms]
@bryance/orch test: 
@bryance/orch test: integration\doctor-settings-defects.test.ts:
@bryance/orch test: (pass) doctor settings defects > accepts an absent settings file [4.60ms]
@bryance/orch test: 
@bryance/orch test: test\commands-target.test.ts:
@bryance/orch test: (pass) commands/target > extracts target and joined prompt [0.62ms]
@bryance/orch test: (pass) commands/target > reads only structured result text [0.10ms]
@bryance/orch test: (pass) commands/target > quotes remote args and ORCH_DIR safely [0.13ms]
@bryance/orch test: (pass) commands/target > lists only live serialized identity presence entries [25.62ms]
@bryance/orch test: 
@bryance/orch test: test\caller-kind.test.ts:
@bryance/orch test: (pass) caller kind > id + other token is human [163.68ms]
@bryance/orch test: (pass) caller kind > id + no token is human [154.79ms]
@bryance/orch test: (pass) caller kind > no id is human [4.09ms]
@bryance/orch test: 
@bryance/orch test: test\control-ack.test.ts:
@bryance/orch test: (pass) control delivery acknowledgements > waits for the matching reader acknowledgement [0.75ms]
@bryance/orch test: 
@bryance/orch test: integration\identity-launch.test.ts:
@bryance/orch test: (pass) launchCredential > returns null when the launch environment is unset [5.80ms]
@bryance/orch test: 
@bryance/orch test: test\control-ack.test.ts:
@bryance/orch test: (pass) control delivery acknowledgements > captures an acknowledgement arriving during delivery [0.19ms]
@bryance/orch test: (pass) control delivery acknowledgements > never claims consumption for an unacknowledged channel [0.08ms]
@bryance/orch test: (pass) control delivery acknowledgements > times out without claiming that delivery was cancelled [3.21ms]
@bryance/orch test: (pass) control delivery acknowledgements > propagates a failed send and removes its waiter [0.31ms]
@bryance/orch test: 
@bryance/orch test: test\remote-fanout.test.ts:
@bryance/orch test: (pass) async remote fan-out > fans out and keeps per-host failures without throwing [562.88ms]
@bryance/orch test: 
@bryance/orch test: test\store-connection-guards.test.ts:
@bryance/orch test: (pass) store migration guards > a store predating the migrations is refused, not rebuilt over [178.90ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc.test.ts:
@bryance/orch test: (pass) daemon RPC > rejects a hello response with a malformed optional field [0.23ms]
@bryance/orch test: 
@bryance/orch test: test\commands-spawn.test.ts:
@bryance/orch test: (pass) commands/spawn > refuses an invalid name before resolving or creating a workspace [22.93ms]
@bryance/orch test: 
@bryance/orch test: integration\identity-launch.test.ts:
@bryance/orch test: (pass) launchCredential > returns a minted id [3.05ms]
@bryance/orch test: (pass) launchCredential > malformed value exits 1 and logs launch.invalid-key [116.51ms]
@bryance/orch test: 
@bryance/orch test: test\remote.test.ts:
@bryance/orch test: (pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.40ms]
@bryance/orch test: (pass) host-prefixed targets > reports unknown host and configured names [0.10ms]
@bryance/orch test: 
@bryance/orch test: test\backend-tmux.test.ts:
@bryance/orch test: 
@bryance/orch test: # Unhandled error between tests
@bryance/orch test: -------------------------------
@bryance/orch test: error: Cannot find module '../src/backends/pane-ready.ts' from 'C:\dev\personal\orch\packages\orch\test\backend-tmux.test.ts'
@bryance/orch test: -------------------------------
@bryance/orch test: 
@bryance/orch test: 
@bryance/orch test: test\backend-process-role.test.ts:
@bryance/orch test: (pass) ProcessRole > headless provider records pid and start token and safely kills it [2758.48ms]
@bryance/orch test: 
@bryance/orch test: test\commands-spawn.test.ts:
@bryance/orch test: (pass) commands/spawn > refuses spawn without a name before any spawn mutations [117.65ms]
@bryance/orch test: (pass) commands/spawn > rejects removed spawn cap flag as unknown [0.16ms]
@bryance/orch test: (pass) commands/spawn > rejects --detached as an unknown spawn flag [11.46ms]
@bryance/orch test: (pass) commands/spawn > the positionals are the agent names [0.16ms]
@bryance/orch test: (pass) commands/spawn > collects repeated prompts in agent order [0.07ms]
@bryance/orch test: (pass) commands/spawn > each pi flavor launches its own binary and preserves raw prompt [0.21ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-transport.test.ts:
@bryance/orch test: (pass) orchd RPC transports > round-trips over the default unix transport [33.33ms]
@bryance/orch test: 
@bryance/orch test: test\store-task-rows.test.ts:
@bryance/orch test: (pass) task and attempt rows > malformed attempt rows are refused instead of handing back NaN [234.05ms]
@bryance/orch test: (pass) task and attempt rows > enqueue accepts exactly one typed scope and round-trips JSON opts [188.48ms]
@bryance/orch test: (pass) task and attempt rows > queued tasks can be edited only by their enqueuer [215.94ms]
@bryance/orch test: (pass) task and attempt rows > two concurrent claims have one winner and one index violation [314.06ms]
@bryance/orch test: (pass) task and attempt rows > failed attempts remain in history and retries are new attempts [241.11ms]
@bryance/orch test: (pass) task and attempt rows > settlement stores exact integer instants and outcome payloads [239.36ms]
@bryance/orch test: (pass) task and attempt rows > task state precedence covers queued, claimed, failed, done and cancelled [290.06ms]
@bryance/orch test: (pass) task and attempt rows > intakes are half-open history and duplicate open intake is rejected [246.12ms]
@bryance/orch test: 
@bryance/orch test: test\pi-model-control.test.ts:
@bryance/orch test: (pass) createModelControl.applyControlCommand > records a failure outcome when the model is rejected [1799.13ms]
@bryance/orch test: (pass) createModelControl.applyControlCommand > applies a thinking command directly [0.58ms]
@bryance/orch test: 
@bryance/orch test: test\commands-setup.test.ts:
@bryance/orch test: Selection recorded in C:\Users\Bryan\AppData\Local\Temp\orch-setup-characterization-IIeQC7\settings.json:
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
@bryance/orch test:   C:\Users\Bryan\AppData\Local\Temp\orch-setup-characterization-IIeQC7\agents
@bryance/orch test: Skills:
@bryance/orch test:   not installed - turn it back on with: orch settings skills --install
@bryance/orch test: bins:
@bryance/orch test:   C:\Users\Bryan\AppData\Local\Temp\orch-setup-home-zmbT3a\.local\bin\orch (copy)
@bryance/orch test:   C:\Users\Bryan\AppData\Local\Temp\orch-setup-home-zmbT3a\.local\bin\pif (copy)
@bryance/orch test:   C:\Users\Bryan\AppData\Local\Temp\orch-setup-home-zmbT3a\.local\bin\orch-ding (copy)
@bryance/orch test:   SKIP pi extensions: pi integration shim disabled
@bryance/orch test: Running doctor checks...
@bryance/orch test: Doctor: 30/35 checks passed
@bryance/orch test: Smoke test skipped (non-interactive) - run `orch setup` on a TTY to verify orch can deliver work.
@bryance/orch test: Done. Open a plexer workspace and try: orch spawn 2 --tab Team1
@bryance/orch test: (pass) commands/setup > resolves noninteractive provider sets and defaults [0.46ms]
@bryance/orch test: (pass) commands/setup > runs non-interactive setup against the requested ORCH_DIR and records the selected composition [9342.13ms]
@bryance/orch test: (pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.31ms]
@bryance/orch test: 
@bryance/orch test: test\store-values.test.ts:
@bryance/orch test: (pass) store row values > uses null for optional database values without JSON text [0.09ms]
@bryance/orch test: (pass) store row values > sets only non-null fields [0.06ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-transport.test.ts:
@bryance/orch test: (pass) orchd RPC transports > round-trips over the TCP fallback transport [34.07ms]
@bryance/orch test: 
@bryance/orch test: test\pid-liveness.test.ts:
@bryance/orch test: (pass) pidAlive liveness contract (shared by pi peers) > EPERM means the process exists under another user ΓÇö alive [0.20ms]
@bryance/orch test: (pass) pidAlive liveness contract (shared by pi peers) > ESRCH means no such process ΓÇö dead [0.03ms]
@bryance/orch test: (pass) pidAlive liveness contract (shared by pi peers) > the current process is alive [0.05ms]
@bryance/orch test: (pass) pidAlive liveness contract (shared by pi peers) > non-positive and non-numeric pids are rejected without signalling [0.09ms]
@bryance/orch test: 
@bryance/orch test: test\commands-runs.test.ts:
@bryance/orch test: (pass) commands/runs > lists newest first and honors -n [271.38ms]
@bryance/orch test: 
@bryance/orch test: test\peer-tools-registration.test.ts:
@bryance/orch test: (pass) peer tool registration > does not register orch_send when no spawner address exists [7.06ms]
@bryance/orch test: 
@bryance/orch test: integration\doctor.test.ts:
@bryance/orch test: (pass) runDoctor > detects DrvFs paths by mount path segment [0.21ms]
@bryance/orch test: 
@bryance/orch test: test\thinking-resolution.test.ts:
@bryance/orch test: (pass) thinking resolution > resolves every rung in priority order [24.42ms]
@bryance/orch test: 
@bryance/orch test: test\peer-tools-registration.test.ts:
@bryance/orch test: (pass) peer tool registration > does not register orch_send when the spawner pid is dead [17.53ms]
@bryance/orch test: (pass) peer tool registration > registers orch_send when the spawner has live presence and an inbox [18.31ms]
@bryance/orch test: 
@bryance/orch test: test\thinking-resolution.test.ts:
@bryance/orch test: (pass) thinking resolution > bare model with no setting yields harness default [18.73ms]
@bryance/orch test: (pass) thinking resolution > pi translates the resolved level through its thinking role [0.41ms]
@bryance/orch test: (pass) thinking resolution > per-harness override beats global default [9.80ms]
@bryance/orch test: 
@bryance/orch test: integration\daemon-no-peer-credentials.test.ts:
@bryance/orch test: (pass) the daemon asks for a token and nothing else > a caller the daemon has no relationship to is accepted on the token alone [1121.01ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lifecycle.test.ts:
@bryance/orch test: 
@bryance/orch test: # Unhandled error between tests
@bryance/orch test: -------------------------------
@bryance/orch test: error: Cannot find module '../src/backends/pane-ready.ts' from 'C:\dev\personal\orch\packages\orch\test\commands-lifecycle.test.ts'
@bryance/orch test: -------------------------------
@bryance/orch test: 
@bryance/orch test: 
@bryance/orch test: integration\daemon-no-peer-credentials.test.ts:
@bryance/orch test: (pass) the daemon asks for a token and nothing else > that same stranger without the token is refused, so the token is what decided [37.65ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö orch's own grouping > a space is created, listed, renamed and deleted with no space-home role [191.40ms]
@bryance/orch test: 
@bryance/orch test: test\rename-syncs-the-pane-border.test.ts:
@bryance/orch test: (pass) orch rename syncs the pane border in one command (U5) > one rename sets orch's name AND the plexer chrome [356.34ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-status-lease.test.ts:
@bryance/orch test: (pass) daemon status lease payload > reports the current holder and its liveness [2060.13ms]
@bryance/orch test: 
@bryance/orch test: test\broker-ownership.test.ts:
@bryance/orch test: (pass) broker ownership and space governance > the composed holder is the only ownership record, and adoption moves it [225.14ms]
@bryance/orch test: 
@bryance/orch test: test\commands-runs.test.ts:
@bryance/orch test: (pass) commands/runs > target filter and json preserve RunRecord rows [299.48ms]
@bryance/orch test: (pass) commands/runs > running rows render as running, not zero duration [0.40ms]
@bryance/orch test: (pass) commands/runs > result falls back to durable run history after presence reap [199.43ms]
@bryance/orch test: 
@bryance/orch test: test\backend-space-home.test.ts:
@bryance/orch test: (pass) tmux space home > focus switches the client to the session holding the space [0.75ms]
@bryance/orch test: (pass) tmux space home > create names the session after the space and returns its root pane [0.38ms]
@bryance/orch test: (pass) tmux space home > rename and close address the session coordinate [0.09ms]
@bryance/orch test: (pass) tmux space home > list reports every session as a coordinate with a label [0.35ms]
@bryance/orch test: (pass) a home orch opens is never unmarked (E8) > an unlabelled pack home is named for the pack it was opened for [0.38ms]
@bryance/orch test: (pass) a home orch opens is never unmarked (E8) > an unlabelled space home is named for the space, not for the pack [0.13ms]
@bryance/orch test: (pass) a home orch opens is never unmarked (E8) > a subject id the plexer would refuse is made safe, never passed through [0.05ms]
@bryance/orch test: (pass) a home orch opens is never unmarked (E8) > a caller-supplied label is used verbatim [0.13ms]
@bryance/orch test: 
@bryance/orch test: test\store-connection-guards.test.ts:
@bryance/orch test: (pass) store migration guards > names live presence as the thing to close before rebuilding [147.75ms]
@bryance/orch test: (pass) a slave never reaps or recreates the store > a spawned agent hitting a schema-mismatched store errors and mutates nothing [260.16ms]
@bryance/orch test: (pass) a slave never reaps or recreates the store > a recreate is refused while a live presence dir exists, for the user too [143.41ms]
@bryance/orch test: (pass) a slave never reaps or recreates the store > the user may recreate once nothing is live [173.94ms]
@bryance/orch test: (pass) a slave never reaps or recreates the store > a spawned agent is refused a recreate even with nothing live [198.16ms]
@bryance/orch test: 
@bryance/orch test: test\a-backend-exposes-each-operation-once.test.ts:
@bryance/orch test: 46 |     test(`${id} publishes no operation beside the role that owns it`, () => {
@bryance/orch test: 47 |       const backend = make();
@bryance/orch test: 48 |       const secondAddresses = [...OPERATION_OWNED_BY_A_ROLE]
@bryance/orch test: 49 |         .filter(([name]) => Reflect.has(backend, name))
@bryance/orch test: 50 |         .map(([name, owner]) => `${name} (owned by ${owner})`);
@bryance/orch test: 51 |       expect(secondAddresses).toEqual([]);
@bryance/orch test:                                    ^
@bryance/orch test: error: expect(received).toEqual(expected)
@bryance/orch test: 
@bryance/orch test: - []
@bryance/orch test: + [
@bryance/orch test: +   "zoom (owned by paneZoom.setZoom)",
@bryance/orch test: + ]
@bryance/orch test: 
@bryance/orch test: - Expected  - 1
@bryance/orch test: + Received  + 3
@bryance/orch test: 
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\a-backend-exposes-each-operation-once.test.ts:51:31)
@bryance/orch test: (fail) a backend exposes each operation exactly once (2.2) > herdr publishes no operation beside the role that owns it [0.74ms]
@bryance/orch test: 46 |     test(`${id} publishes no operation beside the role that owns it`, () => {
@bryance/orch test: 47 |       const backend = make();
@bryance/orch test: 48 |       const secondAddresses = [...OPERATION_OWNED_BY_A_ROLE]
@bryance/orch test: 49 |         .filter(([name]) => Reflect.has(backend, name))
@bryance/orch test: 50 |         .map(([name, owner]) => `${name} (owned by ${owner})`);
@bryance/orch test: 51 |       expect(secondAddresses).toEqual([]);
@bryance/orch test:                                    ^
@bryance/orch test: error: expect(received).toEqual(expected)
@bryance/orch test: 
@bryance/orch test: - []
@bryance/orch test: + [
@bryance/orch test: +   "zoom (owned by paneZoom.setZoom)",
@bryance/orch test: + ]
@bryance/orch test: 
@bryance/orch test: - Expected  - 1
@bryance/orch test: + Received  + 3
@bryance/orch test: 
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\a-backend-exposes-each-operation-once.test.ts:51:31)
@bryance/orch test: 46 |     test(`${id} publishes no operation beside the role that owns it`, () => {
@bryance/orch test: 47 |       const backend = make();
@bryance/orch test: 48 |       const secondAddresses = [...OPERATION_OWNED_BY_A_ROLE]
@bryance/orch test: 49 |         .filter(([name]) => Reflect.has(backend, name))
@bryance/orch test: 50 |         .map(([name, owner]) => `${name} (owned by ${owner})`);
@bryance/orch test: 51 |       expect(secondAddresses).toEqual([]);
@bryance/orch test:                                    ^
@bryance/orch test: error: expect(received).toEqual(expected)
@bryance/orch test: 
@bryance/orch test: - []
@bryance/orch test: + [
@bryance/orch test: +   "zoom (owned by paneZoom.setZoom)",
@bryance/orch test: + ]
@bryance/orch test: 
@bryance/orch test: - Expected  - 1
@bryance/orch test: + Received  + 3
@bryance/orch test: 
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\a-backend-exposes-each-operation-once.test.ts:51:31)
@bryance/orch test: (fail) a backend exposes each operation exactly once (2.2) > tmux publishes no operation beside the role that owns it [0.23ms]
@bryance/orch test: (fail) a backend exposes each operation exactly once (2.2) > headless publishes no operation beside the role that owns it [0.47ms]
@bryance/orch test: 
@bryance/orch test: test\broker-ownership.test.ts:
@bryance/orch test: (pass) broker ownership and space governance > refuses cross-space writes unless explicitly overridden [231.62ms]
@bryance/orch test: (pass) broker ownership and space governance > moving an agent between spaces moves the wall, not its identity [180.90ms]
@bryance/orch test: 
@bryance/orch test: test\store-lease-rows.test.ts:
@bryance/orch test: (pass) agent lease rows > a second open lease is rejected [191.75ms]
@bryance/orch test: (pass) agent lease rows > release and expiry close rows with matching reason and exact until [232.53ms]
@bryance/orch test: (pass) agent lease rows > handoff closes current and inserts a newer row without changing prior facts [198.61ms]
@bryance/orch test: (pass) agent lease rows > adoption closes prior and inserts a strictly newer adopter row [202.79ms]
@bryance/orch test: (pass) agent lease rows > adoption with no open lease is plain acquire and leaves closed history untouched [191.62ms]
@bryance/orch test: (pass) agent lease rows > handoff rolls back close when successor insert fails [184.35ms]
@bryance/orch test: (pass) agent lease rows > wrong-holder release and handoff are rejected [226.82ms]
@bryance/orch test: (pass) agent lease rows > an agent cannot lease itself [218.06ms]
@bryance/orch test: (pass) agent lease rows > expiry inserts nothing new [219.96ms]
@bryance/orch test: (pass) agent lease rows > reads return only open rows [210.95ms]
@bryance/orch test: 
@bryance/orch test: test\store-events.test.ts:
@bryance/orch test: (pass) event store rows > appendEvent assigns increasing sequence numbers and round-trips payload [152.01ms]
@bryance/orch test: 
@bryance/orch test: test\peer-project-scope.test.ts:
@bryance/orch test: (pass) peer discovery walls on the project > a same-workspace peer from another project is invisible by default [30.22ms]
@bryance/orch test: 
@bryance/orch test: test\store-outbox.test.ts:
@bryance/orch test: (pass) outbox store rows > inserts pending messages and orders them by creation time [188.88ms]
@bryance/orch test: 
@bryance/orch test: test\rename-syncs-the-pane-border.test.ts:
@bryance/orch test: (pass) orch rename syncs the pane border in one command (U5) > the response states the two outcomes SEPARATELY [304.29ms]
@bryance/orch test: (pass) orch rename syncs the pane border in one command (U5) > a plexer that refuses the chrome never unwrites orch's own name [283.90ms]
@bryance/orch test: (pass) orch rename syncs the pane border in one command (U5) > --pane still gives the border something DIFFERENT, and leaves the name alone [264.16ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-subscribe.test.ts:
@bryance/orch test: (pass) orchd event subscription > replays only events missed between subscriptions [291.03ms]
@bryance/orch test: 
@bryance/orch test: test\peer-project-scope.test.ts:
@bryance/orch test: (pass) peer discovery walls on the project > all_workspaces deliberately lifts the project wall [8.34ms]
@bryance/orch test: (pass) peer discovery walls on the project > a cross-project target does not resolve for sends without the explicit flag [18.69ms]
@bryance/orch test: (pass) peer discovery walls on the project > a record with no project stamp is malformed and never listed [16.23ms]
@bryance/orch test: (pass) peer discovery walls on the project > a spawned agent's all_workspaces flag is ignored [207.50ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-transport-parity.test.ts:
@bryance/orch test: (pass) both transports carry one mechanism > a bound TCP port does not displace the unix socket or become its own service [37.45ms]
@bryance/orch test: (pass) both transports carry one mechanism > the credential is demanded identically on both [55.49ms]
@bryance/orch test: (pass) both transports carry one mechanism > a missing credential is refused identically on both [31.01ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc-identity.test.ts:
@bryance/orch test: (pass) daemon identity RPCs > claim-identity stamps a minted id [1136.18ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-status-lease.test.ts:
@bryance/orch test: (pass) daemon status lease payload > distinguishes a known unleased agent from an unknown key [1131.81ms]
@bryance/orch test: 
@bryance/orch test: integration\owner-scoping.test.ts:
@bryance/orch test: (pass) fleet ownership scoping > fleet visibility follows provenance depth, not caller environment [306.64ms]
@bryance/orch test: 
@bryance/orch test: test\store-outbox.test.ts:
@bryance/orch test: (pass) outbox store rows > reports one message's pending state [157.70ms]
@bryance/orch test: (pass) outbox store rows > bumps attempts and hides a message until its next attempt time [181.43ms]
@bryance/orch test: (pass) outbox store rows > deletes delivered messages older than the cutoff [194.56ms]
@bryance/orch test: 
@bryance/orch test: test\store-events.test.ts:
@bryance/orch test: (pass) event store rows > appendEvent keeps sequence numbers across store reopen [273.86ms]
@bryance/orch test: (pass) event store rows > pruned sequence numbers are never reused [187.80ms]
@bryance/orch test: (pass) event store rows > selectEventsSince filters by sequence, orders ascending, and honours limit [207.51ms]
@bryance/orch test: (pass) event store rows > oldestEventSeq reports undefined when empty and the surviving lowest sequence after pruning [200.87ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lease.test.ts:
@bryance/orch test: 133 |     // able to kill from CLI or web, whether or not a live foreign orch holds the
@bryance/orch test: 134 |     // lease. Abort must therefore PROCEED here and must not steal the lease.
@bryance/orch test: 135 |     // Headless composes no paneInput: it has channel, capture and process roles
@bryance/orch test: 136 |     // and no pane roles, so this asserts the refusal is absent,
@bryance/orch test: 137 |     // not that any keystroke was sent.
@bryance/orch test: 138 |     expect(headlessBackend.paneInput).toBeNull();
@bryance/orch test:                                             ^
@bryance/orch test: error: expect(received).toBeNull()
@bryance/orch test: 
@bryance/orch test: Received: undefined
@bryance/orch test: 
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\test\commands-lease.test.ts:138:39)
@bryance/orch test: {"closed":["ctud2zg0vs"],"results":[{"target":"ctud2zg0vs","handle":"close-handle","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
@bryance/orch test: {"target":"1ic4mjigzm","name":"reap-worker","reaped":true}
@bryance/orch test: (pass) lease commands > a LIVE foreign holder still excludes everyone else [1666.95ms]
@bryance/orch test: (pass) lease commands > adopt takes an unleased agent and a dead holder [218.22ms]
@bryance/orch test: (pass) lease commands > adopt refuses a holder with a live recorded process [1685.94ms]
@bryance/orch test: (pass) lease commands > reap refuses when a live descendant exists, regardless of lease [191.80ms]
@bryance/orch test: (pass) lease commands > reap refuses while the recorded process is alive [1638.65ms]
@bryance/orch test: (pass) lease commands > reap is never lease-gated and removes the record and presence [253.67ms]
@bryance/orch test: (fail) lease commands > abort proceeds with a foreign live-holder lease [957.03ms]
@bryance/orch test: (pass) lease commands > close proceeds with a foreign live-holder lease [1129.05ms]
@bryance/orch test: (pass) lease commands > reap proceeds with a foreign live-holder lease [1024.54ms]
@bryance/orch test: (pass) lease commands > reset driving verb refuses a foreign live-holder lease [1951.09ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö orch's own grouping > create refuses a name already in use [157.51ms]
@bryance/orch test: (pass) orch space ΓÇö orch's own grouping > delete refuses a space that still holds agents [175.13ms]
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > create makes a home and records only its coordinate [160.99ms]
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > list reports that a space has a home without naming the coordinate [126.08ms]
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > rename renames orch's space and its home [179.90ms]
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > delete closes the home and drops its coordinate [164.01ms]
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > focus focuses the recorded coordinate [130.01ms]
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > a home made in another plexer is not this environment's to focus [179.85ms]
@bryance/orch test: (pass) orch space ΓÇö absence is an answer > focus with no space-home role names the space and what is missing [137.33ms]
@bryance/orch test: (pass) orch space ΓÇö absence is an answer > the plain-text answer names the space too [129.87ms]
@bryance/orch test: (pass) orch space ΓÇö vocabulary and wiring > cmdSpace lists through the resolved environment [139.21ms]
@bryance/orch test: (pass) orch space ΓÇö vocabulary and wiring > orch ws is gone [0.11ms]
@bryance/orch test: (pass) orch space ΓÇö vocabulary and wiring > space help never says workspace and offers create/rename/delete [0.08ms]
@bryance/orch test: (pass) orch space ΓÇö vocabulary and wiring > no space output ever says workspace [99.73ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-replay.test.ts:
@bryance/orch test: (pass) orchd RPC replay buffer > replays from inside the surviving range without a gap [161.86ms]
@bryance/orch test: (pass) orchd RPC replay buffer > reports a gap when the requested sequence predates retained history [157.02ms]
@bryance/orch test: (pass) orchd RPC replay buffer > empty history has no gap or oldest sequence [123.29ms]
@bryance/orch test: (pass) orchd RPC replay buffer > limits replay size without pruning durable events [6589.38ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc-identity.test.ts:
@bryance/orch test: (pass) daemon identity RPCs > claim-identity refuses an unknown id by naming it [811.43ms]
@bryance/orch test: 
@bryance/orch test: integration\doctor-stale-presence.test.ts:
@bryance/orch test: (pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [12419.75ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-transport-parity.test.ts:
@bryance/orch test: (pass) both transports carry one mechanism > the same token registers the same session whichever transport carried it [1716.84ms]
@bryance/orch test: 
@bryance/orch test: integration\daemon-registration.test.ts:
@bryance/orch test: (pass) machine daemon registration > refuses a second start and names the live socket [3245.65ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc-identity.test.ts:
@bryance/orch test: (pass) daemon identity RPCs > register-session mints one id per session token [1550.08ms]
@bryance/orch test: (pass) daemon identity RPCs > the removed method is unknown [14.13ms]
@bryance/orch test: 
@bryance/orch test: integration\os-executors.test.ts:
@bryance/orch test: (pass) cross-OS execution is a backend, not a peer daemon > an OS side with no executor answers, and never runs the body [0.29ms]
@bryance/orch test: (pass) cross-OS execution is a backend, not a peer daemon > the local side runs the body and hands back its value [0.26ms]
@bryance/orch test: (pass) cross-OS execution is a backend, not a peer daemon > doctor passes a daemon registered on the side orch is running on [3751.78ms]
@bryance/orch test: (pass) cross-OS execution is a backend, not a peer daemon > doctor answers, rather than failing, for a daemon on a side with no executor [2134.32ms]
@bryance/orch test: 
@bryance/orch test: test\backend-process-role.test.ts:
@bryance/orch test: (pass) ProcessRole > herdr provider records pid and start token and safely kills it [2346.75ms]
@bryance/orch test: (pass) ProcessRole > tmux provider records pid and start token and safely kills it [2075.69ms]
@bryance/orch test: (pass) ProcessRole > reports replaced when a pid is reused by a different process token [0.34ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc.test.ts:
@bryance/orch test: (pass) daemon RPC > hello translates an absent daemon instead of reading a missing token [5047.69ms]
@bryance/orch test: 
@bryance/orch test: test\peer-lease-visibility.test.ts:
@bryance/orch test: (pass) peer summaries carry ownership as a lease > a peer nobody ever took reports no orch driving it [1162.58ms]
@bryance/orch test: (pass) peer summaries carry ownership as a lease > a dead holder is not a live one [1336.76ms]
@bryance/orch test: (pass) the compact listing separates orphans from live work > unleased peers sit in their own bucket, below the driven ones [1902.52ms]
@bryance/orch test: (pass) the compact listing separates orphans from live work > a held peer names its holder, and an unleased one never reads as yours [1609.29ms]
@bryance/orch test: (pass) the compact listing separates orphans from live work > with nothing unleased the bucket does not appear at all [1444.74ms]
@bryance/orch test: 
@bryance/orch test: integration\settings-command.test.ts:
@bryance/orch test: fleet.max_depth = 6
@bryance/orch test: (pass) orch settings > every registered setting is printed in the table [335.05ms]
@bryance/orch test: (pass) orch settings > --json reports value + source per setting, settings.json winning over defaults [280.73ms]
@bryance/orch test: (pass) orch settings > --json reports env as the winning source over settings.json [384.35ms]
@bryance/orch test: (pass) orch settings > --harness switches defaults.adapter between enabled ids and rejects a non-enabled id [1070.64ms]
@bryance/orch test: (pass) orch settings > reports each harness's picker quicklist and launch gate as separate rows [359.62ms]
@bryance/orch test: (pass) orch settings > a load error surfaces loudly with no partial table [261.34ms]
@bryance/orch test: (pass) orch settings > sets a boolean through its registry entry [358.71ms]
@bryance/orch test: (pass) orch settings > sets an integer through its registry entry [379.03ms]
@bryance/orch test: (pass) orch settings > single-setting set delegates to the registry writer [11.86ms]
@bryance/orch test: (pass) orch settings > sets a choice through its registry entry [310.25ms]
@bryance/orch test: (pass) orch settings > sets a multi value through its registry entry [218.33ms]
@bryance/orch test: (pass) orch settings > sets a list value through its registry entry [225.08ms]
@bryance/orch test: (pass) orch settings > refuses an invalid boolean and names the allowed values [259.03ms]
@bryance/orch test: (pass) orch settings > refuses an invalid integer and names the allowed range [247.16ms]
@bryance/orch test: (pass) orch settings > refuses an invalid choice and names the allowed choices [239.03ms]
@bryance/orch test: (pass) orch settings > refuses an invalid multi value and names the allowed choices [281.51ms]
@bryance/orch test: (pass) orch settings > refuses an invalid list and names JSON as the allowed format [187.94ms]
@bryance/orch test: (pass) orch settings > refuses an unknown key and suggests nearest valid keys [233.27ms]
@bryance/orch test: (pass) orch settings > refuses read-only runtime and names the editing subcommand [237.33ms]
@bryance/orch test: 
@bryance/orch test: integration\doctor-settings-preservation.test.ts:
@bryance/orch test: (pass) doctor settings preservation > yes mode leaves existing settings.json byte-identical [6723.70ms]
@bryance/orch test: 
@bryance/orch test: integration\doctor-settings-defects.test.ts:
@bryance/orch test: (pass) doctor settings defects > accepts a clean settings file and keeps its path detail [11.82ms]
@bryance/orch test: (pass) doctor settings defects > reports malformed JSON as a file defect [5.18ms]
@bryance/orch test: (pass) doctor settings defects > reports a read failure instead of throwing [8.72ms]
@bryance/orch test: (pass) doctor settings defects > reports a stale key with the value that was written [25.33ms]
@bryance/orch test: (pass) doctor settings defects > reports a typo with its suggested key [22.95ms]
@bryance/orch test: (pass) doctor settings defects > reports the expected schema version [7.94ms]
@bryance/orch test: (pass) doctor settings defects > skips settings-dependent checks with a short repair hint [7167.88ms]
@bryance/orch test: 
@bryance/orch test: integration\doctor-orphan-daemons.test.ts:
@bryance/orch test: (pass) doctor orphaned-daemon check > a live foreign lock is reported, and an unproven owner is never killable [5846.54ms]
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
@bryance/orch test:   x         nuxi                 Execute a package binary (CLI), installing if needed (bunx)
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
@bryance/orch test:   create    elysia               Create a new project from a template (bun c)
@bryance/orch test:   upgrade                        Upgrade to latest version of Bun.
@bryance/orch test: 
@bryance/orch test:   <command> --help               Print help text for command.
@bryance/orch test: 
@bryance/orch test: Learn more about Bun:            https://bun.com/docs
@bryance/orch test: Join our Discord community:      https://bun.com/discord
@bryance/orch test: (pass) daemon lifecycle > reexecs with the current argv and hands over the lock [842.39ms]
@bryance/orch test: (pass) daemon lifecycle > rejects a recycled pid identity [3192.44ms]
@bryance/orch test: (pass) daemon lifecycle > foreign machine registration cannot be signalled for another store [1928.28ms]
@bryance/orch test: (pass) daemon lifecycle > only a provable lock owner may be signalled [1882.22ms]
@bryance/orch test: (pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [12.69ms]
@bryance/orch test: 
@bryance/orch test: test\broker-governance.test.ts:
@bryance/orch test: (pass) daemon governWrite enforcement > an unscoped actor may write to an unleased target [174.54ms]
@bryance/orch test: (pass) daemon governWrite enforcement > the lease holder may write to its own agent [1725.53ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a foreign live holder in the same space is refused and named [1543.63ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a dead holder is not a collision [932.20ms]
@bryance/orch test: (pass) daemon governWrite enforcement > --steal on a driving verb does not take a live holder's lease [1944.75ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a cross-space write is refused by the wall before the lease [1037.86ms]
@bryance/orch test: (pass) daemon governWrite enforcement > --cross-space clears the wall but the lease still applies [1884.06ms]
@bryance/orch test: (pass) daemon governWrite enforcement > the space operator writes to a same-space leased agent without taking the lease [1354.26ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a foreign space's operator still hits the wall [714.13ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a refused enqueue leaves the lease exactly as it was [1265.00ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a granted write and its enqueue commit together [1367.31ms]
@bryance/orch test: (pass) daemon governWrite enforcement > an unleased target is writable by any same-space actor [91.12ms]
@bryance/orch test: 
@bryance/orch test: test\lease-authority.test.ts:
@bryance/orch test: (pass) C3 foreign agents are untouchable > a DEAD foreign holder is not a collision [1862.26ms]
@bryance/orch test: (pass) C3 foreign agents are untouchable > the composed holder IS the open lease, with nothing beside it [1084.34ms]
@bryance/orch test: (pass) C4 steal > adopt refuses a live holder, and --steal takes it [1917.85ms]
@bryance/orch test: (pass) C4 steal > detach refuses a live holder, and --steal releases it [1640.23ms]
@bryance/orch test: (pass) C4a fencing token > lease ids are monotonic across handoff and adoption [108.67ms]
@bryance/orch test: (pass) C4a fencing token > a stale fence cannot release the current holder's lease [122.30ms]
@bryance/orch test: (pass) C4a fencing token > openLeaseId is null when nothing is leased [66.77ms]
@bryance/orch test: (pass) C4b reads are never gated > status and events read straight through a live foreign lease [1335.22ms]
@bryance/orch test: (pass) C4c/C4d name resolution > duplicate names are legal and an ambiguous target asks for the id [76.03ms]
@bryance/orch test: (pass) C4c/C4d name resolution > a unique name resolves, and an unknown target is a lookup miss [68.24ms]
@bryance/orch test: (pass) C4e naming at creation > a nameless spawn is refused [0.53ms]
@bryance/orch test: (pass) C4e naming at creation > a self-registering session gets <harness>-<first 8 of its id> [69.43ms]
@bryance/orch test: (pass) C4f self-rename > an agent renames itself whether or not a lease is in force [729.17ms]
@bryance/orch test: (pass) C4f self-rename > renaming another agent is driving and obeys the lease [1341.80ms]
@bryance/orch test: (pass) C4f self-rename > an invalid name is refused [73.20ms]
@bryance/orch test: (pass) C5 a transfer does not disturb the agent > adoption writes lease rows and touches nothing else [688.20ms]
@bryance/orch test: (pass) C7 live by lease, history by provenance > adoption moves the live view and leaves provenance untouched [683.20ms]
@bryance/orch test: 
@bryance/orch test: integration\doctor-declared-vs-reality.test.ts:
@bryance/orch test: (pass) doctor declared-vs-reality > reports a lease whose recorded holder process is dead [229.21ms]
@bryance/orch test: (pass) doctor declared-vs-reality > reports an environment handle missing from its plexer [224.19ms]
@bryance/orch test: (pass) doctor declared-vs-reality > reports a live agent with no lease and no live spawner [224.10ms]
@bryance/orch test: (pass) doctor declared-vs-reality > surfaces a missing task scope row as unrunnable [7314.70ms]
@bryance/orch test: (pass) doctor declared-vs-reality > doctor -y does not delete an unrunnable task [4330.24ms]
@bryance/orch test: 
@bryance/orch test: integration\owner-scoping.test.ts:
@bryance/orch test: skipping caller: unknown backend null (reaping the record)
@bryance/orch test: skipping other: unknown backend null (reaping the record)
@bryance/orch test: {"closed":["caller","klmine0001","klforeign1","other"],"results":[{"target":"caller","handle":null,"outcome":"done","error":null},{"target":"klmine0001","handle":"mine","outcome":"done","error":null},{"target":"klforeign1","handle":"foreign","outcome":"done","error":null},{"target":"other","handle":null,"outcome":"done","error":null}],"requested":4,"ok":4,"stream":false}
@bryance/orch test: (pass) fleet ownership scoping > owner token uses ORCH_OWNER, else this process's own minted id [5.58ms]
@bryance/orch test: (pass) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [199.05ms]
@bryance/orch test: (pass) fleet ownership scoping > close --all works without an owner token [604.42ms]
@bryance/orch test: (pass) fleet ownership scoping > close --all closes all managed records regardless of owner [133.96ms]
@bryance/orch test: (pass) fleet ownership scoping > driving verbs remain gated against a live foreign holder [4327.59ms]
@bryance/orch test: (pass) fleet ownership scoping > result refuses a foreign-owned agent and names its owner [705.65ms]
@bryance/orch test: (pass) fleet ownership scoping > pane mutations refuse a foreign-owned agent and name its owner [1140.41ms]
@bryance/orch test: {"closed":["kmismatch1"],"results":[{"target":"kmismatch1","handle":"{\"pid\":17184,\"key\":\"kmismatch1\"}","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
@bryance/orch test: (pass) fleet ownership scoping > close has no force option and remains unconditional without it [1588.44ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc.test.ts:
@bryance/orch test: (pass) daemon RPC > an unreachable agent yields a boundary answer, and the outbox is not left pending [6091.18ms]
@bryance/orch test: (pass) daemon RPC > round-trips a call over the real unix socket [16.60ms]
@bryance/orch test: 
@bryance/orch test: integration\doctor-stale-presence.test.ts:
@bryance/orch test: (pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [4431.97ms]
@bryance/orch test: (pass) doctor stale presence safety > no dead agents leaves nothing to remove [4349.24ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc.test.ts:
@bryance/orch test: (pass) daemon RPC > issues one session identity to sequential invocations from one session [1015.85ms]
@bryance/orch test: 
@bryance/orch test: integration\owner-scoping.test.ts:
@bryance/orch test: (pass) fleet ownership scoping > close cleans up a mismatched recorded process without signalling [582.45ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > a spawned agent acts as its own minted id, not its launch key [1.13ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > --cross-space from a spawned agent is refused [290.77ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > close --all from an AGENT sweeps only its own subtree [320.98ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > close --all from the HUMAN sweeps every managed spawn, whoever spawned it [304.31ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > close from a spawned agent is REFUSED when the target is not its own [260.74ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > close from a spawned agent SUCCEEDS on a slave it spawned itself [288.30ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > the workspace operator keeps control of an agent-owned fleet [274.78ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc.test.ts:
@bryance/orch test: (pass) daemon RPC > hello returns live agents whose newest lease is closed or absent [941.50ms]
@bryance/orch test: 
@bryance/orch test: integration\daemon-registration.test.ts:
@bryance/orch test: (pass) machine daemon registration > the refusal a second start prints names the live daemon's pid [2429.94ms]
@bryance/orch test: (pass) machine daemon registration > doctor names both when a second daemon is live beside the registered one [1959.50ms]
@bryance/orch test: (pass) machine daemon registration > evicts a registration whose process instance no longer matches [1671.93ms]
@bryance/orch test: (pass) machine daemon registration > routes a different orch dir to its own runtime files [1353.87ms]
@bryance/orch test: (pass) machine daemon registration > doctor distinguishes registered-but-dead from live-and-registered [2139.06ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc.test.ts:
@bryance/orch test: (pass) daemon RPC > hello returns an empty unleased list when none exist [463.78ms]
@bryance/orch test: 
@bryance/orch test: integration\doctor-orphan-daemons.test.ts:
@bryance/orch test: (pass) doctor orphaned-daemon check > a dead pid's lock is not an orphan [4457.12ms]
@bryance/orch test: (pass) doctor orphaned-daemon check > the caller's own orch dir is never reported against itself [2574.34ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc.test.ts:
@bryance/orch test: (pass) daemon RPC > a TCP hello with the daemon token gets an identity [862.13ms]
@bryance/orch test: (pass) daemon RPC > refuses a hello that reports no session pid [11.07ms]
@bryance/orch test: (pass) daemon RPC > refuses a hello without its environment [13.06ms]
@bryance/orch test: (pass) daemon RPC > same session pid keeps its id and a different session pid gets another [1264.74ms]
@bryance/orch test: (pass) daemon RPC > refuses a TCP hello without a token [8.40ms]
@bryance/orch test: (pass) daemon RPC > refuses a TCP hello with a wrong token [8.42ms]
@bryance/orch test: (pass) daemon RPC > writes the daemon token with owner-only permissions [11.22ms]
@bryance/orch test: (pass) daemon RPC > returns an error for an unknown method [6.76ms]
@bryance/orch test: (pass) daemon RPC > reports malformed lines and keeps the connection alive [19.65ms]
@bryance/orch test: (pass) daemon RPC > delivers pushed subscription events [71.42ms]
@bryance/orch test: (pass) daemon RPC > replays durable events after a daemon restart without a gap [327.00ms]
@bryance/orch test: (pass) daemon RPC > reports the oldest sequence when replay starts before the pruned window [51.03ms]
@bryance/orch test: (pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [1079.06ms]
@bryance/orch test: (pass) daemon RPC > has a catchable absent-daemon error [1.19ms]
@bryance/orch test: (pass) daemon RPC > calls a slow daemon unreachable, not absent [118.34ms]
@bryance/orch test: (pass) daemon RPC > calls a refused endpoint absent so a wedged daemon is still reclaimable [4.18ms]
@bryance/orch test: 
@bryance/orch test: integration\doctor.test.ts:
@bryance/orch test: killed 1 dangling process
@bryance/orch test: (fail) runDoctor > runs on an unconfigured install without failing for want of settings.json [5968.89ms]
@bryance/orch test:   ^ this test timed out after 5000ms.
@bryance/orch test: (fail) runDoctor > checks a healthy store [5097.93ms]
@bryance/orch test:   ^ this test timed out after 5000ms.
@bryance/orch test: (pass) runDoctor > warns when the store is absent [1.36ms]
@bryance/orch test: (pass) runDoctor > fails when the store predates orch's migrations [76.24ms]
@bryance/orch test: (pass) runDoctor > fails and names a missing store table [64.73ms]
@bryance/orch test: (pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [2646.61ms]
@bryance/orch test: (pass) runDoctor > reports an absent daemon as optional [2291.38ms]
@bryance/orch test: (pass) runDoctor > reports and fixes a stale daemon lock [2109.01ms]
@bryance/orch test: (fail) runDoctor > accepts a live daemon and an answerable socket [5060.34ms]
@bryance/orch test:   ^ this test timed out after 5000ms.
@bryance/orch test: killed 1 dangling process
@bryance/orch test: killed 1 dangling process
@bryance/orch test: (pass) runDoctor > warns when the live daemon code hash is stale [2422.94ms]
@bryance/orch test: (pass) runDoctor > fails on an invalid lock and an unanswerable live socket [4190.49ms]
@bryance/orch test: (pass) runDoctor > warns when the extension bundle is absent for a matching live hash [10.41ms]
@bryance/orch test: (pass) runDoctor > warns when the extension bundle is absent for a stale live hash [18.28ms]
@bryance/orch test: (pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [8.83ms]
@bryance/orch test: (pass) runDoctor > reports a dead presence pid [2065.49ms]
@bryance/orch test: (pass) runDoctor > bins check is driven by the enabled set and offers no fix [301.89ms]
@bryance/orch test: (pass) runDoctor > applyFixes reports exactly the changes it applies [7.75ms]
@bryance/orch test: (fail) runDoctor > validates configured notifier adapters [6460.65ms]
@bryance/orch test:   ^ this test timed out after 5000ms.
@bryance/orch test: (pass) runDoctor > reports invalid settings and accepts missing settings [4168.89ms]
@bryance/orch test: (pass) runDoctor > never throws when individual checks encounter broken inputs [4234.99ms]
@bryance/orch test: 
@bryance/orch test: 4 tests skipped:
@bryance/orch test: (skip) the token file is the whole credential > the token is 0600
@bryance/orch test: (skip) the token file is the whole credential > $ORCH_DIR is 0700, so same-uid is a boundary the filesystem enforces
@bryance/orch test: (skip) the token file is the whole credential > a token left loose by an earlier run is tightened, not trusted
@bryance/orch test: (skip) the token file is the whole credential > a runtime directory the daemon creates is 0700 too
@bryance/orch test: 
@bryance/orch test: 
@bryance/orch test: 40 tests failed:
@bryance/orch test: (fail) lease commands > abort proceeds with a foreign live-holder lease [957.03ms]
@bryance/orch test: (fail) one writer records a spawned agent (2.1) > a spawn into NO space records no space and hands the plexer only its coordinate [8.30ms]
@bryance/orch test: (fail) a backend exposes each operation exactly once (2.2) > herdr publishes no operation beside the role that owns it [0.74ms]
@bryance/orch test: (fail) a backend exposes each operation exactly once (2.2) > tmux publishes no operation beside the role that owns it [0.23ms]
@bryance/orch test: (fail) a backend exposes each operation exactly once (2.2) > headless publishes no operation beside the role that owns it [0.47ms]
@bryance/orch test: (fail) HerdrBackend > a caller pane is split rather than given a new tab [0.53ms]
@bryance/orch test: (fail) HerdrBackend > split direction clamps to herdr's right|down [0.84ms]
@bryance/orch test: (fail) HerdrBackend > a handed-over pane is launched into directly, never split or closed [0.64ms]
@bryance/orch test: (fail) HerdrBackend > the pane host closes a pane through herdr [0.18ms]
@bryance/orch test: (fail) HerdrBackend > a planned target pane is split directly, never re-seated afterwards [0.48ms]
@bryance/orch test: (fail) HerdrBackend > reads recent unwrapped pane output [0.58ms]
@bryance/orch test: (fail) HerdrBackend > groupLayout reads tab geometry straight off the pane listing [0.70ms]
@bryance/orch test: (fail) HerdrBackend > pane input submits through pane run [0.44ms]
@bryance/orch test: (fail) HerdrBackend > pane rename failure reaches the role caller [0.27ms]
@bryance/orch test: (fail) doctor declared-vs-reality > describes composed and absent backend roles [27.39ms]
@bryance/orch test: (fail) a row is not evidence that a pane exists (U1, U4) > a recorded handle the plexer does not list is reported as NO pane [174.96ms]
@bryance/orch test: (fail) planTilePlacement > a lone pane anchors the split to the only pane [0.32ms]
@bryance/orch test: (fail) planTilePlacement > first_split rules the opening split, however the screen is shaped [0.32ms]
@bryance/orch test: (fail) planTilePlacement > first_split longest-edge leaves the opening split to the tab's own shape [0.15ms]
@bryance/orch test: (fail) planTilePlacement > past the first split, the biggest pane halves its longer side whatever first_split says [0.25ms]
@bryance/orch test: (fail) planTilePlacement > the biggest pane is the target, whatever the caller's own pane is [0.20ms]
@bryance/orch test: (fail) planTilePlacement > equal panes resolve top-left first, so enumeration order cannot decide [0.20ms]
@bryance/orch test: (fail) planTilePlacement > four agents land in a 2x2 grid, not four columns [0.28ms]
@bryance/orch test: (fail) planTilePlacement > four agents on an ultrawide screen still land in a 2x2 grid [0.22ms]
@bryance/orch test: (fail) planTilePlacement > first_split rows stacks the second agent, columns seats it alongside [0.41ms]
@bryance/orch test: (fail) planTilePlacement > longest-edge on an ultrawide screen is the four-thin-columns layout first_split exists to avoid [0.49ms]
@bryance/orch test: (fail) planTilePlacement > the same pane count yields the same grid whatever pane order the plexer reports [0.65ms]
@bryance/orch test: (fail) deliverControl > does not fall back from a keys strategy to the orch channel [199.91ms]
@bryance/orch test: (fail) deliverControl > a run to a keys-strategy agent with no pane is answered, never queued on the channel [208.57ms]
@bryance/orch test: (fail) deliverControl > refuses steer and model on an adapter that composes neither role [8.81ms]
@bryance/orch test: (fail) daemon decision trail > records a no-pane boundary answer with its reason [201.17ms]
@bryance/orch test: (fail) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > the exempted names are the roles the ports actually declare [0.69ms]
@bryance/orch test: (fail) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > flags method-presence capability checks [0.59ms]
@bryance/orch test: (fail) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > passes the clean tree: no file in ANY scanned scope branches on an environment id [79.89ms]
@bryance/orch test: (fail) runDoctor > runs on an unconfigured install without failing for want of settings.json [5968.89ms]
@bryance/orch test:   ^ this test timed out after 5000ms.
@bryance/orch test: (fail) runDoctor > checks a healthy store [5097.93ms]
@bryance/orch test:   ^ this test timed out after 5000ms.
@bryance/orch test: (fail) runDoctor > accepts a live daemon and an answerable socket [5060.34ms]
@bryance/orch test:   ^ this test timed out after 5000ms.
@bryance/orch test: (fail) runDoctor > validates configured notifier adapters [6460.65ms]
@bryance/orch test:   ^ this test timed out after 5000ms.
@bryance/orch test: 
@bryance/orch test:  1491 pass
@bryance/orch test:  4 skip
@bryance/orch test:  40 fail
@bryance/orch test:  2 errors
@bryance/orch test:  6972 expect() calls
@bryance/orch test: Ran 1535 tests across 243 files. [57.27s]
@bryance/orch test: Exited with code 1
error: script "test:orch" exited with code 1
