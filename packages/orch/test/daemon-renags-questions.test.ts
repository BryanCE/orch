import { describe, expect, test } from "bun:test";
import { reaskQuestions } from "../src/daemon/work-loop.ts";
import type { QuestionRow } from "../src/store/question-rows.ts";

function question(id = "q1", askedAt = 100): QuestionRow {
  return { id, agentId: "agent1", question: "Need approval", askedAt, answeredAt: null, answer: null };
}

function run(
  questions: readonly QuestionRow[],
  nowMs: number,
  state: Map<string, { lastAskedAt: number; askCount: number; gaveUp: boolean }>,
  intervalMs = 100,
  limit = 5,
): { id: string; askCount: number; gaveUp: boolean }[] {
  const emitted: { id: string; askCount: number; gaveUp: boolean }[] = [];
  reaskQuestions({
    questions,
    nowMs,
    intervalMs,
    limit,
    state,
    emit: (row, askCount, gaveUp) => emitted.push({ id: row.id, askCount, gaveUp }),
  });
  return emitted;
}

describe("question re-ask policy", () => {
  test("nothing due emits nothing", () => {
    expect(run([question()], 199, new Map())).toEqual([]);
  });

  test("an overdue question emits its first re-ask", () => {
    expect(run([question()], 200, new Map())).toEqual([{ id: "q1", askCount: 2, gaveUp: false }]);
  });

  test("an emitted re-ask waits for the interval before emitting again", () => {
    const state = new Map<string, { lastAskedAt: number; askCount: number; gaveUp: boolean }>();
    expect(run([question()], 200, state)).toHaveLength(1);
    expect(run([question()], 299, state)).toEqual([]);
    expect(run([question()], 300, state)).toEqual([{ id: "q1", askCount: 3, gaveUp: false }]);
  });

  test("a settled question emits no further re-asks", () => {
    const state = new Map<string, { lastAskedAt: number; askCount: number; gaveUp: boolean }>();
    expect(run([question()], 100, state)).toEqual([]);
    expect(run([], 300, state)).toEqual([]);
    expect(state).toEqual(new Map());
  });

  test("the limit emits one final gave-up event and then stays silent", () => {
    const state = new Map<string, { lastAskedAt: number; askCount: number; gaveUp: boolean }>();
    expect(run([question()], 100, state)).toEqual([]);
    expect(run([question()], 200, state, 100, 3)).toEqual([{ id: "q1", askCount: 2, gaveUp: false }]);
    expect(run([question()], 300, state, 100, 3)).toEqual([{ id: "q1", askCount: 3, gaveUp: true }]);
    expect(run([question()], 400, state, 100, 3)).toEqual([]);
  });
});
