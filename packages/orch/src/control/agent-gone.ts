/**
 * The agent a write was addressed to no longer exists.
 *
 * A leaf module: the control dispatcher throws this and the outbox reads it, so
 * neither has to match on the other's message text. Every other delivery failure
 * is worth another attempt — this one never is, and retrying it forever is what
 * made one dead agent's backlog delay every live agent's dispatch.
 */
export class AgentGoneError extends Error {
  constructor(public readonly target: string, reason: string) {
    super(`cannot reach ${target}: ${reason}`);
    this.name = "AgentGoneError";
  }
}

export function isAgentGone(error: unknown): error is AgentGoneError {
  return error instanceof AgentGoneError;
}
