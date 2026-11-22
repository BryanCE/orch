## 1. Settings reads

- `relaunch.ts:39`, `readySeconds`: `timeouts.reset_ready_ms` (install).
- `relaunch.ts:90`, reload handler: settings passed to `refreshStaleShims`; this function receives the full settings value, keys read downstream are not locally visible.
- `relaunch.ts:98`, relaunch handler: settings assigned for subsequent reads; see `relaunch.ts:99` onward.
- `relaunch.ts:157`, relaunch handler: settings passed to `relaunchPolicy`; keys read downstream are not locally visible.
- `relaunch.ts:210`, attach/relaunch handler: settings passed to `refreshStaleShims`; downstream keys not locally visible.
- `wait.ts:19`, `waitHere`: `timeouts.reset_poll_ms` (install).
- `close.ts:8`, close handler: settings passed to close policy; keys are read downstream, not at this expression.
- `resolve.ts:18`, `resolveTargetEntity`: settings passed to `resolveTargetFor`; reads are downstream.
- `resolve.ts:50`, `resolveLifecycleEntity`: settings passed to `lifecycleResolutionFor`; reads are downstream.
- `restart-form.ts:64`, restart handler: settings passed to `relaunchPolicy`; downstream keys not locally visible.
- `restart-form.ts:83`, `requireReopen`: full settings passed to `driver.reopens`; downstream keys not locally visible.
- `review.ts:58`, `actOnWorktree`: `worktrees` (project); downstream reads within the invoked worktree operation are not visible here.
- `review.ts:73`, `reviewsOf`: `worktrees.branch_prefix` (project).
- `review.ts:125`, review handler: `worktrees` (project), passed to `actOnWorktreeHere`.
- `space.ts:28`, `homePlexer`: full settings passed to `selectBackend`; keys read downstream are not locally visible.
- `write.ts:115`, write handler: `mail` (install).
- `write.ts:137`, control delivery handler: full settings passed to `deliverControl`; keys read downstream are not locally visible.
- `write.ts:162`, outbox handler: `daemon.outbox_max_attempts` (install).
- `write.ts:284`, dispatch handler: `timeouts.dispatch_ack_ms` (install).
- `machine.ts:34`, machine notification handler: `notification` (install).
- `machine.ts:60`, notifier probe handler: settings passed to `probeNotifiers`; downstream keys not locally visible.
- `fleet.ts:20`, fleet handler: settings assigned for subsequent reads; see `fleet.ts:21` onward.
- `fleet.ts:40`, `capacityOf`: full settings passed to `heldCapacity`; downstream keys not locally visible.
- `fleet.ts:48`, fleet target handler: settings passed to `resolveTargetFor`; downstream keys not locally visible.
- `lifecycle.ts:70`, model application/spawn handler: full settings passed to `admitModel`; downstream keys not locally visible.
- `lifecycle.ts:78`, spawn handler: `defaults.forms` (project).
- `lifecycle.ts:101`, spawn handler: full settings passed to `assertHostAdmits`; downstream keys not locally visible.
- `lifecycle.ts:163`, `applyModel`: full settings passed to `deliverControl`; downstream keys not locally visible.
- `lifecycle.ts:240`, reset handler: `timeouts.reset_ready_ms` and `timeouts.reset_poll_ms` (install).
- `lifecycle.ts:258`, `applyVerb`: full settings passed to `deliverControl`; downstream keys not locally visible.
- `pane.ts:61`, placement handler: `tiling.first_split` (install).
- `owned.ts:13`, owned-agent handler: full settings passed to `buildEntities`; downstream keys not locally visible.
- `harness.ts:43`, harness sync handler: full settings passed to `syncAdapterSettingsFiles`; downstream keys not locally visible.
- `table.ts:114`, notification handler: `notification` (install).
- `table.ts:127`, command-lock handler: full settings passed to `lockCommand`; downstream keys not locally visible.
- `table.ts:213`, clean handler: `worktrees` (project).
- `table.ts:226`, orch-list handler: full settings passed to `peerOrchs`; downstream keys not locally visible.
- `host.ts:87`, `driveOnHost`: `timeouts` passed to `driveWaitMs`; the helper reads the action-specific timeout field (install).
- `screen.ts:83`, `screenHandlers`: `attach.queue_bytes` (install).
- `host-add.ts:24`, host scan handler: `links` (install).
- `host-add.ts:30`, host trust handler: `links` (install).
- `host-add.ts:35`, `hostKey`: `links` (install).
- `host-add.ts:48`, host setup handler: `links` (install), then subsequent lines use the local value.
- `drive.ts:28`, `abortHere`: full settings passed to `deliverControl`; downstream keys not locally visible.

## 2. Project-key scope

- `review.ts:58`: `key: string` identifies the agent; `worktrees` is project-scoped.
- `review.ts:73`: no agent/directory selector in this function; `worktrees.branch_prefix` is project-scoped.
- `review.ts:125`: `params.key` identifies the agent; `worktrees` is project-scoped.
- `lifecycle.ts:78`: `key` identifies the agent; `defaults.forms` is project-scoped.
- `table.ts:213`: `params` identifies the clean operation, but no agent key or project directory is selected in this function; `worktrees` is project-scoped.

## 3. Functions taking `OrchSettings`

- `host.ts:55`: `driveWaitMs(timeouts: OrchSettings["timeouts"], request: PeerDrive): number`. Caller: `host.ts:87` (`driveOnHost`).
- No other function in the handler files was found with a parameter explicitly typed `OrchSettings`. Search: `OrchSettings` across `packages/orch/src/daemon/server/handlers/`; the sole function parameter is `driveWaitMs`. `command-lock.ts:26` defines a `LockSettings` pick type, not an `OrchSettings` function parameter.
