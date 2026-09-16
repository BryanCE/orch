import type { Key } from "node:readline";
import { getColumns, getRows, isCancel, Prompt, SelectPrompt, TextPrompt } from "@clack/core";
import type { SettingsManager } from "../../types/services.ts";
import { CLEAR_SCREEN, CTRL_C } from "../../tui/screen.ts";
import { parseSettingValue } from "../parse.ts";
import { displayValue } from "../display.ts";
import {
  BROWSE_KEYBAR,
  inputCursor,
  INPUT_KEYBAR,
  inputOverlay,
  SEARCH_KEYBAR,
  SELECT_KEYBAR,
  selectOverlay,
  settingsFrame,
  visibleEntryIndices,
} from "../view.ts";
import type { EditingState } from "../../types/settings.ts";
import { editorReducer } from "../editor.ts";
import { askMulti, submittedText } from "./ask.ts";
import { editSinks } from "./sinks.ts";
import { asBrowsing, commitAndFlush, refocusVisible, resetFocused, screenOf, stepFocus, type Session } from "./state.ts";

type BrowseOutcome = "open" | "again" | "quit";

const SEARCH_KEY = "/";

function isPrintable(char: string | undefined, info: Key): char is string {
  return typeof char === "string" && char.length === 1 && char >= " " && info.ctrl !== true && info.meta !== true;
}

function clearFilter(session: Session): void {
  session.filter = "";
  session.searching = false;
  session.filterKeySpent = true;
  refocusVisible(session);
}

/** A key while searching: Enter keeps the matches, Escape clears them, everything else types. */
function searchKey(session: Session, char: string | undefined, info: Key): void {
  if (info.name === "return") {
    session.searching = false;
    session.filterKeySpent = true;
    return;
  }
  if (info.name === "escape") {
    clearFilter(session);
    return;
  }
  if (info.name === "up" || info.name === "down") {
    session.state = stepFocus(session.state, session.filter, info.name);
    return;
  }
  if (info.name === "backspace") {
    session.filter = session.filter.slice(0, -1);
    refocusVisible(session);
    return;
  }
  if (isPrintable(char, info)) {
    session.filter += char;
    refocusVisible(session);
  }
}

/** A key while browsing: move, open search, reset, or leave. Enter falls through to the prompt submit. */
function browseKey(session: Session, manager: SettingsManager, char: string | undefined, info: Key): void {
  if (info.name === "return") return;
  if (info.name === "escape") {
    if (session.filter === "") session.quit = true;
    else clearFilter(session);
    return;
  }
  if (info.name === "up" || info.name === "down") {
    session.state = stepFocus(session.state, session.filter, info.name);
    return;
  }
  if (info.ctrl === true && info.name === "d") {
    resetFocused(session, manager);
    return;
  }
  if (char === SEARCH_KEY) session.searching = true;
}

/** One browsing prompt: navigate, search, reset — until Enter opens or Escape/ctrl+c leaves. */
export async function browseOnce(session: Session, manager: SettingsManager): Promise<BrowseOutcome> {
  process.stdout.write(CLEAR_SCREEN);
  const prompt = new Prompt<undefined>({
    render: () => settingsFrame(
      screenOf(session, manager),
      getColumns(process.stdout),
      getRows(process.stdout),
      undefined,
      session.searching ? SEARCH_KEYBAR : BROWSE_KEYBAR,
    ),
  }, false);
  prompt.on("key", (char, info) => {
    if (info.name !== "return") session.status = undefined;
    if (char === CTRL_C) {
      session.quit = true;
      return;
    }
    if (session.searching) searchKey(session, char, info);
    else browseKey(session, manager, char, info);
  });
  const answer = await prompt.prompt();
  if (session.quit) return "quit";
  if (session.filterKeySpent) {
    session.filterKeySpent = false;
    return "again";
  }
  if (isCancel(answer)) return "quit";
  if (visibleEntryIndices(session.state.settings, session.filter).includes(session.state.focusedIndex)) return "open";
  session.status = `no settings match ${JSON.stringify(session.filter)}`;
  return "again";
}

async function editChoice(session: Session, manager: SettingsManager, editing: EditingState, choices: readonly string[]): Promise<void> {
  process.stdout.write(CLEAR_SCREEN);
  const prompt = new SelectPrompt<{ value: string }>({
    options: choices.map((value) => ({ value })),
    ...(typeof editing.draft === "string" && choices.includes(editing.draft) ? { initialValue: editing.draft } : {}),
    render() {
      return settingsFrame(
        screenOf(session, manager),
        getColumns(process.stdout),
        getRows(process.stdout),
        selectOverlay(choices, this.cursor),
        SELECT_KEYBAR,
      );
    },
  });
  const answer = await prompt.prompt();
  if (isCancel(answer) || typeof answer !== "string") {
    session.state = asBrowsing(editorReducer(editing, { type: "cancel" }));
    return;
  }
  commitAndFlush(session, manager, editing, answer);
}

async function editMulti(session: Session, manager: SettingsManager, editing: EditingState, choices: readonly string[]): Promise<void> {
  const current = Array.isArray(editing.draft)
    ? editing.draft.filter((value): value is string => typeof value === "string")
    : [];
  const answer = await askMulti(session, manager, choices, current);
  if (answer === null) {
    session.state = asBrowsing(editorReducer(editing, { type: "cancel" }));
    return;
  }
  commitAndFlush(session, manager, editing, answer);
}

async function editText(session: Session, manager: SettingsManager, editing: EditingState): Promise<void> {
  process.stdout.write(CLEAR_SCREEN);
  const spec = editing.focused.spec;
  const prompt = new TextPrompt({
    initialUserInput: editing.draft === undefined ? "" : displayValue(editing.draft),
    validate: (value) => {
      const parsed = parseSettingValue(spec, value ?? "");
      return parsed.ok ? undefined : parsed.reason;
    },
    render() {
      return settingsFrame(
        screenOf(session, manager),
        getColumns(process.stdout),
        getRows(process.stdout),
        inputOverlay(spec.key, inputCursor(this.userInput, this.cursor), this.state === "error" ? this.error : undefined),
        INPUT_KEYBAR,
      );
    },
  });
  const answer = await prompt.prompt();
  if (isCancel(answer)) {
    session.state = asBrowsing(editorReducer(editing, { type: "cancel" }));
    return;
  }
  const parsed = parseSettingValue(spec, submittedText(prompt, answer));
  if (!parsed.ok) {
    session.status = `${spec.key}: ${parsed.reason}`;
    session.state = asBrowsing(editorReducer(editing, { type: "cancel" }));
    return;
  }
  commitAndFlush(session, manager, editing, parsed.value);
}

/** Open the focused setting and run the edit interaction its declared kind calls for. */
export async function editFocused(session: Session, manager: SettingsManager): Promise<void> {
  const opened = editorReducer(session.state, { type: "open" });
  if (opened.mode === "browsing") {
    session.status = opened.reason;
    session.state = asBrowsing(opened);
    return;
  }
  const kind = opened.focused.spec.type;
  switch (kind.kind) {
    case "boolean":
      commitAndFlush(session, manager, opened, opened.focused.value !== true);
      return;
    case "choice":
      return editChoice(session, manager, opened, kind.choices);
    case "multi":
      return editMulti(session, manager, opened, kind.choices);
    case "sinks":
      return editSinks(session, manager, opened, kind);
    case "integer":
    case "text":
    case "list":
      return editText(session, manager, opened);
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}
