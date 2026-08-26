# Participants — identity, placement, ownership, lifecycle

Binding architectural direction, at the same level as
`learnings/2026-07-16-harness-plexer-architecture.md`. Read this before touching identity,
keys, registration, placement, workspaces, spawn, ownership, reaping, or the backend port.

A **participant** is anything orchd knows about: an agent, or a session. This document is
the single place the participant model lives. Identity, where a participant runs, who holds
it, and what ends it are four faces of one concept and splitting them across documents is
how they drift.

**The rule this document exists to enforce: if orchd is running, it knows about every
participant. No orch invocation is anonymous to a live daemon.**

---

# Part 1 — Identity

## The axiom

**orch owns every agent.** An *environment* — herdr, tmux, headless, and whatever comes
next — is **where an agent is currently running**. It is recorded, queryable, and displayed.
It is never identity.

Every bug this document exists to prevent has the same shape: a coordinate belonging to some
environment leaked into a place where orch's own identity belonged.

## What is broken now

A key is `<backend>~<workspace>~<id>` — two of three segments are the plexer's facts. So an
identity is a *coordinate*, not a *name*, and three consequences follow:

- **A participant outside a plexer cannot be named at all.** A Claude Code session has no
  backend and no workspace, so no valid key exists for it. `spawnerIdentity()` returns
  `key: null` not by policy but because the format has nowhere to put it.
- **Every session in a workspace collapses into one actor.** `selfActor()` mints
  `<backend>~<workspace>~operator` with the literal string `operator` as the id, so two
  sessions driving the same workspace are indistinguishable.
- **The daemon believes whatever the client claims.** `governWrite` reads `params.actor` off
  the wire. The caller computes its own identity by asking the multiplexer, and orchd accepts
  the answer.

Everything downstream is compensation for the first point: `key: string | null`,
`spawnerIsRepliable()`, the conditional worker-header clause, and the
`spawner.key ?? callerOwnerToken()` fallback in two call sites that `policy/spawner.ts`
documents as forbidden. A comment cannot hold an invariant that the type permits.

## The model

One opaque, plexer-independent id per participant. Location becomes an attribute, never part
of the name.

```
id         2f8c…-…-…         UUID. Minted from nothing. Never changes.
kind       "agent" | "session"
label      "payroll-2" | "claude session 5fd5793e"
backend    "herdr" | null    where it runs, if anywhere
workspace  "wF" | null
handle     "%255" | null     the plexer's own pane id, if any
```

An agent fills every field. A session fills the first three. Same type, same table, same
addressability — the empty plexer fields are honest, because a session is not in a plexer.

## Four facts, never welded together

| fact | mutable | notes |
|---|---|---|
| **Identity** — the minted id, and nothing else in it | never | Part 1 |
| **Provenance** — who spawned it | never | `spawned.spawned_by` |
| **Ownership** — who holds it now | yes | Part 3 |
| **Placement** — environment, workspace, handle, cwd, worktree, branch | yes | Part 2 |

Anything encoded into an identity can never change without breaking every reference to it,
which is precisely why identity holds nothing but the minted id.

## The identity change this implies

The key becomes the bare minted id:

```
herdr~wF~trmcsf8ifc   →   trmcsf8ifc
```

Nothing is lost: `backend`, `workspace`, and `handle` are already columns on `spawned`, and a
presence dir stays self-describing because `status.json` already carries them — the agent
writes its own placement.

**Cost, honestly:** ~42 call sites across 12 files, every test fixture carrying a `herdr~w~x`
or `wD-p1A` key, presence dir names, and `spawned.pane` is the primary key. Rule 8 applies —
bump both schemas and reap; never accept two key shapes at once. This is a whole change on
its own, so **land the port seam (Part 2) first and identity second.**

## Registration

Identity is **issued by orchd, never derived by the caller.** A CLI process does not compute
who it is; it asks.

1. The process connects and calls `hello` before any other method, presenting the daemon
   token it read from `$ORCH_DIR`, its session pid, and a display label.
2. orchd verifies the token, which is the whole credential.
3. orchd returns the id recorded for that session pid, minting and recording one on first
   sight.

The session pid is the caller's parent process — the shell or harness that outlives any one
`orch` invocation — so continuity is the daemon's to keep rather than something each process
re-derives.

`hello` is the only place a participant enters the system. `selfActor()` and the four-branch
fallback in `spawnerIdentity()` are deleted, not adapted.

### Transports and how each one vouches

Both listeners are local. orchd prefers the unix socket and binds loopback TCP alongside it as
a fallback for machines where the socket cannot bind. **TCP is a transport fallback, never a
client class** — nothing is a second-class caller for arriving on it, and no client chooses
TCP while the socket is available. Every local client, the web server included, dials the
socket.

The trust rule is one sentence: **a caller is trusted when it is the same uid as the daemon.**
**One mechanism proves it on both transports**: a `0600` token file that orchd writes into
`$ORCH_DIR` at startup. A caller that can read it is necessarily the same uid, which is exactly
what kernel peer credentials establish — so nothing is weaker for arriving on TCP, and there is
no enrollment step, because reading a file you already have permission to read is the whole
handshake.

Peer credentials are not used, and this is a portability fact rather than a preference: node
exposes neither `SO_PEERCRED` nor a peer's process ancestry, so obtaining them means scraping
`/proc` and `ss`, which works on Linux alone. orch ships to node on every platform (Rule 6),
and an attribution path that exists on one OS is not an attribution path.

The pid and label in `hello` are the caller's own report. They serve continuity and display,
**never authorization** — a same-uid caller that misreports its session gains nothing it could
not already do by dialing again. A caller that presents no token, or no session pid, is
refused; it is never assigned a synthetic identity, and it is never asked to supply an id it
has no defined way to obtain.

### Commands that run without a daemon

`setup`, `doctor`, `help`, `version`, and `status --offline` are defined to work with no daemon
and therefore need no identity — none of them writes. Every command that writes already
requires orchd, so the split needs no new state: **no daemon means no writes, and no writes
means no identity is required.** A command must never invent a local identity because the
daemon is down.

## Inbox, and what registration does not promise

Every participant gets an inbox. Not every participant reads one promptly: a session acts when
its human prompts it, so a message to it is parked rather than delivered into a running turn.
orchd drains and holds; `orch status` surfaces the unread count.

Three separate facts, and only the last one varies:

- has an identity — always true of a registered participant
- has an inbox — always true
- reads it promptly — true of a live agent, not of a session between turns

Today the absence of the first is modeled as the absence of all three, which is why a worker
with no reachable spawner improvised a relay through a sibling instead of parking a message.

---

# Part 2 — Placement

## Workspaces are orch's, not the plexer's

An orch workspace may be **projected into** an environment — a herdr workspace, a tmux
session — and that projection is recorded as placement, exactly like an agent's. Same shape,
same rule, one level up.

This fixes two long-standing symptoms at once:

- **headless stops inventing `"local"`.** It gets a real orch workspace like every other
  environment. `"local"` was never a workspace; it was a missing value with a name.
- **orch stops squatting in a workspace you named.** It creates its own and records the herdr
  projection, instead of displaying `wF` — a coordinate herdr generated — as though it were
  something you chose.

## Where the port seam belongs

| orch owns | the environment provides |
|---|---|
| identity, lifecycle, addressing | starting a process somewhere |
| delivery: presence inbox → bridge → ack | a screen *(capability)* |
| reading output (captured) | focus, keystrokes *(capability)* |
| history, ownership, state, workspaces | fast-path typing instead of inbox *(capability)* |

**Delivery and read are orch's mechanism. A pane is an optimisation.**

That seam was drawn wrong, and the tell is that `headless` returns false from `deliver` even
though `inbox.jsonl → bridge → ack.jsonl` already works with no screen at all. A capless
environment is not one orch cannot talk to; it is one with no *shortcut* for talking to it.

## Capabilities, never environment ids

Renderers, commands, and policy branch on declared capabilities and never on an environment's
id. `backend === "herdr"`, `paneId === null`, and `key.startsWith("headless~")` are the same
mistake wearing three different hats: each infers an environment's identity and hard-codes
behaviour against it.

Adding an environment means declaring its capabilities. It must change no renderer, no command,
and no policy. If adding one requires editing a consumer, the seam is wrong.

**Placement is not lifetime.** `--backend headless` says *where* an agent runs; `--detached`
(Part 4) says *whether it survives its spawner*. A paned agent may be detached and a headless
agent may be owned. Fusing the two flags is this same mistake in a fourth hat.

---

# Part 3 — Ownership

## Held by a session, or held by nobody

An agent is **held by a session**, or it is **held by nobody**. Unheld is a normal state, not
a leak.

You are not an owner, because you are not in the model. You interact only through the CLI and
the web — two doors into one daemon — and neither carries an identity. Writing an owner value
that means "the human" is the same bug as writing `"local"` for a workspace: a missing value
dressed up as a principal. There are no accounts, and there never will be; same-uid is the
entire trust boundary (Part 1).

Your intent reaches the system in exactly two forms:

- **Standing intent** — `settings.json`. Grace windows, retention, defaults. This is the only
  thing that acts on an unheld agent.
- **Live intent** — a command. CLI or web, same daemon method, never two code paths.

## What ownership is for: one driver at a time

**Two live orchestrators must never drive the same agent.** Interleaved dispatches and
conflicting steers are chaos, and `checkOwnerWrite` in `src/store/ownership-rows.ts` exists to
prevent exactly that. It is correct and it stays. `--steal` is the explicit, deliberate
override for taking an agent away from another orchestrator.

This is **mutual exclusion, not authorization.** There is no principal to authorize against —
the distinction matters because it names precisely what the gate may and may not do:

- It may refuse a **second live orchestrator**. That is its whole job.
- It must never be satisfiable only by proving *who you are*, because nobody can.

**The defect today is that the gate has no liveness.** `ownership.owner` is a bare string with
no pid and no start token, so a claim left by a *dead* orchestrator is indistinguishable from a
live one and blocks writes forever behind `--steal`. A dead holder has nothing to collide with,
so there is nothing to exclude. The lease supplies the liveness the gate is missing.

## Ownership is a lease, never a parent pointer

A parent pointer describes the past. Ownership is a question about the present.

| operation | who asserts | meaning |
|---|---|---|
| **renew** | the holder, implicitly | the holder's process is provably the same instance |
| **release** | the holder | clean exit — done with these |
| **handoff** | the holder | names another holder |
| **adoption** | a claimant | claims an unheld agent |
| **expiry** | nobody | the holder is gone; the agent becomes unheld |

Expiry is not a transfer. Nothing moves and nobody receives it.

Evidence and intent stay separate: `processInstanceMatches(pid, token)` in
`src/process-identity.ts` is *evidence* for renewal. The lease is the *statement*. Every future
liveness mechanism plugs into the evidence side and changes nothing else.

## `spawnedBy` is provenance and must NEVER become the owner field

Two columns. One immutable (`spawned.spawned_by`, where it came from), one mutable
(`ownership.owner`, who holds it now). Never merged.

`spawnedBy` is the obvious place to put ownership because it already exists on every agent.
Doing that destroys the only field that answers "where did this come from."

**Consequence with teeth:** `orch events` currently scopes on `spawnedBy`. Adopt an orphaned
fleet under a provenance-scoped watch and you see none of them. **The watch scope follows
ownership.** That is the first proof the two fields are different ideas rather than one idea
named twice.

---

# Part 4 — Lifecycle

## Two lifetimes, chosen at spawn. Default is fate-share.

Not a compromise between strict and permissive — the two use cases are genuinely different,
and every mature system in this space ships both (see *Prior art*).

| | behaviour |
|---|---|
| `orch spawn` (default) | **owned** — fate-shares with the spawning session |
| `orch spawn --detached` | **survives** the session. **Requires a name.** No holder. Ends only by command or retention. |
| `orch detach <target>` | promote a live owned agent to detached — "I'm leaving, keep going" |

**Detached requires a name, always.** A nameless thing with no holder is unreclaimable garbage
by construction.

This is what makes clean-exit signalling an optimisation rather than a correctness requirement:
**if you meant to walk away, you said so; if you said nothing, you meant them to die.** A
harness that can announce its exit merely cleans up in seconds instead of waiting out the grace
window.

## When a holder dies

Only **owned** agents are affected. Detached agents were never at risk.

1. **Quiet, immediately.** No dispatch, no queue assignment, no steer reaches them. The fleet
   stops when you leave, which is what a user expects to have happened — so the strict rule is
   true from where they are standing.
2. **The in-flight turn finishes and writes its result.** It is already paid for. This also caps
   orphan spend at exactly one turn.
3. **Processes hold for a grace window**, then close. History is kept.
4. **Adoption is available for the whole window, and announces itself.** Starting a new session
   where orphans exist says so unprompted; the web shows them as their own bucket, never mixed
   into the live fleet.

Strictness is not the risk — irreversibility is. Strict plus reversible is predictable. Strict
plus irreversible makes people afraid to spawn.

## The kill path

**A dead holder must never make its agent immortal.** Two things follow:

- **The kill path must not route through the holder.** "Ask the owner to shut it down" fails in
  precisely the case the feature exists for.
- **The kill path must not touch anything transient** — not the spawner's process, not its
  pane, not the plexer. Delivery and read are orch's mechanism; a pane is a shortcut (Part 2).

**Gap this exposes:** for a headless agent whose spawner is gone, orch knows it exists, knows
it is unheld, and has no proven handle to end it. A pane backend hides this because closing the
pane happens to kill the process. The fix is the same primitive applied twice — record the
agent's pid and start token at spawn, exactly as the daemon lock does for itself.

## Ending an agent is three verbs, not one

| verb | effect |
|---|---|
| **abort** | end the current turn; the agent stays |
| **close** | end the process; the record and history stay |
| **reap** | drop the record too |

History is owned by the machine and outlives all three. Stale presence dirs are the third verb
having no owner and no trigger.

## Prior art

Every convergent design here was arrived at independently by several systems:

- **Erlang/OTP** — `spawn` / `spawn_link` / `spawn_monitor`. Fate-sharing is deliberate: "if the
  top-level processes of our system end, we don't want their child processes carrying on without
  them." `monitor` is the third relationship — watch without owning.
- **Ray** — actors fate-share with their creator by default; `lifetime="detached"` opts out and
  **must be named**.
- **Kubernetes** — `ownerReferences` plus a propagation policy chosen at delete time: Background,
  Foreground, **Orphan**. Deliberate orphaning is a first-class act, which is what `orch detach`
  is.
- **Consul sessions** — TTL, renew, release-vs-delete on invalidation, and a **lock-delay**
  cooldown after expiry so a flapping holder cannot thrash ownership. Worth stealing.
- **systemd** — on letting processes escape lifecycle management: it "allows processes to escape
  the service manager's lifecycle and resource management, and to remain running even while their
  service is considered stopped and is assumed to not consume any resources." That is a verbatim
  description of the stale presence dirs in `$ORCH_DIR`.
- **Windows job objects / cgroups** — `KILL_ON_JOB_CLOSE` terminates a process tree atomically,
  kernel-enforced, no polling and no races. Free for headless, where orch owns the tree;
  unavailable for panes, which the plexer owns.
- **Temporal** — the far end: the *work* is durable state and workers are disposable, so nothing
  fate-shares because the process was never the thing that mattered. That is a rewrite, not a
  feature. The `runs` / `events` / history tables point that way; nothing here closes that door.

---

# Invariants

Every invariant here names the mechanism that enforces it. **An invariant whose enforcement is
`NONE` is not a rule — it is a wish, and it will be broken.** Each one below was broken by code
written after it was written down, in a repo whose authors had all read the comment.

A rule stated in prose and enforced by nothing is the defect this table exists to prevent.
Adding an invariant means adding its enforcement in the same change, or recording `NONE` so the
gap is visible to the next reader instead of discovered by the next bug.

| # | Invariant | Enforced by |
| --- | --- | --- |
| 1 | A live daemon knows every participant. No anonymous invocation. | `hello` is the only entry point; there is no other way to obtain an identity |
| 2 | An id is minted by orchd, never derived from a plexer, harness, name, pane id, or pid. | `checkIdentityConstructionLine` in `scripts/check-bridge.ts` confines construction to the issuer (with fresh `mintAgentId()` spawn keys allowed); `src/entities.ts`'s `selfActor()` line is a registered exemption until that caller is removed |
| 3 | A reply address is not an owner token. | `checkSpawnerReplyFallbackLine` in `scripts/check-bridge.ts` catches the fallback shape; branded types would make it a compile error |
| 4 | `spawnedBy` names an id orchd issued, or the write is refused — never a governance actor. | same rule as #3 |
| 5 | Liveness is discovered at send time, never encoded in an identity. | the identity type carries no liveness field, so there is nothing to go stale |
| 6 | Ownership never appears in `spawned.spawned_by`; provenance never appears in `ownership.owner`. | `NONE` — needs a check-bridge rule |
| 7 | An owner claim is honoured only while its holder is provably alive. | `NONE` — needs the lease columns and `processInstanceMatches` at the gate |
| 8 | Lifetime (`owned`/`detached`) is never inferred from a backend id. | `NONE` — needs a check-bridge rule of the same shape as the capability check |

## Why prose does not hold

Three separate incidents, one shape:

- `policy/spawner.ts:68` explains that a reply address must never fall back to the owner token.
  Four files did it anyway: `control.ts`, `target.ts`, `spawn.ts`, `events.ts`.
- `stripWorkerHeader` correctly removes the worker preamble, and can never fire, because
  `presence.ts` truncates the task to 200 characters first — shorter than the header it must
  match. Correct code, unreachable.
- An earlier draft of this document required a TCP caller to "present a previously-issued
  identity" without defining how one is obtained. The implementation faithfully built the
  undefined half.

None of these were carelessness about the rule. In each case the rule was known, written down,
and unenforceable.

---

# Open — do not decide these unilaterally

1. **Bare `trmcsf8ifc` or prefixed `orch~trmcsf8ifc`?** A prefix costs nothing and makes keys
   greppable and obviously orch's in logs.
2. **Can one orch workspace span environments** — some agents in herdr, some headless — or is it
   1:1 with an environment projection? Spanning is the truer model and makes headless genuinely
   equal; 1:1 is simpler and matches how you actually look at a screen.
3. **Nested spawn.** A spawns B, B spawns C, B dies. Does C become unheld, or fall to A? Unheld
   is the honest answer — A never asked for C — but it is a real call.
4. **Grace window default.** Minutes, not seconds. The exact number is a setting and needs a
   chosen default.
5. **Does an orphan settle-and-close, or hold-for-adoption**, when the window ends without a
   command?
6. **Is the human's own `close`/`reap` subject to the one-driver gate?** A command you type
   arrives as a session that is not the holder, so today it would be refused pending `--steal`.
   Killing is not a collision — there is nothing to interleave with — but distinguishing "drive"
   commands from "end" commands at the gate is a decision, not an obvious default.
