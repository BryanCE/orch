# NOTES — the design log

Running record of what was decided, what was killed, and why. Newest reasoning at the bottom
of each section. If something here contradicts `01-agent-model.md`, this file is the newer
thinking and the model doc needs updating.

---

## Killed: `owned` vs `detached` lifetime

**Gone:** the `agents.lifetime` column, `orch spawn --detached`, the "detached requires a
name" rule, and the grace window that closed a process on a timer.

It was answering exactly one question — *does the work survive its spawner?* — and that
question now has one permanent answer: **yes, always**. Two lifetimes were imported from Ray
and Kubernetes, where the answer genuinely varies. Here it doesn't.

It was also a flag you had to choose *before you knew you needed it*. You get pulled away, you
close the laptop — the moment you need "keep going" is after the spawn, not during it.

**What is true instead**, for every agent, with no flag and no variant:

1. It works until its task completes. Its holder dying is irrelevant to that.
2. Losing a holder means losing a **driver** — no new dispatch, no steer, no queue assignment.
   Nothing else changes.
3. Unheld and idle, it stays alive and adoptable. It costs a pane and some memory, not tokens.
4. It ages out on **retention**, measured from when it went idle — hours or days, not a
   ten-minute panic timer.

"Spawn and walk away" is not a mode. It is what happens.

## The lifecycle correction that forced it

The earlier model had a dead holder's agents go quiet, finish one turn, then close on a grace
timer. **That was wrong.** A parent spawns five orchs, the parent session dies, and their work
must not be lost — they continue.

So: **the grace window applies to idleness, not to the process.** Nothing actively working is
ever closed on a timer. A five-orch fleet whose parent died finishes all five tasks and keeps
all five results, and only then starts aging out.

**Open:** if the dead orchestrator had *queued* further tasks that never started, do those run?
Current read is no — nobody is left to read the results or correct course — but work already in
flight is different and must land.

---

## Authority: capability-based, not identity-based

**The problem.** Every caller is the same uid on the same socket, so the daemon cannot tell the
human from another orchestrator. "Close is never gated" therefore did not mean *you* can always
kill — it meant *anyone* can, including orchestrator B closing A's fleet mid-run.

**The industry mechanism** is capability-based security: you may act on an object because you
hold an unforgeable reference to it, never because of an identity check. Unix file descriptors,
Capsicum, seL4, Fuchsia handles, Wayland object ids, Cap'n Proto.

**Correction to an earlier over-claim:** there is no *human* principal, but every caller does
get an orch-issued agent id at `hello`. That is the thing to check against — ours, not the OS's.

### The rule

> **You may act on an agent if you hold its lease, or if it has no holder.**

- An orchestrator cannot touch another orchestrator's orchs. They are held;
  `lease.holder_id ≠ you` refuses. Not their panes, not their model, not their dispatches.
- The human can always kill what is left behind. An orphan is unheld — there is no exclusion to
  enforce, because nobody is being excluded.
- Forcing into a **live** orchestrator's fleet is `--steal`: deliberate, explicit, recorded as a
  lease handoff.

### Fencing tokens

The classic lease failure: a holder is suspended (laptop sleeps), its lease expires, someone
adopts, then the old holder wakes and writes as though it still owns things.

`agent_leases.id` is a monotonically increasing integer, which is exactly a fencing token. A
caller presents the lease id it believes it holds; the daemon rejects anything below the
current one. A woken zombie cannot clobber the adopter.

### Where this bites

| case | behaviour |
|---|---|
| Two sessions in one repo | each holds its own fleet; neither can dispatch into the other's |
| `orch work` on a shared queue | a task is assignable only to an agent whose lease you hold |
| `orch close --all` | sweeps what you hold, plus unheld orphans |
| `orch status` / `orch events` | reads — never gated, you see everything |
| Adopting orphans | permitted precisely because they are unheld |

---

## Containment vs ownership

`space > pack > agent` is **containment** — a scope, static, no lifecycle meaning. One agent
holding another is **ownership** — a lease, one holder, transferable, and the holder's death
matters.

**Nobody owns a space.** It does not die when an agent does. It carries `created_by` as
provenance and nothing more.

The decisive argument against an orch owning its space: it would then hold authority over
every *other* orch's agents in that space. Orchs in one space are peers. Two masters can work
the same farm and neither commands the other's people.

**UI falls out for free.** Containment is a tree, so both entry points are available with no
model change — space-first (one grouping, several packs, unheld agents at space level) or
orch-first (your packs across spaces). Navigation, not modelling.

## "Workspace" was the wrong word — it is a Space

The term was doing two jobs, and that is why several design questions kept landing slightly
beside the point. Every conversation slid toward directories and roots, because that is what
"workspace" means everywhere else in the stack.

- **Space** — orch's grouping of work. User-created, optional, on every agent, mutable.
  Relates any number of packs into one effort; server work and client work are one space. Not
  a path. Nothing owns it.
- **Workspace** — the physical working location on disk. Placement, never a name the user
  chose.

**"Project" was considered and rejected**: users are working on *their* project using orch,
and a second orch-owned meaning forces them to hold two ideas at once.

Full reasoning in `adr/0001-space-not-workspace.md`. Glossary in `/CONTEXT.md`.

## A space is the reachability boundary

This is what a space is *for*, beyond filing:

- **No space** → the boundary is the **repo root**, not the exact cwd. Two orchs in different
  subdirectories of one repo may coordinate; that is obviously one effort.
- **Different repos, no space** → no peer link. Unrelated work until you say otherwise.
- **Wider** → create a space and put both in it. That act *is* the statement "these belong
  together, they may coordinate."

Two riders: **repo root, not cwd** (exact-cwd matching splits one repo into invisible islands
nobody can debug), and this **gates messaging, not visibility** — reads are never gated, or
the god-view stops being a god-view.

## Space CRUD — free on the label, lease-gated on the membership

| operation | who |
|---|---|
| create | any orch |
| read | anyone — reads are never gated |
| rename | any orch in the space |
| delete | anyone, **only when no other pack is in it** (human may force with a flag) |

Delete was the only dangerous one, and it turned out not to be an authority problem. If A
deletes a space while B's pack sits in it, B's agents silently lose their grouping *and their
reachability wall moves underneath them*.

So: **an orch may delete a space it is in**, provided no *other* pack is in it — its own
agents' space goes null, which is its call to make about its own agents. **Another orch in it**
→ refused.

A **totally empty** space has no orch to act on it. That is the user's job: the web surfaces
empty spaces and you delete them there. Same daemon method underneath — two doors, one code
path.

The test is never "do you own the space." It is the same test as everywhere else: *would this
touch an agent you do not hold?*

**Membership needs no space-side rule.** An agent's space is a property of the agent, so
changing it is driving — only its holder may. An orch moves its own agents in and out and
touches nobody else's. The thing worth protecting was never the space; it was the agents in
it, and those are already protected by the lease.

`created_by` and the creation date stay as provenance: visible, grants nothing. An orch that
made a space and then died leaves a perfectly usable space behind.

## The queue is scoped, and scope decides what survives

**Today the queue is a pool with a hole in it.** A task carries `origin_workspace`, `agent_key`
is stamped at *first claim* rather than at enqueue, and `orch work` hands a queued task to any
idle agent in that workspace — **including another orch's slaves**. A's work lands inside B's
pack and B's holder never asked for it. That is the pack wall crossed from the other
direction.

### Push and pull are different, and only push is driving

- **Dispatch is push** — the orch sends a task *at* a specific agent. Driving, so gated.
- **Claiming is pull** — the agent takes work from a scope it belongs to. The agent acts on
  itself, so **no holder need be present**.

The gate therefore sits on **enqueuing into a scope**, never on claiming. Once a task is in
the pack queue, the pack's slaves drain it whether or not their orch is alive.

The orch chooses the scope at enqueue:

| scope | who may claim | when the orch dies |
|---|---|---|
| **agent** | one named agent | still bound; runs when that agent takes it |
| **pack** | any idle agent in that pack | **drained normally** — the pack keeps working |
| **space** | any *opted-in* pack in the space | still claimable — the work carries on |

Only work bound to the dead orch *itself* is stuck, because there is nobody to run it.

Enqueue rights: an orch may enqueue to an agent it **holds**, to a **pack it holds agents in**,
or to a **space it is in**.

A pack is the spawn tree — provenance, immutable, and it outlives its orch, which is what keeps
a pack queue claimable after the orch dies. What *holding* decides is the right to put work in:
adoption earns it, provenance never grants it. Same rule as Cq5 at a coarser granularity.

### Queue CRUD

| operation | who |
|---|---|
| **cancel** | whoever enqueued it, or whoever holds the agents it targets. The human always. |
| **edit** | only the enqueuer, and only while still `queued` — never after it is claimed |
| **read** | anyone |

### Clearing out work that was left behind

Two states, and only one of them justifies deletion:

- **Unrunnable** — the task's scope contains no live agent. Agent-scoped and the agent is
  closed; pack-scoped and the pack is gone. Nobody can ever claim it, so it is surfaced as
  unrunnable and is reapable. That is a *fact about the task*, not a timer.
- **Stale** — queued a long time but still claimable. Surfaced in `orch status` and the web so
  it gets noticed and decided about. **Never deleted on age.**

**"Nobody can ever run this" is a reason to delete. "Nobody has run this yet" is not.** An
age-based auto-delete would fire in exactly the case that matters — you came back a day later
to pick the work up.

### Nothing reaps a task on a timer, because "unrunnable" is not permanent

Unrunnable says *no live agent is in this scope right now*. A session that runs `orch` gets an
agent row at `hello` and can hold agents, so a new arrival changes the population of a scope.
An auto-reaper deletes on a timer precisely what the next orch was about to pick up.

Two cases, and only one is really unrunnable:

- **The pack's agents are alive but unheld.** Not unrunnable — *undriven*. The slaves could
  always claim it (claiming is pull). A new orch adopts them and the pack drains its own queue.
- **The pack's agents are all closed.** The scope is empty and stays empty. The task runs only
  if someone **re-scopes** it to a pack that exists.

Three resolutions, all deliberate: **take it on** (re-scope to the taker's pack), **leave it**,
**reap it**. The surfacing is the mechanism; the decision is always a person's or an orch's.

**Adoption carries the queue.** A pack-scoped task is scoped to the pack, not to the dead orch,
so adopting the agents gets the queued work with them — the same "nothing to re-parent" as the
subtree.

Four rules it needs:

1. **Space scope needs two-sided consent.** Publishing is an *offer*; a pack only consumes
   from the space pool if its holder opts in. Without that, "space" is the current bug with a
   nicer name.
2. **Results go to the enqueuer, not the runner.** A task carries who enqueued it; delivery
   back across packs is orch↔orch messaging, which is allowed.
3. **Agent scope requires holding at enqueue** — binding a task to a specific agent is
   driving. The binding is to the agent, so a later adoption keeps it and the new holder
   drives it.
4. **Retry re-binding follows scope.** Today `agent_key` survives every requeue, so a failed
   task is pinned to an agent that may be dead. A failed *pack*-scoped task retries anywhere
   in the pack; only an *agent*-scoped task re-pins.

`origin_workspace` disappears — scope replaces it, one concept instead of two.

## Communication rules

| | allowed |
|---|---|
| orch ↔ its own slaves | yes |
| orch ↔ orch, same space | yes — they are leaders and may need to coordinate |
| slave ↔ another pack's slave | **no** |
| orch → another pack's slaves | **no** |

Orch-to-orch is **messaging, never driving**. An orch may tell another orch something; it can
never dispatch, steer, or end anything in that pack. Authority stops at the pack wall.

## Names are labels; ids are identity

**A name is for the human side only.** Accepted at the boundary — a typed command, a UI click
— resolved to an id there, and never carried past it. Every relationship, stored record,
protocol message and invariant refers to the id.

Consequence: a rename costs nothing and breaks nothing, and **no uniqueness constraint is
needed for correctness**. Duplicate names are legal; an ambiguous target is a lookup that
returns more than one row and asks for the id.

The earlier "how do you name an orphan?" question was malformed — an agent's name is its own
and never depended on the session that spawned it.

## `detach` is a release, not a lifetime change

With lifetime gone there is nothing to change, so the verb has exactly one meaning: *I am done
holding this; it is nobody's; anyone may adopt it.* No ambiguity between "keep running without
me" and "hand it over" — they were always the same act.

---

## One daemon per machine — it is the integration layer, not a per-shell tool

**The defect.** `$ORCH_DIR` defaults to `~/.orch`, so it follows the *shell's* home directory,
and the CLI reads `$ORCH_DIR/agents/` directly and renders from it. The store therefore **is**
the state, and two shells with two homes are two universes. Non-negotiable #4 already forbade
this — it just said "the web" where it had to say "every client".

**The rule.** One orchd per machine. The CLI on either OS, the web, and a harness bridge are
all clients that dial it. `$ORCH_DIR` is orchd's private backing store: an implementation
detail, never an address, never something a client reads to decide anything. Discovery is
separate from storage — a socket path and the token file.

### Windows and WSL are one machine, so they get one daemon

Two daemons would be two lease tables, two identity spaces, and two answers to *who holds
this*. Forced to one.

What genuinely differs across the boundary is **execution, not truth**: a WSL daemon cannot
`kill(pid, 0)` a Windows process, and `processInstanceMatches` is the single primitive the
lease model stands on. That is not an argument for a second daemon — it is an argument that the
far side needs an **executor**, which is precisely the backend port from Rule 9: start a
process somewhere, report whether it is alive, kill it. The OS boundary is placement plus a
capability, and per E3 adding it edits zero renderers, commands, or policy.

### The store pins which side hosts

**No OS is privileged.** A Windows-only machine hosts on Windows, a Linux-only machine on
Linux, and neither has a boundary to cross or an executor to supply. The host question only
exists on a machine running both.

**Host where the agents and the plexer already are.** The store must sit on a native
filesystem: `src/doctor/config.ts:71` already refuses `$ORCH_DIR` on DrvFs because SQLite WAL
there is slow and unsafe. A Windows-hosted daemon puts the store on NTFS and makes every
WSL-side liveness check cross the boundary.

The same node-safe binary runs on either side, but **never both at once**. Machine-wide
registration: a second start on the other side refuses and prints where the live one is, and
doctor verifies declared-vs-reality like every other check.

An OS side with no executor is a **declared missing capability** — an honest "nothing can run
here", never a crash and never a silently empty list.

### What this retires

- **Visibility scoped by plexer workspace.** `scopeFleetRows` (`src/commands/status.ts:187`)
  hides every row whose workspace is not `currentWorkspace()`, so changing herdr window makes
  a live fleet vanish. Reads are never gated; grouping is a **space** you named.
- **`orch status --offline`.** A second reader of a second source. It survives only as a
  doctor affordance that says loudly it is not the truth, or it goes.

---

## Still open

| # | question |
|---|---|
| 3 | Is an unheld agent eligible for queued work, and from whose queue? |
| 4 | Where does a session's name come from when two sessions share a repo? |
| 5 | Can any harness reliably signal a clean exit, or is every ending a crash? |
| 6 | Retention: how long does an unheld idle agent live before closing? |

## Ownership is not transitive — the limbs are still living

Work and agents do not disappear when a parent dies or a root dies.


A holds B, B holds C, A dies. **Only A dies.** B is alive and keeps holding C — its right to
hold comes from being *alive*, not from being *held*. Nothing else changes and no work is
lost.

What A's death produces is a **discrepancy**: B is now unheld. From there, either a new
orchestrator attaches and takes over, or the user kills it. Both are choices someone makes,
never something that happens on a timer.

Adopting B therefore gets you its whole subtree for free — you hold B, and B still holds C.
There is nothing to re-parent.

## A pack starts at one, and membership is the provenance root

A harness session that runs `orch` gets an agent row at `hello` and is **a pack of one** before
it spawns anything. Spawning grows a pack; it never creates one.

**An agent's pack is the set of agents sharing its provenance root.** One pack per agent at any
depth, no ambiguity about *which* pack a queue is scoped to, and stateable without the words
"orch" or "slave" — it passes the fractal test.

This corrected the role words too. "An orch is an agent that spawns others" made a pack of one
ownerless: no orch, and its single member a slave with nobody above it. So: **an orch is the
root of a pack; a slave is any non-root member.** Still derived from the tree, still stored
nowhere.

### Pack size is capped, and the cap is policy

**Default 10 live members — one orch and nine slaves — configurable in `settings.json`.**

Enforced at the spawn command, exactly like the depth-2 rule, and for the same reason: it is a
limit on what a user wants to run, never a fact about what the model can represent. Counted in
**live** members, so a closed agent returns its slot and history never consumes the budget.

**A spawn past the cap is blocked, never queued and never merely warned.** A blocked spawn is
not a dead end though — it hands the orch the two scopes it already has:

- **point the task at a live slave** — agent scope, which it may do because it holds them
- **put it on the pack** — pack scope, claimed by whichever slave frees up first

Spawning is how a pack gets **capacity**; the queue is how it gets **throughput**. The cap is
what makes an orch choose the right one instead of growing without limit.

## The model is recursive; the current policy is depth-2

**Multi-level spawning is not allowed for now.** One orchestrator, its workers, and that is
the tree.

But the *rules* are fractal and must be written recursively, because a rule that quietly
assumes two levels will break the day depth changes — and it will break badly, everywhere at
once.

So the depth limit is **policy, enforced at the spawn command**. It is never baked into the
model:

- Provenance is a self-reference. It does not know how deep it is.
- Holding is a self-reference. Same.
- Every rule already settled works at any depth: holding is not transitive, provenance is
  immutable, adopting brings the subtree, an unheld agent keeps what it holds.

Test for any new rule: **state it without using the words "orchestrator" or "worker".** If it
cannot be stated that way, it is depth-dependent and it is wrong.

## Settled in passing

- Live views group by lease; history groups by provenance.
- `orch events` scope follows ownership, not `spawnedBy` — an adopted fleet must be watchable.
- Nested spawn: A spawns B, B spawns C, B dies → C becomes unheld. It does not fall to A; A
  never held it.
- Reads are never gated.
- A transfer must not disturb the agent: no reset, no re-attach, no context loss. If a handoff
  requires touching the agent, ownership is still welded to identity or placement.
