// Councils, their members and each member's review of each round.
import { and, asc, eq, isNull, max } from "drizzle-orm";
import { councilMembers, councilReviews, councils } from "../db/schema.ts";
import { orm, withTransaction } from "./connection.ts";
import type { CouncilMember, CouncilRecord, ReviewOutcome, ReviewRecord } from "../types/council.ts";
import type { OrchDir } from "../types/core.ts";

/** Record a new council with its members. One write: a council is never stored without them. */
export function insertCouncil(orchDir: OrchDir, council: CouncilRecord, members: readonly CouncilMember[]): void {
  withTransaction(orchDir, () => {
    const db = orm(orchDir);
    db.insert(councils).values(council).run();
    for (const member of members) db.insert(councilMembers).values({ ...member, councilId: council.id }).run();
  });
}

/** The council whose directory is `directory`, open or closed. */
export function councilAt(orchDir: OrchDir, directory: string): CouncilRecord | undefined {
  return orm(orchDir).select().from(councils).where(eq(councils.directory, directory)).get();
}

/** The agents that sit on a council, by name. */
export function councilMembersOf(orchDir: OrchDir, councilId: string): CouncilMember[] {
  return orm(orchDir).select({ agentId: councilMembers.agentId, name: councilMembers.name }).from(councilMembers).where(eq(councilMembers.councilId, councilId)).orderBy(asc(councilMembers.name)).all();
}

/** Close a council. A closed council takes no further round. */
export function closeCouncil(orchDir: OrchDir, councilId: string, now: number): void {
  orm(orchDir).update(councils).set({ closedAt: now }).where(and(eq(councils.id, councilId), isNull(councils.closedAt))).run();
}

/** The number of the council's newest round, or 0 before its first. */
export function lastRound(orchDir: OrchDir, councilId: string): number {
  const row = orm(orchDir).select({ round: max(councilReviews.round) }).from(councilReviews).where(eq(councilReviews.councilId, councilId)).get();
  return row?.round ?? 0;
}

/** Record that a round's prompt went to a member. The review waits for that run to finish. */
export function askReview(orchDir: OrchDir, review: Pick<ReviewRecord, "dispatchId" | "councilId" | "round" | "member" | "askedAt">): void {
  orm(orchDir).insert(councilReviews).values(review).run();
}

/** The review a dispatch asked for, with its council, while it still waits for its run to finish. */
export function waitingReview(orchDir: OrchDir, dispatchId: string): { readonly review: ReviewRecord; readonly council: CouncilRecord } | undefined {
  return orm(orchDir).select({ review: councilReviews, council: councils }).from(councilReviews)
    .innerJoin(councils, eq(councils.id, councilReviews.councilId))
    .where(and(eq(councilReviews.dispatchId, dispatchId), isNull(councilReviews.scoredAt))).get();
}

/** Settle a waiting review. A review is scored once: a second call changes nothing. */
export function scoreReview(orchDir: OrchDir, dispatchId: string, now: number, outcome: ReviewOutcome): void {
  const values = "score" in outcome ? { score: outcome.score, problem: null } : { score: null, problem: outcome.problem };
  orm(orchDir).update(councilReviews).set({ ...values, scoredAt: now }).where(and(eq(councilReviews.dispatchId, dispatchId), isNull(councilReviews.scoredAt))).run();
}

/** Every review of a council, by round and then by member. */
export function councilReviewsOf(orchDir: OrchDir, councilId: string): ReviewRecord[] {
  return orm(orchDir).select().from(councilReviews).where(eq(councilReviews.councilId, councilId)).orderBy(asc(councilReviews.round), asc(councilReviews.member)).all();
}
