import { useQuery } from "@tanstack/react-query";

import { getDaemonStatus } from "@/server/orch";

/**
 * Live daemon liveness. TanStack Query owns the polling loop + cache — no
 * effects, no timers in components. Flips within `refetchInterval` when the
 * daemon starts or dies.
 */
export function useDaemonStatus() {
  return useQuery({
    queryKey: ["daemon-status"],
    queryFn: () => getDaemonStatus(),
    refetchInterval: 2000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
}
