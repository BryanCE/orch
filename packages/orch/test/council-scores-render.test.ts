import { describe, expect, test } from "bun:test";
import { renderScores } from "../src/commands/council.ts";
import type { ResultOf } from "../src/daemon/client/protocol.ts";

type Scores = ResultOf<"council-scores">;
const review = (round: number, member: string, over: Partial<Scores["reviews"][number]> = {}): Scores["reviews"][number] => ({ round, member, score: null, problem: null, scoredAt: null, model: null, cost: null, ...over });
const scores = (reviews: Scores["reviews"], over: Partial<Scores> = {}): Scores => ({ name: "plan", directory: "/c/plan", scale: 10, stop: { stop: "rounds", rounds: 3 }, stopped: null, closedAt: null, members: ["ada", "bea"], reviews, ...over });
const cells = (line: string) => line.trim().split(/\s{2,}/);

describe("council scores table", () => {
  test("renders no rounds", () => {
    expect(renderScores(scores([]))).toBe("Council plan, open. 0 rounds run. It stops after 3 rounds. Scores are out of 10.");
  });

  test("names the target and patience of a council in score mode", () => {
    expect(renderScores(scores([], { stop: { stop: "score", targetScore: 9, patience: 1 } }))).toBe("Council plan, open. 0 rounds run. It stops at a mean of 9, or after 2 rounds in a row without a rise. Scores are out of 10.");
  });

  test("shows a closed council", () => {
    expect(renderScores(scores([], { closedAt: 5 })).split("\n")[0]).toBe("Council plan, closed. 0 rounds run. It stops after 3 rounds. Scores are out of 10.");
  });

  test("renders multiple rounds, models, and costs", () => {
    const lines = renderScores(scores([
      review(1, "ada", { score: 6, scoredAt: 2, model: "gpt-6-sol", cost: 0.1 }),
      review(1, "bea", { score: 8, scoredAt: 2, model: "opus", cost: 0.25 }),
      review(2, "ada", { score: 9, scoredAt: 4, model: "gpt-6-sol", cost: 0.2 }),
      review(2, "bea"),
    ])).split("\n");
    expect(lines).toHaveLength(6);
    expect(lines[0]).toBe("Council plan, open. 2 rounds run. It stops after 3 rounds. Scores are out of 10.");
    expect(cells(lines[1]!)).toEqual(["MEMBER", "MODEL", "R1", "R2", "COST"]);
    expect(cells(lines[3]!)).toEqual(["ada", "gpt-6-sol", "6", "9", "$0.30"]);
    expect(cells(lines[4]!)).toEqual(["bea", "opus", "8", "running", "$0.25"]);
    expect(cells(lines[5]!)).toEqual(["mean", "7.0", "9.0", "$0.55"]);
  });

  test("reports a file without a score", () => {
    const lines = renderScores(scores([
      review(1, "ada", { problem: "the file has no `Score: <n>/10` line", scoredAt: 2 }),
      review(1, "bea", { score: 8, scoredAt: 2 }),
    ])).split("\n");
    expect(cells(lines[3]!)).toEqual(["ada", "-", "?", "-"]);
    expect(cells(lines[5]!)).toEqual(["mean", "8.0", "-"]);
    expect(lines[6]).toBe("Round 1, ada: the file has no `Score: <n>/10` line.");
  });

  test("prints why a stopped council takes no round under the table", () => {
    const lines = renderScores(scores([review(1, "ada", { score: 9, scoredAt: 2 })], { stopped: "reached 9.0, at or above council.target_score 9. Close it, or raise council.target_score to go on" })).split("\n");
    expect(lines.at(-1)).toBe("Council plan reached 9.0, at or above council.target_score 9. Close it, or raise council.target_score to go on.");
  });

  test("shows a dash for a member without a review", () => {
    const lines = renderScores(scores([review(1, "ada", { score: 5, scoredAt: 2 })])).split("\n");
    expect(cells(lines[4]!)).toEqual(["bea", "-", "-", "-"]);
  });
});
