# Events union: build plan

Delegator's document. Workers never read this; they read `WORKER.md` plus one task file.

Background: `design/pi-code-patterns.md` section 5. `NotifyEvent` (`src/types/notify.ts`) is one interface with about 25 mostly-optional fields, and `oldState` / `newState` are bare strings. So the type cannot say which fields go together (`mail` only on a message, `askCount` only on a question, `lastText` only when done), and no switch on a state can be exhaustive. Server fan-out is a `Set<Socket>` loop in a closure, and the client invokes subscribers with no containment, so one throwing subscriber breaks the socket handler for every other subscriber.

## Target shape

```ts
// src/types/notify.ts
import type { AgentState } from "../agent-state.ts";
import type { TaskRec } from "./store.ts";          // wherever TaskRec lives; TaskState = TaskRec["state"]

/** What every event says about who it is about. */
export interface EventIdentity {
  readonly key: string;
  readonly ts: string;
  /** Stamped once by the daemon as the event is published; `(key, seq)` is the event's identity. */
  readonly seq?: number;
  readonly agent: string | null;
  readonly name?: string | null;
  readonly space?: string;
  readonly tab: string | null;
  readonly model: string | null;
  readonly host?: string;
  readonly spawnedBy?: string;
  readonly spawnedByLabel?: string;
}

/** What a live agent reports about its run; present on transition and asking events only. */
export interface AgentActivity {
  readonly dispatchId?: string;
  readonly task?: string;
  readonly cost?: number;
  readonly lastError?: string;
  readonly lastText?: string;
  readonly reason?: string;
  readonly ctxPercent?: number;
  readonly tokens?: { readonly input?: number; readonly output?: number; readonly cacheRead?: number; readonly cacheWrite?: number };
  readonly filesTouched?: readonly string[];
  readonly capacity?: { readonly packUsed: number; readonly packCap: number };
}

export type TaskState = TaskRec["state"];

export type NotifyEvent =
  | (EventIdentity & AgentActivity & { readonly type: "transition"; readonly oldState: AgentState; readonly newState: Exclude<AgentState, "asking"> })
  | (EventIdentity & AgentActivity & { readonly type: "asking"; readonly oldState: AgentState; readonly newState: "asking"; readonly askCount: number; readonly gaveUp: boolean })
  | (EventIdentity & { readonly type: "message"; readonly newState: "message"; readonly dispatchId: string; readonly mail: { readonly id: string; readonly text: string } })
  | (EventIdentity & { readonly type: "closed"; readonly oldState: AgentState; readonly newState: "closed" })
  | (EventIdentity & { readonly type: "task"; readonly oldState: TaskState; readonly newState: TaskState; readonly task: string; readonly lastError?: string });

// src/notify/event.ts (new): the one schema, guard and state reader
export const notifyEventSchema: z.ZodType<NotifyEvent>;      // z.discriminatedUnion("type", [...])
export function isNotifyEvent(value: unknown): value is NotifyEvent;   // schema.safeParse
/** The agent state an event lands an agent in, or undefined for events that are not about an agent's state. */
export function eventState(event: NotifyEvent): AgentState | undefined;  // transition | asking -> newState; message | closed | task -> undefined

// src/daemon/event-bus.ts (new)
export interface EventBus {
  emit(event: NotifyEvent): void;
  /** Never registers the handler bare: a throwing subscriber is logged and cannot take the emitter or the others down. Returns unsubscribe. */
  on(handler: (event: NotifyEvent) => void): () => void;
}
export function createEventBus(logger: Logger): EventBus;
```

Rules the shape encodes. Every member has `newState`, literal-typed, so a display that only needs a state reads it without a switch. `oldState` exists on every member but message. Fields that only mean something on one member live on that member. A consumer that needs member-specific fields switches on `type` with a `never` default. The discriminant is `type`, the same word the RPC lines use; never a second spelling.

Wire. The daemon's `event` line carries a `NotifyEvent`; `wire.ts` parses it with `notifyEventSchema`, so subscribers receive the typed union and the two hand-rolled `isNotifyEvent` guards (commands/events.ts, agent/monitor.ts) are deleted. The bridge's `notify` RPC (a `BridgeNotification`) is a separate, flatter wire shape from a harness; its `oldState` / `newState` become `AgentState` and the daemon composes the event from it as it does today.

## Waves

| Wave | Tasks | Mode | Tree red until | Commit after |
|---|---|---|---|---|
| 1 shape | `01-event-type` | alone (small; everything else codes against it) | `05b-tests-daemon` | no |
| 2 producers, consumers, transport, tests | `02-daemon-producers`, `03-consumers`, `04-bus-and-wire`, `05a-tests-notify` (`luna:low`), `05b-tests-daemon` (`luna:low`), `06-web` (`luna:low`) | parallel (6, two tabs) after `01` lands | `05b-tests-daemon` | yes |

## Dispatch commands

```
cat design/events-union/WORKER.md design/events-union/tasks/<id>.md | orch dispatch <agent> --file -
```

`--model openai-codex/gpt-5.6-luna:low` for `05a`, `05b`, `06`; every other task on the agent's pinned `luna:high`.

## Commit point

Green whole-tree `bun check` and green touched tests after `05b-tests-daemon`. Suggested message: `Events are a discriminated union on type; one schema, one guard, an event bus with per-handler containment`.
