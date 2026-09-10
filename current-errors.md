$ bun --filter @bryance/orch check
@bryance/orch check: check:bridge | check:bridge FAIL src\commands\lifecycle\rename.ts:83 method-presence capability checks are forbidden; read the composed environment capability instead
@bryance/orch check: check:bridge | Exited with code 1
@bryance/orch check: tc           | integration/close-always.test.ts(114,46): error TS2740: Type 'FakePanedBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | integration/close-always.test.ts(147,31): error TS2740: Type 'FakePanedBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | integration/close-always.test.ts(208,29): error TS2740: Type 'FakePanedBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | integration/close-always.test.ts(230,46): error TS2740: Type 'FakePanedBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | integration/doctor-declared-vs-reality.test.ts(43,42): error TS2740: Type 'FakePanedBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | integration/owner-scoping.test.ts(151,7): error TS2740: Type 'FakePanedBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | integration/owner-scoping.test.ts(187,46): error TS2740: Type 'FakePanedBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | integration/owner-scoping.test.ts(301,46): error TS2740: Type 'FakePanedBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | src/commands/lifecycle/close.ts(17,39): error TS2305: Module '"../../types/backend.ts"' has no exported member 'PaneHostRole'.
@bryance/orch check: tc           | src/commands/lifecycle/close.ts(103,30): error TS2339: Property 'paneInventory' does not exist on type 'Backend<BackendHandle>'.
@bryance/orch check: tc           | src/commands/lifecycle/close.ts(106,35): error TS7006: Parameter 'entry' implicitly has an 'any' type.
@bryance/orch check: tc           | src/commands/lifecycle/close.ts(169,55): error TS2339: Property 'paneInventory' does not exist on type 'Backend<BackendHandle>'.
@bryance/orch check: tc           | src/commands/lifecycle/close.ts(215,43): error TS2339: Property 'paneInventory' does not exist on type 'Backend<BackendHandle>'.
@bryance/orch check: tc           | src/commands/lifecycle/close.ts(217,35): error TS2339: Property 'paneInventory' does not exist on type 'Backend<BackendHandle>'.
@bryance/orch check: tc           | src/commands/lifecycle/close.ts(218,14): error TS7006: Parameter 'entry' implicitly has an 'any' type.
@bryance/orch check: tc           | src/commands/lifecycle/close.ts(265,36): error TS2339: Property 'paneHost' does not exist on type 'Backend<BackendHandle>'.
@bryance/orch check: tc           | src/commands/lifecycle/close.ts(362,25): error TS2339: Property 'paneInput' does not exist on type 'Backend<BackendHandle>'.
@bryance/orch check: tc           | src/commands/lifecycle/rename.ts(51,30): error TS2339: Property 'paneNaming' does not exist on type 'Backend<BackendHandle>'.
@bryance/orch check: tc           | src/commands/lifecycle/rename.ts(83,20): error TS2339: Property 'paneNaming' does not exist on type 'Backend<BackendHandle>'.
@bryance/orch check: tc           | src/commands/lifecycle/rename.ts(84,15): error TS2339: Property 'paneNaming' does not exist on type 'Backend<BackendHandle>'.
@bryance/orch check: tc           | src/commands/panes.ts(79,53): error TS2339: Property 'paneInput' does not exist on type 'Backend<BackendHandle>'.
@bryance/orch check: tc           | src/commands/panes.ts(99,53): error TS2339: Property 'paneScreen' does not exist on type 'Backend<BackendHandle>'.
@bryance/orch check: tc           | src/commands/panes.ts(136,24): error TS2339: Property 'paneInventory' does not exist on type 'Backend<BackendHandle>'.
@bryance/orch check: tc           | src/commands/panes.ts(136,52): error TS7006: Parameter 'item' implicitly has an 'any' type.
@bryance/orch check: tc           | src/commands/panes.ts(153,29): error TS2339: Property 'paneInventory' does not exist on type 'Backend<BackendHandle>'.
@bryance/orch check: tc           | src/commands/panes.ts(171,14): error TS2339: Property 'paneCount' does not exist on type 'BackendGroup'.
@bryance/orch check: tc           | src/commands/panes.ts(181,36): error TS2339: Property 'paneInventory' does not exist on type 'Backend<BackendHandle>'.
@bryance/orch check: tc           | src/commands/panes.ts(181,73): error TS7006: Parameter 'pane' implicitly has an 'any' type.
@bryance/orch check: tc           | src/commands/panes.ts(181,109): error TS7006: Parameter 'pane' implicitly has an 'any' type.
@bryance/orch check: tc           | src/commands/panes.ts(210,49): error TS2339: Property 'paneInventory' does not exist on type 'Backend<BackendHandle>'.
@bryance/orch check: tc           | src/commands/panes.ts(215,15): error TS2339: Property 'paneHost' does not exist on type 'Backend<BackendHandle>'.
@bryance/orch check: tc           | src/commands/panes.ts(215,33): error TS2339: Property 'paneHost' does not exist on type 'Backend<BackendHandle>'.
@bryance/orch check: tc           | src/commands/panes.ts(266,54): error TS2339: Property 'paneInput' does not exist on type 'Backend<BackendHandle>'.
@bryance/orch check: tc           | src/commands/panes.ts(288,53): error TS2339: Property 'paneZoom' does not exist on type 'Backend<BackendHandle>'.
@bryance/orch check: tc           | src/commands/panes.ts(303,41): error TS2353: Object literal may only specify known properties, and 'panes' does not exist in type 'BackendGroupLayout<BackendHandle>'.
@bryance/orch check: tc           | src/commands/panes.ts(303,55): error TS2339: Property 'panes' does not exist on type 'BackendGroupLayout<BackendHandle>'.
@bryance/orch check: tc           | src/commands/panes.ts(303,69): error TS7006: Parameter 'pane' implicitly has an 'any' type.
@bryance/orch check: tc           | src/commands/panes.ts(341,27): error TS2551: Property 'targetPane' does not exist on type 'TilePlacement'. Did you mean 'targetHandle'?
@bryance/orch check: tc           | src/commands/spawn/placement.ts(91,18): error TS2551: Property 'intoHandle' does not exist on type 'TabSpawnSpec'. Did you mean 'intoPane'?
@bryance/orch check: tc           | src/commands/spawn/placement.ts(101,47): error TS2551: Property 'intoHandle' does not exist on type 'TabSpawnSpec'. Did you mean 'intoPane'?
@bryance/orch check: tc           | src/commands/spawn/report.ts(82,23): error TS2339: Property 'panes' does not exist on type 'BackendGroupLayout<BackendHandle>'.
@bryance/orch check: tc           | src/commands/spawn/report.ts(82,34): error TS7006: Parameter 'p' implicitly has an 'any' type.
@bryance/orch check: tc           | src/commands/spawn/report.ts(87,36): error TS7006: Parameter 'r' implicitly has an 'any' type.
@bryance/orch check: tc           | src/commands/spawn/report.ts(88,36): error TS7006: Parameter 'r' implicitly has an 'any' type.
@bryance/orch check: tc           | src/control/dispatch.ts(109,71): error TS2322: Type '"not-placed"' is not assignable to type '"no-environment-role" | "no-pane"'.
@bryance/orch check: tc           | src/doctor/declared-vs-reality.ts(30,17): error TS2339: Property 'paneInventory' does not exist on type 'Backend<BackendHandle>'.
@bryance/orch check: tc           | src/doctor/declared-vs-reality.ts(32,12): error TS18047: 'backend.placementInventory' is possibly 'null'.
@bryance/orch check: tc           | test/a-row-is-not-a-pane.test.ts(69,32): error TS2740: Type 'FakePanedBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | test/backend-herdr.test.ts(169,20): error TS2339: Property 'paneHost' does not exist on type 'HerdrBackend'.
@bryance/orch check: tc           | test/backend-herdr.test.ts(170,20): error TS2339: Property 'paneInventory' does not exist on type 'HerdrBackend'.
@bryance/orch check: tc           | test/backend-herdr.test.ts(171,20): error TS2339: Property 'paneInput' does not exist on type 'HerdrBackend'.
@bryance/orch check: tc           | test/backend-herdr.test.ts(172,20): error TS2551: Property 'paneForeground' does not exist on type 'HerdrBackend'. Did you mean 'foreground'?
@bryance/orch check: tc           | test/backend-herdr.test.ts(173,20): error TS2339: Property 'paneScreen' does not exist on type 'HerdrBackend'.
@bryance/orch check: tc           | test/backend-herdr.test.ts(213,85): error TS2561: Object literal may only specify known properties, but 'targetPane' does not exist in type 'BackendSpawnOpts'. Did you mean to write 'targetHandle'?
@bryance/orch check: tc           | test/backend-herdr.test.ts(222,70): error TS2561: Object literal may only specify known properties, but 'targetPane' does not exist in type 'BackendSpawnOpts'. Did you mean to write 'targetHandle'?
@bryance/orch check: tc           | test/backend-herdr.test.ts(232,86): error TS2561: Object literal may only specify known properties, but 'targetPane' does not exist in type 'BackendSpawnOpts'. Did you mean to write 'targetHandle'?
@bryance/orch check: tc           | test/backend-herdr.test.ts(240,70): error TS2561: Object literal may only specify known properties, but 'targetPane' does not exist in type 'BackendSpawnOpts'. Did you mean to write 'targetHandle'?
@bryance/orch check: tc           | test/backend-herdr.test.ts(256,98): error TS2353: Object literal may only specify known properties, and 'intoPane' does not exist in type 'BackendSpawnOpts'.
@bryance/orch check: tc           | test/backend-herdr.test.ts(279,13): error TS2339: Property 'paneHost' does not exist on type 'HerdrBackend'.
@bryance/orch check: tc           | test/backend-herdr.test.ts(287,98): error TS2561: Object literal may only specify known properties, but 'targetPane' does not exist in type 'BackendSpawnOpts'. Did you mean to write 'targetHandle'?
@bryance/orch check: tc           | test/backend-herdr.test.ts(337,13): error TS2339: Property 'paneScreen' does not exist on type 'HerdrBackend'.
@bryance/orch check: tc           | test/backend-herdr.test.ts(349,7): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Object literal may only specify known properties, and 'panes' does not exist in type 'BackendGroupLayout<string>'.
@bryance/orch check: tc           | test/backend-herdr.test.ts(359,13): error TS2339: Property 'paneInput' does not exist on type 'HerdrBackend'.
@bryance/orch check: tc           | test/backend-herdr.test.ts(367,28): error TS2339: Property 'paneNaming' does not exist on type 'HerdrBackend'.
@bryance/orch check: tc           | test/backend-tmux.test.ts(9,36): error TS2307: Cannot find module '../src/backends/pane-ready.ts' or its corresponding type declarations.
@bryance/orch check: tc           | test/backend-tmux.test.ts(142,9): error TS2339: Property 'paneForeground' does not exist on type 'typeof import("C:/dev/personal/orch/packages/orch/src/commands/lifecycle/reload")'.
@bryance/orch check: tc           | test/backend-tmux.test.ts(220,20): error TS2339: Property 'paneHost' does not exist on type 'TmuxBackend'.
@bryance/orch check: tc           | test/backend-tmux.test.ts(221,20): error TS2339: Property 'paneInventory' does not exist on type 'TmuxBackend'.
@bryance/orch check: tc           | test/backend-tmux.test.ts(222,20): error TS2339: Property 'paneInput' does not exist on type 'TmuxBackend'.
@bryance/orch check: tc           | test/backend-tmux.test.ts(223,20): error TS2551: Property 'paneForeground' does not exist on type 'TmuxBackend'. Did you mean 'foreground'?
@bryance/orch check: tc           | test/backend-tmux.test.ts(224,20): error TS2339: Property 'paneScreen' does not exist on type 'TmuxBackend'.
@bryance/orch check: tc           | test/backend-tmux.test.ts(231,34): error TS2339: Property 'paneInput' does not exist on type 'TmuxBackend'.
@bryance/orch check: tc           | test/backend-tmux.test.ts(254,23): error TS2339: Property 'paneHost' does not exist on type 'TmuxBackend'.
@bryance/orch check: tc           | test/backend-tmux.test.ts(278,20): error TS2339: Property 'paneInventory' does not exist on type 'TmuxBackend'.
@bryance/orch check: tc           | test/backend-tmux.test.ts(286,38): error TS2339: Property 'paneInventory' does not exist on type 'TmuxBackend'.
@bryance/orch check: tc           | test/backend-tmux.test.ts(296,20): error TS2339: Property 'paneInventory' does not exist on type 'TmuxBackend'.
@bryance/orch check: tc           | test/backend-tmux.test.ts(302,20): error TS2339: Property 'paneInventory' does not exist on type 'TmuxBackend'.
@bryance/orch check: tc           | test/backend-tmux.test.ts(325,20): error TS2339: Property 'paneScreen' does not exist on type 'TmuxBackend'.
@bryance/orch check: tc           | test/backend-tmux.test.ts(328,26): error TS2339: Property 'paneScreen' does not exist on type 'TmuxBackend'.
@bryance/orch check: tc           | test/backend-tmux.test.ts(333,13): error TS2339: Property 'paneNaming' does not exist on type 'TmuxBackend'.
@bryance/orch check: tc           | test/backend-tmux.test.ts(343,29): error TS2339: Property 'paneHost' does not exist on type 'TmuxBackend'.
@bryance/orch check: tc           | test/backend-tmux.test.ts(349,13): error TS2339: Property 'paneHost' does not exist on type 'TmuxBackend'.
@bryance/orch check: tc           | test/backend-tmux.test.ts(370,81): error TS2561: Object literal may only specify known properties, but 'targetPane' does not exist in type 'BackendSpawnOpts'. Did you mean to write 'targetHandle'?
@bryance/orch check: tc           | test/backend-tmux.test.ts(386,7): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Object literal may only specify known properties, and 'panes' does not exist in type 'BackendGroupLayout<string>'.
@bryance/orch check: tc           | test/backend-tmux.test.ts(422,81): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Object literal may only specify known properties, and 'paneCount' does not exist in type 'BackendGroup'.
@bryance/orch check: tc           | test/backend-tmux.test.ts(423,87): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Object literal may only specify known properties, and 'paneCount' does not exist in type 'BackendGroup'.
@bryance/orch check: tc           | test/backend-tmux.test.ts(432,102): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Object literal may only specify known properties, and 'paneCount' does not exist in type 'BackendGroup'.
@bryance/orch check: tc           | test/cli-backends-tmux.test.ts(40,20): error TS2339: Property 'paneHost' does not exist on type 'TmuxBackend'.
@bryance/orch check: tc           | test/cli-backends-tmux.test.ts(41,20): error TS2339: Property 'paneInventory' does not exist on type 'TmuxBackend'.
@bryance/orch check: tc           | test/cli-backends-tmux.test.ts(42,20): error TS2339: Property 'paneInput' does not exist on type 'TmuxBackend'.
@bryance/orch check: tc           | test/close-is-keyed-by-agent-id.test.ts(106,27): error TS2740: Type 'OutsideSessionBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | test/close-is-keyed-by-agent-id.test.ts(119,47): error TS2740: Type 'OutsideSessionBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | test/close-is-keyed-by-agent-id.test.ts(132,44): error TS2740: Type 'FakePanedBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | test/close-is-keyed-by-agent-id.test.ts(145,47): error TS2740: Type 'FakePanedBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | test/close-is-keyed-by-agent-id.test.ts(156,27): error TS2740: Type 'FakePanedBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | test/close-reports-every-target.test.ts(87,43): error TS2740: Type 'FakePanedBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | test/close-reports-every-target.test.ts(111,43): error TS2740: Type 'FakePanedBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | test/close-reports-every-target.test.ts(130,43): error TS2740: Type 'FakePanedBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | test/close-reports-every-target.test.ts(142,43): error TS2740: Type 'FakePanedBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | test/commands-lease.test.ts(138,28): error TS2339: Property 'paneInput' does not exist on type 'HeadlessBackend'.
@bryance/orch check: tc           | test/commands-lifecycle.test.ts(6,36): error TS2307: Cannot find module '../src/backends/pane-ready.ts' or its corresponding type declarations.
@bryance/orch check: tc           | test/commands-lifecycle.test.ts(8,10): error TS2305: Module '"../src/commands/lifecycle/reload.ts"' has no exported member 'paneForeground'.
@bryance/orch check: tc           | test/commands-lifecycle.test.ts(52,46): error TS2740: Type 'FakePanedBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | test/commands-lifecycle.test.ts(56,102): error TS2740: Type 'FakePanedBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | test/helpers/backend.ts(4,85): error TS2305: Module '"../../src/types/backend.ts"' has no exported member 'OpenedPane'.
@bryance/orch check: tc           | test/helpers/backend.ts(4,97): error TS2305: Module '"../../src/types/backend.ts"' has no exported member 'OpenPaneRequest'.
@bryance/orch check: tc           | test/helpers/backend.ts(4,139): error TS2305: Module '"../../src/types/backend.ts"' has no exported member 'PaneHostRole'.
@bryance/orch check: tc           | test/helpers/backend.ts(4,153): error TS2305: Module '"../../src/types/backend.ts"' has no exported member 'PaneInventoryRole'.
@bryance/orch check: tc           | test/helpers/backend.ts(4,172): error TS2724: '"../../src/types/backend.ts"' has no exported member named 'PaneNamingRole'. Did you mean 'AgentNamingRole'?
@bryance/orch check: tc           | test/helpers/backend.ts(46,14): error TS2420: Class 'FakePanedBackend' incorrectly implements interface 'Backend<BackendHandle>'.
@bryance/orch check: tc           |   Type 'FakePanedBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | test/one-writer-records-a-spawned-agent.test.ts(72,7): error TS2740: Type 'FakePanedBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | test/one-writer-records-a-spawned-agent.test.ts(99,7): error TS2740: Type 'FakePanedBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | test/one-writer-records-a-spawned-agent.test.ts(109,36): error TS2561: Object literal may only specify known properties, but 'targetPane' does not exist in type 'TilePlacement'. Did you mean to write 'targetHandle'?
@bryance/orch check: tc           | test/rename-syncs-the-pane-border.test.ts(14,32): error TS2724: '"../src/types/backend.ts"' has no exported member named 'PaneNamingRole'. Did you mean 'AgentNamingRole'?
@bryance/orch check: tc           | test/rename-syncs-the-pane-border.test.ts(82,20): error TS7006: Parameter '_handle' implicitly has an 'any' type.
@bryance/orch check: tc           | test/rename-syncs-the-pane-border.test.ts(104,27): error TS2740: Type 'NamingBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | test/rename-syncs-the-pane-border.test.ts(116,43): error TS2740: Type 'NamingBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | test/rename-syncs-the-pane-border.test.ts(128,43): error TS2740: Type 'NamingBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | test/rename-syncs-the-pane-border.test.ts(142,27): error TS2740: Type 'NamingBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | test/spawn-identity.test.ts(79,7): error TS2740: Type 'KeyRecordingBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | test/spawn-identity.test.ts(114,7): error TS2740: Type 'KeyRecordingBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | test/spawn-identity.test.ts(140,7): error TS2740: Type 'KeyRecordingBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | test/spawn-placement.test.ts(98,3): error TS2740: Type 'HomedBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | test/spawn-preferred-models.test.ts(80,12): error TS2740: Type 'CapturingPaneBackend' is missing the following properties from type 'Backend<BackendHandle>': placement, placementInventory, agentInput, foreground, and 3 more.
@bryance/orch check: tc           | test/tiling.test.ts(8,25): error TS2353: Object literal may only specify known properties, and 'panes' does not exist in type 'BackendGroupLayout<BackendHandle>'.
@bryance/orch check: tc           | test/tiling.test.ts(26,67): error TS2551: Property 'targetPane' does not exist on type 'TilePlacement'. Did you mean 'targetHandle'?
@bryance/orch check: tc           | test/tiling.test.ts(45,18): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Object literal may only specify known properties, but 'targetPane' does not exist in type 'TilePlacement'. Did you mean to write 'targetHandle'?
@bryance/orch check: tc           | test/tiling.test.ts(77,60): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Object literal may only specify known properties, but 'targetPane' does not exist in type 'TilePlacement'. Did you mean to write 'targetHandle'?
@bryance/orch check: tc           | test/tiling.test.ts(78,63): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Object literal may only specify known properties, but 'targetPane' does not exist in type 'TilePlacement'. Did you mean to write 'targetHandle'?
@bryance/orch check: tc           | test/tiling.test.ts(89,33): error TS2769: No overload matches this call.
@bryance/orch check: tc           |   The last overload gave the following error.
@bryance/orch check: tc           |     Object literal may only specify known properties, but 'targetPane' does not exist in type 'TilePlacement'. Did you mean to write 'targetHandle'?
@bryance/orch check: tc           | test/tiling.test.ts(98,53): error TS2551: Property 'targetPane' does not exist on type 'TilePlacement'. Did you mean 'targetHandle'?
@bryance/orch check: tc           | test/tiling.test.ts(99,68): error TS2551: Property 'targetPane' does not exist on type 'TilePlacement'. Did you mean 'targetHandle'?
@bryance/orch check: tc           | Exited with code 1
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |     ,-[src/commands/panes.ts:81:3]
@bryance/orch check: lint         |  80 |   if (!renderBoundaryAnswer(plan, json) || plan.outcome !== "invoke") return;
@bryance/orch check: lint         |  81 |   plan.role.sendKeys(handle, keys);
@bryance/orch check: lint         |     :   ^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  82 |   if (json) process.stdout.write(JSON.stringify({ target: handle, keys, sent: true }) + "\n");
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .sendKeys on an `error` typed value.
@bryance/orch check: lint         |     ,-[src/commands/panes.ts:81:13]
@bryance/orch check: lint         |  80 |   if (!renderBoundaryAnswer(plan, json) || plan.outcome !== "invoke") return;
@bryance/orch check: lint         |  81 |   plan.role.sendKeys(handle, keys);
@bryance/orch check: lint         |     :             ^^^^^^^^
@bryance/orch check: lint         |  82 |   if (json) process.stdout.write(JSON.stringify({ target: handle, keys, sent: true }) + "\n");
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:101:9]
@bryance/orch check: lint         |  100 |   if (!renderBoundaryAnswer(plan, json) || plan.outcome !== "invoke") return;
@bryance/orch check: lint         |  101 |   const screen = plan.role.read(handle, n);
@bryance/orch check: lint         |      :         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  102 |   if (json) {
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:101:18]
@bryance/orch check: lint         |  100 |   if (!renderBoundaryAnswer(plan, json) || plan.outcome !== "invoke") return;
@bryance/orch check: lint         |  101 |   const screen = plan.role.read(handle, n);
@bryance/orch check: lint         |      :                  ^^^^^^^^^^^^^^
@bryance/orch check: lint         |  102 |   if (json) {
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .read on an `error` typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:101:28]
@bryance/orch check: lint         |  100 |   if (!renderBoundaryAnswer(plan, json) || plan.outcome !== "invoke") return;
@bryance/orch check: lint         |  101 |   const screen = plan.role.read(handle, n);
@bryance/orch check: lint         |      :                            ^^^^
@bryance/orch check: lint         |  102 |   if (json) {
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:103:65]
@bryance/orch check: lint         |  102 |   if (json) {
@bryance/orch check: lint         |  103 |     process.stdout.write(JSON.stringify({ target, pane: handle, screen, lines: n }) + "\n");
@bryance/orch check: lint         |      :                                                                 ^^^^^^
@bryance/orch check: lint         |  104 |     return;
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-argument): Unsafe argument of type error typed assigned to a parameter of type string | Uint8Array<ArrayBufferLike>.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:107:24]
@bryance/orch check: lint         |  106 |   process.stdout.write("screen (eyeball only - status/result/tail are the truth channel)\n");
@bryance/orch check: lint         |  107 |   process.stdout.write(screen.endsWith("\n") ? screen : screen + "\n");
@bryance/orch check: lint         |      :                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  108 | }
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:107:24]
@bryance/orch check: lint         |  106 |   process.stdout.write("screen (eyeball only - status/result/tail are the truth channel)\n");
@bryance/orch check: lint         |  107 |   process.stdout.write(screen.endsWith("\n") ? screen : screen + "\n");
@bryance/orch check: lint         |      :                        ^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  108 | }
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .endsWith on an `error` typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:107:31]
@bryance/orch check: lint         |  106 |   process.stdout.write("screen (eyeball only - status/result/tail are the truth channel)\n");
@bryance/orch check: lint         |  107 |   process.stdout.write(screen.endsWith("\n") ? screen : screen + "\n");
@bryance/orch check: lint         |      :                               ^^^^^^^^
@bryance/orch check: lint         |  108 | }
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:136:9]
@bryance/orch check: lint         |  135 |   // paneId is the only backend handle for it.
@bryance/orch check: lint         |  136 |   const pane = backend.paneInventory?.list().find((item) => String(item.handle) === ent.paneId);
@bryance/orch check: lint         |      :         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  137 |   const found = groups.find((group) => group.id === (pane?.group ?? null));
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:136:16]
@bryance/orch check: lint         |  135 |   // paneId is the only backend handle for it.
@bryance/orch check: lint         |  136 |   const pane = backend.paneInventory?.list().find((item) => String(item.handle) === ent.paneId);
@bryance/orch check: lint         |      :                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  137 |   const found = groups.find((group) => group.id === (pane?.group ?? null));
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .find on an `error` typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:136:46]
@bryance/orch check: lint         |  135 |   // paneId is the only backend handle for it.
@bryance/orch check: lint         |  136 |   const pane = backend.paneInventory?.list().find((item) => String(item.handle) === ent.paneId);
@bryance/orch check: lint         |      :                                              ^^^^
@bryance/orch check: lint         |  137 |   const found = groups.find((group) => group.id === (pane?.group ?? null));
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:136:16]
@bryance/orch check: lint         |  135 |   // paneId is the only backend handle for it.
@bryance/orch check: lint         |  136 |   const pane = backend.paneInventory?.list().find((item) => String(item.handle) === ent.paneId);
@bryance/orch check: lint         |      :                ^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  137 |   const found = groups.find((group) => group.id === (pane?.group ?? null));
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .list on an `error` typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:136:39]
@bryance/orch check: lint         |  135 |   // paneId is the only backend handle for it.
@bryance/orch check: lint         |  136 |   const pane = backend.paneInventory?.list().find((item) => String(item.handle) === ent.paneId);
@bryance/orch check: lint         |      :                                       ^^^^
@bryance/orch check: lint         |  137 |   const found = groups.find((group) => group.id === (pane?.group ?? null));
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .handle on an `any` value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:136:73]
@bryance/orch check: lint         |  135 |   // paneId is the only backend handle for it.
@bryance/orch check: lint         |  136 |   const pane = backend.paneInventory?.list().find((item) => String(item.handle) === ent.paneId);
@bryance/orch check: lint         |      :                                                                         ^^^^^^
@bryance/orch check: lint         |  137 |   const found = groups.find((group) => group.id === (pane?.group ?? null));
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .group on an `error` typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:137:60]
@bryance/orch check: lint         |  136 |   const pane = backend.paneInventory?.list().find((item) => String(item.handle) === ent.paneId);
@bryance/orch check: lint         |  137 |   const found = groups.find((group) => group.id === (pane?.group ?? null));
@bryance/orch check: lint         |      :                                                            ^^^^^
@bryance/orch check: lint         |  138 |   if (!found) die(`No group found for target "${target}".`);
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:153:9]
@bryance/orch check: lint         |  152 |   // answer: every tab is listed rather than an invented one being matched.
@bryance/orch check: lint         |  153 |   const workspace = backend.paneInventory?.current()?.workspace ?? null;
@bryance/orch check: lint         |      :         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  154 |   const tabs = groups.filter((tab) => all || workspace === null || tab.workspace === workspace);
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .workspace on an `error` typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:153:55]
@bryance/orch check: lint         |  152 |   // answer: every tab is listed rather than an invented one being matched.
@bryance/orch check: lint         |  153 |   const workspace = backend.paneInventory?.current()?.workspace ?? null;
@bryance/orch check: lint         |      :                                                       ^^^^^^^^^
@bryance/orch check: lint         |  154 |   const tabs = groups.filter((tab) => all || workspace === null || tab.workspace === workspace);
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:153:21]
@bryance/orch check: lint         |  152 |   // answer: every tab is listed rather than an invented one being matched.
@bryance/orch check: lint         |  153 |   const workspace = backend.paneInventory?.current()?.workspace ?? null;
@bryance/orch check: lint         |      :                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  154 |   const tabs = groups.filter((tab) => all || workspace === null || tab.workspace === workspace);
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .current on an `error` typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:153:44]
@bryance/orch check: lint         |  152 |   // answer: every tab is listed rather than an invented one being matched.
@bryance/orch check: lint         |  153 |   const workspace = backend.paneInventory?.current()?.workspace ?? null;
@bryance/orch check: lint         |      :                                            ^^^^^^^
@bryance/orch check: lint         |  154 |   const tabs = groups.filter((tab) => all || workspace === null || tab.workspace === workspace);
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-argument): Unsafe argument of type error typed assigned to a parameter of type Iterable<unknown> | null | undefined.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:181:27]
@bryance/orch check: lint         |  180 |   if (force) return;
@bryance/orch check: lint         |  181 |   const handles = new Set((backend.paneInventory?.list() ?? []).filter((pane) => pane.group === group).map((pane) => String(pane.handle)));
@bryance/orch check: lint         |      :                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  182 |   const presence = presenceById();
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:181:27]
@bryance/orch check: lint         |  180 |   if (force) return;
@bryance/orch check: lint         |  181 |   const handles = new Set((backend.paneInventory?.list() ?? []).filter((pane) => pane.group === group).map((pane) => String(pane.handle)));
@bryance/orch check: lint         |      :                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  182 |   const presence = presenceById();
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .map on an `error` typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:181:104]
@bryance/orch check: lint         |  180 |   if (force) return;
@bryance/orch check: lint         |  181 |   const handles = new Set((backend.paneInventory?.list() ?? []).filter((pane) => pane.group === group).map((pane) => String(pane.handle)));
@bryance/orch check: lint         |      :                                                                                                        ^^^
@bryance/orch check: lint         |  182 |   const presence = presenceById();
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:181:27]
@bryance/orch check: lint         |  180 |   if (force) return;
@bryance/orch check: lint         |  181 |   const handles = new Set((backend.paneInventory?.list() ?? []).filter((pane) => pane.group === group).map((pane) => String(pane.handle)));
@bryance/orch check: lint         |      :                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  182 |   const presence = presenceById();
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .filter on an `error` typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:181:65]
@bryance/orch check: lint         |  180 |   if (force) return;
@bryance/orch check: lint         |  181 |   const handles = new Set((backend.paneInventory?.list() ?? []).filter((pane) => pane.group === group).map((pane) => String(pane.handle)));
@bryance/orch check: lint         |      :                                                                 ^^^^^^
@bryance/orch check: lint         |  182 |   const presence = presenceById();
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:181:28]
@bryance/orch check: lint         |  180 |   if (force) return;
@bryance/orch check: lint         |  181 |   const handles = new Set((backend.paneInventory?.list() ?? []).filter((pane) => pane.group === group).map((pane) => String(pane.handle)));
@bryance/orch check: lint         |      :                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  182 |   const presence = presenceById();
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .list on an `error` typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:181:51]
@bryance/orch check: lint         |  180 |   if (force) return;
@bryance/orch check: lint         |  181 |   const handles = new Set((backend.paneInventory?.list() ?? []).filter((pane) => pane.group === group).map((pane) => String(pane.handle)));
@bryance/orch check: lint         |      :                                                   ^^^^
@bryance/orch check: lint         |  182 |   const presence = presenceById();
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .group on an `any` value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:181:87]
@bryance/orch check: lint         |  180 |   if (force) return;
@bryance/orch check: lint         |  181 |   const handles = new Set((backend.paneInventory?.list() ?? []).filter((pane) => pane.group === group).map((pane) => String(pane.handle)));
@bryance/orch check: lint         |      :                                                                                       ^^^^^
@bryance/orch check: lint         |  182 |   const presence = presenceById();
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .handle on an `any` value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:181:130]
@bryance/orch check: lint         |  180 |   if (force) return;
@bryance/orch check: lint         |  181 |   const handles = new Set((backend.paneInventory?.list() ?? []).filter((pane) => pane.group === group).map((pane) => String(pane.handle)));
@bryance/orch check: lint         |      :                                                                                                                                  ^^^^^^
@bryance/orch check: lint         |  182 |   const presence = presenceById();
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:210:9]
@bryance/orch check: lint         |  209 |   const { label, cwd } = parsed;
@bryance/orch check: lint         |  210 |   const workspace = parsed.workspace ?? backend.paneInventory?.current()?.workspace ?? null;
@bryance/orch check: lint         |      :         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  211 |   if (!workspace) die("Could not determine workspace id. Pass --workspace <id>.");
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .workspace on an `error` typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:210:75]
@bryance/orch check: lint         |  209 |   const { label, cwd } = parsed;
@bryance/orch check: lint         |  210 |   const workspace = parsed.workspace ?? backend.paneInventory?.current()?.workspace ?? null;
@bryance/orch check: lint         |      :                                                                           ^^^^^^^^^
@bryance/orch check: lint         |  211 |   if (!workspace) die("Could not determine workspace id. Pass --workspace <id>.");
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:210:41]
@bryance/orch check: lint         |  209 |   const { label, cwd } = parsed;
@bryance/orch check: lint         |  210 |   const workspace = parsed.workspace ?? backend.paneInventory?.current()?.workspace ?? null;
@bryance/orch check: lint         |      :                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  211 |   if (!workspace) die("Could not determine workspace id. Pass --workspace <id>.");
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .current on an `error` typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:210:64]
@bryance/orch check: lint         |  209 |   const { label, cwd } = parsed;
@bryance/orch check: lint         |  210 |   const workspace = parsed.workspace ?? backend.paneInventory?.current()?.workspace ?? null;
@bryance/orch check: lint         |      :                                                                ^^^^^^^
@bryance/orch check: lint         |  211 |   if (!workspace) die("Could not determine workspace id. Pass --workspace <id>.");
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:212:47]
@bryance/orch check: lint         |  211 |   if (!workspace) die("Could not determine workspace id. Pass --workspace <id>.");
@bryance/orch check: lint         |  212 |   const created = backend.groupHome!.create({ workspace, cwd, label });
@bryance/orch check: lint         |      :                                               ^^^^^^^^^
@bryance/orch check: lint         |  213 |   if (json) process.stdout.write(JSON.stringify(created) + "\n");
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:215:25]
@bryance/orch check: lint         |  214 |   else process.stdout.write(`Created group ${created.group.id} "${created.group.label}" - root handle ${String(created.rootHandle)}\n`);
@bryance/orch check: lint         |  215 |   if (backend.paneHost) backend.paneHost.close(created.rootHandle);
@bryance/orch check: lint         |      :                         ^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  216 | }
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .close on an `error` typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:215:42]
@bryance/orch check: lint         |  214 |   else process.stdout.write(`Created group ${created.group.id} "${created.group.label}" - root handle ${String(created.rootHandle)}\n`);
@bryance/orch check: lint         |  215 |   if (backend.paneHost) backend.paneHost.close(created.rootHandle);
@bryance/orch check: lint         |      :                                          ^^^^^
@bryance/orch check: lint         |  216 | }
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:268:3]
@bryance/orch check: lint         |  267 |   if (!renderBoundaryAnswer(plan, json) || plan.outcome !== "invoke") return;
@bryance/orch check: lint         |  268 |   plan.role.focus(handle);
@bryance/orch check: lint         |      :   ^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  269 |   if (json) process.stdout.write(JSON.stringify({ target: handle, focused: true }) + "\n");
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .focus on an `error` typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:268:13]
@bryance/orch check: lint         |  267 |   if (!renderBoundaryAnswer(plan, json) || plan.outcome !== "invoke") return;
@bryance/orch check: lint         |  268 |   plan.role.focus(handle);
@bryance/orch check: lint         |      :             ^^^^^
@bryance/orch check: lint         |  269 |   if (json) process.stdout.write(JSON.stringify({ target: handle, focused: true }) + "\n");
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:291:3]
@bryance/orch check: lint         |  290 |   const zoomMode = mode === "--on" ? "on" : mode === "--off" ? "off" : "toggle";
@bryance/orch check: lint         |  291 |   plan.role.setZoom(handle, zoomMode);
@bryance/orch check: lint         |      :   ^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  292 |   if (json) process.stdout.write(JSON.stringify({ target: handle, mode: zoomMode, zoomed: true }) + "\n");
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .setZoom on an `error` typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:291:13]
@bryance/orch check: lint         |  290 |   const zoomMode = mode === "--on" ? "on" : mode === "--off" ? "off" : "toggle";
@bryance/orch check: lint         |  291 |   plan.role.setZoom(handle, zoomMode);
@bryance/orch check: lint         |      :             ^^^^^^^
@bryance/orch check: lint         |  292 |   if (json) process.stdout.write(JSON.stringify({ target: handle, mode: zoomMode, zoomed: true }) + "\n");
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:303:41]
@bryance/orch check: lint         |  302 |   const layout = readGroupLayout(role, group);
@bryance/orch check: lint         |  303 |   return planTilePlacement({ ...layout, panes: layout.panes.filter((pane) => String(pane.handle) !== mover) }, firstSplit);
@bryance/orch check: lint         |      :                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  304 | }
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:303:48]
@bryance/orch check: lint         |  302 |   const layout = readGroupLayout(role, group);
@bryance/orch check: lint         |  303 |   return planTilePlacement({ ...layout, panes: layout.panes.filter((pane) => String(pane.handle) !== mover) }, firstSplit);
@bryance/orch check: lint         |      :                                                ^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  304 | }
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .filter on an `error` typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:303:61]
@bryance/orch check: lint         |  302 |   const layout = readGroupLayout(role, group);
@bryance/orch check: lint         |  303 |   return planTilePlacement({ ...layout, panes: layout.panes.filter((pane) => String(pane.handle) !== mover) }, firstSplit);
@bryance/orch check: lint         |      :                                                             ^^^^^^
@bryance/orch check: lint         |  304 | }
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .handle on an `any` value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:303:90]
@bryance/orch check: lint         |  302 |   const layout = readGroupLayout(role, group);
@bryance/orch check: lint         |  303 |   return planTilePlacement({ ...layout, panes: layout.panes.filter((pane) => String(pane.handle) !== mover) }, firstSplit);
@bryance/orch check: lint         |      :                                                                                          ^^^^^^
@bryance/orch check: lint         |  304 | }
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
@bryance/orch check: lint         |      ,-[src/commands/panes.ts:341:7]
@bryance/orch check: lint         |  340 |       split = placement.split;
@bryance/orch check: lint         |  341 |       against = placement.targetPane;
@bryance/orch check: lint         |      :       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  342 |     }
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
@bryance/orch check: lint         |     ,-[src/commands/spawn/placement.ts:91:5]
@bryance/orch check: lint         |  90 |   } else {
@bryance/orch check: lint         |  91 |     place = spec.intoHandle;
@bryance/orch check: lint         |     :     ^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  92 |   }
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
@bryance/orch check: lint         |      ,-[src/commands/lifecycle/close.ts:103:9]
@bryance/orch check: lint         |  102 | function plexerStillHasPane(backend: Backend | null, handle: BackendHandle): boolean | null {
@bryance/orch check: lint         |  103 |   const inventory = backend?.paneInventory;
@bryance/orch check: lint         |      :         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  104 |   if (!inventory) return null;
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-return): Unsafe return of a value of type error.
@bryance/orch check: lint         |      ,-[src/commands/lifecycle/close.ts:106:5]
@bryance/orch check: lint         |  105 |   try {
@bryance/orch check: lint         |  106 |     return inventory.list().some((entry) => describeHandle(entry.handle) === describeHandle(handle));
@bryance/orch check: lint         |      :     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  107 |   } catch {
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[src/commands/lifecycle/close.ts:106:12]
@bryance/orch check: lint         |  105 |   try {
@bryance/orch check: lint         |  106 |     return inventory.list().some((entry) => describeHandle(entry.handle) === describeHandle(handle));
@bryance/orch check: lint         |      :            ^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  107 |   } catch {
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .some on an `error` typed value.
@bryance/orch check: lint         |      ,-[src/commands/lifecycle/close.ts:106:29]
@bryance/orch check: lint         |  105 |   try {
@bryance/orch check: lint         |  106 |     return inventory.list().some((entry) => describeHandle(entry.handle) === describeHandle(handle));
@bryance/orch check: lint         |      :                             ^^^^
@bryance/orch check: lint         |  107 |   } catch {
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[src/commands/lifecycle/close.ts:106:12]
@bryance/orch check: lint         |  105 |   try {
@bryance/orch check: lint         |  106 |     return inventory.list().some((entry) => describeHandle(entry.handle) === describeHandle(handle));
@bryance/orch check: lint         |      :            ^^^^^^^^^^^^^^
@bryance/orch check: lint         |  107 |   } catch {
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .list on an `error` typed value.
@bryance/orch check: lint         |      ,-[src/commands/lifecycle/close.ts:106:22]
@bryance/orch check: lint         |  105 |   try {
@bryance/orch check: lint         |  106 |     return inventory.list().some((entry) => describeHandle(entry.handle) === describeHandle(handle));
@bryance/orch check: lint         |      :                      ^^^^
@bryance/orch check: lint         |  107 |   } catch {
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type BackendHandle.
@bryance/orch check: lint         |      ,-[src/commands/lifecycle/close.ts:106:60]
@bryance/orch check: lint         |  105 |   try {
@bryance/orch check: lint         |  106 |     return inventory.list().some((entry) => describeHandle(entry.handle) === describeHandle(handle));
@bryance/orch check: lint         |      :                                                            ^^^^^^^^^^^^
@bryance/orch check: lint         |  107 |   } catch {
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .handle on an `any` value.
@bryance/orch check: lint         |      ,-[src/commands/lifecycle/close.ts:106:66]
@bryance/orch check: lint         |  105 |   try {
@bryance/orch check: lint         |  106 |     return inventory.list().some((entry) => describeHandle(entry.handle) === describeHandle(handle));
@bryance/orch check: lint         |      :                                                                  ^^^^^^
@bryance/orch check: lint         |  107 |   } catch {
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[src/commands/lifecycle/close.ts:199:5]
@bryance/orch check: lint         |  198 |   try {
@bryance/orch check: lint         |  199 |     paneHost.close(handle);
@bryance/orch check: lint         |      :     ^^^^^^^^^^^^^^
@bryance/orch check: lint         |  200 |     return { failure: null, signalled: false, closedByBackend: true, alreadyAbsent: false };
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .close on an `error` typed value.
@bryance/orch check: lint         |      ,-[src/commands/lifecycle/close.ts:199:14]
@bryance/orch check: lint         |  198 |   try {
@bryance/orch check: lint         |  199 |     paneHost.close(handle);
@bryance/orch check: lint         |      :              ^^^^^
@bryance/orch check: lint         |  200 |     return { failure: null, signalled: false, closedByBackend: true, alreadyAbsent: false };
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
@bryance/orch check: lint         |      ,-[src/commands/lifecycle/close.ts:217:11]
@bryance/orch check: lint         |  216 |       try {
@bryance/orch check: lint         |  217 | ,->     const listed = target.backend.paneInventory.list()
@bryance/orch check: lint         |  218 | `->       .some((entry) => describeHandle(entry.handle) === describeHandle(handle));
@bryance/orch check: lint         |  219 |         return listed ? `${describeHandle(handle)} is still listed by ${target.backend.id} after the close` : null;
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[src/commands/lifecycle/close.ts:217:20]
@bryance/orch check: lint         |  216 |       try {
@bryance/orch check: lint         |  217 | ,->     const listed = target.backend.paneInventory.list()
@bryance/orch check: lint         |  218 | `->       .some((entry) => describeHandle(entry.handle) === describeHandle(handle));
@bryance/orch check: lint         |  219 |         return listed ? `${describeHandle(handle)} is still listed by ${target.backend.id} after the close` : null;
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .some on an `error` typed value.
@bryance/orch check: lint         |      ,-[src/commands/lifecycle/close.ts:218:8]
@bryance/orch check: lint         |  217 |     const listed = target.backend.paneInventory.list()
@bryance/orch check: lint         |  218 |       .some((entry) => describeHandle(entry.handle) === describeHandle(handle));
@bryance/orch check: lint         |      :        ^^^^
@bryance/orch check: lint         |  219 |     return listed ? `${describeHandle(handle)} is still listed by ${target.backend.id} after the close` : null;
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[src/commands/lifecycle/close.ts:217:20]
@bryance/orch check: lint         |  216 |   try {
@bryance/orch check: lint         |  217 |     const listed = target.backend.paneInventory.list()
@bryance/orch check: lint         |      :                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  218 |       .some((entry) => describeHandle(entry.handle) === describeHandle(handle));
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .list on an `error` typed value.
@bryance/orch check: lint         |      ,-[src/commands/lifecycle/close.ts:217:49]
@bryance/orch check: lint         |  216 |   try {
@bryance/orch check: lint         |  217 |     const listed = target.backend.paneInventory.list()
@bryance/orch check: lint         |      :                                                 ^^^^
@bryance/orch check: lint         |  218 |       .some((entry) => describeHandle(entry.handle) === describeHandle(handle));
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type BackendHandle.
@bryance/orch check: lint         |      ,-[src/commands/lifecycle/close.ts:218:39]
@bryance/orch check: lint         |  217 |     const listed = target.backend.paneInventory.list()
@bryance/orch check: lint         |  218 |       .some((entry) => describeHandle(entry.handle) === describeHandle(handle));
@bryance/orch check: lint         |      :                                       ^^^^^^^^^^^^
@bryance/orch check: lint         |  219 |     return listed ? `${describeHandle(handle)} is still listed by ${target.backend.id} after the close` : null;
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .handle on an `any` value.
@bryance/orch check: lint         |      ,-[src/commands/lifecycle/close.ts:218:45]
@bryance/orch check: lint         |  217 |     const listed = target.backend.paneInventory.list()
@bryance/orch check: lint         |  218 |       .some((entry) => describeHandle(entry.handle) === describeHandle(handle));
@bryance/orch check: lint         |      :                                             ^^^^^^
@bryance/orch check: lint         |  219 |     return listed ? `${describeHandle(handle)} is still listed by ${target.backend.id} after the close` : null;
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-redundant-type-constituents): 'PaneHostRole' is an 'error' type that acts as 'any' and overrides all other types in this union type.
@bryance/orch check: lint         |      ,-[src/commands/lifecycle/close.ts:234:52]
@bryance/orch check: lint         |  233 | 
@bryance/orch check: lint         |  234 | function closeRoute(target: CloseTarget, paneHost: PaneHostRole | null): CloseRoute {
@bryance/orch check: lint         |      :                                                    ^^^^^^^^^^^^
@bryance/orch check: lint         |  235 |   // Narrowed to the RECORD OF A LIVE PROCESS in one step: a dead pid is the
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
@bryance/orch check: lint         |      ,-[src/commands/lifecycle/close.ts:242:69]
@bryance/orch check: lint         |  241 |   }
@bryance/orch check: lint         |  242 |   if (target.paneKnown && paneHost !== null) return { kind: "pane", paneHost };
@bryance/orch check: lint         |      :                                                                     ^^^^^^^^
@bryance/orch check: lint         |  243 |   // A live process without a launch token cannot be safely signalled or
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
@bryance/orch check: lint         |     ,-[src/commands/spawn/report.ts:82:9]
@bryance/orch check: lint         |  81 |       process.stdout.write(header + "\n");
@bryance/orch check: lint         |  82 | ,->   const rows = layout.panes.map((p) => [
@bryance/orch check: lint         |  83 | |       String(p.handle),
@bryance/orch check: lint         |  84 | |       names.get(String(p.handle)) ?? "-", 
@bryance/orch check: lint         |  85 | |       `${p.rect.width}x${p.rect.height} @${p.rect.x},${p.rect.y}`,
@bryance/orch check: lint         |  86 | `->   ]);
@bryance/orch check: lint         |  87 |       const w0 = Math.max(...rows.map((r) => r[0]!.length), 4);
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |     ,-[src/commands/spawn/report.ts:82:16]
@bryance/orch check: lint         |  81 |   process.stdout.write(header + "\n");
@bryance/orch check: lint         |  82 |   const rows = layout.panes.map((p) => [
@bryance/orch check: lint         |     :                ^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  83 |     String(p.handle),
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .map on an `error` typed value.
@bryance/orch check: lint         |     ,-[src/commands/spawn/report.ts:82:29]
@bryance/orch check: lint         |  81 |   process.stdout.write(header + "\n");
@bryance/orch check: lint         |  82 |   const rows = layout.panes.map((p) => [
@bryance/orch check: lint         |     :                             ^^^
@bryance/orch check: lint         |  83 |     String(p.handle),
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
@bryance/orch check: lint         |      ,-[src/commands/lifecycle/close.ts:265:9]
@bryance/orch check: lint         |  264 | function attemptClose(target: CloseTarget): CloseAttempt {
@bryance/orch check: lint         |  265 |   const paneHost = target.backend?.paneHost ?? null;
@bryance/orch check: lint         |      :         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  266 |   const paneCapable = target.paneKnown && paneHost !== null && target.handle !== null;
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .handle on an `any` value.
@bryance/orch check: lint         |     ,-[src/commands/spawn/report.ts:83:14]
@bryance/orch check: lint         |  82 |   const rows = layout.panes.map((p) => [
@bryance/orch check: lint         |  83 |     String(p.handle),
@bryance/orch check: lint         |     :              ^^^^^^
@bryance/orch check: lint         |  84 |     names.get(String(p.handle)) ?? "-", 
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .handle on an `any` value.
@bryance/orch check: lint         |     ,-[src/commands/spawn/report.ts:84:24]
@bryance/orch check: lint         |  83 |     String(p.handle),
@bryance/orch check: lint         |  84 |     names.get(String(p.handle)) ?? "-", 
@bryance/orch check: lint         |     :                        ^^^^^^
@bryance/orch check: lint         |  85 |     `${p.rect.width}x${p.rect.height} @${p.rect.x},${p.rect.y}`,
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .rect on an `any` value.
@bryance/orch check: lint         |     ,-[src/commands/spawn/report.ts:85:10]
@bryance/orch check: lint         |  84 |     names.get(String(p.handle)) ?? "-", 
@bryance/orch check: lint         |  85 |     `${p.rect.width}x${p.rect.height} @${p.rect.x},${p.rect.y}`,
@bryance/orch check: lint         |     :          ^^^^
@bryance/orch check: lint         |  86 |   ]);
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .rect on an `any` value.
@bryance/orch check: lint         |     ,-[src/commands/spawn/report.ts:85:26]
@bryance/orch check: lint         |  84 |     names.get(String(p.handle)) ?? "-", 
@bryance/orch check: lint         |  85 |     `${p.rect.width}x${p.rect.height} @${p.rect.x},${p.rect.y}`,
@bryance/orch check: lint         |     :                          ^^^^
@bryance/orch check: lint         |  86 |   ]);
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .rect on an `any` value.
@bryance/orch check: lint         |     ,-[src/commands/spawn/report.ts:85:44]
@bryance/orch check: lint         |  84 |     names.get(String(p.handle)) ?? "-", 
@bryance/orch check: lint         |  85 |     `${p.rect.width}x${p.rect.height} @${p.rect.x},${p.rect.y}`,
@bryance/orch check: lint         |     :                                            ^^^^
@bryance/orch check: lint         |  86 |   ]);
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .rect on an `any` value.
@bryance/orch check: lint         |     ,-[src/commands/spawn/report.ts:85:56]
@bryance/orch check: lint         |  84 |     names.get(String(p.handle)) ?? "-", 
@bryance/orch check: lint         |  85 |     `${p.rect.width}x${p.rect.height} @${p.rect.x},${p.rect.y}`,
@bryance/orch check: lint         |     :                                                        ^^^^
@bryance/orch check: lint         |  86 |   ]);
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-argument): Unsafe spread of an error typed type.
@bryance/orch check: lint         |     ,-[src/commands/spawn/report.ts:87:23]
@bryance/orch check: lint         |  86 |   ]);
@bryance/orch check: lint         |  87 |   const w0 = Math.max(...rows.map((r) => r[0]!.length), 4);
@bryance/orch check: lint         |     :                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  88 |   const w1 = Math.max(...rows.map((r) => r[1]!.length), 4);
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |     ,-[src/commands/spawn/report.ts:87:26]
@bryance/orch check: lint         |  86 |   ]);
@bryance/orch check: lint         |  87 |   const w0 = Math.max(...rows.map((r) => r[0]!.length), 4);
@bryance/orch check: lint         |     :                          ^^^^^^^^
@bryance/orch check: lint         |  88 |   const w1 = Math.max(...rows.map((r) => r[1]!.length), 4);
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .map on an `error` typed value.
@bryance/orch check: lint         |     ,-[src/commands/spawn/report.ts:87:31]
@bryance/orch check: lint         |  86 |   ]);
@bryance/orch check: lint         |  87 |   const w0 = Math.max(...rows.map((r) => r[0]!.length), 4);
@bryance/orch check: lint         |     :                               ^^^
@bryance/orch check: lint         |  88 |   const w1 = Math.max(...rows.map((r) => r[1]!.length), 4);
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-return): Unsafe return of a value of type `any`.
@bryance/orch check: lint         |     ,-[src/commands/spawn/report.ts:87:42]
@bryance/orch check: lint         |  86 |   ]);
@bryance/orch check: lint         |  87 |   const w0 = Math.max(...rows.map((r) => r[0]!.length), 4);
@bryance/orch check: lint         |     :                                          ^^^^^^^^^^^^
@bryance/orch check: lint         |  88 |   const w1 = Math.max(...rows.map((r) => r[1]!.length), 4);
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .length on an `any` value.
@bryance/orch check: lint         |     ,-[src/commands/spawn/report.ts:87:48]
@bryance/orch check: lint         |  86 |   ]);
@bryance/orch check: lint         |  87 |   const w0 = Math.max(...rows.map((r) => r[0]!.length), 4);
@bryance/orch check: lint         |     :                                                ^^^^^^
@bryance/orch check: lint         |  88 |   const w1 = Math.max(...rows.map((r) => r[1]!.length), 4);
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access [0] on an `any` value.
@bryance/orch check: lint         |     ,-[src/commands/spawn/report.ts:87:44]
@bryance/orch check: lint         |  86 |   ]);
@bryance/orch check: lint         |  87 |   const w0 = Math.max(...rows.map((r) => r[0]!.length), 4);
@bryance/orch check: lint         |     :                                            ^
@bryance/orch check: lint         |  88 |   const w1 = Math.max(...rows.map((r) => r[1]!.length), 4);
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-argument): Unsafe spread of an error typed type.
@bryance/orch check: lint         |     ,-[src/commands/spawn/report.ts:88:23]
@bryance/orch check: lint         |  87 |   const w0 = Math.max(...rows.map((r) => r[0]!.length), 4);
@bryance/orch check: lint         |  88 |   const w1 = Math.max(...rows.map((r) => r[1]!.length), 4);
@bryance/orch check: lint         |     :                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  89 |   for (const r of rows)
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |     ,-[src/commands/spawn/report.ts:88:26]
@bryance/orch check: lint         |  87 |   const w0 = Math.max(...rows.map((r) => r[0]!.length), 4);
@bryance/orch check: lint         |  88 |   const w1 = Math.max(...rows.map((r) => r[1]!.length), 4);
@bryance/orch check: lint         |     :                          ^^^^^^^^
@bryance/orch check: lint         |  89 |   for (const r of rows)
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .map on an `error` typed value.
@bryance/orch check: lint         |     ,-[src/commands/spawn/report.ts:88:31]
@bryance/orch check: lint         |  87 |   const w0 = Math.max(...rows.map((r) => r[0]!.length), 4);
@bryance/orch check: lint         |  88 |   const w1 = Math.max(...rows.map((r) => r[1]!.length), 4);
@bryance/orch check: lint         |     :                               ^^^
@bryance/orch check: lint         |  89 |   for (const r of rows)
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-return): Unsafe return of a value of type `any`.
@bryance/orch check: lint         |     ,-[src/commands/spawn/report.ts:88:42]
@bryance/orch check: lint         |  87 |   const w0 = Math.max(...rows.map((r) => r[0]!.length), 4);
@bryance/orch check: lint         |  88 |   const w1 = Math.max(...rows.map((r) => r[1]!.length), 4);
@bryance/orch check: lint         |     :                                          ^^^^^^^^^^^^
@bryance/orch check: lint         |  89 |   for (const r of rows)
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .length on an `any` value.
@bryance/orch check: lint         |     ,-[src/commands/spawn/report.ts:88:48]
@bryance/orch check: lint         |  87 |   const w0 = Math.max(...rows.map((r) => r[0]!.length), 4);
@bryance/orch check: lint         |  88 |   const w1 = Math.max(...rows.map((r) => r[1]!.length), 4);
@bryance/orch check: lint         |     :                                                ^^^^^^
@bryance/orch check: lint         |  89 |   for (const r of rows)
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access [1] on an `any` value.
@bryance/orch check: lint         |     ,-[src/commands/spawn/report.ts:88:44]
@bryance/orch check: lint         |  87 |   const w0 = Math.max(...rows.map((r) => r[0]!.length), 4);
@bryance/orch check: lint         |  88 |   const w1 = Math.max(...rows.map((r) => r[1]!.length), 4);
@bryance/orch check: lint         |     :                                            ^
@bryance/orch check: lint         |  89 |   for (const r of rows)
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |     ,-[src/commands/spawn/report.ts:90:31]
@bryance/orch check: lint         |  89 |   for (const r of rows)
@bryance/orch check: lint         |  90 |     process.stdout.write(`  ${r[0]!.padEnd(w0)}  ${r[1]!.padEnd(w1)}  ${r[2]!}\n`);
@bryance/orch check: lint         |     :                               ^^^^^^^^^^^^
@bryance/orch check: lint         |  91 | }
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .padEnd on an `error` typed value.
@bryance/orch check: lint         |     ,-[src/commands/spawn/report.ts:90:37]
@bryance/orch check: lint         |  89 |   for (const r of rows)
@bryance/orch check: lint         |  90 |     process.stdout.write(`  ${r[0]!.padEnd(w0)}  ${r[1]!.padEnd(w1)}  ${r[2]!}\n`);
@bryance/orch check: lint         |     :                                     ^^^^^^
@bryance/orch check: lint         |  91 | }
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access [0] on an `error` typed value.
@bryance/orch check: lint         |     ,-[src/commands/spawn/report.ts:90:33]
@bryance/orch check: lint         |  89 |   for (const r of rows)
@bryance/orch check: lint         |  90 |     process.stdout.write(`  ${r[0]!.padEnd(w0)}  ${r[1]!.padEnd(w1)}  ${r[2]!}\n`);
@bryance/orch check: lint         |     :                                 ^
@bryance/orch check: lint         |  91 | }
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |     ,-[src/commands/spawn/report.ts:90:52]
@bryance/orch check: lint         |  89 |   for (const r of rows)
@bryance/orch check: lint         |  90 |     process.stdout.write(`  ${r[0]!.padEnd(w0)}  ${r[1]!.padEnd(w1)}  ${r[2]!}\n`);
@bryance/orch check: lint         |     :                                                    ^^^^^^^^^^^^
@bryance/orch check: lint         |  91 | }
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .padEnd on an `error` typed value.
@bryance/orch check: lint         |     ,-[src/commands/spawn/report.ts:90:58]
@bryance/orch check: lint         |  89 |   for (const r of rows)
@bryance/orch check: lint         |  90 |     process.stdout.write(`  ${r[0]!.padEnd(w0)}  ${r[1]!.padEnd(w1)}  ${r[2]!}\n`);
@bryance/orch check: lint         |     :                                                          ^^^^^^
@bryance/orch check: lint         |  91 | }
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access [1] on an `error` typed value.
@bryance/orch check: lint         |     ,-[src/commands/spawn/report.ts:90:54]
@bryance/orch check: lint         |  89 |   for (const r of rows)
@bryance/orch check: lint         |  90 |     process.stdout.write(`  ${r[0]!.padEnd(w0)}  ${r[1]!.padEnd(w1)}  ${r[2]!}\n`);
@bryance/orch check: lint         |     :                                                      ^
@bryance/orch check: lint         |  91 | }
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access [2] on an `error` typed value.
@bryance/orch check: lint         |     ,-[src/commands/spawn/report.ts:90:75]
@bryance/orch check: lint         |  89 |   for (const r of rows)
@bryance/orch check: lint         |  90 |     process.stdout.write(`  ${r[0]!.padEnd(w0)}  ${r[1]!.padEnd(w1)}  ${r[2]!}\n`);
@bryance/orch check: lint         |     :                                                                           ^
@bryance/orch check: lint         |  91 | }
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
@bryance/orch check: lint         |      ,-[src/commands/lifecycle/close.ts:362:9]
@bryance/orch check: lint         |  361 |   const { backend, handle, entity } = resolveLifecycleTarget(target);
@bryance/orch check: lint         |  362 |   const input = backend.paneInput;
@bryance/orch check: lint         |      :         ^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  363 |   if (!entity.paneId || !input) {
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[src/commands/lifecycle/close.ts:370:3]
@bryance/orch check: lint         |  369 |   }
@bryance/orch check: lint         |  370 |   input.sendKeys(handle, ["Escape"]);
@bryance/orch check: lint         |      :   ^^^^^^^^^^^^^^
@bryance/orch check: lint         |  371 |   sleepMs(500);
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .sendKeys on an `error` typed value.
@bryance/orch check: lint         |      ,-[src/commands/lifecycle/close.ts:370:9]
@bryance/orch check: lint         |  369 |   }
@bryance/orch check: lint         |  370 |   input.sendKeys(handle, ["Escape"]);
@bryance/orch check: lint         |      :         ^^^^^^^^
@bryance/orch check: lint         |  371 |   sleepMs(500);
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[src/commands/lifecycle/close.ts:372:3]
@bryance/orch check: lint         |  371 |   sleepMs(500);
@bryance/orch check: lint         |  372 |   input.sendKeys(handle, ["Escape"]);
@bryance/orch check: lint         |      :   ^^^^^^^^^^^^^^
@bryance/orch check: lint         |  373 |   if (json) process.stdout.write(JSON.stringify({ target: handle, aborted: true }) + "\n");
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .sendKeys on an `error` typed value.
@bryance/orch check: lint         |      ,-[src/commands/lifecycle/close.ts:372:9]
@bryance/orch check: lint         |  371 |   sleepMs(500);
@bryance/orch check: lint         |  372 |   input.sendKeys(handle, ["Escape"]);
@bryance/orch check: lint         |      :         ^^^^^^^^
@bryance/orch check: lint         |  373 |   if (json) process.stdout.write(JSON.stringify({ target: handle, aborted: true }) + "\n");
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
@bryance/orch check: lint         |     ,-[src/commands/lifecycle/rename.ts:51:9]
@bryance/orch check: lint         |  50 |   // pane naming has no border to sync, which is an answer, not a failure (E14).
@bryance/orch check: lint         |  51 |   const paneNaming = backend.paneNaming;
@bryance/orch check: lint         |     :         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  52 |   if (!paneNaming) return { chrome: "none", chromeError: null };
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |     ,-[src/commands/lifecycle/rename.ts:54:5]
@bryance/orch check: lint         |  53 |   try {
@bryance/orch check: lint         |  54 |     paneNaming.renamePane(handle, name);
@bryance/orch check: lint         |     :     ^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  55 |     return { chrome: "renamed", chromeError: null };
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .renamePane on an `error` typed value.
@bryance/orch check: lint         |     ,-[src/commands/lifecycle/rename.ts:54:16]
@bryance/orch check: lint         |  53 |   try {
@bryance/orch check: lint         |  54 |     paneNaming.renamePane(handle, name);
@bryance/orch check: lint         |     :                ^^^^^^^^^^
@bryance/orch check: lint         |  55 |     return { chrome: "renamed", chromeError: null };
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |     ,-[src/commands/lifecycle/rename.ts:84:7]
@bryance/orch check: lint         |  83 |       if (!backend.paneNaming) throw new Error("target environment has no pane naming role");
@bryance/orch check: lint         |  84 |       backend.paneNaming.renamePane(handle, name);
@bryance/orch check: lint         |     :       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  85 |       outcome = { chrome: "renamed", chromeError: null };
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .renamePane on an `error` typed value.
@bryance/orch check: lint         |     ,-[src/commands/lifecycle/rename.ts:84:26]
@bryance/orch check: lint         |  83 |       if (!backend.paneNaming) throw new Error("target environment has no pane naming role");
@bryance/orch check: lint         |  84 |       backend.paneNaming.renamePane(handle, name);
@bryance/orch check: lint         |     :                          ^^^^^^^^^^
@bryance/orch check: lint         |  85 |       outcome = { chrome: "renamed", chromeError: null };
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-redundant-type-constituents): 'PaneNamingRole' is an 'error' type that acts as 'any' and overrides all other types in this union type.
@bryance/orch check: lint         |     ,-[test/helpers/backend.ts:65:24]
@bryance/orch check: lint         |  64 |   readonly paneZoom = null;
@bryance/orch check: lint         |  65 |   readonly paneNaming: PaneNamingRole | null = null;
@bryance/orch check: lint         |     :                        ^^^^^^^^^^^^^^
@bryance/orch check: lint         |  66 |   readonly agentNaming: AgentNamingRole | null = null;
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[test/backend-herdr.test.ts:279:5]
@bryance/orch check: lint         |  278 |   test("the pane host closes a pane through herdr", () => {
@bryance/orch check: lint         |  279 |     backend.paneHost.close("w0:p2");
@bryance/orch check: lint         |      :     ^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  280 |     expect(herdrArgv.at(-1)).toEqual(["pane", "close", "w0:p2"]);
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .close on an `error` typed value.
@bryance/orch check: lint         |      ,-[test/backend-herdr.test.ts:279:22]
@bryance/orch check: lint         |  278 |   test("the pane host closes a pane through herdr", () => {
@bryance/orch check: lint         |  279 |     backend.paneHost.close("w0:p2");
@bryance/orch check: lint         |      :                      ^^^^^
@bryance/orch check: lint         |  280 |     expect(herdrArgv.at(-1)).toEqual(["pane", "close", "w0:p2"]);
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-argument): Unsafe argument of type error typed assigned to a parameter of type object.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:231:26]
@bryance/orch check: lint         |  230 |     const backend = new TmuxBackend();
@bryance/orch check: lint         |  231 |     expect(Object.hasOwn(backend.paneInput, "foreground")).toBe(false);
@bryance/orch check: lint         |      :                          ^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  232 |     expect(paneForeground(backend, "%1")).toEqual(NO_PANE_FOREGROUND);
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:232:12]
@bryance/orch check: lint         |  231 |     expect(Object.hasOwn(backend.paneInput, "foreground")).toBe(false);
@bryance/orch check: lint         |  232 |     expect(paneForeground(backend, "%1")).toEqual(NO_PANE_FOREGROUND);
@bryance/orch check: lint         |      :            ^^^^^^^^^^^^^^
@bryance/orch check: lint         |  233 |   });
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[test/backend-herdr.test.ts:337:5]
@bryance/orch check: lint         |  336 |     herdrArgv.length = 0;
@bryance/orch check: lint         |  337 |     backend.paneScreen.read("w0:p1", 12);
@bryance/orch check: lint         |      :     ^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  338 |     expect(herdrArgv).toEqual([["pane", "read", "w0:p1", "--source", "recent-unwrapped", "--lines", "12"]]);
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .read on an `error` typed value.
@bryance/orch check: lint         |      ,-[test/backend-herdr.test.ts:337:24]
@bryance/orch check: lint         |  336 |     herdrArgv.length = 0;
@bryance/orch check: lint         |  337 |     backend.paneScreen.read("w0:p1", 12);
@bryance/orch check: lint         |      :                        ^^^^
@bryance/orch check: lint         |  338 |     expect(herdrArgv).toEqual([["pane", "read", "w0:p1", "--source", "recent-unwrapped", "--lines", "12"]]);
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:254:5]
@bryance/orch check: lint         |  253 |   test("rejects an empty handle without invoking tmux", () => {
@bryance/orch check: lint         |  254 |     new TmuxBackend().paneHost.close("");
@bryance/orch check: lint         |      :     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  255 |     expect(execCalls.some((call) => call.file === "tmux" && call.args[0] === "kill-pane")).toBe(false);
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .close on an `error` typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:254:32]
@bryance/orch check: lint         |  253 |   test("rejects an empty handle without invoking tmux", () => {
@bryance/orch check: lint         |  254 |     new TmuxBackend().paneHost.close("");
@bryance/orch check: lint         |      :                                ^^^^^
@bryance/orch check: lint         |  255 |     expect(execCalls.some((call) => call.file === "tmux" && call.args[0] === "kill-pane")).toBe(false);
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:278:12]
@bryance/orch check: lint         |  277 |     const backend = new TmuxBackend();
@bryance/orch check: lint         |  278 |     expect(backend.paneInventory.list()).toEqual([
@bryance/orch check: lint         |      :            ^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  279 |       { handle: "%1", workspace: "main", group: "@1", groupLabel: "agents", name: "worker-a", agent: "pi", focused: true, status: null, sessionPath: null },
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .list on an `error` typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:278:34]
@bryance/orch check: lint         |  277 |     const backend = new TmuxBackend();
@bryance/orch check: lint         |  278 |     expect(backend.paneInventory.list()).toEqual([
@bryance/orch check: lint         |      :                                  ^^^^
@bryance/orch check: lint         |  279 |       { handle: "%1", workspace: "main", group: "@1", groupLabel: "agents", name: "worker-a", agent: "pi", focused: true, status: null, sessionPath: null },
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:286:11]
@bryance/orch check: lint         |  285 |     panes = [orchPane({ paneId: "%1", session: "main", agentKey: "tmuxpane01", agent: "claude" })];
@bryance/orch check: lint         |  286 |     const target = new TmuxBackend().paneInventory.list()[0];
@bryance/orch check: lint         |      :           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  287 |     expect(target?.workspace).toBe("main");
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access [0] on an `error` typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:286:59]
@bryance/orch check: lint         |  285 |     panes = [orchPane({ paneId: "%1", session: "main", agentKey: "tmuxpane01", agent: "claude" })];
@bryance/orch check: lint         |  286 |     const target = new TmuxBackend().paneInventory.list()[0];
@bryance/orch check: lint         |      :                                                           ^
@bryance/orch check: lint         |  287 |     expect(target?.workspace).toBe("main");
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:286:20]
@bryance/orch check: lint         |  285 |     panes = [orchPane({ paneId: "%1", session: "main", agentKey: "tmuxpane01", agent: "claude" })];
@bryance/orch check: lint         |  286 |     const target = new TmuxBackend().paneInventory.list()[0];
@bryance/orch check: lint         |      :                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  287 |     expect(target?.workspace).toBe("main");
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .list on an `error` typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:286:52]
@bryance/orch check: lint         |  285 |     panes = [orchPane({ paneId: "%1", session: "main", agentKey: "tmuxpane01", agent: "claude" })];
@bryance/orch check: lint         |  286 |     const target = new TmuxBackend().paneInventory.list()[0];
@bryance/orch check: lint         |      :                                                    ^^^^
@bryance/orch check: lint         |  287 |     expect(target?.workspace).toBe("main");
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .workspace on an `error` typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:287:20]
@bryance/orch check: lint         |  286 |     const target = new TmuxBackend().paneInventory.list()[0];
@bryance/orch check: lint         |  287 |     expect(target?.workspace).toBe("main");
@bryance/orch check: lint         |      :                    ^^^^^^^^^
@bryance/orch check: lint         |  288 |     expect(target?.agent).toBe("claude");
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .agent on an `error` typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:288:20]
@bryance/orch check: lint         |  287 |     expect(target?.workspace).toBe("main");
@bryance/orch check: lint         |  288 |     expect(target?.agent).toBe("claude");
@bryance/orch check: lint         |      :                    ^^^^^
@bryance/orch check: lint         |  289 |   });
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access [0] on an `error` typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:296:41]
@bryance/orch check: lint         |  295 |     const backend = new TmuxBackend();
@bryance/orch check: lint         |  296 |     expect(backend.paneInventory.list()[0]?.status).toBe("working");
@bryance/orch check: lint         |      :                                         ^
@bryance/orch check: lint         |  297 |   });
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:296:12]
@bryance/orch check: lint         |  295 |     const backend = new TmuxBackend();
@bryance/orch check: lint         |  296 |     expect(backend.paneInventory.list()[0]?.status).toBe("working");
@bryance/orch check: lint         |      :            ^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  297 |   });
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .list on an `error` typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:296:34]
@bryance/orch check: lint         |  295 |     const backend = new TmuxBackend();
@bryance/orch check: lint         |  296 |     expect(backend.paneInventory.list()[0]?.status).toBe("working");
@bryance/orch check: lint         |      :                                  ^^^^
@bryance/orch check: lint         |  297 |   });
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access [0] on an `error` typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:302:41]
@bryance/orch check: lint         |  301 |     const backend = new TmuxBackend();
@bryance/orch check: lint         |  302 |     expect(backend.paneInventory.list()[0]?.status).toBeNull();
@bryance/orch check: lint         |      :                                         ^
@bryance/orch check: lint         |  303 |   });
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:302:12]
@bryance/orch check: lint         |  301 |     const backend = new TmuxBackend();
@bryance/orch check: lint         |  302 |     expect(backend.paneInventory.list()[0]?.status).toBeNull();
@bryance/orch check: lint         |      :            ^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  303 |   });
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .list on an `error` typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:302:34]
@bryance/orch check: lint         |  301 |     const backend = new TmuxBackend();
@bryance/orch check: lint         |  302 |     expect(backend.paneInventory.list()[0]?.status).toBeNull();
@bryance/orch check: lint         |      :                                  ^^^^
@bryance/orch check: lint         |  303 |   });
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[test/backend-herdr.test.ts:359:5]
@bryance/orch check: lint         |  358 |     herdrArgv.length = 0;
@bryance/orch check: lint         |  359 |     backend.paneInput.submit("w0:p1", "ls");
@bryance/orch check: lint         |      :     ^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  360 | 
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .submit on an `error` typed value.
@bryance/orch check: lint         |      ,-[test/backend-herdr.test.ts:359:23]
@bryance/orch check: lint         |  358 |     herdrArgv.length = 0;
@bryance/orch check: lint         |  359 |     backend.paneInput.submit("w0:p1", "ls");
@bryance/orch check: lint         |      :                       ^^^^^^
@bryance/orch check: lint         |  360 | 
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-return): Unsafe return of a value of type error.
@bryance/orch check: lint         |      ,-[test/backend-herdr.test.ts:367:20]
@bryance/orch check: lint         |  366 |     try {
@bryance/orch check: lint         |  367 |       expect(() => backend.paneNaming.renamePane("w0:p1", "renamed")).toThrow("pane rename failed");
@bryance/orch check: lint         |      :                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  368 |     } finally {
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[test/backend-herdr.test.ts:367:20]
@bryance/orch check: lint         |  366 |     try {
@bryance/orch check: lint         |  367 |       expect(() => backend.paneNaming.renamePane("w0:p1", "renamed")).toThrow("pane rename failed");
@bryance/orch check: lint         |      :                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  368 |     } finally {
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .renamePane on an `error` typed value.
@bryance/orch check: lint         |      ,-[test/backend-herdr.test.ts:367:39]
@bryance/orch check: lint         |  366 |     try {
@bryance/orch check: lint         |  367 |       expect(() => backend.paneNaming.renamePane("w0:p1", "renamed")).toThrow("pane rename failed");
@bryance/orch check: lint         |      :                                       ^^^^^^^^^^
@bryance/orch check: lint         |  368 |     } finally {
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:325:12]
@bryance/orch check: lint         |  324 |     captureResult = "line one\nline two";
@bryance/orch check: lint         |  325 |     expect(backend.paneScreen.read("%1", 100)).toBe("line one\nline two");
@bryance/orch check: lint         |      :            ^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  326 | 
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .read on an `error` typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:325:31]
@bryance/orch check: lint         |  324 |     captureResult = "line one\nline two";
@bryance/orch check: lint         |  325 |     expect(backend.paneScreen.read("%1", 100)).toBe("line one\nline two");
@bryance/orch check: lint         |      :                               ^^^^
@bryance/orch check: lint         |  326 | 
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-return): Unsafe return of a value of type error.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:328:18]
@bryance/orch check: lint         |  327 |     captureResult = null;
@bryance/orch check: lint         |  328 |     expect(() => backend.paneScreen.read("%1", 100)).toThrow();
@bryance/orch check: lint         |      :                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  329 |   });
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:328:18]
@bryance/orch check: lint         |  327 |     captureResult = null;
@bryance/orch check: lint         |  328 |     expect(() => backend.paneScreen.read("%1", 100)).toThrow();
@bryance/orch check: lint         |      :                  ^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  329 |   });
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .read on an `error` typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:328:37]
@bryance/orch check: lint         |  327 |     captureResult = null;
@bryance/orch check: lint         |  328 |     expect(() => backend.paneScreen.read("%1", 100)).toThrow();
@bryance/orch check: lint         |      :                                     ^^^^
@bryance/orch check: lint         |  329 |   });
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:333:5]
@bryance/orch check: lint         |  332 |     const backend = new TmuxBackend();
@bryance/orch check: lint         |  333 |     backend.paneNaming.renamePane("%1", "border-label");
@bryance/orch check: lint         |      :     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  334 |     backend.agentNaming.renameAgent("%1", "agent-label");
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .renamePane on an `error` typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:333:24]
@bryance/orch check: lint         |  332 |     const backend = new TmuxBackend();
@bryance/orch check: lint         |  333 |     backend.paneNaming.renamePane("%1", "border-label");
@bryance/orch check: lint         |      :                        ^^^^^^^^^^
@bryance/orch check: lint         |  334 |     backend.agentNaming.renameAgent("%1", "agent-label");
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:343:11]
@bryance/orch check: lint         |  342 |     const key = mintAgentId();
@bryance/orch check: lint         |  343 |     const created = backend.paneHost.open({ cwd: "/work", group: "@1", split: "right", targetPane: "%7", env: { [LAUNCH_ENV]: key, FOO: "bar" } });
@bryance/orch check: lint         |      :           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  344 |     expect(created.handle).toBe("%1");
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:343:21]
@bryance/orch check: lint         |  342 |     const key = mintAgentId();
@bryance/orch check: lint         |  343 |     const created = backend.paneHost.open({ cwd: "/work", group: "@1", split: "right", targetPane: "%7", env: { [LAUNCH_ENV]: key, FOO: "bar" } });
@bryance/orch check: lint         |      :                     ^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  344 |     expect(created.handle).toBe("%1");
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .open on an `error` typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:343:38]
@bryance/orch check: lint         |  342 |     const key = mintAgentId();
@bryance/orch check: lint         |  343 |     const created = backend.paneHost.open({ cwd: "/work", group: "@1", split: "right", targetPane: "%7", env: { [LAUNCH_ENV]: key, FOO: "bar" } });
@bryance/orch check: lint         |      :                                      ^^^^
@bryance/orch check: lint         |  344 |     expect(created.handle).toBe("%1");
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .handle on an `error` typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:344:20]
@bryance/orch check: lint         |  343 |     const created = backend.paneHost.open({ cwd: "/work", group: "@1", split: "right", targetPane: "%7", env: { [LAUNCH_ENV]: key, FOO: "bar" } });
@bryance/orch check: lint         |  344 |     expect(created.handle).toBe("%1");
@bryance/orch check: lint         |      :                    ^^^^^^
@bryance/orch check: lint         |  345 |     expect(callArgs("tmux", "split-window")).toEqual([
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:349:5]
@bryance/orch check: lint         |  348 |     ]);
@bryance/orch check: lint         |  349 |     backend.paneHost.close(created.handle);
@bryance/orch check: lint         |      :     ^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  350 |     expect(execCalls.some((call) => call.args.join(" ") === "kill-pane -t %1")).toBe(true);
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .close on an `error` typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:349:22]
@bryance/orch check: lint         |  348 |     ]);
@bryance/orch check: lint         |  349 |     backend.paneHost.close(created.handle);
@bryance/orch check: lint         |      :                      ^^^^^
@bryance/orch check: lint         |  350 |     expect(execCalls.some((call) => call.args.join(" ") === "kill-pane -t %1")).toBe(true);
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .handle on an `error` typed value.
@bryance/orch check: lint         |      ,-[test/backend-tmux.test.ts:349:36]
@bryance/orch check: lint         |  348 |     ]);
@bryance/orch check: lint         |  349 |     backend.paneHost.close(created.handle);
@bryance/orch check: lint         |      :                                    ^^^^^^
@bryance/orch check: lint         |  350 |     expect(execCalls.some((call) => call.args.join(" ") === "kill-pane -t %1")).toBe(true);
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .close on an `error` typed value.
@bryance/orch check: lint         |      ,-[test/close-reports-every-target.test.ts:109:22]
@bryance/orch check: lint         |  108 |     const backend = new FakePanedBackend({ id: "headless", panes: [fakePane("w7:p2C")] });
@bryance/orch check: lint         |  109 |     backend.paneHost.close = (): never => { throw new Error("herdr refused: pane is busy"); };
@bryance/orch check: lint         |      :                      ^^^^^
@bryance/orch check: lint         |  110 | 
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-call): Unsafe call of a(n) `error` type typed value.
@bryance/orch check: lint         |     ,-[test/commands-lifecycle.test.ts:51:12]
@bryance/orch check: lint         |  50 |     const backend = new FakePanedBackend();
@bryance/orch check: lint         |  51 |     expect(paneForeground(backend, "p1")).toEqual(NO_PANE_FOREGROUND);
@bryance/orch check: lint         |     :            ^^^^^^^^^^^^^^
@bryance/orch check: lint         |  52 |     const result = reloadAgentAndAwaitBridge(backend, "p1", "agent00001", "reload");
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-return): Unsafe return of a value of type error.
@bryance/orch check: lint         |      ,-[test/one-writer-records-a-spawned-agent.test.ts:115:44]
@bryance/orch check: lint         |  114 |     expect(view?.environment.space).toBeNull();
@bryance/orch check: lint         |  115 |     expect(backend.opened.map((request) => request.workspace)).toEqual(["w7"]);
@bryance/orch check: lint         |      :                                            ^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  116 |   });
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-member-access): Unsafe member access .workspace on an `error` typed value.
@bryance/orch check: lint         |      ,-[test/one-writer-records-a-spawned-agent.test.ts:115:52]
@bryance/orch check: lint         |  114 |     expect(view?.environment.space).toBeNull();
@bryance/orch check: lint         |  115 |     expect(backend.opened.map((request) => request.workspace)).toEqual(["w7"]);
@bryance/orch check: lint         |      :                                                    ^^^^^^^^^
@bryance/orch check: lint         |  116 |   });
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         | Found 0 warnings and 150 errors.
@bryance/orch check: lint         | Finished in 1.2s on 501 files with 65 rules using 24 threads.
@bryance/orch check: lint         | Exited with code 1
@bryance/orch check: Exited with code 1
error: script "check:orch" exited with code 1
