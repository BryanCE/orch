import { createFileRoute } from "@tanstack/react-router";
import { Activity } from "lucide-react";

export const Route = createFileRoute("/events")({
  staticData: { crumbs: () => [{ label: "Activity" }] },
  component: Events,
});

function Events() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
      <Activity className="size-10" />
      <p className="text-sm">Global activity stream — every workspace's transitions, live over SSE.</p>
    </div>
  );
}
