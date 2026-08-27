# Vocabulary — the long form

The full definitions. The one-line index is `00-glossary.md`.

Definitions only: no implementation, no schema, no decisions. Decisions live in `02-scope.md`
and `adr/`; the schema lives in `06-schema.md`.

---

## Vocabulary is a display concern

`orch` and `slave` are **role names**, and a role is *derived from the tree* — the root of a
pack is an orch, every other member a slave. Nothing stores a role.

So the words live at the display boundary and nowhere else: never in a column, never in a
stored value, never in a protocol message, never in an id. Swapping a term for one a user
prefers must be a change in **one** map.

| term | what it is |
|---|---|
| **orch** | the agent that spawns and directs others |
| **slave** | a spawned agent doing one slice of work |
| **pack** | an agent and everything spawned beneath it |
| **space** | a user-created container that groups packs |

---

## The participants

### Agent

**Any participant orch knows about.** The base entity — there is only one kind of thing.

An orch is an agent. A slave is an agent. A harness session driving the CLI is an agent. They
differ only in what spawned them and what they hold, never in kind.

Every agent has an **id** that never changes, a **name** that can, an **environment**, and
optionally a **space**.

### Orch

**The root of a pack** — the agent nothing else spawned. It does the thinking, slices the work,
and drives its slaves.

Not a special kind of entity, and not a thing you become by spawning: a harness session that
registers with orch is already an orch, of a pack of one.

### Slave

**Any non-root member of a pack**, doing one slice of work.

### Pack

**An agent and everything spawned beneath it.** The unit of ownership and the boundary of
control.

An agent's pack is the set of agents **sharing its provenance root**, so every agent is in
exactly one pack at any depth. A pack begins at one member and grows by spawning — nobody
creates one, and nobody has to.

Because provenance never changes, an agent is in one pack for life and a pack outlives its
orch. Adoption moves the **lease**, never the membership — an orphaned pack still has its
members and still drains its queue.

A pack has a **maximum size**, counted in live members and set in `settings.json`.

---

## Identity and naming

### Id

**An agent's identity.** Minted from nothing, opaque, and it never changes.

Everything that must be correct refers to the id and nothing else: every relationship, every
stored record, every protocol message, every invariant.

### Name

**An agent's human-facing label** — `api-1`, `parser-guards`. Mutable, and meant to change
when the work changes.

Names are for the human side. A name is accepted at the boundary — a typed command, a UI
click — resolved to an id there, and never carried past it. **Nothing fundamental depends on
a name**, so a rename costs nothing and breaks nothing.

**Spawning an agent requires naming it.** There is no default and nothing is auto-named, because
a name exists to be typed and a generated one never is.

The one exception is an agent nobody spawned — a session that registers itself. It has no
spawner to name it and no way to ask, so orch mints `<harness>-<first 8 of its id>`.

**Any agent may rename itself.** That is the agent acting on itself, not driving, so it needs no
lease — the same reason claiming needs none. Renaming *another* agent is driving.

Names carry no uniqueness rule, because nothing in the code ever reads one. Duplicates are a
**usability** problem, not a correctness one: orch refuses to hand out a name already in use and
says so when you supply one that is. An ambiguous name is a lookup that found more than one
agent and asks which id you meant.

---

## Driving

### Lease

**The record of which orch may drive an agent right now** — dispatch to it, steer it, set its
model, reset it. One at a time, transferable, and it ends.

A lease is *authority*, not parenthood. It answers "who may drive this right now?", never
"where did this come from?" Normally an orch leases its own slaves, because it spawned them.

Leasing is **not transitive**: an orch's right to drive comes from being *alive*, not from
being driven itself. If the orch above it dies, it keeps every lease it has.

### Unleased

**An agent no orch has a lease on.** A normal state, not a leak or an error.

An agent becomes unleased when its orch releases it or dies. It keeps working, keeps its name,
keeps its pack, keeps its space, and keeps every lease it holds on others — it has simply lost
its driver.

### Orphan

**An unleased slave whose orch died**, as opposed to one deliberately released.

Work and agents do not disappear when an orch dies. The limbs are still living.

### Orphaned pack

**A pack whose orch is dead.** Its slaves keep working, keep draining the pack queue, and keep
their own leases. What the pack has lost is a driver — nobody can dispatch or steer into it
until it is adopted.

An orch a human started is under no lease at all, and that is normal. A pack is orphaned
because its orch *died*, never because nothing leases the orch.

### Adoption

**Another orch taking the lease on an orphan**, so the work has a driver again.

Always deliberate and always targeted, and it brings that agent's own leases with it, because
they never lapsed. **Adoption never moves a pack.** A pack is an orch and everything it
spawned; adopting is not spawning, so the adopted slaves stay in the pack they were born into
and the adopting orch drives them from outside it.

### Provenance

**Which agent spawned this one.** A permanent historical fact that never changes, even after
the spawner is gone. It is what a pack is made of.

Provenance is not a lease. A lease says who may drive it now; provenance says where it came
from. Live views group by lease; history groups by provenance.

---

## Grouping and location

### Space

**A user-created container that groups related work**, relating any number of packs into one
effort. A website's server work and client work belong in one space.

Optional. Identified by name. Not a path, and it says nothing about where anything runs. A
*container*, not a participant: it does not act, it is not alive or dead, and **nothing owns
it**.

A space is also the **reachability boundary**: orchs in one space may coordinate; across
spaces they may not. With no space set, the boundary is the repo root.

Any orch may create, read or rename a space. An orch may **delete a space it is in**, provided
no other pack is in it — so nobody moves the wall out from under someone else's agents. A
totally empty space is the user's to delete, surfaced in the web.

Membership is a property of the *agent*, so only the orch leasing it may move it in or out.
`created_by` records who made it and grants nothing.

### Environment

**Where a thing is and what surrounds it** — its directory, its repo, its worktree and branch,
the harness it runs inside, the plexer it sits in, the space it belongs to, and which OS side it
is on.

**Everything has an environment** — an agent, a pack, a space. It is not a property only agents
get.

Recorded, queryable, and displayed, and never identity. Parts of it **change** — a pane gets a
new coordinate, an agent joins another space — and each change is a new record. Parts of it
cannot: a running process cannot change its directory or its harness, so those are fixed at
birth.

A plexer's own coordinates are part of an environment and nothing more: orch stores what the
plexer needs handed back, and neither names it nor shows it as a name anyone chose.

### Harness

**What runs an agent** — `pi`, `claude`, `codex`, `omp`. The coding agent itself.

### Plexer

**The interaction layer between the human and their agents** — `herdr`, `tmux`, or `headless`
for its absence. A terminal multiplexer, and the terminal counterpart of the web view.

Its job is navigability and visibility: switch to any agent, watch it, talk to it. It gives
the human a real CLI or TUI onto the fleet, and it provides conveniences orch integrates with
— pane tiling, notifications, focus.

A plexer can also **hold orch's own structure**: a space or a pack can be given a home of its
own inside the plexer. The grouping is orch's and the name is orch's; the plexer only renders
it, using whatever it groups by internally.

Harness and plexer are independent axes. Neither is ever inferred from the other.

### Capability

**Something the environment provides** — a screen, focus, keystrokes. You cannot light a fire
without oxygen: what is possible follows from what is there.

So a capability is never a record and never a thing a plexer hands over. orch records the
environment — which plexer, which harness, which directory, which space — and knows what a
plexer of that kind and version provides. Nothing named "capability" is stored, and no plexer
declares anything to orch, which would couple orch to it in the other direction.

Behaviour branches on what the environment provides, never on which plexer it is. A plexer that
provides none of it is one orch has no *shortcut* for, not one orch cannot reach.

orch does not discover, test or negotiate at the moment of acting, and it never reaches for
something the environment does not have, because there was no path to it in the first place.

### Daemon

**The one process that holds the truth**, one per machine. Everything else — the CLI on any
OS, the web, a harness bridge — is a client that dials it.

Its store is private to it. A client that reads the store or the presence files is reading a
second source of truth, and there is no second source of truth.

### Executor

**What starts, checks and stops a process on the far side of an OS boundary.** Start it,
report whether it is alive, kill it — the same three questions the daemon asks anywhere.

An OS side with no executor is one nothing can *run* on — a fact about that environment, never
a reason for a second daemon.

---

## Work

### Task

**A piece of work put into a scope**, to be taken later by whoever belongs to that scope. It
carries its text, its options, who enqueued it and its scope — and nothing about who ran it.

Its enqueuer is where the result goes, which is what lets work cross a pack boundary and still
report home.

### Scope

**Which agents may claim a task** — exactly one of: a named **agent**, a **pack**, or a
**space**. Chosen when the task is enqueued and never inferred from where the enqueuer happened
to be standing.

Scope is also what survives an orch's death. A pack-scoped task stays claimable because the pack
outlives its orch; only work bound to an agent that is gone becomes unrunnable.

### Attempt

**One claim of a task by one agent** — its agent, its dispatch, when it started, how it ended.

A retry is the **next attempt**, never an edit to the last one. This is why a failed pack-scoped
task retries anywhere in the pack: the binding was never on the task to begin with.

### Intake

**A pack's standing opt-in to consume a space's pool.** Publishing into a space is an offer;
intake is the acceptance. Without both halves, "space" means work landing in packs that never
agreed to it.

### Home

**A space's or a pack's place inside a plexer.** The grouping is orch's and so is its name; the
plexer renders it using whatever it groups by internally, and hands back a coordinate orch
stores and never displays.

A plexer that cannot hold one is a plexer that does not provide it, not a plexer orch cannot
use.

### Idle

**No lease and no open attempt.** Derived, never stored: the instant it went idle is the later
of its last lease closing and its last attempt closing.

Idle is a normal state, not a leak. It is adoptable, and nothing ends it on a timer.

---

## Verbs

Every verb orch has is defined here. `02-scope.md` says which command surfaces it; it never
redefines one.

### Spawn

**Create a new agent inside your pack.** The spawner names it — naming is required, there is no
default — and the new agent's provenance points at the spawner forever, which is what puts it
in the pack.

### Adopt

**Take the lease on an orphan**, so work whose orch died has a driver again. Deliberate and
targeted. It moves a lease, never a pack.

### Detach

**Release the lease and walk away.** One meaning only: this is nobody's now, anyone may adopt
it. There is no lifetime to change, because work always survives its spawner.

### Dispatch

**Push a task at a specific agent.** Driving — only the orch leasing it may.

### Enqueue

**Put a task into a scope** — one agent, a pack, or a space — for an agent to take later.
Gated: an orch may enqueue to an agent it leases, to its own pack, or to a space it is in.

### Claim

**Take a task from a queue you belong to.** *Not* driving — the agent is acting on itself, so
no lease need be in force. A pack drains its queue whether or not its orch is alive.

### Steer

**Interrupt an agent mid-turn with a correction.** Driving — only the orch leasing it may.

### Release

**Give up the lease on an agent**, deliberately. It becomes unleased and adoptable, and it
keeps working.

### Abort

**End an agent's current turn.** The agent survives.

### Close

**End an agent's process.** Its record and history survive.

orch records **who asked**. An ending nobody asked for is a death, and that distinction is
orch's own — no harness is consulted about how it exited.

### Reap

**Delete an agent's record.** The last ending; nothing survives it.
