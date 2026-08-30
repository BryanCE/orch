import { describe, expect, test } from "bun:test";
import type { EditorSetting, OrchConfig, SettingKind, SettingSpec } from "../src/types/config.ts";
import { createEditorState, editorReducer } from "../src/settings/editor.ts";

const configReader = (value: unknown): ((config: OrchConfig) => unknown) =>
  (_config: OrchConfig) => value;

function setting(
  key: string,
  type: SettingKind,
  value: unknown,
  write: SettingSpec["write"] = (_orchDir: string, _value: unknown) => undefined,
): EditorSetting {
  const spec: SettingSpec = {
    key,
    group: key.split(".")[0] ?? "settings",
    help: `Help for ${key}`,
    type,
    read: configReader(value),
    write,
  };
  return { spec, value };
}

function readOnlySetting(key: string, type: SettingKind, value: unknown): EditorSetting {
  const spec: SettingSpec = {
    key,
    group: key.split(".")[0] ?? "settings",
    help: `Help for ${key}`,
    type,
    read: configReader(value),
  };
  return { spec, value };
}

describe("settings editor reducer", () => {
  test("moves focus down and up without running off either end", () => {
    const initial = createEditorState([
      setting("fleet.cap", { kind: "integer", min: 1 }, 2),
      setting("notify.enabled", { kind: "boolean" }, true),
    ]);

    const atBottom = editorReducer(
      editorReducer(initial, { type: "move", direction: "down" }),
      { type: "move", direction: "down" },
    );
    expect(atBottom.mode).toBe("browsing");
    expect(atBottom.focusedIndex).toBe(1);

    const atTop = editorReducer(atBottom, { type: "move", direction: "up" });
    expect(atTop.focusedIndex).toBe(0);
    expect(editorReducer(atTop, { type: "move", direction: "up" }).focusedIndex).toBe(0);
  });

  test("opens the focused setting for editing", () => {
    const state = createEditorState([setting("fleet.cap", { kind: "integer" }, 2)]);
    const editing = editorReducer(state, { type: "open" });
    expect(editing.mode).toBe("editing");
    if (editing.mode === "editing") {
      expect(editing.focused.spec.key).toBe("fleet.cap");
      expect(editing.draft).toBe(2);
    }
  });

  test("cancel leaves value unchanged and returns to browsing", () => {
    const state = createEditorState([setting("fleet.cap", { kind: "integer" }, 2)]);
    const editing = editorReducer(state, { type: "open" });
    const cancelled = editorReducer(editing, { type: "cancel" });
    expect(cancelled.mode).toBe("browsing");
    expect(cancelled.settings[0]?.value).toBe(2);
    expect(cancelled.pendingWrites).toHaveLength(0);
  });

  test("commit updates value and produces a pending write", () => {
    const state = createEditorState([setting("fleet.cap", { kind: "integer" }, 2)]);
    const editing = editorReducer(state, { type: "open" });
    const committed = editorReducer(editing, { type: "commit", value: 5 });
    expect(committed.mode).toBe("browsing");
    expect(committed.settings[0]?.value).toBe(5);
    expect(committed.pendingWrites).toEqual([{ key: "fleet.cap", value: 5 }]);
  });

  test("refuses invalid values with a reason and stays open", () => {
    const state = createEditorState([setting("fleet.cap", { kind: "integer", min: 1, max: 5 }, 2)]);
    const editing = editorReducer(state, { type: "open" });
    const refused = editorReducer(editing, { type: "commit", value: 9 });
    expect(refused.mode).toBe("editing");
    if (refused.mode === "editing") {
      expect(refused.focused.spec.key).toBe("fleet.cap");
      expect(refused.reason).toContain("at most 5");
      expect(refused.draft).toBe(2);
      expect(refused.pendingWrites).toHaveLength(0);
    }
  });

  test("refuses opening a read-only setting with a reason", () => {
    const state = createEditorState([readOnlySetting("version", { kind: "text" }, "1")]);
    const refused = editorReducer(state, { type: "open" });
    expect(refused.mode).toBe("browsing");
    expect(refused.reason).toContain("read-only");
  });

  test("cancelling without a commit yields zero writes", () => {
    const state = createEditorState([setting("fleet.cap", { kind: "integer" }, 2)]);
    const exited = editorReducer(editorReducer(state, { type: "open" }), { type: "cancel" });
    expect(exited.pendingWrites).toEqual([]);
  });
});
