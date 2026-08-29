# Wave 2 final

## Verdict

**PASS: 8 · ISSUES: 2**

## 1) Scoped test run

**ISSUE — not run in this worker pane.** The requested `orch lock run -- bun test ...` requires shelling out to the `orch` CLI, which worker instructions prohibit. Existing `test-results.md` records the herdr-notify-hardening test as PASS, but is not treated as a fresh scoped run.

## 2) Wave 2 review ISSUES re-check

- **Herdr notification expectation — PASS.** `test-results.md:252` reports `herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value` passing; expected name is `pi-agent`.
- **Bare `orch events` daemon hello scope — PASS.** `src/commands/events.ts:61` calls `rpcHello(orchDir())` whenever default `mine` is true; `parseEventsOptions` initializes `mine = true` at line 152. `accepts` applies the hello id through `eventInScope` at lines 73–80; `--any-agent` is the explicit bypass.
- **Rule 13 casts — PASS.** `src/commands/panes.ts` now narrows with `isBackendSplit` (no cast); `src/store/spawned-rows.ts` now validates rows with `isSpawnedRow` (no cast).

## 3) New checks

- **Single dispatch — PASS.** `grep -rn 'writeRpc("dispatch"' src` matches exactly once at `src/commands/control.ts:207`, inside `dispatchToAgent`. `src/commands/spawn.ts` contains neither `deliverControl` nor `randomUUID`.
- **Rename/name propagation — PASS.** `src/commands/lifecycle.ts:352-374` calls normalized `renameAgent`, which updates `agents.name`; `src/entities.ts:65-70,151-154` and `src/daemon/events.ts:143-165` read the normalized agent name for status/events.
- **Prompt/task cardinality — PASS.** `src/commands/spawn.ts:312-318` rejects N+1 `--prompt` values and requires `--tasks` length exactly N during settings resolution, before `executeSpawn` reaches `groupHome.create` at line 849.
- **Diff cast/any scan — PASS.** No added `as` casts or `any` declarations found; `import * as path` and prose/comment occurrences are not casts/type declarations.

## 4) Rule 8 shape compatibility

**ISSUES (1 violation class):** name reads still fall back to spawned-row names when `agents.name` is absent:

- `src/entities.ts:65-70` — `recipientName`: `normalizedAgentName(key) ?? record?.name ...`
- `src/entities.ts:151-154` — backend entity name: `normalizedAgentName(key) ?? records.get(key)?.name ...`

This accepts both the normalized `agents.name` shape and the legacy spawned-row name shape. No `DaemonRegistration` dual shape was found: `src/daemon/lifecycle.ts:parseRegistration` requires `orchDir` and all current fields, with no fallback.
