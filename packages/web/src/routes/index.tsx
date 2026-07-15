import { createFileRoute } from "@tanstack/react-router";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  component: Home,
});

// Placeholder god-view. Wiring to orch presence/topology comes next —
// this only proves the base structure boots with shadcn + themes.
function Home() {
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-xl font-semibold">Workspaces</h1>
        <Badge variant="outline">god-view</Badge>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {["wD", "wA", "wB"].map((ws) => (
          <Card key={ws}>
            <CardHeader>
              <CardTitle className="font-mono text-sm">{ws}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              placeholder — agent rollup, states, Σ tokens/cost land here
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
