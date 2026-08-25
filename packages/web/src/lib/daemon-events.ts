import { useSyncExternalStore } from "react";

export interface DaemonEvent {
  [key: string]: unknown;
}

type Listener = () => void;

type StreamSnapshot = {
  status: "connecting" | "open" | "closed";
  events: DaemonEvent[];
  version: number;
};

const MAX_EVENTS = 200;
const initialSnapshot: StreamSnapshot = { status: "closed", events: [], version: 0 };
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
  source.onmessage = (message) => {
    try {
      const event = JSON.parse(message.data) as DaemonEvent;
      setSnapshot({
        events: [...snapshot.events, event].slice(-MAX_EVENTS),
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
