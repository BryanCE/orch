packages/orch/test/prerequisites.test.ts:21
Breaks T2's required tests for a binding found on fake PATH and a missing binding whose harness is not failed. Both tests create extensionless executables, but `binaryPath` appends PATHEXT entries on Windows. With the normal Windows PATHEXT, the found-binding test reports missing and the missing-binding test reports a failed harness.
Exact edit: in both PATH-mutating tests, save `process.env.PATHEXT`, set `process.env.PATHEXT = ""` before probing, and restore its previous value in `finally`, deleting the variable when its previous value was undefined. This makes `binaryPath` probe the extensionless fixtures on Windows too.

T2: 1 findings
