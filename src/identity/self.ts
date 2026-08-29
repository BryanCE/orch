import { tryParseIdentity } from "../backends/identity.ts";
import { agentIdBySessionToken } from "../store/agent-rows.ts";
import { allAdapters } from "../adapters/registry.ts";
import type { AgentAdapter } from "../adapters/adapter.ts";
import { optionalString } from "../util.ts";
import { orchDir } from "../presence/writer.ts";

/**
 * Who this process is, as ONE answer for the whole CLI.
 *
 * Identity is the minted id and nothing else (TASKS/01). Where the process runs
 * — plexer, workspace, pane handle, cwd — is ENVIRONMENT: recorded as columns on
 * the agent row, never consulted to work out who someone is. Asking the plexer
 * "who am I" is what produced `<backend>~<workspace>~operator`, an id that named
 * an environment and matched no stored record, so orch refused its own fleet.
 *
 * Orch mints exactly once, in `hello`. Everything here READS that record.
 */
/**
 * The harness session this `orch` process runs inside, as that harness's OWN
 * adapter declares it. Orch names no harness here (Rule 9): an adapter that
 * exports a session marker owns the env vocabulary, one that declares none has
 * no session identity, and adding a harness edits zero files outside its adapter.
 *
 * This is ENVIRONMENT — where the caller is running. The only identity it yields
 * is the token used to look up the id orch already minted.
 */
export interface CallerSession {
  readonly harnessId: string;
  /** Stable per-session token, when the harness exports one. */
  readonly sessionId: string | null;
  /** The session's own pid, when it exports one. NEVER `process.ppid`: that is
   *  the shell orch was run from, which differs on every invocation. */
  readonly pid: number | null;
}

export function callerSession(adapters: readonly AgentAdapter[] = allAdapters()): CallerSession | null {
  const marked = adapters.find((adapter) =>
    adapter.sessionEnvMarker !== undefined && optionalString(process.env[adapter.sessionEnvMarker]) !== undefined);
  if (!marked) return null;
  const sessionId = marked.sessionIdEnv ? optionalString(process.env[marked.sessionIdEnv]) ?? null : null;
  const rawPid = marked.sessionPidEnv ? optionalString(process.env[marked.sessionPidEnv]) : undefined;
  const pid = rawPid !== undefined && /^[0-9]+$/.test(rawPid) ? Number(rawPid) : null;
  return { harnessId: marked.id, sessionId, pid: pid !== null && pid > 0 ? pid : null };
}

export interface SelfIdentity {
  /** The id orch minted. Opaque, immutable, plexer-independent. */
  readonly id: string;
}

/** The id orch handed this process, or null when orch has never registered it. */
export function selfIdentity(): SelfIdentity | null {
  // A spawned agent was handed its own id at launch; that IS orch's record of it.
  const spawned = tryParseIdentity(process.env.ORCH_AGENT_KEY);
  if (spawned) return { id: spawned.id };
  // A driving session: its harness's session token is the pointer to the row
  // `hello` minted. The token is environment; the id it resolves to is identity.
  const token = callerSession()?.sessionId;
  if (!token) return null;
  const id = agentIdBySessionToken(orchDir(), token);
  return id === null ? null : { id };
}

/** The id to stamp as owner/actor on a write, or undefined when unregistered. */
export function selfId(): string | undefined {
  return selfIdentity()?.id;
}
