## 1. `acceptResultReport`

```ts
export function acceptResultReport(
  orchDir: OrchDir,
  key: string,
  result: ResultReport,
  now = Date.now(),
): { ok: true } {
  if (agentView(orchDir, key) === null) throw new Error(`agent ${key} does not exist`);
  writeResult(key, orchDir, { ts: now, key, ...result });
  const dispatchId = result.dispatchId ?? selectAgentStatus(orchDir, key)?.dispatchId ?? null;
  if (dispatchId === null) return { ok: true };
  try {
    upsertRun(orchDir, runFromResult(dispatchId, key, result, now));
  } catch {
    // History is a bystander: a failed run write cannot reject a report.
  }
  return { ok: true };
}
```
Caller: `tableHandlers` handles `report-result` in `packages/orch/src/daemon/server/handlers/table.ts:124`; `acceptPromptReport` is not a caller.

## 2. Presence history appenders

`packages/orch/src/presence/history.ts`:
- `presenceRoot(root: OrchDir): string`, `presenceAgentDir(key: string, root: OrchDir): string`, `ensurePresenceAgentDir(key: string, root: OrchDir): string | undefined`: directory helpers, append no file.
- `reportHistoryFailures(report: (error: unknown) => void): void`: sets error callback, appends no file.
- `flushPresenceHistory(): void`: flushes queued appends to queued per-agent file paths; records are serialized `PresenceRecord`.
- `writeResult(key: string, root: OrchDir, result: PresenceRecord): void`: `RESULTS_FILE` (`results.jsonl`).
- `appendOutcome(key: string, root: OrchDir, outcome: PresenceRecord): void`: `OUTCOMES_FILE` (`outcomes.jsonl`).
- `appendStatusHistory(key: string, root: OrchDir, record: PresenceRecord): void`: `STATUS_LOG_FILE` (`status.jsonl`).

## 3. Runs store

`packages/orch/src/db/schema.ts:81-101` defines `runs`: primary key is `dispatch_id`; fields include agent key, adapter/model/space/task, state, start/finish instants, usage, result, and last error. A run id is the dispatch id itself (one run per dispatch).

`packages/orch/src/store/run-rows.ts` exported signatures: `onRunUpserted(listener: RunListener): void`, `upsertRun(directory: OrchDir, run: RunRecord): void`, `selectRuns(directory: OrchDir, filter: { agentKey?: string; limit?: number } = {}): RunRecord[]`, `latestResultTexts(directory: OrchDir): Map<string, string>`, `settledDispatchIds(directory: OrchDir): Set<string>`, `selectRun(directory: OrchDir, dispatchId: string): RunRecord | undefined`, `deleteRunsBefore(directory: OrchDir, cutoff: number): number`.

## 4. Run completion

`acceptStatusReport` writes an end-state run from the status row; `acceptResultReport` writes a `done` run. `session-agents.ts:119` (orch-driven ACP/session) reports status and calls `acceptResultReport` when outcome is done. The headless oneshot path is not a result-report caller; its process completion is handled through status/liveness paths. The grep `rg -n 'upsertRun|finishedAt|acceptResultReport' packages/orch/src` identifies these writes.

## 5. Agent log reader

Rule 20's reader is `packages/orch/src/agent/read.ts`, exported `readAgent(reader: AgentReader, agent: HereAgent, read: AgentRead): AgentReading`; command call path is `packages/orch/src/commands/results.ts` → `readAgentThroughOrchd` → RPC `agent-read` with `{ kind: "tail" }` (`results.ts:187-207`). Reader accepts typed read requests, not an arbitrary path; log/session location is obtained from the agent's stored session path/log path in the reader implementation.

## 6. Placement lookups

`packages/orch/src/process-place.ts:66-69`:
```ts
export function hereAgentIfAny(orchDir: OrchDir, id: string): HereAgent | null {
  const place = placeAgentIfAny(orchDir, id);
  return place === null ? null : hereOrNull(place);
}
```

`packages/orch/src/store/interval-rows.ts:69-72`:
```ts
export function agentLocation(orchDir: OrchDir, agentId: string): AgentLocation | undefined {
  return agentLocations(orchDir).get(agentId);
}
```

## 7. `orch runs`

Registry entry: `packages/orch/src/commands/registry.ts:71`, `name: "runs"`, observe section. Command file: `packages/orch/src/commands/runs.ts`, `cmdRuns`; sends RPC `runs` and formats via `renderRuns` (which builds its rows directly; no shared table helper). Handler: `packages/orch/src/daemon/server/handlers/fleet.ts:43-49`, `runsOf`, selecting via `selectRuns`. RPC params/result schema is the `runs` method in the daemon RPC protocol schema; command call is at `runs.ts:58`.

## 8. Done transition ordering

`acceptStatusReport` in `packages/orch/src/daemon/server/status-report.ts:79-100` records status and attempts `upsertRun` before it publishes the `transitionEventFromRow` event. Thus its run upsert is queued before the transition fires; `queueWrite` is asynchronous, so the database commit is not guaranteed complete at publish time. `acceptResultReport` does not publish a transition.
