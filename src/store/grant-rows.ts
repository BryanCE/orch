import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gt, type SQL } from "drizzle-orm";
import { orm, withTransaction } from "./connection.ts";
import { grantApprovals, grantDenials, grantRequestParams, grantRequests, grantSpends, grantStates } from "./tables.ts";

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

/** Every action requiring consent. A union, so adding one fails to compile until
 *  it has a sentence a human can read. */
export type GrantKind = "spawn.new-space";

/** What a human is shown for each action, in orch's words and never a caller's. */
const ACTION_SENTENCE: Record<GrantKind, string> = {
  "spawn.new-space": "open a NEW space on your screen and spawn agents into it",
};

/**
 * One consequential action. `params` is the whole truth of what will execute:
 * the approval renders from it and the binding hash covers it, so a field left
 * out is a field the human never saw and the gate never checked.
 */
export interface GrantAction {
  readonly kind: GrantKind;
  readonly params: Readonly<Record<string, string>>;
}

/** A refused action, recorded so a human can read what was actually asked for. */
export interface GrantRequest {
  readonly id: string;
  readonly actionHash: string;
  readonly kind: GrantKind;
  readonly params: Record<string, string>;
  /** Which agent asked, for provenance only — never rendered as the action. */
  readonly requestedBy: string | null;
  readonly requestedAt: number;
}

function isGrantKind(value: string): value is GrantKind {
  return value in ACTION_SENTENCE;
}

/** Sorted `name=value` lines under the kind: the exact bytes the hash covers
 *  and, at the next attestation tier, the exact bytes a hardware key signs. */
export function canonicalAction(action: GrantAction): string {
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

function paramsOf(orchDir: string, requestId: string): Record<string, string> {
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
function hydrate(orchDir: string, row: typeof grantRequests.$inferSelect): GrantRequest | null {
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
export function recordGrantRequest(orchDir: string, action: GrantAction, requestedBy: string | null): GrantRequest {
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
function pendingRows(orchDir: string, only?: SQL) {
  const pending = eq(grantStates.state, "pending");
  return orm(orchDir)
    .select({ request: grantRequests })
    .from(grantRequests)
    .innerJoin(grantStates, eq(grantStates.requestId, grantRequests.id))
    .where(only ? and(pending, only) : pending);
}

/** Every request still awaiting an answer, newest first. */
export function pendingGrantRequests(orchDir: string): GrantRequest[] {
  const rows = pendingRows(orchDir).orderBy(desc(grantRequests.requestedAt)).all();
  return rows.map((row) => hydrate(orchDir, row.request)).filter((request): request is GrantRequest => request !== null);
}

export function pendingGrantRequest(orchDir: string, id: string): GrantRequest | null {
  const row = pendingRows(orchDir, eq(grantRequests.id, id)).get();
  return row ? hydrate(orchDir, row.request) : null;
}

/** Approve one exact action. `hostId` records where the human answered, which is
 *  the machine that must have had a terminal for the approval to exist at all. */
export function approveGrantRequest(orchDir: string, requestId: string, hostId: string): number {
  const approvedAt = Date.now();
  const expiresAt = approvedAt + GRANT_TTL_MS;
  orm(orchDir).insert(grantApprovals).values({ requestId, approvedAt, expiresAt, hostId }).run();
  return expiresAt;
}

export function denyGrantRequest(orchDir: string, requestId: string): void {
  orm(orchDir).insert(grantDenials).values({ requestId, deniedAt: Date.now() }).run();
}

/**
 * Spend a human's approval of exactly this action. The hash is recomputed from
 * what is about to execute, so approval of one action can never be spent on
 * another, and the insert into `grant_spends` is what makes it single-use: its
 * primary key rejects a second spend rather than trusting a caller to check.
 */
export function spendGrant(orchDir: string, action: GrantAction, spentBy: string | null): boolean {
  return withTransaction(orchDir, () => {
    const db = orm(orchDir);
    const approved = db
      .select({ requestId: grantStates.requestId })
      .from(grantStates)
      .where(and(
        eq(grantStates.actionHash, actionHash(action)),
        eq(grantStates.state, "approved"),
        gt(grantStates.expiresAt, Date.now()),
      ))
      .orderBy(desc(grantStates.requestedAt))
      .limit(1)
      .get();
    if (!approved) return false;
    db.insert(grantSpends).values({ requestId: approved.requestId, spentAt: Date.now(), spentBy }).run();
    return true;
  });
}

/** What a human reads before approving: orch's own sentence for the action, then
 *  the params that will execute, verbatim. The requester names itself on its own
 *  line and never gets to describe the action. */
export function renderGrantRequest(request: GrantRequest): string {
  const fields = Object.keys(request.params).sort()
    .map((name) => `    ${name.padEnd(10)} ${request.params[name]}`);
  return [
    `  ${request.id}  ${request.kind}`,
    `    action     ${ACTION_SENTENCE[request.kind]}`,
    ...fields,
    `    requested  by ${request.requestedBy ?? "an unregistered caller"}`,
  ].join("\n");
}
