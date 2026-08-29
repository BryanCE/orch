import type { BrowsingState, EditorAction, EditorSetting, EditorState, PendingWrite, SettingKind } from "../types/config.ts";

/** Create a browsing editor over a grouped, ordered copy of the declarations. */
export function createEditorState(settings: readonly EditorSetting[]): BrowsingState {
  const ordered = [...settings].sort((left, right) => {
    const groupOrder = left.spec.group.localeCompare(right.spec.group);
    return groupOrder === 0 ? left.spec.key.localeCompare(right.spec.key) : groupOrder;
  });
  return {
    mode: "browsing",
    settings: ordered,
    focusedIndex: 0,
    pendingWrites: [],
  };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "move":
      if (state.mode !== "browsing" || state.settings.length === 0) return state;
      {
        const delta = action.direction === "down" ? 1 : -1;
        const nextIndex = Math.max(
          0,
          Math.min(state.settings.length - 1, state.focusedIndex + delta),
        );
        return { ...state, focusedIndex: nextIndex, reason: undefined };
      }
    case "open":
      if (state.mode !== "browsing") return state;
      {
        const focused = state.settings[state.focusedIndex];
        if (focused === undefined) return { ...state, reason: "No settings available" };
        if (focused.override !== undefined) {
          return { ...state, reason: `${focused.spec.key} is overridden by ${focused.override}` };
        }
        if (focused.spec.env !== undefined && process.env[focused.spec.env] !== undefined) {
          return { ...state, reason: `${focused.spec.key} is overridden by ${focused.spec.env}` };
        }
        if (focused.spec.write === undefined) {
          return { ...state, reason: `${focused.spec.key} is read-only` };
        }
        return {
          mode: "editing",
          settings: state.settings,
          focusedIndex: state.focusedIndex,
          focused,
          draft: focused.value,
          pendingWrites: state.pendingWrites,
        };
      }
    case "cancel":
      if (state.mode !== "editing") return state;
      return {
        mode: "browsing",
        settings: state.settings,
        focusedIndex: state.focusedIndex,
        pendingWrites: state.pendingWrites,
      };
    case "commit":
      if (state.mode !== "editing") return state;
      {
        const validationReason = validateValue(state.focused.spec.type, action.value);
        if (validationReason !== null) {
          return { ...state, reason: validationReason };
        }
        const updatedSetting: EditorSetting = { spec: state.focused.spec, value: action.value };
        const settings = state.settings.map((setting, index) =>
          index === state.focusedIndex ? updatedSetting : setting,
        );
        const pendingWrites = upsertWrite(state.pendingWrites, {
          key: state.focused.spec.key,
          value: action.value,
        });
        return {
          mode: "browsing",
          settings,
          focusedIndex: state.focusedIndex,
          pendingWrites,
        };
      }
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

function upsertWrite(
  writes: readonly PendingWrite[],
  next: PendingWrite,
): readonly PendingWrite[] {
  const existingIndex = writes.findIndex((write) => write.key === next.key);
  if (existingIndex < 0) return [...writes, next];
  return writes.map((write, index) => (index === existingIndex ? next : write));
}

function validateValue(kind: SettingKind, value: unknown): string | null {
  switch (kind.kind) {
    case "boolean":
      return typeof value === "boolean" ? null : "Value must be a boolean";
    case "integer":
      if (typeof value !== "number" || !Number.isInteger(value)) return "Value must be an integer";
      if (kind.min !== undefined && value < kind.min) return `Value must be at least ${kind.min}`;
      if (kind.max !== undefined && value > kind.max) return `Value must be at most ${kind.max}`;
      return null;
    case "choice":
      return typeof value === "string" && kind.choices.includes(value)
        ? null
        : `Value must be one of: ${kind.choices.join(", ")}`;
    case "multi":
      if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
        return "Value must be a list of strings";
      }
      return value.every((item) => kind.choices.includes(item))
        ? null
        : `Values must be chosen from: ${kind.choices.join(", ")}`;
    case "text":
      return typeof value === "string" ? null : "Value must be text";
    case "list":
      return Array.isArray(value) && value.every((item) => typeof item === "string")
        ? null
        : "Value must be a list of strings";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
