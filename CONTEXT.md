# Context — orch glossary

The language of the domain. Definitions only: no implementation, no schema, no decisions.
Decisions live in `TASKS/adr/`. Plans live in `TASKS/`.

---

## Vocabulary is a display concern

`orch` and `slave` are **role names**, and a role is *derived from the tree* — an agent that
spawned others is an orch; a leaf is a slave. Nothing stores a role.

So the words live at the display boundary and nowhere else: never in a column, never in a
stored value, never in a protocol message, never in an id. Swapping a term for one a user
prefers must be a change in **one** map.

| term | what it is |
|---|---|
| **orch** | the agent that spawns and directs others |
| **slave** | a spawned agent doing one slice of work |
| **pack** | an orch and the slaves it spawned |
| **space** | a user-created container that groups packs *(proposed)* |

---

## The participants

### Agent

**Any participant orch knows about.** The base entity — there is only one kind of thing.

An orch is an agent. A slave is an agent. A harness session driving the CLI is an agent. They
differ only in what spawned them and what they hold, never in kind.

Every agent has an **id** that never changes, a **name** that can, a **placement**, and
optionally a **space**.

### Orch

**An agent that spawns and directs other agents.** It does the thinking, slices the work, and
drives its slaves.

Not a special kind of entity — an agent that happens to have spawned others.

### Slave

**An agent spawned by an orch**, to do one slice of work. A leaf of the tree.

### Pack

**An orch together with the slaves it spawned.** The unit of ownership and the boundary of
control.

Not something the user creates; it exists because spawning created it.

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

---

## Ownership

### Hold

**The relationship that gives one agent the right to drive another.** One holder at a time,
transferable, and it ends.

Holding is *authority*, not parenthood. It answers "who may drive this right now?", never
"where did this come from?"

### Holder

**The agent currently holding another.** Only the holder may drive it.

Holding is **not transitive**: an agent's right to hold comes from being *alive*, not from
being *held*. If its own holder dies, it keeps everything it holds.

### Unheld

**An agent with no holder.** A normal state, not a leak or an error.

An agent becomes unheld when its holder releases it or dies. It keeps working, keeps its
name, keeps its space, and keeps anything it holds — it has simply lost its driver.

### Orphan

**An unheld agent whose holder died**, as opposed to one deliberately released.

Work and agents do not disappear when a holder dies. The limbs are still living.

### Adoption

**Claiming an unheld agent**, taking over as its holder.

Always deliberate and always targeted. Adopting an agent brings whatever it holds, because it
never stopped holding — there is nothing to re-parent.

### Provenance

**Which agent spawned this one.** A permanent historical fact that never changes, even after
the spawner is gone.

Provenance is not ownership. Ownership says who may drive it now; provenance says where it
came from. Live views group by holding; history groups by provenance.

---

## Grouping and location

### Space

*(proposed)*

**A user-created container that groups related work**, relating any number of packs into one
effort. A website's server work and client work belong in one space.

Optional. Identified by name. Not a path, and it says nothing about where anything runs. A
*container*, not a participant: it does not act, it is not alive or dead, and **nothing owns
it**.

A space is also the **reachability boundary**: orchs in one space may coordinate; across
spaces they may not. With no space set, the boundary is the repo root.

### Placement

**Where an agent is currently running** — its harness, its plexer, its handle, its directory.

Recorded, queryable, and displayed. It **changes**, because agents move. It is never
identity.

### Workspace

**The physical working location on disk** — the directory, the worktree, or the plexer's own
grouping of it. Part of placement.

Never orch's name for anything, and never shown as a name the user chose. For grouping work,
the word is **space**.

### Harness

**What runs an agent** — `pi`, `claude`, `codex`, `omp`. The coding agent itself.

### Plexer

**What places an agent** — `herdr`, `tmux`, or `headless`. The terminal multiplexer, or the
absence of one.

Harness and plexer are independent axes. Neither is ever inferred from the other.

### Capability

**Something a plexer declares it can do** — show a screen, take focus, accept keystrokes.

Behaviour branches on capabilities, never on which plexer it is. A plexer with no
capabilities is one orch has no *shortcut* for, not one orch cannot reach.

---

## Verbs

### Dispatch

**Give an agent a task.** Driving — only its holder may.

### Steer

**Interrupt an agent mid-turn with a correction.** Driving — only its holder may.

### Release

**Give up holding an agent**, deliberately. It becomes unheld and adoptable, and it keeps
working.

### Abort

**End an agent's current turn.** The agent survives.

### Close

**End an agent's process.** Its record and history survive.

### Reap

**Delete an agent's record.** The last ending; nothing survives it.
