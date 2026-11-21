# W3: lookups for the council feature

Context for every section. "Council" is a planned feature: several agents on different models
review one subject (a plan, a UI or an implementation). Each scores it and lists what would
improve it in one Markdown file of its own, and never changes the subject. The agent that
convened the council does the work between rounds, and the user sees each member's score and
decides whether to run another round. `council/README.md` is the full description. Nothing is
built yet. These tasks only read code and write one report file each.
Edit no source file. Run no `orch` command, no build, no test, no git command that writes.
Paths are from the repo root `/home/bryan/orch`.

Report file format for every section: markdown, one `##` heading per numbered question, each
fact as a bullet ending in `path:line`. Quote a signature or type in a code block when the
question asks for a shape. Write "not found" under a question whose answer is not in the code,
with the grep you ran.

## T10 How orch stops a tool call today
This lookup finds what orch already has for refusing a tool call.
Read `packages/orch/src/policy/command-gate.ts`, `packages/orch/src/policy/command-paths.ts`,
`packages/orch/src/commands/lock.ts`, `packages/orch/src/daemon/server/handlers/command-lock.ts`,
`packages/orch/src/agent/harness-bridge.ts`, `packages/orch/src/agent/tools.ts`,
`packages/orch/extensions/pi/`, `packages/orch/extensions/omp/`,
`packages/orch/extensions/claude/`, `packages/orch/extensions/codex/`,
`packages/orch/extensions/opencode/`, `packages/orch/src/adapters/claude.ts`,
`packages/orch/src/types/adapter.ts`.
Write `council/findings/L10-tool-gate.md` answering:
1. The `commandGate` member of the adapter type: its type, its doc comment, and its value for
   each of pi, omp, claude, codex, opencode.
2. For pi and omp: the function that sees a tool call before it runs, the event it listens
   to, what it can do to the call (rewrite, refuse), and the tool names it acts on. Quoted.
3. For claude: each hook event orch installs, its matcher, and what the hook can do to a tool
   call. Does any hook see the file path of an edit or a write? Quote `CLAUDE_HOOK_EVENTS`
   and `CLAUDE_HOOK_MATCHERS`.
4. For codex and opencode: any code that sees a tool call before it runs. Quote it, or write
   "not found".
5. How a locked, gated or denied command is recognised in a shell command line: the
   functions and what they return.
6. Does any code today refuse or allow a tool call by the file path it would write? Quote
   it, or write "not found" with the grep you ran.
7. What a refused tool call returns to the model on pi and on claude: the text, quoted.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
