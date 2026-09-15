import type { OrchDir } from "../src/types/core.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { readFileSync } from "node:fs";

import { join } from "node:path";
import { fileSettingsManager } from "../src/settings/manager.ts";
import { shouldLaunchSettingsEditor } from "../src/commands/settings.ts";
import { SETTINGS_REGISTRY, writeRegisteredSetting } from "../src/settings/registry.ts";
import { createEditorState, editorReducer } from "../src/settings/editor.ts";
import { commitAndFlush, loadEntries, type Session } from "../src/settings/shell/state.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import type { EditorSetting, SettingSpec } from "../src/types/settings.ts";

const dirs: OrchDir[] = [];

function tempDir(prefix: string): OrchDir {
  const directory = tempOrchDir(prefix);
  dirs.push(directory);
  return directory;
}

afterEach(() => {
  while (dirs.length) removeTempDir(dirs.pop() ?? "");
});

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

  test("registered writes use the registry entry", () => {
    const directory = tempDir("orch-settings-shell-");
    writeSettingsFixture(directory, { defaults: { adapter: "pi", backend: "headless" } });
    writeRegisteredSetting(fileSettingsManager(directory), "fleet.max_depth", 4);
    expect(fileSettingsManager(directory).current().fleet.max_depth).toBe(4);
    const text = readFileSync(join(directory, "settings.json"), "utf8");
    expect(text).toContain('"max_depth": 4');
  });

  test("a committed choice shows its saved value on the next screen", () => {
    const directory = tempDir("orch-settings-shell-");
    writeSettingsFixture(directory, { mail: { to_spawner: "prompt" } });
    const manager = fileSettingsManager(directory);
    const session: Session = { state: createEditorState(loadEntries(manager)), filter: "", status: undefined, quit: false, escapeClearedFilter: false };
    const index = session.state.settings.findIndex((entry) => entry.spec.key === "mail.to_spawner");
    const opened = editorReducer({ ...session.state, focusedIndex: index }, { type: "open" });
    expect(opened.mode).toBe("editing");
    if (opened.mode !== "editing") return;

    commitAndFlush(session, manager, opened, "prompt-unless-focused");

    expect(session.status).toBe("mail.to_spawner saved");
    expect(session.state.settings[session.state.focusedIndex]?.value).toBe("prompt-unless-focused");
    expect(manager.current().mail.to_spawner).toBe("prompt-unless-focused");
  });

  test("registry exposes writable subcommand entries", () => {
    for (const key of ["defaults.models", "models.preferred", "models.allowed", "skills.install", "skills.store", "skills.link", "notify", "defaults.thinking", "defaults.thinking_by_harness"]) {
      expect(SETTINGS_REGISTRY.find((entry) => entry.key === key)?.write, key).toBeDefined();
    }
  });
});
