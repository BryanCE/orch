## 1. Registry subverb commands
- `message`, `daemon`, `host`, `settings`, and other entries declare `subcommands` in `packages/orch/src/commands/registry.ts` (see e.g. lines 111–112, 331–346, 400–446).
- Example whole entry:
```ts
{
    name: "message", section: "dispatch", args: "<orch> <text...>", summary: `Talk to another leading ${term("orch")}: by name, id, or project. Needs fleet.orch_peers.`, flags: [],
    subcommands: [{ name: "read", args: "<code>", summary: "The full text of a message sent to or by you, by the code its monitor line names.", flags: [] }],
}
```
- A subverb is represented by a subcommand entry with its own `name`, `args`, `summary`, and `flags`; registry lines 331–346 show daemon subverbs likewise declare flags individually.

## 2. Command function
- `orch message` is implemented by `cmdMessage` in `packages/orch/src/commands/orchs.ts`; message subverb dispatch is internal to that command implementation. The source file has the command logic; it is not `commands/message.ts`.

## 3. Binding and caller registration
- `packages/orch/src/commands/index.ts:115` defines `Handler = (services: Services, args: string[]) => void | Promise<void>`.
- `packages/orch/src/commands/index.ts:68-70` binds execution through `runAsCaller`: `if (!REGISTRATION_EXEMPT.has(cmd)) await registerCaller(services); await handler(services, args);` The handler map at lines 142–188 binds command names to functions (`runs: cmdRuns`, `message: cmdMessage`, etc.).
- `REGISTRATION_EXEMPT` at lines 62–65 exempts `setup`, `doctor`, `settings`, `daemon`, `logs`, `models`, `status`, and `host` (full set is in that declaration).

## 4. Runs and table rendering
- `cmdRuns` and `renderRuns` are in `packages/orch/src/commands/runs.ts`; `cmdRuns` requests the `runs` RPC and renders its result. There is no shared table helper found in the inspected command/CLI search: `grep -rn "padEnd" packages/orch/src/commands packages/orch/src/cli | head -40` (run; output not retained here).

## 5. New RPC method shape
- `runs` protocol entry: `packages/orch/src/daemon/client/protocol.ts:985`: `runs: z.object({ runs: z.array(RUN_RECORD) }),` (method's params/result schemas are in the surrounding protocol declaration).
- Handler binding is in `packages/orch/src/daemon/server/handlers/table.ts`; `runsOf` is implemented in `packages/orch/src/daemon/server/handlers/fleet.ts`.

## 6. Settings section
- `counts` defaults: `packages/orch/src/settings/schema.ts:126`: `counts: { tail: 20, peek: 25 },`.
- Settings shape: `packages/orch/src/settings/schema.ts:375` declares `counts: z.strictObject(...)`.
- Runtime settings completion is also registered in `packages/orch/src/settings/read.ts:265-267` and the section is included at line 309.
- Help lines: `packages/orch/src/settings/registry.ts:294-295` define `counts.tail` and `counts.peek` descriptions.
- `types/settings.ts` and any key/required-type registry: `grep -rn "counts" packages/orch/src/settings packages/orch/src/types/settings.ts` (the search results show the schema/read/help occurrences above; types are schema-derived).

## 7. Complete settings literals
- `grep -rln "counts: {" packages/orch/test` is the required discovery command; files found by it need the section when the shape changes.

## 8. Working directory RPC
- A command passes its working directory in RPC params where the command builds the method params with `cwd`; inspect the relevant command call site and `protocol.ts` declaration for the concrete method.

## 9. Refusals
- Handler refusals are translated by the command boundary in `packages/orch/src/commands/index.ts` (`reportCommandFailure`). `CommandRefusal` and `SpawnRefusalError` definitions and CLI output path should be followed from their imports/definitions; no complete class inventory was captured in this lookup.
