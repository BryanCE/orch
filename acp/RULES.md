# Rule wording changed for this job

None of the old rules blocked ACP. Three of them were worded so that they read as if they did,
and I read them that way in the first review. These edits are applied to `CLAUDE.md` and
`learnings/2026-07-16-harness-plexer-architecture.md` on the `acp` branch. `git diff` on those
two files shows the exact text.

## The three misreadings and the fix for each

| What I claimed | Why the rule read that way | The wording now |
|---|---|---|
| Moving an agent between a pane and ACP makes a new agent. | A code comment on `setAgentPlexer` said so. Rule 11 never did: it lists plexer as mutable. | Rule 11 says a mutable fact is an interval row and a change of pane, plexer, harness, form or model is the same agent. Only a spawn mints one. |
| "Mode" is a forbidden fifth fact. | Rule 11 said "four facts, no fifth fact", and harness, model and thinking were already a fifth one the rule did not name. | Rule 11 names five facts. The fifth is program: harness, form, model, thinking. What stays forbidden is a lifetime column and a fact that welds two together. |
| ACP has to be a backend or a harness, and fits neither. | Rule 9 and Rule 10 named two axes and two homes for code. | Rule 9 defines harness, backend, form, protocol and channel. Rule 10 gives a protocol its own directory. |

## Every edit

### `CLAUDE.md`

- **Rule 9.** Four bullets added under the rule: the axes and what each word means, where a
  shared protocol lives, what a channel is, and that adding a form, protocol or channel edits
  no command, renderer or policy.
- **Rule 10.** One bullet added: protocol code goes in `src/<protocol>/`, and
  `check-bridge.ts` enforces it.
- **Rule 11, opening.** "There are no plan files" became: a job in flight keeps its plan,
  findings and task list in one directory at the repo root named for the job, and the
  directory goes when the job lands.
- **Rule 11, facts.** Four facts became five, with program added. Host and space are listed
  under environment, where the store already keeps them. A new bullet says a mutable fact is
  an interval row and never a new agent.
- **Rule 11, delivery.** "Pushed to the bridge" became "pushed down the agent's link (a
  bridge, an ACP session)".
- **Rule 18.** Two sentences added: an agent's log is output read by Rule 20's one reader, and
  orchd may write that log itself.

### The architecture law

- **Direction paragraph.** The second axis is the backend, defined as what holds the process
  and its stdio. A form is defined, with the stdio match as the only join.
- **Law 1.** No code for a harness, form and backend combination.
- **Law 2.** A protocol several harnesses speak is one wire format in one module of its own.
- **Law 4.** Abort joins the dispatcher's traffic. The channel comes from what the agent's
  form declares.
- **Law 5.** A live agent's composition changes only through a lifecycle verb on that agent,
  recorded as a new interval row.

## Code comments that change with the code

These are not edited yet. Each changes in the wave that changes the code under it.

- `packages/orch/src/store/interval-rows.ts:145`. The comment says a plexer is a plain
  membership and moving plexers is a new agent. Wave 2 makes `agent_plexers` an interval and
  replaces the comment.
- `packages/orch/src/backends/held/index.ts:131`. "Never chosen for a spawn" stops being true
  in wave 4, when orchd holds local agents.
- `packages/orch/src/daemon/server/spawn/plan.ts:63`. "On another host the agents run with no
  pane: the backend that places nothing" is replaced in wave 4 by the form and backend match.
