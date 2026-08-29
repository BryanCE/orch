# A1 ripple — commands / policy / herdr HUD

Slice: TASKS/02-scope.md **A1**, following the `Identity = { id }` rewrite of
`src/backends/identity.ts`. Files in scope: `src/commands/control.ts`,
`src/commands/events.ts`, `src/commands/results.ts`, `src/policy/name.ts`,
`src/backends/herdr/hud.ts` and their tests.

Method: test-first. Every change below was driven by a test that was run and seen
to fail against the old code, then run green against the new.

---

## 1. `src/commands/events.ts` — audit §1.4, §5.4

**Was:** `: parsed !== null && (options.all || parsed.workspace === currentSpace());`
— the event stream was scoped by a space segment sliced out of the identity key,
so a moved or adopted agent kept streaming into the space it was *born* in.

**Now:** a named, testable predicate that reads the agent's **current** space
through the composer (`spaceOf` → `placementOf` → `agentView().environment.space`):

- `src/commands/events.ts:76-78` — `export function eventInSpaceScope(root, key, callerSpace, all)`
  → `return all || sameSpace(spaceOf(root, key), callerSpace);`
- `src/commands/events.ts:91` — `: agentId !== null && eventInSpaceScope(orchDir(), agentId, currentSpace(), options.all);`
- `src/commands/events.ts:88-89` — the double `tryParseIdentity(key)` collapsed to one
  lookup, because the key IS the minted id; no second id space.
- `src/commands/events.ts:98` — `spawnedRecords().get(agentId ?? key)?.spawnedBy ?? undefined`
  (the composed view's `spawnedBy` is `string | null`; the scope field's absent
  case is `undefined` — the field was **not** widened to accept null).

**Proof no composite key remains:** `grep -n "\.workspace" src/commands/events.ts` → no match.

**Tests** (`test/commands-events.test.ts`, new `describe("commands/events space scope")`):
an agent streams into the space it currently occupies; **moving an agent moves
its events with it** (identity key untouched, scope follows); `--all` streams
every space and an unplaced caller scopes to none; a key naming no registered
agent is in no space. Red before, green after.

---

## 2. `src/policy/name.ts` — audit §5.6

**Was:** `agentName(record.pane) === name && record.space === space && …` — the
name's uniqueness scope came from the flat `spawned` row keyed by the composite
identity, via a local `agentName()` that hand-parsed the key.

**Now:** one composed read, no key parsing, no second name lookup:

- `src/policy/name.ts:23-26` —
  `[...spawnedRecords(orchDir()).values()].find((view) => view.name === name && sameSpace(view.environment.space, space) && presence.get(view.id)?.alive === true)`
- `src/policy/name.ts:27` — the refusal names the agent by its minted id (`taken.id`).
- Deleted: the `agentName()` helper, the `tryParseIdentity` import and the
  `agentById` import — the composed view already carries the name.

**Proof:** `src/policy/name.ts` no longer imports `../backends/identity.ts`; the
only space read is `view.environment.space` at `:25`.

**Tests** (`test/spawn-names.test.ts`, rewritten onto `mintAgentId()` keys):
live name claimed / dead name released / another space never blocks, plus the new
`describe("name scope follows the agent's current space, not its birthplace")` —
moving an agent moves the name it holds (it frees `w1` and claims `w2` with the
identity key unchanged), and the collision message names the minted id.

---

## 3. `src/backends/herdr/hud.ts` — audit §1.4, §1.6, §5.1

**Was:** six reads of `AGENT_IDENTITY?.backend === "herdr"` (lines 33, 39, 52, 65,
169, 246) plus `AGENT_IDENTITY.id` used **as the herdr pane handle** — the HUD's
two questions ("am I in a herdr pane", "which pane am I") were both answered out
of the identity key, frozen at module import. An agent that moved pane went on
painting the pane it had left.

**Now:** both answers are composed environment, asked for on every call:

- `src/backends/herdr/hud.ts:52-65` — `herdrPaneHandle()`:
  `isAgentId(process.env.ORCH_AGENT_KEY)` → `environmentOf(orchDir(), id)` →
  `environment.plexer === HERDR_PLEXER ? environment.handle : null`.
  `null` is a real answer (no plexer / no handle); no `"headless"` or `"local"`
  literal is ever substituted. A store that is not there yet returns `null`, not a
  crash — this runs inside the agent.
- `src/backends/herdr/hud.ts:37` — `const HERDR_PLEXER = "herdr"` is the plexer's
  own provider recognising its own rows, inside `src/backends/<plexer>/` (audit
  §5.2 tolerance). No core module gained a plexer literal.
- `src/backends/herdr/hud.ts:77` — `herdrHudActive()` → `herdrPaneHandle() !== null`.
- `src/backends/herdr/hud.ts:41-43` — `herdrSocketPath()` replaces the two
  import-time env constants, so the socket gate is re-evaluated, not frozen.
- `src/backends/herdr/hud.ts:113-118` — the status reporter reports only against
  the pane this process occupies **right now** (`paneId === herdrPaneHandle()`).
- `src/backends/herdr/hud.ts:87` — `sendHerdrMetadata(paneId, customStatus)` takes
  the handle as an argument instead of reading it off the identity.
- `src/backends/herdr/hud.ts:159` / `:196` — `findHerdrPane(panes, handle)` and
  `readPaneLabels()` take the composed handle; the label lookup gate is
  `handle === null`, not a backend id.
- `src/backends/herdr/hud.ts:275-283` — `registerPaneStateHud` composes
  `socketPath` + `paneHandle` and passes the handle to `createPaneStateSocket`.

**Proof no composite key remains:** `grep -n "\.backend\|\.workspace\|tryParseIdentity" src/backends/herdr/hud.ts` → no match; the only identity import is `isAgentId`.

No new bundle weight: `src/backends/identity.ts` already imports
`src/store/agent-view.ts`, and every harness extension already imports identity.

**Tests** (new `test/herdr-hud-environment.test.ts`, 5 tests): a herdr-placed
agent reports the handle its environment carries; **the handle follows the agent
when it moves pane** (identity key asserted unchanged); an agent on another
plexer is not a herdr pane; a process orch never launched is not a herdr pane; a
legacy `herdr~wF~%3` key resolves to no pane at all. Red before, green after.

---

## 4. `src/commands/control.ts` — clean, no change needed

Both `tryParseIdentity` calls read `.id` only and nothing else:
`src/commands/control.ts:115` (per-refusal logger) and `:213` (dispatch
correlation logger). Neither reads `.backend` or `.workspace`, so both became
no-ops the moment the key became the id. The two registry reads —
`src/commands/control.ts:90` and `:247` — go through `spawnedRecords()`, which is
now the composed `Map<string, AgentView>` index over `agentViews()`, not a flat
`spawned` scan.

**Proof:** `grep -n "\.backend\|\.workspace" src/commands/control.ts` → no match.

---

## 5. `src/commands/results.ts` — clean, plus ONE finding left unfixed

Every space read is already a composer read through `spaceOf(orchDir(), pres.key)`
— `src/commands/results.ts:214`, `:218`, `:224`, `:254`. No `parseIdentity`
import, no `.backend`/`.workspace` read anywhere in the file.

### FINDING (reported, deliberately not fixed — audit §3.5)

`src/commands/results.ts:120` — `assertAgentOwned(target, ent, options.force);`

`orch result` is a **read**. TASKS/01-agent-model.md §10 and CLAUDE.md Rule 11
gate exactly four verbs against a live foreign holder — `dispatch`, `steer`,
`model`, `reset` — and reading is not one of them. A lease is mutual exclusion
between *drivers*; two readers cannot interleave, and the space wall already
scopes visibility. The gate should be dropped, and `--force` with it.

Not fixed here because it is an **ownership** defect (§3), not an identity one
(§1/§5), and removing it changes who can read what — that is a scope call for the
A1 owner, not a silent widening inside an identity ripple. The same question,
lower stakes, applies to `orch zoom` / `orch focus` (`src/commands/panes.ts:251`,
`:273`), which are outside this slice's files.

---

## Verification

- `bunx tsc --noEmit` — **zero errors** in all five files (and zero across `src/`
  entirely). The three remaining repo-wide errors are in
  `test/daemon-decision-trail.test.ts`, `test/presence-schema.test.ts` and
  `test/spawn-identity.test.ts`, all outside this slice.
- `bun test test/spawn-names.test.ts test/commands-events.test.ts test/herdr-hud-environment.test.ts test/commands-control.test.ts test/commands-results.test.ts`
  → **45 pass, 0 fail** (94 assertions).
- No `as` cast, no `as unknown as`, no `any`, no schema/version constant touched,
  no back-compat branch, no new copy of an existing helper (`sameSpace`,
  `spaceOf`, `environmentOf`, `spawnedRecords` are all imported).
