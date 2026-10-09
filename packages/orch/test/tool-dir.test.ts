import { afterEach, describe, expect, test } from "bun:test";
import { homedir } from "node:os";
import { join } from "node:path";
import { toolDir } from "../src/util.ts";

/** A harness the user moved with its own env var must be found where they put it. */
describe("toolDir", () => {
  const variable = "ORCH_TEST_TOOL_DIR";
  afterEach(() => { delete process.env[variable]; });

  test("follows the tool's own env override", () => {
    process.env[variable] = "/elsewhere/codex";
    expect(toolDir(variable, ".codex")).toBe("/elsewhere/codex");
  });

  test("falls back to the default under the home folder", () => {
    expect(toolDir(variable, ".pi", "agent")).toBe(join(homedir(), ".pi", "agent"));
  });

  test("an empty override counts as unset", () => {
    process.env[variable] = "";
    expect(toolDir(variable, ".claude")).toBe(join(homedir(), ".claude"));
  });
});
