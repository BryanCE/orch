import { launchCredential } from "./launch.ts";
import { callerSession } from "../adapters/session-env.ts";
import { processStartToken } from "../process-identity.ts";
import type { CallerCredential, CallerSession } from "../types/core.ts";

/** The process a driving session is: the pid its harness exports, else the
 *  shell that ran this command. Never this CLI process — that is new on every
 *  call and would make every `orch` invocation a different session. */
export function sessionProcessPid(session: CallerSession | null): number {
  return session?.pid ?? process.ppid;
}

/** Everything the caller's own environment says, read once, sent to orchd. */
export function callerCredential(): CallerCredential {
  const session = callerSession();
  const pid = sessionProcessPid(session);
  return { launch: launchCredential(), session, process: { pid, startToken: processStartToken(pid) ?? null } };
}
