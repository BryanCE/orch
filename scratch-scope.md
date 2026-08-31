# membership, scope and subscriptions — the goal

## Membership replaces "space"

Space was doing two jobs and only one of them is real.

**Where an agent runs** is ENVIRONMENT: cwd, repo, worktree, plexer, pane, harness, host. Fixed at
spawn, never changes, already fully described. Nothing is missing here.

**Who an agent coordinates with** is what space was actually for. It has to span directories and
harnesses, which means it can never be derived from either.

The primitive orch is missing is **membership**. There is no join and no leave. There is a label
computed from location, pretending to be a group.

### The rules, enforced

1. **Membership is never derived from location.** Not from cwd, not from the repo, not from the pane,
   the plexer, the harness or the host. Deriving it is the entire bug: it is why `/server` and
   `/client` could not work together, and why a spaceless agent was ever possible.
2. **An agent inherits its spawner's membership at spawn.** A whole tree shares one group without
   anyone doing anything.
3. **A root with no spawner creates one.** Every agent therefore has membership from birth.
4. **A human can add any agent to any group.** That is a JOIN, not a relocation. Nothing moves, and
   the agent's environment is untouched and unlied-about.
5. **Join and leave are explicit acts.** Never inferred, never a side effect of where something runs.
6. **The wall: you may subscribe only to members of a group you belong to.** Joining is the explicit
   act that grants coordination, instead of it being an accident of which terminal something
   launched in.
7. **An agent's environment never changes, so membership never changes on its own.** A process cannot
   relocate itself into another terminal. Only an explicit join or leave changes membership.
8. **A plexer container is a DEFAULT for what a new root joins, never a definition.** herdr's
   workspace suggests a group. It does not decide one, and detaching it changes nothing.

### Why this shape

Every distributed system that solved coordination-across-machines separated the two facts.

- **Actor model / Akka: location transparency.** An actor is reached by address, and where it
  physically runs is deliberately not part of that address.
- **ISIS / virtual synchrony (Birman).** The GROUP is the addressable entity. Explicit membership,
  membership changes delivered as events, messages addressed to the group regardless of where members
  sit.
- **Erlang `pg`.** A named group, processes join it, members are spread across nodes, and a member
  that dies is removed automatically.
- **Kubernetes.** A Service is a stable name for a set of pods; a Node is where they run. Nobody
  derives the first from the second.

None of them derive the group from location. Deriving it is the mistake.

Sources: [Akka location transparency](https://doc.akka.io/libraries/akka-core/2.4/general/remoting.html) ·
[Birman, A History of the Virtual Synchrony Replication Model](https://www.cs.cornell.edu/ken/History.pdf) ·
[Exploiting virtual synchrony in distributed systems](https://lass.cs.umass.edu/~shenoy/courses/spring08/readings/birman.pdf) ·
[Erlang pg](https://www.erlang.org/doc/apps/kernel/pg.html) ·
[actor model addressing](https://berb.github.io/diploma-thesis/original/054_actors.html) ·
[VS Code multi-root workspaces](https://code.visualstudio.com/docs/editing/workspaces/multi-root-workspaces) ·
[k8s namespaces vs labels](https://medium.com/dzerolabs/just-in-time-kubernetes-namespaces-labels-annotations-and-basic-application-deployment-f62568a9eaaf)

### Needs its own design pass before anything is built

- [ ] **Name it.** "Space" carries the location meaning and has to go. So does the collision with
      "pack" (`rootAgentId`, meaning the whole tree's root, while immediate family is one level).
- [ ] **One group per agent, or many?** Kubernetes namespaces are exactly one and non-overlapping.
      ISIS and `pg` allow many. One makes the wall trivial; many makes coordination flexible and the
      wall a union.
- [ ] **Does leaving a group kill the subscriptions made through it?** This question is real NOW, in
      a way it never was for location, because leaving is an act someone performs.
- [ ] **Does a group have an owner** with the right to admit or eject, or can any member add anyone?
- [ ] **Can a group outlive its members**, or is an empty group reaped?
- [ ] **What happens to the plexer-home mapping.** A home is a LOCATION fact and belongs to
      environment, not membership.
- [ ] **What replaces `agent_spaces`.** Space is set at spawn and never moves, so the interval
      columns and `clearSpace` model something impossible. Membership genuinely does change, by join
      and leave, so it may want the interval instead.

### Already settled

- Every agent has membership from birth. A memberless agent is not a legal state.
- `"local"` is banned. A single shared bucket is a missing value with a name (Rule 11).
- One comparison function for membership matching, called by every caller. Not three.
- Adding an environment later means implementing one method. Branch on the declared capability, never
  on the backend id (Rule 9).

## Subscriptions

**Blocked on the membership design.** The wall below is a membership wall, so it cannot be built
until membership is.

**A subscription row is the only thing that decides which agents an orch hears from.**

- Spawning writes one automatically, spawner to slave. That is what makes the default immediate
  family. No spawn, no row, no events.
- Closing or killing an agent deletes every row naming it, on either side.
- An orch may subscribe to any agent **in a group it belongs to**, including one in another orch's
  tree. Two sibling orchs coordinating is a real case and ownership must not block it.
- Unsubscribe exists, including from your own slave, to shut a noisy one up.
- **Membership is the hard wall.** Not ownership, not the tree.
- A human has no agent id and no subscriptions. A human sees everything.

### Addressing one

| command | delivers |
|---|---|
| `subscribe orch-1` | ONLY orch-1's own events |
| `subscribe orch-1 --branch` | orch-1 plus its direct children |
| `subscribe orch-1 --branch --depth=2` | orch-1, children, grandchildren |
| `subscribe orch-1 --branch --depth=all` | orch-1 and everything under it, however deep |

`--branch` alone means depth 1. `--depth` without `--branch` is refused.

**A branch subscription is a live query.** It delivers whatever is in that branch when an event
fires. Slaves that appear later are included, slaves that die drop out.

### Shape

```
subscriptions
  subscriber_agent_id  FK agents.id  ON DELETE CASCADE
  target_agent_id      FK agents.id  ON DELETE CASCADE
  branch               0 = the named agent only
  depth                NULL unless branch; N levels, or "all"
  created_at           INTEGER epoch millis
  uniqueIndex(subscriber, target)
```

**Live rows only. No `until`, no history. Unsubscribe deletes.** This data lives minutes to hours.

- The delete on agent death goes in `endAgent()` (`store/agent-rows.ts:83`), the only writer of an
  `agent_endings` row, so every verb that ends an agent funnels through one statement.
- `daemon/retention.ts` deletes agent rows after a cutoff, so the FK cascade is the backstop.
- History lives in `orch logs`. The table holds what is true now, the log holds what happened.
- Doctor never touches it. Doctor checks declared composition against reality (Rule 9), and this is
  ephemeral runtime data.

### Provenance is not a subscription

Spawn writes two records about one moment and they are different facts. `agents.spawned_by` is
immutable and permanent. The subscription row is revocable and short-lived. They are ALLOWED to
disagree: unsubscribing from your own slave leaves provenance intact.

**Never derive a subscription from provenance. Never repair provenance from subscriptions.**

## Ownership

Ownership is provenance, not the lease. The lease says who is DRIVING (gates dispatch, steer, model,
reset). Provenance says whose it is (gates ending it). Subscriptions say who HEARS it. Membership
says who may subscribe at all.

**Close authority stays subtree-wide and does not change.** A grandparent must always be able to kill
a runaway grandchild it never subscribed to. Abort, close and reap are never gated (Rule 11).

## Status is a human command

An orch has no eyes and no business browsing a dashboard. An orch needs transitions from `events`,
facts from the return value of the command it just ran, and its working set, which is its
subscriptions.

The table stays for humans. Capacity stays global, because it is a number about the machine and not
about anyone's agents.

The daemon computes scope. The `status` RPC takes no params today, which is the gap. It takes the
caller claim, resolves it the way `register-session` already does, and answers rows already scoped.
The client renders what it is handed, filters nothing, reads no lease table.

`--mine` and `--any-agent` are deleted. Scope is never a flag.

## A command that succeeds must be believable

Every "verify it worked" line in a skill is a bug report written down as a habit instead of fixed.
If the skill has to tell an agent to check, the COMMAND is broken and the check is the workaround.
Rule 8 applied to behaviour instead of data. Candidate for CLAUDE.md.

Five to fix:

- [ ] `reset` keeps the current model pin, or says loudly that it reverted. Today it re-pins the
      spawn-time model and silently discards a later `orch model` change.
- [ ] `orch dispatch` tells the caller when the prompt was DELIVERED, not just accepted. Delivery is
      a transition and there is already a push stream for transitions.
- [ ] Orch answers "do I already have a monitor armed." The daemon holds those connections and knows
      its subscribers. Today the skill teaches `pgrep -fa "orch events"`.
- [ ] A watch fires without `--all`. Fixed by the membership work, then confirmed.
- [ ] Empty replay is distinguishable from wrong scope. Today a silent stream reads as broken scope
      and gives a false negative on a fresh daemon.

Delete every verify-it-worked line the fixes make obsolete.

## Open

- [ ] Verb naming for subscribe, unsubscribe, list.
- [ ] Depth cap as a setting (Rule 17), and what `all` maps to.

## Tasks

### Wave 0 — membership (everything waits on this, and it needs its own design pass first)

- [ ] Finish the design questions above.
- [ ] Membership is a join, never a derivation. Delete every path that computes it from location,
      including the A7 comment and the optional-space branches in `spawn/placement.ts`.
- [ ] Inherit at spawn; a root creates. No memberless agent, ever.
- [ ] Join and leave verbs.
- [ ] One membership-comparison function, called by `eventInSpaceScope`, `scopeToSpace` and
      `checkWall`.
- [ ] Plexer container becomes a DEFAULT for a new root, not a definition.
- [ ] Migration written, then HANDED TO BRYAN to run (Rule 1). Never run it.
- [ ] Tests: a raw CLI agent and a herdr agent join one group and can reach each other; two
      directories in one group; detaching the plexer changes nothing; no path produces a memberless
      agent.

### Wave 1 — the subscription store

- [ ] Table as shaped above.
- [ ] Migration written, then HANDED TO BRYAN to run (Rule 1). Never run it.
- [ ] `src/store/subscription-rows.ts`, following `lease-rows.ts` style.
- [ ] Spawn writes the spawner-to-slave row.
- [ ] `endAgent()` deletes every row naming that agent, either side. One place.
- [ ] Subscribe and unsubscribe write decision-log records.
- [ ] Tests: spawn writes it, close deletes it, killing the subscriber deletes it, unsubscribing from
      your own slave leaves `spawned_by` untouched.

### Wave 2 — the policy

- [ ] Resolve "which agents does this caller hear" from the rows, expanding branch subscriptions
      through `policy/provenance.ts`. One traversal per call, not one per row.
- [ ] Refuse a subscription whose target shares no group with the caller.
- [ ] Refuse `--depth` without `--branch`.
- [ ] Tests: leaf delivers one; `--branch` delivers depth 1; `--depth=2` delivers two levels;
      `--depth=all` delivers the lot; a slave spawned AFTER the subscription appears in a branch
      subscription; out-of-group is refused; a human hears everything.

### Wave 3 — the wire

- [ ] `sessionClaim()` carries the launch credential (`ORCH_AGENT_ID`). A spawned agent identifies by
      its minted id, a driving session by its `sessionToken`. No field for the former today.
- [ ] Daemon resolves claim to caller agent id via `agentIdBySessionToken`. No new id space.
- [ ] `status` handler takes params and filters through wave 2 before answering.
- [ ] Event push stream filtered by the same policy, daemon-side.
- [ ] Tests: two orchs each hear only their own subscriptions; a human claim hears everything; an
      unresolvable claim is a human at a shell, never a lockout.

### Wave 4 — the clients

- [ ] Revert the abandoned edits: delete `src/policy/scope.ts`, revert `AgentScopeInput` /
      `CallerScopeChoice` / `ResolvedCallerScope` out of `src/types/policy.ts`, revert
      `src/commands/events.ts` to HEAD.
- [ ] `status.ts`: rows arrive scoped. The offline branch calls the wave 2 policy locally.
- [ ] `events.ts`: delete `eventInMineScope`, `eventInScope`, `--mine`, `--any-agent`, and
      `EventScopeInput`.
- [ ] Subscribe, unsubscribe and list verbs.
- [ ] `help.ts` and `commands/index.ts` usage lines.

### Wave 5 — the five defects above

### Wave 6 — docs and gate

- [ ] `skills/orch/SKILL.md`: membership, the immediate-family default, how to subscribe wider, and
      that status is not for orchs.
- [ ] `bun check` clean over the whole tree.
- [ ] `bun test` on: `close-authority`, `commands-status`, `commands-events`, `daemon-events`,
      `owner-scoping`, `events-scope-notice`, plus the new membership and subscription tests.
- [ ] Delete this file.

## Not in scope

The rest of `scratch.md`: `--file`/stdin dispatch, `redispatch`, the pack cap in the skill, the
leftover `--name` flag.
