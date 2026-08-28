import { createServerFn } from "@tanstack/react-start";

import { daemonRpc, down, type DaemonDown, type DaemonEndpoint } from "./daemon";
import { NO_CAPABILITIES, type AgentCapabilities, type Workspace } from "@/lib/fleet";

// Every export here is a server function, so the TanStack Start plugin strips this
// module's body from the client bundle. Adding a plain exported function pulls
// ./daemon — and node:net with it — into the browser chunk, which kills hydration.

export interface DaemonUp { daemon: "up" }
export type DaemonHome = "local" | "wsl" | "remote";
export interface DaemonWhere {
  home: DaemonHome;
  endpoint: DaemonEndpoint;
}
export type DaemonStatus = DaemonDown | (DaemonUp & { running: true; startedAt?: string; where: DaemonWhere });
export type FleetResult = DaemonDown | { daemon: "up"; workspaces: Workspace[] };

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

interface PresenceLease {
  holderId: string;
  holderName: string;
  holderAlive: boolean;
}

interface PresenceRow {
  key: string;
  paneId: string | null;
  name: string | null;
  agent: string | null;
  state: string;
  exited: boolean;
  model: string;
  lastText: string | null;
  cost: number;
  ctxPercent: number | null;
  tokens: unknown;
  capabilities: Partial<AgentCapabilities> | null;
  lease: PresenceLease | null;
  leaseKnown: boolean;
  workspace?: string | null;
  workspaceName?: string | null;
}

/**
 * Read the daemon's capability report defensively. The backend port grows new
 * capabilities over time, and a build that has not heard of one must read it as
 * absent rather than crash or assume it. `capabilities` is the wire name; the UI
 * reads `agent.capabilities` so its call sites say what they mean.
 */
function agentCapabilities(reported: Partial<AgentCapabilities> | null): AgentCapabilities {
  if (!reported) return NO_CAPABILITIES;
  return {
    panes: reported.panes === true,
    focusable: reported.focusable === true,
    canSendKeys: reported.canSendKeys === true,
    canPruneLogs: reported.canPruneLogs === true,
  };
}

interface PresenceResult {
  rows: PresenceRow[];
}

function fleetFromPresence(result: PresenceResult): Workspace[] {
  const workspaces = new Map<string, Workspace>();
  for (const row of result.rows) {
    const id = row.workspace ?? "local";
    const workspace = workspaces.get(id) ?? {
      id,
      name: row.workspaceName ?? id,
      slug: id,
      agents: [],
    };
    workspace.agents.push({
      key: row.key,
      handle: row.paneId ?? row.key,
      pane: row.paneId,
      capabilities: agentCapabilities(row.capabilities),
      name: row.name ?? row.agent ?? row.key,
      state: row.state,
      ...(row.model ? { model: { id: row.model } } : {}),
      ...(row.lastText ? { lastText: row.lastText } : {}),
      cost: row.cost,
      ...(row.tokens && typeof row.tokens === "object" ? { tokens: row.tokens } : {}),
      ...(row.ctxPercent !== null ? { context: { percent: row.ctxPercent } } : {}),
      alive: !row.exited,
      lease: row.lease && typeof row.lease === "object" ? row.lease : null,
      leaseKnown: row.leaseKnown === true,
    });
    workspaces.set(id, workspace);
  }
  return [...workspaces.values()];
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
    return { daemon: "up", workspaces: fleetFromPresence(result) };
  } catch (error) {
    return down(error);
  }
});
