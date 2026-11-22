## src/daemon/server/council.ts(76,70)
**Called**: none; `directoryOf` reads `state.services.settings.current().council.directory`.
**Reads**: `council.directory` (project), `packages/orch/src/daemon/server/council.ts:76`.
**Other callers**: `councilNamed` at `packages/orch/src/daemon/server/council.ts:81` (server); convene at `:98` (server).
**For whom**: `ref.cwd`, request directory.

## src/daemon/server/council.ts(107,30)
**Called**: none; direct `settings.council.scale` read.
**Reads**: `council.scale` (project), `packages/orch/src/daemon/server/council.ts:107`.
**Other callers**: none.
**For whom**: `params` council-convene request; directory from `params.cwd`.

## src/daemon/server/council.ts(112,33)
**Called**: `memberTabs`, `packages/orch/src/council/lineup.ts` (parameter declaration not inspected).
**Reads**: `fleet.max_agents_per_tab` (project), passed as tab grouping limit at `packages/orch/src/daemon/server/council.ts:112`.
**Other callers**: none.
**For whom**: `params.cwd`, council-convene request directory.

## src/daemon/server/council.ts(163,31)
**Called**: none; direct `settings.council.rounds` read.
**Reads**: `council.rounds` (project), `packages/orch/src/daemon/server/council.ts:163`.
**Other callers**: none.
**For whom**: `council`, a `CouncilRecord` resolved by request name and cwd.

## src/daemon/server/council.ts(179,121)
**Called**: `workerHeaderContextOf`, `packages/orch/src/policy/spawner.ts`; parameter receives settings (declared settings type).
**Reads**: `settings` passed at `packages/orch/src/daemon/server/council.ts:179`; downstream key reads not determined.
**Other callers**: `packages/orch/src/daemon/server/council.ts:179` (server, only observed call).
**For whom**: `view: AgentView`, keyed to council member `member.agentId`.

## src/daemon/server/council.ts(213,126)
**Called**: none; direct `council.rounds` read.
**Reads**: `council.rounds` (project), `packages/orch/src/daemon/server/council.ts:213`.
**Other callers**: none.
**For whom**: `council`, a `CouncilRecord` resolved by name and cwd.

## src/daemon/server/handlers/close.ts(8,5)
**Called**: `closeTargetsFor`, `packages/orch/src/entities/close-targets.ts`; settings parameter typed `OrchSettings`.
**Reads**: settings passed through; downstream settings keys not determined.
**Other callers**: `packages/orch/src/daemon/server/handlers/drive.ts` (server; `closeTargetOfAgent` is distinct), no other `closeTargetsFor` caller identified.
**For whom**: `params.targets`, request targets (agent keys).

## src/daemon/server/handlers/drive.ts(28,57)
**Called**: `deliverControl`, `packages/orch/src/control/dispatch.ts`; settings parameter typed `OrchSettings`.
**Reads**: `settings` passed to dispatcher; downstream reads not determined.
**Other callers**: `packages/orch/src/daemon/server/handlers/drive.ts:28` (server).
**For whom**: `agent`, `HereAgent` (agent row/id).

## src/daemon/server/handlers/fleet.ts(26,58)
**Called**: `buildEntities`, `packages/orch/src/entities/inventory.ts`; settings parameter typed `OrchSettings`.
**Reads**: downstream settings keys not determined.
**Other callers**: `fleetSnapshot` at `packages/orch/src/daemon/server/handlers/fleet.ts:26` (server).
**For whom**: none.

## src/daemon/server/handlers/fleet.ts(40,54)
**Called**: `heldCapacity`, `packages/orch/src/daemon/server/capacity.ts`; settings parameter type not inspected.
**Reads**: downstream settings keys not determined.
**Other callers**: `capacityOf` at `packages/orch/src/daemon/server/handlers/fleet.ts:40` (server).
**For whom**: none.

## src/daemon/server/handlers/fleet.ts(48,35)
**Called**: `resolveTargetFor`, `packages/orch/src/entities/resolve.ts`; settings parameter typed `OrchSettings`.
**Reads**: downstream settings keys not determined.
**Other callers**: `runsOf` at `packages/orch/src/daemon/server/handlers/fleet.ts:48` (server).
**For whom**: `target`, request target (agent key/name).

## src/daemon/server/handlers/harness.ts(43,63)
**Called**: `syncAdapterSettingsFiles`, `packages/orch/src/adapters/registry.ts`; settings parameter typed `OrchSettings`.
**Reads**: downstream keys not determined.
**Other callers**: `syncHarnessFiles` at `packages/orch/src/daemon/server/handlers/harness.ts:43` (server).
**For whom**: none.

## src/daemon/server/handlers/machine.ts(48,132)
**Called**: `probeNotifiers`, `packages/orch/src/daemon/server/notifier-probe.ts`; parameter `OrchSettings | null`.
**Reads**: downstream keys not determined.
**Other callers**: `machineHandlers` at `packages/orch/src/daemon/server/handlers/machine.ts:48` (server).
**For whom**: none.

## src/daemon/server/handlers/machine.ts(59,51)
**Called**: `setupIntegrate`, `packages/orch/src/daemon/server/setup.ts`; parameter is `Pick<Services, "logger" | "orchDir" | "settings">`.
**Reads**: settings passed through; key reads not determined.
**Other callers**: `machineHandlers` at `packages/orch/src/daemon/server/handlers/machine.ts:59` (server).
**For whom**: none.

## src/daemon/server/handlers/machine.ts(60,68)
**Called**: `probeNotifiers`, `packages/orch/src/daemon/server/notifier-probe.ts`; parameter `OrchSettings | null`.
**Reads**: downstream keys not determined.
**Other callers**: `machineHandlers` at `packages/orch/src/daemon/server/handlers/machine.ts:48` (server), `:60` (server).
**For whom**: none.

## src/daemon/server/handlers/owned.ts(13,41)
**Called**: function/property not identified from error alone; settings value passed where `OrchSettings` expected.
**Reads**: not determined.
**Other callers**: not determined.
**For whom**: not determined.

## src/daemon/server/handlers/resolve.ts(20,52)
**Called**: function/property not identified from error alone; settings value passed where `OrchSettings` expected.
**Reads**: not determined.
**Other callers**: not determined.
**For whom**: not determined.

## src/daemon/server/handlers/resolve.ts(50,62)
**Called**: function/property not identified from error alone; settings value passed where `OrchSettings` expected.
**Reads**: not determined.
**Other callers**: not determined.
**For whom**: not determined.

## src/daemon/server/handlers/review.ts(58,52)
**Called**: none; direct `settings.worktrees` read.
**Reads**: `worktrees` (project), `packages/orch/src/daemon/server/handlers/review.ts:58`.
**Other callers**: none.
**For whom**: not determined.

## src/daemon/server/handlers/review.ts(73,52)
Same as src/daemon/server/handlers/review.ts(58,52)

## src/daemon/server/handlers/review.ts(125,81)
Same as src/daemon/server/handlers/review.ts(58,52)

## src/daemon/server/handlers/space.ts(28,39)
**Called**: function/property not identified; settings passed where `OrchSettings` expected.
**Reads**: not determined.
**Other callers**: not determined.
**For whom**: not determined.

## src/daemon/server/handlers/space.ts(52,14)
**Called**: assignment to `DaemonClient` property; expected `DaemonClient` type.
**Reads**: not determined.
**Other callers**: not determined.
**For whom**: none.

## src/daemon/server/handlers/table.ts(127,68)
**Called**: function/property not identified; settings passed where `LockSettings` expected.
**Reads**: not determined.
**Other callers**: not determined.
**For whom**: not determined.

## src/daemon/server/handlers/table.ts(213,90)
**Called**: none; direct `settings.worktrees` read.
**Reads**: `worktrees` (project), `packages/orch/src/daemon/server/handlers/table.ts:213`.
**Other callers**: none.
**For whom**: not determined.

## src/daemon/server/handlers/table.ts(226,55)
**Called**: function/property not identified; settings passed where `OrchSettings` expected.
**Reads**: not determined.
**Other callers**: not determined.
**For whom**: not determined.

## src/daemon/server/handlers/write.ts(137,53)
**Called**: function/property not identified; settings passed where `OrchSettings` expected.
**Reads**: not determined.
**Other callers**: not determined.
**For whom**: not determined.

## src/daemon/server/handlers/write.ts(364,42)
**Called**: function/property not identified; `InstallSettings | null` passed where `OrchSettings | null` expected.
**Reads**: not determined.
**Other callers**: not determined.
**For whom**: not determined.

## src/daemon/server/handlers/write.ts(398,53)
**Called**: function/property not identified; settings passed where `OrchSettings` expected.
**Reads**: not determined.
**Other callers**: not determined.
**For whom**: not determined.
