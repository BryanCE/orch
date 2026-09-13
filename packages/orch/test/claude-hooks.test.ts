import type { OrchDir } from "../src/types/core.ts";
import { orchDirAt } from "../src/services.ts";
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { claudeHookCommand } from "../src/adapters/claude-hooks.ts";
import { LAUNCH_ENV } from "../src/identity/launch.ts";

describe("Claude hook command", () => {
  test("gates execution on the launch environment variable", () => {
    const orchDir: OrchDir = orchDirAt("/tmp/orch");
    const command = claudeHookCommand("/tmp/claude-hooks.js", "Stop", "node", orchDir);

    expect(command).toContain(`$${LAUNCH_ENV}`);
    const source = readFileSync(new URL("../src/adapters/claude-hooks.ts", import.meta.url), "utf8");
    expect(source).not.toContain(LAUNCH_ENV);
  });
});
