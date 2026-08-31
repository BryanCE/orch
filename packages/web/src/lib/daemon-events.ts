import { useSyncExternalStore } from "react";
import { isRecord } from "@orch/util.ts";

/** One event as the daemon sent it. Deliberately open: the web renders what it
 *  recognises and carries the rest through, so a new field on the daemon side
 *  does not need a matching edit here before it can be displayed. */
export type DaemonEvent = Record<string, unknown>;

type Listener = () => void;

/** Whether ORCHD is connected, as reported by the bridge — not whether this browser
 *  reached the web server. The two are independent, and only the first means live data. */
interface DaemonLink {
  connected: boolean;
  endpoint: string;
  reason?: string;
}

/** One agent's latest transition. `count` only ever rises, so a card can pulse on a
 *  repeat of the same state — two `working` events are two transitions, not one. */
interface AgentTransition {
  count: number;
  state: string;
}

interface StreamSnapshot {
  status: "connecting" | "open" | "closed";
  link: DaemonLink | null;
  events: DaemonEvent[];
  transitions: Record<string, AgentTransition>;
  version: number;
}

const MAX_EVENTS = 200;

/** Server-sent data is a string that claims to be JSON; nothing guarantees its
 *  shape. Both parsers below verify rather than assert, so a malformed frame is
 *  dropped instead of poisoning the store with a value of the wrong type. */
function parseObject(payload: string): Record<string, unknown> | null {
  let value: unknown;
  try {
    value = JSON.parse(payload);
  } catch {
    return null;
  }
  // `isRecord` is orch's own guard (src/util.ts) rather than a second copy of
  // the same three checks living in the web package.
  return isRecord(value) ? value : null;
}

function parseDaemonEvent(payload: string): DaemonEvent | null {
  return parseObject(payload);
}

function parseDaemonLink(payload: string): DaemonLink | null {
  const record = parseObject(payload);
  if (record === null) return null;
  const { connected, endpoint, reason } = record;
  if (typeof connected !== "boolean" || typeof endpoint !== "string") return null;
  return typeof reason === "string" ? { connected, endpoint, reason } : { connected, endpoint };
}
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
    const payload: unknown = message.data;
    if (typeof payload !== "string") return;
    const link = parseDaemonLink(payload);
    // A malformed frame leaves the last known link standing: EventSource stays
    // connected, and reporting "no daemon" on one bad frame would be a lie.
    if (link !== null) setSnapshot({ link });
  });
  source.onmessage = (message) => {
    // `MessageEvent.data` is typed `any` by the DOM lib; narrow it to a string
    // before parsing rather than trusting the declaration.
    const payload: unknown = message.data;
    if (typeof payload !== "string") return;
    const event = parseDaemonEvent(payload);
    if (event === null) return;
    setSnapshot({
      events: [...snapshot.events, event].slice(-MAX_EVENTS),
      transitions: withTransition(snapshot.transitions, event),
      version: snapshot.version + 1,
    });
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
