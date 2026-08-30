import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { claudeHookCommand } from "../src/adapters/claude-hooks.ts";
import { LAUNCH_ENV } from "../src/identity/launch.ts";

describe("Claude hook command", () => {
  test("gates execution on the launch environment variable", () => {
    const command = claudeHookCommand("/tmp/claude-hooks.js", "Stop", "node", "/tmp/orch");

    expect(command).toContain(`$${LAUNCH_ENV}`);
    const source = readFileSync(new URL("../src/adapters/claude-hooks.ts", import.meta.url), "utf8");
    expect(source).not.toContain(LAUNCH_ENV);
  });
});
