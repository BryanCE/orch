import { createServerFn } from "@tanstack/react-start";

import { daemonRpc, down, type DaemonDown, type DaemonEndpoint } from "./daemon";
import { projectFleet, projectHistory, type AgentGroup, type Space } from "@/lib/fleet";
import { daemonStatusRows } from "@/lib/status-row";
import type { DaemonStatusRow } from "@orch/types/daemon.ts";

// Every export here is a server function, so the TanStack Start plugin strips this
// module's body from the client bundle. Adding a plain exported function pulls
// ./daemon — and node:net with it — into the browser chunk, which kills hydration.

interface DaemonUp { daemon: "up" }
export type DaemonHome = "same-host" | "wsl" | "remote";
interface DaemonWhere {
  home: DaemonHome;
  endpoint: DaemonEndpoint;
}
type DaemonStatus = DaemonDown | (DaemonUp & { running: true; startedAt?: string; where: DaemonWhere });
export interface FleetSnapshot {
  daemon: "up";
  /** Live work, grouped by orch's space. */
  spaces: Space[];
  /** Ended work, grouped by the agent that spawned it. */
  history: AgentGroup[];
}
type FleetResult = DaemonDown | FleetSnapshot;

/**
 * Which machine orchd sits on, relative to this web server. A unix socket is one
 * filesystem, so it is the same host. A Windows web server that reached a daemon
 * holding a unix socket crossed loopback into WSL — the standing setup here.
 */
function daemonHome(endpoint: DaemonEndpoint, daemonTransport: unknown): DaemonHome {
  if (endpoint.transport === "unix") return "same-host";
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

/** orchd's `status` reply: the one row shape every renderer consumes. */
interface FleetStatusResult {
  rows: DaemonStatusRow[];
}

interface DaemonSendAcceptedResult {
  accepted: true;
  id: string;
  ack: "acknowledged" | "unavailable";
}

interface SendAcceptedResult extends DaemonSendAcceptedResult {
  ok: true;
}

interface MessageUnavailable {
  ok: false;
  accepted: false;
  reason: "message-unavailable";
}

type SendResult = SendAcceptedResult | MessageUnavailable | DaemonDown;

/**
 * Send text to one agent. `steer` interrupts the current turn; `dispatch` deliberately
 * clears the session before sending. `message` is unavailable here because a web
 * request has no orch agent identity to provide as the daemon's `from` parameter.
 */
export const sendToAgent = createServerFn({ method: "POST" })
  .inputValidator((input: { key: string; text: string; kind: "message" | "steer" | "dispatch" }) => input)
  .handler(async ({ data }): Promise<SendResult> => {
    if (data.kind === "message") return { ok: false, accepted: false, reason: "message-unavailable" };
    try {
      const method = data.kind === "steer" ? "steer" : "dispatch";
      const { result } = await daemonRpc<DaemonSendAcceptedResult>(method, { target: data.key, text: data.text });
      return { ok: true, ...result };
    } catch (error) {
      return down(error);
    }
  });

/** Read the merged pane + presence view from orchd. */
export const getFleet = createServerFn({ method: "GET" }).handler(async (): Promise<FleetResult> => {
  try {
    const { result } = await daemonRpc<FleetStatusResult>("status");
    const rows = daemonStatusRows(result.rows);
    return {
      daemon: "up",
      spaces: projectFleet(rows),
      history: projectHistory(rows),
    };
  } catch (error) {
    return down(error);
  }
});
