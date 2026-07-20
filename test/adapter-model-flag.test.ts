import { describe, expect, test } from "bun:test";
import { piAdapter } from "../src/adapters/pi.ts";
import { claudeAdapter } from "../src/adapters/claude.ts";
import { codexAdapter } from "../src/adapters/codex.ts";

// 12.6: interactive launches must carry the resolved model. Every adapter's
// interactiveCmd (and pi's restrictedInteractiveCmd) dropped opts.model while
// every headless variant passed it, so pane workers always booted on the
// harness's own saved default and ignored orch's settings/flags.
const MODEL = "openai/gpt-5.6";

describe("interactive launches carry the resolved model (12.6)", () => {
  test("pi.interactiveCmd includes --model when set and omits it cleanly when not", () => {
    expect(piAdapter.interactiveCmd({ model: MODEL })).toBe(`pi --model ${MODEL}`);
    expect(piAdapter.interactiveCmd({})).toBe("pi");
  });

  test("pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not", () => {
    const withModel = piAdapter.restrictedInteractiveCmd({ model: MODEL });
    expect(withModel).toContain(`--model ${MODEL}`);

    const withoutModel = piAdapter.restrictedInteractiveCmd({});
    expect(withoutModel).not.toContain("--model");
  });

  test("claude.interactiveCmd includes --model when set and omits it cleanly when not", () => {
    expect(claudeAdapter.interactiveCmd({ model: MODEL })).toBe(`claude --model ${MODEL}`);
    expect(claudeAdapter.interactiveCmd({})).toBe("claude");
  });

  test("codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not", () => {
    expect(codexAdapter.interactiveCmd({ model: "gpt-5" })).toBe("codex --model 'gpt-5'");
    expect(codexAdapter.interactiveCmd({})).toBe("codex");
  });
});
