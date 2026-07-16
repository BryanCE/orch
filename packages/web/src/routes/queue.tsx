import { createFileRoute } from "@tanstack/react-router";
import { ListTodo } from "lucide-react";

export const Route = createFileRoute("/queue")({
  staticData: { crumbs: () => [{ label: "Queue" }] },
  component: Queue,
});

function Queue() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
      <ListTodo className="size-10" />
      <p className="text-sm">Task queue — todo → queued → doing → review → done, from the SQLite store.</p>
    </div>
  );
}
