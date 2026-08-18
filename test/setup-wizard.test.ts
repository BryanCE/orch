import { describe, expect, test } from "bun:test";
import { selectAllowedModels, selectDefaultModel, selectPreferredModels, type CataloguePicker } from "../src/setup/wizard.ts";

describe("setup model picker", () => {
  test("switches large catalogues to searchable bounded mode and preserves effort", async () => {
    const offered = Array.from({ length: 16 }, (_, index) => ({ spec: `provider/model-${index}` }));
    offered[0] = { spec: "openai-codex/gpt-5.6-luna" };
    let request: {
      mode: "select" | "autocomplete";
      message: string;
      offered: readonly { spec: string }[];
      initial: string;
      maxItems: number;
    } | undefined;

    const chosen = await selectDefaultModel(
      "pi",
      offered,
      "openai-codex/gpt-5.6-luna:medium",
      (mode, message, options, initial, maxItems) => {
        request = { mode, message, offered: options, initial, maxItems };
        return Promise.resolve(initial);
      },
    );

    expect(request).toMatchObject({
      mode: "autocomplete",
      initial: "openai-codex/gpt-5.6-luna",
      maxItems: 15,
    });
    expect(request?.message).toContain("16 available; type to search or browse");
    expect(request?.offered).toHaveLength(16);
    expect(chosen).toBe("openai-codex/gpt-5.6-luna:medium");
  });

  test("keeps the compact selector for small catalogues", async () => {
    let mode: "select" | "autocomplete" | undefined;
    const chosen = await selectDefaultModel(
      "omp",
      [{ spec: "openai-codex/gpt-5.4" }],
      undefined,
      (nextMode, _message, _options, initial) => {
        mode = nextMode;
        return Promise.resolve(initial);
      },
    );

    expect(mode).toBe("select");
    expect(chosen).toBe("openai-codex/gpt-5.4");
  });
});

// Two prompts with two meanings: the quicklist a harness shows in its own picker, and the gate
// its spawns are held to. Setup asks for them separately because picking one must never
// silently forbid everything the operator left unpicked.
describe("setup preferred-model picker", () => {
  const offered = Array.from({ length: 16 }, (_, index) => ({ spec: `provider/model-${index}` }));

  function capture() {
    const seen: { mode: string; message: string; checked: string[]; maxItems: number }[] = [];
    const pick: CataloguePicker = (mode, message, options, maxItems) => {
      seen.push({ mode, message, checked: options.filter((option) => option.checked).map((option) => option.value), maxItems });
      return Promise.resolve(options.filter((option) => option.checked).map((option) => option.value));
    };
    return { seen, pick };
  }

  test("large catalogues use the bounded searchable multiselect", async () => {
    const { seen, pick } = capture();

    await selectPreferredModels("pi", offered, [], pick);

    expect(seen[0]).toMatchObject({ mode: "autocomplete", maxItems: 15 });
    expect(seen[0]!.message).toContain("16 available; type to search or browse");
  });

  test("the prompt names the harness's own picker and never claims the rest are forbidden", async () => {
    const { seen, pick } = capture();

    await selectPreferredModels("omp", [{ spec: "openai/gpt-5.4" }], [], pick);

    expect(seen[0]!.mode).toBe("multiselect");
    expect(seen[0]!.message).toContain("own model picker/cycle");
    expect(seen[0]!.message).toContain("none = no quicklist");
    expect(seen[0]!.message).not.toContain("may use");
  });

  test("stored quicklist values start checked, and clearing them returns an empty selection", async () => {
    const { seen, pick } = capture();

    const kept = await selectPreferredModels("pi", offered, ["provider/model-2"], pick);
    expect(seen[0]!.checked).toEqual(["provider/model-2"]);
    expect(kept).toEqual(["provider/model-2"]);

    const cleared = await selectPreferredModels("pi", offered, [], pick);
    expect(cleared).toEqual([]);
  });

  test("the two pickers read their own stored lists, so neither edits the other", async () => {
    const { seen, pick } = capture();

    await selectPreferredModels("pi", offered, ["provider/model-1"], pick);
    await selectAllowedModels("pi", offered, ["provider/model-9"], pick);

    expect(seen[0]!.checked).toEqual(["provider/model-1"]);
    expect(seen[1]!.checked).toEqual(["provider/model-9"]);
    expect(seen[1]!.message).toContain("spawns may use");
  });
});
