import { describe, expect, test } from "bun:test";
import { piAdapter } from "../src/adapters/pi.ts";
import type { WorkerPolicy } from "../src/types/policy.ts";

const inherited: WorkerPolicy = {
  inheritMcp: false,
  inheritSkills: true,
  builtinTools: true,
  allowTools: [],
  compactAtTokens: {},
  readOnly: null,
};

const model = "openrouter/openai/gpt-5.6-luna:high";

describe("orch bugs 4 and 5 launch contracts", () => {
  test("interactive launch routes use one argv composition", () => {
    const opts = { model, workers: inherited };
    expect(piAdapter.interactiveArgv(opts).join(" ")).toBe(piAdapter.restrictedInteractiveArgv(opts).join(" "));
    expect(piAdapter.interactiveArgv(opts).join(" ")).not.toContain("--no-extensions");
  });

  test("headless launch routes use one argv composition", () => {
    const opts = { model, workers: inherited };
    expect(piAdapter.headlessCmd("work", opts)).toEqual(piAdapter.restrictedHeadlessCmd("work", opts));
  });
});
