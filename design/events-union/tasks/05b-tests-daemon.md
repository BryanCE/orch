# 05b-tests-daemon

Model: `luna:low`.

Owns: `test/daemon-events.test.ts`, `test/event-identity.test.ts`, `test/work-notify.test.ts`, `test/work-loop-binding.test.ts`, `test/agent-monitor.test.ts`, `test/commands-events.test.ts`, `test/events-open-with-pending-questions.test.ts`

Same rule as `05a-tests-notify`: every `NotifyEvent` literal gets its `type` and only its member's fields (`transition` for an agent state other than asking; `asking` with `askCount` / `gaveUp`; `message` without `oldState`; `closed`; `task` with task states and a `task` string). Where a test asserted on a composed event's shape (`toEqual` / `toMatchObject`), add the `type` the composer now produces. `test/events-open-with-pending-questions.test.ts` is Bryan-only to run: make it typecheck, DO NOT RUN IT.

Check: `bun check`. Tests: the first six files above.
