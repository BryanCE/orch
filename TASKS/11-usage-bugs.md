# Usage bugs — hit while driving orch to fix orch

Bugs observed by an orchestrator USING orch on a real fleet, not found by reading code.
Each entry: what was run, what happened, what should have happened, and the evidence.
Non-stopping bugs are recorded here. A stopping bug moves to a `/tdd` slice against
`TASKS/` immediately and is marked FIXED here with its commit.

Status legend: `OPEN` (recorded, not yet sliced) · `SLICED` (dispatched) · `FIXED`.

---

## U1 — `orch status` reports `alive: true` for panes the plexer no longer has — FIXED

**Severity: high.** orch confidently vouches for agents that do not exist.

**Corrected 2026-08-29.** This entry originally accused `orch reset` of destroying panes.
That was WRONG and the accusation is retracted: `reset` was re-tested directly on a live
pane and behaves exactly as documented — session cleared, pane retained, model re-pinned,
`Cleared session on w7:p2P; ready.` printed, exit 0. The real defect is the one below, and
it is what made `reset` look guilty.

Four agents showed in `orch status` as:

```
dedupe-1 dedupe idle openai-codex/gpt-5.6-luna:medium herdr~w7~478kahm7dx   alive=True
```

while herdr had no such pane at all:

```
{"error":{"code":"pane_not_found","message":"pane 478kahm7dx not found"},"id":"cli:pane:read"}
```

The panes had died in an earlier session. Their registry rows survived with `alive: true`,
so every subsequent command believed in them: `orch dispatch` accepted the target and then
reported `write <id> was not applied or acknowledged`, and `orch peek` crashed with a raw
herdr error and a stack trace. `orch clean` was the only recovery, and nothing pointed at it.

**`alive` is being derived from the presence record rather than from the environment.** A
row is not evidence that a process exists. Per `TASKS/01-agent-model.md` liveness is a fact
about the process, and per `TASKS/07-port-seam.md` the environment is what says whether a
pane is there — the plexer's inventory answers this question, and a row that contradicts it
is stale, not alive.

**Expected:** `alive` reflects the recorded process and the composed environment, not the
existence of a row. A target whose pane is gone is reported as gone, and a dispatch to it
fails with that reason — not with an unexplained non-acknowledgement.

**Lesson for this file:** reproduce before accusing. The first version of this entry was
written from a correlation (`reset` ran, then panes were missing) instead of a test.

**FIXED.** `confirmedHandle` (`src/entities.ts`) is the one place a handle becomes a
`paneId`, and it asks the ENVIRONMENT. A plexer with a pane inventory that this process is
inside of ANSWERS the question; a handle it does not list is gone and `paneId` is null, so
`peek`/`zoom` give the E14 absence answer instead of a raw plexer error. Both stale sources
go through it — the store's recorded handle (`entitiesFromStore`) and the agent's own claim
in `status.json` (`presenceOnlyEntity`), which was the same coordinate one layer up. A
plexer that was NOT asked (no inventory, or orch is not inside a session of it, e.g.
`--offline`) says nothing either way and the recorded handle stands. The AGENT is untouched:
Rule 11 — a pane is an optimisation, losing one costs a shortcut and never a life, so the
row stays listed, managed and reachable through its inbox. Tests:
`test/a-row-is-not-a-pane.test.ts` (3).

## U2 — `orch close --all` leaves rows it just failed to close, and says so only in prose — FIXED

```
Could not close w7:p2B; process or pane remains registered.
Could not close w7:p2C; process or pane remains registered.
Could not close w7:p2D; process or pane remains registered.
```

Exit status was success. The rows survived, still carrying the names I had assigned them, so
the next `orch dispatch <name>` resolved to two agents and refused. `orch clean` cleared them.

**Expected:** a multi-target command records `outcome: "done" | "error"` per target plus the
real error text (`TASKS/07-port-seam.md`, "Multi-target commands"), and a close that cannot
complete does not leave a half-registered row that shadows a live agent's name.

**FIXED.** `--json` now carries `results: [{ target, handle, outcome, error }]` — one entry
per target it was handed, so a caller can tell a full sweep from a half one and say which
target failed and why. The reason is the REAL one at each of the four failure points (the
signal threw; the process outlived SIGTERM; the plexer refused, with its message; the plexer
still lists the handle after the close), not the single sentence "process or pane remains
registered" that covered all of them.

Two further defects fixed with it:
- `process.exit(1)` became `process.exitCode = 1`. Exiting truncated the buffered JSON — the
  very payload a caller reads to find out which target failed. `src/commands/index.ts:272`
  already states this rule; close was the one command breaking it.
- The rows that "failed" were U1's: `--all` hard-coded `paneKnown: true`, so orch asked the
  plexer to close a pane it no longer had, took the throw as a failure, and left a row
  nothing could ever close. `plexerStillHasPane` asks the inventory first; a plexer that was
  not asked says nothing either way and the handle stands.

Tests: `test/close-reports-every-target.test.ts` (4).

## U3 — an ambiguous dispatch target prints a bare unlabelled list — FIXED

`orch dispatch port-roles '<prompt>'` with two agents answering to that name printed only:

```
  herdr~w7~rvmofvm2wq  (fix)  pi
  herdr~w7~478kahm7dx  pi
  herdr~w7~fgy08e18sj  (fix)  pi
  herdr~w7~b4249h26cr  pi
```

No `ambiguous:` prefix, no statement of what was ambiguous, no suggested disambiguator, and
the prompt was silently discarded. The caller cannot tell this from a listing command's output.

**Expected:** name the failure, name the target string that was ambiguous, and tell the caller
to address by key.

**FIXED.** There were THREE wordings for this one refusal: `entities.ts` (the site an
ambiguous `orch dispatch` actually hits) printed a bare candidate list with no advice, so it
read as a listing command's output; `resolveAgentView` said "address by id"; and
`resolveLifecycleTarget` said "address by key" — two names for a fact A1 settles, since the
key IS the id. `ambiguousTargetRefusal` (`src/refusal.ts`) is now the one builder and every
raiser uses it. It says the three things a refusal must say or it costs the caller their
turn: WHAT failed, WHICH target string, and what to send instead — plus "so nothing was
done", because the silently-discarded prompt was the real cost. Tests:
`test/ambiguous-target-says-what-to-do.test.ts` (4).

## U4 — stale name rows shadow live agents after their pane dies — FIXED

Root cause shared with U1/U2. A rename writes orch's name onto a record whose pane later dies;
the dead record keeps the name and competes with a live agent for it. `orch clean` is the only
recovery, and nothing points the operator at it.

**Expected** (`TASKS/01-agent-model.md`): a name is mutable display metadata on an agent, and
name resolution is a lookup over LIVE agents. A dead agent's name must not make a live agent
unaddressable.

**FIXED with U1** — the shared root cause was that a row was treated as evidence of a pane.
`assertNameFree` (`src/policy/name.ts:20`) already resolves names over LIVE agents only
(`presence.get(view.id)?.alive === true`), so a dead agent holds no name; what kept the dead
row LOOKING live was the unconfirmed handle, which `confirmedHandle` now takes away.

## U5 — `orch rename` leaves the pane border showing the OLD name — FIXED

**Severity: high for usability.** The screen lies about which worker is which.

```
orch rename wave2-1 thinking-axis
  -> w7:p2J -> named "thinking-axis".
```

`orch status` and `orch panes` both then report `thinking-axis`, and every command
answers to it. But the **pane border on screen still reads `wave2-1`**, because
`orch rename <target> <name>` sets the NAME and a *separate* `--pane` invocation sets
the border label. Syncing them requires running the command twice:

```
orch rename <target> <name>
orch rename <target> <name> --pane
```

The operator watches the panes. If the border is the stale name, the one artifact they
actually look at is the one that is wrong — and with 8 panes across 2 tabs it becomes
impossible to tell which worker holds which slice, which is the exact failure the naming
guidance in `skills/orch/SKILL.md` exists to prevent ("a stale name is worse than an
ordinal because it actively lies").

**This is two names for one fact.** `TASKS/01-agent-model.md`: a name is *one* piece of
mutable display metadata on an agent. Rule 9 forbids two mechanisms for one fact.

**Expected:** `orch rename` sets the name, and the plexer chrome follows automatically.
`TASKS/07-port-seam.md` already specifies exactly this under `herdrBestEffort` deletion:
"agent rename → `AgentNamingRole.renameAgent`; if requested, its failure is reported and
never changes whether orch's own name write succeeded. **The response states the two
outcomes separately.**" So the design already says one command, two reported outcomes —
the implementation instead requires two commands. `--pane` should be for the rare case of
deliberately giving the border something *different*, never the price of a correct display.

**FIXED.** `orch rename <target> <name>` now sets orch's name, renames the agent, AND
renames the pane in one command. orch's own registry write commits first and alone; the
chrome is a separate action whose failure is REPORTED and never rewrites whether the rename
happened, exactly as `TASKS/07-port-seam.md` specified. The response states the two outcomes
separately — `--json` carries `renamed` alongside `chrome: "renamed" | "none" | "failed"`
and `chromeError`, and the plain-text line says `(pane border NOT updated)` when the plexer
refused. An environment with no pane naming reports `chrome: "none"`: no border to sync is
an answer, not a failure (E14). `--pane` survives for its real purpose — giving the border
something DIFFERENT on purpose — and still leaves the name alone. Also fixed here: the
`as { pid?: unknown; start_token?: unknown }` cast in `recordedProcess` (Rule 13) is now
`isRecord`. Tests: `test/rename-syncs-the-pane-border.test.ts` (4).

## U6 — `orch spawn --name` takes only a PREFIX, so a per-slice fleet costs N renames — FIXED

`orch spawn 4 --name fix` produces `fix-1 … fix-4`. There is no way to name the four panes
individually at spawn, so every fleet where each pane holds a different slice needs:

```
orch spawn 4 --name wave2 --cwd ...
orch rename wave2-1 thinking-axis
orch rename wave2-2 dual-record
orch rename wave2-3 env-builder
orch rename wave2-4 instants
```

...and, per U5, four more `--pane` calls. Nine commands to launch four named workers.

`skills/orch/SKILL.md` explicitly tells the orchestrator to "name by SLICE: `mcp-types`,
`mcp-tools`, `mcp-guards`" and warns that a spawn-ordinal name "says nothing about what
that worker holds". The tool makes the recommended practice the expensive path.

**Expected:** `--name` accepts a list — `--name thinking-axis,dual-record,env-builder,instants`
— spawning one pane per name, with the existing prefix behaviour kept for when a single
name is given and N > 1. Validate every name BEFORE creating any pane, as spawn already
does today ("a refused spawn leaves nothing").

**FIXED, and better than proposed.** The names are the POSITIONALS, not a flag value:
`orch spawn <name> [<name>...]`, and how many you give is how many panes you get
(`resolveSpawnSettings`, `src/commands/spawn.ts:335`). `--tab` names the tab and the
positionals name the agents, so the two are never conflated; a tab left unnamed borrows the
first agent's name. Every name is resolved and validated BEFORE a tab, a pane or a worktree
exists, so a refused spawn still leaves nothing. `TASKS/02-scope.md` F4 states the rule:
names are per-slice and unnumbered, and there is no implicit "grow the fleet under this
prefix" path.

## U7 — `orch spawn` from a human's herdr pane says "not running inside a herdr pane" — FIXED

Ran, from a Claude session the USER launched in herdr pane `w7:p1` (`HERDR_PANE_ID=w7:p1`,
`HERDR_ENV=1`, no `ORCH_AGENT_KEY`):

```
orch spawn b1-spawn b1-cli b1-setup b1-daemon --tab b1 --cwd /home/bryan/orch
```

Got: `orch is not running inside a herdr pane, so this spawn would open a NEW herdr space.
Ask the user to approve it … orch grant k7xb20jt`. The fleet never launched; the only ways
out were a grant for a window nobody wanted, or `--space`, which then passed the space NAME
to herdr as a workspace id (`workspace b1 not found`).

**Expected:** a caller inside a herdr pane spawns beside itself — a new tab in the SAME
space — and is asked nothing.

**Cause:** `resolveSpawnPlacement` (`src/commands/spawn.ts`) answered "am I inside this
plexer?" with `backend.identity.current() !== null`, i.e. "did orch mint me an id?". A
human's own pane has no `ORCH_AGENT_KEY`, so it was called OUTSIDE. Rule 11 in one line:
environment (where) read off identity (who). `rpcHello` (`src/daemon/rpc.ts`) made the same
mistake when recording the session's plexer. And herdr's `isInsideSession()` said "inside"
whenever the herdr socket was merely reachable, which is a third fact again.

**FIXED.** `inside` is `backend.isInsideSession()` (`src/commands/spawn.ts:574`), the
plexer's own environment answer; herdr answers it from `HERDR_ENV`/`HERDR_PANE_ID` only
(`src/backends/herdr/index.ts:263`), reachability no longer counts; `rpcHello` records the
plexer the same way (`src/daemon/rpc.ts:833`). Proven by `test/spawn-placement.test.ts`
"a caller INSIDE the plexer with NO orch identity (a human's pane) spawns beside itself".

The recurrence the user saw all day was NOT a revert: the installed `orch` (built 10:50) predated
`77c8e17` (11:51) and nine later commits. A fix in the tree reaches the installed binary only
through the user's `bun run build:dev` + `orch daemon reload` (Rule 12) — after every landed
fix to `src/commands/` or `src/backends/`, say so in the hand-off line.

## U8 — after U7, `orch spawn` from a human's pane fails with `no space named ""` — FIXED

Same command as U7, on the U7 build. Every agent: `orch: no space named "". Create it first
with 'orch space create '.`

**Cause:** `placeSpawn` turned "no space" into the sentinel `""` (`placement.space ?? ""`),
carried it as `TabSpawnSpec.space: string`, and `registerSpawnedAgent` — correctly — refused
to file an agent in a space nobody created. Rule 11: NULL means not-applicable, never a
sentinel string. `spawnOneIntoTab` also handed orch's space to the plexer as its workspace
coordinate (`workspace: spec.space`) — E10's mix-up on the other side — and `orch tile` read
`tab.workspace` (a plexer coordinate) as orch's space.

**FIXED.** `space: string | null` end to end (`TabSpawnSpec`, `placeSpawn`, `placeAgent`,
`growFleetIntoGroup`, `claimSpawnNames`, `assertNameFree`, `assertSpawnCapacity`,
`assertSpawnPolicy`); registration receives `space ?? undefined` = no row. The plexer
coordinate rides in its own `TabSpawnSpec.workspace` and is the only thing the pane host
receives; `orch tile` uses `callerSpace()` for orch's space and `tab.workspace` for the
coordinate. Proven by `test/one-writer-records-a-spawned-agent.test.ts` "a spawn into NO
space records no space and hands the plexer only its coordinate".

## U9 — bare `orch events` (default `--mine` scope) emits NOTHING for the fleet this session spawned — OPEN

From the Claude pane that spawned `b1-*` (rows carry `spawnedBy: b10z3xket4`, this session's
id), `orch events --status done,error,blocked,asking` stayed silent through four `working->done`
transitions. `orch events --all --since-seq 0 --status done` shows all four. So the caller-space
wall (`--all` lifts it) drops events whose space matches the caller's — both are NULL (no space,
A7) and NULL never equals NULL in the filter. Expected: no space on both sides IS the same place;
the default scope must deliver them. Workaround in the orch skill: arm the watch with `--all`.

## U10 — `orch close --all` asks the plexer to close a pane named after an AGENT ID — OPEN

**Severity: high.** A bulk close reports failure for agents it should have ended cleanly, and
leaves their records live.

```
orch > orch close --all
Closed b10z3xket4.
Could not close 2d6biywurb: herdr pane close 2d6biywurb failed after 4 attempts:
{"error":{"code":"pane_not_found","message":"pane 2d6biywurb not found"},"id":"cli:pane:close"}
... same for 7eh83quhwd, z4460fgnr7, iv6ox2djmj
Closed zcixvdjos8.
Closed w7:p3C.
```

`2d6biywurb` is a **minted agent id**, not a pane handle — the successful rows show what a real
handle looks like (`w7:p3C`). herdr has never heard of it, so it answers `pane_not_found`, orch
retries a terminal error four times, and reports a failure for an agent that had no pane to begin
with. Three defects compound:

1. **`src/commands/lifecycle.ts:647` — `const handle = view.environment.handle ?? address;`**
   `agent_handles` is an interval table: when a pane goes, `until` is stamped and
   `environmentOf` returns `handle: null`. An agent whose handle interval closed without an
   `agent_endings` row is live-with-no-pane, and this line fabricates a handle out of its
   identity. Rule 11 forbids exactly this — `handle === null` is a missing value, not a name,
   and identity is never an environment coordinate.
2. **`src/commands/lifecycle.ts:606` — `if (!inventory || backend?.isInsideSession() !== true) return true;`**
   Run from a plain shell (not inside a pane), "I cannot check" returns "the pane exists", so
   every agent comes back `paneKnown: true` and `closeRoute` (`:737`) picks the pane route for
   agents that have no pane.
3. **`pane_not_found` is retried and then reported as an error.** A pane that does not exist is
   the end state close wants; it is "already stopped", never a failure, and never retryable.
   `retryingSync` already takes a `retryable` predicate and `herdrErrorCode`
   (`src/backends/herdr/cli.ts:140`) already parses herdr's codes — neither is wired into
   `paneHost.close` (`src/backends/herdr/index.ts:155`).

**Expected:** no recorded handle → route `none` (end the record, never call the plexer);
`plexerStillHasPane` answers *unknown* rather than `true` when it cannot see the session; and
`pane_not_found` settles the close as done.

## U11 — `orch tab new --workspace <ID>` puts a plexer's word in orch's own CLI — OPEN

**Severity: low, but it is a Rule 11 violation in the user-facing surface.**

`src/commands/panes.ts:195-211` parses `--workspace`, and both the usage text
(`src/commands/index.ts:135`) and `orch help tab` (`src/commands/help.ts:208`) advertise it;
the failure message is `Could not determine workspace id. Pass --workspace <id>.` Rule 11 and
ADR-0001: "workspace is a plexer's word and never appears in orch's model, CLI, or UI." The
value itself is legitimately the plexer coordinate — it is the *name* that leaks. Needs a
rename decision from the user before it is sliced, since it is a public flag.
