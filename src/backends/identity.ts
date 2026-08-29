import { randomBytes } from "node:crypto";
import { loadPresence } from "../presence/store.ts";
import { orchDir } from "../presence/writer.ts";
import { agentViews } from "../store/agent-view.ts";

/**
 * Agent identity: one minted id, and nothing else.
 *
 * TASKS/01-agent-model.md — *"Identity = a minted id and NOTHING else,
 * immutable. Never encode environment into identity. No
 * `<backend>~<workspace>~<handle>` key."*
 *
 * This module used to serialize `<plexer>~<plexer-grouping>~<id>` into the
 * presence directory name and the registry primary key. That made an agent's
 * identity a function of where it happened to be sitting, so an agent that
 * MOVED between plexers or spaces could not keep its identity — which is why
 * moving was never implemented, and why a driving session with no plexer and no
 * space was stamped `headless~local~…`, inventing a place called "local" that
 * the web then rendered as a real one.
 *
 * The plexer and the space are environment. They live in `agent_plexers` and
 * `agent_spaces`, on their own timelines, and are read through
 * `src/store/agent-view.ts`. Nothing reads them out of a key, because a key no
 * longer has anywhere to put them.
 */

/** Characters in a minted id; excludes every separator and escape trigger. */
const ID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

const ID_LENGTH = 10;

/** The shape a minted id always has. A key that does not match this is not an
 *  identity, whatever produced it. */
const ID_PATTERN = new RegExp(`^[${ID_ALPHABET}]{${ID_LENGTH}}$`);

/** Mint one opaque agent id. Unique per spawn, stable for the agent's life. */
export function mintAgentId(): string {
  const bytes = randomBytes(ID_LENGTH);
  let id = "";
  for (const byte of bytes) id += ID_ALPHABET[byte % ID_ALPHABET.length];
  return id;
}

/** True when `value` has the shape of a minted id. */
export function isAgentId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

/**
 * The key for an identity — which is the id itself.
 *
 * Kept as a named function rather than inlined so that "what goes in a presence
 * directory name" has exactly one answer in the codebase, and so the day
 * something wants to change it, there is one place to change.
 */
export function serializeIdentity(id: Identity): string {
  if (!isAgentId(id.id)) {
    throw new Error(`identity id must be ${ID_LENGTH} lowercase alphanumerics: ${JSON.stringify(id.id)}`);
  }
  return id.id;
}

/** Parse a key back into an identity. Throws when the key is not a minted id. */
export function parseIdentity(key: string): Identity {
  if (!isAgentId(key)) {
    throw new Error(`malformed identity key: expected ${ID_LENGTH} lowercase alphanumerics, got ${JSON.stringify(key)}`);
  }
  return { id: key };
}

/** Parse a key without throwing; returns null when the key is malformed. */
export function tryParseIdentity(key: string | null | undefined): Identity | null {
  if (key === null || key === undefined) return null;
  return isAgentId(key) ? { id: key } : null;
}

/**
 * Resolve any spelling of a target to the one canonical identity key.
 *
 * An agent is addressable three ways — its id, its mutable name, or its
 * environment's handle for the pane it happens to occupy. Only the first is
 * identity; the other two are looked up through the composer, never parsed out
 * of the key, because both of them move.
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

  const matches = agentViews(orchDir()).filter((view) =>
    view.id === target || view.name === target || view.environment.handle === target);

  const live = matches.filter((view) => presence.get(view.id)?.alive);
  const resolved = live.length > 0 ? live : matches;
  const keys = new Set(resolved.map((view) => view.id));

  if (keys.size === 1) return [...keys][0]!;
  if (keys.size > 1) throw new Error(`control target ${target} is ambiguous: ${[...keys].join(", ")}`);

  // Not in the registry: an agent whose bridge stamped presence before its row
  // landed is still reachable through the pane id it reported.
  const stamped = [...presence].filter(([, entry]) => entry.status?.paneId === target).map(([key]) => key);
  if (stamped.length === 1) return stamped[0]!;
  if (stamped.length > 1) throw new Error(`control target ${target} is ambiguous: ${stamped.join(", ")}`);
  throw new Error(`control target ${target} does not resolve to a presence identity`);
}
