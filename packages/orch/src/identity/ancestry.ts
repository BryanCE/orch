// The live agent a process was started inside. A process with no row of its own that descends
// from a live agent's process is that agent's: its tool, its subshell, its terminal tab.
import { agentIdByProcess, liveProcessPids } from "../store/agent-rows.ts";
import { localProcessOf } from "../local-process.ts";
import { ancestorPids, processStartToken } from "../process-identity.ts";
import type { OrchDir } from "../types/core.ts";
import type { HostedProcess } from "../types/process.ts";

/** The nearest ancestor of `process` with a live row, or null. Only the OS here can walk a
 *  process's ancestors, so a process on another host has none. */
export function enclosingAgent(orchDir: OrchDir, process: HostedProcess): string | null {
  const local = localProcessOf(process);
  if (local === null) return null;
  const rowed = liveProcessPids(orchDir, process.host);
  rowed.delete(local.pid);
  if (rowed.size === 0) return null;
  for (const ancestor of ancestorPids(local.pid)) {
    if (!rowed.has(ancestor)) continue;
    const startToken = processStartToken(ancestor);
    const id = startToken === undefined ? null : agentIdByProcess(orchDir, { host: process.host, pid: ancestor, startToken });
    if (id !== null) return id;
  }
  return null;
}
