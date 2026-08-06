import { autocomplete, autocompleteMultiselect, select, multiselect, text, spinner, log, isCancel, cancel } from "@clack/prompts";

/** Unwrap a clack prompt result, or emit a cancel line and return null when the user aborts. */
function guardCancel<T>(value: T | symbol): T | null {
  if (isCancel(value)) {
    cancel("Cancelled.");
    return null;
  }
  return value;
}

/** Emit one progress line inside the wizard's guide rail; a raw stdout write breaks the rail. */
export function logStep(message: string): void {
  log.info(message);
}

/** Emit one warning line inside the wizard's guide rail. */
export function logWarning(message: string): void {
  log.warn(message);
}

/** Prompt for one free-text value; return the trimmed answer, or null when the user cancels.
 *  `suggested` both hints and answers: pressing enter on an empty field accepts it, so a
 *  wizard step with a known-good value never records the empty string. */
export async function promptText(message: string, suggested?: string): Promise<string | null> {
  const answer = guardCancel(await text({
    message,
    ...(suggested !== undefined ? { placeholder: suggested, defaultValue: suggested } : {}),
  }));
  return answer === null ? null : answer.trim();
}

// clack's `Option<Value>` is a conditional type, so an unbound `Id` leaves it
// deferred and nothing is assignable to it. Both prompts below bind Value to
// `string` — which resolves the conditional — and narrow the answer back on the
// way out: it can only ever be one of the ids that went in.

/** Run a clack single-select over id options; return the chosen id, or null when the user cancels. */
export async function promptSelect<Id extends string>(
  message: string,
  options: readonly Id[],
  initial?: Id,
): Promise<Id | null> {
  return guardCancel(await select<string>({
    message,
    options: options.map((id) => ({ value: id, label: id })),
    ...(initial !== undefined ? { initialValue: initial } : {}),
  })) as Id | null;
}

/** Run a bounded, searchable single-select over model options. */
export async function promptAutocomplete<Id extends string>(
  message: string,
  options: readonly { value: Id; label: string; hint?: string }[],
  initial: Id | undefined,
  maxItems: number,
): Promise<Id | null> {
  return guardCancel(await autocomplete<string>({
    message,
    options: options.map(({ value, label, hint }) => ({ value, label, hint })),
    ...(initial !== undefined ? { initialValue: initial } : {}),
    placeholder: "Type to search; clear the query to browse all",
    maxItems,
  })) as Id | null;
}


/** Run a clack multi-select; options default to pre-checked unless `checked: false`.
 *  Return the selected values, or null on cancel. Empty options → []. */
export async function promptMultiselect<Id extends string>(
  message: string,
  options: readonly { value: Id; label: string; hint: string; checked?: boolean }[],
): Promise<Id[] | null> {
  if (options.length === 0) return [];
  return guardCancel(await multiselect<string>({
    message,
    options: options.map(({ value, label, hint }) => ({ value, label, hint })),
    required: false,
    initialValues: options.filter(({ checked }) => checked !== false).map(({ value }) => value),
  })) as Id[] | null;
}

/** Run a bounded, searchable multi-select over model options. */
export async function promptAutocompleteMultiselect<Id extends string>(
  message: string,
  options: readonly { value: Id; label: string; hint?: string; checked?: boolean }[],
  maxItems: number,
): Promise<Id[] | null> {
  return guardCancel(await autocompleteMultiselect<string>({
    message,
    options: options.map(({ value, label, hint }) => ({ value, label, hint })),
    required: false,
    initialValues: options.filter(({ checked }) => checked !== false).map(({ value }) => value),
    placeholder: "Type to search; clear the query to browse all",
    maxItems,
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
