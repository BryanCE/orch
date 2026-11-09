import type { OrchDir } from "../../types/core.ts";
import { readFileSync } from "node:fs";
import { callerSession } from "../../shared/session-env.ts";
import type { CallerSession } from "../../types/core.ts";
import { OPERATOR_HARNESS_ID } from "../../identity/operator.ts";
import { sessionProcessPid } from "../../identity/credential.ts";
import { plexerEnvMarkers } from "../../shared/plexer-env.ts";
import { endpointPaths } from "./wire.ts";
import type { RegisterSessionResponse } from "../../types/daemon.ts";
import { RPC_RESULTS, type SessionClaim } from "./protocol.ts";

/** Validate every field carried by a session registration before trusting it. */
export function isRegisterSessionResponse(value: unknown): value is RegisterSessionResponse {
  return RPC_RESULTS["register-session"].safeParse(value).success;
}

export function nonEmpty(value: string | undefined): string | undefined {
  return value === "" ? undefined : value;
}

/** Print the daemon's once-per-session orphan list to stderr, so a command's own stdout stays
 * clean. The daemon sends it only on the session's first registration. */
export function announceUnleasedAgents(
  identity: RegisterSessionResponse,
  write: (text: string) => void = (text) => { process.stderr.write(text); },
): void {
  if (identity.unleased.length === 0) return;
  write(`${identity.unleased.length} orphan agent(s) exist - orch adopt to list them.\n`);
}

/** A harness session that names neither itself nor its process. Filing it under the
 *  parent pid would hand that session's identity to whatever process the parent is. */
function refuseAnonymousSession(session: CallerSession): void {
  if (session.sessionId !== null || session.pid !== null) return;
  throw new Error(`${session.harnessId} session exported no session id and no session pid; orch cannot tell which process it is`);
}

/** Build the caller facts only the caller can know for session registration: its process,
 *  its raw environment markers, its cwd and the daemon token. orchd reads the process's
 *  start token and detects the plexer itself. A bridge running inside its harness passes
 *  `harnessSession`, whose pid is the harness process itself. */
export function sessionClaim(orchDir: OrchDir, label?: string, harnessSession?: { harness: string; sessionToken: string | undefined; pid: number }): SessionClaim {
  const token = readFileSync(endpointPaths(orchDir).token, "utf8").trim();
  const session = callerSession();
  if (harnessSession === undefined && session !== null) refuseAnonymousSession(session);
  const configuredHarness = nonEmpty(process.env.ORCH_HARNESS?.trim());
  const harness = harnessSession?.harness ?? configuredHarness ?? session?.harnessId ?? OPERATOR_HARNESS_ID;
  const sessionToken = harnessSession?.sessionToken ?? session?.sessionId ?? null;
  return {
    token,
    pid: harnessSession?.pid ?? sessionProcessPid(session),
    sessionToken,
    harness,
    cwd: process.cwd(),
    label,
    space: nonEmpty(process.env.ORCH_SPACE?.trim()) ?? null,
    plexerEnv: plexerEnvMarkers(process.env),
  };
}
