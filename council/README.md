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
- **Member.** Reads the subject and the other members' files from the round before. Writes one
  Markdown file per round in its own directory. Writes nothing else, anywhere, and has no
  shell.
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
- Every member may read every file in the council's directory. A member writes only inside
  its own directory.

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

## What orch needs

1. **The member write rule.** A member's write to any path outside its own directory is
   refused by orch at the tool call. A prompt that asks the member to behave is not the rule.
   - A member launches with no shell tool, so edit and write are the only tools it has that
     reach the disk, and a path check on those two is the whole rule. The lead hands a member
     what a command would have shown it (a diff, test output, screenshots) through `--with`.
   - orch already sees each tool call before it runs on three harnesses: the `tool_call`
     listener in `src/agent/tools.ts` for pi and omp, and the `PreToolUse` hook for claude.
     Both act only on the shell tool and only rewrite a command. Neither refuses a call, and
     neither looks at the path of an edit or a write. `findings/L10-tool-gate.md` §2, §3, §6.
   - The rule extends that seam: the same two sites also act on the edit and write tools and
     refuse a path outside the member's directory. One pure function decides whether a path
     is inside, and both sites call it. The claude hook's matcher widens from `Bash` to cover
     the tools that write, and the hook refuses `Bash` itself for a member.
   - codex and opencode have no site that sees a tool call first (`commandGate` is `false`).
     A harness with no such site is refused as a council member, by that declared capability.
     `findings/L10-tool-gate.md` §1, §4.
   - The directory an agent may write in is chosen per spawn and stored with the agent, so a
     restart keeps it. orchd hands it to the agent's process at every launch. Today the tool
     policy is filled only from the install-wide `workers` settings.
     `findings/L7-tool-limits.md` §7.
2. **The score.** The layout of a round file, the one reader that parses it, the table in the
   store that holds a score per run, the history line, and the table that shows members
   against rounds with each score and its cost.
3. **Council settings.** The members (harness, model, thinking), the round count, the score
   scale, the criteria and the council directory. None exists today. They describe a project,
   so they live in the project settings file the `project-settings/` job adds.
   `findings/L2-settings-models.md` §7.
4. **A member prompt.** `orch spawn` puts the worker header and the verify commands ahead of
   the first prompt and has no `--raw`. A member's first prompt needs to arrive without them.
   `findings/L7-tool-limits.md` §4, §5.
5. **The council skill.** `packages/orch/skills/council/`: how a lead convenes a council, runs
   a round, reads the scores, does the work and asks the user about the next round.

## Built

Source that has landed, each with its test. None of it is reachable until the launch path
below sets a write root.

- `src/policy/write-root.ts`. The one place that decides: `insideWriteRoot`, `toolReach`
  (a tool call classified by its harness's vocabulary), `writeRootRefusal` (the text the model
  gets), `writeRootOf` (the root from `ORCH_WRITE_ROOT`). A tool the vocabulary does not list
  is refused, so an MCP tool or a shell that slips past the launch allowlist still cannot run.
- `extensions/pi/vocabulary.ts`, `extensions/omp/vocabulary.ts`,
  `extensions/claude/vocabulary.ts`. Each harness's own names for its read tools, its write
  tools and the input field that holds the path. The bridge, the hook and the adapter read
  the same constant.
- `src/agent/tools.ts`. The pi and omp `tool_call` listener answers `{ block, reason }` for a
  refused call.
- `extensions/claude/tool-gate.ts`. The claude `PreToolUse` decision, called by the hook shim.
  The hook's matcher now covers `Bash`, `Edit` and `Write`.
- `AgentAdapter.toolVocabulary`. Null on codex and opencode, which is the capability a
  write-root spawn is refused on. Claude's adapter passes `--tools` for a write-root launch.
- `src/council/round-file.ts`. `roundFileName`, `roundFileLayout` (the text a member's prompt
  quotes) and `parseRoundFile`. A round file is:
  ```
  Score: 7/10

  ## Improvements

  1. The change that would raise the score most.
  2. The next one.
  ```

## Next

1. **The launch path.** A spawn carries a write root to orchd. orchd stores it in a new
   `agent_write_roots` table, launches the agent under a worker policy of only the harness's
   read and write tools and orch's own, with no user extension and no MCP server, and sets
   `ORCH_WRITE_ROOT`. A restart reads the root back from the store. Today a restart carries no
   tool policy at all (`findings/L11-launch-facts.md` §4). `findings/L14-launch-options.md`
   lists every site.
2. **The council in the store.** Tables for a council, its members, its rounds and one score
   per run, and the history line. One `bun db:gen` covers these and `agent_write_roots`.
3. **The verbs**, then the settings, then the skill.

## Open questions

- Is a council driven by verbs of its own? The proposal: `orch council convene <name>` reads
  the council settings, makes the directory, spawns each member under its write root and sends
  the member prompt; `orch council round <name>` sends the next round onto each member's
  conversation; `orch council scores <name>` prints members against rounds with score and
  cost; `orch council close <name>` closes the members. orch then owns the member prompt and
  the round-file layout in one module, and the skill only says when to run each verb. The
  other way is no new verb: the skill has the lead run `orch spawn` and `orch dispatch` itself
  and write the member prompt by hand.
- Which models a council may use is set by `models.allowed`, which today allows pi three
  OpenAI models and claude two. Does a council use that list or carry its own?
- Council settings live in the project file, so they wait on `project-settings/` and its own
  open questions.

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
