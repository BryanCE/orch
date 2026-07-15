import { select, multiselect, spinner, isCancel, cancel } from "@clack/prompts";

/** Unwrap a clack prompt result, or emit a cancel line and return null when the user aborts. */
function guardCancel<T>(value: T | symbol): T | null {
  if (isCancel(value)) {
    cancel("Cancelled.");
    return null;
  }
  return value as T;
}

/** Run a clack single-select over id options; return the chosen id, or null when the user cancels. */
export async function promptSelect(
  message: string,
  options: readonly string[],
  initial?: string,
): Promise<string | null> {
  return guardCancel(await select({
    message,
    options: options.map((id) => ({ value: id, label: id })),
    ...(initial !== undefined ? { initialValue: initial } : {}),
  }));
}

/** Run a clack multi-select; options default to pre-checked unless `checked: false`.
 *  Return the selected values, or null on cancel. Empty options → []. */
export async function promptMultiselect(
  message: string,
  options: readonly { value: string; label: string; hint: string; checked?: boolean }[],
): Promise<string[] | null> {
  if (options.length === 0) return [];
  return guardCancel(await multiselect({
    message,
    options: options.map(({ value, label, hint }) => ({ value, label, hint })),
    required: false,
    initialValues: options.filter(({ checked }) => checked !== false).map(({ value }) => value),
  }));
}

/** Wrap a synchronous side-effecting thunk in a clack spinner, marking the stop line failed if it throws. */
export async function withSpinner<T>(startMsg: string, stopMsg: string, fn: () => T): Promise<T> {
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
