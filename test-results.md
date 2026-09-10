$ bun --filter @bryance/orch test
@bryance/orch test: bun test v1.4.0 (34cbb9a40) 24x PARALLEL
@bryance/orch test: 
@bryance/orch test: integration\claude-adapter.test.ts:
@bryance/orch test: (pass) Claude adapter > declares its identity, and composes only the roles it fully implements [0.48ms]
@bryance/orch test: 
@bryance/orch test: test\commands-help.test.ts:
@bryance/orch test: (pass) per-command help topics > daemon help names every subcommand and the idle shutdown setting [0.10ms]
@bryance/orch test: (pass) per-command help topics > aliases resolve to their command's topic [0.04ms]
@bryance/orch test: (pass) per-command help topics > logs help names every filter the command accepts [0.11ms]
@bryance/orch test: (pass) per-command help topics > an unknown name has no topic [0.01ms]
@bryance/orch test: (pass) per-command help topics > every topic is printable text ending in a newline [0.08ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-names.test.ts:
@bryance/orch test: (pass) agent name validation > rejects names outside herdr's naming rule [1.88ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-notify-busy.test.ts:
@bryance/orch test: (pass) a herdr notification is delivered only when herdr says it was shown > shown is a delivery [0.25ms]
@bryance/orch test: (pass) a herdr notification is delivered only when herdr says it was shown > busy is NOT a delivery, however herdr exited [0.07ms]
@bryance/orch test: (pass) a herdr notification is delivered only when herdr says it was shown > every other refusal herdr can answer with is also not a delivery [0.11ms]
@bryance/orch test: (pass) a herdr notification is delivered only when herdr says it was shown > output that is not a herdr answer is never read as a delivery [0.14ms]
@bryance/orch test: (pass) a busy herdr is waited out, not dropped > a toast shown on the first try is sent once and waits for nothing [0.23ms]
@bryance/orch test: (pass) a busy herdr is waited out, not dropped > a busy herdr is retried after a wait, and the retry is the delivery [0.08ms]
@bryance/orch test: (pass) a busy herdr is waited out, not dropped > a herdr that stays busy gives up rather than blocking the daemon forever [0.14ms]
@bryance/orch test: (pass) a busy herdr is waited out, not dropped > a refusal that waiting cannot fix is not retried [0.15ms]
@bryance/orch test: 
@bryance/orch test: test\setup-io.test.ts:
@bryance/orch test: (pass) setup prompt answer validation > refuses a single answer that was not offered [0.26ms]
@bryance/orch test: (pass) setup prompt answer validation > refuses multi-select answers containing an unoffered value [0.64ms]
@bryance/orch test: 
@bryance/orch test: test\one-spelling-per-fact.test.ts:
@bryance/orch test: (pass) one spelling per shared fact > osSide and the store agree for an injected Windows platform [107.97ms]
@bryance/orch test: 
@bryance/orch test: test\plexer-versions.test.ts:
@bryance/orch test: (pass) plexer version support > a floor admits every version at or above it [0.74ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-tmux.test.ts:
@bryance/orch test: (pass) tmux backend registry and capabilities > is registered [2.03ms]
@bryance/orch test: 
@bryance/orch test: test\agent-monitor.test.ts:
@bryance/orch test: (pass) agent fleet monitor > surfaces only agents spawned by this session [4.59ms]
@bryance/orch test: 
@bryance/orch test: test\outbox.test.ts:
@bryance/orch test: (pass) outbox delivery > selects pending messages and delivers each message once [130.19ms]
@bryance/orch test: 
@bryance/orch test: test\agent-monitor.test.ts:
@bryance/orch test: (pass) agent fleet monitor > empty model renders no status line or widget [4.93ms]
@bryance/orch test: (pass) agent fleet monitor > worker process registers no monitor regardless of events [2.00ms]
@bryance/orch test: (pass) agent fleet monitor > does not replay history into a plain pi session [1.64ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-notify-hardening.test.ts:
@bryance/orch test: (pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [1.78ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-tmux.test.ts:
@bryance/orch test: (pass) tmux backend registry and capabilities > explicit selection follows tmux availability [30.70ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > exposes pane roles [0.16ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > reflects the TMUX environment [0.24ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > a tmux agent's key is the minted id, never its pane [0.58ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > selects an available placing environment, whichever one the caller sits in [0.25ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > falls back to headless only when no environment can place an agent [0.09ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > an installed plexer is selectable from outside its session, and refuses in its own words [0.41ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > herdr is selectable from outside a herdr session [0.10ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-roundtrip.test.ts:
@bryance/orch test: (pass) repairing a settings.json the schema rejects > reports every rejected key without touching the file [52.61ms]
@bryance/orch test: 
@bryance/orch test: test\commands-setup.test.ts:
@bryance/orch test: (pass) commands/setup > reads value and assignment flags [3.72ms]
@bryance/orch test: 
@bryance/orch test: test\store-queue.test.ts:
@bryance/orch test: (pass) queue facade storage > state is derived from attempts rather than stored on tasks [188.33ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-notify-hardening.test.ts:
@bryance/orch test: (pass) herdr and notification hardening > falls back to a valid name when the identity key contains herdr-invalid separators [0.35ms]
@bryance/orch test: (pass) herdr and notification hardening > nameless notifications use a space label, never a bare pane key [80.84ms]
@bryance/orch test: 
@bryance/orch test: test\setup-notifiers.test.ts:
@bryance/orch test: (pass) notifier setup logic > probes the built-in adapters [36.05ms]
@bryance/orch test: 
@bryance/orch test: test\plexer-versions.test.ts:
@bryance/orch test: (pass) plexer version support > compares numeric versions rather than lexical strings [0.05ms]
@bryance/orch test: (pass) plexer version support > rotates one open host install row when the plexer changes version [163.37ms]
@bryance/orch test: (pass) plexer version support > doctor names both versions and tells the operator to update the plexer [0.33ms]
@bryance/orch test: (pass) plexer version support > a supported plexer the user never installed is not a complaint [0.06ms]
@bryance/orch test: (pass) plexer version support > an in-range install reports ok with the version it read [0.07ms]
@bryance/orch test: (pass) plexer version support > a compatible server rides along on the row without complaint [0.05ms]
@bryance/orch test: (pass) plexer version support > a server the installed client outgrew fails and names the restart [0.04ms]
@bryance/orch test: (pass) plexer version support > a server that reports no compatibility is unknown, never a failure [0.03ms]
@bryance/orch test: (pass) plexer version support > a plexer with no server running says nothing about one [0.05ms]
@bryance/orch test: (pass) plexer version support > only an installed plexer that cannot report a version warns [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\queue-scope.test.ts:
@bryance/orch test: (pass) queue scope invariants > a failed pack task retries on another pack member, while an agent task stays pinned [258.14ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-roundtrip.test.ts:
@bryance/orch test: (pass) repairing a settings.json the schema rejects > a removed key is never guessed at - it offers no rename [7.51ms]
@bryance/orch test: (pass) repairing a settings.json the schema rejects > the choices a person makes leave the file loadable [16.26ms]
@bryance/orch test: (pass) repairing a settings.json the schema rejects > a typo keeps its value: renaming carries it to the real key [27.11ms]
@bryance/orch test: (pass) repairing a settings.json the schema rejects > leaving every defect alone writes nothing at all [15.32ms]
@bryance/orch test: 
@bryance/orch test: test\port-has-no-shell.test.ts:
@bryance/orch test: (pass) the backend port has no dead workspace shell > backend types contain neither deleted declaration [0.17ms]
@bryance/orch test: 
@bryance/orch test: test\notify-events-format.test.ts:
@bryance/orch test: (pass) notification and presence event formatting > spaceColor is stable and returns a palette hex [0.89ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-screen.test.ts:
@bryance/orch test: (pass) repair action labels > names the key a rename lands on, so the destination is never a guess [0.05ms]
@bryance/orch test: (pass) repair action labels > names the value a set writes [0.04ms]
@bryance/orch test: (pass) repair action labels > drop and leave say only what they do [0.02ms]
@bryance/orch test: (pass) repair frame > shows every defect with the value the person wrote [0.47ms]
@bryance/orch test: (pass) repair frame > promises that nothing changes before a save, because nothing does [0.06ms]
@bryance/orch test: (pass) repair frame > every defect starts at leave, so opening the screen destroys nothing [0.05ms]
@bryance/orch test: (pass) repair frame > a chosen repair is shown as what it will do [0.05ms]
@bryance/orch test: (pass) repair frame > the focused row's offered keys are shown, so no choice has to be guessed [0.08ms]
@bryance/orch test: (pass) repair frame > the count reads as English for one defect and for many [0.07ms]
@bryance/orch test: (pass) repair frame > no row runs past the terminal width, tag included [0.09ms]
@bryance/orch test: (pass) repair frame > the file being repaired is named in the header [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\hermetic-env.test.ts:
@bryance/orch test: (pass) the test suite is hermetic > no plexer environment leaks in from the shell that launched bun [0.44ms]
@bryance/orch test: 
@bryance/orch test: test\setup-notifiers.test.ts:
@bryance/orch test: (pass) notifier setup logic > lists unavailable notifiers with remediation and disables selection [0.17ms]
@bryance/orch test: (pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.40ms]
@bryance/orch test: (pass) notifier setup logic > renders a command entry that loadSettings can parse [48.05ms]
@bryance/orch test: (pass) notifier setup logic > builds valid entries and reports invalid selections [0.38ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-idle.test.ts:
@bryance/orch test: (pass) orchd idle shutdown rule > a zero setting disables idle shutdown entirely [0.16ms]
@bryance/orch test: 
@bryance/orch test: test\port-has-no-shell.test.ts:
@bryance/orch test: (pass) the backend port has no dead workspace shell > src contains no workspaceNames calls or BackendWorkspace references [45.60ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-idle.test.ts:
@bryance/orch test: (pass) orchd idle shutdown rule > a live agent holds the daemon open however long it has been quiet [0.02ms]
@bryance/orch test: (pass) orchd idle shutdown rule > an event subscriber holds the daemon open [0.01ms]
@bryance/orch test: (pass) orchd idle shutdown rule > recent activity holds the daemon open below the threshold [0.02ms]
@bryance/orch test: (pass) orchd idle shutdown rule > a fully idle daemon past the threshold is due to exit [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-claude-hooks.test.ts:
@bryance/orch test: (pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [176.90ms]
@bryance/orch test: 
@bryance/orch test: test\one-spelling-per-fact.test.ts:
@bryance/orch test: (pass) one spelling per shared fact > the shared record guard rejects arrays and null [0.13ms]
@bryance/orch test: (pass) one spelling per shared fact > removed identity method has no source spelling [35.80ms]
@bryance/orch test: (pass) one spelling per shared fact > settings reads have no literal fallbacks [101.59ms]
@bryance/orch test: (pass) one spelling per shared fact > launch env has one spelling [78.02ms]
@bryance/orch test: (pass) one spelling per shared fact > removed spawn cap has no source or README spelling [38.55ms]
@bryance/orch test: 
@bryance/orch test: test\port-no-optional-methods.test.ts:
@bryance/orch test: (pass) the environment port declares capability by composition, never by optionality > src/types/backend.ts has no optional methods on any port interface [2.23ms]
@bryance/orch test: (pass) the environment port declares capability by composition, never by optionality > the deleted capability flags bag is gone, not merely unimplemented [0.36ms]
@bryance/orch test: (pass) the environment port declares capability by composition, never by optionality > src/types/adapter.ts has no optional methods on the harness port either [0.72ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-terminal.test.ts:
@bryance/orch test: (pass) bridge terminal turn seam > empty and tool-only turn_end turns still publish a terminal idle state [53.25ms]
@bryance/orch test: 
@bryance/orch test: test\commands-index.test.ts:
@bryance/orch test: (pass) commands/index > does not gate help or noninteractive commands [0.46ms]
@bryance/orch test: 
@bryance/orch test: test\retention.test.ts:
@bryance/orch test: (pass) retention sweep > retention windows are independently configurable [165.72ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-terminal.test.ts:
@bryance/orch test: (pass) bridge terminal turn seam > a settled turn with assistant text publishes done [53.29ms]
@bryance/orch test: 
@bryance/orch test: test\commands-index.test.ts:
@bryance/orch test: (pass) commands/index > reads a package version string [0.69ms]
@bryance/orch test: (pass) commands/index > announces unleased agents once per session [3.62ms]
@bryance/orch test: (pass) commands/index > dispatches representative commands and reports unknown commands [65.73ms]
@bryance/orch test: 
@bryance/orch test: test\a-row-is-not-a-pane.test.ts:
@bryance/orch test: (pass) a row is not evidence that a pane exists (U1, U4) > a recorded handle the plexer does not list is reported as NO pane [285.98ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-boundary.test.ts:
@bryance/orch test: (pass) port seam command boundary > headless target is answered without invoking its pane role [0.69ms]
@bryance/orch test: (pass) port seam command boundary > paned environment without a role is answered at the boundary [0.58ms]
@bryance/orch test: (pass) port seam command boundary > an invocation preserves the provider failure [0.28ms]
@bryance/orch test: 
@bryance/orch test: test\setup-smoke.test.ts:
@bryance/orch test: (pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [1.17ms]
@bryance/orch test: 
@bryance/orch test: test\unleased-agents.test.ts:
@bryance/orch test: (pass) registration unleased agent hint > includes unleased workers but never session identities [233.70ms]
@bryance/orch test: 
@bryance/orch test: test\setup-smoke.test.ts:
@bryance/orch test: (pass) runSetupSmoke (12.5) > the agent is launched on the prompt it built [0.19ms]
@bryance/orch test: (pass) runSetupSmoke (12.5) > an agent that launches but yields no result times out and fails non-zero [4.83ms]
@bryance/orch test: (pass) runSetupSmoke (12.5) > a rejected spawn fails loudly and never polls for a result [1.58ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-write.test.ts:
@bryance/orch test: (pass) applySettingsRepairs > rename carries the value to the new key [44.50ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-tmux.test.ts:
@bryance/orch test: (pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-space [321.18ms]
@bryance/orch test: 
@bryance/orch test: test\lifecycle-reports-a-partial-run.test.ts:
@bryance/orch test: (pass) a partial reload or restart is reported, not exited > reload --json writes the whole payload and sets exitCode, never exits [316.44ms]
@bryance/orch test: 
@bryance/orch test: test\outbox.test.ts:
@bryance/orch test: (pass) outbox delivery > checks one message's pending state without scanning the outbox [171.90ms]
@bryance/orch test: (pass) outbox delivery > keeps failed messages pending until their backoff expires [186.68ms]
@bryance/orch test: 
@bryance/orch test: test\agent-view.test.ts:
@bryance/orch test: (pass) the agent composer > an agent with no environment rows has every axis absent, not defaulted [285.81ms]
@bryance/orch test: 
@bryance/orch test: test\notify-events-format.test.ts:
@bryance/orch test: (pass) notification and presence event formatting > nameless events use an identity-derived agent label [6.91ms]
@bryance/orch test: (pass) notification and presence event formatting > named events prefer the human name over the harness id [0.24ms]
@bryance/orch test: (pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.16ms]
@bryance/orch test: (pass) notification and presence event formatting > webhook payload includes space and spaceColor [1.90ms]
@bryance/orch test: (pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [5.50ms]
@bryance/orch test: (pass) notification and presence event formatting > derivePresenceTransition composes the space from the agent's environment [235.18ms]
@bryance/orch test: 
@bryance/orch test: test\notify-router.test.ts:
@bryance/orch test: (pass) notify router > delivers only when on includes the event state [0.42ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-write.test.ts:
@bryance/orch test: (pass) applySettingsRepairs > rename onto an occupied key throws and leaves the file untouched [22.26ms]
@bryance/orch test: (pass) applySettingsRepairs > set writes a value at a dotted path [9.14ms]
@bryance/orch test: (pass) applySettingsRepairs > drop deletes a value without pruning its parent [33.83ms]
@bryance/orch test: (pass) applySettingsRepairs > applies several repairs in one call [41.90ms]
@bryance/orch test: (pass) applySettingsRepairs > repairs a schema-rejected file before readSettingsFile validates it [23.59ms]
@bryance/orch test: 
@bryance/orch test: test\setup-wizard.test.ts:
@bryance/orch test: (pass) setup model picker > switches large catalogues to searchable bounded mode and preserves effort [1.17ms]
@bryance/orch test: 
@bryance/orch test: test\notify-router.test.ts:
@bryance/orch test: (pass) notify router > passes typed webhook and command configuration [0.85ms]
@bryance/orch test: (pass) notify router > surfaces notifier errors [0.37ms]
@bryance/orch test: 
@bryance/orch test: test\setup-wizard.test.ts:
@bryance/orch test: (pass) setup model picker > keeps the compact selector for small catalogues [3.11ms]
@bryance/orch test: (pass) setup model list picker > large catalogues use the bounded searchable multiselect [0.48ms]
@bryance/orch test: (pass) setup model list picker > the prompt names both jobs the list does, and that an empty one forbids nothing [0.13ms]
@bryance/orch test: (pass) setup model list picker > stored values start checked, and clearing them returns an empty selection [0.89ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair.test.ts:
@bryance/orch test: (pass) settings repair choices > offers rename, set, drop, then leave when all repairs apply [0.07ms]
@bryance/orch test: (pass) settings repair choices > offers only rename when there is only a suggestion [0.02ms]
@bryance/orch test: (pass) settings repair choices > offers only set when there is only an expected value [0.02ms]
@bryance/orch test: (pass) settings repair choices > always offers leave, and cannot drop a file-level defect [0.01ms]
@bryance/orch test: (pass) settings repair reducer > starts every defect at leave and focus at zero [0.05ms]
@bryance/orch test: (pass) settings repair reducer > refuses choices the focused defect does not offer and reports why [0.27ms]
@bryance/orch test: (pass) settings repair reducer > clamps focus at both ends and clears a prior reason [0.10ms]
@bryance/orch test: (pass) settings repair reducer > maps non-leave choices to repairs in defect order [0.11ms]
@bryance/orch test: (pass) settings repair reducer > leave produces no repair [0.03ms]
@bryance/orch test: (pass) settings repair reducer > empty defects make every action a no-op [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-channel.test.ts:
@bryance/orch test: (pass) orch channel and capture roles > headless delivery reaches the inbox and is acknowledged without a screen [189.73ms]
@bryance/orch test: 
@bryance/orch test: test\holder-death-costs-a-driver.test.ts:
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > the task in flight finishes and its result survives the holder [271.52ms]
@bryance/orch test: 
@bryance/orch test: test\one-writer-records-a-spawned-agent.test.ts:
@bryance/orch test: (pass) one writer records a spawned agent (2.1) > registerSpawnedAgent alone writes the COMPLETE record ΓÇö space and lease included [240.21ms]
@bryance/orch test: 
@bryance/orch test: test\broker-daemon-hardening.test.ts:
@bryance/orch test: (pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [1.79ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-channel.test.ts:
@bryance/orch test: (pass) orch channel and capture roles > capture reads status and result from the orch presence record [21.04ms]
@bryance/orch test: 
@bryance/orch test: test\notify-sinks.test.ts:
@bryance/orch test: (pass) notification entries > desktop entries use the canonical notifier registry [0.44ms]
@bryance/orch test: 
@bryance/orch test: test\unleased-stays-adoptable.test.ts:
@bryance/orch test: (pass) unleased and idle stays alive and adoptable (D3) > a decade of retention sweeps never ages out an unleased idle agent [212.61ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-errors.test.ts:
@bryance/orch test: (pass) port seam error contract > provider mutation errors preserve argv, exit status, stderr, and stdout [0.43ms]
@bryance/orch test: (pass) port seam error contract > provider query errors throw instead of returning a sentinel [0.17ms]
@bryance/orch test: 
@bryance/orch test: integration\claude-adapter.test.ts:
@bryance/orch test: (pass) Claude adapter > builds the interactive Claude launch command [0.18ms]
@bryance/orch test: (pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.21ms]
@bryance/orch test: (pass) Claude adapter > detects state from a live presence status [14.96ms]
@bryance/orch test: (pass) Claude adapter > extracts results.jsonl before transcript and native output [15.61ms]
@bryance/orch test: (pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [18.22ms]
@bryance/orch test: (pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [92.86ms]
@bryance/orch test: (pass) Claude adapter > maps Claude hook events to presence states and schema [654.97ms]
@bryance/orch test: (pass) Claude adapter > exits silently and writes no presence without launch env (a non-orch session) [124.04ms]
@bryance/orch test: (pass) Claude adapter > fails hard and writes no presence on a malformed launch env [127.66ms]
@bryance/orch test: 
@bryance/orch test: test\lifecycle-reports-a-partial-run.test.ts:
@bryance/orch test: (pass) a partial reload or restart is reported, not exited > restart --json writes the whole payload and sets exitCode, never exits [250.10ms]
@bryance/orch test: 
@bryance/orch test: test\presence-dirs-are-reaped-not-migrated.test.ts:
@bryance/orch test: (pass) a presence dir in the old shape is reaped, never migrated (J4) > a composite-named dir is not presence, even with a LIVE pid [22.14ms]
@bryance/orch test: 
@bryance/orch test: test\pack-gets-its-own-home.test.ts:
@bryance/orch test: (pass) a pack gets its own marked plexer home (E8, E9, E10) > the coordinate is STORED against the pack and is never orch's own id [202.27ms]
@bryance/orch test: 
@bryance/orch test: test\notify.test.ts:
@bryance/orch test: (pass) notification routing > an excluded state does not invoke its notifier [0.82ms]
@bryance/orch test: 
@bryance/orch test: test\skill-store-and-links.test.ts:
@bryance/orch test: (pass) skill store and harness links > writes real files to the store and links each harness dir into it [31.23ms]
@bryance/orch test: 
@bryance/orch test: test\settings-shell.test.ts:
@bryance/orch test: (pass) settings shell decisions > non-TTY takes the print path [0.07ms]
@bryance/orch test: 
@bryance/orch test: integration\cli-backends-herdr-headless.test.ts:
@bryance/orch test: (pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.48ms]
@bryance/orch test: 
@bryance/orch test: test\lifecycle-targets.test.ts:
@bryance/orch test: (pass) lifecycle target resolution > prefers one live agent over dead ones sharing its name [8.35ms]
@bryance/orch test: (pass) lifecycle target resolution > reports the target and disambiguating ids for live ambiguity [0.72ms]
@bryance/orch test: (pass) lifecycle target resolution > cleanup can still resolve a dead agent when no live match exists [0.11ms]
@bryance/orch test: (pass) lifecycle target resolution > an agent is addressable by its id, its name, or its pane handle [0.05ms]
@bryance/orch test: (pass) lifecycle target resolution > the pane is environment: moving it leaves every other address intact [0.04ms]
@bryance/orch test: 
@bryance/orch test: test\settings-shell.test.ts:
@bryance/orch test: (pass) settings shell decisions > an overridden setting is refused with the winner named [1.56ms]
@bryance/orch test: (pass) settings shell decisions > registered writes use the registry entry [23.13ms]
@bryance/orch test: (pass) settings shell decisions > registry exposes writable subcommand entries [0.53ms]
@bryance/orch test: 
@bryance/orch test: test\close-authority.test.ts:
@bryance/orch test: (pass) who may end an agent (D7) > the human may close anything [226.21ms]
@bryance/orch test: 
@bryance/orch test: test\log-level.test.ts:
@bryance/orch test: (pass) the configured log level reaches every logger > the env var wins over settings.json [7.88ms]
@bryance/orch test: 
@bryance/orch test: test\skill-store-and-links.test.ts:
@bryance/orch test: (pass) skill store and harness links > replaces a real directory left in a harness dir with a link into the store [31.03ms]
@bryance/orch test: (pass) skill store and harness links > doctor reports a harness dir holding a real directory instead of a link [42.07ms]
@bryance/orch test: (pass) skill store and harness links > doctor passes once every harness dir links into the store [43.12ms]
@bryance/orch test: (pass) skill store and harness links > doctor skips when the user turned the skill install off [8.91ms]
@bryance/orch test: 
@bryance/orch test: test\presence-dirs-are-reaped-not-migrated.test.ts:
@bryance/orch test: (pass) a presence dir in the old shape is reaped, never migrated (J4) > the sweep REMOVES it rather than leaving it for a migration that never comes [14.27ms]
@bryance/orch test: (pass) a presence dir in the old shape is reaped, never migrated (J4) > nothing renames, rewrites or re-keys the old directory [9.35ms]
@bryance/orch test: (pass) a presence dir in the old shape is reaped, never migrated (J4) > a dead dir in the CURRENT shape is still reaped the ordinary way [159.82ms]
@bryance/orch test: 
@bryance/orch test: test\a-row-is-not-a-pane.test.ts:
@bryance/orch test: (pass) a row is not evidence that a pane exists (U1, U4) > the agent itself is still there ΓÇö losing a pane costs a shortcut, not a life [262.28ms]
@bryance/orch test: (pass) a row is not evidence that a pane exists (U1, U4) > a handle the plexer DOES list is kept [317.63ms]
@bryance/orch test: 
@bryance/orch test: test\settings-thinking.test.ts:
@bryance/orch test: (pass) orch settings thinking > writes the global default and reads back through loadSettings [15.47ms]
@bryance/orch test: 
@bryance/orch test: test\log-level.test.ts:
@bryance/orch test: (pass) the configured log level reaches every logger > settings.json is used when the env var is unset [26.89ms]
@bryance/orch test: (pass) the configured log level reaches every logger > an unrecognised env value falls back to the configured level [10.17ms]
@bryance/orch test: (pass) the configured log level reaches every logger > the CLI logger honours the configured level [36.07ms]
@bryance/orch test: (pass) the configured log level reaches every logger > the CLI logger drops records below the configured level [7.56ms]
@bryance/orch test: (pass) the configured log level reaches every logger > the daemon logger resolves through the same helper [25.46ms]
@bryance/orch test: 
@bryance/orch test: test\presence-inbox.test.ts:
@bryance/orch test: (pass) shared presence line writers > uses the socket acknowledgement without writing a fallback [3.07ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lease.test.ts:
@bryance/orch test: (pass) lease commands > detach releases the lease and is a no-op when already unleased [321.94ms]
@bryance/orch test: 
@bryance/orch test: test\log-record.test.ts:
@bryance/orch test: (pass) the one log record shape > writes one JSONL record per call, with an epoch-millis instant [17.00ms]
@bryance/orch test: 
@bryance/orch test: test\settings-thinking.test.ts:
@bryance/orch test: thinking  xhigh
@bryance/orch test: thinking (pi)  low
@bryance/orch test: (pass) orch settings thinking > writes a per-harness override without disturbing the global default [27.04ms]
@bryance/orch test: (pass) orch settings thinking > the command sets the level a user names [15.16ms]
@bryance/orch test: (pass) orch settings thinking > the command sets a per-harness level with --harness [12.08ms]
@bryance/orch test: (pass) orch settings thinking > a level orch does not know is refused, naming the valid levels [4.04ms]
@bryance/orch test: (pass) orch settings thinking > clearing a per-harness override falls back to the global default [29.35ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-allowlist.test.ts:
@bryance/orch test: (pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [1.14ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.14ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.05ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.04ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.18ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.09ms]
@bryance/orch test: (pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.14ms]
@bryance/orch test: (pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.03ms]
@bryance/orch test: (pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.05ms]
@bryance/orch test: 
@bryance/orch test: test\settings-view.test.ts:
@bryance/orch test: (pass) settings view > visibleEntryIndices matches key and group case-insensitively [0.28ms]
@bryance/orch test: (pass) settings view > windowBounds keeps the focus inside the budget and clamps at both ends [0.07ms]
@bryance/orch test: (pass) settings view > frame shows group headers, values, provenance tags, and the focused help [0.52ms]
@bryance/orch test: (pass) settings view > frame with a filter narrows the list and draws the filter line [0.08ms]
@bryance/orch test: (pass) settings view > frame reports an empty filter match instead of a blank screen [0.04ms]
@bryance/orch test: (pass) settings view > a long list is windowed with more-above/more-below markers [0.77ms]
@bryance/orch test: (pass) settings view > overlays render choices, checkboxes, and input with error [0.34ms]
@bryance/orch test: (pass) settings view > a checkbox row shows what its choice carries [0.05ms]
@bryance/orch test: (pass) settings view > displayValue keeps scalars bare and JSON-encodes shapes [0.04ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-names.test.ts:
@bryance/orch test: (pass) agent name validation > accepts lowercase names with hyphens and underscores [0.61ms]
@bryance/orch test: (pass) a live name is claimed and a dead one is released > a live agent holds its name against a second spawn [185.76ms]
@bryance/orch test: (pass) a live name is claimed and a dead one is released > a dead agent frees its name [217.53ms]
@bryance/orch test: (pass) a live name is claimed and a dead one is released > another space's agent never blocks a name here [238.88ms]
@bryance/orch test: (pass) name scope follows the agent's current space, not its birthplace > moving an agent moves the name it holds [263.20ms]
@bryance/orch test: (pass) name scope follows the agent's current space, not its birthplace > the collision names the agent by its minted id [262.02ms]
@bryance/orch test: 
@bryance/orch test: integration\cli-backends-herdr-headless.test.ts:
@bryance/orch test: (pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.53ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.40ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.91ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.36ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.40ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [34.18ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > implicit selection falls back to headless when no plexer answers [0.18ms]
@bryance/orch test: (pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [269.19ms]
@bryance/orch test: (pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [2.04ms]
@bryance/orch test: 
@bryance/orch test: test\log-record.test.ts:
@bryance/orch test: (pass) the one log record shape > a record below the configured level is not written at all [29.10ms]
@bryance/orch test: (pass) the one log record shape > a correlation id rides every record of one dispatch, so one grep finds its whole life [31.21ms]
@bryance/orch test: (pass) the one log record shape > agentId carries orch's minted id; a plexer handle is a field, never the identity [18.02ms]
@bryance/orch test: (pass) the one log record shape > every level is orderable, lowest to highest [0.19ms]
@bryance/orch test: (pass) the one log record shape > a malformed line is rejected by the guard rather than trusted [0.17ms]
@bryance/orch test: 
@bryance/orch test: test\presence-inbox.test.ts:
@bryance/orch test: (pass) shared presence line writers > writes a fallback if socket reporting fails, throws=%s [13.53ms]
@bryance/orch test: (pass) shared presence line writers > writes a fallback if socket reporting fails, throws=%s [16.74ms]
@bryance/orch test: (pass) shared presence line writers > inbox and ack drains use the same claimed rename path [19.56ms]
@bryance/orch test: (pass) shared presence line writers > pi appends and answers through shared presence writers [36.34ms]
@bryance/orch test: (pass) shared presence line writers > wrong status schema is rejected by shared status reader [19.88ms]
@bryance/orch test: 
@bryance/orch test: test\offline-is-not-a-second-source.test.ts:
@bryance/orch test: (pass) --offline is a narrower view of ONE source, not a second one (M8) > offline and online read the same agents from the same presence files [259.06ms]
@bryance/orch test: 
@bryance/orch test: test\provenance.test.ts:
@bryance/orch test: (pass) the one provenance walk > ancestors are parent-first, root last [0.14ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-bundle-diagnosis.test.ts:
@bryance/orch test: (pass) adapter bundle installation > reports a missing shipped bundle as a structured diagnosis [10.32ms]
@bryance/orch test: 
@bryance/orch test: test\provenance.test.ts:
@bryance/orch test: (pass) the one provenance walk > depth counts hops to the root [0.06ms]
@bryance/orch test: (pass) the one provenance walk > an unknown id is its own root at depth 0 [0.02ms]
@bryance/orch test: (pass) the one provenance walk > an unknown parent ends the chain instead of throwing [0.18ms]
@bryance/orch test: (pass) the one provenance walk > descendant is any depth, never self, never a sibling tree [0.10ms]
@bryance/orch test: (pass) the one provenance walk > a cycle terminates [0.04ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-claude-hooks.test.ts:
@bryance/orch test: (pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [146.03ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [150.67ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [204.83ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [94.71ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [89.34ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [44.20ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [38.36ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [103.11ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > treats an absent settings file as not configured [1.24ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > handles malformed settings gracefully [19.32ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-bundle-diagnosis.test.ts:
@bryance/orch test: pi extensions:
@bryance/orch test: (pass) adapter bundle installation > diagnoses a missing shipped bundle without writing [7.82ms]
@bryance/orch test: 
@bryance/orch test: test\one-writer-records-a-spawned-agent.test.ts:
@bryance/orch test: (pass) one writer records a spawned agent (2.1) > a spawn leaves NOTHING for a second writer to fill in [288.06ms]
@bryance/orch test: (pass) one writer records a spawned agent (2.1) > a spawn into NO space records no space and hands the plexer only its coordinate [254.93ms]
@bryance/orch test: (pass) one writer records a spawned agent (2.1) > the presence store no longer offers a second way to record an agent [0.30ms]
@bryance/orch test: 
@bryance/orch test: test\space-policy.test.ts:
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > placing an agent in a space nobody created is refused, not minted [201.24ms]
@bryance/orch test: 
@bryance/orch test: test\settings-watch.test.ts:
@bryance/orch test: (pass) watchSettings > loads initially and applies a valid edit after the debounce [60.68ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-runtime.test.ts:
@bryance/orch test: (pass) shebangRuntime > reads #!/usr/bin/env node as node [20.78ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-hardening.test.ts:
@bryance/orch test: (pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [2.93ms]
@bryance/orch test: 
@bryance/orch test: test\broker-daemon-hardening.test.ts:
@bryance/orch test: (pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [264.62ms]
@bryance/orch test: (pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [230.43ms]
@bryance/orch test: 
@bryance/orch test: test\orch-bugs-4-5.test.ts:
@bryance/orch test: (pass) orch bugs 4 and 5 launch contracts > interactive launch routes use one argv composition [0.90ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-hardening.test.ts:
@bryance/orch test: (pass) adapter and runtime hardening > rejects unknown settings keys with a useful path [21.93ms]
@bryance/orch test: (pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [10.97ms]
@bryance/orch test: (pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [3.65ms]
@bryance/orch test: 
@bryance/orch test: test\orch-bugs-4-5.test.ts:
@bryance/orch test: (pass) orch bugs 4 and 5 launch contracts > headless launch routes use one argv composition [0.22ms]
@bryance/orch test: (pass) orch bugs 4 and 5 launch contracts > inherited extension policy emits every discovered extension [0.17ms]
@bryance/orch test: 
@bryance/orch test: test\offline-is-not-a-second-source.test.ts:
@bryance/orch test: (pass) --offline is a narrower view of ONE source, not a second one (M8) > offline reports the SAME state the agent reported, never a second opinion [202.87ms]
@bryance/orch test: (pass) --offline is a narrower view of ONE source, not a second one (M8) > there is exactly ONE row builder, and --offline only narrows what it asks [0.61ms]
@bryance/orch test: (pass) --offline is a narrower view of ONE source, not a second one (M8) > offline is the one path that never dials or starts the daemon [0.38ms]
@bryance/orch test: 
@bryance/orch test: test\unleased-stays-adoptable.test.ts:
@bryance/orch test: (pass) unleased and idle stays alive and adoptable (D3) > and it is still adoptable afterwards ΓÇö the point of keeping it [231.97ms]
@bryance/orch test: (pass) unleased and idle stays alive and adoptable (D3) > the sweep reaps only agents that actually ENDED, never merely unleased ones [234.31ms]
@bryance/orch test: (pass) unleased and idle stays alive and adoptable (D3) > repeated sweeps are stable: an unleased agent survives every one of them [213.63ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-runtime.test.ts:
@bryance/orch test: (pass) shebangRuntime > reads #!/usr/bin/env bun as bun [8.08ms]
@bryance/orch test: (pass) shebangRuntime > reads #!/usr/bin/env deno as deno [6.12ms]
@bryance/orch test: (pass) shebangRuntime > reads #!/usr/local/bin/node as node [14.21ms]
@bryance/orch test: (pass) shebangRuntime > does not mistake a longer binary name for a runtime [5.22ms]
@bryance/orch test: (pass) shebangRuntime > returns null for a file with no shebang [5.54ms]
@bryance/orch test: (pass) shebangRuntime > returns null for an unreadable path [1.27ms]
@bryance/orch test: (pass) runningRuntime > reports the runtime this suite is executing under [0.21ms]
@bryance/orch test: (pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [9.32ms]
@bryance/orch test: (pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [5.90ms]
@bryance/orch test: (pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [8.31ms]
@bryance/orch test: (pass) doctor runtime verdict table > launching under bun while declaring node is fine [5.68ms]
@bryance/orch test: (pass) doctor runtime verdict table > launching under node while declaring bun is fine [7.62ms]
@bryance/orch test: (pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [7.08ms]
@bryance/orch test: (pass) doctor runtime verdict table > declared runtime absent from PATH fails [7.71ms]
@bryance/orch test: (pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [10.13ms]
@bryance/orch test: (pass) doctor runtime verdict table > remediation names both directions ΓÇö rebuild, or re-record the declaration [7.26ms]
@bryance/orch test: (pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [4.50ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-reconnect.test.ts:
@bryance/orch test: (pass) RPC JSON framing > rejects malformed object that only has an id [0.17ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-model-flag.test.ts:
@bryance/orch test: (pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [0.13ms]
@bryance/orch test: (pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.10ms]
@bryance/orch test: (pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.06ms]
@bryance/orch test: (pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.07ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > pi interactive builders pass the quicklist as one quoted --models argument [0.10ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > pi headless builders pass the quicklist as one verbatim argv entry [0.18ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > pi omits --models cleanly for an absent or empty quicklist [2.98ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > pi keeps quicklist order and provider punctuation intact [0.11ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > omp interactive builders pass the quicklist as one quoted --models argument [0.10ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > omp headless builders pass the quicklist as one verbatim argv entry [0.05ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > omp omits --models cleanly for an absent or empty quicklist [1.49ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > omp keeps quicklist order and provider punctuation intact [0.04ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > a model outside the quicklist is still what the launch runs on [0.18ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-reconnect.test.ts:
@bryance/orch test: (pass) RPC JSON framing > parses split and multiple newline-delimited frames [31.25ms]
@bryance/orch test: 
@bryance/orch test: test\store-queue.test.ts:
@bryance/orch test: (pass) queue facade storage > retention deletes only settled tasks older than the cutoff [221.90ms]
@bryance/orch test: (pass) queue facade storage > retention never removes a queued task based on its age [182.66ms]
@bryance/orch test: (pass) queue facade storage > agent-scoped tasks become unrunnable when their agent ends [186.87ms]
@bryance/orch test: (pass) queue facade storage > completed tasks stay done after their scope agent ends [253.68ms]
@bryance/orch test: (pass) queue facade storage > a dead orch does not make a pack task unrunnable while a member lives [203.37ms]
@bryance/orch test: (pass) queue facade storage > pack-scoped tasks become unrunnable when every pack member ends [228.01ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a named space is orch's own id, and the workspace is its RECORDED home [224.39ms]
@bryance/orch test: 
@bryance/orch test: test\nested-spawn-unleased.test.ts:
@bryance/orch test: (pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the middle agent's death leaves the grandchild unleased, held by nobody [279.63ms]
@bryance/orch test: 
@bryance/orch test: test\one-bind-for-the-unix-endpoint.test.ts:
@bryance/orch test: (pass) one bind for the unix endpoint (2.4) > the unix endpoint is claimed in exactly one place [0.41ms]
@bryance/orch test: 
@bryance/orch test: test\queue-cli-scope.test.ts:
@bryance/orch test: (pass) Cq2: all three scopes are choosable at enqueue > --agent, --pack and --space each select exactly one typed scope [232.68ms]
@bryance/orch test: 
@bryance/orch test: integration\cli-backends-herdr-headless.test.ts:
@bryance/orch test: (pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [482.32ms]
@bryance/orch test: (pass) headless common path: identity key -> presence > one adapter uses the same opaque key across headless and tmux routes [0.29ms]
@bryance/orch test: (pass) headless common path: identity key -> presence > a key carries no environment to read back out of it [0.11ms]
@bryance/orch test: 
@bryance/orch test: test\one-bind-for-the-unix-endpoint.test.ts:
@bryance/orch test: (pass) one bind for the unix endpoint (2.4) > reclaiming a stale socket yields the endpoint a first bind produces [102.77ms]
@bryance/orch test: 
@bryance/orch test: test\broker-daemon-hardening.test.ts:
@bryance/orch test: (pass) broker daemon hardening > concurrent drains do not redeliver one message id [212.29ms]
@bryance/orch test: (pass) broker daemon hardening > replay after the newest sequence is empty without a gap [208.29ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-pi.test.ts:
@bryance/orch test: (pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.84ms]
@bryance/orch test: 
@bryance/orch test: test\settings-watch.test.ts:
@bryance/orch test: (pass) watchSettings > keeps the last-good settings, warns once, and recovers [409.74ms]
@bryance/orch test: 
@bryance/orch test: test\broker-daemon-hardening.test.ts:
@bryance/orch test: (pass) broker daemon hardening > malformed request gets an error and the connection remains usable [49.26ms]
@bryance/orch test: 
@bryance/orch test: test\one-control-dispatcher.test.ts:
@bryance/orch test: (pass) there is exactly one control dispatcher > no module outside src/control declares a control dispatcher [26.66ms]
@bryance/orch test: (pass) there is exactly one control dispatcher > no dispatcher is exported under two names [26.02ms]
@bryance/orch test: 
@bryance/orch test: test\vocabulary.test.ts:
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > a role is derived from the tree, never stored [284.29ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-unscoped-tasks.test.ts:
@bryance/orch test: (pass) doctor task scopes > a facade-enqueued task has exactly one typed scope [287.53ms]
@bryance/orch test: 
@bryance/orch test: test\queue-scope.test.ts:
@bryance/orch test: (pass) queue scope invariants > cancel is allowed for the enqueuer or a lease holder of a targeted agent [238.08ms]
@bryance/orch test: (pass) queue scope invariants > cancel refuses a caller who is neither enqueuer nor targeted lease holder [185.08ms]
@bryance/orch test: (pass) queue scope invariants > edit is allowed only for the enqueuer while queued [247.81ms]
@bryance/orch test: (pass) queue scope invariants > an orphan has exactly take-on, leave, and reap resolutions [288.41ms]
@bryance/orch test: (pass) queue scope invariants > stale queued work is surfaced distinctly and never deleted by age [225.36ms]
@bryance/orch test: (pass) queue scope invariants > two concurrent claims have one winner and one one_open_attempt violation [355.91ms]
@bryance/orch test: 
@bryance/orch test: test\settings-watch.test.ts:
@bryance/orch test: (pass) watchSettings > reloads on a touched reload.signal without a settings edit [124.59ms]
@bryance/orch test: 
@bryance/orch test: test\store-rebuild-schema.test.ts:
@bryance/orch test: (pass) rebuild schema > rebuild DDL inventory is exact [241.93ms]
@bryance/orch test: 
@bryance/orch test: test\one-query-stack-over-the-connection.test.ts:
@bryance/orch test: (pass) one query stack over the connection (2.3) > the store exposes no raw-SQL port beside the typed one [0.87ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-pi.test.ts:
@bryance/orch test: (pass) PiAdapter > restricted workers explicitly load the bundled pi extension [1.43ms]
@bryance/orch test: (pass) PiAdapter > declares its lifecycle slash-commands [0.96ms]
@bryance/orch test: (pass) PiAdapter > reads state from the presence status through store helpers [25.44ms]
@bryance/orch test: (pass) PiAdapter > appends a steer message to the presence inbox [95.36ms]
@bryance/orch test: (pass) PiAdapter > writes a blocking answer to the presence answer file [32.48ms]
@bryance/orch test: (pass) PiAdapter > reads results.jsonl and falls back to the last assistant session text [22.93ms]
@bryance/orch test: (pass) PiAdapter > parses pi's supported model table without importing harness internals [0.79ms]
@bryance/orch test: 
@bryance/orch test: test\one-query-stack-over-the-connection.test.ts:
@bryance/orch test: (pass) one query stack over the connection (2.3) > nothing in the repo prepares a statement through the deleted port [74.10ms]
@bryance/orch test: 
@bryance/orch test: test\one-retry-policy.test.ts:
@bryance/orch test: (pass) one retry policy > retries flaky async and sync operations through the shared helper [0.86ms]
@bryance/orch test: (pass) one retry policy > uses the policy's declared backoff schedule [0.19ms]
@bryance/orch test: (pass) one retry policy > surfaces the last error after exactly attempts tries [0.37ms]
@bryance/orch test: 
@bryance/orch test: test\pack-gets-its-own-home.test.ts:
@bryance/orch test: (pass) a pack gets its own marked plexer home (E8, E9, E10) > the home orch opens is MARKED as orch's, never a bare directory name [213.36ms]
@bryance/orch test: (pass) a pack gets its own marked plexer home (E8, E9, E10) > a space's home and a pack's home use the SAME role and different tables [233.00ms]
@bryance/orch test: (pass) a pack gets its own marked plexer home (E8, E9, E10) > an environment that holds nothing answers with an absence, and stores none [185.93ms]
@bryance/orch test: (pass) a pack gets its own marked plexer home (E8, E9, E10) > a home recorded in another plexer is not this one's to drive [207.21ms]
@bryance/orch test: (pass) a pack gets its own marked plexer home (E8, E9, E10) > closing a pack's home clears the row, so the next open is a fresh one [314.82ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-roles.test.ts:
@bryance/orch test: (pass) adapter role composition > composes complete roles per adapter [0.68ms]
@bryance/orch test: (pass) adapter role composition > answers with zero exit code when a shim role is absent [0.16ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-session-env.test.ts:
@bryance/orch test: (pass) adapter-owned session environment > resolves each caller harness through the public session resolver [8.32ms]
@bryance/orch test: 
@bryance/orch test: test\one-shape-only.test.ts:
@bryance/orch test: (pass) one current shape only > a live presence record with a malformed identity is a doctor failure [34.46ms]
@bryance/orch test: 
@bryance/orch test: test\nested-spawn-unleased.test.ts:
@bryance/orch test: (pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the grandchild stays alive and adoptable, and keeps its own provenance [274.57ms]
@bryance/orch test: (pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the grandparent holding the middle agent does not extend to the grandchild [231.02ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-session-env.test.ts:
@bryance/orch test: (pass) adapter-owned session environment > keeps harness env literals inside adapter modules [21.98ms]
@bryance/orch test: (pass) adapter-owned session environment > a registered adapter resolves a novel marker without resolver changes [0.60ms]
@bryance/orch test: 
@bryance/orch test: test\queue-space-replay.test.ts:
@bryance/orch test: (pass) queue replay keeps typed scope > stored scope offers pack work only to that pack [210.38ms]
@bryance/orch test: 
@bryance/orch test: test\one-shape-only.test.ts:
@bryance/orch test: (pass) one current shape only > doctor backend reports have one detection spelling [29.24ms]
@bryance/orch test: 
@bryance/orch test: test\holder-death-costs-a-driver.test.ts:
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > the lease closes `expired` ΓÇö not `released`, because no caller held it [259.91ms]
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > the agent stays alive, unleased and adoptable ΓÇö nothing closes it [312.37ms]
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > it receives no new work: the death hands the agent to nobody [265.82ms]
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > expiry is recorded once and does not erase who held it [268.27ms]
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > clearing a dead holder's lease is never refused, and is idempotent [257.13ms]
@bryance/orch test: 
@bryance/orch test: test\identity-is-not-environment.test.ts:
@bryance/orch test: (pass) A1 ΓÇö identity carries no environment > Identity declares no plexer and no plexer grouping [0.15ms]
@bryance/orch test: (pass) A1 ΓÇö identity carries no environment > a key is the minted id itself, with no separator to split [0.54ms]
@bryance/orch test: (pass) A1 ΓÇö identity carries no environment > the module never spells the sentinels that stand in for a missing place [0.08ms]
@bryance/orch test: (pass) A1 ΓÇö identity carries no environment > minted ids are unique per spawn [2.73ms]
@bryance/orch test: 
@bryance/orch test: test\no-placement-row-over-the-composed-view.test.ts:
@bryance/orch test: (pass) no Placement row is reassembled over the composed view (2.1) > there is no second lookup module projecting the environment into a flat row [0.48ms]
@bryance/orch test: 
@bryance/orch test: test\identity-self.test.ts:
@bryance/orch test: (pass) selfIdentity > returns the launch id without touching the store [11.35ms]
@bryance/orch test: 
@bryance/orch test: test\identity.test.ts:
@bryance/orch test: (pass) serializeIdentity / parseIdentity > a key is the minted id verbatim [0.69ms]
@bryance/orch test: (pass) serializeIdentity / parseIdentity > round-trips a minted id [0.25ms]
@bryance/orch test: (pass) serializeIdentity / parseIdentity > a key is one flat filesystem-safe segment with nothing to split [0.10ms]
@bryance/orch test: (pass) serializeIdentity / parseIdentity > two spawns never collide, so no plexer is needed to namespace them [3.27ms]
@bryance/orch test: (pass) isAgentId > accepts a minted id [0.18ms]
@bryance/orch test: (pass) isAgentId > rejects everything that is not one [0.23ms]
@bryance/orch test: (pass) malformed input > rejects a plexer-and-space key on parse [0.93ms]
@bryance/orch test: (pass) malformed input > rejects an empty key [0.05ms]
@bryance/orch test: (pass) malformed input > rejects a pane handle, a name, and a wrong-length id on serialize [0.20ms]
@bryance/orch test: (pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.22ms]
@bryance/orch test: (pass) malformed input > tryParseIdentity parses a minted id [0.12ms]
@bryance/orch test: 
@bryance/orch test: test\control-dispatch.test.ts:
@bryance/orch test: (pass) deliverControl > steers pi through its presence inbox [40.35ms]
@bryance/orch test: 
@bryance/orch test: test\pack-membership.test.ts:
@bryance/orch test: (pass) a pack is the provenance root > a registered session is an orch of a pack of one [203.39ms]
@bryance/orch test: 
@bryance/orch test: test\vocabulary.test.ts:
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > no table carries a role column: there is nothing to disagree with the tree [193.92ms]
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > renaming an agent or moving its lease never changes its role [214.66ms]
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > every role term orch displays comes from the one map [0.11ms]
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > no module outside the map spells a role term into a user-facing string [44.63ms]
@bryance/orch test: 
@bryance/orch test: test\settings-watch.test.ts:
@bryance/orch test: (pass) watchSettings > stop prevents further callbacks [424.71ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-unscoped-tasks.test.ts:
@bryance/orch test: (pass) doctor task scopes > the database rejects an unscoped task instead of keeping a legacy queue row [197.87ms]
@bryance/orch test: (pass) doctor task scopes > doctor lists unrunnable tasks and deliberate resolutions without deleting [229.82ms]
@bryance/orch test: 
@bryance/orch test: test\wall-single-owner.test.ts:
@bryance/orch test: (pass) space wall ownership > keeps the wall decision primitive in one source module [21.73ms]
@bryance/orch test: 
@bryance/orch test: test\queue-cli-scope.test.ts:
@bryance/orch test: (pass) Cq2: all three scopes are choosable at enqueue > a name resolves to one id, and an ambiguous name asks for the id [243.74ms]
@bryance/orch test: (pass) Cq2: all three scopes are choosable at enqueue > two scope flags at once are refused [242.68ms]
@bryance/orch test: (pass) Cq9: reading the queue is open > listing and history carry no caller and hide no other pack's work [219.49ms]
@bryance/orch test: 
@bryance/orch test: test\agent-key-is-minted-id.test.ts:
@bryance/orch test: (pass) a driving session mints an id, it is not placed by name > the key an interactive session addresses itself by is a bare minted id [19.70ms]
@bryance/orch test: 
@bryance/orch test: test\web-projection.test.ts:
@bryance/orch test: (pass) web fleet projection > uses the orch agent name and falls back to its minted id, never the plexer agent name [1.15ms]
@bryance/orch test: (pass) web fleet projection > uses the orch space name and never exposes the plexer space id [0.26ms]
@bryance/orch test: (pass) web fleet projection > unscoped agents use a neutral space label when no orch space exists [0.12ms]
@bryance/orch test: (pass) web fleet projection > history groups ended agents by provenance root, never by their leases [0.31ms]
@bryance/orch test: (pass) web fleet projection > live projection excludes ended rows and keeps unleased live agents out of history [0.45ms]
@bryance/orch test: (pass) live views group by lease (C7) > a space encompasses its orchs, and each orch encompasses the agents it holds [0.38ms]
@bryance/orch test: (pass) live views group by lease (C7) > an ADOPTED agent is filed under the orch holding it now, never under its spawner [0.34ms]
@bryance/orch test: (pass) live views group by lease (C7) > an UNHELD agent is grouped as unheld, not hidden and not invented an orch [5.06ms]
@bryance/orch test: (pass) live views group by lease (C7) > the space still lists every live agent flat, so the lease grouping adds a level and hides nothing [0.32ms]
@bryance/orch test: (pass) live views group by lease (C7) > history does NOT gain a lease level: a pack stays grouped by provenance [0.78ms]
@bryance/orch test: (pass) the orphan bucket holds every undriven agent (G9) > a lease whose holder is DEAD is an orphan, not live work [0.87ms]
@bryance/orch test: (pass) the orphan bucket holds every undriven agent (G9) > an agent with no lease at all is still an orphan [0.49ms]
@bryance/orch test: (pass) the orphan bucket holds every undriven agent (G9) > the two buckets never overlap and never lose an agent [0.45ms]
@bryance/orch test: (pass) the orphan bucket holds every undriven agent (G9) > a dead holder is not shown as an orch driving work in the lease grouping either [0.12ms]
@bryance/orch test: 
@bryance/orch test: test\launch-model-gate.test.ts:
@bryance/orch test: (pass) the model gate rules by harness membership, not by format > accepts a listed spec, with or without a thinking suffix [0.64ms]
@bryance/orch test: 
@bryance/orch test: test\queue.test.ts:
@bryance/orch test: (pass) queue facade on tasks and attempts > malformed task options are refused instead of handed back as TaskOptions [214.39ms]
@bryance/orch test: 
@bryance/orch test: test\settings.test.ts:
@bryance/orch test: (pass) loadSettings > refuses to invent settings when settings.json is missing [9.78ms]
@bryance/orch test: 
@bryance/orch test: integration\close-always.test.ts:
@bryance/orch test: {"closed":["panename01","panekey001","paneid0001"],"results":[{"target":"panename01","handle":"pane-name","outcome":"done","error":null},{"target":"panekey001","handle":"pane-key","outcome":"done","error":null},{"target":"paneid0001","handle":"pane-id","outcome":"done","error":null}],"requested":3,"ok":3,"stream":false}
@bryance/orch test: (pass) close always works > closes a foreign-space target by name, key, or pane id [594.69ms]
@bryance/orch test: 
@bryance/orch test: test\launch-model-gate.test.ts:
@bryance/orch test: (pass) the model gate rules by harness membership, not by format > refuses a ladder shorthand and names what the harness does offer [0.98ms]
@bryance/orch test: (pass) the model gate rules by harness membership, not by format > accepts each harness's own vocabulary rather than one shared grammar [0.21ms]
@bryance/orch test: (pass) the model gate rules by harness membership, not by format > cannot check a harness that publishes no catalogue, and does not pretend to [0.07ms]
@bryance/orch test: (pass) the settings allowlist applies on top of harness membership > an empty allowlist restricts nothing beyond the harness list [43.87ms]
@bryance/orch test: (pass) the settings allowlist applies on top of harness membership > a configured allowlist refuses a listed model outside its patterns [27.10ms]
@bryance/orch test: (pass) the settings allowlist applies on top of harness membership > harness membership is checked before the allowlist, so the message names the harness [12.53ms]
@bryance/orch test: 
@bryance/orch test: test\launch-stamp.test.ts:
@bryance/orch test: (pass) canonical launch stamp > claude and codex launches produce the same status shape [1.08ms]
@bryance/orch test: 
@bryance/orch test: test\close-authority.test.ts:
@bryance/orch test: (pass) who may end an agent (D7) > an orch may close the slaves it owns, at any depth [259.49ms]
@bryance/orch test: (pass) who may end an agent (D7) > an agent may NOT close another orch's slaves, and is told whose it is [251.56ms]
@bryance/orch test: (pass) who may end an agent (D7) > an agent may not close a peer orch either [278.20ms]
@bryance/orch test: (pass) who may end an agent (D7) > an agent may always close itself ΓÇö acting on yourself is not driving a fleet [322.14ms]
@bryance/orch test: (pass) who may end an agent (D7) > the LEASE never decides it: a foreign holder does not block the owner [242.22ms]
@bryance/orch test: (pass) who may end an agent (D7) > a provenance cycle terminates instead of hanging [239.14ms]
@bryance/orch test: 
@bryance/orch test: test\work-loop-binding.test.ts:
@bryance/orch test: (pass) work loop attempt binding > statusSpeaksForTask verifies the current attempt dispatch id [0.86ms]
@bryance/orch test: 
@bryance/orch test: test\no-placement-row-over-the-composed-view.test.ts:
@bryance/orch test: (pass) no Placement row is reassembled over the composed view (2.1) > the space wall reads the OPEN space interval, so a moved agent is walled by where it IS [273.87ms]
@bryance/orch test: (pass) no Placement row is reassembled over the composed view (2.1) > a string that names no registered agent is in no space rather than an error [158.78ms]
@bryance/orch test: 
@bryance/orch test: test\environment-dictates-what-is-possible.test.ts:
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > a MOVE is a new environment record, and what is possible follows it at once [282.52ms]
@bryance/orch test: 
@bryance/orch test: test\queue-reaping.test.ts:
@bryance/orch test: (pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > a failed task whose scope is gone is unrunnable and survives every retention sweep [274.06ms]
@bryance/orch test: 
@bryance/orch test: test\retention.test.ts:
@bryance/orch test: (pass) retention sweep > uses each table's own window and keeps queued and claimed tasks [404.74ms]
@bryance/orch test: (pass) retention sweep > returns zero counts when every row is inside its window [228.63ms]
@bryance/orch test: (pass) retention sweep > continues sweeping when one table delete fails [227.79ms]
@bryance/orch test: (pass) retention sweep > reaps expired agents by identity, taking every satellite with them [262.00ms]
@bryance/orch test: (pass) retention sweep > reaps dead dirs by recorded instants, not a fresh directory mtime [282.38ms]
@bryance/orch test: (pass) retention sweep > keeps dead dirs with a newer recorded instant despite an old mtime [158.76ms]
@bryance/orch test: (pass) retention sweep > reaps malformed dead dirs with no recorded instant [141.85ms]
@bryance/orch test: (pass) retention sweep > keeps result-only recorded instant despite an old mtime [153.22ms]
@bryance/orch test: (pass) retention sweep > never reaps a live presence dir regardless of age [151.93ms]
@bryance/orch test: (pass) retention sweep > sweeps old logs but preserves logs for live agents [161.06ms]
@bryance/orch test: 
@bryance/orch test: test\no-sibling-relay.test.ts:
@bryance/orch test: (pass) a worker with no reachable spawner does not relay (L6) > an unset spawner refuses, and the refusal names the agent's own report path [52.69ms]
@bryance/orch test: 
@bryance/orch test: test\retention.test.ts:
@bryance/orch test: (pass) retention sweep > does not sweep again one minute after the first tick [226.65ms]
@bryance/orch test: 
@bryance/orch test: test\no-sibling-relay.test.ts:
@bryance/orch test: (pass) a worker with no reachable spawner does not relay (L6) > the refusal never suggests another agent as an alternative route [28.22ms]
@bryance/orch test: (pass) a worker with no reachable spawner does not relay (L6) > a spawner that is stamped but has no inbox refuses by NAME and still says to report [15.03ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > with no space, orch INSIDE the plexer spawns beside itself and opens nothing [252.32ms]
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a caller INSIDE the plexer with NO orch identity (a human's pane) spawns beside itself [193.28ms]
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > with no space and orch OUTSIDE the plexer, the PACK gets its own marked home [205.70ms]
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > the same pack spawning again reuses its home and asks the human nothing [192.90ms]
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > an environment that holds nothing answers with an absence, never a refusal [178.37ms]
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a space with no home HERE places the fleet without borrowing another plexer's [247.76ms]
@bryance/orch test: 
@bryance/orch test: test\work-loop-binding.test.ts:
@bryance/orch test: (pass) Cq4: results go to the enqueuer, not the runner > every task event the work loop publishes is keyed to whoever enqueued it [305.25ms]
@bryance/orch test: 
@bryance/orch test: test\no-stderr-writes.test.ts:
@bryance/orch test: (pass) orch has one diagnosis channel (the logger) and one output channel (stdout) > no runtime source writes to process.stderr [30.00ms]
@bryance/orch test: 
@bryance/orch test: test\agent-view.test.ts:
@bryance/orch test: (pass) the agent composer > each axis composes independently, and moving one leaves identity untouched [270.55ms]
@bryance/orch test: (pass) the agent composer > tuning is not environment: it survives a move [278.39ms]
@bryance/orch test: (pass) the agent composer > ownership reads as a live lease, and a released one is not ownership [256.66ms]
@bryance/orch test: (pass) the agent composer > provenance is on the view and is not the same fact as ownership [251.31ms]
@bryance/orch test: (pass) the agent composer > provenance carries the spawner's name, read as a join and never stored twice [321.76ms]
@bryance/orch test: (pass) the agent composer > an agent with no spawner reports no spawner name [235.03ms]
@bryance/orch test: (pass) the agent composer > agentViews is oldest-first and liveAgentViews drops ended agents [245.20ms]
@bryance/orch test: (pass) the agent composer > the axis list is the only place every axis is enumerated [1.14ms]
@bryance/orch test: (pass) the agent composer > the composed shape is exactly the axis list, with nothing extra and nothing missing [236.42ms]
@bryance/orch test: (pass) the agent composer > an unknown agent is null, never an empty shell [222.27ms]
@bryance/orch test: 
@bryance/orch test: test\no-stderr-writes.test.ts:
@bryance/orch test: (pass) orch has one diagnosis channel (the logger) and one output channel (stdout) > the scan actually covers the tree it claims to [4.94ms]
@bryance/orch test: 
@bryance/orch test: test\notifier-adapters.test.ts:
@bryance/orch test: (pass) notifier registry and built-in adapters > reports notifier reachability from one configured entry [0.50ms]
@bryance/orch test: (pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [1.20ms]
@bryance/orch test: (pass) notifier registry and built-in adapters > a notifier error is the caller's real error [0.66ms]
@bryance/orch test: 
@bryance/orch test: test\ambiguous-target-says-what-to-do.test.ts:
@bryance/orch test: (pass) an ambiguous target names the failure and the way out (U3) > the message names the failure, the target string, and every candidate [0.24ms]
@bryance/orch test: (pass) an ambiguous target names the failure and the way out (U3) > it says what to send instead, so the caller is not left guessing [0.06ms]
@bryance/orch test: (pass) an ambiguous target names the failure and the way out (U3) > it is a refusal, not an exit ΓÇö the caller can act on it [0.03ms]
@bryance/orch test: (pass) an ambiguous target names the failure and the way out (U3) > resolveAgentView raises that same one message [0.63ms]
@bryance/orch test: 
@bryance/orch test: test\close-is-keyed-by-agent-id.test.ts:
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > an agent whose pane is gone is never handed to the plexer as a pane [335.68ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-policy.test.ts:
@bryance/orch test: (pass) spawn policy caps > launch env uses the minted agent id name [0.36ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-lifecycle.test.ts:
@bryance/orch test: (pass) daemon lifecycle > acquires once and refuses a second live owner [2613.24ms]
@bryance/orch test: 
@bryance/orch test: test\notify-ding.test.ts:
@bryance/orch test: (pass) notify/ding > the sound sink is a declared sink that takes no configuration [0.45ms]
@bryance/orch test: (pass) notify/ding > this host names the players it would use, and says how to get one [0.22ms]
@bryance/orch test: (pass) notify/ding > a command string runs through the host's own shell; argv is passed through untouched [0.06ms]
@bryance/orch test: 
@bryance/orch test: test\retention.test.ts:
@bryance/orch test: (pass) retention sweep > prunes orch's own logs past the age cap [138.68ms]
@bryance/orch test: (pass) retention sweep > prunes orch's own logs past the size cap even when freshly written [155.83ms]
@bryance/orch test: 
@bryance/orch test: test\status-unleased.test.ts:
@bryance/orch test: (pass) status owner rendering > leased by a live holder shows that holder [2896.51ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-policy.test.ts:
@bryance/orch test: (pass) spawn policy caps > worker prompt depth > root worker maySpawn follows max_depth [2.01ms]
@bryance/orch test: (pass) spawn policy caps > allows a pack spawn while under the cap [1.01ms]
@bryance/orch test: (pass) spawn policy caps > blocks an at-cap spawn and offers dispatch or the pack queue [0.26ms]
@bryance/orch test: (pass) spawn policy caps > a slave may not spawn by default: fleet.max_depth is 1 [0.07ms]
@bryance/orch test: (pass) spawn policy caps > fleet.max_depth 2 lets a slave spawn and refuses its child [0.18ms]
@bryance/orch test: (pass) spawn policy caps > reads a pack cap override from settings [17.60ms]
@bryance/orch test: (pass) spawn policy caps > a refused cmdSpawn makes no name, worktree, registry, or queue mutation [240.85ms]
@bryance/orch test: 
@bryance/orch test: test\settings.test.ts:
@bryance/orch test: (pass) loadSettings > requires a top-level runtime and never defaults it [22.70ms]
@bryance/orch test: (pass) loadSettings > rejects an unrecognized runtime naming the accepted values [7.95ms]
@bryance/orch test: (pass) loadSettings > rejects a runtime misplaced under defaults [14.50ms]
@bryance/orch test: (pass) loadSettings > reads the declared runtime [20.79ms]
@bryance/orch test: (pass) loadSettings > parses every supported settings section [26.09ms]
@bryance/orch test: (pass) loadSettings > rejects a file without the current schemaVersion [5.86ms]
@bryance/orch test: (pass) loadSettings > rejects invalid JSON loudly [17.25ms]
@bryance/orch test: (pass) loadSettings > names the key path for invalid fields [20.31ms]
@bryance/orch test: (pass) loadSettings > rejects unknown settings keys [17.35ms]
@bryance/orch test: (pass) loadSettings > rejects removed spawn cap setting by name [18.25ms]
@bryance/orch test: (pass) loadSettings > parses models.allowed as a per-harness pattern map [17.06ms]
@bryance/orch test: (pass) loadSettings > rejects renamed fleet keys and loads their replacements [47.73ms]
@bryance/orch test: (pass) loadSettings > rejects old settings keys [77.27ms]
@bryance/orch test: (pass) loadSettings > rejects legacy notify type and unknown ids [31.69ms]
@bryance/orch test: (pass) loadSettings > applies every settings default when sections are absent [8.38ms]
@bryance/orch test: (pass) loadSettings > preserves configured values while defaulting each missing section value [22.65ms]
@bryance/orch test: (pass) loadSettings > rejects non-positive and non-integer retention windows [26.97ms]
@bryance/orch test: (pass) loadSettings > rejects a host without dest [8.52ms]
@bryance/orch test: (pass) loadSettings > rejects an unknown id in enabled.adapters [18.39ms]
@bryance/orch test: (pass) loadSettings > rejects defaults.adapter not present in enabled.adapters [18.97ms]
@bryance/orch test: (pass) loadSettings > rejects when settings.json is absent but a legacy config.toml exists [3.82ms]
@bryance/orch test: (pass) allowedModelPatterns > restricts nothing when settings contain no patterns [2.45ms]
@bryance/orch test: (pass) allowedModelPatterns > returns the configured patterns when set [9.95ms]
@bryance/orch test: (pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or enabled entry [7.72ms]
@bryance/orch test: (pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [13.63ms]
@bryance/orch test: (pass) writeSettingsRuntime > a different runtime replaces the single value in place [26.65ms]
@bryance/orch test: (pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [12.85ms]
@bryance/orch test: (pass) reapUnreadableSettings > leaves a readable file alone [7.22ms]
@bryance/orch test: (pass) writeSettingsEnabled > round-trips both provider arrays [18.80ms]
@bryance/orch test: (pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [31.90ms]
@bryance/orch test: (pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [22.93ms]
@bryance/orch test: (pass) writeSettingsDefault > is idempotent when rewriting the same value [38.28ms]
@bryance/orch test: (pass) writeSettingsDefault > refuses to write through an out-of-version settings file [7.35ms]
@bryance/orch test: (pass) writeSettingsDefault > switches defaults.adapter between two enabled ids and loads clean [11.75ms]
@bryance/orch test: (pass) writeSettingsFullTree > round-trips defaults without inventing max_agents_total [37.13ms]
@bryance/orch test: (pass) settings precedence > uses the fallback when env and settings.json omit a setting [8.25ms]
@bryance/orch test: (pass) settings precedence > uses the settings.json value over the fallback [7.18ms]
@bryance/orch test: (pass) settings precedence > uses the ORCH_* environment value over settings.json [17.28ms]
@bryance/orch test: (pass) settings precedence > uses an explicit flag override over the environment [0.17ms]
@bryance/orch test: (pass) resolveSetting > uses flag, environment coercion, settings, then fallback in precedence order [0.14ms]
@bryance/orch test: (pass) resolveWithSource > rejects an environment value with the wrong shape [0.18ms]
@bryance/orch test: (pass) resolveWithSource > reports the winning source at each precedence level [0.11ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > loadSettings parses a per-harness preferred quicklist [19.12ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > an absent preferred map normalizes to an empty map, not to allowed [19.05ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > writing one list leaves the other byte-for-value intact [59.49ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > an empty list is recorded as no list at all, so a cleared picker really clears [35.33ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > the full tree seeds both maps when absent and preserves both when present [31.93ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > the allowlist gate reads models.allowed only [18.51ms]
@bryance/orch test: 
@bryance/orch test: test\work-loop-identity.test.ts:
@bryance/orch test: (pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > a claim records the minted agent id, not the presence key [235.28ms]
@bryance/orch test: 
@bryance/orch test: test\pack-membership.test.ts:
@bryance/orch test: (pass) a pack is the provenance root > membership is inherited from the spawner at any depth, never re-rooted [223.07ms]
@bryance/orch test: (pass) a pack is the provenance root > every agent is in exactly one pack, and two packs never share a member [242.70ms]
@bryance/orch test: (pass) a pack is the provenance root > a pack of one grows without re-rooting, and the root stays the orch [220.76ms]
@bryance/orch test: (pass) a pack is the provenance root > a lease or a move never changes which pack an agent is in [235.83ms]
@bryance/orch test: (pass) a pack is the provenance root > an agent cannot be spawned by someone who does not exist [140.97ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [56.98ms]
@bryance/orch test: 
@bryance/orch test: test\setup-flags.test.ts:
@bryance/orch test: (pass) setup model flags > rejects a bare model when multiple harnesses are selected [2.69ms]
@bryance/orch test: 
@bryance/orch test: test\commands-setup.test.ts:
@bryance/orch test: Selection recorded in C:\Users\Bryan\AppData\Local\Temp\orch-setup-characterization-nx4pzt\settings.json:
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
@bryance/orch test:   C:\Users\Bryan\AppData\Local\Temp\orch-setup-characterization-nx4pzt\agents
@bryance/orch test: Skills:
@bryance/orch test:   not installed - turn it back on with: orch settings skills --install
@bryance/orch test: bins:
@bryance/orch test:   C:\Users\Bryan\AppData\Local\Temp\orch-setup-home-YkjOBx\.local\bin\orch (copy)
@bryance/orch test:   C:\Users\Bryan\AppData\Local\Temp\orch-setup-home-YkjOBx\.local\bin\pif (copy)
@bryance/orch test:   C:\Users\Bryan\AppData\Local\Temp\orch-setup-home-YkjOBx\.local\bin\orch-ding (copy)
@bryance/orch test:   SKIP pi extensions: pi integration shim disabled
@bryance/orch test: Running doctor checks...
@bryance/orch test: Doctor: 30/35 checks passed
@bryance/orch test: Smoke test skipped (non-interactive) - run `orch setup` on a TTY to verify orch can deliver work.
@bryance/orch test: Done. Open a plexer workspace and try: orch spawn 2 --tab Team1
@bryance/orch test: (pass) commands/setup > resolves noninteractive provider sets and defaults [0.89ms]
@bryance/orch test: (pass) commands/setup > runs non-interactive setup against the requested ORCH_DIR and records the selected composition [3173.50ms]
@bryance/orch test: (pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.50ms]
@bryance/orch test: 
@bryance/orch test: test\setup-flags.test.ts:
@bryance/orch test: (pass) setup model flags > binds each model flag to its own harness [0.95ms]
@bryance/orch test: (pass) setup model flags > allows a bare model for one harness [0.03ms]
@bryance/orch test: (pass) setup model flags > rejects a model bound to an unselected harness [0.19ms]
@bryance/orch test: (pass) setup model flags > rejects duplicate model flags for one harness [0.10ms]
@bryance/orch test: 
@bryance/orch test: test\parse-target.test.ts:
@bryance/orch test: (pass) <host>/<target> grammar > keeps targets without a host unchanged [0.22ms]
@bryance/orch test: (pass) <host>/<target> grammar > parses configured host prefixes [0.07ms]
@bryance/orch test: (pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.09ms]
@bryance/orch test: (pass) <host>/<target> grammar > rejects empty hosts and targets [0.04ms]
@bryance/orch test: (pass) <host>/<target> grammar > formats local and host-prefixed targets [0.10ms]
@bryance/orch test: 
@bryance/orch test: integration\presence-schema.test.ts:
@bryance/orch test: (pass) presence status schema > reads a spawned identity without placement fields in status [244.30ms]
@bryance/orch test: 
@bryance/orch test: test\queue-reaping.test.ts:
@bryance/orch test: (pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > unrunnable is about who is alive now ΓÇö a new pack member makes it claimable again [261.12ms]
@bryance/orch test: (pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > stale is surfaced beside its state and never deleted on age [219.68ms]
@bryance/orch test: (pass) Cq12: an orphaned task has take-on, leave and reap, all deliberate > take-on re-scopes to the taker's own pack and the work becomes claimable there [194.39ms]
@bryance/orch test: (pass) Cq12: an orphaned task has take-on, leave and reap, all deliberate > take-on refuses a taker that is not itself live [213.66ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) answer via the control dispatcher > answers, rather than failing, when the adapter composes no question role [31.96ms]
@bryance/orch test: (pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [27.90ms]
@bryance/orch test: 
@bryance/orch test: test\peer-identity.test.ts:
@bryance/orch test: (pass) spawner identity > a bare operator with no session markers is just the operator [4.61ms]
@bryance/orch test: 
@bryance/orch test: test\store-identity.test.ts:
@bryance/orch test: (pass) hello agent identity rows > reuses the live agent for the same session process and mints for another [212.77ms]
@bryance/orch test: 
@bryance/orch test: test\environment-dictates-what-is-possible.test.ts:
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > a move closes the interval it left, so history says WHERE it was and WHEN [242.70ms]
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > moving one axis leaves every other axis exactly where it was [246.95ms]
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > an UPGRADE is a NEW host_plexers row, not an overwrite of the old one [198.16ms]
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > re-declaring the SAME version is not an upgrade and opens no second row [217.36ms]
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > nothing anywhere records what an agent CAN do [145.84ms]
@bryance/orch test: 
@bryance/orch test: test\errno-guard.test.ts:
@bryance/orch test: (pass) errnoCode reads a syscall error code, and only a real one > returns the code of a real node syscall error [0.62ms]
@bryance/orch test: 
@bryance/orch test: test\control-dispatch.test.ts:
@bryance/orch test: (pass) deliverControl > refuses to steer a pane awaiting an answer, naming the primitive that lands [38.25ms]
@bryance/orch test: (pass) deliverControl > still answers a pane awaiting an answer [36.85ms]
@bryance/orch test: (pass) deliverControl > a run dispatch is not blocked by an asking pane [35.71ms]
@bryance/orch test: (pass) deliverControl > does not fall back from a keys strategy to the orch channel [312.47ms]
@bryance/orch test: (pass) deliverControl > a run to a keys-strategy agent with no pane is answered, never queued on the channel [255.78ms]
@bryance/orch test: (pass) deliverControl > refuses steer and model on an adapter that composes neither role [19.80ms]
@bryance/orch test: (pass) deliverControl > requires presence for inbox delivery [231.17ms]
@bryance/orch test: (pass) deliverControl > refuses inbox delivery to an agent whose bridge never registered [259.25ms]
@bryance/orch test: (pass) deliverControl > refuses inbox delivery to an agent whose process is gone [260.89ms]
@bryance/orch test: 
@bryance/orch test: test\errno-guard.test.ts:
@bryance/orch test: (pass) errnoCode reads a syscall error code, and only a real one > a plain Error carries no code, so there is none to report [0.31ms]
@bryance/orch test: (pass) errnoCode reads a syscall error code, and only a real one > a non-object never yields a code instead of crashing on it [0.06ms]
@bryance/orch test: (pass) errnoCode reads a syscall error code, and only a real one > a code-shaped field of the wrong type is not a code [0.02ms]
@bryance/orch test: (pass) isAgentState verifies the state rather than asserting it > accepts a declared state [0.07ms]
@bryance/orch test: (pass) isAgentState verifies the state rather than asserting it > rejects anything not declared, including non-strings [0.04ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-preferred-models.test.ts:
@bryance/orch test: (pass) the preferred quicklist reaches every launch route > a pane spawn hands the exact array to the backend [290.25ms]
@bryance/orch test: 
@bryance/orch test: test\dispatch-channel-first.test.ts:
@bryance/orch test: (pass) work reaches an agent through orch's channel, with the pane only a shortcut > a headless agent receives a dispatch through the inbox, not a no-pane answer [66.32ms]
@bryance/orch test: (pass) work reaches an agent through orch's channel, with the pane only a shortcut > a steer reaches a paneless agent the same way [34.37ms]
@bryance/orch test: 
@bryance/orch test: test\work-loop-identity.test.ts:
@bryance/orch test: (pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > an idle process with no registered agent row is never handed pack work [222.09ms]
@bryance/orch test: (pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > Cq1: the pack drains its own queue with its orch dead and no lease in force [322.05ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö orch's own grouping > a space is created, listed, renamed and deleted with no space-home role [241.15ms]
@bryance/orch test: 
@bryance/orch test: test\store-identity.test.ts:
@bryance/orch test: (pass) hello agent identity rows > first sight creates a named root agent and open process row [197.61ms]
@bryance/orch test: 
@bryance/orch test: test\dispatch-prompt-file.test.ts:
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > --file is parsed off the positionals [0.36ms]
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > the file body is the prompt, apostrophes and newlines intact [5.79ms]
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > without --file the positionals after the target are the prompt [0.10ms]
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > a typed prompt and --file together is a refusal, never a silent winner [7.96ms]
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > an empty file is refused: a dispatch with no prompt is not a dispatch [3.26ms]
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > a missing file names itself in the refusal [0.94ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) steer acknowledgements > waits for the fallback reader ack [346.42ms]
@bryance/orch test: 
@bryance/orch test: test\broker-governance.test.ts:
@bryance/orch test: (pass) daemon governWrite enforcement > an unscoped actor is refused while a live orch holds the lease [2046.72ms]
@bryance/orch test: 
@bryance/orch test: test\event-identity.test.ts:
@bryance/orch test: (pass) published event identity > stamps a per-agent ordinal so a redelivery is recognizable [1.85ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-reconnect.test.ts:
@bryance/orch test: (pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [2526.19ms]
@bryance/orch test: 
@bryance/orch test: test\close-is-keyed-by-agent-id.test.ts:
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > an agent whose pane is gone still ends, and reports done [255.25ms]
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > what a human is told they closed is the agent, not the plexer's coordinate [265.69ms]
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > the --json closed list names agents, so a caller can map it back [294.72ms]
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > the plexer is still handed the real handle when there IS a pane [292.09ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-backends.test.ts:
@bryance/orch test: (pass) doctor backend and presence checks > reports every registered backend and composed roles [31.82ms]
@bryance/orch test: (pass) doctor backend and presence checks > passes with herdr active while an enabled tmux sits outside a session [0.08ms]
@bryance/orch test: (pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.06ms]
@bryance/orch test: (pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [0.06ms]
@bryance/orch test: (pass) doctor backend and presence checks > fails when any enabled backend is unavailable, active or not [0.03ms]
@bryance/orch test: (pass) doctor backend and presence checks > honours the configured default over the probe order [0.03ms]
@bryance/orch test: (pass) doctor backend and presence checks > reports only records missing the current schema stamp [12.01ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) steer acknowledgements > fails rather than reporting a queued steer as delivered [369.21ms]
@bryance/orch test: 
@bryance/orch test: test\work-notify.test.ts:
@bryance/orch test: (pass) orch presence notifications > delivers a presence transition through a configured command sink [140.98ms]
@bryance/orch test: 
@bryance/orch test: test\store-instants.test.ts:
@bryance/orch test: (pass) epoch-millisecond store instants > a lease records its holding as an integer instant [233.43ms]
@bryance/orch test: 
@bryance/orch test: test\cross-pack-result-delivery.test.ts:
@bryance/orch test: (pass) results go to the enqueuer across packs (Cq4) > a result reaches the FOREIGN enqueuer's inbox, not the runner's [296.85ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-preferred-models.test.ts:
@bryance/orch test: (pass) the preferred quicklist reaches every launch route > an unconfigured quicklist stays empty rather than becoming a default one [242.89ms]
@bryance/orch test: (pass) the preferred quicklist reaches every launch route > the previewed command is the command a launch runs [0.54ms]
@bryance/orch test: (pass) the preferred quicklist reaches every launch route > a headless launch forwards the quicklist into the adapter's own options [235.09ms]
@bryance/orch test: (pass) orchd rules on the quicklist it is sent > accepts an absent value and an array of specs [0.20ms]
@bryance/orch test: (pass) orchd rules on the quicklist it is sent > refuses a joined string or a blank entry instead of coercing it [0.27ms]
@bryance/orch test: 
@bryance/orch test: test\store-instants.test.ts:
@bryance/orch test: (pass) epoch-millisecond store instants > agents order numerically by their creation instant, never lexically [214.16ms]
@bryance/orch test: (pass) epoch-millisecond store instants > all time-named columns use integer declarations [1.16ms]
@bryance/orch test: 
@bryance/orch test: test\event-identity.test.ts:
@bryance/orch test: (pass) the work loop is not a second presence-transition source > an agent state change publishes nothing from the queue loop [332.23ms]
@bryance/orch test: 
@bryance/orch test: test\work-survives-its-spawner.test.ts:
@bryance/orch test: (pass) work survives its spawner, always (D1) > ending the spawner leaves the child live, unended and still listed [247.10ms]
@bryance/orch test: 
@bryance/orch test: integration\close-always.test.ts:
@bryance/orch test: Could not close survives01: pane-survives is still listed by headless after the close
@bryance/orch test: {"closed":[],"results":[{"target":"survives01","handle":"pane-survives","outcome":"error","error":"pane-survives is still listed by headless after the close"}],"requested":1,"ok":0,"stream":false}
@bryance/orch test: (pass) close always works > a successful backend close retains a pane that is still listed [2042.32ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) answer over the daemon control socket > fails when the answer is written but never consumed [333.30ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-checks.test.ts:
@bryance/orch test: (pass) doctor provenance-depth checks > finds a live agent deeper than fleet.max_depth [290.16ms]
@bryance/orch test: 
@bryance/orch test: test\events-scope-notice.test.ts:
@bryance/orch test: (pass) events scope notice > names the default live scope and its wideners [0.37ms]
@bryance/orch test: (pass) events scope notice > names the all-agent live scope and its history widener [0.14ms]
@bryance/orch test: (pass) events scope notice > a redirected stream is a harness reading transitions, and gets no banner [0.02ms]
@bryance/orch test: (pass) events scope notice > does not announce when history was requested [6.73ms]
@bryance/orch test: (pass) events scope notice > writes one notice before starting the live transport [0.30ms]
@bryance/orch test: (pass) events scope notice > does not write a notice when history was requested [0.13ms]
@bryance/orch test: (pass) events scope notice > says so when the caller owns no agents [0.18ms]
@bryance/orch test: (pass) events scope notice > stays out of a --json stream, which a parser is reading [0.18ms]
@bryance/orch test: (pass) events scope notice > does not announce when explicit targets were requested [0.14ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-registry.test.ts:
@bryance/orch test: (pass) spawn agent registration > writes the hub, environment, tuning, and lease [248.19ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) answer over the daemon control socket > does not report success when the answer role is unavailable [176.29ms]
@bryance/orch test: 
@bryance/orch test: test\space-policy.test.ts:
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > two unspaced agents in the SAME repo root can reach each other [196.99ms]
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > two unspaced agents in DIFFERENT repo roots cannot [209.36ms]
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > an agent placed in no space reports none, even inside a plexer workspace [318.92ms]
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > recording a spawn never conjures the space it names [173.21ms]
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > a space still walls, and it outranks the repo root [208.50ms]
@bryance/orch test: (pass) space policy > reads the space from the environment satellite, and absence is null [341.41ms]
@bryance/orch test: (pass) space policy > resolves space names through records and functions [0.33ms]
@bryance/orch test: (pass) space policy > compares agents by the space each is composed into [348.92ms]
@bryance/orch test: (pass) space policy > enforces the space wall across every plexer alike [477.70ms]
@bryance/orch test: (pass) space policy > scopes agents to the current space [284.58ms]
@bryance/orch test: (pass) space policy > a null current space leaves items unscoped [165.95ms]
@bryance/orch test: (pass) space policy > 2.7 status displays the composed space, not text sliced from a key [299.98ms]
@bryance/orch test: (pass) space policy > 6.6 structured identity drives status and policy, not serialized key text [306.94ms]
@bryance/orch test: 
@bryance/orch test: test\close-reports-every-target.test.ts:
@bryance/orch test: (pass) close reports an outcome for every target it was given (U2) > --json carries a per-target outcome, not just the successes [394.62ms]
@bryance/orch test: 
@bryance/orch test: test\store-interval-rows.test.ts:
@bryance/orch test: (pass) interval satellites > only one open interval is allowed [218.56ms]
@bryance/orch test: 
@bryance/orch test: test\peer-identity.test.ts:
@bryance/orch test: (pass) spawner identity > an unregistered Claude Code session is labelled by its harness, with no id [2.10ms]
@bryance/orch test: (pass) spawner identity > a session orch has registered IS addressable, by the id orch minted [203.29ms]
@bryance/orch test: (pass) spawner identity > an unregistered session has no id to hand out, and does not invent one [1.50ms]
@bryance/orch test: (pass) spawner identity > an orch-spawned orchestrator acts as the id orch minted for it [220.82ms]
@bryance/orch test: (pass) spawner identity > agentIdentityEnv stamps a reply address only when the spawner has one [0.56ms]
@bryance/orch test: (pass) spawner identity > worktreeEnv stamps worktree identity only for isolated agents [0.31ms]
@bryance/orch test: (pass) spawner identity > the registry keeps the exact spawning session distinct from the lease holder [261.10ms]
@bryance/orch test: (pass) the spawner address invariant > an UNREGISTERED session stamps no address, so no worker is handed an unreachable one [1.69ms]
@bryance/orch test: (pass) the spawner address invariant > a bare operator stamps no address [1.14ms]
@bryance/orch test: (pass) the spawner address invariant > an address that IS stamped resolves to a live inbox [209.23ms]
@bryance/orch test: (pass) peer identity in messaging > peer summaries render an unplaced agent without a local place name [21.96ms]
@bryance/orch test: (pass) peer identity in messaging > orch_send reports the peer's NAME, and stamps the sender's name on the message [46.30ms]
@bryance/orch test: (pass) peer identity in messaging > peers resolve by display name exactly like by key [21.36ms]
@bryance/orch test: (pass) peer identity in messaging > "spawner" reaches the stamped spawner session across fleet scoping [21.02ms]
@bryance/orch test: (pass) peer identity in messaging > a spawner with no inbox is refused BY NAME, not with a bare key [3.94ms]
@bryance/orch test: 
@bryance/orch test: test\seat-index.test.ts:
@bryance/orch test: (pass) seat pure seams > errorMessage preserves non-Error thrown values [1.70ms]
@bryance/orch test: (pass) seat pure seams > hasTheme discriminates missing and valid themes [0.79ms]
@bryance/orch test: (pass) seat pure seams > countStates groups active, blocked, failed, and settled states [0.38ms]
@bryance/orch test: (pass) seat pure seams > formatSeatStatus renders state counts and view hint [11.00ms]
@bryance/orch test: (pass) seat pure seams > reconcileDashboardSelection preserves id and guards missing snapshots [1.12ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [188.47ms]
@bryance/orch test: 
@bryance/orch test: integration\presence-schema.test.ts:
@bryance/orch test: (pass) presence status schema > orch status JSON exposes the agent status fields [192.58ms]
@bryance/orch test: (pass) presence status schema > status and list report the same agent identity [300.51ms]
@bryance/orch test: (pass) presence status schema > mixed pi and Claude status rows carry the same status field set [121.39ms]
@bryance/orch test: (pass) presence status schema > rejects a status record that carries no schema stamp [105.66ms]
@bryance/orch test: (pass) presence status schema > rejects a status record stamped with a non-current schema [161.65ms]
@bryance/orch test: (pass) presence status schema > rejects a current-schema record carrying placement fields [126.38ms]
@bryance/orch test: (pass) presence status schema > a malformed record is skipped without hiding the valid records beside it [143.57ms]
@bryance/orch test: (pass) presence status schema > the four facts are recorded apart and composed back onto the minted id [185.21ms]
@bryance/orch test: 
@bryance/orch test: test\work-survives-its-spawner.test.ts:
@bryance/orch test: (pass) work survives its spawner, always (D1) > a grandchild is untouched when the middle agent ends [208.11ms]
@bryance/orch test: (pass) work survives its spawner, always (D1) > the store has no lifetime column and no fate-sharing flag anywhere [0.53ms]
@bryance/orch test: (pass) work survives its spawner, always (D1) > spawn offers no flag that decides whether work outlives its spawner [1.58ms]
@bryance/orch test: (pass) work survives its spawner, always (D1) > closing the spawner never writes an ending for anything it spawned [228.33ms]
@bryance/orch test: 
@bryance/orch test: test\every-agent-has-an-inbox.test.ts:
@bryance/orch test: (pass) every agent has an inbox > a paned agent and a capless one are delivered to identically [354.22ms]
@bryance/orch test: 
@bryance/orch test: test\worker-prompt.test.ts:
@bryance/orch test: (pass) worker prompt capability composition > spawn clause follows maySpawn and stripping preserves the task [0.82ms]
@bryance/orch test: (pass) worker prompt capability composition > orch run composition selects the same header per adapter [0.81ms]
@bryance/orch test: (pass) worker prompt capability composition > the worker header does not instruct a lock that does not lock [0.20ms]
@bryance/orch test: (pass) worker prompt capability composition > the header addresses the agent, and names no plexer furniture [0.09ms]
@bryance/orch test: (pass) worker prompt capability composition > the verify clause names the configured commands, and asks for the repository's own when there are none [0.10ms]
@bryance/orch test: (pass) worker prompt capability composition > locked-commands clause names the commands, and asks for a report rather than a lock [0.05ms]
@bryance/orch test: (pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.02ms]
@bryance/orch test: (pass) worker prompt capability composition > the reply-to-spawner clause needs a reachable spawner, not just an inbox-steerable worker [0.04ms]
@bryance/orch test: (pass) worker prompt capability composition > unreachable spawner tells the worker to finish and end without relaying [0.03ms]
@bryance/orch test: (pass) worker prompt capability composition > reachable spawner permits replying to the spawner only [0.02ms]
@bryance/orch test: (pass) worker prompt capability composition > a reachable spawner still earns no clause when the worker cannot be steered by inbox [0.02ms]
@bryance/orch test: (pass) worker prompt capability composition > events strip both worker header variants [6.77ms]
@bryance/orch test: 
@bryance/orch test: test\worker-tools.test.ts:
@bryance/orch test: (pass) worker tool policy > no configured allowlist restricts nothing [0.84ms]
@bryance/orch test: (pass) worker tool policy > a configured allowlist always carries orch's own tools [0.06ms]
@bryance/orch test: (pass) worker tool policy > peer tools join the allowlist when the fleet enables them [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\tiling.test.ts:
@bryance/orch test: (pass) planTilePlacement > a lone pane anchors the split to the only pane [0.16ms]
@bryance/orch test: (pass) planTilePlacement > first_split rules the opening split, however the screen is shaped [0.11ms]
@bryance/orch test: (pass) planTilePlacement > first_split longest-edge leaves the opening split to the tab's own shape [0.07ms]
@bryance/orch test: (pass) planTilePlacement > a tab with no geometry to read still opens the way first_split says [0.04ms]
@bryance/orch test: (pass) planTilePlacement > past the first split, the biggest pane halves its longer side whatever first_split says [0.15ms]
@bryance/orch test: (pass) planTilePlacement > the biggest pane is the target, whatever the caller's own pane is [0.04ms]
@bryance/orch test: (pass) planTilePlacement > equal panes resolve top-left first, so enumeration order cannot decide [0.04ms]
@bryance/orch test: (pass) planTilePlacement > four agents land in a 2x2 grid, not four columns [0.61ms]
@bryance/orch test: (pass) planTilePlacement > four agents on an ultrawide screen still land in a 2x2 grid [0.09ms]
@bryance/orch test: (pass) planTilePlacement > first_split rows stacks the second agent, columns seats it alongside [0.04ms]
@bryance/orch test: (pass) planTilePlacement > longest-edge on an ultrawide screen is the four-thin-columns layout first_split exists to avoid [0.04ms]
@bryance/orch test: (pass) planTilePlacement > the same pane count yields the same grid whatever pane order the plexer reports [0.68ms]
@bryance/orch test: 
@bryance/orch test: test\self-actor-identity.test.ts:
@bryance/orch test: (pass) a driving session's write-actor is the agent orch registered for it > the session token resolves to the id hello minted, so the actor equals its own lease holder [203.59ms]
@bryance/orch test: 
@bryance/orch test: test\cross-pack-result-delivery.test.ts:
@bryance/orch test: (pass) results go to the enqueuer across packs (Cq4) > the delivered line carries the result payload, not just a notification [305.97ms]
@bryance/orch test: (pass) results go to the enqueuer across packs (Cq4) > a FAILED task still reports back ΓÇö silence is the worst outcome [275.77ms]
@bryance/orch test: (pass) results go to the enqueuer across packs (Cq4) > an enqueuer with no inbox is not an error ΓÇö delivery is best-effort, the task stays settled [237.31ms]
@bryance/orch test: 
@bryance/orch test: test\tool-exec-retry.test.ts:
@bryance/orch test: (pass) every command into a harness or plexer retries on timing, not on being wrong > a transient refusal is reattempted until it succeeds [5.72ms]
@bryance/orch test: (pass) every command into a harness or plexer retries on timing, not on being wrong > a failure the caller calls permanent is thrown on the FIRST attempt, never retried [0.25ms]
@bryance/orch test: (pass) every command into a harness or plexer retries on timing, not on being wrong > a tool that never recovers exhausts the budget and reports how many attempts it cost [31.71ms]
@bryance/orch test: (pass) every command into a harness or plexer retries on timing, not on being wrong > the seam names no harness: the same policy drives a different binary [1.20ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) answer over the daemon control socket > refuses a cross-space answer at the daemon wall [285.07ms]
@bryance/orch test: 
@bryance/orch test: test\transcript.test.ts:
@bryance/orch test: (pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [0.95ms]
@bryance/orch test: (pass) lastAssistantFromJsonl > undefined for blank or empty input [0.07ms]
@bryance/orch test: (pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.13ms]
@bryance/orch test: (pass) assistantText > reads role-tagged records [0.10ms]
@bryance/orch test: (pass) assistantText > reads the {type:'assistant'} envelope with a nested message [0.03ms]
@bryance/orch test: (pass) assistantText > undefined for non-assistant roles [0.02ms]
@bryance/orch test: (pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.21ms]
@bryance/orch test: (pass) contentText empty-string part handling > an all-empty content array yields undefined [0.10ms]
@bryance/orch test: (pass) contentText empty-string part handling > a bare empty string yields undefined [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-credential.test.ts:
@bryance/orch test: (skip) the token file is the whole credential > the token is 0600
@bryance/orch test: (skip) the token file is the whole credential > $ORCH_DIR is 0700, so same-uid is a boundary the filesystem enforces
@bryance/orch test: (skip) the token file is the whole credential > a token left loose by an earlier run is tightened, not trusted
@bryance/orch test: (skip) the token file is the whole credential > a runtime directory the daemon creates is 0700 too
@bryance/orch test: (pass) the token file is the whole credential > nothing else is enrolled: there is no allowlist beside the token [33.87ms]
@bryance/orch test: 
@bryance/orch test: test\space-walls.test.ts:
@bryance/orch test: (pass) space helpers > reads space ids from the environment satellite, never from the key [2.44ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-reconnect.test.ts:
@bryance/orch test: (pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1210.96ms]
@bryance/orch test: 
@bryance/orch test: test\space-walls.test.ts:
@bryance/orch test: (pass) space helpers > an agent that moves space keeps its identity and reports the new space [18.96ms]
@bryance/orch test: (pass) space helpers > derives an entity space from the store [1.58ms]
@bryance/orch test: (pass) space helpers > returns the same entities when all spaces are requested [0.50ms]
@bryance/orch test: (pass) space wall writes > allows a write within the same space [1.26ms]
@bryance/orch test: (pass) space wall writes > denies a cross-space write with both spaces in the reason [0.93ms]
@bryance/orch test: (pass) space wall writes > applies the same wall rule whatever plexer the agents sit in [5.90ms]
@bryance/orch test: (pass) space wall writes > allows a cross-space write with an explicit override [0.95ms]
@bryance/orch test: (pass) space wall writes > allows unplaced targets [0.99ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-registry.test.ts:
@bryance/orch test: (pass) spawn agent registration > an agent that states no plexer and no handle gets neither row [205.99ms]
@bryance/orch test: (pass) spawn agent registration > worktree row is present only for a worktree launch [283.01ms]
@bryance/orch test: (pass) spawn agent registration > an unknown or absent spawner produces a root pack of one and no lease [240.79ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-checks.test.ts:
@bryance/orch test: (pass) doctor provenance-depth checks > accepts a live agent at fleet.max_depth [212.77ms]
@bryance/orch test: (pass) doctor unclaimed-agent checks > finds an old unclaimed live agent with its age [213.89ms]
@bryance/orch test: (pass) doctor unclaimed-agent checks > ignores a claimed agent [198.92ms]
@bryance/orch test: (pass) doctor unclaimed-agent checks > ignores a fresh unclaimed agent under the threshold [197.09ms]
@bryance/orch test: (pass) doctor notification-sink checks > reports no sinks as healthy [2.22ms]
@bryance/orch test: (pass) doctor notification-sink checks > rejects a webhook with a malformed URL [6.58ms]
@bryance/orch test: (pass) doctor notification-sink checks > uses the notify-send prerequisite install command in desktop remediation [6.40ms]
@bryance/orch test: (pass) doctor notification-sink checks > warns for a command binary missing from PATH [6.35ms]
@bryance/orch test: (pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [7.24ms]
@bryance/orch test: (pass) doctor notification-sink checks > warns when a notifier omits done from its on list [14.97ms]
@bryance/orch test: (pass) doctor notification-sink checks > does not warn when a notifier includes done in its on list [4.80ms]
@bryance/orch test: (pass) doctor notification-sink checks > keeps unavailable notifier failures when done is omitted [14.02ms]
@bryance/orch test: 
@bryance/orch test: test\status-unleased.test.ts:
@bryance/orch test: (pass) status owner rendering > a dead holder is shown as unleased with the holder gone [1198.49ms]
@bryance/orch test: (pass) status owner rendering > an agent never leased shows no orch driving it [1062.13ms]
@bryance/orch test: 
@bryance/orch test: test\self-actor-identity.test.ts:
@bryance/orch test: (pass) a driving session's write-actor is the agent orch registered for it > a token orch has never seen resolves to nothing rather than a fabricated id [120.74ms]
@bryance/orch test: (pass) a driving session's write-actor is the agent orch registered for it > one session keeps ONE id across calls, whatever pid the shell reports [230.00ms]
@bryance/orch test: 
@bryance/orch test: test\session-env.test.ts:
@bryance/orch test: (pass) shim environment > allows the launch environment variable [0.29ms]
@bryance/orch test: 
@bryance/orch test: test\session.test.ts:
@bryance/orch test: (pass) parseSession > returns an empty view for null and missing paths [1.47ms]
@bryance/orch test: 
@bryance/orch test: test\transfer-does-not-disturb.test.ts:
@bryance/orch test: (pass) a transfer touches the lease and nothing else > a handoff changes the holder and leaves every other fact identical [309.61ms]
@bryance/orch test: 
@bryance/orch test: test\session.test.ts:
@bryance/orch test: (pass) parseSession > handles model, thinking, user, assistant, tool, and unknown entries [24.26ms]
@bryance/orch test: (pass) parseSession > joins text blocks and ignores non-text blocks [15.61ms]
@bryance/orch test: 
@bryance/orch test: test\status-headless.test.ts:
@bryance/orch test: (pass) headless status visibility > drops an exited agent that finished, however much it recorded [0.35ms]
@bryance/orch test: (pass) headless status visibility > --filter names the states, so it brings the dead back [0.11ms]
@bryance/orch test: (pass) headless status visibility > drops a dead row with no result or terminal state [0.05ms]
@bryance/orch test: (pass) headless status visibility > keeps a live row [0.05ms]
@bryance/orch test: (pass) headless status visibility > --space-wide widens the scope without resurrecting empty dead rows [0.03ms]
@bryance/orch test: (pass) headless status visibility > uses agent language without backend details when no backend was asked [0.08ms]
@bryance/orch test: 
@bryance/orch test: test\close-reports-every-target.test.ts:
@bryance/orch test: (pass) close reports an outcome for every target it was given (U2) > a failed target reports outcome error WITH the real error text [289.11ms]
@bryance/orch test: (pass) close reports an outcome for every target it was given (U2) > a pane the plexer no longer has is CLOSED, not failed [274.82ms]
@bryance/orch test: (pass) close reports an outcome for every target it was given (U2) > the exit code still reflects whether every target closed [286.37ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-replay.test.ts:
@bryance/orch test: (pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [196.96ms]
@bryance/orch test: 
@bryance/orch test: test\settings-defects.test.ts:
@bryance/orch test: (pass) settingsDefects > returns no defects for an absent file [2.46ms]
@bryance/orch test: 
@bryance/orch test: test\store-rebuild-schema.test.ts:
@bryance/orch test: (pass) rebuild schema > the store opens migrated, with foreign keys enabled [156.65ms]
@bryance/orch test: (pass) rebuild schema > all ten partial unique indexes allow only one open row [2222.43ms]
@bryance/orch test: (pass) rebuild schema > enforces foreign keys and agent checks [217.25ms]
@bryance/orch test: (pass) rebuild schema > requires exactly one task scope [196.57ms]
@bryance/orch test: (pass) rebuild schema > allows one open attempt only [221.00ms]
@bryance/orch test: (pass) rebuild schema > enforces lease checks and one lease [201.17ms]
@bryance/orch test: (pass) rebuild schema > remaining documented CHECKs and cascades are enforced [260.65ms]
@bryance/orch test: (pass) rebuild schema > task_states derives queued claimed and outcomes [261.05ms]
@bryance/orch test: 
@bryance/orch test: integration\doctor-declared-vs-reality.test.ts:
@bryance/orch test: (pass) doctor declared-vs-reality > describes composed and absent backend roles [29.71ms]
@bryance/orch test: 
@bryance/orch test: test\status-live.test.ts:
@bryance/orch test: (pass) live status renderer > renders a clear screen, timestamped header, and table body [9.49ms]
@bryance/orch test: (pass) live status renderer > renders a refresh failure in the header area [0.26ms]
@bryance/orch test: (pass) live status renderer > coalesces a burst into one pending follow-up refresh [0.39ms]
@bryance/orch test: (pass) live status renderer > keeps the existing table renderer available [0.10ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-identity.test.ts:
@bryance/orch test: (pass) one key per pane spawn (12.1) > identity is an opaque minted id ΓÇö never the name, never the pane handle [273.41ms]
@bryance/orch test: 
@bryance/orch test: test\settings-defects.test.ts:
@bryance/orch test: (pass) settingsDefects > returns no defects for a valid settings file [11.00ms]
@bryance/orch test: (pass) settingsDefects > reports unparsable JSON as one file defect [2.12ms]
@bryance/orch test: (pass) settingsDefects > suggests a near-match for a stale key [19.85ms]
@bryance/orch test: (pass) settingsDefects > does not guess a replacement for a removed key [17.95ms]
@bryance/orch test: (pass) settingsDefects > reports the expected pinned schema value [17.67ms]
@bryance/orch test: (pass) settingsDefects > reports a wrong value type on a real key [17.31ms]
@bryance/orch test: 
@bryance/orch test: test\store-agent-rows.test.ts:
@bryance/orch test: (pass) agent store rows > insertAgent writes both NULL; agentById reads both back [231.01ms]
@bryance/orch test: 
@bryance/orch test: test\settings-editor.test.ts:
@bryance/orch test: (pass) settings editor reducer > moves focus down and up without running off either end [0.37ms]
@bryance/orch test: (pass) settings editor reducer > opens the focused setting for editing [0.06ms]
@bryance/orch test: (pass) settings editor reducer > cancel leaves value unchanged and returns to browsing [0.05ms]
@bryance/orch test: (pass) settings editor reducer > commit updates value and produces a pending write [0.18ms]
@bryance/orch test: (pass) settings editor reducer > refuses invalid values with a reason and stays open [0.06ms]
@bryance/orch test: (pass) settings editor reducer > refuses opening a read-only setting with a reason [0.05ms]
@bryance/orch test: (pass) settings editor reducer > cancelling without a commit yields zero writes [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\queue.test.ts:
@bryance/orch test: (pass) queue facade on tasks and attempts > enqueue selects exactly one typed scope and defaults to the enqueuer pack [282.74ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > agent scope requires the enqueuer to lease the target [265.85ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq1: the gate is on enqueuing into a scope, and adoption earns it [258.82ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq1: a pack drains its queue with its orch dead and no lease in force [224.17ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > claiming excludes another pack and space claims require open intake [270.02ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq3: a space-scoped task is an offer, and only an opted-in pack consumes it [290.33ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > a failed pack attempt retries on another member, never outside the pack [253.79ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq5: an agent-scoped binding is to the agent and survives adoption [255.93ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq13: adoption carries the queue ΓÇö pack work comes with the agents [274.08ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > a claim is an insert and a lost race returns false [246.23ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > cancel rights are enqueuer, targeted agent's leasing orch, or human [294.67ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq7: origin_workspace is gone from the tasks table, scope replaces it [211.37ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > state and attempt-derived values have no legacy flattened fields [225.89ms]
@bryance/orch test: 
@bryance/orch test: test\status-owner-column.test.ts:
@bryance/orch test: (pass) the rendered status table carries the owner column > each row's OWNER cell holds that row's lease fact [3.62ms]
@bryance/orch test: (pass) the rendered status table carries the owner column > a dead holder reads as unleased under a table that all shares one owner [0.27ms]
@bryance/orch test: (pass) the rendered status table carries the owner column > the owner column is dropped only when no row knows its lease [0.30ms]
@bryance/orch test: 
@bryance/orch test: test\store-runs.test.ts:
@bryance/orch test: (pass) run rows > round-trips every field, including a structured result [216.39ms]
@bryance/orch test: 
@bryance/orch test: test\every-agent-has-an-inbox.test.ts:
@bryance/orch test: (pass) every agent has an inbox > the inbox is at one derived path, whatever the agent's environment [320.75ms]
@bryance/orch test: (pass) every agent has an inbox > delivery stamps an id and a timestamp on every message, for every agent [251.49ms]
@bryance/orch test: (pass) every agent has an inbox > delivery is refused for a disconnected bridge, not for a missing pane [339.72ms]
@bryance/orch test: 
@bryance/orch test: test\command-refusal.test.ts:
@bryance/orch test: (pass) a command refusal is thrown, not exited > an unresolvable target throws a CommandRefusal instead of killing the process [280.98ms]
@bryance/orch test: 
@bryance/orch test: test\settings-notify.test.ts:
@bryance/orch test: (pass) orch settings notify > records a sink with the field that sink declares [82.20ms]
@bryance/orch test: 
@bryance/orch test: test\reap-picker.test.ts:
@bryance/orch test: (pass) reapCandidates > classifies unleased dead holders and leased dead processes [0.56ms]
@bryance/orch test: 
@bryance/orch test: integration\reset-build-safety.test.ts:
@bryance/orch test: (pass) build reset safety > --build dry-run never names a path inside ORCH_DIR [1059.26ms]
@bryance/orch test: 
@bryance/orch test: test\status-perf.test.ts:
@bryance/orch test: (pass) status performance seams > resolves bundle hashes once per status call [71.54ms]
@bryance/orch test: (pass) status performance seams > resolves orchestrator id once per status call [45.25ms]
@bryance/orch test: 
@bryance/orch test: test\agent-key-is-minted-id.test.ts:
@bryance/orch test: (pass) a driving session mints an id, it is not placed by name > the presence directory is named by that id alone [12.83ms]
@bryance/orch test: (pass) a driving session mints an id, it is not placed by name > a launch that handed over a minted id is used verbatim [19.61ms]
@bryance/orch test: (pass) this process's own identity is the id and nothing else > a spawned agent answers with the id its launch handed it [3.47ms]
@bryance/orch test: (pass) the fleet wall is lifted by the absence of a launch, not by a key's shape > an agent orch launched may not cross into another project's fleet [323.70ms]
@bryance/orch test: (pass) who drives an agent is looked up by its id > the key IS the agent id ΓÇö no segment is split out of it [2324.81ms]
@bryance/orch test: (pass) who drives an agent is looked up by its id > a composite key addresses no agent at all [1027.32ms]
@bryance/orch test: (pass) doctor reads a presence directory name as an id > a composite directory name is a malformed identity key [20.08ms]
@bryance/orch test: (pass) doctor reads a presence directory name as an id > a minted id with a current stamp is well formed [12.70ms]
@bryance/orch test: 
@bryance/orch test: integration\doctor-stale-presence.test.ts:
@bryance/orch test: (pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [5880.10ms]
@bryance/orch test: 
@bryance/orch test: test\command-refusal.test.ts:
@bryance/orch test: (pass) a command refusal is thrown, not exited > the refusal carries the reason a human needs [195.02ms]
@bryance/orch test: 
@bryance/orch test: test\agent-model-unwelded.test.ts:
@bryance/orch test: (pass) A1 ΓÇö the four facts are never welded > no table welds identity, provenance, ownership and environment into one row [2.30ms]
@bryance/orch test: 
@bryance/orch test: test\reap-picker.test.ts:
@bryance/orch test: (pass) reapCandidates > classifies empty input [0.17ms]
@bryance/orch test: (pass) cmdReap > prints the --dead --json result shape [203.77ms]
@bryance/orch test: (pass) cmdReap > refuses bare reap when stdin is not a TTY [0.43ms]
@bryance/orch test: 
@bryance/orch test: test\agent-model-unwelded.test.ts:
@bryance/orch test: (pass) A1 ΓÇö the four facts are never welded > ownership is a lease table, not a second id space [1.54ms]
@bryance/orch test: (pass) A1 ΓÇö the four facts are never welded > the agents hub carries identity and provenance only [0.34ms]
@bryance/orch test: (pass) A1 ΓÇö the four facts are never welded > no table anywhere carries a lifetime [24.35ms]
@bryance/orch test: 
@bryance/orch test: test\capacity.test.ts:
@bryance/orch test: (pass) fleet capacity > counts live agents by root holder [1.33ms]
@bryance/orch test: (pass) fleet capacity > reports configured per-space caps [0.14ms]
@bryance/orch test: (pass) fleet capacity > uses null for an unlimited total [0.09ms]
@bryance/orch test: (pass) fleet capacity > formats holder, space, and machine capacity [0.41ms]
@bryance/orch test: 
@bryance/orch test: test\status-renders-one-row-shape.test.ts:
@bryance/orch test: (pass) status rendering has one row shape and one table renderer > task and last text use the same spelling in the row and table cell [88.64ms]
@bryance/orch test: 
@bryance/orch test: test\check-bridge.test.ts:
@bryance/orch test: (pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.17ms]
@bryance/orch test: 
@bryance/orch test: test\hello-environment.test.ts:
@bryance/orch test: (pass) hello records the environment in full > the plexer the caller registered in is on the agent, not only on the host [261.93ms]
@bryance/orch test: 
@bryance/orch test: test\settings-notify.test.ts:
@bryance/orch test: (pass) orch settings notify > re-adding one sink replaces it in place and keeps the fields the call omits [93.70ms]
@bryance/orch test: (pass) orch settings notify > accepts asking as a first-class sink state [48.75ms]
@bryance/orch test: (pass) orch settings notify > remove drops only the named sink [74.38ms]
@bryance/orch test: (pass) orch settings notify > list reports each sink with the states it fires on, defaults included [57.21ms]
@bryance/orch test: (pass) orch settings notify > an empty notify array lists as none configured [16.39ms]
@bryance/orch test: (pass) orch settings notify > the notify row lists every sink, the states it may fire on, and the fields each carries [43.50ms]
@bryance/orch test: (pass) orch settings notify > the notify row writes the picked sinks, states included, and drops the ones left off [14.29ms]
@bryance/orch test: (pass) orch settings notify > the notify row refuses an unknown sink, a carrying sink with nothing to carry, and an unknown state [3.65ms]
@bryance/orch test: 
@bryance/orch test: integration\routing-hardening.test.ts:
@bryance/orch test: (pass) store hardening > stores hostile values as data and preserves pack selection [237.72ms]
@bryance/orch test: 
@bryance/orch test: test\settings-precedence.test.ts:
@bryance/orch test: (pass) settings precedence > returns a defaults value when no override is set [10.86ms]
@bryance/orch test: (pass) settings precedence > applies defaults when settings, env, and flag are absent [24.66ms]
@bryance/orch test: (pass) settings precedence > uses env over settings and flag over env [6.35ms]
@bryance/orch test: (pass) settings precedence > parses notify entries and hosts into expected shapes [14.68ms]
@bryance/orch test: (pass) settings precedence > reports a helpful validation error for invalid settings [18.08ms]
@bryance/orch test: 
@bryance/orch test: test\reap-walks-provenance.test.ts:
@bryance/orch test: (pass) reap walks the provenance tree (H3) > an ended agent with a still-present descendant is NOT reaped [228.18ms]
@bryance/orch test: 
@bryance/orch test: test\check-bridge.test.ts:
@bryance/orch test: (pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.08ms]
@bryance/orch test: (pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / settings seams [0.11ms]
@bryance/orch test: (pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [0.72ms]
@bryance/orch test: (pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.33ms]
@bryance/orch test: (pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.04ms]
@bryance/orch test: (pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the shared harness model port outside the adapter dispatcher [0.01ms]
@bryance/orch test: (pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [0.70ms]
@bryance/orch test: (pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > flags a runtime adapter importing bridge-bundles/build.ts [0.38ms]
@bryance/orch test: (pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > allows scripts and the build-tool module itself [0.04ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [2.39ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.47ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.68ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke test holds no exemption: the branch was deleted, not blessed [0.09ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has no identity-branch line, exempted or otherwise [7.43ms]
@bryance/orch test: (pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > flags spawner key and spawnerIdentity key owner-token fallbacks [0.46ms]
@bryance/orch test: (pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > allows a benign line [0.06ms]
@bryance/orch test: (pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > passes the clean tree: reply addresses never use owner-token fallbacks [1.64ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags object literals that synthesize an identity [0.21ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags concatenated and template identity keys [0.28ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > allows a fresh spawn mint and the issuer modules [0.07ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > no file is exempt from the identity-construction rule [0.02ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > passes the clean tree: every identity construction is allowed or registered [2.86ms]
@bryance/orch test: (pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.24ms]
@bryance/orch test: (pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.03ms]
@bryance/orch test: (pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [0.82ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > a deleted capability bag or optional method is not exempt [0.97ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > the exempted names are the roles the ports actually declare [0.23ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > nullable data on the port is not exempted as a role [0.04ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > flags plexer and harness identity branches [0.04ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > flags method-presence capability checks [0.30ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > allows a branch inside a concrete backend [0.05ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > passes the clean tree: no file in ANY scanned scope branches on an environment id [98.47ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > the core-scope allowlist is EMPTY, so no line holds a standing exemption [0.31ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > allows capability-driven code [0.08ms]
@bryance/orch test: (pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags INSERT and UPDATE SQL that welds a lease holder into spawned_by [0.40ms]
@bryance/orch test: (pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags lease row types carrying a provenance field [0.04ms]
@bryance/orch test: (pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > allows separate lease and provenance rows [0.09ms]
@bryance/orch test: (pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > passes the clean tree: no source line crosses lease and provenance columns [41.73ms]
@bryance/orch test: (pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a launch env read outside launch.ts with the file and constant named [0.29ms]
@bryance/orch test: (pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > allows the launch env read inside identity/launch.ts [0.05ms]
@bryance/orch test: (pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a bare launch env name literal outside launch.ts [0.03ms]
@bryance/orch test: (pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a comment mentioning the launch env name outside launch.ts [0.02ms]
@bryance/orch test: (pass) the closed plexer-id set is spelled in exactly one line > the definition line is allowed where it lives, and nowhere else [0.05ms]
@bryance/orch test: (pass) the closed plexer-id set is spelled in exactly one line > any other quoted plexer id in that same file still fails [0.02ms]
@bryance/orch test: (pass) the closed plexer-id set is spelled in exactly one line > the line src/types/backend.ts actually carries is the allowed one [0.99ms]
@bryance/orch test: (pass) the closed plexer-id set is spelled in exactly one line > extensions get the same rule with their own scope named [0.06ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö orch's own grouping > create refuses a name already in use [202.83ms]
@bryance/orch test: (pass) orch space ΓÇö orch's own grouping > delete refuses a space that still holds agents [207.88ms]
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > create makes a home and records only its coordinate [249.76ms]
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > list reports that a space has a home without naming the coordinate [197.20ms]
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > rename renames orch's space and its home [213.67ms]
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > delete closes the home and drops its coordinate [218.56ms]
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > focus focuses the recorded coordinate [233.62ms]
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > a home made in another plexer is not this environment's to focus [219.60ms]
@bryance/orch test: (pass) orch space ΓÇö absence is an answer > focus with no space-home role names the space and what is missing [252.97ms]
@bryance/orch test: (pass) orch space ΓÇö absence is an answer > the plain-text answer names the space too [188.57ms]
@bryance/orch test: (pass) orch space ΓÇö vocabulary and wiring > cmdSpace lists through the resolved environment [164.43ms]
@bryance/orch test: (pass) orch space ΓÇö vocabulary and wiring > orch ws is gone [0.22ms]
@bryance/orch test: (pass) orch space ΓÇö vocabulary and wiring > space help never says workspace and offers create/rename/delete [0.13ms]
@bryance/orch test: (pass) orch space ΓÇö vocabulary and wiring > no space output ever says workspace [217.49ms]
@bryance/orch test: 
@bryance/orch test: test\command-space-fields.test.ts:
@bryance/orch test: (pass) command space fields > status and wall entities use the composed space, and it is nowhere in the key [345.26ms]
@bryance/orch test: 
@bryance/orch test: test\status-renders-one-row-shape.test.ts:
@bryance/orch test: (pass) status rendering has one row shape and one table renderer > local and remote rows share the renderer; remote adds only HOST [0.54ms]
@bryance/orch test: (pass) status rendering has one row shape and one table renderer > fleet resolves caller inputs once while building three presence rows [232.61ms]
@bryance/orch test: 
@bryance/orch test: test\settings-registry.test.ts:
@bryance/orch test: (pass) settings registry > declares every schema setting exactly once [1.11ms]
@bryance/orch test: (pass) settings registry > every registry read resolves against loaded settings [34.17ms]
@bryance/orch test: (pass) settings registry > fleet help explains what each limit counts [0.25ms]
@bryance/orch test: (pass) settings registry > fleet.max_depth round-trips through the full-tree writer [13.91ms]
@bryance/orch test: (pass) settings registry > fleet.max_depth rejects zero through the registered writer [7.56ms]
@bryance/orch test: (pass) settings registry > fleet.max_depth writes its value to settings.json [14.53ms]
@bryance/orch test: (pass) settings registry > contains no duplicate keys [0.37ms]
@bryance/orch test: 
@bryance/orch test: test\commands-spawn.test.ts:
@bryance/orch test: (pass) commands/spawn > refuses an invalid name before resolving or creating a workspace [20.62ms]
@bryance/orch test: 
@bryance/orch test: test\commands-panes.test.ts:
@bryance/orch test: (pass) commands/panes > pane identity is the minted id alone [0.13ms]
@bryance/orch test: (pass) commands/panes > a plexer-and-space key is not an identity [0.27ms]
@bryance/orch test: (pass) commands/panes > exports the pane listing command directly [0.05ms]
@bryance/orch test: 
@bryance/orch test: integration\close-always.test.ts:
@bryance/orch test: Could not close signalfai1: signal denied
@bryance/orch test: {"closed":[],"results":[{"target":"signalfai1","handle":"pane-signal-failed","outcome":"error","error":"signal denied"}],"requested":1,"ok":0,"stream":false}
@bryance/orch test: {"closed":["presence01"],"results":[{"target":"presence01","handle":"pane-presence-only","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
@bryance/orch test: (pass) close always works > a failed signal retains the registry and presence and reports failure [1946.41ms]
@bryance/orch test: (pass) close always works > presence pid without a recorded process closes the pane without signalling and ends the row [331.08ms]
@bryance/orch test: 
@bryance/orch test: test\peer-lease-visibility.test.ts:
@bryance/orch test: (pass) peer summaries carry ownership as a lease > a peer the caller holds reports the caller as the live holder [1913.88ms]
@bryance/orch test: 
@bryance/orch test: test\claim-agent.test.ts:
@bryance/orch test: (pass) claim agent > unclaimed + A ΓåÆ stamped [248.61ms]
@bryance/orch test: 
@bryance/orch test: test\transfer-does-not-disturb.test.ts:
@bryance/orch test: (pass) a transfer touches the lease and nothing else > the agent's process is not restarted or re-attached [302.48ms]
@bryance/orch test: (pass) a transfer touches the lease and nothing else > no reset, steer or re-attach is delivered to the agent [397.92ms]
@bryance/orch test: (pass) a transfer touches the lease and nothing else > adoption of an unheld agent disturbs it no more than a handoff does [312.78ms]
@bryance/orch test: (pass) a transfer touches the lease and nothing else > the holding that ended is kept as history, not erased by the transfer [296.36ms]
@bryance/orch test: 
@bryance/orch test: test\os-side.test.ts:
@bryance/orch test: (pass) osSide > supports both platform branches independent of ambient host [0.08ms]
@bryance/orch test: 
@bryance/orch test: test\commands-spawn.test.ts:
@bryance/orch test: (pass) commands/spawn > refuses spawn without a name before any spawn mutations [191.57ms]
@bryance/orch test: (pass) commands/spawn > rejects removed spawn cap flag as unknown [0.23ms]
@bryance/orch test: (pass) commands/spawn > rejects --detached as an unknown spawn flag [11.21ms]
@bryance/orch test: (pass) commands/spawn > the positionals are the agent names [0.28ms]
@bryance/orch test: (pass) commands/spawn > collects repeated prompts in agent order [0.17ms]
@bryance/orch test: (pass) commands/spawn > each pi flavor launches its own binary and preserves raw prompt [0.51ms]
@bryance/orch test: 
@bryance/orch test: test\store-runs.test.ts:
@bryance/orch test: (pass) run rows > upsert updates a row while preserving its original start time [174.14ms]
@bryance/orch test: (pass) run rows > orders by started time, filters by agent, and honours limit [179.90ms]
@bryance/orch test: (pass) run rows > omits absent optional fields instead of returning null [194.36ms]
@bryance/orch test: (pass) run rows > deletes only rows older than the cutoff and returns the count [197.93ms]
@bryance/orch test: (pass) run rows > stays readable after the agent presence directory is deleted [249.39ms]
@bryance/orch test: 
@bryance/orch test: test\commands-queue.test.ts:
@bryance/orch test: (pass) commands/queue > cmdQueue list emits the selected JSON view [226.82ms]
@bryance/orch test: 
@bryance/orch test: test\commands-status.test.ts:
@bryance/orch test: (pass) commands/status > zero-row message reports gathered counts and backend response [0.07ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-identity.test.ts:
@bryance/orch test: (pass) one key per pane spawn (12.1) > a name freed by a dead agent is reusable, and the two agents differ in identity [337.73ms]
@bryance/orch test: (pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [277.89ms]
@bryance/orch test: (pass) A1: spawn registration records the space as an environment axis > a spawn into a space writes agent_spaces, and the composer reads it back [259.74ms]
@bryance/orch test: (pass) A1: spawn registration records the space as an environment axis > a spawn stating no space records NO ROW ΓÇö a missing axis is a missing row [190.96ms]
@bryance/orch test: (pass) A1: spawn registration records the space as an environment axis > moving an agent to another space closes the old interval and keeps its identity [260.31ms]
@bryance/orch test: 
@bryance/orch test: test\commands-queue.test.ts:
@bryance/orch test: No queue tasks.
@bryance/orch test: (pass) commands/queue > round-trips add/list/cancel on an isolated store [234.53ms]
@bryance/orch test: (pass) commands/queue > renders empty queues without throwing [0.40ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) answer over the daemon control socket > refuses an answer from outside the lease, naming the holder [2037.90ms]
@bryance/orch test: 
@bryance/orch test: test\reap-walks-provenance.test.ts:
@bryance/orch test: (pass) reap walks the provenance tree (H3) > the tree is reaped from the LEAF up, one sweep per level [275.91ms]
@bryance/orch test: (pass) reap walks the provenance tree (H3) > a LIVE descendant blocks the reap even when the parent ended long ago [240.86ms]
@bryance/orch test: (pass) reap walks the provenance tree (H3) > provenance has no ON DELETE CASCADE, so no reap can erase a subtree [206.82ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-limits.test.ts:
@bryance/orch test: (pass) spawn limits > schema loads global and workspace caps [41.45ms]
@bryance/orch test: 
@bryance/orch test: test\command-space-fields.test.ts:
@bryance/orch test: (pass) command space fields > skipBackends keeps the authoritative presence entity shape [303.96ms]
@bryance/orch test: (pass) command space fields > status reports a mixed pi and Claude fleet with the same identity fields [351.13ms]
@bryance/orch test: 
@bryance/orch test: test\outbox-ack.test.ts:
@bryance/orch test: (pass) outbox ack fallback > consumes a fake agent ack from ack.jsonl on the next drain [240.47ms]
@bryance/orch test: 
@bryance/orch test: test\store-task-rows.test.ts:
@bryance/orch test: (pass) task and attempt rows > malformed task rows are refused instead of handed back as typed data [231.97ms]
@bryance/orch test: 
@bryance/orch test: test\recipient-label.test.ts:
@bryance/orch test: (pass) agent identity shown to an operator > names the agent and its harness, never the transport key [0.16ms]
@bryance/orch test: (pass) agent identity shown to an operator > drops the routing prefix when nothing is known about it [0.12ms]
@bryance/orch test: (pass) agent identity shown to an operator > a nameless agent gets a stable logical name, not its key [0.52ms]
@bryance/orch test: 
@bryance/orch test: integration\routing-hardening.test.ts:
@bryance/orch test: (pass) store hardening > a fresh store creates the full current schema with WAL enabled [220.10ms]
@bryance/orch test: (pass) store hardening > the store refuses a second open holding, so ownership cannot fork [240.07ms]
@bryance/orch test: (pass) store hardening > adoption closes the prior holding in the same step that opens the new one [238.15ms]
@bryance/orch test: (pass) store hardening > the attempt insert claim is exactly once [255.80ms]
@bryance/orch test: 
@bryance/orch test: test\backend-headless.test.ts:
@bryance/orch test: (pass) HeadlessBackend > refuses to spawn with no prompt ΓÇö a headless agent runs its prompt and exits [36.43ms]
@bryance/orch test: 
@bryance/orch test: test\hello-environment.test.ts:
@bryance/orch test: (pass) hello records the environment in full > the space the caller registered in is recorded at hello, not inferred later [276.37ms]
@bryance/orch test: (pass) hello records the environment in full > a session in no space and no plexer records neither, and that is an answer [229.79ms]
@bryance/orch test: (pass) hello records the environment in full > re-registering the same session does not re-root or re-place it [279.45ms]
@bryance/orch test: (pass) hello records the environment in full > the claim carries every environment fact hello has to record [244.36ms]
@bryance/orch test: 
@bryance/orch test: test\lease-authority.test.ts:
@bryance/orch test: (pass) C3 foreign agents are untouchable > every driving verb is refused while a live foreign orch holds the lease [4642.60ms]
@bryance/orch test: 
@bryance/orch test: test\reload-no-bundle-write.test.ts:
@bryance/orch test: {"results":[],"ok":0,"total":0,"hard":false,"signaled":"reload.signal"}
@bryance/orch test: (pass) reload > does not write installed extension bundles [45.06ms]
@bryance/orch test: 
@bryance/orch test: test\commands-results.test.ts:
@bryance/orch test: (pass) commands/results > renders missing space and host as absent instead of inventing local [209.34ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-limits.test.ts:
@bryance/orch test: (pass) spawn limits > rejects invalid cap %s with file and key [17.87ms]
@bryance/orch test: (pass) spawn limits > rejects invalid cap %s with file and key [16.29ms]
@bryance/orch test: (pass) spawn limits > rejects invalid cap %s with file and key [12.71ms]
@bryance/orch test: (pass) spawn limits > omitted fleet caps normalize to defaults [6.93ms]
@bryance/orch test: (pass) spawn limits > global boundary refusal data counts the whole request [28.75ms]
@bryance/orch test: (pass) spawn limits > one workspace may use the full global allotment [11.15ms]
@bryance/orch test: (pass) spawn limits > workspace cap is independent of global headroom [21.58ms]
@bryance/orch test: (pass) spawn limits > uncapped space is bounded only by global count [14.73ms]
@bryance/orch test: (pass) spawn limits > foreign pack members do not consume the caller's pack cap [51.63ms]
@bryance/orch test: (pass) spawn limits > dead pid records free capacity [29.72ms]
@bryance/orch test: (pass) spawn limits > foreign panes never count [15.41ms]
@bryance/orch test: (pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [21.60ms]
@bryance/orch test: (pass) spawn limits > doctor accepts satisfiable limits [22.17ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-decision-trail.test.ts:
@bryance/orch test: (pass) daemon decision trail > records a lease refused against a live holder [2114.04ms]
@bryance/orch test: 
@bryance/orch test: test\commands-clean.test.ts:
@bryance/orch test: (pass) commands/clean > reaps dead agent dirs but preserves live pids [220.01ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-name-list.test.ts:
@bryance/orch test: (pass) spawn names every agent positionally, at creation > the positional arguments are the names, one per pane [0.42ms]
@bryance/orch test: 
@bryance/orch test: test\backend-headless.test.ts:
@bryance/orch test: (pass) HeadlessBackend > spawns a detached process and records its handle [240.39ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-name-list.test.ts:
@bryance/orch test: (pass) spawn names every agent positionally, at creation > the pane count is how many names were given [0.06ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > spawning with no name at all is refused [0.10ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > a bare count is not a name and is refused [0.18ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > the same name twice would collide, so it is refused before anything is created [0.10ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > every name is validated, so one bad name creates nothing [0.10ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > --name is gone: naming is positional, so the flag is an unknown flag [0.33ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > claimSpawnNames takes the resolved names and asserts each is free [6.36ms]
@bryance/orch test: 
@bryance/orch test: test\claim-agent.test.ts:
@bryance/orch test: (pass) claim agent > claimed A, claim A ΓåÆ unchanged [215.92ms]
@bryance/orch test: (pass) claim agent > claimed A, reclaimAgent(id) then B ΓåÆ stamped with B [249.61ms]
@bryance/orch test: (pass) claim agent > claimed A, plain claim B ΓåÆ refused claimed-by-other, row unchanged [201.99ms]
@bryance/orch test: (pass) claim agent > unknown id ΓåÆ refused unknown-agent [195.16ms]
@bryance/orch test: 
@bryance/orch test: test\backend-headless.test.ts:
@bryance/orch test: (pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [110.47ms]
@bryance/orch test: 
@bryance/orch test: integration\routing-hardening.test.ts:
@bryance/orch test: (pass) CLI offline routing > status --offline does not start or contact orchd [411.75ms]
@bryance/orch test: 
@bryance/orch test: integration\os-executors.test.ts:
@bryance/orch test: (pass) cross-OS execution is a backend, not a peer daemon > the local side supplies start, is-alive and kill [1.39ms]
@bryance/orch test: 
@bryance/orch test: test\claude-hooks.test.ts:
@bryance/orch test: (pass) Claude hook command > gates execution on the launch environment variable [17.31ms]
@bryance/orch test: 
@bryance/orch test: test\remote-fanout.test.ts:
@bryance/orch test: (pass) async remote fan-out > parses valid JSON from a host [233.51ms]
@bryance/orch test: 
@bryance/orch test: test\backend-headless.test.ts:
@bryance/orch test: (pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [94.14ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-hud-environment.test.ts:
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > a herdr-placed agent reports the handle its environment carries [270.41ms]
@bryance/orch test: 
@bryance/orch test: test\store-interval-rows.test.ts:
@bryance/orch test: (pass) interval satellites > half-open adjacency is legal [261.58ms]
@bryance/orch test: (pass) interval satellites > clearSpace closes without opening [225.20ms]
@bryance/orch test: (pass) interval satellites > agent plexer is immutable one-shot [235.84ms]
@bryance/orch test: (pass) interval satellites > process restart history closes at the successor since [254.91ms]
@bryance/orch test: (pass) interval satellites > process rows carry host and process identity [255.11ms]
@bryance/orch test: (pass) interval satellites > nullable process start_token round-trips as null [207.73ms]
@bryance/orch test: (pass) interval satellites > space move history closes at the successor since [241.17ms]
@bryance/orch test: (pass) interval satellites > tuning change history closes at the successor since [227.49ms]
@bryance/orch test: (pass) interval satellites > handle history preserves each renumbered handle [234.37ms]
@bryance/orch test: (pass) interval satellites > interval instants are stored as INTEGER values [277.99ms]
@bryance/orch test: (pass) interval satellites > process wrapper rolls back predecessor close when successor fails [230.47ms]
@bryance/orch test: (pass) interval satellites > space wrapper rolls back predecessor close when successor fails [193.00ms]
@bryance/orch test: (pass) interval satellites > tuning carries model and nullable thinking [218.88ms]
@bryance/orch test: 
@bryance/orch test: test\remote-fanout.test.ts:
@bryance/orch test: (pass) async remote fan-out > returns a typed dead-host failure [271.16ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-decision-trail.test.ts:
@bryance/orch test: (pass) daemon decision trail > records a lease granted over a dead holder [250.98ms]
@bryance/orch test: (pass) daemon decision trail > records a not-placed boundary answer with its reason [238.84ms]
@bryance/orch test: 
@bryance/orch test: test\commands-clean.test.ts:
@bryance/orch test: (pass) worktree ownership reads the composed environment > a live agent's worktree is protected and a dead one's is not [234.90ms]
@bryance/orch test: (pass) orch clean is destructive maintenance > a spawned agent is refused the sweep, and the dirs it does not own survive [247.35ms]
@bryance/orch test: 
@bryance/orch test: test\store-lease-rows.test.ts:
@bryance/orch test: (pass) agent lease rows > fencing ids are monotonic across agents and never reused after reap [244.21ms]
@bryance/orch test: 
@bryance/orch test: test\store-agent-rows.test.ts:
@bryance/orch test: (pass) agent store rows > insertAgent materializes the provenance root [260.16ms]
@bryance/orch test: (pass) agent store rows > endAgent records who closed it, nullable for death [212.47ms]
@bryance/orch test: (pass) agent store rows > liveAgents excludes agents with an ending [239.61ms]
@bryance/orch test: (pass) agent store rows > packMembers selects the materialized root [216.03ms]
@bryance/orch test: (pass) agent store rows > unknown harness is rejected by the foreign key [140.90ms]
@bryance/orch test: (pass) agent store rows > unknown spawnedBy is rejected by the foreign key [144.23ms]
@bryance/orch test: (pass) agent store rows > label maps both null and a value [254.38ms]
@bryance/orch test: (pass) agent store rows > created_at is an INTEGER epoch millisecond [190.06ms]
@bryance/orch test: (pass) agent store rows > worktreeOf distinguishes repo agents from worktree agents [192.33ms]
@bryance/orch test: (pass) agent store rows > renameAgent is id-keyed and leaves identity history unchanged [200.77ms]
@bryance/orch test: (pass) agent store rows > lookup ensure operations are insert-or-ignore [173.95ms]
@bryance/orch test: (pass) agent store rows > childrenOf returns direct descendants [203.22ms]
@bryance/orch test: 
@bryance/orch test: test\commands-control.test.ts:
@bryance/orch test: (pass) commands/control > parses dispatch flags without losing prompt words [0.30ms]
@bryance/orch test: (pass) commands/control > parses --then destination and note [0.15ms]
@bryance/orch test: (pass) commands/control > adds worker header unless raw [0.35ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > closes every watcher when watched agent directories disappear [52.03ms]
@bryance/orch test: 
@bryance/orch test: integration\settings-command.test.ts:
@bryance/orch test: (pass) orch settings > every registered setting is reachable through --json [406.31ms]
@bryance/orch test: 
@bryance/orch test: test\store-catalogue.test.ts:
@bryance/orch test: (pass) catalogue rows > empty store reads an empty Map [125.11ms]
@bryance/orch test: 
@bryance/orch test: test\commands-daemon.test.ts:
@bryance/orch test: (pass) commands/daemon > parses governance and validates daemon status [0.43ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-hud-environment.test.ts:
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > the handle follows the agent when it moves pane [274.66ms]
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > an agent on another plexer is not a herdr pane [234.42ms]
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > a process orch never launched is not a herdr pane [5.69ms]
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > a key that is not a minted id resolves to no pane at all [7.55ms]
@bryance/orch test: 
@bryance/orch test: test\commands-daemon.test.ts:
@bryance/orch test: (pass) commands/daemon > reads a lock pid only from a complete lock record [52.10ms]
@bryance/orch test: 
@bryance/orch test: test\pi-model-control.test.ts:
@bryance/orch test: (pass) splitThinkingSuffix > splits a valid ladder effort off the bare id [0.12ms]
@bryance/orch test: (pass) splitThinkingSuffix > leaves a bare model untouched [0.03ms]
@bryance/orch test: (pass) splitThinkingSuffix > keeps a trailing colon token that is not a thinking level as part of the id [0.04ms]
@bryance/orch test: (pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > looks up the BARE id and returns the effort suffix separately [0.84ms]
@bryance/orch test: (pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > retries until a still-booting registry answers [3.39ms]
@bryance/orch test: (pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > throws when the registry never yields the model [0.31ms]
@bryance/orch test: (pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > rejects a token without a provider/id shape [0.16ms]
@bryance/orch test: (pass) createModelControl.applyControlCommand > applies a suffixed model command and records a success outcome [5.04ms]
@bryance/orch test: 
@bryance/orch test: test\commands-events.test.ts:
@bryance/orch test: (pass) commands/events > owned renderers and tool help do not expose the retired workspace term [0.80ms]
@bryance/orch test: 
@bryance/orch test: test\outbox-ack.test.ts:
@bryance/orch test: (pass) outbox ack fallback > keeps an unacknowledged delivery pending for retry [175.40ms]
@bryance/orch test: (pass) outbox ack fallback > a duplicated ack marker is counted once, not twice [229.34ms]
@bryance/orch test: (pass) outbox ack fallback > an ack whose key does not match the agent dir is ignored [196.28ms]
@bryance/orch test: (pass) outbox ack fallback > an inbox write is queued, not delivered: only the agent's ack settles the row [229.97ms]
@bryance/orch test: (pass) outbox ack fallback > a channel that can never ack settles the row on the write itself [160.84ms]
@bryance/orch test: (pass) outbox ack fallback > a queued write is handed off, so it is open but no longer unsent [164.67ms]
@bryance/orch test: (pass) outbox ack fallback > a write no channel would take stays unsent [179.99ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > an RPC subscriber receives a presence transition [285.40ms]
@bryance/orch test: 
@bryance/orch test: test\remote-fanout.test.ts:
@bryance/orch test: (pass) async remote fan-out > returns a typed timeout failure [563.17ms]
@bryance/orch test: 
@bryance/orch test: integration\close-always.test.ts:
@bryance/orch test: {"closed":["owned00001"],"results":[{"target":"owned00001","handle":"pane-owned","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
@bryance/orch test: {"outcome":"answer","reason":"no-environment-role","text":"this pane environment does not provide abort"}
@bryance/orch test: {"closed":["duplicate1"],"results":[{"target":"duplicate1","handle":"pane-duplicate","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
@bryance/orch test: (pass) close always works > close ignores owner and spawnedBy gates [314.73ms]
@bryance/orch test: (pass) close always works > abort ignores owner gate [304.16ms]
@bryance/orch test: (pass) close always works > duplicate close targets count once [296.82ms]
@bryance/orch test: (pass) close always works > dead pane-less close is a successful no-op that ends the row and leaves presence to reap [799.86ms]
@bryance/orch test: (pass) close always works > steer remains blocked by the space wall [276.98ms]
@bryance/orch test: 
@bryance/orch test: test\remote-fanout.test.ts:
@bryance/orch test: (pass) async remote fan-out > returns a typed non-JSON failure [212.41ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > a dispatched transition writes the full run row and preserves untruncated result [281.29ms]
@bryance/orch test: 
@bryance/orch test: test\outbox-replay.test.ts:
@bryance/orch test: (pass) outbox restart replay > replays failed messages after restart without duplicates [191.59ms]
@bryance/orch test: 
@bryance/orch test: integration\codex-adapter.test.ts:
@bryance/orch test: (pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [10.92ms]
@bryance/orch test: 
@bryance/orch test: test\build-bin.test.ts:
@bryance/orch test: (pass) build entrypoint > always stamps a node shebang and executable mode [11.07ms]
@bryance/orch test: (pass) the installed CLI is the packaged build, never live source (K2) > the `orch` bin points at the packaged entrypoint, not bin/orch.ts [0.08ms]
@bryance/orch test: (pass) the installed CLI is the packaged build, never live source (K2) > the packaged entrypoint is built for node, from the source entrypoint [0.08ms]
@bryance/orch test: (pass) the installed CLI is the packaged build, never live source (K2) > a global install cannot happen without a build in front of it [0.06ms]
@bryance/orch test: (pass) the installed CLI is the packaged build, never live source (K2) > the package ships dist/, so what is installed is what was built [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\store-task-rows.test.ts:
@bryance/orch test: (pass) task and attempt rows > malformed attempt rows are refused instead of handing back NaN [213.12ms]
@bryance/orch test: (pass) task and attempt rows > enqueue accepts exactly one typed scope and round-trips JSON opts [215.07ms]
@bryance/orch test: (pass) task and attempt rows > queued tasks can be edited only by their enqueuer [219.17ms]
@bryance/orch test: (pass) task and attempt rows > two concurrent claims have one winner and one index violation [240.64ms]
@bryance/orch test: (pass) task and attempt rows > failed attempts remain in history and retries are new attempts [218.40ms]
@bryance/orch test: (pass) task and attempt rows > settlement stores exact integer instants and outcome payloads [245.11ms]
@bryance/orch test: (pass) task and attempt rows > task state precedence covers queued, claimed, failed, done and cancelled [300.38ms]
@bryance/orch test: (pass) task and attempt rows > intakes are half-open history and duplicate open intake is rejected [217.64ms]
@bryance/orch test: 
@bryance/orch test: test\store-values.test.ts:
@bryance/orch test: (pass) store row values > uses null for optional database values without JSON text [0.08ms]
@bryance/orch test: (pass) store row values > sets only non-null fields [0.06ms]
@bryance/orch test: 
@bryance/orch test: test\store-catalogue.test.ts:
@bryance/orch test: (pass) catalogue rows > write then read round-trips at and stdout [179.84ms]
@bryance/orch test: (pass) catalogue rows > writing the same command twice keeps one row with newer values [178.96ms]
@bryance/orch test: (pass) catalogue rows > an entry with empty stdout is not stored [111.09ms]
@bryance/orch test: (pass) catalogue rows > clearCatalogues empties the store [184.24ms]
@bryance/orch test: (pass) catalogue rows > two commands coexist and updating one does not touch the other [150.79ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > repeated transitions upsert one run and only terminal states set finishedAt [297.71ms]
@bryance/orch test: 
@bryance/orch test: integration\codex-adapter.test.ts:
@bryance/orch test: (pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [5.14ms]
@bryance/orch test: (pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [3.19ms]
@bryance/orch test: (pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [5.13ms]
@bryance/orch test: (pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [6.30ms]
@bryance/orch test: (pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [272.78ms]
@bryance/orch test: 
@bryance/orch test: test\caller-kind.test.ts:
@bryance/orch test: (pass) caller kind > id + recorded token is agent [180.85ms]
@bryance/orch test: 
@bryance/orch test: integration\daemon-no-peer-credentials.test.ts:
@bryance/orch test: (pass) the daemon asks for a token and nothing else > no peer-credential or ancestry syscall appears in the daemon at all [4.92ms]
@bryance/orch test: 
@bryance/orch test: test\thinking-resolution.test.ts:
@bryance/orch test: (pass) thinking resolution > resolves every rung in priority order [25.75ms]
@bryance/orch test: (pass) thinking resolution > bare model with no setting yields harness default [6.76ms]
@bryance/orch test: (pass) thinking resolution > pi translates the resolved level through its thinking role [0.31ms]
@bryance/orch test: (pass) thinking resolution > per-harness override beats global default [4.80ms]
@bryance/orch test: 
@bryance/orch test: test\commands-status.test.ts:
@bryance/orch test: (pass) commands/status > dead rows never display stale live state [0.04ms]
@bryance/orch test: (pass) commands/status > shared row boundary normalizes stale state for every renderer [0.05ms]
@bryance/orch test: (pass) commands/status > a human at a terminal has no identity to narrow by and no space to be held inside [0.15ms]
@bryance/orch test: (pass) commands/status > an agent sees what it spawned, and never past its own space > the default is the agents this caller spawned [0.05ms]
@bryance/orch test: (pass) commands/status > an agent sees what it spawned, and never past its own space > --space-wide widens to the caller's space, which is the wall [0.02ms]
@bryance/orch test: (pass) commands/status > an agent sees what it spawned, and never past its own space > a human widening sees every space, including the one the agent could not [0.02ms]
@bryance/orch test: (pass) commands/status > derives status row fields from seeded presence [37.53ms]
@bryance/orch test: (pass) commands/status > marks dead presence as exited [6.53ms]
@bryance/orch test: (pass) commands/status > asking presence is surfaced as a question while still reporting live state [7.43ms]
@bryance/orch test: (pass) commands/status > shared status row carries presence-derived fields [7.50ms]
@bryance/orch test: (pass) commands/status > row carries the owning backend's declared capabilities [26.97ms]
@bryance/orch test: (pass) commands/status > an agent whose backend orch cannot name reports no capabilities [7.69ms]
@bryance/orch test: (pass) commands/status > status owner ignores spawning provenance when no lease exists [19.05ms]
@bryance/orch test: (pass) commands/status > lease-backed status attribution distinguishes my lease, another lease, and unleased rows [2139.87ms]
@bryance/orch test: (pass) commands/status > default table separates minted identity from pane environment [2.02ms]
@bryance/orch test: (pass) commands/status > human table shows harness and working directory facts [0.30ms]
@bryance/orch test: (pass) commands/status > json branch and local table branch derive identical rows apart from host [59.03ms]
@bryance/orch test: (pass) commands/status > capacity footer uses configured caps and groups holders by root [1.87ms]
@bryance/orch test: (pass) commands/status > formats workspace labels and warnings [0.32ms]
@bryance/orch test: 
@bryance/orch test: test\commands-events.test.ts:
@bryance/orch test: (pass) commands/events > bare events is scoped to this session's agents and renders readable lines [0.12ms]
@bryance/orch test: (pass) commands/events > parses the scope flags [0.09ms]
@bryance/orch test: (pass) commands/events > parses the wake-up flags [0.09ms]
@bryance/orch test: (pass) commands/events > --filter narrows to named states and is never the default [0.15ms]
@bryance/orch test: (pass) commands/events > includes an adopted agent whose open lease is mine [0.06ms]
@bryance/orch test: (pass) commands/events > includes a reused pane leased by me even when another session spawned it [0.02ms]
@bryance/orch test: (pass) commands/events > includes an unleased agent spawned by this session [0.01ms]
@bryance/orch test: (pass) commands/events > excludes an agent spawned by a different session [0.01ms]
@bryance/orch test: (pass) commands/events > --space-wide passes agents from both sessions [0.07ms]
@bryance/orch test: (pass) commands/events > excludes an agent while another orch holds its lease [0.03ms]
@bryance/orch test: (pass) commands/events > describes durable replay and reports pruned history gaps [0.12ms]
@bryance/orch test: (pass) commands/events > names one agent by name or by identity key [0.34ms]
@bryance/orch test: (pass) commands/events > a subscription with no daemon keeps redialing instead of exiting [1.18ms]
@bryance/orch test: (pass) commands/events > renders opaque plexer coordinates without relabeling them as spaces [0.66ms]
@bryance/orch test: (pass) commands/events > an event line says what happened, never the fleet's books [0.09ms]
@bryance/orch test: (pass) commands/events > rejects malformed event and labels sinks [0.13ms]
@bryance/orch test: (pass) commands/events space wall > an agent is heard only inside the space it currently occupies [279.34ms]
@bryance/orch test: (pass) commands/events space wall > moving an agent moves its events with it [252.52ms]
@bryance/orch test: (pass) commands/events space wall > an unplaced caller has no wall and hears the machine [265.00ms]
@bryance/orch test: (pass) commands/events space wall > a key naming no registered agent is in no space [2.90ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > a status without a dispatch id does not write history [186.22ms]
@bryance/orch test: 
@bryance/orch test: test\remote-fanout.test.ts:
@bryance/orch test: (pass) async remote fan-out > fans out and keeps per-host failures without throwing [561.92ms]
@bryance/orch test: 
@bryance/orch test: test\store-connection-guards.test.ts:
@bryance/orch test: (pass) store migration guards > a store predating the migrations is refused, not rebuilt over [182.75ms]
@bryance/orch test: 
@bryance/orch test: test\backend-process-role.test.ts:
@bryance/orch test: (pass) ProcessRole > headless provider records pid and start token and safely kills it [2714.77ms]
@bryance/orch test: 
@bryance/orch test: test\commands-logging.test.ts:
@bryance/orch test: (pass) orch logs > --dispatch selects one dispatch across both sinks, oldest first [29.74ms]
@bryance/orch test: 
@bryance/orch test: test\remote.test.ts:
@bryance/orch test: (pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.42ms]
@bryance/orch test: (pass) host-prefixed targets > reports unknown host and configured names [0.11ms]
@bryance/orch test: 
@bryance/orch test: test\commands-target.test.ts:
@bryance/orch test: (pass) commands/target > splits known flags and preserves positional args [0.17ms]
@bryance/orch test: (pass) commands/target > extracts target and joined prompt [0.24ms]
@bryance/orch test: (pass) commands/target > reads only structured result text [0.09ms]
@bryance/orch test: (pass) commands/target > quotes remote args and ORCH_DIR safely [0.11ms]
@bryance/orch test: (pass) commands/target > lists only live serialized identity presence entries [41.49ms]
@bryance/orch test: 
@bryance/orch test: integration\doctor-settings-defects.test.ts:
@bryance/orch test: (pass) doctor settings defects > accepts an absent settings file [13.04ms]
@bryance/orch test: 
@bryance/orch test: test\control-ack.test.ts:
@bryance/orch test: (pass) control delivery acknowledgements > waits for the matching reader acknowledgement [0.74ms]
@bryance/orch test: (pass) control delivery acknowledgements > captures an acknowledgement arriving during delivery [0.16ms]
@bryance/orch test: (pass) control delivery acknowledgements > never claims consumption for an unacknowledged channel [0.11ms]
@bryance/orch test: (pass) control delivery acknowledgements > times out without claiming that delivery was cancelled [3.50ms]
@bryance/orch test: (pass) control delivery acknowledgements > propagates a failed send and removes its waiter [0.36ms]
@bryance/orch test: 
@bryance/orch test: test\commands-results.test.ts:
@bryance/orch test: (pass) commands/results > validates and extracts question payloads [0.13ms]
@bryance/orch test: (pass) commands/results > formats invalid and recent timestamps [0.05ms]
@bryance/orch test: (pass) commands/results > routes a seeded results.jsonl through the command module [218.65ms]
@bryance/orch test: (pass) commands/results > keeps every settled dispatch and reports the newest [272.51ms]
@bryance/orch test: (pass) commands/results > falls back to adapter session text when results.jsonl is absent [226.74ms]
@bryance/orch test: (pass) commands/results > uses results.jsonl even when the presence status has no agent [218.18ms]
@bryance/orch test: (pass) commands/results > orch tail resolves a non-pi target through that adapter's session view [241.06ms]
@bryance/orch test: (pass) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [200.55ms]
@bryance/orch test: (pass) commands/results > orch tail -n keeps last-N rendered entries for a pi session [210.12ms]
@bryance/orch test: (pass) commands/results > orch session reports the pi entry count [228.27ms]
@bryance/orch test: (pass) commands/results > orch session shows zero entries for an adapter view without them [216.13ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > a throwing history write does not stop event delivery [207.09ms]
@bryance/orch test: 
@bryance/orch test: test\commands-logging.test.ts:
@bryance/orch test: (pass) orch logs > --agent selects one agent's records [23.07ms]
@bryance/orch test: (pass) orch logs > --level selects one severity [9.80ms]
@bryance/orch test: (pass) orch logs > --since drops everything older than the instant given [23.73ms]
@bryance/orch test: (pass) orch logs > --since 0 keeps every record instead of being read as a missing value [9.46ms]
@bryance/orch test: (pass) orch logs > renders a readable line: instant, level, event, correlation, agent, fields [11.55ms]
@bryance/orch test: (pass) orch logs > --json emits the records themselves [15.63ms]
@bryance/orch test: (pass) command logging > notify test records the diagnosis and keeps user output on stdout [46.24ms]
@bryance/orch test: 
@bryance/orch test: integration\identity-launch.test.ts:
@bryance/orch test: (pass) launchCredential > returns null when the launch environment is unset [3.23ms]
@bryance/orch test: 
@bryance/orch test: test\caller-kind.test.ts:
@bryance/orch test: (pass) caller kind > id + other token is human [197.71ms]
@bryance/orch test: (pass) caller kind > id + no token is human [160.14ms]
@bryance/orch test: (pass) caller kind > no id is human [1.90ms]
@bryance/orch test: 
@bryance/orch test: test\commands-models.test.ts:
@bryance/orch test: (pass) orch models lists the whole catalogue > shows every offered model, quicklisted or not, allowed or not [0.41ms]
@bryance/orch test: (pass) orch models lists the whole catalogue > marks the launch default (thinking suffix removed) and the quicklist members [0.10ms]
@bryance/orch test: (pass) orch models lists the whole catalogue > keeps harness sections in configured order [0.04ms]
@bryance/orch test: (pass) orch models lists the whole catalogue > a harness that enumerates nothing gets an empty section, not another's models [0.11ms]
@bryance/orch test: (pass) orch models filters > --preferred narrows to the quicklist and renumbers what is shown [0.06ms]
@bryance/orch test: (pass) orch models filters > --search matches spec and label case-insensitively [0.07ms]
@bryance/orch test: (pass) orch models filters > filters combine, and no match is an empty result rather than the full list [0.04ms]
@bryance/orch test: (pass) orch models --pick prints one spec > a numeric pick reads the displayed index of a single harness [0.11ms]
@bryance/orch test: (pass) orch models --pick prints one spec > an exact spec pick resolves after filtering [0.05ms]
@bryance/orch test: (pass) orch models --pick prints one spec > ambiguous, missing, zero, and out-of-range picks fail [0.33ms]
@bryance/orch test: (pass) orch models --json > emits the pinned harness/model shape [0.09ms]
@bryance/orch test: 
@bryance/orch test: test\backend-herdr.test.ts:
@bryance/orch test: (pass) HerdrBackend > current identity uses the explicit id, not the launch environment [3.14ms]
@bryance/orch test: 
@bryance/orch test: integration\identity-launch.test.ts:
@bryance/orch test: (pass) launchCredential > returns a minted id [4.58ms]
@bryance/orch test: (pass) launchCredential > malformed value exits 1 and logs launch.invalid-key [102.14ms]
@bryance/orch test: 
@bryance/orch test: test\backend-herdr.test.ts:
@bryance/orch test: (pass) HerdrBackend > composes a complete group role bundle [0.23ms]
@bryance/orch test: (pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [2.66ms]
@bryance/orch test: (pass) HerdrBackend > starts the mapped herdr harness kind in the pane it created [0.57ms]
@bryance/orch test: (pass) HerdrBackend > agent_not_ready keeps the pane and does not close it [0.63ms]
@bryance/orch test: (pass) HerdrBackend > a caller pane is split rather than given a new tab [0.27ms]
@bryance/orch test: (pass) HerdrBackend > pane and tab creation always preserves focus [0.34ms]
@bryance/orch test: (pass) HerdrBackend > split direction clamps to herdr's right|down [0.16ms]
@bryance/orch test: (pass) HerdrBackend > env reaches the pane through herdr's --env, not an argv prefix [0.24ms]
@bryance/orch test: (pass) HerdrBackend > a handed-over pane is launched into directly, never split or closed [0.19ms]
@bryance/orch test: (pass) HerdrBackend > a group is created with the environment its own pane will launch under [0.44ms]
@bryance/orch test: (pass) HerdrBackend > the pane host closes a pane through herdr [0.06ms]
@bryance/orch test: (pass) HerdrBackend > a planned target pane is split directly, never re-seated afterwards [0.22ms]
@bryance/orch test: (pass) HerdrBackend > a grouped spawn with no planned target splits a pane already in that tab, never the caller's pane [0.84ms]
@bryance/orch test: (pass) HerdrBackend > a same-tab re-seat bounces through a throwaway tab so herdr executes it [0.33ms]
@bryance/orch test: (pass) HerdrBackend > adopts herdr's replacement pane id after move [0.03ms]
@bryance/orch test: (pass) HerdrBackend > refuses a live herdr agent name before start [0.30ms]
@bryance/orch test: (pass) HerdrBackend > reads recent unwrapped pane output [0.11ms]
@bryance/orch test: (pass) HerdrBackend > a refused move surfaces herdr's reason instead of claiming success [0.05ms]
@bryance/orch test: (pass) HerdrBackend > groupLayout reads tab geometry straight off the pane listing [0.21ms]
@bryance/orch test: (pass) HerdrBackend > pane input submits through pane run [0.11ms]
@bryance/orch test: (pass) HerdrBackend > pane rename failure reaches the role caller [0.23ms]
@bryance/orch test: (pass) HerdrBackend > waiting uses agent wait --until, not the removed top-level wait [0.06ms]
@bryance/orch test: (pass) HerdrBackend space home > opens an orch-marked workspace for a pack the caller did not label [0.40ms]
@bryance/orch test: (pass) HerdrBackend space home > a space home the human named keeps that name [0.12ms]
@bryance/orch test: (pass) HerdrBackend space home > create hands back the plexer coordinate and the root pane, and says neither [0.18ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc.test.ts:
@bryance/orch test: (pass) daemon RPC > rejects a hello response with a malformed optional field [0.25ms]
@bryance/orch test: 
@bryance/orch test: test\rename-syncs-the-pane-border.test.ts:
@bryance/orch test: (pass) orch rename syncs the pane border in one command (U5) > one rename sets orch's name AND the plexer chrome [283.03ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-transport.test.ts:
@bryance/orch test: (pass) orchd RPC transports > round-trips over the default unix transport [56.79ms]
@bryance/orch test: 
@bryance/orch test: test\peer-tools-registration.test.ts:
@bryance/orch test: (pass) peer tool registration > does not register orch_send when no spawner address exists [4.81ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-transport.test.ts:
@bryance/orch test: (pass) orchd RPC transports > round-trips over the TCP fallback transport [41.21ms]
@bryance/orch test: 
@bryance/orch test: test\commands-runs.test.ts:
@bryance/orch test: (pass) commands/runs > lists newest first and honors -n [205.33ms]
@bryance/orch test: 
@bryance/orch test: test\peer-tools-registration.test.ts:
@bryance/orch test: (pass) peer tool registration > does not register orch_send when the spawner pid is dead [19.09ms]
@bryance/orch test: (pass) peer tool registration > registers orch_send when the spawner has live presence and an inbox [64.36ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > emitted events carry the pack capacity at publish time [218.63ms]
@bryance/orch test: (pass) daemon presence events > a flapping status file cannot storm the stream with repeat transitions [0.36ms]
@bryance/orch test: (pass) daemon presence events > a genuine repeat of the same transition for new work still publishes [0.18ms]
@bryance/orch test: (pass) daemon presence events > a repeat transition publishes again once the suppression window passes [0.07ms]
@bryance/orch test: (pass) daemon presence events > repeated observations cannot slide the suppression window forever [0.04ms]
@bryance/orch test: (pass) daemon presence events > a working-to-done repeat after the dedupe window is emitted [0.08ms]
@bryance/orch test: (pass) daemon presence events > presence transitions resolve the human name before emission [4.00ms]
@bryance/orch test: (pass) daemon presence events > presence transitions use the normalized agent name after rename [191.71ms]
@bryance/orch test: (pass) daemon presence events > derivePresenceTransition preserves the complete asking transition payload [3.82ms]
@bryance/orch test: 
@bryance/orch test: test\backend-tmux.test.ts:
@bryance/orch test: (pass) TmuxBackend > current identity uses the explicit id, not the launch environment [9.15ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > an asking transition drives command sink delivery [130.59ms]
@bryance/orch test: 
@bryance/orch test: test\store-lease-rows.test.ts:
@bryance/orch test: (pass) agent lease rows > a second open lease is rejected [194.30ms]
@bryance/orch test: (pass) agent lease rows > release and expiry close rows with matching reason and exact until [208.09ms]
@bryance/orch test: (pass) agent lease rows > handoff closes current and inserts a newer row without changing prior facts [204.14ms]
@bryance/orch test: (pass) agent lease rows > adoption closes prior and inserts a strictly newer adopter row [195.83ms]
@bryance/orch test: (pass) agent lease rows > adoption with no open lease is plain acquire and leaves closed history untouched [217.41ms]
@bryance/orch test: (pass) agent lease rows > handoff rolls back close when successor insert fails [198.52ms]
@bryance/orch test: (pass) agent lease rows > wrong-holder release and handoff are rejected [187.18ms]
@bryance/orch test: (pass) agent lease rows > an agent cannot lease itself [188.01ms]
@bryance/orch test: (pass) agent lease rows > expiry inserts nothing new [211.83ms]
@bryance/orch test: (pass) agent lease rows > reads return only open rows [168.13ms]
@bryance/orch test: 
@bryance/orch test: test\store-connection-guards.test.ts:
@bryance/orch test: (pass) store migration guards > names live presence as the thing to close before rebuilding [158.37ms]
@bryance/orch test: (pass) a slave never reaps or recreates the store > a spawned agent hitting a schema-mismatched store errors and mutates nothing [206.87ms]
@bryance/orch test: (pass) a slave never reaps or recreates the store > a recreate is refused while a live presence dir exists, for the user too [108.11ms]
@bryance/orch test: (pass) a slave never reaps or recreates the store > the user may recreate once nothing is live [151.82ms]
@bryance/orch test: (pass) a slave never reaps or recreates the store > a spawned agent is refused a recreate even with nothing live [143.58ms]
@bryance/orch test: 
@bryance/orch test: test\pi-model-control.test.ts:
@bryance/orch test: (pass) createModelControl.applyControlCommand > records a failure outcome when the model is rejected [1786.45ms]
@bryance/orch test: (pass) createModelControl.applyControlCommand > applies a thinking command directly [0.42ms]
@bryance/orch test: 
@bryance/orch test: test\pid-liveness.test.ts:
@bryance/orch test: (pass) pidAlive liveness contract (shared by pi peers) > EPERM means the process exists under another user ΓÇö alive [0.16ms]
@bryance/orch test: (pass) pidAlive liveness contract (shared by pi peers) > ESRCH means no such process ΓÇö dead [0.03ms]
@bryance/orch test: (pass) pidAlive liveness contract (shared by pi peers) > the current process is alive [0.04ms]
@bryance/orch test: (pass) pidAlive liveness contract (shared by pi peers) > non-positive and non-numeric pids are rejected without signalling [0.05ms]
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
@bryance/orch test:   add       tailwindcss          Add a dependency to package.json (bun a)
@bryance/orch test:   remove    left-pad             Remove a dependency from package.json (bun rm)
@bryance/orch test:   update    elysia               Update outdated dependencies
@bryance/orch test:   audit                          Check installed packages for vulnerabilities
@bryance/orch test:   dedupe                         Remove duplicate versions from the lockfile
@bryance/orch test:   prune                          Remove packages that are not in the lockfile from node_modules
@bryance/orch test:   outdated                       Display latest versions of outdated dependencies
@bryance/orch test:   link      [<package>]          Register or link a local npm package
@bryance/orch test:   unlink                         Unregister a local npm package
@bryance/orch test:   publish                        Publish a package to the npm registry
@bryance/orch test:   patch <pkg>                    Prepare a package for patching
@bryance/orch test:   pm <subcommand>                Additional package management utilities
@bryance/orch test:   info      @shumai/shumai       Display package metadata from the registry
@bryance/orch test:   why       hono                 Explain why a package is installed
@bryance/orch test: 
@bryance/orch test:   build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file
@bryance/orch test: 
@bryance/orch test:   init                           Start an empty Bun project from a built-in template
@bryance/orch test:   create    vite                 Create a new project from a template (bun c)
@bryance/orch test:   upgrade                        Upgrade to latest version of Bun.
@bryance/orch test: 
@bryance/orch test:   <command> --help               Print help text for command.
@bryance/orch test: 
@bryance/orch test: Learn more about Bun:            https://bun.com/docs
@bryance/orch test: Join our Discord community:      https://bun.com/discord
@bryance/orch test: (pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [1882.67ms]
@bryance/orch test: (pass) daemon lifecycle > reclaims an unreadable lock, which a crash truncated and no daemon owns [2554.71ms]
@bryance/orch test: (pass) daemon lifecycle > refuses an unreadable lock while the socket still answers [918.79ms]
@bryance/orch test: (pass) daemon lifecycle > clears the lock, socket and port a departed daemon owned, keeping the log [14.59ms]
@bryance/orch test: (pass) daemon lifecycle > refuses a stale lock when the socket probe cannot answer [874.11ms]
@bryance/orch test: (pass) daemon lifecycle > retries if a stale lock disappears during reclaim [830.24ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-status-lease.test.ts:
@bryance/orch test: (pass) daemon status lease payload > reports the current holder and its liveness [2242.72ms]
@bryance/orch test: 
@bryance/orch test: integration\doctor.test.ts:
@bryance/orch test: (pass) runDoctor > detects DrvFs paths by mount path segment [0.27ms]
@bryance/orch test: 
@bryance/orch test: test\commands-runs.test.ts:
@bryance/orch test: (pass) commands/runs > target filter and json preserve RunRecord rows [257.73ms]
@bryance/orch test: (pass) commands/runs > running rows render as running, not zero duration [0.31ms]
@bryance/orch test: (pass) commands/runs > result falls back to durable run history after presence reap [131.61ms]
@bryance/orch test: 
@bryance/orch test: test\store-outbox.test.ts:
@bryance/orch test: (pass) outbox store rows > inserts pending messages and orders them by creation time [166.60ms]
@bryance/orch test: 
@bryance/orch test: test\backend-herdr-predicates.test.ts:
@bryance/orch test: (pass) herdr environment predicates > neither variable set [0.88ms]
@bryance/orch test: (pass) herdr environment predicates > HERDR_ENV=1 only [0.15ms]
@bryance/orch test: (pass) herdr environment predicates > HERDR_PANE_ID only [0.16ms]
@bryance/orch test: (pass) herdr environment predicates > both variables set [0.12ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-transport-parity.test.ts:
@bryance/orch test: (pass) both transports carry one mechanism > a bound TCP port does not displace the unix socket or become its own service [80.34ms]
@bryance/orch test: 
@bryance/orch test: test\store-events.test.ts:
@bryance/orch test: (pass) event store rows > appendEvent assigns increasing sequence numbers and round-trips payload [177.77ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-transport-parity.test.ts:
@bryance/orch test: (pass) both transports carry one mechanism > the credential is demanded identically on both [95.54ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-lifecycle.test.ts:
@bryance/orch test: (pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [352.81ms]
@bryance/orch test: 
@bryance/orch test: integration\daemon-no-peer-credentials.test.ts:
@bryance/orch test: (pass) the daemon asks for a token and nothing else > a caller the daemon has no relationship to is accepted on the token alone [1269.00ms]
@bryance/orch test: 
@bryance/orch test: test\rename-syncs-the-pane-border.test.ts:
@bryance/orch test: (pass) orch rename syncs the pane border in one command (U5) > the response states the two outcomes SEPARATELY [233.69ms]
@bryance/orch test: (pass) orch rename syncs the pane border in one command (U5) > a plexer that refuses the chrome never unwrites orch's own name [231.54ms]
@bryance/orch test: (pass) orch rename syncs the pane border in one command (U5) > --pane still gives the border something DIFFERENT, and leaves the name alone [224.01ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-transport-parity.test.ts:
@bryance/orch test: (pass) both transports carry one mechanism > a missing credential is refused identically on both [57.48ms]
@bryance/orch test: 
@bryance/orch test: integration\daemon-no-peer-credentials.test.ts:
@bryance/orch test: (pass) the daemon asks for a token and nothing else > that same stranger without the token is refused, so the token is what decided [76.60ms]
@bryance/orch test: 
@bryance/orch test: test\broker-ownership.test.ts:
@bryance/orch test: (pass) broker ownership and space governance > the composed holder is the only ownership record, and adoption moves it [193.01ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lifecycle.test.ts:
@bryance/orch test: (pass) commands/lifecycle > capability helpers fail closed when absent [0.57ms]
@bryance/orch test: 
@bryance/orch test: test\store-outbox.test.ts:
@bryance/orch test: (pass) outbox store rows > reports one message's pending state [139.78ms]
@bryance/orch test: (pass) outbox store rows > bumps attempts and hides a message until its next attempt time [127.08ms]
@bryance/orch test: (pass) outbox store rows > deletes delivered messages older than the cutoff [138.96ms]
@bryance/orch test: 
@bryance/orch test: test\backend-headless.test.ts:
@bryance/orch test: (pass) HeadlessBackend > signals a matching recorded process through the injected killer [1887.59ms]
@bryance/orch test: (pass) HeadlessBackend > refuses to signal a pid whose process instance was replaced [1104.14ms]
@bryance/orch test: (pass) HeadlessBackend > never signals a dead pid [0.80ms]
@bryance/orch test: 
@bryance/orch test: test\a-backend-exposes-each-operation-once.test.ts:
@bryance/orch test: (pass) a backend exposes each operation exactly once (2.2) > herdr publishes no operation beside the role that owns it [0.43ms]
@bryance/orch test: (pass) a backend exposes each operation exactly once (2.2) > tmux publishes no operation beside the role that owns it [0.12ms]
@bryance/orch test: (pass) a backend exposes each operation exactly once (2.2) > headless publishes no operation beside the role that owns it [0.17ms]
@bryance/orch test: 
@bryance/orch test: test\broker-ownership.test.ts:
@bryance/orch test: (pass) broker ownership and space governance > refuses cross-space writes unless explicitly overridden [192.91ms]
@bryance/orch test: (pass) broker ownership and space governance > moving an agent between spaces moves the wall, not its identity [206.66ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lifecycle.test.ts:
@bryance/orch test: (pass) commands/lifecycle > reports missing bridge pid without touching backend [0.15ms]
@bryance/orch test: (pass) commands/lifecycle > --all targets the agents this orch holds a live lease on, and drops them when it releases [301.24ms]
@bryance/orch test: 
@bryance/orch test: test\store-events.test.ts:
@bryance/orch test: (pass) event store rows > appendEvent keeps sequence numbers across store reopen [200.75ms]
@bryance/orch test: (pass) event store rows > pruned sequence numbers are never reused [157.00ms]
@bryance/orch test: (pass) event store rows > selectEventsSince filters by sequence, orders ascending, and honours limit [198.06ms]
@bryance/orch test: (pass) event store rows > oldestEventSeq reports undefined when empty and the surviving lowest sequence after pruning [130.91ms]
@bryance/orch test: 
@bryance/orch test: test\backend-space-home.test.ts:
@bryance/orch test: (pass) tmux space home > focus switches the client to the session holding the space [0.13ms]
@bryance/orch test: (pass) tmux space home > create names the session after the space and returns its root pane [0.24ms]
@bryance/orch test: (pass) tmux space home > rename and close address the session coordinate [0.07ms]
@bryance/orch test: (pass) tmux space home > list reports every session as a coordinate with a label [0.14ms]
@bryance/orch test: (pass) a home orch opens is never unmarked (E8) > an unlabelled pack home is named for the pack it was opened for [0.11ms]
@bryance/orch test: (pass) a home orch opens is never unmarked (E8) > an unlabelled space home is named for the space, not for the pack [0.05ms]
@bryance/orch test: (pass) a home orch opens is never unmarked (E8) > a subject id the plexer would refuse is made safe, never passed through [0.04ms]
@bryance/orch test: (pass) a home orch opens is never unmarked (E8) > a caller-supplied label is used verbatim [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\peer-project-scope.test.ts:
@bryance/orch test: (pass) peer discovery walls on the project > a same-workspace peer from another project is invisible by default [31.02ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-subscribe.test.ts:
@bryance/orch test: (pass) orchd event subscription > replays only events missed between subscriptions [215.49ms]
@bryance/orch test: 
@bryance/orch test: test\peer-project-scope.test.ts:
@bryance/orch test: (pass) peer discovery walls on the project > all_workspaces deliberately lifts the project wall [15.80ms]
@bryance/orch test: (pass) peer discovery walls on the project > a cross-project target does not resolve for sends without the explicit flag [26.01ms]
@bryance/orch test: (pass) peer discovery walls on the project > a record with no project stamp is malformed and never listed [26.91ms]
@bryance/orch test: (pass) peer discovery walls on the project > a spawned agent's all_workspaces flag is ignored [152.14ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-status-lease.test.ts:
@bryance/orch test: (pass) daemon status lease payload > distinguishes a known unleased agent from an unknown key [1316.40ms]
@bryance/orch test: 
@bryance/orch test: integration\owner-scoping.test.ts:
@bryance/orch test: (pass) fleet ownership scoping > fleet visibility follows provenance depth, not caller environment [287.42ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc-identity.test.ts:
@bryance/orch test: (pass) daemon identity RPCs > claim-identity stamps a minted id [1128.29ms]
@bryance/orch test: 
@bryance/orch test: test\backend-tmux.test.ts:
@bryance/orch test: (pass) TmuxBackend > does not expose legacy top-level group methods [0.30ms]
@bryance/orch test: (pass) TmuxBackend > composes a complete group role bundle [0.17ms]
@bryance/orch test: (pass) TmuxBackend > exposes tmux pane roles [0.15ms]
@bryance/orch test: (pass) TmuxBackend > does not declare pane foreground capability [0.20ms]
@bryance/orch test: (pass) TmuxBackend > reports tmux availability [21.98ms]
@bryance/orch test: (pass) TmuxBackend > reflects the TMUX environment [0.58ms]
@bryance/orch test: (pass) TmuxBackend > rejects an empty handle without invoking tmux [0.34ms]
@bryance/orch test: (pass) TmuxBackend > the pane inventory surfaces only orch-spawned panes [2.00ms]
@bryance/orch test: (pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.62ms]
@bryance/orch test: (pass) TmuxBackend > inventory status is read from the pane's presence status.json [19.44ms]
@bryance/orch test: (pass) TmuxBackend > inventory status is null when no presence status.json exists [0.53ms]
@bryance/orch test: (pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [302.34ms]
@bryance/orch test: (pass) TmuxBackend > waiting fails immediately when the pane has no presence key [0.47ms]
@bryance/orch test: (pass) TmuxBackend > the pane screen returns captured text and throws when capture-pane fails [1785.62ms]
@bryance/orch test: (pass) TmuxBackend > setLabel and renameAgent write two distinct pane options [0.60ms]
@bryance/orch test: (pass) TmuxBackend > placement.open splits the requested target with cwd and environment [0.47ms]
@bryance/orch test: (pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.67ms]
@bryance/orch test: (pass) TmuxBackend > spawn splits the planned target pane, not whatever pane the window has active [0.20ms]
@bryance/orch test: (pass) TmuxBackend > groupLayout reports every pane in a window with its cell geometry [0.32ms]
@bryance/orch test: (pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.21ms]
@bryance/orch test: (pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [0.32ms]
@bryance/orch test: (pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.18ms]
@bryance/orch test: (pass) an agent is launched with its fleet's project scope (1.13) > a tmux agent in a worktree carries the FLEET's project, not its own cwd [0.32ms]
@bryance/orch test: (pass) an agent is launched with its fleet's project scope (1.13) > a tmux agent opened in a fresh window carries it too [0.19ms]
@bryance/orch test: (pass) an agent is launched with its fleet's project scope (1.13) > an empty value is dropped rather than exported as a configured blank [0.19ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-replay.test.ts:
@bryance/orch test: (pass) orchd RPC replay buffer > replays from inside the surviving range without a gap [189.52ms]
@bryance/orch test: (pass) orchd RPC replay buffer > reports a gap when the requested sequence predates retained history [233.18ms]
@bryance/orch test: (pass) orchd RPC replay buffer > empty history has no gap or oldest sequence [137.72ms]
@bryance/orch test: (pass) orchd RPC replay buffer > limits replay size without pruning durable events [6454.53ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-transport-parity.test.ts:
@bryance/orch test: (pass) both transports carry one mechanism > the same token registers the same session whichever transport carried it [2104.77ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc-identity.test.ts:
@bryance/orch test: (pass) daemon identity RPCs > claim-identity refuses an unknown id by naming it [854.72ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lease.test.ts:
@bryance/orch test: {"outcome":"answer","reason":"no-environment-role","text":"this pane environment does not provide abort"}
@bryance/orch test: {"closed":["si66r6z3a8"],"results":[{"target":"si66r6z3a8","handle":"close-handle","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
@bryance/orch test: {"target":"7v30p4w0lr","name":"reap-worker","reaped":true}
@bryance/orch test: (pass) lease commands > a LIVE foreign holder still excludes everyone else [1978.29ms]
@bryance/orch test: (pass) lease commands > adopt takes an unleased agent and a dead holder [228.90ms]
@bryance/orch test: (pass) lease commands > adopt refuses a holder with a live recorded process [2108.87ms]
@bryance/orch test: (pass) lease commands > reap refuses when a live descendant exists, regardless of lease [259.55ms]
@bryance/orch test: (pass) lease commands > reap refuses while the recorded process is alive [2076.47ms]
@bryance/orch test: (pass) lease commands > reap is never lease-gated and removes the record and presence [254.35ms]
@bryance/orch test: (pass) lease commands > abort proceeds with a foreign live-holder lease [1366.44ms]
@bryance/orch test: (pass) lease commands > close proceeds with a foreign live-holder lease [1290.35ms]
@bryance/orch test: (pass) lease commands > reap proceeds with a foreign live-holder lease [1194.44ms]
@bryance/orch test: (pass) lease commands > reset driving verb refuses a foreign live-holder lease [1621.26ms]
@bryance/orch test: 
@bryance/orch test: integration\daemon-registration.test.ts:
@bryance/orch test: (pass) machine daemon registration > refuses a second start and names the live socket [3527.90ms]
@bryance/orch test: 
@bryance/orch test: integration\os-executors.test.ts:
@bryance/orch test: (pass) cross-OS execution is a backend, not a peer daemon > an OS side with no executor answers, and never runs the body [0.41ms]
@bryance/orch test: (pass) cross-OS execution is a backend, not a peer daemon > the local side runs the body and hands back its value [0.16ms]
@bryance/orch test: (pass) cross-OS execution is a backend, not a peer daemon > doctor passes a daemon registered on the side orch is running on [3876.86ms]
@bryance/orch test: (pass) cross-OS execution is a backend, not a peer daemon > doctor answers, rather than failing, for a daemon on a side with no executor [2452.31ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc-identity.test.ts:
@bryance/orch test: (pass) daemon identity RPCs > register-session mints one id per session token [1708.66ms]
@bryance/orch test: (pass) daemon identity RPCs > the removed method is unknown [10.91ms]
@bryance/orch test: 
@bryance/orch test: test\backend-process-role.test.ts:
@bryance/orch test: (pass) ProcessRole > herdr provider records pid and start token and safely kills it [2887.47ms]
@bryance/orch test: (pass) ProcessRole > tmux provider records pid and start token and safely kills it [2242.05ms]
@bryance/orch test: (pass) ProcessRole > reports replaced when a pid is reused by a different process token [0.33ms]
@bryance/orch test: 
@bryance/orch test: test\peer-lease-visibility.test.ts:
@bryance/orch test: (pass) peer summaries carry ownership as a lease > a peer nobody ever took reports no orch driving it [1297.01ms]
@bryance/orch test: (pass) peer summaries carry ownership as a lease > a dead holder is not a live one [1101.67ms]
@bryance/orch test: (pass) the compact listing separates orphans from live work > unleased peers sit in their own bucket, below the driven ones [2171.99ms]
@bryance/orch test: (pass) the compact listing separates orphans from live work > a held peer names its holder, and an unleased one never reads as yours [1681.62ms]
@bryance/orch test: (pass) the compact listing separates orphans from live work > with nothing unleased the bucket does not appear at all [1668.01ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc.test.ts:
@bryance/orch test: (pass) daemon RPC > hello translates an absent daemon instead of reading a missing token [5040.60ms]
@bryance/orch test: 
@bryance/orch test: integration\settings-command.test.ts:
@bryance/orch test: fleet.max_depth = 6
@bryance/orch test: (pass) orch settings > every registered setting is printed in the table [422.52ms]
@bryance/orch test: (pass) orch settings > --json reports value + source per setting, settings.json winning over defaults [427.25ms]
@bryance/orch test: (pass) orch settings > --json reports env as the winning source over settings.json [358.39ms]
@bryance/orch test: (pass) orch settings > --harness switches defaults.adapter between enabled ids and rejects a non-enabled id [1492.01ms]
@bryance/orch test: (pass) orch settings > reports each harness's picker quicklist and launch gate as separate rows [399.98ms]
@bryance/orch test: (pass) orch settings > a load error surfaces loudly with no partial table [354.44ms]
@bryance/orch test: (pass) orch settings > sets a boolean through its registry entry [344.43ms]
@bryance/orch test: (pass) orch settings > sets an integer through its registry entry [373.51ms]
@bryance/orch test: (pass) orch settings > single-setting set delegates to the registry writer [22.54ms]
@bryance/orch test: (pass) orch settings > sets a choice through its registry entry [315.35ms]
@bryance/orch test: (pass) orch settings > sets a multi value through its registry entry [318.11ms]
@bryance/orch test: (pass) orch settings > sets a list value through its registry entry [378.28ms]
@bryance/orch test: (pass) orch settings > refuses an invalid boolean and names the allowed values [323.78ms]
@bryance/orch test: (pass) orch settings > refuses an invalid integer and names the allowed range [385.23ms]
@bryance/orch test: (pass) orch settings > refuses an invalid choice and names the allowed choices [239.64ms]
@bryance/orch test: (pass) orch settings > refuses an invalid multi value and names the allowed choices [278.42ms]
@bryance/orch test: (pass) orch settings > refuses an invalid list and names JSON as the allowed format [293.47ms]
@bryance/orch test: (pass) orch settings > refuses an unknown key and suggests nearest valid keys [306.00ms]
@bryance/orch test: (pass) orch settings > refuses read-only runtime and names the editing subcommand [407.94ms]
@bryance/orch test: 
@bryance/orch test: integration\doctor-settings-defects.test.ts:
@bryance/orch test: (pass) doctor settings defects > accepts a clean settings file and keeps its path detail [17.52ms]
@bryance/orch test: (pass) doctor settings defects > reports malformed JSON as a file defect [4.67ms]
@bryance/orch test: (pass) doctor settings defects > reports a read failure instead of throwing [4.22ms]
@bryance/orch test: (pass) doctor settings defects > reports a stale key with the value that was written [28.50ms]
@bryance/orch test: (pass) doctor settings defects > reports a typo with its suggested key [8.28ms]
@bryance/orch test: (pass) doctor settings defects > reports the expected schema version [7.53ms]
@bryance/orch test: (pass) doctor settings defects > skips settings-dependent checks with a short repair hint [6244.74ms]
@bryance/orch test: 
@bryance/orch test: integration\doctor-stale-presence.test.ts:
@bryance/orch test: (pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [5200.15ms]
@bryance/orch test: (fail) doctor stale presence safety > no dead agents leaves nothing to remove [5854.78ms]
@bryance/orch test:   ^ this test timed out after 5000ms.
@bryance/orch test: 
@bryance/orch test: integration\doctor-orphan-daemons.test.ts:
@bryance/orch test: (pass) doctor orphaned-daemon check > a live foreign lock is reported, and an unproven owner is never killable [6114.54ms]
@bryance/orch test: 
@bryance/orch test: integration\doctor-settings-preservation.test.ts:
@bryance/orch test: (pass) doctor settings preservation > yes mode leaves existing settings.json byte-identical [6566.10ms]
@bryance/orch test: 
@bryance/orch test: integration\doctor-declared-vs-reality.test.ts:
@bryance/orch test: (pass) doctor declared-vs-reality > reports a lease whose recorded holder process is dead [274.64ms]
@bryance/orch test: (pass) doctor declared-vs-reality > reports an environment handle missing from its plexer [208.74ms]
@bryance/orch test: (pass) doctor declared-vs-reality > reports a live agent with no lease and no live spawner [201.98ms]
@bryance/orch test: (pass) doctor declared-vs-reality > surfaces a missing task scope row as unrunnable [5718.45ms]
@bryance/orch test: (pass) doctor declared-vs-reality > doctor -y does not delete an unrunnable task [5803.09ms]
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
@bryance/orch test:   add       @remix-run/dev       Add a dependency to package.json (bun a)
@bryance/orch test:   remove    left-pad             Remove a dependency from package.json (bun rm)
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
@bryance/orch test: (pass) daemon lifecycle > reexecs with the current argv and hands over the lock [1097.25ms]
@bryance/orch test: (pass) daemon lifecycle > rejects a recycled pid identity [3058.14ms]
@bryance/orch test: (pass) daemon lifecycle > foreign machine registration cannot be signalled for another store [2190.78ms]
@bryance/orch test: (pass) daemon lifecycle > only a provable lock owner may be signalled [2147.90ms]
@bryance/orch test: (pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [27.65ms]
@bryance/orch test: 
@bryance/orch test: test\broker-governance.test.ts:
@bryance/orch test: (pass) daemon governWrite enforcement > an unscoped actor may write to an unleased target [206.91ms]
@bryance/orch test: (pass) daemon governWrite enforcement > the lease holder may write to its own agent [1986.03ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a foreign live holder in the same space is refused and named [2140.96ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a dead holder is not a collision [1134.41ms]
@bryance/orch test: (pass) daemon governWrite enforcement > --steal on a driving verb does not take a live holder's lease [2223.76ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a cross-space write is refused by the wall before the lease [1062.55ms]
@bryance/orch test: (pass) daemon governWrite enforcement > --cross-space clears the wall but the lease still applies [1672.75ms]
@bryance/orch test: (pass) daemon governWrite enforcement > the space operator writes to a same-space leased agent without taking the lease [1647.32ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a foreign space's operator still hits the wall [840.11ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a refused enqueue leaves the lease exactly as it was [1587.92ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a granted write and its enqueue commit together [1377.38ms]
@bryance/orch test: (pass) daemon governWrite enforcement > an unleased target is writable by any same-space actor [88.46ms]
@bryance/orch test: 
@bryance/orch test: test\lease-authority.test.ts:
@bryance/orch test: (pass) C3 foreign agents are untouchable > a DEAD foreign holder is not a collision [2242.03ms]
@bryance/orch test: (pass) C3 foreign agents are untouchable > the composed holder IS the open lease, with nothing beside it [1173.06ms]
@bryance/orch test: (pass) C4 steal > adopt refuses a live holder, and --steal takes it [1969.03ms]
@bryance/orch test: (pass) C4 steal > detach refuses a live holder, and --steal releases it [1815.33ms]
@bryance/orch test: (pass) C4a fencing token > lease ids are monotonic across handoff and adoption [121.19ms]
@bryance/orch test: (pass) C4a fencing token > a stale fence cannot release the current holder's lease [121.56ms]
@bryance/orch test: (pass) C4a fencing token > openLeaseId is null when nothing is leased [89.26ms]
@bryance/orch test: (pass) C4b reads are never gated > status and events read straight through a live foreign lease [1541.08ms]
@bryance/orch test: (pass) C4c/C4d name resolution > duplicate names are legal and an ambiguous target asks for the id [98.96ms]
@bryance/orch test: (pass) C4c/C4d name resolution > a unique name resolves, and an unknown target is a lookup miss [102.23ms]
@bryance/orch test: (pass) C4e naming at creation > a nameless spawn is refused [0.70ms]
@bryance/orch test: (pass) C4e naming at creation > a self-registering session gets <harness>-<first 8 of its id> [105.05ms]
@bryance/orch test: (pass) C4f self-rename > an agent renames itself whether or not a lease is in force [823.06ms]
@bryance/orch test: (pass) C4f self-rename > renaming another agent is driving and obeys the lease [1448.26ms]
@bryance/orch test: (pass) C4f self-rename > an invalid name is refused [79.80ms]
@bryance/orch test: (pass) C5 a transfer does not disturb the agent > adoption writes lease rows and touches nothing else [718.56ms]
@bryance/orch test: (pass) C7 live by lease, history by provenance > adoption moves the live view and leaves provenance untouched [659.48ms]
@bryance/orch test: 
@bryance/orch test: integration\owner-scoping.test.ts:
@bryance/orch test: skipping caller: unknown backend null (reaping the record)
@bryance/orch test: skipping other: unknown backend null (reaping the record)
@bryance/orch test: {"closed":["caller","klmine0001","klforeign1","other"],"results":[{"target":"caller","handle":null,"outcome":"done","error":null},{"target":"klmine0001","handle":"mine","outcome":"done","error":null},{"target":"klforeign1","handle":"foreign","outcome":"done","error":null},{"target":"other","handle":null,"outcome":"done","error":null}],"requested":4,"ok":4,"stream":false}
@bryance/orch test: (pass) fleet ownership scoping > owner token uses ORCH_OWNER, else this process's own minted id [2.84ms]
@bryance/orch test: (pass) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [123.96ms]
@bryance/orch test: (pass) fleet ownership scoping > close --all works without an owner token [494.19ms]
@bryance/orch test: (pass) fleet ownership scoping > close --all closes all managed records regardless of owner [200.06ms]
@bryance/orch test: (pass) fleet ownership scoping > driving verbs remain gated against a live foreign holder [5262.98ms]
@bryance/orch test: (pass) fleet ownership scoping > result refuses a foreign-owned agent and names its owner [835.00ms]
@bryance/orch test: (pass) fleet ownership scoping > pane mutations refuse a foreign-owned agent and name its owner [1320.37ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc.test.ts:
@bryance/orch test: (pass) daemon RPC > an unreachable agent yields a boundary answer, and the outbox is not left pending [6933.37ms]
@bryance/orch test: (pass) daemon RPC > round-trips a call over the real unix socket [16.66ms]
@bryance/orch test: 
@bryance/orch test: integration\owner-scoping.test.ts:
@bryance/orch test: {"closed":["kmismatch1"],"results":[{"target":"kmismatch1","handle":"{\"pid\":27952,\"key\":\"kmismatch1\"}","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
@bryance/orch test: (pass) fleet ownership scoping > close has no force option and remains unconditional without it [1659.22ms]
@bryance/orch test: (pass) fleet ownership scoping > close cleans up a mismatched recorded process without signalling [638.83ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc.test.ts:
@bryance/orch test: (pass) daemon RPC > issues one session identity to sequential invocations from one session [1078.94ms]
@bryance/orch test: (pass) daemon RPC > hello returns live agents whose newest lease is closed or absent [1130.18ms]
@bryance/orch test: 
@bryance/orch test: integration\owner-scoping.test.ts:
@bryance/orch test: (pass) a spawned agent touches only what it spawned > a spawned agent acts as its own minted id, not its launch key [1.44ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > --cross-space from a spawned agent is refused [305.93ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > close --all from an AGENT sweeps only its own subtree [323.83ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > close --all from the HUMAN sweeps every managed spawn, whoever spawned it [405.82ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > close from a spawned agent is REFUSED when the target is not its own [319.24ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > close from a spawned agent SUCCEEDS on a slave it spawned itself [364.47ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > the workspace operator keeps control of an agent-owned fleet [352.90ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc.test.ts:
@bryance/orch test: (pass) daemon RPC > hello returns an empty unleased list when none exist [562.96ms]
@bryance/orch test: 
@bryance/orch test: integration\daemon-registration.test.ts:
@bryance/orch test: (pass) machine daemon registration > the refusal a second start prints names the live daemon's pid [2991.72ms]
@bryance/orch test: (pass) machine daemon registration > doctor names both when a second daemon is live beside the registered one [2216.74ms]
@bryance/orch test: (pass) machine daemon registration > evicts a registration whose process instance no longer matches [1795.18ms]
@bryance/orch test: (pass) machine daemon registration > routes a different orch dir to its own runtime files [1515.83ms]
@bryance/orch test: (pass) machine daemon registration > doctor distinguishes registered-but-dead from live-and-registered [2416.02ms]
@bryance/orch test: 
@bryance/orch test: integration\doctor-orphan-daemons.test.ts:
@bryance/orch test: (fail) doctor orphaned-daemon check > a dead pid's lock is not an orphan [5102.62ms]
@bryance/orch test:   ^ this test timed out after 5000ms.
@bryance/orch test: (pass) doctor orphaned-daemon check > the caller's own orch dir is never reported against itself [2426.97ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc.test.ts:
@bryance/orch test: (pass) daemon RPC > a TCP hello with the daemon token gets an identity [946.14ms]
@bryance/orch test: (pass) daemon RPC > refuses a hello that reports no session pid [12.54ms]
@bryance/orch test: (pass) daemon RPC > refuses a hello without its environment [12.79ms]
@bryance/orch test: (pass) daemon RPC > same session pid keeps its id and a different session pid gets another [1391.67ms]
@bryance/orch test: (pass) daemon RPC > refuses a TCP hello without a token [10.34ms]
@bryance/orch test: (pass) daemon RPC > refuses a TCP hello with a wrong token [9.13ms]
@bryance/orch test: (pass) daemon RPC > writes the daemon token with owner-only permissions [13.22ms]
@bryance/orch test: (pass) daemon RPC > returns an error for an unknown method [10.41ms]
@bryance/orch test: (pass) daemon RPC > reports malformed lines and keeps the connection alive [19.96ms]
@bryance/orch test: (pass) daemon RPC > delivers pushed subscription events [86.14ms]
@bryance/orch test: (pass) daemon RPC > replays durable events after a daemon restart without a gap [344.64ms]
@bryance/orch test: (pass) daemon RPC > reports the oldest sequence when replay starts before the pruned window [75.25ms]
@bryance/orch test: (pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [1361.39ms]
@bryance/orch test: (pass) daemon RPC > has a catchable absent-daemon error [1.06ms]
@bryance/orch test: (pass) daemon RPC > calls a slow daemon unreachable, not absent [112.52ms]
@bryance/orch test: (pass) daemon RPC > calls a refused endpoint absent so a wedged daemon is still reclaimable [6.44ms]
@bryance/orch test: 
@bryance/orch test: integration\doctor.test.ts:
@bryance/orch test: killed 1 dangling process
@bryance/orch test: killed 1 dangling process
@bryance/orch test: (fail) runDoctor > runs on an unconfigured install without failing for want of settings.json [6825.21ms]
@bryance/orch test:   ^ this test timed out after 5000ms.
@bryance/orch test: (fail) runDoctor > checks a healthy store [5635.00ms]
@bryance/orch test:   ^ this test timed out after 5000ms.
@bryance/orch test: (pass) runDoctor > warns when the store is absent [0.91ms]
@bryance/orch test: (pass) runDoctor > fails when the store predates orch's migrations [78.60ms]
@bryance/orch test: (pass) runDoctor > fails and names a missing store table [110.63ms]
@bryance/orch test: (pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [2462.23ms]
@bryance/orch test: (pass) runDoctor > reports an absent daemon as optional [2099.45ms]
@bryance/orch test: (pass) runDoctor > reports and fixes a stale daemon lock [2169.04ms]
@bryance/orch test: (pass) runDoctor > accepts a live daemon and an answerable socket [4290.00ms]
@bryance/orch test: (pass) runDoctor > warns when the live daemon code hash is stale [2053.54ms]
@bryance/orch test: (pass) runDoctor > fails on an invalid lock and an unanswerable live socket [3979.39ms]
@bryance/orch test: (pass) runDoctor > warns when the extension bundle is absent for a matching live hash [11.20ms]
@bryance/orch test: (pass) runDoctor > warns when the extension bundle is absent for a stale live hash [7.49ms]
@bryance/orch test: (pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [8.71ms]
@bryance/orch test: (pass) runDoctor > reports a dead presence pid [1974.48ms]
@bryance/orch test: (pass) runDoctor > bins check is driven by the enabled set and offers no fix [401.97ms]
@bryance/orch test: (pass) runDoctor > applyFixes reports exactly the changes it applies [2.86ms]
@bryance/orch test: (fail) runDoctor > validates configured notifier adapters [6105.85ms]
@bryance/orch test:   ^ this test timed out after 5000ms.
@bryance/orch test: (pass) runDoctor > reports invalid settings and accepts missing settings [4040.64ms]
@bryance/orch test: (pass) runDoctor > never throws when individual checks encounter broken inputs [4037.76ms]
@bryance/orch test: 
@bryance/orch test: 4 tests skipped:
@bryance/orch test: (skip) the token file is the whole credential > the token is 0600
@bryance/orch test: (skip) the token file is the whole credential > $ORCH_DIR is 0700, so same-uid is a boundary the filesystem enforces
@bryance/orch test: (skip) the token file is the whole credential > a token left loose by an earlier run is tightened, not trusted
@bryance/orch test: (skip) the token file is the whole credential > a runtime directory the daemon creates is 0700 too
@bryance/orch test: 
@bryance/orch test: 
@bryance/orch test: 5 tests failed:
@bryance/orch test: (fail) doctor stale presence safety > no dead agents leaves nothing to remove [5854.78ms]
@bryance/orch test:   ^ this test timed out after 5000ms.
@bryance/orch test: (fail) doctor orphaned-daemon check > a dead pid's lock is not an orphan [5102.62ms]
@bryance/orch test:   ^ this test timed out after 5000ms.
@bryance/orch test: (fail) runDoctor > runs on an unconfigured install without failing for want of settings.json [6825.21ms]
@bryance/orch test:   ^ this test timed out after 5000ms.
@bryance/orch test: (fail) runDoctor > checks a healthy store [5635.00ms]
@bryance/orch test:   ^ this test timed out after 5000ms.
@bryance/orch test: (fail) runDoctor > validates configured notifier adapters [6105.85ms]
@bryance/orch test:   ^ this test timed out after 5000ms.
@bryance/orch test: 
@bryance/orch test:  1553 pass
@bryance/orch test:  4 skip
@bryance/orch test:  5 fail
@bryance/orch test:  7107 expect() calls
@bryance/orch test: Ran 1562 tests across 243 files. [56.95s]
@bryance/orch test: Exited with code 1
error: script "test:orch" exited with code 1
