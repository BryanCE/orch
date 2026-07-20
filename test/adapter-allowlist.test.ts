import { describe, expect, test } from "bun:test";
import { PI_APPROVED_TOOLS, piAdapter } from "../src/adapters/pi.ts";
import { PI_EXTENSION_NAMES } from "../src/bridge-bundle.ts";

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

  test("restricts interactive pi launches to the allowlist and the orch bridge/HUD extensions only", () => {
    const command = piAdapter.restrictedInteractiveCmd({});

    expect(command).toContain("pi --tools");
    for (const tool of PI_APPROVED_TOOLS) expect(command).toContain(tool);
    expect(command).toContain("--no-builtin-tools");
    // 12.8: a worker never loads the user's full global extension set.
    expect(command).toContain("--no-extensions");
    for (const name of PI_EXTENSION_NAMES) {
      expect(command).toContain(`-e `);
      expect(command).toContain(`${name}.js`);
    }
  });

  test("restricts headless pif launches to the bridge/HUD extensions and preserves the prompt", () => {
    const argv = piAdapter.restrictedHeadlessCmd("PROMPT", {});

    expect(argv[0]).toBe("pif");
    expect(argv).toContain("--tools");
    expect(argv).toContain(PI_APPROVED_TOOLS.join(","));
    expect(argv).toContain("--no-builtin-tools");
    expect(argv).toContain("--no-extensions");
    for (const name of PI_EXTENSION_NAMES) {
      const flagIndex = argv.indexOf("-e");
      expect(flagIndex).toBeGreaterThan(-1);
      expect(argv.some((token) => token.endsWith(`${name}.js`))).toBe(true);
    }
    expect(argv.at(-1)).toBe("PROMPT");
  });
});
