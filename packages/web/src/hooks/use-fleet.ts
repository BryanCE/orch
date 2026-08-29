import { useQuery } from "@tanstack/react-query";

import { useLiveQueryInvalidation } from "@/hooks/use-live-query-invalidation";
import type { Space } from "@/lib/fleet";
import { getFleet } from "@/server/orch";

const FLEET_QUERY_KEY = ["fleet"] as const;

/**
 * Fleet snapshots are refreshed only when the daemon SSE stream changes. A daemon
 * that answered `down` becomes a query error, never an empty fleet — rendering
 * "no agents" for an unreachable daemon is the lie this throw exists to prevent.
 */
export function useFleet() {
  useLiveQueryInvalidation(FLEET_QUERY_KEY);

  return useQuery({
    queryKey: FLEET_QUERY_KEY,
    queryFn: async (): Promise<Space[]> => {
      const fleet = await getFleet();
      if (fleet.daemon === "down") throw new Error(fleet.reason ?? "daemon unavailable");
      return fleet.spaces;
    },
    staleTime: Infinity,
  });
}
