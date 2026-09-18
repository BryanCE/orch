# T7. Add the `capacity` RPC: the held capacity, scoped per caller

Repo: /mnt/c/dev/personal/orch, package `packages/orch/`. Rules: no `as` casts, no `any`, no back-compat, comments two lines max.

Two other agents work at the same time: T5 adds `scopeCapacity(held, scope)`, `CapacityScope` and `HeldCapacity` to `src/policy/capacity.ts`; T6 adds `heldCapacity(orchDir, settings)` in `src/daemon/server/capacity.ts`. Import by those names. If `bun check` says a name does not exist yet, report `pending: <that file>`.

1. Edit `src/daemon/client/protocol.ts`.
   - Params (beside `fleet:` at L306): `capacity: z.object({ packRootId: z.string().nullable().optional(), packSpace: z.string().nullable().optional() }),`
   - Results (beside `fleet:` at L386):
     ```ts
     capacity: z.object({
       packs: z.array(z.object({ root: z.object({ id: z.string(), name: z.string() }), used: z.number(), cap: z.number() })).readonly(),
       spaces: z.array(z.object({ name: z.string(), used: z.number(), cap: z.number().nullable() })).readonly(),
       total: z.object({ used: z.number(), cap: z.number().nullable() }),
     }) satisfies z.ZodType<FleetCapacity>,
     ```
     Import `type FleetCapacity` from `../../policy/capacity.ts`. `.readonly()` on the arrays is the same pattern `filesTouched` uses in `src/notify/event.ts:35`. If `satisfies` still fails on readonly-ness, fix the schema, never the type.
2. Edit `src/daemon/server/handlers/fleet.ts`: add
   ```ts
   export function capacityOf(state: DaemonState, params: ParamsOf<"capacity">): ResultOf<"capacity"> {
     return scopeCapacity(heldCapacity(state.directory, state.services.settings.current()), params);
   }
   ```
   with imports `scopeCapacity` from `../../../policy/capacity.ts` and `heldCapacity` from `../capacity.ts`.
3. Edit `src/daemon/server/handlers/table.ts`: import `capacityOf` from `./fleet.ts` (L12) and add beside `fleet:` (L129): `capacity: (params) => capacityOf(state, params),`.
4. Edit `src/daemon/server/state.ts` `touchOnCall` (beside `fleet:` at L133): `capacity: touchHandler(state, handlers.capacity),`.
5. `RpcHandlers` is a mapped type over every method (`src/types/daemon.ts:44`), so `bun check` names every other table that must gain `capacity`. `test/helpers/rpc-handlers.ts` (`stubRpcHandlers`) is one: add `capacity: notStubbed,` beside `fleet: notStubbed,` (L50). Fix any other the compiler names the same way, and list it in the report.
6. Add to `test/daemon-rpc.test.ts` one test beside `"round-trips a call over the real unix socket"` (L244), using that test's `start(dir)` helper and `stubRpcHandlers` override the same way it does:
   ```ts
   test("capacity answers the scoped fleet capacity", async () => {
     const dir = tempOrchDir("orch-rpc-capacity-");
     const answer = { packs: [], spaces: [], total: { used: 0, cap: null } };
     const server = await start(dir, stubRpcHandlers({ capacity: () => answer }));
     try {
       expect(await rpcCall(dir, "capacity", {}, 1_000)).toEqual(answer);
     } finally {
       await server.close();
     }
   });
   ```
   Match the file's own helper names and cleanup shape exactly (read L100-130 and L244-260 first); the intent is one round trip of the new method.

Run, once, after the edits (Windows side owns the disk):
```
WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT'; bun check"
WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT\packages\orch'; bun test test/daemon-rpc.test.ts test/daemon-transport-parity.test.ts"
```

Other agents edit other files at the same time. If `bun check` is red only in files you did not touch, you are done: report `pending: <those files>`.

Report: one line. `done: <files>, check clean, tests <n> pass`, `pending: <files>`, or `blocked: <exact error>`.
