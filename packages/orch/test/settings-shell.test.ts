import type { OrchDir } from "../src/types/core.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { readFileSync } from "node:fs";

import { join } from "node:path";
import { fileSettingsManager, projectSettingsManager } from "../src/settings/manager.ts";
import { settingsEditorMode } from "../src/commands/settings.ts";
import { SETTINGS_REGISTRY, writeRegisteredSetting } from "../src/settings/registry.ts";
import { createEditorState, editorReducer } from "../src/settings/editor.ts";
import { loadEntries, localRefusal, resetFocused, screenOf, toggleAgentGrant, writeCommitted, type SaveMode, type Session, type SettingsLayers } from "../src/settings/shell/state.ts";
import type { BrowsingState } from "../src/types/settings.ts";
import type { SettingsManager } from "../src/types/services.ts";
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

function sessionOver(layers: SettingsLayers, save: SaveMode = { kind: "global" }): Session {
  return { state: createEditorState(loadEntries(layers)), filter: "", searching: false, status: undefined, quit: false, filterKeySpent: false, layers, save };
}

function focusOn(session: Session, key: string): void {
  session.state = { ...session.state, focusedIndex: session.state.settings.findIndex((entry) => entry.spec.key === key) };
}

/** Open the focused row and commit `value` through the reducer. */
function committedEdit(session: Session, value: unknown): BrowsingState {
  const opened = editorReducer(session.state, { type: "open" });
  if (opened.mode !== "editing") throw new Error("the focused row did not open");
  const committed = editorReducer(opened, { type: "commit", value });
  if (committed.mode !== "browsing") throw new Error("the reducer refused the value");
  return committed;
}

/** A global file, a project with `local` as its local file, and the two managers. */
function layered(global: Record<string, unknown>, local: Record<string, unknown> | null): { install: SettingsManager; project: SettingsManager } {
  const directory = tempDir("orch-settings-shell-");
  const project = tempDir("orch-settings-project-");
  writeSettingsFixture(directory, global);
  if (local !== null) writeProjectSettingsFixture(project, local);
  const install = fileSettingsManager(directory);
  return { install, project: projectSettingsManager(project, install) };
}

describe("one editor, two files", () => {
  test("both editors show the same rows, and a local value names the global value it replaces", () => {
    const layers = layered({ workers: { verify_commands: ["go vet"] } }, { workers: { verify_commands: ["bunx oxlint"] } });
    const global = sessionOver(layers);
    const local = sessionOver(layers, { kind: "local", local: layers.project });
    expect(local.state.settings).toEqual(global.state.settings);
    const verify = global.state.settings.find((row) => row.spec.key === "workers.verify_commands");
    expect(verify?.value).toEqual(["bunx oxlint"]);
    expect(verify?.source).toEqual({ kind: "project", overrides: ["go vet"] });
    expect(screenOf(global).editing).toBe("global");
    expect(screenOf(local).editing).toBe("local");
  });

  test("orch settings saves to the global file, and every project without a local value gets it", () => {
    const layers = layered({}, null);
    const session = sessionOver(layers);
    focusOn(session, "council.rounds");

    writeCommitted(session, committedEdit(session, 5), "council.rounds");

    expect(session.status).toBe(`council.rounds saved to global ${layers.install.file}`);
    expect(layers.install.current().council.rounds).toBe(5);
    expect(projectSettingsManager(tempDir("orch-settings-project-"), layers.install).current().council.rounds).toBe(5);
  });

  test("a global save under a local value says the local value still applies", () => {
    const layers = layered({ council: { rounds: 4 } }, { council: { rounds: 2 } });
    const session = sessionOver(layers);
    focusOn(session, "council.rounds");

    writeCommitted(session, committedEdit(session, 6), "council.rounds");

    expect(layers.install.current().council.rounds).toBe(6);
    expect(session.status).toContain("The local value still applies here");
    expect(session.state.settings[session.state.focusedIndex]?.value).toBe(2);
  });

  test("orch settings --local saves and clears in the local file and leaves the global file alone", () => {
    const layers = layered({ council: { rounds: 4 } }, null);
    const session = sessionOver(layers, { kind: "local", local: layers.project });
    focusOn(session, "council.rounds");

    writeCommitted(session, committedEdit(session, 2), "council.rounds");
    expect(session.status).toBe(`council.rounds saved to local ${layers.project.file}`);
    expect(layers.project.current().council.rounds).toBe(2);
    expect(layers.install.current().council.rounds).toBe(4);

    resetFocused(session);
    expect(session.status).toBe("council.rounds: local value cleared, the global value applies");
    expect(session.state.settings[session.state.focusedIndex]?.source).toEqual({ kind: "install" });
    expect(layers.install.current().council.rounds).toBe(4);
  });

  test("orch settings --local refuses a global-only key", () => {
    const layers = layered({}, null);
    const session = sessionOver(layers, { kind: "local", local: layers.project });
    focusOn(session, "daemon.tcp_port");
    const row = session.state.settings[session.state.focusedIndex];
    if (row === undefined) throw new Error("no daemon.tcp_port row");
    expect(localRefusal(session, row.spec)).toContain("global only");
    resetFocused(session);
    expect(session.status).toContain("global only");
  });

  test("ctrl+d in orch settings clears the global value", () => {
    const layers = layered({ council: { rounds: 4 } }, null);
    const session = sessionOver(layers);
    focusOn(session, "council.rounds");

    resetFocused(session);

    expect(session.status).toBe("council.rounds: global value cleared, the default applies");
    expect(session.state.settings[session.state.focusedIndex]?.source).toEqual({ kind: "default" });
  });
});

describe("settings shell decisions", () => {
  test("non-TTY takes the print path", () => {
    expect(settingsEditorMode([], false)).toBeNull();
    expect(settingsEditorMode(["--local"], false)).toBeNull();
    expect(settingsEditorMode(["--json"], true)).toBeNull();
    expect(settingsEditorMode(["--local", "--json"], true)).toBeNull();
    expect(settingsEditorMode([], true)).toBe("global");
    expect(settingsEditorMode(["--local"], true)).toBe("local");
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
    const session = sessionOver({ install: manager, project: null });
    focusOn(session, "mail.to_spawner");
    writeCommitted(session, committedEdit(session, "prompt-unless-focused"), "mail.to_spawner");

    expect(session.status).toBe(`mail.to_spawner saved to global ${manager.file}`);
    expect(session.state.settings[session.state.focusedIndex]?.value).toBe("prompt-unless-focused");
    expect(manager.current().mail.to_spawner).toBe("prompt-unless-focused");
  });

  test("the a key flips whether an agent may write the focused row", () => {
    const directory = tempDir("orch-settings-shell-");
    writeSettingsFixture(directory, { defaults: { adapter: "pi", backend: "headless" } });
    const manager = fileSettingsManager(directory);
    const session = sessionOver({ install: manager, project: null });

    focusOn(session, "fleet.max_depth");
    expect(session.state.settings[session.state.focusedIndex]?.agentWritable).toBe(false);
    toggleAgentGrant(session);
    expect(session.status).toBe(`fleet.max_depth: an agent may write it (global ${manager.file})`);
    expect(session.state.settings[session.state.focusedIndex]?.agentWritable).toBe(true);
    expect(manager.current().agents.writable_settings).toEqual(["workers.verify_commands", "locked_commands.commands", "fleet.max_depth"]);

    toggleAgentGrant(session);
    expect(session.status).toBe(`fleet.max_depth: the human alone writes it (global ${manager.file})`);
    expect(manager.current().agents.writable_settings).toEqual(["workers.verify_commands", "locked_commands.commands"]);

    focusOn(session, "runtime");
    toggleAgentGrant(session);
    expect(session.status).toBe("runtime is read-only; nobody writes it");

    focusOn(session, "agents.writable_settings");
    toggleAgentGrant(session);
    expect(session.status).toBe("agents.writable_settings never grants itself");
  });

  test("registry exposes writable subcommand entries", () => {
    for (const key of ["defaults.models", "models.preferred", "models.allowed", "skills.install", "skills.store", "skills.link", "notify", "defaults.thinking", "defaults.thinking_by_harness"]) {
      expect(SETTINGS_REGISTRY.find((entry) => entry.key === key)?.write, key).toBeDefined();
    }
  });
});
