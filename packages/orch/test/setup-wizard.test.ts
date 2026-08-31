import { describe, expect, test } from "bun:test";
import { selectAllowedModels, selectDefaultModel } from "../src/setup/wizard.ts";
import type { CataloguePicker } from "../src/types/command.ts";

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

// ONE model list per harness: what it may spawn is also what its own picker cycles. Two
// prompts asked the operator the same question twice and recorded the answer in two keys.
describe("setup model list picker", () => {
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

    await selectAllowedModels("pi", offered, [], pick);

    expect(seen[0]).toMatchObject({ mode: "autocomplete", maxItems: 15 });
    expect(seen[0]!.message).toContain("16 available; type to search or browse");
  });

  test("the prompt names both jobs the list does, and that an empty one forbids nothing", async () => {
    const { seen, pick } = capture();

    await selectAllowedModels("omp", [{ spec: "openai/gpt-5.4" }], [], pick);

    expect(seen[0]!.mode).toBe("multiselect");
    expect(seen[0]!.message).toContain("may spawn");
    expect(seen[0]!.message).toContain("cycle in its own picker");
    expect(seen[0]!.message).toContain("none = allow all");
  });

  test("stored values start checked, and clearing them returns an empty selection", async () => {
    const { seen, pick } = capture();

    const kept = await selectAllowedModels("pi", offered, ["provider/model-2"], pick);
    expect(seen[0]!.checked).toEqual(["provider/model-2"]);
    expect(kept).toEqual(["provider/model-2"]);

    const cleared = await selectAllowedModels("pi", offered, [], pick);
    expect(cleared).toEqual([]);
  });
});
