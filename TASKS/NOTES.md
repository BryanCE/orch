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

`workspace > orchestrator > agent` is **containment** — a scope, static, no lifecycle meaning.
An orchestrator holding an agent is **ownership** — a lease, one holder, transferable, and the
holder's death matters.

**Nobody owns a workspace.** A repo does not die when a session does. It carries `created_by`
as provenance and nothing more.

The decisive argument against an orchestrator owning its workspace: it would then hold
authority over every *other* orchestrator's agents in that repo. Orchestrators in one
workspace are peers. Two masters can work the same farm and neither commands the other's
people.

**UI falls out for free.** Containment is a tree, so both entry points are available with no
model change — workspace-first (one repo, several sessions, unheld agents at repo level) or
orchestrator-first (your sessions across repos). Navigation, not modelling.

## "Workspace" was the wrong word — it is a Project

The term was doing two jobs, and that is why several design questions kept landing slightly
beside the point. Every design conversation slid toward directories and roots because that is
what "workspace" means everywhere else in the stack.

- **Project** — orch's grouping of work. User-created, optional, on every agent, mutable.
  Relates any number of orchestrators and their agents into one effort; a server repo and a
  client repo are one project. Not a path. Nothing owns it.
- **Workspace** — the physical working location on disk. Placement, never a name the user
  chose.

Full reasoning in `adr/0001-project-not-workspace.md`. Glossary in `/CONTEXT.md`.

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

## Still open

| # | question |
|---|---|
| 2 | Do a dead orchestrator's *queued but unstarted* tasks run, or die with it? |
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
