import { hostname } from "node:os";
import { dirname, join } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isRecord } from "../../util.ts";
import { callerSession } from "../../identity/self.ts";
import { claimAgent, currentHostOs, getOrCreateSessionAgent } from "../../store/agent-rows.ts";
import { processStartToken } from "../../process-identity.ts";
import { allBackends } from "../../backends/registry.ts";
import { supportedPlexerVersion, supportedRange } from "../../backends/versions.ts";
import type { HostOs } from "../../types/store.ts";
import type { ClaimIdentityResponse, RegisterSessionResponse, UnleasedAgent } from "../../types/daemon.ts";
import { and, asc, eq, isNull, ne, notInArray } from "drizzle-orm";
import { orm } from "../../store/connection.ts";
import { agentEndings, agentLeases, agentProcesses, agents } from "../../db/schema.ts";
import { endpointPaths } from "./wire.ts";
import { RpcError } from "./wire.ts";
import { nonEmpty } from "./client.ts";

function isUnleasedAgent(value: unknown): value is UnleasedAgent {
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string";
}

/** Validate every field carried by a session registration before trusting it. */
export function isRegisterSessionResponse(value: unknown): value is RegisterSessionResponse {
  return isRecord(value)
    && typeof value.id === "string"
    && value.id.length > 0
    && typeof value.label === "string"
    && value.kind === "session"
    && Array.isArray(value.unleased)
    && value.unleased.every(isUnleasedAgent)
    && (value.registrationWarning === undefined || typeof value.registrationWarning === "string");
}
/** Print the startup adoption hint once for each session identity. The writer seam keeps
 * command output testable without changing the wire response. */
export function announceUnleasedAgents(
  orchDir: string,
  identity: RegisterSessionResponse,
  write: (text: string) => void = (text) => { process.stdout.write(text); },
): void {
  if (identity.unleased.length === 0) return;
  if (!claimUnleasedAnnouncement(orchDir, identity.id)) return;
  write(`${identity.unleased.length} unleased agent(s) exist - orch adopt ${identity.unleased[0]!.name} to take one, orch status to see them.\n`);
}

/** Where one session records that it has already been told about orphans. */
function announcementMarker(orchDir: string, sessionId: string): string {
  return join(orchDir, "announced", `${sessionId.replace(/[^A-Za-z0-9_-]/g, "_")}.json`);
}

/**
 * Claim the one announcement this session gets, or report that it is spent.
 *
 * A session outlives a single CLI process — every `orch` invocation is a new one
 * — so "once per session" cannot be a module variable; it has to be recorded.
 * Rule 11: the record is an INTEGER epoch instant, because *when* a session was
 * told is the useful fact, not merely whether.
 *
 * A marker that cannot be written announces again rather than going silent:
 * repeating a notice is a nuisance, swallowing it hides live orphaned work.
 */
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
const HOST_OS_VALUES: readonly HostOs[] = ["linux", "windows", "darwin"];

function isHostOs(value: unknown): value is HostOs {
  return typeof value === "string" && HOST_OS_VALUES.some((os) => os === value);
}

/** B9: the OS side is the CALLER's, not the daemon's. A daemon that answers with
 *  its own platform mislabels every session on the other side of a WSL boundary. */
function claimedHostOs(claim: Readonly<Record<string, unknown>>): HostOs {
  if (!isHostOs(claim.hostOs)) throw new RpcError("IDENTITY_UNAVAILABLE", "session registration requires the caller's host OS");
  return claim.hostOs;
}


export function unleasedAgents(orchDir: string, excludeId: string): UnleasedAgent[] {
  // "Unleased" is about the NEWEST holding: a closed lease beside it is history,
  // and an agent whose latest holding is still open is held.
  const held = orm(orchDir).select({ agentId: agentLeases.agentId }).from(agentLeases)
    .where(isNull(agentLeases.until)).all().map((row) => row.agentId);
  return orm(orchDir).select({ id: agents.id, name: agents.name }).from(agents)
    .leftJoin(agentEndings, eq(agentEndings.agentId, agents.id))
    .where(and(ne(agents.id, excludeId), isNull(agents.sessionToken), isNull(agentEndings.agentId),
      held.length === 0 ? undefined : notInArray(agents.id, held)))
    .orderBy(asc(agents.id)).all();
}

/**
 * The caller's session process, proven. A pid alone is not proof: `orch` is
 * short-lived and pids are reused, so the OS start token is what makes the pair
 * name one process instance and not merely one number.
 */
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

/**
 * The environment facts a caller reports about itself. The daemon runs in ONE
 * place and the caller may be in another, so it never observes these on the
 * caller's behalf — it only normalizes what
 * arrived. An absent or blank fact is `null`, never a sentinel string.
 */
function claimedEnvironment(claim: Record<string, unknown>): {
  sessionToken: string | null; label: string; host: string;
  plexerId: string | null; plexerVersion: string | null; space: string | null;
} {
  return {
    sessionToken: typeof claim.sessionToken === "string" && claim.sessionToken.length > 0 ? claim.sessionToken : null,
    label: typeof claim.label === "string" ? claim.label.trim() : "",
    host: typeof claim.hostName === "string" && claim.hostName.trim().length > 0 ? claim.hostName.trim() : hostname(),
    plexerId: typeof claim.plexer === "string" ? claim.plexer.trim() : null,
    plexerVersion: typeof claim.plexerVersion === "string" ? claim.plexerVersion.trim() : null,
    space: typeof claim.space === "string" && claim.space.trim().length > 0 ? claim.space.trim() : null,
  };
}

/** Warn once, at registration, when the caller's plexer is outside the range orch supports. */
function plexerRegistrationWarning(plexerId: string | null, plexerVersion: string | null): string | undefined {
  if (!plexerId || !plexerVersion) return undefined;
  const range = supportedRange(plexerId);
  if (!range || supportedPlexerVersion(plexerId, plexerVersion)) return undefined;
  return `plexer ${plexerId} ${plexerVersion} is outside orch's supported ${range}; update orch`;
}

/** Whether this process instance has registered before. A CLI invocation is
 * short-lived while its parent session is not, so the first registration for a
 * process instance is what the startup hint keys on. */
function sessionAlreadyRegistered(orchDir: string, pid: number, startToken: string): boolean {
  return orm(orchDir).select({ id: agents.id }).from(agents)
    .innerJoin(agentProcesses, and(eq(agentProcesses.agentId, agents.id), isNull(agentProcesses.until)))
    .leftJoin(agentEndings, eq(agentEndings.agentId, agents.id))
    .where(and(eq(agentProcesses.pid, pid), eq(agentProcesses.startToken, startToken), isNull(agentEndings.agentId)))
    .limit(1).get() !== undefined;
}

interface CallerFacts {
  readonly claim: Record<string, unknown>;
  readonly pid: number;
  readonly startToken: string;
  readonly harness: string;
  readonly cwd: string;
  readonly environment: ReturnType<typeof claimedEnvironment>;
  readonly hostOs: HostOs;
}

/** Shared authenticated caller facts for both identity RPCs. */
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
    pid: facts.pid,
    startToken: facts.startToken,
    sessionToken: facts.environment.sessionToken,
    harnessId: facts.harness,
    cwd: facts.cwd,
    label: facts.environment.label || `${facts.harness} session ${facts.pid}`,
    hostId: facts.environment.host,
    hostName: facts.environment.host,
    hostOs: facts.hostOs,
    plexerId: facts.environment.plexerId,
    plexerVersion: facts.environment.plexerVersion,
    space: facts.environment.space,
    now: Date.now(),
  });
  const registrationWarning = plexerRegistrationWarning(facts.environment.plexerId, facts.environment.plexerVersion);
  return {
    ...identity,
    ...(registrationWarning ? { registrationWarning } : {}),
    unleased: alreadyRegistered ? [] : unleasedAgents(orchDir, identity.id),
  };
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
/**
 * Build the authenticated caller facts. A session presents a STABLE token the
 * harness itself carries; the process pair is only a fallback when it has none.
 * Both request and subscription handshakes build the claim HERE so they cannot
 * present different facts for the same session.
 */
export function sessionClaim(orchDir: string, label?: string): Record<string, unknown> {
  const token = readFileSync(endpointPaths(orchDir).token, "utf8").trim();
  // The calling harness identifies ITSELF through its adapter's declared env
  // vocabulary; orch names no harness here (Rule 9). An empty ORCH_HARNESS is
  // unset, not a harness named "".
  const session = callerSession();
  const configuredHarness = nonEmpty(process.env.ORCH_HARNESS?.trim());
  const harness = configuredHarness ?? session?.harnessId ?? "cli";
  // Registration carries the plexer fact observed by this session. Herdr is
  // the only versioned integration today; unknown environments simply omit it.
  // The plexer this session sits in is an environment fact (Rule 11): answered
  // by the plexer itself, never by the caller's identity.
  const callerBackend = allBackends().find((backend) => backend.paneInventory !== null && backend.isInsideSession());
  return {
    token,
    pid: session?.pid ?? process.pid,
    sessionToken: session?.sessionId ?? null,
    harness,
    cwd: process.cwd(),
    label,
    plexer: callerBackend?.id,
    plexerVersion: callerBackend?.versionInfo?.installed() ?? undefined,
    // B9: every environment fact travels in the claim. The daemon runs in ONE
    // place and the caller may be in another — a WSL daemon with a Windows-side
    // session is the case this repo lives with — so the daemon must not observe
    // the host or the space on the caller's behalf.
    space: nonEmpty(process.env.ORCH_SPACE?.trim()) ?? null,
    hostName: hostname(),
    hostOs: currentHostOs(),
  };
}
