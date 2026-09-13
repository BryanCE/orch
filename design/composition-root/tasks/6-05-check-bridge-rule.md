# 6-05-check-bridge-rule

Owns: `scripts/check-bridge.ts`, `test/check-bridge.test.ts` (if it exists; else create it next to the other check-bridge tests, `grep -l "check-bridge" test/*.ts`)

Requires 6-01 through 6-04 landed.

Goal: the roots are enforced statically, the same way Rule 10 is. A future `orchDir()`-style global cannot come back.

Do:

1. Add a line check to `scripts/check-bridge.ts` following the shape of `checkPackageImportLine` (`:349`) and `checkDispatcherCallLine` (`:366`):
   ```ts
   /** Rule: process composition happens at a root. Only src/services.ts reads ORCH_DIR, and
    *  only the roots call createServices(): the CLI (src/commands/index.ts, src/commands/setup.ts
    *  for the first-run wizard), the daemon (src/daemon/orchd.ts), the extensions
    *  (extensions/pi/index.ts, extensions/omp/index.ts). Everything else receives values. */
   export function checkCompositionRootLine(line: string, relPath: string): string | undefined
   ```
   It flags: `process.env.ORCH_DIR` outside `src/services.ts`; `createServices(` outside the five root files; any import of `loadSettings`, `loadSettingsOrNull`, `settingsLogLevel`, `commandLogger`, or `orchDir` from anywhere (those exports no longer exist, so this is a tripwire for someone re-adding them).
2. Wire it into the scan the same way the other line checks are wired. The scan is recursive over `src/`, `extensions/`, and `scripts/`; confirm by reading how `checkPackageImportLine` is invoked and mirror it exactly.
3. Add tests to the check-bridge test file: one violating line per flagged pattern returns a message; each of the five root files' `createServices(` line returns undefined; `src/services.ts` reading `process.env.ORCH_DIR` returns undefined.

Check: lint, tc, `bun --filter @bryance/orch check:bridge` (must be green on the real tree; if it is red, the flagged lines are leftovers, list them under CALLERS and leave the rule in). Tests: the check-bridge test file.
