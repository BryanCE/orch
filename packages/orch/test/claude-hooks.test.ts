import type { OrchDir } from "../src/types/core.ts";
import { orchDirAt } from "../src/orch-dir.ts";
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { claudeHookCommand, claudeSettingsPath } from "../src/adapters/claude-hooks.ts";
import { LAUNCH_ENV } from "../src/identity/launch.ts";

describe("Claude hook command", () => {
  test("stores session settings under ORCH_DIR", () => {
    const orchDir: OrchDir = orchDirAt("/tmp/orch");
    expect(claudeSettingsPath(orchDir)).toBe(join("/tmp/orch", "claude", "settings.json"));
  });
  test("runs for every Claude session and lets the shim self-gate", () => {
    const orchDir: OrchDir = orchDirAt("/tmp/orch");
    const command = claudeHookCommand("/tmp/claude-hooks.js", "Stop", "node", orchDir);

    expect(command).not.toContain(`$${LAUNCH_ENV}`);
    const source = readFileSync(new URL("../src/adapters/claude-hooks.ts", import.meta.url), "utf8");
    expect(source).not.toContain(LAUNCH_ENV);
  });
});
