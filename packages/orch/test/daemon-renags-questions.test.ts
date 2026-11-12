import { afterEach, describe, expect, test } from "bun:test";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { agents, harnesses } from "../src/db/schema.ts";
import { pendingQuestion, pendingQuestions, questionOptionsOf, recordQuestion } from "../src/store/question-rows.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";
import { reaskQuestions } from "../src/daemon/server/work-loop.ts";
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

const storeDirs: OrchDir[] = [];
afterEach(() => {
  closeAllStores();
  while (storeDirs.length > 0) removeTempDir(storeDirs.pop() ?? "");
});

function questionStore(): OrchDir {
  const directory = tempOrchDir("orch-question-rows-");
  storeDirs.push(directory);
  orm(directory).insert(harnesses).values({ id: "pi", name: "pi", enabledAt: null }).run();
  orm(directory).insert(agents).values({ id: "agent1", spawnedBy: null, rootAgentId: "agent1", harnessId: "pi", name: "agent1", label: null, kind: "agent", createdAt: 1 }).run();
  return directory;
}

describe("question persistence", () => {
  test("keeps multiple pending questions and supersedes them on request", () => {
    const directory = questionStore();
    recordQuestion(directory, { id: "q1", agentId: "agent1", question: "first", askedAt: 1000, options: [], supersede: false });
    recordQuestion(directory, { id: "q2", agentId: "agent1", question: "second", askedAt: 2000, options: [], supersede: false });
    expect(pendingQuestions(directory).map((row) => row.id)).toEqual(["q1", "q2"]);
    expect(pendingQuestion(directory, "agent1")?.id).toBe("q1");
    recordQuestion(directory, { id: "q3", agentId: "agent1", question: "third", askedAt: 3000, options: [], supersede: true });
    expect(pendingQuestions(directory).map((row) => row.id)).toEqual(["q3"]);
  });

  test("returns question options in offered order", () => {
    const directory = questionStore();
    recordQuestion(directory, {
      id: "q-options", agentId: "agent1", question: "Allow?", askedAt: 1000, supersede: false,
      options: [{ id: "a", label: "Allow", kind: "allow-once" }, { id: "r", label: "Reject", kind: "reject-once" }],
    });
    expect(questionOptionsOf(directory, "q-options")).toEqual([
      { id: "a", label: "Allow", kind: "allow-once" },
      { id: "r", label: "Reject", kind: "reject-once" },
    ]);
  });
});

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
