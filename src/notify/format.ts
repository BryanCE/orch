// Leaf module: the canonical notification formatter. It imports no notify module,
// so the sink builtins can format without re-entering the router that composes them.
import { workspaceOf } from "../policy/workspace.ts";
import { errorMessage } from "../util.ts";

export interface NotifyEvent {
  host?: string;
  key: string;
  /** Origin workspace; derived from key when omitted. */
  workspace?: string;
  /** Human-assigned agent name. */
  agent: string | null;
  tab: string | null;
  /** Model id plus thinking level, e.g. terra:medium. */
  model: string | null;
  oldState: string;
  newState: string;
  task?: string;
  cost?: number;
  ts: string;
  lastError?: string;
};

export function oneLine(error: unknown): string {
  return errorMessage(error).replace(/\s+/g, " ").trim();
}

const WORKSPACE_COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#9333ea", "#0891b2", "#db2777", "#4f46e5"] as const;
const WORKSPACE_ANSI = [34, 32, 33, 31, 35, 36, 35, 34] as const;

/** Stable palette color for a workspace. */
export function workspaceColor(workspace: string): string {
  let hash = 2166136261;
  for (let index = 0; index < workspace.length; index++) {
    hash ^= workspace.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return WORKSPACE_COLORS[(hash >>> 0) % WORKSPACE_COLORS.length]!;
}

function workspaceAnsi(workspace: string): string {
  let hash = 2166136261;
  for (let index = 0; index < workspace.length; index++) {
    hash ^= workspace.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `\u001b[${WORKSPACE_ANSI[(hash >>> 0) % WORKSPACE_ANSI.length]!}m`;
}

export function workspaceLabelForKey(key: string): string {
  const keyWorkspace = key.includes(":") ? key.split(":", 1)[0] : undefined;
  // A bare pane id is not a useful human-facing workspace label. Other
  // unscoped keys (for example task-1) are already caller-provided labels.
  const barePane = /^p[0-9A-Za-z]+$/.test(key);
  return workspaceOf(key) ?? keyWorkspace ?? (barePane ? "workspace" : key || "workspace");
}

function eventWorkspace(event: NotifyEvent): string {
  return event.workspace ?? workspaceLabelForKey(event.key);
}

/** Harness-neutral label used when presence has no human-assigned name. */
export function abstractAgentLabel(workspace: string, key: string): string {
  const shortId = key.includes(":") ? key.slice(key.lastIndexOf(":") + 1) : key;
  return `${workspace}/agent-${shortId}`;
}

function eventAgent(event: NotifyEvent, workspace: string): string {
  const agent = event.agent?.trim();
  const fallback = abstractAgentLabel(workspace, event.key);
  return [agent, fallback].find((value) => value !== undefined && value.length > 0) ?? fallback;
}

/** Structured form of the canonical notification text and event metadata. */
interface NotificationPayload {
  title: string;
  body: string;
  workspace: string;
  workspaceColor: string;
  host: string | null;
  key: string;
  agent: string | null;
  tab: string | null;
  model: string | null;
  oldState: string;
  newState: string;
  task: string | null;
  cost: number | null;
  ts: string;
  lastError: string | null;
};

/** Build the canonical structured payload consumed by non-text sinks. */
function notificationPayload(event: NotifyEvent): NotificationPayload {
  const workspace = eventWorkspace(event);
  const { title, body } = notificationText(event);
  return {
    title,
    body,
    workspace,
    workspaceColor: workspaceColor(workspace),
    host: event.host ?? null,
    key: event.key,
    agent: eventAgent(event, workspace),
    tab: event.tab,
    model: event.model,
    oldState: event.oldState,
    newState: event.newState,
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
  const workspace = eventWorkspace(event);
  const agent = eventAgent(event, workspace);
  const color = workspaceColor(workspace);
  const state = oneLine(event.newState || "unknown").toUpperCase();
  let summary = event.task ?? "state changed";
  if (event.newState === "error") summary = event.lastError ?? event.task ?? "agent error";
  else if (event.newState === "blocked") summary = event.task ?? "agent needs input";
  summary = oneLine(summary).replace(/^Q:\s*/i, "").slice(0, 60);
  const workspaceLabel = `[${workspace}]`;
  const coloredWorkspace = options.colorize ? `${workspaceAnsi(workspace)}${workspaceLabel}\u001b[0m` : workspaceLabel;
  const title = `${state} ${coloredWorkspace} ${agent}: ${summary}`;
  const details: string[] = [title, `Workspace: ${workspace} (${color})`];
  if (event.tab) details.push(`Tab: ${event.tab}`);
  if (event.model) details.push(`Model: ${event.model}`);
  if (event.task && event.newState !== "blocked") details.push(`Task: ${oneLine(event.task)}`);
  if (event.lastError && event.newState !== "error") details.push(`Error: ${oneLine(event.lastError)}`);
  if (typeof event.cost === "number") details.push(`Cost: $${event.cost.toFixed(2)}`);
  return { title, body: details.join("\n") };
}
