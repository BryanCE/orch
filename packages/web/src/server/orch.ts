import { createServerFn } from "@tanstack/react-start";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

// The web server talks to the SAME orch daemon + store the CLI does — reuse the
// real modules rather than reinventing the socket protocol or presence read.
import { rpcCall } from "../../../../src/daemon/rpc.ts";
import { loadPresence } from "../../../../src/store.ts";
import { workspaceOf } from "../../../../src/policy/workspace.ts";
import { herdrReachable, herdrTabs } from "../../../../src/backends/herdr/cli.ts";
import type { FleetAgent, Workspace } from "@/lib/fleet";

/**
 * Mirrors src/store.ts `orchDir()`. Inlined (one line) on purpose so the daemon
 * probe doesn't have to; store.ts is imported anyway for loadPresence.
 */
function orchDir(): string {
  return process.env.ORCH_DIR ?? join(homedir(), ".orch");
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export interface DaemonStatus {
  running: boolean;
  startedAt?: string;
}

/** Probe the daemon over its socket. Absent/unreachable → running:false. */
export const getDaemonStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<DaemonStatus> => {
    try {
      const result = await rpcCall(orchDir(), "daemon-status", undefined, 400);
      const startedAt = isRecord(result) && typeof result.startedAt === "string" ? result.startedAt : undefined;
      return { running: true, startedAt };
    } catch {
      return { running: false };
    }
  },
);

/** Resolve herdr workspace id -> human label (from `herdr tab list`). Empty on
 * any failure; callers fall back to the id. */
function herdrWorkspaceNames(): Map<string, string> {
  const names = new Map<string, string>();
  try {
    if (!herdrReachable()) return names;
    for (const tab of herdrTabs().values()) {
      if (tab.workspace_id && tab.label && !names.has(tab.workspace_id)) {
        names.set(tab.workspace_id, tab.label);
      }
    }
  } catch {
    // herdr not on PATH / socket down — ids stand in for names.
  }
  return names;
}

/** Real fleet: every live agent from the presence store, grouped by workspace,
 * named via herdr when reachable. No mock, no fabricated orchestrator. */
export const getFleet = createServerFn({ method: "GET" }).handler((): Workspace[] => {
  const names = herdrWorkspaceNames();
  const byWs = new Map<string, FleetAgent[]>();

  for (const [key, entry] of loadPresence()) {
    const wsId = workspaceOf(key) ?? "unscoped";
    const s = entry.status ?? {};
    const agent: FleetAgent = {
      key,
      handle: s.handle ?? key,
      name: s.agent ?? s.label ?? s.handle ?? key,
      state: entry.alive ? s.state ?? "idle" : "exited",
      model: s.model,
      currentFile: s.currentFile,
      lastText: s.lastText,
      cost: s.cost,
      tokens: s.tokens,
      context: s.context,
      alive: entry.alive,
    };
    const list = byWs.get(wsId);
    if (list) list.push(agent);
    else byWs.set(wsId, [agent]);
  }

  return [...byWs.entries()]
    .map(([id, agents]) => ({ id, name: names.get(id) ?? id, slug: id, agents }))
    .sort((a, b) => a.name.localeCompare(b.name));
});

/** Fire the CLI's own start path (`orch daemon start`) detached. Best-effort:
 * if `orch` isn't on PATH the caller still has the command to run by hand. */
export const startDaemon = createServerFn({ method: "POST" }).handler((): { ok: boolean } => {
  try {
    const child = spawn("orch", ["daemon", "start"], { detached: true, stdio: "ignore" });
    child.unref();
    return { ok: true };
  } catch {
    return { ok: false };
  }
});
