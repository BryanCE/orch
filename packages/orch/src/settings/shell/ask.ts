import { getColumns, getRows, isCancel, MultiSelectPrompt, TextPrompt } from "@clack/core";
import type { SettingsManager } from "../../types/services.ts";
import { CLEAR_SCREEN } from "../../tui/screen.ts";
import { inputCursor, INPUT_KEYBAR, inputOverlay, MULTI_KEYBAR, multiOverlay, settingsFrame } from "../view.ts";
import type { Session } from "./state.ts";
import { screenOf } from "./state.ts";

/** Check any number of choices off a list. Null on cancel. */
export async function askMulti(
  session: Session,
  manager: SettingsManager,
  choices: readonly string[],
  initial: readonly string[],
): Promise<string[] | null> {
  process.stdout.write(CLEAR_SCREEN);
  const prompt = new MultiSelectPrompt<{ value: string }>({
    options: choices.map((value) => ({ value })),
    initialValues: [...initial],
    required: false,
    render() {
      const selected = Array.isArray(this.value)
        ? this.value.filter((value): value is string => typeof value === "string")
        : [];
      return settingsFrame(
        screenOf(session, manager),
        getColumns(process.stdout),
        getRows(process.stdout),
        multiOverlay(choices, this.cursor, selected),
        MULTI_KEYBAR,
      );
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
): Promise<string | null> {
  process.stdout.write(CLEAR_SCREEN);
  const prompt = new TextPrompt({
    initialUserInput: initial,
    validate: (value) => (value ?? "").trim() ? undefined : `${label} needs a value`,
    render() {
      return settingsFrame(
        screenOf(session, manager),
        getColumns(process.stdout),
        getRows(process.stdout),
        inputOverlay(label, inputCursor(this.userInput, this.cursor), this.state === "error" ? this.error : undefined, example),
        INPUT_KEYBAR,
      );
    },
  });
  const answer = await prompt.prompt();
  if (isCancel(answer)) return null;
  return submittedText(prompt, answer);
}

export { submittedText };
