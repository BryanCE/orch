/**
 * Backend-owned agent identity and its filesystem-safe serialized key.
 *
 * The plexer backend is the identity authority: it mints one stable identity
 * per spawned agent and orch serializes it to a single, flat, filesystem-safe
 * presence-directory segment. This module is the ONLY boundary that converts
 * between the structured identity and its string key; no other code parses the
 * key format.
 */

/** Structured identity minted by the selected plexer backend for one agent. */
export interface Identity {
  /** Backend id that owns the handle (e.g. `herdr`, `tmux`, `headless`). */
  readonly backend: string;
  /** Workspace reported by the backend; always a string, never null. */
  readonly workspace: string;
  /** Backend-native handle (e.g. herdr pane `p2`, tmux pane `%5`, headless pid). */
  readonly handle: string;
}

/** Separator between the three key segments; escaped inside each segment. */
const SEP = "~";

/**
 * Percent-escapes applied within each segment. `%` MUST come first so the
 * escape marker introduced by later rules is never itself re-escaped.
 */
const ESCAPES: ReadonlyArray<readonly [string, string]> = [
  ["%", "%25"],
  ["~", "%7E"],
  [":", "%3A"],
  ["/", "%2F"],
];

/** Escape the separator and other path-unsafe characters within one segment. */
function escapeSegment(part: string): string {
  let out = part;
  for (const [char, code] of ESCAPES) out = out.replaceAll(char, code);
  return out;
}

/** Reverse {@link escapeSegment} in a single pass so decoded `%` never re-triggers. */
function unescapeSegment(part: string): string {
  return part.replace(/%(25|7E|3A|2F)/g, (whole, code: string) => {
    switch (code) {
      case "25": return "%";
      case "7E": return "~";
      case "3A": return ":";
      case "2F": return "/";
      default: return whole;
    }
  });
}

/** Reject identities missing the fields required to address an agent. */
function assertIdentity(id: Identity): void {
  if (typeof id.backend !== "string" || id.backend.length === 0) {
    throw new Error(`identity backend must be a non-empty string: ${JSON.stringify(id.backend)}`);
  }
  if (typeof id.workspace !== "string") {
    throw new Error(`identity workspace must be a string: ${JSON.stringify(id.workspace)}`);
  }
  if (typeof id.handle !== "string" || id.handle.length === 0) {
    throw new Error(`identity handle must be a non-empty string: ${JSON.stringify(id.handle)}`);
  }
}

/**
 * Serialize an identity to a single filesystem-safe key segment
 * `<backend>~<workspace>~<handle>`. Never produces a nested path.
 */
export function serializeIdentity(id: Identity): string {
  assertIdentity(id);
  return [id.backend, id.workspace, id.handle].map(escapeSegment).join(SEP);
}

/**
 * Parse a serialized key back into its identity. Throws on any malformed key
 * (wrong segment count or a segment that fails identity validation).
 */
export function parseIdentity(key: string): Identity {
  if (typeof key !== "string" || key.length === 0) {
    throw new Error(`identity key must be a non-empty string: ${JSON.stringify(key)}`);
  }
  const segments = key.split(SEP);
  if (segments.length !== 3) {
    throw new Error(`malformed identity key: expected 3 segments, got ${segments.length}: ${JSON.stringify(key)}`);
  }
  const [backend, workspace, handle] = segments.map(unescapeSegment) as [string, string, string];
  const id: Identity = { backend, workspace, handle };
  assertIdentity(id);
  return id;
}

/** Parse a key without throwing; returns null when the key is malformed. */
export function tryParseIdentity(key: string | null | undefined): Identity | null {
  if (key === null || key === undefined) return null;
  try {
    return parseIdentity(key);
  } catch {
    return null;
  }
}
