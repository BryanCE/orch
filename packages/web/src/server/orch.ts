import { createServerFn } from "@tanstack/react-start";

import { daemonRpc, down, type DaemonDown, type DaemonEndpoint } from "./daemon";
import { projectFleet, projectHistory, type FleetProjectionRow, type Workspace } from "@/lib/fleet";

// Every export here is a server function, so the TanStack Start plugin strips this
// module's body from the client bundle. Adding a plain exported function pulls
// ./daemon — and node:net with it — into the browser chunk, which kills hydration.

interface DaemonUp { daemon: "up" }
export type DaemonHome = "local" | "wsl" | "remote";
interface DaemonWhere {
  home: DaemonHome;
  endpoint: DaemonEndpoint;
}
type DaemonStatus = DaemonDown | (DaemonUp & { running: true; startedAt?: string; where: DaemonWhere });
type FleetResult = DaemonDown | { daemon: "up"; workspaces: Workspace[]; history: Workspace[] };

/**
 * Which machine orchd sits on, relative to this web server. A unix socket is one
 * filesystem, so it is the same host. A Windows web server that reached a daemon
 * holding a unix socket crossed loopback into WSL — the standing setup here.
 */
function daemonHome(endpoint: DaemonEndpoint, daemonTransport: unknown): DaemonHome {
  if (endpoint.transport === "unix") return "local";
  if (process.platform === "win32" && daemonTransport === "unix") return "wsl";
  return "remote";
}

export const getDaemonStatus = createServerFn({ method: "GET" }).handler(async (): Promise<DaemonStatus> => {
  try {
    const { result, endpoint } = await daemonRpc<Record<string, unknown>>("daemon-status");
    return {
      daemon: "up",
      running: true,
      ...(typeof result?.startedAt === "string" ? { startedAt: result.startedAt } : {}),
      where: { home: daemonHome(endpoint, result?.socket), endpoint },
    };
  } catch (error) {
    return down(error);
  }
});

interface PresenceRow extends FleetProjectionRow {
  /** Legacy plexer coordinate, retained for daemon routing but never displayed. */
  workspace?: string | null;
  workspaceName?: string | null;
}

interface PresenceResult {
  rows: PresenceRow[];
}

/**
 * Send text to one agent. `steer` interrupts the current turn; `message` queues it
 * for the agent's next input. Both are existing orchd methods — the web never
 * reaches an agent by any route but the daemon.
 */
export const sendToAgent = createServerFn({ method: "POST" })
  .inputValidator((input: { key: string; text: string; kind: "message" | "steer" }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | DaemonDown> => {
    try {
      await daemonRpc(data.kind === "steer" ? "steer" : "dispatch", { target: data.key, text: data.text });
      return { ok: true };
    } catch (error) {
      return down(error);
    }
  });

/** Read the merged pane + presence view from orchd. */
export const getFleet = createServerFn({ method: "GET" }).handler(async (): Promise<FleetResult> => {
  try {
    const { result } = await daemonRpc<PresenceResult>("status");
    return {
      daemon: "up",
      workspaces: projectFleet(result.rows),
      history: projectHistory(result.rows),
    };
  } catch (error) {
    return down(error);
  }
});
