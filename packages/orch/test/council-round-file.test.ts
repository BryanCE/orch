import { describe, expect, test } from "bun:test";
import { parseRoundFile, roundFileLayout, roundFileName } from "../src/council/round-file.ts";

describe("council round file", () => {
  test("names and layouts", () => {
    expect(roundFileName(1)).toBe("round-1.md");
    expect(roundFileName(12)).toBe("round-12.md");
    expect(roundFileLayout(10)).toBe("Score: <a whole number from 0 to 10>/10\n\n## Checks\n\n- <check id> <PASS, FAIL or N/A> <file:line> <what it shows>\n\n## Improvements\n\n1. <the change that would raise the score most>\n2. <the next one>");
    expect(roundFileLayout(5)).toContain("from 0 to 5>/5");
  });

  test("parses improvements and continuations", () => {
    expect(parseRoundFile("# Review\n\nScore: 7/10\n\n## Improvements\n\n1. Name the owner of each step.\n2. Cut the second table.\n", 10)).toEqual({ ok: true, review: { score: 7, improvements: ["Name the owner of each step.", "Cut the second table."] } });
    expect(parseRoundFile("Score: 3/5\n## Improvements\n1. First line\n   second line\n\n2. Next\n", 5)).toEqual({ ok: true, review: { score: 3, improvements: ["First line second line", "Next"] } });
    expect(parseRoundFile("Score:  9 / 10  \r\n## Improvements\r\n1. One\r\n", 10)).toEqual({ ok: true, review: { score: 9, improvements: ["One"] } });
    expect(parseRoundFile("Score: 10/10\n## Improvements\n\n## Notes\n1. Not an improvement\n", 10)).toEqual({ ok: true, review: { score: 10, improvements: [] } });
  });

  test("reports malformed score and missing heading", () => {
    expect(parseRoundFile("## Improvements\n1. One\n", 10)).toEqual({ ok: false, problem: "the file has no `Score: <n>/10` line" });
    expect(parseRoundFile("Score: 7/5\n## Improvements\n", 10)).toEqual({ ok: false, problem: "the score is out of 5, and this council scores out of 10" });
    expect(parseRoundFile("Score: 11/10\n## Improvements\n", 10)).toEqual({ ok: false, problem: "the score 11 is above 10" });
    expect(parseRoundFile("Score: 7/10\n", 10)).toEqual({ ok: false, problem: "the file has no `## Improvements` heading" });
    for (const score of ["7.5/10", "seven/10"]) {
      expect(parseRoundFile(`Score: ${score}\n## Improvements\n`, 10)).toEqual({ ok: false, problem: "the file has no `Score: <n>/10` line" });
    }
  });
});
