import type { OrchDir } from "../../types/core.ts";
import { agentById, agentIdByProcess, claimAgent, getOrCreateSessionAgent } from "../../store/agent-rows.ts";
import { enclosingAgent } from "../../identity/ancestry.ts";
import { OPERATOR_HARNESS_ID } from "../../identity/operator.ts";
import { orphanAgents } from "../../policy/orphan.ts";
import { freshStartToken } from "../../process-identity.ts";
import { placeProcess, processIsLiveNow } from "../../process-place.ts";
import { versionInRange } from "../../shared/versions.ts";
import { getBackend } from "../../backends/registry.ts";
import type { HostIdentity } from "../../types/host.ts";
import type { HostedProcess, ProcessPlace } from "../../types/process.ts";
import type { Logger } from "../../types/core.ts";
import type { ClaimIdentityResponse, RegisterSessionResponse } from "../../types/daemon.ts";
import type { ParamsOf, SessionClaim } from "../client/protocol.ts";
import { RpcError } from "../client/wire.ts";

/** A caller's process, proven where it runs, with its start token. */
interface VerifiedProcess {
  readonly process: HostedProcess & { readonly startToken: string };
}

/** The caller's process, verified where it runs: by the OS here, or for a caller on a linked
 *  host, by asking that host over its link. A caller on a host orch has no link to is refused:
 *  nothing here can say whether its pid names anything. */
async function verifiedSessionProcess(orchDir: OrchDir, claim: SessionClaim): Promise<VerifiedProcess> {
  const place: ProcessPlace = placeProcess(orchDir, { host: claim.host.id, pid: claim.pid, startToken: claim.startToken });
  switch (place.kind) {
    case "local": {
      const startToken = freshStartToken(place.process.pid);
      if (!startToken) throw new RpcError("IDENTITY_UNAVAILABLE", "session registration could not verify the caller's session process");
      return { process: { host: claim.host.id, pid: place.process.pid, startToken } };
    }
    case "linked": {
      const startToken = place.process.startToken;
      if (startToken === null) throw new RpcError("IDENTITY_UNAVAILABLE", `a caller on host ${place.host.name} must state its process's start token`);
      if (!await processIsLiveNow(place)) throw new RpcError("IDENTITY_UNAVAILABLE", `host ${place.host.name} did not confirm the caller's process ${place.process.pid}`);
      return { process: { ...place.process, startToken } };
    }
    case "unreachable":
      throw new RpcError("IDENTITY_UNAVAILABLE", `host ${claim.host.name} is neither this machine nor a linked host, so its process ${claim.pid} cannot be verified`);
    default: {
      const exhaustive: never = place;
      throw new Error(`unknown process place ${String(exhaustive)}`);
    }
  }
}

function claimedEnvironment(claim: SessionClaim): { sessionToken: string | null; label: string; host: HostIdentity; plexerId: string | null; plexerVersion: string | null; handle: string | null; space: string | null } {
  const hostName = claim.host.name.trim();
  return {
    sessionToken: claim.sessionToken && claim.sessionToken.length > 0 ? claim.sessionToken : null,
    label: claim.label?.trim() ?? "",
    host: { ...claim.host, name: hostName.length > 0 ? hostName : claim.host.id },
    plexerId: claim.plexer?.trim() ?? null,
    plexerVersion: claim.plexerVersion?.trim() ?? null,
    handle: claim.handle && claim.handle.trim().length > 0 ? claim.handle.trim() : null,
    space: claim.space && claim.space.trim().length > 0 ? claim.space.trim() : null,
  };
}

function plexerRegistrationWarning(plexerId: string | null, plexerVersion: string | null): string | undefined {
  if (!plexerId || !plexerVersion) return undefined;
  const range = getBackend(plexerId)?.versionInfo?.supported();
  if (!range || versionInRange(plexerVersion, range)) return undefined;
  return `plexer ${plexerId} ${plexerVersion} is older than orch's supported ${range}; update ${plexerId}`;
}


interface CallerFacts<C extends SessionClaim> { readonly claim: C; readonly verified: VerifiedProcess; readonly harness: string; readonly cwd: string; readonly environment: ReturnType<typeof claimedEnvironment>; }
async function callerFacts<C extends SessionClaim>(orchDir: OrchDir, claim: C, daemonToken: string): Promise<CallerFacts<C>> {
  if (claim.token !== daemonToken) throw new RpcError("IDENTITY_REQUIRED", "identity RPC requires the daemon token");
  const harness = claim.harness.trim();
  const cwd = claim.cwd.trim();
  if (!harness || !cwd) throw new RpcError("IDENTITY_UNAVAILABLE", "session registration requires the caller's harness and cwd");
  const verified = await verifiedSessionProcess(orchDir, claim);
  return { claim, verified, harness, cwd, environment: claimedEnvironment(claim) };
}

/** The registration answer for a caller that resolved to the agent it was started inside. */
function enclosingIdentity(orchDir: OrchDir, id: string): RegisterSessionResponse {
  const row = agentById(orchDir, id);
  if (row === null) throw new RpcError("IDENTITY_UNAVAILABLE", `agent ${id} has no row`);
  return { id, label: row.label ?? row.name, kind: "session", unleased: [] };
}

export async function registerSession(orchDir: OrchDir, params: ParamsOf<"register-session">, daemonToken: string, logger?: Logger): Promise<RegisterSessionResponse> {
  const facts = await callerFacts(orchDir, params, daemonToken);
  const { process } = facts.verified;
  const alreadyRegistered = agentIdByProcess(orchDir, process) !== null;
  // The live agent this process was started inside: the terminal a harness was typed into.
  const startedInside = alreadyRegistered ? null : enclosingAgent(orchDir, process);
  // A process with no harness marker inside a live agent's tree IS that agent, the way a
  // launched agent's own calls resolve to it. It gets no row, and never the human's.
  if (startedInside !== null && facts.harness === OPERATOR_HARNESS_ID) return enclosingIdentity(orchDir, startedInside);
  const identity = getOrCreateSessionAgent(orchDir, {
    pid: process.pid, startToken: process.startToken, sessionToken: facts.environment.sessionToken,
    harnessId: facts.harness, cwd: facts.cwd, label: facts.environment.label || `${facts.harness} session ${process.pid}`,
    host: facts.environment.host,
    plexerId: facts.environment.plexerId, plexerVersion: facts.environment.plexerVersion, handle: facts.environment.handle,
    space: facts.environment.space, spawnedBy: startedInside, now: Date.now(),
  });
  if (identity.repointed) logger?.info("session.repointed", { agentId: identity.id, harnessId: facts.harness });
  const registrationWarning = plexerRegistrationWarning(facts.environment.plexerId, facts.environment.plexerVersion);
  return { id: identity.id, label: identity.label, kind: identity.kind, ...(registrationWarning ? { registrationWarning } : {}), unleased: alreadyRegistered ? [] : orphanAgents(orchDir) };
}

export async function claimIdentity(orchDir: OrchDir, params: ParamsOf<"claim-identity">, daemonToken: string): Promise<ClaimIdentityResponse> {
  const facts = await callerFacts(orchDir, params, daemonToken);
  const id = facts.claim.id;
  if (!id) throw new RpcError("IDENTITY_REQUIRED", "claim-identity requires an agent id");
  const token = facts.environment.sessionToken;
  if (!token) throw new RpcError("IDENTITY_REQUIRED", "claim-identity requires a session token");
  const result = claimAgent(orchDir, id, token, Date.now());
  if (result.kind === "refused") {
    if (result.reason === "unknown-agent") throw new RpcError("UNKNOWN_AGENT", `unknown agent: ${id}`);
    throw new RpcError("IDENTITY_REQUIRED", "not the agent");
  }
  return { id };
}
