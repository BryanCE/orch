# Council

Everything for the job of adding a council to orch. This directory goes when the job lands.

## What a council is

A council reviews one subject and scores it. The subject is a plan, a UI or an
implementation. Each member is an agent on a different model. A member reads the subject,
scores it, and lists what would improve it. A member never changes the subject.

The agent that convened the council does the work. It reads the reviews, then makes the
improvements itself or spawns workers to make them, and convenes the next round. The user sees
each member's score for each round and decides whether another round runs.

## Who does what

- **Lead.** The agent that started the council. It names the subject, spawns the members,
  reads their files, does or delegates the work between rounds, and reports the scores to the
  user.
- **Member.** A read-only agent. Reads the subject and the other members' files from the round
  before. Writes one Markdown file per round in its own directory, which is the only place it
  can write.
- **User.** Reads the scores. Says whether another round runs.

## The council directory

A council's directory is `.orch/councils/<council name>/` at the repository root. That is the
default of the `council.directory` setting. Whether git tracks it is the repository's
`.gitignore`; orch never edits that.

```
.orch/councils/<council name>/
  <member name>/
    round-1.md
    round-2.md
```

- Each member has one directory, named for it, and writes one file per round there.
- A round file carries the member's score and its ordered list of improvements, in a fixed
  layout that one reader in orch parses.
- Members write at the same time. In round N a member reads the others' `round-<N-1>.md`,
  which no longer changes. A finished round's file is never rewritten.
- Every member may read every file in the council's directory. A member's own directory is
  its output directory.

## Where a score lives

A score is in three places, and each has one job:

- **The round file.** What the member wrote. It is the member's output, for people and for
  the other members to read.
- **orchd's store.** When a member's run finishes, orchd parses its round file once and stores
  the score against that run. The score table is a store query, with the run's model, tokens
  and cost beside each score. It shows when the member's host is offline.
- **orchd's history.** orchd appends each stored score to the member's history beside its
  status and results, so a lost store can be rebuilt. Nothing reads history to decide
  anything.

## What orch already has

Each line names the findings file that carries the `path:line` facts.

- One `orch spawn` takes a harness and a model per name, so one call starts the whole council.
  `findings/L6-rounds.md` §8.
- pi alone reaches Anthropic, OpenAI and OpenRouter models, so a council of several providers
  needs one harness. `findings/L2-settings-models.md` §6.
- `orch dispatch --keep-context` sends the next round onto the conversation a member already
  has. `orch dispatch --raw` sends a prompt with no worker header. `findings/L6-rounds.md` §1.
- `orch monitor` reports each member's finish to the lead. `findings/L9-server-flow.md` §1.
- Each dispatch has a `runs` row with its model, tokens and cost, so a member's cost per round
  is already stored. `findings/L3-fanout-results.md` §3.
- A directory under `packages/orch/skills/` installs with no other edit, because setup scans
  the directory. `findings/L1-skills.md` §3, §6.
- pi and omp launch under a tool allowlist: `--tools`, with the built-ins dropped by
  `--no-builtin-tools` or `--no-tools`. `findings/L7-tool-limits.md` §2.

## The read-only agent

A member is a read-only agent, which is something any orchestrator can spawn, council or not.

- A **read-only agent** keeps its harness's tools that read and orch's own. It has no shell,
  no MCP tool and no extension tool.
- It may be given one **output directory**. That lets it write files there and nowhere else.
  With none, it writes nothing and its reply is its result.
- orch refuses a call at the tool call. A tool that is not known to be a read is refused, so a
  tool that slips past the launch allowlist still cannot run.

```
orch spawn checker --read-only                                    # reads and replies
orch spawn lookup-a lookup-b --read-only --out council/findings   # reads, and writes reports there
```

A council member is a read-only agent whose output directory is its own member directory. The
lead hands a member what a command would have shown it (a diff, test output, screenshots)
through `--with`.

codex and opencode have no site that sees a tool call before it runs, so they cannot run a
read-only agent, and a spawn that asks is refused with the harnesses that can.
`findings/L10-tool-gate.md` §1, §4.

## The council verbs

A council has verbs of its own, and its members sit in a tab of their own, apart from any
worker fleet the same orchestrator runs.

```
orch council convene plan-review --prompt "Review the plan in plan.md." --with plan.md
orch council round plan-review "Rewrote section 2." --with plan.md
orch council scores plan-review
orch council close plan-review
```

- `convene` launches each member read-only with its member directory as its output directory,
  records the council, and sends round 1. The members are the `council.models` setting: models
  by harness, one member per model, each named for the council and its model
  (`src/council/lineup.ts`). A convener that names members on the command, with a harness and a
  model each the way a spawn does, seats those instead for that one council.
- `round` sends the next round onto each member's conversation. It is refused while a member
  of the round before still runs. From round 2 a member is pointed at the others' files from
  the round before.
- `scores` prints a row per member and a column per round, with the model and cost of the
  runs, and under the table what was wrong with any file that carried no score.
- `close` closes every member still running, then the council.

Who may send a round is who may drive the members, and who may close the council is who may
close them: the agent that convened it, an agent that adopted its members, and the human. A
round that one member refuses still goes to the others, and the command says who it did not
reach and why. orch owns the member prompt and the round-file layout in `src/council/`, so
what a member is told to write is what the reader parses.

## Built

Source that has landed, each with its test.

- **The read-only agent.** `src/policy/read-only.ts` decides, at the pi and omp `tool_call`
  listener (`src/agent/tools.ts`) and at the claude `PreToolUse` hook
  (`extensions/claude/tool-gate.ts`). Each harness names its read tools, its write tools and
  its path field in `extensions/<harness>/vocabulary.ts`. `WorkerPolicy.readOnly` carries the
  fact on every launch, `AgentAdapter.readOnly` is null on codex and opencode, the
  `agent_read_only` table keeps it for a restart, and `orch spawn --read-only [--out <dir>]`
  asks for it. A read-only agent's worker header says what it is and names no verify command.
- **The council's files.** `src/council/layout.ts` builds every path, `round-file.ts` holds
  the layout a member writes and the parser, `prompt.ts` writes a member's round prompt.
- **The council in the store.** `councils`, `council_members` and `council_reviews` in
  `src/db/schema.ts`, read and written by `src/store/council-rows.ts`. A review row is written
  when a round's prompt is dispatched and scored once, when that run finishes.
- **The council in orchd.** `src/daemon/server/council.ts`: the four handlers, and
  `scoreFinishedRun`, which reads a finished member's round file, stores the score and
  appends it to the member's `scores.jsonl` history.
- **The command.** `src/commands/council.ts`, `help/council.md`, and the registry entry.
- **Settings.** `council.directory`, `council.scale` and `council.models` in the install
  settings file. A settings file whose `council.models` names a model outside that harness's
  `models.allowed` is refused, on read and on write. In the `orch settings` editor the
  `council.models` row opens a picker: each enabled harness in turn, its launchable models as
  a checklist (`resolveCouncilModels` in `src/setup/composition.ts`).
- **The skill.** `skills/council/SKILL.md`: how a lead runs a council.

## Waiting on Bryan

- `bun run build:orch:dev`, then a first real council to try the verbs end to end.

## Next

1. **Project settings.** The council's models and round count describe a project, so they
   belong in the project settings file the `project-settings/` job adds. Until then
   `council.models` is one lineup for the install, and a round runs when the lead sends it.
2. **The web UI.** A council page: members against rounds, each review a click away.
   `findings/L8-web.md`.

## Decided

- The models that sit on a council are a setting, `council.models`, so a convener never names
  them per council. The list is a subset of `models.allowed`, held to it per harness.
- A council's criteria are part of the convener's `--prompt`. They change with every council,
  so they are not a setting.

## Open questions

- A member whose round carries no score (its run errored, or its file had no score line orch
  could read) shows `?` for that round and takes the next round with the others. Nothing
  re-scores that round. Whether that is needed waits on what real councils show.

## Working material

- `tasks/`. One Markdown file per wave, one section per agent.
- `findings/`. Maps of today's code with `path:line` for every fact:
  - `L1-skills.md`. How a skill ships and what doctor checks.
  - `L2-settings-models.md`. The settings sections, what one setting needs, how a model name
    resolves, what each harness declares.
  - `L3-fanout-results.md`. Every command and its RPC, what a result is, the task queue.
  - `L4-acp-forms.md`. The four forms, ACP sessions, held and headless agents.
  - `L5-mail-tools.md`. The tools a spawned agent gets, mail, questions.
  - `L6-rounds.md`. What a dispatch does to a conversation, run history, per-name models.
  - `L7-tool-limits.md`. Worker tool policy per harness, the worker header, command rules.
  - `L8-web.md`. The web UI's routes, its calls to orchd, live updates.
  - `L9-server-flow.md`. The event bus, what orchd does when an agent finishes, what a new
    verb and a new table touch.
  - `L10-tool-gate.md`. How orch refuses a tool call today, per harness.
  - `L11-launch-facts.md`. How a launch fact is stored, reaches the process, and survives a
    restart.
  - `L12-tool-refusal.md`. What pi, omp and claude let orch do to a tool call, and the flags
    that limit a session's tools.
  - `L13-run-finish.md`. What orchd does when a run finishes, its history, and how it reads a
    file on an agent's host.
  - `L14-launch-options.md`. Every place a launch's options are built, from the request to the
    process.
  - `L15-spawn-dispatch-entry.md`. How orchd spawns, dispatches and closes from inside itself.
  - `L16-subverb-command.md`. How a command with subverbs and a settings section are built.
