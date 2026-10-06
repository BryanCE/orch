/** The one duration grammar `--since` and `--timeout` share. A bare number is milliseconds. */

import { UsageError } from "./spec.ts";

export const DURATION_FORMS = "milliseconds, a date/time, or an age like 30s, 10m, 2h, 1d";

type AgeUnit = "s" | "m" | "h" | "d";
const AGE_UNIT_MS: Record<AgeUnit, number> = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };

type Duration = { readonly count: number } | { readonly age: number } | { readonly date: number };

function isAgeUnit(text: string): text is AgeUnit {
  return text === "s" || text === "m" || text === "h" || text === "d";
}

/** The milliseconds an age like `10m` spans; null when the text is no age. */
function ageMs(text: string): number | null {
  const age = /^(?<count>\d+)(?<unit>[smhd])$/.exec(text)?.groups;
  if (age?.count === undefined || age.unit === undefined || !isAgeUnit(age.unit)) return null;
  return Number(age.count) * AGE_UNIT_MS[age.unit];
}

function readDuration(text: string): Duration {
  const count = Number(text);
  if (text.trim().length > 0 && Number.isFinite(count)) return { count };
  const age = ageMs(text);
  if (age !== null) return { age };
  const date = Date.parse(text);
  if (Number.isFinite(date)) return { date };
  throw new UsageError(`invalid duration "${text}": expected ${DURATION_FORMS}`);
}

/** The instant a `--since` names: epoch milliseconds as typed, an age counted back from now, or a date/time. */
export function durationInstant(text: string, now: number): number {
  const duration = readDuration(text);
  if ("count" in duration) return duration.count;
  if ("age" in duration) return now - duration.age;
  return duration.date;
}

/** The span a `--timeout` names: milliseconds as typed, an age, or the time left until a date/time. */
export function durationSpan(text: string, now: number): number {
  const duration = readDuration(text);
  if ("count" in duration) return duration.count;
  if ("age" in duration) return duration.age;
  return duration.date - now;
}
