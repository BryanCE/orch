import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../src/config.ts";
import { shouldLaunchSettingsEditor } from "../src/commands/settings.ts";
import { SETTINGS_REGISTRY, writeRegisteredSetting } from "../src/settings/registry.ts";
import { createEditorState, editorReducer, type EditorSetting } from "../src/settings/editor.ts";
import type { SettingSpec } from "../src/settings/spec.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";

function setting(key: string, value: unknown, env?: string): EditorSetting {
  const spec: SettingSpec = {
    key,
    group: key.split(".")[0] ?? "settings",
    help: key,
    type: { kind: "text" },
    read: () => value,
    write: () => undefined,
    ...(env === undefined ? {} : { env }),
  };
  return { spec, value };
}

describe("settings shell decisions", () => {
  test("non-TTY takes the print path", () => {
    expect(shouldLaunchSettingsEditor([], false)).toBe(false);
    expect(shouldLaunchSettingsEditor(["--json"], true)).toBe(false);
    expect(shouldLaunchSettingsEditor([], true)).toBe(true);
  });

  test("an overridden setting is refused with the winner named", () => {
    const previous = process.env.ORCH_TEST_OVERRIDE;
    process.env.ORCH_TEST_OVERRIDE = "winning";
    try {
      const state = createEditorState([setting("defaults.adapter", "pi", "ORCH_TEST_OVERRIDE")]);
      const refused = editorReducer(state, { type: "open" });
      expect(refused.mode).toBe("browsing");
      expect(refused.reason).toContain("ORCH_TEST_OVERRIDE");
    } finally {
      if (previous === undefined) delete process.env.ORCH_TEST_OVERRIDE;
      else process.env.ORCH_TEST_OVERRIDE = previous;
    }
  });

  test("an overridden setting cannot be written", () => {
    const directory = mkdtempSync(join(tmpdir(), "orch-settings-override-"));
    writeSettingsFixture(directory, { defaults: { adapter: "pi", backend: "headless" } });
    const result = Bun.spawnSync([process.execPath, join(import.meta.dir, "../bin/orch.ts"), "settings", "fleet.spawn_cap", "4"], {
      env: { ...process.env, ORCH_DIR: directory, ORCH_SPAWN_CAP: "9" },
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(result.success).toBe(false);
    expect(result.stderr.toString()).toContain("ORCH_SPAWN_CAP");
  });

  test("registered writes use the registry entry", () => {
    const directory = mkdtempSync(join(tmpdir(), "orch-settings-shell-"));
    writeSettingsFixture(directory, { defaults: { adapter: "pi", backend: "headless" } });
    writeRegisteredSetting(directory, "fleet.spawn_cap", 4);
    expect(loadConfig(directory).fleet.spawn_cap).toBe(4);
    const text = readFileSync(join(directory, "settings.json"), "utf8");
    expect(text).toContain('"spawn_cap": 4');
  });

  test("registry exposes writable subcommand entries", () => {
    for (const key of ["defaults.models", "models.preferred", "models.allowed", "skills.install", "skills.roots", "notify", "defaults.thinking", "defaults.thinking_by_harness"]) {
      expect(SETTINGS_REGISTRY.find((entry) => entry.key === key)?.write, key).toBeDefined();
    }
  });
});
