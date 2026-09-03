import { hostname } from "node:os";
import { dirname, join } from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { isRecord } from "../../util.ts";
import { claimAgent, getOrCreateSessionAgent } from "../../store/agent-rows.ts";
import { processStartToken } from "../../process-identity.ts";
import { supportedPlexerVersion, supportedRange } from "../../backends/versions.ts";
import type { HostOs } from "../../types/store.ts";
import type { ClaimIdentityResponse, RegisterSessionResponse, UnleasedAgent } from "../../types/daemon.ts";
import { and, asc, eq, isNull, ne, notInArray } from "drizzle-orm";
import { orm } from "../../store/connection.ts";
import { agentEndings, agentLeases, agentProcesses, agents } from "../../db/schema.ts";
import { RpcError } from "./wire.ts";

export function announceUnleasedAgents(
  orchDir: string,
  identity: RegisterSessionResponse,
  write: (text: string) => void = (text) => { process.stdout.write(text); },
): void {
  if (identity.unleased.length === 0) return;
  if (!claimUnleasedAnnouncement(orchDir, identity.id)) return;
  write(`${identity.unleased.length} unleased agent(s) exist - orch adopt ${identity.unleased[0]!.name} to take one, orch status to see them.\n`);
}

function announcementMarker(orchDir: string, sessionId: string): string {
  return join(orchDir, "announced", `${sessionId.replace(/[^A-Za-z0-9_-]/g, "_")}.json`);
}

function claimUnleasedAnnouncement(orchDir: string, sessionId: string): boolean {
  const marker = announcementMarker(orchDir, sessionId);
  try {
    if (existsSync(marker)) return false;
    mkdirSync(dirname(marker), { recursive: true });
    writeFileSync(marker, JSON.stringify({ announcedAt: Date.now() }));
  } catch {
    return true;
  }
  return true;
}

function isHostOs(value: unknown): value is HostOs {
  return value === "linux" || value === "windows" || value === "darwin";
}

function claimedHostOs(claim: Readonly<Record<string, unknown>>): HostOs {
  if (!isHostOs(claim.hostOs)) throw new RpcError("IDENTITY_UNAVAILABLE", "session registration requires the caller's host OS");
  return claim.hostOs;
}

export function unleasedAgents(orchDir: string, excludeId: string): UnleasedAgent[] {
  const held = orm(orchDir).select({ agentId: agentLeases.agentId }).from(agentLeases)
    .where(isNull(agentLeases.until)).all().map((row) => row.agentId);
  return orm(orchDir).select({ id: agents.id, name: agents.name }).from(agents)
    .leftJoin(agentEndings, eq(agentEndings.agentId, agents.id))
    .where(and(ne(agents.id, excludeId), isNull(agents.sessionToken), isNull(agentEndings.agentId),
      held.length === 0 ? undefined : notInArray(agents.id, held)))
    .orderBy(asc(agents.id)).all();
}

function verifiedSessionProcess(claim: Record<string, unknown>): { pid: number; startToken: string; harness: string; cwd: string } {
  const pid = typeof claim.pid === "number" ? claim.pid : Number.NaN;
  if (!Number.isSafeInteger(pid) || pid <= 0) throw new RpcError("IDENTITY_UNAVAILABLE", "session registration requires the caller's session pid");
  const harness = typeof claim.harness === "string" ? claim.harness.trim() : "";
  const cwd = typeof claim.cwd === "string" ? claim.cwd.trim() : "";
  if (!harness || !cwd) throw new RpcError("IDENTITY_UNAVAILABLE", "session registration requires the caller's harness and cwd");
  const startToken = processStartToken(pid);
  if (!startToken) throw new RpcError("IDENTITY_UNAVAILABLE", "session registration could not verify the caller's session process");
  return { pid, startToken, harness, cwd };
}

function claimedEnvironment(claim: Record<string, unknown>): { sessionToken: string | null; label: string; host: string; plexerId: string | null; plexerVersion: string | null; space: string | null } {
  return {
    sessionToken: typeof claim.sessionToken === "string" && claim.sessionToken.length > 0 ? claim.sessionToken : null,
    label: typeof claim.label === "string" ? claim.label.trim() : "",
    host: typeof claim.hostName === "string" && claim.hostName.trim().length > 0 ? claim.hostName.trim() : hostname(),
    plexerId: typeof claim.plexer === "string" ? claim.plexer.trim() : null,
    plexerVersion: typeof claim.plexerVersion === "string" ? claim.plexerVersion.trim() : null,
    space: typeof claim.space === "string" && claim.space.trim().length > 0 ? claim.space.trim() : null,
  };
}

function plexerRegistrationWarning(plexerId: string | null, plexerVersion: string | null): string | undefined {
  if (!plexerId || !plexerVersion) return undefined;
  const range = supportedRange(plexerId);
  if (!range || supportedPlexerVersion(plexerId, plexerVersion)) return undefined;
  return `plexer ${plexerId} ${plexerVersion} is outside orch's supported ${range}; update orch`;
}

function sessionAlreadyRegistered(orchDir: string, pid: number, startToken: string): boolean {
  return orm(orchDir).select({ id: agents.id }).from(agents)
    .innerJoin(agentProcesses, and(eq(agentProcesses.agentId, agents.id), isNull(agentProcesses.until)))
    .leftJoin(agentEndings, eq(agentEndings.agentId, agents.id))
    .where(and(eq(agentProcesses.pid, pid), eq(agentProcesses.startToken, startToken), isNull(agentEndings.agentId)))
    .limit(1).get() !== undefined;
}

interface CallerFacts { readonly claim: Record<string, unknown>; readonly pid: number; readonly startToken: string; readonly harness: string; readonly cwd: string; readonly environment: ReturnType<typeof claimedEnvironment>; readonly hostOs: HostOs; }
function callerFacts(params: unknown, daemonToken: string): CallerFacts {
  const claim = isRecord(params) ? params : {};
  if (claim.token !== daemonToken) throw new RpcError("IDENTITY_REQUIRED", "identity RPC requires the daemon token");
  const { pid, startToken, harness, cwd } = verifiedSessionProcess(claim);
  return { claim, pid, startToken, harness, cwd, environment: claimedEnvironment(claim), hostOs: claimedHostOs(claim) };
}

export function registerSession(orchDir: string, params: unknown, daemonToken: string): RegisterSessionResponse {
  const facts = callerFacts(params, daemonToken);
  const alreadyRegistered = sessionAlreadyRegistered(orchDir, facts.pid, facts.startToken);
  const identity = getOrCreateSessionAgent(orchDir, {
    pid: facts.pid, startToken: facts.startToken, sessionToken: facts.environment.sessionToken,
    harnessId: facts.harness, cwd: facts.cwd, label: facts.environment.label || `${facts.harness} session ${facts.pid}`,
    hostId: facts.environment.host, hostName: facts.environment.host, hostOs: facts.hostOs,
    plexerId: facts.environment.plexerId, plexerVersion: facts.environment.plexerVersion, space: facts.environment.space, now: Date.now(),
  });
  const registrationWarning = plexerRegistrationWarning(facts.environment.plexerId, facts.environment.plexerVersion);
  return { ...identity, ...(registrationWarning ? { registrationWarning } : {}), unleased: alreadyRegistered ? [] : unleasedAgents(orchDir, identity.id) };
}

export function claimIdentity(orchDir: string, params: unknown, daemonToken: string): ClaimIdentityResponse {
  const facts = callerFacts(params, daemonToken);
  const id = typeof facts.claim.id === "string" ? facts.claim.id : "";
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
