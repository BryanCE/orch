// pi's live view of the fleet, for a pi session that is ORCHESTRATING one.
//
// A pi orchestrator otherwise learns nothing until it polls: a worker can sit
// blocked on a question for an hour and the only tell is someone running
// `orch status`. This subscribes ONCE to the daemon's event stream for the whole
// session and keeps a widget current, so a transition arrives instead of being
// discovered.
//
// The subscription is orch's transport (src/daemon/rpc.ts) and survives daemon
// restarts on its own. Nothing here is plexer-aware: the fleet view is built
// purely from the events, so no pane, tab or socket concept enters this file.
import type { HarnessApi, HarnessContext } from "./harness.ts";
import { subscribeEvents, type EventSubscription } from "../daemon/rpc.ts";
import type { NotifyEvent } from "../notify/format.ts";
import { isRecord, truncate } from "../util.ts";

/** Widget id; also the status-line key, so both clear together. */
const WIDGET_ID = "orch-fleet";

/** States worth interrupting the user for the moment they are entered. */
const ALERT_STATES = new Set(["blocked", "error", "aborted"]);

/** States that mean the agent is finished with its turn. */
const SETTLED_STATES = new Set(["done", "idle", "exited"]);

const TASK_WIDTH = 60;

/** One agent as the orchestrator currently understands it, from events alone. */
interface FleetAgent {
  name: string;
  state: string;
  task: string;
  ts: string;
}

function isNotifyEvent(value: unknown): value is NotifyEvent {
  return isRecord(value)
    && typeof value.key === "string"
    && typeof value.oldState === "string"
    && typeof value.newState === "string";
}

/** Short display name for an agent, falling back to its opaque key. */
function agentLabel(event: NotifyEvent): string {
  return event.agent ?? event.key;
}

function fleetLines(agents: Map<string, FleetAgent>): string[] {
  if (agents.size === 0) return [`${WIDGET_ID}: no live agents`];
  const width = Math.max(...[...agents.values()].map((agent) => agent.name.length));
  return [...agents.values()]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((agent) => `${agent.name.padEnd(width)}  ${agent.state.padEnd(8)}  ${agent.task}`);
}

/** Agents whose state should pull the user's attention right now. */
function alerting(agents: Map<string, FleetAgent>): FleetAgent[] {
  return [...agents.values()].filter((agent) => ALERT_STATES.has(agent.state));
}

function summaryLine(agents: Map<string, FleetAgent>): string {
  const blocked = alerting(agents).length;
  const working = [...agents.values()].filter((agent) => agent.state === "working").length;
  return `orch ${working} working${blocked ? `, ${blocked} needs you` : ""}`;
}

export interface FleetMonitor {
  /** Bind the monitor to a live session's UI and start streaming. */
  attach(context: HarnessContext): void;
  stop(): void;
}

/**
 * Build the fleet monitor. It streams immediately so no transition is missed
 * while the session is still starting; the UI binds when a context arrives.
 */
export function createFleetMonitor(orchDir: string): FleetMonitor {
  const agents = new Map<string, FleetAgent>();
  let context: HarnessContext | undefined;
  let subscription: EventSubscription | undefined;

  function render(): void {
    if (!context?.hasUI) return;
    context.ui.setWidget(WIDGET_ID, fleetLines(agents));
    context.ui.setStatus(WIDGET_ID, summaryLine(agents));
  }

  function record(event: NotifyEvent): void {
    if (SETTLED_STATES.has(event.newState) && event.newState === "exited") {
      agents.delete(event.key);
      return;
    }
    agents.set(event.key, {
      name: agentLabel(event),
      state: event.newState,
      task: truncate(event.task ?? event.lastError ?? "", TASK_WIDTH),
      ts: event.ts,
    });
  }

  // An alert is announced once, on the transition INTO the state — re-announcing
  // on every later event would make the notification worthless.
  function announce(event: NotifyEvent): void {
    if (!context?.hasUI || !ALERT_STATES.has(event.newState) || ALERT_STATES.has(event.oldState)) return;
    const detail = event.task ?? event.lastError ?? event.newState;
    context.ui.notify(`${agentLabel(event)}: ${truncate(detail, TASK_WIDTH)}`, event.newState === "blocked" ? "warning" : "error");
  }

  subscription = subscribeEvents(orchDir, { since: 0 }, (value) => {
    if (!isNotifyEvent(value)) return;
    record(value);
    announce(value);
    render();
  });

  return {
    attach(next: HarnessContext): void {
      context = next;
      render();
    },
    stop(): void {
      subscription?.close();
      subscription = undefined;
      if (context?.hasUI) {
        context.ui.setWidget(WIDGET_ID, undefined);
        context.ui.setStatus(WIDGET_ID, undefined);
      }
    },
  };
}

/** True when this pi session drives a fleet rather than being one of its workers.
 *  A worker is launched with an orch identity; an orchestrator never is. */
export function isOrchestratorSession(): boolean {
  return !process.env.ORCH_AGENT_KEY;
}

/** Wire the fleet monitor into a pi orchestrator session; a worker session gets nothing. */
export function registerFleetMonitor(harness: HarnessApi, orchDir: string): void {
  if (!isOrchestratorSession()) return;
  const monitor = createFleetMonitor(orchDir);
  harness.on("session_start", (_event, context) => {
    monitor.attach(context);
    return Promise.resolve();
  });
  harness.on("session_shutdown", () => {
    monitor.stop();
    return Promise.resolve();
  });
}
