# Adversarial review — slices landed this session

Reviewed against `TASKS/`, not against any implementing agent's claim. Reviewer ran the
tests. Never ran `bun run check` / `bun check` (Rule 5), never built, never installed,
changed no source.

**Timing matters for this report.** Test runs marked *(pre-commit)* were taken from the
working tree at ~02:10–02:16 local, before commit `d6fb834` landed. `d6fb834` is the
commit that contains every slice under review, and it does not load (item 0).

---

## Item 0 — BLOCKER: `d6fb834` shipped a half-applied workspace→space rename

`HEAD` (`d6fb834` "Delete capability-by-presence from both ports; name agents at spawn")
deleted `src/policy/workspace.ts` (renamed to `src/policy/space.ts`) and renamed exports in
`src/entities.ts`, but did not repoint the importers. The CLI does not start:

```
$ bun bin/orch.ts status --json
error: Cannot find module '../policy/workspace.ts' from '/home/bryan/orch/src/commands/status.ts'
```

Broken importers at `d6fb834`:

- `src/commands/panes.ts:12` — `workspaceName`
- `src/commands/status.ts:18` — `workspaceName`
- `src/commands/target.ts:8` — `operatorControls`
- `src/daemon/orchd.ts:24` — `checkWall, operatorControls`
- `src/commands/events.ts:6` — `scopeToWorkspace`
- plus 6 test files importing `../src/policy/workspace.ts`

Restoring only `src/policy/workspace.ts` is NOT enough — `src/entities.ts` at the same
commit no longer exports `entityWorkspace` / `workspaceOf` / `scopeEntitiesToWorkspace`
either:

```
SyntaxError: Export named 'entityWorkspace' not found in module '.../src/entities.ts'
```

`bunx tsc --noEmit` on `d6fb834`: **120 errors**, dominated by the same rename
(`OrchConfig.workspaces` → `spaces`, `fleet.workspace_caps` → `space_caps`,
`fleet.cross_workspace` → `cross_space`, `SpawnedRecord.workspace` gone,
`BridgeNotification.space`, `crossWorkspace` → `crossSpace`).

Test run of the eleven files under review, at `d6fb834`: **20 pass / 24 fail / 7 errors** —
every failure an unresolved-import cascade, not a logic failure.

**Smallest fix:** finish the rename in one pass — repoint the 5 `src/` importers and the 6
`test/` importers to `src/policy/space.ts` with the new names (`spaceName`,
`scopeToSpace`, `operatorControls`, `checkWall`), and repoint the `entities.ts`,
`OrchConfig.spaces`, `fleet.space_caps`, `fleet.cross_space`, `crossSpace` and
`SpawnedRecord` consumers listed by `tsc`. This is a rename completion, not a redesign.
Everything below is graded on the pre-commit tree, where these same files were green.

---

## Item 1 — `TASKS/14-settings-tui.md` slices 1–6 — **ISSUES** (slice 1, 3, 4, 5 pass; slice 2/6 incomplete)

Test run (pre-commit): `bun test test/settings-registry.test.ts test/settings-editor.test.ts
test/settings-command.test.ts test/settings-shell.test.ts` → **32 pass / 0 fail**.

### PASS — the acceptance test is genuinely programmatic

`test/settings-registry.test.ts:31-51` walks the zod schema with
`Object.entries(schema.shape)` and recursion, unwrapping optionals; it does not hand-list
keys. Verified independently by re-running that walk against the real schema: **42 keys
derived from the schema, 42 keys in the registry, sets equal**:

```
schema keys: 42 ["daemon.idle_shutdown_minutes","daemon.tcp_port","defaults.adapter",
"defaults.backend","defaults.models","defaults.thinking","defaults.thinking_by_harness",
"defaults.worktree","enabled.adapters","enabled.backends","fleet.cross_workspace",
"fleet.max_agents","fleet.pack_cap","fleet.spawn_cap","fleet.worker_peer_tools",
"fleet.workspace_caps","hosts","locked_commands","logging.level","models.allowed",
"models.preferred","notify","queue.max_retries","retention.ended_agents_days",
"retention.events_days","retention.logs_days","retention.outbox_days",
"retention.queue_days","retention.runs_days","runtime","skills.install","skills.roots",
"tiling.first_split","timeouts.adapter_command_ms","timeouts.dispatch_ack_ms",
"timeouts.notify_ms","timeouts.wait_ms","workers.allow_tools","workers.builtin_tools",
"workers.exclude_extensions","workers.inherit_extensions","workspaces"]
registry keys: 42
```

The test can fail: adding a schema key without a registry entry breaks the set equality,
and a top-level schema that stops being an object pushes `""` and breaks it too.
`src/settings/registry.ts:55-71` derives `choices` / `min` / `max` from
`z.toJSONSchema(SETTINGS_FILE_SCHEMA)` rather than restating them — this is what the task
asked for.

### PASS — editor reachability, non-TTY, override

- Bare `orch settings` on a TTY opens the editor: `src/commands/settings.ts:127-129,343-350`
  (`shouldLaunchSettingsEditor`), tested at `test/settings-shell.test.ts:26-30` for all
  three cases (`[] + TTY` → true, `[] + non-TTY` → false, `["--json"] + TTY` → false).
- Non-TTY prints as before: every `test/settings-command.test.ts` case spawns the CLI with
  piped stdio and asserts the old output shape.
- Env-overridden shown as overridden: `src/settings/shell.ts:18-25,41-43` renders
  `[overridden by ORCH_*]`; `src/settings/editor.ts:75-80` refuses `open` with the winner
  named, tested at `test/settings-shell.test.ts:32-44`.
- Env-overridden refused for writing: `src/commands/settings.ts:137-139`, tested
  end-to-end through a real CLI spawn at `test/settings-shell.test.ts:46-56`
  (`ORCH_SPAWN_CAP=9` + `orch settings fleet.spawn_cap 4` → exit non-zero, stderr names
  `ORCH_SPAWN_CAP`).

### ISSUE 1.1 — slice 2 is not done: the printout is still a hand-kept list of 19 of 42 keys

`src/commands/settings.ts:375-401` iterates `SETTINGS_REGISTRY` but then routes every spec
through a hand-written `switch (spec.key)` with 19 cases and

```ts
if (key === undefined) continue;   // src/commands/settings.ts:401
```

so **23 of the 42 registry keys are silently dropped from both the human table and
`--json`**. Dropped: `runtime`, `enabled.adapters`, `enabled.backends`, `defaults.models`,
`defaults.thinking_by_harness`, `fleet.pack_cap`, `models.allowed`, `models.preferred`,
`workers.inherit_extensions`, `workers.exclude_extensions`, `workers.builtin_tools`,
`workers.allow_tools`, `logging.level`, `retention.*` (all six), `notify`,
`locked_commands`, `hosts`, `workspaces`.

A bespoke trailer (`settings.ts:432-442`) re-prints `enabled.*`, model lists and
*counts* for `hosts` / `workspaces` / `notify` in the human table only. That still leaves
~14 keys — `fleet.pack_cap`, all four `workers.*`, `logging.level`, all six `retention.*`,
`locked_commands`, `defaults.thinking_by_harness` — invisible in **both** renderings.

This is precisely the failure the task file cites (`defaults.thinking` landed in the schema
and stayed invisible): the loop is registry-shaped, the content is still a second list.
The comment at `settings.ts:371-374` claims print order now comes from the registry — the
order does, the membership does not.

**Smallest fix:** delete the `switch` and print every spec via `spec.read(config)` +
`spec.env` + `rawSetting`, using a per-spec `fallback` derived from `SETTINGS_DEFAULTS` by
the same dotted path instead of 19 hand-written cases. Keep the `adapter`/`backend` label
aliases as a two-entry display-name map, not as a membership gate.

### ISSUE 1.2 — no test asserts registry keys are reachable from the CLI

`test/settings-command.test.ts` spot-checks six keys (one per `kind`). Nothing asserts that
*every* registry key is settable or listed. The acceptance criterion in the task file has
two halves ("appears exactly once in the registry" **and** "is reachable from the CLI");
only the first half is tested, which is why 1.1 could land green.

**Smallest fix:** one test that loops `SETTINGS_REGISTRY` and asserts each writable key
appears in `orch settings --json` output (after 1.1 is fixed), and that
`registeredSetting(key)` resolves for every key.

### ISSUE 1.3 — slice 5's "flag" half is unimplemented

The task says "a setting overridden by a **flag** or env var". Only `spec.env` exists;
`src/settings/shell.ts:18-25` and `src/settings/editor.ts:75-80` know nothing about flag
overrides. `EditorSetting.override` (`editor.ts:10`) is populated only from env.
Low severity — no flag currently outranks settings.json for a registry key — but the
declared precedence "flag > env > settings.json > default" is not modelled.

---

## Item 2 — `TASKS/13-logging.md` acceptance test — **ISSUES**

### ISSUE 2.1 — the stated acceptance test does not exist; the test that claims it cannot fail

`test/commands-logging.test.ts:20-47` ("readable logs include both dispatch and agent
correlation") **hand-writes four fabricated JSON lines into `orchd.log`**
(`commands-logging.test.ts:26-33`) and then asserts `cmdLogs(["--dispatch","dispatch-7"])`
prints them back. It constructs no dispatch. It exercises the reader, not correlation.
If every `log.info("dispatch.*")` call site were deleted from `src/`, this test would
still pass. That is the exact "test that cannot fail" the task file was written to prevent
("**That is the single test of whether this work succeeded**").

**Smallest fix:** a test that starts orchd against a temp `ORCH_DIR`, seeds a live agent,
calls the real `dispatch` RPC, then asserts the set of `event` names in
`orchd.log` lines whose `correlationId` equals the returned id.

### What a real dispatch actually produces

I built one: temp `ORCH_DIR`, seeded harness/host/agent rows + a live `pi` presence dir,
started the real `src/daemon/orchd.ts`, called the real `dispatch` RPC, then appended a
bridge-shaped ack line to `ack.jsonl`. Verbatim `grep <dispatchId> orchd.log`:

```
{"at":1787991428258,"level":"info","event":"dispatch.accepted","correlationId":"05df8a88-b7ff-4d2b-aa36-8ef21aa6e213","fields":{"target":"headless~local~wk1","action":"dispatch"}}
{"at":1787991428258,"level":"info","event":"dispatch.queued","correlationId":"05df8a88-b7ff-4d2b-aa36-8ef21aa6e213","fields":{"target":"headless~local~wk1","action":"dispatch"}}
{"at":1787991428260,"level":"info","event":"dispatch.delivering","correlationId":"05df8a88-b7ff-4d2b-aa36-8ef21aa6e213","fields":{"target":"headless~local~wk1","attempt":0}}
{"at":1787991428265,"level":"info","event":"dispatch.delivered","correlationId":"05df8a88-b7ff-4d2b-aa36-8ef21aa6e213","fields":{"target":"headless~local~wk1","action":"dispatch"}}
```

`$ORCH_DIR/orch.log` (the CLI log) was **never created**.

Stage-by-stage against the task's list:

| stage | present? | evidence |
|---|---|---|
| CLI accept | **MISSING** | the id is minted inside `acceptWrite` (`src/daemon/orchd.ts:291`); the CLI never learns it before the call and logs nothing. `orch.log` absent. |
| lease / govern | **MISSING** | `governWrite` receives `{correlationId: id}` (`orchd.ts:294`) but only emits `lease.refused` / `lease.granted`, both at `debug`, and **only on a foreign lease** (`orchd.ts:262-273`). A normal dispatch at an unleased agent logs no govern decision at any level. |
| queued | present | `dispatch.queued` |
| delivery | present | `dispatch.delivering` (`src/daemon/outbox.ts:93`) |
| bridge ack | **MISSING** | see 2.2 |
| completion / terminal state | **MISSING** | `dispatch.delivered` is "handed to the inbox", not "the agent finished". No record ties an agent terminal state back to the dispatch id. |

So one grep yields four adjacent records written by one function, not the whole life.

### ISSUE 2.2 — `dispatch.acked` is unreachable on the normal path

`src/daemon/outbox.ts:56` skips any ack line whose message is no longer pending:

```ts
if (!outboxMessagePending(orchDir, parsed.id)) continue;
createLogger(...).forCorrelation(parsed.id).info("dispatch.acked", { target: key });
```

But `deliverWrite` returns `true` as soon as the inbox line is written
(`src/control/dispatch.ts:112-117` → `orchd.ts:187-219`), and `drainOutbox` then calls
`markOutboxDelivered` immediately (`outbox.ts:100-103`). By the time the harness bridge
appends to `ack.jsonl` the row is already delivered, so the ack is dropped and
`dispatch.acked` never fires. Confirmed empirically above: an ack line was written and no
`dispatch.acked` record appeared.

Compounding it: `drainOutbox` is called from exactly one place — `acceptWrite`
(`orchd.ts:300`). No background loop drains acks, so a bridge ack is only ever read on the
*next* dispatch.

**Smallest fix:** stop treating "inbox line written" as delivered. Have `deliverWrite`
return "handed off" and let `markOutboxDelivered` happen only in `consumeOutboxAcks`, and
drive `drainOutbox` from the work loop so acks are consumed without a following dispatch.

### ISSUE 2.3 — `logging.level` and `ORCH_LOG_LEVEL` are ignored by four of the five loggers

`src/daemon/decision-log.ts:14-16` reads env then settings. Every other logger hard-codes
`level: "info"`:

- `src/commands/logging.ts:6` (the whole CLI logger)
- `src/daemon/orchd.ts:189` (`deliverWrite`)
- `src/daemon/orchd.ts:292` (`acceptWrite`)
- `src/daemon/outbox.ts:58` (ack)

Slice 1 says "level from settings + env". Raising the level cannot make a dispatch more
verbose except in `decisionLogger`.

**Smallest fix:** one `loggerFor(directory, context)` helper (the `decision-log.ts` body)
and call it from all four sites; delete the inline `createLogger({...level:"info"})` calls.

### Slices that DID land (verified)

- Slice 1 — `src/log.ts` record shape, level filtering, `isLogRecord` guard, `forCorrelation`
  / `forAgent`; `test/log-record.test.ts` passes (pre-commit).
- Slice 2 — raw stdio redirection is gone: `src/daemon/lifecycle.ts:316` spawns orchd with
  `stdio: ["ignore","ignore","ignore"]`. (Nit: `lifecycle.ts:311,324` still `openSync`/
  `closeSync` the log file for a spawn that ignores stdio — dead code, delete it.)
- Slice 5 — decision trail exists and is tested for real:
  `test/daemon-decision-trail.test.ts` drives `governWrite` / `deliverWrite` against a real
  store and asserts the exact records. Passes (pre-commit). Its scope is narrow (see the
  "lease / govern" row above).
- Slice 6 — `src/daemon/retention.ts:74` now prunes `orchd.log` and `orch.log`.
- Slice 7 — `orch logs` with `--dispatch` exists and works.
- Slice 4 — **partial**: 61 `process.stderr.write` sites remain in `src/` (task counted 66).

---

## Item 3 — `test/queue-scope.test.ts` I6 / I7 — **PASS** (one duplication nit)

Test run (pre-commit): `bun test test/queue-scope.test.ts test/store-task-rows.test.ts` →
**16 pass / 0 fail**.

**I6** — `test/queue-scope.test.ts:45-64`. A pack-scoped task claimed by `x`, failed, then
claimed by `y` → `true`, and `attemptsOf` is `["x","y"]`. The same test pins the negative:
an agent-scoped task failed on `x` is refused for `y` and keeps one attempt. Genuine.

**I7** — `test/queue-scope.test.ts:115-142`. This does exercise the database guarantee, not
application logic:

- it **drops the competing trigger first** (`queue-scope.test.ts:125`
  `DROP TRIGGER task_attempts_no_overlap`) so the only thing that can reject the loser is
  the index;
- it bypasses `claimTask` entirely and issues two raw
  `INSERT INTO task_attempts` statements over **two separate `Database` handles**
  (`:126-131`);
- it asserts the rejection text is the index's own:
  `/UNIQUE constraint failed: task_attempts\.task_id/i` (`:136`). A composite PK would
  report a different column list, so the assertion is specific to
  `uniqueIndex("one_open_attempt").on(table.taskId).where(sql\`until IS NULL\`)`
  (`src/store/tables.ts:315`).

Nit (not blocking): the "concurrency" is nominal — both `.run()` calls are synchronous
inside `Promise.resolve().then(...)`, so they serialize on the event loop. The index is
still the thing that raises, so the test proves what it claims.

Nit 2 — duplication: `test/store-task-rows.test.ts:72-93` is the same test, near
character-for-character, against the same index. One of the two should go (fallow).

Gap worth a follow-up: no test covers the *application* half of I7 — that `claimTask`
turns the index violation into `false` (`src/queue.ts:220-223`). All existing `false`
results come from scope checks, so the `catch` regex is untested.

---

## Item 4 — I4 / I8 doctor checks — **PASS**

Test run (pre-commit): `bun test test/doctor-declared-vs-reality.test.ts
test/doctor-unscoped-tasks.test.ts` → passing.

Declared-vs-reality, all three cases in `test/doctor-declared-vs-reality.test.ts`:

- dead lease holder — `:42-55` (holder process pid 99999999, `processAlive` injected)
- vanished environment — `:57-74` (recorded handle `gone`, plexer inventory returns
  `still-here`)
- orphan (live agent, no lease, dead spawner) — `:76-92`

Both checks are actually registered with the runner, so they run in a real `orch doctor`:
`src/doctor/runner.ts:108` (`declared-vs-reality`) and `:113` (`unrunnable-tasks`).

**"never deleted under `doctor -y`" — the test does run `-y`.**
`test/doctor-declared-vs-reality.test.ts:112-123`:

```ts
const results = await runDoctor(dir, { yes: true, sshRunner: ... });
applyFixes(results);
expect(openStore(dir).query("SELECT COUNT(*) AS count FROM tasks WHERE id='missing-scope'").get())
  .toEqual({ count: 1 });
```

It is in fact *stricter* than the CLI: `src/commands/doctor.ts:44` applies only
`!r.fix?.destructive` fixes, whereas the test calls `applyFixes(results)` unfiltered. And
`checkUnrunnableTasks` attaches no `fix` at all
(`src/doctor/unrunnable-tasks.ts` — "Surface unrunnable and stale work without attaching
any automatic fix"), so the surfacing/never-deleting split is real, not asserted.

Surfacing is separately covered at `:94-110` (`unrunnable-tasks` → `warn`, detail names the
task id and "no longer exists") and by `test/queue-scope.test.ts:105-113`, where
`reapTask` on a stale-but-claimable task throws `/unrunnable/` and the row survives.

Minor: the three declared-vs-reality cases call `checkDeclaredVsReality(dir, deps)`
directly with injected dependencies, not through `runDoctor`. Registration is verified by
reading `runner.ts:108` rather than by a test; one assertion that
`(await runDoctor(dir)).some(r => r.id === "declared-vs-reality")` would close that.

---

## Item 5 — F6 unleased rendering — **ISSUES** (two of three renderings verified)

`test/status-unleased.test.ts` (pre-commit: passing) covers three states — live holder,
dead holder, never leased — and for each asserts **two** renderings:

- human cell: `formatOwnerCell(row)` → `"no orch driving it"` /
  `"no orch driving it (holder gone)"` (`:63,72`)
- json: `JSON.stringify(row)` contains `"owner":"no orch driving it"` (`:64,73`)

Source side is sound and single-sourced: `src/commands/status.ts:111-112` define
`NO_ORCH_DRIVER` / `DEAD_HOLDER_DRIVER`; `deriveDriveState` (`:114-129`) returns them for
every unleased path (unparseable key, missing agent row, no lease, dead holder);
`formatOwnerCell` (`:136-139`) dims anything starting with `NO_ORCH_DRIVER` and never
substitutes the caller. `tableFlags.showOwner` (`:361`) is `rows.some(row => row.owner !== null)`,
so an unleased-only fleet still shows the column. Both table renderers
(`renderLocalTable` and `renderRemoteTable`) go through the one
`tableOptionalCells` → `formatOwnerCell` path (`:366-371`), so there is no second
human rendering to drift.

### ISSUE 5.1 — the human-table rendering is asserted at the helper, never at the rendered line

The test calls `formatOwnerCell(row)` directly. Nothing asserts that
`renderLocalTable` / `renderRemoteTable` actually emit that cell, nor that
`tableFlags.showOwner` stays true when every row is unleased. Deleting
`if (flags.showOwner) cells.push(formatOwnerCell(row))` (`status.ts:368`) would not fail
any test — the column would silently vanish and the fleet would render with no owner
information at all, which is the F6 failure mode in a different costume.

**Smallest fix:** one test that builds two unleased rows, calls `tableFlags(rows, false)`,
asserts `showOwner === true`, and asserts `localTableRow(row, flags)` contains
`"no orch driving it"`.

### ISSUE 5.2 — the third ("compact") rendering is not covered, and one compact surface omits the fact entirely

There is no third CLI rendering that carries `owner`. The two compact surfaces that exist:

- `src/daemon/rpc.ts:192-198` `announceUnleasedAgents` — prints
  `"N unleased agent(s) exist - orch adopt <name> to take one, orch status to see them."`
  It does not claim ownership, so it satisfies F6's letter, but it is untested for the
  zero/one/many shape.
- `src/agent/peers.ts:180-185` `peerSummaries` + `formatPeerLines` (`:207-210`) — the
  compact peer listing an agent sees from `orch_agents` / `/peers`. It carries **no lease
  or owner field at all** (`grep -n "lease\|owner\|driving" src/agent/peers.ts` → no
  matches). An agent reading that list cannot tell a leased peer from an unleased one.
  Under F6 this is the surface most likely to make someone assume a peer is theirs.

The web (`packages/web/src/lib/fleet.ts:155`) only comments about a null lease; it renders
no owner string.

**Smallest fix:** decide which surface F6's "compact form" means and cover it. If it is
`peerSummaries`, add `owner` to `PeerSummary` from `deriveDriveState` and render it in
`formatPeerLines`; if it is `announceUnleasedAgents`, add a test for its message.

---

## Summary of verdicts

| item | verdict |
|---|---|
| 0. tree state at `d6fb834` | **BLOCKER** — 120 tsc errors, CLI will not load, half-applied workspace→space rename |
| 1. settings TUI slices 1–6 | **ISSUES** — schema-walking acceptance test is genuine (PASS); printout still drops 23 of 42 keys; no CLI-reachability test; flag overrides unmodelled |
| 2. logging correlation | **ISSUES** — the stated acceptance test does not exist; the test that claims it fabricates the log file; grep yields 4 of 6 stages (CLI accept, lease/govern, bridge ack, completion all missing); `dispatch.acked` unreachable; `logging.level` ignored by 4 of 5 loggers |
| 3. queue I6 / I7 | **PASS** — I7 drops the trigger and inserts raw over two handles, so `one_open_attempt` is what raises; duplicated in `store-task-rows.test.ts`; `claimTask`'s catch untested |
| 4. doctor I4 / I8 | **PASS** — all three declared-vs-reality cases present and both checks registered; the never-deleted test really runs `runDoctor(..., {yes:true})` and then unfiltered `applyFixes` |
| 5. F6 unleased | **ISSUES** — human cell and `--json` verified; table assembly untested; no covered compact form, and `peerSummaries` carries no lease fact at all |
