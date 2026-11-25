import type { Key } from "node:readline";
import { isCancel, Prompt, TextPrompt } from "@clack/core";
import { CLEAR_SCREEN, CTRL_C } from "../../tui/screen.ts";
import { parseSettingValue } from "../parse.ts";
import { displayValue } from "../display.ts";
import {
  BROWSE_KEYBAR,
  inputCursor,
  INPUT_KEYBAR,
  inputOverlay,
  SEARCH_KEYBAR,
  visibleEntryIndices,
} from "../view.ts";
import type { EditingState, SettingKind } from "../../types/settings.ts";
import { editorReducer } from "../editor.ts";
import { askChoice, askMulti, promptFrame, submittedText } from "./ask.ts";
import { editSinks } from "./sinks.ts";
import { editModels } from "./models.ts";
import { editCompaction } from "./compaction.ts";
import { editLineup } from "./lineup.ts";
import { editPrompt } from "./prompt.ts";
import type { HarnessOffers } from "../../setup/composition.ts";
import { asBrowsing, cancelEdit, editTarget, localRefusal, refocusVisible, resetFocused, stepFocus, toggleAgentGrant, type Session } from "./state.ts";
import { commitAndFlush, commitPick } from "./save.ts";

type BrowseOutcome = "open" | "again" | "quit";

const SEARCH_KEY = "/";
const AGENT_KEY = "a";

function isPrintable(char: string | undefined, info: Key): char is string {
  return typeof char === "string" && char.length === 1 && char >= " " && info.ctrl !== true && info.meta !== true;
}

function moveFocus(session: Session, direction: "up" | "down"): void {
  session.state = stepFocus(session.state, session.filter, direction);
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
    moveFocus(session, info.name);
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
function browseKey(session: Session, char: string | undefined, info: Key): void {
  if (info.name === "return") return;
  if (info.name === "escape") {
    if (session.filter === "") session.quit = true;
    else clearFilter(session);
    return;
  }
  if (info.name === "up" || info.name === "down") {
    moveFocus(session, info.name);
    return;
  }
  if (info.ctrl === true && info.name === "d") {
    resetFocused(session);
    return;
  }
  if (char === AGENT_KEY) {
    toggleAgentGrant(session);
    return;
  }
  if (char === SEARCH_KEY) session.searching = true;
}

/** One browsing prompt: navigate, search, reset — until Enter opens or Escape/ctrl+c leaves. */
export async function browseOnce(session: Session): Promise<BrowseOutcome> {
  process.stdout.write(CLEAR_SCREEN);
  const prompt = new Prompt<undefined>({
    render: () => promptFrame(session, undefined, session.searching ? SEARCH_KEYBAR : BROWSE_KEYBAR),
  }, false);
  prompt.on("key", (char, info) => {
    if (info.name !== "return") session.status = undefined;
    if (char === CTRL_C) {
      session.quit = true;
      return;
    }
    if (session.searching) searchKey(session, char, info);
    else browseKey(session, char, info);
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

async function editChoice(session: Session, editing: EditingState, choices: readonly string[]): Promise<void> {
  return commitPick(session, editing, await askChoice(session, choices, typeof editing.draft === "string" ? editing.draft : undefined));
}

async function editMulti(session: Session, editing: EditingState, choices: readonly string[]): Promise<void> {
  const current = Array.isArray(editing.draft)
    ? editing.draft.filter((value): value is string => typeof value === "string")
    : [];
  return commitPick(session, editing, await askMulti(session, choices, current));
}

async function editText(session: Session, editing: EditingState): Promise<void> {
  process.stdout.write(CLEAR_SCREEN);
  const spec = editing.focused.spec;
  const prompt = new TextPrompt({
    initialUserInput: editing.draft === undefined ? "" : displayValue(editing.draft),
    validate: (value) => {
      const parsed = parseSettingValue(spec, value ?? "");
      return parsed.ok ? undefined : parsed.reason;
    },
    render() {
      return promptFrame(session, inputOverlay(spec.key, inputCursor(this.userInput, this.cursor), this.state === "error" ? this.error : undefined), INPUT_KEYBAR);
    },
  });
  const answer = await prompt.prompt();
  if (isCancel(answer)) return cancelEdit(session, editing);
  const parsed = parseSettingValue(spec, submittedText(prompt, answer));
  if (!parsed.ok) return cancelEdit(session, editing, `${spec.key}: ${parsed.reason}`);
  return commitAndFlush(session, editing, parsed.value);
}

/** Open the focused row on the value this editor's file gives it, or say why it does not open. */
function openFocused(session: Session): EditingState | undefined {
  const reduced = editorReducer(session.state, { type: "open" });
  if (reduced.mode === "browsing") {
    session.status = reduced.reason;
    session.state = asBrowsing(reduced);
    return undefined;
  }
  const refusal = localRefusal(session, reduced.focused.spec);
  if (refusal === undefined) return { ...reduced, draft: reduced.focused.spec.read(editTarget(session).current()) };
  cancelEdit(session, reduced, refusal);
  return undefined;
}

/** Run the picker a shaped kind calls for: each one asks for its value its own way. */
function editShaped(session: Session, offers: HarnessOffers, opened: EditingState, kind: Extract<SettingKind, { kind: "sinks" | "models" | "compaction" | "lineup" | "prompt" }>): Promise<void> {
  switch (kind.kind) {
    case "sinks":
      return editSinks(session, opened, kind);
    case "models":
      return editModels(session, offers, opened);
    case "compaction":
      return editCompaction(session, offers, opened);
    case "lineup":
      return editLineup(session, offers, opened);
    case "prompt":
      return editPrompt(session);
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

/** Open the focused setting and run the edit interaction its declared kind calls for. */
export async function editFocused(session: Session, offers: HarnessOffers): Promise<void> {
  const opened = openFocused(session);
  if (opened === undefined) return;
  const kind = opened.focused.spec.type;
  switch (kind.kind) {
    case "boolean":
      return commitAndFlush(session, opened, opened.draft !== true);
    case "choice":
      return editChoice(session, opened, kind.choices);
    case "multi":
      return editMulti(session, opened, kind.choices);
    case "number":
    case "text":
    case "list":
      return editText(session, opened);
    default:
      return editShaped(session, offers, opened, kind);
  }
}
