# Backend port: roles, implementers, consumers

## Roles

| Role | Interface type | Declaration | What it does |
|---|---|---|---|
| process | `ProcessRole<Handle>` | `packages/orch/src/types/backend.ts:420` | Starts, resolves, probes, and signals local processes. |
| capture | `CaptureRole` | `packages/orch/src/types/backend.ts:422` | Reads orch-captured status/result records. |
| identity | `EnvironmentIdentityRole \| null` | `packages/orch/src/types/backend.ts:424` | Resolves the calling process's own agent identity. |
| handleLookup | `HandleLookupRole<Handle> \| null` | `packages/orch/src/types/backend.ts:430` | Resolves the current native handle for an agent running here. |
| logPruning | `LogPruningRole \| null` | `packages/orch/src/types/backend.ts:432` | Prunes backend-owned logs while retaining live-agent logs. |
| versionInfo | `VersionRole \| null` | `packages/orch/src/types/backend.ts:436` | Reports installed and supported integration versions. |
| serverInfo | `ServerInfoRole \| null` | `packages/orch/src/types/backend.ts:439` | Reports whether the backend's server runs and its compatibility. |
| placement | `PlacementRole<Handle> \| null` | `packages/orch/src/types/backend.ts:440` | Opens and closes an agent placement. |
| commandPlacement | `CommandPlacementRole<Handle> \| null` | `packages/orch/src/types/backend.ts:442` | Opens a placement that runs a supplied command. |
| placementInventory | `PlacementInventoryRole<Handle> \| null` | `packages/orch/src/types/backend.ts:443` | Reports current/listed placements and their coordinates. |
| agentInput | `AgentInputRole<Handle> \| null` | `packages/orch/src/types/backend.ts:445` | Submits text, sends keys, or focuses a placement. |
| foreground | `ForegroundRole<Handle> \| null` | `packages/orch/src/types/backend.ts:446` | Reads foreground process information for a placement. |
| relaunching | `RelaunchRole<Handle> \| null` | `packages/orch/src/types/backend.ts:449` | Restarts a harness that directly occupies its placement. |
| screen | `ScreenRole<Handle> \| null` | `packages/orch/src/types/backend.ts:450` | Reads visible screen text. |
| zooming | `ZoomRole<Handle> \| null` | `packages/orch/src/types/backend.ts:451` | Changes placement zoom. |
| labeling | `LabelRole<Handle> \| null` | `packages/orch/src/types/backend.ts:452` | Sets a placement's label. |
| agentNaming | `AgentNamingRole<Handle> \| null` | `packages/orch/src/types/backend.ts:453` | Renames an agent in the environment. |
| agentStatus | `AgentStatusRole<Handle> \| null` | `packages/orch/src/types/backend.ts:454` | Waits for native agent status. |
| groupHome | `GroupHomeRole<Handle> \| null` | `packages/orch/src/types/backend.ts:455` | Lists and mutates groups, including create, close, focus, and move. |
| groupLayout | `GroupLayoutRole<Handle> \| null` | `packages/orch/src/types/backend.ts:456` | Reads geometry for placements in a group. |
| spaceHome | `SpaceHomeRole<Handle> \| null` | `packages/orch/src/types/backend.ts:457` | Lists and mutates homes for spaces and packs. |

## Implementers

Cells give the backend's property assignment; path and line point to that assignment.

| Role | herdr | tmux | orca | headless | held |
|---|---|---|---|---|---|
| process | `packages/orch/src/backends/herdr/index.ts:143` | `packages/orch/src/backends/tmux/index.ts:67` | `packages/orch/src/backends/orca/index.ts:98` | `packages/orch/src/backends/headless/index.ts:117` | `packages/orch/src/backends/held/index.ts:104` |
| capture | `packages/orch/src/backends/herdr/index.ts:158` | `packages/orch/src/backends/tmux/index.ts:87` | `packages/orch/src/backends/orca/index.ts:105` | `packages/orch/src/backends/headless/index.ts:97` | `packages/orch/src/backends/held/index.ts:105` |
| identity | `packages/orch/src/backends/herdr/index.ts:146` | `packages/orch/src/backends/tmux/index.ts:76` | `packages/orch/src/backends/orca/index.ts:106` | `packages/orch/src/backends/headless/index.ts:85` | `packages/orch/src/backends/held/index.ts:107` |
| handleLookup | `packages/orch/src/backends/herdr/index.ts:150` | `packages/orch/src/backends/tmux/index.ts:80` | `packages/orch/src/backends/orca/index.ts:113` | `packages/orch/src/backends/headless/index.ts:88` | `packages/orch/src/backends/held/index.ts:109` |
| logPruning | `packages/orch/src/backends/herdr/index.ts:152` | `packages/orch/src/backends/tmux/index.ts:82` | `packages/orch/src/backends/orca/index.ts:115` | `packages/orch/src/backends/headless/index.ts:94` | `packages/orch/src/backends/held/index.ts:111` |
| versionInfo | `packages/orch/src/backends/herdr/index.ts:153` | `packages/orch/src/backends/tmux/index.ts:84` | `packages/orch/src/backends/orca/index.ts:116` | `packages/orch/src/backends/headless/index.ts:92` | `packages/orch/src/backends/held/index.ts:112` |
| serverInfo | `packages/orch/src/backends/herdr/index.ts:157` | `packages/orch/src/backends/tmux/index.ts:86` | `packages/orch/src/backends/orca/index.ts:120` | `packages/orch/src/backends/headless/index.ts:93` | `packages/orch/src/backends/held/index.ts:113` |
| placement | `packages/orch/src/backends/herdr/index.ts:179` | `packages/orch/src/backends/tmux/index.ts:110` | `packages/orch/src/backends/orca/index.ts:154` | `packages/orch/src/backends/headless/index.ts:98` | `packages/orch/src/backends/held/index.ts:116` |
| commandPlacement | `packages/orch/src/backends/herdr/index.ts:196` | `packages/orch/src/backends/tmux/index.ts:131` | `packages/orch/src/backends/orca/index.ts:173` | `packages/orch/src/backends/headless/index.ts:100` | `packages/orch/src/backends/held/index.ts:117` |
| placementInventory | `packages/orch/src/backends/herdr/index.ts:209` | `packages/orch/src/backends/tmux/index.ts:140` | `packages/orch/src/backends/orca/index.ts:186` | `packages/orch/src/backends/headless/index.ts:101` | `packages/orch/src/backends/held/index.ts:118` |
| agentInput | `packages/orch/src/backends/herdr/index.ts:159` | `packages/orch/src/backends/tmux/index.ts:89` | `packages/orch/src/backends/orca/index.ts:127` | `packages/orch/src/backends/headless/index.ts:102` | `packages/orch/src/backends/held/index.ts:119` |
| foreground | `packages/orch/src/backends/herdr/index.ts:166` | `packages/orch/src/backends/tmux/index.ts:103` | `packages/orch/src/backends/orca/index.ts:146` | `packages/orch/src/backends/headless/index.ts:105` | `packages/orch/src/backends/held/index.ts:120` |
| relaunching | `packages/orch/src/backends/herdr/index.ts:165` | `packages/orch/src/backends/tmux/index.ts:102` | `packages/orch/src/backends/orca/index.ts:145` | `packages/orch/src/backends/headless/index.ts:104` | `packages/orch/src/backends/held/index.ts:121` |
| screen | `packages/orch/src/backends/herdr/index.ts:218` | `packages/orch/src/backends/tmux/index.ts:160` | `packages/orch/src/backends/orca/index.ts:206` | `packages/orch/src/backends/headless/index.ts:106` | `packages/orch/src/backends/held/index.ts:122` |
| zooming | `packages/orch/src/backends/herdr/index.ts:221` | `packages/orch/src/backends/tmux/index.ts:161` | `packages/orch/src/backends/orca/index.ts:213` | `packages/orch/src/backends/headless/index.ts:107` | `packages/orch/src/backends/held/index.ts:123` |
| labeling | `packages/orch/src/backends/herdr/index.ts:222` | `packages/orch/src/backends/tmux/index.ts:163` | `packages/orch/src/backends/orca/index.ts:214` | `packages/orch/src/backends/headless/index.ts:108` | `packages/orch/src/backends/held/index.ts:124` |
| agentNaming | `packages/orch/src/backends/herdr/index.ts:223` | `packages/orch/src/backends/tmux/index.ts:165` | `packages/orch/src/backends/orca/index.ts:216` | `packages/orch/src/backends/headless/index.ts:109` | `packages/orch/src/backends/held/index.ts:125` |
| agentStatus | `packages/orch/src/backends/herdr/index.ts:225` | `packages/orch/src/backends/tmux/index.ts:166` | `packages/orch/src/backends/orca/index.ts:218` | `packages/orch/src/backends/headless/index.ts:110` | `packages/orch/src/backends/held/index.ts:126` |
| groupHome | `packages/orch/src/backends/herdr/index.ts:230` | `packages/orch/src/backends/tmux/index.ts:167` | `packages/orch/src/backends/orca/index.ts:220` | `packages/orch/src/backends/headless/index.ts:111` | `packages/orch/src/backends/held/index.ts:127` |
| groupLayout | `packages/orch/src/backends/herdr/index.ts:259` | `packages/orch/src/backends/tmux/index.ts:200` | `packages/orch/src/backends/orca/index.ts:251` | `packages/orch/src/backends/headless/index.ts:112` | `packages/orch/src/backends/held/index.ts:128` |
| spaceHome | `packages/orch/src/backends/herdr/index.ts:267` | `packages/orch/src/backends/tmux/index.ts:207` | `packages/orch/src/backends/orca/index.ts:264` | `packages/orch/src/backends/headless/index.ts:113` | `packages/orch/src/backends/held/index.ts:129` |

## Consumers

One row per outside-backends read; callbacks that receive a selected role are shown at their selection site.

| Role | Location | Enclosing function | Use |
|---|---|---|---|
| process | `packages/orch/src/control/close-attempt.ts:114` | `liveProcess` | Resolves the backend process role for close-time liveness. |
| process | `packages/orch/src/daemon/server/handlers/adopt.ts:15` | adopt handler | Records the process currently running at the adopted handle. |
| process | `packages/orch/src/daemon/server/handlers/lifecycle.ts:97` | lifecycle reset path | Gets the running process for a headless handle. |
| process | `packages/orch/src/daemon/server/spawn/placement.ts:160` | spawn placement | Reads the launched handle's process for registration. |
| handleLookup | `packages/orch/src/control/dispatch.ts:190` | route resolution | Resolves the backend's live handle for a local agent. |
| logPruning | `packages/orch/src/daemon/server/retention.ts:44` | retention sweep | Selects the optional backend log-pruning implementation. |
| versionInfo | `packages/orch/src/daemon/server/session-registry.ts:64` | session registration | Gets the backend's supported integration version. |
| versionInfo | `packages/orch/src/daemon/server/doctor/backends.ts:142` | backend report construction | Reads installed/supported integration-version details. |
| serverInfo | `packages/orch/src/daemon/server/doctor/backends.ts:150` | backend report construction | Reports the backend server only when detected. |
| placement | `packages/orch/src/control/close-attempt.ts:131` | close routing | Passes placement close capability into close-route selection. |
| placement | `packages/orch/src/daemon/server/spawn/index.ts:200` | placed-agent spawn | Requires placement and opens the agent location. |
| placement | `packages/orch/src/daemon/server/spawn/placement.ts:121` | place-and-spawn | Opens a placement before launching. |
| placement | `packages/orch/src/daemon/server/spawn/placement.ts:138` | place-and-spawn cleanup | Closes a newly opened placement after launch failure. |
| placement | `packages/orch/src/daemon/server/tabs.ts:91` | create-tab path | Closes the root placement after creating a group. |
| commandPlacement | `packages/orch/src/daemon/server/spawn/viewers.ts:54` | viewerRoles | Destructures the role and requires it to exist before planning a viewer pane. |
| commandPlacement | `packages/orch/src/daemon/server/doctor/backends.ts:177` | backend report construction | Includes command-placement availability in the roles report. |
| placementInventory | `packages/orch/src/entities/census.ts:43` | census collection | Lists backend placements for census. |
| placementInventory | `packages/orch/src/entities/close-targets.ts:69` | close target resolution | Uses inventory to resolve a target. |
| placementInventory | `packages/orch/src/entities/close-targets.ts:130` | close target resolution | Distinguishes placed backends when validating a pane target. |
| placementInventory | `packages/orch/src/control/close-attempt.ts:90` | close verification | Requires inventory for placed-handle checks. |
| placementInventory | `packages/orch/src/control/close-attempt.ts:92` | close verification | Checks whether the target remains listed after close. |
| placementInventory | `packages/orch/src/control/dispatch.ts:119` | prompt dispatch | Distinguishes an unplaced route when input is absent. |
| placementInventory | `packages/orch/src/daemon/server/handlers/pane.ts:23` | group lookup | Finds the listed placement's owning group. |
| placementInventory | `packages/orch/src/daemon/server/handlers/pane.ts:36` | pane action routing | Checks whether a pane operation has a placed target. |
| placementInventory | `packages/orch/src/daemon/server/spawn/index.ts:339` | tab spawn | Lists targets to build handle/name metadata. |
| placementInventory | `packages/orch/src/daemon/server/spawn/index.ts:353` | tile spawn | Requires inventory for tiling. |
| placementInventory | `packages/orch/src/daemon/server/spawn/placement.ts:88` | caller coordinate resolution | Checks inventory before resolving a caller handle. |
| placementInventory | `packages/orch/src/daemon/server/spawn/placement.ts:89` | caller coordinate resolution | Resolves the caller's workspace coordinate. |
| placementInventory | `packages/orch/src/daemon/server/spawn/placement.ts:154` | spawn registration | Records whether the backend has placements. |
| placementInventory | `packages/orch/src/daemon/server/spawn/tab-label.ts:62` | tab label generation | Lists handles when forming tab labels. |
| placementInventory | `packages/orch/src/daemon/server/tabs.ts:32` | current group lookup | Resolves coordinate from the current handle. |
| placementInventory | `packages/orch/src/daemon/server/tabs.ts:60` | group close path | Finds handles belonging to a group. |
| placementInventory | `packages/orch/src/daemon/server/doctor/backends.ts:174` | backend report construction | Reads the current workspace. |
| placementInventory | `packages/orch/src/daemon/server/doctor/backends.ts:178` | backend report construction | Includes inventory capability in the roles report. |
| placementInventory | `packages/orch/src/daemon/server/doctor/declared-vs-reality.ts:44` | actual-pane lookup | Returns no panes when inventory is absent. |
| placementInventory | `packages/orch/src/daemon/server/doctor/declared-vs-reality.ts:46` | actual-pane lookup | Lists actual handles for comparison. |
| agentInput | `packages/orch/src/control/dispatch.ts:118` | prompt dispatch | Selects the explicit agent-input fast path. |
| agentInput | `packages/orch/src/control/dispatch.ts:119` | prompt dispatch | Checks whether input or placement can address the route. |
| agentInput | `packages/orch/src/control/dispatch.ts:133` | prompt dispatch | Submits the prompt text. |
| agentInput | `packages/orch/src/control/dispatch.ts:209` | command dispatch | Refuses when explicit input is unavailable. |
| agentInput | `packages/orch/src/control/dispatch.ts:214` | command dispatch | Submits command text. |
| agentInput | `packages/orch/src/daemon/server/handlers/drive.ts:31` | drive handler | Selects input capability for drive delivery. |
| agentInput | `packages/orch/src/daemon/server/handlers/pane.ts:89` | pane action handler | Selects input and sends keys. |
| agentInput | `packages/orch/src/daemon/server/handlers/pane.ts:91` | pane action handler | Selects input and focuses the placement. |
| agentInput | `packages/orch/src/daemon/server/handlers/write.ts:119` | write handler | Tests fallback availability for a raw session. |
| agentInput | `packages/orch/src/daemon/server/handlers/write.ts:123` | write handler | Refuses when no direct input route exists. |
| agentInput | `packages/orch/src/daemon/server/handlers/write.ts:127` | write handler | Submits the text to the placement. |
| agentInput | `packages/orch/src/daemon/server/handlers/relaunch.ts:42` | relaunch handler | Selects input for sending a relaunch command. |
| agentInput | `packages/orch/src/daemon/server/doctor/backends.ts:179` | backend report construction | Includes input capability in the roles report. |
| foreground | `packages/orch/src/daemon/server/doctor/backends.ts:180` | backend report construction | Includes foreground capability in the roles report. |
| relaunching | `packages/orch/src/daemon/server/handlers/relaunch.ts:170` | relaunch handler | Selects the in-place relaunch role. |
| relaunching | `packages/orch/src/daemon/server/doctor/backends.ts:181` | backend report construction | Includes relaunch capability in the roles report. |
| screen | `packages/orch/src/agent/read.ts:161` | screen-read routing | Selects screen capability for an agent. |
| screen | `packages/orch/src/agent/read.ts:165` | screen-read execution | Reads requested lines from the selected screen. |
| screen | `packages/orch/src/daemon/server/doctor/backends.ts:182` | backend report construction | Includes screen capability in the roles report. |
| zooming | `packages/orch/src/daemon/server/handlers/pane.ts:93` | pane action handler | Selects zoom capability and applies the requested mode. |
| zooming | `packages/orch/src/daemon/server/doctor/backends.ts:183` | backend report construction | Includes zoom capability in the roles report. |
| labeling | `packages/orch/src/daemon/server/spawn/viewers.ts:54` | viewerRoles | Destructures the optional role for labeling viewer panes. |
| labeling | `packages/orch/src/daemon/server/handlers/pane.ts:95` | pane action handler | Selects label capability and renames a pane. |
| labeling | `packages/orch/src/daemon/server/handlers/lease.ts:277` | agent rename handler | Reports no chrome when labeling is absent. |
| labeling | `packages/orch/src/daemon/server/handlers/lease.ts:278` | agent rename handler | Sets the placement label. |
| labeling | `packages/orch/src/daemon/server/spawn/viewers.ts:126` | viewer labeling | Passes the label role to the viewer-label helper. |
| labeling | `packages/orch/src/daemon/server/doctor/backends.ts:184` | backend report construction | Includes label capability in the roles report. |
| agentNaming | `packages/orch/src/daemon/server/handlers/lease.ts:276` | agent rename handler | Sets the environment's agent name. |
| agentNaming | `packages/orch/src/daemon/server/doctor/backends.ts:185` | backend report construction | Includes agent-naming capability in the roles report. |
| agentStatus | `packages/orch/src/daemon/server/doctor/backends.ts:186` | backend report construction | Includes native status-wait capability in the roles report. |
| groupHome | `packages/orch/src/daemon/server/spawn/viewers.ts:54` | viewerRoles | Destructures the role and requires it to exist before planning a viewer pane. |
| groupHome | `packages/orch/src/daemon/server/handlers/pane.ts:97` | pane action handler | Selects group mutation capability for moving a pane. |
| groupHome | `packages/orch/src/daemon/server/spawn/index.ts:318` | spawn dispatch | Falls back when groups are absent. |
| groupHome | `packages/orch/src/daemon/server/spawn/index.ts:334` | spawn dispatch | Passes group-home capability to new-tab spawn. |
| groupHome | `packages/orch/src/daemon/server/spawn/index.ts:354` | tile spawn | Requires group operations. |
| groupHome | `packages/orch/src/daemon/server/spawn/index.ts:360` | tile spawn | Resolves a target tab using group listing. |
| groupHome | `packages/orch/src/daemon/server/spawn/placement.ts:265` | group lookup | Lists groups to resolve the requested group. |
| groupHome | `packages/orch/src/daemon/server/spawn/placement.ts:278` | backend fallback selection | Checks whether groups are available. |
| groupHome | `packages/orch/src/daemon/server/spawn/placement.ts:280` | backend fallback selection | Checks group/home capability before retaining the backend. |
| groupHome | `packages/orch/src/daemon/server/spawn/viewers.ts:113` | viewer placement | Creates a group for viewer placements. |
| groupHome | `packages/orch/src/daemon/server/spawn/viewers.ts:117` | viewer cleanup | Closes the group after failed viewer placement. |
| groupHome | `packages/orch/src/daemon/server/tabs.ts:98` | tab operation | Selects group-home capability. |
| groupHome | `packages/orch/src/daemon/server/doctor/backends.ts:187` | backend report construction | Includes group-home capability in the roles report. |
| groupLayout | `packages/orch/src/daemon/server/spawn/viewers.ts:54` | viewerRoles | Destructures the role and requires it to exist before planning a viewer pane. |
| groupLayout | `packages/orch/src/daemon/server/handlers/pane.ts:62` | pane layout handler | Selects group geometry capability. |
| groupLayout | `packages/orch/src/daemon/server/spawn/index.ts:197` | placed-agent spawn | Selects geometry for tiling. |
| groupLayout | `packages/orch/src/daemon/server/spawn/index.ts:319` | spawn dispatch | Reads optional group layout. |
| groupLayout | `packages/orch/src/daemon/server/spawn/index.ts:354` | tile spawn | Requires layout capability. |
| groupLayout | `packages/orch/src/daemon/server/spawn/index.ts:361` | tile spawn | Reads the target group's layout. |
| groupLayout | `packages/orch/src/daemon/server/spawn/index.ts:399` | tile spawn | Reads tab layout for the result. |
| groupLayout | `packages/orch/src/daemon/server/spawn/viewers.ts:122` | viewer placement | Computes the next viewer tile. |
| groupLayout | `packages/orch/src/daemon/server/doctor/backends.ts:188` | backend report construction | Includes layout capability in the roles report. |
| spaceHome | `packages/orch/src/daemon/server/handlers/space.ts:29` | space backend lookup | Returns the backend's space-home role. |
| spaceHome | `packages/orch/src/daemon/server/spawn/placement.ts:62` | home resolution | Passes the role to find an existing space home. |
| spaceHome | `packages/orch/src/daemon/server/spawn/placement.ts:76` | home resolution | Checks whether the backend can open a space home. |
| spaceHome | `packages/orch/src/daemon/server/spawn/placement.ts:78` | home resolution | Looks up an existing home using the role. |
| spaceHome | `packages/orch/src/daemon/server/spawn/placement.ts:98` | home creation | Selects the home role. |
| spaceHome | `packages/orch/src/daemon/server/spawn/placement.ts:280` | backend fallback selection | Checks for the role before choosing the backend. |
| spaceHome | `packages/orch/src/daemon/server/doctor/backends.ts:189` | backend report construction | Includes space-home capability in the roles report. |
| capture | — | — | No outside-backends read of `backend.capture` was found. |

## Backend methods that are not role objects

| Member | Declaration | Callers outside `src/backends/` |
|---|---|---|
| `id` | `packages/orch/src/types/backend.ts:413` | `packages/orch/src/entities/inventory.ts:26,57,98`; `packages/orch/src/entities/census.ts:19,26,36,45-47`; `packages/orch/src/control/close-attempt.ts:94`; `packages/orch/src/daemon/server/handlers/space.ts:29`; `packages/orch/src/daemon/server/handlers/machine.ts:61`; `packages/orch/src/daemon/server/retention.ts:49`; `packages/orch/src/daemon/server/spawn/index.ts:275,353`; `packages/orch/src/daemon/server/spawn/placement.ts:62,70,78,99,101,253,279,282,284,286-287`; `packages/orch/src/daemon/server/spawn/admission.ts:179,190`; `packages/orch/src/daemon/server/spawn/plan.ts:77`; `packages/orch/src/daemon/server/spawn/tab-label.ts:60`; `packages/orch/src/daemon/server/spawn/viewers.ts:68,129`; `packages/orch/src/daemon/server/doctor/backends.ts:42,57,144,146,157,165,167`; `packages/orch/src/daemon/server/tabs.ts:31,48,86`. |
| `isAvailable()` | `packages/orch/src/types/backend.ts:415` | `packages/orch/src/daemon/server/handlers/machine.ts:61` lists available backend ids; `packages/orch/src/daemon/server/setup.ts:116` checks the selected backend; `packages/orch/src/daemon/server/setup.ts:276` checks headless availability; `packages/orch/src/daemon/server/doctor/backends.ts:163` detects availability; `packages/orch/src/daemon/server/doctor/notify.ts:14` checks available in-session backends. |
| `isInsideSession()` | `packages/orch/src/types/backend.ts:416` | `packages/orch/src/daemon/server/doctor/backends.ts:164` reports session presence; `packages/orch/src/daemon/server/doctor/notify.ts:14` checks available in-session backends. |
| `spawn(adapter, opts)` | `packages/orch/src/types/backend.ts:418` | `packages/orch/src/daemon/server/spawn/placement.ts:132` launches the selected adapter; `packages/orch/src/daemon/server/handlers/lifecycle.ts:96` starts a headless agent in the lifecycle path. |

## Does not fit

nothing
