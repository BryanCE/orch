# 05a-tests-notify

Model: `luna:low`.

Owns: `test/notify.test.ts`, `test/notify-router.test.ts`, `test/notify-sinks.test.ts`, `test/notify-events-format.test.ts`, `test/notifier-adapters.test.ts`, `test/herdr-notify-hardening.test.ts`

Every `NotifyEvent` literal in these files gets the member shape from `design/events-union/PLAN.md` "Target shape": add `type: "transition"` to an event whose `newState` is an agent state other than `"asking"`; `type: "asking"` plus `askCount: 1, gaveUp: false` where `newState` is `"asking"`; `type: "message"` (drop `oldState`, keep `dispatchId` and `mail`) where `newState` is `"message"`. A fixture whose `newState` is not one of those and not `"closed"` or a task state was never a real event: change it to the nearest real state and keep the assertion's meaning. Assertions that compared a rendered `oldState->newState` string stay as they are unless the member has no `oldState`.

Check: `bun check`. Tests: the six files above.
