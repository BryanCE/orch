# 03-die-single

Owns: `src/refusal.ts`, `src/commands/target.ts` (lines 24-27 only), `src/entities.ts` (lines 304-306 only), `src/commands/index.ts` (lines 300-306 only)

Goal: one `die`. Today there are two with different behaviour: `src/commands/target.ts:24-27` logs `command.failed` then throws `CommandRefusal`; `src/entities.ts:304-306` throws without logging. Logging moves to the one place that sees every refusal, `reportCommandFailure`.

Do:

1. `src/refusal.ts`: add, after the `CommandRefusal` class:
   ```ts
   /** Refuse the command with the reason a human needs. Thrown, never exited; the CLI boundary logs it and sets the exit code. */
   export function die(message: string): never {
     throw new CommandRefusal(message);
   }
   ```

2. `src/commands/target.ts`: delete the `die` function at lines 24-27. In its place put `export { die } from "../refusal.ts";` so every command that imports `die` from `./target.ts` keeps working. Remove the `commandLogger` import only if nothing else in the file uses it (grep the file for `commandLogger(`; it is used elsewhere in the file, so most likely keep it).

3. `src/entities.ts`: delete the local `die` at lines 304-306 and import it: `import { die } from "./refusal.ts";` (the file already imports `CommandRefusal` from there; extend that import).

4. `src/commands/index.ts` `reportCommandFailure` (line 300): remove the `if (!(error instanceof CommandRefusal))` guard so every failure is logged, refusals included. Keep the stdout write and `process.exitCode = 1`. If `CommandRefusal` is now unused in the file, remove its import.

Check: lint, tc. Tests: `test/commands-status.test.ts` plus any test file that imports `refusal.ts` (`grep -l "refusal" test/*.ts`).
