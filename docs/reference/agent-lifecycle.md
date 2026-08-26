# Agent lifecycle — what keeps an agent alive

Binding architectural direction, at the same level as `agent-ownership.md` and
`learnings/2026-07-16-harness-plexer-architecture.md`. Read this before touching spawn,
reaping, retention, session death, adoption, or anything that ends an agent.

`agent-ownership.md` says orch owns every agent and that an environment is placement.
This document answers the next question: **whose intent keeps a particular agent alive,
and what happens when that intent goes away.**

## Held, or unheld. There is no third state and no human principal.

An agent is **held by a session**, or it is **held by nobody**. Unheld is a normal state,
not a leak.

You are not an owner, because you are not in the model. You interact only through the CLI
and the web — two doors into one daemon — and neither carries an identity. Writing an
owner value that means "the human" is the same bug as writing `"local"` for a workspace:
a missing value dressed up as a principal. There are no accounts, and there never will be;
same-uid is the entire trust boundary.

Your intent reaches the system in exactly two forms:

- **Standing intent** — `settings.json`. Grace windows, retention, defaults. This is the
  only thing that acts on an unheld agent.
- **Live intent** — a command. CLI or web, same daemon method, never two code paths.

## Ownership is a lease, never a parent pointer

A parent pointer describes the past. Lifecycle is a question about the present.

| operation | who asserts | meaning |
|---|---|---|
| **renew** | the holder, implicitly | the holder's process is provably the same instance |
| **release** | the holder | clean exit — done with these |
| **handoff** | the holder | names another holder |
| **adoption** | a claimant | claims an unheld agent |
| **expiry** | nobody | the holder is gone; the agent becomes unheld |

Expiry is not a transfer. Nothing moves and nobody receives it.

Evidence and intent stay separate: `processStartToken(pid)` in `src/daemon/lifecycle.ts`
is *evidence* for renewal. The lease is the *statement*. Every future liveness mechanism
plugs into the evidence side and changes nothing else.

## `spawnedBy` is provenance and must NEVER become the owner field

Two fields. One immutable, one mutable. Never the same column.

- **Provenance** — who spawned it. Historical fact, never rewritten.
- **Ownership** — who holds it now. Transferable, or you can never hand off, never adopt
  an orphan, never survive an orchestrator restart.

`spawnedBy` already exists on every agent and is the obvious place to put ownership. Doing
that destroys the only field that answers "where did this come from."

**Consequence with teeth:** `orch events` currently scopes on `spawnedBy`. Adopt an
orphaned fleet under a provenance-scoped watch and you see none of them. **The watch scope
follows ownership.** That is the first proof the two fields are different ideas rather
than one idea named twice.

## Two lifetimes, chosen at spawn. Default is fate-share.

This is the settled shape. It is not a compromise between strict and permissive — the two
use cases are genuinely different, and every mature system in this space ships both.

| | behaviour |
|---|---|
| `orch spawn` (default) | **owned** — fate-shares with the spawning session |
| `orch spawn --detached` | **survives** the session. **Requires a name.** No holder. Ends only by command or retention. |
| `orch detach <target>` | promote a live owned agent to detached — "I'm leaving, keep going" |

**Detached requires a name, always.** A nameless thing with no holder is unreclaimable
garbage by construction.

This is what makes clean-exit signalling an optimisation rather than a correctness
requirement: **if you meant to walk away, you said so; if you said nothing, you meant them
to die.** A harness that can announce its exit merely cleans up in seconds instead of
waiting out the grace window.

## When a holder dies

Only **owned** agents are affected. Detached agents were never at risk.

1. **Quiet, immediately.** No dispatch, no queue assignment, no steer reaches them. The
   fleet stops when you leave, which is what a user expects to have happened — so the
   strict rule is true from where they are standing.
2. **The in-flight turn finishes and writes its result.** It is already paid for. This also
   caps orphan spend at exactly one turn.
3. **Processes hold for a grace window**, then close. History is kept.
4. **Adoption is available for the whole window, and announces itself.** Starting a new
   session where orphans exist says so unprompted; the web shows them as their own bucket,
   never mixed into the live fleet.

Strictness is not the risk — irreversibility is. Strict plus reversible is predictable.
Strict plus irreversible makes people afraid to spawn.

## Your command always wins. Ownership never gates permission.

There is nobody to authorize against, so **no command is ever checked against ownership** —
not kill, not steer, not reap. A held agent and an unheld agent are equally killable from
either door. Ownership governs *automatic* behaviour only.

This is the invariant that makes a grace window affordable at all: you can always end it
early by hand.

Two things follow:

- **The kill path must not route through the holder.** "Ask the owner to shut it down"
  makes a dead holder's agent immortal — precisely the case the feature exists for.
- **The kill path must not touch anything transient** — not the spawner's process, not its
  pane, not the plexer. Same seam as Rule 11: this is orch's mechanism; a pane is a
  shortcut.

**Gap this exposes:** for a headless agent whose spawner is gone, orch knows it exists,
knows it is unheld, and has no proven handle to end it. A pane backend hides this because
closing the pane happens to kill the process. The fix is the same primitive applied twice —
record the agent's pid and start token at spawn, exactly as sessions do.

## Ending an agent is three verbs, not one

| verb | effect |
|---|---|
| **abort** | end the current turn; the agent stays |
| **close** | end the process; the record and history stay |
| **reap** | drop the record too |

History is owned by the machine and outlives all three. Stale presence dirs are the third
verb having no owner and no trigger.

## Why this shape — prior art

Every convergent design here was arrived at independently by several systems:

- **Erlang/OTP** — `spawn` / `spawn_link` / `spawn_monitor`. Fate-sharing is deliberate:
  "if the top-level processes of our system end, we don't want their child processes
  carrying on without them." `monitor` is the third relationship — watch without owning.
- **Ray** — actors fate-share with their creator by default; `lifetime="detached"` opts
  out and **must be named**.
- **Kubernetes** — `ownerReferences` plus a propagation policy chosen at delete time:
  Background, Foreground, **Orphan**. Deliberate orphaning is a first-class act, which is
  what `orch detach` is.
- **Consul sessions** — TTL, renew, release-vs-delete on invalidation, and a **lock-delay**
  cooldown after expiry so a flapping holder cannot thrash ownership. Worth stealing.
- **systemd** — on letting processes escape lifecycle management: it "allows processes to
  escape the service manager's lifecycle and resource management, and to remain running
  even while their service is considered stopped and is assumed to not consume any
  resources." That is a verbatim description of the stale presence dirs in `$ORCH_DIR`.
- **Windows job objects / cgroups** — `KILL_ON_JOB_CLOSE` terminates a process tree
  atomically, kernel-enforced, no polling and no races. Free for headless, where orch owns
  the tree; unavailable for panes, which the plexer owns.
- **Temporal** — the far end: the *work* is durable state and workers are disposable, so
  nothing fate-shares because the process was never the thing that mattered. That is a
  rewrite, not a feature. The `runs` / `events` / history tables point that way; nothing
  here closes that door.

## Open — do not decide these unilaterally

1. **Nested spawn.** A spawns B, B spawns C, B dies. Does C become unheld, or does it fall
   to A? Unheld is the honest answer — A never asked for C — but it is a real call.
2. **Grace window default.** Minutes, not seconds. The exact number is a setting and needs
   a chosen default.
3. **Does an orphan settle-and-close, or hold-for-adoption**, when the window ends without
   a command?
4. Carried from `agent-ownership.md`: bare `trmcsf8ifc` vs `orch~trmcsf8ifc`, and whether
   one orch workspace may span environments.
