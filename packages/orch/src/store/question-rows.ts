import type { OrchDir } from "../types/core.ts";
import { and, asc, eq, isNull } from "drizzle-orm";
import { orm, withTransaction } from "./connection.ts";
import { questionOptions, questions } from "../db/schema.ts";
import { isQuestionOptionKind, type QuestionOption } from "../types/question.ts";

export type QuestionRow = typeof questions.$inferSelect;

/** Record a new pending question with the options the agent offered. With `supersede`, every question this agent left open is settled unanswered first: the asker can wait on only one. */
export function recordQuestion(
  directory: OrchDir,
  input: { id: string; agentId: string; question: string; askedAt: number; options: readonly QuestionOption[]; supersede: boolean },
): void {
  withTransaction(directory, () => {
    if (input.supersede) {
      orm(directory).update(questions)
        .set({ answeredAt: input.askedAt, answer: null })
        .where(and(eq(questions.agentId, input.agentId), isNull(questions.answeredAt)))
        .run();
    }
    orm(directory).insert(questions).values({
      id: input.id,
      agentId: input.agentId,
      question: input.question,
      askedAt: input.askedAt,
      answeredAt: null,
      answer: null,
    }).run();
    input.options.forEach((option, position) => {
      orm(directory).insert(questionOptions).values({
        questionId: input.id,
        position,
        optionId: option.id,
        label: option.label,
        kind: option.kind,
      }).run();
    });
  });
}

/** Settle an open question, rejecting late and duplicate answers. */
export function settleQuestion(
  directory: OrchDir,
  input: { id: string; answer: string; answeredAt: number },
): boolean {
  const result = orm(directory).update(questions)
    .set({ answeredAt: input.answeredAt, answer: input.answer })
    .where(and(eq(questions.id, input.id), isNull(questions.answeredAt)))
    .run();
  return Number(result.changes) === 1;
}

/** The oldest question this agent has open. */
export function pendingQuestion(directory: OrchDir, agentId: string): QuestionRow | undefined {
  return orm(directory).select().from(questions)
    .where(and(eq(questions.agentId, agentId), isNull(questions.answeredAt)))
    .orderBy(asc(questions.askedAt), asc(questions.id))
    .limit(1)
    .get();
}

export function pendingQuestions(directory: OrchDir): QuestionRow[] {
  return orm(directory).select().from(questions)
    .where(isNull(questions.answeredAt))
    .orderBy(asc(questions.askedAt), asc(questions.id))
    .all();
}

/** The options a question was asked with, in the order the agent offered them. */
export function questionOptionsOf(directory: OrchDir, questionId: string): QuestionOption[] {
  return orm(directory).select().from(questionOptions)
    .where(eq(questionOptions.questionId, questionId))
    .orderBy(asc(questionOptions.position))
    .all()
    .flatMap((row) => isQuestionOptionKind(row.kind) ? [{ id: row.optionId, label: row.label, kind: row.kind }] : []);
}
