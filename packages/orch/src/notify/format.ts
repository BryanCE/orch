// Leaf module: the canonical notification formatter. It imports no notify module,
// so the sink builtins can format without re-entering the router that composes them.
import { errorMessage, textValue } from "../util.ts";
import type { NotifyEvent } from "../types/notify.ts";

export function oneLine(error: unknown): string {
  return errorMessage(error).replace(/\s+/g, " ").trim();
}

const SPACE_COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#9333ea", "#0891b2", "#db2777", "#4f46e5"] as const;
const SPACE_ANSI = [34, 32, 33, 31, 35, 36, 35, 34] as const;

/** Stable palette color for a space. */
export function spaceColor(space: string): string {
  let hash = 2166136261;
  for (let index = 0; index < space.length; index++) {
    hash ^= space.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return SPACE_COLORS[(hash >>> 0) % SPACE_COLORS.length]!;
}

function spaceAnsi(space: string): string {
  let hash = 2166136261;
  for (let index = 0; index < space.length; index++) {
    hash ^= space.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `\u001b[${SPACE_ANSI[(hash >>> 0) % SPACE_ANSI.length]!}m`;
}

export function spaceLabelForKey(_key: string): string {
  return "space";
}

function eventSpace(event: NotifyEvent): string {
  return event.space ?? spaceLabelForKey(event.key);
}

/** Harness-neutral label used when presence has no human-assigned name. */
export function abstractAgentLabel(space: string, key: string): string {
  const shortId = key.includes(":") ? key.slice(key.lastIndexOf(":") + 1) : key;
  return `${space}/agent-${shortId}`;
}

function eventAgent(event: NotifyEvent, space: string): string {
  const name = event.name?.trim();
  const agent = event.agent?.trim();
  const fallback = abstractAgentLabel(space, event.key);
  return [name, agent, fallback].find((value) => value !== undefined && value.length > 0) ?? fallback;
}

/** Structured form of the canonical notification text and event metadata. */
interface NotificationPayload {
  title: string;
  body: string;
  space: string;
  spaceColor: string;
  host: string | null;
  key: string;
  agent: string | null;
  /** Human/registry display name. */
  name: string | null;
  tab: string | null;
  model: string | null;
  oldState: string;
  newState: string;
  /** Transition ordinal for this agent; `(key, seq)` identifies the event. */
  seq: number | null;
  task: string | null;
  cost: number | null;
  ts: string;
  lastError: string | null;
};

/** Build the canonical structured payload consumed by non-text sinks. */
function notificationPayload(event: NotifyEvent): NotificationPayload {
  const space = eventSpace(event);
  const { title, body } = notificationText(event);
  return {
    title,
    body,
    space,
    spaceColor: spaceColor(space),
    host: event.host ?? null,
    key: event.key,
    agent: eventAgent(event, space),
    name: event.name ?? null,
    tab: event.tab,
    model: event.model,
    oldState: event.oldState,
    newState: event.newState,
    seq: event.seq ?? null,
    task: event.task ?? null,
    cost: event.cost ?? null,
    ts: event.ts,
    lastError: event.lastError ?? null,
  };
}

export function payload(event: NotifyEvent): string {
  return JSON.stringify(notificationPayload(event));
}

export function notificationText(event: NotifyEvent, options: { colorize?: boolean } = {}): { title: string; body: string } {
  const space = eventSpace(event);
  const agent = eventAgent(event, space);
  const color = spaceColor(space);
  const state = oneLine(textValue(event.newState) ?? "unknown").toUpperCase();
  let summary = event.task ?? "state changed";
  // A finished agent is summarized by what it REPORTED, not by what it was asked. An
  // empty lastText is no report at all, so it falls through to the task rather than
  // rendering a blank line — `textValue` says "absent or blank" where `||` only implied it.
  if (event.newState === "done") summary = textValue(event.lastText) ?? textValue(event.task) ?? "state changed";
  else if (event.newState === "error") summary = event.lastError ?? event.task ?? "agent error";
  else if (event.newState === "blocked") summary = event.task ?? "agent needs input";
  summary = oneLine(summary).replace(/^Q:\s*/i, "").slice(0, 60);
  const spaceLabel = `[${space}]`;
  const coloredSpace = options.colorize ? `${spaceAnsi(space)}${spaceLabel}\u001b[0m` : spaceLabel;
  const title = `${state} ${coloredSpace} ${agent}: ${summary}`;
  const details: string[] = [title, `Space: ${space} (${color})`];
  if (event.tab) details.push(`Tab: ${event.tab}`);
  if (event.model) details.push(`Model: ${event.model}`);
  if (event.task && event.newState !== "blocked") details.push(`Task: ${oneLine(event.task)}`);
  if (event.lastError && event.newState !== "error") details.push(`Error: ${oneLine(event.lastError)}`);
  if (typeof event.cost === "number") details.push(`Cost: $${event.cost.toFixed(2)}`);
  return { title, body: details.join("\n") };
}
