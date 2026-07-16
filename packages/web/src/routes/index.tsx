import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Users, Inbox } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFleet } from "@/hooks/use-fleet";
import { stateColor, type Workspace } from "@/lib/fleet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  staticData: { crumbs: () => [{ label: "God-view" }] },
  component: GodView,
});

function rollup(ws: Workspace) {
  const cost = ws.agents.reduce((s, a) => s + (a.cost ?? 0), 0);
  const counts = ws.agents.reduce<Record<string, number>>((m, a) => {
    m[a.state] = (m[a.state] ?? 0) + 1;
    return m;
  }, {});
  return { count: ws.agents.length, cost, counts };
}

function GodView() {
  const { data: workspaces = [], isPending } = useFleet();

  return (
    <ScrollArea className="flex-1">
      <div className="p-6">
        <div className="mb-6 flex items-center gap-3">
          <h1 className="text-xl font-semibold">Workspaces</h1>
          {!isPending && <Badge variant="outline">{workspaces.length} live</Badge>}
        </div>

        {!isPending && workspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
            <Inbox className="size-10" />
            <p className="text-sm">No agents running. Spawn a fleet and it shows up here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {workspaces.map((ws) => {
              const r = rollup(ws);
              return (
                <Link key={ws.slug} to="/ws/$slug" params={{ slug: ws.slug }} className="group">
                  <Card className="h-full transition-colors group-hover:border-primary/60">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="flex items-baseline gap-2">
                          <span>{ws.name}</span>
                          {ws.name !== ws.id && (
                            <span className="font-mono text-xs font-normal text-muted-foreground">{ws.id}</span>
                          )}
                        </CardTitle>
                        <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="size-4" />
                        <span>{r.count} agents</span>
                        <span className="ml-auto font-mono">${r.cost.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(r.counts).map(([state, n]) => (
                          <Badge key={state} variant="outline" className={cn("uppercase", stateColor(state))}>
                            {n} {state}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
