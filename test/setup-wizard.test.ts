import { describe, expect, test } from "bun:test";
import { selectDefaultModel } from "../src/setup/wizard.ts";

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
