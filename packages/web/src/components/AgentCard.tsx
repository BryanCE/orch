import { FileCode2, Cpu, DollarSign } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { stateColor, type FleetAgent } from "@/lib/fleet";

/** One live agent tile — the atom of both the god-view rollup and the fleet grid. */
export function AgentCard({
  agent,
  active,
  onClick,
}: {
  agent: FleetAgent;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer gap-2 py-3 transition-colors hover:border-primary/50",
        active && "border-primary bg-accent/40",
      )}
    >
      <CardHeader className="px-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-sm font-medium">{agent.name}</span>
          <Badge variant="outline" className={cn("shrink-0 uppercase", stateColor(agent.state))}>
            {agent.state}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 px-3 text-xs text-muted-foreground">
        {agent.lastText && <p className="line-clamp-2 text-foreground/80">{agent.lastText}</p>}
        {agent.currentFile && (
          <p className="flex items-center gap-1 truncate font-mono">
            <FileCode2 className="size-3 shrink-0" />
            {agent.currentFile}
          </p>
        )}
        <div className="flex items-center gap-3 pt-0.5">
          {agent.model?.id && (
            <span className="flex items-center gap-1">
              <Cpu className="size-3" />
              {agent.model.id}
            </span>
          )}
          <span className="flex items-center gap-1">
            <DollarSign className="size-3" />
            {(agent.cost ?? 0).toFixed(2)}
          </span>
          {agent.context?.percent !== undefined && <span>{agent.context.percent}% ctx</span>}
        </div>
      </CardContent>
    </Card>
  );
}
