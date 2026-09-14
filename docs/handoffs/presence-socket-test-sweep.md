---
slug: presence-socket-test-sweep
created: 2026-09-14
cwd: /home/bryan/orch
branch: main
next-session-focus: Spawn 4 orchs and dispatch the remaining test-sweep tasks from the scratchpad specs (close resolution fix first), batching the mechanical ones, then checkpoint with bare `bun check`, Bryan's build + daemon reload + full suite.
---

# Handoff: agent state off status.json, test sweep after the migration

## Context
Agent status, results, and control outcomes now travel over the daemon socket (`report-status`, `report-result`, `control-outcome`) and live in the store table `agent_status`; files under `$ORCH_DIR/agents/<id>/` are orchd-written history only (Rule 18, added to CLAUDE.md this job). The source cut landed in earlier commits. Bryan generated the `agent_status` migration (`packages/orch/drizzle/20260914064144_adorable_kree/`), which unblocked every store-backed test. This session converted the tests that still seeded state through `status.json` into store-row seeding and fixed the source bugs that surfaced. The job runs as orch waves: recon orchs write reports, I write the task list, orchs get exact specs. All specs and reports are in the session scratchpad `/tmp/claude-1000/-home-bryan-orch/e6aba003-6a40-4d6b-9667-1504ce346f4c/scratchpad/` (`wave2.md`, `wave3.md`, `specs/T*.md`, `reports/red-a2.md`, `reports/red-b.md`, `reports/red-c.md`, `reports/recon-close.md`). If that dir is gone, the task text below is enough to recut.

## What's been done
- `bun db:reset --with-sessions`: `livePresenceHolders` (`packages/orch/src/store/connection.ts`) returns `{ workers, sessions }` by `agents.spawned_by`; `assertStoreRecreatable(orchDir, { withSessions })` always refuses on a live worker, refuses on a live driving session unless the flag. `scripts/db/reset.ts` parses the flag, dry-run names both lists. `commands/clean.ts` merges both. Committed by Bryan.
- `test/store-connection-guards.test.ts`: worker case seeds a spawner, new session/flag test, `beforeEach` clears `LAUNCH_ENV` so it passes under a spawned runner (7 pass).
- Test files converted to store seeding and green: commands-results (16), commands-clean (5), command-space-fields (3), transfer-does-not-disturb (5), owner-scoping (17), offline-is-not-a-second-source (4, static checks now point at `src/commands/status/fetch.ts` and `status/index.ts`), presence-dirs-are-reaped-not-migrated (4), adapter-pi (6), claude-adapter + codex-adapter (16, shim tests assert socket reports via a real `startRpcServer`), status-renders-one-row-shape (3), peer-identity + peer-lease-visibility (24), bridge-terminal (2), doctor-stale-presence (green in its own file).
- `test/presence-schema.test.ts` deleted (tested the shape of a file that no longer exists).
- Source fixes: `src/adapters/claude.ts` and `src/adapters/pi.ts` return `presence.result` (typed `string | null`) before the transcript/session fallback, object-shaped `{text}` branch removed. `src/presence/store.ts` `reapDeadPresenceDirs` ages an entry by max(status.updatedAt, status.finishedAt, view.endedAt, view.createdAt) and never reaps an unaged row. `src/commands/results.ts` missing-result reason no longer names results.jsonl. `src/daemon/peer-view.ts` keeps an unplaced space as `null` and treats a null project as visible. `src/doctor/presence.ts` `checkStalePresence` flags malformed dir names as `fail` and describes dead agents as `name (key) | project X | last seen`.
- Published orch skill (`packages/orch/skills/orch/SKILL.md`, synced to `~/.agents/skills/orch/`): Waves section, plus this session's addition that the orchestrator sizes each dispatch for speed (batch small mechanical tasks, orch tests once at the end, orchestrator runs the wider checks).
- Whole-tree `bun check` is green as of the last edit. Fleet closed, monitor stopped. Uncommitted: SKILL.md, adapters/pi.ts, daemon/peer-view.ts, doctor/presence.ts, and the bridge-terminal, doctor-stale-presence, peer-identity tests.

## What's left
- **close-always.test.ts (8 fail).** Report `reports/recon-close.md`: the CLI child inherits the harness session markers (`PI_CODING_AGENT`/`PI_SESSION_ID`) so `callerKind` is "session", `selfIdentity` finds no row for that token, and `callerMayResolve` (`src/entities/resolve.ts:34-42`) drops every target before `resolveLifecycleTarget` (`src/commands/target.ts:336-354`). Decide: strip harness markers from `runCli`'s env in the test (operator path), or seed the caller with the inherited session token. Also the helper `recordProcess` inserts no `agent_plexers` row, so its agents fail the backend lookup at `target.ts:351-353`; give it `setAgentPlexer(dir, key, "headless")`. Then `:287` (exit 0 expected) should follow.
- **retention.test.ts** rewrite per `specs/T60.md`: the five dir tests at ~:176-226 become row tests using `seedAgent` + `agent_endings` + `mergeAgentStatus(..., Date.parse(old))` + `ensurePresenceAgentDir`; delete the "malformed" and "result-only" tests. Two `ended_agents: 0` expectations at ~:117/:129 received 1 before the T61 fix; recheck.
- **agent-key-is-minted-id.test.ts** (`specs/T71.md`): ~:174 double-inserts the agent (seedAgent then seedStatus); ~:223 should now pass with the doctor fix.
- **daemon-rpc.test.ts:512** (`T70`), **spawn-identity.test.ts:130** (`T72`), **bridge-links.test.ts** 4 tests (`T76`, double insert), **commands-daemon.test.ts:31** (`T77`, subsystems fixture `presenceWatch` → `livenessTick`), **peer-project-scope.test.ts:52** (`T78`). All are seeding conversions; batch them.
- **PRESENCE_SCHEMA import sweep**, 18 test files still import it from `src/presence/schema.ts` and write status.json that nothing reads: rename-syncs-the-pane-border, close-is-keyed-by-agent-id, agent-key-is-minted-id, a-row-is-not-a-pane, spawn-policy, cli-backends-herdr-headless, commands-runs, commands-lease, port-seam-channel, space-policy, owner-scoping, status-renders-one-row-shape, backend-headless, presence-dirs-are-reaped-not-migrated, doctor-backends, close-reports-every-target, retention, doctor-stale-presence. Batch ~6 files per dispatch; remove the writes and the import, seed rows only where the test reads state back.
- Checkpoint 2: bare `bun check`, then Bryan runs `bun run build:orch:dev`, `orch daemon reload`, full suite, and `git cmt`.
- Known but untouched: `orch tail <agent>` printed "(no entries)" for a working orch whose status row pointed at a fresh session file; not investigated.

## Gotchas
- `bun check <file...>` from the repo root does NOT check those files: the root script is `bun run --parallel`, which runs positional args as scripts. It executed `scripts/db/reset.ts` this session. Always run bare `bun check`. Every spec header now says so.
- Bryan's own driving sessions were what blocked `bun db:reset`; the fix is the flag, not closing them.
- Orchs are spawned agents, so their test runs carry the launch credential; tests on the user/operator path fail under them with "a spawned agent never ...". Treat as `inherited credential`, verify from the driving session.
- `agentView` is exported from `src/store/agent-view.ts`, not `agent-rows.ts`. `AgentView.cwd` is on the view, not on `environment`.
- `seedStatus` (`test/helpers/presence.ts`) now returns the key and inserts the agent row if absent; calling `insertAgent`/`seedAgent` after it double-inserts.
- Two Claude sessions share this checkout; Bryan commits both fleets' work. Don't touch `daemon/state.ts` or `commands/status/*` without checking `git status` first.
- Bryan's process rules from this session: I write the task list from orch reports before any implementing dispatch; orchs are slaves with exact 1-3 minute tasks; size batches for speed; orchs test once at the end; never dispatch specs before the list exists.

## Suggested skills
`orch`, `cmt`, `principle-type-system-discipline`, `typescript-best-practices`