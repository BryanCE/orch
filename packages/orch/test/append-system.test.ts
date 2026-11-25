import { describe, test, expect, afterEach } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { tempOrchDir, removeTempDir } from "./helpers/tempdir.ts";
import { writeSettingsFixture, writeProjectSettingsFixture } from "./helpers/settings.ts";
import { fileSettingsManager, projectSettingsManager } from "../src/settings/manager.ts";
import { clearRegisteredSetting, writeRegisteredSetting } from "../src/settings/registry.ts";
import { projectSettings } from "../src/settings/project.ts";
import { APPEND_SYSTEM_KEY, addPromptEntry, appendedEntries, clearPromptEntries, namePromptFile, promptEntries, promptEntry, promptPath, removePromptEntry } from "../src/settings/append-system.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { PromptEntry } from "../src/settings/append-system.ts";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs) removeTempDir(dir);
  dirs.length = 0;
});

function tempDir(prefix: string): OrchDir {
  const dir = tempOrchDir(prefix);
  dirs.push(dir);
  return dir;
}

function setup(settings: Record<string, unknown> = {}) {
  const orchDir = tempDir("orch-append-install-");
  writeSettingsFixture(orchDir, settings);
  const install = fileSettingsManager(orchDir);
  const project = tempDir("orch-append-project-");
  return {
    orchDir,
    install,
    project,
    local: () => projectSettingsManager(project, install),
    read: () => appendedEntries(projectSettings(project, install), install.file),
  };
}

/** `text` as one entry; a fixture with no text is a broken test. */
function entryOf(text: string): PromptEntry {
  const entry = promptEntry(text);
  if (entry === null) throw new Error(`no entry in ${JSON.stringify(text)}`);
  return entry;
}

/** Entries as plain strings, to compare with literals. */
function plain(entries: readonly PromptEntry[]): string[] {
  return entries.map((entry): string => entry);
}

function writeText(file: string, text: string): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
}

describe("appendedEntries", () => {
  test("no file at either level gives null", () => {
    const { read } = setup();
    expect(plain(read())).toEqual([]);
  });

  test("the global APPEND_SYSTEM.md applies when the project has none", () => {
    const { orchDir, read } = setup();
    writeText(path.join(orchDir, "APPEND_SYSTEM.md"), "  global rules\n");
    expect(plain(read())).toEqual(["global rules"]);
  });

  test("the project's .orch/APPEND_SYSTEM.md wins over the global one", () => {
    const { orchDir, project, read } = setup();
    writeText(path.join(orchDir, "APPEND_SYSTEM.md"), "global rules");
    writeText(path.join(project, ".orch", "APPEND_SYSTEM.md"), "project rules");
    expect(plain(read())).toEqual(["project rules"]);
  });

  test("a project that names a missing file gives null, not the global text", () => {
    const { orchDir, project, read } = setup();
    writeText(path.join(orchDir, "APPEND_SYSTEM.md"), "global rules");
    writeProjectSettingsFixture(project, { orchs: { append_system_prompt: "missing.md" } });
    expect(plain(read())).toEqual([]);
  });

  test("a global path is read relative to the global settings directory", () => {
    const { orchDir, read } = setup({ orchs: { append_system_prompt: "rules/orch.md" } });
    writeText(path.join(orchDir, "rules", "orch.md"), "named rules");
    expect(plain(read())).toEqual(["named rules"]);
  });
});

describe("prompt entries", () => {
  test("add appends each entry to the global file and keeps the earlier ones", () => {
    const { orchDir, install, read } = setup();
    addPromptEntry(install, entryOf("Never pass --model."));
    const listed = addPromptEntry(install, entryOf("Never pass --harness."));
    expect(plain(listed.entries)).toEqual(["Never pass --model.", "Never pass --harness."]);
    expect(readFileSync(path.join(orchDir, "APPEND_SYSTEM.md"), "utf8")).toBe("Never pass --model.\n\nNever pass --harness.\n");
    expect(plain(read())).toEqual(["Never pass --model.", "Never pass --harness."]);
  });

  test("an entry the level already holds is not added again", () => {
    const { install } = setup();
    addPromptEntry(install, entryOf("Never pass --model."));
    expect(plain(addPromptEntry(install, entryOf("  Never pass --model.  ")).entries)).toEqual(["Never pass --model."]);
  });

  test("an entry's blank lines are dropped, so it reads back as one entry", () => {
    const { install } = setup();
    addPromptEntry(install, entryOf("Models:\n\n- use the defaults\n"));
    expect(plain(promptEntries(install).entries)).toEqual(["Models:\n- use the defaults"]);
    expect(promptEntry(" \n\n ")).toBeNull();
  });

  test("a multi-line entry stays one entry", () => {
    const { install } = setup();
    addPromptEntry(install, entryOf("Models:\n- use the defaults"));
    addPromptEntry(install, entryOf("Tabs: one per area."));
    expect(plain(promptEntries(install).entries)).toEqual(["Models:\n- use the defaults", "Tabs: one per area."]);
  });

  test("a local add lands in the project's file and leaves the global one", () => {
    const { orchDir, project, local, read } = setup();
    addPromptEntry(local(), entryOf("Project rule."));
    expect(readFileSync(path.join(project, ".orch", "APPEND_SYSTEM.md"), "utf8")).toBe("Project rule.\n");
    expect(existsSync(path.join(orchDir, "APPEND_SYSTEM.md"))).toBe(false);
    expect(plain(read())).toEqual(["Project rule."]);
  });

  test("remove drops the numbered entry and keeps the rest in order", () => {
    const { install } = setup();
    for (const text of ["One.", "Two.", "Three."]) addPromptEntry(install, entryOf(text));
    expect(plain(removePromptEntry(install, 2).entries)).toEqual(["One.", "Three."]);
  });

  test("remove refuses a number the list does not have", () => {
    const { install } = setup();
    addPromptEntry(install, entryOf("One."));
    expect(() => removePromptEntry(install, 2)).toThrow("it holds 1");
    expect(() => removePromptEntry(install, 0)).toThrow("No prompt entry 0");
  });

  test("removing the last entry deletes orch's own file", () => {
    const { orchDir, install } = setup();
    addPromptEntry(install, entryOf("One."));
    removePromptEntry(install, 1);
    expect(existsSync(path.join(orchDir, "APPEND_SYSTEM.md"))).toBe(false);
  });

  test("a local clear drops the project's entries, and the global ones apply again", () => {
    const { install, project, local, read } = setup();
    addPromptEntry(install, entryOf("Global rule."));
    addPromptEntry(local(), entryOf("Project rule."));
    expect(plain(clearPromptEntries(local()).entries)).toEqual([]);
    expect(existsSync(path.join(project, ".orch", "APPEND_SYSTEM.md"))).toBe(false);
    expect(plain(read())).toEqual(["Global rule."]);
  });

  test("clear stops reading a named file and leaves that file on disk", () => {
    const { install, project, local, read } = setup();
    const own = path.join(project, "notes.md");
    writeText(own, "my notes");
    writeRegisteredSetting(local(), APPEND_SYSTEM_KEY, own);
    clearPromptEntries(local());
    expect(projectSettings(project, install).values?.orchs?.append_system_prompt).toBeUndefined();
    expect(readFileSync(own, "utf8")).toBe("my notes");
    expect(plain(read())).toEqual([]);
  });
});

describe("the orchs.append_system_prompt key", () => {
  test("text is one more entry", () => {
    const { install } = setup();
    writeRegisteredSetting(install, APPEND_SYSTEM_KEY, "Never pass --model.");
    writeRegisteredSetting(install, APPEND_SYSTEM_KEY, "Never pass --harness.");
    expect(plain(promptEntries(install).entries)).toEqual(["Never pass --model.", "Never pass --harness."]);
  });

  test("an existing file becomes the setting as an absolute path, and later text adds to it", () => {
    const { install, project, local, read } = setup();
    const own = path.join(project, "notes.md");
    writeText(own, "my notes");
    writeRegisteredSetting(local(), APPEND_SYSTEM_KEY, own);
    expect(projectSettings(project, install).values?.orchs?.append_system_prompt).toBe(own);
    writeRegisteredSetting(local(), APPEND_SYSTEM_KEY, "New rule text.");
    expect(readFileSync(own, "utf8")).toBe("my notes\n\nNew rule text.\n");
    expect(plain(read())).toEqual(["my notes", "New rule text."]);
  });

  test("--clear drops every entry the level adds", () => {
    const { orchDir, install } = setup();
    writeRegisteredSetting(install, APPEND_SYSTEM_KEY, "Never pass --model.");
    clearRegisteredSetting(install, APPEND_SYSTEM_KEY);
    expect(existsSync(path.join(orchDir, "APPEND_SYSTEM.md"))).toBe(false);
    expect(plain(promptEntries(install).entries)).toEqual([]);
  });

  test("one word that names no file is refused", () => {
    const { install } = setup();
    expect(() => writeRegisteredSetting(install, APPEND_SYSTEM_KEY, "typo.md")).toThrow("names no file");
  });
});

describe("namePromptFile", () => {
  test("a file that exists becomes the level's file, and adds go to it", () => {
    const { project, local, read } = setup();
    const own = path.join(project, "rules.md");
    writeText(own, "my rule");
    namePromptFile(local(), promptPath(project, own));
    addPromptEntry(local(), entryOf("Another rule."));
    expect(plain(read())).toEqual(["my rule", "Another rule."]);
  });

  test("a missing file is made empty, becomes the level's file, and takes the next entry", () => {
    const { project, local, read } = setup();
    const own = path.join(project, "notes", "rules.md");
    namePromptFile(local(), promptPath(project, own));
    expect(readFileSync(own, "utf8")).toBe("");
    addPromptEntry(local(), entryOf("First rule."));
    expect(readFileSync(own, "utf8")).toBe("First rule.\n");
    expect(plain(read())).toEqual(["First rule."]);
  });
});
