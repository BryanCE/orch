// Fleet types shared by the god-view, sidebar, and workspace detail. Data comes
// from the real daemon via getFleet (src/server/orch.ts) — NO mock source.

export interface FleetAgent {
  /** full presence key `<backend>~<workspace>~<handle>` */
  key: string;
  /** backend-native handle (herdr pane id) */
  handle: string;
  /** assigned agent label */
  name: string;
  /** presence state (idle/working/blocked/done/exited/error/…) */
  state: string;
  model?: { provider?: string; id?: string };
  currentFile?: string;
  lastText?: string;
  cost?: number;
  tokens?: { input?: number; output?: number; cacheRead?: number; cacheWrite?: number };
  context?: { percent?: number };
  alive: boolean;
}

export interface Workspace {
  /** herdr workspace id embedded in the presence key (e.g. "wD") */
  id: string;
  /** human name from herdr if reachable, else the id */
  name: string;
  /** url slug — the workspace id */
  slug: string;
  agents: FleetAgent[];
}

export function findWorkspace(list: Workspace[], slug: string): Workspace | undefined {
  return list.find((w) => w.slug === slug);
}

export function stateColor(state: string): string {
  switch (state) {
    case "working":
      return "text-chart-2";
    case "review":
    case "blocked":
      return "text-chart-4";
    case "done":
      return "text-primary";
    case "error":
    case "aborted":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}
