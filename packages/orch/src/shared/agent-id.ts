import { randomBytes } from "node:crypto";
import type { AgentId } from "../types/agent-place.ts";
/**
 * Agent identity: one minted id, and nothing else.
 *
 * Identity is a minted id and NOTHING else, immutable. Never encode environment
 * into identity. No `<backend>~<workspace>~<handle>` key.
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
 *
 * A LEAF: this module imports nothing but `node:crypto` and a type. Resolving a target name
 * to an id is a lookup over presence and the agent views, so it lives in
 * `src/control/normalize-target.ts` — doing it here made the id vocabulary import
 * `presence/store.ts`, which imports this module straight back.
 */

/** Characters in a minted id; excludes every separator and escape trigger. */
const ID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

const ID_LENGTH = 10;

/** The shape a minted id always has. A key that does not match this is not an
 *  identity, whatever produced it. */
const ID_PATTERN = new RegExp(`^[${ID_ALPHABET}]{${ID_LENGTH}}$`);

/** Mint one opaque agent id. Unique per spawn, stable for the agent's life. The only
 *  place an `AgentId` is made rather than read back. */
export function mintAgentId(): AgentId {
  const bytes = randomBytes(ID_LENGTH);
  let id = "";
  for (const byte of bytes) id += ID_ALPHABET[byte % ID_ALPHABET.length];
  if (!isAgentId(id)) throw new Error(`minted a malformed agent id: ${id}`);
  return id;
}

/** True when `value` has the shape of a minted id: the guard for an id off the wire, an
 *  environment variable or a directory name, where nothing else vouches for it. */
export function isAgentId(value: unknown): value is AgentId {
  return typeof value === "string" && ID_PATTERN.test(value);
}

/** True when `value` is the id of an agent row the store just read back. The row is the
 *  proof: the store keys every agent by the id it was registered under, whatever shape a
 *  fixture gave it, so this checks only that the text is an id at all. */
function isStoredAgentId(value: unknown): value is AgentId {
  return typeof value === "string" && value.length > 0 && value.trim() === value;
}

/** An agent id read back from the store row that holds it. */
export function agentIdFromRow(value: string): AgentId {
  if (!isStoredAgentId(value)) throw new Error(`not an agent id: ${JSON.stringify(value)}`);
  return value;
}

