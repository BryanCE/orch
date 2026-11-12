/** What choosing an option does, in orch's own words. */
export const QUESTION_OPTION_KINDS = ["allow-once", "allow-always", "reject-once", "reject-always"] as const;
export type QuestionOptionKind = (typeof QUESTION_OPTION_KINDS)[number];

/** One choice an agent offered with a question. */
export interface QuestionOption {
  readonly id: string;
  readonly label: string;
  readonly kind: QuestionOptionKind;
}

export function isQuestionOptionKind(value: string): value is QuestionOptionKind {
  return QUESTION_OPTION_KINDS.some((kind) => kind === value);
}
