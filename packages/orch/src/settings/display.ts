/**
 * How one settings value is shown to a person.
 *
 * A leaf on purpose: the editor draws values, `orch settings` prints them, and doctor
 * quotes them back in a defect line. All three are showing the same value to the same
 * person, so it is spelled once, here, rather than a renderer owning the spelling and
 * everything else importing the renderer to get at it.
 */
import { isRecord } from "../util.ts";
import type { SettingKind } from "../types/settings.ts";

/** A settings value as one line: scalars bare, shapes as JSON, nothing as "(none)". */
export function displayValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value) ?? "(none)";
}

/** One picked sink: what it is, what it carries, and the states it fires on. */
function displaySink(entry: unknown, kind: Extract<SettingKind, { kind: "sinks" }>): string {
  if (!isRecord(entry) || typeof entry.id !== "string") return displayValue(entry);
  const field = kind.fields[entry.id];
  const carried = field === undefined ? undefined : entry[field.name];
  const states = Array.isArray(entry.on) ? entry.on : kind.defaultStates;
  return `${entry.id}${carried === undefined ? "" : `=${displayValue(carried)}`} on ${states.join(",")}`;
}

/** A settings value as its declared kind shows it. Sinks read as sinks; everything else
 *  is the same one line `displayValue` gives it. */
export function displaySetting(value: unknown, kind: SettingKind): string {
  if (kind.kind !== "sinks" || !Array.isArray(value)) return displayValue(value);
  return value.length === 0 ? "(none)" : value.map((entry) => displaySink(entry, kind)).join("; ");
}
