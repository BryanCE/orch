import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { orm, withTransaction } from "./connection.ts";
import { questions } from "../db/schema.ts";

export type QuestionRow = typeof questions.$inferSelect;

/** Record a new pending question, superseding any question this agent left open. */
export function recordQuestion(
  directory: string,
  input: { id: string; agentId: string; question: string; askedAt: number },
): void {
  withTransaction(directory, () => {
    orm(directory).update(questions)
      .set({ answeredAt: input.askedAt, answer: null })
      .where(and(eq(questions.agentId, input.agentId), isNull(questions.answeredAt)))
      .run();
    orm(directory).insert(questions).values({
      id: input.id,
      agentId: input.agentId,
      question: input.question,
      askedAt: input.askedAt,
      answeredAt: null,
      answer: null,
    }).run();
  });
}

/** Settle an open question, rejecting late and duplicate answers. */
export function settleQuestion(
  directory: string,
  input: { id: string; answer: string; answeredAt: number },
): boolean {
  const result = orm(directory).update(questions)
    .set({ answeredAt: input.answeredAt, answer: input.answer })
    .where(and(eq(questions.id, input.id), isNull(questions.answeredAt)))
    .run();
  return Number(result.changes) === 1;
}

export function pendingQuestion(directory: string, agentId: string): QuestionRow | undefined {
  return orm(directory).select().from(questions)
    .where(and(eq(questions.agentId, agentId), isNull(questions.answeredAt)))
    .orderBy(desc(questions.askedAt), asc(questions.id))
    .limit(1)
    .get();
}

export function pendingQuestions(directory: string): QuestionRow[] {
  return orm(directory).select().from(questions)
    .where(isNull(questions.answeredAt))
    .orderBy(desc(questions.askedAt), asc(questions.id))
    .all();
}
