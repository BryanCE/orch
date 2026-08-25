import { randomBytes } from "node:crypto";
import { loadPresence, spawnedRecords } from "../presence/store.ts";

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
  /**
   * Backend id that owns the agent. Deliberately `string`, not `BackendId`:
   * keys are parsed from disk, and a key naming a backend this build no longer
   * registers must reach `getBackend` and fail there by name — parsing cannot
   * be the thing that refuses to read a row that still needs closing.
   */
  readonly backend: string;
  /** Workspace reported by the backend; always a string, never null. */
  readonly workspace: string;
  /**
   * Opaque agent id minted BEFORE launch and passed via ORCH_AGENT_KEY.
   *
   * Carries no meaning and is never derived from anything the user can change.
   * It is NOT the agent's name: a name is a mutable label stored beside the
   * agent, and deriving identity from it made the two inseparable — a name
   * could not be reused after its agent died, could not be reassigned, and
   * renaming would have severed every presence/ack join.
   *
   * Equally never the backend pane id or OS pid: those exist only after spawn,
   * so minting a key from one forks the agent into two identities.
   */
  readonly id: string;
}

/** Characters in a minted id; excludes every separator and escape trigger. */
const ID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

const ID_LENGTH = 10;

/** Mint one opaque agent id. Unique per spawn, stable for the agent's life. */
export function mintAgentId(): string {
  const bytes = randomBytes(ID_LENGTH);
  let id = "";
  for (const byte of bytes) id += ID_ALPHABET[byte % ID_ALPHABET.length];
  return id;
}

/** Separator between the three key segments; escaped inside each segment. */
const SEP = "~";

/**
 * Percent-escapes applied within each segment. `%` MUST come first so the
 * escape marker introduced by later rules is never itself re-escaped.
 */
const ESCAPES: readonly (readonly [string, string])[] = [
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
  if (typeof id.id !== "string" || id.id.length === 0) {
    throw new Error(`identity id must be a non-empty string: ${JSON.stringify(id.id)}`);
  }
}

/**
 * Serialize an identity to a single filesystem-safe key segment
 * `<backend>~<workspace>~<handle>`. Never produces a nested path.
 */
export function serializeIdentity(id: Identity): string {
  assertIdentity(id);
  return [id.backend, id.workspace, id.id].map(escapeSegment).join(SEP);
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
  const [backend, workspace, agentId] = segments.map(unescapeSegment) as [string, string, string];
  const identity: Identity = { backend, workspace, id: agentId };
  assertIdentity(identity);
  return identity;
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

/**
 * Resolve any spelling of a target to the one canonical identity key.
 *
 * An agent is addressable three ways — its key, its mutable name, or its
 * backend pane id — and all three must land on the same key so an orchestrator
 * can always reach anything orch spawned. Only the key is an identity; the
 * other two are lookups through the registry, which is why a name can be
 * reassigned without any address breaking.
 *
 * A dead agent still resolves (close and cleanup need it), but a live one wins:
 * reusing a name whose previous holder exited must never be ambiguous.
 */
export function normalizeControlTarget(target: string): string {
  if (typeof target !== "string" || target.trim().length === 0) {
    throw new Error(`control target must be a non-empty string: ${JSON.stringify(target)}`);
  }

  const presence = loadPresence();
  if (presence.has(target)) return target;

  const matches = [...spawnedRecords().values()].filter((record) =>
    record.pane === target || record.name === target || record.handle === target
    || tryParseIdentity(record.pane)?.id === target);

  const live = matches.filter((record) => presence.get(record.pane)?.alive);
  const resolved = live.length > 0 ? live : matches;
  const keys = new Set(resolved.map((record) => record.pane));

  if (keys.size === 1) return [...keys][0]!;
  if (keys.size > 1) throw new Error(`control target ${target} is ambiguous: ${[...keys].join(", ")}`);

  // Not in the registry: an agent whose bridge stamped presence before its row
  // landed is still reachable through the pane id it reported.
  const stamped = [...presence].filter(([, entry]) => entry.status?.paneId === target).map(([key]) => key);
  if (stamped.length === 1) return stamped[0]!;
  if (stamped.length > 1) throw new Error(`control target ${target} is ambiguous: ${stamped.join(", ")}`);
  throw new Error(`control target ${target} does not resolve to a presence identity`);
}
