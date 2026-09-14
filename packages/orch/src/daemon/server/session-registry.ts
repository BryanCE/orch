import type { OrchDir } from "../../types/core.ts";
import { hostname } from "node:os";
import { claimAgent, getOrCreateSessionAgent } from "../../store/agent-rows.ts";
import { processStartToken } from "../../process-identity.ts";
import { versionInRange } from "../../backends/versions.ts";
import { getBackend } from "../../backends/registry.ts";
import { isHostOs } from "../../host.ts";
import type { HostOs } from "../../types/host.ts";
import type { ClaimIdentityResponse, RegisterSessionResponse, UnleasedAgent } from "../../types/daemon.ts";
import type { ParamsOf, SessionClaim } from "../client/protocol.ts";
import { and, asc, eq, isNull, ne, notInArray } from "drizzle-orm";
import { orm } from "../../store/connection.ts";
import { agentEndings, agentLeases, agentProcesses, agents } from "../../db/schema.ts";
import { RpcError } from "../client/wire.ts";

function claimedHostOs(claim: SessionClaim): HostOs {
  if (!isHostOs(claim.hostOs)) throw new RpcError("IDENTITY_UNAVAILABLE", "session registration requires the caller's host OS");
  return claim.hostOs;
}

export function unleasedAgents(orchDir: OrchDir, excludeId: string): UnleasedAgent[] {
  const held = orm(orchDir).select({ agentId: agentLeases.agentId }).from(agentLeases)
    .where(isNull(agentLeases.until)).all().map((row) => row.agentId);
  return orm(orchDir).select({ id: agents.id, name: agents.name }).from(agents)
    .leftJoin(agentEndings, eq(agentEndings.agentId, agents.id))
    .where(and(ne(agents.id, excludeId), isNull(agents.sessionToken), isNull(agentEndings.agentId),
      held.length === 0 ? undefined : notInArray(agents.id, held)))
    .orderBy(asc(agents.id)).all();
}

function verifiedSessionProcess(claim: SessionClaim): { pid: number; startToken: string; harness: string; cwd: string } {
  const pid = claim.pid;
  if (!Number.isSafeInteger(pid) || pid <= 0) throw new RpcError("IDENTITY_UNAVAILABLE", "session registration requires the caller's session pid");
  const harness = claim.harness.trim();
  const cwd = claim.cwd.trim();
  if (!harness || !cwd) throw new RpcError("IDENTITY_UNAVAILABLE", "session registration requires the caller's harness and cwd");
  const startToken = processStartToken(pid);
  if (!startToken) throw new RpcError("IDENTITY_UNAVAILABLE", "session registration could not verify the caller's session process");
  return { pid, startToken, harness, cwd };
}

function claimedEnvironment(claim: SessionClaim): { sessionToken: string | null; label: string; host: string; plexerId: string | null; plexerVersion: string | null; handle: string | null; space: string | null } {
  return {
    sessionToken: claim.sessionToken && claim.sessionToken.length > 0 ? claim.sessionToken : null,
    label: claim.label?.trim() ?? "",
    host: claim.hostName.trim().length > 0 ? claim.hostName.trim() : hostname(),
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

function sessionAlreadyRegistered(orchDir: OrchDir, pid: number, startToken: string): boolean {
  return orm(orchDir).select({ id: agents.id }).from(agents)
    .innerJoin(agentProcesses, and(eq(agentProcesses.agentId, agents.id), isNull(agentProcesses.until)))
    .leftJoin(agentEndings, eq(agentEndings.agentId, agents.id))
    .where(and(eq(agentProcesses.pid, pid), eq(agentProcesses.startToken, startToken), isNull(agentEndings.agentId)))
    .limit(1).get() !== undefined;
}

interface CallerFacts<C extends SessionClaim> { readonly claim: C; readonly pid: number; readonly startToken: string; readonly harness: string; readonly cwd: string; readonly environment: ReturnType<typeof claimedEnvironment>; readonly hostOs: HostOs; }
function callerFacts<C extends SessionClaim>(claim: C, daemonToken: string): CallerFacts<C> {
  if (claim.token !== daemonToken) throw new RpcError("IDENTITY_REQUIRED", "identity RPC requires the daemon token");
  const { pid, startToken, harness, cwd } = verifiedSessionProcess(claim);
  return { claim, pid, startToken, harness, cwd, environment: claimedEnvironment(claim), hostOs: claimedHostOs(claim) };
}

export function registerSession(orchDir: OrchDir, params: ParamsOf<"register-session">, daemonToken: string): RegisterSessionResponse {
  const facts = callerFacts(params, daemonToken);
  const alreadyRegistered = sessionAlreadyRegistered(orchDir, facts.pid, facts.startToken);
  const identity = getOrCreateSessionAgent(orchDir, {
    pid: facts.pid, startToken: facts.startToken, sessionToken: facts.environment.sessionToken,
    harnessId: facts.harness, cwd: facts.cwd, label: facts.environment.label || `${facts.harness} session ${facts.pid}`,
    hostId: facts.environment.host, hostName: facts.environment.host, hostOs: facts.hostOs,
    plexerId: facts.environment.plexerId, plexerVersion: facts.environment.plexerVersion, handle: facts.environment.handle,
    space: facts.environment.space, now: Date.now(),
  });
  const registrationWarning = plexerRegistrationWarning(facts.environment.plexerId, facts.environment.plexerVersion);
  return { ...identity, ...(registrationWarning ? { registrationWarning } : {}), unleased: alreadyRegistered ? [] : unleasedAgents(orchDir, identity.id) };
}

export function claimIdentity(orchDir: OrchDir, params: ParamsOf<"claim-identity">, daemonToken: string): ClaimIdentityResponse {
  const facts = callerFacts(params, daemonToken);
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
