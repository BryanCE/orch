import { z } from "zod";
import { AGENT_STATES, type AgentState } from "../agent-state.ts";
import { TASK_STATES } from "../types/queue.ts";
import type { NotifyEvent } from "../types/notify.ts";

const identity = {
  key: z.string(),
  ts: z.string(),
  seq: z.number().optional(),
  agent: z.string().nullable(),
  name: z.string().nullable().optional(),
  space: z.string().optional(),
  tab: z.string().nullable(),
  model: z.string().nullable(),
  host: z.string().optional(),
  spawnedBy: z.string().optional(),
  holder: z.string().optional(),
  spawnedByLabel: z.string().optional(),
};

const activity = {
  dispatchId: z.string().optional(),
  task: z.string().optional(),
  cost: z.number().optional(),
  lastError: z.string().optional(),
  lastText: z.string().optional(),
  reason: z.string().optional(),
  ctxPercent: z.number().optional(),
  tokens: z.object({
    input: z.number().optional(),
    output: z.number().optional(),
    cacheRead: z.number().optional(),
    cacheWrite: z.number().optional(),
  }).optional(),
  filesTouched: z.array(z.string()).readonly().optional(),
};

const transitionState = z.enum(AGENT_STATES).refine(
  (state): state is Exclude<AgentState, "asking"> => state !== "asking",
);

export const notifyEventSchema = z.discriminatedUnion("type", [
  z.object({
    ...identity,
    ...activity,
    type: z.literal("transition"),
    oldState: z.enum(AGENT_STATES),
    newState: transitionState,
  }),
  z.object({
    ...identity,
    ...activity,
    type: z.literal("asking"),
    oldState: z.enum(AGENT_STATES),
    newState: z.literal("asking"),
    askCount: z.number(),
    gaveUp: z.boolean(),
  }),
  z.object({
    ...identity,
    type: z.literal("message"),
    newState: z.literal("message"),
    dispatchId: z.string(),
    mail: z.object({ id: z.string(), text: z.string() }),
  }),
  z.object({
    ...identity,
    type: z.literal("closed"),
    oldState: z.enum(AGENT_STATES),
    newState: z.literal("closed"),
  }),
  z.object({
    ...identity,
    type: z.literal("task"),
    oldState: z.enum(TASK_STATES),
    newState: z.enum(TASK_STATES),
    task: z.string(),
    lastError: z.string().optional(),
  }),
]) satisfies z.ZodType<NotifyEvent>;

export function isNotifyEvent(value: unknown): value is NotifyEvent {
  return notifyEventSchema.safeParse(value).success;
}

export function eventState(event: NotifyEvent): AgentState | undefined {
  switch (event.type) {
    case "transition":
    case "asking":
      return event.newState;
    case "message":
    case "closed":
    case "task":
      return undefined;
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}
