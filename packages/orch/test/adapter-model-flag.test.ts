import { describe, expect, test } from "bun:test";
import { piAdapter } from "../src/adapters/pi.ts";
import { ompAdapter } from "../src/adapters/omp.ts";
import { claudeAdapter } from "../src/adapters/claude.ts";
import { codexAdapter } from "../src/adapters/codex.ts";

// 12.6: interactive launches must carry the resolved model. Every adapter's
// interactiveArgv (and pi's restrictedInteractiveArgv) dropped opts.model while
// every headless variant passed it, so pane workers always booted on the
// harness's own saved default and ignored orch's settings/flags.
const MODEL = "openai/gpt-5.6";

describe("interactive launches carry the resolved model (12.6)", () => {
  test("pi.interactiveArgv includes --model when set and omits it cleanly when not", () => {
    expect(piAdapter.interactiveArgv({ model: MODEL }).join(" ")).toBe(`pi --model ${MODEL}`);
    expect(piAdapter.interactiveArgv({}).join(" ")).toBe("pi");
  });

  test("pi.restrictedInteractiveArgv includes --model when set and omits it cleanly when not", () => {
    const withModel = piAdapter.restrictedInteractiveArgv({ model: MODEL }).join(" ");
    expect(withModel).toContain(`--model ${MODEL}`);

    const withoutModel = piAdapter.restrictedInteractiveArgv({}).join(" ");
    expect(withoutModel).not.toContain("--model");
  });

  test("claude.interactiveArgv includes --model when set and omits it cleanly when not", () => {
    expect(claudeAdapter.interactiveArgv({ model: MODEL }).join(" ")).toBe(`claude --model ${MODEL} --strict-mcp-config`);
    expect(claudeAdapter.interactiveArgv({}).join(" ")).toBe("claude --strict-mcp-config");
  });

  test("codex.interactiveArgv includes --model when set and omits it cleanly when not", () => {
    expect(codexAdapter.interactiveArgv({ model: "gpt-5" }).join(" ")).toBe("codex --model gpt-5");
    expect(codexAdapter.interactiveArgv({}).join(" ")).toBe("codex");
  });
});

// The preferred quicklist is convenience, not permission: it fills the harness's OWN model
// picker through its native --models option and never decides what may launch.
const QUICKLIST = ["anthropic/claude-sonnet-4.5", "openai/gpt-5.6:high"];

describe("preferred models fill the harness's native picker quicklist", () => {
  for (const [harness, adapter, binary] of [["pi", piAdapter, "pi"], ["omp", ompAdapter, "omp"]] as const) {
    test(`${harness} interactive builders pass the quicklist as one raw --models argument`, () => {
      const opts = { model: MODEL, preferredModels: QUICKLIST };
      for (const command of [adapter.interactiveArgv(opts).join(" "), adapter.restrictedInteractiveArgv(opts).join(" ")]) {
        expect(command.startsWith(`${binary} `)).toBe(true);
        expect(command).toContain(`--model ${MODEL}`);
        // The backend owns shell quoting for the raw quicklist.
        expect(command).toContain(`--models ${QUICKLIST.join(",")}`);
      }
    });

    test(`${harness} headless builders pass the quicklist as one verbatim argv entry`, () => {
      for (const argv of [
        adapter.headlessCmd("go", { model: MODEL, preferredModels: QUICKLIST }),
        adapter.restrictedHeadlessCmd("go", { model: MODEL, preferredModels: QUICKLIST }),
      ]) {
        expect(argv[argv.indexOf("--models") + 1]).toBe(QUICKLIST.join(","));
        expect(argv[argv.indexOf("--model") + 1]).toBe(MODEL);
        // The prompt stays last; the quicklist is never folded into it.
        expect(argv[argv.length - 1]).toBe("go");
      }
    });

    test(`${harness} omits --models cleanly for an absent or empty quicklist`, () => {
      for (const opts of [{ model: MODEL }, { model: MODEL, preferredModels: [] }]) {
        expect(adapter.interactiveArgv(opts).join(" ")).not.toContain("--models");
        expect(adapter.restrictedInteractiveArgv(opts).join(" ")).not.toContain("--models");
        expect(adapter.headlessCmd("go", opts)).not.toContain("--models");
        expect(adapter.restrictedHeadlessCmd("go", opts)).not.toContain("--models");
      }
    });

    test(`${harness} keeps quicklist order and provider punctuation intact`, () => {
      const punctuated = ["openrouter/meta-llama/llama-3.1-70b", "anthropic/*", "z.ai/glm-4.6:max"];
      const argv = adapter.headlessCmd("go", { preferredModels: punctuated });
      expect(argv[argv.indexOf("--models") + 1]).toBe(punctuated.join(","));
    });
  }

  test("a model outside the quicklist is still what the launch runs on", () => {
    // The launch model is ruled on by models.allowed, never by the picker quicklist: an
    // unpreferred model reaches --model unchanged while --models still holds only the quicklist.
    const argv = piAdapter.restrictedHeadlessCmd("go", { model: "openrouter/unlisted-but-allowed", preferredModels: QUICKLIST });
    expect(argv[argv.indexOf("--model") + 1]).toBe("openrouter/unlisted-but-allowed");
    expect(argv[argv.indexOf("--models") + 1]).toBe(QUICKLIST.join(","));
  });
});
