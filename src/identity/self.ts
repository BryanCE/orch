import { isAgentId } from "../backends/identity.ts";
import { agentIdBySessionToken } from "../store/agent-rows.ts";
import { allAdapters } from "../adapters/registry.ts";
import { optionalString } from "../util.ts";
import { orchDir } from "../presence/writer.ts";
import type { AgentAdapter } from "../types/adapter.ts";
import type { CallerSession, SelfIdentity } from "../types/core.ts";

export function callerSession(adapters: readonly AgentAdapter[] = allAdapters()): CallerSession | null {
  const marked = adapters.find((adapter) =>
    adapter.sessionEnvMarker !== undefined && optionalString(process.env[adapter.sessionEnvMarker]) !== undefined);
  if (!marked) return null;
  const sessionId = marked.sessionIdEnv ? optionalString(process.env[marked.sessionIdEnv]) ?? null : null;
  const rawPid = marked.sessionPidEnv ? optionalString(process.env[marked.sessionPidEnv]) : undefined;
  const pid = rawPid !== undefined && /^[0-9]+$/.test(rawPid) ? Number(rawPid) : null;
  return { harnessId: marked.id, sessionId, pid: pid !== null && pid > 0 ? pid : null };
}

/** The id orch handed this process, or null when orch has never registered it. */
export function selfIdentity(): SelfIdentity | null {
  // A spawned agent was handed its own id at launch; that IS orch's record of it.
  // The key is the whole id, so there is nothing to parse out of it — and a key
  // that is not a minted id names no agent orch ever registered.
  const spawned = process.env.ORCH_AGENT_KEY;
  if (isAgentId(spawned)) return { id: spawned };
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
