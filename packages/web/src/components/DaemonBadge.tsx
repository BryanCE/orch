import { Cpu, MonitorSmartphone, Server } from "lucide-react";

import { useDaemonStatus } from "@/hooks/use-daemon-status";
import type { DaemonHome } from "@/server/orch";

const homeLabel: Record<DaemonHome, { text: string; icon: typeof Cpu }> = {
  local: { text: "same host", icon: Cpu },
  wsl: { text: "WSL", icon: Server },
  remote: { text: "remote", icon: MonitorSmartphone },
};

/** Where the daemon this page is reading actually runs, and over which endpoint. */
export function DaemonBadge() {
  const { data } = useDaemonStatus();
  if (!data || data.daemon === "down") return null;

  const { text, icon: Icon } = homeLabel[data.where.home];
  return (
    <div
      className="flex min-w-0 items-center gap-1.5 px-1 font-mono text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden"
      title={data.where.endpoint.address}
    >
      <Icon className="size-3 shrink-0 text-chart-2" />
      <span className="shrink-0">daemon</span>
      <span className="truncate text-chart-2">{text}</span>
    </div>
  );
}
