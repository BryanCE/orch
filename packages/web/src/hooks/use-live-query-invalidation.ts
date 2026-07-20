import { useEffect } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";

import { useDaemonEvents } from "@/lib/daemon-events";

/** Invalidate daemon-backed queries when the single SSE stream receives data. */
export function useLiveQueryInvalidation(queryKey: QueryKey): void {
  const queryClient = useQueryClient();
  const { version, status } = useDaemonEvents();

  useEffect(() => {
    if (version === 0 && status === "closed") return;
    void queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey, status, version]);
}
