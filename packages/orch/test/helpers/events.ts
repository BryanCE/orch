import type { TaskState } from "../../src/types/queue.ts";
import type { AgentState } from "../../src/agent-state.ts";
import type { EventIdentity, NotifyEvent } from "../../src/types/notify.ts";

export const eventBase: EventIdentity = {
  key: "agent-1",
  ts: "2026-01-01T00:00:00.000Z",
  agent: "pi",
  tab: null,
  model: null,
};

type TransitionEvent = Extract<NotifyEvent, { type: "transition" }>;
type AskingEvent = Extract<NotifyEvent, { type: "asking" }>;
type MessageEvent = Extract<NotifyEvent, { type: "message" }>;
type ClosedEvent = Extract<NotifyEvent, { type: "closed" }>;
type TaskEvent = Extract<NotifyEvent, { type: "task" }>;

export function transitionEvent(overrides: Partial<TransitionEvent> = {}): TransitionEvent {
  return { ...eventBase, type: "transition", oldState: "working", newState: "done", ...overrides };
}

export function askingEvent(overrides: Partial<AskingEvent> = {}): AskingEvent {
  return { ...eventBase, type: "asking", oldState: "working", newState: "asking", askCount: 1, gaveUp: false, ...overrides };
}

export function messageEvent(overrides: Partial<MessageEvent> = {}): MessageEvent {
  return { ...eventBase, type: "message", newState: "message", dispatchId: "dispatch-1", mail: { id: "mail-1", text: "message" }, ...overrides };
}

export function closedEvent(overrides: Partial<ClosedEvent> = {}): ClosedEvent {
  return { ...eventBase, type: "closed", oldState: "working", newState: "closed", ...overrides };
}

export function taskEvent(overrides: Partial<TaskEvent> = {}): TaskEvent {
  return { ...eventBase, type: "task", oldState: "queued", newState: "claimed", task: "task", ...overrides };
}
