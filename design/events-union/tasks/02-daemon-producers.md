# 02-daemon-producers

Owns: `src/daemon/events.ts`, `src/daemon/orchd.ts`, `src/daemon/work-loop.ts`

Codes against the union in `design/events-union/PLAN.md` "Target shape". Every event object built in these files gets its `type` and only the fields its member carries.

Do:
1. `src/daemon/events.ts`, `composeAgentEvent`: when `transition.state === "asking"` return the `asking` member (`type: "asking"`, `newState: "asking"`, `askCount`, `gaveUp: boolean`); otherwise the `transition` member. `askCount` and `gaveUp` are set today by the daemon's re-ask logic (find where `askCount` is assigned in this directory; carry the same values; when the composer is called for a first ask, `askCount` is 1 and `gaveUp` is false). `runRecordForTransition` and `TERMINAL_STATES` read `event.newState`: narrow with `switch (event.type)` or `eventState(event)` from `src/notify/event.ts` so a message, closed or task event never reaches the run-record path.
2. `src/daemon/orchd.ts`: `sessionMessageEvent` returns the `message` member (`type: "message"`, `newState: "message"`, `dispatchId: id`, `mail`; no `oldState`). The closed event returns the `closed` member (`type: "closed"`, `oldState`, `newState: "closed"`). The `notify` RPC handler (typed `ParamsOf<"notify">`, a `BridgeNotification` whose states are now `AgentState`) composes the `asking` member when `newState === "asking"` (askCount 1, gaveUp false) and the `transition` member otherwise. The `onEvent` callbacks that call `paintPane` read `event.newState`, which every member has; keep them.
3. `src/daemon/work-loop.ts`, `taskEvent`: returns the `task` member; its `oldState` / `newState` parameters become `TaskState`, and its callers pass `task.state` / `settled.state` etc. unchanged (they are already task states).

Check: `bun check`. Tests: `test/daemon-events.test.ts`, `test/work-loop-binding.test.ts`, `test/work-notify.test.ts` (fixtures in those files belong to `05b-tests-daemon`; if a test fails only because a fixture lacks `type`, say so under CALLERS and move on).
