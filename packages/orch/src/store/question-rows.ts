import type { OrchDir } from "../types/core.ts";
import { and, asc, eq, isNull, type SQL } from "drizzle-orm";
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
    if (input.supersede) closeOpen(directory, eq(questions.agentId, input.agentId), input.askedAt);
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

/** Settle every open question matching `where` with no answer. */
function closeOpen(directory: OrchDir, where: SQL, at: number): void {
  orm(directory).update(questions)
    .set({ answeredAt: at, answer: null })
    .where(and(where, isNull(questions.answeredAt)))
    .run();
}

/** Close one open question with no answer, so it can never be answered. */
export function dropQuestion(directory: OrchDir, id: string, at: number): void {
  closeOpen(directory, eq(questions.id, id), at);
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

/** All open questions with their choices in stored order, read together. */
export function pendingQuestions(directory: OrchDir): (QuestionRow & { options: QuestionOption[] })[] {
  const rows = orm(directory).select().from(questions)
    .leftJoin(questionOptions, eq(questionOptions.questionId, questions.id))
    .where(isNull(questions.answeredAt))
    .orderBy(asc(questions.askedAt), asc(questions.id), asc(questionOptions.position))
    .all();
  const pending = new Map<string, QuestionRow & { options: QuestionOption[] }>();
  for (const { questions: question, question_options: option } of rows) {
    let row = pending.get(question.id);
    if (row === undefined) {
      row = { ...question, options: [] };
      pending.set(question.id, row);
    }
    if (option !== null && isQuestionOptionKind(option.kind)) {
      row.options.push({ id: option.optionId, label: option.label, kind: option.kind });
    }
  }
  return [...pending.values()];
}

/** The options a question was asked with, in the order the agent offered them. */
export function questionOptionsOf(directory: OrchDir, questionId: string): QuestionOption[] {
  return orm(directory).select().from(questionOptions)
    .where(eq(questionOptions.questionId, questionId))
    .orderBy(asc(questionOptions.position))
    .all()
    .flatMap((row) => isQuestionOptionKind(row.kind) ? [{ id: row.optionId, label: row.label, kind: row.kind }] : []);
}
