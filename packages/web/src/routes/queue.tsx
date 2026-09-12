import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ListTodo } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLiveQueryInvalidation } from "@/hooks/use-live-query-invalidation";
import { getQueue, QUEUE_LANES, type QueueGroups, type QueueLane } from "@/server/queue";
import type { TaskRec } from "@orch/types/queue.ts";

export const Route = createFileRoute("/queue")({
  staticData: { crumbs: () => [{ label: "Queue" }] },
  component: Queue,
});

const QUEUE_QUERY_KEY = ["queue"] as const;
const LANE_LABELS: Record<QueueLane, string> = {
  queued: "Queued",
  claimed: "Claimed",
  done: "Done",
  failed: "Failed",
  cancelled: "Cancelled",
  unrunnable: "Unrunnable",
};

function Queue() {
  useLiveQueryInvalidation(QUEUE_QUERY_KEY);
  const { data, isPending, error } = useQuery({
    queryKey: QUEUE_QUERY_KEY,
    queryFn: getQueue,
    staleTime: Infinity,
  });

  if (isPending) return <QueueMessage text="Loading durable queue…" />;
  if (error) return <QueueMessage text={`Unable to read the queue: ${error.message}`} />;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <ListTodo className="size-6 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Task queue</h1>
        <Badge variant="outline">{totalTasks(data)} tasks</Badge>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {QUEUE_LANES.map((lane) => <QueueLaneView key={lane} lane={lane} tasks={data[lane]} />)}
      </div>
    </div>
  );
}

function totalTasks(groups: QueueGroups): number {
  return QUEUE_LANES.reduce((total, lane) => total + groups[lane].length, 0);
}

function QueueLaneView({ lane, tasks }: { lane: QueueLane; tasks: TaskRec[] }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{LANE_LABELS[lane]}</h2>
        <Badge variant="outline" className="font-mono text-[10px]">{tasks.length}</Badge>
      </div>
      {tasks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">No {LANE_LABELS[lane].toLowerCase()} tasks.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">{tasks.map((task) => <TaskCard key={task.id} task={task} />)}</div>
      )}
    </section>
  );
}

function TaskCard({ task }: { task: TaskRec }) {
  const attempt = task.attempts.at(-1);
  const error = task.error ?? attempt?.error;
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-sm font-normal leading-5">{task.text}</CardTitle>
          {task.stale && <Badge variant="outline">stale</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-1 text-xs text-muted-foreground">
        <div className="font-mono">{task.id}</div>
        <div>{task.attempts.length} attempt{task.attempts.length === 1 ? "" : "s"}</div>
        {error && <div className="text-destructive">{error}</div>}
      </CardContent>
    </Card>
  );
}

function QueueMessage({ text }: { text: string }) {
  return <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">{text}</div>;
}
