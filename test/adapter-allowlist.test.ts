import { describe, expect, test } from "bun:test";
import { PI_APPROVED_TOOLS, piAdapter } from "../src/adapters/pi.ts";

describe("pi adapter tool allowlist", () => {
  test("declares exactly the built-ins and bridge tools", () => {
    expect(PI_APPROVED_TOOLS).toEqual([
      "read",
      "write",
      "edit",
      "bash",
      "orch_ask",
      "orch_agents",
      "orch_send",
      "orch_read",
    ]);
  });

  test("restricts interactive pi launches to the allowlist", () => {
    const command = piAdapter.restrictedInteractiveCmd({});

    expect(command).toContain("pi --tools");
    for (const tool of PI_APPROVED_TOOLS) expect(command).toContain(tool);
    expect(command).toContain("--no-builtin-tools");
  });

  test("restricts headless pif launches and preserves the prompt", () => {
    const argv = piAdapter.restrictedHeadlessCmd("PROMPT", {});

    expect(argv[0]).toBe("pif");
    expect(argv).toContain("--tools");
    expect(argv).toContain(PI_APPROVED_TOOLS.join(","));
    expect(argv).toContain("--no-builtin-tools");
    expect(argv.at(-1)).toBe("PROMPT");
  });
});
