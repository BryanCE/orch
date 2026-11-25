import type { EditingState } from "../../types/settings.ts";
import { editorReducer } from "../editor.ts";
import { cancelEdit, writeCommitted, type Session } from "./state.ts";

/** Validate an edited value through the reducer, then write it to this editor's file. */
export function commitAndFlush(session: Session, editing: EditingState, value: unknown): void {
  const key = editing.focused.spec.key;
  const committed = editorReducer(editing, { type: "commit", value });
  if (committed.mode === "editing") return cancelEdit(session, committed, committed.reason ?? `${key}: invalid value`);
  writeCommitted(session, committed, key);
}

/** Save a picked value, or close the edit when the pick was cancelled. */
export function commitPick(session: Session, editing: EditingState, picked: unknown): void {
  if (picked === null) return cancelEdit(session, editing);
  commitAndFlush(session, editing, picked);
}
