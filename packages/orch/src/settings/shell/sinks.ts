import { getColumns, getRows, isCancel, Prompt } from "@clack/core";
import type { SettingsManager } from "../../types/services.ts";
import { isRecord } from "../../util.ts";
import type { EditingState, SettingKind } from "../../types/settings.ts";
import { CLEAR_SCREEN } from "../../tui/screen.ts";
import { displayValue } from "../display.ts";
import { multiOverlay, settingsFrame, SINKS_KEYBAR } from "../view.ts";
import { askMulti, askValue } from "./ask.ts";
import { asBrowsing, commitAndFlush, screenOf, type Session } from "./state.ts";
import { editorReducer } from "../editor.ts";

type SinksKind = Extract<SettingKind, { kind: "sinks" }>;

/** Which sinks are on, what each carrying sink holds, which states each fires on, and
 *  where the cursor is. Checked order is the order the sinks are recorded in. A sink
 *  absent from `states` fires on the kind's default states. */
interface SinkPick {
  checked: string[];
  readonly values: Map<string, string>;
  readonly states: Map<string, readonly string[]>;
  cursor: number;
}

function initialPick(kind: SinksKind, draft: unknown): SinkPick {
  const pick: SinkPick = { checked: [], values: new Map(), states: new Map(), cursor: 0 };
  for (const entry of Array.isArray(draft) ? draft : []) {
    if (!isRecord(entry)) continue;
    const id: unknown = entry.id;
    if (typeof id !== "string" || !kind.choices.includes(id)) continue;
    pick.checked.push(id);
    const field = kind.fields[id];
    const carried: unknown = field === undefined ? undefined : entry[field.name];
    if (carried !== undefined) pick.values.set(id, displayValue(carried));
    const on: unknown = entry.on;
    if (Array.isArray(on)) pick.states.set(id, on.filter((state): state is string => typeof state === "string"));
  }
  return pick;
}

function firesOn(kind: SinksKind, pick: SinkPick, id: string): readonly string[] {
  return pick.states.get(id) ?? kind.defaultStates;
}

function carriedValue(pick: SinkPick, id: string): string {
  return (pick.values.get(id) ?? "").trim();
}

function checkSink(pick: SinkPick, id: string): void {
  if (!pick.checked.includes(id)) pick.checked.push(id);
}

function uncheckSink(pick: SinkPick, id: string): void {
  pick.checked = pick.checked.filter((checked) => checked !== id);
}

/** Toggling keeps the value, so turning a sink off and on does not retype its command. */
function toggleSink(pick: SinkPick, id: string): void {
  if (pick.checked.includes(id)) uncheckSink(pick, id);
  else checkSink(pick, id);
}

/** The picked sinks as the entries settings.json holds. */
function pickedSinks(kind: SinksKind, pick: SinkPick): Record<string, unknown>[] {
  return pick.checked.map((id) => {
    const field = kind.fields[id];
    return {
      id,
      ...(field === undefined ? {} : { [field.name]: carriedValue(pick, id) }),
      ...(pick.states.has(id) ? { on: [...firesOn(kind, pick, id)] } : {}),
    };
  });
}

/** What each sink carries and when it fires, shown beside its checkbox. */
function sinkNotes(kind: SinksKind, pick: SinkPick): Record<string, string> {
  const notes: Record<string, string> = {};
  for (const id of kind.choices) {
    const field = kind.fields[id];
    const carried = field === undefined ? "" : carriedValue(pick, id) || `(no ${field.name} yet - press e)`;
    notes[id] = `${carried}${carried === "" ? "" : "  "}on ${firesOn(kind, pick, id).join(",")}`;
  }
  return notes;
}

type PickOutcome =
  | { readonly done: "save" | "cancel" }
  | { readonly done: "edit" | "when"; readonly id: string };

/** One pass of the sink picker: move, toggle, or hand back the sink whose value to edit.
 *  A value edit ends the prompt because a nested prompt cannot share raw-mode input. */
async function pickSinks(session: Session, manager: SettingsManager, kind: SinksKind, pick: SinkPick): Promise<PickOutcome> {
  process.stdout.write(CLEAR_SCREEN);
  let outcome: PickOutcome = { done: "save" };
  const prompt = new Prompt<undefined>({
    render: () => settingsFrame(
      screenOf(session, manager),
      getColumns(process.stdout),
      getRows(process.stdout),
      multiOverlay(kind.choices, pick.cursor, pick.checked, sinkNotes(kind, pick)),
      SINKS_KEYBAR,
    ),
  }, false);
  prompt.on("key", (char, info) => {
    if (info.name === "return") return;
    session.status = undefined;
    if (info.name === "up" || info.name === "down") {
      const step = info.name === "down" ? 1 : -1;
      pick.cursor = Math.max(0, Math.min(kind.choices.length - 1, pick.cursor + step));
      return;
    }
    const id = kind.choices[pick.cursor];
    if (id === undefined) return;
    if (char === " " || info.name === "space") {
      toggleSink(pick, id);
      return;
    }
    const key = typeof char === "string" ? char.toLowerCase() : "";
    if (key === "e" || key === "w") {
      outcome = { done: key === "e" ? "edit" : "when", id };
      prompt.state = "submit";
    }
  });
  const answer = await prompt.prompt();
  return isCancel(answer) ? { done: "cancel" } : outcome;
}

/** Ask for one sink's value and record it, checking the sink. False when the ask was cancelled. */
async function editSinkValue(session: Session, manager: SettingsManager, kind: SinksKind, pick: SinkPick, id: string): Promise<boolean> {
  const field = kind.fields[id];
  if (field === undefined) {
    session.status = `${id} carries no value - space turns it on`;
    return true;
  }
  const label = field.name === id ? id : `${id} ${field.name}`;
  const value = await askValue(session, manager, label, pick.values.get(id) ?? "", field.suggestion);
  if (value === null) return false;
  pick.values.set(id, value);
  checkSink(pick, id);
  return true;
}

/** Choose which states one sink fires on, checking the sink. A sink that fires on nothing
 *  delivers nothing, so an empty answer is refused rather than recorded. */
async function editSinkStates(session: Session, manager: SettingsManager, kind: SinksKind, pick: SinkPick, id: string): Promise<void> {
  const chosen = await askMulti(session, manager, kind.states, firesOn(kind, pick, id));
  if (chosen === null) return;
  if (chosen.length === 0) {
    session.status = `${id} must fire on at least one state`;
    return;
  }
  pick.states.set(id, chosen);
  checkSink(pick, id);
}

/** Ask for every checked sink still missing its value. One left unanswered is unchecked:
 *  a sink with nothing to deliver through is not a sink. False when any was skipped. */
async function fillCheckedSinks(session: Session, manager: SettingsManager, kind: SinksKind, pick: SinkPick): Promise<boolean> {
  const missing = pick.checked.filter((id) => kind.fields[id] !== undefined && carriedValue(pick, id) === "");
  let complete = true;
  for (const id of missing) {
    if (await editSinkValue(session, manager, kind, pick, id)) continue;
    uncheckSink(pick, id);
    session.status = `${id} left off - it needs a ${kind.fields[id]?.name ?? "value"}`;
    complete = false;
  }
  return complete;
}

/** Check the sinks to deliver through, set what each one carries, and choose when each
 *  fires. `e` edits the focused sink's value, `w` its states; nothing is written until enter. */
export async function editSinks(session: Session, manager: SettingsManager, editing: EditingState, kind: SinksKind): Promise<void> {
  const pick = initialPick(kind, editing.draft);
  for (;;) {
    const outcome = await pickSinks(session, manager, kind, pick);
    if (outcome.done === "cancel") {
      session.state = asBrowsing(editorReducer(editing, { type: "cancel" }));
      return;
    }
    if (outcome.done === "edit") {
      await editSinkValue(session, manager, kind, pick, outcome.id);
      continue;
    }
    if (outcome.done === "when") {
      await editSinkStates(session, manager, kind, pick, outcome.id);
      continue;
    }
    if (!await fillCheckedSinks(session, manager, kind, pick)) continue;
    commitAndFlush(session, manager, editing, pickedSinks(kind, pick));
    return;
  }
}
