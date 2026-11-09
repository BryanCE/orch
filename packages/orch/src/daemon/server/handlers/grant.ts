// A human's approval of one exact action, recorded by orchd. The prompt runs in
// the caller's terminal; the rows that record the answer are written here.
import { ensureHost } from "../../../store/agent-rows.ts";
import { approveGrantRequest, denyGrantRequest, grantIsApproved, pendingGrantRequest, pendingGrantRequests, recordGrantRequest } from "../../../store/grant-rows.ts";
import type { OrchDir } from "../../../types/core.ts";
import { hostIdentity } from "../../../hosts/identity.ts";
import type { ParamsOf, ResultOf } from "../../client/protocol.ts";
import type { GrantAction } from "../../../types/store.ts";

export function listGrants(directory: OrchDir): ResultOf<"grants"> {
  return { requests: pendingGrantRequests(directory) };
}

/** The host row the approval points at: the machine that had the terminal, which is orchd's own,
 *  because a CLI only dials its own host's orchd. */
export function decideGrant(directory: OrchDir, params: ParamsOf<"grant">): ResultOf<"grant"> {
  const request = pendingGrantRequest(directory, params.target);
  if (request === null) throw new Error(`no pending request ${params.target}; 'orch grant list' shows what is waiting.`);
  if (params.decision === "deny") {
    denyGrantRequest(directory, request.id);
    return { id: request.id, decision: "deny", expiresAt: null };
  }
  const host = hostIdentity();
  ensureHost(directory, host, Date.now());
  return { id: request.id, decision: "approve", expiresAt: approveGrantRequest(directory, request.id, host.id) };
}

/** Whether an unspent approval of exactly this action exists, or record the request a human
 *  quotes back, asked by `actor`. Nothing is spent here: recording the home spends the approval
 *  once the home has opened. */
export function admitHome(directory: OrchDir, action: GrantAction, actor: string | null): { readonly granted: true } | { readonly granted: false; readonly requestId: string } {
  if (grantIsApproved(directory, action)) return { granted: true };
  return { granted: false, requestId: recordGrantRequest(directory, action, actor).id };
}
