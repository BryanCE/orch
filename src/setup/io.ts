import { select, multiselect, text, spinner, isCancel, cancel } from "@clack/prompts";

/** Unwrap a clack prompt result, or emit a cancel line and return null when the user aborts. */
function guardCancel<T>(value: T | symbol): T | null {
  if (isCancel(value)) {
    cancel("Cancelled.");
    return null;
  }
  return value;
}

/** Prompt for one free-text value; return the trimmed answer, or null when the user cancels. */
export async function promptText(message: string, placeholder?: string): Promise<string | null> {
  const answer = guardCancel(await text({
    message,
    ...(placeholder !== undefined ? { placeholder } : {}),
  }));
  return answer === null ? null : answer.trim();
}

// clack's `Option<Value>` is a conditional type, so it stays unresolved against
// an unbound `Id` and rejects the option literal. Both prompts below hand clack
// plain strings and narrow the answer back on the way out — it can only ever be
// one of the ids that went in.

/** Run a clack single-select over id options; return the chosen id, or null when the user cancels. */
export async function promptSelect<Id extends string>(
  message: string,
  options: readonly Id[],
  initial?: Id,
): Promise<Id | null> {
  return guardCancel(await select({
    message,
    options: options.map((id) => ({ value: id as string, label: id })),
    ...(initial !== undefined ? { initialValue: initial as string } : {}),
  })) as Id | null;
}

/** Run a clack multi-select; options default to pre-checked unless `checked: false`.
 *  Return the selected values, or null on cancel. Empty options → []. */
export async function promptMultiselect<Id extends string>(
  message: string,
  options: readonly { value: Id; label: string; hint: string; checked?: boolean }[],
): Promise<Id[] | null> {
  if (options.length === 0) return [];
  return guardCancel(await multiselect({
    message,
    options: options.map(({ value, label, hint }) => ({ value: value as string, label, hint })),
    required: false,
    initialValues: options.filter(({ checked }) => checked !== false).map(({ value }) => value as string),
  })) as Id[] | null;
}

/** Wrap a synchronous side-effecting thunk in a clack spinner, marking the stop line failed if it throws. */
export function withSpinner<T>(startMsg: string, stopMsg: string, fn: () => T): T {
  const s = spinner();
  s.start(startMsg);
  try {
    const result = fn();
    s.stop(stopMsg);
    return result;
  } catch (error) {
    s.stop(`${stopMsg} (failed)`);
    throw error;
  }
}
