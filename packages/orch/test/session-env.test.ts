import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { SHIM_ENV_VARS } from "../src/adapters/session-env.ts";
import { LAUNCH_ENV } from "../src/identity/launch.ts";

describe("shim environment", () => {
  test("allows the launch environment variable", () => {
    expect(SHIM_ENV_VARS).toContain(LAUNCH_ENV);
    const source = readFileSync(new URL("../src/adapters/session-env.ts", import.meta.url), "utf8");
    expect(source).not.toContain(LAUNCH_ENV);
  });
});
