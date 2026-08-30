// The in-session view of a fleet, for a harness session that is ORCHESTRATING one.
//
// An orchestrator otherwise learns nothing until it polls: a worker can sit
// blocked on a question for an hour and the only tell is someone running
// `orch status`. This subscribes ONCE to the daemon's event stream for the whole
// session and keeps a read model current, so a transition arrives instead of
// being discovered.
//
// WHO sees it is identity, never environment: the model only surfaces agents
// whose events say THIS session spawned them (`spawnedBy` == our presence key).
// A pi session that never spawned anything — someone's personal pi in another
// terminal — has an empty model and gets NO status line, no widget, nothing.
// "Not a worker" was never evidence of being an orchestrator.
//
// The subscription is orch's transport (src/daemon/rpc.ts) and survives daemon
// restarts on its own. Nothing here is plexer-aware: the view is built purely
// from the events, so no pane, tab or socket concept enters this file.
import { subscribeEvents } from "../daemon/rpc.ts";
import { callerKind } from "../policy/caller.ts";
import { isRecord, truncate } from "../util.ts";
import type { FleetAgentRow, FleetMonitor, FleetMonitorOptions, FleetReadModel, HarnessApi, HarnessContext } from "../types/agent.ts";
import type { EventSubscription } from "../types/daemon.ts";
import type { NotifyEvent } from "../types/notify.ts";

/** Status-line key; one writer, cleared by the same key. */
const STATUS_ID = "orch-fleet";

/** States worth interrupting the user for the moment they are entered. */
const ALERT_STATES = new Set(["blocked", "error", "aborted"]);

const TASK_WIDTH = 60;

function countFleetStates(agents: readonly FleetAgentRow[]): { working: number; blocked: number; done: number; failed: number } {
  let working = 0, blocked = 0, done = 0, failed = 0;
  for (const agent of agents) {
    if (agent.state === "working") working += 1;
    else if (agent.state === "blocked" || agent.state === "asking") blocked += 1;
    else if (agent.state === "error" || agent.state === "aborted") failed += 1;
    else if (agent.state === "done" || agent.state === "idle") done += 1;
  }
  return { working, blocked, done, failed };
}

function plainStatus(_context: HarnessContext, agents: readonly FleetAgentRow[]): string {
  const counts = countFleetStates(agents);
  const parts: string[] = [];
  if (counts.working) parts.push(`${counts.working} working`);
  if (counts.blocked) parts.push(`${counts.blocked} blocked`);
  if (counts.failed) parts.push(`${counts.failed} failed`);
  if (counts.done) parts.push(`${counts.done} done`);
  return `orch: ${parts.join(" · ")} — /fleet to view`;
}

function isNotifyEvent(value: unknown): value is NotifyEvent {
  return isRecord(value)
    && typeof value.key === "string"
    && typeof value.oldState === "string"
    && typeof value.newState === "string";
}

/** Short display name for an agent, falling back to its opaque key. */
function agentLabel(event: NotifyEvent): string {
  return event.name ?? event.agent ?? event.key;
}

/**
 * Build the fleet monitor. It streams immediately so no transition is missed
 * while the session is still starting; the UI binds when a context arrives.
 * Every event is kept, but only the session's OWN fleet is ever surfaced.
 */
export function createFleetMonitor(orchDir: string, options: FleetMonitorOptions): FleetMonitor {
  const seen = new Map<string, { row: FleetAgentRow; spawnedBy: string | undefined }>();
  const listeners = new Set<() => void>();
  let context: HarnessContext | undefined;
  let key: string | undefined;
  let subscription: EventSubscription | undefined;
  const renderStatus = options.renderStatus ?? plainStatus;

  function ownAgents(): FleetAgentRow[] {
    if (!key) return [];
    return [...seen.values()]
      .filter((entry) => entry.spawnedBy === key)
      .map((entry) => entry.row)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  const model: FleetReadModel = {
    list: () => ownAgents(),
    size: () => ownAgents().length,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  function render(): void {
    if (!context?.hasUI) return;
    const agents = ownAgents();
    // An empty fleet renders as NOTHING: no status line, no reminder that orch
    // exists. This is what keeps an unrelated session's screen untouched.
    context.ui.setStatus(STATUS_ID, agents.length === 0 ? undefined : renderStatus(context, agents));
  }

  function record(event: NotifyEvent): void {
    if (event.newState === "exited") {
      seen.delete(event.key);
      return;
    }
    seen.set(event.key, {
      spawnedBy: event.spawnedBy,
      row: {
        key: event.key,
        name: agentLabel(event),
        state: event.newState,
        model: event.model ?? null,
        task: truncate(event.task ?? event.lastError ?? "", TASK_WIDTH),
        cost: event.cost,
        ts: event.ts,
      },
    });
  }

  function isOwn(event: NotifyEvent): boolean {
    return key !== undefined && event.spawnedBy === key;
  }

  // An alert is announced once, on the transition INTO the state — re-announcing
  // on every later event would make the notification worthless.
  function announce(event: NotifyEvent): void {
    if (!context?.hasUI || !isOwn(event)) return;
    if (!ALERT_STATES.has(event.newState) || ALERT_STATES.has(event.oldState)) return;
    const detail = event.task ?? event.lastError ?? event.newState;
    context.ui.notify(`${agentLabel(event)}: ${truncate(detail, TASK_WIDTH)}`, event.newState === "blocked" ? "warning" : "error");
  }

  // Live-only on initial connection: a plain pi session must not replay durable history.
  // Reconnects still resume from the last delivered sequence inside subscribeEvents.
  const onEvent = (value: unknown): void => {
    if (!isNotifyEvent(value)) return;
    record(value);
    announce(value);
    render();
    if (isOwn(value)) for (const listener of listeners) listener();
  };
  subscription = options.subscribe
    ? options.subscribe(orchDir, {}, onEvent)
    : subscribeEvents(orchDir, {}, onEvent, undefined, true);

  return {
    model,
    attach(next: HarnessContext): void {
      context = next;
      key = options.ownKey(next);
      render();
    },
    stop(): void {
      subscription?.close();
      subscription = undefined;
      if (context?.hasUI) context.ui.setStatus(STATUS_ID, undefined);
    },
  };
}

/** Wire the fleet monitor into an orchestrating session; a spawned worker gets nothing. */
export function registerFleetMonitor(
  harness: HarnessApi,
  orchDir: string,
  options: FleetMonitorOptions,
): FleetReadModel | undefined {
  if (callerKind() === "agent") return undefined;
  const monitor = createFleetMonitor(orchDir, options);
  harness.on("session_start", (_event, context) => {
    monitor.attach(context);
    return Promise.resolve();
  });
  harness.on("session_shutdown", () => {
    monitor.stop();
    return Promise.resolve();
  });
  return monitor.model;
}
