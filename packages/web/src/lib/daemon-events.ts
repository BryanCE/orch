import { useSyncExternalStore } from "react";

export interface DaemonEvent {
  [key: string]: unknown;
}

type Listener = () => void;

/** Whether ORCHD is connected, as reported by the bridge — not whether this browser
 *  reached the web server. The two are independent, and only the first means live data. */
export interface DaemonLink {
  connected: boolean;
  endpoint: string;
  reason?: string;
}

/** One agent's latest transition. `count` only ever rises, so a card can pulse on a
 *  repeat of the same state — two `working` events are two transitions, not one. */
export interface AgentTransition {
  count: number;
  state: string;
}

type StreamSnapshot = {
  status: "connecting" | "open" | "closed";
  link: DaemonLink | null;
  events: DaemonEvent[];
  transitions: Record<string, AgentTransition>;
  version: number;
};

const MAX_EVENTS = 200;
const initialSnapshot: StreamSnapshot = { status: "closed", link: null, events: [], transitions: {}, version: 0 };

function withTransition(transitions: Record<string, AgentTransition>, event: DaemonEvent): Record<string, AgentTransition> {
  if (typeof event.key !== "string") return transitions;
  const previous = transitions[event.key];
  return {
    ...transitions,
    [event.key]: {
      count: (previous?.count ?? 0) + 1,
      state: typeof event.newState === "string" ? event.newState : previous?.state ?? "",
    },
  };
}
let snapshot = initialSnapshot;
let source: EventSource | undefined;
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener();
}

function setSnapshot(update: Partial<StreamSnapshot>): void {
  snapshot = { ...snapshot, ...update };
  notify();
}

function start(): void {
  if (typeof window === "undefined" || source) return;

  setSnapshot({ status: "connecting" });
  source = new EventSource("/api/events");
  source.onopen = () => setSnapshot({ status: "open" });
  source.onerror = () => setSnapshot({ status: "connecting" });
  source.addEventListener("daemon", (message) => {
    try {
      setSnapshot({ link: JSON.parse((message as MessageEvent<string>).data) as DaemonLink });
    } catch {
      // Ignore malformed server data. EventSource will remain connected.
    }
  });
  source.onmessage = (message) => {
    try {
      const event = JSON.parse(message.data) as DaemonEvent;
      setSnapshot({
        events: [...snapshot.events, event].slice(-MAX_EVENTS),
        transitions: withTransition(snapshot.transitions, event),
        version: snapshot.version + 1,
      });
    } catch {
      // Ignore malformed server data. EventSource will remain connected.
    }
  };
}

function stop(): void {
  source?.close();
  source = undefined;
  setSnapshot({ status: "closed" });
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  if (listeners.size === 1) start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}

const getSnapshot = () => snapshot;
const getServerSnapshot = () => initialSnapshot;

export function useDaemonEvents(): StreamSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
