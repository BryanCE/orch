# orch improvements

Everything orch owes its users, in one file. Defects found by driving orch on a real fleet, the
ergonomics work, and the spaces/membership/subscriptions design.

## The rule behind most of this

**A command that succeeds must be believable.** Every "verify it worked" line in a skill is a bug
report written down as a habit instead of fixed. If the skill has to tell an agent to check, the
COMMAND is broken and the check is the workaround. Rule 8 applied to behaviour instead of data.

Delete every verify-it-worked line these fixes make obsolete.

## Rulings in force

- **Thinking effort belongs to the task, never to the agent.** Nothing carries across a reset. A
  dispatch that names no level uses the configured default. `orch model` is a correction to the task
  in flight, not a setting.
- **Spawn writes the subscription row.** One mechanism. Every agent an orch hears from is a row, no
  exceptions. Closing or killing the slave deletes it.
- **Space is the wall, not ownership.** Two sibling orchs coordinating is a real case, so an orch may
  subscribe to any agent in a space it belongs to.
- **Names are positional parameters, not flags.**
- **A flag exists only to leave the default.** Whatever every call types is the default, and the flag
  is for the case that departs from it.
- **Redispatch clears the session.** Rule 7. There is no flag to keep it, because reset is the wipe —
  returning the context window to baseline is the whole operation. Continuity is a plain `dispatch`
  to the agent as it stands, and anything else the next task needs goes in the dispatch body.
- **An agent starts in the spawner's directory.** `--cwd` goes away. The directory is part of the
  agent's environment (Rule 11), not a description of orch's own process, so the flag that overrides
  it is named for the agent's directory, and nothing is typed for the normal case. Never coupled to
  the plexer or the harness.

## Usage defects

### 1. Nothing tells you thinking effort is per task

Reset's behaviour is correct under the ruling above. The CLI and the skill both hide the rule, so it
reads as a bug every time.

`reset.ts:81` prints `Pinned 4 reset agent(s) to openai-codex/gpt-5.6-luna`. The level resolves into
a separate variable at `reset.ts:49` and never reaches that line, because `launchModel` strips the
suffix. The pin message shows the bare model, always, so nobody can see what effort a reset landed
on. **Done:** reset prints `…/gpt-5.6-luna:high`, through one `modelSpec` in `policy/thinking.ts`
that the four separate `:level` joins now share.

`orch model <target> <model:thinking>` reads like a setting you are putting on the agent. It is a
correction to the task in flight, and reset ends that task. Rename the verb, or have it say what it
is doing, so nothing implies it survives a reset.

The skill states the rule outright: effort belongs to the task, nothing carries across a reset, a
dispatch with no level gets the configured default.

### 2. Capacity is invisible until a spawn dies mid-batch — DONE

The skill cited `fleet.spawn_cap` (default 8), which is not a setting. The live caps are
`fleet.max_agents_per_pack`, `fleet.max_agents_per_space.<space>`, `fleet.max_agents_total` and
`fleet.max_depth` (`src/commands/spawn/admission.ts`). `reference/commands.md` names those four now
and points at `orch status --capacity` for headroom before sizing a fleet.

The other half of this item was wrong. A cap refusal does NOT arrive mid-spawn: `admitSpawn` runs
depth and pack size before a backend is resolved, and `placeSpawn` re-checks capacity the moment the
space is known — both before `createSpawnGroup` and `openPanesForGroup`. Nothing is created by a
refused spawn. No code change needed.

Update the skill to the real constants, and show remaining capacity before a spawn burns.

### 3. Empty replay is indistinguishable from wrong scope

`orch events --all --since-seq 0` printed nothing on a daemon that then pushed every live event
correctly. The skill reads that silence as "broken scope", which is a false negative on a fresh
daemon. Either replay has a bug or the doctrine is wrong. Investigate, then fix one of them.

### 4. An answer can land after the agent has moved on

A worker asked a question, got an answer within seconds, and finished on its default assumption
anyway. The result reads as if the answer never entered its turn. Nothing reports whether an answer
was consumed. An asking agent waits for its answer.

### 5. Exited panes shadow live names

After a fleet died, fresh panes spawned with the same slice names and `orch dispatch story-server`
refused with "Pick one and address it by its key - a key never matches two agents", because the
exited pane still held the name. Recovery was `orch status | grep | awk` for keys on every dispatch.

Name resolution ignores ended agents, or spawn refuses a held name and says who holds it.

### 6. A fleet can vanish with no event

Every pane went to `exited`, the `orch events` stream ended, and nothing said why or when. `exited`
is not in the default watch set (`done,error,blocked,asking`), so a dead fleet reads exactly like a
working one.

`exited` and `killed` join the default watch statuses. When the stream itself ends, its last line
names the reason: daemon restart, pane closed, lease lost.

### 7. `orch result` returns the previous task's result

After a reset and a new dispatch, `orch result <pane>` returns the last task's summary with no marker
that it is stale. Either answer "working since <time>, no result yet", or key results to the dispatch
id so `orch result <dispatch-id>` is unambiguous.

### 8. Steer and answer have no ack

A mid-flight scope cut ("do sections 1-2 only") landed, but the only proof was reading the result an
hour later. Same class as defect 4. A steer or answer reports consumed or not, even if that is only
"delivered to turn N".

### 9. dispatch reports accepted, never delivered

Delivery is a transition and there is already a push stream for transitions. Say when the prompt
reached the agent.

### 10. Fresh spawn timing is undocumented

The first dispatch to a new pane needs the harness up, and nothing says whether an early dispatch
queues or drops. A blind `sleep 5` is the current workaround. If dispatch queues until ready, say so
in the skill. If it drops, add `orch spawn --wait` or block the dispatch until ready.

### 11. The watch banner is delivered as an event

The "watching my agents from now on - history: --since-seq 0" line arrives on the event stream and
wakes the harness for nothing. Print it on stderr.

### 12. Orch cannot ask whether a monitor is already armed

The daemon holds those connections and knows its subscribers. Today the skill teaches
`pgrep -fa "orch events"`.

### 13. A watch fires without `--all`

Fixed by the membership work below, then confirmed.

### 14. Worker lint noise

Workers report "oxlint could not run because tsgolint is missing" on every task. The worker contract
tells them which lint command this repo uses, or the header carries it.

## Ergonomics

### 15. Prompt bodies come from a file or stdin — DONE

`orch dispatch <target> --file spec.md`, and `--file -` for stdin. A typed prompt and `--file`
together is a refusal, as is an empty or unreadable file. Still owed on `redispatch` when that
lands.

`--file` is for length, never for quoting. The shell splits argv before orch runs, so a mangled
spec is the caller's quoting mistake and orch cannot see it, let alone fix it. `SKILL.md` and
`reference/commands.md` now state the quoting rule outright. Orch's own shell-outs were audited:
every one passes an argv array, and the two PowerShell calls interpolate a numeric pid and a
PowerShell-escaped path. Nothing to fix in code.

### 16. `orch redispatch`

`orch redispatch <target> --name X --model Y --file spec.md` replaces the four-command refill dance
(`reset`, `rename`, `model`, `dispatch`), run about a dozen times per session.

### 17. The leftover `--name` flag — DONE

The parser already refused it; the leftovers were callers and docs. `setup/smoke.ts` was passing
`--name orch-smoke` into that parser, so the smoke spawn died on its own flag. Gone from
`commands/index.ts`, `README.md`, `commands-spawn.test.ts`, and `test/golden/help.txt` (deleted —
nothing read it).

### 20. The published skill drifts from the code — AUDITED

Every setting key, verb, long flag and short flag named anywhere in `skills/` was checked against
the parsers and the settings registry. Three were fiction:

- `fleet.spawn_cap` (default 8) — removed long ago; the four real caps are in item 2.
- `orch events --notify` — never parsed. It would have been swallowed as a target name. Every
  `orch events` line already carries the notification title.
- `webhook`/`command` sink fields written as `--url` and `--command`; the real syntax is the
  assignment form `--url=<value>`, `--command=<value>` (`settings.ts` builds `--${field.name}`).

Everything else resolves: all verbs, `--agent-id=`, `-n`, `-m`, and the capacity flags. The
quoting guidance is stated shell-neutrally — single quotes are literal in bash, zsh and
PowerShell alike, and orch is never coupled to one shell.

Nothing stops this drifting again. A check that fails when `skills/` names a verb, flag or
setting the code does not have is the only thing that would.

### 18. A `--json` filter for live panes

`orch status --mine --live`, trustworthy enough that nobody writes awk again.

### 19. `--cwd` on every spawn

The skill orders `--cwd "$(git rev-parse --show-toplevel)"` on every spawn and warns that omitting it
does not fail, it just puts the fleet somewhere else. Spawn inherits the spawner's directory instead,
`--cwd` is deleted from `spawn`, `tile` and `tab new`, and the override that replaces it is named for
the agent's directory. Strip the incantation from `SKILL.md`, `reference/commands.md` and
`reference/fleet.md` in the same change.

## Do not break

`orch steer` for a mid-task scope cut. `orch result` text when the task is actually done. Per-event
cost in the status line. Rename not breaking the watch scope. Dispatch returning instantly and
durably. The push stream never dropping an event. The questions and answer flow.

## Spaces, membership and subscriptions

Design is CLOSED. Every checklist below is answered.

### Spaces are named membership, never location

A SPACE is a named entity with explicit membership. The old space was computed from location, and
that derivation was the entire bug. Any reading of "space" as "where something runs" is wrong
everywhere in this file.

**Where an agent runs** is ENVIRONMENT: cwd, repo, worktree, plexer, pane, harness, host. Fixed at
spawn, never changes, already fully described.

**Who an agent coordinates with** is a SPACE. It spans directories and harnesses, so it can never be
derived from either.

The primitive orch was missing is **membership**: a join and a leave.

### The rules, enforced

1. **Membership is never derived from location.** Not from cwd, the repo, the pane, the plexer, the
   harness or the host. Deriving it is why `/server` and `/client` could not work together, and why a
   spaceless agent was ever possible.
2. **An agent inherits its spawner's memberships at spawn.** A whole tree shares its spaces without
   anyone doing anything.
3. **A root with no spawner creates one.** Every agent has membership from birth.
4. **A human can add any agent to any space.** That is a JOIN, not a relocation. Nothing moves and the
   agent's environment is untouched.
5. **Join and leave are explicit acts.** Never inferred, never a side effect of where something runs.
6. **You may subscribe only to members of a space you belong to.** Joining is the explicit act that
   grants coordination.
7. **An agent's environment never changes, so membership never changes on its own.** Only an explicit
   join or leave changes it.
8. **A plexer container is a DEFAULT for what a new root joins, never a definition.** herdr's
   workspace suggests a space NAME. Detaching it changes nothing.

### Settled

- Named SPACE. The word stays, meaning only the named membership entity. "Pack" stays provenance
  (`rootAgentId`); the two never mix.
- An agent holds membership in several spaces at once. To bridge two fleets, one agent joins the
  second space; it keeps its home membership and the two fleets stay walled. The wall check is "share
  at least one space".
- Leave deletes every subscription between the leaving agent and anyone it no longer shares a space
  with. The wall holds continuously, not just at subscribe time. Membership is who you MAY hear, a
  subscription is who you ARE hearing. Collapsing them would make joining a firehose and kill the
  immediate-family default.
- Join and leave: a human runs the CLI directly, or an agent holds a human-granted key from the
  existing permission system. No key, no membership change. No space owner or admission machinery
  beyond that gate.
- A space lives as long as anyone is in it and is deleted when the last member dies or leaves. The
  adam is just another member; its death does not kill the space while others remain, because that
  would leave living agents memberless, an illegal state.
- **The birth rule.** When an adam starts, the environment resolves to a default space NAME and
  nothing more: herdr to the workspace name, tmux to the session name, bare terminal to the directory
  name. A live space with that name means adam joins it; none means adam creates it. An explicit space
  name at spawn overrides. Slaves inherit their spawner's memberships, always. Nothing stored links
  location to space.
- **Two tables, live rows only.** A spaces table (born at first member, reaped on empty) and a
  memberships table (agent to space links, many per agent). No interval columns, no `clearSpace`, no
  left-at. The table answers only "who is in what right now"; the past act lives in the decision log.
- Every agent has membership from birth. A memberless agent is not a legal state.
- `"local"` is banned. A single shared bucket is a missing value with a name (Rule 11).
- One comparison function for membership matching, called by every caller.
- Adding an environment later means implementing one method. Branch on the declared capability, never
  on the backend id (Rule 9).
- Verbs. Hearing: `subscribe` / `unsubscribe` / `subscriptions`. Membership: `join` / `leave` /
  `spaces`.
- The cap on numeric `--depth` is a `settings.json` setting (schema, defaults, registry help line,
  Rule 17) and is exposed in the TUI. `--depth=all` is not a number and the cap never applies to it.

Sources: [Akka location transparency](https://doc.akka.io/libraries/akka-core/2.4/general/remoting.html),
[Birman, A History of the Virtual Synchrony Replication Model](https://www.cs.cornell.edu/ken/History.pdf),
[Exploiting virtual synchrony in distributed systems](https://lass.cs.umass.edu/~shenoy/courses/spring08/readings/birman.pdf),
[Erlang pg](https://www.erlang.org/doc/apps/kernel/pg.html),
[actor model addressing](https://berb.github.io/diploma-thesis/original/054_actors.html),
[k8s namespaces vs labels](https://medium.com/dzerolabs/just-in-time-kubernetes-namespaces-labels-annotations-and-basic-application-deployment-f62568a9eaaf).
See also `learnings/2026-08-31-group-membership-primitives.md`.

### Subscriptions

**A subscription row is the only thing that decides which agents an orch hears from.**

- Spawning writes one automatically, spawner to slave. That is what makes the default immediate
  family. No spawn, no row, no events.
- Closing or killing an agent deletes every row naming it, on either side.
- An orch may subscribe to any agent **in a space it belongs to**, including one in another orch's
  tree.
- Unsubscribe exists, including from your own slave, to shut a noisy one up.
- **Membership is the hard wall.** Not ownership, not the tree.
- A human has no agent id and no subscriptions. A human sees everything.

| command | delivers |
|---|---|
| `subscribe orch-1` | ONLY orch-1's own events |
| `subscribe orch-1 --branch` | orch-1 plus its direct children |
| `subscribe orch-1 --branch --depth=2` | orch-1, children, grandchildren |
| `subscribe orch-1 --branch --depth=all` | orch-1 and everything under it, however deep |

`--branch` alone means depth 1. `--depth` without `--branch` is refused.

**A branch subscription is a live query.** It delivers whatever is in that branch when an event
fires. Slaves that appear later are included, slaves that die drop out.

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

`agents.spawned_by` is immutable and permanent. The subscription row is revocable and short-lived.
They are ALLOWED to disagree: unsubscribing from your own slave leaves provenance intact.

**Never derive a subscription from provenance. Never repair provenance from subscriptions.**

### Ownership

Ownership is provenance, not the lease. The lease says who is DRIVING (gates dispatch, steer, model,
reset). Provenance says whose it is (gates ending it). Subscriptions say who HEARS it. Membership
says who may subscribe at all.

Close authority stays subtree-wide. A grandparent must always be able to kill a runaway grandchild it
never subscribed to. Abort, close and reap are never gated (Rule 11).

### Status is a human command

An orch has no eyes and no business browsing a dashboard. An orch needs transitions from `events`,
facts from the return value of the command it just ran, and its working set, which is its
subscriptions.

The table stays for humans. Capacity stays global, because it is a number about the machine and not
about anyone's agents.

The daemon computes scope. The `status` RPC takes no params today, which is the gap. It takes the
caller claim, resolves it the way `register-session` already does, and answers rows already scoped.
The client renders what it is handed, filters nothing, reads no lease table.

`--mine` and `--any-agent` are deleted. Scope is never a flag.

## Membership waves

Waves run in order. Inside a wave every task has ONE owner and no two tasks share a file (Rule 3).
Hand an orch exactly one task id. A task is done only when its owner's scoped `bun check` and tests
are green.

### Wave 0, spaces and membership store

- [ ] **0.1 schema + migration.** `spaces` (id, name, created_at) and `memberships` (agent FK cascade,
      space FK cascade, created_at, uniqueIndex(agent, space)). Live rows only. Migration WRITTEN then
      HANDED TO BRYAN to run (Rule 1). Never run it.
- [ ] **0.2 row stores.** `src/store/space-rows.ts` and `src/store/membership-rows.ts`, following
      `lease-rows.ts` style. Join creates the space if absent; deleting the last membership deletes
      the space. Tests: create-on-first-join, reap-on-empty, adam death with members left keeps the
      space, many spaces per agent.
- [ ] **0.3 birth rule in spawn.** Environment resolves a default space NAME only. Adam joins the live
      space of that name or creates it; slaves inherit every spawner membership; an explicit space
      name at spawn overrides. Delete every location-derivation path, including the A7 comment and the
      optional-space branches in `spawn/placement.ts`. Tests: no path produces a memberless agent; a
      second adam in the same workspace lands in the first one's space; a raw CLI agent and a herdr
      agent share one space and reach each other; two directories in one space; detaching the plexer
      changes nothing.
- [ ] **0.4 the one comparison function.** Membership-intersection check, the only implementation,
      called by `eventInSpaceScope`, `scopeToSpace` and `checkWall`.
- [ ] **0.5 join / leave / spaces verbs.** Human CLI acts directly. An agent caller must hold the
      human-granted key. Both verbs write decision-log records. Tests: agent without key refused;
      human join/leave works; leave of the last member reaps the space.

### Wave 1, the subscription store

- [ ] **1.1 schema + migration.** Table as shaped above. Migration WRITTEN then HANDED TO BRYAN to run
      (Rule 1). Never run it.
- [ ] **1.2 row store.** `src/store/subscription-rows.ts`, following `lease-rows.ts` style.
- [ ] **1.3 spawn writes the row.** Spawner-to-slave subscription on every spawn. Test: spawn writes
      it; unsubscribing from your own slave leaves `spawned_by` untouched.
- [ ] **1.4 death deletes.** `endAgent()` (`store/agent-rows.ts`) deletes every subscription naming the
      dead agent, either side. One place. Tests: close deletes it; killing the subscriber deletes it.
- [ ] **1.5 leave cascade.** Leaving a space deletes every subscription between the leaver and anyone
      it no longer shares a space with. Test: leave kills the cross-space subscription but keeps
      in-space ones.
- [ ] **1.6 decision log.** Subscribe and unsubscribe write decision-log records.

### Wave 2, the policy

- [ ] **2.1 the resolver.** "Which agents does this caller hear" from the rows, expanding branch
      subscriptions through `policy/provenance.ts`. One traversal per call, not one per row. Tests:
      leaf delivers one; `--branch` delivers depth 1; `--depth=2` delivers two levels; a slave spawned
      AFTER the subscription appears in a branch subscription; a human hears everything.
- [ ] **2.2 the refusals.** Refuse a subscription whose target shares no space with the caller (via
      0.4). Refuse `--depth` without `--branch`. Tests: out-of-space refused; bare `--depth` refused.
- [ ] **2.3 the depth cap.** Cap on numeric `--depth` as a `settings.json` setting (schema,
      `SETTINGS_DEFAULTS`, registry help line, required type, Rule 17), exposed in the TUI. Tests:
      over-cap numeric refused; `all` delivers the whole subtree regardless of cap.

### Wave 3, the wire

- [ ] **3.1 the claim.** `sessionClaim()` carries the launch credential (`ORCH_AGENT_ID`). A spawned
      agent identifies by its minted id, a driving session by its `sessionToken`. No field for the
      former today.
- [ ] **3.2 the resolution.** Daemon resolves claim to caller agent id via `agentIdBySessionToken`.
      Principal type is DECLARED by the credential, never sniffed: credential resolves to an agent; no
      credential is a human. Test: an unresolvable claim is a human at a shell, never a lockout.
- [ ] **3.3 scoped status.** `status` handler takes params and filters through wave 2 before answering.
- [ ] **3.4 scoped stream.** Event push stream filtered by the same policy, daemon-side. Tests: two
      orchs each hear only their own subscriptions; a human claim hears everything.

### Wave 4, the clients

- [ ] **4.1 revert the abandoned edits.** Delete `src/policy/scope.ts`; revert `AgentScopeInput`,
      `CallerScopeChoice` and `ResolvedCallerScope` out of `src/types/policy.ts`; revert
      `src/commands/events.ts` to HEAD.
- [ ] **4.2 status.ts.** Rows arrive scoped. The offline branch calls the wave 2 policy locally.
- [ ] **4.3 events.ts.** Delete `eventInMineScope`, `eventInScope`, `--mine`, `--any-agent` and
      `EventScopeInput`.
- [ ] **4.4 the verbs.** `subscribe` / `unsubscribe` / `subscriptions`.
- [ ] **4.5 usage.** `help.ts` and `commands/index.ts` usage lines for all six verbs.

### Wave 5, docs and gate

- [ ] `skills/orch/SKILL.md`: membership, the immediate-family default, how to subscribe wider, and
      that status is not for orchs.
- [ ] `bun check` clean over the whole tree.
- [ ] `bun test` on: `close-authority`, `commands-status`, `commands-events`, `daemon-events`,
      `owner-scoping`, `events-scope-notice`, plus the new membership and subscription tests.

## Open, needs Bryan

- **What replaces `--cwd`.** The default is settled; the override still needs a name that says it
  sets the agent's directory.
- **`--all` on events.** Should it be the default, with a flag to narrow when narrowing is definitely
  wanted?
