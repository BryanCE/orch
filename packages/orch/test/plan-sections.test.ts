import { describe, expect, test } from "bun:test";
import { planSections } from "../src/commands/plan-sections.ts";

describe("plan file sections", () => {
  test("each '## ' heading starts one task, in file order", () => {
    expect(planSections("## T1 First\nEdit a.ts\n\n## T2 Second\nEdit b.ts\n")).toEqual([
      "## T1 First\nEdit a.ts",
      "## T2 Second\nEdit b.ts",
    ]);
  });

  test("the text above the first heading starts every task", () => {
    expect(planSections("# Wave 1\nRead notes.md first.\n\n## T1 A\nx\n## T2 B\ny")).toEqual([
      "# Wave 1\nRead notes.md first.\n\n## T1 A\nx",
      "# Wave 1\nRead notes.md first.\n\n## T2 B\ny",
    ]);
  });

  test("a '## ' line inside a code fence is task text", () => {
    expect(planSections("## T1 A\n```markdown\n## not a task\n```\n## T2 B\ny")).toEqual([
      "## T1 A\n```markdown\n## not a task\n```",
      "## T2 B\ny",
    ]);
  });

  test("a file with no heading holds no task", () => {
    expect(planSections("# Notes\njust prose")).toEqual([]);
  });

  test("a '### ' heading stays inside its task", () => {
    expect(planSections("## T1 A\n### Verify\nrun it")).toEqual(["## T1 A\n### Verify\nrun it"]);
  });
});
