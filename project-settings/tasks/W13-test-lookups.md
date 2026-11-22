# W13: how the tests this job extends are built

Context for every section. These tasks only read code and write one report file each. Edit no
source file. Run no command. Paths are from the repo root `/home/bryan/orch`; tests are in
`packages/orch/test/`.

For each test file named in your section, write under a `## <file>` heading:
1. Its imports, quoted.
2. Its setup: every helper, `beforeEach`/`afterEach`, and local function the tests share,
   quoted whole.
3. One representative test, quoted whole: the one closest to the topic named beside the file.
4. Every assertion in the file that mentions `verifyCommands`, `gatedCommands`,
   `verify_commands`, `gated_commands`, `locked_commands`, `"settings.json"` (as a source
   word), `workerRules`, or `workerHeaderContextOf`: file:line and the line's text.
Write "not found" for a file that does not exist.

## T1 Locks, gates, headers
Files and topics: `command-lock.test.ts` (a lock ruling for an agent),
`command-gate.test.ts` (the wrap list from settings), `bridge-command-gate.test.ts` (the pi
bridge's tool_call handler), `worker-prompt.test.ts` (a header naming verify commands),
`commands-control.test.ts` (the context a dispatch sends), `commands-spawn.test.ts` (a spawn's
prompt header), `broker-governance.test.ts` (orchd's `dispatch` handler),
`held-drive.test.ts` (a dispatch to a held agent).
Write `project-settings/findings/L20-tests-locks-headers.md`.

## T2 Settings command, editor, council, linked hosts
Files and topics: `settings-command.test.ts` (setting one key, the table, `--json`),
`settings-shell.test.ts` (editor rows and a save), `settings-precedence.test.ts` (sources),
`council-command.test.ts` (the lineup a convene uses), `council-handlers.test.ts` (a round's
limit), `hosts-link.test.ts` (a dispatch over `peer-drive`), `acp-far.test.ts` (a spawn on a
linked host), `project-directory.test.ts` (an agent's project directory).
Write `project-settings/findings/L21-tests-settings-council-hosts.md`.
