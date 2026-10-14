import { getColumns, getRows, isCancel, MultiSelectPrompt, SelectPrompt, TextPrompt } from "@clack/core";
import type { SettingsManager } from "../../types/services.ts";
import { CLEAR_SCREEN } from "../../tui/screen.ts";
import { inputCursor, INPUT_KEYBAR, inputOverlay, MULTI_KEYBAR, multiOverlay, SELECT_KEYBAR, selectOverlay, settingsFrame } from "../view.ts";
import type { Session } from "./state.ts";
import { screenOf } from "./state.ts";

/** The settings screen at the terminal's size, with a prompt's overlay and key bar on it. */
export function promptFrame(session: Session, manager: SettingsManager, overlay: readonly string[] | undefined, keybar: string): string {
  return settingsFrame(screenOf(session, manager), getColumns(process.stdout), getRows(process.stdout), overlay, keybar);
}

/** A cleared screen and the prompt options for a list of choices. */
function choiceOptions(choices: readonly string[]): { value: string }[] {
  process.stdout.write(CLEAR_SCREEN);
  return choices.map((value) => ({ value }));
}

/** Pick one choice off a list; `notes` is what each choice carries now. Null on cancel. */
export async function askChoice(
  session: Session,
  manager: SettingsManager,
  choices: readonly string[],
  initial: string | undefined,
  notes?: Readonly<Record<string, string>>,
): Promise<string | null> {
  const prompt = new SelectPrompt<{ value: string }>({
    options: choiceOptions(choices),
    ...(initial !== undefined && choices.includes(initial) ? { initialValue: initial } : {}),
    render() {
      return promptFrame(session, manager, selectOverlay(choices, this.cursor, notes), SELECT_KEYBAR);
    },
  });
  const answer = await prompt.prompt();
  return isCancel(answer) || typeof answer !== "string" ? null : answer;
}

/** Check any number of choices off a list. Null on cancel. */
export async function askMulti(
  session: Session,
  manager: SettingsManager,
  choices: readonly string[],
  initial: readonly string[],
): Promise<string[] | null> {
  const prompt = new MultiSelectPrompt<{ value: string }>({
    options: choiceOptions(choices),
    initialValues: [...initial],
    required: false,
    render() {
      const selected = Array.isArray(this.value)
        ? this.value.filter((value): value is string => typeof value === "string")
        : [];
      return promptFrame(session, manager, multiOverlay(choices, this.cursor, selected), MULTI_KEYBAR);
    },
  });
  const answer = await prompt.prompt();
  if (isCancel(answer) || !Array.isArray(answer)) return null;
  return answer.filter((value): value is string => typeof value === "string");
}

/** What a text prompt was actually submitted with. @clack seeds `initialUserInput` into the
 *  LINE but not into `value`, so Enter on a prefilled prompt nobody typed into submits
 *  undefined - which is how a pre-filled answer used to vanish on Enter. */
function submittedText(prompt: TextPrompt, answer: unknown): string {
  return typeof answer === "string" && answer.length > 0 ? answer : prompt.userInput;
}

/** Ask for one value a chosen sink carries. Null on cancel. `initial` is only ever what is
 *  already recorded: a seeded line commits a value nobody typed. */
export async function askValue(
  session: Session,
  manager: SettingsManager,
  label: string,
  initial: string,
  example: string | undefined,
  refusal: (value: string) => string | undefined = (value) => value.trim() ? undefined : `${label} needs a value`,
): Promise<string | null> {
  process.stdout.write(CLEAR_SCREEN);
  const prompt = new TextPrompt({
    initialUserInput: initial,
    validate: (value) => refusal(value ?? ""),
    render() {
      return promptFrame(session, manager, inputOverlay(label, inputCursor(this.userInput, this.cursor), this.state === "error" ? this.error : undefined, example), INPUT_KEYBAR);
    },
  });
  const answer = await prompt.prompt();
  if (isCancel(answer)) return null;
  return submittedText(prompt, answer);
}

export { submittedText };
