import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig, writeSettingsThinking } from "../src/config.ts";
import { cmdSettingsThinking } from "../src/commands/settings.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const dirs: string[] = [];
const oldDir = process.env.ORCH_DIR;

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-thinking-"));
  dirs.push(dir);
  writeSettingsFixture(dir, {});
  process.env.ORCH_DIR = dir;
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) removeTempDir(dir);
  if (oldDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = oldDir;
});

// TASKS/12-thinking.md slice 4: thinking is user-configurable THROUGH orch, not by
// hand-editing JSON. `orch settings` shows the effective level and sets it.
describe("orch settings thinking", () => {
  test("writes the global default and reads back through loadConfig", () => {
    const dir = fixture();
    writeSettingsThinking(dir, { thinking: "high" });
    expect(loadConfig(dir).defaults.thinking).toBe("high");
  });

  test("writes a per-harness override without disturbing the global default", () => {
    const dir = fixture();
    writeSettingsThinking(dir, { thinking: "high" });
    writeSettingsThinking(dir, { byHarness: { codex: "medium" } });
    const config = loadConfig(dir);
    expect(config.defaults.thinking).toBe("high");
    expect(config.defaults.thinking_by_harness?.codex).toBe("medium");
  });

  test("the command sets the level a user names", () => {
    const dir = fixture();
    cmdSettingsThinking(["xhigh"]);
    expect(loadConfig(dir).defaults.thinking).toBe("xhigh");
  });

  test("the command sets a per-harness level with --harness", () => {
    const dir = fixture();
    cmdSettingsThinking(["low", "--harness=pi"]);
    const config = loadConfig(dir);
    expect(config.defaults.thinking_by_harness?.pi).toBe("low");
  });

  test("a level orch does not know is refused, naming the valid levels", () => {
    fixture();
    expect(() => cmdSettingsThinking(["ludicrous"])).toThrow(/off.*minimal.*low.*medium.*high.*xhigh.*max/s);
  });

  test("clearing a per-harness override falls back to the global default", () => {
    const dir = fixture();
    writeSettingsThinking(dir, { thinking: "high", byHarness: { pi: "low" } });
    writeSettingsThinking(dir, { byHarness: { pi: null } });
    const config = loadConfig(dir);
    expect(config.defaults.thinking).toBe("high");
    expect(config.defaults.thinking_by_harness?.pi).toBeUndefined();
  });
});
