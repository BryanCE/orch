# A1 ripple — spawn registration, the work loop, and their fixtures

Scope: `TASKS/02-scope.md` A1 / Rule 11. Identity is the minted id and nothing
else; the plexer and the space are ENVIRONMENT, written to their own tables and
read back through `agentView(orchDir, id)`.

## Runtime

### `src/store/spawn-registration.ts`

- **`SpawnRegistration.space?: string`** (`:24`) — the axis the writer never had.
  A spawn stating a space records it; a spawn stating none records **no row**.
- **`if (input.space !== undefined) setSpace(directory, agentId, now, input.space);`**
  (`:66`) — through the EXISTING writer, imported at `:4`
  (`setAgentPlexer, setHandle, setSpace, setTuning` from `./interval-rows.ts`).
  No second writer, no `INSERT` of its own.
- The space catalogue row is a **precondition**, not something this writer
  invents: A7 says a space is user-created and optional, never minted from a
  path, and `agent_spaces.space_id` has an FK to `spaces.id` with
  `PRAGMA foreign_keys = ON`. There is exactly one `INSERT OR IGNORE INTO spaces`
  in the tree (`src/presence/store.ts:200`, private); duplicating it here was
  rejected.
- No composite key remains: the only address handling is
  `parseIdentity(input.key).id` (`:38`), which now throws on anything but ten
  lowercase alphanumerics.

### `src/daemon/work-loop.ts`

- `spawnedRecords()` (a whole-fleet scan, and now typed `Map<string, AgentView>`)
  is gone; `import { agentView } from "../store/agent-view.ts"` at `:21`.
- `dispatchTask` composes once (`:106-108`, `:113`):
  - `const runnerId = currentAttempt(task)?.agentId ?? tryParseIdentity(entry.key)?.id;`
  - `const view = runnerId === undefined ? null : agentView(options.orchDir, runnerId);`
  - `const adapterId = view?.harnessId ?? entry.status?.agent;` — the harness is a
    hub column, was `record.adapter`.
  - `const spawnerKey = view?.spawnedBy ?? entry.status?.spawnedBy;` — provenance,
    and a presence key IS that spawner's minted id.
  - the duplicate `agentId` local at the old `:116` was folded into `runnerId`.
- `runnerOf` (`:60`) already read only the id; its doc comment at `:52-58` still
  described a key as "the plexer, that plexer's own grouping, and the minted id"
  and now states that a key IS the id.
- No segment parsing anywhere: `grep -n '~' src/daemon/work-loop.ts` → no hits.

## Fixtures

| file | change | proof |
|---|---|---|
| `test/identity.test.ts` | rewritten: the 8 percent-escaping round-trip cases were tests that environment SURVIVES a trip through identity. Now covers `serializeIdentity`/`parseIdentity`/`isAgentId`/`tryParseIdentity` over minted ids, with `herdr~wF~p2` and `headless~local~42` as REJECTED input | `:36` key contains no `/ ~ : % \`; `:57-58` both spellings throw |
| `test/commands-panes.test.ts` | already on the new shape when this slice opened | `:9-10` |
| `test/spawn-identity.test.ts` | `as unknown as Backend` replaced by `class KeyRecordingBackend extends FakePanedBackend` (Rule 13 — a COMPLETE typed value, not a cast); new `describe("A1: spawn registration records the space as an environment axis")` covering the three cases: space → one open `agent_spaces` interval + composed `environment`; no space → `[]` rows and `space: null`; a MOVE closes the old interval and keeps the id | `:139-231` |
| `test/presence-schema.test.ts` | `tmux~workspace-a~%255` / `headless~workspace-a~ag7k2m9x1p` / `headless~workspace-b~zq4n8b3t7v` → `mintAgentId()`. The registry test now asserts the COMPOSED view (`id`, `harnessId`, `cwd`, `environment: { plexer, handle, space }`) instead of the flat `pane/backend/handle/adapter` row | `:143-166` |
| `test/daemon-rpc.test.ts` | `serializeIdentity({ backend: "headless", workspace: "local", id: "no-pane" })` → `serializeIdentity({ id: mintAgentId() })` | `:137` |
| `test/daemon-status-lease.test.ts` | `headless~local~worker` → `WORKER_ID = "worker0001"`, agent row keyed on it; unknown-key case now `"missingkey0"` | `:32-35`, `:41`, `:49` |
| `test/status-unleased.test.ts` | same key change; the `Entity` fixture's `backend: "headless"` / `space: "local"` are now `null` — a detached agent is in no plexer and no space, which is a missing row, not a place | `:41-52` |
| `test/control-dispatch.test.ts` | `target(backend, id)` built `headless~local~<id>` for 11 call sites; now `target()` returns `serializeIdentity({ id: mintAgentId() })` and the plexer is stated to `recordSpawned({ backend })` | `:26-32` |
| `test/dispatch-channel-first.test.ts` | `headless~local~detached` → `detached01` / `detached02` | `:39-41`, `:55` |
| `test/work-loop-identity.test.ts` | `RUNNER_KEY = serializeIdentity({ id: "runner0000" })`, stranger likewise | `:18-21`, `:67` |
| `test/work-loop-binding.test.ts` | `RUNNER_KEY` id was `"runner"` (6 chars, no longer a legal id) → `"runner0000"`, agent row renamed to match; attempt fixture `agentId` → `"worker0001"` | `:18`, `:35-37`, `:46` |
| `test/claude-adapter.test.ts` | `serializeIdentity({ backend: "herdr", workspace: "w9", id: "p1" })` → `serializeIdentity({ id: mintAgentId() })`; the top-level `await import("../src/adapters/claude.ts")` became a static import placed AFTER `import "../src/adapters/registry.ts"` (see blocker 2) | `:8-14`, `:22` |
| `test/check-bridge.test.ts` | unchanged — its `backend + "~" + workspace + "~" + id` strings are the FORBIDDEN pattern being detected, not fixtures | `:183-197`, `:280` |

## Verification

- `bunx tsc --noEmit` — **clean, zero errors, whole tree**.
- 121 tests across the 13 listed files: **120 pass, 1 fail**, the failure being
  blocker 1 below (outside this slice's files).

## Blockers outside this slice's files

1. **`test/check-bridge.test.ts:143` fails** — `src/commands/setup.ts:611` was
   rewritten to
   `const key = after.find((view) => !before.has(view.id) && view.environment.plexer === "headless")?.id;`
   but `CORE_SCOPE_ALLOWLIST` in `scripts/check-bridge.ts:232` still holds the
   OLD line (`after.get(candidate)?.backend === "headless"`). The plexer compare
   in setup.ts is also redundant — `!before.has(view.id)` already identifies the
   agent `cmdSpawn(["--backend", "headless", …])` just created — so the better
   fix is to DELETE the compare from setup.ts and drop the allowlist entry, not
   to re-bless it. Owner: whoever holds `src/commands/setup.ts`.

2. **Import-cycle fragility** (pre-existing, hit here for the first time):
   `src/adapters/claude.ts:4` → `src/config.ts:12` → `src/runtime.ts:5` →
   `src/adapters/registry.ts:6` → back to `claude.ts`. Any entry point that
   reaches `adapters/claude.ts` FIRST dies with
   `ReferenceError: Cannot access 'claudeAdapter' before initialization` at
   `registry.ts:8` (`bun -e 'import "./src/adapters/claude.ts"'` reproduces it).
   Worked around inside the test by entering at the registry; the cycle itself is
   still there.

3. **`src/commands/spawn.ts:678` does not pass the space.** `registerSpawnedAgent`
   can now record it, but `spawnOneIntoTab` still writes the space only through
   the legacy `recordSpawned(key, { space: spec.space })` at `:665`. When
   `recordSpawned` is deleted, `space: spec.space` must be added to the
   `registerSpawnedAgent` call or every pane spawn loses its space.

4. **No shared `ensureSpace`.** The only one is private at
   `src/presence/store.ts:200`. When `recordSpawned` goes, that catalogue write
   needs a home next to `ensureHarness` / `ensurePlexer` in
   `src/store/agent-rows.ts`, imported by both callers — not copied.
