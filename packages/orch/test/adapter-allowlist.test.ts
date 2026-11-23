import { describe, expect, test } from "bun:test";
import { piAdapter } from "../src/adapters/pi.ts";
import { ompAdapter } from "../src/adapters/omp.ts";
import type { WorkerPolicy } from "../src/types/policy.ts";

const INHERIT: WorkerPolicy = {
  inheritMcp: false,
  inheritSkills: true,
  builtinTools: true,
  allowTools: [],
  compactAtTokens: {},
  readOnly: null,
};

const LOCKED_DOWN: WorkerPolicy = {
  inheritMcp: false,
  inheritSkills: true,
  builtinTools: false,
  allowTools: ["read", "bash", "orch_ask"],
  compactAtTokens: {},
  readOnly: null,
};

describe("pi worker launch obeys the worker policy", () => {
  // pi's own discovery loads orch's bridge with the user's extensions; orch picks none of them.
  test("no policy touches which extensions pi loads", () => {
    for (const policy of [INHERIT, LOCKED_DOWN]) {
      const argv = piAdapter.restrictedInteractiveArgv({ workers: policy });
      expect(argv).not.toContain("--no-extensions");
      expect(argv).not.toContain("-e");
    }
  });

  test("a lean policy launches pi with no MCP server and no skills", () => {
    const argv = piAdapter.restrictedInteractiveArgv({ workers: { ...INHERIT, inheritSkills: false } });
    expect(argv).toContain("--no-mcp");
    expect(argv).toContain("--no-skills");
    expect(piAdapter.restrictedInteractiveArgv({ workers: { ...INHERIT, inheritMcp: true } })).not.toContain("--no-mcp");
  });

  test("a read-only policy names the tools the worker keeps and leaves the built-ins on", () => {
    const reporter: WorkerPolicy = { inheritMcp: false, inheritSkills: true, builtinTools: true, allowTools: ["read", "grep", "find", "ls", "edit", "write", "orch_ask"], compactAtTokens: {}, readOnly: { out: "/repo/out" } };
    const command = piAdapter.restrictedInteractiveArgv({ workers: reporter }).join(" ");
    expect(command).toContain("--tools read,grep,find,ls,edit,write,orch_ask");
    expect(command).not.toContain("--no-builtin-tools");
  });

  test("an inheriting policy restricts neither tools nor built-ins", () => {
    const command = piAdapter.restrictedInteractiveArgv({ workers: INHERIT }).join(" ");

    // Hardcoding a tool allowlist is what left workers without grep or subagents.
    expect(command).not.toContain("--tools");
    expect(command).not.toContain("--no-builtin-tools");
  });

  test("a locked-down policy passes exactly its allowlist and drops the built-ins", () => {
    const command = piAdapter.restrictedInteractiveArgv({ workers: LOCKED_DOWN }).join(" ");

    expect(command).toContain("--no-builtin-tools");
    expect(command).toContain("--tools read,bash,orch_ask");
  });

  test("an explicit tool allowlist from the launcher wins over the policy's", () => {
    const command = piAdapter.restrictedInteractiveArgv({ workers: LOCKED_DOWN, tools: "read,edit" }).join(" ");

    expect(command).toContain("--tools read,edit");
  });

  test("headless pi launches under the same policy and keeps the prompt last", () => {
    const argv = piAdapter.restrictedHeadlessCmd("PROMPT", { workers: LOCKED_DOWN });

    expect(argv[0]).toBe("pi");
    expect(argv).toContain("--no-builtin-tools");
    expect(argv).toContain("read,bash,orch_ask");
    expect(argv).not.toContain("--no-extensions");
    expect(argv.at(-1)).toBe("PROMPT");
  });

  test("the model flag lands on the launch line", () => {
    const command = piAdapter.restrictedInteractiveArgv({ workers: INHERIT, model: "openrouter/x-ai/grok-4.5:high" }).join(" ");

    expect(command).toContain("--model openrouter/x-ai/grok-4.5:high");
  });
});

describe("omp worker launch obeys the worker policy through its own harness", () => {
  test("no policy touches which extensions omp loads", () => {
    const argv = ompAdapter.restrictedInteractiveArgv({ workers: LOCKED_DOWN });
    expect(argv).not.toContain("--no-extensions");
    expect(argv).not.toContain("-e");
  });

  test("a lean policy launches omp with no skills; omp has no MCP switch", () => {
    const argv = ompAdapter.restrictedHeadlessCmd("PROMPT", { workers: { ...LOCKED_DOWN, inheritSkills: false } });
    expect(argv).toContain("--no-skills");
    expect(argv).not.toContain("--no-mcp");
    expect(argv.at(-1)).toBe("PROMPT");
  });

  test("omp drops built-ins with --no-tools, the flag its CLI actually has", () => {
    const command = ompAdapter.restrictedInteractiveArgv({ workers: LOCKED_DOWN }).join(" ");

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
