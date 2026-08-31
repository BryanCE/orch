import { describe, expect, test } from "bun:test";
import { loadSettings } from "../src/settings/read.ts";
import { resolveThinking } from "../src/policy/thinking.ts";
import { piAdapter } from "../src/adapters/pi.ts";
import { fakeAdapter } from "./helpers/adapter.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

describe("thinking resolution", () => {
  test("resolves every rung in priority order", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-thinking-"));
    writeSettingsFixture(dir, { defaults: { thinking: "low", thinking_by_harness: { codex: "high" } } });
    const settings = loadSettings(dir);
    expect(resolveThinking({ flag: "max", modelSuffix: "minimal", harness: "codex", settings })).toBe("max");
    expect(resolveThinking({ modelSuffix: "minimal", harness: "codex", settings })).toBe("minimal");
    expect(resolveThinking({ harness: "codex", settings })).toBe("high");
    expect(resolveThinking({ harness: "pi", settings })).toBe("low");
    removeTempDir(dir);
  });

  test("bare model with no setting yields harness default", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-thinking-"));
    writeSettingsFixture(dir, { defaults: { models: { pi: "openai/model" } } });
    const settings = loadSettings(dir);
    expect(resolveThinking({ harness: "pi", settings })).toBe("medium");
    removeTempDir(dir);
  });

  test("pi translates the resolved level through its thinking role", () => {
    expect(piAdapter.thinking).not.toBeNull();
    expect(piAdapter.interactiveArgv({ model: "openai/model", thinking: "high" })).toEqual(["pi", "--model", "openai/model", "--thinking", "high"]);
    // An adapter with no thinking control composes NULL, not undefined: nullness is
    // the capability, and `undefined` would be a second way to say the same thing.
    expect(fakeAdapter().thinking).toBeNull();
  });

  test("per-harness override beats global default", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-thinking-"));
    writeSettingsFixture(dir, { defaults: { thinking: "low", thinking_by_harness: { claude: "xhigh" } } });
    const settings = loadSettings(dir);
    expect(resolveThinking({ harness: "claude", settings })).toBe("xhigh");
    expect(resolveThinking({ harness: "codex", settings })).toBe("low");
    removeTempDir(dir);
  });
});
