$ bun --filter @bryance/orch check
@bryance/orch check: check:bridge | check:bridge OK (1277 files scanned)
@bryance/orch check: check:bridge | Done in 659ms
@bryance/orch check: tc           | test/helpers/sources.ts(24,89): error TS2304: Cannot find name 'isTypeScript'.
@bryance/orch check: tc           | test/helpers/sources.ts(33,116): error TS2304: Cannot find name 'isTypeScript'.
@bryance/orch check: tc           | test/pack-gets-its-own-home.test.ts(84,12): error TS2304: Cannot find name 'coordinate'.
@bryance/orch check: tc           | Exited with code 1
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
@bryance/orch check: lint         |     ,-[test/helpers/sources.ts:24:48]
@bryance/orch check: lint         |  23 | /** Every matching file under `directory`, absolute and "/"-separated. */
@bryance/orch check: lint         |  24 | export function sourceFiles(directory: string, matchesName: (name: string) => boolean = isTypeScript): string[] {
@bryance/orch check: lint         |     :                                                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  25 |   return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-unsafe-assignment): Unsafe assignment of an error typed value.
@bryance/orch check: lint         |     ,-[test/helpers/sources.ts:33:75]
@bryance/orch check: lint         |  32 | /** The same listing, addressed the way a rule message names a file: relative to `root`. */
@bryance/orch check: lint         |  33 | export function sourceFilesUnder(root: string, relativeDirectory: string, matchesName: (name: string) => boolean = isTypeScript): string[] {
@bryance/orch check: lint         |     :                                                                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |  34 |   return sourceFiles(join(root, relativeDirectory), matchesName).map((path) => posixPath(relative(root, path)));
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         | Found 0 warnings and 2 errors.
@bryance/orch check: lint         | Finished in 1.6s on 498 files with 65 rules using 24 threads.
@bryance/orch check: lint         | Exited with code 1
@bryance/orch check: Exited with code 1
error: script "check:orch" exited with code 1
