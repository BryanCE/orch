import type { DaemonEvent } from "@/lib/daemon-events";

function DaemonEventRow({ event }: { event: DaemonEvent }) {
  return (
    <pre className="overflow-x-auto rounded-md border bg-muted/30 p-3 font-mono text-xs">
      {JSON.stringify(event, null, 2)}
    </pre>
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
