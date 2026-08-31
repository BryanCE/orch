/**
 * How one settings value is shown to a person.
 *
 * A leaf on purpose: the editor draws values, `orch settings` prints them, and doctor
 * quotes them back in a defect line. All three are showing the same value to the same
 * person, so it is spelled once, here, rather than a renderer owning the spelling and
 * everything else importing the renderer to get at it.
 */

/** A settings value as one line: scalars bare, shapes as JSON, nothing as "(none)". */
export function displayValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value) ?? "(none)";
}
