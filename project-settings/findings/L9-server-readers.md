## 1. Settings reads

- `daemon/server/tabs.ts:97` — enclosing function not identified from the search result; reads settings to select a backend, with no project key apparent; no agent/directory scope identified. `path:line` — `packages/orch/src/daemon/server/tabs.ts:97`.
- `daemon/server/state.ts:62` — enclosing function not identified; `buildFleetStatus` reads the current settings; scope is `directory` (directory value). `path:line` — `packages/orch/src/daemon/server/state.ts:62`.
- `daemon/server/council.ts:76` — reads `council.directory` (project); scoped by `ref.cwd` and `ref.name` (directory/name). `path:line` — `packages/orch/src/daemon/server/council.ts:76`.
- `daemon/server/council.ts:106` — reads settings; keys and enclosing function not established from the search result. `path:line` — `packages/orch/src/daemon/server/council.ts:106`.
- `daemon/server/council.ts:162` — reads settings; keys and enclosing function not established from the search result. `path:line` — `packages/orch/src/daemon/server/council.ts:162`.
- `daemon/server/council.ts:213` — reads `council.rounds` (project); council directory is in scope. `path:line` — `packages/orch/src/daemon/server/council.ts:213`.
- `daemon/server/orchd.ts:88` — settings callback reads `pty` (install); no project scope. `path:line` — `packages/orch/src/daemon/server/orchd.ts:88`.
- `daemon/server/orchd.ts:103` — settings callback reads `links.receipt_ttl_ms` (install); no project scope. `path:line` — `packages/orch/src/daemon/server/orchd.ts:103`.
- `daemon/server/orchd.ts:106` — callback returns current settings; no keys read at this line. `path:line` — `packages/orch/src/daemon/server/orchd.ts:106`.
- `daemon/server/orchd.ts:126` — reads `logging.slow_tool_ms` (install). `path:line` — `packages/orch/src/daemon/server/orchd.ts:126`.
- `daemon/server/orchd.ts:152-153` — reads settings for initialization and log level; keys not established from the search result. `path:line` — `packages/orch/src/daemon/server/orchd.ts:152`.
- `daemon/server/orchd.ts:158` — reads `daemon.subscriber_queue_bytes` (install). `path:line` — `packages/orch/src/daemon/server/orchd.ts:158`.
- `daemon/server/orchd.ts:186` — passes nullable settings to `modelChoicesOf`; no project scope identified. `path:line` — `packages/orch/src/daemon/server/orchd.ts:186`.
- `daemon/server/orchd.ts:241` — reads `daemon.liveness_poll_ms` (install). `path:line` — `packages/orch/src/daemon/server/orchd.ts:241`.
- `daemon/server/orchd.ts:243` — reads `logging` (install). `path:line` — `packages/orch/src/daemon/server/orchd.ts:243`.
- `daemon/server/orchd.ts:249` — reads `daemon.work_tick_ms` (install). `path:line` — `packages/orch/src/daemon/server/orchd.ts:249`.
- `daemon/server/orchd.ts:265` — reads `daemon.outbox_drain_ms` (install). `path:line` — `packages/orch/src/daemon/server/orchd.ts:265`.
- `daemon/server/work-loop.ts:105` — `workerRules` receives settings; keys and enclosing function not established. `path:line` — `packages/orch/src/daemon/server/work-loop.ts:105`.
- `daemon/server/work-loop.ts:143` — passes current settings to `deliverControl`; keys and agent/directory scope not established. `path:line` — `packages/orch/src/daemon/server/work-loop.ts:143`.
- `daemon/server/work-loop.ts:148,289` — reads `timeouts.dispatch_ack_ms` (install). `path:line` — `packages/orch/src/daemon/server/work-loop.ts:148`.
- `daemon/server/work-loop.ts:297,305` — passes settings to `settleError`; keys and scope not established. `path:line` — `packages/orch/src/daemon/server/work-loop.ts:297`.
- `daemon/server/work-loop.ts:300` — passes settings to `deliverTaskResult`; task ID is in scope. `path:line` — `packages/orch/src/daemon/server/work-loop.ts:300`.
- `daemon/server/work-loop.ts:315` — reads `notify` (install); `entry.key` is the associated agent key in the enclosing dispatch logic. `path:line` — `packages/orch/src/daemon/server/work-loop.ts:315`.
- `daemon/server/work-loop.ts:321` — reads settings; keys not established. `path:line` — `packages/orch/src/daemon/server/work-loop.ts:321`.
- `daemon/server/work-loop.ts:364` — reads `queue.dispatch_concurrency` (install). `path:line` — `packages/orch/src/daemon/server/work-loop.ts:364`.
- `daemon/server/terminal-relaunch.ts:30,37` — reads `timeouts.reset_ready_ms`, `timeouts.reset_poll_ms`, and `timeouts.abort_gap_ms` (install). `path:line` — `packages/orch/src/daemon/server/terminal-relaunch.ts:30`.
- `daemon/server/session-agents.ts:162` — packages current settings with `key` into a result; no settings keys read at this line. `path:line` — `packages/orch/src/daemon/server/session-agents.ts:162`.
- `daemon/server/spawn/index.ts:106,272,328,406` — assigns current settings to `settingsFile`; keys and enclosing functions not established from search results. `path:line` — `packages/orch/src/daemon/server/spawn/index.ts:106`.

Other target directories: not found in the `current()` / `currentOrNull()` search. This does not establish whether functions read settings through typed `OrchSettings` parameters.

## 2. Project-key scope

- `council.directory` at `daemon/server/council.ts:76`: `ref.cwd` and `ref.name`; `ref` type not established.
- `council.rounds` at `daemon/server/council.ts:213`: council directory; concrete variable/type not established.
- All other identified reads are install-only or lack a project-key identification in the search result; project scope: none established.

## 3. Functions taking `OrchSettings`

Not established. The search identified imports/usages and settings callbacks, but did not inspect signatures and call sites comprehensively.

## 4. Server calls into policy/settings/util modules

Not established. The broad source search found `OrchSettings` declarations in policy and utility-adjacent modules, but did not inspect each candidate's signature, keys read, and server callers. Names visible in search results include `memoryRefusal`, `formatMemoryLine`, `gatedPatterns`, `workerHeaderContextOf`, `agentMayWriteSetting`, `grantAgentSetting`, `revokeAgentSetting`, `agentSettingRefusal`, `workerPolicyFrom`, `readOnlyPolicy`, `isAllowedModel`, and `admitModel`; caller mapping and key reads remain unverified.
