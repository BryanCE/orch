import { createServerFn } from "@tanstack/react-start";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

// The web server talks to the SAME orch daemon + store the CLI does — reuse the
// real modules rather than reinventing the socket protocol or presence read.
import { rpcCall } from "../../../../src/daemon/rpc.ts";
import { loadPresence } from "../../../../src/presence/store.ts";
import { workspaceOf } from "../../../../src/policy/workspace.ts";
import { resolveBackend } from "../../../../src/backends/registry.ts";
import { loadConfigOrNull } from "../../../../src/config.ts";
import type { FleetAgent, Workspace } from "@/lib/fleet";

/**
 * Mirrors src/presence/store.ts `orchDir()`. Inlined (one line) on purpose so the daemon
 * probe doesn't have to; presence/store.ts is imported anyway for loadPresence.
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

/** Workspace id -> display name from the active backend's port. Empty on any
 * failure; callers fall back to the id. Mirrors the CLI's backend resolution. */
function workspaceNames(): Map<string, string> {
  try {
    const configured = loadConfigOrNull(orchDir())?.defaults.backend ?? null;
    return resolveBackend({ configured }).workspaceNames();
  } catch {
    // No config / backend unreachable — ids stand in for names.
    return new Map();
  }
}

/** Real fleet: every live agent from the presence store, grouped by workspace,
 * named via the active backend when reachable. No mock, no fabricated orchestrator. */
export const getFleet = createServerFn({ method: "GET" }).handler((): Workspace[] => {
  const names = workspaceNames();
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
