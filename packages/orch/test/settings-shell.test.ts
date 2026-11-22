import type { OrchDir } from "../src/types/core.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { readFileSync } from "node:fs";

import { join } from "node:path";
import { fileSettingsManager, projectSettingsManager } from "../src/settings/manager.ts";
import { shouldLaunchSettingsEditor } from "../src/commands/settings.ts";
import { SETTINGS_REGISTRY, writeRegisteredSetting } from "../src/settings/registry.ts";
import { createEditorState, editorReducer } from "../src/settings/editor.ts";
import { commitAndFlush, loadEntries, switchView, toggleAgentGrant, type Session } from "../src/settings/shell/state.ts";
import { writeProjectSettingsFixture, writeSettingsFixture } from "./helpers/settings.ts";

const dirs: OrchDir[] = [];

function tempDir(prefix: string): OrchDir {
  const directory = tempOrchDir(prefix);
  dirs.push(directory);
  return directory;
}

afterEach(() => {
  while (dirs.length) removeTempDir(dirs.pop() ?? "");
});

describe("the Project and Install views", () => {
  test("the Project view lists only project keys and shows the project's source", () => {
    const directory = tempDir("orch-settings-shell-");
    const project = tempDir("orch-settings-project-");
    writeSettingsFixture(directory, { workers: { verify_commands: ["go vet"] } });
    writeProjectSettingsFixture(project, { workers: { verify_commands: ["bunx oxlint"] } });
    const rows = loadEntries(projectSettingsManager(project, fileSettingsManager(directory)));
    expect(rows.some((row) => row.spec.scope === "install")).toBe(false);
    const verify = rows.find((row) => row.spec.key === "workers.verify_commands");
    expect(verify?.value).toEqual(["bunx oxlint"]);
    expect(verify?.source).toBe("project");
    const fleet = rows.find((row) => row.spec.key === "fleet.max_agents_per_tab");
    expect(fleet).toBeDefined();
    expect(fleet?.source === "default" || fleet?.source === "install").toBe(true);
  });

  test("Tab switches the view and keeps the focused key", () => {
    const directory = tempDir("orch-settings-shell-");
    const project = tempDir("orch-settings-project-");
    writeSettingsFixture(directory, {});
    writeProjectSettingsFixture(project, {});
    const install = fileSettingsManager(directory);
    const manager = projectSettingsManager(project, install);
    const state = createEditorState(loadEntries(manager));
    const session: Session = { state: { ...state, focusedIndex: state.settings.findIndex((row) => row.spec.key === "workers.verify_commands") }, filter: "", searching: false, status: undefined, quit: false, filterKeySpent: false, views: { install, project: manager }, view: "project" };
    switchView(session);
    expect(session.view).toBe("install");
    expect(session.state.settings[session.state.focusedIndex]?.spec.key).toBe("workers.verify_commands");
    expect(session.state.settings.some((row) => row.spec.scope === "install")).toBe(true);
  });

  test("with no project file there is only the Install view", () => {
    const directory = tempDir("orch-settings-shell-");
    writeSettingsFixture(directory, {});
    const manager = fileSettingsManager(directory);
    const session: Session = { state: createEditorState(loadEntries(manager)), filter: "", searching: false, status: undefined, quit: false, filterKeySpent: false, views: { install: manager, project: null }, view: "install" };
    switchView(session);
    expect(session.view).toBe("install");
    expect(session.status).toContain("only the Install view");
  });
});

describe("settings shell decisions", () => {
  test("non-TTY takes the print path", () => {
    expect(shouldLaunchSettingsEditor([], false)).toBe(false);
    expect(shouldLaunchSettingsEditor(["--json"], true)).toBe(false);
    expect(shouldLaunchSettingsEditor([], true)).toBe(true);
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
    const session: Session = { state: createEditorState(loadEntries(manager)), filter: "", searching: false, status: undefined, quit: false, filterKeySpent: false, views: { install: manager, project: null }, view: "install" };
    const index = session.state.settings.findIndex((entry) => entry.spec.key === "mail.to_spawner");
    const opened = editorReducer({ ...session.state, focusedIndex: index }, { type: "open" });
    expect(opened.mode).toBe("editing");
    if (opened.mode !== "editing") return;

    commitAndFlush(session, manager, opened, "prompt-unless-focused");

    expect(session.status).toBe("mail.to_spawner saved");
    expect(session.state.settings[session.state.focusedIndex]?.value).toBe("prompt-unless-focused");
    expect(manager.current().mail.to_spawner).toBe("prompt-unless-focused");
  });

  test("the a key flips whether an agent may write the focused row", () => {
    const directory = tempDir("orch-settings-shell-");
    writeSettingsFixture(directory, { defaults: { adapter: "pi", backend: "headless" } });
    const manager = fileSettingsManager(directory);
    const session: Session = { state: createEditorState(loadEntries(manager)), filter: "", searching: false, status: undefined, quit: false, filterKeySpent: false, views: { install: manager, project: null }, view: "install" };
    const focusOn = (key: string): void => {
      session.state = { ...session.state, focusedIndex: session.state.settings.findIndex((entry) => entry.spec.key === key) };
    };

    focusOn("fleet.max_depth");
    expect(session.state.settings[session.state.focusedIndex]?.agentWritable).toBe(false);
    toggleAgentGrant(session, manager);
    expect(session.status).toBe("fleet.max_depth: an agent may write it");
    expect(session.state.settings[session.state.focusedIndex]?.agentWritable).toBe(true);
    expect(manager.current().agents.writable_settings).toEqual(["workers.verify_commands", "locked_commands.commands", "fleet.max_depth"]);

    toggleAgentGrant(session, manager);
    expect(session.status).toBe("fleet.max_depth: the human alone writes it");
    expect(manager.current().agents.writable_settings).toEqual(["workers.verify_commands", "locked_commands.commands"]);

    focusOn("runtime");
    toggleAgentGrant(session, manager);
    expect(session.status).toBe("runtime is read-only; nobody writes it");

    focusOn("agents.writable_settings");
    toggleAgentGrant(session, manager);
    expect(session.status).toBe("agents.writable_settings never grants itself");
  });

  test("registry exposes writable subcommand entries", () => {
    for (const key of ["defaults.models", "models.preferred", "models.allowed", "skills.install", "skills.store", "skills.link", "notify", "defaults.thinking", "defaults.thinking_by_harness"]) {
      expect(SETTINGS_REGISTRY.find((entry) => entry.key === key)?.write, key).toBeDefined();
    }
  });
});
