import type { OrchDir } from "../../types/core.ts";
import { hostname } from "node:os";
import { readFileSync } from "node:fs";
import { callerSession } from "../../adapters/session-env.ts";
import { OPERATOR_HARNESS_ID } from "../../policy/caller.ts";
import { sessionProcessPid } from "../../identity/credential.ts";
import { allBackends } from "../../backends/registry.ts";
import { endpointPaths } from "./wire.ts";
import type { RegisterSessionResponse } from "../../types/daemon.ts";
import { RPC_RESULTS, type SessionClaim } from "./protocol.ts";
import { hostOs } from "../../host.ts";

/** Validate every field carried by a session registration before trusting it. */
export function isRegisterSessionResponse(value: unknown): value is RegisterSessionResponse {
  return RPC_RESULTS["register-session"].safeParse(value).success;
}

export function nonEmpty(value: string | undefined): string | undefined {
  return value === "" ? undefined : value;
}

/** Print the daemon's once-per-session unleased list. The daemon sends it only on the
 * session's first registration, so this never decides anything itself. */
export function announceUnleasedAgents(
  identity: RegisterSessionResponse,
  write: (text: string) => void = (text) => { process.stdout.write(text); },
): void {
  const [first] = identity.unleased;
  if (first === undefined) return;
  write(`${identity.unleased.length} unleased agent(s) exist - orch adopt ${first.name} to take one, orch status to see them.\n`);
}

/**
 * The plexer this process stands in, the version it runs, and the place it
 * occupies there.
 *
 * Registration is the moment orch WRITES an environment down (Rule 11), so it is
 * the one place that asks. The claim used to send `undefined` for all of these,
 * so no driving session ever got a plexer or handle row — and every later reader
 * had to sniff the process environment again to answer a question the store
 * should have held.
 */
function callerEnvironment(): { plexer: string | undefined; plexerVersion: string | undefined; handle: string | undefined } {
  const here = allBackends().find((backend) => backend.isInsideSession());
  if (here === undefined) return { plexer: undefined, plexerVersion: undefined, handle: undefined };
  const place = here.placementInventory?.current() ?? null;
  return { plexer: here.id, plexerVersion: here.versionInfo?.installed() ?? undefined, handle: place === null ? undefined : String(place.handle) };
}

/** Build the authenticated caller facts for session registration. */
export function sessionClaim(orchDir: OrchDir, label?: string): SessionClaim {
  const token = readFileSync(endpointPaths(orchDir).token, "utf8").trim();
  const session = callerSession();
  const configuredHarness = nonEmpty(process.env.ORCH_HARNESS?.trim());
  const harness = configuredHarness ?? session?.harnessId ?? OPERATOR_HARNESS_ID;
  const sessionToken = session?.sessionId ?? null;
  const environment = callerEnvironment();
  return {
    token,
    pid: sessionProcessPid(session),
    sessionToken,
    harness,
    cwd: process.cwd(),
    label,
    plexer: environment.plexer,
    plexerVersion: environment.plexerVersion,
    handle: environment.handle,
    space: nonEmpty(process.env.ORCH_SPACE?.trim()) ?? null,
    hostName: hostname(),
    hostOs: hostOs(),
  };
}
