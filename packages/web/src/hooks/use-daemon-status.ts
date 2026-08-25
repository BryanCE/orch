import { useQuery } from "@tanstack/react-query";

import { useLiveQueryInvalidation } from "@/hooks/use-live-query-invalidation";
import { getDaemonStatus } from "@/server/orch";

export const DAEMON_STATUS_QUERY_KEY = ["daemon-status"] as const;

/** Daemon liveness is refreshed by SSE connection changes and events. */
export function useDaemonStatus() {
  useLiveQueryInvalidation(DAEMON_STATUS_QUERY_KEY);

  return useQuery({
    queryKey: DAEMON_STATUS_QUERY_KEY,
    queryFn: () => getDaemonStatus(),
    staleTime: Infinity,
  });
}
