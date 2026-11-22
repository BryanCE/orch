import { describe, expect, test } from "bun:test";
import { councilLineup } from "../src/council/lineup.ts";

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
