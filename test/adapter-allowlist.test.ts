import { describe, expect, test } from "bun:test";
import { piAdapter } from "../src/adapters/pi.ts";
import { ompAdapter } from "../src/adapters/omp.ts";
import type { WorkerPolicy } from "../src/policy/workers.ts";

const INHERIT: WorkerPolicy = {
  inheritExtensions: true,
  excludeExtensions: [],
  builtinTools: true,
  allowTools: [],
};

const LOCKED_DOWN: WorkerPolicy = {
  inheritExtensions: false,
  excludeExtensions: [],
  builtinTools: false,
  allowTools: ["read", "bash", "orch_ask"],
};

describe("pi worker launch obeys the worker policy", () => {
  test("orch's bridge extension always loads, whatever the policy", () => {
    for (const policy of [INHERIT, LOCKED_DOWN]) {
      const command = piAdapter.restrictedInteractiveCmd({ workers: policy });
      // --no-extensions disables discovery; the explicit -e paths still load.
      expect(command).toContain("--no-extensions");
      expect(command).toContain("orchestrator-bridge.js");
    }
  });

  test("an inheriting policy restricts neither tools nor built-ins", () => {
    const command = piAdapter.restrictedInteractiveCmd({ workers: INHERIT });

    // Hardcoding a tool allowlist is what left workers without grep or subagents.
    expect(command).not.toContain("--tools");
    expect(command).not.toContain("--no-builtin-tools");
  });

  test("a locked-down policy passes exactly its allowlist and drops the built-ins", () => {
    const command = piAdapter.restrictedInteractiveCmd({ workers: LOCKED_DOWN });

    expect(command).toContain("--no-builtin-tools");
    expect(command).toContain("--tools read,bash,orch_ask");
  });

  test("an explicit tool allowlist from the launcher wins over the policy's", () => {
    const command = piAdapter.restrictedInteractiveCmd({ workers: LOCKED_DOWN, tools: "read,edit" });

    expect(command).toContain("--tools read,edit");
  });

  test("headless pif launches under the same policy and keeps the prompt last", () => {
    const argv = piAdapter.restrictedHeadlessCmd("PROMPT", { workers: LOCKED_DOWN });

    expect(argv[0]).toBe("pif");
    expect(argv).toContain("--no-builtin-tools");
    expect(argv).toContain("read,bash,orch_ask");
    expect(argv).toContain("--no-extensions");
    expect(argv.some((token) => token.endsWith("orchestrator-bridge.js"))).toBe(true);
    expect(argv.at(-1)).toBe("PROMPT");
  });

  test("the model flag lands on the launch line", () => {
    const command = piAdapter.restrictedInteractiveCmd({ workers: INHERIT, model: "openrouter/x-ai/grok-4.5:high" });

    expect(command).toContain("--model openrouter/x-ai/grok-4.5:high");
  });
});

describe("omp worker launch obeys the worker policy through its own harness", () => {
  test("omp loads its own bundle from its own config root, never pi's", () => {
    const command = ompAdapter.restrictedInteractiveCmd({ workers: LOCKED_DOWN });

    // The bundle path is OS-native, so compare with separators normalized.
    const slashed = command.replaceAll("\\", "/");
    expect(command).toContain("--no-extensions");
    expect(command).toContain("omp-bridge.js");
    expect(slashed).toContain(".omp/agent/extensions");
    expect(command).not.toContain("orchestrator-bridge.js");
    expect(slashed).not.toContain(".pi/agent");
  });

  test("omp drops built-ins with --no-tools, the flag its CLI actually has", () => {
    const command = ompAdapter.restrictedInteractiveCmd({ workers: LOCKED_DOWN });

    expect(command).toContain("--no-tools");
    expect(command).not.toContain("--no-builtin-tools");
    expect(command).toContain("--tools read,bash,orch_ask");
  });

  test("headless omp needs no wrapper binary and keeps the prompt last", () => {
    const argv = ompAdapter.restrictedHeadlessCmd("PROMPT", { workers: LOCKED_DOWN });

    expect(argv[0]).toBe("omp");
    expect(argv.at(-1)).toBe("PROMPT");
  });
});
