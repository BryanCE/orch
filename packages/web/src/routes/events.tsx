import { createFileRoute } from "@tanstack/react-router";
import { Activity, Radio } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DaemonEventList } from "@/components/DaemonEventList";
import { useDaemonEvents } from "@/lib/daemon-events";

export const Route = createFileRoute("/events")({
  staticData: { crumbs: () => [{ label: "Activity" }] },
  component: Events,
});

function Events() {
  const { events, status, gap } = useDaemonEvents();

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center gap-3">
        <Activity className="size-5 text-primary" />
        <h1 className="text-xl font-semibold">Activity</h1>
        <Badge variant="outline" className="gap-1.5 font-mono text-[10px] uppercase">
          <Radio className="size-3" /> {status}
        </Badge>
      </div>
      {gap !== null && (
        <div className="mb-4 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
          Some events were dropped before this feed could replay them. The oldest available event is sequence {gap.oldestSeq}.
        </div>
      )}
      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
          <Activity className="size-10" />
          <p className="text-sm">Waiting for daemon events…</p>
        </div>
      ) : (
        <DaemonEventList events={events} />
      )}
    </div>
  );
}
