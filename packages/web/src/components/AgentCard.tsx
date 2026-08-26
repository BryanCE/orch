import { useEffect, useRef, useState } from "react";
import { FileCode2, Cpu, DollarSign, Terminal, EyeOff } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDaemonEvents } from "@/lib/daemon-events";
import { stateColor, stateGlow, type FleetAgent } from "@/lib/fleet";

/** How long the card holds full brightness before it starts decaying. */
const FLASH_MS = 220;

/**
 * Light up on this agent's next transition. Returns the state that caused it, or
 * null once the card is dark — the caller reads null as "no ring".
 */
function usePulse(agentKey: string): string | null {
  const { transitions } = useDaemonEvents();
  const transition = transitions[agentKey];
  const [lit, setLit] = useState(false);
  // Seeded with the mount-time count so arriving on a page does not flash every card.
  const litAt = useRef(transition?.count);

  useEffect(() => {
    if (transition === undefined || transition.count === litAt.current) return;
    litAt.current = transition.count;
    setLit(true);
    const dim = setTimeout(() => setLit(false), FLASH_MS);
    return () => clearTimeout(dim);
  }, [transition?.count]);

  return lit && transition ? transition.state : null;
}

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
  const pulse = usePulse(agent.key);
  // A capless agent has no pane to watch and no input to type into. That is a fact
  // about what its backend can do, not about which backend it happens to be.
  const watchable = agent.capabilities.panes;

  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer gap-2 py-3 transition-[box-shadow,border-color] hover:border-primary/50",
        // Snap bright, then decay: the two durations ARE the pulse.
        pulse ? `duration-75 ${stateGlow(pulse)}` : "shadow-none duration-[1600ms]",
        active && "border-primary bg-accent/40",
      )}
    >
      <CardHeader className="px-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-sm font-medium">{agent.name}</span>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge
              variant="outline"
              className="gap-1 font-mono text-[10px] uppercase text-muted-foreground"
              title={watchable ? `pane ${agent.pane}` : "no pane — this agent cannot be watched or typed at"}
            >
              {watchable ? <Terminal className="size-3" /> : <EyeOff className="size-3" />}
              {watchable ? "pane" : "detached"}
            </Badge>
            <Badge variant="outline" className={cn("uppercase", stateColor(agent.state))}>
              {agent.state}
            </Badge>
          </div>
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
