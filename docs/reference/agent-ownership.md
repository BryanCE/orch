# orch owns its agents

Binding architectural direction, at the same level as
`learnings/2026-07-16-harness-plexer-architecture.md`. Read this before touching
identity, keys, placement, workspaces, spawn, or the backend port.

This document covers *who an agent is* and *where it runs*. Its companion
`agent-lifecycle.md` covers *what keeps it alive* — leases, fate-sharing, adoption, and
reaping. Neither is complete without the other.

## The axiom

**orch owns every agent.** An *environment* — herdr, tmux, headless, and whatever
comes next — is **where an agent is currently running**. It is recorded, queryable,
and displayed. It is never identity.

Every bug this document exists to prevent has the same shape: a coordinate belonging
to some environment leaked into a place where orch's own identity belonged.

## Three entities

| entity | what it is | owned by | mutable |
|---|---|---|---|
| **Agent** | an opaque minted id and nothing else | orch | never |
| **Placement** | environment, workspace, handle, cwd, worktree, branch | orch (recorded) | yes — an agent can move |
| **Workspace** | orch's own named grouping, minted and labelled by orch | orch | yes |

An agent id carries no environment, no workspace, and no handle. Those are placement,
and placement changes when an agent moves. Anything encoded into an identity can never
change without breaking every reference to it, which is precisely why identity holds
nothing but the minted id.

## Workspaces are orch's, and have no environment

An orch workspace is orch's own named grouping of agents. **It has no environment.**
Only an agent has placement. Asking which environment a workspace "is" — or whether one
can span several — is already the coupling this document deletes: it presumes a workspace
belongs somewhere, when the agents inside it are what live somewhere.

A workspace holding three herdr panes and two headless agents is not a special case to be
permitted. It is the ordinary case, and nothing in the model has to allow it.

This is the move that fixes two long-standing symptoms at once:

- **headless stops inventing `"local"`.** It gets a real orch workspace like every other
  environment. `"local"` was never a workspace; it was a missing value with a name.
- **orch stops squatting in a workspace you named.** It groups its agents under its own
  workspace and records where each one was placed, instead of displaying `wF` — a
  coordinate herdr generated — as though it were something you chose.

## Where the port seam belongs

| orch owns | the environment provides |
|---|---|
| identity, lifecycle, addressing | starting a process somewhere |
| delivery: presence inbox → bridge → ack | a screen *(capability)* |
| reading output (captured) | focus, keystrokes *(capability)* |
| history, ownership, state, workspaces | fast-path typing instead of inbox *(capability)* |

**Delivery and read are orch's mechanism. A pane is an optimisation.**

That seam was drawn wrong, and the tell is that `headless` returns false from `deliver`
even though `inbox.jsonl → bridge → ack.jsonl` already works with no screen at all. A
capless environment is not one orch cannot talk to; it is one with no *shortcut* for
talking to it.

## Capabilities, never environment ids

Renderers, commands, and policy branch on declared capabilities and never on an
environment's id. `backend === "herdr"`, `paneId === null`, and `key.startsWith("headless~")`
are the same mistake wearing three different hats: each infers an environment's identity
and hard-codes behaviour against it.

Adding an environment means declaring its capabilities. It must change no renderer, no
command, and no policy. If adding one requires editing a consumer, the seam is wrong.

## The identity change this implies

The key becomes the bare minted id:

```
herdr~wF~trmcsf8ifc   →   trmcsf8ifc
```

Nothing is lost, because placement was never supposed to live in the key. It lives in the
registry row — `spawned(pane, backend, workspace, handle, cwd, worktree, branch)` — which
orch writes at spawn and owns for the agent's whole life.

**Cost, honestly:** 31 identity call sites, 34 test files carrying key literals (24 of them
load-bearing), presence dir names, and `spawned.pane` is the primary key. Rule 8 applies —
bump both schemas and reap; never accept two key shapes at once.

## One module owns identity, placement, and lifecycle

This is the rule the rest of the document reduces to, and the one that gets violated first.

**Exactly one module answers "who is this agent, where is it, who owns it."** Nothing else
parses a key, splits on a separator, re-declares a placement field, or keeps a second copy.
A consumer that needs the workspace calls the registry; it does not reach for the string.

Concretely, all of these are the same bug and all of them are banned:

- `tryParseIdentity(key)?.workspace` — deriving placement by parsing identity
- `key.split("~")`, `key.split(":", 1)[0]`, `key.slice(0, key.indexOf(":"))` — the same
  thing with the parser inlined, which is worse because it cannot fail loudly
- `backend`/`workspace`/`handle` on `PresenceStatus` — a second copy of the row, written
  by whichever harness hook remembered to
- threading placement through env vars so each writer can stamp its own copy

**`status.json` is the agent reporting on itself** — state, tokens, cost, current file,
last text. Placement is not the agent's to report: orch placed it, orch records it, orch
is asked for it. An agent that could disagree with the registry about where it is running
is a bug the schema should make unrepresentable.

The key format is therefore private to that module. It is `orch~<id>` — the prefix costs
nothing and makes a key obviously orch's in a log line or a directory listing — but no
consumer may depend on that, and no consumer may read anything out of it.

## Open — do not decide these unilaterally

1. When an agent's environment dies but the agent does not — a herdr pane closed, a tmux
   session killed — is the agent gone, or unplaced and re-placeable? This decides whether
   placement columns are nullable and whether an `unplaced` state exists.
2. Can orch *move* a running agent between environments (herdr pane → headless), or does
   "placement changes" only ever mean movement within one environment (a pane changing tab)?
