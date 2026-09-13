import { launchCredential } from "./launch.ts";
import { agentIdByProcess, agentIdBySessionToken } from "../store/agent-rows.ts";
import { environmentOf } from "../store/agent-view.ts";
import { callerSession } from "../adapters/session-env.ts";
import { callerKind } from "../policy/caller.ts";
import { processStartToken } from "../process-identity.ts";
import type { CallerSession, SelfIdentity } from "../types/core.ts";

/** The id orch handed this process, or null when orch has never registered it. */
export function selfIdentity(orchDir: string): SelfIdentity | null {
  // A spawned agent was handed its own id at launch; that IS orch's record of it.
  // The key is the whole id, so there is nothing to parse out of it — and a key
  // that is not a minted id names no agent orch ever registered.
  const spawned = launchCredential();
  if (spawned !== null) return { id: spawned };
  // A driving session: its harness's session token is the pointer to the row
  // `register-session` minted. The token is environment; the id it resolves to is identity.
  const session = callerSession();
  const token = session?.sessionId;
  if (token) {
    const id = agentIdBySessionToken(orchDir(), token);
    return id === null ? null : { id };
  }
  // No token: the session IS a process — the harness's own, or the shell that
  // ran this command. Registration filed it under that process, so this
  // resolves the same way, and a plain terminal inside a plexer has an id.
  const pid = sessionProcessPid(session);
  const startToken = processStartToken(pid);
  if (startToken === undefined) return null;
  const id = agentIdByProcess(orchDir(), pid, startToken);
  return id === null ? null : { id };
}

/** The process a driving session is: the pid its harness exports, else the
 *  shell that ran this command. Never this CLI process — that is new on every
 *  call and would make every `orch` invocation a different session. */
export function sessionProcessPid(session: CallerSession | null): number {
  return session?.pid ?? process.ppid;
}

/** The id to stamp as owner/actor on a write, or undefined when unregistered. */
export function selfId(orchDir: string): string | undefined {
  return selfIdentity(orchDir)?.id;
}

/** Register an unregistered driving harness before commands read its identity. */
export async function ensureCallerRegistered(
  orchDir: string,
  registerSession: (directory: string) => Promise<unknown>,
): Promise<void> {
  if (callerSession() === null || callerKind(orchDir) !== "session" || selfId(orchDir) !== undefined) return;
  await registerSession(orchDir);
}

/** The space one agent is composed into. A missing row is a real ANSWER: an
 *  agent in no space is unscoped, and inventing a place for it is exactly what
 *  produced the fictional "local" (Rule 11, A7). */
export function spaceOfAgent(orchDir: string, id: string): string | null {
  try {
    return environmentOf(orchDir, id).space;
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
export function callerSpace(orchDir: string): string | null {
  const id = selfId(orchDir);
  return id === undefined ? null : spaceOfAgent(orchDir, id);
}
