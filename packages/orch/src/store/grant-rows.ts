import type { OrchDir } from "../types/core.ts";
import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gt, type SQL } from "drizzle-orm";
import { orm, withTransaction } from "./connection.ts";
import { grantApprovals, grantDenials, grantRequestParams, grantRequests, grantSpends, grantStates } from "../db/schema.ts";
import type { GrantAction, GrantRequest } from "../types/store.ts";
import { isGrantKind } from "../policy/grant-sentence.ts";

/**
 * Human consent for actions an agent may not take on its own.
 *
 * An agent writes its own narration, so a human approving "what the agent says
 * it will do" is approving text. Two properties close that, and everything here
 * depends on both:
 *
 *  - The approval text is rendered from the recorded params and NOTHING else.
 *    No caller passes a description; there is no column for one.
 *  - A grant is bound to the hash of those params. Execution recomputes the hash
 *    and refuses on mismatch, so approval earned for a small action can never be
 *    spent on a larger one.
 *
 * Proving a human answered is the one deliberately pluggable part: today it is
 * that `orch grant` refuses without a terminal, and a hardware signature over
 * `canonicalAction` becomes a column on `grant_approvals`.
 */

/** How long an approval stays spendable — long enough for the agent's next
 *  command, short enough that it never outlives the exchange that earned it. */
const GRANT_TTL_MS = 10 * 60 * 1000;

/** Characters in a request id: unambiguous to read aloud and to retype. */
const ID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
const ID_LENGTH = 8;

/** Sorted `name=value` lines under the kind: the exact bytes the hash covers
 *  and, at the next attestation tier, the exact bytes a hardware key signs. */
function canonicalAction(action: GrantAction): string {
  const fields = Object.keys(action.params).sort().map((name) => `${name}=${action.params[name]}`);
  return [action.kind, ...fields].join("\n");
}

export function actionHash(action: GrantAction): string {
  return createHash("sha256").update(canonicalAction(action)).digest("hex").slice(0, 16);
}

function mintRequestId(): string {
  let id = "";
  for (const byte of randomBytes(ID_LENGTH)) id += ID_ALPHABET[byte % ID_ALPHABET.length];
  return id;
}

function paramsOf(orchDir: OrchDir, requestId: string): Record<string, string> {
  const rows = orm(orchDir)
    .select({ name: grantRequestParams.name, value: grantRequestParams.value })
    .from(grantRequestParams)
    .where(eq(grantRequestParams.requestId, requestId))
    .orderBy(grantRequestParams.name)
    .all();
  return Object.fromEntries(rows.map((row) => [row.name, row.value]));
}

/** A stored row read back as a request. An unknown kind has no sentence to
 *  render and is not a request any human could answer, so it reads as absent. */
function hydrate(orchDir: OrchDir, row: typeof grantRequests.$inferSelect): GrantRequest | null {
  if (!isGrantKind(row.kind)) return null;
  return {
    id: row.id,
    actionHash: row.actionHash,
    kind: row.kind,
    params: paramsOf(orchDir, row.id),
    requestedBy: row.requestedBy,
    requestedAt: row.requestedAt,
  };
}

/** Record a refused action and mint the id a human quotes back to approve it. */
export function recordGrantRequest(orchDir: OrchDir, action: GrantAction, requestedBy: string | null): GrantRequest {
  const id = mintRequestId();
  const hash = actionHash(action);
  const requestedAt = Date.now();
  withTransaction(orchDir, () => {
    const db = orm(orchDir);
    db.insert(grantRequests).values({ id, actionHash: hash, kind: action.kind, requestedBy, requestedAt }).run();
    const params = Object.entries(action.params).map(([name, value]) => ({ requestId: id, name, value }));
    if (params.length) db.insert(grantRequestParams).values(params).run();
  });
  return { id, actionHash: hash, kind: action.kind, params: { ...action.params }, requestedBy, requestedAt };
}

/** Requests in the `pending` state, narrowed by one further condition when the
 *  caller wants a single one. The state comes from the derived view, so what
 *  counts as pending is decided in exactly one place. */
function pendingRows(orchDir: OrchDir, only?: SQL) {
  const pending = eq(grantStates.state, "pending");
  return orm(orchDir)
    .select({ request: grantRequests })
    .from(grantRequests)
    .innerJoin(grantStates, eq(grantStates.requestId, grantRequests.id))
    .where(only ? and(pending, only) : pending);
}

/** Every request still awaiting an answer, newest first. */
export function pendingGrantRequests(orchDir: OrchDir): GrantRequest[] {
  const rows = pendingRows(orchDir).orderBy(desc(grantRequests.requestedAt)).all();
  return rows.map((row) => hydrate(orchDir, row.request)).filter((request): request is GrantRequest => request !== null);
}

export function pendingGrantRequest(orchDir: OrchDir, id: string): GrantRequest | null {
  const row = pendingRows(orchDir, eq(grantRequests.id, id)).get();
  return row ? hydrate(orchDir, row.request) : null;
}

/** Approve one exact action. `hostId` records where the human answered, which is
 *  the machine that must have had a terminal for the approval to exist at all. */
export function approveGrantRequest(orchDir: OrchDir, requestId: string, hostId: string): number {
  const approvedAt = Date.now();
  const expiresAt = approvedAt + GRANT_TTL_MS;
  orm(orchDir).insert(grantApprovals).values({ requestId, approvedAt, expiresAt, hostId }).run();
  return expiresAt;
}

export function denyGrantRequest(orchDir: OrchDir, requestId: string): void {
  orm(orchDir).insert(grantDenials).values({ requestId, deniedAt: Date.now() }).run();
}

/**
 * Spend a human's approval of exactly this action. The hash is recomputed from
 * what is about to execute, so approval of one action can never be spent on
 * another, and the insert into `grant_spends` is what makes it single-use: its
 * primary key rejects a second spend rather than trusting a caller to check.
 */
export function spendGrant(orchDir: OrchDir, action: GrantAction, spentBy: string | null): boolean {
  return withTransaction(orchDir, () => {
    const approved = approvedRequestId(orchDir, action);
    if (approved === undefined) return false;
    orm(orchDir).insert(grantSpends).values({ requestId: approved, spentAt: Date.now(), spentBy }).run();
    return true;
  });
}

/** The newest unexpired, unspent approval of exactly this action. */
function approvedRequestId(orchDir: OrchDir, action: GrantAction): string | undefined {
  return orm(orchDir)
    .select({ requestId: grantStates.requestId })
    .from(grantStates)
    .where(and(
      eq(grantStates.actionHash, actionHash(action)),
      eq(grantStates.state, "approved"),
      gt(grantStates.expiresAt, Date.now()),
    ))
    .orderBy(desc(grantStates.requestedAt))
    .limit(1)
    .get()?.requestId;
}

/** Whether a human approved exactly this action and the approval is still unspent. */
export function grantIsApproved(orchDir: OrchDir, action: GrantAction): boolean {
  return approvedRequestId(orchDir, action) !== undefined;
}

/** The request already awaiting a human for exactly this action, or a new one. */
export function requestGrant(orchDir: OrchDir, action: GrantAction, requestedBy: string | null): GrantRequest {
  const row = pendingRows(orchDir, eq(grantRequests.actionHash, actionHash(action))).get();
  const pending = row ? hydrate(orchDir, row.request) : null;
  return pending ?? recordGrantRequest(orchDir, action, requestedBy);
}

