# Verification wave 1

## Gate suite

- `test/backend-herdr.test.ts` — PASS (17/17)
- `test/tiling.test.ts` — PASS (12/12)
- `test/daemon-registration.test.ts` — PASS (4/4)
- `test/orchd-rpc-reconnect.test.ts` — PASS (2/2)
- `test/doctor-checks.test.ts` — PASS (8/8)
- `test/spawn-policy.test.ts` — PASS (5/5)
- Combined: **47 pass, 0 fail**, 118 assertions.

## owner-scoping runs

### (a) inherited worker environment
Command: `orch lock run -- bun test test/owner-scoping.test.ts`

**12 pass, 3 fail**. All three fail because target resolution emits an incorrect no-match error:

- `test/owner-scoping.test.ts:199` — `driving verbs remain gated against a live foreign holder`
- `test/owner-scoping.test.ts:217` — `result refuses a foreign-owned agent and names its owner`
- `test/owner-scoping.test.ts:241` — `pane mutations refuse a foreign-owned agent and name its owner`

Exact message (all three):
`No target matches "headless~local~foreign-dispatch". Run 'orch panes' to list.`
(with `foreign-result` / `foreign-pane` substituted in the other two cases.)

### (b) environment-cleared
Command: `orch lock run -- env -u ORCH_AGENT_KEY -u ORCH_OWNER -u HERDR_PANE_ID -u HERDR_TAB_ID -u HERDR_WORKSPACE_ID -u HERDR_ENV -u ORCH_DIR bun test test/owner-scoping.test.ts`

**14 pass, 1 fail**. `test/owner-scoping.test.ts:199` (`driving verbs remain gated against a live foreign holder`) times out after 5000ms; output is empty for the first dispatch assertion. `result` and pane-mutation ownership tests pass.

### Environment isolation
- `HERDR_PANE_ID` is the flipping variable: with it inherited, all three tests fail early with `No target matches`; removing it makes result/pane tests pass but exposes the driving-verb timeout.
- Removing `HERDR_ENV`, `HERDR_TAB_ID`, or `HERDR_WORKSPACE_ID` alone does **not** change the 3-failure no-match result.
- `runCli()` already deletes `ORCH_AGENT_KEY` and controls `ORCH_OWNER`; `ORCH_DIR` is set to the fixture dir.

## Test-isolation assessment (3 lines)

`test/backend-herdr.test.ts` explicitly saves/deletes `HERDR_PANE_ID`, so owner-scoping should isolate this ambient pane variable too.
The no-match failures are caller-environment contamination during target resolution, not ownership assertion behavior.
After isolation, the remaining dispatch timeout suggests a separate source/control-path issue; it is not fixed by changing the expected owner assertion.

## Smallest fixes

- **Tests:** in `test/owner-scoping.test.ts`, save/clear/restore `HERDR_PANE_ID` (and related HERDR caller identity vars) around the suite, matching backend-herdr isolation.
- **Source:** no source change justified by this verification; investigate the post-isolation dispatch timeout separately (first failing command is `dispatch`).
