# P1 review

## Questions and options

T4: 0 findings

## Outbox acknowledgement

T9: 0 findings

## ACP static check

T6: 0 findings

## Schema inventory

T1: 0 findings

## Verification

`bun check` ran once. Pending outside this review: the bridge check rejects the method-presence check at `packages/orch/src/daemon/server/spawn/plan.ts:75`. Typechecks also fail on missing `form` fields in spawn registrations and RPC inputs, and missing `defaults.forms` in settings fixtures. These are outside T1, T4, T6 and T9. No test file was edited or run.
