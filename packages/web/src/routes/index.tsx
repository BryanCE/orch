import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Users, Inbox } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentCard } from "@/components/AgentCard";
import { useFleet } from "@/hooks/use-fleet";
import { partitionAgents, stateColor, type FleetAgent, type Space } from "@/lib/fleet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  staticData: { crumbs: () => [{ label: "God-view" }] },
  component: GodView,
});

function rollup(ws: Space) {
  const cost = ws.agents.reduce((s, a) => s + (a.cost ?? 0), 0);
  const counts = ws.agents.reduce<Record<string, number>>((m, a) => {
    m[a.state] = (m[a.state] ?? 0) + 1;
    return m;
  }, {});
  return { count: ws.agents.length, cost, counts };
}

function GodView() {
  const { data, isPending } = useFleet();
  const spaces = data?.spaces ?? [];
  const history = data?.history ?? [];
  const liveSpaces: Space[] = [];
  const orphans: FleetAgent[] = [];
  for (const space of spaces) {
    const [live, unleased] = partitionAgents(space.agents);
    if (live.length > 0) liveSpaces.push({ ...space, agents: live });
    orphans.push(...unleased);
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-xl font-semibold">Spaces</h1>
        {!isPending && <Badge variant="outline">{spaces.length} live</Badge>}
      </div>

      <Tabs defaultValue="live" className="space-y-4">
        <TabsList>
          <TabsTrigger value="live">Live work</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="live">
          {!isPending && liveSpaces.length === 0 && orphans.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
              <Inbox className="size-10" />
              <p className="text-sm">No agents running. Spawn a fleet and it shows up here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {liveSpaces.map((space) => <SpaceCard key={space.slug} space={space} />)}
            </div>
          )}
          {orphans.length > 0 && (
            <section className="mt-8 space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Orphans — unleased</h2>
                <Badge variant="outline" className="font-mono text-[10px]">{orphans.length}</Badge>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {orphans.map((agent) => <AgentCard key={agent.key} agent={agent} />)}
              </div>
            </section>
          )}
        </TabsContent>
        <TabsContent value="history">
          <HistoryView groups={history} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SpaceCard({ space }: { space: Space }) {
  const r = rollup(space);
  return (
    <Link key={space.slug} to="/ws/$slug" params={{ slug: space.slug }} className="group">
      <Card className="h-full transition-colors group-hover:border-primary/60">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{space.name}</CardTitle>
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
}

function HistoryView({ groups }: { groups: Space[] }) {
  if (groups.length === 0) {
    return <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground"><Inbox className="size-10" /><p className="text-sm">No completed work yet.</p></div>;
  }
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Completed work grouped by the orch that spawned it.</p>
      {groups.map((group) => (
        <section key={group.slug} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider">Spawned by {group.name}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.agents.map((agent) => <Card key={agent.key} className="p-3"><div className="font-mono text-sm">{agent.name}</div><div className="text-xs uppercase text-muted-foreground">{agent.state}</div></Card>)}
          </div>
        </section>
      ))}
    </div>
  );
}
