import type { OrchDir } from "../src/types/core.ts";
import { afterEach, describe, expect, test } from "bun:test";



import { fileSettingsManager } from "../src/settings/manager.ts";
import { writeSettingsThinking } from "../src/settings/write.ts";
import { cmdSettingsThinking } from "../src/commands/settings.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { testServices } from "./helpers/services.ts";
const dirs: OrchDir[] = [];
const oldDir = process.env.ORCH_DIR;

function fixture(): OrchDir {
  const dir = tempOrchDir("orch-thinking-");
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

// Thinking is user-configurable THROUGH orch, not by
// hand-editing JSON. `orch settings` shows the effective level and sets it.
describe("orch settings thinking", () => {
  test("writes the global default and reads back through loadSettings", () => {
    const dir = fixture();
    writeSettingsThinking(dir, { thinking: "high" });
    expect(fileSettingsManager(dir).current().defaults.thinking).toBe("high");
  });

  test("writes a per-harness override without disturbing the global default", () => {
    const dir = fixture();
    writeSettingsThinking(dir, { thinking: "high" });
    writeSettingsThinking(dir, { byHarness: { codex: "medium" } });
    const settings = fileSettingsManager(dir).current();
    expect(settings.defaults.thinking).toBe("high");
    expect(settings.defaults.thinking_by_harness?.codex).toBe("medium");
  });

  test("the command sets the level a user names", () => {
    const dir = fixture();
    cmdSettingsThinking(testServices({ orchDir: dir, settings: {} }), ["xhigh"]);
    expect(fileSettingsManager(dir).current().defaults.thinking).toBe("xhigh");
  });

  test("the command sets a per-harness level with --harness", () => {
    const dir = fixture();
    cmdSettingsThinking(testServices({ orchDir: dir, settings: {} }), ["low", "--harness=pi"]);
    const settings = fileSettingsManager(dir).current();
    expect(settings.defaults.thinking_by_harness?.pi).toBe("low");
  });

  test("a level orch does not know is refused, naming the valid levels", () => {
    const dir = fixture();
    expect(() => cmdSettingsThinking(testServices({ orchDir: dir, settings: {} }), ["ludicrous"])).toThrow(/off.*minimal.*low.*medium.*high.*xhigh.*max/s);
  });

  test("clearing a per-harness override falls back to the global default", () => {
    const dir = fixture();
    writeSettingsThinking(dir, { thinking: "high", byHarness: { pi: "low" } });
    writeSettingsThinking(dir, { byHarness: { pi: null } });
    const settings = fileSettingsManager(dir).current();
    expect(settings.defaults.thinking).toBe("high");
    expect(settings.defaults.thinking_by_harness?.pi).toBeUndefined();
  });
});
