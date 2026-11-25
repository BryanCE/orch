import { oneLine } from "../../notify/format.ts";
import { addPromptEntry, APPEND_SYSTEM_KEY, namePromptFile, promptEntries, promptEntry, promptPath, removePromptEntry } from "../append-system.ts";
import { askChoice, askValue } from "./ask.ts";
import { applyWrite, editTarget, reloadRows, type Session } from "./state.ts";

const ADD = "add an entry";
const NAME_FILE = "use another file";
const REMOVE = "remove ";

/** The menu over this level's file: add, name another file, or remove one of the listed entries. */
function promptMenu(session: Session): { choices: string[]; notes: Record<string, string> } {
  const { file, entries } = promptEntries(editTarget(session));
  const removals = entries.map((entry, index): [string, string] => [`${REMOVE}${index + 1}`, oneLine(entry)]);
  const count = `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`;
  return {
    choices: [ADD, NAME_FILE, ...removals.map(([choice]) => choice)],
    notes: Object.fromEntries([[ADD, `to ${file.path}`], [NAME_FILE, `${count} in ${file.path} now`], ...removals]),
  };
}

/** Run the picked action. A cancelled input writes nothing. */
async function runPick(session: Session, picked: string): Promise<void> {
  const target = editTarget(session);
  if (picked === ADD) {
    const entry = promptEntry(await askValue(session, "entry text", "", "Never pass --model.") ?? "");
    if (entry !== null) applyWrite(session, APPEND_SYSTEM_KEY, () => addPromptEntry(target, entry), `entry added to ${promptEntries(target).file.path}`);
    return;
  }
  if (picked === NAME_FILE) {
    const typed = await askValue(session, "file path (made if missing)", "", "~/notes/agent-rules.md");
    if (typed === null) return;
    const file = promptPath(process.cwd(), typed);
    applyWrite(session, APPEND_SYSTEM_KEY, () => namePromptFile(target, file), `${APPEND_SYSTEM_KEY} reads ${file}`);
    return;
  }
  const position = Number(picked.slice(REMOVE.length));
  applyWrite(session, APPEND_SYSTEM_KEY, () => removePromptEntry(target, position), `entry ${position} removed`);
}

/** Add and remove prompt entries, or name another file, until Escape leaves the menu. Each
 *  action writes at once, so leaving re-reads the rows instead of restoring the opened ones. */
export async function editPrompt(session: Session): Promise<void> {
  for (;;) {
    const { choices, notes } = promptMenu(session);
    const picked = await askChoice(session, choices, undefined, notes);
    if (picked === null) return reloadRows(session, APPEND_SYSTEM_KEY);
    await runPick(session, picked);
  }
}
