$ bun --filter @bryance/orch test
@bryance/orch test: bun test v1.4.0 (34cbb9a40) 24x PARALLEL
@bryance/orch test: 
@bryance/orch test: test\a-backend-exposes-each-operation-once.test.ts:
@bryance/orch test: (pass) a backend exposes each operation exactly once (2.2) > herdr publishes no operation beside the role that owns it [0.14ms]
@bryance/orch test: (pass) a backend exposes each operation exactly once (2.2) > tmux publishes no operation beside the role that owns it [0.03ms]
@bryance/orch test: (pass) a backend exposes each operation exactly once (2.2) > headless publishes no operation beside the role that owns it [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\plexer-versions.test.ts:
@bryance/orch test: (pass) plexer version support > a floor admits every version at or above it [0.64ms]
@bryance/orch test: 
@bryance/orch test: test\notify-ding.test.ts:
@bryance/orch test: (pass) notify/ding > the sound sink is a declared sink that takes no configuration [0.54ms]
@bryance/orch test: (pass) notify/ding > this host names the players it would use, and says how to get one [0.40ms]
@bryance/orch test: (pass) notify/ding > a command string runs through the host's own shell; argv is passed through untouched [0.12ms]
@bryance/orch test: 
@bryance/orch test: test\settings-manager.test.ts:
@bryance/orch test: (pass) settings manager > currentOrNull returns null and current reports an absent file [15.51ms]
@bryance/orch test: 
@bryance/orch test: test\one-shape-only.test.ts:
@bryance/orch test: (pass) one current shape only > a live presence record with a malformed identity is a doctor failure [12.54ms]
@bryance/orch test: (pass) one current shape only > doctor backend reports have one detection spelling [17.78ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-unscoped-tasks.test.ts:
@bryance/orch test: (pass) doctor task scopes > a facade-enqueued task has exactly one typed scope [147.35ms]
@bryance/orch test: 
@bryance/orch test: test\notify-event.test.ts:
@bryance/orch test: (pass) notify events > accepts every event member [32.54ms]
@bryance/orch test: (pass) notify events > rejects invalid event shapes [1.73ms]
@bryance/orch test: (pass) notify events > reads agent state only from state events [0.09ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-idle.test.ts:
@bryance/orch test: (pass) orchd idle shutdown rule > a zero setting disables idle shutdown entirely [0.16ms]
@bryance/orch test: (pass) orchd idle shutdown rule > a live agent holds the daemon open however long it has been quiet [0.05ms]
@bryance/orch test: (pass) orchd idle shutdown rule > an event subscriber holds the daemon open [0.08ms]
@bryance/orch test: (pass) orchd idle shutdown rule > recent activity holds the daemon open below the threshold [0.07ms]
@bryance/orch test: (pass) orchd idle shutdown rule > a fully idle daemon past the threshold is due to exit [0.04ms]
@bryance/orch test: 
@bryance/orch test: test\settings-watch.test.ts:
@bryance/orch test: (pass) watchSettings > loads initially and applies a valid edit after the debounce [63.99ms]
@bryance/orch test: 
@bryance/orch test: test\outbox.test.ts:
@bryance/orch test: (pass) outbox delivery > selects pending messages and delivers each message once [163.13ms]
@bryance/orch test: 
@bryance/orch test: test\dispatch-channel-first.test.ts:
@bryance/orch test: (pass) work reaches an agent through its link > a headless agent receives a dispatch through the link [216.64ms]
@bryance/orch test: 
@bryance/orch test: test\agent-view.test.ts:
@bryance/orch test: (pass) the agent composer > an agent with no environment rows has every axis absent, not defaulted [211.76ms]
@bryance/orch test: 
@bryance/orch test: test\notify-events-format.test.ts:
@bryance/orch test: (pass) notification and presence event formatting > spaceColor is stable and returns a palette hex [0.25ms]
@bryance/orch test: 
@bryance/orch test: test\settings-manager.test.ts:
@bryance/orch test: (pass) settings manager > parses valid fixture text [16.84ms]
@bryance/orch test: (pass) settings manager > holds one parsed object until reload [3.26ms]
@bryance/orch test: (pass) settings manager > does not cache malformed text as a value [4.29ms]
@bryance/orch test: (pass) settings manager > reloads file settings after the file changes [22.14ms]
@bryance/orch test: (pass) settings manager > update > file manager lands text and current reflects it without reload [22.65ms]
@bryance/orch test: (pass) settings manager > update > in-memory manager lands text and current reflects it [1.57ms]
@bryance/orch test: (pass) settings manager > update > removes a stale lock before updating [38.68ms]
@bryance/orch test: (pass) settings manager > update > refuses a held lock and leaves settings and lock untouched [36.47ms]
@bryance/orch test: (pass) settings manager > reports a legacy config.toml [8.70ms]
@bryance/orch test: 
@bryance/orch test: test\commands-setup.test.ts:
@bryance/orch test: (pass) commands/setup > reads the setup flags in either spelling, with every --model kept in order [0.96ms]
@bryance/orch test: 
@bryance/orch test: test\queue-scope.test.ts:
@bryance/orch test: (pass) queue scope invariants > a failed pack task retries on another pack member, while an agent task stays pinned [217.43ms]
@bryance/orch test: 
@bryance/orch test: test\plexer-versions.test.ts:
@bryance/orch test: (pass) plexer version support > compares numeric versions rather than lexical strings [0.05ms]
@bryance/orch test: (pass) plexer version support > rotates one open host install row when the plexer changes version [193.33ms]
@bryance/orch test: (pass) plexer version support > doctor names both versions and tells the operator to update the plexer [0.45ms]
@bryance/orch test: (pass) plexer version support > a supported plexer the user never installed is not a complaint [0.06ms]
@bryance/orch test: (pass) plexer version support > an in-range install reports ok with the version it read [0.10ms]
@bryance/orch test: (pass) plexer version support > a compatible server rides along on the row without complaint [0.06ms]
@bryance/orch test: (pass) plexer version support > a server the installed client outgrew fails and names the restart [0.05ms]
@bryance/orch test: (pass) plexer version support > a server that reports no compatibility is unknown, never a failure [0.04ms]
@bryance/orch test: (pass) plexer version support > a plexer with no server running says nothing about one [0.08ms]
@bryance/orch test: (pass) plexer version support > only an installed plexer that cannot report a version warns [0.04ms]
@bryance/orch test: 
@bryance/orch test: test\port-has-no-shell.test.ts:
@bryance/orch test: (pass) the backend port has no dead workspace shell > backend types contain neither deleted declaration [0.22ms]
@bryance/orch test: 
@bryance/orch test: test\claim-agent.test.ts:
@bryance/orch test: (pass) claim agent > unclaimed + A ΓåÆ stamped [205.42ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-limits.test.ts:
@bryance/orch test: (pass) spawn limits > schema loads global and workspace caps [30.20ms]
@bryance/orch test: 
@bryance/orch test: test\retention.test.ts:
@bryance/orch test: (pass) retention sweep > retention windows are independently configurable [214.06ms]
@bryance/orch test: 
@bryance/orch test: test\a-row-is-not-a-pane.test.ts:
@bryance/orch test: (pass) a row is not evidence that a pane exists (U1, U4) > a recorded handle the plexer does not list is reported as NO pane [287.20ms]
@bryance/orch test: 
@bryance/orch test: test\store-outbox.test.ts:
@bryance/orch test: (pass) outbox store rows > inserts pending messages and orders them by creation time [189.03ms]
@bryance/orch test: 
@bryance/orch test: test\port-has-no-shell.test.ts:
@bryance/orch test: (pass) the backend port has no dead workspace shell > src contains no workspaceNames calls or BackendWorkspace references [29.68ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-hud-environment.test.ts:
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > a herdr-placed agent reports the handle its environment carries [208.25ms]
@bryance/orch test: 
@bryance/orch test: test\port-no-optional-methods.test.ts:
@bryance/orch test: (pass) the environment port declares capability by composition, never by optionality > src/types/backend.ts has no optional methods on any port interface [0.65ms]
@bryance/orch test: (pass) the environment port declares capability by composition, never by optionality > the deleted capability flags bag is gone, not merely unimplemented [0.43ms]
@bryance/orch test: (pass) the environment port declares capability by composition, never by optionality > src/types/adapter.ts has no optional methods on the harness port either [0.63ms]
@bryance/orch test: 
@bryance/orch test: test\dispatch-channel-first.test.ts:
@bryance/orch test: (pass) work reaches an agent through its link > a capless adapter still gets the not-placed boundary answer [214.03ms]
@bryance/orch test: 
@bryance/orch test: test\settings-notify.test.ts:
@bryance/orch test: (pass) orch settings notify > records a sink with the field that sink declares [63.86ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lease.test.ts:
@bryance/orch test: (pass) lease commands > detach releases the lease and is a no-op when already unleased [215.79ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-link-server.test.ts:
@bryance/orch test: (pass) daemon bridge links > attaches, replies, notifies after the reply write, and pushes deliveries [251.95ms]
@bryance/orch test: 
@bryance/orch test: test\one-spelling-per-fact.test.ts:
@bryance/orch test: (pass) one spelling per shared fact > host OS and the store agree for an injected Windows platform [199.35ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-unscoped-tasks.test.ts:
@bryance/orch test: (pass) doctor task scopes > the database rejects an unscoped task instead of keeping a legacy queue row [177.02ms]
@bryance/orch test: (pass) doctor task scopes > doctor lists unrunnable tasks and deliberate resolutions without deleting [201.97ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-boundary.test.ts:
@bryance/orch test: (pass) port seam command boundary > headless target is answered without invoking its pane role [0.30ms]
@bryance/orch test: (pass) port seam command boundary > paned environment without a role is answered at the boundary [0.09ms]
@bryance/orch test: (pass) port seam command boundary > an invocation preserves the provider failure [0.21ms]
@bryance/orch test: 
@bryance/orch test: test\outbox.test.ts:
@bryance/orch test: (pass) outbox delivery > checks one message's pending state without scanning the outbox [194.13ms]
@bryance/orch test: (pass) outbox delivery > keeps failed messages pending until their backoff expires [152.94ms]
@bryance/orch test: 
@bryance/orch test: test\settings-watch.test.ts:
@bryance/orch test: (pass) watchSettings > keeps the last-good settings, warns once, and recovers [413.76ms]
@bryance/orch test: 
@bryance/orch test: test\notify-events-format.test.ts:
@bryance/orch test: (pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.50ms]
@bryance/orch test: (pass) notification and presence event formatting > named events prefer the human name over the harness id [0.05ms]
@bryance/orch test: (pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.10ms]
@bryance/orch test: (pass) notification and presence event formatting > message notification titles contain delivered mail text [0.05ms]
@bryance/orch test: (pass) notification and presence event formatting > webhook payload includes space and spaceColor [2.14ms]
@bryance/orch test: (pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [229.29ms]
@bryance/orch test: (pass) notification and presence event formatting > transitionEventFromRow composes the space from the agent's environment [156.06ms]
@bryance/orch test: 
@bryance/orch test: test\settings-watch.test.ts:
@bryance/orch test: (pass) watchSettings > reloads on a touched reload.signal without a settings edit [49.06ms]
@bryance/orch test: 
@bryance/orch test: test\dispatch-prompt-file.test.ts:
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > --file is parsed off the positionals [2.14ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-link-server.test.ts:
@bryance/orch test: (pass) daemon bridge links > a socket close detaches its bridge [191.08ms]
@bryance/orch test: 
@bryance/orch test: test\one-spelling-per-fact.test.ts:
@bryance/orch test: (pass) one spelling per shared fact > the shared record guard rejects arrays and null [2.54ms]
@bryance/orch test: (pass) one spelling per shared fact > removed identity method has no source spelling [27.40ms]
@bryance/orch test: (pass) one spelling per shared fact > settings reads have no literal fallbacks [25.01ms]
@bryance/orch test: (pass) one spelling per shared fact > launch env has one spelling [95.26ms]
@bryance/orch test: (pass) one spelling per shared fact > removed spawn cap has no source or README spelling [37.22ms]
@bryance/orch test: 
@bryance/orch test: test\dispatch-prompt-file.test.ts:
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > the file body is the prompt, apostrophes and newlines intact [24.96ms]
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > without --file the positionals after the target are the prompt [0.11ms]
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > a typed prompt and --file together is a refusal, never a silent winner [5.09ms]
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > an empty file is refused: a dispatch with no prompt is not a dispatch [1.85ms]
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > a missing file names itself in the refusal [0.49ms]
@bryance/orch test: (pass) --with points the agent at context it opens on demand > --with is repeatable and parsed off the positionals [0.14ms]
@bryance/orch test: (pass) --with points the agent at context it opens on demand > a file reference is absolute and typed as a file [2.55ms]
@bryance/orch test: (pass) --with points the agent at context it opens on demand > a directory reference is typed as a directory [4.79ms]
@bryance/orch test: (pass) --with points the agent at context it opens on demand > a missing path dies at dispatch, naming the flag [0.32ms]
@bryance/orch test: (pass) --with points the agent at context it opens on demand > the task tells the agent where to look and to open paths only when needed; content is never inlined [0.11ms]
@bryance/orch test: (pass) --with points the agent at context it opens on demand > no references leaves the instructions untouched [0.01ms]
@bryance/orch test: 
@bryance/orch test: test\commands-setup.test.ts:
@bryance/orch test: Selection recorded in C:\Users\Bryan\AppData\Local\Temp\orch-setup-characterization-Vts5XT\settings.json:
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
@bryance/orch test:   C:\Users\Bryan\AppData\Local\Temp\orch-setup-characterization-Vts5XT\agents
@bryance/orch test: Skills:
@bryance/orch test:   not installed - turn it back on with: orch settings skills --install
@bryance/orch test: bins:
@bryance/orch test:   C:\Users\Bryan\AppData\Local\Temp\orch-setup-home-dtYbz6\.local\bin\orch (copy)
@bryance/orch test:   C:\Users\Bryan\AppData\Local\Temp\orch-setup-home-dtYbz6\.local\bin\pif (copy)
@bryance/orch test:   C:\Users\Bryan\AppData\Local\Temp\orch-setup-home-dtYbz6\.local\bin\orch-ding (copy)
@bryance/orch test:   SKIP pi extensions: pi integration shim disabled
@bryance/orch test: Running doctor checks...
@bryance/orch test: Doctor: 31/35 checks passed
@bryance/orch test: Done. Open a plexer workspace and try: orch spawn 2 --tab Team1
@bryance/orch test: (pass) commands/setup > resolves noninteractive provider sets and defaults [0.53ms]
@bryance/orch test: (pass) commands/setup > runs non-interactive setup against the requested ORCH_DIR and records the selected composition [433.88ms]
@bryance/orch test: (pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.37ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-hud-environment.test.ts:
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > the handle follows the agent when it moves pane [194.90ms]
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > an agent on another plexer is not a herdr pane [176.00ms]
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > a process orch never launched is not a herdr pane [2.94ms]
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > a key that is not a minted id resolves to no pane at all [2.52ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-notify-busy.test.ts:
@bryance/orch test: (pass) a herdr notification is delivered only when herdr says it was shown > shown is a delivery [0.14ms]
@bryance/orch test: (pass) a herdr notification is delivered only when herdr says it was shown > busy is NOT a delivery, however herdr exited [0.02ms]
@bryance/orch test: (pass) a herdr notification is delivered only when herdr says it was shown > every other refusal herdr can answer with is also not a delivery [0.05ms]
@bryance/orch test: (pass) a herdr notification is delivered only when herdr says it was shown > output that is not a herdr answer is never read as a delivery [0.08ms]
@bryance/orch test: (pass) a busy herdr is waited out, not dropped > a toast shown on the first try is sent once and waits for nothing [0.15ms]
@bryance/orch test: (pass) a busy herdr is waited out, not dropped > a busy herdr is retried after a wait, and the retry is the delivery [0.05ms]
@bryance/orch test: (pass) a busy herdr is waited out, not dropped > a herdr that stays busy gives up rather than blocking the daemon forever [0.03ms]
@bryance/orch test: (pass) a busy herdr is waited out, not dropped > a refusal that waiting cannot fix is not retried [0.05ms]
@bryance/orch test: 
@bryance/orch test: test\notify-router.test.ts:
@bryance/orch test: (pass) notify router > delivers only when on includes the event state [0.42ms]
@bryance/orch test: (pass) notify router > passes typed webhook and command configuration [0.58ms]
@bryance/orch test: (pass) notify router > surfaces notifier errors [1.73ms]
@bryance/orch test: 
@bryance/orch test: test\a-row-is-not-a-pane.test.ts:
@bryance/orch test: (pass) a row is not evidence that a pane exists (U1, U4) > the agent itself is still there ΓÇö losing a pane costs a shortcut, not a life [244.71ms]
@bryance/orch test: (pass) a row is not evidence that a pane exists (U1, U4) > a handle the plexer DOES list is kept [195.16ms]
@bryance/orch test: 
@bryance/orch test: test\store-outbox.test.ts:
@bryance/orch test: (pass) outbox store rows > reports one message's pending state [170.24ms]
@bryance/orch test: (pass) outbox store rows > bumps attempts and hides a message until its next attempt time [134.77ms]
@bryance/orch test: (pass) outbox store rows > deletes delivered messages older than the cutoff [147.03ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-notify-hardening.test.ts:
@bryance/orch test: (pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [6.18ms]
@bryance/orch test: (pass) herdr and notification hardening > falls back to a valid name when the identity key contains herdr-invalid separators [1.19ms]
@bryance/orch test: (pass) herdr and notification hardening > nameless notifications use a space label, never a bare pane key [2.18ms]
@bryance/orch test: 
@bryance/orch test: test\doctor.test.ts:
@bryance/orch test: (pass) runDoctor > detects DrvFs paths by mount path segment [2.67ms]
@bryance/orch test: 
@bryance/orch test: test\hermetic-env.test.ts:
@bryance/orch test: (pass) the test suite is hermetic > no plexer environment leaks in from the shell that launched bun [0.74ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-backends.test.ts:
@bryance/orch test: (pass) doctor backend and presence checks > reports every registered backend and composed roles [29.60ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-link-server.test.ts:
@bryance/orch test: (pass) daemon bridge links > a second socket replaces the first link [207.97ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-backends.test.ts:
@bryance/orch test: (pass) doctor backend and presence checks > passes with herdr active while an enabled tmux sits outside a session [0.11ms]
@bryance/orch test: (pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.11ms]
@bryance/orch test: (pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [0.08ms]
@bryance/orch test: (pass) doctor backend and presence checks > fails when any enabled backend is unavailable, active or not [0.06ms]
@bryance/orch test: (pass) doctor backend and presence checks > honours the configured default over the probe order [0.04ms]
@bryance/orch test: (pass) doctor backend and presence checks > reports only records missing the current schema stamp [21.29ms]
@bryance/orch test: 
@bryance/orch test: test\notify-sinks.test.ts:
@bryance/orch test: (pass) notification entries > desktop entries use the canonical notifier registry [37.31ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-allowlist.test.ts:
@bryance/orch test: (pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [3.77ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.81ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.13ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.04ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.21ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.38ms]
@bryance/orch test: (pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.28ms]
@bryance/orch test: (pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.08ms]
@bryance/orch test: (pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.10ms]
@bryance/orch test: 
@bryance/orch test: test\claim-agent.test.ts:
@bryance/orch test: (pass) claim agent > claimed A, claim A ΓåÆ unchanged [175.43ms]
@bryance/orch test: (pass) claim agent > claimed A, reclaimAgent(id) then B ΓåÆ stamped with B [154.95ms]
@bryance/orch test: (pass) claim agent > claimed A, plain claim B ΓåÆ refused claimed-by-other, row unchanged [137.04ms]
@bryance/orch test: (pass) claim agent > unknown id ΓåÆ refused unknown-agent [118.89ms]
@bryance/orch test: 
@bryance/orch test: test\settings-notify.test.ts:
@bryance/orch test: (pass) orch settings notify > re-adding one sink replaces it in place and keeps the fields the call omits [107.07ms]
@bryance/orch test: (pass) orch settings notify > accepts asking as a first-class sink state [57.31ms]
@bryance/orch test: (pass) orch settings notify > remove drops only the named sink [128.87ms]
@bryance/orch test: (pass) orch settings notify > list reports each sink with the states it fires on, defaults included [89.73ms]
@bryance/orch test: (pass) orch settings notify > an empty notify array lists as none configured [5.67ms]
@bryance/orch test: (pass) orch settings notify > the notify row lists every sink, the states it may fire on, and the fields each carries [47.56ms]
@bryance/orch test: (pass) orch settings notify > the notify row writes the picked sinks, states included, and drops the ones left off [47.04ms]
@bryance/orch test: (pass) orch settings notify > the notify row refuses an unknown sink, a carrying sink with nothing to carry, and an unknown state [4.57ms]
@bryance/orch test: 
@bryance/orch test: test\notify.test.ts:
@bryance/orch test: (pass) notification routing > an excluded state does not invoke its notifier [1.03ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-bundle-diagnosis.test.ts:
@bryance/orch test: (pass) adapter bundle installation > reports a missing shipped bundle as a structured diagnosis [3.49ms]
@bryance/orch test: pi extensions:
@bryance/orch test: (pass) adapter bundle installation > diagnoses a missing shipped bundle without writing [6.69ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-link-server.test.ts:
@bryance/orch test: (pass) daemon bridge links > attach for an agent the store does not know is refused and the server keeps serving [177.23ms]
@bryance/orch test: (pass) daemon bridge links > attach without a key is rejected [23.83ms]
@bryance/orch test: 
@bryance/orch test: test\settings-watch.test.ts:
@bryance/orch test: (pass) watchSettings > stop prevents further callbacks [429.02ms]
@bryance/orch test: 
@bryance/orch test: test\store-queue.test.ts:
@bryance/orch test: (pass) queue facade storage > state is derived from attempts rather than stored on tasks [192.47ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: (pass) fleet ownership scoping > fleet visibility follows provenance depth, not caller environment [265.79ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-hardening.test.ts:
@bryance/orch test: (pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [55.46ms]
@bryance/orch test: 
@bryance/orch test: test\settings.test.ts:
@bryance/orch test: (pass) loadSettings > refuses to invent settings when settings.json is missing [40.64ms]
@bryance/orch test: 
@bryance/orch test: test\settings-precedence.test.ts:
@bryance/orch test: (pass) settings precedence > returns a defaults value when no override is set [69.28ms]
@bryance/orch test: 
@bryance/orch test: test\claude-adapter.test.ts:
@bryance/orch test: (pass) Claude adapter > declares its identity, and composes only the roles it fully implements [1.37ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-checks.test.ts:
@bryance/orch test: (pass) doctor provenance-depth checks > finds a live agent deeper than fleet.max_depth [215.49ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-lifecycle.test.ts:
@bryance/orch test: (pass) daemon lifecycle > acquires once and refuses a second live owner [929.79ms]
@bryance/orch test: 
@bryance/orch test: test\holder-death-costs-a-driver.test.ts:
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > the task in flight finishes and its result survives the holder [218.27ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-channel.test.ts:
@bryance/orch test: (pass) orch bridge links and capture roles > headless delivery reaches the link and the ack settles its outbox row [303.75ms]
@bryance/orch test: 
@bryance/orch test: test\lease-authority.test.ts:
@bryance/orch test: (pass) C3 foreign agents are untouchable > every driving verb is refused while a live foreign orch holds the lease [1047.34ms]
@bryance/orch test: 
@bryance/orch test: test\one-writer-records-a-spawned-agent.test.ts:
@bryance/orch test: (pass) one writer records a spawned agent (2.1) > registerSpawnedAgent alone writes the COMPLETE record ΓÇö space and lease included [268.57ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-hardening.test.ts:
@bryance/orch test: (pass) adapter and runtime hardening > rejects unknown settings keys with a useful path [50.18ms]
@bryance/orch test: (pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [17.98ms]
@bryance/orch test: (pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [5.54ms]
@bryance/orch test: 
@bryance/orch test: test\settings-precedence.test.ts:
@bryance/orch test: (pass) settings precedence > applies defaults when settings, env, and flag are absent [7.03ms]
@bryance/orch test: (pass) settings precedence > uses env over settings and flag over env [24.55ms]
@bryance/orch test: (pass) settings precedence > parses notify entries and hosts into expected shapes [39.79ms]
@bryance/orch test: (pass) settings precedence > reports a helpful validation error for invalid settings [14.19ms]
@bryance/orch test: 
@bryance/orch test: test\transfer-does-not-disturb.test.ts:
@bryance/orch test: (pass) a transfer touches the lease and nothing else > a handoff changes the holder and leaves every other fact identical [1052.48ms]
@bryance/orch test: 
@bryance/orch test: test\status-perf.test.ts:
@bryance/orch test: (pass) status performance seams > resolves orchestrator id once per status call [1053.97ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-link-server.test.ts:
@bryance/orch test: (pass) daemon bridge links > server close detaches every bridge [277.20ms]
@bryance/orch test: 
@bryance/orch test: test\settings-registry.test.ts:
@bryance/orch test: (pass) settings registry > declares every schema setting exactly once [3.08ms]
@bryance/orch test: 
@bryance/orch test: test\queue-scope.test.ts:
@bryance/orch test: (pass) queue scope invariants > cancel is allowed for the enqueuer or a lease holder of a targeted agent [197.45ms]
@bryance/orch test: (pass) queue scope invariants > cancel refuses a caller who is neither enqueuer nor targeted lease holder [150.37ms]
@bryance/orch test: (pass) queue scope invariants > edit is allowed only for the enqueuer while queued [137.14ms]
@bryance/orch test: (pass) queue scope invariants > an orphan has exactly take-on, leave, and reap resolutions [152.22ms]
@bryance/orch test: (pass) queue scope invariants > stale queued work is surfaced distinctly and never deleted by age [153.20ms]
@bryance/orch test: (pass) queue scope invariants > two concurrent claims have one winner and one one_open_attempt violation [285.54ms]
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
@bryance/orch test:   add       @remix-run/dev       Add a dependency to package.json (bun a)
@bryance/orch test:   remove    underscore           Remove a dependency from package.json (bun rm)
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
@bryance/orch test:   create    vite                 Create a new project from a template (bun c)
@bryance/orch test:   upgrade                        Upgrade to latest version of Bun.
@bryance/orch test: 
@bryance/orch test:   <command> --help               Print help text for command.
@bryance/orch test: 
@bryance/orch test: Learn more about Bun:            https://bun.com/docs
@bryance/orch test: Join our Discord community:      https://bun.com/discord
@bryance/orch test: (pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [26.61ms]
@bryance/orch test: (pass) daemon lifecycle > reclaims an unreadable lock, which a crash truncated and no daemon owns [67.46ms]
@bryance/orch test: (pass) daemon lifecycle > refuses an unreadable lock while the socket still answers [5.63ms]
@bryance/orch test: (pass) daemon lifecycle > clears the lock, socket and port a departed daemon owned, keeping the log [12.23ms]
@bryance/orch test: (pass) daemon lifecycle > refuses a stale lock when the socket probe cannot answer [17.62ms]
@bryance/orch test: (pass) daemon lifecycle > retries if a stale lock disappears during reclaim [21.55ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-model-flag.test.ts:
@bryance/orch test: (pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [0.12ms]
@bryance/orch test: (pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.11ms]
@bryance/orch test: (pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.06ms]
@bryance/orch test: (pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.11ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > pi interactive builders pass the quicklist as one quoted --models argument [0.15ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > pi headless builders pass the quicklist as one verbatim argv entry [0.12ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > pi omits --models cleanly for an absent or empty quicklist [0.15ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > pi keeps quicklist order and provider punctuation intact [0.09ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > omp interactive builders pass the quicklist as one quoted --models argument [0.09ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > omp headless builders pass the quicklist as one verbatim argv entry [0.03ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > omp omits --models cleanly for an absent or empty quicklist [0.18ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > omp keeps quicklist order and provider punctuation intact [0.02ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > a model outside the quicklist is still what the launch runs on [0.09ms]
@bryance/orch test: 
@bryance/orch test: test\status-renders-one-row-shape.test.ts:
@bryance/orch test: (pass) status rendering has one row shape and one table renderer > task and last text use the same spelling in the row and table cell [5.63ms]
@bryance/orch test: 
@bryance/orch test: test\claude-adapter.test.ts:
@bryance/orch test: (pass) Claude adapter > builds the interactive Claude launch command [0.48ms]
@bryance/orch test: (pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.36ms]
@bryance/orch test: (pass) Claude adapter > detects state from a live presence status [191.24ms]
@bryance/orch test: (pass) Claude adapter > extracts results before transcript and native output [29.55ms]
@bryance/orch test: (pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [13.19ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-pi.test.ts:
@bryance/orch test: (pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.39ms]
@bryance/orch test: 
@bryance/orch test: test\settings-registry.test.ts:
@bryance/orch test: (pass) settings registry > every registry read resolves against loaded settings [31.16ms]
@bryance/orch test: (pass) settings registry > fleet help explains what each limit counts [0.50ms]
@bryance/orch test: (pass) settings registry > fleet.max_depth round-trips through the full-tree writer [30.83ms]
@bryance/orch test: (pass) settings registry > fleet.max_depth rejects zero through the registered writer [7.18ms]
@bryance/orch test: (pass) settings registry > fleet.max_depth writes its value to settings.json [12.96ms]
@bryance/orch test: (pass) settings registry > retention.ended_agents_days is an integer that accepts none [1.05ms]
@bryance/orch test: (pass) settings registry > retention.ended_agents_days writes null and reads it back as null [31.30ms]
@bryance/orch test: (pass) settings registry > an integer without none refuses none [0.18ms]
@bryance/orch test: (pass) settings registry > contains no duplicate keys [0.46ms]
@bryance/orch test: 
@bryance/orch test: test\close-reports-every-target.test.ts:
@bryance/orch test: (pass) close reports an outcome for every target it was given (U2) > --json carries a per-target outcome, not just the successes [1215.14ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-roundtrip.test.ts:
@bryance/orch test: (pass) repairing a settings.json the schema rejects > reports every rejected key without touching the file [31.50ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-lifecycle.test.ts:
@bryance/orch test: (pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [256.93ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-links.test.ts:
@bryance/orch test: (pass) bridge links > attach holds the link under the canonical key and push reaches it [206.02ms]
@bryance/orch test: 
@bryance/orch test: test\claude-adapter.test.ts:
@bryance/orch test: (pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [231.51ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-roundtrip.test.ts:
@bryance/orch test: (pass) repairing a settings.json the schema rejects > a removed key is never guessed at - it offers no rename [6.42ms]
@bryance/orch test: (pass) repairing a settings.json the schema rejects > the choices a person makes leave the file loadable [52.06ms]
@bryance/orch test: (pass) repairing a settings.json the schema rejects > a typo keeps its value: renaming carries it to the real key [21.76ms]
@bryance/orch test: (pass) repairing a settings.json the schema rejects > leaving every defect alone writes nothing at all [10.46ms]
@bryance/orch test: 
@bryance/orch test: test\queue-space-replay.test.ts:
@bryance/orch test: (pass) queue replay keeps typed scope > stored scope offers pack work only to that pack [203.34ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-screen.test.ts:
@bryance/orch test: (pass) repair action labels > names the key a rename lands on, so the destination is never a guess [0.05ms]
@bryance/orch test: (pass) repair action labels > names the value a set writes [0.03ms]
@bryance/orch test: (pass) repair action labels > drop and leave say only what they do [0.01ms]
@bryance/orch test: (pass) repair frame > shows every defect with the value the person wrote [0.53ms]
@bryance/orch test: (pass) repair frame > promises that nothing changes before a save, because nothing does [0.06ms]
@bryance/orch test: (pass) repair frame > every defect starts at leave, so opening the screen destroys nothing [0.04ms]
@bryance/orch test: (pass) repair frame > a chosen repair is shown as what it will do [0.04ms]
@bryance/orch test: (pass) repair frame > the focused row's offered keys are shown, so no choice has to be guessed [0.09ms]
@bryance/orch test: (pass) repair frame > the count reads as English for one defect and for many [0.06ms]
@bryance/orch test: (pass) repair frame > no row runs past the terminal width, tag included [0.09ms]
@bryance/orch test: (pass) repair frame > the file being repaired is named in the header [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\close-reports-every-target.test.ts:
@bryance/orch test: (pass) close reports an outcome for every target it was given (U2) > a failed target reports outcome error WITH the real error text [242.58ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-pi.test.ts:
@bryance/orch test: (pass) PiAdapter > restricted workers explicitly load the bundled pi extension [0.35ms]
@bryance/orch test: (pass) PiAdapter > declares its lifecycle slash-commands [0.12ms]
@bryance/orch test: (pass) PiAdapter > reads state from the presence status through store helpers [205.66ms]
@bryance/orch test: (pass) PiAdapter > reads the reported result and falls back to the last assistant session text [22.11ms]
@bryance/orch test: (pass) PiAdapter > parses pi's supported model table without importing harness internals [0.49ms]
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
@bryance/orch test:   create    elysia               Create a new project from a template (bun c)
@bryance/orch test:   upgrade                        Upgrade to latest version of Bun.
@bryance/orch test: 
@bryance/orch test:   <command> --help               Print help text for command.
@bryance/orch test: 
@bryance/orch test: Learn more about Bun:            https://bun.com/docs
@bryance/orch test: Join our Discord community:      https://bun.com/discord
@bryance/orch test: (pass) daemon lifecycle > reexecs with the current argv and hands over the lock [37.97ms]
@bryance/orch test: (pass) daemon lifecycle > rejects a recycled pid identity [31.53ms]
@bryance/orch test: (pass) daemon lifecycle > foreign machine registration cannot be signalled for another store [21.00ms]
@bryance/orch test: (pass) daemon lifecycle > only a provable lock owner may be signalled [44.96ms]
@bryance/orch test: (pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [25.48ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-write.test.ts:
@bryance/orch test: (pass) applySettingsRepairs > rename carries the value to the new key [40.32ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-roles.test.ts:
@bryance/orch test: (pass) adapter role composition > composes complete roles per adapter [0.22ms]
@bryance/orch test: (pass) adapter role composition > answers with zero exit code when a shim role is absent [0.08ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-limits.test.ts:
@bryance/orch test: (pass) spawn limits > rejects invalid cap %s with file and key [6.23ms]
@bryance/orch test: (pass) spawn limits > rejects invalid cap %s with file and key [13.29ms]
@bryance/orch test: (pass) spawn limits > rejects invalid cap %s with file and key [11.53ms]
@bryance/orch test: (pass) spawn limits > omitted fleet caps normalize to defaults [7.57ms]
@bryance/orch test: (pass) spawn limits > global boundary refusal data counts the whole request [297.80ms]
@bryance/orch test: (pass) spawn limits > one workspace may use the full global allotment [190.32ms]
@bryance/orch test: (pass) spawn limits > workspace cap is independent of global headroom [147.71ms]
@bryance/orch test: (pass) spawn limits > uncapped space is bounded only by global count [218.60ms]
@bryance/orch test: (pass) spawn limits > foreign pack members do not consume the caller's pack cap [218.00ms]
@bryance/orch test: (pass) spawn limits > an agent whose recorded process is gone frees capacity [187.29ms]
@bryance/orch test: (pass) spawn limits > foreign panes never count [217.86ms]
@bryance/orch test: (pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [11.70ms]
@bryance/orch test: (pass) spawn limits > doctor accepts satisfiable limits [6.46ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-session-env.test.ts:
@bryance/orch test: (pass) adapter-owned session environment > resolves each caller harness through the public session resolver [0.86ms]
@bryance/orch test: (pass) adapter-owned session environment > keeps harness env literals inside adapter modules [20.39ms]
@bryance/orch test: (pass) adapter-owned session environment > a registered adapter resolves a novel marker without resolver changes [0.50ms]
@bryance/orch test: 
@bryance/orch test: test\close-reports-every-target.test.ts:
@bryance/orch test: (pass) close reports an outcome for every target it was given (U2) > a pane the plexer no longer has is CLOSED, not failed [203.65ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-log-tail.test.ts:
@bryance/orch test: (pass) daemon log tail > skips a CLI line after the daemon line [40.70ms]
@bryance/orch test: 
@bryance/orch test: test\agent-key-is-minted-id.test.ts:
@bryance/orch test: (pass) a driving session mints an id, it is not placed by name > the key an interactive session addresses itself by is a bare minted id [8.14ms]
@bryance/orch test: 
@bryance/orch test: test\queue.test.ts:
@bryance/orch test: (pass) queue facade on tasks and attempts > malformed task options are refused instead of handed back as TaskOptions [231.67ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-write.test.ts:
@bryance/orch test: (pass) applySettingsRepairs > rename onto an occupied key throws and leaves the file untouched [18.51ms]
@bryance/orch test: (pass) applySettingsRepairs > set writes a value at a dotted path [27.10ms]
@bryance/orch test: (pass) applySettingsRepairs > drop deletes a value without pruning its parent [18.81ms]
@bryance/orch test: (pass) applySettingsRepairs > applies several repairs in one call [44.54ms]
@bryance/orch test: (pass) applySettingsRepairs > repairs a schema-rejected file before readSettingsFile validates it [51.03ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-name-list.test.ts:
@bryance/orch test: (pass) spawn names every agent positionally, at creation > the positional arguments are the names, one per pane [0.67ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö orch's own grouping > a space is created, listed, renamed and deleted with no space-home role [1013.75ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair.test.ts:
@bryance/orch test: (pass) settings repair choices > offers rename, set, drop, then leave when all repairs apply [0.13ms]
@bryance/orch test: (pass) settings repair choices > offers only rename when there is only a suggestion [0.04ms]
@bryance/orch test: (pass) settings repair choices > offers only set when there is only an expected value [0.06ms]
@bryance/orch test: (pass) settings repair choices > always offers leave, and cannot drop a file-level defect [0.02ms]
@bryance/orch test: (pass) settings repair reducer > starts every defect at leave and focus at zero [0.08ms]
@bryance/orch test: (pass) settings repair reducer > refuses choices the focused defect does not offer and reports why [0.24ms]
@bryance/orch test: (pass) settings repair reducer > clamps focus at both ends and clears a prior reason [0.15ms]
@bryance/orch test: (pass) settings repair reducer > maps non-leave choices to repairs in defect order [0.25ms]
@bryance/orch test: (pass) settings repair reducer > leave produces no repair [0.04ms]
@bryance/orch test: (pass) settings repair reducer > empty defects make every action a no-op [0.07ms]
@bryance/orch test: 
@bryance/orch test: test\offline-is-not-a-second-source.test.ts:
@bryance/orch test: (pass) --offline is a narrower view of ONE source, not a second one (M8) > offline and online read the same agents from the same presence files [934.67ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-no-peer-credentials.test.ts:
@bryance/orch test: (pass) the daemon asks for a token and nothing else > no peer-credential or ancestry syscall appears in the daemon at all [4.36ms]
@bryance/orch test: 
@bryance/orch test: test\transfer-does-not-disturb.test.ts:
@bryance/orch test: (pass) a transfer touches the lease and nothing else > the agent's process is not restarted or re-attached [189.08ms]
@bryance/orch test: (pass) a transfer touches the lease and nothing else > no control write is delivered to the agent [203.97ms]
@bryance/orch test: (pass) a transfer touches the lease and nothing else > adoption of an unheld agent disturbs it no more than a handoff does [201.20ms]
@bryance/orch test: (pass) a transfer touches the lease and nothing else > the holding that ended is kept as history, not erased by the transfer [210.08ms]
@bryance/orch test: 
@bryance/orch test: test\agent-view.test.ts:
@bryance/orch test: (pass) the agent composer > each axis composes independently, and moving one leaves identity untouched [216.48ms]
@bryance/orch test: (pass) the agent composer > tuning is not environment: it survives a move [185.31ms]
@bryance/orch test: (pass) the agent composer > ownership reads as a live lease, and a released one is not ownership [229.02ms]
@bryance/orch test: (pass) the agent composer > provenance is on the view and is not the same fact as ownership [170.16ms]
@bryance/orch test: (pass) the agent composer > provenance carries the spawner's name, read as a join and never stored twice [224.86ms]
@bryance/orch test: (pass) the agent composer > an agent with no spawner reports no spawner name [207.17ms]
@bryance/orch test: (pass) the agent composer > agentViews is oldest-first and liveAgentViews drops ended agents [220.83ms]
@bryance/orch test: (pass) the agent composer > the axis list is the only place every axis is enumerated [0.78ms]
@bryance/orch test: (pass) the agent composer > the composed shape is exactly the axis list, with nothing extra and nothing missing [196.35ms]
@bryance/orch test: (pass) the agent composer > an unknown agent is null, never an empty shell [219.07ms]
@bryance/orch test: 
@bryance/orch test: test\holder-death-costs-a-driver.test.ts:
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > the lease closes `expired` ΓÇö not `released`, because no caller held it [195.57ms]
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > the agent stays alive, unleased and adoptable ΓÇö nothing closes it [177.63ms]
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > it receives no new work: the death hands the agent to nobody [172.49ms]
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > expiry is recorded once and does not erase who held it [173.22ms]
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > clearing a dead holder's lease is never refused, and is idempotent [196.11ms]
@bryance/orch test: 
@bryance/orch test: test\close-reports-every-target.test.ts:
@bryance/orch test: (pass) close reports an outcome for every target it was given (U2) > the exit code still reflects whether every target closed [229.39ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-checks.test.ts:
@bryance/orch test: (pass) doctor provenance-depth checks > accepts a live agent at fleet.max_depth [234.08ms]
@bryance/orch test: (pass) doctor unclaimed-agent checks > finds an old unclaimed live agent with its age [173.43ms]
@bryance/orch test: (pass) doctor unclaimed-agent checks > ignores a claimed agent [236.09ms]
@bryance/orch test: (pass) doctor unclaimed-agent checks > ignores a fresh unclaimed agent under the threshold [194.28ms]
@bryance/orch test: (pass) doctor notification-sink checks > reports no sinks as healthy [3.97ms]
@bryance/orch test: (pass) doctor notification-sink checks > rejects a webhook with a malformed URL [13.79ms]
@bryance/orch test: (pass) doctor notification-sink checks > uses the notify-send prerequisite install command in desktop remediation [23.58ms]
@bryance/orch test: (pass) doctor notification-sink checks > warns for a command binary missing from PATH [21.86ms]
@bryance/orch test: (pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [16.79ms]
@bryance/orch test: (pass) doctor notification-sink checks > warns when a notifier omits done from its on list [16.48ms]
@bryance/orch test: (pass) doctor notification-sink checks > does not warn when a notifier includes done in its on list [4.69ms]
@bryance/orch test: (pass) doctor notification-sink checks > keeps unavailable notifier failures when done is omitted [16.78ms]
@bryance/orch test: 
@bryance/orch test: test\host.test.ts:
@bryance/orch test: (pass) host > maps supported platforms [0.05ms]
@bryance/orch test: (pass) host > rejects unsupported platforms [0.08ms]
@bryance/orch test: (pass) host > guards host operating systems [0.09ms]
@bryance/orch test: (pass) host > detects WSL from distro name or kernel release [0.11ms]
@bryance/orch test: (pass) host > detects the current host [0.24ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: (pass) fleet ownership scoping > owner token is this process's own registered id, and nothing before it registers [852.14ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-name-list.test.ts:
@bryance/orch test: (pass) spawn names every agent positionally, at creation > the pane count is how many names were given [0.22ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > spawning with no name at all is refused [0.26ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > a bare count is not a name and is refused [0.23ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > the same name twice would collide, so it is refused before anything is created [0.16ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > every name is validated, so one bad name creates nothing [0.12ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > --name is gone: naming is positional, so the flag is an unknown flag [0.83ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > claimSpawnNames takes the resolved names and asserts each is free [175.37ms]
@bryance/orch test: 
@bryance/orch test: test\identity-is-not-environment.test.ts:
@bryance/orch test: (pass) A1 ΓÇö identity carries no environment > Identity declares no plexer and no plexer grouping [0.26ms]
@bryance/orch test: (pass) A1 ΓÇö identity carries no environment > a key is the minted id itself, with no separator to split [0.47ms]
@bryance/orch test: (pass) A1 ΓÇö identity carries no environment > the module never spells the sentinels that stand in for a missing place [0.04ms]
@bryance/orch test: (pass) A1 ΓÇö identity carries no environment > minted ids are unique per spawn [2.22ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö orch's own grouping > create refuses a name already in use [195.47ms]
@bryance/orch test: 
@bryance/orch test: test\settings-shell.test.ts:
@bryance/orch test: (pass) settings shell decisions > non-TTY takes the print path [0.08ms]
@bryance/orch test: 
@bryance/orch test: test\identity-launch.test.ts:
@bryance/orch test: (pass) an unset launch credential is absent [0.36ms]
@bryance/orch test: (pass) a minted launch credential is accepted [0.21ms]
@bryance/orch test: (pass) a malformed launch credential is refused, never exited [0.14ms]
@bryance/orch test: 
@bryance/orch test: test\settings.test.ts:
@bryance/orch test: (pass) loadSettings > requires a top-level runtime and never defaults it [26.60ms]
@bryance/orch test: (pass) loadSettings > rejects an unrecognized runtime naming the accepted values [24.22ms]
@bryance/orch test: (pass) loadSettings > rejects a runtime misplaced under defaults [13.20ms]
@bryance/orch test: (pass) loadSettings > reads the declared runtime [20.18ms]
@bryance/orch test: (pass) loadSettings > parses every supported settings section [31.22ms]
@bryance/orch test: (pass) loadSettings > reads question re-ask and retention sweep settings [6.35ms]
@bryance/orch test: (pass) loadSettings > rejects a file without the current schemaVersion [12.67ms]
@bryance/orch test: (pass) loadSettings > rejects invalid JSON loudly [6.87ms]
@bryance/orch test: (pass) loadSettings > names the key path for invalid fields [7.33ms]
@bryance/orch test: (pass) loadSettings > rejects unknown settings keys [19.35ms]
@bryance/orch test: (pass) loadSettings > rejects removed spawn cap setting by name [7.53ms]
@bryance/orch test: (pass) loadSettings > parses models.allowed as a per-harness pattern map [4.23ms]
@bryance/orch test: (pass) loadSettings > rejects renamed fleet keys and loads their replacements [75.35ms]
@bryance/orch test: (pass) loadSettings > rejects old settings keys [30.25ms]
@bryance/orch test: (pass) loadSettings > rejects legacy notify type and unknown ids [32.22ms]
@bryance/orch test: (pass) loadSettings > applies every settings default when sections are absent [22.12ms]
@bryance/orch test: (pass) loadSettings > preserves configured values while defaulting each missing section value [9.12ms]
@bryance/orch test: (pass) loadSettings > rejects non-positive and non-integer retention windows [20.70ms]
@bryance/orch test: (pass) loadSettings > rejects a host without dest [4.87ms]
@bryance/orch test: (pass) loadSettings > rejects an unknown id in enabled.adapters [7.65ms]
@bryance/orch test: (pass) loadSettings > rejects defaults.adapter not present in enabled.adapters [20.19ms]
@bryance/orch test: (pass) loadSettings > rejects when settings.json is absent but a legacy config.toml exists [8.96ms]
@bryance/orch test: (pass) allowedModelPatterns > restricts nothing when settings contain no patterns [17.38ms]
@bryance/orch test: (pass) allowedModelPatterns > returns the configured patterns when set [11.77ms]
@bryance/orch test: (pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or enabled entry [28.81ms]
@bryance/orch test: (pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [31.38ms]
@bryance/orch test: (pass) writeSettingsRuntime > a different runtime replaces the single value in place [31.11ms]
@bryance/orch test: (pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [19.08ms]
@bryance/orch test: (pass) reapUnreadableSettings > leaves a readable file alone [5.36ms]
@bryance/orch test: (pass) writeSettingsEnabled > round-trips both provider arrays [16.77ms]
@bryance/orch test: (pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [49.84ms]
@bryance/orch test: (pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [17.58ms]
@bryance/orch test: (pass) writeSettingsDefault > is idempotent when rewriting the same value [37.88ms]
@bryance/orch test: (pass) writeSettingsDefault > refuses to write through an out-of-version settings file [6.98ms]
@bryance/orch test: (pass) writeSettingsDefault > switches defaults.adapter between two enabled ids and loads clean [31.31ms]
@bryance/orch test: (pass) writeSettingsFullTree > round-trips defaults without inventing max_agents_total [58.63ms]
@bryance/orch test: (pass) settings precedence > uses the fallback when env and settings.json omit a setting [5.24ms]
@bryance/orch test: (pass) settings precedence > uses the settings.json value over the fallback [10.26ms]
@bryance/orch test: (pass) settings precedence > uses the ORCH_* environment value over settings.json [4.40ms]
@bryance/orch test: (pass) settings precedence > uses an explicit flag override over the environment [0.16ms]
@bryance/orch test: (pass) resolveSetting > uses flag, environment coercion, settings, then fallback in precedence order [0.13ms]
@bryance/orch test: (pass) resolveWithSource > rejects an environment value with the wrong shape [0.44ms]
@bryance/orch test: (pass) resolveWithSource > reports the winning source at each precedence level [0.22ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > loadSettings parses a per-harness preferred quicklist [8.16ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > an absent preferred map normalizes to an empty map, not to allowed [16.11ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > writing one list leaves the other byte-for-value intact [37.21ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > an empty list is recorded as no list at all, so a cleared picker really clears [51.08ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > the full tree seeds both maps when absent and preserves both when present [104.80ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > the allowlist gate reads models.allowed only [8.55ms]
@bryance/orch test: 
@bryance/orch test: test\offline-is-not-a-second-source.test.ts:
@bryance/orch test: (pass) --offline is a narrower view of ONE source, not a second one (M8) > offline reports the SAME state the agent reported, never a second opinion [156.93ms]
@bryance/orch test: (pass) --offline is a narrower view of ONE source, not a second one (M8) > there is exactly ONE row builder, and --offline only narrows what it asks [0.37ms]
@bryance/orch test: (pass) --offline is a narrower view of ONE source, not a second one (M8) > offline is the one path that never dials or starts the daemon [0.22ms]
@bryance/orch test: 
@bryance/orch test: test\store-queue.test.ts:
@bryance/orch test: (pass) queue facade storage > retention deletes only settled tasks older than the cutoff [239.28ms]
@bryance/orch test: (pass) queue facade storage > retention never removes a queued task based on its age [147.36ms]
@bryance/orch test: (pass) queue facade storage > agent-scoped tasks become unrunnable when their agent ends [190.97ms]
@bryance/orch test: (pass) queue facade storage > completed tasks stay done after their scope agent ends [224.96ms]
@bryance/orch test: (pass) queue facade storage > a dead orch does not make a pack task unrunnable while a member lives [181.98ms]
@bryance/orch test: (pass) queue facade storage > pack-scoped tasks become unrunnable when every pack member ends [129.42ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-names.test.ts:
@bryance/orch test: (pass) agent name validation > rejects names outside herdr's naming rule [3.55ms]
@bryance/orch test: 
@bryance/orch test: test\ambiguous-target-says-what-to-do.test.ts:
@bryance/orch test: (pass) an ambiguous target names the failure and the way out (U3) > the message names the failure, the target string, and every candidate [0.38ms]
@bryance/orch test: (pass) an ambiguous target names the failure and the way out (U3) > it says what to send instead, so the caller is not left guessing [0.05ms]
@bryance/orch test: (pass) an ambiguous target names the failure and the way out (U3) > it is a refusal, not an exit ΓÇö the caller can act on it [0.04ms]
@bryance/orch test: (pass) an ambiguous target names the failure and the way out (U3) > resolveAgentView raises that same one message [0.37ms]
@bryance/orch test: 
@bryance/orch test: test\settings-shell.test.ts:
@bryance/orch test: (pass) settings shell decisions > an overridden setting is refused with the winner named [0.56ms]
@bryance/orch test: (pass) settings shell decisions > registered writes use the registry entry [59.46ms]
@bryance/orch test: (pass) settings shell decisions > a committed choice shows its saved value on the next screen [42.38ms]
@bryance/orch test: (pass) settings shell decisions > registry exposes writable subcommand entries [0.38ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-links.test.ts:
@bryance/orch test: (pass) bridge links > a second attach for the same key replaces the first [202.26ms]
@bryance/orch test: (pass) bridge links > detach removes only the link still held [216.65ms]
@bryance/orch test: (pass) bridge links > push with no link throws BridgeDetachedError [147.77ms]
@bryance/orch test: (pass) bridge links > an unknown target is refused before the registry is consulted [104.28ms]
@bryance/orch test: (pass) bridge message guards > accept every action shape [1.02ms]
@bryance/orch test: (pass) bridge message guards > refuse a missing field, an unknown action, and a non-record [0.91ms]
@bryance/orch test: (pass) bridge message guards > a delivery is an id plus a message [1.09ms]
@bryance/orch test: 
@bryance/orch test: test\status-renders-one-row-shape.test.ts:
@bryance/orch test: (pass) status rendering has one row shape and one table renderer > local and remote rows share the renderer; remote adds only HOST [0.70ms]
@bryance/orch test: (pass) status rendering has one row shape and one table renderer > fleet resolves caller inputs once while building three presence rows [853.30ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö orch's own grouping > delete refuses a space that still holds agents [139.95ms]
@bryance/orch test: 
@bryance/orch test: test\codex-adapter.test.ts:
@bryance/orch test: (pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [9.96ms]
@bryance/orch test: 
@bryance/orch test: test\setup-flags.test.ts:
@bryance/orch test: (pass) setup model flags > rejects a bare model when multiple harnesses are selected [0.51ms]
@bryance/orch test: (pass) setup model flags > binds each model flag to its own harness [0.15ms]
@bryance/orch test: (pass) setup model flags > allows a bare model for one harness [0.04ms]
@bryance/orch test: (pass) setup model flags > rejects a model bound to an unselected harness [0.19ms]
@bryance/orch test: (pass) setup model flags > rejects duplicate model flags for one harness [0.06ms]
@bryance/orch test: 
@bryance/orch test: test\codex-adapter.test.ts:
@bryance/orch test: (pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [55.04ms]
@bryance/orch test: (pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [5.48ms]
@bryance/orch test: (pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [4.78ms]
@bryance/orch test: (pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [31.96ms]
@bryance/orch test: 
@bryance/orch test: test\setup-io.test.ts:
@bryance/orch test: (pass) setup prompt answer validation > refuses a single answer that was not offered [0.26ms]
@bryance/orch test: (pass) setup prompt answer validation > refuses multi-select answers containing an unoffered value [0.15ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lease.test.ts:
@bryance/orch test: (pass) lease commands > a LIVE foreign holder still excludes everyone else [985.62ms]
@bryance/orch test: (pass) lease commands > adopt takes an unleased agent and a dead holder [187.46ms]
@bryance/orch test: (pass) lease commands > adopt refuses a holder with a live recorded process [206.51ms]
@bryance/orch test: (pass) lease commands > reap refuses when a live descendant exists, regardless of lease [206.79ms]
@bryance/orch test: (pass) lease commands > reap refuses while the recorded process is alive [144.84ms]
@bryance/orch test: (pass) lease commands > reap is never lease-gated and removes the record and presence [146.98ms]
@bryance/orch test: 
@bryance/orch test: test\one-bind-for-the-unix-endpoint.test.ts:
@bryance/orch test: (pass) one bind for the unix endpoint (2.4) > the unix endpoint is claimed in exactly one place [0.23ms]
@bryance/orch test: 
@bryance/orch test: test\doctor.test.ts:
@bryance/orch test: (pass) runDoctor > runs on an unconfigured install without failing for want of settings.json [431.45ms]
@bryance/orch test: (pass) runDoctor > checks a healthy store [177.06ms]
@bryance/orch test: (pass) runDoctor > warns when the store is absent [11.70ms]
@bryance/orch test: (pass) runDoctor > fails when the store predates orch's migrations [190.41ms]
@bryance/orch test: (pass) runDoctor > fails and names a missing store table [174.86ms]
@bryance/orch test: (pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [243.62ms]
@bryance/orch test: (pass) runDoctor > reports an absent daemon as optional [176.79ms]
@bryance/orch test: (pass) runDoctor > reports and fixes a stale daemon lock [202.47ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-claude-hooks.test.ts:
@bryance/orch test: (pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [124.38ms]
@bryance/orch test: 
@bryance/orch test: test\settings-thinking.test.ts:
@bryance/orch test: (pass) orch settings thinking > writes the global default and reads back through loadSettings [100.05ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > create makes a home and records only its coordinate [172.98ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-reasserts-pin.test.ts:
@bryance/orch test: (pass) bridge reasserts orch model pins > reasserts after session_start and reports the applied pin [16.45ms]
@bryance/orch test: (pass) bridge reasserts orch model pins > reasserts one time for a foreign level and ignores apply events [5.88ms]
@bryance/orch test: (pass) bridge reasserts orch model pins > a harness clamp does not create a reassert loop [5.52ms]
@bryance/orch test: 
@bryance/orch test: test\store-rebuild-schema.test.ts:
@bryance/orch test: (pass) rebuild schema > rebuild DDL inventory is exact [150.16ms]
@bryance/orch test: 
@bryance/orch test: test\one-bind-for-the-unix-endpoint.test.ts:
@bryance/orch test: (pass) one bind for the unix endpoint (2.4) > reclaiming a stale socket yields the endpoint a first bind produces [86.40ms]
@bryance/orch test: 
@bryance/orch test: test\unleased-agents.test.ts:
@bryance/orch test: (pass) registration unleased agent hint > includes unleased workers but never session identities [200.62ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) answer over the bridge > pushes the answer and its question id [265.15ms]
@bryance/orch test: 
@bryance/orch test: test\one-control-dispatcher.test.ts:
@bryance/orch test: (pass) there is exactly one control dispatcher > no module outside src/control declares a control dispatcher [28.39ms]
@bryance/orch test: 
@bryance/orch test: test\claude-adapter.test.ts:
@bryance/orch test: (pass) Claude adapter > maps Claude hook events to presence reports [955.46ms]
@bryance/orch test: 
@bryance/orch test: test\setup-notifiers.test.ts:
@bryance/orch test: (pass) notifier setup logic > probes the built-in adapters [27.84ms]
@bryance/orch test: 
@bryance/orch test: test\one-control-dispatcher.test.ts:
@bryance/orch test: (pass) there is exactly one control dispatcher > no dispatcher is exported under two names [27.67ms]
@bryance/orch test: 
@bryance/orch test: test\settings-thinking.test.ts:
@bryance/orch test: thinking  xhigh
@bryance/orch test: thinking (pi)  low
@bryance/orch test: (pass) orch settings thinking > writes a per-harness override without disturbing the global default [34.73ms]
@bryance/orch test: (pass) orch settings thinking > the command sets the level a user names [20.79ms]
@bryance/orch test: (pass) orch settings thinking > the command sets a per-harness level with --harness [27.54ms]
@bryance/orch test: (pass) orch settings thinking > a level orch does not know is refused, naming the valid levels [7.24ms]
@bryance/orch test: (pass) orch settings thinking > clearing a per-harness override falls back to the global default [103.11ms]
@bryance/orch test: 
@bryance/orch test: test\setup-notifiers.test.ts:
@bryance/orch test: (pass) notifier setup logic > lists unavailable notifiers with remediation and disables selection [0.17ms]
@bryance/orch test: (pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.34ms]
@bryance/orch test: (pass) notifier setup logic > renders a command entry that loadSettings can parse [88.75ms]
@bryance/orch test: (pass) notifier setup logic > builds valid entries and reports invalid selections [0.40ms]
@bryance/orch test: 
@bryance/orch test: test\one-query-stack-over-the-connection.test.ts:
@bryance/orch test: (pass) one query stack over the connection (2.3) > the store exposes no raw-SQL port beside the typed one [0.09ms]
@bryance/orch test: 
@bryance/orch test: test\settings-view.test.ts:
@bryance/orch test: (pass) settings view > visibleEntryIndices matches key and group case-insensitively [0.26ms]
@bryance/orch test: (pass) settings view > visibleEntryIndices matches the shown value, so a search finds a setting by what it holds [0.07ms]
@bryance/orch test: (pass) settings view > windowBounds keeps the focus inside the budget and clamps at both ends [0.05ms]
@bryance/orch test: (pass) settings view > frame shows group headers, values, provenance tags, and the focused help [0.77ms]
@bryance/orch test: (pass) settings view > frame with a filter narrows the list and draws the filter line [0.20ms]
@bryance/orch test: (pass) settings view > frame in search mode draws the search line with a cursor and the search keybar [0.11ms]
@bryance/orch test: (pass) settings view > frame reports an empty filter match instead of a blank screen [0.05ms]
@bryance/orch test: (pass) settings view > a long list is windowed with more-above/more-below markers [0.67ms]
@bryance/orch test: (pass) settings view > overlays render choices, checkboxes, and input with error [0.63ms]
@bryance/orch test: (pass) settings view > a checkbox row shows what its choice carries [0.11ms]
@bryance/orch test: (pass) settings view > displayValue keeps scalars bare and JSON-encodes shapes [0.07ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > list reports that a space has a home without naming the coordinate [224.15ms]
@bryance/orch test: 
@bryance/orch test: test\one-query-stack-over-the-connection.test.ts:
@bryance/orch test: (pass) one query stack over the connection (2.3) > nothing in the repo prepares a statement through the deleted port [82.01ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-terminal.test.ts:
@bryance/orch test: (pass) bridge terminal turn seam > empty and tool-only turn_end turns still publish a terminal idle state [150.02ms]
@bryance/orch test: 
@bryance/orch test: test\one-retry-policy.test.ts:
@bryance/orch test: (pass) one retry policy > retries flaky async and sync operations through the shared helper [1.62ms]
@bryance/orch test: (pass) one retry policy > uses the policy's declared backoff schedule [0.40ms]
@bryance/orch test: (pass) one retry policy > surfaces the last error after exactly attempts tries [0.64ms]
@bryance/orch test: 
@bryance/orch test: test\doctor.test.ts:
@bryance/orch test: (pass) runDoctor > accepts a live daemon and an answerable socket [378.72ms]
@bryance/orch test: 
@bryance/orch test: test\unleased-stays-adoptable.test.ts:
@bryance/orch test: (pass) unleased and idle stays alive and adoptable (D3) > a decade of sweeps never ages out an unleased idle agent [175.49ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > rename renames orch's space and its home [169.16ms]
@bryance/orch test: 
@bryance/orch test: test\codex-adapter.test.ts:
@bryance/orch test: (pass) CodexAdapter > notify shim reports done presence and result over orchd [479.18ms]
@bryance/orch test: 
@bryance/orch test: test\retention.test.ts:
@bryance/orch test: (pass) retention sweep > a null ended_agents_days is the user's own choice, never the default [158.48ms]
@bryance/orch test: (pass) retention sweep > uses each table's own window and keeps queued and claimed tasks [275.59ms]
@bryance/orch test: (pass) retention sweep > returns zero counts when every row is inside its window [152.05ms]
@bryance/orch test: (pass) retention sweep > continues sweeping when one table delete fails [157.27ms]
@bryance/orch test: (pass) retention sweep > reaps a gone agent by identity, taking every satellite with it [215.69ms]
@bryance/orch test: (pass) retention sweep > a dead parent goes in the same reap as its dead child [198.21ms]
@bryance/orch test: (pass) retention sweep > a dead parent stays while a live child still points at it [189.16ms]
@bryance/orch test: (pass) retention sweep > a dead agent a task still points at stays for a later reap [181.21ms]
@bryance/orch test: (pass) retention sweep > the sweep leaves a dead agent's rows alone and keeps its young history [238.37ms]
@bryance/orch test: (pass) retention sweep > removes a gone agent's history once its last write is past the window [139.29ms]
@bryance/orch test: (pass) retention sweep > keeps history whose newest file is inside the window [126.06ms]
@bryance/orch test: (pass) retention sweep > a null window keeps history forever [171.14ms]
@bryance/orch test: (pass) retention sweep > never reaps a live agent or its history regardless of age [188.83ms]
@bryance/orch test: (pass) retention sweep > sweeps old logs but preserves logs for live agents [139.48ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-terminal.test.ts:
@bryance/orch test: (pass) bridge terminal turn seam > a settled turn with assistant text publishes done [173.79ms]
@bryance/orch test: 
@bryance/orch test: test\setup-smoke.test.ts:
@bryance/orch test: (pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [2.55ms]
@bryance/orch test: (pass) runSetupSmoke (12.5) > the agent is launched on the prompt it built [1.26ms]
@bryance/orch test: (pass) runSetupSmoke (12.5) > an agent that launches but yields no result times out and fails non-zero [9.98ms]
@bryance/orch test: (pass) runSetupSmoke (12.5) > a rejected spawn fails loudly and never polls for a result [9.05ms]
@bryance/orch test: 
@bryance/orch test: test\claude-adapter.test.ts:
@bryance/orch test: (pass) Claude adapter > exits silently and writes no presence without launch env (a non-orch session) [233.15ms]
@bryance/orch test: (pass) Claude adapter > fails hard and writes no presence on a malformed launch env [202.07ms]
@bryance/orch test: 
@bryance/orch test: test\one-writer-records-a-spawned-agent.test.ts:
@bryance/orch test: (pass) one writer records a spawned agent (2.1) > a spawn leaves NOTHING for a second writer to fill in [1808.39ms]
@bryance/orch test: 
@bryance/orch test: test\identity-self.test.ts:
@bryance/orch test: (pass) selfIdentity > returns the launch id without touching the store [750.90ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-names.test.ts:
@bryance/orch test: (pass) agent name validation > accepts lowercase names with hyphens and underscores [0.10ms]
@bryance/orch test: (pass) a live name is claimed and a dead one is released > a live agent holds its name against a second spawn [155.60ms]
@bryance/orch test: (pass) a live name is claimed and a dead one is released > a dead agent frees its name [164.79ms]
@bryance/orch test: (pass) a live name is claimed and a dead one is released > another space's agent never blocks a name here [206.68ms]
@bryance/orch test: (pass) name scope follows the agent's current space, not its birthplace > moving an agent moves the name it holds [149.59ms]
@bryance/orch test: (pass) name scope follows the agent's current space, not its birthplace > the collision names the agent by its minted id [159.73ms]
@bryance/orch test: 
@bryance/orch test: test\identity.test.ts:
@bryance/orch test: (pass) serializeIdentity / parseIdentity > a key is the minted id verbatim [0.11ms]
@bryance/orch test: (pass) serializeIdentity / parseIdentity > round-trips a minted id [0.08ms]
@bryance/orch test: (pass) serializeIdentity / parseIdentity > a key is one flat filesystem-safe segment with nothing to split [0.08ms]
@bryance/orch test: (pass) serializeIdentity / parseIdentity > two spawns never collide, so no plexer is needed to namespace them [1.00ms]
@bryance/orch test: (pass) isAgentId > accepts a minted id [0.20ms]
@bryance/orch test: (pass) isAgentId > rejects everything that is not one [0.09ms]
@bryance/orch test: (pass) malformed input > rejects malformed ids [0.04ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > delete closes the home and drops its coordinate [206.01ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: (pass) fleet ownership scoping > spawn stamps the caller's registered id as the holder on its record [1137.02ms]
@bryance/orch test: 
@bryance/orch test: test\setup-wizard.test.ts:
@bryance/orch test: (pass) setup model picker > switches large catalogues to searchable bounded mode and preserves effort [0.68ms]
@bryance/orch test: (pass) setup model picker > keeps the compact selector for small catalogues [0.30ms]
@bryance/orch test: (pass) setup model list picker > large catalogues use the bounded searchable multiselect [0.43ms]
@bryance/orch test: (pass) setup model list picker > the prompt names both jobs the list does, and that an empty one forbids nothing [0.11ms]
@bryance/orch test: (pass) setup model list picker > stored values start checked, and clearing them returns an empty selection [0.24ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-claude-hooks.test.ts:
@bryance/orch test: (pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [88.43ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [103.00ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [59.08ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [100.51ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [90.02ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [60.59ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [46.62ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [80.79ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > treats an absent settings file as not configured [0.94ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > handles malformed settings gracefully [10.84ms]
@bryance/orch test: 
@bryance/orch test: test\claude-hooks.test.ts:
@bryance/orch test: (pass) Claude hook command > runs for every Claude session and lets the shim self-gate [8.53ms]
@bryance/orch test: 
@bryance/orch test: test\nested-spawn-unleased.test.ts:
@bryance/orch test: (pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the middle agent's death leaves the grandchild unleased, held by nobody [196.17ms]
@bryance/orch test: 
@bryance/orch test: test\broker-daemon-hardening.test.ts:
@bryance/orch test: (pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [2.52ms]
@bryance/orch test: 
@bryance/orch test: test\launch-model-gate.test.ts:
@bryance/orch test: (pass) the model gate rules by harness membership, not by format > accepts a listed spec, with or without a thinking suffix [34.60ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-herdr-headless.test.ts:
@bryance/orch test: (pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.39ms]
@bryance/orch test: 
@bryance/orch test: test\skill-store-and-links.test.ts:
@bryance/orch test: (pass) skill store and harness links > writes real files to the store and links each harness dir into it [46.49ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-no-peer-credentials.test.ts:
@bryance/orch test: (pass) the daemon asks for a token and nothing else > a caller the daemon has no relationship to is accepted on the token alone [1188.28ms]
@bryance/orch test: (pass) the daemon asks for a token and nothing else > that same stranger without the token is refused, so the token is what decided [38.43ms]
@bryance/orch test: 
@bryance/orch test: test\retention.test.ts:
@bryance/orch test: (pass) retention sweep > does not sweep again one minute after the first tick [173.64ms]
@bryance/orch test: (pass) retention sweep > prunes orch's own logs past the age cap [146.85ms]
@bryance/orch test: (pass) retention sweep > prunes orch's own logs past the size cap even when freshly written [138.60ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > focus focuses the recorded coordinate [225.62ms]
@bryance/orch test: 
@bryance/orch test: test\unleased-stays-adoptable.test.ts:
@bryance/orch test: (pass) unleased and idle stays alive and adoptable (D3) > and it is still adoptable afterwards ΓÇö the point of keeping it [161.88ms]
@bryance/orch test: (pass) unleased and idle stays alive and adoptable (D3) > the reap takes only agents whose process is GONE, never merely unleased ones [170.89ms]
@bryance/orch test: (pass) unleased and idle stays alive and adoptable (D3) > repeated sweeps are stable: an unleased agent survives every one of them [200.14ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lease.test.ts:
@bryance/orch test: {"outcome":"answer","reason":"no-environment-role","text":"this pane environment does not provide abort"}
@bryance/orch test: (pass) lease commands > abort proceeds with a foreign live-holder lease [1065.19ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-declared-vs-reality-tuning.test.ts:
@bryance/orch test: (pass) doctor declared tuning versus reality > matching model and effort produces no finding [188.03ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) answer over the bridge > returns not-asking without pushing [206.41ms]
@bryance/orch test: (pass) answer over the bridge > reports a detached bridge for a live asking agent [205.09ms]
@bryance/orch test: (pass) answer over the bridge > reports a gone asking agent [211.16ms]
@bryance/orch test: (pass) answer over the bridge > answers with a clear absence when the adapter takes no answers [206.85ms]
@bryance/orch test: 
@bryance/orch test: test\launch-model-gate.test.ts:
@bryance/orch test: (pass) the model gate rules by harness membership, not by format > refuses a ladder shorthand and names what the harness does offer [8.34ms]
@bryance/orch test: (pass) the model gate rules by harness membership, not by format > accepts each harness's own vocabulary rather than one shared grammar [6.39ms]
@bryance/orch test: (pass) the model gate rules by harness membership, not by format > cannot check a harness that publishes no catalogue, and does not pretend to [17.18ms]
@bryance/orch test: (pass) short model names expand against the allowed harness catalogue > expands a short name with one listed match [6.06ms]
@bryance/orch test: (pass) short model names expand against the allowed harness catalogue > reports multiple matches as ambiguous in sorted order [11.66ms]
@bryance/orch test: (pass) short model names expand against the allowed harness catalogue > passes through a full listed spec [3.80ms]
@bryance/orch test: (pass) short model names expand against the allowed harness catalogue > does not expand a match excluded by models.allowed [16.96ms]
@bryance/orch test: (pass) the settings allowlist applies on top of harness membership > an empty allowlist restricts nothing beyond the harness list [4.87ms]
@bryance/orch test: (pass) the settings allowlist applies on top of harness membership > a configured allowlist refuses a listed model outside its patterns [17.07ms]
@bryance/orch test: (pass) the settings allowlist applies on top of harness membership > a spec no harness lists is refused by the harness, not the allowlist [50.10ms]
@bryance/orch test: (pass) admission expands a short name through the same gate > expands a short name and keeps its thinking suffix [20.36ms]
@bryance/orch test: (pass) admission expands a short name through the same gate > refuses an ambiguous short name by naming every candidate [26.30ms]
@bryance/orch test: (pass) admission expands a short name through the same gate > a short name whose only matches the allowlist excludes is an allowlist refusal [33.27ms]
@bryance/orch test: (pass) admission expands a short name through the same gate > the allowlist narrows an otherwise ambiguous short name to one match [16.72ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-channel.test.ts:
@bryance/orch test: (pass) orch bridge links and capture roles > live session delivery settles mail without a bridge or pane route [191.77ms]
@bryance/orch test: (pass) orch bridge links and capture roles > a spawned agent whose bridge is detached stays queued for that bridge [217.26ms]
@bryance/orch test: (pass) orch bridge links and capture roles > worker mail to its spawner under mail.to_spawner prompt waits for the spawner's bridge [221.50ms]
@bryance/orch test: (pass) orch bridge links and capture roles > worker mail to its spawner under mail.to_spawner events settles on the spawner's stream [214.55ms]
@bryance/orch test: (pass) orch bridge links and capture roles > worker mail to a spawner whose pane the human is in settles on the stream under prompt-unless-focused [185.34ms]
@bryance/orch test: (pass) orch bridge links and capture roles > worker mail to a spawner whose pane the human is in still waits for the bridge under prompt [160.18ms]
@bryance/orch test: (pass) orch bridge links and capture roles > worker mail to a spawner whose pane is unfocused waits for the bridge under prompt-unless-focused [194.74ms]
@bryance/orch test: (pass) orch bridge links and capture roles > spawner mail to its worker follows mail.to_worker, not mail.to_spawner [192.25ms]
@bryance/orch test: (pass) orch bridge links and capture roles > spawner mail to its worker under mail.to_worker events settles on the worker's stream [180.96ms]
@bryance/orch test: (pass) orch bridge links and capture roles > events mail to a dead recipient is undeliverable [168.55ms]
@bryance/orch test: (pass) orch bridge links and capture roles > dead session without a bridge or pane route is undeliverable [184.35ms]
@bryance/orch test: (pass) orch bridge links and capture roles > capture reads status and result from the store [169.97ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: orch is not running inside herdr and no backend was chosen - spawning headless. Pass --backend herdr or set defaults.backend to open a herdr home for these agents (the user grants it), or --space <id> to place them in an open space.
@bryance/orch test: (pass) outside every plexer, spawn is headless unless the human chose one > a plexer orch only probed, from a plain terminal, spawns headless [100.18ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > a home made in another plexer is not this environment's to focus [185.29ms]
@bryance/orch test: 
@bryance/orch test: test\nested-spawn-unleased.test.ts:
@bryance/orch test: (pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the grandchild stays alive and adoptable, and keeps its own provenance [187.74ms]
@bryance/orch test: (pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the grandparent holding the middle agent does not extend to the grandchild [163.21ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-errors.test.ts:
@bryance/orch test: (pass) port seam error contract > provider mutation errors preserve argv, exit status, stderr, and stdout [1.38ms]
@bryance/orch test: (pass) port seam error contract > provider query errors throw instead of returning a sentinel [0.62ms]
@bryance/orch test: 
@bryance/orch test: test\status-unleased.test.ts:
@bryance/orch test: (pass) status owner rendering > leased by a live holder shows that holder [1072.73ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) outside every plexer, spawn is headless unless the human chose one > a chosen plexer stays selected and its home is what the human grants [53.34ms]
@bryance/orch test: orch is not running inside herdr and herdr cannot open a space of its own - spawning headless. Pass --backend herdr or set defaults.backend to open a herdr home for these agents (the user grants it), or --space <id> to place them in an open space.
@bryance/orch test: (pass) outside every plexer, spawn is headless unless the human chose one > a chosen plexer that cannot open a home still falls back to headless [34.50ms]
@bryance/orch test: 
@bryance/orch test: test\skill-store-and-links.test.ts:
@bryance/orch test: (pass) skill store and harness links > replaces a real directory left in a harness dir with a link into the store [43.27ms]
@bryance/orch test: (pass) skill store and harness links > doctor reports a harness dir holding a real directory instead of a link [125.31ms]
@bryance/orch test: (pass) skill store and harness links > doctor reports a stale store and its fix reinstalls the packaged skill [66.03ms]
@bryance/orch test: (pass) skill store and harness links > doctor passes once every harness dir links into the store [70.17ms]
@bryance/orch test: (pass) skill store and harness links > doctor skips when the user turned the skill install off [38.57ms]
@bryance/orch test: 
@bryance/orch test: test\broker-daemon-hardening.test.ts:
@bryance/orch test: (pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [197.76ms]
@bryance/orch test: (pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [142.40ms]
@bryance/orch test: 
@bryance/orch test: test\backend-headless.test.ts:
@bryance/orch test: (pass) HeadlessBackend > refuses to spawn with no prompt ΓÇö a headless agent runs its prompt and exits [4.26ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) outside every plexer, spawn is headless unless the human chose one > a caller recorded inside the plexer stays in it, chosen or not [39.86ms]
@bryance/orch test: (pass) outside every plexer, spawn is headless unless the human chose one > a named space is placement enough: no chosen backend needed [21.38ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö absence is an answer > focus with no space-home role names the space and what is missing [152.88ms]
@bryance/orch test: 
@bryance/orch test: test\routing-hardening.test.ts:
@bryance/orch test: (pass) store hardening > stores hostile values as data and preserves pack selection [193.77ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lease.test.ts:
@bryance/orch test: {"closed":["1u9xz1e5v9"],"results":[{"target":"1u9xz1e5v9","handle":"close-handle","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
@bryance/orch test: (pass) lease commands > close proceeds with a foreign live-holder lease [320.72ms]
@bryance/orch test: 
@bryance/orch test: test\no-placement-row-over-the-composed-view.test.ts:
@bryance/orch test: (pass) no Placement row is reassembled over the composed view (2.1) > there is no second lookup module projecting the environment into a flat row [0.55ms]
@bryance/orch test: 
@bryance/orch test: test\control-dispatch.test.ts:
@bryance/orch test: (pass) deliverControl bridge dispatch > pushes run and steer with their action ids [202.20ms]
@bryance/orch test: 
@bryance/orch test: test\broker-daemon-hardening.test.ts:
@bryance/orch test: (pass) broker daemon hardening > concurrent drains do not redeliver one message id [161.38ms]
@bryance/orch test: (pass) broker daemon hardening > replay after the newest sequence is empty without a gap [161.20ms]
@bryance/orch test: 
@bryance/orch test: test\vocabulary.test.ts:
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > a role is derived from the tree, never stored [192.72ms]
@bryance/orch test: 
@bryance/orch test: test\presence-dirs-are-reaped-not-migrated.test.ts:
@bryance/orch test: (pass) a presence dir in the old shape is reaped, never migrated (J4) > a composite-named dir is not presence, whatever its file claims [198.08ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö absence is an answer > the plain-text answer names the space too [208.08ms]
@bryance/orch test: 
@bryance/orch test: test\lease-authority.test.ts:
@bryance/orch test: (pass) C3 foreign agents are untouchable > a DEAD foreign holder is not a collision [169.86ms]
@bryance/orch test: (pass) C3 foreign agents are untouchable > the composed holder IS the open lease, with nothing beside it [163.89ms]
@bryance/orch test: (pass) C4 steal > adopt refuses a live holder, and --steal takes it [211.55ms]
@bryance/orch test: (pass) C4 steal > detach refuses a live holder, and --steal releases it [175.21ms]
@bryance/orch test: (pass) C4a fencing token > lease ids are monotonic across handoff and adoption [168.89ms]
@bryance/orch test: (pass) C4a fencing token > a stale fence cannot release the current holder's lease [143.77ms]
@bryance/orch test: (pass) C4a fencing token > openLeaseId is null when nothing is leased [140.54ms]
@bryance/orch test: (pass) C4b reads are never gated > status and events read straight through a live foreign lease [166.75ms]
@bryance/orch test: (pass) C4c/C4d name resolution > duplicate names are legal and an ambiguous target asks for the id [184.74ms]
@bryance/orch test: (pass) C4c/C4d name resolution > a unique name resolves, and an unknown target is a lookup miss [149.29ms]
@bryance/orch test: (pass) C4e naming at creation > a nameless spawn is refused [0.31ms]
@bryance/orch test: (pass) C4e naming at creation > a self-registering session gets <harness>-<first 8 of its id> [181.72ms]
@bryance/orch test: (pass) C4f self-rename > an agent renames itself whether or not a lease is in force [164.89ms]
@bryance/orch test: (pass) C4f self-rename > renaming another agent is driving and obeys the lease [165.21ms]
@bryance/orch test: (pass) C4f self-rename > an invalid name is refused [129.66ms]
@bryance/orch test: (pass) C5 a transfer does not disturb the agent > adoption writes lease rows and touches nothing else [156.58ms]
@bryance/orch test: (pass) C7 live by lease, history by provenance > adoption moves the live view and leaves provenance untouched [168.55ms]
@bryance/orch test: 
@bryance/orch test: test\status-unleased.test.ts:
@bryance/orch test: (pass) status owner rendering > a dead holder is shown as unleased with the holder gone [177.21ms]
@bryance/orch test: (pass) status owner rendering > an agent never leased shows no orch driving it [189.21ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-declared-vs-reality-tuning.test.ts:
@bryance/orch test: (pass) doctor declared tuning versus reality > different effort reports both ladder specs [148.02ms]
@bryance/orch test: (pass) doctor declared tuning versus reality > different model reports both ladder specs [141.85ms]
@bryance/orch test: (pass) doctor declared tuning versus reality > missing status produces no tuning finding [195.31ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lease.test.ts:
@bryance/orch test: {"target":"2bqbblxuz9","name":"reap-worker","reaped":true}
@bryance/orch test: (pass) lease commands > reap proceeds with a foreign live-holder lease [231.24ms]
@bryance/orch test: 
@bryance/orch test: test\space-policy.test.ts:
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > placing an agent in a space nobody created is refused, not minted [203.17ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö vocabulary and wiring > cmdSpace lists through the resolved environment [170.03ms]
@bryance/orch test: (pass) orch space ΓÇö vocabulary and wiring > orch ws is gone [2.71ms]
@bryance/orch test: (pass) orch space ΓÇö vocabulary and wiring > space help never says workspace and offers create/rename/delete [4.21ms]
@bryance/orch test: 
@bryance/orch test: test\commands-resolve.test.ts:
@bryance/orch test: (pass) commands/resolve > resolves one target with its view and ownership [1085.43ms]
@bryance/orch test: 
@bryance/orch test: test\no-placement-row-over-the-composed-view.test.ts:
@bryance/orch test: (pass) no Placement row is reassembled over the composed view (2.1) > the space wall reads the OPEN space interval, so a moved agent is walled by where it IS [188.05ms]
@bryance/orch test: (pass) no Placement row is reassembled over the composed view (2.1) > a string that names no registered agent is in no space rather than an error [173.54ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-declared-vs-reality.test.ts:
@bryance/orch test: (pass) doctor declared-vs-reality > describes composed and absent backend roles [35.91ms]
@bryance/orch test: 
@bryance/orch test: test\one-writer-records-a-spawned-agent.test.ts:
@bryance/orch test: (pass) one writer records a spawned agent (2.1) > a spawn into NO space records no space and hands the plexer only its coordinate [1093.68ms]
@bryance/orch test: (pass) one writer records a spawned agent (2.1) > the presence store no longer offers a second way to record an agent [4.10ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lease.test.ts:
@bryance/orch test: (pass) lease commands > reset driving verb refuses a foreign live-holder lease [222.91ms]
@bryance/orch test: 
@bryance/orch test: test\queue.test.ts:
@bryance/orch test: (pass) queue facade on tasks and attempts > enqueue selects exactly one typed scope and defaults to the enqueuer pack [174.60ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > agent scope requires the enqueuer to lease the target [138.03ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq1: the gate is on enqueuing into a scope, and adoption earns it [156.09ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq1: a pack drains its queue with its orch dead and no lease in force [144.88ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > claiming excludes another pack and space claims require open intake [205.57ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq3: a space-scoped task is an offer, and only an opted-in pack consumes it [167.68ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > a failed pack attempt retries on another member, never outside the pack [163.36ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq5: an agent-scoped binding is to the agent and survives adoption [195.42ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq13: adoption carries the queue ΓÇö pack work comes with the agents [154.99ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > a claim is an insert and a lost race returns false [147.06ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > cancel rights are enqueuer, targeted agent's leasing orch, or human [191.51ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq7: origin_workspace is gone from the tasks table, scope replaces it [209.84ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > state and attempt-derived values have no legacy flattened fields [176.11ms]
@bryance/orch test: 
@bryance/orch test: test\store-agent-rows.test.ts:
@bryance/orch test: (pass) agent store rows > insertAgent writes both NULL; agentById reads both back [217.47ms]
@bryance/orch test: 
@bryance/orch test: test\orch-bugs-4-5.test.ts:
@bryance/orch test: (pass) orch bugs 4 and 5 launch contracts > interactive launch routes use one argv composition [10.97ms]
@bryance/orch test: (pass) orch bugs 4 and 5 launch contracts > headless launch routes use one argv composition [0.80ms]
@bryance/orch test: (pass) orch bugs 4 and 5 launch contracts > inherited extension policy emits every discovered extension [0.54ms]
@bryance/orch test: 
@bryance/orch test: test\command-refusal.test.ts:
@bryance/orch test: (pass) a command refusal is thrown, not exited > an unresolvable target throws a CommandRefusal instead of killing the process [1122.72ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-registration.test.ts:
@bryance/orch test: (pass) machine daemon registration > refuses a second start and names the live socket [769.83ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö vocabulary and wiring > no space output ever says workspace [229.19ms]
@bryance/orch test: 
@bryance/orch test: test\commands-resolve.test.ts:
@bryance/orch test: (pass) commands/resolve > resolves lifecycle target with backend and handle [222.40ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-herdr-headless.test.ts:
@bryance/orch test: (pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.41ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.47ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.41ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.32ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.54ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [46.89ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > implicit selection falls back to headless when no plexer answers [0.57ms]
@bryance/orch test: (pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [1038.24ms]
@bryance/orch test: (pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [2.91ms]
@bryance/orch test: 
@bryance/orch test: test\presence-dirs-are-reaped-not-migrated.test.ts:
@bryance/orch test: (pass) a presence dir in the old shape is reaped, never migrated (J4) > the sweep REMOVES it rather than leaving it for a migration that never comes [199.07ms]
@bryance/orch test: (pass) a presence dir in the old shape is reaped, never migrated (J4) > nothing renames, rewrites or re-keys the old directory [144.10ms]
@bryance/orch test: (pass) a presence dir in the old shape is reaped, never migrated (J4) > a dead dir in the CURRENT shape is still reaped the ordinary way [148.47ms]
@bryance/orch test: 
@bryance/orch test: test\vocabulary.test.ts:
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > no table carries a role column: there is nothing to disagree with the tree [244.04ms]
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > renaming an agent or moving its lease never changes its role [182.75ms]
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > every role term orch displays comes from the one map [0.08ms]
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > no module outside the map spells a role term into a user-facing string [66.54ms]
@bryance/orch test: 
@bryance/orch test: test\command-refusal.test.ts:
@bryance/orch test: (pass) a command refusal is thrown, not exited > the refusal carries the reason a human needs [121.84ms]
@bryance/orch test: 
@bryance/orch test: test\no-sibling-relay.test.ts:
@bryance/orch test: (pass) a worker with no reachable spawner does not relay (L6) > an unset spawner refuses, and the refusal names the agent's own report path [195.49ms]
@bryance/orch test: 
@bryance/orch test: test\routing-hardening.test.ts:
@bryance/orch test: (pass) store hardening > a fresh store creates the full current schema with WAL enabled [183.40ms]
@bryance/orch test: (pass) store hardening > the store refuses a second open holding, so ownership cannot fork [210.43ms]
@bryance/orch test: (pass) store hardening > adoption closes the prior holding in the same step that opens the new one [162.12ms]
@bryance/orch test: (pass) store hardening > the attempt insert claim is exactly once [146.87ms]
@bryance/orch test: 
@bryance/orch test: test\wake.test.ts:
@bryance/orch test: (pass) wake signal > next resolves on wake [1.12ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-reconnect.test.ts:
@bryance/orch test: (pass) RPC JSON framing > rejects malformed object that only has an id [9.87ms]
@bryance/orch test: 
@bryance/orch test: test\wake.test.ts:
@bryance/orch test: (pass) wake signal > next resolves after the timeout with no wake [13.49ms]
@bryance/orch test: (pass) wake signal > two concurrent next calls both resolve on one wake [0.24ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-registration.test.ts:
@bryance/orch test: (pass) machine daemon registration > the refusal a second start prints names the live daemon's pid [25.19ms]
@bryance/orch test: (pass) machine daemon registration > doctor names both when a second daemon is live beside the registered one [44.92ms]
@bryance/orch test: (pass) machine daemon registration > evicts a registration whose process instance no longer matches [22.89ms]
@bryance/orch test: (pass) machine daemon registration > routes a different orch dir to its own runtime files [28.14ms]
@bryance/orch test: (pass) machine daemon registration > doctor distinguishes registered-but-dead from live-and-registered [53.98ms]
@bryance/orch test: 
@bryance/orch test: test\commands-resolve.test.ts:
@bryance/orch test: (pass) commands/resolve > rejects an unknown target [168.14ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-reconnect.test.ts:
@bryance/orch test: (pass) RPC JSON framing > parses split and multiple newline-delimited frames [39.01ms]
@bryance/orch test: 
@bryance/orch test: test\presence-history-queue.test.ts:
@bryance/orch test: (pass) presence history queue > appendStatusHistory writes only when flushed [10.76ms]
@bryance/orch test: 
@bryance/orch test: test\wall-single-owner.test.ts:
@bryance/orch test: (pass) space wall ownership > keeps the wall decision primitive in one source module [24.14ms]
@bryance/orch test: 
@bryance/orch test: test\commands-spawn.test.ts:
@bryance/orch test: (pass) commands/spawn > refuses an invalid name before resolving or creating a workspace [31.34ms]
@bryance/orch test: 
@bryance/orch test: test\presence-history-queue.test.ts:
@bryance/orch test: (pass) presence history queue > preserves call order for multiple appends [14.17ms]
@bryance/orch test: (pass) presence history queue > writes results and outcomes in one flush [26.55ms]
@bryance/orch test: (pass) presence history queue > reports a failed append without throwing [4.41ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-renags-questions.test.ts:
@bryance/orch test: (pass) question re-ask policy > nothing due emits nothing [0.50ms]
@bryance/orch test: (pass) question re-ask policy > an overdue question emits its first re-ask [0.36ms]
@bryance/orch test: (pass) question re-ask policy > an emitted re-ask waits for the interval before emitting again [0.23ms]
@bryance/orch test: (pass) question re-ask policy > a settled question emits no further re-asks [0.11ms]
@bryance/orch test: (pass) question re-ask policy > the limit emits one final gave-up event and then stays silent [0.15ms]
@bryance/orch test: 
@bryance/orch test: test\provenance.test.ts:
@bryance/orch test: (pass) the one provenance walk > ancestors are parent-first, root last [0.17ms]
@bryance/orch test: (pass) the one provenance walk > depth counts hops to the root [0.20ms]
@bryance/orch test: (pass) the one provenance walk > an unknown id is its own root at depth 0 [0.04ms]
@bryance/orch test: (pass) the one provenance walk > an unknown parent ends the chain instead of throwing [0.07ms]
@bryance/orch test: (pass) the one provenance walk > descendant is any depth, never self, never a sibling tree [0.08ms]
@bryance/orch test: (pass) the one provenance walk > a cycle terminates [0.17ms]
@bryance/orch test: 
@bryance/orch test: test\agent-key-is-minted-id.test.ts:
@bryance/orch test: (pass) a driving session mints an id, it is not placed by name > the presence directory is named by that id alone [2.53ms]
@bryance/orch test: (pass) a driving session mints an id, it is not placed by name > a launch that handed over a minted id is used verbatim [3.78ms]
@bryance/orch test: (pass) this process's own identity is the id and nothing else > a spawned agent answers with the id its launch handed it [849.34ms]
@bryance/orch test: (pass) the fleet wall is lifted by the absence of a launch, not by a key's shape > an agent orch launched may not cross into another project's fleet [233.61ms]
@bryance/orch test: (pass) who drives an agent is looked up by its id > the key IS the agent id ΓÇö no segment is split out of it [1159.43ms]
@bryance/orch test: (pass) who drives an agent is looked up by its id > a composite key addresses no agent at all [170.61ms]
@bryance/orch test: (pass) doctor reads a presence directory name as an id > a composite directory name is a malformed identity key [7.08ms]
@bryance/orch test: (pass) doctor reads a presence directory name as an id > a minted id is well formed, with or without a status row [209.05ms]
@bryance/orch test: 
@bryance/orch test: test\reap-picker.test.ts:
@bryance/orch test: (pass) reapCandidates > classifies unleased dead holders and leased dead processes [1.13ms]
@bryance/orch test: 
@bryance/orch test: test\command-space-fields.test.ts:
@bryance/orch test: (pass) command space fields > status and wall entities use the composed space, and it is nowhere in the key [175.18ms]
@bryance/orch test: 
@bryance/orch test: test\work-loop-binding.test.ts:
@bryance/orch test: (pass) work loop attempt binding > statusSpeaksForTask verifies the current attempt dispatch id [0.79ms]
@bryance/orch test: 
@bryance/orch test: test\agent-model-unwelded.test.ts:
@bryance/orch test: (pass) A1 ΓÇö the four facts are never welded > no table welds identity, provenance, ownership and environment into one row [2.28ms]
@bryance/orch test: (pass) A1 ΓÇö the four facts are never welded > ownership is a lease table, not a second id space [1.18ms]
@bryance/orch test: (pass) A1 ΓÇö the four facts are never welded > the agents hub carries identity and provenance only [0.68ms]
@bryance/orch test: (pass) A1 ΓÇö the four facts are never welded > no table anywhere carries a lifetime [7.82ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-repins-on-settings-change.test.ts:
@bryance/orch test: (pass) daemon settings tuning re-pin > pins every live agent to the resolved settings default [28.03ms]
@bryance/orch test: 
@bryance/orch test: test\commands-spawn.test.ts:
@bryance/orch test: (pass) commands/spawn > refuses spawn without a name before any spawn mutations [162.67ms]
@bryance/orch test: (pass) commands/spawn > rejects removed spawn cap flag as unknown [0.36ms]
@bryance/orch test: (pass) commands/spawn > rejects --detached as an unknown spawn flag [24.79ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: (pass) fleet ownership scoping > close --all works from an unregistered shell [1595.99ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-repins-on-settings-change.test.ts:
@bryance/orch test: (pass) daemon settings tuning re-pin > keeps the tuning a pinned agent holds and tunes only the unpinned one [9.06ms]
@bryance/orch test: (pass) daemon settings tuning re-pin > does not pin when tuning settings did not change [12.47ms]
@bryance/orch test: (pass) daemon settings tuning re-pin > continues re-pinning after one agent fails [21.36ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a named space is orch's own id, and the workspace is its RECORDED home [1076.48ms]
@bryance/orch test: 
@bryance/orch test: test\commands-spawn.test.ts:
@bryance/orch test: (pass) commands/spawn > the positionals are the agent names [0.31ms]
@bryance/orch test: (pass) commands/spawn > collects repeated prompts in agent order [0.18ms]
@bryance/orch test: (pass) commands/spawn > collects repeated files and models in order [0.07ms]
@bryance/orch test: (pass) commands/spawn > collects repeated models in order [0.03ms]
@bryance/orch test: (pass) commands/spawn > resolves one prompt file per agent [21.77ms]
@bryance/orch test: (pass) commands/spawn > reuses one prompt file for every agent [11.47ms]
@bryance/orch test: (pass) commands/spawn > refuses an incorrect number of prompt files [2.37ms]
@bryance/orch test: (pass) commands/spawn > refuses stdin prompt files more than once [1.74ms]
@bryance/orch test: (pass) commands/spawn > resolves one model per agent [3.87ms]
@bryance/orch test: (pass) commands/spawn > refuses an incorrect number of models [2.34ms]
@bryance/orch test: (pass) commands/spawn > each pi flavor launches its own binary and preserves raw prompt [0.28ms]
@bryance/orch test: 
@bryance/orch test: test\no-sibling-relay.test.ts:
@bryance/orch test: (pass) a worker with no reachable spawner does not relay (L6) > the refusal never suggests another agent as an alternative route [182.88ms]
@bryance/orch test: (pass) a worker with no reachable spawner does not relay (L6) > a spawner that is stamped but has no live status record refuses by NAME and still says to report [164.04ms]
@bryance/orch test: 
@bryance/orch test: test\reap-picker.test.ts:
@bryance/orch test: (pass) reapCandidates > classifies empty input [0.09ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-herdr-headless.test.ts:
@bryance/orch test: (pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [466.27ms]
@bryance/orch test: (pass) headless common path: identity key -> presence > one adapter uses the same opaque key across headless and tmux routes [0.38ms]
@bryance/orch test: (pass) headless common path: identity key -> presence > a key carries no environment to read back out of it [0.06ms]
@bryance/orch test: 
@bryance/orch test: test\no-stderr-writes.test.ts:
@bryance/orch test: (pass) orch has one diagnosis channel (the logger) and one output channel (stdout) > no runtime source writes to process.stderr [47.84ms]
@bryance/orch test: (pass) orch has one diagnosis channel (the logger) and one output channel (stdout) > the scan actually covers the tree it claims to [3.91ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-tmux.test.ts:
@bryance/orch test: (pass) tmux backend registry and capabilities > is registered [0.26ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > with no space, orch INSIDE the plexer spawns beside itself and opens nothing [151.08ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-tmux.test.ts:
@bryance/orch test: (pass) tmux backend registry and capabilities > explicit selection follows tmux availability [26.20ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > exposes pane roles [0.17ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > reflects the TMUX environment [0.23ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > a tmux agent's key is the minted id, never its pane [0.22ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > selects an available placing environment, whichever one the caller sits in [0.34ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > falls back to headless only when no environment can place an agent [0.15ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > an installed plexer is selectable from outside its session, and refuses in its own words [0.43ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > herdr is selectable from outside a herdr session [0.10ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: {"closed":["caller","klmine0001","other","klforeign1"],"results":[{"target":"caller","handle":null,"outcome":"done","error":null},{"target":"klmine0001","handle":"mine","outcome":"done","error":null},{"target":"other","handle":null,"outcome":"done","error":null},{"target":"klforeign1","handle":"foreign","outcome":"done","error":null}],"requested":4,"ok":4,"stream":false}
@bryance/orch test: (pass) fleet ownership scoping > close --all closes all managed records regardless of owner [206.28ms]
@bryance/orch test: 
@bryance/orch test: test\command-space-fields.test.ts:
@bryance/orch test: (pass) command space fields > skipBackends keeps the authoritative presence entity shape [161.73ms]
@bryance/orch test: (pass) command space fields > status reports a mixed pi and Claude fleet with the same identity fields [143.31ms]
@bryance/orch test: 
@bryance/orch test: test\notifier-adapters.test.ts:
@bryance/orch test: (pass) notifier registry and built-in adapters > reports notifier reachability from one configured entry [1.01ms]
@bryance/orch test: (pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [1.15ms]
@bryance/orch test: (pass) notifier registry and built-in adapters > a notifier error is the caller's real error [0.39ms]
@bryance/orch test: 
@bryance/orch test: test\queue-cli-scope.test.ts:
@bryance/orch test: (pass) Cq2: all three scopes are choosable at enqueue > --agent, --pack and --space each select exactly one typed scope [184.52ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a caller INSIDE the plexer whose recorded place is gone resolves no coordinate, never another [149.85ms]
@bryance/orch test: 
@bryance/orch test: test\work-loop-binding.test.ts:
@bryance/orch test: (pass) Cq4: results go to the enqueuer, not the runner > continuous work passes record tick timing [214.70ms]
@bryance/orch test: (pass) Cq4: results go to the enqueuer, not the runner > every task event the work loop publishes is keyed to whoever enqueued it [194.81ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-tmux.test.ts:
@bryance/orch test: (pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-space [167.12ms]
@bryance/orch test: 
@bryance/orch test: test\broker-governance.test.ts:
@bryance/orch test: (pass) daemon governWrite enforcement > an unscoped actor is refused while a live orch holds the lease [1099.93ms]
@bryance/orch test: 
@bryance/orch test: test\routing-hardening.test.ts:
@bryance/orch test: (pass) CLI offline routing > status --offline does not start or contact orchd [736.04ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a caller INSIDE the plexer with NO orch identity (a human's pane) spawns beside itself [116.10ms]
@bryance/orch test: 
@bryance/orch test: test\queue-cli-scope.test.ts:
@bryance/orch test: (pass) Cq2: all three scopes are choosable at enqueue > a name resolves to one id, and an ambiguous name asks for the id [144.25ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lifecycle.test.ts:
@bryance/orch test: (pass) commands/lifecycle > capability helpers fail closed when absent [747.45ms]
@bryance/orch test: 
@bryance/orch test: test\store-rebuild-schema.test.ts:
@bryance/orch test: (pass) rebuild schema > the store opens migrated, with foreign keys enabled [155.04ms]
@bryance/orch test: (pass) rebuild schema > all ten partial unique indexes allow only one open row [1578.77ms]
@bryance/orch test: (pass) rebuild schema > enforces foreign keys and agent checks [134.52ms]
@bryance/orch test: (pass) rebuild schema > requires exactly one task scope [150.70ms]
@bryance/orch test: (pass) rebuild schema > allows one open attempt only [158.19ms]
@bryance/orch test: (pass) rebuild schema > enforces lease checks and one lease [154.51ms]
@bryance/orch test: (pass) rebuild schema > remaining documented CHECKs and cascades are enforced [154.48ms]
@bryance/orch test: (pass) rebuild schema > task_states derives queued claimed and outcomes [126.02ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-declared-vs-reality.test.ts:
@bryance/orch test: (pass) doctor declared-vs-reality > reports a lease whose recorded holder process is dead [246.70ms]
@bryance/orch test: (pass) doctor declared-vs-reality > reports an environment handle missing from its plexer [153.26ms]
@bryance/orch test: (pass) doctor declared-vs-reality > reports a live agent with no lease and no live spawner [169.59ms]
@bryance/orch test: (pass) doctor declared-vs-reality > surfaces a missing task scope row as unrunnable [221.71ms]
@bryance/orch test: (pass) doctor declared-vs-reality > doctor -y does not delete an unrunnable task [280.43ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > with no space and orch OUTSIDE the plexer, the PACK gets its own marked home [128.04ms]
@bryance/orch test: 
@bryance/orch test: test\queue-cli-scope.test.ts:
@bryance/orch test: (pass) Cq2: all three scopes are choosable at enqueue > two scope flags at once are refused [123.25ms]
@bryance/orch test: 
@bryance/orch test: test\lifecycle-reports-a-partial-run.test.ts:
@bryance/orch test: (pass) a partial reload or restart is reported, not exited > reload --json writes the whole payload and sets exitCode, never exits [1173.75ms]
@bryance/orch test: 
@bryance/orch test: test\cli-help.test.ts:
@bryance/orch test: (pass) help from the registry > every handler word names a spec, and every spec has a handler [1.92ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-runtime.test.ts:
@bryance/orch test: (pass) shebangRuntime > reads #!/usr/bin/env node as node [42.37ms]
@bryance/orch test: 
@bryance/orch test: test\cli-help.test.ts:
@bryance/orch test: (pass) help from the registry > the map equals the golden file [0.78ms]
@bryance/orch test: (pass) help from the registry > the map starts with the header and lists every top-level usage under its section [0.51ms]
@bryance/orch test: (pass) help from the registry > a topic prints usage, doc, the flag table with spellings and placeholders, subcommands, then globals [0.64ms]
@bryance/orch test: (pass) help from the registry > a missing doc names the path and never throws [0.09ms]
@bryance/orch test: (pass) help from the registry > every shipped command has a doc that reads back, and doctor agrees [79.45ms]
@bryance/orch test: (pass) help from the registry > helpTopic resolves aliases and refuses unknown words [2.47ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > the same pack spawning again reuses its home and asks the human nothing [196.19ms]
@bryance/orch test: 
@bryance/orch test: test\store-runs.test.ts:
@bryance/orch test: (pass) run rows > round-trips every field, including a structured result [155.10ms]
@bryance/orch test: 
@bryance/orch test: test\cli-parse.test.ts:
@bryance/orch test: (pass) parseInvocation > positionals stay in order and no-value flags read as has() [0.62ms]
@bryance/orch test: (pass) parseInvocation > a one-value flag takes the next token or the assignment [0.13ms]
@bryance/orch test: (pass) parseInvocation > the value token is taken even when it starts with a dash [0.04ms]
@bryance/orch test: (pass) parseInvocation > a many-value flag collects in argv order, in both syntaxes [0.05ms]
@bryance/orch test: (pass) parseInvocation > an alias records under the long name [0.03ms]
@bryance/orch test: (pass) parseInvocation > a repeated one-value flag keeps the last value [0.02ms]
@bryance/orch test: (pass) parseInvocation > an unknown flag is refused with the usage line [0.29ms]
@bryance/orch test: (pass) parseInvocation > a one-value flag at the end of argv is refused [0.06ms]
@bryance/orch test: (pass) parseInvocation > a no-value flag with an assignment is refused [0.24ms]
@bryance/orch test: (pass) parseInvocation > a global flag is accepted on any command [0.07ms]
@bryance/orch test: (pass) parseInvocation > a subcommand word routes to the child and the path records the route [0.28ms]
@bryance/orch test: (pass) parseInvocation > openFlags keeps an undeclared flag as bare, assigned, or with the next token [0.20ms]
@bryance/orch test: (pass) parseInvocation > a closed spec refuses an undeclared flag and reports nothing undeclared [0.09ms]
@bryance/orch test: (pass) parseInvocation > no subcommand word stays on the parent [0.05ms]
@bryance/orch test: 
@bryance/orch test: test\work-loop-identity.test.ts:
@bryance/orch test: (pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > a claim records the minted agent id, not the presence key [244.37ms]
@bryance/orch test: 
@bryance/orch test: test\queue-cli-scope.test.ts:
@bryance/orch test: (pass) Cq9: reading the queue is open > listing and history carry no caller and hide no other pack's work [215.04ms]
@bryance/orch test: 
@bryance/orch test: test\cli-registry.test.ts:
@bryance/orch test: (pass) command registry > every spec has a usage line that starts with its path, and a summary [0.77ms]
@bryance/orch test: (pass) command registry > every flag has a help line, and a placeholder when it takes a value [1.05ms]
@bryance/orch test: (pass) command registry > no spec declares one spelling twice, or shadows a global flag [8.52ms]
@bryance/orch test: (pass) command registry > every top-level command has a section and a unique word; subcommands have neither a section nor a clash [0.72ms]
@bryance/orch test: (pass) command registry > every top-level command has a non-empty doc file in help/ [8.30ms]
@bryance/orch test: (pass) command registry > a command word resolves by name or alias [0.20ms]
@bryance/orch test: 
@bryance/orch test: test\lifecycle-reports-a-partial-run.test.ts:
@bryance/orch test: (pass) a partial reload or restart is reported, not exited > restart --json writes the whole payload and sets exitCode, never exits [232.27ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-runtime.test.ts:
@bryance/orch test: (pass) shebangRuntime > reads #!/usr/bin/env bun as bun [17.26ms]
@bryance/orch test: (pass) shebangRuntime > reads #!/usr/bin/env deno as deno [5.59ms]
@bryance/orch test: (pass) shebangRuntime > reads #!/usr/local/bin/node as node [13.38ms]
@bryance/orch test: (pass) shebangRuntime > does not mistake a longer binary name for a runtime [19.59ms]
@bryance/orch test: (pass) shebangRuntime > returns null for a file with no shebang [17.67ms]
@bryance/orch test: (pass) shebangRuntime > returns null for an unreadable path [1.57ms]
@bryance/orch test: (pass) runningRuntime > reports the runtime this suite is executing under [0.18ms]
@bryance/orch test: (pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [8.65ms]
@bryance/orch test: (pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [5.35ms]
@bryance/orch test: (pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [4.33ms]
@bryance/orch test: (pass) doctor runtime verdict table > launching under bun while declaring node is fine [4.33ms]
@bryance/orch test: (pass) doctor runtime verdict table > launching under node while declaring bun is fine [7.67ms]
@bryance/orch test: (pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [7.49ms]
@bryance/orch test: (pass) doctor runtime verdict table > declared runtime absent from PATH fails [6.82ms]
@bryance/orch test: (pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [9.17ms]
@bryance/orch test: (pass) doctor runtime verdict table > remediation names both directions ΓÇö rebuild, or re-record the declaration [4.57ms]
@bryance/orch test: (pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [1.14ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > an environment that holds nothing answers with an absence, never a refusal [124.62ms]
@bryance/orch test: 
@bryance/orch test: test\lifecycle-targets.test.ts:
@bryance/orch test: (pass) lifecycle target resolution > prefers one live agent over dead ones sharing its name [0.26ms]
@bryance/orch test: (pass) lifecycle target resolution > reports the target and disambiguating ids for live ambiguity [0.32ms]
@bryance/orch test: (pass) lifecycle target resolution > cleanup can still resolve a dead agent when no live match exists [0.05ms]
@bryance/orch test: (pass) lifecycle target resolution > an agent is addressable by its id, its name, or its pane handle [0.04ms]
@bryance/orch test: (pass) lifecycle target resolution > the pane is environment: moving it leaves every other address intact [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\log-level.test.ts:
@bryance/orch test: (pass) the configured log level reaches every logger > the env var wins over settings.json [30.29ms]
@bryance/orch test: 
@bryance/orch test: test\commands-results.test.ts:
@bryance/orch test: (pass) commands/results > renders daemon questions with the existing JSON shape [1081.06ms]
@bryance/orch test: 
@bryance/orch test: test\space-policy.test.ts:
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > two unspaced agents in the SAME repo root can reach each other [191.35ms]
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > two unspaced agents in DIFFERENT repo roots cannot [156.19ms]
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > an agent placed in no space reports none, even inside a plexer workspace [143.57ms]
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > recording a spawn never conjures the space it names [152.06ms]
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > a space still walls, and it outranks the repo root [154.30ms]
@bryance/orch test: (pass) space policy > reads the space from the environment satellite, and absence is null [132.92ms]
@bryance/orch test: (pass) space policy > resolves space names through records and functions [0.41ms]
@bryance/orch test: (pass) space policy > compares agents by the space each is composed into [150.72ms]
@bryance/orch test: (pass) space policy > enforces the space wall across every plexer alike [121.23ms]
@bryance/orch test: (pass) space policy > scopes agents to the current space [108.63ms]
@bryance/orch test: (pass) space policy > a null current space leaves items unscoped [164.12ms]
@bryance/orch test: (pass) space policy > 2.7 status displays the composed space, not text sliced from a key [163.63ms]
@bryance/orch test: (pass) space policy > 6.6 structured identity drives status and policy, not serialized key text [131.56ms]
@bryance/orch test: 
@bryance/orch test: test\commands-results.test.ts:
@bryance/orch test: (pass) commands/results > renders exactly the pending questions returned by the daemon [22.11ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a space with no home HERE places the fleet without borrowing another plexer's [177.81ms]
@bryance/orch test: 
@bryance/orch test: test\work-loop-identity.test.ts:
@bryance/orch test: (pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > an idle process with no registered agent row is never handed pack work [152.95ms]
@bryance/orch test: (pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > Cq1: the pack drains its own queue with its orch dead and no lease in force [145.78ms]
@bryance/orch test: 
@bryance/orch test: test\reap-picker.test.ts:
@bryance/orch test: (pass) cmdReap > prints the --dead --json result shape [1223.56ms]
@bryance/orch test: 
@bryance/orch test: test\store-agent-rows.test.ts:
@bryance/orch test: (pass) agent store rows > insertAgent materializes the provenance root [152.17ms]
@bryance/orch test: (pass) agent store rows > endAgent records who closed it, nullable for death [180.21ms]
@bryance/orch test: (pass) agent store rows > liveAgents excludes agents with an ending [142.12ms]
@bryance/orch test: (pass) agent store rows > packMembers selects the materialized root [135.91ms]
@bryance/orch test: (pass) agent store rows > unknown harness is rejected by the foreign key [120.80ms]
@bryance/orch test: (pass) agent store rows > unknown spawnedBy is rejected by the foreign key [110.02ms]
@bryance/orch test: (pass) agent store rows > label maps both null and a value [107.07ms]
@bryance/orch test: (pass) agent store rows > created_at is an INTEGER epoch millisecond [96.37ms]
@bryance/orch test: (pass) agent store rows > worktreeOf distinguishes repo agents from worktree agents [186.50ms]
@bryance/orch test: (pass) agent store rows > renameAgent is id-keyed and leaves identity history unchanged [120.08ms]
@bryance/orch test: (pass) agent store rows > lookup ensure operations are insert-or-ignore [119.10ms]
@bryance/orch test: (pass) agent store rows > childrenOf returns direct descendants [126.31ms]
@bryance/orch test: 
@bryance/orch test: test\reap-picker.test.ts:
@bryance/orch test: (pass) cmdReap > refuses bare reap when stdin is not a TTY [0.69ms]
@bryance/orch test: 
@bryance/orch test: test\events-open-with-pending-questions.test.ts:
@bryance/orch test: (pass) events pending-question snapshot > a late watcher receives every open question through the event writer [930.99ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lifecycle.test.ts:
@bryance/orch test: (pass) commands/lifecycle > reports missing bridge pid without touching backend [670.47ms]
@bryance/orch test: 
@bryance/orch test: test\log-level.test.ts:
@bryance/orch test: (pass) the configured log level reaches every logger > settings.json is used when the env var is unset [16.17ms]
@bryance/orch test: (pass) the configured log level reaches every logger > an unrecognised env value falls back to the configured level [13.30ms]
@bryance/orch test: (pass) the configured log level reaches every logger > the CLI logger honours the configured level [16.03ms]
@bryance/orch test: (pass) the configured log level reaches every logger > the CLI logger drops records below the configured level [10.69ms]
@bryance/orch test: (pass) the configured log level reaches every logger > the daemon logger resolves through the same helper [28.36ms]
@bryance/orch test: (pass) the configured log level reaches every logger > setLevel updates existing children [16.31ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-settings-defects.test.ts:
@bryance/orch test: (pass) doctor settings defects > accepts an absent settings file [12.82ms]
@bryance/orch test: 
@bryance/orch test: test\queue-reaping.test.ts:
@bryance/orch test: (pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > a failed task whose scope is gone is unrunnable and survives every retention sweep [233.53ms]
@bryance/orch test: 
@bryance/orch test: test\doctor.test.ts:
@bryance/orch test: (pass) runDoctor > warns when the live daemon code hash is stale [196.34ms]
@bryance/orch test: (pass) runDoctor > fails on an invalid lock and an unanswerable live socket [427.30ms]
@bryance/orch test: (pass) runDoctor > warns when the extension bundle is absent for a matching live hash [160.60ms]
@bryance/orch test: (pass) runDoctor > warns when the extension bundle is absent for a stale live hash [220.20ms]
@bryance/orch test: (pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [196.44ms]
@bryance/orch test: (pass) runDoctor > reports a dead presence pid [328.63ms]
@bryance/orch test: (pass) runDoctor > bins check is driven by the enabled set and offers no fix [149.38ms]
@bryance/orch test: (pass) runDoctor > applyFixes reports exactly the changes it applies [5.13ms]
@bryance/orch test: (pass) runDoctor > validates configured notifier adapters [643.30ms]
@bryance/orch test: (pass) runDoctor > reports invalid settings and accepts missing settings [399.58ms]
@bryance/orch test: (pass) runDoctor > never throws when individual checks encounter broken inputs [315.56ms]
@bryance/orch test: 
@bryance/orch test: test\log-record.test.ts:
@bryance/orch test: (pass) the one log record shape > writes one JSONL record per call, with an epoch-millis instant [18.44ms]
@bryance/orch test: (pass) the one log record shape > a record below the configured level is not written at all [27.91ms]
@bryance/orch test: (pass) the one log record shape > a correlation id rides every record of one dispatch, so one grep finds its whole life [17.20ms]
@bryance/orch test: (pass) the one log record shape > agentId carries orch's minted id; a plexer handle is a field, never the identity [13.56ms]
@bryance/orch test: (pass) the one log record shape > every level is orderable, lowest to highest [0.08ms]
@bryance/orch test: (pass) the one log record shape > a malformed line is rejected by the guard rather than trusted [0.09ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc-identity.test.ts:
@bryance/orch test: (pass) daemon identity RPCs > claim-identity stamps a minted id [1093.44ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-policy.test.ts:
@bryance/orch test: (pass) spawn policy caps > spawn, dispatch, reset, and model share one resolved tuning [36.07ms]
@bryance/orch test: 
@bryance/orch test: test\store-catalogue.test.ts:
@bryance/orch test: (pass) catalogue rows > empty store reads an empty Map [116.64ms]
@bryance/orch test: 
@bryance/orch test: test\reap-walks-provenance.test.ts:
@bryance/orch test: (pass) reap walks the provenance tree (H3) > a dead agent with a live descendant is NOT reaped [146.02ms]
@bryance/orch test: 
@bryance/orch test: test\store-runs.test.ts:
@bryance/orch test: (pass) run rows > upsert updates a row while preserving its original start time [114.28ms]
@bryance/orch test: (pass) run rows > orders by started time, filters by agent, and honours limit [119.35ms]
@bryance/orch test: (pass) run rows > omits absent optional fields instead of returning null [106.20ms]
@bryance/orch test: (pass) run rows > deletes only rows older than the cutoff and returns the count [90.67ms]
@bryance/orch test: (pass) run rows > stays readable after the agent presence directory is deleted [148.24ms]
@bryance/orch test: 
@bryance/orch test: test\events-scope-notice.test.ts:
@bryance/orch test: (pass) events scope notice > names the default live scope and its wideners [0.35ms]
@bryance/orch test: (pass) events scope notice > names the all-agent live scope and its history widener [1.34ms]
@bryance/orch test: (pass) events scope notice > a redirected stream is a harness reading transitions, and gets no banner [0.08ms]
@bryance/orch test: (pass) events scope notice > does not announce when history was requested [7.79ms]
@bryance/orch test: (pass) events scope notice > writes one notice before starting the live transport [0.48ms]
@bryance/orch test: (pass) events scope notice > does not write a notice when history was requested [0.15ms]
@bryance/orch test: (pass) events scope notice > says so when the caller owns no agents [0.18ms]
@bryance/orch test: (pass) events scope notice > the empty notice names the verb that armed the stream [0.25ms]
@bryance/orch test: (pass) events scope notice > stays out of a --json stream, which a parser is reading [0.26ms]
@bryance/orch test: (pass) events scope notice > does not announce when explicit targets were requested [0.20ms]
@bryance/orch test: 
@bryance/orch test: test\space-walls.test.ts:
@bryance/orch test: (pass) space helpers > reads space ids from the environment satellite, never from the key [3.22ms]
@bryance/orch test: 
@bryance/orch test: test\commands-status.test.ts:
@bryance/orch test: (pass) commands/status > reads fleet rows from the served daemon [1172.71ms]
@bryance/orch test: 
@bryance/orch test: test\work-notify.test.ts:
@bryance/orch test: (pass) orch presence notifications > delivers a presence transition through a configured command sink [265.47ms]
@bryance/orch test: 
@bryance/orch test: test\environment-dictates-what-is-possible.test.ts:
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > a MOVE is a new environment record, and what is possible follows it at once [155.68ms]
@bryance/orch test: 
@bryance/orch test: test\peer-lease-visibility.test.ts:
@bryance/orch test: (pass) peer summaries carry ownership as a lease > a peer the caller holds reports the caller as the live holder [1009.40ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-settings-defects.test.ts:
@bryance/orch test: (pass) doctor settings defects > accepts a clean settings file and keeps its path detail [9.13ms]
@bryance/orch test: (pass) doctor settings defects > reports malformed JSON as a file defect [2.55ms]
@bryance/orch test: (pass) doctor settings defects > reports a read failure instead of throwing [2.54ms]
@bryance/orch test: (pass) doctor settings defects > reports a stale key with the value that was written [35.79ms]
@bryance/orch test: (pass) doctor settings defects > reports a typo with its suggested key [19.74ms]
@bryance/orch test: (pass) doctor settings defects > reports the expected schema version [16.19ms]
@bryance/orch test: (pass) doctor settings defects > skips settings-dependent checks with a short repair hint [364.26ms]
@bryance/orch test: 
@bryance/orch test: test\store-task-rows.test.ts:
@bryance/orch test: (pass) task and attempt rows > malformed task rows are refused instead of handed back as typed data [150.13ms]
@bryance/orch test: 
@bryance/orch test: test\queue-reaping.test.ts:
@bryance/orch test: (pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > unrunnable is about who is alive now ΓÇö a new pack member makes it claimable again [120.06ms]
@bryance/orch test: (pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > stale is surfaced beside its state and never deleted on age [95.99ms]
@bryance/orch test: (pass) Cq12: an orphaned task has take-on, leave and reap, all deliberate > take-on re-scopes to the taker's own pack and the work becomes claimable there [114.72ms]
@bryance/orch test: (pass) Cq12: an orphaned task has take-on, leave and reap, all deliberate > take-on refuses a taker that is not itself live [154.23ms]
@bryance/orch test: 
@bryance/orch test: test\session.test.ts:
@bryance/orch test: (pass) parseSession > returns an empty view for null and missing paths [0.32ms]
@bryance/orch test: 
@bryance/orch test: test\work-survives-its-spawner.test.ts:
@bryance/orch test: (pass) work survives its spawner, always (D1) > ending the spawner leaves the child live, unended and still listed [171.71ms]
@bryance/orch test: 
@bryance/orch test: test\reap-walks-provenance.test.ts:
@bryance/orch test: (pass) reap walks the provenance tree (H3) > the tree is reaped from the LEAF up [94.64ms]
@bryance/orch test: (pass) reap walks the provenance tree (H3) > a LIVE descendant blocks the reap of every ancestor [126.92ms]
@bryance/orch test: (pass) reap walks the provenance tree (H3) > provenance has no ON DELETE CASCADE, so no reap can erase a subtree [148.94ms]
@bryance/orch test: 
@bryance/orch test: test\loop-watchdog.test.ts:
@bryance/orch test: (pass) loop watchdog > logs a stalled loop when the interval max delay passes the threshold [406.69ms]
@bryance/orch test: 
@bryance/orch test: test\recipient-label.test.ts:
@bryance/orch test: (pass) agent identity shown to an operator > names the agent and its harness, never the transport key [0.09ms]
@bryance/orch test: (pass) agent identity shown to an operator > drops the routing prefix when nothing is known about it [0.02ms]
@bryance/orch test: (pass) agent identity shown to an operator > a nameless agent gets a stable logical name, not its key [0.07ms]
@bryance/orch test: 
@bryance/orch test: test\session.test.ts:
@bryance/orch test: (pass) parseSession > handles model, thinking, user, assistant, tool, and unknown entries [18.04ms]
@bryance/orch test: (pass) parseSession > joins text blocks and ignores non-text blocks [15.07ms]
@bryance/orch test: 
@bryance/orch test: test\every-agent-has-a-link.test.ts:
@bryance/orch test: (pass) every agent has an attached link > agents in placed, headless, and handleless environments receive the same push [231.50ms]
@bryance/orch test: 
@bryance/orch test: test\commands-clean.test.ts:
@bryance/orch test: {"malformed":[],"closed":0,"removed":["deadagent1"],"worktrees":0}
@bryance/orch test: (pass) commands/clean > the forced sweep reaps dead agent dirs but preserves live processes [1247.04ms]
@bryance/orch test: 
@bryance/orch test: test\loop-watchdog.test.ts:
@bryance/orch test: (pass) loop watchdog > does not log when the loop stays below the threshold [151.43ms]
@bryance/orch test: 
@bryance/orch test: test\backend-space-home.test.ts:
@bryance/orch test: (pass) tmux space home > focus switches the client to the session holding the space [0.12ms]
@bryance/orch test: (pass) tmux space home > create names the session after the space and returns its root window and pane [0.22ms]
@bryance/orch test: (pass) tmux space home > rename and close address the session coordinate [0.05ms]
@bryance/orch test: (pass) tmux space home > list reports every session as a coordinate with a label [0.15ms]
@bryance/orch test: (pass) a home orch opens is never unmarked (E8) > an unlabelled pack home is named for the pack it was opened for [0.10ms]
@bryance/orch test: (pass) a home orch opens is never unmarked (E8) > an unlabelled space home is named for the space, not for the pack [0.05ms]
@bryance/orch test: (pass) a home orch opens is never unmarked (E8) > a subject id the plexer would refuse is made safe, never passed through [0.04ms]
@bryance/orch test: (pass) a home orch opens is never unmarked (E8) > a caller-supplied label is used verbatim [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\every-agent-has-a-link.test.ts:
@bryance/orch test: (pass) every agent has an attached link > an agent with no handle is still addressable through its link [182.95ms]
@bryance/orch test: 
@bryance/orch test: test\broker-governance.test.ts:
@bryance/orch test: (pass) daemon governWrite enforcement > an unscoped actor may write to an unleased target [124.97ms]
@bryance/orch test: (pass) daemon governWrite enforcement > the lease holder may write to its own agent [116.52ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a foreign live holder in the same space is refused and named [176.51ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a dead holder is not a collision [109.41ms]
@bryance/orch test: (pass) daemon governWrite enforcement > --steal on a driving verb does not take a live holder's lease [108.38ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a cross-space write is refused by the wall before the lease [119.85ms]
@bryance/orch test: (pass) daemon governWrite enforcement > --cross-space clears the wall but the lease still applies [110.10ms]
@bryance/orch test: (pass) daemon governWrite enforcement > the space operator writes to a same-space leased agent without taking the lease [123.61ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a foreign space's operator still hits the wall [148.51ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a refused enqueue leaves the lease exactly as it was [164.05ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a granted write and its enqueue commit together [133.91ms]
@bryance/orch test: (pass) daemon governWrite enforcement > an unleased target is writable by any same-space actor [146.02ms]
@bryance/orch test: 
@bryance/orch test: test\store-catalogue.test.ts:
@bryance/orch test: (pass) catalogue rows > write then read round-trips at and stdout [101.88ms]
@bryance/orch test: (pass) catalogue rows > writing the same command twice keeps one row with newer values [122.04ms]
@bryance/orch test: (pass) catalogue rows > an entry with empty stdout is not stored [118.09ms]
@bryance/orch test: (pass) catalogue rows > clearCatalogues empties the store [141.92ms]
@bryance/orch test: (pass) catalogue rows > two commands coexist and updating one does not touch the other [132.27ms]
@bryance/orch test: 
@bryance/orch test: test\work-survives-its-spawner.test.ts:
@bryance/orch test: (pass) work survives its spawner, always (D1) > a grandchild is untouched when the middle agent ends [145.78ms]
@bryance/orch test: (pass) work survives its spawner, always (D1) > the store has no lifetime column and no fate-sharing flag anywhere [0.72ms]
@bryance/orch test: (pass) work survives its spawner, always (D1) > spawn offers no flag that decides whether work outlives its spawner [1.05ms]
@bryance/orch test: (pass) work survives its spawner, always (D1) > closing the spawner never writes an ending for anything it spawned [193.53ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-reconnect.test.ts:
@bryance/orch test: (pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [2298.23ms]
@bryance/orch test: 
@bryance/orch test: test\commands-clean.test.ts:
@bryance/orch test: {"malformed":["herdr~wF~p9"],"closed":2,"removed":[],"worktrees":0}
@bryance/orch test: (pass) commands/clean > bare clean keeps ended agents as history and closes their queued writes [254.70ms]
@bryance/orch test: 
@bryance/orch test: test\backend-tmux.test.ts:
@bryance/orch test: (pass) TmuxBackend > current identity uses the explicit id, not the launch environment [3.99ms]
@bryance/orch test: 
@bryance/orch test: test\governance-stamp.test.ts:
@bryance/orch test: (pass) stampGovernance > returns the same params when caller is absent [14.32ms]
@bryance/orch test: 
@bryance/orch test: test\worker-prompt.test.ts:
@bryance/orch test: (pass) worker prompt capability composition > spawn clause follows maySpawn and stripping preserves the task [4.77ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-settings-preservation.test.ts:
@bryance/orch test: (pass) doctor settings preservation > yes mode leaves existing settings.json byte-identical [280.14ms]
@bryance/orch test: 
@bryance/orch test: test\space-walls.test.ts:
@bryance/orch test: (pass) space helpers > an agent that moves space keeps its identity and reports the new space [15.15ms]
@bryance/orch test: (pass) space helpers > derives an entity space from the store [0.25ms]
@bryance/orch test: (pass) space helpers > returns the same entities when all spaces are requested [705.47ms]
@bryance/orch test: (pass) space wall writes > allows a write within the same space [0.09ms]
@bryance/orch test: (pass) space wall writes > denies a cross-space write with both spaces in the reason [0.05ms]
@bryance/orch test: (pass) space wall writes > applies the same wall rule whatever plexer the agents sit in [0.10ms]
@bryance/orch test: (pass) space wall writes > allows a cross-space write with an explicit override [0.02ms]
@bryance/orch test: (pass) space wall writes > allows unplaced targets [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\control-dispatch.test.ts:
@bryance/orch test: (pass) deliverControl bridge dispatch > reports a detached bridge for a live agent [167.22ms]
@bryance/orch test: (pass) deliverControl bridge dispatch > reports a gone agent before pushing to its link [185.87ms]
@bryance/orch test: (pass) deliverControl bridge dispatch > answers only when status has no pending question [228.39ms]
@bryance/orch test: (pass) deliverControl bridge dispatch > pushes an answer with the asking question id [188.07ms]
@bryance/orch test: (pass) deliverControl bridge dispatch > pushes model changes and waits for the control outcome [1126.05ms]
@bryance/orch test: (pass) deliverControl bridge dispatch > rejects an outcome whose applied pin differs from the request [980.19ms]
@bryance/orch test: (pass) deliverControl bridge dispatch > uses the backend input path when the adapter bridge takes no steers [193.08ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lifecycle.test.ts:
@bryance/orch test: (pass) commands/lifecycle > --all targets the agents this orch holds a live lease on, and drops them when it releases [1058.89ms]
@bryance/orch test: 
@bryance/orch test: test\close-always.test.ts:
@bryance/orch test: {"closed":["panename01","panekey001","paneid0001"],"results":[{"target":"panename01","handle":"pane-name","outcome":"done","error":null},{"target":"panekey001","handle":"pane-key","outcome":"done","error":null},{"target":"paneid0001","handle":"pane-id","outcome":"done","error":null}],"requested":3,"ok":3,"stream":false}
@bryance/orch test: (pass) close always works > closes a foreign-space target by name, key, or pane id [1087.31ms]
@bryance/orch test: 
@bryance/orch test: test\store-connection-guards.test.ts:
@bryance/orch test: (pass) store migration guards > a store predating the migrations is refused, not rebuilt over [162.01ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc-identity.test.ts:
@bryance/orch test: (pass) daemon identity RPCs > claim-identity refuses an unknown id by naming it [909.67ms]
@bryance/orch test: 
@bryance/orch test: test\commands-clean.test.ts:
@bryance/orch test: {"malformed":[],"closed":1,"removed":["deadagent1"],"worktrees":0}
@bryance/orch test: (pass) commands/clean > --force reaps the ended agent and closes its queued writes [185.56ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-policy.test.ts:
@bryance/orch test: (pass) spawn policy caps > an agent's own pin outranks the default and only this command's flags outrank the pin [6.33ms]
@bryance/orch test: (pass) spawn policy caps > launch env uses the minted agent id name [0.10ms]
@bryance/orch test: (pass) spawn policy caps > worker prompt depth > root worker maySpawn follows max_depth [0.08ms]
@bryance/orch test: (pass) spawn policy caps > allows a pack spawn while under the cap [0.52ms]
@bryance/orch test: (pass) spawn policy caps > blocks an at-cap spawn and offers dispatch or the pack queue [0.27ms]
@bryance/orch test: (pass) spawn policy caps > a slave may not spawn by default: fleet.max_depth is 1 [0.10ms]
@bryance/orch test: (pass) spawn policy caps > fleet.max_depth 2 lets a slave spawn and refuses its child [0.28ms]
@bryance/orch test: (pass) spawn policy caps > reads a pack cap override from settings [21.23ms]
@bryance/orch test: (pass) spawn policy caps > a tab holds at most fleet.max_agents_per_tab agents, counting what it already holds [16.72ms]
@bryance/orch test: 
@bryance/orch test: test\environment-dictates-what-is-possible.test.ts:
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > a move closes the interval it left, so history says WHERE it was and WHEN [148.49ms]
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > moving one axis leaves every other axis exactly where it was [144.58ms]
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > an UPGRADE is a NEW host_plexers row, not an overwrite of the old one [120.84ms]
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > re-declaring the SAME version is not an upgrade and opens no second row [182.96ms]
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > nothing anywhere records what an agent CAN do [129.98ms]
@bryance/orch test: 
@bryance/orch test: test\broker-ownership.test.ts:
@bryance/orch test: (pass) broker ownership and space governance > the composed holder is the only ownership record, and adoption moves it [154.18ms]
@bryance/orch test: 
@bryance/orch test: test\settings-command.test.ts:
@bryance/orch test: (pass) orch settings > every registered setting is reachable through --json [472.18ms]
@bryance/orch test: 
@bryance/orch test: test\worker-prompt.test.ts:
@bryance/orch test: (pass) worker prompt capability composition > orch run composition selects the same header per adapter [10.11ms]
@bryance/orch test: (pass) worker prompt capability composition > the worker header does not instruct a lock that does not lock [0.39ms]
@bryance/orch test: (pass) worker prompt capability composition > the header addresses the agent, and names no plexer furniture [0.06ms]
@bryance/orch test: (pass) worker prompt capability composition > the verify clause names the configured commands, and asks for the repository's own when there are none [0.05ms]
@bryance/orch test: (pass) worker prompt capability composition > locked-commands clause names the commands, and asks for a report rather than a lock [0.03ms]
@bryance/orch test: (pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.02ms]
@bryance/orch test: (pass) worker prompt capability composition > the reply-to-spawner clause needs a reachable spawner, not just a bridge-enabled worker [0.03ms]
@bryance/orch test: (pass) worker prompt capability composition > unreachable spawner tells the worker to finish and end without relaying [0.04ms]
@bryance/orch test: (pass) worker prompt capability composition > reachable spawner permits replying to the spawner only [0.02ms]
@bryance/orch test: (pass) worker prompt capability composition > a reachable spawner still earns no clause when the worker has no bridge [0.01ms]
@bryance/orch test: (pass) worker prompt capability composition > the ask clause follows the bridge actions [0.15ms]
@bryance/orch test: (pass) worker prompt capability composition > events strip both worker header variants [169.44ms]
@bryance/orch test: 
@bryance/orch test: test\governance-stamp.test.ts:
@bryance/orch test: (pass) stampGovernance > stamps a launch credential as an operator [192.38ms]
@bryance/orch test: (pass) stampGovernance > drops a forged actor when the caller resolves to nobody [2.94ms]
@bryance/orch test: (pass) stampGovernance > rejects steal from a driving session [5.34ms]
@bryance/orch test: 
@bryance/orch test: test\seat-index.test.ts:
@bryance/orch test: (pass) seat pure seams > errorMessage preserves non-Error thrown values [5.09ms]
@bryance/orch test: 
@bryance/orch test: test\commands-status.test.ts:
@bryance/orch test: (pass) commands/status > zero-row message reports gathered counts and backend response [0.12ms]
@bryance/orch test: (pass) commands/status > dead rows never display stale live state [0.05ms]
@bryance/orch test: (pass) commands/status > shared row boundary normalizes stale state for every renderer [0.07ms]
@bryance/orch test: (pass) commands/status > a human at a terminal has no identity to narrow by and no space to be held inside [0.18ms]
@bryance/orch test: (pass) commands/status > --agent narrows to one row by id, key, or name, exited or not [0.16ms]
@bryance/orch test: (pass) commands/status > an agent sees what it spawned, and never past its own space > the default is the agents this caller spawned [0.05ms]
@bryance/orch test: (pass) commands/status > an agent sees what it spawned, and never past its own space > --space-wide widens to the caller's space, which is the wall [0.11ms]
@bryance/orch test: (pass) commands/status > an agent sees what it spawned, and never past its own space > a human widening sees every space, including the one the agent could not [0.09ms]
@bryance/orch test: (pass) commands/status > derives status row fields from seeded presence [1.12ms]
@bryance/orch test: (pass) commands/status > marks dead presence as exited [0.20ms]
@bryance/orch test: (pass) commands/status > asking presence is surfaced as a question while still reporting live state [0.17ms]
@bryance/orch test: (pass) commands/status > shared status row carries presence-derived fields [0.14ms]
@bryance/orch test: (pass) commands/status > row carries the owning backend's declared capabilities [0.15ms]
@bryance/orch test: (pass) commands/status > an agent whose backend orch cannot name reports no capabilities [0.06ms]
@bryance/orch test: (pass) commands/status > status owner ignores spawning provenance when no lease exists [0.27ms]
@bryance/orch test: (pass) commands/status > lease-backed status attribution distinguishes my lease, another lease, and unleased rows [897.59ms]
@bryance/orch test: (pass) commands/status > default table separates minted identity from pane environment [1.18ms]
@bryance/orch test: (pass) commands/status > human table shows harness and working directory facts [0.21ms]
@bryance/orch test: (pass) commands/status > json branch and local table branch derive identical rows apart from host [0.15ms]
@bryance/orch test: (pass) commands/status > capacity footer uses configured caps and shows one pack per root [0.73ms]
@bryance/orch test: (pass) commands/status > formats workspace labels and warnings [0.11ms]
@bryance/orch test: 
@bryance/orch test: test\seat-index.test.ts:
@bryance/orch test: (pass) seat pure seams > hasTheme discriminates missing and valid themes [0.89ms]
@bryance/orch test: (pass) seat pure seams > countStates groups active, blocked, failed, and settled states [0.30ms]
@bryance/orch test: (pass) seat pure seams > formatSeatStatus renders state counts and view hint [0.23ms]
@bryance/orch test: (pass) seat pure seams > reconcileDashboardSelection preserves id and guards missing snapshots [0.22ms]
@bryance/orch test: 
@bryance/orch test: test\errno-guard.test.ts:
@bryance/orch test: (pass) errnoCode reads a syscall error code, and only a real one > returns the code of a real node syscall error [0.33ms]
@bryance/orch test: (pass) errnoCode reads a syscall error code, and only a real one > a plain Error carries no code, so there is none to report [0.05ms]
@bryance/orch test: (pass) errnoCode reads a syscall error code, and only a real one > a non-object never yields a code instead of crashing on it [0.21ms]
@bryance/orch test: (pass) errnoCode reads a syscall error code, and only a real one > a code-shaped field of the wrong type is not a code [0.04ms]
@bryance/orch test: (pass) isAgentState verifies the state rather than asserting it > accepts a declared state [0.08ms]
@bryance/orch test: (pass) isAgentState verifies the state rather than asserting it > rejects anything not declared, including non-strings [0.16ms]
@bryance/orch test: 
@bryance/orch test: test\commands-clean.test.ts:
@bryance/orch test: (pass) worktree ownership reads the composed environment > a live agent's worktree is protected and a dead one's is not [1.40ms]
@bryance/orch test: 
@bryance/orch test: test\event-bus.test.ts:
@bryance/orch test: (pass) event bus > a throwing handler does not stop later handlers and is logged once [0.33ms]
@bryance/orch test: (pass) event bus > unsubscribe removes only its own handler [0.07ms]
@bryance/orch test: (pass) event bus > emit with no handlers is a no-op [0.06ms]
@bryance/orch test: 
@bryance/orch test: test\worker-tools.test.ts:
@bryance/orch test: (pass) worker tool policy > no configured allowlist restricts nothing [0.25ms]
@bryance/orch test: (pass) worker tool policy > a configured allowlist always carries orch's own tools [0.09ms]
@bryance/orch test: (pass) worker tool policy > peer tools join the allowlist when the fleet enables them [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\commands-target.test.ts:
@bryance/orch test: (pass) commands/target > reads only structured result text [0.12ms]
@bryance/orch test: 
@bryance/orch test: test\commands-logging.test.ts:
@bryance/orch test: (pass) orch logs > --dispatch selects one dispatch across both sinks, oldest first [30.97ms]
@bryance/orch test: 
@bryance/orch test: test\commands-target.test.ts:
@bryance/orch test: (pass) commands/target > quotes remote args and ORCH_DIR safely [0.19ms]
@bryance/orch test: 
@bryance/orch test: test\peer-lease-visibility.test.ts:
@bryance/orch test: (pass) peer summaries carry ownership as a lease > a peer nobody ever took reports no orch driving it [134.14ms]
@bryance/orch test: (pass) peer summaries carry ownership as a lease > a dead holder is not a live one [204.77ms]
@bryance/orch test: (pass) the compact listing separates orphans from live work > unleased peers sit in their own bucket, below the driven ones [187.22ms]
@bryance/orch test: (pass) the compact listing separates orphans from live work > a held peer names its holder, and an unleased one never reads as yours [169.39ms]
@bryance/orch test: (pass) the compact listing separates orphans from live work > with nothing unleased the bucket does not appear at all [130.96ms]
@bryance/orch test: 
@bryance/orch test: test\commands-clean.test.ts:
@bryance/orch test: (pass) orch clean is destructive maintenance > a spawned agent is refused the sweep, and the dirs it does not own survive [161.51ms]
@bryance/orch test: 
@bryance/orch test: test\control-ack.test.ts:
@bryance/orch test: (pass) control delivery acknowledgements > waits for the matching reader acknowledgement [0.52ms]
@bryance/orch test: (pass) control delivery acknowledgements > captures an acknowledgement arriving during delivery [0.12ms]
@bryance/orch test: (pass) control delivery acknowledgements > never claims consumption for an unacknowledged channel [0.04ms]
@bryance/orch test: (pass) control delivery acknowledgements > times out without claiming that delivery was cancelled [3.39ms]
@bryance/orch test: (pass) control delivery acknowledgements > propagates a failed send and removes its waiter [0.41ms]
@bryance/orch test: 
@bryance/orch test: test\cross-pack-result-delivery.test.ts:
@bryance/orch test: (pass) results go to the enqueuer as mail > a result is an outbox row for the enqueuer, not the runner [127.53ms]
@bryance/orch test: 
@bryance/orch test: test\event-identity.test.ts:
@bryance/orch test: (pass) published event identity > stamps a per-agent ordinal so a redelivery is recognizable [11.37ms]
@bryance/orch test: 
@bryance/orch test: test\broker-ownership.test.ts:
@bryance/orch test: (pass) broker ownership and space governance > refuses cross-space writes unless explicitly overridden [120.47ms]
@bryance/orch test: (pass) broker ownership and space governance > moving an agent between spaces moves the wall, not its identity [108.66ms]
@bryance/orch test: 
@bryance/orch test: test\commands-logging.test.ts:
@bryance/orch test: (pass) orch logs > --agent selects one agent's records [26.01ms]
@bryance/orch test: (pass) orch logs > --level selects one severity [25.54ms]
@bryance/orch test: (pass) orch logs > --since drops everything older than the instant given [10.19ms]
@bryance/orch test: (pass) orch logs > --since 0 keeps every record instead of being read as a missing value [9.81ms]
@bryance/orch test: (pass) orch logs > renders a readable line: instant, level, event, correlation, agent, fields [7.83ms]
@bryance/orch test: (pass) orch logs > --json emits the records themselves [30.11ms]
@bryance/orch test: (pass) command logging > notify test records the diagnosis and keeps user output on stdout [28.85ms]
@bryance/orch test: 
@bryance/orch test: test\commands-control.test.ts:
@bryance/orch test: (pass) commands/control > parses dispatch flags without losing prompt words [0.72ms]
@bryance/orch test: (pass) commands/control > --then is not a dispatch flag [0.29ms]
@bryance/orch test: (pass) commands/control > adds worker header unless raw [0.18ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-stale-presence.test.ts:
@bryance/orch test: (pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [316.51ms]
@bryance/orch test: 
@bryance/orch test: test\build-bin.test.ts:
@bryance/orch test: (pass) build entrypoint > always stamps a node shebang and executable mode [21.10ms]
@bryance/orch test: (pass) the installed CLI is the packaged build, never live source (K2) > the `orch` bin points at the packaged entrypoint, not bin/orch.ts [0.06ms]
@bryance/orch test: (pass) the installed CLI is the packaged build, never live source (K2) > the packaged entrypoint is built for node, from the source entrypoint [0.04ms]
@bryance/orch test: (pass) the installed CLI is the packaged build, never live source (K2) > a global install cannot happen without a build in front of it [0.05ms]
@bryance/orch test: (pass) the installed CLI is the packaged build, never live source (K2) > the package ships dist/, so what is installed is what was built [0.01ms]
@bryance/orch test: 
@bryance/orch test: test\commands-models.test.ts:
@bryance/orch test: (pass) orch models lists the whole catalogue > shows every offered model, quicklisted or not, allowed or not [0.69ms]
@bryance/orch test: (pass) orch models lists the whole catalogue > marks the launch default (thinking suffix removed) and the quicklist members [0.14ms]
@bryance/orch test: (pass) orch models lists the whole catalogue > keeps harness sections in configured order [0.05ms]
@bryance/orch test: (pass) orch models lists the whole catalogue > a harness that enumerates nothing gets an empty section, not another's models [0.12ms]
@bryance/orch test: (pass) orch models filters > --preferred narrows to the quicklist and renumbers what is shown [0.24ms]
@bryance/orch test: (pass) orch models filters > --search matches spec and label case-insensitively [0.11ms]
@bryance/orch test: (pass) orch models filters > filters combine, and no match is an empty result rather than the full list [0.03ms]
@bryance/orch test: (pass) orch models --pick prints one spec > a numeric pick reads the displayed index of a single harness [0.15ms]
@bryance/orch test: (pass) orch models --pick prints one spec > an exact spec pick resolves after filtering [0.08ms]
@bryance/orch test: (pass) orch models --pick prints one spec > ambiguous, missing, zero, and out-of-range picks fail [0.46ms]
@bryance/orch test: (pass) orch models --json > emits the pinned harness/model shape [0.13ms]
@bryance/orch test: 
@bryance/orch test: test\self-actor-identity.test.ts:
@bryance/orch test: (pass) a driving session's write-actor is the agent orch registered for it > the session token resolves to the id hello minted, so the actor equals its own lease holder [148.91ms]
@bryance/orch test: 
@bryance/orch test: test\os-executors.test.ts:
@bryance/orch test: (pass) cross-OS execution is a backend, not a peer daemon > the local side supplies start, is-alive and kill [0.85ms]
@bryance/orch test: 
@bryance/orch test: test\hello-environment.test.ts:
@bryance/orch test: (pass) hello records the environment in full > the plexer the caller registered in is on the agent, not only on the host [202.60ms]
@bryance/orch test: 
@bryance/orch test: test\store-task-rows.test.ts:
@bryance/orch test: (pass) task and attempt rows > malformed attempt rows are refused instead of handing back NaN [132.01ms]
@bryance/orch test: (pass) task and attempt rows > enqueue accepts exactly one typed scope and round-trips JSON opts [150.72ms]
@bryance/orch test: (pass) task and attempt rows > queued tasks can be edited only by their enqueuer [170.66ms]
@bryance/orch test: (pass) task and attempt rows > two concurrent claims have one winner and one index violation [186.50ms]
@bryance/orch test: (pass) task and attempt rows > failed attempts remain in history and retries are new attempts [132.83ms]
@bryance/orch test: (pass) task and attempt rows > settlement stores exact integer instants and outcome payloads [93.24ms]
@bryance/orch test: (pass) task and attempt rows > task state precedence covers queued, claimed, failed, done and cancelled [123.87ms]
@bryance/orch test: (pass) task and attempt rows > intakes are half-open history and duplicate open intake is rejected [130.02ms]
@bryance/orch test: 
@bryance/orch test: test\store-values.test.ts:
@bryance/orch test: (pass) store row values > uses null for optional database values without JSON text [0.10ms]
@bryance/orch test: 
@bryance/orch test: test\backend-headless.test.ts:
@bryance/orch test: (pass) HeadlessBackend > spawns a detached process and records its handle [933.00ms]
@bryance/orch test: (pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [964.66ms]
@bryance/orch test: (pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [1021.33ms]
@bryance/orch test: (pass) HeadlessBackend > signals a matching recorded process through the injected killer [880.10ms]
@bryance/orch test: (pass) HeadlessBackend > refuses to signal a pid whose process instance was replaced [0.53ms]
@bryance/orch test: (pass) HeadlessBackend > never signals a dead pid [0.24ms]
@bryance/orch test: 
@bryance/orch test: test\store-values.test.ts:
@bryance/orch test: (pass) store row values > sets only non-null fields [0.06ms]
@bryance/orch test: 
@bryance/orch test: test\event-identity.test.ts:
@bryance/orch test: (pass) the work loop is not a second presence-transition source > an agent state change publishes nothing from the queue loop [289.30ms]
@bryance/orch test: 
@bryance/orch test: test\peer-project-scope.test.ts:
@bryance/orch test: (pass) peer discovery walls on the project > a same-workspace peer from another project is invisible by default [168.39ms]
@bryance/orch test: 
@bryance/orch test: test\status-headless.test.ts:
@bryance/orch test: (pass) headless status visibility > drops an exited agent that finished, however much it recorded [0.18ms]
@bryance/orch test: (pass) headless status visibility > --filter removes the states it names; --agent brings one dead agent back [0.07ms]
@bryance/orch test: (pass) headless status visibility > --filter drops live rows in the states it names [0.04ms]
@bryance/orch test: (pass) headless status visibility > drops a dead row with no result or terminal state [0.02ms]
@bryance/orch test: (pass) headless status visibility > keeps a live row [0.02ms]
@bryance/orch test: (pass) headless status visibility > --space-wide widens the scope without resurrecting empty dead rows [0.02ms]
@bryance/orch test: (pass) headless status visibility > uses agent language without backend details when no backend was asked [0.05ms]
@bryance/orch test: 
@bryance/orch test: test\commands-panes.test.ts:
@bryance/orch test: (pass) commands/panes > pane identity is the minted id alone [0.11ms]
@bryance/orch test: (pass) commands/panes > a plexer-and-space key is not an identity [0.02ms]
@bryance/orch test: (pass) commands/panes > exports the pane listing command directly [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\backend-herdr-predicates.test.ts:
@bryance/orch test: (pass) herdr environment predicates > neither variable set [0.40ms]
@bryance/orch test: 
@bryance/orch test: test\commands-daemon.test.ts:
@bryance/orch test: (pass) commands/daemon > parses governance and validates daemon status [35.77ms]
@bryance/orch test: 
@bryance/orch test: test\backend-herdr-predicates.test.ts:
@bryance/orch test: (pass) herdr environment predicates > HERDR_ENV=1 only [0.12ms]
@bryance/orch test: (pass) herdr environment predicates > HERDR_PANE_ID only [5.57ms]
@bryance/orch test: (pass) herdr environment predicates > both variables set [0.26ms]
@bryance/orch test: 
@bryance/orch test: test\self-actor-identity.test.ts:
@bryance/orch test: (pass) a driving session's write-actor is the agent orch registered for it > a token orch has never seen resolves to nothing rather than a fabricated id [96.60ms]
@bryance/orch test: (pass) a driving session's write-actor is the agent orch registered for it > one session keeps ONE id across calls, whatever pid the shell reports [137.91ms]
@bryance/orch test: 
@bryance/orch test: test\session-env.test.ts:
@bryance/orch test: (pass) shim environment > allows the launch environment variable [0.27ms]
@bryance/orch test: 
@bryance/orch test: test\commands-fleet.test.ts:
@bryance/orch test: (pass) commands/fleet > reads an empty fleet [189.67ms]
@bryance/orch test: 
@bryance/orch test: test\commands-daemon.test.ts:
@bryance/orch test: (pass) commands/daemon > reads a lock pid only from a complete lock record [78.14ms]
@bryance/orch test: 
@bryance/orch test: test\reload-no-bundle-write.test.ts:
@bryance/orch test: {"results":[],"ok":0,"total":0,"hard":false,"signaled":"reload.signal"}
@bryance/orch test: (pass) reload > does not write installed extension bundles [1071.43ms]
@bryance/orch test: 
@bryance/orch test: test\backend-herdr.test.ts:
@bryance/orch test: (pass) HerdrBackend > current identity uses the explicit id, not the launch environment [6.39ms]
@bryance/orch test: 
@bryance/orch test: test\store-write-queue.test.ts:
@bryance/orch test: (pass) store write queue > reads a queued run in the same tick [147.74ms]
@bryance/orch test: 
@bryance/orch test: test\commands-fleet.test.ts:
@bryance/orch test: (pass) commands/fleet > reads agent views and indexes presence by key [158.39ms]
@bryance/orch test: 
@bryance/orch test: test\cross-pack-result-delivery.test.ts:
@bryance/orch test: (pass) results go to the enqueuer as mail > a failed task reports its error in the mail body [122.45ms]
@bryance/orch test: (pass) results go to the enqueuer as mail > a cross-wall enqueuer gets no row and the task stays settled [141.90ms]
@bryance/orch test: (pass) acceptMail > refuses a message across the space wall by its reason [133.03ms]
@bryance/orch test: (pass) acceptMail > requires non-empty from, target, and text [134.04ms]
@bryance/orch test: (pass) acceptMail > queues a mail payload naming its sender, routed by direction when it is delivered [105.99ms]
@bryance/orch test: 
@bryance/orch test: test\session-refresh-repoints-identity.test.ts:
@bryance/orch test: (pass) session refresh identity continuity > same process with a new token repoints the existing agent and preserves its lease [130.54ms]
@bryance/orch test: 
@bryance/orch test: test\status-live.test.ts:
@bryance/orch test: (pass) live status renderer > renders a clear screen, timestamped header, and table body [13.80ms]
@bryance/orch test: (pass) live status renderer > renders a refresh failure in the header area [0.25ms]
@bryance/orch test: (pass) live status renderer > coalesces a burst into one pending follow-up refresh [0.34ms]
@bryance/orch test: (pass) live status renderer > keeps the existing table renderer available [0.10ms]
@bryance/orch test: 
@bryance/orch test: test\commands-events.test.ts:
@bryance/orch test: (pass) commands/events > owned renderers and tool help do not expose the retired workspace term [1.23ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-reconnect.test.ts:
@bryance/orch test: (pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1205.09ms]
@bryance/orch test: 
@bryance/orch test: test\commands-events.test.ts:
@bryance/orch test: (pass) commands/events > bare events is scoped to this session's agents and renders readable lines [0.38ms]
@bryance/orch test: (pass) commands/events > parses the scope flags [0.12ms]
@bryance/orch test: (pass) commands/events > parses the wake-up flags [0.09ms]
@bryance/orch test: (pass) commands/events > --filter names the states to drop and is never the default [0.22ms]
@bryance/orch test: (pass) commands/events > the monitor shows only the monitor.on states and every worker message [0.19ms]
@bryance/orch test: (pass) commands/events > the monitor's states come from settings, not from the code [0.02ms]
@bryance/orch test: (pass) commands/events > the monitor parses the same flags as events under its own usage [0.90ms]
@bryance/orch test: (pass) commands/events > includes an adopted agent whose open lease is mine [0.04ms]
@bryance/orch test: (pass) commands/events > includes a reused pane leased by me even when another session spawned it [0.02ms]
@bryance/orch test: (pass) commands/events > includes an unleased agent spawned by this session [0.01ms]
@bryance/orch test: (pass) commands/events > excludes an agent spawned by a different session [0.02ms]
@bryance/orch test: (pass) commands/events > --space-wide passes agents from both sessions [0.03ms]
@bryance/orch test: (pass) commands/events > excludes an agent while another orch holds its lease [0.01ms]
@bryance/orch test: (pass) commands/events > describes durable replay and reports pruned history gaps [0.74ms]
@bryance/orch test: (pass) commands/events > names one agent by name or by identity key [0.11ms]
@bryance/orch test: (pass) commands/events > a subscription with no daemon keeps redialing instead of exiting [0.70ms]
@bryance/orch test: (pass) commands/events > renders opaque plexer coordinates without relabeling them as spaces [0.92ms]
@bryance/orch test: (pass) commands/events > message events render the full delivered mail text once [0.11ms]
@bryance/orch test: (pass) commands/events > an agent in no space gets no empty bracket on its line [0.08ms]
@bryance/orch test: (pass) commands/events > an event line says what happened, never the fleet's books [0.04ms]
@bryance/orch test: (pass) commands/events > rejects malformed event and labels sinks [14.30ms]
@bryance/orch test: (pass) commands/events space ceiling > matches an event's stamped space and lets an unplaced caller hear all [0.23ms]
@bryance/orch test: (pass) commands/events space ceiling > a session hears its workers and its mail, never its own transitions [0.48ms]
@bryance/orch test: 
@bryance/orch test: test\store-connection-guards.test.ts:
@bryance/orch test: (pass) store migration guards > names live presence as the thing to close before rebuilding [227.78ms]
@bryance/orch test: (pass) a slave never reaps or recreates the store > a spawned agent hitting a schema-mismatched store errors and mutates nothing [145.88ms]
@bryance/orch test: (pass) a slave never reaps or recreates the store > a recreate is refused while a live worker exists, for the user too [189.97ms]
@bryance/orch test: (pass) a slave never reaps or recreates the store > a live driving session is refused without --with-sessions and allowed with it [210.16ms]
@bryance/orch test: (pass) a slave never reaps or recreates the store > the user may recreate once nothing is live [175.68ms]
@bryance/orch test: (pass) a slave never reaps or recreates the store > a spawned agent is refused a recreate even with nothing live [126.39ms]
@bryance/orch test: 
@bryance/orch test: test\remote-fanout.test.ts:
@bryance/orch test: (pass) async remote fan-out > parses valid JSON from a host [280.57ms]
