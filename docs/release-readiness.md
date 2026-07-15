# Release readiness

Observed on WSL2, 2026-07-15, branch `main` at `6213ba1`.

## 10.2 certification (PRE-PUBLISH; not published)

- [x] `bun run build` — succeeded. `dist/bin/orch.js` and `dist/extensions/orchestrator-bridge.js` were produced; `head -1 dist/bin/orch.js` returned `#!/usr/bin/env node`.
- [x] `bun run check 2>&1 | tail -3` — returned:
  ```text
  55 entry points detected (49 plugin, 6 package.json)

  ✓ No issues found (0.03s)
  ```
- [ ] `bun test 2>&1 | tail -4` — **failed**:
  ```text
  221 pass
  2 fail
  626 expect() calls
  Ran 223 tests across 49 files. [16.97s]
  ```
  The two failures are `test/doctor-hosts.test.ts` version expectations: the test observes local `0.1.0` while the expected local version is `0.2.0`.
- [x] Node-without-Bun pack/install smoke — `npm pack` produced and installed the tarball in a temporary prefix. With `PATH=/usr/bin:/bin`, `bun: not found`; installed `orch --version` and `orch --help` both exited successfully. Version output:
  ```text
  orch 0.2.0
  ```
  Temporary files were removed.
- [ ] Package version — `node -p "require('./package.json').version"` returned `0.1.0`, not `0.2.0`.

## Decision

**Not fully release-ready for `npm publish`:** build, check, and Node-without-Bun execution are green, but the full test suite has 2 failures and `package.json` is still `0.1.0`. Do not publish until the operator completes the version/publish gate. Task 10.2 remains publish pending; task 9.5 remains a separate second-machine loop.

REMAINING (operator): run `npm publish` (0.2.0). 9.5 second-machine loop handled separately.
