# 01-event-type

Owns: `src/types/notify.ts`, `src/notify/event.ts` (new), `src/types/agent.ts`, `src/daemon/rpc/protocol.ts`, `test/notify-event.test.ts` (new)

Do:
1. `src/types/notify.ts`: replace the `NotifyEvent` interface with exactly the shape in `design/events-union/PLAN.md` "Target shape": `EventIdentity`, `AgentActivity`, `TaskState`, and the five-member `NotifyEvent` union discriminated on `type`. `AgentState` comes from `src/agent-state.ts`; `TaskState` is derived as `TaskRec["state"]` from wherever `TaskRec` is declared (grep `interface TaskRec` under `src/types/`). Leave `NotifierConfigField`, `NotifierMetadata`, `Notifier`, `NotifierChoice`, `NotificationIo` as they are.
2. New `src/notify/event.ts`:
   - `notifyEventSchema`: `z.discriminatedUnion("type", [...])` with one `z.object` per member, `satisfies z.ZodType<NotifyEvent>`. Identity fields shared through one `identity` object spread into each member; activity fields through one `activity` object. `oldState` / `newState` on transition, asking and closed are `z.enum(AGENT_STATES)` (transition's `newState` excludes `"asking"`: build it as `z.enum(AGENT_STATES).refine((s) => s !== "asking")` or list the literals from `AGENT_STATES.filter`), message's `newState` is `z.literal("message")`, closed's is `z.literal("closed")`, task's old/new are the task-state enum (derive from the same source `TaskState` comes from; if it is only a type, list the literals in one `TASK_STATES` tuple next to `TaskRec` and export it from there, owned by this task as a one-line addition to that types file: say so in FILES).
   - `export function isNotifyEvent(value: unknown): value is NotifyEvent { return notifyEventSchema.safeParse(value).success; }`
   - `export function eventState(event: NotifyEvent): AgentState | undefined`: `switch (event.type)` returning `event.newState` for transition and asking, `undefined` for message, closed and task, with the `never` default.
3. `src/types/agent.ts`: `BridgeNotification.oldState` and `.newState` become `AgentState`.
4. `src/daemon/rpc/protocol.ts`: in `notifyParams`, `oldState: z.enum(AGENT_STATES)` and `newState: z.enum(AGENT_STATES)` (import from `../../agent-state.ts`).
5. `test/notify-event.test.ts`: one fixture per member accepted by `isNotifyEvent`; rejected: a transition whose `newState` is `"asking"`, an asking event without `askCount`, a message without `mail`, an object with `type: "other"`, and an object with no `type`; `eventState` returns the state for transition and asking and `undefined` for the other three.

Check: `bun check` (expect every other slice red on the old shape; your five files clean). Tests: `test/notify-event.test.ts`.
