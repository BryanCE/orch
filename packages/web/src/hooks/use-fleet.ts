import { useQuery } from "@tanstack/react-query";

import { getFleet } from "@/server/orch";

/**
 * Live fleet from the real presence store. TanStack Query owns the poll loop —
 * no effects. (SSE push off the daemon's subscribe-events will replace the
 * interval; the shape stays the same.)
 */
export function useFleet() {
  return useQuery({
    queryKey: ["fleet"],
    queryFn: () => getFleet(),
    refetchInterval: 1500,
    staleTime: 0,
  });
}
