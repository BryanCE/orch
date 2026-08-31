import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Activity, Send, Radio, Inbox } from "lucide-react";

import { DaemonEventList } from "@/components/DaemonEventList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AgentCard } from "@/components/AgentCard";
import { NotFoundPage } from "@/components/common/NotFoundPage";
import { useFleet } from "@/hooks/use-fleet";
import { sendToAgent } from "@/server/orch";
import { useDaemonEvents } from "@/lib/daemon-events";
import { findSpace, partitionAgents, stateColor, type FleetAgent } from "@/lib/fleet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/spaces/$slug")({
  staticData: {
    crumbs: () => [
      { label: "God-view", to: "/" },
      { label: "Space" },
    ],
  },
  component: SpaceDetail,
});

function SpaceDetail() {
  const { slug } = Route.useParams();
  const { data, isPending } = useFleet();
  const { events, status } = useDaemonEvents();
  const [selected, setSelected] = useState<FleetAgent | null>(null);

  const space = findSpace(data?.spaces ?? [], slug);

  if (isPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="animate-pulse font-mono text-sm text-muted-foreground">loading fleet…</p>
      </div>
    );
  }
  if (!space) return <NotFoundPage />;

  const agentKeys = new Set(space.agents.map((agent) => agent.key));
  const spaceEvents = events.filter((event) => typeof event.key === "string" && agentKeys.has(event.key));
  const [, orphans] = partitionAgents(space.agents);
  // Every orch section holds at least one agent by definition; the unheld group
  // is dropped here because the Orphans section already names that fact.
  const heldOrchs = space.orchs.filter((orch) => orch.agents.some((agent) => agent.lease?.holderAlive === true));

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-baseline gap-2 px-6 pt-4">
        <h1 className="text-xl font-semibold">{space.name}</h1>
        <Badge variant="outline" className="ml-2">{space.agents.length} agents</Badge>
      </div>

      <Tabs defaultValue="fleet" className="flex flex-1 flex-col">
        <TabsList className="mx-6 mt-3 w-fit">
          <TabsTrigger value="fleet">Fleet</TabsTrigger>
          <TabsTrigger value="events">Activity</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="fleet" className="flex-1">
          <div className="p-6">
            {space.agents.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
                <Inbox className="size-10" />
                <p className="text-sm">No agents in this space.</p>
              </div>
            ) : (
              <>
                {/* C7: live work groups by LEASE. A space encompasses the orchs
                    working in it and each orch encompasses the agents it holds,
                    so the fleet is rendered one section per holder. Unheld
                    agents are the Orphans section below, not an invented orch. */}
                {heldOrchs.map((orch) => (
                  <section key={orch.id} className="mb-8 space-y-3">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{orch.name}</h2>
                      <Badge variant="outline" className="font-mono text-[10px]">{orch.agents.length}</Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {orch.agents.map((a) => (
                        <AgentCard
                          key={a.key}
                          agent={a}
                          active={selected?.key === a.key}
                          onClick={() => setSelected(a)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
                {orphans.length > 0 && (
                  <section className={cn("mt-8 space-y-3", "opacity-70")}>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Orphans — unleased</h2>
                      <Badge variant="outline" className="font-mono text-[10px]">{orphans.length}</Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {orphans.map((a) => (
                        <AgentCard
                          key={a.key}
                          agent={a}
                          active={selected?.key === a.key}
                          onClick={() => setSelected(a)}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="events" className="flex-1">
          <div className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <Activity className="size-5 text-primary" />
              <h2 className="text-xl font-semibold">Activity</h2>
              <Badge variant="outline" className="gap-1.5 font-mono text-[10px] uppercase">
                <Radio className="size-3" /> {status}
              </Badge>
            </div>
            {spaceEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
                <Activity className="size-10" />
                <p className="text-sm">No transitions for this space yet.</p>
              </div>
            ) : (
              <DaemonEventList events={spaceEvents} />
            )}
          </div>
        </TabsContent>

        <TabsContent value="overview" className="flex-1 p-6">
          <div className="grid max-w-md grid-cols-2 gap-3 text-sm">
            {space.agents.map((a) => (
              <div key={a.key} className="flex items-center justify-between gap-2 rounded border px-3 py-2">
                <span className="truncate font-mono">{a.name}</span>
                <span className={cn("text-xs uppercase", stateColor(a.state))}>{a.state}</span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SheetContent side="right" className="flex w-96 flex-col gap-0 p-0 sm:max-w-96">
          {selected && <AgentFocus agent={selected} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/** Agent focus panel — monitor plus first-class steer/message control. */
function AgentFocus({ agent }: { agent: FleetAgent }) {
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const send = async (kind: "steer" | "message") => {
    const text = msg.trim();
    if (!text || sending) return;
    setSending(true);
    const result = await sendToAgent({ data: { key: agent.key, text, kind } });
    setSending(false);
    if ("ok" in result) {
      toast.success(`${kind} → ${agent.name}`);
      setMsg("");
      return;
    }
    toast.error(`${kind} → ${agent.name} failed`, { description: result.reason });
  };

  return (
    <>
      <SheetHeader className="border-b">
        <SheetTitle className="truncate font-mono text-sm">{agent.name}</SheetTitle>
        <SheetDescription>Agent details from orch</SheetDescription>
      </SheetHeader>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-4 text-sm">
          <Field label="State">
            <span className={cn("uppercase", stateColor(agent.state))}>{agent.state}</span>
          </Field>
          <Field label="Runtime">
            {agent.environment.pane
              ? <span className="font-mono text-xs">pane {agent.environment.pane}</span>
              : "detached — no pane"}
          </Field>
          {agent.model?.id && <Field label="Model">{agent.model.provider}/{agent.model.id}</Field>}
          <Field label="Cost">${(agent.cost ?? 0).toFixed(2)}</Field>
          {agent.context?.percent !== undefined && <Field label="Context">{agent.context.percent}%</Field>}
          {agent.currentFile && <Field label="File"><span className="font-mono text-xs">{agent.currentFile}</span></Field>}
          {agent.lastText && (
            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Last</p>
              <p className="rounded bg-muted/50 p-2 text-xs">{agent.lastText}</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Delivery is orch's own mechanism, so every agent can be written to; a
          pane is only a shortcut for watching one. Nothing here is gated on it. */}
      <SheetFooter className="border-t">
        <Textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder={`message ${agent.name}…`}
          className="min-h-16 resize-none text-sm"
        />
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" disabled={sending} onClick={() => void send("message")}>
            <Send className="size-3.5" /> Send
          </Button>
          <Button size="sm" variant="secondary" className="flex-1" disabled={sending} onClick={() => void send("steer")}>
            <Radio className="size-3.5" /> Steer
          </Button>
        </div>
      </SheetFooter>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  );
}
