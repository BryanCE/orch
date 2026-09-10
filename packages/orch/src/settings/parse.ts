import type { SettingKind, SettingSpec } from "../types/settings.ts";

export interface ParsedSettingValue { readonly ok: true; readonly value: unknown }
export interface RejectedSettingValue { readonly ok: false; readonly reason: string }
export type SettingValueResult = ParsedSettingValue | RejectedSettingValue;

/** Parse one typed-in value against a setting's declared kind. The single parser for
 *  every entry path — `orch settings <key> <value>` and the interactive editor both
 *  read user text through this, so a value one accepts the other cannot refuse. */
export function parseSettingValue(spec: SettingSpec, input: string): SettingValueResult {
  const kind: SettingKind = spec.type;
  switch (kind.kind) {
    case "boolean":
      if (input === "true") return { ok: true, value: true };
      if (input === "false") return { ok: true, value: false };
      return { ok: false, reason: "expected true or false" };
    case "integer": {
      if (!/^-?\d+$/.test(input)) return { ok: false, reason: "expected an integer" };
      const value = Number(input);
      if (!Number.isSafeInteger(value)) return { ok: false, reason: "expected a safe integer" };
      if (kind.min !== undefined && value < kind.min) return { ok: false, reason: `expected an integer >= ${kind.min}` };
      if (kind.max !== undefined && value > kind.max) return { ok: false, reason: `expected an integer <= ${kind.max}` };
      return { ok: true, value };
    }
    case "choice":
      return kind.choices.includes(input)
        ? { ok: true, value: input }
        : { ok: false, reason: `expected one of: ${kind.choices.join(", ")}` };
    case "multi": {
      const values = input.split(",").map((value) => value.trim()).filter(Boolean);
      const invalid = values.filter((value) => !kind.choices.includes(value));
      if (!values.length || invalid.length) return { ok: false, reason: `expected comma-separated values from: ${kind.choices.join(", ")}` };
      return { ok: true, value: values };
    }
    case "sinks": {
      // A sink carries a command line and a state list, so it is typed as JSON here and
      // picked off a screen everywhere else.
      const expected = `expected a JSON array of sinks, each {"id": one of ${kind.choices.join(", ")}}`;
      let value: unknown;
      try { value = JSON.parse(input); } catch { return { ok: false, reason: expected }; }
      if (!Array.isArray(value)) return { ok: false, reason: expected };
      return { ok: true, value };
    }
    case "text":
      return input.length > 0 ? { ok: true, value: input } : { ok: false, reason: "expected non-empty text" };
    case "list": {
      let value: unknown;
      try { value = JSON.parse(input); } catch { return { ok: false, reason: "expected a JSON array or object" }; }
      if (value === null || typeof value !== "object") return { ok: false, reason: "expected a JSON array or object" };
      return { ok: true, value };
    }
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}
