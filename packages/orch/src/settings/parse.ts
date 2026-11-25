import type { SettingKind, SettingSpec } from "../types/settings.ts";

export interface ParsedSettingValue { readonly ok: true; readonly value: unknown }
export interface RejectedSettingValue { readonly ok: false; readonly reason: string }
export type SettingValueResult = ParsedSettingValue | RejectedSettingValue;

function parseBooleanSetting(input: string): SettingValueResult {
  if (input === "true") return { ok: true, value: true };
  if (input === "false") return { ok: true, value: false };
  return { ok: false, reason: "expected true or false" };
}

type NumberKind = Extract<SettingKind, { readonly kind: "number" }>;

/** What a number setting takes, as words: "an integer" or "a number". */
export function numberNoun(kind: NumberKind): string {
  return kind.whole ? "an integer" : "a number";
}

export function parseNumberSetting(kind: NumberKind, input: string): SettingValueResult {
  const noun = numberNoun(kind);
  if (kind.none && input === "none") return { ok: true, value: null };
  const pattern = kind.whole ? /^-?\d+$/ : /^-?\d+(\.\d+)?$/;
  if (!pattern.test(input)) return { ok: false, reason: kind.none ? `expected ${noun} or none` : `expected ${noun}` };
  const value = Number(input);
  if (kind.whole && !Number.isSafeInteger(value)) return { ok: false, reason: "expected a safe integer" };
  if (kind.min !== undefined && value < kind.min) return { ok: false, reason: `expected ${noun} >= ${kind.min}` };
  if (kind.max !== undefined && value > kind.max) return { ok: false, reason: `expected ${noun} <= ${kind.max}` };
  return { ok: true, value };
}

function parseChoiceSetting(kind: Extract<SettingKind, { readonly kind: "choice" }>, input: string): SettingValueResult {
  return kind.choices.includes(input) ? { ok: true, value: input } : { ok: false, reason: `expected one of: ${kind.choices.join(", ")}` };
}

function parseTextSetting(input: string): SettingValueResult {
  return input.length > 0 ? { ok: true, value: input } : { ok: false, reason: "expected non-empty text" };
}

function parseMultiSetting(kind: Extract<SettingKind, { readonly kind: "multi" }>, input: string): SettingValueResult {
  const values = input.split(",").map((value) => value.trim()).filter(Boolean);
  const invalid = values.filter((value) => !kind.choices.includes(value));
  if (!values.length || invalid.length) return { ok: false, reason: `expected comma-separated values from: ${kind.choices.join(", ")}` };
  return { ok: true, value: values };
}

function parseSinksSetting(kind: Extract<SettingKind, { readonly kind: "sinks" }>, input: string): SettingValueResult {
  // A sink carries a command line and a state list, so it is typed as JSON here and
  // picked off a screen everywhere else.
  const expected = `expected a JSON array of sinks, each {"id": one of ${kind.choices.join(", ")}}`;
  let value: unknown;
  try { value = JSON.parse(input); } catch { return { ok: false, reason: expected }; }
  if (!Array.isArray(value)) return { ok: false, reason: expected };
  return { ok: true, value };
}

function parseListSetting(input: string): SettingValueResult {
  let value: unknown;
  try { value = JSON.parse(input); } catch { return { ok: false, reason: "expected a JSON array or object" }; }
  if (value === null || typeof value !== "object") return { ok: false, reason: "expected a JSON array or object" };
  return { ok: true, value };
}

/** Parse one typed-in value against a setting's declared kind. The single parser for
 *  every entry path — `orch settings <key> <value>` and the interactive editor both
 *  read user text through this, so a value one accepts the other cannot refuse. */
export function parseSettingValue(spec: SettingSpec, input: string): SettingValueResult {
  const kind: SettingKind = spec.type;
  switch (kind.kind) {
    case "boolean":
      return parseBooleanSetting(input);
    case "number":
      return parseNumberSetting(kind, input);
    case "choice":
      return parseChoiceSetting(kind, input);
    case "multi":
      return parseMultiSetting(kind, input);
    case "sinks":
      return parseSinksSetting(kind, input);
    case "text":
    case "prompt":
      return parseTextSetting(input);
    case "models":
    case "compaction":
    case "lineup":
    case "list":
      return parseListSetting(input);
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}
