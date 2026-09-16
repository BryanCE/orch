// A human's approval of one exact action, recorded by orchd. The prompt runs in
// the caller's terminal; the rows that record the answer are written here.
import { hostOs } from "../../../host.ts";
import { ensureHost } from "../../../store/agent-rows.ts";
import { approveGrantRequest, denyGrantRequest, pendingGrantRequest, pendingGrantRequests, recordGrantRequest, spendGrant } from "../../../store/grant-rows.ts";
import type { OrchDir } from "../../../types/core.ts";
import type { ParamsOf, ResultOf } from "../../client/protocol.ts";

export function listGrants(directory: OrchDir): ResultOf<"grants"> {
  return { requests: pendingGrantRequests(directory) };
}

/** The host row the approval points at: the machine that had the terminal. */
export function decideGrant(directory: OrchDir, params: ParamsOf<"grant">): ResultOf<"grant"> {
  const request = pendingGrantRequest(directory, params.target);
  if (request === null) throw new Error(`no pending request ${params.target}; 'orch grant --list' shows what is waiting.`);
  if (params.decision === "deny") {
    denyGrantRequest(directory, request.id);
    return { id: request.id, decision: "deny", expiresAt: null };
  }
  ensureHost(directory, params.host, params.host, hostOs(), Date.now());
  return { id: request.id, decision: "approve", expiresAt: approveGrantRequest(directory, request.id, params.host) };
}

/** Spend an approval of exactly this action, or record the request a human quotes back. */
export function admitHome(directory: OrchDir, params: ParamsOf<"admit-home">): ResultOf<"admit-home"> {
  const actor = params.actor ?? null;
  if (spendGrant(directory, params.action, actor)) return { granted: true };
  return { granted: false, requestId: recordGrantRequest(directory, params.action, actor).id };
}
