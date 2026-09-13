// Value guards for JSON-shaped data, and nothing else. A LEAF on purpose: the web
// package's browser chunks need these, and importing them from `util.ts` pulled
// node:fs/crypto/path/url into the client bundle, where the module cannot load at
// all — hydration died and the page froze on its server-rendered markup.

import type { JsonRecord } from "./types/core.ts";

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
