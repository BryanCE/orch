# 6-02-env-read-into-services

Owns: `src/services.ts`, `src/presence/writer.ts` (only `orchDir` at `:25-27`), `src/presence/session.ts` (only its `orchDir` import)

Requires waves 2 through 5 landed.

Goal: exactly one read of `process.env.ORCH_DIR` in `src/`, and it lives in the services module.

Do:

1. In `src/services.ts`, replace the `import { orchDir as envOrchDir } from "./presence/writer.ts"` with a local:
   ```ts
   /** The ONE read of ORCH_DIR. Every other module receives the directory as a value. */
   export function envOrchDir(): string {
     return process.env.ORCH_DIR ?? join(homedir(), ".orch");
   }
   ```
   importing `homedir` from `node:os`. The `?? join(homedir(), ".orch")` is the env-var default Rule 17 allows; it is not a settings read.
2. Delete `orchDir()` from `src/presence/writer.ts`. Run tc. Every remaining importer of it is a leftover; list under `CALLERS:`. `src/presence/session.ts` is expected: change its import to `envOrchDir` from `../services.ts`.
3. Grep `src/` and `extensions/` for `process.env.ORCH_DIR`. Any hit outside `src/services.ts` goes under `CALLERS:`.

Check: lint, tc. Tests: `grep -l "presence/writer" test/*.ts`; report failures from the deleted export as CALLERS.
