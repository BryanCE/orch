$ bun --filter @bryance/orch test
@bryance/orch test: bun test v1.4.0 (34cbb9a40) 24x PARALLEL
@bryance/orch test: 
@bryance/orch test: test\a-backend-exposes-each-operation-once.test.ts:
@bryance/orch test: (pass) a backend exposes each operation exactly once (2.2) > herdr publishes no operation beside the role that owns it [0.11ms]
@bryance/orch test: (pass) a backend exposes each operation exactly once (2.2) > tmux publishes no operation beside the role that owns it [0.03ms]
@bryance/orch test: (pass) a backend exposes each operation exactly once (2.2) > headless publishes no operation beside the role that owns it [0.03ms]
@bryance/orch test: (pass) a backend exposes each operation exactly once (2.2) > orca publishes no operation beside the role that owns it [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\identity-launch.test.ts:
@bryance/orch test: (pass) an unset launch credential is absent [0.56ms]
@bryance/orch test: 
@bryance/orch test: test\provenance.test.ts:
@bryance/orch test: (pass) the one provenance walk > ancestors are parent-first, root last [0.20ms]
@bryance/orch test: (pass) the one provenance walk > depth counts hops to the root [0.12ms]
@bryance/orch test: (pass) the one provenance walk > an unknown id is its own root at depth 0 [0.03ms]
@bryance/orch test: (pass) the one provenance walk > an unknown parent ends the chain instead of throwing [0.05ms]
@bryance/orch test: (pass) the one provenance walk > descendant is any depth, never self, never a sibling tree [0.07ms]
@bryance/orch test: (pass) the one provenance walk > a cycle terminates [0.06ms]
@bryance/orch test: 
@bryance/orch test: test\pi-model-control.test.ts:
@bryance/orch test: (pass) splitThinkingSuffix > splits a valid ladder effort off the bare id [0.10ms]
@bryance/orch test: (pass) splitThinkingSuffix > leaves a bare model untouched [0.02ms]
@bryance/orch test: (pass) splitThinkingSuffix > keeps a trailing colon token that is not a thinking level as part of the id [0.02ms]
@bryance/orch test: (pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > looks up the BARE id and returns the effort suffix separately [0.46ms]
@bryance/orch test: (pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > retries until a still-booting registry answers [4.26ms]
@bryance/orch test: (pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > throws when the registry never yields the model [0.41ms]
@bryance/orch test: (pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > rejects a token without a provider/id shape [0.10ms]
@bryance/orch test: (pass) createModelControl.applyControlCommand > applies a suffixed model command and reports a success outcome [0.68ms]
@bryance/orch test: 
@bryance/orch test: test\identity-launch.test.ts:
@bryance/orch test: (pass) a minted launch credential is accepted [39.18ms]
@bryance/orch test: (pass) a malformed launch credential is refused, never exited [0.33ms]
@bryance/orch test: 
@bryance/orch test: test\control-ack.test.ts:
@bryance/orch test: (pass) control delivery acknowledgements > waits for the matching reader acknowledgement [0.52ms]
@bryance/orch test: (pass) control delivery acknowledgements > captures an acknowledgement arriving during delivery [0.18ms]
@bryance/orch test: (pass) control delivery acknowledgements > never claims consumption for an unacknowledged channel [0.05ms]
@bryance/orch test: (pass) control delivery acknowledgements > times out without claiming that delivery was cancelled [3.50ms]
@bryance/orch test: (pass) control delivery acknowledgements > propagates a failed send and removes its waiter [0.29ms]
@bryance/orch test: 
@bryance/orch test: test\one-control-dispatcher.test.ts:
@bryance/orch test: (pass) there is exactly one control dispatcher > no module outside src/control declares a control dispatcher [73.59ms]
@bryance/orch test: (pass) there is exactly one control dispatcher > no dispatcher is exported under two names [40.46ms]
@bryance/orch test: 
@bryance/orch test: test\one-query-stack-over-the-connection.test.ts:
@bryance/orch test: (pass) one query stack over the connection (2.3) > the store exposes no raw-SQL port beside the typed one [0.09ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-renags-questions.test.ts:
@bryance/orch test: (pass) question re-ask policy > nothing due emits nothing [0.28ms]
@bryance/orch test: (pass) question re-ask policy > an overdue question emits its first re-ask [0.07ms]
@bryance/orch test: (pass) question re-ask policy > an emitted re-ask waits for the interval before emitting again [0.06ms]
@bryance/orch test: (pass) question re-ask policy > a settled question emits no further re-asks [0.07ms]
@bryance/orch test: (pass) question re-ask policy > the limit emits one final gave-up event and then stays silent [0.08ms]
@bryance/orch test: 
@bryance/orch test: test\agent-view.test.ts:
@bryance/orch test: (pass) the agent composer > an agent with no environment rows has every axis absent, not defaulted [116.35ms]
@bryance/orch test: 
@bryance/orch test: test\settings-defects.test.ts:
@bryance/orch test: (pass) settingsDefects > returns no defects for an absent file [2.38ms]
@bryance/orch test: 
@bryance/orch test: test\one-query-stack-over-the-connection.test.ts:
@bryance/orch test: (pass) one query stack over the connection (2.3) > nothing in the repo prepares a statement through the deleted port [88.10ms]
@bryance/orch test: 
@bryance/orch test: test\one-retry-policy.test.ts:
@bryance/orch test: (pass) one retry policy > retries flaky async and sync operations through the shared helper [0.50ms]
@bryance/orch test: (pass) one retry policy > uses the policy's declared backoff schedule [0.12ms]
@bryance/orch test: (pass) one retry policy > surfaces the last error after exactly attempts tries [0.24ms]
@bryance/orch test: 
@bryance/orch test: test\settings-thinking.test.ts:
@bryance/orch test: (pass) orch settings thinking > writes the global default and reads back through loadSettings [135.79ms]
@bryance/orch test: 
@bryance/orch test: test\store-outbox.test.ts:
@bryance/orch test: (pass) outbox store rows > inserts pending messages and orders them by creation time [94.05ms]
@bryance/orch test: 
@bryance/orch test: test\commands-control.test.ts:
@bryance/orch test: (pass) commands/control > parses dispatch flags without losing prompt words [0.86ms]
@bryance/orch test: (pass) commands/control > --then is not a dispatch flag [0.27ms]
@bryance/orch test: (pass) commands/control > adds worker header unless raw [0.20ms]
@bryance/orch test: 
@bryance/orch test: test\events-scope-notice.test.ts:
@bryance/orch test: (pass) events scope notice > names the default live scope and its wideners [0.67ms]
@bryance/orch test: 
@bryance/orch test: test\os-executors.test.ts:
@bryance/orch test: (pass) cross-OS execution is a backend, not a peer daemon > the local side supplies start, is-alive and kill [1.21ms]
@bryance/orch test: 
@bryance/orch test: test\events-scope-notice.test.ts:
@bryance/orch test: (pass) events scope notice > names the all-agent live scope and its history widener [0.31ms]
@bryance/orch test: (pass) events scope notice > a redirected stream is a harness reading transitions, and gets no banner [0.05ms]
@bryance/orch test: (pass) events scope notice > does not announce when history was requested [5.78ms]
@bryance/orch test: (pass) events scope notice > writes one notice before starting the live transport [1.71ms]
@bryance/orch test: (pass) events scope notice > does not write a notice when history was requested [1.16ms]
@bryance/orch test: (pass) events scope notice > says so when the caller owns no agents [0.45ms]
@bryance/orch test: (pass) events scope notice > the empty notice names the verb that armed the stream [0.49ms]
@bryance/orch test: (pass) events scope notice > stays out of a --json stream, which a parser is reading [3.10ms]
@bryance/orch test: (pass) events scope notice > does not announce when explicit targets were requested [0.27ms]
@bryance/orch test: 
@bryance/orch test: test\status-live.test.ts:
@bryance/orch test: (pass) live status renderer > renders a clear screen, timestamped header, and table body [9.33ms]
@bryance/orch test: 
@bryance/orch test: test\a-row-is-not-a-pane.test.ts:
@bryance/orch test: (pass) a row is not evidence that a pane exists (U1, U4) > a recorded handle the plexer does not list is reported as NO pane [221.72ms]
@bryance/orch test: 
@bryance/orch test: test\status-live.test.ts:
@bryance/orch test: (pass) live status renderer > renders a refresh failure in the header area [2.09ms]
@bryance/orch test: (pass) live status renderer > coalesces a burst into one pending follow-up refresh [3.47ms]
@bryance/orch test: (pass) live status renderer > keeps the existing table renderer available [0.22ms]
@bryance/orch test: 
@bryance/orch test: test\settings-defects.test.ts:
@bryance/orch test: (pass) settingsDefects > returns no defects for a valid settings file [41.69ms]
@bryance/orch test: (pass) settingsDefects > reports unparsable JSON as one file defect [5.66ms]
@bryance/orch test: (pass) settingsDefects > suggests a near-match for a stale key [33.14ms]
@bryance/orch test: (pass) settingsDefects > a key far from every declared key is a newer build's key, not a defect [47.98ms]
@bryance/orch test: (pass) settingsDefects > settings_file.typo_max_edits sets how near a key must be to count as a typo [52.77ms]
@bryance/orch test: (pass) settingsDefects > reports the expected pinned schema value [21.69ms]
@bryance/orch test: (pass) settingsDefects > reports a wrong value type on a real key [8.11ms]
@bryance/orch test: 
@bryance/orch test: test\settings-editor.test.ts:
@bryance/orch test: (pass) settings editor reducer > moves focus down and up without running off either end [0.55ms]
@bryance/orch test: (pass) settings editor reducer > opens the focused setting for editing [0.12ms]
@bryance/orch test: (pass) settings editor reducer > cancel leaves value unchanged and returns to browsing [0.09ms]
@bryance/orch test: (pass) settings editor reducer > commit updates value and produces a pending write [0.36ms]
@bryance/orch test: (pass) settings editor reducer > refuses invalid values with a reason and stays open [0.09ms]
@bryance/orch test: (pass) settings editor reducer > refuses opening a read-only setting with a reason [0.08ms]
@bryance/orch test: (pass) settings editor reducer > cancelling without a commit yields zero writes [0.08ms]
@bryance/orch test: 
@bryance/orch test: test\status-owner-column.test.ts:
@bryance/orch test: (pass) the rendered status table carries the owner column > each row's OWNER cell holds that row's lease fact, named through the fleet's names [3.90ms]
@bryance/orch test: (pass) the rendered status table carries the owner column > a holder with no name falls back to its id [0.57ms]
@bryance/orch test: (pass) the rendered status table carries the owner column > a dead holder reads as unleased under a table that all shares one owner [0.36ms]
@bryance/orch test: (pass) the rendered status table carries the owner column > the owner column is dropped when only a warning row is there to fill it [0.60ms]
@bryance/orch test: 
@bryance/orch test: test\settings-thinking.test.ts:
@bryance/orch test: thinking  xhigh
@bryance/orch test: thinking (pi)  low
@bryance/orch test: (pass) orch settings thinking > writes a per-harness override without disturbing the global default [14.86ms]
@bryance/orch test: (pass) orch settings thinking > the command sets the level a user names [26.64ms]
@bryance/orch test: (pass) orch settings thinking > the command sets a per-harness level with --harness [30.04ms]
@bryance/orch test: (pass) orch settings thinking > a level orch does not know is refused, naming the valid levels [16.37ms]
@bryance/orch test: (pass) orch settings thinking > clearing a per-harness override falls back to the global default [45.29ms]
@bryance/orch test: 
@bryance/orch test: test\control-dispatch.test.ts:
@bryance/orch test: (pass) deliverControl bridge dispatch > pushes run and steer with their action ids [324.52ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-declared-vs-reality.test.ts:
@bryance/orch test: (pass) doctor declared-vs-reality > describes composed and absent backend roles [98.31ms]
@bryance/orch test: 
@bryance/orch test: test\one-shape-only.test.ts:
@bryance/orch test: (pass) one current shape only > a live presence record with a malformed identity is a doctor failure [7.93ms]
@bryance/orch test: 
@bryance/orch test: test\settings-manager.test.ts:
@bryance/orch test: (pass) settings manager > currentOrNull returns null and current reports an absent file [2.37ms]
@bryance/orch test: 
@bryance/orch test: test\queue-cli-scope.test.ts:
@bryance/orch test: (pass) Cq2: all three scopes are choosable at enqueue > --agent, --pack and --space each select exactly one typed scope [233.32ms]
@bryance/orch test: 
@bryance/orch test: test\commands-queue.test.ts:
@bryance/orch test: (pass) commands/queue > cmdQueue list emits the selected JSON view [198.73ms]
@bryance/orch test: 
@bryance/orch test: test\backend-tmux.test.ts:
@bryance/orch test: (pass) TmuxBackend > current identity uses the explicit id, not the launch environment [27.54ms]
@bryance/orch test: 
@bryance/orch test: test\one-shape-only.test.ts:
@bryance/orch test: (pass) one current shape only > doctor backend reports have one detection spelling [37.57ms]
@bryance/orch test: 
@bryance/orch test: test\no-sibling-relay.test.ts:
@bryance/orch test: (pass) a worker with no reachable spawner does not relay (L6) > an unset spawner refuses, and the refusal names the agent's own report path [247.59ms]
@bryance/orch test: 
@bryance/orch test: test\space-walls.test.ts:
@bryance/orch test: (pass) space helpers > reads space ids from the environment satellite, never from the key [12.14ms]
@bryance/orch test: 
@bryance/orch test: test\status-renders-one-row-shape.test.ts:
@bryance/orch test: (pass) status rendering has one row shape and one table renderer > task and last text use the same spelling in the row and table cell [7.61ms]
@bryance/orch test: 
@bryance/orch test: test\settings-unknown-keys.test.ts:
@bryance/orch test: (pass) a key this build does not declare > a newer build's key is ignored on read [74.41ms]
@bryance/orch test: 
@bryance/orch test: test\commands-daemon.test.ts:
@bryance/orch test: (pass) commands/daemon > parses governance and validates daemon status [13.64ms]
@bryance/orch test: (pass) commands/daemon > reads a lock pid only from a complete lock record [47.65ms]
@bryance/orch test: 
@bryance/orch test: test\settings-manager.test.ts:
@bryance/orch test: (pass) settings manager > parses valid fixture text [55.20ms]
@bryance/orch test: (pass) settings manager > holds one parsed object until reload [1.82ms]
@bryance/orch test: (pass) settings manager > does not cache malformed text as a value [3.96ms]
@bryance/orch test: (pass) settings manager > reloads file settings after the file changes [11.69ms]
@bryance/orch test: (pass) settings manager > update > file manager lands text and current reflects it without reload [20.32ms]
@bryance/orch test: (pass) settings manager > update > in-memory manager lands text and current reflects it [24.47ms]
@bryance/orch test: (pass) settings manager > update > removes a stale lock before updating [36.08ms]
@bryance/orch test: (pass) settings manager > update > refuses a held lock and leaves settings and lock untouched [11.75ms]
@bryance/orch test: (pass) settings manager > reports a legacy config.toml [10.22ms]
@bryance/orch test: 
@bryance/orch test: test\queue-cli-scope.test.ts:
@bryance/orch test: (pass) Cq2: all three scopes are choosable at enqueue > a name resolves to one id, and an ambiguous name asks for the id [190.97ms]
@bryance/orch test: 
@bryance/orch test: test\settings-unknown-keys.test.ts:
@bryance/orch test: (pass) a key this build does not declare > a typo is refused and names the key it misspells [26.95ms]
@bryance/orch test: (pass) a key this build does not declare > a bad value on a declared key still fails [8.88ms]
@bryance/orch test: (pass) a key this build does not declare > a write keeps a newer build's keys on disk [35.83ms]
@bryance/orch test: 
@bryance/orch test: test\a-row-is-not-a-pane.test.ts:
@bryance/orch test: (pass) a row is not evidence that a pane exists (U1, U4) > the agent itself is still there ΓÇö losing a pane costs a shortcut, not a life [189.50ms]
@bryance/orch test: (pass) a row is not evidence that a pane exists (U1, U4) > a handle the plexer DOES list is kept [198.10ms]
@bryance/orch test: 
@bryance/orch test: test\settings-view.test.ts:
@bryance/orch test: (pass) settings view > visibleEntryIndices matches key and group case-insensitively [1.84ms]
@bryance/orch test: 
@bryance/orch test: test\commands-queue.test.ts:
@bryance/orch test: No queue tasks.
@bryance/orch test: (pass) commands/queue > round-trips add/list/cancel on an isolated store [238.15ms]
@bryance/orch test: (pass) commands/queue > renders empty queues without throwing [0.33ms]
@bryance/orch test: 
@bryance/orch test: test\settings-view.test.ts:
@bryance/orch test: (pass) settings view > visibleEntryIndices matches the shown value, so a search finds a setting by what it holds [0.22ms]
@bryance/orch test: (pass) settings view > windowBounds keeps the focus inside the budget and clamps at both ends [0.31ms]
@bryance/orch test: (pass) settings view > frame shows group headers, values, provenance tags, and the focused help [0.65ms]
@bryance/orch test: (pass) settings view > frame with a filter narrows the list and draws the filter line [0.10ms]
@bryance/orch test: (pass) settings view > frame in search mode draws the search line with a cursor and the search keybar [0.06ms]
@bryance/orch test: (pass) settings view > frame reports an empty filter match instead of a blank screen [0.04ms]
@bryance/orch test: (pass) settings view > a long list is windowed with more-above/more-below markers [18.19ms]
@bryance/orch test: (pass) settings view > overlays render choices, checkboxes, and input with error [0.51ms]
@bryance/orch test: (pass) settings view > a checkbox row shows what its choice carries [0.07ms]
@bryance/orch test: (pass) settings view > displayValue keeps scalars bare and JSON-encodes shapes [0.11ms]
@bryance/orch test: 
@bryance/orch test: test\store-outbox.test.ts:
@bryance/orch test: (pass) outbox store rows > reports one message's pending state [134.44ms]
@bryance/orch test: (pass) outbox store rows > bumps attempts and hides a message until its next attempt time [144.19ms]
@bryance/orch test: (pass) outbox store rows > deletes delivered messages older than the cutoff [204.68ms]
@bryance/orch test: 
@bryance/orch test: test\queue-cli-scope.test.ts:
@bryance/orch test: (pass) Cq2: all three scopes are choosable at enqueue > two scope flags at once are refused [142.85ms]
@bryance/orch test: 
@bryance/orch test: test\every-agent-has-a-link.test.ts:
@bryance/orch test: (pass) every agent has an attached link > agents in placed, headless, and handleless environments receive the same push [324.01ms]
@bryance/orch test: 
@bryance/orch test: test\no-sibling-relay.test.ts:
@bryance/orch test: (pass) a worker with no reachable spawner does not relay (L6) > the refusal never suggests another agent as an alternative route [188.51ms]
@bryance/orch test: (pass) a worker with no reachable spawner does not relay (L6) > a spawner that is stamped but has no live status record refuses by NAME and still says to report [147.71ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-allowlist.test.ts:
@bryance/orch test: (pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [1.75ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.45ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.16ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.06ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.20ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.39ms]
@bryance/orch test: (pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.19ms]
@bryance/orch test: (pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.04ms]
@bryance/orch test: (pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.07ms]
@bryance/orch test: 
@bryance/orch test: test\status-renders-one-row-shape.test.ts:
@bryance/orch test: (pass) status rendering has one row shape and one table renderer > local and remote rows share the renderer; remote adds only HOST [0.75ms]
@bryance/orch test: (pass) status rendering has one row shape and one table renderer > the fleet builds one row per presence record and needs no caller to do it [329.72ms]
@bryance/orch test: 
@bryance/orch test: test\settings-watch.test.ts:
@bryance/orch test: (pass) watchSettings > loads initially and applies a valid edit after the debounce [48.63ms]
@bryance/orch test: 
@bryance/orch test: test\no-stderr-writes.test.ts:
@bryance/orch test: (pass) orch has one diagnosis channel (the logger) and one output channel (stdout) > no runtime source writes to process.stderr [32.51ms]
@bryance/orch test: 
@bryance/orch test: test\settings-notify.test.ts:
@bryance/orch test: (pass) orch settings notify > records a sink with the field that sink declares [68.61ms]
@bryance/orch test: 
@bryance/orch test: test\no-stderr-writes.test.ts:
@bryance/orch test: (pass) orch has one diagnosis channel (the logger) and one output channel (stdout) > the scan actually covers the tree it claims to [3.53ms]
@bryance/orch test: 
@bryance/orch test: test\every-agent-has-a-link.test.ts:
@bryance/orch test: (pass) every agent has an attached link > an agent with no handle is still addressable through its link [134.81ms]
@bryance/orch test: 
@bryance/orch test: test\one-spelling-per-fact.test.ts:
@bryance/orch test: (pass) one spelling per shared fact > host OS and the store agree for an injected Windows platform [184.19ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-bundle-diagnosis.test.ts:
@bryance/orch test: (pass) adapter bundle installation > reports a missing shipped bundle as a structured diagnosis [3.84ms]
@bryance/orch test: 
@bryance/orch test: test\queue-cli-scope.test.ts:
@bryance/orch test: (pass) Cq9: reading the queue is open > listing and history carry no caller and hide no other pack's work [179.34ms]
@bryance/orch test: 
@bryance/orch test: test\commands-events.test.ts:
@bryance/orch test: (pass) commands/events > owned renderers and tool help do not expose the retired workspace term [1.06ms]
@bryance/orch test: 
@bryance/orch test: test\store-queue.test.ts:
@bryance/orch test: (pass) queue facade storage > state is derived from attempts rather than stored on tasks [131.96ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-bundle-diagnosis.test.ts:
@bryance/orch test: pi extensions:
@bryance/orch test: (pass) adapter bundle installation > diagnoses a missing shipped bundle without writing [7.60ms]
@bryance/orch test: 
@bryance/orch test: test\commands-events.test.ts:
@bryance/orch test: (pass) commands/events > bare events is scoped to this session's agents and renders readable lines [0.37ms]
@bryance/orch test: (pass) commands/events > parses the scope flags [0.11ms]
@bryance/orch test: (pass) commands/events > parses the wake-up flags [0.08ms]
@bryance/orch test: (pass) commands/events > --filter names the states to drop and is never the default [0.21ms]
@bryance/orch test: (pass) commands/events > the monitor shows only the monitor.on states and every worker message [0.22ms]
@bryance/orch test: (pass) commands/events > the monitor's states come from settings, not from the code [0.03ms]
@bryance/orch test: (pass) commands/events > the monitor parses the same flags as events under its own usage [0.79ms]
@bryance/orch test: (pass) commands/events > includes an adopted agent whose open lease is mine [0.04ms]
@bryance/orch test: (pass) commands/events > includes a reused pane leased by me even when another session spawned it [0.01ms]
@bryance/orch test: (pass) commands/events > includes an unleased agent spawned by this session [0.02ms]
@bryance/orch test: (pass) commands/events > excludes an agent spawned by a different session [0.01ms]
@bryance/orch test: (pass) commands/events > --space-wide passes agents from both sessions [0.05ms]
@bryance/orch test: (pass) commands/events > excludes an agent while another orch holds its lease [0.02ms]
@bryance/orch test: (pass) commands/events > describes durable replay and reports pruned history gaps [1.41ms]
@bryance/orch test: (pass) commands/events > names one agent by name or by identity key [0.21ms]
@bryance/orch test: (pass) commands/events > a subscription with no daemon keeps redialing instead of exiting [1.50ms]
@bryance/orch test: (pass) commands/events > renders opaque plexer coordinates without relabeling them as spaces [0.75ms]
@bryance/orch test: (pass) commands/events > message events render the full delivered mail text once [0.11ms]
@bryance/orch test: (pass) commands/events > an agent in no space gets no empty bracket on its line [0.07ms]
@bryance/orch test: (pass) commands/events > an event line says what happened, never the fleet's books [0.18ms]
@bryance/orch test: (pass) commands/events > rejects malformed event and labels sinks [9.16ms]
@bryance/orch test: (pass) commands/events space ceiling > matches an event's stamped space and lets an unplaced caller hear all [0.06ms]
@bryance/orch test: (pass) commands/events space ceiling > a session hears its workers and its mail, never its own transitions [0.50ms]
@bryance/orch test: 
@bryance/orch test: test\notifier-adapters.test.ts:
@bryance/orch test: (pass) notifier registry and built-in adapters > reports notifier reachability from one configured entry [0.64ms]
@bryance/orch test: (pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [1.61ms]
@bryance/orch test: (pass) notifier registry and built-in adapters > a notifier error is the caller's real error [0.30ms]
@bryance/orch test: 
@bryance/orch test: test\notify-ding.test.ts:
@bryance/orch test: (pass) notify/ding > the sound sink is a declared sink that takes no configuration [0.39ms]
@bryance/orch test: (pass) notify/ding > this host names the players it would use, and says how to get one [0.24ms]
@bryance/orch test: (pass) notify/ding > a command string runs through the host's own shell; argv is passed through untouched [0.09ms]
@bryance/orch test: 
@bryance/orch test: test\one-spelling-per-fact.test.ts:
@bryance/orch test: (pass) one spelling per shared fact > the shared record guard rejects arrays and null [2.60ms]
@bryance/orch test: (pass) one spelling per shared fact > removed identity method has no source spelling [24.75ms]
@bryance/orch test: (pass) one spelling per shared fact > settings reads have no literal fallbacks [24.41ms]
@bryance/orch test: (pass) one spelling per shared fact > launch env has one spelling [72.91ms]
@bryance/orch test: (pass) one spelling per shared fact > removed spawn cap has no source or README spelling [37.75ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-hardening.test.ts:
@bryance/orch test: (pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [7.55ms]
@bryance/orch test: 
@bryance/orch test: test\queue-reaping.test.ts:
@bryance/orch test: (pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > a failed task whose scope is gone is unrunnable and survives every retention sweep [103.36ms]
@bryance/orch test: 
@bryance/orch test: test\notify-event.test.ts:
@bryance/orch test: (pass) notify events > accepts every event member [20.25ms]
@bryance/orch test: (pass) notify events > rejects invalid event shapes [2.05ms]
@bryance/orch test: (pass) notify events > reads agent state only from state events [0.05ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-hardening.test.ts:
@bryance/orch test: (pass) adapter and runtime hardening > rejects unknown settings keys with a useful path [62.05ms]
@bryance/orch test: (pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [19.36ms]
@bryance/orch test: (pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [4.14ms]
@bryance/orch test: 
@bryance/orch test: test\governance-stamp.test.ts:
@bryance/orch test: (pass) stampGovernance > returns the same params when caller is absent [5.45ms]
@bryance/orch test: 
@bryance/orch test: test\notify-events-format.test.ts:
@bryance/orch test: (pass) notification and presence event formatting > spaceColor is stable and returns a palette hex [0.17ms]
@bryance/orch test: 
@bryance/orch test: test\settings-notify.test.ts:
@bryance/orch test: (pass) orch settings notify > re-adding one sink replaces it in place and keeps the fields the call omits [119.78ms]
@bryance/orch test: (pass) orch settings notify > accepts asking as a first-class sink state [29.13ms]
@bryance/orch test: (pass) orch settings notify > remove drops only the named sink [93.75ms]
@bryance/orch test: (pass) orch settings notify > list reports each sink with the states it fires on, defaults included [73.21ms]
@bryance/orch test: (pass) orch settings notify > an empty notify array lists as none configured [4.50ms]
@bryance/orch test: (pass) orch settings notify > the notify row lists every sink, the states it may fire on, and the fields each carries [24.28ms]
@bryance/orch test: (pass) orch settings notify > the notify row writes the picked sinks, states included, and drops the ones left off [31.36ms]
@bryance/orch test: (pass) orch settings notify > the notify row refuses an unknown sink, a carrying sink with nothing to carry, and an unknown state [2.89ms]
@bryance/orch test: 
@bryance/orch test: test\settings-watch.test.ts:
@bryance/orch test: (pass) watchSettings > keeps the last-good settings, warns once, and recovers [403.36ms]
@bryance/orch test: (pass) watchSettings > reloads on a touched reload.signal without a settings edit [43.38ms]
@bryance/orch test: 
@bryance/orch test: test\governance-stamp.test.ts:
@bryance/orch test: (pass) stampGovernance > stamps a launch credential as an operator [131.63ms]
@bryance/orch test: (pass) stampGovernance > drops a forged actor when the caller resolves to nobody [2.19ms]
@bryance/orch test: (pass) stampGovernance > rejects steal from a driving session [2.07ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-model-flag.test.ts:
@bryance/orch test: (pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [0.10ms]
@bryance/orch test: (pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.08ms]
@bryance/orch test: (pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.06ms]
@bryance/orch test: (pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.06ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > pi interactive builders pass the quicklist as one quoted --models argument [0.35ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > pi headless builders pass the quicklist as one verbatim argv entry [0.13ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > pi omits --models cleanly for an absent or empty quicklist [0.07ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > pi keeps quicklist order and provider punctuation intact [0.03ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > omp interactive builders pass the quicklist as one quoted --models argument [0.05ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > omp headless builders pass the quicklist as one verbatim argv entry [0.02ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > omp omits --models cleanly for an absent or empty quicklist [0.07ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > omp keeps quicklist order and provider punctuation intact
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > a model outside the quicklist is still what the launch runs on [0.07ms]
@bryance/orch test: 
@bryance/orch test: test\settings-precedence.test.ts:
@bryance/orch test: (pass) settings precedence > returns a defaults value when no override is set [21.87ms]
@bryance/orch test: 
@bryance/orch test: test\commands-fleet.test.ts:
@bryance/orch test: (pass) commands/fleet > reads an empty fleet [233.93ms]
@bryance/orch test: 
@bryance/orch test: test\settings-precedence.test.ts:
@bryance/orch test: (pass) settings precedence > applies defaults when settings, env, and flag are absent [5.14ms]
@bryance/orch test: (pass) settings precedence > uses env over settings and flag over env [5.40ms]
@bryance/orch test: (pass) settings precedence > parses notify entries and hosts into expected shapes [7.59ms]
@bryance/orch test: (pass) settings precedence > reports a helpful validation error for invalid settings [5.27ms]
@bryance/orch test: 
@bryance/orch test: test\agent-view.test.ts:
@bryance/orch test: (pass) the agent composer > each axis composes independently, and moving one leaves identity untouched [117.48ms]
@bryance/orch test: (pass) the agent composer > tuning is not environment: it survives a move [180.32ms]
@bryance/orch test: (pass) the agent composer > ownership reads as a live lease, and a released one is not ownership [211.28ms]
@bryance/orch test: (pass) the agent composer > provenance is on the view and is not the same fact as ownership [167.47ms]
@bryance/orch test: (pass) the agent composer > provenance carries the spawner's name, read as a join and never stored twice [165.42ms]
@bryance/orch test: (pass) the agent composer > an agent with no spawner reports no spawner name [139.51ms]
@bryance/orch test: (pass) the agent composer > agentViews is oldest-first and liveAgentViews drops ended agents [109.19ms]
@bryance/orch test: (pass) the agent composer > the axis list is the only place every axis is enumerated [0.76ms]
@bryance/orch test: (pass) the agent composer > the composed shape is exactly the axis list, with nothing extra and nothing missing [125.28ms]
@bryance/orch test: (pass) the agent composer > an unknown agent is null, never an empty shell [146.10ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-declared-vs-reality.test.ts:
@bryance/orch test: (pass) doctor declared-vs-reality > reports a lease whose recorded holder process is dead [221.09ms]
@bryance/orch test: (pass) doctor declared-vs-reality > reports an environment handle missing from its plexer [161.22ms]
@bryance/orch test: (pass) doctor declared-vs-reality > reports a live agent with no lease and no live spawner [130.97ms]
@bryance/orch test: (pass) doctor declared-vs-reality > surfaces a missing task scope row as unrunnable [336.49ms]
@bryance/orch test: (pass) doctor declared-vs-reality > doctor -y does not delete an unrunnable task [227.48ms]
@bryance/orch test: 
@bryance/orch test: test\one-writer-records-a-spawned-agent.test.ts:
@bryance/orch test: (pass) one writer records a spawned agent (2.1) > registerSpawnedAgent alone writes the COMPLETE record ΓÇö space and lease included [159.79ms]
@bryance/orch test: 
@bryance/orch test: test\pi-model-control.test.ts:
@bryance/orch test: (pass) createModelControl.applyControlCommand > reports a failure outcome when the model is rejected [1840.81ms]
@bryance/orch test: 
@bryance/orch test: test\notify-events-format.test.ts:
@bryance/orch test: (pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.18ms]
@bryance/orch test: (pass) notification and presence event formatting > named events prefer the human name over the harness id [0.05ms]
@bryance/orch test: (pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.12ms]
@bryance/orch test: (pass) notification and presence event formatting > message notification titles contain delivered mail text [0.06ms]
@bryance/orch test: (pass) notification and presence event formatting > webhook payload includes space and spaceColor [0.66ms]
@bryance/orch test: (pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [142.73ms]
@bryance/orch test: (pass) notification and presence event formatting > transitionEventFromRow composes the space from the agent's environment [132.19ms]
@bryance/orch test: 
@bryance/orch test: test\pid-liveness.test.ts:
@bryance/orch test: (pass) pidAlive liveness contract (shared by pi peers) > EPERM means the process exists under another user ΓÇö alive [0.20ms]
@bryance/orch test: (pass) pidAlive liveness contract (shared by pi peers) > ESRCH means no such process ΓÇö dead [0.16ms]
@bryance/orch test: (pass) pidAlive liveness contract (shared by pi peers) > the current process is alive [0.05ms]
@bryance/orch test: (pass) pidAlive liveness contract (shared by pi peers) > non-positive and non-numeric pids are rejected without signalling [0.05ms]
@bryance/orch test: 
@bryance/orch test: test\settings-registry.test.ts:
@bryance/orch test: (pass) settings registry > declares every schema setting exactly once [7.69ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-pi.test.ts:
@bryance/orch test: (pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.60ms]
@bryance/orch test: 
@bryance/orch test: test\queue-reaping.test.ts:
@bryance/orch test: (pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > unrunnable is about who is alive now ΓÇö a new pack member makes it claimable again [95.81ms]
@bryance/orch test: (pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > stale is surfaced beside its state and never deleted on age [131.00ms]
@bryance/orch test: (pass) Cq12: an orphaned task has take-on, leave and reap, all deliberate > take-on re-scopes to the taker's own pack and the work becomes claimable there [128.09ms]
@bryance/orch test: (pass) Cq12: an orphaned task has take-on, leave and reap, all deliberate > take-on refuses a taker that is not itself live [99.94ms]
@bryance/orch test: 
@bryance/orch test: test\commands-fleet.test.ts:
@bryance/orch test: (pass) commands/fleet > reads agent views and indexes presence by key [209.76ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-runtime.test.ts:
@bryance/orch test: (pass) shebangRuntime > reads #!/usr/bin/env node as node [4.75ms]
@bryance/orch test: 
@bryance/orch test: test\ambiguous-target-says-what-to-do.test.ts:
@bryance/orch test: (pass) an ambiguous target names the failure and the way out (U3) > the message names the failure, the target string, and every candidate [0.42ms]
@bryance/orch test: (pass) an ambiguous target names the failure and the way out (U3) > it says what to send instead, so the caller is not left guessing [0.35ms]
@bryance/orch test: (pass) an ambiguous target names the failure and the way out (U3) > it is a refusal, not an exit ΓÇö the caller can act on it [0.18ms]
@bryance/orch test: (pass) an ambiguous target names the failure and the way out (U3) > resolveAgentView raises that same one message [1.12ms]
@bryance/orch test: 
@bryance/orch test: test\plexer-versions.test.ts:
@bryance/orch test: (pass) plexer version support > a floor admits every version at or above it [6.94ms]
@bryance/orch test: 
@bryance/orch test: test\notify-router.test.ts:
@bryance/orch test: (pass) notify router > delivers only when on includes the event state [0.50ms]
@bryance/orch test: (pass) notify router > passes typed webhook and command configuration [0.90ms]
@bryance/orch test: (pass) notify router > surfaces notifier errors [0.25ms]
@bryance/orch test: 
@bryance/orch test: test\store-queue.test.ts:
@bryance/orch test: (pass) queue facade storage > retention deletes only settled tasks older than the cutoff [132.73ms]
@bryance/orch test: (pass) queue facade storage > retention never removes a queued task based on its age [139.10ms]
@bryance/orch test: (pass) queue facade storage > agent-scoped tasks become unrunnable when their agent ends [124.01ms]
@bryance/orch test: (pass) queue facade storage > completed tasks stay done after their scope agent ends [151.16ms]
@bryance/orch test: (pass) queue facade storage > a dead orch does not make a pack task unrunnable while a member lives [92.98ms]
@bryance/orch test: (pass) queue facade storage > pack-scoped tasks become unrunnable when every pack member ends [155.99ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-runtime.test.ts:
@bryance/orch test: (pass) shebangRuntime > reads #!/usr/bin/env bun as bun [3.64ms]
@bryance/orch test: (pass) shebangRuntime > reads #!/usr/bin/env deno as deno [3.72ms]
@bryance/orch test: (pass) shebangRuntime > reads #!/usr/local/bin/node as node [17.60ms]
@bryance/orch test: (pass) shebangRuntime > does not mistake a longer binary name for a runtime [3.60ms]
@bryance/orch test: (pass) shebangRuntime > returns null for a file with no shebang [3.54ms]
@bryance/orch test: (pass) shebangRuntime > returns null for an unreadable path [0.98ms]
@bryance/orch test: (pass) runningRuntime > reports the runtime this suite is executing under [0.12ms]
@bryance/orch test: (pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [20.57ms]
@bryance/orch test: (pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [5.35ms]
@bryance/orch test: (pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [4.60ms]
@bryance/orch test: (pass) doctor runtime verdict table > launching under bun while declaring node is fine [4.57ms]
@bryance/orch test: (pass) doctor runtime verdict table > launching under node while declaring bun is fine [4.11ms]
@bryance/orch test: (pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [4.41ms]
@bryance/orch test: (pass) doctor runtime verdict table > declared runtime absent from PATH fails [4.66ms]
@bryance/orch test: (pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [5.03ms]
@bryance/orch test: (pass) doctor runtime verdict table > remediation names both directions ΓÇö rebuild, or re-record the declaration [6.41ms]
@bryance/orch test: (pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [1.14ms]
@bryance/orch test: 
@bryance/orch test: test\settings-registry.test.ts:
@bryance/orch test: (pass) settings registry > every registry read resolves against loaded settings [23.77ms]
@bryance/orch test: (pass) settings registry > fleet help explains what each limit counts [0.87ms]
@bryance/orch test: (pass) settings registry > fleet.max_depth round-trips through the full-tree writer [42.47ms]
@bryance/orch test: (pass) settings registry > fleet.max_depth rejects zero through the registered writer [34.23ms]
@bryance/orch test: (pass) settings registry > fleet.max_depth writes its value to settings.json [48.79ms]
@bryance/orch test: (pass) settings registry > retention.ended_agents_days is an integer that accepts none [0.43ms]
@bryance/orch test: (pass) settings registry > retention.ended_agents_days writes null and reads it back as null [14.95ms]
@bryance/orch test: (pass) settings registry > an integer without none refuses none [6.22ms]
@bryance/orch test: (pass) settings registry > contains no duplicate keys [10.21ms]
@bryance/orch test: (pass) settings registry > agents.writable_settings writes a list of registered keys [34.56ms]
@bryance/orch test: (pass) settings registry > agents.writable_settings refuses an unknown key [2.55ms]
@bryance/orch test: (pass) settings registry > agents.writable_settings refuses a read-only key [1.98ms]
@bryance/orch test: (pass) settings registry > agents.writable_settings never grants itself [1.93ms]
@bryance/orch test: (pass) settings registry > the model rows open the model picker and still parse JSON on the CLI [0.21ms]
@bryance/orch test: 
@bryance/orch test: test\settings-watch.test.ts:
@bryance/orch test: (pass) watchSettings > stop prevents further callbacks [464.98ms]
@bryance/orch test: 
@bryance/orch test: test\queue-scope.test.ts:
@bryance/orch test: (pass) queue scope invariants > a failed pack task retries on another pack member, while an agent task stays pinned [127.95ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-pi.test.ts:
@bryance/orch test: (pass) PiAdapter > restricted workers explicitly load the bundled pi extension [0.40ms]
@bryance/orch test: (pass) PiAdapter > declares its lifecycle slash-commands [0.17ms]
@bryance/orch test: (pass) PiAdapter > reads state from the presence status through store helpers [187.07ms]
@bryance/orch test: (pass) PiAdapter > reads the reported result and falls back to the last assistant session text [36.79ms]
@bryance/orch test: (pass) PiAdapter > parses pi's supported model table without importing harness internals [0.58ms]
@bryance/orch test: 
@bryance/orch test: test\notify-sinks.test.ts:
@bryance/orch test: (pass) notification entries > desktop entries use the canonical notifier registry [0.46ms]
@bryance/orch test: 
@bryance/orch test: test\hello-environment.test.ts:
@bryance/orch test: (pass) hello records the environment in full > the plexer the caller registered in is on the agent, not only on the host [239.63ms]
@bryance/orch test: 
@bryance/orch test: test\settings.test.ts:
@bryance/orch test: (pass) loadSettings > refuses to invent settings when settings.json is missing [5.75ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-settings-defects.test.ts:
@bryance/orch test: (pass) doctor settings defects > accepts an absent settings file [1.72ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-roles.test.ts:
@bryance/orch test: (pass) adapter role composition > composes complete roles per adapter [0.27ms]
@bryance/orch test: (pass) adapter role composition > answers with zero exit code when a shim role is absent [0.20ms]
@bryance/orch test: 
@bryance/orch test: test\plexer-versions.test.ts:
@bryance/orch test: (pass) plexer version support > compares numeric versions rather than lexical strings [0.05ms]
@bryance/orch test: (pass) plexer version support > rotates one open host install row when the plexer changes version [278.60ms]
@bryance/orch test: (pass) plexer version support > doctor names both versions and tells the operator to update the plexer [0.33ms]
@bryance/orch test: (pass) plexer version support > a supported plexer the user never installed is not a complaint [0.05ms]
@bryance/orch test: (pass) plexer version support > an in-range install reports ok with the version it read [0.07ms]
@bryance/orch test: (pass) plexer version support > a compatible server rides along on the row without complaint [0.07ms]
@bryance/orch test: (pass) plexer version support > a server the installed client outgrew fails and names the restart [0.05ms]
@bryance/orch test: (pass) plexer version support > a server that reports no compatibility is unknown, never a failure [0.05ms]
@bryance/orch test: (pass) plexer version support > a plexer with no server running says nothing about one [0.04ms]
@bryance/orch test: (pass) plexer version support > only an installed plexer that cannot report a version warns [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\store-rebuild-schema.test.ts:
@bryance/orch test: (pass) rebuild schema > rebuild DDL inventory is exact [97.34ms]
@bryance/orch test: 
@bryance/orch test: test\port-has-no-shell.test.ts:
@bryance/orch test: (pass) the backend port has no dead workspace shell > backend types contain neither deleted declaration [0.23ms]
@bryance/orch test: 
@bryance/orch test: test\commands-help.test.ts:
@bryance/orch test: (pass) per-command help topics > daemon help names every subcommand and the idle shutdown setting [1.50ms]
@bryance/orch test: 
@bryance/orch test: test\notify.test.ts:
@bryance/orch test: (pass) notification routing > an excluded state does not invoke its notifier [0.39ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-session-env.test.ts:
@bryance/orch test: (pass) adapter-owned session environment > resolves each caller harness through the public session resolver [1.34ms]
@bryance/orch test: 
@bryance/orch test: test\commands-help.test.ts:
@bryance/orch test: (pass) per-command help topics > aliases resolve to their command's topic [2.18ms]
@bryance/orch test: (pass) per-command help topics > logs help names every filter the command accepts [0.45ms]
@bryance/orch test: (pass) per-command help topics > an unknown name has no topic [0.03ms]
@bryance/orch test: (pass) per-command help topics > every topic is printable text ending in a newline [4.73ms]
@bryance/orch test: 
@bryance/orch test: test\port-has-no-shell.test.ts:
@bryance/orch test: (pass) the backend port has no dead workspace shell > src contains no workspaceNames calls or BackendWorkspace references [25.37ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-roundtrip.test.ts:
@bryance/orch test: (pass) repairing a settings.json the schema rejects > reports every rejected key without touching the file [76.59ms]
@bryance/orch test: 
@bryance/orch test: test\port-no-optional-methods.test.ts:
@bryance/orch test: (pass) the environment port declares capability by composition, never by optionality > src/types/backend.ts has no optional methods on any port interface [1.29ms]
@bryance/orch test: (pass) the environment port declares capability by composition, never by optionality > the deleted capability flags bag is gone, not merely unimplemented [0.52ms]
@bryance/orch test: (pass) the environment port declares capability by composition, never by optionality > src/types/adapter.ts has no optional methods on the harness port either [1.18ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-session-env.test.ts:
@bryance/orch test: (pass) adapter-owned session environment > keeps harness env literals inside adapter modules [41.06ms]
@bryance/orch test: (pass) adapter-owned session environment > a registered adapter resolves a novel marker without resolver changes [0.55ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) answer over the bridge > pushes the answer and its question id [356.80ms]
@bryance/orch test: 
@bryance/orch test: test\agent-key-is-minted-id.test.ts:
@bryance/orch test: (pass) a driving session mints an id, it is not placed by name > the key an interactive session addresses itself by is a bare minted id [5.91ms]
@bryance/orch test: 
@bryance/orch test: test\commands-index.test.ts:
@bryance/orch test: (pass) commands/index > does not gate help or noninteractive commands [0.07ms]
@bryance/orch test: (pass) commands/index > reads the package name and version [0.72ms]
@bryance/orch test: (pass) commands/index > prints the daemon's unleased list and stays silent on an empty one [0.16ms]
@bryance/orch test: (pass) commands/index > dispatches representative commands and reports unknown commands [13.78ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-roundtrip.test.ts:
@bryance/orch test: (pass) repairing a settings.json the schema rejects > a removed key is never guessed at - it offers no rename [19.63ms]
@bryance/orch test: (pass) repairing a settings.json the schema rejects > the choices a person makes leave the file loadable [137.95ms]
@bryance/orch test: (pass) repairing a settings.json the schema rejects > a typo keeps its value: renaming carries it to the real key [23.58ms]
@bryance/orch test: (pass) repairing a settings.json the schema rejects > leaving every defect alone writes nothing at all [8.01ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-screen.test.ts:
@bryance/orch test: (pass) repair action labels > names the key a rename lands on, so the destination is never a guess [0.05ms]
@bryance/orch test: (pass) repair action labels > names the value a set writes [0.02ms]
@bryance/orch test: (pass) repair action labels > drop and leave say only what they do [0.02ms]
@bryance/orch test: (pass) repair frame > shows every defect with the value the person wrote [0.57ms]
@bryance/orch test: (pass) repair frame > promises that nothing changes before a save, because nothing does [0.06ms]
@bryance/orch test: (pass) repair frame > every defect starts at leave, so opening the screen destroys nothing [0.03ms]
@bryance/orch test: (pass) repair frame > a chosen repair is shown as what it will do [0.04ms]
@bryance/orch test: (pass) repair frame > the focused row's offered keys are shown, so no choice has to be guessed [0.08ms]
@bryance/orch test: (pass) repair frame > the count reads as English for one defect and for many [0.05ms]
@bryance/orch test: (pass) repair frame > no row runs past the terminal width, tag included [0.07ms]
@bryance/orch test: (pass) repair frame > the file being repaired is named in the header [0.04ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-boundary.test.ts:
@bryance/orch test: (pass) port seam command boundary > headless target is answered without invoking its pane role [0.20ms]
@bryance/orch test: (pass) port seam command boundary > paned environment without a role is answered at the boundary [0.05ms]
@bryance/orch test: (pass) port seam command boundary > an invocation preserves the provider failure [0.14ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-settings-defects.test.ts:
@bryance/orch test: (pass) doctor settings defects > accepts a clean settings file and keeps its path detail [23.00ms]
@bryance/orch test: (pass) doctor settings defects > reports malformed JSON as a file defect [3.05ms]
@bryance/orch test: (pass) doctor settings defects > reports a read failure instead of throwing [1.81ms]
@bryance/orch test: (pass) doctor settings defects > warns about a key this orch does not know, which a newer orch added [48.28ms]
@bryance/orch test: (pass) doctor settings defects > fails on a typo with the value that was written [37.65ms]
@bryance/orch test: (pass) doctor settings defects > reports a typo with its suggested key [20.05ms]
@bryance/orch test: (pass) doctor settings defects > reports the expected schema version [4.68ms]
@bryance/orch test: (pass) doctor settings defects > skips settings-dependent checks with a short repair hint [266.47ms]
@bryance/orch test: 
@bryance/orch test: test\offline-is-not-a-second-source.test.ts:
@bryance/orch test: (pass) --offline is a narrower view of ONE source, not a second one (M8) > offline and online read the same agents from the same presence files [193.88ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-write.test.ts:
@bryance/orch test: (pass) applySettingsRepairs > rename carries the value to the new key [63.39ms]
@bryance/orch test: 
@bryance/orch test: test\offline-is-not-a-second-source.test.ts:
@bryance/orch test: (pass) --offline is a narrower view of ONE source, not a second one (M8) > offline reports the SAME state the agent reported, never a second opinion [178.66ms]
@bryance/orch test: (pass) --offline is a narrower view of ONE source, not a second one (M8) > there is exactly ONE row builder, and --offline only narrows what it asks [0.63ms]
@bryance/orch test: (pass) --offline is a narrower view of ONE source, not a second one (M8) > offline is the one path that never dials or starts the daemon [0.23ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-write.test.ts:
@bryance/orch test: (pass) applySettingsRepairs > rename onto an occupied key throws and leaves the file untouched [5.37ms]
@bryance/orch test: (pass) applySettingsRepairs > set writes a value at a dotted path [11.44ms]
@bryance/orch test: (pass) applySettingsRepairs > drop deletes a value without pruning its parent [11.77ms]
@bryance/orch test: (pass) applySettingsRepairs > applies several repairs in one call [25.37ms]
@bryance/orch test: (pass) applySettingsRepairs > repairs a schema-rejected file before readSettingsFile validates it [32.19ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair.test.ts:
@bryance/orch test: (pass) settings repair choices > offers rename, set, drop, then leave when all repairs apply [0.10ms]
@bryance/orch test: (pass) settings repair choices > offers only rename when there is only a suggestion [0.03ms]
@bryance/orch test: (pass) settings repair choices > offers only set when there is only an expected value [0.02ms]
@bryance/orch test: (pass) settings repair choices > always offers leave, and cannot drop a file-level defect [0.04ms]
@bryance/orch test: (pass) settings repair reducer > starts every defect at leave and focus at zero [0.04ms]
@bryance/orch test: (pass) settings repair reducer > refuses choices the focused defect does not offer and reports why [0.21ms]
@bryance/orch test: (pass) settings repair reducer > clamps focus at both ends and clears a prior reason [0.07ms]
@bryance/orch test: (pass) settings repair reducer > maps non-leave choices to repairs in defect order [0.09ms]
@bryance/orch test: (pass) settings repair reducer > leave produces no repair [0.02ms]
@bryance/orch test: (pass) settings repair reducer > empty defects make every action a no-op [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lease.test.ts:
@bryance/orch test: (pass) lease commands > detach releases the lease and is a no-op when already unleased [181.23ms]
@bryance/orch test: 
@bryance/orch test: test\hello-environment.test.ts:
@bryance/orch test: (pass) hello records the environment in full > the place the caller occupies in its plexer is recorded at hello [123.58ms]
@bryance/orch test: (pass) hello records the environment in full > a session that moved to another place re-registers with the new one, and one row stays open [114.36ms]
@bryance/orch test: (pass) hello records the environment in full > the space the caller registered in is recorded at hello, not inferred later [136.27ms]
@bryance/orch test: (pass) hello records the environment in full > a session in no space and no plexer records neither, and that is an answer [134.18ms]
@bryance/orch test: (pass) hello records the environment in full > re-registering the same session does not re-root or re-place it [129.22ms]
@bryance/orch test: (pass) hello records the environment in full > the claim carries every environment fact hello has to record [124.40ms]
@bryance/orch test: 
@bryance/orch test: test\queue-scope.test.ts:
@bryance/orch test: (pass) queue scope invariants > cancel is allowed for the enqueuer or a lease holder of a targeted agent [189.96ms]
@bryance/orch test: (pass) queue scope invariants > cancel refuses a caller who is neither enqueuer nor targeted lease holder [86.67ms]
@bryance/orch test: (pass) queue scope invariants > edit is allowed only for the enqueuer while queued [195.23ms]
@bryance/orch test: (pass) queue scope invariants > an orphan has exactly take-on, leave, and reap resolutions [142.58ms]
@bryance/orch test: (pass) queue scope invariants > stale queued work is surfaced distinctly and never deleted by age [122.14ms]
@bryance/orch test: (pass) queue scope invariants > two concurrent claims have one winner and one one_open_attempt violation [150.70ms]
@bryance/orch test: 
@bryance/orch test: test\backend-tmux.test.ts:
@bryance/orch test: (pass) TmuxBackend > does not expose legacy top-level group methods [0.16ms]
@bryance/orch test: (pass) TmuxBackend > composes a complete group role bundle [0.11ms]
@bryance/orch test: (pass) TmuxBackend > exposes tmux pane roles [0.08ms]
@bryance/orch test: (pass) TmuxBackend > reads the pane shell pid as the pane process [0.68ms]
@bryance/orch test: (pass) TmuxBackend > reports tmux availability [10.82ms]
@bryance/orch test: (pass) TmuxBackend > reflects the TMUX environment [0.26ms]
@bryance/orch test: (pass) TmuxBackend > rejects an empty handle without invoking tmux [0.10ms]
@bryance/orch test: (pass) TmuxBackend > the pane inventory surfaces only orch-spawned panes [0.79ms]
@bryance/orch test: (pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.18ms]
@bryance/orch test: (pass) TmuxBackend > inventory status is read from the pane's presence status.json [146.69ms]
@bryance/orch test: (pass) TmuxBackend > inventory status is null when no presence status.json exists [0.28ms]
@bryance/orch test: (pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [263.86ms]
@bryance/orch test: (pass) TmuxBackend > waiting fails immediately when the pane has no presence key [0.38ms]
@bryance/orch test: (pass) TmuxBackend > the pane screen returns captured text and throws when capture-pane fails [1806.12ms]
@bryance/orch test: (pass) TmuxBackend > setLabel and renameAgent write two distinct pane options [1.08ms]
@bryance/orch test: (pass) TmuxBackend > placement.open splits the requested target with cwd and environment [0.51ms]
@bryance/orch test: (pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.82ms]
@bryance/orch test: (pass) TmuxBackend > spawn splits the planned target pane, not whatever pane the window has active [0.26ms]
@bryance/orch test: (pass) TmuxBackend > groupLayout reports every pane in a window with its cell geometry [0.33ms]
@bryance/orch test: (pass) TmuxBackend > spawn opens a new window via new-window when no group is given [2.49ms]
@bryance/orch test: (pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [0.57ms]
@bryance/orch test: (pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.35ms]
@bryance/orch test: (pass) an agent is launched with its fleet's project scope (1.13) > a tmux agent in a worktree carries the FLEET's project, not its own cwd [0.38ms]
@bryance/orch test: (pass) an agent is launched with its fleet's project scope (1.13) > a tmux agent opened in a fresh window carries it too [0.23ms]
@bryance/orch test: (pass) an agent is launched with its fleet's project scope (1.13) > an empty value is dropped rather than exported as a configured blank [1.47ms]
@bryance/orch test: 
@bryance/orch test: test\settings-shell.test.ts:
@bryance/orch test: (pass) settings shell decisions > non-TTY takes the print path [4.62ms]
@bryance/orch test: 
@bryance/orch test: test\one-bind-for-the-unix-endpoint.test.ts:
@bryance/orch test: (pass) one bind for the unix endpoint (2.4) > the unix endpoint is claimed in exactly one place [0.10ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-settings-preservation.test.ts:
@bryance/orch test: (pass) doctor settings preservation > yes mode leaves existing settings.json byte-identical [269.98ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-channel.test.ts:
@bryance/orch test: (pass) orch bridge links and capture roles > headless delivery reaches the link and the ack settles its outbox row [181.91ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) answer over the bridge > returns not-asking without pushing [214.49ms]
@bryance/orch test: (pass) answer over the bridge > reports a detached bridge for a live asking agent [182.90ms]
@bryance/orch test: (pass) answer over the bridge > reports a gone asking agent [149.69ms]
@bryance/orch test: (pass) answer over the bridge > answers with a clear absence when the adapter takes no answers [170.23ms]
@bryance/orch test: 
@bryance/orch test: test\settings.test.ts:
@bryance/orch test: (pass) loadSettings > requires a top-level runtime and never defaults it [7.73ms]
@bryance/orch test: (pass) loadSettings > rejects an unrecognized runtime naming the accepted values [4.41ms]
@bryance/orch test: (pass) loadSettings > a runtime misplaced under defaults is not the declared runtime [39.13ms]
@bryance/orch test: (pass) loadSettings > reads the declared runtime [13.33ms]
@bryance/orch test: (pass) loadSettings > parses every supported settings section [49.18ms]
@bryance/orch test: (pass) loadSettings > reads question re-ask and retention sweep settings [5.10ms]
@bryance/orch test: (pass) loadSettings > rejects a file without the current schemaVersion [13.68ms]
@bryance/orch test: (pass) loadSettings > rejects invalid JSON loudly [3.27ms]
@bryance/orch test: (pass) loadSettings > names the key path for invalid fields [22.23ms]
@bryance/orch test: (pass) loadSettings > rejects a misspelled settings key by name [8.18ms]
@bryance/orch test: (pass) loadSettings > parses models.allowed as a per-harness pattern map [33.04ms]
@bryance/orch test: (pass) loadSettings > loads the fleet keys [24.95ms]
@bryance/orch test: (pass) loadSettings > a key far from every declared key is ignored, never read as a setting [100.72ms]
@bryance/orch test: (pass) loadSettings > rejects legacy notify type and unknown ids [24.96ms]
@bryance/orch test: (pass) loadSettings > applies every settings default when sections are absent [15.95ms]
@bryance/orch test: (pass) loadSettings > preserves configured values while defaulting each missing section value [7.93ms]
@bryance/orch test: (pass) loadSettings > rejects non-positive and non-integer retention windows [34.70ms]
@bryance/orch test: (pass) loadSettings > rejects a host without dest [5.46ms]
@bryance/orch test: (pass) loadSettings > rejects an unknown id in enabled.adapters [7.68ms]
@bryance/orch test: (pass) loadSettings > rejects defaults.adapter not present in enabled.adapters [16.42ms]
@bryance/orch test: (pass) loadSettings > rejects when settings.json is absent but a legacy config.toml exists [2.42ms]
@bryance/orch test: (pass) allowedModelPatterns > restricts nothing when settings contain no patterns [3.67ms]
@bryance/orch test: (pass) allowedModelPatterns > returns the configured patterns when set [4.68ms]
@bryance/orch test: (pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or enabled entry [38.19ms]
@bryance/orch test: (pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [29.27ms]
@bryance/orch test: (pass) writeSettingsRuntime > a different runtime replaces the single value in place [31.35ms]
@bryance/orch test: (pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [13.98ms]
@bryance/orch test: (pass) reapUnreadableSettings > leaves a readable file alone [4.36ms]
@bryance/orch test: (pass) writeSettingsEnabled > round-trips both provider arrays [23.61ms]
@bryance/orch test: (pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [57.18ms]
@bryance/orch test: (pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [23.43ms]
@bryance/orch test: (pass) writeSettingsDefault > is idempotent when rewriting the same value [38.39ms]
@bryance/orch test: (pass) writeSettingsDefault > refuses to write through an out-of-version settings file [8.57ms]
@bryance/orch test: (pass) writeSettingsDefault > switches defaults.adapter between two enabled ids and loads clean [33.63ms]
@bryance/orch test: (pass) writeSettingsFullTree > round-trips defaults without inventing max_agents_total [19.91ms]
@bryance/orch test: (pass) settings precedence > uses the fallback when env and settings.json omit a setting [3.59ms]
@bryance/orch test: (pass) settings precedence > uses the settings.json value over the fallback [4.46ms]
@bryance/orch test: (pass) settings precedence > uses the ORCH_* environment value over settings.json [3.90ms]
@bryance/orch test: (pass) settings precedence > uses an explicit flag override over the environment [0.15ms]
@bryance/orch test: (pass) resolveSetting > uses flag, environment coercion, settings, then fallback in precedence order [0.38ms]
@bryance/orch test: (pass) resolveWithSource > rejects an environment value with the wrong shape [0.22ms]
@bryance/orch test: (pass) resolveWithSource > reports the winning source at each precedence level [0.20ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > loadSettings parses a per-harness preferred quicklist [19.70ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > an absent preferred map normalizes to an empty map, not to allowed [15.71ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > writing one list leaves the other byte-for-value intact [43.51ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > an empty list is recorded as no list at all, so a cleared picker really clears [47.30ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > the full tree seeds both maps when absent and preserves both when present [91.05ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > the allowlist gate reads models.allowed only [5.90ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-apply.test.ts:
@bryance/orch test: (pass) presence bridge delivery > applies dispatch before ack, dedupes redelivery, and detaches [11.90ms]
@bryance/orch test: 
@bryance/orch test: test\one-bind-for-the-unix-endpoint.test.ts:
@bryance/orch test: (pass) one bind for the unix endpoint (2.4) > reclaiming a stale socket yields the endpoint a first bind produces [164.87ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-apply.test.ts:
@bryance/orch test: (pass) presence bridge delivery > applies model deliveries through model control [14.34ms]
@bryance/orch test: (pass) presence bridge delivery > resolves matching answers and drops answers for other questions [4.12ms]
@bryance/orch test: 
@bryance/orch test: test\queue-space-replay.test.ts:
@bryance/orch test: (pass) queue replay keeps typed scope > stored scope offers pack work only to that pack [149.30ms]
@bryance/orch test: 
@bryance/orch test: test\command-gate.test.ts:
@bryance/orch test: (pass) matchedPatterns > matches a pattern at the start, after a separator, after a prefix command, and inside quotes [0.43ms]
@bryance/orch test: (pass) matchedPatterns > never matches a longer word [0.06ms]
@bryance/orch test: (pass) matchedPatterns > ignores a blank pattern [0.02ms]
@bryance/orch test: (pass) wholeCommandMatch > matches the bare command, with redirects or a pipe after it [0.23ms]
@bryance/orch test: (pass) wholeCommandMatch > never matches the command with arguments of its own [0.03ms]
@bryance/orch test: (pass) lockedCommandLine > wraps a match in orch lock and quotes the original command [1.40ms]
@bryance/orch test: (pass) lockedCommandLine > leaves a command with no match alone [0.36ms]
@bryance/orch test: (pass) lockedCommandLine > never wraps a command that is already wrapped [0.53ms]
@bryance/orch test: (pass) lockedCommandLine > never wraps a command the agent already sent through orch lock [0.76ms]
@bryance/orch test: (pass) heldPatterns > reads the patterns an ancestor orch lock exported [0.35ms]
@bryance/orch test: 
@bryance/orch test: test\settings-shell.test.ts:
@bryance/orch test: (pass) settings shell decisions > an overridden setting is refused with the winner named [5.45ms]
@bryance/orch test: (pass) settings shell decisions > registered writes use the registry entry [125.42ms]
@bryance/orch test: (pass) settings shell decisions > a committed choice shows its saved value on the next screen [38.18ms]
@bryance/orch test: (pass) settings shell decisions > the a key flips whether an agent may write the focused row [48.01ms]
@bryance/orch test: (pass) settings shell decisions > registry exposes writable subcommand entries [5.11ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-hud-environment.test.ts:
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > a herdr-placed agent reports the handle its environment carries [153.32ms]
@bryance/orch test: 
@bryance/orch test: test\setup-flags.test.ts:
@bryance/orch test: (pass) setup model flags > rejects a bare model when multiple harnesses are selected [0.42ms]
@bryance/orch test: (pass) setup model flags > binds each model flag to its own harness [0.10ms]
@bryance/orch test: (pass) setup model flags > allows a bare model for one harness [0.04ms]
@bryance/orch test: (pass) setup model flags > rejects a model bound to an unselected harness [0.14ms]
@bryance/orch test: (pass) setup model flags > rejects duplicate model flags for one harness [0.05ms]
@bryance/orch test: 
@bryance/orch test: test\backend-headless.test.ts:
@bryance/orch test: (pass) HeadlessBackend > refuses to spawn with no prompt ΓÇö a headless agent runs its prompt and exits [2.44ms]
@bryance/orch test: 
@bryance/orch test: test\queue.test.ts:
@bryance/orch test: (pass) queue facade on tasks and attempts > malformed task options are refused instead of handed back as TaskOptions [99.08ms]
@bryance/orch test: 
@bryance/orch test: test\setup-io.test.ts:
@bryance/orch test: (pass) setup prompt answer validation > refuses a single answer that was not offered [0.20ms]
@bryance/orch test: (pass) setup prompt answer validation > refuses multi-select answers containing an unoffered value [0.14ms]
@bryance/orch test: 
@bryance/orch test: test\pack-membership.test.ts:
@bryance/orch test: (pass) a pack is the provenance root > a registered session is an orch of a pack of one [169.61ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-hud-environment.test.ts:
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > the handle follows the agent when it moves pane [93.96ms]
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > an agent on another plexer is not a herdr pane [113.50ms]
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > a process orch never launched is not a herdr pane [2.35ms]
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > a key that is not a minted id resolves to no pane at all [50.26ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-notify-busy.test.ts:
@bryance/orch test: (pass) a herdr notification is delivered only when herdr says it was shown > shown is a delivery [0.18ms]
@bryance/orch test: (pass) a herdr notification is delivered only when herdr says it was shown > busy is NOT a delivery, however herdr exited [0.02ms]
@bryance/orch test: (pass) a herdr notification is delivered only when herdr says it was shown > every other refusal herdr can answer with is also not a delivery [0.07ms]
@bryance/orch test: (pass) a herdr notification is delivered only when herdr says it was shown > output that is not a herdr answer is never read as a delivery [0.14ms]
@bryance/orch test: (pass) a busy herdr is waited out, not dropped > a toast shown on the first try is sent once and waits for nothing [0.19ms]
@bryance/orch test: (pass) a busy herdr is waited out, not dropped > the toast shows in the configured corner [0.03ms]
@bryance/orch test: (pass) a busy herdr is waited out, not dropped > a busy herdr is retried after a wait, and the retry is the delivery [0.11ms]
@bryance/orch test: (pass) a busy herdr is waited out, not dropped > a herdr that stays busy gives up rather than blocking the daemon forever [0.16ms]
@bryance/orch test: (pass) a busy herdr is waited out, not dropped > a refusal that waiting cannot fix is not retried [0.04ms]
@bryance/orch test: 
@bryance/orch test: test\control-dispatch.test.ts:
@bryance/orch test: (pass) deliverControl bridge dispatch > reports a detached bridge for a live agent [188.67ms]
@bryance/orch test: (pass) deliverControl bridge dispatch > reports a gone agent before pushing to its link [141.06ms]
@bryance/orch test: (pass) deliverControl bridge dispatch > answers only when status has no pending question [129.42ms]
@bryance/orch test: (pass) deliverControl bridge dispatch > pushes an answer with the asking question id [147.00ms]
@bryance/orch test: (pass) deliverControl bridge dispatch > pushes model changes and waits for the control outcome [1126.69ms]
@bryance/orch test: (pass) deliverControl bridge dispatch > rejects an outcome whose applied pin differs from the request [1122.79ms]
@bryance/orch test: (pass) deliverControl bridge dispatch > uses the backend input path when the adapter bridge takes no steers [145.88ms]
@bryance/orch test: 
@bryance/orch test: test\setup-notifiers.test.ts:
@bryance/orch test: (pass) notifier setup logic > probes the built-in adapters [20.12ms]
@bryance/orch test: (pass) notifier setup logic > lists unavailable notifiers with remediation and disables selection [0.17ms]
@bryance/orch test: (pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.22ms]
@bryance/orch test: (pass) notifier setup logic > renders a command entry that loadSettings can parse [9.75ms]
@bryance/orch test: (pass) notifier setup logic > builds valid entries and reports invalid selections [0.34ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-notify-hardening.test.ts:
@bryance/orch test: (pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [4.42ms]
@bryance/orch test: (pass) herdr and notification hardening > falls back to a valid name when the identity key contains herdr-invalid separators [0.83ms]
@bryance/orch test: (pass) herdr and notification hardening > nameless notifications use a space label, never a bare pane key [1.59ms]
@bryance/orch test: 
@bryance/orch test: test\hermetic-env.test.ts:
@bryance/orch test: (pass) the test suite is hermetic > no plexer environment leaks in from the shell that launched bun [0.90ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-stale-presence.test.ts:
@bryance/orch test: (pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [406.79ms]
@bryance/orch test: 
@bryance/orch test: test\cross-pack-result-delivery.test.ts:
@bryance/orch test: (pass) results go to the enqueuer as mail > a result is an outbox row for the enqueuer, not the runner [136.61ms]
@bryance/orch test: 
@bryance/orch test: test\setup-smoke.test.ts:
@bryance/orch test: (pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [1.71ms]
@bryance/orch test: (pass) runSetupSmoke (12.5) > the agent is launched on the prompt it built [13.10ms]
@bryance/orch test: (pass) runSetupSmoke (12.5) > an agent that launches but yields no result times out and fails non-zero [1.81ms]
@bryance/orch test: (pass) runSetupSmoke (12.5) > a rejected spawn fails loudly and never polls for a result [1.38ms]
@bryance/orch test: 
@bryance/orch test: test\holder-death-costs-a-driver.test.ts:
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > the task in flight finishes and its result survives the holder [138.03ms]
@bryance/orch test: 
@bryance/orch test: test\identity-self.test.ts:
@bryance/orch test: (pass) selfIdentity > returns the launch id without touching the store [3709.67ms]
@bryance/orch test: 
@bryance/orch test: test\transfer-does-not-disturb.test.ts:
@bryance/orch test: (pass) a transfer touches the lease and nothing else > a handoff changes the holder and leaves every other fact identical [3518.64ms]
@bryance/orch test: 
@bryance/orch test: test\setup-wizard.test.ts:
@bryance/orch test: (pass) setup model picker > switches large catalogues to searchable bounded mode and preserves effort [0.46ms]
@bryance/orch test: (pass) setup model picker > keeps the compact selector for small catalogues [0.12ms]
@bryance/orch test: (pass) setup model list picker > large catalogues use the bounded searchable multiselect [0.29ms]
@bryance/orch test: (pass) setup model list picker > the prompt names both jobs the list does, and that an empty one forbids nothing [0.09ms]
@bryance/orch test: (pass) setup model list picker > every row shows the harness's own model name, not only the focused one [0.11ms]
@bryance/orch test: (pass) setup model list picker > stored values start checked, and clearing them returns an empty selection [0.15ms]
@bryance/orch test: 
@bryance/orch test: test\os-executors.test.ts:
@bryance/orch test: (pass) cross-OS execution is a backend, not a peer daemon > an OS side with no executor answers, and never runs the body [0.74ms]
@bryance/orch test: (pass) cross-OS execution is a backend, not a peer daemon > the local side runs the body and hands back its value [0.37ms]
@bryance/orch test: (pass) cross-OS execution is a backend, not a peer daemon > doctor passes a daemon registered on the side orch is running on [3512.25ms]
@bryance/orch test: (pass) cross-OS execution is a backend, not a peer daemon > doctor answers, rather than failing, for a daemon on a side with no executor [17.26ms]
@bryance/orch test: 
@bryance/orch test: test\identity.test.ts:
@bryance/orch test: (pass) serializeIdentity / parseIdentity > a key is the minted id verbatim [0.07ms]
@bryance/orch test: (pass) serializeIdentity / parseIdentity > round-trips a minted id [0.07ms]
@bryance/orch test: (pass) serializeIdentity / parseIdentity > a key is one flat filesystem-safe segment with nothing to split [0.12ms]
@bryance/orch test: (pass) serializeIdentity / parseIdentity > two spawns never collide, so no plexer is needed to namespace them [1.15ms]
@bryance/orch test: (pass) isAgentId > accepts a minted id [0.11ms]
@bryance/orch test: (pass) isAgentId > rejects everything that is not one [0.11ms]
@bryance/orch test: (pass) malformed input > rejects malformed ids [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\pack-membership.test.ts:
@bryance/orch test: (pass) a pack is the provenance root > membership is inherited from the spawner at any depth, never re-rooted [107.46ms]
@bryance/orch test: (pass) a pack is the provenance root > every agent is in exactly one pack, and two packs never share a member [107.02ms]
@bryance/orch test: (pass) a pack is the provenance root > a pack of one grows without re-rooting, and the root stays the orch [108.79ms]
@bryance/orch test: (pass) a pack is the provenance root > a lease or a move never changes which pack an agent is in [134.19ms]
@bryance/orch test: (pass) a pack is the provenance root > an agent cannot be spawned by someone who does not exist [143.88ms]
@bryance/orch test: 
@bryance/orch test: test\space-walls.test.ts:
@bryance/orch test: (pass) space helpers > an agent that moves space keeps its identity and reports the new space [13.48ms]
@bryance/orch test: (pass) space helpers > derives an entity space from the store [0.14ms]
@bryance/orch test: (pass) space helpers > returns the same entities when all spaces are requested [3423.83ms]
@bryance/orch test: (pass) space wall writes > allows a write within the same space [0.17ms]
@bryance/orch test: (pass) space wall writes > denies a cross-space write with both spaces in the reason [0.05ms]
@bryance/orch test: (pass) space wall writes > applies the same wall rule whatever plexer the agents sit in [0.09ms]
@bryance/orch test: (pass) space wall writes > allows a cross-space write with an explicit override [0.02ms]
@bryance/orch test: (pass) space wall writes > allows unplaced targets [0.01ms]
@bryance/orch test: 
@bryance/orch test: test\caller-kind.test.ts:
@bryance/orch test: (pass) caller kind > id + recorded token is agent [3703.66ms]
@bryance/orch test: 
@bryance/orch test: test\parse-target.test.ts:
@bryance/orch test: (pass) <host>/<target> grammar > keeps targets without a host unchanged [0.13ms]
@bryance/orch test: (pass) <host>/<target> grammar > parses configured host prefixes [0.03ms]
@bryance/orch test: (pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.07ms]
@bryance/orch test: (pass) <host>/<target> grammar > rejects empty hosts and targets [0.06ms]
@bryance/orch test: (pass) <host>/<target> grammar > formats local and host-prefixed targets [0.05ms]
@bryance/orch test: 
@bryance/orch test: test\launch-model-gate.test.ts:
@bryance/orch test: (pass) the model gate rules by harness membership, not by format > accepts a listed spec, with or without a thinking suffix [22.96ms]
@bryance/orch test: 
@bryance/orch test: test\skill-store-and-links.test.ts:
@bryance/orch test: (pass) skill store and harness links > writes real files to the store and links each harness dir into it [31.39ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc-identity.test.ts:
@bryance/orch test: (pass) daemon identity RPCs > claim-identity stamps a minted id [3495.02ms]
@bryance/orch test: 
@bryance/orch test: test\store-rebuild-schema.test.ts:
@bryance/orch test: (pass) rebuild schema > the store opens migrated, with foreign keys enabled [64.31ms]
@bryance/orch test: (pass) rebuild schema > all ten partial unique indexes allow only one open row [1208.36ms]
@bryance/orch test: (pass) rebuild schema > enforces foreign keys and agent checks [91.08ms]
@bryance/orch test: (pass) rebuild schema > requires exactly one task scope [127.82ms]
@bryance/orch test: (pass) rebuild schema > allows one open attempt only [142.09ms]
@bryance/orch test: (pass) rebuild schema > enforces lease checks and one lease [113.02ms]
@bryance/orch test: (pass) rebuild schema > remaining documented CHECKs and cascades are enforced [122.27ms]
@bryance/orch test: (pass) rebuild schema > task_states derives queued claimed and outcomes [140.81ms]
@bryance/orch test: 
@bryance/orch test: test\launch-model-gate.test.ts:
@bryance/orch test: (pass) the model gate rules by harness membership, not by format > refuses a ladder shorthand and names what the harness does offer [3.29ms]
@bryance/orch test: (pass) the model gate rules by harness membership, not by format > accepts each harness's own vocabulary rather than one shared grammar [2.40ms]
@bryance/orch test: (pass) the model gate rules by harness membership, not by format > cannot check a harness that publishes no catalogue, and does not pretend to [6.09ms]
@bryance/orch test: (pass) short model names expand against the allowed harness catalogue > expands a short name with one listed match [7.93ms]
@bryance/orch test: (pass) short model names expand against the allowed harness catalogue > reports multiple matches as ambiguous in sorted order [5.57ms]
@bryance/orch test: (pass) short model names expand against the allowed harness catalogue > passes through a full listed spec [7.44ms]
@bryance/orch test: (pass) short model names expand against the allowed harness catalogue > does not expand a match excluded by models.allowed [6.29ms]
@bryance/orch test: (pass) the settings allowlist applies on top of harness membership > an empty allowlist restricts nothing beyond the harness list [5.03ms]
@bryance/orch test: (pass) the settings allowlist applies on top of harness membership > a configured allowlist refuses a listed model outside its patterns [4.53ms]
@bryance/orch test: (pass) the settings allowlist applies on top of harness membership > a spec no harness lists is refused by the harness, not the allowlist [8.40ms]
@bryance/orch test: (pass) the settings allowlist applies on top of harness membership > the configured default is admitted though the allowlist omits it [20.80ms]
@bryance/orch test: (pass) admission expands a short name through the same gate > expands a short name and keeps its thinking suffix [4.59ms]
@bryance/orch test: (pass) admission expands a short name through the same gate > refuses an ambiguous short name by naming every candidate [5.18ms]
@bryance/orch test: (pass) admission expands a short name through the same gate > a short name whose only matches the allowlist excludes is an allowlist refusal [21.46ms]
@bryance/orch test: (pass) admission expands a short name through the same gate > the allowlist narrows an otherwise ambiguous short name to one match [7.59ms]
@bryance/orch test: 
@bryance/orch test: test\outbox-ack.test.ts:
@bryance/orch test: (pass) socket outbox acknowledgements > an ack settles an awaiting row and later delivery skips it [151.71ms]
@bryance/orch test: 
@bryance/orch test: test\skill-store-and-links.test.ts:
@bryance/orch test: (pass) skill store and harness links > replaces a real directory left in a harness dir with a link into the store [24.01ms]
@bryance/orch test: (pass) skill store and harness links > doctor reports a harness dir holding a real directory instead of a link [33.83ms]
@bryance/orch test: (pass) skill store and harness links > doctor reports a stale store and its fix reinstalls the packaged skill [48.65ms]
@bryance/orch test: (pass) skill store and harness links > doctor passes once every harness dir links into the store [38.20ms]
@bryance/orch test: (pass) skill store and harness links > doctor skips when the user turned the skill install off [20.91ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-client.test.ts:
@bryance/orch test: (pass) bridge daemon client > attaches, receives deliveries, acks on the link, and reconnects [1102.46ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-stale-presence.test.ts:
@bryance/orch test: (pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [210.77ms]
@bryance/orch test: (pass) doctor stale presence safety > no dead agents leaves nothing to remove [245.35ms]
@bryance/orch test: (pass) doctor stale presence safety > flags malformed presence directory names [243.11ms]
@bryance/orch test: 
@bryance/orch test: test\rename-syncs-the-pane-border.test.ts:
@bryance/orch test: (pass) orch rename syncs the pane border in one command (U5) > one rename sets orch's name AND the plexer chrome [3868.71ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-client.test.ts:
@bryance/orch test: (pass) bridge daemon client > a refused attach is re-sent on the same link until orchd accepts it [47.86ms]
@bryance/orch test: (pass) bridge daemon client > dead endpoints resolve undefined without invoking handlers [2.84ms]
@bryance/orch test: 
@bryance/orch test: test\caller-kind.test.ts:
@bryance/orch test: (pass) caller kind > a harness marker is a session even when its token differs [145.86ms]
@bryance/orch test: (pass) caller kind > a harness marker is a session without a launch credential [150.76ms]
@bryance/orch test: (pass) caller kind > no harness marker is the operator [1.50ms]
@bryance/orch test: 
@bryance/orch test: test\store-runs.test.ts:
@bryance/orch test: (pass) run rows > round-trips every field, including a structured result [123.80ms]
@bryance/orch test: 
@bryance/orch test: test\transfer-does-not-disturb.test.ts:
@bryance/orch test: (pass) a transfer touches the lease and nothing else > the agent's process is not restarted or re-attached [155.97ms]
@bryance/orch test: (pass) a transfer touches the lease and nothing else > no control write is delivered to the agent [135.05ms]
@bryance/orch test: (pass) a transfer touches the lease and nothing else > adoption of an unheld agent disturbs it no more than a handoff does [126.95ms]
@bryance/orch test: (pass) a transfer touches the lease and nothing else > the holding that ended is kept as history, not erased by the transfer [141.47ms]
@bryance/orch test: 
@bryance/orch test: test\cross-pack-result-delivery.test.ts:
@bryance/orch test: (pass) results go to the enqueuer as mail > a failed task reports its error in the mail body [137.96ms]
@bryance/orch test: (pass) results go to the enqueuer as mail > a cross-wall enqueuer gets no row and the task stays settled [143.94ms]
@bryance/orch test: (pass) acceptMail > refuses a message across the space wall by its reason [141.62ms]
@bryance/orch test: (pass) acceptMail > requires non-empty from, target, and text [118.95ms]
@bryance/orch test: (pass) acceptMail > queues a mail payload naming its sender, routed by direction when it is delivered [147.08ms]
@bryance/orch test: 
@bryance/orch test: test\close-always.test.ts:
@bryance/orch test: {"closed":["panename01","panekey001","paneid0001"],"results":[{"target":"panename01","handle":"pane-name","outcome":"done","error":null},{"target":"panekey001","handle":"pane-key","outcome":"done","error":null},{"target":"paneid0001","handle":"pane-id","outcome":"done","error":null}],"requested":3,"ok":3,"stream":false}
@bryance/orch test: (pass) close always works > closes a foreign-space target by name, key, or pane id [4036.23ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-command-gate.test.ts:
@bryance/orch test: (pass) bridge command gate > a locked bash command is rewritten through orch lock before it runs [21.90ms]
@bryance/orch test: 
@bryance/orch test: test\rename-syncs-the-pane-border.test.ts:
@bryance/orch test: (pass) orch rename syncs the pane border in one command (U5) > the response states the two outcomes SEPARATELY [166.10ms]
@bryance/orch test: 
@bryance/orch test: test\holder-death-costs-a-driver.test.ts:
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > the lease closes `expired` ΓÇö not `released`, because no caller held it [132.39ms]
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > the agent stays alive, unleased and adoptable ΓÇö nothing closes it [151.29ms]
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > it receives no new work: the death hands the agent to nobody [151.90ms]
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > expiry is recorded once and does not erase who held it [113.70ms]
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > clearing a dead holder's lease is never refused, and is idempotent [130.25ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-command-gate.test.ts:
@bryance/orch test: (pass) bridge command gate > a locked command's timeout grows by the lock wait; no timeout stays none [8.74ms]
@bryance/orch test: (pass) bridge command gate > an unlocked command and a non-bash tool are left alone [8.99ms]
@bryance/orch test: 
@bryance/orch test: test\host.test.ts:
@bryance/orch test: (pass) host > maps supported platforms [0.05ms]
@bryance/orch test: (pass) host > rejects unsupported platforms [0.06ms]
@bryance/orch test: (pass) host > guards host operating systems [0.24ms]
@bryance/orch test: (pass) host > detects WSL from distro name or kernel release [0.10ms]
@bryance/orch test: (pass) host > detects the current host [0.24ms]
@bryance/orch test: 
@bryance/orch test: test\space-policy.test.ts:
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > placing an agent in a space nobody created is refused, not minted [150.44ms]
@bryance/orch test: 
@bryance/orch test: test\identity-is-not-environment.test.ts:
@bryance/orch test: (pass) A1 ΓÇö identity carries no environment > Identity declares no plexer and no plexer grouping [0.07ms]
@bryance/orch test: (pass) A1 ΓÇö identity carries no environment > a key is the minted id itself, with no separator to split [0.14ms]
@bryance/orch test: (pass) A1 ΓÇö identity carries no environment > the module never spells the sentinels that stand in for a missing place [1.34ms]
@bryance/orch test: (pass) A1 ΓÇö identity carries no environment > minted ids are unique per spawn [5.04ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-unscoped-tasks.test.ts:
@bryance/orch test: (pass) doctor task scopes > a facade-enqueued task has exactly one typed scope [161.05ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-channel.test.ts:
@bryance/orch test: (pass) orch bridge links and capture roles > live session delivery settles mail without a bridge or pane route [135.30ms]
@bryance/orch test: (pass) orch bridge links and capture roles > a spawned agent whose bridge is detached stays queued for that bridge [101.58ms]
@bryance/orch test: (pass) orch bridge links and capture roles > worker mail to its spawner under mail.to_spawner prompt waits for the spawner's bridge [119.97ms]
@bryance/orch test: (pass) orch bridge links and capture roles > worker mail to its spawner under mail.to_spawner events settles on the spawner's stream [177.12ms]
@bryance/orch test: (pass) orch bridge links and capture roles > worker mail to a spawner whose pane the human is in settles on the stream under prompt-unless-focused [132.06ms]
@bryance/orch test: (pass) orch bridge links and capture roles > worker mail to a spawner whose pane the human is in still waits for the bridge under prompt [158.08ms]
@bryance/orch test: (pass) orch bridge links and capture roles > worker mail to a spawner whose pane is unfocused waits for the bridge under prompt-unless-focused [165.15ms]
@bryance/orch test: (pass) orch bridge links and capture roles > spawner mail to its worker follows mail.to_worker, not mail.to_spawner [129.77ms]
@bryance/orch test: (pass) orch bridge links and capture roles > spawner mail to its worker under mail.to_worker events settles on the worker's stream [153.55ms]
@bryance/orch test: (pass) orch bridge links and capture roles > events mail to a dead recipient is undeliverable [137.60ms]
@bryance/orch test: (pass) orch bridge links and capture roles > dead session without a bridge or pane route is undeliverable [135.72ms]
@bryance/orch test: (pass) orch bridge links and capture roles > capture reads status and result from the store [138.86ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-errors.test.ts:
@bryance/orch test: (pass) port seam error contract > provider mutation errors preserve argv, exit status, stderr, and stdout [0.53ms]
@bryance/orch test: (pass) port seam error contract > provider query errors throw instead of returning a sentinel [0.29ms]
@bryance/orch test: 
@bryance/orch test: test\rename-syncs-the-pane-border.test.ts:
@bryance/orch test: (pass) orch rename syncs the pane border in one command (U5) > a plexer that refuses the chrome never unwrites orch's own name [180.64ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-capacity-hold.test.ts:
@bryance/orch test: (pass) orchd holds the fleet capacity > serves the held value until a view changes, then recomputes [161.17ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-herdr-headless.test.ts:
@bryance/orch test: (pass) backend registry selection is backend-independent > herdr, headless, tmux, and orca are all registered [0.57ms]
@bryance/orch test: 
@bryance/orch test: test\status-unleased.test.ts:
@bryance/orch test: (pass) status owner rendering > leased by a live holder shows that holder [3712.78ms]
@bryance/orch test: 
@bryance/orch test: test\commands-resolve.test.ts:
@bryance/orch test: (pass) commands/resolve > resolves one target with its view and ownership [3722.47ms]
@bryance/orch test: 
@bryance/orch test: test\unleased-agents.test.ts:
@bryance/orch test: (pass) registration unleased agent hint > includes unleased workers but never session identities [167.92ms]
@bryance/orch test: 
@bryance/orch test: test\rename-syncs-the-pane-border.test.ts:
@bryance/orch test: (pass) orch rename syncs the pane border in one command (U5) > --pane still gives the border something DIFFERENT, and leaves the name alone [194.43ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-capacity-hold.test.ts:
@bryance/orch test: (pass) orchd holds the fleet capacity > forgetCapacity drops the held value [114.60ms]
@bryance/orch test: 
@bryance/orch test: test\presence-dirs-are-reaped-not-migrated.test.ts:
@bryance/orch test: (pass) a presence dir in the old shape is reaped, never migrated (J4) > a composite-named dir is not presence, whatever its file claims [162.48ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-unscoped-tasks.test.ts:
@bryance/orch test: (pass) doctor task scopes > the database rejects an unscoped task instead of keeping a legacy queue row [149.72ms]
@bryance/orch test: (pass) doctor task scopes > doctor lists unrunnable tasks and deliberate resolutions without deleting [148.33ms]
@bryance/orch test: 
@bryance/orch test: test\commands-resolve.test.ts:
@bryance/orch test: (pass) commands/resolve > resolves lifecycle target with backend and handle [189.80ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-link-server.test.ts:
@bryance/orch test: (pass) daemon bridge links > attaches, replies, notifies after the reply write, and pushes deliveries [257.22ms]
@bryance/orch test: 
@bryance/orch test: test\outbox-ack.test.ts:
@bryance/orch test: (pass) socket outbox acknowledgements > a detached bridge retries a pending row and logs the reason [152.55ms]
@bryance/orch test: (pass) socket outbox acknowledgements > a gone agent settles its row as undeliverable on the first attempt [130.04ms]
@bryance/orch test: (pass) socket outbox acknowledgements > failed delivery at the cap settles, while one attempt earlier retries [178.09ms]
@bryance/orch test: (pass) socket outbox acknowledgements > redelivery covers every open row for one target, regardless of nextAttemptAt [146.83ms]
@bryance/orch test: (pass) socket outbox acknowledgements > open-row selection excludes settled rows [135.04ms]
@bryance/orch test: (pass) socket outbox acknowledgements > malformed stored payloads are rejected [124.01ms]
@bryance/orch test: 
@bryance/orch test: test\doctor.test.ts:
@bryance/orch test: (pass) runDoctor > detects DrvFs paths by mount path segment [0.19ms]
@bryance/orch test: 
@bryance/orch test: test\queue.test.ts:
@bryance/orch test: (pass) queue facade on tasks and attempts > enqueue selects exactly one typed scope and defaults to the enqueuer pack [141.79ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > agent scope requires the enqueuer to lease the target [121.83ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq1: the gate is on enqueuing into a scope, and adoption earns it [113.19ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq1: a pack drains its queue with its orch dead and no lease in force [117.63ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > claiming excludes another pack and space claims require open intake [144.23ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq3: a space-scoped task is an offer, and only an opted-in pack consumes it [150.03ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > a failed pack attempt retries on another member, never outside the pack [190.94ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq5: an agent-scoped binding is to the agent and survives adoption [151.01ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq13: adoption carries the queue ΓÇö pack work comes with the agents [133.09ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > a claim is an insert and a lost race returns false [131.97ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > cancel rights are enqueuer, targeted agent's leasing orch, or human [170.21ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq7: origin_workspace is gone from the tasks table, scope replaces it [135.19ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > state and attempt-derived values have no legacy flattened fields [132.29ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-credential.test.ts:
@bryance/orch test: (skip) the token file is the whole credential > the token is 0600
@bryance/orch test: (skip) the token file is the whole credential > $ORCH_DIR is 0700, so same-uid is a boundary the filesystem enforces
@bryance/orch test: (skip) the token file is the whole credential > a token left loose by an earlier run is tightened, not trusted
@bryance/orch test: (skip) the token file is the whole credential > a runtime directory the daemon creates is 0700 too
@bryance/orch test: 
@bryance/orch test: test\status-unleased.test.ts:
@bryance/orch test: (pass) status owner rendering > a dead holder is shown as unleased with the holder gone [183.48ms]
@bryance/orch test: (pass) status owner rendering > an agent never leased shows no orch driving it [189.25ms]
@bryance/orch test: 
@bryance/orch test: test\commands-resolve.test.ts:
@bryance/orch test: (pass) commands/resolve > rejects an unknown target [151.44ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-link-server.test.ts:
@bryance/orch test: (pass) daemon bridge links > a socket close detaches its bridge [159.55ms]
@bryance/orch test: 
@bryance/orch test: test\store-runs.test.ts:
@bryance/orch test: (pass) run rows > upsert updates a row while preserving its original start time [146.00ms]
@bryance/orch test: (pass) run rows > orders by started time, filters by agent, and honours limit [135.51ms]
@bryance/orch test: (pass) run rows > omits absent optional fields instead of returning null [146.83ms]
@bryance/orch test: (pass) run rows > deletes only rows older than the cutoff and returns the count [190.23ms]
@bryance/orch test: (pass) run rows > stays readable after the agent presence directory is deleted [165.74ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-credential.test.ts:
@bryance/orch test: (pass) the token file is the whole credential > nothing else is enrolled: there is no allowlist beside the token [63.35ms]
@bryance/orch test: 
@bryance/orch test: test\presence-dirs-are-reaped-not-migrated.test.ts:
@bryance/orch test: (pass) a presence dir in the old shape is reaped, never migrated (J4) > the sweep REMOVES it rather than leaving it for a migration that never comes [136.97ms]
@bryance/orch test: (pass) a presence dir in the old shape is reaped, never migrated (J4) > nothing renames, rewrites or re-keys the old directory [102.35ms]
@bryance/orch test: (pass) a presence dir in the old shape is reaped, never migrated (J4) > a dead dir in the CURRENT shape is still reaped the ordinary way [106.40ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-link-server.test.ts:
@bryance/orch test: (pass) daemon bridge links > a second socket replaces the first link [96.12ms]
@bryance/orch test: 
@bryance/orch test: test\presence-history-queue.test.ts:
@bryance/orch test: (pass) presence history queue > appendStatusHistory writes only when flushed [24.99ms]
@bryance/orch test: (pass) presence history queue > preserves call order for multiple appends [3.77ms]
@bryance/orch test: (pass) presence history queue > writes results and outcomes in one flush [8.03ms]
@bryance/orch test: (pass) presence history queue > reports a failed append without throwing [2.40ms]
@bryance/orch test: 
@bryance/orch test: test\process-identity-stamped.test.ts:
@bryance/orch test: (skip) pidStampedWith > returns the stamped shell rather than its child
@bryance/orch test: (skip) pidStampedWith > returns null for an unknown value
@bryance/orch test: 
@bryance/orch test: test\bridge-link-server.test.ts:
@bryance/orch test: (pass) daemon bridge links > attach for an agent the store does not know is refused and the server keeps serving [110.94ms]
@bryance/orch test: (pass) daemon bridge links > attach without a key is rejected [22.63ms]
@bryance/orch test: 
@bryance/orch test: test\unleased-stays-adoptable.test.ts:
@bryance/orch test: (pass) unleased and idle stays alive and adoptable (D3) > a decade of sweeps never ages out an unleased idle agent [378.09ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-link-server.test.ts:
@bryance/orch test: (pass) daemon bridge links > server close detaches every bridge [154.42ms]
@bryance/orch test: 
@bryance/orch test: test\outbox-replay.test.ts:
@bryance/orch test: (pass) outbox restart replay > replays failed messages after restart without duplicates [165.12ms]
@bryance/orch test: 
@bryance/orch test: test\store-agent-rows.test.ts:
@bryance/orch test: (pass) agent store rows > insertAgent writes both NULL; agentById reads both back [212.26ms]
@bryance/orch test: 
@bryance/orch test: test\store-task-rows.test.ts:
@bryance/orch test: (pass) task and attempt rows > malformed task rows are refused instead of handed back as typed data [103.16ms]
@bryance/orch test: 
@bryance/orch test: test\reap-picker.test.ts:
@bryance/orch test: (pass) reapCandidates > classifies unleased dead holders and leased dead processes [1.04ms]
@bryance/orch test: 
@bryance/orch test: test\dispatch-prompt-file.test.ts:
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > --file is parsed off the positionals [2.80ms]
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > the file body is the prompt, apostrophes and newlines intact [14.49ms]
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > without --file the positionals after the target are the prompt [0.10ms]
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > a typed prompt and --file together is a refusal, never a silent winner [1.77ms]
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > an empty file is refused: a dispatch with no prompt is not a dispatch [1.42ms]
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > a missing file names itself in the refusal [0.31ms]
@bryance/orch test: (pass) --with points the agent at context it opens on demand > --with is repeatable and parsed off the positionals [0.16ms]
@bryance/orch test: (pass) --with points the agent at context it opens on demand > a file reference is absolute and typed as a file [2.69ms]
@bryance/orch test: (pass) --with points the agent at context it opens on demand > a directory reference is typed as a directory [1.29ms]
@bryance/orch test: (pass) --with points the agent at context it opens on demand > a missing path dies at dispatch, naming the flag [0.27ms]
@bryance/orch test: (pass) --with points the agent at context it opens on demand > the task tells the agent where to look and to open paths only when needed; content is never inlined [0.12ms]
@bryance/orch test: (pass) --with points the agent at context it opens on demand > no references leaves the instructions untouched [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\outbox.test.ts:
@bryance/orch test: (pass) outbox delivery > selects pending messages and delivers each message once [121.97ms]
@bryance/orch test: 
@bryance/orch test: test\reap-picker.test.ts:
@bryance/orch test: (pass) reapCandidates > classifies empty input [0.33ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-backends.test.ts:
@bryance/orch test: (pass) doctor backend and presence checks > reports every registered backend and composed roles [51.72ms]
@bryance/orch test: (pass) doctor backend and presence checks > passes with herdr active while an enabled tmux sits outside a session [0.05ms]
@bryance/orch test: (pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.04ms]
@bryance/orch test: (pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [0.04ms]
@bryance/orch test: (pass) doctor backend and presence checks > fails when any enabled backend is unavailable, active or not [0.03ms]
@bryance/orch test: (pass) doctor backend and presence checks > honours the configured default over the probe order [0.02ms]
@bryance/orch test: (pass) doctor backend and presence checks > reports only records missing the current schema stamp [4.76ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-links.test.ts:
@bryance/orch test: (pass) bridge links > attach holds the link under the canonical key and push reaches it [196.87ms]
@bryance/orch test: 
@bryance/orch test: test\unleased-stays-adoptable.test.ts:
@bryance/orch test: (pass) unleased and idle stays alive and adoptable (D3) > and it is still adoptable afterwards ΓÇö the point of keeping it [168.13ms]
@bryance/orch test: (pass) unleased and idle stays alive and adoptable (D3) > the reap takes only agents whose process is GONE, never merely unleased ones [114.16ms]
@bryance/orch test: (pass) unleased and idle stays alive and adoptable (D3) > repeated sweeps are stable: an unleased agent survives every one of them [167.03ms]
@bryance/orch test: 
@bryance/orch test: test\outbox.test.ts:
@bryance/orch test: (pass) outbox delivery > checks one message's pending state without scanning the outbox [155.21ms]
@bryance/orch test: (pass) outbox delivery > keeps failed messages pending until their backoff expires [126.19ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-checks.test.ts:
@bryance/orch test: (pass) doctor provenance-depth checks > finds a live agent deeper than fleet.max_depth [138.84ms]
@bryance/orch test: 
@bryance/orch test: test\vocabulary.test.ts:
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > a role is derived from the tree, never stored [187.29ms]
@bryance/orch test: 
@bryance/orch test: test\space-policy.test.ts:
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > two unspaced agents in the SAME repo root can reach each other [180.07ms]
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > two unspaced agents in DIFFERENT repo roots cannot [147.73ms]
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > an agent placed in no space reports none, even inside a plexer workspace [167.40ms]
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > recording a spawn never conjures the space it names [109.53ms]
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > a space still walls, and it outranks the repo root [151.22ms]
@bryance/orch test: (pass) space policy > reads the space from the environment satellite, and absence is null [64.11ms]
@bryance/orch test: (pass) space policy > resolves space names through records and functions [0.24ms]
@bryance/orch test: (pass) space policy > compares agents by the space each is composed into [120.80ms]
@bryance/orch test: (pass) space policy > enforces the space wall across every plexer alike [162.71ms]
@bryance/orch test: (pass) space policy > scopes agents to the current space [158.38ms]
@bryance/orch test: (pass) space policy > a null current space leaves items unscoped [132.96ms]
@bryance/orch test: (pass) space policy > 2.7 status displays the composed space, not text sliced from a key [171.33ms]
@bryance/orch test: (pass) space policy > 6.6 structured identity drives status and policy, not serialized key text [133.70ms]
@bryance/orch test: 
@bryance/orch test: test\session-env.test.ts:
@bryance/orch test: (pass) shim environment > allows the launch environment variable [0.40ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-links.test.ts:
@bryance/orch test: (pass) bridge links > a second attach for the same key replaces the first [149.97ms]
@bryance/orch test: (pass) bridge links > detach removes only the link still held [155.94ms]
@bryance/orch test: (pass) bridge links > push with no link throws BridgeDetachedError [128.13ms]
@bryance/orch test: (pass) bridge links > an unknown target is refused before the registry is consulted [83.80ms]
@bryance/orch test: (pass) bridge message guards > accept every action shape [1.11ms]
@bryance/orch test: (pass) bridge message guards > refuse a missing field, an unknown action, and a non-record [0.98ms]
@bryance/orch test: (pass) bridge message guards > a delivery is an id plus a message [0.74ms]
@bryance/orch test: 
@bryance/orch test: test\vocabulary.test.ts:
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > no table carries a role column: there is nothing to disagree with the tree [107.87ms]
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > renaming an agent or moving its lease never changes its role [150.90ms]
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > every role term orch displays comes from the one map [0.09ms]
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > no module outside the map spells a role term into a user-facing string [60.67ms]
@bryance/orch test: 
@bryance/orch test: test\wake.test.ts:
@bryance/orch test: (pass) wake signal > next resolves on wake [0.40ms]
@bryance/orch test: (pass) wake signal > next resolves after the timeout with no wake [10.84ms]
@bryance/orch test: (pass) wake signal > two concurrent next calls both resolve on one wake [0.23ms]
@bryance/orch test: 
@bryance/orch test: test\command-lock.test.ts:
@bryance/orch test: (pass) command-lock > a free pattern runs and holds the lock until unlock [239.16ms]
@bryance/orch test: 
@bryance/orch test: test\wall-single-owner.test.ts:
@bryance/orch test: (pass) space wall ownership > keeps the wall decision primitive in one source module [29.27ms]
@bryance/orch test: 
@bryance/orch test: test\session-refresh-repoints-identity.test.ts:
@bryance/orch test: (pass) session refresh identity continuity > same process with a new token repoints the existing agent and preserves its lease [173.99ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: (pass) fleet ownership scoping > fleet visibility follows provenance depth, not caller environment [195.74ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-reasserts-pin.test.ts:
@bryance/orch test: (pass) bridge reasserts orch model pins > reasserts after session_start and reports the applied pin [22.04ms]
@bryance/orch test: (pass) bridge reasserts orch model pins > reasserts one time for a foreign level and ignores apply events [5.32ms]
@bryance/orch test: (pass) bridge reasserts orch model pins > a harness clamp does not create a reassert loop [3.86ms]
@bryance/orch test: 
@bryance/orch test: test\doctor.test.ts:
@bryance/orch test: (pass) runDoctor > runs on an unconfigured install without failing for want of settings.json [418.41ms]
@bryance/orch test: (pass) runDoctor > checks a healthy store [169.28ms]
@bryance/orch test: (pass) runDoctor > warns when the store is absent [0.97ms]
@bryance/orch test: (pass) runDoctor > fails when the store predates orch's migrations [157.66ms]
@bryance/orch test: (pass) runDoctor > fails and names a missing store table [169.56ms]
@bryance/orch test: (pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [196.52ms]
@bryance/orch test: (pass) runDoctor > reports an absent daemon as optional [166.95ms]
@bryance/orch test: (pass) runDoctor > reports and fixes a stale daemon lock [287.99ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-checks.test.ts:
@bryance/orch test: (pass) doctor provenance-depth checks > accepts a live agent at fleet.max_depth [118.66ms]
@bryance/orch test: (pass) doctor unclaimed-agent checks > finds an old unclaimed live agent with its age [118.95ms]
@bryance/orch test: (pass) doctor unclaimed-agent checks > ignores a claimed agent [129.80ms]
@bryance/orch test: (pass) doctor unclaimed-agent checks > ignores a fresh unclaimed agent under the threshold [145.22ms]
@bryance/orch test: (pass) doctor notification-sink checks > reports no sinks as healthy [2.41ms]
@bryance/orch test: (pass) doctor notification-sink checks > rejects a webhook with a malformed URL [17.51ms]
@bryance/orch test: (pass) doctor notification-sink checks > uses the notify-send prerequisite install command in desktop remediation [5.53ms]
@bryance/orch test: (pass) doctor notification-sink checks > warns for a command binary missing from PATH [6.15ms]
@bryance/orch test: (pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [17.41ms]
@bryance/orch test: (pass) doctor notification-sink checks > warns when a notifier omits done from its on list [4.34ms]
@bryance/orch test: (pass) doctor notification-sink checks > does not warn when a notifier includes done in its on list [4.42ms]
@bryance/orch test: (pass) doctor notification-sink checks > keeps unavailable notifier failures when done is omitted [11.55ms]
@bryance/orch test: 
@bryance/orch test: test\work-loop-binding.test.ts:
@bryance/orch test: (pass) work loop attempt binding > statusSpeaksForTask verifies the current attempt dispatch id [0.39ms]
@bryance/orch test: 
@bryance/orch test: test\store-task-rows.test.ts:
@bryance/orch test: (pass) task and attempt rows > malformed attempt rows are refused instead of handing back NaN [149.97ms]
@bryance/orch test: (pass) task and attempt rows > enqueue accepts exactly one typed scope and round-trips JSON opts [149.87ms]
@bryance/orch test: (pass) task and attempt rows > queued tasks can be edited only by their enqueuer [144.94ms]
@bryance/orch test: (pass) task and attempt rows > two concurrent claims have one winner and one index violation [156.96ms]
@bryance/orch test: (pass) task and attempt rows > failed attempts remain in history and retries are new attempts [111.30ms]
@bryance/orch test: (pass) task and attempt rows > settlement stores exact integer instants and outcome payloads [141.96ms]
@bryance/orch test: (pass) task and attempt rows > task state precedence covers queued, claimed, failed, done and cancelled [130.68ms]
@bryance/orch test: (pass) task and attempt rows > intakes are half-open history and duplicate open intake is rejected [171.06ms]
@bryance/orch test: 
@bryance/orch test: test\store-values.test.ts:
@bryance/orch test: (pass) store row values > uses null for optional database values without JSON text [0.09ms]
@bryance/orch test: (pass) store row values > sets only non-null fields [0.06ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-terminal.test.ts:
@bryance/orch test: (pass) bridge terminal turn seam > empty and tool-only turn_end turns still publish a terminal idle state [147.72ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-claude-hooks.test.ts:
@bryance/orch test: (pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [128.62ms]
@bryance/orch test: 
@bryance/orch test: test\session-refresh-repoints-identity.test.ts:
@bryance/orch test: (pass) session refresh identity continuity > same token with a new process keeps the agent and repoints its process interval [135.54ms]
@bryance/orch test: (pass) session refresh identity continuity > a new token and a new process mint a new agent [137.02ms]
@bryance/orch test: (pass) session refresh identity continuity > a process anchored by an ended agent mints instead of repointing [116.99ms]
@bryance/orch test: 
@bryance/orch test: test\doctor.test.ts:
@bryance/orch test: (pass) runDoctor > accepts a live daemon and an answerable socket [461.86ms]
@bryance/orch test: 
@bryance/orch test: test\work-loop-binding.test.ts:
@bryance/orch test: (pass) Cq4: results go to the enqueuer, not the runner > continuous work passes record tick timing [227.96ms]
@bryance/orch test: (pass) Cq4: results go to the enqueuer, not the runner > every task event the work loop publishes is keyed to whoever enqueued it [128.73ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-terminal.test.ts:
@bryance/orch test: (pass) bridge terminal turn seam > a settled turn with assistant text publishes done [126.26ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lease.test.ts:
@bryance/orch test: (pass) lease commands > a LIVE foreign holder still excludes everyone else [3558.67ms]
@bryance/orch test: (pass) lease commands > adopt takes an unleased agent and a dead holder [115.84ms]
@bryance/orch test: (pass) lease commands > adopt refuses a holder with a live recorded process [160.20ms]
@bryance/orch test: (pass) lease commands > reap refuses when a live descendant exists, regardless of lease [172.86ms]
@bryance/orch test: (pass) lease commands > reap refuses while the recorded process is alive [141.08ms]
@bryance/orch test: (pass) lease commands > reap is never lease-gated and removes the record and presence [157.19ms]
@bryance/orch test: 
@bryance/orch test: test\store-write-queue.test.ts:
@bryance/orch test: (pass) store write queue > reads a queued run in the same tick [104.28ms]
@bryance/orch test: 
@bryance/orch test: test\session-sees-only-held-agents.test.ts:
@bryance/orch test: (pass) session agent visibility > shows only agents held by the current session, not its provenance children [0.62ms]
@bryance/orch test: 
@bryance/orch test: test\broker-daemon-hardening.test.ts:
@bryance/orch test: (pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [32.31ms]
@bryance/orch test: 
@bryance/orch test: test\work-loop-identity.test.ts:
@bryance/orch test: (pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > a claim records the minted agent id, not the presence key [147.64ms]
@bryance/orch test: 
@bryance/orch test: test\session-sees-only-held-agents.test.ts:
@bryance/orch test: (pass) session agent visibility > an operator sees every agent in every space [0.17ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc-identity.test.ts:
@bryance/orch test: (pass) daemon identity RPCs > claim-identity refuses an unknown id by naming it [3432.91ms]
@bryance/orch test: 
@bryance/orch test: test\store-write-queue.test.ts:
@bryance/orch test: (pass) store write queue > closeAllStores drains queued writes [123.57ms]
@bryance/orch test: (pass) store write queue > reports one record per queue drain [142.75ms]
@bryance/orch test: (pass) store write queue > writes queued in a transaction are visible in its body [118.97ms]
@bryance/orch test: 
@bryance/orch test: test\store-agent-rows.test.ts:
@bryance/orch test: (pass) agent store rows > insertAgent materializes the provenance root [167.99ms]
@bryance/orch test: (pass) agent store rows > endAgent records who closed it, nullable for death [181.01ms]
@bryance/orch test: (pass) agent store rows > liveAgents excludes agents with an ending [214.73ms]
@bryance/orch test: (pass) agent store rows > packMembers selects the materialized root [148.46ms]
@bryance/orch test: (pass) agent store rows > unknown harness is rejected by the foreign key [143.78ms]
@bryance/orch test: (pass) agent store rows > unknown spawnedBy is rejected by the foreign key [120.97ms]
@bryance/orch test: (pass) agent store rows > label maps both null and a value [198.98ms]
@bryance/orch test: (pass) agent store rows > created_at is an INTEGER epoch millisecond [166.24ms]
@bryance/orch test: (pass) agent store rows > worktreeOf distinguishes repo agents from worktree agents [158.86ms]
@bryance/orch test: (pass) agent store rows > renameAgent is id-keyed and leaves identity history unchanged [175.14ms]
@bryance/orch test: (pass) agent store rows > lookup ensure operations are insert-or-ignore [172.92ms]
@bryance/orch test: (pass) agent store rows > childrenOf returns direct descendants [165.24ms]
@bryance/orch test: 
@bryance/orch test: test\broker-daemon-hardening.test.ts:
@bryance/orch test: (pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [140.39ms]
@bryance/orch test: (pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [107.78ms]
@bryance/orch test: 
@bryance/orch test: test\work-loop-identity.test.ts:
@bryance/orch test: (pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > an idle process with no registered agent row is never handed pack work [147.93ms]
@bryance/orch test: (pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > Cq1: the pack drains its own queue with its orch dead and no lease in force [130.37ms]
@bryance/orch test: 
@bryance/orch test: test\reset-build-safety.test.ts:
@bryance/orch test: (pass) build reset safety > --build dry-run never names a path inside ORCH_DIR [2868.85ms]
@bryance/orch test: 
@bryance/orch test: test\thinking-resolution.test.ts:
@bryance/orch test: (pass) thinking resolution > resolves every rung in priority order [25.85ms]
@bryance/orch test: 
@bryance/orch test: test\peer-identity.test.ts:
@bryance/orch test: (pass) spawner identity > a bare operator with no session markers is just the operator [3548.75ms]
@bryance/orch test: 
@bryance/orch test: test\thinking-resolution.test.ts:
@bryance/orch test: (pass) thinking resolution > bare model with no setting yields harness default [31.00ms]
@bryance/orch test: (pass) thinking resolution > pi translates the resolved level through its thinking role [0.34ms]
@bryance/orch test: (pass) thinking resolution > per-harness override beats global default [12.90ms]
@bryance/orch test: 
@bryance/orch test: test\broker-daemon-hardening.test.ts:
@bryance/orch test: (pass) broker daemon hardening > concurrent drains do not redeliver one message id [159.75ms]
@bryance/orch test: (pass) broker daemon hardening > replay after the newest sequence is empty without a gap [117.81ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-claude-hooks.test.ts:
@bryance/orch test: (pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [128.32ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [177.22ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [110.91ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [106.69ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [72.51ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [95.36ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [56.13ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [121.83ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > treats an absent settings file as not configured [1.25ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > handles malformed settings gracefully [3.04ms]
@bryance/orch test: 
@bryance/orch test: test\tiling.test.ts:
@bryance/orch test: (pass) planTilePlacement > a lone pane anchors the split to the only pane [0.15ms]
@bryance/orch test: 
@bryance/orch test: test\lease-authority.test.ts:
@bryance/orch test: (pass) C3 foreign agents are untouchable > every driving verb is refused while a live foreign orch holds the lease [3449.42ms]
@bryance/orch test: 
@bryance/orch test: test\tiling.test.ts:
@bryance/orch test: (pass) planTilePlacement > first_split rules the opening split, however the screen is shaped [0.08ms]
@bryance/orch test: (pass) planTilePlacement > first_split longest-edge leaves the opening split to the tab's own shape [0.05ms]
@bryance/orch test: (pass) planTilePlacement > a tab with no geometry to read still opens the way first_split says [0.03ms]
@bryance/orch test: (pass) planTilePlacement > past the first split, the biggest pane halves its longer side whatever first_split says [0.19ms]
@bryance/orch test: (pass) planTilePlacement > the biggest pane is the target, whatever the caller's own pane is [0.06ms]
@bryance/orch test: (pass) planTilePlacement > equal panes resolve top-left first, so enumeration order cannot decide [0.06ms]
@bryance/orch test: (pass) planTilePlacement > four agents land in a 2x2 grid, not four columns [0.61ms]
@bryance/orch test: (pass) planTilePlacement > four agents on an ultrawide screen still land in a 2x2 grid [0.09ms]
@bryance/orch test: (pass) planTilePlacement > first_split rows stacks the second agent, columns seats it alongside [0.07ms]
@bryance/orch test: (pass) planTilePlacement > longest-edge on an ultrawide screen is the four-thin-columns layout first_split exists to avoid [0.06ms]
@bryance/orch test: (pass) planTilePlacement > the same pane count yields the same grid whatever pane order the plexer reports [4.93ms]
@bryance/orch test: 
@bryance/orch test: test\tool-exec-retry.test.ts:
@bryance/orch test: (pass) every command into a harness or plexer retries on timing, not on being wrong > observes each attempt at its end [1.66ms]
@bryance/orch test: 
@bryance/orch test: test\caller-kind.test.ts:
@bryance/orch test: (pass) caller kind > an unregistered session asks the daemon registration seam [3632.58ms]
@bryance/orch test: 
@bryance/orch test: test\store-catalogue.test.ts:
@bryance/orch test: (pass) catalogue rows > empty store reads an empty Map [162.27ms]
@bryance/orch test: 
@bryance/orch test: test\tool-exec-retry.test.ts:
@bryance/orch test: (pass) every command into a harness or plexer retries on timing, not on being wrong > a transient refusal is reattempted until it succeeds [8.49ms]
@bryance/orch test: (pass) every command into a harness or plexer retries on timing, not on being wrong > a failure the caller calls permanent is thrown on the FIRST attempt, never retried [0.25ms]
@bryance/orch test: (pass) every command into a harness or plexer retries on timing, not on being wrong > a tool that never recovers exhausts the budget and reports how many attempts it cost [30.94ms]
@bryance/orch test: (pass) every command into a harness or plexer retries on timing, not on being wrong > the seam names no harness: the same policy drives a different binary [1.19ms]
@bryance/orch test: 
@bryance/orch test: test\close-always.test.ts:
@bryance/orch test: Could not close survives01: pane-survives is still listed by headless after the close
@bryance/orch test: {"closed":[],"results":[{"target":"survives01","handle":"pane-survives","outcome":"error","error":"pane-survives is still listed by headless after the close"}],"requested":1,"ok":0,"stream":false}
@bryance/orch test: (pass) close always works > a successful backend close retains a pane that is still listed [3554.88ms]
@bryance/orch test: 
@bryance/orch test: test\transcript.test.ts:
@bryance/orch test: (pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [0.59ms]
@bryance/orch test: (pass) lastAssistantFromJsonl > undefined for blank or empty input [0.03ms]
@bryance/orch test: (pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.07ms]
@bryance/orch test: (pass) assistantText > reads role-tagged records [0.02ms]
@bryance/orch test: (pass) assistantText > reads the {type:'assistant'} envelope with a nested message [0.02ms]
@bryance/orch test: (pass) assistantText > undefined for non-assistant roles [0.02ms]
@bryance/orch test: (pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.02ms]
@bryance/orch test: (pass) contentText empty-string part handling > an all-empty content array yields undefined [0.02ms]
@bryance/orch test: (pass) contentText empty-string part handling > a bare empty string yields undefined [0.01ms]
@bryance/orch test: 
@bryance/orch test: test\command-lock.test.ts:
@bryance/orch test: (pass) command-lock > a second process waits while a live process holds the pattern [179.20ms]
@bryance/orch test: (pass) command-lock > a lock whose holder is gone is replaced [107.40ms]
@bryance/orch test: (pass) command-lock > a pattern an ancestor holds never waits [126.34ms]
@bryance/orch test: (pass) command-lock > a gated command is refused until a human approves it, and the approval is spent once [151.67ms]
@bryance/orch test: (pass) command-lock > a denied command is refused for a worker, with no grant, only as the whole command [101.10ms]
@bryance/orch test: (pass) command-lock > denied_commands.applies_to picks who is refused; the human never is [159.11ms]
@bryance/orch test: (pass) command-lock > locked_commands.applies_to picks who waits; the human's own orch lock always does [160.82ms]
@bryance/orch test: (pass) command-lock > a waiting agent is marked waiting once, with the holder named [120.16ms]
@bryance/orch test: (pass) command-lock > a harness report of working keeps waiting; any other state replaces it [92.93ms]
@bryance/orch test: (pass) command-lock > the agent goes back to working when it gets the lock [121.81ms]
@bryance/orch test: (pass) command-lock > a wait past timeouts.lock_wait_ms gives up, runs nothing, and says so [149.58ms]
@bryance/orch test: 
@bryance/orch test: test\retention.test.ts:
@bryance/orch test: (pass) retention sweep > retention windows are independently configurable [111.33ms]
@bryance/orch test: 
@bryance/orch test: test\work-notify.test.ts:
@bryance/orch test: (pass) orch presence notifications > delivers a presence transition through a configured command sink [273.43ms]
@bryance/orch test: 
@bryance/orch test: test\command-paths.test.ts:
@bryance/orch test: (pass) settings commands name no fixed directory > an absolute path in a command is a fixed path [0.22ms]
@bryance/orch test: (pass) settings commands name no fixed directory > a relative path or a token is not [0.14ms]
@bryance/orch test: (pass) settings commands name no fixed directory > settings refuse a fixed path in verify, locked and gated commands [8.47ms]
@bryance/orch test: (pass) settings commands name no fixed directory > settings refuse prose and globs in locked and gated commands [1.98ms]
@bryance/orch test: (pass) the agent's own directory fills the tokens > a WSL drive mount becomes its drive, other WSL paths the distro share [0.51ms]
@bryance/orch test: (pass) the agent's own directory fills the tokens > both tokens are replaced [0.11ms]
@bryance/orch test: (pass) the agent's own directory fills the tokens > the worker header carries the agent's own directory, never another project's [0.84ms]
@bryance/orch test: 
@bryance/orch test: test\caller-kind.test.ts:
@bryance/orch test: (pass) caller kind > override flags are allowed only for the operator [2.57ms]
@bryance/orch test: (pass) caller kind > override flags refuse a driving session [122.95ms]
@bryance/orch test: (pass) caller kind > override flags refuse a spawned agent [135.11ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-declared-vs-reality-tuning.test.ts:
@bryance/orch test: (pass) doctor declared tuning versus reality > matching model and effort produces no finding [161.01ms]
@bryance/orch test: 
@bryance/orch test: test\capacity.test.ts:
@bryance/orch test: (pass) fleet capacity > one pack per root, each against the per-pack cap; roots never sum into one pack [0.96ms]
@bryance/orch test: (pass) fleet capacity > a selected root scopes the packs to that one pack [0.20ms]
@bryance/orch test: (pass) fleet capacity > reports configured per-space caps [0.09ms]
@bryance/orch test: (pass) fleet capacity > uses null for an unlimited total [0.11ms]
@bryance/orch test: (pass) fleet capacity > formats one pack per root, the caller's first, then space and machine capacity [0.23ms]
@bryance/orch test: 
@bryance/orch test: test\check-bridge.test.ts:
@bryance/orch test: (pass) presence filenames stay limited to the live protocol > inbox.jsonl is no longer a presence-filename breach [0.73ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-herdr-headless.test.ts:
@bryance/orch test: (pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.22ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.23ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.13ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.16ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.29ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [46.51ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > implicit selection falls back to headless when no plexer answers [10.26ms]
@bryance/orch test: (pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [3511.78ms]
@bryance/orch test: (pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [1.59ms]
@bryance/orch test: (pass) headless common path: identity key -> presence > one adapter uses the same opaque key across headless and tmux routes [0.25ms]
@bryance/orch test: (pass) headless common path: identity key -> presence > a key carries no environment to read back out of it [0.04ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-policy.test.ts:
@bryance/orch test: (pass) spawn policy caps > spawn, dispatch, reset, and model share one resolved tuning [71.15ms]
@bryance/orch test: 
@bryance/orch test: test\check-bridge.test.ts:
@bryance/orch test: (pass) presence filenames stay limited to the live protocol > status.json is a state-file breach [0.04ms]
@bryance/orch test: (pass) Rule 18 forbids state files and fs.watch outside their sanctioned sites > status.json is forbidden under src but allowed outside the scanned scopes [0.03ms]
@bryance/orch test: (pass) Rule 18 forbids state files and fs.watch outside their sanctioned sites > fs.watch is forbidden outside src/settings/watch.ts [0.03ms]
@bryance/orch test: (pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.05ms]
@bryance/orch test: (pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.03ms]
@bryance/orch test: (pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / settings seams [0.04ms]
@bryance/orch test: (pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [0.66ms]
@bryance/orch test: (pass) composition happens only at roots (checkCompositionRootLine) > flags ORCH_DIR reads outside src/services.ts [0.11ms]
@bryance/orch test: (pass) composition happens only at roots (checkCompositionRootLine) > flags createServices calls outside the five roots [0.05ms]
@bryance/orch test: (pass) composition happens only at roots (checkCompositionRootLine) > flags imports of removed global composition exports [0.09ms]
@bryance/orch test: (pass) composition happens only at roots (checkCompositionRootLine) > allows createServices calls in each composition root [0.04ms]
@bryance/orch test: (pass) composition happens only at roots (checkCompositionRootLine) > allows the ORCH_DIR read and declaration in src/services.ts [0.03ms]
@bryance/orch test: (pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.06ms]
@bryance/orch test: (pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.02ms]
@bryance/orch test: (pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the shared harness model port outside the adapter dispatcher
@bryance/orch test: (pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [1.14ms]
@bryance/orch test: (pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > flags a runtime adapter importing bridge-bundles/build.ts [0.28ms]
@bryance/orch test: (pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > allows scripts and the build-tool module itself [0.05ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [0.09ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.67ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.10ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke test holds no exemption: the branch was deleted, not blessed [0.05ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has no identity-branch line, exempted or otherwise [7.71ms]
@bryance/orch test: (pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > flags spawner key and spawnerIdentity key owner-token fallbacks [0.43ms]
@bryance/orch test: (pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > allows a benign line [0.04ms]
@bryance/orch test: (pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > passes the clean tree: reply addresses never use owner-token fallbacks [1.86ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags object literals that synthesize an identity [0.21ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags concatenated and template identity keys [0.19ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > allows a fresh spawn mint and the issuer modules [0.03ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > no file is exempt from the identity-construction rule [0.01ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > passes the clean tree: every identity construction is allowed or registered [2.65ms]
@bryance/orch test: (pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.12ms]
@bryance/orch test: (pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.65ms]
@bryance/orch test: (pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [7.78ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > a deleted capability bag or optional method is not exempt [1.13ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > the exempted names are the roles the ports actually declare [0.76ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > nullable data on the port is not exempted as a role [0.04ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > flags plexer and harness identity branches [0.03ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > flags method-presence capability checks [0.12ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > allows a branch inside a concrete backend [0.01ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > passes the clean tree: no file in ANY scanned scope branches on an environment id [99.61ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > the core-scope allowlist is EMPTY, so no line holds a standing exemption [0.13ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > allows capability-driven code [0.04ms]
@bryance/orch test: (pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags INSERT and UPDATE SQL that welds a lease holder into spawned_by [0.45ms]
@bryance/orch test: (pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags lease row types carrying a provenance field [0.07ms]
@bryance/orch test: (pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > allows separate lease and provenance rows [0.08ms]
@bryance/orch test: (pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > passes the clean tree: no source line crosses lease and provenance columns [52.32ms]
@bryance/orch test: (pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a launch env read outside launch.ts with the file and constant named [0.25ms]
@bryance/orch test: (pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > allows the launch env read inside identity/launch.ts [0.05ms]
@bryance/orch test: (pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a bare launch env name literal outside launch.ts [0.08ms]
@bryance/orch test: (pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a comment mentioning the launch env name outside launch.ts [0.04ms]
@bryance/orch test: (pass) the closed plexer-id set is spelled in exactly one line > the definition line is allowed where it lives, and nowhere else [0.07ms]
@bryance/orch test: (pass) the closed plexer-id set is spelled in exactly one line > any other quoted plexer id in that same file still fails [0.06ms]
@bryance/orch test: (pass) the closed plexer-id set is spelled in exactly one line > the line src/types/backend.ts actually carries is the allowed one [1.54ms]
@bryance/orch test: (pass) the closed plexer-id set is spelled in exactly one line > extensions get the same rule with their own scope named [0.04ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-tmux.test.ts:
@bryance/orch test: (pass) tmux backend registry and capabilities > is registered [0.23ms]
@bryance/orch test: 
@bryance/orch test: test\work-survives-its-spawner.test.ts:
@bryance/orch test: (pass) work survives its spawner, always (D1) > ending the spawner leaves the child live, unended and still listed [290.52ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-declared-vs-reality-tuning.test.ts:
@bryance/orch test: (pass) doctor declared tuning versus reality > different effort reports both ladder specs [129.77ms]
@bryance/orch test: (pass) doctor declared tuning versus reality > different model reports both ladder specs [187.76ms]
@bryance/orch test: (pass) doctor declared tuning versus reality > missing status produces no tuning finding [155.04ms]
@bryance/orch test: 
@bryance/orch test: test\claim-agent.test.ts:
@bryance/orch test: (pass) claim agent > unclaimed + A ΓåÆ stamped [145.22ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-tmux.test.ts:
@bryance/orch test: (pass) tmux backend registry and capabilities > explicit selection resolves the registered backend without a PATH probe [0.12ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > exposes pane roles [0.08ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > reflects the TMUX environment [0.13ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > a tmux agent's key is the minted id, never its pane [0.14ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > selects an available placing environment, whichever one the caller sits in [0.17ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > falls back to headless only when no environment can place an agent [9.02ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > an installed plexer is selectable from outside its session, and refuses in its own words [4.60ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > herdr is selectable from outside a herdr session [0.15ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-space [144.34ms]
@bryance/orch test: 
@bryance/orch test: test\store-catalogue.test.ts:
@bryance/orch test: (pass) catalogue rows > write then read round-trips at and stdout [181.93ms]
@bryance/orch test: (pass) catalogue rows > writing the same command twice keeps one row with newer values [144.67ms]
@bryance/orch test: (pass) catalogue rows > an entry with empty stdout is not stored [127.72ms]
@bryance/orch test: (pass) catalogue rows > clearCatalogues empties the store [203.02ms]
@bryance/orch test: (pass) catalogue rows > two commands coexist and updating one does not touch the other [182.27ms]
@bryance/orch test: 
@bryance/orch test: test\work-survives-its-spawner.test.ts:
@bryance/orch test: (pass) work survives its spawner, always (D1) > a grandchild is untouched when the middle agent ends [129.12ms]
@bryance/orch test: (pass) work survives its spawner, always (D1) > the store has no lifetime column and no fate-sharing flag anywhere [0.52ms]
@bryance/orch test: (pass) work survives its spawner, always (D1) > spawn offers no flag that decides whether work outlives its spawner [1.03ms]
@bryance/orch test: (pass) work survives its spawner, always (D1) > closing the spawner never writes an ending for anything it spawned [105.59ms]
@bryance/orch test: 
@bryance/orch test: test\one-writer-records-a-spawned-agent.test.ts:
@bryance/orch test: (pass) one writer records a spawned agent (2.1) > a spawn leaves NOTHING for a second writer to fill in [7440.67ms]
@bryance/orch test: 
@bryance/orch test: test\commands-results.test.ts:
@bryance/orch test: (pass) commands/results > renders daemon questions with the existing JSON shape [3596.00ms]
@bryance/orch test: 
@bryance/orch test: test\store-connection-guards.test.ts:
@bryance/orch test: (pass) store migration guards > a store predating the migrations is refused, not rebuilt over [155.59ms]
@bryance/orch test: 
@bryance/orch test: test\cli-help.test.ts:
@bryance/orch test: (pass) help from the registry > every handler word names a spec, and every spec has a handler [19.86ms]
@bryance/orch test: 
@bryance/orch test: test\worker-prompt.test.ts:
@bryance/orch test: (pass) worker prompt capability composition > spawn clause follows maySpawn and stripping preserves the task [0.42ms]
@bryance/orch test: 
@bryance/orch test: test\commands-results.test.ts:
@bryance/orch test: (pass) commands/results > renders exactly the pending questions returned by the daemon [80.95ms]
@bryance/orch test: 
@bryance/orch test: test\cli-help.test.ts:
@bryance/orch test: (pass) help from the registry > the map equals the golden file [11.81ms]
@bryance/orch test: (pass) help from the registry > the map starts with the header and lists every top-level usage under its section [0.42ms]
@bryance/orch test: (pass) help from the registry > a topic prints usage, doc, the flag table with spellings and placeholders, subcommands, then globals [0.77ms]
@bryance/orch test: (pass) help from the registry > a missing doc names the path and never throws [0.07ms]
@bryance/orch test: (pass) help from the registry > every shipped command has a doc that reads back, and doctor agrees [22.44ms]
@bryance/orch test: (pass) help from the registry > helpTopic resolves aliases and refuses unknown words [1.18ms]
@bryance/orch test: 
@bryance/orch test: test\cli-parse.test.ts:
@bryance/orch test: (pass) parseInvocation > positionals stay in order and no-value flags read as has() [0.16ms]
@bryance/orch test: (pass) parseInvocation > a one-value flag takes the next token or the assignment [0.13ms]
@bryance/orch test: (pass) parseInvocation > the value token is taken even when it starts with a dash [0.13ms]
@bryance/orch test: (pass) parseInvocation > a many-value flag collects in argv order, in both syntaxes [0.09ms]
@bryance/orch test: (pass) parseInvocation > an alias records under the long name [0.05ms]
@bryance/orch test: (pass) parseInvocation > a repeated one-value flag keeps the last value [0.02ms]
@bryance/orch test: (pass) parseInvocation > an unknown flag is refused with the usage line [0.19ms]
@bryance/orch test: (pass) parseInvocation > a one-value flag at the end of argv is refused [0.06ms]
@bryance/orch test: (pass) parseInvocation > a no-value flag with an assignment is refused [0.04ms]
@bryance/orch test: (pass) parseInvocation > a global flag is accepted on any command [0.05ms]
@bryance/orch test: (pass) parseInvocation > a subcommand word routes to the child and the path records the route [1.74ms]
@bryance/orch test: (pass) parseInvocation > openFlags keeps an undeclared flag as bare, assigned, or with the next token [0.19ms]
@bryance/orch test: (pass) parseInvocation > a closed spec refuses an undeclared flag and reports nothing undeclared [0.10ms]
@bryance/orch test: (pass) parseInvocation > no subcommand word stays on the parent [0.04ms]
@bryance/orch test: 
@bryance/orch test: test\cli-registry.test.ts:
@bryance/orch test: (pass) command registry > every spec has a usage line that starts with its path, and a summary [0.70ms]
@bryance/orch test: 
@bryance/orch test: test\claim-agent.test.ts:
@bryance/orch test: (pass) claim agent > claimed A, claim A ΓåÆ unchanged [133.02ms]
@bryance/orch test: (pass) claim agent > claimed A, reclaimAgent(id) then B ΓåÆ stamped with B [95.70ms]
@bryance/orch test: (pass) claim agent > claimed A, plain claim B ΓåÆ refused claimed-by-other, row unchanged [98.74ms]
@bryance/orch test: (pass) claim agent > unknown id ΓåÆ refused unknown-agent [134.29ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-decision-trail.test.ts:
@bryance/orch test: (pass) daemon decision trail > records a lease refused against a live holder [3540.71ms]
@bryance/orch test: 
@bryance/orch test: test\cli-registry.test.ts:
@bryance/orch test: (pass) command registry > every flag has a help line, and a placeholder when it takes a value [0.80ms]
@bryance/orch test: (pass) command registry > no spec declares one spelling twice, or shadows a global flag [0.83ms]
@bryance/orch test: (pass) command registry > every top-level command has a section and a unique word; subcommands have neither a section nor a clash [0.30ms]
@bryance/orch test: (pass) command registry > every top-level command has a non-empty doc file in help/ [7.62ms]
@bryance/orch test: (pass) command registry > a command word resolves by name or alias [3.07ms]
@bryance/orch test: 
@bryance/orch test: test\worker-prompt.test.ts:
@bryance/orch test: (pass) worker prompt capability composition > orch run composition selects the same header per adapter [0.05ms]
@bryance/orch test: (pass) worker prompt capability composition > the worker header does not instruct a lock that does not lock [0.19ms]
@bryance/orch test: (pass) worker prompt capability composition > the header addresses the agent, and names no plexer furniture [0.07ms]
@bryance/orch test: (pass) worker prompt capability composition > the verify clause names the configured commands, and asks for the repository's own when there are none [0.06ms]
@bryance/orch test: (pass) worker prompt capability composition > the header says nothing about the lock: the harness hook takes it [0.04ms]
@bryance/orch test: (pass) worker prompt capability composition > gated-commands clause names the commands and asks for the request id [0.02ms]
@bryance/orch test: (pass) worker prompt capability composition > no command clauses when both lists are empty [0.02ms]
@bryance/orch test: (pass) worker prompt capability composition > the reply-to-spawner clause needs a reachable spawner, not just a bridge-enabled worker [0.11ms]
@bryance/orch test: (pass) worker prompt capability composition > unreachable spawner tells the worker to finish and end without relaying [1.42ms]
@bryance/orch test: (pass) worker prompt capability composition > reachable spawner permits replying to the spawner only [0.03ms]
@bryance/orch test: (pass) worker prompt capability composition > a reachable spawner still earns no clause when the worker has no bridge [0.02ms]
@bryance/orch test: (pass) worker prompt capability composition > the ask clause follows the bridge actions [0.16ms]
@bryance/orch test: (pass) worker prompt capability composition > events strip both worker header variants [140.98ms]
@bryance/orch test: 
@bryance/orch test: test\worker-tools.test.ts:
@bryance/orch test: (pass) worker tool policy > no configured allowlist restricts nothing [0.31ms]
@bryance/orch test: (pass) worker tool policy > a configured allowlist always carries orch's own tools [0.15ms]
@bryance/orch test: (pass) worker tool policy > peer tools join the allowlist when the fleet enables them [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\reap-picker.test.ts:
@bryance/orch test: (pass) cmdReap > prints the --dead --json result shape [3736.61ms]
@bryance/orch test: (pass) cmdReap > refuses bare reap when stdin is not a TTY [0.74ms]
@bryance/orch test: 
@bryance/orch test: test\backend-orca-hud.test.ts:
@bryance/orch test: (pass) the orca OSC pane HUD > is inactive without an id or outside an orca pane [140.27ms]
@bryance/orch test: 
@bryance/orch test: test\log-record.test.ts:
@bryance/orch test: (pass) the one log record shape > writes one JSONL record per call, with an epoch-millis instant [17.19ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-decision-trail.test.ts:
@bryance/orch test: (pass) daemon decision trail > records a lease granted over a dead holder [121.02ms]
@bryance/orch test: (pass) daemon decision trail > records a not-placed boundary answer with its reason [163.81ms]
@bryance/orch test: 
@bryance/orch test: test\claude-adapter.test.ts:
@bryance/orch test: (pass) Claude adapter > declares its identity, and composes only the roles it fully implements [0.76ms]
@bryance/orch test: 
@bryance/orch test: test\log-record.test.ts:
@bryance/orch test: (pass) the one log record shape > a record below the configured level is not written at all [14.10ms]
@bryance/orch test: (pass) the one log record shape > a correlation id rides every record of one dispatch, so one grep finds its whole life [15.48ms]
@bryance/orch test: (pass) the one log record shape > agentId carries orch's minted id; a plexer handle is a field, never the identity [17.80ms]
@bryance/orch test: (pass) the one log record shape > every level is orderable, lowest to highest [0.09ms]
@bryance/orch test: (pass) the one log record shape > a malformed line is rejected by the guard rather than trusted [0.10ms]
@bryance/orch test: 
@bryance/orch test: test\reap-walks-provenance.test.ts:
@bryance/orch test: (pass) reap walks the provenance tree (H3) > a dead agent with a live descendant is NOT reaped [146.12ms]
@bryance/orch test: 
@bryance/orch test: test\claude-adapter.test.ts:
@bryance/orch test: (pass) Claude adapter > lists the models Claude Code reports in its initialize control response [10.88ms]
@bryance/orch test: (pass) Claude adapter > builds the interactive Claude launch command [0.34ms]
@bryance/orch test: (pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.45ms]
@bryance/orch test: (pass) Claude adapter > detects state from a live presence status [118.25ms]
@bryance/orch test: (pass) Claude adapter > extracts results before transcript and native output [15.71ms]
@bryance/orch test: (pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [4.27ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > a report for an unregistered agent throws and publishes nothing [3.81ms]
@bryance/orch test: 
@bryance/orch test: test\agent-key-is-minted-id.test.ts:
@bryance/orch test: (pass) a driving session mints an id, it is not placed by name > the presence directory is named by that id alone [2.59ms]
@bryance/orch test: (pass) a driving session mints an id, it is not placed by name > a launch that handed over a minted id is used verbatim [2.18ms]
@bryance/orch test: (pass) this process's own identity is the id and nothing else > a spawned agent answers with the id its launch handed it [3442.90ms]
@bryance/orch test: (pass) the fleet wall is lifted by the absence of a launch, not by a key's shape > an agent orch launched may not cross into another project's fleet [212.75ms]
@bryance/orch test: (pass) who drives an agent is looked up by its id > the key IS the agent id ΓÇö no segment is split out of it [3426.66ms]
@bryance/orch test: (pass) who drives an agent is looked up by its id > a composite key addresses no agent at all [170.79ms]
@bryance/orch test: (pass) doctor reads a presence directory name as an id > a composite directory name is a malformed identity key [5.81ms]
@bryance/orch test: (pass) doctor reads a presence directory name as an id > a minted id is well formed, with or without a status row [172.94ms]
@bryance/orch test: 
@bryance/orch test: test\agent-model-unwelded.test.ts:
@bryance/orch test: (pass) A1 ΓÇö the four facts are never welded > no table welds identity, provenance, ownership and environment into one row [2.53ms]
@bryance/orch test: (pass) A1 ΓÇö the four facts are never welded > ownership is a lease table, not a second id space [2.41ms]
@bryance/orch test: (pass) A1 ΓÇö the four facts are never welded > the agents hub carries identity and provenance only [0.96ms]
@bryance/orch test: (pass) A1 ΓÇö the four facts are never welded > no table anywhere carries a lifetime [12.61ms]
@bryance/orch test: 
@bryance/orch test: test\loop-watchdog.test.ts:
@bryance/orch test: (pass) loop watchdog > logs a stalled loop when the interval max delay passes the threshold [404.81ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > reports publish only changed-state transitions [138.85ms]
@bryance/orch test: 
@bryance/orch test: test\doctor.test.ts:
@bryance/orch test: (pass) runDoctor > warns when the live daemon code hash is stale [148.19ms]
@bryance/orch test: (pass) runDoctor > fails on an invalid lock and an unanswerable live socket [327.10ms]
@bryance/orch test: (pass) runDoctor > warns when the extension bundle is absent for a matching live hash [138.81ms]
@bryance/orch test: (pass) runDoctor > warns when the extension bundle is absent for a stale live hash [96.92ms]
@bryance/orch test: (pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [145.66ms]
@bryance/orch test: (pass) runDoctor > reports a dead presence pid [271.36ms]
@bryance/orch test: (pass) runDoctor > bins check is driven by the enabled set and offers no fix [137.18ms]
@bryance/orch test: (pass) runDoctor > applyFixes reports exactly the changes it applies [16.98ms]
@bryance/orch test: (pass) runDoctor > validates configured notifier adapters [680.34ms]
@bryance/orch test: (pass) runDoctor > reports invalid settings and accepts missing settings [488.45ms]
@bryance/orch test: (pass) runDoctor > never throws when individual checks encounter broken inputs [396.89ms]
@bryance/orch test: 
@bryance/orch test: test\claude-adapter.test.ts:
@bryance/orch test: (pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [332.39ms]
@bryance/orch test: 
@bryance/orch test: test\reap-walks-provenance.test.ts:
@bryance/orch test: (pass) reap walks the provenance tree (H3) > the tree is reaped from the LEAF up [134.29ms]
@bryance/orch test: (pass) reap walks the provenance tree (H3) > a LIVE descendant blocks the reap of every ancestor [125.16ms]
@bryance/orch test: (pass) reap walks the provenance tree (H3) > provenance has no ON DELETE CASCADE, so no reap can erase a subtree [130.62ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > an RPC subscriber receives a presence transition [169.17ms]
@bryance/orch test: 
@bryance/orch test: test\recipient-label.test.ts:
@bryance/orch test: (pass) agent identity shown to an operator > names the agent and its harness, never the transport key [0.10ms]
@bryance/orch test: (pass) agent identity shown to an operator > drops the routing prefix when nothing is known about it [0.03ms]
@bryance/orch test: (pass) agent identity shown to an operator > a nameless agent gets a stable logical name, not its key [0.08ms]
@bryance/orch test: 
@bryance/orch test: test\lease-authority.test.ts:
@bryance/orch test: (pass) C3 foreign agents are untouchable > a DEAD foreign holder is not a collision [158.41ms]
@bryance/orch test: (pass) C3 foreign agents are untouchable > the composed holder IS the open lease, with nothing beside it [149.02ms]
@bryance/orch test: (pass) C4 steal > adopt refuses a live holder, and --steal takes it [119.00ms]
@bryance/orch test: (pass) C4 steal > detach refuses a live holder, and --steal releases it [123.01ms]
@bryance/orch test: (pass) C4a fencing token > lease ids are monotonic across handoff and adoption [207.11ms]
@bryance/orch test: (pass) C4a fencing token > a stale fence cannot release the current holder's lease [123.92ms]
@bryance/orch test: (pass) C4a fencing token > openLeaseId is null when nothing is leased [107.00ms]
@bryance/orch test: (pass) C4b reads are never gated > status and events read straight through a live foreign lease [102.04ms]
@bryance/orch test: (pass) C4c/C4d name resolution > duplicate names are legal and an ambiguous target asks for the id [84.07ms]
@bryance/orch test: (pass) C4c/C4d name resolution > a unique name resolves, and an unknown target is a lookup miss [104.78ms]
@bryance/orch test: (pass) C4e naming at creation > a nameless spawn is refused [0.43ms]
@bryance/orch test: (pass) C4e naming at creation > a self-registering session gets <harness>-<first 8 of its id> [152.17ms]
@bryance/orch test: (pass) C4f self-rename > an agent renames itself whether or not a lease is in force [118.56ms]
@bryance/orch test: (pass) C4f self-rename > renaming another agent is driving and obeys the lease [143.95ms]
@bryance/orch test: (pass) C4f self-rename > an invalid name is refused [129.95ms]
@bryance/orch test: (pass) C5 a transfer does not disturb the agent > adoption writes lease rows and touches nothing else [150.19ms]
@bryance/orch test: (pass) C7 live by lease, history by provenance > adoption moves the live view and leaves provenance untouched [140.44ms]
@bryance/orch test: 
@bryance/orch test: test\loop-watchdog.test.ts:
@bryance/orch test: (pass) loop watchdog > does not log when the loop stays below the threshold [154.06ms]
@bryance/orch test: 
@bryance/orch test: test\retention.test.ts:
@bryance/orch test: (pass) retention sweep > a null ended_agents_days is the user's own choice, never the default [130.58ms]
@bryance/orch test: (pass) retention sweep > uses each table's own window and keeps queued and claimed tasks [164.13ms]
@bryance/orch test: (pass) retention sweep > returns zero counts when every row is inside its window [225.70ms]
@bryance/orch test: (pass) retention sweep > continues sweeping when one table delete fails [146.14ms]
@bryance/orch test: (pass) retention sweep > reaps a gone agent by identity, taking every satellite with it [128.00ms]
@bryance/orch test: (pass) retention sweep > a dead parent goes in the same reap as its dead child [152.11ms]
@bryance/orch test: (pass) retention sweep > a dead parent stays while a live child still points at it [152.85ms]
@bryance/orch test: (pass) retention sweep > a dead agent a task still points at stays for a later reap [109.94ms]
@bryance/orch test: (pass) retention sweep > the sweep leaves a dead agent's rows alone and keeps its young history [116.62ms]
@bryance/orch test: (pass) retention sweep > removes a gone agent's history once its last write is past the window [162.13ms]
@bryance/orch test: (pass) retention sweep > keeps history whose newest file is inside the window [135.04ms]
@bryance/orch test: (pass) retention sweep > a null window keeps history forever [128.55ms]
@bryance/orch test: (pass) retention sweep > never reaps a live agent or its history regardless of age [150.14ms]
@bryance/orch test: (pass) retention sweep > sweeps old logs but preserves logs for live agents [119.25ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: (pass) fleet ownership scoping > owner token is this process's own registered id, and nothing before it registers [3443.80ms]
@bryance/orch test: 
@bryance/orch test: test\retention.test.ts:
@bryance/orch test: (pass) retention sweep > does not sweep again one minute after the first tick [149.27ms]
@bryance/orch test: 
@bryance/orch test: test\environment-dictates-what-is-possible.test.ts:
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > a MOVE is a new environment record, and what is possible follows it at once [140.37ms]
@bryance/orch test: 
@bryance/orch test: test\backend-orca-hud.test.ts:
@bryance/orch test: (pass) the orca OSC pane HUD > writes working state and suppresses unchanged frames [140.48ms]
@bryance/orch test: (pass) the orca OSC pane HUD > maps asking to waiting and idle to done [138.31ms]
@bryance/orch test: (pass) the orca OSC pane HUD > ignores unknown states [136.51ms]
@bryance/orch test: (pass) the orca OSC pane HUD > re-resolves the tty after a write failure [147.90ms]
@bryance/orch test: (pass) the orca OSC pane HUD > retries a pane whose shell is not up yet [129.33ms]
@bryance/orch test: (pass) the orca OSC pane HUD > does not report to a different pane [168.66ms]
@bryance/orch test: 
@bryance/orch test: test\nested-spawn-unleased.test.ts:
@bryance/orch test: (pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the middle agent's death leaves the grandchild unleased, held by nobody [124.06ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lease.test.ts:
@bryance/orch test: {"outcome":"answer","reason":"no-environment-role","text":"this pane environment does not provide abort"}
@bryance/orch test: (pass) lease commands > abort proceeds with a foreign live-holder lease [3398.34ms]
@bryance/orch test: 
@bryance/orch test: test\store-connection-guards.test.ts:
@bryance/orch test: (pass) store migration guards > names live presence as the thing to close before rebuilding [268.10ms]
@bryance/orch test: (pass) a slave never reaps or recreates the store > a spawned agent hitting a schema-mismatched store errors and mutates nothing [203.53ms]
@bryance/orch test: (pass) a slave never reaps or recreates the store > a recreate is refused while a live worker exists, for the user too [234.86ms]
@bryance/orch test: (pass) a slave never reaps or recreates the store > a live driving session is refused without --with-sessions and allowed with it [258.61ms]
@bryance/orch test: (pass) a slave never reaps or recreates the store > the user may recreate once nothing is live [230.88ms]
@bryance/orch test: (pass) a slave never reaps or recreates the store > a spawned agent is refused a recreate even with nothing live [167.99ms]
@bryance/orch test: 
@bryance/orch test: test\retention.test.ts:
@bryance/orch test: (pass) retention sweep > prunes orch's own logs past the age cap [109.95ms]
@bryance/orch test: (pass) retention sweep > prunes orch's own logs past the size cap even when freshly written [122.24ms]
@bryance/orch test: 
@bryance/orch test: test\backend-orca.test.ts:
@bryance/orch test: (pass) OrcaBackend > placementInventory.list returns terminal targets [0.83ms]
@bryance/orch test: (pass) OrcaBackend > groupHome.list returns terminal groups [0.75ms]
@bryance/orch test: (pass) OrcaBackend > placement.open creates a terminal in the cwd worktree [3.75ms]
@bryance/orch test: (pass) OrcaBackend > placement.open selects a worktree by id [0.21ms]
@bryance/orch test: (pass) OrcaBackend > a caller pane is split rather than given a new tab [1.02ms]
@bryance/orch test: (pass) OrcaBackend > placement.open with a target splits that handle [0.15ms]
@bryance/orch test: (pass) OrcaBackend > screen.read returns the requested tail [0.97ms]
@bryance/orch test: (pass) OrcaBackend > agentInput.submit sends text and enter [0.33ms]
@bryance/orch test: (pass) OrcaBackend > agentInput.sendKeys sends interrupt for C-c [0.24ms]
@bryance/orch test: (pass) OrcaBackend > agentInput.sendKeys sends the Escape byte [0.34ms]
@bryance/orch test: (pass) OrcaBackend > pane input reports gone handles [0.41ms]
@bryance/orch test: (pass) OrcaBackend > serverInfo.running reports the Orca version or null when down [0.56ms]
@bryance/orch test: (pass) OrcaBackend > spawn types the launch environment and adapter command [1.31ms]
@bryance/orch test: (pass) OrcaBackend > spawn intoHandle sends to the handed-over terminal [0.20ms]
@bryance/orch test: (pass) OrcaBackend > identity.current returns the minted id only inside Orca [0.20ms]
@bryance/orch test: (pass) OrcaBackend > isInsideSession mirrors ORCA_PANE_KEY [0.15ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lease.test.ts:
@bryance/orch test: {"closed":["suvit3eksp"],"results":[{"target":"suvit3eksp","handle":"close-handle","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
@bryance/orch test: (pass) lease commands > close proceeds with a foreign live-holder lease [147.54ms]
@bryance/orch test: 
@bryance/orch test: test\nested-spawn-unleased.test.ts:
@bryance/orch test: (pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the grandchild stays alive and adoptable, and keeps its own provenance [124.12ms]
@bryance/orch test: (pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the grandparent holding the middle agent does not extend to the grandchild [111.73ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lease.test.ts:
@bryance/orch test: {"target":"inj41z26la","name":"reap-worker","reaped":true}
@bryance/orch test: (pass) lease commands > reap proceeds with a foreign live-holder lease [113.53ms]
@bryance/orch test: 
@bryance/orch test: test\environment-dictates-what-is-possible.test.ts:
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > a move closes the interval it left, so history says WHERE it was and WHEN [136.13ms]
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > moving one axis leaves every other axis exactly where it was [119.34ms]
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > an UPGRADE is a NEW host_plexers row, not an overwrite of the old one [91.13ms]
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > re-declaring the SAME version is not an upgrade and opens no second row [92.99ms]
@bryance/orch test: (pass) the environment dictates what is possible, and nothing negotiates it (E15) > nothing anywhere records what an agent CAN do [63.04ms]
@bryance/orch test: 
@bryance/orch test: test\errno-guard.test.ts:
@bryance/orch test: (pass) errnoCode reads a syscall error code, and only a real one > returns the code of a real node syscall error [0.24ms]
@bryance/orch test: (pass) errnoCode reads a syscall error code, and only a real one > a plain Error carries no code, so there is none to report [0.03ms]
@bryance/orch test: (pass) errnoCode reads a syscall error code, and only a real one > a non-object never yields a code instead of crashing on it [0.04ms]
@bryance/orch test: (pass) errnoCode reads a syscall error code, and only a real one > a code-shaped field of the wrong type is not a code [0.02ms]
@bryance/orch test: (pass) isAgentState verifies the state rather than asserting it > accepts a declared state [0.05ms]
@bryance/orch test: (pass) isAgentState verifies the state rather than asserting it > rejects anything not declared, including non-strings [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lease.test.ts:
@bryance/orch test: (pass) lease commands > reset driving verb refuses a foreign live-holder lease [83.61ms]
@bryance/orch test: 
@bryance/orch test: test\event-bus.test.ts:
@bryance/orch test: (pass) event bus > a throwing handler does not stop later handlers and is logged once [0.29ms]
@bryance/orch test: (pass) event bus > unsubscribe removes only its own handler [0.05ms]
@bryance/orch test: (pass) event bus > emit with no handlers is a no-op [0.06ms]
@bryance/orch test: 
@bryance/orch test: test\no-placement-row-over-the-composed-view.test.ts:
@bryance/orch test: (pass) no Placement row is reassembled over the composed view (2.1) > there is no second lookup module projecting the environment into a flat row [1.30ms]
@bryance/orch test: 
@bryance/orch test: test\event-identity.test.ts:
@bryance/orch test: (pass) published event identity > stamps a per-agent ordinal so a redelivery is recognizable [2.25ms]
@bryance/orch test: 
@bryance/orch test: test\store-events.test.ts:
@bryance/orch test: (pass) event store rows > appendEvent assigns increasing sequence numbers and round-trips payload [135.00ms]
@bryance/orch test: 
@bryance/orch test: test\routing-hardening.test.ts:
@bryance/orch test: (pass) store hardening > stores hostile values as data and preserves pack selection [132.61ms]
@bryance/orch test: 
@bryance/orch test: test\session-sees-only-held-agents.test.ts:
@bryance/orch test: (pass) session agent visibility > a session cannot reset a foreign-held agent [3643.97ms]
@bryance/orch test: 
@bryance/orch test: test\no-placement-row-over-the-composed-view.test.ts:
@bryance/orch test: (pass) no Placement row is reassembled over the composed view (2.1) > the space wall reads the OPEN space interval, so a moved agent is walled by where it IS [131.89ms]
@bryance/orch test: (pass) no Placement row is reassembled over the composed view (2.1) > a string that names no registered agent is in no space rather than an error [86.01ms]
@bryance/orch test: 
@bryance/orch test: test\session-sees-only-held-agents.test.ts:
@bryance/orch test: (pass) session agent visibility > a session cannot read runs by the exact key of a foreign-held agent [168.19ms]
@bryance/orch test: 
@bryance/orch test: test\event-identity.test.ts:
@bryance/orch test: (pass) the work loop is not a second presence-transition source > an agent state change publishes nothing from the queue loop [277.86ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-log-tail.test.ts:
@bryance/orch test: (pass) daemon log tail > skips a CLI line after the daemon line [17.35ms]
@bryance/orch test: 
@bryance/orch test: test\session-sees-only-held-agents.test.ts:
@bryance/orch test: (pass) session agent visibility > a session cannot widen status with --space-wide [87.45ms]
@bryance/orch test: (pass) session agent visibility > a session cannot resolve a foreign target, even when it shares provenance [117.64ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: orch: a queued store write failed 72 | 		const params = query.params.length === 0 ? query.params : fillPlaceholders(query.params, placeholderValues);
@bryance/orch test: 73 | 		logger.logQuery(sql, params);
@bryance/orch test: 74 | 		if (resultKind === "sync") try {
@bryance/orch test: 75 | 			return executors.run(params);
@bryance/orch test: 76 | 		} catch (e) {
@bryance/orch test: 77 | 			throw new DrizzleQueryError(sql, params, e);
@bryance/orch test:               ^
@bryance/orch test: DrizzleQueryError: Failed query: insert into "runs" ("dispatch_id", "agent_key", "adapter", "model", "space", "task", "state", "started_at", "finished_at", "tokens_in", "tokens_out", "cache_read", "cache_write", "cost", "turns", "result", "last_error") values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) on conflict ("runs"."dispatch_id") do update set "agent_key" = ?, "adapter" = ?, "model" = ?, "space" = ?, "task" = ?, "state" = ?, "finished_at" = ?, "tokens_in" = ?, "tokens_out" = ?, "cache_read" = ?, "cache_write" = ?, "cost" = ?, "turns" = ?, "result" = ?, "last_error" = ?
@bryance/orch test: params: dispatch-broken,runsbroken,pi,,,,working,1767484800000,,,,,,,,,,runsbroken,pi,,,,working,,,,,,,,,
@bryance/orch test:   query: "insert into \"runs\" (\"dispatch_id\", \"agent_key\", \"adapter\", \"model\", \"space\", \"task\", \"state\", \"started_at\", \"finished_at\", \"tokens_in\", \"tokens_out\", \"cache_read\", \"cache_write\", \"cost\", \"turns\", \"result\", \"last_error\") values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) on conflict (\"runs\".\"dispatch_id\") do update set \"agent_key\" = ?, \"adapter\" = ?, \"model\" = ?, \"space\" = ?, \"task\" = ?, \"state\" = ?, \"finished_at\" = ?, \"tokens_in\" = ?, \"tokens_out\" = ?, \"cache_read\" = ?, \"cache_write\" = ?, \"cost\" = ?, \"turns\" = ?, \"result\" = ?, \"last_error\" = ?",
@bryance/orch test:  params: [
@bryance/orch test:   "dispatch-broken", "runsbroken", "pi", null, null, null, "working", 1767484800000, null,
@bryance/orch test:   null, null, null, null, null, null, null, null, "runsbroken", "pi", null, null, null,
@bryance/orch test:   "working", null, null, null, null, null, null, null, null, null
@bryance/orch test: ],
@bryance/orch test: 
@bryance/orch test:       at run (C:\dev\personal\orch\node_modules\drizzle-orm\sqlite-core\async\session.js:77:10)
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\src\store\run-rows.ts:67:8)
@bryance/orch test:       at withTransaction (C:\dev\personal\orch\packages\orch\src\store\connection.ts:401:20)
@bryance/orch test:       at drainOneByOne (C:\dev\personal\orch\packages\orch\src\store\connection.ts:281:7)
@bryance/orch test:       at drainWrites (C:\dev\personal\orch\packages\orch\src\store\connection.ts:298:3)
@bryance/orch test:       at orm (C:\dev\personal\orch\packages\orch\src\store\connection.ts:306:3)
@bryance/orch test:       at latestResultTexts (C:\dev\personal\orch\packages\orch\src\store\run-rows.ts:85:16)
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\src\presence\store.ts:322:18)
@bryance/orch test:       at upsertRun (C:\dev\personal\orch\packages\orch\src\store\run-rows.ts:69:40)
@bryance/orch test:       at acceptStatusReport (C:\dev\personal\orch\packages\orch\src\daemon\server\status-report.ts:58:70)
@bryance/orch test: 
@bryance/orch test: 70 | 		const { query, logger, executors, fastPath, resultKind } = this;
@bryance/orch test: 71 | 		const sql = query._sql ? query._sql.join(" ") : query.sql;
@bryance/orch test: 72 | 		const params = query.params.length === 0 ? query.params : fillPlaceholders(query.params, placeholderValues);
@bryance/orch test: 73 | 		logger.logQuery(sql, params);
@bryance/orch test: 74 | 		if (resultKind === "sync") try {
@bryance/orch test: 75 | 			return executors.run(params);
@bryance/orch test:                          ^
@bryance/orch test: error: history disabled
@bryance/orch test:  errcode: 1811,
@bryance/orch test:   errstr: "constraint failed",
@bryance/orch test:     code: "ERR_SQLITE_ERROR"
@bryance/orch test: 
@bryance/orch test:       at run (C:\dev\personal\orch\node_modules\drizzle-orm\sqlite-core\async\session.js:75:21)
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\src\store\run-rows.ts:67:8)
@bryance/orch test:       at withTransaction (C:\dev\personal\orch\packages\orch\src\store\connection.ts:401:20)
@bryance/orch test:       at drainOneByOne (C:\dev\personal\orch\packages\orch\src\store\connection.ts:281:7)
@bryance/orch test:       at drainWrites (C:\dev\personal\orch\packages\orch\src\store\connection.ts:298:3)
@bryance/orch test:       at orm (C:\dev\personal\orch\packages\orch\src\store\connection.ts:306:3)
@bryance/orch test:       at latestResultTexts (C:\dev\personal\orch\packages\orch\src\store\run-rows.ts:85:16)
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\src\presence\store.ts:322:18)
@bryance/orch test:       at upsertRun (C:\dev\personal\orch\packages\orch\src\store\run-rows.ts:69:40)
@bryance/orch test: 
@bryance/orch test: orch: a queued store write failed 72 | 		const params = query.params.length === 0 ? query.params : fillPlaceholders(query.params, placeholderValues);
@bryance/orch test: 73 | 		logger.logQuery(sql, params);
@bryance/orch test: 74 | 		if (resultKind === "sync") try {
@bryance/orch test: 75 | 			return executors.run(params);
@bryance/orch test: 76 | 		} catch (e) {
@bryance/orch test: 77 | 			throw new DrizzleQueryError(sql, params, e);
@bryance/orch test:               ^
@bryance/orch test: DrizzleQueryError: Failed query: insert into "runs" ("dispatch_id", "agent_key", "adapter", "model", "space", "task", "state", "started_at", "finished_at", "tokens_in", "tokens_out", "cache_read", "cache_write", "cost", "turns", "result", "last_error") values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) on conflict ("runs"."dispatch_id") do update set "agent_key" = ?, "adapter" = ?, "model" = ?, "space" = ?, "task" = ?, "state" = ?, "finished_at" = ?, "tokens_in" = ?, "tokens_out" = ?, "cache_read" = ?, "cache_write" = ?, "cost" = ?, "turns" = ?, "result" = ?, "last_error" = ?
@bryance/orch test: params: dispatch-broken,runsbroken,pi,,,,done,1767484800000,1767484860000,,,,,,,,,runsbroken,pi,,,,done,1767484860000,,,,,,,,
@bryance/orch test:   query: "insert into \"runs\" (\"dispatch_id\", \"agent_key\", \"adapter\", \"model\", \"space\", \"task\", \"state\", \"started_at\", \"finished_at\", \"tokens_in\", \"tokens_out\", \"cache_read\", \"cache_write\", \"cost\", \"turns\", \"result\", \"last_error\") values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) on conflict (\"runs\".\"dispatch_id\") do update set \"agent_key\" = ?, \"adapter\" = ?, \"model\" = ?, \"space\" = ?, \"task\" = ?, \"state\" = ?, \"finished_at\" = ?, \"tokens_in\" = ?, \"tokens_out\" = ?, \"cache_read\" = ?, \"cache_write\" = ?, \"cost\" = ?, \"turns\" = ?, \"result\" = ?, \"last_error\" = ?",
@bryance/orch test:  params: [
@bryance/orch test:   "dispatch-broken", "runsbroken", "pi", null, null, null, "done", 1767484800000, 1767484860000,
@bryance/orch test:   null, null, null, null, null, null, null, null, "runsbroken", "pi", null, null, null,
@bryance/orch test:   "done", 1767484860000, null, null, null, null, null, null, null, null
@bryance/orch test: ],
@bryance/orch test: 
@bryance/orch test:       at run (C:\dev\personal\orch\node_modules\drizzle-orm\sqlite-core\async\session.js:77:10)
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\src\store\run-rows.ts:67:8)
@bryance/orch test:       at withTransaction (C:\dev\personal\orch\packages\orch\src\store\connection.ts:401:20)
@bryance/orch test:       at drainOneByOne (C:\dev\personal\orch\packages\orch\src\store\connection.ts:281:7)
@bryance/orch test:       at drainWrites (C:\dev\personal\orch\packages\orch\src\store\connection.ts:298:3)
@bryance/orch test:       at orm (C:\dev\personal\orch\packages\orch\src\store\connection.ts:306:3)
@bryance/orch test:       at latestResultTexts (C:\dev\personal\orch\packages\orch\src\store\run-rows.ts:85:16)
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\src\presence\store.ts:322:18)
@bryance/orch test:       at upsertRun (C:\dev\personal\orch\packages\orch\src\store\run-rows.ts:69:40)
@bryance/orch test:       at acceptStatusReport (C:\dev\personal\orch\packages\orch\src\daemon\server\status-report.ts:58:70)
@bryance/orch test: 
@bryance/orch test: 70 | 		const { query, logger, executors, fastPath, resultKind } = this;
@bryance/orch test: 71 | 		const sql = query._sql ? query._sql.join(" ") : query.sql;
@bryance/orch test: 72 | 		const params = query.params.length === 0 ? query.params : fillPlaceholders(query.params, placeholderValues);
@bryance/orch test: 73 | 		logger.logQuery(sql, params);
@bryance/orch test: 74 | 		if (resultKind === "sync") try {
@bryance/orch test: 75 | 			return executors.run(params);
@bryance/orch test:                          ^
@bryance/orch test: error: history disabled
@bryance/orch test:  errcode: 1811,
@bryance/orch test:   errstr: "constraint failed",
@bryance/orch test:     code: "ERR_SQLITE_ERROR"
@bryance/orch test: 
@bryance/orch test:       at run (C:\dev\personal\orch\node_modules\drizzle-orm\sqlite-core\async\session.js:75:21)
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\src\store\run-rows.ts:67:8)
@bryance/orch test:       at withTransaction (C:\dev\personal\orch\packages\orch\src\store\connection.ts:401:20)
@bryance/orch test:       at drainOneByOne (C:\dev\personal\orch\packages\orch\src\store\connection.ts:281:7)
@bryance/orch test:       at drainWrites (C:\dev\personal\orch\packages\orch\src\store\connection.ts:298:3)
@bryance/orch test:       at orm (C:\dev\personal\orch\packages\orch\src\store\connection.ts:306:3)
@bryance/orch test:       at latestResultTexts (C:\dev\personal\orch\packages\orch\src\store\run-rows.ts:85:16)
@bryance/orch test:       at <anonymous> (C:\dev\personal\orch\packages\orch\src\presence\store.ts:322:18)
@bryance/orch test:       at upsertRun (C:\dev\personal\orch\packages\orch\src\store\run-rows.ts:69:40)
@bryance/orch test: 
@bryance/orch test: (pass) daemon presence events > a dispatched transition writes the full run row [137.11ms]
@bryance/orch test: (pass) daemon presence events > a result report stores the complete result text [146.59ms]
@bryance/orch test: (pass) daemon presence events > a status report after the result leaves the settled run alone [131.01ms]
@bryance/orch test: (pass) daemon presence events > repeated transitions upsert one run and only terminal states set finishedAt [109.43ms]
@bryance/orch test: (pass) daemon presence events > a status without a dispatch id does not write history [100.46ms]
@bryance/orch test: (pass) daemon presence events > a throwing history write does not stop event delivery [96.86ms]
@bryance/orch test: (pass) daemon presence events > a flapping status file cannot storm the stream with repeat transitions [0.62ms]
@bryance/orch test: (pass) daemon presence events > a genuine repeat of the same transition for new work still publishes [0.13ms]
@bryance/orch test: (pass) daemon presence events > a repeat transition publishes again once the suppression window passes [0.06ms]
@bryance/orch test: (pass) daemon presence events > repeated observations cannot slide the suppression window forever [0.05ms]
@bryance/orch test: (pass) daemon presence events > a working-to-done repeat after the dedupe window is emitted [0.14ms]
@bryance/orch test: (pass) daemon presence events > presence transitions resolve the human name before emission [70.35ms]
@bryance/orch test: (pass) daemon presence events > presence transitions use the normalized agent name after rename [86.51ms]
@bryance/orch test: (pass) daemon presence events > status rows preserve the complete asking transition payload [137.92ms]
@bryance/orch test: (pass) daemon presence events > transition events use blocked messages while asking events use pending questions [105.09ms]
@bryance/orch test: (pass) daemon presence events > an asking report publishes an asking event [103.27ms]
@bryance/orch test: 
@bryance/orch test: test\session.test.ts:
@bryance/orch test: (pass) parseSession > returns an empty view for null and missing paths [0.34ms]
@bryance/orch test: 
@bryance/orch test: test\close-always.test.ts:
@bryance/orch test: Could not close signalfai1: cannot signal process 10548: orch is running in it
@bryance/orch test: {"closed":[],"results":[{"target":"signalfai1","handle":"pane-signal-failed","outcome":"error","error":"cannot signal process 10548: orch is running in it"}],"requested":1,"ok":0,"stream":false}
@bryance/orch test: (pass) close always works > a failed signal retains the registry and presence and reports failure [3455.14ms]
@bryance/orch test: 
@bryance/orch test: test\session.test.ts:
@bryance/orch test: (pass) parseSession > handles model, thinking, user, assistant, tool, and unknown entries [5.94ms]
@bryance/orch test: (pass) parseSession > joins text blocks and ignores non-text blocks [14.92ms]
@bryance/orch test: 
@bryance/orch test: test\store-events.test.ts:
@bryance/orch test: (pass) event store rows > appendEvent keeps sequence numbers across store reopen [234.70ms]
@bryance/orch test: (pass) event store rows > pruned sequence numbers are never reused [141.13ms]
@bryance/orch test: (pass) event store rows > selectEventsSince filters by sequence, orders ascending, and honours limit [102.74ms]
@bryance/orch test: (pass) event store rows > oldestEventSeq reports undefined when empty and the surviving lowest sequence after pruning [86.91ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > an asking transition drives command sink delivery [293.57ms]
@bryance/orch test: 
@bryance/orch test: test\broker-governance.test.ts:
@bryance/orch test: (pass) daemon governWrite enforcement > an unscoped actor is refused while a live orch holds the lease [3543.31ms]
@bryance/orch test: 
@bryance/orch test: test\close-always.test.ts:
@bryance/orch test: {"closed":["presence01"],"results":[{"target":"presence01","handle":"pane-presence-only","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
@bryance/orch test: (pass) close always works > presence pid without a recorded process closes the pane without signalling and ends the row [143.12ms]
@bryance/orch test: 
@bryance/orch test: test\settings-command.test.ts:
@bryance/orch test: (pass) orch settings > every registered setting is reachable through --json [30.34ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lifecycle.test.ts:
@bryance/orch test: (pass) commands/lifecycle > capability helpers fail closed when absent [702.38ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > liveness announces a dead process as exited, then reaps its rows [115.51ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-no-peer-credentials.test.ts:
@bryance/orch test: (pass) the daemon asks for a token and nothing else > no peer-credential or ancestry syscall appears in the daemon at all [57.58ms]
@bryance/orch test: 
@bryance/orch test: test\close-always.test.ts:
@bryance/orch test: {"closed":["owned00001"],"results":[{"target":"owned00001","handle":"pane-owned","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
@bryance/orch test: (pass) close always works > close ignores owner and spawnedBy gates [115.52ms]
@bryance/orch test: 
@bryance/orch test: test\claude-adapter.test.ts:
@bryance/orch test: (pass) Claude adapter > maps Claude hook events to presence reports [1744.41ms]
@bryance/orch test: 
@bryance/orch test: test\store-identity.test.ts:
@bryance/orch test: (pass) hello agent identity rows > reuses the live agent for the same session process and mints for another [140.26ms]
@bryance/orch test: 
@bryance/orch test: test\close-always.test.ts:
@bryance/orch test: {"outcome":"answer","reason":"no-environment-role","text":"this pane environment does not provide abort"}
@bryance/orch test: (pass) close always works > abort ignores owner gate [99.14ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-idle.test.ts:
@bryance/orch test: (pass) orchd idle shutdown rule > a zero setting disables idle shutdown entirely [0.17ms]
@bryance/orch test: (pass) orchd idle shutdown rule > a live agent holds the daemon open however long it has been quiet [0.06ms]
@bryance/orch test: (pass) orchd idle shutdown rule > an event subscriber holds the daemon open [0.03ms]
@bryance/orch test: (pass) orchd idle shutdown rule > recent activity holds the daemon open below the threshold [0.02ms]
@bryance/orch test: (pass) orchd idle shutdown rule > a fully idle daemon past the threshold is due to exit [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\store-identity.test.ts:
@bryance/orch test: (pass) hello agent identity rows > first sight creates a named root agent and open process row [117.63ms]
@bryance/orch test: 
@bryance/orch test: test\close-always.test.ts:
@bryance/orch test: {"closed":["duplicate1"],"results":[{"target":"duplicate1","handle":"pane-duplicate","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
@bryance/orch test: (pass) close always works > duplicate close targets count once [159.91ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-identity.test.ts:
@bryance/orch test: (pass) one key per pane spawn (12.1) > identity is an opaque minted id ΓÇö never the name, never the pane handle [7587.95ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-policy.test.ts:
@bryance/orch test: (pass) spawn policy caps > an agent's own pin outranks the default and only this command's flags outrank the pin [20.31ms]
@bryance/orch test: (pass) spawn policy caps > launch env uses the minted agent id name [0.15ms]
@bryance/orch test: (pass) spawn policy caps > worker prompt depth > root worker maySpawn follows max_depth [5.17ms]
@bryance/orch test: (pass) spawn policy caps > allows a pack spawn while under the cap [6.33ms]
@bryance/orch test: (pass) spawn policy caps > blocks an at-cap spawn and offers dispatch or the pack queue [0.28ms]
@bryance/orch test: (pass) spawn policy caps > a slave may not spawn by default: fleet.max_depth is 1 [0.10ms]
@bryance/orch test: (pass) spawn policy caps > fleet.max_depth 2 lets a slave spawn and refuses its child [0.14ms]
@bryance/orch test: (pass) spawn policy caps > reads a pack cap override from settings [4.85ms]
@bryance/orch test: (pass) spawn policy caps > a tab holds at most fleet.max_agents_per_tab agents, counting what it already holds [103.13ms]
@bryance/orch test: 
@bryance/orch test: test\close-always.test.ts:
@bryance/orch test: {"closed":["deadpane01"],"results":[{"target":"deadpane01","handle":"99999999","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
@bryance/orch test: (pass) close always works > dead pane-less close is a successful no-op that ends the row and leaves presence to reap [127.49ms]
@bryance/orch test: 
@bryance/orch test: test\store-instants.test.ts:
@bryance/orch test: (pass) epoch-millisecond store instants > a lease records its holding as an integer instant [131.22ms]
@bryance/orch test: 
@bryance/orch test: test\command-refusal.test.ts:
@bryance/orch test: (pass) a command refusal is thrown, not exited > an unresolvable target throws a CommandRefusal instead of killing the process [3644.71ms]
@bryance/orch test: 
@bryance/orch test: test\close-always.test.ts:
@bryance/orch test: (pass) close always works > steer remains blocked by the space wall [96.27ms]
@bryance/orch test: 
@bryance/orch test: test\store-instants.test.ts:
@bryance/orch test: (pass) epoch-millisecond store instants > agents order numerically by their creation instant, never lexically [110.70ms]
@bryance/orch test: (pass) epoch-millisecond store instants > all time-named columns use integer declarations [3.35ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lifecycle.test.ts:
@bryance/orch test: (pass) commands/lifecycle > reports missing bridge pid without touching backend [592.51ms]
@bryance/orch test: 
@bryance/orch test: test\command-refusal.test.ts:
@bryance/orch test: (pass) a command refusal is thrown, not exited > the refusal carries the reason a human needs [119.83ms]
@bryance/orch test: 
@bryance/orch test: test\claude-adapter.test.ts:
@bryance/orch test: (pass) Claude adapter > exits silently and writes no presence without launch env (a non-orch session) [320.78ms]
@bryance/orch test: (pass) Claude adapter > fails hard and writes no presence on a malformed launch env [281.94ms]
@bryance/orch test: 
@bryance/orch test: test\close-authority.test.ts:
@bryance/orch test: (pass) who may end an agent (D7) > the human may close anything [103.02ms]
@bryance/orch test: 
@bryance/orch test: test\claude-hooks.test.ts:
@bryance/orch test: (pass) Claude hook command > runs for every Claude session and lets the shim self-gate [20.96ms]
@bryance/orch test: 
@bryance/orch test: test\command-space-fields.test.ts:
@bryance/orch test: (pass) command space fields > status and wall entities use the composed space, and it is nowhere in the key [124.38ms]
@bryance/orch test: 
@bryance/orch test: test\one-writer-records-a-spawned-agent.test.ts:
@bryance/orch test: (pass) one writer records a spawned agent (2.1) > a spawn into NO space records no space and hands the plexer only its coordinate [3488.51ms]
@bryance/orch test: (pass) one writer records a spawned agent (2.1) > the presence store no longer offers a second way to record an agent [2.63ms]
@bryance/orch test: 
@bryance/orch test: test\store-interval-rows.test.ts:
@bryance/orch test: (pass) interval satellites > only one open interval is allowed [149.41ms]
@bryance/orch test: 
@bryance/orch test: test\orch-bugs-4-5.test.ts:
@bryance/orch test: (pass) orch bugs 4 and 5 launch contracts > interactive launch routes use one argv composition [1.78ms]
@bryance/orch test: (pass) orch bugs 4 and 5 launch contracts > headless launch routes use one argv composition [1.14ms]
@bryance/orch test: (pass) orch bugs 4 and 5 launch contracts > inherited extension policy emits every discovered extension [0.73ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö orch's own grouping > a space is created, listed, renamed and deleted with no space-home role [3583.91ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-replay.test.ts:
@bryance/orch test: (pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [136.85ms]
@bryance/orch test: 
@bryance/orch test: test\broker-governance.test.ts:
@bryance/orch test: (pass) daemon governWrite enforcement > an unscoped actor may write to an unleased target [84.36ms]
@bryance/orch test: (pass) daemon governWrite enforcement > the lease holder may write to its own agent [92.26ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a foreign live holder in the same space is refused and named [80.99ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a dead holder is not a collision [78.04ms]
@bryance/orch test: (pass) daemon governWrite enforcement > --steal on a driving verb does not take a live holder's lease [78.09ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a cross-space write is refused by the wall before the lease [100.85ms]
@bryance/orch test: (pass) daemon governWrite enforcement > --cross-space clears the wall but the lease still applies [119.06ms]
@bryance/orch test: (pass) daemon governWrite enforcement > the space operator writes to a same-space leased agent without taking the lease [67.19ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a foreign space's operator still hits the wall [69.84ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a refused enqueue leaves the lease exactly as it was [109.76ms]
@bryance/orch test: (pass) daemon governWrite enforcement > a granted write and its enqueue commit together [113.29ms]
@bryance/orch test: (pass) daemon governWrite enforcement > an unleased target is writable by any same-space actor [125.85ms]
@bryance/orch test: 
@bryance/orch test: test\command-space-fields.test.ts:
@bryance/orch test: (pass) command space fields > skipBackends keeps the authoritative presence entity shape [106.83ms]
@bryance/orch test: (pass) command space fields > status reports a mixed pi and Claude fleet with the same identity fields [125.75ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-reconnect.test.ts:
@bryance/orch test: (pass) RPC JSON framing > rejects malformed object that only has an id [7.98ms]
@bryance/orch test: (pass) RPC JSON framing > parses split and multiple newline-delimited frames [21.73ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö orch's own grouping > create refuses a name already in use [140.71ms]
@bryance/orch test: 
@bryance/orch test: test\broker-ownership.test.ts:
@bryance/orch test: (pass) broker ownership and space governance > the composed holder is the only ownership record, and adoption moves it [157.73ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö orch's own grouping > delete refuses a space that still holds agents [169.90ms]
@bryance/orch test: 
@bryance/orch test: test\close-authority.test.ts:
@bryance/orch test: (pass) who may end an agent (D7) > an orch may close the slaves it owns, at any depth [120.41ms]
@bryance/orch test: (pass) who may end an agent (D7) > an agent may NOT close another orch's slaves, and is told whose it is [117.04ms]
@bryance/orch test: (pass) who may end an agent (D7) > an agent may not close a peer orch either [107.33ms]
@bryance/orch test: (pass) who may end an agent (D7) > an agent may always close itself ΓÇö acting on yourself is not driving a fleet [124.73ms]
@bryance/orch test: (pass) who may end an agent (D7) > adopting grants the right to end, and the spawner keeps it [125.86ms]
@bryance/orch test: (pass) who may end an agent (D7) > a provenance cycle terminates instead of hanging [118.04ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > create makes a home and records only its coordinate [162.99ms]
@bryance/orch test: 
@bryance/orch test: test\broker-ownership.test.ts:
@bryance/orch test: (pass) broker ownership and space governance > refuses cross-space writes unless explicitly overridden [132.59ms]
@bryance/orch test: (pass) broker ownership and space governance > moving an agent between spaces moves the wall, not its identity [104.33ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-replay.test.ts:
@bryance/orch test: (pass) orchd RPC replay buffer > replays from inside the surviving range without a gap [110.65ms]
@bryance/orch test: (pass) orchd RPC replay buffer > reports a gap when the requested sequence predates retained history [111.17ms]
@bryance/orch test: (pass) orchd RPC replay buffer > empty history has no gap or oldest sequence [101.00ms]
@bryance/orch test: (pass) orchd RPC replay buffer > limits replay size without pruning durable events [202.21ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > list reports that a space has a home without naming the coordinate [117.53ms]
@bryance/orch test: 
@bryance/orch test: test\close-gone-agent.test.ts:
@bryance/orch test: (pass) agent-closed on an agent that is already gone > a key the store never held is a no-op success [9.30ms]
@bryance/orch test: 
@bryance/orch test: test\build-bin.test.ts:
@bryance/orch test: (pass) build entrypoint > always stamps a node shebang and executable mode [7.55ms]
@bryance/orch test: (pass) the installed CLI is the packaged build, never live source (K2) > the `orch` bin points at the packaged entrypoint, not bin/orch.ts [0.06ms]
@bryance/orch test: (pass) the installed CLI is the packaged build, never live source (K2) > the packaged entrypoint is built for node, from the source entrypoint [0.04ms]
@bryance/orch test: (pass) the installed CLI is the packaged build, never live source (K2) > a global install cannot happen without a build in front of it [0.04ms]
@bryance/orch test: (pass) the installed CLI is the packaged build, never live source (K2) > the package ships dist/, so what is installed is what was built [0.01ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > rename renames orch's space and its home [127.74ms]
@bryance/orch test: 
@bryance/orch test: test\peer-identity.test.ts:
@bryance/orch test: (pass) spawner identity > an unregistered Claude Code session is labelled by its harness, with no id [94.74ms]
@bryance/orch test: (pass) spawner identity > a session orch has registered IS addressable, by the id orch minted [135.99ms]
@bryance/orch test: (pass) spawner identity > an unregistered session has no id to hand out, and does not invent one [1.57ms]
@bryance/orch test: (pass) spawner identity > an orch-spawned orchestrator acts as the id orch minted for it [177.81ms]
@bryance/orch test: (pass) spawner identity > agentIdentityEnv stamps a reply address only when the spawner has one [0.58ms]
@bryance/orch test: (pass) spawner identity > worktreeEnv stamps worktree identity only for isolated agents [0.44ms]
@bryance/orch test: (pass) spawner identity > the registry keeps the exact spawning session distinct from the lease holder [127.68ms]
@bryance/orch test: (pass) the spawner address invariant > an UNREGISTERED session stamps no address, so no worker is handed an unreachable one [1.71ms]
@bryance/orch test: (pass) the spawner address invariant > a bare operator stamps no address [160.87ms]
@bryance/orch test: (pass) the spawner address invariant > an address that IS stamped resolves to a live status record [4045.91ms]
@bryance/orch test: (pass) peer identity in messaging > peer summaries render an unplaced agent without a local place name [129.20ms]
@bryance/orch test: (pass) peer identity in messaging > orch_send reports the peer's NAME and calls the message RPC [128.02ms]
@bryance/orch test: (pass) peer identity in messaging > orch_send reports queued when the message is not acknowledged [139.00ms]
@bryance/orch test: (pass) peer identity in messaging > orch_send reports when the daemon is unreachable [138.84ms]
@bryance/orch test: (pass) peer identity in messaging > peers resolve by display name exactly like by key [102.12ms]
@bryance/orch test: (pass) peer identity in messaging > "spawner" reaches the stamped spawner session across fleet scoping [86.04ms]
@bryance/orch test: (pass) peer identity in messaging > a spawner with no live status record is refused BY NAME, not with a bare key [95.87ms]
@bryance/orch test: 
@bryance/orch test: test\close-gone-agent.test.ts:
@bryance/orch test: (pass) agent-closed on an agent that is already gone > a second close of an ended agent changes nothing [102.08ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > delete closes the home and drops its coordinate [99.26ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: (pass) fleet ownership scoping > spawn stamps the caller's registered id as the holder on its record [3523.51ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-subscribe.test.ts:
@bryance/orch test: (pass) orchd event subscription > replays only events missed between subscriptions [170.65ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > focus focuses the recorded coordinate [182.90ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-transport-parity.test.ts:
@bryance/orch test: (pass) both transports carry one mechanism > a bound TCP port does not displace the unix socket or become its own service [52.43ms]
@bryance/orch test: 
@bryance/orch test: test\reload-no-bundle-write.test.ts:
@bryance/orch test: {"results":[],"ok":0,"total":0,"hard":false,"signaled":"reload.signal"}
@bryance/orch test: (pass) reload > does not write installed extension bundles [3449.05ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: (pass) fleet ownership scoping > close --all works from an unregistered shell [155.06ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-transport-parity.test.ts:
@bryance/orch test: (pass) both transports carry one mechanism > the credential is demanded identically on both [48.22ms]
@bryance/orch test: (pass) both transports carry one mechanism > a missing credential is refused identically on both [31.99ms]
@bryance/orch test: 
@bryance/orch test: test\close-is-keyed-by-agent-id.test.ts:
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > an agent whose pane is gone is never handed to the plexer as a pane [3672.54ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-transport.test.ts:
@bryance/orch test: (pass) orchd RPC transports > round-trips over the default unix transport [24.78ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > a home made in another plexer is not this environment's to focus [116.19ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-transport.test.ts:
@bryance/orch test: (pass) orchd RPC transports > round-trips over the TCP fallback transport [33.20ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: {"closed":["caller","klmine0001","klforeign1","other"],"results":[{"target":"caller","handle":null,"outcome":"done","error":null},{"target":"klmine0001","handle":"mine","outcome":"done","error":null},{"target":"klforeign1","handle":"foreign","outcome":"done","error":null},{"target":"other","handle":null,"outcome":"done","error":null}],"requested":4,"ok":4,"stream":false}
@bryance/orch test: (pass) fleet ownership scoping > close --all closes all managed records regardless of owner [156.81ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-names.test.ts:
@bryance/orch test: (pass) agent name validation > rejects names outside herdr's naming rule [1.65ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö absence is an answer > focus with no space-home role names the space and what is missing [100.29ms]
@bryance/orch test: 
@bryance/orch test: test\lifecycle-reports-a-partial-run.test.ts:
@bryance/orch test: (pass) a partial reload or restart is reported, not exited > reload --json writes the whole payload and sets exitCode, never exits [3595.41ms]
@bryance/orch test: 
@bryance/orch test: test\close-is-keyed-by-agent-id.test.ts:
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > an agent whose pane is gone still ends, and reports done [206.09ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö absence is an answer > the plain-text answer names the space too [137.56ms]
@bryance/orch test: 
@bryance/orch test: test\lifecycle-reports-a-partial-run.test.ts:
@bryance/orch test: (pass) a partial reload or restart is reported, not exited > restart --json writes the whole payload and sets exitCode, never exits [164.18ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö vocabulary and wiring > cmdSpace lists through the resolved environment [97.59ms]
@bryance/orch test: 
@bryance/orch test: test\commands-results.test.ts:
@bryance/orch test: (pass) commands/results > surfaces a missing daemon instead of returning an empty list [5026.55ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö vocabulary and wiring > orch ws is gone [1.56ms]
@bryance/orch test: (pass) orch space ΓÇö vocabulary and wiring > space help never says workspace and offers create/rename/delete [3.09ms]
@bryance/orch test: 
@bryance/orch test: test\close-is-keyed-by-agent-id.test.ts:
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > what a human is told they closed is the agent, not the plexer's coordinate [182.18ms]
@bryance/orch test: 
@bryance/orch test: test\lifecycle-targets.test.ts:
@bryance/orch test: (pass) lifecycle target resolution > prefers one live agent over dead ones sharing its name [0.26ms]
@bryance/orch test: (pass) lifecycle target resolution > reports the target and disambiguating ids for live ambiguity [0.30ms]
@bryance/orch test: (pass) lifecycle target resolution > cleanup can still resolve a dead agent when no live match exists [0.04ms]
@bryance/orch test: (pass) lifecycle target resolution > an agent is addressable by its id, its name, or its pane handle [0.04ms]
@bryance/orch test: (pass) lifecycle target resolution > the pane is environment: moving it leaves every other address intact [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc-identity.test.ts:
@bryance/orch test: (pass) daemon identity RPCs > register-session mints one id per session token [6707.94ms]
@bryance/orch test: (pass) daemon identity RPCs > the removed method is unknown [0.28ms]
@bryance/orch test: 
@bryance/orch test: test\remote-fanout.test.ts:
@bryance/orch test: (pass) async remote fan-out > parses valid JSON from a host [438.88ms]
@bryance/orch test: 
@bryance/orch test: test\backend-process-role.test.ts:
@bryance/orch test: (pass) ProcessRole > headless provider records pid and start token and safely kills it [3477.54ms]
@bryance/orch test: 
@bryance/orch test: test\commands-results.test.ts:
@bryance/orch test: (pass) commands/results > formats invalid and recent timestamps [1.56ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö vocabulary and wiring > no space output ever says workspace [153.65ms]
@bryance/orch test: 
@bryance/orch test: test\commands-results.test.ts:
@bryance/orch test: (pass) commands/results > routes a seeded results.jsonl through the command module [162.24ms]
@bryance/orch test: 
@bryance/orch test: test\log-level.test.ts:
@bryance/orch test: (pass) the configured log level reaches every logger > the env var wins over settings.json [33.05ms]
@bryance/orch test: 
@bryance/orch test: test\store-interval-rows.test.ts:
@bryance/orch test: (pass) interval satellites > half-open adjacency is legal [160.05ms]
@bryance/orch test: (pass) interval satellites > clearSpace closes without opening [154.83ms]
@bryance/orch test: (pass) interval satellites > agent plexer is immutable one-shot [173.06ms]
@bryance/orch test: (pass) interval satellites > process restart history closes at the successor since [148.53ms]
@bryance/orch test: (pass) interval satellites > process rows carry host and process identity [128.49ms]
@bryance/orch test: (pass) interval satellites > process start_token round-trips [118.70ms]
@bryance/orch test: (pass) interval satellites > space move history closes at the successor since [107.96ms]
@bryance/orch test: (pass) interval satellites > tuning change history closes at the successor since [184.88ms]
@bryance/orch test: (pass) interval satellites > handle history preserves each renumbered handle [106.05ms]
@bryance/orch test: (pass) interval satellites > interval instants are stored as INTEGER values [114.14ms]
@bryance/orch test: (pass) interval satellites > process wrapper rolls back predecessor close when successor fails [133.60ms]
@bryance/orch test: (pass) interval satellites > space wrapper rolls back predecessor close when successor fails [142.14ms]
@bryance/orch test: (pass) interval satellites > tuning carries model and nullable thinking [141.72ms]
@bryance/orch test: 
@bryance/orch test: test\log-level.test.ts:
@bryance/orch test: (pass) the configured log level reaches every logger > settings.json is used when the env var is unset [4.85ms]
@bryance/orch test: (pass) the configured log level reaches every logger > an unrecognised env value falls back to the configured level [8.21ms]
@bryance/orch test: (pass) the configured log level reaches every logger > the CLI logger honours the configured level [17.03ms]
@bryance/orch test: (pass) the configured log level reaches every logger > the CLI logger drops records below the configured level [2.77ms]
@bryance/orch test: (pass) the configured log level reaches every logger > the daemon logger resolves through the same helper [25.85ms]
@bryance/orch test: (pass) the configured log level reaches every logger > setLevel updates existing children [14.99ms]
@bryance/orch test: 
@bryance/orch test: test\close-is-keyed-by-agent-id.test.ts:
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > the --json closed list names agents, so a caller can map it back [219.25ms]
@bryance/orch test: 
@bryance/orch test: test\commands-results.test.ts:
@bryance/orch test: (pass) commands/results > keeps every settled dispatch and reports the newest [118.91ms]
@bryance/orch test: 
@bryance/orch test: test\status-filter-columns.test.ts:
@bryance/orch test: (pass) orch status --filter on columns > drops the named columns from the default table [1.24ms]
@bryance/orch test: (pass) orch status --filter on columns > a filtered owner column leaves no shared-owner footer [0.18ms]
@bryance/orch test: (pass) orch status --filter on columns > drops the named columns from the human table [0.12ms]
@bryance/orch test: (pass) orch status --filter on columns > drops the same facts from a JSON row [0.11ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc.test.ts:
@bryance/orch test: (pass) daemon RPC > rejects a hello response with a malformed optional field [6.00ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: (pass) fleet ownership scoping > driving verbs remain gated against a live foreign holder [611.77ms]
@bryance/orch test: 
@bryance/orch test: test\status-headless.test.ts:
@bryance/orch test: (pass) headless status visibility > drops an exited agent that finished, however much it recorded [0.27ms]
@bryance/orch test: (pass) headless status visibility > --filter removes the states it names; --agent brings one dead agent back [0.09ms]
@bryance/orch test: (pass) headless status visibility > --filter drops live rows in the states it names [0.04ms]
@bryance/orch test: (pass) headless status visibility > drops a dead row with no result or terminal state [0.02ms]
@bryance/orch test: (pass) headless status visibility > keeps a live row [0.02ms]
@bryance/orch test: (pass) headless status visibility > --space-wide widens the scope without resurrecting empty dead rows [0.02ms]
@bryance/orch test: (pass) headless status visibility > uses agent language without backend details when no backend was asked [0.06ms]
@bryance/orch test: 
@bryance/orch test: test\commands-spawn.test.ts:
@bryance/orch test: (pass) commands/spawn > refuses an invalid name before resolving or creating a workspace [34.76ms]
@bryance/orch test: 
@bryance/orch test: test\close-is-keyed-by-agent-id.test.ts:
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > the plexer is still handed the real handle when there IS a pane [169.66ms]
@bryance/orch test: 
@bryance/orch test: test\commands-results.test.ts:
@bryance/orch test: (pass) commands/results > falls back to adapter session text when results.jsonl is absent [140.58ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-names.test.ts:
@bryance/orch test: (pass) agent name validation > accepts lowercase names with hyphens and underscores [0.12ms]
@bryance/orch test: (pass) a live name is claimed and a dead one is released > a live agent holds its name against a second spawn [124.57ms]
@bryance/orch test: (pass) a live name is claimed and a dead one is released > a dead agent frees its name [202.94ms]
@bryance/orch test: (pass) a live name is claimed and a dead one is released > another space's agent never blocks a name here [134.09ms]
@bryance/orch test: (pass) name scope follows the agent's current space, not its birthplace > moving an agent moves the name it holds [103.92ms]
@bryance/orch test: (pass) name scope follows the agent's current space, not its birthplace > the collision names the agent by its minted id [112.19ms]
@bryance/orch test: 
@bryance/orch test: test\store-lease-rows.test.ts:
@bryance/orch test: (pass) agent lease rows > fencing ids are monotonic across agents and never reused after reap [141.53ms]
@bryance/orch test: 
@bryance/orch test: test\backend-herdr.test.ts:
@bryance/orch test: (pass) HerdrBackend > current identity uses the explicit id, not the launch environment [4.35ms]
@bryance/orch test: 
@bryance/orch test: test\commands-spawn.test.ts:
@bryance/orch test: (pass) commands/spawn > refuses spawn without a name before any spawn mutations [139.51ms]
@bryance/orch test: 
@bryance/orch test: test\commands-results.test.ts:
@bryance/orch test: (pass) commands/results > uses results.jsonl even when the presence status has no agent [111.06ms]
@bryance/orch test: 
@bryance/orch test: test\commands-spawn.test.ts:
@bryance/orch test: (pass) commands/spawn > rejects removed spawn cap flag as unknown [0.32ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: (pass) fleet ownership scoping > result refuses a foreign-owned agent and names its owner [173.08ms]
@bryance/orch test: 
@bryance/orch test: test\commands-spawn.test.ts:
@bryance/orch test: (pass) commands/spawn > rejects --detached as an unknown spawn flag [21.78ms]
@bryance/orch test: 
@bryance/orch test: test\remote-fanout.test.ts:
@bryance/orch test: (pass) async remote fan-out > returns a typed dead-host failure [514.63ms]
@bryance/orch test: 
@bryance/orch test: test\commands-spawn.test.ts:
@bryance/orch test: (pass) commands/spawn > the positionals are the agent names [0.27ms]
@bryance/orch test: (pass) commands/spawn > collects repeated prompts in agent order [0.18ms]
@bryance/orch test: (pass) commands/spawn > collects repeated files and models in order [0.09ms]
@bryance/orch test: (pass) commands/spawn > collects repeated models in order [0.06ms]
@bryance/orch test: (pass) commands/spawn > resolves one prompt file per agent [19.58ms]
@bryance/orch test: (pass) commands/spawn > reuses one prompt file for every agent [14.12ms]
@bryance/orch test: (pass) commands/spawn > --with hands a bare path to every agent and <name>=<path> to that agent only [4.26ms]
@bryance/orch test: (pass) commands/spawn > --with treats a prefix that names no agent as part of the path [2.51ms]
@bryance/orch test: (pass) commands/spawn > refuses an incorrect number of prompt files [1.84ms]
@bryance/orch test: (pass) commands/spawn > refuses stdin prompt files more than once [1.63ms]
@bryance/orch test: (pass) commands/spawn > resolves one model per agent [1.56ms]
@bryance/orch test: (pass) commands/spawn > refuses an incorrect number of models [1.55ms]
@bryance/orch test: (pass) commands/spawn > each pi flavor launches its own binary and preserves raw prompt [0.32ms]
@bryance/orch test: 
@bryance/orch test: test\commands-results.test.ts:
@bryance/orch test: (pass) commands/results > renders several target results under headers [135.00ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: (pass) fleet ownership scoping > pane mutations refuse a foreign-owned agent and name its owner [150.39ms]
@bryance/orch test: 
@bryance/orch test: test\routing-hardening.test.ts:
@bryance/orch test: (pass) store hardening > a fresh store creates the full current schema with WAL enabled [142.29ms]
@bryance/orch test: (pass) store hardening > the store refuses a second open holding, so ownership cannot fork [105.02ms]
@bryance/orch test: (pass) store hardening > adoption closes the prior holding in the same step that opens the new one [100.00ms]
@bryance/orch test: (pass) store hardening > the attempt insert claim is exactly once [75.72ms]
@bryance/orch test: (pass) CLI offline routing > status --offline does not start or contact orchd [3481.59ms]
@bryance/orch test: 
@bryance/orch test: test\commands-results.test.ts:
@bryance/orch test: (pass) commands/results > renders several target results as a JSON array [174.48ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: orch is not running inside herdr and no backend was chosen - spawning headless. Pass --backend herdr or set defaults.backend to open a herdr home for these agents (the user grants it), or --space <id> to place them in an open space.
@bryance/orch test: (pass) outside every plexer, spawn is headless unless the human chose one > a plexer orch only probed, from a plain terminal, spawns headless [46.41ms]
@bryance/orch test: (pass) outside every plexer, spawn is headless unless the human chose one > a chosen plexer stays selected and its home is what the human grants [12.94ms]
@bryance/orch test: orch is not running inside herdr and herdr cannot open a space of its own - spawning headless. Pass --backend herdr or set defaults.backend to open a herdr home for these agents (the user grants it), or --space <id> to place them in an open space.
@bryance/orch test: (pass) outside every plexer, spawn is headless unless the human chose one > a chosen plexer that cannot open a home still falls back to headless [11.78ms]
@bryance/orch test: (pass) outside every plexer, spawn is headless unless the human chose one > a caller recorded inside the plexer stays in it, chosen or not [10.62ms]
@bryance/orch test: 
@bryance/orch test: test\commands-status.test.ts:
@bryance/orch test: (pass) commands/status > reads fleet rows from the served daemon [131.89ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) outside every plexer, spawn is headless unless the human chose one > a named space is placement enough: no chosen backend needed [33.10ms]
@bryance/orch test: 
@bryance/orch test: test\commands-results.test.ts:
@bryance/orch test: (pass) commands/results > continues after a missing target and sets exit code [119.69ms]
@bryance/orch test: (pass) commands/results > orch tail resolves a non-pi target through that adapter's session view [92.09ms]
@bryance/orch test: 
@bryance/orch test: test\events-open-with-pending-questions.test.ts:
@bryance/orch test: (pass) events pending-question snapshot > a late watcher receives every open question through the event writer [3741.66ms]
@bryance/orch test: 
@bryance/orch test: test\commands-results.test.ts:
@bryance/orch test: (pass) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [96.17ms]
@bryance/orch test: 
@bryance/orch test: test\commands-models.test.ts:
@bryance/orch test: (pass) orch models lists the whole catalogue > shows every offered model, quicklisted or not, allowed or not [0.79ms]
@bryance/orch test: (pass) orch models lists the whole catalogue > marks the launch default (thinking suffix removed) and the quicklist members [0.13ms]
@bryance/orch test: (pass) orch models lists the whole catalogue > keeps harness sections in configured order [0.05ms]
@bryance/orch test: (pass) orch models lists the whole catalogue > a harness that enumerates nothing gets an empty section, not another's models [0.10ms]
@bryance/orch test: (pass) orch models filters > --preferred narrows to the quicklist and renumbers what is shown [0.07ms]
@bryance/orch test: (pass) orch models filters > --search matches spec and label case-insensitively [0.08ms]
@bryance/orch test: (pass) orch models filters > filters combine, and no match is an empty result rather than the full list [0.03ms]
@bryance/orch test: (pass) orch models --pick prints one spec > a numeric pick reads the displayed index of a single harness [0.12ms]
@bryance/orch test: (pass) orch models --pick prints one spec > an exact spec pick resolves after filtering [0.09ms]
@bryance/orch test: (pass) orch models --pick prints one spec > ambiguous, missing, zero, and out-of-range picks fail [0.59ms]
@bryance/orch test: (pass) orch models --json > emits the pinned harness/model shape [0.11ms]
@bryance/orch test: 
@bryance/orch test: test\remote-fanout.test.ts:
@bryance/orch test: (pass) async remote fan-out > returns a typed timeout failure [568.06ms]
@bryance/orch test: 
@bryance/orch test: test\commands-results.test.ts:
@bryance/orch test: (pass) commands/results > orch tail -n keeps last-N rendered entries for a pi session [85.01ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-lifecycle.test.ts:
@bryance/orch test: (pass) daemon lifecycle > acquires once and refuses a second live owner [3455.39ms]
@bryance/orch test: 
@bryance/orch test: test\commands-results.test.ts:
@bryance/orch test: (pass) commands/results > orch session reports the pi entry count [103.08ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-lifecycle.test.ts:
@bryance/orch test: (pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [11.28ms]
@bryance/orch test: (pass) daemon lifecycle > reclaims an unreadable lock, which a crash truncated and no daemon owns [25.09ms]
@bryance/orch test: (pass) daemon lifecycle > refuses an unreadable lock while the socket still answers [5.08ms]
@bryance/orch test: (pass) daemon lifecycle > clears the lock, socket and port a departed daemon owned, keeping the log [4.44ms]
@bryance/orch test: (pass) daemon lifecycle > refuses a stale lock when the socket probe cannot answer [13.39ms]
@bryance/orch test: (pass) daemon lifecycle > retries if a stale lock disappears during reclaim [11.15ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-no-peer-credentials.test.ts:
@bryance/orch test: (pass) the daemon asks for a token and nothing else > a caller the daemon has no relationship to is accepted on the token alone [3829.08ms]
@bryance/orch test: (pass) the daemon asks for a token and nothing else > that same stranger without the token is refused, so the token is what decided [36.12ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-policy.test.ts:
@bryance/orch test: (pass) spawn policy caps > a refused cmdSpawn makes no name, registry, or queue mutation [7020.54ms]
@bryance/orch test: 
@bryance/orch test: test\commands-panes.test.ts:
@bryance/orch test: (pass) commands/panes > pane identity is the minted id alone [0.11ms]
@bryance/orch test: (pass) commands/panes > a plexer-and-space key is not an identity [0.02ms]
@bryance/orch test: (pass) commands/panes > exports the pane listing command directly [0.04ms]
@bryance/orch test: 
@bryance/orch test: test\store-lease-rows.test.ts:
@bryance/orch test: (pass) agent lease rows > a second open lease is rejected [110.75ms]
@bryance/orch test: (pass) agent lease rows > release and expiry close rows with matching reason and exact until [90.37ms]
@bryance/orch test: (pass) agent lease rows > handoff closes current and inserts a newer row without changing prior facts [105.09ms]
@bryance/orch test: (pass) agent lease rows > adoption closes prior and inserts a strictly newer adopter row [89.24ms]
@bryance/orch test: (pass) agent lease rows > adoption with no open lease is plain acquire and leaves closed history untouched [99.86ms]
@bryance/orch test: (pass) agent lease rows > handoff rolls back close when successor insert fails [101.49ms]
@bryance/orch test: (pass) agent lease rows > wrong-holder release and handoff are rejected [80.95ms]
@bryance/orch test: (pass) agent lease rows > an agent cannot lease itself [73.37ms]
@bryance/orch test: (pass) agent lease rows > expiry inserts nothing new [110.10ms]
@bryance/orch test: (pass) agent lease rows > reads return only open rows [117.02ms]
@bryance/orch test: 
@bryance/orch test: test\commands-results.test.ts:
@bryance/orch test: (pass) commands/results > orch session shows zero entries for an adapter view without them [122.06ms]
@bryance/orch test: 
@bryance/orch test: test\remote-fanout.test.ts:
@bryance/orch test: (pass) async remote fan-out > returns a typed non-JSON failure [444.07ms]
@bryance/orch test: 
@bryance/orch test: test\peer-tools-registration.test.ts:
@bryance/orch test: (pass) peer tool registration > does not register orch_send when no spawner address exists [10.27ms]
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
@bryance/orch test: (pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [547.67ms]
@bryance/orch test: 
@bryance/orch test: test\peer-tools-registration.test.ts:
@bryance/orch test: (pass) peer tool registration > does not register orch_send when the spawner pid is dead [180.86ms]
@bryance/orch test: (pass) peer tool registration > registers orch_send when the spawner has a live status record [136.71ms]
@bryance/orch test: 
@bryance/orch test: test\commands-review.test.ts:
@bryance/orch test: (pass) commands/review > lists an empty fleet [172.44ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-lifecycle.test.ts:
@bryance/orch test: (pass) daemon lifecycle > reexecs with the current argv and hands over the lock [22.06ms]
@bryance/orch test: (pass) daemon lifecycle > rejects a recycled pid identity [33.77ms]
@bryance/orch test: (pass) daemon lifecycle > foreign machine registration cannot be signalled for another store [24.29ms]
@bryance/orch test: (pass) daemon lifecycle > only a provable lock owner may be signalled [45.36ms]
@bryance/orch test: (pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [10.27ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lifecycle.test.ts:
@bryance/orch test: (pass) commands/lifecycle > --all targets the agents this orch holds a live lease on, and drops them when it releases [3924.59ms]
@bryance/orch test: 
@bryance/orch test: test\backend-herdr-predicates.test.ts:
@bryance/orch test: (pass) herdr environment predicates > neither variable set [0.38ms]
@bryance/orch test: (pass) herdr environment predicates > HERDR_ENV=1 only [0.29ms]
@bryance/orch test: (pass) herdr environment predicates > HERDR_PANE_ID only [0.10ms]
@bryance/orch test: (pass) herdr environment predicates > both variables set [0.07ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-name-list.test.ts:
@bryance/orch test: (pass) spawn names every agent positionally, at creation > the positional arguments are the names, one per pane [0.83ms]
@bryance/orch test: 
@bryance/orch test: test\codex-adapter.test.ts:
@bryance/orch test: (pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [13.01ms]
@bryance/orch test: 
@bryance/orch test: test\commands-logging.test.ts:
@bryance/orch test: (pass) orch logs > --dispatch selects one dispatch across both sinks, oldest first [26.23ms]
@bryance/orch test: 
@bryance/orch test: test\codex-adapter.test.ts:
@bryance/orch test: (pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [2.27ms]
@bryance/orch test: (pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [2.08ms]
@bryance/orch test: (pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [5.78ms]
@bryance/orch test: (pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [4.28ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-name-list.test.ts:
@bryance/orch test: (pass) spawn names every agent positionally, at creation > the pane count is how many names were given [0.16ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > spawning with no name at all is refused [0.23ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > a bare count is not a name and is refused [6.75ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > the same name twice would collide, so it is refused before anything is created [0.37ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > every name is validated, so one bad name creates nothing [0.11ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > --name is gone: naming is positional, so the flag is an unknown flag [0.83ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > claimSpawnNames takes the resolved names and asserts each is free [79.15ms]
@bryance/orch test: 
@bryance/orch test: test\backend-herdr.test.ts:
@bryance/orch test: (pass) HerdrBackend > composes a complete group role bundle [0.12ms]
@bryance/orch test: (pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [6.91ms]
@bryance/orch test: (pass) HerdrBackend > starts the mapped herdr harness kind in the pane it created [0.65ms]
@bryance/orch test: (pass) HerdrBackend > agent_not_ready keeps the pane and does not close it [1.69ms]
@bryance/orch test: (pass) HerdrBackend > a caller pane is split rather than given a new tab [2.20ms]
@bryance/orch test: (pass) HerdrBackend > pane and tab creation always preserves focus [0.25ms]
@bryance/orch test: (pass) HerdrBackend > split direction clamps to herdr's right|down [0.13ms]
@bryance/orch test: (pass) HerdrBackend > env reaches the pane through herdr's --env, not an argv prefix [0.30ms]
@bryance/orch test: (pass) HerdrBackend > a handed-over pane is launched into directly, never split or closed [0.37ms]
@bryance/orch test: (pass) HerdrBackend > a group is created with the environment its own pane will launch under [5.34ms]
@bryance/orch test: (pass) HerdrBackend > a group with no coordinate is refused, not placed wherever herdr is focused [0.14ms]
@bryance/orch test: (pass) HerdrBackend > a pane with no coordinate is refused the same way [0.20ms]
@bryance/orch test: (pass) HerdrBackend > the inventory answers which workspace holds a pane, and null for one herdr no longer lists [1.09ms]
@bryance/orch test: (pass) HerdrBackend > the pane host closes a pane through herdr [0.37ms]
@bryance/orch test: (pass) HerdrBackend > a planned target pane is split directly, never re-seated afterwards [0.43ms]
@bryance/orch test: (pass) HerdrBackend > a grouped spawn with no planned target splits a pane already in that tab, never the caller's pane [0.60ms]
@bryance/orch test: (pass) HerdrBackend > a same-tab re-seat bounces through a throwaway tab so herdr executes it [1.37ms]
@bryance/orch test: (pass) HerdrBackend > adopts herdr's replacement pane id after move [0.28ms]
@bryance/orch test: (pass) HerdrBackend > refuses a live herdr agent name before start [0.31ms]
@bryance/orch test: (pass) HerdrBackend > reads recent unwrapped pane output [0.19ms]
@bryance/orch test: (pass) HerdrBackend > a refused move surfaces herdr's reason instead of claiming success [0.08ms]
@bryance/orch test: (pass) HerdrBackend > groupLayout reads tab geometry straight off the pane listing [0.24ms]
@bryance/orch test: (pass) HerdrBackend > pane input reports gone handles without retrying and retries plain failures [1789.42ms]
@bryance/orch test: (pass) HerdrBackend > pane rename failure reaches the role caller [0.16ms]
@bryance/orch test: (pass) HerdrBackend > waiting uses agent wait --until, not the removed top-level wait [0.31ms]
@bryance/orch test: (pass) HerdrBackend space home > opens an orch-marked workspace for a pack the caller did not label [3.05ms]
@bryance/orch test: (pass) HerdrBackend space home > a space home the human named keeps that name [0.43ms]
@bryance/orch test: (pass) HerdrBackend space home > create hands back the plexer coordinate, the root tab and the root pane, and says none of them [0.11ms]
@bryance/orch test: 
@bryance/orch test: test\remote-fanout.test.ts:
@bryance/orch test: (pass) async remote fan-out > fans out and keeps per-host failures without throwing [789.06ms]
@bryance/orch test: 
@bryance/orch test: test\commands-logging.test.ts:
@bryance/orch test: (pass) orch logs > --agent selects one agent's records [8.34ms]
@bryance/orch test: (pass) orch logs > --level selects one severity [6.42ms]
@bryance/orch test: (pass) orch logs > --since drops everything older than the instant given [6.68ms]
@bryance/orch test: (pass) orch logs > --since 0 keeps every record instead of being read as a missing value [21.76ms]
@bryance/orch test: (pass) orch logs > --since takes an age counted back from now [0.56ms]
@bryance/orch test: (pass) orch logs > --since names the accepted forms when the value fits none [0.21ms]
@bryance/orch test: (pass) orch logs > renders a readable line: instant, level, event, correlation, agent, fields [6.55ms]
@bryance/orch test: (pass) orch logs > --json emits the records themselves [22.58ms]
@bryance/orch test: (pass) command logging > notify test records the diagnosis and keeps user output on stdout [18.29ms]
@bryance/orch test: 
@bryance/orch test: test\remote.test.ts:
@bryance/orch test: (pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.17ms]
@bryance/orch test: (pass) host-prefixed targets > reports unknown host and configured names [0.09ms]
@bryance/orch test: 
@bryance/orch test: test\backend-orca-cli.test.ts:
@bryance/orch test: (pass) Orca CLI > terminals lists rows with JSON [0.88ms]
@bryance/orch test: (pass) Orca CLI > terminals passes a worktree selector [0.21ms]
@bryance/orch test: (pass) Orca CLI > ack surfaces gone handle error codes [4.30ms]
@bryance/orch test: (pass) Orca CLI > json rejects a wrong result shape with a null code [14.60ms]
@bryance/orch test: (pass) Orca CLI > serverStatus reads the app version [0.20ms]
@bryance/orch test: (pass) Orca CLI > serverStatus reports a down server when the status command cannot connect [0.24ms]
@bryance/orch test: (pass) Orca CLI > uses the Orca IDE binary on Linux [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\settings-command.test.ts:
@bryance/orch test: (pass) orch settings > every registered setting is printed in the table [19.02ms]
@bryance/orch test: (pass) orch settings > --json reports value + source per setting, settings.json winning over defaults [12.30ms]
@bryance/orch test: (pass) orch settings > --json reports env as the winning source over settings.json [11.74ms]
@bryance/orch test: (pass) orch settings > --harness switches defaults.adapter between enabled ids and rejects a non-enabled id [36.31ms]
@bryance/orch test: (pass) orch settings > reports each harness's picker quicklist and launch gate as separate rows [14.34ms]
@bryance/orch test: (pass) orch settings > a load error surfaces loudly with no partial table [4.10ms]
@bryance/orch test: (pass) orch settings > sets a boolean through its registry entry [3721.03ms]
@bryance/orch test: (pass) orch settings > sets an integer through its registry entry [66.44ms]
@bryance/orch test: (pass) orch settings > single-setting set delegates to the registry writer [65.62ms]
@bryance/orch test: (pass) orch settings > sets a choice through its registry entry [55.07ms]
@bryance/orch test: (pass) orch settings > sets a multi value through its registry entry [53.07ms]
@bryance/orch test: (pass) orch settings > sets a list value through its registry entry [98.27ms]
@bryance/orch test: (pass) orch settings > refuses an invalid boolean and names the allowed values [92.95ms]
@bryance/orch test: (pass) orch settings > refuses an invalid integer and names the allowed range [64.42ms]
@bryance/orch test: (pass) orch settings > refuses an invalid choice and names the allowed choices [92.45ms]
@bryance/orch test: (pass) orch settings > refuses an invalid multi value and names the allowed choices [95.51ms]
@bryance/orch test: (pass) orch settings > refuses an invalid list and names JSON as the allowed format [58.62ms]
@bryance/orch test: (pass) orch settings > refuses an unknown key and suggests nearest valid keys [45.15ms]
@bryance/orch test: (pass) orch settings > refuses read-only runtime and names the editing subcommand [7.41ms]
@bryance/orch test: (pass) orch settings from an agent > the human sets any writable key [69.23ms]
@bryance/orch test: (pass) orch settings from an agent > an agent sets a granted key [12.60ms]
@bryance/orch test: (pass) orch settings from an agent > an agent is refused an ungranted key and told what it may set [7.08ms]
@bryance/orch test: (pass) orch settings from an agent > an agent never widens its own grant [23.18ms]
@bryance/orch test: (pass) orch settings from an agent > the human grants a key and the agent then sets it [64.94ms]
@bryance/orch test: (pass) orch settings from an agent > the human revokes a key and the agent is refused it [92.89ms]
@bryance/orch test: (pass) orch settings from an agent > grant is idempotent and refuses an unknown, read-only, or self key [60.27ms]
@bryance/orch test: (pass) orch settings from an agent > an agent never grants or revokes [6.98ms]
@bryance/orch test: (pass) orch settings from an agent > the table and --json say which rows an agent may write [17.93ms]
@bryance/orch test: 
@bryance/orch test: test\backend-space-home.test.ts:
@bryance/orch test: (pass) tmux space home > focus switches the client to the session holding the space [87.63ms]
@bryance/orch test: (pass) tmux space home > create names the session after the space and returns its root window and pane [0.54ms]
@bryance/orch test: (pass) tmux space home > rename and close address the session coordinate [0.09ms]
@bryance/orch test: (pass) tmux space home > list reports every session as a coordinate with a label [0.17ms]
@bryance/orch test: (pass) a home orch opens is never unmarked (E8) > an unlabelled pack home is named for the pack it was opened for [0.11ms]
@bryance/orch test: (pass) a home orch opens is never unmarked (E8) > an unlabelled space home is named for the space, not for the pack [0.04ms]
@bryance/orch test: (pass) a home orch opens is never unmarked (E8) > a subject id the plexer would refuse is made safe, never passed through [0.08ms]
@bryance/orch test: (pass) a home orch opens is never unmarked (E8) > a caller-supplied label is used verbatim [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\commands-target.test.ts:
@bryance/orch test: (pass) commands/target > reads only structured result text [0.16ms]
@bryance/orch test: (pass) commands/target > quotes remote args and ORCH_DIR safely [0.18ms]
@bryance/orch test: 
@bryance/orch test: test\commands-setup.test.ts:
@bryance/orch test: (pass) commands/setup > reads the setup flags in either spelling, with every --model kept in order [1.22ms]
@bryance/orch test: 
@bryance/orch test: test\dispatch-channel-first.test.ts:
@bryance/orch test: (pass) work reaches an agent through its link > a headless agent receives a dispatch through the link [135.15ms]
@bryance/orch test: 
@bryance/orch test: test\self-actor-identity.test.ts:
@bryance/orch test: (pass) a driving session's write-actor is the agent orch registered for it > the session token resolves to the id hello minted, so the actor equals its own lease holder [121.02ms]
@bryance/orch test: 
@bryance/orch test: test\dispatch-channel-first.test.ts:
@bryance/orch test: (pass) work reaches an agent through its link > a capless adapter still gets the not-placed boundary answer [119.43ms]
@bryance/orch test: 
@bryance/orch test: test\peer-lease-visibility.test.ts:
@bryance/orch test: (pass) peer summaries carry ownership as a lease > a peer the caller holds reports the caller as the live holder [3459.18ms]
@bryance/orch test: 
@bryance/orch test: test\self-actor-identity.test.ts:
@bryance/orch test: (pass) a driving session's write-actor is the agent orch registered for it > a token orch has never seen resolves to nothing rather than a fabricated id [46.73ms]
@bryance/orch test: (pass) a driving session's write-actor is the agent orch registered for it > one session keeps ONE id across calls, whatever pid the shell reports [128.24ms]
@bryance/orch test: 
@bryance/orch test: test\commands-setup.test.ts:
@bryance/orch test: Selection recorded in C:\Users\Bryan\AppData\Local\Temp\orch-setup-characterization-nFgvys\settings.json:
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
@bryance/orch test:   C:\Users\Bryan\AppData\Local\Temp\orch-setup-characterization-nFgvys\agents
@bryance/orch test: Skills:
@bryance/orch test:   not installed - turn it back on with: orch settings skills --install
@bryance/orch test: bins:
@bryance/orch test:   C:\Users\Bryan\AppData\Local\Temp\orch-setup-home-vZ3ox8\.local\bin\orch (copy)
@bryance/orch test:   C:\Users\Bryan\AppData\Local\Temp\orch-setup-home-vZ3ox8\.local\bin\pif (copy)
@bryance/orch test:   C:\Users\Bryan\AppData\Local\Temp\orch-setup-home-vZ3ox8\.local\bin\orch-ding (copy)
@bryance/orch test:   SKIP pi extensions: pi integration shim disabled
@bryance/orch test: Running doctor checks...
@bryance/orch test: Doctor: 31/35 checks passed
@bryance/orch test: Done. Open a plexer workspace and try: orch spawn 2 --tab Team1
@bryance/orch test: (pass) commands/setup > resolves noninteractive provider sets and defaults [0.52ms]
@bryance/orch test: (pass) commands/setup > runs non-interactive setup against the requested ORCH_DIR and records the selected composition [360.92ms]
@bryance/orch test: (pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.33ms]
@bryance/orch test: 
@bryance/orch test: test\commands-clean.test.ts:
@bryance/orch test: {"malformed":[],"closed":0,"removed":["deadagent1"],"worktrees":0}
@bryance/orch test: (pass) commands/clean > the forced sweep reaps dead agent dirs but preserves live processes [4198.41ms]
@bryance/orch test: 
@bryance/orch test: test\seat-index.test.ts:
@bryance/orch test: (pass) seat pure seams > errorMessage preserves non-Error thrown values [32.04ms]
@bryance/orch test: 
@bryance/orch test: test\peer-project-scope.test.ts:
@bryance/orch test: (pass) peer discovery walls on the project > a same-workspace peer from another project is invisible by default [283.86ms]
@bryance/orch test: 
@bryance/orch test: test\seat-index.test.ts:
@bryance/orch test: (pass) seat pure seams > hasTheme discriminates missing and valid themes [27.36ms]
@bryance/orch test: (pass) seat pure seams > countStates groups active, blocked, failed, and settled states [0.22ms]
@bryance/orch test: (pass) seat pure seams > formatSeatStatus renders state counts and view hint [0.18ms]
@bryance/orch test: (pass) seat pure seams > reconcileDashboardSelection preserves id and guards missing snapshots [46.28ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-registry.test.ts:
@bryance/orch test: (pass) spawn agent registration > writes the hub, environment, tuning, and lease [124.64ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-limits.test.ts:
@bryance/orch test: (pass) spawn limits > schema loads global and workspace caps [81.57ms]
@bryance/orch test: 
@bryance/orch test: test\commands-clean.test.ts:
@bryance/orch test: {"malformed":["herdr~wF~p9"],"closed":2,"removed":[],"worktrees":0}
@bryance/orch test: (pass) commands/clean > bare clean keeps ended agents as history and closes their queued writes [222.76ms]
@bryance/orch test: 
@bryance/orch test: test\codex-adapter.test.ts:
@bryance/orch test: (pass) CodexAdapter > notify shim reports done presence and result over orchd [997.81ms]
@bryance/orch test: 
@bryance/orch test: test\commands-self.test.ts:
@bryance/orch test: (pass) commands/self > reads the caller identity from the daemon [3884.31ms]
@bryance/orch test: (pass) commands/self > uses caller depth for worker spawn policy [0.49ms]
@bryance/orch test: (pass) commands/self > refuses non-operator overrides [0.34ms]
@bryance/orch test: 
@bryance/orch test: test\commands-clean.test.ts:
@bryance/orch test: {"malformed":[],"closed":1,"removed":["deadagent1"],"worktrees":0}
@bryance/orch test: (pass) commands/clean > --force reaps the ended agent and closes its queued writes [154.46ms]
@bryance/orch test: (pass) worktree ownership reads the composed environment > a live agent's worktree is protected and a dead one's is not [1.14ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-registry.test.ts:
@bryance/orch test: (pass) spawn agent registration > an agent that states no plexer and no handle gets neither row [120.73ms]
@bryance/orch test: (pass) spawn agent registration > worktree row is present only for a worktree launch [113.32ms]
@bryance/orch test: (pass) spawn agent registration > an unknown or absent spawner produces a root pack of one and no lease [116.44ms]
@bryance/orch test: 
@bryance/orch test: test\peer-lease-visibility.test.ts:
@bryance/orch test: (pass) peer summaries carry ownership as a lease > a peer nobody ever took reports no orch driving it [77.73ms]
@bryance/orch test: (pass) peer summaries carry ownership as a lease > a dead holder is not a live one [112.79ms]
@bryance/orch test: (pass) the compact listing separates orphans from live work > unleased peers sit in their own bucket, below the driven ones [106.10ms]
@bryance/orch test: (pass) the compact listing separates orphans from live work > a held peer names its holder, and an unleased one never reads as yours [156.89ms]
@bryance/orch test: (pass) the compact listing separates orphans from live work > with nothing unleased the bucket does not appear at all [137.05ms]
@bryance/orch test: 
@bryance/orch test: test\commands-clean.test.ts:
@bryance/orch test: (pass) orch clean is destructive maintenance > a spawned agent is refused the sweep, and the dirs it does not own survive [127.91ms]
@bryance/orch test: 
@bryance/orch test: test\peer-project-scope.test.ts:
@bryance/orch test: (pass) peer discovery walls on the project > all_workspaces deliberately lifts the project wall [102.93ms]
@bryance/orch test: (pass) peer discovery walls on the project > a cross-project target does not resolve for sends without the explicit flag [101.13ms]
@bryance/orch test: (pass) peer discovery walls on the project > a record with no project stamp is not walled: it belongs to no other project [132.97ms]
@bryance/orch test: (pass) peer discovery walls on the project > a spawned agent's all_workspaces flag is ignored [103.67ms]
@bryance/orch test: (pass) peer discovery walls on the project > a worker sees its orchestrator in visible and peers [72.26ms]
@bryance/orch test: 
@bryance/orch test: test\backend-headless.test.ts:
@bryance/orch test: (pass) HeadlessBackend > spawns a detached process and records its handle [3352.44ms]
@bryance/orch test: (pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [3778.87ms]
@bryance/orch test: (pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [4128.61ms]
@bryance/orch test: (pass) HeadlessBackend > signals a matching recorded process through the injected killer [3692.27ms]
@bryance/orch test: (pass) HeadlessBackend > refuses to signal a pid whose process instance was replaced [0.49ms]
@bryance/orch test: (pass) HeadlessBackend > never signals a dead pid [0.40ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-limits.test.ts:
@bryance/orch test: (pass) spawn limits > rejects invalid cap %s with file and key [25.27ms]
@bryance/orch test: (pass) spawn limits > rejects invalid cap %s with file and key [19.16ms]
@bryance/orch test: (pass) spawn limits > rejects invalid cap %s with file and key [17.17ms]
@bryance/orch test: (pass) spawn limits > omitted fleet caps normalize to defaults [17.20ms]
@bryance/orch test: (pass) spawn limits > global boundary refusal data counts the whole request [215.63ms]
@bryance/orch test: (pass) spawn limits > one workspace may use the full global allotment [110.25ms]
@bryance/orch test: (pass) spawn limits > workspace cap is independent of global headroom [108.88ms]
@bryance/orch test: (pass) spawn limits > uncapped space is bounded only by global count [95.76ms]
@bryance/orch test: (pass) spawn limits > foreign pack members do not consume the caller's pack cap [145.49ms]
@bryance/orch test: (pass) spawn limits > an agent whose recorded process is gone frees capacity [88.98ms]
@bryance/orch test: (pass) spawn limits > foreign panes never count [82.45ms]
@bryance/orch test: (pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [7.94ms]
@bryance/orch test: (pass) spawn limits > doctor accepts satisfiable limits [6.36ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a named space is orch's own id, and the workspace is its RECORDED home [3395.45ms]
@bryance/orch test: 
@bryance/orch test: test\close-reports-every-target.test.ts:
@bryance/orch test: (pass) close reports an outcome for every target it was given (U2) > --json carries a per-target outcome, not just the successes [3651.70ms]
@bryance/orch test: 
@bryance/orch test: test\commands-status.test.ts:
@bryance/orch test: (pass) commands/status > zero-row message reports gathered counts and backend response [0.18ms]
@bryance/orch test: (pass) commands/status > dead rows never display stale live state [0.06ms]
@bryance/orch test: (pass) commands/status > shared row boundary normalizes stale state for every renderer [0.08ms]
@bryance/orch test: (pass) commands/status > a human at a terminal has no identity to narrow by and no space to be held inside [0.21ms]
@bryance/orch test: (pass) commands/status > --agent narrows to one row by id, key, or name, exited or not [0.18ms]
@bryance/orch test: (pass) commands/status > an agent sees what it spawned, and never past its own space > the default is the agents this caller spawned [0.06ms]
@bryance/orch test: (pass) commands/status > an agent sees what it spawned, and never past its own space > --space-wide widens to the caller's space, which is the wall [0.04ms]
@bryance/orch test: (pass) commands/status > an agent sees what it spawned, and never past its own space > a human widening sees every space, including the one the agent could not [0.03ms]
@bryance/orch test: (pass) commands/status > derives status row fields from seeded presence [0.82ms]
@bryance/orch test: (pass) commands/status > marks dead presence as exited [0.17ms]
@bryance/orch test: (pass) commands/status > asking presence is surfaced as a question while still reporting live state [0.14ms]
@bryance/orch test: (pass) commands/status > shared status row carries presence-derived fields [0.22ms]
@bryance/orch test: (pass) commands/status > status owner ignores spawning provenance when no lease exists [0.30ms]
@bryance/orch test: (pass) commands/status > lease-backed status attribution distinguishes my lease, another lease, and unleased rows [3469.64ms]
@bryance/orch test: (pass) commands/status > default table separates minted identity from pane environment [1.86ms]
@bryance/orch test: (pass) commands/status > human table shows harness and working directory facts [0.30ms]
@bryance/orch test: (pass) commands/status > json branch and local table branch derive identical rows apart from host [0.16ms]
@bryance/orch test: (pass) commands/status > capacity footer uses configured caps and shows one pack per root [1.02ms]
@bryance/orch test: (pass) commands/status > formats workspace labels and warnings [0.14ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > with no space, orch INSIDE the plexer spawns beside itself and opens nothing [107.14ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: (pass) fleet ownership scoping > close has no force option and remains unconditional without it [3797.89ms]
@bryance/orch test: 
@bryance/orch test: test\close-reports-every-target.test.ts:
@bryance/orch test: (pass) close reports an outcome for every target it was given (U2) > a failed target reports outcome error WITH the real error text [132.13ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a caller INSIDE the plexer whose recorded place is gone resolves no coordinate, never another [89.82ms]
@bryance/orch test: 
@bryance/orch test: test\close-reports-every-target.test.ts:
@bryance/orch test: (pass) close reports an outcome for every target it was given (U2) > a pane the plexer no longer has is CLOSED, not failed [118.27ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a caller INSIDE the plexer with NO orch identity (a human's pane) spawns beside itself [88.81ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-registration.test.ts:
@bryance/orch test: (pass) machine daemon registration > refuses a second start and names the live socket [3041.83ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > with no space and orch OUTSIDE the plexer, the PACK gets its own marked home [90.60ms]
@bryance/orch test: 
@bryance/orch test: test\close-reports-every-target.test.ts:
@bryance/orch test: (pass) close reports an outcome for every target it was given (U2) > the exit code still reflects whether every target closed [116.83ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-identity.test.ts:
@bryance/orch test: (pass) one key per pane spawn (12.1) > a name freed by a dead agent is reusable, and the two agents differ in identity [6915.94ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-registration.test.ts:
@bryance/orch test: (pass) machine daemon registration > the refusal a second start prints names the live daemon's pid [18.26ms]
@bryance/orch test: (pass) machine daemon registration > doctor names both when a second daemon is live beside the registered one [33.07ms]
@bryance/orch test: (pass) machine daemon registration > evicts a registration whose process instance no longer matches [28.37ms]
@bryance/orch test: (pass) machine daemon registration > routes a different orch dir to its own runtime files [17.43ms]
@bryance/orch test: (pass) machine daemon registration > doctor distinguishes registered-but-dead from live-and-registered [19.57ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > the same pack spawning again reuses its home and asks the human nothing [90.51ms]
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > an environment that holds nothing answers with an absence, never a refusal [67.70ms]
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a space with no home HERE places the fleet without borrowing another plexer's [81.94ms]
@bryance/orch test: 
@bryance/orch test: test\commands-runs.test.ts:
@bryance/orch test: (pass) commands/runs > lists newest first and honors -n [3331.10ms]
@bryance/orch test: (pass) commands/runs > target filter and json preserve RunRecord rows [112.18ms]
@bryance/orch test: (pass) commands/runs > running rows render as running, not zero duration [0.47ms]
@bryance/orch test: (pass) commands/runs > result falls back to durable run history after presence reap [122.82ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc.test.ts:
@bryance/orch test: (pass) daemon RPC > hello translates an absent daemon instead of reading a missing token [5043.41ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-status-lease.test.ts:
@bryance/orch test: (pass) daemon status lease payload > reports the current holder and its liveness [2957.03ms]
@bryance/orch test: (pass) daemon status lease payload > distinguishes a known unleased agent from an unknown key [66.59ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-reconnect.test.ts:
@bryance/orch test: (pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [6931.87ms]
@bryance/orch test: 
@bryance/orch test: test\pack-gets-its-own-home.test.ts:
@bryance/orch test: (pass) a pack gets its own marked plexer home (E8, E9, E10) > the coordinate is STORED against the pack and is never orch's own id [2664.19ms]
@bryance/orch test: (pass) a pack gets its own marked plexer home (E8, E9, E10) > the home orch opens is MARKED as orch's, never a bare directory name [77.31ms]
@bryance/orch test: (pass) a pack gets its own marked plexer home (E8, E9, E10) > a space's home and a pack's home use the SAME role and different tables [91.99ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-transport-parity.test.ts:
@bryance/orch test: (pass) both transports carry one mechanism > the same token registers the same session whichever transport carried it [6202.55ms]
@bryance/orch test: 
@bryance/orch test: test\pack-gets-its-own-home.test.ts:
@bryance/orch test: (pass) a pack gets its own marked plexer home (E8, E9, E10) > a home recorded in another plexer is not this one's to drive [82.06ms]
@bryance/orch test: (pass) a pack gets its own marked plexer home (E8, E9, E10) > closing a pack's home clears the row, so the next open is a fresh one [83.08ms]
@bryance/orch test: 
@bryance/orch test: test\backend-process-role.test.ts:
@bryance/orch test: (pass) ProcessRole > herdr provider records pid and start token and safely kills it [3596.21ms]
@bryance/orch test: (pass) ProcessRole > tmux provider records pid and start token and safely kills it [2408.98ms]
@bryance/orch test: (pass) ProcessRole > reports replaced when a pid is reused by a different process token [0.29ms]
@bryance/orch test: (pass) ProcessRole > running returns the process identity for a resolved handle [0.07ms]
@bryance/orch test: (pass) ProcessRole > running throws when the environment reports no process [0.05ms]
@bryance/orch test: (pass) ProcessRole > running records a null token when the OS cannot provide one [0.02ms]
@bryance/orch test: (pass) ProcessRole > the default signal refuses orch's own process and its parent [0.06ms]
@bryance/orch test: (pass) ProcessRole > kill signals a live record that carries no start token [0.05ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-reconnect.test.ts:
@bryance/orch test: (pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1084.58ms]
@bryance/orch test: (pass) subscribeEvents identity handshake > a spawned agent never registers as a session [73.46ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: {"closed":["kmismatch1"],"results":[{"target":"kmismatch1","handle":"{\"pid\":18992,\"key\":\"kmismatch1\"}","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
@bryance/orch test: (pass) fleet ownership scoping > close cleans up a mismatched recorded process without signalling [2287.99ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > a spawned agent acts as its own minted id, not its launch key [3.04ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > --cross-space from a spawned agent is refused [86.22ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-identity.test.ts:
@bryance/orch test: (pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [2151.64ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: (pass) a spawned agent touches only what it spawned > close --all from an AGENT sweeps only its own subtree [109.00ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > close --all from the HUMAN sweeps every managed spawn, whoever spawned it [98.56ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-identity.test.ts:
@bryance/orch test: (pass) A1: spawn registration records the space as an environment axis > a spawn into a space writes agent_spaces, and the composer reads it back [69.96ms]
@bryance/orch test: (pass) A1: spawn registration records the space as an environment axis > a spawn stating no space records NO ROW ΓÇö a missing axis is a missing row [72.00ms]
@bryance/orch test: (pass) A1: spawn registration records the space as an environment axis > moving an agent to another space closes the old interval and keeps its identity [69.69ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: (pass) a spawned agent touches only what it spawned > close from a spawned agent is REFUSED when the target is not its own [80.27ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-preferred-models.test.ts:
@bryance/orch test: (pass) the preferred quicklist reaches every launch route > a pane spawn hands the exact array to the backend [5494.47ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: (pass) a spawned agent touches only what it spawned > close from a spawned agent SUCCEEDS on a slave it spawned itself [86.67ms]
@bryance/orch test: (pass) a spawned agent touches only what it spawned > the workspace operator keeps control of an agent-owned fleet [64.69ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-reconnect.test.ts:
@bryance/orch test: (pass) subscribeEvents identity handshake > a session without a launch credential registers once [1663.24ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-preferred-models.test.ts:
@bryance/orch test: (pass) the preferred quicklist reaches every launch route > two created agents retain their own model tuning [2798.42ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc.test.ts:
@bryance/orch test: 1 unleased agent(s) exist - orch adopt pzd6ryli7h to take one, orch status to see them.
@bryance/orch test: (pass) daemon RPC > an unreachable agent yields a boundary answer, and the outbox is not left pending [4972.63ms]
@bryance/orch test: (pass) daemon RPC > round-trips a call over the real unix socket [9.84ms]
@bryance/orch test: (pass) daemon RPC > capacity answers the scoped fleet capacity [7.54ms]
@bryance/orch test: (pass) daemon RPC > logs one rpc record when a request is answered [8.35ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-preferred-models.test.ts:
@bryance/orch test: (pass) the preferred quicklist reaches every launch route > an unconfigured quicklist stays empty rather than becoming a default one [1258.25ms]
@bryance/orch test: (pass) the preferred quicklist reaches every launch route > the previewed command is the command a launch runs [0.38ms]
@bryance/orch test: (pass) the preferred quicklist reaches every launch route > a headless launch forwards the quicklist into the adapter's own options [1493.60ms]
@bryance/orch test: (pass) orchd rules on the quicklist it is sent > accepts an absent value and an array of specs [1.13ms]
@bryance/orch test: (pass) orchd rules on the quicklist it is sent > refuses a joined string or a blank entry instead of coercing it [0.75ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc.test.ts:
@bryance/orch test: (pass) daemon RPC > issues one session identity to sequential invocations from one session [2563.58ms]
@bryance/orch test: (pass) daemon RPC > enqueue returns a queued task visible to listTasks [4630.98ms]
@bryance/orch test: (pass) daemon RPC > hello returns live agents whose newest lease is closed or absent [2219.73ms]
@bryance/orch test: (pass) daemon RPC > hello returns an empty unleased list when none exist [1138.47ms]
@bryance/orch test: (pass) daemon RPC > a TCP hello with the daemon token gets an identity [1112.94ms]
@bryance/orch test: (pass) daemon RPC > refuses a hello that reports no session pid [9.90ms]
@bryance/orch test: (pass) daemon RPC > refuses a hello without its environment [10.42ms]
@bryance/orch test: (pass) daemon RPC > same session pid keeps its id and a different session pid gets another [3313.42ms]
@bryance/orch test: (pass) daemon RPC > refuses a TCP hello without a token [6.53ms]
@bryance/orch test: (pass) daemon RPC > refuses a TCP hello with a wrong token [7.34ms]
@bryance/orch test: (pass) daemon RPC > writes the daemon token with owner-only permissions [8.38ms]
@bryance/orch test: (pass) daemon RPC > returns an error for an unknown method [9.44ms]
@bryance/orch test: (pass) daemon RPC > reports malformed lines and keeps the connection alive [20.55ms]
@bryance/orch test: (pass) daemon RPC > delivers pushed subscription events [55.53ms]
@bryance/orch test: (pass) daemon RPC > replays durable events after a daemon restart without a gap [317.34ms]
@bryance/orch test: (pass) daemon RPC > reports the oldest sequence when replay starts before the pruned window [52.34ms]
@bryance/orch test: (pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [19.35ms]
@bryance/orch test: (pass) daemon RPC > has a catchable absent-daemon error [1.19ms]
@bryance/orch test: (pass) daemon RPC > calls a slow daemon unreachable, not absent [109.00ms]
@bryance/orch test: (pass) daemon RPC > calls a refused endpoint absent so a wedged daemon is still reclaimable [2.12ms]
@bryance/orch test: 1 unleased agent(s) exist - orch adopt vg13p2q1z4 to take one, orch status to see them.
@bryance/orch test: (pass) daemon RPC > dispatch waits for and reports a bridge acknowledgement [3698.08ms]
@bryance/orch test: 1 unleased agent(s) exist - orch adopt ej6mapdxhp to take one, orch status to see them.
@bryance/orch test: (pass) daemon RPC > dispatch reports unavailable while a live agent has no bridge [3979.17ms]
@bryance/orch test: 1 unleased agent(s) exist - orch adopt nb3x4w4430 to take one, orch status to see them.
@bryance/orch test: (pass) daemon RPC > attach reports open rows and re-pushes them [3525.72ms]
@bryance/orch test: 
@bryance/orch test: 6 tests skipped:
@bryance/orch test: (skip) the token file is the whole credential > the token is 0600
@bryance/orch test: (skip) the token file is the whole credential > $ORCH_DIR is 0700, so same-uid is a boundary the filesystem enforces
@bryance/orch test: (skip) the token file is the whole credential > a token left loose by an earlier run is tightened, not trusted
@bryance/orch test: (skip) the token file is the whole credential > a runtime directory the daemon creates is 0700 too
@bryance/orch test: (skip) pidStampedWith > returns the stamped shell rather than its child
@bryance/orch test: (skip) pidStampedWith > returns null for an unknown value
@bryance/orch test: 
@bryance/orch test:  1829 pass
@bryance/orch test:  6 skip
@bryance/orch test:  0 fail
@bryance/orch test:  10416 expect() calls
@bryance/orch test: Ran 1835 tests across 274 files. [51.83s]
@bryance/orch test: Exited with code 0
