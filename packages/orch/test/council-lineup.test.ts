import { describe, expect, test } from "bun:test";
import { councilLineup, memberTabs } from "../src/council/lineup.ts";

describe("the council lineup", () => {
  test("is one member per model, named for the council and the model", () => {
    expect(councilLineup("plan", { claude: ["sonnet"], pi: ["openai-codex/gpt-6.1-sol", "openai-codex/gpt-6-astra:high"] })).toEqual([
      { name: "plan-gpt-6-1-sol", harness: "pi", model: "openai-codex/gpt-6.1-sol" },
      { name: "plan-gpt-6-astra", harness: "pi", model: "openai-codex/gpt-6-astra:high" },
      { name: "plan-sonnet", harness: "claude", model: "sonnet" },
    ]);
  });

  test("numbers a model that sits twice", () => {
    expect(councilLineup("Plan", { claude: ["sonnet", "sonnet:high"] }).map((member) => member.name)).toEqual(["plan-sonnet", "plan-sonnet-2"]);
  });

  test("is empty when the setting names no model", () => {
    expect(councilLineup("plan", {})).toEqual([]);
  });
});

describe("the tabs a council's members sit in", () => {
  test("is the council's own tab when one tab holds them all", () => {
    expect(memberTabs("plan", ["a", "b", "c", "d"], 4)).toEqual([{ tab: "plan", members: ["a", "b", "c", "d"] }]);
  });

  test("spreads members evenly over numbered tabs when they outnumber one tab", () => {
    expect(memberTabs("plan", ["a", "b", "c", "d", "e"], 4)).toEqual([
      { tab: "plan", members: ["a", "b", "c"] },
      { tab: "plan-2", members: ["d", "e"] },
    ]);
    expect(memberTabs("plan", ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"], 4).map(({ tab, members }) => `${tab}:${members.length}`)).toEqual(["plan:4", "plan-2:4", "plan-3:2"]);
  });
});
