# Glossary — one line each

The index. Full definitions in `03-vocabulary.md`; the model in `01-agent-model.md`;
reasoning in `NOTES.md`; decisions in `adr/`.

---

## Participants

| term | meaning | detail |
|---|---|---|
| **agent** | any participant orch knows about — the one and only entity | `03-vocabulary.md` |
| **orch** | the root of a pack; the agent that spawns and directs others | `03-vocabulary.md` |
| **slave** | any non-root member of a pack, doing one slice of work | `03-vocabulary.md` |
| **pack** | an agent and everything spawned beneath it | `03-vocabulary.md` |

## Identity

| term | meaning | detail |
|---|---|---|
| **id** | an agent's identity: minted, opaque, never changes | `01-agent-model.md` §3 |
| **name** | an agent's human-facing label; mutable, resolved to an id at the boundary | `01-agent-model.md` §6a |
| **provenance** | which agent spawned this one; permanent, never changes | `01-agent-model.md` §2 |

## Ownership

| term | meaning | detail |
|---|---|---|
| **hold** | the right to drive another agent; one holder at a time | `01-agent-model.md` §10 |
| **holder** | the agent currently holding another | `01-agent-model.md` §10 |
| **lease** | the record of a holding — acquired, released, with a reason | `01-agent-model.md` §4 |
| **unheld** | an agent with no holder; a normal state, not a leak | `03-vocabulary.md` |
| **orphan** | an unheld agent whose holder died, rather than released it | `03-vocabulary.md` |
| **adoption** | claiming an unheld agent and becoming its holder | `03-vocabulary.md` |

## Grouping and location

| term | meaning | detail |
|---|---|---|
| **space** | orch's grouping of related packs into one effort; bounds communication distance | `adr/0001` |
| **environment** | where a thing is and what surrounds it — cwd, repo, worktree, branch, harness, plexer, the space it is in, OS side. Everything has one. Mutable, never identity | `01-agent-model.md` §12 |
| **harness** | what runs an agent — `pi`, `claude`, `codex`, `omp` | `03-vocabulary.md` |
| **plexer** | the interaction layer between the human and the agents — `herdr`, `tmux`, `headless` | `03-vocabulary.md` |
| **capability** | something a plexer declares it can do; behaviour branches on these, never on a plexer id | `02-scope.md` E3 |
| **daemon** | the one process per machine that holds the truth; every client dials it | `02-scope.md` M1 |
| **executor** | what starts, checks and stops a process across an OS boundary | `02-scope.md` M7 |

## Verbs

| verb | meaning | detail |
|---|---|---|
| **spawn** | create a new agent; naming it is required | `02-scope.md` F4 |
| **dispatch** | push a task at a specific agent — driving, so gated | `03-vocabulary.md` |
| **enqueue** | put a task into a scope (agent, pack, space) for later — gated | `02-scope.md` Cq2 |
| **claim** | take a task from a queue you belong to — not driving, needs no holder | `02-scope.md` Cq1 |
| **steer** | interrupt an agent mid-turn with a correction — driving, so gated | `03-vocabulary.md` |
| **adopt** | become the holder of an unheld agent | `03-vocabulary.md` |
| **release** | give up holding an agent; it stays alive and becomes adoptable | `03-vocabulary.md` |
| **detach** | release the lease. One meaning only | `02-scope.md` D9 |
| **abort** | end an agent's current turn; the agent survives | `01-agent-model.md` §11 |
| **close** | end an agent's process; its record and history survive | `01-agent-model.md` §11 |
| **reap** | delete an agent's record; the last ending | `01-agent-model.md` §11 |
