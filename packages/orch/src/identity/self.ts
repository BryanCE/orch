import { launchCredential } from "./launch.ts";
import { agentIdBySessionToken } from "../store/agent-rows.ts";
import { environmentOf } from "../store/agent-view.ts";
import { callerSession } from "../adapters/session-env.ts";
import { orchDir } from "../presence/writer.ts";
import type { SelfIdentity } from "../types/core.ts";

/** The id orch handed this process, or null when orch has never registered it. */
export function selfIdentity(): SelfIdentity | null {
  // A spawned agent was handed its own id at launch; that IS orch's record of it.
  // The key is the whole id, so there is nothing to parse out of it — and a key
  // that is not a minted id names no agent orch ever registered.
  const spawned = launchCredential();
  if (spawned !== null) return { id: spawned };
  // A driving session: its harness's session token is the pointer to the row
  // `register-session` minted. The token is environment; the id it resolves to is identity.
  const token = callerSession()?.sessionId;
  if (!token) return null;
  const id = agentIdBySessionToken(orchDir(), token);
  return id === null ? null : { id };
}

/** The id to stamp as owner/actor on a write, or undefined when unregistered. */
export function selfId(): string | undefined {
  return selfIdentity()?.id;
}

/** The space one agent is composed into. A missing row is a real ANSWER: an
 *  agent in no space is unscoped, and inventing a place for it is exactly what
 *  produced the fictional "local" (Rule 11, A7). */
export function spaceOfAgent(id: string): string | null {
  try {
    return environmentOf(orchDir(), id).space;
  } catch {
    return null;
  }
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
export function callerSpace(): string | null {
  const id = selfId();
  return id === undefined ? null : spaceOfAgent(id);
}
