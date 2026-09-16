import { agentIdByProcess, agentIdBySessionToken } from "../store/agent-rows.ts";
import { environmentOf } from "../store/agent-view.ts";
import { callerCredential } from "./credential.ts";
import type { CallerCredential, OrchDir, SelfIdentity } from "../types/core.ts";

/** The agent a credential names, resolved against the store. orchd's half of identity. */
export function selfIdentityOf(orchDir: OrchDir, credential: CallerCredential): SelfIdentity | null {
  // A spawned agent was handed its own id at launch; that IS orch's record of it.
  // The key is the whole id, so there is nothing to parse out of it — and a key
  // that is not a minted id names no agent orch ever registered.
  if (credential.launch !== null) return { id: credential.launch };
  // A driving session: its harness's session token is the pointer to the row
  // `register-session` minted. The token is environment; the id it resolves to is identity.
  const token = credential.session?.sessionId;
  if (token) {
    const id = agentIdBySessionToken(orchDir, token);
    return id === null ? null : { id };
  }
  // No token: the session IS a process — the harness's own, or the shell that
  // ran this command. Registration filed it under that process, so this
  // resolves the same way, and a plain terminal inside a plexer has an id.
  if (credential.process.startToken === null) return null;
  const id = agentIdByProcess(orchDir, credential.process.pid, credential.process.startToken);
  return id === null ? null : { id };
}

/** The id orch handed this process, or null when orch has never registered it. */
export function selfIdentity(orchDir: OrchDir): SelfIdentity | null {
  return selfIdentityOf(orchDir, callerCredential());
}

/** The id to stamp as owner/actor on a write, or undefined when unregistered. */
export function selfId(orchDir: OrchDir): string | undefined {
  return selfIdentity(orchDir)?.id;
}

/** The space one agent is composed into. A missing row is a real ANSWER: an
 *  agent in no space is unscoped, and inventing a place for it is exactly what
 *  produced the fictional "local" (Rule 11, A7). */
export function spaceOfAgent(orchDir: OrchDir, id: string): string | null {
  try {
    return environmentOf(orchDir, id).space;
  } catch {
    return null;
  }
}

/** The space the credential's agent is composed into; null for an unregistered caller. */
export function callerSpaceOf(orchDir: OrchDir, credential: CallerCredential): string | null {
  const id = selfIdentityOf(orchDir, credential)?.id;
  return id === undefined ? null : spaceOfAgent(orchDir, id);
}

/**
 * The caller's own space, read off the caller's own agent record.
 *
 * It lives beside {@link selfId} because it is the same question — where the
 * calling process sits is ENVIRONMENT, read from the agent it IS, never a field
 * on its identity. Asking the PLEXER "which workspace am I in" answers with a
 * plexer coordinate, which is environment wearing identity's hat (Rule 11); and
 * a second copy that asked the backend instead of resolving the minted id could
 * not see a driving session, which carries no launch credential at all.
 */
export function callerSpace(orchDir: OrchDir): string | null {
  return callerSpaceOf(orchDir, callerCredential());
}
