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

## U2 — `orch close --all` leaves rows it just failed to close, and says so only in prose — OPEN

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

## U3 — an ambiguous dispatch target prints a bare unlabelled list — OPEN

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

## U5 — `orch rename` leaves the pane border showing the OLD name — OPEN

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
