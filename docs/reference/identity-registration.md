# Identity and registration

**The rule this document exists to enforce: if orchd is running, it knows about every
participant. No orch invocation is anonymous to a live daemon.**

Identity is orch's own layer. It survives whichever harness or plexer either side runs in,
and it is the thing that ties a fleet together. Today it does neither, for one reason that
this design removes.

## What is broken now

A key is `<backend>~<workspace>~<id>` — two of three segments are the plexer's facts. So an
identity is a *coordinate*, not a *name*, and three consequences follow:

- **A participant outside a plexer cannot be named at all.** A Claude Code session has no
  backend and no workspace, so no valid key exists for it. `spawnerIdentity()` returns
  `key: null` not by policy but because the format has nowhere to put it.
- **Every session in a workspace collapses into one actor.** `selfActor()` mints
  `<backend>~<workspace>~operator` with the literal string `operator` as the id, so two
  sessions driving the same workspace are indistinguishable.
- **The daemon believes whatever the client claims.** `governWrite` reads `params.actor`
  off the wire. The caller computes its own identity by asking the multiplexer, and orchd
  accepts the answer.

Everything downstream is compensation for the first point: `key: string | null`,
`spawnerIsRepliable()`, the conditional worker-header clause, and the
`spawner.key ?? callerOwnerToken()` fallback in two call sites that `policy/spawner.ts`
documents as forbidden. A comment cannot hold an invariant that the type permits.

## The model

One opaque, plexer-independent id per participant. Location becomes an attribute, never
part of the name.

```
id         01JD8F2K9XQZ3M7   ULID. Minted from nothing. Never changes.
kind       "agent" | "session"
label      "payroll-2" | "claude session 5fd5793e"
backend    "herdr" | null    where it runs, if anywhere
workspace  "wF" | null
handle     "%255" | null     the plexer's own pane id, if any
```

An agent fills every field. A session fills the first three. Same type, same table, same
addressability — the empty plexer fields are honest, because a session is not in a plexer.

## Registration

Identity is **issued by orchd, never derived by the caller.** A CLI process does not compute
who it is; it asks.

1. The process connects and calls `hello` before any other method.
2. orchd attributes the connection: over the unix socket it reads peer credentials and walks
   the process ancestry to the stable ancestor that owns the session.
3. orchd returns the id recorded for that ancestor, minting and recording one on first sight.

The ancestor is the same across every `orch` invocation from one session, so continuity is
the daemon's to keep rather than something each process re-derives. This is how dbus and
polkit attribute callers.

`hello` is the only place a participant enters the system. `selfActor()` and the four-branch
fallback in `spawnerIdentity()` are deleted, not adapted.

### Transports and how each one vouches

Both listeners are local. orchd prefers the unix socket and binds loopback TCP alongside it
as a fallback for machines where the socket cannot bind. **TCP is a transport fallback, never
a client class** — nothing is a second-class caller for arriving on it, and no client chooses
TCP while the socket is available. Every local client, the web server included, dials the
socket.

The trust rule is one sentence: **a caller is trusted when it is the same uid as the daemon.**
Only the mechanism differs by transport.

| Transport | Mechanism | What it proves |
| --- | --- | --- |
| unix socket | peer credentials | same uid, attested by the kernel |
| loopback TCP | a `0600` token file in `$ORCH_DIR`, read and presented by the caller | same uid, attested by the filesystem |

orchd writes the token at startup with owner-only permissions. A caller that can read it is
necessarily the same uid, which is exactly what peer credentials establish — so neither path
is weaker, and neither needs an enrollment step, because reading a file you already have
permission to read is the whole handshake.

A caller that presents no token on TCP is refused. It is never assigned a synthetic identity,
and it is never asked to supply an id it has no defined way to obtain: an attribution path
that cannot be completed is not a path, and shipping one is how a self-declared actor gets
back in through the door this design exists to close.

### Commands that run without a daemon

`setup`, `doctor`, `help`, `version`, and `status --offline` are defined to work with no
daemon and therefore need no identity — none of them writes. Every command that writes
already requires orchd, so the split needs no new state: **no daemon means no writes, and no
writes means no identity is required.** A command must never invent a local identity because
the daemon is down.

## Inbox, and what registration does not promise

Every participant gets an inbox. Not every participant reads one promptly: a session acts
when its human prompts it, so a message to it is parked rather than delivered into a running
turn. orchd drains and holds; `orch status` surfaces the unread count.

Three separate facts, and only the last one varies:

- has an identity — always true of a registered participant
- has an inbox — always true
- reads it promptly — true of a live agent, not of a session between turns

Today the absence of the first is modeled as the absence of all three, which is why a worker
with no reachable spawner improvised a relay through a sibling instead of parking a message.

## Invariants

Every invariant here names the mechanism that enforces it. **An invariant whose enforcement
is `NONE` is not a rule — it is a wish, and it will be broken.** Each one below was broken
by code written after it was written down, in a repo whose authors had all read the comment.

A rule stated in prose and enforced by nothing is the defect this table exists to prevent.
Adding an invariant means adding its enforcement in the same change, or recording `NONE` so
the gap is visible to the next reader instead of discovered by the next bug.

| # | Invariant | Enforced by |
| --- | --- | --- |
| 1 | A live daemon knows every participant. No anonymous invocation. | `hello` is the only entry point; there is no other way to obtain an identity |
| 2 | An id is minted by orchd, never derived from a plexer, harness, name, pane id, or pid. | `checkIdentityConstructionLine` in `scripts/check-bridge.ts` confines construction to the issuer (with fresh `mintAgentId()` spawn keys allowed); `src/entities.ts`'s `selfActor()` line is a registered exemption until that caller is removed |
| 3 | A reply address is not an owner token. | `checkSpawnerReplyFallbackLine` in `scripts/check-bridge.ts` catches the fallback shape; branded types would make it a compile error |
| 4 | `spawnedBy` names an id orchd issued, or the write is refused — never a governance actor. | same rule as #3 |
| 5 | Liveness is discovered at send time, never encoded in an identity. | the identity type carries no liveness field, so there is nothing to go stale |

### Why prose does not hold

Three separate incidents, one shape:

- `policy/spawner.ts:68` explains that a reply address must never fall back to the owner
  token. Four files did it anyway: `control.ts`, `target.ts`, `spawn.ts`, `events.ts`.
- `stripWorkerHeader` correctly removes the worker preamble, and can never fire, because
  `presence.ts` truncates the task to 200 characters first — shorter than the header it must
  match. Correct code, unreachable.
- An earlier draft of this document required a TCP caller to "present a previously-issued
  identity" without defining how one is obtained. The implementation faithfully built the
  undefined half.

None of these were carelessness about the rule. In each case the rule was known, written
down, and unenforceable.
