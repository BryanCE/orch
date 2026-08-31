# membership, scope and subscriptions — the goal

## Spaces: named membership, never location

A SPACE is a named entity with explicit membership. The word stays; the old meaning is dead. The old
space was computed from location, and that derivation was the entire bug. Any reading of "space" as
"where something runs" is wrong everywhere in this doc.

**Where an agent runs** is ENVIRONMENT: cwd, repo, worktree, plexer, pane, harness, host. Fixed at
spawn, never changes, already fully described. Nothing is missing here.

**Who an agent coordinates with** is a SPACE. It has to span directories and harnesses, which means
it can never be derived from either.

The primitive orch was missing is **membership**. There was no join and no leave. There was a label
computed from location, pretending to be a space.

### The rules, enforced

1. **Membership is never derived from location.** Not from cwd, not from the repo, not from the pane,
   the plexer, the harness or the host. Deriving it is the entire bug: it is why `/server` and
   `/client` could not work together, and why a spaceless agent was ever possible.
2. **An agent inherits its spawner's memberships at spawn.** A whole tree shares its spaces without
   anyone doing anything.
3. **A root with no spawner creates one.** Every agent therefore has membership from birth.
4. **A human can add any agent to any space.** That is a JOIN, not a relocation. Nothing moves, and
   the agent's environment is untouched and unlied-about.
5. **Join and leave are explicit acts.** Never inferred, never a side effect of where something runs.
6. **The wall: you may subscribe only to members of a space you belong to.** Joining is the explicit
   act that grants coordination, instead of it being an accident of which terminal something
   launched in.
7. **An agent's environment never changes, so membership never changes on its own.** A process cannot
   relocate itself into another terminal. Only an explicit join or leave changes membership.
8. **A plexer container is a DEFAULT for what a new root joins, never a definition.** herdr's
   workspace suggests a space NAME. It does not decide one, and detaching it changes nothing.

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

- [x] **Named: SPACE. (Bryan, 2026-08-31)** The word stays. The location baggage belonged to the
      old derived behavior, not the word; that behavior is dead by rule. Every doc, command, and
      identifier uses "space" meaning ONLY the named membership entity. "Pack" stays provenance
      (`rootAgentId`); the two never mix.
- [x] **Many. (Bryan, 2026-08-31)** An agent can hold membership in several spaces at once. To
      bridge two fleets, one agent joins the second space; it keeps its home membership and the two
      fleets stay walled from each other. The wall check is "share at least one space."
- [x] **Leaving kills them. (Bryan, 2026-08-31)** Leave deletes every subscription between the
      leaving agent and anyone it no longer shares a space with. The wall holds continuously, not
      just at subscribe time. Membership and subscriptions stay two primitives: membership is who
      you MAY hear (the wall), a subscription is who you ARE hearing (the tap). Collapsing them
      would make joining a space a firehose and kill the immediate-family default.
- [x] **Who may join/leave: human directly, or an agent WITH a human-granted key. (Bryan,
      2026-08-31)** Two paths, one gate. The human runs the join/leave CLI commands directly, or an
      agent asks the human through the existing permission system, obtains the key (same mechanism
      already used elsewhere), and performs the join/leave itself. No key, no membership change. No
      space owner / admission machinery beyond that gate.
- [x] **Reap on empty, period. (Bryan, 2026-08-31)** A space lives as long as anyone is in it and
      is deleted when the last member dies or leaves. The adam (the root that created it) is just
      another member — its death does not kill the space while others remain, because that would
      leave living agents memberless, an illegal state. No standing empty spaces piling up.
- [x] **The plexer-home mapping dies; the birth rule replaces it. (Bryan, 2026-08-31)** When an
      adam starts, the environment resolves to a default space NAME and nothing more: herdr → the
      herdr workspace name, tmux → the tmux session name, bare terminal → the directory name. A live
      space with that name → adam joins it; none → adam creates it. An explicit space name at spawn
      overrides the default. Slaves never do this — they inherit their spawner's memberships,
      always. Nothing is stored linking location to space; location never IS the boundary, it only
      suggests a name (see learnings/2026-08-31-group-membership-primitives.md — k8s `default`,
      NATS `$G`, Unix fork inheritance).
- [x] **`agent_spaces` dies; two tables replace it, live rows only. (Bryan, 2026-08-31)** A spaces
      table (the named entity: born at first member, reaped on empty) and a memberships table
      (agent ↔ space links, many per agent). No interval columns, no `clearSpace`, no left-at:
      leave and death delete the row, the table answers only "who is in what right now," and the
      past act lives in the decision log — same ruling as subscriptions. Agents are ephemeral;
      nothing accumulates.

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
- An orch may subscribe to any agent **in a space it belongs to**, including one in another orch's
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

- [x] **Verbs. (Bryan, 2026-08-31)** Hearing: `subscribe` / `unsubscribe` / `subscriptions`.
      Membership: `join` / `leave` / `spaces`.
- [x] **Depth cap. (Bryan, 2026-08-31)** The cap on numeric `--depth` is a `settings.json` setting
      (schema + defaults + registry help line, Rule 17) and is exposed in the TUI. `--depth=all`
      means what it says: from the named agent, everything downward, however deep — it is not a
      number and the numeric cap does not apply to it. On a branch orch, `all` delivers that orch
      and its entire subtree.

## Tasks

Design is CLOSED — every checklist above is answered. Waves run in order; inside a wave every task
has ONE owner and no two tasks in a wave share a file (Rule 3). Hand an orch exactly one task id. A
task is done only when its owner's scoped `bun check` and tests are green.

### Wave 0 — spaces and membership store (everything waits on this)

- [ ] **0.1 schema + migration.** `spaces` (id, name, created_at) and `memberships` (agent FK
      cascade, space FK cascade, created_at, uniqueIndex(agent, space)). Live rows only — no
      interval columns, no left-at. Migration WRITTEN then HANDED TO BRYAN to run (Rule 1). Never
      run it.
- [ ] **0.2 row stores.** `src/store/space-rows.ts` + `src/store/membership-rows.ts`, following
      `lease-rows.ts` style. Join creates the space if absent (born at first member); deleting the
      last membership deletes the space (reap on empty). Tests: create-on-first-join,
      reap-on-empty, adam death with members left keeps the space, many spaces per agent.
- [ ] **0.3 birth rule in spawn.** Environment resolves a default space NAME only — herdr →
      workspace name, tmux → session name, bare terminal → directory name. Adam joins the live
      space of that name or creates it; slaves inherit every spawner membership; an explicit space
      name at spawn overrides the default. Delete every location-derivation path, including the A7
      comment and the optional-space branches in `spawn/placement.ts`. Tests: no path produces a
      memberless agent; a second adam in the same workspace lands in the first one's space; a raw
      CLI agent and a herdr agent share one space and reach each other; two directories in one
      space; detaching the plexer changes nothing.
- [ ] **0.4 the one comparison function.** Membership-intersection check ("share at least one
      space"), the only implementation, called by `eventInSpaceScope`, `scopeToSpace` and
      `checkWall`.
- [ ] **0.5 join / leave / spaces verbs.** Human CLI acts directly. An agent caller must hold the
      human-granted key from the existing permission system — no key, no membership change. Both
      verbs write decision-log records. (Leave's subscription cascade is task 1.5 — it needs the
      table.) Tests: agent without key refused; human join/leave works; leave of the last member
      reaps the space.

### Wave 1 — the subscription store

- [ ] **1.1 schema + migration.** Table as shaped above. Migration WRITTEN then HANDED TO BRYAN to
      run (Rule 1). Never run it.
- [ ] **1.2 row store.** `src/store/subscription-rows.ts`, following `lease-rows.ts` style.
- [ ] **1.3 spawn writes the row.** Spawner-to-slave subscription on every spawn. Test: spawn writes
      it; unsubscribing from your own slave leaves `spawned_by` untouched.
- [ ] **1.4 death deletes.** `endAgent()` (`store/agent-rows.ts`) deletes every subscription naming
      the dead agent, either side. One place. Tests: close deletes it; killing the subscriber
      deletes it.
- [ ] **1.5 leave cascade.** Leaving a space deletes every subscription between the leaver and
      anyone it no longer shares a space with — the wall holds continuously. Test: leave kills the
      cross-space subscription but keeps in-space ones.
- [ ] **1.6 decision log.** Subscribe and unsubscribe write decision-log records.

### Wave 2 — the policy

- [ ] **2.1 the resolver.** "Which agents does this caller hear" from the rows, expanding branch
      subscriptions through `policy/provenance.ts`. One traversal per call, not one per row. Tests:
      leaf delivers one; `--branch` delivers depth 1; `--depth=2` delivers two levels; a slave
      spawned AFTER the subscription appears in a branch subscription; a human hears everything.
- [ ] **2.2 the refusals.** Refuse a subscription whose target shares no space with the caller
      (via the 0.4 function). Refuse `--depth` without `--branch`. Tests: out-of-space refused;
      bare `--depth` refused.
- [ ] **2.3 the depth cap.** Cap on numeric `--depth` as a `settings.json` setting (schema +
      `SETTINGS_DEFAULTS` + registry help line + required type, Rule 17), exposed in the TUI.
      `--depth=all` is not a number and the cap never applies to it: from the named agent,
      everything downward, however deep. Tests: over-cap numeric refused; `all` delivers the whole
      subtree regardless of cap.

### Wave 3 — the wire

- [ ] **3.1 the claim.** `sessionClaim()` carries the launch credential (`ORCH_AGENT_ID`). A spawned
      agent identifies by its minted id, a driving session by its `sessionToken`. No field for the
      former today.
- [ ] **3.2 the resolution.** Daemon resolves claim to caller agent id via `agentIdBySessionToken`.
      No new id space. Principal type is DECLARED by the credential, never sniffed: credential
      resolves → agent; no credential → human. Test: an unresolvable claim is a human at a shell,
      never a lockout.
- [ ] **3.3 scoped status.** `status` handler takes params and filters through wave 2 before
      answering.
- [ ] **3.4 scoped stream.** Event push stream filtered by the same policy, daemon-side. Tests: two
      orchs each hear only their own subscriptions; a human claim hears everything.

### Wave 4 — the clients

- [ ] **4.1 revert the abandoned edits.** Delete `src/policy/scope.ts`; revert `AgentScopeInput` /
      `CallerScopeChoice` / `ResolvedCallerScope` out of `src/types/policy.ts`; revert
      `src/commands/events.ts` to HEAD.
- [ ] **4.2 status.ts.** Rows arrive scoped. The offline branch calls the wave 2 policy locally.
- [ ] **4.3 events.ts.** Delete `eventInMineScope`, `eventInScope`, `--mine`, `--any-agent`, and
      `EventScopeInput`.
- [ ] **4.4 the verbs.** `subscribe` / `unsubscribe` / `subscriptions`.
- [ ] **4.5 usage.** `help.ts` and `commands/index.ts` usage lines for all six verbs (join, leave,
      spaces, subscribe, unsubscribe, subscriptions).

### Wave 5 — the five defects above

- [ ] **5.1** `reset` keeps the current model pin, or says loudly that it reverted.
- [ ] **5.2** `dispatch` reports DELIVERED, not just accepted, via the transition push stream.
- [ ] **5.3** "Do I already have a monitor armed" answerable from the daemon.
- [ ] **5.4** A watch fires without `--all` — confirmed fixed by the membership work.
- [ ] **5.5** Empty replay distinguishable from wrong scope.
- [ ] Delete every verify-it-worked line in skills these fixes make obsolete.

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
