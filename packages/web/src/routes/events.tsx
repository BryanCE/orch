import { createFileRoute } from "@tanstack/react-router";
import { Activity, Radio } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DaemonEventList } from "@/components/DaemonEventList";
import { useDaemonEvents } from "@/lib/daemon-events";

export const Route = createFileRoute("/events")({
  staticData: { crumbs: () => [{ label: "Activity" }] },
  component: Events,
});

function Events() {
  const { events, status } = useDaemonEvents();

  return (
    <ScrollArea className="flex-1">
      <div className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <Activity className="size-5 text-primary" />
          <h1 className="text-xl font-semibold">Activity</h1>
          <Badge variant="outline" className="gap-1.5 font-mono text-[10px] uppercase">
            <Radio className="size-3" /> {status}
          </Badge>
        </div>
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
            <Activity className="size-10" />
            <p className="text-sm">Waiting for daemon events…</p>
          </div>
        ) : (
          <DaemonEventList events={events} />
        )}
      </div>
    </ScrollArea>
  );
}
