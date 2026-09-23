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

export function transitionEvent(overrides: Partial<TransitionEvent> = {}): TransitionEvent {
  return { ...eventBase, type: "transition", oldState: "working", newState: "done", ...overrides };
}

export function askingEvent(overrides: Partial<AskingEvent> = {}): AskingEvent {
  return { ...eventBase, type: "asking", oldState: "working", newState: "asking", askCount: 1, gaveUp: false, ...overrides };
}
