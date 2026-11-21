# W4: lookups for the first council build wave

Context for every section. "Council" is a planned feature, described in `council/README.md`.
A council member is an agent that reads a subject and writes review files inside one directory
of its own. orch will refuse, at the tool call, every write a member makes outside that
directory, and a member launches with no shell tool. Nothing is built yet. These tasks only
read code and write one report file each.
Edit no source file. Run no `orch` command, no build, no test, no git command that writes.
Paths are from the repo root `/home/bryan/orch`.

Report file format for every section: markdown, one `##` heading per numbered question, each
fact as a bullet ending in `path:line`. Quote a signature or type in a code block when the
question asks for a shape. Write "not found" under a question whose answer is not in the code,
with the grep you ran.

## T11 How a launch fact reaches the process and survives a restart
This lookup finds where a new per-agent launch fact (a directory the agent may write in) has
to be stored, passed and re-read.
Read `packages/orch/src/daemon/server/spawn/` (every file),
`packages/orch/src/daemon/server/handlers/relaunch.ts`,
`packages/orch/src/daemon/server/handlers/table.ts`, `packages/orch/src/db/schema.ts`,
`packages/orch/src/store/agent-rows.ts`, `packages/orch/src/store/interval-rows.ts`,
`packages/orch/src/store/spawn-registration.ts`, `packages/orch/src/types/adapter.ts`.
Write `council/findings/L11-launch-facts.md` answering:
1. `spawnHeadless`: its file, its full signature, and what it does with each of the params
   `tools`, `workers` and `env`. Name each function it hands them to.
2. Every store row a spawn writes for a new agent: the row function, its file, the table.
   One bullet per row, in the order they are written.
3. The `agent_tunings` table in `packages/orch/src/db/schema.ts`, quoted in full. Then every
   function that inserts into it or reads it: file, signature, and each call site.
4. `orch restart` and a change of form: the function that launches the new process, and
   where its `tools`, `workers` and `env` come from. Are they re-read from settings at the
   restart, or read back from the store? Quote the lines.
5. The pane launch path (an agent spawned into a plexer pane, `prepareAgents` in
   `spawn/index.ts` and what it calls): where `tools`, `workers` and `env` are passed, and
   the function that turns `env` into the launched command.
6. For each launch path (headless, held, pane, a linked host): does an env var named in the
   spawn's `env` reach the harness process? Name the function that applies it, or write
   "not applied" with the lines that show it.
7. Every test file that names `agent_tunings`, and `packages/orch/test/store-rebuild-schema.test.ts`:
   the lines that list the expected tables.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T12 What a harness lets orch do to a tool call
This lookup finds the exact contract for refusing a tool call on pi, omp and claude.
Read `packages/orch/src/agent/harness-bridge.ts`, `packages/orch/src/agent/tools.ts`,
`packages/orch/extensions/pi/`, `packages/orch/extensions/omp/`,
`packages/orch/extensions/claude/`, `packages/orch/src/adapters/claude.ts`,
`packages/orch/src/adapters/claude-hooks.ts`, `packages/orch/src/adapters/pi.ts`,
`packages/orch/src/adapters/omp.ts`. For the harnesses' own types, find their installed
packages with `ls node_modules/@mariozechner packages/orch/node_modules 2>/dev/null` and
`ls "$(npm prefix -g)/lib/node_modules"`, and read their `.d.ts` files.
Write `council/findings/L12-tool-refusal.md` answering:
1. The type of `harness.on` in `harness-bridge.ts`: the handler's parameter and return type,
   quoted. Does a handler's return value reach the harness? Quote the code that forwards it,
   or the code that drops it.
2. In pi's own package: the type of the `tool_call` event and the type a handler may return
   to block the call. Quote both with the `.d.ts` path and line. Same for omp's package.
3. pi's built-in tool names, and for each tool that can change a file: the name of the input
   field that holds the path. From pi's type definitions, quoted. Same for omp.
4. `currentFileCandidate` in `packages/orch/src/agent/tools.ts`, quoted in full.
5. The tests of the `tool_call` listener in `registerAgentTools`: the test file, the helper
   that fakes the harness, and the lines of one test that fires a `tool_call` event.
6. Claude: `presenceSession` (file, signature, return type quoted), and every place the claude
   hook reads `process.env`.
7. Claude: every consumer of `CLAUDE_HOOK_MATCHERS` (the shim install, doctor), and every test
   that asserts on a matcher or on `PreToolUse`. One bullet per site.
8. Claude: the functions in `packages/orch/src/adapters/claude.ts` that build the launch argv,
   quoted, and whether any passes `--tools`, `--allowedTools` or `--disallowedTools`.
9. Run `claude --help`, `pi --help` and `omp --help`. Quote the lines that describe a flag
   which limits the tools a session has. Write "not installed" for a command that is missing.
10. The tests of the claude hook's `PreToolUse` branch: the test file and how it feeds the
    hook its stdin.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T13 What orchd does when a run finishes, and how it reads an agent's file
This lookup finds where a member's score would be parsed and stored when its run finishes.
Read `packages/orch/src/daemon/server/status-report.ts`, `packages/orch/src/presence/`,
`packages/orch/src/store/run-rows.ts`, `packages/orch/src/db/schema.ts`,
`packages/orch/src/process-place.ts`, `packages/orch/src/store/interval-rows.ts`,
`packages/orch/src/commands/registry.ts`, `packages/orch/src/daemon/server/handlers/table.ts`,
and the files `rg -ln 'runs' packages/orch/src/commands packages/orch/src/daemon/server/handlers`
names.
Write `council/findings/L13-run-finish.md` answering:
1. `acceptResultReport` in `status-report.ts`, quoted in full, with every caller.
2. The history appender in `packages/orch/src/presence/`: its file, every exported function
   with its signature, the file each one appends to, and the record type of each, quoted.
3. The `runs` table in `packages/orch/src/db/schema.ts`, quoted in full. Every exported
   function of `run-rows.ts` with its signature. How a run's id relates to a dispatch id.
4. Every caller that marks a run finished. Which of them runs for an agent driven over ACP,
   and which for a headless oneshot agent, neither of which calls `report-result`?
5. The one reader of an agent's log (CLAUDE.md Rule 20): its file, its exported functions with
   signatures, and one call site from `orch tail`. Can it read a path other than the log?
   Quote the code that fixes the path.
6. `hereAgentIfAny` in `process-place.ts` and `agentLocation` in `interval-rows.ts`, each
   quoted in full with its return type.
7. The `orch runs` command: its registry entry, its command file, its RPC name and schema,
   its handler, and the function that prints its table. Name the table helper it uses.
8. Where a transition to `done` is published (the `transition` event): the function, quoted,
   and whether the run row is already written when it fires.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
