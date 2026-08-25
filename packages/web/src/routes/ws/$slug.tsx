import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Send, Radio, Inbox } from "lucide-react";

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
import { findWorkspace, stateColor, type FleetAgent } from "@/lib/fleet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ws/$slug")({
  staticData: {
    crumbs: (params) => [
      { label: "God-view", to: "/" },
      { label: params.slug },
    ],
  },
  component: WorkspaceDetail,
});

function WorkspaceDetail() {
  const { slug } = Route.useParams() as { slug: string };
  const { data: workspaces = [], isPending } = useFleet();
  const [selected, setSelected] = useState<FleetAgent | null>(null);

  const ws = findWorkspace(workspaces, slug);

  if (isPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="animate-pulse font-mono text-sm text-muted-foreground">loading fleet…</p>
      </div>
    );
  }
  if (!ws) return <NotFoundPage />;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-baseline gap-2 px-6 pt-4">
        <h1 className="text-xl font-semibold">{ws.name}</h1>
        {ws.name !== ws.id && <span className="font-mono text-sm text-muted-foreground">{ws.id}</span>}
        <Badge variant="outline" className="ml-2">{ws.agents.length} agents</Badge>
      </div>

      <Tabs defaultValue="fleet" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-6 mt-3 w-fit">
          <TabsTrigger value="fleet">Fleet</TabsTrigger>
          <TabsTrigger value="events">Activity</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="fleet" className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="p-6">
              {ws.agents.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
                  <Inbox className="size-10" />
                  <p className="text-sm">No agents in this workspace.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {ws.agents.map((a) => (
                    <AgentCard
                      key={a.key}
                      agent={a}
                      active={selected?.key === a.key}
                      onClick={() => setSelected(a)}
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="events" className="min-h-0 flex-1 p-6">
          <p className="text-sm text-muted-foreground">
            Live transition stream lands here (SSE off the daemon's subscribe-events).
          </p>
        </TabsContent>

        <TabsContent value="overview" className="min-h-0 flex-1 p-6">
          <div className="grid max-w-md grid-cols-2 gap-3 text-sm">
            {ws.agents.map((a) => (
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

/** Agent focus panel — monitor now, steer/message wired as first-class control. */
function AgentFocus({ agent }: { agent: FleetAgent }) {
  const [msg, setMsg] = useState("");
  const send = (kind: "steer" | "message") => {
    if (!msg.trim()) return;
    // TODO wire to rpcCall(orchDir, 'steer'|'dispatch', { target: agent.key, text }).
    toast.success(`${kind} → ${agent.name}`, { description: "control not wired yet — daemon RPC comes next" });
    setMsg("");
  };

  return (
    <>
      <SheetHeader className="border-b">
        <SheetTitle className="truncate font-mono text-sm">{agent.name}</SheetTitle>
        <SheetDescription className="font-mono text-xs">{agent.key}</SheetDescription>
      </SheetHeader>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-4 text-sm">
          <Field label="State">
            <span className={cn("uppercase", stateColor(agent.state))}>{agent.state}</span>
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

      <SheetFooter className="border-t">
        <Textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder={`message ${agent.name}…`}
          className="min-h-16 resize-none text-sm"
        />
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={() => send("message")}>
            <Send className="size-3.5" /> Send
          </Button>
          <Button size="sm" variant="secondary" className="flex-1" onClick={() => send("steer")}>
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
