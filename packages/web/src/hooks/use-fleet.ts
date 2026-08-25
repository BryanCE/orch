import { useQuery } from "@tanstack/react-query";

import { useLiveQueryInvalidation } from "@/hooks/use-live-query-invalidation";
import { getFleet } from "@/server/orch";

export const FLEET_QUERY_KEY = ["fleet"] as const;

/** Fleet snapshots are refreshed only when the daemon SSE stream changes. */
export function useFleet() {
  useLiveQueryInvalidation(FLEET_QUERY_KEY);

  return useQuery({
    queryKey: FLEET_QUERY_KEY,
    queryFn: () => getFleet(),
    staleTime: Infinity,
  });
}
