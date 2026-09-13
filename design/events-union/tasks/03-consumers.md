# 03-consumers

Owns: `src/notify/router.ts`, `src/notify/format.ts`, `src/notify/sinks.ts`, `src/commands/events.ts`, `src/agent/monitor.ts`, `src/seat/source.ts`, `src/seat/manager.ts`, `src/types/seat.ts`

Codes against the union in `design/events-union/PLAN.md` "Target shape" and the helpers in `src/notify/event.ts` (`isNotifyEvent`, `eventState`).

Do:
1. `src/notify/router.ts`: delete the local `eventState`; import it from `./event.ts`.
2. `src/notify/format.ts`: `notificationPayload` keeps its flat sink payload; `oldState` is `"oldState" in event ? event.oldState : null`. `notificationText`: the summary becomes a `switch (event.type)` with the `never` default: transition -> today's done / error / blocked branches on `event.newState`, else `task ?? "state changed"`; asking -> `event.task ?? "agent is asking"`; message -> `event.mail.text`; closed -> `"closed"`; task -> `event.task`. The details lines that read `task` / `lastError` narrow with `"task" in event` / `"lastError" in event`.
3. `src/notify/sinks.ts`: only if it reads a member-specific field; otherwise untouched.
4. `src/commands/events.ts`: delete the local `isNotifyEvent` and import it from `../notify/event.ts` where the transport uses it (or drop the check entirely if `04-bus-and-wire` hands you a typed event: read `subscribeEvents`' callback type after that slice lands and use whichever it is). `renderEvent`: `switch (event.type)`: message prints the mail text as today; asking prints `${oldState}->asking (asked Nx; gave up)` from `askCount` / `gaveUp` (both always present now); transition, closed and task print `${oldState}->${newState}`. `options.filter` compares against `event.newState`, which every member has. `cmdNotify`'s test event is a `transition`; the `--state` value must satisfy `isAgentState` (from `src/agent-state.ts`) and must not be `"asking"`, else `die` with the usage. `pendingQuestionEvent` returns the `asking` member with `askCount: 1`, `gaveUp: false`.
5. `src/agent/monitor.ts`: delete the local `isNotifyEvent` (same rule as step 4). `record` and `announce` read `newState` / `oldState`: `record` deletes on `newState === "exited"` and otherwise stores `event.newState`; `announce` needs `oldState`, so it acts only when `"oldState" in event`. `task ?? lastError` reads narrow with `in`.
6. `src/seat/source.ts` and `src/seat/manager.ts`, `src/types/seat.ts`: `PackTransition` stays the seat's own flat row (it is a view, not the event). `isTransition` becomes `isNotifyEvent` and `transitionName` / the fold take a `NotifyEvent`; the fold reads `newState` for the row state and narrows member-specific fields with `in`. If `PackTransition` needs no change, leave `types/seat.ts` untouched and say so.

Check: `bun check`. Tests: `test/notify-events-format.test.ts`, `test/commands-events.test.ts`, `test/agent-monitor.test.ts` (fixtures belong to `05a` / `05b`; a failure that is only a missing `type` on a fixture goes under CALLERS).
