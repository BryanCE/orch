# fix-broadcast-bare

Owns: `src/commands/control.ts` (only `cmdBroadcast`), `src/commands/target.ts` (only `requireCallerOwnerToken` and one new function next to it)

Bug: `orch broadcast "<text>"` with no targets is refused for a driving session with `--all is operator-only`. The bare form means "every agent I own" (help text: "or all of the caller's agents"), and the loop under `if (all)` already filters with `ownsAgent(services.orchDir, record)`, so nothing is widened and no operator gate belongs there. The gate comes from `requireCallerOwnerToken()` in `target.ts`, which calls `forbidNonOperatorOverride("--all")` unconditionally.

Do:

1. `src/commands/target.ts`: split the gate from the token. Add, directly above `requireCallerOwnerToken`:
   ```ts
   /** The calling orchestrator's token, or a refusal naming the fix. No operator gate: the caller acts on its own agents. */
   export function ownerTokenOrDie(): string {
     const token = callerOwnerToken();
     if (!token) die(`Bulk operation refused: set ORCH_OWNER to identify this ${term("orch")}.`);
     return token;
   }
   ```
   and make `requireCallerOwnerToken` be `forbidNonOperatorOverride("--all"); return ownerTokenOrDie();`. Behaviour of every existing caller of `requireCallerOwnerToken` is unchanged.

2. `src/commands/control.ts` `cmdBroadcast`: track whether `--all` was passed explicitly (the existing `all` variable set in the arg loop) separately from "no targets given". Replace
   ```ts
   if (!targets.length) all = true;
   const destinations = new Map<string, PresenceEntry>();
   if (all) {
     requireCallerOwnerToken();
   ```
   with
   ```ts
   const explicitAll = all;
   if (!targets.length) all = true;
   const destinations = new Map<string, PresenceEntry>();
   if (all) {
     if (explicitAll) requireCallerOwnerToken(); else ownerTokenOrDie();
   ```
   Import `ownerTokenOrDie` from `./target.ts` alongside the existing imports. Nothing else in the function changes.

Check: `bunx oxlint src/commands/control.ts src/commands/target.ts` and `bunx tsc --noEmit 2>&1 | grep -E "commands/(control|target)\.ts"` from `packages/orch`. Tests: `test/commands-control.test.ts` if it exists, else none named.
