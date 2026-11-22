# W2: lookups for the plan's second rewrite

Context for every section. `project-settings/README.md` is a plan to give orch a second
settings file per repository. These tasks only read code and write one report file each. Edit
no source file. Run no command. Paths are from the repo root `/home/bryan/orch`.

Report file format for every section: Markdown, one `##` heading per numbered question, each
fact as a bullet ending in `path:line`. Quote a signature or a type in a code block when the
question asks for a shape. Write "not found" under a question whose answer is not in the code,
with what you searched for.

## T1 Wire shapes and handlers
Write `project-settings/findings/L4-wire.md` answering:
1. `WorkerHeaderContext` in `packages/orch/src/types/core.ts`: quote the whole type. Then the
   zod schema of the `worker` field of the `dispatch` request in
   `packages/orch/src/daemon/client/protocol.ts`: quote it.
2. `workerRules` in `packages/orch/src/worker-prompt.ts`: quote the function and the
   `WorkerRules` type. List every call of `workerRules(` in `packages/orch/src/` and
   `packages/orch/extensions/`, one bullet each with the calling function.
3. `peerDrive` in `packages/orch/src/daemon/server/handlers/drive.ts`: quote how it handles
   `action: "dispatch"`, and quote the `PEER_DRIVE` schema's dispatch member in `protocol.ts`.
4. A spawn onto a linked host. In `packages/orch/src/daemon/server/spawn/` find where a spawn
   with `settings.host !== null` sends its agents to that host: the function, the RPC or link
   method name it sends, the field that carries the first prompt, and the handler on the
   receiving host that launches the agent. Quote each signature.
5. In `packages/orch/src/agent/tools.ts`, the `harness.on("tool_call", ...)` handler near line
   298: is the handler function `async`? Does any handler registered with `harness.on(` in
   `packages/orch/src/agent/` or `packages/orch/extensions/pi/` return a promise? Quote one
   that does, or write "none found". Quote the type of `harness.on` if the code declares one.
6. In `packages/orch/extensions/claude/tool-gate.ts`, quote the signature of `preToolUse`. In
   `packages/orch/extensions/claude/index.ts`, is `gateToolCall` async, and how are the
   handlers in the table near line 147 invoked: awaited or not? Quote the invoking lines.
7. How a daemon handler learns who the caller is. Quote the `GOVERNANCE` and `CALLER` schemas
   in `protocol.ts`. Quote the signatures of `callerKindOf` and `selfIdentityOf` with their
   files. Quote one handler that refuses a caller that is not the operator, with its refusal
   text. `orch settings grant` is one place to look:
   `packages/orch/src/commands/settings.ts` and `packages/orch/src/policy/agent-settings.ts`.
8. The settings file lock. Quote the `lock` section of `SETTINGS_DEFAULTS` in
   `packages/orch/src/settings/schema.ts`, and the function in `packages/orch/src/settings/`
   that takes the lock around a write, with its signature.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>" or "blocked: <exact error>".

## T2 Names, docs and tests
Write `project-settings/findings/L5-names-docs-tests.md` answering:
1. Every occurrence of the identifier `projectRoot` in `packages/orch/src/`,
   `packages/orch/extensions/` and `packages/orch/test/`: one bullet each, saying whether it
   is the function `projectRoot()` being defined, a call of it, a field or parameter named
   `projectRoot`, or a comment.
2. Every occurrence of `ORCH_PROJECT` in the same three directories, one bullet each.
3. In `packages/orch/src/agent/presence.ts` near line 91 and in
   `packages/orch/src/types/`, the presence field named `project`: quote the type that
   declares it and list each place that writes it.
4. `sourceFor` in `packages/orch/src/settings/shell/state.ts`: quote it. Then how the settings
   editor saves an edited value: the function chain from the key press to
   `writeRegisteredSetting`, one bullet per function.
5. `packages/orch/help/settings.md`: quote every line that says what an agent may write or
   where `workers.verify_commands` or `locked_commands` is stored, with line numbers.
6. `packages/orch/README.md`: quote every line that mentions `workers.verify_commands` or
   `locked_commands`, with line numbers.
7. `packages/orch/skills/orch/reference/fleet.md` and
   `packages/orch/skills/orch/reference/commands.md`: quote every line that mentions
   `orch settings`, with line numbers.
8. The `settings` entry in `packages/orch/src/commands/registry.ts`: list its flags and each
   subcommand with its flags.
9. Test files under `packages/orch/test/`: list by name each file that imports from
   `src/daemon/server/handlers/write.ts`, from `src/daemon/server/handlers/drive.ts`, from
   `src/daemon/server/handlers/command-lock.ts`, from `src/worker-prompt.ts`, and each file
   whose name starts with `council-`. One bullet per file with the module it imports.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>" or "blocked: <exact error>".
