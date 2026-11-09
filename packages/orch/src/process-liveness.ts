// Whether a recorded process is alive, wherever it runs. A process on this machine, or on
// the other OS of this box, is asked of the OS here. A process on a host orch reaches over
// a link is asked over that link: orchd records each answer as it arrives, and with no
// fresh answer the process is unknown, never dead. A link that dropped says nothing about
// the agents behind it.
import { recordedInstanceIsLive } from "./process-identity.ts";
import { linkedHostIds } from "./store/host-rows.ts";
import type { OrchDir } from "./types/core.ts";
import type { Liveness } from "./types/presence.ts";

/** The facts that name one process instance on one host. */
export interface RecordedProcess {
  readonly hostId: string;
  readonly pid: number;
  readonly startToken: string | null;
}

function instanceKey(pid: number, startToken: string | null): string {
  return `${pid}:${startToken ?? ""}`;
}

/** The last answer each linked host gave, by process instance. A host with no entry has not
 *  answered since its link came up. */
const remoteAnswers = new Map<string, ReadonlyMap<string, boolean>>();

/** A linked host answered for these processes. Replaces what it said before. */
export function recordRemoteLiveness(hostId: string, answers: readonly { readonly pid: number; readonly startToken: string | null; readonly alive: boolean }[]): void {
  remoteAnswers.set(hostId, new Map(answers.map((answer) => [instanceKey(answer.pid, answer.startToken), answer.alive])));
}

/** A linked host's link dropped: every process there is unknown until it answers again. */
export function forgetRemoteLiveness(hostId: string): void {
  remoteAnswers.delete(hostId);
}

/** Whether `process` is alive. `linked` is {@link linkedHostIds}, read once by a caller
 *  that asks about many processes. */
export function processLiveness(orchDir: OrchDir, process: RecordedProcess, linked: ReadonlySet<string> = linkedHostIds(orchDir)): Liveness {
  if (!linked.has(process.hostId)) return recordedInstanceIsLive(process.pid, process.startToken) ? "alive" : "dead";
  const answer = remoteAnswers.get(process.hostId)?.get(instanceKey(process.pid, process.startToken));
  if (answer === undefined) return "unknown";
  return answer ? "alive" : "dead";
}
