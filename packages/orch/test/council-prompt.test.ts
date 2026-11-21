import { describe, expect, test } from "bun:test";
import { COUNCIL_NAME, councilDirectory, memberDirectory, roundFilePath } from "../src/council/layout.ts";
import { memberPrompt } from "../src/council/prompt.ts";
import { parseRoundFile, roundFileLayout } from "../src/council/round-file.ts";

describe("council layout", () => {
  test("builds council and member paths", () => {
    expect(councilDirectory("/repo", ".orch/councils", "plan")).toBe("/repo/.orch/councils/plan");
    expect(councilDirectory("/repo", "/var/councils", "plan")).toBe("/var/councils/plan");
    expect(memberDirectory("/c/plan", "ada")).toBe("/c/plan/ada");
    expect(roundFilePath("/c/plan", "ada", 2)).toBe("/c/plan/ada/round-2.md");
  });

  test.each(["plan-review", "ui_2", "A1"])("accepts council name %s", (name) => {
    expect(COUNCIL_NAME.test(name)).toBe(true);
  });

  test.each(["", "-plan", "a/b", "..", "a b"])("rejects council name %s", (name) => {
    expect(COUNCIL_NAME.test(name)).toBe(false);
  });
});

describe("council member prompt", () => {
  const round = { council: "/c/plan", member: "ada", others: ["bea", "cy"], round: 1, scale: 10, subject: "Review plan.md." };

  test("includes the first-round review instructions", () => {
    const prompt = memberPrompt(round);
    expect(prompt.startsWith("You sit on a council that reviews one subject.")).toBe(true);
    expect(prompt).toContain("Review plan.md.");
    expect(prompt).toContain("Write your review to /c/plan/ada/round-1.md in exactly this layout:");
    expect(prompt).toContain(roundFileLayout(10));
    expect(prompt).toContain("10 means you would change nothing.");
    expect(prompt).not.toContain("bea");
  });

  test("includes other reviews and the current-round path in round two", () => {
    const prompt = memberPrompt({ ...round, round: 2 });
    expect(prompt.startsWith("Round 2 of the council. The subject changed after round 1.")).toBe(true);
    expect(prompt).toContain("- /c/plan/bea/round-1.md\n- /c/plan/cy/round-1.md");
    expect(prompt).toContain("/c/plan/ada/round-2.md");
    expect(prompt).not.toContain("/c/plan/ada/round-1.md");
  });

  test("omits the other-members clause when there are none", () => {
    expect(memberPrompt({ ...round, round: 2, others: [] })).not.toContain("other members");
  });

  test("reads the layout the prompt asks the member to write", () => {
    const written = roundFileLayout(10).replace("<a whole number from 0 to 10>", "7");
    expect(parseRoundFile(written, 10)).toEqual({
      ok: true,
      review: { score: 7, improvements: ["<the change that would raise the score most>", "<the next one>"] },
    });
  });
});
