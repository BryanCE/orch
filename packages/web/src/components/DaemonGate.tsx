import { type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PlugZap, RefreshCw, Play } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDaemonStatus } from "@/hooks/use-daemon-status";
import { startDaemon } from "@/server/orch";

/**
 * Whole-app liveness gate. The cockpit shows NOTHING off stale/fake data — if
 * the orch daemon is unreachable, the app is replaced by a down screen that
 * offers to start it or retry. Reactive: the SSE-backed status query updates
 * when the daemon connection changes (see {@link useDaemonStatus}).
 */
export function DaemonGate({ children }: { children: ReactNode }) {
  const { data, isPending, isFetching, refetch } = useDaemonStatus();
  const qc = useQueryClient();

  if (isPending) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="animate-pulse font-mono text-sm text-muted-foreground">connecting to orch…</p>
      </div>
    );
  }

  if (!data?.running) {
    const start = async () => {
      await startDaemon();
      // Nudge the SSE-backed status query immediately.
      await qc.invalidateQueries({ queryKey: ["daemon-status"] });
    };

    return (
      <div className="flex h-screen w-full items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-destructive/10">
              <PlugZap className="size-5 text-destructive" />
            </div>
            <CardTitle>orch daemon is not running</CardTitle>
            <CardDescription>
              Nothing is live to show. Start the daemon to see workspaces, fleets, and activity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
              orch daemon start
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => void start()}>
                <Play className="size-4" /> Start daemon
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => void refetch()} disabled={isFetching}>
                <RefreshCw className={isFetching ? "size-4 animate-spin" : "size-4"} /> Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return children;
}
