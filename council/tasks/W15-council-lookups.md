# W15: lookups for the council verbs

Context for every section. orch is getting a `council` command with four subverbs: `orch
council convene <name> <member>...`, `orch council round <name>`, `orch council scores <name>`
and `orch council close <name>`. orchd does the work: `convene` spawns the members and sends
each one a prompt, `round` sends the next prompt onto each member's conversation, `close`
closes the members. These lookups find what orchd already has to call, so the new code calls
it and repeats none of it.

Edit no source file. Run no `orch` command, no build, no test, no git command that writes.
Paths are from the repo root `/home/bryan/orch`. Write the one findings file your section
names: markdown, one `##` heading per numbered question, each fact as a bullet ending in
`path:line`, code quoted in a code block when the question asks for a shape or a function.
Write "not found" with the grep you ran where the code has no answer.

## L15 How orchd spawns and dispatches, from inside orchd
Read `packages/orch/src/daemon/server/spawn/` (every file),
`packages/orch/src/daemon/server/handlers/` (the files that handle `spawn`, `dispatch`,
`close`), `packages/orch/src/daemon/client/protocol.ts`,
`packages/orch/src/commands/dispatch.ts` (or the directory that holds the dispatch command),
`packages/orch/src/commands/spawn/`, `packages/orch/src/commands/close.ts`.
Write `council/findings/L15-spawn-dispatch-entry.md`.
1. The `spawn` RPC's handler: the function, its full signature, and what it returns, quoted.
   Name every argument beyond the RPC params (the caller, the directory, a context object)
   and where the handler table gets each.
2. When a spawn's agent has a `prompt`: the function and line where that prompt is sent, and
   whether a dispatch id is minted for it. Quote the lines that mint or record the dispatch id.
3. The `dispatch` RPC: its params in `protocol.ts` quoted in full with line numbers, its
   handler function with its full signature, and what it returns. Which param carries
   keep-context, which carries raw, and which carries the files of `--with`.
4. How `--with <file>` reaches the agent: does the CLI read the file and inline it, or pass a
   path? Quote the function that does it, for `spawn` and for `dispatch`.
5. Where the worker header is put on a prompt: the function and its caller for a spawn's
   prompt and for a dispatch, and what `--raw` skips. Quote the call sites.
6. The dispatch id: where it is minted for a dispatch, quoted, and how the caller of the
   `dispatch` RPC learns it. Quote the result shape.
7. The `close` RPC: its params quoted, its handler's signature, and the function that closes
   one agent by id from inside orchd.
8. How a handler learns who the caller is: the type and the field, with one example handler
   that reads the caller's agent id, quoted. Then how a handler resolves a target given by
   name to an agent id, quoted.
9. How the dispatch gate (a live foreign holder refuses a dispatch) is applied: the function
   and the line in the dispatch path that calls it.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## L16 How a command with subverbs is built, end to end
Read `packages/orch/src/commands/registry.ts`, `packages/orch/src/commands/index.ts`,
`packages/orch/src/commands/message.ts` (or the directory that holds `orch message`),
`packages/orch/src/commands/runs.ts`, `packages/orch/src/commands/target.ts`,
`packages/orch/src/daemon/client/protocol.ts`,
`packages/orch/src/daemon/server/handlers/table.ts`,
`packages/orch/src/daemon/server/handlers/fleet.ts`, `packages/orch/src/settings/schema.ts`,
`packages/orch/src/settings/` (the file that holds each setting's help line),
`packages/orch/src/types/settings.ts`.
Write `council/findings/L16-subverb-command.md`.
1. Every command in `registry.ts` that has subverbs (`orch message read`, `orch daemon ...`,
   `orch settings ...` and any other). For one of them, quote its whole registry entry and
   say how a subverb is declared: its own flags, its positionals, its help.
2. For that same command: the command function, quoted in full, showing how it picks the
   subverb and reads the flags and positionals of each.
3. How a command function is bound to its registry entry: the file and the lines, quoted.
   What `REGISTRATION_EXEMPT` is and which commands are in it.
4. `cmdRuns` and `renderRuns` in `commands/runs.ts`, quoted in full, and the RPC call it
   makes. Any shared helper for printing a table with aligned columns: its name, file and
   signature. `grep -rn "padEnd" packages/orch/src/commands packages/orch/src/cli | head -40`.
5. What one new RPC method needs: quote the `runs` method's entry in `protocol.ts` (params and
   result), the line that binds its handler in `handlers/table.ts`, and the handler `runsOf`
   in `handlers/fleet.ts` in full.
6. What one new settings section needs. Take the `counts` section (`tail`, `peek`): quote
   every place it appears in `settings/schema.ts`, `types/settings.ts`, the file with the help
   lines, and any registry of setting keys or required types. One bullet per place, with the
   lines quoted. `grep -rn "counts" packages/orch/src/settings packages/orch/src/types/settings.ts`.
7. Every test file that holds a complete `OrchSettings` literal, where a new section would
   have to be added. `grep -rln "counts: {" packages/orch/test`. List each with the line.
8. How a command sends its working directory to orchd: one example RPC whose params carry
   `cwd`, with the line in the command that sets it.
9. How a refusal reaches the user: the error classes a handler throws (`CommandRefusal`,
   `SpawnRefusalError` and any other), where each is defined, and what the CLI prints for one.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
