// The one mint for a `LocalProcess`: a process the OS on this box answers for. Nothing else
// in orch builds one, so a pid recorded for another host can never reach a local probe or
// signal: `localProcessOf` hands back null for it, and the caller must go through its link.
import { boxHostIds, hostIdentity } from "./host.ts";
import { processStartToken } from "./process-identity.ts";
import type { HostedProcess, LocalProcess, ProcessInstance } from "./types/process.ts";

function isLocalShape(process: ProcessInstance): process is LocalProcess {
  return Number.isSafeInteger(process.pid) && process.pid > 0;
}

/** A process this process read from its own OS: its own pid, a child it started, a pid its
 *  OS listed, a pid its own OS wrote to a runtime file here. Never a pid from a record or a
 *  wire value; those carry their host and go through {@link localProcessOf}. */
export function observedHere(pid: number, startToken: string | null): LocalProcess {
  const process = { pid, startToken };
  if (!isLocalShape(process)) throw new Error(`not a process id: ${pid}`);
  return process;
}

/** A recorded process as the OS here sees it, or null when it runs on another host. */
export function localProcessOf(process: HostedProcess): LocalProcess | null {
  return boxHostIds().has(process.host) ? observedHere(process.pid, process.startToken) : null;
}

/** A process this host's OS reported, named with this host so it can travel. */
export function hostedHere(pid: number, startToken: string | null): HostedProcess {
  return { host: hostIdentity().id, pid, startToken };
}

/** This process, on this host, as orchd records it. */
export function ownProcess(): HostedProcess {
  return hostedHere(process.pid, processStartToken(process.pid) ?? null);
}
