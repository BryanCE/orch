import { type ReactNode } from "react";
import { PlugZap, RefreshCw } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDaemonStatus } from "@/hooks/use-daemon-status";

/**
 * Whole-app liveness gate. The cockpit shows NOTHING off stale/fake data. The web
 * server never starts a daemon: orchd is one per host so every session shares one
 * view, and a second one launched here would see none of the others' agents.
 */
export function DaemonGate({ children }: { children: ReactNode }) {
  const { data, isPending, isFetching, refetch } = useDaemonStatus();

  if (isPending) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="animate-pulse font-mono text-sm text-muted-foreground">connecting to orch…</p>
      </div>
    );
  }

  if (!data || data.daemon === "down") {
    return (
      <div className="flex h-screen w-full items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-destructive/10">
              <PlugZap className="size-5 text-destructive" />
            </div>
            <CardTitle>orch daemon is unreachable</CardTitle>
            <CardDescription>
              Nothing is live to show. Start the host's daemon, then retry.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1 rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
              <p>orch daemon start</p>
              {data && (
                <>
                  <p className="text-destructive">{data.reason}</p>
                  <p className="break-all">tried {data.tried}</p>
                </>
              )}
            </div>
            <Button variant="secondary" className="w-full" onClick={() => void refetch()} disabled={isFetching}>
              <RefreshCw className={isFetching ? "size-4 animate-spin" : "size-4"} /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return children;
}
