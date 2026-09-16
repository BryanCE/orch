// Whether a caller may drive an agent: it holds the open lease, or it is the
// human operator of the agent's space. Ownership is the lease and nothing else (Rule 11).
import { selfIdentityOf, spaceOfAgent } from "../identity/self.ts";
import { callerKindOf } from "./caller.ts";
import { operatorControls } from "./space.ts";
import type { CallerCredential, OrchDir } from "../types/core.ts";

export function callerOwns(directory: OrchDir, credential: CallerCredential, agentId: string, holder: string | null): boolean {
  const token = selfIdentityOf(directory, credential)?.id;
  if (token === undefined) return false;
  if (holder === token) return true;
  return callerKindOf(directory, credential) !== "agent"
    && operatorControls(directory, token, agentId, spaceOfAgent(directory, token), true);
}
