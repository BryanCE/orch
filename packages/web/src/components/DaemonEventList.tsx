import type { DaemonEvent } from "@/lib/daemon-events";

function DaemonEventRow({ event }: { event: DaemonEvent }) {
  const name = typeof event.name === "string" && event.name.length > 0
    ? event.name
    : typeof event.agent === "string" && event.agent.length > 0
      ? event.agent
      : typeof event.key === "string" ? event.key : "Unknown agent";
  const type = typeof event.type === "string" ? event.type : "?";
  const oldState = typeof event.oldState === "string" ? event.oldState : undefined;
  const newState = typeof event.newState === "string" ? event.newState : "?";
  const timestamp = typeof event.ts === "string" ? event.ts : undefined;
  const displayTime = timestamp === undefined ? "Unknown time" : new Date(timestamp).toLocaleString();

  return (
    <details className="rounded-md border bg-muted/30">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-3">
        <span className="min-w-0 truncate text-sm font-medium">{name}</span>
        <span className="shrink-0 font-mono text-xs text-muted-foreground">
          <span className="mr-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">{type}</span>
          {oldState === undefined ? newState : `${oldState} → ${newState}`}
        </span>
        <time className="shrink-0 text-xs text-muted-foreground" dateTime={timestamp}>{displayTime}</time>
      </summary>
      <pre className="overflow-x-auto border-t p-3 font-mono text-xs">{JSON.stringify(event, null, 2)}</pre>
    </details>
  );
}

export function DaemonEventList({ events }: { events: DaemonEvent[] }) {
  return (
    <div className="space-y-2">
      {[...events].reverse().map((event, index) => (
        <DaemonEventRow key={`${index}-${JSON.stringify(event)}`} event={event} />
      ))}
    </div>
  );
}
